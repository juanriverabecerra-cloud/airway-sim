import { describe, it, expect } from 'vitest';
import { CerebralEngine } from '../engine/CerebralEngine';
import { CardiovascularEngine, PatientState, VitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';

describe("Chapter 19: Inhaled Anesthetics - Mechanisms of Action (TREK-1 Neuroprotection & KATP Preconditioning)", () => {
  describe('1. Cerebral TREK-1 Neuroprotection (Xenon/Sevoflurane, p.1537)', () => {
    const baseInputs = {
      sys: 80, paco2: 40, pao2: 100, spo2: 98, temp: 37.0, cvp: 5,
      sevoMac: 0, isoMac: 0, desMac: 0, haloMac: 0, n2oMac: 0, xenonMac: 0,
      positionHydrostaticMod: 0
    };
    // Low MAP (40) + high ICP combo to force CPP/CBF into the ischemic range (<20 mL/100g/min).
    const ischemicPatient = { icp: 60.0, complianceState: 'normal' as const };
    const ischemicVitals = { cbf: 10.0, cmro2: 3.3, cpp: 20.0, cbv: 1.0, icp: 60.0, rso2: 30.0 };

    it('should accumulate neuronal injury during cerebral ischemia with no protective agent', () => {
      const out = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30 });
      expect(out.hasCerebralIschemia).toBe(true);
      expect(out.neuronalInjury).toBeGreaterThan(0);
    });

    it('should accumulate injury more slowly when xenon is active (TREK-1 neuroprotection)', () => {
      const noAgent = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30 });
      const withXenon = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30, xenonMac: 1.0 });

      expect(withXenon.neuronalInjury).toBeLessThan(noAgent.neuronalInjury);
      expect(withXenon.neuronalInjury).toBeCloseTo(noAgent.neuronalInjury * 0.5, 3);
    });

    it('should accumulate injury more slowly when sevoflurane is active (TREK-1 neuroprotection)', () => {
      const noAgent = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30 });
      const withSevo = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30, sevoMac: 1.0 });

      expect(withSevo.neuronalInjury).toBeLessThan(noAgent.neuronalInjury);
    });

    it('should NOT provide neuroprotection from isoflurane (TREK-1 effect is specific to xenon/sevoflurane per the source text)', () => {
      const noAgent = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30 });
      const withIso = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30, isoMac: 1.0 });

      expect(withIso.neuronalInjury).toBeCloseTo(noAgent.neuronalInjury, 3);
    });

    it('should abolish TREK-1 neuroprotection in a TREK-1 knockout patient (§6.36)', () => {
      const knockoutPatient = { ...ischemicPatient, isTREK1Knockout: true };
      const withXenonKnockout = CerebralEngine.tick(1, { patient: knockoutPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30, xenonMac: 1.0 });
      const noAgent = CerebralEngine.tick(1, { patient: ischemicPatient, vitals: ischemicVitals, time: 0 }, [], { ...baseInputs, map: 30 });

      expect(withXenonKnockout.neuronalInjury).toBeCloseTo(noAgent.neuronalInjury, 3);
    });

    it('should not accumulate injury when CBF is in the normal/autoregulated range', () => {
      const normalPatient = { icp: 10.0, complianceState: 'normal' as const };
      const normalVitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const out = CerebralEngine.tick(1, { patient: normalPatient, vitals: normalVitals, time: 0 }, [], { ...baseInputs, map: 85 });
      expect(out.hasCerebralIschemia).toBe(false);
      expect(out.neuronalInjury).toBe(0);
    });

    it('should remain finite and bounded [0,100] under sustained severe ischemia', () => {
      let patient: any = ischemicPatient;
      let out: any;
      for (let i = 0; i < 200; i++) {
        out = CerebralEngine.tick(1, { patient, vitals: ischemicVitals, time: i }, [], { ...baseInputs, map: 30 });
        patient = { ...patient, neuronalInjury: out.neuronalInjury };
      }
      expect(Number.isFinite(out.neuronalInjury)).toBe(true);
      expect(out.neuronalInjury).toBeGreaterThanOrEqual(0);
      expect(out.neuronalInjury).toBeLessThanOrEqual(100);
    });
  });

  describe('2. Anesthetic-Induced Cardiac Ischemic Preconditioning (KATP channels, p.1709)', () => {
    const createIschemicState = (currentMac: number): { patient: PatientState; vitals: VitalsState; electrolytes: { k: number } } => ({
      patient: {
        isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false,
        myocardialStunning: 0, ebl: 0, ebv: 5000, height: 175, weight: 70, sex: 'male', age: 40, bmi: 22.9,
        position: 'Supine', arrestThreshold: 1200, patientBaseSV: 70, patientBaseSVR: 1200,
        cad: true // coronaryStenosisMod = 0.40, ensures supply < demand readily at tachycardia
      },
      // High HR + low DBP to force supply < demand (myocardial ischemia) deterministically.
      vitals: { hr: 140, sys: 150, dia: 50, map: 83, co: 5.0, svr: 1200, cmap: 83, bis: 98, temp: 37.0, spo2: 98, paco2: 40, etco2: 40 },
      electrolytes: { k: 4.0 }
    });
    const drugEffects: CardiovascularDrugEffects = {
      drugSvrMod: 1.0, drugInotropyMod: 1.0, svrSympatheticSpike: 0, contractilitySympatheticSpike: 0,
      hrSympatheticSpike: 0, shiveringHRDrive: 0, anaphylaxisHrMod: 0, anaphylaxisSvrMod: 1.0,
      totalHrDelta: 0, ruleHrScale: 1.0, ruleHrOffset: 0, ruleMapScale: 1.0, ruleMapOffset: 0,
      ruleKOffset: 0, ruleSpo2Offset: 0
    };
    const buildInputs = (currentMac: number): any => ({
      currentMac, bloodLossRatio: 0, currentEbl: 0, positionPreloadMod: 0, positionHydrostaticMod: 0,
      shiveringMultiplier: 1.0, seizureMetabolicMultiplier: 1.0, cyanideVO2Mod: 1.0, VO2_sec: 0.250 / 60,
      currentBuffer: 2.4 * 0.21, currentFRC_L: 2.4, newTemp: 37.0, newPaCO2: 40, activeMeds: [],
      getAnatomicalParameter: (_kw: string, defVal: number) => defVal
    });

    it('should accumulate myocardial stunning faster with no volatile anesthetic than at 1 MAC', () => {
      const noVolatile = CardiovascularEngine.tick(1, { ...createIschemicState(0), time: 1 }, drugEffects, buildInputs(0));
      const oneMac = CardiovascularEngine.tick(1, { ...createIschemicState(1.0), time: 1 }, drugEffects, buildInputs(1.0));

      expect(noVolatile.patient.myocardialStunning).toBeGreaterThan(0);
      expect(oneMac.patient.myocardialStunning).toBeLessThan(noVolatile.patient.myocardialStunning);
      // 30% reduction at >=1 MAC
      expect(oneMac.patient.myocardialStunning).toBeCloseTo(noVolatile.patient.myocardialStunning * 0.7, 1);
    });

    it('should cap the preconditioning benefit at 30% even above 1 MAC', () => {
      const oneMac = CardiovascularEngine.tick(1, { ...createIschemicState(1.0), time: 1 }, drugEffects, buildInputs(1.0));
      const twoMac = CardiovascularEngine.tick(1, { ...createIschemicState(2.0), time: 1 }, drugEffects, buildInputs(2.0));

      expect(twoMac.patient.myocardialStunning).toBeCloseTo(oneMac.patient.myocardialStunning, 1);
    });

    it('should scale the preconditioning benefit linearly below 1 MAC', () => {
      const noVolatile = CardiovascularEngine.tick(1, { ...createIschemicState(0), time: 1 }, drugEffects, buildInputs(0));
      const halfMac = CardiovascularEngine.tick(1, { ...createIschemicState(0.5), time: 1 }, drugEffects, buildInputs(0.5));

      // 15% reduction at 0.5 MAC
      expect(halfMac.patient.myocardialStunning).toBeCloseTo(noVolatile.patient.myocardialStunning * 0.85, 1);
    });

    it('should remain finite and bounded under sustained ischemia with high MAC', () => {
      let state = createIschemicState(1.5);
      let out: any;
      for (let i = 1; i <= 60; i++) {
        out = CardiovascularEngine.tick(1, { ...state, time: i }, drugEffects, buildInputs(1.5));
        state = { patient: out.patient, vitals: out.vitals, electrolytes: { k: 4.0 } };
      }
      expect(Number.isFinite(out.patient.myocardialStunning)).toBe(true);
      expect(out.patient.myocardialStunning).toBeGreaterThanOrEqual(0);
      expect(out.patient.myocardialStunning).toBeLessThanOrEqual(60);
    });
  });
});
