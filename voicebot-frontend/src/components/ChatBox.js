import React, { useState } from 'react';

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessage = { sender: "user", text: userInput };
    setMessages(prev => [...prev, newMessage]);

    try {
      const res = await fetch('http://localhost:5000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userInput })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: "bot", text: data.response }]);
    } catch (err) {
      console.error(err);
    }

    setUserInput("");
  };

  const chatContainerStyle = {
    border: '1px solid #ccc',
    borderRadius: '10px',
    height: '300px',
    overflowY: 'scroll',
    padding: '1rem',
    marginBottom: '1rem',
    backgroundColor: '#f4f4f4',
  };

  const bubbleStyle = (sender) => ({
    maxWidth: '70%',
    padding: '10px 15px',
    borderRadius: '15px',
    marginBottom: '10px',
    color: '#fff',
    backgroundColor: sender === 'user' ? '#007bff' : '#28a745',
    alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
    borderBottomRightRadius: sender === 'user' ? '0' : '15px',
    borderBottomLeftRadius: sender === 'user' ? '15px' : '0',
  });

  const messageWrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div>
      <div style={chatContainerStyle}>
        <div style={messageWrapperStyle}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={bubbleStyle(msg.sender)}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <input
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button onClick={sendMessage} style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', borderRadius: '5px' }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;