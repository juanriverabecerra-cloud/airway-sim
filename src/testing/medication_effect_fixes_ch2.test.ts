import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, getVital, type SimHandle } from './harness/metamorphic';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — fixes surfaced by the medication delivery+effect census.
 *   F26: isoproterenol c50 was ~100x too high (0.5 mg/L) vs its ng/mL clinical scale, so it was
 *        clinically INERT — no chronotropy at any real mcg/min dose (the chronotrope of choice for the
 *        denervated transplant heart / complete heart block).
 *   F27: anaphylaxis triggered at t=0 never progressed (dt frozen at 0 because the onset anchor was set
 *        after the fluidics snapshot and lost on write-back).
 *   Hb : the dynamic bleed/transfusion-adjusted hemoglobin is now exposed as `currentHemoglobin`, and
 *        `baseHb` seeds from a case's `patient.hemoglobin` (anemia respected) instead of a hardcoded 14.5.
 */
describe('Layer 2 — medication/physiology effect fixes (census)', () => {
  it('F26: isoproterenol raises HR (was inert at clinical mcg/min doses)', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, 'isoproterenol', 10, { unit: 'mcg/min', type: 'Infusion' }),
      { key: 'hr', direction: 'up', minDelta: 4, steps: 300, seed: 4 });
    expect(r.pass, `isoproterenol->HR base=${r.base} treat=${r.treat} d=${r.delta}`).toBe(true);
  });

  it('F27: anaphylaxis triggered at t=0 still progresses to shock (MAP down)', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s: SimHandle) => { s.state.patient.anaphylaxisTriggered = true; },
      { key: 'map', direction: 'down', minDelta: 10, steps: 120, settle: 0, seed: 4 });
    expect(r.pass, `anaphylaxis@t0->MAP base=${r.base} treat=${r.treat} d=${r.delta}`).toBe(true);
  });

  it('Hb: transfused PRBC raises the observable currentHemoglobin', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s: SimHandle) => { s.state.patient.prbcVolumeReceivedMl = 600; },
      { key: 'currentHemoglobin', direction: 'up', minDelta: 0.5, steps: 30, seed: 4 });
    expect(r.pass, `PRBC->Hgb base=${r.base} treat=${r.treat} d=${r.delta}`).toBe(true);
  });

  it('Hb: an anemic baseline (case hemoglobin) is respected by the live Hb (not overridden to ~14.5)', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    sim.state.patient.hemoglobin = 8; // chronic anemia set by the case
    stepN(sim, 20);
    const hb = getVital(sim, 'currentHemoglobin');
    expect(hb, `currentHemoglobin=${hb} should reflect the anemic baseline (~8), not a hardcoded ~14.5`).toBeLessThan(10);
  });
});
