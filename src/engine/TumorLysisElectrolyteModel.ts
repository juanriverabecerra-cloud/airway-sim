/**
 * Tumor Lysis Syndrome (TLS) + Comprehensive Electrolyte Physiology
 *
 * Two related gaps addressed here:
 * (A) Tumor Lysis Syndrome — a medical emergency after rapid tumor cell death
 * (B) Electrolyte-specific cardiac and neuromuscular effects beyond K+ tracking
 *
 * =========================================================================
 * A. TUMOR LYSIS SYNDROME (TLS)
 * =========================================================================
 * When massive tumor cell lysis releases intracellular contents into the bloodstream,
 * a metabolic tetrad of:
 *   1. HYPERURICEMIA — nucleic acid → xanthine → uric acid (can cause renal urate crystals)
 *   2. HYPERPHOSPHATEMIA — intracellular phosphate release → binds Ca2+ → Ca3(PO4)2 crystals
 *   3. HYPOCALCEMIA — from Ca2+·PO4 chelation + reduced calcitriol (AKI)
 *   4. HYPERKALEMIA — intracellular K+ release → cardiac arrest risk
 *
 * Complications:
 *   - AKI from urate and Ca-phosphate nephropathy
 *   - Cardiac arrhythmias from HyperK and hypocalcemia
 *   - Seizures from hypocalcemia (tetany → neuromuscular irritability)
 *   - Sudden death (from arrhythmias in unprepared patients)
 *
 * Risk factors for TLS:
 *   - Burkitt's lymphoma (highest risk)
 *   - DLBCL with high LDH
 *   - ALL/AML with high WBC
 *   - Any tumor with large, chemosensitive burden
 *
 * CAIRO-BISHOP CRITERIA (laboratory TLS):
 *   ≥ 2 of the following, within 3 days before → 7 days after chemotherapy:
 *   - Uric acid ≥ 8.0 mg/dL (or 25% increase)
 *   - Potassium ≥ 6.0 mEq/L (or 25% increase)
 *   - Phosphorus ≥ 4.5 mg/dL (or 25% increase)
 *   - Calcium ≤ 7.0 mg/dL (or 25% decrease)
 *
 * PREVENTION & TREATMENT:
 *   1. Allopurinol (xanthine oxidase inhibitor): prevents new uric acid production
 *      Must be started BEFORE chemotherapy in high-risk patients
 *   2. Rasburicase (recombinant urate oxidase): rapidly DEGRADES uric acid
 *      First-line in HIGH-risk; contraindicated in G6PD deficiency (hemolysis)
 *   3. Aggressive IV hydration (3 L/m² BSA per day) to maintain UO 3-5 mL/kg/hr
 *   4. Correct hypocalcemia IF symptomatic (NOT prophylactically — may worsen CaPO4 precipitation)
 *   5. Treat hyperkalemia (see hyperkalemia treatment chain)
 *   6. Dialysis if refractory
 *
 * =========================================================================
 * B. ELECTROLYTE-SPECIFIC ORGAN EFFECTS
 * =========================================================================
 *
 * HYPOCALCEMIA (Ca2+ < 8.5 mg/dL, ionized < 4.6 mg/dL):
 *   Mechanism: increased membrane excitability (Ca2+ stabilizes)
 *   Effects: tetany (carpopedal spasm, Chvostek's sign, Trousseau's sign),
 *            laryngospasm, seizures, prolonged QTc → TdP risk
 *            cardiac dysfunction (decreased contractility, hypotension)
 *   Treatment: Ca gluconate 1-3g IV (first-line); Ca chloride more potent (3× Ca2+ per gram)
 *             Correct Mg first (hypoMg makes hypoCa refractory to treatment)
 *
 * HYPOMAGNESEMIA (Mg2+ < 1.5 mEq/L):
 *   One of the most COMMON electrolyte disorders in hospitalized patients (10-65%).
 *   Effects: refractory hypokalemia (Mg required for K+ renal reabsorption — can't correct K+ without Mg)
 *            refractory hypocalcemia (Mg required for PTH release)
 *            cardiac: prolonged QT, torsades de pointes, AF
 *            neuromuscular: tremors, fasciculations, seizures
 *   Treatment: Mg sulfate 1-4g IV over 20-30 min (acute); 8-24g over 24h for severe depletion
 *
 * HYPONATREMIA (Na+ < 135 mEq/L):
 *   Most common electrolyte disorder, especially in PACU (excess SIADH from surgery, pain,
 *   N2O, opioids). From TURP syndrome is dramatically hyponatremic.
 *   Dangers: cerebral edema (when Na drops rapidly); osmotic demyelination (when Na corrected too fast)
 *   Rule: correct Na+ no faster than 10-12 mEq/L per 24h to prevent ODS.
 *   Treatment: fluid restriction (mild SIADH); hypertonic saline 3% (symptomatic/severe)
 *
 * Sources: Cairo MS, Br J Haematol 2004; Howard SC, NEJM 2011 (TLS);
 * Miller's 9th Ed Ch 44 (Electrolytes in Perioperative Medicine).
 */

