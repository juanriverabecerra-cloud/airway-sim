// One-time draft extractor for Jaffe's Anesthesiologist's Manual of Surgical Procedures.
//
// Reads an already-parsed chapter JSON from `src/parsed texts/Jaffe_*.json` (produced by
// the normal `npm run ingest-pdf` pipeline -- this script never touches src/knowledge/ or
// re-parses a PDF) and writes a DRAFT structured procedure list to
// `scratch/jaffe_drafts/<chapter>_draft.json` for human/AI review before being hand-merged
// into src/engine/JaffeProcedureKnowledgeEngine.ts. Nothing this script produces should be
// trusted as final -- see docs/case_integration_prompt.md for the QA step that consumes it.
//
// Usage: npx tsx src/jaffe_tools/extract_jaffe_procedures.ts "src/parsed texts/Jaffe_AMSP_6th_Edition_Chapter_4.json"

import * as fs from 'fs';
import * as path from 'path';

interface WordBox { text: string; bbox: [number, number, number, number]; }
interface ParsedSection { heading: string; body: string; startLine: number; category: string; }
interface SourceFragment {
  id: string;
  pageNumber: number;
  contentType: string;
  rawText: string;
  parsedSections: ParsedSection[];
  word_bounding_boxes?: WordBox[];
}
interface ParsedDocument {
  parse_metadata: { source_file: string };
  fragments: SourceFragment[];
  full_extracted_text: string;
}

// Headings that are part of Jaffe's fixed per-procedure template, not a procedure name.
const BOILERPLATE_HEADING_RE = /^(SECTION\s*\d|SURGEONS?$|ANESTHESIOLOGISTS?$|PREOPERATIVE$|INTRAOPERATIVE$|POSTOPERATIVE$|ANESTHETIC CONSIDERATIONS?|SURGICAL CONSIDERATIONS?|SURGERY$|Suggested Read|Suggested View|References?$|PROCEDURE$|POSITION$|INCISION$|EBL$|UNIQUE CONSIDERATIONS|CHAPTER\s*\d|VARIANT PROCEDURES?\s*(OR\s*APPROACHES)?:?$|■|GENERAL CONSIDERATIONS$|INITIAL ASSESSMENT|GETA\.?$)/i;
const CITATION_RE = /^\d+\.\s/;
const MAX_TITLE_LEN = 70;

// Field labels as they appear in the "SURGICAL CONSIDERATIONS" / "PATIENT POPULATION
// CHARACTERISTICS" boxes. Order matters only for documentation; matching is by label text.
const SURGICAL_FIELD_LABELS = [
  'Usual preop diagnosis', 'Special instrumentation', 'Antibiotics', 'Surgical time',
  'EBL', 'Postop care', 'Mortality', 'Morbidity', 'Pain score'
];
const POPULATION_FIELD_LABELS = [
  'Age range', 'Male:Female', 'Incidence', 'Etiology', 'Associated conditions'
];

interface ProcedureDraft {
  type: 'procedure' | 'sharedPlan';
  name: string;
  chapterSource: string;
  startPage: number;
  endPage: number;
  description: string;
  variantApproaches: string;
  fields: Record<string, string>; // raw label -> value, from box reconstruction
  anestheticConsiderationsRaw: string; // may just be a "See ..." cross-reference
  crossReferenceTarget: string | null; // resolved target title, if anestheticConsiderationsRaw is a pointer
  rawSpanPreview: string; // first 300 chars of the full span, for manual sanity-checking
}

// A chapter-wide shared anesthetic plan (e.g. "ANESTHETIC CONSIDERATIONS FOR DENTAL/ORAL
// SURGERY") is a DIFFERENT thing from the bare "ANESTHETIC CONSIDERATIONS" sub-heading
// inside one procedure's own box (confirmed: the shared version always has a
// "FOR X"/"FOLLOWING X" suffix; the in-box one never does). Both must act as span
// boundaries or the shared block silently gets absorbed into whichever procedure happens
// to be last in the chapter (confirmed bug: Ch4's shared dental/oral plan bled into the
// "RESTORATIVE DENTISTRY" entry because nothing closed RESTORATIVE DENTISTRY's span).
function isSharedPlanTitle(heading: string): boolean {
  return /^ANESTHETIC CONSIDERATIONS\s+(FOR|FOLLOWING)\s+/i.test(heading.trim());
}

