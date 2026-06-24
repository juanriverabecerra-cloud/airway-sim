import { describe, it, expect } from 'vitest';
import { calibrateComplianceCurve, elasticRecoilPressure, complianceAt, volumeAtRecoilPressure } from '../engine/LungComplianceModel.js';

const normalLv = { tlc_mL: 6000, rv_mL: 1500, frc_mL: 2400 };

describe('Lung Compliance Model (shared P-V curve)', () => {
  it('matches the input compliance exactly at FRC, by construction', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    expect(complianceAt(2400, curve)).toBeCloseTo(60, 5);
  });

  it('falls to 25% of peak compliance at both RV and TLC', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    expect(complianceAt(1500, curve)).toBeCloseTo(15, 3);
    expect(complianceAt(6000, curve)).toBeCloseTo(15, 3);
  });

  it('produces zero recoil pressure at RV and a monotonically increasing curve to TLC', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    expect(elasticRecoilPressure(1500, curve)).toBeCloseTo(0, 3);
    const volumes = [1500, 2000, 2400, 3000, 4000, 5000, 6000];
    const pressures = volumes.map((v) => elasticRecoilPressure(v, curve));
    for (let i = 1; i < pressures.length; i++) {
      expect(pressures[i]).toBeGreaterThan(pressures[i - 1]);
    }
  });

  it('round-trips volumeAtRecoilPressure against elasticRecoilPressure', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    for (const v of [1800, 2400, 3500, 5000]) {
      const p = elasticRecoilPressure(v, curve);
      expect(volumeAtRecoilPressure(p, curve)).toBeCloseTo(v, 0);
    }
  });

  it('gives COPD (higher compliance) lower recoil pressure than normal at a shared volume', () => {
    const normal = calibrateComplianceCurve(normalLv, 60);
    const copd = calibrateComplianceCurve({ tlc_mL: 6300, rv_mL: 2100, frc_mL: 3240 }, 70);
    expect(elasticRecoilPressure(4000, copd)).toBeLessThan(elasticRecoilPressure(4000, normal));
  });

  it('gives restrictive disease (lower compliance) higher recoil pressure than normal at a shared volume', () => {
    const normal = calibrateComplianceCurve(normalLv, 60);
    // Restrictive disease scales volumes down substantially; compare at a volume valid for both curves.
    const restrictive = calibrateComplianceCurve({ tlc_mL: 3120, rv_mL: 780, frc_mL: 1248 }, 30);
    expect(elasticRecoilPressure(2500, restrictive)).toBeGreaterThan(elasticRecoilPressure(2500, normal));
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => calibrateComplianceCurve(undefined, undefined)).not.toThrow();
    expect(() => calibrateComplianceCurve(null, null)).not.toThrow();
    expect(() => calibrateComplianceCurve({ tlc_mL: NaN, rv_mL: 'x' }, -5)).not.toThrow();
    const curve = calibrateComplianceCurve({ tlc_mL: NaN }, NaN);
    expect(Number.isFinite(elasticRecoilPressure(3000, curve))).toBe(true);
    expect(Number.isFinite(complianceAt(3000, curve))).toBe(true);
    expect(Number.isFinite(volumeAtRecoilPressure(10, curve))).toBe(true);
    expect(() => elasticRecoilPressure(3000, null)).not.toThrow();
    expect(() => complianceAt(3000, undefined)).not.toThrow();
  });
});
