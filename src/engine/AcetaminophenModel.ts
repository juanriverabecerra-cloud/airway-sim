/**
 * Acetaminophen Hepatotoxicity Model
 *
 * Acetaminophen (APAP) is the most common cause of acute liver failure in the US
 * (accounting for ~50% of all ALF cases). It is perioperatively relevant because:
 * - Multimodal analgesia protocols (ERAS) routinely use IV acetaminophen
 * - Hepatically compromised patients (alcoholism, malnutrition, pre-existing liver disease)
 *   are at much higher risk at standard doses
 * - The therapeutic window narrows significantly in at-risk populations
 * - N-acetylcysteine (NAC) rescue is highly effective if given early
 *
 * === MECHANISM ===
 * Normal hepatic metabolism:
 *   ~90%: glucuronidation + sulfation → non-toxic conjugates → urinary excretion
 *   ~10%: CYP2E1 (and CYP3A4) → NAPQI (N-acetyl-p-benzoquinone imine) — TOXIC reactive metabolite
 *         → normally detoxified by glutathione (GSH) conjugation → mercapturic acid (urine)
 *
 * TOXICITY pathway:
 *   Overdose → glucuronidation/sulfation pathways saturate → >10% goes through CYP2E1 → NAPQI
 *   overwhelms hepatic glutathione stores → GSH depleted → NAPQI binds covalently to hepatocyte
 *   macromolecules → centrilobular hepatic necrosis → ALF
 *
 * === RISK FACTORS FOR TOXICITY AT "THERAPEUTIC" DOSES ===
 *   - Chronic alcoholism: CYP2E1 induced (generates more NAPQI) + GSH depleted (poor nutrition)
 *   - Malnutrition / fasting: lower baseline GSH stores
 *   - Pre-existing liver disease: reduced GSH production, impaired conjugation
 *   - Drugs that induce CYP2E1 or CYP3A4 (isoniazid, rifampin, carbamazepine, ethanol)
 *   - CYP2E1 rapid metabolizers (pharmacogenomic)
 *
 * === TOXICITY TIMELINE ===
 * Phase 1 (0-24h): Nausea, vomiting, malaise. LFTs often NORMAL.
 * Phase 2 (24-72h): AST/ALT begin to rise (can reach >10,000 U/L). RUQ pain. Elevated INR.
 * Phase 3 (72-96h): Peak hepatotoxicity. ALF criteria: INR >1.5, hepatic encephalopathy,
 *   jaundice. Risk of death or transplant. "Fulminant hepatic failure."
 * Phase 4 (4-14 days): Recovery (if patient survives) or transplant/death.
 *
 * === RUMACK-MATTHEW NOMOGRAM ===
 * Plots serum APAP level at specific time post-ingestion against hepatotoxicity risk.
 * Treatment line: APAP > 150 mcg/mL at 4h post-ingestion → NAC indicated.
 * In at-risk patients: some use 100 mcg/mL threshold.
 *
 * === N-ACETYLCYSTEINE (NAC) TREATMENT ===
 * Mechanism: GSH precursor → replenishes hepatic glutathione → NAPQI detoxified.
 * Efficacy:
 *   Given within 8h of ingestion: near-complete protection (>95% prevent ALF)
 *   Given 8-24h: still highly effective (70-80% prevention)
 *   Given 24-36h: some benefit even in ALF (may reduce mortality)
 *   Given >36h: marginal benefit for established ALF
 * Dose: IV loading 150 mg/kg over 60 min, then 50 mg/kg over 4h, then 100 mg/kg over 16h
 *
 * === SAFE DOSES ===
 * Healthy adult: ≤ 4g/day (≤ 1g per dose, q6h)
 * Liver disease / chronic alcoholism: ≤ 2g/day
 * Malnourished / fasting ≥ 24h: ≤ 2g/day
 *
 * Sources: Larson AM, Hepatology 2005; Lee WM, NEJM 2008; Rumack BH, Hepatology 2004;
 * Fontana RJ, Liver Transpl 2008; Miller's 9th Ed Ch 30 (Hepatic Physiology).
 */

export interface APAPInputs {
  cumulativeDoseMgPerKg?: number;   // total mg/kg given (across all doses)
  timeSinceFirstDoseHours?: number; // hours since first APAP dose
  weightKg?: number;
  hasLiverDisease?: boolean;        // pre-existing hepatic dysfunction
  isAlcoholic?: boolean;            // chronic EtOH: CYP2E1 induced + GSH depleted
  isMalnourished?: boolean;         // fasting > 24h or malnutrition
  nacActive?: boolean;              // N-acetylcysteine treatment active
  currentAST?: number;              // for staging
  currentALT?: number;
  currentINR?: number;
  prevHepToxLogged?: boolean;
  prevALFLogged?: boolean;
  prevNACSuccessLogged?: boolean;
}

