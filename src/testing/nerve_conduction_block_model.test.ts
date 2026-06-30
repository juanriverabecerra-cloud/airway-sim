import { describe, it, expect } from 'vitest';
import { calculateFiberBlockFractions, calculateDifferentialDermatomalBlock } from '../engine/NerveConductionBlockModel';

describe('NerveConductionBlockModel — fiber-selective differential local anesthetic block', () => {
  it('orders fiber susceptibility correctly at every concentration: sympathetic >= pain/temp >= touch/pressure >= motor', () => {
    for (const c of [0.1, 0.2, 0.3, 0.5, 0.7, 1.0, 1.5]) {
      const f = calculateFiberBlockFractions(c);
      expect(f.sympathetic).toBeGreaterThanOrEqual(f.painTemperature);
      expect(f.painTemperature).toBeGreaterThanOrEqual(f.touchPressure);
      expect(f.touchPressure).toBeGreaterThanOrEqual(f.motor);
    }
  });

  it('low ("labor epidural" strength) concentration produces strong sympathetic/pain block with minimal motor block -- the classic differential/motor-sparing picture', () => {
    const f = calculateFiberBlockFractions(0.25);
    expect(f.sympathetic).toBeGreaterThan(0.85);
    expect(f.painTemperature).toBeGreaterThan(0.55);
    expect(f.motor).toBeLessThan(0.2);
  });

  it('full ("surgical") concentration produces dense block of all fiber types including motor', () => {
    const f = calculateFiberBlockFractions(1.0);
    expect(f.sympathetic).toBeGreaterThan(0.95);
    expect(f.painTemperature).toBeGreaterThan(0.95);
    expect(f.touchPressure).toBeGreaterThan(0.9);
    expect(f.motor).toBeGreaterThan(0.85);
  });

  it('zero concentration produces zero block for every fiber type', () => {
    const f = calculateFiberBlockFractions(0);
    expect(f.sympathetic).toBe(0);
    expect(f.painTemperature).toBe(0);
    expect(f.touchPressure).toBe(0);
    expect(f.motor).toBe(0);
  });

  it('block fraction rises monotonically with concentration for every fiber type', () => {
    let prev = calculateFiberBlockFractions(0);
    for (const c of [0.1, 0.3, 0.5, 0.8, 1.2]) {
      const f = calculateFiberBlockFractions(c);
      expect(f.sympathetic).toBeGreaterThanOrEqual(prev.sympathetic);
      expect(f.motor).toBeGreaterThanOrEqual(prev.motor);
      prev = f;
    }
  });

  it('calculateDifferentialDermatomalBlock multiplies spatial coverage by the fiber-specific dose-response, defaulting to surgical-strength concentration', () => {
    const fullCoverage = calculateDifferentialDermatomalBlock(1.0, 'sympathetic');
    const halfCoverage = calculateDifferentialDermatomalBlock(0.5, 'sympathetic');
    expect(fullCoverage).toBeGreaterThan(0.95); // near-identical to the old flat-coverage assumption
    expect(halfCoverage).toBeCloseTo(fullCoverage * 0.5, 2);
  });

  it('a labor-epidural-strength block spares motor function even with full spatial (dermatomal) coverage', () => {
    const motorBlock = calculateDifferentialDermatomalBlock(1.0, 'motor', 0.25);
    const sympatheticBlock = calculateDifferentialDermatomalBlock(1.0, 'sympathetic', 0.25);
    expect(sympatheticBlock).toBeGreaterThan(0.8);
    expect(motorBlock).toBeLessThan(0.2);
  });

  it('zero spatial coverage gives zero block regardless of concentration', () => {
    expect(calculateDifferentialDermatomalBlock(0, 'sympathetic', 1.0)).toBe(0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => calculateFiberBlockFractions(NaN)).not.toThrow();
    expect(() => calculateFiberBlockFractions(-5)).not.toThrow();
    expect(() => calculateDifferentialDermatomalBlock(NaN, 'motor', NaN)).not.toThrow();
    const f = calculateFiberBlockFractions(NaN);
    expect(Number.isFinite(f.sympathetic)).toBe(true);
    expect(Number.isFinite(f.motor)).toBe(true);
  });
});
