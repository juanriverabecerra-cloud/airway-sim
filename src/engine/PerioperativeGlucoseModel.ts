/**
 * Perioperative Glucose Management Model
 *
 * Hyperglycemia is exceedingly common perioperatively: stress response (cortisol,
 * catecholamines → hepatic gluconeogenesis + insulin resistance), IV dextrose infusions,
 * corticosteroids, and TPN all elevate glucose. Poor glycemic control independently
 * predicts: surgical site infection, wound dehiscence, AKI, longer ICU/hospital stay.
 *
 * === THE NICE-SUGAR CONTROVERSY ===
 * INITIAL PARADIGM (van den Berghe 2001): Tight glycemic control (80-110 mg/dL)
 * in surgical ICU → 34% reduction in ICU mortality. This drove TGC into widespread practice.
 *
 * REFUTATION (NICE-SUGAR 2009, NEJM): Intensive glucose control (81-108 mg/dL)
 * vs conventional (≤180 mg/dL) in 6,104 ICU patients → INTENSIVE GROUP: HIGHER MORTALITY
 * (27.5% vs 24.9%, p=0.02). Hypoglycemia was 3× more frequent in intensive group → cause.
 *
 * CURRENT CONSENSUS TARGETS (2018-2024):
 * - General ICU: 140-180 mg/dL (SIDs/SCCM guidelines)
 * - Cardiac surgery: 140-180 mg/dL (slightly tighter but not tight control)
 * - Neuro ICU: 140-180 mg/dL; avoid hypoglycemia (no glucose for neurons)
 * - Non-ICU perioperative: < 180 mg/dL; avoid hypoglycemia
 * - Diabetics: 140-180 mg/dL perioperatively; maintain pre-op DM medications cautiously
 *
 * === PERIOPERATIVE SPECIFIC CONSIDERATIONS ===
 * 1. HELD MEDICATIONS:
 *    - Metformin: HOLD 24-48h preoperatively (lactic acidosis risk with contrast/AKI)
 *    - SGLT-2 inhibitors (empagliflozin, canagliflozin): HOLD ≥3 days preop
 *      (euglycemic DKA risk — rare but potentially fatal; glucose may appear NORMAL!)
 *    - GLP-1 agonists (semaglutide): HOLD 1 week preop (delayed gastric emptying → aspiration risk)
 *    - Sulfonylureas: HOLD day-of-surgery (hypoglycemia risk fasting)
 *    - Insulin: ADJUST (reduce by 50-80%, especially basal insulin)
 *
 * 2. HYPERGLYCEMIA MANAGEMENT INTRAOP:
 *    - D5W drips + stress → glucose spikes; use NS instead
 *    - Check glucose q1-2h if diabetic or major surgery
 *    - Insulin drip: target 140-180 mg/dL; algorithms vary (Portland, Van den Berghe modified)
 *
 * 3. EUGLYCEMIC DKA (SGLT-2 inhibitor complication):
 *    - Presentation: AG metabolic acidosis, ketonemia/ketonuria, NORMAL GLUCOSE (< 250 mg/dL)
 *    - DIAGNOSIS MISSED because checking serum glucose only = normal
 *    - Precipitated by: fasting (held preop), surgery, insulin underdose, contrast
 *    - Treatment: dextrose (despite "normal" glucose), insulin infusion, fluids
 *
 * Sources: NICE-SUGAR Investigators, NEJM 2009; van den Berghe G, NEJM 2001;
 * Moghissi ES, Endocr Pract 2009; Garber AJ, AACE/ADA Consensus 2020.
 */

export interface PerioperativeGlucoseInputs {
  // Current glucose status
  currentGlucoseMgDl?: number;
  previousGlucose?: number;       // previous measurement for trend

  // Medications
  insulinCe?: number;             // insulin infusion concentration equivalent
  metforminActive?: boolean;      // metformin on day of surgery
  sglt2Active?: boolean;          // SGLT-2 inhibitor taken recently
  glp1Active?: boolean;           // GLP-1 agonist taken within 1 week
  sulfonylureaCe?: number;        // sulfonylurea (fasting hypoglycemia risk)
  steroidCe?: number;             // corticosteroids → hyperglycemia
  dextrosInfusionRate?: number;   // mL/hr of dextrose-containing IV

