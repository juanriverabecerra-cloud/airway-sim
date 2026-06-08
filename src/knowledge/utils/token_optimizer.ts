import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ParsedDocument, SourceFragment, VisualDataEngine } from '../types/index.ts';
import { KnowledgeStore } from '../store.ts';
import { parseTextbookMetadata, getPriorityRank } from './priority_resolver.ts';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  dirname = path.dirname(fileURLToPath(import.meta.url));
}

// Clinical Alias Synonym mappings dictionary
const CLINICAL_ALIASES: Record<string, string[]> = {
  'versed': ['midazolam'],
  'midazolam': ['versed'],
  'succinylcholine': ['sux', 'suxamethonium'],
  'sux': ['succinylcholine', 'suxamethonium'],
  'suxamethonium': ['succinylcholine', 'sux'],
  'propofol': ['diprivan'],
  'diprivan': ['propofol'],
  'albuterol': ['salbutamol', 'ventolin'],
  'salbutamol': ['albuterol', 'ventolin'],
  'ventolin': ['albuterol', 'salbutamol'],
  'epinephrine': ['adrenaline'],
  'adrenaline': ['epinephrine'],
  'norepinephrine': ['levophed'],
  'levophed': ['norepinephrine'],
  'glycopyrrolate': ['robinul'],
  'robinul': ['glycopyrrolate'],
  'neostigmine': ['proprostgmin', 'prostigmin'],
  'prostigmin': ['neostigmine'],
  'rocuronium': ['zemuron'],
  'zemuron': ['rocuronium'],
  'vecuronium': ['norcuron'],
  'norcuron': ['vecuronium'],
  'fentanyl': ['sublimaze'],
  'sublimaze': ['fentanyl']
};

