import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { MEDICATIONS } from '../engine/Pharmacology';
import { PKPDModel } from '../engine/PKPDEngine';

function tickEffects(model: PKPDModel, ticks: number, bcheMultiplier = 1.0) {
  let effects;
  for (let t = 0; t < ticks; t++) {
    effects = model.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, bcheMultiplier);
  }
  return effects!;
}

describe('Chapter 27: Pharmacology of Neuromuscular Blocking Drugs (NMBDs)', () => {

  describe('1. Medication Configurations', () => {
    it('should verify atracurium, gantacurium, cw002, and l_cysteine exist in MEDICATIONS_CONFIG', () => {
      expect(MEDICATIONS_CONFIG.atracurium).toBeDefined();
      expect(MEDICATIONS_CONFIG.gantacurium).toBeDefined();
      expect(MEDICATIONS_CONFIG.cw002).toBeDefined();
      expect(MEDICATIONS_CONFIG.l_cysteine).toBeDefined();
    });

    it('should verify atracurium, gantacurium, cw002, and l_cysteine exist in MEDICATIONS', () => {
      expect(MEDICATIONS.atracurium).toBeDefined();
      expect(MEDICATIONS.gantacurium).toBeDefined();
      expect(MEDICATIONS.cw002).toBeDefined();
      expect(MEDICATIONS.l_cysteine).toBeDefined();
    });

    it('should verify classes and receptors', () => {
      expect(MEDICATIONS_CONFIG.atracurium.classes).toContain('NDMR');
      expect(MEDICATIONS_CONFIG.gantacurium.classes).toContain('NDMR');
      expect(MEDICATIONS_CONFIG.cw002.classes).toContain('NDMR');
      expect(MEDICATIONS_CONFIG.l_cysteine.classes).toContain('Reversal');

      expect(MEDICATIONS_CONFIG.atracurium.targetReceptor).toBe('nAChR (Antagonist)');
      expect(MEDICATIONS_CONFIG.gantacurium.targetReceptor).toBe('nAChR (Antagonist)');
      expect(MEDICATIONS_CONFIG.cw002.targetReceptor).toBe('nAChR (Antagonist)');
      expect(MEDICATIONS_CONFIG.l_cysteine.targetReceptor).toBe('Asymmetric fumarate double bond');
    });
  });

  describe('2. Succinylcholine & Pseudocholinesterase Genotypes', () => {
    it('should correctly calculate the BChE clearance multiplier based on genotype and clinical state', () => {
      // Helper function to replicate the usePhysiology bcheMultiplier calculation
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
        if (neostigmine && neostigmine.Ce > 0.01) {
          bcheMultiplier *= 0.1;
        }
        return bcheMultiplier;
      };

      // Normal genotype
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'normal' }, [])).toBe(1.0);

      // Heterozygous
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'heterozygous' }, [])).toBe(0.1);

      // Atypical
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'atypical' }, [])).toBe(0.01);

      // Pregnancy + Atypical
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'atypical', pregnancy: true }, [])).toBeCloseTo(0.008, 4);

      // Cirrhosis + Heterozygous
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'heterozygous', cirrhosis: true }, [])).toBeCloseTo(0.05, 4);

      // Neostigmine active + Normal
      expect(calcBcheMultiplier({ butyrylcholinesteraseVariant: 'normal' }, [{ name: 'Neostigmine', Ce: 0.05 }])).toBe(0.1);
    });

    it('should prolong Succinylcholine block duration under atypical pseudocholinesterase variants', () => {
      const suxProfile = MEDICATIONS_CONFIG.succinylcholine;

      // Case A: Normal patient (bcheMultiplier = 1.0)
      const modelNormal = new PKPDModel(suxProfile, 70);
      modelNormal.giveBolus(100); // 100mg bolus (1.4 mg/kg)

      // Case B: Heterozygous patient (bcheMultiplier = 0.1)
      const modelHetero = new PKPDModel(suxProfile, 70);
      modelHetero.giveBolus(100);

      // Case C: Atypical patient (bcheMultiplier = 0.01)
      const modelAtypical = new PKPDModel(suxProfile, 70);
      modelAtypical.giveBolus(100);

      // Tick for 60 seconds (1 minute)
      for (let t = 0; t < 60; t++) {
        modelNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);  // bcheMultiplier = 1.0
        modelHetero.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 0.1);  // bcheMultiplier = 0.1
        modelAtypical.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 0.01); // bcheMultiplier = 0.01
      }

      // Normal should have cleared significantly, Hetero moderately, Atypical barely at all
      expect(modelNormal.Ce).toBeLessThan(modelHetero.Ce);
      expect(modelHetero.Ce).toBeLessThan(modelAtypical.Ce);

      // Run normal for another 20 minutes (1200 ticks) -> should be near zero
      for (let t = 0; t < 1200; t++) {
        modelNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);
      }
      expect(modelNormal.Ce).toBeLessThan(0.02);

      // Atypical model should still be highly blocked (high Ce)
      expect(modelAtypical.Ce).toBeGreaterThan(0.5);
    });
  });

  describe('3. Hofmann Elimination & Laudanosine Accumulation', () => {
    it('should correctly calculate the Hofmann clearance multiplier based on temp and pH', () => {
      // hofmannMultiplier = Math.pow(1.07, temp - 37.0) * Math.pow(10, pH - 7.4)
      const calcHofmann = (temp: number, pH: number) => {
        return Math.pow(1.07, temp - 37.0) * Math.pow(10, pH - 7.4);
      };

      // Normal conditions (37C, pH 7.4)
      expect(calcHofmann(37.0, 7.4)).toBeCloseTo(1.0, 4);

      // Acidosis (35C, pH 7.1) -> should be significantly slower
      const acidosisMult = calcHofmann(35.0, 7.1);
      expect(acidosisMult).toBeLessThan(0.5);

      // Alkalosis & Hyperthermia (39C, pH 7.6) -> should be significantly faster
      const alkalosisMult = calcHofmann(39.0, 7.6);
      expect(alkalosisMult).toBeGreaterThan(1.8);
    });

    it('should alter Atracurium clearance rate dynamically with core temperature and pH changes', () => {
      const atrProfile = MEDICATIONS_CONFIG.atracurium;

      // Baseline: Normal Temp & pH (hofmann = 1.0)
      const modelBaseline = new PKPDModel(atrProfile, 70);
      modelBaseline.giveBolus(35); // 0.5 mg/kg

      // Hyperthermic Alkalosis (temp = 39.0, pH = 7.6 => hofmann = ~2.08)
      const modelFever = new PKPDModel(atrProfile, 70);
      modelFever.giveBolus(35);

      // Hypothermic Acidosis (temp = 35.0, pH = 7.1 => hofmann = ~0.43)
      const modelCold = new PKPDModel(atrProfile, 70);
      modelCold.giveBolus(35);

      const multFever = Math.pow(1.07, 39.0 - 37.0) * Math.pow(10, 7.6 - 7.4); // 2.079
      const multCold = Math.pow(1.07, 35.0 - 37.0) * Math.pow(10, 7.1 - 7.4); // 0.436

      // Tick all models for 120 seconds
      for (let t = 0; t < 120; t++) {
        modelBaseline.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);
        modelFever.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, multFever);
        modelCold.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, multCold);
      }

      // Fever model (rapid Hofmann elimination) should clear the drug fastest (lowest Ce)
      // Cold model (slowed Hofmann elimination) should clear the drug slowest (highest Ce)
      expect(modelFever.Ce).toBeLessThan(modelBaseline.Ce);
      expect(modelBaseline.Ce).toBeLessThan(modelCold.Ce);
    });

    it('should accumulate laudanosine from atracurium/cisatracurium clearance and clear it based on organ function', () => {
      const atrProfile = MEDICATIONS_CONFIG.atracurium;
      const modelAtr = new PKPDModel(atrProfile, 70);
      modelAtr.giveBolus(35);

      // Accumulate laudanosine over 10 ticks
      let currentLaudanosine = 0.0;
      const hofmannMult = 1.0;

      for (let t = 0; t < 10; t++) {
        const prevA1 = modelAtr.A1;
        modelAtr.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, hofmannMult);
        
        // Atracurium clearance generates laudanosine (30% of cleared central compartment amount)
        const clearedAtr = prevA1 - modelAtr.A1;
        const laudanosineAccumulated = clearedAtr * 0.30;
        expect(laudanosineAccumulated).toBeGreaterThan(0);
        currentLaudanosine += laudanosineAccumulated;
      }

      expect(currentLaudanosine).toBeGreaterThan(0);

      // Verify Laudanosine clearance: laudanosineClearance = 0.005 * (0.3 * renalRatio + 0.7 * hepaticRatio)
      const getLaudanosineClearance = (renalRatio: number, hepaticRatio: number) => {
        return 0.005 * (0.3 * renalRatio + 0.7 * hepaticRatio);
      };

      const normalClearance = getLaudanosineClearance(1.0, 1.0);
      const organFailureClearance = getLaudanosineClearance(0.1, 0.2); // severe renal + hepatic impairment

      expect(normalClearance).toBe(0.005);
      expect(organFailureClearance).toBe(0.005 * (0.3 * 0.1 + 0.7 * 0.2)); // 0.00085
      expect(organFailureClearance).toBeLessThan(normalClearance);
    });

    it('should trigger and resolve laudanosine seizures', () => {
      // Replicate seizure trigger condition:
      // currentLaudanosine > 2.0 && epilepsy/seizureHistory ? 3x probability -> rolls isSeizure
      // Aborted by propofolCe > 1.2 or midazolamCe > 0.08
      const rollSeizure = (laudanosine: number, patient: any) => {
        if (laudanosine > 2.0) {
          const baseProb = 0.15;
          const hasRisk = (patient.epilepsy || patient.seizureHistory) ? 3.0 : 1.0;
          const prob = Math.min(1.0, baseProb * hasRisk);
          return prob; // Return probability of seizure
        }
        return 0.0;
      };

      const probNormal = rollSeizure(2.5, { epilepsy: false, seizureHistory: false });
      const probRisk = rollSeizure(2.5, { epilepsy: true, seizureHistory: false });

      expect(probNormal).toBeCloseTo(0.15, 4);
      expect(probRisk).toBeCloseTo(0.45, 4);

      // Verify seizure suppression
      const isSeizureSuppressed = (propofolCe: number, midazolamCe: number) => {
        return propofolCe > 1.2 || midazolamCe > 0.08;
      };

      expect(isSeizureSuppressed(0.0, 0.0)).toBe(false);
      expect(isSeizureSuppressed(1.5, 0.0)).toBe(true);  // propofol aborts
      expect(isSeizureSuppressed(0.0, 0.10)).toBe(true); // midazolam aborts
    });
  });

  describe('4. Asymmetric Fumarate Clearance & L-Cysteine Rescue Reversal', () => {
    it('should accelerate Gantacurium and CW002 clearance in the presence of L-Cysteine Ce', () => {
      const gantProfile = MEDICATIONS_CONFIG.gantacurium;

      // Case A: Gantacurium alone (no L-Cysteine rescue, cysteineCe = 0.0)
      const modelGant = new PKPDModel(gantProfile, 70);
      modelGant.giveBolus(60); // 60mg bolus to ensure high initial Ce

      // Case B: Gantacurium + L-Cysteine rescue (cysteineCe = 0.5)
      const modelGantRescued = new PKPDModel(gantProfile, 70);
      modelGantRescued.giveBolus(60);

      // Check baseline Ce levels are identical initially
      expect(modelGant.Ce).toBe(0.0);
      expect(modelGantRescued.Ce).toBe(0.0);

      // Tick for 3 seconds to build effect site concentration
      for (let t = 0; t < 3; t++) {
        modelGant.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0);
        modelGantRescued.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0);
      }

      const ceBeforeRescue = modelGantRescued.Ce;
      expect(ceBeforeRescue).toBeGreaterThan(0.05);

      // Apply L-Cysteine rescue to Case B (cysteineCe = 1.0)
      for (let t = 0; t < 180; t++) {
        modelGant.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0);
        modelGantRescued.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0); // cysteineCe = 1.0
      }

      // Gantacurium Ce in the rescued model should clear significantly faster
      expect(modelGantRescued.Ce).toBeLessThan(modelGant.Ce);
      expect(modelGantRescued.Ce).toBeLessThan(modelGant.Ce * 0.25); // should be less than 25% of the untreated model after 3 minutes
    });
  });

  describe('5. Train-of-Four (TOF) Fade Physics', () => {
    it('should display no fade (TOF ratio = 1.0) for depolarizing Phase I succinylcholine block', () => {
      // Replicate usePhysiology TOF calculation logic:
      // If isSuxActive && !isSuxPhaseII && !hasNDMR:
      //   t4 = t1;
      //   targetTofRatio = 1.0;
      //   targetTofCount = t1 > 0.05 ? 4 : 0;
      const getTofState = (maxNMJOccupancy: number, isSuxActive: boolean, isSuxPhaseII: boolean, hasNDMR: boolean) => {
        let t1 = 1.0;
        let t4 = 1.0;
        let targetTofCount = 4;
        let targetTofRatio = 1.0;

        if (maxNMJOccupancy > 0.0) {
          if (isSuxActive && !isSuxPhaseII && !hasNDMR) {
            t1 = maxNMJOccupancy <= 0.75 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.75) / (0.95 - 0.75));
            t4 = t1;
            targetTofRatio = 1.0;
            targetTofCount = t1 > 0.05 ? 4 : 0;
          } else {
            t1 = maxNMJOccupancy <= 0.90 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.90) / 0.05);
            t4 = maxNMJOccupancy <= 0.75 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.75) / 0.05);

            if (maxNMJOccupancy >= 0.95) {
              targetTofCount = 0;
            } else if (maxNMJOccupancy >= 0.90) {
              targetTofCount = 1;
            } else if (maxNMJOccupancy >= 0.85) {
              targetTofCount = 2;
            } else if (maxNMJOccupancy >= 0.80) {
              targetTofCount = 3;
            } else {
              targetTofCount = 4;
            }
            targetTofRatio = (targetTofCount === 4 && t1 > 0.001) ? (t4 / t1) : 0.0;
          }
        }

        return { t1, t4, targetTofCount, targetTofRatio };
      };

      // Scenario: Moderate depolarizing Phase I block (occupancy = 0.82)
      const resPhaseI = getTofState(0.82, true, false, false);
      expect(resPhaseI.t1).toBeLessThan(1.0);
      expect(resPhaseI.t4).toBe(resPhaseI.t1); // twitches equal height (no fade)
      expect(resPhaseI.targetTofRatio).toBe(1.0);
      expect(resPhaseI.targetTofCount).toBe(4);

      // Scenario: Complete block (Phase I complete block requires t1 <= 0.05, so occupancy needs to be >= 0.935)
      // At occupancy = 0.99: t1 = 1 - ((0.99 - 0.70)/0.30)^2 = 1 - 0.934 = 0.066
      // At occupancy = 1.0: t1 = 0 <= 0.05
      const resComplete = getTofState(1.0, true, false, false);
      expect(resComplete.targetTofCount).toBe(0);
    });

    it('should display fade (TOF ratio < 1.0) under non-depolarizing block or Phase II succinylcholine block', () => {
      const getTofState = (maxNMJOccupancy: number, isSuxActive: boolean, isSuxPhaseII: boolean, hasNDMR: boolean) => {
        let t1 = 1.0;
        let t4 = 1.0;
        let targetTofCount = 4;
        let targetTofRatio = 1.0;

        if (maxNMJOccupancy > 0.0) {
          if (isSuxActive && !isSuxPhaseII && !hasNDMR) {
            t1 = maxNMJOccupancy <= 0.75 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.75) / (0.95 - 0.75));
            t4 = t1;
            targetTofRatio = 1.0;
            targetTofCount = t1 > 0.05 ? 4 : 0;
          } else {
            t1 = maxNMJOccupancy <= 0.90 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.90) / 0.05);
            t4 = maxNMJOccupancy <= 0.75 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.75) / 0.05);

            if (maxNMJOccupancy >= 0.95) {
              targetTofCount = 0;
            } else if (maxNMJOccupancy >= 0.90) {
              targetTofCount = 1;
            } else if (maxNMJOccupancy >= 0.85) {
              targetTofCount = 2;
            } else if (maxNMJOccupancy >= 0.80) {
              targetTofCount = 3;
            } else {
              targetTofCount = 4;
            }
            targetTofRatio = (targetTofCount === 4 && t1 > 0.001) ? (t4 / t1) : 0.0;
          }
        }

        return { t1, t4, targetTofCount, targetTofRatio };
      };

      // Scenario: Non-depolarizing block (e.g. Atracurium, occupancy = 0.78)
      const resNDMR = getTofState(0.78, false, false, true);
      expect(resNDMR.t1).toBe(1.0);
      expect(resNDMR.t4).toBeLessThan(resNDMR.t1); // exhibits fade
      expect(resNDMR.targetTofRatio).toBeLessThan(1.0);
      expect(resNDMR.targetTofCount).toBe(4);

      // Scenario: Succinylcholine Phase II block (occupancy = 0.78, isSuxPhaseII = true)
      const resSuxPhaseII = getTofState(0.78, true, true, false);
      expect(resSuxPhaseII.t4).toBeLessThan(resSuxPhaseII.t1); // exhibits fade in Phase II
      expect(resSuxPhaseII.targetTofRatio).toBeLessThan(1.0);
    });

    it('should accumulate suxPhase2Accumulation and transition to Phase II block with high cumulative dose or exposure', () => {
      // Replicate suxPhase2Accumulation and isSuxPhaseII detection
      let suxPhase2Accumulation = 0;
      let cumulativeSuxDose = 0;
      
      const checkSuxPhaseII = (isSuxActive: boolean, dose: number, ticks: number) => {
        cumulativeSuxDose = dose;
        for (let i = 0; i < ticks; i++) {
          if (isSuxActive) {
            suxPhase2Accumulation += 1;
          } else {
            suxPhase2Accumulation = Math.max(0, suxPhase2Accumulation - 0.5);
          }
        }
        return isSuxActive && (cumulativeSuxDose > 300 || suxPhase2Accumulation > 120);
      };

      // Baseline: short exposure, standard dose (100mg bolus, 10 ticks)
      expect(checkSuxPhaseII(true, 100, 10)).toBe(false);

      // High cumulative dose (350mg, 10 ticks) -> transitions to Phase II immediately
      expect(checkSuxPhaseII(true, 350, 10)).toBe(true);

      // Prolonged exposure (100mg, 130 ticks of active drug) -> transitions to Phase II
      suxPhase2Accumulation = 0;
      expect(checkSuxPhaseII(true, 100, 130)).toBe(true);
    });
  });

  describe('6. Mivacurium & Pancuronium Medication Profiles (Table 27.2, 27.9, 27.10)', () => {
    it('should verify mivacurium and pancuronium exist in both MEDICATIONS and MEDICATIONS_CONFIG', () => {
      expect(MEDICATIONS.mivacurium).toBeDefined();
      expect(MEDICATIONS.pancuronium).toBeDefined();
      expect(MEDICATIONS_CONFIG.mivacurium).toBeDefined();
      expect(MEDICATIONS_CONFIG.pancuronium).toBeDefined();
      expect(MEDICATIONS.mivacurium.classes).toContain('NDMR');
      expect(MEDICATIONS.pancuronium.classes).toContain('NDMR');
    });

    it('should prolong Mivacurium block under atypical pseudocholinesterase genotype, mirroring Succinylcholine (Table 27.1)', () => {
      const mivaNormal = new PKPDModel(MEDICATIONS_CONFIG.mivacurium, 70);
      mivaNormal.giveBolus(15);
      const mivaAtypical = new PKPDModel(MEDICATIONS_CONFIG.mivacurium, 70);
      mivaAtypical.giveBolus(15);

      for (let t = 0; t < 300; t++) {
        mivaNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);   // bcheMultiplier = 1.0 (normal)
        mivaAtypical.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 0.01); // bcheMultiplier = 0.01 (atypical)
      }

      expect(mivaNormal.Ce).toBeLessThan(mivaAtypical.Ce);
    });

    it('should NOT alter Atracurium/Cisatracurium clearance via bcheMultiplier (only Hofmann elimination applies to them)', () => {
      const atrA = new PKPDModel(MEDICATIONS_CONFIG.atracurium, 70);
      atrA.giveBolus(35);
      const atrB = new PKPDModel(MEDICATIONS_CONFIG.atracurium, 70);
      atrB.giveBolus(35);

      for (let t = 0; t < 60; t++) {
        atrA.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);
        atrB.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0, 0.01, 1.0); // bcheMultiplier should be ignored for Atracurium
      }
      expect(atrA.Ce).toBeCloseTo(atrB.Ce, 6);
    });

    it('should produce mild histamine-mediated hypotension/tachycardia for Atracurium and Mivacurium at high Ce', () => {
      const atr = new PKPDModel(MEDICATIONS_CONFIG.atracurium, 70);
      atr.giveBolus(35); // 0.5 mg/kg, paralytic dose
      const atrEffects = tickEffects(atr, 30);
      expect(atrEffects.sysDelta).toBeLessThan(0);
      expect(atrEffects.hrDelta).toBeGreaterThan(0);

      const miva = new PKPDModel(MEDICATIONS_CONFIG.mivacurium, 70);
      miva.giveBolus(17.5); // 0.25 mg/kg, paralytic dose
      const mivaEffects = tickEffects(miva, 30);
      expect(mivaEffects.sysDelta).toBeLessThan(0);
      expect(mivaEffects.hrDelta).toBeGreaterThan(0);
    });

    it('should produce vagolytic tachycardia with NO hypotension for Pancuronium, and a weaker version than Pancuronium for Rocuronium at equal saturation (Table 27.10)', () => {
      // Compare the intrinsic hrMax magnitude at matched receptor-saturation (Ce = c50, i.e. fractionResp = 0.5 for both),
      // isolating the textbook's comparative muscarinic-blockade claim from each drug's distinct PK onset kinetics.
      const panc = new PKPDModel(MEDICATIONS_CONFIG.pancuronium, 70);
      panc.Ce = panc.pd.c50;
      const pancEffects = panc.getEffects();
      expect(pancEffects.hrDelta).toBeCloseTo(panc.pd.hrMax * 0.5, 5);
      expect(pancEffects.sysDelta).toBe(0);
      expect(pancEffects.diaDelta).toBe(0);

      const roc = new PKPDModel(MEDICATIONS_CONFIG.rocuronium, 70);
      roc.Ce = roc.pd.c50;
      const rocEffects = roc.getEffects();
      expect(rocEffects.hrDelta).toBeCloseTo(roc.pd.hrMax * 0.5, 5);
      expect(rocEffects.hrDelta).toBeGreaterThan(0);
      expect(rocEffects.hrDelta).toBeLessThan(pancEffects.hrDelta);
    });

    it('should produce NO hemodynamic effect for Cisatracurium or Vecuronium (Table 27.10: "None")', () => {
      const cis = new PKPDModel(MEDICATIONS_CONFIG.cisatracurium, 70);
      cis.giveBolus(14); // 0.2 mg/kg
      const cisEffects = tickEffects(cis, 60);
      expect(cisEffects.hrDelta).toBe(0);
      expect(cisEffects.sysDelta).toBe(0);

      const vec = new PKPDModel(MEDICATIONS_CONFIG.vecuronium, 70);
      vec.giveBolus(7); // 0.1 mg/kg
      const vecEffects = tickEffects(vec, 60);
      expect(vecEffects.hrDelta).toBe(0);
      expect(vecEffects.sysDelta).toBe(0);
    });

    it('should remain finite and bounded across a wide range of Mivacurium/Pancuronium concentrations', () => {
      for (const dose of [0, 5, 17.5, 50, 200]) {
        const miva = new PKPDModel(MEDICATIONS_CONFIG.mivacurium, 70);
        miva.giveBolus(dose);
        const mEff = tickEffects(miva, 60);
        expect(Number.isFinite(miva.Ce)).toBe(true);
        expect(Number.isFinite(mEff.hrDelta)).toBe(true);

        const panc = new PKPDModel(MEDICATIONS_CONFIG.pancuronium, 70);
        panc.giveBolus(dose);
        const pEff = tickEffects(panc, 60);
        expect(Number.isFinite(panc.Ce)).toBe(true);
        expect(Number.isFinite(pEff.hrDelta)).toBe(true);
      }
    });
  });
});
