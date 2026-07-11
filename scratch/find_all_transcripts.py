import os

search_root = "/Users/jsriverab/.gemini"
for root, dirs, files in os.walk(search_root):
    for file in files:
        if "transcript" in file and file.endswith(".jsonl"):
            full_path = os.path.join(root, file)
            print(f"- {full_path} ({os.path.getsize(full_path)} bytes)")
