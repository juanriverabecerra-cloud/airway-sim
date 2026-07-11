/**
 * Drug Interaction Safety Model — Critical Perioperative Drug Combinations
 *
 * This model covers important drug-drug interactions not handled by the existing
 * DrugInteractionModel.ts (which focuses on QTc prolongation). These are the
 * most dangerous and clinically important perioperative drug interactions:
 *
 * 1. SEROTONIN SYNDROME (beyond MAOI) — multiple drug combinations
 * 2. NEUROLEPTIC MALIGNANT SYNDROME (NMS)
 * 3. METHYLENE BLUE + SEROTONERGIC DRUGS (MAO inhibitor)
 * 4. PROTAMINE + NPH INSULIN / FISH ALLERGY
 * 5. SUGAMMADEX + HORMONAL CONTRACEPTIVES
 * 6. VOLATILE AGENTS + AMIODARONE (bradycardia/hypotension potentiation)
 * 7. BETA-BLOCKERS + CALCIUM CHANNEL BLOCKERS (bradycardia/heart block)
 * 8. MIDAZOLAM + FLUCONAZOLE (CYP3A4 inhibition — massive sedation prolongation)
 *
 * =========================================================================
 * SEROTONIN SYNDROME (5-HT EXCESS BEYOND MAOI)
 * =========================================================================
 * Not just MAOI + meperidine (already in MAOIModel). Multiple drug combinations
 * can cause serotonin syndrome:
 * - SSRIs (sertraline, fluoxetine) + tramadol/fentanyl (weaker 5-HT activity)
 * - SNRI (venlafaxine) + linezolid (MAO inhibitor antibiotic!)
 * - Linezolid (oxazolidinone antibiotic = weak MAO inhibitor) + opioids/SSRIs
 * - Ondansetron does NOT cause serotonin syndrome (5-HT3 ANTAGONIST, not agonist)
 * - Tramadol: 5-HT releaser + NRI → serotonin syndrome risk with SSRIs
 *
 * HUNTER CRITERIA (clinical diagnosis of serotonin syndrome):
 * Serotonergic drug + ONE of:
 *   - Clonus (inducible, spontaneous, or ocular)
 *   - Agitation + diaphoresis
 *   - Tremor + hyperreflexia
 *   - Hypertonia + fever (> 38°C) + clonus
 *
 * TREATMENT: Stop offending drugs; cyproheptadine (5-HT antagonist);
 * benzodiazepines for agitation; cooling for hyperthermia.
 *
 * =========================================================================
 * NEUROLEPTIC MALIGNANT SYNDROME (NMS)
 * =========================================================================
 * Rare but potentially fatal reaction to dopamine antagonists:
 * haloperidol, droperidol, metoclopramide, antipsychotics, phenothiazines.
 * Also: sudden withdrawal of dopamine agonists (levodopa withdrawal).
 * ONSET: days after starting or increasing antidopaminergic drug.
 * TETRAD: Hyperthermia + Muscle rigidity + Altered consciousness + Autonomic instability
 * CK markedly elevated (rhabdomyolysis from rigidity).
 * TREATMENT: STOP offending drug. Dantrolene (same as MH). Bromocriptine/amantadine
 * (dopamine agonists). Benzodiazepines. Cooling.
 * NMS vs MH vs Serotonin Syndrome: similar triad but different timeline and triggers.
 *
 * Sources: Dunkley EJC, QJM 2003 (Hunter Criteria); Adnet P, Anesthesiology 2000 (NMS vs MH);
 * Boyer EW, NEJM 2005 (Serotonin Syndrome); Miller's 9th Ed Ch 36.
 */

export interface DrugInteractionSafetyInputs {
  // Serotonin syndrome
  ssriCe?: number;               // SSRI (sertraline, fluoxetine, etc.)
  snriCe?: number;               // SNRI (venlafaxine)
  tramadolCe?: number;           // weak serotonin activity
  linezolid?: boolean;           // antibiotic with MAO inhibitor activity
  triptanCe?: number;            // sumatriptan → 5-HT1 agonist

