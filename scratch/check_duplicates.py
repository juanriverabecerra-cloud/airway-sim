import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all pages for Chapter 9, Chapter 10, and 9_10
cursor.execute("""
    SELECT id, body_text 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_9.pdf'
    ORDER BY id
""")
ch9_pages = cursor.fetchall()

cursor.execute("""
    SELECT id, body_text 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_Chapter_10.pdf'
    ORDER BY id
""")
ch10_pages = cursor.fetchall()

cursor.execute("""
    SELECT id, body_text 
    FROM textbook_prose 
    WHERE source_book = 'Millers_Anaesthesia_9th_Edition_9_10.pdf'
    ORDER BY id
""")
combo_pages = cursor.fetchall()

print(f"Chapter 9 pages: {len(ch9_pages)}")
print(f"Chapter 10 pages: {len(ch10_pages)}")
print(f"Combined 9_10 pages: {len(combo_pages)}")

# Compare page by page
# Let's see if the text of combo page 1-15 matches Chapter 9 page 1-15, and 16-39 matches Chapter 10 page 1-24
matched_ch9 = 0
for i in range(min(len(ch9_pages), len(combo_pages))):
    txt_combo = combo_pages[i][1]
    txt_ch9 = ch9_pages[i][1]
    # Check if they are identical or very similar
    if txt_combo.strip() == txt_ch9.strip():
        matched_ch9 += 1

matched_ch10 = 0
for i in range(min(len(ch10_pages), len(combo_pages) - len(ch9_pages))):
    txt_combo = combo_pages[i + len(ch9_pages)][1]
    txt_ch10 = ch10_pages[i][1]
    if txt_combo.strip() == txt_ch10.strip():
        matched_ch10 += 1

print(f"Pages matching Chapter 9 exactly: {matched_ch9} / {len(ch9_pages)}")
print(f"Pages matching Chapter 10 exactly: {matched_ch10} / {len(ch10_pages)}")

# Let's inspect the actual topics and authoritative flag for these duplicates
cursor.execute("""
    SELECT id, topic, source_book, is_authoritative 
    FROM textbook_prose 
    WHERE source_book IN ('Millers_Anaesthesia_9th_Edition_Chapter_9.pdf', 
                          'Millers_Anaesthesia_9th_Edition_Chapter_10.pdf', 
                          'Millers_Anaesthesia_9th_Edition_9_10.pdf')
      AND is_authoritative = 1
""")
print("\nAuthoritative rows among these files:")
for row in cursor.fetchall():
    print(f"  ID: {row[0]} | Topic: {row[1]} | Source: {row[2]} | Auth: {row[3]}")

conn.close()
