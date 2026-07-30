/**
 * Unified Single-Compartment Respiratory Mechanics Solver
 *
 * Replaces three previously-independent approximations of the same physical breath:
 *  - `VentModel.js`'s `synthesizeVentFlow`/`synthesizeVentPressure` (already used the
 *    correct R*C time constant and exponential passive-exhalation decay, but were never
 *    actually imported/called anywhere — confirmed dead code this session).
 *  - `WaveformDatabase.js`'s `ventPressure`/`ventFlow` shape functions (the ones actually
 *    rendered, via `CanvasWaveform.jsx`'s generic dispatch) — a fixed 0.3s decay constant
 *    and fixed amplitude fractions, not derived from live resistance/compliance at all.
 *  - `WaveformDatabase.js`'s `ventVolume` shape functions — a third, separately hand-tuned
 *    approximation of the same breath's volume curve.
 *
 * This integrates the real single-compartment equation of motion once per breath-phase
 * and returns one consistent {pressure, flow, volume} trajectory that every consumer
 * (ventilator time-strips, the flow-volume loop's inspiratory limb, the pressure-volume
 * loop) reads from, instead of each re-approximating the same physical event.
 *
 * Equation of motion (volume measured as deltaV above FRC, so deltaV=0/flow=0 at the
 * start of every breath gives Paw=PEEP exactly, the correct boundary condition):
 *   Paw(t) - PEEP = deltaPel(deltaV(t)) + R * deltaVdot(t)
 * where deltaPel(deltaV) = elasticRecoilPressure(FRC+deltaV) - elasticRecoilPressure(FRC),
 * using the shared nonlinear curve from LungComplianceModel.js (Stage 0) rather than a
 * flat linear compliance — so a breath that pushes further up the curve (large Vt, high
 * PEEP) naturally shows the real "beak"/upper-inflection-point flattening real ventilator
 * PV loops show, and stays close to the old linear approximation for normal lung-
 * protective tidal volumes, which deliberately stay in the curve's near-flat-compliance
 * midsection.
 *
 * VCV: flow is the controlled/known quantity (constant during inspiration) -> deltaV(t)
 * and hence Paw(t) follow algebraically, no ODE solve needed.
 * PCV: pressure is the controlled/known quantity (a step) -> deltaV(t) is the solution of
 * a genuine (mildly nonlinear, because deltaPel is nonlinear) first-order ODE, integrated
 * numerically (fixed 1ms-substep forward Euler — stable here since R*C time constants in
 * this engine, even in severe bronchospasm, stay well above 10ms).
 * Expiration (both modes): passive, Paw=PEEP, same ODE integrated from end-inspiratory
 * deltaV back toward 0.
 */

import { elasticRecoilPressure, calibrateComplianceCurve } from './LungComplianceModel.js';

const SUBSTEP_SEC = 0.001;
const OUTPUT_POINTS = 150;
const LOOP_OUTPUT_POINTS = 260;

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function deltaPel(deltaVMl, frcMl, complianceCurve) {
  return elasticRecoilPressure(frcMl + deltaVMl, complianceCurve) - elasticRecoilPressure(frcMl, complianceCurve);
}

function airwayResistanceAtVolume(volumeMl, frcMl, rFrc, obstructionSeverity) {
  const safeVolume = Math.max(frcMl * 0.05, volumeMl);
  if (safeVolume >= frcMl) {
    return Math.max(0.5, rFrc * (frcMl / safeVolume));
  }
  const k = 1.0 + 3.0 * Math.max(0, Math.min(1, obstructionSeverity));
  return Math.max(0.5, rFrc * Math.pow(frcMl / safeVolume, k));
}

