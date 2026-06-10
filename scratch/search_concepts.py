import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

search_terms = ["Trendelenburg", "Nickalls", "ACLS", "Hill", "Succinylcholine", "Fentanyl", "Propofol"]

print("=== SEARCHING KEY CONCEPTS IN DATABASE ===")
for term in search_terms:
    cursor.execute("""
        SELECT COUNT(*), source_book, id, topic 
        FROM textbook_prose 
        WHERE body_text LIKE ?
    """, (f"%{term}%",))
    count, source, pid, topic = cursor.fetchone()
    print(f"Term: '{term}' | Matches: {count} | Sample Source: {source} | ID: {pid}")

conn.close()
