/**
 * Pulmonary Hypertension Model
 *
 * PH is defined as mean PAP (mPAP) > 25 mmHg at rest. It is an independent risk factor
 * for perioperative mortality (10-26% in major surgery, even with modern management).
 * The fundamental anesthetic challenge: anything that increases PVR (hypoxia, hypercarbia,
 * acidosis, high PEEP, sympathetic activation, pain) can precipitate acute RV failure.
 *
 * === WHO CLASSIFICATION ===
 * Group 1 — Pulmonary Arterial Hypertension (PAH): idiopathic, heritable, connective tissue
 *   disease (scleroderma highest risk), HIV, portopulmonary, congenital heart shunts.
 *   Pathology: obliterative remodeling of small pulmonary arterioles → fixed high PVR.
 * Group 2 — Left Heart Disease: LV dysfunction, mitral/aortic valve disease → elevated PCWP
 *   → reactive passive pulmonary HTN. "Post-capillary PH."
 * Group 3 — Lung Disease/Hypoxia: COPD, IPF, sleep apnea → chronic HPV → vascular remodeling.
 * Group 4 — CTEPH: Chronic thromboembolic PH after unresolved PE → fixed obstruction.
 * Group 5 — Multifactorial: sarcoidosis, metabolic disorders.
 *
 * === KEY HEMODYNAMIC EQUATION ===
 * mPAP = CO × PVR + PCWP      (where PVR in Wood units = mPAP-PCWP / CO)
 * Normal PVR: 1.0-2.0 Wood units (WU) = 80-160 dyn·s/cm⁵
 * PH threshold: mPAP > 25 mmHg at rest
 * Severity: Mild 25-35, Moderate 36-45, Severe >45 mmHg
 *
 * === INTRAOPERATIVE TRIGGERS THAT WORSEN PH ===
 * 1. Hypoxia: PaO2 < 60 → systemic HPV → ↑PVR 20-80%
 * 2. Hypercarbia: PaCO2 > 50 → ↑PVR 15-25% (respiratory acidosis)
 * 3. Metabolic acidosis: pH 7.3→7.0 → ↑PVR up to 40%
 * 4. High PEEP: > 10 cmH2O → lung overdistension → compresses pulmonary microvasculature
 * 5. Sympathetic activation: pain, light anesthesia, endotracheal intubation
 * 6. Nitrous oxide: known to raise PVR (contraindicated in PH patients)
 * 7. Hyperthermia → increases metabolic demand, worsens RV-PA uncoupling
 *
 * === ACUTE RV FAILURE / COR PULMONALE ===
 * When PVR exceeds RV contractile reserve → RV dilation → tricuspid regurgitation →
 * interventricular septal shift → LV diastolic dysfunction → biventricular failure.
 * Early sign: CVP rise without PCWP rise (RA overloaded, LA not yet).
 * Terminal: "death spiral" — low CO → hypotension → RV ischemia → worsening RV failure.
 *
 * === TREATMENT HIERARCHY ===
 * 1. Fix the triggers first (O2, normalize CO2/pH, reduce PEEP if possible)
 * 2. Inhaled NO (iNO): most selective pulmonary vasodilator. 5-40 ppm; acts within minutes.
 *    Reduces PVR 20-40%. MUST be weaned slowly — rebound PH on abrupt withdrawal.
 * 3. Inhaled prostacyclin (epoprostenol/iloprost): alternative to iNO (same selectivity).
 * 4. Milrinone: PDE3 inhibitor → inotropy + pulmonary vasodilation. Less selective than iNO
 *    (also lowers systemic SVR → may need vasopressor support). IV or inhaled.
 * 5. Sildenafil/tadalafil: PDE5 inhibitor → potentiates cGMP from iNO. Synergistic.
 *    WARNING: synergism with iNO means PDE5 inhibitors must be STOPPED before iNO weaning
 *    (prolongs effect → severe rebound PH).
 * 6. Vasopressors (norepinephrine/vasopressin) for systemic hypotension → maintain CPP to RV.
 *    High RV filling pressure + low systemic BP = RV ischemia.
 * 7. ECMO/RVAD: rescue therapy for refractory RV failure.
 *
 * Sources: Miller's 9th Ed Ch 50 (Pulmonary Hypertension); Pilkington SA, Br J Anaesth 2012;
 * Lai HC, Anesthesiology 2007; Price LC, Eur Respir J 2010; Humbert M, NEJM 2022.
 */

