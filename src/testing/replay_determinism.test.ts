import { describe, it, expect } from 'vitest';
import { createHeadlessSim, makeHeadlessCtx, cloneSimState, stepN, HEALTHY_CASE, type SimHandle } from './harness/headlessSim';

/**
 * Layer 1A — determinism & snapshot/replay.
 *
 * The serializable RNG lives on patient.rng; the hook's createSnapshot deep-clones state while
 * preserving the class prototypes of gasModels/activeMeds (cloneSimState mirrors that). Because the RNG
 * state is captured, restoring a snapshot and continuing reproduces the identical future — true replay.
 */
describe('Layer 1A — determinism & snapshot/replay', () => {
  it('two independent sims from the same seed are identical over 80 ticks', () => {
    const a = stepN(createHeadlessSim(HEALTHY_CASE, { seed: 555 }), 80);
    const b = stepN(createHeadlessSim(HEALTHY_CASE, { seed: 555 }), 80);
    expect(a).toEqual(b);
  });

  it('a snapshot captures the advanced serializable RNG', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 321 });
    stepN(sim, 40);
    const snap = cloneSimState(sim.state);
    expect(snap.patient.rng.seed).toBe(321);
    expect(snap.patient.rng.counter).toBeGreaterThan(0);
  });

  it('restoring a snapshot and continuing reproduces the identical future (true replay)', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 321 });
    stepN(sim, 40); // advance to a mid-run state

    const snap = cloneSimState(sim.state); // prototype-preserving snapshot (as createSnapshot does)
    const contA = stepN(sim, 40); // continue original

    const sim2: SimHandle = { state: snap, ctx: makeHeadlessCtx(snap, [], []), events: [], quality: [] };
    const contB = stepN(sim2, 40); // continue from restored snapshot

    expect(contB).toEqual(contA);
  });
});
