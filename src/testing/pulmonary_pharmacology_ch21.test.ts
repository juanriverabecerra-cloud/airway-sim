import { describe, it, expect } from 'vitest';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';

describe('Chapter 21: Pulmonary Pharmacology and Inhaled Anesthetics', () => {
  const buildPatientVitals = (overrides: any = {}) => ({
    patient: {
      height: 175, age: 40, sex: 'male', bmi: 25, position: 'Supine',
      ibw: 70.3, airwaySecured: true, ventilationStatus: 'mechanical',
      oxygenBuffer: null, ...overrides
    },
    vitals: { hr: 70, sys: 120, dia: 80, map: 93, spo2: 98, paco2: 40, etco2: 36, rr: 12 },
    time: 0
  });
  const ventSettings = { mode: 'VCV', vt: 500, rr: 12, peep: 5, fio2: 40, pinsp: 20, ieRatio: 2, pmax: 60, ps: 10 };
  const drugEffects = { maxNMJOccupancy: 1.0, totalRrDelta: 0, ruleRrScale: 1.0, ruleRrOffset: 0, ruleComplScale: 1.0, rulePipOffset: 0, ruleSpo2Offset: 0, ruleKOffset: 0 };
  const baseInputs = (extra: any = {}) => ({
    VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, m6gRrDelta: 0,
    shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 93, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0,
    dpgDepletionShift: 0, baselinePaCO2: 40, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0,
    aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0,
    ...extra
  });

  describe('1. Desflurane High-Density Paradoxical Airway Resistance Increase (p.543)', () => {
    it('should not increase resistance at or below 1.0 MAC-equivalent (etAgent <= 6.0%)', () => {
      const noAgent = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs() as any);
      const atOneMac = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'desflurane', etAgent: 6.0 }) as any);

      expect(atOneMac.resistance).toBeCloseTo(noAgent.resistance, 3);
    });

    it('should increase resistance by up to 26% at 1.5 MAC-equivalent (etAgent = 9.0%)', () => {
      const noAgent = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs() as any);
      const atOnePointFiveMac = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'desflurane', etAgent: 9.0 }) as any);

      expect(atOnePointFiveMac.resistance).toBeCloseTo(noAgent.resistance * 1.26, 1);
    });

    it('should scale resistance increase linearly between 1.0 and 1.5 MAC-equivalent', () => {
      const noAgent = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs() as any);
      const atOnePointTwoFiveMac = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'desflurane', etAgent: 7.5 }) as any);

      // Halfway between 1.0 and 1.5 MAC -> half of the 26% max increase (13%).
      expect(atOnePointTwoFiveMac.resistance).toBeCloseTo(noAgent.resistance * 1.13, 1);
    });

    it('should cap the resistance increase at 26% even above 1.5 MAC-equivalent', () => {
      const noAgent = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs() as any);
      const atTwoMac = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'desflurane', etAgent: 12.0 }) as any);

      expect(atTwoMac.resistance).toBeCloseTo(noAgent.resistance * 1.26, 1);
    });

    it('should NOT apply this effect to other volatile agents (sevoflurane bronchodilates instead)', () => {
      const noAgent = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs() as any);
      const sevoHighMac = RespiratoryEngine.tick(1, buildPatientVitals() as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'sevoflurane', etAgent: 4.0, currentMac: 2.0 }) as any);

      // Sevoflurane should not increase resistance the way desflurane does at equivalent high MAC.
      expect(sevoHighMac.resistance).toBeLessThanOrEqual(noAgent.resistance);
    });

    it('should compound correctly with active bronchospasm (independent multiplicative pathways)', () => {
      const bronchospasmOnly = RespiratoryEngine.tick(1, buildPatientVitals({ bronchospasm: true }) as any, ventSettings as any, 40, drugEffects as any, baseInputs() as any);
      const bronchospasmPlusDesflurane = RespiratoryEngine.tick(1, buildPatientVitals({ bronchospasm: true }) as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'desflurane', etAgent: 9.0 }) as any);

      expect(bronchospasmPlusDesflurane.resistance).toBeGreaterThan(bronchospasmOnly.resistance);
    });

    it('should remain finite and bounded under sustained high-concentration desflurane administration', () => {
      let state = buildPatientVitals();
      let out: any;
      for (let i = 0; i < 60; i++) {
        out = RespiratoryEngine.tick(1, { ...state, time: i } as any, ventSettings as any, 40, drugEffects as any, baseInputs({ agent: 'desflurane', etAgent: 15.0 }) as any);
        state = { patient: state.patient, vitals: out.vitals, time: i };
      }
      expect(Number.isFinite(out.resistance)).toBe(true);
      expect(out.resistance).toBeGreaterThan(0);
      expect(out.resistance).toBeLessThan(1000);
    });
  });
});
