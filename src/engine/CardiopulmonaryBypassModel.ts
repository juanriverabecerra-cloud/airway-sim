/**
 * Cardiopulmonary Bypass (CPB) Physiology Model
 *
 * CPB is used in cardiac surgery (CABG, valve repair/replacement, thoracic aortic surgery,
 * congenital heart repairs) to maintain circulation while the heart is arrested.
 * The CPB circuit is a roller/centrifugal pump + oxygenator + heat exchanger.
 *
 * === THREE PHASES OF CARDIAC SURGERY WITH CPB ===
 *
 * PHASE 1 — BEFORE CPB (Normal physiology + surgical preparation):
 * - Full heparinization (ACT > 400-480s): already modeled in ClinicalScoringEngine
 * - Cannulation: aortic (arterial) + right atrium or bicaval (venous)
 *
 * PHASE 2 — ON CPB:
 * a) Going on bypass: cross-clamping aorta → cardioplegia → cardiac arrest
 *    → CPB pump provides ALL systemic blood flow (non-pulsatile in most cases)
 *
 * b) On bypass physiology:
 *    - Non-pulsatile flow: mean arterial flow (not pulsatile) → less baroreceptor activation
 *      → less vasopressin/cortisol release → hemodynamic control easier but endocrine effects
 *    - Hemodilution: CPB prime volume (~1.5-2L) dilutes blood
 *      → Hb drops from 14 → 8-10 g/dL typically
 *    - Temperature management: normothermic (37°C), mild hypothermia (32-34°C), or
 *      deep hypothermic circulatory arrest (DHCA: 18-20°C, complete arrest)
 *    - Systemic inflammatory response (SIRS): CPB activates complement, leukocytes →
 *      cytokine storm → increased capillary permeability → edema → organ dysfunction
 *    - MAP target on CPB: typically 60-80 mmHg; higher (> 70) in patients with peripheral
 *      vascular disease, diabetes, carotid stenosis (cerebral autoregulation may be shifted)
 *    - ACT monitoring: maintain ACT > 400-480s throughout
 *
 * c) Cardioplegia: hyperkalemic (K+ 20-30 mEq/L), cold (4°C) or warm blood cardioplegia
 *    → depolarizes cardiac muscle → diastolic arrest → protects myocardium
 *    → delivered every 20 min to maintain arrest
 *
 * PHASE 3 — WEANING FROM CPB:
 * - Warm heart to 37°C (rewarming)
 * - Reperfusion of coronary arteries after clamp release
 * - Spontaneous cardiac rhythm or defibrillation
 * - Volume loading, gradual pump weaning
 * - De-air (remove air from aorta, pulmonary arteries)
 * - Protamine reversal of heparin (1 mg protamine : 100 units heparin)
 *
 * === CPB COMPLICATIONS ===
 * 1. PROTAMINE REACTIONS: Anaphylaxis, hypotension, pulmonary hypertension, platelet
 *    activation. Risk factors: NPH insulin users (zinc-protamine insulin), fish allergy,
 *    prior protamine exposure. Incidence: ~3-4%.
 * 2. COGNITIVE DYSFUNCTION: Microemboli (air, debris) → POCD in 25-70% at 1 week
 * 3. CAPILLARY LEAK: SIRS → 3rd spacing → weight gain, pleural effusions
 * 4. TRANSFUSION: Hemodilution + coagulopathy → high transfusion requirement
 * 5. DEEP HYPOTHERMIC CIRCULATORY ARREST (DHCA): Organ protection via metabolic suppression
 *    but risk of neurologic injury at long arrest times (>45 min safe window at 18-20°C)
 *
 * Sources: Gravlee GP (ed), Cardiopulmonary Bypass, 3rd ed; Mossad EB, Semin Thorac
 * Cardiovasc Surg 2009; Shann KG, Anesthesiology 2006; Miller's 9th Ed Ch 65 (CPB).
 */

export interface CPBInputs {
  onBypass?: boolean;                   // CPB circuit active
  bypassMinutesSince?: number;          // duration on bypass
  cpbFlowRateLMin?: number;             // bypass pump flow (L/min); target ~2.4 L/m² BSA
  cpbTemperatureC?: number;             // perfusate temperature (32-37 = normothermic/mild hypothermic; 18-20 = DHCA)
  aortaClamped?: boolean;               // cardiac arrest in progress
  primeVolumeAddedMl?: number;          // hemodilution from CPB prime

