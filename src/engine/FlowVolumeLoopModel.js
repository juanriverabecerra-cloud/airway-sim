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

const DEFAULT_R = 5;     // cmH2O/L/s, matches VentModel.js/EtCo2Model.js's own baseline
const DEFAULT_C = 60;    // mL/cmH2O, matches VentModel.js/EtCo2Model.js's own baseline
const DEFAULT_TLC_L = 6.0;
const DEFAULT_RV_L = 1.5;
const DEFAULT_FVC_L = 4.5;
const DEFAULT_FRC_L = 2.4;

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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
  const fvcMl = Math.max(300, safeNumber(lv?.fvc_mL, DEFAULT_FVC_L * 1000));
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
  const riseFraction = 0.05;
  let pef = 0;

  // Expiratory limb: TLC -> RV, flow positive. Vdot_max(V) = Pel(V) / Raw(V), the
  // effort-independent maximal-expiratory-flow relationship — a brief initial rise
  // represents the real (sub-100ms) ramp-up of expiratory muscle force before flow
  // limitation takes over, not a flow-limitation-violating effort-dependent phase.
  for (let i = 0; i <= numPoints; i++) {
    const e = i / numPoints;
    const volumeMl = tlcMl - e * fvcMl;
    const pel = elasticRecoilPressure(volumeMl, complianceCurve);
    const raw = airwayResistanceAtVolume(volumeMl, frcMl, R, obstructionSeverity);
    let flow = FLOW_SCALE_FACTOR * (pel / raw);
    if (e < riseFraction) {
      flow *= Math.sin((e / riseFraction) * (Math.PI / 2));
    }
    pef = Math.max(pef, flow);
    points.push({ volume: volumeMl / 1000, flow });
  }
  pef = Math.max(0.5, pef);

  // Inspiratory limb: RV -> TLC, flow negative. Not flow-limited in healthy lungs (no
  // dynamic compression on inspiration), so this remains a volitional-effort-driven
  // smooth profile — but PIF is now derived from R_aw at RV (the start of inspiration)
  // rather than a fixed ratio of PEF. PMUS_MAX_CMH2O is a calibration constant (same role
  // as FLOW_SCALE_FACTOR above, not a literal pleural-pressure citation), chosen so a
  // normal adult's PIF (~6 L/s) comes out realistic given the resistance at RV.
  const rawAtRv = airwayResistanceAtVolume(rvMl, frcMl, R, obstructionSeverity);
  const PMUS_MAX_CMH2O = 48;
  // pifUncapped is the THEORETICAL peak inspiratory flow this effort/resistance would
  // achieve absent any upper-airway collapse — returned as-is in `pif` below so a
  // consumer (or test) can compare the actual, possibly-suppressed traced curve against
  // it. It is deliberately NOT blended with the collapse cap.
  const pifUncapped = Math.max(0.5, PMUS_MAX_CMH2O / rawAtRv);

  // Variable extrathoracic obstruction: reuse RespiratoryEngine.ts's own Starling-
  // resistor upper-airway formula (R = R_base/dilatorTone^2.5 * exp(0.5*(pcrit-pAirway))
  // — the same physics already driving OSA there), evaluated at a forced-inspiratory-
  // effort transmural pressure estimate (large negative swing, not the passive-breathing
  // PEEP-referenced pressure that formula normally uses) — a disclosed, reasoned
  // adaptation of that formula to a different mechanical regime, not a fully implicit
  // self-consistent solve.
  const forcedEffortPairway = -0.35 * pifUncapped * 10; // representative large negative swing, cmH2O
  const collapsibleRaw = Math.max(0.5, (R / Math.pow(Math.max(0.05, dilatorTone), 2.5)) * Math.max(1.0, Math.exp(0.5 * (pcrit - forcedEffortPairway))));
  const pifExtrathoracic = Math.max(0.05, PMUS_MAX_CMH2O / collapsibleRaw);

  const pif = pifUncapped;
  const plateauCap = collapseIndex > 0.4 ? pifExtrathoracic : pifUncapped;
  for (let i = 1; i <= numPoints; i++) {
    const ins = i / numPoints;
    const volume = rvVal + ins * fvc;
    const smoothFlow = pifUncapped * Math.sin(Math.PI * ins);
    const flow = -Math.min(smoothFlow, Math.max(0.05, plateauCap));
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
