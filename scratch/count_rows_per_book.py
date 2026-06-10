import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get row counts per book
cursor.execute("""
    SELECT source_book, COUNT(*) 
    FROM textbook_prose 
    GROUP BY source_book 
    ORDER BY source_book
""")
rows = cursor.fetchall()
print("=== PROSE RECORDS PER BOOK ===")
for r in rows:
    print(f"  {r[0]}: {r[1]} rows")

conn.close()
