#!/usr/bin/env node
/**
 * chapter_to_md.mjs — faithful chapter -> Markdown (complete, no extras)
 * ============================================================================
 * Renders an already-parsed chapter into a single clean Markdown document that
 * omits NOTHING from the chapter. Unlike the podcast builder, it:
 *   - renders from `full_extracted_text` (the most complete field), so no prose
 *     is dropped,
 *   - adds no production brief / instructions / commentary — just the chapter,
 *   - promotes the chapter's own headings and reflows PDF-wrapped lines into
 *     readable paragraphs, while preserving short-line blocks (inline tables /
 *     lists) as separate lines.
 *
 * Figure and table captions are already inline in the extracted text, so they
 * are not duplicated into a separate appendix. Extractor "--- PAGE BREAK ---"
 * markers are structural, not chapter content, so they are dropped.
 *
 * USAGE
 *   npm run chapter-md -- morgan 8
 *   npm run chapter-md -- millers 13 --out some/dir
 *
 * Output: chapter_docs/<book>_chapter_<N>.md (path is printed).
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PARSED_DIR = path.join(REPO_ROOT, 'src', 'parsed texts');

const BOOKS = {
  millers: { aliases: ['millers', 'miller', 'm'], filePrefix: 'Millers_Anaesthesia_9th_Edition_Chapter_', outPrefix: 'millers_chapter_' },
  jaffe: { aliases: ['jaffe', 'j'], filePrefix: 'Jaffe_AMSP_6th_Edition_Chapter_', outPrefix: 'jaffe_chapter_' },
  morgan: { aliases: ['morgan', 'mikhail', 'mm'], filePrefix: 'Morgan_Mikhail_Chapter_', outPrefix: 'morgan_chapter_' },
};

function resolveBook(tok) {
  const t = String(tok).toLowerCase();
  for (const [k, cfg] of Object.entries(BOOKS)) if (cfg.aliases.includes(t)) return k;
  return null;
}

// C0 control chars except tab and newline (kept — newlines drive block logic).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const BULLET_GLYPHS = /[•‣⁃■-◿␀-␿·●▪]/;
const MARKER_LINE_RE = /^(?:CHAPTER|SECTION)\s+\d+(?:\.\d+)?$/i;
const PAGE_BREAK_RE = /^-{2,}\s*PAGE BREAK\s*-{2,}$/i;
const LETTER_SUBHEAD_RE = /^[A-Z]\.\s+[A-Z][A-Za-z]/; // "A. Cardiovascular"
const TERMINAL_END_RE = /[.!?:”"')\]]\s*$/; // paragraph looks complete
// A repeated page running header, e.g. "SECTION II • Anesthetic Physiology".
const RUNNING_HEADER_RE = /^SECTION\s+[IVXLC0-9]+\s*[•·].+/i;
const PAGE_NUM_RE = /^\d{1,4}$/; // a lone page-number line

/**
 * Author byline? Specific to name lists so real headings that contain "AND"
 * (e.g. "LEARNING AND MEMORY") are NOT misread as bylines. A byline has middle
 * initials ("ROBERT A. PEARCE") next to "and"/a comma, or 2+ commas.
 */
function isByline(h) {
  if (/[†‡]/.test(h)) return true;
  const commas = (h.match(/,/g) || []).length;
  const initials = /\b[A-Z]\.(?:\s|$)/.test(h);
  if (initials && (/\band\b/i.test(h) || commas >= 1)) return true;
  return commas >= 2 && /\band\b/i.test(h);
}

const norm = (s) => (s || '').normalize('NFC').replace(CONTROL_CHARS, ' ').replace(/[ \t]+/g, ' ').trim();

/** Collapse a leading marker-glyph run into a real bullet. */
function bulletize(line) {
  return line.replace(/^([•‣⁃■-◿␀-␿·●▪\s]{1,5})(?=\S)/, (m) =>
    BULLET_GLYPHS.test(m) ? '- ' : m,
  );
}

/** 'caps' if the heading is essentially all-caps, else 'title'. */
function headingStyle(h) {
  const letters = (h.match(/[A-Za-z]/g) || []).length;
  const upper = (h.match(/[A-Z]/g) || []).length;
  return letters > 0 && upper / letters > 0.7 ? 'caps' : 'title';
}

