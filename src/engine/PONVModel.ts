/**
 * PONV Model: Real Postoperative Nausea/Vomiting Pathophysiology + Apfel Risk Scoring
 *
 * Phase 6, Stage I of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 *
 * === APFEL SIMPLIFIED RISK SCORE ===
 *
 * The Apfel score is the most widely validated PONV prediction model. Four independent
 * predictors, each contributing equally and additively (0-4 points):
 *
 * 1. **Female sex** (1 point): ~2× baseline PONV risk vs males. Mechanism: hormonal
 *    (estrogen/progesterone influence on vomiting center), gastroparesis, and possibly
 *    central sensitization differences. The single strongest predictor.
 *
 * 2. **Non-smoker** (1 point): current smokers have lower PONV incidence (protective).
 *    Mechanism: chronic nicotine exposure may downregulate 5-HT3 receptors and increase
 *    gastric motility, reducing the emetic reflex.
 *
 * 3. **History of PONV or motion sickness** (1 point): a prior PONV episode indicates
 *    a sensitive emetic system (likely genetic in 5-HT3 receptor sensitivity and dopamine
 *    transporter). Motion sickness and PONV share vestibular/CTZ pathways.
 *
 * 4. **Postoperative opioid use** (1 point): opioids are the single most important
 *    modifiable PONV risk factor -- they trigger PONV via μ-receptor activation in
 *    the chemoreceptor trigger zone (CTZ) and delay gastric emptying via peripheral
 *    intestinal μ receptors.
 *
 * Probability of PONV: 0 factors=10%, 1=21%, 2=39%, 3=61%, 4=79% (Apfel NEJM 2004)
 *
 * === VOMITING CENTER NEURAL PATHWAYS ===
 *
 * The vomiting center (in medulla) integrates signals from multiple pathways,
 * each with specific neurotransmitter receptors that map to specific antiemetics:
 *
 * 1. **CTZ (chemoreceptor trigger zone, area postrema, lacks BBB)**:
 *    - D2 (dopamine) receptors → blocked by droperidol, haloperidol, metoclopramide
 *    - 5-HT3 (serotonin) receptors → blocked by ondansetron, granisetron, dolasetron
 *    - NK1 (neurokinin-1/substance P) receptors → blocked by aprepitant (NK1 antagonist,
 *      the most potent antiemetic for PONV but expensive and not yet in drug database)
 *    - Opioid μ receptors → stimulated by all opioids → CTZ activation
 *
 * 2. **Vestibular system**: H1 and M1 (muscarinic) receptors → blocked by scopolamine,
 *    diphenhydramine. Relevant when PONV is triggered by movement/position changes.
 *
 * 3. **GI vagal afferents**: 5-HT3 receptors on enterochromaffin cells → serotonin release
 *    with gut wall distension, chemotherapy, radiation → vagal stimulation → vomiting center.
 *    This is the primary target of 5-HT3 antagonists (ondansetron is most effective for
 *    chemotherapy-induced nausea via this route).
 *
 * 4. **Cortical/limbic** (pain, emotional, anticipatory nausea): no specific receptor target.
 *
 * PONV severity in simulation:
 * - Low (0-1 factors): baseline, no intervention needed
 * - Moderate (2 factors): one prophylactic antiemetic indicated
 * - High (3-4 factors): multimodal prophylaxis indicated (TIVA instead of volatiles,
 *   2 antiemetics from different classes, minimize opioids)
 *
 * DEXAMETHASONE: already in drug database, has proven PONV prophylaxis efficacy (one
 * of the two most commonly used first-line PONV agents). Its mechanism: reduces
 * prostaglandin synthesis and directly reduces 5-HT release at the CTZ. Corticosteroids
 * for PONV are given BEFORE induction (not rescue), with maximum effect in first 24h.
 *
 * Source: Apfel CC et al. NEJM 2004; Gan TJ et al. Anesth Analg 2014 (PONV consensus
 * guidelines); Watcha MF & White PF Anesthesiology 1992 (vomiting center pathways).
 */

export interface PONVInputs {
  // Apfel score factors
  femaleSex?: boolean;
  isNonSmoker?: boolean;
  historyPONV?: boolean;
  postopOpioidUse?: boolean; // whether patient is expected to use or is using postop opioids

  // Modifiable intraoperative factors (beyond Apfel)
  usedVolatileAnesthesia?: boolean; // volatile agents significantly increase PONV risk vs TIVA
  usedN2O?: boolean; // N2O adds PONV risk (~double risk vs no N2O)
  durationHours?: number; // longer cases → more PONV risk

