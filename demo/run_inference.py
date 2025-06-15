import csv
import sys
import os
import time
import traceback

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import the response generator
from parameters.modules.response_gen import generate_response_bedrock

# File paths
INPUT_FILE = "test.csv"
OUTPUT_FILE = "suhanipugalia12_output.csv"  # Changed output filename

# Ensure input file exists
if not os.path.exists(INPUT_FILE):
    raise FileNotFoundError(f"Input file '{INPUT_FILE}' not found in {os.getcwd()}")

# Run inference and save responses
with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(infile)
    # Changed to include both Question and Response columns
    writer = csv.DictWriter(outfile, fieldnames=["Question", "Response"])
    writer.writeheader()  # Write the header row

    for row in reader:
        question = row.get("Question", "").strip()
        if not question:
            # Write empty row with both columns if no question
            writer.writerow({"Question": "", "Response": ""})
            continue

        try:
            print(f"Processing: {question}")
            response = generate_response_bedrock(question)
            print(f"Response: {response}")
        except Exception as e:
            print(f"Error while processing question: {question}")
            print(f"Exception: {e}")
            print(traceback.format_exc())
            response = f"[Error generating response: {str(e)}]"
        
        # Write both question and response to the output
        writer.writerow({
            "Question": question,
            "Response": response
        })
        time.sleep(0.5)  # optional: throttle API requests

print(f"Processing complete. Output saved to {OUTPUT_FILE}")