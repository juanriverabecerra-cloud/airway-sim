/**
 * Acute Kidney Injury (AKI) Perioperative Model
 *
 * The existing RenalEngine.ts models real-time GFR and AKI flag.
 * This model adds KDIGO staging, specific perioperative AKI prevention strategies,
 * and management of established AKI.
 *
 * === KDIGO AKI CRITERIA (2012) ===
 * Any of:
 * - Creatinine rise ≥ 0.3 mg/dL within 48h
 * - Creatinine × 1.5 from baseline within 7 days
 * - Urine output < 0.5 mL/kg/hr for ≥ 6h
 *
 * STAGING:
 * Stage 1: Creatinine × 1.5-1.9 OR UO < 0.5 mL/kg/hr × 6-12h
 * Stage 2: Creatinine × 2.0-2.9 OR UO < 0.5 mL/kg/hr × ≥ 12h
 * Stage 3: Creatinine × 3.0 OR rise to ≥ 4.0 mg/dL OR RRT started OR UO < 0.3 mL/kg/hr × ≥ 24h
 *
 * === PERIOPERATIVE AKI RISK FACTORS ===
 * Patient: baseline CKD, diabetes, heart failure, sepsis, hypovolemia, age > 65
 * Surgery: cardiac bypass (CPB-AKI), major vascular, liver transplant, prolonged case
 * Drug: NSAIDs (prostaglandin-dependent renal blood flow reduction), ACE inhibitors,
 *       gentamicin, contrast, cisplatin
 *
 * === SPECIFIC AKI SCENARIOS ===
 *
 * CONTRAST-INDUCED AKI (CI-AKI):
 * Osmotic load + tubular toxicity from iodinated contrast.
 * Prevention: IV hydration (NS 1 mL/kg/hr × 12h before + after), N-acetylcysteine
 * (controversial), minimize contrast dose, avoid concurrent nephrotoxins.
 * Risk: GFR < 60 + diabetes = highest risk.
 * NOTE: Gadolinium for MRI is safer but can cause NSF (nephrogenic systemic fibrosis) at GFR < 30.
 *
 * CARDIAC SURGERY-ASSOCIATED AKI (CSA-AKI):
 * Incidence: 30-40% after cardiac surgery (30% requiring RRT).
 * Mechanism: non-pulsatile flow, hemodilution, inflammation, emboli, ischemia-reperfusion.
 * Prevention: MAP ≥ 65-70 on bypass, avoid hemodilution (Hb < 7 on CPB), minimize
 * cardioplegia volume, shorter CPB time.
 *
 * HEPATORENAL SYNDROME (HRS):
 * Renal failure from severe liver disease + portal hypertension.
 * Type 1: rapid, often triggered by SBP or major surgery; prognosis poor without OLT.
 * Type 2: slower, more stable; diuretic-refractory ascites.
 * Treatment: terlipressin + albumin (not available in US — use vasopressin/NE + albumin).
 *
 * Sources: Kidney Disease, Improving Global Outcomes (KDIGO), Kidney International 2012;
 * Bellomo R, Intensive Care Med 2012; Mehta RL, Critical Care 2007;
 * Miller's 9th Ed Ch 46 (Renal Disease Perioperative Management).
 */

export interface AKIInputs {
  // Creatinine tracking
  baselineCreatinine?: number;      // mg/dL
  currentCreatinine?: number;       // mg/dL
  creatinine48hAgo?: number;        // for KDIGO 48h criterion

  // Urine output
  urineOutputMlHrKg?: number;       // mL/kg/hr
  urineOutputDuration?: number;     // hours of low UO

  // AKI context
  isPostcardiacSurgery?: boolean;   // CSA-AKI context
  isContrast?: boolean;             // contrast exposure
  contrastVolumeMl?: number;
  isHRS?: boolean;                  // hepatorenal syndrome
  hrsType?: 1 | 2;

  // Patient risk
  gfr?: number;                     // baseline GFR
  isDiabetic?: boolean;
  hasCHF?: boolean;

  // Treatment
  furosemideCe?: number;
  terlipressinCe?: number;          // for HRS (not US-available)
  albumin_HRS_Ce?: number;          // for HRS treatment
  isRRTActive?: boolean;            // renal replacement therapy

  // Nephrotoxin exposure
  nstaidCe?: number;                // NSAIDs → reduce renal blood flow
  aminoglycosideCe?: number;        // direct nephrotoxin
  vancomycinCe?: number;            // nephrotoxic (especially with aminoglycosides)

