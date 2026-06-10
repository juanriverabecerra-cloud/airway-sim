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
  const parsedTextsDir = path.resolve(__dirname, "..", "parsed texts");
  
  console.log(`Scanning parsed JSON files in:\n  ${parsedTextsDir}\n`);

  if (!fs.existsSync(parsedTextsDir)) {
    console.error(`ERROR: Directory not found at ${parsedTextsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(parsedTextsDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log("No parsed JSON files found to ingest.");
    process.exit(0);
  }

  console.log(`Found ${files.length} parsed JSON file(s) for database ingestion.`);
  
  // Import TokenOptimizer dynamically to prevent circular dependencies at build-start
  Promise.all([
    import("./utils/token_optimizer.ts"),
    import("./store.ts")
  ]).then(async ([{ TokenOptimizer }, { KnowledgeStore }]) => {
    const dbFile = path.resolve(__dirname, "medical_truth.db");
    if (fs.existsSync(dbFile)) {
      console.log(`Clearing legacy database file at ${dbFile} to start a fresh clean build...`);
      try {
        fs.unlinkSync(dbFile);
        if (fs.existsSync(`${dbFile}-wal`)) fs.unlinkSync(`${dbFile}-wal`);
        if (fs.existsSync(`${dbFile}-shm`)) fs.unlinkSync(`${dbFile}-shm`);
      } catch (e: any) {
        console.warn(`Warning clearing legacy database:`, e.message);
      }
    }
    
    await KnowledgeStore.init();
    let successCount = 0;
    
    for (const file of files) {
      const filePath = path.join(parsedTextsDir, file);
      console.log(`\nIngesting: ${file}...`);
      
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const doc = JSON.parse(raw);
        
        // Run optimize and serialize (ingests, copies DB, builds index, builds snapshot wrapper)
        TokenOptimizer.optimizeAndSerialize(doc, filePath);
        successCount++;
        console.log(`✓ Successfully ingested and indexed ${file}`);
      } catch (err: any) {
        console.error(`✗ Failed to ingest ${file}:`, err.message);
      }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Batch Ingestion Complete: ${successCount}/${files.length} files processed successfully.`);
    console.log(`Database and precomputed search index compiled.`);
    console.log('='.repeat(70));
    
    // Clean close
    KnowledgeStore.close();
    process.exit(successCount > 0 ? 0 : 1);
  }).catch(err => {
    console.error("Failed to load TokenOptimizer:", err.message);
    process.exit(1);
  });
}

main();
