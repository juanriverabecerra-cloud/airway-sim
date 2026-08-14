#!/usr/bin/env node
/**
 * podcastify.mjs — one command: PDF in, podcast Markdown out
 * ============================================================================
 * Drop PDFs into `podcast_inbox/`, run `npm run podcastify`, and this chains the
 * three existing steps for each file:
 *
 *     (split if multi-chapter)  ->  ingest-pdf  ->  build podcast markdown
 *
 * WHAT NEEDS INPUT
 *   - A single-chapter PDF named per convention (e.g.
 *     `Millers_Anaesthesia_9th_Edition_Chapter_52.pdf`) needs NOTHING extra —
 *     drop it and run.
 *   - A multi-chapter PDF needs a one-line-per-chapter "recipe" telling it where
 *     the chapters break (bookmarks are too unreliable to trust — see
 *     `npm run split-pdf -- <file> --list --scan <book>` to find the pages).
 *     Drop a sibling text file `<same-name>.recipe.txt` next to the PDF:
 *
 *         book = jaffe
 *         3 = 138-186
 *         4 = 187-264
 *
 *     (lines are `chapterNumber = firstPage-lastPage`, 1-based inclusive;
 *      `book =` or `prefix =` sets the naming; `#` starts a comment.)
 *
 * ----------------------------------------------------------------------------
 * USAGE
 *   npm run podcastify                         # process everything in podcast_inbox/
 *   npm run podcastify -- --dry-run            # show the plan, touch nothing
 *   npm run podcastify -- ~/Downloads/x.pdf                 # one file (convention-named)
 *   npm run podcastify -- ~/Downloads/x.pdf --book jaffe --ranges "3:138-186,4:187-264"
 *
 * FLAGS
 *   --dry-run     print the plan; do not split/ingest/build/move anything
 *   --vision      run the (slow, API-billed) figure-vision phase during ingest
 *                 (default OFF — the podcast build doesn't use it)
 *   --force       overwrite existing split PDFs / rebuild markdown
 *   --keep        don't move processed inbox files into podcast_inbox/done/
 *   --inbox <dir> use a different inbox folder (default: podcast_inbox/)
 *   --book <b> / --prefix <s> / --ranges "<N:a-b,...>"   for the one-file form
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_MATERIAL = path.join(REPO_ROOT, 'src', 'airway_ingest', 'source_material');
const PODCAST_OUT = path.join(REPO_ROOT, 'podcast_source');

// Mirrors BOOKS in build_podcast_md.mjs and KNOWN_PREFIXES in split_pdf.py.
const KNOWN = {
  millers: { prefix: 'Millers_Anaesthesia_9th_Edition_Chapter_', outPrefix: 'millers_chapter_' },
  jaffe: { prefix: 'Jaffe_AMSP_6th_Edition_Chapter_', outPrefix: 'jaffe_chapter_' },
  morgan: { prefix: 'Morgan_Mikhail_Chapter_', outPrefix: 'morgan_chapter_' },
};

function log(msg) {
  console.log(msg);
}

/** Identify a convention-named single-chapter PDF -> {book, chapter}. */
function matchConvention(filename) {
  for (const [book, cfg] of Object.entries(KNOWN)) {
    if (filename.startsWith(cfg.prefix) && filename.toLowerCase().endsWith('.pdf')) {
      const mid = filename.slice(cfg.prefix.length, filename.length - 4);
      const n = Number(mid);
      if (Number.isInteger(n)) return { book, chapter: n };
    }
  }
  return null;
}

/** Parse a recipe file/flag into { book, prefix, ranges: [{chapter, a, b}] }. */
function parseRecipeText(text) {
  const out = { book: null, prefix: null, ranges: [] };
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m = line.match(/^book\s*[=:]\s*(\S+)/i);
    if (m) { out.book = m[1].toLowerCase(); continue; }
    m = line.match(/^prefix\s*[=:]\s*(\S+)/i);
    if (m) { out.prefix = m[1]; continue; }
    m = line.match(/^(\d+)\s*[=:]\s*(\d+)\s*-\s*(\d+)$/);
    if (m) { out.ranges.push({ chapter: +m[1], a: +m[2], b: +m[3] }); continue; }
    log(`  ⚠️  ignored unrecognized recipe line: "${line}"`);
  }
  return out;
}

