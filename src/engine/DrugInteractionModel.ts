/**
 * Drug Interaction Model: CYP-Based DDI and QT Prolongation Risk Matrix
 *
 * Phase 6, Stage H of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * Two real drug interaction domains that have no prior representation in this codebase:
 *
 * === CYP3A4-BASED PHARMACOKINETIC INTERACTIONS ===
 *
 * CYP3A4 metabolizes ~50% of all clinically-used drugs, including critically important
 * anesthesia drugs. When a CYP3A4 INHIBITOR is co-administered, the substrate drug cannot
 * be efficiently metabolized → plasma levels accumulate → increased effect and toxicity
 * at standard doses. INDUCERS accelerate CYP3A4 → faster drug clearance → reduced effect.
 *
 * Clinically relevant perioperative CYP3A4 inhibitors:
 * - Fluconazole/azoles (antifungals): strong CYP3A4 inhibitors → fentanyl/alfentanil
 *   plasma levels rise dramatically (midazolam AUC increased 3-5× with fluconazole)
 * - Erythromycin/clarithromycin (macrolide antibiotics, including the newly-added
 *   antibiotic database): CYP3A4 inhibitors → increased fentanyl/alfentanil accumulation
 * - Diltiazem/verapamil (calcium channel blockers): moderate CYP3A4 inhibitors
 * - Grapefruit juice: contains furanocoumarins → irreversible CYP3A4 inhibition
 *
 * CYP3A4 inducers (chronic therapy reduces drug effect):
 * - Rifampin: the strongest clinical CYP3A4 inducer (up to 30× increase in CYP3A4 activity)
 *   → fentanyl/alfentanil/midazolam may have dramatically shortened duration
 * - Carbamazepine, phenytoin: anticonvulsants that chronically upregulate CYP3A4
 *
 * This model outputs a `cyp3a4ActivityMultiplier` that adjusts the clearance of
 * CYP3A4-metabolized drugs. This directly feeds into PKPDEngine.tick() as a k10 modifier
 * (same established pattern as bcheMultiplier, hofmannMultiplier, cyp2d6Multiplier).
 *
 * === QT PROLONGATION MATRIX ===
 *
 * QT interval prolongation → QTc (Bazett-corrected) > 500 ms → Torsades de Pointes (TdP)
 * → ventricular fibrillation → sudden cardiac death. This is one of the leading causes of
 * drug-induced cardiac death and has resulted in multiple market withdrawals.
 *
 * Real mechanism: most QT-prolonging drugs block the hERG (IKr) potassium channel in
 * ventricular cardiomyocytes → delayed repolarization → longer action potential duration.
 * Effect is ADDITIVE with multiple QT-prolonging drugs.
 *
 * Drugs with QT-prolonging potential relevant to anesthesia:
 * - Ondansetron (5-HT3 antagonist) -- FDA 2011 safety communication for doses ≥32 mg IV
 * - Droperidol -- black box warning, prolongs QT
 * - Methadone -- significant QT prolongation, dose-dependent, additive with other drugs
 * - Haloperidol (sometimes used in PACU for agitation)
 * - Ciprofloxacin (fluoroquinolone, now in the drug database) -- QT prolongation
 * - Metronidazole (high doses) -- mild QT prolongation
 * - Azithromycin (commonly used antibiotic, commonly given perioperatively, not in DB yet)
 *
 * The model computes cumulative QTc risk as a sum of individual drug contributions,
 * with a synergistic interaction term when multiple drugs are combined. Output:
 * - `qtcProlongationMs` (estimated ΔQTc in milliseconds above baseline)
 * - `torsadesRisk` (0-1, probabilistic Torsades risk based on absolute QTc)
 * - Events at critical QTc thresholds (>500 ms, >550 ms)
 *
 * Source: Arizona CERT drug list (azert.org); Roden DM NEJM 2004; FDA 2011 ondansetron
 * safety communication. QTc prolongation estimates are median values from published
 * pharmacokinetic studies.
 */

