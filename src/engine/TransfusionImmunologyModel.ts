/**
 * Transfusion Immunology Model: TRALI, HIT, and Type-II Transfusion Reactions
 *
 * Phase 6, Stage B of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * Three immunologic complications of blood products that each produce a distinct,
 * high-yield clinical crisis with no prior representation in this codebase:
 *
 * === TRALI (Transfusion-Related Acute Lung Injury) ===
 *
 * The leading cause of transfusion-related mortality. Bimodal mechanism (both must be
 * explained, as the field itself debated these for decades):
 *
 * 1. **Antibody-mediated (classic, "two-hit" model)**: Donor anti-HLA class I/II or
 *    anti-neutrophil antibodies (present in ~0.01-0.1% of multi-parous female donors
 *    in the pre-leukoreduction era, now dramatically reduced by male-only plasma policy)
 *    bind to recipient neutrophil antigens → neutrophil activation → pulmonary
 *    capillary neutrophil sequestration → reactive oxygen species and protease release
 *    → endothelial damage → non-cardiogenic pulmonary edema (↑capillary permeability,
 *    NOT elevated PCWP -- key distinguishing feature from cardiogenic edema).
 *
 * 2. **Two-hit model**: Pre-existing recipient "first hit" (surgery, infection,
 *    existing inflammatory state) primes neutrophils, making them hypersensitive to
 *    the "second hit" of transfusion -- explains why TRALI preferentially affects
 *    critically ill patients even with non-implicated blood products.
 *
 * Onset: WITHIN 6 HOURS of transfusion (most within 1-2h). Key distinguishing features
 * from other post-transfusion complications: non-cardiogenic pulmonary edema (PCWP
 * normal, CVP-driven, PaO2/FiO2 <200, bilateral infiltrates), fever, hypotension.
 * Treatment: supportive (O2, mechanical ventilation), stop offending product, steroids
 * have no proven benefit -- this model does NOT grant a corticosteroid "fix."
 *
 * === HIT (Heparin-Induced Thrombocytopenia) ===
 *
 * A drug-induced, antibody-mediated, paradoxically THROMBOTIC disorder:
 *
 * 1. Heparin binds Platelet Factor 4 (PF4) → heparin-PF4 complexes become antigenic
 * 2. After 5-10 days of heparin exposure, IgG antibodies form against heparin-PF4
 * 3. Antibodies cross-link FcγRIIa receptors on platelets → massive platelet activation
 *    → platelet microparticles → thrombin generation → THROMBOSIS (not just low platelets)
 * 4. Platelets consumed → thrombocytopenia (typically 50% fall in platelet count from
 *    baseline) -- but SIMULTANEOUSLY massive thrombin generation causes DVT/PE/arterial
 *    thrombosis in ~30-50% of untreated HIT patients.
 *
 * The "4T score" (Thrombocytopenia severity, Timing relative to heparin, Thrombosis
 * presence, other explanations for Thrombocytopenia -- neTherefore) is the validated
 * clinical prediction rule. This model computes the 4T score equivalent continuously.
 *
 * Critical teaching: HIT is NOT a simple "heparin causes low platelets" story -- it is
 * a thrombotic disorder that happens to have low platelets. Stopping heparin alone is
 * insufficient; alternative anticoagulation is mandatory because the thrombotic risk
 * PERSISTS for weeks after heparin is stopped due to ongoing anti-PF4 antibody-mediated
 * platelet activation.
 *
 * === Type-II Acute Hemolytic Transfusion Reaction (ABO Incompatibility) ===
 *
 * Transfusion of ABO-incompatible blood (e.g., group A blood to a group O patient)
 * activates complement → massive intravascular hemolysis → free hemoglobin → hemoglobin
 * precipitation in renal tubules → acute tubular necrosis + shock + DIC.
 * Real-world etiology: patient identification error or sample labeling error.
 * This model triggers on a pre-existing `patient.bloodTypeMismatch` flag
 * (set by a case preset or an Attending AI action) rather than attempting to model
 * the actual blood typing system, which would require blood group genotyping infrastructure
 * this codebase doesn't have.
 *
 * Source: Toy et al. Blood 2012 (TRALI definition); Arepally GM NEJM 2017 (HIT review);
 * general transfusion medicine principles. Not a specific Miller's citation; disclosed per
 * this project's standing convention.
 */

export interface TransfusionImmunologyInputs {
  // TRALI inputs
  ffpVolumeReceivedMl?: number; // cumulative FFP received this case (highest TRALI risk)
  plateletsVolumeReceivedMl?: number;
  wbcVolumeReceivedMl?: number; // whole blood or pRBC
  existingInflammation?: boolean; // "first hit" (surgery, sepsis, trauma, existing lung disease)
  prevTraliRisk?: number; // 0-1, carried forward for progression

  // HIT inputs
  heparinCe?: number; // current heparin effect-site concentration
  heparinExposureDays?: number; // cumulative days of heparin exposure (carried forward)
  prevPlateletCountK?: number; // baseline platelet count for 4T score (% fall computation)
  currentPlateletCountK?: number; // from CoagulationCascadeModel
  newThrombosisDetected?: boolean; // clinical or radiographic thrombosis found
  prevHitAntibodyScore?: number; // 0-1, HIT antibody development probability
  prevHitLogged?: boolean;

