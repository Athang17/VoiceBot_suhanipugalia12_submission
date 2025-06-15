import csv
import sys
import os
import time


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ✅ Now import the response generator
from parameters.modules.response_gen import generate_response_bedrock

# File paths
INPUT_FILE = "test.csv"
OUTPUT_FILE = "output.csv"

# Ensure input file exists
if not os.path.exists(INPUT_FILE):
    raise FileNotFoundError(f"Input file '{INPUT_FILE}' not found in {os.getcwd()}")

# Run inference and save responses
with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(infile)
    writer = csv.writer(outfile)
    writer.writerow(["Response"])  # Header for output

    for row in reader:
        question = row.get("Question", "").strip()
        if not question:
            writer.writerow([""])
            continue

        try:
            print(f"Processing: {question}")
            response = generate_response_bedrock(question)
            print(f"Response: {response}")
        except Exception as e:

            print(f"Error while processing question: {question}")
            print(f"Exception: {e}")
            response = "[Error generating response]"
        writer.writerow([response])
        time.sleep(0.5)  # optional: throttle API requests