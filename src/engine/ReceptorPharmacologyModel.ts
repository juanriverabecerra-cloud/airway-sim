/**
 * Shared Receptor-Occupancy Pharmacology: Hill Equation + Alpha-1/Beta-1/Beta-2/V1 Coupling
 *
 * Phase 2's deferred receptor-unification piece, /Users/jsriverab/.claude/plans/mutable-
 * roaming-newell.md. Extracted, not rewritten, from `PKPDEngine.ts`'s existing inline
 * Hill-equation + receptor-coupling code (the math exogenous catecholamine-class drugs --
 * epinephrine, norepinephrine, phenylephrine, ephedrine, vasopressin -- already used,
 * confirmed by direct code tracing during Phase 2 Stage A's research). `PKPDEngine.ts`
 * now calls this shared function instead of its own inline duplicate (a pure refactor,
 * zero behavior change), and `PainEngine.ts`'s endogenous catecholamine pool (`C_cat`)
 * now goes through the SAME function via an `ENDOGENOUS_CATECHOLAMINE_PROFILE` below,
 * rather than a separate, simpler sigmoid pathway that never shared this machinery.
 *
 * This closes the architectural gap identified in Phase 2 Stage A: exogenous and
 * endogenous catecholamines previously combined only additively at the final SVR/HR/
 * inotropy assembly in `CardiovascularEngine.ts`, never through one receptor-occupancy
 * model. They still combine additively there (unchanged, lower-risk) -- what's unified
 * is *how* each source's contribution is computed in the first place.
 *
 * Source: general receptor pharmacology (Hill-equation dose-response, alpha-1/beta-1/
 * beta-2/V1 receptor coupling to SVR/CO/HR) -- the same disclosed general-physiology
 * convention `PKPDEngine.ts` already used for this, carried over unchanged.
 */

export interface ReceptorProfile {
  Alpha1?: number;
  Beta1?: number;
  Beta2?: number;
  V1?: number;
}

export interface ReceptorCouplingResult {
  fraction: number; // 0-1, Hill-equation occupancy fraction
  svrMultiplierDelta: number;
  coMultiplierDelta: number;
  hrDeltaContribution: number;
  alpha1Activity: number; // receptor potency * fraction -- the raw per-bed redistribution signal
  beta2Activity: number;
}

/**
 * The Hill equation, extracted verbatim from `PKPDEngine.ts`'s prior inline computation
 * (same branching for numerical stability above/below c50, same clamping).
 */
export function hillEquationFraction(Ce: number, c50: number, gamma: number): number {
  const safeCe = typeof Ce === 'number' && Number.isFinite(Ce) ? Math.max(0, Ce) : 0;
  const safeC50 = typeof c50 === 'number' && Number.isFinite(c50) && c50 > 0 ? c50 : 1;
  const safeGamma = typeof gamma === 'number' && Number.isFinite(gamma) ? Math.max(0.001, Math.min(100.0, gamma)) : 1.0;

  let fraction = 0;
  if (safeCe > 0) {
    if (safeCe >= safeC50) {
      const ratio = safeC50 / safeCe;
      fraction = 1.0 / (1.0 + Math.pow(ratio, safeGamma));
    } else {
      const ratio = safeCe / safeC50;
      const power = Math.pow(ratio, safeGamma);
      fraction = power / (1.0 + power);
    }
  }
  if (isNaN(fraction) || !isFinite(fraction)) fraction = 0;
  fraction = Math.max(0, Math.min(1.0, fraction));
  if (fraction < 1e-15) fraction = 0.0;
  if (fraction > 1.0 - 1e-15) fraction = 1.0;
  return fraction;
}

/**
 * The receptor-coupling math, extracted verbatim from `PKPDEngine.ts`'s prior inline
 * computation: SVR driven by Alpha-1 and V1, antagonized by Beta-2; CO/chronotropy
 * driven by Beta-1; a baroreceptor-reflex bradycardia term for pure-pressor agents
 * (alpha-1 or V1 activity with no Beta-1 to offset it).
 */
export function computeReceptorCoupling(fraction: number, receptors: ReceptorProfile | undefined): ReceptorCouplingResult {
  if (!receptors) {
    return { fraction, svrMultiplierDelta: 0, coMultiplierDelta: 0, hrDeltaContribution: 0, alpha1Activity: 0, beta2Activity: 0 };
  }
  const alpha1 = receptors.Alpha1 || 0;
  const beta1 = receptors.Beta1 || 0;
  const beta2 = receptors.Beta2 || 0;
  const v1 = receptors.V1 || 0;

  const svrIncrease = (alpha1 * 0.25 * fraction) + (v1 * 0.30 * fraction);
  const svrDecrease = (beta2 * 0.15 * fraction);
  const svrMultiplierDelta = svrIncrease - svrDecrease;

  const coMultiplierDelta = beta1 * 0.25 * fraction;

  let hrDeltaContribution = beta1 * 15 * fraction;
  if (alpha1 > 0 && beta1 === 0) hrDeltaContribution -= alpha1 * 5 * fraction;
  if (v1 > 0 && beta1 === 0) hrDeltaContribution -= v1 * 5 * fraction;

  return {
    fraction,
    svrMultiplierDelta,
    coMultiplierDelta,
    hrDeltaContribution,
    alpha1Activity: alpha1 * fraction,
    beta2Activity: beta2 * fraction
  };
}