export interface PHInputs {
  // Patient baseline
  phPresent?: boolean;              // pre-existing pulmonary hypertension
  phWhoGroup?: 1 | 2 | 3 | 4 | 5;
  phSeverity?: 'mild' | 'moderate' | 'severe'; // mild 25-35, moderate 36-45, severe >45 mmHg
  baselineMpap?: number;            // patient's baseline mPAP (mmHg)
  pcwp?: number;                    // pulmonary capillary wedge pressure (LVEDP proxy, mmHg)

  // Current hemodynamics
  currentCO?: number;               // L/min
  currentMAP?: number;              // mmHg (for RV perfusion pressure check)
  currentCVP?: number;              // mmHg (rising CVP = RV overload)
  currentPEEP?: number;             // cmH2O
  currentPaCO2?: number;            // mmHg
  currentPaO2?: number;             // mmHg
  currentPH?: number;               // arterial pH

  // Triggers
  sympatheticActivation?: number;   // 0-1 (pain, light anesthesia, intubation)
  n2oActive?: boolean;              // N2O increases PVR

  // iNO / pulmonary vasodilators
  inoActive?: boolean;              // inhaled nitric oxide delivery
  inoPpm?: number;                  // iNO dose in parts per million (1-80 ppm)
  inhaledEpoprostenolActive?: boolean;
  inhaledEpoprostenolDose?: number; // ng/kg/min (typical 25-50)
  milrinoneCe?: number;             // plasma concentration (mg/L); has pulmonary vasodilator effect
  sildenafilCe?: number;            // PDE5 inhibitor (potentiates iNO); also systemic vasodilator

  // Event guards
  prevPHCrisisLogged?: boolean;
  prevRVFailureLogged?: boolean;
  prevInoStartLogged?: boolean;
  prevReboundLogged?: boolean;
  inoJustStopped?: boolean;         // recent iNO withdrawal → rebound risk
}

