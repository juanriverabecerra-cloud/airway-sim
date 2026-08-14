# Parser Hardening Audit & Plan

Goal: make PDF ingestion **as true to the reference material as possible** and robust
across arbitrary textbooks — and, just as important, make any parsing problem **visible
instead of silent**. This file is the standing risk register: every known way the parser
can go wrong, grounded in the actual code, with severity and the fix.

Honest framing: no PDF text extractor is ever literally "perfect" on every book (PDFs are a
print format, not a data format). The achievable target is three things together:
1. **Fidelity** — robust, layout-general algorithms so the common cases are correct.
2. **Observability** — automatic detection + reporting of anything suspicious, so nothing
   is ever discovered "by chance" again.
3. **Regression safety** — a golden-set harness so fixes don't silently break other books.

## Pipeline (what runs today)

`npm run ingest-pdf` → `orchestrator.ts` → Phase 1 `extractor/local_parser.py` (PyMuPDF text +
figures, per page) → `StrategyRouter.ts` (figure archetypes) → Phase 2 `TextExtractor.enrichVisuals`
(vision, optional). Per page the Python emits `rawText`, `parsedSections`, `word_bounding_boxes`,
`visual_data_engines`; `orchestrator.ts` joins pages into `full_extracted_text` and writes
`src/parsed texts/<book>_Chapter_<n>.json`. Downstream, the JSON hydrates the knowledge DB
(rules, medications, procedures) that drives the simulator — so a bad parse skews the app, not
just the docs.

## The core problem: no quality gate

`parse_metadata.extraction_success = (totalChars > 0)` (`orchestrator.ts:155`). That is the only
success signal, and it is nearly meaningless — a fully mis-decoded (garbled) book, or one where
half the text was dropped, still has `totalChars > 0` and reports **success**. Warnings
(`orchestrator.ts:124-136`) cover only "0 chars" and "image-only pages." Everything else fails
**silently**. This is exactly why the two-column bug was found by chance. Fixing this (Category 1)
is the highest priority because it turns every other item below from "hope" into "measured."

---

## Failure-mode register

Severity: **C**ritical / **H**igh / **M**edium / **L**ow. Status: FIXED / WEAKNESS / PARTIAL.

### 1. Observability (silent failure — the root cause)
| ID | Sev | Status | Where | Problem → Fix |
|----|-----|--------|-------|---------------|
|1.1|C|WEAKNESS|`orchestrator.ts:155`|`extraction_success = totalChars>0` has no text-*quality* gate. → Compute real metrics (english-word ratio, non-ASCII %, replacement chars, run-together %, chars/page) into `parse_metadata.quality`; fail/flag when they cross thresholds. `scripts/audit_parses.py` already computes these — integrate it into the pipeline.|
|1.2|H|WEAKNESS|`orchestrator.ts:124`|Warnings only cover empty/image pages. → Emit warnings for garbled text, suspicious pages, run-together words, column-detection failures.|
|1.3|H|—|(new)|No regression harness: a fix for book A can silently break book B. → A golden set of hand-verified page→expected-text snippets, checked on every parser change.|

