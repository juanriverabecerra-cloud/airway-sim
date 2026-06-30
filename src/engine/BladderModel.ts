/**
 * Bladder Model: Real Pressure-Volume Mechanics, Sex-Specific Overflow Threshold,
 * and Autonomic Dysreflexia (Spinal Cord Injury)
 *
 * Phase 4 (genitourinary completion), Stage B of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Direct code audit confirmed
 * `RenalEngine.ts` already tracked `bladderVolume` as a simple accumulator (filling
 * unboundedly during opioid-induced urinary retention, draining instantly to zero the moment
 * retention resolves or a Foley is placed) and `usePhysiology.js` applied a FLAT +5 HR / +5
 * MAP "distension" offset whenever `urinaryRetentionActive` was true, regardless of how much
 * volume had actually accumulated -- no bladder pressure concept existed at all, no ceiling on
 * volume growth, no sex-specific urethral resistance, and no autonomic dysreflexia mechanism
 * (confirmed by direct search: zero references anywhere in engine/component code).
 *
 * This model is deliberately NOT a multi-compartment ureteral/two-kidney rebuild -- the
 * existing single lumped `RenalEngine.ts` architecture stays as-is. "Ureteral peristalsis" at
 * this simulator's 1Hz whole-body granularity is captured simply as continuous (not
 * instantaneous) kidney-to-bladder filling, which the existing accumulator already did; the
 * genuinely missing pieces this model adds are:
 *
 * 1. **Bladder pressure-volume (compliance) relationship**: real bladder compliance is high
 *    (low pressure) up to roughly functional capacity (~400 mL), then rises with the bladder
 *    wall's mechanical limits as volume continues to climb -- modeled as a quadratic rise
 *    above a threshold volume (simpler to calibrate and avoids runaway blowup compared to an
 *    exponential elastance curve, though the same general "flat-then-steep" shape
 *    `CerebralEngine.ts`'s ICP model uses for the analogous intracranial compliance curve).
 * 2. **Pressure-graded sympathetic distension response**, replacing the flat +5/+5 HR/MAP
 *    offset with a continuous function of actual bladder pressure -- mild distension barely
 *    registers, severe distension produces a real, graded sympathetic surge.
 * 3. **Sex-specific overflow/urethral closure pressure**: once bladder pressure exceeds the
 *    urethral closure pressure (no Foley in place), urine leaks past the sphincter at a rate
 *    proportional to the pressure excess -- both a real physiologic safety valve (bladder
 *    volume can no longer grow literally without limit) and the real mechanism behind overflow
 *    incontinence. The female urethra is shorter with lower baseline closure pressure; the
 *    male urethra is longer with higher resistance (further elevated in the existing
 *    age+male BPH-risk modifier already present in `usePhysiology.js`'s retention-probability
 *    roll) -- consistent with male urinary retention being the more dramatic, higher-pressure
 *    clinical problem.
 * 4. **Autonomic dysreflexia** (spinal cord injury above ~T6): a real, well-known, and
 *    previously entirely unmodeled anesthesia teaching point -- bladder distension is the
 *    single most common trigger of autonomic dysreflexia in this population, producing severe
 *    paroxysmal hypertension with reflex bradycardia, triggered at a MUCH lower bladder
 *    pressure than would bother a neurologically intact patient (unopposed sympathetic reflex
 *    below the lesion, no descending inhibition). Modeled as a separate, more severe
 *    HR/MAP-modifying output, gated on a new (currently UI-unconnected, groundwork-only)
 *    `hasSpinalCordInjuryAboveT6` patient flag.
 *
 * Source: general urology/anesthesia physiology (bladder compliance, urethral closure
 * pressure, autonomic dysreflexia) -- not a specific Miller's citation; disclosed per this
 * project's standing convention. All calibration constants (the compliance threshold/
 * coefficient, sex-specific closure pressures, dysreflexia threshold) are disclosed, reasoned
 * estimates referenced against real teaching-point magnitudes, not directly sourced numeric
 * data.
 */

export interface BladderModelInputs {
  prevVolumeMl?: number;
  inflowRateMlPerMin?: number; // urine production rate from the kidneys (RenalEngine.ts's uopMlMin)
  urinaryRetentionActive?: boolean; // unchanged trigger semantics, owned by usePhysiology.js/RenalEngine.ts
  hasFoley?: boolean;
  sex?: string; // 'male' | 'female'
  hasSpinalCordInjuryAboveT6?: boolean;
  bphSeverity?: number; // 0-1, benign prostatic hyperplasia outflow obstruction (male only)
  dt?: number; // seconds
}

