/** Do the one-shot stochastic "already rolled" memos survive a tick? */
import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed, intubateMechanical } from '../../src/testing/harness/metamorphic';
let spasms = 0, rigid = 0;
for (const seed of [1,2,3,4,5,6,7,8,9,10]) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed, withPIV: true });
  giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12);
  giveMed(s, 'fentanyl', 200, { unit: 'mcg' });
  stepN(s, 240);
  const p: any = s.state.patient;
  if (p.sphincterOfOddiSpasmActive) spasms++;
  if (p.opioidRigidityActive) rigid++;
  const oddiLogs = s.events.filter(e => /phincter of Oddi/.test(e)).length;
  console.log(`seed=${String(seed).padStart(2)} spasm=${String(!!p.sphincterOfOddiSpasmActive).padEnd(5)} rolledMemo=${String(p.sphincterOfOddiRolled)} oddiLogLines=${oddiLogs}`);
}
console.log(`\nsphincter-of-Oddi spasm: ${spasms}/10 patients (documented incidence ~2%)`);
console.log(`opioid chest-wall rigidity: ${rigid}/10 patients (documented incidence ~3%)`);
