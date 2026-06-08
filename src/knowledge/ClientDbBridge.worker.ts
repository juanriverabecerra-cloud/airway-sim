/**
 * ClientDbBridge.worker.ts
 * 
 * Web Worker executing sql.js database operations off the main thread.
 */

// Import sql.js browser WASM loader inside worker context
import initSqlJs from 'sql.js';

let db: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'init') {
    try {
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });

      db = new SQL.Database(new Uint8Array(payload.buffer));
      self.postMessage({ type: 'init_ok' });
    } catch (err: any) {
      self.postMessage({ type: 'init_error', error: err.message });
    }
  } else if (type === 'query') {
    if (!db) {
      self.postMessage({ type: 'query_error', error: 'Database not initialized inside worker' });
      return;
    }

    try {
      const { sql, params } = payload;
      const stmt = db.prepare(sql);
      stmt.bind(params || []);
      
      const rows: any[][] = [];
      while (stmt.step()) {
        rows.push(stmt.get());
      }
      stmt.free();

      self.postMessage({ type: 'query_ok', sql, rows });
    } catch (err: any) {
      self.postMessage({ type: 'query_error', error: err.message });
    }
  }
};
