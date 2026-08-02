import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, type Direction, type SimHandle } from './harness/metamorphic';
import { HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — endocrine (glucose) + inotrope/chronotrope direction laws.
 *
 * VERIFIED laws hold. The glucose axis exercises PancreasEngine (insulin uptake, exogenous dextrose),
 * the inotrope axis exercises the CardiovascularEngine's CO coupling. See audit_findings.md:
 *   - F23 (fixed): IV dextrose (D50) now raises blood glucose — the PancreasEngine already accepted an
 *     exogenousDextroseMgPerMin input but the caller never supplied it, so D50 had ZERO glucose effect.
 *   - F24/F25/F26 (open): dobutamine/milrinone CO coupling + isoproterenol delivery — tracked, not yet
 *     codified as VERIFIED (dobutamine RAISES HR here, a true direction, but its CO effect is buggy).
 */
interface Law {
  name: string; mutate: (s: SimHandle) => void; key: string; direction: Direction; minDelta: number; steps: number;
}

const VERIFIED: Law[] = [
  // Inotrope/chronotrope -> cardiac output / heart rate:
  { name: 'epinephrine->CO up', mutate: (s) => giveMed(s, 'epinephrine', 100, { unit: 'mcg' }), key: 'co', direction: 'up', minDelta: 0.3, steps: 40 },
  { name: 'dopamine->CO up', mutate: (s) => giveMed(s, 'dopamine', 10, { unit: 'mcg/kg/min', type: 'Infusion' }), key: 'co', direction: 'up', minDelta: 0.05, steps: 300 },
  { name: 'dobutamine->HR up', mutate: (s) => giveMed(s, 'dobutamine', 10, { unit: 'mcg/kg/min', type: 'Infusion' }), key: 'hr', direction: 'up', minDelta: 5, steps: 200 },
  // Glucose homeostasis:
  { name: 'dextrose->glucose up (F23 fix)', mutate: (s) => giveMed(s, 'dextrose', 25, { unit: 'g' }), key: 'glucose', direction: 'up', minDelta: 5, steps: 200 },
  { name: 'insulin->glucose down', mutate: (s) => giveMed(s, 'regularInsulin', 10, { unit: 'units' }), key: 'glucose', direction: 'down', minDelta: 3, steps: 200 },
];

describe('Layer 2 — endocrine + inotrope direction laws (VERIFIED)', () => {
  for (const law of VERIFIED) {
    it(law.name, () => {
      const r = runMetamorphic(HEALTHY_CASE, law.mutate, {
        key: law.key, direction: law.direction, minDelta: law.minDelta, steps: law.steps, seed: 4,
      });
      expect(r.pass, `${law.name}: base=${r.base} treat=${r.treat} delta=${Math.round((r.delta ?? 0) * 1000) / 1000}`).toBe(true);
    });
  }
});