export interface BladderModelOutput {
  bladderVolumeMl: number;
  bladderPressureCmH2O: number;
  overflowLeakRateMlPerMin: number;
  overflowLeakActive: boolean;
  distensionSympatheticIndex: number; // 0-1, continuous, replaces the old flat HR/MAP offset
  autonomicDysreflexiaActive: boolean;
  autonomicDysreflexiaSeverity: number; // 0-1
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Functional capacity: bladder compliance is high (low pressure) below this volume.
const COMPLIANCE_THRESHOLD_ML = 400;
// Pressure rise coefficient above the threshold: pressure = BASELINE + COEFFICIENT * excessVolume^2.
// Calibrated so 300 mL excess (700 mL total) -> ~35 cmH2O, 500 mL excess (900 mL total) -> ~88 cmH2O.
const COMPLIANCE_COEFFICIENT = 0.000333;
const BASELINE_PRESSURE_CMH2O = 5;

// Urethral closure pressure: the pressure the sphincter can hold before leaking. Female
// urethra is shorter with lower baseline resistance; male urethra is longer, with higher
// baseline resistance (further elevated by BPH/prostatic tone in practice, not separately
// modeled here beyond the existing age+male retention-risk modifier elsewhere).
const URETHRAL_CLOSURE_PRESSURE_CMH2O: Record<string, number> = {
  female: 60,
  male: 90
};

export class BladderModel {
  static tick(inputs: BladderModelInputs = {}): BladderModelOutput {
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));
    const prevVolumeMl = Math.max(0, safeNumber(inputs.prevVolumeMl, 0));
    const inflowRateMlPerMin = Math.max(0, safeNumber(inputs.inflowRateMlPerMin, 0));
    const urinaryRetentionActive = !!inputs.urinaryRetentionActive;
    const hasFoley = !!inputs.hasFoley;
    const sex = inputs.sex === 'male' ? 'male' : 'female';
    const hasSpinalCordInjuryAboveT6 = !!inputs.hasSpinalCordInjuryAboveT6;
    const bphSeverity = clamp(safeNumber(inputs.bphSeverity, 0), 0, 1);

    let bladderVolumeMl = prevVolumeMl;

    // Filling only accumulates during active retention without a Foley -- unchanged trigger
    // semantics from the pre-existing mechanism, owned upstream. With a Foley or without active
    // retention, the bladder is drained (RenalEngine.ts's own existing logic), so this model
    // only needs to compute pressure/leak/distension consequences of whatever volume is present.
    if (urinaryRetentionActive && !hasFoley) {
      bladderVolumeMl += inflowRateMlPerMin * (dt / 60);
    }

    // Bladder pressure: flat-then-steep compliance curve.
    const excessVolume = Math.max(0, bladderVolumeMl - COMPLIANCE_THRESHOLD_ML);
    const bladderPressureCmH2O = BASELINE_PRESSURE_CMH2O + COMPLIANCE_COEFFICIENT * excessVolume * excessVolume;

    // Overflow leak: once pressure exceeds the sex-specific urethral closure pressure (and
    // there's no Foley already draining the bladder), urine leaks past the sphincter --
    // both a real safety valve preventing unbounded volume growth and the mechanism behind
    // overflow incontinence.
    // BPH (benign prostatic hyperplasia) raises effective outflow resistance further still --
    // the prostate mechanically narrows the urethra, so a higher bladder pressure is needed
    // before urine can pass at all, worsening retention/distension before any relief.
    const bphClosurePressureBoost = sex === 'male' ? 30 * bphSeverity : 0;
    const closurePressure = URETHRAL_CLOSURE_PRESSURE_CMH2O[sex] + bphClosurePressureBoost;
    const pressureExcess = Math.max(0, bladderPressureCmH2O - closurePressure);
    const overflowLeakActive = pressureExcess > 0 && !hasFoley;
    const overflowLeakRateMlPerMin = overflowLeakActive ? pressureExcess * 2 : 0;

    if (overflowLeakActive) {
      bladderVolumeMl = Math.max(0, bladderVolumeMl - overflowLeakRateMlPerMin * (dt / 60));
    }

    // Sympathetic distension response: continuous, graded by actual pressure (replacing the
    // old flat on/off +5/+5 HR/MAP offset). Reaches its ceiling around 40 cmH2O (severe
    // distension).
    const distensionSympatheticIndex = clamp(bladderPressureCmH2O / 40, 0, 1);

    // Autonomic dysreflexia: triggered at a much lower pressure than would bother a
    // neurologically intact patient -- the visceral afferent signal still reaches the cord and
    // triggers an unopposed sympathetic reflex below the level of injury.
    const autonomicDysreflexiaActive = hasSpinalCordInjuryAboveT6 && bladderPressureCmH2O > 15 && !hasFoley;
    const autonomicDysreflexiaSeverity = autonomicDysreflexiaActive ? clamp((bladderPressureCmH2O - 15) / 40, 0, 1) : 0;

    return {
      bladderVolumeMl: parseFloat(bladderVolumeMl.toFixed(2)),
      bladderPressureCmH2O: parseFloat(bladderPressureCmH2O.toFixed(2)),
      overflowLeakRateMlPerMin: parseFloat(overflowLeakRateMlPerMin.toFixed(3)),
      overflowLeakActive,
      distensionSympatheticIndex: parseFloat(distensionSympatheticIndex.toFixed(4)),
      autonomicDysreflexiaActive,
      autonomicDysreflexiaSeverity: parseFloat(autonomicDysreflexiaSeverity.toFixed(4))
    };
  }
}
