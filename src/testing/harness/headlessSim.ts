/**
 * Headless simulation harness (Layer 1B/1C).
 *
 * Drives the extracted, deterministic physics core (createInitialSimState + runPhysicsStep) entirely
 * outside React, so we can: record golden-master trajectories, run the FidelityOracle against real
 * running state, and fuzz thousands of seeded scenarios reproducibly. The ctx setters mirror the
 * hook's synchronous wrapper semantics exactly. See docs/architecture/audit_layer1_physics_core.md.
 */
// @ts-ignore - usePhysiology is a .js module without type declarations
import { runPhysicsStep, createInitialSimState } from '../../engine/usePhysiology.js';
import { seedRngState } from '../../engine/rng';

export interface SimHandle {
  state: any;
  ctx: any;
  events: string[];
  quality: any[];
}

const DEFAULT_VENT = { mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 21 };
const DEFAULT_GAS = { agent: 'sevoflurane', dial: 0, o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 };

/** Build a headless ctx whose setters mirror the hook's synchronous wrapper semantics. */
export function makeHeadlessCtx(state: any, events: string[], quality: any[]) {
  const stateRef = { current: state };
  const objSetter = (field: string) => (u: any) => {
    const prev = stateRef.current[field];
    stateRef.current[field] = typeof u === 'function' ? u(prev) : { ...prev, ...u };
  };
  const scalarSetter = (field: string) => (u: any) => {
    const prev = stateRef.current[field];
    stateRef.current[field] = typeof u === 'function' ? u(prev) : u;
  };
  return {
    stateRef,
    ventSettings: state.ventSettings,
    gasSettings: state.gasSettings,
    logEvent: (msg: string) => events.push(msg),
    logQualityEvent: (e: any) => quality.push(e),
    setVitals: objSetter('vitals'),
    setElectrolytes: objSetter('electrolytes'),
    setCoags: objSetter('coags'),
    setTotalBodyWaterLiters: scalarSetter('totalBodyWaterLiters'),
    setIntravascularVolume: scalarSetter('intravascularVolume'),
    setSurgicalPhase: scalarSetter('surgicalPhase'),
    setIsRunning: () => {},
    ffRemainingRef: { current: 0 },
    ffTotalRef: { current: 0 },
    // Stable pre-step snapshot ref, matching the hook's bare `electrolytes` closure semantics.
    electrolytes: state.electrolytes,
  };
}

export interface SimOptions {
  seed?: number;
  ventSettings?: any;
  gasSettings?: any;
  surgicalPhase?: string;
}

/** Create a faithful headless sim from a real activeCase (baseVitals + patient), seeded for replay. */
export function createHeadlessSim(activeCase: any, opts: SimOptions = {}): SimHandle {
  const state = createInitialSimState(activeCase);
  state.ventSettings = opts.ventSettings || { ...DEFAULT_VENT };
  state.gasSettings = opts.gasSettings || { ...DEFAULT_GAS };
  if (opts.surgicalPhase) state.surgicalPhase = opts.surgicalPhase;
  state.patient = state.patient || {};
  state.patient.rng = seedRngState(opts.seed ?? 12345);
  const events: string[] = [];
  const quality: any[] = [];
  const ctx = makeHeadlessCtx(state, events, quality);
  return { state: ctx.stateRef.current, ctx, events, quality };
}

/** Advance one physics tick. Returns { skipped } from runPhysicsStep. */
export function step(sim: SimHandle): { skipped?: boolean } {
  return runPhysicsStep(sim.ctx);
}

export type VitalSample = Record<string, number>;

/** Advance `n` ticks; returns the per-tick sampled vitals trajectory. */
export function stepN(sim: SimHandle, n: number, keys: string[] = ['hr', 'sys', 'dia', 'map', 'spo2', 'bis', 'paco2', 'etco2', 'temp']): VitalSample[] {
  const traj: VitalSample[] = [];
  for (let i = 0; i < n; i++) {
    step(sim);
    const v = sim.ctx.stateRef.current.vitals;
    const row: VitalSample = {};
    for (const k of keys) row[k] = v[k];
    traj.push(row);
  }
  return traj;
}

/** A canonical healthy adult activeCase (baseVitals + patient) for golden-master/regression use. */
export const HEALTHY_CASE = {
  id: 'gm_healthy_adult',
  baseVitals: { hr: 72, sys: 120, dia: 80, spo2: 99, rr: 12, temp: 37.0, etco2: 0 },
  patient: {
    age: 38, sex: 'male', height: 175, weight: 80,
    position: 'Supine',
    isObese: false, isSeptic: false, trauma: false, copd: false, chf: false,
    cad: false, htn: false, gfr: 100, ef: 60,
  },
};