export interface DrugInteractionInputs {
  // CYP3A4 interaction
  fluconazoleCe?: number; // azole antifungal, strong CYP3A4 inhibitor
  erythromycinCe?: number; // macrolide, moderate CYP3A4 inhibitor
  diltiazemCe?: number; // CCB, moderate CYP3A4 inhibitor
  rifampicinChronic?: boolean; // chronic rifampin use, strong CYP3A4 inducer
  carbamazepineChronic?: boolean; // chronic carbamazepine, moderate inducer

  // QT-prolonging drugs
  ondansetronCe?: number;
  ciprofloxacinCe?: number;
  metronidazoleCe?: number;
  haloperidolCe?: number; // if modeled
  methadoneCe?: number; // if modeled

  // Baseline patient QTc (from CardiovascularEngine or ECG)
  baselineQTcMs?: number; // 400-450 ms normal

  prevTorsadesWarningLogged?: boolean;
}

export interface DrugInteractionOutput {
  // CYP3A4 modulation
  cyp3a4ActivityMultiplier: number; // 0.1-10×; <1 = inhibition, >1 = induction
  fentanylClearanceMultiplier: number; // specific to fentanyl (major CYP3A4 substrate)
  midazolamClearanceMultiplier: number; // specific to midazolam

  // QT prolongation
  qtcProlongationMs: number; // estimated ΔQTc above baseline
  estimatedAbsoluteQTcMs: number; // baseline + delta
  torsadesRisk: number; // 0-1
  qtcCritical: boolean; // QTc > 500 ms
  prevTorsadesWarningLogged: boolean;

  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class DrugInteractionModel {
  static tick(inputs: DrugInteractionInputs = {}): DrugInteractionOutput {
    const events: string[] = [];

    const fluconazoleCe = Math.max(0, safeNumber(inputs.fluconazoleCe, 0));
    const erythromycinCe = Math.max(0, safeNumber(inputs.erythromycinCe, 0));
    const diltiazemCe = Math.max(0, safeNumber(inputs.diltiazemCe, 0));
    const rifampicinChronic = !!inputs.rifampicinChronic;
    const carbamazepineChronic = !!inputs.carbamazepineChronic;

    const ondansetronCe = Math.max(0, safeNumber(inputs.ondansetronCe, 0));
    const ciprofloxacinCe = Math.max(0, safeNumber(inputs.ciprofloxacinCe, 0));
    const metronidazoleCe = Math.max(0, safeNumber(inputs.metronidazoleCe, 0));
    const haloperidolCe = Math.max(0, safeNumber(inputs.haloperidolCe, 0));
    const methadoneCe = Math.max(0, safeNumber(inputs.methadoneCe, 0));
    const baselineQTcMs = clamp(safeNumber(inputs.baselineQTcMs, 420), 350, 600);
    let prevTorsadesWarningLogged = !!inputs.prevTorsadesWarningLogged;

    // --- CYP3A4 inhibition/induction ---
    // Inhibitors reduce CYP3A4 activity (multiplier < 1 = INHIBITION → slower clearance → more drug)
    // Inducers increase CYP3A4 activity (multiplier > 1 = INDUCTION → faster clearance → less drug)
    // When BOTH inhibitors and inducers are present, inhibitors generally dominate acutely.
    const fluconazoleInhibition = fluconazoleCe > 0 ? Math.max(0.2, 1 - 0.8 * (fluconazoleCe / (fluconazoleCe + 1))) : 0;
    const erythromycinInhibition = erythromycinCe > 0 ? Math.max(0.4, 1 - 0.6 * (erythromycinCe / (erythromycinCe + 0.5))) : 0;
    const diltiazemInhibition = diltiazemCe > 0 ? Math.max(0.5, 1 - 0.5 * (diltiazemCe / (diltiazemCe + 1))) : 0;

    // Combined inhibition: take the smallest multiplier (strongest inhibitor dominates)
    const inhibitionMultiplier = [fluconazoleInhibition, erythromycinInhibition, diltiazemInhibition]
      .filter(x => x > 0)
      .reduce((min, x) => Math.min(min, x), 1.0);

    // Inducers: rifampin 30× induction, carbamazepine 3-5× (chronic therapy)
    const inductionMultiplier = rifampicinChronic ? 30 : carbamazepineChronic ? 4 : 1;

    // Net CYP3A4 activity: inhibition dominates if both present
    const hasInhibition = inhibitionMultiplier < 1.0;
    const cyp3a4ActivityMultiplier = hasInhibition ? inhibitionMultiplier : inductionMultiplier;

    // Drug-specific clearance modifiers (CYP3A4 is primary for fentanyl and midazolam)
    const fentanylClearanceMultiplier = cyp3a4ActivityMultiplier;
    const midazolamClearanceMultiplier = cyp3a4ActivityMultiplier;

    // --- QT prolongation matrix ---
    // Per-drug ΔQTc contributions (ms) at therapeutic concentrations
    const ondansetronQtc = ondansetronCe > 0 ? 8 * (ondansetronCe / (ondansetronCe + 0.1)) : 0;
    const ciprofloxacinQtc = ciprofloxacinCe > 0 ? 5 * (ciprofloxacinCe / (ciprofloxacinCe + 0.5)) : 0;
    const metronidazoleQtc = metronidazoleCe > 0 ? 3 * (metronidazoleCe / (metronidazoleCe + 1)) : 0;
    const haloperidolQtc = haloperidolCe > 0 ? 15 * (haloperidolCe / (haloperidolCe + 0.1)) : 0;
    const methadoneQtc = methadoneCe > 0 ? 25 * (methadoneCe / (methadoneCe + 0.3)) : 0;

    // Synergistic amplification when multiple QT-prolonging drugs are combined
    const numDrugsActive = [ondansetronCe, ciprofloxacinCe, metronidazoleCe, haloperidolCe, methadoneCe]
      .filter(ce => ce > 0.01).length;
    const synergyMultiplier = numDrugsActive >= 2 ? 1.3 : 1.0; // 30% amplification with combination

    const qtcProlongationMs = (ondansetronQtc + ciprofloxacinQtc + metronidazoleQtc + haloperidolQtc + methadoneQtc) * synergyMultiplier;
    const estimatedAbsoluteQTcMs = baselineQTcMs + qtcProlongationMs;

    // TdP risk: near-zero below 500ms, substantial risk above 500ms, severe above 550ms
    const torsadesRisk = estimatedAbsoluteQTcMs > 550
      ? clamp((estimatedAbsoluteQTcMs - 550) / 50, 0, 1)
      : estimatedAbsoluteQTcMs > 500
        ? clamp((estimatedAbsoluteQTcMs - 500) / 50 * 0.3, 0, 0.3)
        : 0;

    const qtcCritical = estimatedAbsoluteQTcMs > 500;

    if (qtcCritical && !prevTorsadesWarningLogged) {
      events.push(`🚨 CRITICAL: QTc prolongation detected (estimated QTc ≈${Math.round(estimatedAbsoluteQTcMs)} ms). Torsades de Pointes risk elevated. Review all QT-prolonging medications (ondansetron, fluoroquinolones, antipsychotics, methadone). Consider discontinuing non-essential QT-prolonging agents. Monitor continuous ECG.`);
      prevTorsadesWarningLogged = true;
    } else if (!qtcCritical && prevTorsadesWarningLogged) {
      prevTorsadesWarningLogged = false;
    }

    return {
      cyp3a4ActivityMultiplier: parseFloat(cyp3a4ActivityMultiplier.toFixed(3)),
      fentanylClearanceMultiplier: parseFloat(fentanylClearanceMultiplier.toFixed(3)),
      midazolamClearanceMultiplier: parseFloat(midazolamClearanceMultiplier.toFixed(3)),
      qtcProlongationMs: parseFloat(qtcProlongationMs.toFixed(1)),
      estimatedAbsoluteQTcMs: parseFloat(estimatedAbsoluteQTcMs.toFixed(1)),
      torsadesRisk: parseFloat(torsadesRisk.toFixed(4)),
      qtcCritical,
      prevTorsadesWarningLogged,
      events
    };
  }
}
