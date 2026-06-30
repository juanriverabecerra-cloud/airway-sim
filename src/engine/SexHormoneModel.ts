/**
 * Sex Hormone Model: Progesterone, Estrogen, and Testosterone Effects on Perioperative Physiology
 *
 * Phase 6, Stage F of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 *
 * Sex hormones influence pharmacokinetics, pharmacodynamics, MAC, pain sensitivity, and
 * cardiovascular physiology in ways that are clinically relevant and largely absent from
 * the existing codebase. The existing `PregnancyPhysiologyEngine.ts` models progesterone's
 * effects during pregnancy specifically; this model covers baseline sex-hormone physiology
 * applicable to all patients throughout the menstrual cycle, reproductive aging, and hormonal
 * therapy.
 *
 * === PROGESTERONE ===
 *
 * 1. **MAC reduction**: Progesterone decreases volatile anesthetic MAC by approximately
 *    30% during the luteal phase of the menstrual cycle (days 14-28). Peak progesterone
 *    in the late luteal phase (~day 21) reduces MAC toward values approaching those of
 *    early pregnancy. Mechanism: progesterone and its neurosteroid metabolites (allopregnanolone)
 *    are positive allosteric modulators of GABA-A receptors (same mechanism as propofol and
 *    volatile anesthetics) → additive CNS depression → lower MAC needed for immobility.
 *    Clinical implication: a periovulatory/luteal-phase female needs LESS volatile anesthetic
 *    than a follicular-phase female or male patient for the same anesthetic depth.
 *
 * 2. **GI effects**: Progesterone relaxes smooth muscle (including LES and GI motility) --
 *    already modeled in `PregnancyPhysiologyEngine.ts` and `GastricEmptyingModel.ts` for
 *    pregnancy, but now also applicable to non-pregnant luteal-phase females and patients
 *    on exogenous progestin therapy.
 *
 * 3. **Respiratory stimulation**: Progesterone directly stimulates the respiratory center →
 *    mild hyperventilation, slightly lower baseline PaCO2 (~37-38 mmHg in luteal phase vs
 *    ~40 mmHg in follicular phase). This is the same mechanism as pregnancy but less marked.
 *
 * === ESTROGEN ===
 *
 * 1. **Cardiovascular protection**: Estrogen upregulates eNOS (endothelial nitric oxide
 *    synthase) → vasodilation, reduced SVR in premenopausal females vs males and
 *    postmenopausal females. Direct cardioprotective effects include reduced LDL, increased
 *    HDL, and anti-inflammatory vascular effects. Clinically: premenopausal females have
 *    significantly lower cardiovascular disease risk than age-matched males.
 *
 * 2. **Procoagulant effect**: Estrogen increases hepatic synthesis of factors II, VII, VIII, IX,
 *    X, and fibrinogen -- the same mechanism behind oral contraceptive pill-associated VTE
 *    risk (3-4× baseline). This feeds `CoagulationCascadeModel.ts`'s factor activity fraction.
 *    Also relevant to postmenopausal hormone replacement therapy.
 *
 * 3. **PONV risk**: Estrogen increases susceptibility to PONV via multiple mechanisms
 *    (increased gastrointestinal motility during follicular phase? or direct CTZ effects?
 *    Mechanism still debated). Clinically confirmed: female sex is the single strongest
 *    predictor in the Apfel PONV risk score (2 points), capturing the combined progesterone
 *    + estrogen hormonal milieu.
 *
 * === TESTOSTERONE ===
 *
 * 1. **Higher Hgb/Hct**: Testosterone stimulates renal erythropoietin production →
 *    higher red cell mass in males (Hgb 13.5-17.5 g/dL) vs females (Hgb 11.5-15.5 g/dL).
 *    Anemia threshold and transfusion trigger differ by sex.
 *
 * 2. **Muscle mass and drug distribution**: Higher lean body mass in males affects drug Vd
 *    (more muscle = larger distribution volume for water-soluble drugs like NMBs). The
 *    existing `adiposeVolumeRatio` in PKPDEngine handles the obesity direction; testosterone
 *    here adds the opposite -- higher lean mass → larger Vd for hydrophilic drugs.
 *
 * 3. **Airway anatomy**: Larger airway with longer trachea (different intubation
 *    mechanics -- partially captured by height-based airway calculations).
 *
 * This model computes:
 * - `macReductionFromProgesterone` (0-0.3): MAC reduction for volatile agents in luteal
 *   phase or progesterone therapy
 * - `estrogenCoagulantBoost` (0-1): added factor activity from estrogen (procoagulant)
 * - `estrogensvrReduction` (0-0.1): mild SVR reduction from estrogen-mediated vasodilation
 * - `baselineHgbAdjustment` (g/dL): testosterone effect on red cell mass
 * - `ponvRiskFromHormones` (0-1): hormonal contribution to PONV risk
 *
 * Source: ACOG Committee Opinion on hormonal effects on anesthesia; Roth-Isigkeit A et al.
 * Anesth Analg 2004 (sex differences in MAC); Fillingim RB Clin J Pain 2000 (sex hormones
 * and pain); Helms E et al. Crit Care 2019 (estrogen and coagulation). All calibration
 * constants are disclosed, reasoned estimates from published literature.
 */

