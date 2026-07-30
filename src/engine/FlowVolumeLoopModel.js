/**
 * Flow-Volume Loop Synthesizer
 *
 * Models the classic pulmonary-function-test display: airflow rate (L/s) plotted
 * against lung volume (L) as a closed loop traced once per breath.
 *
 * The expiratory limb is now derived from the genuine effort-independent maximal-
 * expiratory-flow relationship (Mead/Fry/Whittenberger equal-pressure-point framework):
 *   Vdot_max(V) = P_el(V) / R_aw(V)
 * using the shared nonlinear elastic recoil curve from `LungComplianceModel.js` (Stage 0
 * of this session's physics-redesign work) for P_el(V), and a volume-dependent airway
 * resistance R_aw(V) (airway caliber narrows as lung volume falls, via radial traction
 * loss — a real, named mechanism, more pronounced with obstructive disease). This
 * replaces an earlier hand-picked "concavity exponent" that produced a superficially
 * similar but non-derived scooped shape — the scooping (and its dependence on
 * resistance/compliance) is now a direct, calculable consequence of those two curves,
 * not a separately-tuned cosmetic parameter.
 *
 * The inspiratory limb is not flow-limited the same way in healthy lungs (no dynamic
 * airway compression on inspiration), so it remains a volitional-effort-driven profile
 * (a smooth, time-symmetric inspiratory effort shape is the standard simplified teaching
 * model) — but its peak flow (PIF) is now derived from R_aw evaluated at RV (the start of
 * inspiration) rather than a fixed ratio of PEF, and the variable-extrathoracic-
 * obstruction plateau reuses `RespiratoryEngine.ts`'s own Starling-resistor upper-airway
 * formula (the same physics already driving OSA there) evaluated at a forced-inspiratory-
 * effort transmural pressure, in place of an arbitrary collapse-index fudge factor.
 *
 * Source: general pulmonary/respiratory mechanics (Mead-Fry-Whittenberger flow
 * limitation, radial-traction airway narrowing) — Miller's does not give literal
 * rendering parameters for this display; disclosed per this project's standing
 * convention. See docs/engines/physiology.md.
 */

import { calibrateComplianceCurve, elasticRecoilPressure } from './LungComplianceModel.js';
import { buildMechanicsParams, getLoopTrajectory } from './RespiratoryMechanicsModel.js';

const DEFAULT_R = 5;     // cmH2O/L/s, matches VentModel.js/EtCo2Model.js's own baseline
const DEFAULT_C = 60;    // mL/cmH2O, matches VentModel.js/EtCo2Model.js's own baseline
const DEFAULT_TLC_L = 6.0;
const DEFAULT_RV_L = 1.5;
const DEFAULT_FVC_L = 4.5;
const DEFAULT_FRC_L = 2.4;

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Canonical maximal-expiratory-flow-volume (MEFV) limb SHAPE, normalized to peak flow.
 *
 * This is the effort-independent descending-limb morphology every spirometry/PFT reference
 * shows: a near-vertical rise from zero (at TLC) to peak expiratory flow (PEF) reached very
 * early — after only ~10-15% of the vital capacity has been exhaled — followed by a
 * descent to residual volume (RV). In a NORMAL lung that descent is essentially a straight
 * line (slightly convex); in OBSTRUCTIVE disease (COPD/asthma) it becomes concave/"scooped"
 * ("coved"), sagging well below the straight PEF→RV line, because progressive dynamic
 * airway compression flow-limits harder as lung volume (and hence airway-tethering radial
 * traction) falls.
 *
 * Only the SHAPE lives here; the absolute PEF magnitude is supplied by the caller from the
 * physics-grounded Pel(V)/Raw(V) calculation (which responds correctly to resistance and
 * compliance). This split is deliberate: numerically, feeding the raw Pel(V)/Raw(V) curve
 * straight to the display produced a scooped descent even for a NORMAL lung, making normal
 * and obstructive loops nearly indistinguishable — the exact opposite of the single most
 * important teaching contrast this display exists to show.
 *
 * @param {number} exhaledFrac fraction of vital capacity already exhaled: 0 at TLC, 1 at RV
 * @param {{obstruction?:number, plateau?:number}} opts
 *   obstruction ∈ [0,1] — 0 = straight normal descent, →1 = deeply coved obstructive descent.
 *   plateau ∈ (0,1] — flow ceiling; <1 flat-tops the limb (fixed / variable-intrathoracic UAO).
 * @returns {number} flow as a fraction of PEF (0..1)
 *
 * Source: general pulmonary-function morphology (Mead-Fry-Whittenberger effort-independent
 * flow limitation); Miller's gives no literal rendering parameters — disclosed per this
 * project's standing convention. See docs/engines/physiology.md §4.6.2.
 */
