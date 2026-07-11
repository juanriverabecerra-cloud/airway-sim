import { describe, it, expect } from 'vitest';
import { AcuteKidneyInjuryModel } from '../engine/AcuteKidneyInjuryModel';

describe('AcuteKidneyInjuryModel — KDIGO staging, AKI prevention, HRS', () => {
  it('falls back safely with no inputs', () => {
    expect(() => AcuteKidneyInjuryModel.tick(undefined as any)).not.toThrow();
    const out = AcuteKidneyInjuryModel.tick({});
    expect(out.kdigo_stage).toBe(0);
    expect(out.akiCriterionMet).toBe(false);
  });

  describe('KDIGO staging', () => {
    it('Stage 0 when creatinine stable', () => {
      const out = AcuteKidneyInjuryModel.tick({ baselineCreatinine: 1.0, currentCreatinine: 1.1 });
      expect(out.kdigo_stage).toBe(0);
      expect(out.akiCriterionMet).toBe(false);
    });

    it('Stage 1 when creatinine × 1.5 or +0.3 mg/dL in 48h', () => {
      const ratio = AcuteKidneyInjuryModel.tick({ baselineCreatinine: 1.0, currentCreatinine: 1.5 });
      expect(ratio.kdigo_stage).toBe(1);
      expect(ratio.akiCriterionMet).toBe(true);

      const rise = AcuteKidneyInjuryModel.tick({ baselineCreatinine: 1.0, currentCreatinine: 1.4, creatinine48hAgo: 1.0 });
      expect(rise.akiCriterionMet).toBe(true); // 1.4 - 1.0 = +0.4 > 0.3
    });

    it('Stage 3 with creatinine × 3 or requiring RRT', () => {
      const ratioBased = AcuteKidneyInjuryModel.tick({ baselineCreatinine: 1.0, currentCreatinine: 3.5 });
      expect(ratioBased.kdigo_stage).toBe(3);
      expect(ratioBased.rrIndicationMet).toBe(true);

      const rrt = AcuteKidneyInjuryModel.tick({ baselineCreatinine: 1.0, currentCreatinine: 2.5, isRRTActive: true });
      expect(rrt.kdigo_stage).toBe(3);
    });
  });

  describe('UO criteria', () => {
    it('oliguria for 6+ hours triggers Stage 1', () => {
      const out = AcuteKidneyInjuryModel.tick({
        baselineCreatinine: 1.0, currentCreatinine: 1.1,
        urineOutputMlHrKg: 0.3, urineOutputDuration: 7,
      });
      expect(out.uoInadequate).toBe(true);
      expect(out.uoStage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Nephrotoxin burden', () => {
    it('NSAIDs + aminoglycosides = high nephrotoxin burden', () => {
      const out = AcuteKidneyInjuryModel.tick({
        nstaidCe: 1.0, aminoglycosideCe: 1.0, vancomycinCe: 1.0,
      });
      expect(out.nephrotoxinBurden).toBeGreaterThan(0.5);
    });
  });

  describe('Contrast AKI prevention', () => {
    it('fires contrast AKI warning for low GFR patients', () => {
      const out = AcuteKidneyInjuryModel.tick({
        isContrast: true, gfr: 38, prevContrastAKILogged: false,
      });
      expect(out.events.some(e => e.includes('CI-AKI'))).toBe(true);
    });

    it('normal GFR + contrast = no specific warning', () => {
      const out = AcuteKidneyInjuryModel.tick({ isContrast: true, gfr: 85 });
      expect(out.events.filter(e => e.includes('CI-AKI')).length).toBe(0);
    });
  });

  describe('Hepatorenal syndrome', () => {
    it('HRS fires event with treatment protocol', () => {
      const out = AcuteKidneyInjuryModel.tick({ isHRS: true, hrsType: 1, prevHRSLogged: false });
      expect(out.hrsActive).toBe(true);
      expect(out.events.some(e => e.includes('HEPATORENAL'))).toBe(true);
    });

    it('terlipressin reduces HRS severity', () => {
      const noTreatment = AcuteKidneyInjuryModel.tick({ isHRS: true, terlipressinCe: 0 });
      const withTreatment = AcuteKidneyInjuryModel.tick({ isHRS: true, terlipressinCe: 2.0 });
      expect(withTreatment.terlipressinEfficacy).toBeGreaterThan(noTreatment.terlipressinEfficacy);
    });
  });
});
