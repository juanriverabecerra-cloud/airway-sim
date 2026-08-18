/** When does fentanyl 300mcg genuinely induce apnea (without the spurious 100% rigidity roll)? */
import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
for (const seed of [7,1,2,11,42]) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed, withPIV: true });
  giveMed(s, 'fentanyl', 300, { unit: 'mcg' });
  let tApnea = -1, maxRr = 0;
  for (let i = 0; i < 300; i++) {
    stepN(s, 1);
    const p: any = s.state.patient, v: any = s.state.vitals;
    if (p.isApneic) { if (tApnea < 0) tApnea = i; maxRr = Math.max(maxRr, v.rr); }
  }
  const p: any = s.state.patient;
  const ce = (s.state.activeMeds || []).find((m: any) => m.name === 'Fentanyl')?.Ce;
  console.log(`seed=${String(seed).padStart(2)} apneaAt=${tApnea < 0 ? 'never' : tApnea + 's'} maxRrWhileApneic=${maxRr} rigidity=${p.opioidRigidityActive} Ce@300s=${ce?.toFixed(4)}`);
}
