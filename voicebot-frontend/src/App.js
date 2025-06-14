import React, { useState, useRef } from "react";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/mp3" });
        const file = new File([blob], "audio.mp3", { type: "audio/mp3" });

        await sendAudioToBackend(file);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      alert("Failed to access microphone: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendAudioToBackend = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTranscript(data.transcript);
      setResponse(data.response);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>🎤 VoiceBot</h2>

      <button onClick={recording ? stopRecording : startRecording} style={styles.button}>
        {recording ? "⏹ Stop Recording" : "🎙 Start Recording"}
      </button>

      {loading && <p>⏳ Processing...</p>}

      {transcript && (
        <div style={styles.box}>
          <h4>📝 Transcript:</h4>
          <p>{transcript}</p>
        </div>
      )}

      {response && (
        <div style={styles.box}>
          <h4>🤖 Claude's Response:</h4>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "2rem auto",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  button: {
    padding: "1rem 2rem",
    fontSize: "1rem",
    marginBottom: "1rem",
    cursor: "pointer",
  },
  box: {
    marginTop: "1rem",
    padding: "1rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    textAlign: "left",
  },
};
