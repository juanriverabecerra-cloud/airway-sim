import { generatePressureVolumeLoopFromMechanics } from '../src/engine/PressureVolumeLoopModel.js';

const mockPatient = {
  lungVolumes: { frc_mL: 2400, frc_L: 2.4, tlc_mL: 6000, rv_mL: 1500 }
};

const mockVitals = {
  compl: 60,
  res: 5,
  rr: 12,
  peep: 5,
  pip: 20,
  vte: 500
};

const mockVentSettings = {
  mode: 'VCV',
  vt: 500,
  peep: 5,
  ieRatio: 2
};

const loop = generatePressureVolumeLoopFromMechanics(mockPatient, mockVitals, mockVentSettings);
console.log("Num points:", loop.points.length);
console.log("First 10 points:");
console.log(loop.points.slice(0, 10));
console.log("Middle 10 points:");
console.log(loop.points.slice(Math.floor(loop.points.length / 2) - 5, Math.floor(loop.points.length / 2) + 5));
console.log("Last 10 points:");
console.log(loop.points.slice(-10));
