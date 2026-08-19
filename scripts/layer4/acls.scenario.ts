import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
function runACLS(doCPR: boolean, seed: number) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed, withPIV: true });
  const h = makeFuzzHandlers(s);
  stepN(s, 10);
  (s.state.patient as any).cardiacRhythm = 'vfib'; (s.state.patient as any).isArrest = true;
  if (doCPR) h.handleToggleCPR();
  for (let min = 1; min <= 8; min++) {
    if (doCPR) { giveMed(s, 'epinephrine', 1, { unit: 'mg' }); stepN(s, 60); if (min % 2 === 0) h.handleDeliverShock(200, false); }
    else stepN(s, 60);
    const p:any = s.state.patient;
    if (!p.isArrest && (s.state.vitals.hr ?? 0) > 20) return { rosc: true, min };
  }
  return { rosc: false, min: -1 };
}
let withRosc = 0, withoutRosc = 0;
for (let seed = 1; seed <= 4; seed++) { if (runACLS(true, seed).rosc) withRosc++; if (runACLS(false, seed).rosc) withoutRosc++; }
console.log(`ACLS (CPR+epi+shocks): ROSC in ${withRosc}/4 runs`);
console.log(`No CPR (untreated VF):  ROSC in ${withoutRosc}/4 (should be 0)`);
