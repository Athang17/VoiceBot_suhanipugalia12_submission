import React, { useState, useRef, useEffect } from 'react';

function VoiceApp() {
  // State management
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null);
  
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setMessages(prev => [...prev, {
        sender: 'system',
        text: "Microphone access error: " + err.message,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-error'
      }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.mp3");

      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Add user message
      setMessages(prev => [...prev, {
        sender: 'user',
        text: data.transcript,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-user'
      }]);

      // Add bot response
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: data.response,
        audioUrl: data.audio_url,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-bot'
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: "Error: " + err.message,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-error'
      }]);
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
      const audio = new Audio(`http://localhost:5000${url}`);
      audioRef.current = audio;
      setPlayingUrl(url);
      audio.play();
      audio.onended = () => setPlayingUrl(null);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col p-6 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header with dark mode toggle */}
      <div className="flex justify-between items-center mb-4 max-w-3xl w-full mx-auto">
        <h1 className="text-2xl font-bold">🎙️ Voice Assistant</h1>
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
            Start by pressing the microphone button
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
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Recording button with status */}
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
          className={`px-6 py-3 rounded-full text-white font-bold shadow-lg transition-all ${
            recording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {recording ? '⏹ Stop Recording' : '🎤 Start Recording'}
        </button>
        
        {loading && (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} animate-pulse`}>
            Processing your voice...
          </p>
        )}
      </div>

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