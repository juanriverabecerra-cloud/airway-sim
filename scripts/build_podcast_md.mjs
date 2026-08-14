#!/usr/bin/env node
/**
 * build_podcast_md.mjs — Podcast source builder / retrieval CLI
 * ============================================================================
 * Turns an already-parsed chapter (the JSON the ingestion pipeline drops into
 * `src/parsed texts/`) into a single, clean, podcast-ready Markdown file and
 * files it under `podcast_source/` so you can retrieve it later by chapter.
 *
 * This does NOT re-parse the PDF. It reuses the simulator's existing parse
 * output (fragments + parsedSections + visual_data_engines), which is why it
 * runs instantly and needs no API keys or Python.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 *   npm run podcast -- list                 # what chapters can I build?
 *   npm run podcast -- 13                    # Miller's Ch.13 -> podcast_source/millers_chapter_13.md
 *   npm run podcast -- millers 13            # explicit book
 *   npm run podcast -- jaffe 7               # Jaffe Ch.7
 *   npm run podcast -- all                   # build every available chapter
 *   npm run podcast -- millers all           # build every Miller's chapter
 *
 * FLAGS
 *   --out <dir>          output directory (default: podcast_source/)
 *   --no-tables          omit the figure data-table appendix (captions kept)
 *   --show-source        print the real source book/edition in the visible
 *                        title (default: kept only in an HTML comment)
 *   --force              rebuild even if the .md is newer than the JSON
 *
 * You "retrieve" a built chapter simply by opening the file it reports, e.g.
 * `podcast_source/millers_chapter_13.md`. `podcast_source/INDEX.md` is an
 * auto-maintained manifest of everything built so far.
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PARSED_DIR = path.join(REPO_ROOT, 'src', 'parsed texts');

// Known source books: how their parsed-JSON filenames are shaped, plus the
// generic (non-branded) label used in the visible output. `filePrefix` /
// `fileSuffix` sandwich the chapter number in the on-disk JSON name.
const BOOKS = {
  millers: {
    aliases: ['millers', 'miller', 'm'],
    filePrefix: 'Millers_Anaesthesia_9th_Edition_Chapter_',
    fileSuffix: '.json',
    outPrefix: 'millers_chapter_',
    // Internal provenance only — never rendered as a visible citation unless
    // --show-source is passed (see the no-book-branding rule in CLAUDE.md).
    sourceLabel: "Miller's Anesthesia, 9th Edition",
  },
  jaffe: {
    aliases: ['jaffe', 'j'],
    filePrefix: 'Jaffe_AMSP_6th_Edition_Chapter_',
    fileSuffix: '.json',
    outPrefix: 'jaffe_chapter_',
    sourceLabel: "Jaffe's Anesthesiologist's Manual of Surgical Procedures, 6th Edition",
  },
  morgan: {
    aliases: ['morgan', 'mikhail', 'mm'],
    filePrefix: 'Morgan_Mikhail_Chapter_',
    fileSuffix: '.json',
    outPrefix: 'morgan_chapter_',
    sourceLabel: "Morgan & Mikhail's Clinical Anesthesiology",
  },
};

function resolveBook(token) {
  const t = String(token).toLowerCase();
  for (const [key, cfg] of Object.entries(BOOKS)) {
    if (cfg.aliases.includes(t)) return key;
  }
  return null;
}

/** Scan the parsed-texts dir and return {book, chapter, jsonPath} for each file. */
function discoverChapters() {
  const out = [];
  let files = [];
  try {
    files = fs.readdirSync(PARSED_DIR);
  } catch {
    return out;
  }
  for (const [book, cfg] of Object.entries(BOOKS)) {
    for (const f of files) {
      if (f.startsWith(cfg.filePrefix) && f.endsWith(cfg.fileSuffix)) {
        const mid = f.slice(cfg.filePrefix.length, f.length - cfg.fileSuffix.length);
        const n = Number(mid);
        if (Number.isInteger(n)) {
          out.push({ book, chapter: n, jsonPath: path.join(PARSED_DIR, f) });
        }
      }
    }
  }
  out.sort((a, b) => (a.book < b.book ? -1 : a.book > b.book ? 1 : a.chapter - b.chapter));
  return out;
}

