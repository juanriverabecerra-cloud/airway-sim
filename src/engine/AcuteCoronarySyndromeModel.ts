/**
 * Acute Coronary Syndrome (ACS) Perioperative Model
 *
 * ACS encompasses STEMI, NSTEMI, and Unstable Angina — different presentations of
 * acute myocardial ischemia from plaque rupture or demand mismatch.
 * Perioperative ACS is the leading cause of cardiac morbidity after non-cardiac surgery.
 *
 * === ACS CLASSIFICATION ===
 * STEMI (ST-Elevation MI): Complete coronary occlusion → transmural ischemia
 *   → Full-thickness necrosis → peak troponin often > 10,000 ng/L
 *   → Requires URGENT reperfusion (PCI or thrombolysis within minutes-hours)
 *
 * NSTEMI (Non-ST-Elevation MI): Partial coronary occlusion → subendocardial ischemia
 *   → ST depression/T-wave changes ± troponin elevation
 *   → PCI within 2-24h depending on risk stratification
 *
 * UA (Unstable Angina): ACS without troponin elevation (ischemia but no necrosis yet)
 *   → High-risk for evolving to NSTEMI/STEMI
 *   → Same initial management as NSTEMI
 *
 * === PERIOPERATIVE CONSIDERATIONS ===
 * 1. STEMI in the OR: Most dramatic scenario.
 *    Intraoperative STEMI recognition: new ST elevation on ECG monitoring,
 *    new wall motion abnormality on TEE, sudden hemodynamic deterioration.
 *    Treatment: Activate cath lab IMMEDIATELY if feasible.
 *    If mid-surgical: heparin, aspirin (if no fresh anastomosis), discuss with surgeon,
 *    immediate transfer to cath lab (may need to close wound first).
 *
 * 2. PERIOPERATIVE MINS (Myocardial Injury after Non-cardiac Surgery):
 *    Already in PerioperativeMIModel.ts — troponin > 14 ng/L post-surgery.
 *
 * 3. INTRAOPERATIVE HEMODYNAMIC GOALS in ACS:
 *    Rate-pressure product: HR × SBP ≤ 10,000 (reduces myocardial O2 demand)
 *    MAP: maintain ≥ 65-70 mmHg (coronary perfusion pressure)
 *    Avoid: tachycardia, hypertension, anemia
 *
 * 4. ANTIPLATELET MANAGEMENT:
 *    Aspirin: continue perioperatively in ACS (reduces mortality)
 *    P2Y12 (clopidogrel/ticagrelor): hold 5 days if surgery needed;
 *    if recent DES (drug-eluting stent < 12 months): delay surgery if at all possible
 *
 * === THROMBOLYSIS vs PCI IN PERIOPERATIVE SETTING ===
 * PCI is preferred (avoids systemic thrombolysis → surgical bleeding catastrophe).
 * If PCI not available AND < 12h STEMI, no recent surgery → consider thrombolysis.
 * Thrombolysis absolute contraindication: surgery < 2 weeks.
 *
 * Sources: Thygesen K, JACC 2018 (Universal MI Definition);
 * Duceppe E, CMAJ 2017 (perioperative ACS); Miller's 9th Ed Ch 40 (Cardiac Anesthesia).
 */

export interface ACSInputs {
  // ACS type
  acsType?: 'stemi' | 'nstemi' | 'ua' | 'none';
  stElevationPresent?: boolean;
  stDepressionPresent?: boolean;
  troponinNgL?: number;

  // Hemodynamics
  currentHR?: number;
  currentSBP?: number;
  currentDBP?: number;
  currentCO?: number;

  // Intraoperative context
  isIntraoperative?: boolean;
  surgeryInProgress?: boolean;
  minutesSinceACSOnset?: number;

  // Treatment given
  aspirinGiven?: boolean;
  heparinCe?: number;
  nitroglyceriCe?: number;
  betaBlockerCe?: number;
  pciFeasible?: boolean;             // cath lab available

  // Risk
  hasMultiVesselCAD?: boolean;
  ef?: number;                        // ejection fraction

  // Event guards
  prevSTEMILogged?: boolean;
  prevNSTEMILogged?: boolean;
  prevReperfusionLogged?: boolean;
}

export interface ACSOutput {
  acsType: string;
  acsActive: boolean;
  stemiActive: boolean;

  // Ischemia severity
  killipClass: 1 | 2 | 3 | 4;      // Killip classification (cardiogenic shock staging)
  inotropyPenalty: number;           // 0-0.6 (stunned myocardium)
  svrCompensation: number;           // compensatory vasoconstriction

  // Treatment urgency
  reperfusionUrgent: boolean;
  timeWindowForPCI: boolean;         // within 12h for STEMI benefit

  // Rate-pressure product
  ratePressureProduct: number;       // HR × SBP (demand)
  rppGoalMet: boolean;               // < 10,000

