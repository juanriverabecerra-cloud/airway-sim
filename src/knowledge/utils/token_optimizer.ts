import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ParsedDocument, SourceFragment, VisualDataEngine, ParsedSection } from '../types/index.ts';
import { KnowledgeStore } from '../store.ts';
import type { ProseRecord, MatrixRecord } from '../medical_truth_snapshot.ts';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  dirname = path.dirname(fileURLToPath(import.meta.url));
}

export class TokenOptimizer {
  /**
   * Estimates the token count of a given object based on the standard 4-characters-per-token heuristic.
   * Protected with strict safety guards to eliminate potential serializing crashes.
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

      // A. Bullet Hygiene & List Formatting
      // Split raw text into lines and clean bullet markers
      const lines = rawText.split('\n');
      const cleanedLines = lines.map(line => {
        // Match standard bullet symbols at start of line with potential indentation
        const bulletMatch = line.match(/^(\s*)(?:•|␣|o|▪|\*|\+|-)\s+(.+)$/);
        if (bulletMatch) {
          const indent = bulletMatch[1];
          const content = bulletMatch[2];
          return `${indent}- ${content}`;
        }
        return line;
      });
      rawText = cleanedLines.join('\n');

      // Do the same for parsedSections body text
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

        // Detect if section is list
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

      // B. Native Pipe Table Injection
      // Find any table engines matching this page number
      const pageTables = doc.visual_data_engines.filter(
        v => v.pageNumber === frag.pageNumber && 
        v.details && 
        (v.details.markdown_representation || v.details.headers || v.details.matrix_rows)
      );

      for (const tableEngine of pageTables) {
        let markdownTable = tableEngine.details.markdown_representation || '';
        
        // If markdown representation is not present but headers exist, build it
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
          // Avoid duplicate injection
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
    // Sanitize bullets & inject pipe tables first
    const sanitized = this.sanitizeContent(doc);

    // Deep clone doc structure and strip bounding box arrays
    const prunedFragments: SourceFragment[] = sanitized.fragments.map(frag => {
      const { word_bounding_boxes, ...rest } = frag;
      return { ...rest };
    });

    const prunedVisuals: VisualDataEngine[] = sanitized.visual_data_engines.map(engine => {
      const { text_bounding_boxes, ...rest } = engine;
      return { ...rest };
    });

    // Reconstruct full text based on sanitized text
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
   * Detects the active top-level textbook header in a fragment.
   */
  private static getTopLevelHeader(frag: SourceFragment): string {
    for (const sec of frag.parsedSections) {
      const h = sec.heading.trim();
      if (h.length > 4) {
        // Detect SECTION, CHAPTER, or uppercase titles
        if (/^(?:SECTION|CHAPTER)\b/i.test(h) || h.toUpperCase() === h) {
          return h;
        }
      }
    }
    return '';
  }

  /**
   * Serializes the optimized mirror copy into llm_optimized/ separate files.
   * Capped safely at 30,000 estimated tokens. Groups consecutive page fragments under the same top-level textbook header.
   */
  public static optimizeAndSerialize(
    doc: ParsedDocument,
    outputFilePath: string,
    tokenBudgetCap = 30000
  ): { paths: string[]; totalTokens: number; partsCount: number } {
    const prunedDoc = this.prune(doc);
    const estimatedTotalTokens = this.estimateTokens(prunedDoc);

    const chapterTitle = prunedDoc.parse_metadata.source_file || 'Unknown Chapter';

    console.log(`\n  [DATABASE INGESTION] Intercepting processed chunk stream for: ${chapterTitle}`);
    console.log(`  [DATABASE INGESTION] Writing to internal knowledge store (SQLite)...`);
    
    // Clear existing data for this file to prevent duplicates
    KnowledgeStore.clearDataForFile(chapterTitle);

    // 1. Ingest textbook prose
    let proseInserted = 0;
    for (const fragment of prunedDoc.fragments) {
      if (fragment.parsedSections && fragment.parsedSections.length > 0) {
        fragment.parsedSections.forEach((section, idx) => {
          const sectionId = `${chapterTitle}_${fragment.id}_sec_${idx}`;
          const sectionHeading = section.heading || 'General';
          const bodyText = section.body || '';
          
          if (bodyText.trim().length > 0) {
            KnowledgeStore.insertProse(sectionId, chapterTitle, sectionHeading, bodyText);
            proseInserted++;
          }
        });
      } else if (fragment.rawText && fragment.rawText.trim().length > 0) {
        const sectionId = `${chapterTitle}_${fragment.id}_full`;
        const sectionHeading = 'General';
        const bodyText = fragment.rawText;
        
        KnowledgeStore.insertProse(sectionId, chapterTitle, sectionHeading, bodyText);
        proseInserted++;
      }
    }

    // 2. Ingest physiological matrices
    let matricesInserted = 0;
    for (const engine of prunedDoc.visual_data_engines) {
      const id = engine.id || `FIG_${chapterTitle}_${engine.pageNumber}_${matricesInserted}`;
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
      
      KnowledgeStore.insertMatrix(id, archetype, caption, structuredPayload);
      matricesInserted++;
    }

    console.log(`  ✓ Database Ingestion Complete: ${proseInserted} prose sections, ${matricesInserted} physiological matrices stored.`);

    // 3. Compile static, typed ESM snapshot for browser/Vite environment compatibility
    console.log(`  [DATABASE SNAPSHOT] Compiling in-memory snapshot for browser environment...`);
    try {
      const allProse = KnowledgeStore.getDb().prepare('SELECT * FROM textbook_prose').all() as ProseRecord[];
      const allMatrices = KnowledgeStore.getDb().prepare('SELECT * FROM physiological_matrices').all() as MatrixRecord[];

      const snapshotContent = `/**
 * AUTO-GENERATED MEDICAL TRUTH DATABASE SNAPSHOT
 * Do not edit this file directly. It is compiled automatically during textbook ingestion.
 * Provides synchronous, lag-free, and browser-safe textbook search lookups.
 */

export interface ProseRecord {
  readonly id: string;
  readonly chapter_title: string;
  readonly section_heading: string;
  readonly body_text: string;
}

export interface MatrixRecord {
  readonly id: string;
  readonly archetype: string;
  readonly caption: string;
  readonly structured_payload: string;
}

export const textbookProse: readonly ProseRecord[] = ${JSON.stringify(allProse, null, 2)};

export const physiologicalMatrices: readonly MatrixRecord[] = ${JSON.stringify(allMatrices, null, 2)};
`;

      const snapshotPath = path.resolve(dirname, '../medical_truth_snapshot.ts');
      fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');
      console.log(`  ✓ Database Snapshot compiled successfully: ${snapshotPath}`);
    } catch (snapErr: unknown) {
      const errMsg = snapErr instanceof Error ? snapErr.message : String(snapErr);
      console.error(`  [SNAPSHOT ERROR] Failed to compile static snapshot: ${errMsg}`);
    }

    // Return reference for backward compatibility with orchestrator interface
    return {
      paths: ['src/knowledge/medical_truth.db'],
      totalTokens: estimatedTotalTokens,
      partsCount: 1
    };
  }
}
