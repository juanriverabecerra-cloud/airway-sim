import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = '/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/knowledge/medical_truth.db';
const db = new Database(dbPath);

console.log('--- Prose Topics for Chapter 19 ---');
const proseRows = db.prepare("SELECT topic, id, length(body_text) as len FROM textbook_prose WHERE source_book LIKE '%Chapter_19%'").all();
console.log(proseRows);

console.log('--- Matrices Topics for Chapter 19 ---');
const matrixRows = db.prepare("SELECT topic, id, archetype, caption FROM physiological_matrices WHERE source_book LIKE '%Chapter_19%'").all();
console.log(matrixRows);
