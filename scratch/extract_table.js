import fs from 'fs';

const jsonPath = '/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/parsed texts/Millers_Anaesthesia_9th_Edition_Chapter_33.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const table = data.visual_data_engines[0].details;
console.log("Headers:", table.headers);
console.log("Rows:");
table.matrix_rows.forEach((row, i) => {
  console.log(`Row ${i}:`, JSON.stringify(row));
});
