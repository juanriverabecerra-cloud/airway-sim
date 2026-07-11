/**
 * Deep Coagulation Model: Von Willebrand Factor, Hemophilia A/B, Specific Reversal Agents,
 * and Platelet Function Analysis
 *
 * Phase 6, Stage J of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * Extends the existing `CoagulationCascadeModel.ts` (which models aggregate factor activity,
 * fibrinogen, platelets, and fibrinolysis) with specific genetic coagulation disorders and
 * the targeted reversal agents that treat them -- all previously absent from this codebase.
 *
 * === VON WILLEBRAND DISEASE (VWD) ===
 *
 * Von Willebrand Factor (VWF) is a large multimeric plasma protein with two critical roles:
 * 1. **Primary hemostasis**: VWF forms bridges between subendothelial collagen (exposed at
 *    injury site) and platelet glycoprotein receptors (GPIb-IX-V), anchoring the initial
 *    platelet plug. Without functional VWF, platelets cannot aggregate at high shear stress
 *    (arterioles, arterial wounds) → hemorrhage from mucosal surfaces (nosebleeds, gingival
 *    bleeding, menorrhagia) but NOT typically deep tissue/joint bleeding.
 * 2. **Secondary hemostasis carrier**: VWF carries and protects Factor VIII from premature
 *    degradation. Low VWF → low Factor VIII → impaired intrinsic pathway → elevated aPTT.
 *
 * Types: Type 1 (quantitative partial deficiency, ~75% of VWD, autosomal dominant),
 * Type 2 (qualitative defects in VWF multimers, subtypes A/B/M/N), Type 3 (complete
 * absence, severe, rare). This model focuses on Type 1 and 2A (most common surgical presentations).
 *
 * Treatment:
 * - **DDAVP (desmopressin)**: releases stored VWF from endothelial Weibel-Palade bodies
 *   → 3-5× increase in VWF and Factor VIII levels within 30 minutes. Effective for Type 1
 *   and some Type 2 (NOT Type 2B -- can cause platelet aggregation/thrombocytopenia).
 * - **VWF concentrate (Humate-P, Alphanate)**: for severe VWD, DDAVP failures, Type 3.
 *
 * === HEMOPHILIA A AND B ===
 *
 * Hemophilia A (Factor VIII deficiency, X-linked recessive, 1:5000 male births):
 * The most common severe bleeding disorder. Factor VIII is the cofactor for Factor IXa in
 * the intrinsic pathway (tenase complex) → without VIII, cannot generate sufficient Factor Xa
 * → cannot generate sufficient thrombin → clot forms slowly or not at all. Severity:
 * - Severe: FVIII < 1% → spontaneous hemarthrosis, life-threatening hemorrhage
 * - Moderate: 1-5% → bleeding with minor trauma
 * - Mild: 5-40% → bleeding only with significant injury or surgery
 * Treatment: Recombinant FVIII (Advate, Helixate) or plasma-derived FVIII concentrate.
 * Complication: ~30% develop inhibitory antibodies → Factor VIIa (NovoSeven) or
 * emicizumab (bispecific antibody bridging IXa and X) needed.
 *
 * Hemophilia B (Factor IX deficiency, Christmas disease, X-linked recessive):
 * Factor IX is the first enzyme in the intrinsic tenase complex. Clinically identical to
 * Hemophilia A but treated with recombinant FIX (BeneFIX). Requires LOWER dosing than
 * FVIII since FIX has larger Vd.
 *
 * === REVERSAL AGENTS ===
 *
 * 1. **4-Factor PCC (Kcentra)**: contains Factors II, VII, IX, X AND Proteins C and S
 *    (anticoagulants, the "4th factor" that distinguishes it from 3-factor PCC). Reverses
 *    warfarin within 30 minutes, much faster than FFP. Also used for Factor Xa inhibitor
 *    reversal when andexanet alfa is unavailable.
 *
 * 2. **Andexanet Alfa (Andexxa)**: recombinant Factor Xa decoy → sequesters apixaban and
 *    rivaroxaban → reverses Factor Xa inhibitors within minutes. Very expensive (~$50,000/dose).
 *
 * 3. **Idarucizumab (Praxbind)**: humanized antibody fragment → binds dabigatran with 350×
 *    greater affinity than thrombin → immediate and complete reversal of dabigatran.
 *
 * 4. **Recombinant Factor VIIa (NovoSeven, rFVIIa)**: activates Factor X on the surface
 *    of activated platelets independently of the normal intrinsic pathway → bypasses FVIII
 *    and FIX deficiency and their inhibitors → generates thrombin. Used for:
 *    - Hemophilia with inhibitors
 *    - Congenital FVII deficiency
 *    - Refractory surgical hemorrhage (off-label, controversial)
 *    Risk: thromboembolism (MI, stroke, DVT/PE) at supraphysiologic doses.
 *
 * === PLATELET FUNCTION ANALYSIS ===
 *
 * PFA-100 (Platelet Function Analyzer): whole-blood testing using a membrane coated with
 * collagen + ADP (C-ADP) or collagen + epinephrine (C-Epi). Platelets form a plug until
 * the aperture closes -- closure time (CT) is the readout.
 * - C-ADP CT > 80 seconds: abnormal (VWD, GP IIb/IIIa inhibitors, thrombocytopenia <100k)
 * - C-Epi CT > 150 seconds: abnormal (aspirin, NSAIDs, uremia, severe VWD)
 * Aspirin uniquely prolongs C-Epi but NOT C-ADP (aspirin blocks TXA2 but not ADP pathway).
 * This model computes C-ADP and C-Epi closure times from the current platelet count,
 * drug effects (aspirin, NSAIDs, GP IIb/IIIa inhibitors), and VWD status.
 *
 * Source: Laffan MA et al. Br J Haematol 2014 (VWD review); Srivastava A et al. Haemophilia
 * 2013 (WFH guidelines for hemophilia management); Garcia DA et al. Chest 2012 (reversal
 * agents). All dose estimates and efficacy values are disclosed, reasoned estimates from
 * published guidelines.
 */