function isProcedureTitle(heading: string): boolean {
  const h = heading.trim();
  if (!h || h.length > MAX_TITLE_LEN) return false;
  if (CITATION_RE.test(h)) return false;
  if (BOILERPLATE_HEADING_RE.test(h)) return false;
  // Real titles in this book are ALL CAPS (data-driven observation from every chapter
  // inspected so far); mixed-case headings are usually author bylines or cross-refs.
  const letters = h.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return false;
  const upperRatio = (h.match(/[A-Z]/g) || []).length / letters.length;
  return upperRatio > 0.9;
}

// Consecutive heading-category sections are frequently one title wrapped across lines
// (e.g. "CATARACT EXTRACTION WITH INTRAOCULAR" / "LENS INSERTION") -- merge them.
// Both procedure titles and chapter-wide shared-plan titles act as span boundaries.
function mergeWrappedTitles(sections: ParsedSection[]): { heading: string; type: 'procedure' | 'sharedPlan'; startIdx: number; endIdx: number }[] {
  const anchors: { heading: string; type: 'procedure' | 'sharedPlan'; startIdx: number; endIdx: number }[] = [];
  let i = 0;
  while (i < sections.length) {
    const s = sections[i];
    const isTitle = s.category === 'heading' && isProcedureTitle(s.heading);
    const isShared = s.category === 'heading' && isSharedPlanTitle(s.heading);
    if (isTitle || isShared) {
      const type: 'procedure' | 'sharedPlan' = isShared ? 'sharedPlan' : 'procedure';
      let merged = s.heading.trim();
      let j = i + 1;
      while (
        j < sections.length &&
        sections[j].category === 'heading' &&
        (isProcedureTitle(sections[j].heading) || isSharedPlanTitle(sections[j].heading)) &&
        (!sections[j].body || sections[j].body.trim().length === 0) &&
        merged.length < 120
      ) {
        merged += ' ' + sections[j].heading.trim();
        j++;
      }
      anchors.push({ heading: merged, type, startIdx: i, endIdx: j - 1 });
      i = j;
    } else {
      i++;
    }
  }
  return anchors;
}

// Reconstructs true reading order for a two-column label:value box using word bounding
// boxes, instead of trusting the flattened text (which interleaves wrapped label lines
// with the previous row's value -- confirmed on the Ch2 Cataract Extraction entry).
function reconstructColumns(words: WordBox[]): { leftColumn: WordBox[]; rightColumn: WordBox[] } {
  if (words.length === 0) return { leftColumn: [], rightColumn: [] };
  const xs = words.map(w => w.bbox[0]).sort((a, b) => a - b);
  // Find the largest horizontal gap in x0 positions -- that gap is the column boundary.
  let splitX = -1;
  let maxGap = 0;
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i] - xs[i - 1];
    if (gap > maxGap) { maxGap = gap; splitX = (xs[i] + xs[i - 1]) / 2; }
  }
  if (splitX < 0 || maxGap < 20) {
    // No clear column split found -- treat everything as one column (single-column prose).
    return { leftColumn: [...words].sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]), rightColumn: [] };
  }
  const leftColumn = words.filter(w => w.bbox[0] < splitX).sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
  const rightColumn = words.filter(w => w.bbox[0] >= splitX).sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
  return { leftColumn, rightColumn };
}

function groupWordsIntoLines(words: WordBox[]): { y: number; text: string }[] {
  const lines: { y: number; words: WordBox[] }[] = [];
  for (const w of words) {
    const y = w.bbox[1];
    let line = lines.find(l => Math.abs(l.y - y) < 4);
    if (!line) { line = { y, words: [] }; lines.push(line); }
    line.words.push(w);
  }
  return lines
    .sort((a, b) => a.y - b.y)
    .map(l => ({ y: l.y, text: l.words.sort((a, b) => a.bbox[0] - b.bbox[0]).map(w => w.text).join(' ') }));
}

