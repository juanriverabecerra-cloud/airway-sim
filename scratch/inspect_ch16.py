import sqlite3
import json

db_path = 'src/knowledge/medical_truth.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Checking Chapters in Database ---")
cursor.execute("SELECT DISTINCT source_book FROM textbook_prose")
books = cursor.fetchall()
for b in sorted([x[0] for x in books]):
    print(b)

print("\n--- Querying Chapter 16 Prose Rows ---")
cursor.execute("SELECT id, topic, body_text, source_book, edition, priority_rank, is_authoritative FROM textbook_prose WHERE source_book LIKE '%Chapter_16%'")
rows = cursor.fetchall()
print(f"Found {len(rows)} prose rows matching Chapter 16.")
for r in rows:
    print(f"ID: {r[0]} | TOPIC: {r[1]} | IS_AUTH: {r[6]} | PREVIEW: {r[2][:300]}...\n")

print("\n--- Querying Chapter 16 Matrices Rows ---")
cursor.execute("SELECT id, topic, archetype, caption, structured_payload, source_book, is_authoritative FROM physiological_matrices WHERE source_book LIKE '%Chapter_16%'")
m_rows = cursor.fetchall()
print(f"Found {len(m_rows)} matrix rows matching Chapter 16.")
for r in m_rows:
    print(f"ID: {r[0]} | TOPIC: {r[1]} | ARCHETYPE: {r[2]} | CAPTION: {r[3]}")
    payload = json.loads(r[4])
    print(f"PAYLOAD PREVIEW: {str(payload)[:300]}...\n")

conn.close()
