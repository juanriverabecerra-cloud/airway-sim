/**
 * One-Lung Ventilation (OLV) Model
 *
 * OLV is required for thoracic surgery (lobectomy, pneumonectomy, esophagectomy,
 * thoracoscopy). The non-ventilated lung continues to receive pulmonary blood flow
 * (~50% of total CO at OLV initiation) but no ventilation → massive obligate
 * intrapulmonary right-to-left shunt → hypoxemia is the chief anesthetic hazard.
 *
 * === HYPOXIC PULMONARY VASOCONSTRICTION (HPV) ===
 * The non-ventilated lung becomes hypoxic → HPV diverts blood away from collapsed
 * lung. Over ~15 min (τ ≈ 5 min), HPV can reduce non-ventilated lung blood flow
 * from ~50% down to ~25% of total CO (Benumof, Anesthesiology 2004; Lumb, BJA 2002).
 * HPV is INHIBITED by volatile anesthetics (isoflurane/sevo/des at 1 MAC → ~25-30%
 * inhibition; halothane more potent inhibitor). IV anesthetics do not inhibit HPV.
 *
 * === CPAP TO NON-VENTILATED LUNG ===
 * Applying CPAP 5-10 cmH2O to the collapsed lung re-opens some alveoli (continuous
 * positive airway pressure despite no tidal ventilation) → reduces shunt significantly.
 * CPAP 5 cmH2O → ~50% reduction in OLV shunt; CPAP 10 cmH2O → ~70% reduction.
 * However, CPAP hinders surgical exposure and may cause mediastinal shift.
 *
 * === LATERAL DECUBITUS POSITIONING ===
 * With the patient in lateral decubitus (operative lung up), gravity reduces blood
 * flow to the upper (operative) lung by ~15%. Combined with HPV, this provides an
 * additional modest benefit during OLV.
 *
 * === VENTILATION MANAGEMENT DURING OLV ===
 * Single-lung compliance ≈ half two-lung compliance. Same tidal volume delivered to
 * one lung doubles the ΔP → significantly elevated PIP. Lung-protective strategy:
 * TV 4-6 mL/kg IBW (dependent lung only), PEEP 5-8 cmH2O, accept permissive
 * hypercapnia. Inspired FiO2 ≥ 0.8 routinely during OLV.
 *
 * === DLT / BRONCHIAL BLOCKER ===
 * Double-lumen tube (DLT): left- or right-sided; malposition in non-ventilated
 * bronchus → auto-PEEP/incomplete collapse; malposition in ventilated bronchus →
 * inadequate lung isolation → surgical field flooding. Confirm with fiberoptic bronchoscopy.
 *
 * Sources: Benumof JL, Anesthesiology 2004; Lumb AB, BJA 2002; Campos JH,
 * Curr Opin Anaesthesiol 2010; Miller's 9th Ed, Ch 67 (Thoracic Anesthesia).
 */

export interface OLVInputs {
  olvActive?: boolean;
  olvStartTimeSec?: number;       // simulation time (seconds) when OLV was initiated
  currentTimeSec?: number;        // current simulation time (seconds)
  hpvInhibitionFraction?: number; // 0-0.9; computed from volatile MAC in usePhysiology
  olvCpapCmH2O?: number;          // CPAP applied to non-ventilated lung (0 = none)
  olvLateralOperativeLungUp?: boolean; // lateral decubitus, operative lung up
  dltInPlace?: boolean;           // DLT or bronchial blocker placed
  dltMalpositioned?: boolean;     // DLT in wrong position
  prevOlvOnsetLogged?: boolean;
  prevOlvHypoxiaLogged?: boolean;
  prevOlvMalpositionLogged?: boolean;
  currentSpO2?: number;           // for hypoxia event gating
}

