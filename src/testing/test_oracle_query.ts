import type { ParsedDocument } from '../knowledge/types/index.ts';
import { TokenOptimizer } from '../knowledge/utils/token_optimizer.ts';
import { getAnatomicalTruth, closeQueryBridge } from './oracle_query.ts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  const filename = fileURLToPath(import.meta.url);
  dirname = path.dirname(filename);
}

// Let's mock a parsed document
const mockDoc: ParsedDocument = {
  parse_metadata: {
    source_file: 'anesthesia_handbook_chapter_9.pdf',
    source_path: '/path/to/anesthesia_handbook_chapter_9.pdf',
    file_size_bytes: 1024 * 1024,
    file_type: '.pdf',
    parsed_at: new Date().toISOString(),
    parser_version: '2.1.0',
    total_pages: 2,
    total_characters_extracted: 500,
    extraction_success: true,
    warnings: []
  },
  fragments: [
    {
      id: 'PAGE_001',
      sourceFile: 'anesthesia_handbook_chapter_9.pdf',
      pageNumber: 1,
      contentType: 'text',
      rawText: 'Propofol induces anesthesia by enhancing GABA-mediated inhibitory neurotransmission. It acts primarily on the GABAA receptor complex in the central nervous system, particularly in the locus ceruleus, causing neural hyperpolarization.',
      characterCount: 220,
      parsedSections: [
        {
          heading: 'Mechanism of Action of Propofol',
          body: 'Propofol induces anesthesia by enhancing GABA-mediated inhibitory neurotransmission. It acts primarily on the GABAA receptor complex in the central nervous system, particularly in the locus ceruleus, causing neural hyperpolarization.',
          startLine: 1,
          category: 'paragraph'
        }
      ]
    },
    {
      id: 'PAGE_002',
      sourceFile: 'anesthesia_handbook_chapter_9.pdf',
      pageNumber: 2,
      contentType: 'mixed',
      rawText: 'Halothane reduces cardiac contractility and sensitizes the myocardium to catecholamines. In the locus ceruleus, it causes hyperpolarization via potassium channel activation.',
      characterCount: 170,
      parsedSections: [
        {
          heading: 'Cardiovascular Effects of Halothane',
          body: 'Halothane reduces cardiac contractility and sensitizes the myocardium to catecholamines. In the locus ceruleus, it causes hyperpolarization via potassium channel activation.',
          startLine: 1,
          category: 'paragraph'
        }
      ]
    }
  ],
  visual_data_engines: [
    {
      id: 'FIG_09_01',
      sourceFile: 'anesthesia_handbook_chapter_9.pdf',
      pageNumber: 1,
      caption: 'Dose-response curve of Propofol-induced neural hyperpolarization',
      archetype: 'COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS',
      details: {
        panels: [
          {
            panel_id: 'A',
            axes: {
              x_axis: { label: 'Propofol concentration', unit: 'mcg/ml' },
              y_axis: { label: 'GABAA Current Enhancement', unit: '%' }
            },
            mathematical_nature: 'Sigmoidal/Logarithmic Plateau',
            curves: [
              {
                legend_label: 'Wildtype GABAA receptors',
                characteristic_nature: 'Profound sigmoidal enhancement'
              }
            ],
            coordinate_inflections: [
              {
                x_threshold: '1.5',
                y_value_or_change: '50%',
                inflection_description: 'Half-maximal EC50 enhancement threshold'
              }
            ]
          }
        ]
      }
    }
  ],
  full_extracted_text: 'Propofol induces anesthesia by enhancing GABA-mediated inhibitory neurotransmission. Halothane reduces cardiac contractility and sensitizes the myocardium to catecholamines.'
};

async function runTest() {
  console.log('='.repeat(70));
  console.log('  AirwaySim INTERNAL KNOWLEDGE STORE & QUERY BRIDGE INTEGRATION TEST');
  console.log('='.repeat(70));

  const dbPath = path.resolve(dirname, '../knowledge/medical_truth.db');
  
  // 1. Remove database if exists to start fresh
  if (fs.existsSync(dbPath)) {
    console.log(`[TEST] Clearing existing database at ${dbPath}...`);
    try {
      fs.unlinkSync(dbPath);
      // Also delete any WAL/shm files if they exist
      if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
      if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
      console.log('  ✓ Database cleared.');
    } catch (e: any) {
      console.warn('  ⚠ Warning clearing database:', e.message);
    }
  }

  // 2. Ingest the mock document
  console.log('\n[TEST] 1. Triggering Database Ingestion...');
  const fakeOutputPath = path.resolve(dirname, '../knowledge/anesthesia_handbook_chapter_9.json');
  
  try {
    const result = TokenOptimizer.optimizeAndSerialize(mockDoc, fakeOutputPath);
    console.log('  ✓ Ingestion function ran successfully.');
    console.log('  ✓ Result structure:', result);
  } catch (err: any) {
    console.error('  ✗ Ingestion failed:', err);
    process.exit(1);
  }

  // 3. Verify database exists
  console.log('\n[TEST] 2. Verifying database file exists...');
  if (fs.existsSync(dbPath)) {
    console.log(`  ✓ Success! Database file created at: ${dbPath}`);
    console.log(`  File size: ${fs.statSync(dbPath).size} bytes`);
  } else {
    console.error(`  ✗ Error: Database file not found at: ${dbPath}`);
    process.exit(1);
  }

  // 4. Test query bridge matching
  console.log('\n[TEST] 3. Testing getAnatomicalTruth with keywords...');
  
  const keywords = ['locus ceruleus', 'propofol', 'halothane', 'GABAA', 'cardiac', 'nonexistent'];

  for (const kw of keywords) {
    const startTime = performance.now();
    const matches = getAnatomicalTruth(kw);
    const duration = performance.now() - startTime;
    
    console.log(`\n  Keyword: "${kw}"`);
    console.log(`  Query time: ${duration.toFixed(3)} ms`);
    console.log(`  Matches found: ${matches.length}`);
    
    matches.forEach((match, idx) => {
      console.log(`    [Match ${idx + 1}] (length: ${match.length} chars)`);
      const snippet = match.length > 150 ? match.substring(0, 150) + '...' : match;
      console.log(`      "${snippet.replace(/\n/g, ' ')}"`);
    });

    // Verification asserts
    if (kw === 'locus ceruleus' && matches.length !== 2) {
      console.error(`  ✗ Assert Failed: Expected exactly 2 matches for "locus ceruleus", got ${matches.length}`);
      process.exit(1);
    }
    if (kw === 'propofol' && matches.length !== 2) {
      console.error(`  ✗ Assert Failed: Expected exactly 2 matches for "propofol" (1 prose, 1 matrix), got ${matches.length}`);
      process.exit(1);
    }
    if (kw === 'nonexistent' && matches.length !== 0) {
      console.error(`  ✗ Assert Failed: Expected 0 matches for "nonexistent", got ${matches.length}`);
      process.exit(1);
    }
  }

  // 5. Clean up connection
  closeQueryBridge();
  console.log('\n' + '='.repeat(70));
  console.log('  ALL TESTS PASSED SUCCESSFULLY! INTEGRATION VERIFIED.');
  console.log('='.repeat(70));
}

runTest().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
