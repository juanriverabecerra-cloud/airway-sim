/**
 * Chronic Kidney Disease / ESRD Perioperative Model
 *
 * CKD affects ~15% of the adult population worldwide and dramatically complicates
 * perioperative management. ESRD (GFR < 15) and dialysis add further complexity.
 *
 * === CKD STAGING (KDIGO 2012) ===
 * Stage 1: GFR ≥ 90 mL/min (normal function but structural disease)
 * Stage 2: GFR 60-89 (mildly decreased)
 * Stage 3a: GFR 45-59 (mild-moderate)
 * Stage 3b: GFR 30-44 (moderate-severe)
 * Stage 4: GFR 15-29 (severely decreased)
 * Stage 5: GFR < 15 (kidney failure, dialysis required)
 *
 * === KEY PERIOPERATIVE CONCERNS ===
 *
 * 1. DRUG DOSING ADJUSTMENTS:
 *    Renally cleared drugs accumulate: morphine-6-glucuronide (active metabolite),
 *    codeine (avoid — morphine-like toxic metabolite), meperidine (normeperidine
 *    seizure risk), gabapentin/pregabalin (dose reduce), LMWH (anti-Xa monitoring),
 *    vancomycin (AUC-based dosing), aminoglycosides (extended interval),
 *    dexmedetomidine (reduce infusion rate), sugammadex (reduced dose in severe CKD).
 *    SAFE drugs: fentanyl, sufentanil, propofol, ketamine, cisatracurium (Hoffmann),
 *    desflurane/sevoflurane (not fluoride nephrotoxic), atracurium (Hoffmann), remifentanil.
 *
 * 2. HYPERKALEMIA RISK:
 *    ESRD/CKD: already partially hyperkalemic (K+ 4.5-6.0 mEq/L at baseline).
 *    Succinylcholine: +0.5-1.0 mEq/L even in normal patients → in ESRD patient at K+ 5.5
 *    → may reach 6.5+ → LIFE-THREATENING.
 *    Safe alternatives: rocuronium (can reverse with sugammadex).
 *
 * 3. FLUID MANAGEMENT:
 *    ESRD/anuria: NO renal compensation for fluid overload.
 *    Aggressive fluid restriction: 500-700 mL/day base + previous day's urine output.
 *    Hemodialysis removes fluid: time anesthesia relative to last dialysis session.
 *    OPTIMAL TIMING: 1 day after dialysis (fluid removed, K+ corrected, but not dry/hypotensive).
 *    AVOID LR (potassium-containing) in ESRD — use NS (isotonic, no K+).
 *
 * 4. ANEMIA OF CKD:
 *    Erythropoietin deficiency → normocytic normochromic anemia.
 *    Baseline Hb often 8-10 g/dL. Preoperative optimization: epoetin alfa injections
 *    (weeks before surgery). Acute management: iron supplementation (if depleted),
 *    RBC transfusion if Hb < 7-8 g/dL.
 *
 * 5. CARDIOVASCULAR DISEASE:
 *    CKD is an independent CV risk factor. Accelerated atherosclerosis.
 *    50% of CKD deaths are from cardiovascular causes.
 *    CKD-specific risks: arteriovenous fistula (AV access), dialysis-related hemodynamic shifts.
 *
 * 6. COAGULATION EFFECTS:
 *    Uremic platelet dysfunction: elevated BUN → carbamylation of platelet receptors → ↓adhesion
 *    Risk: surgical bleeding despite normal platelet count (but functions poorly).
 *    Treatment: DDAVP (desmopressin) 0.3 mcg/kg IV 30 min before surgery → von Willebrand factor
 *    release from endothelium → temporarily corrects uremic platelet dysfunction.
 *    Duration: 4-8h effect.
 *
 * 7. UREMIA:
 *    BUN > 60-80 mg/dL → uremic encephalopathy → somnolence, confusion, seizures.
 *    Also: pericarditis (uremic), neuropathy (peripheral), reduced MAC (uremia lowers MAC).
 *    Treatment: dialysis.
 *
 * Sources: Chertow GM, NEJM 2004; KDIGO CKD guidelines 2012;
 * Hirsch IA, Anaesthesia 2002; Miller's 9th Ed Ch 46 (Renal Disease).
 */

export interface CKDPerioperativeInputs {
  gfr?: number;                    // mL/min/1.73m² (KDIGO staging)
  isOnDialysis?: boolean;          // true if ESRD/dialysis patient
  daysSinceLastDialysis?: number;  // optimal = 1 day
  bun?: number;                    // mg/dL (normal < 20; uremia > 60-80)
  baselineKPlus?: number;          // mEq/L baseline potassium in CKD patient
  baselineHb?: number;             // g/dL (anemia of CKD)

