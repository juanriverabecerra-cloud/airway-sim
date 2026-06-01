import { describe, it, expect } from 'vitest';
import { PKPDModel } from '../engine/PKPDEngine';
import { GasKineticsModel } from '../engine/GasKineticsEngine';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';

describe('PK/PD & Volatile Gas Ingestion Engine Regression Tests', () => {

  describe('1. Configuration-Driven Pharmacology & Organ Impairment Decays', () => {
    it('should verify Sugammadex renal-only clearance dependency', () => {
      const sugammadexProfile = MEDICATIONS_CONFIG.sugammadex;
      expect(sugammadexProfile.pk.renalFraction).toBe(1.0);
      expect(sugammadexProfile.pk.hepaticFraction).toBe(0.0);

      // Scenario A: Normal Renal Function (renalRatio = 1.0)
      const modelNormal = new PKPDModel(sugammadexProfile, 70);
      modelNormal.giveBolus(200); // 200mg bolus
      
      // Scenario B: Severe ESRD Renal Failure (renalRatio = 0.1)
      const modelESRD = new PKPDModel(sugammadexProfile, 70);
      modelESRD.giveBolus(200);

      // Tick both for 10 minutes (600s)
      for (let t = 0; t < 600; t++) {
        modelNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0); // normal
        modelESRD.tick(1, 1.0, 1.0, 0.1, 1.0, 1.0);  // renalRatio = 0.1
      }

      // Normal GFR clearance should have eliminated significantly more drug from the body (lower total mass A1 + A2 + A3)
      const massNormal = modelNormal.A1 + modelNormal.A2 + modelNormal.A3;
      const massESRD = modelESRD.A1 + modelESRD.A2 + modelESRD.A3;

      expect(massNormal).toBeLessThan(massESRD);
    });

    it('should verify Vecuronium mixed clearance dependency (60% Hepatic, 40% Renal)', () => {
      const vecProfile = MEDICATIONS_CONFIG.vecuronium;
      expect(vecProfile.pk.renalFraction).toBe(0.4);
      expect(vecProfile.pk.hepaticFraction).toBe(0.6);

      // Scenario A: Normal organ function
      const vecNormal = new PKPDModel(vecProfile, 70);
      vecNormal.giveBolus(10); // 10mg bolus

      // Scenario B: Liver failure (hepaticRatio = 0.2, renalRatio = 1.0)
      const vecLiverFailure = new PKPDModel(vecProfile, 70);
      vecLiverFailure.giveBolus(10);

      // Scenario C: Double organ failure (hepaticRatio = 0.2, renalRatio = 0.2)
      const vecDoubleFailure = new PKPDModel(vecProfile, 70);
      vecDoubleFailure.giveBolus(10);

      // Tick all for 10 minutes
      for (let t = 0; t < 600; t++) {
        vecNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
        vecLiverFailure.tick(1, 1.0, 1.0, 1.0, 1.0, 0.2);
        vecDoubleFailure.tick(1, 1.0, 1.0, 0.2, 1.0, 0.2);
      }

      const massNormal = vecNormal.A1 + vecNormal.A2 + vecNormal.A3;
      const massLiver = vecLiverFailure.A1 + vecLiverFailure.A2 + vecLiverFailure.A3;
      const massDouble = vecDoubleFailure.A1 + vecDoubleFailure.A2 + vecDoubleFailure.A3;

      // Normal should clear fastest, double failure slowest
      expect(massNormal).toBeLessThan(massLiver);
      expect(massLiver).toBeLessThan(massDouble);
    });

    it('should verify Propofol liver-only hepatic decay', () => {
      const propofolProfile = MEDICATIONS_CONFIG.propofol;
      expect(propofolProfile.pk.hepaticFraction).toBe(1.0);
      expect(propofolProfile.pk.renalFraction).toBe(0.0);

      const propNormal = new PKPDModel(propofolProfile, 70);
      propNormal.giveBolus(150);

      const propImpaired = new PKPDModel(propofolProfile, 70);
      propImpaired.giveBolus(150);

      for (let t = 0; t < 300; t++) {
        propNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
        propImpaired.tick(1, 1.0, 1.0, 1.0, 1.0, 0.3); // Child-Pugh hepaticRatio = 0.3
      }

      const massNormal = propNormal.A1 + propNormal.A2 + propNormal.A3;
      const massImpaired = propImpaired.A1 + propImpaired.A2 + propImpaired.A3;

      expect(massNormal).toBeLessThan(massImpaired);
    });
  });

  describe('2. Sugammadex Chelation Kinetics', () => {
    it('should instantly encapsulate Rocuronium in the central compartment', () => {
      const rocProfile = MEDICATIONS_CONFIG.rocuronium;
      const rocModel = new PKPDModel(rocProfile, 70);
      rocModel.giveBolus(50); // 50mg bolus

      // Tick for 60 seconds to distribute the drug
      for (let t = 0; t < 60; t++) {
        rocModel.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }

      const initialPlasmaRoc = rocModel.A1;
      expect(initialPlasmaRoc).toBeGreaterThan(0);

      // Give Sugammadex: chelates exactly 80% of plasma Rocuronium
      rocModel.chelate(0.80);

      // Rocuronium in plasma should drop instantly by 80%
      expect(rocModel.A1).toBeCloseTo(initialPlasmaRoc * 0.20, 2);
    });
  });

  describe('3. Vasopressor / Receptor-Coupled Hemodynamic Shifts', () => {
    it('should verify Epinephrine dual Alpha/Beta receptor hemodynamic shifts', () => {
      const epiProfile = MEDICATIONS_CONFIG.epinephrine;
      const epiModel = new PKPDModel(epiProfile, 70);
      epiModel.giveBolus(1.0); // 1mg bolus (ACLS code dose)

      // Tick for 20 seconds to see effects
      let finalEffects: any = null;
      for (let t = 0; t < 20; t++) {
        finalEffects = epiModel.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }

      // Epinephrine has strong Alpha1, Beta1, and Beta2 agonist profiles
      // Should increase SVR multiplier, increase CO multiplier, and increase HR
      expect(finalEffects.svrMultiplier).toBeGreaterThan(1.0);
      expect(finalEffects.coMultiplier).toBeGreaterThan(1.0);
      expect(finalEffects.hrDelta).toBeGreaterThan(0);
    });

    it('should verify Phenylephrine selective Alpha-1 receptor hemodynamic shifts and reflex bradycardia', () => {
      const neoProfile = MEDICATIONS_CONFIG.phenylephrine;
      const neoModel = new PKPDModel(neoProfile, 70);
      neoModel.giveBolus(0.10); // 100mcg push bolus

      let finalEffects: any = null;
      for (let t = 0; t < 20; t++) {
        finalEffects = neoModel.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }

      // Phenylephrine is selective Alpha-1 (Beta1 is 0)
      // Should increase SVR multiplier significantly, but trigger reflex bradycardia (negative HR delta)
      expect(finalEffects.svrMultiplier).toBeGreaterThan(1.0);
      expect(finalEffects.coMultiplier).toBe(1.0); // no Beta1 inotropic effect
      expect(finalEffects.hrDelta).toBeLessThan(0); // reflex bradycardia
    });
  });

  describe('4. Anesthetic Gas VRG Brain Uptake delays', () => {
    it('should verify that brain volatile concentration Fb lags alveolar concentration Fa', () => {
      const sevoAgent = {
        name: 'Sevoflurane',
        mac40: 2.0,
        bgPartition: 0.65,
        brainBgPartition: 1.7
      };

      const sevoModel = new GasKineticsModel(sevoAgent);
      sevoModel.setDial(2.0); // 2.0% Sevoflurane inspired

      // Tick second-by-second for 180 seconds
      let faHistory: number[] = [];
      let fbHistory: number[] = [];

      for (let sec = 1; sec <= 180; sec++) {
        const out = sevoModel.tick(1, 4.0, 5.0, 3.0, 70, 0.05); // normal ventilation and CO
        faHistory.push(out.Fa);
        fbHistory.push(out.Fb);
      }

      // Alveolar concentration (Fa) rises extremely fast due to low solubility
      // Brain effect site concentration (Fb) must lag Fa due to tissue group uptake and BBB delays
      expect(faHistory[10]).toBeGreaterThan(fbHistory[10]);
      
      // Ultimately after 3 minutes, they should both equilibrate towards inspired dial (2.0%)
      expect(sevoModel.Fa * 100).toBeGreaterThan(1.0); // > 1% Fa Sevoflurane
      expect(sevoModel.Fb * 100).toBeGreaterThan(0.2); // brain starting to equilibrate (expected ~0.36%)
      expect(sevoModel.Fb).toBeLessThan(sevoModel.Fa);  // Fb always lags Fa during induction phase
    });
  });
});
