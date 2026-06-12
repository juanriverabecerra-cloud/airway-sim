import fs from 'fs';

const path = '/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/parsed texts/Millers_Anaesthesia_9th_Edition_Chapter_20.json';
const doc = JSON.parse(fs.readFileSync(path, 'utf-8'));
console.log(doc.fragments[0].rawText.substring(0, 300));
