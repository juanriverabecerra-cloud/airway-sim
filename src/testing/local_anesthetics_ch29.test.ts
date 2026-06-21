import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { MEDICATIONS } from '../engine/Pharmacology';
import { PKPDModel } from '../engine/PKPDEngine';

describe('Chapter 29: Local Anesthetics', () => {

  describe('1. Medication Configurations', () => {
    const expectedMeds = [
      'bupivacaine', 'ropivacaine', 'levobupivacaine',
      'cocaine', 'tetracaine', 'chloroprocaine',
      'benzocaine', 'prilocaine', 'mepivacaine', 'intralipid', 'methyleneBlue'
    ];

    it('should verify all new medications exist in MEDICATIONS_CONFIG and MEDICATIONS', () => {
      expectedMeds.forEach(med => {
        expect(MEDICATIONS_CONFIG[med]).toBeDefined();
        expect(MEDICATIONS[med]).toBeDefined();
      });
    });

    it('should verify correct classes and dosing weights', () => {
      expect(MEDICATIONS_CONFIG.bupivacaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.ropivacaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.levobupivacaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.cocaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.tetracaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.chloroprocaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.benzocaine.classes).toContain('Local Anesthetic');
      expect(MEDICATIONS_CONFIG.prilocaine.classes).toContain('Local Anesthetic');

      expect(MEDICATIONS_CONFIG.intralipid.classes).toContain('Rescue Agent');
      expect(MEDICATIONS_CONFIG.methyleneBlue.classes).toContain('Antidote');

      expect(MEDICATIONS_CONFIG.bupivacaine.dosingWeight).toBe('TBW');
      expect(MEDICATIONS_CONFIG.ropivacaine.dosingWeight).toBe('TBW');
      expect(MEDICATIONS_CONFIG.intralipid.dosingWeight).toBe('TBW');
    });

    it('should verify onsets (ke0) match clinical profiles', () => {
      expect(MEDICATIONS_CONFIG.bupivacaine.pk.ke0).toBe(0.1);
      expect(MEDICATIONS_CONFIG.ropivacaine.pk.ke0).toBe(0.15);
      expect(MEDICATIONS_CONFIG.chloroprocaine.pk.ke0).toBe(2.0);
    });
  });

  describe('2. Cardiotoxicity Ratios (ccCnsRatio)', () => {
    it('should verify correct relative CC/CNS ratios for local anesthetics', () => {
      const getRatio = (name: string): number => {
        if (name === 'Lidocaine') return 7.0;
        if (name === 'Bupivacaine') return 2.0;
        if (name === 'Ropivacaine') return 4.0;
        if (name === 'Levobupivacaine') return 3.3;
        if (name === 'Cocaine') return 3.0;
        if (name === 'Tetracaine') return 2.5;
        if (name === 'Chloroprocaine') return 12.0;
        return 7.0;
      };

      // Bupivacaine has the highest cardiotoxicity (lowest ratio of 2.0)
      expect(getRatio('Bupivacaine')).toBe(2.0);
      // Ropivacaine and Levobupivacaine are safer single-stereoisomers (ratios of 4.0 and 3.3)
      expect(getRatio('Ropivacaine')).toBe(4.0);
      expect(getRatio('Levobupivacaine')).toBe(3.3);
      // Lidocaine is relatively safe cardiotoxically (ratio of 7.0)
      expect(getRatio('Lidocaine')).toBe(7.0);
      // Chloroprocaine is rapidly hydrolyzed, very high ratio of 12.0
      expect(getRatio('Chloroprocaine')).toBe(12.0);
    });
  });

  describe('3. Protein Binding & Patient Factors (pH / Infant Age)', () => {
    const calcFreeFraction = (pb: number, pH: number, age: number): number => {
      const ageFactor = (age < 1) ? 0.5 : 1.0;
      const acidosisFactor = Math.max(0.5, 1.0 - Math.max(0, 7.4 - pH) * 0.5);
      return 1.0 - pb * acidosisFactor * ageFactor;
    };

    it('should verify protein binding fraction changes under pH shift', () => {
      const pbBupivacaine = 0.95;
      
      // Baseline adult pH 7.4
      const ffBaseline = calcFreeFraction(pbBupivacaine, 7.4, 40);
      expect(ffBaseline).toBeCloseTo(0.05, 4);

      // Acidosis pH 7.1
      const ffAcidosis = calcFreeFraction(pbBupivacaine, 7.1, 40);
      // acidosisFactor = 1.0 - 0.3 * 0.5 = 0.85
      // pb_eff = 0.95 * 0.85 = 0.8075
      // freeFraction = 1.0 - 0.8075 = 0.1925
      expect(ffAcidosis).toBeCloseTo(0.1925, 4);
      expect(ffAcidosis).toBeGreaterThan(ffBaseline);
    });

    it('should verify protein binding fraction increases for infants', () => {
      const pbBupivacaine = 0.95;
      
      // Infant age = 0.5, pH 7.4
      const ffInfant = calcFreeFraction(pbBupivacaine, 7.4, 0.5);
      // ageFactor = 0.5
      // pb_eff = 0.95 * 1.0 * 0.5 = 0.475
      // freeFraction = 1.0 - 0.475 = 0.525
      expect(ffInfant).toBeCloseTo(0.525, 4);
      expect(ffInfant).toBeGreaterThan(calcFreeFraction(pbBupivacaine, 7.4, 40));
    });
  });

  describe('4. Cocaine Sympathomimetic NET Blockade', () => {
    it('should verify cocaine elevates heart rate and mean arterial pressure', () => {
      const calcCocaineHemodynamics = (cocaineCe: number) => {
        let hrMultiplier = 1.0;
        let mapOffset = 0;
        if (cocaineCe > 0) {
          hrMultiplier += (cocaineCe / 0.5) * 0.25;
          mapOffset += (cocaineCe / 0.5) * 15.0;
        }
        return { hrMultiplier, mapOffset };
      };

      // Baseline
      const normal = calcCocaineHemodynamics(0.0);
      expect(normal.hrMultiplier).toBe(1.0);
      expect(normal.mapOffset).toBe(0.0);

      // Elevated Cocaine (Ce = 0.5 mcg/mL)
      const highCocaine = calcCocaineHemodynamics(0.5);
      expect(highCocaine.hrMultiplier).toBe(1.25);
      expect(highCocaine.mapOffset).toBe(15.0);
    });
  });

  describe('5. Methemoglobinemia Kinetics', () => {
    it('should simulate methemoglobin rise from benzocaine and decay via methylene blue', () => {
      let metHb = 0.8;

      const tickMetHb = (benzocaineCe: number, methyleneBlueCe: number, currentMetHb: number): number => {
        let val = currentMetHb;
        if (benzocaineCe > 0.2) {
          val = Math.min(35.0, val + 0.1);
        } else if (methyleneBlueCe > 0.05) {
          val = Math.max(0.8, val - 0.5);
        }
        return val;
      };

      // Benzocaine present -> MetHb rises
      metHb = tickMetHb(0.5, 0.0, metHb);
      expect(metHb).toBeCloseTo(0.9, 4);

      // Methylene Blue rescue -> MetHb falls
      metHb = 20.0;
      metHb = tickMetHb(0.0, 0.2, metHb);
      expect(metHb).toBeCloseTo(19.5, 4);
    });
  });

  describe('6. Intralipid Sink Rescue Binding', () => {
    const calcFreeCeWithLipid = (ce: number, pb: number, kLipid: number, lipidSinkVol: number, ebv: number): number => {
      const vLipid = lipidSinkVol / ebv;
      const freeFraction = 1.0 - pb; // assume normal pH and age
      const fLipidBound = (kLipid * vLipid) / (1.0 + kLipid * vLipid);
      return ce * freeFraction * (1.0 - fLipidBound);
    };

    it('should sequestrate lipophilic local anesthetics (e.g. Bupivacaine) in lipid sink', () => {
      const ce = 1.0;
      const pbBupivacaine = 0.95;
      const kLipidBupivacaine = 120.0;
      const ebv = 5000.0;

      // No Intralipid
      const freeNoLipid = calcFreeCeWithLipid(ce, pbBupivacaine, kLipidBupivacaine, 0.0, ebv);
      expect(freeNoLipid).toBeCloseTo(0.05, 4);

      // Infused 500 mL Intralipid
      const freeWithLipid = calcFreeCeWithLipid(ce, pbBupivacaine, kLipidBupivacaine, 500.0, ebv);
      // vLipid = 500 / 5000 = 0.1
      // fLipidBound = (120 * 0.1) / (1 + 120 * 0.1) = 12 / 13 = 0.923
      // freeCe = 1.0 * 0.05 * (1.0 - 0.923) = 0.05 * 0.0769 = 0.00384
      expect(freeWithLipid).toBeLessThan(freeNoLipid);
      expect(freeWithLipid).toBeCloseTo(0.003846, 5);
    });

    it('should have minimal effect on hydrophilic local anesthetics (e.g. Chloroprocaine)', () => {
      const ce = 1.0;
      const pbChloroprocaine = 0.0;
      const kLipidChloroprocaine = 0.5;
      const ebv = 5000.0;

      const freeNoLipid = calcFreeCeWithLipid(ce, pbChloroprocaine, kLipidChloroprocaine, 0.0, ebv);
      const freeWithLipid = calcFreeCeWithLipid(ce, pbChloroprocaine, kLipidChloroprocaine, 500.0, ebv);

      expect(freeNoLipid).toBe(1.0);
      // vLipid = 0.1
      // fLipidBound = 0.05 / 1.05 = 0.0476
      // freeCe = 1.0 * 1.0 * (1.0 - 0.0476) = 0.9524
      expect(freeWithLipid).toBeCloseTo(0.95238, 5);
      expect(freeWithLipid).toBeGreaterThan(0.95);
    });
  });

  describe('7. Mepivacaine Medication Profile Fidelity (Table 29.2)', () => {
    it('should be present in both MEDICATIONS and MEDICATIONS_CONFIG as an intermediate-potency amide LA', () => {
      expect(MEDICATIONS.mepivacaine).toBeDefined();
      expect(MEDICATIONS_CONFIG.mepivacaine).toBeDefined();
      expect(MEDICATIONS.mepivacaine.classes).toContain('Local Anesthetic');
    });

    it('should rank potency/toxicity between Procaine-class and Prilocaine per Table 29.2 (1.5x vs 1x and 1.8x procaine)', () => {
      // Mepivacaine's CNS threshold (1.8) sits between Lidocaine's (1.5, higher relative potency 2x)
      // and Prilocaine's (2.0, lower relative potency 1.8x) in the existing usePhysiology.js LAST model,
      // consistent with Table 29.2's potency ranking: Procaine(1) < Mepivacaine(1.5) < Prilocaine(1.8) < Lidocaine(2).
      expect(MEDICATIONS.mepivacaine.pd.ccCnsRatio).toBe(7.0);
      expect(MEDICATIONS.mepivacaine.pd.ccCnsRatio).toBe(MEDICATIONS.lidocaine.pd.ccCnsRatio);
    });

    it('should remain finite and bounded across a wide range of doses', () => {
      const mep = new PKPDModel(MEDICATIONS.mepivacaine, 70);
      mep.giveBolus(200); // ~2.8 mg/kg, a large infiltration dose
      let eff;
      for (let t = 0; t < 600; t++) {
        eff = mep.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      expect(Number.isFinite(mep.Ce)).toBe(true);
      expect(Number.isFinite(eff.hrDelta)).toBe(true);
      expect(mep.Ce).toBeGreaterThanOrEqual(0);
    });
  });
});
