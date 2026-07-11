import os

search_root = "/Users/jsriverab/.gemini"
found_files = []

for root, dirs, files in os.walk(search_root):
    for file in files:
        if "ReceptorBodyPanel.jsx" in file:
            full_path = os.path.join(root, file)
            found_files.append((full_path, os.path.getsize(full_path)))

print("FOUND FILES:")
for path, size in found_files:
    print(f"- {path} ({size} bytes)")