  // Type-II ABO incompatibility
  bloodTypeMismatch?: boolean; // scenario flag for wrong blood type transfusion event

  dt?: number; // seconds
}

export interface TransfusionImmunologyOutput {
  // TRALI
  traliRisk: number; // 0-1 cumulative risk
  traliActive: boolean;
  traliCompliance: number; // additional compliance penalty for RespiratoryEngine (-ve, cmH2O)
  traliResistance: number; // additional resistance penalty

  // HIT
  fourTScore: number; // 0-8, HIT pre-test probability
  hitProbability: 'low' | 'intermediate' | 'high';
  hitActive: boolean; // antibody-mediated platelet activation occurring
  hitProThrombotic: boolean; // mandatory alternative anticoagulation needed
  plateletEffectFromHit: number; // additional platelet consumption rate (k/μL per second)
  procoagulantEffectFromHit: number; // pro-coagulant multiplier (↑clot formation, ↑INR paradox)
  hitAntibodyScore: number;

  // ABO incompatibility
  hemolysisActive: boolean;
  hemolysisIntensity: number; // 0-1

  // For state carry-forward
  prevTraliRisk: number;
  prevHitAntibodyScore: number;
  prevHitLogged: boolean;
  heparinExposureDays: number;

  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class TransfusionImmunologyModel {
  static tick(inputs: TransfusionImmunologyInputs = {}): TransfusionImmunologyOutput {
    const events: string[] = [];
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));

    // ============================================================
    // TRALI
    // ============================================================
    const ffpMl = Math.max(0, safeNumber(inputs.ffpVolumeReceivedMl, 0));
    const pltMl = Math.max(0, safeNumber(inputs.plateletsVolumeReceivedMl, 0));
    const existingInflammation = !!inputs.existingInflammation;
    let traliRisk = clamp(safeNumber(inputs.prevTraliRisk, 0), 0, 1);

    // TRALI risk accumulates with each plasma-containing product given,
    // amplified by existing recipient inflammation ("two-hit" priming).
    // FFP has the highest risk (contains anti-HLA/anti-neutrophil antibodies from
    // multiparous female donors if not screened), platelets are intermediate.
    const ffpUnits = ffpMl / 250;
    const pltUnits = pltMl / 250;
    const baseTraliRiskPerUnit = 0.002; // ~0.2% TRALI risk per unit (literature-reported incidence ~1:5000-1:12000 per unit for screened products)
    const inflammationMultiplier = existingInflammation ? 4.0 : 1.0; // critically ill patients have 4× higher TRALI risk
    traliRisk = clamp(traliRisk + (ffpUnits + pltUnits * 0.5) * baseTraliRiskPerUnit * inflammationMultiplier, 0, 1);

    const traliActive = traliRisk > 0.3;
    if (traliActive && !inputs.prevTraliRisk || (traliRisk > 0.3 && safeNumber(inputs.prevTraliRisk, 0) <= 0.3)) {
      events.push("🚨 CRITICAL: TRALI (Transfusion-Related Acute Lung Injury) -- acute hypoxemia with bilateral pulmonary infiltrates within 6h of transfusion. Non-cardiogenic pulmonary edema (normal PCWP, elevated PaO2/FiO2 ratio <200). STOP the offending blood product, provide respiratory support. Corticosteroids NOT proven beneficial. Report to blood bank immediately.");
    }

    // TRALI-specific lung physiology: massive neutrophilic pulmonary infiltration
    // → increased permeability → decreased compliance + increased resistance
    const traliCompliance = traliActive ? -15 * (traliRisk - 0.3) / 0.7 : 0; // cmH2O
    const traliResistance = traliActive ? 8 * (traliRisk - 0.3) / 0.7 : 0;

    // ============================================================
    // HIT (Heparin-Induced Thrombocytopenia)
    // ============================================================
    const heparinCe = Math.max(0, safeNumber(inputs.heparinCe, 0));
    let heparinExposureDays = Math.max(0, safeNumber(inputs.heparinExposureDays, 0));
    let prevHitAntibodyScore = clamp(safeNumber(inputs.prevHitAntibodyScore, 0), 0, 1);
    let prevHitLogged = !!inputs.prevHitLogged;
    const currentPlatelet = clamp(safeNumber(inputs.currentPlateletCountK, 250), 0, 1200);
    const prevPlatelet = clamp(safeNumber(inputs.prevPlateletCountK, 250), 0, 1200);
    const newThrombosisDetected = !!inputs.newThrombosisDetected;

    // Heparin exposure accumulates over time (critically: HIT typically appears on day 5-10
    // of FIRST heparin exposure; rapid-onset HIT can occur on re-exposure within 100 days)
    if (heparinCe > 0.1) {
      heparinExposureDays += dt / (24 * 3600);
    }