export function expiratoryFlowFraction(exhaledFrac, opts = {}) {
  const x = clamp(safeNumber(exhaledFrac, 0), 0, 1);
  const obstruction = clamp(safeNumber(opts.obstruction, 0), 0, 1);
  const plateau = clamp(safeNumber(opts.plateau, 1), 0.02, 1);
  const X_PEF = 0.12; // PEF occurs ~12% of the VC below TLC

  let f;
  if (x <= X_PEF) {
    // Near-vertical ascending limb: rapid rise from 0 (TLC) to PEF with smooth curve
    f = Math.pow(x / X_PEF, 0.42);
  } else {
    // Descending limb: (1-e)^p. p=1 is near-linear (normal); p>1 bows concave/scooped (obstructive)
    const e = (x - X_PEF) / (1 - X_PEF);
    const p = 1.0 + 3.4 * obstruction;
    f = Math.pow(1 - e, p);
  }
  return Math.min(f, plateau);
}

/**
 * Canonical inspiratory-limb SHAPE, normalized to peak inspiratory flow (PIF).
 *
 * The forced-inspiratory limb is not flow-limited in healthy lungs (inspiration abolishes,
 * rather than causes, dynamic airway compression), so it is a smooth, symmetric convex
 * bowl — a half-sine — deepest near mid-vital-capacity. A `plateau` < 1 flat-tops it, the
 * signature of a variable EXTRAthoracic obstruction (the collapsible upper airway is sucked
 * shut by the negative intraluminal pressure of inspiration) or a fixed upper-airway lesion.
 *
 * @param {number} inhaledFrac fraction of vital capacity inhaled: 0 at RV, 1 at TLC
 * @param {{plateau?:number}} opts plateau ∈ (0,1] — flow ceiling; <1 flattens the limb
 * @returns {number} flow as a fraction of PIF (0..1)
 */
export function inspiratoryFlowFraction(inhaledFrac, opts = {}) {
  const y = clamp(safeNumber(inhaledFrac, 0), 0, 1);
  const plateau = clamp(safeNumber(opts.plateau, 1), 0.02, 1);
  return Math.min(Math.sin(Math.PI * y), plateau);
}

/**
 * Volume-dependent airway resistance (cmH2O/(L/s)): rises as lung volume falls below the
 * resting (FRC) reference, more steeply with obstructive disease (radial traction on
 * small airways is lost progressively as resistance/obstruction severity rises). Falls
 * below the FRC-referenced baseline above FRC (airways are more patent at higher
 * volumes) — both directions of the same `(FRC/V)^k` relationship.
 */
function airwayResistanceAtVolume(volumeMl, frcMl, rFrc, obstructionSeverity) {
  const safeVolume = Math.max(frcMl * 0.05, volumeMl);
  if (safeVolume >= frcMl) {
    // Above FRC: airways are progressively more patent at higher volumes, via a fixed,
    // modest exponent independent of obstruction severity — radial-traction loss is a
    // below-FRC deflation phenomenon, not a reason for obstructive lungs to become
    // *unusually* patent above FRC. The already-elevated rFrc baseline (from
    // RespiratoryEngine.ts's COPD/bronchospasm resistance bonus) carries through here.
    return Math.max(0.5, rFrc * (frcMl / safeVolume));
  }
  // Below FRC: radial traction loss accelerates airway narrowing as volume falls toward
  // RV, markedly more so with obstructive disease (k rises with obstruction severity).
  const k = 1.0 + 3.0 * Math.max(0, Math.min(1, obstructionSeverity));
  return Math.max(0.5, rFrc * Math.pow(frcMl / safeVolume, k));
}