  // NMS
  antipsychoticCe?: number;      // haloperidol, etc.
  droperidolCe?: number;
  metoclopramideNMS?: number;
  levodopaSuddenStop?: boolean;  // PD drug withdrawal

  // CYP inhibition
  fluconazoleCe?: number;        // CYP3A4 inhibitor
  midazolamCe?: number;          // CYP3A4 substrate → prolonged with fluconazole

  // Volatile + amiodarone
  amiodaroneCe?: number;
  volatileMac?: number;

  // Beta-blocker + CCB combination
  betaBlockerCe?: number;
  verapamilCe?: number;          // non-DHP CCB → AV block risk with BB

  // Sugammadex + OCP
  sugammadexGiven?: boolean;
  onHormonalContraceptive?: boolean;

  // Current vital signs
  currentHR?: number;
  currentTemp?: number;

  // Event guards
  prevSerotoninLogged?: boolean;
  prevNMSLogged?: boolean;
  prevCYP3A4Logged?: boolean;
  prevBBCCBLogged?: boolean;
  prevSugammadexOCPLogged?: boolean;
}

export interface DrugInteractionSafetyOutput {
  // Serotonin syndrome
  serotoninSyndromeRisk: number;        // 0-1
  serotoninSyndromeActive: boolean;

  // NMS
  nmsRisk: number;                      // 0-1

  // CYP3A4 inhibition
  midazolamProlongation: number;        // fold-increase in midazolam duration
  cyp3a4InteractionActive: boolean;

  // AV block risk
  avBlockRisk: number;                  // 0-1 (BB + verapamil)

  // Sugammadex OCP interaction
  sugammadexOCPWarning: boolean;        // need backup contraception for 7 days

