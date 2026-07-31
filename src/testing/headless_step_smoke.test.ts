import { describe, it, expect } from 'vitest';
// @ts-ignore - JS module, no types
import { runPhysicsStep } from '../engine/usePhysiology.js';
import { seedRngState } from '../engine/rng';

/**
 * Layer 1B smoke test: proves the extracted runPhysicsStep(ctx) actually RUNS headless (no missing
 * closure, no structural break) and is deterministic. This is the runtime companion to the ESLint
 * no-undef check. A faithful golden master (via an extracted createInitialSimState) comes next; this
 * seed is a hand-built healthy adult sufficient to exercise the tick mechanics end-to-end.
 */

function healthyAdultSeed(seed = 12345) {
  const vitals = {
    hr: 72, sys: 120, dia: 80, map: 93, rr: 12,
    pip: 0, pplat: 0, vte: 0, bis: 98, temp: 37.0,
    tofCount: 4, tofRatio: 1.0, perceivedTofCount: 4, perceivedTofRatio: 1.0,
    mac: 0, etAgent: 0, fiAgent: 0, etN2O: 0, fiN2O: 0, fiO2: 21, etO2: 21,
    pao2: 100, paco2: 40, ph: 7.4,
    spo2: 100, sao2: 100,
    co: 5.0, svr: 1200, cmap: 93,
    metHb: 0.8, coHb: 1.0, cyanide: 0.0, lacticAcid: 1.0,
    cao2: 20.0, cvo2: 15.0, p50: 26.6, r_ratio: 0.90,
    lesTone: 25.0, gastricPressure: 7.0, bowelGasVolume: 1.0, gutMotility: 1.0,
    inflammatoryIleus: 0.0, postoperativeIleus: 0.0,
    mPAP: 15.0, HVPG: 5.0, pbf: 1000.0, habf: 300.0, thbf: 1300.0,
    renalArteryResistance: 1.0, cvp: 5.0,
    mapUnder60Time: 0.0, mapUnder55Time: 0.0,
    mapUnder60AlertTriggered: false, mapUnder55AlertTriggered: false,
    gfr: 120, urineOutputRate: 1.0,
  };
  const patient = {
    height: 175, weight: 80, sex: 'male', age: 40, bmi: 26.1,
    ebv: 6000, ebl: 0, bleedRate: 0.05,
    ibw: 70, lbw: 62, lbm: 62, ffm: 60, cbw: 70, mffm: 60, pkm: 70,
    lungVolumes: { frc_L: 2.4, tlc_L: 6.0, rv_L: 1.5, vc_L: 4.5 },
    position: 'Supine',
    isApneic: false, isParalyzed: false, isTopicalized: false,
    airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
    hasIV: true, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21,
    oxygenBuffer: 2.4 * 0.21,
    hasBisMonitor: true, hasTofMonitor: true, tofMonitorMode: 'quantitative',
    qualityEvents: [], accessLines: [], activeInfusions: [],
    baselineMap: 93, baselineHr: 72,
    isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0,
    biologicalDeath: false, myocardialStunning: 0, arrestThreshold: 1200,
    codeStartTime: null, apneaStartTime: null, shuntFraction: 0.05,
    patientBaseSVR: 1200, sepsisScore: 0, patientBaseSV: 70, patientBaseHR: 72,
    patientBaseSBP: 120, patientBaseDBP: 80, patientBaseRR: 12,
    metHb: 0.8, coHb: 1.0, cyanide: 0.0, lacticAcid: 1.0,
    glp1Held: true, nAChR_state: 'normal', ivGauge: '18G', fluidLine: 'gravity',
    stomach: 'empty', fluidInfusing: null, suxPotassiumLeaked: false, mhActive: false,
    cirrhosisFactor: 0.0, bilirubin: 1.0, inr: 1.0, creatinine: 1.0, albumin: 4.0,
    temp: 37.0, netFluidBalance: 0,
    // Layer 1A: pre-seed the serializable RNG for deterministic replay.
    rng: seedRngState(seed),
  };
  return {
    time: 0,
    vitals,
    targetVitals: { hr: 72, sys: 120, dia: 80 },
    patient,
    activeMeds: [] as any[],
    gasModels: {},
    intravascularVolume: 6000,
    totalBodyWaterLiters: 42,
    electrolytes: { na: 140, k: 4.0, cl: 100, ca: 9.0, ph: 7.4, mg: 2.0, phos: 3.5, hco3: 24, glucose: 90 },
    coags: { r_offset: 0, ma_offset: 0, angle_offset: 0 },
    ventSettings: { mode: 'spontaneous', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 21 },
    gasSettings: { agent: 'sevoflurane', dial: 0, o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 },
    surgicalPhase: 'Maintenance',
  };
}

