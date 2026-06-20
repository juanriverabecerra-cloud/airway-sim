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

const dbPath = path.resolve(dirname, 'medical_truth.db');

export class KnowledgeStore {
  private static db: any = null;
  private static initPromise: Promise<void> | null = null;

  public static async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const initSqlJs = (await import('sql.js')).default;
        const SQL = await initSqlJs();
        
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(dbPath)) {
          const buffer = fs.readFileSync(dbPath);
          this.db = new SQL.Database(new Uint8Array(buffer));
        } else {
          this.db = new SQL.Database();
          this.initializeSchema();
        }
      } catch (err: any) {
        console.error('[KnowledgeStore] init error:', err.message);
        throw err;
      }
    })();

    return this.initPromise;
  }

  public static getDb(): any {
    if (!this.db) {
      throw new Error('[KnowledgeStore] Database not initialized. Call init() first.');
    }
    return this.db;
  }

  private static initializeSchema(): void {
    const db = this.db!;
    
    // Create textbook_prose table with provenance tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS textbook_prose (
        id TEXT PRIMARY KEY,
        topic TEXT,
        body_text TEXT,
        source_book TEXT,
        edition INTEGER,
        priority_rank INTEGER,
        is_authoritative INTEGER DEFAULT 0
      )
    `);

    // Create physiological_matrices table with provenance tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS physiological_matrices (
        id TEXT PRIMARY KEY,
        topic TEXT,
        archetype TEXT,
        caption TEXT,
        structured_payload TEXT,
        source_book TEXT,
        edition INTEGER,
        priority_rank INTEGER,
        is_authoritative INTEGER DEFAULT 0
      )
    `);

    // Create indexes for efficient searching/filtering
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_prose_source_book 
      ON textbook_prose (source_book)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_prose_topic 
      ON textbook_prose (topic)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_matrices_source_book 
      ON physiological_matrices (source_book)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_matrices_topic 
      ON physiological_matrices (topic)
    `);
  }

  /**
   * Clears existing records associated with a specific chapter/file name
   * to allow safe re-parsing and prevent duplicate or orphaned rows.
   */
  public static clearDataForFile(sourceBook: string): void {
    const db = this.getDb();
    db.run('DELETE FROM textbook_prose WHERE source_book = ?', [sourceBook]);
    db.run('DELETE FROM physiological_matrices WHERE source_book = ?', [sourceBook]);
    this.save();
  }

  /**
   * Synchronously inserts or replaces a textbook prose record.
   */
  public static insertProse(
    id: string, 
    topic: string, 
    bodyText: string, 
    sourceBook: string, 
    edition: number, 
    priorityRank: number
  ): void {
    const db = this.getDb();
    db.run(`
      INSERT OR REPLACE INTO textbook_prose (id, topic, body_text, source_book, edition, priority_rank, is_authoritative)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [id, topic, bodyText, sourceBook, edition, priorityRank]);
    this.save();
  }

  /**
   * Synchronously inserts or replaces a physiological matrix record.
   */
  public static insertMatrix(
    id: string, 
    topic: string, 
    archetype: string, 
    caption: string, 
    structuredPayload: string, 
    sourceBook: string, 
    edition: number, 
    priorityRank: number
  ): void {
    const db = this.getDb();
    db.run(`
      INSERT OR REPLACE INTO physiological_matrices (id, topic, archetype, caption, structured_payload, source_book, edition, priority_rank, is_authoritative)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [id, topic, archetype, caption, structuredPayload, sourceBook, edition, priorityRank]);
    this.save();
  }

  /**
   * Reclaims space left behind by DELETE+re-INSERT cycles (every re-ingestion
   * of a chapter clears its old rows first). SQLite doesn't shrink the file
   * automatically — those pages just go on a free list for reuse — so a
   * database that's been re-ingested many times can be substantially larger
   * on disk than its actual row content, which matters here since this file
   * is fetched in full by the browser on first use.
   */
  public static vacuum(): void {
    const db = this.getDb();
    db.run('VACUUM');
    this.flush();
  }

  /**
   * Recalculates the is_authoritative flags for all records in the database
   * using a strict textbook authority priority hierarchy:
   *   1. Miller's always wins
   *   2. Higher editions win
   *   3. Stable alphabetical tie-break
   */
  public static recalculateAuthority(): void {
    const db = this.getDb();
    
    db.run('BEGIN TRANSACTION');
    try {
      // 1. Reset all textbook prose authority to 0
      db.run('UPDATE textbook_prose SET is_authoritative = 0');
      
      // 2. Select and update authoritative prose rows
      db.run(`
        UPDATE textbook_prose 
        SET is_authoritative = 1 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY (CASE WHEN topic = 'General' OR topic = 'Visual' OR topic = 'Unknown' THEN id ELSE topic END)
              ORDER BY priority_rank DESC, id ASC
            ) as rn
            FROM textbook_prose
          ) WHERE rn = 1
        )
      `);

      // 3. Reset all matrix authority to 0
      db.run('UPDATE physiological_matrices SET is_authoritative = 0');
      
      // 4. Select and update authoritative matrix rows
      db.run(`
        UPDATE physiological_matrices 
        SET is_authoritative = 1 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY (CASE WHEN topic = 'General' OR topic = 'Visual' OR topic = 'Unknown' THEN id ELSE topic END)
              ORDER BY priority_rank DESC, id ASC
            ) as rn
            FROM physiological_matrices
          ) WHERE rn = 1
        )
      `);
      
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }

    this.save();
    console.log("  ✓ Recalculated authority states across all ingested records.");
  }

  private static deferSave = false;

  /**
   * While true, save() becomes a no-op instead of writing the whole database
   * to disk. Every insert/clear/recalculate call here calls save() internally
   * (by design, so a single insertProse() call is durable on its own) — but
   * that means a batch of N inserts does N full multi-megabyte export+write
   * cycles, which dominates runtime once you're ingesting many chapters in
   * one run. Callers doing a batch should setDeferSave(true), do their work,
   * then setDeferSave(false) (or call flush()) once at the end.
   */
  public static setDeferSave(value: boolean): void {
    this.deferSave = value;
  }

  /**
   * Saves the in-memory database to disk (unless deferred via setDeferSave).
   */
  public static save(): void {
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      return; // Do not persist to disk during test runs
    }
    if (this.deferSave) {
      return; // Batched — caller is responsible for calling flush() later.
    }
    this.flush();
  }

  /**
   * Forces an immediate write to disk regardless of setDeferSave, e.g. right
   * before a step that reads the on-disk file directly (like deploying a copy
   * to public/) so it isn't left looking at stale data.
   */
  public static flush(): void {
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      return;
    }
    if (this.db) {
      const binaryArray = this.db.export();
      fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    }
  }

  /**
   * Close the database connection cleanly.
   */
  public static close(): void {
    if (this.db) {
      this.flush();
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}
