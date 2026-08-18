/** Verify the roll still FIRES at the right rate (not disabled). Biliary disease = 10x modifier = 20%. */
import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed, intubateMechanical } from '../../src/testing/harness/metamorphic';
for (const risk of [false, true]) {
  let n = 0; const N = 60;
  for (let seed = 1; seed <= N; seed++) {
    const s = createHeadlessSim(HEALTHY_CASE, { seed, withPIV: true });
    if (risk) (s.state.patient as any).biliaryDisease = true;
    giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12);
    giveMed(s, 'fentanyl', 200, { unit: 'mcg' });
    stepN(s, 240);
    if ((s.state.patient as any).sphincterOfOddiSpasmActive) n++;
  }
  console.log(`${risk ? 'biliary disease (expect ~20%)' : 'healthy       (expect ~2%)'}: ${n}/${N} = ${(100*n/N).toFixed(0)}%`);
}
