#!/usr/bin/env python3
"""
split_pdf.py — Split a multi-chapter PDF into per-chapter PDFs
============================================================================
The ingestion pipeline (`npm run ingest-pdf`) and the podcast builder
(`npm run podcast`) both assume ONE chapter per PDF: the chapter number lives
only in the filename and becomes the JSON basename + every doc-id prefix.
Feed a multi-chapter PDF to `ingest-pdf` and you get one giant blob JSON with
every chapter concatenated. So multi-chapter files must be split first.

This tool splits by explicit page ranges (reliable) or best-effort by the PDF's
bookmarks/TOC (only when the bookmark page destinations are intact — they often
are not), and names each output exactly how the downstream tools expect, e.g.
`Millers_Anaesthesia_9th_Edition_Chapter_13.pdf`.

Uses PyMuPDF (`fitz`), already a pipeline dependency — no new installs.

----------------------------------------------------------------------------
USAGE
  # 1) Preview: page count + TOC, so you can find chapter boundaries.
  npm run split-pdf -- big.pdf --list
  npm run split-pdf -- big.pdf --list --scan millers   # also detect headings

  # 2) Split by explicit 1-based, inclusive page ranges -> per-chapter PDFs.
  npm run split-pdf -- big.pdf --book millers --ranges "13:1-28,14:29-55"

  # 3) Best-effort auto-split from a clean level-1 TOC.
  npm run split-pdf -- big.pdf --book jaffe --by-toc

OPTIONS
  --book millers|jaffe   use the known filename prefix for that book
  --prefix <str>         custom filename prefix (chapter number + .pdf appended)
  --ranges "<N:a-b,...>" chapter N gets pages a..b (1-based, inclusive)
  --by-toc               derive ranges from level-1 TOC entries (needs a number
                         in the title and monotonically increasing page numbers)
  --list                 print page count + TOC and exit (no writing)
  --scan <book>          with --list, also scan page tops for chapter headings
  --out <dir>            output dir (default: src/airway_ingest/source_material/)
  --force                overwrite existing output files

The known prefixes intentionally match BOOKS in scripts/build_podcast_md.mjs so
the split PDFs flow straight through ingest -> parsed JSON -> podcast markdown.
----------------------------------------------------------------------------
"""

import argparse
import os
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF (fitz) is not installed. It ships with the ingest pipeline;\n"
          "install with: pip install pymupdf", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(REPO_ROOT, "src", "airway_ingest", "source_material")

# Must match BOOKS in scripts/build_podcast_md.mjs (and the existing on-disk files).
KNOWN_PREFIXES = {
    "millers": "Millers_Anaesthesia_9th_Edition_Chapter_",
    "jaffe": "Jaffe_AMSP_6th_Edition_Chapter_",
    "morgan": "Morgan_Mikhail_Chapter_",
}

# Heuristic chapter-opening patterns for --scan, per book. The marker usually
# sits on its own line among the first few lines of a chapter's opening page,
# with the human title on the next non-empty line.
SCAN_PATTERNS = {
    # Jaffe: "SECTION 1.0" / "CHAPTER 1.1" on their own line.
    "jaffe": re.compile(r"^(?:CHAPTER|SECTION)\s+(\d+(?:\.\d+)?)\b", re.I),
    # Miller's: "CHAPTER 13" when present, else a bare standalone chapter number.
    "millers": re.compile(r"^(?:CHAPTER\s+)?(\d{1,3})$", re.I),
    # Morgan & Mikhail: each chapter opens with a standalone "CHAPTER 13" line.
    "morgan": re.compile(r"^CHAPTER\s+(\d{1,3})$"),
}
# How many leading non-empty lines of a page to inspect for a marker.
SCAN_LOOKAHEAD = 5


def resolve_prefix(args):
    if args.prefix:
        return args.prefix
    if args.book:
        b = args.book.lower()
        if b not in KNOWN_PREFIXES:
            sys.exit(f"Unknown --book '{args.book}'. Known: {', '.join(KNOWN_PREFIXES)}. "
                     f"Or pass --prefix.")
        return KNOWN_PREFIXES[b]
    return None


def toc_looks_broken(toc):
    """True if level-1 page destinations mostly collapse to page 1 (a common
    corrupted-bookmark case), which makes auto page-splitting unusable."""
    l1_pages = [page for (lvl, _title, page) in toc if lvl == 1]
    if len(l1_pages) < 3:
        return False
    ones = sum(1 for p in l1_pages if p <= 1)
    return ones / len(l1_pages) > 0.5


def cmd_list(doc, args):
    toc = doc.get_toc()
    print(f"Pages: {doc.page_count}")
    if not toc:
        print("TOC: (none — this PDF has no bookmarks; use --ranges with page numbers)")
    else:
        broken = toc_looks_broken(toc)
        print(f"TOC: {len(toc)} entries"
              + ("   ⚠️  page destinations look broken (mostly page 1) — "
                 "prefer --ranges over --by-toc" if broken else ""))
        for lvl, title, page in toc:
            if lvl <= 2:
                indent = "  " * (lvl - 1)
                print(f"  p{page:>4}  {indent}{title[:72]}")

    if args.scan:
        book = args.scan.lower()
        pat = SCAN_PATTERNS.get(book)
        if not pat:
            print(f"\n--scan: no heading pattern for '{args.scan}'. Known: {', '.join(SCAN_PATTERNS)}")
            return
        print(f"\nHeading scan (book={book}) — candidate chapter starts by page text:")
        hits = 0
        for i in range(doc.page_count):
            text = doc.load_page(i).get_text("text") or ""
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            for j, line in enumerate(lines[:SCAN_LOOKAHEAD]):
                m = pat.match(line)
                if m:
                    title = lines[j + 1] if j + 1 < len(lines) else ""
                    hits += 1
                    print(f"  p{i + 1:>4}  {m.group(1):>6}  {title[:60]}")
                    break
        if not hits:
            print("  (no matches — the pattern may not fit this book's layout; use --ranges)")


