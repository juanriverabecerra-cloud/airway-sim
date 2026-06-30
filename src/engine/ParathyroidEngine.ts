/**
 * Parathyroid Gland Engine: PTH -> Calcium / Vitamin D Axis
 *
 * Phase 2, Stage D of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Before
 * this engine, `electrolytes.ca` was modified only by `FluidicsEngine.ts`'s citrate-
 * binding mechanism (massive transfusion depleting ionized calcium) -- a real, correct
 * acute mechanism, but with no homeostatic *correction* layer at all: real PTH release
 * in response to falling calcium (bone resorption, renal reabsorption, vitamin-D-
 * mediated intestinal absorption) had no representation, so any calcium depletion was
 * permanent until directly treated. This engine adds that correction layer without
 * touching `FluidicsEngine.ts`'s existing citrate mechanism -- the acute depletion event
 * and the homeostatic response are genuinely separate physiological processes operating
 * on different timescales (citrate binding is immediate; PTH-mediated correction unfolds
 * over many minutes to hours), and are kept as separate mechanisms here for exactly that
 * reason.
 *
 * PTH secretion rises as ionized calcium falls (real negative feedback) and raises
 * calcium through a combined bone/renal/vitamin-D-dependent-intestinal effect, with
 * vitamin D status (reduced in chronic kidney disease -- a real, named mechanism behind
 * renal osteodystrophy and secondary hyperparathyroidism, linkable to
 * `RenalEngine.ts`'s existing renal function signal) scaling how effective that
 * correction can be. Hypoparathyroidism (e.g. post-thyroidectomy/parathyroidectomy, a
 * real and commonly-tested surgical complication) blunts the response directly,
 * allowing progressive, unopposed hypocalcemia.
 *
 * Source: general endocrine physiology (PTH-calcium-vitamin D negative feedback,
 * vitamin D dependence on renal function, post-surgical hypoparathyroidism) -- not a
 * specific Miller's citation; disclosed per this project's standing convention. Absolute
 * calibration constants (rates, sensitivities) found by direct numerical balancing for a
 * true steady state at baseline, the same approach used throughout this redesign.
 */

export interface ParathyroidPatientState {
  pthLevel?: number; // 0-1, 0.1 = baseline
  hypoparathyroidism?: boolean; // e.g. post-thyroidectomy/parathyroidectomy
  hypoparathyroidismSeverity?: number; // 0-1, 1 = complete; auto-derived to 0.7 if flag set without a value
  hypocalcemiaLogged?: boolean;
  severeHypocalcemiaLogged?: boolean;
}

export interface ParathyroidOutput {
  calcium: number; // mg/dL, total serum calcium -- same convention/baseline (9.0) as electrolytes.ca elsewhere in this codebase
  pthLevel: number;
  hypocalcemiaLogged: boolean;
  severeHypocalcemiaLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const CALCIUM_BASELINE = 9.0; // mg/dL, matches usePhysiology.js's existing electrolytes.ca default

export class ParathyroidEngine {
  /**
   * Ticks the parathyroid engine forward by dt seconds. Pure function, deterministic,
   * headless -- matches this codebase's other pure sub-engines' shape.
   */
  static tick(
    dt: number = 1,
    st: { patient: ParathyroidPatientState; time: number },
    inputs: { calcium?: number; renalFunctionRatio?: number } = {}
  ): ParathyroidOutput {
    const events: string[] = [];
    const safeSt = st || ({} as typeof st);
    const patient = safeSt.patient || {};
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;

    const calcium = Math.max(2, Math.min(20, safeNumber(inputs.calcium, CALCIUM_BASELINE)));
    // Vitamin D's activation step is renally dependent -- chronic kidney disease
    // (RenalEngine.ts's existing GFR-derived ratio) reduces how effective PTH's
    // calcium-raising action can be, the real mechanism behind renal osteodystrophy/
    // secondary hyperparathyroidism (PTH itself often rises further trying to
    // compensate, modeled here via the reduced *effectiveness*, not a separate signal).
    const renalFunctionRatio = Math.max(0.05, Math.min(1.0, safeNumber(inputs.renalFunctionRatio, 1.0)));
    const vitaminDEffectiveness = 0.4 + 0.6 * renalFunctionRatio;

    const isHypopara = !!patient.hypoparathyroidism;
    const hypoparaSeverity = isHypopara ? Math.max(0, Math.min(1, safeNumber(patient.hypoparathyroidismSeverity, 0.7))) : 0;
    const pthResponseCapacity = 1.0 - hypoparaSeverity;

    // PTH secretion: rises as calcium falls below baseline (real negative feedback),
    // blunted directly by hypoparathyroidism.
    const currentPth = Math.max(0, Math.min(1, safeNumber(patient.pthLevel, 0.1)));
    const targetPth = Math.max(0.02, Math.min(1.0, (0.1 + 0.25 * Math.max(0, CALCIUM_BASELINE - calcium)) * pthResponseCapacity));
    const pthK = targetPth > currentPth ? 0.01 : 0.005; // PTH itself responds within minutes
    const newPth = Math.max(0, Math.min(1, currentPth + safeDt * pthK * (targetPth - currentPth)));

    // Calcium correction: PTH's combined bone/renal/vitamin-D-dependent-intestinal
    // effect raises calcium toward baseline, scaled by vitamin D effectiveness -- this
    // is the homeostatic *correction* layer; FluidicsEngine.ts's citrate mechanism
    // remains the separate acute-depletion event this corrects against over time.
    const correctionMgPerMin = 0.15 * newPth * vitaminDEffectiveness * Math.max(0, CALCIUM_BASELINE - calcium);
    const newCalcium = Math.max(2, Math.min(20, calcium + (correctionMgPerMin / 60) * safeDt));

    // This engine only ever *raises* calcium (the correction layer) -- it never lowers
    // it, since active depletion is FluidicsEngine.ts's separate citrate mechanism. So
    // these events fire off the current (input) level directly, with a logged-flag
    // guard (matching CardiovascularEngine.ts's ischemiaMildLogged/-SevereLogged
    // pattern) rather than a before/after transition, which this engine's own output
    // could never produce on its own.
    let hypocalcemiaLogged = !!patient.hypocalcemiaLogged;
    let severeHypocalcemiaLogged = !!patient.severeHypocalcemiaLogged;
    if (calcium < 6.0) {
      if (!severeHypocalcemiaLogged) {
        severeHypocalcemiaLogged = true;
        hypocalcemiaLogged = true;
        events.push('🚨 CRITICAL EMERGENCY: Severe hypocalcemia (< 6.0 mg/dL) -- risk of tetany, laryngospasm, seizures, and life-threatening arrhythmia.');
      }
    } else if (calcium < 7.0) {
      if (!hypocalcemiaLogged) {
        hypocalcemiaLogged = true;
        events.push('⚠️ HYPOCALCEMIA: Total calcium has fallen below 7.0 mg/dL -- risk of neuromuscular irritability (Chvostek/Trousseau signs), QT prolongation, and reduced cardiac contractility.');
      }
      severeHypocalcemiaLogged = false;
    } else {
      hypocalcemiaLogged = false;
      severeHypocalcemiaLogged = false;
    }

    return {
      calcium: newCalcium,
      pthLevel: newPth,
      hypocalcemiaLogged,
      severeHypocalcemiaLogged,
      events
    };
  }
}