  // Patient
  isDiabetic?: boolean;
  isDKAPresent?: boolean;         // euglycemic DKA flag
  isInICU?: boolean;
  isMajorSurgery?: boolean;

  // Event guards
  prevHyperlogged?: boolean;
  prevHypologged?: boolean;
  prevSGLT2Logged?: boolean;
  prevMetforminLogged?: boolean;
}

export interface PerioperativeGlucoseOutput {
  currentGlucose: number;
  isHyperglycemic: boolean;         // > 180 mg/dL
  isHypoglycemic: boolean;          // < 70 mg/dL
  isCriticallyLow: boolean;         // < 54 mg/dL (immediate treatment needed)
  targetRange: [number, number];    // [min, max] mg/dL
  inTargetRange: boolean;
  insulinInfusionRate: number;      // units/hr needed to achieve target
  glucoseTrend: 'rising' | 'stable' | 'falling';

  // Medication safety
  metforminContraindicated: boolean;
  sglt2DKARisk: boolean;
  glp1AspirationRisk: boolean;
  sulfonylureahHypoglycemiaRisk: boolean;

  prevHyperlogged: boolean;
  prevHypologged: boolean;
  prevSGLT2Logged: boolean;
  prevMetforminLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class PerioperativeGlucoseModel {
  static tick(inputs: PerioperativeGlucoseInputs = {}): PerioperativeGlucoseOutput {
    const events: string[] = [];
    let prevHyperlogged = !!inputs.prevHyperlogged;
    let prevHypologged = !!inputs.prevHypologged;
    let prevSGLT2Logged = !!inputs.prevSGLT2Logged;
    let prevMetforminLogged = !!inputs.prevMetforminLogged;

    const glucose = clamp(safeNumber(inputs.currentGlucoseMgDl, 100), 20, 700);
    const prevGlucose = clamp(safeNumber(inputs.previousGlucose, glucose), 20, 700);
    const insulinCe = clamp(safeNumber(inputs.insulinCe, 0), 0, 20);
    const metforminActive = !!inputs.metforminActive;
    const sglt2Active = !!inputs.sglt2Active;
    const glp1Active = !!inputs.glp1Active;
    const sulfonylureaCe = clamp(safeNumber(inputs.sulfonylureaCe, 0), 0, 5);
    const steroidCe = clamp(safeNumber(inputs.steroidCe, 0), 0, 10);
    const dextroseRate = clamp(safeNumber(inputs.dextrosInfusionRate, 0), 0, 500);
    const isDiabetic = !!inputs.isDiabetic;
    const isICU = !!inputs.isInICU;
    const isMajorSurgery = !!inputs.isMajorSurgery;

    // Target range based on clinical context
    const targetRange: [number, number] = isICU ? [140, 180] : isMajorSurgery ? [140, 180] : [100, 180];

    const isHyperglycemic = glucose > 180;
    const isHypoglycemic = glucose < 70;
    const isCriticallyLow = glucose < 54;
    const inTargetRange = glucose >= targetRange[0] && glucose <= targetRange[1];

    const glucoseDelta = glucose - prevGlucose;
    const glucoseTrend: 'rising' | 'stable' | 'falling' =
      glucoseDelta > 15 ? 'rising' : glucoseDelta < -15 ? 'falling' : 'stable';

    // Insulin infusion rate estimate (units/hr)
    // Rough: excess glucose above target × 0.02 units/hr per mg/dL above target
    const glucoseExcess = Math.max(0, glucose - targetRange[1]);
    const insulinInfusionRate = parseFloat(Math.min(10, glucoseExcess * 0.02).toFixed(1));

    // Medication safety checks
    const metforminContraindicated = metforminActive && (
      inputs.hasRenalInsufficiency || isICU || isMajorSurgery
    );
    const sglt2DKARisk = sglt2Active;
    const glp1AspirationRisk = glp1Active;
    const sulfonylureahHypoglycemiaRisk = sulfonylureaCe > 0 && glucose < 80;

    // Events
    if (isHyperglycemic && glucose > 250 && !prevHyperlogged) {
      events.push(
        `⚠️ PERIOPERATIVE HYPERGLYCEMIA: Glucose ${glucose.toFixed(0)} mg/dL (target 140-180 mg/dL). Current contributors: ${steroidCe > 0 ? 'Corticosteroids (common cause); ' : ''}${dextroseRate > 0 ? `Dextrose infusion ${dextroseRate.toFixed(0)} mL/hr; ` : ''}Surgical stress response. MANAGEMENT: (1) Switch dextrose-containing fluids to NS if possible; (2) Insulin infusion: ~${insulinInfusionRate.toFixed(1)} units/hr to reach target; (3) Check glucose q1-2h; (4) AVOID tight control (<140 mg/dL) — NICE-SUGAR trial showed INCREASED MORTALITY with intensive control; (5) Target 140-180 mg/dL for ICU/major surgery.`,
      );
      prevHyperlogged = true;
    }
    if (glucose < 200) prevHyperlogged = false;

    if (isHypoglycemic && !prevHypologged) {
      const severity = isCriticallyLow ? 'CRITICAL' : 'MODERATE';
      events.push(
        `🚨 ${severity} HYPOGLYCEMIA: Glucose ${glucose.toFixed(0)} mg/dL. ${isCriticallyLow ? 'IMMEDIATE TREATMENT REQUIRED' : 'Treatment needed'}. IV ACCESS REQUIRED: D50W 50 mL IV bolus (25g dextrose) → repeat in 15 min if < 70 mg/dL. If no IV access: glucagon 1 mg IM/SC. ANESTHESIA NOTE: Hypoglycemia is MASKED under general anesthesia (no symptoms — sweating, tachycardia, consciousness changes absent). Monitor glucose intraoperatively in ALL diabetics on insulin. CAUSES: ${sulfonylureaCe > 0 ? 'Sulfonylurea (NPO + drug = high risk); ' : ''}${insulinCe > 0 ? 'Excess insulin; ' : ''}Prolonged NPO.`,
      );
      prevHypologged = true;
    }
    if (!isHypoglycemic) prevHypologged = false;

    if (sglt2Active && !prevSGLT2Logged) {
      events.push(
        `⚠️ SGLT-2 INHIBITOR CONCERN: Patient on SGLT-2 inhibitor (empagliflozin/canagliflozin/dapagliflozin). Risk of EUGLYCEMIC DKA — anion-gap metabolic acidosis with NORMAL or near-normal blood glucose (< 250 mg/dL). SHOULD BE HELD ≥3 DAYS before major surgery. Signs: AG metabolic acidosis, ketonuria, but glucose appears normal → DIAGNOSIS MISSED if only checking glucose. CHECK: venous blood gas (pH/HCO3), urine/serum ketones. TREATMENT if present: IV dextrose (paradoxically, despite normal glucose), insulin infusion, IV fluids. Risk triggers: fasting (perioperative NPO), acute illness, surgery, contrast exposure.`,
      );
      prevSGLT2Logged = true;
    }

    if (metforminContraindicated && !prevMetforminLogged) {
      events.push(
        `⚠️ METFORMIN SAFETY: Metformin should be HELD perioperatively (24-48h before major surgery and contrast procedures). Risk: LACTIC ACIDOSIS if AKI develops (metformin is renally excreted; AKI → accumulation → biguanide blocks mitochondrial complex I → lactic acidosis). Risk factors: AKI, IV contrast, major surgery with hemodynamic instability. Generally SAFE for minor surgery with normal renal function. Can resume 48h post-surgery when adequate oral intake and renal function confirmed (creatinine baseline).`,
      );
      prevMetforminLogged = true;
    }

    return {
      currentGlucose: glucose,
      isHyperglycemic,
      isHypoglycemic,
      isCriticallyLow,
      targetRange,
      inTargetRange,
      insulinInfusionRate,
      glucoseTrend,
      metforminContraindicated,
      sglt2DKARisk,
      glp1AspirationRisk,
      sulfonylureahHypoglycemiaRisk,
      prevHyperlogged,
      prevHypologged,
      prevSGLT2Logged,
      prevMetforminLogged,
      events,
    };
  }
}