export interface TumorLysisElectrolyteInputs {
  // TLS
  tlsActive?: boolean;
  tlsMinutesSince?: number;
  tlsRiskLevel?: 'low' | 'intermediate' | 'high'; // tumor type/burden
  allopurinolActive?: boolean;
  rasburicaseCe?: number;          // urate oxidase (rapidly degrades uric acid)
  ivFluidRateMlHr?: number;        // hydration rate for TLS prevention

  // Electrolytes (for derived effects)
  currentCa?: number;              // mg/dL (total, normal 8.5-10.5)
  currentMg?: number;              // mEq/L (normal 1.5-2.5)
  currentNa?: number;              // mEq/L (normal 135-145)
  currentPhos?: number;            // mg/dL (normal 2.5-4.5)
  prevNa?: number;                 // for correction rate tracking

  // Treatment
  calciumGluconateCe?: number;     // for hypocalcemia treatment
  magnesiumSulfateCe?: number;     // for hypomagnesemia

  // Event guards
  prevTLSLogged?: boolean;
  prevHypoCaLogged?: boolean;
  prevHypoMgLogged?: boolean;
  prevHypoNaLogged?: boolean;
}

export interface TumorLysisElectrolyteOutput {
  // TLS
  tlsActive: boolean;
  uricAcidMgDl: number;           // estimated (normal < 7.0 mg/dL)
  phosphorusMgDl: number;         // estimated elevation
  hyperuricemiaActive: boolean;
  hyperphosphatemiaMiActive: boolean;

  // Hypocalcemia effects
  hypocalcemiaActive: boolean;
  hypocalcemiaQTcContribution: number; // ms prolongation
  hypocalcemiaNeuromuscularIndex: number; // 0-1 (tetany risk)
  hypocalcemiaContractilityPenalty: number; // 0-0.3 reduction in inotropy
  calciumTreatmentEfficacy: number;

  // Hypomagnesemia effects
  hypomagnesemiaActive: boolean;
  hypomagnesemiaQTcContribution: number; // ms
  hypomagnesemiaK_Resistance: number; // 0-1: how resistant hypokalemia is to correction
  hypomagnesemiaArrhythmiaRisk: number; // 0-1

  // Hyponatremia effects
  hyponatremiaActive: boolean;
  hyponatremiaEncephalopathyRisk: number; // 0-1
  hyponatremiaSafeCorrection: boolean; // within 10-12 mEq/L per 24h