// Pel(V)/Raw(V) is dimensionally a flow, but `elasticRecoilPressure` is deliberately
// calibrated against this engine's TOTAL-SYSTEM compliance convention (see
// LungComplianceModel.js's docstring) rather than literature lung-only recoil figures —
// dividing it directly by an airway-only resistance overstates absolute flow by roughly
// an order of magnitude. FLOW_SCALE_FACTOR is an explicit, disclosed calibration constant
// (the same role as the "8.0" PEF constant in this file's previous version) bridging that
// gap: chosen so a normal adult's Pel(V)/Raw(V) ratio, evaluated near where peak expiratory
// flow actually occurs (10% into a forced exhalation, past the initial effort ramp),
// reproduces a textbook-normal PEF (~8 L/s) — the *shape* of how flow varies with volume,
// resistance, and compliance still comes entirely from the real Pel(V)/Raw(V) physics;
// only the absolute scale is a calibrated constant.
const FLOW_SCALE_FACTOR = 0.165;

/**
 * @param {object} patient - live patient state (flags + lungVolumes from RespiratoryEngine)
 * @param {object} vitals - live vitals (expects res, compl, rr)
 * @param {number} numPoints - resolution of the traced loop (per limb)
 * @returns {{points: Array<{volume:number, flow:number}>, tlc:number, rv:number, fvc:number, pef:number, pif:number, pattern:string, title:string, alertType:string, interpretation:string}}
 */
