/**
 * generate_snapshot.ts
 *
 * Reads the parsed JSON textbook file and generates a TypeScript snapshot
 * file (medical_truth_snapshot.ts) containing ProseRecord[] and MatrixRecord[]
 * arrays for synchronous, browser-safe textbook search lookups.
 *
 * Usage:  npx tsx src/knowledge/generate_snapshot.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ── Paths ──────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.resolve(
  __dirname,
  "..",
  "parsed texts",
  "Millers_Anaesthesia_9th_Edition_9_10.json"
);
const OUTPUT_PATH = path.resolve(__dirname, "medical_truth_snapshot.ts");

// ── Types mirroring the parsed JSON structure ──────────────────────────────
interface ParsedSection {
  heading: string;
  body: string;
  startLine: number;
  category: string;
}

interface Fragment {
  id: string;           // e.g. "PAGE_001"
  sourceFile: string;
  pageNumber: number;
  contentType: string;
  rawText: string;
  characterCount: number;
  parsedSections: ParsedSection[];
}

interface VisualDataEngine {
  id: string;
  sourceFile: string;
  pageNumber: number;
  image_path: string;
  closest_text_heading: string;
  caption: string;
  archetype: string;
  details: Record<string, unknown>;
}

interface ParsedJSON {
  parse_metadata: Record<string, unknown>;
  fragments: Fragment[];
  visual_data_engines: VisualDataEngine[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Derive a stable prefix from the sourceFile, e.g. "Millers_9_10" */
function sourcePrefix(sourceFile: string): string {
  // "Millers_Anaesthesia_9th_Edition_9_10.pdf" → "Millers_9_10"
  const base = sourceFile.replace(/\.pdf$/i, "");
  const m = base.match(/^(\w+?)_.*?_(\d+(?:_\d+)*)$/);
  if (m) return `${m[1]}_${m[2]}`;
  return base.replace(/\s+/g, "_");
}

/** Zero-pad a page number to 3 digits */
function padPage(n: number): string {
  return String(n).padStart(3, "0");
}

/**
 * Escape a string so it is safe inside a TypeScript double-quoted string literal.
 * Handles: backslash, double-quote, newlines, carriage returns, tabs,
 * null bytes, and other control characters.
 */
function escapeTS(s: string): string {
  return s
    .replace(/\\/g, "\\\\")       // backslashes first
    .replace(/"/g, '\\"')          // double quotes
    .replace(/\n/g, "\\n")        // newlines
    .replace(/\r/g, "\\r")        // carriage returns
    .replace(/\t/g, "\\t")        // tabs
    .replace(/\0/g, "\\0")        // null
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, (ch) => {
      // Remaining control chars → unicode escape
      return "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
    });
}

