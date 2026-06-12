import fs from 'fs';

const path = '/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/parsed texts/Millers_Anaesthesia_9th_Edition_Chapter_19.json';
const doc = JSON.parse(fs.readFileSync(path, 'utf-8'));

const keywords = ['partition', 'solubility', 'concentration effect', 'second gas', 'diffusion hypoxia', 'mac', 'potency', 'gaba', 'potassium', 'halothane', 'isoflurane', 'sevoflurane', 'desflurane'];

doc.fragments.forEach(frag => {
  const lines = frag.rawText.split('\n');
  lines.forEach((line, idx) => {
    const matched = keywords.filter(kw => line.toLowerCase().includes(kw));
    if (matched.length > 0) {
      console.log(`Page ${frag.pageNumber}, Line ${idx}: [Matched: ${matched.join(', ')}]`);
      console.log(`  ${line}`);
      // print surrounding lines
      const start = Math.max(0, idx - 1);
      const end = Math.min(lines.length - 1, idx + 2);
      for (let i = start; i <= end; i++) {
        if (i !== idx) {
          console.log(`    ${i}: ${lines[i]}`);
        }
      }
      console.log('---');
    }
  });
});
