/**
 * Malnutrition, Frailty, and Obesity Physiology Model
 *
 * These three body composition/metabolic states profoundly affect perioperative outcomes
 * and anesthetic management in different ways.
 *
 * =========================================================================
 * A. MALNUTRITION / NUTRITIONAL DEFICIENCY
 * =========================================================================
 * Prevalence: 30-50% of hospitalized surgical patients are malnourished.
 * The MUST (Malnutrition Universal Screening Tool) and SGA (Subjective Global Assessment)
 * are standard tools. NOT just "thin" — malnutrition includes protein deficiency with
 * normal or high BMI (sarcopenic obesity).
 *
 * PERIOPERATIVE IMPLICATIONS:
 * 1. PROTEIN DEPLETION: Reduced serum albumin (<3.5 g/dL) → reduced drug protein
 *    binding → higher free drug fractions → INCREASED DRUG SENSITIVITY (same dose = more effect).
 *    Propofol, midazolam, lidocaine: highly protein-bound → increased free fraction in malnutrition.
 * 2. REDUCED MUSCLE MASS (SARCOPENIA): Reduced neuromuscular reserve → prolonged NMB
 *    sensitivity → slower NMB recovery, higher residual blockade risk. Reduced respiratory
 *    muscle strength → higher extubation failure risk.
 * 3. WOUND HEALING: Protein deficiency → poor healing → infection risk.
 * 4. IMMUNE DYSFUNCTION: T-cell impairment → higher surgical site infection.
 * 5. MICRONUTRIENT DEFICIENCIES: Iron (anemia), B12/folate, Vitamin C, Zinc → impaired
 *    coagulation, wound healing, immune function.
 *
 * REFEEDING SYNDROME (critical perioperative concern):
 * After prolonged starvation, aggressive nutritional support → rapid glucose uptake →
 * intracellular phosphate shift → severe HYPOPHOSPHATEMIA → respiratory failure,
 * cardiac failure, seizures. Prevent by: starting nutrition slowly, phosphate repletion.
 *
 * =========================================================================
 * B. FRAILTY
 * =========================================================================
 * Frailty = syndrome of decreased physiologic reserve → vulnerability to stressors.
 * Clinical Frailty Scale (CFS) 1-9 or Fried phenotype (5 criteria):
 *   1. Unintentional weight loss (> 10 lb/year)
 *   2. Exhaustion (self-reported)
 *   3. Grip strength weakness (< 20th percentile for sex/BMI)
 *   4. Slow gait speed (< 1 m/s)
 *   5. Low physical activity (< 383 kcal/week for men, < 270 for women)
 * Frail = ≥ 3 criteria. Pre-frail = 1-2. Robust = 0.
 *
 * SURGICAL RISK: Frailty independently predicts:
 * - 3-5× higher 30-day mortality
 * - 2-3× higher major morbidity (pneumonia, AKI, delirium, prolonged LOS)
 * - Non-home discharge (SNF, rehab facility)
 *
 * ANESTHESIA IMPLICATIONS:
 * - Reduced physiologic reserve → impaired compensation for hemodynamic perturbations
 * - High delirium risk (CAM-based)
 * - Reduced MAC: frail elderly may need 30-50% less anesthetic
 * - Prolonged PACU stay → need extra monitoring
 * - PREHABILITATION: 4-6 weeks of supervised exercise + nutrition before elective surgery
 *   reduces complications by ~40% in frail patients
 *
 * =========================================================================
 * C. MORBID OBESITY (BMI > 40)
 * =========================================================================
 * Beyond what's already in RespiratoryEngine (compliance reduction) and PKPDEngine (adipose Vd):
 *
 * 1. PHARMACOKINETICS: Different dosing weights for different drugs:
 *    - Hydrophilic drugs (aminoglycosides, vancomycin): use ACTUAL body weight (TBW)
 *    - Lipophilic drugs (propofol, benzodiazepines): use LBW (lean body weight)
 *    - Succinylcholine: use TBW (upregulated pseudocholinesterase)
 *    - NDMRs (rocuronium, vecuronium): use IBW (lean mass determines effect)
 *    - Fentanyl: use LBW or IBW
 *
 * 2. AIRWAY: Technically difficult (obesity, redundant soft tissue, limited neck mobility)
 *    Video laryngoscopy recommended as first line.
 *    Pre-oxygenation: consider 25° head-up position (improves FRC).
 *
 * 3. ASPIRATION RISK: ↑intra-abdominal pressure → elevated LES pressure but also ↑gastric
 *    pressure → net: higher aspiration risk. RSI.
 *
 * 4. CARDIOVASCULAR: Obesity cardiomyopathy (concentric LVH), pulmonary HTN.
 *
 * 5. OSA: (Already modeled via sleep apnea/OSA physiology in pcrit/dilator muscle tone)
 *
 * Sources: Cederholm T, JPEN 2017 (GLIM criteria); Fried LP, J Gerontol 2001;
 * Søreide E, Anesthesiology 2019; Miller's 9th Ed Ch 17 (Obesity).
 */

