/**
 * PHARMACOLOGY DATA ENGINE (V2.0 - HIGH FIDELITY)
 * * Standards:
 * - IBW: Devine Formula
 * - LBW: Janmahasatian Formula
 * - MAC: Mapleson age-adjustment logic
 * - PK: Multi-compartment mammillary models
 * - PD: Sigmoid Emax (Hill Equation) parameters
 * - CA-1 Integration: Exact receptor affinities and fluid stoichiometry
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
    name: 'Sevoflurane', mac40: 2.0, bgPartition: 0.65, brainBgPartition: 1.7, vaporPress: 160, 
    sysMax: -30, diaMax: -25, hrMax: 0, rrMax: -15, 
    description: 'Sweet smelling, low pungency. Ideal for inhalational induction. Breaks down to Compound A. Produces fluoride ions.' 
  },
  desflurane: { 
    name: 'Desflurane', mac40: 6.0, bgPartition: 0.45, brainBgPartition: 1.3, vaporPress: 669, 
    sysMax: -25, diaMax: -25, hrMax: 15, rrMax: -15,
    description: 'Pungent, rapid offset. Risk of sympathetic surge/tachycardia if rapidly increased. Boils at sea level.'
  },
  isoflurane: { 
    name: 'Isoflurane', mac40: 1.2, bgPartition: 1.46, brainBgPartition: 1.6, vaporPress: 240, 
    sysMax: -35, diaMax: -35, hrMax: 5, rrMax: -15,
    description: 'Highly potent, slow kinetics. Potent vasodilator. Cardioprotective (ischemic preconditioning).'
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
    name: 'Nitrous Oxide', mac40: 104, bgPartition: 0.46, brainBgPartition: 1.1, vaporPress: 38770, 
    sysMax: 5, diaMax: 5, hrMax: 5, rrMax: -5,
    description: 'Low potency. Diffuses into air-filled cavities (pneumothorax, bowel, ETT cuff). NMDA antagonist analgesic.'
  }
};

export const MEDICATIONS = {
  // === SEDATIVES & HYPNOTICS ===
  dexmedetomidine: { 
    name: 'Dexmedetomidine', classes: ['Alpha-2 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2E6)', proteinBinding: 0.94, synergyGroup: 'Sedative', pkModel: 'Hannivoort-Colin',
    targetReceptor: 'Alpha-2', intracellularCascade: 'a2 (Gi-coupled) -> inhibits adenylate cyclase -> decreases cAMP in locus coeruleus',
    indications: { 'Sedation': { dose: '0.2-1.5', unit: 'mcg/kg/hr', type: 'Infusion' }, 'Loading Dose': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 25.0, V3: 40, k10: 0.06, k12: 0.08, k21: 0.04, k13: 0.02, k31: 0.01, ke0: 0.5, coSensitivity: 0.2 },
    pd: { c50: 1.2, gamma: 1.5, sysMax: -20, diaMax: -20, hrMax: -30, rrMax: -2, inducesApneaAtCe: 999 },
    notes: 'Bradycardia and hypotension (initial hypertension with fast bolus due to peripheral alpha-2b stimulation). Mimics natural sleep N3 EEG. Reduces postoperative delirium.'
  },
  etomidate: { 
    name: 'Etomidate', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Esterase / Hepatic', proteinBinding: 0.77, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    targetReceptor: 'GABA-A', intracellularCascade: 'Enhances GABA binding -> increases Chloride (Cl-) influx -> cellular hyperpolarization',
    indications: { 'Induction (Cardio-stable)': { dose: '0.2-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 40.0, V3: 120, k10: 0.1, k12: 0.15, k21: 0.08, k13: 0.05, k31: 0.01, ke0: 1.8, coSensitivity: 0.1 },
    pd: { c50: 0.3, gamma: 3, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -12, inducesApneaAtCe: 0.4 },
    notes: 'Maintains hemodynamic stability (minimal direct cardiac or SVR changes). Side effects include severe myoclonus, thrombophlebitis, and transient adrenocortical inhibition (lasts 4-8 hours due to 11-beta-hydroxylase blockade). High PONV risk.'
  },
  ketamine: { 
    name: 'Ketamine', classes: ['Dissociative', 'Analgesic'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (CYP3A4/2C9) to active Norketamine', proteinBinding: 0.12, synergyGroup: 'Dissociative', pkModel: 'Domino/Clements250',
    targetReceptor: 'NMDA Antagonist', intracellularCascade: 'Non-competitive NMDA receptor antagonist -> blocks Glutamate/Ca2+ influx',
    indications: { 'Induction': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' }, 'Pain/Agitation': { dose: '0.1-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 45.0, V3: 150, k10: 0.15, k12: 0.2, k21: 0.1, k13: 0.05, k31: 0.02, ke0: 1.5, coSensitivity: 0.4 },
    pd: { c50: 1.0, gamma: 2, sysMax: 30, diaMax: 20, hrMax: 20, rrMax: -2, inducesApneaAtCe: 5.0 },
    notes: 'Sympathomimetic (increases BP, HR, and CO via neuronal uptake blockade of catecholamines; can cause profound hypotension in catech-depleted shock). Increases secretions (often co-admin Glycopyrrolate) and triggers emergence delirium/hallucinations (prevented by Midazolam).'
  },
  midazolam: { 
    name: 'Midazolam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4) to active 1-hydroxymidazolam', proteinBinding: 0.94, synergyGroup: 'Sedative', pkModel: 'Greenblatt',
    targetReceptor: 'GABA-A', intracellularCascade: 'Allosteric GABA-A modulator -> increases frequency of Chloride (Cl-) channel opening',
    indications: { 'Pre-op Anxiolysis': { dose: '0.02-0.04', unit: 'mg/kg', type: 'Bolus' }, 'Sedation': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 12.0, V2: 30.0, V3: 80, k10: 0.12, k12: 0.1, k21: 0.05, k13: 0.03, k31: 0.01, ke0: 0.8, coSensitivity: 0.2 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: 0, rrMax: -6, inducesApneaAtCe: 0.2 },
    notes: 'Anterograde amnesia, anxiolysis, anticonvulsant. Heavy synergy with opioids (induces respiratory depression). Reversible with Flumazenil.'
  },
  propofol: { 
    name: 'Propofol', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'LBW',
    metabolism: 'Hepatic and Extrahepatic (conjugation)', proteinBinding: 0.97, synergyGroup: 'Sedative', pkModel: 'Schnider',
    targetReceptor: 'GABA-A', intracellularCascade: 'Enhances GABA binding -> increases Chloride (Cl-) influx -> cellular hyperpolarization',
    indications: { 'Induction': { dose: '1.5-2.5', unit: 'mg/kg', type: 'Bolus' }, 'Maintenance (TIVA)': { dose: '100-200', unit: 'mcg/kg/min', type: 'Infusion' }, 'Sedation': { dose: '25-50', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 4.27, V2: 18.9, V3: 238, k10: 0.443, k12: 0.303, k21: 0.055, k13: 0.196, k31: 0.0033, ke0: 1.2, coSensitivity: 0.6 },
    pd: { c50: 2.5, gamma: 2, sysMax: -40, diaMax: -30, hrMax: -15, rrMax: -14, inducesApneaAtCe: 2.5 },
    notes: 'Decreases CMRO2, CBF, and ICP. Anticonvulsant. Potent venodilator and direct myocardial depressant. Antiemetic at sub-hypnotic doses. Prolonged high dose (>67 mcg/kg/min or 4 mg/kg/hr for >48h) risks Propofol Infusion Syndrome (PRIS: acidosis, rhabdo, bradycardia, lipemic plasma).'
  },

  // === OPIOIDS & ANALGESICS ===
  fentanyl: { 
    name: 'Fentanyl', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (CYP3A4) to inactive norfentanyl', proteinBinding: 0.84, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Analgesia': { dose: '25-100', unit: 'mcg', type: 'Bolus' }, 'Induction': { dose: '1-3', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 13.0, V2: 30.0, V3: 250, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0.05, k31: 0.01, ke0: 0.15, coSensitivity: 0.8 },
    pd: { c50: 0.002, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: -20, rrMax: -12, inducesApneaAtCe: 0.003 },
    notes: 'Highly lipophilic. Highly synergistic with volatiles/sedatives. Can cause chest wall rigidity (stiff joint syndrome) with large rapid boluses.'
  },
  hydromorphone: { 
    name: 'Hydromorphone', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (glucuronidation) to inactive H3G', proteinBinding: 0.19, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Analgesia': { dose: '0.2-1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 150, k10: 0.03, k12: 0.05, k21: 0.02, k13: 0.02, k31: 0.01, ke0: 0.1, coSensitivity: 0.5 },
    pd: { c50: 0.015, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -10, rrMax: -14, inducesApneaAtCe: 0.02 },
    notes: '7x more potent than morphine. Safe in renal failure (no active metabolites accumulate).'
  },
  morphine: { 
    name: 'Morphine', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (Glucuronidation) to active metabolites', proteinBinding: 0.35, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    activeMetabolites: ['Morphine-6-glucuronide', 'Morphine-3-glucuronide'],
    indications: { 'Analgesia': { dose: '2.0-4.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 50.0, V3: 200, k10: 0.02, k12: 0.04, k21: 0.02, k13: 0.01, k31: 0.005, ke0: 0.05, coSensitivity: 0.5 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -15, diaMax: -20, hrMax: -5, rrMax: -14, inducesApneaAtCe: 0.08 },
    notes: 'Triggers heavy histamine release (hypotension, flushing, pruritus). STRICT renal warning: Morphine-6-glucuronide (M6G) is highly active and accumulates in renal failure causing prolonged respiratory depression; Morphine-3-glucuronide (M3G) accumulates causing neuroexcitation and seizures.'
  },
  remifentanil: { 
    name: 'Remifentanil', classes: ['Opioid (Ultra-short)'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'IBW',
    metabolism: 'Nonspecific Blood & Tissue Esterases', proteinBinding: 0.70, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Maintenance': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' }, 'Intubation Spike': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 10.0, V3: 15.0, k10: 1.5, k12: 0.8, k21: 0.5, k13: 0.2, k31: 0.1, ke0: 2.5, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 2.5, sysMax: -20, diaMax: -15, hrMax: -30, rrMax: -14, inducesApneaAtCe: 0.0015 },
    notes: 'Context-independent half-life (constant 3-5 min offset regardless of infusion duration). Fast bolus causes severe bradycardia. Prolonged infusion at >0.15 mcg/kg/min triggers acute opioid tolerance and Opioid-Induced Hyperalgesia (OIH).'
  },
  sufentanil: { 
    name: 'Sufentanil', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.92, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Analgesia': { dose: '5-10', unit: 'mcg', type: 'Bolus' }, 'Induction': { dose: '0.1-0.3', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 25.0, V3: 150, k10: 0.04, k12: 0.08, k21: 0.04, k13: 0.04, k31: 0.01, ke0: 0.12, coSensitivity: 0.8 },
    pd: { c50: 0.0003, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -25, rrMax: -15, inducesApneaAtCe: 0.0005 },
    notes: '10x more potent than fentanyl. Extremely potent, highly lipophilic. Causes cardiovascular stability but severe respiratory depression.'
  },

  // === PARALYTICS & REVERSALS ===
  cisatracurium: { 
    name: 'Cisatracurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hoffmann Elimination', proteinBinding: 0.82, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.15-0.2', unit: 'mg/kg', type: 'Bolus' }, 'Infusion': { dose: '1-3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.0 }, 
    pd: { c50: 0.3, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.2, inducesApneaAtCe: 0.2, receptorAffinity: 0.85 },
    notes: 'Organ-independent clearance (spontaneous chemical degradation in blood/tissues via temperature/pH-dependent Hoffmann elimination). Ideal for renal and liver failure. Slowly forms active metabolite laudanosine (seizure threshold lowering, but rarely clinically relevant).'
  },
  glycopyrrolate: { 
    name: 'Glycopyrrolate', classes: ['Anticholinergic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.0, mechanism: 'Antagonist', targetReceptor: 'Muscarinic (M2/M3)', intracellularCascade: 'Antagonizes M2 (Gi-coupled) at SA/AV node -> prevents cAMP decrease -> increases HR',
    indications: { 'Reversal Adjunct': { dose: '0.2', unit: 'mg', type: 'Bolus' }, 'Bradycardia': { dose: '0.2-0.4', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.01, gamma: 2, sysMax: 0, diaMax: 0, hrMax: 35, rrMax: 0, receptorAffinity: 0.90 },
    notes: 'Quaternary amine. Does NOT cross the Blood-Brain Barrier (no central anticholinergic syndrome). Specifically targets peripheral muscarinic receptors. Co-administered with Neostigmine to block severe muscarinic bradycardia.'
  },
  neostigmine: { 
    name: 'Neostigmine', classes: ['AChE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic and Renal (50%)', proteinBinding: 0.20, mechanism: 'Inhibitor', targetReceptor: 'Acetylcholinesterase', intracellularCascade: 'Inhibits AChE -> ACh accumulates -> massive M2 (Gi) activation -> severe bradycardia if unopposed',
    indications: { 'Reversal': { dose: '0.04-0.05', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.04, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.02, gamma: 2, sysMax: 0, diaMax: 0, hrMax: -40, rrMax: 0, achDisplacementPower: 1.5 },
    notes: 'Reverses NDMR block by inhibiting Acetylcholinesterase, raising synaptic ACh levels to outcompete paralytics. MUST be co-administered with Glycopyrrolate. Omitting Glycopyrrolate triggers profound muscarinic activation: severe bradycardia (HR to 20 or asystole), salivation, bronchospasm, pupillary constriction.'
  },
  rocuronium: { 
    name: 'Rocuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (excreted unchanged in bile >70%, renal 10-20%)', proteinBinding: 0.30, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.6', unit: 'mg/kg', type: 'Bolus' }, 'RSI': { dose: '1.2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 16.0, V2: 30.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.3 },
    pd: { c50: 1.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 1.0, inducesApneaAtCe: 1.0, receptorAffinity: 0.70 },
    notes: 'Rapid onset, intermediate-acting NDMR. Can be fully encapsulated and reversed by Sugammadex at any depth. Interacts with Sugammadex on a 1:1 molar basis.'
  },
  succinylcholine: { 
    name: 'Succinylcholine', classes: ['Depolarizing NMBA'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Pseudocholinesterase (butyrylcholinesterase) to succinylmonocholine', mechanism: 'Agonist', targetReceptor: 'nAChR (Agonist)', intracellularCascade: 'Depolarizing agonist -> opens Na+/K+ channels -> fasciculations -> desensitization phase',
    indications: { 'RSI': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 1.8, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 15, rrMax: -20, inducesParalysisAtCe: 0.3, inducesApneaAtCe: 0.3, receptorAffinity: 1.2 },
    notes: 'Ultra-rapid depolarizing NMBA. Fasciculations are common. STRICTLY CONTRAINDICATED in patients with: pre-existing hyperkalemia, severe burns (>24 hours to 1-2 years), massive trauma/crush injury, upper motor neuron disease, muscular dystrophy, prolonged immobility, open globe injuries, or history of Malignant Hyperthermia (MH) due to lethal hyperkalemic cardiac arrest via extrajunctional nAChR upregulation.'
  },
  sugammadex: { 
    name: 'Sugammadex', classes: ['Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal excretion (unchanged)', mechanism: 'Chelator', targetReceptor: 'Rocuronium/Vecuronium',
    indications: { 'Routine Reversal': { dose: '2.0-4.0', unit: 'mg/kg', type: 'Bolus' }, 'Immediate Rescue': { dose: '16.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0 }, 
    pd: { c50: 0, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, chelationRatio: 1.0 },
    notes: 'Modified gamma-cyclodextrin. Encapsulates and inactivates Rocuronium and Vecuronium. Deep reversal (TOF 0, PTC >= 2) requires 4 mg/kg. Immediate rescue reversal for "Cannot Intubate Cannot Ventilate" (CICV) after 1.2 mg/kg Rocuronium requires exactly 16 mg/kg.'
  },
  vecuronium: { 
    name: 'Vecuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (deacetylation 30-40%) to active metabolites, renal 20-30%', proteinBinding: 0.70, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    activeMetabolite: '3-desacetylvecuronium',
    indications: { 'Intubation': { dose: '0.1', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 25.0, V3: 0, k10: 0.05, k12: 0.04, k21: 0.04, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0.2 }, 
    pd: { c50: 0.2, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.15, inducesApneaAtCe: 0.15, receptorAffinity: 0.75 },
    notes: 'Intermediate-acting NDMR. STRICT renal warning: Hepatic deacetylation forms 3-desacetylvecuronium, an active metabolite (has 80% potency of parent compound) which is renal-excreted and accumulates heavily in renal failure, causing severe prolonged paralysis. Can be reversed by Sugammadex.'
  },

  // === INOTROPES & VASOPRESSORS ===
  dobutamine: { 
    name: 'Dobutamine', classes: ['Inotrope'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (COMT/conjugation)', mechanism: 'Agonist', targetReceptor: 'Beta-1 > Beta-2', intracellularCascade: 'Low Dose: B1 (Gs -> cAMP), High Dose: B1/B2 (Gs -> cAMP) + a1 (Gq -> IP3/DAG/Ca2+)',
    indications: { 'Low CO': { dose: '2.5-10', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: 20, diaMax: -15, hrMax: 30, rrMax: 0 },
    notes: 'Synthetic catecholamine. Increases cardiac output and heart rate; causes mild peripheral vasodilation (Beta-2) that can lower SVR.'
  },
  dopamine: { 
    name: 'Dopamine', classes: ['Inotrope/Pressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'D1, Beta-1, Alpha-1', intracellularCascade: 'Low: D1 (Gs -> cAMP). Med: B1 (Gs -> cAMP). High: a1 (Gq -> IP3/DAG/Ca2+)',
    indications: { 'Support': { dose: '5-15', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.4, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.01, gamma: 1.5, sysMax: 30, diaMax: 20, hrMax: 40, rrMax: 0 },
    notes: 'Dose-dependent receptor profiles: low dose (1-3 mcg/kg/min) is dopaminergic D1 vasodilation; intermediate (3-10 mcg/kg/min) is Beta-1 inotropic; high dose (10-20 mcg/kg/min) is Alpha-1 vasopressor.'
  },
  ephedrine: { 
    name: 'Ephedrine', classes: ['Mixed Agonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (minimal), mostly excreted unchanged', mechanism: 'Direct/Indirect Agonist', targetReceptor: 'Alpha-1, Beta-1, Beta-2 (Direct & Indirect)', intracellularCascade: 'Indirect NE release + Direct: a1 (Gq->Ca2+), B1/B2 (Gs->cAMP)',
    indications: { 'Hypotension': { dose: '5-10', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 1.5, sysMax: 40, diaMax: 25, hrMax: 30, rrMax: 0, receptors: { Alpha1: 2, Beta1: 3, Beta2: 2 } },
    notes: 'Mixed-acting synthetic amine (direct agonist + stimulates endogenous release of norepinephrine). Causes tachyphylaxis (endogenous catecholamine depletion). Restores BP while increasing/maintaining HR.'
  },
  epinephrine: { 
    name: 'Epinephrine', classes: ['Vasopressor', 'Inotrope'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-1, Beta-1, Beta-2', intracellularCascade: 'a1 (Gq -> IP3/DAG/Ca2+), B1/B2 (Gs -> adenylate cyclase -> cAMP)',
    indications: { 'Push Dose': { dose: '10-20', unit: 'mcg', type: 'Bolus' }, 'Code': { dose: '1.0', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '0.01-0.1', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.8, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 }, 
    pd: { c50: 0.002, gamma: 1.5, sysMax: 60, diaMax: 30, hrMax: 50, rrMax: 0, receptors: { Alpha1: 3, Beta1: 3, Beta2: 2 } },
    notes: 'Endogenous catecholamine. Potent inotrope and chronotrope (Beta-1) and vasopressor (Alpha-1). Low doses cause peripheral vasodilation (Beta-2). Primary ACLS arrest code drug.'
  },
  milrinone: { 
    name: 'Milrinone', classes: ['PDE3 Inhibitor'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (80% unchanged)', mechanism: 'Inhibitor', targetReceptor: 'PDE3', intracellularCascade: 'Inhibits PDE3 -> Prevents cAMP degradation -> increased intracellular Ca2+ (inotropy) & smooth muscle relaxation',
    indications: { 'Inotropy': { dose: '0.375-0.75', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 1.5, sysMax: 10, diaMax: -20, hrMax: 10, rrMax: 0 },
    notes: 'Inodilator. Inhibits phosphodiesterase III, increasing intracellular cAMP in myocardium (inotropy) and vascular smooth muscle (vasodilation, lowers SVR and pulmonary artery pressure). Highly renal dependent.'
  },
  norepinephrine: { 
    name: 'Norepinephrine', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-1 > Beta-1', intracellularCascade: 'a1 (Gq -> IP3/DAG -> intracellular Ca2+) >> B1 (Gs -> cAMP)', intracellularCascade: 'a1 (Gq -> IP3/DAG/Ca2+), B1/B2 (Gs -> adenylate cyclase -> cAMP)',
    indications: { 'Shock / Vasoplegia': { dose: '0.01-0.3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 8.0, V2: 0, V3: 0, k10: 0.6, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: 40, diaMax: 50, hrMax: 10, rrMax: 0, receptors: { Alpha1: 3, Beta1: 2, Beta2: 0 } },
    notes: 'Endogenous catecholamine. Powerful vasoconstrictor (Alpha-1) with mild inotropic cardiac support (Beta-1). Primary vasopressor for septic and vasodilatory shock.'
  },
  phenylephrine: { 
    name: 'Phenylephrine', classes: ['Alpha-1 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (MAO)', mechanism: 'Agonist', targetReceptor: 'Alpha-1', intracellularCascade: 'Selective a1 (Gq-coupled -> Phospholipase C -> IP3/DAG -> intracellular Ca2+ release)',
    indications: { 'Push Dose': { dose: '50-100', unit: 'mcg', type: 'Bolus' }, 'Infusion': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.02, gamma: 1, sysMax: 30, diaMax: 45, hrMax: -15, rrMax: 0, receptors: { Alpha1: 3, Beta1: 0, Beta2: 0 } },
    notes: 'Pure direct-acting Alpha-1 agonist. Causes selective arteriolar vasoconstriction. Triggers baroreceptor-mediated reflex bradycardia (reduces HR while raising BP). Neutral to slightly negative effect on CO.'
  },
  vasopressin: { 
    name: 'Vasopressin', classes: ['V1 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Tissue Peptidases', mechanism: 'Agonist', targetReceptor: 'V1 Receptors', intracellularCascade: 'V1 (Gq-coupled -> Phospholipase C -> IP3/DAG -> intracellular Ca2+ release in vascular smooth muscle)',
    indications: { 'Push Dose': { dose: '1-2', unit: 'Unit', type: 'Bolus' }, 'Infusion': { dose: '0.04', unit: 'Unit/min', type: 'Infusion' } },
    pk: { V1: 12.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.1 }, 
    pd: { c50: 0.05, gamma: 2, sysMax: 20, diaMax: 35, hrMax: -5, rrMax: 0, receptors: { V1: 3 } },
    notes: 'Endogenous antidiuretic hormone. Binds vascular V1 receptors, inducing constriction. Bypasses adrenergic receptor pathways (highly effective in acidic and refractory sympathoplegic shock).'
  },

  // === ANTIHYPERTENSIVES ===
  clevidipine: { 
    name: 'Clevidipine', classes: ['CCB'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Esterases (hydrolysis)', mechanism: 'Blocker', targetReceptor: 'L-type Calcium', intracellularCascade: 'Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle -> prevents Ca2+ influx',
    indications: { 'HTN': { dose: '2-4', unit: 'mg/hr', type: 'Infusion' } },
    pk: { V1: 4.0, V2: 0, V3: 0, k10: 0.3, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.02, gamma: 2.0, sysMax: -30, diaMax: -40, hrMax: 15, rrMax: 0 },
    notes: 'Dihydropyridine calcium channel blocker. Fast-acting arterial dilator. Extremely short half-life (~1 min) due to rapid blood esterase metabolism.'
  },
  clonidine: { 
    name: 'Clonidine', classes: ['Alpha-2 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal', mechanism: 'Agonist', targetReceptor: 'Alpha-2', intracellularCascade: 'a2 (Gi-coupled) -> inhibits adenylate cyclase -> decreases cAMP',
    indications: { 'HTN / Sympatholysis': { dose: '150-300', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 40.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -25, diaMax: -15, hrMax: -20, rrMax: -2 },
    notes: 'Centrally-acting Alpha-2 agonist. Reduces sympathetic outflow, lowering SVR and HR.'
  },
  enalaprilat: { 
    name: 'Enalaprilat', classes: ['ACE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', mechanism: 'Inhibitor', targetReceptor: 'ACE',
    indications: { 'HTN': { dose: '1.25-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.015, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.5, sysMax: -25, diaMax: -20, hrMax: 0, rrMax: 0 },
    notes: 'Active IV form of enalapril. Inhibits Angiotensin Converting Enzyme. Can cause refractory intraoperative hypotension if not held on day of surgery.'
  },
  esmolol: { 
    name: 'Esmolol', classes: ['Beta-1 Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'RBC Esterases', mechanism: 'Antagonist', targetReceptor: 'Beta-1', intracellularCascade: 'B1 antagonist -> blocks Gs-coupled activation -> decreases cAMP in myocardium',
    indications: { 'Tachycardia': { dose: '10-20', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '50-100', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 3.3, V2: 0, V3: 0, k10: 0.4, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.5, sysMax: -15, diaMax: -10, hrMax: -30, rrMax: 0 },
    notes: 'Ultra-short acting cardioselective Beta-1 blocker. Metabolized via red blood cell esterases (half-life ~9 mins). Lowers HR and BP rapidly.'
  },
  hydralazine: { 
    name: 'Hydralazine', classes: ['Arterial Vasodilator'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (N-acetylation)', mechanism: 'Direct Dilator', targetReceptor: 'Arterial Smooth Muscle',
    indications: { 'HTN': { dose: '5-20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0, k31: 0, ke0: 0.02, coSensitivity: 0.3 }, 
    pd: { c50: 1.5, gamma: 1.5, sysMax: -40, diaMax: -30, hrMax: 25, rrMax: 0 },
    notes: 'Direct arterial smooth muscle vasodilator. Prompts slow, progressive BP reduction but triggers profound reflex tachycardia. Slow onset (15-20 min).'
  },
  labetalol: { 
    name: 'Labetalol', classes: ['Mixed Alpha/Beta'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Alpha-1, Beta-1/2', intracellularCascade: 'Mixed antagonist -> blocks a1 (Gq), B1/B2 (Gs) -> prevents Ca2+ release and cAMP production',
    indications: { 'HTN': { dose: '10-20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 60.0, V2: 0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 2.0, sysMax: -40, diaMax: -35, hrMax: -20, rrMax: 0 },
    notes: 'Mixed competitive antagonist. 1:7 Alpha-1 to Beta blockade ratio when given IV. Lowers SVR and SBP while preventing reflex tachycardia.'
  },
  metoprolol: { 
    name: 'Metoprolol', classes: ['Beta-1 Blocker'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6)', proteinBinding: 0.12, mechanism: 'Antagonist', targetReceptor: 'Beta-1', intracellularCascade: 'B1 antagonist -> blocks Gs-coupled activation -> decreases cAMP in myocardium',
    indications: { 'Tachycardia': { dose: '2.5-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.02, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 1.5, sysMax: -20, diaMax: -15, hrMax: -35, rrMax: 0 },
    notes: 'Cardioselective Beta-1 adrenergic blocker. Intermediate acting. Lowers heart rate and contractility.'
  },
  nicardipine: { 
    name: 'Nicardipine', classes: ['CCB'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Blocker', targetReceptor: 'L-type Calcium', intracellularCascade: 'Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle -> prevents Ca2+ influx',
    indications: { 'HTN': { dose: '5-15', unit: 'mg/hr', type: 'Infusion' } },
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 2.0, sysMax: -25, diaMax: -35, hrMax: 10, rrMax: 0 },
    notes: 'Dihydropyridine calcium channel blocker. Strong selective arterial vasodilator. Excellent for stable, titrated SVR and SBP reduction.'
  },
  nitroglycerin: { 
    name: 'Nitroglycerin', classes: ['Venodilator'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Blood (rapid enzymatic conversion)', mechanism: 'Nitric Oxide Donator', targetReceptor: 'Venous Smooth Muscle',
    indications: { 'Ischemia': { dose: '10-20', unit: 'mcg/min', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.25, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: -20, diaMax: -30, hrMax: 10, rrMax: 0 },
    notes: 'Selective venous vasodilator (reduces cardiac preload and wall tension). Promotes coronary collateral perfusion. High dose triggers arterial dilation. Risks Methemoglobinemia in high continuous doses.'
  },
  nitroprusside: { 
    name: 'Nitroprusside', classes: ['Mixed Dilator'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'RBCs (Cyanide release)', mechanism: 'Nitric Oxide Donator', targetReceptor: 'Arterial/Venous Muscle',
    indications: { 'HTN Crisis': { dose: '0.3-0.5', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.3, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.002, gamma: 2.0, sysMax: -40, diaMax: -40, hrMax: 20, rrMax: 0 },
    notes: 'Balanced arterial and venous smooth muscle dilator. High potency, immediate effect. STRICT safety warning: Photodegradable. Releases 5 cyanide groups per molecule. Prolonged or high-dose infusion (>2 mcg/kg/min) risks lethal Cyanide Toxicity (inhibits cytochrome c oxidase, blocking oxidative phosphorylation, causing profound cellular hypoxia, lactic acidosis, and elevated mixed venous oxygen).'
  },
  phentolamine: { 
    name: 'Phentolamine', classes: ['Alpha Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Alpha-1, Alpha-2',
    indications: { 'Pheochromocytoma': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.15, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 2.0, sysMax: -50, diaMax: -40, hrMax: 30, rrMax: 0 },
    notes: 'Nonselective competitive alpha-adrenergic blocker. Fast-acting. Triggers reflex tachycardia due to Alpha-2 blockade.'
  },

  // === DIURETICS ===
  acetazolamide: { 
    name: 'Acetazolamide', classes: ['CA Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'Inhibitor', targetReceptor: 'Carbonic Anhydrase',
    indications: { 'Metabolic Alkalosis': { dose: '250-500', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 }, 
    pd: { c50: 5.0, gamma: 1.0, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: 5 },
    notes: 'Inhibits proximal tubule carbonic anhydrase, blocking bicarbonate reabsorption and inducing metabolic acidosis.'
  },
  bumetanide: { 
    name: 'Bumetanide', classes: ['Loop Diuretic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal', mechanism: 'Inhibitor', targetReceptor: 'Na-K-2Cl Symporter',
    indications: { 'Edema / Oliguria': { dose: '0.5-2.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 6.0, V2: 10.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 0.05, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 },
    notes: 'Potent loop diuretic, 40x more potent than furosemide. Blocks thick ascending limb Na-K-2Cl transport.'
  },
  furosemide: { 
    name: 'Furosemide', classes: ['Loop Diuretic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal and Hepatic', mechanism: 'Inhibitor', targetReceptor: 'Na-K-2Cl Symporter',
    indications: { 'Edema / Oliguria': { dose: '20-80', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 12.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 },
    notes: 'Classic loop diuretic. Exerts moderate direct venous vasodilatory effect prior to diuresis. Prompts renal excretion of potassium.'
  },
  mannitol: { 
    name: 'Mannitol 20%', classes: ['Osmotic Diuretic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'Osmotic Agent', targetReceptor: 'Tubular Lumen',
    indications: { 'Elevated ICP': { dose: '50-100', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 }, 
    pd: { c50: 50.0, gamma: 1.0, sysMax: 5, diaMax: 5, hrMax: -5, rrMax: 0 },
    notes: 'Osmotic diuretic. Increases intravascular volume initially (pre-diuresis, caution in HF/pulmonary edema), then draws water from brain parenchyma to reduce intracranial pressure.'
  },

  // === ANTIARRHYTHMICS & ELECTROLYTES ===
  adenosine: { 
    name: 'Adenosine', classes: ['Purinergic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'RBC and Endothelial cell uptake (rapid deamination)', mechanism: 'Agonist', targetReceptor: 'A1 Receptors', intracellularCascade: 'A1 (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> activates K-ACh channels -> hyperpolarization',
    indications: { 'SVT': { dose: '6-12', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 5.0, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 5.0, coSensitivity: 0.1 }, 
    pd: { c50: 0.2, gamma: 4.0, sysMax: -40, diaMax: -20, hrMax: -150, rrMax: 0 },
    notes: 'Activates G-protein-coupled A1 receptors, increasing potassium efflux and hyperpolarizing AV nodal tissue to terminate SVT. Extremely short half-life (<10 sec). Bolus must be rapid.'
  },
  amiodarone: { 
    name: 'Amiodarone', classes: ['Class III'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4) to active desethylamiodarone', mechanism: 'K+ Channel Blocker', targetReceptor: 'Potassium Channels',
    indications: { 'VT/VF Arrest': { dose: '300', unit: 'mg', type: 'Bolus' }, 'Stable VT': { dose: '150', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 500.0, V2: 0, V3: 0, k10: 0.005, k12: 0.02, k21: 0.01, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.5 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -25, diaMax: -20, hrMax: -20, rrMax: 0 },
    notes: 'Broad-spectrum antiarrhythmic exhibiting characteristics of all 4 Vaughan Williams classes. Extremely high volume of distribution and half-life (weeks).'
  },
  atropine: { 
    name: 'Atropine', classes: ['Anticholinergic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (50%), renal unchanged (50%)', mechanism: 'Antagonist', targetReceptor: 'Muscarinic (M2/M3)', intracellularCascade: 'Antagonizes M2 (Gi-coupled) at SA/AV node -> prevents cAMP decrease -> increases HR',
    indications: { 'Bradycardia': { dose: '0.5-1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.08, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.02, gamma: 2.0, sysMax: 5, diaMax: 5, hrMax: 55, rrMax: 0 },
    notes: 'Tertiary amine. Crosses BBB (can cause central anticholinergic syndrome in elderly). Blocks vagal stimulation to SA/AV nodes, increasing HR.'
  },
  bicarbonate: { 
    name: 'Sodium Bicarbonate', classes: ['Buffer'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Reacts to release CO2 via lungs', mechanism: 'Alkalinizer', targetReceptor: 'Plasma pH',
    indications: { 'Metabolic Acidosis': { dose: '50', unit: 'mEq', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.0, sysMax: 5, diaMax: 5, hrMax: 0, rrMax: 0 },
    notes: 'Buffers excess hydrogen ions. Generates heavy CO2 load (requires adequate ventilation to eliminate). Precipitously shifts potassium intracellularly.'
  },
  calcium: { 
    name: 'Calcium Chloride', classes: ['Electrolyte'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Skeletal / Renal', mechanism: 'Inotrope', targetReceptor: 'Myocardium',
    indications: { 'Hypocalcemia/Inotropy': { dose: '0.5-1.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.1, gamma: 1.5, sysMax: 25, diaMax: 15, hrMax: -5, rrMax: 0 },
    notes: 'Contains 3x more elemental calcium than calcium gluconate. Stabilizes myocardial resting membranes in severe hyperkalemia. Boosts inotropy. Highly irritating to veins (causes severe phlebitis/necrosis if extravasated, CVC preferred). Strict warning: Do NOT mix with Bicarbonate in same IV line (precipitates).'
  },
  digoxin: { 
    name: 'Digoxin', classes: ['Cardiac Glycoside'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'LBW',
    metabolism: 'Renal excretion (unchanged)', mechanism: 'Inhibitor', targetReceptor: 'Na+/K+-ATPase',
    indications: { 'Rate Control': { dose: '0.25-0.5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 50.0, V2: 300.0, V3: 0, k10: 0.005, k12: 0.02, k21: 0.01, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 }, 
    pd: { c50: 1.5, gamma: 1.5, sysMax: 10, diaMax: 5, hrMax: -20, rrMax: 0 },
    notes: 'Inhibits Na+/K+-ATPase, indirectly increasing intracellular Ca2+ (inotropic) while increasing vagal tone (slowing AV conduction). Highly renal dependent.'
  },
  diltiazem: { 
    name: 'Diltiazem', classes: ['Class IV CCB'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4) to active deacetyldiltiazem', mechanism: 'Blocker', targetReceptor: 'L-type Calcium', intracellularCascade: 'Non-DHP CCB -> blocks L-type VGCCs in myocardium/AV node -> prevents Ca2+ influx',
    indications: { 'Afib / Rate Control': { dose: '10-20', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '5-15', unit: 'mg/hr', type: 'Infusion' } },
    pk: { V1: 30.0, V2: 60.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.2 }, 
    pd: { c50: 0.5, gamma: 2.0, sysMax: -20, diaMax: -20, hrMax: -25, rrMax: 0 },
    notes: 'Benzothiazepine CCB. Slows AV nodal conduction. Negatively inotropic and vasodilatory.'
  },
  ibutilide: { 
    name: 'Ibutilide', classes: ['Class III'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Agonist', targetReceptor: 'Slow Inward Na+',
    indications: { 'Chemical Cardioversion': { dose: '1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.2 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -10, rrMax: 0 },
    notes: 'Class III antiarrhythmic. Prolongs action potential duration. High risk of Torsades de Pointes (QT prolongation).'
  },
  lidocaine: { 
    name: 'Lidocaine', classes: ['Class IB'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP1A2) to active MEGX', proteinBinding: 0.70, mechanism: 'Na+ Channel Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'VT/VF Arrest': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.05, k12: 0.08, k21: 0.04, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.2 }, 
    pd: { c50: 3.0, gamma: 2, sysMax: -10, diaMax: -10, hrMax: -5, rrMax: 0 },
    notes: 'Class IB antiarrhythmic. Fast sodium channel blocker. Blocks active/ischemic cardiac cells. High doses risk LAST (Local Anesthetic Systemic Toxicity: seizures, cardiovascular collapse).'
  },
  benzocaine: {
    name: 'Benzocaine', classes: ['Local Anesthetic'], routes: ['Topical'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Cholinesterase', proteinBinding: 0, mechanism: 'Na+ Channel Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Topical Anesthesia': { dose: '1.0-2.0', unit: 'sprays', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Ester local anesthetic. Used for topical mucosal anesthesia. High risk of inducing Methemoglobinemia due to oxidation of hemoglobin to methemoglobin.'
  },
  prilocaine: {
    name: 'Prilocaine', classes: ['Local Anesthetic'], routes: ['Topical', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic to o-toluidine active metabolite', proteinBinding: 0.55, mechanism: 'Na+ Channel Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Local Infiltration': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -5, rrMax: 0 },
    notes: 'Amide local anesthetic. Metabolized to o-toluidine, which oxidizes hemoglobin to methemoglobin, risking severe Methemoglobinemia.'
  },
  magnesium: { 
    name: 'Magnesium Sulfate', classes: ['Electrolyte'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal excretion', mechanism: 'Membrane Stabilizer', targetReceptor: 'Ca2+/K+ Channels',
    indications: { 'Torsades / Pre-Eclampsia': { dose: '1-2', unit: 'g', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.02, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.0, sysMax: -15, diaMax: -20, hrMax: -5, rrMax: 0 },
    notes: 'Calcium antagonist. Excellent membrane stabilizer. Reduces acetylcholine release at the motor endplate. Interacts with paralytics: pre-existing hypermagnesemia (e.g. OB pre-eclampsia) heavily enhances NMBA block (requires reducing Vec/Roc doses by 25-50%).'
  },
  procainamide: { 
    name: 'Procainamide', classes: ['Class IA'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (acetylation) to active NAPA', mechanism: 'Na+ Channel Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Stable VT / WPW': { dose: '20-50', unit: 'mg/min', type: 'Infusion' } },
    pk: { V1: 35.0, V2: 60.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 }, 
    pd: { c50: 4.0, gamma: 1.5, sysMax: -20, diaMax: -15, hrMax: -10, rrMax: 0 },
    notes: 'Class IA antiarrhythmic. Prolongs refractory period. Exerts moderate ganglionic-blocking vasodilatory effect.'
  },
  sotalol: { 
    name: 'Sotalol', classes: ['Class III / Beta-Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', mechanism: 'K+ Channel / Beta Blocker', targetReceptor: 'Potassium / Beta-1/2',
    indications: { 'Afib / VT': { dose: '75-150', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 }, 
    pd: { c50: 2.0, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -30, rrMax: 0 },
    notes: 'Nonselective beta blocker with strong Class III antiarrhythmic (K+ channel blocking) characteristics.'
  },
  verapamil: { 
    name: 'Verapamil', classes: ['Class IV CCB'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Blocker', targetReceptor: 'L-type Calcium', intracellularCascade: 'Non-DHP CCB -> blocks L-type VGCCs in myocardium/AV node -> prevents Ca2+ influx',
    indications: { 'SVT / Rate Control': { dose: '2.5-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 80.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.2 }, 
    pd: { c50: 0.3, gamma: 2.0, sysMax: -25, diaMax: -25, hrMax: -35, rrMax: 0 },
    notes: 'Phenylalkylamine calcium channel blocker. Acts selectively on AV/SA nodes. Strongly negatively inotropic.'
  },

  // === SPECIAL BARBITURATES & BENZOS ===
  thiopental: {
    name: 'Thiopental', classes: ['Barbiturate'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'LBW',
    metabolism: 'Hepatic (CYP2C19)', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Stanski',
    targetReceptor: 'GABA-A',
    indications: { 'Induction': { dose: '3-5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 150.0, k10: 0.05, k12: 0.1, k21: 0.08, k13: 0.02, k31: 0.01, ke0: 1.2, coSensitivity: 0.3 },
    pd: { c50: 15.0, gamma: 2.0, sysMax: -25, diaMax: -20, hrMax: 15, rrMax: -12, inducesApneaAtCe: 10.0 },
    notes: 'Potent barbiturate. Fast onset/offset due to brain-to-tissue redistribution. STRICT safety warning: Highly alkaline (pH 10.5). If injected intra-arterially (e.g. into an arterial line), it immediately precipitates into crystals, blocking microvasculature, causing profound endothelial destruction, severe vasospasm, gangrene, and necrosis (Treat immediately with Papaverine, Lidocaine, or stellate ganglion block).'
  },
  lorazepam: {
    name: 'Lorazepam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (glucuronidation only, no active metabolites)', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Greenblatt',
    targetReceptor: 'GABA-A',
    indications: { 'Anxiolysis / Seizure': { dose: '1-2', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 35.0, V3: 0, k10: 0.01, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -4, inducesApneaAtCe: 0.5 },
    notes: 'Intermediate-acting benzodiazepine. Slower onset than midazolam. Highly stable profile.'
  },
  flumazenil: {
    name: 'Flumazenil', classes: ['GABA Antagonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.50, mechanism: 'Competitive Antagonist', targetReceptor: 'GABA-A',
    indications: { 'Benzo Reversal': { dose: '0.2-1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.1, k12: 0.08, k21: 0.05, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.1 },
    pd: { c50: 0.002, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, receptorAffinity: 1.8 },
    notes: 'Competitive antagonist at the GABA-A benzodiazepine binding site. Dose: 0.2mg IV, repeat q1 min to 1mg max. Duration of action is 45-90 minutes. STRICT clinical constraint: Must monitor for re-sedation for 2-3 hours because benzodiazepine half-life often exceeds Flumazenil (renarcotization/resedation risk).'
  },

  // === SPECIAL OPIOID ANTAGONISTS & MEPERIDINE ===
  meperidine: {
    name: 'Meperidine', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (demethylation) to active Normeperidine', proteinBinding: 0.60, synergyGroup: 'Opioid', pkModel: 'Mather',
    targetReceptor: 'Mu-Opioid (u1/u2) & Kappa',
    activeMetabolite: 'Normeperidine',
    indications: { 'Post-op Shivering': { dose: '12.5-25', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 60.0, V3: 100.0, k10: 0.05, k12: 0.08, k21: 0.04, k13: 0.02, k31: 0.01, ke0: 0.2, coSensitivity: 0.4 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: 15, rrMax: -8, inducesApneaAtCe: 2.0 },
    notes: 'Weak opioid agonist. Specifically acts on Kappa receptors to treat post-op shivering. STRICT drug-drug warning: Concomitant MAOIs (Phenelzine, Selegiline) trigger fatal hyperpyrexic Serotonin Syndrome (Libby Zion Law). STRICT renal warning: Active metabolite Normeperidine accumulates heavily in renal failure, causing severe central nervous system hyper-excitation, tremors, myoclonus, and tonic-clonic seizures.'
  },
  naloxone: {
    name: 'Naloxone', classes: ['Opioid Antagonist'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic conjugation', proteinBinding: 0.45, mechanism: 'Competitive Antagonist', targetReceptor: 'Mu-Opioid',
    indications: { 'Opioid Reversal': { dose: '40-400', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 30.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, receptorAffinity: 2.0 },
    notes: 'Competitive opioid receptor antagonist. Reverses opioid-induced depression. Dose: 40mcg IV titration. STRICT safety warning: Duration of action (30-45 min) is shorter than most full agonist opioids (e.g. Morphine, Fentanyl). Patients must be observed continuously to prevent delayed recurrences of respiratory arrest (re-narcotization).'
  },

  // === NEW PARALYTICS ===
  pancuronium: {
    name: 'Pancuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'Renal (mostly unchanged 40-70%), hepatic 10-20%', proteinBinding: 0.87, mechanism: 'Antagonist', targetReceptor: 'nAChR',
    indications: { 'Long-acting Paralysis': { dose: '0.08-0.1', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.015, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 0.4, gamma: 4, sysMax: 5, diaMax: 5, hrMax: 20, rrMax: -20, inducesParalysisAtCe: 0.3, inducesApneaAtCe: 0.3, receptorAffinity: 0.8 },
    notes: 'Long-acting aminosteroid NDMR. Blocks cardiac muscarinic M2 receptors, causing significant tachycardia.'
  },

  // === NEW PRESSORS ===
  angiotensin_ii: {
    name: 'Angiotensin II', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases (immediate)', mechanism: 'Agonist', targetReceptor: 'AT1',
    indications: { 'Refractory Shock': { dose: '20-80', unit: 'ng/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 2.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 3.0, coSensitivity: 0.05 },
    pd: { c50: 0.005, gamma: 2.0, sysMax: 60, diaMax: 70, hrMax: 0, rrMax: 0 },
    notes: 'Synthetic human angiotensin II. Binds G-protein coupled AT1 receptors. Specifically designed for vasodilatory, catecholamine-refractory shock.'
  },
  methylene_blue: {
    name: 'Methylene Blue', classes: ['Vasopressor Adjunct'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Tissue reduction (to leucomethylene blue)', mechanism: 'Inhibitor', targetReceptor: 'Nitric Oxide Synthase',
    indications: { 'Vasoplegia': { dose: '1-2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: 30, diaMax: 35, hrMax: 0, rrMax: 0 },
    notes: 'Inhibits soluble guanylyl cyclase and nitric oxide synthase, blocking NO-induced vasodilation. Highly effective for refractory vasoplegic shock (e.g. post-cardiopulmonary bypass, severe sepsis).'
  },

  // === COAGULATION ===
  heparin: {
    name: 'Heparin', classes: ['Anticoagulant'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Reticuloendothelial clearance', proteinBinding: 0.95, mechanism: 'Activator', targetReceptor: 'Antithrombin III',
    indications: { 'Cardiopulmonary Bypass': { dose: '300-400', unit: 'Units/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.015, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 1.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Accelerates antithrombin III activity 1000-fold, inactivating thrombin and factor Xa. Reversed by protamine on a 1mg : 100 Units Heparin ratio.'
  },
  protamine: {
    name: 'Protamine Sulfate', classes: ['Reversal'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases', proteinBinding: 0, mechanism: 'Chelator', targetReceptor: 'Heparin',
    indications: { 'Heparin Reversal': { dose: '1.0', unit: 'mg/100U Heparin', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.0, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 },
    notes: 'Highly basic protein derived from salmon sperm. Forms stable, inactive ionic complex with highly acidic heparin. STRICT safety warning (Protamine Reactions): Type I is isolated hypotension from rapid administration (histamine release); Type II is true IgE-mediated anaphylaxis; Type III is catastrophic pulmonary vasoconstriction, acute right ventricular failure, and severe refractory systemic shock (Thromboxane A2-mediated). Avoid rapid infusion.'
  },
  tranexamic_acid: {
    name: 'Tranexamic Acid (TXA)', classes: ['Antifibrinolytic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (mostly unchanged >90%)', proteinBinding: 0.03, mechanism: 'Inhibitor', targetReceptor: 'Plasminogen',
    indications: { 'Massive Hemorrhage': { dose: '1.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 },
    pd: { c50: 10.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Competitive inhibitor of plasminogen activation. Blocks lysine-binding sites, preventing fibrinolysis. First line agent for trauma-induced coagulopathy and postpartum hemorrhage.'
  },

  // === ANTIEMETICS & RESPIRATORY ===
  ondansetron: {
    name: 'Ondansetron', classes: ['Antiemetic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4/2D6)', proteinBinding: 0.73, mechanism: 'Antagonist', targetReceptor: '5-HT3',
    indications: { 'PONV Prophylaxis': { dose: '4.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.1, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Selective 5-HT3 serotonin receptor antagonist. First line antiemetic. Side effects include mild headache and QT prolongation.'
  },
  dexamethasone: {
    name: 'Dexamethasone', classes: ['Corticosteroid'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.70, mechanism: 'Agonist', targetReceptor: 'Glucocorticoid',
    indications: { 'PONV Prophylaxis / Swelling': { dose: '4-8', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 40.0, V3: 0, k10: 0.01, k12: 0.02, k21: 0.01, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Potent long-acting corticosteroid. Strongly reduces post-op swelling and acts as highly effective secondary antiemetic.'
  },
  albuterol: {
    name: 'Albuterol', classes: ['Beta-2 Agonist'], routes: ['Inhaled (via ETT)'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Local pulmonary clearance', proteinBinding: 0.10, mechanism: 'Agonist', targetReceptor: 'Beta-2',
    indications: { 'Bronchospasm': { dose: '2.5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 10.0, V3: 0, k10: 0.1, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.1 },
    pd: { c50: 0.02, gamma: 1.5, sysMax: 0, diaMax: -5, hrMax: 20, rrMax: 0 },
    notes: 'Cardioselective Beta-2 adrenergic agonist. Triggers bronchial smooth muscle relaxation. Side effects include reflex/sympathetic tachycardia, tremors, and mild hyperlactatemia or hypokalemia in continuous doses.'
  }
};;

/**
 * Calculate predicted lung volumes using ECCS/ERS 1993 reference equations
 * with obesity correction (Pelosi et al.) and positional modifiers (Rehder et al.)
 * 
 * References:
 *   - Quanjer PH et al. "Lung volumes and forced ventilatory flows." Eur Respir J. 1993;6 Suppl 16:5-40.
 *   - Pelosi P et al. "Respiratory system mechanics in sedated, paralyzed, morbidly obese patients."
 *     J Appl Physiol. 1998;84(3):811-816.
 *   - Rehder K et al. "Ventilation-perfusion relationships in health and disease." Am Rev Respir Dis. 1977.
 *   - Radford EP. "Ventilation standards for use in artificial respiration." J Appl Physiol. 1955;7(4):451-460.
 *
 * @param {number} heightCm - Patient height in cm
 * @param {number} age - Patient age in years  
 * @param {string} sex - 'male' or 'female'
 * @param {number} bmi - Body mass index
 * @param {string} position - Patient position (default 'Supine')
 * @returns {object} { frc_mL, tlc_mL, rv_mL, vc_mL, erv_mL, irv_mL, fvc_mL, fev1_mL, vd_mL, frc_L, tlc_L, obesityFactor, positionFactor }
 */
