import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 2 — sugammadex reversal (F8). The chelate() method used to reduce only the plasma compartment,
 * so the effect-site Ce (which drives NMJ occupancy/TOF) never fell and reversal silently failed even
 * at 16 mg/kg. Fixed by encapsulating drug from all compartments incl. Ce. These guard the corrected
 * dose-dependent behaviour.
 */
function rocThenSugammadex(sugMg: number, steps = 120): number[] {
  const sim = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  giveMed(sim, 'rocuronium', 50, { unit: 'mg' }); // deep block
  stepN(sim, 60);
  expect(sim.state.vitals.tofCount, 'rocuronium should produce a deep block').toBeLessThanOrEqual(1);
  giveMed(sim, 'sugammadex', sugMg, { unit: 'mg' });
  const tof: number[] = [];
  for (let i = 0; i < steps; i++) { stepN(sim, 1); tof.push(sim.state.vitals.tofCount); }
  return tof;
}

describe('Layer 2 — sugammadex NMB reversal (F8)', () => {
  it('a RESCUE dose (16 mg/kg ≈ 1280 mg) restores TOF to 4/4', () => {
    const tof = rocThenSugammadex(1280, 120);
    const maxTof = Math.max(...tof);
    expect(maxTof, 'rescue sugammadex must fully reverse a deep block').toBe(4);
    // and reach it promptly (well within the clinical ~2 min)
    const firstFullIdx = tof.findIndex((t) => t === 4);
    expect(firstFullIdx).toBeGreaterThanOrEqual(0);
    expect(firstFullIdx, 'reversal should occur within ~2 min').toBeLessThan(120);
  });

  it('an ADEQUATE deep-block dose (≈5 mg/kg) reverses to 4/4', () => {
    const tof = rocThenSugammadex(400, 60);
    expect(Math.max(...tof), 'adequate dose reverses a deep block').toBe(4);
  });

  it('an INADEQUATE dose (≈2.5 mg/kg on a deep block) does NOT sustain full reversal', () => {
    const tof = rocThenSugammadex(200, 120);
    // Clinically correct: an under-dose on a deep block gives at most transient/partial recovery.
    const sustainedFull = tof.slice(-30).every((t) => t === 4);
    expect(sustainedFull, 'under-dose must not sustain 4/4 on a deep block').toBe(false);
  });
});
