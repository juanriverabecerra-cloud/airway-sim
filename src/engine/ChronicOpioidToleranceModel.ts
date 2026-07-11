/**
 * Chronic Opioid Tolerance + Postoperative Delirium Model
 *
 * Two separate but related perioperative clinical issues:
 *
 * =========================================================================
 * A. CHRONIC OPIOID TOLERANCE
 * =========================================================================
 * Approximately 20-25% of surgical patients are on chronic opioids preoperatively
 * (chronic pain, cancer pain, methadone maintenance, opioid use disorder).
 * These patients present unique anesthetic challenges:
 *
 * 1. INCREASED OPIOID REQUIREMENTS:
 *    Tolerance develops to analgesic effects but NOT to sedation/respiratory depression
 *    (actually cross-tolerant but unpredictably).
 *    Intraoperative opioid needs: 3-4× normal for chronic opioid users.
 *    Postoperative: may need 5-10× normal breakthrough opioid dosing.
 *    BUT: overdose risk if tolerance suddenly regained (acute recovery/abstinence).
 *
 * 2. OPIOID-INDUCED HYPERALGESIA (OIH):
 *    Paradoxically, chronic opioid use may INCREASE pain sensitivity.
 *    Mechanism: glutamate/NMDA receptor upregulation, central sensitization.
 *    Clinically: pain out of proportion to injury, allodynia.
 *    Treatment: ketamine, methadone (NMDA antagonist properties), non-opioid analgesics.
 *
 * 3. MAC IS UNCHANGED:
 *    Volatile anesthetic MAC is NOT affected by opioid tolerance.
 *    Common mistake: thinking chronic opioid user needs more volatile agent.
 *    Reality: they may need the same or LESS volatile (opioid tolerance can
 *    sensitize the brain to sedating effects of volatiles through convergent pathways).
 *
 * 4. WITHDRAWAL RISK:
 *    Interruption of chronic opioids during perioperative period → opioid withdrawal.
 *    Timeline: short-acting (heroin/oxycodone): begins 8-24h after last dose.
 *             Long-acting (methadone): begins 48-72h.
 *    Symptoms: tachycardia, hypertension, diaphoresis, pain, GI cramping, anxiety.
 *    Prevention: continue home opioid dose perioperatively.
 *    Methadone maintenance: continue preoperative dose perioperatively; does NOT provide
 *    surgical analgesia (tolerance to analgesic effect with maintained respiratory
 *    tolerance) — still need additional opioid for pain control.
 *
 * 5. BUPRENORPHINE (Suboxone):
 *    Partial mu agonist + kappa antagonist. High receptor affinity (blocks full agonists).
 *    Historically: stop 24-72h before surgery (controversial — recent guidelines say CONTINUE).
 *    Modern approach: CONTINUE buprenorphine and use high-dose full agonists for breakthrough.
 *    Methadone: NO interaction issues with other opioids; continue at same dose.
 *
 * =========================================================================
 * B. POSTOPERATIVE DELIRIUM (POD) / CAM-ICU SCORING
 * =========================================================================
 * Postoperative delirium: acute-onset cognitive impairment following surgery.
 * Incidence: 5-15% in adults; 15-50% in elderly; >50% in ICU patients on mechanical ventilation.
 *
 * CONFUSION ASSESSMENT METHOD (CAM):
 * 4 Features (need 1+2+3 or 1+2+4):
 *   1. ACUTE ONSET AND FLUCTUATING COURSE
 *   2. INATTENTION (cannot spell "lunch" backward, etc.)
 *   3. DISORGANIZED THINKING (illogical questions)
 *   4. ALTERED LEVEL OF CONSCIOUSNESS (anything other than "alert")
 *
 * CAM-ICU (for mechanically ventilated patients): same 4 features but adapted for non-verbal.
 *
 * RISK FACTORS:
 *   Predisposing: advanced age (>70), baseline cognitive impairment, frailty, dehydration,
 *   sensory deficits (poor vision/hearing), immobility.
 *   Precipitating: pain, infection, metabolic derangements, sleep deprivation, excessive
 *   sedation (especially benzodiazepines), opioids, anticholinergics, immobility.
 *   Anesthesia-specific: depth of anesthesia (too deep → delirium), prolonged exposure.
 *
 * PREVENTION (ABCDEF BUNDLE in ICU):
 *   A — Assess, prevent, manage pain (minimize opioid)
 *   B — Both Spontaneous Awakening and Breathing Trials
 *   C — Choice of sedation (propofol/dexmedetomidine preferred over benzodiazepines)
 *   D — Delirium assess and manage
 *   E — Early mobility
 *   F — Family engagement
 *
 * TREATMENT:
 *   Non-pharmacologic FIRST: reorientation, early mobilization, sleep hygiene, glasses/hearing aids.
 *   Pharmacologic for severe agitation: haloperidol 1-2 mg IV, quetiapine 12.5-25 mg PO.
 *   Dexmedetomidine infusion: reduces delirium duration, may be used for agitated delirium.
 *   AVOID benzodiazepines (worsen delirium unless seizures or EtOH withdrawal).
 *   AVOID physostigmine for non-anticholinergic delirium.
 *
 * Sources: Krenk L, Br J Anaesth 2010; Inouye SK, NEJM 1999;
 * Devlin JW, Crit Care Med 2018 (PADIS guidelines); Miller's 9th Ed Ch 95 (PACU/Critical Care).
 */

