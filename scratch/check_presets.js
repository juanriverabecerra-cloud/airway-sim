import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve('./src/components/controls/CaseManager.jsx'), 'utf-8');
console.log("Does lastAirwayManipulationTime exist in CaseManager.jsx?", content.includes("lastAirwayManipulationTime"));
