/**
 * PHARMACOLOGY DATA ENGINE (V2.0 - HIGH FIDELITY)
 * * Standards:
 * - IBW: Devine Formula
 * - LBW: Janmahasatian Formula
 * - MAC: Mapleson age-adjustment logic
 * - PK: Multi-compartment mammillary models
 * - PD: Sigmoid Emax (Hill Equation) parameters
 */

export function calculateIBW(heightCm, sex) {
  const h = Math.max(0, (heightCm / 2.54) - 60);
  return sex.toLowerCase() === 'male' ? 50.0 + (2.3 * h) : 45.5 + (2.3 * h);
}

export function calculateLBW(heightCm, weightKg, sex) {
  const hM = heightCm / 100;
  const bmi = weightKg / (hM * hM);
  if (sex.toLowerCase() === 'male') {
    return (9270 * weightKg) / (6680 + (216 * bmi));
  } else {
    return (9270 * weightKg) / (8780 + (244 * bmi));
  }
}

export function calculateAgeAdjustedMAC(mac40, age) {
  // Mapleson equation for age-dependent MAC reduction
  return mac40 * Math.pow(10, -0.00269 * (age - 40));
}

export const INHALATIONAL_AGENTS = {
  sevoflurane: { 
    name: 'Sevoflurane', mac40: 2.1, bgPartition: 0.65, brainBgPartition: 1.7, vaporPress: 157, 
    sysMax: -30, diaMax: -25, hrMax: 0, rrMax: -15, 
    description: 'Sweet smelling, low pungency. Ideal for inhalational induction.' 
  },
  desflurane: { 
    name: 'Desflurane', mac40: 6.6, bgPartition: 0.42, brainBgPartition: 1.3, vaporPress: 669, 
    sysMax: -25, diaMax: -25, hrMax: 15, rrMax: -15,
    description: 'Pungent, rapid offset. Risk of sympathetic surge/tachycardia.'
  },
  isoflurane: { 
    name: 'Isoflurane', mac40: 1.15, bgPartition: 1.46, brainBgPartition: 1.6, vaporPress: 238, 
    sysMax: -35, diaMax: -35, hrMax: 5, rrMax: -15,
    description: 'Highly potent, slow kinetics. Potent vasodilator.'
  },
  n2o: { 
    name: 'Nitrous Oxide', mac40: 104, bgPartition: 0.46, brainBgPartition: 1.1, vaporPress: 38760, 
    sysMax: 5, diaMax: 5, hrMax: 5, rrMax: -5,
    description: 'Second gas effect provider. Inhibits B12 metabolism.'
  }
};

