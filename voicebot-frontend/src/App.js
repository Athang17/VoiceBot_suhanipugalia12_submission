import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';
import ConversationSummary from './components/ConversationSummary';

import StockMarketWidget from './components/StockMarketWidget';

function VoiceApp() {
  // State management
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState('voice');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveform, setWaveform] = useState([]);
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);

  // Add these state variables at the top with your other states
  const [autoStopMessageShown, setAutoStopMessageShown] = useState(false);

  // Stock market related states
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [marketStatus, setMarketStatus] = useState('Delayed');
  const [stocks, setStocks] = useState([
    { symbol: 'RELIANCE', price: 2856.15, change: 12.50 },
    { symbol: 'TCS', price: 3845.75, change: -25.75 },
    { symbol: 'HDFCBANK', price: 1658.20, change: 8.20 },
    { symbol: 'INFY', price: 1520.50, change: 15.25 }
  ]);

  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [news, setNews] = useState([
    { 
      title: 'Sensex crosses 75,000 for first time', 
      source: 'ET Now', 
      publishedAt: new Date() 
    },
    { 
      title: 'RBI keeps repo rate unchanged at 6.5%', 
      source: 'Business Standard', 
      publishedAt: new Date(Date.now() - 5*60*60*1000),
    },{
      title: 'Nifty hits all-time high of 22,000',
      source: 'Moneycontrol',
      publishedAt: new Date(Date.now() - 2*60*60*1000)
    
    }
  ]);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const chatEndRef = useRef(null);
  const noiseLevelIntervalRef = useRef(null);
  const silenceTimerRef = useRef(null); // Changed to useRef for better cleanup
  const lastSoundTimeRef = useRef(null); // Changed to useRef for better cleanup

  // Font size mapping
  const fontSizeMap = {
    small: {
      base: 'text-sm',
      chat: 'text-sm',
      input: 'text-sm',
      widget: 'text-xs'
    },
    medium: {
      base: 'text-base',
      chat: 'text-base',
      input: 'text-base',
      widget: 'text-sm'
    },
    large: {
      base: 'text-lg',
      chat: 'text-lg',
      input: 'text-lg',
      widget: 'text-base'
    }
  };

  // Keyboard shortcuts
  const keyboardShortcuts = [
    { key: 'Space', action: 'Start/stop voice recording' },
    { key: 'Tab', action: 'Switch between input modes' },
    { key: 'Esc', action: 'Close accessibility panel' },
    { key: 'Ctrl + Alt + D', action: 'Toggle dark mode' },
    { key: 'Ctrl + Alt + L', action: 'Toggle language' },
    { key: 'Ctrl + Alt + A', action: 'Toggle accessibility panel' }
  ];

  // Apply font size to document
  useEffect(() => {
    document.documentElement.style.fontSize = 
      fontSize === 'small' ? '14px' : 
      fontSize === 'medium' ? '16px' : '18px';
  }, [fontSize]);

  // Cleanup effects
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
      if (noiseLevelIntervalRef.current) {
        clearInterval(noiseLevelIntervalRef.current);
      }
    };
  }, []);

  // Stock Market Widget Component
<div>
  <StockMarketWidget darkMode={darkMode} />
