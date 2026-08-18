/**
 * HPA Axis Model: Chronic Steroid-Induced Adrenocortical Suppression + Perioperative Crisis
 *
 * Phase 6, Stage E of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 *
 * The hypothalamic-pituitary-adrenal (HPA) axis is the body's master stress-response
 * regulatory system. The existing `AdrenalEngine.ts` models the NORMAL endogenous cortisol
 * stress response (ACTH-driven cortisol synthesis in response to hemorrhage, hypoglycemia,
 * hypoxia, etc.). What it does NOT model is what happens when chronic EXOGENOUS corticosteroid
 * therapy has suppressed this axis:
 *
 * === MECHANISM OF HPA SUPPRESSION ===
 *
 * 1. Exogenous glucocorticoids (prednisone, dexamethasone, methylprednisolone, hydrocortisone)
 *    occupy hypothalamic and pituitary glucocorticoid receptors → negative feedback inhibition
 *    of CRH (corticotropin-releasing hormone) and ACTH (adrenocorticotropic hormone) release.
 *
 * 2. ACTH deficiency → adrenocortical atrophy (the zona fasciculata literally shrinks from
 *    disuse, losing enzymatic capacity for cortisol synthesis). This structural change takes
 *    WEEKS to develop and MONTHS to recover.
 *
 * 3. Perioperative implication: a patient taking ≥5 mg/day prednisone (or equivalent) for
 *    ≥3 weeks has suppressed HPA axis. Under surgical stress -- which normally requires a
 *    10-20× increase in cortisol secretion -- the suppressed HPA axis cannot mount this
 *    response. The result is PERIOPERATIVE ADRENAL CRISIS.
 *
 * === PERIOPERATIVE ADRENAL CRISIS ===
 *
 * Classic presentation: refractory hypotension (vasodilatory, catecholamine-UNRESPONSIVE
 * or minimally responsive), hypoglycemia, hyponatremia, hyperkalemia, often with
 * inappropriate bradycardia. The cardiovascular collapse is directly caused by:
 * - Loss of cortisol's permissive effect on adrenergic receptor expression (the existing
 *   `catecholamineSensitivityMultiplier` in `AdrenalEngine.ts` captures this)
 * - Loss of cortisol's direct positive inotropy and vasoconstrictive action
 * - Relative aldosterone deficiency → renal sodium wasting → hypovolemia
 *
 * Key clinical teaching: standard vasopressors (norepinephrine, phenylephrine, vasopressin)
 * have DIMINISHED EFFICACY in adrenal crisis because their vascular receptors require
 * cortisol for full expression -- a uniquely dangerous form of refractory shock that only
 * responds to cortisol replacement.
 *
 * === STRESS-DOSE STEROID PROTOCOL ===
 *
 * Real protocol (adapted from Salem et al., Endocr Pract 2020):
 * - Minor surgical stress (local anesthesia, endoscopy): NO supplementation needed
 * - Moderate surgical stress (most general surgery <3h): 50 mg hydrocortisone IV at
 *   induction, then 25 mg IV q8h × 24h, then taper to usual dose
 * - Major surgical stress (cardiac surgery, trauma, prolonged GA): 100 mg hydrocortisone
 *   IV at induction, then 50 mg IV q8h × 48-72h, then taper
 *
 * This model computes:
 * - `hpaSuppressionFraction` (0-1): how much the HPA axis is suppressed based on
 *   chronic steroid dose and duration
 * - `cortisolStressDeficit` (0-1): during surgical stress, how much of the required
 *   cortisol response is missing
 * - `adrenalCrisisActive` (bool): when hypotension + stress + suppressed HPA without
 *   stress-dose coverage
 * - `catecholamineSensitivityReduction` (0-1): reduces the existing
 *   `catecholamineSensitivityMultiplier` further (refractory vasopressor resistance)
 * - `stressDoseCoverageAdequate` (bool): whether administered hydrocortisone/dexamethasone
 *   provides adequate stress-dose coverage
 *
 * Source: Salem et al. Endocr Pract 2020 (perioperative steroid management); Yong SL et al.
 * Anesthesiology 1994; Kohl B et al. Crit Care 2005. Not a specific Miller's citation;
 * disclosed per this project's standing convention. Suppression thresholds and recovery
 * kinetics are disclosed, reasoned estimates from published pharmacokinetic literature.
 */

