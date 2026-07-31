import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed } from './harness/metamorphic';
// @ts-ignore
import { makeFuzzHandlers, HEALTHY_CASE, type SimHandle } from './harness/headlessSim';

/**
 * Layer 2 — non-drug / metabolic direction laws (metamorphic). Same principle as the drug battery:
 * change ONE input, assert the physiologically-mandated direction of the response.
 */
describe('Layer 2 — physiology direction laws (metamorphic)', () => {
  it('raising FiO2 (NRB 100%) raises PaO2', () => {
    const r = runMetamorphic(
      HEALTHY_CASE,
      (sim: SimHandle) => makeFuzzHandlers(sim).handleSetO2('Non-Rebreather Mask (NRB)', 15, 100),
      { key: 'pao2', direction: 'up', minDelta: 15, steps: 40, seed: 3 },
    );
    expect(r.pass, `FiO2 up -> PaO2 up: base=${r.base} treat=${r.treat} (delta ${r.delta})`).toBe(true);
  });

  it('a large crystalloid bolus raises MAP (preload)', () => {
    const r = runMetamorphic(
      HEALTHY_CASE,
      (sim: SimHandle) => makeFuzzHandlers(sim).handlePushFluid('Normal Saline (0.9% NS)', 2000),
      { key: 'map', direction: 'up', minDelta: 1, steps: 45, seed: 3 },
    );
    expect(r.pass, `fluid bolus -> MAP up: base=${r.base} treat=${r.treat} (delta ${r.delta})`).toBe(true);
  });

  it('furosemide increases urine output', () => {
    const r = runMetamorphic(
      HEALTHY_CASE,
      (sim: SimHandle) => giveMed(sim, 'furosemide', 40, { unit: 'mg' }),
      { key: 'urineOutputRate', direction: 'up', minDelta: 5, steps: 60, seed: 3 },
    );
    expect(r.pass, `furosemide -> urine up: base=${r.base} treat=${r.treat} (delta ${r.delta})`).toBe(true);
  });
});
