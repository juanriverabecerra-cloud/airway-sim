/**
 * Emergency Drug Dosing Model — Weight-Based Rapid Reference
 *
 * In emergencies, drug dosing errors are common under stress. This model
 * computes correct weight-based emergency drug doses in real-time, serving as
 * a clinical decision support tool for rapid drug administration.
 *
 * EMERGENCY DRUG DOSING (critical perioperative drugs):
 *
 * RESUSCITATION:
 * - Epinephrine (cardiac arrest): 1 mg IV q3-5 min (NOT weight-based)
 * - Vasopressin (cardiac arrest): 40 units IV × 1 dose (NOT weight-based)
 * - Atropine (bradycardia): 1 mg IV (max 3 mg)
 * - Adenosine (SVT): 6 mg rapid IV bolus → 12 mg if no response
 * - Amiodarone (VT/VF cardiac arrest): 300 mg IV bolus → 150 mg
 *
 * ANAPHYLAXIS:
 * - Epinephrine 1:1000 IM: 0.3-0.5 mg (thigh, adults; 0.01 mg/kg in pediatrics)
 * - Epinephrine 1:10000 IV (severe): 0.1-0.5 mg IV slowly (monitored)
 *
 * NEUROMUSCULAR:
 * - Succinylcholine (intubation): 1.5 mg/kg IV (use TBW)
 * - Succinylcholine (children < 5y): 2 mg/kg (higher dose needed)
 * - Rocuronium (intubation): 0.6-1.2 mg/kg IV (use IBW)
 * - Rocuronium (rapid sequence, CICO rescue): 1.2 mg/kg
 * - Sugammadex (immediate reversal): 16 mg/kg IV
 * - Neostigmine reversal: 0.04-0.07 mg/kg
 *
 * SEDATION / INDUCTION:
 * - Propofol induction: 1.5-2.5 mg/kg IV (use LBW in obese)
 * - Ketamine induction: 1-2 mg/kg IV
 * - Midazolam sedation: 0.02-0.04 mg/kg IV
 * - Etomidate: 0.3 mg/kg IV
 * - Thiopental: 3-5 mg/kg IV
 *
 * OPIOIDS:
 * - Fentanyl: 1-2 mcg/kg IV (analgesia); 2-5 mcg/kg (induction supplement)
 * - Morphine: 0.05-0.1 mg/kg IV
 * - Hydromorphone: 0.015-0.02 mg/kg IV
 * - Remifentanil bolus: 0.5-1 mcg/kg IV
 *
 * VASOPRESSORS (typical initial doses, NOT weight-based for most):
 * - Phenylephrine push: 50-100 mcg IV
 * - Ephedrine: 5-10 mg IV
 * - Norepinephrine infusion: 0.01-1.0 mcg/kg/min (weight-based)
 * - Vasopressin: 0.03-0.04 units/min (NOT weight-based)
 *
 * DANTROLENE (MH): 2.5 mg/kg IV bolus (may repeat to total 10 mg/kg)
 * GLUCOSE (hypoglycemia): 50 mL D50W (= 25g dextrose) IV
 *
 * Sources: ACLS 2020; Miller's 9th Ed Drug Dosing Appendix.
 */

export interface EmergencyDrugDosingInputs {
  patientWeightKg?: number;
  patientAgeYears?: number;
  patientSex?: string;
  ibwKg?: number;
  lbwKg?: number;

  // Drug to calculate
  drugRequested?: string;

  // Context modifiers
  isObese?: boolean;    // BMI > 35
  isPediatric?: boolean; // < 12 years
  isElderly?: boolean;   // > 70 years
  hasCKD?: boolean;      // affects drug dosing
  hasLiverDisease?: boolean;

  // Clinical indication
  indication?: string;  // 'cardiac_arrest', 'intubation', 'mh', 'anaphylaxis', etc.
}

