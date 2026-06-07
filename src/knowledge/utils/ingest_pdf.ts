import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  dirname = path.dirname(fileURLToPath(import.meta.url));
}

async function parseSinglePdf(pdfPath: string, filename: string): Promise<any> {
  const buffer = fs.readFileSync(pdfPath);
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  await pdf.load();
  const result = await pdf.getText();

  const fragments = result.pages.map((p: any) => {
    const pageNumStr = String(p.num).padStart(3, '0');
    return {
      id: `PAGE_${pageNumStr}`,
      sourceFile: filename,
      pageNumber: p.num,
      contentType: 'text',
      rawText: p.text,
      characterCount: p.text.length,
      parsedSections: []
    };
  });

  return {
    parse_metadata: {
      source_file: filename,
      source_path: pdfPath,
      file_size_bytes: buffer.length,
      file_type: '.pdf',
      parsed_at: new Date().toISOString(),
      parser_version: '3.0.0 (pdf-parse)',
      total_pages: result.total,
      total_characters_extracted: fragments.reduce((sum: number, f: any) => sum + f.characterCount, 0),
      extraction_success: true,
      warnings: []
    },
    fragments,
    visual_data_engines: []
  };
}

async function main() {
  const args = process.argv.slice(2);
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
      if (fs.existsSync(jsonPath)) {
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
          if (fs.existsSync(jsonPath)) {
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

  const processedJsonPaths: string[] = [];

  for (const item of toProcess) {
    console.log(`\nParsing: ${item.filename}...`);
    try {
      const outputJson = await parseSinglePdf(item.pdfPath, item.filename);
      const jsonFilename = item.filename.replace(/\.pdf$/i, '') + '.json';
      const outputPath = path.join(parsedTextsDir, jsonFilename);
      
      fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2), 'utf-8');
      console.log(`✓ Saved structured JSON to: ${outputPath}`);

      // Copy PDF to source_material folder if parsed from outside
      const targetPdfPath = path.join(sourceMaterialDir, item.filename);
      if (path.resolve(item.pdfPath) !== path.resolve(targetPdfPath)) {
        fs.copyFileSync(item.pdfPath, targetPdfPath);
        console.log(`✓ Copied source PDF to: ${targetPdfPath}`);
      }

      processedJsonPaths.push(outputPath);
    } catch (err: any) {
      console.error(`✗ Failed parsing ${item.filename}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n[AUTO-HYDRATION] Re-indexing and compiling database snapshot...');
  try {
    const { TokenOptimizer } = await import('./token_optimizer.ts');
    const { KnowledgeStore } = await import('../store.ts');

    await KnowledgeStore.init();

    // Ingest each newly parsed json document into SQLite database
    for (const jsonPath of processedJsonPaths) {
      const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      TokenOptimizer.optimizeAndInsert(doc);
    }

    // Run global authority rank recalculation, deployment, and indexing ONCE at the end
    TokenOptimizer.compileGlobalDatabaseAndIndex();

    KnowledgeStore.close();

    console.log('\n======================================================================');
    console.log(`Ingestion Complete! The simulator has successfully updated the database.`);
    console.log('======================================================================\n');
  } catch (err: any) {
    console.error('✗ Ingestion Compilation Failed:', err.message);
    process.exit(1);
  }
}

main();
