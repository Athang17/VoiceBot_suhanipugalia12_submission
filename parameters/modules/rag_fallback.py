# parameters/modules/rag_fallback.py
import os
import json
import glob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

LOCAL_JSON_FOLDER = os.path.join(os.path.dirname(__file__), "local_jsons")

def search_local_knowledge(query, threshold=0.5):
    texts = []
    file_map = []

    for filepath in glob.glob(os.path.join(LOCAL_JSON_FOLDER, "*.json")):
        with open(filepath, encoding='utf-8') as f:
            try:
                data = json.load(f)
                for seg in data.get("segments", []):
                    if isinstance(seg.get("text"), str):
                        texts.append(seg["text"])
                        file_map.append((filepath, seg["text"]))
            except Exception as e:
                print(f"Error reading {filepath}: {e}")

    if not texts:
        return None

    # TF-IDF Vectorization
    vectorizer = TfidfVectorizer().fit(texts + [query])
    vectors = vectorizer.transform(texts + [query])
    similarities = cosine_similarity(vectors[-1], vectors[:-1]).flatten()

    best_idx = similarities.argmax()
    best_score = similarities[best_idx]

    if best_score >= threshold:
        return texts[best_idx]  # return matched text
    else:
        return None
