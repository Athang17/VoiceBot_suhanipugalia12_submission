# import boto3
# import os

# def download_all_json_from_s3(bucket, local_folder):
#     s3 = boto3.client('s3')
#     os.makedirs(local_folder, exist_ok=True)
#     paginator = s3.get_paginator('list_objects_v2')
#     for page in paginator.paginate(Bucket=bucket):
#         for obj in page.get('Contents', []):
#             key = obj['Key']
#             if key.endswith('.json'):
#                 local_path = os.path.join(local_folder, os.path.basename(key))
#                 s3.download_file(bucket, key, local_path)
#                 print(f"Downloaded {key} to {local_path}")

# # Usage
# download_all_json_from_s3('transcriptfull', './local_jsons')
# import json
# import os

# input_file = "sample.json"  # Your original file
# output_file = "converted_sample.json"  # Output file for RAG

# with open(input_file, "r", encoding="utf-8") as f:
#     data = json.load(f)

# # Concatenate all segment texts
# full_text = " ".join(seg["text"] for seg in data.get("segments", []))

# # Write to new JSON file
# with open(output_file, "w", encoding="utf-8") as f:
#     json.dump({"text": full_text}, f, ensure_ascii=False, indent=2)

# print(f"Converted {input_file} -> {output_file}")
# import boto3
# import json
# import os
# import re
# from transformers import pipeline

# # Setup AWS S3 client
# s3 = boto3.client('s3')
# bucket_name = "transcriptfull"
# prefix = "video/"
# output_dir = "summaries"
# os.makedirs(output_dir, exist_ok=True)

# # Setup sentiment analysis pipeline
# sentiment_analyzer = pipeline("sentiment-analysis")

# # Convert AWS Transcribe JSON to summary format
# def generate_summary(json_data):
#     segments = json_data.get("results", {}).get("audio_segments", [])
#     full_transcript = " ".join([seg.get("transcript", "") for seg in segments]).strip()

#     sentiment = sentiment_analyzer(full_transcript[:512])[0]['label']
#     sentiment_mapped = {
#         "POSITIVE": "Positive",
#         "NEGATIVE": "Negative"
#     }.get(sentiment.upper(), "Neutral")

#     questions = re.findall(r'[^.?!]*\?[^.?!]*', full_transcript)
#     concerns_keywords = ["concern", "problem", "issue", "doubt", "confused"]
#     has_concern = any(kw in full_transcript.lower() for kw in concerns_keywords)

#     summary = {
#         "1. Summary of the conversation": full_transcript,
#         "2. Customer concerns": "Some concerns mentioned." if has_concern else "No explicit concerns mentioned.",
#         "3. Questions asked": questions or ["No specific questions asked."],
#         "4. Overall sentiment": sentiment_mapped
#     }

#     return summary

# # Process and save only summary from each file
# def process_transcripts():
#     response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
#     if 'Contents' not in response:
#         print("No files found.")
#         return

#     for obj in response['Contents']:
#         key = obj['Key']
#         if not key.endswith('.json'):
#             continue

#         # Read JSON content directly from S3
#         response_obj = s3.get_object(Bucket=bucket_name, Key=key)
#         transcript_data = json.loads(response_obj['Body'].read().decode('utf-8'))

#         summary = generate_summary(transcript_data)

#         summary_filename = os.path.basename(key).replace('.json', '_summary.json')
#         summary_path = os.path.join(output_dir, summary_filename)

#         with open(summary_path, 'w', encoding='utf-8') as f:
#             json.dump(summary, f, indent=4, ensure_ascii=False)

#         print(f"✅ Summary saved: {summary_path}")

# if __name__ == "__main__":
#     process_transcripts()
import boto3
import re
import json
import os

# --- Configuration ---
bucket_name = 'transcriptfull'
prefix = 'summaries/'  # Folder path in the bucket
local_output_dir = 'converted_jsons'
os.makedirs(local_output_dir, exist_ok=True)

# --- Connect to S3 ---
s3 = boto3.client('s3')

# --- List text files in the prefix ---
response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
files = [obj['Key'] for obj in response.get('Contents', []) if obj['Key'].endswith('.txt')]

# --- Regex patterns to extract fields ---
patterns = {
    'summary': r'\*\*1\. Summary of the conversation:\*\*\s*(.*?)(?=\*\*2\.|$)',
    'customer_concerns': r'\*\*2\. Customer concerns:\*\*\s*(.*?)(?=\*\*3\.|$)',
    'questions_asked': r'\*\*3\. Questions asked:\*\*\s*(.*?)(?=\*\*4\.|$)',
    'overall_sentiment': r'\*\*4\. Overall sentiment:\*\*\s*(.*)'
}

# --- Process each file ---
for key in files:
    filename = os.path.basename(key)
    file_obj = s3.get_object(Bucket=bucket_name, Key=key)
    text = file_obj['Body'].read().decode('utf-8')

    # Extract fields
    extracted = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, text, re.DOTALL)
        if match:
            extracted[field] = match.group(1).strip()

    # Save JSON locally
    json_filename = filename.replace('.txt', '.json')
    with open(os.path.join(local_output_dir, json_filename), 'w', encoding='utf-8') as f:
        json.dump(extracted, f, indent=4)

    print(f"Saved: {json_filename}")