// ---------------------------------------------------------------------------
// Text cleaning
// ---------------------------------------------------------------------------

// Decorative glyphs PDF extraction leaves where a list marker used to be
// (bullet, geometric shapes, control-pictures like open-box U+2423, middle dot).
const BULLET_GLYPHS = /[\u2022\u2023\u2043\u25A0-\u25FF\u2400-\u243F\u00B7\u25CF\u25AA]/;
// Same set, plus whitespace, for matching a whole leading marker run.
const BULLET_RUN = /^([\u2022\u2023\u2043\u25A0-\u25FF\u2400-\u243F\u00B7\u25CF\u25AA\s]{1,5})(?=\S)/;
// C0 control chars (form-feed etc.); tab and newline are preserved by the split below.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Strip control chars, normalize unicode + whitespace. Non-destructive to prose. */
function cleanText(s) {
  if (!s) return '';
  let t = String(s).normalize('NFC').replace(CONTROL_CHARS, ' ');
  t = t
    .split('\n')
    .map((line) => {
      let l = line.replace(/[ \t]+/g, ' ').trim();
      // A leading run of marker glyphs -> a real Markdown bullet.
      l = l.replace(BULLET_RUN, (m) => (BULLET_GLYPHS.test(m) ? '- ' : m));
      return l;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t;
}

const RUNNING_HEADER_RE = /^SECTION\s+[IVXLC0-9]+\s*[•·\-–]/i;
// A bare structural marker line, e.g. "CHAPTER 13" / "SECTION 7.0" — it opens a
// chapter but is not itself a readable title (the real title is the next line).
const MARKER_LINE_RE = /^(?:CHAPTER|SECTION)\s+\d+(?:\.\d+)?$/i;

/** A line that is just a page number, or a known running header, or empty. */
function isNoiseLine(line) {
  const l = line.trim();
  if (!l) return true;
  if (/^\d{1,4}$/.test(l)) return true; // bare page number
  if (RUNNING_HEADER_RE.test(l)) return true;
  return false;
}

/** Author byline heading? (dagger-marked, or ALL-CAPS surnames joined by "and"). */
function isByline(h) {
  if (/[†‡]/.test(h)) return true; // dagger / double-dagger
  const letters = (h.match(/[A-Za-z]/g) || []).length;
  if (/\band\b/i.test(h) && letters > 0 && (h.match(/[A-Z]/g) || []).length / letters > 0.6) {
    return true;
  }
  return false;
}

/**
 * Classify a parsedSection heading string.
 *   'section'  -> promote to a Markdown "## " heading
 *   'noise'    -> a running header / label / equation glyph / byline; drop label
 *   'inline'   -> not a real heading; drop the label, keep the body as prose
 * `dropSet` holds headings that repeat so often across the chapter they are
 * clearly running headers or figure labels rather than section titles.
 */
function classifyHeading(rawHeading, dropSet) {
  const h = cleanText(rawHeading);
  if (!h) return 'inline';
  if (dropSet.has(h)) return 'noise';
  if (RUNNING_HEADER_RE.test(h)) return 'noise';
  if (MARKER_LINE_RE.test(h)) return 'noise';
  if (isByline(h)) return 'noise';

  const letters = (h.match(/[A-Za-z]/g) || []).length;
  const words = h.split(/\s+/).filter(Boolean);
  // Too few letters, or dominated by digits/symbols/glyphs => equation or label.
  if (letters < 4) return 'inline';
  if (letters / h.length < 0.55) return 'inline';
  // Short label with a colon+number, e.g. "PALV: 10", "PST: 6".
  if (/:\s*\d/.test(h) && words.length <= 2) return 'inline';

  const upperLetters = (h.match(/[A-Z]/g) || []).length;
  const upperRatio = upperLetters / letters;
  const isAllCaps = upperRatio > 0.85;
  const isTitleCase =
    words.length >= 2 && words.filter((w) => /^[A-Z]/.test(w)).length / words.length >= 0.6;

  // Real headings: ALL-CAPS multiword (or a known keyword), or Title Case multiword.
  if (isAllCaps && (words.length >= 2 || h.length >= 6)) return 'section';
  if (isTitleCase) return 'section';
  return 'inline';
}

/** Detect headings that repeat across the chapter (running headers, labels). */
function buildDropSet(fragments) {
  const freq = new Map();
  for (const frag of fragments) {
    for (const sec of frag.parsedSections || []) {
      const h = cleanText(sec.heading);
      if (h) freq.set(h, (freq.get(h) || 0) + 1);
    }
  }
  const drop = new Set();
  for (const [h, n] of freq) if (n >= 4) drop.add(h);
  return drop;
}

/** Best-effort chapter title from the first couple of pages' headings. */
function detectTitle(fragments, dropSet) {
  const early = [];
  for (const frag of (fragments || []).slice(0, 2)) {
    for (const sec of frag.parsedSections || []) early.push(cleanText(sec.heading));
  }
  for (const h of early) {
    if (!h) continue;
    if (dropSet.has(h)) continue;
    if (/^KEY POINTS$/i.test(h)) continue;
    if (RUNNING_HEADER_RE.test(h)) continue;
    if (/^SECTION\b/i.test(h)) continue; // e.g. "SECTION 7.0" — not a real title
    if (MARKER_LINE_RE.test(h)) continue; // e.g. "CHAPTER 1" marker, not the title
    if (isByline(h)) continue;
    const words = h.split(/\s+/).filter(Boolean);
    const letters = (h.match(/[A-Za-z]/g) || []).length;
    if (letters >= 4 && words.length >= 1 && words.length <= 12) return h;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Markdown assembly
// ---------------------------------------------------------------------------

/** Down-case fully-uppercase section headings to Title Case for reading. */
function toTitleish(h) {
  const letters = (h.match(/[A-Za-z]/g) || []).length;
  const upper = (h.match(/[A-Z]/g) || []).length;
  if (letters > 0 && upper / letters > 0.85) {
    const small = new Set(['of', 'the', 'and', 'in', 'to', 'a', 'an', 'for', 'or', 'on', 'with']);
    return h
      .toLowerCase()
      .split(/\s+/)
      .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }
  return h;
}

function renderProse(fragments, dropSet) {
  const parts = [];
  let lastHeading = null;
  for (const frag of fragments || []) {
    for (const sec of frag.parsedSections || []) {
      const kind = classifyHeading(sec.heading, dropSet);
      if (kind === 'section') {
        const h = cleanText(sec.heading);
        if (h && h !== lastHeading) {
          parts.push(`\n## ${toTitleish(h)}\n`);
          lastHeading = h;
        }
      }
      // Body: keep for section/inline/noise alike (noise labels often still
      // carry real prose in their body), minus per-line noise.
      const body = cleanText(sec.body)
        .split('\n')
        .filter((line) => !isNoiseLine(line))
        .join('\n')
        .trim();
      if (body) parts.push(body);
    }
  }
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function renderFigures(engines) {
  if (!engines || !engines.length) return '';
  const lines = ['\n## Reference Figures & Data Tables\n'];
  lines.push(
    "_Captions and any machine-read data tables associated with the chapter's figures. " +
      'Use these for concrete numbers, comparisons, and examples; skip any that read as garbled._\n',
  );
  let n = 0;
  for (const e of engines) {
    const caption = cleanText(e.caption);
    if (!caption) continue;
    n += 1;
    const figId = cleanText(e.id) || `FIG_${n}`;
    lines.push(`\n### ${figId} — ${caption}`);
    const md = e.details && e.details.markdown_representation;
    if (md) {
      const table = cleanText(md);
      // Only include if it actually looks tabular (has pipe-delimited rows).
      const rows = table.split('\n').filter((r) => r.includes('|'));
      if (rows.length >= 2) lines.push('\n' + rows.join('\n'));
    }
  }
  return n ? lines.join('\n') : '';
}

const PRODUCTION_BRIEF = `## Podcast Production Brief

_Instructions for the AI that will turn this into a podcast — edit freely, then paste the whole file in._

- **Format:** two-host conversational episode (a curious learner + an expert educator).
- **Audience:** clinicians and trainees; assume medical literacy but explain jargon on first use.
- **Length:** aim for ~15–20 minutes of spoken narration.
- **Do:** turn the section content below into a natural spoken dialogue, use the figure
  captions/tables for concrete numbers and examples, and add smooth transitions between topics.
- **Don't:** read equations or table pipes aloud verbatim, invent facts not present below, or
  cite any textbook, chapter, or publisher by name.
- **Structure:** cold open hook → the big picture → each major section as a beat → a recap of
  3–5 takeaways.
`;

function buildMarkdown({ book, chapter, json, opts }) {
  const bookCfg = BOOKS[book];
  const fragments = json.fragments || [];
  const engines = json.visual_data_engines || [];
  const meta = json.parse_metadata || {};

  const dropSet = buildDropSet(fragments);
  const title = detectTitle(fragments, dropSet);
  const heading = title ? `Chapter ${chapter} — ${toTitleish(title)}` : `Chapter ${chapter}`;

  const header = [];
  header.push(`# ${heading}${opts.showSource ? ` _(${bookCfg.sourceLabel})_` : ''}`);
  header.push('');
  header.push(`<!-- Auto-generated podcast source. Regenerate: npm run podcast -- ${book} ${chapter} -->`);
  // Provenance kept as a comment only (not user-visible narration) unless --show-source.
  header.push(
    `<!-- Provenance (internal): ${bookCfg.sourceLabel}, Chapter ${chapter}` +
      (meta.total_pages ? `, ${meta.total_pages} pages` : '') +
      `, generated ${new Date().toISOString()} -->`,
  );
  header.push('');

  const sections = [header.join('\n'), PRODUCTION_BRIEF];

  const prose = renderProse(fragments, dropSet);
  if (prose && prose.length > 40) {
    sections.push('## Chapter Content\n\n' + prose);
  } else {
    sections.push(
      '## Chapter Content\n\n' +
        "> ⚠️ No usable text could be extracted from this chapter's source " +
        '(likely a scanned/image-only PDF). ' +
        (meta.warnings && meta.warnings.length
          ? 'Parser warnings: ' + meta.warnings.map((w) => `\`${w}\``).join('; ')
          : '') +
        '\n>\n> Re-ingest with OCR before using this chapter for a podcast.',
    );
  }

  if (!opts.noTables) {
    const figs = renderFigures(engines);
    if (figs) sections.push(figs);
  } else {
    const caps = (engines || [])
      .map((e) => cleanText(e.caption))
      .filter(Boolean)
      .map((c) => `- ${c}`);
    if (caps.length) sections.push('## Figure Captions\n\n' + caps.join('\n'));
  }

  return sections.join('\n\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
}

// ---------------------------------------------------------------------------
// Index / manifest
// ---------------------------------------------------------------------------

function rebuildIndex(outDir) {
  let files = [];
  try {
    files = fs.readdirSync(outDir).filter((f) => f.endsWith('.md') && f !== 'INDEX.md');
  } catch {
    return;
  }
  const rows = files.sort().map((f) => {
    const full = path.join(outDir, f);
    let title = f;
    try {
      const firstLine = fs.readFileSync(full, 'utf8').split('\n', 1)[0];
      title = firstLine.replace(/^#\s*/, '').replace(/_\(.*\)_/, '').trim() || f;
    } catch {
      /* ignore */
    }
    let mtime = '';
    try {
      mtime = fs.statSync(full).mtime.toISOString().slice(0, 10);
    } catch {
      /* ignore */
    }
    return `| [${title}](${f}) | \`${f}\` | ${mtime} |`;
  });
  const md = [
    '# Podcast Source — Index',
    '',
    'Auto-generated Markdown chapters, ready to paste into a podcast-generating AI.',
    'Rebuild any chapter with `npm run podcast -- <book> <chapter>`.',
    '',
    '| Chapter | File | Built |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'INDEX.md'), md);
}

// ---------------------------------------------------------------------------
// Build one chapter
// ---------------------------------------------------------------------------

function buildOne(book, chapter, opts) {
  const cfg = BOOKS[book];
  const jsonPath = path.join(PARSED_DIR, `${cfg.filePrefix}${chapter}${cfg.fileSuffix}`);
  if (!fs.existsSync(jsonPath)) {
    return { ok: false, reason: `no parsed JSON for ${book} chapter ${chapter} (${path.basename(jsonPath)})` };
  }
  const outPath = path.join(opts.outDir, `${cfg.outPrefix}${chapter}.md`);

  if (!opts.force && fs.existsSync(outPath)) {
    try {
      if (fs.statSync(outPath).mtime >= fs.statSync(jsonPath).mtime) {
        return { ok: true, skipped: true, outPath };
      }
    } catch {
      /* fall through and rebuild */
    }
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return { ok: false, reason: `failed to parse JSON: ${e.message}` };
  }
  const md = buildMarkdown({ book, chapter, json, opts });
  fs.mkdirSync(opts.outDir, { recursive: true });
  fs.writeFileSync(outPath, md);
  return { ok: true, outPath, bytes: Buffer.byteLength(md) };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`Podcast source builder

  npm run podcast -- list                 list buildable chapters
  npm run podcast -- 13                    build Miller's Ch.13
  npm run podcast -- millers 13            build a specific book+chapter
  npm run podcast -- jaffe 7               build Jaffe Ch.7
  npm run podcast -- all                   build every available chapter
  npm run podcast -- millers all           build every Miller's chapter

Flags: --out <dir>  --no-tables  --show-source  --force
Output goes to podcast_source/ (see podcast_source/INDEX.md).`);
}

function main() {
  const argv = process.argv.slice(2);
  const opts = {
    outDir: path.join(REPO_ROOT, 'podcast_source'),
    noTables: false,
    showSource: false,
    force: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') opts.outDir = path.resolve(argv[++i] || opts.outDir);
    else if (a === '--no-tables') opts.noTables = true;
    else if (a === '--show-source') opts.showSource = true;
    else if (a === '--force') opts.force = true;
    else if (a === '-h' || a === '--help') {
      printUsage();
      return;
    } else positional.push(a);
  }

  const all = discoverChapters();

  if (!positional.length) {
    printUsage();
    return;
  }

  const cmd = positional[0].toLowerCase();

  if (cmd === 'list') {
    if (!all.length) {
      console.log('No parsed chapters found in src/parsed texts/.');
      return;
    }
    const byBook = {};
    for (const c of all) (byBook[c.book] ||= []).push(c.chapter);
    for (const [book, chs] of Object.entries(byBook)) {
      console.log(`${book} (${chs.length}): ${chs.sort((a, b) => a - b).join(', ')}`);
    }
    return;
  }

  // Determine (book, chapterSpec) from positional args.
  let book = 'millers';
  let chapterSpec = null;
  const maybeBook = resolveBook(positional[0]);
  if (maybeBook) {
    book = maybeBook;
    chapterSpec = positional[1];
  } else {
    chapterSpec = positional[0];
  }

  // Build the target list.
  let targets = [];
  if (cmd === 'all' && !maybeBook) {
    // `all` with no book -> every chapter of every book.
    targets = all.slice();
  } else if (chapterSpec === 'all' || chapterSpec === undefined) {
    // `<book> all`, or a bare book name -> every chapter of that book.
    targets = all.filter((c) => c.book === book);
  } else {
    const n = Number(chapterSpec);
    if (!Number.isInteger(n)) {
      console.error(`Not a chapter number: "${chapterSpec}". Try: npm run podcast -- list`);
      process.exitCode = 1;
      return;
    }
    targets = [{ book, chapter: n }];
  }

  if (!targets.length) {
    console.error('Nothing to build. Try: npm run podcast -- list');
    process.exitCode = 1;
    return;
  }

  let built = 0,
    skipped = 0,
    failed = 0;
  for (const t of targets) {
    const r = buildOne(t.book, t.chapter, opts);
    if (!r.ok) {
      failed += 1;
      console.error(`✗ ${t.book} ch.${t.chapter}: ${r.reason}`);
    } else if (r.skipped) {
      skipped += 1;
      console.log(
        `• ${t.book} ch.${t.chapter}: up-to-date (${path.relative(REPO_ROOT, r.outPath)}) — use --force to rebuild`,
      );
    } else {
      built += 1;
      console.log(
        `✓ ${t.book} ch.${t.chapter} → ${path.relative(REPO_ROOT, r.outPath)} (${(r.bytes / 1024).toFixed(0)} KB)`,
      );
    }
  }
  rebuildIndex(opts.outDir);
  if (targets.length > 1) {
    console.log(
      `\nDone: ${built} built, ${skipped} up-to-date, ${failed} failed. Index: ${path.relative(
        REPO_ROOT,
        path.join(opts.outDir, 'INDEX.md'),
      )}`,
    );
  }
}

main();
