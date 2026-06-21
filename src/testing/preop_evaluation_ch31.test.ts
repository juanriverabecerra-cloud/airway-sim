import { describe, it, expect } from 'vitest';
import {
  classifyBmi,
  calculateDasiMets,
  DASI_ITEMS,
  assessAirwayExamBox311,
  calculateCha2ds2VascScore,
  calculateAnticoagulationPlan
} from '../components/modals/PreOpEMR.jsx';

describe('Ch31: Preoperative Evaluation', () => {

  describe('classifyBmi (Table 31.3, CDC scheme)', () => {
    it('should classify each BMI band correctly', () => {
      expect(classifyBmi(17)).toBe('Underweight');
      expect(classifyBmi(22)).toBe('Normal Weight');
      expect(classifyBmi(27)).toBe('Overweight');
      expect(classifyBmi(32)).toBe('Obese Class I');
      expect(classifyBmi(37)).toBe('Obese Class II');
      expect(classifyBmi(45)).toBe('Obese Class III');
    });

    it('should fall back to a safe default for malformed input', () => {
      expect(() => classifyBmi(NaN)).not.toThrow();
      expect(classifyBmi(undefined)).toBe('Normal Weight');
    });
  });

  describe('calculateDasiMets (Table 31.2, Hlatky et al. 1989)', () => {
    it('should return baseline METs (~2.7) for a fully dependent patient (no items checked)', () => {
      const result = calculateDasiMets({});
      expect(result.dasiScore).toBe(0);
      expect(result.estimatedMets).toBeCloseTo(2.7, 1);
      expect(result.capacityLevel).toBe('poor');
    });

    it('should reach the maximum DASI score (58.2) when every item is checked', () => {
      const allChecked = DASI_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: true }), {});
      const result = calculateDasiMets(allChecked);
      expect(result.dasiScore).toBeCloseTo(58.2, 1);
      expect(result.capacityLevel).toBe('adequate');
    });

    it('should classify >= 4 METs as adequate per the AHA/ACC threshold (Ch31, p.16)', () => {
      // Walking a block + climbing stairs + light/moderate housework should clear 4 METs
      const moderateActivity = { walkIndoors: true, walkBlock: true, climbStairs: true, lightHousework: true, moderateHousework: true };
      const result = calculateDasiMets(moderateActivity);
      expect(result.estimatedMets).toBeGreaterThanOrEqual(4);
      expect(result.capacityLevel).toBe('adequate');
    });

    it('should not throw on missing/malformed input', () => {
      expect(() => calculateDasiMets(undefined)).not.toThrow();
      expect(() => calculateDasiMets(null)).not.toThrow();
      const result = calculateDasiMets(null);
      expect(Number.isFinite(result.estimatedMets)).toBe(true);
    });
  });

  describe('assessAirwayExamBox311 (Box 31.1)', () => {
    it('should flag a normal airway as non-concerning across all components', () => {
      const result = assessAirwayExamBox311({ mallampati: 1, neckMobility: 'normal' });
      expect(result.interincisorConcerning).toBe(false);
      expect(result.thyromentalConcerning).toBe(false);
      expect(result.mallampatiConcerning).toBe(false);
      expect(result.neckExtensionConcerning).toBe(false);
    });

    it('should flag Mallampati class >= 3 as concerning and reduce estimated thyromental distance below 6cm', () => {
      const result = assessAirwayExamBox311({ mallampati: 3, neckMobility: 'normal' });
      expect(result.mallampatiConcerning).toBe(true);
      expect(result.thyromentalConcerning).toBe(true);
      expect(result.thyromentalDistanceCm).toBeLessThan(6);
    });

    it('should flag reduced neck mobility or trauma as concerning for interincisor distance', () => {
      const result = assessAirwayExamBox311({ mallampati: 1, neckMobility: 'reduced' });
      expect(result.neckExtensionConcerning).toBe(true);
      expect(result.interincisorConcerning).toBe(true);
      expect(result.interincisorDistanceCm).toBeLessThan(3);
    });

    it('should not throw on missing patient', () => {
      expect(() => assessAirwayExamBox311(undefined)).not.toThrow();
    });
  });

  describe('calculateCha2ds2VascScore', () => {
    it('should compute zero for a young healthy male', () => {
      expect(calculateCha2ds2VascScore({ age: 40, sex: 'male' })).toBe(0);
    });

    it('should accumulate points for CHF, HTN, age >= 75, diabetes, prior CVA, CAD, and female sex', () => {
      const score = calculateCha2ds2VascScore({ age: 78, sex: 'female', chf: true, htn: true, diabetes: true, cva: true, cad: true });
      // CHF(1) + HTN(1) + Age>=75(2) + Diabetes(1) + CVA(2) + CAD-as-vascular(1) + Female(1) = 9
      expect(score).toBe(9);
    });

    it('should award only 1 point for age 65-74, not 2', () => {
      expect(calculateCha2ds2VascScore({ age: 70, sex: 'male' })).toBe(1);
    });
  });

  describe('calculateAnticoagulationPlan (Ch31: Atrial Fibrillation / Antiplatelet Therapy)', () => {
    it('should recommend continuing aspirin for a documented CAD patient', () => {
      const plan = calculateAnticoagulationPlan({ cad: true });
      const aspirin = plan.find(p => p.drug === 'Aspirin');
      expect(aspirin).toBeDefined();
      expect(aspirin.action).toMatch(/Continue/);
    });

    it('should recommend a shorter DOAC hold for preserved renal function and a longer hold for impaired eGFR', () => {
      const preserved = calculateAnticoagulationPlan({ afib: true, gfr: 90 });
      const impaired = calculateAnticoagulationPlan({ afib: true, gfr: 20 });
      const doacPreserved = preserved.find(p => p.drug.includes('DOAC'));
      const doacImpaired = impaired.find(p => p.drug.includes('DOAC'));
      expect(doacPreserved.action).toContain('48');
      expect(doacImpaired.action).toContain('96');
    });

    it('should flag insufficient data for severe renal failure (eGFR < 15)', () => {
      const plan = calculateAnticoagulationPlan({ afib: true, gfr: 10 });
      const doac = plan.find(p => p.drug.includes('DOAC'));
      expect(doac.action).toMatch(/Insufficient renal-clearance data/);
    });

    it('should recommend omitting bridging for a low CHA2DS2-VASc score', () => {
      const plan = calculateAnticoagulationPlan({ afib: true, age: 50, sex: 'male', gfr: 90 });
      const doac = plan.find(p => p.drug.includes('DOAC'));
      expect(doac.rationale).toMatch(/Omit bridging/);
    });

    it('should add ASRA neuraxial-specific timing guidance only when neuraxial is planned', () => {
      const withoutNeuraxial = calculateAnticoagulationPlan({ afib: true }, { plannedNeuraxial: false });
      const withNeuraxial = calculateAnticoagulationPlan({ afib: true }, { plannedNeuraxial: true });
      expect(withoutNeuraxial.find(p => p.drug.includes('Neuraxial'))).toBeUndefined();
      expect(withNeuraxial.find(p => p.drug.includes('Neuraxial'))).toBeDefined();
    });

    it('should return an empty plan for a patient with no CAD or AFib', () => {
      expect(calculateAnticoagulationPlan({})).toEqual([]);
    });

    it('should not throw on missing patient/options', () => {
      expect(() => calculateAnticoagulationPlan(undefined, undefined)).not.toThrow();
    });
  });
});