export function generateFlowVolumeLoop(patient, vitals, numPoints = 80) {
  const lv = patient?.lungVolumes;
  const tlcMl = safeNumber(lv?.tlc_mL, DEFAULT_TLC_L * 1000);
  const rvMl = safeNumber(lv?.rv_mL, DEFAULT_RV_L * 1000);
  const frcMl = safeNumber(lv?.frc_mL, DEFAULT_FRC_L * 1000);
  const fvcMl = tlcMl - rvMl; // Ensure perfect loop closure between TLC and RV
  const fev1FvcRatio = safeNumber(lv?.fev1FvcRatio, 80);

  const tlc = tlcMl / 1000;
  const rvVal = rvMl / 1000;
  const fvc = fvcMl / 1000;

  const R = Math.max(0.1, safeNumber(vitals?.res, DEFAULT_R));
  const C = Math.max(1, safeNumber(vitals?.compl, DEFAULT_C));
  const rr = safeNumber(vitals?.rr, 12);

  const resistanceRatio = R / DEFAULT_R;
  const isObstructiveByRatio = fev1FvcRatio < 75 || patient?.copd || patient?.bronchospasm ||
    (typeof patient?.pulmonaryComorbidity === 'string' && patient.pulmonaryComorbidity.toLowerCase().includes('copd'));
  const obstructionSeverity = isObstructiveByRatio ? Math.max(0, Math.min(1, (resistanceRatio - 1) / 6)) : 0;

  const complianceCurve = calibrateComplianceCurve(lv, C);

  const dilatorTone = Math.max(0.05, Math.min(1.2, safeNumber(patient?.dilatorMuscleTone, 1.0)));
  const pcrit = safeNumber(patient?.pcrit, patient?.osa ? 1.0 : -5.0);
  let collapseIndex = Math.max(0, Math.min(1, (1 - dilatorTone) * 0.7 + Math.max(0, pcrit + 5) / 10));
  if (patient?.laryngospasm) collapseIndex = Math.max(collapseIndex, 0.85);

  if (rr === 0 || !Number.isFinite(rr)) {
    const flatVolume = rvVal + fvc * 0.4;
    return {
      points: Array.from({ length: numPoints * 2 + 1 }, () => ({ volume: flatVolume, flow: 0 })),
      tlc, rv: rvVal, fvc, pef: 0, pif: 0,
      pattern: 'apneic',
      title: 'No Respiratory Effort',
      alertType: 'critical',
      interpretation: 'No respiratory effort — no flow-volume loop to trace.'
    };
  }

  const points = [];

  // PEF MAGNITUDE is physics-grounded: the peak of the effort-independent maximal-
  // expiratory-flow relationship Vdot_max(V) = FLOW_SCALE·Pel(V)/Raw(V) over the vital
  // capacity (this is what makes PEF fall correctly with obstruction/bronchospasm — normal
  // ≈9 L/s, severe COPD <1 L/s). The DESCENT SHAPE, however, comes from the canonical MEFV
  // morphology (expiratoryFlowFraction), not the raw Pel/Raw curve: numerically that curve
  // sags concave even for a normal lung, which would make the normal and obstructive loops
  // look nearly identical — see expiratoryFlowFraction's docstring.
  let pefPhysics = 0;
  for (let i = 0; i <= numPoints; i++) {
    const volumeMl = tlcMl - (i / numPoints) * fvcMl;
    const pel = elasticRecoilPressure(volumeMl, complianceCurve);
    const raw = airwayResistanceAtVolume(volumeMl, frcMl, R, obstructionSeverity);
    pefPhysics = Math.max(pefPhysics, FLOW_SCALE_FACTOR * (pel / raw));
  }
  const pef = Math.max(0.5, pefPhysics);

  // Expiratory limb: TLC -> RV, flow positive (top).
  for (let i = 0; i <= numPoints; i++) {
    const exhaledFrac = i / numPoints; // 0 at TLC, 1 at RV
    const volumeMl = tlcMl - exhaledFrac * fvcMl;
    const flow = pef * expiratoryFlowFraction(exhaledFrac, { obstruction: obstructionSeverity });
    points.push({ volume: volumeMl / 1000, flow });
  }

  // Inspiratory limb: RV -> TLC, flow negative (bottom).
  const rawAtRv = airwayResistanceAtVolume(rvMl, frcMl, R, obstructionSeverity);
  const PMUS_MAX_CMH2O = 48;
  const pifUncapped = Math.max(0.5, PMUS_MAX_CMH2O / rawAtRv);

  const forcedEffortPairway = -0.35 * pifUncapped * 10;
  const collapsibleRaw = Math.max(0.5, (R / Math.pow(Math.max(0.05, dilatorTone), 2.5)) * Math.max(1.0, Math.exp(0.5 * (pcrit - forcedEffortPairway))));
  const pifExtrathoracic = Math.max(0.05, PMUS_MAX_CMH2O / collapsibleRaw);

  const pif = pifUncapped;
  const inspPlateau = collapseIndex > 0.4
    ? clamp(pifExtrathoracic / pifUncapped, 0.12, 1)
    : 1;
  for (let i = 1; i <= numPoints; i++) {
    const inhaledFrac = i / numPoints; // 0 at RV, 1 at TLC
    const volume = rvVal + inhaledFrac * fvc;
    const flow = -pifUncapped * inspiratoryFlowFraction(inhaledFrac, { plateau: inspPlateau });
    points.push({ volume, flow });
  }

  let pattern = 'normal';
  let title = 'Normal Flow-Volume Loop';
  let alertType = 'info';
  let interpretation = 'Normal contour: brisk rise to peak expiratory flow, near-linear descent to RV.';
  if (collapseIndex > 0.4) {
    pattern = 'variable_extrathoracic';
    title = 'Variable Extrathoracic Obstruction';
    alertType = 'critical';
    interpretation = 'Flattened inspiratory limb: variable extrathoracic obstruction pattern (e.g. laryngospasm/upper-airway collapse) — expiration relatively spared.';
  } else if (obstructionSeverity > 0.5) {
    pattern = 'obstructive';
    title = 'Obstructive Pattern';
    alertType = 'critical';
    interpretation = 'Reduced peak flow with a scooped/coved expiratory descent: obstructive pattern (COPD/bronchospasm) — airway resistance rising sharply as lung volume falls toward RV.';
  } else if (obstructionSeverity > 0.1) {
    pattern = 'mild_obstructive';
    title = 'Early Obstructive Pattern';
    alertType = 'warning';
    interpretation = 'Mildly reduced peak flow with early scooping of the expiratory limb.';
  } else if (patient?.restrictive) {
    pattern = 'restrictive';
    title = 'Restrictive Pattern';
    alertType = 'info';
    interpretation = 'Normally-shaped but narrowed loop (reduced TLC and RV): restrictive pattern.';
  }

  return { points, tlc, rv: rvVal, fvc, pef, pif, pattern, title, alertType, interpretation };
}

