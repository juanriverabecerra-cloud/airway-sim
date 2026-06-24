/**
 * Central Venous Pressure (CVP) Waveform Synthesizer
 *
 * Built on top of `FourChamberCircuitModel.ts`'s coupled RA-RV-PA-LA-LV-Aorta elastance-
 * valve-Windkessel system (Phase 0, Stage E of /Users/jsriverab/.claude/plans/mutable-
 * roaming-newell.md unified what were two separately-integrated right-/left-heart models
 * into one closed loop): the a/c/v/x/y waveform shape and its AFib/AV-dissociation/
 * tricuspid-regurgitation patterns emerge from that genuine ODE integration (rescaled to
 * match the live `vitals.cvp` mean exactly) rather than hand-coded per-pattern wave-
 * height constants. See `docs/engines/physiology.md` §4.1.3/§4.1.5 for the model and its
 * calibration approach.
 *
 * Mirrors the established synthesizer pattern (ArterialLineModel.js, PlethModel.js):
 * the canvas entry point is a pure function of the already-computed per-tick scalars,
 * producing a clinically shaped curve — the difference from the rest of this codebase's
 * synthesizers is that the curve itself now comes from a real coupled-ODE integration
 * (cached per parameter set, not recomputed every frame) rather than a closed-form
 * shape function.
 */

import { getFourChamberCycle, rescaleToTargetMean, interpolateField } from './FourChamberCircuitModel';

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const DEFAULT_CVP_MEAN = 5.0;

function buildChamberParams(patient, vitals) {
  const isAfib = patient?.cardiacRhythm === 'afib' || !!patient?.afib;
  const isAvDissociation = !!patient?.avDissociation;
  const isTR = !!patient?.tricuspidRegurgitation;
  const hr = Math.max(20, safeNumber(vitals?.hr, 75));
  // Left-heart inputs (inotropy/svr/totalBloodVolumeMl) only affect this read's absolute LA/LV/
  // Aorta numbers -- irrelevant here since this file only ever rescales the RA field to
  // the live vitals.cvp mean, never reading the left-heart outputs -- so defaults suffice.
  return {
    hr,
    inotropy: 1.0,
    svr: safeNumber(vitals?.svr, 1200),
    totalBloodVolumeMl: 5000,
    afib: isAfib && !isAvDissociation,
    avDissociated: isAvDissociation,
    tricuspidRegurgitation: isTR ? 0.85 : 0
  };
}

/**
 * Pure classifier: live state -> pattern/title/alertType/interpretation, for any
 * consumer that needs the narrative without the full waveform (e.g. the Attending chat).
 */
export function calculateCvpWaveComponents(patient, vitals) {
  const mean = Math.max(0, safeNumber(vitals?.cvp, DEFAULT_CVP_MEAN));
  const isAfib = patient?.cardiacRhythm === 'afib' || !!patient?.afib;
  const isAvDissociation = !!patient?.avDissociation;
  const isTR = !!patient?.tricuspidRegurgitation;

  let pattern = 'normal';
  let title = 'Normal CVP Waveform';
  let alertType = 'info';
  let interpretation = 'Normal a/c/v waves with clear x and y descents.';

  if (isTR) {
    pattern = 'tricuspid_regurgitation';
    title = 'Tricuspid Regurgitation';
    alertType = 'warning';
    interpretation = 'Tall systolic c-v wave obliterates the x descent ("ventricularized" CVP trace) — regurgitant flow through the incompetent tricuspid valve during ventricular systole. The single mean-CVP number overestimates true RV end-diastolic pressure; the value just before the R wave is a better estimate.';
  } else if (isAvDissociation) {
    pattern = 'av_dissociation';
    title = 'Cannon A Waves (AV Dissociation)';
    alertType = 'warning';
    interpretation = 'Tall "cannon" a waves: atrial contraction occurring against a closed tricuspid valve (isorhythmic AV dissociation, accelerated junctional rhythm, or AV-asynchronous ventricular pacing). Restoring AV synchrony (e.g. AV-sequential pacing) normalizes the waveform and measurably improves arterial blood pressure.';
  } else if (isAfib) {
    pattern = 'atrial_fibrillation';
    title = 'Atrial Fibrillation CVP Pattern';
    alertType = 'info';
    interpretation = 'Loss of the a wave (no organized atrial contraction); the c wave becomes relatively more prominent.';
  }

  return { mean, pattern, title, alertType, interpretation };
}

/**
 * @param {number} tBeat - seconds elapsed in the current cardiac cycle
 * @param {number} beatDuration - seconds per cardiac cycle
 * @param {number} h - canvas pixel height (unused directly here; kept for signature parity)
 * @param {number} time - absolute seconds, used for arrest jitter
 * @param {object} patient - live patient state
 * @param {object} vitals - live vitals (expects cvp, hr)
 */
export function synthesizeCvpWaveform(tBeat, beatDuration, h, time, patient, vitals) {
  const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 100;
  const targetMean = Math.max(0, safeNumber(vitals?.cvp, DEFAULT_CVP_MEAN));

  if (patient?.isArrest) {
    const safeTime = typeof time === 'number' && Number.isFinite(time) ? time : 0;
    const noise = Math.sin(safeTime * 17.0) * 0.5 * 0.3;
    return mapPressureToY(targetMean + noise, safeH);
  }

  const chamberParams = buildChamberParams(patient, vitals);
  const cycle = getFourChamberCycle(chamberParams).trajectory;
  const rescaled = rescaleToTargetMean(cycle, 'pRA', targetMean);
  const pressure = interpolateField(rescaled, tBeat, beatDuration, 'pRA');
  return mapPressureToY(pressure, safeH);
}

const CVP_CEILING_MMHG = 25;
export function mapPressureToY(pressure, h, ceiling) {
  const safeCeiling = typeof ceiling === 'number' && ceiling > 0 ? ceiling : CVP_CEILING_MMHG;
  const safePressure = Math.max(0, Math.min(safeCeiling, pressure));
  const y = h * (1.0 - (safePressure / safeCeiling));
  return Math.max(2, Math.min(h - 2, y));
}
