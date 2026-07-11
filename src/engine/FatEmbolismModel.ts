/**
 * Fat Embolism Syndrome (FES) Model
 *
 * FES occurs after release of fat globules into the systemic circulation, most commonly
 * after long bone fractures (femur, tibia), pelvic fractures, or orthopedic procedures
 * involving intramedullary reaming (total hip/knee, intramedullary nail fixation).
 * Incidence: 1-5% after femur fracture; higher with bilateral femur fractures.
 * Subclinical fat embolism is much more common but rarely causes FES.
 *
 * === PATHOPHYSIOLOGY ===
 * Two complementary mechanisms:
 *
 * 1. MECHANICAL OBSTRUCTION:
 *    Fat globules (fat marrow + marrow contents) enter venous circulation via ruptured
 *    marrow sinusoids → travel to pulmonary microvasculature → V/Q mismatch + right
 *    heart strain (similar to but distinct from PE). Some fat crosses patent foramen ovale
 *    or alveolar membrane → systemic fat emboli → cerebral, cutaneous, retinal fat emboli.
 *
 * 2. BIOCHEMICAL INJURY (more important):
 *    Plasma lipase hydrolyzes neutral triglycerides → free fatty acids (FFAs) →
 *    FFAs are toxic to pulmonary endothelium (direct cell membrane damage), induce
 *    inflammatory cytokine release, activate complement → ARDS pattern develops over 12-72h.
 *    Also: thrombocytopenia and coagulopathy from FFA-induced platelet activation.
 *
 * === TIMING ===
 * Symptoms typically appear 12-72h after fracture (delayed, biochemical-driven)
 * In intraoperative settings (reaming, cementation): can be immediate (fat emboli bolus)
 * Peak FES: 24-48h after injury
 *
 * === CLINICAL TRIAD (Gurd's Criteria) ===
 * MAJOR (need 1 major + 4 minor):
 *   - Respiratory insufficiency (PaO2 < 60 mmHg on room air)
 *   - Cerebral dysfunction (confusion, seizures — from cerebral fat emboli)
 *   - Petechial rash (axillae, chest, conjunctivae — pathognomonic, present in 50-60%)
 *
 * MINOR:
 *   - Tachycardia (HR > 110)
 *   - Fever > 38.5°C
 *   - Retinal changes (fat globules in retinal vessels)
 *   - Jaundice
 *   - Renal changes (fat globules in urine = lipuria)
 *   - Anemia / Thrombocytopenia
 *
 * === INTRAOPERATIVE PRESENTATION (BONE CEMENT IMPLANTATION SYNDROME — BCIS) ===
 * Cemented total hip/knee prosthesis → pressurization of medullary canal → fat + marrow
 * emboli enter femoral vein → acute right heart strain → hypotension, hypoxemia, cardiac arrest.
 * Risk: uncemented implants much safer; hybrid (cemented stem, cementless cup) also lower risk.
 * Prevention: irrigate and clean medullary canal before cementation; hypotension protocol.
 *
 * === TREATMENT ===
 * NO specific treatment (unlike PE, no anticoagulation proven). SUPPORTIVE only:
 *   - 100% O2 ± mechanical ventilation (ARDS protocol if severe: LPV with PEEP)
 *   - Methylprednisolone 6-7 mg/kg q6h (controversial; may reduce pulmonary inflammation)
 *   - Hemodynamic support
 *   - Fracture stabilization (IMN vs. external fixation) — reduces ongoing fat emboli
 *   - Monitor for paradoxical CNS fat emboli (cerebral MRI: multiple small T2 hyperintensities)
 *
 * Sources: Pitto RP, J Bone Joint Surg Br 2000; Giannoudis PV, JBJS 2006;
 * Nikolaou VS, Surg Today 2009; Miller's 9th Ed Ch 73 (Orthopedic Anesthesia).
 */

export interface FEMInputs {
  femActive?: boolean;             // fat embolism event active
  femTriggerType?: 'fracture' | 'reaming' | 'cement'; // source mechanism
  minutesSinceOnset?: number;      // for timing the biochemical phase
  hasPFO?: boolean;                // increases cerebral fat embolism risk
  currentPeep?: number;            // cmH2O (PEEP reduces but doesn't eliminate shunt)
  methylprednisoloneCe?: number;   // steroid treatment
  prevFEMOnsetLogged?: boolean;
  prevFEMSevereLogged?: boolean;
}

