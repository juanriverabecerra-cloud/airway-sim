import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

ids_to_check = [
    "Millers_Anaesthesia_9th_Edition_Chapter_18.pdf_PAGE_013_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_13.pdf_PAGE_009_full",
    "Millers_Anaesthesia_9th_Edition_Chapter_44.pdf_PAGE_008_full"
]

print("=== DEEP DATA FIDELITY SPOT-CHECKS ===")

for pid in ids_to_check:
    cursor.execute("""
        SELECT source_book, topic, body_text, edition, priority_rank, is_authoritative
        FROM textbook_prose
        WHERE id = ?
    """, (pid,))
    row = cursor.fetchone()
    if not row:
        print(f"Error: Record {pid} not found in database.")
        continue
        
    source, topic, body, ed, rank, auth = row
    length = len(body)
    words = len(body.split())
    
    print(f"\nID: {pid}")
    print(f"Source Book: {source}")
    print(f"Topic: {topic} | Edition: {ed} | Rank: {rank} | Authoritative: {auth}")
    print(f"Character Length: {length} characters | Word Count: {words} words")
    print("-" * 40)
    # Output the first 600 characters and last 600 characters to verify start/end integrity
    print("START OF RECORD:")
    print(body[:600])
    print("...")
    print("END OF RECORD:")
    print(body[-600:])
    print("=" * 80)

conn.close()