export class TokenOptimizer {
  /**
   * Estimates the token count of a given object based on the standard 4-characters-per-token heuristic.
   */
  public static estimateTokens(obj: unknown): number {
    if (obj === undefined || obj === null) {
      return 0;
    }
    try {
      const serialized = JSON.stringify(obj);
      return serialized ? Math.ceil(serialized.length / 4.0) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Cleans list bullet markers and injects native pipe tables into page fragments.
   */
  public static sanitizeContent(doc: ParsedDocument): ParsedDocument {
    const sanitizedFragments = doc.fragments.map(frag => {
      let rawText = frag.rawText;
      let parsedSections = [...frag.parsedSections];

      // Bullet Hygiene & List Formatting
      const lines = rawText.split('\n');
      const cleanedLines = lines.map(line => {
        const bulletMatch = line.match(/^(\s*)(?:•|␣|o|▪|\*|\+|-)\s+(.+)$/);
        if (bulletMatch) {
          const indent = bulletMatch[1];
          const content = bulletMatch[2];
          return `${indent}- ${content}`;
        }
        return line;
      });
      rawText = cleanedLines.join('\n');

      parsedSections = parsedSections.map(sec => {
        const secLines = sec.body.split('\n');
        const cleanedSecLines = secLines.map(line => {
          const bulletMatch = line.match(/^(\s*)(?:•|␣|o|▪|\*|\+|-)\s+(.+)$/);
          if (bulletMatch) {
            const indent = bulletMatch[1];
            const content = bulletMatch[2];
            return `${indent}- ${content}`;
          }
          return line;
        });

        let category = sec.category;
        if (/^\s*[-*+]\s/m.test(cleanedSecLines.join('\n'))) {
          category = 'list';
        }

        return {
          ...sec,
          body: cleanedSecLines.join('\n'),
          category
        };
      });

      // Native Pipe Table Injection
      const pageTables = doc.visual_data_engines.filter(
        v => v.pageNumber === frag.pageNumber && 
        v.details && 
        (v.details.markdown_representation || v.details.headers || v.details.matrix_rows)
      );

      for (const tableEngine of pageTables) {
        let markdownTable = tableEngine.details.markdown_representation || '';
        
        if (!markdownTable && tableEngine.details.matrix_rows) {
          const rows = tableEngine.details.matrix_rows;
          if (rows.length > 0) {
            const headers = rows[0];
            markdownTable = "| " + headers.join(" | ") + " |\n";
            markdownTable += "| " + headers.map(() => "---").join(" | ") + " |\n";
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              const paddedRow = [...row];
              while (paddedRow.length < headers.length) paddedRow.push("");
              markdownTable += "| " + paddedRow.slice(0, headers.length).join(" | ") + " |\n";
            }
          }
        }

        if (markdownTable) {
          if (!rawText.includes(markdownTable.trim())) {
            rawText += `\n\n### [TABLE] ${tableEngine.caption || tableEngine.id}\n\n${markdownTable}\n`;
            
            parsedSections.push({
              heading: `[TABLE] ${tableEngine.caption || tableEngine.id}`,
              body: markdownTable,
              startLine: parsedSections.length + 1,
              category: 'table'
            });
          }
        }
      }

      return {
        ...frag,
        rawText,
        characterCount: rawText.length,
        parsedSections
      };
    });

    return {
      ...doc,
      fragments: sanitizedFragments
    };
  }

  /**
   * Prunes raw layout diagnostic coordinate geometry to build an LLM-optimized semantic mirror.
   */
  public static prune(doc: ParsedDocument): ParsedDocument {
    const sanitized = this.sanitizeContent(doc);

    const prunedFragments: SourceFragment[] = sanitized.fragments.map(frag => {
      const { word_bounding_boxes, ...rest } = frag;
      return { ...rest };
    });

    const prunedVisuals: VisualDataEngine[] = sanitized.visual_data_engines.map(engine => {
      const { text_bounding_boxes, ...rest } = engine;
      return { ...rest };
    });

    const fullText = prunedFragments
      .map(f => f.rawText)
      .filter(t => t.length > 0)
      .join('\n\n--- PAGE BREAK ---\n\n');

    return {
      parse_metadata: {
        ...sanitized.parse_metadata,
        total_characters_extracted: prunedFragments.reduce((sum, f) => sum + f.characterCount, 0)
      },
      fragments: prunedFragments,
      visual_data_engines: prunedVisuals,
      full_extracted_text: fullText
    };
  }

  /**
   * Prunes and inserts a parsed document into the database, clearing its existing records first.
   */
  public static optimizeAndInsert(doc: ParsedDocument): void {
    const prunedDoc = this.prune(doc);
    const chapterTitle = prunedDoc.parse_metadata.source_file || 'Unknown Chapter';
    const metadata = parseTextbookMetadata(chapterTitle);
    const priorityRank = getPriorityRank(chapterTitle);

    console.log(`\n  [DATABASE INGESTION] Ingesting: ${chapterTitle} (Edition: ${metadata.edition}, Rank: ${priorityRank})`);
    console.log(`  [DATABASE INGESTION] Writing to internal knowledge store (SQLite)...`);
    
    // Clear existing data for this file to prevent duplicates
    KnowledgeStore.clearDataForFile(chapterTitle);

    // 1. Ingest textbook prose
    let proseInserted = 0;
    for (const fragment of prunedDoc.fragments) {
      if (fragment.parsedSections && fragment.parsedSections.length > 0) {
        fragment.parsedSections.forEach((section, idx) => {
          const sectionId = `${chapterTitle}_${fragment.id}_sec_${idx}`;
          const topic = section.heading || 'General';
          const bodyText = section.body || '';
          
          if (bodyText.trim().length > 0) {
            KnowledgeStore.insertProse(sectionId, topic, bodyText, chapterTitle, metadata.edition, priorityRank);
            proseInserted++;
          }
        });
      } else if (fragment.rawText && fragment.rawText.trim().length > 0) {
        const sectionId = `${chapterTitle}_${fragment.id}_full`;
        const topic = 'General';
        const bodyText = fragment.rawText;
        
        KnowledgeStore.insertProse(sectionId, topic, bodyText, chapterTitle, metadata.edition, priorityRank);
        proseInserted++;
      }
    }

    // 2. Ingest physiological matrices
    let matricesInserted = 0;
    for (const engine of prunedDoc.visual_data_engines) {
      const id = engine.id || `FIG_${chapterTitle}_${engine.pageNumber}_${matricesInserted}`;
      const topic = engine.caption || engine.id || 'Visual';
      const archetype = engine.archetype || 'UNKNOWN';
      const caption = engine.caption || '';
      
      let structuredPayload = '';
      if (engine.details) {
        if (engine.details.markdown_representation) {
          structuredPayload = engine.details.markdown_representation;
        } else if (engine.details.matrix_rows) {
          const rows = engine.details.matrix_rows;
          if (rows.length > 0) {
            const headers = rows[0];
            let markdownTable = "| " + headers.join(" | ") + " |\n";
            markdownTable += "| " + headers.map(() => "---").join(" | ") + " |\n";
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              const paddedRow = [...row];
              while (paddedRow.length < headers.length) paddedRow.push("");
              markdownTable += "| " + paddedRow.slice(0, headers.length).join(" | ") + " |\n";
            }
            structuredPayload = markdownTable;
          }
        } else {
          structuredPayload = JSON.stringify(engine.details, null, 2);
        }
      }
      
      KnowledgeStore.insertMatrix(id, topic, archetype, caption, structuredPayload, chapterTitle, metadata.edition, priorityRank);
      matricesInserted++;
    }

    console.log(`  ✓ Database Ingested: ${proseInserted} prose sections, ${matricesInserted} matrices stored.`);
  }

