import React, { useState } from 'react';

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [recordedBlob, setRecordedBlob] = useState(null);

  const sendAudio = async () => {
    if (!recordedBlob) return;

    const formData = new FormData();
    formData.append("audio", recordedBlob, "recording.mp3");

    const newMessage = { sender: "user", text: "[🎤 Audio Message]" };
    setMessages(prev => [...prev, newMessage]);

    try {
      const res = await fetch('http://localhost:5000/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: data.response }
      ]);
    } catch (err) {
      console.error(err);
    }

    setRecordedBlob(null);
  };

  return (
    <div>
      <button onClick={sendAudio}>Send Audio</button>
    </div>
  );
}

export default ChatBox;
