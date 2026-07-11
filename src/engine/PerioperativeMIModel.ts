/**
 * Perioperative Myocardial Infarction Model
 *
 * Perioperative myocardial infarction (PMI) and myocardial injury after noncardiac
 * surgery (MINS) are the most common serious cardiac complications of surgery.
 * MINS: troponin > 99th percentile (≥14 ng/L hs-TnT) within 30 days — 1-2% of adults
 * undergoing noncardiac surgery, with 30-day mortality ~10%.
 *
 * === TWO MECHANISTIC TYPES ===
 *
 * TYPE 1 — Plaque rupture (atherothrombotic):
 *   Surgical stress → catecholamine surge → plaque destabilization → rupture →
 *   coronary thrombus → transmural ischemia → STEMI or NSTEMI pattern.
 *   Risk: CAD, prior MI, calcified plaque, reduced coronary reserve.
 *   Treatment: urgent PCI if hemodynamically feasible (anticoagulation cautious if
 *   fresh surgical wound).
 *
 * TYPE 2 — Demand ischemia (supply-demand mismatch):
 *   Far more common perioperatively (~70% of PMI). Fixed coronary obstruction + tachycardia
 *   (reduced diastolic filling time) + hypotension (reduced coronary perfusion pressure)
 *   + anemia (reduced O2 carrying capacity) → subendocardial ischemia.
 *   Classic: Patient with 70% LAD stenosis + heart rate 120 + MAP 55 + Hb 7 = PMI.
 *   Treatment: optimize hemodynamics (rate control, BP support, transfuse).
 *
 * === MYOCARDIAL OXYGEN SUPPLY-DEMAND BALANCE ===
 * Supply determinants:
 *   - Coronary blood flow (CBF) = CPP / Rcoronary
 *   - CBF mainly during diastole (subendocardium especially)
 *   - Coronary perfusion pressure (CPP_coronary) = diastolic BP - LVEDP
 *   - Diastolic filling time = (60/HR - systolic time) → inversely proportional to HR
 *   - O2 content = Hb × 1.34 × SaO2 + dissolved (already in RespiratoryEngine)
 *
 * Demand determinants (rate-pressure product = HR × SBP is the classic clinical surrogate):
 *   - Heart rate (tachycardia → most dangerous)
 *   - Wall stress (proportional to afterload/SVR × ventricular radius / wall thickness)
 *   - Contractility (inotropy increases demand)
 *
 * === TROPONIN KINETICS ===
 * Rise begins 3-4h post-event. Peak at 24-48h. Return to baseline over 10-14 days.
 * Modeled as a two-compartment washout from injured myocyte pool.
 * hs-TnT threshold: > 14 ng/L (MINS), > 52 ng/L (99th percentile upper reference limit).
 * Peak troponin in massive STEMI: 10,000-50,000 ng/L.
 *
 * === ECG CHANGES ===
 * STEMI: ST elevation ≥ 1mm in ≥2 contiguous leads (not modeled per-lead, but flagged)
 * NSTEMI/UA: ST depression, T-wave inversions (ischemia without complete occlusion)
 * New LBBB: treated as STEMI equivalent
 *
 * Sources: Devereaux PJ, NEJM 2018 (MINS); Thygesen K, JACC 2018 (Universal MI definition);
 * Landesberg G, Anesthesiology 2012; Miller's 9th Ed Ch 40 (Cardiac Anesthesia).
 */

export interface PMIInputs {
  // Patient risk factors
  hasCAD?: boolean;             // known coronary artery disease
  hasHFrEF?: boolean;          // reduced ejection fraction CHF
  priorMI?: boolean;            // history of prior MI
  diabetesPresent?: boolean;    // independently increases risk
  rcriScore?: number;           // RCRI score (0-6), already computed in ClinicalScoringEngine

  // Current hemodynamics
  currentHR?: number;           // bpm
  currentSBP?: number;          // mmHg
  currentDBP?: number;          // mmHg
  currentMAP?: number;          // mmHg
  currentHb?: number;           // g/dL
  currentSaO2?: number;         // fraction (0-1)
  currentLVEDP?: number;        // mmHg (from FourChamberCircuitModel)
  currentCO?: number;           // L/min

