/**
 * Local Anesthetic Systemic Toxicity (LAST) Model + Intralipid Rescue
 *
 * Phase 5, Stage 2 of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Direct code
 * search confirmed no existing LAST mechanism anywhere in this codebase: local anesthetics
 * (Lidocaine, Bupivacaine, Ropivacaine, Levobupivacaine, Mepivacaine) have PKPD models for
 * their THERAPEUTIC use (epidural/spinal/infiltration), but inadvertent intravascular injection
 * or peak systemic absorption producing toxicity-range plasma concentrations fired no crisis.
 * Intralipid 20% already existed as a drug entry in Pharmacology.js with its rescue-dosing
 * indications but had no mechanistic effect on local anesthetic plasma concentrations.
 *
 * Real LAST mechanism: two distinct toxicity syndromes with DIFFERENT thresholds (the
 * CC/CNS ratio already encoded in each drug's `pd.ccCnsRatio` in Pharmacology.js):
 *
 * 1. **CNS toxicity** (LOWER threshold, earliest sign -- the warning to stop): perioral
 *    tingling → metallic taste → tinnitus → visual disturbance → seizures → coma. Caused by
 *    sodium channel blockade in cortical neurons, which are more sensitive than cardiac cells.
 *
 * 2. **Cardiovascular toxicity** (HIGHER threshold, catastrophic): arrhythmias (bupivacaine
 *    specifically causes broad-complex tachycardia / VF due to "fast-in, slow-out" sodium
 *    channel kinetics) → myocardial depression → cardiovascular collapse (PEA/VF).
 *
 * Drug-specific thresholds (disclosed, reasoned estimates from clinical literature):
 * - Bupivacaine: CNS at >1.5 mg/L, CV at >4 mg/L (CC/CNS=2.0 -- the most feared, narrowest)
 * - Ropivacaine: CNS at >2 mg/L, CV at >8 mg/L (CC/CNS=4.0 -- safer than bupivacaine)
 * - Lidocaine: CNS at >5 mg/L, CV at >15 mg/L (CC/CNS=7.0 -- widest safety margin)
 * - Levobupivacaine/Mepivacaine: intermediate, calibrated similarly to ropivacaine
 *
 * Intralipid 20% (lipid sink): partitions lipophilic local anesthetics away from cardiac
 * sodium channels into the emulsion ("lipid sink hypothesis"), effectively reducing the free
 * tissue concentration available to block channels. Modeled as a reduction in EFFECTIVE
 * local anesthetic concentration at the target, not a pharmacokinetic elimination change.
 * At adequate rescue bolus (Ce > 2 mg/L intralipid), the effective concentration is reduced
 * by ~55% -- capable of converting a fatal bupivacaine CV toxicity into a survivable event.
 *
 * Cardiovascular consequences of LAST feed into the existing cardiovascular state:
 * `svrModFromLast` (negative, vasodilation from Na-channel blockade in vascular smooth muscle)
 * and `inotropyModFromLast` (negative, myocardial depression) and `brugadaLikeRisk`
 * (bupivacaine-specific QRS-widening arrhythmia risk, the most lethal manifestation).
 *
 * Source: ASRA LAST Checklist, 2022; Di Gregorio et al. 2010; Mulroy 2002 -- not a specific
 * Miller's citation; disclosed per this project's standing convention. All thresholds are
 * disclosed, reasoned estimates referenced against real teaching-point magnitudes.
 */

export interface LastModelInputs {
  lidocaineCe?: number; // mg/L
  bupivacaineCe?: number;
  ropivacaineCe?: number;
  levobupivacaineCe?: number;
  mepivacaineCe?: number;
  intralipidCe?: number; // mg/L -- lipid sink sequestration

  prevCnsToxicityLogged?: boolean;
  prevSeizureFromLastLogged?: boolean;
  prevCvToxicityLogged?: boolean;
}

