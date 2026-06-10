import os
import json
import sqlite3

db_path = "src/knowledge/medical_truth.db"
parsed_texts_dir = "src/parsed texts"

def audit_database():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get Tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print("=== TABLES IN DATABASE ===")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  Table: {table} | Rows: {count}")
        # Get schema
        cursor.execute(f"PRAGMA table_info({table});")
        schema = cursor.fetchall()
        print("    Schema:")
        for col in schema:
            print(f"      {col[1]} ({col[2]})")
            
    # Get Indexes
    cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index';")
    indexes = cursor.fetchall()
    print("\n=== INDEXES IN DATABASE ===")
    for idx in indexes:
        print(f"  Index: {idx[0]} on Table: {idx[1]}")

    # Cross-reference JSON files vs DB records
    json_files = sorted([f for f in os.listdir(parsed_texts_dir) if f.endswith(".json")])
    print(f"\n=== CROSS-REFERENCING JSON FILES ({len(json_files)}) WITH DATABASE ===")
    
    # Query distinct source_books in textbook_prose
    cursor.execute("SELECT DISTINCT source_book FROM textbook_prose")
    prose_books = {row[0] for row in cursor.fetchall()}
    
    # Query distinct source_books in physiological_matrices
    cursor.execute("SELECT DISTINCT source_book FROM physiological_matrices")
    matrix_books = {row[0] for row in cursor.fetchall()}
    
    db_books = prose_books.union(matrix_books)
    
    print(f"Total distinct source_books in database: {len(db_books)}")
    
    missing_in_db = []
    indexed_breakdown = []
    
    for f in json_files:
        # In the DB, the source_book is stored as the file name, e.g. "Millers_Anaesthesia_9th_Edition_Chapter_10.json"
        # Let's verify by printing a few DB source_books
        in_prose = f in prose_books
        in_matrix = f in matrix_books
        
        cursor.execute("SELECT COUNT(*) FROM textbook_prose WHERE source_book = ?", (f,))
        prose_cnt = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM physiological_matrices WHERE source_book = ?", (f,))
        matrix_cnt = cursor.fetchone()[0]
        
        if prose_cnt == 0 and matrix_cnt == 0:
            missing_in_db.append(f)
        else:
            indexed_breakdown.append({
                "file": f,
                "prose_count": prose_cnt,
                "matrix_count": matrix_cnt
            })
            
    print(f"\nIndexed files count: {len(indexed_breakdown)}")
    print(f"Missing files from DB: {len(missing_in_db)}")
    if missing_in_db:
        for m in missing_in_db:
            print(f"  - {m}")
            
    # Print breakdown of first few and last few indexed files
    print("\n=== SAMPLE GRANULAR BREAKDOWN OF INDEXED CHAPTERS ===")
    for item in indexed_breakdown[:10]:
        print(f"  {item['file']}: Prose={item['prose_count']}, Matrices={item['matrix_count']}")
    print("  ...")
    for item in indexed_breakdown[-10:]:
        print(f"  {item['file']}: Prose={item['prose_count']}, Matrices={item['matrix_count']}")

    # Let's count totals
    cursor.execute("SELECT COUNT(*) FROM textbook_prose")
    total_prose = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM physiological_matrices")
    total_matrix = cursor.fetchone()[0]
    print(f"\nTotal Prose Sections: {total_prose}")
    print(f"Total Matrices/Figures: {total_matrix}")

    # Check for authoritative rows
    cursor.execute("SELECT COUNT(*) FROM textbook_prose WHERE is_authoritative = 1")
    auth_prose = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM physiological_matrices WHERE is_authoritative = 1")
    auth_matrix = cursor.fetchone()[0]
    print(f"Authoritative Prose: {auth_prose} / {total_prose}")
    print(f"Authoritative Matrices: {auth_matrix} / {total_matrix}")

    conn.close()

if __name__ == "__main__":
    audit_database()
