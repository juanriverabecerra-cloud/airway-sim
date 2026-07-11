/**
 * Transfusion-Associated Circulatory Overload (TACO) Model
 *
 * TACO is the most COMMON serious transfusion reaction — far more prevalent than
 * TRALI (1:100 transfusions vs 1:5,000 for TRALI). Under-recognized because:
 * (1) Symptoms overlap with TRALI and other causes of post-transfusion dyspnea
 * (2) No single biomarker is diagnostic
 * (3) Occurs insidiously with multiple units given over hours
 *
 * === DEFINITION (ISBT 2018 Consensus) ===
 * New or worsening respiratory distress within 12h of transfusion PLUS ≥ 3 of:
 *   - New/worsened hypoxia (SpO2 ↓ or PaO2/FiO2 ↓)
 *   - New/worsened pulmonary edema on CXR (bilateral infiltrates)
 *   - Elevated BNP or NT-proBNP (> 1.5× pre-transfusion)
 *   - Evidence of left heart failure (CVP > 12 mmHg, S3 gallop, JVD)
 *   - Hypertension (new or worsening during transfusion)
 *
 * === PATHOPHYSIOLOGY ===
 * Rapid intravascular volume expansion → elevated pulmonary capillary wedge pressure
 * (PCWP) → hydrostatic pulmonary edema (CARDIOGENIC, unlike TRALI's non-cardiogenic).
 * Left atrial and LV diastolic dysfunction amplify the pressure rise.
 * Unlike TRALI: PCWP is ELEVATED (not normal/low); responds to diuresis; BNP rises.
 *
 * === RISK FACTORS (exponential, not additive) ===
 * - Age > 70 (diastolic dysfunction very common)
 * - Pre-existing CHF (EF < 40%, diastolic dysfunction)
 * - Renal insufficiency (can't excrete excess volume)
 * - Small body size (relatively large volume effect)
 * - Pre-existing fluid overload (positive balance)
 * - Rapid transfusion rate (> 1 unit pRBC per hour)
 * - Large transfusion volume (> 4 units)
 * - Pre-existing pulmonary hypertension
 *
 * === DISTINGUISHING TACO FROM TRALI ===
 * | Feature          | TACO                    | TRALI                    |
 * |------------------|-------------------------|--------------------------|
 * | Mechanism        | Volume overload         | Immune-mediated ALI      |
 * | PCWP/CVP         | Elevated (> 12-15 mmHg) | Normal                   |
 * | BNP              | Elevated                | Normal or mildly elevated|
 * | Response to diuretics | Yes               | No (may worsen)          |
 * | Blood pressure   | Often hypertensive      | Often hypotensive        |
 * | Fever            | Absent                  | Common                   |
 * | Time after Tx    | During or up to 12h     | Within 6h                |
 * | Incidence        | ~1:100 units            | ~1:5,000 units           |
 *
 * === TREATMENT ===
 * 1. SLOW or STOP transfusion (if not complete)
 * 2. Furosemide 20-40 mg IV (loop diuretic) → reduces PCWP within 20 min
 * 3. Sit patient upright (decreases venous return)
 * 4. Oxygen (NRB mask → CPAP/BiPAP if moderate)
 * 5. Intubation for severe respiratory failure
 * 6. Ongoing transfusion if needed: slower rate (1-2h per unit), furosemide between units
 * 7. Monitor fluid balance — UO 0.5-1 mL/kg/hr target post-diuresis
 *
 * Note: TACO and TRALI can coexist (TACO can trigger the "second hit" that precipitates TRALI).
 *
 * Sources: Roubinian NH, Transfusion 2018; Semple JW, Blood 2019;
 * ISBT TACO Definition 2018; Miller's 9th Ed Ch 55 (Transfusion Medicine).
 */

export interface TACOInputs {
  // Transfusion volume (cumulative, this case)
  prbcVolumeReceivedMl?: number;   // most common cause (high osmotic load + viscosity)
  ffpVolumeReceivedMl?: number;
  plateletsVolumeReceivedMl?: number;
  cryoVolumeReceivedMl?: number;
  transfusionRateMlPerHr?: number; // current rate (fast rate = high risk)

  // Patient risk factors
  hasChf?: boolean;               // pre-existing CHF/diastolic dysfunction
  ef?: number;                    // ejection fraction (< 40 = high risk)
  hasRenalInsufficiency?: boolean; // GFR < 45 = high risk
  ageYears?: number;              // > 70 = high risk
  weightKg?: number;              // small patients more vulnerable per-unit
  isFluidOverloaded?: boolean;    // pre-existing positive balance

