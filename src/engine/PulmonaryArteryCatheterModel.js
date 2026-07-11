/**
 * Pulmonary Artery Catheter (PAC) Waveform & Pressure Synthesizer
 *
 * Built on top of `FourChamberCircuitModel.ts` (Phase 0, Stage E of /Users/jsriverab/
 * .claude/plans/mutable-roaming-newell.md): the PA trace AND the wedge trace are now both
 * read from the literal same coupled RA-RV-PA-LA-LV-Aorta ODE integration
 * `CvpWaveformModel.js` reads for CVP -- one simulation run, not separately-tuned
 * approximations of a connected system (Stage E specifically connected the pulmonary
 * circulation: PA's actual computed outflow now feeds LA's inflow, replacing what used
 * to be two independent models each assuming a constant for the other's contribution).
 * See `docs/engines/physiology.md` §4.1.3/§4.1.5.
 *
 * Models the two "parked" PAC positions clinicians actually read continuously once a
 * catheter is floated and confirmed in place: the resting PA trace, and the wedge
 * (PCWP) trace obtained on balloon inflation. The transient RA->RV->PA->wedge
 * insertion-transition sequence itself (Fig 36.38) remains structured reference data
 * only (Bucket C groundwork per this project's standing procedural-content convention).
 *
 * PA systolic/diastolic are now read directly off the chamber model's own pPA trace
 * (rescaled to the live `vitals.mPAP` mean) rather than derived from a separate
 * MAP-style algebraic formula — they are whatever the same ODE that drives the
 * waveform actually produces, by construction consistent with it.
 *
 * Source: Miller's Anesthesia 9th Ed, Chapter 36, TABLE 36.5 (PCWP-vs-LVEDP
 * discrepancies). PA/wedge waveform morphology derives from
 * `FourChamberCircuitModel.ts`'s disclosed general-physiology elastance/valve/Windkessel
 * model — see that file and physiology.md §4.1.3/§4.1.5 for sourcing.
 */

import { getFourChamberCycle, rescaleToTargetMean, interpolateField } from './FourChamberCircuitModel';
import { mapPressureToY } from './CvpWaveformModel.js';

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const DEFAULT_MPAP = 15.0;
const DEFAULT_LVEDP = 8.0;
const PA_CEILING_MMHG = 50;
// Fraction of the cardiac cycle treated as "end-diastole, just before atrial systole" —
// LVEDP/PCWP are conventionally read as an instantaneous end-diastolic value, not a
// cycle mean (unlike CVP/mPAP, which are conventionally means) — see physiology.md
// §4.1.3's calibration note. Matches the chamber model's atrial-bump phase convention
// (centered at tn=0 mod 1), so tn=0.92 sits just before the next contraction begins.
const END_DIASTOLE_PHASE = 0.92;

function buildChamberParams(patient, vitals) {
  const isAfib = patient?.cardiacRhythm === 'afib' || !!patient?.afib;
  const isAvDissociation = !!patient?.avDissociation;
  const isTR = !!patient?.tricuspidRegurgitation;
  const hr = Math.max(20, safeNumber(vitals?.hr, 75));
  // Left-heart absolute numbers (inotropy/svr/totalBloodVolumeMl) don't matter here -- this
  // file only ever rescales pPA/pLA to live vitals.mPAP/vitals.lvedp means.
  return {
    hr,
    inotropy: 1.0,
    svr: safeNumber(vitals?.svr, 1200),
    totalBloodVolumeMl: 5000,
    afib: isAfib && !isAvDissociation,
    avDissociated: isAvDissociation,
    tricuspidRegurgitation: isTR ? 0.85 : 0,
    mitralRegurgitation: patient?.mitralRegurgitation ? 0.85 : 0
  };
}

function rescaleToPhaseValue(trajectory, field, targetValue, phaseFraction) {
  const totalT = trajectory[trajectory.length - 1].t;
  const current = interpolateField(trajectory, phaseFraction * totalT, totalT, field);
  const safeCurrent = Math.max(0.1, current);
  const safeTarget = Math.max(0.1, targetValue);
  const scale = safeTarget / safeCurrent;
  return trajectory.map((p) => ({ ...p, [field]: p[field] * scale }));
}