export interface HpaAxisInputs {
  // Chronic steroid exposure (set at case load from patient comorbidity flags)
  chronicPrednisoneDoseEquivMgPerDay?: number; // 0 = no chronic steroids; ≥5 mg/day = at risk
  chronicSteroidDurationWeeks?: number; // duration of chronic therapy; ≥3 weeks = suppression

  // Acute surgical stress context
  surgicalStressLevel?: 'none' | 'minor' | 'moderate' | 'major'; // determines cortisol requirement
  isIntraoperative?: boolean; // is a case actively running (stress active)

  // Acute steroid administration (stress-dose coverage)
  hydrocortisoneCe?: number; // from Hydrocortisone drug entry (if added) or Dexamethasone as proxy
  dexamethasoneCe?: number; // dexamethasone exists in Pharmacology.js already

  // Current hemodynamic state (to detect crisis)
  mapMmHg?: number;
  sepsisScore?: number; // from SepsisCascadeModel -- sepsis can independently cause adrenal insufficiency

  prevAdrenalCrisisLogged?: boolean;
}

export interface HpaAxisOutput {
  hpaSuppressionFraction: number; // 0-1, 0=normal, 1=complete suppression
  cortisolStressDeficit: number; // 0-1, fraction of required stress response missing
  adrenalCrisisActive: boolean;
  catecholamineSensitivityReduction: number; // 0-1, reduces existing multiplier
  stressDoseCoverageAdequate: boolean;
  prevAdrenalCrisisLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Prednisone equivalent conversion for stress-dose response threshold assessment
// Dexamethasone 0.75 mg = Prednisone 5 mg = Hydrocortisone 20 mg = Methylprednisolone 4 mg
const SUPPRESSION_THRESHOLD_MG_PREDNISONE = 5.0; // mg/day
const SUPPRESSION_THRESHOLD_WEEKS = 3;

// Stress cortisol requirements by surgical stress level (multiples above baseline secretion)
const STRESS_CORTISOL_NEED: Record<string, number> = {
  none: 1.0,
  minor: 2.0,
  moderate: 5.0,
  major: 10.0
};

export class HpaAxisModel {
  static tick(inputs: HpaAxisInputs = {}): HpaAxisOutput {
    const events: string[] = [];

    const chronicDose = Math.max(0, safeNumber(inputs.chronicPrednisoneDoseEquivMgPerDay, 0));
    const chronicWeeks = Math.max(0, safeNumber(inputs.chronicSteroidDurationWeeks, 0));
    const surgicalStressLevel = inputs.surgicalStressLevel || 'none';
    const isIntraoperative = !!inputs.isIntraoperative;
    const hydrocortisoneCe = Math.max(0, safeNumber(inputs.hydrocortisoneCe, 0));
    const dexamethasoneCe = Math.max(0, safeNumber(inputs.dexamethasoneCe, 0));
    const mapMmHg = clamp(safeNumber(inputs.mapMmHg, 90), 0, 200);
    const sepsisScore = clamp(safeNumber(inputs.sepsisScore, 0), 0, 3);
    let prevAdrenalCrisisLogged = !!inputs.prevAdrenalCrisisLogged;

    // HPA suppression: proportional to chronic dose above 5 mg/day and duration above 3 weeks
    const doseFraction = clamp((chronicDose - SUPPRESSION_THRESHOLD_MG_PREDNISONE) / 15, 0, 1);
    const weeksFraction = clamp((chronicWeeks - SUPPRESSION_THRESHOLD_WEEKS) / 9, 0, 1);
    const hpaSuppressionFraction = doseFraction * weeksFraction;

    // Stress cortisol deficit: during intraoperative stress, how much of the required cortisol
    // response the axis cannot mount.
    //
    // F45 (L4): the two quantities being compared here are in DIFFERENT UNITS, and the prior formula
    // (`1 - cortisolCapacity / stressNeed`) divided one by the other directly. `cortisolCapacity` is a
    // 0-1 FRACTION of axis reserve remaining; `stressNeed` is a MULTIPLE of baseline secretion (2x
    // minor ... 10x major). So a completely healthy patient — capacity 1.0, zero suppression — scored
    // `1 - 1/5 = 0.8`, i.e. "80% cortisol deficient", for any moderate-stress case. That tripped the
    // crisis branch below in EVERY intact patient the moment MAP dipped under 70 (routine after
    // induction), which then applied a persistent ~35% SVR cut at the call site, deepened the
    // hypotension that latched the crisis on, and blunted every vasopressor given to treat it.
    //
    // Correct comparison: an INTACT axis can raise cortisol output ~10x above baseline under maximal
    // stress. Suppression scales that reserve down toward 1x (baseline output only). The deficit is
    // then how far the achievable multiple falls short of what the stress level demands.
    const stressNeed = STRESS_CORTISOL_NEED[surgicalStressLevel] ?? 1.0;
    const cortisolCapacity = 1 - hpaSuppressionFraction;
    const MAX_STRESS_RESPONSE_MULTIPLE = 10.0;
    const achievableStressMultiple = 1 + (MAX_STRESS_RESPONSE_MULTIPLE - 1) * cortisolCapacity;
    const cortisolStressDeficit = isIntraoperative
      ? clamp(1 - achievableStressMultiple / stressNeed, 0, 1)
      : 0;

    // Stress-dose coverage: hydrocortisone 50-100 mg IV provides ~300-600 mg/day equivalent
    // (normal stress-response production is ~75-150 mg/day cortisol). Ce proxy here --
    // any meaningful hydrocortisone or dexamethasone Ce indicates coverage is active.
    // Dexamethasone 8mg IV ≈ hydrocortisone 266mg -- very high potency, covers most scenarios.
    const acuteGlucocorticoidEffect = hydrocortisoneCe > 0.05 || dexamethasoneCe > 0.01;
    const stressDoseCoverageAdequate = acuteGlucocorticoidEffect && surgicalStressLevel !== 'none';

    // Catecholamine sensitivity reduction: the HPA-suppression effect on receptor expression
    // This COMPOUNDS with AdrenalEngine.ts's existing catecholamineSensitivityMultiplier
    const catecholamineSensitivityReduction = cortisolStressDeficit * 0.6; // up to 60% reduction in vasopressor sensitivity

    // Adrenal crisis: when there's significant cortisol deficit + hypotension + stress
    // Sepsis can also cause relative adrenal insufficiency independently
    const sepsisContribution = sepsisScore > 2 ? 0.3 : 0; // critical illness-related adrenal insufficiency
    const crisisConditions = isIntraoperative
      && (cortisolStressDeficit > 0.4 || sepsisContribution > 0)
      && mapMmHg < 70
      && !stressDoseCoverageAdequate;

    const adrenalCrisisActive = crisisConditions;

    if (adrenalCrisisActive && !prevAdrenalCrisisLogged) {
      events.push("🚨 CRITICAL: Perioperative Adrenal Crisis -- refractory hypotension in a chronically steroid-suppressed patient. Standard vasopressors have diminished efficacy (cortisol is required for full catecholamine receptor expression). GIVE STRESS-DOSE STEROIDS IMMEDIATELY: Hydrocortisone 100 mg IV bolus, then 50 mg IV q8h. Fluid resuscitation. This is the ONLY definitive treatment.");
      prevAdrenalCrisisLogged = true;
    } else if (!adrenalCrisisActive && prevAdrenalCrisisLogged) {
      prevAdrenalCrisisLogged = false;
    }

    return {
      hpaSuppressionFraction: parseFloat(hpaSuppressionFraction.toFixed(4)),
      cortisolStressDeficit: parseFloat(cortisolStressDeficit.toFixed(4)),
      adrenalCrisisActive,
      catecholamineSensitivityReduction: parseFloat(catecholamineSensitivityReduction.toFixed(4)),
      stressDoseCoverageAdequate,
      prevAdrenalCrisisLogged,
      events
    };
  }
}