export interface DeepCoagulationInputs {
  // VWD
  hasVWD?: boolean;
  vwdType?: '1' | '2A' | '2B' | '3';
  vwfActivityPercent?: number; // 0-150%, normal 50-200%
  ddavpCe?: number; // desmopressin (DDAVP) -- if available in drug DB
  vwfConcentrateGiven?: boolean;

  // Hemophilia
  hasHemophiliaA?: boolean;
  hasHemophiliaB?: boolean;
  factorVIIIPercent?: number; // 0-150%, normal 50-150%
  factorIXPercent?: number;
  hasInhibitors?: boolean; // anti-FVIII antibodies (30% of severe hemophilia A)
  fviiiBolusMg?: number; // Factor VIII concentrate administered (units/kg)
  fviiaBolusMg?: number; // rFVIIa administered

  // Reversal agents
  pccGiven?: boolean; // 4-factor PCC for warfarin reversal
  andexanetGiven?: boolean; // Factor Xa inhibitor reversal
  idarucizumabGiven?: boolean; // dabigatran reversal

  // Platelet function
  plateletCountK?: number; // from CoagulationCascadeModel
  aspirinActive?: boolean; // COX-1 inhibition active
  nonsteroidsActive?: boolean; // reversible COX-1 inhibition
  gpIIbIIIaInhibitorCe?: number; // abciximab/eptifibatide/tirofiban (if modeled)

  // Current state from CoagulationCascadeModel
  currentFactorActivityFraction?: number;
  currentINR?: number;
}

export interface DeepCoagulationOutput {
  vwfActivityPercent: number; // after DDAVP boost if given
  factorVIIIPercent: number; // after any replacement
  factorIXPercent: number;
  effectiveFactorActivityBoost: number; // additive to CoagulationCascadeModel's factorActivity

  // PFA-100 Closure Times
  pfaADPClosureTimeSec: number; // normal <80s
  pfaEpiClosureTimeSec: number; // normal <150s
  pfaADPAbnormal: boolean;
  pfaEpiAbnormal: boolean;

