/**
 * Sepsis Cascade Model: Dynamic SIRS→Sepsis→Septic Shock Severity Progression
 *
 * Phase 5, Stage 4 of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Prior model:
 * `patient.isSeptic` was a static boolean set at case load -- cardiovascular/metabolic effects
 * were all flat multipliers on this flag (e.g., SVR × 0.6, lactate = 4.5) that never changed
 * during the simulation regardless of treatment. A patient given fluids, vasopressors, and
 * source control still had identical physiology to an untreated one.
 *
 * This model computes a continuous `sepsisScore` (0-3) that DYNAMICALLY progresses:
 *
 * - **Without adequate resuscitation**: sepsisScore rises from 0 toward 3 (septic shock)
 *   over ~2-4 hours of untreated sepsis, reflecting the real cytokine cascade (TNF-α,
 *   IL-1β, IL-6 → iNOS-mediated vasodilation → distributive shock).
 * - **With adequate MAP support** (>65 mmHg): progression slows significantly -- vasopressors
 *   and fluids buy time, reflecting how early EGDT (early goal-directed therapy) improves
 *   outcomes by preventing further deterioration even without definitive source control.
 * - **With source control** (indicated by debridement/drainage surgical procedure flag):
 *   progression begins to reverse (cytokine load drops as the infection source is controlled).
 * - **With corticosteroids** (Hydrocortisone/Dexamethasone -- already in Pharmacology.js):
 *   progression slows further (real mechanism: corticosteroids suppress cytokine cascade and
 *   restore vasopressor sensitivity in refractory septic shock, supported by CORTICUS/APROCCHSS
 *   trials).
 *
 * Outputs drive the cardiovascular/metabolic effects PROPORTIONALLY to sepsisScore rather
 * than as flat flags, making the separation between "septic" and "septic shock" physiologically
 * visible rather than a binary switch:
 * - `svrMultiplierFromSepsis`: SVR reduction (0.95 at score=1, 0.60 at score=3)
 * - `lactateContribution`: additional lactate above 1.0 (driven by inadequate oxygen delivery)
 * - `cardiacFunctionMultiplier`: septic cardiomyopathy (myocardial depression at high scores)
 * - `sofa_approximate`: 0-3 severity classification (SIRS=0, Sepsis=1, Severe=2, Shock=3)
 *
 * Antibiotic treatment is not explicitly modeled (the existing drug database has only one
 * antibiotic and lacks the variety for meaningful antibiotic-specific effects -- a disclosed
 * scope limitation). The model focuses on the resuscitation/hemodynamic/source-control
 * aspects of sepsis management, which are the most directly relevant to anesthesia training.
 *
 * Source: Surviving Sepsis Campaign guidelines; Singer et al. JAMA 2016 (Sepsis-3 definitions);
 * CORTICUS/APROCCHSS trials. Not a specific Miller's citation; disclosed per this project's
 * standing convention. All calibration constants are disclosed, reasoned estimates.
 */

export interface SepsisCascadeInputs {
  isSeptic?: boolean;
  prevSepsisScore?: number; // 0-3 continuous, carried forward
  mapMmHg?: number; // current MAP -- adequate perfusion (>65) slows cascade
  netFluidBalanceMl?: number; // positive fluid balance supports organ perfusion
  sourceControlActive?: boolean; // debridement/drainage/abscess drainage performed this case
  corticosteroidCe?: number; // hydrocortisone/dexamethasone effect-site concentration
  antibioticCoverageAdequacy?: number; // 0-1, from AntibioticPKPDModel (Phase 6A) -- treatment-responsive
  dt?: number; // seconds
}

export interface SepsisCascadeOutput {
  sepsisScore: number; // 0-3: 0=SIRS only, 1=Sepsis, 2=Severe Sepsis, 3=Septic Shock
  svrMultiplierFromSepsis: number; // 0-1, multiplicative on SVR
  lactateContributionMmolL: number; // additional lactate beyond 1.0 (normal baseline)
  cardiacFunctionMultiplier: number; // 1.0 = normal, <1.0 = septic cardiomyopathy
  sofa_approximate: 0 | 1 | 2 | 3;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class SepsisCascadeModel {
  static tick(inputs: SepsisCascadeInputs = {}): SepsisCascadeOutput {
    const isSeptic = !!inputs.isSeptic;
    if (!isSeptic) {
      return {
        sepsisScore: 0,
        svrMultiplierFromSepsis: 1.0,
        lactateContributionMmolL: 0,
        cardiacFunctionMultiplier: 1.0,
        sofa_approximate: 0
      };
    }

    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));
    const prevScore = clamp(safeNumber(inputs.prevSepsisScore, 0.5), 0, 3);
    const mapMmHg = clamp(safeNumber(inputs.mapMmHg, 65), 0, 200);
    const netFluidBalance = safeNumber(inputs.netFluidBalanceMl, 0);
    const sourceControlActive = !!inputs.sourceControlActive;
    const corticosteroidCe = Math.max(0, safeNumber(inputs.corticosteroidCe, 0));
    const antibioticCoverageAdequacy = clamp(safeNumber(inputs.antibioticCoverageAdequacy, 0), 0, 1);

