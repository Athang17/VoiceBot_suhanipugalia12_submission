import React, { useState, useRef, useEffect } from 'react';

function ChatBox() {
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null);
  const [volume, setVolume] = useState(0.7);
  const [waveform, setWaveform] = useState([]);

  // 🔁 Auto-scroll to bottom when new message added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate waveform for visualization
  useEffect(() => {
    if (recording) {
      const interval = setInterval(() => {
        setWaveform(prev => [...prev.slice(-20), Math.random() * 0.5 + 0.5]);
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
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.mp3');

        try {
          const res = await fetch('http://localhost:5000/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();

          if (data.transcript) {
            setMessages(prev => [
              ...prev,
              { 
                sender: 'user', 
                text: data.transcript,
                timestamp: new Date().toLocaleTimeString(),
                id: Date.now() + '-user'
              },
            ]);
          }

          if (data.response) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'bot',
                text: data.response,
                audioUrl: data.audio_url,
                timestamp: new Date().toLocaleTimeString(),
                id: Date.now() + '-bot'
              },
            ]);
          }
        } catch (error) {
          console.error('Error:', error);
          setMessages(prev => [
            ...prev,
            {
              sender: 'bot',
              text: "Sorry, I encountered an error processing your request.",
              timestamp: new Date().toLocaleTimeString(),
              id: Date.now() + '-error'
            },
          ]);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: "Couldn't access microphone. Please check permissions.",
          timestamp: new Date().toLocaleTimeString(),
          id: Date.now() + '-error'
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  const toggleAudio = (url) => {
    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl(null);
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`http://localhost:5000${url}`);
      audioRef.current = audio;
      audio.volume = volume;
      setPlayingUrl(url);
      setIsPlaying(true);
      audio.play();
      audio.onended = () => {
        setPlayingUrl(null);
        setIsPlaying(false);
      };
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div
      className={`min-h-screen px-4 py-6 flex flex-col transition-colors duration-300 ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-blue-500">🎙️</span>
          <span>Voice Assistant</span>
        </h1>
        <div className="flex items-center gap-4">
          {isPlaying && (
            <div className="flex items-center gap-2">
              <span className="text-xs">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-blue-500"
              />
            </div>
          )}
          <button
            onClick={toggleDarkMode}
            className={`text-sm px-3 py-1 rounded-full transition-all ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {darkMode ? '🌞 Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {/* 🔁 Chat Bubbles List */}
      <div
        className={`flex-1 w-full max-w-3xl mx-auto overflow-y-auto rounded-lg shadow p-4 space-y-4 transition-colors duration-300 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        style={{ maxHeight: '60vh' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Press the microphone button to begin speaking
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex transition-all duration-300 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`px-4 py-3 rounded-xl max-w-xs lg:max-w-md text-sm shadow transform transition-all duration-300 ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white animate-slide-in-right'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white animate-slide-in-left'
                }`}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-medium opacity-80">
                    {msg.sender === 'user' ? 'You' : 'Assistant'}
                  </span>
                  <span className="text-xs opacity-60 ml-2">{msg.timestamp}</span>
                </div>
                <p className="mb-1">{msg.text}</p>
                {msg.sender === 'bot' && msg.audioUrl && (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      onClick={() => toggleAudio(msg.audioUrl)}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full transition-all ${
                        playingUrl === msg.audioUrl
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-gray-600 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-gray-500'
                      }`}
                    >
                      {playingUrl === msg.audioUrl ? (
                        <>
                          <span>⏸</span>
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <span>🔊</span>
                          <span>Play</span>
                        </>
                      )}
                    </button>
                    {playingUrl === msg.audioUrl && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 2, 1].map((height, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all ${
                              isPlaying ? 'bg-blue-400' : 'bg-gray-400'
                            }`}
                            style={{
                              height: `${height * (isPlaying ? 0.8 + Math.random() * 0.4 : 0.5)}rem`,
                              animation: isPlaying
                                ? `pulse ${0.5 + i * 0.1}s infinite alternate`
                                : 'none',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 🎤 Recorder Button */}
      <div className="mt-6 flex flex-col items-center gap-4">
        {recording && (
          <div className="flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-500">Recording...</span>
            <div className="flex items-center gap-1">
              {waveform.map((val, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full"
                  style={{ height: `${val * 20}px` }}
                />
              ))}
            </div>
          </div>
        )}
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`px-6 py-3 rounded-full shadow-lg font-semibold text-white transition-all duration-200 flex items-center gap-2 ${
            recording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
          }`}
        >
          {recording ? (
            <>
              <span className="w-3 h-3 bg-white rounded-full"></span>
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <span>🎤</span>
              <span>Start Recording</span>
            </>
          )}
        </button>
      </div>

      {/* Global styles for animations */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slide-in-left {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          from {
            opacity: 0.6;
          }
          to {
            opacity: 1;
          }
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

export default ChatBox;