def parse_ranges(spec, page_count):
    """'13:1-28,14:29-55' -> [(13, 1, 28), (14, 29, 55)] with validation."""
    out = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        m = re.match(r"^\s*(\d+)\s*:\s*(\d+)\s*-\s*(\d+)\s*$", chunk)
        if not m:
            sys.exit(f"Bad range '{chunk}'. Expected N:start-end, e.g. 13:1-28.")
        ch, a, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if a < 1 or b < a or b > page_count:
            sys.exit(f"Range {chunk} out of bounds (PDF has {page_count} pages).")
        out.append((ch, a, b))
    if not out:
        sys.exit("No valid ranges parsed from --ranges.")
    return out


def ranges_from_toc(doc):
    """Best-effort: level-1 TOC entries whose title has a chapter number, with
    monotonically increasing start pages; each runs to the next entry's start."""
    toc = doc.get_toc()
    if toc_looks_broken(toc):
        sys.exit("--by-toc refused: this PDF's bookmark page numbers look broken "
                 "(mostly page 1). Use --ranges with explicit pages instead "
                 "(run --list --scan to find boundaries).")
    entries = []
    for lvl, title, page in toc:
        if lvl != 1:
            continue
        m = re.search(r"(\d{1,3}(?:\.\d+)?)", title)
        if not m:
            continue
        # Chapter key: integer part before any dot (7.0 -> 7, 13 -> 13).
        ch = int(float(m.group(1)))
        entries.append((ch, page, title))
    # Keep only strictly increasing page starts.
    cleaned = []
    last_page = 0
    for ch, page, title in entries:
        if page > last_page:
            cleaned.append((ch, page, title))
            last_page = page
    if len(cleaned) < 2:
        sys.exit("--by-toc found fewer than 2 usable chapter entries. Use --ranges.")
    out = []
    for idx, (ch, page, _title) in enumerate(cleaned):
        end = (cleaned[idx + 1][1] - 1) if idx + 1 < len(cleaned) else doc.page_count
        out.append((ch, page, end))
    return out


def do_split(doc, ranges, prefix, out_dir, force):
    if not prefix:
        sys.exit("A filename prefix is required to write files. Pass --book or --prefix.")
    os.makedirs(out_dir, exist_ok=True)
    written = 0
    for ch, a, b in ranges:
        name = f"{prefix}{ch}.pdf"
        dest = os.path.join(out_dir, name)
        if os.path.exists(dest) and not force:
            print(f"  ✗ {name}: exists — skipping (use --force to overwrite)")
            continue
        sub = fitz.open()
        sub.insert_pdf(doc, from_page=a - 1, to_page=b - 1)
        sub.save(dest)
        sub.close()
        print(f"  ✓ {name}  (pages {a}-{b}, {b - a + 1}p)")
        written += 1
    print(f"\nWrote {written} file(s) to {os.path.relpath(out_dir, REPO_ROOT)}/")
    if written:
        print("Next: npm run ingest-pdf     (then: npm run podcast -- <chapter>)")


def main():
    ap = argparse.ArgumentParser(add_help=True, description="Split a multi-chapter PDF into per-chapter PDFs.")
    ap.add_argument("pdf", help="path to the multi-chapter PDF")
    ap.add_argument("--book", help="millers|jaffe (known filename prefix)")
    ap.add_argument("--prefix", help="custom filename prefix; chapter number + .pdf appended")
    ap.add_argument("--ranges", help='"N:start-end,..." 1-based inclusive page ranges')
    ap.add_argument("--by-toc", action="store_true", help="derive ranges from a clean level-1 TOC")
    ap.add_argument("--list", action="store_true", help="print page count + TOC and exit")
    ap.add_argument("--scan", help="with --list: scan page tops for a book's chapter headings")
    ap.add_argument("--out", default=DEFAULT_OUT, help="output dir (default: source_material/)")
    ap.add_argument("--force", action="store_true", help="overwrite existing output files")
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        sys.exit(f"Not found: {args.pdf}")
    doc = fitz.open(args.pdf)

    if args.list or (not args.ranges and not args.by_toc):
        cmd_list(doc, args)
        if not args.list:
            print("\n(no --ranges or --by-toc given — nothing written. See usage above.)")
        return

    prefix = resolve_prefix(args)
    if args.ranges:
        ranges = parse_ranges(args.ranges, doc.page_count)
    else:  # --by-toc
        ranges = ranges_from_toc(doc)
        print("Derived ranges from TOC:")
        for ch, a, b in ranges:
            print(f"  chapter {ch}: pages {a}-{b}")
    do_split(doc, ranges, prefix, os.path.abspath(args.out), args.force)


if __name__ == "__main__":
    main()
