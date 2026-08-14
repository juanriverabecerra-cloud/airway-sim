#!/usr/bin/env python3
"""
audit_parses.py — read-only quality audit of already-parsed chapters
============================================================================
Surfaces likely PARSING PROBLEMS in src/parsed texts/*.json WITHOUT re-parsing,
so silent failures (garbled encoding, dropped text, OCR gaps, run-together
words) are found on purpose instead of by chance.

It does not modify anything. Usage:
    python3 scripts/audit_parses.py            # audit every parsed chapter
    python3 scripts/audit_parses.py --json     # machine-readable output
    python3 scripts/audit_parses.py Millers     # only files matching a substring

Signals per chapter:
  chars/page        very low -> text layer missing / figure-only / OCR needed
  english_score     fraction of alpha tokens that are common English words;
                    ~0.30-0.45 for normal English prose, near 0 for CID-garbled
                    text or a non-English book (flagged, not judged)
  nonascii%         high -> encoding trouble or a non-Latin script
  U+FFFD            replacement chars = definite decode failure
  longtok%          fraction of very long tokens -> words run together (no spaces)
  dup%              fraction of duplicated lines -> watermark/overlay double-layer
"""

import json, os, re, sys, glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARSED = os.path.join(REPO, "src", "parsed texts")

COMMON = set(
    "the of and to in a is that for it as was with be by on not he i this are or "
    "his from at which but have an they you one had who all will more no if out so "
    "up said what its about into than them can only other new some could time these "
    "two may then do first any my now such like our over man me even most made after "
    "also did many before must through back years where much your way well down should "
    "because each just those people how too little state good very make world still see "
    "own work men day get here between both under may result increase decrease patients "
    "blood pressure effects during anesthesia dose may cause use administration".split()
)

def tokenize(text):
    return re.findall(r"[A-Za-z]+", text)

def audit_text(text):
    n = len(text) or 1
    nonascii = sum(1 for c in text if ord(c) > 127)
    repl = text.count("�")
    toks = tokenize(text)
    low = [t.lower() for t in toks]
    eng = (sum(1 for t in low if t in COMMON) / len(low)) if low else 0.0
    longtok = (sum(1 for t in toks if len(t) > 22) / len(toks)) if toks else 0.0
    # duplicate-line ratio (overlay/watermark double layers)
    lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 25]
    dup = 0.0
    if lines:
        seen, d = set(), 0
        for l in lines:
            if l in seen: d += 1
            else: seen.add(l)
        dup = d / len(lines)
    return {
        "nonascii_pct": round(100 * nonascii / n, 2),
        "replacement_chars": repl,
        "english_score": round(eng, 3),
        "longtok_pct": round(100 * longtok, 2),
        "dup_pct": round(100 * dup, 2),
        "tokens": len(toks),
    }

def audit_file(path):
    d = json.load(open(path, encoding="utf-8"))
    meta = d.get("parse_metadata", {})
    frags = d.get("fragments", [])
    pages = len(frags) or meta.get("total_pages", 0) or 1
    text = d.get("full_extracted_text", "") or ""
    chars = meta.get("total_characters_extracted", len(text))
    empty = sum(1 for f in frags if f.get("characterCount", 0) == 0)
    low = sum(1 for f in frags if 0 < f.get("characterCount", 0) < 150)
    t = audit_text(text)
    # Flags: what looks wrong.
    flags = []
    cpp = chars / pages
    if cpp < 400: flags.append("LOW_TEXT")
    if t["english_score"] < 0.15 and t["tokens"] > 200: flags.append("GARBLED/NON-EN")
    if t["nonascii_pct"] > 8: flags.append("HIGH_NONASCII")
    if t["replacement_chars"] > 0: flags.append("DECODE_ERR")
    if t["longtok_pct"] > 3: flags.append("RUN-TOGETHER")
    if t["dup_pct"] > 12: flags.append("DUP_TEXT")
    if empty > pages * 0.25: flags.append("MANY_EMPTY_PG")
    return {
        "file": os.path.basename(path),
        "pages": pages, "chars": chars, "chars_per_page": round(cpp),
        "empty_pages": empty, "low_pages": low, **t, "flags": flags,
    }

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_json = "--json" in sys.argv
    files = sorted(glob.glob(os.path.join(PARSED, "*.json")))
    if args:
        files = [f for f in files if any(a.lower() in os.path.basename(f).lower() for a in args)]
    rows = []
    for f in files:
        try:
            rows.append(audit_file(f))
        except Exception as e:
            rows.append({"file": os.path.basename(f), "flags": ["AUDIT_ERROR"], "error": str(e)})
    if as_json:
        print(json.dumps(rows, indent=2)); return

    flagged = [r for r in rows if r.get("flags")]
    print(f"Audited {len(rows)} chapters — {len(flagged)} flagged.\n")
    hdr = f"{'chapter':46} {'pg':>4} {'ch/pg':>6} {'eng':>5} {'na%':>5} {'lng%':>5} {'empt':>4}  flags"
    print(hdr); print("-" * len(hdr))
    for r in sorted(rows, key=lambda r: (len(r.get('flags', [])), -r.get('nonascii_pct', 0)), reverse=True):
        if not r.get("flags"):
            continue
        print(f"{r['file'][:46]:46} {r.get('pages',0):>4} {r.get('chars_per_page',0):>6} "
              f"{r.get('english_score',0):>5} {r.get('nonascii_pct',0):>5} {r.get('longtok_pct',0):>5} "
              f"{r.get('empty_pages',0):>4}  {','.join(r['flags'])}")
    clean = len(rows) - len(flagged)
    print(f"\n{clean} chapters passed all checks.")

if __name__ == "__main__":
    main()
