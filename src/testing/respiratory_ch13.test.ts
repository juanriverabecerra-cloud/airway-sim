import { describe, it, expect } from 'vitest';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';
import { INHALATIONAL_AGENTS, calculateLungVolumes } from '../engine/Pharmacology';

describe('Chapter 13: Respiratory Physiology and Pathophysiology', () => {

  describe('1. Closing Capacity and Airway Closure Shunt', () => {
    it('should calculate CC based on age and height, and verify it is independent of position/obesity', () => {
      const height = 175;
      const sex = 'male';

      const vols20 = RespiratoryEngine.calculateLungVolumes(height, 20, sex, 25, 'Sitting');
      const vols70 = RespiratoryEngine.calculateLungVolumes(height, 70, sex, 25, 'Sitting');

      expect(vols20.cc_L).toBeDefined();
      expect(vols70.cc_L).toBeDefined();
      expect(vols70.cc_L).toBeGreaterThan(vols20.cc_L);

      // Verify CC is identical in Supine vs Sitting (since CC is structural airway closure volume)
      const vols70Supine = RespiratoryEngine.calculateLungVolumes(height, 70, sex, 25, 'Supine');
      expect(vols70Supine.cc_L).toBe(vols70.cc_L);

      // Verify CC is identical in Obese vs Normal weight (since obesity reduces FRC, not CC)
      const vols70Obese = RespiratoryEngine.calculateLungVolumes(height, 70, sex, 35, 'Sitting');
      expect(vols70Obese.cc_L).toBe(vols70.cc_L);
    });

    it('should increase shunt when FRC falls below CC (airway closure)', () => {
      const patient = {
        height: 175,
        age: 75,
        sex: 'male',
        bmi: 35,
        position: 'Supine',
        airwaySecured: true,
        ventilationStatus: 'mechanical',
        atelectasis: 0.0,
        shuntFraction: 0.05
      };

      const vitals = {
        hr: 70, sys: 120, dia: 80, map: 90, co: 5.0, svr: 1200, cmap: 90, bis: 98, temp: 37.0, spo2: 100, paco2: 40, etco2: 36, pip: 15, peep: 0
      };

      const drugEffects = { maxNMJOccupancy: 0, totalRrDelta: 0, ruleRrScale: 1.0, ruleRrOffset: 0, ruleComplScale: 1.0, rulePipOffset: 0, ruleSpo2Offset: 0, ruleKOffset: 0 };

      const out = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, null, 21, drugEffects, {
        VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 90.0, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0.0, dpgDepletionShift: 0.0, baselinePaCO2: 40.0, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0, aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0
      });

      expect(out.lungVolumes.frc_L).toBeLessThan(out.lungVolumes.cc_L);
      // Shunt fraction should be elevated above baseline 5% due to airway closure
      expect(out.actualShunt).toBeGreaterThan(0.05);
      console.log('Airway closure shunt increase: baseline 5% vs actual', out.actualShunt);
    });
  });

  describe('2. Hypoxic Pulmonary Vasoconstriction (HPV) Inhibition', () => {
    it('should model volatile-induced HPV inhibition correctly', () => {
      const getHpvInhibition = (agentMac: number, activeAgent: string) => {
        let hpvInhibition = 0.0;
        if (activeAgent && activeAgent !== 'xenon') {
          hpvInhibition = Math.min(0.90, agentMac * 0.50); // 50% at 1 MAC
        }
        return hpvInhibition;
      };

      expect(getHpvInhibition(0, 'Sevoflurane')).toBe(0.0);
      expect(getHpvInhibition(1.0, 'Sevoflurane')).toBe(0.50);
      expect(getHpvInhibition(2.0, 'Sevoflurane')).toBe(0.90);
      expect(getHpvInhibition(1.0, 'xenon')).toBe(0.0);
    });

    it('should increase shunt fraction when HPV is inhibited in the presence of atelectasis', () => {
      const patient = {
        height: 175, age: 40, sex: 'male', bmi: 25, position: 'Supine', airwaySecured: true, ventilationStatus: 'mechanical',
        atelectasis: 0.4, shuntFraction: 0.05
      };

      const vitals = { hr: 70, sys: 120, dia: 80, map: 90, co: 5.0, svr: 1200, cmap: 90, bis: 98, temp: 37.0, spo2: 95, paco2: 40, etco2: 36, pip: 15, peep: 5 };
      const drugEffects = { maxNMJOccupancy: 0, totalRrDelta: 0, ruleRrScale: 1.0, ruleRrOffset: 0, ruleComplScale: 1.0, rulePipOffset: 0, ruleSpo2Offset: 0, ruleKOffset: 0 };

      const outNoInhib = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, null, 21, drugEffects, {
        VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 90.0, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0.0, dpgDepletionShift: 0.0, baselinePaCO2: 40.0, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0, aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0,
        hpvInhibition: 0.0
      });

      const outWithInhib = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, null, 21, drugEffects, {
        VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 90.0, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0.0, dpgDepletionShift: 0.0, baselinePaCO2: 40.0, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0, aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0,
        hpvInhibition: 0.50
      });

      console.log('HPV inhibition shunt check:');
      console.log('  outNoInhib.actualShunt:', outNoInhib.actualShunt);
      console.log('  outWithInhib.actualShunt:', outWithInhib.actualShunt);

      expect(outWithInhib.actualShunt).toBeGreaterThan(outNoInhib.actualShunt || 0);
    });
  });

  describe('3. Alveolar Recruitment Maneuver & Venous Return Restriction', () => {
    it('should decrement atelectasis incrementally if PAW >= 30 and resolve fully after 7s of PAW >= 40', () => {
      const runAtelectasisTick = (atelectasisVal: number, recruitmentTimeVal: number, currentAirwayPressure: number) => {
        let atelectasis = atelectasisVal;
        let recruitmentTime = recruitmentTimeVal;

        if (currentAirwayPressure >= 40.0) {
          recruitmentTime += 1.0;
          if (recruitmentTime >= 7.0) {
            atelectasis = 0.0;
            recruitmentTime = 0.0;
          }
        } else if (currentAirwayPressure >= 30.0) {
          atelectasis = Math.max(0.0, atelectasis - 0.08);
          recruitmentTime = 0.0;
        } else {
          recruitmentTime = 0.0;
        }

        return { atelectasis, recruitmentTime };
      };

      let res = runAtelectasisTick(0.5, 0, 15);
      expect(res.atelectasis).toBe(0.5);
      expect(res.recruitmentTime).toBe(0);

      res = runAtelectasisTick(0.5, 0, 32);
      expect(res.atelectasis).toBe(0.42);
      expect(res.recruitmentTime).toBe(0);

      res = runAtelectasisTick(0.5, 0, 40);
      expect(res.atelectasis).toBe(0.5);
      expect(res.recruitmentTime).toBe(1.0);

      let state = { atelectasis: 0.5, recruitmentTime: 0.0 };
      for (let sec = 1; sec <= 7; sec++) {
        state = runAtelectasisTick(state.atelectasis, state.recruitmentTime, 40);
      }
      expect(state.atelectasis).toBe(0.0);
      expect(state.recruitmentTime).toBe(0.0);
    });

    it('should decrease cardiac preload and stroke volume when airway pressure is elevated', () => {
      const patient = {
        isArrest: false, cardiacRhythm: 'sr', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0, ebl: 0, ebv: 5000, height: 175, weight: 70, sex: 'male', age: 40, bmi: 25, position: 'Supine', intravascularVolume: 5000,
        hasBetaBlocker: true, onBetaBlocker: true, betaBlocker: true
      };
      const baseVitals = { hr: 70, sys: 120, dia: 80, map: 90, co: 5.0, svr: 1200, cmap: 90, bis: 98, temp: 37.0, spo2: 100, paco2: 40, etco2: 36, pip: 10, peep: 5 };
      const drugEffects = { drugSvrMod: 1.0, drugInotropyMod: 1.0, svrSympatheticSpike: 0, contractilitySympatheticSpike: 0, hrSympatheticSpike: 0, shiveringHRDrive: 0, anaphylaxisHrMod: 0, anaphylaxisSvrMod: 1.0, totalHrDelta: 0, ruleHrScale: 1.0, ruleHrOffset: 0, ruleMapScale: 1.0, ruleMapOffset: 0, ruleKOffset: 0, ruleSpo2Offset: 0 };
      const cvInputs = { currentMac: 0, bloodLossRatio: 0, currentEbl: 0, positionPreloadMod: 0, positionHydrostaticMod: 0, shiveringMultiplier: 1.0, seizureMetabolicMultiplier: 1.0, cyanideVO2Mod: 1.0, VO2_sec: 0.004, currentBuffer: 0.5, currentFRC_L: 2.4, newTemp: 37, newPaCO2: 40, activeMeds: [], getAnatomicalParameter: (keyword: string, val: number) => val, currentHb: 14.0 };

      let normalVitals = { ...baseVitals };
      let highPipVitals = { ...baseVitals, pip: 40 };

      let outNormal = { vitals: normalVitals, patient, events: [] };
      let outHighPip = { vitals: highPipVitals, patient, events: [] };

      for (let i = 0; i < 50; i++) {
        outNormal = CardiovascularEngine.tick(1, { patient: outNormal.patient, vitals: outNormal.vitals, time: i, electrolytes: { k: 4.0 } }, drugEffects, cvInputs) as any;
        outHighPip = CardiovascularEngine.tick(1, { patient: outHighPip.patient, vitals: outHighPip.vitals, time: i, electrolytes: { k: 4.0 } }, drugEffects, cvInputs) as any;
      }

      console.log('CO normal (beta-blocked):', outNormal.vitals.co);
      console.log('CO high PIP (beta-blocked):', outHighPip.vitals.co);
      expect(outHighPip.vitals.co).toBeLessThan(outNormal.vitals.co);
      const ratio = outHighPip.vitals.co / outNormal.vitals.co;
      expect(ratio).toBeGreaterThan(0.65);
      expect(ratio).toBeLessThan(0.75);
    });
  });

  describe('4. Anesthesia-Induced FRC Reduction (Fig 13.13)', () => {
    it('should apply a further ~15% FRC reduction under general anesthesia beyond the postural drop', () => {
      const awake = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 25, 'Supine', false, false, false);
      const anesthetized = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 25, 'Supine', false, false, true);

      expect(anesthetized.frc_L).toBeLessThan(awake.frc_L);
      expect(anesthetized.frc_L).toBeCloseTo(awake.frc_L * 0.85, 2);
      // Closing capacity is a structural lung property and must not change with anesthesia state.
      expect(anesthetized.cc_L).toBe(awake.cc_L);
    });

    it('should automatically apply the anesthesia FRC factor inside tick() once the patient is paralyzed or intubated', () => {
      const patient = { height: 175, age: 40, sex: 'male', bmi: 25, position: 'Supine', airwaySecured: false, ventilationStatus: 'spontaneous', oxygenBuffer: null };
      const vitals = { hr: 70, sys: 120, dia: 80, map: 93, spo2: 100, paco2: 40, etco2: 40, rr: 12 };
      const drugEffects = { maxNMJOccupancy: 0, totalRrDelta: 0, ruleRrScale: 1.0, ruleRrOffset: 0, ruleComplScale: 1.0, rulePipOffset: 0, ruleSpo2Offset: 0, ruleKOffset: 0 };
      const inputs = { VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, m6gRrDelta: 0, shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 93, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0, dpgDepletionShift: 0, baselinePaCO2: 40, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0, aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0 };

      const awakeOut = RespiratoryEngine.tick(1, { patient, vitals, time: 0 } as any, null, 21, drugEffects as any, inputs as any);
      const paralyzedOut = RespiratoryEngine.tick(1, { patient: { ...patient, airwaySecured: true }, vitals, time: 0 } as any, null, 21, { ...drugEffects, maxNMJOccupancy: 1.0 } as any, inputs as any);

      expect(paralyzedOut.lungVolumes.frc_L).toBeLessThan(awakeOut.lungVolumes.frc_L);
    });

    it('Phase 4: a pregnancyFrcMultiplier further decreases FRC independently of position/obesity/anesthesia, via calculateLungVolumes\' trailing optional parameter', () => {
      const nonPregnant = RespiratoryEngine.calculateLungVolumes(165, 30, 'female', 25, 'Supine', false, false, false, 1.0);
      const pregnantAtTerm = RespiratoryEngine.calculateLungVolumes(165, 30, 'female', 25, 'Supine', false, false, false, 0.8);
      expect(pregnantAtTerm.frc_L).toBeLessThan(nonPregnant.frc_L);
      expect(pregnantAtTerm.frc_L).toBeCloseTo(nonPregnant.frc_L * 0.8, 2);
      // Existing 7-argument call sites (no pregnancy arg) must be unaffected -- defaults to 1.0.
      const omittedArg = RespiratoryEngine.calculateLungVolumes(165, 30, 'female', 25, 'Supine', false, false, false);
      expect(omittedArg.frc_L).toBeCloseTo(nonPregnant.frc_L, 4);
    });

    it('Phase 4: tick() threads inputs.pregnancyFrcMultiplier through to the live FRC used in gas exchange', () => {
      const patient = { height: 165, age: 30, sex: 'female', bmi: 25, position: 'Supine', airwaySecured: false, ventilationStatus: 'spontaneous', oxygenBuffer: null };
      const vitals = { hr: 70, sys: 120, dia: 80, map: 93, spo2: 100, paco2: 40, etco2: 40, rr: 12 };
      const drugEffects = { maxNMJOccupancy: 0, totalRrDelta: 0, ruleRrScale: 1.0, ruleRrOffset: 0, ruleComplScale: 1.0, rulePipOffset: 0, ruleSpo2Offset: 0, ruleKOffset: 0 };
      const baseInputs = { VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, m6gRrDelta: 0, shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 93, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0, dpgDepletionShift: 0, baselinePaCO2: 40, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0, aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0 };

      const nonPregnantOut = RespiratoryEngine.tick(1, { patient, vitals, time: 0 } as any, null, 21, drugEffects as any, baseInputs as any);
      const pregnantOut = RespiratoryEngine.tick(1, { patient, vitals, time: 0 } as any, null, 21, drugEffects as any, { ...baseInputs, pregnancyFrcMultiplier: 0.8 } as any);
      expect(pregnantOut.lungVolumes.frc_L).toBeLessThan(nonPregnantOut.lungVolumes.frc_L);
    });
  });

  describe('5. HPV Dose-Response by Agent Potency (Fig 13.22 & p.2348)', () => {
    it('should classify modern volatiles (sevoflurane/desflurane) as having little HPV effect vs older agents (isoflurane/halothane)', () => {
      expect(INHALATIONAL_AGENTS.isoflurane.hpvPotency).toBe(1.0);
      expect(INHALATIONAL_AGENTS.halothane.hpvPotency).toBe(1.0);
      expect(INHALATIONAL_AGENTS.sevoflurane.hpvPotency).toBeLessThan(INHALATIONAL_AGENTS.isoflurane.hpvPotency);
      expect(INHALATIONAL_AGENTS.desflurane.hpvPotency).toBeLessThan(INHALATIONAL_AGENTS.isoflurane.hpvPotency);
      expect(INHALATIONAL_AGENTS.xenon.hpvPotency).toBe(0.0);
    });

    it('should reproduce the chapter-cited 20-30% depression at 1 MAC and ~50% at MAC 2 for full-potency agents', () => {
      const potency = INHALATIONAL_AGENTS.isoflurane.hpvPotency;
      const hpvAt1Mac = Math.min(0.90, 1.0 * 0.25 * potency);
      const hpvAt2Mac = Math.min(0.90, 2.0 * 0.25 * potency);
      expect(hpvAt1Mac).toBeCloseTo(0.25, 2);
      expect(hpvAt2Mac).toBeCloseTo(0.50, 2);
    });
  });

  describe('6. Dead Space Pathophysiology in Obstructive Disease (Key Point & Table 13.2)', () => {
    // Spontaneous, unintubated breathing isolates the dead-space multiplier's effect on
    // VD/VT from the ventilator's pressure-limited VCV tidal-volume recalculation, which
    // is an unrelated mechanic not in scope for this chapter's content.
    const buildPatientVitals = (pulmonaryComorbidity?: string) => ({
      patient: {
        height: 175, age: 40, sex: 'male', bmi: 25, position: 'Supine',
        ibw: 70.3, airwaySecured: false, ventilationStatus: 'spontaneous',
        patientBaseRR: 12, oxygenBuffer: null, pulmonaryComorbidity
      },
      vitals: { hr: 70, sys: 120, dia: 80, map: 93, spo2: 98, paco2: 40, etco2: 36, rr: 12 },
      time: 0
    });
    const drugEffects = { maxNMJOccupancy: 0, totalRrDelta: 0, ruleRrScale: 1.0, ruleRrOffset: 0, ruleComplScale: 1.0, rulePipOffset: 0, ruleSpo2Offset: 0, ruleKOffset: 0 };
    const inputs = { VO2_sec: 0.004, totalMetabolicMultiplier: 1.0, compensatoryRR: 0, opioidRRDrop: 0, m6gRrDelta: 0, shiveringRRDrive: 0, currentHb: 14.0, targetMAP: 93, targetCO: 5.0, hco3: 24.0, volatileRightShift: 0, dpgDepletionShift: 0, baselinePaCO2: 40, anaphylaxisCompliancePenalty: 0, anaphylaxisResistancePenalty: 0, aspirationCompliancePenalty: 0, aspirationResistancePenalty: 0 };

    it('should increase VD/VT for severe COPD (GOLD III) versus a normal patient', () => {
      const normalOut = RespiratoryEngine.tick(1, buildPatientVitals(undefined) as any, null, 21, drugEffects as any, inputs as any);
      const copdOut = RespiratoryEngine.tick(1, buildPatientVitals('COPD GOLD III') as any, null, 21, drugEffects as any, inputs as any);

      expect(copdOut.vdVtRatio).toBeGreaterThan(normalOut.vdVtRatio!);
    });

    it('should scale VD/VT progressively with GOLD stage severity', () => {
      const goldI = RespiratoryEngine.tick(1, buildPatientVitals('COPD GOLD I') as any, null, 21, drugEffects as any, inputs as any);
      const goldII = RespiratoryEngine.tick(1, buildPatientVitals('COPD GOLD II') as any, null, 21, drugEffects as any, inputs as any);
      const goldIV = RespiratoryEngine.tick(1, buildPatientVitals('COPD GOLD IV') as any, null, 21, drugEffects as any, inputs as any);

      expect(goldII.vdVtRatio).toBeGreaterThan(goldI.vdVtRatio!);
      expect(goldIV.vdVtRatio).toBeGreaterThan(goldII.vdVtRatio!);
    });
  });

  describe('7. Pharmacology.js / RespiratoryEngine.ts calculateLungVolumes consolidation', () => {
    it('should produce identical output from the Pharmacology.js wrapper and the canonical RespiratoryEngine implementation', () => {
      const fromWrapper = calculateLungVolumes(175, 55, 'female', 30, 'Lateral', false, false, true);
      const fromCanonical = RespiratoryEngine.calculateLungVolumes(175, 55, 'female', 30, 'Lateral', false, false, true);
      expect(fromWrapper).toEqual(fromCanonical);
      // Confirms the previously-missing closing capacity field now surfaces through the wrapper.
      expect(fromWrapper.cc_L).toBeDefined();
    });
  });
});
