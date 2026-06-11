import sqlite3

db_path = 'src/knowledge/medical_truth.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, topic, body_text FROM textbook_prose WHERE source_book LIKE '%Chapter_16%' ORDER BY id")
rows = cursor.fetchall()

for r in rows:
    print("=" * 80)
    print(f"ID: {r[0]} | TOPIC: {r[1]}")
    print("=" * 80)
    print(r[2])
    print("\n")

conn.close()
