import { PainEngine } from '../src/engine/PainEngine.ts';

const runTest = (initPatient) => {
  let triggers = 0;
  for (let i = 0; i < 1000; i++) {
    const patient = { ...initPatient };
    const vitals = {
      hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98
    };
    for (let t = 0; t < 15; t++) {
      const out = PainEngine.tick(1, patient, vitals, [], 0, t);
      if (out.somaticResponse.triggerLaryngospasm || out.somaticResponse.triggerBronchospasm) {
        triggers++;
        break; // Count once per simulation run
      }
    }
  }
  return triggers;
};

console.log("Triggers with undefined lastAirwayManipulationTime:", runTest({
  surgicalPhase: 'Pre-Op',
  isParalyzed: false,
  airwaySecured: false
}));

console.log("Triggers with lastAirwayManipulationTime = 0:", runTest({
  surgicalPhase: 'Pre-Op',
  isParalyzed: false,
  airwaySecured: false,
  lastAirwayManipulationTime: 0
}));
