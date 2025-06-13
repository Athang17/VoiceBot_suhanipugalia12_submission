import boto3
import time
import os
import requests

region = 'us-west-2'
s3 = boto3.client('s3', region_name=region)
transcribe = boto3.client('transcribe', region_name=region)

bucket = "voicebot-audio-bucket-suhani"

def transcribe_audio(filepath, filename):
    print(f"Uploading {filename} to S3 bucket: {bucket}")
    try:
        s3.upload_file(filepath, bucket, filename)
    except Exception as e:
        raise Exception(f"Failed to upload {filepath} to {bucket}/{filename}: {e}")

    job_name = f"job-{filename.replace('.', '-')}"
    file_uri = f"s3://{bucket}/{filename}"

    print(f"Starting Transcribe job: {job_name}")
    try:
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': file_uri},
            MediaFormat='mp3',
            LanguageCode='hi-IN'
        )
    except Exception as e:
        raise Exception(f"Failed to start transcription job: {e}")

    while True:
        status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
        job_status = status['TranscriptionJob']['TranscriptionJobStatus']
        print(f"Transcription job status: {job_status}")
        if job_status in ['COMPLETED', 'FAILED']:
            break
        time.sleep(2)

    if job_status == 'COMPLETED':
        transcript_url = status['TranscriptionJob']['Transcript'].get('TranscriptFileUri')
        if not transcript_url:
            raise Exception("TranscriptFileUri not returned by AWS Transcribe")

        response = requests.get(transcript_url)
        if not response.ok:
            raise Exception(f"Failed to fetch transcription JSON: {response.status_code}")
        
        result_json = response.json()
        transcripts = result_json.get('results', {}).get('transcripts', [])
        if not transcripts:
            raise Exception("No transcript text found")

        return transcripts[0]['transcript']
    else:
        raise Exception(f"Transcription job failed with status: {job_status}")