function downsampleTimeUniform(rawSamples, totalDuration, numPoints) {
  const out = new Array(numPoints);
  let rawIdx = 0;
  for (let i = 0; i < numPoints; i++) {
    const targetT = (i / (numPoints - 1)) * totalDuration;
    while (rawIdx < rawSamples.length - 2 && rawSamples[rawIdx + 1].t < targetT) rawIdx++;
    const a = rawSamples[rawIdx];
    const b = rawSamples[Math.min(rawSamples.length - 1, rawIdx + 1)];
    const span = b.t - a.t;
    const frac = span > 0 ? Math.max(0, Math.min(1, (targetT - a.t) / span)) : 0;
    out[i] = {
      t: targetT,
      paw: a.paw + frac * (b.paw - a.paw),
      flow: a.flow + frac * (b.flow - a.flow),
      deltaV: a.deltaV + frac * (b.deltaV - a.deltaV)
    };
  }
  return out;
}

/**
 * Curve-shape-preserving resample: uniform in cumulative arc length through the
 * normalized (paw, flow, deltaV) state space, rather than uniform in time. A
 * time-uniform grid (`downsampleTimeUniform`, used for the scrolling ventilator
 * strips) starves fast-but-brief dynamics -- e.g. the ~30ms expiratory valve-opening
 * transient (tau_valve, below) -- of points relative to the many seconds of
 * comparatively static end-expiratory pause in the same breath. That's fine for a
 * scrolling time-strip (a flat segment doesn't need many points to read correctly),
 * but it turns that fast transient into a visible straight-line "kink" when the same
 * sparse points are instead connected as a closed pressure-volume or flow-volume
 * LOOP, where the eye is judging the traced shape, not its timing. This is the
 * standard curve-reparametrization fix (arc-length resampling) -- it changes only
 * which of the already-computed high-resolution points are kept for display, not
 * the underlying physics.
 */
function resampleArcLength(rawSamples, numPoints) {
  const n = rawSamples.length;
  if (n < 2) return rawSamples.slice();

  let pawMin = Infinity, pawMax = -Infinity;
  let flowMin = Infinity, flowMax = -Infinity;
  let dvMin = Infinity, dvMax = -Infinity;
  for (const s of rawSamples) {
    if (s.paw < pawMin) pawMin = s.paw;
    if (s.paw > pawMax) pawMax = s.paw;
    if (s.flow < flowMin) flowMin = s.flow;
    if (s.flow > flowMax) flowMax = s.flow;
    if (s.deltaV < dvMin) dvMin = s.deltaV;
    if (s.deltaV > dvMax) dvMax = s.deltaV;
  }
  // Normalize each axis by its own range within this breath so no single dimension
  // (e.g. deltaV in mL vs. flow in L/s) dominates the arc-length metric.
  const pawScale = Math.max(1e-6, pawMax - pawMin);
  const flowScale = Math.max(1e-6, flowMax - flowMin);
  const dvScale = Math.max(1e-6, dvMax - dvMin);

  const arc = new Array(n);
  arc[0] = 0;
  for (let i = 1; i < n; i++) {
    const dPaw = (rawSamples[i].paw - rawSamples[i - 1].paw) / pawScale;
    const dFlow = (rawSamples[i].flow - rawSamples[i - 1].flow) / flowScale;
    const dDv = (rawSamples[i].deltaV - rawSamples[i - 1].deltaV) / dvScale;
    arc[i] = arc[i - 1] + Math.sqrt(dPaw * dPaw + dFlow * dFlow + dDv * dDv);
  }
  const totalArc = arc[n - 1] || 1;

  const out = new Array(numPoints);
  let rawIdx = 0;
  for (let i = 0; i < numPoints; i++) {
    const targetArc = (i / (numPoints - 1)) * totalArc;
    while (rawIdx < n - 2 && arc[rawIdx + 1] < targetArc) rawIdx++;
    const a = rawSamples[rawIdx];
    const b = rawSamples[Math.min(n - 1, rawIdx + 1)];
    const span = arc[rawIdx + 1] - arc[rawIdx];
    const frac = span > 0 ? Math.max(0, Math.min(1, (targetArc - arc[rawIdx]) / span)) : 0;
    out[i] = {
      t: a.t + frac * (b.t - a.t),
      paw: a.paw + frac * (b.paw - a.paw),
      flow: a.flow + frac * (b.flow - a.flow),
      deltaV: a.deltaV + frac * (b.deltaV - a.deltaV)
    };
  }
  return out;
}