/** ## for ALL-CAPS majors/agents and "... of Inhalation Anesthetics"; ### otherwise. */
function headingLevel(h) {
  if (/of Inhalation Anesthetics$/i.test(h)) return 2;
  return headingStyle(h) === 'caps' ? 2 : 3;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Emit a buffered run of body lines: join wrapped prose, keep real list blocks. */
function flushPara(buf, out) {
  if (!buf.length) return;
  const lines = buf.map(bulletize);
  const anyBullet = lines.some((l) => l.startsWith('- '));
  // A true list/table block is several genuinely short lines (not a prose
  // paragraph whose last wrapped line just happens to be short).
  if (anyBullet || (lines.length >= 3 && median(lines.map((l) => l.length)) < 45)) {
    out.push({ t: 'p', s: lines.join('  \n') });
  } else {
    out.push({ t: 'p', s: lines.join(' ') });
  }
  buf.length = 0;
}

function buildDoc(book, chapter, json) {
  const meta = json.parse_metadata || {};
  const fragments = json.fragments || [];
  const fet = (json.full_extracted_text || '').normalize('NFC').replace(CONTROL_CHARS, ' ');

  // Known headings from the structured parse (authoritative structure cues).
  const headingSet = new Set();
  for (const f of fragments) for (const s of f.parsedSections || []) {
    if (s.category === 'heading') { const h = norm(s.heading); if (h) headingSet.add(h); }
  }
  const isHeading = (line) => {
    const n = norm(line);
    if (!n || MARKER_LINE_RE.test(n) || RUNNING_HEADER_RE.test(n) || isByline(n)) return false;
    return headingSet.has(n) || LETTER_SUBHEAD_RE.test(n);
  };

  const rawLines = fet.split('\n');
  // Page furniture (blank, page break, "CHAPTER N", running header, lone page
  // number) is structural, not chapter content, so it is dropped.
  const isSep = (n) =>
    !n || PAGE_BREAK_RE.test(n) || MARKER_LINE_RE.test(n) || RUNNING_HEADER_RE.test(n) || PAGE_NUM_RE.test(n);

  // Title: the leading Title-Case line(s) at the very top, before the author
  // byline / "KEY POINTS" / the first ALL-CAPS section heading. Handles wrapped
  // multi-line titles (e.g. "Inhaled Anesthetic Uptake, Distribution, ...").
  const titleLines = [];
  let lastTitleIdx = -1;
  for (let k = 0; k < rawLines.length && titleLines.length < 5; k++) {
    const n = norm(rawLines[k]);
    if (!n || isSep(n)) continue;
    if (isByline(n) || /^KEY (POINTS|CONCEPTS)$/i.test(n) || headingStyle(n) === 'caps') break;
    titleLines.push(n);
    lastTitleIdx = k;
  }
  const title = titleLines.length ? titleLines.join(' ') : null;

  const out = [];
  const buf = [];

  // Body starts after the title lines (so the title isn't repeated as body).
  for (let i = lastTitleIdx + 1; i < rawLines.length; i++) {
    const line = norm(rawLines[i]);
    if (isSep(line)) { flushPara(buf, out); continue; }

    if (isHeading(line)) {
      flushPara(buf, out);
      const hd = [line];
      // Merge continuation heading lines across blank/page-break separators,
      // but only when they share the same case-style (a wrapped heading), so we
      // don't glue a distinct next heading (e.g. "NITROUS OXIDE" + "Physical
      // Properties") together.
      // Only ALL-CAPS headings wrap across lines here; Title-Case ones don't, so
      // never glue e.g. "Effects on Organ Systems" onto "A. Cardiovascular".
      // A continuation is the next ALL-CAPS line (short, not a running header /
      // letter subhead) — accepted even if it wasn't tagged as its own heading,
      // since body prose is never all-caps. Cap at 2 continuation lines.
      const canMerge = headingStyle(line) === 'caps';
      let j = i + 1;
      while (canMerge && hd.length < 3 && j < rawLines.length) {
        const n = norm(rawLines[j]);
        if (isSep(n)) { j++; continue; }
        const capsCont = headingStyle(n) === 'caps' && n.length < 60 && !LETTER_SUBHEAD_RE.test(n);
        if (capsCont && (isHeading(n) || /[-―—]$|\b(AND|OF|THE|TO|A|AN|FOR|IN|OR)$/.test(hd[hd.length - 1]) || !TERMINAL_END_RE.test(hd[hd.length - 1]))) {
          hd.push(n); i = j; j++; continue;
        }
        break;
      }
      const h = hd.join(' ');
      out.push({ t: 'h', s: `${'#'.repeat(headingLevel(h))} ${h}` });
      continue;
    }
    buf.push(line);
  }
  flushPara(buf, out);

  // Stitch continuation paragraphs: a body paragraph that does not end like a
  // finished sentence absorbs the next body paragraph (repairs mid-sentence
  // page/blank breaks, e.g. in KEY CONCEPTS).
  const merged = [];
  for (const node of out) {
    const prev = merged[merged.length - 1];
    if (
      node.t === 'p' && prev && prev.t === 'p' &&
      !prev.s.includes('  \n') && !node.s.includes('  \n') &&
      !TERMINAL_END_RE.test(prev.s)
    ) {
      prev.s = `${prev.s} ${node.s}`;
    } else {
      merged.push(node);
    }
  }

  const bodyMd = merged
    .map((n) => (n.t === 'h' ? `\n${n.s}\n` : n.s))
    .join('\n\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  const header = [
    `# ${title ? `Chapter ${chapter} — ${title}` : `Chapter ${chapter}`}`,
    '',
    `<!-- Faithful full-text render of ${meta.source_file || book + ' ch.' + chapter}` +
      (meta.total_pages ? `, ${meta.total_pages} pages, ${meta.total_characters_extracted} chars` : '') +
      `. Regenerate: npm run chapter-md -- ${book} ${chapter} -->`,
  ].join('\n');

  return header + '\n\n' + bodyMd + '\n';
}

function main() {
  const argv = process.argv.slice(2);
  let outDir = path.join(REPO_ROOT, 'chapter_docs');
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') outDir = path.resolve(argv[++i]);
    else pos.push(argv[i]);
  }
  let book = 'millers', chapterTok;
  const mb = resolveBook(pos[0]);
  if (mb) { book = mb; chapterTok = pos[1]; } else { chapterTok = pos[0]; }
  const chapter = Number(chapterTok);
  if (!Number.isInteger(chapter)) {
    console.error('Usage: npm run chapter-md -- <book> <chapter>   (book: millers|jaffe|morgan)');
    process.exit(1);
  }
  const cfg = BOOKS[book];
  const jsonPath = path.join(PARSED_DIR, `${cfg.filePrefix}${chapter}.json`);
  if (!fs.existsSync(jsonPath)) { console.error(`No parsed JSON: ${path.basename(jsonPath)}`); process.exit(1); }

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = buildDoc(book, chapter, json);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${cfg.outPrefix}${chapter}.md`);
  fs.writeFileSync(outPath, md);
  console.log(`✓ ${path.relative(REPO_ROOT, outPath)} (${(Buffer.byteLength(md) / 1024).toFixed(0)} KB)`);
}

main();