  // Current hemodynamics (for TACO manifestation)
  currentCVP?: number;            // mmHg (TACO → elevated)
  currentMAP?: number;
  currentSpo2?: number;
  currentLVEDP?: number;          // proxy for PCWP

  // Treatment
  furosemideCe?: number;          // loop diuretic for TACO treatment

  // Event guards
  prevTACOLogged?: boolean;
  prevTACOSevereLogged?: boolean;
}

export interface TACOOutput {
  tacoRiskScore: number;           // 0-1 (pre-transfusion risk)
  tacoActive: boolean;             // symptomatic TACO
  tacoSeverity: number;            // 0-1 (0=mild, 1=severe ARDS-like)
  pcwpContribution: number;        // mmHg added to effective PCWP from transfusion volume
  compliancePenalty: number;       // fraction compliance reduction (hydrostatic edema)
  shuntContribution: number;       // additive shunt (flooded alveoli)
  resistancePenalty: number;       // cmH2O/L/s (airway secretions)
  svrContribution: number;         // fractional SVR increase (HTN in TACO)
  furosemideEfficacy: number;      // 0-1 how much diuretic is reversing TACO
  bnpElevation: number;            // ×baseline (for monitoring display)
  prevTACOLogged: boolean;
  prevTACOSevereLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class TACOModel {
  static tick(inputs: TACOInputs = {}): TACOOutput {
    const events: string[] = [];
    let prevTACOLogged = !!inputs.prevTACOLogged;
    let prevTACOSevereLogged = !!inputs.prevTACOSevereLogged;

    const prbcMl = clamp(safeNumber(inputs.prbcVolumeReceivedMl, 0), 0, 10000);
    const ffpMl = clamp(safeNumber(inputs.ffpVolumeReceivedMl, 0), 0, 10000);
    const platMl = clamp(safeNumber(inputs.plateletsVolumeReceivedMl, 0), 0, 3000);
    const cryoMl = clamp(safeNumber(inputs.cryoVolumeReceivedMl, 0), 0, 2000);
    const totalTxMl = prbcMl + ffpMl + platMl + cryoMl;
    const rateMlHr = clamp(safeNumber(inputs.transfusionRateMlPerHr, 150), 0, 1000);

    const hasChf = !!inputs.hasChf;
    const ef = clamp(safeNumber(inputs.ef, 60), 5, 80);
    const hasRenalInsuff = !!inputs.hasRenalInsufficiency;
    const ageYears = clamp(safeNumber(inputs.ageYears, 50), 0, 100);
    const weightKg = clamp(safeNumber(inputs.weightKg, 70), 5, 300);
    const isFluidOverloaded = !!inputs.isFluidOverloaded;
    const currentCVP = clamp(safeNumber(inputs.currentCVP, 6), 0, 30);
    const currentLVEDP = clamp(safeNumber(inputs.currentLVEDP, 8), 0, 35);
    const furosemideCe = clamp(safeNumber(inputs.furosemideCe, 0), 0, 10);

    // ===========================
    // PRE-TRANSFUSION RISK SCORE
    // ===========================
    let riskScore = 0;
    // Volume risk (0-0.3)
    riskScore += clamp(totalTxMl / 3000, 0, 0.3); // full risk at 3L
    // Rate risk (fast rate worsens rapid pressure rise)
    riskScore += clamp((rateMlHr - 100) / 400, 0, 0.15);
    // Patient risk factors
    if (hasChf) riskScore += 0.20;
    if (ef < 40) riskScore += 0.15 * (1 - ef / 40);
    if (hasRenalInsuff) riskScore += 0.15;
    if (ageYears > 70) riskScore += 0.10;
    if (isFluidOverloaded) riskScore += 0.15;
    // Small body size: more volume effect per unit
    if (weightKg < 50) riskScore += 0.10;

    const tacoRiskScore = clamp(riskScore, 0, 1.0);

    // ===========================
    // TACO ACTIVE
    // ===========================
    const tacoActive = tacoRiskScore > 0.45 && totalTxMl > 500;
    const tacoSeverityRaw = tacoActive
      ? clamp((tacoRiskScore - 0.45) / 0.45, 0, 1.0)
      : 0;

    // ===========================
    // FUROSEMIDE TREATMENT
    // ===========================
    const furosemideEfficacy = furosemideCe > 0
      ? clamp(furosemideCe / (furosemideCe + 0.5) * 0.85, 0, 0.85) // up to 85% reversal
      : 0;
    const tacoSeverity = tacoSeverityRaw * (1 - furosemideEfficacy);

    // ===========================
    // HEMODYNAMIC + RESPIRATORY EFFECTS
    // ===========================
    // TACO increases PCWP → hydrostatic edema
    const pcwpContribution = tacoActive
      ? clamp(tacoSeverity * 18, 0, 20) // up to +20 mmHg above baseline PCWP
      : 0;

    // Compliance penalty: hydrostatic pulmonary edema (milder/slower onset than TRALI)
    const compliancePenalty = clamp(tacoSeverity * 0.35, 0, 0.40);

    // Shunt: flooded alveoli
    const shuntContribution = clamp(tacoSeverity * 0.20, 0, 0.25);

    // Resistance: airway secretions
    const resistancePenalty = clamp(tacoSeverity * 10, 0, 15);

    // SVR contribution: TACO typically causes HYPERTENSION (unlike TRALI which causes hypotension)
    const svrContribution = tacoActive ? clamp(tacoSeverity * 0.20, 0, 0.25) : 0;

    // BNP elevation (cardiomarker of volume overload)
    const bnpElevation = 1.0 + tacoRiskScore * 5.0; // up to 6× elevation

    // ===========================
    // EVENTS
    // ===========================
    if (tacoActive && tacoSeverity > 0.2 && !prevTACOLogged) {
      events.push(
        `⚠️ TACO — TRANSFUSION-ASSOCIATED CIRCULATORY OVERLOAD: ${totalTxMl.toFixed(0)} mL transfused at ${rateMlHr.toFixed(0)} mL/hr → elevated PCWP (~${(currentLVEDP + pcwpContribution).toFixed(0)} mmHg) → hydrostatic pulmonary edema. TACO risk score: ${(tacoRiskScore * 100).toFixed(0)}%. Distinguishing features vs TRALI: ELEVATED CVP/PCWP (now ${currentCVP.toFixed(0)} mmHg), NEW HYPERTENSION, BNP elevated (${bnpElevation.toFixed(1)}× baseline), responds to diuresis. TREATMENT: (1) SLOW/STOP transfusion; (2) Furosemide 20-40 mg IV (loop diuretic → ↓PCWP within 20 min); (3) Sit patient up; (4) 100% O2; (5) CPAP/BiPAP if SpO2 < 90%. Monitor UO (target 0.5-1 mL/kg/hr post-furosemide).`,
      );
      prevTACOLogged = true;
    }

    if (tacoActive && tacoSeverity > 0.6 && !prevTACOSevereLogged) {
      events.push(
        `🚨 SEVERE TACO — ACUTE PULMONARY EDEMA: Progressive respiratory failure from volume overload. PaO2/FiO2 may be < 300 (mimics ALI/ARDS criteria). MANAGEMENT: (1) Intubation if SpO2 < 88% on high-flow O2; (2) Furosemide 40-80 mg IV (repeat q2h until response); (3) Vasodilator (nitroglycerin infusion 5-100 mcg/min to reduce PCWP); (4) Inotrope if EF compromised (dobutamine 2-10 mcg/kg/min if cardiogenic component); (5) Stop ALL transfusions until stabilized. TACO ≠ TRALI — do NOT give fluids for "hyperdynamic state."`,
      );
      prevTACOSevereLogged = true;
    }

    if (!tacoActive) {
      prevTACOLogged = false;
      prevTACOSevereLogged = false;
    }

    return {
      tacoRiskScore: parseFloat(tacoRiskScore.toFixed(4)),
      tacoActive,
      tacoSeverity: parseFloat(tacoSeverity.toFixed(4)),
      pcwpContribution: parseFloat(pcwpContribution.toFixed(2)),
      compliancePenalty: parseFloat(compliancePenalty.toFixed(4)),
      shuntContribution: parseFloat(shuntContribution.toFixed(4)),
      resistancePenalty: parseFloat(resistancePenalty.toFixed(2)),
      svrContribution: parseFloat(svrContribution.toFixed(4)),
      furosemideEfficacy: parseFloat(furosemideEfficacy.toFixed(4)),
      bnpElevation: parseFloat(bnpElevation.toFixed(2)),
      prevTACOLogged,
      prevTACOSevereLogged,
      events,
    };
  }
}