export interface MalnutritionFrailtyInputs {
  // Malnutrition
  albumin?: number;              // g/dL (normal 3.5-5.0; malnutrition < 3.5)
  prealbuminGdL?: number;        // g/dL (normal 0.20-0.40; more sensitive than albumin)
  isStarved?: boolean;           // NPO > 12h or chronic caloric restriction
  starvationDays?: number;       // days of suboptimal intake
  bmi?: number;                  // kg/m²

  // Frailty
  hasFrailty?: boolean;          // clinical frailty (CFS 5+ or Fried ≥ 3)
  frailtyScore?: number;         // 0-9 (CFS) or 0-5 (Fried)
  ageYears?: number;

  // Refeeding
  aggressiveNutritionStarted?: boolean;  // rapid refeeding → risk
  phosphorusLevel?: number;      // mg/dL (normal 2.5-4.5; refeeding → < 1.5)

  // Obesity
  isObese?: boolean;             // BMI > 30
  isMorbidlyObese?: boolean;     // BMI > 40
  weightKg?: number;
  ibwKg?: number;

  // Event guards
  prevMalnutritionLogged?: boolean;
  prevRefeedingLogged?: boolean;
  prevFrailtyLogged?: boolean;
}

export interface MalnutritionFrailtyOutput {
  // Malnutrition
  malnutritionSeverity: number;         // 0-1
  albumin: number;
  drugSensitivityMultiplier: number;    // multiply drug effect by this (high albumin = less free drug)
  nmjSensitivityIncrease: number;       // 0-0.5 (more NMB effect per dose)
  refeedingSyndromeRisk: number;        // 0-1

  // Frailty
  frailtyActive: boolean;
  frailtyMacReduction: number;          // fraction MAC reduction (0-0.4)
  frailtyDeliriumRiskContrib: number;   // 0-0.4 (adds to delirium score)
  frailtyVentilatorDependenceRisk: number; // 0-1

  // Obesity-specific pharmacokinetics
  succinylcholineDoseFactor: number;    // multiply by (TBW/IBW) ratio
  ndmrDoseFactor: number;               // use IBW (not TBW)
  propofolDoseFactor: number;           // use LBW

