import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, type Direction } from './harness/metamorphic';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — drug → effect DIRECTION laws (metamorphic). Each row is an unambiguous physiology law:
 * give the drug to one of two identical seeded sims and the target vital must move the correct way.
 * A flipped/absent direction is a sign-error finding (audit_findings.md).
 */
interface DrugLaw {
  drug: string; dose: number; unit: string;
  key: string; direction: Direction; minDelta: number; steps: number;
  note?: string;
}

const LAWS: DrugLaw[] = [
  { drug: 'rocuronium',     dose: 50,  unit: 'mg',  key: 'tofCount', direction: 'down', minDelta: 1, steps: 60, note: 'NDMR paralysis' },
  { drug: 'vecuronium',     dose: 10,  unit: 'mg',  key: 'tofCount', direction: 'down', minDelta: 1, steps: 60, note: 'NDMR paralysis' },
  { drug: 'propofol',       dose: 100, unit: 'mg',  key: 'bis',      direction: 'down', minDelta: 5, steps: 30, note: 'hypnosis depth' },
  { drug: 'midazolam',      dose: 5,   unit: 'mg',  key: 'bis',      direction: 'down', minDelta: 3, steps: 45, note: 'sedation' },
  { drug: 'phenylephrine',  dose: 200, unit: 'mcg', key: 'map',      direction: 'up',   minDelta: 3, steps: 25, note: 'alpha-1 vasopressor' },
  { drug: 'norepinephrine', dose: 16,  unit: 'mcg', key: 'map',      direction: 'up',   minDelta: 3, steps: 25, note: 'vasopressor' },
  { drug: 'epinephrine',    dose: 50,  unit: 'mcg', key: 'hr',       direction: 'up',   minDelta: 3, steps: 20, note: 'beta-1 chronotropy' },
  { drug: 'esmolol',        dose: 50,  unit: 'mg',  key: 'hr',       direction: 'down', minDelta: 3, steps: 30, note: 'beta blockade' },
  { drug: 'metoprolol',     dose: 5,   unit: 'mg',  key: 'hr',       direction: 'down', minDelta: 2, steps: 240, note: 'beta blockade (slower onset than esmolol)' },
  { drug: 'atropine',       dose: 1,   unit: 'mg',  key: 'hr',       direction: 'up',   minDelta: 3, steps: 30, note: 'vagolytic' },
  { drug: 'nitroprusside',  dose: 100, unit: 'mcg', key: 'map',      direction: 'down', minDelta: 3, steps: 30, note: 'vasodilator' },
  // fentanyl -> RR is a KNOWN finding (F10), documented in its own test below, not asserted here.
];

describe('Layer 2 — drug→effect direction laws (metamorphic)', () => {
  const results: any[] = [];
  for (const law of LAWS) {
    it(`${law.drug} ${law.dose}${law.unit} => ${law.key} ${law.direction} (${law.note})`, () => {
      const r = runMetamorphic(
        HEALTHY_CASE,
        (sim) => giveMed(sim, law.drug, law.dose, { unit: law.unit }),
        { key: law.key, direction: law.direction, minDelta: law.minDelta, steps: law.steps, seed: 7 },
      );
      results.push({ law: `${law.drug}->${law.key}`, base: r.base, treat: r.treat, delta: Math.round(r.delta * 100) / 100, want: law.direction, pass: r.pass });
      // eslint-disable-next-line no-console
      console.log(`[dir] ${law.drug} ${law.dose}${law.unit} -> ${law.key}: base=${r.base} treat=${r.treat} delta=${Math.round(r.delta * 100) / 100} want=${law.direction} PASS=${r.pass}`);
      expect(r.pass, `${law.drug} -> ${law.key} expected ${law.direction}, got base=${r.base} treat=${r.treat} (delta=${r.delta})`).toBe(true);
    });
  }

  // F10 RESOLVED (Layer 2): opioids now blunt the hypoxic + hypercapnic ventilatory responses, and
  // flag-based apnea (chest-wall rigidity / renarcotization) forces RR to 0. High-dose fentanyl still
  // induces apnea, but RR stays depressed instead of the old paradoxical tachypnea (RR ~25 while
  // apneic). This guards the fix across seeds.
  it('F10 RESOLVED: opioid apnea keeps RR depressed (no paradoxical tachypnea while apneic)', () => {
    for (const seed of [7, 1, 2, 11, 42]) {
      const treat = createHeadlessSim(HEALTHY_CASE, { seed, withPIV: true });
      giveMed(treat, 'fentanyl', 300, { unit: 'mcg' });
      let sawApnea = false;
      let maxRrWhileApneic = 0;
      for (let i = 0; i < 70; i++) {
        stepN(treat, 1);
        const v = treat.state.vitals; const p = treat.state.patient;
        if (p.isApneic) { sawApnea = true; maxRrWhileApneic = Math.max(maxRrWhileApneic, v.rr); }
      }
      expect(sawApnea, `seed ${seed}: fentanyl should still induce apnea`).toBe(true);
      expect(maxRrWhileApneic, `seed ${seed}: F10 fix — RR stays depressed while apneic`).toBeLessThan(13);
    }
  });
});
