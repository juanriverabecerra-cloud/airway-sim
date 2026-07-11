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
  mode: 'PCV',
  pinsp: 15,
  peep: 5,
  ieRatio: 2
};

const loop = generatePressureVolumeLoopFromMechanics(mockPatient, mockVitals, mockVentSettings);
console.log("PCV points 0 to 30:");
for (let i = 0; i <= 30; i++) {
  console.log(`Index ${i}: pressure = ${loop.points[i].pressure.toFixed(2)}, volume = ${loop.points[i].volume.toFixed(3)}`);
}
