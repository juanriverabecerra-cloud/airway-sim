/**
 * Headless simulation harness (Layer 1B/1C).
 *
 * Drives the extracted, deterministic physics core (createInitialSimState + runPhysicsStep) entirely
 * outside React, so we can: record golden-master trajectories, run the FidelityOracle against real
 * running state, and fuzz thousands of seeded scenarios reproducibly. The ctx setters mirror the
 * hook's synchronous wrapper semantics exactly. See docs/architecture/audit_layer1_physics_core.md.
 */
// @ts-ignore - usePhysiology is a .js module without type declarations
import { runPhysicsStep, createInitialSimState, processMedCore } from '../../engine/usePhysiology.js';
// @ts-ignore - FidelityOracle is a .js module without type declarations
import { evaluateFidelity } from '../../engine/FidelityOracle.js';
// @ts-ignore - CardiovascularEngine .ts default resolution
import { CardiovascularEngine } from '../../engine/CardiovascularEngine';
// @ts-ignore - FidelityFuzzer is a .js module without type declarations
import { getGuidedFuzzAction, executeFuzzAction, setFuzzRng, resetFuzzRng } from '../../engine/FidelityFuzzer.js';
import { seedRngState, makeRng } from '../../engine/rng';

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
    // Used by processMedCore (action handlers), not by runPhysicsStep itself.
    setPatient: objSetter('patient'),
    setActiveMeds: scalarSetter('activeMeds'),
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
  /** Pre-place an 18G peripheral IV so medication actions can be administered (opt-in; off by default
   *  so the golden-master/oracle baselines are unchanged). */
  withPIV?: boolean;
}

/** A minimal 18G peripheral IV access line so drugs can be pushed in fuzz scenarios. */
function makePIVLine() {
  return {
    id: 'piv-headless-1',
    category: 'Peripheral IV',
    type: '18G Peripheral IV',
    name: '18G PIV (Right Forearm)',
    location: 'Right Forearm',
    failed: false,
    activeInfusions: [],
    activeMedInfusions: [],
    radius: 0.475,
    length: 30,
    venousPressure: 10,
    veinResistance: 500,
  };
}

