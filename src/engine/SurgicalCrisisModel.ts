/**
 * Surgical Crisis Model: Carcinoid Crisis, Pheochromocytoma Crisis, Negative-Pressure
 * Pulmonary Edema, and Masseter Muscle Rigidity
 *
 * Gap closure. Four specific perioperative crises with zero prior representation:
 *
 * === CARCINOID CRISIS ===
 * During surgical manipulation of carcinoid tumor → sudden release of vasoactive amines
 * (serotonin, bradykinin, histamine, tachykinins) → severe flushing, bronchospasm,
 * profound hypotension OR hypertension. ONLY TREATMENT: octreotide (blocks release).
 * Standard vasopressors/antihistamines are ineffective against carcinoid mediators.
 *
 * === PHEOCHROMOCYTOMA INTRAOPERATIVE CRISIS ===
 * Surgeon touches adrenal tumor → massive NE/E release → hypertensive crisis (MAP 200+)
 * → after tumor ligation → sudden hypotension from catecholamine withdrawal.
 * The existing PreOpEMR has pheo assessment but not the intraoperative crisis mechanism.
 * Treatment: phentolamine/nicardipine/nitroprusside for hypertensive phase;
 * vasopressors for post-ligation hypotension.
 *
 * === NEGATIVE-PRESSURE PULMONARY EDEMA (NPPE) ===
 * After acute airway obstruction (laryngospasm, biting ETT, croup): forced inspiratory
 * effort against closed glottis generates extreme negative intrathoracic pressure
 * (-40 to -100 cmH2O vs normal -5 to -10 cmH2O) → fluid shifts from pulmonary capillaries
 * to alveoli → non-cardiogenic pulmonary edema. Occurs within minutes of obstruction.
 * PCWP is NORMAL (distinguishes from cardiogenic edema).
 * Treatment: 100% O2, CPAP/PEEP, may require brief intubation. Usually resolves in hours.
 *
 * === MASSETER MUSCLE RIGIDITY (MMR) ===
 * After succinylcholine in MH-susceptible patients: instead of fasciculations + relaxation,
 * masseter muscle clenches rigidly. Often the FIRST SIGN of MH. Currently MH is modeled
 * but the specific MMR presentation wasn't a discrete clinical finding.
 *
 * Source: Bhattacharyya S et al. Heart 2016 (carcinoid crisis); Naranjo J et al.
 * Anesthesiology 2017 (pheo crisis management); Deepika K et al. Anesth Analg 1999 (NPPE).
 */

export interface SurgicalCrisisInputs {
  // Carcinoid crisis
  carcinoidTumorPresent?: boolean;
  surgeonManipulatingTumor?: boolean; // triggers release during manipulation
  octreotideCe?: number; // treatment
  prevCarcinoidCrisisLogged?: boolean;

  // Pheochromocytoma crisis
  pheoPresent?: boolean;
  pheoBlockadeAdequate?: boolean; // preoperative alpha-blockade (phenoxybenzamine etc.)
  surgeonTouchingAdrenal?: boolean; // triggers catecholamine storm
  tumorLigated?: boolean; // after ligation: withdrawal hypotension
  phentolamineCe?: number;
  nitroprussideCe?: number;
  prevPheoCrisisLogged?: boolean;
  prevPheoHypotensionLogged?: boolean;

  // Negative pressure pulmonary edema
  laryngospasmOccurred?: boolean; // or biting ETT, complete upper airway obstruction
  minutesSinceLaryngospasm?: number;
  prevNPPELogged?: boolean;

  // Masseter muscle rigidity
  succinylcholineGivenToMHSusceptible?: boolean; // sux + MH susceptible patient
  prevMMRLogged?: boolean;
}

export interface SurgicalCrisisOutput {
  // Carcinoid
  carcinoidCrisisActive: boolean;
  carcinoidSVRMod: number; // can be positive (hypertension subtype) or negative (hypotension)
  carcinoidBronchospasmActive: boolean;
  octreotideEfficacy: number; // 0-1

  // Pheo
  pheoHypertensiveCrisisActive: boolean;
  pheoHypotensionActive: boolean;
  pheoSVRSpike: number;
  pheoHypotensionSVRDrop: number;

  // NPPE
  nppePulmonaryEdemaActive: boolean;
  nppeCompliancePenalty: number; // cmH2O additional negative compliance penalty
  nppeResistancePenalty: number;

  // MMR
  masseterRigidityActive: boolean;

