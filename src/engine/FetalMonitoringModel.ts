/**
 * Fetal Monitoring Model: Fetal Heart Rate Response to Maternal Perfusion/Oxygenation
 *
 * Phase 4 (genitourinary/reproductive bucket), Stage D of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Confirmed by direct audit: zero
 * fetal physiology existed anywhere in this codebase before this -- no fetal heart rate, no
 * deceleration concept, nothing. This model is deliberately NOT a full second-patient fetal
 * physiology simulation (no separate fetal cardiovascular/respiratory/acid-base system) --
 * that would be a much larger undertaking than this stage's scope. It IS a real, clinically
 * meaningful fetal heart rate response to the SAME maternal variables an anesthesiologist
 * actually manages, deliberately integrating with mechanisms already built in this codebase
 * rather than existing in isolation:
 *
 * 1. **Uteroplacental perfusion**: fetal oxygen delivery depends on maternal MAP (perfusion
 *    pressure to the placental bed) and maternal SpO2 (oxygen content) together. This
 *    directly connects to `PregnancyPhysiologyEngine.ts`'s aortocaval compression mechanism
 *    (Stage A of this phase) -- a supine, undisplaced gravid patient's MAP drop now has a
 *    real downstream fetal consequence (late decelerations / bradycardia) rather than being
 *    a maternal-only number, exactly the kind of "everything connects" integration this
 *    rebuild has aimed for throughout.
 * 2. **Late decelerations / fetal bradycardia from uteroplacental insufficiency**: real CTG
 *    teaching -- a gradual FHR decrease tracking reduced maternal perfusion/oxygenation,
 *    becoming a sustained bradycardia if severe/prolonged. Modeled as a continuous function
 *    of combined maternal MAP/SpO2 adequacy, not a separate bespoke mechanism.
 * 3. **Uterine hyperstimulation (oxytocin overdose)**: a real, important, double-edged-sword
 *    teaching point given this stage also just added Oxytocin as a postpartum hemorrhage
 *    treatment (`UterineToneModel.ts`) -- PRE-delivery, excessive oxytocin dosing can cause
 *    uterine tachysystole, reducing the fetus's inter-contraction recovery window and causing
 *    fetal distress. The same drug that treats PPH after delivery can cause fetal distress
 *    before it, if mismanaged -- a genuine clinical tension, not just two unrelated facts.
 * 4. **Reduced variability from maternal opioids**: real CTG teaching -- maternal opioids
 *    cross the placenta and blunt fetal heart rate variability/reactivity, a real
 *    consideration when dosing analgesia prior to delivery.
 *
 * Only meaningful pre-delivery -- gated on `isPregnant && !deliveryOccurred`.
 *
 * Source: general obstetric/anesthesia physiology (CTG/fetal heart rate pattern
 * interpretation, uteroplacental perfusion, uterine hyperstimulation, opioid effects on FHR
 * variability) -- not a specific Miller's citation; disclosed per this project's standing
 * convention. All calibration constants are disclosed, reasoned estimates referenced against
 * real teaching-point magnitudes, not directly sourced numeric data.
 */

export interface FetalMonitoringInputs {
  isPregnant?: boolean;
  deliveryOccurred?: boolean;
  maternalMAP?: number;
  maternalSpO2?: number;
  oxytocinCe?: number; // pre-delivery oxytocin (e.g. labor augmentation), distinct from postpartum PPH dosing
  opioidEffect?: number; // 0-1, this codebase's existing aggregate maternal opioid receptor occupancy signal
  dt?: number; // seconds
}

export interface FetalMonitoringOutput {
  fetalHR: number; // bpm
  variabilityIndex: number; // 0-1, low = concerning (reduced reactivity)
  lateDecelerationActive: boolean;
  fetalBradycardiaActive: boolean;
  fetalBradycardiaSeverity: number; // 0-1
  uterineHyperstimulationActive: boolean;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

const BASELINE_FHR = 140;

export class FetalMonitoringModel {
  static tick(inputs: FetalMonitoringInputs = {}): FetalMonitoringOutput {
    if (!inputs.isPregnant || inputs.deliveryOccurred) {
      return {
        fetalHR: BASELINE_FHR,
        variabilityIndex: 0.7,
        lateDecelerationActive: false,
        fetalBradycardiaActive: false,
        fetalBradycardiaSeverity: 0,
        uterineHyperstimulationActive: false
      };
    }

    const maternalMAP = clamp(safeNumber(inputs.maternalMAP, 90), 0, 200);
    const maternalSpO2 = clamp(safeNumber(inputs.maternalSpO2, 98), 0, 100);
    const oxytocinCe = Math.max(0, safeNumber(inputs.oxytocinCe, 0));
    const opioidEffect = clamp(safeNumber(inputs.opioidEffect, 0), 0, 1);

    // Combined maternal perfusion/oxygenation adequacy to the placental bed -- 1.0 = fully
    // adequate (MAP >= 90, SpO2 >= 98), falling below 1.0 as either degrades.
    const maternalOxygenDeliveryIndex = clamp((maternalMAP / 90) * (maternalSpO2 / 98), 0, 1.3);

    // Late decelerations / bradycardia from uteroplacental insufficiency: a real perfusion/
    // oxygenation deficit translates into a graded FHR depression.
    const perfusionDeficit = Math.max(0, 1 - maternalOxygenDeliveryIndex);
    const decelMagnitude = clamp(150 * perfusionDeficit, 0, 80);

    // Uterine hyperstimulation: only kicks in at supraphysiologic oxytocin doses (real --
    // therapeutic infusion rates don't typically cause this; overdose/rapid bolus does).
    const uterineHyperstimulationActive = oxytocinCe > 5;
    const hyperstimulationPenalty = uterineHyperstimulationActive ? 20 * ((oxytocinCe - 5) / (oxytocinCe - 5 + 5)) : 0;

    const fetalHR = clamp(BASELINE_FHR - decelMagnitude - hyperstimulationPenalty, 50, 180);

    const lateDecelerationActive = perfusionDeficit > 0.15;
    const fetalBradycardiaActive = fetalHR < 110;
    const fetalBradycardiaSeverity = fetalBradycardiaActive ? clamp((110 - fetalHR) / 50, 0, 1) : 0;

    // Maternal opioids cross the placenta and blunt FHR variability; a severely compromised
    // (bradycardic) fetus loses variability further still -- a real, ominous combined finding.
    const variabilityIndex = clamp(0.7 - 0.5 * opioidEffect - 0.3 * fetalBradycardiaSeverity, 0, 1);

    return {
      fetalHR: parseFloat(fetalHR.toFixed(1)),
      variabilityIndex: parseFloat(variabilityIndex.toFixed(3)),
      lateDecelerationActive,
      fetalBradycardiaActive,
      fetalBradycardiaSeverity: parseFloat(fetalBradycardiaSeverity.toFixed(4)),
      uterineHyperstimulationActive
    };
  }
}