### 2. Reading order / layout
| ID | Sev | Status | Where | Problem → Fix |
|----|-----|--------|-------|---------------|
|2.1|C|FIXED|`local_parser.py:795,882`|Two-column interleaving (blocks sorted `(y,x)`). Fixed via `order_blocks_reading_order()`.|
|2.2|H|WEAKNESS|`local_parser.py:795` (`mid=page_w/2`), `1083`, `714`|Column model assumes a **symmetric 2-column split at page center**. Breaks on 3-column, asymmetric (wide+narrow), or single-body+sidebar layouts. → Data-driven column detection: histogram of block x-extents to find the real gutter(s) and column count per page.|
|2.3|M|PARTIAL|`local_parser.py` prose pass|Sidebars / boxed "Key Points" callouts are read in-flow and interleave with body (the top-of-chapter jumble in Miller's). → Detect boxed/sidebar regions (drawing rects or off-grid columns) and sequence them coherently.|
|2.4|M|WEAKNESS|`local_parser.py` (kept in `raw_text`)|Running headers / footers / page numbers stay inline, interrupting sentences and polluting the DB. → Detect text that repeats at the same y across many pages and strip at parse time.|
|2.5|L|WEAKNESS|`orchestrator.ts:143`|Sentences split across the `--- PAGE BREAK ---` boundary aren't rejoined. → Rejoin where a sentence clearly continues.|

### 3. Character / text fidelity
| ID | Sev | Status | Where | Problem → Fix |
|----|-----|--------|-------|---------------|
|3.1|C|WEAKNESS|`local_parser.py:859,871`|Broken/absent font ToUnicode → **garbled output (mojibake)** with no detection (seen: `˙7&` for V̇E). A whole book can decode to gibberish and pass. → Gibberish detector (english-word ratio / non-ASCII / U+FFFD) → warn + auto-fallback to OCR for that page.|
|3.2|M|WEAKNESS|`local_parser.py` text join|Line-break hyphens ("phenom-\nenon") not repaired → split words hurt search + rule extraction. → De-hyphenate soft hyphens, preserving real compounds (e.g. ventilation-perfusion).|
|3.3|M|WEAKNESS|`local_parser.py:874` (uses `"words"`/`"blocks"`, not span flags)|Superscripts/subscripts merge into the baseline: citation markers ("phenomenon.36"), chemistry ("CO2"). Corrupts tokens. → Use `get_text("dict")` span size/position to detect & separate.|
|3.4|L|WEAKNESS|parser|No NFC/ligature normalization at parse time (only downstream). → Normalize in the parser.|
|3.5|L|DETECTED|`audit_parses.py` longtok%|Missing space glyphs → run-together words. → Geometric space insertion / split flagged long tokens.|

### 4. Structure extraction
| ID | Sev | Status | Where | Problem → Fix |
|----|-----|--------|-------|---------------|
|4.1|M|WEAKNESS|`local_parser.py:54` `is_real_heading`|Heading detection is style-specific (ALL-CAPS/numbered/Title-Case ≥70%). Misses books that mark headings only by **font size/weight**. → Use `get_text("dict")` font size/bold — general across books.|
|4.2|M|PARTIAL|`local_parser.py:~897` `find_tables`|Table detection is conservative (disables on false positives); flattened tables lose structure and feed `DynamicMedicationRegistry` (drug dosing) → wrong/absent drug data. → Strengthen detection + validate structured payload.|
|4.3|M|WEAKNESS|`local_parser.py:122,1342`|Caption/keyword detection is English + "Fig./Figure"-specific. Misses TABLE/Box/Chart/Plate, non-English ("Abb.", "Figura"), captions above figures. → Broaden/configure caption patterns.|

### 5. Robustness / generality (any book)
| ID | Sev | Status | Where | Problem → Fix |
|----|-----|--------|-------|---------------|
|5.1|H|WEAKNESS|`local_parser.py:860`|Scanned-vs-text is a **per-document** decision. Hybrid PDFs (some text, some scanned pages) mis-handled: text-classified → scanned pages dropped (no OCR); scanned-classified → OCRs everything. → **Per-page** decision: OCR only pages whose text layer is empty/sparse.|
|5.2|M|WEAKNESS|`local_parser.py:891,1425`|OCR language hardcoded `eng`. Non-English books fail. → Configurable language(s).|
|5.3|M|WEAKNESS|`local_parser.py:853`|Encrypted/permission-locked PDFs → empty text, no clear error. → Detect encryption, attempt decrypt, warn explicitly.|
|5.4|L|WEAKNESS|`local_parser.py` column math|Rotated/landscape pages can skew `page_w`-based column logic. → Normalize via `page.rotation`.|

### 6. Downstream skew
| ID | Sev | Status | Where | Problem → Fix |
|----|-----|--------|-------|---------------|
|6.1|H|—|indexers|Rule/medication/procedure indexers consume the parsed text; interleaved/garbled input → **wrong physiological rules and drug data** in the live simulator. Mitigated only by upstream fidelity + re-ingest.|
|6.2|M|DETECTED|`audit_parses.py` dup%|Repeated boilerplate (e.g. Jaffe's per-procedure ERAS blurb ×60) is ingested many times → over-weights DB rules. → De-duplicate identical blocks before indexing.|

---

## Prioritized plan

- **Phase 0 — done:** 2.1 column fix; `scripts/audit_parses.py` corpus auditor.
- **Phase 1 — Observability (safe, do first):** 1.1/1.2 quality metrics + real warnings + a
  `quality` block in `parse_metadata`, plus 1.3 a small golden-set regression harness. Additive,
  no change to extracted text; becomes the measuring stick for everything else.
- **Phase 2 — Fidelity (medium risk):** 5.1 per-page OCR, 3.1 gibberish→OCR fallback, 3.2
  de-hyphenation, 2.4 header/footer stripping, 3.4 normalization.
- **Phase 3 — Generality:** 2.2 data-driven column detection, 4.1 font-aware headings, 4.3
  broadened captions, 5.2 OCR language config, 5.3 encryption handling.
- **Phase 4 — Structure (higher effort):** 4.2 table extraction, 3.3 sub/superscripts, 2.3
  sidebar sequencing.
- **After any fidelity phase:** re-ingest so the JSON + knowledge DB reflect the improved parse.

## Implementation status (updated 2026-08-10)

Verified on fresh re-parses of Miller's/Morgan/Jaffe pages via `npm run parser-golden`
(regression harness) + `npm run audit-parses` (corpus quality). **None of this is in the
committed JSON/DB yet — it applies on the next re-ingest**, which you control.

- **Phase 1 — DONE.** Quality metrics computed in the parser (`compute_quality_metrics`) and
  surfaced in `parse_metadata.quality` + real warnings (`orchestrator.ts`); `extraction_success`
  is now quality-aware, not just `chars>0`. Regression harness `scripts/parser_golden.py`
  (page-sliced, catches column-order + garble regressions; the Ch.19 case now asserts a
  right-column label sorts *after* left-column prose).
- **Phase 2 — DONE.** Per-page OCR decision (`page_needs_ocr`) for hybrid PDFs; gibberish→OCR
  fallback; de-hyphenation + NFC + ligature expansion (`clean_text`); running header/footer +
  page-number stripping (`detect_running_furniture`); OCR switched to `--psm 3` (column-aware).
- **Phase 3 — MOSTLY DONE.** Adaptive gutter detection (`find_gutter_x`) handles asymmetric
  2-column (verified: Jaffe gutter 348, Morgan 367, not center 306) with a safe center fallback;
  OCR language via `OCR_LANG`; encryption detected + empty-password unlock + explicit warning;
  broadened figure-caption patterns (`_FIG_CAPTION_RE`). **Deferred:** 2.2 true 3+-column support
  (the data-driven detector was *less* reliable than the center split on the real 2-column corpus
  because figure labels bridge gutters — not shipping an unverifiable regression; revisit with an
  actual 3-column source). **Not yet done:** 4.1 font-aware heading detection.
- **Phase 4 — MOSTLY DONE.** 3.3 citation-superscript separation via the PyMuPDF span flag
  (`superscript_separated_block_texts`): `movement28,29`→`movement 28,29`, only multi-digit/comma
  markers, so `CO2`/`cm2`/exponents are never broken (verified). 4.2 table cells now get
  `clean_text` + Markdown-safe escaping of stray `|`/newlines (cleaner drug tables into the med
  registry). **Deferred:** 2.3 sidebar sequencing — the observed case (Miller's "KEY POINTS" box)
  is a margin-label quirk, not lost content: the label sits in the left margin one line "late"
  while the box body already reads correctly; a general drawn-box grouping pass wouldn't fix that
  quirk and adds risk to the reading-order path for marginal gain. Deeper table extraction (merged
  cells, multi-page tables) also deferred as high-risk without dedicated fixtures.
- **Phase 3 remnant — 4.1 font-aware heading detection — not yet done** (use `get_text("dict")`
  font size/weight so headings are found by typography, not just ALL-CAPS/Title-Case rules).

New tools: `npm run audit-parses`, `npm run parser-golden`.

## Graph digitization (enhancement "b") — structure extraction done, points deferred to vision

Empirical finding: **Miller's graphs are vector** (curves as PDF paths), **Morgan & Jaffe are
raster** (bitmaps). But even vector graphs are **not cleanly auto-traceable** — one Miller page
carries ~1,124 undifferentiated vector paths across 4 panels, and separating the data curve from
axes/gridlines/error-bars/markers + calibrating from sparse tick labels is fragile. A mis-traced
dose-response curve is *worse* than none for a ground-truth trainer, so **no unsupervised
auto-tracer ships**.

**Done — deterministic graph STRUCTURE extraction** (`extract_graph_structure`): from the figure's
own text layer, by spatial clustering, it recovers axis titles + units, numeric tick VALUES →
range + scale (linear/log), and series/legend labels. Exact, never fabricated (returns nothing when
axis structure isn't confidently recoverable). Attached as `details.graph_structure` for COORDINATE
figures; `StrategyRouter` re-attaches it so handlers can't drop it. Validated on real Miller graphs
(e.g. Fig 20.3 → y `Pcirc/Pdel` [0–1, linear], series `12 L/min`/`6 L/min`/`FGF = 3 L/min`; Fig 20.6
recovered the agents *and* their λb/g partition coefficients). Coverage: emits for graphs with clear
numeric-tick axes (7/27 COORDINATE figures in Ch.20), skips the rest safely.

**Done — (x,y) POINTS via guardrailed vision** (`multimodal_extract.py graph_points` +
`TextExtractor.maybeExtractGraphPoints`): runs only for coordinate graphs that already have a
deterministic calibration frame. The vision call is *anchored* to the deterministic ticks and must
report the ticks it sees; `verifyTicks()` checks those against the source ticks (anti-hallucination
guardrail). Output is attached as `details.graph_points` — `series` of (x,y) points, `model_derived:
true`, a `verification` block, and a `confidence` (high only when tick-verified AND readability
clear). It NEVER overwrites `graph_structure` and is never promoted into engine rules. Works on
raster graphs (Morgan/Jaffe) too, since the model reads the rendered crop. Validated on Miller
Fig 20.3: y-ticks the model read `[0.0–1.0]` matched the deterministic calibration (verified), the
model filled in the x-axis `[0–6]` the deterministic pass couldn't read, and it returned three
physiologically-correct wash-in curves (12 > 6 > 3 L/min). Cost: one extra Gemini call per
coordinate graph, only when `RUN_VISION` is on.

## Efficiency / performance (profiled 2026-08-10)

Profiled `extract_pdf` with cProfile on a real chapter (Miller Ch.19, 20 pp, 9 figures).

- **Root cost found: `page.find_tables()` was ~76% of parse time** (7.3 s of 9.6 s), called on
  **every** page including pure prose. **Fixed** with `page_has_table_signal()` — find_tables now
  runs only where a table is plausible (a "Table N" caption OR ruling lines/box rects).
  **Verified fidelity-neutral**: preserves all real tables (Jaffe Ch.2 = 38, Miller Ch.24 = 13,
  Ch.31 = 19) and actually drops a class of false-positive "tables" find_tables invented from
  2-column prose. Note: a caption-only gate would have destroyed **all 38 Jaffe tables** (Jaffe's
  procedure tables use "SUMMARY OF PROCEDURE" boxes, not "Table N"), which is why the ruling-line
  signal is required — and why figure pages (which also have vector lines) still run find_tables,
  capping the safe speedup at ~1.4× on figure-heavy chapters (larger on prose-only chapters).
- **Removed a double text extraction**: the furniture pre-pass and the main pass both called
  `get_text("blocks")` per page; blocks are now extracted once and reused (`blocks_by_page`).
- **Reused `get_drawings()`** for both the table-signal check and figure extraction (was computed
  twice on figure pages).
- **Image processing reviewed**: figure text prefers the PDF's native text layer over OCR
  (`native_text_boxes_in_rect`, exact Unicode, confidence 100); OCR (`cluster_ocr_phrases`, psm 11)
  is a fallback only; crops render at dpi 300 (kept — lower dpi would cost crop fidelity). Figure
  detection is independent of the table gate, so unaffected by the optimizations.
- **Fixed — in-figure furniture contamination**: figure crops near a page margin were pulling the
  running header / page number into their labels (a graph's labels had `'356'`, `'SECTION II •
  Anesthetic Physiology'`). Now filtered by absolute page position *before* phrase clustering
  (`native_text_boxes_in_rect` drops words in the top/bottom 7.5% margin), robust to the header
  fragmenting across phrases; plus a text-pattern `strip_furniture_phrases` for OCR crops. Verified:
  Ch.13 went from multiple contaminated figures to 0, with real labels (Dead space ventilation,
  COPD, …) intact.
- **Identified, deliberately deferred** (broad refactor, would risk fidelity if rushed): build ONE
  `TextPage` per page and share it across the `words`/`dict`/`blocks` extractions and the per-figure
  clipped reads, instead of rebuilding a textpage per call. This is the next real lever.

## Current corpus audit (as of this writing)

`python3 scripts/audit_parses.py` over all 142 chapters: **139 clean, 3 flagged** —
Miller's Ch.41 (image-only scan, 0 chars — needs OCR), Jaffe Ch.9 & Ch.10 (DUP_TEXT: legitimate
repeated per-procedure boilerplate, not a decode error, but relevant to 6.2). No chapter is
CID-garbled. NOTE: the auditor measures token/encoding/completeness quality; it does **not** by
itself catch reading-*order* defects (columns) — those are addressed by 2.1/2.2 and should get a
dedicated bbox-based order check post-re-ingest.
