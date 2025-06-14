import React, { useState, useRef } from 'react';

function VoiceApp() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

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
      alert("Microphone access error: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
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

      setTranscript(data.transcript);
      setResponse(data.response);

      // Play the audio response if available
      if (data.audio_url) {
        audioRef.current = new Audio(`http://localhost:5000${data.audio_url}`);
        audioRef.current.play();
      }      
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Voice Bot</h2>
      
      <button 
        onClick={recording ? stopRecording : startRecording}
        style={{
          padding: '10px 20px',
          background: recording ? '#ff4444' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {recording ? '⏹ Stop Recording' : '🎤 Start Recording'}
      </button>

      {loading && <p>Processing...</p>}

      <div style={{ marginTop: '20px' }}>
        {transcript && (
          <div style={{ marginBottom: '10px' }}>
            <h4>You said:</h4>
            <p>{transcript}</p>
          </div>
        )}

        {response && (
          <div>
            <h4>Response:</h4>
            <p>{response}</p>
          </div>
        )}
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}

export default VoiceApp;