  prevMalnutritionLogged: boolean;
  prevRefeedingLogged: boolean;
  prevFrailtyLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class MalnutritionFrailtyModel {
  static tick(inputs: MalnutritionFrailtyInputs = {}): MalnutritionFrailtyOutput {
    const events: string[] = [];
    let prevMalnutritionLogged = !!inputs.prevMalnutritionLogged;
    let prevRefeedingLogged = !!inputs.prevRefeedingLogged;
    let prevFrailtyLogged = !!inputs.prevFrailtyLogged;

    const albumin = clamp(safeNumber(inputs.albumin, 4.0), 1.0, 6.0);
    const bmi = clamp(safeNumber(inputs.bmi, 25), 10, 80);
    const weightKg = clamp(safeNumber(inputs.weightKg, 70), 10, 300);
    const ibwKg = clamp(safeNumber(inputs.ibwKg, 70), 20, 180);
    const phosphorus = clamp(safeNumber(inputs.phosphorusLevel, 3.5), 0.5, 10);
    const starvationDays = clamp(safeNumber(inputs.starvationDays, 0), 0, 60);
    const ageYears = clamp(safeNumber(inputs.ageYears, 50), 0, 110);

    // ===========================
    // MALNUTRITION
    // ===========================
    const malnutritionSeverity = albumin < 3.5
      ? clamp((3.5 - albumin) / 2.0, 0, 1.0) : 0;

    // Low albumin → more free drug → increased sensitivity
    // Normal protein binding correction: fraction bound = 0.9 for propofol (albumin-dependent)
    // If albumin drops from 4.0 to 2.0: effectively ~40% more free drug
    const drugSensitivityMultiplier = albumin < 3.5
      ? 1.0 + (3.5 - albumin) / 3.5 * 0.6 // up to 60% more sensitive
      : 1.0;

    // NMB sensitivity: reduced muscle mass + impaired neuromuscular reserve
    const nmjSensitivityIncrease = malnutritionSeverity * 0.4;

    // Refeeding syndrome risk
    const aggressiveNutrition = !!inputs.aggressiveNutritionStarted;
    const refeedingRisk = (starvationDays > 5 || albumin < 3.0) && aggressiveNutrition
      ? clamp(starvationDays / 10, 0.2, 1.0) : 0;

    if (malnutritionSeverity > 0.3 && !prevMalnutritionLogged) {
      events.push(
        `⚠️ MALNUTRITION (Albumin ${albumin.toFixed(1)} g/dL): Drug protein binding reduced → higher FREE DRUG concentrations → increased sensitivity (especially propofol, midazolam, lidocaine — all highly protein-bound). Use LOWER INITIAL DOSES (30-50% reduction for propofol loading, titrate carefully). Reduced respiratory muscle strength → higher extubation failure risk (MIP < -20 cmH2O threshold; PIV check before extubation). Reduced NMB dose needed; prolonged recovery. Nutritional support: optimize preoperatively if possible (oral/NG/TPN); avoid rapid refeeding (hypophosphatemia risk).`,
      );
      prevMalnutritionLogged = true;
    }

    if (refeedingRisk > 0.3 && phosphorus < 1.5 && !prevRefeedingLogged) {
      events.push(
        `🚨 REFEEDING SYNDROME: Phosphorus ${phosphorus.toFixed(1)} mg/dL (critical: < 1.5 mg/dL). After prolonged starvation (${starvationDays.toFixed(0)} days), aggressive nutrition restarted → glucose surge → insulin → intracellular phosphate shift → severe HYPOPHOSPHATEMIA → respiratory failure (diaphragm weakness), cardiac arrhythmias (↓myocardial contractility), seizures, hemolysis. TREATMENT: (1) SLOW DOWN nutrition to 25-50% of target caloric intake; (2) Phosphate replacement: 0.1-0.2 mmol/kg IV over 12-24h; (3) Potassium/Magnesium monitoring (also shift intracellularly); (4) Thiamine 200-300 mg IV before glucose (Wernicke's encephalopathy risk in prolonged starvation).`,
      );
      prevRefeedingLogged = true;
    }

    // ===========================
    // FRAILTY
    // ===========================
    const hasFrailty = !!inputs.hasFrailty;
    const frailtyScore = clamp(safeNumber(inputs.frailtyScore, 0), 0, 9);

    const frailtyActive = hasFrailty || frailtyScore >= 3;
    const frailtySeverity = frailtyScore >= 6 ? 1.0 : frailtyScore >= 4 ? 0.7 : frailtyScore >= 3 ? 0.5 : hasFrailty ? 0.5 : 0;

    // MAC reduction in frailty: frail elderly need 30-50% less anesthetic
    const frailtyMacReduction = frailtyActive ? clamp(frailtySeverity * 0.45, 0, 0.45) : 0;

    // Delirium contribution
    const frailtyDeliriumRiskContrib = frailtyActive ? clamp(frailtySeverity * 0.35, 0, 0.35) : 0;

    // Ventilator dependence risk (reduced respiratory reserve)
    const frailtyVentilatorDependenceRisk = frailtyActive && ageYears > 70
      ? clamp(frailtySeverity * 0.5, 0, 0.5) : 0;

    if (frailtyActive && !prevFrailtyLogged) {
      events.push(
        `⚠️ CLINICAL FRAILTY: Reduced physiologic reserve. ANESTHETIC IMPLICATIONS: (1) REDUCE MAC by 30-50% (frail elderly have lower anesthetic requirements — neurotransmitter density changes + blood-brain barrier changes); (2) HIGH DELIRIUM RISK — avoid benzodiazepines, minimize opioids, maintain sleep-wake cycle; (3) Prolonged NMB recovery expected — TOF monitoring mandatory, reverse at TOFR > 0.9; (4) Higher extubation failure risk — ensure full awakening and adequate respiratory strength before extubation; (5) CONSIDER PREHABILITATION for elective cases (4-6 weeks exercise + nutrition reduces complications 40%); (6) Family presence in PACU when possible (reduces delirium).`,
      );
      prevFrailtyLogged = true;
    }

    // ===========================
    // OBESITY PK DOSING FACTORS
    // ===========================
    const tbwToIbwRatio = ibwKg > 0 ? clamp(weightKg / ibwKg, 1.0, 4.0) : 1.0;
    const isMorbidlyObese = !!inputs.isMorbidlyObese || bmi > 40;

    // Succinylcholine: use TBW (upregulated pseudocholinesterase)
    const succinylcholineDoseFactor = isMorbidlyObese ? tbwToIbwRatio : 1.0;

    // NDMRs: use IBW (not TBW) → standard dose
    const ndmrDoseFactor = 1.0; // IBW-based dosing doesn't change the factor relative to IBW

    // Propofol: use LBW (~IBW × 1.1 for loading, then TBW for maintenance)
    const propofolDoseFactor = isMorbidlyObese ? 0.8 : 1.0; // slightly less than TBW-based

    return {
      malnutritionSeverity: parseFloat(malnutritionSeverity.toFixed(4)),
      albumin: parseFloat(albumin.toFixed(2)),
      drugSensitivityMultiplier: parseFloat(drugSensitivityMultiplier.toFixed(3)),
      nmjSensitivityIncrease: parseFloat(nmjSensitivityIncrease.toFixed(4)),
      refeedingSyndromeRisk: parseFloat(refeedingRisk.toFixed(4)),
      frailtyActive,
      frailtyMacReduction: parseFloat(frailtyMacReduction.toFixed(4)),
      frailtyDeliriumRiskContrib: parseFloat(frailtyDeliriumRiskContrib.toFixed(4)),
      frailtyVentilatorDependenceRisk: parseFloat(frailtyVentilatorDependenceRisk.toFixed(4)),
      succinylcholineDoseFactor: parseFloat(succinylcholineDoseFactor.toFixed(3)),
      ndmrDoseFactor,
      propofolDoseFactor: parseFloat(propofolDoseFactor.toFixed(3)),
      prevMalnutritionLogged,
      prevRefeedingLogged,
      prevFrailtyLogged,
      events,
    };
  }
}