export interface ChronicOpioidDeliriumInputs {
  // Chronic opioid tolerance
  isChronicOpioidUser?: boolean;
  morphineEquivalentDosePerDay?: number; // mg/day MEDD (morphine equivalent daily dose)
  onMethadone?: boolean;
  onBuprenorphine?: boolean;            // Suboxone/Subutex
  opioidWithdrawalRisk?: boolean;       // if opioids interrupted for > 8h

  // Opioid-induced hyperalgesia
  prolongedHighDoseOpioidExposure?: boolean; // > 3 months on high-dose opioids

  // Postoperative delirium risk
  ageYears?: number;
  hasBaselineCognitivImpairment?: boolean;
  hasFrailty?: boolean;
  isPostoperative?: boolean;
  hoursInICU?: number;              // hours since ICU admission
  benzodiazepineCe?: number;
  haloperidolCe?: number;
  dexmedetomidineCe?: number;
  quetiapineCe?: number;
  benzoDiazepine?: boolean;

  // Current signs
  currentHR?: number;               // tachycardia in withdrawal
  currentSBP?: number;              // hypertension in withdrawal

  // Event guards
  prevChronicOpioidLogged?: boolean;
  prevWithdrawalLogged?: boolean;
  prevDeliriumLogged?: boolean;
}

export interface ChronicOpioidDeliriumOutput {
  // Chronic opioid
  opioidToleranceMultiplier: number;   // multiply opioid doses by this for adequate analgesia
  oihActive: boolean;                  // opioid-induced hyperalgesia active
  withdrawalRisk: number;              // 0-1
  buprenorphineInteractionWarning: boolean;
  methadoneStatus: string;

  // Delirium
  podeliriumRiskScore: number;         // 0-1 (pre-surgical prediction)
  camPositive: boolean;                // active delirium (CAM criteria met)
  antiDeliriumEfficacy: number;        // 0-1 (from treatment drugs)
  benzoDiazepineDeliriumRisk: number; // 0-1 (benzodiazepines worsen delirium)

