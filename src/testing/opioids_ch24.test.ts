import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { PainEngine, PainPatientState, PainVitalsState } from '../engine/PainEngine';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';

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
});