export const MEDICATIONS = {
  // === SEDATIVES & HYPNOTICS ===
  dexmedetomidine: { 
    name: 'Dexmedetomidine', classes: ['Alpha-2 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.94, synergyGroup: 'Sedative',
    indications: { 'Sedation': { dose: '0.2-1.5', unit: 'mcg/kg/hr', type: 'Infusion' }, 'Loading Dose': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 25.0, V3: 40, k10: 0.06, k12: 0.08, k21: 0.04, k13: 0.02, k31: 0.01, ke0: 0.5, coSensitivity: 0.2 },
    pd: { c50: 1.2, gamma: 1.5, sysMax: -20, diaMax: -20, hrMax: -30, rrMax: -2, inducesApneaAtCe: 999 } 
  },
  etomidate: { 
    name: 'Etomidate', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Esterase/Liver', proteinBinding: 0.76, synergyGroup: 'Sedative',
    indications: { 'Induction (Cardio-stable)': { dose: '0.2-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 40.0, V3: 120, k10: 0.1, k12: 0.15, k21: 0.08, k13: 0.05, k31: 0.01, ke0: 1.8, coSensitivity: 0.1 },
    pd: { c50: 0.3, gamma: 3, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -12, inducesApneaAtCe: 0.4 } 
  },
  ketamine: { 
    name: 'Ketamine', classes: ['Dissociative', 'Analgesic'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.12, synergyGroup: 'Dissociative',
    indications: { 'Induction': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' }, 'Pain/Agitation': { dose: '0.1-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 45.0, V3: 150, k10: 0.15, k12: 0.2, k21: 0.1, k13: 0.05, k31: 0.02, ke0: 1.5, coSensitivity: 0.4 },
    pd: { c50: 1.0, gamma: 2, sysMax: 30, diaMax: 20, hrMax: 20, rrMax: -2, inducesApneaAtCe: 5.0 } 
  },
  midazolam: { 
    name: 'Midazolam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.97, synergyGroup: 'Sedative',
    indications: { 'Pre-op Anxiolysis': { dose: '0.02-0.04', unit: 'mg/kg', type: 'Bolus' }, 'Sedation': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 12.0, V2: 30.0, V3: 80, k10: 0.12, k12: 0.1, k21: 0.05, k13: 0.03, k31: 0.01, ke0: 0.8, coSensitivity: 0.2 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: 0, rrMax: -6, inducesApneaAtCe: 0.2 } 
  },
  propofol: { 
    name: 'Propofol', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'LBW',
    metabolism: 'Hepatic/Extrahepatic', proteinBinding: 0.98, synergyGroup: 'Sedative',
    indications: { 'Induction': { dose: '1.5-2.5', unit: 'mg/kg', type: 'Bolus' }, 'Maintenance (TIVA)': { dose: '100-200', unit: 'mcg/kg/min', type: 'Infusion' }, 'Sedation': { dose: '25-50', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 4.27, V2: 18.9, V3: 238, k10: 0.443, k12: 0.303, k21: 0.055, k13: 0.196, k31: 0.0033, ke0: 1.2, coSensitivity: 0.6 },
    pd: { c50: 2.5, gamma: 2, sysMax: -40, diaMax: -30, hrMax: -15, rrMax: -14, inducesApneaAtCe: 2.5 } 
  },

  // === OPIOIDS & ANALGESICS ===
  fentanyl: { 
    name: 'Fentanyl', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.84, synergyGroup: 'Opioid',
    indications: { 'Analgesia': { dose: '25-100', unit: 'mcg', type: 'Bolus' }, 'Induction': { dose: '1-3', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 13.0, V2: 30.0, V3: 250, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0.05, k31: 0.01, ke0: 0.15, coSensitivity: 0.8 },
    pd: { c50: 0.002, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: -20, rrMax: -12, inducesApneaAtCe: 0.003 } 
  },
  remifentanil: { 
    name: 'Remifentanil', classes: ['Opioid (Ultra-short)'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'IBW',
    metabolism: 'Nonspecific Plasma Esterase', proteinBinding: 0.70, synergyGroup: 'Opioid',
    indications: { 'Maintenance': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' }, 'Intubation Spike': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 10.0, V3: 15.0, k10: 1.5, k12: 0.8, k21: 0.5, k13: 0.2, k31: 0.1, ke0: 2.5, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 2.5, sysMax: -20, diaMax: -15, hrMax: -30, rrMax: -14, inducesApneaAtCe: 0.0015 } 
  },

  // === PARALYTICS & REVERSALS ===
  cisatracurium: { 
    name: 'Cisatracurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hoffmann Elimination', proteinBinding: 0.82, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Intubation': { dose: '0.15-0.2', unit: 'mg/kg', type: 'Bolus' }, 'Infusion': { dose: '1-3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.0 }, 
    pd: { c50: 0.3, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.2, inducesApneaAtCe: 0.2 } 
  },
  rocuronium: { 
    name: 'Rocuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (Biliary)', proteinBinding: 0.30, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Intubation': { dose: '0.6', unit: 'mg/kg', type: 'Bolus' }, 'RSI': { dose: '1.2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 16.0, V2: 30.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.3 },
    pd: { c50: 1.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 1.0, inducesApneaAtCe: 1.0 } 
  },
  succinylcholine: { 
    name: 'Succinylcholine', classes: ['Depolarizing NMBA'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Pseudocholinesterase', mechanism: 'Agonist', targetReceptor: 'nAChR',
    indications: { 'RSI': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 1.8, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 15, rrMax: -20, inducesParalysisAtCe: 0.3, inducesApneaAtCe: 0.3 } 
  },
  sugammadex: { 
    name: 'Sugammadex', classes: ['Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'Chelator', targetReceptor: 'Rocuronium/Vecuronium',
    indications: { 'Routine Reversal': { dose: '2.0-4.0', unit: 'mg/kg', type: 'Bolus' }, 'Immediate Rescue': { dose: '16.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0 }, pd: { c50: 0, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 } 
  },

  // === INOTROPES & VASOPRESSORS ===
  epinephrine: { 
    name: 'Epinephrine', classes: ['Vasopressor', 'Inotrope'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-Beta',
    indications: { 'Push Dose': { dose: '10-20', unit: 'mcg', type: 'Bolus' }, 'Code': { dose: '1.0', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '0.01-0.1', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.8, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 }, 
    pd: { c50: 0.0005, gamma: 1.5, sysMax: 80, diaMax: 30, hrMax: 60, rrMax: 0 } 
  },
  norepinephrine: { 
    name: 'Norepinephrine', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-1 > Beta-1',
    indications: { 'Shock / Vasoplegia': { dose: '0.01-0.3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 8.0, V2: 0, V3: 0, k10: 0.6, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.001, gamma: 1.5, sysMax: 50, diaMax: 50, hrMax: 10, rrMax: 0 } 
  },
  phenylephrine: { 
    name: 'Phenylephrine', classes: ['Alpha-1 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO', mechanism: 'Agonist', targetReceptor: 'Alpha-1',
    indications: { 'Push Dose': { dose: '50-100', unit: 'mcg', type: 'Bolus' }, 'Infusion': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.002, gamma: 1, sysMax: 40, diaMax: 60, hrMax: -20, rrMax: 0 } 
  }
};

export const FLUIDS = {
  'Normal Saline (0.9% NS)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 154, cl: 154, k: 0, ca: 0, 
    retention: 0.25, osm: 308, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: 0 } 
  },
  'Lactated Ringers (LR)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 130, cl: 109, k: 4, ca: 1.5, 
    retention: 0.25, osm: 273, tonicity: 'Hypotonic', coag: { r: 0, ma: -1, angle: 0 } 
  },
  'Plasmalyte': { 
    type: 'Crystalloid', defaultVol: 1000, na: 140, cl: 98, k: 5, ca: 0, 
    retention: 0.25, osm: 294, tonicity: 'Isotonic', coag: { r: 0, ma: -1, angle: 0 } 
  },
  'Albumin 5%': { 
    type: 'Colloid', defaultVol: 500, na: 145, cl: 145, k: 0, ca: 0, 
    retention: 1.0, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: -2 } 
  },
  'Packed Red Blood Cells (PRBC)': { 
    type: 'Blood Product', defaultVol: 300, na: 0, cl: 0, k: 15, ca: -1.0, 
    retention: 1.0, hct: 0.70, coag: { r: 0, ma: 0, angle: 0 } 
  }, 
  'Fresh Frozen Plasma (FFP)': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 0, ca: -0.5, 
    retention: 1.0, coag: { r: -4, ma: 0, angle: 5 } 
  }
};