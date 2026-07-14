/**
 * Pressure-Volume Loop Synthesizer
 *
 * Models the dynamic compliance and airway resistance of mechanical ventilation:
 * Airway Pressure (Paw, cmH2O) on the X-axis and Lung Volume (L) on the Y-axis.
 *
 * Compliance determines the slope (Volume / Pressure) of the loop: stiff lungs (ARDS)
 * result in a flatter loop. Airway resistance determines the loop width (hysteresis)
 * due to pressure differences between inspiration and expiration.
 *
 * Traced counter-clockwise: PEEP -> (inspiration) -> PIP -> (expiration) -> PEEP.
 */

import { buildMechanicsParams, getBreathTrajectory } from './RespiratoryMechanicsModel.js';

const DEFAULT_R = 5;      // cmH2O/L/s
const DEFAULT_C = 60;     // mL/cmH2O
const DEFAULT_FRC_L = 2.2;

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * @param {object} patient - live patient state
 * @param {object} vitals - live vitals (res, compl, pip, peep, vte, rr)
 * @param {number} numPoints - resolution of the loop
 * @returns {{points: Array<{pressure:number, volume:number}>, pip:number, peep:number, vte:number, dynamicCompliance:number, interpretation:string}}
 */
export function generatePressureVolumeLoop(patient, vitals, numPoints = 80) {
  const lv = patient?.lungVolumes;
  const frc = safeNumber(lv?.frc_L, DEFAULT_FRC_L);
  const vt = safeNumber(vitals?.vte || 500, 500) / 1000; // convert to Liters

  const R = Math.max(0.1, safeNumber(vitals?.res, DEFAULT_R));
  const C = Math.max(1, safeNumber(vitals?.compl, DEFAULT_C));
  const rr = safeNumber(vitals?.rr, 12);
  const peep = safeNumber(vitals?.peep, 5);
  const pip = Math.max(peep + 2, safeNumber(vitals?.pip, 20));

  // If apneic, the loop collapses to a static point at PEEP and FRC
  if (rr === 0 || !Number.isFinite(rr)) {
    return {
      points: Array.from({ length: numPoints * 2 + 1 }, () => ({ pressure: peep, volume: frc })),
      pip, peep, vte: 0, dynamicCompliance: 0,
      pattern: 'apneic',
      title: 'Apneic Flatline',
      alertType: 'critical',
      interpretation: 'No respiratory cycles. Loop collapsed at baseline PEEP.'
    };
  }

  // Calculate hysteresis width based on resistance and tidal volume
  const resistanceRatio = R / DEFAULT_R;
  const resOffset = 0.8 * resistanceRatio * Math.sqrt(vt / 0.5);

  const points = [];

  // 1. Inspiratory Limb: PEEP -> PIP, Volume: FRC -> FRC + Vt
  // Hysteresis pushes inspiratory pressure *higher* (shift to the right)
  for (let i = 0; i <= numPoints; i++) {
    const u = i / numPoints;
    const volume = frc + vt * u;
    
    // Smooth transition curve for pressure
    const baseP = peep + (pip - peep) * u;
    const dyP = resOffset * Math.sin(Math.PI * u);
    const pressure = Math.max(peep, Math.min(pip, baseP + dyP));
    
    points.push({ pressure, volume });
  }

  // 2. Expiratory Limb: PIP -> PEEP, Volume: FRC + Vt -> FRC
  // Hysteresis pulls expiratory pressure *lower* (shift to the left)
  for (let i = 1; i <= numPoints; i++) {
    const u = i / numPoints;
    const volume = frc + vt * (1 - u);
    
    const baseP = peep + (pip - peep) * (1 - u);
    const dyP = -resOffset * Math.sin(Math.PI * u);
    const pressure = Math.max(peep, Math.min(pip, baseP + dyP));
    
    points.push({ pressure, volume });
  }

  let pattern = 'normal';
  let title = 'Normal P-V Loop';
  let alertType = 'info';
  let interpretation = 'Normal slope and hysteresis: dynamic compliance is adequate, airway resistance is low.';

  if (C < 30) {
    pattern = 'low_compliance';
    title = 'Low Compliance (Stiff Lungs)';
    alertType = 'critical';
    interpretation = 'Flattened slope: critically reduced lung compliance (e.g. ARDS, atelectasis, mainstem intubation).';
  } else if (R > 12) {
    pattern = 'high_resistance';
    title = 'Increased Airway Resistance';
    alertType = 'warning';
    interpretation = 'Widened horizontal loop (large hysteresis): high airway resistance (e.g. bronchospasm, tube obstruction).';
  } else if (C < 45) {
    pattern = 'mild_low_compliance';
    title = 'Mild Restrictive Compliance';
    alertType = 'warning';
    interpretation = 'Slightly flattened loop: moderately reduced compliance.';
  }

  return { points, pip, peep, vte: vt * 1000, dynamicCompliance: C, pattern, title, alertType, interpretation };
}

