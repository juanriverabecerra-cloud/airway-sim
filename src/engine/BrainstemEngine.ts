/**
 * Brainstem Engine: Peripheral Chemoreceptor (Hypoxic) Ventilatory Drive + Vasomotor Center
 *
 * Phase 3, Stage C of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Direct
 * code research confirmed Cushing's triad (ICP-driven hypertension, bradycardia, AND
 * irregular respiration) is already fully modeled across `CardiovascularEngine.ts`/
 * `RespiratoryEngine.ts` -- not duplicated here. Two genuine, confirmed-absent gaps are:
 *
 * 1. **Hypoxic ventilatory response**: real peripheral chemoreceptors (carotid/aortic
 *    bodies) sense PaO2/SpO2 directly and drive ventilation independently of the CO2-
 *    driven response, with faster onset kinetics and -- critically for anesthesia --
 *    disproportionate blunting by even low-dose volatile anesthetics and opioids (a
 *    well-described, clinically important phenomenon: a patient can desaturate without
 *    the expected compensatory tachypnea specifically because hypoxic drive is blunted
 *    far more than hypercapnic drive at the same anesthetic depth). `RespiratoryEngine.ts`
 *    had zero PaO2/SpO2-driven respiratory rate term before this engine -- confirmed by
 *    direct code search, not assumed.
 * 2. **Vasomotor center's vasoconstrictive arm**: `CardiovascularEngine.ts`'s baroreflex
 *    (`errorBaro`/`autonomicHrMod`) only ever drives heart rate -- there is no general
 *    baroreflex-driven systemic vascular resistance contribution at all (only the
 *    ICP/Cushing's-specific special case has one). Real baroreceptor-mediated
 *    compensation acts on both chronotropy AND vasomotor tone together; this engine adds
 *    the missing vasoconstrictive arm as a new, purely additive contribution.
 *
 * Both outputs feed into existing accumulator-style inputs
 * (`totalRrDelta`/`targetSVR`-additive-term) rather than replacing any existing tested
 * formula -- the same minimal-disruption discipline used throughout this redesign.
 *
 * Source: general respiratory/cardiovascular physiology (peripheral chemoreceptor
 * hypoxic ventilatory response and its anesthetic-induced blunting; baroreflex
 * vasoconstriction) -- not a specific Miller's citation; disclosed per this project's
 * standing convention.
 */

export interface BrainstemInputs {
  spo2?: number;
  currentMac?: number;
  opioidEffect?: number; // 0-1, existing aggregate opioid receptor occupancy signal
  sedativeEffect?: number; // 0-1, IV-hypnotic depth (propofol/etomidate/barbiturate/benzo); excludes ketamine (F40)
  map?: number;
  mapSet?: number;
}

export interface BrainstemOutput {
  hypoxicDriveRR: number; // breaths/min, additive contribution to totalRrDelta
  vasomotorSvrContribution: number; // dyn-s/cm^5-equivalent, additive contribution to targetSVR
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class BrainstemEngine {
  /**
   * Computes this tick's brainstem-level contributions. Pure function, deterministic,
   * headless, stateless (both outputs are direct functions of this tick's inputs, no
   * carried kinetics needed at this level of detail) -- matches this codebase's other
   * pure sub-engines' shape.
   */
  static tick(inputs: BrainstemInputs = {}): BrainstemOutput {
    const spo2 = Math.max(0, Math.min(100, safeNumber(inputs.spo2, 98)));
    const currentMac = Math.max(0, safeNumber(inputs.currentMac, 0));
    const opioidEffect = Math.max(0, Math.min(1, safeNumber(inputs.opioidEffect, 0)));
    // F40 (L4): IV-hypnotic depth (propofol/etomidate/barbiturate/benzodiazepine; EXCLUDES ketamine,
    // which preserves respiratory drive). Propofol profoundly blunts the hypoxic ventilatory response —
    // the reason a deeply-anesthetized apneic patient does not self-rescue by breathing.
    const sedativeEffect = Math.max(0, Math.min(1, safeNumber(inputs.sedativeEffect, 0)));
    const map = safeNumber(inputs.map, 93);
    const mapSet = safeNumber(inputs.mapSet, 93);

    // Hypoxic ventilatory response: a real, fairly steep increase in drive once SpO2
    // falls below ~90% (the threshold where peripheral chemoreceptor firing rises
    // sharply), reaching a large potential drive at severe desaturation.
    const hypoxicStimulus = spo2 < 90 ? Math.min(40, ((90 - spo2) / 20) * 40) : 0;
    // Disproportionate blunting: even modest MAC meaningfully blunts hypoxic drive (a
    // real, well-described anesthesia finding -- low-dose volatile anesthesia blunts
    // hypoxic ventilatory response far more than it blunts the hypercapnic response),
    // and opioids blunt it further still.
    const hypoxicBluntingFromMac = Math.min(0.85, currentMac * 0.55);
    const hypoxicBluntingFromOpioid = Math.min(0.7, opioidEffect * 0.7);
    const hypoxicBluntingFromHypnotic = Math.min(0.92, sedativeEffect * 1.15); // F40 (input is IV-hypnotic depth 0-1)
    const hypoxicDriveRR = hypoxicStimulus * (1 - hypoxicBluntingFromMac) * (1 - hypoxicBluntingFromOpioid) * (1 - hypoxicBluntingFromHypnotic);

    // Vasomotor center: the baroreflex's missing vasoconstrictive arm. Mirrors
    // CardiovascularEngine.ts's existing HR-side baroreflex error/gain structure (same
    // MAC-driven blunting) so the two arms of one reflex stay qualitatively coupled,
    // without reading or modifying that engine's own internal computation.
    const baroreflexGain = Math.max(0, 1.0 - currentMac * 0.67);
    const errorBaro = map - mapSet;
    // Negative error (MAP below target) -> positive (vasoconstrictive) SVR contribution.
    const vasomotorSvrContribution = Math.max(-150, Math.min(150, -2.5 * errorBaro * baroreflexGain));

    return { hypoxicDriveRR, vasomotorSvrContribution };
  }
}