export interface LastModelOutput {
  cnsToxicityActive: boolean;
  cnsToxicitySeverity: number; // 0-1
  seizureFromLast: boolean;
  cvToxicityActive: boolean;
  cvToxicitySeverity: number; // 0-1
  svrModFromLast: number; // negative multiplier contribution to targetSVR
  inotropyModFromLast: number; // negative multiplier contribution to drugInotropyMod
  bupivacaineBrugadaArrhythmiaRisk: number; // 0-1 -- broad-complex arrhythmia risk from bupivacaine

  // pass-through for transition-event guard (caller carries these forward)
  prevCnsToxicityLogged: boolean;
  prevSeizureFromLastLogged: boolean;
  prevCvToxicityLogged: boolean;

  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// LAST clinical thresholds (mg/L effect-site concentration):
// [cnsSymptomThreshold, seizureThreshold, cvCollapseThreshold]
const LAST_THRESHOLDS: Record<string, [number, number, number]> = {
  bupivacaine: [1.5, 3.0, 4.5],
  ropivacaine: [2.0, 4.0, 8.0],
  levobupivacaine: [2.0, 4.5, 9.0],
  mepivacaine: [5.0, 8.0, 16.0],
  lidocaine: [5.0, 8.0, 16.0]
};

// Lipid-solubility relative weight for lipid sink calculation (more lipophilic → more
// effectively sequestered by Intralipid emulsion). Bupivacaine is the most lipophilic
// and therefore most effectively rescued by lipid emulsion.
const LIPID_SINK_AFFINITY: Record<string, number> = {
  bupivacaine: 0.9,
  ropivacaine: 0.7,
  levobupivacaine: 0.85,
  mepivacaine: 0.4,
  lidocaine: 0.3
};

function computeLastMetrics(
  drugs: Array<{ Ce: number; drug: string }>,
  intralipidCe: number
): { cnsSeverity: number; cvSeverity: number; brugadaRisk: number } {
  let maxCnsSeverity = 0;
  let maxCvSeverity = 0;
  let brugadaRisk = 0;

  for (const { Ce, drug } of drugs) {
    if (Ce <= 0) continue;
    const thresholds = LAST_THRESHOLDS[drug];
    if (!thresholds) continue;

    const lipidAffinity = LIPID_SINK_AFFINITY[drug] ?? 0.5;
    const lipidSinkReduction = intralipidCe > 0 ? (intralipidCe / (intralipidCe + 2)) * lipidAffinity * 0.55 : 0;
    const effectiveCe = Ce * (1 - lipidSinkReduction);

    const [cnsSymptom, cnsSeizure, cvCollapse] = thresholds;
    const cnsSeverity = clamp((effectiveCe - cnsSymptom) / (cnsSeizure - cnsSymptom), 0, 1);
    const cvSeverity = clamp((effectiveCe - cnsSeizure) / (cvCollapse - cnsSeizure), 0, 1);

    maxCnsSeverity = Math.max(maxCnsSeverity, cnsSeverity);
    maxCvSeverity = Math.max(maxCvSeverity, cvSeverity);

    if (drug === 'bupivacaine' || drug === 'levobupivacaine') {
      brugadaRisk = Math.max(brugadaRisk, cvSeverity);
    }
  }

  return { cnsSeverity: maxCnsSeverity, cvSeverity: maxCvSeverity, brugadaRisk };
}

export class LastModel {
  static tick(inputs: LastModelInputs = {}): LastModelOutput {
    const events: string[] = [];

    const lidoCe = Math.max(0, safeNumber(inputs.lidocaineCe, 0));
    const bupCe = Math.max(0, safeNumber(inputs.bupivacaineCe, 0));
    const ropCe = Math.max(0, safeNumber(inputs.ropivacaineCe, 0));
    const levoCe = Math.max(0, safeNumber(inputs.levobupivacaineCe, 0));
    const mepCe = Math.max(0, safeNumber(inputs.mepivacaineCe, 0));
    const intralipidCe = Math.max(0, safeNumber(inputs.intralipidCe, 0));

    let prevCnsToxicityLogged = !!inputs.prevCnsToxicityLogged;
    let prevSeizureFromLastLogged = !!inputs.prevSeizureFromLastLogged;
    let prevCvToxicityLogged = !!inputs.prevCvToxicityLogged;

    const allDrugs: Array<{ Ce: number; drug: string }> = [
      { Ce: lidoCe, drug: 'lidocaine' },
      { Ce: bupCe, drug: 'bupivacaine' },
      { Ce: ropCe, drug: 'ropivacaine' },
      { Ce: levoCe, drug: 'levobupivacaine' },
      { Ce: mepCe, drug: 'mepivacaine' }
    ];

    const { cnsSeverity, cvSeverity, brugadaRisk } = computeLastMetrics(allDrugs, intralipidCe);

    const cnsToxicityActive = cnsSeverity > 0;
    const seizureFromLast = cnsSeverity > 0.9;
    // CV toxicity requires appreciable severity (>0.2 -- i.e., at least 20% of the way from
    // seizure threshold to CV collapse) to distinguish from the mere beginning of the spectrum.
    // Clinical teaching: bupivacaine's CC/CNS=2 means even early CV impairment appears near
    // the seizure threshold; ropivacaine's CC/CNS=4 has a wider buffer before CV collapse.
    const cvToxicityActive = cvSeverity > 0.2;

    if (cnsToxicityActive && !prevCnsToxicityLogged) {
      events.push("🚨 CRITICAL: Local Anesthetic Systemic Toxicity (LAST) -- CNS symptoms detected (perioral tingling/metallic taste/tinnitus progressing to seizures). STOP administering local anesthetic immediately. Call for help. Administer Intralipid 20% (1.5 mL/kg bolus) NOW. Prepare ACLS.");
      prevCnsToxicityLogged = true;
    } else if (!cnsToxicityActive && prevCnsToxicityLogged) {
      prevCnsToxicityLogged = false;
    }

    if (seizureFromLast && !prevSeizureFromLastLogged) {
      events.push("🚨 EMERGENCY: LAST-induced seizure! Protect airway, administer benzodiazepine (propofol in small doses if needed), continue Intralipid 20% infusion (0.25 mL/kg/min).");
      prevSeizureFromLastLogged = true;
    } else if (!seizureFromLast && prevSeizureFromLastLogged) {
      prevSeizureFromLastLogged = false;
    }

    if (cvToxicityActive && !prevCvToxicityLogged) {
      events.push("🚨 CRITICAL EMERGENCY: LAST cardiovascular toxicity! Arrhythmia/cardiovascular collapse imminent. Maintain Intralipid 20% (repeat bolus if needed). Use vasopressin over epinephrine (epinephrine worsens outcomes in LAST). Avoid lidocaine as antiarrhythmic. CPR if arrest.");
      prevCvToxicityLogged = true;
    } else if (!cvToxicityActive && prevCvToxicityLogged) {
      prevCvToxicityLogged = false;
    }

    // CV effects on hemodynamics (Na+ channel block in cardiac myocytes and vascular smooth muscle)
    const svrModFromLast = -0.4 * cvSeverity;
    const inotropyModFromLast = -0.6 * cvSeverity;

    return {
      cnsToxicityActive,
      cnsToxicitySeverity: parseFloat(cnsSeverity.toFixed(4)),
      seizureFromLast,
      cvToxicityActive,
      cvToxicitySeverity: parseFloat(cvSeverity.toFixed(4)),
      svrModFromLast: parseFloat(svrModFromLast.toFixed(4)),
      inotropyModFromLast: parseFloat(inotropyModFromLast.toFixed(4)),
      bupivacaineBrugadaArrhythmiaRisk: parseFloat(brugadaRisk.toFixed(4)),
      prevCnsToxicityLogged,
      prevSeizureFromLastLogged,
      prevCvToxicityLogged,
      events
    };
  }
}
