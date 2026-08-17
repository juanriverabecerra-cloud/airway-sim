import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
function runCoHb(coHb: number, minutes: number) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
  for (let i = 0; i < minutes*60; i++) { (s.state.patient as any).coHb = coHb; stepN(s, 1); }
  return (s.state.patient as any).lacticAcid;
}
for (const c of [1, 20, 40, 55]) console.log(`coHb=${c}%: lactate@15min = ${runCoHb(c, 15)?.toFixed(2)} mmol/L`);
// trauma baseline (coHb=12 built in) -- confirm no spurious lactate at rest
const tr = createHeadlessSim({ ...HEALTHY_CASE, id: 'trauma', trauma: true } as any, { seed: 3, withPIV: true });
stepN(tr, 15*60);
console.log(`trauma-ish baseline: coHb=${(tr.state.patient as any).coHb?.toFixed(0)} lactate=${(tr.state.patient as any).lacticAcid?.toFixed(2)}`);
