/**
 * Pharmacogenomics Engine: CYP Polymorphisms, G6PD, VKORC1, and Drug Sensitivity Variability
 *
 * Phase 6, Stage C of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 *
 * Pharmacogenomics explains the "why" behind dramatically different patient responses to the
 * same drug dose -- a major source of adverse drug events and treatment failures. This engine
 * computes PKPDEngine clearance multipliers (k10 modifier) and PD sensitivity modifiers based
 * on the patient's genotype flags, making the same drug behave differently in different patients
 * according to real, well-validated genetic pharmacology.
 *
 * === CYP2D6 POLYMORPHISMS ===
 * CYP2D6 metabolizes ~25% of clinically-used drugs. Four phenotypes:
 * - **Poor Metabolizer (PM, ~7% Caucasians, ~2% Asians)**: LOF alleles on both copies → no
 *   CYP2D6 function → drugs normally cleared by CYP2D6 accumulate to toxic levels.
 *   - Codeine: NOT converted to active morphine → no analgesia (codeine is a prodrug). Worse:
 *     cannot cause opioid toxicity from codeine itself at standard doses, but may accumulate
 *     other codeine metabolites causing adverse effects.
 *   - Tramadol: reduced conversion to active O-desmethyltramadol → reduced analgesia; also
 *     accumulates N-desmethyltramadol → increased seizure risk.
 *   - Oxycodone: reduced conversion to oxymorphone → reduced analgesia.
 *   - Ondansetron: reduced clearance → higher Ce for same dose → increased QT prolongation
 *     risk (clinical FDA warning).
 * - **Ultra-Rapid Metabolizer (UM, ~1-10% by ethnicity)**: multiple CYP2D6 gene copies →
 *   massively accelerated clearance → codeine → excessive morphine → respiratory depression
 *   and DEATH (black-box warning in breastfeeding and pediatric populations). Documented
 *   fatalities. This is the "surprise" direction -- standard doses become supratherapeutic.
 * - **Extensive Metabolizer (EM, "normal", ~70%)**: baseline function.
 * - **Intermediate Metabolizer (IM, ~10-15%)**: one functional allele → partial reduction.
 *
 * === CYP2C9 POLYMORPHISMS ===
 * CYP2C9 metabolizes warfarin, NSAIDs (ibuprofen, celecoxib), phenytoin, glipizide.
 * - PM (*3/*3): >90% reduction in S-warfarin clearance → catastrophic warfarin toxicity at
 *   standard doses → massive anticoagulation; INR >10 on a standard 5mg warfarin dose.
 * - IM (*1/*3 or *2/*2): intermediate reduction.
 * - Combined with VKORC1: genotype-guided warfarin dosing is the best-validated
 *   pharmacogenomics clinical application.
 *
 * === CYP2C19 POLYMORPHISMS ===
 * CYP2C19 metabolizes PPIs (omeprazole, pantoprazole) and clopidogrel (prodrug requiring
 * CYP2C19 for activation).
 * - PM (*2/*2, *2/*3): PPIs are NOT cleared → much higher plasma PPI levels → better acid
 *   suppression (counterintuitively beneficial for PPIs, but toxic for clopidogrel).
 * - Clopidogrel PM: CANNOT convert clopidogrel to active thienopyridine → NO antiplatelet
 *   effect → stent thrombosis risk (FDA black-box warning since 2010). Major clinical impact
 *   in PCI/coronary stenting patients.
 * - UM: ultra-rapid clopidogrel activation → possible increased bleeding.
 *
 * === VKORC1 POLYMORPHISMS ===
 * VKORC1 encodes Vitamin K epoxide reductase -- warfarin's target enzyme. VKORC1 -1639 A
 * allele reduces enzyme expression → warfarin effect at lower doses.
 * Combined with CYP2C9 genotype → CPIC/IWPC dose algorithms used in clinical practice.
 *
 * === G6PD DEFICIENCY ===
 * Glucose-6-phosphate dehydrogenase deficiency → reduced glutathione regeneration →
 * oxidative hemolysis triggered by oxidizing drugs (primaquine, rasburicase, dapsone,
 * nitrofurantoin, methylene blue -- yes, the antidote for methemoglobinemia itself!).
 * X-linked → predominantly affects males (~8% African-American, ~5% Mediterranean males).
 * This engine identifies G6PD deficiency and prevents the automatic methylene blue "fix"
 * for methemoglobinemia when the patient has G6PD -- instead requiring ascorbic acid.
 *
 * Source: CPIC Guidelines (cpicpgx.org); FDA pharmacogenomics biomarker labels;
 * Relling & Evans Nat Rev Genet 2015. Clearance multipliers are disclosed,
 * reasoned estimates derived from published PK studies in genotyped populations.
 */