/**
 * Integrates one full breath (inspiration + expiration) of the equation of motion.
 *
 * @param {object} params
 * @param {'vcv'|'pcv'} params.mode
 * @param {number} params.R - airway resistance, cmH2O/(L/s)
 * @param {object} params.complianceCurve - from LungComplianceModel.calibrateComplianceCurve()
 * @param {number} params.frc - mL
 * @param {number} params.peep - cmH2O
 * @param {number} params.targetVtMl - mL, used when mode='vcv'
 * @param {number} params.targetPinsp - cmH2O above PEEP, used when mode='pcv'
 * @param {number} params.inspTimeSec
 * @param {number} params.expTimeSec
 * @returns {{raw: Array<{t:number, paw:number, flow:number, deltaV:number}>, totalDuration:number}}
 *   the full-resolution (1ms substep) trajectory, before any display resampling.
 */
export function computeRawBreath(params) {
  const mode = params?.mode || 'vcv';
  const R = Math.max(0.5, safeNumber(params?.R, 5));
  const curve = params?.complianceCurve;
  const frc = Math.max(100, safeNumber(params?.frc, 2400));
  const peep = Math.max(0, safeNumber(params?.peep, 0));
  const targetVtMl = Math.max(10, safeNumber(params?.targetVtMl, 500));
  const targetPinsp = Math.max(1, safeNumber(params?.targetPinsp, 15));
  const inspTimeSec = Math.max(0.05, safeNumber(params?.inspTimeSec, 1.5));
  const expTimeSec = Math.max(0.05, safeNumber(params?.expTimeSec, 3.0));
  const obstructionSeverity = safeNumber(params?.obstructionSeverity, 0);

  if (mode === 'apneic') {
    const raw = [];
    const totalDuration = inspTimeSec + expTimeSec;
    const nSteps = OUTPUT_POINTS;
    const dt = totalDuration / (nSteps - 1);
    for (let i = 0; i < nSteps; i++) {
      raw.push({ t: i * dt, paw: peep, flow: 0, deltaV: 0 });
    }
    return { raw, totalDuration, pip: peep, pplat: peep };
  }

  // Iterative solver to reach steady-state trapped volume (auto-PEEP)
  let startV = 0;
  let raw = [];
  let lastPAlvEnd = null; // true zero-flow (inspiratory-hold-equivalent) plateau pressure
  const numIters = 15;

  for (let iter = 0; iter < numIters; iter++) {
    raw = [];
    let dV = startV;

    if (mode === 'spontaneous') {
      const nStepsInsp = Math.max(10, Math.round(inspTimeSec / SUBSTEP_SEC));
      const dtInsp = inspTimeSec / nStepsInsp;
      const R_circuit = 1.5;
      
      const C = curve?.cFrc || 60;
      const tau = (R + R_circuit) * (C / 1000);
      const pmusMax = (targetVtMl / C) * (1.25 + 0.85 * tau / inspTimeSec);
      
      // Spontaneous Inspiration
      for (let i = 0; i <= nStepsInsp; i++) {
        const ti = i * dtInsp;
        const pmus = pmusMax * Math.sin((Math.PI * ti) / inspTimeSec);
        const pAlv = peep + deltaPel(dV, frc, curve) - pmus;
        const currentR = airwayResistanceAtVolume(frc + dV, frc, R, obstructionSeverity);
        const flowLs = (peep - pAlv) / (currentR + R_circuit);
        const paw = peep - flowLs * R_circuit;
        raw.push({ t: ti, paw, flow: flowLs, deltaV: dV });
        dV = Math.max(0, dV + flowLs * 1000 * dtInsp);
      }
      
      const tInspEnd = raw[raw.length - 1].t;
      const nStepsExp = Math.max(10, Math.round(expTimeSec / SUBSTEP_SEC));
      const dtExp = expTimeSec / nStepsExp;
      
      // Spontaneous Expiration
      for (let i = 1; i <= nStepsExp; i++) {
        const ti = i * dtExp;
        const pAlv = peep + deltaPel(dV, frc, curve);
        const currentR = airwayResistanceAtVolume(frc + dV, frc, R, obstructionSeverity);
        const flowLs = (peep - pAlv) / (currentR + R_circuit);
        const paw = peep - flowLs * R_circuit;
        raw.push({ t: tInspEnd + ti, paw, flow: flowLs, deltaV: dV });
        dV = Math.max(0, dV + flowLs * 1000 * dtExp);
      }
    } else {
      if (mode === 'vcv') {
        const tau_rise = 0.03; // 30ms rapid flow rise
        const effInspTime = inspTimeSec - tau_rise * (1 - Math.exp(-inspTimeSec / tau_rise));
        const Qconst = (targetVtMl / 1000) / Math.max(0.1, effInspTime); // L/s
        const nSteps = Math.max(12, Math.round(inspTimeSec / SUBSTEP_SEC));
        const dt = inspTimeSec / nSteps;
        for (let i = 0; i <= nSteps; i++) {
          const ti = i * dt;
          const flowLs = Qconst * (1 - Math.exp(-ti / tau_rise));
          dV = dV + flowLs * 1000 * dt;
          const currentR = airwayResistanceAtVolume(frc + dV, frc, R, obstructionSeverity);
          const paw = peep + deltaPel(dV, frc, curve) + currentR * flowLs;
          raw.push({ t: ti, paw, flow: flowLs, deltaV: dV });
        }
      } else {
        // PCV: decelerating flow profile
        const nSteps = Math.max(12, Math.round(inspTimeSec / SUBSTEP_SEC));
        const dt = inspTimeSec / nSteps;
        const tau_rise = 0.05; // 50ms pressure rise
        for (let i = 0; i <= nSteps; i++) {
          const ti = i * dt;
          const paw = peep + targetPinsp * (1 - Math.exp(-ti / tau_rise));
          const currentR = airwayResistanceAtVolume(frc + dV, frc, R, obstructionSeverity);
          const flowLs = (paw - (peep + deltaPel(dV, frc, curve))) / currentR;
          raw.push({ t: ti, paw, flow: flowLs, deltaV: dV });
          dV = Math.max(0, dV + flowLs * 1000 * dt);
        }
      }

      // Passive Expiration (both modes)
      const tInspEnd = raw[raw.length - 1].t;
      const pAlvEnd = peep + deltaPel(dV, frc, curve);
      lastPAlvEnd = pAlvEnd;
      const nStepsExp = Math.max(12, Math.round(expTimeSec / SUBSTEP_SEC));
      const dtExp = expTimeSec / nStepsExp;
      const tau_valve = 0.04; // 40ms expiratory valve opening acceleration ramp
      const R_circuit = 1.5;

      for (let i = 1; i <= nStepsExp; i++) {
        const ti = i * dtExp;
        const pEl = deltaPel(dV, frc, curve);
        const pAlv = peep + pEl;
        const currentR = airwayResistanceAtVolume(frc + dV, frc, R, obstructionSeverity);
        
        // Dynamic volume-dependent expiratory airway resistance (airways narrow as lungs empty):
        const volFrac = Math.max(0, Math.min(1, dV / Math.max(1, targetVtMl)));
        const dynamicExpR = currentR * (1 + 0.35 * Math.pow(1 - volFrac, 1.8));

        // Expiratory valve opening acceleration factor (rounds PEF peak at start of exhalation):
        const valveRamp = 1 - Math.exp(-ti / tau_valve);

        // Expiratory flow driven by elastic recoil above PEEP:
        const flowLs = valveRamp * (peep - pAlv) / (dynamicExpR + R_circuit);
        // Expiratory Paw follows alveolar elastic recoil back to PEEP as volume empties:
        const paw_valve_transient = (pAlvEnd - (peep + pEl * (R_circuit / (dynamicExpR + R_circuit)))) * Math.exp(-ti / tau_valve);
        const paw = peep + pEl * (R_circuit / (dynamicExpR + R_circuit)) + paw_valve_transient;
        
        dV = Math.max(0, dV + flowLs * 1000 * dtExp);
        raw.push({ t: tInspEnd + ti, paw: Math.max(peep, paw), flow: flowLs, deltaV: dV });
      }
    }

    startV = dV;
  }

  // pip: exact peak airway pressure over the full high-resolution breath (VCV reaches this
  // at the very last inspiratory sample, since flow is still rising/near-constant right up
  // to the abrupt cutoff into expiration -- PCV reaches it via its pressure-ramp target).
  // pplat: the true zero-flow plateau pressure -- the elastic-recoil-only pressure at
  // end-inspiratory volume, i.e. what a real end-inspiratory-hold maneuver would read.
  // Computed directly here (lastPAlvEnd, captured where the expiratory-phase solve already
  // needed this exact quantity) rather than inferred after the fact from "the trajectory
  // point of maximum volume": in VCV that point is at PEAK flow, not zero flow (flow doesn't
  // decelerate before the ventilator cuts over to expiration), so that heuristic silently
  // collapsed PIP and Pplat to the same value for every VCV breath regardless of resistance.
  // null for spontaneous breathing, where a ventilator-hold-style plateau isn't meaningful.
  const pip = Math.max(...raw.map((s) => s.paw));
  const pplat = mode === 'spontaneous' ? null : lastPAlvEnd;

  return { raw, totalDuration: raw[raw.length - 1].t, pip, pplat };
}

