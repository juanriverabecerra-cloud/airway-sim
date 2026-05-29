import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  const filename = fileURLToPath(import.meta.url);
  dirname = path.dirname(filename);
}

const dbPath = path.resolve(dirname, '../knowledge/medical_truth.db');

let cachedDb: Database.Database | null = null;

function getDbConnection(): Database.Database | null {
  if (cachedDb) {
    return cachedDb;
  }

  if (!fs.existsSync(dbPath)) {
    console.warn(`[Oracle Query Bridge] Warning: Database file not found at: ${dbPath}`);
    return null;
  }

  try {
    cachedDb = new Database(dbPath, { readonly: true, fileMustExist: true });
    // Enable WAL mode performance tuning
    cachedDb.pragma('journal_mode = WAL');
    return cachedDb;
  } catch (error) {
    console.error(`[Oracle Query Bridge] Error connecting to database at ${dbPath}:`, error);
    return null;
  }
}

/**
 * Performs a rapid local wildcard match against textbook prose and physiological matrices.
 * Returns an array of matched unabridged text strings (prose bodies and structured payloads).
 * 
 * @param subsystemKeyword - Search term or keyword (e.g. "locus ceruleus", "propofol")
 * @returns Array of matched text records
 */
export function getAnatomicalTruth(subsystemKeyword: string): string[] {
  if (!subsystemKeyword || subsystemKeyword.trim().length === 0) {
    return [];
  }

  const db = getDbConnection();
  if (!db) {
    return [];
  }

  try {
    const term = `%${subsystemKeyword}%`;
    const results: string[] = [];

    // Query 1: textbook_prose
    const proseQuery = db.prepare(`
      SELECT body_text 
      FROM textbook_prose 
      WHERE body_text LIKE ? OR section_heading LIKE ? OR chapter_title LIKE ?
    `);
    const proseRows = proseQuery.all(term, term, term) as Array<{ body_text: string }>;
    for (const row of proseRows) {
      if (row.body_text && row.body_text.trim().length > 0) {
        results.push(row.body_text);
      }
    }

    // Query 2: physiological_matrices
    const matrixQuery = db.prepare(`
      SELECT structured_payload 
      FROM physiological_matrices 
      WHERE structured_payload LIKE ? OR caption LIKE ? OR archetype LIKE ?
    `);
    const matrixRows = matrixQuery.all(term, term, term) as Array<{ structured_payload: string }>;
    for (const row of matrixRows) {
      if (row.structured_payload && row.structured_payload.trim().length > 0) {
        results.push(row.structured_payload);
      }
    }

    return results;
  } catch (error) {
    console.error(`[Oracle Query Bridge Error] Failed to search for "${subsystemKeyword}":`, error);
    return [];
  }
}

/**
 * Closes the cached database connection if open.
 */
export function closeQueryBridge(): void {
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch (e) {
      // Ignore close errors
    }
    cachedDb = null;
  }
}