/** Create a faithful headless sim from a real activeCase (baseVitals + patient), seeded for replay. */
export function createHeadlessSim(activeCase: any, opts: SimOptions = {}): SimHandle {
  const state = createInitialSimState(activeCase);
  state.ventSettings = opts.ventSettings || { ...DEFAULT_VENT };
  state.gasSettings = opts.gasSettings || { ...DEFAULT_GAS };
  if (opts.surgicalPhase) state.surgicalPhase = opts.surgicalPhase;
  state.patient = state.patient || {};
  if (opts.withPIV) {
    state.patient.accessLines = [...(state.patient.accessLines || []), makePIVLine()];
    state.patient.hasIV = true;
  }
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

export interface OracleAnomaly {
  tick: number;
  system: string;
  severity: string;
  rule: string;
  message: string;
}

export interface OracleRunResult {
  trajectory: VitalSample[];
  criticals: OracleAnomaly[];
  warnings: OracleAnomaly[];
}

/**
 * Step `n` ticks while auditing every tick with the FidelityOracle against the *real running state*.
 * This is the Layer 1C closed loop: the oracle has never before seen a live trajectory. `settleTicks`
 * skips oracle evaluation during the initial CV-equilibration transient. Returns all CRITICAL and
 * WARNING anomalies with their tick, so a failure is reproducible from the sim's seed.
 */
export function runWithOracle(sim: SimHandle, n: number, opts: { settleTicks?: number } = {}): OracleRunResult {
  const settle = opts.settleTicks ?? 3;
  const history: any[] = [];
  const criticals: OracleAnomaly[] = [];
  const warnings: OracleAnomaly[] = [];
  const trajectory: VitalSample[] = [];
  const keys = ['hr', 'sys', 'dia', 'map', 'spo2', 'bis', 'paco2', 'etco2', 'temp'];
  for (let i = 0; i < n; i++) {
    step(sim);
    const st = sim.ctx.stateRef.current;
    const v = st.vitals;
    history.push({
      tick: st.time,
      vitals: { ...v },
      patient: { ...st.patient },
      electrolytes: { ...st.electrolytes },
      actionText: '',
    });
    if (history.length > 250) history.shift();
    const row: VitalSample = {};
    for (const k of keys) row[k] = v[k];
    trajectory.push(row);
    if (i < settle) continue;
    const { anomalies } = evaluateFidelity(st, history);
    for (const a of anomalies) {
      const rec: OracleAnomaly = { tick: st.time, system: a.system, severity: a.severity, rule: a.rule, message: a.message };
      if (a.severity === 'CRITICAL') criticals.push(rec);
      else if (a.severity === 'WARNING') warnings.push(rec);
    }
  }
  return { trajectory, criticals, warnings };
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

/** Representative comorbid cases (baseVitals + patient flags) for oracle-vs-physics property testing. */
export const AUDIT_CASES: Array<{ id: string; baseVitals: any; patient: any }> = [
  HEALTHY_CASE,
  {
    id: 'gm_septic',
    baseVitals: { hr: 115, sys: 92, dia: 50, spo2: 95, rr: 22, temp: 38.6, etco2: 0 },
    patient: { age: 64, sex: 'male', height: 178, weight: 88, position: 'Supine', isSeptic: true, gfr: 70, ef: 55 },
  },
  {
    id: 'gm_obese',
    baseVitals: { hr: 78, sys: 142, dia: 88, spo2: 94, rr: 16, temp: 37.0, etco2: 0 },
    patient: { age: 52, sex: 'female', height: 163, weight: 130, isObese: true, position: 'Supine', htn: true, gfr: 90, ef: 60 },
  },
  {
    id: 'gm_cardiac',
    baseVitals: { hr: 64, sys: 135, dia: 82, spo2: 96, rr: 14, temp: 36.6, etco2: 0 },
    patient: { age: 71, sex: 'male', height: 172, weight: 84, position: 'Supine', cad: true, chf: true, ef: 35, htn: true, onBetaBlocker: true, gfr: 65 },
  },
  {
    id: 'gm_copd',
    baseVitals: { hr: 88, sys: 128, dia: 78, spo2: 91, rr: 20, temp: 36.9, etco2: 0 },
    patient: { age: 66, sex: 'male', height: 170, weight: 72, position: 'Supine', copd: true, gfr: 85, ef: 55 },
  },
];

/**
 * Build the executeFuzzAction handler set bound to a headless sim. Drug administration goes through
 * the REAL processMedCore; vent/cpr/shock/position/o2 use faithful headless equivalents (shock calls
 * the real CardiovascularEngine.deliverShock). Fluid is a simplified intravascular bolus. Rebuild per
 * action so the current patient/access-lines are seen.
 */
export function makeFuzzHandlers(sim: SimHandle) {
  const stateRef = sim.ctx.stateRef;
  const logEvent = sim.ctx.logEvent;
  const actionCtx = () => ({
    stateRef,
    patient: stateRef.current.patient,
    activeMeds: stateRef.current.activeMeds,
    setPatient: sim.ctx.setPatient,
    setActiveMeds: sim.ctx.setActiveMeds,
    logEvent,
    logQualityEvent: sim.ctx.logQualityEvent,
    setSurgicalPhase: sim.ctx.setSurgicalPhase,
    setElectrolytes: sim.ctx.setElectrolytes,
  });
  return {
    patient: stateRef.current.patient,
    logEvent,
    setPatient: sim.ctx.setPatient,
    setSurgicalPhase: sim.ctx.setSurgicalPhase,
    handleProcessMed: (medId: string, dose: any, route: any, medType: any, unit: any, lineId: any) =>
      processMedCore(actionCtx(), medId, dose, route, medType, unit, lineId),
    handleSetVentSettings: (obj: any) => { Object.assign(stateRef.current.ventSettings, obj); },
    handleSetO2: (device: any, flow: any, fio2: any) => {
      sim.ctx.setPatient((p: any) => ({ ...p, currentO2Device: device, currentO2Flow: flow, currentFiO2: fio2 }));
    },
    handleToggleCPR: () => {
      sim.ctx.setPatient((p: any) => ({ ...p, cprActive: !p.cprActive, cprStartTime: !p.cprActive ? (stateRef.current.time ?? 0) : null }));
    },
    handleDeliverShock: (joules: number, sync: boolean) => {
      const p = stateRef.current.patient;
      const frc = p.lungVolumes?.frc_L ?? 2.4;
      const res = CardiovascularEngine.deliverShock({
        patient: p, activeMeds: stateRef.current.activeMeds || [],
        currentBuffer: p.oxygenBuffer ?? frc * 0.21, currentFRC_L: frc,
        bloodLossRatio: (p.ebl || 0) / (p.ebv || 5000), joules, isSync: sync,
        simulationTime: stateRef.current.time || 0,
        rng: makeRng(p.rng || seedRngState(1)),
      });
      sim.ctx.setPatient(res.patient);
      (res.events || []).forEach((m: string) => logEvent(m));
    },
    handlePushFluid: (_name: any, volume: any) => {
      sim.ctx.setIntravascularVolume((v: number) => v + (Number(volume) || 0));
    },
    establishAccess: () => {},
    performLarsonManeuver: () => {},
    checkCuffLeak: () => {},
    examineNpoHistory: () => {},
    handleExtubation: () => {},
  };
}

export interface FuzzOptions {
  seed?: number;
  actions?: number;
  stepsPerAction?: number;
  strategy?: string;
  settleTicks?: number;
}

export interface FuzzResult {
  criticals: OracleAnomaly[];
  warnings: OracleAnomaly[];
  applied: string[];
}

/**
 * The Layer 1C closed loop with PERTURBATION: a seeded guided fuzzer drives real clinical actions
 * (drugs/vent/shock/cpr/…) into the physics, and the FidelityOracle audits every resulting tick. A
 * CRITICAL anomaly is a hard physics violation; failures are reproducible from `seed`.
 */
export function fuzzWithOracle(activeCase: any, opts: FuzzOptions = {}): FuzzResult {
  const { seed = 1, actions = 40, stepsPerAction = 6, strategy = 'guided', settleTicks = 5 } = opts;
  const sim = createHeadlessSim(activeCase, { seed, withPIV: true });
  setFuzzRng(makeRng(seedRngState((Math.imul(seed, 2654435761) >>> 0) || 1)));
  const fuzzerState: any = {};
  const history: any[] = [];
  const criticals: OracleAnomaly[] = [];
  const warnings: OracleAnomaly[] = [];
  const applied: string[] = [];
  let tick = 0;
  try {
    for (let a = 0; a < actions; a++) {
      const st = sim.ctx.stateRef.current;
      let label = '';
      try {
        const action = getGuidedFuzzAction(st, fuzzerState, strategy);
        label = executeFuzzAction(action, makeFuzzHandlers(sim)) || (action && action.name) || '';
      } catch (e: any) {
        label = `ERR:${e && e.message}`;
      }
      applied.push(label);
      for (let s = 0; s < stepsPerAction; s++) {
        step(sim);
        tick++;
        const cur = sim.ctx.stateRef.current;
        history.push({
          tick: cur.time, vitals: { ...cur.vitals }, patient: { ...cur.patient },
          electrolytes: { ...cur.electrolytes }, actionText: label,
        });
        if (history.length > 250) history.shift();
        if (tick <= settleTicks) continue;
        const { anomalies } = evaluateFidelity(cur, history);
        for (const an of anomalies) {
          const rec: OracleAnomaly = { tick: cur.time, system: an.system, severity: an.severity, rule: an.rule, message: an.message };
          if (an.severity === 'CRITICAL') criticals.push(rec);
          else if (an.severity === 'WARNING') warnings.push(rec);
        }
      }
    }
  } finally {
    resetFuzzRng();
  }
  return { criticals, warnings, applied };
}
