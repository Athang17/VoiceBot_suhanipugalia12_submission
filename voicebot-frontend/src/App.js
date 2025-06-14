import React, { useState, useRef, useEffect } from 'react';

function VoiceApp() {
  // State management
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' or 'text'
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const chatEndRef = useRef(null);
  const [waveform, setWaveform] = useState([]);

  // Apply dark mode to entire app
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate waveform visualization during recording
  useEffect(() => {
    if (recording) {
      const interval = setInterval(() => {
        setWaveform(prev => [...prev.slice(-10), Math.random() * 0.5 + 0.5]);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setWaveform([]);
    }
  }, [recording]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const addThinkingMessage = () => {
    const thinkingPhrases = [
      "Hmm, let me think...",
      "Checking on that...",
      "One moment please...",
      "Let me find that information..."
    ];
    const phrase = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)];
    
    setMessages(prev => [...prev, {
      sender: 'bot',
      text: phrase,
      id: Date.now() + '-thinking',
      isThinking: true
    }]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/mp3" });
        await sendAudioToBackend(blob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      addErrorMessage("Microphone access error: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const addErrorMessage = (message) => {
    setMessages(prev => [...prev, {
      sender: 'system',
      text: message,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-error'
    }]);
  };

  const sendTextToBackend = async () => {
    if (!textInput.trim()) return;
    
    setLoading(true);
    addThinkingMessage();
    
    const userMessage = {
      sender: 'user',
      text: textInput,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    
    try {
      const res = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textInput,
          context: conversationContext.slice(-3)
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Remove thinking message
      setMessages(prev => prev.filter(msg => !msg.isThinking));

      // Add bot response
      const botMessage = {
        sender: 'bot',
        text: data.response,
        audioUrl: data.audio_url,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-bot',
        suggestions: data.suggestions || []
      };
      
      setMessages(prev => [...prev, botMessage]);

      // Update conversation context
      setConversationContext(prev => [...prev, {
        user: textInput,
        bot: data.response
      }]);
    } catch (err) {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      addErrorMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    setLoading(true);
    addThinkingMessage();
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.mp3");
      
      // Add conversation context to help with memory
      if (conversationContext.length > 0) {
        formData.append("context", JSON.stringify(conversationContext.slice(-3)));
      }

      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Remove thinking message
      setMessages(prev => prev.filter(msg => !msg.isThinking));

      // Add user message
      const userMessage = {
        sender: 'user',
        text: data.transcript,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-user'
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Add bot response
      const botMessage = {
        sender: 'bot',
        text: data.response,
        audioUrl: data.audio_url,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-bot',
        suggestions: data.suggestions || []
      };
      
      setMessages(prev => [...prev, botMessage]);

      // Update conversation context
      setConversationContext(prev => [...prev, {
        user: data.transcript,
        bot: data.response
      }]);
    } catch (err) {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      addErrorMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAudio = (url) => {
    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(`http://localhost:5000${url}`);
      setPlayingUrl(url);
      audioRef.current.play()
        .catch(err => {
          console.error("Audio playback error:", err);
          addErrorMessage("Audio playback failed. Please try again.");
          setPlayingUrl(null);
        });
      audioRef.current.onended = () => setPlayingUrl(null);
      audioRef.current.onerror = () => {
        addErrorMessage("Audio playback error");
        setPlayingUrl(null);
      };
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setMessages(prev => [...prev, {
      sender: 'user',
      text: suggestion,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-suggestion'
    }]);
    
    // Simulate sending this as a query
    setTimeout(() => {
      fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: suggestion,
          context: conversationContext.slice(-3)
        })
      })
      .then(res => res.json())
      .then(data => {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: data.response,
          audioUrl: data.audio_url,
          timestamp: new Date().toLocaleTimeString(),
          id: Date.now() + '-bot-response',
          suggestions: data.suggestions || []
        }]);
        
        setConversationContext(prev => [...prev, {
          user: suggestion,
          bot: data.response
        }]);
      });
    }, 300);
  };

  return (
    <div className={`min-h-screen flex flex-col p-6 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header with dark mode toggle */}
      <div className="flex justify-between items-center mb-4 max-w-3xl w-full mx-auto">
        <h1 className="text-2xl font-bold">🎙️ Advanced Voice Assistant</h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {/* Chat history */}
      <div className={`flex-1 w-full max-w-3xl mx-auto overflow-y-auto rounded-lg shadow p-4 mb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
           style={{ maxHeight: '60vh' }}>
        {messages.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="mb-2">Start by pressing the microphone button or typing a message</p>
            <p className="text-sm">Try speaking in English or Hindi!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`px-4 py-2 rounded-lg max-w-xs ${msg.sender === 'user'
                ? 'bg-blue-500 text-white animate-slide-in-right'
                : msg.sender === 'bot'
                  ? `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-white' : 'text-gray-800'} animate-slide-in-left`
                  : 'bg-red-100 text-red-800'}`}>
                <div className="text-xs opacity-80 mb-1">
                  {msg.sender === 'user' ? 'You' : msg.sender === 'bot' ? 'Assistant' : 'System'} • {msg.timestamp}
                </div>
                <p>{msg.text}</p>
                {msg.sender === 'bot' && msg.audioUrl && (
                  <button
                    onClick={() => toggleAudio(msg.audioUrl)}
                    className={`mt-1 text-xs px-2 py-1 rounded-full ${playingUrl === msg.audioUrl
                      ? 'bg-blue-600 text-white'
                      : darkMode
                        ? 'bg-gray-600 text-blue-300'
                        : 'bg-blue-100 text-blue-800'}`}
                  >
                    {playingUrl === msg.audioUrl ? '⏸ Pause' : '🔊 Play'}
                  </button>
                )}
                {msg.sender === 'bot' && msg.suggestions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`text-xs px-2 py-1 rounded-full ${darkMode 
                          ? 'bg-gray-600 text-blue-300 hover:bg-gray-500' 
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input mode selector */}
      <div className="flex justify-center mb-4">
        <div className={`inline-flex rounded-md shadow-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} role="group">
          <button
            onClick={() => setInputMode('voice')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${inputMode === 'voice' 
              ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')}`}
          >
            Voice Input
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${inputMode === 'text' 
              ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')}`}
          >
            Text Input
          </button>
        </div>
      </div>

      {/* Input area */}
      {inputMode === 'text' ? (
        <div className="flex flex-col items-center gap-2 max-w-3xl w-full mx-auto">
          <div className="flex w-full gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendTextToBackend()}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
            />
            <button
              onClick={sendTextToBackend}
              disabled={loading || !textInput.trim()}
              className={`px-4 py-2 rounded-lg font-medium ${loading || !textInput.trim() 
                ? (darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500') 
                : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')}`}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {recording && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-red-500">Recording</span>
              <div className="flex items-center gap-1 h-6">
                {waveform.map((height, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-red-500 rounded-full" 
                    style={{ height: `${height * 20}px` }}
                  />
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className={`px-6 py-3 rounded-full text-white font-bold shadow-lg transition-all ${
              recording 
                ? 'bg-red-500 hover:bg-red-600' 
                : loading 
                  ? 'bg-gray-500' 
                  : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {recording ? '⏹ Stop Recording' : loading ? 'Processing...' : '🎤 Start Recording'}
          </button>
          
          {loading && (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} animate-pulse`}>
              Processing your {inputMode === 'voice' ? 'voice' : 'message'}...
            </p>
          )}
        </div>
      )}

      {/* Inline styles for animations */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default VoiceApp;