  // Medications
  heparinCe?: number;                   // target ACT > 400-480s
  protamineCe?: number;                 // heparin reversal at end of CPB
  hasProtamineHistory?: boolean;        // prior exposure → higher reaction risk
  hasNPHInsulin?: boolean;              // NPH insulin = protamine-zinc → sensitized

  // Current hemodynamics
  currentMAP?: number;
  currentHb?: number;                   // post-hemodilution
  bsaM2?: number;                       // body surface area for indexed flow

  // Event guards
  prevCPBOnsetLogged?: boolean;
  prevClampLogged?: boolean;
  prevProtamineLogged?: boolean;
  prevWeaningLogged?: boolean;
}

export interface CPBOutput {
  onBypass: boolean;
  bypassDurationMinutes: number;
  hemodilutionHb: number;               // expected post-prime Hb (g/dL)
  mapOnBypass: number;                  // expected MAP on bypass
  cardiacArrestActive: boolean;         // aortic cross-clamped
  isHypothermic: boolean;               // temp < 34°C
  dhcaActive: boolean;                  // deep hypothermic circulatory arrest

  // Flow adequacy
  cpbFlowIndexed: number;               // L/min/m² (normal 2.2-2.5)
  flowAdequate: boolean;

  // SIRS/complications
  sirsIndex: number;                    // 0-1 (increases with bypass duration)
  capillaryLeakIndex: number;           // 0-1 (edema/third-spacing)
  protamineReactionRisk: number;        // 0-1 if protamine given

