import { generateFlowVolumeLoop, generateVentilatorFlowVolumeLoop } from '../engine/FlowVolumeLoopModel.js';

const normalPatient = { age: 45, sex: 'female', weight: 60, height: 165, ibw: 56, airwaySecured: true };
const normalVitals = { hr: 72, sys: 120, dia: 80, spo2: 99, etco2: 38, rr: 12, res: 5, compl: 60, vte: 500 };
const ventSettings = { mode: 'VCV', vt: 500, rr: 12, peep: 5, ieRatio: 2 };

const ventLoop = generateVentilatorFlowVolumeLoop(normalPatient, normalVitals, ventSettings);
console.log('=== VENTILATOR LOOP ===');
console.log('Points count:', ventLoop.points.length);
console.log('First 5 points (Inspiration starts):', ventLoop.points.slice(0, 5));
console.log('Middle 5 points (Transition to Expiration):', ventLoop.points.slice(35, 40));
console.log('Peak Expiratory Flow (pef):', ventLoop.pef);
console.log('Peak Inspiratory Flow (pif):', ventLoop.pif);

const pftLoop = generateFlowVolumeLoop(normalPatient, normalVitals);
console.log('\n=== PFT LOOP ===');
console.log('Points count:', pftLoop.points.length);
console.log('First 5 points (Expiration starts at TLC):', pftLoop.points.slice(0, 5));
console.log('Middle 5 points (Transition to Inspiration at RV):', pftLoop.points.slice(38, 43));
console.log('PEF:', pftLoop.pef, 'PIF:', pftLoop.pif);
