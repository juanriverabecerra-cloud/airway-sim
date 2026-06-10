import { describe, it, expect } from 'vitest';
import { ConsciousnessEngine } from '../engine/ConsciousnessEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';

describe('Connected Intraoperative Awareness & Cognitive Crises Unit Tests', () => {

  const createBaselinePatient = () => ({
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
    patientBaseHR: 70,
    patientBaseRR: 12,
    intravascularVolume: 5000,

    // Consciousness states
    lcActivity: 1.0,
    tmnActivity: 1.0,
    vlpoActivity: 0.0,
    mnpoActivity: 0.0,
    ldtPptActivity: 1.0,
    prfActivity: 1.0,
    vtaActivity: 1.0,
    orexinLevel: 1.0,
    slowOscillationPower: 0.1,
    thalamocorticalConn: 1.0,
    frontoparietalFeedback: 1.0,
    corticocorticalConn: 1.0,
    basalGangliaConn: 1.0,
    alpha5GabaaOccupancy: 0.0,
    alpha4GabaaOccupancy: 0.0,
    explicitEncoding: 1.0,
    explicitConsolidation: 0.1,
    ltpInductionInhibited: false,
    p300Amplitude: 10.0,
    n2p3Amplitude: 12.0,
    p2Amplitude: 8.0,
    oldNewEffect: 3.0,
    mismatchNegativity: 3.5,
    p1Amplitude: 4.0,
    n2Latency: 200,
    hippocampalThetaFreq: 7.0,
    hippocampalThetaPower: 1.0,
    amygdaloHippocampalConn: 1.0,
    neuralInertiaLag: 0.0,
    alpha5Knockout: false,
    alpha4Knockout: false,
    tmnPropofolResistant: false,
    narcolepsy: false,
    alpha2AKnockout: false,

    isAwarenessActive: false,
    ptsdScore: 0.0,
    hasExplicitRecall: false,
    hasImplicitRecall: false,
    isDreaming: false,
    preopMemoryEncoded: true,
    retrogradeFacilitationRatio: 1.0,
    fearMemoryRetrieved: false,
    reconsolidationWindowOpen: false,
    reconsolidationTimer: 0,
    fearConditioning: 0.0,
    fearExtinguished: false,
    displayEmergenceLag: false
  });

  const createBaselineVitals = () => ({
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
  });

  const createBaselineInputs = () => ({
    propofolCe: 0.0,
    dexmedCe: 0.0,
    thiopentalCe: 0.0,
    midazolamCe: 0.0,
    ketamineCe: 0.0,
    etomidateCe: 0.0,
    atipamezoleCe: 0.0,
    methylphenidateCe: 0.0,
    scopolamineCe: 0.0,
    sevoMac: 0.0,
    isoMac: 0.0,
    haloMac: 0.0,
    n2oMac: 0.0,
    isSyncShock: false,
    time: 100
  });

  const runAwarenessLogic = (patient: any, vitals: any, inputs: any, maxNMJOccupancy: number, surgicalPhase: string) => {
    const sevoMac = inputs.sevoMac;
    const isoMac = inputs.isoMac;
    const haloMac = inputs.haloMac;
    const n2oMac = inputs.n2oMac;
    const currentMac = sevoMac + isoMac + haloMac + n2oMac;
    const propofolCe = inputs.propofolCe;
    const thiopentalCe = inputs.thiopentalCe;
    const midazolamCe = inputs.midazolamCe;
    const etomidateCe = inputs.etomidateCe;

    const consciousnessOutput = ConsciousnessEngine.tick(1, patient, vitals, inputs);
    Object.assign(patient, consciousnessOutput);

    const isParalyzed = maxNMJOccupancy > 0.90;
    const isLightAnesthesia = currentMac < 0.4 && (propofolCe < 0.8) && (thiopentalCe < 1.0) && (midazolamCe < 0.05) && (etomidateCe < 0.1);
    const surgicalStimulus = surgicalPhase === 'Incision' || surgicalPhase === 'Maintenance';
    const hasAwarenessTrigger = isParalyzed && isLightAnesthesia && surgicalStimulus;

    let isAwarenessActive = patient.isAwarenessActive || false;
    let ptsdScore = patient.ptsdScore || 0.0;
    let hasExplicitRecall = patient.hasExplicitRecall || false;
    let hasImplicitRecall = patient.hasImplicitRecall || false;

    let awarenessHrOffset = 0;
    let awarenessSvrOffset = 0;

    if (hasAwarenessTrigger) {
        if (!isAwarenessActive) {
            isAwarenessActive = true;
        }
        
        awarenessHrOffset = 35;
        awarenessSvrOffset = 45;

        const midazolamAmnestic = midazolamCe > 0.08;
        if (!midazolamAmnestic) {
            ptsdScore = Math.min(100.0, ptsdScore + 1.2);
            if (consciousnessOutput.explicitEncoding > 0.5 && consciousnessOutput.explicitConsolidation < 1.0) {
                hasExplicitRecall = true;
            }
        }
        if (propofolCe < 1.5 && currentMac < 0.6) {
            hasImplicitRecall = true;
        }
    } else {
        // If there's no awareness trigger but awareness is still active (not resolved), ptsdScore still accumulates
        if (isAwarenessActive) {
            const midazolamAmnestic = midazolamCe > 0.08;
            if (!midazolamAmnestic) {
                ptsdScore = Math.min(100.0, ptsdScore + 1.2);
            }
        }
    }

    const restoredDepth = currentMac > 0.8 || propofolCe > 1.5;
    if (isAwarenessActive && restoredDepth) {
        isAwarenessActive = false;
    }

    let retrogradeFacilitationRatio = 1.0;
    if (patient.preopMemoryEncoded) {
        if ((propofolCe > 0.01 && propofolCe < 0.5) || (midazolamCe > 0.001 && midazolamCe < 0.05)) {
            retrogradeFacilitationRatio = 1.3;
        }
    }

    let reconsolidationWindowOpen = patient.reconsolidationWindowOpen || false;
    let reconsolidationTimer = typeof patient.reconsolidationTimer === 'number' ? patient.reconsolidationTimer : 0;
    let fearConditioning = typeof patient.fearConditioning === 'number' ? patient.fearConditioning : 0.0;
    let fearExtinguished = patient.fearExtinguished || false;

    if (patient.fearMemoryRetrieved && !patient.reconsolidationWindowOpen) {
        reconsolidationWindowOpen = true;
        reconsolidationTimer = 600;
        fearConditioning = 1.0;
    }

    if (reconsolidationWindowOpen) {
        reconsolidationTimer = Math.max(0, reconsolidationTimer - 1);
        const isEraseAgentPresent = midazolamCe > 0.01 || (sevoMac > 0.05 && sevoMac < 0.3);
        if (isEraseAgentPresent) {
            fearConditioning = Math.max(0.0, fearConditioning - 0.005);
            if (fearConditioning === 0.0 && !fearExtinguished) {
                fearExtinguished = true;
            }
        }
    }

    patient.isAwarenessActive = isAwarenessActive;
    patient.ptsdScore = ptsdScore;
    patient.hasExplicitRecall = hasExplicitRecall;
    patient.hasImplicitRecall = hasImplicitRecall;
    patient.retrogradeFacilitationRatio = retrogradeFacilitationRatio;
    patient.reconsolidationWindowOpen = reconsolidationWindowOpen;
    patient.reconsolidationTimer = reconsolidationTimer;
    patient.fearConditioning = fearConditioning;
    patient.fearExtinguished = fearExtinguished;

    return {
      awarenessHrOffset,
      awarenessSvrOffset
    };
  };

  it('should verify connected awareness trigger and resulting sympathetic spike & ptsd risk', () => {
    const patient = createBaselinePatient();
    const vitals = createBaselineVitals();
    const inputs = createBaselineInputs();

    const maxNMJOccupancy = 0.95;
    const surgicalPhase = 'Incision';

    let offsets = { awarenessHrOffset: 0, awarenessSvrOffset: 0 };
    for (let i = 0; i < 10; i++) {
      offsets = runAwarenessLogic(patient, vitals, inputs, maxNMJOccupancy, surgicalPhase);
    }

    expect(patient.isAwarenessActive).toBe(true);
    expect(offsets.awarenessHrOffset).toBe(35);
    expect(offsets.awarenessSvrOffset).toBe(45);
    expect(patient.ptsdScore).toBeCloseTo(12.0, 1);
    expect(patient.hasExplicitRecall).toBe(true);

    const drugEffects = {
      drugSvrMod: 1.0,
      drugInotropyMod: 1.0,
      svrSympatheticSpike: offsets.awarenessSvrOffset,
      contractilitySympatheticSpike: 0.3,
      hrSympatheticSpike: offsets.awarenessHrOffset,
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
    };

    const cvInput = {
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
      getAnatomicalParameter: (k: any, d: any) => d
    };

    let currentState = { patient, vitals: { ...vitals }, electrolytes: { k: 4.0 } };
    for (let t = 0; t < 45; t++) {
      const out = CardiovascularEngine.tick(1, currentState, drugEffects, cvInput);
      currentState.vitals = out.vitals;
      currentState.patient = out.patient;
    }

    expect(currentState.vitals.hr).toBeGreaterThan(95);
    expect(currentState.vitals.sys).toBeGreaterThan(150);
  });

  it('should verify Midazolam administration during awareness blunts PTSD accumulation', () => {
    const patient = createBaselinePatient();
    const vitals = createBaselineVitals();
    const inputs = createBaselineInputs();

    const maxNMJOccupancy = 0.95;
    const surgicalPhase = 'Incision';

    // 1. Establish awareness under light anesthesia (no midazolam)
    for (let i = 0; i < 5; i++) {
      runAwarenessLogic(patient, vitals, inputs, maxNMJOccupancy, surgicalPhase);
    }
    expect(patient.isAwarenessActive).toBe(true);
    const ptsdScoreBeforeMidazolam = patient.ptsdScore;
    expect(ptsdScoreBeforeMidazolam).toBeGreaterThan(0);

    // 2. Administer rescue midazolam (midazolamCe = 0.12)
    inputs.midazolamCe = 0.12;
    for (let i = 0; i < 5; i++) {
      runAwarenessLogic(patient, vitals, inputs, maxNMJOccupancy, surgicalPhase);
    }

    // Patient remains in awareness state but PTSD score accumulation is frozen
    expect(patient.isAwarenessActive).toBe(true);
    expect(patient.ptsdScore).toBe(ptsdScoreBeforeMidazolam);
    expect(patient.hasExplicitRecall).toBe(true); // already consolidated in first 5 seconds
  });

  it('should verify fear memory extinction during the 10-minute reconsolidation window', () => {
    const patient = createBaselinePatient();
    const vitals = createBaselineVitals();
    const inputs = createBaselineInputs();
    inputs.midazolamCe = 0.05;

    patient.fearMemoryRetrieved = true;

    for (let i = 0; i < 200; i++) {
      runAwarenessLogic(patient, vitals, inputs, 0.0, 'Pre-Op');
    }

    expect(patient.fearConditioning).toBe(0.0);
    expect(patient.fearExtinguished).toBe(true);
  });
});