export type CYP2D6Phenotype = 'UM' | 'EM' | 'IM' | 'PM';
export type CYP2C9Phenotype = 'normal' | 'IM' | 'PM';
export type CYP2C19Phenotype = 'UM' | 'normal' | 'IM' | 'PM';

export interface PharmacogenomicsInputs {
  cyp2d6Phenotype?: CYP2D6Phenotype; // patient.cyp2d6Phenotype
  cyp2c9Phenotype?: CYP2C9Phenotype;
  cyp2c19Phenotype?: CYP2C19Phenotype;
  vkorc1SensitiveAllele?: boolean; // patient carries -1639 A allele (reduces warfarin dose requirement)
  g6pdDeficiency?: boolean;

  // Active drug Ce values from PKPDEngine
  codeineCe?: number;
  tramadolCe?: number;
  ondansetronCe?: number;
  oxycodoneCe?: number;
  warfarinCe?: number;
  clopidogrelCe?: number;
  pantoprazoleCe?: number;
  methyleneBlueCe?: number; // to detect contraindication in G6PD
}

export interface PharmacogenomicsOutput {
  // Per-drug clearance multipliers (fed into PKPDEngine.tick() k10 modifiers)
  codeineK10Multiplier: number; // UM: very fast → massive morphine; PM: no conversion
  tramadolK10Multiplier: number;
  ondansetronK10Multiplier: number;
  oxycodoneK10Multiplier: number;
  warfarinK10Multiplier: number; // CYP2C9 + VKORC1 combined
  clopidogrelActivationFraction: number; // 0-1, fraction of clopidogrel converted to active form

  // PD sensitivity modifiers
  codeineOpioidCeMultiplier: number; // UM: same dose → more morphine → more opioid effect
  clopidogrelAntiplateletEffect: number; // 0-1; PM = 0 (no antiplatelet protection → stent thrombosis risk)

