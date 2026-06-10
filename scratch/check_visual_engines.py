import os
import json

parsed_texts_dir = "src/parsed texts"
json_files = sorted([f for f in os.listdir(parsed_texts_dir) if f.endswith(".json")])

print("=== CHECKING VISUAL DATA ENGINES IN JSON FILES ===")
total_visual_engines = 0
files_with_visuals = []

for f in json_files:
    file_path = os.path.join(parsed_texts_dir, f)
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)
            visuals = data.get("visual_data_engines", [])
            count = len(visuals)
            if count > 0:
                total_visual_engines += count
                files_with_visuals.append((f, count))
    except Exception as e:
        print(f"Error reading {f}: {e}")

print(f"Total files: {len(json_files)}")
print(f"Total visual engines found: {total_visual_engines}")
print(f"Files containing visual engines:")
for f, count in files_with_visuals:
    print(f"  {f}: {count} visual engines")
