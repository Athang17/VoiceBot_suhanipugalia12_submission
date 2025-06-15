# import boto3
# import time
# import os
# import requests
# import traceback

# region = 'us-west-2'
# bucket = "voicebot-audio-bucket-suhani"

# s3 = boto3.client('s3', region_name=region)
# transcribe = boto3.client('transcribe', region_name=region)

# def transcribe_audio(filepath, filename):
#     s3.upload_file(filepath, bucket, filename)
#     job_name = f"job-{filename.replace('.', '-')}-{int(time.time())}"
#     file_uri = f"s3://{bucket}/{filename}"

#     transcribe.start_transcription_job(
#         TranscriptionJobName=job_name,
#         Media={'MediaFileUri': file_uri},
#         MediaFormat='mp3',
#         IdentifyLanguage=True,
#         LanguageOptions=['en-IN', 'hi-IN', 'en-US']  
#     )

#     while True:
#         status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
#         job_status = status['TranscriptionJob']['TranscriptionJobStatus']
#         if job_status in ['COMPLETED', 'FAILED']:
#             break
#         time.sleep(5)
    
#     if job_status == 'COMPLETED':
#         detected_lang = status['TranscriptionJob'].get('LanguageCode')
#         print(f"🧠 Detected language by AWS Transcribe: {detected_lang}")

#     if job_status == 'COMPLETED':
#         transcript_url = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
#         response = requests.get(transcript_url)
#         result_json = response.json()
#         transcripts = result_json.get('results', {}).get('transcripts', [])
#         return transcripts[0]['transcript'], status['TranscriptionJob'].get('LanguageCode') if transcripts else ""
#     else:
#         raise Exception(f"Transcription job failed: {status}")
# parameters/modules/asr_module.py

import whisper

# Load once globally
model = whisper.load_model("base")  # Try "small" if it's still slow

def transcribe_audio(filepath, filename=None):
    try:
        # Load and prepare audio
        print("🌐 Detecting language (Hindi, English, Hinglish)...")
        audio = whisper.load_audio(filepath)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)

        # Language detection
        _, probs = model.detect_language(mel)
        lang = max(probs, key=probs.get)

        # Only accept 'hi' (Hindi) or 'en' (English)
        if lang not in ['en', 'hi']:
            print(f"⚠️ Detected unsupported language '{lang}', forcing transcription anyway.")

        # Transcribe using detected language
        result = model.transcribe(filepath, language=lang, fp16=False)
        transcript = result["text"].strip()

        print(f"🧠 Whisper transcript: {transcript}")
        print(f"🌍 Language: {lang.upper()} (used for transcription)")

        return transcript, lang

    except Exception as e:
        raise RuntimeError(f"Whisper transcription failed: {e}")
