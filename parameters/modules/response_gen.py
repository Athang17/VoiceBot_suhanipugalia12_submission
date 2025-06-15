import os
from dotenv import load_dotenv

# Load AWS credentials from /instructions/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../instructions/.env'))

import boto3
import faiss
from sentence_transformers import SentenceTransformer
import numpy as np
import json
# <<<<<<< HEAD

# S3_BUCKET = 'transcriptfull'
# EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
# THRESHOLD = 0.7

# def get_all_json_texts(bucket):
#     s3 = boto3.client('s3')
#     paginator = s3.get_paginator('list_objects_v2')
#     pages = paginator.paginate(Bucket=bucket)
#     docs = []
#     for page in pages:
#         for obj in page.get('Contents', []):
#             key = obj['Key']
#             if key.endswith('.json'):
#                 response = s3.get_object(Bucket=bucket, Key=key)
#                 content = response['Body'].read()
#                 try:
#                     data = json.loads(content)
#                     if isinstance(data, dict) and 'text' in data:
#                         docs.append(data['text'])
#                     elif isinstance(data, list):
#                         for item in data:
#                             if isinstance(item, dict) and 'text' in item:
#                                 docs.append(item['text'])
#                 except Exception as e:
#                     print(f"Error reading {key}: {e}")
#     return docs

# def build_faiss_index(embeddings):
#     dim = embeddings.shape[1]
#     index = faiss.IndexFlatL2(dim)
#     index.add(embeddings)
#     return index

# def is_finance_question(question):
#     finance_keywords = [
#         'finance', 'investment', 'stock', 'bank', 'loan', 'equity', 'debt', 'market',
#         'interest', 'rate', 'capital', 'fund', 'portfolio', 'asset', 'liability'
#     ]
#     q = question.lower()
#     return any(word in q for word in finance_keywords)

# def call_claude(question):
#     # Replace this with actual Claude API call
#     return f"[Claude] Sorry, I couldn't find an answer in the database. Here's a finance-related response for: '{question}'"

# class Retriever:
#     def __init__(self):
#         print("Loading documents from S3...")
#         self.model = SentenceTransformer(EMBEDDING_MODEL)
#         self.docs = get_all_json_texts(S3_BUCKET)
#         if not self.docs:
#             raise Exception("No documents found in the S3 bucket.")
#         print(f"Loaded {len(self.docs)} documents.")
#         print("Embedding documents...")
#         self.embeddings = self.model.encode(self.docs, convert_to_numpy=True)
#         print("Building FAISS index...")
#         self.index = build_faiss_index(self.embeddings)
#         print("Retriever ready.")

# retriever = None

# def get_retriever():
#     global retriever
#     if retriever is None:
#         retriever = Retriever()
#     return retriever

# def generate_response_bedrock(question, detected_lang=None):
#     r = get_retriever()
#     q_emb = r.model.encode([question], convert_to_numpy=True)
#     D, I = r.index.search(q_emb, k=1)
#     if D[0][0] < THRESHOLD:
#         return r.docs[I[0][0]]
#     elif is_finance_question(question):
#         return call_claude(question)
#     else:
#         return "Sorry, I can only answer finance-related questions."
# =======
import traceback
import time
import datetime
import uuid
import os
from typing import List, Dict, Optional

from dotenv import load_dotenv
load_dotenv()

from botocore.exceptions import ClientError
from parameters.modules.rag_fallback import search_local_knowledge
from parameters.modules.context_manager import ConversationContext

AUTO_CACHE_FOLDER = os.path.join(os.path.dirname(__file__), "auto_cached_jsons")
os.makedirs(AUTO_CACHE_FOLDER, exist_ok=True)

chat_context = ConversationContext()

def save_claude_response_to_cache(question: str, answer: str) -> None:
    """Save successful responses to local cache for future reference."""
    try:
        payload = {
            "source": "auto_cache",
            "original_question": question,
            "answer": answer,
            "timestamp": datetime.datetime.now().isoformat()
        }
        filename = f"{uuid.uuid4()}.json"
        filepath = os.path.join(AUTO_CACHE_FOLDER, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved Claude answer to cache: {filepath}")
    except Exception as e:
        print(f"⚠️ Failed to save response to cache: {e}")

def validate_message_content(message: Dict) -> bool:
    """Validate that a message has non-empty content."""
    if not isinstance(message, dict):
        return False
    if 'content' not in message:
        return False
    if not message['content'] or not str(message['content']).strip():
        return False
    return True

def clean_messages(messages: List[Dict]) -> List[Dict]:
    """Remove invalid or empty messages from the conversation history."""
    return [msg for msg in messages if validate_message_content(msg)]

def generate_response_bedrock(
    prompt: str, 
    session_id: str = "default", 
    detected_lang: str = ""
) -> str:
    """Generate response using Amazon Bedrock with enhanced error handling."""
    region = "us-west-2"
    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

    # 1. First try local knowledge base
    local_answer = search_local_knowledge(prompt)
    if local_answer:
        print("✅ Local answer used (matched with high confidence)")
        chat_context.add_turn(session_id, "user", prompt)
        chat_context.add_turn(session_id, "assistant", local_answer)
        chat_context.save_session(session_id)
        return local_answer

    # 2. Load and validate conversation context
    chat_context.load_session(session_id)
    chat_context.add_turn(session_id, "user", prompt)
    
    raw_messages = chat_context.get_messages(session_id)
    messages = clean_messages(raw_messages)
    
    if not messages:
        error_msg = "⚠️ No valid messages in conversation history."
        print(error_msg)
        return error_msg

    # 3. Prepare payload with validation
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.7,
        "top_k": 250,
        "top_p": 1.0
    }

    # 4. Initialize client with error handling
    try:
        client = boto3.client(
            "bedrock-runtime", 
            region_name=region,
            config=boto3.session.Config(
                connect_timeout=10,
                read_timeout=30,
                retries={'max_attempts': 3}
            )
        )
    except Exception as e:
        error_msg = f"❌ Failed to initialize Bedrock client: {e}"
        traceback.print_exc()
        return error_msg

    # 5. Attempt API call with retries
    for attempt in range(3):
        try:
            response = client.invoke_model(
                modelId=model_id,
                body=json.dumps(payload).encode("utf-8"),
                contentType="application/json",
                accept="application/json"
            )

            result = json.loads(response["body"].read())

            if not result or "content" not in result or not result["content"]:
                return "⚠️ Claude returned an empty response."

            answer = result["content"][0].get("text", "").strip()
            if not answer:
                return "⚠️ Claude returned empty text content."

            # Save successful response
            chat_context.add_turn(session_id, "assistant", answer)
            chat_context.save_session(session_id)
            save_claude_response_to_cache(prompt, answer)
            
            return answer

        except client.exceptions.ThrottlingException:
            wait_time = 2 * (attempt + 1)
            print(f"⏳ Throttled, retrying in {wait_time} seconds...")
            time.sleep(wait_time)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'ValidationException':
                print("⚠️ Validation error with payload:", json.dumps(payload, indent=2))
                return "⚠️ I had trouble processing that request. Please try rephrasing."
            traceback.print_exc()
            return f"❌ AWS Error: {str(e)}"
        except Exception as e:
            traceback.print_exc()
            return f"❌ Unexpected error: {str(e)}"

    # 6. Final fallback if all retries fail
    fallback_msg = (
        "I'm experiencing high demand right now. "
        "Please try again in a moment or rephrase your question."
    )
    return fallback_msg
# >>>>>>> 722eea07fb020b3a6ab6b0783b1676745b14b7b5
