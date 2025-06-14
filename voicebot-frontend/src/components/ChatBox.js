import React, { useState, useRef, useEffect } from 'react';

function ChatBox() {
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [audioURL, setAudioURL] = useState('');
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setRecording(false);
    }
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = e => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
      setAudioURL(URL.createObjectURL(audioBlob));

      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.mp3");

      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.transcript)
        setMessages(prev => [...prev, { sender: "user", text: data.transcript }]);
      if (data.response)
        setMessages(prev => [...prev, { sender: "bot", text: data.response }]);
      if (data.audio_url) {
        const audio = new Audio(`http://localhost:5000${data.audio_url}`);
        audio.play();
        audioRef.current = audio;
      }
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    setRecording(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "⏹ Stop Recording" : "🎤 Start Recording"}
      </button>

      <div style={{ marginTop: 20 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ margin: 10, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
            <b>{msg.sender}:</b> {msg.text}
          </div>
        ))}
      </div>

      {audioURL && <audio src={audioURL} controls />}
    </div>
  );
}

export default ChatBox;
