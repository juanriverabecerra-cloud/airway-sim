import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 3 · F34 — weight-based microgram BOLUS dosing ('mcg/kg') must multiply by the dosing weight.
 * The unit parser previously matched plain 'mcg' before the '/kg' qualifier, so a 'mcg/kg' bolus dropped
 * the weight factor → a ~70× under-dose (a 2 mcg/kg fentanyl induction delivered 2 mcg total). A
 * 'mcg/kg' dose must equal the weight-equivalent flat 'mcg' dose.
 */
function peakCe(medKey: string, medName: string, dose: number, unit: string): number {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  giveMed(s, medKey, dose, { unit });
  let peak = 0;
  for (let i = 0; i < 12; i++) {
    stepN(s, 20);
    const m = (s.state.activeMeds || []).find((mm: any) => mm.name === medName);
    if (m && m.Ce > peak) peak = m.Ce;
  }
  return peak;
}

describe('Layer 3 — dosing units (F34)', () => {
  it('fentanyl 2 mcg/kg equals the weight-equivalent flat mcg dose (70 kg → 140 mcg)', () => {
    const perKg = peakCe('fentanyl', 'Fentanyl', 2, 'mcg/kg');   // 2 mcg/kg × 70 kg = 140 mcg
    const flat = peakCe('fentanyl', 'Fentanyl', 140, 'mcg');     // 140 mcg flat
    expect(perKg, `mcg/kg peakCe=${perKg} vs flat=${flat}`).toBeGreaterThan(flat * 0.9);
    expect(perKg).toBeLessThan(flat * 1.1);
  });

  it('a mcg/kg bolus is far larger than the same NUMBER taken as flat mcg (weight applied)', () => {
    const perKg = peakCe('fentanyl', 'Fentanyl', 2, 'mcg/kg'); // 140 mcg-equivalent
    const asFlat2 = peakCe('fentanyl', 'Fentanyl', 2, 'mcg');  // 2 mcg — the old buggy result
    expect(perKg, 'weight must be applied → ~70× the flat-2mcg Ce').toBeGreaterThan(asFlat2 * 10);
  });

  it('alfentanil 25 mcg/kg reaches a therapeutic effect-site concentration (not inert)', () => {
    const ce = peakCe('alfentanil', 'Alfentanil', 25, 'mcg/kg'); // 1.75 mg for 70 kg
    // Alfentanil EC50 ~0.1-0.3 mg/L; a 25 mcg/kg bolus should reach the therapeutic range, not ~0.
    expect(ce, `alfentanil peakCe=${ce} mg/L`).toBeGreaterThan(0.05);
  });
});
