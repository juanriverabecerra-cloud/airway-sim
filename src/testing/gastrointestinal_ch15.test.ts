import { describe, it, expect } from 'vitest';
import { GastrointestinalEngine } from '../engine/GastrointestinalEngine';
import { CardiovascularEngine, PatientState, VitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';
import { calculateDermatomalBlockFraction } from '../engine/Pharmacology';

describe('Chapter 15: Gastrointestinal Physiology and Pathophysiology (Regional Block Dermatomes)', () => {
  describe('1. calculateDermatomalBlockFraction (TABLE 15.2, Miller\'s 9th Ed)', () => {
    it('should give full coverage when no level is specified (back-compat with the legacy boolean flag)', () => {
      expect(calculateDermatomalBlockFraction(undefined, 9, 13)).toBe(1.0);
    });

    it('should give maximal coverage when the epidural is centered within the organ range', () => {
      // Gut ileus range is T9-L1 (9-13). A T11 epidural (spread ±4 => T7-L3) fully covers it.
      const frac = calculateDermatomalBlockFraction(11, 9, 13);
      expect(frac).toBe(1.0);
    });

    it('should give partial coverage when the block only partially overlaps the organ range', () => {
      // T4 epidural, spread ±4 => T0(C8)-T8. Overlap with T9-L1 (9-13) is zero.
      const frac = calculateDermatomalBlockFraction(4, 9, 13);
      expect(frac).toBe(0.0);
    });

    it('should give intermediate coverage at the edge of the organ range', () => {
      // T6 epidural, spread ±4 => T2-T10. Overlap with T9-L1 (9-13) is [9,10] = 1 of 4 segments.
      const frac = calculateDermatomalBlockFraction(6, 9, 13);
      expect(frac).toBeCloseTo(0.25, 2);
    });

    it('should clamp to [0,1] and never produce NaN for extreme inputs', () => {
      expect(calculateDermatomalBlockFraction(-50, 9, 13)).toBe(0);
      expect(calculateDermatomalBlockFraction(500, 9, 13)).toBe(0);
      expect(Number.isFinite(calculateDermatomalBlockFraction(NaN, 9, 13))).toBe(true);
    });
  });

  describe('2. Graded Epidural Coverage of Gut Sympathetic Outflow', () => {
    const baselineInputs = (overrides: Partial<{ EtN_2O: number; currentMac: number; C_cat: number }> = {}) => ({
      EtN_2O: 0, currentMac: 0, C_cat: 40.0, positivePressureVentilationActive: false, spontaneousBreathingActive: true,
      ...overrides
    });

    it('should fully protect ileus duration with a mid-thoracic (T9-T11) epidural', () => {
      const patient = { manipulationIndex: 1.0, epiduralBlockActive: true, epiduralLevel: 10 };
      const out = GastrointestinalEngine.tick(1, { patient, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], baselineInputs());
      // duration = 72 * 1.0 * (1 - 1.0 * 0.36) = 46.08 hours, same as a full (legacy) block.
      expect(out.postoperativeIleus).toBeCloseTo(46.08, 1);
    });

    it('should give little-to-no ileus protection from a high cervicothoracic (T4) epidural that misses the gut\'s T9-L1 supply', () => {
      const patient = { manipulationIndex: 1.0, epiduralBlockActive: true, epiduralLevel: 4 };
      const out = GastrointestinalEngine.tick(1, { patient, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], baselineInputs());
      // No dermatomal overlap -> no protection -> duration = 72 hours (same as no block at all).
      expect(out.postoperativeIleus).toBeCloseTo(72.0, 1);
    });

    it('should always give complete protection from a celiac plexus block regardless of any epidural level', () => {
      const patient = { manipulationIndex: 1.0, celiacBlockActive: true };
      const out = GastrointestinalEngine.tick(1, { patient, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], baselineInputs());
      expect(out.postoperativeIleus).toBeCloseTo(46.08, 1);
    });

    it('should scale gut motility sympathetic-stress-inhibition protection between full and no coverage', () => {
      const fullCoverage = GastrointestinalEngine.tick(1, { patient: { epiduralBlockActive: true, epiduralLevel: 10 }, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], baselineInputs());
      const noCoverage = GastrointestinalEngine.tick(1, { patient: { epiduralBlockActive: true, epiduralLevel: 4 }, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], baselineInputs());
      const noBlock = GastrointestinalEngine.tick(1, { patient: {}, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], baselineInputs());

      expect(fullCoverage.gutMotility).toBeGreaterThan(noBlock.gutMotility);
      expect(noCoverage.gutMotility).toBeCloseTo(noBlock.gutMotility, 4);
    });
  });

  describe('3. Direct Volatile Depression of Gut Motility (independent of opioid/stress pathways)', () => {
    it('should depress gut motility dose-dependently with MAC even with zero opioid and zero stress', () => {
      const noVolatile = GastrointestinalEngine.tick(1, { patient: {}, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const withVolatile = GastrointestinalEngine.tick(1, { patient: {}, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], {
        EtN_2O: 0, currentMac: 1.2, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });

      expect(noVolatile.gutMotility).toBeCloseTo(1.0, 3);
      // 1.2 MAC -> depression = min(0.6, 0.3*1.2) = 0.36 -> motility = 1 - 0.36 = 0.64
      expect(withVolatile.gutMotility).toBeCloseTo(0.64, 2);
    });

    it('should cap volatile motility depression at 60% even at very high MAC', () => {
      const out = GastrointestinalEngine.tick(1, { patient: {}, vitals: { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 }, time: 10 }, [], {
        EtN_2O: 0, currentMac: 5.0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(out.gutMotility).toBeCloseTo(0.4, 2);
      expect(out.gutMotility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('4. Graded Splanchnic Vascular Sympathetic Block (CardiovascularEngine.ts)', () => {
    const createBaselineState = (overrides: Partial<PatientState> = {}): { patient: PatientState; vitals: VitalsState; electrolytes: { k: number } } => ({
      patient: {
        isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false,
        myocardialStunning: 0, ebl: 0, ebv: 5000, height: 175, weight: 70, sex: 'male', age: 40, bmi: 22.9,
        position: 'Supine', arrestThreshold: 1200, patientBaseSV: 70, patientBaseSVR: 1200, ...overrides
      },
      vitals: { hr: 70, sys: 120, dia: 80, map: 93, co: 5.0, svr: 1200, cmap: 93, bis: 98, temp: 37.0, spo2: 99, paco2: 40, etco2: 40 },
      electrolytes: { k: 4.0 }
    });
    const drugEffects: CardiovascularDrugEffects = {
      drugSvrMod: 1.0, drugInotropyMod: 1.0, svrSympatheticSpike: 0, contractilitySympatheticSpike: 0,
      hrSympatheticSpike: 0, shiveringHRDrive: 0, anaphylaxisHrMod: 0, anaphylaxisSvrMod: 1.0,
      totalHrDelta: 0, ruleHrScale: 1.0, ruleHrOffset: 0, ruleMapScale: 1.0, ruleMapOffset: 0,
      ruleKOffset: 0, ruleSpo2Offset: 0
    };
    const inputs: any = {
      currentMac: 0, bloodLossRatio: 0, currentEbl: 0, positionPreloadMod: 0, positionHydrostaticMod: 0,
      shiveringMultiplier: 1.0, seizureMetabolicMultiplier: 1.0, cyanideVO2Mod: 1.0, VO2_sec: 0.250 / 60,
      currentBuffer: 2.4 * 0.21, currentFRC_L: 2.4, newTemp: 37.0, newPaCO2: 40, activeMeds: [],
      getAnatomicalParameter: (_kw: string, defVal: number) => defVal
    };

    const tickN = (state: any, n: number) => {
      let current = state;
      let out: any;
      for (let i = 1; i <= n; i++) {
        out = CardiovascularEngine.tick(1, { ...current, time: i }, drugEffects, inputs);
        current = { patient: { ...out.patient }, vitals: { ...out.vitals }, electrolytes: { k: 4.0 } };
      }
      return out;
    };

    it('should pool less splanchnic volume (higher MAP) under a high cervicothoracic epidural than a mid-thoracic one (TABLE 15.2 splanchnic range T5-L1)', () => {
      const highEpiduralOut = tickN(createBaselineState({ epiduralBlockActive: true, epiduralLevel: 4 }), 30);
      const midEpiduralOut = tickN(createBaselineState({ epiduralBlockActive: true, epiduralLevel: 9 }), 30);

      expect(midEpiduralOut.vitals.map).toBeLessThanOrEqual(highEpiduralOut.vitals.map);
    });

    it('should remain finite and bounded across the full epidural level range', () => {
      for (let lvl = 1; lvl <= 12; lvl++) {
        const out = tickN(createBaselineState({ epiduralBlockActive: true, epiduralLevel: lvl }), 20);
        expect(Number.isFinite(out.vitals.map)).toBe(true);
        expect(Number.isFinite(out.vitals.co)).toBe(true);
        expect(out.vitals.map).toBeGreaterThanOrEqual(0);
        expect(out.vitals.map).toBeLessThanOrEqual(220);
      }
    });
  });
});