  // Antiemetic drugs administered (Ce from PKPDEngine)
  ondansetronCe?: number; // 5-HT3 antagonist
  dexamethasoneCe?: number; // corticosteroid
  metoclopramideCe?: number; // D2/5-HT3 antagonist + prokinetic
  scopolamineCe?: number; // muscarinic antagonist (transdermal patch, if modeled)

  // Hormonal PONV risk contribution (from SexHormoneModel)
  hormonalPONVRisk?: number; // 0-1, from SexHormoneModel.ponvRiskFromHormones

  // Current operative phase (PONV primarily relevant post-emergence)
  surgicalPhase?: string;
}

export interface PONVOutput {
  apfelScore: number; // 0-4
  baselinePONVProbability: number; // 0-1, from Apfel table
  modifiedPONVRisk: number; // 0-1, adjusted for volatile/N2O/duration
  antiemeticCoverage: number; // 0-1, antiemetic effect reducing PONV risk
  residualPONVRisk: number; // 0-1, remaining risk after prophylaxis
  prophylaxisRecommendation: 'none' | 'single' | 'multimodal';
  tivaBenefit: boolean; // whether TIVA would meaningfully reduce this patient's risk
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Apfel probability table: 0-4 factors → % risk
const APFEL_PROBABILITY = [0.10, 0.21, 0.39, 0.61, 0.79];

export class PONVModel {
  static tick(inputs: PONVInputs = {}): PONVOutput {
    const femaleSex = !!inputs.femaleSex;
    const isNonSmoker = inputs.isNonSmoker !== false; // default assume non-smoker
    const historyPONV = !!inputs.historyPONV;
    const postopOpioidUse = !!inputs.postopOpioidUse;
    const usedVolatileAnesthesia = inputs.usedVolatileAnesthesia !== false;
    const usedN2O = !!inputs.usedN2O;
    const durationHours = Math.max(0, safeNumber(inputs.durationHours, 1));
    const hormonalRisk = clamp(safeNumber(inputs.hormonalPONVRisk, 0), 0, 1);

    const ondansetronCe = Math.max(0, safeNumber(inputs.ondansetronCe, 0));
    const dexamethasoneCe = Math.max(0, safeNumber(inputs.dexamethasoneCe, 0));
    const metoclopramideCe = Math.max(0, safeNumber(inputs.metoclopramideCe, 0));

    // Apfel score
    const apfelScore = (femaleSex ? 1 : 0) + (isNonSmoker ? 1 : 0) + (historyPONV ? 1 : 0) + (postopOpioidUse ? 1 : 0);
    const baselinePONVProbability = APFEL_PROBABILITY[apfelScore] || 0.10;

    // Modifiers beyond Apfel
    let modifiedRisk = baselinePONVProbability + hormonalRisk * 0.05;
    if (usedVolatileAnesthesia) modifiedRisk *= 1.4; // volatiles increase PONV ~40%
    if (usedN2O) modifiedRisk *= 1.3; // N2O adds ~30% additional risk
    modifiedRisk += Math.min(0.15, (durationHours - 1) * 0.03); // duration beyond 1h
    modifiedRisk = clamp(modifiedRisk, 0, 1);

    // Antiemetic efficacy (each drug reduces risk by its class efficacy)
    const ondansetronEffect = ondansetronCe > 0 ? 0.3 * (ondansetronCe / (ondansetronCe + 0.1)) : 0; // 5-HT3 blockade
    const dexamethasoneEffect = dexamethasoneCe > 0 ? 0.25 * (dexamethasoneCe / (dexamethasoneCe + 0.5)) : 0;
    const metoclopramideEffect = metoclopramideCe > 0 ? 0.15 * (metoclopramideCe / (metoclopramideCe + 0.5)) : 0;
    // Combined effect is additive but with diminishing returns (can't exceed 1)
    const antiemeticCoverage = clamp(ondansetronEffect + dexamethasoneEffect + metoclopramideEffect, 0, 0.85);
    const residualPONVRisk = modifiedRisk * (1 - antiemeticCoverage);

    const prophylaxisRecommendation: PONVOutput['prophylaxisRecommendation'] =
      apfelScore <= 1 ? 'none' : apfelScore === 2 ? 'single' : 'multimodal';

    const tivaBenefit = usedVolatileAnesthesia && apfelScore >= 2;

    return {
      apfelScore,
      baselinePONVProbability: parseFloat(baselinePONVProbability.toFixed(3)),
      modifiedPONVRisk: parseFloat(modifiedRisk.toFixed(3)),
      antiemeticCoverage: parseFloat(antiemeticCoverage.toFixed(3)),
      residualPONVRisk: parseFloat(residualPONVRisk.toFixed(3)),
      prophylaxisRecommendation,
      tivaBenefit
    };
  }
}
