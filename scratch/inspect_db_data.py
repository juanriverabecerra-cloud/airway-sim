import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Total row count and distinct source books
cursor.execute("SELECT COUNT(*), COUNT(DISTINCT source_book) FROM textbook_prose")
total_prose, distinct_books = cursor.fetchone()
print(f"Total Prose Rows: {total_prose}")
print(f"Distinct Source Books: {distinct_books}")

# 2. Check topic distribution
cursor.execute("SELECT topic, COUNT(*) FROM textbook_prose GROUP BY topic ORDER BY COUNT(*) DESC LIMIT 20")
print("\nTop 20 Topics in textbook_prose:")
for row in cursor.fetchall():
    print(f"  Topic: '{row[0]}' | Count: {row[1]}")

# 3. Check some records with source_book like Millers_Anaesthesia_9th_Edition_Chapter_10.pdf
cursor.execute("""
    SELECT id, topic, SUBSTR(body_text, 1, 150), source_book, edition, priority_rank, is_authoritative 
    FROM textbook_prose 
    WHERE source_book LIKE '%Chapter_10.pdf' 
    LIMIT 5
""")
print("\nSample records from Chapter 10:")
for row in cursor.fetchall():
    print(f"  ID: {row[0]}")
    print(f"  Topic: {row[1]}")
    print(f"  Body (truncated): {row[2]}...")
    print(f"  Source: {row[3]} | Ed: {row[4]} | Rank: {row[5]} | Auth: {row[6]}")
    print("-" * 50)

# 4. Check if there are any records in physiological_matrices
cursor.execute("SELECT COUNT(*) FROM physiological_matrices")
print(f"\nTotal Matrix Rows: {cursor.fetchone()[0]}")

# Let's list some source_books in textbook_prose
cursor.execute("SELECT DISTINCT source_book FROM textbook_prose ORDER BY source_book")
books = [r[0] for r in cursor.fetchall()]
print(f"\nAll source books in textbook_prose ({len(books)}):")
for b in books:
    print(f"  {b}")

conn.close()
