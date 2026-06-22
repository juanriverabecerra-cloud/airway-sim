import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { TextExtractor } from './extractor/TextExtractor.ts';
import type { SourceFragment, ParsedDocument, VisualDataEngine } from './types/index.ts';
import { DataHygieneProcessor } from './parsers/DataHygieneProcessor.ts';
import { StrategyRouter } from './parsers/StrategyRouter.ts';
import { TokenOptimizer } from './utils/token_optimizer.ts';
import { KnowledgeStore } from './store.ts';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  dirname = path.dirname(fileURLToPath(import.meta.url));
}

/**
 * PipelineOrchestrator — the main entry point for parsing source material.
 * 
 * DESIGN PRINCIPLES:
 *   1. ZERO HALLUCINATION: Only outputs data actually found in source files.
 *   2. Layout-Aware Local-First: Executes entirely offline using PyMuPDF to extract
 *      reading flow, headings, and cropped figures without web APIs.
 *   3. Separation of Pipeline (Text vs Vision): Local text/graphic extraction runs first (Phase 1),
 *      and semantic vision enrichment runs optionally (Phase 2).
 */
export class PipelineOrchestrator {
  private extractor: TextExtractor;

  constructor() {
    this.extractor = new TextExtractor();
  }

  /**
   * Run the parsing pipeline on a single source file.
   *
   * @param sourceFilePath - Absolute path to the source file
   * @param outputPath - Absolute path where the parsed JSON should be saved
   * @param options.skipFinalize - When processing many files in a batch, skip the
   *   global reindex/deploy/snapshot step after each individual file (it would
   *   otherwise re-run once per file) and call PipelineOrchestrator.finalize()
   *   once after the whole batch completes instead.
   * @returns true if parsing and saving completed successfully, false on errors
   */
  public async run(sourceFilePath: string, outputPath: string, options: { skipFinalize?: boolean } = {}): Promise<boolean> {
    const fileName = path.basename(sourceFilePath);
    const fileExt = path.extname(sourceFilePath).toLowerCase();

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  AirwaySim Source Material Parser (Local-First Layout Ingestion)`);
    console.log(`${'='.repeat(70)}`);
    console.log(`  Source file:  ${fileName}`);
    console.log(`  Full path:    ${sourceFilePath}`);
    console.log(`  Output:       ${outputPath}`);
    console.log(`${'='.repeat(70)}\n`);

    // Validate source file exists
    if (!fs.existsSync(sourceFilePath)) {
      console.error(`[ERROR] Source file not found: ${sourceFilePath}`);
      return false;
    }

    const fileStat = fs.statSync(sourceFilePath);
    console.log(`[INFO] File size: ${fileStat.size.toLocaleString()} bytes`);

    // Phase 1: Local mandatory text and visual graphic extraction (completely offline)
    console.log(`\n[PHASE 1] Running local-first mandatory layout and figure extraction...`);
    const localResult = this.extractor.extractLocal(sourceFilePath);
    let fragments = localResult.fragments;
    let visual_data_engines = localResult.visual_data_engines;
    const warnings = localResult.warnings || [];

    if (fragments.length === 0) {
      console.error(`[ERROR] Extractor returned 0 fragments. This should not happen.`);
      return false;
    }

    // Apply strict L2S Data Hygiene Layer & Strategy Archetype Router
    console.log(`  [L2S] Applying data hygiene layer and archetype strategy routing...`);
    const hygiene = new DataHygieneProcessor();
    const router = new StrategyRouter();

    const sanitized = hygiene.sanitize(fragments, visual_data_engines);
    fragments = sanitized.fragments;
    visual_data_engines = sanitized.visualEngines;

    const routedEngines: VisualDataEngine[] = [];
    for (const engine of visual_data_engines) {
      const routed = await router.route(engine);
      routedEngines.push(routed);
    }
    visual_data_engines = routedEngines;

    // Phase 2: Visual Semantic Enrichment (asynchronous queue) — on by default;
    // set RUN_VISION=false to skip (e.g. no API key configured, or a fast offline-only run).
    const runVision = process.env.RUN_VISION !== 'false';
    if (runVision && visual_data_engines.length > 0) {
      console.log(`\n[PHASE 2] Starting visual semantic enrichment...`);
      const enrichResult = await this.extractor.enrichVisuals(visual_data_engines);
      visual_data_engines = enrichResult.engines;
      warnings.push(...enrichResult.warnings);
    } else {
      console.log(`\n[PHASE 2] Skipping visual semantic enrichment (RUN_VISION=false or no figures found).`);
    }

    // Step 2: Summarize extraction results
    const totalChars = fragments.reduce((sum, f) => sum + f.characterCount, 0);
    const textPages = fragments.filter(f => f.contentType === 'text').length;
    const imagePages = fragments.filter(f => f.contentType === 'image-only').length;
    const emptyPages = fragments.filter(f => f.contentType === 'empty').length;
    const mixedPages = fragments.filter(f => f.contentType === 'mixed').length;

    console.log(`\n[STEP 2] Extraction Summary:`);
    console.log(`  Total fragments:    ${fragments.length}`);
    console.log(`  Text pages:         ${textPages}`);
    console.log(`  Image-only pages:   ${imagePages}`);
    console.log(`  Mixed pages:        ${mixedPages}`);
    console.log(`  Empty pages:        ${emptyPages}`);
    console.log(`  Total chars:        ${totalChars.toLocaleString()}`);
    console.log(`  Visual figures:     ${visual_data_engines.length}`);

    // Build warnings
    if (totalChars === 0) {
      warnings.push(
        'No text could be extracted from this file. ' +
        'If this is a scanned/image-based PDF, OCR software (e.g. tesseract) is required to extract text. ' +
        'The parser only outputs what it can actually read from the file.'
      );
    }
    if (imagePages > 0) {
      warnings.push(
        `${imagePages} page(s) appear to be image-only with no extractable text. ` +
        'These pages may contain important content that requires OCR to extract.'
      );
    }

    // Step 3: Build the raw output document
    console.log(`\n[STEP 3] Building parsed document structure...`);
    const fullText = fragments
      .map(f => f.rawText)
      .filter(t => t.length > 0)
      .join('\n\n--- PAGE BREAK ---\n\n');

    const outputDoc: ParsedDocument = {
      parse_metadata: {
        source_file: fileName,
        source_path: sourceFilePath,
        file_size_bytes: fileStat.size,
        file_type: fileExt,
        parsed_at: new Date().toISOString(),
        parser_version: '2.1.0',
        total_pages: fragments.length,
        total_characters_extracted: totalChars,
        extraction_success: totalChars > 0,
        warnings
      },
      fragments,
      visual_data_engines,
      full_extracted_text: fullText
    };

    // Step 4: Save the final JSON
    console.log(`\n[STEP 4] Saving parsed output JSON...`);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(outputDoc, null, 2), 'utf-8');
    
    const outputSize = fs.statSync(outputPath).size;
    console.log(`  ✓ Success! Raw extracted document saved to: ${outputPath}`);
    console.log(`  Output size:  ${outputSize.toLocaleString()} bytes`);

    // Insert into the knowledge database (clears any prior rows for this filename first)
    console.log(`\n[STEP 5] Inserting parsed document into the knowledge database...`);
    try {
      // Idempotent: cheap no-op if a caller (e.g. a batch driver) already
      // initialized the store. Required here because nothing previously called
      // this before optimizeAndInsert() — it would throw "Database not
      // initialized" the moment the orchestrator was actually run.
      await KnowledgeStore.init();
      TokenOptimizer.optimizeAndInsert(outputDoc);
      if (!options.skipFinalize) {
        TokenOptimizer.compileGlobalDatabaseAndIndex();
      }
    } catch (optErr: unknown) {
      const errMsg = optErr instanceof Error ? optErr.message : String(optErr);
      console.error(`  [TOKEN OPTIMIZER ERROR] Failed to insert/compile database: ${errMsg}`);
    }

    // Print warnings if any
    if (warnings.length > 0) {
      console.log(`\n${'!'.repeat(70)}`);
      console.log(`  WARNINGS DURING EXTRACTION:`);
      for (const w of warnings) {
        console.log(`  ⚠ ${w}`);
      }
      console.log(`${'!'.repeat(70)}`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  EXTRACTION COMPLETE`);
    console.log(`  ${totalChars > 0 ? '✓ Text was extracted successfully.' : '✗ No text could be extracted.'}`);
    console.log(`${'='.repeat(70)}\n`);

