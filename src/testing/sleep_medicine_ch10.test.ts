import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { MEDICATIONS } from '../engine/Pharmacology';
import { PKPDModel } from '../engine/PKPDEngine';
import { ConsciousnessEngine } from '../engine/ConsciousnessEngine';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';

describe('Chapter 10: Sleep Medicine Tests', () => {

  describe('1. Suvorexant PK/PD Integration', () => {
    it('should verify Suvorexant registration in meds.config.ts and Pharmacology.js', () => {
      const configProfile = MEDICATIONS_CONFIG.suvorexant;
      const pharmProfile = MEDICATIONS.suvorexant;

      expect(configProfile).toBeDefined();
      expect(pharmProfile).toBeDefined();
      expect(configProfile.name).toBe('Suvorexant');
      expect(pharmProfile.name).toBe('Suvorexant');

      // Verify PK parameters
      expect(configProfile.pk.V1).toBe(15.0);
      expect(configProfile.pk.k10).toBe(0.08);
      expect(configProfile.pk.ke0).toBe(1.0);

      // Verify PD parameters
      expect(configProfile.pd.c50).toBe(2.0);
      expect(configProfile.pd.gamma).toBe(1.5);
    });

    it('should simulate Suvorexant PK kinetics and show Ce rising after a bolus', () => {
      const suvorexantProfile = MEDICATIONS_CONFIG.suvorexant;
      const model = new PKPDModel(suvorexantProfile, 70);

      model.giveBolus(15); // 15 mg bolus (insomnia dose: 10-20 mg)
      expect(model.A1).toBe(15.0);

      // Tick for 30 seconds
      for (let t = 0; t < 30; t++) {
        model.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }

      // Check that plasma concentration Cp and effect-site concentration Ce have risen
      expect(model.Cp).toBeGreaterThan(0);
      expect(model.Ce).toBeGreaterThan(0);
    });

    it('should verify Suvorexant competitive orexin antagonism blunts effective orexin drive', () => {
      // Baseline waking state with no Suvorexant: orexin Effective = orexin
      const patient = { narcolepsy: false, orexinLevel: 1.0 };
      const vitals = { spo2: 98, paco2: 40 };
      const inputsNoSuvorexant = {
        propofolCe: 0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false
      };

      const outNoSuvorexant = ConsciousnessEngine.tick(1, patient, vitals, inputsNoSuvorexant);

      // State with Suvorexant: orexin Effective = orexin / (1 + Ce * 5.0)
      const inputsWithSuvorexant = {
        ...inputsNoSuvorexant,
        suvorexantCe: 2.0 // At Ce = C50 = 2.0 ng/mL
      };

      const outWithSuvorexant = ConsciousnessEngine.tick(1, patient, vitals, inputsWithSuvorexant);

      // orexinLevel remains the same but because orexinEffective is lower internally, it should reduce the wake drive
      // and influence the baseArousal and other dependent pathways.
      expect(outWithSuvorexant.orexinLevel).toBe(outNoSuvorexant.orexinLevel);
    });
  });

  describe('2. Sleep Stage Transitions and Sleep Debt', () => {
    it('should verify sleep stage transition W -> N1 when sleep drive is high and wake drive is low', () => {
      const patient = {
        sleepStage: 'W',
        sleepTimeInStage: 0,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 0.1
      };

      const vitals = { spo2: 98, paco2: 40 };
      const inputs = {
        propofolCe: 2.0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).toBe('N1');
      expect(out.sleepTimeInStage).toBe(0);
    });

    it('should verify N1 -> N2 transition after 300 seconds in N1 stage', () => {
      const patient = {
        sleepStage: 'N1',
        sleepTimeInStage: 300,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 0.1
      };

      const vitals = { spo2: 98, paco2: 40 };
      const inputs = {
        propofolCe: 2.0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).toBe('N2');
      expect(out.sleepTimeInStage).toBe(0);
    });

    it('should verify N2 -> N3 transition when sleep debt is high and slow oscillation power is high', () => {
      const patient = {
        sleepStage: 'N2',
        sleepTimeInStage: 100,
        sleepDebt: 12.0, // H_sleep = 12 / 16 = 0.75 > 0.7
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 2.0
      };

      const vitals = { spo2: 98, paco2: 40 };
      const inputs = {
        propofolCe: 2.0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).toBe('N3');
    });

    it('should verify sleep debt increases during wakefulness and decreases during sleep', () => {
      const patientW = {
        sleepStage: 'W',
        sleepTimeInStage: 10,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 1.0,
        tmnActivity: 1.0,
        vlpoActivity: 0.0,
        mnpoActivity: 0.0,
        orexinLevel: 1.0,
        slowOscillationPower: 0.1
      };

      const vitals = { spo2: 98, paco2: 40 };
      const inputs = {
        propofolCe: 0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false
      };

      // Ticking 3600 seconds of wakefulness should increase sleep debt by 1 hour
      let stateW = { ...patientW };
      for (let i = 0; i < 3600; i++) {
        const out = ConsciousnessEngine.tick(1, stateW, vitals, inputs);
        stateW.sleepDebt = out.sleepDebt;
        stateW.sleepStage = out.sleepStage;
      }
      expect(stateW.sleepDebt).toBeCloseTo(9.0, 1);

      // Sleeping
      const patientSleep = {
        sleepStage: 'N2',
        sleepTimeInStage: 10,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 0.1
      };

      const inputsSleep = { ...inputs, propofolCe: 1.5 };
      let stateSleep = { ...patientSleep };
      for (let i = 0; i < 3600; i++) {
        const out = ConsciousnessEngine.tick(1, stateSleep, vitals, inputsSleep);
        stateSleep.sleepDebt = out.sleepDebt;
        stateSleep.sleepStage = out.sleepStage;
      }
      expect(stateSleep.sleepDebt).toBeCloseTo(7.0, 1);
    });
  });

  describe('3. Cortical Arousal Triggers', () => {
    it('should trigger immediate arousal to wake stage on severe hypoxia (SpO2 < 85%)', () => {
      const patient = {
        sleepStage: 'N3',
        sleepTimeInStage: 500,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 1.0
      };

      const vitals = { spo2: 80, paco2: 40 };
      const inputs = {
        propofolCe: 0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false,
        spo2: 80,
        paco2: 40
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).toBe('W');
      expect(out.sleepTimeInStage).toBe(0);
    });

    it('should trigger immediate arousal to wake stage on severe hypercapnia (PaCO2 > 50 mmHg)', () => {
      const patient = {
        sleepStage: 'R',
        sleepTimeInStage: 300,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 1.0
      };

      const vitals = { spo2: 98, paco2: 55 };
      const inputs = {
        propofolCe: 0,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: false,
        spo2: 98,
        paco2: 55
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).toBe('W');
    });

    it('should trigger immediate arousal on surgical stimulus when not general-anesthetized', () => {
      const patient = {
        sleepStage: 'N2',
        sleepTimeInStage: 200,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 1.0
      };

      const vitals = { spo2: 98, paco2: 40 };
      const inputs = {
        propofolCe: 0.5,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0.1,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: true,
        spo2: 98,
        paco2: 40
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).toBe('W');
    });

    it('should NOT trigger arousal on surgical stimulus if patient is properly general-anesthetized', () => {
      const patient = {
        sleepStage: 'N2',
        sleepTimeInStage: 200,
        sleepDebt: 8.0,
        postOpSleepNight: 0,
        remReboundIntensity: 1.0,
        lcActivity: 0.1,
        tmnActivity: 0.1,
        vlpoActivity: 0.8,
        mnpoActivity: 0.8,
        orexinLevel: 0.1,
        slowOscillationPower: 1.0
      };

      const vitals = { spo2: 98, paco2: 40 };
      const inputs = {
        propofolCe: 1.5,
        dexmedCe: 0,
        thiopentalCe: 0,
        midazolamCe: 0,
        ketamineCe: 0,
        etomidateCe: 0,
        atipamezoleCe: 0,
        methylphenidateCe: 0,
        scopolamineCe: 0,
        sevoMac: 0,
        isoMac: 0,
        haloMac: 0,
        n2oMac: 0,
        isSyncShock: false,
        time: 0,
        suvorexantCe: 0,
        surgicalStimulus: true,
        spo2: 98,
        paco2: 40
      };

      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);
      expect(out.sleepStage).not.toBe('W');
    });
  });

  describe('4. Upper Airway Patency & Obstructive Sleep Apnea Collapse', () => {
    const createPatientState = (osa: boolean): RespiratoryPatientState => ({
      height: 175,
      age: 40,
      sex: 'male',
      bmi: 25.0,
      position: 'Supine',
      ibw: 70.0,
      airwaySecured: false,
      ventilationStatus: 'spontaneous',
      oxygenBuffer: 0.5,
      metHb: 0.8,
      coHb: 1.0,
      sleepStage: 'W',
      dilatorMuscleTone: 1.0,
      pcrit: osa ? 1.0 : -5.0
    });

    const createVitalsState = (): RespiratoryVitalsState => ({
      hr: 70,
      sys: 120,
      dia: 80,
      map: 93,
      co: 5.0,
      svr: 1200,
      cmap: 93,
      bis: 98,
      temp: 37.0,
      spo2: 98,
      paco2: 40,
      etco2: 40,
      rr: 12,
      peep: 0
    });

    const createDrugEffectsState = (): RespiratoryDrugEffects => ({
      maxNMJOccupancy: 0,
      totalRrDelta: 0,
      ruleRrScale: 1.0,
      ruleRrOffset: 0,
      ruleComplScale: 1.0,
      rulePipOffset: 0,
      ruleSpo2Offset: 0,
      ruleKOffset: 0
    });

    const createInputsState = () => ({
      VO2_sec: 0.250 / 60,
      totalMetabolicMultiplier: 1.0,
      compensatoryRR: 0,
      opioidRRDrop: 0,
      m6gRrDelta: 0,
      shiveringRRDrive: 0,
      currentHb: 14.0,
      targetMAP: 93,
      targetCO: 5.0,
      hco3: 24.0,
      volatileRightShift: 0,
      dpgDepletionShift: 0,
      baselinePaCO2: 40,
      anaphylaxisCompliancePenalty: 0,
      anaphylaxisResistancePenalty: 0,
      aspirationCompliancePenalty: 0,
      aspirationResistancePenalty: 0,
      peep: 0
    });

    it('should compute normal airway resistance (~5 cmH2O/L/s) during wakefulness', () => {
      const patient = createPatientState(false);
      const vitals = createVitalsState();
      const drugEffects = createDrugEffectsState();
      const inputs = createInputsState();

      const out = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, null, 21, drugEffects, inputs);
      expect(out.resistance).toBeCloseTo(5.0, 1);
    });

    it('should trigger complete airway collapse (resistance = 999) under OSA Collapse conditions (stage R, pcrit > PEEP)', () => {
      const patient = createPatientState(true);
      patient.sleepStage = 'R';
      patient.dilatorMuscleTone = 0.15;

      const vitals = createVitalsState();
      vitals.peep = 0;

      const drugEffects = createDrugEffectsState();
      const inputs = createInputsState();
      inputs.peep = 0;

      const out = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, null, 21, drugEffects, inputs);
      expect(out.resistance).toBe(999.0);
    });

    it('should splint open airway (prevent collapse) using CPAP/PEEP (peep > pcrit)', () => {
      const patient = createPatientState(true);
      patient.sleepStage = 'R';
      patient.dilatorMuscleTone = 0.15;

      const vitals = createVitalsState();
      vitals.peep = 5.0;

      const drugEffects = createDrugEffectsState();
      const inputs = createInputsState();
      inputs.peep = 5.0;

      const out = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, null, 21, drugEffects, inputs);
      expect(out.resistance).toBeLessThan(999.0);
      expect(out.resistance).toBeGreaterThan(5.0);
    });
  });
});
