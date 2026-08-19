/**
 * Metabolic Equilibrium Model
 *
 * Several important metabolic scenarios not yet covered:
 *
 * A. ADRENAL CRISIS / PERIOPERATIVE STRESS-DOSE STEROIDS
 * B. DIABETIC KETOACIDOSIS (DKA) — distinct from glucose management
 * C. HYPERAMMONEMIA / HEPATIC ENCEPHALOPATHY
 * D. SYNDROME OF INAPPROPRIATE ADH (SIADH)
 * E. DIABETES INSIPIDUS (DI)
 *
 * =========================================================================
 * A. ADRENAL CRISIS + STRESS-DOSE STEROIDS
 * =========================================================================
 * Indications for perioperative stress-dose steroids:
 * - Chronic steroid use ≥ 5 mg/day prednisone-equivalent for ≥ 3 weeks
 *   (or ≥ 20 mg/day × 3 weeks within last year)
 * - Adrenal insufficiency (primary AI, Addison's disease)
 * - HPA axis suppression suspected
 *
 * Dose schema (based on surgical stress level):
 * - Minor surgery: nothing extra (just take home dose)
 * - Moderate surgery: hydrocortisone 50 mg IV at induction + 25 mg q8h × 24h
 * - Major surgery: hydrocortisone 100 mg at induction + 50 mg q8h × 24-48h
 *
 * ADRENAL CRISIS PRESENTATION:
 * - Refractory hypotension despite vasopressors
 * - Nausea, vomiting, abdominal pain
 * - Hyponatremia, hyperkalemia (Addison's), hypoglycemia
 * - DIAGNOSIS OF EXCLUSION in vasopressor-refractory shock
 * - TREATMENT: Hydrocortisone 100 mg IV STAT → 200 mg/day infusion
 *
 * =========================================================================
 * B. DIABETIC KETOACIDOSIS (DKA)
 * =========================================================================
 * DKA = insulin deficiency + glucagon excess → ketone production + hyperglycemia.
 * Triad: hyperglycemia (>250 mg/dL), anion gap acidosis (pH < 7.3), ketonuria/ketonemia.
 * Insulin deficiency → lipolysis → FFA → ketogenesis → beta-hydroxybutyrate + acetoacetate.
 *
 * Note: EUGLYCEMIC DKA (glucose < 250) occurs with SGLT-2 inhibitors (already modeled).
 *
 * Treatment:
 * 1. IV fluids (NS first, then LR when Na corrects)
 * 2. Insulin infusion: 0.1 units/kg/hr (AFTER K+ confirmed > 3.5 — insulin shifts K+ in)
 * 3. Potassium replacement (DKA depletes total body K+ despite initial hyperkalemia)
 * 4. Glucose replacement when glucose < 200 (add D5 to keep glucose 150-250 until AG closes)
 *
 * =========================================================================
 * C. HEPATIC ENCEPHALOPATHY / HYPERAMMONEMIA
 * =========================================================================
 * Hepatic encephalopathy (HE): impaired consciousness from hepatic failure.
 * Mechanism: Liver failure → impaired ammonia detoxification → NH3 crosses BBB →
 *   astrocyte swelling → cerebral edema → raised ICP (acute liver failure).
 * Grades: Grade I (subtle personality change) → Grade IV (coma).
 *
 * CRITICALLY IMPORTANT: Acute liver failure grade III-IV → RAISED ICP is the
 * leading cause of death! Mannitol and hypothermia are used for ICP management.
 *
 * Treatment:
 * 1. Lactulose: traps NH3 in gut (prevents absorption); also acidifies gut (binds NH3 as NH4+)
 * 2. Rifaximin: gut antibiotic (reduces NH3-producing bacteria)
 * 3. Protein restriction: reduced (NOT eliminated — causes sarcopenia)
 * 4. Zinc supplementation (cofactor for urea cycle enzymes)
 *
 * =========================================================================
 * D. SIADH / E. DIABETES INSIPIDUS
 * =========================================================================
 * SIADH: excess ADH → water retention → euvolemic hyponatremia.
 * Perioperative cause: opioids, surgery, N2O all increase ADH.
 * Treatment: fluid restriction (mild); hypertonic saline (severe/symptomatic).
 * (Already partially modeled in TumorLysisElectrolyteModel.ts)
 *
 * DIABETES INSIPIDUS: insufficient ADH → massive dilute urine.
 * Central DI: pituitary surgery, head trauma, neoplasm, cranial irradiation.
 * Nephrogenic DI: renal insensitivity to ADH (lithium, hypercalcemia).
 * Intraoperative: output > 3 mL/kg/hr with dilute urine (specific gravity < 1.005, Na > 145).
 * Treatment: DESMOPRESSIN (DDAVP) 1-4 mcg IV/SC (already in drug database).
 *
 * Sources: Coursin DB, NEJM 2002 (perioperative steroids); Kitabchi AE, Diabetes Care 2009 (DKA);
 * Blei AT, NEJM 1993 (hepatic encephalopathy); Miller's 9th Ed Ch 44 (endocrine/metabolic).
 */

