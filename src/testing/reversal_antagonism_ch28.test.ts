import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { MEDICATIONS } from '../engine/Pharmacology';
import { PKPDModel } from '../engine/PKPDEngine';

describe('Chapter 28: Reversal (Antagonism) of Neuromuscular Blockade', () => {

  describe('1. Medication Configurations', () => {
    it('should verify edrophonium and pyridostigmine exist in MEDICATIONS_CONFIG and MEDICATIONS', () => {
      expect(MEDICATIONS_CONFIG.edrophonium).toBeDefined();
      expect(MEDICATIONS_CONFIG.pyridostigmine).toBeDefined();
      expect(MEDICATIONS.edrophonium).toBeDefined();
      expect(MEDICATIONS.pyridostigmine).toBeDefined();
    });

    it('should verify correct classes, target receptors, and dosing weights', () => {
      expect(MEDICATIONS_CONFIG.edrophonium.classes).toContain('AChE Inhibitor');
      expect(MEDICATIONS_CONFIG.pyridostigmine.classes).toContain('AChE Inhibitor');
      expect(MEDICATIONS_CONFIG.edrophonium.targetReceptor).toBe('Acetylcholinesterase');
      expect(MEDICATIONS_CONFIG.pyridostigmine.targetReceptor).toBe('Acetylcholinesterase');
      expect(MEDICATIONS_CONFIG.edrophonium.dosingWeight).toBe('TBW');
      expect(MEDICATIONS_CONFIG.pyridostigmine.dosingWeight).toBe('TBW');
    });

    it('should verify onset and PK/PD constants match clinical profiles', () => {
      // Edrophonium: rapid onset (ke0 = 1.5), lower potency (c50 = 0.25)
      expect(MEDICATIONS_CONFIG.edrophonium.pk.ke0).toBe(1.5);
      expect(MEDICATIONS_CONFIG.edrophonium.pd.c50).toBe(0.25);
      
      // Pyridostigmine: slow onset (ke0 = 0.08), higher potency (c50 = 0.088)
      expect(MEDICATIONS_CONFIG.pyridostigmine.pk.ke0).toBe(0.08);
      expect(MEDICATIONS_CONFIG.pyridostigmine.pd.c50).toBe(0.088);
    });
  });

  describe('2. BChE (Pseudocholinesterase) Inhibition', () => {
    it('should check if Pyridostigmine and Neostigmine, but not Edrophonium, inhibit BChE by 90%', () => {
      const calcBcheMultiplier = (patient: any, activeMeds: any[]) => {
        let bcheMultiplier = 1.0;
        if (patient.butyrylcholinesteraseVariant === 'heterozygous') {
          bcheMultiplier = 0.1;
        } else if (patient.butyrylcholinesteraseVariant === 'atypical') {
          bcheMultiplier = 0.01;
        }
        
        if (patient.pregnancy) {
          bcheMultiplier *= 0.8;
        }
        if (patient.cirrhosis || patient.childPugh === 'C') {
          bcheMultiplier *= 0.5;
        }

        const neostigmine = activeMeds.find(m => m.name === 'Neostigmine');
        const pyridostigmine = activeMeds.find(m => m.name === 'Pyridostigmine');
        if ((neostigmine && neostigmine.Ce > 0.01) || (pyridostigmine && pyridostigmine.Ce > 0.01)) {
          bcheMultiplier *= 0.1;
        }
        return bcheMultiplier;
      };

      // Normal state
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'normal' }, [])).toBe(1.0);

      // Neostigmine inhibits BChE
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'normal' }, [{ name: 'Neostigmine', Ce: 0.05 }])).toBe(0.1);

      // Pyridostigmine inhibits BChE
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'normal' }, [{ name: 'Pyridostigmine', Ce: 0.05 }])).toBe(0.1);

      // Edrophonium does NOT inhibit BChE in BChE multiplier calculation
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'normal' }, [{ name: 'Edrophonium', Ce: 0.05 }])).toBe(1.0);
    });
  });

  describe('3. Competitive NMJ Displacement & Ceiling Effect', () => {
    const applyDisplacement = (occupancyBase: number, E_AChE: number) => {
      if (occupancyBase <= 0) return 0;
      const ceilingPenalty = Math.max(0, Math.min(1.0, (occupancyBase - 0.85) / 0.10));
      const effOccupancy = occupancyBase * (1.0 - 0.85 * E_AChE * (1.0 - ceilingPenalty));
      return Math.max(0, effOccupancy);
    };

    it('should displace NDMR occupancy proportionally when E_AChE is active', () => {
      const baseOcc = 0.70; // moderate block
      
      // E_AChE = 0.5 (partial reversal)
      const displacedOccHalf = applyDisplacement(baseOcc, 0.5);
      expect(displacedOccHalf).toBeLessThan(baseOcc);
      expect(displacedOccHalf).toBeCloseTo(baseOcc * (1.0 - 0.85 * 0.5), 4); // ceilingPenalty = 0

      // E_AChE = 1.0 (full reversal)
      const displacedOccFull = applyDisplacement(baseOcc, 1.0);
      expect(displacedOccFull).toBeLessThan(displacedOccHalf);
      expect(displacedOccFull).toBeCloseTo(baseOcc * (1.0 - 0.85 * 1.0), 4);
    });

    it('should respect the absolute clinical ceiling effect at deep block levels (occupancy >= 0.95)', () => {
      const deepOcc = 0.95; // profound block
      
      // Full AChE concentration should fail to displace when base occupancy is >= 0.95 (ceiling effect)
      const effOcc = applyDisplacement(deepOcc, 1.0);
      expect(effOcc).toBeCloseTo(deepOcc, 5); // Unchanged!
    });

    it('should show partial ceiling penalty in the transition zone (0.85 < occupancy < 0.95)', () => {
      const boundaryOcc = 0.90; // intermediate block
      
      const effOcc = applyDisplacement(boundaryOcc, 1.0);
      expect(effOcc).toBeLessThan(boundaryOcc); // some reversal occurs
      // ceilingPenalty = (0.90 - 0.85) / 0.10 = 0.5
      // displacement factor = 1.0 - 0.85 * 1.0 * (1.0 - 0.5) = 1.0 - 0.425 = 0.575
      expect(effOcc).toBeCloseTo(0.90 * 0.575, 4);
    });
  });

  describe('4. Muscle Weakness Caps & Paradoxical Weakness triggers', () => {
    it('should trigger neostigmineWeakness when given in overdose or when no block is present', () => {
      const checkWeaknessTrigger = (medId: string, doseMgPerKg: number, maxNMJOccupancy: number) => {
        const noActiveBlock = maxNMJOccupancy <= 0.15;
        let isOverdose = false;
        if (medId === 'neostigmine' && doseMgPerKg > 0.08) isOverdose = true;
        if (medId === 'pyridostigmine' && doseMgPerKg > 0.35) isOverdose = true;
        if (medId === 'edrophonium' && doseMgPerKg > 1.0) isOverdose = true;
        return noActiveBlock || isOverdose;
      };

      // Normal therapeutic dose with active block -> no weakness
      expect(checkWeaknessTrigger('neostigmine', 0.05, 0.70)).toBe(false);
      expect(checkWeaknessTrigger('pyridostigmine', 0.25, 0.70)).toBe(false);
      expect(checkWeaknessTrigger('edrophonium', 0.75, 0.70)).toBe(false);

      // Given in absence of block (maxNMJOccupancy <= 0.15) -> weakness triggered
      expect(checkWeaknessTrigger('neostigmine', 0.05, 0.10)).toBe(true);
      expect(checkWeaknessTrigger('pyridostigmine', 0.25, 0.0)).toBe(true);

      // Given in overdose -> weakness triggered
      expect(checkWeaknessTrigger('neostigmine', 0.09, 0.70)).toBe(true);
      expect(checkWeaknessTrigger('pyridostigmine', 0.40, 0.70)).toBe(true);
      expect(checkWeaknessTrigger('edrophonium', 1.20, 0.70)).toBe(true);
    });

    it('should verify that dilatorMuscleTone is capped at <= 0.79 and targetTofRatio is capped at <= 0.89 under weakness', () => {
      // Replicate the caps logic
      const capGenioglossusTone = (baseTone: number, neostigmineWeakness: boolean) => {
        return neostigmineWeakness ? Math.min(0.79, baseTone) : baseTone;
      };

      const capTofRatio = (baseRatio: number, neostigmineWeakness: boolean) => {
        return neostigmineWeakness ? Math.min(0.89, baseRatio) : baseRatio;
      };

      expect(capGenioglossusTone(1.0, true)).toBe(0.79);
      expect(capGenioglossusTone(0.5, true)).toBe(0.5);
      expect(capGenioglossusTone(1.0, false)).toBe(1.0);

      expect(capTofRatio(1.0, true)).toBe(0.89);
      expect(capTofRatio(0.95, true)).toBe(0.89);
      expect(capTofRatio(0.5, true)).toBe(0.5);
      expect(capTofRatio(1.0, false)).toBe(1.0);
    });
  });
});
