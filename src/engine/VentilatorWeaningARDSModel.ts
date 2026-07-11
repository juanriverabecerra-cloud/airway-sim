/**
 * Ventilator Weaning + ARDS Lung-Protective Ventilation Model
 *
 * Two critical ventilator management scenarios:
 *
 * =========================================================================
 * A. LUNG-PROTECTIVE VENTILATION STRATEGY (ARDS/ALI)
 * =========================================================================
 * ARDS DEFINITION (Berlin Definition 2012):
 * - Onset within 1 week of known insult
 * - Bilateral opacities on imaging (NOT fully explained by effusions/atelectasis/masses)
 * - Respiratory failure NOT fully explained by cardiac failure/fluid overload
 * - PaO2/FiO2 ratio:
 *   MILD: 201-300 (with PEEP ≥ 5 cmH2O)
 *   MODERATE: 101-200 (with PEEP ≥ 5 cmH2O)
 *   SEVERE: ≤ 100 (with PEEP ≥ 5 cmH2O)
 *
 * LUNG-PROTECTIVE VENTILATION (ARDSNet protocol):
 * 1. TIDAL VOLUME: 6 mL/kg IBW (range: 4-8 mL/kg)
 *    Rationale: Standard TV (10-12 mL/kg) causes overdistension of non-diseased lung
 *    units (volutrauma) → inflammatory cascade → multi-organ failure.
 *    ARDSNet 2000: TV 6 mL/kg vs 12 mL/kg → 22% reduction in mortality.
 *    NEVER target SpO2 at expense of plateau pressure.
 *
 * 2. PLATEAU PRESSURE: ≤ 30 cmH2O (Pplat = Ppeak during no-flow inspiration)
 *    Pplat > 30 = barotrauma risk (pneumothorax, VILI)
 *    Pplat = PEEP + (VT / Crs) where Crs = respiratory system compliance
 *
 * 3. DRIVING PRESSURE: ≤ 15 cmH2O (Pplat - PEEP)
 *    Amato 2015: driving pressure is the SINGLE BEST predictor of ARDS mortality
 *    (better than either TV or Pplat alone).
 *
 * 4. PEEP STRATEGY:
 *    Higher PEEP: opens collapsed alveoli, reduces atelectasis, improves oxygenation
 *    but worsens hemodynamics (↓venous return) and can worsen overdistension.
 *    ARDSNet PEEP/FiO2 tables: match PEEP to FiO2 (higher FiO2 need = higher PEEP)
 *    FiO2 0.4 → PEEP 5-8; FiO2 0.6 → PEEP 8-10; FiO2 1.0 → PEEP 14-24
 *
 * 5. PERMISSIVE HYPERCAPNIA:
 *    Accept PaCO2 up to 60-80 mmHg (pH ≥ 7.20) to avoid high TV.
 *    pH < 7.15 → override (increase TV or RR).
 *
 * 6. RESCUE THERAPIES (for P/F < 150 despite LPV):
 *    - PRONE POSITIONING: 16h/day → 28% mortality reduction (PROSEVA trial 2013)
 *    - High-PEEP + recruitment maneuvers
 *    - Inhaled NO (already modeled)
 *    - Neuromuscular blockade (24-48h) → more synchronous breathing, less dyssynchrony
 *    - ECMO (refractory)
 *
 * =========================================================================
 * B. VENTILATOR WEANING / EXTUBATION READINESS
 * =========================================================================
 * Liberation from mechanical ventilation is the primary goal once the acute illness
 * is managed. Prolonged ventilation → VAP (ventilator-associated pneumonia), weakness,
 * diaphragm atrophy ("ventilator-induced diaphragmatic dysfunction"), psychological harm.
 *
 * DAILY AWAKENING AND BREATHING TRIAL (ABCDE BUNDLE):
 *   A — Assess, prevent, manage pain
 *   B — BOTH Spontaneous Awakening Trial (SAT) AND Spontaneous Breathing Trial (SBT)
 *   C — Choice of sedation (minimize, prefer propofol/dexmedetomidine over benzo)
 *   D — Delirium monitor
 *   E — Early mobility
 *
 * SPONTANEOUS BREATHING TRIAL (SBT) CRITERIA:
 * Pre-trial readiness: FiO2 ≤ 0.40 (or PEEP ≤ 8), adequate cough, low secretions,
 * hemodynamically stable, no sedation requirement, resolving underlying cause.
 *
 * SBT TECHNIQUE: CPAP or T-piece for 30-120 min.
 * PASS CRITERIA (Esteban 2002):
 *   - RR ≤ 35 bpm
 *   - SpO2 ≥ 90% (or PaO2 ≥ 60 on FiO2 ≤ 0.40)
 *   - HR ≤ 140 bpm or < 20% change
 *   - MAP 20% change from baseline
 *   - No agitation, diaphoresis, or respiratory distress
 *   - RSBI (Rapid Shallow Breathing Index) = RR/TV(L) ≤ 105 = reliable predictor
 *
 * EXTUBATION CHECKLIST BEYOND SBT:
 *   - Adequate cough (peak cough flow > 60 L/min)
 *   - Low secretion burden
 *   - Adequate mental status (follows commands, opens eyes to name)
 *   - NMB fully reversed (TOF ratio ≥ 0.9) — already in ClinicalScoringEngine
 *   - No planned surgery in next 24h
 *   - Cuff leak test (if > 4h prone or airway edema risk)
 *
 * Sources: ARDSNet, NEJM 2000; Amato MB, NEJM 2015 (driving pressure);
 * Esteban A, NEJM 2002 (SBT); Guérin C (PROSEVA), NEJM 2013;
 * Girard TD (ABCDE), Lancet 2008; Miller's 9th Ed Ch 96 (Mechanical Ventilation).
 */