export interface APAPOutput {
  napqiAccumulation: number;        // 0-1 index of toxic metabolite burden
  glutathioneDepletion: number;     // 0-1 (0=full, 1=empty)
  hepatotoxicityIndex: number;      // 0-1 (feeds HepaticEngine INR/AST elevation)
  astContribution: number;          // U/L to add to hepatic AST
  altContribution: number;          // U/L to add to hepatic ALT
  inrContribution: number;          // INR increase from APAP hepatotoxicity
  isALFRisk: boolean;               // meets ALF criteria (INR > 1.5 + encephalopathy likely)
  nacEfficacy: number;              // 0-1: how much NAC reverses NAPQI accumulation
  safeDoseMgPerKgPerDay: number;    // contextual safe daily dose
  prevHepToxLogged: boolean;
  prevALFLogged: boolean;
  prevNACSuccessLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AcetaminophenModel {
  static tick(inputs: APAPInputs = {}): APAPOutput {
    const events: string[] = [];
    let prevHepToxLogged = !!inputs.prevHepToxLogged;
    let prevALFLogged = !!inputs.prevALFLogged;
    let prevNACSuccessLogged = !!inputs.prevNACSuccessLogged;

    const doseMgPerKg = clamp(safeNumber(inputs.cumulativeDoseMgPerKg, 0), 0, 1000);
    const timeHours = clamp(safeNumber(inputs.timeSinceFirstDoseHours, 0), 0, 96);
    const weightKg = clamp(safeNumber(inputs.weightKg, 70), 10, 300);
    const hasLD = !!inputs.hasLiverDisease;
    const isAlc = !!inputs.isAlcoholic;
    const isMaln = !!inputs.isMalnourished;
    const nacActive = !!inputs.nacActive;

    // Safe dose per day (mg/kg/day)
    const safeDoseMgPerKgPerDay = (hasLD || isAlc || isMaln) ? 28.6 : 57.0; // ~2g vs 4g for 70kg

    if (doseMgPerKg === 0) {
      return {
        napqiAccumulation: 0, glutathioneDepletion: 0, hepatotoxicityIndex: 0,
        astContribution: 0, altContribution: 0, inrContribution: 0,
        isALFRisk: false, nacEfficacy: 0, safeDoseMgPerKgPerDay,
        prevHepToxLogged, prevALFLogged, prevNACSuccessLogged, events,
      };
    }

    // ===========================
    // RISK MODIFIERS
    // ===========================
    // These multiply the NAPQI generation fraction (normally ~10% of dose)
    let cyp2e1Induction = 1.0;
    if (isAlc) cyp2e1Induction *= 2.5;   // chronic EtOH induces CYP2E1 2-3×
    if (isMaln) cyp2e1Induction *= 1.3;   // mild enzyme induction from fasting
    if (hasLD) cyp2e1Induction *= 0.7;    // reduced hepatic mass BUT reduced GSH synthesis more
    const gshBaselineReduction = (isAlc ? 0.5 : 0) + (isMaln ? 0.3 : 0) + (hasLD ? 0.3 : 0);

    // ===========================
    // NAPQI ACCUMULATION
    // ===========================
    // Overdose threshold: ~150 mg/kg single dose in healthy adult; lower in at-risk
    const overdoseThreshold = hasLD || isAlc || isMaln ? 25 : 50; // mg/kg total
    const naqi_raw = clamp((doseMgPerKg - overdoseThreshold) / overdoseThreshold, 0, 1) * cyp2e1Induction;

    // NAPQI builds with time after dose (peaks 12-24h, then eliminated if GSH not depleted)
    const timeModifier = timeHours < 2 ? timeHours / 2 :
                         timeHours < 24 ? 1.0 :
                         timeHours < 72 ? 1.0 - (timeHours - 24) / 96 :
                         0.25; // partial persistence in ALF

    const napqiAccumulation = clamp(naqi_raw * timeModifier, 0, 1.0);

    // ===========================
    // GLUTATHIONE DEPLETION
    // ===========================
    const gshDepleted = clamp(napqiAccumulation * cyp2e1Induction + gshBaselineReduction, 0, 1.0);

    // ===========================
    // NAC EFFICACY
    // ===========================
    // NAC replenishes GSH. Efficacy decreases if given late (hepatocyte necrosis already established).
    let nacEfficacy = 0;
    if (nacActive) {
      const earlyWindow = timeHours < 8 ? 1.0 : timeHours < 24 ? 0.75 : timeHours < 36 ? 0.40 : 0.15;
      nacEfficacy = clamp(earlyWindow * (1 - napqiAccumulation * 0.3), 0, 1.0);
    }

    // ===========================
    // HEPATOTOXICITY INDEX
    // ===========================
    const hepatotoxicityIndex = clamp(gshDepleted * (1 - nacEfficacy), 0, 1.0);

    // AST/ALT and INR contributions (peak at hepatotoxicityIndex = 1.0)
    // Centrilobular necrosis typically: AST peaks at 4000-10000 U/L in severe overdose
    const astContribution = hepatotoxicityIndex * 8000 * (timeHours > 24 ? Math.min(1, (timeHours - 24) / 48) : 0);
    const altContribution = hepatotoxicityIndex * 6000 * (timeHours > 24 ? Math.min(1, (timeHours - 24) / 48) : 0);
    const inrContribution = hepatotoxicityIndex * 4.0 * (timeHours > 36 ? Math.min(1, (timeHours - 36) / 36) : 0);

    const isALFRisk = hepatotoxicityIndex > 0.5 && timeHours > 48;

    // ===========================
    // THRESHOLD EVENTS
    // ===========================
    if (hepatotoxicityIndex > 0.3 && !prevHepToxLogged) {
      const riskLabel = (hasLD || isAlc || isMaln) ? 'at-risk patient (enhanced CYP2E1/reduced GSH)' : 'standard patient';
      events.push(
        `⚠️ ACETAMINOPHEN HEPATOTOXICITY: NAPQI accumulation exceeds hepatic glutathione capacity in this ${riskLabel}. Cumulative dose ${doseMgPerKg.toFixed(1)} mg/kg over ${timeHours.toFixed(1)}h. AST/ALT rising. INITIATE N-ACETYLCYSTEINE (NAC) NOW: 150 mg/kg IV over 60 min, then 50 mg/kg over 4h, then 100 mg/kg over 16h. NAC is most effective within 8h of ingestion (>95% prevention); still helpful up to 36h. Avoid additional APAP. Hepatology consult.`,
      );
      prevHepToxLogged = true;
    }

    if (isALFRisk && !prevALFLogged) {
      events.push(
        `🚨 ACUTE LIVER FAILURE RISK: Severe APAP hepatotoxicity at ${timeHours.toFixed(0)}h post-ingestion. INR ${(safeNumber(inputs.currentINR, 1.0) + inrContribution).toFixed(1)}, AST ${(safeNumber(inputs.currentAST, 30) + astContribution).toFixed(0)} U/L. Meeting ALF criteria (INR > 1.5 + rising encephalopathy risk). Contact liver transplant center. NAC is still beneficial even in established ALF. King's College criteria for transplant listing: pH < 7.30, OR [PT > 100s AND Cr > 3.4 AND Grade 3-4 encephalopathy]. Intensive care: monitor ICP, glucose, coagulopathy, and renal function.`,
      );
      prevALFLogged = true;
    }

    if (nacActive && nacEfficacy > 0.6 && hepatotoxicityIndex < 0.2 && !prevNACSuccessLogged) {
      events.push(
        '✅ NAC TREATMENT SUCCESSFUL: N-acetylcysteine effectively replenished hepatic glutathione. NAPQI being detoxified. Hepatotoxicity index falling. Continue full NAC course as prescribed (total 21h IV protocol). Recheck LFTs and INR at 24h. Prognosis favorable if NAC given within 8-10h of ingestion.',
      );
      prevNACSuccessLogged = true;
    }

    return {
      napqiAccumulation: parseFloat(napqiAccumulation.toFixed(4)),
      glutathioneDepletion: parseFloat(gshDepleted.toFixed(4)),
      hepatotoxicityIndex: parseFloat(hepatotoxicityIndex.toFixed(4)),
      astContribution: parseFloat(astContribution.toFixed(0)),
      altContribution: parseFloat(altContribution.toFixed(0)),
      inrContribution: parseFloat(inrContribution.toFixed(3)),
      isALFRisk,
      nacEfficacy: parseFloat(nacEfficacy.toFixed(4)),
      safeDoseMgPerKgPerDay,
      prevHepToxLogged,
      prevALFLogged,
      prevNACSuccessLogged,
      events,
    };
  }
}
