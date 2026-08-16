/**
 * Pancreatic Endocrine Engine: Insulin/Glucagon -> Real Glucose Homeostasis
 *
 * Phase 2, Stage C of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Before
 * this engine, `patient.glucose` was a static field -- read by `RenalEngine.ts` (plasma
 * osmolality) and `AdrenalEngine.ts` (hypoglycemia's counter-regulatory trigger) but
 * never actually computed from real physiology. This engine makes glucose a genuine
 * output of hepatic glycogenolysis/gluconeogenesis (driven by glucagon and, critically,
 * by `AdrenalEngine.ts`'s cortisol and non-nociceptive sympathetic stimulus -- real
 * "stress hyperglycemia," a clinically significant perioperative phenomenon this
 * codebase had no mechanism for) balanced against insulin-driven peripheral uptake.
 *
 * Insulin secretion rises with glucose (the real negative-feedback loop); glucagon rises
 * as glucose falls (counter-regulatory, alongside the catecholamine surge
 * `AdrenalEngine.ts` already triggers). Diabetes is modeled as reduced insulin
 * *sensitivity* (a disclosed simplification covering both insulin resistance and
 * relative insulin deficiency, rather than separately modeling Type 1 vs. Type 2
 * pancreatic beta-cell function) -- diabetic patients show exaggerated stress
 * hyperglycemia and a blunted ability to correct it, the real clinical picture.
 *
 * Source: general endocrine physiology (insulin/glucagon counter-regulation, stress
 * hyperglycemia via cortisol/catecholamines, diabetic insulin resistance) -- not a
 * specific Miller's citation; disclosed per this project's standing convention. Absolute
 * calibration constants (rates, sensitivities) found by direct numerical balancing for a
 * true steady state at baseline (no pathology), the same approach used throughout this
 * redesign.
 */

export interface PancreasPatientState {
  glucose?: number; // mg/dL, normal ~100
  insulinLevel?: number; // 0-1, 0.1 = baseline
  glucagonLevel?: number; // 0-1, 0.1 = baseline
  diabetesMellitus?: boolean;
  diabetesSeverity?: number; // 0-1, 1 = poorly controlled; auto-derived to 0.5 if diabetesMellitus set without a value
}

