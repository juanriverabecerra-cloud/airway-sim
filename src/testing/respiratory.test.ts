import { describe, it, expect } from 'vitest';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';

describe('Respiratory & Blood Gas Engine Regression Tests', () => {
  const createHealthyState = (): { patient: RespiratoryPatientState; vitals: RespiratoryVitalsState; time: number } => ({
    patient: {
      height: 175,
      age: 40,
      sex: 'male',
      bmi: 22.9,
      position: 'Ramped',
      ibw: 70.3,
      airwaySecured: false,
      ventilationStatus: 'none',
      oxygenBuffer: null,
      metHb: 0.8,
      coHb: 1.0
    },
    vitals: {
      hr: 70,
      sys: 120,
      dia: 80,
      map: 93,
      co: 5.0,
      svr: 1200,
      cmap: 93,
      bis: 98,
      temp: 37.0,
      spo2: 100,
      paco2: 40,
      etco2: 40,
      rr: 12
    },
    time: 0
  });

  const createObeseState = (): { patient: RespiratoryPatientState; vitals: RespiratoryVitalsState; time: number } => ({
    patient: {
      height: 175,
      age: 40,
      sex: 'male',
      bmi: 42.0,
      position: 'Supine',
      ibw: 70.3,
      isObese: true,
      airwaySecured: false,
      ventilationStatus: 'none',
      oxygenBuffer: null,
      metHb: 0.8,
      coHb: 1.0
    },
    vitals: {
      hr: 70,
      sys: 120,
      dia: 80,
      map: 93,
      co: 5.0,
      svr: 1200,
      cmap: 93,
      bis: 98,
      temp: 37.0,
      spo2: 100,
      paco2: 40,
      etco2: 40,
      rr: 12
    },
    time: 0
  });

  const createBaselineDrugEffects = (): RespiratoryDrugEffects => ({
    maxNMJOccupancy: 0,
    totalRrDelta: 0,
    ruleRrScale: 1.0,
    ruleRrOffset: 0,
    ruleComplScale: 1.0,
    rulePipOffset: 0,
    ruleSpo2Offset: 0,
    ruleKOffset: 0
  });

  const createBaselineInputs = () => ({
    VO2_sec: 0.250 / 60, // 250 mL/min
    totalMetabolicMultiplier: 1.0,
    compensatoryRR: 0,
    opioidRRDrop: 0,
    m6gRrDelta: 0,
    shiveringRRDrive: 0,
    currentHb: 14.0,
    targetMAP: 93,
    targetCO: 5.0,
    hco3: 24.0,
    volatileRightShift: 0,
    dpgDepletionShift: 0,
    baselinePaCO2: 40,
    anaphylaxisCompliancePenalty: 0,
    anaphylaxisResistancePenalty: 0,
    aspirationCompliancePenalty: 0,
    aspirationResistancePenalty: 0
  });

  describe('1. ECCS Predicted Lung Volumes & Obesity/Position Scaling', () => {
    it('should calculate correct volumes for a healthy male in Ramped position', () => {
      // Male, 175cm, 40yo, BMI 22.9, Ramped
      const vols = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 22.9, 'Ramped');
      
      // Expected FRC:
      // frc_pred = 2.34 * 1.75 + 0.009 * 40 - 1.09 = 4.095 + 0.36 - 1.09 = 3.365 L
      // Obesity factor: BMI <= 25 -> 1.0
      // Position factor for 'Ramped' -> 0.90
      // Expected frc = 3.365 * 0.90 = 3.0285 -> rounded to 3.03 L or 3029 mL
      expect(vols.frc_L).toBeCloseTo(3.03, 2);
      expect(vols.frc_mL).toBe(3029);
      expect(vols.obesityFactor).toBe(1.0);
      expect(vols.positionFactor).toBe(0.90);
    });

    it('should calculate correct volumes for an obese male in Supine position', () => {
      // Male, 175cm, 40yo, BMI 42, Supine
      const vols = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 42.0, 'Supine');
      
      // Expected FRC:
      // frc_pred = 3.365 L
      // Obesity factor: exp(-0.02 * (42 - 25)) = exp(-0.34) = 0.71177... (rounds to 0.712)
      // Position factor for 'Supine' -> 0.80
      // Expected FRC L = 3.365 * 0.71177 * 0.80 = 1.916 -> 1.92 L or 1916 mL
      expect(vols.frc_L).toBeCloseTo(1.92, 2);
      expect(vols.frc_mL).toBe(1916);
      expect(vols.obesityFactor).toBe(0.712);
      expect(vols.positionFactor).toBe(0.80);
    });

    it('should calculate correct volumes for a restrictive disease patient', () => {
      const vols = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 22.9, 'Ramped', false, true);
      // Restrictive: frc = frc_pred * 0.52 = 3.365 * 0.52 = 1.7498 L
      // Ramped position factor: 0.90
      // Expected FRC = 1.7498 * 0.90 = 1.5748 -> rounds to 1.57 L or 1575 mL
      expect(vols.frc_L).toBeCloseTo(1.57, 2);
      expect(vols.frc_mL).toBe(1575);
    });
  });

  describe('2. Apneic Desaturation Kinetics', () => {
    it('should verify that an obese supine patient desaturates faster than a healthy ramped patient', () => {
      // We will perform apnea by setting maxNMJOccupancy: 1.0 (complete paralysis/apnea)
      const drugEffects = createBaselineDrugEffects();
      drugEffects.maxNMJOccupancy = 1.0; // Paralyzed!

      let healthyState = createHealthyState();
      healthyState.vitals.rr = 0; // Apnea!
      // Fully preoxygenate both patients to 100% FiO2 first to have equivalent starting point
      const healthyVols = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 22.9, 'Ramped');
      healthyState.patient.oxygenBuffer = healthyVols.frc_L * 1.0; // 100% preoxygenation

      let obeseState = createObeseState();
      obeseState.vitals.rr = 0; // Apnea!
      const obeseVols = RespiratoryEngine.calculateLungVolumes(175, 40, 'male', 42.0, 'Supine');
      obeseState.patient.oxygenBuffer = obeseVols.frc_L * 1.0; // 100% preoxygenation

      const inputs = createBaselineInputs();

      // We will tick them second-by-second for 120 seconds
      let healthySpo2History: number[] = [];
      let obeseSpo2History: number[] = [];

      for (let sec = 1; sec <= 120; sec++) {
        // Healthy tick
        const healthyOut = RespiratoryEngine.tick(1, healthyState, null, 100, drugEffects, inputs);
        healthyState.patient.oxygenBuffer = healthyOut.oxygenBuffer;
        healthyState.vitals = healthyOut.vitals;
        // Use high-precision float updates to prevent integer rounding freeze
        healthyState.vitals.rr = healthyOut.newRr;
        healthyState.vitals.spo2 = healthyOut.newSpo2;
        healthyState.vitals.etco2 = healthyOut.newEtco2;
        healthyState.time = sec;
        healthySpo2History.push(healthyOut.vitals.spo2);

        // Obese tick
        const obeseOut = RespiratoryEngine.tick(1, obeseState, null, 100, drugEffects, inputs);
        obeseState.patient.oxygenBuffer = obeseOut.oxygenBuffer;
        obeseState.vitals = obeseOut.vitals;
        // Use high-precision float updates to prevent integer rounding freeze
        obeseState.vitals.rr = obeseOut.newRr;
        obeseState.vitals.spo2 = obeseOut.newSpo2;
        obeseState.vitals.etco2 = obeseOut.newEtco2;
        obeseState.time = sec;
        obeseSpo2History.push(obeseOut.vitals.spo2);
      }

      // Check remaining O2 buffers
      // Healthy starting FRC was ~3.03 L. Apnea consumption = 250mL/min = 0.25 L/min = 4.167 mL/sec
      // Over 120s, healthy patient consumes 120 * (0.25 / 60) = 0.50 L of oxygen.
      // So healthy O2 buffer should be around 3.03 - 0.50 = 2.53 L.
      // Obese starting FRC was ~1.92 L. Consumes same 0.50 L of oxygen.
      // So obese O2 buffer should be around 1.92 - 0.50 = 1.42 L.
      expect(healthyState.patient.oxygenBuffer).toBeCloseTo(2.53, 1);
      expect(obeseState.patient.oxygenBuffer).toBeCloseTo(1.42, 1);

      // Both should still be very well saturated since preoxygenation was complete and buffers are > 1L.
      expect(healthyState.vitals.spo2).toBe(100);
      expect(obeseState.vitals.spo2).toBe(100);

      // Now let's simulate the same but starting with room air preoxygenation (21%)
      // Obese FRC = 1.916 L. Room air O2 = 1.916 * 0.21 = 0.402 L.
      // Healthy FRC = 3.029 L. Room air O2 = 3.029 * 0.21 = 0.636 L.
      let healthyStateAir = createHealthyState();
      healthyStateAir.vitals.rr = 0;
      healthyStateAir.patient.oxygenBuffer = healthyVols.frc_L * 0.21; // 21%

      let obeseStateAir = createObeseState();
      obeseStateAir.vitals.rr = 0;
      obeseStateAir.patient.oxygenBuffer = obeseVols.frc_L * 0.21; // 21%

      let healthySpo2Air: number[] = [];
      let obeseSpo2Air: number[] = [];

      let firstObeseDesatTime = -1;
      let firstHealthyDesatTime = -1;

      for (let sec = 1; sec <= 120; sec++) {
        // Healthy tick
        const healthyOut = RespiratoryEngine.tick(1, healthyStateAir, null, 21, drugEffects, inputs);
        healthyStateAir.patient.oxygenBuffer = healthyOut.oxygenBuffer;
        healthyStateAir.vitals = healthyOut.vitals;
        healthyStateAir.vitals.rr = healthyOut.newRr;
        healthyStateAir.vitals.spo2 = healthyOut.newSpo2;
        healthyStateAir.vitals.etco2 = healthyOut.newEtco2;
        healthyStateAir.time = sec;
        healthySpo2Air.push(healthyOut.vitals.spo2);
        if (healthyOut.vitals.spo2 < 90 && firstHealthyDesatTime === -1) {
          firstHealthyDesatTime = sec;
        }

        // Obese tick
        const obeseOut = RespiratoryEngine.tick(1, obeseStateAir, null, 21, drugEffects, inputs);
        obeseStateAir.patient.oxygenBuffer = obeseOut.oxygenBuffer;
        obeseStateAir.vitals = obeseOut.vitals;
        obeseStateAir.vitals.rr = obeseOut.newRr;
        obeseStateAir.vitals.spo2 = obeseOut.newSpo2;
        obeseStateAir.vitals.etco2 = obeseOut.newEtco2;
        obeseStateAir.time = sec;
        obeseSpo2Air.push(obeseOut.vitals.spo2);
        if (obeseOut.vitals.spo2 < 90 && firstObeseDesatTime === -1) {
          firstObeseDesatTime = sec;
        }
      }

      // The obese patient should desaturate to SpO2 < 90% significantly faster than the healthy patient.
      expect(firstObeseDesatTime).toBeGreaterThan(0);
      expect(firstHealthyDesatTime).toBeGreaterThan(0);
      expect(firstObeseDesatTime).toBeLessThan(firstHealthyDesatTime);

      // Verify desaturation rates: Obese patient should hit critical hypoxia (SpO2 < 90) under 60-90s
      // on room air, whereas healthy patient takes longer.
      expect(firstObeseDesatTime).toBeLessThanOrEqual(90);
    });
  });

  describe('3. Riley Shunt Exchange and Venous Return Equations', () => {
    it('should drop arterial PaO2 and SpO2 proportionally when shunt fraction is increased during apneic desaturation', () => {
      // In apnea, the oxygen buffer naturally depletes due to constant metabolic VO2 consumption.
      // This will cause the oximetry values to descend into the active region (SpO2 < 100%)
      // where the effect of the shunt can be measured clearly.
      const drugEffects = createBaselineDrugEffects();
      drugEffects.maxNMJOccupancy = 1.0; // Complete apnea/paralysis

      // Baseline state (shunt fraction = 0.05)
      const state1 = createHealthyState();
      state1.vitals.rr = 0;
      state1.patient.oxygenBuffer = 3.03 * 0.21; // Room air baseline
      state1.patient.shuntFraction = 0.05; // 5% baseline shunt

      // Severe OLV (One-Lung Ventilation) or shunt state (shunt fraction = 0.25)
      const state2 = createHealthyState();
      state2.vitals.rr = 0;
      state2.patient.oxygenBuffer = 3.03 * 0.21; // Room air baseline
      state2.patient.shuntFraction = 0.25; // 25% shunt

      const inputs = createBaselineInputs();

      // Tick both for 110 seconds of apnea to deplete the FRC oxygen buffer and trigger desaturation
      let out1 = RespiratoryEngine.tick(1, state1, null, 21, drugEffects, inputs);
      let out2 = RespiratoryEngine.tick(1, state2, null, 21, drugEffects, inputs);

      for (let sec = 1; sec <= 110; sec++) {
        state1.vitals = out1.vitals;
        state1.vitals.rr = out1.newRr;
        state1.vitals.spo2 = out1.newSpo2; // Carry float
        state1.vitals.etco2 = out1.newEtco2;
        state1.patient.oxygenBuffer = out1.oxygenBuffer;
        out1 = RespiratoryEngine.tick(1, state1, null, 21, drugEffects, inputs);

        state2.vitals = out2.vitals;
        state2.vitals.rr = out2.newRr;
        state2.vitals.spo2 = out2.newSpo2; // Carry float
        state2.vitals.etco2 = out2.newEtco2;
        state2.patient.oxygenBuffer = out2.oxygenBuffer;
        out2 = RespiratoryEngine.tick(1, state2, null, 21, drugEffects, inputs);
      }

      // Check results
      // Due to the 25% shunt bypassing gas exchange, the second patient should have desaturated significantly more!
      expect(out2.newSpo2).toBeLessThan(out1.newSpo2);
      
      // The SpO2 of the severe shunt patient should have dropped well below the normal shunt patient
      expect(out1.vitals.spo2).toBeGreaterThan(out2.vitals.spo2);
      expect(out2.vitals.spo2).toBeLessThan(95); 
    });
  });
});