/**
 * Pressure-Volume Loop, derived from the unified single-compartment equation-of-motion
 * solver (`RespiratoryMechanicsModel.js`, built alongside the flow-volume loop and the
 * ventilator pressure/flow time-strips) rather than this file's original independent
 * hysteresis approximation above. The loop is now literally a parametric plot of the same
 * {pressure(t), volume(t)} trajectory the ventilator monitor's own Paw/Flow strips read
 * from — so a resistance or compliance change moves the strips and this loop identically,
 * by construction, rather than via two separately-tuned approximations of one breath.
 *
 * Added as a new function alongside the original `generatePressureVolumeLoop()` (left
 * untouched) rather than rewritten in place, since that function was authored by a
 * different AI process also active in this repo — see CLAUDE.md's standing note on
 * concurrent editing. Callers should prefer this function; the original is kept only for
 * any caller not yet switched over.
 */
export function generatePressureVolumeLoopFromMechanics(patient, vitals, ventSettings) {
  const params = buildMechanicsParams(patient, vitals, ventSettings);
  const trajectory = getBreathTrajectory(params);

  const frcL = params.frc / 1000;
  const points = trajectory.map((s) => ({ pressure: s.paw, volume: frcL + s.deltaV / 1000 }));

  const pip = Math.max(...trajectory.map((s) => s.paw));
  const peep = params.peep;
  const vte = Math.max(...trajectory.map((s) => s.deltaV));

  // pplat = plateau pressure: the airway pressure at peak volume (end of inspiration),
  // where flow has decelerated to zero and only elastic recoil pressure remains.
  // For VCV: pplat < PIP (resistive drop gone); for PCV: pplat ≈ target pressure.
  // Clinical use: Cstat = Vt / (Pplat - PEEP); Presist = PIP - Pplat.
  let iMaxV = 0;
  trajectory.forEach((s, i) => { if (s.deltaV > (trajectory[iMaxV]?.deltaV ?? 0)) iMaxV = i; });
  const pplat = trajectory[iMaxV]?.paw ?? pip;
  const staticCompliance = vte > 0.5 ? vte / Math.max(1, pplat - peep) : params.complianceCurve?.cFrc ?? DEFAULT_C;
  const resistivePressureDrop = Math.max(0, pip - pplat);

  // "Dynamic" compliance (Vt / (PIP-PEEP)) is a real clinical term, but it conflates
  // resistance and elastic stiffness (PIP includes the resistive pressure drop). Check
  // resistance directly (R alone, unconflated) FIRST so a clear high-resistance/near-
  // normal-static-compliance case (bronchospasm) is not mislabeled "low compliance."
  const dynamicCompliance = vte > 0.5 ? vte / Math.max(1, pip - peep) : params.complianceCurve?.cFrc || DEFAULT_C;

  let pattern = 'normal';
  let title = 'Normal P-V Loop';
  let alertType = 'info';
  let interpretation = 'Normal slope and hysteresis: dynamic compliance is adequate, airway resistance is low.';

  if (params.R > 12 && staticCompliance >= 30) {
    pattern = 'high_resistance';
    title = 'Increased Airway Resistance';
    alertType = 'warning';
    interpretation = 'Widened horizontal loop (large hysteresis): high airway resistance (e.g. bronchospasm, tube obstruction) — note dynamic compliance (Vt/(PIP-PEEP)) reads lower than true static compliance here because PIP itself includes the resistive pressure drop.';
  } else if (dynamicCompliance < 30) {
    pattern = 'low_compliance';
    title = 'Low Compliance (Stiff Lungs)';
    alertType = 'critical';
    interpretation = 'Flattened slope, with the curve bending over (the real "beak" upper-inflection-point shape) as the breath pushes further up the nonlinear compliance curve: critically reduced lung compliance (e.g. ARDS, atelectasis, mainstem intubation) or a tidal volume too large for this patient.';
  } else if (dynamicCompliance < 45) {
    pattern = 'mild_low_compliance';
    title = 'Mild Restrictive Compliance';
    alertType = 'warning';
    interpretation = 'Slightly flattened loop: moderately reduced compliance.';
  }

  if (vte < 0.5) {
    return {
      points: trajectory.map((s) => ({ pressure: peep, volume: frcL })),
      pip: peep, peep, pplat: peep, vte: 0, dynamicCompliance: 0, staticCompliance: 0, resistivePressureDrop: 0,
      pattern: 'apneic', title: 'Apneic Flatline', alertType: 'critical',
      interpretation: 'No respiratory cycles. Loop collapsed at baseline PEEP.'
    };
  }

  return { points, pip, peep, pplat, vte, dynamicCompliance, staticCompliance, resistivePressureDrop, pattern, title, alertType, interpretation };
}
