import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 3 · F38 — exogenous corticosteroids drive steroid hyperglycemia. The PancreasEngine's glucose
 * flux previously used only ENDOGENOUS cortisol; exogenous steroid Ce was computed but sent only to a
 * logging-only model, so IV dexamethasone/hydrocortisone/methylprednisolone never raised glucose. They
 * now feed the flux as a potency-scaled glucocorticoid-equivalent.
 */
describe('Layer 3 — steroid hyperglycemia (F38)', () => {
  it('IV dexamethasone raises blood glucose (was unmodeled)', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    const b = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    giveMed(s, 'dexamethasone', 8, { unit: 'mg' });
    let peakDelta = 0;
    for (let i = 0; i < 8; i++) { // ~40 min, capturing the steroid-hyperglycemia peak
      stepN(s, 300); stepN(b, 300);
      const d = (s.state.patient.glucose ?? 0) - (b.state.patient.glucose ?? 0);
      if (d > peakDelta) peakDelta = d;
    }
    expect(peakDelta, `dexamethasone glucose rise=${peakDelta.toFixed(1)} mg/dL`).toBeGreaterThan(3);
  }, 90000); // steroid hyperglycemia peaks ~35 min; the long sim run needs a raised per-test timeout
});