export function calculateLungVolumes(heightCm, age, sex, bmi, position = 'Supine') {
    const H = heightCm / 100; // Convert to meters
    const isMale = sex.toLowerCase() === 'male';
    
    // ECCS/ERS 1993 Reference Equations (Quanjer et al.)
    let fvc, fev1, tlc, rv, frc;
    if (isMale) {
        fvc  = 5.76 * H - 0.026 * age - 4.34;  // Liters
        fev1 = 4.30 * H - 0.029 * age - 2.49;
        tlc  = 7.99 * H - 7.08;
        rv   = 1.31 * H + 0.022 * age - 1.23;
        frc  = 2.34 * H + 0.009 * age - 1.09;
    } else {
        fvc  = 4.43 * H - 0.026 * age - 2.89;
        fev1 = 3.95 * H - 0.025 * age - 2.60;
        tlc  = 6.60 * H - 5.79;
        rv   = 1.81 * H + 0.016 * age - 2.00;
        frc  = 2.24 * H + 0.001 * age - 1.00;
    }
    
    // Obesity correction — Pelosi et al. 1998
    // FRC decreases exponentially as BMI increases above 25
    const obesityFactor = bmi > 25 ? Math.exp(-0.02 * (bmi - 25)) : 1.0;
    frc *= obesityFactor;
    
    // Positional FRC correction — Rehder et al. 1977
    const positionFactors = {
        'Sitting': 1.00,        // Reference upright position
        'Ramped': 0.90,         // Semi-upright
        'Rev Trendelenburg': 0.90,
        'Supine': 0.80,         // -20% from upright
        'Sniffing': 0.80,
        'Prone': 0.85,          // Better than supine (weight off diaphragm)
        'Lateral': 0.82,
        'Lithotomy': 0.72,      // Legs up compress diaphragm
        'Trendelenburg': 0.70   // Worst — abdominal contents push cephalad
    };
    const posFactor = positionFactors[position] || 0.80;
    frc *= posFactor;
    
    // Ensure all values are physiologically plausible minimums
    frc  = Math.max(0.5, frc);
    tlc  = Math.max(2.0, tlc);
    rv   = Math.max(0.5, rv);
    fvc  = Math.max(1.0, fvc);
    fev1 = Math.max(0.5, fev1);
    
    // Derived volumes
    const vc  = Math.max(0.5, tlc - rv);
    const erv = Math.max(0, frc - rv);
    // VT = 7 mL/kg IBW (Devine formula inline)
    const ibwKg = isMale ? (50 + 2.3 * ((heightCm / 2.54) - 60)) : (45.5 + 2.3 * ((heightCm / 2.54) - 60));
    const vt_L = 0.007 * ibwKg;
    const irv = Math.max(0, vc - vt_L - erv);
    
    // Anatomic dead space — Radford nomogram approximation (~2.2 mL/kg IBW)
    const vd = ibwKg * 2.2 / 1000; // Liters
    
    return {
        frc_mL:  Math.round(frc * 1000),
        tlc_mL:  Math.round(tlc * 1000),
        rv_mL:   Math.round(rv * 1000),
        vc_mL:   Math.round(vc * 1000),
        erv_mL:  Math.round(erv * 1000),
        irv_mL:  Math.round(irv * 1000),
        fvc_mL:  Math.round(fvc * 1000),
        fev1_mL: Math.round(fev1 * 1000),
        vd_mL:   Math.round(vd * 1000),
        frc_L:   parseFloat(frc.toFixed(2)),
        tlc_L:   parseFloat(tlc.toFixed(2)),
        obesityFactor: parseFloat(obesityFactor.toFixed(3)),
        positionFactor: posFactor
    };
}

