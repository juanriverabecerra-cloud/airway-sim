import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
function ce(s:any){ const m=s.state.activeMeds?.find((x:any)=>x.name==='Ampicillin/Sulbactam (Unasyn)'); return m?m.Ce:'(not in activeMeds)'; }
for (const [unit,dose] of [['g',3],['mg',3000]] as any) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  stepN(s, 10); giveMed(s, 'Ampicillin/Sulbactam (Unasyn)', dose, { unit }); stepN(s, 30);
  console.log(`dose ${dose}${unit}: unasynCe=${typeof ce(s)==='number'?ce(s).toFixed(3):ce(s)}`);
}
