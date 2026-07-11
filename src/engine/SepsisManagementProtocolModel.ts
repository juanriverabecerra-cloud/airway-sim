/**
 * Sepsis Management Protocol Model (Surviving Sepsis Campaign 2021)
 *
 * This model supplements the existing SepsisCascadeModel.ts (which handles progressive
 * physiologic deterioration) with specific MANAGEMENT PROTOCOL guidance including
 * the Hour-1 Bundle, antibiotic selection, source control, and organ support targets.
 *
 * === SEPSIS DEFINITIONS (Sepsis-3, 2016) ===
 * SEPSIS: Life-threatening organ dysfunction caused by dysregulated host response to infection.
 *   Clinical identification: SOFA score increase ≥ 2 points.
 *   Bedside: quick-SOFA (qSOFA) ≥ 2: RR ≥ 22, altered mentation, SBP ≤ 100.
 *
 * SEPTIC SHOCK: Subset of sepsis with circulatory, cellular, metabolic abnormalities
 *   sufficient to increase mortality substantially.
 *   Clinical identification: vasopressor required to maintain MAP ≥ 65 AND
 *   lactate > 2 mmol/L despite adequate fluid resuscitation.
 *
 * === HOUR-1 BUNDLE (Surviving Sepsis Campaign, SCCM 2018) ===
 * Within 1 hour of sepsis/septic shock recognition:
 * 1. LACTATE: Measure serum lactate. Re-measure if initial > 2 mmol/L.
 * 2. BLOOD CULTURES: Before antibiotics (×2 sets, aerobic+anaerobic).
 * 3. ANTIBIOTICS: Broad-spectrum empiric antibiotics immediately.
 * 4. FLUIDS: 30 mL/kg IV crystalloid for hypotension or lactate ≥ 4 mmol/L.
 * 5. VASOPRESSORS: Norepinephrine for MAP < 65 despite fluid resuscitation.
 *
 * === ANTIBIOTIC SELECTION (empirical, pending cultures) ===
 * Community-acquired sepsis (no immunocompromise):
 *   - Beta-lactam/cephalosporin: ceftriaxone or cefazolin
 *   - PLUS consider: anti-Pseudomonal if risk factors (ICU, bronchiectasis, prior Pseudomonas)
 *
 * Hospital-acquired / healthcare-associated sepsis:
 *   - Anti-Pseudomonal beta-lactam: piperacillin-tazobactam, cefepime, or meropenem
 *   - Consider MRSA coverage (vancomycin or daptomycin) if prior MRSA, skin/soft tissue, catheter
 *
 * Antibiotic DE-ESCALATION:
 *   - Narrow to pathogen-specific therapy once cultures available (48-72h)
 *   - Duration: 7-10 days for most sepsis; shorter if good clinical response
 *
 * === FLUID RESUSCITATION ===
 * Initial: 30 mL/kg crystalloid (Ringer's lactate preferred over NS — less hyperchloremic acidosis)
 * Assessment: Dynamic measures (PPV/SVV, PLR) > static (CVP)
 * Avoid over-resuscitation: CONSERVATIVE strategy after resuscitation phase
 *   (CLASSIC trial: conservative vs liberal fluid — similar outcome; late liberal worse)
 *
 * === VASOPRESSORS IN SEPSIS ===
 * FIRST: Norepinephrine (SOAP II: NE > dopamine)
 * ADD: Vasopressin 0.03 units/min (to reduce NE dose when NE > 0.25 mcg/kg/min)
 * CONSIDER: Hydrocortisone 200 mg/day IV if refractory (adrenal insufficiency)
 *
 * === ORGAN SUPPORT TARGETS ===
 * MAP: ≥ 65 mmHg (higher if chronic HTN, TBI, or carotid stenosis)
 * UO: ≥ 0.5 mL/kg/hr
 * Hb: ≥ 7 g/dL (transfuse only if < 7 in non-ACS/non-ischemic)
 * ScvO2: ≥ 70% (central venous O2 saturation)
 * Glucose: 140-180 mg/dL
 * Plateau pressure: ≤ 30 cmH2O if on MV
 *
 * Sources: Evans L, Intensive Care Med 2021 (Surviving Sepsis Campaign 2021);
 * Seymour CW, JAMA 2017 (SOFA); Levy MM, SCCM 2018 (Hour-1 Bundle);
 * NICE-SUGAR (glucose); Miller's 9th Ed Ch 87 (Sepsis).
 */

export interface SepsisProtocolInputs {
  // Diagnosis
  sepsisDiagnosed?: boolean;
  septicShockPresent?: boolean;
  qsofaScore?: number;           // 0-3 (≥2 = possible sepsis)
  sofaScore?: number;            // 0-24 (≥2 increase = sepsis)

