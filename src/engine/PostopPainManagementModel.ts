/**
 * Postoperative Pain Management + Enhanced Recovery After Surgery (ERAS) Model
 *
 * Inadequate postoperative pain management is associated with: prolonged hospital stay,
 * chronic post-surgical pain (CPSP: 10-50% of patients develop persistent pain),
 * pulmonary complications, delirium, and readmission. ERAS protocols reduce LOS by
 * 30-40% and complications by ~50% through multimodal optimization.
 *
 * === MULTIMODAL ANALGESIA (The Gold Standard) ===
 * No single analgesic class provides complete pain control without significant side effects.
 * Combining drugs from DIFFERENT mechanisms allows lower doses of each → additive analgesia
 * with reduced individual drug toxicity.
 *
 * THE "PILLARS" OF MULTIMODAL ANALGESIA:
 *
 * 1. ACETAMINOPHEN (paracetamol): 1g IV/PO q6h = 4g/day max
 *    Mechanism: central COX inhibition + descending serotonin pathway modulation
 *    Opioid-sparing effect: 20-30% reduction in opioid requirements
 *    Safe in virtually all patients (dose reduce in liver disease)
 *
 * 2. NSAIDs (ketorolac, ibuprofen, celecoxib):
 *    Mechanism: peripheral + central COX inhibition → ↓prostaglandins → ↓sensitization
 *    Opioid-sparing: 30-40%
 *    Avoid: CKD (nephrotoxic), active PUD, cardiac disease, coagulopathy, post-anastomosis
 *    (<5 days to avoid impaired healing), children < 6 months
 *
 * 3. KETAMINE (low-dose, sub-dissociative): 0.1-0.5 mg/kg/hr infusion
 *    Mechanism: NMDA receptor antagonism → reduces central sensitization, OIH prevention,
 *    reduces opioid requirements in chronic opioid-tolerant patients
 *    Opioid-sparing: 20-30%
 *    Also: bronchodilator effect (useful in asthmatics), maintains airway reflexes
 *
 * 4. REGIONAL ANESTHESIA (most effective individual component):
 *    Epidural, nerve blocks (ISB, femoral, TAP, PECS, ESP, etc.)
 *    Opioid-sparing: 60-80% (often = 0 systemic opioids for the blocked territory)
 *    Duration: local anesthetic 6-24h; dexamethasone additive 4-8h more
 *
 * 5. OPIOIDS (only when above inadequate):
 *    Lowest effective dose, shortest duration, shortest-acting agents.
 *    PCA (patient-controlled analgesia): provides superior pain control + uses 30-40%
 *    less opioid vs PRN nursing-administered opioids.
 *
 * 6. GABAPENTINOIDS (gabapentin, pregabalin):
 *    Mechanism: Ca2+ channel alpha-2-delta subunit ligand → reduces neuronal excitability
 *    Pre-operative loading (600-1200 mg gabapentin preop) reduces postop opioid requirements
 *    CAUTION: Sedation + respiratory depression risk especially with opioids (GOSRD)
 *    Avoid in CKD (accumulates), elderly, COPD
 *
 * 7. DEXAMETHASONE: 8 mg IV (single dose)
 *    Mechanism: anti-inflammatory + anti-emetic + some analgesic
 *    Extends LA block duration by 4-8h when used with nerve blocks
 *    Also: reduces PONV (dual benefit with ERAS)
 *
 * === ERAS PROTOCOL KEY ELEMENTS ===
 * Preoperative: counseling, optimization, CHO loading (200g 2h before induction),
 *              avoid prolonged fasting, prehabilitation
 * Intraoperative: multimodal analgesia, goal-directed fluid therapy, anti-emetics,
 *                TIVA (propofol) preferred (less PONV than volatiles), normothermia
 * Postoperative: early oral intake, early mobilization, avoid NGT/drains if possible,
 *               VTE prophylaxis, urinary catheter removal by POD1, multi-modal analgesia
 *
 * === CHRONIC POST-SURGICAL PAIN (CPSP) ===
 * Defined: pain persisting > 3 months after surgery (beyond normal healing time)
 * Incidence: 10-50% (higher with: inguinal hernia, thoracotomy, mastectomy, limb amputation)
 * Risk factors: preoperative pain, younger age, female sex, anxiety/catastrophizing,
 *              intraoperative nerve damage, inadequate postoperative pain control
 * Prevention: regional anesthesia (reduces CPSP most effectively), ketamine,
 *             gabapentinoids, aggressive early pain treatment
 *
 * Sources: Kehlet H, Lancet 2003 (ERAS); Chou R, J Pain 2016 (GRADE);
 * Macrae WA, Br J Anaesth 2008 (CPSP); Gan TJ, Anesthesiology 2014.
 */

export interface PostopPainInputs {
  // Pain scores
  currentPainNRS?: number;      // 0-10 NRS score
  surgeryType?: string;         // 'major_abdominal', 'thoracic', 'orthopedic', 'minor', etc.

