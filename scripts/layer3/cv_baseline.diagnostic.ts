import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
const marks = [1,5,10,20,30];
let t = 0;
for (const m of marks) { stepN(s, m*60 - t); t = m*60; const v:any=s.state.vitals;
  console.log(`t=${m}min: HR=${v.hr?.toFixed(0)} MAP=${v.map?.toFixed(0)} CO=${v.co?.toFixed(2)} temp=${v.temp?.toFixed(2)} spo2=${v.spo2?.toFixed(0)} glucose=${(s.state.patient as any).glucose?.toFixed(0)}`); }
