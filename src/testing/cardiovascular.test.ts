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

  it('should verify vitals and blood pressure remain stable under baseline ticking conditions', () => {
    const state = createBaselineState();
    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(state);
    
    let currentState = {
      patient: { ...state.patient },
      vitals: { ...state.vitals },
      electrolytes: { k: 4.0 }
    };
    
    for (let i = 1; i <= 60; i++) {
      let out = CardiovascularEngine.tick(1, { ...currentState, time: i }, drugEffects, inputs);
      currentState = {
        patient: { ...out.patient },
        vitals: { ...out.vitals },
        electrolytes: { k: 4.0 }
      };
    }
    
    // Blood pressure and HR should stay in stable, normal physiologic ranges rather than drifting exponentially
    expect(currentState.vitals.hr).toBeLessThanOrEqual(77);
    expect(currentState.vitals.hr).toBeGreaterThanOrEqual(65);
    expect(currentState.vitals.sys).toBeLessThanOrEqual(125);
    expect(currentState.vitals.sys).toBeGreaterThanOrEqual(95);
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
    
    // The heart rate should asymptotically converge to a bounded value, not climb to 1100.
    // Settles a bit above the pure Atropine target of 125 (not at it) under the chamber-
    // mechanics engine (Phase 0 of mutable-roaming-newell.md): at this much tachycardia,
    // reduced diastolic filling time genuinely lowers MAP/SV (a real HR-dependent filling
    // effect the prior formula's HR-independent stroke volume couldn't produce), and the
    // baroreflex's only available lever here is more HR -- so it adds a further tachycardic
    // correction on top of Atropine's 55bpm, converging near ~137 instead of exactly 125.
    // Still clearly bounded, not runaway.
    expect(out.vitals.hr).toBeLessThanOrEqual(145);
    expect(out.vitals.hr).toBeGreaterThanOrEqual(130);
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

  it('should verify Chapter 14 cardiac variables: LVEDP, Coronary Perfusion Pressure, and Diastolic Time Ratio', () => {
    const state = createBaselineState();
    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(state);

    const out = CardiovascularEngine.tick(1, { ...state, time: 10 }, drugEffects, inputs);
    expect(out.vitals.lvedp).toBeDefined();
    expect(out.vitals.lvedp).toBeGreaterThanOrEqual(2.0);
    expect(out.vitals.lvedp).toBeLessThanOrEqual(40.0);

    expect(out.vitals.cpp_coronary).toBeDefined();
    expect(out.vitals.cpp_coronary).toBe(state.vitals.dia - out.vitals.lvedp!);

    expect(out.vitals.diastoleTimeRatio).toBeDefined();
    expect(out.vitals.diastoleTimeRatio).toBeCloseTo((60.0 - 0.2 * state.vitals.hr) / 60.0, 4);

    // If heart rate increases, diastolic time ratio should decrease
    const stateHighHR = createBaselineState();
    stateHighHR.vitals.hr = 120;
    const outHighHR = CardiovascularEngine.tick(1, { ...stateHighHR, time: 10 }, drugEffects, inputs);
    expect(outHighHR.vitals.diastoleTimeRatio).toBeLessThan(out.vitals.diastoleTimeRatio!);
  });

  it('should verify myocardial supply-demand calculations and stunning accumulation', () => {
    const state = createBaselineState();
    // Set up high demand and low supply (e.g. coronary artery disease + low blood pressure)
    state.patient.cad = true;
    state.vitals.hr = 130;
    state.vitals.sys = 170;
    state.vitals.dia = 40; // low diastolic BP reduces coronary perfusion pressure

    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(state);
    inputs.currentHb = 8.0; // low Hb reduces oxygen content

    const out = CardiovascularEngine.tick(1, { ...state, time: 10 }, drugEffects, inputs);
    expect(out.vitals.mvo2).toBeDefined();
    expect(out.vitals.mvo2Supply).toBeDefined();
    // Stunning increase check
    expect(out.patient.myocardialStunning).toBeGreaterThan(0);
  });

  it('should verify autonomic reflexes: Bezold-Jarisch and Bainbridge reflex loops', () => {
    // 1. Bezold-Jarisch reflex (active on myocardial stunning > 25)
    const stateBJ = createBaselineState();
    stateBJ.patient.myocardialStunning = 26;
    stateBJ.vitals.hr = 80;
    stateBJ.vitals.svr = 1200;

    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(stateBJ);

    const outBJ = CardiovascularEngine.tick(1, { ...stateBJ, time: 10 }, drugEffects, inputs);
    // BJ reflex triggers bradycardia (totalHrDelta -= 20) and vasodilation (targetSVR *= 0.75)
    // Let's check that SVR decreases
    expect(outBJ.vitals.svr).toBeLessThan(1200);

    // 2. Bainbridge reflex (tachycardia when LVEDP > 18 and BJ inactive)
    const stateBain = createBaselineState();
    // LVEDP scales with volume offset. Base ebv is 5000; this much excess volume (preloadRatio
    // ~2.6 in the chamber-mechanics engine) is needed to push simulated LVEDP past 18 mmHg --
    // the chamber-mechanics engine's genuine preload-LVEDP relationship is less steep than the
    // prior algebraic formula's, so reaching the same clinical territory (severe iatrogenic
    // volume overload) takes a larger excess volume than before. At this severity the chamber
    // engine's MAP also rises sharply (via the same SV/CO surge that elevates LVEDP), which
    // over several ticks would mount a real, *dominant* baroreflex bradycardic correction on
    // top of Bainbridge's smaller tachycardic pull -- both are genuine, simultaneously-active
    // mechanisms, but that makes Bainbridge's own contribution unobservable beyond the very
    // first tick. Starting vitals.map at MAP_set (93, baseSBP/DBP 120/80's setpoint) keeps the
    // baroreflex error at ~0 for this one tick in both arms, isolating Bainbridge's
    // contribution by comparing against a volume-matched control rather than an absolute
    // post-tick HR threshold (a single tick's few-bpm target shift, after the existing 10%-
    // per-tick damping, can be smaller than this test's random per-tick HR noise).
    // 12000 (rather than a more modest excess) pushes LVEDP comfortably past 18 (~23.7,
    // near the engine's preload ceiling) so the resulting hrBainbridge contribution is large
    // enough to clearly separate from this test's per-tick HR noise after the existing 10%
    // damping -- verified stable across repeated runs at this volume, unlike smaller values.
    stateBain.patient.intravascularVolume = 12000;
    stateBain.vitals.hr = 70;
    stateBain.vitals.map = 93;

    const stateBainControl = createBaselineState();
    stateBainControl.vitals.hr = 70;
    stateBainControl.vitals.map = 93;

    const outBain = CardiovascularEngine.tick(1, { ...stateBain, time: 10 }, drugEffects, inputs);
    const outBainControl = CardiovascularEngine.tick(1, { ...stateBainControl, time: 10 }, drugEffects, inputs);
    expect(outBain.vitals.lvedp).toBeGreaterThan(18.0);
    expect(outBainControl.vitals.lvedp).toBeLessThan(18.0);
    // Bainbridge active only in the volume-overloaded arm -> its HR should be higher than the
    // volume-matched control's, isolating the reflex's own contribution.
    expect(outBain.vitals.hr).toBeGreaterThan(outBainControl.vitals.hr);
  });

  it('should verify Oculocardiac reflex triggers vagal bradycardia and can be blocked by antimuscarinics', () => {
    // 1. Oculocardiac trigger active without antimuscarinics
    const stateOC = createBaselineState();
    stateOC.patient.oculocardiacTriggered = true;
    stateOC.vitals.hr = 70;

    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(stateOC);

    const outOC = CardiovascularEngine.tick(1, { ...stateOC, time: 10 }, drugEffects, inputs);
    // OC triggers totalHrDelta -= 35, leading to heart rate reduction
    expect(outOC.vitals.hr).toBeLessThan(70);

    // 2. Oculocardiac trigger active with antimuscarinics (Atropine) present
    const stateOCBlocked = createBaselineState();
    stateOCBlocked.patient.oculocardiacTriggered = true;
    stateOCBlocked.vitals.hr = 70;

    const inputsOCBlocked = baselineInputs(stateOCBlocked);
    inputsOCBlocked.activeMeds = [{ name: 'Atropine', A1: 0.5 }]; // Atropine is active

    const outOCBlocked = CardiovascularEngine.tick(1, { ...stateOCBlocked, time: 10 }, drugEffects, inputsOCBlocked);
    // Heart rate should not drop under Atropine blocking
    expect(outOCBlocked.vitals.hr).toBeGreaterThanOrEqual(70);
  });

  it('should verify myocardial ischemia state-transition logging, progression, and resolution', () => {
    const state = createBaselineState();
    state.patient.cad = true;
    state.vitals.hr = 100;
    state.vitals.sys = 140;
    state.vitals.dia = 55; // moderate DBP compromise
    
    const drugEffects = createBaselineDrugEffects();
    const inputs = baselineInputs(state);
    inputs.currentHb = 10.0; // moderate Hb compromise

    // 1. First tick: stunning should increase but remain < 1.0 (no onset log should occur yet)
    let out = CardiovascularEngine.tick(1, { ...state, time: 1 }, drugEffects, inputs);
    expect(out.patient.myocardialStunning).toBeGreaterThan(0);
    expect(out.patient.myocardialStunning).toBeLessThan(1.0);
    expect(out.patient.ischemiaActive).toBeFalsy();
    expect(out.events.some(e => e.includes('MYOCARDIAL ISCHEMIA'))).toBe(false);

    // 2. Simulate stunning hitting exactly 2.0% (ischemiaActive should transition to true and log onset)
    let currentState = {
      patient: { ...out.patient, myocardialStunning: 2.0 },
      vitals: { ...out.vitals },
      electrolytes: { k: 4.0 }
    };
    out = CardiovascularEngine.tick(1, { ...currentState, time: 2 }, drugEffects, inputs);
    expect(out.patient.ischemiaActive).toBe(true);
    const onsetEvent = out.events.find(e => e.includes('MYOCARDIAL ISCHEMIA: Oxygen supply fails to meet metabolic demand'));
    expect(onsetEvent).toBeDefined();
    expect(onsetEvent).toContain('Pathophysiology:');
    expect(onsetEvent).toContain('Interventions:');

    // 3. Next tick: ischemia remains active but stunning is < 10% (no duplicate onset or progression log should occur)
    currentState = {
      patient: { ...out.patient, myocardialStunning: 5.0 },
      vitals: { ...out.vitals },
      electrolytes: { k: 4.0 }
    };
    out = CardiovascularEngine.tick(1, { ...currentState, time: 3 }, drugEffects, inputs);
    expect(out.patient.ischemiaActive).toBe(true);
    expect(out.events.some(e => e.includes('Oxygen supply fails to meet'))).toBe(false); // no duplicate onset
    expect(out.events.some(e => e.includes('PROGRESSION'))).toBe(false); // not at 10% yet

    // 4. Stunning hits 12% -> triggers mild progression warning
    currentState = {
      patient: { ...out.patient, myocardialStunning: 12.0 },
      vitals: { ...out.vitals },
      electrolytes: { k: 4.0 }
    };
    out = CardiovascularEngine.tick(1, { ...currentState, time: 4 }, drugEffects, inputs);
    expect(out.patient.ischemiaMildLogged).toBe(true);
    expect(out.events.some(e => e.includes('MYOCARDIAL ISCHEMIA PROGRESSION: Stunning has reached'))).toBe(true);

    // 5. Stunning hits 32% -> triggers severe progression warning
    currentState = {
      patient: { ...out.patient, myocardialStunning: 32.0 },
      vitals: { ...out.vitals },
      electrolytes: { k: 4.0 }
    };
    out = CardiovascularEngine.tick(1, { ...currentState, time: 5 }, drugEffects, inputs);
    expect(out.patient.ischemiaSevereLogged).toBe(true);
    expect(out.events.some(e => e.includes('SEVERE MYOCARDIAL ISCHEMIA: Stunning has reached'))).toBe(true);

    // 6. Ischemia resolves (supply >= demand)
    currentState = {
      patient: { ...out.patient, myocardialStunning: 28.0, cad: false, hasCAD: false },
      vitals: { ...out.vitals, dia: 95, hr: 65, sys: 110 }, // normal hemodynamics, high supply
      electrolytes: { k: 4.0 }
    };
    inputs.currentHb = 14.0; // normal Hb
    out = CardiovascularEngine.tick(1, { ...currentState, time: 6 }, drugEffects, inputs);
    expect(out.patient.ischemiaActive).toBe(false);
    expect(out.patient.ischemiaMildLogged).toBe(false);
    expect(out.patient.ischemiaSevereLogged).toBe(false);
    expect(out.events.some(e => e.includes('MYOCARDIAL ISCHEMIA RESOLVED'))).toBe(true);
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

  describe('Phase 4: Pregnancy SVR multiplier (PregnancyPhysiologyEngine.ts integration)', () => {
    it('pregnancySvrMultiplier reduces SVR (and thereby contributes to a higher CO/lower MAP-resistance balance), defaulting to no effect when absent', () => {
      const state = createBaselineState();
      const inputs = baselineInputs(state);

      const withoutPregnancy = CardiovascularEngine.tick(1, { ...state, time: 10 }, createBaselineDrugEffects(), inputs);
      const withPregnancy = CardiovascularEngine.tick(1, { ...state, time: 10 }, { ...createBaselineDrugEffects(), pregnancySvrMultiplier: 0.8 }, inputs);

      expect(withPregnancy.vitals.svr).toBeLessThan(withoutPregnancy.vitals.svr);
    });
  });
});
