from flask import Flask, request, jsonify
from modules.transcribe_aws import transcribe_audio
from modules.bedrock_model import generate_response_bedrock
from dotenv import load_dotenv
import os
import uuid

load_dotenv()
app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    audio = request.files.get("audio")
    if not audio:
        return jsonify({"error": "No audio file"}), 400

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio.save(filepath)

    try:
        transcript = transcribe_audio(filepath, filename)
        response = generate_response_bedrock(transcript)
        return jsonify({"transcript": transcript, "response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    prompt = data.get("text", "")
    if not prompt.strip():
        return jsonify({"error": "Empty prompt"}), 400
    try:
        response = generate_response_bedrock(prompt)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)