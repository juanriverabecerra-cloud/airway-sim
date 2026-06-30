import { describe, it, expect } from 'vitest';
import { ThyroidEngine } from '../engine/ThyroidEngine';

describe('ThyroidEngine — T3/T4 axis, basal metabolic rate, thyroid storm', () => {
  it('euthyroid patients show no metabolic/HR/temperature shift', () => {
    const out = ThyroidEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, {});
    expect(out.thyroidMetabolicMultiplier).toBeCloseTo(1.0, 5);
    expect(out.hrBaselineShift).toBeCloseTo(0, 5);
    expect(out.tempBaselineShift).toBeCloseTo(0, 5);
    expect(out.thyroidStormActive).toBe(false);
  });

  it('hypothyroidism lowers metabolic rate, HR baseline, and temperature baseline', () => {
    const out = ThyroidEngine.tick(1, { patient: { hypothyroidism: true, thyroidFunctionIndex: 0.6 }, vitals: {}, time: 0 }, {});
    expect(out.thyroidMetabolicMultiplier).toBeLessThan(1.0);
    expect(out.hrBaselineShift).toBeLessThan(0);
    expect(out.tempBaselineShift).toBeLessThan(0);
  });

  it('hyperthyroidism raises metabolic rate, HR baseline, and temperature baseline', () => {
    const out = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, thyroidFunctionIndex: 1.5 }, vitals: {}, time: 0 }, {});
    expect(out.thyroidMetabolicMultiplier).toBeGreaterThan(1.0);
    expect(out.hrBaselineShift).toBeGreaterThan(0);
    expect(out.tempBaselineShift).toBeGreaterThan(0);
  });

  it('antithyroid medication blunts (but does not fully normalize) the hyperthyroid target', () => {
    const treated = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, onAntithyroidMeds: true, thyroidFunctionIndex: 1.0 }, vitals: {}, time: 0 }, {});
    const untreated = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, thyroidFunctionIndex: 1.0 }, vitals: {}, time: 0 }, {});
    // Both start from the same index this single tick (slow kinetics mean the target
    // only nudges current index slightly); confirm the direction differs by checking
    // many ticks where the drift compounds.
    let treatedPatient: any = { hyperthyroidism: true, onAntithyroidMeds: true, thyroidFunctionIndex: 1.0 };
    let untreatedPatient: any = { hyperthyroidism: true, thyroidFunctionIndex: 1.0 };
    let treatedOut: any, untreatedOut: any;
    for (let i = 0; i < 100000; i++) {
      treatedOut = ThyroidEngine.tick(1, { patient: treatedPatient, vitals: {}, time: i }, {});
      treatedPatient = { ...treatedPatient, thyroidFunctionIndex: treatedOut.thyroidFunctionIndex };
      untreatedOut = ThyroidEngine.tick(1, { patient: untreatedPatient, vitals: {}, time: i }, {});
      untreatedPatient = { ...untreatedPatient, thyroidFunctionIndex: untreatedOut.thyroidFunctionIndex };
    }
    expect(untreatedOut.thyroidFunctionIndex).toBeGreaterThan(treatedOut.thyroidFunctionIndex);
  });

  it('thyroid storm triggers under high surgical stress in untreated hyperthyroidism, and not when beta-blocked', () => {
    const untreated = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, thyroidFunctionIndex: 1.5 }, vitals: {}, time: 0 }, { surgicalStressIndex: 80 });
    const betaBlocked = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, thyroidFunctionIndex: 1.5, onBetaBlocker: true }, vitals: {}, time: 0 }, { surgicalStressIndex: 80 });
    expect(untreated.thyroidStormActive).toBe(true);
    expect(untreated.events.length).toBeGreaterThan(0);
    expect(betaBlocked.thyroidStormActive).toBe(false);
  });

  it('thyroid storm dramatically amplifies metabolic rate, HR, and temperature beyond chronic hyperthyroidism alone', () => {
    const chronic = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, thyroidFunctionIndex: 1.5 }, vitals: {}, time: 0 }, {});
    const storm = ThyroidEngine.tick(1, { patient: { hyperthyroidism: true, thyroidFunctionIndex: 1.5 }, vitals: {}, time: 0 }, { surgicalStressIndex: 90 });
    expect(storm.thyroidMetabolicMultiplier).toBeGreaterThan(chronic.thyroidMetabolicMultiplier);
    expect(storm.hrBaselineShift).toBeGreaterThan(chronic.hrBaselineShift);
    expect(storm.tempBaselineShift).toBeGreaterThan(chronic.tempBaselineShift);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => ThyroidEngine.tick(1, undefined as any, {})).not.toThrow();
    expect(() => ThyroidEngine.tick(NaN, { patient: {}, vitals: {}, time: 0 }, undefined as any)).not.toThrow();
    const out = ThyroidEngine.tick(1, { patient: { thyroidFunctionIndex: NaN }, vitals: {}, time: 0 }, { surgicalStressIndex: -50 });
    expect(Number.isFinite(out.thyroidFunctionIndex)).toBe(true);
    expect(Number.isFinite(out.thyroidMetabolicMultiplier)).toBe(true);
  });
});
