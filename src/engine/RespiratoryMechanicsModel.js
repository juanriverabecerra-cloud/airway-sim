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

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function deltaPel(deltaVMl, frcMl, complianceCurve) {
  return elasticRecoilPressure(frcMl + deltaVMl, complianceCurve) - elasticRecoilPressure(frcMl, complianceCurve);
}

function downsample(rawSamples, totalDuration, numPoints) {
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
 * @returns {Array<{t:number, paw:number, flow:number, deltaV:number}>} sampled over one full breath
 */
export function computeBreathTrajectory(params) {
  const mode = params?.mode === 'pcv' ? 'pcv' : 'vcv';
  const R = Math.max(0.5, safeNumber(params?.R, 5));
  const curve = params?.complianceCurve;
  const frc = Math.max(100, safeNumber(params?.frc, 2400));
  const peep = Math.max(0, safeNumber(params?.peep, 0));
  const targetVtMl = Math.max(10, safeNumber(params?.targetVtMl, 500));
  const targetPinsp = Math.max(1, safeNumber(params?.targetPinsp, 15));
  const inspTimeSec = Math.max(0.05, safeNumber(params?.inspTimeSec, 1.5));
  const expTimeSec = Math.max(0.05, safeNumber(params?.expTimeSec, 3.0));

  const raw = [];
  let deltaV = 0;

  if (mode === 'vcv') {
    const Qconst = (targetVtMl / 1000) / inspTimeSec; // L/s
    const nSteps = Math.max(2, Math.round(inspTimeSec / SUBSTEP_SEC));
    const dt = inspTimeSec / nSteps;
    for (let i = 0; i <= nSteps; i++) {
      const ti = i * dt;
      const dV = Qconst * ti * 1000;
      const paw = peep + deltaPel(dV, frc, curve) + R * Qconst;
      raw.push({ t: ti, paw, flow: Qconst, deltaV: dV });
    }
    deltaV = Qconst * inspTimeSec * 1000;
  } else {
    const nSteps = Math.max(10, Math.round(inspTimeSec / SUBSTEP_SEC));
    const dt = inspTimeSec / nSteps;
    let dV = 0;
    for (let i = 0; i <= nSteps; i++) {
      const ti = i * dt;
      const flowLs = Math.max(0, (targetPinsp - deltaPel(dV, frc, curve)) / R);
      raw.push({ t: ti, paw: peep + targetPinsp, flow: flowLs, deltaV: dV });
      dV = Math.max(0, dV + flowLs * 1000 * dt);
    }
    deltaV = dV;
  }

  const tInspEnd = raw[raw.length - 1].t;
  {
    const nSteps = Math.max(10, Math.round(expTimeSec / SUBSTEP_SEC));
    const dt = expTimeSec / nSteps;
    let dV = deltaV;
    for (let i = 1; i <= nSteps; i++) {
      // R still governs how fast volume/flow decay (so resistance changes correctly
      // slow exhalation, e.g. bronchospasm's prolonged expiratory phase/incomplete
      // emptying) -- but the DISPLAYED pressure during passive exhalation is the
      // instantaneous alveolar/elastic-recoil pressure (PEEP + deltaPel), not PEEP
      // alone. An earlier version of this model displayed Paw = PEEP throughout passive
      // exhalation, reasoning that the same R driving the flow exactly cancels the
      // resistive term at the airway opening -- correct as a description of what
      // determines the FLOW, but conflating "the assumption used to derive the flow"
      // with "what should be plotted." It produced a discontinuous jump from Pplat to
      // PEEP at the start of exhalation and collapsed the pressure-volume loop's entire
      // expiratory limb into a single vertical line (caught from a rendered screenshot,
      // not by review of the equations alone). Plotting the elastic/alveolar pressure
      // instead is continuous with Pplat at end-inspiration and decays smoothly toward
      // PEEP as deltaV decays toward 0, matching both real ventilator displays and a
      // non-degenerate PV loop.
      const flowLs = -deltaPel(dV, frc, curve) / R;
      dV = Math.max(0, dV + flowLs * 1000 * dt);
      raw.push({ t: tInspEnd + i * dt, paw: peep + deltaPel(dV, frc, curve), flow: flowLs, deltaV: dV });
    }
  }

  return downsample(raw, raw[raw.length - 1].t, OUTPUT_POINTS);
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
  const mode = (ventSettings?.mode || 'VCV').toLowerCase().startsWith('pcv') ? 'pcv' : 'vcv';
  const targetVtMl = Math.max(10, safeNumber(ventSettings?.vt, 500));
  const targetPinsp = Math.max(1, safeNumber(ventSettings?.pinsp, 15));

  const rr = Math.max(1, safeNumber(vitals?.rr, 12));
  const ieRatio = Math.max(0.1, safeNumber(ventSettings?.ieRatio, 2));
  const totalCycleSec = 60 / rr;
  const inspTimeSec = totalCycleSec * (1 / (1 + ieRatio));
  const expTimeSec = Math.max(0.1, totalCycleSec - inspTimeSec);

  return { mode, R, complianceCurve, frc, peep, targetVtMl, targetPinsp, inspTimeSec, expTimeSec };
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