/**
 * Ventilator tidal flow-volume loop: plots the actual mechanics-derived breath trajectory
 * (flow vs. accumulated tidal volume) identical to what ICU ventilator displays show.
 *
 * DISTINCT from `generateFlowVolumeLoop` (which is a forced-PFT maximal-effort curve):
 * - X-axis spans 0 → Vt only (not TLC → RV)
 * - Inspiratory shape reflects the ventilator mode:
 *   VCV = constant flow (rectangular step); PCV/PCV-VG/PSV = decelerating (exponential)
 * - Expiratory limb is passive recoil against resistance, not a maximal-effort Mead-Fry envelope
 * - Auto-PEEP visible when the loop fails to return to zero volume by end of expiration
 *
 * Sources: Miller's Anesthesia 9e Ch13/14; Tobin, "Principles and Practice of Mechanical
 * Ventilation" 3e; GE Carestation / Dräger Primus ventilator operator manuals.
 */
export function generateVentilatorFlowVolumeLoop(patient, vitals, ventSettings) {
  const params = buildMechanicsParams(patient, vitals, ventSettings);
  const trajectory = getLoopTrajectory(params);

  // Live ventilator flow-volume loop: Expiration on TOP (+flow), Inspiration on BOTTOM (-flow).
  // The numerical mechanics solver produces s.flow < 0 during exhalation, so we negate it
  // (-s.flow) to put the peak expiratory flow limb on TOP.
  const points = trajectory.map(s => ({
    volume: s.deltaV / 1000,  // mL → L above PEEP/FRC
    flow: -s.flow             // + = expiration (top), − = inspiration (bottom)
  }));

  const vte = Math.max(0, ...trajectory.map(s => s.deltaV));          // mL
  const pef = Math.max(0.1, ...points.map(p => p.flow));              // L/s, peak expiratory (positive/top)
  const pif = Math.max(0.1, ...points.map(p => -p.flow));             // L/s, peak inspiratory (negative/bottom)

  // Auto-PEEP: breath ends before exhalation is complete (incomplete loop closure)
  const finalDeltaV = trajectory[trajectory.length - 1]?.deltaV ?? 0;
  const hasAutoPeep = vte > 50 && finalDeltaV > vte * 0.15;

  const R = params.R;
  const staticC = params.complianceCurve?.cFrc ?? 60;      // mL/cmH₂O
  const timeConstant = (R * staticC) / 1000;               // τ = R·C in seconds
  const mode = params.mode;

  if (vte < 0.5) {
    return {
      points: [{ volume: 0, flow: 0 }, { volume: 0, flow: 0 }],
      vte: 0, pif: 0, pef: 0, hasAutoPeep: false, timeConstant: 0,
      pattern: 'apneic', title: 'No Ventilatory Flow', alertType: 'critical',
      interpretation: 'No respiratory flow detected. Check ventilator and airway.', mode
    };
  }

  let pattern, title, alertType, interpretation;
  const modeLabel = {
    vcv: 'VCV: square inspiratory flow',
    pcv: 'PCV: decelerating inspiratory flow',
    'pcv-vg': 'PCV-VG: decelerating flow (volume-guaranteed)',
    psv: 'PSV: effort-triggered decelerating flow',
    spontaneous: 'Spontaneous tidal breathing'
  };

  if (hasAutoPeep) {
    pattern = 'auto_peep';
    title = 'Auto-PEEP / Gas Trapping';
    alertType = 'critical';
    interpretation = `Gas trapping: ${Math.round(finalDeltaV)} mL retained at breath start. Increase expiratory time (↑ I:E or ↓ RR) or treat bronchospasm.`;
  } else if (R > 15) {
    pattern = 'high_resistance_vent';
    title = 'High Resistance';
    alertType = 'warning';
    interpretation = `Scooped expiratory limb: elevated airway resistance (R=${R.toFixed(0)} cmH₂O/L/s). τ=${timeConstant.toFixed(1)}s — watch for gas trapping.`;
  } else if (staticC < 30) {
    pattern = 'low_compliance_vent';
    title = 'Low Compliance';
    alertType = 'critical';
    interpretation = `Narrow loop: stiff lungs (C=${staticC.toFixed(0)} mL/cmH₂O). Maintain Vt 6 mL/kg IBW, target Pplat < 30 cmH₂O.`;
  } else {
    pattern = 'normal_vent';
    title = 'Normal Tidal Loop';
    alertType = 'info';
    interpretation = `${modeLabel[mode] ?? 'Ventilated tidal loop'} — passive exponential expiration. τ=${timeConstant.toFixed(1)}s.`;
  }

  return { points, vte, pif, pef, hasAutoPeep, timeConstant, pattern, title, alertType, interpretation, mode };
}
