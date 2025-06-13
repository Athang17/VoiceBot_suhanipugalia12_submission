// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const AI_SALES_REP = () => {
  // State management
  const [currentTime, setCurrentTime] = useState('');
  const [activeView, setActiveView] = useState('chat'); // 'chat', 'language', 'accessibility'
  const [highContrast, setHighContrast] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Supported languages
  const languages = [
    { name: 'English (English)', code: 'en' },
    { name: 'Hindi', code: 'hi' },
    { name: 'Bengali', code: 'bn' },
    { name: 'Telugu', code: 'te' },
    { name: 'Tamil', code: 'ta' },
    { name: 'Marathi', code: 'mr' },
    { name: 'Gujarati', code: 'gu' },
    { name: 'Kannada', code: 'kn' },
    { name: 'Malayalam', code: 'ml' },
    { name: 'Punjabi', code: 'pa' }
  ];

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      setCurrentTime(`${formattedHours}:${minutes} ${ampm}`);
    };
    
    updateTime();
    const intervalId = setInterval(updateTime, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate AI typing
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: `Thanks for your message: "${inputValue}". I'm an AI sales representative. How can I assist you with our products and services?`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  // Handle input key events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle font size change
  const handleFontSizeChange = (size) => {
    setFontSize(size);
  };

  // Get dynamic styles based on settings
  const getStyles = () => {
    const baseStyles = {
      container: {
        backgroundColor: highContrast ? '#000' : '#f5f7fb',
        color: highContrast ? '#fff' : '#333',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        transition: 'all 0.3s ease'
      },
      header: {
        backgroundColor: highContrast ? '#222' : '#3f51b5',
        color: highContrast ? '#fff' : '#fff',
        padding: '1rem',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative'
      },
      content: {
        padding: '1rem',
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      },
      settingsPanel: {
        backgroundColor: highContrast ? '#333' : '#fff',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      },
      chatContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      },
      messageList: {
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem'
      },
      message: {
        maxWidth: '80%',
        padding: '0.75rem',
        borderRadius: '18px',
        marginBottom: '0.75rem',
        position: 'relative'
      },
      userMessage: {
        backgroundColor: highContrast ? '#0066cc' : '#3f51b5',
        color: '#fff',
        alignSelf: 'flex-end'
      },
      aiMessage: {
        backgroundColor: highContrast ? '#444' : '#e0e0e0',
        color: highContrast ? '#fff' : '#333',
        alignSelf: 'flex-start'
      },
      timestamp: {
        fontSize: '0.65rem',
        opacity: 0.7,
        marginTop: '0.25rem',
        textAlign: 'right'
      },
      inputContainer: {
        display: 'flex',
        padding: '1rem',
        borderTop: `1px solid ${highContrast ? '#444' : '#e0e0e0'}`
      },
      input: {
        flex: 1,
        border: 'none',
        borderRadius: '24px',
        padding: '0.75rem 1rem',
        outline: 'none',
        backgroundColor: highContrast ? '#333' : '#fff',
        color: highContrast ? '#fff' : '#333',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      },
      button: {
        backgroundColor: highContrast ? '#0066cc' : '#3f51b5',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        marginLeft: '0.5rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      footer: {
        padding: '0.5rem 1rem',
        backgroundColor: highContrast ? '#222' : '#fff',
        borderTop: `1px solid ${highContrast ? '#444' : '#e0e0e0'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      },
      tabButton: {
        backgroundColor: 'transparent',
        border: 'none',
        color: highContrast ? '#4da6ff' : '#3f51b5',
        padding: '0.5rem',
        cursor: 'pointer',
        fontWeight: 'bold'
      },
      activeTab: {
        borderBottom: `2px solid ${highContrast ? '#4da6ff' : '#3f51b5'}`
      },
      settingItem: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '0.75rem'
      },
      settingLabel: {
        flex: 1,
        marginRight: '1rem'
      },
      switch: {
        position: 'relative',
        display: 'inline-block',
        width: '50px',
        height: '24px'
      },
      slider: {
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: highContrast ? '#444' : '#ccc',
        transition: '.4s',
        borderRadius: '24px'
      },
      sliderBefore: {
        position: 'absolute',
        content: '""',
        height: '16px',
        width: '16px',
        left: '4px',
        bottom: '4px',
        backgroundColor: 'white',
        transition: '.4s',
        borderRadius: '50%'
      },
      inputChecked: {
        backgroundColor: highContrast ? '#0066cc' : '#3f51b5'
      },
      inputCheckedBefore: {
        transform: 'translateX(26px)'
      },
      fontSizeControls: {
        display: 'flex',
        gap: '0.5rem'
      },
      fontSizeButton: {
        backgroundColor: 'transparent',
        border: `1px solid ${highContrast ? '#4da6ff' : '#3f51b5'}`,
        color: highContrast ? '#4da6ff' : '#3f51b5',
        borderRadius: '4px',
        padding: '0.25rem 0.5rem',
        cursor: 'pointer'
      },
      activeFontSize: {
        backgroundColor: highContrast ? '#0066cc' : '#3f51b5',
        color: '#fff'
      },
      languageList: {
        listStyle: 'none',
        padding: 0,
        margin: 0
      },
      languageItem: {
        padding: '0.75rem',
        borderBottom: `1px solid ${highContrast ? '#444' : '#e0e0e0'}`,
        cursor: 'pointer'
      },
      languageItemHover: {
        backgroundColor: highContrast ? '#333' : '#f0f0f0'
      }
    };

    // Apply font size
    let fontSizeValue;
    if (fontSize === 'small') fontSizeValue = '14px';
    else if (fontSize === 'large') fontSizeValue = '18px';
    else fontSizeValue = '16px';

    baseStyles.container.fontSize = fontSizeValue;

    return baseStyles;
  };

  const styles = getStyles();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>AI Sales Representative</h1>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          {currentTime}
        </div>
      </header>

      {/* Greeting */}
      <div style={{ ...styles.content, paddingBottom: '0' }}>
        <div style={{ 
          backgroundColor: highContrast ? '#333' : '#fff', 
          padding: '1rem', 
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          marginBottom: '1rem'
        }}>
          <p>Hello! I'm your AI sales representative. I'm here to help you with any questions about our products and services. You can type your message or use voice input. How can I assist you today?</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.footer}>
        <button 
          style={{ 
            ...styles.tabButton, 
            ...(activeView === 'language' ? styles.activeTab : {}) 
          }}
          onClick={() => setActiveView('language')}
        >
          Languages
        </button>
        <button 
          style={{ 
            ...styles.tabButton, 
            ...(activeView === 'accessibility' ? styles.activeTab : {}) 
          }}
          onClick={() => setActiveView('accessibility')}
        >
          Accessibility
        </button>
        <button 
          style={{ 
            ...styles.tabButton, 
            ...(activeView === 'chat' ? styles.activeTab : {}) 
          }}
          onClick={() => setActiveView('chat')}
        >
          Chat
        </button>
      </div>

      {/* Main Content Area */}
      <div style={styles.content}>
        {activeView === 'language' && (
          <div style={styles.settingsPanel}>
            <h3 style={{ marginTop: 0 }}>Select Language</h3>
            <ul style={styles.languageList}>
              {languages.map((lang, index) => (
                <li 
                  key={lang.code} 
                  style={styles.languageItem}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = highContrast ? '#333' : '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {lang.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeView === 'accessibility' && (
          <div style={styles.settingsPanel}>
            <div style={styles.settingItem}>
              <span style={styles.settingLabel}>High Contrast</span>
              <label style={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={highContrast}
                  onChange={() => setHighContrast(!highContrast)}
                  style={{ display: 'none' }}
                />
                <span style={{ 
                  ...styles.slider, 
                  ...(highContrast ? styles.inputChecked : {}) 
                }}></span>
              </label>
            </div>
            
            <div style={styles.settingItem}>
              <span style={styles.settingLabel}>Voice Output</span>
              <label style={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={voiceOutput}
                  onChange={() => setVoiceOutput(!voiceOutput)}
                  style={{ display: 'none' }}
                />
                <span style={{ 
                  ...styles.slider, 
                  ...(voiceOutput ? styles.inputChecked : {}) 
                }}></span>
              </label>
            </div>
            
            <div style={styles.settingItem}>
              <span style={styles.settingLabel}>Font Size</span>
              <div style={styles.fontSizeControls}>
                <button 
                  style={{ 
                    ...styles.fontSizeButton,
                    ...(fontSize === 'small' ? styles.activeFontSize : {})
                  }}
                  onClick={() => handleFontSizeChange('small')}
                >
                  Small
                </button>
                <button 
                  style={{ 
                    ...styles.fontSizeButton,
                    ...(fontSize === 'medium' ? styles.activeFontSize : {})
                  }}
                  onClick={() => handleFontSizeChange('medium')}
                >
                  Medium
                </button>
                <button 
                  style={{ 
                    ...styles.fontSizeButton,
                    ...(fontSize === 'large' ? styles.activeFontSize : {})
                  }}
                  onClick={() => handleFontSizeChange('large')}
                >
                  Large
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <h4>Keyboard Shortcuts</h4>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: 0 }}>
                <li>Enter: Send message</li>
                <li>Shift+Enter: New line</li>
                <li>Tab: Navigate controls</li>
              </ul>
            </div>
          </div>
        )}

        {activeView === 'chat' && (
          <div style={styles.chatContainer}>
            <div style={styles.messageList}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{
                    ...styles.message,
                    ...(msg.sender === 'user' ? styles.userMessage : styles.aiMessage)
                  }}
                >
                  {msg.text}
                  <div style={styles.timestamp}>{msg.timestamp}</div>
                </div>
              ))}
              
              {isTyping && (
                <div style={{ ...styles.message, ...styles.aiMessage }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      {activeView === 'chat' && (
        <div style={styles.inputContainer}>
          <textarea
            style={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here... (Press Enter to send)"
            rows="1"
          />
          <button 
            style={styles.button}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 2L11 13"></path>
              <path d="M22 2L15 22 11 13 2 9 22 2z"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AI_SALES_REP;