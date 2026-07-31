import { describe, it, expect } from 'vitest';
import { makeRng, seedRngState, ensureRng, splitmixProbe } from '../engine/rng';

describe('Deterministic RNG (Layer 1A)', () => {
  it('produces floats in [0,1)', () => {
    const rng = makeRng(seedRngState(12345));
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic: same seed => identical sequence', () => {
    const a = makeRng(seedRngState(42));
    const b = makeRng(seedRngState(42));
    const seqA = Array.from({ length: 200 }, () => a());
    const seqB = Array.from({ length: 200 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds => different sequences', () => {
    const a = makeRng(seedRngState(1));
    const b = makeRng(seedRngState(2));
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('is serializable/resumable: state carries the exact future sequence', () => {
    const state = seedRngState(777);
    const rng = makeRng(state);
    for (let i = 0; i < 37; i++) rng(); // advance
    // Snapshot the plain state, keep drawing on the original...
    const snapshot = { ...state };
    const continued = Array.from({ length: 20 }, () => rng());
    // ...then resume a fresh RNG from the snapshot and expect identical draws.
    const resumed = makeRng(snapshot);
    const replay = Array.from({ length: 20 }, () => resumed());
    expect(replay).toEqual(continued);
  });

  it('ensureRng lazily seeds a bag and is stable across calls', () => {
    const bag: { rng?: any } = {};
    const r1 = ensureRng(bag, 999);
    expect(bag.rng).toEqual({ seed: 999, counter: 0 });
    const first = r1();
    // A second ensureRng on the same bag must NOT reseed — it rebinds to the advanced counter.
    const r2 = ensureRng(bag, 999);
    const second = r2();
    const fresh = makeRng(seedRngState(999));
    expect([first, second]).toEqual([fresh(), fresh()]);
  });

  it('has a reasonably uniform distribution (coarse chi-square sanity)', () => {
    const rng = makeRng(seedRngState(2026));
    const bins = new Array(10).fill(0);
    const N = 100000;
    for (let i = 0; i < N; i++) bins[Math.min(9, Math.floor(rng() * 10))]++;
    const expected = N / 10;
    // No bin should deviate more than ~8% from expectation for a decent PRNG at this N.
    for (const c of bins) expect(Math.abs(c - expected) / expected).toBeLessThan(0.08);
  });

  it('splitmixProbe matches makeRng draw-for-draw (pure hash exposed for tests)', () => {
    const state = seedRngState(55);
    const rng = makeRng(seedRngState(55));
    for (let c = 0; c < 100; c++) {
      expect(splitmixProbe(55, c)).toEqual(rng());
    }
    void state;
  });
});
