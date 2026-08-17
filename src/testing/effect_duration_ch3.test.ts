import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 3 · F37 — longer-acting bolus agents had effect DURATIONS ~5-10x too short. For these
 * agents the hemodynamic effect follows the fast central/redistribution (α) decline, so a drug
 * whose clinical effect lasts hours wore off in minutes (diltiazem effect-t½ ~7 min vs clinical
 * 1-3 h; metoprolol ~17 min vs 3-6 h; etc.). Root fix: lower each agent's k10 (elimination) and,
 * for the 2-compartment agents, moderate k12 (less redistribution loss) + raise k21 (return sustains
 * the central tail) — lengthening the effect while holding the calibrated peak effect. Verified with
 * a faithful standalone PK integrator (matches the sim's Ce to <1%) plus full-sim spot checks.
 *
 * These guards are horizon-limited (full-sim runs are compute-heavy) but pin the KEY property: the
 * effect is still clearly present at a timepoint where the OLD model had already worn off. They use
 * treated-vs-baseline deltas at a mid-early horizon to stay robust against baseline drift.
 */
function deltaAt(drug: string, dose: number, unit: string, key: 'hr'|'map', minutes: number): number {
  const t = createHeadlessSim(HEALTHY_CASE, { seed: 7, withPIV: true });
  const b = createHeadlessSim(HEALTHY_CASE, { seed: 7, withPIV: true });
  giveMed(t, drug, dose, { unit });
  stepN(t, minutes * 60); stepN(b, minutes * 60);
  return (t.state.vitals[key] ?? 0) - (b.state.vitals[key] ?? 0);
}

describe('Layer 3 — bolus effect duration (F37)', () => {
  it('diltiazem still depresses HR at 15 min (old effect-t½ ~7 min → worn off by now)', () => {
    // Old model: ~2 effect-half-lives past peak → effect largely gone. New: clearly still present.
    expect(deltaAt('diltiazem', 20, 'mg', 'hr', 15), 'diltiazem HR effect persists at 15 min').toBeLessThan(-6);
  }, 60000);

  it('metoprolol still depresses HR at 30 min (old effect-t½ ~17 min → mostly gone)', () => {
    expect(deltaAt('metoprolol', 5, 'mg', 'hr', 30), 'metoprolol HR effect persists at 30 min').toBeLessThan(-4);
  }, 60000);

  it('labetalol still lowers MAP at 30 min (old effect-t½ ~14 min → mostly gone)', () => {
    expect(deltaAt('labetalol', 20, 'mg', 'map', 30), 'labetalol MAP effect persists at 30 min').toBeLessThan(-5);
  }, 60000);
});
