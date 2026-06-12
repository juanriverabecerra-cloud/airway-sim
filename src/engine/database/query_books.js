import Database from 'better-sqlite3';

const dbPath = '/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/knowledge/medical_truth.db';
const db = new Database(dbPath);

console.log('--- Unique Source Books ---');
const books = db.prepare("SELECT DISTINCT source_book FROM textbook_prose ORDER BY source_book").all();
console.log(books);
