import os
import json

parsed_texts_dir = "src/parsed texts"
json_files = sorted([f for f in os.listdir(parsed_texts_dir) if f.endswith(".json")])

print("=== CHECKING PARSED SECTIONS IN JSON FILES ===")
total_fragments = 0
empty_parsed_sections_count = 0
non_empty_parsed_sections_count = 0
files_with_sections = []

for f in json_files:
    file_path = os.path.join(parsed_texts_dir, f)
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)
            fragments = data.get("fragments", [])
            for frag in fragments:
                total_fragments += 1
                sections = frag.get("parsedSections", [])
                if not sections:
                    empty_parsed_sections_count += 1
                else:
                    non_empty_parsed_sections_count += 1
                    if f not in files_with_sections:
                        files_with_sections.append(f)
    except Exception as e:
        print(f"Error reading {f}: {e}")

print(f"Total files: {len(json_files)}")
print(f"Total fragments checked: {total_fragments}")
print(f"Fragments with empty parsedSections: {empty_parsed_sections_count}")
print(f"Fragments with non-empty parsedSections: {non_empty_parsed_sections_count}")
print(f"Files containing non-empty parsedSections ({len(files_with_sections)}):")
for f in files_with_sections:
    print(f"  {f}")
