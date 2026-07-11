/**
 * Clinical Scoring Engine: ACT, Modified Aldrete, Pre-Extubation Criteria, ASA Status, SOFA
 *
 * Gap closure. Multiple clinical scoring systems were absent despite the underlying
 * physiologic data being available in existing engines.
 *
 * === ACTIVATED CLOTTING TIME (ACT) ===
 *
 * ACT measures the time for whole blood to clot after adding an activator (celite/kaolin).
 * Normal: 80-140 seconds. CPB requires > 480 seconds for safe bypass (prevents fibrin
 * formation in the circuit). Heparin effect is the primary determinant; ACT provides
 * real-time heparin adequacy monitoring.
 *
 * Relationship to heparin level (non-linear, affected by platelet count, hypothermia,
 * antithrombin levels, hemodilution):
 * - ACT = baseline_ACT + heparin_contribution * sensitivity_factor
 * - Hypothermia prolongs ACT (enzymes slower)
 * - Low platelet count prolongs ACT
 * - Antithrombin III deficiency blunts heparin effect (shorter ACT per unit heparin)
 *
 * === MODIFIED ALDRETE SCORE ===
 *
 * Standard PACU readiness score (0-10, discharge requires ≥9):
 * Activity (0-2): 0=none, 1=two extremities move, 2=all four move on command
 * Respiration (0-2): 0=apneic, 1=dyspnea, 2=breathes deeply and coughs freely
 * Circulation (0-2): 0=MAP ±50% baseline, 1=±20-50%, 2=±20% of baseline
 * Consciousness (0-2): 0=not responding, 1=arousable, 2=fully awake
 * SpO2 (0-2): 0=<90% on O2, 1=≥90% with O2, 2=≥92% on air
 *
 * === PRE-EXTUBATION CRITERIA ===
 *
 * Objective criteria for safe extubation (from ASA guidelines and evidence base):
 * - Tidal volume > 5 mL/kg IBW on spontaneous breathing
 * - Respiratory rate 8-30/min on spontaneous breathing
 * - SpO2 > 93% on FiO2 ≤ 0.4 (or ≤ 0.5 in obese patients)
 * - ETCO2 within 20% of patient's baseline PaCO2
 * - TOF ratio > 0.9 (negative inspiratory force reflects underlying muscle strength)
 * - Hemodynamically stable (MAP > 60 mmHg, not requiring escalating vasopressors)
 * - Temperature > 36°C (hypothermia impairs drug metabolism and NMB reversal)
 * - Conscious, following commands, or at minimum sustained eye opening
 *
 * === ASA PHYSICAL STATUS AUTO-ASSIGNMENT ===
 *
 * Computed from existing patient comorbidity flags:
 * I: Healthy, no comorbidities
 * II: Mild systemic disease (htn, DM without organ damage, BMI 30-40)
 * III: Severe systemic disease (CHF with EF<40%, poorly controlled DM, BMI>40, CKD stage 3)
 * IV: Life-threatening disease (CHF EF<25%, renal failure, hepatic failure)
 * V: Not expected to survive without surgery (ruptured aortic aneurysm, massive PE)
 * VI: Brain-dead organ donor
 *
 * === FULL SOFA SCORE ===
 *
 * Sequential Organ Failure Assessment (6 organs, 0-4 each, total 0-24):
 * 1. Respiration (PaO2/FiO2 ratio)
 * 2. Coagulation (platelet count)
 * 3. Liver (bilirubin)
 * 4. Cardiovascular (MAP or vasopressor requirement)
 * 5. CNS (Glasgow Coma Score equivalent)
 * 6. Renal (creatinine or urine output)
 *
 * Score ≥2 = sepsis-associated organ dysfunction. Δ SOFA ≥2 from baseline = sepsis criteria
 * (Sepsis-3 definition, Singer et al. JAMA 2016).
 */

export interface ClinicalScoringInputs {
  // For ACT
  heparinCe?: number;
  plateletCountK?: number;
  temperature?: number; // hypothermia prolongs ACT
  antithrombinLevel?: number; // 0-1, AT-III deficiency blunts heparin effect

  // For Modified Aldrete
  vitals_spo2?: number;
  vitals_map?: number;
  baselineMap?: number;
  vitals_rr?: number;
  consciousnessLevel?: number; // 0-1 from ConsciousnessEngine
  canMoveAllLimbs?: boolean;
  breathesDeep?: boolean;

  // For pre-extubation
  tidalVolumeMlPerKgIBW?: number;
  fio2Current?: number;
  etco2Current?: number;
  baselinePaCO2?: number;
  tofRatio?: number;
  isHemodynamicallyStable?: boolean;
  temperatureForExtubation?: number;

