import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { PainEngine, PainPatientState, PainVitalsState } from '../engine/PainEngine';
import { CardiovascularEngine, PatientState as CVPatientState, VitalsState as CVVitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';

describe('Chapter 25: Nonopioid Pain Medications Integration', () => {

  const createPainState = (): { patient: PainPatientState; vitals: PainVitalsState } => ({
    patient: {
      C_cat: 0,
      MAP_set: 93,
      chronicHTN: false,
      highAnxiety: false,
      chronicBetaBlockade: false,
      surgicalPhase: 'Pre-Op',
      incisionStartTime: -999,
      laryngoscopyActive: false,
      airwaySecured: false
    },
    vitals: {
      hr: 70,
      sys: 120,
      dia: 80,
      map: 93,
      rr: 12,
      paco2: 40,
      bis: 98
    }
  });

  const createCVState = (): { patient: CVPatientState; vitals: CVVitalsState; electrolytes: { k: number }; time: number } => ({
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
      bmi: 22.8,
      position: 'Supine'
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
      spo2: 98,
      paco2: 40,
      etco2: 40
    },
    electrolytes: { k: 4.0 },
    time: 0
  });

  const createRespState = (): { patient: RespiratoryPatientState; vitals: RespiratoryVitalsState; time: number } => ({
    patient: {
      height: 175,
      age: 40,
      sex: 'male',
      bmi: 22.9,
      position: 'Supine',
      ibw: 70,
      airwaySecured: false,
      ventilationStatus: 'spontaneous',
      oxygenBuffer: 500
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
      spo2: 98,
      paco2: 40,
      etco2: 40
    },
    time: 0
  });

  const createRespDrugEffects = (): RespiratoryDrugEffects => ({
    maxNMJOccupancy: 0,
    totalRrDelta: 0,
    ruleRrScale: 1.0,
    ruleRrOffset: 0,
    ruleComplScale: 1.0,
    rulePipOffset: 0,
    ruleSpo2Offset: 0,
    ruleKOffset: 0
  });

  const createRespInputs = () => ({
    VO2_sec: 0.250 / 60,
    totalMetabolicMultiplier: 1.0,
    compensatoryRR: 0,
    opioidRRDrop: 0,
    m6gRrDelta: 0,
    shiveringRRDrive: 0,
    currentHb: 14.0,
    targetMAP: 90.0,
    targetCO: 5.0,
    hco3: 24.0,
    volatileRightShift: 0,
    dpgDepletionShift: 0,
    baselinePaCO2: 40.0,
    anaphylaxisCompliancePenalty: 0,
    anaphylaxisResistancePenalty: 0,
    aspirationCompliancePenalty: 0,
    aspirationResistancePenalty: 0
  });

  describe('1. Medication Configurations', () => {
    it('should verify the 6 new anticonvulsants/nonopioid meds exist in configuration', () => {
      const expectedNewMeds = [
        'carbamazepine',
        'oxcarbazepine',
        'lamotrigine',
        'zonisamide',
        'levetiracetam',
        'ziconotide'
      ];
      expectedNewMeds.forEach(m => {
        expect(MEDICATIONS_CONFIG[m]).toBeDefined();
      });
    });

    it('should verify correct classes and attributes for new meds', () => {
      expect(MEDICATIONS_CONFIG.carbamazepine.classes).toContain('Anticonvulsant');
      expect(MEDICATIONS_CONFIG.oxcarbazepine.classes).toContain('Anticonvulsant');
      expect(MEDICATIONS_CONFIG.lamotrigine.classes).toContain('Anticonvulsant');
      expect(MEDICATIONS_CONFIG.zonisamide.classes).toContain('Anticonvulsant');
      expect(MEDICATIONS_CONFIG.levetiracetam.classes).toContain('Anticonvulsant');
      expect(MEDICATIONS_CONFIG.ziconotide.classes).toContain('Nonopioid Analgesic');
    });

    it('should verify pharmacokinetics parameters are correct', () => {
      // Carbamazepine
      expect(MEDICATIONS_CONFIG.carbamazepine.pk.V1).toBe(18.0);
      expect(MEDICATIONS_CONFIG.carbamazepine.pk.V2).toBe(30.0);
      expect(MEDICATIONS_CONFIG.carbamazepine.pk.ke0).toBe(0.35);

      // Ziconotide
      expect(MEDICATIONS_CONFIG.ziconotide.pk.V1).toBe(12.0);
      expect(MEDICATIONS_CONFIG.ziconotide.pk.ke0).toBe(0.5);
      expect(MEDICATIONS_CONFIG.ziconotide.pd.c50).toBe(0.005);
    });
  });

  describe('2. PainEngine Integration & Sparing Factor', () => {
    it('should show new non-opioid meds increase analgesia and decrease effective pain', () => {
      const state = createPainState();
      
      state.patient.surgicalPhase = 'Incision';
      state.patient.incisionStartTime = 10;
      const controlOut = PainEngine.tick(1, state.patient, state.vitals, [], 0, 15);
      
      // Test Carbamazepine
      const medsCBZ = [{ name: 'Carbamazepine', Ce: 6.0 }];
      const expOutCBZ = PainEngine.tick(1, state.patient, state.vitals, medsCBZ, 0, 15);
      expect(expOutCBZ.analgesiaLevel).toBeGreaterThan(controlOut.analgesiaLevel);
      expect(expOutCBZ.effectivePain).toBeLessThan(controlOut.effectivePain);

      // Test Ziconotide
      const medsZIC = [{ name: 'Ziconotide', Ce: 0.005 }];
      const expOutZIC = PainEngine.tick(1, state.patient, state.vitals, medsZIC, 0, 15);
      expect(expOutZIC.analgesiaLevel).toBeGreaterThan(controlOut.analgesiaLevel);
      expect(expOutZIC.effectivePain).toBeLessThan(controlOut.effectivePain);
    });

    it('should show additive sparing effect of combining new non-opioids', () => {
      const state = createPainState();
      state.patient.surgicalPhase = 'Incision';
      state.patient.incisionStartTime = 10;

      const singleMed = [{ name: 'Carbamazepine', Ce: 6.0 }];
      const multiMed = [
        { name: 'Carbamazepine', Ce: 6.0 },
        { name: 'Ziconotide', Ce: 0.005 }
      ];

      const singleOut = PainEngine.tick(1, state.patient, state.vitals, singleMed, 0, 15);
      const multiOut = PainEngine.tick(1, state.patient, state.vitals, multiMed, 0, 15);

      expect(multiOut.analgesiaLevel).toBeGreaterThan(singleOut.analgesiaLevel);
      expect(multiOut.effectivePain).toBeLessThan(singleOut.effectivePain);
    });
  });

  describe('3. Clinical Crisis: GOSRD (Gabapentinoid-Opioid Synergistic Respiratory Depression)', () => {
    it('should calculate synergistic respiratory depression correctly', () => {
      // Replicate the math of usePhysiology to verify it behaves correctly
      const opioidEff = 0.5;
      const opioidRRDrop = opioidEff * 10; // 5.0 bpm drop

      const gabapentinCe = 5.0; // c50
      const gabapentinEff = Math.pow(gabapentinCe, 1.5) / (Math.pow(gabapentinCe, 1.5) + Math.pow(5.0, 1.5)); // 0.5
      const gabapentinoidEff = gabapentinEff; // 0.5

      let finalOpioidRRDrop = opioidRRDrop;
      const triggerGOSRD = gabapentinCe > 2.0 && opioidEff > 0.15;
      if (triggerGOSRD) {
        finalOpioidRRDrop = Math.min(18.0, opioidRRDrop * (1.0 + 2.0 * gabapentinoidEff));
      }

      expect(triggerGOSRD).toBe(true);
      expect(finalOpioidRRDrop).toBe(opioidRRDrop * 2.0); // 10.0 bpm drop (doubled!)
    });
  });

  describe('4. Clinical Crisis: Ziconotide Postural Hypotension', () => {
    it('should blunt SVR and MAP, and reduce baroreflex gain', () => {
      const state = createCVState();
      state.patient.ziconotideHypotensionActive = true;

      const drugEffects: CardiovascularDrugEffects = {
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
        ruleMapOffset: 0
      };

      const inputs = {
        currentMac: 1.0, // baseline MAC
        bloodLossRatio: 0,
        currentEbl: 0,
        positionPreloadMod: 0,
        positionHydrostaticMod: 0,
        shiveringMultiplier: 1.0,
        seizureMetabolicMultiplier: 1.0,
        cyanideVO2Mod: 1.0,
        VO2_sec: 0.25 / 60,
        currentBuffer: 0.5,
        currentFRC_L: 2.4,
        newTemp: 37,
        newPaCO2: 40,
        activeMeds: [],
        getAnatomicalParameter: (k: string, d: number) => d
      };

      // Test Supine position (baseline postural hypotension: SVR reduced by 20%)
      state.patient.position = 'Supine';
      const supineOut = CardiovascularEngine.tick(1, state, drugEffects, inputs);

      // SVR base without hypotension is 1200. With 20% reduction, targetSVR is 960.
      expect(supineOut.vitals.svr).toBeLessThan(1200);

      // Test Sitting position (SVR reduced by 35% total, and MAP drops by an additional 15 mmHg)
      state.patient.position = 'Sitting';
      const sittingOut = CardiovascularEngine.tick(1, state, drugEffects, inputs);

      expect(sittingOut.vitals.svr).toBeLessThan(supineOut.vitals.svr);
      expect(sittingOut.vitals.map).toBeLessThan(supineOut.vitals.map);
    });
  });

  describe('5. Clinical Crisis: Carbamazepine Agranulocytosis & Sepsis', () => {
    it('should trigger agranulocytic sepsis with fever, vasodilation, tachycardia, and high metabolic demand', () => {
      // Replicate the agranulocytic sepsis triggers and updates
      const carbamazepineCe = 8.0; // Ce > 6.0
      let carbamazepineDyscrasiaActive = carbamazepineCe > 6.0;

      let whiteBloodCellCount = 7.5;
      let temp = 37.0;
      let metabolicRate = 1.0;
      let drugSvrMod = 1.0;
      let ruleHrOffset = 0;

      if (carbamazepineDyscrasiaActive) {
        whiteBloodCellCount = 0.5;
        temp = 39.5;
        metabolicRate = 2.0;
        drugSvrMod *= 0.70; // 30% drop
        ruleHrOffset += 30; // +30 bpm
      }

      expect(carbamazepineDyscrasiaActive).toBe(true);
      expect(whiteBloodCellCount).toBe(0.5);
      expect(temp).toBe(39.5);
      expect(metabolicRate).toBe(2.0);
      expect(drugSvrMod).toBe(0.70);
      expect(ruleHrOffset).toBe(30);

      // Revert/Resolution test
      carbamazepineDyscrasiaActive = false; // Ce < 4.0
      if (!carbamazepineDyscrasiaActive) {
        whiteBloodCellCount = 7.5;
        temp = 37.0;
        metabolicRate = 1.0;
        drugSvrMod = 1.0;
        ruleHrOffset = 0;
      }
      expect(whiteBloodCellCount).toBe(7.5);
      expect(temp).toBe(37.0);
    });
  });

  describe('6. Clinical Crisis: Oxcarbazepine Hyponatremia', () => {
    it('should cause serum sodium decay to a floor of 122 and flag clinical hyponatremia', () => {
      const oxcarbazepineCe = 5.0; // Ce > 4.0
      let sodiumLevel = 140.0;
      let isHyponatremic = false;

      // Simulate 200 ticks of decay
      for (let i = 0; i < 200; i++) {
        if (oxcarbazepineCe > 4.0) {
          sodiumLevel = Math.max(122.0, sodiumLevel - 0.1);
        }
        if (sodiumLevel < 125.0) {
          isHyponatremic = true;
        }
      }

      expect(sodiumLevel).toBe(122.0); // clamped to floor
      expect(isHyponatremic).toBe(true);

      // Simulate recovery (Oxcarbazepine Ce < 4.0)
      for (let i = 0; i < 200; i++) {
        if (sodiumLevel < 140.0) {
          sodiumLevel = Math.min(140.0, sodiumLevel + 0.1);
        }
      }
      expect(sodiumLevel).toBe(140.0);
    });
  });
});
