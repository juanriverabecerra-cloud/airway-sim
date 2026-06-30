/**
 * Autonomic Nervous System Engine: Continuous Parasympathetic (Vagal) Tone + Sympathetic Tone Aggregation
 *
 * Phase 3, Stage B of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Before
 * this engine, direct code tracing found ~5-6 genuinely separate sympathetic/autonomic
 * signals scattered across the codebase (`CardiovascularEngine.ts`'s `baroreflexGain`/
 * `autonomicHrMod`, `PainEngine.ts`'s `sympatheticDrive`/`C_cat`, `AdrenalEngine.ts`'s
 * `nonNociceptiveSympatheticStimulus`, `CardiovascularEngine.ts`'s `neurohormonalInotropy`/
 * `-HrDelta`), each computed independently with no common parent -- and **zero**
 * continuous parasympathetic/vagal tone concept anywhere: every existing vagal effect
 * (the oculocardiac reflex, Bezold-Jarisch, neostigmine-induced bradycardia) is a
 * separate, ad hoc binary/event-driven mechanism, not a tracked physiological state.
 *
 * This engine deliberately does NOT replace any of those existing, tested sympathetic
 * mechanisms (each is correct for its own specific trigger and stays as-is, the same
 * minimal-disruption discipline used throughout this redesign) -- it ADDS the missing
 * piece (a real, continuous parasympathetic tone) and provides a read-only
 * `sympatheticToneIndex` that *aggregates* (without replacing) the existing scattered
 * signals into one observable summary value, for future use (e.g. a future autonomic-
 * tone monitor display, or as a building block for later phases) without risking the
 * calibration of any formula that already reads those signals directly.
 *
 * Source: general autonomic physiology (parasympathetic/vagal tone rising with
 * anesthetic depth and vagal stimulation, falling with anticholinergics and sympathetic
 * activation -- the reciprocal sympathovagal balance) -- not a specific Miller's
 * citation; disclosed per this project's standing convention.
 */

export interface AutonomicPatientState {
  oculocardiacTriggered?: boolean;
  laryngospasm?: boolean;
}

export interface AutonomicInputs {
  currentMac?: number;
  anticholinergicCe?: number; // sum of atropine/glycopyrrolate Ce
  C_cat?: number; // PainEngine.ts's existing catecholamine pool, 0-150 scale
  nonNociceptiveSympatheticStimulus?: number; // AdrenalEngine.ts's existing 0-100 scale
  cortisolLevel?: number; // AdrenalEngine.ts's existing 0-1 scale
  baroreflexErrorMagnitude?: number; // |MAP - MAP_set|, CardiovascularEngine.ts's existing signal
}

export interface AutonomicOutput {
  vagalTone: number; // 0-1, 0.5 = normal resting baseline
  vagalHrEffect: number; // bpm, negative (bradycardic) contribution -- additive to totalHrDelta
  sympatheticToneIndex: number; // 0-1+, read-only aggregate summary of existing scattered sympathetic signals (does not feed back into any formula itself)
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class AutonomicNervousSystemEngine {
  /**
   * Computes this tick's autonomic tone summary. Pure function, deterministic,
   * headless, no internal state carried -- matches this codebase's other pure
   * sub-engines' shape, but stateless since vagal tone here is a direct function of
   * this tick's inputs rather than its own slow-kinetics pool (unlike cortisol/C_cat).
   */
  static tick(patient: AutonomicPatientState, inputs: AutonomicInputs = {}): AutonomicOutput {
    const safePatient = patient || {};
    const currentMac = Math.max(0, safeNumber(inputs.currentMac, 0));
    const anticholinergicCe = Math.max(0, safeNumber(inputs.anticholinergicCe, 0));
    const C_cat = Math.max(0, safeNumber(inputs.C_cat, 0));
    const nonNociceptiveSympatheticStimulus = Math.max(0, safeNumber(inputs.nonNociceptiveSympatheticStimulus, 0));
    const cortisolLevel = Math.max(0, safeNumber(inputs.cortisolLevel, 0.1));
    const baroreflexErrorMagnitude = Math.max(0, safeNumber(inputs.baroreflexErrorMagnitude, 0));

    // Volatile/deep anesthesia shifts autonomic balance toward parasympathetic
    // predominance (a real, if agent-dependent, general anesthesia effect -- disclosed
    // simplification, not modeling individual agents' differing vagal effects).
    const anestheticVagalBoost = Math.min(0.35, currentMac * 0.18);
    // Acute vagal stimulation triggers (existing flags, read not owned here).
    const vagalStimulusBoost = (safePatient.oculocardiacTriggered ? 0.25 : 0) + (safePatient.laryngospasm ? 0.15 : 0);
    // Sympathetic activation reciprocally suppresses vagal tone (the real
    // sympathovagal balance) -- scaled by the SAME catecholamine pool that drives
    // sympathetic effects elsewhere, so the two stay qualitatively coupled even though
    // this engine doesn't feed back into the formulas that compute them.
    const sympatheticVagalSuppression = Math.min(0.4, (C_cat / 150) * 0.4);
    // Anticholinergics (atropine/glycopyrrolate) directly antagonize vagal tone.
    const anticholinergicSuppression = Math.min(0.45, anticholinergicCe * 0.5);

    const vagalTone = Math.max(
      0.05,
      Math.min(
        1.0,
        0.5 + anestheticVagalBoost + vagalStimulusBoost - sympatheticVagalSuppression - anticholinergicSuppression
      )
    );
    // Bradycardic contribution scales around the 0.5 baseline -- above baseline,
    // genuine additional bradycardic drive; below it (anticholinergics/sympathetic
    // dominance), a positive (tachycardic-permissive) contribution. Calibrated small
    // (max ~15 bpm at full vagal tone) since this is additive on top of, not a
    // replacement for, the existing oculocardiac/Bezold-Jarisch/neostigmine triggers'
    // own much larger specific bradycardic effects.
    const vagalHrEffect = -30 * (vagalTone - 0.5);

    // Read-only aggregate -- a single observable summary of the existing scattered
    // sympathetic signals, not itself fed back into any formula that computes them.
    const sympatheticToneIndex = Math.min(
      2.0,
      (C_cat / 100) * 0.4 +
        (nonNociceptiveSympatheticStimulus / 100) * 0.3 +
        Math.max(0, cortisolLevel - 0.1) * 0.6 +
        Math.min(0.5, baroreflexErrorMagnitude / 40) * 0.3
    );

    return { vagalTone, vagalHrEffect, sympatheticToneIndex };
  }
}