/**
 * Pure numeric derivation of PA systolic/diastolic/mean and PCWP, all read from the
 * same chamber-model trajectories the waveforms use — no separate algebraic formula.
 */
export function calculatePacPressures(patient, vitals) {
  const targetMpap = Math.max(1, safeNumber(vitals?.mPAP, DEFAULT_MPAP));
  const fcCycle = getFourChamberCycle(buildChamberParams(patient, vitals)).trajectory;
  const rhCycle = rescaleToTargetMean(fcCycle, 'pPA', targetMpap);
  const paValues = rhCycle.map((p) => p.pPA);
  const paSystolic = Math.max(...paValues);
  const paDiastolic = Math.min(...paValues);
  const paMean = paValues.reduce((s, v) => s + v, 0) / paValues.length;

  const targetLvedp = Math.max(1, safeNumber(vitals?.lvedp, DEFAULT_LVEDP));
  const peep = Math.max(0, safeNumber(vitals?.peep, 0));
  const isMR = !!patient?.mitralRegurgitation;

  // Table 36.5: PEEP creates lung zone 1/2 conditions -> mean PAWP overestimates mean
  // LAP/LVEDP; MR's retrograde systolic v wave raises mean atrial pressure, also
  // overestimating LVEDP. Reasoned, disclosed magnitudes (no literal mmHg-per-condition
  // figure given in the source).
  const peepOverestimate = peep > 10 ? Math.min(6, 0.4 * (peep - 10)) : 0;
  const mrOverestimate = isMR ? 5.0 : 0;
  const pcwp = targetLvedp + peepOverestimate + mrOverestimate;

  return {
    paSystolic, paDiastolic, paMean, pcwp, lvedp: targetLvedp,
    peepOverestimate, mrOverestimate
  };
}

/**
 * @param {number} tBeat - seconds elapsed in the current cardiac cycle
 * @param {number} beatDuration - seconds per cardiac cycle
 * @param {number} h - canvas pixel height
 * @param {number} time - absolute seconds (used for the catheter-whip ripple/arrest jitter)
 * @param {object} patient - live patient state (expects mitralRegurgitation, pacWhipArtifact, pacOverwedged, isArrest)
 * @param {object} vitals - live vitals (expects mPAP, lvedp, peep, hr)
 * @param {'pa'|'wedge'} mode - which parked catheter position to render
 */
export function synthesizePacWaveform(tBeat, beatDuration, h, time, patient, vitals, mode = 'pa') {
  const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 100;
  const safeTime = typeof time === 'number' && Number.isFinite(time) ? time : 0;

  // Dynamic respiratory baseline shift
  const rr = safeNumber(vitals?.rr, 12);
  const rrFreq = rr / 60;
  const isVent = patient?.ventilationStatus === 'mechanical' || !!(vitals?.peep && vitals.peep > 4);
  const respPhase = Math.sin(safeTime * Math.PI * 2 * rrFreq);
  const respEffect = isVent ? respPhase : -respPhase;
  const shiftMagnitude = isVent ? 3.5 : 2.0;
  const respShift = rr > 0 ? respEffect * shiftMagnitude : 0;

  if (patient?.isArrest) {
    const pac = calculatePacPressures(patient, vitals);
    const noise = Math.sin(safeTime * 17.0) * 0.5 * 0.3;
    return mapPressureToY((mode === 'wedge' ? pac.pcwp : pac.paMean) + noise + respShift, safeH, PA_CEILING_MMHG);
  }

  if (mode === 'wedge') {
    if (patient?.pacOverwedged) {
      const climbPhase = (safeTime % 4.0) / 4.0;
      const pressure = 15 + climbPhase * 45;
      return mapPressureToY(pressure + respShift, safeH, PA_CEILING_MMHG);
    }
    const targetLvedp = Math.max(1, safeNumber(vitals?.lvedp, DEFAULT_LVEDP));
    const laCycle = getFourChamberCycle(buildChamberParams(patient, vitals)).trajectory;
    const rescaled = rescaleToPhaseValue(laCycle, 'pLA', targetLvedp, END_DIASTOLE_PHASE);
    const pressure = interpolateField(rescaled, tBeat, beatDuration, 'pLA');
    return mapPressureToY(pressure + respShift, safeH, PA_CEILING_MMHG);
  }

  const targetMpap = Math.max(1, safeNumber(vitals?.mPAP, DEFAULT_MPAP));
  const fcCycle = getFourChamberCycle(buildChamberParams(patient, vitals)).trajectory;
  const rhCycle = rescaleToTargetMean(fcCycle, 'pPA', targetMpap);
  let pressure = interpolateField(rhCycle, tBeat, beatDuration, 'pPA');

  if (patient?.pacWhipArtifact) {
    const totalT = rhCycle[rhCycle.length - 1].t;
    const safeBeatDuration = Math.max(0.05, typeof beatDuration === 'number' ? beatDuration : totalT);
    const p = Math.max(0, Math.min(1, (tBeat / safeBeatDuration)));
    const whipWindow = Math.max(0, 1 - Math.abs(p - 0.08) / 0.06);
    if (whipWindow > 0) {
      const pp = Math.max(1, Math.max(...rhCycle.map((s) => s.pPA)) - Math.min(...rhCycle.map((s) => s.pPA)));
      pressure -= whipWindow * pp * 0.9 * Math.abs(Math.sin(safeTime * 90));
    }
  }

  return mapPressureToY(pressure + respShift, safeH, PA_CEILING_MMHG);
}