  /**
   * Performs the global compilation, authority ranking recalculation,
   * database deployment, search index precomputation, and snapshot generation.
   */
  public static compileGlobalDatabaseAndIndex(): void {
    // Recalculate authority mappings (Miller > other, newer > older)
    KnowledgeStore.recalculateAuthority();

    // 3. Copy SQLite database to public asset directory for client availability
    console.log(`  [DATABASE DEPLOYMENT] Deploying SQLite database asset to public/ folder...`);
    try {
      const dbPath = path.resolve(dirname, '../medical_truth.db');
      const publicDbPath = path.resolve(dirname, '../../../public/medical_truth.db');
      const publicDir = path.dirname(publicDbPath);
      
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      fs.copyFileSync(dbPath, publicDbPath);
      console.log(`  ✓ Database asset deployed to: ${publicDbPath}`);
    } catch (deployErr: any) {
      console.error(`  [DEPLOYMENT ERROR] Failed to deploy SQLite asset: ${deployErr.message}`);
    }

    // 4. Precompute the search index with Clinical Synonym Alias Injection
    console.log(`  [INDEXING] Precomputing inverted TF-IDF search index with Clinical Alias Injection...`);
    try {
      const db = KnowledgeStore.getDb();
      
      const stmtProse = db.prepare('SELECT id, source_book, topic, body_text FROM textbook_prose');
      const allProse: any[] = [];
      while (stmtProse.step()) {
        allProse.push(stmtProse.getAsObject());
      }
      stmtProse.free();

      const stmtMatrices = db.prepare('SELECT id, source_book, topic, archetype, caption, structured_payload FROM physiological_matrices');
      const allMatrices: any[] = [];
      while (stmtMatrices.step()) {
        allMatrices.push(stmtMatrices.getAsObject());
      }
      stmtMatrices.free();
      
      const STOP_WORDS = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
        'should', 'may', 'might', 'must', 'can', 'could', 'and', 'but', 'or',
        'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
        'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
        'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
        'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
        'against', 'between', 'through', 'during', 'before', 'after', 'above',
        'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
        'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
        'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'this', 'that',
        'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
        'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
        'it', 'its', 'they', 'them', 'their', 'theirs', 'also', 'however',
        'therefore', 'thus', 'hence', 'although', 'though', 'even', 'still',
        'already', 'since', 'whether', 'if', 'into', 'upon', 'within', 'without',
        'fig', 'see', 'e', 'g', 'et', 'al', 'ie', 'eg', 'vs', 'etc',
        'am', 'us', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 
        'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'we'
      ]);

      const tokenizeText = (text: string): string[] => {
        if (!text || typeof text !== 'string') return [];
        return text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .split(/[\s-]+/)
          .filter(token => 
            token.length >= 2 &&
            !STOP_WORDS.has(token) &&
            !/^\d+$/.test(token)
          );
      };

      // Create document mapping to compress JSON size
      const proseDocs: string[] = allProse.map(p => p.id);
      const proseDocIdxMap = new Map<string, number>(proseDocs.map((id, idx) => [id, idx]));

      const matrixDocs: string[] = allMatrices.map(m => m.id);
      const matrixDocIdxMap = new Map<string, number>(matrixDocs.map((id, idx) => [id, idx]));

      // Postings lists mapped to compact arrays: [docIdx, tf, inHeadingVal]
      const proseIndex: Record<string, Array<[number, number, number]>> = {};
      const matrixIndex: Record<string, Array<[number, number, number]>> = {};
      