export interface FEMOutput {
  femActive: boolean;
  minutesSinceOnset: number;
  mechanicalPhaseActive: boolean;   // immediate (minutes to hours)
  biochemicalPhaseActive: boolean;  // delayed (12-72h, ARDS-like)
  shuntContribution: number;        // additive to RespiratoryEngine actualShunt (0-0.35)
  compliancePenaltyFraction: number; // ARDS compliance reduction (0-0.40)
  resistancePenalty: number;        // cmH2O/L/s
  pvr_multiplier: number;           // PVR increase (1.0-2.5 for RV strain)
  steroidsReducingInflammation: number; // 0-0.5 benefit from methylprednisolone
  plateletConsumptionRate: number;  // cells/μL/min (FFA-induced thrombocytopenia)
  prevFEMOnsetLogged: boolean;
  prevFEMSevereLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class FatEmbolismModel {
  static tick(inputs: FEMInputs = {}): FEMOutput {
    const events: string[] = [];
    let prevFEMOnsetLogged = !!inputs.prevFEMOnsetLogged;
    let prevFEMSevereLogged = !!inputs.prevFEMSevereLogged;

    const femActive = !!inputs.femActive;

    if (!femActive) {
      return {
        femActive: false, minutesSinceOnset: 0,
        mechanicalPhaseActive: false, biochemicalPhaseActive: false,
        shuntContribution: 0, compliancePenaltyFraction: 0, resistancePenalty: 0,
        pvr_multiplier: 1.0, steroidsReducingInflammation: 0, plateletConsumptionRate: 0,
        prevFEMOnsetLogged, prevFEMSevereLogged, events,
      };
    }

    const minutesSince = clamp(safeNumber(inputs.minutesSinceOnset, 0), 0, 5000);
    const triggerType = inputs.femTriggerType || 'fracture';
    const hasPFO = !!inputs.hasPFO;
    const peep = clamp(safeNumber(inputs.currentPeep, 5), 0, 25);
    const steroidCe = clamp(safeNumber(inputs.methylprednisoloneCe, 0), 0, 10);

    // ===========================
    // MECHANICAL PHASE (immediate to ~12h)
    // ===========================
    // More prominent with 'cement' and 'reaming' triggers (bolus of fat emboli)
    const mechanicalBolus = triggerType === 'cement' ? 1.0 : triggerType === 'reaming' ? 0.7 : 0.3;
    const mechanicalDuration = triggerType === 'cement' ? 30 : 120; // minutes until partial clearance
    const mechanicalSeverity = minutesSince < mechanicalDuration
      ? mechanicalBolus * Math.min(1.0, minutesSince / 5)
      : mechanicalBolus * Math.max(0, 1.0 - (minutesSince - mechanicalDuration) / mechanicalDuration);
    const mechanicalPhaseActive = mechanicalSeverity > 0.05;

    // ===========================
    // BIOCHEMICAL PHASE (delayed: 12-72h)
    // ===========================
    // FFA-driven inflammation peaks at 24-48h
    const biochemicalOnset = triggerType === 'cement' ? 180 : 720; // minutes to start (3h vs 12h)
    const biochemicalPeak = 1440; // minutes to peak (~24h)
    const biochemicalSeverity = minutesSince > biochemicalOnset
      ? clamp((minutesSince - biochemicalOnset) / (biochemicalPeak - biochemicalOnset), 0, 1.0)
        * Math.max(0, 1.0 - Math.max(0, minutesSince - biochemicalPeak * 2) / biochemicalPeak)
      : 0;
    const biochemicalPhaseActive = biochemicalSeverity > 0.1;

    // ===========================
    // STEROID BENEFIT
    // ===========================
    const steroidsReducingInflammation = steroidCe > 0
      ? clamp(steroidCe / (steroidCe + 1.0) * 0.5, 0, 0.5) // up to 50% reduction in biochemical inflammation
      : 0;

    // ===========================
    // RESPIRATORY EFFECTS
    // ===========================
    // Combined mechanical + biochemical shunt contribution
    const peepBenefit = clamp(peep * 0.02, 0, 0.15); // PEEP reduces shunt somewhat

    const mechanicalShunt = mechanicalSeverity * 0.20;
    const biochemicalShunt = biochemicalSeverity * (1 - steroidsReducingInflammation) * 0.30;
    const shuntContribution = clamp(mechanicalShunt + biochemicalShunt - peepBenefit, 0, 0.35);

    const compliancePenaltyFraction = clamp(
      biochemicalSeverity * (1 - steroidsReducingInflammation) * 0.40, 0, 0.40,
    );
    const resistancePenalty = clamp(biochemicalSeverity * 8 * (1 - steroidsReducingInflammation), 0, 15);

    // ===========================
    // PULMONARY VASCULAR RESISTANCE (right heart strain)
    // ===========================
    const pvr_multiplier = 1.0 + mechanicalSeverity * 0.8 + biochemicalSeverity * 0.4;

    // ===========================
    // COAGULOPATHY (FFA-induced thrombocytopenia)
    // ===========================
    const plateletConsumptionRate = biochemicalSeverity * 200; // cells/μL per min

    // ===========================
    // ONSET EVENT
    // ===========================
    if (!prevFEMOnsetLogged) {
      const triggerMsg = triggerType === 'cement'
        ? 'Bone Cement Implantation Syndrome (BCIS): fat + marrow emboli from medullary pressurization during cementation. BOLUS effect — acute RV strain and hypotension expected within minutes.'
        : triggerType === 'reaming'
        ? 'Intramedullary reaming: fat + marrow contents entering circulation. Watch for immediate mechanical phase and delayed ARDS at 12-48h.'
        : 'Long bone fracture: fat emboli from disrupted marrow sinusoids. Classic FES triad (hypoxemia, confusion, petechiae) typically peaks at 24-48h.';
      events.push(
        `⚠️ FAT EMBOLISM: ${triggerMsg} MONITORING: Serial ABGs (PaO2/FiO2), chest X-ray, ECG (right heart strain pattern), platelet count, mental status. TREATMENT: 100% O2 ± mechanical ventilation (ARDS protocol: TV 6 mL/kg IBW, PEEP 8-12 cmH2O); methylprednisolone 6-7 mg/kg q6h (controversial but commonly used); hemodynamic support. NO anticoagulation (unlike PE). ${hasPFO ? '⚠️ PFO present — elevated risk of PARADOXICAL CEREBRAL FAT EMBOLI → monitor neurological status closely.' : ''}`,
      );
      prevFEMOnsetLogged = true;
    }

    if (biochemicalSeverity > 0.5 && !prevFEMSevereLogged) {
      events.push(
        `🚨 SEVERE FAT EMBOLISM SYNDROME — ARDS PATTERN: Biochemical-phase pulmonary injury peak. P/F ratio likely < 200. Compliance falling (ventilator showing high peak pressures). Right heart strain from elevated PVR. Initiate lung-protective ventilation (TV 4-6 mL/kg IBW, permissive hypercapnia, PEEP 10-14 cmH2O). Prone positioning if P/F < 150. Methylprednisolone if not already started. Assess: cerebral fat emboli (MRI brain), retinal emboli (fundoscopy), lipuria. Platelet count may be dropping.`,
      );
      prevFEMSevereLogged = true;
    }

    return {
      femActive,
      minutesSinceOnset: minutesSince,
      mechanicalPhaseActive,
      biochemicalPhaseActive,
      shuntContribution: parseFloat(shuntContribution.toFixed(4)),
      compliancePenaltyFraction: parseFloat(compliancePenaltyFraction.toFixed(4)),
      resistancePenalty: parseFloat(resistancePenalty.toFixed(2)),
      pvr_multiplier: parseFloat(pvr_multiplier.toFixed(3)),
      steroidsReducingInflammation: parseFloat(steroidsReducingInflammation.toFixed(4)),
      plateletConsumptionRate: parseFloat(plateletConsumptionRate.toFixed(1)),
      prevFEMOnsetLogged,
      prevFEMSevereLogged,
      events,
    };
  }
}
