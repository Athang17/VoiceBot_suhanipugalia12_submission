import boto3
import json

import boto3
import json

def generate_response_bedrock(prompt):
    client = boto3.client("bedrock-runtime", region_name="us-west-2")

    body = {
        "inputText": prompt,
        "textGenerationConfig": {
            "maxTokenCount": 400,
            "temperature": 0.7,
            "topP": 1,
            "stopSequences": []
        }
    }

    try:
        response = client.invoke_model(
            modelId="amazon.titan-tg1-large",
            body=json.dumps(body).encode("utf-8"),
            contentType="application/json",
            accept="application/json"
        )
        result = json.loads(response["body"].read())
        return result["results"][0]["outputText"]
    except Exception as e:
        return f"Error calling Titan: {e}"
