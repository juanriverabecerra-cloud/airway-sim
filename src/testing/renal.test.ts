import { describe, it, expect } from 'vitest';
import { RenalEngine } from '../engine/RenalEngine';
import { PKPDModel } from '../engine/PKPDEngine';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';

describe('Chapter 17 Renal Physiology and Pathophysiology Unit Tests', () => {

  describe('RenalEngine Core Physiology', () => {
    it('should calculate baseline GFR, RBF, and UOP under normal conditions', () => {
      const patient = {
        weight: 70.0,
        baselineCreatinine: 0.85,
        baselineBun: 12.0,
        creatinine: 0.85,
        bun: 12.0,
        urineOutput: 0.0,
        glucose: 100.0
      };
      const vitals = {};
      const output = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0, // 0 sympathetic tone for baseline GFR of 125
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });

      // Assert GFR and RBF are at baseline values
      expect(output.gfr).toBeCloseTo(125.0, 1);
      expect(output.rbf).toBeCloseTo(1100.0, 1);
      expect(output.urineOutputRate).toBeDefined();
      expect(output.osm).toBeCloseTo(297.84, 1); // 2*140 + 2*4 + 12/2.8 + 100/18 = 297.84
      expect(output.vasopressinLevel).toBeGreaterThan(0.0);
    });

    it('should scale down GFR and RBF under hypotension and cease GFR completely at MAP <= 50', () => {
      const patient = { weight: 70.0 };
      const vitals = {};

      // 1. Moderate Hypotension (MAP = 70 mmHg -> RPP = 65 mmHg)
      const output70 = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 1.0,
        map: 70.0,
        sys: 100.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 10.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });
      expect(output70.gfr).toBeLessThan(125.0);
      expect(output70.rbf).toBeLessThan(1100.0);
      expect(output70.gfr).toBeGreaterThan(0.0);

      // 2. Severe Hypotension (MAP = 45 mmHg -> RPP = 40 mmHg)
      const output45 = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 1.0,
        map: 45.0,
        sys: 65.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 10.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });
      // Filtration ceases completely below MAP 50
      expect(output45.gfr).toBe(0.0);
    });

    it('should model UOP drop in stress/hypovolemia and dramatic uop elevation under loop diuretics', () => {
      const patient = { weight: 70.0 };
      const vitals = {};

      // Scenario A: Stress and high systemic venous resistance / sympathetic activity (oliguria risk)
      const outputStress = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 0.8,
        map: 75.0,
        sys: 105.0,
        cvp: 12.0,
        peep: 5.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 40.0, // High stress
        ebl: 1200.0, // 24% blood loss
        ebv: 5000.0,
        netFluidBalance: -500.0
      });

      // Scenario B: Active Furosemide administration
      const activeMeds = [{ name: 'Furosemide', Ce: 1.5 }];
      const outputFurosemide = RenalEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 10.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });

      expect(outputFurosemide.urineOutputRate).toBeGreaterThan(outputStress.urineOutputRate);
      expect(outputStress.urineOutputRate).toBeLessThan(40.0); // Concentrated oliguric uop
    });
  });

  describe('KDIGO AKI Staging Progression', () => {
    it('should calculate KDIGO stages correctly based on oliguria/anuria timers and creatinine ratios', () => {
      const vitals = {};
      const baseInputs = {
        coRatio: 1.0,
        map: 90.0,
        sys: 120.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      };

      // 1. Stage 0 (baseline)
      const out0 = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85, uopOliguriaTimer: 0, uopAnuriaTimer: 0 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out0.akiStage).toBe(0);

      // 2. Stage 1 (Oliguria >= 6h)
      const out1_timer = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85, uopOliguriaTimer: 7 * 3600, uopAnuriaTimer: 0 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out1_timer.akiStage).toBe(1);

      // 3. Stage 1 (Creatinine ratio >= 1.5)
      const out1_cr = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85 * 1.6, uopOliguriaTimer: 0, uopAnuriaTimer: 0 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out1_cr.akiStage).toBe(1);

      // 4. Stage 2 (Oliguria >= 12h)
      const out2_timer = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85, uopOliguriaTimer: 13 * 3600, uopAnuriaTimer: 0 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out2_timer.akiStage).toBe(2);

      // 5. Stage 2 (Creatinine ratio >= 2.0)
      const out2_cr = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85 * 2.1, uopOliguriaTimer: 0, uopAnuriaTimer: 0 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out2_cr.akiStage).toBe(2);

      // 6. Stage 3 (Anuria >= 12h)
      const out3_anuria = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85, uopOliguriaTimer: 13 * 3600, uopAnuriaTimer: 13 * 3600 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out3_anuria.akiStage).toBe(3);

      // 7. Stage 3 (Creatinine ratio >= 3.0)
      const out3_cr = RenalEngine.tick(1, {
        patient: { weight: 70, baselineCreatinine: 0.85, creatinine: 0.85 * 3.1, uopOliguriaTimer: 0, uopAnuriaTimer: 0 },
        vitals, time: 0
      }, [], baseInputs);
      expect(out3_cr.akiStage).toBe(3);
    });

    it('should accumulate creatinine and BUN over time when GFR is zero', () => {
      let patient = {
        weight: 70.0,
        baselineCreatinine: 0.85,
        baselineBun: 12.0,
        creatinine: 0.85,
        bun: 12.0,
        urineOutput: 0.0,
        uopOliguriaTimer: 0,
        uopAnuriaTimer: 0,
        akiDamage: 0.0,
        akiStage: 0
      };
      let vitals = {};

      // Run 100 ticks under severe hypotension to show accumulation
      for (let t = 0; t < 100; t++) {
        const out = RenalEngine.tick(1, { patient, vitals, time: t }, [], {
          coRatio: 1.0,
          map: 40.0,
          sys: 60.0,
          cvp: 5.0,
          peep: 0.0,
          temp: 37.0,
          currentMac: 0.0,
          C_cat: 0.0,
          ebl: 0.0,
          ebv: 5000.0,
          netFluidBalance: 0.0
        });
        patient.creatinine = out.creatinine;
        patient.bun = out.bun;
      }

      expect(patient.creatinine).toBeGreaterThan(0.85);
      expect(patient.bun).toBeGreaterThan(12.0);
    });
  });

  describe('Integration with PK/PD & Respiratory Engines', () => {
    it('should blunt sugammadex renal clearance when GFR is dynamically reduced', () => {
      const sugammadexProfile = MEDICATIONS_CONFIG.sugammadex;
      expect(sugammadexProfile.pk.renalFraction).toBe(1.0);

      // Scenario A: Normal dynamic clearance (renalRatio = 1.0, GFR = 100)
      const modelNormal = new PKPDModel(sugammadexProfile, 70);
      modelNormal.giveBolus(200);

      // Scenario B: Severely blunted clearance (renalRatio = 0.15, GFR = 15)
      const modelImpaired = new PKPDModel(sugammadexProfile, 70);
      modelImpaired.giveBolus(200);

      for (let t = 0; t < 600; t++) {
        modelNormal.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
        modelImpaired.tick(1, 1.0, 1.0, 0.15, 1.0, 1.0);
      }

      const normalMass = modelNormal.A1 + modelNormal.A2 + modelNormal.A3;
      const impairedMass = modelImpaired.A1 + modelImpaired.A2 + modelImpaired.A3;

      expect(normalMass).toBeLessThan(impairedMass);
    });

    it('should trigger respiratory compliance penalty from fluid overload edema in RespiratoryEngine', () => {
      const patient = {
        shuntFraction: 0.02,
        oxygenBuffer: 0.8,
        airwaySecured: true // Must secure airway for ventilation loops to run
      };
      const vitals = {
        spo2: 99.0,
        paco2: 40.0,
        temp: 37.0
      };
      const ventSettings = {
        mode: 'VCV', // VCV mode uses vt and compliance
        vt: 500,
        rr: 12,
        peep: 5,
        fio2: 50.0,
        pinsp: 0,
        ieRatio: 0.5,
        pmax: 40,
        ps: 0
      };

      const drugEffects = {
        maxNMJOccupancy: 0,
        totalRrDelta: 0,
        ruleRrScale: 1.0,
        ruleRrOffset: 0,
        ruleComplScale: 1.0,
        rulePipOffset: 0,
        ruleSpo2Offset: 0,
        ruleKOffset: 0
      };

      const inputsNormal = {
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
        fluidOverloadCompliancePenalty: 0 // No fluid overload
      };

      const outNormal = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, ventSettings, 50.0, drugEffects, inputsNormal);

      // Now trigger fluid overload compliance penalty (25 mL/cmH2O compliance penalty)
      const inputsOverload = {
        ...inputsNormal,
        fluidOverloadCompliancePenalty: 25.0
      };

      const outOverload = RespiratoryEngine.tick(1, { patient, vitals, time: 0 }, ventSettings, 50.0, drugEffects, inputsOverload);

      // In VCV mode, lower compliance must raise Peak Inspiratory Pressure (PIP)
      expect(outOverload.pip).toBeGreaterThan(outNormal.pip);
    });
  });

  describe('Chapter 17 Renal Microenvironment & Pressures', () => {
    it('should calculate glomerular capillary, Bowman space, and oncotic pressures correctly', () => {
      const patient = { weight: 70.0, albumin: 4.0 };
      const vitals = {};
      const outputNormal = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 1.0,
        map: 100.0,
        sys: 130.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });

      expect(outputNormal.glomerularCapillaryPressure).toBeCloseTo(60.0, 1);
      expect(outputNormal.bowmanSpacePressure).toBeCloseTo(18.0, 1);
      expect(outputNormal.glomerularOncoticPressure).toBeCloseTo(32.0, 1);
      expect(outputNormal.netFiltrationPressure).toBeCloseTo(10.0, 1);

      // Verify that PEEP transmits backpressure to Bowman space
      const outputPeep = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 1.0,
        map: 100.0,
        sys: 130.0,
        cvp: 5.0,
        peep: 10.0, // 10 cmH2O PEEP
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });
      expect(outputPeep.bowmanSpacePressure).toBe(23.0); // 18 + 0.5 * 10 = 23
      expect(outputPeep.netFiltrationPressure).toBe(5.0); // 60 - 23 - 32 = 5
      expect(outputPeep.gfr).toBe(12.5 * 5.0); // 62.5
    });

    it('should partition RBF into cortical and medullary flows and compute PO2 & O2 extraction ratios', () => {
      const patient = { weight: 70.0 };
      const vitals = { spo2: 98.0 };
      const output = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 1.0,
        map: 100.0,
        sys: 130.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });

      expect(output.cortexRbf).toBeCloseTo(1100.0 * 0.94, 1);
      expect(output.medullaRbf).toBeCloseTo(1100.0 * 0.06, 1);
      expect(output.cortexPo2).toBeCloseTo(50.0, 1);
      expect(output.medullaPo2).toBeCloseTo(8.0, 1);
      expect(output.cortexO2Extraction).toBeCloseTo(0.18, 2);
      expect(output.medullaO2Extraction).toBeCloseTo(0.79, 2);

      // Verify medullary hypoxia under hypoperfusion
      const outputHypo = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
        coRatio: 0.5, // 50% cardiac output
        map: 65.0,
        sys: 90.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 20.0,
        ebl: 1500.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      });
      // medullaRbf should drop, medullaPo2 should be low, medullaO2Extraction should increase
      expect(outputHypo.medullaRbf).toBeLessThan(66.0);
      expect(outputHypo.medullaPo2).toBeLessThan(8.0);
      expect(outputHypo.medullaO2Extraction).toBeGreaterThan(0.79);
    });

    it('should track cumulative hypotension duration and trigger AKI damage on crossing thresholds', () => {
      const patient = {
        weight: 70.0,
        mapUnder60Time: 0,
        mapUnder55Time: 0,
        mapUnder60AlertTriggered: false,
        mapUnder55AlertTriggered: false,
        akiDamage: 0.0
      };
      const vitals = {};
      const inputsHypo60 = {
        coRatio: 1.0,
        map: 58.0, // MAP < 60 but >= 55
        sys: 85.0,
        cvp: 5.0,
        peep: 0.0,
        temp: 37.0,
        currentMac: 0.0,
        C_cat: 0.0,
        ebl: 0.0,
        ebv: 5000.0,
        netFluidBalance: 0.0
      };

      // Tick 11 times. Since 1 simulation tick = 1 min = 60s in timer:
      // Threshold is > 11 min (660 seconds). At tick 11, timer becomes 11 * 60 = 660, not yet > 660.
      // At tick 12, timer becomes 12 * 60 = 720, which is > 660.
      let currentPatient = { ...patient };
      for (let i = 0; i < 11; i++) {
        const out = RenalEngine.tick(1, { patient: currentPatient, vitals, time: i }, [], inputsHypo60);
        currentPatient = {
          ...currentPatient,
          mapUnder60Time: out.mapUnder60Time,
          mapUnder55Time: out.mapUnder55Time,
          mapUnder60AlertTriggered: out.mapUnder60AlertTriggered,
          mapUnder55AlertTriggered: out.mapUnder55AlertTriggered,
          akiDamage: out.akiDamage
        };
      }
      expect(currentPatient.mapUnder60Time).toBe(660);
      expect(currentPatient.mapUnder60AlertTriggered).toBe(false);

      // 12th tick crosses the 11 minutes (660 seconds) threshold
      const out12 = RenalEngine.tick(1, { patient: currentPatient, vitals, time: 11 }, [], inputsHypo60);
      expect(out12.mapUnder60Time).toBe(720);
      expect(out12.mapUnder60AlertTriggered).toBe(true);
      expect(out12.events).toContainEqual(expect.stringContaining("exposure to MAP < 60 mmHg has exceeded 11 minutes"));
      
      // AKI damage should have accelerated due to the persistent injury rate (+0.003/s * 1s dt)
      expect(out12.akiDamage).toBeGreaterThan(currentPatient.akiDamage + 0.0029);
    });
  });
});