export interface MetabolicEquilibriumInputs {
  weightKg?: number;
  // Adrenal crisis / stress steroids
  chronicSteroidUser?: boolean;
  prednisoneEquivalentMgPerDay?: number;
  isAdrenalCrisis?: boolean;
  hydroCortisoneCe?: number;
  surgicalStressLevel?: 'minor' | 'moderate' | 'major';

  // DKA
  isDKA?: boolean;
  currentGlucoseMgDl?: number;
  currentAnionGap?: number;         // mEq/L
  currentBicarbonate?: number;      // mEq/L
  currentKPlusDKA?: number;         // initial K+ in DKA (often HIGH despite total body depletion)
  insulinInfusionActive?: boolean;
  insulinCe?: number;

  // Hepatic encephalopathy
  hasHE?: boolean;
  heGrade?: 1 | 2 | 3 | 4;
  ammoniaMcgDl?: number;            // blood ammonia (normal < 40 mcg/dL)
  lactuloseCe?: number;
  rifaximinActive?: boolean;

  // DI
  hasDI?: boolean;
  diType?: 'central' | 'nephrogenic';
  urineOutputMlHrKg?: number;
  desmopressinCe?: number;

  // Current vitals
  currentNa?: number;
  currentMAP?: number;
  currentGlucose?: number;

  // Event guards
  prevAdrenalCrisisLogged?: boolean;
  prevDKALogged?: boolean;
  prevHELogged?: boolean;
  prevDILogged?: boolean;
}

export interface MetabolicEquilibriumOutput {
  // Adrenal
  stressDoseRequired: boolean;
  stressDoseRegimen: string;
  adrenalCrisisActive: boolean;
  adrenalHydrocortisoneEfficacy: number;

  // DKA
  dkaActive: boolean;
  dkaSeverity: number;              // 0-1
  dka_agClosed: boolean;           // anion gap closed (DKA resolution)
  dka_insulinSafe: boolean;        // K+ ≥ 3.5 before starting insulin
  dka_glucoseAdditionNeeded: boolean; // glucose < 200, add dextrose to prevent hypoglycemia

  // Hepatic encephalopathy
  heActive: boolean;
  heIcpContribution: number;       // elevated ICP from cerebral edema in ALF
  lactuloseLowersNH3: number;      // 0-1 treatment efficacy

  // Diabetes Insipidus
  diActive: boolean;
  desmopressinEfficacy: number;
  diFluidReplacement_mLHr: number; // replacement needed

