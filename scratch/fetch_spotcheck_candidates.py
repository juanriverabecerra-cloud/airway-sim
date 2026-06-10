import sqlite3

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Advanced Pharmacokinetics / Pharmacodynamics (e.g., Propofol, compartments, Hill equation)
print("=== CANDIDATES FOR PK/PD ===")
cursor.execute("""
    SELECT id, source_book, topic, SUBSTR(body_text, 1, 1000) 
    FROM textbook_prose 
    WHERE (body_text LIKE '%pharmacokinetics%' OR body_text LIKE '%compartment%')
      AND (body_text LIKE '%propofol%' OR body_text LIKE '%fentanyl%')
    LIMIT 3
""")
for r in cursor.fetchall():
    print(f"ID: {r[0]} | Source: {r[1]} | Topic: {r[2]}")
    print(f"Body snippet:\n{r[3]}\n")
    print("=" * 60)

# 2. Complex Respiratory Mechanics (e.g., FRC, shunt, positional scaling, obese)
print("\n=== CANDIDATES FOR RESPIRATORY MECHANICS / FRC ===")
cursor.execute("""
    SELECT id, source_book, topic, SUBSTR(body_text, 1, 1000) 
    FROM textbook_prose 
    WHERE (body_text LIKE '%FRC%' OR body_text LIKE '%Functional Residual Capacity%')
      AND (body_text LIKE '%obese%' OR body_text LIKE '%position%')
    LIMIT 3
""")
for r in cursor.fetchall():
    print(f"ID: {r[0]} | Source: {r[1]} | Topic: {r[2]}")
    print(f"Body snippet:\n{r[3]}\n")
    print("=" * 60)

# 3. Airway Assessment / Cormack-Lehane / Laryngoscopy
print("\n=== CANDIDATES FOR AIRWAY ASSESSMENT / LARYNGOSCOPY ===")
cursor.execute("""
    SELECT id, source_book, topic, SUBSTR(body_text, 1, 1000) 
    FROM textbook_prose 
    WHERE body_text LIKE '%Cormack%' OR body_text LIKE '%Laryngoscopy%' OR body_text LIKE '%Mallampati%'
    LIMIT 3
""")
for r in cursor.fetchall():
    print(f"ID: {r[0]} | Source: {r[1]} | Topic: {r[2]}")
    print(f"Body snippet:\n{r[3]}\n")
    print("=" * 60)

conn.close()
