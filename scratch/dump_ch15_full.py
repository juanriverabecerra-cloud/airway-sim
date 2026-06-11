import sqlite3

db_path = 'src/knowledge/medical_truth.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT topic, body_text FROM textbook_prose WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_15.pdf' AND is_authoritative = 1")
rows = cursor.fetchall()

with open('scratch/chapter15_text.txt', 'w') as f:
    for idx, (topic, body_text) in enumerate(rows):
        f.write(f"=== SECTION {idx+1}: {topic} ===\n")
        f.write(body_text)
        f.write("\n\n")

print("Dumped Chapter 15 text to scratch/chapter15_text.txt")
conn.close()
