import { describe, it, expect } from 'vitest';
import { HepaticEngine } from '../engine/HepaticEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';

describe('Chapter 16 Hepatic Physiology and Pathophysiology Unit Tests', () => {

  describe('HepaticEngine Dynamics', () => {
    it('should calculate baseline hepatic blood flow and HVPG', () => {
      const patient = {
        cirrhosisFactor: 0.0,
        bilirubin: 1.0,
        inr: 1.0,
        creatinine: 1.0,
        albumin: 4.0,
        encephalopathyGrade: 0,
        ascitesDegree: 0
      };
      const vitals = {
        mPAP: 15.0,
        HVPG: 5.0,
        pbf: 1000.0,
        habf: 300.0,
        thbf: 1300.0
      };

      const output = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0
      });

      // PBF = 1000 * 1.0 * (1 - 0.5 * 0) = 1000 mL/min
      // HABR efficiency = max(0, 1.0 - 0.6 * 0) * max(0.1, min(1, (90-40)/20)) = 1.0 * 1.0 = 1.0
      // HABF = 300 + max(0, 0.5 * (1000 - 1000)) * 1.0 = 300 mL/min
      // THBF = 1300 mL/min
      // HVPG = 5.0 + 15.0 * 0 = 5.0 mmHg
      // Updated to published values: PBF=1100 (75% of THBF=1500), HABF=400 (25%).
      expect(output.pbf).toBe(1100.0);
      expect(output.habf).toBe(400.0);
      expect(output.thbf).toBe(1500.0);
      expect(output.HVPG).toBe(5.0);
      expect(output.meldScore).toBe(6); // normal bilirubin, inr, creatinine -> raw MELD is ~6.43
      expect(output.childPughClass).toBe('A');
    });

    it('should calculate Child-Pugh and MELD scores accurately for cirrhotic patients', () => {
      const patient = {
        cirrhosisFactor: 0.8,
        bilirubin: 3.5, // 3 pts (bilirubin > 3 mg/dL)
        inr: 2.5,       // 3 pts (INR > 2.3)
        creatinine: 2.8,
        albumin: 2.5,   // 3 pts (albumin < 2.8 g/dL)
        encephalopathyGrade: 2, // 2 pts (Grade 1-2)
        ascitesDegree: 1  // 2 pts (slight ascites)
      }; // total cp points = 3 + 3 + 3 + 2 + 2 = 13 -> CTP Class C

      const vitals = {};
      const output = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 1.0,
        map: 80.0,
        sys: 110.0,
        spo2: 95.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 8.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0
      });

      expect(output.childPughScore).toBe(13);
      expect(output.childPughClass).toBe('C');
      expect(output.operativeMortality).toBe('12-82%');
      expect(output.encephalopathyDescription).toBe('Grade II: Lethargy; behavioral change; asterixis');
      // MELD calculation: 3.78*ln(3.5) + 11.2*ln(2.5) + 9.57*ln(2.8) + 6.43
      // ln(3.5) = 1.2527 -> 3.78*1.2527 = 4.735
      // ln(2.5) = 0.9163 -> 11.2*0.9163 = 10.26
      // ln(2.8) = 1.0296 -> 9.57*1.0296 = 9.85
      // Raw MELD = 4.735 + 10.26 + 9.85 + 6.43 = 31.275 -> 31
      expect(output.meldScore).toBe(31);
    });

    it('should preserve HABR response under Sevoflurane but blunt it under Halothane', () => {
      const patient = {
        cirrhosisFactor: 0.0
      };
      const vitals = {};

      // Test with Sevoflurane (preserves HABR -> efficiency is 1.0)
      const outputSevo = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 0.7, // PBF drops to 700 mL/min
        map: 90.0,
        sys: 120.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0,
        sevoMac: 1.0
      });

      // PBF = 1100 * 0.7 = 770 mL/min (updated from 1000→1100 base)
      // HABR efficiency = max(0, 1 - 0.0) * 1.0 = 1.0 (preserved under Sevo)
      // HABF compensatory flow = 0.5 * (1100 - 770) * 1.0 = 165 mL/min
      // HABF total = 400 + 165 = 565 mL/min
      expect(outputSevo.pbf).toBe(770.0);
      expect(outputSevo.habf).toBe(565.0);

      // Test with Halothane (blunts HABR -> haloMac = 1.0 -> efficiency is 0.0)
      const outputHalo = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 0.7,
        map: 90.0,
        sys: 120.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0,
        haloMac: 1.0
      });

      // PBF = 1100 * 0.7 = 770 mL/min (updated base)
      // HABR efficiency = 0.0 (Halothane fully blunts HABR)
      // HABF = 400 (base) + 0 (no compensation) = 400 mL/min
      expect(outputHalo.habf).toBe(400.0);

      // Test with Halothane + Hypotension (MAP = 50 mmHg -> mapBlunting is (50-40)/20 = 0.5)
      // Since Halothane is 1.0, efficiency is still 0.0.
      const outputHypo = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 0.7,
        map: 50.0,
        sys: 75.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0,
        haloMac: 1.0
      });

      // Halothane + Hypotension: HABR still 0 (haloMac=1 blocks HABR entirely). HABF = 400 base.
      expect(outputHypo.habf).toBe(400.0);
    });

    it('should trigger variceal bleeding on hypertensive surge and resolve with Terlipressin', () => {
      let patient = {
        cirrhosisFactor: 0.8,
        varicealBleedingActive: false,
        varicealBleedTime: null,
        forceVaricealBleed: true
      };
      const vitals = {
        mPAP: 15.0,
        HVPG: 15.0 // Clinically significant portal hypertension
      };

      // 1. Surging sys to 170 mmHg triggers rupture
      let output = HepaticEngine.tick(1, { patient, vitals, time: 100 }, [], {
        coRatio: 1.0,
        map: 120.0,
        sys: 170.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0
      });

      expect(output.varicealBleedingActive).toBe(true);
      expect(output.varicealBleedTime).toBe(100);
      expect(output.activeBleedRate).toBeGreaterThan(0.0);
      expect(output.events).toContain("🚨 CRITICAL EMERGENCY: Sudden hypertensive pressure surge triggered rupture of gastroesophageal varices! Active massive upper gastrointestinal bleeding has begun.");

      // 2. Add Terlipressin to simulate medical management
      patient.varicealBleedingActive = output.varicealBleedingActive;
      patient.varicealBleedTime = output.varicealBleedTime;
      const activeMeds = [{ name: 'Terlipressin', Ce: 0.5 }]; // high concentration splanchnic constriction

      // Tick 70 seconds later with vasoconstrictors active
      output = HepaticEngine.tick(1, { patient, vitals, time: 175 }, activeMeds, {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0
      });

      // After 60 seconds of vasoactive control, bleeding resolves
      expect(output.varicealBleedingActive).toBe(false);
      expect(output.events).toContain("✅ SUCCESS: Splanchnic vasoconstrictor therapy successfully controlled and terminated the variceal hemorrhage.");
    });

    it('should model renal resistance and progressive creatinine accumulation in HRS', () => {
      let patient = {
        cirrhosisFactor: 0.9,
        creatinine: 1.0
      };
      let vitals = {};

      // Tick 100 times to simulate renal vasoconstriction and creatinine accumulation
      for (let i = 0; i < 100; i++) {
        const output = HepaticEngine.tick(1, { patient, vitals, time: i }, [], {
          coRatio: 1.0,
          map: 70.0,
          sys: 100.0,
          spo2: 98.0,
          paco2: 40.0,
          temp: 37.0,
          cvp: 5.0,
          surgicalPhase: 'Pre-Op',
          renalRatio: 1.0, // normal baseline clearance
          FiO2: 21.0
        });
        patient.creatinine = output.creatinine;
      }

      // Creatinine should rise due to high renal resistance (renalArteryResistance = 1.0 + 3.0*0.9*(1-0) = 3.7)
      // dCreatinine = 0.0001 * 3.7 - 0.0001 * 1.0 = 0.00027 per second
      // Over 100 seconds: 1.0 + 0.027 = 1.027
      expect(patient.creatinine).toBeGreaterThan(1.02);
    });

    it('should increase shunting in Hepatopulmonary Syndrome (HPS)', () => {
      const patient = {
        cirrhosisFactor: 0.8
      };
      const vitals = {};

      const outputHPS = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 1.0,
        map: 80.0,
        sys: 110.0,
        spo2: 95.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0 // room air
      });

      // hpsShunt = 0.25 * 0.8 * (1.0 - 0.2 * 0.21) = 0.2 * 0.958 = 0.1916
      expect(outputHPS.hpsShunt).toBeCloseTo(0.1916, 3);
    });

    it('should trigger low CVP resection bleeding based on CVP limits', () => {
      const patient = {
        surgicalProcedure: 'hepatic_resection'
      };
      const vitals = {};

      // 1. CVP is low (3.0 mmHg) -> bleeding is minimal (0.5 mL/s)
      const outputLowCVP = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 3.0,
        surgicalPhase: 'Resection',
        renalRatio: 1.0,
        FiO2: 21.0
      });
      expect(outputLowCVP.activeBleedRate).toBe(0.5);

      // 2. CVP is high (8.0 mmHg) -> bleeding is heavy (2.5 + 1.5*(8-5) = 7.0 mL/s)
      const outputHighCVP = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        spo2: 98.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 8.0,
        surgicalPhase: 'Resection',
        renalRatio: 1.0,
        FiO2: 21.0
      });
      expect(outputHighCVP.activeBleedRate).toBe(7.0);
    });
  });

  describe('Cardiovascular & Respiratory Integration', () => {
    it('should trigger right heart collapse in PoPH on hypoxic/hypercapnic stressors', () => {
      // Setup patient with severe cirrhosis factor to trigger severe PoPH (mPAP = 15 + 25*0.9 = 37.5 mmHg)
      const basePatient = {
        cirrhosisFactor: 0.9,
        isArrest: false,
        cardiacRhythm: 'normal',
        forcePoPHCollapse: true
      };

      const baseVitals = {
        mPAP: 37.5,
        HVPG: 15.0,
        spo2: 80.0, // hypoxic stressor < 85%
        paco2: 40.0
      };

      // Ticking hepatic engine triggers collapse
      const outputHepatic = HepaticEngine.tick(1, { patient: basePatient, vitals: baseVitals, time: 10 }, [], {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        spo2: 80.0,
        paco2: 40.0,
        temp: 37.0,
        cvp: 5.0,
        surgicalPhase: 'Pre-Op',
        renalRatio: 1.0,
        FiO2: 21.0
      });

      expect(outputHepatic.hasPoPHCollapse).toBe(true);

      // Feeding this updated patient to CardiovascularEngine triggers PEA arrest
      const cvOutput = CardiovascularEngine.tick(1, {
        patient: { ...basePatient, hasPoPHCollapse: outputHepatic.hasPoPHCollapse },
        vitals: {
          hr: 70,
          sys: 120,
          dia: 80,
          map: 90,
          co: 5.0,
          svr: 1200,
          temp: 37,
          spo2: 80,
          paco2: 40,
          etco2: 40
        },
        electrolytes: { k: 4.0 },
        time: 11
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
        ruleMapOffset: 0,
        ruleKOffset: 0,
        ruleSpo2Offset: 0
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
        activeMeds: [],
        getAnatomicalParameter: (k, d) => d
      });

      expect(cvOutput.patient.isArrest).toBe(true);
      expect(cvOutput.patient.cardiacRhythm).toBe('pea');
      expect(cvOutput.events).toContain("🚨 CRITICAL EMERGENCY: Acute right ventricular failure from Portopulmonary Hypertension (PoPH) triggered PEA cardiac arrest!");
    });

    it('should add HPS shunt component and decrease oxygenation in RespiratoryEngine', () => {
      const patient = {
        shuntFraction: 0.05,
        oxygenBuffer: 0.3 // Deplete oxygen buffer to force the oximeter model into its active range
      };

      const baseVitals = {
        spo2: 98,
        paco2: 40,
        temp: 37
      };

      const ventSettings = {
        mode: 'spontaneous',
        vt: 500,
        rr: 12,
        peep: 0,
        fio2: 21,
        pinsp: 0,
        ieRatio: 0.5,
        pmax: 40,
        ps: 0
      };

      // Tick respiratory engine with a high HPS shunt contribution (e.g. 0.35)
      const outputResp = RespiratoryEngine.tick(1, {
        patient,
        vitals: baseVitals,
        time: 10
      }, ventSettings, 21.0, {
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
        targetMAP: 90.0,
        targetCO: 5.0,
        hco3: 24.0,
        volatileRightShift: 0.0,
        dpgDepletionShift: 0.0,
        baselinePaCO2: 40.0,
        anaphylaxisCompliancePenalty: 0,
        anaphylaxisResistancePenalty: 0,
        aspirationCompliancePenalty: 0,
        aspirationResistancePenalty: 0,
        hpsShunt: 0.35 // 35% right-to-left shunt from HPS
      });

      // With 35% shunt on room air, target SpO2 should drop significantly
      expect(outputResp.measuredSpo2).toBeLessThan(90);
    });
  });
});
