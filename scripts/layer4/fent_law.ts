/** Does fentanyl lower mean HR once the unrelated 2% biliary-spasm roll is controlled? */
import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed, intubateMechanical } from '../../src/testing/harness/metamorphic';
const mean = (a: any[], k: string) => a.reduce((x, r) => x + r[k], 0) / a.length;
for (const noSpasm of [false, true]) {
  console.log(`\n--- sphincter-of-Oddi spasm ${noSpasm ? 'SUPPRESSED' : 'free to roll (2%)'} ---`);
  for (const seed of [1,2,3,4,5,6,7,8]) {
    const mk = () => { const s = createHeadlessSim(HEALTHY_CASE, { seed, withPIV: true });
      giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12);
      if (noSpasm) (s.state.patient as any).sphincterOfOddiRolled = false;
      return s; };
    const s = mk(), base = mk();
    giveMed(s, 'fentanyl', 200, { unit: 'mcg' });
    stepN(s, 180); stepN(base, 180);
    const ts = stepN(s, 60), tb = stepN(base, 60);
    const d = mean(ts,'hr') - mean(tb,'hr');
    console.log(`  seed=${seed} meanHR fent=${mean(ts,'hr').toFixed(1)} base=${mean(tb,'hr').toFixed(1)} delta=${d.toFixed(1)} ${d <= 0 ? '(bradycardia OK)' : '(TACHY)'} spasm=${(s.state.patient as any).sphincterOfOddiSpasmActive}`);
  }
}