/**
 * Bucket C groundwork (per this project's procedural-content convention): structured
 * data describing the RA->RV->PA->wedge insertion-transition sequence, for a future
 * procedural-practice engine to consume — not built as an interactive feature this
 * session.
 */
export const PAC_INSERTION_SEQUENCE = [
  {
    chamber: 'Right Atrium',
    approxDepthCm: '15-20',
    waveform: 'Low-amplitude a/c/v morphology, mean 1-5 mmHg.',
    troubleshooting: 'Catheter enters RA shortly after exiting the introducer sheath.'
  },
  {
    chamber: 'Right Ventricle',
    approxDepthCm: '30-40',
    waveform: 'Sharp systolic upstroke to 15-30 mmHg; diastolic pressure falls to near 1-7 mmHg and then RISES through diastole as the chamber passively fills from the RA.',
    troubleshooting: 'If no RV waveform appears by 40 cm, the catheter is likely coiled in the RA — deflate the balloon, withdraw to 20 cm, and repeat the float.'
  },
  {
    chamber: 'Pulmonary Artery',
    approxDepthCm: '40-50',
    waveform: 'Systolic peak similar to RV, but diastolic pressure stays elevated (4-12 mmHg) and FALLS through diastole (continuous downstream runoff) — this diastolic-slope reversal, plus a diastolic step-up at the transition itself, is the key differentiator from RV when numeric values alone are ambiguous.',
    troubleshooting: 'If no PA waveform appears by 50 cm, the catheter is likely coiled in the RV — deflate the balloon, withdraw to 20 cm, and repeat the float.'
  },
  {
    chamber: 'Pulmonary Capillary Wedge',
    approxDepthCm: '45-55',
    waveform: 'Low-amplitude a/c/v morphology again (a damped, delayed reflection of left atrial pressure), mean 4-12 mmHg.',
    troubleshooting: 'Confirm tip position is within 2 cm of the cardiac silhouette on a standard AP chest radiograph; only inflate the balloon with the recommended volume (typically 1.5 mL air) to avoid overwedging or pulmonary artery rupture.'
  }
];

export const PAC_POSITIONING_AIDS = [
  'Head-down position aids catheter flotation across the tricuspid valve.',
  'Right-side tilt plus head-up position aids flotation out of the RV and reduces insertion arrhythmia incidence.',
  'A deep spontaneous inspiration transiently increases venous return/RV output, aiding flotation in low-cardiac-output patients.',
  'Injecting 10-20 mL of ice-cold solution through the distal lumen can stiffen the catheter to aid positioning.',
  'TEE/TTE can be used to directly guide catheter passage when flotation alone is difficult.'
];
