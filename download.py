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
import json
import os

input_file = "sample.json"  # Your original file
output_file = "converted_sample.json"  # Output file for RAG

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

# Concatenate all segment texts
full_text = " ".join(seg["text"] for seg in data.get("segments", []))

# Write to new JSON file
with open(output_file, "w", encoding="utf-8") as f:
    json.dump({"text": full_text}, f, ensure_ascii=False, indent=2)

print(f"Converted {input_file} -> {output_file}")