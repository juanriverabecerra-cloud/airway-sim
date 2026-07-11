import { describe, it, expect } from 'vitest';
import { EmergencyDrugDosingModel } from '../engine/EmergencyDrugDosingModel';

describe('EmergencyDrugDosingModel — weight-based emergency drug calculations', () => {
  it('falls back safely with no inputs', () => {
    expect(() => EmergencyDrugDosingModel.tick(undefined as any)).not.toThrow();
  });

  describe('NMB dosing', () => {
    it('succinylcholine: 1.5 mg/kg TBW for adult intubation', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'succinylcholine', patientWeightKg: 80 });
      expect(out.dose).toBeCloseTo(80 * 1.5, 0);
      expect(out.dosingWeight).toContain('TBW');
    });

    it('rocuronium CICO rescue: 1.2 mg/kg IBW', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'rocuronium', ibwKg: 70, indication: 'cico_rescue',
      });
      expect(out.dose).toBeCloseTo(70 * 1.2, 0);
    });

    it('sugammadex immediate reversal: 16 mg/kg TBW', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'sugammadex', patientWeightKg: 70, indication: 'immediate_rescue',
      });
      expect(out.dose).toBe(70 * 16);
    });

    it('sugammadex moderate block: 2 mg/kg TBW', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'sugammadex', patientWeightKg: 80, indication: 'moderate',
      });
      expect(out.dose).toBe(80 * 2);
    });
  });

  describe('Induction drugs', () => {
    it('propofol uses LBW dosing weight', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'propofol', patientWeightKg: 70, lbwKg: 62,
      });
      expect(out.dosingWeightKg).toBeCloseTo(62, 0);
    });

    it('ketamine uses TBW dosing', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'ketamine', patientWeightKg: 75 });
      expect(out.dosingWeightKg).toBeCloseTo(75, 0);
    });
  });

  describe('Emergency resuscitation', () => {
    it('epinephrine for cardiac arrest is NOT weight-based (1 mg fixed)', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'epinephrine', indication: 'cardiac_arrest', patientWeightKg: 80,
      });
      expect(out.dose).toBe(1.0); // 1 mg fixed, not weight-based
    });

    it('epinephrine for pediatric anaphylaxis is weight-based (0.01 mg/kg)', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'epinephrine', indication: 'anaphylaxis',
        patientWeightKg: 20, patientAgeYears: 6, isPediatric: true,
      });
      expect(out.dose).toBeCloseTo(0.2, 1); // 0.01 × 20 kg = 0.2 mg
    });

    it('atropine for adult bradycardia is 1.0 mg fixed dose', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'atropine', patientWeightKg: 85 });
      expect(out.dose).toBe(1.0);
      expect(out.doseUnit).toBe('mg IV bolus');
    });

    it('amiodarone is 300 mg in arrest and 150 mg otherwise', () => {
      const arrest = EmergencyDrugDosingModel.calculate({ drugRequested: 'amiodarone', indication: 'cardiac_arrest' });
      const stable = EmergencyDrugDosingModel.calculate({ drugRequested: 'amiodarone', indication: 'stable' });
      expect(arrest.dose).toBe(300);
      expect(stable.dose).toBe(150);
    });

    it('lidocaine is weight-based TBW', () => {
      const arrest = EmergencyDrugDosingModel.calculate({ drugRequested: 'lidocaine', indication: 'cardiac_arrest', patientWeightKg: 70 });
      const stable = EmergencyDrugDosingModel.calculate({ drugRequested: 'lidocaine', indication: 'stable', patientWeightKg: 70 });
      expect(arrest.dose).toBeCloseTo(70, 1);
      expect(stable.dose).toBeCloseTo(105, 1);
    });

    it('magnesium sulfate is 2g for torsades/arrest and 4g otherwise', () => {
      const arrest = EmergencyDrugDosingModel.calculate({ drugRequested: 'magnesium sulfate', indication: 'torsades' });
      const preeclampsia = EmergencyDrugDosingModel.calculate({ drugRequested: 'magnesium sulfate', indication: 'preeclampsia' });
      expect(arrest.dose).toBe(2);
      expect(preeclampsia.dose).toBe(4);
    });

    it('procainamide is 15 mg/kg TBW', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'procainamide', patientWeightKg: 80 });
      expect(out.dose).toBe(1200);
    });

    it('naloxone is 0.4 mg fixed dose', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'naloxone' });
      expect(out.dose).toBe(0.4);
    });

    it('sodium bicarbonate is 1 mEq/kg TBW', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'sodium bicarbonate', patientWeightKg: 75 });
      expect(out.dose).toBe(75);
    });

    it('vasopressin is 40 units in arrest and 0.04 otherwise', () => {
      const arrest = EmergencyDrugDosingModel.calculate({ drugRequested: 'vasopressin', indication: 'cardiac_arrest' });
      const shock = EmergencyDrugDosingModel.calculate({ drugRequested: 'vasopressin', indication: 'shock' });
      expect(arrest.dose).toBe(40);
      expect(shock.dose).toBe(0.04);
    });
  });

  describe('MH treatment', () => {
    it('dantrolene: 2.5 mg/kg TBW for MH', () => {
      const out = EmergencyDrugDosingModel.calculate({ drugRequested: 'dantrolene', patientWeightKg: 80 });
      expect(out.dose).toBeCloseTo(80 * 2.5, 0);
      expect(out.notes).toContain('MH');
    });
  });

  describe('Fentanyl', () => {
    it('fentanyl uses IBW for obese patients', () => {
      const out = EmergencyDrugDosingModel.calculate({
        drugRequested: 'fentanyl', patientWeightKg: 130, ibwKg: 70,
      });
      expect(out.dosingWeightKg).toBeCloseTo(70, 0);
    });
  });
});