/** Build a headless ctx whose setters mirror the hook's synchronous wrapper semantics. */
function makeHeadlessCtx(state: any, events: string[]) {
  const stateRef = { current: state };
  const applyObj = (field: string) => (update: any) => {
    const prev = stateRef.current[field];
    stateRef.current[field] = typeof update === 'function' ? update(prev) : { ...prev, ...update };
  };
  const applyScalar = (field: string) => (update: any) => {
    const prev = stateRef.current[field];
    stateRef.current[field] = typeof update === 'function' ? update(prev) : update;
  };
  return {
    stateRef,
    ventSettings: state.ventSettings,
    gasSettings: state.gasSettings,
    logEvent: (msg: string) => events.push(msg),
    logQualityEvent: () => {},
    setVitals: applyObj('vitals'),
    setElectrolytes: applyObj('electrolytes'),
    setCoags: applyObj('coags'),
    setTotalBodyWaterLiters: applyScalar('totalBodyWaterLiters'),
    setIntravascularVolume: applyScalar('intravascularVolume'),
    setSurgicalPhase: applyScalar('surgicalPhase'),
    setIsRunning: () => {},
    ffRemainingRef: { current: 0 },
    ffTotalRef: { current: 0 },
    electrolytes: state.electrolytes,
  };
}

function runHeadless(seed: number, steps: number) {
  const state = healthyAdultSeed(seed);
  const events: string[] = [];
  const ctx = makeHeadlessCtx(state, events);
  const trajectory: any[] = [];
  for (let i = 0; i < steps; i++) {
    const res = runPhysicsStep(ctx);
    expect(res).toBeDefined();
    const v = ctx.stateRef.current.vitals;
    trajectory.push({ hr: v.hr, map: v.map, spo2: v.spo2, bis: v.bis, paco2: v.paco2, temp: v.temp });
  }
  return { state: ctx.stateRef.current, trajectory, events };
}

describe('Layer 1B — headless runPhysicsStep smoke', () => {
  it('runs many steps without throwing and keeps vitals finite', () => {
    const { trajectory } = runHeadless(12345, 120);
    expect(trajectory.length).toBe(120);
    // The extraction-correctness invariant: no NaN/Infinity anywhere (broken math would leak here).
    // We do NOT assert clinical stability — that needs the faithful createInitialSimState seed (next),
    // not this hand-built one, which the engines drive to extremes.
    const range = (k: string) => {
      const xs = trajectory.map((p) => p[k]);
      return { min: Math.min(...xs), max: Math.max(...xs) };
    };
    // eslint-disable-next-line no-console
    console.log('[smoke] hr', range('hr'), 'map', range('map'), 'spo2', range('spo2'), 'bis', range('bis'));
    for (const p of trajectory) {
      for (const k of ['hr', 'map', 'bis', 'paco2', 'temp', 'spo2'] as const) {
        expect(Number.isFinite(p[k]), `${k}=${p[k]}`).toBe(true);
      }
    }
  });

  it('is deterministic: same seed => identical trajectory', () => {
    const a = runHeadless(999, 90);
    const b = runHeadless(999, 90);
    expect(a.trajectory).toEqual(b.trajectory);
  });

  it('advances the serializable RNG counter (state is being consumed & carried)', () => {
    const { state } = runHeadless(2026, 60);
    expect(state.patient.rng).toBeDefined();
    expect(state.patient.rng.seed).toBe(2026);
    expect(state.patient.rng.counter).toBeGreaterThan(0);
  });
});
