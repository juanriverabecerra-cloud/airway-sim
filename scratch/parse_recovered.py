import json
import re

with open("scratch/recovered_4300f00e-40b3-405b-9316-3670e83977d4_34.txt", "r", encoding="utf-8") as f:
    content = f.read()

# We need to extract the raw text within the JSON
try:
    data = json.loads(content)
    text = data.get("content", content)
except Exception:
    text = content

# Find all lines matching the format: <line_number>: <original_line>
lines_dict = {}
pattern = re.compile(r"^(\d+):\s(.*)$")

for line in text.split("\n"):
    match = pattern.match(line)
    if match:
        line_num = int(match.group(1))
        line_content = match.group(2)
        lines_dict[line_num] = line_content

print(f"Parsed {len(lines_dict)} lines from the recovery log.")
print(f"Min line number: {min(lines_dict.keys()) if lines_dict else 'None'}")
print(f"Max line number: {max(lines_dict.keys()) if lines_dict else 'None'}")

# Let's write the parsed lines to a file to inspect them
with open("scratch/parsed_code.jsx", "w", encoding="utf-8") as out:
    for num in sorted(lines_dict.keys()):
        out.write(lines_dict[num] + "\n")
