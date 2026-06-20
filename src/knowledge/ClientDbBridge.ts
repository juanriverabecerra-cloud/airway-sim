/**
 * ClientDbBridge.ts
 * 
 * Unified database bridge executing SQL queries on a background Web Worker in the browser
 * and synchronously in-memory under Node/Vitest.
 * 
 * STRICT PARITY: uses sql.js in both environments to prevent driver drift.
 */

import { comparePriority } from './utils/priority_resolver.ts';

export interface ProseRecord {
  id: string;
  chapter_title: string; // mapped from source_book
  section_heading: string; // mapped from topic
  body_text: string;
  is_authoritative: number;
}

export interface MatrixRecord {
  id: string;
  chapter_title: string; // mapped from source_book
  archetype: string;
  caption: string;
  structured_payload: string;
  is_authoritative: number;
}

export class ClientDbBridge {
  private static isBrowser = typeof window !== 'undefined';
  
  // In-memory sql.js instance for Node/Vitest testing environment
  private static nodeDb: any = null;
  
  // Web Worker for main-thread protection in Browser environment
  private static worker: Worker | null = null;
  private static workerPromises: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private static messageCounter = 0;

  // Cache stores populated from worker query results on main thread
  public static allProse: ProseRecord[] = [];
  public static allMatrices: MatrixRecord[] = [];
  public static authProse: ProseRecord[] = [];
  public static authMatrices: MatrixRecord[] = [];
  
  private static isLoaded = false;
  private static loadPromise: Promise<void> | null = null;
  private static onLoadedCallbacks: Array<() => void> = [];

  /**
   * Initializes the database driver context.
   */
  public static init(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (!this.isBrowser) {
      // Node/Vitest: Sync in-memory sql.js by sharing KnowledgeStore's DB
      this.loadPromise = (async () => {
        try {
          const { KnowledgeStore } = await import('./store.ts');
          await KnowledgeStore.init();
          this.nodeDb = KnowledgeStore.getDb();
          
          // Populate caches synchronously
          this.syncNodeCaches();
          this.isLoaded = true;
        } catch (err: any) {
          console.error('[ClientDbBridge] Node SQL.js Init Error:', err.message);
        }
      })();
    } else {
      // Browser: Instantiate Web Worker and fetch medical_truth.db
      this.loadPromise = (async () => {
        try {
          console.log('[ClientDbBridge] Launching database Web Worker...');
          
          // Instantiate worker dynamically using path to public/worker or inline fallback
          this.worker = new Worker(new URL('./ClientDbBridge.worker.ts', import.meta.url), { type: 'module' });
          
          // Listen for worker messages
          this.worker.onmessage = (e: MessageEvent) => {
            const { type, results, error, sql, rows, id } = e.data;
            
            if (type === 'init_ok') {
              this.syncBrowserCaches();
            } else if (type === 'init_error') {
              console.error('[ClientDbBridge] Worker init error:', error);
            } else if (type === 'query_ok' || type === 'query_error') {
              const promise = this.workerPromises.get(id);
              if (promise) {
                if (type === 'query_ok') {
                  promise.resolve({ sql, rows });
                } else {
                  promise.reject(new Error(error));
                }
                this.workerPromises.delete(id);
              }
            }
          };

          const response = await fetch('/medical_truth.db');
          if (!response.ok) {
            throw new Error(`Failed to fetch database asset: ${response.statusText}`);
          }
          const buffer = await response.arrayBuffer();
          
          // Post buffer to worker with transferable arrayBuffer to protect thread performance
          this.worker.postMessage({ type: 'init', payload: { buffer } }, [buffer]);
        } catch (err: any) {
          console.error('[ClientDbBridge] Browser Web Worker Load Error:', err.message);
        }
      })();
    }

    return this.loadPromise;
  }

  /**
   * Registers callback to trigger when database caches have completed loading.
   */
  public static onLoaded(callback: () => void): void {
    if (this.isLoaded) {
      callback();
    } else {
      this.onLoadedCallbacks.push(callback);
    }
  }

  /**
   * Async API to execute custom queries directly inside the Web Worker.
   */
  public static executeQueryAsync(sql: string, params: any[] = []): Promise<any> {
    this.init();
    
    if (!this.isBrowser) {
      // Node/Vitest: Run query synchronously in-memory
      return new Promise((resolve, reject) => {
        try {
          const stmt = this.nodeDb.prepare(sql);
          stmt.bind(params || []);
          const rows: any[][] = [];
          while (stmt.step()) {
            rows.push(stmt.get());
          }
          stmt.free();
          resolve({ sql, rows });
        } catch (err: any) {
          reject(err);
        }
      });
    }

    // Browser: Post message to worker and await response promise
    const messageId = String(++this.messageCounter);
    return new Promise((resolve, reject) => {
      this.workerPromises.set(messageId, { resolve, reject });
      this.worker!.postMessage({
        type: 'query',
        id: messageId,
        payload: { sql, params }
      });
    });
  }