  // Drug-specific consequences surfaced as clinical flags
  codeineUMRisk: boolean; // ultra-rapid codeine toxicity
  codeinepmNoEffect: boolean; // PM: codeine gives no analgesia
  clopidogrelPMStentRisk: boolean; // stent thrombosis risk if PM on clopidogrel
  g6pdMethyleneBlueContraindicated: boolean; // G6PD + methylene blue = hemolysis

  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// CYP2D6 clearance multipliers: UM=6× normal rate, IM=0.5×, PM=0.05× (near-zero)
const CYP2D6_CLEARANCE: Record<CYP2D6Phenotype, number> = { UM: 6.0, EM: 1.0, IM: 0.5, PM: 0.05 };
// CYP2C9 clearance multipliers: mainly for warfarin S-enantiomer
const CYP2C9_CLEARANCE: Record<CYP2C9Phenotype, number> = { normal: 1.0, IM: 0.4, PM: 0.05 };
// CYP2C19 clearance multipliers
const CYP2C19_CLEARANCE: Record<CYP2C19Phenotype, number> = { UM: 3.0, normal: 1.0, IM: 0.5, PM: 0.1 };

export class PharmacogenomicsEngine {
  static tick(inputs: PharmacogenomicsInputs = {}): PharmacogenomicsOutput {
    const events: string[] = [];

    const cyp2d6 = inputs.cyp2d6Phenotype || 'EM';
    const cyp2c9 = inputs.cyp2c9Phenotype || 'normal';
    const cyp2c19 = inputs.cyp2c19Phenotype || 'normal';
    const vkorc1Sensitive = !!inputs.vkorc1SensitiveAllele;
    const g6pdDeficiency = !!inputs.g6pdDeficiency;
    const methyleneBlueCe = Math.max(0, safeNumber(inputs.methyleneBlueCe, 0));
    const warfarinCe = Math.max(0, safeNumber(inputs.warfarinCe, 0));
    const clopidogrelCe = Math.max(0, safeNumber(inputs.clopidogrelCe, 0));
    const codeineCe = Math.max(0, safeNumber(inputs.codeineCe, 0));
    const ondansetronCe = Math.max(0, safeNumber(inputs.ondansetronCe, 0));

    const d6clearance = CYP2D6_CLEARANCE[cyp2d6] ?? 1.0;
    const c9clearance = CYP2C9_CLEARANCE[cyp2c9] ?? 1.0;
    const c19clearance = CYP2C19_CLEARANCE[cyp2c19] ?? 1.0;

    // --- CYP2D6-metabolized drugs ---
    const codeineK10Multiplier = d6clearance;
    const tramadolK10Multiplier = d6clearance;
    const ondansetronK10Multiplier = d6clearance;
    const oxycodoneK10Multiplier = d6clearance;

    // Codeine is a prodrug: CYP2D6 converts 10% of codeine to morphine.
    // UM: 6× conversion rate → potential 60% of dose becoming morphine → respiratory arrest
    // PM: near-zero conversion → no analgesia; codeine itself is not analgesic
    const codeineOpioidCeMultiplier = cyp2d6 === 'UM' ? 6.0 : cyp2d6 === 'PM' ? 0.05 : 1.0;

    // --- CYP2C9 + VKORC1: warfarin ---
    // VKORC1-1639A allele reduces warfarin dose requirement by ~25% per allele (homozygous
    // -1639A/A needs ~50% lower dose than GG for same INR, independent of CYP2C9)
    const vkorc1Factor = vkorc1Sensitive ? 0.6 : 1.0; // lower dose requirement = faster anticoagulation at standard dose
    const warfarinK10Multiplier = c9clearance * vkorc1Factor;

    // --- CYP2C19: clopidogrel activation ---
    // Clopidogrel itself is inactive; CYP2C19 converts it to the active thienopyridine metabolite.
    // PM: no CYP2C19 → no activation → no antiplatelet effect → stent thrombosis.
    const clopidogrelActivationFraction = Math.min(1, c19clearance / 3.0); // UM → full activation at lower Ce; PM → 0.033
    const clopidogrelAntiplateletEffect = clopidogrelCe > 0 ? clopidogrelActivationFraction : 0;

    // PPI clearance: CYP2C19 PM → much higher pantoprazole Ce → better acid suppression
    // (beneficial for PPIs, handled automatically by slower k10 in PKPDEngine for pantoprazole)

    // --- Clinical flags and events ---
    const codeineUMRisk = cyp2d6 === 'UM' && codeineCe > 0.1;
    const codeinepmNoEffect = cyp2d6 === 'PM' && codeineCe > 0.1;
    const clopidogrelPMStentRisk = cyp2c19 === 'PM' && clopidogrelCe > 0.1;
    const g6pdMethyleneBlueContraindicated = g6pdDeficiency && methyleneBlueCe > 0.01;

    if (codeineUMRisk) {
      events.push("🚨 CRITICAL: Codeine administered to a CYP2D6 Ultra-Rapid Metabolizer -- excessive conversion to morphine at standard codeine doses. Risk of respiratory depression and death (FDA black-box warning). Switch to a direct-acting opioid (oxycodone, hydromorphone, fentanyl) that does NOT require CYP2D6 bioactivation.");
    }
    if (codeinepmNoEffect) {
      events.push("⚠️ CLINICAL ALERT: Codeine is ineffective in this CYP2D6 Poor Metabolizer -- near-zero conversion to morphine means no meaningful analgesia. Use a direct-acting opioid instead.");
    }
    if (clopidogrelPMStentRisk) {
      events.push("🚨 CRITICAL: Clopidogrel administered to a CYP2C19 Poor Metabolizer -- no conversion to active metabolite → NO antiplatelet protection → STENT THROMBOSIS RISK if recently stented (FDA black-box warning since 2010). Switch to prasugrel or ticagrelor (CYP2C19-independent pathways).");
    }
    if (g6pdMethyleneBlueContraindicated) {
      events.push("🚨 CRITICAL: Methylene Blue is CONTRAINDICATED in G6PD deficiency -- the oxidizing mechanism that reduces MetHb will simultaneously cause oxidative hemolysis in G6PD-deficient red cells. Use Ascorbic Acid (Vitamin C) as an alternative reducing agent for methemoglobinemia treatment.");
    }

    return {
      codeineK10Multiplier,
      tramadolK10Multiplier,
      ondansetronK10Multiplier,
      oxycodoneK10Multiplier,
      warfarinK10Multiplier,
      clopidogrelActivationFraction,
      codeineOpioidCeMultiplier,
      clopidogrelAntiplateletEffect,
      codeineUMRisk,
      codeinepmNoEffect,
      clopidogrelPMStentRisk,
      g6pdMethyleneBlueContraindicated,
      events
    };
  }
}
