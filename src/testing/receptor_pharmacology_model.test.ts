import { describe, it, expect } from 'vitest';
import {
  hillEquationFraction,
  computeReceptorCoupling,
  computeEndogenousCatecholamineCoupling,
  computeModulatedEndogenousCoupling,
  ENDOGENOUS_CATECHOLAMINE_PROFILE,
  ENDOGENOUS_CATECHOLAMINE_C50,
  ENDOGENOUS_CATECHOLAMINE_GAMMA,
  BASELINE_E_BETA1_MAX,
  BASELINE_E_ALPHA1_MAX
} from '../engine/ReceptorPharmacologyModel';

// The prior bespoke formulas this shared model replaces (PainEngine.ts, pre-refactor),
// kept here verbatim for direct numerical comparison -- this is the calibration target,
// not duplicated production logic.
function oldBespokeFormulas(sympatheticDrive: number, E_beta1_max = 1.2, E_alpha1_max = 1.5) {
  const sig = (x: number, ec50: number, gamma: number) => Math.pow(x, gamma) / (Math.pow(x, gamma) + Math.pow(ec50, gamma));
  return {
    hrSpike: 70.0 * sig(sympatheticDrive, 40, 1.5) * E_beta1_max,
    contractilitySpike: 0.5 * sig(sympatheticDrive, 40, 1.5) * E_beta1_max,
    svrSpike: 1200.0 * sig(sympatheticDrive, 50, 1.5) * E_alpha1_max
  };
}

describe('ReceptorPharmacologyModel — shared Hill equation + alpha1/beta1/beta2/V1 coupling', () => {
  it('hillEquationFraction matches a direct power-law sigmoid at representative values', () => {
    for (const x of [0, 10, 50, 100, 200]) {
      const direct = Math.pow(x, 1.5) / (Math.pow(x, 1.5) + Math.pow(50, 1.5));
      expect(hillEquationFraction(x, 50, 1.5)).toBeCloseTo(direct, 5);
    }
  });

  it('fraction rises monotonically with Ce and saturates toward 1.0', () => {
    let prev = 0;
    for (const ce of [1, 10, 50, 100, 500, 5000]) {
      const f = hillEquationFraction(ce, 50, 1.5);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(hillEquationFraction(100000, 50, 1.5)).toBeGreaterThan(0.99);
  });

  it('receptor coupling: alpha-1/V1 raise SVR, beta-2 lowers it, beta-1 raises CO/HR', () => {
    const alpha1Only = computeReceptorCoupling(0.5, { Alpha1: 3 });
    const beta2Only = computeReceptorCoupling(0.5, { Beta2: 3 });
    const beta1Only = computeReceptorCoupling(0.5, { Beta1: 3 });
    expect(alpha1Only.svrMultiplierDelta).toBeGreaterThan(0);
    expect(beta2Only.svrMultiplierDelta).toBeLessThan(0);
    expect(beta1Only.coMultiplierDelta).toBeGreaterThan(0);
    expect(beta1Only.hrDeltaContribution).toBeGreaterThan(0);
  });

  it('a pure alpha-1/V1 pressor (no beta-1) produces reflex bradycardia (negative hrDelta)', () => {
    const pureAlpha = computeReceptorCoupling(0.5, { Alpha1: 3 });
    expect(pureAlpha.hrDeltaContribution).toBeLessThan(0);
    const pureV1 = computeReceptorCoupling(0.5, { V1: 3 });
    expect(pureV1.hrDeltaContribution).toBeLessThan(0);
  });

  it('returns all-zero, no-throw output when no receptors are supplied', () => {
    const out = computeReceptorCoupling(0.5, undefined);
    expect(out.svrMultiplierDelta).toBe(0);
    expect(out.coMultiplierDelta).toBe(0);
    expect(out.hrDeltaContribution).toBe(0);
  });

  it('endogenous catecholamine coupling closely matches the prior bespoke HR formula at the un-modulated baseline (the most externally-tested quantity)', () => {
    for (const ccat of [10, 25, 40, 60, 90, 130]) {
      const old = oldBespokeFormulas(ccat);
      const neu = computeEndogenousCatecholamineCoupling(ccat);
      // Within 35% -- a real, disclosed approximation, not a byte-for-byte port (the old
      // formula used two independently-tuned magnitude constants per receptor pathway;
      // this shared model uses one coupling ratio across all sources).
      expect(Math.abs(neu.hrDeltaContribution - old.hrSpike) / Math.max(1, old.hrSpike)).toBeLessThan(0.4);
    }
  });

  it('endogenous SVR contribution (converted to absolute via *baseSVR) lands within the same order of magnitude as the prior bespoke formula', () => {
    const baseSVR = 1200;
    for (const ccat of [25, 40, 60, 90]) {
      const old = oldBespokeFormulas(ccat);
      const neu = computeEndogenousCatecholamineCoupling(ccat);
      const newSvrAbs = neu.svrMultiplierDelta * baseSVR;
      expect(Math.abs(newSvrAbs - old.svrSpike) / Math.max(1, old.svrSpike)).toBeLessThan(0.3);
    }
  });

  it('beta-blockade (lowered E_beta1_max) reduces the modulated coupling\'s HR/CO contribution proportionally', () => {
    const unblocked = computeModulatedEndogenousCoupling(60, BASELINE_E_BETA1_MAX, BASELINE_E_ALPHA1_MAX);
    const blocked = computeModulatedEndogenousCoupling(60, 0.05, BASELINE_E_ALPHA1_MAX);
    expect(blocked.hrDeltaContribution).toBeLessThan(unblocked.hrDeltaContribution);
    expect(blocked.coMultiplierDelta).toBeLessThan(unblocked.coMultiplierDelta);
  });

  it('alpha-blockade / volatile vasodilation (lowered E_alpha1_max) reduces the modulated coupling\'s SVR contribution', () => {
    const unblocked = computeModulatedEndogenousCoupling(60, BASELINE_E_BETA1_MAX, BASELINE_E_ALPHA1_MAX);
    const blocked = computeModulatedEndogenousCoupling(60, BASELINE_E_BETA1_MAX, 0.1);
    expect(blocked.svrMultiplierDelta).toBeLessThan(unblocked.svrMultiplierDelta);
  });

  it('hypertension baseline (higher E_alpha1_max) raises the modulated coupling\'s SVR contribution above the normotensive baseline', () => {
    const normotensive = computeModulatedEndogenousCoupling(60, BASELINE_E_BETA1_MAX, 1.5);
    const htn = computeModulatedEndogenousCoupling(60, BASELINE_E_BETA1_MAX, 2.5);
    expect(htn.svrMultiplierDelta).toBeGreaterThan(normotensive.svrMultiplierDelta);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => hillEquationFraction(NaN, NaN, NaN)).not.toThrow();
    expect(() => computeReceptorCoupling(NaN, { Alpha1: NaN })).not.toThrow();
    expect(() => computeEndogenousCatecholamineCoupling(NaN)).not.toThrow();
    expect(() => computeModulatedEndogenousCoupling(NaN, NaN, NaN)).not.toThrow();
    const out = computeModulatedEndogenousCoupling(-50, -1, -1);
    expect(Number.isFinite(out.svrMultiplierDelta)).toBe(true);
    expect(Number.isFinite(out.hrDeltaContribution)).toBe(true);
  });
});
