/**
 * Sickle Cell Disease (SCD) Perioperative Model
 *
 * SCD affects ~100,000 Americans and millions worldwide. Anesthesiologists encounter
 * SCD patients for acute pain management, surgical procedures, and obstetric care.
 * Perioperative complications are common (20-30% rate) and potentially catastrophic.
 *
 * === PATHOPHYSIOLOGY ===
 * HbS (sickle hemoglobin) polymerizes when deoxygenated → erythrocytes assume
 * rigid sickle shape → block microcirculation → vaso-occlusion → ischemia → pain.
 *
 * Sickling is triggered by (the 5 H's of SCD):
 * 1. Hypoxia (SpO2 < 90% most dangerous)
 * 2. Hypothermia (cold → vasoconstriction → stasis → sickling)
 * 3. Hypovolemia (dehydration → hemoconcentration → sickling)
 * 4. Hyperthermia/infection (fever → O2 consumption → relative hypoxia)
 * 5. Acidosis (shifts oxyhemoglobin curve right → more deoxygenation at tissue level)
 *
 * === ACUTE CHEST SYNDROME (ACS) ===
 * The leading cause of death in SCD adults. A new pulmonary infiltrate + fever/
 * respiratory symptoms in an SCD patient. Mechanism: fat emboli from bone infarction
 * (especially rib infarcts during VOC) → pulmonary vascular occlusion + infection +
 * sickling in the pulmonary circulation → progressively worsening hypoxemia.
 * Can progress from mild pneumonia-like picture to ARDS/respiratory failure in 24-48h.
 * Treatment: blood transfusion (simple or exchange), broad-spectrum antibiotics,
 * bronchodilators, supplemental O2, hydroxyurea (chronic).
 *
 * === PERIOPERATIVE MANAGEMENT ===
 * Preoperative:
 * - Target HbS% < 30% for major surgery (or Hb > 10 g/dL) via simple/exchange transfusion
 *   (exchange preferred: prevents hyperviscosity while reducing HbS%)
 * - Aggressive hydration from midnight before
 * - Avoid prolonged fasting
 * - Regional anesthesia preferred (avoids volatile-induced hypoxia, better pain control)
 *
 * Intraoperative:
 * - Maintain SpO2 > 95% at all times (NO permissive hypoxia)
 * - Maintain normothermia (warming blanket, warm IV fluids, warm OR)
 * - Maintain normovolemia (generous IV fluids, avoid tourniquet if possible)
 * - Avoid hyperventilation (alkalosis shifts curve left but may cause cerebral vasoconstriction)
 * - Avoid vasopressors that cause significant vasoconstriction (worsen stasis)
 *
 * Postoperative:
 * - Incentive spirometry (prevents atelectasis → hypoxia → ACS trigger)
 * - Aggressive pain management (uncontrolled pain → splinting → atelectasis → ACS)
 * - Continue IV fluids until adequate oral intake
 *
 * Sources: Vichinsky EP, NEJM 2000; Firth PG, Br J Anaesth 2011;
 * Howard J, Blood 2015; Miller's 9th Ed Ch 77 (Pediatric Hematologic Disorders).
 */

export interface SickleCellInputs {
  hasSickleCellDisease?: boolean;     // HbSS (most severe) — or HbSC, HbS/β-thal
  hbSPercent?: number;                // % of total Hb that is HbS (preop target < 30%)
  currentSpO2?: number;               // desaturation is the most dangerous trigger
  currentTemp?: number;               // °C — hypothermia triggers sickling
  currentHb?: number;                 // g/dL
  isHydrated?: boolean;               // dehydration → hemoconcentration → sickling
  currentPH?: number;                 // acidosis worsens O2 offloading → sickling
  hasActiveInfection?: boolean;       // fever/infection trigger
  tourniquetActive?: boolean;         // tourniquet → stasis → hypoxia → sickling

  // Existing VOC / pain crisis
  vocActive?: boolean;                // vaso-occlusive crisis in progress

  // ACS
  acsActive?: boolean;
  acsMinutesSinceOnset?: number;

  // Treatment
  transfusionHbA?: number;            // HbA% (from recent transfusion, reduces HbS%)
  hydroxyureaActive?: boolean;        // increases HbF, reduces crises
  o2Supplemental?: boolean;           // supplemental O2 above room air

  prevVOCLogged?: boolean;
  prevACSLogged?: boolean;
}

