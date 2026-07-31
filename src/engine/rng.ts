/**
 * Deterministic, serializable random-number generation for the physics core.
 *
 * WHY THIS EXISTS
 * ---------------
 * The simulator historically called the global `Math.random()` directly in ~20 places in the tick
 * body and inside 17 engine files. That made runs impossible to reproduce (QA cannot re-create a
 * reported bug; two trainees get different complication rolls on the "same" case) and made
 * golden-master / regression testing impossible. See `docs/architecture/audit_layer1_physics_core.md`.
 *
 * DESIGN
 * ------
 * A *counter-based* PRNG (splitmix32). The entire RNG state is two integers `{ seed, counter }`, so
 * it is trivially serializable — it survives `createSnapshot`/`restoreSnapshot` and can be persisted
 * with a case for exact replay. Each draw hashes `(seed, counter)` and increments `counter`. There
 * is no hidden internal state, unlike a stateful closure PRNG, so snapshotting mid-run and restoring
 * reproduces the identical future sequence.
 *
 * Statistical quality is that of splitmix32: more than adequate for clinical probability rolls
 * (it is NOT cryptographic and must never be used for security).
 */

/** A random source returning a float in [0, 1). Drop-in replacement for `Math.random`. */
export type Rng = () => number;

/** Serializable RNG state. Store this on sim state so it is snapshotted with everything else. */
export interface RngState {
  seed: number;
  counter: number;
}

/** Pure, side-effect-free view of the underlying hash — exposed for tests/verification. */
export function splitmixProbe(seed: number, counter: number): number {
  return splitmix32(seed, counter);
}

/** splitmix32 finalizer over (seed, counter) -> uint32 -> [0,1). */
function splitmix32(seed: number, counter: number): number {
  // Mix the seed and counter into a 32-bit lane, then run the splitmix32 avalanche.
  let z = (seed + Math.imul(counter, 0x9e3779b9)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  z = (z ^ (z >>> 15)) >>> 0;
  return z / 4294967296; // 2^32
}

/**
 * Build an `Rng` bound to a mutable `RngState`. Each call advances `state.counter` IN PLACE, so if
 * `state` is a slice of sim state (e.g. `st.patient.rng`), the advance is captured by the next
 * snapshot automatically.
 */
export function makeRng(state: RngState): Rng {
  return () => {
    const v = splitmix32(state.seed >>> 0, state.counter >>> 0);
    state.counter = (state.counter + 1) >>> 0;
    return v;
  };
}

/** Fresh RNG state from a seed (counter starts at 0). */
export function seedRngState(seed: number): RngState {
  return { seed: (seed >>> 0), counter: 0 };
}

/**
 * Ensure a state-bag has a valid `rng` field and return an `Rng` bound to it. If none exists, one is
 * lazily created. `fallbackSeed` is used only when creating; pass a fixed value in tests for
 * determinism, or omit in production to seed from `Math.random` (the run is then still individually
 * replayable because the chosen seed is stored on `bag.rng.seed` and can be logged/surfaced).
 */
export function ensureRng(bag: { rng?: RngState }, fallbackSeed?: number): Rng {
  if (!bag.rng || typeof bag.rng.seed !== 'number' || typeof bag.rng.counter !== 'number') {
    const seed = (fallbackSeed !== undefined && fallbackSeed !== null && Number.isFinite(fallbackSeed))
      ? (fallbackSeed >>> 0)
      : (Math.floor(Math.random() * 0x100000000) >>> 0);
    bag.rng = seedRngState(seed);
  }
  return makeRng(bag.rng);
}

/** The global, nondeterministic source. Engines default to this so unconverted call sites and the
 *  1,741 existing isolation tests keep their current statistical behavior until a seeded `rng` is
 *  explicitly threaded in. */
export const defaultRng: Rng = Math.random;
