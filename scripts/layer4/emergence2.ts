import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed, intubateMechanical } from '../../src/testing/harness/metamorphic';
// neostigmine WITHOUT glyco (what I did) vs WITH glyco (correct practice)
function run(withGlyco: boolean) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  intubateMechanical(s, 12);
  giveMed(s, 'rocuronium', 30, { unit: 'mg' }); giveMed(s, 'propofol', 120, { unit: 'mg' });
  stepN(s, 240); // let block lighten to TOF>=2 (neostigmine needs this)
  console.log(`neostigmine ${withGlyco?'+ glyco':'alone'} (pre TOF=${s.state.vitals.tofCount}):`);
  giveMed(s, 'neostigmine', 3, { unit: 'mg' });
  if (withGlyco) giveMed(s, 'glycopyrrolate', 0.6, { unit: 'mg' });
  for (const t of [30,60,120]) { stepN(s, t===30?30:60); const v:any=s.state.vitals; console.log(`  +${t}s: HR=${v.hr?.toFixed(0)} MAP=${v.map?.toFixed(0)} TOF=${v.tofCount} BIS=${v.bis?.toFixed(0)}`); }
}
run(false); run(true);
