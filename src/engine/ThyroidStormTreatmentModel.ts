/**
 * Thyroid Storm Treatment Model
 *
 * ThyroidEngine.ts already models hyperthyroidism and thyroid storm (temperature surge,
 * cardiovascular effects). This companion model adds the specific multi-drug treatment
 * cascade that distinguishes thyroid storm management — each drug targets a different
 * step in thyroid hormone synthesis, release, and peripheral action.
 *
 * === THYROID STORM TREATMENT HIERARCHY ===
 *
 * STEP 1 — Propylthiouracil (PTU) or Methimazole:
 *   Mechanism: blocks thyroid peroxidase → PREVENTS new thyroid hormone SYNTHESIS.
 *   PTU also blocks peripheral conversion of T4→T3 (the active form).
 *   PTU preferred in storm (dual action) and pregnancy 1st trimester.
 *   Methimazole preferred for maintenance (once-daily dosing, less hepatotoxicity).
 *   ONSET: 1-2 hours PO; no IV formulation available.
 *   NOTE: Cannot cross-link, so EXISTING circulating T3/T4 not removed — need other drugs.
 *
 * STEP 2 — Lugol's Iodide (potassium iodide / SSKI):
 *   Mechanism: Wolff-Chaikoff effect → large iodide load inhibits thyroid hormone RELEASE.
 *   CRITICAL TIMING: Must be given ≥ 1 hour AFTER PTU/methimazole.
 *   If given before, iodide provides substrate for MORE thyroid hormone synthesis!
 *   Dose: Lugol's 5-10 drops PO q6-8h, or SSKI (potassium iodide) 5 drops q6h.
 *   Effect: rapidly reduces T3/T4 release within hours.
 *
 * STEP 3 — Beta-Blocker (Propranolol preferred):
 *   Mechanism: blocks peripheral sympathetic effects of thyroid hormone.
 *   Also propranolol BLOCKS T4→T3 conversion (partial T3 reduction).
 *   Target: HR < 90 bpm (significantly elevated in storm: 140-200 bpm).
 *   IV propranolol 0.5-1 mg q5-10 min until HR controlled.
 *   Esmolol infusion as alternative (titratable).
 *
 * STEP 4 — Glucocorticoids (Hydrocortisone or Dexamethasone):
 *   Mechanism: (1) BLOCKS T4→T3 conversion; (2) Relative adrenal insufficiency often
 *   accompanies thyroid storm (cortisol needs may exceed production); (3) Anti-inflammatory.
 *   Hydrocortisone 100 mg IV q8h (or dexamethasone 2 mg IV q6h).
 *
 * STEP 5 — Cholestyramine (or activated charcoal):
 *   Mechanism: binds thyroid hormones in gut, prevents enterohepatic recirculation → increases T3/T4 excretion.
 *   Reserved for severe/refractory cases.
 *
 * STEP 6 — Therapeutic plasma exchange (TPE) or iodinated contrast:
 *   Reserved for refractory storm when above measures fail.
 *
 * === THE BURCH-WARTOFSKY SCORE ===
 * Diagnostic scoring system for thyroid storm severity (0-140 points):
 * - Temperature: 99-99.9°F = 5, 100-100.9°F = 10, ≥ 104°F = 30
 * - CNS effects: agitation = 10, delirium = 20, seizures/coma = 30
 * - GI/hepatic: diarrhea/nausea = 10, jaundice = 20
 * - CV: HR 99-109 = 5, 110-119 = 10, ≥ 140 = 25; AF = 10; heart failure = 25
 * Score > 45 = thyroid storm (sensitivity ~80%, specificity varies)
 *
 * Sources: Burch HB, Wartofsky L, Endocrinol Metab Clin N Am 1993;
 * Ross DS, Thyroid 2016; Miller's 9th Ed Ch 30 (Thyroid and Parathyroid).
 */

export interface ThyroidStormTreatmentInputs {
  thyroidStormActive?: boolean;
  currentHR?: number;
  currentTemp?: number;           // °C
  hasAF?: boolean;
  hasDeliriumOrSeizures?: boolean;

