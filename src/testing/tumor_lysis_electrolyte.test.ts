import { describe, it, expect } from 'vitest';
import { TumorLysisElectrolyteModel } from '../engine/TumorLysisElectrolyteModel';

describe('TumorLysisElectrolyteModel — TLS, hypocalcemia, hypomagnesemia, hyponatremia', () => {
  it('falls back safely with no inputs', () => {
    expect(() => TumorLysisElectrolyteModel.tick(undefined as any)).not.toThrow();
  });

  describe('Tumor Lysis Syndrome', () => {
    it('no TLS effects without active TLS', () => {
      const out = TumorLysisElectrolyteModel.tick({ tlsActive: false });
      expect(out.hyperuricemiaActive).toBe(false);
    });

    it('TLS causes uric acid elevation', () => {
      const out = TumorLysisElectrolyteModel.tick({ tlsActive: true, tlsMinutesSince: 720, tlsRiskLevel: 'high' });
      expect(out.uricAcidMgDl).toBeGreaterThan(7.0);
      expect(out.hyperuricemiaActive).toBe(true);
    });

    it('rasburicase rapidly reduces uric acid in TLS', () => {
      const noTx = TumorLysisElectrolyteModel.tick({ tlsActive: true, tlsMinutesSince: 360, rasburicaseCe: 0 });
      const withRas = TumorLysisElectrolyteModel.tick({ tlsActive: true, tlsMinutesSince: 360, rasburicaseCe: 2.0 });
      expect(withRas.uricAcidMgDl).toBeLessThan(noTx.uricAcidMgDl);
    });

    it('high-risk TLS causes worse uric acid elevation than low-risk', () => {
      const lowRisk = TumorLysisElectrolyteModel.tick({ tlsActive: true, tlsMinutesSince: 480, tlsRiskLevel: 'low' });
      const highRisk = TumorLysisElectrolyteModel.tick({ tlsActive: true, tlsMinutesSince: 480, tlsRiskLevel: 'high' });
      expect(highRisk.uricAcidMgDl).toBeGreaterThan(lowRisk.uricAcidMgDl);
    });
  });

  describe('Hypocalcemia', () => {
    it('normal Ca produces no effects', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentCa: 9.5 });
      expect(out.hypocalcemiaActive).toBe(false);
      expect(out.hypocalcemiaNeuromuscularIndex).toBe(0);
    });

    it('severe hypocalcemia causes QTc prolongation and neuromuscular effects', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentCa: 6.5 });
      expect(out.hypocalcemiaActive).toBe(true);
      expect(out.hypocalcemiaQTcContribution).toBeGreaterThan(20);
      expect(out.hypocalcemiaNeuromuscularIndex).toBeGreaterThan(0.3);
    });

    it('severe hypocalcemia reduces cardiac contractility', () => {
      const mild = TumorLysisElectrolyteModel.tick({ currentCa: 8.0 });
      const severe = TumorLysisElectrolyteModel.tick({ currentCa: 5.5 });
      expect(severe.hypocalcemiaContractilityPenalty).toBeGreaterThan(mild.hypocalcemiaContractilityPenalty);
    });

    it('calcium gluconate reverses hypocalcemia effects', () => {
      const noTx = TumorLysisElectrolyteModel.tick({ currentCa: 6.5, calciumGluconateCe: 0 });
      const withCa = TumorLysisElectrolyteModel.tick({ currentCa: 6.5, calciumGluconateCe: 3.0 });
      expect(withCa.calciumTreatmentEfficacy).toBeGreaterThan(0.5);
    });
  });

  describe('Hypomagnesemia', () => {
    it('normal Mg produces no effects', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentMg: 2.0 });
      expect(out.hypomagnesemiaActive).toBe(false);
    });

    it('severe hypomagnesemia causes refractory hypokalemia', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentMg: 0.8 });
      expect(out.hypomagnesemiaActive).toBe(true);
      expect(out.hypomagnesemiaK_Resistance).toBeGreaterThan(0.3);
    });

    it('hypomagnesemia causes QTc prolongation', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentMg: 0.8 });
      expect(out.hypomagnesemiaQTcContribution).toBeGreaterThan(15);
    });
  });

  describe('Hyponatremia', () => {
    it('normal Na produces no effects', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentNa: 138 });
      expect(out.hyponatremiaActive).toBe(false);
    });

    it('severe hyponatremia creates encephalopathy risk', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentNa: 118 });
      expect(out.hyponatremiaActive).toBe(true);
      expect(out.hyponatremiaEncephalopathyRisk).toBeGreaterThan(0);
    });

    it('rapid Na correction exceeding 12 mEq/24h is flagged as unsafe', () => {
      // Na rose from 115 to 130 in the tick (extremely fast)
      const out = TumorLysisElectrolyteModel.tick({ currentNa: 130, prevNa: 115 });
      expect(out.hyponatremiaSafeCorrection).toBe(false);
    });

    it('slow Na correction within 12 mEq/24h is safe', () => {
      const out = TumorLysisElectrolyteModel.tick({ currentNa: 130, prevNa: 129 });
      expect(out.hyponatremiaSafeCorrection).toBe(true);
    });
  });
});
