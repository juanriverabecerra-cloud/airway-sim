import os
import sqlite3

db_path = "src/knowledge/medical_truth.db"
parsed_texts_dir = "src/parsed texts"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT DISTINCT source_book FROM textbook_prose")
db_books = {row[0] for row in cursor.fetchall()}

json_files = [f for f in os.listdir(parsed_texts_dir) if f.endswith(".json")]

print("=== CHECKING COVERAGE ===")
missing_in_db = []
for f in json_files:
    pdf_name = f.replace(".json", ".pdf")
    if pdf_name not in db_books:
        missing_in_db.append(f)

print(f"Total parsed JSON files: {len(json_files)}")
print(f"JSON files missing in DB: {len(missing_in_db)}")
if missing_in_db:
    for m in missing_in_db:
        print(f"  - {m}")
else:
    print("  ✓ Success! All parsed JSON files are fully represented in the database.")

# Now check DB entries that are not in the JSON directory
extra_in_db = []
for b in db_books:
    if b.startswith("Millers_Anaesthesia_9th_Edition_Chapter_"):
        json_name = b.replace(".pdf", ".json")
        if json_name not in json_files:
            extra_in_db.append(b)
    elif b not in ["Barash_Clinical_Anesthesia_8th_Edition.pdf", "Millers_Anaesthesia_8th_Edition.pdf", "Millers_Anaesthesia_9th_Edition_9_10.pdf"]:
        extra_in_db.append(b)

print(f"DB source books not found as JSON files in folder: {len(extra_in_db)}")
if extra_in_db:
    for e in extra_in_db:
        print(f"  - {e}")

conn.close()
