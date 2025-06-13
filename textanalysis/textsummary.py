import os
import boto3
import json
from tqdm import tqdm

def get_json_files(directory):
    """Get all .json files in the given directory."""
    return [f for f in os.listdir(directory) if f.lower().endswith('.json')]

def should_process_file(file_path):
    """Check if the file should be processed (i.e., no corresponding _summary.txt file exists)."""
    summary_path = os.path.splitext(file_path)[0] + '_summary.txt'
    return not os.path.exists(summary_path)

def extract_conversation_text(json_path):
    """Extract text from 'segments' in the JSON file."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        segments = data.get("segments", [])
        return "\n".join([f"{seg['speaker_id']}: {seg['text']}" for seg in segments])
    except Exception as e:
        print(f"Failed to parse {json_path}: {e}")
        return ""

def analyze_text_with_bedrock(transcript_text):
    """Analyze the text using Amazon Bedrock Claude model."""
    bedrock_client = boto3.client('bedrock-runtime')

    prompt = f"""
You are an AI assistant. Analyze the following call transcript. Extract key points, concerns, questions asked, and sentiment of the customer. Present your output as a summary in plain English.

Transcript:
{transcript_text}
"""

    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}]
            }
        ],
        "max_tokens": 1000,
        "anthropic_version": "bedrock-2023-05-31"
    }

    try:
        response = bedrock_client.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            contentType='application/json',
            accept='application/json',
            body=json.dumps(payload)
        )

        response_body = response['body'].read().decode('utf-8')
        response_json = json.loads(response_body)

        analysis = response_json.get('message', {}).get('content', 'No summary generated.')

        if analysis == 'No summary generated.':
            analysis = response_body  # fallback

        return analysis

    except Exception as e:
        print(f"Error analyzing text with Bedrock: {e}")
        return "Error occurred during analysis."

def save_analysis_to_file(analysis, file_path):
    """Save the analysis to a file with '_summary.txt' suffix."""
    summary_path = os.path.splitext(file_path)[0] + '_summary.txt'
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(analysis)

def process_jsons_in_directory(directory):
    """Process all .json transcript files in the given directory."""
    json_files = get_json_files(directory)

    with tqdm(total=len(json_files), desc="Processing transcripts") as pbar:
        for json_file in json_files:
            json_path = os.path.join(directory, json_file)

            if should_process_file(json_path):
                pbar.set_postfix({'Current file': json_file})
                transcript_text = extract_conversation_text(json_path)

                if transcript_text.strip():
                    analysis = analyze_text_with_bedrock(transcript_text)
                    save_analysis_to_file(analysis, json_path)

            pbar.update(1)

# Run this on your desired directory
directory = '.'  # Current directory or replace with your path
process_jsons_in_directory(directory)
