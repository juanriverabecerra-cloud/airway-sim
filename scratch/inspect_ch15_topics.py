import sqlite3

db_path = 'src/knowledge/medical_truth.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Querying Chapter 15 Rows ---")
cursor.execute("SELECT topic, body_text FROM textbook_prose WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_15.pdf' AND is_authoritative = 1")
rows = cursor.fetchall()
for topic, body_text in rows:
    print(f"TOPIC: {topic}")
    print(f"PREVIEW: {body_text[:300]}...\n")

conn.close()
