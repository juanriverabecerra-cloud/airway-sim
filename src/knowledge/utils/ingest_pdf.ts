import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PipelineOrchestrator } from '../orchestrator.ts';
import { TokenOptimizer } from './token_optimizer.ts';
import { KnowledgeStore } from '../store.ts';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  dirname = path.dirname(fileURLToPath(import.meta.url));
}

async function main() {
  const rawArgs = process.argv.slice(2);
  // --force re-processes every matched PDF regardless of the JSON's mtime —
  // needed after a parser code change, since the source PDFs themselves
  // haven't changed (mtime-based skip only catches a changed PDF, not a
  // changed parser).
  const force = rawArgs.includes('--force');
  const args = rawArgs.filter(a => a !== '--force');
  const sourceMaterialDir = path.resolve(dirname, '../../airway_ingest/source_material');
  const parsedTextsDir = path.resolve(dirname, '../../parsed texts');

  // Ensure directories exist
  if (!fs.existsSync(sourceMaterialDir)) {
    fs.mkdirSync(sourceMaterialDir, { recursive: true });
  }
  if (!fs.existsSync(parsedTextsDir)) {
    fs.mkdirSync(parsedTextsDir, { recursive: true });
  }

  const toProcess: Array<{ pdfPath: string; filename: string }> = [];

  if (args.length === 0) {
    console.log(`Scanning default directory: ${sourceMaterialDir} for new/modified PDFs...`);
    const files = fs.readdirSync(sourceMaterialDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const file of files) {
      const pdfPath = path.join(sourceMaterialDir, file);
      const jsonFilename = file.replace(/\.pdf$/i, '') + '.json';
      const jsonPath = path.join(parsedTextsDir, jsonFilename);

      let needsProcessing = true;
      if (!force && fs.existsSync(jsonPath)) {
        const pdfStat = fs.statSync(pdfPath);
        const jsonStat = fs.statSync(jsonPath);
        if (jsonStat.mtimeMs >= pdfStat.mtimeMs) {
          needsProcessing = false;
        }
      }

      if (needsProcessing) {
        toProcess.push({ pdfPath, filename: file });
      }
    }
  } else {
    for (const arg of args) {
      const resolved = path.resolve(arg);
      if (!fs.existsSync(resolved)) {
        console.error(`ERROR: Path not found: ${resolved}`);
        process.exit(1);
      }

      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        if (resolved.toLowerCase().endsWith('.pdf')) {
          toProcess.push({ pdfPath: resolved, filename: path.basename(resolved) });
        } else {
          console.warn(`WARNING: Skipping non-PDF file: ${resolved}`);
        }
      } else if (stat.isDirectory()) {
        console.log(`Scanning directory: ${resolved} for new/modified PDFs...`);
        const files = fs.readdirSync(resolved).filter(f => f.toLowerCase().endsWith('.pdf'));
        for (const file of files) {
          const pdfPath = path.join(resolved, file);
          const jsonFilename = file.replace(/\.pdf$/i, '') + '.json';
          const jsonPath = path.join(parsedTextsDir, jsonFilename);

          let needsProcessing = true;
          if (!force && fs.existsSync(jsonPath)) {
            const pdfStat = fs.statSync(pdfPath);
            const jsonStat = fs.statSync(jsonPath);
            if (jsonStat.mtimeMs >= pdfStat.mtimeMs) {
              needsProcessing = false;
            }
          }

          if (needsProcessing) {
            toProcess.push({ pdfPath, filename: file });
          }
        }
      }
    }
  }

  if (toProcess.length === 0) {
    console.log('No new or modified PDF files found. Knowledge base is up-to-date.');
    process.exit(0);
  }

  console.log(`Found ${toProcess.length} PDF(s) needing parsing/ingestion.`);

  // Every insertProse/insertMatrix call normally re-saves the whole database
  // to disk (a multi-megabyte export+write). For a batch of many chapters
  // that dominates runtime, so defer it and flush periodically/at the end
  // instead. flush() still runs the same per-row INSERTs into the in-memory
  // db immediately — only the disk write is batched.
  await KnowledgeStore.init();
  KnowledgeStore.setDeferSave(true);

  const orchestrator = new PipelineOrchestrator();
  let successCount = 0;
  let failureCount = 0;

  for (const item of toProcess) {
    console.log(`\nParsing: ${item.filename}...`);

    const jsonFilename = item.filename.replace(/\.pdf$/i, '') + '.json';
    const outputPath = path.join(parsedTextsDir, jsonFilename);

    // Copy PDF to source_material folder if parsed from outside, so future
    // mtime-based "needs processing" checks work against a stable location.
    const targetPdfPath = path.join(sourceMaterialDir, item.filename);
    if (path.resolve(item.pdfPath) !== path.resolve(targetPdfPath)) {
      fs.copyFileSync(item.pdfPath, targetPdfPath);
      console.log(`  Copied source PDF to: ${targetPdfPath}`);
    }

    // skipFinalize: true — defer the global reindex/deploy/snapshot step until
    // the whole batch is done, instead of repeating it after every single file.
    const ok = await orchestrator.run(item.pdfPath, outputPath, { skipFinalize: true });
    if (ok) {
      successCount++;
    } else {
      failureCount++;
      console.error(`✗ Failed parsing ${item.filename}.`);
    }

    // Periodic safety checkpoint: if a long batch dies partway through,
    // don't lose everything ingested so far.
    if (successCount > 0 && successCount % 10 === 0) {
      KnowledgeStore.flush();
      console.log(`  [CHECKPOINT] Flushed database after ${successCount} chapters.`);
    }
  }

  console.log(`\n[BATCH SUMMARY] ${successCount} succeeded, ${failureCount} failed.`);

  // Stop deferring before recalculateAuthority/deploy — both need the actual
  // disk write to happen for real now.
  KnowledgeStore.setDeferSave(false);

  if (successCount > 0) {
    console.log('\n[AUTO-HYDRATION] Re-indexing and compiling database snapshot...');
    try {
      TokenOptimizer.compileGlobalDatabaseAndIndex();
      console.log('\n======================================================================');
      console.log(`Ingestion Complete! The simulator has successfully updated the database.`);
      console.log('======================================================================\n');
    } catch (err: any) {
      console.error('✗ Ingestion Compilation Failed:', err.message);
      KnowledgeStore.close();
      process.exit(1);
    }
  }

  KnowledgeStore.close();
  process.exit(failureCount > 0 ? 1 : 0);
}

main();
