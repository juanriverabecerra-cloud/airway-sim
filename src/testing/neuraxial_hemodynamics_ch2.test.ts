import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { getVital } from './harness/metamorphic';

/**
 * Layer 2 — neuraxial (spinal/epidural) hemodynamics (F33). A neuraxial block sympathectomizes the
 * chain below its cephalad extent → arterial + venous vasodilation (splanchnic pooling) → reduced
 * preload → HYPOTENSION. The same sympathectomy blunts the compensatory baroreflex, so the hypotension
 * is NOT met by a large reflex tachycardia; and a HIGH block reaching the cardiac accelerators (T1–T4)
 * produces BRADYCARDIA (the classic high-spinal sign). Before F33, a neuraxial block answered its own
 * hypotension with a spurious ~+50 bpm reflex tachycardia, and a high block caused LESS hypotension.
 */
function run(setup: (s: any) => void, steps = 160) {
  const base = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  setup(s);
  stepN(base, steps); stepN(s, steps);
  return { mapΔ: getVital(s, 'map')! - getVital(base, 'map')!, hrΔ: getVital(s, 'hr')! - getVital(base, 'hr')!, hr: getVital(s, 'hr')! };
}

describe('Layer 2 — neuraxial hemodynamics (F33)', () => {
  it('a mid-thoracic epidural (T8) drops blood pressure (sympathectomy)', () => {
    const r = run((s) => { s.state.patient.epiduralBlockActive = true; s.state.patient.epiduralLevel = 8; });
    expect(r.mapΔ, `T8 epidural MAPΔ=${r.mapΔ.toFixed(0)}`).toBeLessThan(-10);
  });

  it('a HIGH block (T4) drops BP AND causes bradycardia (cardiac accelerator block)', () => {
    const r = run((s) => { s.state.patient.epiduralBlockActive = true; s.state.patient.epiduralLevel = 4; });
    expect(r.mapΔ, `T4 epidural MAPΔ=${r.mapΔ.toFixed(0)}`).toBeLessThan(-8);
    expect(r.hrΔ, `T4 epidural HRΔ=${r.hrΔ.toFixed(0)} — should NOT be a large reflex tachycardia`).toBeLessThan(6);
  });

  it('a high block does NOT produce a large reflex tachycardia (sympathectomy blunts it)', () => {
    const r = run((s) => { s.state.patient.epiduralBlockActive = true; s.state.patient.epiduralLevel = 4; });
    // Contrast: pre-F33 a T4 block gave HR ~95–130. Now the cardiac sympathetic block keeps it low.
    expect(r.hr, `T4 epidural HR=${r.hr.toFixed(0)}`).toBeLessThan(80);
  });

  it('a celiac plexus block (splanchnic sympathectomy) drops blood pressure', () => {
    const r = run((s) => { s.state.patient.celiacBlockActive = true; });
    expect(r.mapΔ, `celiac MAPΔ=${r.mapΔ.toFixed(0)}`).toBeLessThan(-12);
  });
});