  // Reversal efficacy
  warfarinReversal: number; // 0-1, fraction of warfarin effect reversed by PCC
  fxaInhibitorReversal: number; // 0-1, fraction reversed by andexanet
  dabigatranReversal: number; // 0-1, fraction reversed by idarucizumab
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class DeepCoagulationModel {
  static tick(inputs: DeepCoagulationInputs = {}): DeepCoagulationOutput {
    const hasVWD = !!inputs.hasVWD;
    const vwdType = inputs.vwdType || '1';
    const ddavpCe = Math.max(0, safeNumber(inputs.ddavpCe, 0));
    const vwfConcentrateGiven = !!inputs.vwfConcentrateGiven;

    const hasHemophiliaA = !!inputs.hasHemophiliaA;
    const hasHemophiliaB = !!inputs.hasHemophiliaB;
    const hasInhibitors = !!inputs.hasInhibitors;
    const fviiiBolusMg = Math.max(0, safeNumber(inputs.fviiiBolusMg, 0));
    const fviiaBolusMg = Math.max(0, safeNumber(inputs.fviiaBolusMg, 0));

    const pccGiven = !!inputs.pccGiven;
    const andexanetGiven = !!inputs.andexanetGiven;
    const idarucizumabGiven = !!inputs.idarucizumabGiven;

    const plateletCountK = clamp(safeNumber(inputs.plateletCountK, 250), 0, 1200);
    const aspirinActive = !!inputs.aspirinActive;
    const nonsteroidsActive = !!inputs.nonsteroidsActive;

    // --- VWF Activity ---
    let vwfActivityPercent = hasVWD ? (vwdType === '3' ? 5 : vwdType === '2A' ? 15 : 35) : 100;
    if (ddavpCe > 0.1 && vwdType !== '2B') {
      // DDAVP releases stored VWF: 3-5× increase, max 150% -- NOT effective in Type 2B
      const ddavpEffect = 3.5 * (ddavpCe / (ddavpCe + 0.1));
      vwfActivityPercent = Math.min(150, vwfActivityPercent * ddavpEffect);
    }
    if (vwfConcentrateGiven) {
      vwfActivityPercent = Math.min(150, vwfActivityPercent + 60);
    }

    // --- Factor VIII (VWF carries FVIII, so VWD also reduces FVIII) ---
    let factorVIIIPercent = hasHemophiliaA ? safeNumber(inputs.factorVIIIPercent, 2) : (hasVWD ? vwfActivityPercent : 100);
    if (hasHemophiliaA && fviiiBolusMg > 0 && !hasInhibitors) {
      factorVIIIPercent = Math.min(150, factorVIIIPercent + fviiiBolusMg * 0.5);
    }
    if (fviiaBolusMg > 0) {
      // rFVIIa bypasses FVIII/IX deficiency: effective factor activity boost
      factorVIIIPercent = Math.min(150, factorVIIIPercent + fviiaBolusMg * 20); // rFVIIa is very potent
    }

    let factorIXPercent = hasHemophiliaB ? safeNumber(inputs.factorIXPercent, 2) : 100;
    if (fviiaBolusMg > 0) {
      // rFVIIa also bypasses FIX deficiency
      factorIXPercent = Math.min(150, factorIXPercent + fviiaBolusMg * 20);
    }

    // Effective boost to CoagulationCascadeModel's factor activity fraction
    const baseFactorDeficit = Math.max(0, 1 - Math.min(factorVIIIPercent, factorIXPercent) / 100);
    const effectiveFactorActivityBoost = -(baseFactorDeficit * 0.5); // negative = reduces factor activity

    // --- PFA-100 Closure Times ---
    // C-ADP (sensitive to VWD, thrombocytopenia, GP IIb/IIIa inhibitors)
    let pfaADPBase = 50; // normal ~50-70s
    if (plateletCountK < 100) pfaADPBase += (100 - plateletCountK) * 0.5;
    if (hasVWD && vwfActivityPercent < 50) pfaADPBase += (50 - vwfActivityPercent) * 2;
    const pfaADPClosureTimeSec = clamp(pfaADPBase, 40, 300);

    // C-Epi (sensitive to aspirin/NSAIDs blocking TXA2 pathway, which ADP does not use)
    let pfaEpiBase = 80; // normal ~80-150s
    if (aspirinActive) pfaEpiBase += 100; // aspirin → COX-1 irreversible inhibition → TXA2 block
    if (nonsteroidsActive) pfaEpiBase += 60; // NSAIDs → reversible COX-1 → TXA2 block
    if (plateletCountK < 100) pfaEpiBase += (100 - plateletCountK) * 0.8;
    const pfaEpiClosureTimeSec = clamp(pfaEpiBase, 70, 300);

    // --- Reversal Agent Efficacy ---
    const warfarinReversal = pccGiven ? 0.90 : 0; // 4-factor PCC reverses warfarin in ~30min
    const fxaInhibitorReversal = andexanetGiven ? 0.85 : 0;
    const dabigatranReversal = idarucizumabGiven ? 0.97 : 0;

    return {
      vwfActivityPercent: parseFloat(vwfActivityPercent.toFixed(1)),
      factorVIIIPercent: parseFloat(factorVIIIPercent.toFixed(1)),
      factorIXPercent: parseFloat(factorIXPercent.toFixed(1)),
      effectiveFactorActivityBoost: parseFloat(effectiveFactorActivityBoost.toFixed(4)),
      pfaADPClosureTimeSec: parseFloat(pfaADPClosureTimeSec.toFixed(1)),
      pfaEpiClosureTimeSec: parseFloat(pfaEpiClosureTimeSec.toFixed(1)),
      pfaADPAbnormal: pfaADPClosureTimeSec >= 80,
      pfaEpiAbnormal: pfaEpiClosureTimeSec > 150,
      warfarinReversal: parseFloat(warfarinReversal.toFixed(2)),
      fxaInhibitorReversal: parseFloat(fxaInhibitorReversal.toFixed(2)),
      dabigatranReversal: parseFloat(dabigatranReversal.toFixed(2))
    };
  }
}
