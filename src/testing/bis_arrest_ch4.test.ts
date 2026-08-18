import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 4 · F42 — BIS must not oscillate under extreme hypoxia / arrest.
 *
 * Exposed by the F40 fix (an unventilated deep-propofol patient now correctly desaturates to critical
 * hypoxia). The arrest-BIS decrement used `Math.max(0, (st.vitals.bis || 98) - 5)`; because BIS
 * legitimately reaches 0 in arrest and `0 || 98 === 98` in JS, BIS snapped back to 93 every time it hit
 * 0 — a 93→…→0→93 oscillation (seen as BIS 83↔33 at 10 s sampling) in a peri-arrest hypoxic-coma patient
 * whose BIS should be falling toward isoelectric. Fixed with a nullish guard (0 is a valid BIS). A second
 * part gated hypoxia/hypercapnia cortical arousal by anesthetic depth (a GA patient doesn't wake from
 * hypoxia). This guards that BIS declines monotonically to 0 with no large upward resets.
 */
describe('Layer 4 — BIS stability in hypoxic arrest (F42)', () => {
  it('BIS declines toward 0 and does not reset upward (no 0→93 oscillation)', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
    stepN(s, 20);
    giveMed(s, 'propofol', 160, { unit: 'mg' });
    giveMed(s, 'rocuronium', 50, { unit: 'mg' }); // deep anesthesia, unventilated → hypoxic arrest
    const bisSeries: number[] = [];
    for (let i = 0; i < 24; i++) { stepN(s, 10); bisSeries.push(s.state.vitals.bis ?? 98); }
    // Once BIS has gone deep (<=10), it must never jump back up by a large amount (the bug reset it to ~93).
    let maxUpwardJumpAfterDeep = 0;
    let wentDeep = false;
    for (let i = 1; i < bisSeries.length; i++) {
      if (bisSeries[i - 1] <= 10) wentDeep = true;
      if (wentDeep) maxUpwardJumpAfterDeep = Math.max(maxUpwardJumpAfterDeep, bisSeries[i] - bisSeries[i - 1]);
    }
    expect(wentDeep, 'BIS should reach a deep level under this induction').toBe(true);
    expect(maxUpwardJumpAfterDeep, `max upward BIS jump after going deep = ${maxUpwardJumpAfterDeep}`).toBeLessThan(15);
    // And it should end near isoelectric, not bouncing.
    expect(bisSeries[bisSeries.length - 1], 'BIS ends low in arrest').toBeLessThan(10);
  }, 60000);
});
