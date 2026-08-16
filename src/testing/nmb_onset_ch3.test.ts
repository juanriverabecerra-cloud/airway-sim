import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 3 · F35 — neuromuscular-blocker ONSET timing.
 *
 * Root cause: NMJ occupancy fed `maxNMJOccupancy` from TWO paths — the hand-tuned per-drug
 * onset curves in usePhysiology.js AND the generic PKPD Hill fraction (Ce^γ/(Ce^γ+c50^γ)),
 * combined with a max(). For succinylcholine the low c50 saturates the Hill curve almost
 * instantly, so it reached complete block (TOF0) at ~5s regardless of the per-drug curve;
 * rocuronium's per-drug curve also saturated at ~14% of its peak Ce, giving TOF0 at ~20s.
 * Clinically, roc 0.6-0.9 mg/kg intubates at 60-90s and sux 1-1.5 mg/kg at 30-60s
 * (Miller's Ch27; Naguib). Fix: the redundant Hill path was removed (per-drug curves are now
 * authoritative) and the roc/sux curves were re-sloped so complete block tracks effect-site
 * equilibration. These guards pin the corrected onset so a future edit can't silently restore
 * the instantaneous block.
 */
function tofAt(drug: string, dose: number, seconds: number): number {
  const sim = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  giveMed(sim, drug, dose, { unit: 'mg' });
  stepN(sim, seconds);
  return sim.state.vitals.tofCount ?? 4;
}

describe('Layer 3 — NMB onset timing (F35)', () => {
  it('rocuronium 50mg is NOT fully blocked at 20s (was TOF0 — onset ~3x too fast)', () => {
    // Early: real onset shows a graded TOF fade, not an instantaneous 4→0.
    expect(tofAt('rocuronium', 50, 20), 'roc must not reach complete block by 20s').toBeGreaterThan(0);
  });
  it('rocuronium 50mg reaches a deep block (TOF<=1) by ~60s and complete block by ~90s', () => {
    expect(tofAt('rocuronium', 50, 60), 'roc deep block by 60s').toBeLessThanOrEqual(1);
    expect(tofAt('rocuronium', 50, 90), 'roc complete block by 90s').toBe(0);
  });
  it('succinylcholine 100mg is NOT fully blocked at 15s (was TOF0 at ~5s — ~10x too fast)', () => {
    expect(tofAt('succinylcholine', 100, 15), 'sux must not reach complete block by 15s').toBeGreaterThan(0);
  });
  it('succinylcholine 100mg reaches complete block (TOF0) by ~60s (clinical 30-60s)', () => {
    expect(tofAt('succinylcholine', 100, 60), 'sux complete block by 60s').toBe(0);
  });
});