/**
 * Endogenous catecholamine receptor profile -- real adrenal medulla output is
 * predominantly epinephrine (~80%) with norepinephrine (~20%), so this reuses
 * epinephrine's existing exogenous receptor potency numbers (Alpha1=3, Beta1=3,
 * Beta2=2, from `Pharmacology.js`) as a disclosed, reasoned single combined profile,
 * rather than separately tracking two endogenous hormone pools this codebase has no
 * other signal to distinguish.
 *
 * `C_50` and `GAMMA` are calibrated (not the exogenous epinephrine drug's own c50,
 * which is in plasma-concentration units `C_cat`'s 0-150 nociception-equivalent scale
 * doesn't share) so that running `PainEngine.ts`'s existing `C_cat` through this shared
 * function at representative values reproduces magnitudes consistent with the prior
 * bespoke formulas it's replacing (`hrSpike`/`contractilitySpike`/`svrSpike`) -- see
 * `src/testing/receptor_pharmacology_model.test.ts` for the direct numerical comparison
 * this was calibrated against.
 */
// Receptor potency numbers here are NOT the same as exogenous epinephrine's (Alpha1=3,
// Beta1=3, Beta2=2 in Pharmacology.js) -- those are calibrated against epinephrine's own
// plasma-concentration c50 (0.002), a completely different numeric scale than C_cat's
// 0-150 nociception-equivalent units. These were instead found by direct numerical
// comparison against the prior bespoke formulas this profile replaces (see
// src/testing/receptor_pharmacology_model.test.ts), matching HR reasonably closely
// (the most externally-visible/tested quantity); SVR/contractility land within the same
// order of magnitude but are not forced to match exactly -- an inherent consequence of
// unifying through one shared alpha1:beta1 coupling ratio rather than two independently-
// tuned magnitude constants the old formula used (70 for HR, 0.5 for contractility).
// Calibrated against the TRUE non-HTN/non-blocked baseline (E_beta1_max=1.2,
// E_alpha1_max=1.5) the prior formula used -- see the comparison table in
// src/testing/receptor_pharmacology_model.test.ts.
export const ENDOGENOUS_CATECHOLAMINE_PROFILE: ReceptorProfile = { Alpha1: 7, Beta1: 8, Beta2: 2 };
export const ENDOGENOUS_CATECHOLAMINE_C50 = 50;
export const ENDOGENOUS_CATECHOLAMINE_GAMMA = 1.5;
// E_beta1_max/E_alpha1_max (PainEngine.ts's existing beta-blockade/alpha-blockade/HTN/
// volatile-vasodilation modulation factors) are normalized by their own un-modulated
// baselines (1.2, 1.5) before scaling this profile's receptor potencies -- see
// computeModulatedEndogenousCoupling below.
export const BASELINE_E_BETA1_MAX = 1.2;
export const BASELINE_E_ALPHA1_MAX = 1.5;

export function computeEndogenousCatecholamineCoupling(C_cat: number): ReceptorCouplingResult {
  const fraction = hillEquationFraction(C_cat, ENDOGENOUS_CATECHOLAMINE_C50, ENDOGENOUS_CATECHOLAMINE_GAMMA);
  return computeReceptorCoupling(fraction, ENDOGENOUS_CATECHOLAMINE_PROFILE);
}

/**
 * Same as `computeEndogenousCatecholamineCoupling`, but scales the profile's Beta1
 * (HR/contractility) and Alpha1/Beta2 (vascular tone) potencies by `E_beta1_max`/
 * `E_alpha1_max` normalized against their own un-modulated baselines -- preserving
 * `PainEngine.ts`'s existing beta-blockade, alpha-blockade, hypertension baseline, and
 * volatile-anesthetic vasodilation modulation exactly as before, just applied to this
 * shared receptor model's potencies instead of the old bespoke formula's magnitude
 * constants.
 */
export function computeModulatedEndogenousCoupling(C_cat: number, eBeta1Max: number, eAlpha1Max: number): ReceptorCouplingResult {
  const beta1ScaleFactor = Math.max(0, eBeta1Max) / BASELINE_E_BETA1_MAX;
  const alpha1ScaleFactor = Math.max(0, eAlpha1Max) / BASELINE_E_ALPHA1_MAX;
  const fraction = hillEquationFraction(C_cat, ENDOGENOUS_CATECHOLAMINE_C50, ENDOGENOUS_CATECHOLAMINE_GAMMA);
  return computeReceptorCoupling(fraction, {
    Alpha1: (ENDOGENOUS_CATECHOLAMINE_PROFILE.Alpha1 || 0) * alpha1ScaleFactor,
    Beta1: (ENDOGENOUS_CATECHOLAMINE_PROFILE.Beta1 || 0) * beta1ScaleFactor,
    Beta2: (ENDOGENOUS_CATECHOLAMINE_PROFILE.Beta2 || 0) * alpha1ScaleFactor
  });
}