  prevTLSLogged: boolean;
  prevHypoCaLogged: boolean;
  prevHypoMgLogged: boolean;
  prevHypoNaLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class TumorLysisElectrolyteModel {
  static tick(inputs: TumorLysisElectrolyteInputs = {}): TumorLysisElectrolyteOutput {
    const events: string[] = [];
    let prevTLSLogged = !!inputs.prevTLSLogged;
    let prevHypoCaLogged = !!inputs.prevHypoCaLogged;
    let prevHypoMgLogged = !!inputs.prevHypoMgLogged;
    let prevHypoNaLogged = !!inputs.prevHypoNaLogged;

    const tlsActive = !!inputs.tlsActive;
    const tlsMinutes = clamp(safeNumber(inputs.tlsMinutesSince, 0), 0, 10000);
    const tlsRisk = inputs.tlsRiskLevel || 'intermediate';
    const allopurinol = !!inputs.allopurinolActive;
    const rasburicase = clamp(safeNumber(inputs.rasburicaseCe, 0), 0, 10);
    const ivRate = clamp(safeNumber(inputs.ivFluidRateMlHr, 100), 0, 2000);

    const ca = clamp(safeNumber(inputs.currentCa, 9.5), 4, 14);
    const mg = clamp(safeNumber(inputs.currentMg, 1.8), 0, 4);
    const na = clamp(safeNumber(inputs.currentNa, 140), 100, 160);
    const phos = clamp(safeNumber(inputs.currentPhos, 3.5), 1, 20);
    const prevNa = clamp(safeNumber(inputs.prevNa, na), 100, 160);
    const calciumGluconateCe = clamp(safeNumber(inputs.calciumGluconateCe, 0), 0, 10);
    const magnesiumSulfateCe = clamp(safeNumber(inputs.magnesiumSulfateCe, 0), 0, 10);

    // ===========================
    // TUMOR LYSIS SYNDROME
    // ===========================
    const tlsRiskMultiplier = tlsRisk === 'high' ? 1.5 : tlsRisk === 'intermediate' ? 1.0 : 0.5;
    const hydrationProtection = Math.min(1.0, ivRate / 200); // 200 mL/hr = moderate protection
    const rasburicaseEfficacy = rasburicase > 0 ? clamp(rasburicase / (rasburicase + 0.5) * 0.95, 0, 0.95) : 0;
    const allopurinolEfficacy = allopurinol ? 0.50 : 0; // prevents NEW uric acid, not existing

    // Uric acid rises rapidly after TLS onset (peaks at 12-24h)
    const uricAcidRaw = tlsActive
      ? 4.0 + (tlsMinutes / 60) * tlsRiskMultiplier * 0.5 * (1 - hydrationProtection * 0.4)
      : 5.0;
    const uricAcidMgDl = clamp(
      uricAcidRaw * (1 - rasburicaseEfficacy) * (1 - allopurinolEfficacy * 0.3),
      0, 30,
    );

    // Phosphorus elevation (peaks 2-4h after TLS)
    const phosphorusMgDl = tlsActive
      ? clamp(phos + (tlsMinutes / 120) * tlsRiskMultiplier * 1.5, phos, 15)
      : phos;

    const hyperuricemiaActive = uricAcidMgDl > 8.0;
    const hyperphosphatemiaMiActive = phosphorusMgDl > 4.5;

    if (tlsActive && !prevTLSLogged) {
      events.push(
        `🚨 TUMOR LYSIS SYNDROME (TLS): Massive tumor cell lysis → simultaneous HYPERURICEMIA (${uricAcidMgDl.toFixed(1)} mg/dL) + HYPERPHOSPHATEMIA + HYPOCALCEMIA + HYPERKALEMIA. IMMEDIATE ACTIONS: (1) AGGRESSIVE IV HYDRATION: 3 L/m² BSA/day, target UO 3-5 mL/kg/hr; (2) RASBURICASE 0.2 mg/kg IV — rapidly degrades existing uric acid (contraindicated in G6PD deficiency → check FIRST); (3) Allopurinol if rasburicase not available; (4) Monitor K⁺, Ca²⁺, Phos, uric acid, creatinine q4-6h; (5) Treat hyperkalemia (Ca gluconate for membrane stabilization, insulin/dextrose for shift); (6) Correct Ca²⁺ ONLY if symptomatic (IV Ca increases CaPO4 precipitation); (7) Dialysis if refractory AKI or severe electrolytes.`,
      );
      prevTLSLogged = true;
    }

    // ===========================
    // HYPOCALCEMIA EFFECTS
    // ===========================
    const hypocalcemiaActive = ca < 8.5;
    const hypocalcemiaSeverity = hypocalcemiaActive ? clamp((8.5 - ca) / 3.5, 0, 1.0) : 0;

    // QTc prolongation from hypocalcemia (can cause TdP)
    const hypocalcemiaQTcContribution = hypocalcemiaActive
      ? clamp(hypocalcemiaSeverity * 80, 0, 100) : 0; // up to 100ms QTc increase

    // Neuromuscular irritability (tetany, laryngospasm) — signature of hypocalcemia
    const hypocalcemiaNeuromuscularIndex = hypocalcemiaActive
      ? clamp(hypocalcemiaSeverity * 0.8, 0, 0.8) : 0;

    // Cardiac contractility: Ca2+ is required for excitation-contraction coupling
    const hypocalcemiaContractilityPenalty = hypocalcemiaActive
      ? clamp(hypocalcemiaSeverity * 0.3, 0, 0.30) : 0;

    // Calcium treatment efficacy
    const calciumTreatmentEfficacy = calciumGluconateCe > 0
      ? clamp(calciumGluconateCe / (calciumGluconateCe + 1.0) * 0.85, 0, 0.85) : 0;

    if (hypocalcemiaActive && ca < 7.5 && !prevHypoCaLogged) {
      events.push(
        `⚠️ HYPOCALCEMIA (Ca²⁺ ${ca.toFixed(1)} mg/dL): Neuromuscular irritability — Chvostek's sign (facial twitch on tapping), Trousseau's sign (carpopedal spasm), LARYNGOSPASM risk (lifts vocal cords with Ca²⁺ drops), tetany, seizures. QTc PROLONGED → torsades risk. CARDIAC: decreased contractility. TREATMENT: CALCIUM GLUCONATE 1-3g IV over 10-20 min (${ca < 6.5 ? 'URGENT' : 'semi-urgent'}). Note: Ca chloride gives 3× more ionized Ca per gram but causes tissue necrosis if extravasated — prefer gluconate for peripheral IVs. CORRECT HYPOMAGNESEMIA FIRST if present (Mg required for PTH release; hypoCa refractory to Ca without correcting Mg).`,
      );
      prevHypoCaLogged = true;
    }
    if (!hypocalcemiaActive) prevHypoCaLogged = false;

    // ===========================
    // HYPOMAGNESEMIA EFFECTS
    // ===========================
    const hypomagnesemiaActive = mg < 1.5;
    const hypomagSeverity = hypomagnesemiaActive ? clamp((1.5 - mg) / 1.0, 0, 1.0) : 0;

    const hypomagnesemiaQTcContribution = hypomagnesemiaActive
      ? clamp(hypomagSeverity * 50, 0, 60) : 0; // up to 60ms

    // Hypomagnesemia makes hypokalemia refractory (Mg needed for renal K+ reabsorption)
    const hypomagnesemiaK_Resistance = hypomagnesemiaActive
      ? clamp(hypomagSeverity * 0.7, 0, 0.7) : 0;

    const hypomagnesemiaArrhythmiaRisk = hypomagnesemiaActive
      ? clamp(hypomagSeverity * 0.5, 0, 0.5) : 0;

    if (hypomagnesemiaActive && mg < 1.0 && !prevHypoMgLogged) {
      events.push(
        `⚠️ HYPOMAGNESEMIA (Mg²⁺ ${mg.toFixed(1)} mEq/L): ONE OF THE MOST COMMON ELECTROLYTE DISORDERS and most commonly missed. KEY TEACHING: Hypomagnesemia causes REFRACTORY HYPOKALEMIA (Mg required for renal K+ reabsorption by ROMK channels) — cannot correct K+ without correcting Mg first. Also causes refractory hypocalcemia (Mg required for PTH release). CARDIAC: prolonged QTc → torsades de pointes, AF, ventricular arrhythmias. NEURO: tremors, nystagmus, seizures. TREATMENT: MgSO4 2-4g IV over 20-30 min; 8-24g over 24h for severe depletion. Safe in renal failure at replacement doses (titrate by DTR monitoring). CHECK Mg in ALL patients with refractory K+ despite supplementation.`,
      );
      prevHypoMgLogged = true;
    }
    if (!hypomagnesemiaActive) prevHypoMgLogged = false;

    // ===========================
    // HYPONATREMIA EFFECTS
    // ===========================
    const hyponatremiaActive = na < 135;
    const hyponatremiaSeverity = hyponatremiaActive ? clamp((135 - na) / 25, 0, 1.0) : 0;

    // Encephalopathy risk from cerebral edema (osmotic swelling)
    const hyponatremiaEncephalopathyRisk = na < 125
      ? clamp((125 - na) / 15, 0, 1.0) : 0;

    // Safe correction rate: < 10-12 mEq/L per 24h (to avoid osmotic demyelination/ODS).
    // prevNa should be the value from ~24h ago for meaningful comparison;
    // here we check the absolute delta regardless of time window.
    const naAbsDelta = Math.abs(na - prevNa);
    const hyponatremiaSafeCorrection = naAbsDelta <= 12;

    if (hyponatremiaActive && na < 128 && !prevHypoNaLogged) {
      events.push(
        `⚠️ HYPONATREMIA (Na⁺ ${na.toFixed(0)} mEq/L): Symptoms threshold: Na < 125 → lethargy, confusion; < 120 → seizures, herniation. TREATMENT: (1) Mild/asymptomatic: fluid restriction; (2) MODERATE (Na 120-128 with symptoms): 3% NaCl 100-150 mL over 20 min, repeat PRN until symptoms resolve; (3) SEVERE (Na < 120 or seizures): 3% NaCl target Na increase of 1-2 mEq/L/hr for first 2h. CORRECTION RATE CRITICAL: MAXIMUM 10-12 mEq/L per 24h → faster correction → OSMOTIC DEMYELINATION SYNDROME (ODS) = irreversible brainstem injury (locked-in syndrome). Common perioperative causes: SIADH (pain, opioids, N₂O), TURP syndrome (glycine absorption), excess hypotonic fluids.`,
      );
      prevHypoNaLogged = true;
    }
    if (!hyponatremiaActive) prevHypoNaLogged = false;

    return {
      tlsActive,
      uricAcidMgDl: parseFloat(uricAcidMgDl.toFixed(2)),
      phosphorusMgDl: parseFloat(phosphorusMgDl.toFixed(2)),
      hyperuricemiaActive,
      hyperphosphatemiaMiActive,
      hypocalcemiaActive,
      hypocalcemiaQTcContribution: parseFloat(hypocalcemiaQTcContribution.toFixed(1)),
      hypocalcemiaNeuromuscularIndex: parseFloat(hypocalcemiaNeuromuscularIndex.toFixed(4)),
      hypocalcemiaContractilityPenalty: parseFloat(hypocalcemiaContractilityPenalty.toFixed(4)),
      calciumTreatmentEfficacy: parseFloat(calciumTreatmentEfficacy.toFixed(4)),
      hypomagnesemiaActive,
      hypomagnesemiaQTcContribution: parseFloat(hypomagnesemiaQTcContribution.toFixed(1)),
      hypomagnesemiaK_Resistance: parseFloat(hypomagnesemiaK_Resistance.toFixed(4)),
      hypomagnesemiaArrhythmiaRisk: parseFloat(hypomagnesemiaArrhythmiaRisk.toFixed(4)),
      hyponatremiaActive,
      hyponatremiaEncephalopathyRisk: parseFloat(hyponatremiaEncephalopathyRisk.toFixed(4)),
      hyponatremiaSafeCorrection,
      prevTLSLogged,
      prevHypoCaLogged,
      prevHypoMgLogged,
      prevHypoNaLogged,
      events,
    };
  }
}
