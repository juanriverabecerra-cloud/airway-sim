import sqlite3

conn = sqlite3.connect('public/medical_truth.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT id, topic, body_text 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_9.pdf'
    ORDER BY id;
""")
rows = cursor.fetchall()

with open('scratch/chapter9_text.txt', 'w') as f:
    for row in rows:
        f.write(f"=== ID: {row[0]} ===\n")
        f.write(f"=== TOPIC: {row[1]} ===\n\n")
        f.write(row[2])
        f.write("\n\n")

print(f"Dumped {len(rows)} pages to scratch/chapter9_text.txt")
conn.close()
