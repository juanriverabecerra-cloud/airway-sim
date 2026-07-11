import { describe, it, expect } from 'vitest';
import { ClinicalScoringEngine } from '../engine/ClinicalScoringEngine';

describe('ClinicalScoringEngine — ACT, Modified Aldrete, Pre-Extubation, ASA, SOFA', () => {
  describe('ACT', () => {
    it('baseline ACT without heparin is in normal range', () => {
      const out = ClinicalScoringEngine.compute({ heparinCe: 0 });
      expect(out.actSeconds).toBeGreaterThan(80);
      expect(out.actSeconds).toBeLessThan(180);
      expect(out.actSafeForBypass).toBe(false);
    });

    it('therapeutic heparin for CPB achieves ACT > 480s (safe for bypass)', () => {
      const out = ClinicalScoringEngine.compute({ heparinCe: 3.0 });
      expect(out.actSafeForBypass).toBe(true);
      expect(out.actSeconds).toBeGreaterThan(480);
    });

    it('hypothermia prolongs ACT at the same heparin level', () => {
      const warm = ClinicalScoringEngine.compute({ heparinCe: 1.0, temperature: 37 });
      const cold = ClinicalScoringEngine.compute({ heparinCe: 1.0, temperature: 30 });
      expect(cold.actSeconds).toBeGreaterThan(warm.actSeconds + 20);
    });

    it('thrombocytopenia prolongs ACT', () => {
      const normal = ClinicalScoringEngine.compute({ heparinCe: 0, plateletCountK: 250 });
      const lowPlt = ClinicalScoringEngine.compute({ heparinCe: 0, plateletCountK: 30 });
      expect(lowPlt.actSeconds).toBeGreaterThan(normal.actSeconds);
    });
  });

  describe('Modified Aldrete Score', () => {
    it('fully recovered patient scores 10/10 and is ready for discharge', () => {
      const out = ClinicalScoringEngine.compute({
        vitals_spo2: 98, vitals_map: 90, baselineMap: 90, vitals_rr: 14,
        consciousnessLevel: 0.9, canMoveAllLimbs: true, breathesDeep: true
      });
      expect(out.aldreteTotal).toBe(10);
      expect(out.aldreteReadyForDischarge).toBe(true);
    });

    it('still deeply sedated patient scores low and is not ready for discharge', () => {
      const out = ClinicalScoringEngine.compute({
        vitals_spo2: 88, vitals_map: 50, baselineMap: 90, vitals_rr: 6,
        consciousnessLevel: 0.1, canMoveAllLimbs: false, breathesDeep: false
      });
      expect(out.aldreteTotal).toBeLessThan(5);
      expect(out.aldreteReadyForDischarge).toBe(false);
    });

    it('score is ≥9 threshold for PACU discharge', () => {
      const marginal = ClinicalScoringEngine.compute({
        vitals_spo2: 93, vitals_map: 85, baselineMap: 90, vitals_rr: 14,
        consciousnessLevel: 0.8, canMoveAllLimbs: true, breathesDeep: true
      });
      expect(marginal.aldreteReadyForDischarge).toBe(marginal.aldreteTotal >= 9);
    });
  });

  describe('Pre-Extubation Criteria', () => {
    it('all criteria met enables safe extubation', () => {
      const out = ClinicalScoringEngine.compute({
        tidalVolumeMlPerKgIBW: 8, vitals_rr: 14, vitals_spo2: 97, fio2Current: 0.35,
        etco2Current: 40, baselinePaCO2: 40, tofRatio: 0.95, isHemodynamicallyStable: true,
        temperatureForExtubation: 36.8, consciousnessLevel: 0.85
      });
      expect(out.extubationCriteria.allMet).toBe(true);
      expect(out.extubationCriteria.failedCriteria.length).toBe(0);
    });

    it('low TOF ratio (residual NMB) fails extubation criteria', () => {
      const out = ClinicalScoringEngine.compute({
        tidalVolumeMlPerKgIBW: 8, vitals_rr: 14, vitals_spo2: 97, fio2Current: 0.35,
        etco2Current: 40, baselinePaCO2: 40, tofRatio: 0.7, isHemodynamicallyStable: true,
        temperatureForExtubation: 36.8, consciousnessLevel: 0.85
      });
      expect(out.extubationCriteria.tofOK).toBe(false);
      expect(out.extubationCriteria.allMet).toBe(false);
      expect(out.extubationCriteria.failedCriteria.some(c => c.includes('TOF'))).toBe(true);
    });
  });

  describe('ASA Physical Status', () => {
    it('healthy patient with no comorbidities is ASA 1', () => {
      const out = ClinicalScoringEngine.compute({});
      expect(out.asaPhysicalStatus).toBe(1);
    });

    it('patient with controlled hypertension and obesity (BMI 35) is ASA 2', () => {
      const out = ClinicalScoringEngine.compute({ patient_htn: true, patient_bmi: 35 });
      expect(out.asaPhysicalStatus).toBe(2);
    });

    it('patient with CHF (EF 40%) is ASA 3', () => {
      const out = ClinicalScoringEngine.compute({ patient_chf: true, patient_ef: 40, patient_htn: true });
      expect(out.asaPhysicalStatus).toBe(3);
    });

    it('patient with severe CHF (EF 25%) is ASA 4', () => {
      const out = ClinicalScoringEngine.compute({ patient_chf: true, patient_ef: 25 });
      expect(out.asaPhysicalStatus).toBe(4);
    });
  });

  describe('Full SOFA Score', () => {
    it('normal physiology produces SOFA 0', () => {
      const out = ClinicalScoringEngine.compute({
        pao2: 100, fio2: 0.21, plateletCountK_sofa: 250, bilirubinMgDl: 0.8,
        mapMmHg: 90, glasgowComaScore: 15, creatinineMgDl: 0.9, urineOutputMlHr: 60
      });
      expect(out.sofaTotal).toBe(0);
    });

    it('septic shock with multi-organ failure scores high SOFA (≥10)', () => {
      const out = ClinicalScoringEngine.compute({
        pao2: 60, fio2: 0.8, plateletCountK_sofa: 45, bilirubinMgDl: 8,
        mapMmHg: 55, norepinephrineDose: 0.25, glasgowComaScore: 8,
        creatinineMgDl: 4.5, urineOutputMlHr: 8
      });
      expect(out.sofaTotal).toBeGreaterThan(10);
    });

    it('each organ system contributes independently to SOFA', () => {
      const respiratory = ClinicalScoringEngine.compute({ pao2: 150, fio2: 0.8 }); // P/F ratio 187 → SOFA 3
      expect(respiratory.sofaRespiration).toBe(3);
    });
  });

  it('falls back to sane defaults and never throws', () => {
    expect(() => ClinicalScoringEngine.compute(undefined as any)).not.toThrow();
    expect(() => ClinicalScoringEngine.compute({ heparinCe: NaN, vitals_spo2: NaN } as any)).not.toThrow();
    const out = ClinicalScoringEngine.compute({});
    expect(Number.isFinite(out.actSeconds)).toBe(true);
    expect(out.asaPhysicalStatus).toBeGreaterThanOrEqual(1);
  });
});