  // Drugs being given (for safety check)
  morphineCe?: number;
  codeineCe?: number;              // AVOID in CKD (toxic norcodeine metabolite)
  mepCe?: number;                  // meperidine AVOID (normeperidine seizures)
  gabapentinCe?: number;           // dose-reduce in CKD
  succinylcholineCe?: number;      // hyperkalemia risk

  // DDAVP for uremic platelet dysfunction
  desmopressinCe?: number;

  // Event guards
  prevCKDWarningLogged?: boolean;
  prevUremiaPlateletLogged?: boolean;
  prevHyperKSuxLogged?: boolean;
}

export interface CKDPerioperativeOutput {
  ckdStage: 1 | 2 | 3 | 4 | 5 | 0; // 0 = normal
  isESRD: boolean;
  isUremic: boolean;
  uremiaPlateletDysfunctionIndex: number; // 0-1
  ddavpPlateletCorrectionEfficacy: number; // 0-1
  hyperkalemiaRiskFromSux: number; // expected K+ rise from succinylcholine (mEq/L)
  succinylcholineContraindicated: boolean; // K+ already high + CKD
  fluidVolumeSensitivity: number;  // 0-1 (1 = no renal compensation)
  anemiaSeverity: number;          // 0-1
  macReduction: number;            // fraction reduction in MAC from uremia
  dangerousDrugsPresent: string[]; // list of drugs that need dose reduction/avoidance
  prevCKDWarningLogged: boolean;
  prevUremiaPlateletLogged: boolean;
  prevHyperKSuxLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class CKDPerioperativeModel {
  static tick(inputs: CKDPerioperativeInputs = {}): CKDPerioperativeOutput {
    const events: string[] = [];
    let prevCKDWarningLogged = !!inputs.prevCKDWarningLogged;
    let prevUremiaPlateletLogged = !!inputs.prevUremiaPlateletLogged;
    let prevHyperKSuxLogged = !!inputs.prevHyperKSuxLogged;

    const gfr = clamp(safeNumber(inputs.gfr, 90), 0, 200);
    const onDialysis = !!inputs.isOnDialysis;
    const daysSinceDialysis = clamp(safeNumber(inputs.daysSinceLastDialysis, 1), 0, 30);
    const bun = clamp(safeNumber(inputs.bun, 15), 0, 200);
    const baselineK = clamp(safeNumber(inputs.baselineKPlus, 4.0), 2.0, 7.0);
    const baselineHb = clamp(safeNumber(inputs.baselineHb, 14), 3, 18);

    // CKD Stage
    let ckdStage: 0 | 1 | 2 | 3 | 4 | 5;
    if (onDialysis || gfr < 15) ckdStage = 5;
    else if (gfr < 30) ckdStage = 4;
    else if (gfr < 45) ckdStage = 3;
    else if (gfr < 60) ckdStage = 3; // 3a/3b combined for simplicity
    else if (gfr < 90) ckdStage = 2;
    else if (gfr >= 90) ckdStage = gfr > 100 ? 0 : 1; // >100 = normal
    else ckdStage = 0;

    const isESRD = ckdStage === 5;
    const isUremic = bun > 60;

    // ===========================
    // UREMIC PLATELET DYSFUNCTION
    // ===========================
    // BUN > 60 → uremic toxins impair platelet adhesion (VWF-receptor binding reduced)
    const uremiaPlateletDysfunctionIndex = bun > 60
      ? clamp((bun - 60) / 60, 0, 1.0) : 0;

    // DDAVP releases VWF from endothelium → temporarily corrects
    const desmopressinCe = clamp(safeNumber(inputs.desmopressinCe, 0), 0, 5);
    const ddavpPlateletCorrectionEfficacy = desmopressinCe > 0
      ? clamp(desmopressinCe / (desmopressinCe + 0.3) * 0.85, 0, 0.85) : 0;

    if (uremiaPlateletDysfunctionIndex > 0.3 && !prevUremiaPlateletLogged) {
      events.push(
        `⚠️ UREMIC PLATELET DYSFUNCTION: BUN ${bun.toFixed(0)} mg/dL → carbamylation of platelet GPIb receptors → impaired VWF adhesion → surgical bleeding risk despite NORMAL PLATELET COUNT. Routine coagulation tests (PT/aPTT) do NOT detect this — need PFA-100 or TEG. TREATMENT: DDAVP (Desmopressin) 0.3 mcg/kg IV over 30 min pre-operatively → VWF release from Weibel-Palade bodies → temporary correction (lasts 4-8h). Alternative: Cryoprecipitate (VWF-rich). Dialysis optimizes uremic milieu pre-op (ideally complete the day before surgery, not day-of — avoids heparin effects from same-day dialysis).`,
      );
      prevUremiaPlateletLogged = true;
    }

    // ===========================
    // HYPERKALEMIA RISK WITH SUX
    // ===========================
    const succinylcholineCe = clamp(safeNumber(inputs.succinylcholineCe, 0), 0, 10);
    // Succinylcholine adds ~0.5-1.0 mEq/L K+ even in normals
    const suxKRise = succinylcholineCe > 0.1 ? 0.7 : 0; // average +0.7 mEq/L
    const projectedK = baselineK + suxKRise;
    const succinylcholineContraindicated = baselineK > 5.0 || (isESRD && !onDialysis);
    const hyperkalemiaRiskFromSux = suxKRise;

    if (succinylcholineCe > 0.1 && succinylcholineContraindicated && !prevHyperKSuxLogged) {
      events.push(
        `🚨 SUCCINYLCHOLINE IN HIGH-RISK CKD PATIENT: Baseline K⁺ ${baselineK.toFixed(1)} mEq/L. Succinylcholine will add ~0.7 mEq/L → projected K⁺ ${projectedK.toFixed(1)} mEq/L (${projectedK > 6.5 ? 'DANGEROUS — cardiac arrest risk' : projectedK > 6.0 ? 'HIGH RISK — arrhythmia risk' : 'elevated but manageable'}). SAFE ALTERNATIVE: Rocuronium 1.2 mg/kg (modified RSI dose, 60-90s onset) + Sugammadex 16 mg/kg for immediate reversal if needed. In ESRD patients, AVOID succinylcholine unless the K⁺ has been verified to be < 5.0 mEq/L on same-day labs.`,
      );
      prevHyperKSuxLogged = true;
    }

    // ===========================
    // DANGEROUS DRUG DETECTION
    // ===========================
    const dangerousDrugsPresent: string[] = [];
    if (inputs.codeineCe && inputs.codeineCe > 0 && ckdStage >= 3) {
      dangerousDrugsPresent.push('Codeine (toxic norcodeine metabolite accumulates in CKD)');
    }
    if (inputs.mepCe && inputs.mepCe > 0 && ckdStage >= 3) {
      dangerousDrugsPresent.push('Meperidine (normeperidine seizure risk in CKD)');
    }
    if (inputs.morphineCe && inputs.morphineCe > 0 && ckdStage >= 4) {
      dangerousDrugsPresent.push('Morphine (M-6-G active metabolite accumulates → prolonged sedation/respiratory depression)');
    }
    if (inputs.gabapentinCe && inputs.gabapentinCe > 0 && ckdStage >= 3) {
      dangerousDrugsPresent.push('Gabapentin (dose reduce by 50-75% in CKD 3-5)');
    }

    if (dangerousDrugsPresent.length > 0 && !prevCKDWarningLogged) {
      events.push(
        `⚠️ CKD DRUG SAFETY: CKD Stage ${ckdStage} (GFR ${gfr.toFixed(0)} mL/min). The following drugs require dose reduction or are contraindicated: ${dangerousDrugsPresent.join('; ')}. SAFE OPIOIDS in CKD: Fentanyl (hepatic), Sufentanil, Remifentanil (plasma esterases). SAFE NMB in CKD: Cisatracurium/Atracurium (Hoffmann degradation, organ-independent), Rocuronium (hepatic, sugammadex reversal). Avoid NSAIDS in CKD 3+ (worsens AKI). Vancomycin/aminoglycosides: require extended intervals and drug level monitoring.`,
      );
      prevCKDWarningLogged = true;
    }

    // ===========================
    // FLUID SENSITIVITY
    // ===========================
    // ESRD/anuria: no renal compensation → volume-sensitive
    const fluidVolumeSensitivity = isESRD ? 1.0 : clamp(1 - gfr / 90, 0, 1.0);

    // ===========================
    // ANEMIA SEVERITY
    // ===========================
    const anemiaSeverity = baselineHb < 10
      ? clamp((10 - baselineHb) / 7, 0, 1.0) : 0;

    // ===========================
    // MAC REDUCTION FROM UREMIA
    // ===========================
    // Uremic encephalopathy reduces MAC by ~20-30%
    const macReduction = isUremic ? clamp(bun / 200 * 0.35, 0, 0.35) : 0;

    return {
      ckdStage,
      isESRD,
      isUremic,
      uremiaPlateletDysfunctionIndex: parseFloat(uremiaPlateletDysfunctionIndex.toFixed(4)),
      ddavpPlateletCorrectionEfficacy: parseFloat(ddavpPlateletCorrectionEfficacy.toFixed(4)),
      hyperkalemiaRiskFromSux: parseFloat(hyperkalemiaRiskFromSux.toFixed(2)),
      succinylcholineContraindicated,
      fluidVolumeSensitivity: parseFloat(fluidVolumeSensitivity.toFixed(4)),
      anemiaSeverity: parseFloat(anemiaSeverity.toFixed(4)),
      macReduction: parseFloat(macReduction.toFixed(4)),
      dangerousDrugsPresent,
      prevCKDWarningLogged,
      prevUremiaPlateletLogged,
      prevHyperKSuxLogged,
      events,
    };
  }
}
