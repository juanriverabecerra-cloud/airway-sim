import { describe, it, expect } from 'vitest';
import { PKPDModel } from '../engine/PKPDEngine';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';

describe('Chapter 26: Intravenous Drug Delivery Systems & TCI Tests', () => {

  const createPatient = (age = 40, weight = 70, height = 170, sex = 'male') => ({
    age,
    weight,
    height,
    sex,
    ibw: 70,
    lbw: 60
  });

  describe('1. Model-Specific Parameter Recalculation (Marsh, Schnider, Paedfusor, Kataria, Domino)', () => {
    it('should correctly set parameters for Propofol / Marsh model', () => {
      const propofol = new PKPDModel(MEDICATIONS_CONFIG.propofol, 70);
      const patient = createPatient();
      
      propofol.setTci('Cp', 3.0, 'Marsh', patient);
      
      expect(propofol.tciMode).toBe('Cp');
      expect(propofol.tciTarget).toBe(3.0);
      expect(propofol.tciModelName).toBe('Marsh');
      
      // Marsh clearances are weight proportional
      // V1 = 0.228 * 70 = 15.96
      expect(propofol.pk.V1).toBeCloseTo(15.96, 2);
      expect(propofol.pk.V2).toBeCloseTo(0.363 * 70, 2);
      expect(propofol.pk.V3).toBeCloseTo(2.893 * 70, 2);
      expect(propofol.pk.k10).toBe(0.119);
      expect(propofol.pk.ke0).toBe(0.26);
    });

    it('should correctly set parameters for Propofol / Schnider model', () => {
      const propofol = new PKPDModel(MEDICATIONS_CONFIG.propofol, 70);
      const patient = createPatient(53, 77, 177, 'male');
      
      propofol.setTci('Cp', 4.0, 'Schnider', patient);
      
      expect(propofol.pk.V1).toBe(4.27);
      // V2 = 18.9 - 0.391 * (age - 53) = 18.9
      expect(propofol.pk.V2).toBe(18.9);
      expect(propofol.pk.V3).toBe(238.0);
      expect(propofol.pk.ke0).toBe(0.456);
    });

    it('should correctly set parameters for Propofol / Paedfusor model', () => {
      const propofol = new PKPDModel(MEDICATIONS_CONFIG.propofol, 20); // 20kg pediatric patient
      const patient = createPatient(6, 20, 110, 'female');
      
      propofol.setTci('Ce', 2.0, 'Paedfusor', patient);
      
      expect(propofol.pk.V1).toBeCloseTo(0.458 * 20, 2);
      expect(propofol.pk.V2).toBeCloseTo(1.34 * 20, 2);
      expect(propofol.pk.V3).toBeCloseTo(8.20 * 20, 2);
      expect(propofol.pk.k12).toBe(0.12);
      expect(propofol.pk.ke0).toBe(0.26);
      
      // k10 = 70 * weight^(-0.3) / 458.3
      const expectedK10 = (70 * Math.pow(20, -0.3)) / 458.3;
      expect(propofol.pk.k10).toBeCloseTo(expectedK10, 4);
    });

    it('should correctly set parameters for Propofol / Kataria model', () => {
      const propofol = new PKPDModel(MEDICATIONS_CONFIG.propofol, 20);
      const patient = createPatient(6, 20, 110, 'female');
      
      propofol.setTci('Cp', 2.5, 'Kataria', patient);
      
      expect(propofol.pk.V1).toBeCloseTo(0.52 * 20, 2);
      expect(propofol.pk.V2).toBeCloseTo(1.0 * 20, 2);
      expect(propofol.pk.V3).toBeCloseTo(8.2 * 20, 2);
      expect(propofol.pk.k10).toBe(0.066);
      expect(propofol.pk.k12).toBe(0.113);
      expect(propofol.pk.k13).toBe(0.051);
    });

    it('should correctly set parameters for Ketamine / Domino model', () => {
      const ketamine = new PKPDModel(MEDICATIONS_CONFIG.ketamine, 70);
      const patient = createPatient();

      ketamine.setTci('Cp', 1.5, 'Domino', patient);

      expect(ketamine.pk.V1).toBeCloseTo(0.063 * 70, 2);
      expect(ketamine.pk.V2).toBeCloseTo(0.207 * 70, 2);
      expect(ketamine.pk.V3).toBeCloseTo(1.51 * 70, 2);
      expect(ketamine.pk.k10).toBe(0.4381);
      expect(ketamine.pk.ke0).toBe(0.15);
    });

    it('should correctly set parameters for Sufentanil / Gepts model (Table 26.7)', () => {
      const sufentanil = new PKPDModel(MEDICATIONS_CONFIG.sufentanil, 70);
      const patient = createPatient();

      sufentanil.setTci('Cp', 0.3, 'Gepts', patient);

      expect(sufentanil.pk.V1).toBe(14.3);
      expect(sufentanil.pk.V2).toBe(63.4);
      expect(sufentanil.pk.V3).toBe(251.9);
      expect(sufentanil.pk.k10).toBe(0.0645);
      expect(sufentanil.pk.k12).toBe(0.1086);
      expect(sufentanil.pk.k13).toBe(0.0229);
      expect(sufentanil.pk.k21).toBe(0.0245);
      expect(sufentanil.pk.k31).toBe(0.0013);
    });

    it('should correctly set parameters for Fentanyl / Shafer model (Table 26.7)', () => {
      const fentanyl = new PKPDModel(MEDICATIONS_CONFIG.fentanyl, 70);
      const patient = createPatient();

      fentanyl.setTci('Ce', 0.002, 'Shafer', patient);

      expect(fentanyl.pk.V1).toBe(6.09);
      expect(fentanyl.pk.V2).toBe(28.1);
      expect(fentanyl.pk.V3).toBe(228.0);
      expect(fentanyl.pk.k10).toBe(0.083);
      expect(fentanyl.pk.k12).toBe(0.4713);
      expect(fentanyl.pk.k13).toBe(0.22496);
      expect(fentanyl.pk.k21).toBe(0.1021);
      expect(fentanyl.pk.k31).toBe(0.00601);
      expect(fentanyl.pk.ke0).toBe(0.147);
    });

    it('should correctly set sex-dependent V1 for Alfentanil / Maitre model (Table 26.7)', () => {
      const maleAlfentanil = new PKPDModel(MEDICATIONS_CONFIG.alfentanil, 70);
      maleAlfentanil.setTci('Cp', 0.3, 'Maitre', createPatient(40, 70, 170, 'male'));
      expect(maleAlfentanil.pk.V1).toBeCloseTo(0.111 * 70, 3);

      const femaleAlfentanil = new PKPDModel(MEDICATIONS_CONFIG.alfentanil, 70);
      femaleAlfentanil.setTci('Cp', 0.3, 'Maitre', createPatient(40, 70, 170, 'female'));
      expect(femaleAlfentanil.pk.V1).toBeCloseTo(1.15 * 0.111 * 70, 3);

      expect(maleAlfentanil.pk.V2).toBe(12.0);
      expect(maleAlfentanil.pk.V3).toBe(10.5);
      expect(maleAlfentanil.pk.k12).toBe(0.104);
      expect(maleAlfentanil.pk.k13).toBe(0.017);
      expect(maleAlfentanil.pk.k21).toBe(0.067);
      expect(maleAlfentanil.pk.ke0).toBe(0.77);
    });

    it('should apply the age>40 correction terms to Alfentanil k10/k31 (Table 26.7)', () => {
      const youngPatient = createPatient(30, 70, 170, 'male');
      const oldPatient = createPatient(60, 70, 170, 'male');

      const young = new PKPDModel(MEDICATIONS_CONFIG.alfentanil, 70);
      young.setTci('Cp', 0.3, 'Maitre', youngPatient);
      const old = new PKPDModel(MEDICATIONS_CONFIG.alfentanil, 70);
      old.setTci('Cp', 0.3, 'Maitre', oldPatient);

      // Age <= 40: k31 = 0.0126 flat; Age > 40: k31 = 0.0126 - 0.000113*(age-40)
      expect(young.pk.k31).toBeCloseTo(0.0126, 5);
      expect(old.pk.k31).toBeCloseTo(0.0126 - 0.000113 * 20, 5);
      expect(old.pk.k31).toBeLessThan(young.pk.k31);

      // Age <= 40: k10 = 0.356/V1 flat; Age > 40: k10 = (0.356 - 0.00269*(age-40))/V1
      const expectedOldK10 = (0.356 - 0.00269 * 20) / old.pk.V1;
      expect(old.pk.k10).toBeCloseTo(expectedOldK10, 5);
      expect(old.pk.k10).toBeLessThan(young.pk.k10);
    });
  });

  describe('5. Alfentanil Medication Profile Fidelity (Table 26.2, 26.4, 26.5)', () => {
    it('should be present in the medication database with the Maitre TCI model assigned', () => {
      expect(MEDICATIONS_CONFIG.alfentanil).toBeDefined();
      expect(MEDICATIONS_CONFIG.alfentanil.pkModel).toBe('Maitre');
      expect(MEDICATIONS_CONFIG.alfentanil.classes).toContain('Opioid');
    });

    it('should set c50 from the midpoint of Table 26.2\'s incision/painful-stimulus C50 range (200-300 ng/mL)', () => {
      expect(MEDICATIONS_CONFIG.alfentanil.pd.c50).toBeCloseTo(0.25, 3);
    });

    it('should set the apnea threshold from the midpoint of Table 26.2\'s spontaneous-ventilation C50 range (170-230 ng/mL)', () => {
      expect(MEDICATIONS_CONFIG.alfentanil.pd.inducesApneaAtCe).toBeCloseTo(0.2, 3);
    });

    it('should produce finite, bounded TCI behavior identical in kind to the other opioids', () => {
      const alfentanil = new PKPDModel(MEDICATIONS_CONFIG.alfentanil, 70);
      const patient = createPatient();
      alfentanil.setTci('Ce', 0.25, 'Maitre', patient);
      for (let t = 0; t < 600; t++) {
        alfentanil.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      expect(Number.isFinite(alfentanil.Ce)).toBe(true);
      expect(alfentanil.Ce).toBeCloseTo(0.25, 1);
      expect(alfentanil.Cp).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. TCI Cp-Controlled Numerical Stability & Convergence', () => {
    it('should reach plasma steady-state concentration under TCI Cp mode', () => {
      const propofol = new PKPDModel(MEDICATIONS_CONFIG.propofol, 70);
      const patient = createPatient();
      
      propofol.setTci('Cp', 3.0, 'Schnider', patient);
      
      // Simulate for 60 seconds (60 ticks)
      for (let t = 0; t < 60; t++) {
        propofol.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      
      // The plasma concentration Cp should match the target of 3.0 mcg/mL
      expect(propofol.Cp).toBeCloseTo(3.0, 1);
      
      // Infusion rate should remain positive to maintain the concentration
      expect(propofol.currentInfusionRate).toBeGreaterThan(0);
    });
  });

  describe('3. TCI Ce-Controlled Overdrive and Targeting', () => {
    it('should overshoot Cp initially to load the biophase under TCI Ce mode', () => {
      const propofol = new PKPDModel(MEDICATIONS_CONFIG.propofol, 70);
      const patient = createPatient();
      
      // Target Ce = 3.0
      propofol.setTci('Ce', 3.0, 'Schnider', patient);
      
      // Tick for 30 seconds to capture peak overshoot
      let maxCp = 0;
      for (let t = 0; t < 30; t++) {
        propofol.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
        if (propofol.Cp > maxCp) {
          maxCp = propofol.Cp;
        }
      }
      
      // Cp should overshoot Ce target (which is 3.0) to speed up Ce rise
      expect(maxCp).toBeGreaterThan(3.0);
      expect(maxCp).toBeLessThanOrEqual(9.0); // capped at 3.0 * target = 9.0
      
      // After a longer period (e.g. 10 minutes), Ce should be near 3.0 and Cp should settle
      for (let t = 0; t < 570; t++) {
        propofol.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      
      expect(propofol.Ce).toBeCloseTo(3.0, 1);
      expect(propofol.Cp).toBeCloseTo(3.0, 1);
    });
  });
});
