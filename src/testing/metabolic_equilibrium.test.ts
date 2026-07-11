import { describe, it, expect } from 'vitest';
import { MetabolicEquilibriumModel } from '../engine/MetabolicEquilibriumModel';

describe('MetabolicEquilibriumModel — adrenal crisis, DKA, HE, DI', () => {
  it('falls back safely with no inputs', () => {
    expect(() => MetabolicEquilibriumModel.tick(undefined as any)).not.toThrow();
    const out = MetabolicEquilibriumModel.tick({});
    expect(out.stressDoseRequired).toBe(false);
    expect(out.dkaActive).toBe(false);
  });

  describe('Adrenal crisis and stress-dose steroids', () => {
    it('chronic steroid user ≥ 5 mg/day requires stress-dose', () => {
      const out = MetabolicEquilibriumModel.tick({ chronicSteroidUser: true, prednisoneEquivalentMgPerDay: 10 });
      expect(out.stressDoseRequired).toBe(true);
    });

    it('major surgery requires 100 mg hydrocortisone at induction', () => {
      const out = MetabolicEquilibriumModel.tick({
        chronicSteroidUser: true, prednisoneEquivalentMgPerDay: 15, surgicalStressLevel: 'major',
      });
      expect(out.stressDoseRegimen).toContain('100 mg');
    });

    it('adrenal crisis fires event with treatment protocol', () => {
      const out = MetabolicEquilibriumModel.tick({ isAdrenalCrisis: true, prevAdrenalCrisisLogged: false });
      expect(out.adrenalCrisisActive).toBe(true);
      expect(out.events.some(e => e.includes('ADRENAL CRISIS'))).toBe(true);
    });

    it('hydrocortisone treatment is efficacious in adrenal crisis', () => {
      const out = MetabolicEquilibriumModel.tick({ isAdrenalCrisis: true, hydroCortisoneCe: 2.0 });
      expect(out.adrenalHydrocortisoneEfficacy).toBeGreaterThan(0.5);
    });
  });

  describe('DKA management', () => {
    it('DKA active with high AG and low bicarbonate', () => {
      const out = MetabolicEquilibriumModel.tick({ isDKA: true, currentAnionGap: 22, currentBicarbonate: 12 });
      expect(out.dkaActive).toBe(true);
      expect(out.dkaSeverity).toBeGreaterThan(0.3);
    });

    it('insulin is NOT safe when K+ < 3.5 (critical safety check)', () => {
      const out = MetabolicEquilibriumModel.tick({ isDKA: true, currentKPlusDKA: 3.2 });
      expect(out.dka_insulinSafe).toBe(false);
    });

    it('insulin safe when K+ ≥ 3.5', () => {
      const out = MetabolicEquilibriumModel.tick({ isDKA: true, currentKPlusDKA: 4.0 });
      expect(out.dka_insulinSafe).toBe(true);
    });

    it('dextrose needed when glucose < 200 during insulin infusion', () => {
      const out = MetabolicEquilibriumModel.tick({ isDKA: true, currentGlucoseMgDl: 185, insulinInfusionActive: true });
      expect(out.dka_glucoseAdditionNeeded).toBe(true);
    });

    it('anion gap closed when DKA resolved', () => {
      const out = MetabolicEquilibriumModel.tick({ isDKA: true, currentAnionGap: 12 });
      expect(out.dka_agClosed).toBe(true);
    });
  });

  describe('Hepatic encephalopathy', () => {
    it('grade III-IV HE causes ICP elevation (cerebral edema)', () => {
      const mild = MetabolicEquilibriumModel.tick({ hasHE: true, heGrade: 2, ammoniaMcgDl: 80 });
      const severe = MetabolicEquilibriumModel.tick({ hasHE: true, heGrade: 4, ammoniaMcgDl: 200 });
      expect(severe.heIcpContribution).toBeGreaterThan(mild.heIcpContribution);
    });

    it('lactulose + rifaximin reduces ammonia level', () => {
      const noTx = MetabolicEquilibriumModel.tick({ hasHE: true, lactuloseCe: 0, rifaximinActive: false });
      const withTx = MetabolicEquilibriumModel.tick({ hasHE: true, lactuloseCe: 2.0, rifaximinActive: true });
      expect(withTx.lactuloseLowersNH3).toBeGreaterThan(noTx.lactuloseLowersNH3);
    });
  });

  describe('Diabetes Insipidus', () => {
    it('central DI responds to desmopressin', () => {
      const out = MetabolicEquilibriumModel.tick({ hasDI: true, diType: 'central', desmopressinCe: 2.0 });
      expect(out.desmopressinEfficacy).toBeGreaterThan(0.5);
    });

    it('nephrogenic DI does NOT respond to desmopressin', () => {
      const out = MetabolicEquilibriumModel.tick({ hasDI: true, diType: 'nephrogenic', desmopressinCe: 2.0 });
      expect(out.desmopressinEfficacy).toBe(0);
    });

    it('high urine output triggers fluid replacement recommendation', () => {
      const out = MetabolicEquilibriumModel.tick({ hasDI: true, urineOutputMlHrKg: 5.0, weightKg: 70 });
      expect(out.diFluidReplacement_mLHr).toBeGreaterThan(0);
    });
  });
});