/** "3:138-186,4:187-264" -> [{chapter,a,b}] */
function parseRangesFlag(spec) {
  const ranges = [];
  for (const chunk of spec.split(',')) {
    const m = chunk.trim().match(/^(\d+)\s*:\s*(\d+)\s*-\s*(\d+)$/);
    if (!m) throw new Error(`bad --ranges chunk "${chunk}" (want N:start-end)`);
    ranges.push({ chapter: +m[1], a: +m[2], b: +m[3] });
  }
  return ranges;
}

function resolvePrefix({ book, prefix }) {
  if (prefix) return prefix;
  if (book && KNOWN[book]) return KNOWN[book].prefix;
  return null;
}

function run(cmd, args, extraEnv) {
  log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...(extraEnv || {}) },
  });
  return r.status === 0;
}

/**
 * Build a plan item from an inbox/direct PDF:
 *   { pdf, kind:'split'|'single'|'unresolved', book, prefix, ranges, chapters:[{book,chapter}], recipePath }
 */
function planForPdf(pdfPath, opts) {
  const filename = path.basename(pdfPath);
  const base = filename.replace(/\.pdf$/i, '');

  // 1) Explicit ranges (direct-form flag) or a sidecar recipe => split.
  let recipe = null;
  let recipePath = null;
  if (opts.ranges) {
    recipe = { book: opts.book, prefix: opts.prefix, ranges: parseRangesFlag(opts.ranges) };
  } else {
    const candidate = path.join(path.dirname(pdfPath), `${base}.recipe.txt`);
    if (fs.existsSync(candidate)) {
      recipePath = candidate;
      recipe = parseRecipeText(fs.readFileSync(candidate, 'utf8'));
      if (opts.book) recipe.book = opts.book;
      if (opts.prefix) recipe.prefix = opts.prefix;
    }
  }
  if (recipe && recipe.ranges.length) {
    const prefix = resolvePrefix(recipe);
    if (!prefix) {
      return { pdf: pdfPath, kind: 'unresolved', reason: 'recipe/ranges given but no book/prefix set' };
    }
    const book = recipe.book && KNOWN[recipe.book] ? recipe.book : null;
    const chapters = recipe.ranges.map((r) => ({
      book,
      chapter: r.chapter,
      outPrefix: book ? KNOWN[book].outPrefix : null,
    }));
    return { pdf: pdfPath, kind: 'split', book, prefix, ranges: recipe.ranges, chapters, recipePath };
  }

  // 2) Convention-named single-chapter PDF.
  const conv = matchConvention(filename);
  if (conv) {
    return {
      pdf: pdfPath,
      kind: 'single',
      book: conv.book,
      chapters: [{ book: conv.book, chapter: conv.chapter, outPrefix: KNOWN[conv.book].outPrefix }],
    };
  }

  // 3) Can't tell what to do.
  return {
    pdf: pdfPath,
    kind: 'unresolved',
    reason:
      'not a recognized single-chapter name and no recipe found. ' +
      'Rename it to a known convention, or add a "' + base + '.recipe.txt" next to it.',
  };
}