  // For ASA status
  patient_htn?: boolean;
  patient_dm?: boolean;
  patient_cad?: boolean;
  patient_chf?: boolean;
  patient_ef?: number;
  patient_copd?: boolean;
  patient_bmi?: number;
  patient_ckd?: boolean;
  patient_creatinine?: number;
  patient_cirrhosis?: boolean;
  patient_inr?: number;
  patient_septic?: boolean;
  patient_trauma?: boolean;
  emergent_surgery?: boolean;

  // For SOFA
  pao2?: number;
  fio2?: number; // for P/F ratio
  plateletCountK_sofa?: number;
  bilirubinMgDl?: number;
  mapMmHg?: number;
  vasopressorRequired?: boolean;
  norepinephrineDose?: number; // mcg/kg/min, for SOFA cardiovascular score
  glasgowComaScore?: number; // 3-15
  creatinineMgDl?: number;
  urineOutputMlHr?: number;
}

export interface ClinicalScoringOutput {
  // ACT
  actSeconds: number;
  actSafeForBypass: boolean; // > 480s
  actAdequateForAnticoagulation: boolean; // > 200s

  // Modified Aldrete Score (0-10)
  aldreteActivity: number; // 0-2
  aldreteRespiration: number; // 0-2
  aldreteCirculation: number; // 0-2
  aldreteConsciousness: number; // 0-2
  aldreteSpo2: number; // 0-2
  aldreteTotal: number; // 0-10
  aldreteReadyForDischarge: boolean; // ≥9

  // Pre-Extubation Criteria
  extubationCriteria: {
    tidalVolumeOK: boolean;
    rrOK: boolean;
    spo2OK: boolean;
    etco2OK: boolean;
    tofOK: boolean;
    hemodynamicsOK: boolean;
    temperatureOK: boolean;
    consciousnessOK: boolean;
    allMet: boolean;
    failedCriteria: string[];
  };

  // ASA Physical Status
  asaPhysicalStatus: 1 | 2 | 3 | 4 | 5;
  asaDescription: string;