  prevCPBOnsetLogged: boolean;
  prevClampLogged: boolean;
  prevProtamineLogged: boolean;
  prevWeaningLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class CardiopulmonaryBypassModel {
  static tick(inputs: CPBInputs = {}): CPBOutput {
    const events: string[] = [];
    let prevCPBOnsetLogged = !!inputs.prevCPBOnsetLogged;
    let prevClampLogged = !!inputs.prevClampLogged;
    let prevProtamineLogged = !!inputs.prevProtamineLogged;
    let prevWeaningLogged = !!inputs.prevWeaningLogged;

    const onBypass = !!inputs.onBypass;
    const bypassMin = clamp(safeNumber(inputs.bypassMinutesSince, 0), 0, 600);
    const cpbFlow = clamp(safeNumber(inputs.cpbFlowRateLMin, 4.5), 0.5, 10);
    const cpbTemp = clamp(safeNumber(inputs.cpbTemperatureC, 37), 15, 40);
    const aortaClamped = !!inputs.aortaClamped;
    const primeMl = clamp(safeNumber(inputs.primeVolumeAddedMl, 1500), 0, 3000);
    const heparinCe = clamp(safeNumber(inputs.heparinCe, 0), 0, 20);
    const protamineCe = clamp(safeNumber(inputs.protamineCe, 0), 0, 20);
    const hasProtamineHistory = !!inputs.hasProtamineHistory;
    const hasNPH = !!inputs.hasNPHInsulin;
    const currentHb = clamp(safeNumber(inputs.currentHb, 14), 4, 18);
    const bsa = clamp(safeNumber(inputs.bsaM2, 1.73), 1.0, 2.5);

    if (!onBypass) {
      return {
        onBypass: false, bypassDurationMinutes: 0, hemodilutionHb: currentHb,
        mapOnBypass: 0, cardiacArrestActive: false, isHypothermic: false, dhcaActive: false,
        cpbFlowIndexed: 0, flowAdequate: true, sirsIndex: 0, capillaryLeakIndex: 0,
        protamineReactionRisk: 0,
        prevCPBOnsetLogged, prevClampLogged, prevProtamineLogged, prevWeaningLogged, events,
      };
    }

    // ===========================
    // HEMODILUTION
    // ===========================
    // CPB prime dilutes blood: new Hb = Hb × (patient blood vol) / (patient vol + prime vol)
    const patientBloodVolMl = bsa * 2700; // ~2.7 L/m² BSA
    const hemodilutionHb = clamp(
      currentHb * patientBloodVolMl / (patientBloodVolMl + primeMl),
      4, currentHb,
    );

    // ===========================
    // FLOW ADEQUACY
    // ===========================
    const cpbFlowIndexed = cpbFlow / bsa; // L/min/m²
    const flowAdequate = cpbFlowIndexed >= 1.8; // minimum 1.8 L/min/m²

    // ===========================
    // TEMPERATURE / DHCA
    // ===========================
    const isHypothermic = cpbTemp < 34;
    const dhcaActive = cpbTemp <= 20 && aortaClamped;

    // MAP on bypass (non-pulsatile flow → lower afterload → lower MAP)
    const mapOnBypass = clamp(cpbFlow * 15 - 10, 45, 100); // rough estimate

    // ===========================
    // SIRS INDEX
    // ===========================
    // SIRS increases with bypass duration (complement, cytokines, leukocyte activation)
    const sirsIndex = clamp(bypassMin / 120, 0, 1.0); // full SIRS at 2h+
    const capillaryLeakIndex = sirsIndex * 0.7;

    // ===========================
    // PROTAMINE REACTION RISK
    // ===========================
    const protamineReactionRisk = protamineCe > 0
      ? clamp(
          (hasProtamineHistory ? 0.15 : 0.03)
          + (hasNPH ? 0.12 : 0),
          0, 0.30,
        )
      : 0;

    // ===========================
    // EVENTS
    // ===========================
    if (!prevCPBOnsetLogged) {
      events.push(
        `🫀 CPB INITIATED: Cardiopulmonary bypass active. Flow ${cpbFlow.toFixed(1)} L/min (indexed: ${cpbFlowIndexed.toFixed(1)} L/min/m²). Temperature: ${cpbTemp.toFixed(0)}°C (${dhcaActive ? 'DHCA — complete circulatory arrest' : isHypothermic ? 'hypothermic' : 'normothermic'}). Expected Hb after hemodilution: ${hemodilutionHb.toFixed(1)} g/dL (from prime ${primeMl.toFixed(0)} mL). MAP target on CPB: 60-80 mmHg (higher if PVD/diabetes/carotid stenosis). ACT must be > 480s (heparin ${heparinCe.toFixed(1)} units/mL-equivalent). SIRS will develop progressively — anti-inflammatory strategies (steroids, aprotinin in some centers) reduce cytokine release.`,
      );
      prevCPBOnsetLogged = true;
    }

    if (aortaClamped && !prevClampLogged) {
      events.push(
        `🩸 AORTIC CROSS-CLAMP APPLIED: Cardiac arrest initiated. Cardioplegia delivery (hyperkalemic K⁺ 20-30 mEq/L solution) into coronary ostia. Heart in diastolic arrest — mechanical work STOPPED. Cross-clamp time begins. Target: complete cardiac arrest, EEG flat (if monitoring). Cardioplegia re-dose every 15-20 min. Monitor myocardium temperature (target ≤ 15°C for cold cardioplegia). Cross-clamp time > 120 min → increasing myocardial protection concerns. Log cross-clamp start time — important determinant of cardiac surgery outcome.`,
      );
      prevClampLogged = true;
    }

    if (protamineCe > 0 && !prevProtamineLogged) {
      events.push(
        `⚠️ PROTAMINE ADMINISTRATION: Heparin reversal with protamine (1 mg per 100 units heparin used). REACTION RISK: ${(protamineReactionRisk * 100).toFixed(0)}% in this patient${hasNPH ? ' (NPH insulin history → sensitized via zinc-protamine)' : ''}${hasProtamineHistory ? ' (prior protamine exposure)' : ''}. Reactions: anaphylaxis (most severe), pulmonary hypertension (common), hypotension. SIGNS: sudden ↓BP + ↑PAP + ↑CVP within 2-5 min of protamine. TREATMENT: Stop protamine; epinephrine; inhaled nitric oxide/epoprostenol for pulmonary HTN; may need to go back on bypass. SLOW INFUSION (over 5-10 min) reduces reaction severity. Have heparin ready if reaction → revert to heparin.`,
      );
      prevProtamineLogged = true;
    }

    return {
      onBypass,
      bypassDurationMinutes: bypassMin,
      hemodilutionHb: parseFloat(hemodilutionHb.toFixed(2)),
      mapOnBypass: parseFloat(mapOnBypass.toFixed(0)),
      cardiacArrestActive: aortaClamped,
      isHypothermic,
      dhcaActive,
      cpbFlowIndexed: parseFloat(cpbFlowIndexed.toFixed(3)),
      flowAdequate,
      sirsIndex: parseFloat(sirsIndex.toFixed(4)),
      capillaryLeakIndex: parseFloat(capillaryLeakIndex.toFixed(4)),
      protamineReactionRisk: parseFloat(protamineReactionRisk.toFixed(4)),
      prevCPBOnsetLogged,
      prevClampLogged,
      prevProtamineLogged,
      prevWeaningLogged,
      events,
    };
  }
}
