/**
 * Amniotic Fluid Embolism (AFE) Model
 *
 * AFE is the most catastrophic obstetric emergency: sudden cardiovascular collapse
 * during labor, delivery, or immediately postpartum. Mortality: 20-60% in published
 * series. Survivors often have permanent neurologic injury.
 *
 * === MECHANISM ===
 * Fetal squames, vernix, hair, meconium, and amniotic fluid components enter the
 * maternal circulation through uterine veins, cervical tears, or placental site →
 * trigger massive immune/inflammatory activation (anaphylactoid-like response).
 *
 * TWO-PHASE model:
 * PHASE 1 (minutes): Acute cor pulmonale from massive PVR increase (fetal squames
 *   physically obstruct pulmonary microvasculature + potent pulmonary vasoconstrictors
 *   in AF) → RV failure → circulatory collapse → CO drops 50-60% within minutes.
 *   Transient hypoxemia from the RV failure and ventilation/perfusion mismatch.
 *   Recovery may occur if patient survives the initial phase.
 *
 * PHASE 2 (minutes to hours after Phase 1): Massive DIC triggered by tissue factor-
 *   rich amniotic fluid entering the systemic circulation → consumption of clotting
 *   factors and platelets → massive hemorrhage (uterine atony + coagulopathy = lethal
 *   combination). Fibrinogen drops dramatically; PT/PTT unmeasurable.
 *
 * === TRIGGERS ===
 * Any breach of the amniotic-vascular barrier:
 * - Delivery (vaginal or cesarean) — especially prolonged, traumatic, or oxytocin-augmented
 * - Artificial rupture of membranes
 * - Placenta removal (manual or surgical)
 * - Uterine rupture
 * - Second trimester abortion
 * - Amnioinfusion
 *
 * === CLINICAL PRESENTATION ===
 * Classic triad: sudden hypotension/cardiovascular collapse, hypoxia, altered consciousness/seizure.
 * Prodrome: chills, coughing, anxiousness, tingling (reported in 10-15 min before collapse).
 * DIC manifests with: oozing from IV sites, dark non-clotting blood, uterine atony.
 *
 * === TREATMENT (supportive only — NO AFE-specific antidote exists) ===
 * 1. CALL FOR HELP: obstetric, neonatal, hematology, blood bank
 * 2. RSI + 100% O2 (hypoxia kills rapidly)
 * 3. Vasopressors: norepinephrine + vasopressin (same as other distributive/obstructive shock)
 * 4. Cardiopulmonary resuscitation (maternal CPR modifications: left lateral tilt)
 * 5. Massive transfusion protocol: pRBC:FFP:PLT = 1:1:1
 * 6. Cryoprecipitate for fibrinogen replacement (target Fib > 200 mg/dL)
 * 7. Recombinant FVIIa for refractory coagulopathy (controversial, last resort)
 * 8. ECMO if refractory arrest at experienced center
 * 9. DELIVERY: expedited delivery improves maternal and neonatal outcomes (decompresses aorta,
 *    improves cardiac output by removing aortocaval compression)
 *
 * === DIFFERENTIAL DIAGNOSIS ===
 * - Massive PE (no DIC, responds to anticoagulation)
 * - Placental abruption (external bleeding more prominent, no sudden collapse typically)
 * - Anaphylaxis (history of allergen exposure, responds to epinephrine)
 * - Eclampsia (seizure-predominant, responds to Mg, less sudden CV collapse)
 * - Uterine rupture (external or intra-abdominal bleeding, prior uterine scar)
 *
 * Sources: Clark SL, NEJM 2014; Pacheco LD, Am J Obstet Gynecol 2011;
 * Society for Maternal-Fetal Medicine, 2016; Miller's 9th Ed Ch 56.
 */

export interface AFEInputs {
  afeActive?: boolean;
  minutesSinceOnset?: number;       // progression timing
  // Phase 1: acute cor pulmonale severity
  // Phase 2: DIC severity (builds after phase 1)
  currentFibrinogen?: number;       // mg/dL (for DIC severity context)
  tpaGiven?: boolean;               // tPA would worsen hemorrhage
  prevAFEOnsetLogged?: boolean;
  prevAFEPhase2Logged?: boolean;
}

