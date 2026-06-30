/**
 * Acid-Base Model: Stewart Strong-Ion-Difference (SID) Physics
 *
 * Phase 5, Stage 1 of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Prior model:
 * `hco3 = max(8, 24 - actualBaseDeficit)` where `actualBaseDeficit` was a flat sum of
 * isSeptic + bloodLossRatio + lactate -- a phenomenological approximation with no mechanistic
 * connection to the electrolytes FluidicsEngine already tracked. Meanwhile `FluidicsEngine.ts`
 * correctly computed per-tick Na+/Cl-/Ca²⁺ dilution from actual fluid compositions (Na=154,
 * Cl=154 for NS; Na=130, Cl=109 for LR; buffer=28 mEq/L for LR, 27 for PlasmaLyte) but these
 * values went into `electrolytes.cl`/`na`/`buf` and were NEVER connected to the acid-base
 * computation -- making the NS vs. LR vs. PlasmaLyte distinction physiologically invisible
 * despite being the most common clinical teaching point in perioperative fluid management.
 *
 * The Stewart SID approach derives pH from first principles:
 *
 *   SID (Strong Ion Difference) = [Na⁺] + [K⁺] - [Cl⁻] - [Lactate]  (simplified, dominant terms)
 *
 * At physiologic steady state, SID ≈ 36 mEq/L (normal Na 140, K 4, Cl 103, Lactate 1 = 40).
 * Deviations from this normal SID are the mechanistic source of "metabolic" acid-base disorders:
 * - NS infusion raises [Cl] disproportionately (Cl=154 vs Na=154; normal plasma has Na>>Cl) →
 *   reduces SID → hyperchloremic metabolic acidosis -- the real mechanism behind why NS causes
 *   a non-anion-gap metabolic acidosis that LR and PlasmaLyte do not.
 * - LR/PlasmaLyte infusion: lower Cl content (109/98 mEq/L) AND added buffer (lactate/acetate
 *   → metabolized to HCO3⁻) → maintains or raises SID → pH-neutral to mildly alkalinizing.
 * - Lactic acidosis, AKI-driven uremic acids, DKA ketoacids: all reduce SID_effective (as
 *   unmeasured anions) → elevated anion gap metabolic acidosis.
 * - Hypoalbuminemia: albumin is a weak acid buffer; low albumin LOWERS Atot → artificially LOW
 *   apparent anion gap (the "corrected AG" teaching point: real AG is underestimated if albumin
 *   is low, hiding unmeasured anions like lactate or uremia).
 *
 * This model outputs:
 * - `sid`: actual computed strong ion difference (mEq/L)
 * - `computedHco3`: bicarbonate at current acid-base state (replaces the old flat formula)
 * - `computedPh`: pH unified from Stewart metabolic component + Henderson-Hasselbalch CO2
 * - `baseExcess`: `SID - 36` -- a clinically familiar aggregate metric of metabolic acid-base
 * - `anionGap`: standard AG = Na - Cl - HCO3 (normal 8-12 mEq/L)
 * - `correctedAg`: AG corrected for hypoalbuminemia (adds 2.5 per g/dL of albumin deficit below 4.0)
 * - `ionizedCalciumMmolL`: from FluidicsEngine's existing citrate-chelation-accounting `electrolytes.ca`
 * - `hypocalcemiaFromCitrate`: ionized Ca < 1.0 mmol/L (critical threshold for cardiac effects)
 * - Events: hyperchloremic acidosis onset, citrate hypocalcemia onset
 *
 * Source: P.A. Stewart's "How to understand acid-base" (1981) / simplified SID approach widely
 * used in critical-care medicine; Fencl & Leith (1993) for albumin-correction of anion gap.
 * Not a specific Miller's citation; disclosed per this project's standing convention.
 */

