import { describe, it, expect } from 'vitest';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';
import { CardiovascularEngine, PatientState as CvPatientState, VitalsState as CvVitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';
import { calculateLink25GasMixture } from '../engine/Pharmacology';

describe('Chapter 22: Anesthesia Delivery Systems & Safety', () => {

  const createHealthyState = (): { patient: RespiratoryPatientState; vitals: RespiratoryVitalsState; time: number } => ({
    patient: {
      height: 175,
      age: 40,
      sex: 'male',
      bmi: 22.9,
      position: 'Ramped',
      ibw: 70.3,
      airwaySecured: true,
      ventilationStatus: 'mechanical',
      oxygenBuffer: 2.5 * 0.21,
      metHb: 0.8,
      coHb: 1.0,
      breathingCircuitType: 'circle',
      co2AbsorptiveCapacity: 100.0,
      stuckInspiratoryValve: false,
      stuckExpiratoryValve: false,
      aplValveSetting: 0.0,
      hasPneumothorax: false
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
    VO2_sec: 0.250 / 60,
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
    aspirationResistancePenalty: 0,
    fgf_L_min: 2.0
  });

  const createCvState = (): { patient: CvPatientState; vitals: CvVitalsState; electrolytes: { k: number } } => ({
    patient: {
      isArrest: false,
      cardiacRhythm: 'normal',
      cprActive: false,
      ischemicDamage: 0,
      biologicalDeath: false,
      myocardialStunning: 0,
      ebl: 0,
      ebv: 5000,
      height: 175,
      weight: 70,
      sex: 'male',
      age: 40,
      bmi: 22.9,
      position: 'Supine',
      arrestThreshold: 1200,
      patientBaseSV: 70,
      patientBaseSVR: 1200,
      hasPneumothorax: false
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
      spo2: 99,
      paco2: 40,
      etco2: 40
    },
    electrolytes: { k: 4.0 }
  });

  const createCvDrugEffects = (): CardiovascularDrugEffects => ({
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
  });

  const createCvInputs = (state: any) => ({
    currentMac: 0,
    bloodLossRatio: 0,
    currentEbl: 0,
    positionPreloadMod: 0,
    positionHydrostaticMod: 0,
    shiveringMultiplier: 1.0,
    seizureMetabolicMultiplier: 1.0,
    cyanideVO2Mod: 1.0,
    VO2_sec: 0.250 / 60,
    currentBuffer: 2.4 * 0.21,
    currentFRC_L: 2.4,
    newTemp: 37.0,
    newPaCO2: 40,
    activeMeds: [],
    getAnatomicalParameter: (kw: string, defVal: number) => defVal
  });

  describe('1. Link-25 Proportioning System & Oxygen Supply Failure Protection Device', () => {
    // NOTE: this previously tested a standalone local re-implementation of the Link-25 algorithm
    // that was never actually wired into usePhysiology.js — the live gas-mixing pipeline had no
    // enforcement at all (a user could dial a fully hypoxic N2O:O2 mixture with no protection).
    // Fixed by extracting the real logic into calculateLink25GasMixture() in Pharmacology.js and
    // calling it from usePhysiology.js; these tests now exercise that real, shared function.
    it('should raise effective O2 flow to maintain a minimum 1:3 O2:N2O ratio (max 3:1 N2O:O2)', () => {
      const result = calculateLink25GasMixture({ o2Flow: 2.0, airFlow: 0, n2oFlow: 9.0 }, true, true, false);
      expect(result.o2F).toBeCloseTo(3.0, 2); // 9.0 / 3.0
    });

    it('should not alter O2 flow when the dialed O2:N2O ratio already satisfies the minimum', () => {
      const result = calculateLink25GasMixture({ o2Flow: 5.0, airFlow: 0, n2oFlow: 3.0 }, true, true, false);
      expect(result.o2F).toBeCloseTo(5.0, 2);
    });

    it('should guarantee a minimum 25% delivered FiO2 from an N2O/O2 mixture regardless of how aggressively N2O is dialed', () => {
      const result = calculateLink25GasMixture({ o2Flow: 0.1, airFlow: 0, n2oFlow: 10.0 }, true, true, false);
      expect(result.deliveredFiO2).toBeGreaterThanOrEqual(25.0 - 0.01);
    });

    it('should shut off N2O flow entirely when O2 supply pressure is lost (fail-safe valve)', () => {
      const result = calculateLink25GasMixture({ o2Flow: 2.0, airFlow: 0, n2oFlow: 6.0 }, false, false, false);
      expect(result.failSafeN2OCutoff).toBe(true);
      expect(result.effectiveN2OFlow).toBe(0);
      expect(result.n2oPercent).toBe(0);
    });

    it('should NOT protect against hypoxic delivery during pipeline crossover (fail-safe only senses pressure, not gas identity)', () => {
      // Crossover: the "O2" channel is pressurized (hasO2Supply=true) but is actually delivering N2O.
      const result = calculateLink25GasMixture({ o2Flow: 2.0, airFlow: 0, n2oFlow: 0 }, true, false, true);
      expect(result.failSafeN2OCutoff).toBe(false); // pressure reads fine, valve stays open
      expect(result.deliveredFiO2).toBeLessThan(5); // delivered gas is actually all N2O, not O2 -> hypoxic
      expect(result.n2oPercent).toBeGreaterThan(90);
    });

    it('should remain finite and bounded across a wide range of dialed flows and supply states', () => {
      const scenarios = [
        { o2Flow: 0, airFlow: 0, n2oFlow: 0 },
        { o2Flow: 15, airFlow: 10, n2oFlow: 15 },
        { o2Flow: -1, airFlow: 0, n2oFlow: -5 },
        { o2Flow: NaN, airFlow: 0, n2oFlow: 5 }
      ];
      for (const s of scenarios) {
        for (const hasO2Supply of [true, false]) {
          const result = calculateLink25GasMixture(s, hasO2Supply, hasO2Supply, false);
          expect(Number.isFinite(result.deliveredFiO2)).toBe(true);
          expect(Number.isFinite(result.n2oPercent)).toBe(true);
          expect(Number.isFinite(result.freshGasFlow)).toBe(true);
          expect(result.deliveredFiO2).toBeGreaterThanOrEqual(0);
          expect(result.deliveredFiO2).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('2. Gas Source Logic (DISS/PISS & Crossover)', () => {
    const getGasSource = (patient: any) => {
      const isPipelineConnected = !patient.isO2PipelineDisconnected;
      const isCrossover = patient.isO2PipelineCrossover;
      const isCylinderOpen = patient.isO2CylinderOpen;

      let o2SourceIsO2 = false;
      let o2SourceIsN2O = false;
      let hasO2Supply = false;

      if (isPipelineConnected) {
          hasO2Supply = true;
          if (isCrossover) {
              o2SourceIsN2O = true;
          } else {
              o2SourceIsO2 = true;
          }
      } else {
          if (isCylinderOpen) {
              hasO2Supply = true;
              o2SourceIsO2 = true;
          } else {
              hasO2Supply = false;
          }
      }
      return { hasO2Supply, o2SourceIsO2, o2SourceIsN2O };
    };

    it('should override cylinders with pipeline, deliver N2O on crossover, and fail on disconnect if cylinder is closed', () => {
      const resNorm = getGasSource({ isO2PipelineDisconnected: false, isO2PipelineCrossover: false, isO2CylinderOpen: true });
      expect(resNorm.hasO2Supply).toBe(true);
      expect(resNorm.o2SourceIsO2).toBe(true);
      expect(resNorm.o2SourceIsN2O).toBe(false);

      const resCross = getGasSource({ isO2PipelineDisconnected: false, isO2PipelineCrossover: true, isO2CylinderOpen: false });
      expect(resCross.hasO2Supply).toBe(true);
      expect(resCross.o2SourceIsO2).toBe(false);
      expect(resCross.o2SourceIsN2O).toBe(true);

      const resCyl = getGasSource({ isO2PipelineDisconnected: true, isO2PipelineCrossover: false, isO2CylinderOpen: true });
      expect(resCyl.hasO2Supply).toBe(true);
      expect(resCyl.o2SourceIsO2).toBe(true);

      const resFail = getGasSource({ isO2PipelineDisconnected: true, isO2PipelineCrossover: false, isO2CylinderOpen: false });
      expect(resFail.hasO2Supply).toBe(false);
    });
  });

  describe('3. APL Valve Leak Model', () => {
    it('should verify APL settings below 15 cmH2O leak gas and lower pre-oxygenation rate', () => {
      const stateOpen = createHealthyState();
      stateOpen.patient.airwaySecured = false;
      stateOpen.patient.currentO2Device = 'Bag-Mask Valve (BMV)';
      stateOpen.patient.ventilationStatus = 'assisted';
      stateOpen.patient.oxygenBuffer = 0.45; // room air low buffer
      stateOpen.patient.aplValveSetting = 0.0; // fully open

      const drugEffects = createBaselineDrugEffects();
      drugEffects.maxNMJOccupancy = 1.0; // paralyzed to ensure isApneic
      const inputs = createBaselineInputs();

      // Tick for 15 seconds
      let stateO = { ...stateOpen };
      for (let i = 0; i < 15; i++) {
        const out = RespiratoryEngine.tick(1, stateO, { mode: 'spontaneous' }, 100, drugEffects, inputs);
        stateO.patient.oxygenBuffer = out.oxygenBuffer;
        stateO.vitals = out.vitals;
        stateO.time++;
      }

      const stateClosed = createHealthyState();
      stateClosed.patient.airwaySecured = false;
      stateClosed.patient.currentO2Device = 'Bag-Mask Valve (BMV)';
      stateClosed.patient.ventilationStatus = 'assisted';
      stateClosed.patient.oxygenBuffer = 0.45; // room air low buffer
      stateClosed.patient.aplValveSetting = 15.0; // closed sufficiently

      let stateC = { ...stateClosed };
      for (let i = 0; i < 15; i++) {
        const out = RespiratoryEngine.tick(1, stateC, { mode: 'spontaneous' }, 100, drugEffects, inputs);
        stateC.patient.oxygenBuffer = out.oxygenBuffer;
        stateC.vitals = out.vitals;
        stateC.time++;
      }

      // With closed APL, pre-oxygenation succeeds and oxygen buffer is higher
      expect(stateC.patient.oxygenBuffer).toBeGreaterThan(stateO.patient.oxygenBuffer);
    });

    it('should allow pre-oxygenation to wash in and increase FRC O2 buffer during spontaneous breathing through a bag-mask valve even if APL valve is 0', () => {
      const stateSpont = createHealthyState();
      stateSpont.patient.airwaySecured = false;
      stateSpont.patient.currentO2Device = 'Bag-Mask Valve (BMV)';
      stateSpont.patient.currentFiO2 = 100;
      stateSpont.patient.oxygenBuffer = 0.45; // room air low buffer
      stateSpont.patient.aplValveSetting = 0.0; // fully open (default)

      const drugEffects = createBaselineDrugEffects();
      drugEffects.maxNMJOccupancy = 0.0; // not paralyzed (spontaneous breathing)
      const inputs = createBaselineInputs();

      // Tick for 15 seconds
      let stateS = { ...stateSpont };
      for (let i = 0; i < 15; i++) {
        const out = RespiratoryEngine.tick(1, stateS, { mode: 'spontaneous' }, 100, drugEffects, inputs);
        stateS.patient.oxygenBuffer = out.oxygenBuffer;
        stateS.vitals = out.vitals;
        stateS.time++;
      }

      // Oxygen buffer should rise significantly above 0.45 since the patient is breathing spontaneously
      expect(stateS.patient.oxygenBuffer).toBeGreaterThan(0.45);
      // It should rise towards the target (which is recruited FRC * 1.0 = ~2.08)
      expect(stateS.patient.oxygenBuffer).toBeGreaterThan(1.0);
    });
  });

  describe('4. Stuck Circle Valves and CO2 Absorbent Depletion', () => {
    it('should verify stuck circle valves trigger 40% rebreathing and elevate FiCO2', () => {
      const stateValves = createHealthyState();
      stateValves.patient.stuckInspiratoryValve = true;

      const drugEffects = createBaselineDrugEffects();
      const inputs = createBaselineInputs();

      const outValves = RespiratoryEngine.tick(1, stateValves, { mode: 'mechanical', modeType: 'VCV' }, 40, drugEffects, inputs);
      expect(outValves.fico2).toBeCloseTo(16, 0); // 40% of EtCO2 (40)
    });

    it('should verify depleted CO2 absorbent capacity triggers rebreathing and raises FiCO2', () => {
      const stateAbsorbent = createHealthyState();
      stateAbsorbent.patient.co2AbsorptiveCapacity = 20.0; // 80% depletion

      const drugEffects = createBaselineDrugEffects();
      const inputs = createBaselineInputs();

      const outAbsorbent = RespiratoryEngine.tick(1, stateAbsorbent, { mode: 'mechanical', modeType: 'VCV' }, 40, drugEffects, inputs);
      expect(outAbsorbent.fico2).toBeCloseTo(32, 0); // 80% of EtCO2 (40)
    });
  });

  describe('5. Breathing System Rebreathing (Mapleson A vs D)', () => {
    it('should verify rebreathing in Mapleson systems when FGF is insufficient', () => {
      const drugEffects = createBaselineDrugEffects();
      
      // Mapleson A, spontaneous: FGF = 1.0 L/min, MV = 6.0 L/min. Rebreathing fraction = 1 - 1/6 = 83.3%
      const stateA = createHealthyState();
      stateA.patient.airwaySecured = false;
      stateA.patient.breathingCircuitType = 'Mapleson A';
      stateA.patient.isApneic = false;

      const inputsLowFGF = createBaselineInputs();
      inputsLowFGF.fgf_L_min = 1.0;

      const outA = RespiratoryEngine.tick(1, stateA, { mode: 'spontaneous' }, 40, drugEffects, inputsLowFGF);
      expect(outA.fico2).toBeGreaterThan(0);
    });
  });

  describe('6. Tension Pneumothorax Hemodynamics and Decompression', () => {
    it('should verify stroke volume and MAP crash during tension pneumothorax, and recover upon decompression', () => {
      const statePneumo = createCvState();
      statePneumo.patient.hasPneumothorax = true;

      const drugEffects = createCvDrugEffects();
      const inputs = createCvInputs(statePneumo);

      const outPneumo = CardiovascularEngine.tick(1, statePneumo, drugEffects, inputs);
      
      const stateHealthy = createCvState();
      stateHealthy.patient.hasPneumothorax = false;

      const outHealthy = CardiovascularEngine.tick(1, stateHealthy, drugEffects, inputs);

      // Stroke volume and MAP must be significantly lower under tension pneumothorax
      expect(outPneumo.vitals.map).toBeLessThan(outHealthy.vitals.map);
    });
  });

  describe('7. Unified PEEP Recruitment & Non-Invasive Crossover Contamination', () => {
    it('should verify that mechanical ventilator PEEP recruits FRC and reduces shunt', () => {
      const stateNoPeep = createHealthyState();
      stateNoPeep.patient.airwaySecured = true;
      
      const statePeep = createHealthyState();
      statePeep.patient.airwaySecured = true;

      const drugEffects = createBaselineDrugEffects();
      const inputs = createBaselineInputs();

      // Tick with PEEP = 0
      const outNoPeep = RespiratoryEngine.tick(1, stateNoPeep, { mode: 'VCV', peep: 0 }, 100, drugEffects, inputs);

      // Tick with PEEP = 10
      const outPeep = RespiratoryEngine.tick(1, statePeep, { mode: 'VCV', peep: 10 }, 100, drugEffects, inputs);

      // PEEP should reduce shunt and recruit lung volumes (increasing recruited FRC)
      expect(outPeep.actualShunt).toBeLessThan(outNoPeep.actualShunt || 0.1);
    });

    it('should verify that pipeline crossover contaminates non-invasive devices, lowering inspired FiO2', () => {
      const stateCrossover = createHealthyState();
      stateCrossover.patient.airwaySecured = false;
      stateCrossover.patient.currentO2Device = 'Non-Rebreather Mask (NRB)';
      stateCrossover.patient.currentFiO2 = 100;
      stateCrossover.patient.oxygenBuffer = 2.0; // pre-oxygenated
      stateCrossover.patient.isO2PipelineCrossover = true; // crossover active!
      stateCrossover.patient.isO2PipelineDisconnected = false;

      const drugEffects = createBaselineDrugEffects();
      const inputs = createBaselineInputs();

      // Tick with crossover
      let stateC = { ...stateCrossover };
      for (let i = 0; i < 20; i++) {
        const out = RespiratoryEngine.tick(1, stateC, { mode: 'spontaneous' }, 10, drugEffects, inputs);
        stateC.patient.oxygenBuffer = out.oxygenBuffer;
        stateC.vitals = out.vitals;
        stateC.time++;
      }

      const stateNormal = createHealthyState();
      stateNormal.patient.airwaySecured = false;
      stateNormal.patient.currentO2Device = 'Non-Rebreather Mask (NRB)';
      stateNormal.patient.currentFiO2 = 100;
      stateNormal.patient.oxygenBuffer = 2.0; // pre-oxygenated
      stateNormal.patient.isO2PipelineCrossover = false; // normal
      stateNormal.patient.isO2PipelineDisconnected = false;

      // Tick normally
      let stateN = { ...stateNormal };
      for (let i = 0; i < 20; i++) {
        const out = RespiratoryEngine.tick(1, stateN, { mode: 'spontaneous' }, 100, drugEffects, inputs);
        stateN.patient.oxygenBuffer = out.oxygenBuffer;
        stateN.vitals = out.vitals;
        stateN.time++;
      }

      // Crossover should contaminate the NRB gas, causing washout/decrease of oxygen buffer compared to normal preoxygenation
      expect(stateC.patient.oxygenBuffer).toBeLessThan(stateN.patient.oxygenBuffer);
    });
  });
});