// Jaffe pages routinely mix single-column prose (Description/ERAS paragraphs) ABOVE a
// two-column label:value box on the same physical page. Running column-split over the
// whole page's words lets the wide prose text corrupt the gap-detection for the box
// (confirmed: this produced garbled "Usual preop diagnosis" values pulling in ERAS
// paragraph fragments). Fix: find the topmost word matching any known label's first
// token, and only feed column-reconstruction words at or below that y -- trims prose
// that sits above the box out of the input entirely.
function restrictToBoxBand(words: WordBox[], labels: string[]): WordBox[] {
  const firstTokens = new Set(labels.map(l => l.split(' ')[0].toLowerCase()));
  let bandStartY = Infinity;
  for (const w of words) {
    const clean = w.text.replace(/[:.]$/, '');
    // Real box labels are Title Case ("Surgical time"); section markers like "SURGICAL
    // CONSIDERATIONS" are ALL CAPS and can share a first word with a label ("Surgical").
    // Matching case-insensitively let "SURGICAL CONSIDERATIONS" falsely anchor the band
    // at the top of the page's prose, before the real box even starts, diluting the
    // whole page's words into the column-split detection (confirmed: dropped the box's
    // ~100pt column gap to ~16pt, below the split threshold, so no box was found at
    // all). Reject all-caps matches longer than a short acronym like "EBL".
    const isHeadingLikeAllCaps = clean === clean.toUpperCase() && clean.length > 4;
    if (!isHeadingLikeAllCaps && firstTokens.has(clean.toLowerCase()) && w.bbox[1] < bandStartY) {
      bandStartY = w.bbox[1];
    }
  }
  if (bandStartY === Infinity) return [];
  return words.filter(w => w.bbox[1] >= bandStartY - 3);
}

function extractFieldsFromPages(fragments: SourceFragment[], pageNumbers: Set<number>, labels: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const frag of fragments) {
    if (!pageNumbers.has(frag.pageNumber) || !frag.word_bounding_boxes || frag.word_bounding_boxes.length === 0) continue;
    const bandWords = restrictToBoxBand(frag.word_bounding_boxes, labels);
    if (bandWords.length === 0) continue;
    const { leftColumn, rightColumn } = reconstructColumns(bandWords);
    if (rightColumn.length === 0) continue; // no two-column box detected on this page
    const leftLines = groupWordsIntoLines(leftColumn);
    const rightLines = groupWordsIntoLines(rightColumn);

    // Sanity gate: real label lines are short (1-3 words). If the "left column" this
    // page produced is mostly long lines, the page is actually single-column prose with
    // an isolated label:value pair embedded in it (confirmed case: Ch2 page 2, "Usual
    // preop diagnosis" sitting inside the ERAS paragraph) -- reconstructColumns's single
    // biggest-gap heuristic breaks down there and produces garbage, not a real box. Bail
    // rather than emit corrupted values; the procedure's `description` text still has
    // the true content for a QA reviewer to pull from.
    const avgWordsPerLeftLine = leftLines.reduce((sum, l) => sum + l.text.split(' ').length, 0) / Math.max(leftLines.length, 1);
    if (avgWordsPerLeftLine > 3) continue;

    // Find label lines in the left column (allowing 2-line wrapped labels, e.g.
    // "Special" + "instrumentation"), then take every right-column line whose y falls
    // between this label's y and the next label's y as that label's value.
    const labelHits: { label: string; y: number }[] = [];
    for (const label of labels) {
      const parts = label.split(' ');
      for (const line of leftLines) {
        if (line.text.trim().toLowerCase() === parts[0].toLowerCase() ||
            line.text.trim().toLowerCase().startsWith(label.toLowerCase())) {
          labelHits.push({ label, y: line.y });
          break;
        }
      }
    }
    if (labelHits.length === 0) continue;
    // Bound the box's bottom edge by the last LEFT-column (label) line on this page, not
    // by the page bottom -- otherwise the last field's value window silently swallows
    // whatever unrelated prose/bibliography follows the box on the same page (confirmed
    // bug: "Usual preop diagnosis" absorbing citation text from a Suggested Reading list
    // further down the same page).
    const lastLabelLineY = Math.max(...leftLines.map(l => l.y));
    labelHits.sort((a, b) => a.y - b.y);
    for (let i = 0; i < labelHits.length; i++) {
      const yStart = labelHits[i].y - 2;
      const yEnd = i + 1 < labelHits.length ? labelHits[i + 1].y - 2 : lastLabelLineY + 20;
      const valueLines = rightLines.filter(l => l.y >= yStart && l.y < yEnd).map(l => l.text.trim());
      if (valueLines.length > 0) {
        // The last field on a page can still pick up a trailing fragment of the next
        // box's heading (e.g. "PATIENT POPULATION CHARACTERISTICS") when that heading
        // starts very close below it -- strip it rather than leave it stitched onto a
        // real value (confirmed case: "Pain score": "1-2 CHARACTERISTICS").
        const value = valueLines.join(' ').replace(/\s+/g, ' ').trim()
          .replace(/\s*(PATIENT POPULATION )?CHARACTERISTICS\s*$/i, '').trim();
        if (value) result[labelHits[i].label] = value;
      }
    }
  }
  return result;
}

