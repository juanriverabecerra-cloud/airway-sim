/**
 * Closed-Loop Circulation Model: RA-RV-PA-LA-LV-Aorta-[Arterial Beds]-[Venous Reservoirs]
 *
 * Phase 0 (Stage E) unified the right heart (RA/RV/PA) and left heart (LA/LV/Aorta) into
 * one coupled ODE, connecting the pulmonary circulation for real. Phase 1, Stage A closes
 * the *systemic* half of the loop the same way: instead of RA's inflow being an external,
 * input-derived constant, the aorta now empties through parallel arterial vascular beds
 * (splanchnic/renal/skeletal-muscle/cerebral/coronary/skin/other, each independently
 * resistance-modifiable) into venous reservoirs (a central pool plus a separate, more
 * compliant splanchnic pool -- the actual mechanism behind "splanchnic pooling", replacing
 * `CardiovascularEngine.ts`'s `splanchnicPoolingOffset` ad hoc volume-offset hack), which
 * drain into the right atrium. Total circulating blood volume (`totalBloodVolumeMl`) is now
 * the single source of truth for preload across the *entire* closed loop, rather than a
 * `preloadRatio` fed independently into the old left-heart-only model.
 *
 * Source: general cardiovascular systems physiology (Suga-Sagawa/Stergiopulos time-
 * varying elastance, 2-element Windkessels, parallel vascular-bed resistance partitioning,
 * venous unstressed-volume/compliance framework) -- not a specific Miller's citation;
 * disclosed per this project's standing convention. Absolute calibration constants
 * (resistances, compliances, unstressed volumes, vascular-bed CO fractions) were found by
 * direct numerical sweep (not solvable in closed form for this coupled nonlinear system,
 * the same finding as every predecessor file in this redesign).
 */

export interface FourChamberInputs {
  hr: number;
  inotropy: number; // CardiovascularEngine.ts's inotropyFinal, ~0.01-2 range
  svr: number; // dyn-s/cm^5-convention SVR already used elsewhere in this codebase
  totalBloodVolumeMl: number; // total circulating volume; ~5000 mL euvolemic
  aorticStenosis?: boolean;
  chf?: boolean;
  ef?: number; // existing CHF ejection-fraction flag (0-100)
  afib?: boolean;
  avDissociated?: boolean;
  tricuspidRegurgitation?: number; // 0-1
  mitralRegurgitation?: number; // 0-1
  prIntervalMs?: number; // dromotropy signal, AV conduction delay (normal ~160ms)
  lusotropyOverride?: number; // 0-1, diastolic relaxation rate
  splanchnicTone?: number; // 0-2, 1.0 = normal; <1 = vasodilated/sympathetically blocked
    // (celiac plexus/thoracic epidural block -- recruits more unstressed splanchnic
    // venous capacity, "pooling" blood there), >1 = vasoconstricted (alpha-agonist).
  alpha1ActivityIndex?: number; // 0+, aggregate alpha-1 receptor activity (sum of
    // ReceptorPharmacologyModel.ts's alpha1Activity across all active exogenous drugs
    // and the endogenous catecholamine pool) -- redistributes the SAME total SVR
    // per-vascular-bed (real receptor-density differences: skin/splanchnic alpha-1-
    // dominant, cerebral/coronary autoregulation-protected) rather than uniformly, with
    // zero effect on the overall MAP/SVR magnitude (already set by `svr` above).
  beta2ActivityIndex?: number; // 0+, aggregate beta-2 activity -- partially offsets the
    // alpha-1 redistribution specifically in the skeletal-muscle bed (real biphasic
    // catecholamine dose-response: beta-2-mediated muscle vasodilation at lower
    // "doses"/activity before alpha-1 vasoconstriction dominates).
}

export interface FourChamberCyclePoint {
  t: number;
  pRA: number;
  pRV: number;
  pPA: number;
  pLA: number;
  pLV: number;
  pAo: number;
  vLV: number;
}