let _cachedRawKey = null;
let _cachedRawBreath = null;

/**
 * Cache for computeRawBreath() itself, sitting beneath both getBreathTrajectory() and
 * getLoopTrajectory()'s own caches -- the numeric integration (the 15-iteration
 * steady-state solve) is the expensive part, and time-strip and loop consumers are often
 * called with identical params within the same animation frame, so this avoids running it
 * twice for one breath.
 */
function getCachedRawBreath(params) {
  const key = JSON.stringify(params);
  if (key === _cachedRawKey && _cachedRawBreath) return _cachedRawBreath;
  _cachedRawKey = key;
  _cachedRawBreath = computeRawBreath(params);
  return _cachedRawBreath;
}

/**
 * Time-strip trajectory: time-uniform resampling of computeRawBreath()'s output, for
 * consumers that scrub through the breath by elapsed time (the ventilator Paw/Flow/Volume
 * strips via paw()/flow()/deltaVolume() below).
 */
export function computeBreathTrajectory(params) {
  const { raw, totalDuration } = getCachedRawBreath(params);
  return downsampleTimeUniform(raw, totalDuration, OUTPUT_POINTS);
}

/**
 * Loop-display trajectory: arc-length resampling of the same computeRawBreath() output,
 * for consumers that trace a closed 2D shape (the flow-volume and pressure-volume loops)
 * rather than scrub by time. See resampleArcLength() for why this differs from
 * computeBreathTrajectory().
 */
