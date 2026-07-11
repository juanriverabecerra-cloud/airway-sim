import { describe, it, expect } from 'vitest';
import { PediatricPhysiologyEngine } from '../engine/PediatricPhysiologyEngine';

describe('PediatricPhysiologyEngine — MAC correction, vital signs, PFO, hepatic maturity', () => {
  describe('Age classification', () => {
    it('correctly identifies neonate (< 1 month)', () => {
      const out = PediatricPhysiologyEngine.tick({ ageYears: 0.05, weightKg: 3 }); // 0.6 months
      expect(out.isNeonate).toBe(true);
      expect(out.isPediatric).toBe(true);
    });

    it('correctly identifies infant (1-12 months)', () => {
      const out = PediatricPhysiologyEngine.tick({ ageYears: 0.5, weightKg: 7 }); // 6 months
      expect(out.isInfant).toBe(true);
      expect(out.isNeonate).toBe(false);
    });

    it('correctly identifies child (1-12 years)', () => {
      const out = PediatricPhysiologyEngine.tick({ ageYears: 5, weightKg: 18 });
      expect(out.isChild).toBe(true);
    });

    it('returns identity values for adult', () => {
      const out = PediatricPhysiologyEngine.tick({ ageYears: 35, weightKg: 70 });
      expect(out.isPediatric).toBe(false);
      expect(out.ageMacMultiplier).toBe(1.0);
      expect(out.hepaticMaturityFactor).toBe(1.0);
    });
  });

  describe('MAC correction by age', () => {
    it('infant MAC multiplier for sevoflurane is significantly higher than adult (1.0)', () => {
      const infant = PediatricPhysiologyEngine.tick({
        ageYears: 0.33, weightKg: 6, currentAgent: 'sevoflurane',
      }); // 4-month infant
      expect(infant.ageMacMultiplier).toBeGreaterThan(1.4);
      expect(infant.ageMacMultiplier).toBeLessThan(1.8);
    });

    it('neonate has highest MAC multiplier for sevo', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.02, weightKg: 3, currentAgent: 'sevoflurane' });
      const child6 = PediatricPhysiologyEngine.tick({ ageYears: 6, weightKg: 22, currentAgent: 'sevoflurane' });
      expect(neonate.ageMacMultiplier).toBeGreaterThan(child6.ageMacMultiplier);
    });

    it('MAC multiplier decreases monotonically from neonate to adult for sevoflurane', () => {
      const ages = [0.02, 0.33, 0.75, 2, 5, 10, 16, 30];
      const multipliers = ages.map(a => PediatricPhysiologyEngine.tick({ ageYears: a, weightKg: a * 5, currentAgent: 'sevoflurane' }).ageMacMultiplier);
      for (let i = 0; i < multipliers.length - 1; i++) {
        expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i + 1]);
      }
    });

    it('adult (age 30) has MAC multiplier of 1.0 for all agents', () => {
      const sevo = PediatricPhysiologyEngine.tick({ ageYears: 30, weightKg: 70, currentAgent: 'sevoflurane' });
      const iso = PediatricPhysiologyEngine.tick({ ageYears: 30, weightKg: 70, currentAgent: 'isoflurane' });
      expect(sevo.ageMacMultiplier).toBe(1.0);
      expect(iso.ageMacMultiplier).toBe(1.0);
    });

    it('isoflurane MAC multiplier is highest at 1-6 months', () => {
      const infant = PediatricPhysiologyEngine.tick({ ageYears: 0.25, weightKg: 5, currentAgent: 'isoflurane' });
      expect(infant.ageMacMultiplier).toBeGreaterThan(1.4);
    });
  });

  describe('Pediatric vital sign targets', () => {
    it('infant normal HR target is much higher than adult', () => {
      const infant = PediatricPhysiologyEngine.tick({ ageYears: 0.5, weightKg: 7 });
      expect(infant.pediatricHRTarget).toBeGreaterThan(100);
      expect(infant.hrAlarmLow).toBeGreaterThan(60); // infant bradycardia threshold is higher
    });

    it('MAP floor is lower in neonates than adults', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.03, weightKg: 3 });
      expect(neonate.pediatricMAPFloor).toBeLessThan(65); // adult MAP floor
    });

    it('neonate RR target is much higher than adult', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.03, weightKg: 3 });
      expect(neonate.pediatricRRTarget).toBeGreaterThan(30);
    });
  });

  describe('Hepatic drug metabolism maturity', () => {
    it('neonate has severely immature CYP3A4 (factor ~0.10)', () => {
      const out = PediatricPhysiologyEngine.tick({ ageYears: 0.02, weightKg: 3 });
      expect(out.hepaticMaturityFactor).toBeLessThanOrEqual(0.15);
    });

    it('hepatic maturity increases with age', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.02, weightKg: 3 });
      const infant6mo = PediatricPhysiologyEngine.tick({ ageYears: 0.5, weightKg: 7 });
      const child3yr = PediatricPhysiologyEngine.tick({ ageYears: 3, weightKg: 14 });
      expect(infant6mo.hepaticMaturityFactor).toBeGreaterThan(neonate.hepaticMaturityFactor);
      expect(child3yr.hepaticMaturityFactor).toBeGreaterThan(infant6mo.hepaticMaturityFactor);
    });

    it('child 1-3 years can have supra-adult hepatic clearance (>1.0)', () => {
      const toddler = PediatricPhysiologyEngine.tick({ ageYears: 2, weightKg: 12 });
      expect(toddler.hepaticMaturityFactor).toBeGreaterThan(1.0);
    });
  });

  describe('PFO / transitional circulation', () => {
    it('neonate with elevated PVR has significant PFO shunt contribution', () => {
      const out = PediatricPhysiologyEngine.tick({
        ageYears: 0.03, weightKg: 3, hasPFO: true, currentPvr: 2.5, // elevated PVR
      });
      expect(out.pfoShuntContribution).toBeGreaterThan(0);
    });

    it('no PFO shunt when PVR is normal', () => {
      const out = PediatricPhysiologyEngine.tick({
        ageYears: 0.03, weightKg: 3, hasPFO: true, currentPvr: 1.0, // normal PVR
      });
      expect(out.pfoShuntContribution).toBe(0);
    });

    it('adult has negligible PFO shunt risk', () => {
      const out = PediatricPhysiologyEngine.tick({
        ageYears: 30, weightKg: 70, currentPvr: 2.0,
      });
      expect(out.pfoShuntContribution).toBe(0);
    });
  });

  describe('Apnea desaturation rate and metabolism', () => {
    it('neonates desaturate faster than older children', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.03, weightKg: 3 });
      const child = PediatricPhysiologyEngine.tick({ ageYears: 8, weightKg: 28 });
      expect(neonate.apneaDesaturationRateFactor).toBeGreaterThan(child.apneaDesaturationRateFactor);
    });

    it('neonates have higher O2 consumption per kg', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.03, weightKg: 3 });
      const adult = PediatricPhysiologyEngine.tick({ ageYears: 30, weightKg: 70 });
      expect(neonate.metabolicRatePerKg).toBeGreaterThan(adult.metabolicRatePerKg);
    });
  });

  describe('Temperature instability', () => {
    it('neonates have higher BSA:weight ratio and more thermal instability', () => {
      const neonate = PediatricPhysiologyEngine.tick({ ageYears: 0.03, weightKg: 3 });
      const adult = PediatricPhysiologyEngine.tick({ ageYears: 30, weightKg: 70 });
      expect(neonate.bsaToWeightRatio).toBeGreaterThan(adult.bsaToWeightRatio);
      expect(neonate.thermalInstabilityBonus).toBeGreaterThan(0);
    });
  });

  describe('Bradycardia event in infant', () => {
    it('fires bradycardia event when HR < 80 in infant', () => {
      const out = PediatricPhysiologyEngine.tick({
        ageYears: 0.5, weightKg: 7, currentHR: 65,
      });
      expect(out.events.some(e => e.includes('BRADYCARDIA'))).toBe(true);
    });

    it('no bradycardia event when HR is normal for infant (120 bpm)', () => {
      const out = PediatricPhysiologyEngine.tick({
        ageYears: 0.5, weightKg: 7, currentHR: 120,
      });
      expect(out.events.length).toBe(0);
    });
  });
});
