import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, topic, body_text 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_14.pdf'
""")
rows = cursor.fetchall()
print(f"Chapter 14 has {len(rows)} prose segments.")

for r in rows:
    # Print the first 200 characters of each page
    print(f"ID: {r[0]} | Topic: {r[1]}")
    # Print if it contains keywords like "coronary", "baroreceptor", "LVEDP", "Frank-Starling", "supply", "demand", "ischemia"
    text = r[2].lower()
    keywords = ["coronary", "baroreceptor", "lvedp", "starling", "supply", "demand", "ischemia", "compliance"]
    found = [k for k in keywords if k in text]
    if found:
        print(f"  Keywords found: {found}")
    print("-" * 60)

conn.close()
