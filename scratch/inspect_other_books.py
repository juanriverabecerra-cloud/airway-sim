import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Barash
cursor.execute("""
    SELECT id, topic, SUBSTR(body_text, 1, 300), edition, priority_rank, is_authoritative 
    FROM textbook_prose 
    WHERE source_book = 'Barash_Clinical_Anesthesia_8th_Edition.pdf'
""")
row = cursor.fetchone()
if row:
    print("=== BARASH RECORD ===")
    print(f"  ID: {row[0]}")
    print(f"  Topic: {row[1]}")
    print(f"  Body: {row[2]}...")
    print(f"  Ed: {row[3]} | Rank: {row[4]} | Auth: {row[5]}")
else:
    print("No Barash record found")

# 2. Miller 8th
cursor.execute("""
    SELECT id, topic, SUBSTR(body_text, 1, 300), edition, priority_rank, is_authoritative 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_8th_Edition.pdf'
""")
row = cursor.fetchone()
if row:
    print("\n=== MILLER 8TH RECORD ===")
    print(f"  ID: {row[0]}")
    print(f"  Topic: {row[1]}")
    print(f"  Body: {row[2]}...")
    print(f"  Ed: {row[3]} | Rank: {row[4]} | Auth: {row[5]}")
else:
    print("No Miller 8th record found")

# 3. Miller 9_10
cursor.execute("""
    SELECT id, topic, COUNT(*), SUM(is_authoritative)
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_9_10.pdf'
    GROUP BY topic
""")
print("\n=== MILLER 9_10 TOPICS ===")
for r in cursor.fetchall():
    print(f"  Topic: {r[0]} | Rows: {r[1]} | Auth Rows: {r[2]}")

# 4. Let's see if there are any authoritative rows at all, and print them!
cursor.execute("""
    SELECT id, topic, source_book, edition, priority_rank 
    FROM textbook_prose 
    WHERE is_authoritative = 1
""")
print("\n=== AUTHORITATIVE PROSE RECORDS ===")
for r in cursor.fetchall():
    print(f"  ID: {r[0]} | Topic: {r[1]} | Source: {r[2]} | Ed: {r[3]} | Rank: {r[4]}")

conn.close()
