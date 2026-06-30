/**
 * TURP Syndrome Model: Irrigation Fluid Absorption During Transurethral Prostate Resection
 *
 * Phase 4 (genitourinary/reproductive bucket), Stage E of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md -- the male-GU counterpart to the
 * pregnancy/PPH/fetal pieces above. Deliberately reframed from the roadmap's original "male
 * prostate/erectile physiology" wording: literal erectile physiology has essentially zero
 * anesthesia relevance, while TURP syndrome is a real, classic, high-value anesthesia
 * teaching point that was completely unmodeled (confirmed by direct search: zero references
 * anywhere). This is a deliberate, disclosed scope judgment call, not an oversight.
 *
 * Real mechanism: during monopolar electrocautery resection of the prostate, large venous
 * sinuses in the prostatic bed are opened, and hypotonic/electrolyte-free irrigation fluid
 * (classically glycine 1.5% or sorbitol-mannitol solutions) can be absorbed systemically
 * through them -- producing, in proportion to how much venous sinus opening the resection
 * involves and how long it runs: dilutional hyponatremia (free water absorption diluting
 * serum sodium -- reuses the SAME `patient.sodiumLevel`/`isHyponatremic` tracking this
 * codebase already has, driven by Oxcarbazepine elsewhere, following that exact established
 * pattern rather than inventing a parallel one), intravascular volume expansion, and mild
 * hypothermia (room-temperature irrigation fluid). This model outputs RATES; the existing
 * sodium/volume/temperature accumulators in `usePhysiology.js` apply them, exactly mirroring
 * the Oxcarbazepine-hyponatremia block's architecture.
 *
 * Deliberately NOT modeled: glycine-specific CNS/visual toxicity (transient blindness is a
 * real but procedure/solution-specific complication tied to glycine metabolism specifically,
 * not absorption volume generically -- a disclosed, narrower scope gap) and hemolysis from
 * older non-glycine hypotonic solutions (largely historical with modern bipolar resection
 * technique using isotonic saline, which does not cause TURP syndrome at all -- this model
 * implicitly assumes the classic monopolar/hypotonic-irrigation scenario).
 *
 * Source: general urology/anesthesia physiology (TURP syndrome mechanism and rough
 * absorption-rate/severity magnitudes) -- not a specific Miller's citation; disclosed per this
 * project's standing convention. All calibration constants are disclosed, reasoned estimates.
 */

export interface TurpSyndromeInputs {
  turpSurgeryActive?: boolean;
  resectionSeverity?: number; // 0-1, how extensive the venous sinus opening is
  dt?: number; // seconds
}

export interface TurpSyndromeOutput {
  irrigationAbsorptionRateMlPerMin: number;
  sodiumDropRateMEqPerMin: number;
  temperatureDropRateCPerMin: number;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class TurpSyndromeModel {
  static tick(inputs: TurpSyndromeInputs = {}): TurpSyndromeOutput {
    if (!inputs.turpSurgeryActive) {
      return { irrigationAbsorptionRateMlPerMin: 0, sodiumDropRateMEqPerMin: 0, temperatureDropRateCPerMin: 0 };
    }

    const resectionSeverity = clamp(safeNumber(inputs.resectionSeverity, 0.5), 0, 1);

    // Calibrated so a sustained severe resection (severity=1) over ~60-90 min can drop serum
    // sodium by ~20-30 mEq/L, matching real clinically severe TURP syndrome case reports.
    const irrigationAbsorptionRateMlPerMin = 20 * resectionSeverity;
    const sodiumDropRateMEqPerMin = 0.35 * resectionSeverity;
    const temperatureDropRateCPerMin = 0.02 * resectionSeverity;

    return {
      irrigationAbsorptionRateMlPerMin: parseFloat(irrigationAbsorptionRateMlPerMin.toFixed(3)),
      sodiumDropRateMEqPerMin: parseFloat(sodiumDropRateMEqPerMin.toFixed(4)),
      temperatureDropRateCPerMin: parseFloat(temperatureDropRateCPerMin.toFixed(4))
    };
  }
}
