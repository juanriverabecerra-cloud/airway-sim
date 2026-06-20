import { describe, it, expect } from 'vitest';
import { 
  calculateHumeLBM, 
  calculateJanmahasatianFFM, 
  calculateCBW, 
  calculateMFFM, 
  calculatePKM 
} from '../engine/Pharmacology';
import { PKPDModel } from '../engine/PKPDEngine';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { resolveDosingWeight } from '../engine/usePhysiology';

describe('Chapter 18: Basic Principles of Pharmacology Integration Tests', () => {

  describe('1. Body Habitus Dosing Weight Calculations', () => {
    it('should correctly calculate Hume Lean Body Mass (LBM) for male and female', () => {
      // Hume LBM function in Pharmacology.js implements the James formula
      const height = 175;
      const weight = 90;
      
      const lbmMale = calculateHumeLBM(height, weight, 'male');
      const expectedMale = 1.10 * weight - 128.0 * Math.pow(weight / height, 2);
      expect(lbmMale).toBeCloseTo(expectedMale, 4);

      const lbmFemale = calculateHumeLBM(height, weight, 'female');
      const expectedFemale = 1.07 * weight - 148.0 * Math.pow(weight / height, 2);
      expect(lbmFemale).toBeCloseTo(expectedFemale, 4);
    });

    it('should correctly calculate Janmahasatian Fat-Free Mass (FFM)', () => {
      // Janmahasatian formula (denominator female has 8780 in codebase)
      const height = 180;
      const weight = 100;
      const bmi = weight / Math.pow(height / 100, 2);

      const ffmMale = calculateJanmahasatianFFM(height, weight, 'male');
      const expectedMale = (9.27e3 * weight) / (6.68e3 + 216 * bmi);
      expect(ffmMale).toBeCloseTo(expectedMale, 4);

      const ffmFemale = calculateJanmahasatianFFM(height, weight, 'female');
      const expectedFemale = (9.27e3 * weight) / (8.78e3 + 244 * bmi);
      expect(ffmFemale).toBeCloseTo(expectedFemale, 4);
    });

    it('should correctly calculate Corrected Body Weight (CBW)', () => {
      // CBW = IBW + 0.4 * (TBW - IBW)
      const height = 170;
      const weight = 100;
      const ibwMale = 50 + 2.3 * ((height / 2.54) - 60);
      const cbwMale = calculateCBW(height, weight, 'male');
      const expectedCBW = ibwMale + 0.4 * (weight - ibwMale);
      expect(cbwMale).toBeCloseTo(expectedCBW, 4);
    });

    it('should correctly calculate Modified Fat-Free Mass (MFFM)', () => {
      // MFFM in codebase is: ffm + 0.4 * (weight - ffm)
      const height = 175;
      const weight = 95;
      const ffm = calculateJanmahasatianFFM(height, weight, 'male');
      const mffm = calculateMFFM(height, weight, 'male');
      const expectedMffm = ffm + 0.4 * (weight - ffm);
      expect(mffm).toBeCloseTo(expectedMffm, 4);
    });

    it('should correctly calculate Pharmacokinetic Mass (PKM)', () => {
      // PKM in codebase implements the Fentanyl PK mass formula
      const weight = 120;
      const pkm = calculatePKM(weight);
      const expTerm = Math.exp(-0.025 * weight);
      const fraction = (196.4 * expTerm - 53.66) / 100.0;
      const expectedPkm = 52.0 / (1.0 + fraction);
      expect(pkm).toBeCloseTo(expectedPkm, 4);
    });
  });

  describe('2. Dynamic Weight-Based Dosing Resolution', () => {
    it('should resolve dosing weight for Propofol bolus and infusion correctly', () => {
      const patientLean = { weight: 70, height: 180, ibw: 75, lbw: 62, lbm: 60, ffm: 61, cbw: 73, mffm: 61, pkm: 74 };
      const patientObese = { weight: 110, height: 170, ibw: 65, lbw: 55, lbm: 54, ffm: 53, cbw: 83, mffm: 54, pkm: 72 };
      
      const propofolData = MEDICATIONS_CONFIG.propofol;

      // Bolus should use LBM (Hume)
      expect(resolveDosingWeight(propofolData, 'Bolus', patientLean)).toBe(60);
      expect(resolveDosingWeight(propofolData, 'Bolus', patientObese)).toBe(54);

      // Infusion should use CBW for obese (BMI >= 30), TBW for lean
      expect(resolveDosingWeight(propofolData, 'Infusion', patientLean)).toBe(70);
      expect(resolveDosingWeight(propofolData, 'Infusion', patientObese)).toBe(83); // CBW for obese
    });

    it('should resolve dosing weight for Remifentanil correctly', () => {
      const patient = { weight: 95, height: 180, ibw: 75, lbw: 65, lbm: 64, ffm: 63, cbw: 83, mffm: 64, pkm: 78 };
      const remiData = MEDICATIONS_CONFIG.remifentanil;

      // Bolus -> TBW
      expect(resolveDosingWeight(remiData, 'Bolus', patient)).toBe(95);
      // Infusion -> IBW
      expect(resolveDosingWeight(remiData, 'Infusion', patient)).toBe(75);
    });

    it('should resolve dosing weight for Fentanyl correctly', () => {
      const patient = { weight: 95, height: 180, ibw: 75, lbw: 65, lbm: 64, ffm: 63, cbw: 83, mffm: 64, pkm: 78 };
      const fentanylData = MEDICATIONS_CONFIG.fentanyl;

      // Fentanyl -> PKM regardless of type
      expect(resolveDosingWeight(fentanylData, 'Bolus', patient)).toBe(78);
      expect(resolveDosingWeight(fentanylData, 'Infusion', patient)).toBe(78);
    });
  });

  describe('3. Minto Pharmacokinetic Model for Remifentanil', () => {
    it('should scale parameters for Remifentanil according to Minto model equations', () => {
      const remiProfile = MEDICATIONS_CONFIG.remifentanil;
      const model = new PKPDModel(remiProfile, 80);
      
      const patient = { age: 30, height: 175, sex: 'male', opioidToleranceMultiplier: 1.0 };
      model.updateModelParameters('Minto', patient);

      // Verify that Minto parameters are calculated based on age and LBM
      // James LBM for 80kg, 175cm male:
      const expectedLbm = 1.10 * 80 - 128.0 * Math.pow(80 / 175, 2);
      
      // V1 = 5.1 - 0.0201*(age - 40) + 0.072*(lbm - 55)
      const expectedV1 = 5.1 - 0.0201 * (30 - 40) + 0.072 * (expectedLbm - 55);
      expect(model.pk.V1).toBeCloseTo(expectedV1, 4);

      // ke0 = 0.595 - 0.007*(age - 40)
      const expectedKe0 = 0.595 - 0.007 * (30 - 40);
      expect(model.pk.ke0).toBeCloseTo(expectedKe0, 4);
    });
  });

  describe('4. Context-Sensitive Decrement Times (CSDT80)', () => {
    it('should dynamically update 80% decrement times based on infusion duration', () => {
      const propofolProfile = MEDICATIONS_CONFIG.propofol;
      const modelProp = new PKPDModel(propofolProfile, 70);

      // Start infusion
      modelProp.setInfusion(0.5);
      
      // Tick 10 minutes
      for (let t = 0; t < 600; t++) {
        modelProp.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      const tInf10 = 10;
      const expectedCsdt80_10 = 10.0 + 120.0 * tInf10 / (tInf10 + 90.0);
      expect(modelProp.csdt80).toBeCloseTo(expectedCsdt80_10, 4);

      // Tick another 50 minutes (total 60 mins)
      for (let t = 0; t < 3000; t++) {
        modelProp.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      const tInf60 = 60;
      const expectedCsdt80_60 = 10.0 + 120.0 * tInf60 / (tInf60 + 90.0);
      expect(modelProp.csdt80).toBeCloseTo(expectedCsdt80_60, 4);

      // Remifentanil should maintain a constant 9.0 min CSDT80
      const remiProfile = MEDICATIONS_CONFIG.remifentanil;
      const modelRemi = new PKPDModel(remiProfile, 70);
      modelRemi.setInfusion(0.01);
      modelRemi.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      expect(modelRemi.csdt80).toBe(9.0);
    });
  });

  describe('5. Age-Dependent PD Sensitivity Modifier', () => {
    it('should scale effect sensitivity based on age for Sedatives and Opioids', () => {
      const propofolProfile = MEDICATIONS_CONFIG.propofol;
      
      const modelYoung = new PKPDModel(propofolProfile, 70);
      modelYoung.updateModelParameters('Schnider', { age: 20 });
      modelYoung.Ce = 2.0;
      const effectsYoung = modelYoung.getEffects(1.0);

      const modelOld = new PKPDModel(propofolProfile, 70);
      modelOld.updateModelParameters('Schnider', { age: 80 });
      modelOld.Ce = 2.0;
      const effectsOld = modelOld.getEffects(1.0);

      // Elder patients are more sensitive (higher hypnotic effect for the same Ce)
      expect(effectsOld.hypnoticEffect).toBeGreaterThan(effectsYoung.hypnoticEffect);
    });
  });
});