export interface VentWeanARDSInputs {
  // Ventilator settings
  currentTV_mL?: number;
  currentRR?: number;
  currentFiO2?: number;
  currentPEEP?: number;
  currentPPlateau?: number;       // measured plateau pressure
  currentPIP?: number;

  // Patient measurements
  ibwKg?: number;
  currentPaO2?: number;           // mmHg
  currentPaCO2?: number;
  currentPH?: number;
  currentSpO2?: number;
  currentHR?: number;
  currentMAP?: number;
  currentRSBI?: number;           // RR / TV(L) — Rapid Shallow Breathing Index

  // ARDS
  isARDS?: boolean;
  ardsP_FRatio?: number;          // PaO2/FiO2 ratio

  // Weaning
  isSBTInProgress?: boolean;
  sbtDurationMin?: number;
  adequateCough?: boolean;
  lowSecretions?: boolean;
  consciousAndFollowsCommands?: boolean;
  tofRatio?: number;              // for NMB reversal check

  // Prone
  pronePositioning?: boolean;
  proneDurationHours?: number;

  // Event guards
  prevARDSLogged?: boolean;
  prevWeanReadyLogged?: boolean;
  prevSBTLogged?: boolean;
  prevDrivingPressureLogged?: boolean;
}

export interface VentWeanARDSOutput {
  // ARDS
  ards_severity: 'none' | 'mild' | 'moderate' | 'severe';
  p_f_ratio: number;

  // LPV adherence
  tvMlPerKgIBW: number;
  isLPV_TVAdherent: boolean;      // TV 4-8 mL/kg IBW
  platPressureSafe: boolean;      // Pplat ≤ 30
  drivingPressure: number;        // Pplat - PEEP
  drivingPressureSafe: boolean;   // ≤ 15 cmH2O
  peepRecommended: number;        // based on FiO2 table

  // Weaning readiness
  preSBTCriteriaMetCount: number; // out of 5
  sbtPassCriteriaMetCount: number; // out of 5
  rsbi: number;                   // RR / TV(L)
  isReadyToWean: boolean;
  isReadyForExtubation: boolean;

  // ARDS rescue
  proneBeneficial: boolean;       // P/F < 150

