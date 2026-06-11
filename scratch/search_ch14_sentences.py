import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

query = """
    SELECT id, body_text 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_14.pdf'
"""
cursor.execute(query)
rows = cursor.fetchall()

keywords = ["lvedp", "starling", "coronary", "baroreceptor", "bezold", "bainbridge", "oculocardiac", "compliance", "supply", "demand", "diastol"]

print("Searching Chapter 14 for keywords...")
for id_, text in rows:
    text_lower = text.lower()
    matches = [k for k in keywords if k in text_lower]
    if matches:
        print(f"\n--- MATCH IN PAGE {id_} (Matches: {matches}) ---")
        # Split text into sentences and print those that contain the keywords
        sentences = text.split('.')
        for sentence in sentences:
            if any(k in sentence.lower() for k in keywords):
                print(f"  * {sentence.strip()}.")

conn.close()
