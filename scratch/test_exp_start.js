import { calibrateComplianceCurve } from '../src/engine/LungComplianceModel.js';
import { computeBreathTrajectory } from '../src/engine/RespiratoryMechanicsModel.js';

const normalLv = { frc_mL: 2400, frc_L: 2.4, tlc_mL: 6000, rv_mL: 1500 };
const curve = calibrateComplianceCurve(normalLv, 60);
const traj = computeBreathTrajectory({
  mode: 'vcv',
  R: 5,
  complianceCurve: curve,
  frc: 2400,
  peep: 5,
  targetVtMl: 450,
  inspTimeSec: 1.0,
  expTimeSec: 2.0
});

console.log("Trajectory points around t = 1.0:");
traj.forEach((s, idx) => {
  if (s.t >= 0.95 && s.t <= 1.15) {
    console.log(`Index ${idx}: t = ${s.t.toFixed(3)}, paw = ${s.paw.toFixed(3)}, flow = ${s.flow.toFixed(3)}, deltaV = ${s.deltaV.toFixed(1)}`);
  }
});

const justAfterExpStart = traj.find((s) => s.t > 1.0 + 0.005);
console.log("justAfterExpStart:", justAfterExpStart);