    // HIT antibody development probability (IgG anti-PF4): rises after day 4-5 of heparin
    // exposure, peaks around day 7-14, reflects real antibody kinetics
    let hitAntibodyScore = prevHitAntibodyScore;
    if (heparinExposureDays > 4 && heparinCe > 0.1) {
      const antibodyRiseRate = Math.log(2) / (3 * 24 * 3600); // peaks over ~72h after day 4
      hitAntibodyScore = clamp(hitAntibodyScore + antibodyRiseRate * dt * (heparinExposureDays / 10), 0, 1);
    }

    // 4T Score computation (validated HIT prediction rule):
    // Each category: 0-2 points → max 8 points total
    // T1: Thrombocytopenia severity (% fall from baseline)
    const pltFall = prevPlatelet > 0 ? (prevPlatelet - currentPlatelet) / prevPlatelet : 0;
    const t1_thrombocytopenia = pltFall > 0.5 ? 2 : pltFall > 0.3 ? 1 : 0;

    // T2: Timing (day 5-10 typical; rapid onset in re-exposure)
    const t2_timing = (heparinExposureDays >= 5 && heparinExposureDays <= 14) ? 2 :
                      (heparinExposureDays >= 4) ? 1 : 0;

    // T3: Thrombosis (new VTE/arterial event greatly increases probability)
    const t3_thrombosis = newThrombosisDetected ? 2 : 0;

    // T4: Other causes of thrombocytopenia (inversely scored -- if obvious other cause, score=0)
    // Simplified: if this simulation involves a sepsis/DIC case (other plausible cause),
    // score is reduced. No clear alternative cause → score 2.
    const t4_other_causes = 2; // simplified -- most simulation cases without explicit other cause get 2

    const fourTScore = t1_thrombocytopenia + t2_timing + t3_thrombosis + t4_other_causes;
    const hitProbability: 'low' | 'intermediate' | 'high' = fourTScore <= 3 ? 'low' : fourTScore <= 5 ? 'intermediate' : 'high';

    // HIT is "active" when antibodies are forming in the context of heparin exposure
    // AND 4T score suggests intermediate/high probability
    const hitActive = hitAntibodyScore > 0.3 && (fourTScore >= 4) && heparinCe > 0.05;
    const hitProThrombotic = hitActive && fourTScore >= 6;

    // Platelet effect: HIT causes consumption via antibody-mediated activation
    const plateletEffectFromHit = hitActive ? -0.05 * hitAntibodyScore : 0; // additional k/μL per second depletion

    // Pro-coagulant effect: paradoxical thrombin generation from platelet microparticle release
    const procoagulantEffectFromHit = hitActive ? 1.0 + 0.5 * hitAntibodyScore : 1.0;

    if (hitActive && !prevHitLogged) {
      events.push("🚨 CRITICAL: Heparin-Induced Thrombocytopenia (HIT) detected (4T score " + fourTScore + "/8 -- " + hitProbability + " probability). STOP ALL heparin (including flushes, heparin-coated lines). START alternative anticoagulation IMMEDIATELY (argatroban, bivalirudin, or fondaparinux) -- paradoxical THROMBOSIS risk persists for weeks after heparin discontinuation. Order anti-PF4 antibody testing.");
      prevHitLogged = true;
    } else if (!hitActive && prevHitLogged) {
      prevHitLogged = false;
    }

    // ============================================================
    // Type-II ABO Incompatibility (wrong blood event)
    // ============================================================
    const bloodTypeMismatch = !!inputs.bloodTypeMismatch;
    const hemolysisActive = bloodTypeMismatch;
    const hemolysisIntensity = bloodTypeMismatch ? 0.9 : 0; // near-immediate severe hemolysis

    if (bloodTypeMismatch && !(inputs as any).__hemolysisAlreadyLogged) {
      events.push("🚨 CATASTROPHIC: ABO-INCOMPATIBLE TRANSFUSION! Complement-mediated intravascular hemolysis triggered. Signs: fever, back/flank pain, hemoglobinuria, DIC, shock, acute tubular necrosis. STOP transfusion immediately, return unit to blood bank, aggressive IV fluid resuscitation, treat DIC, emergency nephrology.");
    }

    return {
      traliRisk: parseFloat(traliRisk.toFixed(4)),
      traliActive,
      traliCompliance: parseFloat(traliCompliance.toFixed(2)),
      traliResistance: parseFloat(traliResistance.toFixed(2)),
      fourTScore,
      hitProbability,
      hitActive,
      hitProThrombotic,
      plateletEffectFromHit: parseFloat(plateletEffectFromHit.toFixed(6)),
      procoagulantEffectFromHit: parseFloat(procoagulantEffectFromHit.toFixed(4)),
      hitAntibodyScore: parseFloat(hitAntibodyScore.toFixed(4)),
      hemolysisActive,
      hemolysisIntensity: parseFloat(hemolysisIntensity.toFixed(2)),
      prevTraliRisk: traliRisk,
      prevHitAntibodyScore: hitAntibodyScore,
      prevHitLogged,
      heparinExposureDays: parseFloat(heparinExposureDays.toFixed(4)),
      events
    };
  }
}
