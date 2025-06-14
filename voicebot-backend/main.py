from flask import Flask, request, jsonify
from flask_cors import CORS  # ✅ Add this
import os
import uuid
from dotenv import load_dotenv

from modules.transcribe_aws import transcribe_audio
from modules.bedrock_model import generate_response_bedrock

load_dotenv()
app = Flask(__name__)
CORS(app)  # ✅ Add this line to enable CORS for all routes

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    audio = request.files.get("audio")
    if not audio:
        return jsonify({"error": "No audio file provided in the request."}), 400

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    try:
        audio.save(filepath)
    except Exception as e:
        print(f"Error saving audio file: {e}")
        return jsonify({"error": f"Failed to save audio file: {e}"}), 500

    try:
        transcript = transcribe_audio(filepath, filename)
        print(f"Transcription successful: {transcript}") # Log transcript
        response_text = generate_response_bedrock(transcript)
        print(f"Bedrock response received: {response_text}") # Log Bedrock response
        return jsonify({"transcript": transcript, "response": response_text})
    except Exception as e:
        import traceback
        print(f"Error during transcription or Bedrock processing: {e}")
        traceback.print_exc() # Print full traceback for detailed error
        return jsonify({"error": f"An error occurred: {e}", "details": traceback.format_exc()}), 500
    finally:
        # Clean up the uploaded audio file
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"Cleaned up file: {filepath}")

@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    prompt = data.get("text", "")
    if not prompt or not prompt.strip():
        return jsonify({"error": "Empty prompt provided."}), 400

    try:
        response_text = generate_response_bedrock(prompt)
        print(f"Bedrock response for query: {response_text}")
        return jsonify({"response": response_text})
    except Exception as e:
        import traceback
        print(f"Error during query Bedrock processing: {e}")
        traceback.print_exc() # Print full traceback for detailed error
        return jsonify({"error": f"An error occurred during query: {e}", "details": traceback.format_exc()}), 500

if __name__ == '__main__':
    # Ensure debug is False in production
    app.run(debug=True, host='0.0.0.0') # Listen on all interfaces