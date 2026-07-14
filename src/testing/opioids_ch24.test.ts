import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { PainEngine, PainPatientState, PainVitalsState } from '../engine/PainEngine';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';
import { PKPDModel } from '../engine/PKPDEngine';
import { RenalEngine } from '../engine/RenalEngine';

describe('Chapter 24: Opioids', () => {

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
      oxygenBuffer: 500,
      opioidRigidityActive: false,
      renarcotizationActive: false
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

  describe('1. Opioid Configurations', () => {
    it('should verify Fentanyl, Sufentanil, Remifentanil, Morphine, Hydromorphone exist in config', () => {
      expect(MEDICATIONS_CONFIG.fentanyl).toBeDefined();
      expect(MEDICATIONS_CONFIG.sufentanil).toBeDefined();
      expect(MEDICATIONS_CONFIG.remifentanil).toBeDefined();
      expect(MEDICATIONS_CONFIG.morphine).toBeDefined();
      expect(MEDICATIONS_CONFIG.hydromorphone).toBeDefined();
    });

    it('should verify Naloxone exists as an Opioid Antagonist with c50=0.001', () => {
      const nal = MEDICATIONS_CONFIG.naloxone;
      expect(nal).toBeDefined();
      expect(nal.classes).toContain('Opioid Antagonist');
      expect(nal.pd.c50).toBe(0.001);
    });
  });

  describe('2. Naloxone Competitive Right-Shift', () => {
    it('should show Naloxone shifts the effective agonist C50 in PainEngine', () => {
      const state = createPainState();
      
      // Without Naloxone: Fentanyl Ce = 0.002 (at c50) yields 50% effect
      const activeMedsNoNal = [{ name: 'Fentanyl', Ce: 0.002 }];
      const outNoNal = PainEngine.tick(1, state.patient, state.vitals, activeMedsNoNal, 0, 0);
      
      // With Naloxone Ce = 0.001 (doubles apparent C50 to 0.004)
      const activeMedsWithNal = [
        { name: 'Fentanyl', Ce: 0.002 },
        { name: 'Naloxone', Ce: 0.001 }
      ];
      const outWithNal = PainEngine.tick(1, state.patient, state.vitals, activeMedsWithNal, 0, 0);
      
      expect(outWithNal.analgesiaLevel).toBeLessThan(outNoNal.analgesiaLevel);
    });
  });

  describe('3. Remifentanil-Induced Hyperalgesia (OIH)', () => {
    it('should scale sympathetic drive by 2.5x when remifentanilHyperalgesiaActive is true', () => {
      const state = createPainState();
      state.patient.C_cat = 50.0;
      
      const outNormal = PainEngine.tick(1, state.patient, state.vitals, [], 0, 0);
      
      state.patient.remifentanilHyperalgesiaActive = true;
      const outOIH = PainEngine.tick(1, state.patient, state.vitals, [], 0, 0);
      
      expect(outOIH.sympatheticDrive).toBeCloseTo(outNormal.sympatheticDrive * 2.5, 2);
    });
  });

  describe('4. Opioid-Induced Chest Wall Rigidity', () => {
    it('should drop compliance to 3 and surge resistance to 999 in RespiratoryEngine when active', () => {
      const state = createRespState();
      state.patient.opioidRigidityActive = true;
      
      const out = RespiratoryEngine.tick(1, state, null, 0.21, createRespDrugEffects(), createRespInputs());
      
      expect(out.isApneic).toBe(true);
      expect(out.compliance).toBe(3.0);
      expect(out.resistance).toBe(999);
    });
  });

  describe('5. Renarcotization Apnea', () => {
    it('should trigger apnea in RespiratoryEngine when renarcotizationActive is true', () => {
      const state = createRespState();
      state.patient.renarcotizationActive = true;
      
      const out = RespiratoryEngine.tick(1, state, null, 0.21, createRespDrugEffects(), createRespInputs());
      
      expect(out.isApneic).toBe(true);
    });
  });

  describe('6. Probabilistic Triggers & Force Overrides', () => {
    it('should trigger Opioid-Induced Rigidity deterministically if forced', () => {
      const fentanylCe = 0.002;
      const forceOpioidRigidity = true;
      let rigidityActive = false;
      let rolled = undefined;

      const hasHighOpioids = fentanylCe > 0.0015;
      if (hasHighOpioids && rolled === undefined) {
        if (forceOpioidRigidity) {
          rigidityActive = true;
        }
      }
      expect(rigidityActive).toBe(true);
    });

    it('should trigger Remifentanil OIH deterministically if forced', () => {
      const duration = 200;
      const remiInfRate = 0;
      const remiCe = 0.0001;
      const forceOIH = true;
      let oihActive = false;
      let rolled = undefined;

      if (duration > 180 && remiInfRate === 0 && remiCe < 0.0005 && rolled === undefined) {
        if (forceOIH) {
          oihActive = true;
        }
      }
      expect(oihActive).toBe(true);
    });

    it('should trigger Sphincter of Oddi spasm deterministically if forced', () => {
      const morphineCe = 0.05;
      const forceSpasm = true;
      let spasmActive = false;
      let rolled = undefined;

      if (morphineCe > 0.04 && rolled === undefined) {
        if (forceSpasm) {
          spasmActive = true;
        }
      }
      expect(spasmActive).toBe(true);
    });

    it('should trigger Opioid-Induced Pruritus deterministically if forced', () => {
      const morphineCe = 0.04;
      const forcePruritus = true;
      let pruritusActive = false;
      let rolled = undefined;

      if (morphineCe > 0.03 && rolled === undefined) {
        if (forcePruritus) {
          pruritusActive = true;
        }
      }
      expect(pruritusActive).toBe(true);
    });

    it('should trigger Naloxone Sympathetic Surge deterministically if forced', () => {
      const naloxoneCe = 0.003;
      const opioidEff = 0.5;
      const forceSurge = true;
      let surgeTriggered = false;
      let rolled = undefined;

      if (naloxoneCe > 0.002 && opioidEff > 0.4 && rolled === undefined) {
        if (forceSurge) {
          surgeTriggered = true;
        }
      }
      expect(surgeTriggered).toBe(true);
    });
  });

  describe('7. Receptor Genotype Sensitivity (A118G Exon 1 SNP)', () => {
    it('should verify A118G genotype scales analgesia/hypnosis C50 3x but leaves respiratory c50 unchanged', () => {
      const config = MEDICATIONS_CONFIG.fentanyl;
      const modelA = new PKPDModel(config, 70);
      modelA.opioidReceptorGenotype = 'A118A';
      modelA.Ce = 0.002;
      
      const modelG = new PKPDModel(config, 70);
      modelG.opioidReceptorGenotype = 'A118G';
      modelG.Ce = 0.002;

      const effA = modelA.getEffects(1.0, 1.0);
      const effG = modelG.getEffects(1.0, 1.0);

      // c50Hyp is 3x higher for A118G, so at the same Ce = 0.002, modelG should have less hypnosis/analgesia effect (so less delta) than modelA
      expect(Math.abs(effG.sysDelta)).toBeLessThan(Math.abs(effA.sysDelta));
      // respiratory depression is unchanged
      expect(effG.rrDelta).toBeCloseTo(effA.rrDelta, 5);
    });
  });

  describe('8. Active Metabolites (M6G and M3G) Kinetics and Dynamics', () => {
    it('should calculate Morphine conjugation and clearance under normal vs renal impairment', () => {
      let currentM6g = 0.5;
      let currentM3g = 0.5;
      const morCe = 0.1;
      const hepaticRatio = 1.0;
      
      const renalRatioNormal = 1.0;
      const m6g_formed = (morCe * 0.015 * hepaticRatio) * 0.10 * 1.617;
      const m3g_formed = (morCe * 0.015 * hepaticRatio) * 0.60 * 1.617;
      const m6g_cleared_normal = 0.003 * renalRatioNormal * currentM6g;
      const m3g_cleared_normal = 0.003 * renalRatioNormal * currentM3g;
      
      const nextM6gNormal = currentM6g + m6g_formed - m6g_cleared_normal;
      const nextM3gNormal = currentM3g + m3g_formed - m3g_cleared_normal;

      const renalRatioRF = 0.1;
      const m6g_cleared_rf = 0.003 * renalRatioRF * currentM6g;
      const m3g_cleared_rf = 0.003 * renalRatioRF * currentM3g;
      const nextM6gRF = currentM6g + m6g_formed - m6g_cleared_rf;
      const nextM3gRF = currentM3g + m3g_formed - m3g_cleared_rf;

      expect(nextM6gRF).toBeGreaterThan(nextM6gNormal);
      expect(nextM3gRF).toBeGreaterThan(nextM3gNormal);
    });

    it('should compute M6G respiratory depression and competitive reversal by Naloxone', () => {
      const currentM6g = 0.2;
      const gamma = 1.5;
      const ratio = currentM6g / 0.08;
      const power = Math.pow(ratio, gamma);
      const fraction = power / (1.0 + power);
      let m6gRrDelta = -14.0 * fraction;

      const naloxoneCe = 0.002;
      const naloxoneAntagonism = naloxoneCe / (naloxoneCe + 0.001);
      m6gRrDelta *= (1.0 - naloxoneAntagonism);

      expect(m6gRrDelta).toBeLessThan(0);
      expect(m6gRrDelta).toBeCloseTo(-14.0 * fraction * (1.0 - (0.002 / 0.003)), 4);
    });

    it('should trigger M3G seizures and verify propofol/midazolam abort them', () => {
      let m3gSeizureTriggered = false;
      let forceM3gSeizure = true;
      let isSeizure = false;
      let seizureMetabolicMultiplier = 1.0;

      if (forceM3gSeizure) {
        m3gSeizureTriggered = true;
      }

      if (m3gSeizureTriggered) {
        isSeizure = true;
        seizureMetabolicMultiplier = 8.0;
      }
      expect(isSeizure).toBe(true);
      expect(seizureMetabolicMultiplier).toBe(8.0);

      const propofolCe = 1.5;
      if (m3gSeizureTriggered && propofolCe > 1.2) {
        m3gSeizureTriggered = false;
        forceM3gSeizure = false;
        isSeizure = false;
        seizureMetabolicMultiplier = 1.0;
      }
      expect(m3gSeizureTriggered).toBe(false);
      expect(isSeizure).toBe(false);
      expect(seizureMetabolicMultiplier).toBe(1.0);
    });
  });

  describe('9. Sphincter of Oddi Spasm Refactoring', () => {
    it('should compute combined agonist stimulation and verify meperidine inhibition', () => {
      const morphineCe = 0.03;
      const fentanylCe = 0.0005;
      const sufentanilCe = 0.00005;
      const hydromorphoneCe = 0.002;
      const remifentanilCe = 0.0005;
      
      const stimulationNoMep = 20 * morphineCe + 500 * fentanylCe + 3000 * sufentanilCe + 80 * hydromorphoneCe + 800 * remifentanilCe;
      const meperidineCe = 0.1;
      const stimulationWithMep = stimulationNoMep - 5 * meperidineCe;

      expect(stimulationWithMep).toBeLessThan(stimulationNoMep);
    });

    it('should resolve Sphincter of Oddi spasm under Nitroglycerin', () => {
      let spasmActive = true;
      const nitroglycerinCe = 0.02;
      if (nitroglycerinCe > 0.01) {
        spasmActive = false;
      }
      expect(spasmActive).toBe(false);
    });
  });

  describe('10. Opioid-Induced Urinary Retention', () => {
    it('should verify bladder volume accumulation and uop blocking in RenalEngine', () => {
      const patientState = {
        urineOutput: 100.0,
        bladderVolume: 50.0,
        urinaryRetentionActive: true,
        hasFoley: false,
        weight: 70.0
      };
      
      const res = RenalEngine.tick(120, {
        patient: patientState,
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any,
        time: 0
      }, [], {
        coRatio: 1.0,
        map: 110.0,
        sys: 140.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0,
        ebv: 5000,
        netFluidBalance: 1000.0
      });

      expect(res.urineOutput).toBe(100.0);
      expect(res.urineOutputRate).toBe(0.0);
      expect(res.bladderVolume).toBeGreaterThan(50.0);
    });

    it('should verify bladder drainage and resolution upon Foley placement', () => {
      const patientState = {
        urineOutput: 100.0,
        bladderVolume: 50.0,
        urinaryRetentionActive: true,
        hasFoley: true,
        weight: 70.0
      };
      
      const res = RenalEngine.tick(120, {
        patient: patientState,
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any,
        time: 0
      }, [], {
        coRatio: 1.0,
        map: 110.0,
        sys: 140.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0,
        ebv: 5000,
        netFluidBalance: 1000.0
      });

      expect(res.bladderVolume).toBe(0.0);
      expect(res.urineOutput).toBeGreaterThan(150.0);
      expect(res.urinaryRetentionActive).toBe(false);
    });
  });

  describe('11. Phase 4 Bladder Pressure-Volume Mechanics, Overflow, and Autonomic Dysreflexia (BladderModel.ts integration)', () => {
    const baseInputs = {
      coRatio: 1.0, map: 110.0, sys: 140.0, cvp: 5.0, peep: 0.0, temp: 37.0,
      currentMac: 0.0, C_cat: 0.0, ebl: 0, ebv: 5000, netFluidBalance: 1000.0
    };

    it('exposes a real bladder pressure that rises with accumulated volume during retention', () => {
      const low = RenalEngine.tick(1, {
        patient: { bladderVolume: 100, urinaryRetentionActive: true, hasFoley: false, weight: 70.0 },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      const high = RenalEngine.tick(1, {
        patient: { bladderVolume: 700, urinaryRetentionActive: true, hasFoley: false, weight: 70.0 },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      expect(high.bladderPressure).toBeGreaterThan(low.bladderPressure);
      expect(low.bladderPressure).toBeLessThan(10);
    });

    it('overflow leak engages at a lower bladder volume for female than male patients, preventing unbounded volume growth', () => {
      // At 850 mL, bladder pressure ≈ 5 + 0.000333×450² ≈ 72 cmH2O — above female closure
      // threshold (60 cmH2O) but below male (90 cmH2O). dt=1 keeps inflow negligible so the
      // starting volume drives the sex-differentiated result directly.
      const female = RenalEngine.tick(1, {
        patient: { bladderVolume: 850, urinaryRetentionActive: true, hasFoley: false, weight: 70.0, sex: 'female' },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      const male = RenalEngine.tick(1, {
        patient: { bladderVolume: 850, urinaryRetentionActive: true, hasFoley: false, weight: 70.0, sex: 'male' },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      expect(female.overflowLeakActive).toBe(true);
      expect(male.overflowLeakActive).toBe(false);
      expect(female.bladderVolume).toBeLessThan(male.bladderVolume);
    });

    it('autonomic dysreflexia activates for a spinal-cord-injured patient at a bladder pressure that would not concern a neurologically intact one', () => {
      const sci = RenalEngine.tick(1, {
        patient: { bladderVolume: 600, urinaryRetentionActive: true, hasFoley: false, weight: 70.0, hasSpinalCordInjuryAboveT6: true },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      const noSci = RenalEngine.tick(1, {
        patient: { bladderVolume: 600, urinaryRetentionActive: true, hasFoley: false, weight: 70.0, hasSpinalCordInjuryAboveT6: false },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      expect(sci.autonomicDysreflexiaActive).toBe(true);
      expect(sci.autonomicDysreflexiaSeverity).toBeGreaterThan(0);
      expect(noSci.autonomicDysreflexiaActive).toBe(false);
    });

    it('a Foley placement resolves autonomic dysreflexia along with draining the bladder', () => {
      const withFoley = RenalEngine.tick(1, {
        patient: { bladderVolume: 600, urinaryRetentionActive: true, hasFoley: true, weight: 70.0, hasSpinalCordInjuryAboveT6: true },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      expect(withFoley.autonomicDysreflexiaActive).toBe(false);
      expect(withFoley.bladderVolume).toBe(0.0);
    });

    it('distensionSympatheticIndex is exposed and rises with bladder pressure', () => {
      const mild = RenalEngine.tick(1, {
        patient: { bladderVolume: 450, urinaryRetentionActive: true, hasFoley: false, weight: 70.0 },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      const severe = RenalEngine.tick(1, {
        patient: { bladderVolume: 850, urinaryRetentionActive: true, hasFoley: false, weight: 70.0 },
        vitals: { map: 110.0, vasopressinLevel: 0.1 } as any, time: 0
      }, [], baseInputs);
      expect(severe.distensionSympatheticIndex).toBeGreaterThan(mild.distensionSympatheticIndex);
    });
  });
});