  prevARDSLogged: boolean;
  prevWeanReadyLogged: boolean;
  prevSBTLogged: boolean;
  prevDrivingPressureLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// PEEP recommendation based on FiO2 (ARDSNet PEEP-FiO2 table, lower-PEEP strategy)
function recommendedPEEP(fio2: number): number {
  if (fio2 <= 0.40) return 5;
  if (fio2 <= 0.50) return 8;
  if (fio2 <= 0.60) return 10;
  if (fio2 <= 0.70) return 10;
  if (fio2 <= 0.80) return 12;
  if (fio2 <= 0.90) return 14;
  return 18; // FiO2 1.0
}

export class VentilatorWeaningARDSModel {
  static tick(inputs: VentWeanARDSInputs = {}): VentWeanARDSOutput {
    const events: string[] = [];
    let prevARDSLogged = !!inputs.prevARDSLogged;
    let prevWeanReadyLogged = !!inputs.prevWeanReadyLogged;
    let prevSBTLogged = !!inputs.prevSBTLogged;
    let prevDrivingPressureLogged = !!inputs.prevDrivingPressureLogged;

    const tv = clamp(safeNumber(inputs.currentTV_mL, 500), 100, 2000);
    const rr = clamp(safeNumber(inputs.currentRR, 14), 4, 60);
    const fio2 = clamp(safeNumber(inputs.currentFiO2, 0.40), 0.21, 1.0);
    const peep = clamp(safeNumber(inputs.currentPEEP, 5), 0, 25);
    const pplat = clamp(safeNumber(inputs.currentPPlateau, 20), 5, 60);
    const ibw = clamp(safeNumber(inputs.ibwKg, 70), 20, 150);
    const pao2 = clamp(safeNumber(inputs.currentPaO2, 80), 20, 500);
    const paco2 = clamp(safeNumber(inputs.currentPaCO2, 40), 15, 120);
    const pH = clamp(safeNumber(inputs.currentPH, 7.4), 6.8, 7.6);
    const spo2 = clamp(safeNumber(inputs.currentSpO2, 98), 50, 100);
    const hr = clamp(safeNumber(inputs.currentHR, 80), 20, 200);
    const map = clamp(safeNumber(inputs.currentMAP, 80), 30, 180);
    const tofRatio = clamp(safeNumber(inputs.tofRatio, 1.0), 0, 1.0);

    // ===========================
    // ARDS SEVERITY
    // ===========================
    const ardsP_F = pao2 / Math.max(0.01, fio2);
    let ards_severity: 'none' | 'mild' | 'moderate' | 'severe';
    if (!inputs.isARDS || ardsP_F > 300) ards_severity = 'none';
    else if (ardsP_F > 200) ards_severity = 'mild';
    else if (ardsP_F > 100) ards_severity = 'moderate';
    else ards_severity = 'severe';

    const p_f_ratio = parseFloat(ardsP_F.toFixed(1));

    // ===========================
    // LPV ADHERENCE
    // ===========================
    const tvMlPerKgIBW = parseFloat((tv / ibw).toFixed(2));
    const isLPV_TVAdherent = tvMlPerKgIBW >= 4 && tvMlPerKgIBW <= 8;
    const platPressureSafe = pplat <= 30;
    const drivingPressure = pplat - peep;
    const drivingPressureSafe = drivingPressure <= 15;
    const peepRecommended = recommendedPEEP(fio2);

    if (inputs.isARDS && !prevARDSLogged) {
      const severity = ards_severity.toUpperCase();
      events.push(
        `🫁 ARDS — ${severity} (P/F ratio: ${p_f_ratio.toFixed(0)}): LUNG-PROTECTIVE VENTILATION REQUIRED. ARDSNet Protocol: (1) TV 6 mL/kg IBW = ${(ibw * 6).toFixed(0)} mL (NOT ${tv.toFixed(0)} mL current); (2) Plateau pressure ≤ 30 cmH2O; (3) DRIVING PRESSURE (Pplat - PEEP) ≤ 15 cmH2O — single strongest mortality predictor (Amato 2015); (4) PEEP ${peepRecommended} cmH2O for current FiO2 ${(fio2 * 100).toFixed(0)}%; (5) Permissive hypercapnia OK (PaCO2 up to 60-80, pH ≥ 7.20); (6) Target SpO2 88-95% (not 98-100%). ${ards_severity === 'severe' ? '🔻 SEVERE ARDS: Consider PRONE 16h/day (PROSEVA: 28% mortality reduction if P/F < 150), neuromuscular blockade 24-48h, inhaled NO.' : ''}`,
      );
      prevARDSLogged = true;
    }

    if (!drivingPressureSafe && inputs.isARDS && !prevDrivingPressureLogged) {
      events.push(
        `⚠️ HIGH DRIVING PRESSURE (${drivingPressure.toFixed(0)} cmH2O > 15): Single strongest ARDS mortality predictor (Amato 2015). Reduce TV or increase PEEP. Current: TV ${tv.toFixed(0)} mL (${tvMlPerKgIBW.toFixed(1)} mL/kg), PEEP ${peep} cmH2O. Consider: ↓ TV to 4-6 mL/kg IBW, ↑ PEEP to open collapsed units (↑ Crs → ↓ driving pressure), recruitment maneuver.`,
      );
      prevDrivingPressureLogged = true;
    }

    // ===========================
    // WEANING READINESS
    // ===========================
    // Pre-SBT criteria
    let preSBTCount = 0;
    if (fio2 <= 0.40 || peep <= 8) preSBTCount++; // oxygenation
    if (pH >= 7.35 && paco2 <= 50) preSBTCount++; // ventilation
    if (hr < 130 && map >= 65) preSBTCount++;       // hemodynamics
    if (!!inputs.consciousAndFollowsCommands) preSBTCount++;
    if (!!inputs.adequateCough) preSBTCount++;

    const isReadyToWean = preSBTCount >= 4;

    // SBT criteria
    const inputRSBI = safeNumber(inputs.currentRSBI, rr / (tv / 1000));
    const rsbi = clamp(inputRSBI, 0, 500);

    let sbtPassCount = 0;
    if (rr <= 35) sbtPassCount++;
    if (spo2 >= 90) sbtPassCount++;
    if (hr <= 140) sbtPassCount++;
    if (rsbi <= 105) sbtPassCount++;
    if (map >= 65) sbtPassCount++;

    const sbtDurationMin = clamp(safeNumber(inputs.sbtDurationMin, 0), 0, 120);
    const sbtPassing = sbtPassCount >= 4 && sbtDurationMin >= 30;

    // Extubation criteria (beyond SBT)
    const isReadyForExtubation = sbtPassing
      && !!inputs.adequateCough
      && !!inputs.lowSecretions
      && !!inputs.consciousAndFollowsCommands
      && tofRatio >= 0.9;

    if (isReadyToWean && !prevWeanReadyLogged) {
      events.push(
        `✅ WEANING READINESS: Pre-SBT criteria met (${preSBTCount}/5). Recommend SPONTANEOUS BREATHING TRIAL: CPAP 5-8 cmH2O or T-piece for 30-120 min. Monitor: RR ≤ 35, SpO2 ≥ 90%, HR ≤ 140, MAP ≥ 65, no distress. RSBI (RR/TV_L): currently ${rsbi.toFixed(0)} (target ≤ 105 to pass). SAT (Spontaneous Awakening Trial) simultaneously: hold sedation, wake patient, assess compliance.`,
      );
      prevWeanReadyLogged = true;
    }

    if (isReadyForExtubation && !prevSBTLogged) {
      events.push(
        `✅ EXTUBATION READY: SBT passed (${sbtDurationMin.toFixed(0)} min), adequate cough, minimal secretions, conscious and following commands, TOF ${(tofRatio * 100).toFixed(0)}% (> 90%). EXTUBATION CHECKLIST: (1) Cuff leak test if > 4h prone/facial edema; (2) Post-extubation plan (CPAP/BiPAP if high-risk?); (3) Upper airway edema management (dexamethasone prophylaxis if prolonged intubation); (4) Heated humidified high-flow O2 post-extubation (reduces reintubation rate).`,
      );
      prevSBTLogged = true;
    }

    // Prone recommendation
    const proneBeneficial = ards_severity === 'severe' || (ards_severity === 'moderate' && ardsP_F < 150);

    return {
      ards_severity,
      p_f_ratio,
      tvMlPerKgIBW,
      isLPV_TVAdherent,
      platPressureSafe,
      drivingPressure: parseFloat(drivingPressure.toFixed(1)),
      drivingPressureSafe,
      peepRecommended,
      preSBTCriteriaMetCount: preSBTCount,
      sbtPassCriteriaMetCount: sbtPassCount,
      rsbi: parseFloat(rsbi.toFixed(1)),
      isReadyToWean,
      isReadyForExtubation,
      proneBeneficial,
      prevARDSLogged,
      prevWeanReadyLogged,
      prevSBTLogged,
      prevDrivingPressureLogged,
      events,
    };
  }
}