  prevCarcinoidCrisisLogged: boolean;
  prevPheoCrisisLogged: boolean;
  prevPheoHypotensionLogged: boolean;
  prevNPPELogged: boolean;
  prevMMRLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class SurgicalCrisisModel {
  static tick(inputs: SurgicalCrisisInputs = {}): SurgicalCrisisOutput {
    const events: string[] = [];

    let prevCarcinoidCrisisLogged = !!inputs.prevCarcinoidCrisisLogged;
    let prevPheoCrisisLogged = !!inputs.prevPheoCrisisLogged;
    let prevPheoHypotensionLogged = !!inputs.prevPheoHypotensionLogged;
    let prevNPPELogged = !!inputs.prevNPPELogged;
    let prevMMRLogged = !!inputs.prevMMRLogged;

    // ===========================
    // CARCINOID CRISIS
    // ===========================
    const carcinoidPresent = !!inputs.carcinoidTumorPresent;
    const tumorManipulation = !!inputs.surgeonManipulatingTumor;
    const octreotideCe = Math.max(0, safeNumber(inputs.octreotideCe, 0));

    const octreotideEfficacy = octreotideCe > 0 ? clamp(octreotideCe / (octreotideCe + 0.5), 0, 0.95) : 0;
    const carcinoidCrisisActive = carcinoidPresent && tumorManipulation && octreotideEfficacy < 0.8;

    let carcinoidSVRMod = 0;
    let carcinoidBronchospasmActive = false;

    if (carcinoidCrisisActive) {
      // Carcinoid crisis can present as HYPOTENSION (serotonin/bradykinin-mediated vasodilation)
      // OR HYPERTENSION (rare, when NE-secreting carcinoids). Assume classic hypotensive subtype.
      carcinoidSVRMod = -0.5 * (1 - octreotideEfficacy);
      carcinoidBronchospasmActive = true;

      if (!prevCarcinoidCrisisLogged) {
        events.push("🚨 CRITICAL EMERGENCY: CARCINOID CRISIS from tumor manipulation! Profound hypotension, flushing, bronchospasm from vasoactive amine release (serotonin, bradykinin, histamine). OCTREOTIDE 100-500 mcg IV BOLUS is the ONLY treatment -- antihistamines, vasopressors, and bronchodilators are largely ineffective against carcinoid mediators. Administer octreotide NOW. If not already started, begin octreotide infusion (50 mcg/hr) before further tumor manipulation.");
        prevCarcinoidCrisisLogged = true;
      }
    } else if (!carcinoidCrisisActive && prevCarcinoidCrisisLogged) {
      prevCarcinoidCrisisLogged = false;
    }

    // ===========================
    // PHEOCHROMOCYTOMA CRISIS
    // ===========================
    const pheoPresent = !!inputs.pheoPresent;
    const blockadeAdequate = !!inputs.pheoBlockadeAdequate;
    const touchingAdrenal = !!inputs.surgeonTouchingAdrenal;
    const tumorLigated = !!inputs.tumorLigated;
    const phentolamineCe = Math.max(0, safeNumber(inputs.phentolamineCe, 0));

    // Hypertensive crisis: touching tumor → catecholamine storm, worse without adequate preoperative alpha-blockade
    const pheoHypertensiveRisk = pheoPresent && touchingAdrenal;
    const blockadeProtection = blockadeAdequate ? 0.7 : 0;
    const phentolamineControl = phentolamineCe > 0 ? phentolamineCe / (phentolamineCe + 0.5) * 0.8 : 0;
    const pheoHypertensiveCrisisActive = pheoHypertensiveRisk && (blockadeProtection + phentolamineControl) < 0.8;

    // SVR spike from catecholamine storm
    const pheoSVRSpike = pheoHypertensiveCrisisActive ? 500 * (1 - blockadeProtection - phentolamineControl) : 0;

    if (pheoHypertensiveCrisisActive && !prevPheoCrisisLogged) {
      events.push("🚨 CRITICAL EMERGENCY: PHEOCHROMOCYTOMA HYPERTENSIVE CRISIS from tumor manipulation! Massive catecholamine release → MAP may exceed 200 mmHg → intracerebral hemorrhage, MI risk. Treatment: PHENTOLAMINE 2-5mg IV bolus (alpha-blocker); or nicardipine infusion; or nitroprusside. Avoid beta-blockers alone (worsens hypertension by unmasking alpha-mediated vasoconstriction). Ensure adequate alpha-blockade before any further surgical manipulation.");
      prevPheoCrisisLogged = true;
    }

    // Post-ligation hypotension: tumor removed → catecholamines gone → adrenergic receptors
    // downregulated from chronic exposure → profound hypotension
    const pheoHypotensionActive = pheoPresent && tumorLigated && !blockadeAdequate;
    const pheoHypotensionSVRDrop = pheoHypotensionActive ? -0.4 : 0;

    if (pheoHypotensionActive && !prevPheoHypotensionLogged) {
      events.push("⚠️ CLINICAL ALERT: POST-LIGATION PHEOCHROMOCYTOMA HYPOTENSION. Tumor removal → sudden catecholamine withdrawal → vasoplegic shock from downregulated adrenergic receptors. Aggressively fluid load. Vasopressors (norepinephrine preferred). Steroid supplementation (adrenal insufficiency possible from contralateral adrenal suppression). May require sustained vasopressor support for 24-48h.");
      prevPheoHypotensionLogged = true;
    }

    // ===========================
    // NEGATIVE-PRESSURE PULMONARY EDEMA
    // ===========================
    const laryngospasm = !!inputs.laryngospasmOccurred;
    const minutesSince = Math.max(0, safeNumber(inputs.minutesSinceLaryngospasm, 0));

    // NPPE typically develops within minutes of laryngospasm/obstruction event
    // Peak at 30-60 min, usually resolves in 2-6h
    const nppeActive = laryngospasm && minutesSince > 2 && minutesSince < 360;
    const nppeSeverity = nppeActive ? Math.max(0, Math.min(1, (minutesSince - 2) / 30)) : 0;

    const nppePulmonaryEdemaActive = nppeSeverity > 0.2;
    const nppeCompliancePenalty = nppePulmonaryEdemaActive ? -20 * nppeSeverity : 0;
    const nppeResistancePenalty = nppePulmonaryEdemaActive ? 8 * nppeSeverity : 0;

    if (nppePulmonaryEdemaActive && !prevNPPELogged) {
      events.push("🚨 CLINICAL ALERT: Negative-Pressure Pulmonary Edema (NPPE) following laryngospasm/airway obstruction. Forced inspiration against closed glottis generated extreme negative intrathoracic pressure → non-cardiogenic pulmonary edema. Signs: progressive hypoxia, pink frothy secretions, decreased compliance. PCWP is NORMAL (non-cardiogenic). Treatment: 100% O2, CPAP/PEEP 5-10 cmH2O, consider re-intubation if severe. Usually resolves in 2-6 hours with supportive care.");
      prevNPPELogged = true;
    }
    if (!nppePulmonaryEdemaActive && prevNPPELogged && minutesSince > 120) {
      prevNPPELogged = false;
    }

    // ===========================
    // MASSETER MUSCLE RIGIDITY
    // ===========================
    const mhSuxRigidity = !!inputs.succinylcholineGivenToMHSusceptible;
    const masseterRigidityActive = mhSuxRigidity;

    if (masseterRigidityActive && !prevMMRLogged) {
      events.push("🚨 CRITICAL: MASSETER MUSCLE RIGIDITY (MMR) after succinylcholine in a potentially MH-susceptible patient! Jaw muscles clench instead of relaxing -- this is often the FIRST SIGN of Malignant Hyperthermia. Evaluate: can you intubate? If yes, proceed with caution; monitor EtCO2, temperature, blood gases closely. If MH features develop (rising EtCO2, temperature, metabolic acidosis, rigidity progressing to generalized): DANTROLENE IMMEDIATELY (2.5 mg/kg IV). Cancel elective case. Notify MH hotline.");
      prevMMRLogged = true;
    }

    return {
      carcinoidCrisisActive,
      carcinoidSVRMod: parseFloat(carcinoidSVRMod.toFixed(4)),
      carcinoidBronchospasmActive,
      octreotideEfficacy: parseFloat(octreotideEfficacy.toFixed(4)),
      pheoHypertensiveCrisisActive,
      pheoHypotensionActive,
      pheoSVRSpike: parseFloat(pheoSVRSpike.toFixed(1)),
      pheoHypotensionSVRDrop: parseFloat(pheoHypotensionSVRDrop.toFixed(4)),
      nppePulmonaryEdemaActive,
      nppeCompliancePenalty: parseFloat(nppeCompliancePenalty.toFixed(2)),
      nppeResistancePenalty: parseFloat(nppeResistancePenalty.toFixed(2)),
      masseterRigidityActive,
      prevCarcinoidCrisisLogged,
      prevPheoCrisisLogged,
      prevPheoHypotensionLogged,
      prevNPPELogged,
      prevMMRLogged,
      events
    };
  }
}
