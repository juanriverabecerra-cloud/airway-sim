import { describe, it, expect } from 'vitest';
import { 
  calculateIBW, 
  calculateLBW, 
  calculateAgeAdjustedMAC, 
  calculateLungVolumes 
} from '../engine/Pharmacology';
import { PKPDModel } from '../engine/PKPDEngine';

describe('Pharmacology Core Mathematical and Clinical Guards', () => {
  describe('calculateIBW boundary and type guards', () => {
    it('should calculate correct IBW for normal inputs', () => {
      // 175 cm male: h = (175/2.54) - 60 = 8.8976. IBW = 50 + 2.3 * 8.8976 = 70.46
      expect(calculateIBW(175, 'male')).toBeCloseTo(70.46, 1);
      // 160 cm female: h = (160/2.54) - 60 = 2.992. IBW = 45.5 + 2.3 * 2.992 = 52.38
      expect(calculateIBW(160, 'female')).toBeCloseTo(52.38, 1);
    });

    it('should handle zero, negative, NaN, or malformed height inputs gracefully', () => {
      // Malformed height should fallback to 170cm adult standard: h = (170/2.54) - 60 = 6.929. IBW = 50 + 2.3 * 6.929 = 65.9
      const defaultMaleIBW = calculateIBW(170, 'male');
      expect(calculateIBW(0, 'male')).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW(-50, 'male')).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW(NaN, 'male')).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW(undefined, 'male')).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW('not-a-number', 'male')).toBeCloseTo(defaultMaleIBW, 2);
    });

    it('should clamp extremely tall or short heights safely', () => {
      // Height clamped to min of 50cm
      const minHeightIBW = calculateIBW(10, 'male');
      expect(minHeightIBW).toBe(calculateIBW(50, 'male'));

      // Height clamped to max of 250cm
      const maxHeightIBW = calculateIBW(400, 'male');
      expect(maxHeightIBW).toBe(calculateIBW(250, 'male'));
    });

    it('should handle malformed, missing, or non-string sex inputs gracefully', () => {
      const defaultMaleIBW = calculateIBW(175, 'male');
      expect(calculateIBW(175, null)).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW(175, undefined)).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW(175, 'InvalidSexString')).toBeCloseTo(defaultMaleIBW, 2);
      expect(calculateIBW(175, 123)).toBeCloseTo(defaultMaleIBW, 2);
    });
  });

  describe('calculateLBW boundary and type guards', () => {
    it('should calculate correct LBW for normal inputs', () => {
      // Janmahasatian formula checks
      const normalLBWMale = calculateLBW(175, 75, 'male');
      expect(normalLBWMale).toBeGreaterThan(30);
      expect(normalLBWMale).toBeLessThan(75);

      const normalLBWFemale = calculateLBW(160, 60, 'female');
      expect(normalLBWFemale).toBeGreaterThan(25);
      expect(normalLBWFemale).toBeLessThan(60);
    });

    it('should handle division by zero and malformed height/weight inputs safely without crashing', () => {
      const defaultLBWMale = calculateLBW(170, 70, 'male');
      
      expect(calculateLBW(0, 70, 'male')).toBeCloseTo(defaultLBWMale, 1);
      expect(calculateLBW(-170, 70, 'male')).toBeCloseTo(defaultLBWMale, 1);
      expect(calculateLBW(170, -70, 'male')).toBeCloseTo(defaultLBWMale, 1);
      expect(calculateLBW(NaN, NaN, 'male')).toBeCloseTo(defaultLBWMale, 1);
      expect(calculateLBW('abc', 'def', 'male')).toBeCloseTo(defaultLBWMale, 1);
    });

    it('should handle malformed sex inputs for LBW', () => {
      const maleLBW = calculateLBW(175, 75, 'male');
      expect(calculateLBW(175, 75, null)).toBeCloseTo(maleLBW, 2);
      expect(calculateLBW(175, 75, undefined)).toBeCloseTo(maleLBW, 2);
      expect(calculateLBW(175, 75, 999)).toBeCloseTo(maleLBW, 2);
    });
  });

  describe('calculateAgeAdjustedMAC boundary and type guards', () => {
    it('should calculate correct age-adjusted MAC for normal inputs', () => {
      // Sevoflurane (mac40 = 2.0) at age 40 should be 2.0
      expect(calculateAgeAdjustedMAC(2.0, 40)).toBeCloseTo(2.0, 2);
      // Older age should decrease MAC
      expect(calculateAgeAdjustedMAC(2.0, 80)).toBeLessThan(2.0);
      // Younger age should increase MAC
      expect(calculateAgeAdjustedMAC(2.0, 20)).toBeGreaterThan(2.0);
    });

    it('should handle zero, negative, NaN, or malformed age/MAC inputs safely', () => {
      const defaultMAC40 = calculateAgeAdjustedMAC(2.0, 40);
      
      expect(calculateAgeAdjustedMAC(2.0, -10)).toBeDefined();
      expect(calculateAgeAdjustedMAC(2.0, NaN)).toBeCloseTo(defaultMAC40, 2);
      expect(calculateAgeAdjustedMAC(2.0, 'invalid')).toBeCloseTo(defaultMAC40, 2);
      expect(calculateAgeAdjustedMAC(NaN, 40)).toBeDefined();
    });
  });

  describe('calculateLungVolumes boundary and type guards', () => {
    it('should calculate correct lung volumes for normal inputs', () => {
      const vols = calculateLungVolumes(175, 40, 'male', 24.0, 'Supine');
      expect(vols.frc_mL).toBeGreaterThan(500);
      expect(vols.tlc_mL).toBeGreaterThan(vols.frc_mL);
      expect(vols.fev1FvcRatio).toBeGreaterThan(50);
    });

    it('should handle malformed, invalid, or extreme inputs safely without generating NaN', () => {
      const vols = calculateLungVolumes(0, -10, null, 'invalid-bmi', undefined, true, false);
      expect(vols.frc_mL).toBeDefined();
      expect(vols.tlc_mL).toBeDefined();
      expect(isNaN(vols.frc_mL)).toBe(false);
      expect(isNaN(vols.tlc_mL)).toBe(false);
      expect(vols.frc_mL).toBeGreaterThan(0);
      expect(vols.tlc_mL).toBeGreaterThan(0);
    });
  });

  describe('PKPDModel numerical and input guards', () => {
    it('should handle invalid boluses and infusions safely', () => {
      const propofolConfig = {
        name: 'Propofol',
        classes: ['Sedative', 'Hypnotic'],
        pk: { V1: 4.27, V2: 18.9, V3: 238, k10: 0.443, k12: 0.303, k21: 0.055, k13: 0.196, k31: 0.0033, ke0: 1.2, coSensitivity: 0.6 },
        pd: { c50: 2.5, gamma: 2, sysMax: -24, diaMax: -18, hrMax: -2, rrMax: -14, inducesApneaAtCe: 2.5 }
      };
      
      const model = new PKPDModel(propofolConfig, 70);
      
      // Invalid bolus
      model.giveBolus(-50);
      expect(model.A1).toBe(0);
      model.giveBolus(NaN);
      expect(model.A1).toBe(0);
      
      // Valid bolus
      model.giveBolus(150);
      expect(model.A1).toBe(150);

      // Invalid infusion
      model.setInfusion(-10);
      expect(model.currentInfusionRate).toBe(0);
      model.setInfusion(NaN);
      expect(model.currentInfusionRate).toBe(0);
      
      // Valid infusion
      model.setInfusion(0.5);
      expect(model.currentInfusionRate).toBe(0.5);
    });

    it('should handle tick parameter anomalies safely', () => {
      const propofolConfig = {
        name: 'Propofol',
        classes: ['Sedative', 'Hypnotic'],
        pk: { V1: 4.27, V2: 18.9, V3: 238, k10: 0.443, k12: 0.303, k21: 0.055, k13: 0.196, k31: 0.0033, ke0: 1.2, coSensitivity: 0.6 },
        pd: { c50: 2.5, gamma: 2, sysMax: -24, diaMax: -18, hrMax: -2, rrMax: -14, inducesApneaAtCe: 2.5 }
      };

      const model = new PKPDModel(propofolConfig, 70);
      model.giveBolus(150);
      
      // Tick with various NaN/negative parameters
      const effects = model.tick(NaN, -1, NaN, -2, NaN, -3);
      
      expect(effects).toBeDefined();
      expect(isNaN(effects.hypnoticEffect)).toBe(false);
      expect(effects.hypnoticEffect).toBeGreaterThanOrEqual(0);
      expect(effects.hypnoticEffect).toBeLessThanOrEqual(1.0);
      
      // Compartments should remain finite and valid
      expect(isNaN(model.A1)).toBe(false);
      expect(isNaN(model.A2)).toBe(false);
      expect(isNaN(model.A3)).toBe(false);
      expect(isNaN(model.Ce)).toBe(false);
    });

    it('should chelate safely with edge-case fraction inputs', () => {
      const propofolConfig = {
        name: 'Propofol',
        classes: ['Sedative', 'Hypnotic'],
        pk: { V1: 4.27, V2: 18.9, V3: 238, k10: 0.443, k12: 0.303, k21: 0.055, k13: 0.196, k31: 0.0033, ke0: 1.2, coSensitivity: 0.6 },
        pd: { c50: 2.5, gamma: 2, sysMax: -24, diaMax: -18, hrMax: -2, rrMax: -14, inducesApneaAtCe: 2.5 }
      };

      const model = new PKPDModel(propofolConfig, 70);
      model.giveBolus(100);
      
      // Chelate with NaN or negative or out-of-bounds fraction
      model.chelate(NaN);
      expect(model.A1).toBe(100);
      
      model.chelate(-0.5);
      expect(model.A1).toBe(100);
      
      model.chelate(1.5); // should clamp to 1.0 (100% chelation)
      expect(model.A1).toBe(0);
    });
  });
});
