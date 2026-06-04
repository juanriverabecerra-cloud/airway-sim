import { describe, it, expect } from 'vitest';
import { CardiovascularEngine, PatientState, VitalsState, CardiovascularDrugEffects } from '../engine/CardiovascularEngine';

describe('Cardiovascular & Resuscitation Engine Regression Tests', () => {
  // Helper to construct a standard baseline patient
  const createBaselineState = (): { patient: PatientState; vitals: VitalsState; electrolytes: { k: number } } => ({
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
      patientBaseSVR: 1200
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

  const createBaselineDrugEffects = (): CardiovascularDrugEffects => ({
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

  const baselineInputs = (state: { patient: PatientState; vitals: VitalsState; electrolytes: { k: number } }) => ({
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

  it('should verify targetHR stabilizes with chronotropic drug (Atropine) relative to patientBaseHR instead of climbing indefinitely', () => {
    const state = createBaselineState();
    state.patient.patientBaseHR = 70;
    
    // Simulate Atropine effect (Atropine chronotropic max is 55, let's assume totalHrDelta = 55)
    const drugEffects = createBaselineDrugEffects();
    drugEffects.totalHrDelta = 55;
    
    const inputs = baselineInputs(state);
    
    // Initial HR is 70.
    // targetHR = baseHR (70) + totalHrDelta (55) = 125.
    // 1st tick: newHr = 70 + (125 - 70) * 0.1 = 75.5.
    let out = CardiovascularEngine.tick(1, { ...state, time: 1 }, drugEffects, inputs);
    expect(out.vitals.hr).toBeGreaterThanOrEqual(75);
    expect(out.vitals.hr).toBeLessThanOrEqual(79);
    
    // Feed the output back into the engine for 50 ticks to simulate progression
    let currentState = {
      patient: { ...out.patient },
      vitals: { ...out.vitals },
      electrolytes: { k: 4.0 }
    };
    
    for (let i = 2; i <= 50; i++) {
      out = CardiovascularEngine.tick(1, { ...currentState, time: i }, drugEffects, inputs);
      currentState = {
        patient: { ...out.patient },
        vitals: { ...out.vitals },
        electrolytes: { k: 4.0 }
      };
    }
    
    // The heart rate should asymptotically approach 125, not 1100!
    expect(out.vitals.hr).toBeLessThanOrEqual(128);
    expect(out.vitals.hr).toBeGreaterThanOrEqual(121);
  });

  it('should verify Rate Pressure Product stunning in CAD patients', () => {
    const state = createBaselineState();
    state.patient.cad = true;
    state.vitals.hr = 100;
    state.vitals.sys = 150; // Double Product = 15000 > 14000

    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(state);

    const out = CardiovascularEngine.tick(1, { ...state, time: 10 }, drugEffects, inputs);
    
    // Myocardial stunning should accumulate by +0.5 and decay by -0.2
    expect(out.patient.myocardialStunning).toBe(0.3);
  });

  it('should verify Neostigmine un-antagonized muscarinic vagal bradycardia arrest', () => {
    const state = createBaselineState();
    state.patient.bradycardiaTriggered = true;
    state.patient.bradycardiaTime = 10;
    
    const drugEffects = createBaselineDrugEffects();
    
    // Check HR decline and arrest trigger
    // Let's simulate a tick at time = 40 (bradycardia active for 30s)
    const inputs = baselineInputs(state);
    
    // Simulate tick at time = 50s (bradycardia active for 40s)
    // drop = min(60, 40 * 2.5) = 60.
    // expectedHR = 70 - 60 = 10 bpm, which is < 15 bpm and should trigger arrest (Asystole).
    const out = CardiovascularEngine.tick(1, { ...state, time: 50 }, drugEffects, inputs);
    
    expect(out.patient.isArrest).toBe(true);
    expect(out.patient.cardiacRhythm).toBe('asystole');
    expect(out.events).toContain('🚨 CRITICAL EMERGENCY: Neostigmine-induced profound vagal bradycardia led to cardiac arrest (Asystole)!');
  });

  it('should verify Hyperkalemia myocardial arrest and Calcium stabilization', () => {
    // Scenario A: Severe hyperkalemia (K = 10.5) without Calcium membrane stabilization
    const stateA = createBaselineState();
    stateA.electrolytes.k = 10.5;

    const drugEffects = createBaselineDrugEffects();
    const inputsA = baselineInputs(stateA);

    const outA = CardiovascularEngine.tick(1, { ...stateA, time: 10 }, drugEffects, inputsA);
    expect(outA.patient.isArrest).toBe(true);
    expect(outA.patient.cardiacRhythm).toBe('asystole');
    expect(outA.events[0]).toContain('induced myocardial arrest');

    // Scenario B: Hyperkalemia (K = 10.5) with Calcium stabilization (calciumStabilizedTime within 300s)
    const stateB = createBaselineState();
    stateB.electrolytes.k = 10.5;
    stateB.patient.calciumStabilized = true;
    stateB.patient.calciumStabilizedTime = 5;

    const inputsB = baselineInputs(stateB);
    
    const outB = CardiovascularEngine.tick(1, { ...stateB, time: 10 }, drugEffects, inputsB);
    
    // Patient should not be in cardiac arrest, membrane stabilized, but widened QRS rhythm observed
    expect(outB.patient.isArrest).toBe(false);
    expect(outB.patient.cardiacRhythm).toBe('widened QRS');
  });

  it('should verify ACLS Defibrillation VFib ROSC success calculations', () => {
    // Case 1: Ideal resuscitation conditions (Amiodarone active, replete oxygen buffer, no bleeding)
    const state1 = createBaselineState().patient;
    state1.isArrest = true;
    state1.cardiacRhythm = 'vfib';
    state1.ischemicDamage = 500; // minimal ischemic damage

    const shockInputs1 = {
      patient: state1,
      activeMeds: [{ name: 'Amiodarone' }],
      currentBuffer: 2.4 * 0.90, // denitrogenated O2 replete
      currentFRC_L: 2.4,
      bloodLossRatio: 0,
      joules: 200,
      isSync: false,
      simulationTime: 100
    };

    // Calculate success chance = max(0.01, 0.7 + 0.25 (amiodarone) - 0.1 (ischemia penalty) - 0 (hypoxia penalty) - 0 (hypovolemia penalty)) = 0.85
    // Let's stub Math.random to verify conversion
    const originalRandom = Math.random;
    try {
      Math.random = () => 0.1; // forced success
      const result1 = CardiovascularEngine.deliverShock(shockInputs1);
      expect(result1.patient.isArrest).toBe(false);
      expect(result1.patient.cardiacRhythm).toBe('normal');
      expect(result1.events).toContain('✅ ROSC ACHIEVED! Organized rhythm restored.');

      // Case 2: Refractory arrest due to severe hypoxemia penalty (oxygen buffer empty) and hypovolemia penalty (blood loss > 30%)
      const state2 = createBaselineState().patient;
      state2.isArrest = true;
      state2.cardiacRhythm = 'vfib';
      state2.ischemicDamage = 500;

      const shockInputs2 = {
        patient: state2,
        activeMeds: [],
        currentBuffer: 2.4 * 0.10, // hypoxia penalty of 0.6 triggered
        currentFRC_L: 2.4,
        bloodLossRatio: 0.35, // hypovolemia penalty of 0.6 triggered
        joules: 200,
        isSync: false,
        simulationTime: 100
      };

      // successChance = max(0.01, 0.7 - 0.1 (ischemic penalty) - 0.6 (hypoxia penalty) - 0.6 (hypovolemia penalty)) = 0.01 (min floor)
      Math.random = () => 0.5; // forced fail relative to 0.01 success
      const result2 = CardiovascularEngine.deliverShock(shockInputs2);
      expect(result2.patient.isArrest).toBe(true);
      expect(result2.patient.cardiacRhythm).toBe('vfib');
      expect(result2.events).toContain('⚡ Shock delivered. Rhythm remains VFib/VTach. Fix H\'s and T\'s if refractory.');
    } finally {
      Math.random = originalRandom;
    }
  });

  describe('Boundary and Mathematical Safety Guards', () => {
    it('should handle NaN, Infinity, and zero-value base parameters without crashing or propagating NaN', () => {
      const state = createBaselineState();
      // Set parameters that would cause division-by-zero or overflows
      state.patient.patientBaseSV = 0;
      state.patient.patientBaseSVR = 0;
      state.patient.ebv = 0; // ebv = 0 division risk in bloodLossRatio checks
      state.patient.myocardialStunning = NaN;
      state.vitals.hr = NaN;
      state.vitals.sys = Infinity;
      state.vitals.dia = -Infinity;

      const drugEffects = createBaselineDrugEffects();
      drugEffects.drugSvrMod = NaN;
      drugEffects.drugInotropyMod = Infinity;

      const inputs = baselineInputs(state);
      inputs.currentBuffer = NaN;
      inputs.currentFRC_L = 0; // FRC_L = 0 division risk

      const out = CardiovascularEngine.tick(1, { ...state, time: 10 }, drugEffects, inputs);
      
      expect(out).toBeDefined();
      expect(out.vitals.hr).not.toBeNaN();
      expect(out.vitals.sys).not.toBeNaN();
      expect(out.vitals.map).not.toBeNaN();
      expect(out.vitals.co).not.toBeNaN();
      expect(out.patient.myocardialStunning).not.toBeNaN();
      expect(out.patient.ischemicDamage).not.toBeNaN();
    });

    it('should handle zero FRC and NaN buffer values in deliverShock success equations safely', () => {
      const patient = createBaselineState().patient;
      patient.isArrest = true;
      patient.cardiacRhythm = 'vfib';

      const shockInputs = {
        patient,
        activeMeds: [],
        currentBuffer: NaN,
        currentFRC_L: -5.0, // negative FRC
        bloodLossRatio: NaN,
        joules: 200,
        isSync: false,
        simulationTime: 100
      };

      const result = CardiovascularEngine.deliverShock(shockInputs);
      expect(result).toBeDefined();
      expect(result.patient.isArrest).toBeDefined();
      expect(result.events).toBeDefined();
    });
  });
});
