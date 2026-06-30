/**
 * Adrenal Gland Engine: Medulla (Catecholamine Trigger) + Cortex (Cortisol/HPA Axis)
 *
 * Phase 2, Stage A of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. The
 * adrenal medulla's catecholamine release was, before this engine, modeled only as a
 * downstream consequence of `PainEngine.ts`'s nociception-driven `C_cat` pool -- real
 * physiology, but missing the medulla's other major triggers (hypoglycemia, hypoxia,
 * hemorrhage/hypotension), which independently drive a catecholamine surge regardless of
 * pain. This engine computes that broader `nonNociceptiveSympatheticStimulus` on the SAME
 * 0-100 nociception-equivalent scale `PainEngine.ts`'s `totalNociceptiveInflux` already
 * uses, added into its existing `C_cat` onset/clearance kinetics rather than duplicating
 * a second catecholamine pool -- one real adrenal medulla output, fed by every trigger
 * that actually drives it, not two parallel mechanisms that never interact.
 *
 * The adrenal cortex's cortisol output was previously only a binary
 * `patient.adrenalSuppressionActive` flag (etomidate-specific 11-beta-hydroxylase
 * inhibition, a real and still-correct mechanism -- Miller's 9th Ed) blunting
 * catecholamine effects by a fixed 0.6x in `CardiovascularEngine.ts`. This engine
 * replaces that binary hack with a continuously-tracked cortisol level (its own slower
 * kinetics -- real cortisol response unfolds over minutes, not the catecholamine pool's
 * ~90-second half-life) driven by the same stress signal, suppressed by etomidate and
 * restored by dexamethasone exactly as before, and outputs a graduated
 * `catecholamineSensitivityMultiplier` -- cortisol's real "permissive" action on
 * adrenergic receptor responsiveness, the textbook reason adrenal-insufficient patients
 * develop catecholamine-refractory hypotension, now a continuous function of actual
 * cortisol level rather than an on/off switch.
 *
 * Source: general endocrine/critical-care physiology (counter-regulatory hormone
 * response to hypoglycemia, chemoreceptor/baroreceptor-driven sympathoadrenal
 * activation, cortisol's permissive action on catecholamine receptors) -- not a specific
 * Miller's citation; disclosed per this project's standing convention. Absolute
 * calibration constants (stimulus-to-nociception-equivalent scaling, cortisol kinetics)
 * are reasoned estimates, matched to the existing `C_cat`/`totalNociceptiveInflux` scale
 * so the two systems combine sensibly.
 */

export interface AdrenalPatientState {
  cortisolLevel?: number; // 0-1, 0.1 = baseline/normal (same convention as RenalEngine.ts's aldosterone/vasopressin/AngII)
  adrenalSuppressionActive?: boolean; // existing etomidate-suppression flag, read (not owned) here
}

export interface AdrenalVitalsState {
  glucose?: number; // mg/dL, normal ~100
  spo2?: number;
  map?: number;
}