/** True if heading is just numbers, whitespace, or empty */
function isJunkHeading(heading: string): boolean {
  return /^\s*$/.test(heading) || /^\s*\d+\s*$/.test(heading);
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  console.log(`Reading parsed JSON from:\n  ${INPUT_PATH}\n`);

  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`ERROR: Input file not found at ${INPUT_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_PATH, "utf-8");
  const data: ParsedJSON = JSON.parse(raw);

  // ── Build ProseRecords ─────────────────────────────────────────────────
  interface ProseRec {
    id: string;
    chapter_title: string;
    section_heading: string;
    body_text: string;
  }

  const proseRecords: ProseRec[] = [];

  for (const frag of data.fragments) {
    const prefix = sourcePrefix(frag.sourceFile);
    const pageStr = padPage(frag.pageNumber);

    for (let si = 0; si < frag.parsedSections.length; si++) {
      const sec = frag.parsedSections[si];
      const bodyText = (sec.body ?? "").trim();

      // Filter: skip empty or very short body
      if (bodyText.length < 30) continue;

      // Determine heading
      let heading = (sec.heading ?? "").trim();

      // Filter: skip junk headings
      if (isJunkHeading(heading)) {
        // Fallback: use first 60 chars of rawText
        heading = frag.rawText.substring(0, 60).trim();
      }

      // If heading is still junk after fallback, skip
      if (!heading || isJunkHeading(heading)) continue;

      const id = `${prefix}_PAGE_${pageStr}_sec_${si}`;

      proseRecords.push({
        id,
        chapter_title: frag.sourceFile,
        section_heading: heading,
        body_text: bodyText,
      });
    }
  }

  console.log(`Extracted ${proseRecords.length} ProseRecords from ${data.fragments.length} fragments.`);

  // ── Build MatrixRecords ────────────────────────────────────────────────
  interface MatrixRec {
    id: string;
    archetype: string;
    caption: string;
    structured_payload: string;
  }

  const matrixRecords: MatrixRec[] = [];

  if (data.visual_data_engines) {
    for (const vde of data.visual_data_engines) {
      matrixRecords.push({
        id: vde.id,
        archetype: vde.archetype,
        caption: (vde.caption ?? "").trim(),
        structured_payload: JSON.stringify(vde.details ?? {}),
      });
    }
  }

  console.log(`Extracted ${matrixRecords.length} MatrixRecords from visual_data_engines.\n`);

  // ── Render output TypeScript file ──────────────────────────────────────
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * AUTO-GENERATED MEDICAL TRUTH DATABASE SNAPSHOT`);
  lines.push(` * Do not edit this file directly. It is compiled automatically during textbook ingestion.`);
  lines.push(` * Provides synchronous, lag-free, and browser-safe textbook search lookups.`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`export interface ProseRecord {`);
  lines.push(`  readonly id: string;`);
  lines.push(`  readonly chapter_title: string;`);
  lines.push(`  readonly section_heading: string;`);
  lines.push(`  readonly body_text: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface MatrixRecord {`);
  lines.push(`  readonly id: string;`);
  lines.push(`  readonly archetype: string;`);
  lines.push(`  readonly caption: string;`);
  lines.push(`  readonly structured_payload: string;`);
  lines.push(`}`);
  lines.push(``);

  // ── textbookProse ──
  lines.push(`export const textbookProse: readonly ProseRecord[] = [`);
  for (let i = 0; i < proseRecords.length; i++) {
    const r = proseRecords[i];
    const comma = i < proseRecords.length - 1 ? "," : "";
    lines.push(`  {`);
    lines.push(`    "id": "${escapeTS(r.id)}",`);
    lines.push(`    "chapter_title": "${escapeTS(r.chapter_title)}",`);
    lines.push(`    "section_heading": "${escapeTS(r.section_heading)}",`);
    lines.push(`    "body_text": "${escapeTS(r.body_text)}"`);
    lines.push(`  }${comma}`);
  }
  lines.push(`];`);
  lines.push(``);

  // ── physiologicalMatrices ──
  lines.push(`export const physiologicalMatrices: readonly MatrixRecord[] = [`);
  for (let i = 0; i < matrixRecords.length; i++) {
    const r = matrixRecords[i];
    const comma = i < matrixRecords.length - 1 ? "," : "";
    lines.push(`  {`);
    lines.push(`    "id": "${escapeTS(r.id)}",`);
    lines.push(`    "archetype": "${escapeTS(r.archetype)}",`);
    lines.push(`    "caption": "${escapeTS(r.caption)}",`);
    lines.push(`    "structured_payload": "${escapeTS(r.structured_payload)}"`);
    lines.push(`  }${comma}`);
  }
  lines.push(`];`);
  lines.push(``);

  const output = lines.join("\n");

  fs.writeFileSync(OUTPUT_PATH, output, "utf-8");

  console.log(`Written ${output.length} bytes to:\n  ${OUTPUT_PATH}`);
  console.log(`  → ${proseRecords.length} ProseRecords`);
  console.log(`  → ${matrixRecords.length} MatrixRecords`);
  console.log(`\nDone.`);
}

main();
