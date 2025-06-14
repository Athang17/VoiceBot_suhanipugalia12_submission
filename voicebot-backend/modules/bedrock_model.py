import boto3
import json
import traceback

def generate_response_bedrock(prompt):
    region = "us-west-2"
    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

    # Prepend system prompt inside the user message
    system_instruction = (
        "You are a helpful and concise financial assistant. "
        "Always reply in the same language as the user (Hindi or English)."
    )

    full_prompt = f"{system_instruction}\n\nUser: {prompt}"

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
        response = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload).encode("utf-8"),
            contentType="application/json",
            accept="application/json"
        )

        result = json.loads(response["body"].read())
        return result["content"][0]["text"]

    except Exception as e:
        traceback.print_exc()
        return f"Error calling Claude 3.5: {e}"
