import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
stepN(s, 30);
giveMed(s, 'propofol', 160, { unit: 'mg' });
giveMed(s, 'rocuronium', 50, { unit: 'mg' });
for (const t of [30,60,90,120,180,240]) { stepN(s, t - (s.state.time - 30)); const v:any=s.state.vitals;
  console.log(`t+${t}s: SpO2=${v.spo2?.toFixed(0)} RR=${v.rr?.toFixed(0)} BIS=${v.bis?.toFixed(0)} propCe=${s.state.activeMeds?.find((m:any)=>m.name==='Propofol')?.Ce?.toFixed(1)}`); }