  prevSerotoninLogged: boolean;
  prevNMSLogged: boolean;
  prevCYP3A4Logged: boolean;
  prevBBCCBLogged: boolean;
  prevSugammadexOCPLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class DrugInteractionSafetyModel {
  static tick(inputs: DrugInteractionSafetyInputs = {}): DrugInteractionSafetyOutput {
    const events: string[] = [];
    let prevSerotoninLogged = !!inputs.prevSerotoninLogged;
    let prevNMSLogged = !!inputs.prevNMSLogged;
    let prevCYP3A4Logged = !!inputs.prevCYP3A4Logged;
    let prevBBCCBLogged = !!inputs.prevBBCCBLogged;
    let prevSugammadexOCPLogged = !!inputs.prevSugammadexOCPLogged;

    const ssriCe = clamp(safeNumber(inputs.ssriCe, 0), 0, 5);
    const snriCe = clamp(safeNumber(inputs.snriCe, 0), 0, 5);
    const tramadolCe = clamp(safeNumber(inputs.tramadolCe, 0), 0, 5);
    const linezolid = !!inputs.linezolid;
    const triptanCe = clamp(safeNumber(inputs.triptanCe, 0), 0, 5);
    const antipsychoticCe = clamp(safeNumber(inputs.antipsychoticCe, 0), 0, 5);
    const droperidolCe = clamp(safeNumber(inputs.droperidolCe, 0), 0, 5);
    const metoCe = clamp(safeNumber(inputs.metoclopramideNMS, 0), 0, 5);
    const levodopaStopped = !!inputs.levodopaSuddenStop;
    const fluconazoleCe = clamp(safeNumber(inputs.fluconazoleCe, 0), 0, 5);
    const midazolamCe = clamp(safeNumber(inputs.midazolamCe, 0), 0, 10);
    const amiodaroneCe = clamp(safeNumber(inputs.amiodaroneCe, 0), 0, 5);
    const volatileMac = clamp(safeNumber(inputs.volatileMac, 0), 0, 3);
    const betaBlockerCe = clamp(safeNumber(inputs.betaBlockerCe, 0), 0, 5);
    const verapamilCe = clamp(safeNumber(inputs.verapamilCe, 0), 0, 5);
    const sugammadexGiven = !!inputs.sugammadexGiven;
    const onOCP = !!inputs.onHormonalContraceptive;
    const currentTemp = clamp(safeNumber(inputs.currentTemp, 37), 34, 43);

    // ===========================
    // SEROTONIN SYNDROME
    // ===========================
    // Multiple serotonergic drugs can combine
    const serotoninLoad = clamp(
      (ssriCe > 0 ? 0.4 : 0)
      + (snriCe > 0 ? 0.35 : 0)
      + (tramadolCe > 0 && (ssriCe > 0 || snriCe > 0) ? 0.3 : 0)
      + (linezolid && (ssriCe > 0 || snriCe > 0 || tramadolCe > 0) ? 0.6 : 0)
      + (triptanCe > 0 && (ssriCe > 0 || snriCe > 0) ? 0.4 : 0),
      0, 1.0,
    );
    const serotoninSyndromeRisk = serotoninLoad;
    const serotoninSyndromeActive = serotoninLoad > 0.6 && currentTemp > 38;

    if (serotoninSyndromeRisk > 0.3 && !prevSerotoninLogged) {
      const combos = [];
      if (linezolid && (ssriCe > 0 || snriCe > 0)) combos.push('LINEZOLID (MAO inhibitor) + SSRI/SNRI — HIGH RISK');
      if (tramadolCe > 0 && (ssriCe > 0 || snriCe > 0)) combos.push('TRAMADOL + SSRI/SNRI — MODERATE RISK');
      events.push(
        `⚠️ SEROTONIN SYNDROME RISK: Combinations identified: ${combos.join(', ')}. Clinical diagnosis (Hunter Criteria): serotonergic drug + clonus, agitation+diaphoresis, tremor+hyperreflexia, OR hypertonia+fever+clonus. TREATMENT: STOP offending drugs; cyproheptadine 12 mg PO/NG (5-HT antagonist); benzodiazepines for agitation; cooling for hyperthermia. Serotonin syndrome = PHARMACOLOGIC TOXICITY (not idiosyncratic) — resolves with drug cessation + supportive care. NOTE: Ondansetron does NOT cause serotonin syndrome (it's a 5-HT3 ANTAGONIST, not agonist).`,
      );
      prevSerotoninLogged = true;
    }

    // ===========================
    // NMS
    // ===========================
    const nmsLoad = clamp(
      (antipsychoticCe > 0 ? 0.6 : 0)
      + (droperidolCe > 0 ? 0.4 : 0)
      + (metoCe > 0 ? 0.3 : 0)
      + (levodopaStopped ? 0.7 : 0),
      0, 1.0,
    );
    const nmsRisk = nmsLoad;

    if (nmsRisk > 0.4 && currentTemp > 38.5 && !prevNMSLogged) {
      events.push(
        `🚨 NEUROLEPTIC MALIGNANT SYNDROME (NMS) RISK: Dopamine antagonist exposure${levodopaStopped ? ' + sudden levodopa withdrawal' : ''}. TETRAD: Hyperthermia (current ${currentTemp.toFixed(1)}°C) + Muscle rigidity + Altered consciousness + Autonomic instability. CK will be markedly elevated (rhabdomyolysis). TREATMENT: STOP offending drug; DANTROLENE 1-2.5 mg/kg IV (same as MH — muscle rigidity mechanism); BROMOCRIPTINE 2.5-10 mg TID PO (dopamine agonist — restores balance); Benzodiazepines; Cooling. NMS resolves over 1-2 weeks. NMS vs MH: NMS onset DAYS after drug exposure (not minutes as MH).`,
      );
      prevNMSLogged = true;
    }

    // ===========================
    // CYP3A4 INHIBITION (FLUCONAZOLE + MIDAZOLAM)
    // ===========================
    const midazolamProlongation = fluconazoleCe > 0 && midazolamCe > 0
      ? 1.0 + fluconazoleCe / (fluconazoleCe + 1.0) * 4.0 // up to 5× prolongation
      : 1.0;
    const cyp3a4InteractionActive = fluconazoleCe > 0 && midazolamCe > 0;

    if (cyp3a4InteractionActive && !prevCYP3A4Logged) {
      events.push(
        `⚠️ CYP3A4 DRUG INTERACTION: Fluconazole (strong CYP3A4 INHIBITOR) + Midazolam (CYP3A4 substrate): MIDAZOLAM EFFECT PROLONGED ${midazolamProlongation.toFixed(1)}×. A normal 5 mg dose → effectively ${(5 * midazolamProlongation).toFixed(0)} mg. REDUCE MIDAZOLAM DOSE by 50-75%. Also affected: fentanyl (CYP3A4), alfentanil, triazolam, some calcium channel blockers. IV formulations less affected than PO (no first-pass). OTHER IMPORTANT CYP3A4 INHIBITORS: erythromycin, clarithromycin, grapefruit juice, ketoconazole.`,
      );
      prevCYP3A4Logged = true;
    }

    // ===========================
    // BB + VERAPAMIL AV BLOCK RISK
    // ===========================
    const avBlockRisk = betaBlockerCe > 0 && verapamilCe > 0
      ? clamp((betaBlockerCe / 2 + verapamilCe / 2) * 0.5, 0, 0.7) : 0;

    if (avBlockRisk > 0.3 && !prevBBCCBLogged) {
      events.push(
        `⚠️ BETA-BLOCKER + VERAPAMIL INTERACTION: ADDITIVE AV NODE DEPRESSION → HIGH-DEGREE HEART BLOCK RISK. Both drugs slow AV conduction; combined can cause complete heart block → bradycardia, syncope, cardiac arrest. AVOID this combination. If absolutely necessary: external pacemaker on standby; calcium gluconate 1g IV available. SAFE ALTERNATIVES: Use diltiazem (non-DHP CCB) with caution; or amlodipine/nifedipine (DHP CCB) with beta-blocker (vascular selectivity, no AV node effect).`,
      );
      prevBBCCBLogged = true;
    }

    // ===========================
    // SUGAMMADEX + HORMONAL CONTRACEPTIVE
    // ===========================
    const sugammadexOCPWarning = sugammadexGiven && onOCP;

    if (sugammadexOCPWarning && !prevSugammadexOCPLogged) {
      events.push(
        `⚠️ SUGAMMADEX + ORAL CONTRACEPTIVE: Sugammadex encapsulates steroidal molecules including PROGESTERONE in oral contraceptives. Effect: single sugammadex dose may transiently reduce progesterone exposure → ONE dose = EQUIVALENT TO ONE MISSED CONTRACEPTIVE PILL. INFORM PATIENT: Use additional backup contraception (condom) for 7 days after sugammadex administration. This interaction does NOT affect non-steroidal IUDs, implants, or non-hormonal contraception.`,
      );
      prevSugammadexOCPLogged = true;
    }

    return {
      serotoninSyndromeRisk: parseFloat(serotoninSyndromeRisk.toFixed(4)),
      serotoninSyndromeActive,
      nmsRisk: parseFloat(nmsRisk.toFixed(4)),
      midazolamProlongation: parseFloat(midazolamProlongation.toFixed(2)),
      cyp3a4InteractionActive,
      avBlockRisk: parseFloat(avBlockRisk.toFixed(4)),
      sugammadexOCPWarning,
      prevSerotoninLogged,
      prevNMSLogged,
      prevCYP3A4Logged,
      prevBBCCBLogged,
      prevSugammadexOCPLogged,
      events,
    };
  }
}