  // Treatment drugs
  ptuCe?: number;                 // propylthiouracil (preferred over methimazole in storm)
  methimazoleCe?: number;
  lugolsIodideCe?: number;        // given ≥ 1h AFTER PTU (CRITICAL timing!)
  ptuGivenBeforeIodide?: boolean; // ensures correct sequencing
  betaBlockerCe?: number;         // propranolol preferred in storm (also blocks T4→T3)
  hydrocortisoneCe?: number;
  dexamethasone_thyroidCe?: number;
  cholestyramineCe?: number;

  // Event guards
  prevStormLogged?: boolean;
  prevIodideTimingLogged?: boolean;
}

export interface ThyroidStormTreatmentOutput {
  burchWartofsky: number;         // 0-140 score
  isThyroidStorm: boolean;        // score > 45
  treatmentEfficacy: number;      // 0-1 combined treatment effect on T3/T4
  t3T4ReductionFraction: number;  // fractional reduction in effective thyroid hormone level
  hrTreatmentEffect: number;      // bpm reduction in HR
  tempTreatmentEffect: number;    // °C reduction
  iodideSafeToGive: boolean;      // PTU must be given first
  prevStormLogged: boolean;
  prevIodideTimingLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ThyroidStormTreatmentModel {
  static tick(inputs: ThyroidStormTreatmentInputs = {}): ThyroidStormTreatmentOutput {
    const events: string[] = [];
    let prevStormLogged = !!inputs.prevStormLogged;
    let prevIodideTimingLogged = !!inputs.prevIodideTimingLogged;

    const thyroidStormActive = !!inputs.thyroidStormActive;
    const currentHR = clamp(safeNumber(inputs.currentHR, 100), 40, 300);
    const currentTemp = clamp(safeNumber(inputs.currentTemp, 37), 34, 44);
    const hasAF = !!inputs.hasAF;
    const hasDeliriumSeizures = !!inputs.hasDeliriumOrSeizures;

    const ptuCe = clamp(safeNumber(inputs.ptuCe, 0), 0, 10);
    const methimazoleCe = clamp(safeNumber(inputs.methimazoleCe, 0), 0, 10);
    const lugolsCe = clamp(safeNumber(inputs.lugolsIodideCe, 0), 0, 10);
    const ptuGivenFirst = !!inputs.ptuGivenBeforeIodide;
    const betaBlockerCe = clamp(safeNumber(inputs.betaBlockerCe, 0), 0, 10);
    const hydroCe = clamp(safeNumber(inputs.hydrocortisoneCe, 0), 0, 10);
    const dexamCe = clamp(safeNumber(inputs.dexamethasone_thyroidCe, 0), 0, 10);
    const cholesCe = clamp(safeNumber(inputs.cholestyramineCe, 0), 0, 5);

    // ===========================
    // BURCH-WARTOFSKY SCORE
    // ===========================
    let bw = 0;
    // Temperature
    const tempF = currentTemp * 9 / 5 + 32;
    if (tempF >= 104) bw += 30;
    else if (tempF >= 103) bw += 25;
    else if (tempF >= 102) bw += 20;
    else if (tempF >= 101) bw += 15;
    else if (tempF >= 100) bw += 10;
    else if (tempF >= 99) bw += 5;

    // Heart rate
    if (currentHR >= 140) bw += 25;
    else if (currentHR >= 130) bw += 20;
    else if (currentHR >= 120) bw += 15;
    else if (currentHR >= 110) bw += 10;
    else if (currentHR >= 100) bw += 5;

    // AF
    if (hasAF) bw += 10;

    // CNS
    if (hasDeliriumSeizures) bw += 25;

    const burchWartofsky = clamp(bw, 0, 140);
    const isThyroidStorm = burchWartofsky > 45;

    if ((isThyroidStorm || thyroidStormActive) && !prevStormLogged) {
      events.push(
        `🚨 THYROID STORM (Burch-Wartofsky Score: ${burchWartofsky}): Temperature ${currentTemp.toFixed(1)}°C, HR ${currentHR} bpm${hasAF ? ', AF' : ''}${hasDeliriumSeizures ? ', delirium/seizures' : ''}. TREATMENT CASCADE (in order): (1) PROPYLTHIOURACIL (PTU) 500-1000 mg PO/NG STAT then 250 mg q4h → blocks new thyroid hormone SYNTHESIS AND T4→T3 conversion; (2) Wait ≥ 1 HOUR after PTU, then LUGOL'S IODIDE 5-10 drops q6-8h → blocks thyroid hormone RELEASE (Wolff-Chaikoff effect); (3) BETA-BLOCKER — Propranolol 0.5-1 mg IV q5-10 min until HR < 90 (also blocks T4→T3); (4) HYDROCORTISONE 100 mg IV q8h (blocks T4→T3, treats relative adrenal insufficiency); (5) ICU monitoring: temperature management (cooling blanket), IV fluids, electrolyte replacement, treat precipitating cause.`,
      );
      prevStormLogged = true;
    }

    // Iodide timing safety check
    const iodideSafeToGive = ptuCe > 0 || methimazoleCe > 0; // antithyroid drug must have been given first
    if (lugolsCe > 0 && !ptuGivenFirst && !iodideSafeToGive && !prevIodideTimingLogged) {
      events.push(
        `⚠️ IODIDE TIMING ERROR: Lugol's iodide administered WITHOUT prior antithyroid drug (PTU or methimazole). DANGER: Iodide provides SUBSTRATE for thyroid hormone synthesis → can WORSEN thyroid storm if gland not first blocked by PTU/methimazole. ORDER MUST BE: (1) PTU or methimazole FIRST; (2) Wait ≥ 60 min; (3) THEN Lugol's/SSKI. Stop iodide if PTU not yet given.`,
      );
      prevIodideTimingLogged = true;
    }

    // ===========================
    // TREATMENT EFFICACY
    // ===========================
    // Each drug addresses a different step
    const antithyroidEff = Math.max(ptuCe, methimazoleCe) > 0
      ? clamp(Math.max(ptuCe, methimazoleCe) / (Math.max(ptuCe, methimazoleCe) + 1.0) * 0.40, 0, 0.40) : 0;

    const iodideEff = lugolsCe > 0 && iodideSafeToGive
      ? clamp(lugolsCe / (lugolsCe + 1.0) * 0.35, 0, 0.35) : 0;

    const betaBlockerEff = betaBlockerCe > 0
      ? clamp(betaBlockerCe / (betaBlockerCe + 0.5) * 0.30, 0, 0.30) : 0;

    // Propranolol extra T4→T3 block (0.1 fraction above beta-blocker HR effect)
    const propranololT3Block = betaBlockerCe > 0 ? 0.10 : 0;

    const steroidEff = Math.max(hydroCe, dexamCe) > 0
      ? clamp(Math.max(hydroCe, dexamCe) / (Math.max(hydroCe, dexamCe) + 0.5) * 0.20, 0, 0.20) : 0;

    const choleEff = cholesCe > 0 ? clamp(cholesCe / 5 * 0.15, 0, 0.15) : 0;

    const treatmentEfficacy = clamp(antithyroidEff + iodideEff + betaBlockerEff + propranololT3Block + steroidEff + choleEff, 0, 0.90);
    const t3T4ReductionFraction = treatmentEfficacy;

    // Treatment effects on vital signs
    const hrTreatmentEffect = betaBlockerCe > 0
      ? -clamp(betaBlockerCe / (betaBlockerCe + 0.5) * 50, 0, 60) : 0;

    const tempTreatmentEffect = treatmentEfficacy > 0.4
      ? -clamp((treatmentEfficacy - 0.4) * 3, 0, 2.5) : 0; // gradual temp normalization

    if (!thyroidStormActive) prevStormLogged = false;

    return {
      burchWartofsky,
      isThyroidStorm,
      treatmentEfficacy: parseFloat(treatmentEfficacy.toFixed(4)),
      t3T4ReductionFraction: parseFloat(t3T4ReductionFraction.toFixed(4)),
      hrTreatmentEffect: parseFloat(hrTreatmentEffect.toFixed(1)),
      tempTreatmentEffect: parseFloat(tempTreatmentEffect.toFixed(3)),
      iodideSafeToGive,
      prevStormLogged,
      prevIodideTimingLogged,
      events,
    };
  }
}
