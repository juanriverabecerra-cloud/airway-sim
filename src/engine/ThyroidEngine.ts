/**
 * Thyroid Gland Engine: T3/T4 Axis -> Basal Metabolic Rate, Heat Production, Baseline HR
 *
 * Phase 2, Stage B of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Before
 * this engine, this codebase's metabolic rate (`totalMetabolicMultiplier`, driving
 * `VO2_sec`/`VCO2_sec` in `usePhysiology.js`) had three independent multiplier inputs
 * (shivering, seizure, malignant hyperthermia) but no thyroid-status contribution at
 * all -- hypothyroid and hyperthyroid patients behaved metabolically identically to
 * euthyroid ones. Temperature regulation similarly had no thyroid-driven baseline
 * (hypothyroid hypothermia tendency, hyperthyroid heat intolerance) and HR had no
 * thyroid-driven baseline shift (hypothyroid bradycardia, hyperthyroid tachycardia).
 *
 * This is a chronic-comorbidity-driven engine (like AS/CHF elsewhere in this codebase)
 * rather than a dynamically-synthesized hormone pool -- there is no TSH/pituitary input
 * modeled to drive T3/T4 release dynamically; `patient.hypothyroidism`/
 * `patient.hyperthyroidism` set a target thyroid function index, and actual T4 output
 * tracks toward it with real (slow) thyroid hormone kinetics (T4's biological half-life
 * is ~7 days -- thyroid status doesn't meaningfully change within a single OR case,
 * which is itself the clinically important teaching point: a thyroidectomy patient's
 * thyroid status going into surgery is what you have to manage, not something
 * anesthesia changes acutely).
 *
 * Thyroid storm -- the acute, life-threatening decompensation of poorly-controlled
 * hyperthyroidism under surgical/physiologic stress -- IS modeled as a real acute
 * crisis trigger (matching this codebase's established pattern for MH/serotonin
 * syndrome/etc.): severe tachycardia, hyperthermia, and a dramatic metabolic-rate spike
 * that can clinically mimic malignant hyperthermia, a real and frequently-tested
 * differential diagnosis point (Miller's 9th Ed).
 *
 * Source: general endocrine/anesthesia physiology (thyroid hormone's basal metabolic
 * rate effect, thyroid storm precipitated by surgical stress in inadequately-controlled
 * hyperthyroidism) -- not a specific Miller's citation; disclosed per this project's
 * standing convention. Absolute calibration constants (kinetics, multiplier magnitudes)
 * are reasoned estimates.
 */

export interface ThyroidPatientState {
  thyroidFunctionIndex?: number; // 0.3-2.0, 1.0 = euthyroid; tracks toward target below
  hypothyroidism?: boolean;
  hyperthyroidism?: boolean; // e.g. Graves' disease
  thyroidStormActive?: boolean;
  thyroidStormLogged?: boolean;
  onBetaBlocker?: boolean; // existing flag elsewhere in this codebase; read here too
  onAntithyroidMeds?: boolean; // e.g. methimazole/PTU -- adequately controlled hyperthyroidism
}

export interface ThyroidVitalsState {
  hr?: number;
}