export interface AFEOutput {
  afeActive: boolean;
  minutesSinceOnset: number;
  phase1Active: boolean;            // acute cor pulmonale (first ~30 min)
  phase2Active: boolean;            // DIC phase
  rvFailureFraction: number;        // 0-1: 0=normal, 1=complete RV failure → CO=0
  pvrMultiplier: number;            // PVR increase (1-5×)
  svrDropFraction: number;          // 0-0.7: distributive shock component
  cardiacOutputFraction: number;    // fraction of normal CO remaining (0.05-1.0)
  dic_fibrinogenConsumptionRate: number; // mg/dL per minute consumed
  dic_plateletConsumptionRate: number;   // cells/μL per minute consumed
  dic_factorConsumptionRate: number;     // fraction/minute factor activity lost
  prevAFEOnsetLogged: boolean;
  prevAFEPhase2Logged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AmniotiFluidEmbolismModel {
  static tick(inputs: AFEInputs = {}): AFEOutput {
    const events: string[] = [];
    let prevAFEOnsetLogged = !!inputs.prevAFEOnsetLogged;
    let prevAFEPhase2Logged = !!inputs.prevAFEPhase2Logged;

    const afeActive = !!inputs.afeActive;

    if (!afeActive) {
      return {
        afeActive: false, minutesSinceOnset: 0,
        phase1Active: false, phase2Active: false,
        rvFailureFraction: 0, pvrMultiplier: 1.0, svrDropFraction: 0,
        cardiacOutputFraction: 1.0,
        dic_fibrinogenConsumptionRate: 0, dic_plateletConsumptionRate: 0, dic_factorConsumptionRate: 0,
        prevAFEOnsetLogged, prevAFEPhase2Logged, events,
      };
    }

    const minutesSince = clamp(safeNumber(inputs.minutesSinceOnset, 0), 0, 240);

    // ===========================
    // ONSET EVENT
    // ===========================
    if (!prevAFEOnsetLogged) {
      events.push(
        `☠️ AMNIOTIC FLUID EMBOLISM (AFE): Most catastrophic obstetric emergency. Sudden cardiovascular collapse from AF entering maternal circulation — acute cor pulmonale (RV failure), then DIC. CALL FOR HELP IMMEDIATELY: obstetrics, blood bank (MTP), neonatal team, anesthesia team. ACTIONS: (1) RSI + 100% O2; (2) Vasopressors (norepinephrine + vasopressin); (3) CPR with left lateral tilt; (4) Emergent cesarean/delivery if not delivered; (5) Massive transfusion 1:1:1 (pRBC:FFP:PLT); (6) Cryoprecipitate for fibrinogen. NO AFE-SPECIFIC ANTIDOTE. Mortality 20-60%. Diagnosis is clinical.`,
      );
      prevAFEOnsetLogged = true;
    }

    // ===========================
    // PHASE 1: ACUTE COR PULMONALE (0-30 min)
    // ===========================
    // Rapid PVR rise → RV failure → CO collapse
    const phase1Active = minutesSince < 30;
    const phase1Severity = phase1Active
      ? Math.min(1.0, minutesSince < 5 ? minutesSince / 5 : 1.0 - (minutesSince - 5) * 0.03)
      : Math.max(0, 0.70 - (minutesSince - 30) * 0.02); // partial recovery after 30 min

    const pvrMultiplier = 1.0 + phase1Severity * 4.0; // up to 5× PVR
    const rvFailureFraction = clamp(phase1Severity * 0.85, 0, 0.85);
    const svrDropFraction = phase1Severity * 0.35; // distributive component (inflammatory)
    const cardiacOutputFraction = clamp(1.0 - rvFailureFraction * 0.90, 0.05, 1.0);

    // ===========================
    // PHASE 2: DIC (begins ~5 min, peaks 30-120 min)
    // ===========================
    const phase2Active = minutesSince >= 5;
    const phase2Severity = phase2Active
      ? clamp((minutesSince - 5) / 30, 0, 1.0)
      : 0;

    // DIC consumption rates per minute
    const dic_fibrinogenConsumptionRate = phase2Severity * 8.0;   // mg/dL per min (normal ~350 mg/dL)
    const dic_plateletConsumptionRate = phase2Severity * 3000;     // cells/μL per min
    const dic_factorConsumptionRate = phase2Severity * 0.03;       // fraction per min

    if (phase2Active && !prevAFEPhase2Logged) {
      events.push(
        `🚨 AFE PHASE 2 — DIC: Consumptive coagulopathy from amniotic fluid tissue factor now active. Fibrinogen dropping rapidly (normal 350 mg/dL → <100 mg/dL in minutes). PT/PTT prolonging. Bleeding from ALL sites (IV sites, surgical field, uterus). MASSIVE TRANSFUSION: (1) Cryoprecipitate 10 units (fibrinogen replacement — target > 200 mg/dL); (2) FFP 4 units (factor replacement); (3) Platelets 1 pool (6 units); (4) pRBC as needed for Hb. rFVIIa (NovoSeven) 90 mcg/kg as LAST RESORT if refractory. Concurrent uterine atony makes hemorrhage control impossible without coagulation correction.`,
      );
      prevAFEPhase2Logged = true;
    }

    return {
      afeActive,
      minutesSinceOnset: minutesSince,
      phase1Active,
      phase2Active,
      rvFailureFraction: parseFloat(rvFailureFraction.toFixed(4)),
      pvrMultiplier: parseFloat(pvrMultiplier.toFixed(3)),
      svrDropFraction: parseFloat(svrDropFraction.toFixed(4)),
      cardiacOutputFraction: parseFloat(cardiacOutputFraction.toFixed(4)),
      dic_fibrinogenConsumptionRate: parseFloat(dic_fibrinogenConsumptionRate.toFixed(2)),
      dic_plateletConsumptionRate: parseFloat(dic_plateletConsumptionRate.toFixed(0)),
      dic_factorConsumptionRate: parseFloat(dic_factorConsumptionRate.toFixed(4)),
      prevAFEOnsetLogged,
      prevAFEPhase2Logged,
      events,
    };
  }
}
