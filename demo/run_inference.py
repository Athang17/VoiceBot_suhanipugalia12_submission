import csv
import sys
import os
import time
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from parameters.modules.response_gen import generate_response_bedrock

INPUT_FILE = "test.csv"
OUTPUT_FILE = "suhanipugalia12_output.csv"

def clean_response(question, response):
    """Remove question repetition from response"""
    patterns = [
        f'You asked: "{question}"',
        f'Regarding your question about "{question}"',
        'In response to your question',
        'You wanted to know about',
        'You asked about'
    ]
    for pattern in patterns:
        response = response.replace(pattern, '')
    return response.strip(' \n"\'')

if not os.path.exists(INPUT_FILE):
    raise FileNotFoundError(f"Input file '{INPUT_FILE}' not found")

with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(infile)
    writer = csv.writer(outfile)
    writer.writerow(["Question", "Answer"])  # Two-column format

    for row in reader:
        question = row.get("Question", "").strip()
        if not question:
            writer.writerow(["", ""])
            continue

        try:
            print(f"\nProcessing: {question}")
            raw_response = generate_response_bedrock(question)
            response = clean_response(question, raw_response)
            print(f"Cleaned Response: {response}")
        except Exception as e:
            print(f"Error processing: {question}\n{str(e)}")
            response = "[Error generating response]"
        
        writer.writerow([question, response])
        time.sleep(0.5)  # Rate limiting

print(f"\nSuccess! Output saved to {OUTPUT_FILE}")