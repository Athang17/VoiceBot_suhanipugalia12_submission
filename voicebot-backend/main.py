from flask import Flask, request, jsonify
from modules.transcribe_aws import transcribe_audio
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
        return jsonify({"transcript": transcript})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
