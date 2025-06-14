import boto3
import os
import uuid

region = "us-west-2"
polly = boto3.client("polly", region_name=region)
TTS_OUTPUT_FOLDER = "tts_outputs"

def synthesize_speech(text, voice_id="Aditi"):
    if not text.strip():
        raise ValueError("Text cannot be empty for speech synthesis")

    response = polly.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=voice_id,
    )

    if "AudioStream" in response:
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(TTS_OUTPUT_FOLDER, filename)
        with open(filepath, "wb") as f:
            f.write(response["AudioStream"].read())
        return filepath
    else:
        raise Exception("Polly returned no audio stream")