export interface AcidBaseInputs {
  sodiumMeqL?: number; // from electrolytes.na (FluidicsEngine-tracked)
  potassiumMeqL?: number; // from electrolytes.k
  chlorideMeqL?: number; // from electrolytes.cl (key SID driver!)
  lactateMmolL?: number; // from currentLactate in usePhysiology.js
  albuminGdL?: number; // from patient.albumin (already tracked)
  paco2MmHg?: number; // from respOutput.newPaCO2
  bufferedBicarbEq?: number; // from electrolytes.buf -- accumulated LR/PlasmaLyte buffer equivalents
  isSeptic?: boolean; // sepsis adds unmeasured organic anions (endotoxin-driven metabolic acidosis)
  bloodLossRatio?: number; // 0-1, hemorrhage-driven lactate/unmeasured anion contribution
  akiDamage?: number; // 0-1, AKI-driven uremic acid accumulation
  prevHypochloremiaLogged?: boolean;
  prevCitratHypocalcemiaLogged?: boolean;
  ionizedCalciumMmolL?: number; // from electrolytes.ca (FluidicsEngine already computes citrate chelation)
}

export interface AcidBaseOutput {
  sid: number; // mEq/L, normal ~36
  computedHco3: number; // mEq/L, replaces the prior flat formula
  computedPh: number; // unified arterial pH
  baseExcess: number; // mEq/L, from SID deviation; negative = acidosis
  anionGap: number; // mEq/L, standard AG
  correctedAg: number; // AG corrected for hypoalbuminemia
  ionizedCalciumMmolL: number;
  hypocalcemiaFromCitrate: boolean;
  hyperchloremicAcidosisPresent: boolean; // Cl-driven, non-anion-gap acidosis
  prevHypochloremiaLogged: boolean;
  prevCitratHypocalcemiaLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

const NORMAL_SID = 36; // mEq/L (normal plasma Na-Cl-Lactate balance)
const NORMAL_HCO3 = 24; // mEq/L
const NORMAL_ALBUMIN = 4.0; // g/dL

export class AcidBaseModel {
  static tick(inputs: AcidBaseInputs = {}): AcidBaseOutput {
    const events: string[] = [];

    const na = clamp(safeNumber(inputs.sodiumMeqL, 140), 100, 165);
    const k = clamp(safeNumber(inputs.potassiumMeqL, 4.0), 1, 9);
    const cl = clamp(safeNumber(inputs.chlorideMeqL, 103), 70, 140);
    const lactate = Math.max(0, safeNumber(inputs.lactateMmolL, 1.0));
    const albumin = clamp(safeNumber(inputs.albuminGdL, NORMAL_ALBUMIN), 0, 6);
    const paco2 = clamp(safeNumber(inputs.paco2MmHg, 40), 10, 100);
    const bufferedBicarbEq = Math.max(0, safeNumber(inputs.bufferedBicarbEq, 0));
    const isSeptic = !!inputs.isSeptic;
    const bloodLossRatio = clamp(safeNumber(inputs.bloodLossRatio, 0), 0, 1);
    const akiDamage = clamp(safeNumber(inputs.akiDamage, 0), 0, 1);
    const ionizedCalcium = clamp(safeNumber(inputs.ionizedCalciumMmolL, 1.2), 0, 3);
    let prevHypochloremiaLogged = !!inputs.prevHypochloremiaLogged;
    let prevCitratHypocalcemiaLogged = !!inputs.prevCitratHypocalcemiaLogged;

    // --- Strong Ion Difference ---
    // Simplified SID using the dominant contributors (Na as the principal strong cation,
    // Cl and lactate as principal strong anions). K is omitted here -- it is small (~4 mEq/L),
    // tightly regulated, and the clinical teaching around SID focuses on Na-Cl balance and
    // lactate; including K introduces calibration complexity without meaningful clinical insight.
    // Normal SID = 140 - 103 - 1 = 36 mEq/L, matching NORMAL_SID below.
    const sid = na - cl - lactate;

    // --- Unmeasured anion load (REDUCES effective SID from the acid perspective) ---
    // These represent organic acids that consume buffer without appearing in the standard
    // Na/K/Cl electrolyte measurement -- the source of ELEVATED anion gap metabolic acidosis.
    const sepsisUnmeasuredAnions = isSeptic ? 6.0 : 0; // endotoxin-driven organic acids
    const hemorrhageUnmeasuredAnions = bloodLossRatio * 8.0; // tissue hypoperfusion lactate + others
    const akiUnmeasuredAnions = akiDamage * 12.0; // uremic acids (sulfate, phosphate, hippurate, etc.)
    const totalUnmeasuredAnions = sepsisUnmeasuredAnions + hemorrhageUnmeasuredAnions + akiUnmeasuredAnions;

    // --- Metabolic base excess from SID deviation ---
    // SID deviation from normal (36) + buffered bicarb from administered fluids - unmeasured anions
    // gives the net metabolic acid-base position. 0.9 factor: ~90% of SID change is reflected in
    // [HCO3] (the dominant SID buffer at normal plasma albumin), the remainder in Atot change.
    const sidDeviation = sid - NORMAL_SID;
    const baseExcess = sidDeviation - totalUnmeasuredAnions + bufferedBicarbEq * 0.8;

    // --- Computed HCO3 ---
    // The metabolic component of HCO3 reflects both the SID physics and the accumulated buffer
    // load from administered fluids (LR lactate → HCO3, PlasmaLyte acetate → HCO3).
    let computedHco3 = clamp(NORMAL_HCO3 + baseExcess, 5, 45);

    // --- Computed pH (unified, from Stewart metabolic + Henderson-Hasselbalch CO2) ---
    const computedPh = clamp(6.1 + Math.log10(computedHco3 / Math.max(1e-9, 0.0307 * paco2)), 6.5, 7.8);

    // --- Standard Anion Gap + albumin correction ---
    const anionGap = na - cl - computedHco3;
    // Albumin correction: each g/dL below 4.0 g/dL decreases anion gap by ~2.5 mEq/L.
    // Adding this back gives the "corrected AG" that reveals hidden unmeasured anions.
    const albuminCorrection = (NORMAL_ALBUMIN - albumin) * 2.5;
    const correctedAg = anionGap + albuminCorrection;

    // --- Hyperchloremic acidosis detection ---
    // NS-driven: Cl disproportionately elevated (> ~110) driving SID below ~30, with
    // LOW or NORMAL anion gap (not elevated, distinguishing it from lactic acidosis or AKI).
    const hyperchloremicAcidosisPresent = cl > 110 && baseExcess < -4 && correctedAg < 15;
    if (hyperchloremicAcidosisPresent && !prevHypochloremiaLogged) {
      events.push("⚠️ CLINICAL ALERT: Hyperchloremic non-anion-gap metabolic acidosis from dilutional chloride loading (NS > LR/PlasmaLyte). Consider switching to a balanced crystalloid solution.");
      prevHypochloremiaLogged = true;
    } else if (!hyperchloremicAcidosisPresent && prevHypochloremiaLogged) {
      prevHypochloremiaLogged = false;
    }

    // --- Citrate-induced ionized hypocalcemia ---
    // Ionized calcium < 1.0 mmol/L is the clinical action threshold (cardiac effects).
    // FluidicsEngine.ts already computes citrate chelation (ca decrement on each blood product
    // unit), so `ionizedCalcium` reflects the current chelated-adjusted level.
    const hypocalcemiaFromCitrate = ionizedCalcium < 1.0;
    if (hypocalcemiaFromCitrate && !prevCitratHypocalcemiaLogged) {
      events.push("🚨 CLINICAL ALERT: Ionized hypocalcemia from citrate chelation in massive transfusion! Administer IV calcium (chloride or gluconate) to prevent myocardial depression and coagulation impairment.");
      prevCitratHypocalcemiaLogged = true;
    } else if (!hypocalcemiaFromCitrate && prevCitratHypocalcemiaLogged) {
      prevCitratHypocalcemiaLogged = false;
    }

    return {
      sid: parseFloat(sid.toFixed(2)),
      computedHco3: parseFloat(computedHco3.toFixed(2)),
      computedPh: parseFloat(computedPh.toFixed(3)),
      baseExcess: parseFloat(baseExcess.toFixed(2)),
      anionGap: parseFloat(anionGap.toFixed(1)),
      correctedAg: parseFloat(correctedAg.toFixed(1)),
      ionizedCalciumMmolL: parseFloat(ionizedCalcium.toFixed(3)),
      hypocalcemiaFromCitrate,
      hyperchloremicAcidosisPresent,
      prevHypochloremiaLogged,
      prevCitratHypocalcemiaLogged,
      events
    };
  }
}
