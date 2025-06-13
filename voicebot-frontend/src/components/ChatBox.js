import React, { useState } from 'react';
import { ReactMic } from 'react-mic';

function ChatBox() {
  const [record, setRecord] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const startRecording = () => {
    setRecord(true);
    setRecordedBlob(null);
  };

  const stopRecording = () => setRecord(false);

  const onStop = (recordedData) => {
    console.log("Recorded audio blob:", recordedData.blob);
    setRecordedBlob(recordedData.blob);
  };

  const sendAudio = async () => {
    if (!recordedBlob) return;

    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.mp3');

    setMessages(prev => [...prev, { sender: 'user', text: '[🎤 Audio Sent]' }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      console.log('Response:', data);

      if (data.error) {
        setMessages(prev => [...prev, { sender: 'bot', text: `⚠️ Error: ${data.error}` }]);
      } else {
        setMessages(prev => [
          ...prev,
          { sender: 'transcript', text: `📝 Transcript: ${data.transcript}` },
          { sender: 'bot', text: data.response }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: '⚠️ Network or server error' }]);
    } finally {
      setLoading(false);
      setRecordedBlob(null);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>🎙️ VoiceBot Chat</h2>

      <div style={{ border: '1px solid #ccc', padding: '1rem', height: '300px', overflowY: 'scroll', backgroundColor: '#f9f9f9', marginBottom: '1rem' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '10px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <b>{msg.sender}:</b> {msg.text}
          </div>
        ))}
        {loading && <div><i>⏳ Processing...</i></div>}
      </div>

      <ReactMic
        record={record}
        onStop={onStop}
        mimeType="audio/mp3"
        strokeColor="#000000"
        backgroundColor="#eee"
        className="sound-wave"
      />
      <div style={{ marginTop: '1rem' }}>
        <button onClick={startRecording} disabled={record}>🎙️ Start</button>
        <button onClick={stopRecording} disabled={!record}>🛑 Stop</button>
        <button onClick={sendAudio} disabled={!recordedBlob}>📤 Send</button>
      </div>
    </div>
  );
}

export default ChatBox;
