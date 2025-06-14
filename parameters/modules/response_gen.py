import boto3
import json
import traceback
import time
import datetime
import uuid
import os

from dotenv import load_dotenv
load_dotenv()

from botocore.exceptions import ClientError
from parameters.modules.rag_fallback import search_local_knowledge
from parameters.modules.context_manager import ConversationContext

AUTO_CACHE_FOLDER = os.path.join(os.path.dirname(__file__), "auto_cached_jsons")
os.makedirs(AUTO_CACHE_FOLDER, exist_ok=True)

chat_context = ConversationContext()

def save_claude_response_to_cache(question, answer):
    payload = {
        "source": "auto_cache",
        "original_question": question,
        "answer": answer,
        "timestamp": datetime.datetime.now().isoformat()
    }
    filename = f"{uuid.uuid4()}.json"
    filepath = os.path.join(AUTO_CACHE_FOLDER, filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved Claude answer to cache: {filepath}")
    except Exception as e:
        print(f"⚠️ Failed to save response: {e}")

def generate_response_bedrock(prompt, session_id="default", detected_lang=""):
    region = "us-west-2"
    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

    # 🔄 Load context at start of session
    chat_context.load_session(session_id)

    # Try fallback answer
    local_answer = search_local_knowledge(prompt)
    if local_answer:
        print("✅ Local answer used (matched with high confidence)")
        chat_context.add_turn(session_id, "user", prompt)
        chat_context.add_turn(session_id, "assistant", local_answer)
        chat_context.save_session(session_id)
        return local_answer

    # Add user prompt to history
    chat_context.add_turn(session_id, "user", prompt)
    messages = chat_context.get_messages(session_id)

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": messages,
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

    for attempt in range(5):
        try:
            response = client.invoke_model(
                modelId=model_id,
                body=json.dumps(payload).encode("utf-8"),
                contentType="application/json",
                accept="application/json"
            )

            result = json.loads(response["body"].read())

            if result and "content" in result and len(result["content"]) > 0:
                answer = result["content"][0]["text"]
                chat_context.add_turn(session_id, "assistant", answer)
                chat_context.save_session(session_id)
                save_claude_response_to_cache(prompt, answer)
                return answer
            else:
                return "⚠️ Claude returned an empty or invalid response."

        except client.exceptions.ThrottlingException:
            time.sleep(2 * (attempt + 1))
        except ClientError as e:
            traceback.print_exc()
            return f"❌ AWS ClientError: {e}"
        except Exception as e:
            traceback.print_exc()
            return f"❌ Unexpected error: {e}"

    return "❌ Failed after multiple retries due to throttling."