      const proseMetadata: Record<string, { id: string, chapter_title: string, section_heading: string }> = {};
      const matrixMetadata: Record<string, { id: string, archetype: string, caption: string }> = {};

      // Build prose index
      for (const p of allProse) {
        proseMetadata[p.id] = { id: p.id, chapter_title: p.source_book, section_heading: p.topic };
        
        // ONLY unigrams for search index compilation
        const allTokens = tokenizeText(`${p.topic} ${p.body_text}`);
        const headingTokens = new Set(tokenizeText(p.topic));

        const tfMap: Record<string, number> = {};
        for (const token of allTokens) {
          tfMap[token] = (tfMap[token] || 0) + 1;
        }

        // Intercept tokens and inject synonym/alias keywords
        for (const [token, tf] of Object.entries(tfMap)) {
          if (CLINICAL_ALIASES[token]) {
            const aliases = CLINICAL_ALIASES[token];
            for (const alias of aliases) {
              tfMap[alias] = Math.max(tfMap[alias] || 0, tf);
            }
          }
        }

        const docIdx = proseDocIdxMap.get(p.id)!;
        for (const [token, tf] of Object.entries(tfMap)) {
          if (!proseIndex[token]) proseIndex[token] = [];
          const inHeading = headingTokens.has(token) || (CLINICAL_ALIASES[token]?.some(alias => headingTokens.has(alias)) || false);
          proseIndex[token].push([docIdx, tf, inHeading ? 1 : 0]);
        }
      }

      // Build matrix index
      for (const m of allMatrices) {
        matrixMetadata[m.id] = { id: m.id, archetype: m.archetype, caption: m.caption };
        
        // ONLY unigrams for search index compilation
        const allTokens = tokenizeText(`${m.caption} ${m.archetype} ${m.structured_payload}`);
        const headingTokens = new Set(tokenizeText(`${m.caption} ${m.archetype}`));

        const tfMap: Record<string, number> = {};
        for (const token of allTokens) {
          tfMap[token] = (tfMap[token] || 0) + 1;
        }

        // Intercept tokens and inject synonym/alias keywords
        for (const [token, tf] of Object.entries(tfMap)) {
          if (CLINICAL_ALIASES[token]) {
            const aliases = CLINICAL_ALIASES[token];
            for (const alias of aliases) {
              tfMap[alias] = Math.max(tfMap[alias] || 0, tf);
            }
          }
        }

        const docIdx = matrixDocIdxMap.get(m.id)!;
        for (const [token, tf] of Object.entries(tfMap)) {
          if (!matrixIndex[token]) matrixIndex[token] = [];
          const inHeading = headingTokens.has(token) || (CLINICAL_ALIASES[token]?.some(alias => headingTokens.has(alias)) || false);
          matrixIndex[token].push([docIdx, tf, inHeading ? 1 : 0]);
        }
      }

      // Calculate IDFs
      const proseDocCount = allProse.length;
      const matrixDocCount = allMatrices.length;
      
      const proseIdf: Record<string, number> = {};
      for (const [token, postings] of Object.entries(proseIndex)) {
        const docFreq = postings.length;
        proseIdf[token] = Math.log(1 + (proseDocCount - docFreq + 0.5) / (docFreq + 0.5));
      }
      
      const matrixIdf: Record<string, number> = {};
      for (const [token, postings] of Object.entries(matrixIndex)) {
        const docFreq = postings.length;
        matrixIdf[token] = Math.log(1 + (matrixDocCount - docFreq + 0.5) / (docFreq + 0.5));
      }

      const indexData = {
        proseDocCount,
        matrixDocCount,
        proseDocs,
        matrixDocs,
        proseIndex,
        matrixIndex,
        proseIdf,
        matrixIdf,
        proseMetadata,
        matrixMetadata
      };

      const indexPath = path.resolve(dirname, '../precomputed_index.json');
      fs.writeFileSync(indexPath, JSON.stringify(indexData), 'utf-8');
      
