/**
 * Layer 2 — metamorphic / differential testing harness.
 *
 * Run two identically-seeded headless sims that differ in exactly ONE input (e.g. one gets a drug),
 * then assert the target output moved in the physiology-mandated DIRECTION. This catches sign/direction
 * errors — a wrong-signed response is internally consistent (invisible to the oracle) but flips the
 * direction here. Deterministic ⇒ any violation is reproducible. See audit_layer2_physiology_correctness.md.
 */
import { createHeadlessSim, stepN, makeFuzzHandlers, type SimHandle } from './headlessSim';

/** Read a numeric telemetry value, checking vitals first then patient. */
export function getVital(sim: SimHandle, key: string): number | undefined {
  const v = sim.state.vitals?.[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const p = sim.state.patient?.[key];
  return typeof p === 'number' && Number.isFinite(p) ? p : undefined;
}

/** Administer a medication through the REAL processMedCore path (the production drug logic). */
export function giveMed(
  sim: SimHandle,
  medId: string,
  dose: number,
  opts: { route?: string; type?: string; unit?: string } = {},
): void {
  const { route = 'IV', type = 'Bolus', unit = 'mg' } = opts;
  const handlers = makeFuzzHandlers(sim);
  const lineId = sim.state.patient?.accessLines?.[0]?.id || null;
  handlers.handleProcessMed(medId.toLowerCase(), dose, route, type, unit, lineId);
}

export type Direction = 'up' | 'down' | 'same';

export interface MetamorphicOptions {
  key: string;
  direction: Direction;
  minDelta?: number;   // required magnitude of the move (default 0)
  sameTol?: number;    // tolerance for 'same' (default 1)
  steps?: number;      // ticks to run after the perturbation (default 60)
  settle?: number;     // ticks to run BEFORE perturbing (default 0)
  seed?: number;
  ventSettings?: any;
  gasSettings?: any;
  surgicalPhase?: string;
  /** Applied to BOTH sims before the differential mutate + settle (e.g. give the pre-drug that a
   *  reversal agent reverses, or put the patient on mechanical ventilation). */
  setup?: (sim: SimHandle) => void;
}

/** Put a headless sim on controlled mechanical ventilation (paralyzed, tube in trachea) so vent
 *  settings actually drive gas exchange. Mutates ventSettings in place so the tick sees it. */
export function intubateMechanical(sim: SimHandle, ventRR = 12): void {
  const p = sim.state.patient;
  p.airwaySecured = true;
  p.ventilationStatus = 'mechanical';
  p.tubePosition = 'trachea';
  Object.assign(sim.state.ventSettings, { mode: 'PCV-VG', rr: ventRR, vt: 500, peep: 5, pmax: 40, fio2: 21 });
}

export interface MetamorphicResult {
  key: string;
  direction: Direction;
  base: number | undefined;
  treat: number | undefined;
  delta: number;
  pass: boolean;
}

/**
 * `mutate(sim)` applies the single-input difference to the treatment sim (e.g. `giveMed`). Returns the
 * baseline/treatment target values, their delta, and whether the direction law held.
 */
export function runMetamorphic(activeCase: any, mutate: (sim: SimHandle) => void, opts: MetamorphicOptions): MetamorphicResult {
  const { key, direction, minDelta = 0, sameTol = 1, steps = 60, settle = 0, seed = 1 } = opts;
  const simOpts = { seed, withPIV: true, ventSettings: opts.ventSettings, gasSettings: opts.gasSettings, surgicalPhase: opts.surgicalPhase };
  const base = createHeadlessSim(activeCase, simOpts);
  const treat = createHeadlessSim(activeCase, simOpts);
  if (opts.setup) { opts.setup(base); opts.setup(treat); }
  if (settle > 0) { stepN(base, settle); stepN(treat, settle); }
  mutate(treat);
  stepN(base, steps);
  stepN(treat, steps);
  const b = getVital(base, key);
  const t = getVital(treat, key);
  const delta = (t ?? 0) - (b ?? 0);
  let pass: boolean;
  if (direction === 'down') pass = delta <= -minDelta;
  else if (direction === 'up') pass = delta >= minDelta;
  else pass = Math.abs(delta) <= sameTol;
  return { key, direction, base: b, treat: t, delta, pass };
}
