/**
 * Differential Nerve Conduction Block: Fiber-Selective Local Anesthetic Blockade
 *
 * Phase 3, Stage A of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Before
 * this model, `Pharmacology.js`'s `calculateDermatomalBlockFraction` answered a purely
 * SPATIAL question (which dermatomes fall within a neuraxial block's anatomical spread)
 * and that single coverage fraction was applied uniformly to every modality at that
 * dermatome -- sympathetic, pain, touch, and motor all "blocked" by the same amount, at
 * the same local anesthetic dose. Real local anesthetics block nerve fibers
 * differentially: small, more excitable fibers (sympathetic B-fibers, then pain/
 * temperature C and A-delta fibers) block at lower concentrations than large fibers
 * (touch/pressure A-beta, then motor A-alpha, the most resistant) -- the real mechanism
 * behind "differential block" (a labor epidural can abolish pain and blunt sympathetic
 * tone while sparing enough motor function to walk; a denser surgical block needs a
 * higher concentration to additionally block A-alpha motor fibers). This model adds
 * that missing dose axis, multiplying against the existing spatial coverage rather than
 * replacing it -- both questions ("is this dermatome in range" and "how deeply is it
 * blocked") are genuinely separate and now answered separately.
 *
 * Source: general regional-anesthesia/neurophysiology (the classic fiber-diameter-
 * dependent local anesthetic susceptibility ordering: B > C/A-delta > A-beta > A-alpha)
 * -- not a specific Miller's citation; disclosed per this project's standing convention.
 * EC50 values are a disclosed, reasoned relative ordering (sympathetic/pain blocking at
 * meaningfully lower concentration than motor), not literally measured potency ratios.
 */

export type NerveFiberType = 'sympathetic' | 'painTemperature' | 'touchPressure' | 'motor';

export interface FiberBlockResult {
  sympathetic: number; // 0-1
  painTemperature: number;
  touchPressure: number;
  motor: number;
}

// Relative local-anesthetic-concentration EC50 per fiber class, on the same 0-1+
// "concentrationIndex" scale this model's callers use (1.0 = a typical surgical-density
// epidural/spinal dose) -- lower EC50 means that fiber class blocks at a lower dose.
// Ordering (not the literal numbers) is the physiologically real part: small myelinated
// sympathetic B-fibers are the most susceptible, large myelinated A-alpha motor fibers
// the least.
const FIBER_EC50: Record<NerveFiberType, number> = {
  sympathetic: 0.12,
  painTemperature: 0.20,
  touchPressure: 0.32,
  motor: 0.45
};
const FIBER_GAMMA = 3.0; // steep-ish transition -- differential block is graded but clinically distinguishable, not a smooth continuum

function hillFraction(concentrationIndex: number, ec50: number, gamma: number): number {
  const safeC = Math.max(0, concentrationIndex);
  if (safeC <= 0) return 0;
  const ratio = Math.pow(safeC / ec50, gamma);
  return ratio / (1 + ratio);
}

/**
 * Returns the local anesthetic's blockade fraction for each fiber class at a given
 * concentration index, independent of spatial coverage -- multiply by
 * `calculateDermatomalBlockFraction`'s existing spatial coverage to get the final
 * per-organ, per-modality block degree (see `calculateDifferentialDermatomalBlock`).
 */
export function calculateFiberBlockFractions(concentrationIndex: number): FiberBlockResult {
  const safeC = typeof concentrationIndex === 'number' && Number.isFinite(concentrationIndex) ? Math.max(0, concentrationIndex) : 0;
  return {
    sympathetic: hillFraction(safeC, FIBER_EC50.sympathetic, FIBER_GAMMA),
    painTemperature: hillFraction(safeC, FIBER_EC50.painTemperature, FIBER_GAMMA),
    touchPressure: hillFraction(safeC, FIBER_EC50.touchPressure, FIBER_GAMMA),
    motor: hillFraction(safeC, FIBER_EC50.motor, FIBER_GAMMA)
  };
}

/**
 * Combines spatial dermatomal coverage (the existing `calculateDermatomalBlockFraction`
 * concept -- is this organ's dermatome range within the block's anatomical spread) with
 * fiber-selective concentration-dependent blockade, for a specific fiber modality.
 * `concentrationIndex` defaults to 1.0 (a typical surgical-density block, blocking all
 * fiber classes including motor) to preserve existing callers' behavior exactly when no
 * concentration is specified -- differential, motor-sparing block is an *additional*
 * capability this enables, not a change to default behavior.
 */
export function calculateDifferentialDermatomalBlock(
  spatialCoverageFraction: number,
  fiberType: NerveFiberType,
  concentrationIndex: number = 1.0
): number {
  const safeSpatial = typeof spatialCoverageFraction === 'number' && Number.isFinite(spatialCoverageFraction)
    ? Math.max(0, Math.min(1, spatialCoverageFraction))
    : 0;
  const fiberFractions = calculateFiberBlockFractions(concentrationIndex);
  return safeSpatial * fiberFractions[fiberType];
}
