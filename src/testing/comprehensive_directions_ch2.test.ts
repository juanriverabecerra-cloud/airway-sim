import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, type Direction } from './harness/metamorphic';
import { HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — comprehensive direction laws (electrolytes, calcium-channel blockers, antiarrhythmics,
 * chronotropes, osmotic diuretic). VERIFIED laws hold; DOCUMENTED FINDINGS pin remaining bugs.
 */
interface Law { name: string; drug: string; dose: number; unit: string; key: string; direction: Direction; minDelta: number; steps: number; }

const VERIFIED: Law[] = [
  { name: 'magnesium->MAP down', drug: 'magnesium', dose: 2000, unit: 'mg', key: 'map', direction: 'down', minDelta: 3, steps: 40 },
  { name: 'calcium->MAP up', drug: 'calcium', dose: 1000, unit: 'mg', key: 'map', direction: 'up', minDelta: 2, steps: 30 },
  { name: 'adenosine->HR down', drug: 'adenosine', dose: 6, unit: 'mg', key: 'hr', direction: 'down', minDelta: 3, steps: 15 },
  // F17/F18/F19 fix (rate-control drugs now wired to HR):
  { name: 'diltiazem->HR down', drug: 'diltiazem', dose: 20, unit: 'mg', key: 'hr', direction: 'down', minDelta: 2, steps: 60 },
  { name: 'verapamil->HR down', drug: 'verapamil', dose: 5, unit: 'mg', key: 'hr', direction: 'down', minDelta: 2, steps: 60 },
  { name: 'amiodarone->HR down', drug: 'amiodarone', dose: 150, unit: 'mg', key: 'hr', direction: 'down', minDelta: 2, steps: 90 },
  { name: 'glucagon->HR up', drug: 'glucagon', dose: 1, unit: 'mg', key: 'hr', direction: 'up', minDelta: 2, steps: 40 },
  // F16 fix (magnesium no longer produces paradoxical reflex tachycardia — direct AV-slowing +
  // sympatholytic decrement now dominates the reflex from its BP drop; deepens toward bradycardia):
  { name: 'magnesium->HR down (no reflex tachy)', drug: 'magnesium', dose: 2000, unit: 'mg', key: 'hr', direction: 'down', minDelta: 5, steps: 40 },
  // F20 fix (mannitol now produces a real osmotic diuresis, comparable to 40 mg furosemide):
  { name: 'mannitol->urine up', drug: 'mannitol', dose: 25, unit: 'g', key: 'urineOutputRate', direction: 'up', minDelta: 5, steps: 60 },
];

describe('Layer 2 — comprehensive direction laws (VERIFIED)', () => {
  for (const law of VERIFIED) {
    it(law.name, () => {
      const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, law.drug, law.dose, { unit: law.unit }),
        { key: law.key, direction: law.direction, minDelta: law.minDelta, steps: law.steps, seed: 4 });
      expect(r.pass, `${law.name}: base=${r.base} treat=${r.treat} delta=${Math.round((r.delta ?? 0) * 100) / 100}`).toBe(true);
    });
  }
});

// F16 and F20 were fixed (magnesium reflex tachycardia; mannitol osmotic diuresis) and their laws
// moved into VERIFIED above. No DOCUMENTED FINDINGS remain in this battery — a regression in the
// VERIFIED laws means a physiology coupling has broken.