export interface EmergencyDrugDosingOutput {
  drug: string;
  indication: string;
  dose: number;
  doseUnit: string;
  dosingWeight: string;
  dosingWeightKg: number;
  route: string;
  notes: string;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class EmergencyDrugDosingModel {
  static calculate(inputs: EmergencyDrugDosingInputs = {}): EmergencyDrugDosingOutput {
    const events: string[] = [];

    const tbw = clamp(safeNumber(inputs.patientWeightKg, 70), 10, 300);
    const ibw = clamp(safeNumber(inputs.ibwKg, 70), 20, 180);
    const lbw = clamp(safeNumber(inputs.lbwKg, 65), 15, 150);
    const age = clamp(safeNumber(inputs.patientAgeYears, 50), 0, 110);
    const isObese = !!inputs.isObese;
    const isPediatric = age < 12 || !!inputs.isPediatric;
    const isElderly = age > 70 || !!inputs.isElderly;

    const drug = (inputs.drugRequested || '').toLowerCase();
    const indication = (inputs.indication || 'general').toLowerCase();

    // Default output
    let dose = 0;
    let doseUnit = 'mg';
    let dosingWeightString = 'IBW';
    let dosingWeightKg = ibw;
    let route = 'IV';
    let notes = '';

    switch (drug) {
      case 'succinylcholine':
      case 'suxamethonium':
        dosingWeightString = 'TBW (upregulated pseudocholinesterase in obesity)';
        dosingWeightKg = tbw;
        if (isPediatric) {
          dose = parseFloat((tbw * 2.0).toFixed(1)); // 2 mg/kg in children < 5y
          notes = 'Pediatric dose 2 mg/kg (higher because larger volume of distribution)';
        } else {
          dose = parseFloat((tbw * 1.5).toFixed(1)); // 1.5 mg/kg standard
          notes = 'Use 2 mg/kg for CICO rescue (ensure absolute onset, accept prolonged block)';
        }
        doseUnit = 'mg IV bolus';
        break;

      case 'rocuronium':
        dosingWeightString = 'IBW';
        dosingWeightKg = ibw;
        if (indication.includes('cico') || indication.includes('rescue') || indication.includes('rapid')) {
          dose = parseFloat((ibw * 1.2).toFixed(1)); // RSI/CICO dose
          notes = 'Modified RSI dose (1.2 mg/kg IBW). Have sugammadex 16 mg/kg ready for reversal.';
        } else {
          dose = parseFloat((ibw * 0.6).toFixed(1)); // standard intubation
          notes = 'Standard intubation dose. Onset 2-3 min. Reverse with sugammadex or neostigmine.';
        }
        doseUnit = 'mg IV bolus';
        break;

      case 'sugammadex':
        dosingWeightString = 'TBW';
        dosingWeightKg = tbw;
        if (indication.includes('immediate') || indication.includes('cico') || indication.includes('rescue')) {
          dose = parseFloat((tbw * 16).toFixed(0));
          notes = 'Immediate complete reversal dose. Onset < 3 min. If rocuronium used for CICO.';
        } else if (indication.includes('deep') || indication.includes('ptc')) {
          dose = parseFloat((tbw * 4).toFixed(0));
          notes = 'Deep block (PTC > 2, no TOF): 4 mg/kg IV.';
        } else {
          dose = parseFloat((tbw * 2).toFixed(0));
          notes = 'Moderate block (TOFR present): 2 mg/kg IV. Patient on OCP: advise backup contraception × 7 days.';
        }
        doseUnit = 'mg IV bolus';
        break;

      case 'propofol':
        if (isObese) {
          dosingWeightString = 'LBW (obese)';
          dosingWeightKg = lbw;
        } else if (isElderly) {
          dosingWeightString = 'LBW (elderly — reduce 30-50%)';
          dosingWeightKg = ibw * 0.6;
        } else {
          dosingWeightString = 'LBW';
          dosingWeightKg = lbw;
        }
        dose = parseFloat((dosingWeightKg * 2.0).toFixed(1));
        doseUnit = 'mg IV bolus (titrate)';
        notes = 'Titrate to loss of consciousness. Elderly/debilitated: start 0.5 mg/kg, titrate.';
        break;

      case 'ketamine':
        dosingWeightString = 'TBW';
        dosingWeightKg = tbw;
        dose = parseFloat((tbw * 1.5).toFixed(1));
        doseUnit = 'mg IV';
        notes = 'Induction dose: 1-2 mg/kg IV. Analgesic/sedation: 0.3-0.5 mg/kg. Does not obtund laryngeal reflexes (airway reflex mostly preserved). Preferred induction for tamponade, bronchospasm, hemorrhagic shock.';
        break;

      case 'fentanyl':
        dosingWeightString = 'IBW';
        dosingWeightKg = ibw;
        dose = parseFloat((ibw * 1.5).toFixed(0)); // 1-2 mcg/kg
        doseUnit = 'mcg IV bolus';
        notes = 'Analgesia: 1-2 mcg/kg. Induction supplement: 2-5 mcg/kg. Intubation facilitation: 3-5 mcg/kg.';
        break;

      case 'epinephrine':
        if (indication.includes('cardiac_arrest') || indication.includes('arrest')) {
          dose = 1.0;
          doseUnit = 'mg IV bolus';
          route = 'IV/IO';
          notes = 'Cardiac arrest: 1 mg IV q3-5 min. NOT weight-based. Also can use 10 mL 1:10,000 solution.';
        } else if (indication.includes('anaphylaxis')) {
          if (isPediatric) {
            dose = parseFloat((tbw * 0.01).toFixed(2));
            doseUnit = 'mg IM (1:1000)';
            notes = `Pediatric: 0.01 mg/kg IM (max 0.5 mg). = ${(tbw * 0.01).toFixed(2)} mg.`;
          } else {
            dose = 0.3;
            doseUnit = 'mg IM (1:1000 solution) into outer thigh';
            notes = 'Adults: 0.3-0.5 mg IM (lateral thigh). Can repeat q5-15 min. IV only if cardiac arrest or no IM access.';
          }
        } else {
          dose = 0.05;
          doseUnit = 'mg IV push (1:10,000) for hemodynamic support';
          notes = 'Push dose epi: 5-10 mcg (0.05-0.1 mL 1:10,000) per push for transient hypotension. Infusion: 0.01-1 mcg/kg/min.';
        }
        break;

      case 'dantrolene':
        dosingWeightString = 'TBW';
        dosingWeightKg = tbw;
        dose = parseFloat((tbw * 2.5).toFixed(1));
        doseUnit = 'mg IV bolus';
        notes = `MH treatment: 2.5 mg/kg IV bolus rapidly; repeat every 5-10 min as needed (max 10 mg/kg total = ${(tbw * 10).toFixed(0)} mg). Reconstitute each 20mg vial in 60 mL sterile water. If MH, start with 2.5 mg/kg and escalate.`;
        break;

      case 'atropine':
        dose = 1.0;
        doseUnit = 'mg IV bolus';
        notes = 'Bradycardia: 1 mg IV, repeat q3-5 min, max 3 mg total. Pediatric: 0.02 mg/kg (min 0.1 mg). NOT weight-based in adults.';
        dosingWeightString = 'fixed dose (adults)';
        dosingWeightKg = tbw;
        break;

      case 'amiodarone':
        dosingWeightString = 'fixed dose (adults)';
        dosingWeightKg = tbw;
        doseUnit = 'mg IV bolus/infusion';
        if (indication.includes('cardiac_arrest') || indication.includes('arrest') || indication.includes('vf') || indication.includes('vt')) {
          dose = 300;
          notes = 'ACLS Cardiac Arrest (VF/pVT): 300 mg IV/IO bolus first dose, may follow with second dose of 150 mg IV/IO bolus.';
        } else {
          dose = 150;
          notes = 'Stable Wide-QRS Tachycardia: 150 mg IV over 10 min, followed by maintenance infusion of 1 mg/min for first 6 hours, then 0.5 mg/min.';
        }
        break;

      case 'lidocaine':
        dosingWeightString = 'TBW';
        dosingWeightKg = tbw;
        doseUnit = 'mg IV bolus';
        if (indication.includes('cardiac_arrest') || indication.includes('arrest') || indication.includes('vf') || indication.includes('vt')) {
          dose = parseFloat((tbw * 1.0).toFixed(1));
          notes = 'ACLS Cardiac Arrest (VF/pVT): 1.0-1.5 mg/kg IV/IO first dose, may repeat 0.5-0.75 mg/kg (max 3 mg/kg total).';
        } else {
          dose = parseFloat((tbw * 1.5).toFixed(1));
          notes = 'Stable VT / Induction: 1.0-1.5 mg/kg IV. Maintenance infusion: 1-4 mg/min.';
        }
        break;

      case 'magnesium':
      case 'magnesium-sulfate':
      case 'magnesium_sulfate':
      case 'magnesium sulfate':
        dosingWeightString = 'fixed dose';
        dosingWeightKg = tbw;
        doseUnit = 'g IV bolus';
        if (indication.includes('torsades') || indication.includes('polymorphic') || indication.includes('cardiac_arrest') || indication.includes('arrest')) {
          dose = 2;
          notes = 'ACLS Polymorphic VT / Torsades de Pointes: 1-2 g IV push diluted in 10 mL D5W over 1-2 min (cardiac arrest) or over 5-20 min (pulse present).';
        } else {
          dose = 4;
          notes = 'Preeclampsia / Eclampsia: 4-6 g loading dose IV over 15-20 min, then 1-2 g/hr maintenance infusion.';
        }
        break;

      case 'procainamide':
        dosingWeightString = 'TBW';
        dosingWeightKg = tbw;
        doseUnit = 'mg IV infusion';
        dose = parseFloat((tbw * 15).toFixed(0)); // 15 mg/kg target
        notes = 'Stable Wide-QRS Tachycardia: 20-50 mg/min IV infusion until suppressed, hypotension, QRS widens by 50%, or max dose 17 mg/kg reached (approx 1000-1200 mg). Maintenance: 1-4 mg/min.';
        break;

      case 'naloxone':
        dosingWeightString = 'fixed dose (adults)';
        dosingWeightKg = tbw;
        doseUnit = 'mg IV/IM';
        dose = 0.4;
        notes = 'Opioid Overdose/Reversal: 0.4-2.0 mg IV/IM, repeat every 2-3 minutes as needed. Intranasal: 2-4 mg. Titrate to restore spontaneous respiration without precipitating acute withdrawal/pain.';
        break;

      case 'bicarbonate':
      case 'sodium-bicarbonate':
      case 'sodium_bicarbonate':
      case 'sodium bicarbonate':
        dosingWeightString = 'TBW';
        dosingWeightKg = tbw;
        doseUnit = 'mEq IV bolus';
        dose = parseFloat((tbw * 1.0).toFixed(0)); // 1 mEq/kg
        notes = 'ACLS Arrest/Metabolic Acidosis/TCA Overdose/Hyperkalemia: 1 mEq/kg IV bolus. Ensure adequate ventilation to eliminate generated CO2.';
        break;

      case 'vasopressin':
        dosingWeightString = 'fixed dose';
        dosingWeightKg = tbw;
        doseUnit = 'units IV';
        if (indication.includes('cardiac_arrest') || indication.includes('arrest')) {
          dose = 40;
          notes = 'ACLS Cardiac Arrest: 40 units IV/IO bolus to replace first or second dose of Epinephrine.';
        } else {
          dose = 0.04;
          notes = 'Septic/Vasoplegic Shock: 0.03-0.04 units/min continuous infusion. Do not titrate.';
        }
        break;

      default:
        dose = 0;
        doseUnit = 'mg';
        notes = `Drug "${drug}" not found in emergency dosing reference. Consult drug database.`;
        dosingWeightString = 'N/A';
    }

    return {
      drug,
      indication,
      dose,
      doseUnit,
      dosingWeight: dosingWeightString,
      dosingWeightKg: parseFloat(dosingWeightKg.toFixed(1)),
      route,
      notes,
      events,
    };
  }

  // Convenience method for the most common emergency scenario
  static tick(inputs: EmergencyDrugDosingInputs = {}): EmergencyDrugDosingOutput {
    return this.calculate(inputs);
  }
}