export function computeLoopTrajectory(params) {
  const { raw } = getCachedRawBreath(params);
  return resampleArcLength(raw, LOOP_OUTPUT_POINTS);
}

/**
 * Exact PIP/Pplat for this breath, computed directly during integration rather than
 * inferred from a resampled trajectory (see computeRawBreath()'s docstring on why that
 * inference silently breaks for VCV). pplat is null for spontaneous breathing.
 */
export function getBreathPressureSummary(params) {
  const { pip, pplat } = getCachedRawBreath(params);
  return { pip, pplat };
}

let _cachedKey = null;
let _cachedTrajectory = null;

/**
 * Memoized wrapper: ventilator settings/physiology only change a handful of times per
 * session (case load, mode change, comorbidity change, a tick's R/C update), not every
 * animation frame — recompute the integration only when the params actually change. A
 * simple module-level cache (ventilator state is a session-global singleton in this app,
 * not per-component) rather than per-React-component state.
 */
export function getBreathTrajectory(params) {
  const key = JSON.stringify(params);
  if (key === _cachedKey && _cachedTrajectory) return _cachedTrajectory;
  _cachedKey = key;
  _cachedTrajectory = computeBreathTrajectory(params);
  return _cachedTrajectory;
}

let _cachedLoopKey = null;
let _cachedLoopTrajectory = null;

