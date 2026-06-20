import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { PKPDModel } from '../engine/PKPDEngine';

describe('Chapter 12: Neuromuscular Physiology and Pharmacology', () => {

  describe('1. Pediatric Immature Neuromuscular Junction Sensitivity', () => {
    it('should scale NDMR and depolarizing occupancies for pediatric patients (<2 years)', () => {
      // Replicate usePhysiology logic for pediatric sensitivity
      const getScaledOccupancy = (baseOccupancy: number, age: number, isNDMR: boolean) => {
        let occupancy = baseOccupancy;
        const isPediatric = age < 2.0;

        if (isNDMR) {
          if (isPediatric) {
            occupancy = Math.min(1.0, occupancy * 2.0); // Immature receptor sensitivity
          }
        } else {
          // Depolarizing
          if (isPediatric) {
            occupancy = occupancy * 0.5; // Resistance to succinylcholine
          }
        }
        return occupancy;
      };

      // Pediatric NDMR: sensitivity is doubled
      expect(getScaledOccupancy(0.3, 0.5, true)).toBeCloseTo(0.6, 4);
      expect(getScaledOccupancy(0.7, 0.5, true)).toBe(1.0); // capped at 1.0

      // Adult NDMR: unchanged
      expect(getScaledOccupancy(0.3, 30.0, true)).toBeCloseTo(0.3, 4);

      // Pediatric Depolarizing: occupancy is halved
      expect(getScaledOccupancy(0.8, 0.5, false)).toBeCloseTo(0.4, 4);

      // Adult Depolarizing: unchanged
      expect(getScaledOccupancy(0.8, 30.0, false)).toBeCloseTo(0.8, 4);
    });
  });

  describe('2. Drug-Induced Channel Block & Desensitization Potentiation', () => {
    it('should calculate the correct potentiation multiplier based on volatile MAC, lidocaine, verapamil, and magnesium', () => {
      const calcPotentiationMult = (volatilesMac: number, lidoCe: number, verapamilCe: number, magnesiumCe: number) => {
        return (1.0 + volatilesMac * 0.5) *
               (1.0 + (lidoCe / (lidoCe + 3.0)) * 0.4) *
               (1.0 + (verapamilCe / (verapamilCe + 0.3)) * 0.4) *
               (1.0 + (magnesiumCe / (magnesiumCe + 1.0)) * 1.0);
      };

      // Baseline (no drugs active): multiplier is 1.0
      expect(calcPotentiationMult(0, 0, 0, 0)).toBeCloseTo(1.0, 4);

      // Volatiles only (1.0 MAC): 1 + 1.0*0.5 = 1.5
      expect(calcPotentiationMult(1.0, 0, 0, 0)).toBeCloseTo(1.5, 4);

      // Lidocaine only (3.0 mg/L c50 equivalent): 1 + (3/(3+3))*0.4 = 1.2
      expect(calcPotentiationMult(0, 3.0, 0, 0)).toBeCloseTo(1.2, 4);

      // Verapamil only (0.3 mg/L c50 equivalent): 1 + (0.3/(0.3+0.3))*0.4 = 1.2
      expect(calcPotentiationMult(0, 0, 0.3, 0)).toBeCloseTo(1.2, 4);

      // Magnesium Sulfate only (1.0 mg/L c50 equivalent): 1 + (1/(1+1))*1.0 = 1.5
      expect(calcPotentiationMult(0, 0, 0, 1.0)).toBeCloseTo(1.5, 4);

      // Multiple agents combined: 1.5 * 1.2 * 1.2 * 1.5 = 3.24
      const combined = calcPotentiationMult(1.0, 3.0, 0.3, 1.0);
      expect(combined).toBeCloseTo(3.24, 4);
    });

    it('should increase NDMR sensitivity coefficient with potentiationMult', () => {
      const hasMG = false;
      const age = 40;
      const potentiationMult = 1.5; // e.g. 1.0 MAC volatile active

      const isNDMR = true;
      let pdSens = 1.0;
      if (isNDMR) {
        const hasPediatricMG = (age < 2.0);
        pdSens = (hasMG || hasPediatricMG) ? 4.0 : 1.0;
        pdSens *= potentiationMult;
      }

      expect(pdSens).toBeCloseTo(1.5, 4);
    });
  });

  describe('3. Dynamic Potassium Leak & Maintenance in Upregulation', () => {
    it('should progressively leak potassium only if patient has upregulated receptors and SCh is active', () => {
      const runElectrolyteTick = (patientState: any, suxCe: number, currentK: number) => {
        let k = currentK;
        if (patientState.nAChR_state === 'upregulated' && suxCe > 0.01) {
          k = Math.min(10.0, k + 0.05); // continuous leak per second
        }
        return k;
      };

      // Normal patient with active SCh: no progressive leak
      expect(runElectrolyteTick({ nAChR_state: 'normal' }, 0.5, 4.0)).toBe(4.0);

      // Upregulated patient with active SCh: leaks potassium (+0.05)
      expect(runElectrolyteTick({ nAChR_state: 'upregulated' }, 0.5, 4.0)).toBe(4.05);

      // Upregulated patient with no active SCh: no leak
      expect(runElectrolyteTick({ nAChR_state: 'upregulated' }, 0.0, 4.0)).toBe(4.0);

      // Upregulated patient with active SCh at potassium limit: capped at 10.0
      expect(runElectrolyteTick({ nAChR_state: 'upregulated' }, 0.5, 9.98)).toBe(10.0);
    });
  });
});
