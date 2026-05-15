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
  halothane: { 
    name: 'Halothane', mac40: 0.75, bgPartition: 2.54, brainBgPartition: 2.9, vaporPress: 243, 
    sysMax: -20, diaMax: -20, hrMax: -15, rrMax: -10,
    description: 'Highly soluble, slow onset/offset. Sensitizes myocardium to catecholamines.' 
  },
  xenon: { 
    name: 'Xenon', mac40: 71, bgPartition: 0.115, brainBgPartition: 1.2, vaporPress: 9999, 
    sysMax: 0, diaMax: 0, hrMax: -5, rrMax: -5,
    description: 'Inert noble gas. NMDA antagonist. Extremely rapid onset/offset. Cardio-stable.' 
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
    metabolism: 'Hepatic', proteinBinding: 0.94, synergyGroup: 'Sedative', pkModel: 'Hannivoort-Colin',
    indications: { 'Sedation': { dose: '0.2-1.5', unit: 'mcg/kg/hr', type: 'Infusion' }, 'Loading Dose': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 25.0, V3: 40, k10: 0.06, k12: 0.08, k21: 0.04, k13: 0.02, k31: 0.01, ke0: 0.5, coSensitivity: 0.2 },
    pd: { c50: 1.2, gamma: 1.5, sysMax: -20, diaMax: -20, hrMax: -30, rrMax: -2, inducesApneaAtCe: 999 } 
  },
  etomidate: { 
    name: 'Etomidate', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Esterase/Liver', proteinBinding: 0.76, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    indications: { 'Induction (Cardio-stable)': { dose: '0.2-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 40.0, V3: 120, k10: 0.1, k12: 0.15, k21: 0.08, k13: 0.05, k31: 0.01, ke0: 1.8, coSensitivity: 0.1 },
    pd: { c50: 0.3, gamma: 3, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -12, inducesApneaAtCe: 0.4 } 
  },
  ketamine: { 
    name: 'Ketamine', classes: ['Dissociative', 'Analgesic'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.12, synergyGroup: 'Dissociative', pkModel: 'Domino/Clements250',
    indications: { 'Induction': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' }, 'Pain/Agitation': { dose: '0.1-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 45.0, V3: 150, k10: 0.15, k12: 0.2, k21: 0.1, k13: 0.05, k31: 0.02, ke0: 1.5, coSensitivity: 0.4 },
    pd: { c50: 1.0, gamma: 2, sysMax: 30, diaMax: 20, hrMax: 20, rrMax: -2, inducesApneaAtCe: 5.0 } 
  },
  midazolam: { 
    name: 'Midazolam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.97, synergyGroup: 'Sedative', pkModel: 'Greenblatt',
    indications: { 'Pre-op Anxiolysis': { dose: '0.02-0.04', unit: 'mg/kg', type: 'Bolus' }, 'Sedation': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 12.0, V2: 30.0, V3: 80, k10: 0.12, k12: 0.1, k21: 0.05, k13: 0.03, k31: 0.01, ke0: 0.8, coSensitivity: 0.2 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: 0, rrMax: -6, inducesApneaAtCe: 0.2 } 
  },
  propofol: { 
    name: 'Propofol', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'LBW',
    metabolism: 'Hepatic/Extrahepatic', proteinBinding: 0.98, synergyGroup: 'Sedative', pkModel: 'Schnider',
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
  hydromorphone: { 
    name: 'Hydromorphone', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.19, synergyGroup: 'Opioid',
    indications: { 'Analgesia': { dose: '0.2-1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 150, k10: 0.03, k12: 0.05, k21: 0.02, k13: 0.02, k31: 0.01, ke0: 0.1, coSensitivity: 0.5 },
    pd: { c50: 0.015, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -10, rrMax: -14, inducesApneaAtCe: 0.02 } 
  },
  morphine: { 
    name: 'Morphine', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.35, synergyGroup: 'Opioid',
    indications: { 'Analgesia': { dose: '2.0-4.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 50.0, V3: 200, k10: 0.02, k12: 0.04, k21: 0.02, k13: 0.01, k31: 0.005, ke0: 0.05, coSensitivity: 0.5 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -15, diaMax: -20, hrMax: -5, rrMax: -14, inducesApneaAtCe: 0.08 } 
  },
  remifentanil: { 
    name: 'Remifentanil', classes: ['Opioid (Ultra-short)'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'IBW',
    metabolism: 'Nonspecific Plasma Esterase', proteinBinding: 0.70, synergyGroup: 'Opioid',
    indications: { 'Maintenance': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' }, 'Intubation Spike': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 10.0, V3: 15.0, k10: 1.5, k12: 0.8, k21: 0.5, k13: 0.2, k31: 0.1, ke0: 2.5, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 2.5, sysMax: -20, diaMax: -15, hrMax: -30, rrMax: -14, inducesApneaAtCe: 0.0015 } 
  },
  sufentanil: { 
    name: 'Sufentanil', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.92, synergyGroup: 'Opioid',
    indications: { 'Analgesia': { dose: '5-10', unit: 'mcg', type: 'Bolus' }, 'Induction': { dose: '0.1-0.3', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 25.0, V3: 150, k10: 0.04, k12: 0.08, k21: 0.04, k13: 0.04, k31: 0.01, ke0: 0.12, coSensitivity: 0.8 },
    pd: { c50: 0.0003, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -25, rrMax: -15, inducesApneaAtCe: 0.0005 } 
  },

  // === PARALYTICS & REVERSALS ===
  cisatracurium: { 
    name: 'Cisatracurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hoffmann Elimination', proteinBinding: 0.82, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Intubation': { dose: '0.15-0.2', unit: 'mg/kg', type: 'Bolus' }, 'Infusion': { dose: '1-3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.0 }, 
    pd: { c50: 0.3, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.2, inducesApneaAtCe: 0.2, receptorAffinity: 0.85 } 
  },
  glycopyrrolate: { 
    name: 'Glycopyrrolate', classes: ['Anticholinergic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', proteinBinding: 0.0, mechanism: 'Antagonist', targetReceptor: 'Muscarinic',
    indications: { 'Reversal Adjunct': { dose: '0.2', unit: 'mg', type: 'Bolus' }, 'Bradycardia': { dose: '0.2-0.4', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.01, gamma: 2, sysMax: 0, diaMax: 0, hrMax: 35, rrMax: 0, receptorAffinity: 0.90 } 
  },
  neostigmine: { 
    name: 'Neostigmine', classes: ['AChE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic/Renal', proteinBinding: 0.20, mechanism: 'Inhibitor', targetReceptor: 'Acetylcholinesterase',
    indications: { 'Reversal': { dose: '0.04-0.05', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.04, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.02, gamma: 2, sysMax: 0, diaMax: 0, hrMax: -40, rrMax: 0, achDisplacementPower: 1.5 } 
  },
  rocuronium: { 
    name: 'Rocuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (Biliary)', proteinBinding: 0.30, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Intubation': { dose: '0.6', unit: 'mg/kg', type: 'Bolus' }, 'RSI': { dose: '1.2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 16.0, V2: 30.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.3 },
    pd: { c50: 1.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 1.0, inducesApneaAtCe: 1.0, receptorAffinity: 0.70 } 
  },
  succinylcholine: { 
    name: 'Succinylcholine', classes: ['Depolarizing NMBA'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Pseudocholinesterase', mechanism: 'Agonist', targetReceptor: 'nAChR',
    indications: { 'RSI': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 1.8, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 15, rrMax: -20, inducesParalysisAtCe: 0.3, inducesApneaAtCe: 0.3, receptorAffinity: 1.2 } 
  },
  sugammadex: { 
    name: 'Sugammadex', classes: ['Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'Chelator', targetReceptor: 'Rocuronium/Vecuronium',
    indications: { 'Routine Reversal': { dose: '2.0-4.0', unit: 'mg/kg', type: 'Bolus' }, 'Immediate Rescue': { dose: '16.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0 }, 
    pd: { c50: 0, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, chelationRatio: 1.0 } 
  },
  vecuronium: { 
    name: 'Vecuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic/Renal', proteinBinding: 0.70, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Intubation': { dose: '0.1', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 25.0, V3: 0, k10: 0.05, k12: 0.04, k21: 0.04, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0.2 }, 
    pd: { c50: 0.2, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.15, inducesApneaAtCe: 0.15, receptorAffinity: 0.75 } 
  },

  // === INOTROPES & VASOPRESSORS ===
  dobutamine: { 
    name: 'Dobutamine', classes: ['Inotrope'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Agonist', targetReceptor: 'Beta-1 > Beta-2',
    indications: { 'Low CO': { dose: '2.5-10', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: 20, diaMax: -15, hrMax: 30, rrMax: 0 } 
  },
  dopamine: { 
    name: 'Dopamine', classes: ['Inotrope/Pressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'D1, Beta-1, Alpha-1',
    indications: { 'Support': { dose: '5-15', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.4, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.01, gamma: 1.5, sysMax: 30, diaMax: 20, hrMax: 40, rrMax: 0 } 
  },
  ephedrine: { 
    name: 'Ephedrine', classes: ['Mixed Agonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic/Renal', mechanism: 'Direct/Indirect Agonist', targetReceptor: 'Alpha & Beta',
    indications: { 'Hypotension': { dose: '5-10', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 1.5, sysMax: 40, diaMax: 25, hrMax: 30, rrMax: 0 } 
  },
  epinephrine: { 
    name: 'Epinephrine', classes: ['Vasopressor', 'Inotrope'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-Beta',
    indications: { 'Push Dose': { dose: '10-20', unit: 'mcg', type: 'Bolus' }, 'Code': { dose: '1.0', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '0.01-0.1', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.8, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 }, 
    pd: { c50: 0.002, gamma: 1.5, sysMax: 60, diaMax: 30, hrMax: 50, rrMax: 0 } 
  },
  milrinone: { 
    name: 'Milrinone', classes: ['PDE3 Inhibitor'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', mechanism: 'Inhibitor', targetReceptor: 'PDE3',
    indications: { 'Inotropy': { dose: '0.375-0.75', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 1.5, sysMax: 10, diaMax: -20, hrMax: 10, rrMax: 0 } 
  },
  norepinephrine: { 
    name: 'Norepinephrine', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-1 > Beta-1',
    indications: { 'Shock / Vasoplegia': { dose: '0.01-0.3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 8.0, V2: 0, V3: 0, k10: 0.6, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: 40, diaMax: 50, hrMax: 10, rrMax: 0 } 
  },
  phenylephrine: { 
    name: 'Phenylephrine', classes: ['Alpha-1 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO', mechanism: 'Agonist', targetReceptor: 'Alpha-1',
    indications: { 'Push Dose': { dose: '50-100', unit: 'mcg', type: 'Bolus' }, 'Infusion': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.02, gamma: 1, sysMax: 30, diaMax: 45, hrMax: -15, rrMax: 0 } 
  },
  vasopressin: { 
    name: 'Vasopressin', classes: ['V1 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic/Renal', mechanism: 'Agonist', targetReceptor: 'V1 Receptors',
    indications: { 'Push Dose': { dose: '1-2', unit: 'Unit', type: 'Bolus' }, 'Infusion': { dose: '0.04', unit: 'Unit/min', type: 'Infusion' } },
    pk: { V1: 12.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.1 }, 
    pd: { c50: 0.05, gamma: 2, sysMax: 20, diaMax: 35, hrMax: -5, rrMax: 0 } 
  },

  // === ANTIHYPERTENSIVES ===
  clevidipine: { 
    name: 'Clevidipine', classes: ['CCB'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Esterase', mechanism: 'Blocker', targetReceptor: 'L-type Calcium',
    indications: { 'HTN': { dose: '2-4', unit: 'mg/hr', type: 'Infusion' } },
    pk: { V1: 4.0, V2: 0, V3: 0, k10: 0.3, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.02, gamma: 2.0, sysMax: -30, diaMax: -40, hrMax: 15, rrMax: 0 } 
  },
  clonidine: { 
    name: 'Clonidine', classes: ['Alpha-2 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic/Renal', mechanism: 'Agonist', targetReceptor: 'Central Alpha-2',
    indications: { 'HTN / Sympatholysis': { dose: '150-300', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 40.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -25, diaMax: -15, hrMax: -20, rrMax: -2 } 
  },
  enalaprilat: { 
    name: 'Enalaprilat', classes: ['ACE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', mechanism: 'Inhibitor', targetReceptor: 'ACE',
    indications: { 'HTN': { dose: '1.25-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.015, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.5, sysMax: -25, diaMax: -20, hrMax: 0, rrMax: 0 } 
  },
  esmolol: { 
    name: 'Esmolol', classes: ['Beta-1 Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'RBC Esterase', mechanism: 'Antagonist', targetReceptor: 'Beta-1',
    indications: { 'Tachycardia': { dose: '10-20', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '50-100', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 3.3, V2: 0, V3: 0, k10: 0.4, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.5, sysMax: -15, diaMax: -10, hrMax: -30, rrMax: 0 } 
  },
  hydralazine: { 
    name: 'Hydralazine', classes: ['Arterial Vasodilator'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (Acetylation)', mechanism: 'Direct Dilator', targetReceptor: 'Arterial Smooth Muscle',
    indications: { 'HTN': { dose: '5-20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0, k31: 0, ke0: 0.02, coSensitivity: 0.3 }, 
    pd: { c50: 1.5, gamma: 1.5, sysMax: -40, diaMax: -30, hrMax: 25, rrMax: 0 } 
  },
  labetalol: { 
    name: 'Labetalol', classes: ['Mixed Alpha/Beta'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Alpha-1, Beta-1/2',
    indications: { 'HTN': { dose: '10-20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 60.0, V2: 0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 2.0, sysMax: -40, diaMax: -35, hrMax: -20, rrMax: 0 } 
  },
  metoprolol: { 
    name: 'Metoprolol', classes: ['Beta-1 Blocker'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Beta-1',
    indications: { 'Tachycardia': { dose: '2.5-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.02, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 1.5, sysMax: -20, diaMax: -15, hrMax: -35, rrMax: 0 } 
  },
  nicardipine: { 
    name: 'Nicardipine', classes: ['CCB'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Blocker', targetReceptor: 'Calcium Channels',
    indications: { 'HTN': { dose: '5-15', unit: 'mg/hr', type: 'Infusion' } },
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 2.0, sysMax: -25, diaMax: -35, hrMax: 10, rrMax: 0 } 
  },
  nitroglycerin: { 
    name: 'Nitroglycerin', classes: ['Venodilator'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Nitric Oxide Donator', targetReceptor: 'Venous Smooth Muscle',
    indications: { 'Ischemia': { dose: '10-20', unit: 'mcg/min', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.25, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: -20, diaMax: -30, hrMax: 10, rrMax: 0 } 
  },
  nitroprusside: { 
    name: 'Nitroprusside', classes: ['Mixed Dilator'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'RBCs (Cyanide)', mechanism: 'Nitric Oxide Donator', targetReceptor: 'Arterial/Venous Muscle',
    indications: { 'HTN Crisis': { dose: '0.3-0.5', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.3, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.002, gamma: 2.0, sysMax: -40, diaMax: -40, hrMax: 20, rrMax: 0 } 
  },
  phentolamine: { 
    name: 'Phentolamine', classes: ['Alpha Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Alpha-1, Alpha-2',
    indications: { 'Pheochromocytoma': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.15, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 2.0, sysMax: -50, diaMax: -40, hrMax: 30, rrMax: 0 } 
  },

  // === DIURETICS ===
  acetazolamide: { 
    name: 'Acetazolamide', classes: ['CA Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'Inhibitor', targetReceptor: 'Carbonic Anhydrase',
    indications: { 'Metabolic Alkalosis': { dose: '250-500', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 }, 
    pd: { c50: 5.0, gamma: 1.0, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: 5 } // Induces non-gap acidosis causing compensatory hyperventilation
  },
  bumetanide: { 
    name: 'Bumetanide', classes: ['Loop Diuretic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic/Renal', mechanism: 'Inhibitor', targetReceptor: 'Na-K-2Cl Symporter',
    indications: { 'Edema / Oliguria': { dose: '0.5-2.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 6.0, V2: 10.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 0.05, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 } 
  },
  furosemide: { 
    name: 'Furosemide', classes: ['Loop Diuretic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal/Hepatic', mechanism: 'Inhibitor', targetReceptor: 'Na-K-2Cl Symporter',
    indications: { 'Edema / Oliguria': { dose: '20-80', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 12.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 } // Acute venodilation
  },
  mannitol: { 
    name: 'Mannitol 20%', classes: ['Osmotic Diuretic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'Osmotic Agent', targetReceptor: 'Tubular Lumen',
    indications: { 'Elevated ICP': { dose: '50-100', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 }, 
    pd: { c50: 50.0, gamma: 1.0, sysMax: 5, diaMax: 5, hrMax: -5, rrMax: 0 } // Transient intravascular volume expansion
  },

  // === ANTIARRHYTHMICS & ELECTROLYTES ===
  adenosine: { 
    name: 'Adenosine', classes: ['Purinergic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'RBC/Endothelial Uptake', mechanism: 'Agonist', targetReceptor: 'A1 Receptors (AV Node)',
    indications: { 'SVT': { dose: '6-12', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 5.0, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 5.0, coSensitivity: 0.1 }, 
    pd: { c50: 0.2, gamma: 4.0, sysMax: -40, diaMax: -20, hrMax: -150, rrMax: 0 } 
  },
  amiodarone: { 
    name: 'Amiodarone', classes: ['Class III'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'K+ Channel Blocker', targetReceptor: 'Potassium Channels',
    indications: { 'VT/VF Arrest': { dose: '300', unit: 'mg', type: 'Bolus' }, 'Stable VT': { dose: '150', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 500.0, V2: 0, V3: 0, k10: 0.005, k12: 0.02, k21: 0.01, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.5 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -25, diaMax: -20, hrMax: -20, rrMax: 0 } 
  },
  atropine: { 
    name: 'Atropine', classes: ['Anticholinergic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Muscarinic',
    indications: { 'Bradycardia': { dose: '0.5-1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.08, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.02, gamma: 2.0, sysMax: 5, diaMax: 5, hrMax: 55, rrMax: 0 } 
  },
  bicarbonate: { 
    name: 'Sodium Bicarbonate', classes: ['Buffer'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Lungs (exhaled as CO2)', mechanism: 'Alkalinizer', targetReceptor: 'Plasma pH',
    indications: { 'Metabolic Acidosis': { dose: '50', unit: 'mEq', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.0, sysMax: 5, diaMax: 5, hrMax: 0, rrMax: 0 } 
  },
  calcium: { 
    name: 'Calcium Chloride', classes: ['Electrolyte'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Bone/Renal', mechanism: 'Inotrope', targetReceptor: 'Myocardium',
    indications: { 'Hypocalcemia/Inotropy': { dose: '0.5-1.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 1.5, sysMax: 25, diaMax: 15, hrMax: -5, rrMax: 0 } 
  },
  digoxin: { 
    name: 'Digoxin', classes: ['Cardiac Glycoside'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'LBW',
    metabolism: 'Renal', mechanism: 'Inhibitor', targetReceptor: 'Na+/K+-ATPase',
    indications: { 'Rate Control': { dose: '0.25-0.5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 50.0, V2: 300.0, V3: 0, k10: 0.005, k12: 0.02, k21: 0.01, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 }, 
    pd: { c50: 1.5, gamma: 1.5, sysMax: 10, diaMax: 5, hrMax: -20, rrMax: 0 } 
  },
  diltiazem: { 
    name: 'Diltiazem', classes: ['Class IV CCB'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Blocker', targetReceptor: 'L-type Calcium',
    indications: { 'Afib / Rate Control': { dose: '10-20', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '5-15', unit: 'mg/hr', type: 'Infusion' } },
    pk: { V1: 30.0, V2: 60.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 2.0, sysMax: -20, diaMax: -20, hrMax: -25, rrMax: 0 } 
  },
  ibutilide: { 
    name: 'Ibutilide', classes: ['Class III'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Agonist', targetReceptor: 'Slow Inward Na+',
    indications: { 'Chemical Cardioversion': { dose: '1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.2 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -10, rrMax: 0 } 
  },
  lidocaine: { 
    name: 'Lidocaine', classes: ['Class IB'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Na+ Channel Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'VT/VF Arrest': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.05, k12: 0.08, k21: 0.04, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.2 }, 
    pd: { c50: 3.0, gamma: 2, sysMax: -10, diaMax: -10, hrMax: -5, rrMax: 0 } 
  },
  magnesium: { 
    name: 'Magnesium Sulfate', classes: ['Electrolyte'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal', mechanism: 'Membrane Stabilizer', targetReceptor: 'Ca2+/K+ Channels',
    indications: { 'Torsades / Pre-Eclampsia': { dose: '1-2', unit: 'g', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.02, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.0, sysMax: -15, diaMax: -20, hrMax: -5, rrMax: 0 } 
  },
  procainamide: { 
    name: 'Procainamide', classes: ['Class IA'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic/Renal', mechanism: 'Na+ Channel Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Stable VT / WPW': { dose: '20-50', unit: 'mg/min', type: 'Infusion' } },
    pk: { V1: 35.0, V2: 60.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 4.0, gamma: 1.5, sysMax: -20, diaMax: -15, hrMax: -10, rrMax: 0 } 
  },
  sotalol: { 
    name: 'Sotalol', classes: ['Class III / Beta-Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'K+ Channel / Beta Blocker', targetReceptor: 'Potassium / Beta-1/2',
    indications: { 'Afib / VT': { dose: '75-150', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -30, rrMax: 0 } 
  },
  verapamil: { 
    name: 'Verapamil', classes: ['Class IV CCB'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Blocker', targetReceptor: 'L-type Calcium',
    indications: { 'SVT / Rate Control': { dose: '2.5-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 80.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.2 }, 
    pd: { c50: 0.3, gamma: 2.0, sysMax: -25, diaMax: -25, hrMax: -35, rrMax: 0 } 
  },
  // === NEW SEDATIVES / REVERSALS ===
  thiopental: {
    name: 'Thiopental', classes: ['Barbiturate'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'LBW',
    metabolism: 'Hepatic', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Stanski',
    indications: { 'Induction': { dose: '3-5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 150.0, k10: 0.05, k12: 0.1, k21: 0.08, k13: 0.02, k31: 0.01, ke0: 1.2, coSensitivity: 0.3 },
    pd: { c50: 15.0, gamma: 2.0, sysMax: -25, diaMax: -20, hrMax: 15, rrMax: -12, inducesApneaAtCe: 10.0 }
  },
  lorazepam: {
    name: 'Lorazepam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (Glucuronidation)', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Greenblatt',
    indications: { 'Anxiolysis / Seizure': { dose: '1-2', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 35.0, V3: 0, k10: 0.01, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -4, inducesApneaAtCe: 0.5 }
  },
  flumazenil: {
    name: 'Flumazenil', classes: ['GABA Antagonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.50, mechanism: 'Competitive Antagonist', targetReceptor: 'GABA-A',
    indications: { 'Benzo Reversal': { dose: '0.2-1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.1, k12: 0.08, k21: 0.05, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.1 },
    pd: { c50: 0.002, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, receptorAffinity: 1.8 }
  },

  // === NEW OPIOIDS / REVERSALS ===
  meperidine: {
    name: 'Meperidine', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (Normeperidine)', proteinBinding: 0.60, synergyGroup: 'Opioid', pkModel: 'Mather',
    indications: { 'Post-op Shivering': { dose: '12.5-25', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 60.0, V3: 100.0, k10: 0.05, k12: 0.08, k21: 0.04, k13: 0.02, k31: 0.01, ke0: 0.2, coSensitivity: 0.4 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: 15, rrMax: -8, inducesApneaAtCe: 2.0 } 
  },
  naloxone: {
    name: 'Naloxone', classes: ['Opioid Antagonist'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.45, mechanism: 'Competitive Antagonist', targetReceptor: 'Mu-Opioid',
    indications: { 'Opioid Reversal': { dose: '40-400', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 30.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, receptorAffinity: 2.0 }
  },

  // === NEW PARALYTICS ===
  pancuronium: {
    name: 'Pancuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'Hepatic / Renal', proteinBinding: 0.87, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Long-acting Paralysis': { dose: '0.08-0.1', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.015, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 0.4, gamma: 4, sysMax: 5, diaMax: 5, hrMax: 20, rrMax: -20, inducesParalysisAtCe: 0.3, inducesApneaAtCe: 0.3, receptorAffinity: 0.8 } 
  },

  // === NEW PRESSORS ===
  angiotensin_ii: {
    name: 'Angiotensin II', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases', mechanism: 'Agonist', targetReceptor: 'AT1',
    indications: { 'Refractory Shock': { dose: '20-80', unit: 'ng/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 2.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 3.0, coSensitivity: 0.05 },
    pd: { c50: 0.005, gamma: 2.0, sysMax: 60, diaMax: 70, hrMax: 0, rrMax: 0 }
  },
  methylene_blue: {
    name: 'Methylene Blue', classes: ['Vasopressor Adjunct'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Tissue reduction', mechanism: 'Inhibitor', targetReceptor: 'Nitric Oxide Synthase',
    indications: { 'Vasoplegia': { dose: '1-2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: 30, diaMax: 35, hrMax: 0, rrMax: 0 }
  },

  // === COAGULATION ===
  heparin: {
    name: 'Heparin', classes: ['Anticoagulant'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Reticuloendothelial', proteinBinding: 0.95, mechanism: 'Activator', targetReceptor: 'Antithrombin III',
    indications: { 'Cardiopulmonary Bypass': { dose: '300-400', unit: 'Units/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.015, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 1.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 } 
  },
  protamine: {
    name: 'Protamine Sulfate', classes: ['Reversal'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases', proteinBinding: 0, mechanism: 'Chelator', targetReceptor: 'Heparin',
    indications: { 'Heparin Reversal': { dose: '1.0', unit: 'mg/100U Heparin', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.0, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 } 
  },
  tranexamic_acid: {
    name: 'Tranexamic Acid (TXA)', classes: ['Antifibrinolytic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.03, mechanism: 'Inhibitor', targetReceptor: 'Plasminogen',
    indications: { 'Massive Hemorrhage': { dose: '1.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 },
    pd: { c50: 10.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 }
  },

  // === ANTIEMETICS & RESPIRATORY ===
  ondansetron: {
    name: 'Ondansetron', classes: ['Antiemetic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.73, mechanism: 'Antagonist', targetReceptor: '5-HT3',
    indications: { 'PONV Prophylaxis': { dose: '4.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.1, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 } 
  },
  dexamethasone: {
    name: 'Dexamethasone', classes: ['Corticosteroid'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.70, mechanism: 'Agonist', targetReceptor: 'Glucocorticoid',
    indications: { 'PONV Prophylaxis / Swelling': { dose: '4-8', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 40.0, V3: 0, k10: 0.01, k12: 0.02, k21: 0.01, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 }
  },
  albuterol: {
    name: 'Albuterol', classes: ['Beta-2 Agonist'], routes: ['Inhaled (via ETT)'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Tissue', proteinBinding: 0.10, mechanism: 'Agonist', targetReceptor: 'Beta-2',
    indications: { 'Bronchospasm': { dose: '2.5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 10.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.1 },
    pd: { c50: 0.02, gamma: 1.5, sysMax: 0, diaMax: -5, hrMax: 20, rrMax: 0 } 
  }
};

export const FLUIDS = {
  'Normal Saline (0.9% NS)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 154, cl: 154, k: 0, ca: 0, citrateLoad: 0,
    retentionIntact: 0.75, retentionInflamed: 0.20, osm: 308, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: 0 } 
  },
  'Lactated Ringers (LR)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 130, cl: 109, k: 4, ca: 1.5, citrateLoad: 0,
    retentionIntact: 0.80, retentionInflamed: 0.25, osm: 273, tonicity: 'Hypotonic', coag: { r: 0, ma: -1, angle: 0 } 
  },
  'Plasmalyte': { 
    type: 'Crystalloid', defaultVol: 1000, na: 140, cl: 98, k: 5, ca: 0, citrateLoad: 0,
    retentionIntact: 0.80, retentionInflamed: 0.25, osm: 294, tonicity: 'Isotonic', coag: { r: 0, ma: -1, angle: 0 } 
  },
  'Albumin 5%': { 
    type: 'Colloid', defaultVol: 500, na: 145, cl: 145, k: 0, ca: 0, citrateLoad: 0,
    retentionIntact: 1.0, retentionInflamed: 0.75, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: -2 } 
  },
  'Packed Red Blood Cells (PRBC)': { 
    type: 'Blood Product', defaultVol: 300, na: 0, cl: 0, k: 15, ca: 0, citrateLoad: 15, // High citrate load chelates ionized calcium
    retentionIntact: 1.0, retentionInflamed: 0.90, hct: 0.70, coag: { r: 0, ma: 0, angle: 0 } 
  }, 
  'Fresh Frozen Plasma (FFP)': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 10, 
    retentionIntact: 1.0, retentionInflamed: 0.90, coag: { r: -4, ma: 0, angle: 5 } 
  },
  'Platelets': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 5, 
    retentionIntact: 1.0, retentionInflamed: 0.90, coag: { r: -1, ma: 15, angle: 10 } 
  },
  'Cryoprecipitate': { 
    type: 'Blood Product', defaultVol: 50, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 2, 
    retentionIntact: 1.0, retentionInflamed: 0.95, coag: { r: 0, ma: 5, angle: 15 } 
  }
};