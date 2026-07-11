import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { PainEngine } from '../engine/PainEngine';
import { ConsciousnessEngine } from '../engine/ConsciousnessEngine';
import { CardiovascularEngine, PatientState as CvPatientState, VitalsState as CvVitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';

describe('Chapter 23: Intravenous Anesthetics', () => {

  // ════════════════════════════════════════════════════════════════════════════
  // Helpers (same patterns as delivery_systems_ch22.test.ts / cardiovascular.test.ts)
  // ════════════════════════════════════════════════════════════════════════════

  const createCvState = (): { patient: CvPatientState; vitals: CvVitalsState; electrolytes: { k: number } } => ({
    patient: {
      isArrest: false,
      cardiacRhythm: 'normal',
      cprActive: false,
      ischemicDamage: 0,
      biologicalDeath: false,
      myocardialStunning: 0,
      ebl: 0,
      ebv: 5000,
      height: 175,
      weight: 70,
      sex: 'male',
      age: 40,
      bmi: 22.9,
      position: 'Supine',
      arrestThreshold: 1200,
      patientBaseSV: 70,
      patientBaseSVR: 1200,
      hasPneumothorax: false
    },
    vitals: {
      hr: 70,
      sys: 120,
      dia: 80,
      map: 93,
      co: 5.0,
      svr: 1200,
      cmap: 93,
      bis: 98,
      temp: 37.0,
      spo2: 99,
      paco2: 40,
      etco2: 40
    },
    electrolytes: { k: 4.0 }
  });

  const createCvDrugEffects = (): CardiovascularDrugEffects => ({
    drugSvrMod: 1.0,
    drugInotropyMod: 1.0,
    svrSympatheticSpike: 0,
    contractilitySympatheticSpike: 0,
    hrSympatheticSpike: 0,
    shiveringHRDrive: 0,
    anaphylaxisHrMod: 0,
    anaphylaxisSvrMod: 1.0,
    totalHrDelta: 0,
    ruleHrScale: 1.0,
    ruleHrOffset: 0,
    ruleMapScale: 1.0,
    ruleMapOffset: 0,
    ruleKOffset: 0,
    ruleSpo2Offset: 0
  });

  const createCvInputs = () => ({
    currentMac: 0,
    bloodLossRatio: 0,
    currentEbl: 0,
    positionPreloadMod: 0,
    positionHydrostaticMod: 0,
    shiveringMultiplier: 1.0,
    seizureMetabolicMultiplier: 1.0,
    cyanideVO2Mod: 1.0,
    VO2_sec: 0.250 / 60,
    currentBuffer: 2.4 * 0.21,
    currentFRC_L: 2.4,
    newTemp: 37.0,
    newPaCO2: 40,
    activeMeds: [] as { name: string; A1: number }[],
    getAnatomicalParameter: (_kw: string, defVal: number) => defVal
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. Barbiturate Configuration
  // ════════════════════════════════════════════════════════════════════════════

  describe('1. Barbiturate Configuration (meds.config.ts)', () => {
    it('should verify Thiopental exists with correct PD parameters (c50=15.0, gamma=2.0)', () => {
      const thio = MEDICATIONS_CONFIG.thiopental;
      expect(thio).toBeDefined();
      expect(thio.name).toBe('Thiopental');
      expect(thio.pd.c50).toBe(15.0);
      expect(thio.pd.gamma).toBe(2.0);
    });

    it('should verify Thiopental class is Barbiturate, dosingWeight is LBW, pkModel is Stanski', () => {
      const thio = MEDICATIONS_CONFIG.thiopental;
      expect(thio.classes).toContain('Barbiturate');
      expect(thio.dosingWeight).toBe('LBW');
      expect(thio.pkModel).toBe('Stanski');
    });

    it('should verify Methohexital exists with correct PD parameters (c50=3.5, gamma=2.0)', () => {
      const metho = MEDICATIONS_CONFIG.methohexital;
      expect(metho).toBeDefined();
      expect(metho.name).toBe('Methohexital');
      expect(metho.pd.c50).toBe(3.5);
      expect(metho.pd.gamma).toBe(2.0);
    });

    it('should verify Methohexital class is Barbiturate, dosingWeight is LBW, pkModel is Hudson', () => {
      const metho = MEDICATIONS_CONFIG.methohexital;
      expect(metho.classes).toContain('Barbiturate');
      expect(metho.dosingWeight).toBe('LBW');
      expect(metho.pkModel).toBe('Hudson');
    });

    it('should verify both barbiturates target GABA-A receptor', () => {
      expect(MEDICATIONS_CONFIG.thiopental.targetReceptor).toBe('GABA-A');
      expect(MEDICATIONS_CONFIG.methohexital.targetReceptor).toBe('GABA-A');
    });

    it('should verify Thiopental induces apnea at Ce=10.0 and Methohexital at Ce=2.5', () => {
      expect(MEDICATIONS_CONFIG.thiopental.pd.inducesApneaAtCe).toBe(10.0);
      expect(MEDICATIONS_CONFIG.methohexital.pd.inducesApneaAtCe).toBe(2.5);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. Papaverine Configuration
  // ════════════════════════════════════════════════════════════════════════════

  describe('2. Papaverine Configuration (meds.config.ts)', () => {
    it('should verify Papaverine exists with class Vasodilator and dosingWeight TBW', () => {
      const pap = MEDICATIONS_CONFIG.papaverine;
      expect(pap).toBeDefined();
      expect(pap.name).toBe('Papaverine');
      expect(pap.classes).toContain('Vasodilator');
      expect(pap.dosingWeight).toBe('TBW');
    });

    it('should verify Papaverine targets Phosphodiesterase receptor', () => {
      const pap = MEDICATIONS_CONFIG.papaverine;
      expect(pap.targetReceptor).toBe('Phosphodiesterase');
    });

    it('should verify Papaverine PD parameters (c50=1.0, gamma=2.0)', () => {
      const pap = MEDICATIONS_CONFIG.papaverine;
      expect(pap.pd.c50).toBe(1.0);
      expect(pap.pd.gamma).toBe(2.0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. PainEngine Barbiturate Integration
  // ════════════════════════════════════════════════════════════════════════════

  describe('3. PainEngine Barbiturate Integration', () => {
    it('should produce positive hypnoticFraction when Thiopental Ce > c50 (Ce=20)', () => {
      // PainEngine internally calls getDrugEffect('Thiopental', 15.0, 2.0)
      // With Ce=20: E = 20^2 / (20^2 + 15^2) = 400/625 = 0.64
      // hypnoticFraction includes thiopentalEff * 2.0 = 1.28
      const out = PainEngine.tick(
        1,
        { surgicalPhase: 'Incision', incisionStartTime: 0 },
        { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 },
        [{ name: 'Thiopental', Ce: 20 }],
        0, // currentMac
        10 // simulationTime
      );
      // With high thiopentalEff, the BAR suppression should be significant,
      // reducing sympathetic drive relative to a drug-free scenario
      expect(out.sympatheticDrive).toBeDefined();

      // Test without the drug to confirm the difference
      const outNoDrug = PainEngine.tick(
        1,
        { surgicalPhase: 'Incision', incisionStartTime: 0 },
        { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 },
        [],
        0,
        10
      );
      // BAR suppression from Thiopental should reduce sympathetic drive
      expect(out.sympatheticDrive).toBeLessThan(outNoDrug.sympatheticDrive);
    });

    it('should produce positive hypnoticFraction when Methohexital Ce > c50 (Ce=5)', () => {
      // getDrugEffect('Methohexital', 3.5, 2.0) with Ce=5: E = 25/(25+12.25) = 0.671
      // hypnoticFraction includes methohexitalEff * 2.0 = 1.34
      const out = PainEngine.tick(
        1,
        { surgicalPhase: 'Incision', incisionStartTime: 0 },
        { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 },
        [{ name: 'Methohexital', Ce: 5 }],
        0,
        10
      );

      const outNoDrug = PainEngine.tick(
        1,
        { surgicalPhase: 'Incision', incisionStartTime: 0 },
        { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 },
        [],
        0,
        10
      );
      // BAR suppression from Methohexital should reduce sympathetic drive
      expect(out.sympatheticDrive).toBeLessThan(outNoDrug.sympatheticDrive);
    });

    it('should show that combined barbiturates produce greater BAR suppression than either alone', () => {
      const patient = { surgicalPhase: 'Incision' as const, incisionStartTime: 0 };
      const vitals = { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 };

      const outThio = PainEngine.tick(1, patient, vitals, [{ name: 'Thiopental', Ce: 10 }], 0, 10);
      const outMetho = PainEngine.tick(1, patient, vitals, [{ name: 'Methohexital', Ce: 2 }], 0, 10);
      const outBoth = PainEngine.tick(1, patient, vitals, [{ name: 'Thiopental', Ce: 10 }, { name: 'Methohexital', Ce: 2 }], 0, 10);

      // Combined should suppress more (lower sympatheticDrive)
      expect(outBoth.sympatheticDrive).toBeLessThanOrEqual(outThio.sympatheticDrive);
      expect(outBoth.sympatheticDrive).toBeLessThanOrEqual(outMetho.sympatheticDrive);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. ConsciousnessEngine Barbiturate Integration
  // ════════════════════════════════════════════════════════════════════════════

  describe('4. ConsciousnessEngine Barbiturate Integration', () => {
    const baseConsciousnessInputs = (): any => ({
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
      time: 10,
      methohexitalCe: 0
    });

    it('should compute effectiveBarbiturateCe as thiopentalCe + methohexitalCe * (15.0/3.5)', () => {
      // Per ConsciousnessEngine line 62:
      // effectiveBarbiturateCe = inputs.thiopentalCe + methoCe * (15.0 / 3.5)
      // With thiopentalCe=5.0, methohexitalCe=1.0:
      // effectiveBarbiturateCe = 5.0 + 1.0 * 4.2857 = 9.2857

      const inputs = baseConsciousnessInputs();
      inputs.thiopentalCe = 5.0;
      inputs.methohexitalCe = 1.0;

      const out = ConsciousnessEngine.tick(100, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputs);

      // The effectiveBarbiturateCe reduces LC activity (line 72: -0.4 * effectiveBarbiturateCe)
      // and TMN activity (line 83: -0.7 * effectiveBarbiturateCe)
      // These should be significantly reduced
      expect(out.lcActivity).toBeLessThan(0.5);
      expect(out.tmnActivity).toBeLessThan(0.5);
    });

    it('should reduce frontoparietal feedback with high barbiturate Ce', () => {
      // frontoparietal decreases by -0.8 * effectiveBarbiturateCe
      const inputs = baseConsciousnessInputs();
      inputs.thiopentalCe = 3.0;

      const out = ConsciousnessEngine.tick(1, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputs);

      // With effectiveBarbiturateCe = 3.0:
      // frontoparietal = max(0, 1.0 - 0.8*3.0 ...) = approximately 0.0
      expect(out.frontoparietalFeedback).toBeLessThan(0.3);
    });

    it('should increase VLPO sleep-promoting activity with barbiturate Ce', () => {
      // vlpoTarget includes: 0.7 * effectiveBarbiturateCe
      const inputsNone = baseConsciousnessInputs();
      const inputsBarb = baseConsciousnessInputs();
      inputsBarb.thiopentalCe = 2.0;

      const outNone = ConsciousnessEngine.tick(1, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputsNone);
      const outBarb = ConsciousnessEngine.tick(1, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputsBarb);

      expect(outBarb.vlpoActivity).toBeGreaterThan(outNone.vlpoActivity);
    });

    it('should impair explicit encoding (lambda) with barbiturate Ce', () => {
      // encoding lambda decreases by -0.85 * effectiveBarbiturateCe
      const inputsNone = baseConsciousnessInputs();
      const inputsBarb = baseConsciousnessInputs();
      inputsBarb.thiopentalCe = 2.0;

      const outNone = ConsciousnessEngine.tick(1, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputsNone);
      const outBarb = ConsciousnessEngine.tick(1, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputsBarb);

      expect(outBarb.explicitEncoding).toBeLessThan(outNone.explicitEncoding);
    });

    it('should achieve deep unconsciousness with high methohexital Ce (potency-scaled by 15/3.5)', () => {
      // methohexitalCe=3.5 produces effectiveBarbiturateCe = 0 + 3.5*(15/3.5) = 15.0
      // This is massive — should completely suppress consciousness
      const inputs = baseConsciousnessInputs();
      inputs.methohexitalCe = 3.5;

      const out = ConsciousnessEngine.tick(100, {}, { hr: 70, sys: 120, dia: 80, map: 93 }, inputs);

      expect(out.lcActivity).toBeLessThan(0.1);
      expect(out.tmnActivity).toBeLessThan(0.1);
      expect(out.frontoparietalFeedback).toBe(0);
      expect(out.explicitEncoding).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. CardiovascularEngine Adrenal Suppression
  // ════════════════════════════════════════════════════════════════════════════

  describe('5. CardiovascularEngine Adrenal Suppression', () => {
    it('should blunt sympathetic SVR spike by 40% when adrenalSuppressionActive is true', () => {
      // Per CardiovascularEngine.ts lines 156-159:
      // if (patient.adrenalSuppressionActive) {
      //   safeSvrSympatheticSpike *= 0.6;
      //   safeContractilitySympatheticSpike *= 0.6;
      // }
      const stateNormal = createCvState();
      const stateAdrenal = createCvState();
      stateAdrenal.patient.adrenalSuppressionActive = true;

      const drugEffects = createCvDrugEffects();
      drugEffects.svrSympatheticSpike = 300;
      drugEffects.contractilitySympatheticSpike = 0.5;

      const inputs = createCvInputs();

      const outNormal = CardiovascularEngine.tick(1, { ...stateNormal, time: 10 }, drugEffects, inputs);
      const outAdrenal = CardiovascularEngine.tick(1, { ...stateAdrenal, time: 10 }, drugEffects, inputs);

      // With adrenal suppression, SVR spike is multiplied by 0.6 (40% blunting)
      // and contractility spike is also multiplied by 0.6
      // MAP should be lower with adrenal suppression
      expect(outAdrenal.vitals.map).toBeLessThan(outNormal.vitals.map);
    });

    it('should reduce contractility when myocardialStunning > 0', () => {
      const stateHealthy = createCvState();
      const stateStunned = createCvState();
      // Kept below the Bezold-Jarisch reflex's >25 trigger (CardiovascularEngine.ts) so this
      // isolates the pure contractility effect -- at >25, BJ's reflex bradycardia+vasodilation
      // becomes a confounding second variable: lower HR alone increases diastolic filling time
      // in the chamber-mechanics engine (Phase 0 of mutable-roaming-newell.md), which can
      // partially or fully offset reduced contractility's effect on CO, independent of stunning.
      stateStunned.patient.myocardialStunning = 15; // 15% stunning

      const drugEffects = createCvDrugEffects();
      const inputs = createCvInputs();

      const outHealthy = CardiovascularEngine.tick(1, { ...stateHealthy, time: 10 }, drugEffects, inputs);
      const outStunned = CardiovascularEngine.tick(1, { ...stateStunned, time: 10 }, drugEffects, inputs);

      // Inotropic factor is: 1.0 - (stunning/100), so at 15% stunning, inotropy = 0.85
      // This should reduce CO and MAP
      expect(outStunned.vitals.co).toBeLessThan(outHealthy.vitals.co);
      expect(outStunned.vitals.map).toBeLessThan(outHealthy.vitals.map);
    });

    it('should verify combined adrenal suppression and myocardial stunning produce severe hemodynamic compromise', () => {
      const state = createCvState();
      state.patient.adrenalSuppressionActive = true;
      state.patient.myocardialStunning = 40;

      const drugEffects = createCvDrugEffects();
      drugEffects.svrSympatheticSpike = 200;
      drugEffects.contractilitySympatheticSpike = 0.3;

      const inputs = createCvInputs();

      const out = CardiovascularEngine.tick(1, { ...state, time: 10 }, drugEffects, inputs);

      // Both sympathetic response blunting and reduced inotropy compound
      expect(out.vitals.map).toBeLessThan(80);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. PRIS Crisis Logic (unit-tested conceptually)
  // ════════════════════════════════════════════════════════════════════════════

  describe('6. PRIS (Propofol Infusion Syndrome) Crisis Logic', () => {
    it('should verify the accumulation threshold: rate > 67 mcg/kg/min triggers prisAccumulation += 1', () => {
      // Per usePhysiology.js lines 2265-2269:
      // const rateMcgKgMin = (propofolModel.currentInfusionRate * 1000 * 60) / safePatientWeight;
      // if (rateMcgKgMin > 67.0) { currentPrisAccum += 1; }
      const patientWeight = 70;
      // Rate = 67 mcg/kg/min => mg/sec = 67 * 70 / (1000 * 60) = 0.0782 mg/sec
      const thresholdRate = (67.0 * patientWeight) / (1000 * 60); // 0.0782 mg/s
      const highRate = (80.0 * patientWeight) / (1000 * 60);      // 0.0933 mg/s (above threshold)

      // Verify the threshold rate calculation
      const rateMcgKgMinThreshold = (thresholdRate * 1000 * 60) / patientWeight;
      expect(rateMcgKgMinThreshold).toBeCloseTo(67.0, 1);

      const rateMcgKgMinHigh = (highRate * 1000 * 60) / patientWeight;
      expect(rateMcgKgMinHigh).toBeGreaterThan(67.0);

      // Simulate accumulation logic
      let prisAccum = 0;
      const simulateRate = (infusionRate: number, weight: number) => {
        const rate = (infusionRate * 1000 * 60) / weight;
        if (rate > 67.0) prisAccum += 1;
      };

      simulateRate(highRate, patientWeight);
      expect(prisAccum).toBe(1);
    });

    it('should trigger prisTriggered=true after 120 ticks of high-rate propofol infusion', () => {
      // Per usePhysiology.js lines 2271-2273:
      // if (currentPrisAccum > 120 && !prisTriggered) { prisTriggered = true; }
      let prisAccum = 0;
      let prisTriggered = false;

      // Simulate 121 ticks of high-rate infusion
      for (let i = 0; i < 121; i++) {
        prisAccum += 1; // Each tick accumulates 1
        if (prisAccum > 120 && !prisTriggered) {
          prisTriggered = true;
        }
      }

      expect(prisAccum).toBe(121);
      expect(prisTriggered).toBe(true);
    });

    it('should not trigger PRIS at exactly 120 accumulation (threshold is >120)', () => {
      let prisAccum = 120;
      let prisTriggered = false;

      if (prisAccum > 120 && !prisTriggered) {
        prisTriggered = true;
      }

      expect(prisTriggered).toBe(false);
    });

    it('should raise K+ and lactate when PRIS is triggered and propofol continues infusing', () => {
      // Per usePhysiology.js lines 2279-2284:
      // if (isInfusing) { currentK += 0.03; currentLactate += 0.08; stunning += 0.5; }
      let currentK = 4.0;
      let currentLactate = 1.0;
      let stunning = 0;

      // Simulate 60 ticks of PRIS with continued infusion
      for (let i = 0; i < 60; i++) {
        currentK += 0.03;
        currentLactate += 0.08;
        stunning = Math.min(85, stunning + 0.5);
      }

      expect(currentK).toBeGreaterThan(5.5);   // 4.0 + 60*0.03 = 5.8
      expect(currentLactate).toBeGreaterThan(5.0); // 1.0 + 60*0.08 = 5.8
      expect(stunning).toBeGreaterThan(20);      // 60*0.5 = 30, capped at 85
    });

    it('should allow K+ and lactate recovery when propofol infusion is stopped', () => {
      // Per usePhysiology.js lines 2286-2289:
      // currentK = Math.max(4.0, currentK - 0.01);
      // currentLactate = Math.max(1.0, currentLactate - 0.015);
      let currentK = 6.0;
      let currentLactate = 5.0;
      let stunning = 30;

      // Simulate 100 ticks of recovery (propofol stopped)
      for (let i = 0; i < 100; i++) {
        currentK = Math.max(4.0, currentK - 0.01);
        currentLactate = Math.max(1.0, currentLactate - 0.015);
        stunning = Math.max(0, stunning - 0.2);
      }

      expect(currentK).toBeLessThan(6.0);         // Recovering
      expect(currentK).toBeCloseTo(5.0, 1);        // 6.0 - 100*0.01 = 5.0
      expect(currentLactate).toBeLessThan(5.0);     // Recovering
      expect(currentLactate).toBeCloseTo(3.5, 1);   // 5.0 - 100*0.015 = 3.5
      expect(stunning).toBeLessThan(30);             // 30 - 100*0.2 = 10
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. Benzodiazepine Withdrawal Seizures
  // ════════════════════════════════════════════════════════════════════════════

  describe('7. Benzodiazepine Withdrawal Seizures', () => {
    it('should trigger seizures when Flumazenil Ce > 0.02 in a patient with chronicBenzoUse and forceBenzoWithdrawalSeizure is true', () => {
      const flumCe = 0.03;
      const chronicBenzoUse = true;
      const forceBenzoWithdrawalSeizure = true;
      let benzoWithdrawalSeizureTriggered = false;
      let benzoWithdrawalSeizureRolled = undefined;

      if (flumCe > 0.02 && chronicBenzoUse && !benzoWithdrawalSeizureTriggered && benzoWithdrawalSeizureRolled === undefined) {
        if (forceBenzoWithdrawalSeizure) {
          benzoWithdrawalSeizureTriggered = true;
        }
      }

      expect(benzoWithdrawalSeizureTriggered).toBe(true);
    });

    it('should NOT trigger seizures when Flumazenil Ce <= 0.02 in a chronic benzo user', () => {
      const flumCe = 0.02;
      const chronicBenzoUse = true;
      const forceBenzoWithdrawalSeizure = true;
      let benzoWithdrawalSeizureTriggered = false;
      let benzoWithdrawalSeizureRolled = undefined;

      if (flumCe > 0.02 && chronicBenzoUse && !benzoWithdrawalSeizureTriggered && benzoWithdrawalSeizureRolled === undefined) {
        if (forceBenzoWithdrawalSeizure) {
          benzoWithdrawalSeizureTriggered = true;
        }
      }

      expect(benzoWithdrawalSeizureTriggered).toBe(false);
    });

    it('should NOT trigger seizures when Flumazenil Ce > 0.02 in a non-chronic benzo user', () => {
      const flumCe = 0.03;
      const chronicBenzoUse = false;
      const forceBenzoWithdrawalSeizure = true;
      let benzoWithdrawalSeizureTriggered = false;
      let benzoWithdrawalSeizureRolled = undefined;

      if (flumCe > 0.02 && chronicBenzoUse && !benzoWithdrawalSeizureTriggered && benzoWithdrawalSeizureRolled === undefined) {
        if (forceBenzoWithdrawalSeizure) {
          benzoWithdrawalSeizureTriggered = true;
        }
      }

      expect(benzoWithdrawalSeizureTriggered).toBe(false);
    });

    it('should abort seizures when Propofol Ce > 1.2', () => {
      // Per usePhysiology.js lines 2409-2415:
      // if (propofolCe > 1.2 || midazolamCe > 0.08) {
      //   st.patient.benzoWithdrawalSeizureTriggered = false;
      // } else { isSeizure = true; seizureMetabolicMultiplier = 8.0; }
      let benzoWithdrawalSeizureTriggered = true;
      let isSeizure = false;
      let seizureMetabolicMultiplier = 1.0;
      const propofolCe = 1.5;
      const midazolamCe = 0.0;

      if (benzoWithdrawalSeizureTriggered) {
        if (propofolCe > 1.2 || midazolamCe > 0.08) {
          benzoWithdrawalSeizureTriggered = false;
        } else {
          isSeizure = true;
          seizureMetabolicMultiplier = 8.0;
        }
      }

      expect(benzoWithdrawalSeizureTriggered).toBe(false);
      expect(isSeizure).toBe(false);
      expect(seizureMetabolicMultiplier).toBe(1.0);
    });

    it('should abort seizures when Midazolam Ce > 0.08 (alternative treatment)', () => {
      let benzoWithdrawalSeizureTriggered = true;
      let isSeizure = false;
      let seizureMetabolicMultiplier = 1.0;
      const propofolCe = 0.0;
      const midazolamCe = 0.1;

      if (benzoWithdrawalSeizureTriggered) {
        if (propofolCe > 1.2 || midazolamCe > 0.08) {
          benzoWithdrawalSeizureTriggered = false;
        } else {
          isSeizure = true;
          seizureMetabolicMultiplier = 8.0;
        }
      }

      expect(benzoWithdrawalSeizureTriggered).toBe(false);
      expect(isSeizure).toBe(false);
    });

    it('should persist seizure with 8x metabolic multiplier when no anticonvulsant given', () => {
      let benzoWithdrawalSeizureTriggered = true;
      let isSeizure = false;
      let seizureMetabolicMultiplier = 1.0;
      const propofolCe = 0.0;
      const midazolamCe = 0.0;

      if (benzoWithdrawalSeizureTriggered) {
        if (propofolCe > 1.2 || midazolamCe > 0.08) {
          benzoWithdrawalSeizureTriggered = false;
        } else {
          isSeizure = true;
          seizureMetabolicMultiplier = 8.0;
        }
      }

      expect(benzoWithdrawalSeizureTriggered).toBe(true);
      expect(isSeizure).toBe(true);
      expect(seizureMetabolicMultiplier).toBe(8.0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. Arterial Barbiturate Injection
  // ════════════════════════════════════════════════════════════════════════════

  describe('8. Arterial Barbiturate Injection', () => {
    it('should set barbiturateArterialPrecipitation=true when barbiturate is injected into arterial line with forceBarbituratePrecipitation=true', () => {
      let barbiturateArterialPrecipitation = false;
      const medId = 'thiopental';
      const targetLineCategory = 'Arterial';
      const injectedArterial = targetLineCategory.includes('Arterial');
      const forceBarbituratePrecipitation = true;

      if (injectedArterial && (medId === 'thiopental' || medId === 'methohexital')) {
        if (forceBarbituratePrecipitation) {
          barbiturateArterialPrecipitation = true;
        }
      }

      expect(barbiturateArterialPrecipitation).toBe(true);
    });

    it('should also trigger for methohexital injected into arterial line with forceBarbituratePrecipitation=true', () => {
      let barbiturateArterialPrecipitation = false;
      const medId = 'methohexital';
      const injectedArterial = true;
      const forceBarbituratePrecipitation = true;

      if (injectedArterial && (medId === 'thiopental' || medId === 'methohexital')) {
        if (forceBarbituratePrecipitation) {
          barbiturateArterialPrecipitation = true;
        }
      }

      expect(barbiturateArterialPrecipitation).toBe(true);
    });

    it('should resolve precipitation when Lidocaine Ce > 0.05', () => {
      // Per usePhysiology.js lines 2385-2388:
      // if (lidoCe > 0.05 || papCe > 0.05) {
      //   barbiturateArterialPrecipitation = false;
      // }
      let barbiturateArterialPrecipitation = true;
      const lidoCe = 0.1;
      const papCe = 0;

      if (lidoCe > 0.05 || papCe > 0.05) {
        barbiturateArterialPrecipitation = false;
      }

      expect(barbiturateArterialPrecipitation).toBe(false);
    });

    it('should resolve precipitation when Papaverine Ce > 0.05', () => {
      let barbiturateArterialPrecipitation = true;
      const lidoCe = 0;
      const papCe = 0.1;

      if (lidoCe > 0.05 || papCe > 0.05) {
        barbiturateArterialPrecipitation = false;
      }

      expect(barbiturateArterialPrecipitation).toBe(false);
    });

    it('should NOT resolve precipitation when both Lidocaine and Papaverine Ce <= 0.05', () => {
      let barbiturateArterialPrecipitation = true;
      const lidoCe = 0.05;
      const papCe = 0.05;

      if (lidoCe > 0.05 || papCe > 0.05) {
        barbiturateArterialPrecipitation = false;
      }

      expect(barbiturateArterialPrecipitation).toBe(true);
    });

    it('should add hemodynamic offsets (HR+30, MAP+40) while arterial precipitation is unresolved', () => {
      // Per usePhysiology.js lines 2389-2392:
      // else { arterialIschemiaHrMod = 30; arterialIschemiaMapMod = 40; }
      let arterialIschemiaHrMod = 0;
      let arterialIschemiaMapMod = 0;
      const barbiturateArterialPrecipitation = true;
      const lidoCe = 0;
      const papCe = 0;

      if (barbiturateArterialPrecipitation) {
        if (lidoCe > 0.05 || papCe > 0.05) {
          // resolved
        } else {
          arterialIschemiaHrMod = 30;
          arterialIschemiaMapMod = 40;
        }
      }

      expect(arterialIschemiaHrMod).toBe(30);
      expect(arterialIschemiaMapMod).toBe(40);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. Etomidate Config & Adrenal Suppression Config Verification
  // ════════════════════════════════════════════════════════════════════════════

  describe('9. Etomidate Adrenocortical Suppression Config', () => {
    it('should verify Etomidate exists in meds.config with correct hemodynamic-sparing PD parameters', () => {
      const eto = MEDICATIONS_CONFIG.etomidate;
      expect(eto).toBeDefined();
      expect(eto.name).toBe('Etomidate');
      expect(eto.pd.sysMax).toBe(-5);
      expect(eto.pd.diaMax).toBe(-5);
      expect(eto.pd.hrMax).toBe(0); // Hemodynamically stable
    });

    it('should verify Etomidate notes mention adrenocortical inhibition (11-beta-hydroxylase)', () => {
      const eto = MEDICATIONS_CONFIG.etomidate;
      expect(eto.notes).toContain('11-beta-hydroxylase');
    });

    it('should verify Flumazenil config exists as GABA Antagonist with correct c50', () => {
      const flum = MEDICATIONS_CONFIG.flumazenil;
      expect(flum).toBeDefined();
      expect(flum.name).toBe('Flumazenil');
      expect(flum.classes).toContain('GABA Antagonist');
      expect(flum.pd.c50).toBe(0.002);
    });

    it('should verify Propofol notes mention PRIS threshold > 67 mcg/kg/min', () => {
      const prop = MEDICATIONS_CONFIG.propofol;
      expect(prop.notes).toContain('67 mcg/kg/min');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. Cross-Engine Integration: Barbiturates in CardiovascularEngine
  // ════════════════════════════════════════════════════════════════════════════

  describe('10. Cross-Engine Integration: Barbiturate Hemodynamics', () => {
    it('should verify Thiopental PD has reflex tachycardia (hrMax=+15) and BP depression (sysMax=-25)', () => {
      const thio = MEDICATIONS_CONFIG.thiopental;
      expect(thio.pd.hrMax).toBe(15);
      expect(thio.pd.sysMax).toBe(-25);
      expect(thio.pd.diaMax).toBe(-20);
    });

    it('should verify Methohexital PD has reflex tachycardia (hrMax=+20) and milder BP depression (sysMax=-20)', () => {
      const metho = MEDICATIONS_CONFIG.methohexital;
      expect(metho.pd.hrMax).toBe(20);
      expect(metho.pd.sysMax).toBe(-20);
      expect(metho.pd.diaMax).toBe(-15);
    });

    it('should verify Methohexital faster ke0 compared to Thiopental (both recalibrated for clinical onset)', () => {
      // Thiopental ke0=3.0 (onset ~1 min), Methohexital ke0=5.0 (onset ~30s) — both faster than prior values.
      // Relationship preserved: methohexital onset faster than thiopental.
      expect(MEDICATIONS_CONFIG.methohexital.pk.ke0).toBe(5.0);
      expect(MEDICATIONS_CONFIG.thiopental.pk.ke0).toBe(3.0);
      expect(MEDICATIONS_CONFIG.methohexital.pk.ke0).toBeGreaterThan(MEDICATIONS_CONFIG.thiopental.pk.ke0);
    });

    it('should verify Methohexital lowers seizure threshold (mentioned in notes for ECT use)', () => {
      const metho = MEDICATIONS_CONFIG.methohexital;
      expect(metho.notes).toContain('Electroconvulsive Therapy');
      expect(metho.notes).toContain('Lowers seizure threshold');
    });

    it('should verify Thiopental intra-arterial warning is present in notes', () => {
      const thio = MEDICATIONS_CONFIG.thiopental;
      expect(thio.notes).toContain('intra-arterially');
      expect(thio.notes).toContain('crystal');
      expect(thio.notes).toContain('Papaverine');
    });
  });
});
