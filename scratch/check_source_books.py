import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT DISTINCT source_book FROM textbook_prose LIMIT 10")
rows = cursor.fetchall()
print("First 10 source_books in textbook_prose:")
for row in rows:
    print(f"  '{row[0]}'")

cursor.execute("SELECT COUNT(*) FROM textbook_prose")
print(f"Total prose records: {cursor.fetchone()[0]}")

cursor.execute("SELECT DISTINCT source_book FROM textbook_prose")
all_books = [r[0] for r in cursor.fetchall()]
print(f"Total distinct source_books in DB: {len(all_books)}")

# Check if there are any that look like JSON files or PDF files
print("Some examples from DB:")
for b in sorted(all_books)[:15]:
    print(f"  {b}")

conn.close()