  prevSTEMILogged: boolean;
  prevNSTEMILogged: boolean;
  prevReperfusionLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AcuteCoronarySyndromeModel {
  static tick(inputs: ACSInputs = {}): ACSOutput {
    const events: string[] = [];
    let prevSTEMILogged = !!inputs.prevSTEMILogged;
    let prevNSTEMILogged = !!inputs.prevNSTEMILogged;
    let prevReperfusionLogged = !!inputs.prevReperfusionLogged;

    const acsType = inputs.acsType || 'none';
    const stElevation = !!inputs.stElevationPresent;
    const troponin = clamp(safeNumber(inputs.troponinNgL, 3), 0, 100000);
    const hr = clamp(safeNumber(inputs.currentHR, 80), 20, 250);
    const sbp = clamp(safeNumber(inputs.currentSBP, 120), 40, 250);
    const co = clamp(safeNumber(inputs.currentCO, 5), 0, 15);
    const ef = clamp(safeNumber(inputs.ef, 55), 5, 80);
    const minutesSince = clamp(safeNumber(inputs.minutesSinceACSOnset, 0), 0, 10000);
    const isIntraop = !!inputs.isIntraoperative;
    const surgeryOn = !!inputs.surgeryInProgress;
    const pciFeasible = !!inputs.pciFeasible;
    const nitroCe = clamp(safeNumber(inputs.nitroglyceriCe, 0), 0, 5);
    const bbCe = clamp(safeNumber(inputs.betaBlockerCe, 0), 0, 5);
    const heparinCe = clamp(safeNumber(inputs.heparinCe, 0), 0, 20);

    const stemiActive = acsType === 'stemi' || (stElevation && troponin > 52);
    const acsActive = acsType !== 'none';

    // ===========================
    // KILLIP CLASSIFICATION
    // ===========================
    let killipClass: 1 | 2 | 3 | 4;
    if (co < 2 || sbp < 90) {
      killipClass = co < 1.5 ? 4 : 3; // Killip III/IV = cardiogenic shock
    } else if (co < 3.5 || ef < 35) {
      killipClass = 2; // Killip II = mild LV dysfunction, S3 gallop
    } else {
      killipClass = 1; // Killip I = no HF signs
    }

    // ===========================
    // ISCHEMIA EFFECTS
    // ===========================
    // Stunned myocardium from ischemia
    const minsHoursActive = minutesSince / 60;
    const inotropyPenalty = acsActive
      ? clamp(
          (stemiActive ? 0.4 : 0.2)
          + (killipClass >= 3 ? 0.2 : 0)
          - (nitroCe > 0 ? 0.05 : 0)
          - (bbCe > 0 ? 0.05 : 0),
          0, 0.60,
        )
      : 0;

    // Compensatory SVR increase (cardiogenic shock compensation)
    const svrCompensation = killipClass >= 3
      ? clamp((3 - co) / 3 * 0.4, 0, 0.5) : 0;

    // ===========================
    // REPERFUSION WINDOW
    // ===========================
    const reperfusionUrgent = stemiActive;
    const timeWindowForPCI = stemiActive && minutesSince < 720; // 12h window for PCI benefit

    // ===========================
    // DEMAND ASSESSMENT
    // ===========================
    const ratePressureProduct = hr * sbp;
    const rppGoalMet = ratePressureProduct <= 10000;

    // ===========================
    // EVENTS
    // ===========================
    if (stemiActive && !prevSTEMILogged) {
      const surgNote = surgeryOn
        ? ' ⚠️ SURGERY IN PROGRESS: Discuss with surgeon (close vs continue); heparin 60 U/kg IV bolus; aspirin via NGT if no fresh anastomosis; prepare for immediate cath lab transfer.'
        : '';
      events.push(
        `🚨 STEMI — INTRAOPERATIVE CORONARY OCCLUSION: ST elevation present, troponin ${troponin.toFixed(0)} ng/L. KILLIP CLASS ${killipClass} (${killipClass >= 3 ? 'CARDIOGENIC SHOCK' : killipClass === 2 ? 'mild LV dysfunction' : 'no HF'}). ${pciFeasible ? 'PCI AVAILABLE — ACTIVATE CATH LAB IMMEDIATELY (door-to-balloon < 90 min). PCI superior to thrombolysis perioperatively (avoids bleeding catastrophe).' : 'PCI NOT IMMEDIATELY AVAILABLE — fibrinolysis contraindicated if surgery < 2 weeks. Consider transfer to PCI center.'}${surgNote} HEMODYNAMIC GOALS: MAP ≥ 70 (coronary perfusion), HR ≤ 80 (reduce demand). NTG infusion (coronary vasodilation). Vasopressin > NE if vasopressors needed (less myocardial demand).`,
      );
      prevSTEMILogged = true;
    }

    if (acsActive && !stemiActive && troponin > 14 && !prevNSTEMILogged) {
      events.push(
        `⚠️ NSTEMI/UA PERIOPERATIVE: Troponin ${troponin.toFixed(0)} ng/L elevated. IMMEDIATE: (1) Aspirin 325 mg (if no contraindication); (2) Anticoagulation (heparin or LMWH); (3) Cardiology notification; (4) Serial troponins (0h, 3h, 6h); (5) Rate-pressure product control (HR < 80, avoid hypotension); (6) Risk stratify for PCI timing (GRACE score). INTRAOPERATIVE GOALS: RPP ≤ 10,000 (currently ${ratePressureProduct.toLocaleString()}); maintain MAP ≥ 65-70; Hb ≥ 8; avoid tachycardia/HTN.`,
      );
      prevNSTEMILogged = true;
    }

    return {
      acsType,
      acsActive,
      stemiActive,
      killipClass,
      inotropyPenalty: parseFloat(inotropyPenalty.toFixed(4)),
      svrCompensation: parseFloat(svrCompensation.toFixed(4)),
      reperfusionUrgent,
      timeWindowForPCI,
      ratePressureProduct: Math.round(ratePressureProduct),
      rppGoalMet,
      prevSTEMILogged,
      prevNSTEMILogged,
      prevReperfusionLogged,
      events,
    };
  }
}
