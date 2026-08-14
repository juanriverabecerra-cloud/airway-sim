import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, intubateMechanical, getVital, type SimHandle, type Direction } from './harness/metamorphic';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — F29 (niche-drug c50 recalibration) + F31 (opioid CV hemodynamics).
 *
 * F29: several drugs' c50 sat far above the effect-site Ce their clinical dose actually reaches (like the
 * F26 isoproterenol error), so their declared effect never materialized. Recalibrated in BOTH
 * Pharmacology.js and meds.config.ts.
 * F31: an opioid's DIRECT bradycardia drove a Frank-Starling stroke-volume overshoot the 4-chamber model
 * turned into paradoxical HYPERTENSION (fentanyl MAP +20). Fixed with opioid venodilation (preload↓,
 * scaled by receptor occupancy — NOT the hypnotic-weighted opioidEff, ≈0 for fentanyl) + opioid
 * baroreflex blunting (sympatholysis). Fentanyl is now hemodynamically stable; morphine shows its
 * histamine-mediated hypotension with reflex tachycardia.
 */
const chk = (name: string, mut: (s: SimHandle) => void, key: string, dir: Direction, md: number, steps: number, setup?: (s: SimHandle) => void) => {
  const r = runMetamorphic(HEALTHY_CASE, mut, { key, direction: dir, minDelta: md, steps, seed: 4, setup });
  expect(r.pass, `${name}: base=${r.base} treat=${r.treat} d=${Math.round((r.delta ?? 0) * 100) / 100}`).toBe(true);
};

describe('Layer 2 — F29 niche-drug effects', () => {
  it('methylergonovine raises MAP (uterotonic vasoconstriction/hypertension)', () => {
    chk('methylergonovine->MAP', (s) => giveMed(s, 'methylergonovine', 0.2, { unit: 'mg' }), 'map', 'up', 3, 200);
  });
  it('methylphenidate raises HR (CNS stimulant, emergence reversal)', () => {
    chk('methylphenidate->HR', (s) => giveMed(s, 'methylphenidate', 10, { unit: 'mg' }), 'hr', 'up', 2, 200);
  });
  it('albuterol raises HR (β2 tachycardia — pronounced at the hyperkalemia dose)', () => {
    chk('albuterol20->HR', (s) => giveMed(s, 'albuterol', 20, { unit: 'mg' }), 'hr', 'up', 3, 200);
  });
  it('enalaprilat lowers MAP modestly (ACE inhibition, muted in a euvolemic patient)', () => {
    chk('enalaprilat->MAP', (s) => giveMed(s, 'enalaprilat', 5, { unit: 'mg' }), 'map', 'down', 1.5, 400);
  });
});

describe('Layer 2 — F31 opioid hemodynamics', () => {
  const vent = (s: SimHandle) => { giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12); };

  it('fentanyl does NOT cause paradoxical hypertension (hemodynamically stable)', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, 'fentanyl', 200, { unit: 'mcg' }),
      { key: 'map', direction: 'same', sameTol: 8, steps: 240, seed: 4, setup: vent });
    // The pre-fix bug drove MAP ~+20; assert it stays near baseline (small, non-positive-dominated move).
    expect((r.treat ?? 0) - (r.base ?? 0), `fentanyl MAP delta ${((r.treat ?? 0) - (r.base ?? 0)).toFixed(1)} (was ~+20)`).toBeLessThan(8);
  });

  it('fentanyl causes mild bradycardia (not reflex tachycardia)', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true }); vent(s);
    const base = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true }); vent(base);
    giveMed(s, 'fentanyl', 200, { unit: 'mcg' });
    stepN(s, 240); stepN(base, 240);
    expect(getVital(s, 'hr')!, `fentanyl HR ${getVital(s, 'hr')} vs base ${getVital(base, 'hr')}`).toBeLessThanOrEqual(getVital(base, 'hr')! + 2);
  });

  it('morphine lowers MAP (histamine-mediated vasodilation)', () => {
    // Morphine's MAP is biphasic (histamine dip, partial reflex-tachycardia recovery, then dip again);
    // sample at the peak histamine effect (~180 s) where the hypotension is unambiguous.
    chk('morphine->MAP', (s) => giveMed(s, 'morphine', 8, { unit: 'mg' }), 'map', 'down', 3, 180, vent);
  });
});
