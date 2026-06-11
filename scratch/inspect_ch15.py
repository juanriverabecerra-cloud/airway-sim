import sqlite3

db_path = 'src/knowledge/medical_truth.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Unique source_book in textbook_prose ---")
cursor.execute("SELECT DISTINCT source_book FROM textbook_prose")
books = cursor.fetchall()
for b in sorted([x[0] for x in books]):
    print(b)

print("\n--- Unique source_book in physiological_matrices ---")
cursor.execute("SELECT DISTINCT source_book FROM physiological_matrices")
m_books = cursor.fetchall()
for b in sorted([x[0] for x in m_books]):
    print(b)

conn.close()