  // Ongoing ischemic burden
  ischemicBurdenAccumulator?: number; // 0-1000, accumulates with supply-demand mismatch
  troponinNgL?: number;              // current high-sensitivity troponin (ng/L)
  troponinPeakNgL?: number;          // peak troponin reached

  // Infarct event
  miActiveType1?: boolean;           // plaque rupture event (triggered)
  miActiveType2?: boolean;           // demand ischemia event (continuous process)
  minutesSinceMIOnset?: number;

  // Event guards
  prevIschemiaLogged?: boolean;
  prevMIType1Logged?: boolean;
  prevMIType2Logged?: boolean;
  prevTroponinAlertLogged?: boolean;
}

export interface PMIOutput {
  // Supply-demand balance
  ratePressureProduct: number;    // HR × SBP (demand proxy, normal < 10,000)
  coronaryPerfPressure: number;   // dBP - LVEDP (supply proxy, normal 60-80 mmHg)
  supplyDemandIndex: number;      // 0-1: 0=balanced, 1=critical mismatch
  ischemicBurdenAccumulator: number;

  // Troponin kinetics
  troponinNgL: number;
  troponinPeakNgL: number;
  minsDetected: boolean;          // hs-TnT > 14 ng/L
  significantMIDetected: boolean; // hs-TnT > 52 ng/L

  // Myocardial injury effects
  stElevationActive: boolean;    // feeds EkgModel
  stDepressionActive: boolean;
  myocardialStunningContribution: number; // 0-0.8 added to existing myocardialStunning

  // Vasopressor/inotropy demand changes
  inotropyPenalty: number;       // 0-0.5 reduction in effective inotropy from injured myocardium