      const publicIndexPath = path.resolve(dirname, '../../../public/precomputed_index.json');
      fs.writeFileSync(publicIndexPath, JSON.stringify(indexData), 'utf-8');
      console.log(`  ✓ Precomputed search index compiled successfully: ${indexPath} and copied to public/`);
    } catch (indexErr: any) {
      console.error(`  [INDEX ERROR] Failed to compile precomputed index: ${indexErr.message}`);
    }

    // 5. Compile static ESM snapshot wrapper for backward compatibility with testing suite
    console.log(`  [DATABASE SNAPSHOT] Generating dynamic ESM snapshot wrapper...`);
    try {
      const snapshotContent = `/**
 * DYNAMIC MEDICAL TRUTH DATABASE SNAPSHOT WRAPPER
 * Auto-generated by TokenOptimizer. Maps calls to ClientDbBridge to support
 * synchronous, lag-free search and tests while avoiding Vite bundle bloat.
 */

import { ClientDbBridge } from './ClientDbBridge.ts';
import type { ProseRecord, MatrixRecord } from './ClientDbBridge.ts';

export type { ProseRecord, MatrixRecord };

const manuallyPushedProse: ProseRecord[] = [];

export const textbookProse: ProseRecord[] = new Proxy(manuallyPushedProse, {
  get(target, prop, receiver) {
    ClientDbBridge.getAllProse();
    const mutations = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort']);
    if (typeof prop === 'string' && mutations.has(prop)) {
      const val = Reflect.get(target, prop);
      return typeof val === 'function' ? val.bind(target) : val;
    }
    const list = [...ClientDbBridge.allProse, ...manuallyPushedProse];
    const val = Reflect.get(list, prop);
    return typeof val === 'function' ? val.bind(list) : val;
  },
  set(target, prop, value, receiver) {
    if (prop === 'length') {
      const dbLength = ClientDbBridge.allProse.length;
      const val = Number(value);
      if (!isNaN(val)) {
        target.length = Math.max(0, val - dbLength);
        return true;
      }
    }
    const idx = Number(prop);
    if (!isNaN(idx)) {
      const dbLength = ClientDbBridge.allProse.length;
      if (idx >= dbLength) {
        target[idx - dbLength] = value;
        return true;
      } else {
        ClientDbBridge.allProse[idx] = value;
        return true;
      }
    }
    return Reflect.set(target, prop, value);
  }
}) as any;

const manuallyPushedMatrices: MatrixRecord[] = [];

export const physiologicalMatrices: MatrixRecord[] = new Proxy(manuallyPushedMatrices, {
  get(target, prop, receiver) {
    ClientDbBridge.getAllMatrices();
    const mutations = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort']);
    if (typeof prop === 'string' && mutations.has(prop)) {
      const val = Reflect.get(target, prop);
      return typeof val === 'function' ? val.bind(target) : val;
    }
    const list = [...ClientDbBridge.allMatrices, ...manuallyPushedMatrices];
    const val = Reflect.get(list, prop);
    return typeof val === 'function' ? val.bind(list) : val;
  },
  set(target, prop, value, receiver) {
    if (prop === 'length') {
      const dbLength = ClientDbBridge.allMatrices.length;
      const val = Number(value);
      if (!isNaN(val)) {
        target.length = Math.max(0, val - dbLength);
        return true;
      }
    }
    const idx = Number(prop);
    if (!isNaN(idx)) {
      const dbLength = ClientDbBridge.allMatrices.length;
      if (idx >= dbLength) {
        target[idx - dbLength] = value;
        return true;
      } else {
        ClientDbBridge.allMatrices[idx] = value;
        return true;
      }
    }
    return Reflect.set(target, prop, value);
  }
}) as any;
`;

      const snapshotPath = path.resolve(dirname, '../medical_truth_snapshot.ts');
      fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');
      console.log(`  ✓ Dynamic Snapshot wrapper generated successfully: ${snapshotPath}`);
    } catch (snapErr: unknown) {
      const errMsg = snapErr instanceof Error ? snapErr.message : String(snapErr);
      console.error(`  [SNAPSHOT ERROR] Failed to compile dynamic snapshot: ${errMsg}`);
    }
  }

  /**
   * Serializes the optimized mirror copy, writes to SQLite, precomputes search index with synonyms,
   * copies to public assets, and updates snapshot wrappers.
   */
  public static optimizeAndSerialize(
    doc: ParsedDocument,
    outputFilePath: string,
    tokenBudgetCap = 30000
  ): { paths: string[]; totalTokens: number; partsCount: number } {
    this.optimizeAndInsert(doc);
    this.compileGlobalDatabaseAndIndex();
    
    return {
      paths: ['src/knowledge/medical_truth.db'],
      totalTokens: this.estimateTokens(this.prune(doc)),
      partsCount: 1
    };
  }
}