function extractChapter(jsonPath: string): { drafts: ProcedureDraft[]; droppedEmpty: { name: string; page: number }[] } {
  const doc: ParsedDocument = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const chapterSource = path.basename(jsonPath, '.json');
  const droppedEmpty: { name: string; page: number }[] = [];

  // Flatten sections in document order, remembering which fragment/page each came from.
  const flat: { section: ParsedSection; pageNumber: number }[] = [];
  for (const frag of doc.fragments) {
    for (const section of frag.parsedSections) {
      flat.push({ section, pageNumber: frag.pageNumber });
    }
  }
  const sections = flat.map(f => f.section);
  const anchors = mergeWrappedTitles(sections);

  const drafts: ProcedureDraft[] = [];
  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    const spanStart = anchor.endIdx + 1;
    const spanEnd = a + 1 < anchors.length ? anchors[a + 1].startIdx - 1 : sections.length - 1;
    if (spanStart > spanEnd) continue;

    const spanPages = new Set(flat.slice(spanStart, spanEnd + 1).map(f => f.pageNumber));
    const startPage = Math.min(...spanPages);
    const endPage = Math.max(...spanPages);

    const bodyByHeading: Record<string, string[]> = {};
    let currentBucket = 'Description';
    let populationMarkerPage: number | null = null;
    let anestheticMarkerPage: number | null = null;
    for (let i = spanStart; i <= spanEnd; i++) {
      const s = sections[i];
      if (s.category === 'heading') {
        const h = s.heading.trim();
        if (/^description$/i.test(h)) currentBucket = 'Description';
        else if (/^variant procedure/i.test(h)) currentBucket = 'VariantApproaches';
        else if (/patient population/i.test(h)) { if (populationMarkerPage === null) populationMarkerPage = flat[i].pageNumber; /* not used for page-boundary math -- see note below */ }
        else if (/^anesthetic considerations?$/i.test(h)) { currentBucket = 'AnestheticConsiderations'; if (anestheticMarkerPage === null) anestheticMarkerPage = flat[i].pageNumber; }
        // Route bibliography out to a bucket nothing reads, so it can't bleed into
        // whichever real bucket was active when "Suggested Reading(s)" was hit (this
        // chapter's parser sometimes represents each numbered citation as its own
        // heading-category section, which -- now that heading-own-body text is captured
        // -- would otherwise get appended onto the anesthetic plan or description text).
        else if (/^suggested read/i.test(h) || CITATION_RE.test(h)) currentBucket = 'Citations';
        else if (BOILERPLATE_HEADING_RE.test(h)) { /* section marker, keep current bucket */ }
        // A heading-category section's OWN body is sometimes the entire content for
        // that sub-section rather than an empty label with a separate following
        // paragraph (confirmed: "ANESTHETIC CONSIDERATIONS" carrying "See Anesthetic
        // Considerations following Repair of X" directly as its own body for
        // cross-referenced procedures) -- capture it into whichever bucket it just
        // switched to, don't discard it just because this section is heading-category.
        if (!bodyByHeading[currentBucket]) bodyByHeading[currentBucket] = [];
        if (s.body && s.body.trim()) bodyByHeading[currentBucket].push(s.body.trim());
        continue;
      }
      if (!bodyByHeading[currentBucket]) bodyByHeading[currentBucket] = [];
      if (s.body && s.body.trim()) bodyByHeading[currentBucket].push(s.body.trim());
    }

    const anestheticRaw = (bodyByHeading['AnestheticConsiderations'] || []).join('\n\n');
    const seeMatch = anestheticRaw.match(/See Anesthetic Considerations (?:for|following) ([^.\n]+)/i);

    // The Surgical Considerations box's tail and the Patient Population box's start
    // routinely share one physical page (confirmed: Ch2 Cataract Extraction has "Pain
    // score" and "■ PATIENT POPULATION CHARACTERISTICS" both on page 4) -- a hard
    // page-number boundary between the two label sets wrongly excludes that whole shared
    // page from one of them. Instead, run both label sets over the same box-page range
    // (span start through the ANESTHETIC CONSIDERATIONS marker, or span end) and let
    // restrictToBoxBand's per-label-vocabulary Y-floor detection separate them --
    // surgical labels don't match population vocabulary or vice versa, so there's no
    // cross-contamination in which label gets matched, only a (small, accepted) risk of
    // the last field's value window slightly overrunning into the next box's heading.
    const sortedSpanPages = [...spanPages].sort((a, b) => a - b);
    const boxPages = new Set(sortedSpanPages.filter(p => p <= (anestheticMarkerPage ?? endPage)));

    // One merged pass across BOTH label vocabularies together (not two separate calls) --
    // each label's value-window neighbor must be whichever label (surgical OR population)
    // actually comes next on the page, or the last surgical field's window overruns into
    // the population box's content that follows it on the same shared page (confirmed:
    // "Pain score" was absorbing the entire Patient Population box's text before this fix).
    const relevantFragments = doc.fragments.filter(f => spanPages.has(f.pageNumber));
    const fields = anchor.type === 'procedure'
      ? extractFieldsFromPages(relevantFragments, boxPages, [...SURGICAL_FIELD_LABELS, ...POPULATION_FIELD_LABELS])
      : {};

    if (anchor.type === 'sharedPlan') {
      drafts.push({
        type: 'sharedPlan',
        name: anchor.heading,
        chapterSource, startPage, endPage,
        description: '', variantApproaches: '', fields: {},
        anestheticConsiderationsRaw: [...(bodyByHeading['Description'] || []), ...(bodyByHeading['VariantApproaches'] || []), ...(bodyByHeading['AnestheticConsiderations'] || [])].join('\n\n'),
        crossReferenceTarget: null,
        rawSpanPreview: flat.slice(spanStart, Math.min(spanStart + 3, spanEnd + 1)).map(f => f.section.body).join(' ').slice(0, 300),
      });
      continue;
    }

    // Drop anchors with nothing extracted at all -- these are USUALLY chapter/section
    // title pages (e.g. the "DENTAL SURGERY" top-of-chapter byline block), not real
    // procedures, but occasionally a real procedure's content genuinely fails to land in
    // any bucket (a parsing edge case, not a content gap in the book). Never drop this
    // silently -- a human/AI QA pass over the draft must be able to see it happened and
    // go pull that procedure's content directly from the source instead.
    const hasContent = bodyByHeading['Description']?.length || bodyByHeading['VariantApproaches']?.length ||
      Object.keys(fields).length > 0 || anestheticRaw.trim().length > 0;
    if (!hasContent) {
      droppedEmpty.push({ name: anchor.heading, page: startPage });
      continue;
    }

    drafts.push({
      type: 'procedure',
      name: anchor.heading,
      chapterSource,
      startPage,
      endPage,
      description: (bodyByHeading['Description'] || []).join('\n\n'),
      variantApproaches: (bodyByHeading['VariantApproaches'] || []).join('\n\n'),
      fields,
      anestheticConsiderationsRaw: anestheticRaw,
      crossReferenceTarget: seeMatch ? seeMatch[1].trim() : null,
      rawSpanPreview: flat.slice(spanStart, Math.min(spanStart + 3, spanEnd + 1)).map(f => f.section.body).join(' ').slice(0, 300),
    });
  }
  return { drafts, droppedEmpty };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx tsx src/jaffe_tools/extract_jaffe_procedures.ts "src/parsed texts/Jaffe_AMSP_6th_Edition_Chapter_N.json"');
    process.exit(1);
  }
  const { drafts, droppedEmpty } = extractChapter(inputPath);
  const chapterSlug = path.basename(inputPath, '.json');
  const outDir = path.resolve('scratch/jaffe_drafts');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${chapterSlug}_draft.json`);
  fs.writeFileSync(outPath, JSON.stringify({ _NEEDS_MANUAL_QA: droppedEmpty, procedures: drafts }, null, 2));
  console.log(`Extracted ${drafts.length} candidate spans -> ${outPath}`);
  if (droppedEmpty.length > 0) {
    console.warn(`  WARNING: ${droppedEmpty.length} title(s) matched but produced no extractable content -- these procedures are MISSING from the draft and must be pulled from source by hand during QA:`);
    for (const d of droppedEmpty) console.warn(`    - "${d.name}" (near page ${d.page})`);
  }
}

main();
