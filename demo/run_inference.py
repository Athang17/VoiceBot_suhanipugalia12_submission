import csv
import sys
import os
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from parameters.modules.response_gen import generate_response_bedrock

INPUT_FILE = "test.csv"
OUTPUT_FILE = "output.csv"

with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(infile)
    writer = csv.writer(outfile)
    writer.writerow(["Response"])  # As per hackathon spec

    for row in reader:
        question = row.get("Question", "")
        if not question.strip():
            writer.writerow([""])
            continue

        try:
            print(f"Processing: {question}")
            response = generate_response_bedrock(question)
            print(f"Response: {response}")
        except Exception as e:
            response = f"Error: {e}"
            print(response)
        writer.writerow([response])
        time.sleep(2)