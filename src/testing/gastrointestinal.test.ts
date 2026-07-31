import { describe, it, expect } from 'vitest';
import { GastrointestinalEngine } from '../engine/GastrointestinalEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';

describe('Chapter 15 Gastrointestinal Physiology and Pathophysiology Unit Tests', () => {

  describe('GastrointestinalEngine Dynamics', () => {
    it('should calculate baseline LES tone and gastric pressure', () => {
      const patient = { stomach: 'empty' };
      const vitals = { bowelGasVolume: 1.0, gutMotility: 1.0 };
      const output = GastrointestinalEngine.tick(1, { patient, vitals, time: 10 }, [], {
        EtN_2O: 0,
        currentMac: 0,
        C_cat: 0,
        positivePressureVentilationActive: false,
        spontaneousBreathingActive: true
      });

      expect(output.lesTone).toBe(25.0);
      expect(output.gastricPressure).toBe(7.0);
      expect(output.hasRegurgitated).toBe(false);
      expect(output.hasAspirated).toBe(false);
    });

    it('should depress LES tone under Propofol and volatile anesthetics', () => {
      const patient = { stomach: 'full' };
      const vitals = { bowelGasVolume: 1.0 };
      const activeMeds = [{ name: 'Propofol', Ce: 3.0 }];
      
      const output = GastrointestinalEngine.tick(1, { patient, vitals, time: 10 }, activeMeds, {
        EtN_2O: 0,
        currentMac: 1.0,
        C_cat: 0,
        positivePressureVentilationActive: false,
        spontaneousBreathingActive: true
      });

      // propofolCe = 3.0 -> propofolCe/2.5 = 1.2.
      // 1.0 - 0.4 * 1.2 - 0.3 * 1.0 = 1.0 - 0.48 - 0.3 = 0.22.
      // lesTone = 25 * 0.22 = 5.5.
      expect(output.lesTone).toBeCloseTo(5.5, 1);
    });

    it('should trigger regurgitation and aspiration when sux fasciculation spikes gastric pressure on full stomach', () => {
      const patient = {
        stomach: 'full',
        suxInjectionTime: 100,
        airwaySecured: false
      };
      const vitals = { bowelGasVolume: 1.0 };
      const activeMeds = [
        { name: 'Propofol', Ce: 2.5 },
        { name: 'Succinylcholine', Ce: 1.0 }
      ];

      // Sux is within 45s window (time: 120 -> timeSinceSux: 20)
      const output = GastrointestinalEngine.tick(1, { patient, vitals, time: 120 }, activeMeds, {
        EtN_2O: 0,
        currentMac: 0.5,
        C_cat: 0,
        positivePressureVentilationActive: true,
        spontaneousBreathingActive: false
      });

      // Propofol Ce = 2.5 -> PropCe/2.5 = 1.0.
      // LES Tone = 25 * max(0.2, 1.0 - 0.4*1.0 - 0.3*0.5) = 25 * max(0.2, 1.0 - 0.4 - 0.15) = 25 * 0.45 = 11.25.
      // Gastric Pressure = 7.0 + 15.0 * 1.0 = 22.0.
      // Since 22.0 > 11.25, regurgitation should occur.
      // Since positivePressureVentilationActive is true, aspiration should occur.
      expect(output.lesTone).toBeCloseTo(11.25, 1);
      expect(output.gastricPressure).toBe(22.0);
      expect(output.hasRegurgitated).toBe(true);
      expect(output.hasAspirated).toBe(true);
      expect(output.events).toContain("🚨 CRITICAL EMERGENCY: Gastric Aspiration Chemical Pneumonitis! Stomach contents have entered the lungs due to low LES barrier pressure.");
    });

    it('should expand bowel gas volume under Nitrous oxide exposure', () => {
      const patient = {};
      const vitals = { bowelGasVolume: 1.0 };
      
      // Tick 10 seconds under 70% EtN2O
      let currentVitals = { ...vitals };
      for (let i = 0; i < 10; i++) {
        const output = GastrointestinalEngine.tick(1, { patient, vitals: currentVitals, time: i }, [], {
          EtN_2O: 70.0,
          currentMac: 0,
          C_cat: 0,
          positivePressureVentilationActive: false,
          spontaneousBreathingActive: true
        });
        currentVitals.bowelGasVolume = output.bowelGasVolume;
      }

      expect(currentVitals.bowelGasVolume).toBeGreaterThan(1.0);
    });

    it('should calculate POI duration and gut motility block by opioids', () => {
      const patientOpen = { manipulationIndex: 1.0 };
      const vitals = { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 };
      
      const activeMeds = [{ name: 'Fentanyl', Ce: 5.0 / 500 }]; // maxOpioidCe = 5.0 -> opioidBlock = 5/6 = 0.833
      
      const output = GastrointestinalEngine.tick(1, { patient: patientOpen, vitals, time: 10 }, activeMeds, {
        EtN_2O: 0,
        currentMac: 0,
        C_cat: 0,
        positivePressureVentilationActive: false,
        spontaneousBreathingActive: true
      });

      expect(output.gutMotility).toBeLessThan(0.2); // severely suppressed by opioid
      expect(output.postoperativeIleus).toBeCloseTo(72.0, 1); // 72 hours for open surgery
    });

    it('should show protection of POI duration and motility under sympathetic block (TEA)', () => {
      const patientEpidural = {
        manipulationIndex: 1.0,
        epiduralBlockActive: true
      };
      const vitals = { bowelGasVolume: 1.0, inflammatoryIleus: 0.0 };
      
      const output = GastrointestinalEngine.tick(1, { patient: patientEpidural, vitals, time: 10 }, [], {
        EtN_2O: 0,
        currentMac: 0,
        C_cat: 40.0, // High stress catech drive
        positivePressureVentilationActive: false,
        spontaneousBreathingActive: true
      });

      // postOpIleus duration should be reduced by celiac/epidural sympathetic block:
      // duration = 72 * 1.0 * (1 - 1 * 0.36) * 1.0 = 46.08 hours
      expect(output.postoperativeIleus).toBeCloseTo(46.08, 1);
    });
  });

  describe('Cardiovascular and Respiratory Integration', () => {
    it('should sequester blood volume in splanchnic circulation under epidural block and restore MAP with Phenylephrine', () => {
      const basePatient = {
        ebv: 5000,
        intravascularVolume: 0,
        patientBaseSVR: 1200,
        patientBaseHR: 70,
        patientBaseSV: 70,
        patientBaseSBP: 120,
        patientBaseDBP: 80,
        epiduralBlockActive: true // TEA active
      };

      const baseVitals = {
        hr: 70,
        sys: 120,
        dia: 80,
        map: 90,
        co: 5.0,
        svr: 1200,
        temp: 37,
        spo2: 98,
        paco2: 40,
        etco2: 40
      };

      // 1. Tick 50 times without alpha-agonist to allow convergence -> Splanchnic blood volume sequestered (offset: 300mL) and SVR blunted
      let currentVitalsBlocked = { ...baseVitals };
      for (let i = 0; i < 50; i++) {
        const output = CardiovascularEngine.tick(1, {
          patient: basePatient,
          vitals: currentVitalsBlocked,
          electrolytes: { k: 4.0 },
          time: 10 + i
        }, {
          drugSvrMod: 1.0,
          drugInotropyMod: 1.0,
          svrSympatheticSpike: 0,
          contractilitySympatheticSpike: 0,
          hrSympatheticSpike: 0,
          shiveringHRDrive: 0,
          anaphylaxisHrMod: 0,
          anaphylaxisSvrMod: 1.0,
          totalHrDelta: 0,
          ruleHrScale: 1.0,
          ruleHrOffset: 0,
          ruleMapScale: 1.0,
          ruleMapOffset: 0
        }, {
          currentMac: 0,
          bloodLossRatio: 0,
          currentEbl: 0,
          positionPreloadMod: 0,
          positionHydrostaticMod: 0,
          shiveringMultiplier: 1.0,
          seizureMetabolicMultiplier: 1.0,
          cyanideVO2Mod: 1.0,
          VO2_sec: 0.004,
          currentBuffer: 0.5,
          currentFRC_L: 2.4,
          newTemp: 37,
          newPaCO2: 40,
          activeMeds: [] // no alpha agonist
        });
        currentVitalsBlocked = output.vitals;
      }

      // SVR should converge to ~15% reduction: SVR_target = 1200 * 0.85 = 1020. The
      // differential nerve block model (Phase 3, mutable-roaming-newell.md) means full
      // sympathetic block now asymptotically approaches 1.0 (~0.998 at surgical-strength
      // concentration) rather than hitting exactly 1.0, so this is no longer bit-for-bit
      // 1020 -- a real, intentional, sub-1% consequence of the more physiologically
      // complete model, not a precision bug.
      // Layer 2 F5 fix: displayed svr is now the identity-consistent measured value; the vasomotor
      // tone this sympathetic-block test targets is svrTone.
      expect((currentVitalsBlocked as any).svrTone).toBeCloseTo(1020, 0);
      
      // 2. Tick 50 times with Phenylephrine (alpha-agonist active)
      let currentVitalsTreated = { ...baseVitals };
      for (let i = 0; i < 50; i++) {
        const output = CardiovascularEngine.tick(1, {
          patient: basePatient,
          vitals: currentVitalsTreated,
          electrolytes: { k: 4.0 },
          time: 10 + i
        }, {
          drugSvrMod: 1.0,
          drugInotropyMod: 1.0,
          svrSympatheticSpike: 0,
          contractilitySympatheticSpike: 0,
          hrSympatheticSpike: 0,
          shiveringHRDrive: 0,
          anaphylaxisHrMod: 0,
          anaphylaxisSvrMod: 1.0,
          totalHrDelta: 0,
          ruleHrScale: 1.0,
          ruleHrOffset: 0,
          ruleMapScale: 1.0,
          ruleMapOffset: 0
        }, {
          currentMac: 0,
          bloodLossRatio: 0,
          currentEbl: 0,
          positionPreloadMod: 0,
          positionHydrostaticMod: 0,
          shiveringMultiplier: 1.0,
          seizureMetabolicMultiplier: 1.0,
          cyanideVO2Mod: 1.0,
          VO2_sec: 0.004,
          currentBuffer: 0.5,
          currentFRC_L: 2.4,
          newTemp: 37,
          newPaCO2: 40,
          activeMeds: [{ name: 'Phenylephrine', A1: 1.0 }] // active alpha-agonist
        });
        currentVitalsTreated = output.vitals;
      }

      // MAP/perfusion should be significantly higher with phenylephrine active than without
      expect(currentVitalsTreated.map).toBeGreaterThan(currentVitalsBlocked.map);
    });

    it('should compress diaphragmatic compliance under bowel distension', () => {
      const patient = {
        height: 170,
        age: 40,
        sex: 'male',
        bmi: 25,
        position: 'Supine',
        ibw: 70,
        airwaySecured: true,
        ventilationStatus: 'mechanical',
        oxygenBuffer: 0.5
      };

      const baseVitals = {
        hr: 70,
        sys: 120,
        dia: 80,
        map: 90,
        co: 5.0,
        svr: 1200,
        temp: 37,
        spo2: 98,
        paco2: 40,
        etco2: 40,
        bowelGasVolume: 2.5 // severe bowel distension
      };

      const ventSettings = {
        mode: 'VCV',
        vt: 500,
        rr: 12,
        peep: 5,
        fio2: 0.5,
        pinsp: 20,
        ieRatio: 2.0,
        pmax: 40,
        ps: 10
      };

      const output = RespiratoryEngine.tick(1, { patient, vitals: baseVitals, time: 10 }, ventSettings, 0.5, {
        maxNMJOccupancy: 0,
        totalRrDelta: 0,
        ruleRrScale: 1.0,
        ruleRrOffset: 0,
        ruleComplScale: 1.0,
        rulePipOffset: 0,
        ruleSpo2Offset: 0,
        ruleKOffset: 0
      }, {
        VO2_sec: 0.004,
        totalMetabolicMultiplier: 1.0,
        compensatoryRR: 0,
        opioidRRDrop: 0,
        m6gRrDelta: 0,
        shiveringRRDrive: 0,
        currentHb: 14.0,
        targetMAP: 90,
        targetCO: 5.0,
        hco3: 24,
        volatileRightShift: 0,
        dpgDepletionShift: 0,
        baselinePaCO2: 40,
        anaphylaxisCompliancePenalty: 0,
        anaphylaxisResistancePenalty: 0,
        aspirationCompliancePenalty: 0,
        aspirationResistancePenalty: 0
      });

      // Baseline compliance is 65. Supposed Trendelenburg and obesity are 0.
      // bowelGasVolume: 2.5 -> ComplianceMod_bowel = 1.0 / (1.0 + 0.3 * 1.5) = 1.0 / 1.45 = 0.689.
      // Compliance should be around 65 * 0.689 = 44.8.
      expect(output.compliance).toBeCloseTo(44.8, 1.0);
    });

    it('should trigger swallowing apnea and inhibit ventilation drive', () => {
      const patient = {
        height: 170,
        age: 40,
        sex: 'male',
        bmi: 25,
        position: 'Supine',
        ibw: 70,
        airwaySecured: false,
        ventilationStatus: 'spontaneous',
        oxygenBuffer: 0.5,
        swallowingActive: true // Swallowing reflex active
      };

      const baseVitals = {
        hr: 70,
        sys: 120,
        dia: 80,
        map: 90,
        co: 5.0,
        svr: 1200,
        temp: 37,
        spo2: 98,
        paco2: 40,
        etco2: 40,
        rr: 12
      };

      const output = RespiratoryEngine.tick(1, { patient, vitals: baseVitals, time: 10 }, null, 0.21, {
        maxNMJOccupancy: 0,
        totalRrDelta: 0,
        ruleRrScale: 1.0,
        ruleRrOffset: 0,
        ruleComplScale: 1.0,
        rulePipOffset: 0,
        ruleSpo2Offset: 0,
        ruleKOffset: 0
      }, {
        VO2_sec: 0.004,
        totalMetabolicMultiplier: 1.0,
        compensatoryRR: 0,
        opioidRRDrop: 0,
        m6gRrDelta: 0,
        shiveringRRDrive: 0,
        currentHb: 14.0,
        targetMAP: 90,
        targetCO: 5.0,
        hco3: 24,
        volatileRightShift: 0,
        dpgDepletionShift: 0,
        baselinePaCO2: 40,
        anaphylaxisCompliancePenalty: 0,
        anaphylaxisResistancePenalty: 0,
        aspirationCompliancePenalty: 0,
        aspirationResistancePenalty: 0
      });

      // Swallowing active causes immediate apnea
      expect(output.isApneic).toBe(true);
      expect(output.vitals.rr).toBe(0);
      expect(output.vitals.vte).toBe(0);
      expect(output.currentAlvVent_L_min).toBe(0);
    });
  });

  describe('Phase 4 GI Subdivision: gastric content model + segment-specific motility/ileus', () => {
    it('exposes real gastric volume/pH instead of leaving them orphaned', () => {
      const patient = { stomach: 'empty', npoSolids: 8, npoLiquids: 2 };
      const vitals = {};
      const output = GastrointestinalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(output.gastricVolume).toBeGreaterThan(0);
      expect(output.gastricPH).toBeGreaterThan(0);
    });

    it('freezes aspirationEventSeverity at the moment of aspiration and carries it forward unchanged afterward', () => {
      const patient = {
        stomach: 'full', npoSolids: 0.5, npoLiquids: 0.2,
        suxInjectionTime: 100, airwaySecured: false
      };
      const activeMeds = [{ name: 'Propofol', Ce: 2.5 }, { name: 'Succinylcholine', Ce: 1.0 }];
      const firstOutput = GastrointestinalEngine.tick(1, { patient, vitals: {}, time: 120 }, activeMeds, {
        EtN_2O: 0, currentMac: 0.5, C_cat: 0, positivePressureVentilationActive: true, spontaneousBreathingActive: false
      });
      expect(firstOutput.hasAspirated).toBe(true);
      expect(firstOutput.aspirationEventSeverity).toBeGreaterThan(0);

      // A second tick, even with very different (now-fasted) gastric content, must not change the
      // already-frozen severity of the event that already happened.
      const patientAfter = { ...patient, hasAspirated: true, aspirationEventSeverity: firstOutput.aspirationEventSeverity, gastricVolume: 5, gastricPH: 6.5 };
      const secondOutput = GastrointestinalEngine.tick(1, { patient: patientAfter, vitals: {}, time: 121 }, activeMeds, {
        EtN_2O: 0, currentMac: 0.5, C_cat: 0, positivePressureVentilationActive: true, spontaneousBreathingActive: false
      });
      expect(secondOutput.aspirationEventSeverity).toBeCloseTo(firstOutput.aspirationEventSeverity, 4);
    });

    it('recovers small bowel motility fastest, stomach next, and colon slowest after the same surgical insult', () => {
      const patient = { manipulationIndex: 1.0 };
      const vitals = { inflammatoryIleus: 0.8 };
      const output = GastrointestinalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(output.smallBowelMotility).toBeGreaterThan(output.stomachMotility);
      expect(output.stomachMotility).toBeGreaterThan(output.colonicMotility);
    });

    it('produces per-segment ileus duration estimates ordered small bowel < stomach < colon, with the composite equal to the colonic (slowest) figure', () => {
      const patient = { manipulationIndex: 1.0 };
      const output = GastrointestinalEngine.tick(1, { patient, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(output.smallBowelIleusDurationHours).toBeLessThan(output.stomachIleusDurationHours);
      expect(output.stomachIleusDurationHours).toBeLessThan(output.colonicIleusDurationHours);
      expect(output.postoperativeIleus).toBeCloseTo(output.colonicIleusDurationHours, 2);
    });

    it('carries forward (does not reset to zero) the per-segment ileus duration estimates once manipulation stops', () => {
      const intraop = GastrointestinalEngine.tick(1, { patient: { manipulationIndex: 1.0 }, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const postClosureVitals = {
        stomachIleusDurationHours: intraop.stomachIleusDurationHours,
        smallBowelIleusDurationHours: intraop.smallBowelIleusDurationHours,
        colonicIleusDurationHours: intraop.colonicIleusDurationHours
      };
      const pacu = GastrointestinalEngine.tick(1, { patient: { manipulationIndex: 0 }, vitals: postClosureVitals, time: 3600 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(pacu.colonicIleusDurationHours).toBeCloseTo(intraop.colonicIleusDurationHours, 2);
      expect(pacu.postoperativeIleus).toBeGreaterThan(0);
    });
  });

  describe('Phase 4 aspiration-prophylaxis pharmacology: Sodium Citrate, Famotidine, Pantoprazole, Metoclopramide', () => {
    it('Metoclopramide raises LES tone above baseline, on top of (not replacing) the existing Propofol/volatile depression', () => {
      const baseline = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const withMetoclopramide = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [{ name: 'Metoclopramide', Ce: 1.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(withMetoclopramide.lesTone).toBeGreaterThan(baseline.lesTone);

      const depressedPlusMetoclopramide = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 },
        [{ name: 'Propofol', Ce: 3.0 }, { name: 'Metoclopramide', Ce: 1.0 }], {
          EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
        });
      const depressedOnly = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [{ name: 'Propofol', Ce: 3.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(depressedPlusMetoclopramide.lesTone).toBeGreaterThan(depressedOnly.lesTone);
    });

    it('Metoclopramide, by raising LES tone above gastric pressure, can prevent the aspiration trigger from firing at all', () => {
      const patientWithoutProkinetic = { stomach: 'full', suxInjectionTime: 100, airwaySecured: false };
      const withoutMetoclopramide = GastrointestinalEngine.tick(1, { patient: patientWithoutProkinetic, vitals: {}, time: 120 },
        [{ name: 'Propofol', Ce: 1.5 }, { name: 'Succinylcholine', Ce: 1.0 }], {
          EtN_2O: 0, currentMac: 0.3, C_cat: 0, positivePressureVentilationActive: true, spontaneousBreathingActive: false
        });
      expect(withoutMetoclopramide.hasAspirated).toBe(true);

      const withMetoclopramide = GastrointestinalEngine.tick(1, { patient: patientWithoutProkinetic, vitals: {}, time: 120 },
        [{ name: 'Propofol', Ce: 1.5 }, { name: 'Succinylcholine', Ce: 1.0 }, { name: 'Metoclopramide', Ce: 5.0 }], {
          EtN_2O: 0, currentMac: 0.3, C_cat: 0, positivePressureVentilationActive: true, spontaneousBreathingActive: false
        });
      expect(withMetoclopramide.hasAspirated).toBe(false);
      expect(withMetoclopramide.hasRegurgitated).toBe(false);
    });

    it('Sodium Citrate, Famotidine, and Pantoprazole Ce values flow from activeMeds through to a raised gastricPH', () => {
      const patient = { stomach: 'empty', npoSolids: 8, npoLiquids: 2 };
      const none = GastrointestinalEngine.tick(600, { patient, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const withCitrate = GastrointestinalEngine.tick(600, { patient, vitals: {}, time: 0 }, [{ name: 'Sodium Citrate', Ce: 3.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const withFamotidine = GastrointestinalEngine.tick(600, { patient, vitals: {}, time: 0 }, [{ name: 'Famotidine', Ce: 1.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const withPantoprazole = GastrointestinalEngine.tick(600, { patient, vitals: {}, time: 0 }, [{ name: 'Pantoprazole', Ce: 2.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(withCitrate.gastricPH).toBeGreaterThan(none.gastricPH);
      expect(withFamotidine.gastricPH).toBeGreaterThan(none.gastricPH);
      expect(withPantoprazole.gastricPH).toBeGreaterThan(none.gastricPH);
      expect(withPantoprazole.ppiSuppressionLevel).toBeGreaterThan(0);
    });

    it('ppiSuppressionLevel carries forward across ticks via vitals/patient propagation, not reset each tick', () => {
      const patient = { stomach: 'empty', npoSolids: 8, npoLiquids: 2 };
      const tick1 = GastrointestinalEngine.tick(3600, { patient, vitals: {}, time: 0 }, [{ name: 'Pantoprazole', Ce: 2.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const patientAfter = { ...patient, ppiSuppressionLevel: tick1.ppiSuppressionLevel, gastricVolume: tick1.gastricVolume, gastricPH: tick1.gastricPH };
      const tick2 = GastrointestinalEngine.tick(3600, { patient: patientAfter, vitals: {}, time: 3600 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(tick2.ppiSuppressionLevel).toBeGreaterThan(0);
      expect(tick2.gastricPH).toBeGreaterThanOrEqual(tick1.gastricPH - 0.5);
    });

    it('Mendelson severity grading scales with patient weight, threaded from patient.weight', () => {
      const fixedVolumeLowPH = { stomach: 'empty', gastricVolume: 30, gastricPH: 1.5 };
      const smallPatient = GastrointestinalEngine.tick(1, { patient: { ...fixedVolumeLowPH, weight: 40 }, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const largePatient = GastrointestinalEngine.tick(1, { patient: { ...fixedVolumeLowPH, weight: 150 }, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      expect(smallPatient.aspirationSeverityIndex).toBeGreaterThan(largePatient.aspirationSeverityIndex);
    });
  });

  describe('Phase 4 pregnancy physiology integration: LES tone penalty and GI motility slowing', () => {
    it('pregnancyLesTonePenalty reduces LES tone, on top of (not replacing) the existing Propofol/volatile depression', () => {
      const baseline = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const pregnant = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true,
        pregnancyLesTonePenalty: 0.25
      });
      expect(pregnant.lesTone).toBeLessThan(baseline.lesTone);
    });

    it('pregnancyGiSlowing flows through to GastricEmptyingModel as a persistent-gastroparesis-style condition', () => {
      const patient = { stomach: 'empty', npoSolids: 8, npoLiquids: 2 };
      const notPregnant = GastrointestinalEngine.tick(1, { patient, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true
      });
      const pregnant = GastrointestinalEngine.tick(1, { patient, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true,
        pregnancyGiSlowing: true
      });
      expect(pregnant.gastricVolume).toBeGreaterThan(notPregnant.gastricVolume);
    });

    it('Metoclopramide can still raise LES tone above a pregnancy-depressed baseline', () => {
      const pregnantOnly = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true,
        pregnancyLesTonePenalty: 0.25
      });
      const pregnantWithMetoclopramide = GastrointestinalEngine.tick(1, { patient: {}, vitals: {}, time: 0 }, [{ name: 'Metoclopramide', Ce: 5.0 }], {
        EtN_2O: 0, currentMac: 0, C_cat: 0, positivePressureVentilationActive: false, spontaneousBreathingActive: true,
        pregnancyLesTonePenalty: 0.25
      });
      expect(pregnantWithMetoclopramide.lesTone).toBeGreaterThan(pregnantOnly.lesTone);
    });
  });
});
