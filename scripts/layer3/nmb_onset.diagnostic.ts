import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
function probe(drug: string, dose: number, marks: number[]) {
  const sim = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  giveMed(sim, drug, dose, { unit: 'mg' });
  let t = 0; const maxT = Math.max(...marks); const out: string[] = [];
  for (let i = 0; i < maxT; i++) { stepN(sim, 1); t++; if (marks.includes(t)) out.push(`t${t}=${sim.state.vitals.tofCount}`); }
  console.log(`${drug} ${dose}mg: ${out.join('  ')}`);
}
probe('rocuronium', 50, [15,30,45,60,90,120]);
probe('succinylcholine', 100, [10,20,30,45,60,90]);
probe('vecuronium', 10, [30,60,90,120,180,240]);
probe('cisatracurium', 10, [60,120,180,240,300]);
probe('atracurium', 50, [30,60,120,180,240]);
probe('pancuronium', 8, [60,120,180,240,300]);
probe('mivacurium', 16, [30,60,120,180,240]);