  prevAdrenalCrisisLogged: boolean;
  prevDKALogged: boolean;
  prevHELogged: boolean;
  prevDILogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class MetabolicEquilibriumModel {
  static tick(inputs: MetabolicEquilibriumInputs = {}): MetabolicEquilibriumOutput {
    const events: string[] = [];
    let prevAdrenalCrisisLogged = !!inputs.prevAdrenalCrisisLogged;
    let prevDKALogged = !!inputs.prevDKALogged;
    let prevHELogged = !!inputs.prevHELogged;
    let prevDILogged = !!inputs.prevDILogged;

    // ===========================
    // ADRENAL CRISIS / STEROIDS
    // ===========================
    const chronicSteroid = !!inputs.chronicSteroidUser;
    const prednisoneEq = clamp(safeNumber(inputs.prednisoneEquivalentMgPerDay, 0), 0, 100);
    const surgicalStress = inputs.surgicalStressLevel || 'moderate';
    const isAdrenalCrisis = !!inputs.isAdrenalCrisis;
    const hydroCorCe = clamp(safeNumber(inputs.hydroCortisoneCe, 0), 0, 10);

    const stressDoseRequired = chronicSteroid && prednisoneEq >= 5;
    let stressDoseRegimen = 'No stress-dose steroids required';

    if (stressDoseRequired) {
      if (surgicalStress === 'major') {
        stressDoseRegimen = 'Hydrocortisone 100 mg IV at induction, then 50 mg q8h × 24-48h';
      } else if (surgicalStress === 'moderate') {
        stressDoseRegimen = 'Hydrocortisone 50 mg IV at induction, then 25 mg q8h × 24h';
      } else {
        stressDoseRegimen = 'Continue home dose only (minor procedure)';
      }
    }

    const adrenalHydrocortisoneEfficacy = hydroCorCe > 0
      ? clamp(hydroCorCe / (hydroCorCe + 0.5) * 0.90, 0, 0.90) : 0;

    if (isAdrenalCrisis && !prevAdrenalCrisisLogged) {
      events.push(
        `🚨 ADRENAL CRISIS: Refractory hypotension despite adequate fluid resuscitation and vasopressors — consider adrenal insufficiency. HIGH SUSPICION in: chronic steroid users, Addison's disease, pituitary surgery, bilateral adrenalectomy, prolonged sepsis. TREATMENT: HYDROCORTISONE 100 mg IV STAT → 200 mg/day infusion (50 mg q6h). Simultaneous: FLUDROCORTISONE 0.1 mg PO daily (mineralocorticoid replacement in primary AI). Do NOT wait for cortisol level to treat suspected adrenal crisis.`,
      );
      prevAdrenalCrisisLogged = true;
    }

    // ===========================
    // DKA
    // ===========================
    const isDKA = !!inputs.isDKA;
    const glucose = clamp(safeNumber(inputs.currentGlucoseMgDl, 100), 20, 700);
    const ag = clamp(safeNumber(inputs.currentAnionGap, 12), 5, 40);
    const hco3 = clamp(safeNumber(inputs.currentBicarbonate, 24), 2, 35);
    const kPlusDKA = clamp(safeNumber(inputs.currentKPlusDKA, 4.5), 1.5, 8.0);
    const insulinActive = !!inputs.insulinInfusionActive;
    const insulinCeVal = clamp(safeNumber(inputs.insulinCe, 0), 0, 20);

    const dkaSeverity = isDKA ? clamp((40 - hco3) / 22, 0, 1.0) : 0;
    const dka_agClosed = ag < 14;
    const dka_insulinSafe = kPlusDKA >= 3.5; // NEVER start insulin if K+ < 3.5
    const dka_glucoseAdditionNeeded = isDKA && glucose < 200 && insulinActive;

    if (isDKA && !prevDKALogged) {
      events.push(
        `🚨 DIABETIC KETOACIDOSIS: Glucose ${glucose.toFixed(0)} mg/dL, AG ${ag.toFixed(0)} mEq/L, HCO3 ${hco3.toFixed(0)} mEq/L. TREATMENT ORDER: (1) IV FLUIDS — NS 1-2L over 1h (correct hypovolemia first); (2) CHECK K+ before insulin — if K < 3.5, REPLACE K+ FIRST (insulin shifts K+ into cells → fatal hypokalemia if already low); (3) INSULIN 0.1 units/kg/hr IV when K+ ≥ 3.5; (4) When glucose < 200 → ADD DEXTROSE to fluids (switch to D5-NS or D5-0.45NS) to prevent hypoglycemia while continuing insulin until AG closed; (5) POTASSIUM: 20-40 mEq/hr in IV fluids once K+ known; (6) Goal: close anion gap (NOT just normalize glucose). DKA resolved only when AG < 14 mEq/L.`,
      );
      prevDKALogged = true;
    }

    // ===========================
    // HEPATIC ENCEPHALOPATHY
    // ===========================
    const hasHE = !!inputs.hasHE;
    const heGrade = inputs.heGrade || 1;
    const ammonia = clamp(safeNumber(inputs.ammoniaMcgDl, 30), 0, 500);
    const lactuloseCe = clamp(safeNumber(inputs.lactuloseCe, 0), 0, 5);
    const rifaximin = !!inputs.rifaximinActive;

    const lactuloseLowersNH3 = lactuloseCe > 0
      ? clamp(lactuloseCe / (lactuloseCe + 0.5) * 0.5 + (rifaximin ? 0.3 : 0), 0, 0.7) : rifaximin ? 0.3 : 0;

    // ICP contribution from HE (grade III-IV → cerebral edema in ALF)
    const heIcpContribution = hasHE && heGrade >= 3 ? clamp((heGrade - 2) / 2 * 15, 0, 20) : 0;

    if (hasHE && heGrade >= 3 && !prevHELogged) {
      events.push(
        `🚨 HEPATIC ENCEPHALOPATHY GRADE ${heGrade}: Ammonia ${ammonia.toFixed(0)} mcg/dL (normal < 40). Grade III-IV → RAISED ICP FROM CEREBRAL EDEMA (astrocyte swelling from NH3). MANAGEMENT: (1) Lactulose 20-30g PO/NG q4-6h (target 2-3 soft stools/day); (2) Rifaximin 550 mg BID (gut antibiotic); (3) ICP MONITORING in grade III-IV (mannitol 0.5-1 g/kg for ICP > 20 mmHg; maintain CPP > 50 mmHg); (4) Mild hypothermia (32-35°C) for ICP refractory to mannitol; (5) Zinc replacement; (6) Liver transplant evaluation. AVOID: benzodiazepines (worsen HE), opioids (accumulate), high-protein diet.`,
      );
      prevHELogged = true;
    }

    // ===========================
    // DIABETES INSIPIDUS
    // ===========================
    const hasDI = !!inputs.hasDI;
    const diType = inputs.diType || 'central';
    const uoMlHrKg = clamp(safeNumber(inputs.urineOutputMlHrKg, 0.5), 0, 20);
    const desmopressinCeVal = clamp(safeNumber(inputs.desmopressinCe, 0), 0, 5);

    const desmopressinEfficacy = hasDI && diType === 'central' && desmopressinCeVal > 0
      ? clamp(desmopressinCeVal / (desmopressinCeVal + 0.3) * 0.90, 0, 0.90)
      : 0; // nephrogenic DI: desmopressin NOT effective

    const diFluidReplacement_mLHr = hasDI ? Math.max(0, (uoMlHrKg - 1.0) * (inputs.weightKg || 70)) : 0;

    if (hasDI && uoMlHrKg > 3 && !prevDILogged) {
      const treatment = diType === 'central'
        ? 'DESMOPRESSIN (DDAVP) 1-4 mcg IV/SC — highly effective for central DI'
        : 'THIAZIDE DIURETICS (paradoxical) + LOW SODIUM DIET + NSAIDs (for nephrogenic DI — DESMOPRESSIN INEFFECTIVE)';
      events.push(
        `⚠️ DIABETES INSIPIDUS (${diType.toUpperCase()}): Urine output ${uoMlHrKg.toFixed(1)} mL/kg/hr (normal 0.5-1.0). CRITERIA: UO > 3 mL/kg/hr + dilute urine (SG < 1.005, osmolality < 200 mOsm/kg) + hypernatremia. CAUSES: ${diType === 'central' ? 'Pituitary surgery, head trauma, craniopharyngioma, hypoxic brain injury' : 'Lithium toxicity, hypercalcemia, CKD, genetic'}. TREATMENT: ${treatment}. Replace fluid losses (electrolyte-free water or D5W to match urine output). Monitor Na q4h.`,
      );
      prevDILogged = true;
    }

    return {
      stressDoseRequired,
      stressDoseRegimen,
      adrenalCrisisActive: isAdrenalCrisis,
      adrenalHydrocortisoneEfficacy: parseFloat(adrenalHydrocortisoneEfficacy.toFixed(4)),
      dkaActive: isDKA,
      dkaSeverity: parseFloat(dkaSeverity.toFixed(4)),
      dka_agClosed,
      dka_insulinSafe,
      dka_glucoseAdditionNeeded,
      heActive: hasHE,
      heIcpContribution: parseFloat(heIcpContribution.toFixed(1)),
      lactuloseLowersNH3: parseFloat(lactuloseLowersNH3.toFixed(4)),
      diActive: hasDI,
      desmopressinEfficacy: parseFloat(desmopressinEfficacy.toFixed(4)),
      diFluidReplacement_mLHr: parseFloat(diFluidReplacement_mLHr.toFixed(1)),
      prevAdrenalCrisisLogged,
      prevDKALogged,
      prevHELogged,
      prevDILogged,
      events,
    };
  }
}