</div>

  // News Widget Component
  const NewsWidget = () => (
    <div className={`p-3 rounded-lg shadow ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h2 className="font-semibold mb-3">Business Headlines</h2>
      <div className="space-y-3">
        {news.map((item, index) => (
          <div key={index} className="text-sm">
            <p className="font-medium">{item.title}</p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {item.source}
            </p>
          </div>
        ))}
      </div>
      <div className="w-65 lg:w-80 flex flex-col gap-3 h-full">
        {/* Existing widgets... */}
        <ConversationSummary 
          messages={messages} 
          darkMode={darkMode} 
          activeLanguage={activeLanguage} 
        />
      </div>
    </div>
  );

  // Apply dark mode to entire app
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Spacebar for voice recording
      if (inputMode === 'voice' && !loading && e.code === 'Space') {
        e.preventDefault();
        if (recording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
      
      // Tab to switch input modes
      if (e.key === 'Tab' && !loading) {
        e.preventDefault();
        setInputMode(prev => prev === 'voice' ? 'text' : 'voice');
      }
      
      // Escape to close accessibility panel
      if (e.key === 'Escape' && showAccessibilityPanel) {
        setShowAccessibilityPanel(false);
      }
      
      // Ctrl+Alt+D for dark mode toggle
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDarkMode(prev => !prev);
      }
      
      // Ctrl+Alt+L for language toggle
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleLanguage();
      }
      
      // Ctrl+Alt+A for accessibility panel toggle
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccessibilityPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputMode, loading, recording, showAccessibilityPanel]);

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

  // Monitor noise levels during recording
  useEffect(() => {
    if (recording) {
      noiseLevelIntervalRef.current = setInterval(() => {
        setNoiseLevel(Math.min(1, Math.max(0, noiseLevel + (Math.random() * 0.2 - 0.1))));
      }, 500);
    } else {
      clearInterval(noiseLevelIntervalRef.current);
      setNoiseLevel(0);
    }
    
    return () => clearInterval(noiseLevelIntervalRef.current);
  }, [recording, noiseLevel]);

  // Add conversational micro-interactions
  const addThinkingMessage = () => {
    const thinkingPhrases = {
      en: ["Hmm, let me think...", "Checking on that...", "One moment please...", "Let me find that information..."],
      hi: ["एक मिनट रुकिए...", "सोच रहा हूँ...", "जाँच रहा हूँ...", "एक पल..."],
      mixed: ["Hmm, थोड़ा सोचता हूँ...", "Let me check... एक सेकंड", "Wait... मैं देखता हूँ"]
    };
    
    const phrases = thinkingPhrases[activeLanguage] || thinkingPhrases.en;
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    setMessages(prev => [...prev, {
      sender: 'bot',
      text: phrase,
      id: Date.now() + '-thinking',
      isThinking: true,
      language: activeLanguage
    }]);
  };

  // Advanced noise cancellation setup
  const setupAudioContext = async (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      if (noiseLevel > 0.7) {
        addSystemMessage("Background noise detected. Activating noise cancellation...");
      }
    } catch (err) {
      console.error("Audio context error:", err);
    }
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
      
      await setupAudioContext(stream);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
  
      // Add audio processor for silence detection
      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 512;
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
  
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/mp3" });
        await sendAudioToBackend(blob);
      };
  
      mediaRecorderRef.current.start(100);
      setRecording(true);
      lastSoundTimeRef.current = Date.now();
      setAutoStopMessageShown(false);
      
      // Clear any existing timer
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
      
      // New silence detection with audio level monitoring
      silenceTimerRef.current = setInterval(() => {
        // Check audio level
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        const soundDetected = dataArray.some(level => level > 5); // Threshold
        
        if (soundDetected) {
          lastSoundTimeRef.current = Date.now();
        } else if (Date.now() - lastSoundTimeRef.current > 1000 && !autoStopMessageShown) {
          stopRecording();
          addSystemMessage(activeLanguage === 'hi' ? 
            'रिकॉर्डिंग स्वतः बंद: 1 सेकंड तक कोई आवाज़ नहीं' : 
            'Recording stopped automatically: No speech detected for 1 second');
          setAutoStopMessageShown(true);
        }
      }, 200); // Check every 200ms
  
      if (noiseLevel > 0.5) {
        addSystemMessage("Noisy environment detected. Speak clearly for best results.");
      }
    } catch (err) {
      addErrorMessage("Microphone access error: " + err.message);
    }
  };
    
  // Modify stopRecording to clear the silence timer
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  };

  const addSystemMessage = (message) => {
    setMessages(prev => [...prev, {
      sender: 'system',
      text: message,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-system',
      language: activeLanguage
    }]);
  };

  const addErrorMessage = (message) => {
    setMessages(prev => [...prev, {
      sender: 'system',
      text: message,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-error',
      language: activeLanguage
    }]);
  };

  // Enhanced response handling with language detection
  const handleBotResponse = (data) => {
    if (data.language && data.language !== activeLanguage) {
      setActiveLanguage(data.language);
      addSystemMessage(`Switched to ${data.language === 'hi' ? 'Hindi' : 'English'} mode`);
    }

    const fallbackPhrases = [
      "i didn't understand",
      "could you repeat",
      "can you rephrase",
      "please clarify",
      "not sure what you mean",
      "could you say that again"
    ];

    const responseText = (data.response || "").toLowerCase();
    const isFallback = fallbackPhrases.some(phrase =>
      responseText.includes(phrase)
    );

    const botMessage = {
      sender: 'bot',
      text: data.response,
      audioUrl: data.audio_url,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-bot',
      suggestions: data.suggestions || [],
      language: data.language || activeLanguage,
      isProactive: data.isProactive || false
    };

    setMessages(prev => [...prev, botMessage]);

    if (isFallback) {
      addSystemMessage("Sorry, I couldn't catch that. Could you please repeat or rephrase?");
    }
    
    setConversationContext(prev => [...prev, {
      user: data.transcript || textInput,
      bot: data.response
    }]);
    
    setConversationHistory(prev => [...prev, {
      user: data.transcript || textInput,
      bot: data.response,
      timestamp: new Date().toISOString()
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
      id: Date.now() + '-user',
      language: activeLanguage
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
          context: conversationContext.slice(-3),
          full_history: conversationHistory.slice(-10),
          current_language: activeLanguage
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => prev.filter(msg => !msg.isThinking));
      handleBotResponse(data);
    } catch (err) {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      
      if (err.message.includes("ambiguous") || err.message.includes("not understood")) {
        addSystemMessage("I'm not sure I understand. Could you rephrase or provide more details?");
      } else {
        addErrorMessage("Error: " + err.message);
      }
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
      formData.append("context", JSON.stringify(conversationContext.slice(-3)));
      formData.append("full_history", JSON.stringify(conversationHistory.slice(-10)));
      formData.append("current_language", activeLanguage);
      formData.append("noise_level", noiseLevel.toFixed(2));

      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => prev.filter(msg => !msg.isThinking));

      const userMessage = {
        sender: 'user',
        text: data.transcript,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + '-user',
        language: data.language || activeLanguage
      };
      
      setMessages(prev => [...prev, userMessage]);
      handleBotResponse(data);
    } catch (err) {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      
      if (err.message.includes("audio quality")) {
        addSystemMessage("I couldn't hear you clearly. Try speaking louder or in a quieter environment.");
      } else {
        addErrorMessage("Error processing your request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAudio = (url) => {
    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl(null);
      setIsSpeaking(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(`http://localhost:5000${url}`);
      setPlayingUrl(url);
      setIsSpeaking(true);
      
      setMessages(prev => prev.map(msg => 
        msg.audioUrl === url ? {...msg, isSpeaking: true} : msg
      ));
      
      audioRef.current.play()
        .then(() => {
          const messageElement = document.getElementById(`message-${url}`);
          if (messageElement) {
            messageElement.classList.add('animate-pulse-slow');
          }
        })
        .catch(err => {
          console.error("Audio playback error:", err);
          addErrorMessage("Audio playback failed. Please try again.");
          setPlayingUrl(null);
          setIsSpeaking(false);
        });
      
      audioRef.current.onended = () => {
        setPlayingUrl(null);
        setIsSpeaking(false);
        setMessages(prev => prev.map(msg => 
          msg.audioUrl === url ? {...msg, isSpeaking: false} : msg
        ));
      };
      
      audioRef.current.onerror = () => {
        addErrorMessage("Audio playback error");
        setPlayingUrl(null);
        setIsSpeaking(false);
      };
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setMessages(prev => [...prev, {
      sender: 'user',
      text: suggestion,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + '-suggestion',
      language: activeLanguage
    }]);
    
    setTimeout(() => {
      fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: suggestion,
          context: conversationContext.slice(-3),
          full_history: conversationHistory.slice(-10),
          current_language: activeLanguage,
          is_followup: true
        })
      })
      .then(res => res.json())
      .then(data => {
        handleBotResponse(data);
      })
      .catch(err => {
        addErrorMessage("Failed to get response for suggestion");
      });
    }, 300);
  };

  const showProactiveSuggestion = () => {
    if (conversationHistory.length > 2) {
      const lastTopic = conversationHistory[conversationHistory.length - 1].bot;
      if (lastTopic.includes("loan") || lastTopic.includes("कर्ज")) {
        setTimeout(() => {
          const suggestion = activeLanguage === 'hi' ? 
            "क्या आप हमारे विशेष ब्याज दर ऋण प्रस्ताव के बारे में जानना चाहेंगे?" : 
            "Would you like to know about our special interest rate loan offer?";
          
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: suggestion,
            id: Date.now() + '-proactive',
            timestamp: new Date().toLocaleTimeString(),
            isProactive: true,
            language: activeLanguage
          }]);
        }, 2000);
      }
    }
  };

  const toggleLanguage = () => {
    const newLanguage = activeLanguage === 'en' ? 'hi' : 'en';
    setActiveLanguage(newLanguage);
    // Show message in the new language
    if (newLanguage === 'hi') {
      addSystemMessage('भाषा हिंदी में बदल गई'); // "Language changed to Hindi" in Hindi
    } else {
      addSystemMessage('Language switched to English');
    }
  };

  // Accessibility Panel Component
  const AccessibilityPanel = () => (
    <div className={`fixed right-4 bottom-4 z-50 p-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
         style={{ width: '300px' }}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Accessibility Settings</h3>
        <button 
          onClick={() => setShowAccessibilityPanel(false)}
          className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          aria-label="Close accessibility panel"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Font Size</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setFontSize('small')}
              className={`px-3 py-1 rounded-full ${fontSize === 'small' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
            >
              Small
            </button>
            <button
              onClick={() => setFontSize('medium')}
              className={`px-3 py-1 rounded-full ${fontSize === 'medium' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
            >
              Medium
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-3 py-1 rounded-full ${fontSize === 'large' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
            >
              Large
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
          <div className={`text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-2 rounded`}>
            <ul className="space-y-1">
              {keyboardShortcuts.map((shortcut, index) => (
                <li key={index} className="flex justify-between">
                  <span className="font-mono bg-gray-600 text-white px-1 rounded">{shortcut.key}</span>
                  <span>{shortcut.action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="text-xs opacity-70">
          <p>For screen reader users: All interactive elements have proper ARIA labels.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col p-4 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* Accessibility button */}
      <button 
        onClick={() => setShowAccessibilityPanel(!showAccessibilityPanel)}
        className={`fixed right-4 bottom-4 z-40 p-3 rounded-full shadow-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
        aria-label="Accessibility settings"
      >
        ♿
      </button>
      
      {showAccessibilityPanel && <AccessibilityPanel />}
      
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-full mx-auto h-[calc(100vh-2rem)]">
        
        {/* Left column - Chat interface */}
        <div className="flex-1 flex flex-col h-full" style={{ minWidth: '65%' }}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {activeLanguage === 'hi' ? '🎙️ आवाज सहायक' : '🎙️ Advanced Voice Assistant'}
            </h1>
            <div className="flex gap-2">
            <button
              onClick={toggleLanguage}
              className={`px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              {activeLanguage === 'hi' ? '🇮🇳 English' : '🇮🇳 हिंदी'}
            </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
          </div>

          {/* Noise level indicator */}
          {recording && noiseLevel > 0.4 && (
            <div className="w-full mb-2">
              <div className={`text-xs ${noiseLevel > 0.7 ? 'text-red-500' : 'text-yellow-500'} flex items-center`}>
                <span className="mr-1">
                  {noiseLevel > 0.7 ? '⚠️ High background noise' : 'Background noise detected'}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${noiseLevel > 0.7 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                    style={{ width: `${noiseLevel * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Increased chat area height */}
          <div className={`flex-1 w-full max-w-3xl mx-auto overflow-y-auto rounded-lg shadow p-4 mb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
               style={{ height: '70vh' }}>
            {messages.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="mb-2">
                  {activeLanguage === 'hi'
                    ? 'माइक्रोफोन बटन दबाकर या संदेश टाइप करके शुरू करें' 
                    : 'Start by pressing the microphone button or typing a message'}
                </p>
                <p className="text-sm">
                  {activeLanguage === 'hi' 
                    ? 'हिंदी या अंग्रेजी में बोलने का प्रयास करें!' 
                    : 'Try speaking in English or Hindi!'}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  id={`message-${msg.audioUrl || msg.id}`}
                >
                  <div className={`px-4 py-2 rounded-lg max-w-xs ${msg.sender === 'user'
                    ? 'bg-blue-500 text-white animate-slide-in-right'
                    : msg.sender === 'bot'
                      ? `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-white' : 'text-gray-800'} animate-slide-in-left`
                      : msg.sender === 'system'
                        ? `${darkMode ? 'bg-gray-600' : 'bg-gray-100'} ${darkMode ? 'text-gray-300' : 'text-gray-600'}`
                        : 'bg-red-100 text-red-800'} ${msg.isProactive ? 'border-l-4 border-blue-400' : ''}`}>
                    <div className="text-xs opacity-80 mb-1 flex justify-between items-center">
                      <span>
                        {msg.sender === 'user' 
                          ? (activeLanguage === 'hi' ? 'आप' : 'You') 
                          : msg.sender === 'bot' 
                            ? (activeLanguage === 'hi' ? 'सहायक' : 'Assistant')
                            : 'System'} • {msg.timestamp}
                      </span>
                      {msg.language && msg.language !== activeLanguage && (
                        <span className="text-xs opacity-60 ml-2">
                          {msg.language === 'hi' ? '🇮🇳' : '🇬🇧'}
                        </span>
                      )}
                    </div>
                    <p className={msg.isSpeaking ? 'text-blue-600 dark:text-blue-400' : ''}>
                      {msg.text}
                      {msg.isSpeaking && (
                        <span className="ml-2 inline-block animate-bounce">🗣️</span>
                      )}
                    </p>
                    {msg.sender === 'bot' && msg.audioUrl && (
                      <button
                        onClick={() => toggleAudio(msg.audioUrl)}
                        className={`mt-1 text-xs px-2 py-1 rounded-full flex items-center ${playingUrl === msg.audioUrl
                          ? 'bg-blue-600 text-white'
                          : darkMode
                            ? 'bg-gray-600 text-blue-300'
                            : 'bg-blue-100 text-blue-800'}`}
                      >
                        {playingUrl === msg.audioUrl ? (
                          <>
                            <span className="mr-1">⏸</span>
                            {activeLanguage === 'hi' ? 'रोकें' : 'Pause'}
                          </>
                        ) : (
                          <>
                            <span className="mr-1">🔊</span>
                            {activeLanguage === 'hi' ? 'सुनें' : 'Play'}
                          </>
                        )}
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

          {/* Input area */}
          <div className="mt-auto">
            {/* Input mode selector */}
            <div className="flex justify-center mb-4">
              <div className={`inline-flex rounded-md shadow-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} role="group">
                <button
                  onClick={() => setInputMode('voice')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${inputMode === 'voice' 
                    ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                    : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                >
                  {activeLanguage === 'hi' ? 'आवाज इनपुट' : 'Voice Input'}
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${inputMode === 'text' 
                    ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                    : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                >
                  {activeLanguage === 'hi' ? 'टेक्स्ट इनपुट' : 'Text Input'}
                </button>
              </div>
            </div>

            {/* Input area */}
            {inputMode === 'text' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex w-full gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendTextToBackend()}
                    placeholder={activeLanguage === 'hi' ? 'अपना संदेश टाइप करें...' : 'Type your message...'}
                    className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                  />
                  <button
                    onClick={sendTextToBackend}
                    disabled={loading || !textInput.trim()}
                    className={`px-4 py-2 rounded-lg font-medium ${loading || !textInput.trim() 
                      ? (darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500') 
                      : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')}`}
                  >
                    {activeLanguage === 'hi' ? 'भेजें' : 'Send'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {recording && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-red-500">
                      {activeLanguage === 'hi' ? 'रिकॉर्डिंग' : 'Recording'}
                    </span>
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
                  className={`px-6 py-3 rounded-full text-white font-bold shadow-lg transition-all flex items-center ${
                    recording 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : loading 
                        ? 'bg-gray-500' 
                        : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {recording ? (
                    <>
                      <span className="mr-2">⏹</span>
                      {activeLanguage === 'hi' ? 'रिकॉर्डिंग रोकें' : 'Stop Recording'}
                    </>
                  ) : loading ? (
                    activeLanguage === 'hi' ? 'प्रोसेस हो रहा है...' : 'Processing...'
                  ) : (
                    <>
                      <span className="mr-2">🎤</span>
                      {activeLanguage === 'hi' ? 'रिकॉर्डिंग शुरू करें' : 'Start Recording'}
                    </>
                  )}
                </button>
                
                {loading && (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} animate-pulse`}>
                    {activeLanguage === 'hi' 
                      ? 'आपकी आवाज प्रोसेस हो रही है...' 
                      : `Processing your ${inputMode === 'voice' ? 'voice' : 'message'}...`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Widgets */}
        <div className="w-full lg:w-80 flex flex-col gap-3 h-full">
          {/* Date/time widget */}
          <div className={`p-3 rounded-lg shadow ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <h2 className="text-md font-semibold">
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>

          {/* Stocks Widget */}
          <StockMarketWidget />

          {/* News Widget */}
          <NewsWidget />
        </div>
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
          animation: slide-in-right 0.2s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.2s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default VoiceApp;