function main() {
  const argv = process.argv.slice(2);
  const opts = {
    dryRun: false, vision: false, force: false, keep: false,
    inbox: path.join(REPO_ROOT, 'podcast_inbox'),
    book: null, prefix: null, ranges: null,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--vision') opts.vision = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--keep') opts.keep = true;
    else if (a === '--inbox') opts.inbox = path.resolve(argv[++i]);
    else if (a === '--book') opts.book = (argv[++i] || '').toLowerCase();
    else if (a === '--prefix') opts.prefix = argv[++i];
    else if (a === '--ranges') opts.ranges = argv[++i];
    else if (a === '-h' || a === '--help') { log(headerHelp()); return; }
    else positional.push(a);
  }

  // Gather PDFs: a direct path, or scan the inbox.
  let pdfs = [];
  if (positional.length) {
    for (const p of positional) {
      const resolved = path.resolve(p);
      if (!fs.existsSync(resolved)) { console.error(`Not found: ${resolved}`); process.exitCode = 1; return; }
      pdfs.push(resolved);
    }
  } else {
    if (!fs.existsSync(opts.inbox)) {
      log(`Inbox ${path.relative(REPO_ROOT, opts.inbox)}/ doesn't exist yet — creating it.`);
      if (!opts.dryRun) fs.mkdirSync(opts.inbox, { recursive: true });
      log('Drop a PDF in there and re-run. (See its README.md.)');
      return;
    }
    pdfs = fs.readdirSync(opts.inbox)
      .filter((f) => f.toLowerCase().endsWith('.pdf'))
      .map((f) => path.join(opts.inbox, f));
    if (!pdfs.length) { log(`Nothing to do: no PDFs in ${path.relative(REPO_ROOT, opts.inbox)}/.`); return; }
  }

  // Build plans.
  const plans = pdfs.map((p) => planForPdf(p, opts));

  log('\n=== PLAN ===');
  for (const pl of plans) {
    const name = path.basename(pl.pdf);
    if (pl.kind === 'unresolved') { log(`  ✗ ${name}\n      ${pl.reason}`); continue; }
    if (pl.kind === 'single') {
      log(`  • ${name}  ->  single chapter: ${pl.book} ch.${pl.chapters[0].chapter}`);
    } else {
      const bits = pl.ranges.map((r) => `ch.${r.chapter}(p${r.a}-${r.b})`).join(', ');
      log(`  • ${name}  ->  split into: ${bits}   [${pl.book || pl.prefix}]`);
    }
  }

  const actionable = plans.filter((p) => p.kind !== 'unresolved');
  if (!actionable.length) { log('\nNothing actionable. See the messages above.'); process.exitCode = 1; return; }

  if (opts.dryRun) { log('\n(--dry-run: nothing was split, ingested, built, or moved.)'); return; }

  // 1) Materialize per-chapter PDFs into source_material.
  log('\n=== STEP 1: prepare per-chapter PDFs ===');
  for (const pl of actionable) {
    if (pl.kind === 'split') {
      const rangesSpec = pl.ranges.map((r) => `${r.chapter}:${r.a}-${r.b}`).join(',');
      const args = ['scripts/split_pdf.py', pl.pdf, '--ranges', rangesSpec, '--out', SOURCE_MATERIAL];
      if (pl.book) args.push('--book', pl.book); else args.push('--prefix', pl.prefix);
      if (opts.force) args.push('--force');
      if (!run('python3', args)) { console.error('Split failed; aborting.'); process.exitCode = 1; return; }
    } else {
      // single: copy into source_material so the no-arg ingest scan picks it up.
      const dest = path.join(SOURCE_MATERIAL, path.basename(pl.pdf));
      fs.mkdirSync(SOURCE_MATERIAL, { recursive: true });
      if (path.resolve(pl.pdf) !== path.resolve(dest)) fs.copyFileSync(pl.pdf, dest);
      log(`  ✓ staged ${path.basename(dest)}`);
    }
  }

  // 2) Ingest (mtime-guarded; picks up exactly the new/changed PDFs).
  log('\n=== STEP 2: ingest (parse PDFs -> JSON) ===');
  const env = opts.vision ? {} : { RUN_VISION: 'false' };
  if (!opts.vision) log('  (figure-vision phase OFF — pass --vision to enable; not needed for podcasts)');
  if (!run('npx', ['tsx', 'src/knowledge/utils/ingest_pdf.ts'], env)) {
    console.error('Ingest failed; aborting before build.'); process.exitCode = 1; return;
  }

  // 3) Build podcast markdown for every affected chapter.
  log('\n=== STEP 3: build podcast markdown ===');
  const built = [];
  for (const pl of actionable) {
    for (const ch of pl.chapters) {
      if (!ch.book) { log(`  ⚠️  ch.${ch.chapter}: custom prefix not recognized by the podcast builder — build it manually.`); continue; }
      if (run('node', ['scripts/build_podcast_md.mjs', ch.book, String(ch.chapter), '--force'])) {
        built.push(path.join(PODCAST_OUT, `${ch.outPrefix}${ch.chapter}.md`));
      }
    }
  }

  // 4) Tidy: move processed inbox files into done/ (inbox mode only).
  if (!opts.keep && !positional.length) {
    const doneDir = path.join(opts.inbox, 'done');
    fs.mkdirSync(doneDir, { recursive: true });
    for (const pl of actionable) {
      for (const f of [pl.pdf, pl.recipePath].filter(Boolean)) {
        try { fs.renameSync(f, path.join(doneDir, path.basename(f))); } catch { /* ignore */ }
      }
    }
    log(`\nMoved processed inbox files -> ${path.relative(REPO_ROOT, doneDir)}/`);
  }

  log('\n=== DONE ===');
  if (built.length) {
    log('Podcast source files ready:');
    for (const b of built) log(`  ${path.relative(REPO_ROOT, b)}`);
  } else {
    log('No markdown was produced — check the messages above.');
  }
}

function headerHelp() {
  return 'npm run podcastify [-- <pdf>] [--dry-run] [--vision] [--force] [--keep]\n' +
    '  Drop PDFs in podcast_inbox/ (multi-chapter files need a <name>.recipe.txt).\n' +
    '  Chains: split -> ingest -> build podcast markdown.';
}

main();
