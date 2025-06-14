import os
from dotenv import load_dotenv

# Load AWS credentials from /instructions/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../instructions/.env'))

import boto3
import faiss
from sentence_transformers import SentenceTransformer
import numpy as np
import json

S3_BUCKET = 'transcriptfull'
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
THRESHOLD = 0.7

def get_all_json_texts(bucket):
    s3 = boto3.client('s3')
    paginator = s3.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket)
    docs = []
    for page in pages:
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.endswith('.json'):
                response = s3.get_object(Bucket=bucket, Key=key)
                content = response['Body'].read()
                try:
                    data = json.loads(content)
                    if isinstance(data, dict) and 'text' in data:
                        docs.append(data['text'])
                    elif isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict) and 'text' in item:
                                docs.append(item['text'])
                except Exception as e:
                    print(f"Error reading {key}: {e}")
    return docs

def build_faiss_index(embeddings):
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

def is_finance_question(question):
    finance_keywords = [
        'finance', 'investment', 'stock', 'bank', 'loan', 'equity', 'debt', 'market',
        'interest', 'rate', 'capital', 'fund', 'portfolio', 'asset', 'liability'
    ]
    q = question.lower()
    return any(word in q for word in finance_keywords)

def call_claude(question):
    # Replace this with actual Claude API call
    return f"[Claude] Sorry, I couldn't find an answer in the database. Here's a finance-related response for: '{question}'"

class Retriever:
    def __init__(self):
        print("Loading documents from S3...")
        self.model = SentenceTransformer(EMBEDDING_MODEL)
        self.docs = get_all_json_texts(S3_BUCKET)
        if not self.docs:
            raise Exception("No documents found in the S3 bucket.")
        print(f"Loaded {len(self.docs)} documents.")
        print("Embedding documents...")
        self.embeddings = self.model.encode(self.docs, convert_to_numpy=True)
        print("Building FAISS index...")
        self.index = build_faiss_index(self.embeddings)
        print("Retriever ready.")

retriever = None

def get_retriever():
    global retriever
    if retriever is None:
        retriever = Retriever()
    return retriever

def generate_response_bedrock(question, detected_lang=None):
    r = get_retriever()
    q_emb = r.model.encode([question], convert_to_numpy=True)
    D, I = r.index.search(q_emb, k=1)
    if D[0][0] < THRESHOLD:
        return r.docs[I[0][0]]
    elif is_finance_question(question):
        return call_claude(question)
    else:
        return "Sorry, I can only answer finance-related questions."