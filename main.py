from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
from dotenv import load_dotenv
import sys
sys.path.append("voicebot-backend")

from modules.transcribe_aws import transcribe_audio
from modules.bedrock_model import generate_response_bedrock
from modules.polly_tts import synthesize_speech

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/transcribe": {"origins": "*"},
    r"/query": {"origins": "*"},
    r"/audio/*": {"origins": "*"}
})

UPLOAD_FOLDER = "uploads"
TTS_OUTPUT_FOLDER = "tts_outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TTS_OUTPUT_FOLDER, exist_ok=True)

@app.route('/audio/<filename>')
def serve_audio(filename):
    response = send_from_directory(TTS_OUTPUT_FOLDER, filename)
    response.headers.add('Content-Type', 'audio/mpeg')
    return response

@app.route('/transcribe', methods=['POST'])
def transcribe():
    audio = request.files.get("audio")
    if not audio:
        return jsonify({"error": "No audio file provided in the request."}), 400

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    try:
        audio.save(filepath)
        transcript, detected_lang = transcribe_audio(filepath, filename)
        response_text = generate_response_bedrock(transcript, detected_lang)
        tts_filepath = synthesize_speech(response_text)
        audio_url = f"/audio/{os.path.basename(tts_filepath)}"

        return jsonify({
            "transcript": transcript,
            "response": response_text,
            "audio_url": audio_url
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"An error occurred: {e}",
            "details": traceback.format_exc()
        }), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    prompt = data.get("text", "")
    if not prompt.strip():
        return jsonify({"error": "Empty prompt provided."}), 400

    try:
        response_text = generate_response_bedrock(prompt)
        tts_filepath = synthesize_speech(response_text)
        audio_url = f"/audio/{os.path.basename(tts_filepath)}"

        return jsonify({
            "response": response_text,
            "audio_url": audio_url
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"An error occurred during query: {e}",
            "details": traceback.format_exc()
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