  prevIschemiaLogged: boolean;
  prevMIType1Logged: boolean;
  prevMIType2Logged: boolean;
  prevTroponinAlertLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class PerioperativeMIModel {
  static tick(inputs: PMIInputs = {}): PMIOutput {
    const events: string[] = [];
    let prevIschemiaLogged = !!inputs.prevIschemiaLogged;
    let prevMIType1Logged = !!inputs.prevMIType1Logged;
    let prevMIType2Logged = !!inputs.prevMIType2Logged;
    let prevTroponinAlertLogged = !!inputs.prevTroponinAlertLogged;

    const hasCAD = !!inputs.hasCAD;
    const priorMI = !!inputs.priorMI;
    const hasHFrEF = !!inputs.hasHFrEF;
    const rcri = clamp(safeNumber(inputs.rcriScore, 0), 0, 6);

    const hr = clamp(safeNumber(inputs.currentHR, 75), 20, 250);
    const sbp = clamp(safeNumber(inputs.currentSBP, 120), 40, 250);
    const dbp = clamp(safeNumber(inputs.currentDBP, 75), 20, 160);
    const hb = clamp(safeNumber(inputs.currentHb, 14), 1, 20);
    const saO2 = clamp(safeNumber(inputs.currentSaO2, 0.98), 0, 1);
    const lvedp = clamp(safeNumber(inputs.currentLVEDP, 8), 0, 40);
    const co = clamp(safeNumber(inputs.currentCO, 5), 0.1, 15);

    // ===========================
    // SUPPLY-DEMAND ANALYSIS
    // ===========================
    // Demand proxy: rate-pressure product (RPP = HR × SBP; normal ~7000-9000 at rest)
    const ratePressureProduct = hr * sbp;
    // Normal RPP: ~6000-9000; tachycardia + HTN can reach 24,000+
    const rppDemandIndex = clamp((ratePressureProduct - 9000) / 15000, 0, 1);

    // Supply proxy: coronary perfusion pressure (dBP - LVEDP; normal 60-80 mmHg)
    // Subendocardial ischemia occurs when CPP < 30-40 mmHg
    const coronaryPerfPressure = Math.max(0, dbp - lvedp);
    const cppDeficitIndex = clamp((40 - coronaryPerfPressure) / 40, 0, 1); // 0 if CPP≥40, 1 if CPP=0

    // O2 delivery contribution: low Hb amplifies ischemia
    const cao2 = hb * 1.34 * saO2; // mL O2/dL blood
    const o2Deficit = clamp((14 - cao2) / 12, 0, 1); // 0 at normal, 1 at severe anemia+hypoxia

    // Combined supply-demand mismatch index
    const supplyDemandIndex = clamp(
      rppDemandIndex * 0.4 + cppDeficitIndex * 0.4 + o2Deficit * 0.2,
      0, 1.0,
    );

    // ===========================
    // ISCHEMIC BURDEN ACCUMULATION
    // ===========================
    // Accumulates with sustained supply-demand mismatch; modified by CAD risk
    const cadRiskMultiplier = hasCAD ? 2.0 : priorMI ? 1.5 : rcri >= 3 ? 1.3 : 1.0;
    const prevBurden = clamp(safeNumber(inputs.ischemicBurdenAccumulator, 0), 0, 1000);
    // Per-second accumulation when supply-demand mismatch is significant
    const burdenIncrement = supplyDemandIndex > 0.3
      ? (supplyDemandIndex - 0.3) * cadRiskMultiplier * 0.5 // per second
      : 0;
    // Recovery when hemodynamics normalize (slower than accumulation — ischemia resolves slower)
    const burdenRecovery = supplyDemandIndex < 0.1 ? 0.05 : 0; // per second
    const ischemicBurdenAccumulator = clamp(prevBurden + burdenIncrement - burdenRecovery, 0, 1000);

    // ===========================
    // MI TYPE 2 (DEMAND ISCHEMIA) — develops with ischemic burden
    // ===========================
    const miType2Active = !!inputs.miActiveType2 || ischemicBurdenAccumulator > 200;

    if (ischemicBurdenAccumulator > 150 && !prevIschemiaLogged) {
      events.push(
        `⚠️ MYOCARDIAL ISCHEMIA RISK: Sustained hemodynamic stress creating supply-demand mismatch. Rate-Pressure Product: ${Math.round(ratePressureProduct).toLocaleString()} (high demand); Coronary Perfusion Pressure: ${coronaryPerfPressure.toFixed(0)} mmHg (normal > 60); Hb: ${hb.toFixed(1)} g/dL. In patients with known CAD or risk factors, this pattern causes Type 2 MI (demand ischemia). INTERVENTIONS: Rate control (target HR 60-80) if tachycardia; MAP optimization (target > 65-70, or > 80 in known CAD); transfuse if Hb < 7-8 g/dL. Monitor ECG for ST changes. Consider troponin at 4h post-surgery.`,
      );
      prevIschemiaLogged = true;
    }
    if (ischemicBurdenAccumulator < 100) prevIschemiaLogged = false;

    if (miType2Active && ischemicBurdenAccumulator > 300 && !prevMIType2Logged) {
      events.push(
        `🚨 TYPE 2 MI (DEMAND ISCHEMIA): Supply-demand mismatch threshold exceeded — subendocardial ischemia likely. Troponin will begin rising. ECG: ST depression (subendocardial pattern). MANAGEMENT: (1) Rate control — target HR < 80 (beta-blocker if not contraindicated); (2) MAP support → norepinephrine/vasopressin to maintain DBP > 60 (coronary perfusion); (3) Optimize O2 content (transfuse if Hb < 8 in active ischemia); (4) Avoid further catecholamine-driven demand (adequate analgesia/anesthesia depth); (5) Serial troponins; (6) Cardiology notification; (7) Aspirin 325mg if no surgical contraindication.`,
      );
      prevMIType2Logged = true;
    }

    // ===========================
    // MI TYPE 1 (PLAQUE RUPTURE) — event-driven
    // ===========================
    const miType1Active = !!inputs.miActiveType1;
    if (miType1Active && !prevMIType1Logged) {
      events.push(
        `🚨 TYPE 1 MI — PLAQUE RUPTURE: Acute coronary occlusion from intraoperative plaque destabilization. ECG: ST elevation (STEMI). IMMEDIATE ACTIONS: (1) CARDIOLOGY/CATH LAB ACTIVATION; (2) Heparin 60 U/kg IV bolus (anticoagulation — balance bleeding risk vs coronary occlusion); (3) Aspirin 325mg via NGT; (4) Maintain MAP > 70 with vasopressors (do NOT depend on inotropy alone — demand increases worsen ischemia); (5) Nitroglycerin 0.4mg SL or infusion for coronary vasodilation; (6) Primary PCI vs. thrombolysis decision based on surgical wound and bleeding risk; (7) Intra-aortic balloon pump if cardiogenic shock.`,
      );
      prevMIType1Logged = true;
    }

    // ===========================
    // TROPONIN KINETICS
    // ===========================
    const prevTrop = clamp(safeNumber(inputs.troponinNgL, 3), 0, 100000);
    const prevPeak = clamp(safeNumber(inputs.troponinPeakNgL, prevTrop), 0, 100000);
    const minutesSince = safeNumber(inputs.minutesSinceMIOnset, 0);

    let troponinNgL = prevTrop;
    let troponinPeakNgL = prevPeak;

    const miSeverityFactor = miType1Active ? 3.0 : miType2Active ? 1.0 : 0;
    if (miSeverityFactor > 0 && minutesSince > 0) {
      // Rise begins 3-4h post-event, peaks at 24-48h
      // Model: two-compartment with release rate proportional to infarct severity
      const riseTimeFactor = minutesSince > 180 ? Math.min(1.0, (minutesSince - 180) / 1440) : 0;
      const riseRate = miSeverityFactor * cadRiskMultiplier * riseTimeFactor * 2.0; // ng/L/min
      troponinNgL = Math.min(50000, prevTrop + riseRate / 60);
      troponinPeakNgL = Math.max(prevPeak, troponinNgL);
    } else if (!miType1Active && !miType2Active && troponinNgL > 3) {
      // Clearance when ischemia resolves (slower decline — logarithmic, 10-14 days)
      troponinNgL = Math.max(3, prevTrop - 0.005 / 60);
    }

    const minsDetected = troponinNgL > 14;         // MINS threshold (hs-TnT)
    const significantMIDetected = troponinNgL > 52; // 99th percentile ULR

    if (minsDetected && !prevTroponinAlertLogged) {
      events.push(
        `⚠️ MYOCARDIAL INJURY DETECTED (MINS): hs-Troponin T ${troponinNgL.toFixed(0)} ng/L > 14 ng/L threshold. Myocardial injury after noncardiac surgery (MINS) — associated with 30-day mortality ~10%. Does NOT require classic MI symptoms. MANAGEMENT: Cardiology consult. Serial troponins (0h, 3h, 6h, 24h). Aspirin (if no surgical contraindication). Optimize hemodynamics. Beta-blocker if HR elevated and no cardiogenic shock. Statin if not already on one. Investigate cause: Type 1 vs Type 2.`,
      );
      prevTroponinAlertLogged = true;
    }

    // ===========================
    // MYOCARDIAL EFFECTS
    // ===========================
    const stElevationActive = miType1Active;
    const stDepressionActive = miType2Active && ischemicBurdenAccumulator > 250;
    const myocardialStunningContribution = clamp(
      (miType1Active ? 0.5 : 0) + (ischemicBurdenAccumulator / 1000) * 0.4,
      0, 0.8,
    );
    const inotropyPenalty = clamp(myocardialStunningContribution * 0.6, 0, 0.5);

    return {
      ratePressureProduct: Math.round(ratePressureProduct),
      coronaryPerfPressure: parseFloat(coronaryPerfPressure.toFixed(1)),
      supplyDemandIndex: parseFloat(supplyDemandIndex.toFixed(4)),
      ischemicBurdenAccumulator: parseFloat(ischemicBurdenAccumulator.toFixed(2)),
      troponinNgL: parseFloat(troponinNgL.toFixed(2)),
      troponinPeakNgL: parseFloat(troponinPeakNgL.toFixed(2)),
      minsDetected,
      significantMIDetected,
      stElevationActive,
      stDepressionActive,
      myocardialStunningContribution: parseFloat(myocardialStunningContribution.toFixed(4)),
      inotropyPenalty: parseFloat(inotropyPenalty.toFixed(4)),
      prevIschemiaLogged,
      prevMIType1Logged,
      prevMIType2Logged,
      prevTroponinAlertLogged,
      events,
    };
  }
}