export interface PHOutput {
  currentMpap: number;              // computed mPAP this tick (mmHg)
  currentPVR: number;               // computed PVR (Wood units)
  baselinePVR: number;              // patient's fixed PVR from PH severity
  dynamicPVRMultiplier: number;     // trigger-driven PVR increase (1.0 = no change)
  treatmentPVRReduction: number;    // 0-0.5: fraction PVR reduced by active treatments
  rvAfterloadIndex: number;         // 0-1: 0=normal, 1=critical RV failure
  rvFailureActive: boolean;
  inoEfficacy: number;              // 0-0.40: fraction PVR reduction from iNO
  inoPpmDelivered: number;          // actual ppm delivered
  mPAPContribution: number;         // delta above baseline that feeds vitals.mPAP
  rvInotropyPenalty: number;        // 0-0.8: multiplied INTO drugInotropyMod (RV compensation)
  prevPHCrisisLogged: boolean;
  prevRVFailureLogged: boolean;
  prevInoStartLogged: boolean;
  prevReboundLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Baseline PVR by severity (Wood units)
const BASE_PVR: Record<string, number> = {
  none: 1.5,
  mild: 3.5,
  moderate: 6.5,
  severe: 11.0,
};

// Baseline mPAP by severity (mmHg) — before any dynamic triggers
const BASE_MPAP: Record<string, number> = {
  none: 16,
  mild: 30,
  moderate: 40,
  severe: 55,
};

export class PulmonaryHypertensionModel {
  static tick(inputs: PHInputs = {}): PHOutput {
    const events: string[] = [];
    let prevPHCrisisLogged = !!inputs.prevPHCrisisLogged;
    let prevRVFailureLogged = !!inputs.prevRVFailureLogged;
    let prevInoStartLogged = !!inputs.prevInoStartLogged;
    let prevReboundLogged = !!inputs.prevReboundLogged;

    const phPresent = !!inputs.phPresent;
    const severity = phPresent ? (inputs.phSeverity || 'mild') : 'none';
    const baselinePVR = BASE_PVR[severity] ?? 1.5;
    const baselineMpap = safeNumber(inputs.baselineMpap, BASE_MPAP[severity] ?? 16);
    const pcwp = clamp(safeNumber(inputs.pcwp, 8), 0, 30);
    const co = clamp(safeNumber(inputs.currentCO, 5.0), 0.5, 15);
    const map = clamp(safeNumber(inputs.currentMAP, 85), 30, 200);
    const peep = clamp(safeNumber(inputs.currentPEEP, 5), 0, 30);
    const paco2 = clamp(safeNumber(inputs.currentPaCO2, 40), 15, 100);
    const pao2 = clamp(safeNumber(inputs.currentPaO2, 95), 20, 200);
    const pH = clamp(safeNumber(inputs.currentPH, 7.4), 6.8, 7.6);
    const symp = clamp(safeNumber(inputs.sympatheticActivation, 0), 0, 1);
    const n2o = !!inputs.n2oActive;

    // ===========================
    // DYNAMIC PVR TRIGGERS
    // ===========================
    // Each trigger multiplicatively worsens PVR above baseline.
    let dynamicMult = 1.0;

    // Hypoxia: systemic HPV (different from OLV HPV — this is the systemic response)
    if (pao2 < 60) {
      const hypoxiaSeverity = (60 - pao2) / 40; // 0 at pO2=60, 1 at pO2=20
      dynamicMult *= 1.0 + 0.80 * hypoxiaSeverity;
    }

    // Hypercarbia (respiratory acidosis component)
    if (paco2 > 40) {
      const hypercarbiaEffect = Math.min(0.30, (paco2 - 40) / 40); // up to 30% increase
      dynamicMult *= 1.0 + hypercarbiaEffect;
    }

    // Metabolic/combined acidosis
    if (pH < 7.4) {
      const acidosisEffect = Math.min(0.40, (7.4 - pH) / 0.4); // up to 40% at pH 7.0
      dynamicMult *= 1.0 + acidosisEffect;
    }

    // PEEP-driven lung overdistension: >10 cmH2O compresses pulmonary microvasculature
    if (peep > 10) {
      dynamicMult *= 1.0 + Math.min(0.25, (peep - 10) * 0.025);
    }

    // Sympathetic activation (pain, light anesthesia, intubation)
    if (symp > 0.2) {
      dynamicMult *= 1.0 + 0.25 * symp;
    }

    // N2O: well-documented pulmonary vasoconstrictor (contraindicated in PH)
    if (n2o) {
      dynamicMult *= 1.20;
    }

    // ===========================
    // TREATMENT EFFECTS (PVR reductions)
    // ===========================
    // iNO: selective pulmonary vasodilator via sGC/cGMP pathway
    const inoPpm = clamp(safeNumber(inputs.inoPpm, 0), 0, 80);
    const inoActive = !!inputs.inoActive && inoPpm > 0;
    // Hill equation: C50 = 10 ppm, gamma = 1.5
    const inoEfficacy = inoActive ? clamp(Math.pow(inoPpm, 1.5) / (Math.pow(inoPpm, 1.5) + Math.pow(10, 1.5)) * 0.40, 0, 0.40) : 0;

    // Inhaled epoprostenol (prostacyclin): similar efficacy to iNO via cAMP pathway
    const epoDose = clamp(safeNumber(inputs.inhaledEpoprostenolDose, 0), 0, 100);
    const epoActive = !!inputs.inhaledEpoprostenolActive && epoDose > 0;
    const epoEfficacy = epoActive ? clamp(epoDose / (epoDose + 25) * 0.35, 0, 0.35) : 0;

    // Milrinone: weaker, non-selective pulmonary vasodilator (also lowers SVR)
    const milrinoneCe = clamp(safeNumber(inputs.milrinoneCe, 0), 0, 5);
    const milrinoneEfficacy = milrinoneCe > 0 ? clamp(milrinoneCe / (milrinoneCe + 0.3) * 0.20, 0, 0.20) : 0;

    // Sildenafil (PDE5 inhibitor): potentiates iNO effects; on its own, modest effect
    const sildenafilCe = clamp(safeNumber(inputs.sildenafilCe, 0), 0, 5);
    const sildenafilBoost = sildenafilCe > 0 && inoActive ? clamp(sildenafilCe / (sildenafilCe + 0.5) * 0.15, 0, 0.15) : 0;
    const sildenafilBasal = sildenafilCe > 0 && !inoActive ? clamp(sildenafilCe / (sildenafilCe + 0.5) * 0.10, 0, 0.10) : 0;

    // Total treatment PVR reduction (cap at 60% total reduction)
    const treatmentPVRReduction = clamp(inoEfficacy + epoEfficacy + milrinoneEfficacy + sildenafilBoost + sildenafilBasal, 0, 0.60);

    // ===========================
    // NET PVR AND mPAP
    // ===========================
    const currentPVR = baselinePVR * dynamicMult * (1 - treatmentPVRReduction);
    // mPAP = CO × PVR + PCWP (simplified Fick-Ohm's law for pulmonary circulation)
    const currentMpap = clamp(co * currentPVR + pcwp, 10, 120);

    // ===========================
    // RV AFTERLOAD STRAIN
    // ===========================
    // RV coupling fails when mPAP approaches MAP (RV perfusion pressure = MAP - mPAP)
    const rvPerfusionPressure = map - currentMpap; // positive = RV perfused; negative = ischemia
    // RV afterload index: 0=normal, 1=critical
    const rvAfterloadIndex = clamp((currentMpap - 25) / 40, 0, 1); // 0 at mPAP≤25, 1 at mPAP≥65
    const rvFailureActive = rvAfterloadIndex > 0.5 || rvPerfusionPressure < 20;

    // RV inotropy penalty: as RV fails, CO drops (separate from LV)
    // At mPAP = 50: ~30% RV output reduction; at 70+: ~70%
    const rvInotropyPenalty = clamp(rvAfterloadIndex * 0.75, 0, 0.80);

    // mPAP contribution above normal (feeds vitals.mPAP in usePhysiology.js)
    const mPAPContribution = currentMpap - 16; // delta from normal baseline

    // ===========================
    // iNO ONSET EVENT
    // ===========================
    if (inoActive && !prevInoStartLogged) {
      events.push(
        `✅ INHALED NITRIC OXIDE (iNO) INITIATED at ${inoPpm} ppm. Selective pulmonary vasodilator — O2 inactivates NO before it reaches systemic circulation. Expected PVR reduction: ~${Math.round(inoEfficacy * 100)}%. Titrate to clinical response (PVR, SpO2, RV function on echo). MUST WEAN GRADUALLY — abrupt withdrawal causes severe rebound PH. Monitor for methemoglobin if >40 ppm or prolonged use. If sildenafil/tadalafil co-administered: STOP PDE5 inhibitor before weaning iNO (synergism prolongs rebound risk).`,
      );
      prevInoStartLogged = true;
    }
    if (!inoActive) prevInoStartLogged = false;

    // ===========================
    // PH CRISIS EVENT (trigger-driven acute decompensation)
    // ===========================
    if (currentMpap > 50 && !prevPHCrisisLogged) {
      events.push(
        `🚨 PULMONARY HYPERTENSIVE CRISIS: mPAP ${currentMpap.toFixed(0)} mmHg. RV perfusion pressure ${rvPerfusionPressure.toFixed(0)} mmHg (MAP - mPAP). Risk of acute RV failure. IMMEDIATE ACTIONS: (1) Fix triggers — FiO2 1.0, normalize CO2 (avoid hyperventilation paradox), correct acidosis; (2) iNO if not already started (5-40 ppm); (3) Consider inhaled epoprostenol as alternative/adjunct; (4) Vasopressor (norepinephrine/vasopressin) to maintain MAP > mPAP (prevent RV ischemia); (5) Reduce PEEP if elevated; (6) Avoid fluid loading (worsens RV dilation); (7) Prepare for ECMO/RVAD if refractory.`,
      );
      prevPHCrisisLogged = true;
    }
    if (currentMpap < 40) prevPHCrisisLogged = false;

    // ===========================
    // RV FAILURE EVENT
    // ===========================
    if (rvFailureActive && !prevRVFailureLogged) {
      events.push(
        `⚠️ ACUTE RIGHT VENTRICULAR FAILURE: RV cannot maintain output against elevated pulmonary afterload (mPAP ${currentMpap.toFixed(0)} mmHg, RV perfusion pressure ${rvPerfusionPressure.toFixed(0)} mmHg). Signs: CVP rising, CO falling, tricuspid regurgitation, septal shift (echocardiography). CO reduction from RV-LV interdependence. MANAGEMENT: (1) Optimize preload (NOT excess — fill RV to "Starling peak" only); (2) iNO 20-40 ppm; (3) Milrinone (inotropy + PVR reduction — but needs vasopressor to prevent systemic hypotension); (4) Vasopressin preferred over NE for systemic support in RV failure (less pulmonary vasoconstriction); (5) ECMO if cardiac arrest or severe hemodynamic collapse.`,
      );
      prevRVFailureLogged = true;
    }
    if (!rvFailureActive) prevRVFailureLogged = false;

    // ===========================
    // iNO REBOUND EVENT
    // ===========================
    if (inputs.inoJustStopped && !prevReboundLogged) {
      events.push(
        `🚨 iNO REBOUND PH RISK: Inhaled NO discontinued. Endogenous pulmonary vasodilation is suppressed after prolonged iNO (down-regulation of sGC). Expect REBOUND PULMONARY VASOCONSTRICTION within minutes. If not already weaned: RESTART iNO at lower dose (2-5 ppm) and wean over 30-60 min. If sildenafil/tadalafil was co-administered: anticipate prolonged rebound risk. Monitor SpO2, mPAP, and RV function closely for 1-2h after discontinuation.`,
      );
      prevReboundLogged = true;
    }

    return {
      currentMpap: parseFloat(currentMpap.toFixed(1)),
      currentPVR: parseFloat(currentPVR.toFixed(2)),
      baselinePVR,
      dynamicPVRMultiplier: parseFloat(dynamicMult.toFixed(3)),
      treatmentPVRReduction: parseFloat(treatmentPVRReduction.toFixed(3)),
      rvAfterloadIndex: parseFloat(rvAfterloadIndex.toFixed(3)),
      rvFailureActive,
      inoEfficacy: parseFloat(inoEfficacy.toFixed(3)),
      inoPpmDelivered: inoActive ? inoPpm : 0,
      mPAPContribution: parseFloat(mPAPContribution.toFixed(1)),
      rvInotropyPenalty: parseFloat(rvInotropyPenalty.toFixed(3)),
      prevPHCrisisLogged,
      prevRVFailureLogged,
      prevInoStartLogged,
      prevReboundLogged,
      events,
    };
  }
}