  /**
   * Sync cache builder for Node context.
   */
  private static syncNodeCaches(): void {
    try {
      if (!this.nodeDb) return;

      const stmtProse = this.nodeDb.prepare('SELECT id, source_book, topic, body_text, is_authoritative FROM textbook_prose');
      const proseRows: any[] = [];
      while (stmtProse.step()) {
        proseRows.push(stmtProse.getAsObject());
      }
      stmtProse.free();

      const stmtMatrix = this.nodeDb.prepare('SELECT id, source_book, topic, archetype, caption, structured_payload, is_authoritative FROM physiological_matrices');
      const matrixRows: any[] = [];
      while (stmtMatrix.step()) {
        matrixRows.push(stmtMatrix.getAsObject());
      }
      stmtMatrix.free();

      this.allProse = proseRows.map(r => ({
        id: r.id,
        chapter_title: r.source_book,
        section_heading: r.topic,
        body_text: r.body_text,
        is_authoritative: r.is_authoritative
      })).sort((a, b) => comparePriority(a.chapter_title, b.chapter_title));

      this.allMatrices = matrixRows.map(r => ({
        id: r.id,
        chapter_title: r.source_book,
        archetype: r.archetype,
        caption: r.caption,
        structured_payload: r.structured_payload,
        is_authoritative: r.is_authoritative
      })).sort((a, b) => comparePriority(a.chapter_title, b.chapter_title));

      this.authProse = this.allProse.filter(p => p.is_authoritative === 1);
      this.authMatrices = this.allMatrices.filter(m => m.is_authoritative === 1);
    } catch (err: any) {
      console.error('[ClientDbBridge] Sync Node Cache failed:', err.message);
    }
  }

  /**
   * Async cache builder querying from worker and setting browser state.
   */
  private static async syncBrowserCaches(): Promise<void> {
    try {
      const proseRes = await this.executeQueryAsync('SELECT id, source_book, topic, body_text, is_authoritative FROM textbook_prose');
      const matrixRes = await this.executeQueryAsync('SELECT id, source_book, topic, archetype, caption, structured_payload, is_authoritative FROM physiological_matrices');

      this.allProse = (proseRes.rows || []).map((row: any[]) => ({
        id: row[0],
        chapter_title: row[1],
        section_heading: row[2],
        body_text: row[3],
        is_authoritative: row[4]
      })).sort((a, b) => comparePriority(a.chapter_title, b.chapter_title));

      this.allMatrices = (matrixRes.rows || []).map((row: any[]) => ({
        id: row[0],
        chapter_title: row[1],
        archetype: row[2],
        caption: row[3],
        structured_payload: row[4],
        is_authoritative: row[5]
      })).sort((a, b) => comparePriority(a.chapter_title, b.chapter_title));

      this.authProse = this.allProse.filter(p => p.is_authoritative === 1);
      this.authMatrices = this.allMatrices.filter(m => m.is_authoritative === 1);

      this.isLoaded = true;
      console.log(`[ClientDbBridge] Main thread caches hydrated: ${this.allProse.length} prose records (${this.authProse.length} authoritative).`);

      // Fire load callbacks
      this.onLoadedCallbacks.forEach(cb => {
        try { cb(); } catch (e) { console.error(e); }
      });
    } catch (err: any) {
      console.error('[ClientDbBridge] Browser Cache Sync Failed:', err.message);
    }
  }

  /**
   * Direct cache queries (synchronous for legacy / fast rendering support).
   */
  public static getAllProse(): ProseRecord[] {
    this.init();
    if (!this.isBrowser) {
      this.syncNodeCaches();
    }
    return this.allProse;
  }

  public static getAllMatrices(): MatrixRecord[] {
    this.init();
    if (!this.isBrowser) {
      this.syncNodeCaches();
    }
    return this.allMatrices;
  }

  public static getAuthoritativeProse(): ProseRecord[] {
    this.init();
    if (!this.isBrowser) {
      this.syncNodeCaches();
    }
    return this.authProse;
  }

  public static getAuthoritativeMatrices(): MatrixRecord[] {
    this.init();
    if (!this.isBrowser) {
      this.syncNodeCaches();
    }
    return this.authMatrices;
  }

  public static queryProseById(id: string): ProseRecord | null {
    // Deliberately does NOT resync on every call (unlike the bulk getters
    // above). This is called once per search RESULT to resolve its full
    // record — searchKnowledge() can call it dozens of times per query, and
    // syncNodeCaches() re-queries and re-sorts the entire (now much larger)
    // prose table on every invocation. init() already populated allProse at
    // least once; callers needing fresher data after an explicit write should
    // use getAllProse()/getAuthoritativeProse() instead, which do still resync.
    this.init();
    return this.allProse.find(p => p.id === id) || null;
  }

  public static queryMatrixById(id: string): MatrixRecord | null {
    // See queryProseById above — same reasoning, same fix.
    this.init();
    return this.allMatrices.find(m => m.id === id) || null;
  }
}

// Deliberately no top-level self-init call here. Every accessor above
// (getAllProse, queryProseById, etc.) already calls this.init() defensively
// before reading cached state, so callers get correct lazy-on-first-use
// behavior without it. A module-level init() call here used to mean that
// merely importing this module anywhere in the dependency graph — which
// usePhysiology.js does transitively, just to reference DynamicMedicationRegistry,
// completely independent of whether a case has even started — triggered the
// full medical_truth.db fetch (tens of MB) immediately on every app boot,
// before the user had done anything. Removing it defers that fetch to the
// first actual data access (first case start, first search, etc.) instead.
