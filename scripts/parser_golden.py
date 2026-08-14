#!/usr/bin/env python3
"""
parser_golden.py — regression harness for the PDF parser
============================================================================
Guards against silent regressions when the parser is changed (e.g. a fix for
one book scrambling another). Each golden case parses ONE known page of a real
source PDF and asserts:
  - a set of text snippets appears IN ORDER (catches reading-order / column
    regressions — the snippets are from the same column and would reorder if
    columns broke), and
  - the page's quality passes (catches encoding/garble regressions).

Fast: it slices the single page into a temp 1-page PDF and calls the parser
directly. Source PDFs live in the git-ignored source_material/; a case whose PDF
is absent is SKIPPED (not failed), so a fresh checkout still runs.

    python3 scripts/parser_golden.py         # run all cases
Exit code is non-zero if any case FAILS.
"""

import importlib.util, os, sys, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "src", "airway_ingest", "source_material")
PREFIX = {
    "millers": "Millers_Anaesthesia_9th_Edition_Chapter_",
    "jaffe": "Jaffe_AMSP_6th_Edition_Chapter_",
    "morgan": "Morgan_Mikhail_Chapter_",
}

# Each case: book, chapter, page (1-based), ordered snippets, min english ratio.
GOLDEN = [
    {  # the exact two-column page that used to interleave figure labels into prose.
        # "Spinothalamic" is a RIGHT-column figure label: in correct reading order it
        # comes AFTER the left column's "In contrast..."; an interleaved (y,x) sort
        # puts it first. So this pair fails loudly if column ordering ever regresses.
        "book": "millers", "chapter": 19, "page": 5, "min_english": 0.20,
        "ordered": ["IMMOBILITY",
                    "Electroencephalography as a monitor of brain activity",
                    "In contrast, work in mutant mice",
                    "Spinothalamic"],
    },
    {  # single-column-ish agent section; heading then its body in order
        "book": "morgan", "chapter": 8, "page": 19, "min_english": 0.20,
        "ordered": ["NITROUS OXIDE", "Physical Properties",
                    "colorless and essentially odorless"],
    },
    {  # a third book (procedure manual) — mainly a quality/coverage check
        "book": "jaffe", "chapter": 7, "page": 12, "min_english": 0.20,
        "ordered": ["traumatic perforation"],
    },
]

def load_parser():
    spec = importlib.util.spec_from_file_location(
        "lp", os.path.join(REPO, "src", "knowledge", "extractor", "local_parser.py"))
    lp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lp)
    return lp

def run_case(lp, fitz, case, tmp):
    pdf = os.path.join(SRC, f"{PREFIX[case['book']]}{case['chapter']}.pdf")
    label = f"{case['book']} ch.{case['chapter']} p.{case['page']}"
    if not os.path.exists(pdf):
        return ("SKIP", label, "source PDF not present")
    # Slice the single page into a temp 1-page PDF.
    src = fitz.open(pdf)
    one = fitz.open()
    one.insert_pdf(src, from_page=case["page"] - 1, to_page=case["page"] - 1)
    page_pdf = os.path.join(tmp, f"{case['book']}_{case['chapter']}_{case['page']}.pdf")
    one.save(page_pdf); one.close(); src.close()

    os.environ["LOCAL_PARSER_SCRATCH_DIR"] = os.path.join(tmp, "imgs")
    result = lp.extract_pdf(page_pdf)
    text = "\n".join(f.get("rawText", "") or "" for f in result["fragments"])
    q = result.get("quality", {})

    # Ordered-snippet check.
    pos = -1
    for snip in case["ordered"]:
        i = text.find(snip)
        if i == -1:
            return ("FAIL", label, f"missing snippet: {snip!r}")
        if i < pos:
            return ("FAIL", label, f"out of order: {snip!r} (reading-order regression)")
        pos = i
    # Quality check.
    if not q.get("ok", False):
        return ("FAIL", label, f"quality not ok: {q.get('flags')}")
    if q.get("english_word_ratio", 0) < case["min_english"]:
        return ("FAIL", label, f"english ratio {q.get('english_word_ratio')} < {case['min_english']}")
    return ("PASS", label, f"eng={q.get('english_word_ratio')}")

def main():
    try:
        import fitz
    except ImportError:
        print("PyMuPDF (fitz) not installed."); sys.exit(2)
    lp = load_parser()
    passed = failed = skipped = 0
    with tempfile.TemporaryDirectory() as tmp:
        for case in GOLDEN:
            try:
                status, label, detail = run_case(lp, fitz, case, tmp)
            except Exception as e:
                status, label, detail = "FAIL", f"{case['book']} ch.{case['chapter']}", f"exception: {e}"
            mark = {"PASS": "✓", "FAIL": "✗", "SKIP": "•"}[status]
            print(f"  {mark} {status:4} {label:26} {detail}")
            passed += status == "PASS"; failed += status == "FAIL"; skipped += status == "SKIP"
    print(f"\n{passed} passed, {failed} failed, {skipped} skipped.")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