    return true;
  }
}

const isMain = process.argv[1] && (
  fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) ||
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isMain) {
  const sourceDir = path.resolve(dirname, '../airway_ingest/source_material');
  const outputDir = path.resolve(dirname, '../parsed texts');

  // Ensure directories exist
  if (!fs.existsSync(sourceDir)) {
    fs.mkdirSync(sourceDir, { recursive: true });
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const selectedFile = process.argv[2];

  if (!selectedFile) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('  AirwaySim Source Material Parser v2.1 (Local-First)');
    console.log(`${'='.repeat(70)}`);
    console.log('');
    console.log('  Usage:');
    console.log('    npm start -- <filename>');
    console.log('');
    console.log('  Examples:');
    console.log('    npm start -- test.pdf');
    console.log('    npm start -- chapter1.md');
    console.log('    npm start -- notes.txt');
    console.log('');
    console.log(`  Source directory: ${sourceDir}`);
    console.log(`  Output directory: ${outputDir}`);
    console.log('');

    const files = fs.readdirSync(sourceDir).filter(f => !f.startsWith('.'));
    if (files.length === 0) {
      console.log('  Available files: (none)');
      console.log('');
      console.log('  → Place your source material files (PDF, PPTX, Images, MD, TXT) inside:');
      console.log(`    ${sourceDir}`);
    } else {
      console.log('  Available files in source_material/:');
      for (const f of files) {
        const stat = fs.statSync(path.join(sourceDir, f));
        const sizeKb = (stat.size / 1024).toFixed(1);
        console.log(`    • ${f} (${sizeKb} KB)`);
      }
    }
    console.log(`\n${'='.repeat(70)}\n`);
    process.exit(0);
  }

  const targetFile = path.resolve(sourceDir, selectedFile);
  if (!fs.existsSync(targetFile)) {
    console.error(`\n[ERROR] File not found: ${selectedFile}`);
    console.error(`Expected location: ${targetFile}`);
    console.error(`\nPlease verify the file exists inside: ${sourceDir}\n`);
    process.exit(1);
  }

  const fileNameWithoutExt = path.basename(targetFile, path.extname(targetFile));
  const targetOutput = path.resolve(outputDir, `${fileNameWithoutExt}.json`);

  const orchestrator = new PipelineOrchestrator();
  orchestrator.run(targetFile, targetOutput).then(success => {
    process.exit(success ? 0 : 1);
  }).catch((err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(errMsg);
    process.exit(1);
  });
}
