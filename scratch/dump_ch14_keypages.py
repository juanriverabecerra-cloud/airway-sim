import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

pages_to_dump = [
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_001_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_003_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_004_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_013_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_016_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_017_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_14.pdf_PAGE_018_full"
]

for p in pages_to_dump:
    cursor.execute("SELECT topic, body_text FROM textbook_prose WHERE id = ?", (p,))
    row = cursor.fetchone()
    if row:
        print(f"=== {p} ({row[0]}) ===")
        print(row[1])
        print("="*80 + "\n")

conn.close()
