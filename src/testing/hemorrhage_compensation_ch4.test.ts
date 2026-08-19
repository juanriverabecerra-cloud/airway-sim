import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 4 · F43 (compensation curve) — hemorrhage must follow the ATLS class progression.
 *
 * Before the fix the response was grossly over-steep: MAP crashed to ~63 at just 10% loss (no Class I-II
 * compensation) and the patient arrested at ~32% loss. Root cause: the venous reservoir (which defends
 * preload) was recruited only in proportion to a baroreflex-driven SVR rise, which is weak at low loss —
 * so CO crashed. Fix: a direct, SATURATING blood-loss-driven recruitment of the unstressed venous reservoir
 * (FourChamberCircuitModel), defending the first ~20% of loss then exhausting so Class III-IV decompensate.
 * These guard the corrected curve: Class I-II compensated (MAP maintained), Class IV decompensated.
 */
function mapAtLoss(pct: number): { hr: number; map: number } {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const ebv = (s.state.patient as any).ebv || 5000;
  stepN(s, 10);
  (s.state.patient as any).ebl = ebv * pct / 100;
  stepN(s, 60);
  return { hr: s.state.vitals.hr ?? 0, map: s.state.vitals.map ?? 0 };
}

describe('Layer 4 — hemorrhage compensation curve (F43)', () => {
  it('Class I-II loss (10-20%) is COMPENSATED — MAP maintained (was ~62)', () => {
    expect(mapAtLoss(10).map, '10% loss MAP').toBeGreaterThan(72);
    expect(mapAtLoss(20).map, '20% loss MAP').toBeGreaterThan(72);
  });
  it('Class IV loss (40%) is DECOMPENSATED — MAP clearly falls', () => {
    expect(mapAtLoss(40).map, '40% loss MAP').toBeLessThan(68);
  });
  it('tachycardia is graded and physiologically capped, not runaway (was 149 at 10%, 240 at 50%)', () => {
    expect(mapAtLoss(10).hr, '10% loss HR').toBeLessThan(120);   // Class I: mild
    expect(mapAtLoss(50).hr, '50% loss HR').toBeLessThanOrEqual(205); // capped
  });
});
