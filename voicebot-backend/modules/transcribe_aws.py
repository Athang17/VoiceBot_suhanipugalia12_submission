# modules/transcribe_aws.py
import boto3
import time
import os
import requests
import traceback # Import traceback for detailed error logging

# Use us-west-2 to match your bucket
region = 'us-west-2'
# Initialize S3 and Transcribe clients
try:
    s3 = boto3.client('s3', region_name=region)
    transcribe = boto3.client('transcribe', region_name=region)
except Exception as e:
    print(f"Error initializing AWS clients: {e}")
    traceback.print_exc()
    # Handle this more gracefully if the app needs to start without clients immediately
    s3 = None
    transcribe = None

# Ensure your S3 bucket name is correct and the bucket exists in the specified region.
# Also ensure the IAM role/user has s3:PutObject permissions for this bucket.
bucket = "voicebot-audio-bucket-suhani" # Ensure this bucket exists in us-west-2

def transcribe_audio(filepath, filename):
    """
    Uploads an audio file to S3 and then starts an AWS Transcribe job.
    Waits for the job to complete and fetches the transcription.

    Args:
        filepath (str): The local path to the audio file.
        filename (str): The desired filename for the audio file in S3.

    Returns:
        str: The transcribed text.

    Raises:
        Exception: If S3 upload, Transcribe job start, or transcription
                   fetching fails.
    """
    if not s3 or not transcribe:
        raise Exception("AWS S3 or Transcribe client not initialized. Check AWS credentials and region.")

    print(f"Uploading {filename} to S3 bucket: {bucket}")
    try:
        s3.upload_file(filepath, bucket, filename)
        print(f"Successfully uploaded {filename} to S3.")
    except Exception as e:
        print(f"Failed to upload {filepath} to {bucket}/{filename}: {e}")
        traceback.print_exc()
        raise Exception(f"Failed to upload {filepath} to {bucket}/{filename}: {e}")

    job_name = f"job-{filename.replace('.', '-')}-{int(time.time())}" # Add timestamp to job name to ensure uniqueness
    file_uri = f"s3://{bucket}/{filename}"

    print(f"Starting Transcribe job: {job_name} for {file_uri}")
    try:
        # LanguageCode 'hi-IN' for Hindi. Ensure this is the correct language for your audio.
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': file_uri},
            MediaFormat='mp3',
            IdentifyLanguage=True,  # 🔥 Enables automatic language detection
            # Optional: You can specify a list of languages to limit detection
            # LanguageOptions='en-IN,hi-IN,en-US'
        )
        print(f"Transcribe job {job_name} started successfully.")
    except Exception as e:
        print(f"Failed to start transcription job: {e}")
        traceback.print_exc()
        raise Exception(f"Failed to start transcription job: {e}")

    # Polling for job completion
    while True:
        try:
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status['TranscriptionJob']['TranscriptionJobStatus']
            print(f"Transcription job {job_name} status: {job_status}")
            if job_status in ['COMPLETED', 'FAILED']:
                break
            time.sleep(5) # Wait longer before polling again
        except Exception as e:
            print(f"Error checking transcription job status: {e}")
            traceback.print_exc()
            raise Exception(f"Error checking transcription job status for {job_name}: {e}")

    if job_status == 'COMPLETED':
        transcript_url = status['TranscriptionJob']['Transcript'].get('TranscriptFileUri')
        if not transcript_url:
            raise Exception("TranscriptFileUri not returned by AWS Transcribe for completed job.")

        print(f"Fetching transcription from URL: {transcript_url}")
        try:
            response = requests.get(transcript_url)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            
            result_json = response.json()
            transcripts = result_json.get('results', {}).get('transcripts', [])
            
            if not transcripts:
                print(f"No transcript text found in {json.dumps(result_json, indent=2)}")
                raise Exception("No transcript text found in AWS Transcribe result.")

            final_transcript = transcripts[0]['transcript']
            print(f"Transcription complete: {final_transcript}")
            return final_transcript
        except requests.exceptions.RequestException as req_e:
            print(f"Failed to fetch transcription JSON from URL {transcript_url}: {req_e}")
            traceback.print_exc()
            raise Exception(f"Failed to fetch transcription JSON from URL {transcript_url}: {req_e}")
        except json.JSONDecodeError as json_e:
            print(f"Failed to decode transcription JSON from URL {transcript_url}: {json_e}")
            print(f"Response content: {response.text}")
            traceback.print_exc()
            raise Exception(f"Failed to decode transcription JSON: {json_e}")
        except Exception as e:
            print(f"An unexpected error occurred while processing transcription result: {e}")
            traceback.print_exc()
            raise Exception(f"An unexpected error occurred during transcription result processing: {e}")
    else:
        # If job failed, attempt to get failure reason
        failure_reason = status['TranscriptionJob'].get('FailureReason', 'Unknown failure reason')
        print(f"Transcription job {job_name} failed with status: {job_status}. Reason: {failure_reason}")
        raise Exception(f"Transcription job failed with status: {job_status}. Reason: {failure_reason}")