export const FLUIDS = {
  'Normal Saline (0.9% NS)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 154, cl: 154, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 0.75, retentionInflamed: 0.20, osm: 308, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: 0 },
    acidosisRisk: true, viscosity: 1.0 
  },
  'Lactated Ringers (LR)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 130, cl: 109, k: 4, ca: 3.0, citrateLoad: 0, buffer: 28,
    retentionIntact: 0.80, retentionInflamed: 0.25, osm: 273, tonicity: 'Hypotonic', coag: { r: 0, ma: -1, angle: 0 }, viscosity: 1.0 
  },
  'Plasmalyte': { 
    type: 'Crystalloid', defaultVol: 1000, na: 140, cl: 98, k: 5, ca: 0, citrateLoad: 0, buffer: 27,
    retentionIntact: 0.80, retentionInflamed: 0.25, osm: 294, tonicity: 'Isotonic', coag: { r: 0, ma: -1, angle: 0 }, viscosity: 1.0 
  },
  'Albumin 5%': { 
    type: 'Colloid', defaultVol: 500, na: 140, cl: 150, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.75, osm: 290, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: -2 }, viscosity: 1.5 
  },
  'Packed Red Blood Cells (PRBC)': { 
    type: 'Blood Product', defaultVol: 300, na: 0, cl: 0, k: 15, ca: 0, citrateLoad: 15, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, hct: 0.70, coag: { r: 0, ma: 0, angle: 0 }, viscosity: 3.5 
  }, 
  'Fresh Frozen Plasma (FFP)': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 10, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, coag: { r: -4, ma: 0, angle: 5 }, viscosity: 1.8 
  },
  'Platelets': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 5, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, coag: { r: -1, ma: 15, angle: 10 }, viscosity: 2.0 
  },
  'Cryoprecipitate': { 
    type: 'Blood Product', defaultVol: 50, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 5, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.95, coag: { r: 0, ma: 5, angle: 15 }, viscosity: 1.8 
  }
};