export interface AdrenalOutput {
  nonNociceptiveSympatheticStimulus: number; // 0-100, nociception-equivalent scale -- add into PainEngine.ts's targetCcat
  cortisolLevel: number; // 0-1
  catecholamineSensitivityMultiplier: number; // 0.4-1.0, cortisol's permissive effect -- replaces the old fixed 0.6x adrenalSuppressionActive hack
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class AdrenalEngine {
  /**
   * Ticks the adrenal engine forward by dt seconds. Pure function, deterministic,
   * headless -- matches this codebase's other pure sub-engines' shape.
   */
  static tick(
    dt: number = 1,
    st: { patient: AdrenalPatientState; vitals: AdrenalVitalsState; time: number },
    inputs: { bloodLossRatio?: number; etomidateCe?: number; dexamethasoneCe?: number }
  ): AdrenalOutput {
    const events: string[] = [];
    const safeSt = st || ({} as typeof st);
    const patient = safeSt.patient || {};
    const vitals = safeSt.vitals || {};
    const safeInputs = inputs || {};
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;

    // --- Adrenal medulla: non-nociceptive sympathoadrenal triggers ---
    const glucose = Math.max(0, safeNumber(vitals.glucose, 100));
    const spo2 = Math.max(0, Math.min(100, safeNumber(vitals.spo2, 98)));
    const map = Math.max(0, safeNumber(vitals.map, 90));
    const bloodLossRatio = Math.max(0, Math.min(1, safeNumber(safeInputs.bloodLossRatio, 0)));

    // Counter-regulatory hormone response to hypoglycemia (real, well-described
    // mechanism -- catecholamine surge begins around a ~70 mg/dL threshold and becomes
    // severe by ~40 mg/dL, comparable in magnitude to acute surgical stress).
    const hypoglycemiaStimulus = glucose < 70 ? Math.min(70, ((70 - glucose) / 40) * 70) : 0;
    // Chemoreceptor-driven sympathetic surge from hypoxia.
    const hypoxiaStimulus = spo2 < 90 ? Math.min(55, ((90 - spo2) / 30) * 55) : 0;
    // Baroreceptor-driven surge from hypotension/hemorrhage (independent of, and
    // additive with, the blood-loss-ratio-driven preload effects already modeled
    // elsewhere -- this is specifically the sympathoadrenal trigger).
    const hypotensionStimulus = map < 65 ? Math.min(60, ((65 - map) / 45) * 60) : 0;
    const hemorrhageStimulus = bloodLossRatio > 0.15 ? Math.min(50, ((bloodLossRatio - 0.15) / 0.35) * 50) : 0;

    const nonNociceptiveSympatheticStimulus = Math.min(
      100,
      hypoglycemiaStimulus + hypoxiaStimulus + hypotensionStimulus + hemorrhageStimulus
    );

    // --- Adrenal cortex: cortisol / HPA axis ---
    // Cortisol's target tracks the same broad stress signal (capped well below the
    // catecholamine pool's 0-100 scale, then normalized to this engine's 0-1 convention).
    const stressIndex = Math.min(1, nonNociceptiveSympatheticStimulus / 80);
    const isEtomidateSuppressed = !!patient.adrenalSuppressionActive || safeNumber(safeInputs.etomidateCe, 0) > 0.05;
    const isDexamethasoneCovered = safeNumber(safeInputs.dexamethasoneCe, 0) > 0.01;

    let targetCortisol = 0.1 + 0.7 * stressIndex; // baseline 0.1, up to ~0.8 under severe stress
    if (isEtomidateSuppressed && !isDexamethasoneCovered) {
      // 11-beta-hydroxylase inhibition blocks cortisol synthesis regardless of how much
      // ACTH/stress signal is present -- the target collapses toward zero, not just a
      // fixed discount on whatever it would otherwise be.
      targetCortisol = 0.02;
    }

    const currentCortisol = Math.max(0, Math.min(1, safeNumber(patient.cortisolLevel, 0.1)));
    // Cortisol kinetics are slower than the catecholamine pool's ~90 s half-life -- a
    // real stress response unfolds over minutes; recovery from suppression is slower
    // still (k_onset/k_clear are general-physiology estimates, not literal half-lives).
    const k_onset = 0.02;
    const k_clear = 0.01;
    let newCortisol: number;
    if (targetCortisol > currentCortisol) {
      newCortisol = currentCortisol + safeDt * k_onset * (targetCortisol - currentCortisol);
    } else {
      newCortisol = currentCortisol + safeDt * k_clear * (targetCortisol - currentCortisol);
    }
    newCortisol = Math.max(0, Math.min(1, newCortisol));

    // Cortisol's permissive action on catecholamine receptor responsiveness (the
    // textbook reason adrenal-insufficient/Addisonian patients develop
    // catecholamine-refractory hypotension): graduated, not binary, replacing
    // CardiovascularEngine.ts's old fixed 0.6x `adrenalSuppressionActive` multiplier.
    // Saturates at 1.0 once cortisol reaches its own resting baseline (0.1) -- normal,
    // unstressed patients should see full sensitivity, not a permanent discount; only
    // falling *below* that baseline (suppression) reduces it. No super-sensitization is
    // modeled above baseline.
    const catecholamineSensitivityMultiplier = 0.4 + 0.6 * Math.min(1, newCortisol / 0.1);

    if (isEtomidateSuppressed && newCortisol < 0.05 && currentCortisol >= 0.05) {
      events.push(
        '⚠️ ADRENAL SUPPRESSION: Etomidate-induced 11-beta-hydroxylase inhibition has collapsed cortisol synthesis. Catecholamine (endogenous and exogenous pressor) effectiveness is reduced until cortisol recovers or dexamethasone is administered.'
      );
    }

    return {
      nonNociceptiveSympatheticStimulus,
      cortisolLevel: newCortisol,
      catecholamineSensitivityMultiplier,
      events
    };
  }
}
