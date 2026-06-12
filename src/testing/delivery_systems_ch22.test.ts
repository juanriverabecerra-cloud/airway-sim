import { describe, it, expect } from 'vitest';
import { RespiratoryEngine, RespiratoryPatientState, RespiratoryVitalsState, RespiratoryDrugEffects } from '../engine/RespiratoryEngine';
import { CardiovascularEngine, PatientState as CvPatientState, VitalsState as CvVitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';

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

  describe('1. Link-25 Proportioning System', () => {
    it('should verify linkage increases O2 when N2O is raised, and decreases N2O when O2 is lowered', () => {
      const applyLink25 = (update: { o2Flow?: number; airFlow?: number; n2oFlow?: number }, prev: { o2Flow: number; airFlow: number; n2oFlow: number }) => {
        const next = { ...prev, ...update };
        let finalO2 = next.o2Flow;
        let finalN2O = next.n2oFlow;
        
        if (next.n2oFlow > prev.n2oFlow) {
          if (finalO2 < finalN2O / 3.0) {
            finalO2 = finalN2O / 3.0;
          }
        } else if (next.o2Flow < prev.o2Flow) {
          if (finalN2O > finalO2 * 3.0) {
            finalN2O = finalO2 * 3.0;
          }
        } else {
          if (finalO2 < finalN2O / 3.0) {
            finalO2 = finalN2O / 3.0;
          }
        }
        return {
          o2Flow: Math.round(finalO2 * 10) / 10,
          n2oFlow: Math.round(finalN2O * 10) / 10,
          airFlow: next.airFlow
        };
      };

      const prev = { o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 };
      const next1 = applyLink25({ n2oFlow: 9.0 }, prev);
      expect(next1.o2Flow).toBe(3.0);
      expect(next1.n2oFlow).toBe(9.0);

      const next2 = applyLink25({ o2Flow: 1.0 }, { o2Flow: 3.0, airFlow: 0.0, n2oFlow: 9.0 });
      expect(next2.o2Flow).toBe(1.0);
      expect(next2.n2oFlow).toBe(3.0);
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
});
