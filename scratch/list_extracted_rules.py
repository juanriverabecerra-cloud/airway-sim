import sqlite3
import re

db_path = "src/knowledge/medical_truth.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, source_book, topic, body_text FROM textbook_prose")
all_prose = cursor.fetchall()

condition_keywords = [
    'amiodarone', 'propofol', 'succinylcholine', 'sux', 'neostigmine', 'glycopyrrolate', 'lidocaine', 'epinephrine', 'rocuronium', 'vecuronium', 'sugammadex', 'atropine', 'esmolol', 'phenylephrine', 'ketamine', 'fentanyl', 'midazolam', 'sevoflurane', 'isoflurane', 'desflurane',
    'trendelenburg', 'reverse trendelenburg', 'prone', 'supine', 'beach chair', 'sitting', 'head down', 'head up',
    'sepsis', 'septic', 'burns', 'burn', 'trauma', 'obese', 'obesity', 'copd', 'anaphylaxis', 'bronchospasm', 'laryngospasm', 'hyperkalemia', 'hypokalemia', 'seizure'
]

def canonical_condition(cond):
    if cond == 'sux': return 'succinylcholine'
    if cond == 'septic': return 'sepsis'
    if cond == 'burns': return 'burn'
    if cond == 'obesity': return 'obese'
    return cond

extracted_rules = []

for row_id, source, topic, body in all_prose:
    if not body:
        continue
    sentences = re.split(r'(?<=[.!?])\s+', body)
    for sentence in sentences:
        sentence_lower = sentence.lower()
        
        matched_cond = None
        for cond in condition_keywords:
            if cond in sentence_lower:
                matched_cond = canonical_condition(cond)
                break
                
        if not matched_cond:
            continue
            
        target_vital = None
        if re.search(r'(heart\s*rate|pulse|beats\s*per\s*minute)', sentence_lower):
            target_vital = 'hr'
        elif re.search(r'(respiratory\s*rate|breathing\s*rate|breaths\s*per\s*minute)', sentence_lower):
            target_vital = 'rr'
        elif re.search(r'(mean\s*arterial\s*pressure|map|blood\s*pressure|systolic|diastolic)', sentence_lower):
            target_vital = 'map'
        elif re.search(r'(spo2|oxygen\s*saturation|sao2)', sentence_lower):
            target_vital = 'spo2'
        elif re.search(r'(potassium|k\+)', sentence_lower):
            target_vital = 'k'
        elif re.search(r'(compliance|lung\s*compliance|chest\s*wall\s*compliance)', sentence_lower):
            target_vital = 'compl'
        elif re.search(r'(peak\s*inspiratory\s*pressure|pip|airway\s*pressure)', sentence_lower):
            target_vital = 'pip'
        elif re.search(r'(temperature|temp|body\s*temperature|core\s*temperature)', sentence_lower):
            target_vital = 'temp'
            
        if not target_vital:
            continue
            
        operator = None
        value = 0
        
        # Percentage decrease
        dec_pct = re.search(r'(?:reduces?|decreases?|drops?|falls?|declines?|depress(?:es|ed)?|loss|deficit)\s+(?:.*?\s+)?(?:by|of|to)?\s*(\d+(?:\.\d+)?)\s*%', sentence_lower) or \
                  re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:drop|reduction|decrease|fall|decline)', sentence_lower)
        if dec_pct:
            operator = 'scale'
            value = 1 - float(dec_pct.group(1)) / 100
            
        # Percentage increase
        if not operator:
            inc_pct = re.search(r'(?:increases?|raises?|elevates?|rises?|goes\s+up|enhances?)\s+(?:.*?\s+)?(?:by|of|to)?\s*(?:\+)?\s*(\d+(?:\.\d+)?)\s*%', sentence_lower) or \
                      re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:increase|rise|elevation|enhancement)', sentence_lower)
            if inc_pct:
                operator = 'scale'
                value = 1 + float(inc_pct.group(1)) / 100
                
        # Absolute decrease
        if not operator:
            dec_abs = re.search(r'(?:reduces?|decreases?|drops?|falls?|declines?|depress(?:es|ed)?|loss|deficit)\s+(?:.*?\s+)?(?:by|of|to)?\s*(\d+(?:\.\d+)?)', sentence_lower)
            if dec_abs:
                operator = '-'
                value = float(dec_abs.group(1))
                
        # Absolute increase
        if not operator:
            inc_abs = re.search(r'(?:increases?|raises?|elevates?|rises?|goes\s+up|enhances?)\s+(?:.*?\s+)?(?:by|of|to)?\s*(?:\+)?\s*(\d+(?:\.\d+)?)', sentence_lower)
            if inc_abs:
                operator = '+'
                value = float(inc_abs.group(1))
                
        # Clamp
        if not operator:
            clamp = re.search(r'(?:limits?|clamps?|stabilizes?|holds?|caps?)\s+(?:.*?\s+)?(?:to|at)?\s*(\d+(?:\.\d+)?)', sentence_lower)
            if clamp:
                operator = 'clamp'
                value = float(clamp.group(1))
                
        if operator:
            extracted_rules.append({
                "source": source,
                "row_id": row_id,
                "sentence": sentence.strip(),
                "condition": matched_cond,
                "targetVital": target_vital,
                "operator": operator,
                "value": value
            })

print("=== ALL EXTRACTED RULES FROM DB ===")
for idx, r in enumerate(extracted_rules):
    print(f"[{idx+1}] Source: {r['source']} (ID: {r['row_id']})")
    print(f"    Condition: {r['condition']} | Vital: {r['targetVital']} | Op: {r['operator']} | Val: {r['value']}")
    print(f"    Sentence: \"{r['sentence']}\"")
    print("-" * 80)

conn.close()