export interface ThyroidOutput {
  thyroidFunctionIndex: number;
  thyroidMetabolicMultiplier: number; // feeds into usePhysiology.js's totalMetabolicMultiplier
  hrBaselineShift: number; // bpm, additive to baseHR
  tempBaselineShift: number; // degrees C, additive heat-production/loss tendency
  thyroidStormActive: boolean;
  thyroidStormLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class ThyroidEngine {
  /**
   * Ticks the thyroid engine forward by dt seconds. Pure function, deterministic,
   * headless -- matches this codebase's other pure sub-engines' shape.
   */
  static tick(
    dt: number = 1,
    st: { patient: ThyroidPatientState; vitals: ThyroidVitalsState; time: number },
    inputs: { surgicalStressIndex?: number } = {}
  ): ThyroidOutput {
    const events: string[] = [];
    const safeSt = st || ({} as typeof st);
    const patient = safeSt.patient || {};
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;

    const isHypo = !!patient.hypothyroidism;
    const isHyper = !!patient.hyperthyroidism;
    // Target thyroid function: 1.0 euthyroid, ~0.6 untreated hypothyroidism (myxedema-
    // range cases would be lower still but aren't separately staged here), ~1.5
    // untreated hyperthyroidism -- antithyroid medication brings a hyperthyroid target
    // back toward (not all the way to) normal.
    let targetIndex = 1.0;
    if (isHypo) targetIndex = 0.6;
    if (isHyper) targetIndex = patient.onAntithyroidMeds ? 1.15 : 1.5;

    const currentIndex = Math.max(0.3, Math.min(2.0, safeNumber(patient.thyroidFunctionIndex, 1.0)));
    // Real T4 kinetics are slow (~7-day half-life) -- thyroid status is a baseline
    // condition managed going into a case, not something that shifts meaningfully
    // within one OR day. k chosen so a multi-day case timescale would show real drift
    // while a single-day case stays essentially at whatever it started at.
    const k = 0.00002;
    const newIndex = Math.max(0.3, Math.min(2.0, currentIndex + safeDt * k * (targetIndex - currentIndex)));

    // Basal metabolic rate effect -- the textbook thyroid hormone action.
    const thyroidMetabolicMultiplier = 0.7 + 0.3 * newIndex; // 1.0 -> 1.0, 0.6 -> 0.88, 1.5 -> 1.15
    const hrBaselineShift = 15 * (newIndex - 1.0); // hypothyroid bradycardia, hyperthyroid tachycardia
    const tempBaselineShift = 0.5 * (newIndex - 1.0); // hypothyroid hypothermia tendency, hyperthyroid heat intolerance

    // Thyroid storm: acute decompensation of inadequately-controlled hyperthyroidism
    // under surgical/physiologic stress (Miller's 9th Ed) -- a real crisis trigger, not
    // just a continuous multiplier, matching this codebase's established MH/serotonin-
    // syndrome pattern. Beta-blockade blunts the peripheral consequences enough to
    // prevent triggering even if thyrotoxic.
    const surgicalStressIndex = Math.max(0, Math.min(100, safeNumber(inputs.surgicalStressIndex, 0)));
    let thyroidStormActive = !!patient.thyroidStormActive;
    let thyroidStormLogged = !!patient.thyroidStormLogged;
    const stormRisk = isHyper && !patient.onAntithyroidMeds && !patient.onBetaBlocker && surgicalStressIndex > 60;
    if (stormRisk && !thyroidStormActive) {
      thyroidStormActive = true;
    }
    if (!stormRisk && thyroidStormActive && surgicalStressIndex < 20) {
      // Resolves once the precipitating stress passes and treatment (beta-blockade) is established.
      thyroidStormActive = false;
      thyroidStormLogged = false;
    }

    let finalMetabolicMultiplier = thyroidMetabolicMultiplier;
    let finalHrShift = hrBaselineShift;
    let finalTempShift = tempBaselineShift;
    if (thyroidStormActive) {
      finalMetabolicMultiplier = thyroidMetabolicMultiplier * 1.8;
      finalHrShift = hrBaselineShift + 40;
      finalTempShift = tempBaselineShift + 2.5;
      if (!thyroidStormLogged) {
        thyroidStormLogged = true;
        events.push(
          '🚨 CRITICAL EMERGENCY: THYROID STORM -- surgical stress has precipitated acute thyrotoxic decompensation in inadequately-controlled hyperthyroidism. Severe tachycardia and hyperthermia are developing; this can clinically mimic malignant hyperthermia. Beta-blockade (e.g. esmolol) and antithyroid therapy are indicated.'
        );
      }
    }

    return {
      thyroidFunctionIndex: newIndex,
      thyroidMetabolicMultiplier: finalMetabolicMultiplier,
      hrBaselineShift: finalHrShift,
      tempBaselineShift: finalTempShift,
      thyroidStormActive,
      thyroidStormLogged,
      events
    };
  }
}