  // Hour-1 bundle completion
  lactateDrawn?: boolean;
  currentLactate?: number;       // mmol/L
  bloodCulturesDrawn?: boolean;
  antibioticsGiven?: boolean;
  antibioticMinsFromOnset?: number; // minutes from recognition to first antibiotic
  fluidsGiven30mlKg?: boolean;
  vasopressorsStarted?: boolean;

  // Treatment adequacy
  currentMAP?: number;
  currentUO_mlHrKg?: number;    // mL/kg/hr
  currentHb?: number;
  sourcePotential?: string;      // 'abdominal', 'pulmonary', 'catheter', 'skin', etc.
  sourceControlDone?: boolean;

  // Patient
  weightKg?: number;
  hasImmunocompromise?: boolean;
  priorPseudomonas?: boolean;
  priorMRSA?: boolean;
  isCommunityAcquired?: boolean;

  // Drugs
  norepinephrineCe?: number;
  vasopressinCe?: number;
  hydrocortisoneCe?: number;     // for refractory septic shock

  // Event guards
  prevSepsisProtocolLogged?: boolean;
  prevBundleIncompleteLogged?: boolean;
  prevShockTargetLogged?: boolean;
}

export interface SepsisProtocolOutput {
  // Bundle completion
  hour1BundleComplete: boolean;
  bundleItemsCompleted: number;    // 0-5
  bundleItemsMissing: string[];

  // Antibiotic timing
  antibioticDelayRisk: boolean;    // > 1h from recognition
  recommendedAntibiotics: string;  // empirical selection

  // Hemodynamic targets
  mapGoalMet: boolean;
  uoGoalMet: boolean;
  lactateClearanceAdequate: boolean; // lactate decreasing

  // Organ support
  vasopressorsAdequate: boolean;
  hydrocortisoneIndicated: boolean; // refractory shock

  // Source control
  sourceControlUrgent: boolean;

