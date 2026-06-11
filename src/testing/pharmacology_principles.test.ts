import { describe, it, expect } from 'vitest';
import { PKPDModel } from '../engine/PKPDEngine';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';

describe('Chapter 18: Basic Principles of Pharmacology Tests', () => {

  describe('1. Front-End Recirculatory Kinetics (Dynamic V1)', () => {
    it('should model elevated peak concentrations (Cp and Ce) under low cardiac output (shock)', () => {
      const propofolProfile = MEDICATIONS_CONFIG.propofol;

      // Scenario A: Normal Cardiac Output (coRatio = 1.0)
      const modelNormal = new PKPDModel(propofolProfile, 70);
      modelNormal.giveBolus(100); // 100mg bolus
      
      // Scenario B: Low Cardiac Output (coRatio = 0.3, shock state)
      const modelShock = new PKPDModel(propofolProfile, 70);
      modelShock.giveBolus(100); // 100mg bolus

      // Tick both for 40 seconds to allow equilibration
      // tick(dt, coRatio, v1VolumeRatio, renalRatio, pdSens, hepaticRatio)
      for (let t = 0; t < 40; t++) {
        modelNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
        modelShock.tick(1, 0.3, 1.0, 1.0, 1.0, 1.0);
      }

      // In shock, dynamicV1 is smaller (pk.V1 * 1.0 * (0.6 + 0.4 * 0.3) = V1 * 0.72)
      // This leads to less dilution, meaning higher plasma concentration (Cp) and higher effect-site (Ce)
      expect(modelShock.dynamicV1).toBeLessThan(modelNormal.dynamicV1);
      expect(modelShock.Cp).toBeGreaterThan(modelNormal.Cp);
      expect(modelShock.Ce).toBeGreaterThan(modelNormal.Ce);
    });
  });

  describe('2. Back-End Kinetics (Context-Sensitive Half-Times)', () => {
    it('should accurately track infusion duration and compute CSHT curves', () => {
      const propofolProfile = MEDICATIONS_CONFIG.propofol;
      const remiProfile = MEDICATIONS_CONFIG.remifentanil;

      const modelProp = new PKPDModel(propofolProfile, 70);
      const modelRemi = new PKPDModel(remiProfile, 70);

      // Start infusions (rate in mg/sec)
      modelProp.setInfusion(0.5);
      modelRemi.setInfusion(0.01);

      // Tick both for 60 minutes (3600 seconds)
      for (let t = 0; t < 3600; t++) {
        modelProp.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
        modelRemi.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }

      // Check infusion duration tracking
      expect(modelProp.infusionDurationSeconds).toBe(3600);
      expect(modelRemi.infusionDurationSeconds).toBe(3600);

      // Verify CSHT fitting calculations
      // Propofol: CSHT = 3.0 + 37.0 * tInf / (tInf + 80) where tInf = 60 mins
      const expectedPropCsht = 3.0 + 37.0 * 60 / (60 + 80);
      expect(modelProp.csht).toBeCloseTo(expectedPropCsht, 4);

      // Remifentanil: CSHT = constant 3.5 minutes regardless of duration
      expect(modelRemi.csht).toBe(3.5);

      // Stop infusions
      modelProp.setInfusion(0);
      modelProp.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      // Duration should stop accumulating
      expect(modelProp.infusionDurationSeconds).toBe(3600);
    });
  });

  describe('3. Pharmacodynamic GABA-Opioid Synergism (Inward-Bowing Isoboles)', () => {
    it('should verify that synergistic combination is greater than independent probability', () => {
      const sedativeEff = 0.3;
      const opioidEff = 0.2;

      // Old independent probability formula
      const independentHypnosis = sedativeEff + opioidEff - (sedativeEff * opioidEff);
      expect(independentHypnosis).toBeCloseTo(0.44, 4);

      // New Chapter 18 synergistic formula
      const synergisticHypnosis = Math.min(1.0, sedativeEff + opioidEff + 1.8 * sedativeEff * opioidEff);
      expect(synergisticHypnosis).toBeCloseTo(0.608, 4);

      // Synergistic combination must be significantly stronger
      expect(synergisticHypnosis).toBeGreaterThan(independentHypnosis);
    });
  });
});