  // Event guards
  prevAKILogged?: boolean;
  prevHRSLogged?: boolean;
  prevContrastAKILogged?: boolean;
}

export interface AKIOutput {
  // AKI staging
  kdigo_stage: 0 | 1 | 2 | 3;
  akiCriterionMet: boolean;
  creatinineRatio: number;          // current/baseline

  // UO assessment
  uoInadequate: boolean;
  uoStage: 0 | 1 | 2 | 3;

  // Management
  furosemideBenefit: number;        // 0-1 in AKI context (mostly for fluid overload)
  rrIndicationMet: boolean;         // stage 3 or hyperK/fluid/acidosis-refractory

  // Nephrotoxin warning
  nephrotoxinBurden: number;        // 0-1

  // HRS
  hrsActive: boolean;
  terlipressinEfficacy: number;     // 0-1

  prevAKILogged: boolean;
  prevHRSLogged: boolean;
  prevContrastAKILogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AcuteKidneyInjuryModel {
  static tick(inputs: AKIInputs = {}): AKIOutput {
    const events: string[] = [];
    let prevAKILogged = !!inputs.prevAKILogged;
    let prevHRSLogged = !!inputs.prevHRSLogged;
    let prevContrastAKILogged = !!inputs.prevContrastAKILogged;

    const baselineCr = clamp(safeNumber(inputs.baselineCreatinine, 1.0), 0.3, 15);
    const currentCr = clamp(safeNumber(inputs.currentCreatinine, 1.0), 0.3, 15);
    const cr48h = clamp(safeNumber(inputs.creatinine48hAgo, currentCr), 0.3, 15);
    const uoRate = clamp(safeNumber(inputs.urineOutputMlHrKg, 0.8), 0, 10);
    const uoDuration = clamp(safeNumber(inputs.urineOutputDuration, 0), 0, 72);
    const gfr = clamp(safeNumber(inputs.gfr, 90), 0, 200);
    const furosemideCe = clamp(safeNumber(inputs.furosemideCe, 0), 0, 5);
    const terlipressinCe = clamp(safeNumber(inputs.terlipressinCe, 0), 0, 5);
    const albumin_Ce = clamp(safeNumber(inputs.albumin_HRS_Ce, 0), 0, 5);
    const isRRT = !!inputs.isRRTActive;
    const nsaidCe = clamp(safeNumber(inputs.nstaidCe, 0), 0, 5);
    const aminoCe = clamp(safeNumber(inputs.aminoglycosideCe, 0), 0, 5);
    const vancomycinCe = clamp(safeNumber(inputs.vancomycinCe, 0), 0, 5);

    // ===========================
    // KDIGO STAGING
    // ===========================
    const creatinineRatio = currentCr / baselineCr;
    const cr48hRise = currentCr - cr48h;
    const akiCriterionMet = creatinineRatio >= 1.5 || cr48hRise >= 0.3;

    let kdigo_stage: 0 | 1 | 2 | 3;
    if (isRRT || creatinineRatio >= 3.0 || currentCr >= 4.0) {
      kdigo_stage = 3;
    } else if (creatinineRatio >= 2.0) {
      kdigo_stage = 2;
    } else if (creatinineRatio >= 1.5 || cr48hRise >= 0.3) {
      kdigo_stage = 1;
    } else {
      kdigo_stage = 0;
    }

    // UO staging
    let uoStage: 0 | 1 | 2 | 3;
    const uoInadequate = uoRate < 0.5;
    if (uoRate < 0.3 && uoDuration >= 24) uoStage = 3;
    else if (uoRate < 0.5 && uoDuration >= 12) uoStage = 2;
    else if (uoRate < 0.5 && uoDuration >= 6) uoStage = 1;
    else uoStage = 0;

    // Use max of creatinine and UO stage
    const finalStage = Math.max(kdigo_stage, uoStage) as 0 | 1 | 2 | 3;

    // ===========================
    // NEPHROTOXIN BURDEN
    // ===========================
    const nephrotoxinBurden = clamp(
      (nsaidCe > 0 ? 0.4 : 0)
      + (aminoCe > 0 ? 0.5 : 0)
      + (vancomycinCe > 0 && aminoCe > 0 ? 0.3 : vancomycinCe > 0 ? 0.2 : 0)
      + (!!inputs.isContrast && gfr < 60 ? 0.4 : 0),
      0, 1.0,
    );

    const rrIndicationMet = finalStage === 3; // formal indication when stage 3

    const furosemideBenefit = furosemideCe > 0 && uoInadequate
      ? clamp(furosemideCe / (furosemideCe + 0.5) * 0.5, 0, 0.5) : 0;

    if (akiCriterionMet && kdigo_stage >= 1 && !prevAKILogged) {
      events.push(
        `⚠️ ACUTE KIDNEY INJURY (KDIGO Stage ${finalStage}): Creatinine ${currentCr.toFixed(2)} mg/dL (baseline ${baselineCr.toFixed(2)}), ratio ${creatinineRatio.toFixed(2)}×, 48h rise ${cr48hRise.toFixed(2)} mg/dL. UO ${uoRate.toFixed(1)} mL/kg/hr × ${uoDuration.toFixed(0)}h. MANAGEMENT: (1) ELIMINATE nephrotoxins (NSAIDs, aminoglycosides, contrast if possible); (2) Optimize perfusion (MAP ≥ 65, avoid hypovolemia AND fluid overload); (3) Discontinue ACE inhibitors/ARBs/NSAIDs; (4) Dose adjust renally cleared drugs; (5) Furosemide for fluid overload only (does NOT improve renal outcomes — furosemide challenge may predict recovery); (6) Monitor K⁺, pH (hyperK/acidosis = indications for RRT even before stage 3). ${finalStage === 3 ? 'Stage 3 AKI: NEPHROLOGY CONSULT and RRT consideration.' : ''}`,
      );
      prevAKILogged = true;
    }
    if (!akiCriterionMet) prevAKILogged = false;

    // ===========================
    // CONTRAST AKI
    // ===========================
    if (!!inputs.isContrast && gfr < 45 && !prevContrastAKILogged) {
      events.push(
        `⚠️ CI-AKI PREVENTION (GFR ${gfr.toFixed(0)} mL/min): HIGH RISK for contrast-induced AKI. PREVENTION: (1) IV NS 1 mL/kg/hr × 12h BEFORE AND AFTER contrast (most evidence-based intervention); (2) Minimum contrast volume; (3) Hold metformin × 48h after contrast (lactic acidosis risk with AKI); (4) Hold ACE inhibitors/ARBs/NSAIDs day of contrast; (5) N-acetylcysteine 600 mg PO BID (controversial — limited RCT evidence); (6) Use iso-osmolar contrast if GFR < 45. AVOID gadolinium if GFR < 30 (nephrogenic systemic fibrosis).`,
      );
      prevContrastAKILogged = true;
    }

    // ===========================
    // HEPATORENAL SYNDROME
    // ===========================
    const hrsActive = !!inputs.isHRS;
    const hrsType = inputs.hrsType || 1;
    const terlipressinEfficacy = hrsActive && terlipressinCe > 0
      ? clamp(terlipressinCe / (terlipressinCe + 0.3) * 0.65, 0, 0.65)
      : hrsActive && albumin_Ce > 0 ? 0.2 : 0;

    if (hrsActive && !prevHRSLogged) {
      events.push(
        `🚨 HEPATORENAL SYNDROME (Type ${hrsType}): ${hrsType === 1 ? 'RAPID onset (< 2 weeks) — often triggered by SBP, major bleed, or surgery. Life-threatening without OLT. ' : 'SLOWER onset — diuretic-refractory ascites pattern. '}TREATMENT: (1) TERLIPRESSIN 0.5-1 mg IV q4-6h (V1 agonist, not available in US) OR VASOPRESSIN 0.03-0.1 units/min + NOREPINEPHRINE; (2) ALBUMIN 1 g/kg IV × 2 days (then 20-40 g/day); (3) HOLD diuretics, NSAIDs, nephrotoxins; (4) Dialysis as bridge to liver transplant. HRS responds to liver transplant (resolves with functioning new liver).`,
      );
      prevHRSLogged = true;
    }

    return {
      kdigo_stage: finalStage as 0 | 1 | 2 | 3,
      akiCriterionMet,
      creatinineRatio: parseFloat(creatinineRatio.toFixed(3)),
      uoInadequate,
      uoStage: uoStage as 0 | 1 | 2 | 3,
      furosemideBenefit: parseFloat(furosemideBenefit.toFixed(4)),
      rrIndicationMet,
      nephrotoxinBurden: parseFloat(nephrotoxinBurden.toFixed(4)),
      hrsActive,
      terlipressinEfficacy: parseFloat(terlipressinEfficacy.toFixed(4)),
      prevAKILogged,
      prevHRSLogged,
      prevContrastAKILogged,
      events,
    };
  }
}
