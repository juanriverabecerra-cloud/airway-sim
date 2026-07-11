import { describe, it, expect } from 'vitest';
import { MalnutritionFrailtyModel } from '../engine/MalnutritionFrailtyModel';

describe('MalnutritionFrailtyModel — malnutrition, frailty, obesity PK', () => {
  it('falls back safely with no inputs', () => {
    expect(() => MalnutritionFrailtyModel.tick(undefined as any)).not.toThrow();
    const out = MalnutritionFrailtyModel.tick({});
    expect(out.malnutritionSeverity).toBe(0);
    expect(out.frailtyActive).toBe(false);
  });

  describe('Malnutrition', () => {
    it('normal albumin = no malnutrition', () => {
      const out = MalnutritionFrailtyModel.tick({ albumin: 4.2 });
      expect(out.malnutritionSeverity).toBe(0);
      expect(out.drugSensitivityMultiplier).toBe(1.0);
    });

    it('low albumin increases drug sensitivity (more free drug)', () => {
      const normal = MalnutritionFrailtyModel.tick({ albumin: 4.0 });
      const malnourished = MalnutritionFrailtyModel.tick({ albumin: 2.0 });
      expect(malnourished.drugSensitivityMultiplier).toBeGreaterThan(normal.drugSensitivityMultiplier);
      expect(malnourished.malnutritionSeverity).toBeGreaterThan(0.5);
    });

    it('malnutrition increases NMJ sensitivity', () => {
      const out = MalnutritionFrailtyModel.tick({ albumin: 2.5 });
      expect(out.nmjSensitivityIncrease).toBeGreaterThan(0);
    });
  });

  describe('Refeeding syndrome', () => {
    it('aggressive nutrition after starvation creates refeeding risk', () => {
      const out = MalnutritionFrailtyModel.tick({
        albumin: 2.8, starvationDays: 10, aggressiveNutritionStarted: true,
      });
      expect(out.refeedingSyndromeRisk).toBeGreaterThan(0);
    });

    it('fires refeeding event when phosphorus critically low', () => {
      const out = MalnutritionFrailtyModel.tick({
        albumin: 2.5, starvationDays: 8, aggressiveNutritionStarted: true,
        phosphorusLevel: 1.2, prevRefeedingLogged: false,
      });
      expect(out.events.some(e => e.includes('REFEEDING SYNDROME'))).toBe(true);
    });

    it('no refeeding risk without aggressive nutrition restart', () => {
      const out = MalnutritionFrailtyModel.tick({
        albumin: 2.5, starvationDays: 10, aggressiveNutritionStarted: false,
      });
      expect(out.refeedingSyndromeRisk).toBe(0);
    });
  });

  describe('Frailty', () => {
    it('frail patient needs less MAC', () => {
      const robust = MalnutritionFrailtyModel.tick({ hasFrailty: false, frailtyScore: 1 });
      const frail = MalnutritionFrailtyModel.tick({ hasFrailty: true, frailtyScore: 5 });
      expect(frail.frailtyMacReduction).toBeGreaterThan(robust.frailtyMacReduction);
    });

    it('frailty score ≥ 3 activates frailty syndrome', () => {
      const prefrail = MalnutritionFrailtyModel.tick({ frailtyScore: 2 });
      const frail = MalnutritionFrailtyModel.tick({ frailtyScore: 3 });
      expect(prefrail.frailtyActive).toBe(false);
      expect(frail.frailtyActive).toBe(true);
    });

    it('severe frailty has high ventilator dependence risk in elderly', () => {
      const out = MalnutritionFrailtyModel.tick({ hasFrailty: true, frailtyScore: 7, ageYears: 82 });
      expect(out.frailtyVentilatorDependenceRisk).toBeGreaterThan(0.3);
    });

    it('frailty contributes to delirium risk', () => {
      const out = MalnutritionFrailtyModel.tick({ hasFrailty: true, frailtyScore: 5 });
      expect(out.frailtyDeliriumRiskContrib).toBeGreaterThan(0);
    });
  });

  describe('Obesity pharmacokinetics', () => {
    it('morbid obesity increases succinylcholine dose factor (use TBW)', () => {
      const normal = MalnutritionFrailtyModel.tick({ isMorbidlyObese: false, weightKg: 70, ibwKg: 70 });
      const obese = MalnutritionFrailtyModel.tick({ isMorbidlyObese: true, weightKg: 140, ibwKg: 70 });
      expect(obese.succinylcholineDoseFactor).toBeGreaterThan(normal.succinylcholineDoseFactor);
    });

    it('propofol dose factor slightly reduced in morbid obesity (LBW-based)', () => {
      const out = MalnutritionFrailtyModel.tick({ isMorbidlyObese: true, weightKg: 150, ibwKg: 70, bmi: 50 });
      expect(out.propofolDoseFactor).toBeLessThan(1.0);
    });
  });
});