  // Analgesic drugs (Ce values)
  acetaminophenCe?: number;
  ketorolacCe?: number;         // NSAID
  ketamineCe?: number;          // low-dose infusion
  opioidCe?: number;            // combined opioid effect (morphine-equivalents)
  gabapentinCe?: number;

  // Regional anesthesia
  regionalBlockActive?: boolean;
  regionalBlockCoverage?: number; // 0-1 fraction of pain area covered

  // Dexamethasone
  dexamethasoneCe?: number;     // analgesic + antiemetic + LA extension

  // Patient factors
  isChronicOpioidUser?: boolean;
  ageYears?: number;
  hasCOPD?: boolean;
  hasRenalInsufficiency?: boolean;
  hasLiverDisease?: boolean;

  // ERAS elements
  earlyMobilization?: boolean;
  earlyOralIntake?: boolean;
  normalThermia?: boolean;

  // Event guards
  prevPainLogged?: boolean;
  prevOpioidSparing?: boolean;
  prevGosrdRiskLogged?: boolean;
}

export interface PostopPainOutput {
  // Pain control
  effectivePainNRS: number;       // pain after analgesia (0-10)
  analgesiaAdequate: boolean;     // NRS ≤ 3 at rest, ≤ 5 with movement
  totalOpioidSparingFraction: number; // how much opioid reduced by multimodal

  // Individual contributions (0-1 analgesic effect)
  acetaminophenContrib: number;
  nsaidContrib: number;
  ketamineContrib: number;
  regionalContrib: number;
  opioidContrib: number;

  // ERAS score (0-1: elements implemented)
  erasScore: number;

  // Risk factors
  cpspRisk: number;             // 0-1 chronic post-surgical pain risk
  gosrdRisk: number;            // gabapentinoid-opioid synergistic respiratory depression