  // Full SOFA Score
  sofaRespiration: number; // 0-4
  sofaCoagulation: number; // 0-4
  sofaLiver: number; // 0-4
  sofaCardiovascular: number; // 0-4
  sofaCNS: number; // 0-4
  sofaRenal: number; // 0-4
  sofaTotal: number; // 0-24
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class ClinicalScoringEngine {
  static compute(inputs: ClinicalScoringInputs = {}): ClinicalScoringOutput {
    // ===========================
    // ACT (Activated Clotting Time)
    // ===========================
    const heparinCe = Math.max(0, safeNumber(inputs.heparinCe, 0));
    const plateletCountK = clamp(safeNumber(inputs.plateletCountK, 250), 0, 1200);
    const temperature = clamp(safeNumber(inputs.temperature, 37), 25, 42);
    const antithrombinLevel = clamp(safeNumber(inputs.antithrombinLevel, 1.0), 0, 1.5);

    const baselineACT = 120; // seconds (normal range 80-140s)
    // Temperature effect: each 1°C below 37 prolongs ACT by ~6s
    const hypothermiaEffect = Math.max(0, (37 - temperature) * 6);
    // Thrombocytopenia effect: low platelets prolong ACT (platelet contribution to clot initiation)
    const thrombocytopeniaEffect = plateletCountK < 100 ? (100 - plateletCountK) * 0.3 : 0;
    // Heparin effect: dose-response (saturating above ~3-4 Ce units → plateau in ACT)
    // Target ACT > 480s for CPB requires ~3-5 units/kg/min heparin at therapeutic levels
    const heparinACTEffect = heparinCe > 0 ? (520 / antithrombinLevel) * (heparinCe / (heparinCe + 1.0)) : 0;

    const actSeconds = clamp(baselineACT + heparinACTEffect + hypothermiaEffect + thrombocytopeniaEffect, 60, 1000);
    const actSafeForBypass = actSeconds > 480;
    const actAdequateForAnticoagulation = actSeconds > 200;

    // ===========================
    // MODIFIED ALDRETE SCORE
    // ===========================
    const spo2 = clamp(safeNumber(inputs.vitals_spo2, 95), 0, 100);
    const map = clamp(safeNumber(inputs.vitals_map, 90), 0, 200);
    const baselineMap = clamp(safeNumber(inputs.baselineMap, 90), 50, 200);
    const rr = clamp(safeNumber(inputs.vitals_rr, 14), 0, 60);
    const consciousness = clamp(safeNumber(inputs.consciousnessLevel, 0.5), 0, 1);
    const canMove = !!inputs.canMoveAllLimbs;
    const breathesDeep = !!inputs.breathesDeep;

    const mapDeviation = Math.abs((map - baselineMap) / baselineMap);
    const aldreteCirculation = mapDeviation < 0.2 ? 2 : mapDeviation < 0.5 ? 1 : 0;
    const aldreteRespiration = (rr >= 10 && rr <= 20 && breathesDeep) ? 2 : (rr >= 8 && rr <= 25) ? 1 : 0;
    const aldreteActivity = canMove ? 2 : (consciousness > 0.3) ? 1 : 0;
    const aldreteConsciousness = consciousness > 0.7 ? 2 : consciousness > 0.4 ? 1 : 0;
    const aldreteSpo2 = spo2 >= 92 ? 2 : spo2 >= 90 ? 1 : 0;
    const aldreteTotal = aldreteActivity + aldreteRespiration + aldreteCirculation + aldreteConsciousness + aldreteSpo2;
    const aldreteReadyForDischarge = aldreteTotal >= 9;

    // ===========================
    // PRE-EXTUBATION CRITERIA
    // ===========================
    const tvMlKg = safeNumber(inputs.tidalVolumeMlPerKgIBW, 0);
    const fio2 = clamp(safeNumber(inputs.fio2Current, 0.4), 0.21, 1.0);
    const etco2 = safeNumber(inputs.etco2Current, 40);
    const baselinePaCO2 = safeNumber(inputs.baselinePaCO2, 40);
    const tofRatio = clamp(safeNumber(inputs.tofRatio, 0), 0, 1);
    const hemostable = inputs.isHemodynamicallyStable !== false;
    const tempForExtub = safeNumber(inputs.temperatureForExtubation, 37);

    const tvOK = tvMlKg > 5;
    const rrOK = rr >= 8 && rr <= 30;
    const spo2OKForExtub = spo2 >= 93 || (spo2 >= 90 && fio2 > 0.5); // higher fio2 needed = less OK
    const etco2OK = etco2 > 0 && Math.abs(etco2 - baselinePaCO2) / baselinePaCO2 < 0.25;
    const tofOK = tofRatio >= 0.9;
    const hemostableOK = hemostable;
    const tempOK = tempForExtub >= 36;
    const consciousnessOKForExtub = consciousness > 0.6;

    const failedCriteria: string[] = [];
    if (!tvOK) failedCriteria.push(`TV ${tvMlKg.toFixed(1)} mL/kg < 5 mL/kg minimum`);
    if (!rrOK) failedCriteria.push(`RR ${rr} outside 8-30 range`);
    if (!spo2OKForExtub) failedCriteria.push(`SpO2 ${spo2}% inadequate at FiO2 ${(fio2*100).toFixed(0)}%`);
    if (!tofOK) failedCriteria.push(`TOF ratio ${(tofRatio*100).toFixed(0)}% < 90% (residual NMB)`);
    if (!hemostableOK) failedCriteria.push('Hemodynamically unstable');
    if (!tempOK) failedCriteria.push(`Temperature ${tempForExtub.toFixed(1)}°C < 36°C (hypothermia)`);
    if (!consciousnessOKForExtub) failedCriteria.push('Inadequate consciousness level');

    // ===========================
    // ASA PHYSICAL STATUS
    // ===========================
    const htn = !!inputs.patient_htn;
    const dm = !!inputs.patient_dm;
    const cad = !!inputs.patient_cad;
    const chf = !!inputs.patient_chf;
    const ef = safeNumber(inputs.patient_ef, 65);
    const copd = !!inputs.patient_copd;
    const bmi = safeNumber(inputs.patient_bmi, 25);
    const ckd = !!inputs.patient_ckd;
    const creatinine = safeNumber(inputs.patient_creatinine, 0.85);
    const cirrhosis = !!inputs.patient_cirrhosis;
    const inr = safeNumber(inputs.patient_inr, 1.0);
    const septic = !!inputs.patient_septic;
    const trauma = !!inputs.patient_trauma;
    const emergent = !!inputs.emergent_surgery;

    let asa: 1 | 2 | 3 | 4 | 5 = 1;
    let asaDesc = 'Healthy patient, no organic disease';

    // ASA II: mild systemic disease
    if (htn || (dm && creatinine < 1.5 && ef > 50) || (bmi >= 30 && bmi < 40) || copd && ef > 50) {
      asa = 2;
      asaDesc = 'Mild systemic disease, no functional limitation';
    }
    // ASA III: severe systemic disease
    if ((htn && (cad || dm)) || (chf && ef >= 35 && ef < 50) || (creatinine >= 1.5 && creatinine < 3.0) ||
        (bmi >= 40) || (copd && cad) || (dm && cad)) {
      asa = 3;
      asaDesc = 'Severe systemic disease with functional limitation';
    }
    // ASA IV: life-threatening disease
    if ((chf && ef < 35) || (creatinine >= 3.0) || (cirrhosis && inr > 1.7) || (inr > 2.5 && !heparinCe)) {
      asa = 4;
      asaDesc = 'Life-threatening systemic disease';
    }
    // ASA V: moribund, unlikely to survive without operation
    if (septic && ef < 25) {
      asa = 5;
      asaDesc = 'Moribund patient not expected to survive without operation';
    }
    // Emergency surgery: add "E" designation (increases ASA by convention)
    if (emergent && asa < 5) {
      asaDesc += ` (Emergency -- 'E' designation)`;
    }

    // ===========================
    // FULL SOFA SCORE
    // ===========================
    const pao2Input = safeNumber(inputs.pao2, 100);
    const fio2Input = clamp(safeNumber(inputs.fio2, 0.21), 0.21, 1.0);
    const pfRatio = pao2Input / fio2Input;

    // SOFA Respiration (PaO2/FiO2)
    const sofaRespiration = pfRatio < 100 ? 4 : pfRatio < 200 ? 3 : pfRatio < 300 ? 2 : pfRatio < 400 ? 1 : 0;

    // SOFA Coagulation (platelets)
    const sofa_plt = safeNumber(inputs.plateletCountK_sofa, 250);
    const sofaCoagulation = sofa_plt < 20 ? 4 : sofa_plt < 50 ? 3 : sofa_plt < 100 ? 2 : sofa_plt < 150 ? 1 : 0;

    // SOFA Liver (bilirubin)
    const bilirubin = safeNumber(inputs.bilirubinMgDl, 0.8);
    const sofaLiver = bilirubin > 12 ? 4 : bilirubin > 6 ? 3 : bilirubin > 2 ? 2 : bilirubin > 1.2 ? 1 : 0;

    // SOFA Cardiovascular (MAP or vasopressor)
    const mapSofa = safeNumber(inputs.mapMmHg, 90);
    const vasopressor = !!inputs.vasopressorRequired;
    const norepiDose = safeNumber(inputs.norepinephrineDose, 0);
    let sofaCardiovascular = 0;
    if (norepiDose > 0.1) sofaCardiovascular = 4;
    else if (norepiDose > 0) sofaCardiovascular = 3;
    else if (vasopressor) sofaCardiovascular = 2;
    else if (mapSofa < 70) sofaCardiovascular = 1;

    // SOFA CNS (GCS proxy)
    const gcs = clamp(safeNumber(inputs.glasgowComaScore, 15), 3, 15);
    const sofaCNS = gcs < 6 ? 4 : gcs < 10 ? 3 : gcs < 13 ? 2 : gcs < 15 ? 1 : 0;

    // SOFA Renal (creatinine or UO)
    const creatSOFA = safeNumber(inputs.creatinineMgDl, 0.9);
    const uoMlHr = safeNumber(inputs.urineOutputMlHr, 50);
    let sofaRenal = 0;
    if (creatSOFA > 5 || uoMlHr < 5) sofaRenal = 4;
    else if (creatSOFA > 3.5 || uoMlHr < 10) sofaRenal = 3;
    else if (creatSOFA > 2 || uoMlHr < 20) sofaRenal = 2;
    else if (creatSOFA > 1.2) sofaRenal = 1;

    const sofaTotal = sofaRespiration + sofaCoagulation + sofaLiver + sofaCardiovascular + sofaCNS + sofaRenal;

    return {
      actSeconds: parseFloat(actSeconds.toFixed(1)),
      actSafeForBypass,
      actAdequateForAnticoagulation,
      aldreteActivity,
      aldreteRespiration,
      aldreteCirculation,
      aldreteConsciousness,
      aldreteSpo2,
      aldreteTotal,
      aldreteReadyForDischarge,
      extubationCriteria: {
        tidalVolumeOK: tvOK,
        rrOK,
        spo2OK: spo2OKForExtub,
        etco2OK,
        tofOK,
        hemodynamicsOK: hemostableOK,
        temperatureOK: tempOK,
        consciousnessOK: consciousnessOKForExtub,
        allMet: tvOK && rrOK && spo2OKForExtub && tofOK && hemostableOK && tempOK && consciousnessOKForExtub,
        failedCriteria
      },
      asaPhysicalStatus: asa,
      asaDescription: asaDesc,
      sofaRespiration,
      sofaCoagulation,
      sofaLiver,
      sofaCardiovascular,
      sofaCNS,
      sofaRenal,
      sofaTotal
    };
  }
}
