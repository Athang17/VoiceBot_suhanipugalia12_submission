import csv
import sys
import os
import time
import traceback

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from parameters.modules.response_gen import generate_response_bedrock

INPUT_FILE = "test.csv"
OUTPUT_FILE = "suhanipugalia12_output.csv"

if not os.path.exists(INPUT_FILE):
    raise FileNotFoundError(f"Input file '{INPUT_FILE}' not found")

with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:

    # 🔴 KEY CHANGE: Use csv.reader (not DictReader) to get raw rows
    reader = csv.reader(infile)
    headers = next(reader)  # Read the header row
    
    # Use first column as questions (regardless of header name)
    question_col_index = 0  
    question_header = headers[question_col_index] if headers else "Question"
    
    writer = csv.DictWriter(outfile, fieldnames=["Question", "Response"])
    writer.writeheader()

    for row in reader:
        question = row[question_col_index].strip() if row else ""
        
        if not question:
            writer.writerow({"Question": "", "Response": ""})
            continue

        try:
            print(f"Processing: {question}")
            response = generate_response_bedrock(question)
            print(f"Response: {response}")
        except Exception as e:
            print(f"Error processing: {question}\n{traceback.format_exc()}")
            response = f"[Error: {str(e)}]"
        
        writer.writerow({
            "Question": question,
            "Response": response
        })
        time.sleep(0.5)

print(f"Output saved to {OUTPUT_FILE}")