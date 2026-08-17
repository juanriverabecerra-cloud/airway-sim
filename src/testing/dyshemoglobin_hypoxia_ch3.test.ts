import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 3 · F39 — dyshemoglobinemia must cause a real tissue-hypoxia consequence, not just a pulse-ox
 * artifact. Methemoglobin (benzocaine/prilocaine) and carboxyhemoglobin (CO) remove Hb from O2 transport
 * → reduced O2 DELIVERY. The anaerobic-metabolism/lactate trigger previously used only the flow (CO) term,
 * so a 40-60% metHb/coHb showed SpO2 ~85% but no lactic acidosis. Fixed by folding the non-functional Hb
 * fraction into an effective O2-delivery ratio (coRatio·(1−dysHbFrac)) that drives the same anaerobic
 * pathway as low flow. These guard the corrected, clinically-graded behaviour: an extraction reserve keeps
 * mild dyshemoglobin compensated, with lactic acidosis emerging only at severe (>~40%) levels.
 */
function lactateAt(field: 'metHb' | 'coHb', level: number, minutes: number): number {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
  for (let i = 0; i < minutes * 60; i++) { (s.state.patient as any)[field] = level; stepN(s, 1); }
  return (s.state.patient as any).lacticAcid;
}

describe('Layer 3 — dyshemoglobin tissue hypoxia (F39)', () => {
  it('severe methemoglobinemia (50%) drives lactic acidosis (was flat at baseline)', () => {
    expect(lactateAt('metHb', 50, 15), 'metHb 50% → lactate').toBeGreaterThan(3.0);
  }, 60000);

  it('mild methemoglobinemia (20%) does NOT (extraction reserve compensates)', () => {
    expect(lactateAt('metHb', 20, 15), 'metHb 20% → no acidosis').toBeLessThan(1.5);
  }, 60000);

  it('severe CO poisoning (coHb 50%) drives lactic acidosis', () => {
    expect(lactateAt('coHb', 50, 15), 'coHb 50% → lactate').toBeGreaterThan(3.0);
  }, 60000);

  it('lactic acidosis is graded by dyshemoglobin severity (60% > 50% metHb)', () => {
    expect(lactateAt('metHb', 60, 12)).toBeGreaterThan(lactateAt('metHb', 50, 12));
  }, 90000);
});