/**
 * Loop-display counterpart to getBreathTrajectory(): same memoization pattern (see above),
 * but backed by computeLoopTrajectory()'s arc-length resampling so F-V/P-V loop consumers
 * get a smooth closed curve instead of the time strips' time-uniform point spacing.
 */
export function getLoopTrajectory(params) {
  const key = JSON.stringify(params);
  if (key === _cachedLoopKey && _cachedLoopTrajectory) return _cachedLoopTrajectory;
  _cachedLoopKey = key;
  _cachedLoopTrajectory = computeLoopTrajectory(params);
  return _cachedLoopTrajectory;
}

function interpolateField(trajectory, tBeat, beatDuration, field) {
  if (!Array.isArray(trajectory) || trajectory.length < 2) return 0;
  const totalT = trajectory[trajectory.length - 1].t;
  const safeBeatDuration = Math.max(0.05, safeNumber(beatDuration, totalT));
  const tQuery = Math.max(0, Math.min(totalT, (safeNumber(tBeat, 0) / safeBeatDuration) * totalT));

  const n = trajectory.length;
  const h = totalT / (n - 1);
  const idx = Math.max(0, Math.min(n - 2, Math.floor(tQuery / h)));
  const frac = h > 0 ? (tQuery - trajectory[idx].t) / h : 0;
  return trajectory[idx][field] + frac * (trajectory[idx + 1][field] - trajectory[idx][field]);
}

/**
 * @returns {number} airway pressure (cmH2O) at this point in the breath cycle
 */
export function paw(trajectory, tBeat, beatDuration) {
  return interpolateField(trajectory, tBeat, beatDuration, 'paw');
}

/**
 * @returns {number} flow (L/s, positive = inspiratory) at this point in the breath cycle
 */
export function flow(trajectory, tBeat, beatDuration) {
  return interpolateField(trajectory, tBeat, beatDuration, 'flow');
}

/**
 * @returns {number} volume above FRC (mL) at this point in the breath cycle
 */
export function deltaVolume(trajectory, tBeat, beatDuration) {
  return interpolateField(trajectory, tBeat, beatDuration, 'deltaV');
}

/**
 * Assembles computeBreathTrajectory()'s params from the live patient/vitals/ventSettings
 * state already computed elsewhere (RespiratoryEngine.ts's currentResistance/
 * currentCompliance/lungVolumes, the ventilator's own mode/Vt/Pinsp/I:E settings) — the
 * single place this mapping happens, so every consumer (ventilator strips, the PV loop)
 * builds the same trajectory from the same inputs.
 */