  prevPainLogged: boolean;
  prevOpioidSparing: boolean;
  prevGosrdRiskLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class PostopPainManagementModel {
  static tick(inputs: PostopPainInputs = {}): PostopPainOutput {
    const events: string[] = [];
    let prevPainLogged = !!inputs.prevPainLogged;
    let prevOpioidSparing = !!inputs.prevOpioidSparing;
    let prevGosrdRiskLogged = !!inputs.prevGosrdRiskLogged;

    const painNRS = clamp(safeNumber(inputs.currentPainNRS, 5), 0, 10);
    const acetaminophenCe = clamp(safeNumber(inputs.acetaminophenCe, 0), 0, 10);
    const ketorolacCe = clamp(safeNumber(inputs.ketorolacCe, 0), 0, 5);
    const ketamineCe = clamp(safeNumber(inputs.ketamineCe, 0), 0, 5);
    const opioidCe = clamp(safeNumber(inputs.opioidCe, 0), 0, 10);
    const gabapentinCe = clamp(safeNumber(inputs.gabapentinCe, 0), 0, 5);
    const regionalActive = !!inputs.regionalBlockActive;
    const regionalCoverage = clamp(safeNumber(inputs.regionalBlockCoverage, 0.8), 0, 1);
    const dexamCe = clamp(safeNumber(inputs.dexamethasoneCe, 0), 0, 5);
    const isChronicOpioidUser = !!inputs.isChronicOpioidUser;
    const ageYears = clamp(safeNumber(inputs.ageYears, 50), 10, 100);
    const hasCOPD = !!inputs.hasCOPD;
    const hasRenalInsuff = !!inputs.hasRenalInsufficiency;
    const hasLD = !!inputs.hasLiverDisease;

    // ===========================
    // ANALGESIC CONTRIBUTIONS
    // ===========================
    // Each class provides fractional analgesia from 0-1 (1 = complete pain relief)
    const acetaminophenContrib = acetaminophenCe > 0
      ? clamp(acetaminophenCe / (acetaminophenCe + 2.0) * 0.30, 0, 0.30) : 0;

    const nsaidContrib = ketorolacCe > 0 && !hasRenalInsuff
      ? clamp(ketorolacCe / (ketorolacCe + 0.5) * 0.35, 0, 0.35)
      : ketorolacCe > 0 ? 0.10 : 0; // reduced effect in renal insufficiency

    const ketamineContrib = ketamineCe > 0
      ? clamp(ketamineCe / (ketamineCe + 0.3) * 0.28, 0, 0.28) : 0;

    const regionalContrib = regionalActive
      ? clamp(regionalCoverage * 0.80, 0, 0.80) : 0;

    const opioidContrib = opioidCe > 0
      ? clamp(opioidCe / (opioidCe + 1.0) * 0.55, 0, 0.55) : 0;

    const gabapentinContrib = gabapentinCe > 0
      ? clamp(gabapentinCe / (gabapentinCe + 1.0) * 0.20, 0, 0.20) : 0;

    const dexamContrib = dexamCe > 0 ? 0.10 : 0; // modest analgesic + extends regional

    // Total analgesia (diminishing returns to cap at 1.0)
    const totalAnalgesia = clamp(
      acetaminophenContrib + nsaidContrib + ketamineContrib + regionalContrib
      + opioidContrib + gabapentinContrib + dexamContrib,
      0, 0.97,
    );

    // Effective pain score
    const effectivePainNRS = Math.round(Math.max(0, painNRS * (1 - totalAnalgesia)));

    const analgesiaAdequate = effectivePainNRS <= 3;

    // Opioid-sparing: how much opioid replaced by other modalities
    const nonOpioidSparing = totalAnalgesia - opioidContrib;
    const totalOpioidSparingFraction = clamp(nonOpioidSparing / 0.5, 0, 0.85);

    // ===========================
    // ERAS SCORE
    // ===========================
    let erasElements = 0;
    if (acetaminophenCe > 0) erasElements++;
    if (ketorolacCe > 0 || nsaidContrib) erasElements++; // L5/F6: was inputs.nsaidContrib (undefined — dead); use the local computed above
    if (regionalActive) erasElements++;
    if (inputs.earlyMobilization) erasElements++;
    if (inputs.earlyOralIntake) erasElements++;
    if (inputs.normalThermia) erasElements++;
    if (dexamCe > 0) erasElements++;
    const erasScore = clamp(erasElements / 7, 0, 1.0);

    // ===========================
    // CPSP RISK
    // ===========================
    let cpspRisk = 0;
    if (painNRS > 7) cpspRisk += 0.25; // severe acute pain → sensitization
    if (isChronicOpioidUser) cpspRisk += 0.15;
    if (ageYears < 40) cpspRisk += 0.10;
    if (!regionalActive) cpspRisk += 0.10; // regional anesthesia is most protective
    const surgery = (inputs.surgeryType || '');
    if (surgery.includes('thoracic') || surgery.includes('thoracot')) cpspRisk += 0.25;
    if (surgery.includes('amputation')) cpspRisk += 0.35;
    if (surgery.includes('inguinal')) cpspRisk += 0.15;
    cpspRisk = clamp(cpspRisk, 0, 0.80);

    // ===========================
    // GOSRD RISK
    // ===========================
    const gosrdRisk = gabapentinCe > 0 && opioidCe > 0
      ? clamp((gabapentinCe / 2 + opioidCe / 3) * 0.3, 0, 0.60) : 0;

    if (gosrdRisk > 0.3) {
      if (!prevGosrdRiskLogged) {
        events.push(
          `⚠️ GOSRD RISK: Gabapentinoid + Opioid combination increases respiratory depression risk (Gabapentinoid-Opioid Synergistic Respiratory Depression). Monitor respiratory rate and SpO2 closely — overnight monitoring recommended. Use lowest effective gabapentinoid dose; reduce opioid by 30%. Avoid in: COPD, sleep apnea, elderly (> 65y), CKD. Naloxone reversal kit at bedside in high-risk patients.`,
        );
        prevGosrdRiskLogged = true;
      }
    } else {
      prevGosrdRiskLogged = false;
    }

    if (effectivePainNRS > 6 && opioidCe === 0 && !prevPainLogged) {
      events.push(
        `⚠️ INADEQUATE PAIN CONTROL (NRS ${effectivePainNRS}/10) WITHOUT OPIOIDS: Consider expanding multimodal protocol. PRIORITY ORDER: (1) Is regional anesthesia adequate? (check coverage); (2) Ketamine 0.1-0.3 mg/kg/hr infusion (NMDA block → reduces central sensitization); (3) Ensure acetaminophen 1g IV q6h + ketorolac 15-30 mg IV q6h (if no contraindications); (4) Gabapentin 300 mg TID (preoperatively started) for acute pain modulation; (5) Consider opioid PCA if above measures inadequate.`,
      );
      prevPainLogged = true;
    }

    if (totalOpioidSparingFraction > 0.5 && !prevOpioidSparing) {
      events.push(
        `✅ EFFECTIVE MULTIMODAL ANALGESIA: Non-opioid analgesics providing ${(totalOpioidSparingFraction * 100).toFixed(0)}% opioid sparing. Benefits: reduced nausea/vomiting, faster return of bowel function, earlier mobilization, shorter hospital stay, lower CPSP risk.`,
      );
      prevOpioidSparing = true;
    }

    return {
      effectivePainNRS,
      analgesiaAdequate,
      totalOpioidSparingFraction: parseFloat(totalOpioidSparingFraction.toFixed(4)),
      acetaminophenContrib: parseFloat(acetaminophenContrib.toFixed(4)),
      nsaidContrib: parseFloat(nsaidContrib.toFixed(4)),
      ketamineContrib: parseFloat(ketamineContrib.toFixed(4)),
      regionalContrib: parseFloat(regionalContrib.toFixed(4)),
      opioidContrib: parseFloat(opioidContrib.toFixed(4)),
      erasScore: parseFloat(erasScore.toFixed(4)),
      cpspRisk: parseFloat(cpspRisk.toFixed(4)),
      gosrdRisk: parseFloat(gosrdRisk.toFixed(4)),
      prevPainLogged,
      prevOpioidSparing,
      prevGosrdRiskLogged,
      events,
    };
  }
}
