import { describe, it, expect } from 'vitest';
import { CardiacArrhythmiaManagementModel } from '../engine/CardiacArrhythmiaManagementModel';

describe('CardiacArrhythmiaManagementModel — SVT, WPW, VT management', () => {
  it('falls back safely with no inputs', () => {
    expect(() => CardiacArrhythmiaManagementModel.tick(undefined as any)).not.toThrow();
    const out = CardiacArrhythmiaManagementModel.tick({});
    expect(out.wpwDrugDangerActive).toBe(false);
  });

  describe('SVT and adenosine', () => {
    it('adenosine 6 mg is dose-sufficient for SVT', () => {
      const out = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'svt', currentHR: 185, adenosineCe: 7.0 });
      expect(out.adenosineDoseSufficient).toBe(true);
      expect(out.adenosineEfficacy).toBeGreaterThan(0.5);
    });

    it('dipyridamole potentiates adenosine (effectively doubles it)', () => {
      const noDP = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'svt', adenosineCe: 5.0, dipyridamoleCe: 0 });
      const withDP = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'svt', adenosineCe: 5.0, dipyridamoleCe: 1.0 });
      expect(withDP.adenosineEfficacy).toBeGreaterThan(noDP.adenosineEfficacy);
    });

    it('caffeine/theophylline antagonizes adenosine', () => {
      const noCaff = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'svt', adenosineCe: 8.0, caffeinePresent: false });
      const withCaff = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'svt', adenosineCe: 8.0, caffeinePresent: true });
      expect(withCaff.adenosineEfficacy).toBeLessThan(noCaff.adenosineEfficacy);
    });

    it('SVT at HR 185 with no treatment identified as active', () => {
      const out = CardiacArrhythmiaManagementModel.tick({ currentHR: 185, cardiacRhythm: 'svt' });
      expect(out.svtActive).toBe(true);
    });
  });

  describe('WPW — life-threatening drug interactions', () => {
    it('adenosine in WPW + AF triggers dangerous drug warning', () => {
      const out = CardiacArrhythmiaManagementModel.tick({
        hasWPW: true, wpwHasAF: true, adenosineCe: 3.0, prevWPWLogged: false,
      });
      expect(out.wpwDrugDangerActive).toBe(true);
      expect(out.wpwDangerousDrug).toContain('Adenosine');
      expect(out.events.some(e => e.includes('WPW + AF'))).toBe(true);
    });

    it('verapamil in WPW + AF is life-threatening', () => {
      const out = CardiacArrhythmiaManagementModel.tick({
        hasWPW: true, wpwHasAF: true, verapamilCe: 2.0,
      });
      expect(out.wpwDrugDangerActive).toBe(true);
      expect(out.wpwDangerousDrug).toContain('Verapamil');
    });

    it('adenosine in WPW WITHOUT AF is safe (different mechanism)', () => {
      const out = CardiacArrhythmiaManagementModel.tick({
        hasWPW: true, wpwHasAF: false, adenosineCe: 3.0,
      });
      // Regular SVT (orthodromic AVRT) in WPW — adenosine safe because no antegrade accessory pathway conduction
      expect(out.wpwDrugDangerActive).toBe(false);
    });

    it('amiodarone is a safe alternative for WPW + AF', () => {
      const out = CardiacArrhythmiaManagementModel.tick({
        hasWPW: true, wpwHasAF: true, amiodaroneCe: 3.0,
      });
      expect(out.recommendedWPWDrug).toContain('Amiodarone');
    });
  });

  describe('VT management', () => {
    it('amiodarone is primary treatment for VT', () => {
      const out = CardiacArrhythmiaManagementModel.tick({
        cardiacRhythm: 'vt', currentHR: 165, amiodaroneCe: 2.0,
      });
      expect(out.vtConversionEfficacy).toBeGreaterThan(0.3);
    });

    it('combination amiodarone + lidocaine improves efficacy', () => {
      const amioOnly = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'vt', amiodaroneCe: 2.0, lidocaineCe: 0 });
      const combined = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'vt', amiodaroneCe: 2.0, lidocaineCe: 2.0 });
      expect(combined.vtConversionEfficacy).toBeGreaterThan(amioOnly.vtConversionEfficacy);
    });

    it('cardioversion provides high VT conversion efficacy', () => {
      const out = CardiacArrhythmiaManagementModel.tick({
        cardiacRhythm: 'vt', synchronizedCardioversionDone: true,
      });
      expect(out.vtConversionEfficacy).toBeGreaterThan(0.7);
    });
  });

  describe('AF rate control', () => {
    it('metoprolol provides AF rate control', () => {
      const out = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'afib', metoproloLCeForAF: 3.0 });
      expect(out.afRateControlEfficacy).toBeGreaterThan(0.2);
    });

    it('combination metoprolol + diltiazem better than either alone', () => {
      const metOnly = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'afib', metoproloLCeForAF: 2.0, diltiazem_afCe: 0 });
      const combined = CardiacArrhythmiaManagementModel.tick({ cardiacRhythm: 'afib', metoproloLCeForAF: 2.0, diltiazem_afCe: 2.0 });
      expect(combined.afRateControlEfficacy).toBeGreaterThan(metOnly.afRateControlEfficacy);
    });
  });
});