export interface PancreasOutput {
  glucose: number;
  insulinLevel: number;
  glucagonLevel: number;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const GLUCOSE_BASELINE = 90; // mg/dL — midpoint of normal fasting range 70-99 (prior 100 = impaired fasting threshold)

export class PancreasEngine {
  /**
   * Ticks the pancreatic endocrine engine forward by dt seconds. Pure function,
   * deterministic, headless -- matches this codebase's other pure sub-engines' shape.
   */
  static tick(
    dt: number = 1,
    st: { patient: PancreasPatientState; time: number },
    inputs: { cortisolLevel?: number; nonNociceptiveSympatheticStimulus?: number; exogenousInsulinCe?: number; exogenousDextroseMgPerMin?: number; exogenousGlucocorticoidEquiv?: number } = {}
  ): PancreasOutput {
    const events: string[] = [];
    const safeSt = st || ({} as typeof st);
    const patient = safeSt.patient || {};
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;

    const glucose = Math.max(10, safeNumber(patient.glucose, GLUCOSE_BASELINE));
    const isDiabetic = !!patient.diabetesMellitus;
    const diabetesSeverity = isDiabetic ? Math.max(0, Math.min(1, safeNumber(patient.diabetesSeverity, 0.5))) : 0;
    // Diabetic patients have reduced insulin sensitivity (covers both insulin
    // resistance and relative deficiency, a disclosed simplification) -- less effective
    // glucose-lowering per unit insulin, and a blunted glucose-driven insulin response.
    const insulinSensitivity = 1.0 - 0.7 * diabetesSeverity;

    const cortisolLevel = Math.max(0, Math.min(1, safeNumber(inputs.cortisolLevel, 0.1)));
    const sympatheticStimulus = Math.max(0, Math.min(100, safeNumber(inputs.nonNociceptiveSympatheticStimulus, 0)));
    const exogenousInsulinCe = Math.max(0, safeNumber(inputs.exogenousInsulinCe, 0));
    const exogenousDextroseMgPerMin = Math.max(0, safeNumber(inputs.exogenousDextroseMgPerMin, 0));
    // F38: exogenous corticosteroids drive gluconeogenesis exactly as endogenous cortisol does (steroid
    // hyperglycemia — clinically important for a diabetic given perioperative dexamethasone). Previously
    // only ENDOGENOUS cortisol fed this flux; exogenous steroid was computed and sent only to a
    // logging-only model, so IV dexamethasone/hydrocortisone/methylprednisolone never raised glucose.
    // Add the exogenous glucocorticoid as a cortisol-equivalent (0-1) to the effective cortisol drive.
    const exogenousGlucocorticoidEquiv = Math.max(0, Math.min(1, safeNumber(inputs.exogenousGlucocorticoidEquiv, 0)));
    const effectiveCortisol = Math.max(0, Math.min(1.5, cortisolLevel + exogenousGlucocorticoidEquiv));

    // Insulin secretion: rises with glucose above baseline (real negative feedback),
    // blunted in diabetes; exogenous insulin administration adds directly.
    const currentInsulin = Math.max(0, Math.min(1, safeNumber(patient.insulinLevel, 0.1)));
    const targetInsulinEndogenous = Math.max(0.05, 0.1 + 0.012 * Math.max(0, glucose - GLUCOSE_BASELINE) * (1.0 - 0.5 * diabetesSeverity));
    const targetInsulin = Math.min(1.0, targetInsulinEndogenous + exogenousInsulinCe);
    const insulinK = targetInsulin > currentInsulin ? 0.15 : 0.05;
    const newInsulin = Math.max(0, Math.min(1, currentInsulin + safeDt * insulinK * (targetInsulin - currentInsulin)));

    // Glucagon secretion: rises as glucose falls below baseline (counter-regulatory,
    // alongside AdrenalEngine.ts's catecholamine surge for the same trigger).
    const currentGlucagon = Math.max(0, Math.min(1, safeNumber(patient.glucagonLevel, 0.1)));
    const targetGlucagon = Math.max(0.05, Math.min(1.0, 0.1 + 0.015 * Math.max(0, GLUCOSE_BASELINE - glucose)));
    const glucagonK = targetGlucagon > currentGlucagon ? 0.15 : 0.05;
    const newGlucagon = Math.max(0, Math.min(1, currentGlucagon + safeDt * glucagonK * (targetGlucagon - currentGlucagon)));

    // Glucose flux: hepatic glycogenolysis/gluconeogenesis (driven by glucagon AND the
    // same cortisol/sympathetic stress signal AdrenalEngine.ts already computes -- real
    // stress hyperglycemia, exaggerated in diabetes) minus insulin-driven peripheral
    // uptake, plus any exogenous dextrose.
    // Cortisol coefficient 0.08→0.008: prior drove glucose to 150 mg/dL in ~5 min.
    // Clinical: surgical stress hyperglycemia peaks at 30-120 min (cortisol acts via
    // gluconeogenesis gene transcription, not acute catecholamine mechanism).
    const hepaticGlucoseOutputMgPerMin = 1.0 * newGlucagon * 10
      + 0.008 * effectiveCortisol * 100 * (1.0 + diabetesSeverity) // F38: endogenous + exogenous glucocorticoid
      + 0.015 * sympatheticStimulus * (1.0 + diabetesSeverity);
    const peripheralUptakeMgPerMin = 1.2 * newInsulin * 10 * insulinSensitivity;
    const netGlucoseFluxMgPerMin = hepaticGlucoseOutputMgPerMin - peripheralUptakeMgPerMin + exogenousDextroseMgPerMin;

    const newGlucose = Math.max(10, Math.min(700, glucose + (netGlucoseFluxMgPerMin / 60) * safeDt));

    if (newGlucose < 40 && glucose >= 40) {
      events.push('🚨 CRITICAL EMERGENCY: Severe hypoglycemia (glucose < 40 mg/dL) -- risk of seizure and irreversible neuronal injury. Administer dextrose immediately.');
    } else if (newGlucose < 50 && glucose >= 50) {
      events.push('🚨 CRITICAL: Glucose < 50 mg/dL — loss of consciousness and airway compromise imminent. Administer dextrose urgently (D50W 25g IV or D10W infusion).');
    } else if (newGlucose < 70 && glucose >= 70) {
      events.push('⚠️ HYPOGLYCEMIA: Glucose has fallen below 70 mg/dL, triggering counter-regulatory catecholamine/glucagon release.');
    } else if (newGlucose > 300 && glucose <= 300) {
      events.push('⚠️ SEVERE HYPERGLYCEMIA: Glucose exceeds 300 mg/dL -- risk of osmotic diuresis and, in susceptible patients, diabetic ketoacidosis/hyperosmolar state.');
    }

    return {
      glucose: newGlucose,
      insulinLevel: newInsulin,
      glucagonLevel: newGlucagon,
      events
    };
  }
}