export interface OLVOutput {
  olvActive: boolean;
  olvDurationMinutes: number;
  olvShuntContribution: number;   // additive fraction to RespiratoryEngine actualShunt (0-0.50)
  olvCompliancePenaltyFraction: number; // multiply compliance by (1 - this); 0.40 = 40% reduction
  olvPipIncreaseCmH2O: number;    // expected PIP increase for same TV/rate (informational)
  hpvCompensationFraction: number; // 0-0.25; how much HPV is currently reducing shunt
  hpvInhibitedFraction: number;   // fraction of HPV benefit lost to volatile inhibition
  olvCpapBenefit: number;         // shunt reduction from CPAP to non-vent lung
  nonVentLungBloodFlowFraction: number; // effective blood flow to non-vent lung (0.15-0.50)
  dltMalpositionActive: boolean;
  prevOlvOnsetLogged: boolean;
  prevOlvHypoxiaLogged: boolean;
  prevOlvMalpositionLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class OneLungVentilationModel {
  static tick(inputs: OLVInputs = {}): OLVOutput {
    const events: string[] = [];
    let prevOlvOnsetLogged = !!inputs.prevOlvOnsetLogged;
    let prevOlvHypoxiaLogged = !!inputs.prevOlvHypoxiaLogged;
    let prevOlvMalpositionLogged = !!inputs.prevOlvMalpositionLogged;

    const olvActive = !!inputs.olvActive;

    if (!olvActive) {
      return {
        olvActive: false,
        olvDurationMinutes: 0,
        olvShuntContribution: 0,
        olvCompliancePenaltyFraction: 0,
        olvPipIncreaseCmH2O: 0,
        hpvCompensationFraction: 0,
        hpvInhibitedFraction: 0,
        olvCpapBenefit: 0,
        nonVentLungBloodFlowFraction: 0,
        dltMalpositionActive: false,
        prevOlvOnsetLogged,
        prevOlvHypoxiaLogged,
        prevOlvMalpositionLogged,
        events,
      };
    }

    const startTimeSec = safeNumber(inputs.olvStartTimeSec, inputs.currentTimeSec ?? 0);
    const currentTimeSec = safeNumber(inputs.currentTimeSec, startTimeSec);
    const olvDurationMin = Math.max(0, (currentTimeSec - startTimeSec) / 60);

    const hpvInhibition = clamp(safeNumber(inputs.hpvInhibitionFraction, 0), 0, 0.9);
    const cpapCmH2O = clamp(safeNumber(inputs.olvCpapCmH2O, 0), 0, 15);
    const lateralUp = !!inputs.olvLateralOperativeLungUp;
    const dltMalpositioned = !!inputs.dltMalpositioned;
    const currentSpO2 = safeNumber(inputs.currentSpO2, 100);

    // ===========================
    // INITIAL OLV ONSET EVENT
    // ===========================
    if (!prevOlvOnsetLogged) {
      events.push(
        '🫁 OLV INITIATED: One-lung ventilation active. Non-ventilated lung receiving ~50% of pulmonary blood flow with no ventilation → significant right-to-left intrapulmonary shunt. Expect SpO2 drop over next 5-15 min as HPV develops. Strategies: ↑FiO2 to 1.0, add CPAP 5 cmH2O to non-vent lung, ensure DLT properly positioned (confirm with FOB), use lung-protective TV 4-6 mL/kg IBW. Expect elevated PIP (single-lung compliance ~50% of two-lung). HPV takes ~15 min to develop fully; volatile agents inhibit HPV.',
      );
      prevOlvOnsetLogged = true;
    }

    // ===========================
    // HPV TIME COURSE
    // ===========================
    // HPV develops exponentially with time constant τ = 5 min.
    // At full development (>15 min): reduces non-vent lung blood flow from 50% to ~25% of CO.
    // Maximum HPV benefit = 0.25 fractional shunt reduction.
    const hpvDevelopment = 1 - Math.exp(-olvDurationMin / 5.0);
    const maxHpvBenefit = 0.25; // reduces shunt fraction by up to 0.25
    const rawHpvCompensation = maxHpvBenefit * hpvDevelopment;
    const hpvCompensationFraction = rawHpvCompensation * (1 - hpvInhibition);
    const hpvInhibitedFraction = rawHpvCompensation * hpvInhibition; // lost to volatiles

    // ===========================
    // CPAP TO NON-VENTILATED LUNG
    // ===========================
    // CPAP re-inflates some alveoli in the collapsed lung → partial oxygenation.
    // CPAP 5 cmH2O → ~0.12 shunt reduction; CPAP 10 → ~0.20 reduction.
    // (Benumof JL, Anesthesiology 2004; actual benefit varies; sigmoid curve)
    const olvCpapBenefit = clamp(cpapCmH2O * 0.024, 0, 0.20);

    // ===========================
    // LATERAL POSITION BENEFIT
    // ===========================
    // Operative lung up (lateral decubitus): gravity diverts ~15% additional flow to
    // dependent (ventilated) lung. Small but real additive benefit.
    const lateralBenefit = lateralUp ? 0.08 : 0.0;

    // ===========================
    // NET NON-VENTILATED LUNG BLOOD FLOW
    // ===========================
    // Starting at 0.50 (50% of total CO), reduced by HPV, CPAP, and position.
    // Floor at 0.10: even with ideal conditions, ~10% shunt remains during OLV.
    const nonVentLungBloodFlowFraction = clamp(
      0.50 - hpvCompensationFraction - olvCpapBenefit - lateralBenefit,
      0.10,
      0.50,
    );

    // OLV shunt contribution (additive to RespiratoryEngine's existing actualShunt).
    // Remove the normal 5% physiologic shunt that's already in baselineShunt to avoid
    // double-counting — so net additive = non-vent lung flow - 0.05.
    const olvShuntContribution = clamp(nonVentLungBloodFlowFraction - 0.05, 0, 0.48);

    // ===========================
    // COMPLIANCE PENALTY
    // ===========================
    // Single lung compliance ≈ half two-lung compliance.
    // Additionally, dependent lung atelectasis can further reduce compliance.
    // Net: ventilating one lung with normal TV ≈ 40-50% compliance reduction.
    const olvCompliancePenaltyFraction = dltMalpositioned ? 0.20 : 0.45;

    // ===========================
    // EXPECTED PIP INCREASE
    // ===========================
    // Same TV, half compliance → ΔP roughly doubles for compliant portion.
    // Informational: approximately 15-25 cmH2O increase in PIP depending on settings.
    const olvPipIncreaseCmH2O = dltMalpositioned ? 5 : Math.round(12 + (1 - hpvCompensationFraction / maxHpvBenefit) * 8);

    // ===========================
    // DLT MALPOSITION
    // ===========================
    if (dltMalpositioned) {
      if (!prevOlvMalpositionLogged) {
        events.push(
          '⚠️ DLT MALPOSITION DETECTED: Double-lumen tube not correctly positioned. Non-ventilated lung may not be fully collapsed, or ventilated lung is compromised. Perform fiberoptic bronchoscopic check NOW. Signs of malposition: inadequate lung isolation (surgeon complaints), asymmetric breath sounds, unexpected high PIP on ventilated side, inadequate SpO2 improvement with repositioning attempts.',
        );
        prevOlvMalpositionLogged = true;
      }
    } else {
      prevOlvMalpositionLogged = false;
    }

    // ===========================
    // HYPOXIA WARNING
    // ===========================
    if (currentSpO2 < 90 && olvActive && !prevOlvHypoxiaLogged) {
      events.push(
        `🚨 OLV HYPOXIA: SpO2 ${currentSpO2}% during one-lung ventilation. Immediate checklist: (1) FiO2 1.0? (2) DLT position correct (FOB)? (3) Add CPAP 5-10 cmH2O to non-ventilated lung. (4) Recruitment maneuver to dependent lung (30 cmH2O sustained inflation × 30s). (5) Consider differential PEEP (5-8 cmH2O dependent, 0-5 cmH2O non-dependent). (6) If unresponsive: temporarily re-expand non-ventilated lung, discuss with surgeon. Hypoxia during OLV is multifactorial: shunt + HPV inhibition by volatile + atelectasis in dependent lung.`,
      );
      prevOlvHypoxiaLogged = true;
    }
    if (currentSpO2 >= 94 && prevOlvHypoxiaLogged) {
      prevOlvHypoxiaLogged = false; // reset for next episode
    }

    return {
      olvActive,
      olvDurationMinutes: parseFloat(olvDurationMin.toFixed(1)),
      olvShuntContribution: parseFloat(olvShuntContribution.toFixed(4)),
      olvCompliancePenaltyFraction: parseFloat(olvCompliancePenaltyFraction.toFixed(4)),
      olvPipIncreaseCmH2O,
      hpvCompensationFraction: parseFloat(hpvCompensationFraction.toFixed(4)),
      hpvInhibitedFraction: parseFloat(hpvInhibitedFraction.toFixed(4)),
      olvCpapBenefit: parseFloat(olvCpapBenefit.toFixed(4)),
      nonVentLungBloodFlowFraction: parseFloat(nonVentLungBloodFlowFraction.toFixed(4)),
      dltMalpositionActive: dltMalpositioned,
      prevOlvOnsetLogged,
      prevOlvHypoxiaLogged,
      prevOlvMalpositionLogged,
      events,
    };
  }
}
