import React, { useState, useRef } from 'react';

function ChatBox() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);

        // 👉 Send this blob to backend (optional)
        // sendToBackend(audioBlob);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');

        fetch('http://localhost:5000/transcribe', {
          method: 'POST',
          body: formData,
        })
        .then(res => res.json())
        .then(data => console.log('Server response:', data))
        .catch(err => console.error('Upload error:', err));

      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {audioURL && (
        <div>
          <h3>Playback:</h3>
          <audio controls src={audioURL} />
        </div>
      )}
    </div>
  );
}

export default ChatBox;