export interface SexHormoneInputs {
  sex?: string; // 'male' | 'female'
  age?: number;
  isPregnant?: boolean; // if pregnant, PregnancyPhysiologyEngine.ts handles it instead
  menstrualCycleDay?: number; // 1-28; undefined = unknown/not applicable
  isPostmenopausal?: boolean; // age > ~51 or surgical menopause
  chronicProgestinTherapy?: boolean; // exogenous progestin (e.g., medroxyprogesterone, norethindrone)
  estrogenTherapy?: boolean; // exogenous estrogen (HRT, OCP)
  testosteroneTherapy?: boolean; // androgen supplementation
}

export interface SexHormoneOutput {
  macReductionFromProgesterone: number; // 0-0.30, multiplies into brainMac
  estrogenCoagulantBoost: number; // 0-0.15, added to factorActivityFraction
  estrogenSvrReduction: number; // 0-0.08, subtracted from SVR multiplier
  baselineHgbAdjustmentGdL: number; // +/- g/dL adjustment to baseline Hgb
  ponvRiskFromHormones: number; // 0-1, hormonal PONV contribution
  basePaCO2Adjustment: number; // mmHg reduction from progesterone respiratory drive
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class SexHormoneModel {
  static tick(inputs: SexHormoneInputs = {}): SexHormoneOutput {
    const sex = inputs.sex === 'male' ? 'male' : 'female';
    const age = clamp(safeNumber(inputs.age, 40), 0, 100);
    const isPregnant = !!inputs.isPregnant;
    const cycleDay = safeNumber(inputs.menstrualCycleDay, 14);
    const isPostmenopausal = !!inputs.isPostmenopausal || age > 52;
    const chronicProgestinTherapy = !!inputs.chronicProgestinTherapy;
    const estrogenTherapy = !!inputs.estrogenTherapy;
    const testosteroneTherapy = !!inputs.testosteroneTherapy;

    // If pregnant, PregnancyPhysiologyEngine.ts handles hormonal effects -- no double-counting
    if (isPregnant) {
      return {
        macReductionFromProgesterone: 0,
        estrogenCoagulantBoost: 0,
        estrogenSvrReduction: 0,
        baselineHgbAdjustmentGdL: sex === 'female' ? -1.5 : 0,
        ponvRiskFromHormones: 0,
        basePaCO2Adjustment: 0
      };
    }

    // --- Progesterone MAC reduction ---
    // Luteal phase (days 14-28) has peak progesterone. Follicular (days 1-13): low.
    // Exogenous progestin therapy equivalent to ~mid-luteal phase.
    let progesteroneLevel = 0;
    if (sex === 'female' && !isPostmenopausal) {
      if (chronicProgestinTherapy) {
        progesteroneLevel = 0.7; // sustained moderate-high level from therapy
      } else if (cycleDay >= 14 && cycleDay <= 28) {
        // Luteal phase: sinusoidal peak around day 21
        progesteroneLevel = Math.sin(Math.PI * (cycleDay - 14) / 14);
      }
    }
    const macReductionFromProgesterone = progesteroneLevel * 0.28; // up to 28% MAC reduction at peak luteal

    // Progesterone respiratory drive
    const basePaCO2Adjustment = -(progesteroneLevel * 3); // up to -3 mmHg from respiratory stimulation

    // --- Estrogen effects ---
    let estrogenLevel = 0;
    if (sex === 'female') {
      if (!isPostmenopausal) {
        // Premenopausal: varies with cycle; simplified to average ~0.5
        estrogenLevel = estrogenTherapy ? 0.8 : 0.5;
      } else {
        // Postmenopausal: near-zero endogenous; estrogen therapy restores toward premenopausal
        estrogenLevel = estrogenTherapy ? 0.4 : 0.05;
      }
    } else if (sex === 'male') {
      estrogenLevel = estrogenTherapy ? 0.5 : 0.1; // males have some estrogen; therapy adds more
    }

    const estrogenCoagulantBoost = estrogenLevel * 0.12; // up to +12% factor activity (oral OCP ~4× VTE risk)
    const estrogenSvrReduction = estrogenLevel * 0.06; // up to -6% SVR from eNOS-mediated vasodilation

    // --- Testosterone effects on Hgb ---
    let baselineHgbAdjustmentGdL = 0;
    if (sex === 'male' && !testosteroneTherapy) {
      baselineHgbAdjustmentGdL = 1.5; // males average ~1.5 g/dL higher baseline Hgb than females
    } else if (sex === 'female' && testosteroneTherapy) {
      baselineHgbAdjustmentGdL = 0.8; // exogenous testosterone raises female Hgb toward male range
    }

    // --- PONV risk from hormones ---
    // Female sex is the single strongest Apfel predictor (approximately 0.5 fractional risk,
    // varying with hormonal status: higher in luteal phase, lower postmenopausal).
    const ponvRiskFromHormones = sex === 'female' ? (isPostmenopausal ? 0.2 : 0.3 + progesteroneLevel * 0.1) : 0;

    return {
      macReductionFromProgesterone: parseFloat(macReductionFromProgesterone.toFixed(4)),
      estrogenCoagulantBoost: parseFloat(estrogenCoagulantBoost.toFixed(4)),
      estrogenSvrReduction: parseFloat(estrogenSvrReduction.toFixed(4)),
      baselineHgbAdjustmentGdL: parseFloat(baselineHgbAdjustmentGdL.toFixed(2)),
      ponvRiskFromHormones: parseFloat(ponvRiskFromHormones.toFixed(4)),
      basePaCO2Adjustment: parseFloat(basePaCO2Adjustment.toFixed(2))
    };
  }
}