export function buildMechanicsParams(patient, vitals, ventSettings) {
  const lungVolumes = patient?.lungVolumes;
  const compliance = Math.max(2, safeNumber(vitals?.compl, 60));
  const frc = Math.max(100, safeNumber(lungVolumes?.frc_mL, 2400));
  const complianceCurve = calibrateComplianceCurve(lungVolumes, compliance);

  const R = Math.max(0.5, safeNumber(vitals?.res, 5));
  const peep = Math.max(0, safeNumber(ventSettings?.peep ?? vitals?.peep, 0));

  const rr = safeNumber(vitals?.rr, 12);
  const rawMode = (ventSettings?.mode || 'spontaneous').toLowerCase();

  const isMechanicalControl = rawMode === 'pcv-vg' || rawMode === 'pcv' || rawMode === 'vcv';
  const isApneic = rr < 1 || ((!!patient?.isApneic || !!patient?.isParalyzed) && !isMechanicalControl);

  let mode = 'vcv';
  if (isApneic) {
    mode = 'apneic';
  } else if (rawMode === 'spontaneous') {
    mode = 'spontaneous';
  } else if (rawMode === 'psv') {
    mode = 'pcv';
  } else if (rawMode.startsWith('pcv')) {
    mode = 'pcv';
  } else {
    mode = 'vcv';
  }

  const actualVte = safeNumber(vitals?.vte, 0);
  const targetVtMl = mode === 'spontaneous'
    ? (actualVte > 10 ? actualVte : (patient?.ibw || 70) * 7)
    : Math.max(10, safeNumber(ventSettings?.vt, 500));

  let targetPinsp = 15;
  if (rawMode === 'psv') {
    targetPinsp = Math.max(1, safeNumber(ventSettings?.ps, 10));
  } else if (rawMode === 'pcv-vg') {
    targetPinsp = Math.max(1, targetVtMl / compliance);
  } else {
    targetPinsp = Math.max(1, safeNumber(ventSettings?.pinsp, 15));
  }

  const ieRatio = Math.max(0.1, safeNumber(ventSettings?.ieRatio, 2));
  const totalCycleSec = rr > 0 ? 60 / rr : 4.0;
  const inspTimeSec = totalCycleSec * (1 / (1 + ieRatio));
  const expTimeSec = Math.max(0.1, totalCycleSec - inspTimeSec);

  const fev1FvcRatio = safeNumber(lungVolumes?.fev1FvcRatio, 80);
  const isObstructiveByRatio = fev1FvcRatio < 75 || patient?.copd || patient?.bronchospasm ||
    (typeof patient?.pulmonaryComorbidity === 'string' && patient.pulmonaryComorbidity.toLowerCase().includes('copd'));
  const obstructionSeverity = isObstructiveByRatio ? Math.max(0, Math.min(1, (R / 5 - 1) / 6)) : 0;

  return { mode, R, complianceCurve, frc, peep, targetVtMl, targetPinsp, inspTimeSec, expTimeSec, obstructionSeverity };
}

const PRESSURE_CEILING_CMH2O = 60;
const FLOW_CEILING_LS = 2.0;
const VOLUME_CEILING_ML = 1000;

/**
 * Canvas synthesizers — same call shape as this codebase's other per-type synthesizers
 * (synthesizeCvpWaveform, synthesizeArterialLine): take the live patient/vitals/
 * ventSettings state and the canvas height, return a pixel y directly. All three read the
 * SAME cached per-breath trajectory (one buildMechanicsParams() + getBreathTrajectory()
 * call per type per frame, deduplicated by the module-level memoization cache), so a
 * single resistance/compliance/PEEP/Vt change moves all three consistently.
 */
export function synthesizeVentPressureMechanics(tBeat, beatDuration, h, patient, vitals, ventSettings) {
  const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 100;
  const params = buildMechanicsParams(patient, vitals, ventSettings);
  const trajectory = getBreathTrajectory(params);
  const pawValue = paw(trajectory, tBeat, beatDuration);
  const safePaw = Math.max(0, Math.min(PRESSURE_CEILING_CMH2O, pawValue));
  return safeH * 0.95 - (safePaw / PRESSURE_CEILING_CMH2O) * safeH * 0.85;
}

export function synthesizeVentFlowMechanics(tBeat, beatDuration, h, patient, vitals, ventSettings) {
  const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 100;
  const params = buildMechanicsParams(patient, vitals, ventSettings);
  const trajectory = getBreathTrajectory(params);
  const flowValue = flow(trajectory, tBeat, beatDuration);
  const safeFlow = Math.max(-FLOW_CEILING_LS, Math.min(FLOW_CEILING_LS, flowValue));
  return safeH * 0.5 - (safeFlow / FLOW_CEILING_LS) * safeH * 0.4;
}

export function synthesizeVentVolumeMechanics(tBeat, beatDuration, h, patient, vitals, ventSettings) {
  const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 100;
  const params = buildMechanicsParams(patient, vitals, ventSettings);
  const trajectory = getBreathTrajectory(params);
  const deltaVValue = deltaVolume(trajectory, tBeat, beatDuration);
  const safeDeltaV = Math.max(0, Math.min(VOLUME_CEILING_ML, deltaVValue));
  return safeH * 0.92 - (safeDeltaV / VOLUME_CEILING_ML) * safeH * 0.82;
}
