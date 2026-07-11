import { describe, it, expect } from 'vitest';
import { PerioperativeGlucoseModel } from '../engine/PerioperativeGlucoseModel';

describe('PerioperativeGlucoseModel — hyperglycemia, hypoglycemia, DM drugs', () => {
  it('falls back safely with no inputs', () => {
    expect(() => PerioperativeGlucoseModel.tick(undefined as any)).not.toThrow();
    const out = PerioperativeGlucoseModel.tick({});
    expect(out.isHyperglycemic).toBe(false);
    expect(out.isHypoglycemic).toBe(false);
  });

  describe('Glycemic targets', () => {
    it('glucose 150 is within ICU target range (140-180)', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 150, isInICU: true });
      expect(out.inTargetRange).toBe(true);
    });

    it('glucose 220 is hyperglycemic', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 220 });
      expect(out.isHyperglycemic).toBe(true);
    });

    it('glucose 48 is hypoglycemic and critically low (< 54 mg/dL threshold)', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 48 });
      expect(out.isHypoglycemic).toBe(true);
      expect(out.isCriticallyLow).toBe(true);
    });
  });

  describe('Glucose trend', () => {
    it('detects rising glucose trend', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 200, previousGlucose: 170 });
      expect(out.glucoseTrend).toBe('rising');
    });

    it('detects falling glucose trend', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 100, previousGlucose: 160 });
      expect(out.glucoseTrend).toBe('falling');
    });
  });

  describe('SGLT-2 inhibitor DKA risk', () => {
    it('SGLT-2 inhibitor flags euglycemic DKA risk', () => {
      const out = PerioperativeGlucoseModel.tick({ sglt2Active: true, currentGlucoseMgDl: 140 });
      expect(out.sglt2DKARisk).toBe(true);
    });

    it('fires SGLT-2 warning event', () => {
      const out = PerioperativeGlucoseModel.tick({ sglt2Active: true, prevSGLT2Logged: false });
      expect(out.events.some(e => e.includes('SGLT-2'))).toBe(true);
    });
  });

  describe('GLP-1 aspiration risk', () => {
    it('GLP-1 agonist flags aspiration risk (delayed gastric emptying)', () => {
      const out = PerioperativeGlucoseModel.tick({ glp1Active: true });
      expect(out.glp1AspirationRisk).toBe(true);
    });
  });

  describe('Hypoglycemia event', () => {
    it('fires hypoglycemia event at glucose < 70', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 62, prevHypologged: false });
      expect(out.events.some(e => e.includes('HYPOGLYCEMIA'))).toBe(true);
    });
  });

  describe('Hyperglycemia management', () => {
    it('calculates insulin infusion rate for hyperglycemia', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 280, isInICU: true });
      expect(out.insulinInfusionRate).toBeGreaterThan(0);
    });

    it('fires hyperglycemia event above 250 mg/dL', () => {
      const out = PerioperativeGlucoseModel.tick({ currentGlucoseMgDl: 280, prevHyperlogged: false });
      expect(out.events.some(e => e.includes('HYPERGLYCEMIA'))).toBe(true);
    });
  });
});
