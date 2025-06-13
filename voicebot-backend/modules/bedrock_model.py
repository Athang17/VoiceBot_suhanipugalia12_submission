# modules/bedrock_model.py
import boto3
import json
import traceback # Import traceback for detailed error logging

def generate_response_bedrock(prompt):
    """
    Invokes the Claude 3.5 Sonnet model on AWS Bedrock to generate a response
    based on the given prompt.

    Args:
        prompt (str): The text prompt to send to the AI model.

    Returns:
        str: The generated text response from the AI model.
        str: An error message if the invocation fails.
    """
    # Initialize the Bedrock runtime client
    # Ensure your AWS credentials (e.g., via environment variables or IAM role)
    # are configured for the region.
    region = "us-west-2" # Ensure this matches your Bedrock model region
    print(f"Initializing Bedrock client in region: {region}")
    try:
        client = boto3.client("bedrock-runtime", region_name=region)
    except Exception as e:
        print(f"Error initializing Bedrock client: {e}")
        traceback.print_exc()
        return f"Error initializing Bedrock client: {e}"

    # Define the payload for the Claude 3.5 Sonnet model (Anthropic Messages API)
    # https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html
    payload = {
        "anthropic_version": "bedrock-2023-05-31", # Mandatory for Messages API
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}] # Content must be an array of objects
            }
        ],
        "max_tokens": 400, # Maximum number of tokens to generate in the response
        "temperature": 0.7, # Controls randomness (0.0-1.0), higher means more creative
        "top_k": 250, # Consider the top K most likely next tokens
        "top_p": 1.0 # Nucleus sampling: consider tokens whose cumulative probability exceeds p
    }
    # Model ID for Claude 3.5 Sonnet (ensure this model is enabled in your AWS Bedrock console)
    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0" # Updated to Claude 3.5 Sonnet

    print(f"Attempting to invoke model: {model_id} with prompt: {prompt[:100]}...") # Log part of prompt

    try:
        response = client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload).encode("utf-8"), # Payload must be a JSON string bytes
            contentType="application/json", # Specify content type
            accept="application/json" # Specify accepted response type
        )

        # Read and parse the response body
        response_body = response["body"].read().decode("utf-8")
        result = json.loads(response_body)

        # Extract the text content from the response
        # Claude Messages API response structure:
        # { "content": [ { "type": "text", "text": "Generated response..." } ] }
        if result and "content" in result and len(result["content"]) > 0 and "text" in result["content"][0]:
            generated_text = result["content"][0]["text"]
            print("Successfully received and parsed response from Bedrock.")
            return generated_text
        else:
            print(f"Unexpected response structure from Bedrock: {json.dumps(result, indent=2)}")
            return f"Error: Unexpected response structure from Claude 3.5. Full response: {json.dumps(result)}"

    except client.exceptions.ModelNotFoundException:
        print(f"Error: The model '{model_id}' was not found. Please ensure it's enabled in your Bedrock console.")
        traceback.print_exc()
        return f"Error: Model '{model_id}' not found or not enabled in your AWS account for region {region}."
    except client.exceptions.ValidationException as ve:
        print(f"Error: Validation Exception during Bedrock invocation: {ve}")
        print("Please check your payload and model parameters.")
        traceback.print_exc()
        return f"Error: Bedrock validation failed: {ve}"
    except client.exceptions.ServiceQuotaExceededException as sqe:
        print(f"Error: Service Quota Exceeded Exception: {sqe}")
        print("You might have hit a rate limit or concurrent inference limit.")
        traceback.print_exc()
        return f"Error: Bedrock service quota exceeded: {sqe}"
    except client.exceptions.ThrottlingException as te:
        print(f"Error: Throttling Exception: {te}")
        print("Request was throttled. Try again later or reduce request rate.")
        traceback.print_exc()
        return f"Error: Bedrock request throttled: {te}"
    except Exception as e:
        print(f"An unexpected error occurred during Bedrock invocation: {e}")
        traceback.print_exc() # Print full traceback for any other exceptions
        return f"Error calling Claude 3.5: {e}"

