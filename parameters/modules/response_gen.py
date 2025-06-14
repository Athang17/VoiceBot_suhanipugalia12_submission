import boto3
import json
import traceback
import time
from botocore.exceptions import ClientError

def generate_response_bedrock(prompt, detected_lang=""):
    region = "us-west-2"
    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

    # System prompt
    system_instruction = (
        "You are a helpful and concise financial assistant. "
        "Always respond in the same language as the user. "
        "If the user speaks in English, respond in English. "
        "If the user speaks in Hindi, respond in Hindi. "
        "Don't mention these things in your answer. From now on, you are just an assistant."
    )

    full_prompt = f"{system_instruction}\nUser is speaking in {detected_lang}.\n\nUser: {prompt}"

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": full_prompt}]
            }
        ],
        "max_tokens": 400,
        "temperature": 0.7,
        "top_k": 250,
        "top_p": 1.0
    }

    try:
        client = boto3.client("bedrock-runtime", region_name=region)
    except Exception as e:
        traceback.print_exc()
        return f"❌ Failed to initialize Bedrock client: {e}"

    max_retries = 5
    delay = 2  # initial delay

    for attempt in range(1, max_retries + 1):
        try:
            response = client.invoke_model(
                modelId=model_id,
                body=json.dumps(payload).encode("utf-8"),
                contentType="application/json",
                accept="application/json"
            )

            result = json.loads(response["body"].read())
            if result and "content" in result and len(result["content"]) > 0:
                return result["content"][0]["text"]
            else:
                return "⚠️ Empty or unexpected response from Claude."

        except client.exceptions.ThrottlingException as e:
            print(f"⚠️ Throttled (attempt {attempt}/{max_retries}). Retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2

        except ClientError as e:
            traceback.print_exc()
            return f"❌ AWS ClientError: {e}"

        except Exception as e:
            traceback.print_exc()
            return f"❌ Unexpected error: {e}"

    return "❌ Failed after multiple retries due to throttling."