export interface SickleCellOutput {
  sicklingRiskIndex: number;          // 0-1 (composite trigger score)
  vocRisk: number;                    // vaso-occlusive crisis risk per tick
  acsRisk: number;                    // acute chest syndrome risk
  acsActive: boolean;
  acsSeverity: number;                // 0-1 (ARDS progression)
  acsShuntContribution: number;       // additive to RespiratoryEngine actualShunt
  acsCompliancePenalty: number;       // ARDS-like compliance reduction
  intraoperativeRisk: 'low' | 'intermediate' | 'high' | 'critical';
  hbSEstimated: number;               // current estimated HbS% (accounting for transfusions)
  transfusionRecommended: boolean;    // HbS% > 30% for major surgery
  prevVOCLogged: boolean;
  prevACSLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class SickleCellModel {
  static tick(inputs: SickleCellInputs = {}): SickleCellOutput {
    const events: string[] = [];
    let prevVOCLogged = !!inputs.prevVOCLogged;
    let prevACSLogged = !!inputs.prevACSLogged;

    const hasSCD = !!inputs.hasSickleCellDisease;

    if (!hasSCD) {
      return {
        sicklingRiskIndex: 0, vocRisk: 0, acsRisk: 0, acsActive: false,
        acsSeverity: 0, acsShuntContribution: 0, acsCompliancePenalty: 0,
        intraoperativeRisk: 'low', hbSEstimated: 0, transfusionRecommended: false,
        prevVOCLogged, prevACSLogged, events,
      };
    }

    const hbSRaw = clamp(safeNumber(inputs.hbSPercent, 85), 0, 100);
    const spo2 = clamp(safeNumber(inputs.currentSpO2, 97), 50, 100);
    const temp = clamp(safeNumber(inputs.currentTemp, 37), 32, 42);
    const hb = clamp(safeNumber(inputs.currentHb, 8), 2, 18);
    const pH = clamp(safeNumber(inputs.currentPH, 7.4), 6.8, 7.6);
    const isHydrated = inputs.isHydrated !== false; // default true
    const hasInfection = !!inputs.hasActiveInfection;
    const tourniquetActive = !!inputs.tourniquetActive;
    const hydroxyurea = !!inputs.hydroxyureaActive;
    const o2Supplemental = !!inputs.o2Supplemental;

    // HbS% accounting for transfusions
    const hbAFromTransfusion = clamp(safeNumber(inputs.transfusionHbA, 0), 0, 100);
    const hbSEstimated = Math.max(0, hbSRaw - hbAFromTransfusion * 0.8);
    const hbSFraction = hbSEstimated / 100;

    // ===========================
    // SICKLING TRIGGER COMPOSITE SCORE
    // ===========================
    let triggerScore = 0;
    // Hypoxia (most dangerous)
    if (spo2 < 90) triggerScore += (90 - spo2) * 0.08;  // sharp penalty below 90%
    else if (spo2 < 95) triggerScore += (95 - spo2) * 0.03;
    // Hypothermia
    if (temp < 36) triggerScore += (36 - temp) * 0.2;
    // Dehydration
    if (!isHydrated) triggerScore += 0.3;
    // Acidosis
    if (pH < 7.35) triggerScore += (7.35 - pH) * 2;
    // Infection/fever
    if (hasInfection) triggerScore += 0.2;
    if (temp > 38.5) triggerScore += (temp - 38.5) * 0.1;
    // Tourniquet (stasis)
    if (tourniquetActive) triggerScore += 0.35;
    // HbS concentration amplification
    triggerScore *= hbSFraction;
    // Hydroxyurea protective (~50% HbF increase → reduces sickling)
    if (hydroxyurea) triggerScore *= 0.6;

    const sicklingRiskIndex = clamp(triggerScore, 0, 1.0);

    // ===========================
    // VOC RISK
    // ===========================
    const vocRisk = sicklingRiskIndex * 0.001; // per-second risk of crisis
    const vocActive = !!inputs.vocActive || (sicklingRiskIndex > 0.5 && Math.random() < vocRisk);

    if (vocActive && !prevVOCLogged) {
      events.push(
        `🚨 SICKLE CELL VASO-OCCLUSIVE CRISIS: HbS ${hbSEstimated.toFixed(0)}% sickling in microcirculation. Triggers present: ${spo2 < 95 ? `SpO2 ${spo2}% (hypoxia) ` : ''}${temp < 36 ? `Temp ${temp.toFixed(1)}°C (hypothermia) ` : ''}${!isHydrated ? 'dehydration ' : ''}${pH < 7.35 ? `pH ${pH.toFixed(2)} (acidosis) ` : ''}${tourniquetActive ? 'tourniquet (stasis) ' : ''}. MANAGEMENT: (1) 100% O₂ — immediately raise SpO2 > 95%; (2) IV hydration — normal saline 10 mL/kg bolus; (3) Warm IV fluids and active patient warming; (4) Pain management — multimodal (IV opioids, ketorolac, IV acetaminophen); (5) Consider simple transfusion if Hb < 7 g/dL or exchange transfusion if HbS% not yet < 30%.`,
      );
      prevVOCLogged = true;
    }
    if (!vocActive && sicklingRiskIndex < 0.2) prevVOCLogged = false;

    // ===========================
    // ACS (ACUTE CHEST SYNDROME)
    // ===========================
    const acsInputActive = !!inputs.acsActive;
    const acsMinutes = clamp(safeNumber(inputs.acsMinutesSinceOnset, 0), 0, 5000);
    const acsActive = acsInputActive || (vocActive && hasInfection && sicklingRiskIndex > 0.6);

    let acsSeverity = 0;
    let acsShuntContribution = 0;
    let acsCompliancePenalty = 0;

    if (acsActive) {
      // ACS severity increases over 12-48h (ARDS progression)
      acsSeverity = clamp(acsMinutes / 1440, 0, 1.0); // full severity by 24h
      acsShuntContribution = acsSeverity * 0.35;       // up to 35% shunt (severe ARDS)
      acsCompliancePenalty = acsSeverity * 0.45;       // significant compliance drop

      if (!prevACSLogged) {
        events.push(
          `🚨 ACUTE CHEST SYNDROME: New pulmonary infiltrate + hypoxemia in SCD patient. MOST DANGEROUS SCD complication — leading cause of death. Mechanism: fat emboli from bone infarction + sickling in pulmonary microvasculature. Progressive hypoxia over 12-48h. IMMEDIATE MANAGEMENT: (1) TRANSFUSION — simple transfusion (Hb 10 g/dL target) OR EXCHANGE TRANSFUSION if SpO2 < 90% or rapid deterioration (reduces HbS% most effectively); (2) 100% O₂ → intubation/MV if refractory; (3) Broad-spectrum antibiotics (Atypical coverage — Mycoplasma, Chlamydia, Legionella implicated in ~30%); (4) Bronchodilators (albuterol); (5) Incentive spirometry; (6) IV hydration (maintain normovolemia — not aggressive); (7) Hydroxyurea (chronic prevention, not acute). ICU admission.`,
        );
        prevACSLogged = true;
      }
    }

    // ===========================
    // RISK CLASSIFICATION
    // ===========================
    let intraoperativeRisk: 'low' | 'intermediate' | 'high' | 'critical';
    if (hbSEstimated < 30 && !acsActive && sicklingRiskIndex < 0.2) {
      intraoperativeRisk = 'low';
    } else if (hbSEstimated < 50 && sicklingRiskIndex < 0.4) {
      intraoperativeRisk = 'intermediate';
    } else if (acsActive || sicklingRiskIndex > 0.6) {
      intraoperativeRisk = 'critical';
    } else {
      intraoperativeRisk = 'high';
    }

    const transfusionRecommended = hbSEstimated > 30 || hb < 7;

    return {
      sicklingRiskIndex: parseFloat(sicklingRiskIndex.toFixed(4)),
      vocRisk: parseFloat(vocRisk.toFixed(6)),
      acsRisk: parseFloat(clamp(sicklingRiskIndex * 0.3, 0, 1).toFixed(4)),
      acsActive,
      acsSeverity: parseFloat(acsSeverity.toFixed(4)),
      acsShuntContribution: parseFloat(acsShuntContribution.toFixed(4)),
      acsCompliancePenalty: parseFloat(acsCompliancePenalty.toFixed(4)),
      intraoperativeRisk,
      hbSEstimated: parseFloat(hbSEstimated.toFixed(1)),
      transfusionRecommended,
      prevVOCLogged,
      prevACSLogged,
      events,
    };
  }
}
