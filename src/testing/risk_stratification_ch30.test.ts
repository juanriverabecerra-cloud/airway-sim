import { describe, it, expect } from 'vitest';
import { calculateRcriFactors } from '../components/modals/PreOpEMR.jsx';

describe('Chapter 30: Risk of Anesthesia - Revised Cardiac Risk Index (RCRI)', () => {

  describe('1. RCRI 6-Criteria Fidelity (Lee et al., cited in Ch30, Miller\'s 9th Ed)', () => {
    it('should score zero factors for a healthy patient undergoing a low-risk elective procedure', () => {
      const patient = { trauma: false, isSeptic: false, cad: false, chf: false, cva: false, insulin: false, gfr: 90, creatinine: 0.9 };
      const { rcriHighRisk, rcriIhd, rcriChf, rcriCva, rcriInsulin, rcriCr, factorCount } = calculateRcriFactors(patient, 'general');

      expect(rcriHighRisk).toBe(false);
      expect(rcriIhd).toBe(false);
      expect(rcriChf).toBe(false);
      expect(rcriCva).toBe(false);
      expect(rcriInsulin).toBe(false);
      expect(rcriCr).toBe(false);
      expect(factorCount).toBe(0);
    });

    it('should flag high-risk surgery for intraperitoneal/intrathoracic/suprainguinal-vascular-type procedures', () => {
      expect(calculateRcriFactors({}, 'vascular').rcriHighRisk).toBe(true);
      expect(calculateRcriFactors({}, 'thoracic').rcriHighRisk).toBe(true);
      expect(calculateRcriFactors({ procedure: 'Exploratory Laparotomy' }, 'general').rcriHighRisk).toBe(true);
      expect(calculateRcriFactors({ trauma: true }, 'general').rcriHighRisk).toBe(true);
      expect(calculateRcriFactors({}, 'general').rcriHighRisk).toBe(false);
    });

    it('should flag history of ischemic heart disease (CAD/MI/angina)', () => {
      expect(calculateRcriFactors({ cad: true }, 'general').rcriIhd).toBe(true);
      expect(calculateRcriFactors({ pmhx: 'Prior MI, well-controlled HTN' }, 'general').rcriIhd).toBe(true);
      expect(calculateRcriFactors({ pmhx: 'Stable angina' }, 'general').rcriIhd).toBe(true);
      expect(calculateRcriFactors({ pmhx: 'none' }, 'general').rcriIhd).toBe(false);
    });

    it('should flag history of congestive heart failure (including reduced EF < 40%)', () => {
      expect(calculateRcriFactors({ chf: true }, 'general').rcriChf).toBe(true);
      expect(calculateRcriFactors({ ef: 30 }, 'general').rcriChf).toBe(true);
      expect(calculateRcriFactors({ ef: 60 }, 'general').rcriChf).toBe(false);
    });

    it('should flag history of cerebrovascular disease (stroke/TIA)', () => {
      expect(calculateRcriFactors({ cva: true }, 'general').rcriCva).toBe(true);
      expect(calculateRcriFactors({ pmhx: 'h/o TIA in 2019' }, 'general').rcriCva).toBe(true);
      expect(calculateRcriFactors({ pmhx: 'none' }, 'general').rcriCva).toBe(false);
    });

    it('should flag preoperative insulin treatment', () => {
      expect(calculateRcriFactors({ insulin: true }, 'general').rcriInsulin).toBe(true);
      expect(calculateRcriFactors({ pmhx: 'Insulin-dependent diabetes mellitus' }, 'general').rcriInsulin).toBe(true);
      expect(calculateRcriFactors({}, 'general').rcriInsulin).toBe(false);
    });

    it('should flag preoperative serum creatinine > 2.0 mg/dL', () => {
      expect(calculateRcriFactors({ creatinine: 2.5 }, 'general').rcriCr).toBe(true);
      expect(calculateRcriFactors({ gfr: 25 }, 'general').rcriCr).toBe(true);
      expect(calculateRcriFactors({ creatinine: 1.0, gfr: 90 }, 'general').rcriCr).toBe(false);
    });

    it('should accumulate a higher factorCount as more independent risk factors stack, consistent with RCRI\'s point-additive design', () => {
      const lowRisk = calculateRcriFactors({}, 'general');
      const highRisk = calculateRcriFactors({ cad: true, chf: true, cva: true, insulin: true, creatinine: 2.5 }, 'vascular');
      expect(lowRisk.factorCount).toBe(0);
      expect(highRisk.factorCount).toBe(6);
      expect(highRisk.factorCount).toBeGreaterThan(lowRisk.factorCount);
    });
  });

  describe('2. Defensive Input Handling', () => {
    it('should not throw and should default safely when patient/id are undefined or malformed', () => {
      expect(() => calculateRcriFactors(undefined, undefined)).not.toThrow();
      const result = calculateRcriFactors(undefined, undefined);
      expect(result.factorCount).toBe(0);
      expect(Number.isFinite(result.factorCount)).toBe(true);
    });
  });
});