  prevSepsisProtocolLogged: boolean;
  prevBundleIncompleteLogged: boolean;
  prevShockTargetLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export class SepsisManagementProtocolModel {
  static tick(inputs: SepsisProtocolInputs = {}): SepsisProtocolOutput {
    const events: string[] = [];
    let prevSepsisProtocolLogged = !!inputs.prevSepsisProtocolLogged;
    let prevBundleIncompleteLogged = !!inputs.prevBundleIncompleteLogged;
    let prevShockTargetLogged = !!inputs.prevShockTargetLogged;

    const sepsisDx = !!inputs.sepsisDiagnosed;
    const septicShock = !!inputs.septicShockPresent;
    const currentLactate = safeNumber(inputs.currentLactate, 1.0);
    const currentMAP = safeNumber(inputs.currentMAP, 65);
    const currentUO = safeNumber(inputs.currentUO_mlHrKg, 0.5);
    const currentHb = safeNumber(inputs.currentHb, 12);
    const antibioticMins = safeNumber(inputs.antibioticMinsFromOnset, 999);
    const isCommunity = inputs.isCommunityAcquired !== false;
    const hasImmunocomp = !!inputs.hasImmunocompromise;
    const priorPseudo = !!inputs.priorPseudomonas;
    const priorMRSA = !!inputs.priorMRSA;
    const norepCe = safeNumber(inputs.norepinephrineCe, 0);
    const vasopCe = safeNumber(inputs.vasopressinCe, 0);
    const hydroCe = safeNumber(inputs.hydrocortisoneCe, 0);

    if (!sepsisDx) {
      return {
        hour1BundleComplete: false, bundleItemsCompleted: 0, bundleItemsMissing: [],
        antibioticDelayRisk: false, recommendedAntibiotics: '', mapGoalMet: true,
        uoGoalMet: true, lactateClearanceAdequate: true, vasopressorsAdequate: true,
        hydrocortisoneIndicated: false, sourceControlUrgent: false,
        prevSepsisProtocolLogged, prevBundleIncompleteLogged, prevShockTargetLogged, events,
      };
    }

    // ===========================
    // HOUR-1 BUNDLE ASSESSMENT
    // ===========================
    const bundleItemsMissing: string[] = [];
    let bundleItemsCompleted = 0;

    if (inputs.lactateDrawn) bundleItemsCompleted++; else bundleItemsMissing.push('Lactate measurement');
    if (inputs.bloodCulturesDrawn) bundleItemsCompleted++; else bundleItemsMissing.push('Blood cultures (×2 sets before antibiotics)');
    if (inputs.antibioticsGiven) bundleItemsCompleted++; else bundleItemsMissing.push('Broad-spectrum antibiotics');
    if (inputs.fluidsGiven30mlKg || currentMAP >= 65) bundleItemsCompleted++; else bundleItemsMissing.push('30 mL/kg IV crystalloid');
    if (inputs.vasopressorsStarted || currentMAP >= 65) bundleItemsCompleted++; else bundleItemsMissing.push('Norepinephrine for MAP < 65');

    const hour1BundleComplete = bundleItemsCompleted === 5;

    // ===========================
    // ANTIBIOTIC SELECTION
    // ===========================
    let recommendedAntibiotics: string;
    if (priorMRSA || !isCommunity) {
      recommendedAntibiotics = 'Vancomycin (MRSA coverage) + Piperacillin-Tazobactam (gram-negative/anaerobic) ± antifungal if immunocompromised';
    } else if (priorPseudo || hasImmunocomp || !isCommunity) {
      recommendedAntibiotics = 'Anti-Pseudomonal beta-lactam (piperacillin-tazobactam 4.5g q6h or meropenem 1g q8h)';
    } else {
      recommendedAntibiotics = 'Ceftriaxone 2g IV daily (community-acquired) ± azithromycin if pneumonia';
    }

    const antibioticDelayRisk = !inputs.antibioticsGiven || antibioticMins > 60;

    // ===========================
    // HEMODYNAMIC TARGETS
    // ===========================
    const mapGoalMet = currentMAP >= 65;
    const uoGoalMet = currentUO >= 0.5;
    const lactateClearanceAdequate = currentLactate < 2.0;

    // Vasopressor adequacy
    const vasopressorsAdequate = !septicShock || (norepCe > 0 || vasopCe > 0) && mapGoalMet;

    // Hydrocortisone indication: refractory septic shock (NE > 0.25 mcg/kg/min equivalent)
    const hydrocortisoneIndicated = septicShock && norepCe > 0.5 && !mapGoalMet;

    // Source control
    const source = inputs.sourcePotential || '';
    const sourceControlUrgent = !!source && !inputs.sourceControlDone
      && (source.includes('abdom') || source.includes('necrotiz') || source.includes('abscess'));

    // ===========================
    // EVENTS
    // ===========================
    if (!prevSepsisProtocolLogged) {
      events.push(
        `🚨 SEPSIS PROTOCOL INITIATED (${septicShock ? 'SEPTIC SHOCK' : 'SEPSIS'}): HOUR-1 BUNDLE — ${bundleItemsCompleted}/5 elements complete. MISSING: ${bundleItemsMissing.length > 0 ? bundleItemsMissing.join(', ') : 'NONE (bundle complete!)'}. RECOMMENDED ANTIBIOTICS: ${recommendedAntibiotics}. TARGET: MAP ≥ 65 mmHg, UO ≥ 0.5 mL/kg/hr, Lactate clearance ≥ 10%/2h. First-line vasopressor: NOREPINEPHRINE. Add VASOPRESSIN 0.03 units/min when NE > 0.25 mcg/kg/min. HYDROCORTISONE 200 mg/day if refractory (NE > 0.5 mcg/kg/min-equivalent). SOURCE CONTROL within 6-12h.`,
      );
      prevSepsisProtocolLogged = true;
    }

    if (antibioticDelayRisk && !inputs.antibioticsGiven && !prevBundleIncompleteLogged) {
      events.push(
        `⚠️ ANTIBIOTIC DELAY: Antibiotics not yet administered${antibioticMins < 900 ? ` (${antibioticMins.toFixed(0)} min from recognition)` : ''}. EVIDENCE: Every hour delay in antibiotics associated with 7% increase in mortality in septic shock. ADMINISTER BROAD-SPECTRUM ANTIBIOTICS NOW. DRAW BLOOD CULTURES FIRST if feasible (takes < 2 min; do not delay antibiotics > 45 min waiting for cultures).`,
      );
      prevBundleIncompleteLogged = true;
    }

    if (septicShock && !mapGoalMet && !prevShockTargetLogged) {
      events.push(
        `🚨 MAP TARGET NOT MET (${currentMAP.toFixed(0)} mmHg < 65 mmHg): SEPTIC SHOCK. Escalate vasopressors. ${norepCe === 0 ? 'START NOREPINEPHRINE immediately.' : norepCe > 0.5 ? 'NE dose high — ADD VASOPRESSIN 0.03 units/min.' : 'Titrate NE upward.'} ${hydrocortisoneIndicated ? 'HYDROCORTISONE 200 mg/day indicated (refractory shock).' : ''} Reassess fluid responsiveness (PLR or PPV). UO: ${currentUO.toFixed(1)} mL/kg/hr.`,
      );
      prevShockTargetLogged = true;
    }
    if (mapGoalMet) prevShockTargetLogged = false;

    return {
      hour1BundleComplete,
      bundleItemsCompleted,
      bundleItemsMissing,
      antibioticDelayRisk,
      recommendedAntibiotics,
      mapGoalMet,
      uoGoalMet,
      lactateClearanceAdequate,
      vasopressorsAdequate,
      hydrocortisoneIndicated,
      sourceControlUrgent,
      prevSepsisProtocolLogged,
      prevBundleIncompleteLogged,
      prevShockTargetLogged,
      events,
    };
  }
}
