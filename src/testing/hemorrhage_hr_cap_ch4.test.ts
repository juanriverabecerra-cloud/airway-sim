import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 4 · F43 (part 1) — sinus HR must be capped at a physiologic maximum.
 *
 * Found in the blind hemorrhage-scenario review: the `targetHR` sum in CardiovascularEngine had only a
 * lower clamp (max(0,…)), so a severe-hemorrhage stress stack drove HR to physically impossible values
 * (measured 214→240 at 40-50% blood loss). The maximum attainable sinus rate is ~220−age. Fixed by
 * capping targetHR at max(150, min(205, 220−age)). (The broader F43 finding — the hemorrhage compensation
 * curve, where CO is too preload-sensitive and the SVR baroreflex too weak, so MAP crashes at Class I-II
 * loss — is characterized and deferred to a focused CV-hemodynamics recalibration.)
 */
describe('Layer 4 — sinus HR physiologic cap (F43)', () => {
  it('severe hemorrhage does not drive HR to impossible values (was 240)', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
    const ebv = (s.state.patient as any).ebv || 5000;
    const age = (s.state.patient as any).age ?? 40;
    stepN(s, 10);
    (s.state.patient as any).ebl = ebv * 0.5; // 50% loss — maximal stress
    stepN(s, 60);
    const hr = s.state.vitals.hr ?? 0;
    const maxSinus = Math.max(150, Math.min(205, 220 - age));
    expect(hr, `HR at 50% loss = ${hr}`).toBeLessThanOrEqual(maxSinus + 1);
    expect(hr, 'HR should still be a real tachycardia, not zero').toBeGreaterThan(120);
  }, 60000);
});
