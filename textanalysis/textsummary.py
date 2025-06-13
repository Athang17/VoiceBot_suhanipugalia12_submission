import os
import json
import boto3
from tqdm import tqdm
from datetime import datetime

# === Config ===
SUMMARY_FILE = "overall_summary.txt"
CURRENT_FILE = "current_summary.txt"
RAW_RESPONSE_FILE = "bedrock_raw_response.json"
MERGED_SUMMARY_FILE = "merged_summary.txt"

# === Utility Functions ===

def get_json_files(directory):
    return [f for f in os.listdir(directory) if f.lower().endswith(".json")]

def extract_conversation_text(json_path):
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        segments = data.get("segments", [])
        return "\n".join(f"{seg['speaker_id']}: {seg['text']}" for seg in segments)
    except Exception as e:
        print(f"❌ Failed to parse {json_path}: {e}")
        return ""

def already_logged_in_overall(file_name):
    if not os.path.exists(SUMMARY_FILE):
        return False
    with open(SUMMARY_FILE, 'r', encoding='utf-8') as f:
        return f"File: {file_name}" in f.read()

def analyze_text_with_bedrock(transcript_text):
    bedrock_client = boto3.client("bedrock-runtime", region_name="us-west-2")

    prompt = f"""
You are an AI assistant. Analyze the following customer service conversation and extract details in this structured format:

**1. Summary of the conversation:**
(Summarize the main idea in 3-5 sentences. Mention who is speaking, what platform/product they represent, and the nature of the conversation.)

**2. Customer concerns:**
(List any expressed concerns, even if indirect, in bullet points. If none, mention it clearly.)

**3. Questions asked:**
(List specific questions the customer asked in bullet points. If none, mention it clearly.)

**4. Overall sentiment:**
(Choose from: Positive / Neutral / Negative. Add a 1-line explanation.)

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
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps(payload)
        )

        response_body = response["body"].read().decode("utf-8")

        with open(RAW_RESPONSE_FILE, "w", encoding="utf-8") as f:
            f.write(response_body)

        response_json = json.loads(response_body)
        content_list = response_json.get("content", []) or response_json.get("message", {}).get("content", [])

        if isinstance(content_list, list):
            summary = "\n".join(item.get("text", "") for item in content_list if item.get("type") == "text").strip()
            return summary if summary else "[❗ No summary returned from Bedrock]"
        return "[❗ Unexpected response format from Bedrock]"

    except Exception as e:
        return f"[❌ Bedrock error: {str(e)}]"

def save_summary_files(summary, file_name):
    if not summary.strip():
        summary = "[❗ No summary returned from Bedrock]"

    with open(os.path.splitext(file_name)[0] + "_summary.txt", 'w', encoding='utf-8') as f:
        f.write(summary)

    with open(CURRENT_FILE, "w", encoding="utf-8") as f:
        f.write(summary)

def append_to_overall_summary_if_needed(summary, file_name):
    if already_logged_in_overall(file_name):
        print(f"⏭️ Skipping '{file_name}' in overall_summary.txt (already exists)")
        return
    with open(SUMMARY_FILE, "a", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write(f"File: {file_name}\n")
        f.write(f"Timestamp: {datetime.now()}\n\n")
        f.write(summary.strip() + "\n\n")

def append_to_merged_summary(summary_list):
    with open(MERGED_SUMMARY_FILE, "w", encoding="utf-8") as f:
        merged = "\n\n".join(summary_list)
        f.write(merged)

# === Main Runner ===

def process_transcripts(directory="."):
    json_files = get_json_files(directory)
    all_summaries = []

    with tqdm(total=len(json_files), desc="Processing transcripts") as pbar:
        for file in json_files:
            full_path = os.path.join(directory, file)
            transcript_text = extract_conversation_text(full_path)

            if not transcript_text.strip():
                pbar.set_postfix_str(f"❌ Empty or invalid: {file}")
                pbar.update(1)
                continue

            summary = analyze_text_with_bedrock(transcript_text)

            save_summary_files(summary, file)

            if "❌" not in summary and "[❗" not in summary:
                append_to_overall_summary_if_needed(summary, file)
                all_summaries.append(summary)

            pbar.set_postfix_str(f"✅ Processed: {file}")
            pbar.update(1)

    append_to_merged_summary(all_summaries)

# === Run the script ===
if __name__ == "__main__":
    process_transcripts()
