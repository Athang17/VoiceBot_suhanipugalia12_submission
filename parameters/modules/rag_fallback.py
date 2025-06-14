import os
import json
import glob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Define folders to search for fallback answers
BASE_DIR = os.path.dirname(__file__)
FOLDERS = [
    os.path.join(BASE_DIR, "converted_jsons"),
    os.path.join(BASE_DIR, "summaries"),
    os.path.join(BASE_DIR, "auto_cached_jsons")  # Cached Claude responses
]

def extract_texts_from_file(filepath):
    try:
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)
            extracted = []

            # Convert various expected structures to flat list of strings
            for key, val in data.items():
                if isinstance(val, str):
                    extracted.append(val)
                elif isinstance(val, list):
                    extracted.extend([item for item in val if isinstance(item, str)])

            return extracted
    except Exception as e:
        print(f"Failed to read {filepath}: {e}")
        return []

def search_local_knowledge(query, threshold=0.92):
    all_texts = []
    text_meta = []  # stores (filepath, original_text, field, full_data)

    for folder in FOLDERS:
        if not os.path.exists(folder):
            continue
        for filepath in glob.glob(os.path.join(folder, "*.json")):
            try:
                with open(filepath, encoding='utf-8') as f:
                    data = json.load(f)
                    for key, val in data.items():
                        if isinstance(val, str):
                            all_texts.append(val)
                            text_meta.append((filepath, val, key, data))
                        elif isinstance(val, list):
                            for item in val:
                                if isinstance(item, str):
                                    all_texts.append(item)
                                    text_meta.append((filepath, item, key, data))
            except Exception as e:
                print(f"Failed to read {filepath}: {e}")

    if not all_texts:
        print("No usable local knowledge found.")
        return None

    try:
        vectorizer = TfidfVectorizer().fit(all_texts + [query])
        vectors = vectorizer.transform(all_texts + [query])
        similarities = cosine_similarity(vectors[-1], vectors[:-1]).flatten()

        best_idx = similarities.argmax()
        best_score = similarities[best_idx]
        matched_text = all_texts[best_idx]
        filepath, original_text, key, full_data = text_meta[best_idx]

        print(f"Best local match score: {best_score:.3f}")

        if best_score >= threshold:
            print(f"Reusing cached/local answer (score {best_score:.3f})")

            # Special handling for cached Claude JSON format
            if key == "original_question" and "answer" in full_data:
                return full_data["answer"]

            return matched_text

    except Exception as e:
        print(f"RAG vectorization failed: {e}")

    return None