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
        intravascularVolume: 5000,
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

      // SVR should converge to 15% reduction: SVR_target = 1200 * 0.85 = 1020
      expect(currentVitalsBlocked.svr).toBeCloseTo(1020, 5);
      
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
});
