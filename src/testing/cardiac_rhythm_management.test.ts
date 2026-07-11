import { describe, it, expect } from 'vitest';
import { CardiacRhythmManagementModel } from '../engine/CardiacRhythmManagementModel';

describe('CardiacRhythmManagementModel — CHB, ICD/pacemaker, LQTS, Brugada', () => {
  it('falls back safely with no inputs', () => {
    expect(() => CardiacRhythmManagementModel.tick(undefined as any)).not.toThrow();
    const out = CardiacRhythmManagementModel.tick({});
    expect(out.chbActive).toBe(false);
  });

  describe('Complete heart block', () => {
    it('CHB without pacing shows low junctional rate', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'chb', junctionalEscapeRateBpm: 30, prevCHBLogged: false,
      });
      expect(out.chbActive).toBe(true);
      expect(out.effectiveHRFromPacing).toBe(30);
      expect(out.events.some(e => e.includes('COMPLETE HEART BLOCK'))).toBe(true);
    });

    it('TCP provides pacing at set rate', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'chb', transcutaneousPacingActive: true, pacingRateBpm: 70,
        mechanicalCaptureVerified: true,
      });
      expect(out.effectiveHRFromPacing).toBe(70);
      expect(out.isPacingMechanicallyCaptured).toBe(true);
    });

    it('isoproterenol increases junctional rate in CHB', () => {
      const noIso = CardiacRhythmManagementModel.tick({ rhythmDisorder: 'chb', isoproterenolCe: 0 });
      const withIso = CardiacRhythmManagementModel.tick({ rhythmDisorder: 'chb', isoproterenolCe: 2.0 });
      expect(withIso.isoproterenolChronoEffect).toBeGreaterThan(noIso.isoproterenolChronoEffect);
    });
  });

  describe('ICD and pacemaker in OR', () => {
    it('ICD without magnet + monopolar cautery = inappropriate shock risk', () => {
      const out = CardiacRhythmManagementModel.tick({
        hasImplantedICD: true, monopolarCautery: true, icdMagnetApplied: false,
      });
      expect(out.icdWillShockFromEMI).toBe(true);
      expect(out.emdInterferenceRisk).toBeGreaterThan(0);
    });

    it('ICD with magnet applied = shock suspended (safe for cautery)', () => {
      const out = CardiacRhythmManagementModel.tick({
        hasImplantedICD: true, monopolarCautery: true, icdMagnetApplied: true,
      });
      expect(out.icdWillShockFromEMI).toBe(false);
    });

    it('fires ICD interference warning when risk is high', () => {
      const out = CardiacRhythmManagementModel.tick({
        hasImplantedICD: true, monopolarCautery: true, icdMagnetApplied: false,
        prevICDInterferenceLogged: false,
      });
      expect(out.events.some(e => e.includes('ICD + MONOPOLAR'))).toBe(true);
    });
  });

  describe('Long QT Syndrome', () => {
    it('beta-blockers protect LQT1 and LQT2', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'lqts', lqtsType: 1, betaBlockerCe: 1.5,
      });
      expect(out.lqtsBetaBlockerBenefit).toBe(true);
    });

    it('QTc > 500 ms triggers LQTS event', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'lqts', lqtsType: 2, currentQTcMs: 520,
        prevLQTSLogged: false,
      });
      // QTc > 500 is itself a trigger indicator in the model
      // (in addition to adrenergic triggers)
      expect(out.events.some(e => e.includes('LONG QT'))).toBe(true);
    });
  });

  describe('Brugada syndrome', () => {
    it('fever unmasks Brugada pattern', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'brugada', currentTempBrugada: 39.2, prevBrugadaLogged: false,
      });
      expect(out.brugadaUnmasked).toBe(true);
      expect(out.events.some(e => e.includes('BRUGADA'))).toBe(true);
    });

    it('propofol may unmask Brugada at high concentrations', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'brugada', propofol_brugadaCe: 2.5, currentTempBrugada: 37.0,
        prevBrugadaLogged: false,
      });
      expect(out.brugadaUnmasked).toBe(true);
    });

    it('normal temperature without propofol = Brugada not unmasked', () => {
      const out = CardiacRhythmManagementModel.tick({
        rhythmDisorder: 'brugada', currentTempBrugada: 37.0, propofol_brugadaCe: 0,
      });
      expect(out.brugadaUnmasked).toBe(false);
    });
  });
});