export interface FourChamberAggregates {
  sbp: number;
  dbp: number;
  map: number;
  co: number; // L/min
  sv: number; // mL
  lvedp: number;
  lvEdv: number;
  lvEsv: number;
  lvEf: number; // 0-1
  cvp: number; // mean RA pressure, mmHg -- now a genuine output, not just a display-layer rescale target
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function atrialElastance(tn: number, eMin: number, eMax: number, phaseOffset = 0): number {
  const width = 0.10;
  let tnShifted = tn - phaseOffset;
  tnShifted = tnShifted - Math.floor(tnShifted);
  const d = Math.min(tnShifted, 1 - tnShifted);
  if (d > width) return eMin;
  const x = (d / width) * Math.PI;
  return eMin + (eMax - eMin) * (0.5 * (1 + Math.cos(x)));
}

/**
 * Stergiopulos/Suga-Sagawa double-Hill normalized ventricular activation curve.
 * `lusotropy` (1.0 = normal) scales the relaxation-phase time axis -- a value below 1
 * slows the elastance fall after systole (diastolic dysfunction: CHF, AS-driven
 * concentric hypertrophy), the mechanism behind impaired early diastolic filling.
 */
function ventricularElastance(tn: number, eMin: number, eMax: number, lusotropy = 1.0): number {
  const Tmax = 0.35;
  const tn2 = tn / Tmax;
  const a = (1.55 * Math.pow(tn2, 1.9)) / (1 + Math.pow(tn2, 1.9));
  const relaxTn2 = tn2 * Math.max(0.2, lusotropy);
  const b = 1 / (1 + Math.pow(relaxTn2, 21.9));
  const en = Math.max(0, a * b);
  return eMin + (eMax - eMin) * en;
}

const SUBSTEP_SEC = 0.0005;
const SETTLE_CYCLES = 10;
const OUTPUT_POINTS = 150;
// Recalibrated from 1175 (the original standalone left-heart model's value, where LA
// inflow was a free constant) to 1500 jointly with the systemic venous compartment
// constants below -- now that both the pulmonary (Stage E) AND systemic (Phase 1) sides
// are real closed loops, the previously-free preload inputs are now genuinely bounded by
// what the rest of the circulation can deliver, requiring a full joint recalibration
// (found by direct numerical grid search) to land back near CardiovascularEngine.ts's
// existing resting targets (MAP~87, SBP~106, DBP~67, CO~5.4 L/min, LVEDP~9, mPAP~18).
const SVR_TO_R_SCALE = 1500;

// Approximate fraction of resting cardiac output each major vascular bed receives
// (general physiology estimate, not a specific Miller's citation -- real distributions
// vary considerably by source and shift dramatically with exercise/stress/disease).
// Each bed's resistance is set so the parallel combination, weighted by these fractions,
// reproduces the same total systemic resistance the single-resistor model used --
// individual beds can then be vasoconstricted/dilated independently without changing
// that invariant unless a bed's own tone multiplier is applied.
const VASCULAR_BED_FRACTIONS: Record<string, number> = {
  splanchnic: 0.25,
  renal: 0.20,
  muscle: 0.20,
  cerebral: 0.15,
  coronary: 0.05,
  skin: 0.05,
  other: 0.10
};

// Relative alpha-1 receptor density per bed (general physiology estimate, disclosed,
// not a specific citation): skin and splanchnic beds are classically alpha-1-dominant
// (the real mechanism behind pressors shunting blood away from skin/gut), cerebral and
// coronary beds are comparatively spared (autoregulation-protected, reinforcing the
// per-bed autoregulation already modeled below), renal is intermediate. Pre-normalized
// (weighted by VASCULAR_BED_FRACTIONS) so the CO-weighted average is exactly 1.0 --
// applying these at zero net redistribution strength change leaves the overall SVR/MAP
// this model already produces from the `svr` input completely unchanged; they only
// redistribute *where* a given total resistance change lands.
const ALPHA1_BED_WEIGHT: Record<string, number> = {
  splanchnic: 1.699,
  renal: 0.654,
  muscle: 0.784,
  cerebral: 0.261,
  coronary: 0.392,
  skin: 1.961,
  other: 1.307
};
// Real biphasic catecholamine dose-response: skeletal muscle has significant beta-2
// receptor density, producing vasodilation that partially offsets alpha-1
// vasoconstriction there specifically (epinephrine's classic low-dose vasodilation/
// high-dose vasoconstriction picture in muscle beds) -- not modeled for other beds,
// where alpha-1 dominates with comparatively little beta-2 antagonism.
const MUSCLE_BETA2_OFFSET = 0.6;
// Controls how strongly alpha1ActivityIndex/beta2ActivityIndex redistribute resistance
// across beds relative to the uniform baseline -- found by direct numerical sweep so a
// large pressor dose visibly shunts flow away from skin/splanchnic without distorting
// the overall MAP this model already produces from `svr` (see
// src/testing/four_chamber_circuit_model.test.ts's redistribution test).
const REDISTRIBUTION_STRENGTH = 0.08;

/**
 * Integrates the full closed-loop circulation (RA-RV-PA-LA-LV-Aorta, parallel arterial
 * vascular beds, and central/splanchnic venous reservoirs) to a periodic limit cycle.
 */
export function simulateFourChamberCycle(inputs: FourChamberInputs): {
  trajectory: FourChamberCyclePoint[];
  aggregates: FourChamberAggregates;
} {
  const safeInputs = inputs || ({} as FourChamberInputs);
  const hr = Math.max(20, Math.min(220, safeNumber(safeInputs.hr, 70)));
  const period = 60 / hr;
  const inotropy = Math.max(0.05, safeNumber(safeInputs.inotropy, 1.0));
  const svr = Math.max(50, safeNumber(safeInputs.svr, 1200));
  // Ceiling at 15000 (3x a 5000 mL baseline) -- matches the predecessor left-heart model's
  // preloadRatio clamp; extreme but real iatrogenic fluid overload should be representable,
  // not unbounded.
  const totalBloodVolumeMl = Math.max(500, Math.min(15000, safeNumber(safeInputs.totalBloodVolumeMl, 5000)));
  const isAorticStenosis = !!safeInputs.aorticStenosis;
  const isChf = !!safeInputs.chf;
  const isAfib = !!safeInputs.afib;
  const splanchnicTone = Math.max(0.1, Math.min(2.0, safeNumber(safeInputs.splanchnicTone, 1.0)));

  // --- Right heart (RA/RV/PA) ---
  const eRaMin = 0.05, eRaMax = isAfib ? 0.05 : 0.13;
  const eRvMin = 0.02, eRvMax = 0.6;
  const rTV = 0.05, rPV = 0.08;
  const cPA = 2.0, rPAexit = 0.0875, pPAexitRef = 8;
  const trLeak = Math.max(0, Math.min(1, safeNumber(safeInputs.tricuspidRegurgitation, 0)));
  const rTVLeak = 0.5 - 0.45 * trLeak;
  const atrialPhaseOffset = safeInputs.avDissociated ? 0.32 : 0;

  // --- Left heart (LA/LV/Aorta) ---
  const diastolicStiffness = (isAorticStenosis ? 1.4 : 1.0) * (isChf ? 1.25 : 1.0);
  const hypertrophyBoost = isAorticStenosis ? 1.6 : 1.0;
  const chfContractilityPenalty = isChf ? Math.max(0.3, safeNumber(safeInputs.ef, 55) / 55) : 1.0;
  const lusotropy = safeNumber(
    safeInputs.lusotropyOverride,
    Math.min(1.0, (isChf ? 0.65 : 1.0) * (isAorticStenosis ? 0.85 : 1.0))
  );
  const eLaMin = 0.05;
  const eLaMax = isAfib ? 0.05 : 0.12;
  const eLvMin = 0.06 * diastolicStiffness;
  const eLvMax = 2.2 * inotropy * hypertrophyBoost * chfContractilityPenalty;
  const rMv = 0.02;
  const rAv = isAorticStenosis ? 0.30 : 0.03;
  const cArt = 1.6;
  const mrLeak = Math.max(0, Math.min(1, safeNumber(safeInputs.mitralRegurgitation, 0)));
  const rMvLeak = 0.5 - 0.45 * mrLeak;
  const prMs = Math.max(80, safeNumber(safeInputs.prIntervalMs, 160));
  const dromotropicPhaseOffset = Math.min(0.15, ((prMs - 160) / 160) * 0.10);

  // --- NEW: parallel arterial vascular beds (Aorta's real outflow path, replacing the
  // single rSVR resistor to a fixed reference pressure) ---
  const rSystemicTotal = svr / SVR_TO_R_SCALE;
  const bedResistanceBase: Record<string, number> = {};
  for (const bed of Object.keys(VASCULAR_BED_FRACTIONS)) {
    bedResistanceBase[bed] = rSystemicTotal / VASCULAR_BED_FRACTIONS[bed];
  }
  // Per-bed alpha-1 (+ muscle-specific beta-2) redistribution (Phase 2's receptor-
  // unification piece, mutable-roaming-newell.md): real receptor-density differences
  // mean a given amount of circulating catecholamine activity doesn't vasoconstrict
  // every bed equally -- skin/splanchnic constrict the most (blood shunted away from
  // them), cerebral/coronary are comparatively spared. This redistributes the SAME
  // overall resistance the `svr` input already sets (ALPHA1_BED_WEIGHT is CO-fraction-
  // weighted to average exactly 1.0), rather than adding a new net SVR effect on top.
  const alpha1ActivityIndex = Math.max(0, safeNumber(safeInputs.alpha1ActivityIndex, 0));
  const beta2ActivityIndex = Math.max(0, safeNumber(safeInputs.beta2ActivityIndex, 0));
  if (alpha1ActivityIndex > 0 || beta2ActivityIndex > 0) {
    for (const bed of Object.keys(VASCULAR_BED_FRACTIONS)) {
      let toneMultiplier = 1.0 + REDISTRIBUTION_STRENGTH * alpha1ActivityIndex * (ALPHA1_BED_WEIGHT[bed] - 1.0);
      if (bed === 'muscle') {
        toneMultiplier -= REDISTRIBUTION_STRENGTH * beta2ActivityIndex * MUSCLE_BETA2_OFFSET;
      }
      toneMultiplier = Math.max(0.2, toneMultiplier);
      bedResistanceBase[bed] *= toneMultiplier;
    }
    // Renormalize so the PARALLEL combination's total resistance is restored exactly to
    // what `rSystemicTotal` (from the `svr` input) already specifies. Weighting
    // ALPHA1_BED_WEIGHT to average 1.0 in resistance-space does NOT preserve the
    // parallel-combination total (1/R_total = sum(fraction_i/R_i) is dominated by the
    // lowest-resistance branch, not the arithmetic mean -- confirmed by direct numerical
    // test: an early version of this redistribution caused MAP to *fall* at extreme
    // pressor activity instead of rise, the opposite of real physiology, because a
    // strongly-spared bed's resistance dropping enough creates a low-resistance shunt
    // that the parallel combination disproportionately exploits). Explicit
    // renormalization guarantees the overall SVR/MAP calibration stays exactly correct
    // regardless of how extreme the per-bed redistribution gets.
    // Each bed's resistance was already defined as rSystemicTotal/fraction_i specifically
    // so that 1/R_total = sum(1/R_i) -- the fraction weighting is baked into each R_i's
    // own definition already, not a separate weight to reapply here.
    let parallelConductance = 0;
    for (const bed of Object.keys(VASCULAR_BED_FRACTIONS)) {
      parallelConductance += 1 / bedResistanceBase[bed];
    }
    const resultingParallelResistance = 1 / Math.max(1e-9, parallelConductance);
    // Scaling every resistance by k scales the parallel combination by exactly k too
    // (a basic property of parallel resistor networks) -- so to bring the resulting
    // total back to rSystemicTotal, the scale factor is rSystemicTotal divided by what
    // the redistribution alone produced, not the reverse.
    const renormalizationFactor = rSystemicTotal / resultingParallelResistance;
    for (const bed of Object.keys(VASCULAR_BED_FRACTIONS)) {
      bedResistanceBase[bed] *= renormalizationFactor;
    }
  }
  // Splanchnic pooling (sympathetic block/celiac plexus block, or alpha-agonist
  // vasoconstriction) applied AFTER the alpha-1/beta-2 renormalization above -- this is
  // a deliberate, real net change to overall resistance (not redistribution-neutral),
  // matching the mechanism it replaced in CardiovascularEngine.ts.
  bedResistanceBase.splanchnic /= splanchnicTone; // lower tone -> lower resistance -> more flow

  // --- NEW: venous reservoirs (the systemic side of the closed loop) ---
  // Central pool: most of its volume is "unstressed" -- fills compliant venous capacity
  // without generating pressure, the textbook reason veins are the body's blood reservoir.
  // Only the excess above that drives pressure. Recruits unstressed volume (defends preload)
  // under sympathetic activation, proxied by elevated SVR relative to its own baseline --
  // the same efferent sympathetic outflow that raises arterial tone also venoconstricts.
  const venousToneFactor = Math.max(0.35, 1.0 - 0.5 * (svr / 1200 - 1));
  const cVenCentral = 55;
  const centralUnstressedVol = 2600 * venousToneFactor;
  const rVenousReturn = 0.1;
  // Splanchnic venous pool: its own separate, more compliant reservoir -- the actual
  // mechanism behind "splanchnic pooling" (sympathetic tone sets its unstressed volume;
  // a celiac/epidural block lowers tone, raising unstressed capacity and "soaking up"
  // blood at a given pressure, replacing CardiovascularEngine.ts's prior
  // `splanchnicPoolingOffset` flat-volume-offset approximation of the same phenomenon).
  const cVenSplanchnic = 30;
  const splanchnicUnstressedVol = 550 * Math.max(0.3, 2.0 - splanchnicTone) * 0.7;
  const rSplanchnicDrain = 0.08;

  // --- NEW: per-bed autoregulation (cerebral, renal, coronary -- the three beds Miller's
  // 9th Ed classically emphasizes as strongly autoregulating, Ch11/Ch13/Ch20) ---
  // Within each bed's autoregulatory plateau, resistance scales proportionally with
  // aortic pressure so flow stays near its baseline fraction-of-CO value regardless of
  // swings in driving pressure -- the textbook definition of autoregulation. Outside the
  // plateau, resistance clamps at its boundary value, so flow becomes pressure-passive
  // again (the clinically important "autoregulation breakdown" zone, e.g. cerebral
  // ischemia at MAP far below the lower limit). This is a deliberately generic,
  // disclosed simplification operating on the bed-resistance partition only --
  // `CerebralEngine.ts`/`RenalEngine.ts` remain the authoritative source for the
  // detailed clinical physiology (CBF/CMRO2/ICP, cortex/medulla RBF/GFR) that reads the
  // resulting `vitals.map`/`vitals.cmap` output, unaffected by how that aggregate number
  // was internally assembled.
  const referencePressure = 87; // this model's own resting MAP baseline (see header)
  const AUTOREGULATION_RANGES: Record<string, [number, number]> = {
    cerebral: [50, 150],
    renal: [80, 180],
    coronary: [60, 140]
  };
  function autoregulatedResistance(bed: string, baseR: number, currentPAo: number): number {
    const range = AUTOREGULATION_RANGES[bed];
    if (!range) return baseR;
    const [lo, hi] = range;
    const clampedPAo = Math.max(lo, Math.min(hi, currentPAo));
    return baseR * (clampedPAo / referencePressure);
  }

  let vRA = 50, vRV = 50, pPA = pPAexitRef;
  let vLA = 60, vLV = 120, pAo = 90;
  const nominalChamberAndArterialVol = 280; // RA+RV+LA+LV initial volumes, mL
  const venousShare = Math.max(200, totalBloodVolumeMl - nominalChamberAndArterialVol);
  let vVenSplanchnic = 550 * Math.max(0.3, 2.0 - splanchnicTone);
  let vVenCentral = Math.max(0, venousShare - vVenSplanchnic);

  const nSteps = Math.round(period / SUBSTEP_SEC);
  let raw: FourChamberCyclePoint[] = [];

  for (let cycle = 0; cycle < SETTLE_CYCLES; cycle++) {
    raw = [];
    for (let i = 0; i < nSteps; i++) {
      const t = i * SUBSTEP_SEC;
      const tn = t / period;

      const eRA = atrialElastance(tn, eRaMin, eRaMax, atrialPhaseOffset);
      const eRV = ventricularElastance(tn, eRvMin, eRvMax);
      const eLA = atrialElastance(tn, eLaMin, eLaMax, dromotropicPhaseOffset);
      const eLV = ventricularElastance(tn, eLvMin, eLvMax, lusotropy);

      const pRA = eRA * vRA;
      const pRV = eRV * vRV;
      const pLA = eLA * vLA;
      const pLV = eLV * (vLV - 15); // V0, unstressed LV volume, mL

      const qTVforward = Math.max(0, pRA - pRV) / rTV;
      const qTVleak = trLeak > 0 ? Math.max(0, pRV - pRA) / rTVLeak : 0;
      const qTV = qTVforward - qTVleak;
      const qPV = Math.max(0, pRV - pPA) / rPV;
      // Pulmonary vascular resistance outflow from PA -- this is LA's actual inflow (the
      // pulmonary circulation connection Stage E made real).
      const qPAout = Math.max(0, (pPA - pPAexitRef) / rPAexit);

      const qMVforward = Math.max(0, pLA - pLV) / rMv;
      const qMVleak = mrLeak > 0 ? Math.max(0, pLV - pLA) / rMvLeak : 0;
      const qMV = qMVforward - qMVleak;
      const qAV = Math.max(0, pLV - pAo) / rAv;

      const pVenCentral = Math.max(0, (vVenCentral - centralUnstressedVol) / cVenCentral);
      const pVenSplanchnic = Math.max(0, (vVenSplanchnic - splanchnicUnstressedVol) / cVenSplanchnic);

      const qSplanchnicBed = Math.max(0, pAo - pVenSplanchnic) / bedResistanceBase.splanchnic;
      let qOtherBedsTotal = 0;
      for (const bed of Object.keys(VASCULAR_BED_FRACTIONS)) {
        if (bed === 'splanchnic') continue;
        const effectiveR = autoregulatedResistance(bed, bedResistanceBase[bed], pAo);
        qOtherBedsTotal += Math.max(0, pAo - pVenCentral) / effectiveR;
      }
      const qSplanchnicDrain = Math.max(0, pVenSplanchnic - pVenCentral) / rSplanchnicDrain;
      // RA's inflow is now the venous reservoir's actual outflow -- the systemic
      // circulation closing for real, the counterpart to Stage E's pulmonary connection.
      const qVenousReturn = Math.max(0, pVenCentral - pRA) / rVenousReturn;

      vRA = Math.max(1, vRA + (qVenousReturn - qTV) * SUBSTEP_SEC);
      vRV = Math.max(1, vRV + (qTV - qPV) * SUBSTEP_SEC);
      pPA = Math.max(0, pPA + ((qPV - qPAout) / cPA) * SUBSTEP_SEC);
      vLA = Math.max(5, vLA + (qPAout - qMV) * SUBSTEP_SEC);
      vLV = Math.max(10, vLV + (qMV - qAV) * SUBSTEP_SEC);
      pAo = Math.max(10, pAo + ((qAV - qSplanchnicBed - qOtherBedsTotal) / cArt) * SUBSTEP_SEC);
      vVenSplanchnic = Math.max(0, vVenSplanchnic + (qSplanchnicBed - qSplanchnicDrain) * SUBSTEP_SEC);
      vVenCentral = Math.max(0, vVenCentral + (qOtherBedsTotal + qSplanchnicDrain - qVenousReturn) * SUBSTEP_SEC);

      raw.push({ t, pRA, pRV, pPA, pLA, pLV, pAo, vLV });
    }
  }

  // Passive tricuspid-valve-bulge mechanical events (c wave, v wave, y descent) -- not
  // elastance phenomena, carried over unchanged from CardiacChamberModel.js (see that
  // file's git history / docs/engines/physiology.md §4.1.3 for the original derivation
  // and the screenshot-driven v-wave fix).
  const aWaveHeight = Math.max(...raw.map((p) => p.pRA)) - Math.min(...raw.map((p) => p.pRA));
  for (const p of raw) {
    const tn = p.t / period;
    const cWaveWindow = Math.max(0, 1 - Math.abs(tn - 0.05) / 0.04);
    const vWaveWindow = Math.max(0, 1 - Math.abs(tn - 0.28) / 0.07);
    const yDescentWindow = Math.max(0, 1 - Math.abs(tn - 0.36) / 0.05);
    p.pRA += aWaveHeight * 0.12 * cWaveWindow * (1 - trLeak);
    p.pRA += aWaveHeight * 0.60 * vWaveWindow;
    p.pRA -= aWaveHeight * 0.10 * yDescentWindow * (1 - trLeak);
    p.pRA = Math.max(0.1, p.pRA);
  }

  const trajectory = downsample(raw, period, OUTPUT_POINTS);

  const sbp = Math.max(...raw.map((r) => r.pAo));
  const dbp = Math.min(...raw.map((r) => r.pAo));
  const map = raw.reduce((s, r) => s + r.pAo, 0) / raw.length;
  const lvEdv = Math.max(...raw.map((r) => r.vLV));
  const lvEsv = Math.min(...raw.map((r) => r.vLV));
  const sv = lvEdv - lvEsv;
  const co = (sv * hr) / 1000; // L/min
  const lvEf = lvEdv > 0 ? sv / lvEdv : 0;
  const lvedp = raw[raw.length - 1].pLV;
  const cvp = raw.reduce((s, r) => s + r.pRA, 0) / raw.length;

  return { trajectory, aggregates: { sbp, dbp, map, co, sv, lvedp, lvEdv, lvEsv, lvEf, cvp } };
}

function downsample(rawSamples: FourChamberCyclePoint[], totalDuration: number, numPoints: number): FourChamberCyclePoint[] {
  const out = new Array(numPoints);
  let rawIdx = 0;
  for (let i = 0; i < numPoints; i++) {
    const targetT = (i / (numPoints - 1)) * totalDuration;
    while (rawIdx < rawSamples.length - 2 && rawSamples[rawIdx + 1].t < targetT) rawIdx++;
    const a = rawSamples[rawIdx];
    const b = rawSamples[Math.min(rawSamples.length - 1, rawIdx + 1)];
    const span = b.t - a.t;
    const frac = span > 0 ? Math.max(0, Math.min(1, (targetT - a.t) / span)) : 0;
    const out_i: any = { t: targetT };
    for (const key of Object.keys(a)) {
      if (key === 't') continue;
      out_i[key] = (a as any)[key] + frac * ((b as any)[key] - (a as any)[key]);
    }
    out[i] = out_i;
  }
  return out;
}

let _cachedKey: string | null = null;
let _cachedResult: { trajectory: FourChamberCyclePoint[]; aggregates: FourChamberAggregates } | null = null;

/**
 * Memoized wrapper -- the fast waveform layer (CvpWaveformModel.js,
 * PulmonaryArteryCatheterModel.js) calls this every animation frame; the slow tick
 * engine (CardiovascularEngine.ts) calls it (twice) once per second. Same module-level
 * memoization pattern as every other cached cycle in this codebase
 * (RespiratoryMechanicsModel.js, the predecessor CardiacChamberModel.js).
 */
export function getFourChamberCycle(inputs: FourChamberInputs) {
  const key = JSON.stringify(inputs);
  if (key === _cachedKey && _cachedResult) return _cachedResult;
  _cachedKey = key;
  _cachedResult = simulateFourChamberCycle(inputs);
  return _cachedResult;
}

/**
 * Rescales a trajectory's named pressure field multiplicatively so its cycle mean
 * exactly equals targetMean, preserving the ODE-derived relative shape exactly.
 */
export function rescaleToTargetMean<T extends Record<string, number>>(trajectory: T[], field: keyof T, targetMean: number): T[] {
  const mean = trajectory.reduce((s, p) => s + (p[field] as number), 0) / trajectory.length;
  const safeMean = Math.max(0.1, mean);
  const safeTarget = Math.max(0.1, targetMean);
  const scale = safeTarget / safeMean;
  return trajectory.map((p) => ({ ...p, [field]: (p[field] as number) * scale }));
}

export function interpolateField<T extends Record<string, number>>(trajectory: T[], tBeat: number, beatDuration: number, field: keyof T): number {
  if (!Array.isArray(trajectory) || trajectory.length < 2) return 0;
  const totalT = trajectory[trajectory.length - 1].t as number;
  const safeBeatDuration = Math.max(0.05, safeNumber(beatDuration, totalT));
  const tQuery = Math.max(0, Math.min(totalT, (safeNumber(tBeat, 0) / safeBeatDuration) * totalT));

  const n = trajectory.length;
  const h = totalT / (n - 1);
  const idx = Math.max(0, Math.min(n - 2, Math.floor(tQuery / h)));
  const frac = h > 0 ? (tQuery - (trajectory[idx].t as number)) / h : 0;
  return (trajectory[idx][field] as number) + frac * ((trajectory[idx + 1][field] as number) - (trajectory[idx][field] as number));
}
