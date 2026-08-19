import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
function opioidRR(drug: string, dose: number, unit: string) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
  stepN(s, 20); const base = s.state.vitals.rr;
  giveMed(s, drug, dose, { unit });
  let minRR = 99; for (let i=0;i<15;i++){ stepN(s,20); minRR=Math.min(minRR, s.state.vitals.rr??99); }
  console.log(`${drug} ${dose}${unit}: RR ${base?.toFixed(0)} -> nadir ${minRR.toFixed(0)}`);
}
opioidRR('fentanyl', 100, 'mcg');   // moderate: clinical RR ~8-10
opioidRR('fentanyl', 250, 'mcg');   // large: clinical RR ~4-6 / apnea
opioidRR('remifentanil', 100, 'mcg'); // potent
opioidRR('morphine', 10, 'mg');     // clinical mild RR drop
