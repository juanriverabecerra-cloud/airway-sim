import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
function probe(drug: string, dose: number, unit: string, key: 'hr'|'map', marks: number[]) {
  const t = createHeadlessSim(HEALTHY_CASE, { seed: 7, withPIV: true });
  const b = createHeadlessSim(HEALTHY_CASE, { seed: 7, withPIV: true });
  giveMed(t, drug, dose, { unit });
  const maxM = Math.max(...marks)*60; const out: string[] = [];
  for (let s=1;s<=maxM;s++){ stepN(t,1); stepN(b,1);
    if (marks.includes(Math.round(s/60)) && s%60===0){ const tv=t.state.vitals[key]??0, bv=b.state.vitals[key]??0;
      out.push(`${Math.round(s/60)}m:T${tv.toFixed(0)}/B${bv.toFixed(0)}(Δ${(tv-bv).toFixed(0)})`); } }
  console.log(`${drug} ${key}: ${out.join('  ')}`);
}
probe('diltiazem', 20, 'mg', 'hr', [3,5,10,20,40,60]);
