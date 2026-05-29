import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Support both ESM and CJS for locating the directory
let dirname = '';
try {
  dirname = __dirname;
} catch (e) {
  // Fallback for strict ESM environments
  const filename = fileURLToPath(import.meta.url);
  dirname = path.dirname(filename);
}

const dbPath = path.resolve(dirname, 'medical_truth.db');

export class KnowledgeStore {
  private static db: Database.Database | null = null;

  public static getDb(): Database.Database {
    if (!this.db) {
      // Ensure the directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.db = new Database(dbPath);
      // Enable WAL mode for performance
      this.db.pragma('journal_mode = WAL');
      this.initializeSchema();
    }
    return this.db;
  }

  private static initializeSchema(): void {
    const db = this.db!;
    
    // Create textbook_prose table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS textbook_prose (
        id TEXT PRIMARY KEY,
        chapter_title TEXT,
        section_heading TEXT,
        body_text TEXT
      )
    `).run();

    // Create physiological_matrices table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS physiological_matrices (
        id TEXT PRIMARY KEY,
        archetype TEXT,
        caption TEXT,
        structured_payload TEXT
      )
    `).run();

    // Create indexes for efficient searching/filtering
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_prose_chapter 
      ON textbook_prose (chapter_title)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_prose_heading 
      ON textbook_prose (section_heading)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_matrices_archetype 
      ON physiological_matrices (archetype)
    `).run();
  }

  /**
   * Clears existing records associated with a specific chapter/file name
   * to allow safe re-parsing and prevent duplicate or orphaned rows.
   */
  public static clearDataForFile(chapterTitle: string): void {
    const db = this.getDb();
    
    // Delete prose matching chapter_title
    db.prepare('DELETE FROM textbook_prose WHERE chapter_title = ?').run(chapterTitle);
  }

  /**
   * Synchronously inserts or replaces a textbook prose record.
   */
  public static insertProse(id: string, chapterTitle: string, sectionHeading: string, bodyText: string): void {
    const db = this.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO textbook_prose (id, chapter_title, section_heading, body_text)
      VALUES (?, ?, ?, ?)
    `).run(id, chapterTitle, sectionHeading, bodyText);
  }

  /**
   * Synchronously inserts or replaces a physiological matrix record.
   */
  public static insertMatrix(id: string, archetype: string, caption: string, structuredPayload: string): void {
    const db = this.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO physiological_matrices (id, archetype, caption, structured_payload)
      VALUES (?, ?, ?, ?)
    `).run(id, archetype, caption, structuredPayload);
  }

  /**
   * Close the database connection cleanly.
   */
  public static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