    // Intrinsic cytokine cascade rate: reaches septic shock (~score=3) in ~2-4h without any
    // treatment, calibrated to the real clinical observation that untreated sepsis is rapidly
    // progressive (hour-zero data from Sepsis-3 mandate recognition within 1h for best outcomes).
    const baseProgressionRatePerSec = 3.0 / (3 * 3600); // score 0→3 in ~3h untreated

    // MAP adequacy: >65 mmHg = adequate organ perfusion (the Surviving Sepsis target).
    // Below 65 → unconstrained progression; above 65 → up to 80% reduction in progression rate.
    const mapAdequacy = clamp((mapMmHg - 45) / 20, 0, 1);

    // Fluid resuscitation: early fluid loading (first 30 mL/kg) supports perfusion.
    const fluidAdequacy = clamp(netFluidBalance / 2000, 0, 0.5);

    // Source control: most important determinant of sepsis trajectory (untreated source =
    // continuous antigen/toxin load that sustains the cytokine cascade regardless of support).
    const sourceControlFactor = sourceControlActive ? 0.15 : 1.0;

    // Corticosteroids: suppress the cytokine cascade and restore vasopressor sensitivity,
    // without directly eliminating the infection source.
    const steroidFactor = corticosteroidCe > 0.05 ? Math.max(0.4, 1 - 0.5 * (corticosteroidCe / (corticosteroidCe + 0.1))) : 1.0;

    // Antibiotics (Phase 6A): the most powerful direct treatment for bacterial sepsis.
    // Adequate antibiotic coverage (AntibioticPKPDModel.ts coverageAdequacy) reduces
    // bacterial load, directly attenuating cytokine stimulation and reversing cascade.
    // Calibrated so optimal antibiotic coverage alone (adequacy=1.0) is nearly as powerful
    // as source control for reversing progression -- matching real IDSA data that appropriate
    // early antibiotics within 1h reduces 28-day mortality by ~7% per hour of delay.
    // Antibiotic effect is ADDITIVE to (not replacing) source control -- real clinical
    // practice requires both for definitive treatment of intra-abdominal sepsis.
    const antibioticFactor = antibioticCoverageAdequacy > 0.1
      ? Math.max(0.1, 1.0 - 0.85 * antibioticCoverageAdequacy)
      : 1.0;

    const effectiveProgressionRate = baseProgressionRatePerSec
      * (1 - 0.8 * mapAdequacy)
      * (1 - fluidAdequacy)
      * sourceControlFactor
      * steroidFactor
      * antibioticFactor;

    // Sepsis score: positive when untreated (rising), negative (falling) when source
    // control AND/OR adequate antibiotics are active with resuscitation support.
    const isActivelyTreated = (sourceControlActive || antibioticCoverageAdequacy > 0.5) && mapAdequacy > 0.7;
    const scoreDirection = isActivelyTreated ? -1 : 1;
    let sepsisScore = clamp(prevScore + scoreDirection * effectiveProgressionRate * dt, 0, 3);

    // --- Physiologic consequences proportional to score ---
    // SVR: progressive vasodilation from iNOS-mediated NO production.
    // Normal sepsis case: SVR × 0.6 (score=3) → 0.95 (score=0). Smoothly interpolated.
    const svrMultiplierFromSepsis = 1.0 - 0.40 * (sepsisScore / 3);

    // Lactate: tissue hypoperfusion → anaerobic metabolism. Reflects the real association
    // between lactate and severity (Sepsis-3 defines septic shock in part as lactate > 2 mmol/L).
    const lactateContributionMmolL = (sepsisScore / 3) * 3.5; // up to +3.5 above 1.0 baseline

    // Cardiac function: septic cardiomyopathy (myocardial depression from cytokines and
    // mitochondrial dysfunction) emerges at higher scores, especially score > 2.
    const cardiacFunctionMultiplier = sepsisScore > 2 ? Math.max(0.6, 1 - 0.15 * (sepsisScore - 2)) : 1.0;

    // SOFA-approximate classification
    let sofa_approximate: 0 | 1 | 2 | 3;
    if (sepsisScore < 0.5) sofa_approximate = 0;
    else if (sepsisScore < 1.5) sofa_approximate = 1;
    else if (sepsisScore < 2.5) sofa_approximate = 2;
    else sofa_approximate = 3;

    return {
      sepsisScore: parseFloat(sepsisScore.toFixed(4)),
      svrMultiplierFromSepsis: parseFloat(svrMultiplierFromSepsis.toFixed(4)),
      lactateContributionMmolL: parseFloat(lactateContributionMmolL.toFixed(3)),
      cardiacFunctionMultiplier: parseFloat(cardiacFunctionMultiplier.toFixed(4)),
      sofa_approximate
    };
  }
}