  prevChronicOpioidLogged: boolean;
  prevWithdrawalLogged: boolean;
  prevDeliriumLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ChronicOpioidToleranceModel {
  static tick(inputs: ChronicOpioidDeliriumInputs = {}): ChronicOpioidDeliriumOutput {
    const events: string[] = [];
    let prevChronicOpioidLogged = !!inputs.prevChronicOpioidLogged;
    let prevWithdrawalLogged = !!inputs.prevWithdrawalLogged;
    let prevDeliriumLogged = !!inputs.prevDeliriumLogged;

    // ===========================
    // CHRONIC OPIOID TOLERANCE
    // ===========================
    const isChronicUser = !!inputs.isChronicOpioidUser;
    const medd = clamp(safeNumber(inputs.morphineEquivalentDosePerDay, 0), 0, 1000);
    const onMethadone = !!inputs.onMethadone;
    const onBuprenorphine = !!inputs.onBuprenorphine;
    const opioidWithdrawal = !!inputs.opioidWithdrawalRisk;
    const oih = !!inputs.prolongedHighDoseOpioidExposure;

    // Opioid tolerance multiplier (how much MORE opioid they need)
    // MEDD 0-30: low (1.5-2×); 30-100: moderate (2-3×); >100: high (3-5×)
    let opioidToleranceMultiplier = 1.0;
    if (isChronicUser) {
      if (medd > 100) opioidToleranceMultiplier = 4.0;
      else if (medd > 50) opioidToleranceMultiplier = 3.0;
      else if (medd > 20) opioidToleranceMultiplier = 2.5;
      else opioidToleranceMultiplier = 1.8;
    }

    const buprenorphineInteractionWarning = onBuprenorphine;

    if (isChronicUser && !prevChronicOpioidLogged) {
      const toleranceLevelStr = medd > 100 ? 'HIGH (MEDD > 100 mg/day)' : medd > 50 ? 'MODERATE (MEDD 50-100 mg/day)' : 'LOW (MEDD < 50 mg/day)';
      events.push(
        `⚠️ CHRONIC OPIOID TOLERANCE (${toleranceLevelStr}): Opioid requirements approximately ${opioidToleranceMultiplier.toFixed(1)}× normal. PERIOPERATIVE OPIOID MANAGEMENT: (1) CONTINUE preoperative opioid dose (PO/transdermal); (2) IV conversion: use equianalgesic tables for IV dosing; (3) Anticipate significantly elevated PCA/breakthrough doses; (4) MULTIMODAL ANALGESIA CRITICAL: acetaminophen, NSAIDs, ketamine infusion (0.1-0.5 mg/kg/hr) → reduces opioid-induced hyperalgesia; regional anesthesia; (5) MAC NOT affected by opioid tolerance — do not increase volatile unnecessarily; (6) Methadone: continue at same dose (does NOT provide surgical analgesia due to tolerance). ${onBuprenorphine ? '⚠️ BUPRENORPHINE: High receptor affinity may block full agonists. Modern approach: CONTINUE buprenorphine and use high-dose full agonists for breakthrough (3-4× normal dose of hydromorphone/oxycodone required).' : ''}`,
      );
      prevChronicOpioidLogged = true;
    }

    // Opioid withdrawal
    const withdrawalRisk = opioidWithdrawal ? 0.8 : 0;
    const currentHR = safeNumber(inputs.currentHR, 80);
    const currentSBP = safeNumber(inputs.currentSBP, 120);
    const withdrawalSigns = currentHR > 100 || currentSBP > 145;

    if (opioidWithdrawal && withdrawalSigns && !prevWithdrawalLogged) {
      events.push(
        `⚠️ OPIOID WITHDRAWAL SIGNS: Tachycardia (HR ${currentHR.toFixed(0)}) + hypertension (SBP ${currentSBP.toFixed(0)}) in chronic opioid user with interrupted opioid therapy. Symptoms: pain, anxiety, diaphoresis, piloerection, GI cramping, dysphoria. TREATMENT: (1) Resume opioid therapy (calculate equianalgesic dose); (2) Clonidine 0.1-0.3 mg PO q6h (centrally reduces sympathetic outflow — targets tachycardia/HTN but NOT euphoria/craving); (3) Non-opioid analgesics; (4) Address underlying pain; (5) Addiction medicine/anesthesia pain service consult for methadone/buprenorphine patients.`,
      );
      prevWithdrawalLogged = true;
    }
    if (!opioidWithdrawal) prevWithdrawalLogged = false;

    const oihActive = oih && medd > 50;

    // ===========================
    // POSTOPERATIVE DELIRIUM
    // ===========================
    const ageYears = clamp(safeNumber(inputs.ageYears, 60), 0, 110);
    const hasCognitive = !!inputs.hasBaselineCognitivImpairment;
    const hasFrailty = !!inputs.hasFrailty;
    const isPostop = !!inputs.isPostoperative;
    const hoursICU = clamp(safeNumber(inputs.hoursInICU, 0), 0, 10000);
    const benzoCe = clamp(safeNumber(inputs.benzodiazepineCe, 0), 0, 10);
    const haloCe = clamp(safeNumber(inputs.haloperidolCe, 0), 0, 5);
    const dexmedCe = clamp(safeNumber(inputs.dexmedetomidineCe, 0), 0, 10);
    const quetCe = clamp(safeNumber(inputs.quetiapineCe, 0), 0, 5);

    // Delirium risk score (pre-surgical prediction)
    let riskScore = 0;
    if (ageYears > 70) riskScore += 0.3;
    if (ageYears > 80) riskScore += 0.2;
    if (hasCognitive) riskScore += 0.25;
    if (hasFrailty) riskScore += 0.20;
    if (isChronicUser) riskScore += 0.10; // opioids independently risk factor
    if (benzoCe > 0) riskScore += 0.20; // benzodiazepines strongly associated

    const podeliriumRiskScore = clamp(riskScore, 0, 1.0);

    // CAM criteria — simplified model based on ICU hours + risk factors
    const benzoDiazepineDeliriumRisk = benzoCe > 0 ? clamp(benzoCe / 2.0 * 0.5, 0, 0.5) : 0;
    const camPositive = isPostop && podeliriumRiskScore > 0.5 && (benzoCe > 0.5 || hasCognitive);

    // Anti-delirium treatment efficacy
    const antiDeliriumEfficacy = clamp(
      (haloCe > 0 ? haloCe / (haloCe + 0.5) * 0.45 : 0)
      + (dexmedCe > 0 ? dexmedCe / (dexmedCe + 0.5) * 0.50 : 0)
      + (quetCe > 0 ? quetCe / (quetCe + 0.5) * 0.35 : 0)
      - benzoDiazepineDeliriumRisk * 0.5,
      0, 0.85,
    );

    if (camPositive && !prevDeliriumLogged) {
      events.push(
        `⚠️ POSTOPERATIVE DELIRIUM (CAM-POSITIVE): Risk factors: age ${ageYears}y${hasCognitive ? ', baseline cognitive impairment' : ''}${hasFrailty ? ', frailty' : ''}${benzoCe > 0 ? ', benzodiazepine use (MAJOR risk factor)' : ''}. CAM criteria: acute onset + inattention + disorganized thinking or altered LOC. MANAGEMENT (NON-PHARMACOLOGIC FIRST): (1) Frequent reorientation (calendar, clock, familiar faces/voice); (2) Mobilize early; (3) Restore sleep-wake cycle; (4) Glasses/hearing aids if applicable; (5) STOP BENZODIAZEPINES (worsen delirium); (6) Adequate analgesia (pain drives delirium). PHARMACOLOGIC (severe agitation only): Haloperidol 0.5-2 mg IV or Quetiapine 12.5-25 mg PO. Dexmedetomidine infusion for ventilated patients — shown to reduce delirium duration. NEVER use physostigmine for non-anticholinergic delirium.`,
      );
      prevDeliriumLogged = true;
    }
    if (!camPositive) prevDeliriumLogged = false;

    return {
      opioidToleranceMultiplier: parseFloat(opioidToleranceMultiplier.toFixed(2)),
      oihActive,
      withdrawalRisk: parseFloat(withdrawalRisk.toFixed(4)),
      buprenorphineInteractionWarning,
      methadoneStatus: onMethadone ? 'Continue at home dose perioperatively; provides baseline but not surgical analgesia' : 'Not on methadone maintenance',
      podeliriumRiskScore: parseFloat(podeliriumRiskScore.toFixed(4)),
      camPositive,
      antiDeliriumEfficacy: parseFloat(antiDeliriumEfficacy.toFixed(4)),
      benzoDiazepineDeliriumRisk: parseFloat(benzoDiazepineDeliriumRisk.toFixed(4)),
      prevChronicOpioidLogged,
      prevWithdrawalLogged,
      prevDeliriumLogged,
      events,
    };
  }
}
