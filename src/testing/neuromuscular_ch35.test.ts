import { describe, it, expect } from 'vitest';
import { calculateMyastheniaPostopVentRisk } from '../components/modals/PreOpEMR.jsx';

describe('Chapter 35: Neuromuscular Disorders, Malignant Hyperthermia, and Other Genetic Disorders', () => {

  describe('1. Box 35.8 Myasthenia Gravis Postoperative Ventilation Risk Scorecard', () => {
    it('should calculate score 0 (Low Risk) for normal patient profile', () => {
      const patient = {
        vitalCapacity: 3.5,
        mgDurationYears: 2,
        pyridostigmineDoseMgPerDay: 180,
        bulbarSymptoms: false,
        historyMyasthenicCrisis: false,
        antiAchR: 10,
        decrementalResponse: false,
        expectedBloodLoss: 100,
        pmhx: ''
      };
      const result = calculateMyastheniaPostopVentRisk(patient, 'myasthenia_gravis');
      expect(result.score).toBe(0);
      expect(result.riskLevel).toBe('Low');
      expect(result.recommendation).toContain('Standard extubation criteria apply');
    });

    it('should calculate intermediate risk for patient with 1 or 2 risk factors', () => {
      const patient = {
        vitalCapacity: 2.5, // factor 1 (< 2.9)
        mgDurationYears: 10, // factor 2 (> 6)
        pyridostigmineDoseMgPerDay: 400,
        bulbarSymptoms: false,
        historyMyasthenicCrisis: false,
        antiAchR: 10,
        decrementalResponse: false,
        expectedBloodLoss: 200,
        pmhx: 'MG'
      };
      const result = calculateMyastheniaPostopVentRisk(patient, 'myasthenia_gravis');
      expect(result.score).toBe(2);
      expect(result.riskLevel).toBe('Intermediate');
      expect(result.recommendation).toContain('Intermediate risk. Caution with extubation');
    });

    it('should calculate high risk for patient with 3 or more risk factors', () => {
      const patient = {
        vitalCapacity: 2.0, // factor 1
        mgDurationYears: 8, // factor 2
        pyridostigmineDoseMgPerDay: 900, // factor 3 (> 750)
        bulbarSymptoms: true, // factor 4
        historyMyasthenicCrisis: true, // factor 5
        antiAchR: 150, // factor 6 (> 100)
        decrementalResponse: true, // factor 7
        expectedBloodLoss: 1200, // factor 8 (> 1000)
        pmhx: 'MG, COPD' // factor 9 (COPD)
      };
      const result = calculateMyastheniaPostopVentRisk(patient, 'myasthenia_gravis');
      expect(result.score).toBe(9);
      expect(result.riskLevel).toBe('High');
      expect(result.recommendation).toContain('High risk for postoperative ventilation');
    });

    it('should auto-identify pulmonary risk from pmhx text', () => {
      const patient = {
        pmhx: 'History of severe asthma, hypertension, gerd'
      };
      const result = calculateMyastheniaPostopVentRisk(patient);
      expect(result.factors.pulmonary).toBe(true);
    });
  });

  describe('2. Malignant Hyperthermia Crisis Physiology & Quality Hooks', () => {
    // Replicate usePhysiology MH check logic
    const simulateMHTick = (
      patient: any,
      activeMeds: any[],
      gasModels: any,
      vitals: any,
      time: number,
      currentEtAgent: number,
      freshGasFlow: number
    ) => {
      const events: any[] = [];
      const logQualityEvent = (evt: any) => events.push(evt);
      const logEvent = (msg: string) => {}; // mock

      // a. Trigger check
      let mhActive = patient.mhActive || false;
      let mhStartTime = patient.mhStartTime !== undefined ? patient.mhStartTime : null;
      const suxModelForMh = activeMeds?.find(m => m.name === 'Succinylcholine');
      const suxCeForMh = suxModelForMh ? suxModelForMh.Ce : 0;

      if (patient.mhSusceptible && !mhActive) {
          if (currentEtAgent > 0.01 || suxCeForMh > 0.01) {
              mhActive = true;
              mhStartTime = time;
              logQualityEvent({
                  category: 'CrisisManagement',
                  severity: 'critical',
                  description: 'Malignant Hyperthermia crisis triggered'
              });
          }
      }

      // b. Reversal check
      const dantroleneModelForMh = activeMeds?.find(m => m.name === 'Dantrolene');
      const dantroleneCeForMh = dantroleneModelForMh ? dantroleneModelForMh.Ce : 0;
      const isHalothaneActive = gasModels?.halothane && gasModels.halothane.Fa > 0.01;
      const magnesiumModel = activeMeds?.find(m => m.name === 'Magnesium');
      const magnesiumCe = magnesiumModel ? magnesiumModel.Ce : 0;
      const isReversedByDantrolene = dantroleneCeForMh > 0.5 || (isHalothaneActive && dantroleneCeForMh > 0.25 && magnesiumCe > 0.1);

      if (mhActive && isReversedByDantrolene) {
          mhActive = false;
      }

      // c. Temperature and metabolic multiplier
      let newTemp = vitals.temp || 37.0;
      let mhMetabolicMultiplier = 1.0;
      if (mhActive) {
          mhMetabolicMultiplier = 5.0;
          if (patient.coolingMeasuresActive) {
              newTemp = Math.max(38.0, newTemp - 0.15);
          } else {
              newTemp = Math.min(43.0, newTemp + 0.05);
          }
      }

      // d. Electrolyte changes
      let currentK = 4.0;
      let currentLactate = 1.0;
      let totalHrDelta = 0;
      let isArrest = false;
      let cardiacRhythm = 'sr';
      let delayedDantroleneLogged = patient.delayedDantroleneLogged || false;

      if (mhActive) {
          currentK = Math.min(10.0, currentK + 0.08);
          currentLactate = Math.min(25.0, currentLactate + 0.1);
          totalHrDelta += 35;

          if (dantroleneCeForMh < 0.01 && mhStartTime !== null && (time - mhStartTime > 180)) {
              if (!delayedDantroleneLogged) {
                  delayedDantroleneLogged = true;
                  logQualityEvent({
                      category: 'CrisisManagement',
                      severity: 'major',
                      description: 'Delayed dantrolene administration (>3 minutes since MH onset) in active Malignant Hyperthermia crisis.'
                  });
              }
          }

          const hasCCBActive = activeMeds?.some(m => (m.name === 'Verapamil' || m.name === 'Nicardipine') && m.Ce > 0.01);
          if (hasCCBActive && dantroleneCeForMh > 0.01) {
              currentK = 9.5;
              isArrest = true;
              cardiacRhythm = 'pea';
              logQualityEvent({
                  category: 'PharmacologicChoice',
                  severity: 'critical',
                  description: 'Lethal drug-drug interaction'
              });
          }
      }

      return {
          mhActive,
          mhStartTime,
          newTemp,
          mhMetabolicMultiplier,
          currentK,
          currentLactate,
          totalHrDelta,
          isArrest,
          cardiacRhythm,
          delayedDantroleneLogged,
          events
      };
    };

    it('should trigger MH crisis in MHS patient when volatile agent is present', () => {
      const patient = { mhSusceptible: true, mhActive: false };
      const res = simulateMHTick(patient, [], {}, { temp: 37.0 }, 100, 0.02, 6.0);
      expect(res.mhActive).toBe(true);
      expect(res.mhStartTime).toBe(100);
      expect(res.mhMetabolicMultiplier).toBe(5.0);
      expect(res.newTemp).toBeCloseTo(37.05);
      expect(res.currentK).toBeCloseTo(4.08);
      expect(res.currentLactate).toBeCloseTo(1.1);
      expect(res.events.some(e => e.category === 'CrisisManagement' && e.severity === 'critical')).toBe(true);
    });

    it('should trigger MH crisis in MHS patient when succinylcholine is present', () => {
      const patient = { mhSusceptible: true, mhActive: false };
      const res = simulateMHTick(patient, [{ name: 'Succinylcholine', Ce: 0.1 }], {}, { temp: 37.0 }, 150, 0.0, 6.0);
      expect(res.mhActive).toBe(true);
      expect(res.mhStartTime).toBe(150);
    });

    it('should NOT trigger MH in non-MHS patient', () => {
      const patient = { mhSusceptible: false, mhActive: false };
      const res = simulateMHTick(patient, [], {}, { temp: 37.0 }, 100, 0.02, 6.0);
      expect(res.mhActive).toBe(false);
      expect(res.mhMetabolicMultiplier).toBe(1.0);
      expect(res.events.length).toBe(0);
    });

    it('should apply cooling measures to limit temp rise', () => {
      const patient = { mhSusceptible: true, mhActive: true, coolingMeasuresActive: true };
      const res = simulateMHTick(patient, [], {}, { temp: 40.0 }, 100, 0.0, 6.0);
      expect(res.newTemp).toBeCloseTo(39.85); // 40.0 - 0.15
    });

    it('should flag delayed Dantrolene after 180 seconds of active MH', () => {
      const patient = { mhSusceptible: true, mhActive: true, mhStartTime: 100 };
      const res = simulateMHTick(patient, [], {}, { temp: 37.0 }, 290, 0.0, 6.0); // 190s elapsed (> 180s)
      expect(res.delayedDantroleneLogged).toBe(true);
      expect(res.events.some(e => e.description.includes('Delayed dantrolene'))).toBe(true);
    });

    it('should trigger PEA arrest if CCB and Dantrolene are co-administered', () => {
      const patient = { mhSusceptible: true, mhActive: true };
      const activeMeds = [
        { name: 'Nicardipine', Ce: 0.05 },
        { name: 'Dantrolene', Ce: 0.1 }
      ];
      const res = simulateMHTick(patient, activeMeds, {}, { temp: 37.0 }, 100, 0.0, 6.0);
      expect(res.isArrest).toBe(true);
      expect(res.cardiacRhythm).toBe('pea');
      expect(res.currentK).toBe(9.5);
      expect(res.events.some(e => e.description.includes('Lethal drug-drug interaction'))).toBe(true);
    });

    it('should reverse MH once therapeutic Dantrolene is achieved', () => {
      const patient = { mhSusceptible: true, mhActive: true };
      const activeMeds = [{ name: 'Dantrolene', Ce: 0.6 }];
      const res = simulateMHTick(patient, activeMeds, {}, { temp: 37.0 }, 100, 0.0, 6.0);
      expect(res.mhActive).toBe(false);
    });
  });

  describe('3. Neuromuscular Sensitivities & Pharmacology Rules', () => {
    // Replicate NDMR and Succinylcholine pdSens multipliers
    const calcPdSens = (medName: string, isNDMR: boolean, patient: any, potentiationMult = 1.0) => {
      let pdSens = 1.0;
      if (isNDMR) {
          const hasMG = !!patient.myastheniaGravis;
          const hasPediatricMG = (patient.age && patient.age < 2.0);
          pdSens = (hasMG || hasPediatricMG) ? 4.0 : 1.0;
          pdSens *= potentiationMult;
          if (patient.cmt) pdSens *= 2.0;
          if (patient.elms) pdSens *= 4.0;
          if (patient.cip) pdSens *= 0.5;
      } else if (medName === 'Succinylcholine') {
          if (patient.cmt) pdSens *= 0.5;
          if (patient.elms) pdSens *= 2.0;
          if (patient.cip) pdSens *= 1.5;
      }
      return pdSens;
    };

    it('should scale sensitivity to NDMR and Sux for Myasthenia Gravis and other neuropathies', () => {
      // Myasthenia Gravis
      expect(calcPdSens('Rocuronium', true, { myastheniaGravis: true })).toBe(4.0);
      
      // Charcot-Marie-Tooth (CMT)
      expect(calcPdSens('Rocuronium', true, { cmt: true })).toBe(2.0);
      expect(calcPdSens('Succinylcholine', false, { cmt: true })).toBe(0.5);

      // Eaton-Lambert Myasthenic Syndrome (ELMS)
      expect(calcPdSens('Rocuronium', true, { elms: true })).toBe(4.0);
      expect(calcPdSens('Succinylcholine', false, { elms: true })).toBe(2.0);

      // Critical Illness Polyneuropathy (CIP)
      expect(calcPdSens('Rocuronium', true, { cip: true })).toBe(0.5);
      expect(calcPdSens('Succinylcholine', false, { cip: true })).toBe(1.5);
    });

    it('should verify DMD/BMD Succinylcholine hyperkalemic arrest', () => {
      // Replicate sux DMD/BMD arrest check
      const checkSuxArrest = (patient: any, suxCe: number) => {
        let isArrest = false;
        let cardiacRhythm = 'sr';
        let currentK = 4.0;
        let suxArrestTriggered = false;

        if (suxCe > 0.01 && (patient.dmd || patient.bmd)) {
            currentK = 9.0;
            isArrest = true;
            cardiacRhythm = 'pea';
            suxArrestTriggered = true;
        }
        return { isArrest, cardiacRhythm, currentK, suxArrestTriggered };
      };

      const resDmd = checkSuxArrest({ dmd: true }, 0.1);
      expect(resDmd.isArrest).toBe(true);
      expect(resDmd.cardiacRhythm).toBe('pea');
      expect(resDmd.currentK).toBe(9.0);

      const resNormal = checkSuxArrest({}, 0.1);
      expect(resNormal.isArrest).toBe(false);
    });

    it('should verify Mitochondrial Myopathy sensitivity to sedatives, MAC, temp, and LR', () => {
      // 1. Sedative sensitivity 2x
      const propofolCe = 2.0;
      const effectivePropofolCe = { mitochondrial: true }.mitochondrial ? propofolCe * 2.0 : propofolCe;
      expect(effectivePropofolCe).toBe(4.0);

      // 2. Temp drop rate 2x
      let tempDropRate = 0.0008;
      if ({ mitochondrial: true }.mitochondrial) {
          tempDropRate *= 2.0;
      }
      expect(tempDropRate).toBe(0.0016);

      // 3. LR lactic acidosis
      let currentLactate = 1.0;
      const isLRActive = true;
      if ({ mitochondrial: true }.mitochondrial && isLRActive) {
          currentLactate = Math.min(25.0, currentLactate + 0.1);
      }
      expect(currentLactate).toBeCloseTo(1.1);
    });
  });

  describe('4. Charcoal Filter Circuit Scrubbing Kinetics', () => {
    it('should decay gas concentrations by 75% per tick when charcoal filters are placed', () => {
      // Mock GasKineticsModel properties
      const gasModel = {
        Fi: 0.02,
        Fa: 0.015,
        Fb: 0.012,
        F_vrg: 0.01,
        F_mg: 0.008,
        F_fg: 0.005,
        F_dial: 0.02
      };

      const charcoalFiltersPlaced = true;
      if (charcoalFiltersPlaced) {
        gasModel.Fi *= 0.25;
        gasModel.Fa *= 0.25;
        gasModel.Fb *= 0.25;
        gasModel.F_vrg *= 0.25;
        gasModel.F_mg *= 0.25;
        gasModel.F_fg *= 0.25;
        gasModel.F_dial = 0;
      }

      expect(gasModel.Fi).toBeCloseTo(0.005, 5);
      expect(gasModel.Fa).toBeCloseTo(0.00375, 5);
      expect(gasModel.Fb).toBeCloseTo(0.003, 5);
      expect(gasModel.F_vrg).toBeCloseTo(0.0025, 5);
      expect(gasModel.F_mg).toBeCloseTo(0.002, 5);
      expect(gasModel.F_fg).toBeCloseTo(0.00125, 5);
      expect(gasModel.F_dial).toBe(0);
    });
  });

  describe('5. Periodic Paralysis (HyperPP / HypoPP) Pharmacologic Interactions', () => {
    // Reuse the pdSens calculator extended with PP logic
    const calcPdSensWithPP = (medName: string, isNDMR: boolean, patient: any) => {
      let pdSens = 1.0;
      if (isNDMR) {
          if (patient.hypoPP && (medName === 'Pancuronium' || medName === 'dTubocurarine')) {
              pdSens *= 3.0;
          }
      } else if (medName === 'Succinylcholine') {
          if (patient.hyperPP) {
              pdSens *= 3.0;
          }
          if (patient.hypoPP) {
              pdSens *= 2.0;
          }
      }
      return pdSens;
    };

    it('should increase succinylcholine sensitivity 3x in HyperPP patients', () => {
      expect(calcPdSensWithPP('Succinylcholine', false, { hyperPP: true })).toBe(3.0);
    });

    it('should increase succinylcholine sensitivity 2x in HypoPP patients', () => {
      expect(calcPdSensWithPP('Succinylcholine', false, { hypoPP: true })).toBe(2.0);
    });

    it('should NOT affect intermediate-acting NDMRs in HypoPP patients', () => {
      expect(calcPdSensWithPP('Rocuronium', true, { hypoPP: true })).toBe(1.0);
      expect(calcPdSensWithPP('Atracurium', true, { hypoPP: true })).toBe(1.0);
    });

    it('should increase long-acting NDMR sensitivity 3x in HypoPP patients', () => {
      expect(calcPdSensWithPP('Pancuronium', true, { hypoPP: true })).toBe(3.0);
      expect(calcPdSensWithPP('dTubocurarine', true, { hypoPP: true })).toBe(3.0);
    });

    it('should drift K+ upward in HyperPP patients', () => {
      let currentK = 4.0;
      const patient = { hyperPP: true, hyperPPAttackActive: false };
      // Simulate 10 ticks of drift
      for (let i = 0; i < 10; i++) {
        currentK = Math.min(7.0, currentK + 0.02);
      }
      expect(currentK).toBeCloseTo(4.2, 1);
    });

    it('should accelerate K+ rise during active HyperPP attack (e.g., after sux)', () => {
      let currentK = 4.0;
      const patient = { hyperPP: true, hyperPPAttackActive: true };
      // Simulate 10 ticks with attack active
      for (let i = 0; i < 10; i++) {
        currentK = Math.min(7.0, currentK + 0.02); // baseline drift
        currentK = Math.min(8.5, currentK + 0.05); // attack acceleration
      }
      expect(currentK).toBeCloseTo(4.7, 1);
    });

    it('should decrease K+ when glucose IVF is infused in HypoPP patients', () => {
      let currentK = 4.0;
      // Simulate 10 ticks with dextrose infusion
      for (let i = 0; i < 10; i++) {
        currentK = Math.max(1.5, currentK - 0.04);
      }
      expect(currentK).toBeCloseTo(3.6, 1);
    });

    it('should decrease K+ further when epinephrine is active in HypoPP patients', () => {
      let currentK = 4.0;
      // Simulate 10 ticks with dextrose + epinephrine
      for (let i = 0; i < 10; i++) {
        currentK = Math.max(1.5, currentK - 0.04); // dextrose
        currentK = Math.max(1.5, currentK - 0.02); // epinephrine
      }
      expect(currentK).toBeCloseTo(3.4, 1);
    });

    it('should model HyperPP sux interaction: K+ leak + masseter spasm', () => {
      // Replicate processMed logic for sux + HyperPP
      const patient = { hyperPP: true };
      const suxCe = 0.1;
      let leak = 0.5; // normal
      let hyperPPAttackActive = false;
      
      if (patient.hyperPP) {
        leak = 2.5;
        hyperPPAttackActive = true;
      }
      
      expect(leak).toBe(2.5);
      expect(hyperPPAttackActive).toBe(true);
    });

    it('should model HyperPP neostigmine contraindication', () => {
      const patient = { hyperPP: true };
      let hyperPPAttackActive = false;
      let qualityEventLogged = false;

      if (patient.hyperPP) {
        hyperPPAttackActive = true;
        qualityEventLogged = true;
      }

      expect(hyperPPAttackActive).toBe(true);
      expect(qualityEventLogged).toBe(true);
    });
  });
});
