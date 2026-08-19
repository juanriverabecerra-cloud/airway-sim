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

import { RespiratoryEngine } from './RespiratoryEngine';

export function calculateIBW(heightCm, sex) {
  let hCm = Number(heightCm);
  if (isNaN(hCm) || !Number.isFinite(hCm) || hCm <= 0) {
    hCm = 170.0;
  }
  // Clamp height between 50 cm and 250 cm
  hCm = Math.max(50.0, Math.min(250.0, hCm));

  // Validate sex: must be a string and either 'male' or 'female'. Default to 'male'.
  let safeSex = 'male';
  if (typeof sex === 'string') {
    const trimmed = sex.trim().toLowerCase();
    if (trimmed === 'female') {
      safeSex = 'female';
    }
  }

  const h = Math.max(0, (hCm / 2.54) - 60);
  return safeSex === 'male' ? 50.0 + (2.3 * h) : 45.5 + (2.3 * h);
}

export function calculateLBW(heightCm, weightKg, sex) {
  let hCm = Number(heightCm);
  if (isNaN(hCm) || !Number.isFinite(hCm) || hCm <= 0) {
    hCm = 170.0;
  }
  hCm = Math.max(50.0, Math.min(250.0, hCm));

  let wKg = Number(weightKg);
  if (isNaN(wKg) || !Number.isFinite(wKg) || wKg <= 0) {
    wKg = 70.0;
  }
  wKg = Math.max(10.0, Math.min(300.0, wKg));

  // Validate sex: default to 'male'.
  let safeSex = 'male';
  if (typeof sex === 'string') {
    const trimmed = sex.trim().toLowerCase();
    if (trimmed === 'female') {
      safeSex = 'female';
    }
  }

  const hM = hCm / 100;
  const denominatorHeight = hM * hM;
  const bmi = denominatorHeight > 0.01 ? wKg / denominatorHeight : wKg / 0.01;

  if (safeSex === 'male') {
    const denom = 6680 + (216 * bmi);
    return denom > 0 ? (9270 * wKg) / denom : 0;
  } else {
    const denom = 8780 + (244 * bmi);
    return denom > 0 ? (9270 * wKg) / denom : 0;
  }
}

export function calculateHumeLBM(heightCm, weightKg, sex) {
  let hCm = Number(heightCm);
  if (isNaN(hCm) || !Number.isFinite(hCm) || hCm <= 0) hCm = 170.0;
  hCm = Math.max(50.0, Math.min(250.0, hCm));

  let wKg = Number(weightKg);
  if (isNaN(wKg) || !Number.isFinite(wKg) || wKg <= 0) wKg = 70.0;
  wKg = Math.max(5.0, Math.min(300.0, wKg));

  let safeSex = 'male';
  if (typeof sex === 'string' && sex.trim().toLowerCase() === 'female') {
    safeSex = 'female';
  }

  let lbm = 0;
  if (safeSex === 'male') {
    lbm = 1.10 * wKg - 128.0 * Math.pow(wKg / hCm, 2);
  } else {
    lbm = 1.07 * wKg - 148.0 * Math.pow(wKg / hCm, 2);
  }
  // Clamp LBM to prevent negative values in extreme obesity
  return Math.max(15.0, Math.max(wKg * 0.25, lbm));
}

export function calculateJanmahasatianFFM(heightCm, weightKg, sex) {
  return calculateLBW(heightCm, weightKg, sex);
}

export function calculateCBW(heightCm, weightKg, sex) {
  const ibw = calculateIBW(heightCm, sex);
  let wKg = Number(weightKg);
  if (isNaN(wKg) || !Number.isFinite(wKg) || wKg <= 0) wKg = 70.0;
  return ibw + 0.4 * (wKg - ibw);
}

export function calculateMFFM(heightCm, weightKg, sex) {
  const ffm = calculateLBW(heightCm, weightKg, sex);
  let wKg = Number(weightKg);
  if (isNaN(wKg) || !Number.isFinite(wKg) || wKg <= 0) wKg = 70.0;
  return ffm + 0.4 * (wKg - ffm);
}

export function calculatePKM(weightKg) {
  let wKg = Number(weightKg);
  if (isNaN(wKg) || !Number.isFinite(wKg) || wKg <= 0) wKg = 70.0;
  const expTerm = Math.exp(-0.025 * wKg);
  const fraction = (196.4 * expTerm - 53.66) / 100.0;
  return 52.0 / (1.0 + fraction);
}

export function calculateAgeAdjustedMAC(mac40, age) {
  let m40 = Number(mac40);
  if (isNaN(m40) || !Number.isFinite(m40) || m40 < 0) {
    m40 = 2.0; // Fallback default to Sevoflurane mac40
  }

  // Validate age: clamp between 0 and 120. Default to 40 years.
  let safeAge = Number(age);
  if (isNaN(safeAge) || !Number.isFinite(safeAge) || safeAge < 0) {
    safeAge = 40.0;
  }
  safeAge = Math.max(0, Math.min(120.0, safeAge));

  // Mapleson equation for age-dependent MAC reduction
  return m40 * Math.pow(10, -0.00269 * (safeAge - 40));
}

export const INHALATIONAL_AGENTS = {
  sevoflurane: {
    // TABLE 20.1/20.2, Miller's 9th Ed: MAC 2.05%, blood/gas 0.65, oil/gas 47-54 (low end used),
    // CNS lambda 1.7, muscle lambda 3.1, vapor pressure 157 mmHg.
    name: 'Sevoflurane', mac40: 2.05, bgPartition: 0.65, oilGasPartition: 47, brainBgPartition: 1.7, muscleBgPartition: 3.1, vaporPress: 157,
    sysMax: -30, diaMax: -25, hrMax: 0, rrMax: -15, hpvPotency: 0.15, // "little effect" on HPV vs older agents, Ch13 p.1342, Miller's 9th Ed
    description: 'Sweet smelling, low pungency. Ideal for inhalational induction. Breaks down to Compound A. Produces fluoride ions.'
  },
  methoxyflurane: {
    // TABLE 20.1/20.2, Miller's 9th Ed: MAC 0.16%, blood/gas 12, oil/gas 950, CNS lambda 2.0,
    // muscle lambda 1.6, vapor pressure 22.5 mmHg.
    name: 'Methoxyflurane', mac40: 0.16, bgPartition: 12.0, oilGasPartition: 950.0, brainBgPartition: 2.0, muscleBgPartition: 1.6, vaporPress: 22.5,
    sysMax: -20, diaMax: -20, hrMax: 0, rrMax: -15, hpvPotency: 1.0, // older halogenated agent, grouped with halothane/isoflurane
    description: 'Highly potent, extremely soluble. Inhalation analgesic. Associated with fluoride nephrotoxicity.'
  },
  desflurane: {
    // TABLE 20.1/20.2, Miller's 9th Ed: MAC 6.0%, blood/gas 0.42, oil/gas 19, CNS lambda 1.3,
    // muscle lambda 2.0, vapor pressure 664 mmHg.
    name: 'Desflurane', mac40: 6.0, bgPartition: 0.42, oilGasPartition: 19, brainBgPartition: 1.3, muscleBgPartition: 2.0, vaporPress: 664,
    sysMax: -25, diaMax: -25, hrMax: 15, rrMax: -15, hpvPotency: 0.15, // "little effect" on HPV vs older agents, Ch13 p.1342, Miller's 9th Ed
    description: 'Pungent, rapid offset. Risk of sympathetic surge/tachycardia if rapidly increased. Boils at sea level.'
  },
  isoflurane: {
    // TABLE 20.1/20.2, Miller's 9th Ed: MAC 1.15%, blood/gas 1.4, oil/gas 90.8, CNS lambda 1.5,
    // muscle lambda 2.9, vapor pressure 238 mmHg.
    name: 'Isoflurane', mac40: 1.15, bgPartition: 1.4, oilGasPartition: 90.8, brainBgPartition: 1.5, muscleBgPartition: 2.9, vaporPress: 238,
    sysMax: -35, diaMax: -35, hrMax: 5, rrMax: -15, hpvPotency: 1.0, // depresses HPV 50% at MAC 2, Ch13 p.2348/Fig 13.22, Miller's 9th Ed
    description: 'Highly potent, slow kinetics. Potent vasodilator. Cardioprotective (ischemic preconditioning).'
  },
  halothane: {
    // TABLE 20.1/20.2, Miller's 9th Ed: MAC 0.75%, blood/gas 2.3, oil/gas 197, CNS lambda 2.7,
    // muscle lambda 2.5, vapor pressure 243 mmHg.
    name: 'Halothane', mac40: 0.75, bgPartition: 2.3, oilGasPartition: 197, brainBgPartition: 2.7, muscleBgPartition: 2.5, vaporPress: 243,
    sysMax: -20, diaMax: -20, hrMax: -15, rrMax: -10, hpvPotency: 1.0, // depresses HPV 50% at MAC 2, Ch13 p.2348/Fig 13.22, Miller's 9th Ed
    description: 'Highly soluble, slow onset/offset. Sensitizes myocardium to catecholamines.'
  },
  xenon: {
    // Not in TABLE 20.1 (post-dates this chapter's reference table); values retained from prior sourcing.
    name: 'Xenon', mac40: 63, bgPartition: 0.115, oilGasPartition: 1.9, brainBgPartition: 1.2, vaporPress: 9999,
    sysMax: 0, diaMax: 0, hrMax: -5, rrMax: -5, hpvPotency: 0.0,
    description: 'Inert noble gas. NMDA antagonist. Extremely rapid onset/offset. Cardio-stable.'
  },
  n2o: {
    // TABLE 20.1/20.2, Miller's 9th Ed: MAC 104%, blood/gas 0.47, oil/gas 1.3, CNS lambda 1.1,
    // muscle lambda 1.2, vapor pressure 43,880 mmHg.
    name: 'Nitrous Oxide', mac40: 104, bgPartition: 0.47, oilGasPartition: 1.3, brainBgPartition: 1.1, muscleBgPartition: 1.2, vaporPress: 43880,
    sysMax: 5, diaMax: 5, hrMax: 5, rrMax: -5, hpvPotency: 0.0, // not a halogenated agent; no significant HPV inhibition reported, Ch13
    description: 'Low potency. Diffuses into air-filled cavities (pneumothorax, bowel, ETT cuff). NMDA antagonist analgesic.'
  },
  f6: {
    name: 'F6 (Nonimmobilizer)', mac40: 9999.0, bgPartition: 1.5, oilGasPartition: 60, brainBgPartition: 1.4, vaporPress: 180,
    sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, hpvPotency: 1.0,
    description: 'Amnestic cyclobutane nonimmobilizer. Selectively blocks learning/episodic memory with zero MAC contribution.'
  },
  f3: {
    name: 'F3 (Anesthetic)', mac40: 1.2, bgPartition: 1.0, oilGasPartition: 70, brainBgPartition: 1.5, vaporPress: 240,
    sysMax: -20, diaMax: -20, hrMax: 0, rrMax: -10, hpvPotency: 1.0,
    description: 'Halogenated cyclobutane volatile anesthetic. Produces immobility, sedation, and amnesia.'
  },
  s_isoflurane: {
    // Stereoisomer of isoflurane: identical physicochemical partition properties (TABLE 20.1/20.2);
    // only MAC potency differs (receptor stereoselectivity).
    name: 'S-Isoflurane', mac40: 0.9, bgPartition: 1.4, oilGasPartition: 90.8, brainBgPartition: 1.5, muscleBgPartition: 2.9, vaporPress: 238,
    sysMax: -30, diaMax: -30, hrMax: 5, rrMax: -15, hpvPotency: 1.0,
    description: 'Active stereoisomer of Isoflurane. Twice as potent as R-Isoflurane.'
  },
  r_isoflurane: {
    name: 'R-Isoflurane', mac40: 1.8, bgPartition: 1.4, oilGasPartition: 90.8, brainBgPartition: 1.5, muscleBgPartition: 2.9, vaporPress: 238,
    sysMax: -15, diaMax: -15, hrMax: 5, rrMax: -10, hpvPotency: 1.0,
    description: 'Chiral enantiomer of Isoflurane. Lower potency, requires higher concentration.'
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
    // c50 1.2→0.001 mg/L: prior was 1200× too high → ZERO hemodynamic effect at any clinical dose.
    // 0.7 mcg/kg/hr (70kg): Css≈0.0017 mg/L → old fraction=0.0%, new fraction=69% ✓.
    // Published alpha-2 agonist EC50 ~0.6-1.2 ng/mL = 0.0006-0.0012 mg/L (consistent with 0.001).
    // Loading 1 mcg/kg → Ce_peak≈0.00875 → fraction=96% (strong transient sedation ✓).
    pd: { c50: 0.001, gamma: 1.5, sysMax: -20, diaMax: -20, hrMax: -30, rrMax: -2, inducesApneaAtCe: 999 },
    notes: 'Bradycardia and hypotension are signature hemodynamic effects (initial hypertension possible with rapid bolus). Mimics natural sleep N3 EEG. Reduces postoperative delirium. Dose-response spans 0.2-1.5 mcg/kg/hr.'
  },
  etomidate: { 
    name: 'Etomidate', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Esterase / Hepatic', proteinBinding: 0.77, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    targetReceptor: 'GABA-A', intracellularCascade: 'Enhances GABA binding -> increases Chloride (Cl-) influx -> cellular hyperpolarization',
    indications: { 'Induction (Cardio-stable)': { dose: '0.2-0.3', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 10.3, V2: 40.0, V3: 120, k10: 0.1, k12: 0.15, k21: 0.08, k13: 0.05, k31: 0.01, ke0: 0.43, coSensitivity: 0.1 },
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
  esketamine: {
    // Ch23, Miller's 9th Ed: "The S(+)-isomer (Ketanest) is 3 to 4 times more potent as an
    // analgesic with a faster clearance and recovery and with fewer psychomimetic side effects."
    // Potency scaled by the midpoint of the cited 3-4x range (c50 = racemic ketamine's 1.0 / 3.5).
    // PK compartment volumes/rate constants are kept identical to racemic ketamine, since the
    // source does not quantify "faster clearance" with a specific number (no parameter invented).
    name: 'Esketamine', classes: ['Dissociative', 'Analgesic'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (CYP3A4/2C9) to active Norketamine', proteinBinding: 0.12, synergyGroup: 'Dissociative', pkModel: 'Domino/Clements250',
    targetReceptor: 'NMDA Antagonist', intracellularCascade: 'Non-competitive NMDA receptor antagonist -> blocks Glutamate/Ca2+ influx',
    indications: { 'Induction': { dose: '0.5-1.0', unit: 'mg/kg', type: 'Bolus' }, 'Pain/Agitation': { dose: '0.05-0.15', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 45.0, V3: 150, k10: 0.15, k12: 0.2, k21: 0.1, k13: 0.05, k31: 0.02, ke0: 1.5, coSensitivity: 0.4 },
    pd: { c50: 0.29, gamma: 2, sysMax: 30, diaMax: 20, hrMax: 20, rrMax: -2, inducesApneaAtCe: 1.43 },
    notes: 'S(+)-enantiomer of ketamine. 3-4x more potent analgesic than the racemate, with fewer psychomimetic side effects (Ch23, Miller\'s 9th Ed). Shares the same sympathomimetic, secretory, and emergence-delirium liabilities as racemic ketamine (see ketamine notes); contributes to the shared ketamine-class Ce pool for those effects, scaled by its potency ratio.'
  },
  midazolam: { 
    name: 'Midazolam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4) to active 1-hydroxymidazolam', proteinBinding: 0.94, synergyGroup: 'Sedative', pkModel: 'Greenblatt',
    targetReceptor: 'GABA-A', intracellularCascade: 'Allosteric GABA-A modulator -> increases frequency of Chloride (Cl-) channel opening',
    indications: { 'Pre-op Anxiolysis': { dose: '0.02-0.04', unit: 'mg/kg', type: 'Bolus' }, 'Sedation': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    // k10=0.01/min → t½β≈86 min (closer to clinical 1.5-2.5h; redistribution t½α≈4 min drives
    // clinical bolus duration of 20-40 min). Greenblatt model: CYP3A4 hepatic. ke0=0.8/min →
    // peak Ce ~2-3 min (clinical onset 2-5 min). inducesApneaAtCe=0.2 mg/L at high Ce.
    pk: { V1: 12.0, V2: 30.0, V3: 80, k10: 0.01, k12: 0.08, k21: 0.04, k13: 0.02, k31: 0.01, ke0: 0.8, coSensitivity: 0.2 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: 0, rrMax: -6, inducesApneaAtCe: 0.2 },
    notes: 'Anterograde amnesia, anxiolysis, anticonvulsant. Heavy synergy with opioids (induces respiratory depression). Reversible with Flumazenil.'
  },
  propofol: { 
    name: 'Propofol', classes: ['Sedative', 'Hypnotic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'LBW',
    metabolism: 'Hepatic and Extrahepatic (conjugation)', proteinBinding: 0.97, synergyGroup: 'Sedative', pkModel: 'Schnider',
    targetReceptor: 'GABA-A', intracellularCascade: 'Enhances GABA binding -> increases Chloride (Cl-) influx -> cellular hyperpolarization',
    indications: { 'Induction': { dose: '1.5-2.5', unit: 'mg/kg', type: 'Bolus' }, 'Maintenance (TIVA)': { dose: '100-200', unit: 'mcg/kg/min', type: 'Infusion' }, 'Sedation': { dose: '25-50', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 4.27, V2: 18.9, V3: 238, k10: 0.443, k12: 0.303, k21: 0.055, k13: 0.196, k31: 0.0033, ke0: 0.456, coSensitivity: 0.6 },
    pd: { c50: 2.5, gamma: 2.76, sysMax: -24, diaMax: -18, hrMax: -2, rrMax: -14, inducesApneaAtCe: 2.5 },
    notes: 'Decreases CMRO2, CBF, and ICP. Anticonvulsant. Potent venodilator and direct myocardial depressant. Antiemetic at sub-hypnotic doses. Prolonged high dose (>67 mcg/kg/min or 4 mg/kg/hr for >48h) risks Propofol Infusion Syndrome (PRIS: acidosis, rhabdo, bradycardia, lipemic plasma).'
  },
  thiopental: {
    name: 'Thiopental', classes: ['Barbiturate'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'LBW',
    metabolism: 'Hepatic (CYP2C19)', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Stanski',
    targetReceptor: 'GABA-A', intracellularCascade: 'Enhances GABA-A receptor opening duration -> increases Chloride (Cl-) influx -> hyperpolarization',
    indications: { 'Induction': { dose: '3-5', unit: 'mg/kg', type: 'Bolus' } },
    // V1=7L: Stanski published central compartment (prior V1=25L gave Cp0=11.2<c50=15 → no LOC at 4mg/kg).
    // ke0=3.0/min: fast BBB penetration for 30-60s onset (t_peak≈1.0 min via ln(3.0/0.17)/(3.0-0.17)).
    pk: { V1: 7.0, V2: 40.0, V3: 150.0, k10: 0.05, k12: 0.1, k21: 0.08, k13: 0.02, k31: 0.01, ke0: 3.0, coSensitivity: 0.3 },
    pd: { c50: 15.0, gamma: 2.0, sysMax: -25, diaMax: -20, hrMax: 15, rrMax: -12, inducesApneaAtCe: 10.0 },
    notes: 'Potent barbiturate. Fast onset/offset due to brain-to-tissue redistribution. STRICT safety warning: Highly alkaline (pH 10.5). If injected intra-arterially (e.g. into an arterial line), it immediately precipitates into crystals, blocking microvasculature, causing profound endothelial destruction, severe vasospasm, gangrene, and necrosis (Treat immediately with Papaverine, Lidocaine, or stellate ganglion block).'
  },
  methohexital: {
    name: 'Methohexital', classes: ['Barbiturate'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'LBW',
    metabolism: 'Hepatic (rapid, hepatic extraction ratio is higher than thiopental)', proteinBinding: 0.73, synergyGroup: 'Sedative', pkModel: 'Hudson',
    targetReceptor: 'GABA-A', intracellularCascade: 'Enhances GABA-A receptor opening duration -> increases Chloride (Cl-) influx -> hyperpolarization',
    indications: { 'Induction': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' }, 'ECT Sedation': { dose: '0.75-1.5', unit: 'mg/kg', type: 'Bolus' } },
    // ke0=5.0/min: methohexital has faster onset than thiopental (clinical 30s onset vs thiopental 30-60s).
    // With thiopental ke0=3.0, methohexital ke0=5.0 maintains the faster-onset relationship.
    pk: { V1: 15.0, V2: 30.0, V3: 90.0, k10: 0.15, k12: 0.12, k21: 0.09, k13: 0.04, k31: 0.015, ke0: 5.0, coSensitivity: 0.3, proteinBinding: 0.73, hepaticFraction: 0.9, renalFraction: 0.1 },
    pd: { c50: 3.5, gamma: 2.0, sysMax: -20, diaMax: -15, hrMax: 20, rrMax: -10, inducesApneaAtCe: 2.5 },
    notes: 'Ultra-short acting barbiturate. Rapid redistribution and fast hepatic clearance lead to quicker emergence compared to thiopental. Lowers seizure threshold, making it the preferred induction agent for Electroconvulsive Therapy (ECT). Highly alkaline, same intra-arterial warning.'
  },

  // === OPIOIDS & ANALGESICS ===
  fentanyl: {
    name: 'Fentanyl', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (CYP3A4) to inactive norfentanyl', proteinBinding: 0.84, synergyGroup: 'Opioid', pkModel: 'Shafer',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Analgesia': { dose: '25-100', unit: 'mcg', type: 'Bolus' }, 'Induction': { dose: '1-3', unit: 'mcg/kg', type: 'Bolus' } },
    // Shafer 3-compartment model (Table 26.7, Miller's 9th Ed, also Shafer-Varvel Anesthesiology 1991).
    // V1=6.09L, k10=0.083/min → t½α≈1.7 min redistribution; k12=0.471→fast tissue distribution.
    // C50=0.004 mg/L=4 ng/mL (surgical analgesia threshold; doubled from prior 0.002 because V1 halved).
    // ke0=0.147/min → time to peak effect ~4.6 min ✓ (clinical analgesia peak 3-5 min after bolus).
    // inducesApneaAtCe=0.006 mg/L=6 ng/mL → apnea with large boluses or rapid infusion. ✓
    pk: { V1: 6.09, V2: 28.1, V3: 228.0, k10: 0.083, k12: 0.471, k21: 0.102, k13: 0.225, k31: 0.006, ke0: 0.147, coSensitivity: 0.8 },
    pd: { c50: 0.004, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: -20, rrMax: -12, inducesApneaAtCe: 0.006 },
    notes: 'Highly lipophilic. Highly synergistic with volatiles/sedatives. Can cause chest wall rigidity (stiff joint syndrome) with large rapid boluses.'
  },
  alfentanil: {
    name: 'Alfentanil', classes: ['Opioid'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.92, synergyGroup: 'Opioid', pkModel: 'Maitre',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    // Table 26.5, Miller's 9th Ed: Manual infusion scheme loading/maintenance doses (anesthesia range)
    indications: { 'Analgesia': { dose: '10-25', unit: 'mcg/kg', type: 'Bolus' }, 'Induction': { dose: '50-150', unit: 'mcg/kg', type: 'Bolus' }, 'Maintenance': { dose: '0.5-3', unit: 'mcg/kg/min', type: 'Infusion' } },
    // Default pk is the Maitre model (Table 26.7) evaluated for a 70 kg, age-40, male reference patient; updateModelParameters() recalculates per-patient when TCI is engaged.
    // ke0=1.5/min: clinical alfentanil onset 1-2 min (rapid CNS penetration; high non-ionized fraction).
    // Prior ke0=0.77 gave t_peak=2.54 min. ke0=1.5 → t_peak=1.65 min ✓. Maitre PK parameters unchanged.
    pk: { V1: 7.77, V2: 12.0, V3: 10.5, k10: 0.0458, k12: 0.104, k21: 0.067, k13: 0.017, k31: 0.0126, ke0: 1.5, coSensitivity: 0.8 },
    // Table 26.2, Miller's 9th Ed: C50 for incision/painful stimulus 200-300 ng/mL (midpoint 250 ng/mL); C50 for spontaneous ventilation suppression 170-230 ng/mL (midpoint 200 ng/mL) used as the apnea threshold.
    // hrMax/sysMax/diaMax/rrMax are not quantified for alfentanil in this chapter; set via the class-average fallback pattern across the other Opioid-classed entries in this file (fentanyl, sufentanil, morphine, hydromorphone, remifentanil).
    pd: { c50: 0.25, gamma: 1.5, sysMax: -13, diaMax: -13, hrMax: -18, rrMax: -14, inducesApneaAtCe: 0.2 },
    notes: 'Rapid onset, short context-sensitive half-time relative to fentanyl due to a small V1 and high hepatic extraction. Table 26.7 (Miller\'s 9th Ed) gives the Maitre TCI model: V1 is sex-dependent (female V1 = 1.15x male V1 per kg), and k10/k31 are age-dependent above 40 years.'
  },
  hydromorphone: { 
    name: 'Hydromorphone', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (glucuronidation) to inactive H3G', proteinBinding: 0.19, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Analgesia': { dose: '0.2-1.0', unit: 'mg', type: 'Bolus' } },
    // k10=0.006/min → t½β≈115 min (~2h). Clinical t½ 2-3h IV. ke0=0.2/min → peak effect
    // ~5-8 min (faster than morphine due to higher lipophilicity, faster BBB penetration).
    pk: { V1: 25.0, V2: 40.0, V3: 150, k10: 0.006, k12: 0.05, k21: 0.02, k13: 0.02, k31: 0.01, ke0: 0.2, coSensitivity: 0.5 },
    pd: { c50: 0.015, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -10, rrMax: -14, inducesApneaAtCe: 0.02 },
    notes: '7x more potent than morphine. Safe in renal failure (no active metabolites accumulate).'
  },
  morphine: { 
    name: 'Morphine', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (Glucuronidation) to active metabolites', proteinBinding: 0.35, synergyGroup: 'Opioid',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    activeMetabolites: ['Morphine-6-glucuronide', 'Morphine-3-glucuronide'],
    indications: { 'Analgesia': { dose: '2.0-4.0', unit: 'mg', type: 'Bolus' } },
    // k10=0.005/min → t½β≈138 min (~2.3h). Correct clinical t½ 2-4h from slower elimination.
    // Slow ke0=0.05/min (slow CNS penetration across BBB) → peak effect at ~14-20 min ✓
    // (clinically morphine analgesia peaks at 15-30 min IV). Histamine-releasing at high Ce.
    pk: { V1: 30.0, V2: 50.0, V3: 200, k10: 0.005, k12: 0.04, k21: 0.02, k13: 0.01, k31: 0.005, ke0: 0.05, coSensitivity: 0.5 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -15, diaMax: -20, hrMax: -5, rrMax: -14, inducesApneaAtCe: 0.08 },
    notes: 'Triggers heavy histamine release (hypotension, flushing, pruritus). STRICT renal warning: Morphine-6-glucuronide (M6G) is highly active and accumulates in renal failure causing prolonged respiratory depression; Morphine-3-glucuronide (M3G) accumulates causing neuroexcitation and seizures.'
  },
  remifentanil: { 
    name: 'Remifentanil', classes: ['Opioid (Ultra-short)'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'IBW',
    metabolism: 'Nonspecific Blood & Tissue Esterases', proteinBinding: 0.70, synergyGroup: 'Opioid', pkModel: 'Minto',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Maintenance': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' }, 'Intubation Spike': { dose: '1.0', unit: 'mcg/kg', type: 'Bolus' } },
    // Minto 3-compartment model (Table 26.7, Miller's 9th Ed; Minto et al. Anesthesiology 1997).
    // V1=5.1L (reference 40yo male LBM55). k10=0.51/min = Cl1(2.6)/V1(5.1). k12=0.35=Cl2/V1.
    // ke0=0.6/min (Minto ke0=0.595/min) → t½ effect-site ~1.15 min → peak Ce ~1.7 min ✓.
    // C50=0.001 mg/L=1 ng/mL for analgesia; inducesApneaAtCe=0.0015 mg/L=1.5 ng/mL ✓.
    // Context-sensitive t½ hardcoded at 3.5 min in PKPDEngine.ts (line 419) — correct.
    pk: { V1: 5.1, V2: 9.82, V3: 5.42, k10: 0.51, k12: 0.35, k21: 0.27, k13: 0.11, k31: 0.047, ke0: 0.6, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 2.5, sysMax: -20, diaMax: -15, hrMax: -30, rrMax: -14, inducesApneaAtCe: 0.0015 },
    notes: 'Context-independent half-life (constant 3-5 min offset regardless of infusion duration). Fast bolus causes severe bradycardia. Prolonged infusion at >0.15 mcg/kg/min triggers acute opioid tolerance and Opioid-Induced Hyperalgesia (OIH).'
  },
  sufentanil: {
    name: 'Sufentanil', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic', proteinBinding: 0.92, synergyGroup: 'Opioid', pkModel: 'Gepts',
    targetReceptor: 'Mu-Opioid (u1/u2)', intracellularCascade: 'Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)',
    indications: { 'Analgesia': { dose: '5-10', unit: 'mcg', type: 'Bolus' }, 'Induction': { dose: '0.1-0.3', unit: 'mcg/kg', type: 'Bolus' } },
    // Gepts 3-compartment model (Table 26.7, Miller's 9th Ed). V1=14.3L, V2=63.4L, V3=251.9L.
    // k10=0.0645/min from Cl=0.0645×V1=0.922 L/min. Large Vd → context-sensitive half-time rises
    // significantly with infusion duration (CSHTs up to 30-40 min at 4h). ke0=0.12 per Gepts.
    pk: { V1: 14.3, V2: 63.4, V3: 251.9, k10: 0.0645, k12: 0.1086, k21: 0.0245, k13: 0.0229, k31: 0.0013, ke0: 0.12, coSensitivity: 0.8 },
    // c50=0.0006 mg/L (0.6 ng/mL): published sufentanil/fentanyl potency ratio 5-10×.
    // Prior c50=0.0003 (0.3 ng/mL) gave 13.3× ratio vs fentanyl (c50=0.004 mg/L) — too potent.
    // 0.004/0.0006 = 6.7× fentanyl ✓. inducesApneaAtCe raised proportionally.
    pd: { c50: 0.0006, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -25, rrMax: -15, inducesApneaAtCe: 0.001 },
    notes: '5-10x more potent than fentanyl. Extremely potent, highly lipophilic. Causes cardiovascular stability but severe respiratory depression.'
  },

  // === PARALYTICS & REVERSALS ===
  cisatracurium: { 
    name: 'Cisatracurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hoffmann Elimination', proteinBinding: 0.82, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.15-0.2', unit: 'mg/kg', type: 'Bolus' }, 'Infusion': { dose: '1-3', unit: 'mcg/kg/min', type: 'Infusion' } },
    // ke0=0.4/min → t_peak≈3-5 min (slower onset than rocuronium, typical for cisatracurium).
    // k10=0.040/min (↓ from 0.065): cisatracurium has slower elimination than atracurium (single isomer).
    // 2-comp biexponential: β=0.016/min → 25%T1 recovery ~50 min ✓ (clinical 45-75 min).
    // hofmannMultiplier in tick() scales k10 for temperature/pH (Q10 effect).
    // ke0=0.04/min: calibrated so Ce reaches EC90 at ~3.5-4 min with V1=5.4 and c50=0.15.
    // Gemini's ke0=0.12 gave TOF→0 at 1.0 min. Clinical: 3-5 min onset.
    // k10=0.090/min: prior 0.053 gave 25%T1=99 min (clinical 45-75 min — 32-120% too long).
    // ODE simulation: k10=0.090 → onset=5.0 min ✓ (clinical 5-7 min), 25%T1=64 min ✓ (clinical 45-75 min).
    pk: { V1: 5.4, V2: 12.0, V3: 0, k10: 0.090, k12: 0.091, k21: 0.076, k13: 0, k31: 0, ke0: 0.04, coSensitivity: 0.0 },
    pd: { c50: 0.15, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.1, inducesApneaAtCe: 0.1, receptorAffinity: 0.85 },
    notes: 'Organ-independent clearance via Hoffmann elimination (temperature/pH-dependent). Ideal for renal and liver failure. Duration extended in hypothermia (cardiac surgery, trauma). ke0 calibrated for clinical onset 3-5 min at intubating dose.'
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
  edrophonium: { 
    name: 'Edrophonium', classes: ['AChE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (70%) and Hepatic', proteinBinding: 0.20, mechanism: 'Inhibitor', targetReceptor: 'Acetylcholinesterase', intracellularCascade: 'Rapid competitive inhibition of AChE -> ACh accumulates -> M2 (Gi) activation -> bradycardia if unopposed',
    indications: { 'Reversal': { dose: '0.5-1.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.06, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 }, 
    pd: { c50: 0.25, gamma: 2, sysMax: 0, diaMax: 0, hrMax: -50, rrMax: 0 },
    notes: 'Rapid onset (0.8-2 minutes), short-acting AChE inhibitor. Dissociates quickly. Must be co-administered with Atropine due to rapid vagal onset. Pairing with Glycopyrrolate causes transient bradycardia due to onset mismatch.'
  },
  pyridostigmine: { 
    name: 'Pyridostigmine', classes: ['AChE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (75%) and Hepatic', proteinBinding: 0.15, mechanism: 'Inhibitor', targetReceptor: 'Acetylcholinesterase', intracellularCascade: 'Carbamylose covalent inhibition of AChE -> ACh accumulates -> M2 (Gi) activation -> bradycardia if unopposed',
    indications: { 'Reversal': { dose: '0.2-0.35', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0.1 }, 
    pd: { c50: 0.088, gamma: 2, sysMax: 0, diaMax: 0, hrMax: -30, rrMax: 0 },
    notes: 'Slow onset (12-16 minutes), long-acting AChE inhibitor. Paired with Glycopyrrolate. Carbamylose mechanism inhibits pseudocholinesterase (BChE) by 90%, prolonging succinylcholine block.'
  },
  rocuronium: { 
    name: 'Rocuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (excreted unchanged in bile >70%, renal 10-20%)', proteinBinding: 0.30, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.6', unit: 'mg/kg', type: 'Bolus' }, 'RSI': { dose: '1.2', unit: 'mg/kg', type: 'Bolus' } },
    // PK: Published Kleijn 1994 3-compartment model. V1=3.5L (central), V2=14.5L (fast peripheral).
    // k10=0.041, k12=0.039, k21=0.009/min (very slow return from peripheral → terminal t½β≈159 min).
    // Prior V1=16L gave Cp0=2.625 mg/L → 25% T1 recovery at ~10 min (clinically wrong; should be 30-45 min).
    // V1=3.5 → Cp0=12 mg/L at 0.6 mg/kg; k21=0.009 keeps B-term ≈ Cp0/17 ≈ 0.7 mg/L above c50=0.9
    // for 35 min; t_peak=2.4 min with ke0=1.2 ✓. 25% T1 recovery at ~35 min ✓.
    pk: { V1: 3.5, V2: 14.5, V3: 0, k10: 0.041, k12: 0.039, k21: 0.009, k13: 0, k31: 0, ke0: 0.18, coSensitivity: 0.3 },
    pd: { c50: 1.2, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 6, rrMax: -20, inducesParalysisAtCe: 0.9, inducesApneaAtCe: 0.9, receptorAffinity: 0.70 },
    notes: 'Rapid onset (~2-3 min at 0.6 mg/kg), intermediate-acting NDMR (~30-40 min duration). RSI dose 1.2 mg/kg: intubating conditions at ~60-90 sec. Cumulative dosing: second 0.6 mg/kg before first distributes adds substantially (near-RSI if given within 20 min of first dose). Reversed by Sugammadex (2 mg/kg moderate, 4 mg/kg deep, 16 mg/kg immediate).'
  },
  succinylcholine: { 
    name: 'Succinylcholine', classes: ['Depolarizing NMBA'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Pseudocholinesterase (butyrylcholinesterase) to succinylmonocholine', mechanism: 'Agonist', targetReceptor: 'nAChR (Agonist)', intracellularCascade: 'Depolarizing agonist -> opens Na+/K+ channels -> fasciculations -> desensitization phase',
    indications: { 'RSI': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' } },
    // k10=0.35/min → plasma t½≈2 min (pseudocholinesterase hydrolysis). Clinical duration
    // 5-10 min emerges from block lasting while Ce>0.3 mg/L: at Cp0=21 mg/L (1.5 mg/kg×70kg/5L),
    // Ce falls below 0.3 threshold at ~10 min. bcheMultiplier in tick() scales k10 for variants.
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.35, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 },
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
    // ke0=0.5/min → onset 3-4 min at 0.1 mg/kg (same clinical target as rocuronium's 0.6 mg/kg).
    // k10=0.025/min → t½β≈35 min. WARNING: 3-desacetylvecuronium (active metabolite) accumulates
    // in renal failure — tick() renalRatio scaling on k10 captures this.
    // ke0=0.06/min: calibrated so Ce reaches EC90 at ~3.5 min with V1=4.5 and c50=0.13.
    // Gemini's ke0=0.24 gave TOF→0 at 0.7 min (looks like rocuronium). Clinical: 3-5 min onset.
    // ke0 and EC50 must be internally consistent — using ke0 from Sohn with c50 from Sohn (same paper).
    // k10=0.100/min: prior 0.053 gave 25%T1=70 min (clinical 25-40 min — twice as long as vecuronium should last).
    // k10=0.100 → ODE simulation: 25%T1=40 min ✓, onset=5.2 min ✓ (clinical 3-5 min).
    pk: { V1: 4.5, V2: 12.0, V3: 0, k10: 0.100, k12: 0.082, k21: 0.078, k13: 0, k31: 0, ke0: 0.06, coSensitivity: 0.2 },
    pd: { c50: 0.13, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.1, inducesApneaAtCe: 0.1, receptorAffinity: 0.75 },
    notes: 'Intermediate-acting NDMR. STRICT renal warning: Hepatic deacetylation forms 3-desacetylvecuronium, an active metabolite (has 80% potency of parent compound) which is renal-excreted and accumulates heavily in renal failure, causing severe prolonged paralysis. Can be reversed by Sugammadex.'
  },
  dantrolene: {
    name: 'Dantrolene', classes: ['Muscle Relaxant', 'MH Treatment'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4) to active 5-hydroxydantrolene, renal excretion', proteinBinding: 0.90, mechanism: 'RyR1 Antagonist', targetReceptor: 'Ryanodine Receptor 1 (RyR1)',
    intracellularCascade: 'Inhibits Ca2+ release from sarcoplasmic reticulum -> restores resting Ca2+ balance in muscle fibers',
    indications: { 'MH Crisis': { dose: '2.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.00115, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.0 },
    pd: { c50: 1.5, gamma: 2.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, inducesParalysisAtCe: 999.0, inducesApneaAtCe: 999.0 },
    notes: 'Direct-acting skeletal muscle relaxant (RyR1 antagonist). Used for treating Malignant Hyperthermia. Reconstitute in sterile water only. Reversal of hypermetabolic state. Side effects include muscle weakness (C50 1.5 for twitch depression), phlebitis, and respiratory insufficiency.'
  },
  atracurium: {
    name: 'Atracurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Hofmann Elimination & Ester Hydrolysis', proteinBinding: 0.82, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.4-0.5', unit: 'mg/kg', type: 'Bolus' }, 'Infusion': { dose: '5-10', unit: 'mcg/kg/min', type: 'Infusion' } },
    // ke0=0.4/min → onset 3-5 min (Hoffmann + ester hydrolysis).
    // k10=0.160/min: prior 0.120 gave ODE-verified 25%T1=43 min (clinical 20-35 min — ~23% too long).
    // k10=0.160 → onset=2.9 min ✓ (clinical 2-3 min), 25%T1=34 min ✓ (clinical 20-35 min).
    // hofmannMultiplier in tick() scales k10 for temperature/pH (Q10 effect).
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.160, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.06, coSensitivity: 0.0 },
    pd: { c50: 0.2, gamma: 4.0, sysMax: -8, diaMax: -6, hrMax: 8, rrMax: -20, inducesParalysisAtCe: 0.13, inducesApneaAtCe: 0.13, receptorAffinity: 0.8 },
    notes: 'Intermediate-acting benzylisoquinoline NDMR. Undergoes spontaneous chemical degradation (Hofmann elimination) and non-specific ester hydrolysis. Cleared independently of organ function, but generates active metabolite laudanosine, which can accumulate in renal failure and lower seizure threshold. Histamine release causes slight, transient hypotension/tachycardia (Table 27.9/27.10, Ch27, Miller\'s 9th Ed).'
  },
  mivacurium: {
    name: 'Mivacurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'Plasma Butyrylcholinesterase (same enzyme as Succinylcholine)', proteinBinding: 0.30, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    // Table 27.4, Miller's 9th Ed: Intubation 0.2-0.25 mg/kg; infusion 3-15 mcg/kg/min for 90-95% twitch inhibition.
    indications: { 'Intubation': { dose: '0.2-0.25', unit: 'mg/kg', type: 'Bolus' }, 'Infusion': { dose: '3-15', unit: 'mcg/kg/min', type: 'Infusion' } },
    // Table 27.2: short-acting (10-20 min clinical duration).
    // ke0=0.5/min → onset 2-3 min at 0.2 mg/kg.
    // k10=0.25/min, c50=0.15: ODE-verified: onset=2.8 min ✓ (clinical 2-3 min), 25%T1=15 min ✓ (clinical 12-20 min).
    // Prior: k10=0.19, c50=0.1 gave onset=1.3 min (too fast — appeared as fast as rocuronium) and 25%T1=25 min (too long).
    // bcheMultiplier in tick() dramatically extends duration in BChE variants (same enzyme as sux).
    pk: { V1: 8.0, V2: 15.0, V3: 0, k10: 0.25, k12: 0.1, k21: 0.08, k13: 0, k31: 0, ke0: 0.12, coSensitivity: 0.0 },
    pd: { c50: 0.15, gamma: 4.0, sysMax: -10, diaMax: -8, hrMax: 10, rrMax: -20, inducesParalysisAtCe: 0.10, inducesApneaAtCe: 0.10, receptorAffinity: 0.78 },
    notes: 'Short-acting benzylisoquinolinium NDMR (Table 27.2, Ch27, Miller\'s 9th Ed). Hydrolyzed by plasma butyrylcholinesterase - the same enzyme responsible for Succinylcholine metabolism - so block is similarly prolonged under heterozygous/atypical pseudocholinesterase genotypes, pregnancy, or cirrhosis (Table 27.1). Highest histamine-release potency of the benzylisoquinolinium NDMRs, causing slight transient hypotension/tachycardia. Reversible with Neostigmine/Edrophonium/Pyridostigmine like other nondepolarizers; NOT reversible with Sugammadex (not a steroidal compound).'
  },
  pancuronium: {
    name: 'Pancuronium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'Renal (mostly unchanged 40-70%), hepatic 10-20%', proteinBinding: 0.87, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    // Table 27.4, Miller's 9th Ed: Intubation 0.08-0.12 mg/kg.
    indications: { 'Intubation': { dose: '0.08-0.1', unit: 'mg/kg', type: 'Bolus' } },
    // V1=5L: prior V1=15 gave Cp0=0.47<c50=0.9 → drug produced <1% block at 0.1mg/kg (completely inert).
    // V1=5 → Cp0=1.4 mg/L at 0.1 mg/kg, well above new c50=0.15. ke0=0.8/min → t_peak≈4 min ✓.
    // k10=0.020/min: prior 0.007 gave 2-comp terminal β t½=4.5 HOURS → 25%T1 never recovered in
    // simulation (>200 min). k10=0.020 → β=0.007/min → t½β=99 min → 25%T1 at 73 min ✓ (clinical 60-100 min).
    pk: { V1: 5.0, V2: 30.0, V3: 0, k10: 0.020, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0.1 },
    // c50=0.20: calibrated to Duvaldestin et al. 1982 / Stanski et al.
    pd: { c50: 0.20, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 20, rrMax: -20, inducesParalysisAtCe: 0.15, inducesApneaAtCe: 0.15, receptorAffinity: 0.8 },
    notes: 'Long-acting steroidal NDMR (Table 27.2, Ch27, Miller\'s 9th Ed). Predominantly renally excreted unchanged, so accumulates significantly in renal failure. Vagolytic: blocks cardiac M2 muscarinic receptors moderately, causing the most pronounced tachycardia of any nondepolarizer (Table 27.10). NOT reversible with Sugammadex.'
  },
  gantacurium: {
    name: 'Gantacurium', classes: ['NDMR'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'L-Cysteine adduction & ester hydrolysis', proteinBinding: 0.35, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 15.0, V3: 0, k10: 0.12, k12: 0.08, k21: 0.08, k13: 0, k31: 0, ke0: 0.18, coSensitivity: 0.1 },
    pd: { c50: 0.2, gamma: 4.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.15, inducesApneaAtCe: 0.15, receptorAffinity: 0.75 },
    notes: 'Ultrashort-acting asymmetric mixed-onium chlorofumarate NDMR. Has a rapid onset similar to succinylcholine. Undergoes rapid chemical inactivation by L-cysteine adduction. Reversible by L-cysteine.'
  },
  cw002: {
    name: 'CW002', classes: ['NDMR'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'IBW',
    metabolism: 'L-Cysteine adduction', proteinBinding: 0.50, mechanism: 'Antagonist', targetReceptor: 'nAChR (Antagonist)', intracellularCascade: 'Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization',
    indications: { 'Intubation': { dose: '0.08-0.12', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.06, k12: 0.06, k21: 0.06, k13: 0, k31: 0, ke0: 0.10, coSensitivity: 0.2 },
    pd: { c50: 0.15, gamma: 4.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.1, inducesApneaAtCe: 0.1, receptorAffinity: 0.80 },
    notes: 'Intermediate-acting asymmetric fumarate NDMR. Cleared via slow chemical inactivation by L-cysteine. Can be reversed immediately with L-cysteine infusion.'
  },
  l_cysteine: {
    name: 'L-Cysteine', classes: ['Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal excretion / endogenous metabolization', proteinBinding: 0.0, mechanism: 'Chelator', targetReceptor: 'Asymmetric fumarate double bond', intracellularCascade: 'Covalent adduction -> chemical inactivation of gantacurium/CW002',
    indications: { 'Specific Rescue': { dose: '10.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0 },
    pd: { c50: 0.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, chelationRatio: 1.0 },
    notes: 'Endogenous amino acid. Acts as a specific rescue reversal agent for gantacurium and CW002 by rapidly adducting to their fumarate double bond, terminating blockade within 1-2 minutes.'
  },


  // === INOTROPES & VASOPRESSORS ===
  dobutamine: {
    name: 'Dobutamine', classes: ['Inotrope'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (COMT/conjugation)', mechanism: 'Agonist', targetReceptor: 'Beta-1 > Beta-2', intracellularCascade: 'Low Dose: B1 (Gs -> cAMP), High Dose: B1/B2 (Gs -> cAMP) + a1 (Gq -> IP3/DAG/Ca2+)',
    indications: { 'Low CO': { dose: '2.5-10', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 },
    // c50 0.005→0.12 mg/L: prior value caused SATURATION at the MINIMUM clinical dose.
    // At 5 mcg/kg/min (70kg): Css=0.07 mg/L → old fraction=98.1% (near-max at lowest dose, no dose-response).
    // With c50=0.12: 5 mcg/kg/min→31%, 10→56%, 20→78% — full dose-response curve across clinical range ✓.
    pd: { c50: 0.12, gamma: 1.5, sysMax: 20, diaMax: -15, hrMax: 30, rrMax: 0 },
    notes: 'Synthetic catecholamine. Increases cardiac output and heart rate; causes mild peripheral vasodilation (Beta-2) that can lower SVR. Dose-response spans 2.5-20 mcg/kg/min.'
  },
  dopamine: {
    name: 'Dopamine', classes: ['Inotrope/Pressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'D1, Beta-1, Alpha-1', intracellularCascade: 'Low: D1 (Gs -> cAMP). Med: B1 (Gs -> cAMP). High: a1 (Gq -> IP3/DAG/Ca2+)',
    indications: { 'Support': { dose: '5-15', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.4, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.2, coSensitivity: 0.1 },
    // c50 0.01→0.10 mg/L: same saturation bug as dobutamine.
    // At 5 mcg/kg/min (70kg): Css=0.058 mg/L → old fraction=93.4% (effectively maxed at low dose).
    // With c50=0.10: 3 mcg/kg/min→17% (dopaminergic), 10→56% (beta-1), 20→78% (alpha-1) ✓.
    pd: { c50: 0.10, gamma: 1.5, sysMax: 30, diaMax: 20, hrMax: 40, rrMax: 0 },
    notes: 'Dose-dependent receptor profiles: low dose (1-3 mcg/kg/min) is dopaminergic D1 vasodilation; intermediate (3-10 mcg/kg/min) is Beta-1 inotropic; high dose (10-20 mcg/kg/min) is Alpha-1 vasopressor.'
  },
  ephedrine: {
    name: 'Ephedrine', classes: ['Mixed Agonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (minimal), mostly excreted unchanged', mechanism: 'Direct/Indirect Agonist', targetReceptor: 'Alpha-1, Beta-1, Beta-2 (Direct & Indirect)', intracellularCascade: 'Indirect NE release + Direct: a1 (Gq->Ca2+), B1/B2 (Gs->cAMP)',
    indications: { 'Hypotension': { dose: '5-10', unit: 'mg', type: 'Bolus' } },
    // ke0=2.0/min: clinical ephedrine onset 1-2 min IV. Prior ke0=0.5 gave t_peak=5.1 min — appeared
    // slower than vasopressin, teaching the wrong clinical ranking. ke0=2.0 → t_peak=1.9 min ✓.
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.2 },
    // Receptor profile rationale: ephedrine's DOMINANT mechanism is indirect — it displaces
    // norepinephrine from sympathetic nerve terminals. Endogenous NE is predominantly
    // Alpha1/Beta1 (not Beta2). Prior Beta2=2 was cancelling ~60% of Alpha1's SVR increase
    // (net svrDelta coefficient = (2×0.25 - 2×0.15) = 0.20 per fraction unit), making 10mg
    // raise SVR by only ~8% — clinically it raises SVR 20-40%. Root cause of BP not rising.
    // c50 change: 0.5→0.30 mg/L. A 10mg bolus (V1=25L) gives Ce≈0.39 mg/L, which was
    // BELOW c50=0.5 (fraction=41%). Now fraction=60% — appropriate for a standard clinical
    // dose sitting just above c50. 25mg (near-max dose) → Ce≈0.98 → fraction=85% ✓.
    // New net SVR coefficient: (3×0.25 - 1×0.15) = 0.60/fraction — 3× stronger than before.
    pd: { c50: 0.30, gamma: 1.5, sysMax: 40, diaMax: 25, hrMax: 30, rrMax: 0, receptors: { Alpha1: 3, Beta1: 2, Beta2: 1 } },
    notes: 'Mixed-acting synthetic amine (direct agonist + stimulates endogenous NE release from nerve terminals). NE release is Alpha1/Beta1-dominant → meaningful SVR increase + inotropy/chronotropy. Causes tachyphylaxis with repeated dosing. Restores BP while maintaining HR and CO.'
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
    metabolism: 'MAO/COMT', mechanism: 'Agonist', targetReceptor: 'Alpha-1 > Beta-1', intracellularCascade: 'a1 (Gq -> IP3/DAG/Ca2+), B1/B2 (Gs -> adenylate cyclase -> cAMP)',
    indications: { 'Shock / Vasoplegia': { dose: '0.01-0.3', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 8.0, V2: 0, V3: 0, k10: 0.6, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 },
    // c50=0.001 mg/L (1 ng/mL): published NE vasoconstriction EC50 ~0.6-2 ng/mL.
    // Prior c50=0.005 mg/L (5 ng/mL) was 3-8× too high → NE at 0.1 mcg/kg/min gave only +6 mmHg MAP
    // (clinical +20-40 mmHg). With c50=0.001: Cp_ss=1.46 ng/mL at 0.1 mcg/kg/min → fraction=59% → +29 mmHg ✓.
    pd: { c50: 0.001, gamma: 1.5, sysMax: 40, diaMax: 50, hrMax: 10, rrMax: 0, receptors: { Alpha1: 3, Beta1: 2, Beta2: 1 } },
    notes: 'Endogenous catecholamine. Powerful vasoconstrictor (Alpha-1) with mild inotropic cardiac support (Beta-1). Primary vasopressor for septic and vasodilatory shock.'
  },
  phenylephrine: { 
    name: 'Phenylephrine', classes: ['Alpha-1 Agonist'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (MAO)', mechanism: 'Agonist', targetReceptor: 'Alpha-1', intracellularCascade: 'Selective a1 (Gq-coupled -> Phospholipase C -> IP3/DAG -> intracellular Ca2+ release)',
    indications: { 'Push Dose': { dose: '50-100', unit: 'mcg', type: 'Bolus' }, 'Infusion': { dose: '0.1-0.5', unit: 'mcg/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 3.0, coSensitivity: 0.2 },
    // hrMax=-12 (F49, L4): phenylephrine's bradycardia is almost entirely BAROREFLEX-mediated — it is a
    // pure alpha-1 agonist with no meaningful direct chronotropic action. CardiovascularEngine already
    // models that baroreflex explicitly (`autonomicHrMod`, which saturates at -25 bpm off the MAP error
    // this drug creates), so the prior hrMax=-35 — whose own comment described it as "baroreceptor-
    // mediated" — was charging the SAME reflex twice. The two summed to about -60 bpm, so a 200 mcg push
    // drove HR from 58 to ~0 while the patient stayed in sinus rhythm at 205 mmHg systolic. This value
    // now represents only the small direct/pre-baroreflex component; the engine supplies the rest.
    pd: { c50: 0.02, gamma: 1, sysMax: 30, diaMax: 45, hrMax: -12, rrMax: 0, receptors: { Alpha1: 3, Beta1: 0, Beta2: 0 } },
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
    // c50 2.0→0.001 mg/L: prior value was ~2000× too high → essentially zero effect at any clinical dose.
    // 0.3 mcg/kg IV bolus (70kg=21 mcg=0.021 mg), V1=15L → Ce_peak≈0.0014 mg/L → old fraction=0.0%.
    // Published alpha-2 agonist EC50 ~1-2 ng/mL = 0.001-0.002 mg/L. With c50=0.001: fraction=62% ✓.
    pd: { c50: 0.001, gamma: 1.5, sysMax: -25, diaMax: -15, hrMax: -20, rrMax: -2 },
    notes: 'Centrally-acting Alpha-2 agonist. Reduces sympathetic outflow, lowering SVR and HR. IV dose 150-300 mcg produces meaningful hemodynamic effects.'
  },
  enalaprilat: { 
    name: 'Enalaprilat', classes: ['ACE Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', mechanism: 'Inhibitor', targetReceptor: 'ACE',
    indications: { 'HTN': { dose: '1.25-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.015, coSensitivity: 0.1 }, 
    // F29: c50 1.0→0.3 — ACE inhibition's acute BP drop is genuinely modest in a euvolemic normotensive
    // patient (low renin/angiotensin drive), but the old c50 combined with the slow ke0 made it fully
    // inert; a modest drop now registers. (A larger effect would require RAAS-state dependence — Layer 3.)
    pd: { c50: 0.3, gamma: 1.5, sysMax: -25, diaMax: -20, hrMax: 0, rrMax: 0 },
    notes: 'Active IV form of enalapril. Inhibits Angiotensin Converting Enzyme. Can cause refractory intraoperative hypotension if not held on day of surgery.'
  },
  esmolol: { 
    name: 'Esmolol', classes: ['Beta-1 Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'RBC Esterases', mechanism: 'Antagonist', targetReceptor: 'Beta-1', intracellularCascade: 'B1 antagonist -> blocks Gs-coupled activation -> decreases cAMP in myocardium',
    indications: { 'Tachycardia': { dose: '10-20', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '50-100', unit: 'mcg/kg/min', type: 'Infusion' } },
    // k10=0.077/min → t½≈9 min (esmolol t½ 9 min from RBC ester hydrolysis; ultra-short). ✓
    // ke0=1.5/min → peak effect ~1-2 min after bolus ✓. Note: prior k10=0.4 gave t½=1.7 min (way too fast).
    pk: { V1: 3.3, V2: 0, V3: 0, k10: 0.077, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: -15, diaMax: -10, hrMax: -30, rrMax: 0 },
    notes: 'Ultra-short acting cardioselective Beta-1 blocker. Metabolized via red blood cell esterases (half-life ~9 mins). Lowers HR and BP rapidly.'
  },
  hydralazine: { 
    name: 'Hydralazine', classes: ['Arterial Vasodilator'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (N-acetylation)', mechanism: 'Direct Dilator', targetReceptor: 'Arterial Smooth Muscle',
    indications: { 'HTN': { dose: '5-20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0, k31: 0, ke0: 0.02, coSensitivity: 0.3 },
    // c50=0.03 mg/L: prior 1.5 mg/L was ~50× too high → 10mg IV produced <2% effect (effectively inert).
    // ke0=0.02/min → t_peak≈15 min (slow onset correct ✓). Ce_peak at 10mg ≈ 0.049 mg/L.
    // At c50=0.03: fraction(Ce=0.049)=0.157 → MAP -13 mmHg ✓. At 20mg: fraction=0.676 → -16 mmHg ✓.
    pd: { c50: 0.03, gamma: 1.5, sysMax: -40, diaMax: -30, hrMax: 25, rrMax: 0 },
    notes: 'Direct arterial smooth muscle vasodilator. Prompts slow, progressive BP reduction but triggers profound reflex tachycardia. Slow onset (15-20 min).'
  },
  labetalol: { 
    name: 'Labetalol', classes: ['Mixed Alpha/Beta'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Alpha-1, Beta-1/2', intracellularCascade: 'Mixed antagonist -> blocks a1 (Gq), B1/B2 (Gs) -> prevents Ca2+ release and cAMP production',
    indications: { 'HTN': { dose: '10-20', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): the prior k10=0.007 fixed the TERMINAL t½ (6.2h) but the hemodynamic EFFECT still
    // decayed with an effect-t½ of only ~14 min — the effect follows the fast central/redistribution
    // (α) decline, not terminal β. k12 0.05→0.025 (less redistribution loss) + k21 0.02→0.035 (faster
    // return sustains the central tail) + k10→0.002 lengthen the effect-t½ to ~2.3h (clinical labetalol
    // duration 2-4h) while holding the calibrated peak effect (~59% Emax → MAP ≈ −14 mmHg at 20 mg).
    pk: { V1: 60.0, V2: 0, V3: 0, k10: 0.002, k12: 0.025, k21: 0.035, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.2 },
    // c50=0.25 mg/L: prior 0.5 gave MAP -5 mmHg at 20 mg IV (clinical -10-20 mmHg). At Ce_peak=0.27 mg/L
    // with c50=0.25: fraction=54% → MAP -12 mmHg ✓, HR -11 bpm ✓ (clinical -10-15 bpm).
    pd: { c50: 0.25, gamma: 2.0, sysMax: -40, diaMax: -35, hrMax: -20, rrMax: 0 },
    notes: 'Mixed competitive antagonist. 1:7 Alpha-1 to Beta blockade ratio when given IV. Lowers SVR and SBP while preventing reflex tachycardia.'
  },
  metoprolol: { 
    name: 'Metoprolol', classes: ['Beta-1 Blocker'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6)', proteinBinding: 0.12, mechanism: 'Antagonist', targetReceptor: 'Beta-1', intracellularCascade: 'B1 antagonist -> blocks Gs-coupled activation -> decreases cAMP in myocardium',
    indications: { 'Tachycardia': { dose: '2.5-5.0', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): effect-t½ 17→112 min (clinical metoprolol duration 3-6h). k10 0.02→0.004, k12 0.04→0.025,
    // k21 0.02→0.03 — slower elimination + less redistribution loss; peak HR effect held (~52% Emax).
    pk: { V1: 40.0, V2: 0, V3: 0, k10: 0.004, k12: 0.025, k21: 0.03, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.1, gamma: 1.5, sysMax: -20, diaMax: -15, hrMax: -35, rrMax: 0 },
    notes: 'Cardioselective Beta-1 adrenergic blocker. Intermediate acting. Lowers heart rate and contractility.'
  },
  propranolol: {
    name: 'Propranolol', classes: ['Beta-Blocker', 'Non-Selective'], routes: ['IV', 'PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (extensive first-pass, CYP2D6)', proteinBinding: 0.93, mechanism: 'Antagonist', targetReceptor: 'Beta-1, Beta-2',
    intracellularCascade: 'Non-selective beta antagonist -> blocks Gs-coupled cAMP signaling in heart (B1) and vasculature/bronchi (B2)',
    indications: { 'Thyroid Storm': { dose: '0.5-1', unit: 'mg', type: 'Bolus' }, 'Rate Control / HTN': { dose: '1-3', unit: 'mg', type: 'Bolus' }, 'Prophylaxis': { dose: '40-80', unit: 'mg/day', type: 'Bolus' } },
    // V1 350→30 L: prior used total Vd_ss (350L) as central compartment — wrong for one-compartment model.
    // This diluted drug to Ce=0.00286 mg/L at 1mg IV (2.86 ng/mL), far below the beta-blockade EC50 of
    // 20-50 ng/mL → essentially zero effect at any clinical IV dose. With V1=30L: Ce=33 ng/mL at 1mg ✓.
    // k10 0.04→0.006/min: t½ 17 min→115 min ≈ 2h (propranolol clinical t½ 3-6h, acceptable compromise).
    // c50 0.05→0.03 mg/L: calibrated against V1=30 so 1mg IV gives fraction=55%, 0.5mg→24%, 2mg→83% ✓.
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.006, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.6, coSensitivity: 0.2 },
    pd: { c50: 0.03, gamma: 2.0, sysMax: -25, diaMax: -20, hrMax: -35, rrMax: -1 },
    notes: 'Non-selective beta-blocker. KEY ADVANTAGE OVER ESMOLOL/METOPROLOL: Also blocks peripheral T4→T3 conversion → valuable in thyroid storm. Preferred IV beta-blocker for thyroid storm (0.5-1 mg IV q5-10 min until HR < 90). CONTRAINDICATIONS: Acute decompensated HF, asthma/COPD (B2 block → bronchospasm). Large Vd from lipophilicity → CNS penetration. Metabolized by CYP2D6 → drug-drug interactions.'
  },
  atenolol: {
    name: 'Atenolol', classes: ['Beta-1 Blocker', 'Cardioselective'], routes: ['PO', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (unchanged)', proteinBinding: 0.03, mechanism: 'Antagonist', targetReceptor: 'Beta-1 (cardioselective)',
    intracellularCascade: 'Selective B1 antagonist -> reduced heart rate and contractility; minimal B2 effects at therapeutic doses',
    indications: { 'Hypertension': { dose: '25-50', unit: 'mg/day', type: 'Bolus' }, 'Rate Control': { dose: '25-100', unit: 'mg/day', type: 'Bolus' } },
    // F37 (L3): 1-compartment — effect-t½ = ln2/k10. k10 0.012→0.0019 gives ~6h (clinical atenolol
    // 6-9h; renally cleared, long-acting). Peak unchanged (independent of k10 for a 1-comp bolus).
    pk: { V1: 60.0, V2: 0, V3: 0, k10: 0.0019, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.1 },
    // c50 0.3→0.10 mg/L: prior value gave only 12.8% effect at 5mg IV (clinical 5mg IV has significant
    // beta-blockade). Published atenolol EC50 for HR reduction ~100 ng/mL = 0.10 mg/L. At 5mg (C1=0.0833):
    // fraction=43%; 10mg→68%; 2.5mg→21% ✓ — now spans the clinical dose-response range.
    pd: { c50: 0.10, gamma: 1.5, sysMax: -18, diaMax: -14, hrMax: -30, rrMax: 0 },
    notes: 'Cardioselective B1 blocker (at low doses). Renally excreted → DOSE REDUCE in CKD. Hydrophilic → less CNS penetration → fewer nightmares/insomnia. Safe in mild-moderate COPD. Standard antihypertensive/rate control agent.'
  },
  digoxinFab: {
    name: 'Digoxin Immune Fab', classes: ['Antidote', 'Cardiac Glycoside Reversal'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Fab-digoxin complex)', proteinBinding: 0, mechanism: 'Antibody Fragment (Fab) Digoxin Chelation', targetReceptor: 'Digoxin',
    indications: { 'Digoxin Toxicity': { dose: '10-20', unit: 'vials', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.008, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 2.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Digoxin-specific antibody fragments (Digibind, DigiFab). Binds free digoxin → immediate reversal of toxicity within 30-60 min. Dose: 10-20 vials empirically for severe toxicity; 1 vial per 0.5 mg digoxin ingested (or calculated from serum level). CRITICAL CAUTION: After Fab administration, total serum digoxin reads FALSELY HIGH (immunoassay detects Fab-bound digoxin) — does NOT reflect free (active) digoxin. Post-reversal K⁺ can DROP precipitously as Na+/K+-ATPase recovers → monitor K+ closely. May cause exacerbation of HF (in patients dependent on digoxin inotropy).'
  },
  nifedipine: {
    name: 'Nifedipine', classes: ['CCB', 'Dihydropyridine'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.92, mechanism: 'Blocker', targetReceptor: 'L-type Calcium',
    intracellularCascade: 'Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle (selectivity: vascular >> cardiac) -> reduced Ca2+ influx -> vasodilation',
    indications: { 'Hypertension (PEC)': { dose: '10', unit: 'mg', type: 'Bolus' }, 'Hypertension (Chronic)': { dose: '30-60', unit: 'mg/day', type: 'Bolus' } },
    // F37 (L3): 1-compartment — effect-t½ = ln2/k10. k10 0.04→0.008 gives ~77 min (clinical
    // nifedipine acute BP effect ~1-2h). Peak unchanged (1-comp bolus).
    pk: { V1: 40.0, V2: 0, V3: 0, k10: 0.008, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.1 },
    pd: { c50: 0.4, gamma: 1.5, sysMax: -35, diaMax: -30, hrMax: 12, rrMax: 0 },
    notes: 'Dihydropyridine L-type CCB. Highly vascular-selective (50:1 vascular:cardiac ratio vs diltiazem ~3:1). First-line oral antihypertensive for acute severe hypertension in preeclampsia (10 mg PO q20min, max 30 mg). Reflex tachycardia via baroreflex. Potentiated by MgSO4 in PEC (can cause profound hypotension). Contraindicated in severe aortic stenosis (afterload drop → coronary steal). Short-acting formulation (immediate release) used for acute PEC; extended-release for chronic HTN.'
  },
  methyldopa: {
    name: 'Methyldopa', classes: ['Central Alpha-2 Agonist'], routes: ['PO', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal', proteinBinding: 0.15, mechanism: 'Agonist', targetReceptor: 'Alpha-2 Adrenergic (Central)',
    intracellularCascade: 'Central alpha-2 agonist -> reduces sympathetic outflow from NTS -> decreased NE release -> vasodilation and bradycardia',
    indications: { 'Chronic HTN in Pregnancy': { dose: '250-500', unit: 'mg', type: 'Bolus' }, 'Hypertensive Urgency IV': { dose: '250-500', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 0, V3: 0, k10: 0.015, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: -25, diaMax: -20, hrMax: -10, rrMax: 0 },
    notes: 'First-line antihypertensive for CHRONIC hypertension in pregnancy (decades of safety data, no evidence of teratogenicity). Central mechanism: metabolized to alpha-methylnorepinephrine → agonizes alpha-2 receptors in brainstem → decreases sympathetic outflow. Slow onset (4-6h PO). NOT preferred for acute severe hypertension in labor (labetalol/hydralazine/nifedipine preferred for speed). Coombs-positive hemolytic anemia in ~20% at high doses (months of therapy). Sedating (causes maternal drowsiness).'
  },
  nicardipine: {
    name: 'Nicardipine', classes: ['CCB'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Blocker', targetReceptor: 'L-type Calcium', intracellularCascade: 'Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle -> prevents Ca2+ influx',
    indications: { 'HTN': { dose: '5-15', unit: 'mg/hr', type: 'Infusion' } },
    // F37 (L3): 1-compartment — effect-t½ = ln2/k10. k10 0.05→0.0154 gives ~56 min (clinical
    // nicardipine bolus effect ~30-60 min; offset is context-sensitive). Peak unchanged (1-comp bolus).
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.0154, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
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
    notes: 'Balanced arterial and venous smooth muscle dilator. High potency, immediate effect. STRICT safety warning: Photodegradable. Releases 5 cyanide groups per molecule. Prolonged or high-dose infusion (~2 mcg/kg/min) risks lethal Cyanide Toxicity (inhibits cytochrome c oxidase, blocking oxidative phosphorylation, causing profound cellular hypoxia, lactic acidosis, and elevated mixed venous oxygen).'
  },
  phentolamine: { 
    name: 'Phentolamine', classes: ['Alpha Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Alpha-1, Alpha-2',
    indications: { 'Pheochromocytoma': { dose: '1-5', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): 1-compartment — effect-t½ = ln2/k10. k10 0.15→0.046 gives ~15 min (clinical
    // phentolamine α-blockade is short, ~15-20 min). Peak unchanged (1-comp bolus).
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.046, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 },
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
    // t½≈10-30 sec (RBC/endothelium uptake + deamination). k10=5.0/min → t½≈8.3s ✓
    // hrMax=-50: transient profound bradycardia (AV block) lasting 5-15s ✓ — NOT asystole.
    // Prior hrMax=-150 was unrealistic (would drop any HR to zero). Clinical effect is brief
    // complete/near-complete AV block lasting 5-15 seconds then self-terminating.
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 5.0, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 5.0, coSensitivity: 0.1 },
    pd: { c50: 0.2, gamma: 4.0, sysMax: -25, diaMax: -15, hrMax: -50, rrMax: 0 },
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
    // ke0=4.0/min (↑ from 0.5): prior gave t_peak=4.4 min; clinical IV atropine increases HR within 60s.
    // ke0=4.0 → t_peak = ln(4.0/0.08)/(4.0-0.08) = ln(50)/3.92 ≈ 1.0 min ✓.
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.08, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 4.0, coSensitivity: 0.1 },
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
    // Digoxin t½=36-40h. With V1=50, V2=300: beta=k10×k21/alpha. Using k10=0.00016/min,
    // k12=0.001, k21=0.0005 → very long t½β (hundreds of hours — appropriate for maintenance
    // with once-daily dosing visible in simulation). Renal clearance dominant (renalRatio scales k10).
    pk: { V1: 50.0, V2: 300.0, V3: 0, k10: 0.00016, k12: 0.001, k21: 0.0005, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.1 },
    pd: { c50: 1.5, gamma: 1.5, sysMax: 10, diaMax: 5, hrMax: -20, rrMax: 0 },
    notes: 'Inhibits Na+/K+-ATPase, indirectly increasing intracellular Ca2+ (inotropic) while increasing vagal tone (slowing AV conduction). Highly renal dependent.'
  },
  diltiazem: { 
    name: 'Diltiazem', classes: ['Class IV CCB'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4) to active deacetyldiltiazem', mechanism: 'Blocker', targetReceptor: 'L-type Calcium', intracellularCascade: 'Non-DHP CCB -> blocks L-type VGCCs in myocardium/AV node -> prevents Ca2+ influx',
    indications: { 'Afib / Rate Control': { dose: '10-20', unit: 'mg', type: 'Bolus' }, 'Infusion': { dose: '5-15', unit: 'mg/hr', type: 'Infusion' } },
    // F37 (L3): effect-t½ 7→42 min (was ~10x too short; clinical diltiazem rate-control 1-3h). Large V2
    // (60L) drains the central compartment fast; k10 0.1→0.014 + k12 0.05→0.025 + k21 0.05→0.08 sustain it.
    pk: { V1: 30.0, V2: 60.0, V3: 0, k10: 0.014, k12: 0.025, k21: 0.08, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.2 },
    pd: { c50: 0.5, gamma: 2.0, sysMax: -20, diaMax: -20, hrMax: -25, rrMax: 0 },
    notes: 'Benzothiazepine CCB. Slows AV nodal conduction. Negatively inotropic and vasodilatory.'
  },
  ibutilide: { 
    name: 'Ibutilide', classes: ['Class III'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Agonist', targetReceptor: 'Slow Inward Na+',
    indications: { 'Chemical Cardioversion': { dose: '1.0', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): effect-t½ 89→290 min. k10 0.05→0.015, k12 0.05→0.04 (ibutilide's antiarrhythmic action
    // outlasts a few-min bolus PK). Hemodynamic Emax is small — ibutilide is mainly a QT/Ikr effect.
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.015, k12: 0.04, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.2 }, 
    pd: { c50: 0.005, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -10, rrMax: 0 },
    notes: 'Class III antiarrhythmic. Prompts slow inward sodium currents and delays potassium currents, prolonging action potential duration. Used to chemically cardiovert AF/flutter. High risk of torsades de pointes (prolonged QT).'
  },
  lidocaine: { 
    name: 'Lidocaine', classes: ['Class IB'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP1A2/3A4) to active MEGX', proteinBinding: 0.60, mechanism: 'Blocker', targetReceptor: 'Fast Na+ Channels',
    indications: { 'Arrhythmia': { dose: '1.0-1.5', unit: 'mg/kg', type: 'Bolus' }, 'Airway Blunting': { dose: '1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 50.0, V3: 150, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0.02, k31: 0.01, ke0: 0.5, coSensitivity: 0.3, proteinBinding: 0.60, renalFraction: 0.0, hepaticFraction: 1.0 }, 
    pd: { c50: 1.0, gamma: 1.0, sysMax: -10, diaMax: -10, hrMax: -10, rrMax: 0, ccCnsRatio: 7.0 },
    notes: 'Class Ib sodium channel blocker. Suppresses ventricular arrhythmias (VT/VF) and blunts sympathetic responses to intubation. Risks Local Anesthetic Systemic Toxicity (LAST: seizures, bradycardia, arrest) at high plasma levels.'
  },
  bupivacaine: {
    name: 'Bupivacaine', classes: ['Local Anesthetic'], routes: ['IV', 'Epidural', 'Spinal'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.95, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Local Infiltration': { dose: '1.0-2.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 30.0, V3: 150.0, k10: 0.015, k12: 0.05, k21: 0.02, k13: 0.01, k31: 0.005, ke0: 0.1, coSensitivity: 0.4, proteinBinding: 0.95, renalFraction: 0.0, hepaticFraction: 1.0 },
    pd: { c50: 0.3, gamma: 2.0, sysMax: -20, diaMax: -20, hrMax: -15, rrMax: 0, ccCnsRatio: 2.0 },
    notes: 'Racemic amide local anesthetic. High potency, long duration. Extremely high cardiotoxicity due to slow dissociation from cardiac sodium channels ("fast-in, slow-out") and mitochondrial inhibition. CC/CNS ratio ~2.0.'
  },
  ropivacaine: {
    name: 'Ropivacaine', classes: ['Local Anesthetic'], routes: ['IV', 'Epidural', 'Spinal'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.94, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Local Infiltration': { dose: '1.0-3.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 12.0, V2: 35.0, V3: 160.0, k10: 0.02, k12: 0.06, k21: 0.025, k13: 0.01, k31: 0.006, ke0: 0.15, coSensitivity: 0.35, proteinBinding: 0.94, renalFraction: 0.0, hepaticFraction: 1.0 },
    pd: { c50: 0.4, gamma: 2.0, sysMax: -15, diaMax: -15, hrMax: -10, rrMax: 0, ccCnsRatio: 4.0 },
    notes: 'Pure S-enantiomer amide local anesthetic. Reduced cardiotoxicity compared to bupivacaine (CC/CNS ratio ~4.0) due to faster dissociation from sodium channels.'
  },
  levobupivacaine: {
    name: 'Levobupivacaine', classes: ['Local Anesthetic'], routes: ['IV', 'Epidural', 'Spinal'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.97, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Local Infiltration': { dose: '1.0-2.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 30.0, V3: 150.0, k10: 0.018, k12: 0.05, k21: 0.02, k13: 0.01, k31: 0.005, ke0: 0.12, coSensitivity: 0.38, proteinBinding: 0.97, renalFraction: 0.0, hepaticFraction: 1.0 },
    pd: { c50: 0.33, gamma: 2.0, sysMax: -18, diaMax: -18, hrMax: -12, rrMax: 0, ccCnsRatio: 3.3 },
    notes: 'Pure S-enantiomer of bupivacaine. Reduced cardiotoxicity compared to racemic bupivacaine (CC/CNS ratio ~3.3).'
  },
  cocaine: {
    name: 'Cocaine', classes: ['Local Anesthetic', 'Sympathomimetic'], routes: ['Topical', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma and Hepatic Esterases', proteinBinding: 0.90, mechanism: 'NET Inhibitor', targetReceptor: 'Norepinephrine Transporter',
    indications: { 'Topical Vasoconst': { dose: '1.5-3.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.2, proteinBinding: 0.90, renalFraction: 0.0, hepaticFraction: 0.5 },
    pd: { c50: 0.1, gamma: 1.5, sysMax: 40, diaMax: 30, hrMax: 35, rrMax: 0, ccCnsRatio: 3.0 },
    notes: 'Ester local anesthetic. Blocks sodium channels and inhibits catecholamine reuptake (NET blocker), causing marked vasoconstriction, tachycardia, and hypertension.'
  },
  tetracaine: {
    name: 'Tetracaine', classes: ['Local Anesthetic'], routes: ['Topical', 'Spinal'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Cholinesterase', proteinBinding: 0.76, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Spinal Anesthesia': { dose: '5.0-15.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 40.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.3, proteinBinding: 0.76, renalFraction: 0.0, hepaticFraction: 0.0 },
    pd: { c50: 0.5, gamma: 2.0, sysMax: -12, diaMax: -12, hrMax: -8, rrMax: 0, ccCnsRatio: 2.5 },
    notes: 'Potent, long-acting ester local anesthetic. Highly lipid-soluble. Used predominantly for spinal and topical anesthesia.'
  },
  chloroprocaine: {
    name: 'Chloroprocaine', classes: ['Local Anesthetic'], routes: ['Epidural', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Cholinesterase', proteinBinding: 0.0, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Local Infiltration': { dose: '5.0-11.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 2.0, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1, proteinBinding: 0.0, renalFraction: 0.0, hepaticFraction: 0.0 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -5, rrMax: 0, ccCnsRatio: 12.0 },
    notes: 'Ultra-short-acting ester local anesthetic. Extremely rapid hydrolysis by pseudocholinesterase (half-life < 30 seconds), making systemic toxicity (LAST) virtually impossible.'
  },
  benzocaine: {
    name: 'Benzocaine', classes: ['Local Anesthetic'], routes: ['Topical'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Plasma Cholinesterase', proteinBinding: 0.0, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Topical Anesthesia': { dose: '1.0-2.0', unit: 'sprays', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.1, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1, proteinBinding: 0.0, renalFraction: 0.0, hepaticFraction: 0.0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, ccCnsRatio: 8.0 },
    notes: 'Ester local anesthetic. Used for topical mucosal anesthesia. High risk of inducing Methemoglobinemia due to oxidation of hemoglobin to methemoglobin.'
  },
  prilocaine: {
    name: 'Prilocaine', classes: ['Local Anesthetic'], routes: ['Topical', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic to o-toluidine active metabolite', proteinBinding: 0.55, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    indications: { 'Local Infiltration': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1, proteinBinding: 0.55, renalFraction: 0.0, hepaticFraction: 1.0 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -5, rrMax: 0, ccCnsRatio: 8.0 },
    notes: 'Amide local anesthetic. Metabolized to o-toluidine, which oxidizes hemoglobin to methemoglobin, risking severe Methemoglobinemia.'
  },
  mepivacaine: {
    name: 'Mepivacaine', classes: ['Local Anesthetic'], routes: ['Infiltration', 'Epidural', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.75, mechanism: 'Blocker', targetReceptor: 'Sodium Channels',
    // Table 29.4-29.7, Miller's 9th Ed: common infiltration/peripheral-block/epidural dosing range, mirroring the
    // existing intermediate-acting amide LA entries (Prilocaine/Lidocaine) since this chapter does not tabulate
    // an exact mg/kg ceiling for Mepivacaine specifically.
    indications: { 'Local Infiltration': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' } },
    // Table 29.2: relative conduction-blocking potency 1.5x procaine (between Procaine's 1x and Prilocaine's 1.8x),
    // pKa 7.7, hydrophobicity 136 (vs. Lidocaine's 366). PK/PD interpolated from the already-implemented
    // intermediate-potency amide LAs (Lidocaine, Prilocaine) scaled by this relative potency/hydrophobicity
    // ranking, since the chapter does not give compartment volumes/clearances directly - no entry is invented
    // outside this textbook-anchored interpolation.
    pk: { V1: 22.0, V2: 45.0, V3: 0, k10: 0.06, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.6, coSensitivity: 0.2, proteinBinding: 0.75, renalFraction: 0.0, hepaticFraction: 1.0 },
    pd: { c50: 1.1, gamma: 1.5, sysMax: -8, diaMax: -8, hrMax: -8, rrMax: 0, ccCnsRatio: 7.0 },
    notes: 'Amide local anesthetic, intermediate potency and duration (Table 29.2, Ch29, Miller\'s 9th Ed). Commonly used for peripheral nerve blocks and dental/infiltration anesthesia. CC/CNS cardiotoxicity ratio set by analogy to Lidocaine (same intermediate-potency class, similarly favorable systemic safety margin) - the chapter does not tabulate an exact ratio for Mepivacaine.'
  },
  intralipid: {
    name: 'Intralipid 20%', classes: ['Rescue Agent', 'Lipid Emulsion'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Lipolysis / Hepatic clearance', proteinBinding: 0.0, mechanism: 'Sequestration', targetReceptor: 'Lipid Sink',
    indications: { 'LAST Rescue Bolus': { dose: '1.5', unit: 'mL/kg', type: 'Bolus' }, 'LAST Rescue Infusion': { dose: '0.25', unit: 'mL/kg/min', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.03, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1, proteinBinding: 0.0, renalFraction: 0.0, hepaticFraction: 1.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Intravenous lipid emulsion for rescue of local anesthetic systemic toxicity (LAST). Sequesters lipophilic local anesthetics ("lipid sink") and restores myocardial mitochondrial metabolism.'
  },
  methyleneBlue: {
    name: 'Methylene Blue', classes: ['Antidote'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal clearance', proteinBinding: 0.0, mechanism: 'Reducing Agent', targetReceptor: 'Methemoglobin Reductase',
    indications: { 'Methemoglobinemia': { dose: '1.0-2.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1, proteinBinding: 0.0, renalFraction: 0.9, hepaticFraction: 0.1 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Antidote for Methemoglobinemia. Acts as an electron donor to reduce Methemoglobin (Fe3+) back to functional oxygen-carrying Hemoglobin (Fe2+).'
  },
  magnesium: { 
    name: 'Magnesium Sulfate', classes: ['Electrolyte'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', mechanism: 'Blocker / Stabilizer', targetReceptor: 'L-type Calcium / NMDA',
    indications: { 'Torsades / Eclampsia': { dose: '1.0-2.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 }, 
    pd: { c50: 0.5, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -5, rrMax: -2 },
    notes: 'Calcium antagonist. Stabilizes membrane potentials. Treatment of choice for Torsades de Pointes. Enhances neuromuscular blockade.'
  },
  potassium: { 
    name: 'Potassium Chloride', classes: ['Electrolyte'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Intracellular shift / Renal', mechanism: 'Electrolyte', targetReceptor: 'Membrane Potential',
    indications: { 'Hypokalemia': { dose: '10-20', unit: 'mEq', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 }, 
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: -10, rrMax: 0 },
    notes: 'Restores serum potassium. Highly irritating to peripheral veins (infusion rate strictly capped at 10 mEq/hr peripherally, 20 mEq/hr centrally to avoid local burning, chemical phlebitis, and hyperkalemic arrest).'
  },

  // === MISCELLANEOUS ===
  albumin: { 
    name: 'Albumin 5%', classes: ['Colloid'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Reticuloendothelial system', mechanism: 'Volume Expander', targetReceptor: 'Oncotic Pressure',
    indications: { 'Volume Resuscitation': { dose: '250-500', unit: 'mL', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.005, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.0 }, 
    pd: { c50: 0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Natural colloid volume expander. Expands intravascular volume 1:1. Retained in vascular space longer than crystalloids.'
  },
  lorazepam: {
    name: 'Lorazepam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (glucuronidation, no active metabolites)', proteinBinding: 0.85, mechanism: 'Potentiator', targetReceptor: 'GABA-A',
    indications: { 'Anxiolysis / Seizure': { dose: '1-2', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 35.0, V3: 0, k10: 0.003, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0.1 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -4 },
    notes: 'Intermediate-acting benzodiazepine. No active metabolites (glucuronidation only) → safer in liver disease than midazolam. Preferred for status epilepticus IV. CAUTION: propylene glycol vehicle can cause toxicity in high doses; long half-life contributes to ICU delirium.'
  },
  verapamil: {
    name: 'Verapamil', classes: ['Class IV CCB'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (extensive first-pass)', proteinBinding: 0.90, mechanism: 'Blocker', targetReceptor: 'L-type Calcium (non-DHP)',
    intracellularCascade: 'Non-DHP CCB -> blocks L-type VGCCs in myocardium and AV node -> slows conduction',
    indications: { 'SVT Rate Control': { dose: '2.5-5.0', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): effect-t½ 8→29 min (clinical verapamil 2-5h). k10 0.08→0.012, k12 0.05→0.03, k21 0.05→0.06.
    // (Verapamil's AV-nodal bradycardia is delivered by the special ccbBradyIndex term in usePhysiology,
    // saturating at Ce>0.025 → the sustained Ce here correctly lengthens the rate-control effect. Its
    // pd.c50/hrMax Hill pathway is secondary/vestigial for HR — graded C, not a potency bug.)
    pk: { V1: 40.0, V2: 80.0, V3: 0, k10: 0.012, k12: 0.03, k21: 0.06, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.2 },
    pd: { c50: 0.3, gamma: 2.0, sysMax: -25, diaMax: -25, hrMax: -35, rrMax: 0 },
    notes: 'Non-DHP CCB. Strong AV nodal depression. CRITICAL CONTRAINDICATION WITH BETA-BLOCKERS: additive AV block risk → complete heart block. ALSO DANGEROUS IN WPW + AF: blocks AV node → forces conduction through accessory pathway → VF. DO NOT use in WPW with AF.'
  },
  sotalol: {
    name: 'Sotalol', classes: ['Class III Antiarrhythmic', 'Beta-Blocker'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (unchanged)', proteinBinding: 0, mechanism: 'Blocker', targetReceptor: 'IKr (hERG) + Beta-1/2',
    indications: { 'AF / VT': { dose: '75-150', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): 1-compartment — effect-t½ = ln2/k10. k10 0.02→0.0022 gives ~5.5h (clinical sotalol
    // 8-12h; renally cleared, long-acting). ke0=0.1 is slow, so the effect-site peak rises modestly.
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.0022, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.1 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: -15, diaMax: -15, hrMax: -30, rrMax: 0 },
    notes: 'Non-selective beta-blocker + class III antiarrhythmic (IKr blocker). HIGH QT PROLONGATION RISK (>20 ms per dose) — dose-dependent torsades de pointes risk. Must monitor QTc. Renally cleared: dose reduce in CKD. Available IV for acute AF/flutter rate/rhythm control.'
  },
  angiotensin_ii: {
    name: 'Angiotensin II', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases (seconds)', proteinBinding: 0, mechanism: 'Agonist', targetReceptor: 'AT1 Receptor',
    intracellularCascade: 'AT1 (Gq-coupled) -> IP3/DAG -> smooth muscle contraction + aldosterone release',
    indications: { 'Refractory Vasodilatory Shock': { dose: '20-80', unit: 'ng/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 2.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 3.0, coSensitivity: 0.05 },
    pd: { c50: 0.005, gamma: 2.0, sysMax: 60, diaMax: 70, hrMax: 0, rrMax: 0 },
    notes: 'Endogenous renin-angiotensin system peptide, now available as synthetic vasopressor (Giapreza). Unique mechanism: AT1-mediated vasoconstriction independently of catecholamine receptors — effective in catecholamine-refractory shock. Also promotes aldosterone secretion (↑Na/K exchange → volume retention). Clinical use: septic/vasodilatory shock refractory to NE/vasopressin.'
  },
  methylene_blue: {
    name: 'Methylene Blue', classes: ['Vasopressor Adjunct', 'Antidote'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Tissue reduction to leucomethylene blue', proteinBinding: 0, mechanism: 'NOS Inhibitor', targetReceptor: 'NO Synthase / sGC',
    indications: { 'Vasoplegic Shock': { dose: '1-2', unit: 'mg/kg', type: 'Bolus' }, 'Methemoglobinemia': { dose: '1-2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 50.0, V3: 0, k10: 0.02, k12: 0.05, k21: 0.03, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: 30, diaMax: 35, hrMax: 0, rrMax: 0 },
    notes: 'DUAL ACTION: (1) VASOPLEGIA: Inhibits NO synthase + soluble guanylyl cyclase → blocks NO-mediated vasodilation → potent vasopressor for CPB vasoplegia and other refractory distributive shock; (2) METHEMOGLOBINEMIA ANTIDOTE: Accepts electrons from NADPH → reduces MetHb → OxyHb restoration. CONTRAINDICATED in G6PD deficiency (for methemoglobinemia use) and serotonin syndrome context (MAO inhibitor properties → potentially worsens SS). CAUTION: turns urine/skin blue-green (SpO2 artifact at 660nm → reads low).'
  },
  flumazenil: {
    name: 'Flumazenil', classes: ['GABA Antagonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Antagonist', targetReceptor: 'Benzodiazepine (GABA-A)',
    indications: { 'Benzo Reversal': { dose: '0.2-0.5', unit: 'mg', type: 'Bolus' } },
    // k10=0.018/min → t½β≈60 min (clinical t½ 40-80 min). Prior k10=0.1 → t½=6.9 min (grossly wrong).
    // Short t½ means re-sedation is a real risk after reversing long-acting benzodiazepines.
    // ke0=3.0/min (↑ from 0.4): prior gave t_peak=4.65 min; clinical flumazenil reversal onset 1-2 min.
    // ke0=3.0 → t_peak = ln(3.0/0.098)/(3.0-0.098) = ln(30.6)/2.902 ≈ 1.18 min ✓.
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.018, k12: 0.08, k21: 0.05, k13: 0, k31: 0, ke0: 3.0, coSensitivity: 0.1 },
    pd: { c50: 0.002, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Competitive benzodiazepine receptor antagonist. t½≈50-60 min → RESEDATION RISK when used to reverse longer-acting benzodiazepines (midazolam t½β≈86 min, lorazepam much longer). Contraindicated in chronic benzo users (triggers withdrawal seizures).'
  },
  papaverine: {
    name: 'Papaverine', classes: ['Vasodilator'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', mechanism: 'Vasodilator', targetReceptor: 'Phosphodiesterase',
    indications: { 'Vasospasm Reversal': { dose: '30-40', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 40.0, V3: 0, k10: 0.15, k12: 0.1, k21: 0.08, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.2 },
    pd: { c50: 1.0, gamma: 2.0, sysMax: -15, diaMax: -15, hrMax: 5, rrMax: 0 },
    notes: 'Direct-acting smooth muscle relaxant / phosphodiesterase inhibitor. Direct vasodilator. Used to treat arterial vasospasm, especially in response to intra-arterial barbiturate crystal precipitation.'
  },
  naloxone: { 
    name: 'Naloxone', classes: ['Opioid Antagonist'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (glucuronidation)', mechanism: 'Antagonist', targetReceptor: 'Mu-Opioid',
    indications: { 'Opioid Reversal': { dose: '0.04-0.4', unit: 'mg', type: 'Bolus' } },
    // k10=0.012/min → t½β≈80 min (clinical t½ 60-90 min). Prior k10=0.1 → t½=6.9 min (wrong).
    // Re-narcotization risk for opioids with t½ > naloxone's t½. ke0=2.0 → rapid onset ✓
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.012, k12: 0.08, k21: 0.08, k13: 0, k31: 0, ke0: 2.0, coSensitivity: 0.1 },
    pd: { c50: 0.001, gamma: 2.0, sysMax: 15, diaMax: 10, hrMax: 20, rrMax: 12 },
    notes: 'Competitive mu-opioid receptor antagonist. Fast onset, short half-life (~45 min, risks re-narcotization). Fast reversal of chronic opioid users causes severe sympathetic surge (pulmonary edema, tachycardia, arrest).'
  },
  unasyn: { 
    name: 'Ampicillin/Sulbactam (Unasyn)', classes: ['Antibiotic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.28, mechanism: 'Cell Wall Synthesis Inhibitor', targetReceptor: 'Penicillin-Binding Proteins',
    indications: { 'Surgical Prophylaxis': { dose: '1.5-3.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 12.0, V2: 18.0, V3: 0, k10: 0.05, k12: 0.04, k21: 0.04, k13: 0, k31: 0, ke0: 0.1 }, 
    pd: { c50: 0.1, gamma: 1, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Penicillin antibiotic with beta-lactamase inhibitor. Highly effective for intra-abdominal and soft-tissue prophylaxis. Pushing this bolus in patients with documented severe penicillin allergy triggers life-threatening Penicillin Anaphylaxis (IgE-mediated severe vasodilation, hypotension, bradycardia, and severe bronchospasm/apnea).'
  },
  cefazolin: {
    name: 'Cefazolin', classes: ['Antibiotic', '1st-Gen Cephalosporin'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged >90%)', proteinBinding: 0.74, mechanism: 'Cell Wall Synthesis Inhibitor', targetReceptor: 'Penicillin-Binding Proteins',
    indications: { 'Surgical Prophylaxis': { dose: '2.0', unit: 'g', type: 'Bolus' }, 'Gram-Positive Infection': { dose: '1-2', unit: 'g', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 5.0, V3: 0, k10: 0.0064, k12: 0.03, k21: 0.04, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.3 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'First-generation cephalosporin. Time-dependent killing (T>MIC target ≥40-50% of dosing interval). First-line for MSSA, streptococcal, and surgical site infection prophylaxis. Does NOT cover MRSA, Enterococcus, or gram-negative ESBL organisms. AntibioticPKPDModel.ts uses real time-above-MIC PD target attainment. t1/2 ≈1.8h -- repeat dosing q2-3h for long cases.'
  },
  vancomycin: {
    name: 'Vancomycin', classes: ['Antibiotic', 'Glycopeptide'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.55, mechanism: 'Cell Wall Synthesis Inhibitor', targetReceptor: 'D-Ala-D-Ala Peptidoglycan',
    indications: { 'MRSA Infection': { dose: '25-35', unit: 'mg/kg/day', type: 'Infusion' }, 'Gram-Positive Bacteremia': { dose: '15-20', unit: 'mg/kg', type: 'Infusion' } },
    pk: { V1: 12.0, V2: 38.0, V3: 0, k10: 0.00193, k12: 0.05, k21: 0.012, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.4 },
    pd: { c50: 10.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Glycopeptide antibiotic. AUC/MIC-driven PD (target AUC/MIC ≥400-600 mg·h/L per 2020 ASHP/IDSA/SIDP guidelines -- replacing historical trough-based monitoring). RED MAN SYNDROME with rapid infusion (histamine-mediated flushing/erythema/hypotension -- NOT an allergy, infuse over ≥60 min). Nephrotoxic with trough accumulation (AntibioticPKPDModel.ts monitors AUC). Covers MRSA, VRE-VSE, gram-positive organisms. Does NOT cover gram-negative organisms. t1/2 ≈6h (highly renal-dependent -- AKI dramatically prolongs dosing interval).'
  },
  piperacillin_tazobactam: {
    name: 'Piperacillin/Tazobactam', classes: ['Antibiotic', 'Extended-Spectrum Penicillin'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged ~68%)', proteinBinding: 0.30, mechanism: 'Cell Wall Synthesis Inhibitor', targetReceptor: 'Penicillin-Binding Proteins',
    indications: { 'Broad-Spectrum Infection': { dose: '3.375', unit: 'g', type: 'Infusion' }, 'Febrile Neutropenia': { dose: '4.5', unit: 'g', type: 'Infusion' } },
    pk: { V1: 18.0, V2: 12.0, V3: 0, k10: 0.01155, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.3 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Extended-spectrum penicillin + beta-lactamase inhibitor. Time-dependent killing. Broad gram-negative coverage including Pseudomonas aeruginosa, plus anaerobes (covers mixed abdominal infections). Does NOT cover MRSA. Extended-infusion strategy (4.5g over 4h) achieves better T>MIC target attainment than standard 30-min infusion -- AntibioticPKPDModel.ts uses AUC integration to model this. t1/2 ≈1h.'
  },
  meropenem: {
    name: 'Meropenem', classes: ['Antibiotic', 'Carbapenem'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged ~70%)', proteinBinding: 0.02, mechanism: 'Cell Wall Synthesis Inhibitor', targetReceptor: 'Penicillin-Binding Proteins',
    indications: { 'Severe/Resistant Infection': { dose: '1.0-2.0', unit: 'g', type: 'Infusion' }, 'Febrile Neutropenia': { dose: '1.0', unit: 'g', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 10.0, V3: 0, k10: 0.0116, k12: 0.04, k21: 0.035, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.3 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Broadest-spectrum carbapenem. Time-dependent killing. Covers nearly all gram-negative organisms including ESBL-producing Enterobacteriaceae and Pseudomonas. Most reliable coverage against highly-resistant organisms. Does NOT cover MRSA. Key teaching: carbapenems are the last line for ESBL producers -- preserve them. t1/2 ≈1h. Renally cleared -- dose-adjust in AKI.'
  },
  gentamicin: {
    name: 'Gentamicin', classes: ['Antibiotic', 'Aminoglycoside'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.10, mechanism: 'Protein Synthesis Inhibitor', targetReceptor: '30S Ribosomal Subunit',
    indications: { 'Gram-Negative Sepsis': { dose: '5-7', unit: 'mg/kg', type: 'Bolus' }, 'Synergy (Endocarditis)': { dose: '1', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 17.0, V2: 5.0, V3: 0, k10: 0.00462, k12: 0.02, k21: 0.03, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.5 },
    pd: { c50: 4.0, gamma: 2.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Aminoglycoside. CONCENTRATION-DEPENDENT killing (target Cmax/MIC ≥8-10 -- distinct from beta-lactams where time above MIC matters). Extended-interval dosing (5-7 mg/kg once daily) achieves high peaks while allowing troughs to fall below 1 mg/L between doses, reducing nephrotoxicity risk via renal tubular recovery. NEPHROTOXIC with trough accumulation (renal proximal tubule lysosomal phospholipidosis) -- AntibioticPKPDModel.ts computes trough accumulation and escalates RenalEngine AKI risk. OTOTOXIC at high cumulative doses. t1/2 ≈2.5h.'
  },
  metronidazole: {
    name: 'Metronidazole', classes: ['Antibiotic', 'Nitroimidazole'], routes: ['IV', 'PO'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP oxidation)', proteinBinding: 0.10, mechanism: 'DNA Strand Breakage', targetReceptor: 'Anaerobic Electron Transport Chain',
    indications: { 'Anaerobic Infection': { dose: '500', unit: 'mg', type: 'Infusion' }, 'C. diff Colitis': { dose: '500', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 30.0, V3: 0, k10: 0.00144, k12: 0.03, k21: 0.025, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Nitroimidazole. Excellent anaerobic and protozoal coverage. AUC/MIC-driven PD. Required component of mixed abdominal infection treatment when pip/tazo or carbapenems are not used (providing anaerobic coverage for colorectal, gynecologic, and hepatobiliary organisms). DISULFIRAM-LIKE REACTION with alcohol. QT-prolonging at high doses. t1/2 ≈8h (hepatically cleared -- dose-adjust in severe liver failure).'
  },
  ciprofloxacin: {
    name: 'Ciprofloxacin', classes: ['Antibiotic', 'Fluoroquinolone'], routes: ['IV', 'PO'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal (mixed)', proteinBinding: 0.30, mechanism: 'DNA Gyrase / Topoisomerase IV Inhibitor', targetReceptor: 'Bacterial Topoisomerase',
    indications: { 'Gram-Negative Infection': { dose: '400', unit: 'mg', type: 'Infusion' }, 'UTI': { dose: '200-400', unit: 'mg', type: 'Infusion' } },
    pk: { V1: 30.0, V2: 180.0, V3: 0, k10: 0.00231, k12: 0.04, k21: 0.008, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.3 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Fluoroquinolone. AUC/MIC-driven PD (target AUC/MIC ≥125 for gram-negative). Very large Vd (2-3 L/kg) due to extensive tissue penetration. Excellent bioavailability (PO = IV efficacy). QT PROLONGATION at high doses -- documented interaction with other QT-prolonging drugs (ondansetron, droperidol, haloperidol). Minimal anaerobic activity. Growing gram-negative resistance limits reliability. Avoid in patients with tendinopathy risk (steroids + age). t1/2 ≈5h.'
  },
  ceftriaxone: {
    name: 'Ceftriaxone', classes: ['Antibiotic', '3rd-Gen Cephalosporin'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Biliary / Renal (dual)', proteinBinding: 0.95, mechanism: 'Cell Wall Synthesis Inhibitor', targetReceptor: 'Penicillin-Binding Proteins',
    indications: { 'Community-Acquired Pneumonia': { dose: '2.0', unit: 'g', type: 'Bolus' }, 'Meningitis': { dose: '2.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 9.0, V2: 5.0, V3: 0, k10: 0.00144, k12: 0.02, k21: 0.02, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Third-generation cephalosporin. Time-dependent killing. Excellent gram-negative and streptococcal coverage including Strep pneumoniae (community-acquired pneumonia first-line with azithromycin or doxycycline). Penetrates CSF (meningitis dosing). Long t1/2 ≈8h allows once-daily dosing. High protein binding (95%) means Vd is deceptively small -- most drug is protein-bound and unavailable to bacteria; free fraction is what matters for PD. BILIARY SLUDGE with prolonged use (calcium-ceftriaxone crystals). Does NOT cover Pseudomonas or MRSA. Dose-adjust NOT required in renal failure (dual biliary/renal elimination).'
  },
  dextrose: {
    name: 'Dextrose 50%', classes: ['Hypertonic Glucose'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Cellular metabolism', proteinBinding: 0.0, mechanism: 'Substrate', targetReceptor: 'GLUT Transporters',
    indications: { 'Hypoglycemia': { dose: '25', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.0, proteinBinding: 0.0, renalFraction: 0.0, hepaticFraction: 0.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Hypertonic dextrose (D50) used for treatment of acute hypoglycemia. Administered as a bolus of 25g/50mL. Corrects hypoglycemic states.'
  },
  methylphenidate: {
    name: 'Methylphenidate', classes: ['Dopamine Agonist', 'CNS Stimulant'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.15, targetReceptor: 'DAT / NET',
    indications: { 'Emergence Reversal': { dose: '10', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.2 },
    // F29: c50 2.0→0.3 — a 10 mg IV bolus reaches Ce≈0.4-0.5, so the old c50 gave ~0 effect; the CNS
    // stimulant's tachycardia/mild pressor action for emergence reversal now registers.
    pd: { c50: 0.3, gamma: 1.5, sysMax: 15, diaMax: 10, hrMax: 20, rrMax: 2 },
    notes: 'CNS stimulant. Inhibits dopamine and norepinephrine reuptake. Reverses/accelerates emergence from general anesthetics (propofol, isoflurane) via VTA activation.'
  },
  atipamezole: {
    name: 'Atipamezole', classes: ['Alpha-2 Antagonist', 'Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.50, targetReceptor: 'Alpha-2',
    indications: { 'Dexmedetomidine Reversal': { dose: '5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.1, k12: 0.08, k21: 0.05, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 5, diaMax: 5, hrMax: 10, rrMax: 0 },
    notes: 'Specific alpha-2 adrenergic receptor antagonist. Specifically reverses the sedative and cardiovascular effects of dexmedetomidine.'
  },
  scopolamine: {
    name: 'Scopolamine', classes: ['Anticholinergic', 'Amnestic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.0, targetReceptor: 'Muscarinic',
    indications: { 'Pre-op Amnesia': { dose: '0.4', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 15, rrMax: 0 },
    notes: 'Tertiary amine anticholinergic. Crosses the blood-brain barrier. Causes marked anterograde amnesia and sedation. Accelerates hippocampal theta oscillations while reducing absolute power.'
  },
  f6: {
    name: 'F6 (Nonimmobilizer)', classes: ['Cyclobutane', 'Nonimmobilizer'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Pulmonary', proteinBinding: 0.80, synergyGroup: 'Other', pkModel: 'Standard Compartmental',
    targetReceptor: 'nAChR / Muscarinic', intracellularCascade: 'Selectively inhibits neuronal nicotinic and muscarinic receptors',
    indications: { 'Selective Amnesia': { dose: '2.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 25.0, V3: 80.0, k10: 0.15, k12: 0.1, k21: 0.05, k13: 0.03, k31: 0.01, ke0: 1.0, coSensitivity: 0.2 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Selective amnestic cyclobutane. Does NOT produce immobility or sedation.'
  },
  f3: {
    name: 'F3 (Anesthetic)', classes: ['Cyclobutane', 'Volatile Anesthetic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Pulmonary', proteinBinding: 0.75, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    targetReceptor: 'GABA-A / Glycine', intracellularCascade: 'Enhances GABA-A and glycine receptor binding',
    indications: { 'General Anesthesia': { dose: '1.5', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 25.0, V3: 80.0, k10: 0.10, k12: 0.1, k21: 0.05, k13: 0.03, k31: 0.01, ke0: 0.8, coSensitivity: 0.2 },
    pd: { c50: 1.2, gamma: 2.5, sysMax: -20, diaMax: -20, hrMax: 0, rrMax: -10, inducesApneaAtCe: 2.0 },
    notes: 'Halogenated cyclobutane. Produces immobility, sedation, and amnesia.'
  },
  s_isoflurane: {
    name: 'S-Isoflurane', classes: ['Chiral Volatile', 'Active Enantiomer'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Pulmonary', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    targetReceptor: 'GABA-A / Glycine / K2P', intracellularCascade: 'High-affinity stereoselective binding to GABA-A and Glycine receptors',
    indications: { 'General Anesthesia': { dose: '1.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 1.40, V2: 5.0, V3: 20.0, k10: 0.08, k12: 0.12, k21: 0.06, k13: 0.04, k31: 0.01, ke0: 0.8, coSensitivity: 0.3 },
    pd: { c50: 0.9, gamma: 2.0, sysMax: -30, diaMax: -30, hrMax: 5, rrMax: -15, inducesApneaAtCe: 1.5 },
    notes: 'Active enantiomer of Isoflurane. High-affinity binding, twice as potent as R-Isoflurane.'
  },
  r_isoflurane: {
    name: 'R-Isoflurane', classes: ['Chiral Volatile', 'Inactive Enantiomer'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepating / Pulmonary', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    targetReceptor: 'GABA-A / Glycine / K2P', intracellularCascade: 'Lower-affinity stereoselective binding to GABA-A and Glycine receptors',
    indications: { 'General Anesthesia': { dose: '2.0', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 1.40, V2: 5.0, V3: 20.0, k10: 0.08, k12: 0.12, k21: 0.06, k13: 0.04, k31: 0.01, ke0: 0.8, coSensitivity: 0.3 },
    pd: { c50: 1.8, gamma: 2.0, sysMax: -15, diaMax: -15, hrMax: 5, rrMax: -10, inducesApneaAtCe: 3.0 },
    notes: 'Less active enantiomer of Isoflurane. Lower potency, requires higher concentration.'
  },
  acetaminophen: {
    name: 'Acetaminophen', classes: ['Nonopioid Analgesic'], routes: ['IV', 'PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (conjugation & CYP2E1 to NAPQI)', proteinBinding: 0.20, mechanism: 'Blocker', targetReceptor: 'COX-1 / COX-2 / TRPV1',
    indications: { 'Postoperative Pain': { dose: '1000', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 40.0, V3: 0, k10: 0.05, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 10.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Nonopioid analgesic. Potent central COX inhibition. Opioid-sparing, decreases postoperative ileus duration and opioid consumption.'
  },
  ketorolac: {
    name: 'Ketorolac', classes: ['NSAID'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal', proteinBinding: 0.99, mechanism: 'Blocker', targetReceptor: 'COX-1 / COX-2',
    indications: { 'Severe Acute Pain': { dose: '30', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 15.0, V3: 0, k10: 0.03, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Potent injectable NSAID. Non-selective cyclooxygenase inhibitor. Opioid-sparing, reduces constipation and postoperative ileus. Risks: renal impairment, platelet inhibition, GI bleeding.'
  },
  sodiumCitrate: {
    name: 'Sodium Citrate', classes: ['Nonparticulate Antacid'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Local (gastric chemical neutralization, no systemic metabolism)', proteinBinding: 0.0, mechanism: 'Buffer', targetReceptor: 'N/A (direct chemical acid neutralization)',
    indications: { 'Aspiration Prophylaxis': { dose: '30', unit: 'mL', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.025, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.0 },
    pd: { c50: 2.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Nonparticulate oral antacid (e.g. Bicitra). Directly neutralizes existing gastric acid on contact, raising gastric pH within minutes -- a local chemical effect modeled here via the same Ce/effect-site framework as a disclosed proxy for "remaining buffering capacity," not a literal systemic blood concentration. Effect wanes over ~30-60 min as buffered contents continue to empty/mix. Unlike H2 blockers/PPIs, has no effect on future acid secretion or gastric volume.'
  },
  famotidine: {
    name: 'Famotidine', classes: ['H2 Receptor Antagonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.15, mechanism: 'Blocker', targetReceptor: 'Histamine H2 Receptor',
    indications: { 'Aspiration Prophylaxis': { dose: '20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 20.0, V3: 0, k10: 0.004, k12: 0.02, k21: 0.015, k13: 0, k31: 0, ke0: 0.05, coSensitivity: 0.0 },
    pd: { c50: 0.3, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Competitive H2-receptor antagonist. Reduces future gastric acid secretion (raising gastric pH toward ~4-4.5 and modestly reducing secretion-driven gastric volume), reversibly and in proportion to effect-site concentration. Onset ~30-60 min IV; does not affect acid already present in the stomach. Clinically negligible hemodynamic effect (sysMax/diaMax/hrMax/rrMax intentionally zero, not an oversight).'
  },
  pantoprazole: {
    name: 'Pantoprazole', classes: ['Proton Pump Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2C19/3A4)', proteinBinding: 0.98, mechanism: 'Inhibitor', targetReceptor: 'H+/K+-ATPase (Proton Pump)',
    indications: { 'Aspiration Prophylaxis': { dose: '40', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 20.0, V3: 0, k10: 0.012, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.15, coSensitivity: 0.0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Proton pump inhibitor. Covalently and IRREVERSIBLY inhibits the parietal cell H+/K+-ATPase -- pharmacodynamic effect is decoupled from plasma Ce (which clears with a ~1-1.5h half-life) and instead accumulates with cumulative pump exposure, persisting ~24-48h until new pumps are synthesized (GastricEmptyingModel.ts tracks this separately as patient.ppiSuppressionLevel). More potent than an H2 blocker at maximal effect (can raise gastric pH toward neutral) but slower to reach that maximum.'
  },
  metoclopramide: {
    name: 'Metoclopramide', classes: ['Prokinetic', 'Antiemetic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.30, mechanism: 'Blocker', targetReceptor: 'Dopamine D2 / 5-HT3 / 5-HT4',
    indications: { 'Aspiration Prophylaxis / PONV': { dose: '10', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 30.0, V3: 0, k10: 0.0023, k12: 0.03, k21: 0.025, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.0 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Dopamine D2 antagonist / 5-HT4 agonist prokinetic. Accelerates gastric emptying (enhanced antral contractions) AND increases lower esophageal sphincter tone, both reducing aspiration risk -- distinct from the antacid/H2/PPI drugs above, which only modify the content that is there rather than its barrier or rate of clearance. Onset ~30-60 min IV. Extrapyramidal/sedative side effects are real but not mechanically modeled here (disclosed scope gap).'
  },
  oxytocin: {
    name: 'Oxytocin', classes: ['Uterotonic'], routes: ['IV', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal / Hepatic (Oxytocinase)', proteinBinding: 0.30, mechanism: 'Agonist', targetReceptor: 'Oxytocin Receptor',
    indications: { 'Postpartum Hemorrhage / Uterine Atony': { dose: '10-40', unit: 'units', type: 'Infusion' } },
    pk: { V1: 8.0, V2: 12.0, V3: 0, k10: 0.15, k12: 0.08, k21: 0.06, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.1 },
    pd: { c50: 0.3, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: 10, rrMax: 0 },
    notes: 'First-line uterotonic. Binds myometrial oxytocin receptors, the dominant driver of postpartum uterine contraction/tone (UterineToneModel.ts). Rapid IV bolus causes transient vasodilation/flushing and reflex tachycardia (sysMax/diaMax/hrMax above) -- the real reason it is given as a slow infusion, not a rapid push, in practice. Fast onset (~1 min), short half-life (~4-5 min) -- sustained effect requires a continuous infusion, not a single bolus.'
  },
  methylergonovine: {
    name: 'Methylergonovine', classes: ['Uterotonic', 'Ergot Alkaloid'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.20, mechanism: 'Agonist', targetReceptor: 'Alpha-1 Adrenergic / Serotonergic',
    indications: { 'Postpartum Hemorrhage / Uterine Atony': { dose: '0.2', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.01, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.1 },
    // F29: c50 0.4→0.008 — a 0.2 mg dose reaches only Ce≈0.009, so the old c50 gave ~0 effect. The
    // uterotonic's systemic vasoconstriction/HYPERTENSION is clinically critical (it is contraindicated in
    // preeclampsia/HTN precisely because it raises BP) and must register.
    pd: { c50: 0.008, gamma: 1.5, sysMax: 15, diaMax: 10, hrMax: 0, rrMax: 0 },
    notes: 'Potent ergot-alkaloid uterotonic, longer-acting than Oxytocin (~3h functional duration). CONTRAINDICATED in hypertension/preeclampsia -- generalized vasoconstriction (sysMax/diaMax above) can precipitate a hypertensive crisis (UterineToneModel.ts checks this against the patient hypertension/preeclampsia flags before applying its uterotonic effect, mirroring this codebase existing contraindication-checking pattern for Succinylcholine in muscular dystrophy).'
  },
  carboprost: {
    name: 'Carboprost', classes: ['Uterotonic', 'Prostaglandin'], routes: ['IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Pulmonary / Hepatic', proteinBinding: 0.70, mechanism: 'Agonist', targetReceptor: 'Prostaglandin F2-alpha Receptor',
    indications: { 'Postpartum Hemorrhage / Uterine Atony': { dose: '0.25', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 20.0, V3: 0, k10: 0.03, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.1 },
    pd: { c50: 0.3, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Potent prostaglandin F2-alpha analog uterotonic. CONTRAINDICATED in asthma -- prostaglandin-mediated bronchoconstriction can precipitate severe bronchospasm (checked against the patient asthma flag, not modeled via the generic rrMax field above, mirroring the dedicated contraindication-check pattern used elsewhere in this codebase rather than a generic respiratory depression number).'
  },
  misoprostol: {
    name: 'Misoprostol', classes: ['Uterotonic', 'Prostaglandin'], routes: ['PO', 'PR', 'SL'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.0, mechanism: 'Agonist', targetReceptor: 'Prostaglandin E1 Receptor',
    indications: { 'Postpartum Hemorrhage / Uterine Atony': { dose: '800-1000', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 30.0, V3: 0, k10: 0.015, k12: 0.03, k21: 0.025, k13: 0, k31: 0, ke0: 0.15, coSensitivity: 0.0 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Prostaglandin E1 analog uterotonic. Slower onset (~20-30 min) and less potent than Oxytocin/Methylergonovine/Carboprost, but lacks their major contraindications -- a useful second/third-line agent or a resource-limited-setting first-line agent (no IV access/refrigeration required, unlike Oxytocin).'
  },
  tranexamicAcid: {
    name: 'Tranexamic Acid (TXA)', classes: ['Antifibrinolytic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (mostly unchanged >90%)', proteinBinding: 0.03, mechanism: 'Inhibitor', targetReceptor: 'Plasminogen',
    indications: { 'Massive Hemorrhage': { dose: '1.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.1 },
    pd: { c50: 10.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Competitive inhibitor of plasminogen activation. Blocks lysine-binding sites, preventing fibrinolysis. First line agent for trauma-induced coagulopathy and postpartum hemorrhage.'
  },
  heparin: {
    name: 'Heparin', classes: ['Anticoagulant'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Reticuloendothelial clearance', proteinBinding: 0.95, mechanism: 'Inhibitor', targetReceptor: 'Antithrombin III',
    indications: { 'Cardiopulmonary Bypass': { dose: '300-400', unit: 'Units/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.015, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 1.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Accelerates antithrombin III activity 1000-fold, inactivating thrombin and factor Xa. Anticoagulant effect tracked in CoagulationCascadeModel.ts via heparinCe-driven factor-activity suppression and aPTT prolongation. Reversed by protamine on a 1mg : 100 Units Heparin ratio.'
  },
  protamine: {
    name: 'Protamine Sulfate', classes: ['Reversal'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases', proteinBinding: 0.0, mechanism: 'Inhibitor', targetReceptor: 'Heparin',
    indications: { 'Heparin Reversal': { dose: '1.0', unit: 'mg/100U Heparin', type: 'Infusion' } },
    pk: { V1: 10.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.0, sysMax: -15, diaMax: -15, hrMax: 0, rrMax: 0 },
    notes: 'Highly basic protein derived from salmon sperm. Forms stable, inactive ionic complex with highly acidic heparin. STRICT safety warning (Protamine Reactions): Type I is isolated hypotension from rapid administration (histamine release); Type II is true IgE-mediated anaphylaxis; Type III is catastrophic pulmonary vasoconstriction, acute right ventricular failure, and severe refractory systemic shock (Thromboxane A2-mediated). Avoid rapid infusion.'
  },
  ondansetron: {
    name: 'Ondansetron', classes: ['Antiemetic'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4/2D6)', proteinBinding: 0.73, mechanism: 'Blocker', targetReceptor: '5-HT3',
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
  gabapentin: {
    name: 'Gabapentin', classes: ['Gabapentinoid'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.0, mechanism: 'Blocker', targetReceptor: 'alpha2-delta Ca2+ Subunit',
    indications: { 'Neuropathic Pain': { dose: '300', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.2 },
    pd: { c50: 5.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Anticonvulsant/gabapentinoid. Excellent for neuropathic pain and multimodal perioperative analgesia. Side effects: sedation, dizziness, synergizes with other sedative-hypnotics.'
  },
  pregabalin: {
    name: 'Pregabalin', classes: ['Gabapentinoid'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (Unchanged)', proteinBinding: 0.0, mechanism: 'Blocker', targetReceptor: 'alpha2-delta Ca2+ Subunit',
    indications: { 'Neuropathic Pain': { dose: '75', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.2 },
    pd: { c50: 3.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Gabapentinoid. Higher potency than Gabapentin. Blunts central excitatory drive, synergizes with sedatives, reduces postop hyperalgesia.'
  },
  mexiletine: {
    name: 'Mexiletine', classes: ['Class IB', 'Sodium Channel Blocker'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6)', proteinBinding: 0.70, mechanism: 'Blocker', targetReceptor: 'Fast Na+ Channels',
    indications: { 'Neuropathic Pain / Arrhythmia': { dose: '150', unit: 'mg', type: 'Bolus' } },
    // F37 (L3): effect-t½ 73→259 min (clinical mexiletine 10-12h; long-acting oral analog). k10 0.04→0.012,
    // k12 0.06→0.04, k21 0.04→0.05. (Hemodynamic Emax is small — mexiletine is mainly a Na-channel effect.)
    pk: { V1: 20.0, V2: 40.0, V3: 0, k10: 0.012, k12: 0.04, k21: 0.05, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.2 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: -5, rrMax: 0 },
    notes: 'Orally active Class IB antiarrhythmic. Structurally similar to Lidocaine. Blocks sodium channels, dampening neuropathic ectopic discharges.'
  },
  topiramate: {
    name: 'Topiramate', classes: ['Anticonvulsant'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal', proteinBinding: 0.15, mechanism: 'Blocker', targetReceptor: 'Sodium Channels / GABA-A / AMPA',
    indications: { 'Chronic Pain / Headaches': { dose: '50', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 35.0, V3: 0, k10: 0.03, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.2 },
    pd: { c50: 4.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Sulfamate-substituted monosaccharide anticonvulsant. Attenuates chronic/neuropathic pain and tension/migraine headaches. Associated with weight loss and mild cognitive slowing.'
  },
  suvorexant: {
    name: 'Suvorexant', classes: ['Dual Orexin Receptor Antagonist'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.99, synergyGroup: 'Sedative', pkModel: 'Standard Compartmental',
    mechanism: 'Antagonist', targetReceptor: 'OX1R/OX2R', intracellularCascade: 'Reversibly binds and blocks OX1R/OX2R, inhibiting orexinergic wakefulness drive',
    indications: { 'Insomnia': { dose: '10-20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.08, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0, inducesApneaAtCe: 999 },
    notes: 'Dual orexin receptor antagonist. Blocks wake-promoting neuropeptides orexin A and B. Can cause daytime drowsiness. Contraindicated in narcolepsy.'
  },
  carbamazepine: {
    name: 'Carbamazepine', classes: ['Anticonvulsant', 'Sodium Channel Blocker'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4, active 10,11-epoxide)', proteinBinding: 0.75, mechanism: 'Blocker', targetReceptor: 'Fast Na+ Channels',
    indications: { 'Trigeminal Neuralgia': { dose: '200', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 30.0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.35, coSensitivity: 0.2 },
    pd: { c50: 6.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Approved for trigeminal neuralgia. Sodium channel blocker. Associated with hematologic toxicity (agranulocytosis, aplastic anemia) and drug-drug interactions.'
  },
  oxcarbazepine: {
    name: 'Oxcarbazepine', classes: ['Anticonvulsant', 'Sodium Channel Blocker'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (reduction to active monohydroxy derivative)', proteinBinding: 0.40, mechanism: 'Blocker', targetReceptor: 'Fast Na+ Channels',
    indications: { 'Neuropathic Pain': { dose: '300', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 30.0, V3: 0, k10: 0.02, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.35, coSensitivity: 0.2 },
    pd: { c50: 8.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Carbamazepine analogue. Blocks sodium channels, stabilizes membranes. Lower drug-drug interactions, risk of hyponatremia.'
  },
  lamotrigine: {
    name: 'Lamotrigine', classes: ['Anticonvulsant', 'Sodium Channel Blocker'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic glucuronidation', proteinBinding: 0.55, mechanism: 'Blocker', targetReceptor: 'Sodium / Calcium Channels',
    indications: { 'Neuropathic Pain': { dose: '100', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 30.0, V3: 0, k10: 0.025, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.35, coSensitivity: 0.2 },
    pd: { c50: 4.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Blocks sodium and calcium channels. Effective for trigeminal neuralgia and HIV neuropathy. Risk of Stevens-Johnson syndrome.'
  },
  zonisamide: {
    name: 'Zonisamide', classes: ['Anticonvulsant', 'Sodium/Calcium Channel Blocker'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4 glucuronidation)', proteinBinding: 0.40, mechanism: 'Blocker', targetReceptor: 'Sodium / N-type Calcium Channels',
    indications: { 'Neuropathic Pain': { dose: '100', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 30.0, V3: 0, k10: 0.025, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.35, coSensitivity: 0.2 },
    pd: { c50: 5.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Blocks sodium and N-type calcium channels. Effective for diabetic neuropathy and migraine prophylaxis.'
  },
  levetiracetam: {
    name: 'Levetiracetam', classes: ['Anticonvulsant'], routes: ['IV', 'PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal (unchanged)', proteinBinding: 0.10, mechanism: 'Modulator', targetReceptor: 'SV2A / Calcium Channels',
    indications: { 'Seizure Prophylaxis': { dose: '500', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 18.0, V2: 30.0, V3: 0, k10: 0.035, k12: 0.04, k21: 0.03, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.2, renalFraction: 1.0 },
    pd: { c50: 10.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'SV2A vesicle binder, blocks N-type calcium channels. Highly renal cleared.'
  },
  ziconotide: {
    name: 'Ziconotide', classes: ['Nonopioid Analgesic', 'Calcium Channel Blocker'], routes: ['IT'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Systemic peptidase cleavage', proteinBinding: 0.50, mechanism: 'Blocker', targetReceptor: 'N-type Calcium Channels',
    indications: { 'Severe Refractory Pain': { dose: '0.1', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 12.0, V2: 0, V3: 0, k10: 0.05, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.005, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Synthetic omega-conotoxin. Potent selective N-type calcium channel blocker. Approved for intrathecal (IT) use. Side effects: postural hypotension, confusion.'
  },
  desmopressin: {
    name: 'Desmopressin (DDAVP)', classes: ['Vasoactive', 'Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', proteinBinding: 0.50, mechanism: 'V2 Receptor Agonist', targetReceptor: 'V2 Receptors',
    indications: { 'Type 1 VWD / Uremic Bleeding / Hemophilia A': { dose: '0.3', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 15.0, V3: 0, k10: 0.006, k12: 0.04, k21: 0.04, ke0: 0.1 },
    pd: { c50: 0.1, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Synthetic analog of vasopressin. Stimulates release of VWF and Factor VIII from endothelial Weibel-Palade bodies. Indicated for Type 1 VWD, mild Hemophilia A, and uremic platelet dysfunction. NOT for Type 2B VWD.'
  },
  methylprednisolone: {
    name: 'Methylprednisolone', classes: ['Corticosteroid'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.77, mechanism: 'Glucocorticoid Receptor Agonist', targetReceptor: 'Glucocorticoid Receptor',
    indications: {
      'Anaphylaxis / Asthma': { dose: '125', unit: 'mg', type: 'Bolus' },
      'Fat Embolism': { dose: '6-7', unit: 'mg/kg', type: 'Bolus' },
      'Spinal Cord Injury (NASCIS)': { dose: '30', unit: 'mg/kg', type: 'Bolus' },
      'Airway Edema': { dose: '1-2', unit: 'mg/kg', type: 'Bolus' }
    },
    pk: { V1: 30.0, V2: 30.0, V3: 0, k10: 0.012, k12: 0.04, k21: 0.04, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0 },
    pd: { c50: 1.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 5, rrMax: 0 },
    notes: 'Synthetic glucocorticoid, 5× potency of hydrocortisone. Used for severe anaphylaxis/anaphylactoid reactions (prevents late-phase biphasic reactions), fat embolism syndrome (controversial — may reduce inflammatory lung injury), acute asthma exacerbation, spinal cord injury (NASCIS protocol — controversial). Onset 1-4h for anti-inflammatory effects. No mineralocorticoid activity. Use with caution in diabetics (causes hyperglycemia). PancreasEngine.ts integration: stress hyperglycemia amplified.'
  },
  pralidoxime: {
    name: 'Pralidoxime (2-PAM)', classes: ['Antidote', 'Cholinesterase Reactivator'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal (unchanged)', proteinBinding: 0, mechanism: 'Acetylcholinesterase Reactivator', targetReceptor: 'Acetylcholinesterase',
    indications: {
      'Organophosphate Poisoning': { dose: '1000-2000', unit: 'mg', type: 'Bolus' },
      'Maintenance': { dose: '200-500', unit: 'mg/hr', type: 'Infusion' }
    },
    pk: { V1: 10.0, V2: 10.0, V3: 0, k10: 0.06, k12: 0.03, k21: 0.03, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Oxime that reactivates organophosphate-inhibited acetylcholinesterase. CRITICAL TIMING: Must be given BEFORE "aging" — covalent bond between OP and AChE becomes irreversible (OP-specific; parathion ages within hours, sarin within minutes). Reverses nicotinic effects (muscle weakness, NMJ block) better than muscarinic effects. DOES NOT replace atropine (atropine handles muscarinic effects; pralidoxime handles nicotinic and AChE reactivation). Loading dose 1-2g IV over 15-30 min, then 200-500 mg/hr infusion. Avoid rapid IV push (can cause laryngospasm, tachycardia, hypertension from transient cholinesterase inhibition).'
  },
  hydroxocobalamin: {
    name: 'Hydroxocobalamin (Cyanokit)', classes: ['Antidote', 'Cyanide Antidote'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Binds cyanide → cyanocobalamin → renal excretion', proteinBinding: 0, mechanism: 'Cyanide Chelator', targetReceptor: 'Cyanide Ion',
    indications: {
      'Cyanide Poisoning / Smoke Inhalation': { dose: '5000', unit: 'mg', type: 'Bolus' },
      'Severe': { dose: '10000', unit: 'mg', type: 'Bolus' }
    },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.003, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'First-line antidote for cyanide poisoning (particularly smoke inhalation with suspected concurrent CO poisoning). Mechanism: cobalt ion in hydroxocobalamin has extremely high affinity for cyanide → forms cyanocobalamin (vitamin B12) → renally excreted. Advantages over older antidotes (amyl nitrite/sodium nitrite/sodium thiosulfate): DOES NOT cause methemoglobinemia (critical in concurrent CO poisoning where MetHb formation would be additive). Dose: 5g IV over 15 min (initial); repeat 5g x2 in severe cases. Side effects: turns urine/skin red-brown (interference with colorimetric lab tests including CO-oximetry — obtain ABG BEFORE administering). No oxygen interaction: can be given safely in hypoxic patients unlike nitrite-based antidotes.'
  },
  hydrocortisone: {
    name: 'Hydrocortisone', classes: ['Corticosteroid'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.90, mechanism: 'Glucocorticoid Receptor Agonist', targetReceptor: 'Glucocorticoid Receptor',
    indications: { 'Adrenal Crisis': { dose: '100', unit: 'mg', type: 'Bolus' }, 'Stress-Dose Coverage': { dose: '50-100', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 15.0, V3: 0, k10: 0.008, k12: 0.05, k21: 0.05, ke0: 0.1 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Short-acting corticosteroid. Physiological glucocorticoid with mineralocorticoid activity. Drug of choice for acute adrenal crisis (100mg IV bolus) and perioperative stress-dose coverage. Reverses glucocorticoid-suppression vasopressor blunting by restoring adrenergic receptor expression.'
  },
  pcc: {
    name: '4-Factor PCC (Kcentra)', classes: ['Coagulation Factor', 'Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Catabolism', proteinBinding: 0.0, mechanism: 'Coagulation Factor Replacement', targetReceptor: 'Coagulation Cascade',
    indications: { 'Warfarin Reversal': { dose: '25-50', unit: 'Unit/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.01, k12: 0, k21: 0, ke0: 1.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: '4-Factor Prothrombin Complex Concentrate (contains factors II, VII, IX, X, and proteins C and S). Rapidly reverses warfarin within 30 min. Preferred over FFP for urgent reversal of major bleeding.'
  },
  andexanet: {
    name: 'Andexanet Alfa (Andexxa)', classes: ['Decoy Receptor', 'Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Catabolism', proteinBinding: 0.0, mechanism: 'Factor Xa Decoy Receptor', targetReceptor: 'Factor Xa Inhibitors',
    indications: { 'Factor Xa Inhibitor Reversal': { dose: '800', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, ke0: 1.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Recombinant modified human Factor Xa decoy protein. Sequesters and reverses Factor Xa inhibitors (apixaban, rivaroxaban) within minutes. Indicated for life-threatening or uncontrolled bleeding.'
  },
  idarucizumab: {
    name: 'Idarucizumab (Praxbind)', classes: ['Monoclonal Antibody', 'Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal / Catabolism', proteinBinding: 0.0, mechanism: 'Dabigatran Monoclonal Antibody', targetReceptor: 'Dabigatran',
    indications: { 'Dabigatran Reversal': { dose: '5.0', unit: 'g', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.03, k12: 0, k21: 0, ke0: 1.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Humanized monoclonal antibody fragment that binds specifically to dabigatran with 350x greater affinity than thrombin. Produces immediate and complete reversal of dabigatran anticoagulation.'
  },
  propylthiouracil: {
    name: 'Propylthiouracil (PTU)', classes: ['Antithyroid Agent'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.75, mechanism: 'Thyroid Peroxidase Inhibitor + T4→T3 Conversion Blocker', targetReceptor: 'Thyroid Peroxidase',
    indications: { 'Thyroid Storm': { dose: '500-1000', unit: 'mg', type: 'Bolus' }, 'Hyperthyroidism Maintenance': { dose: '100', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0 },
    pd: { c50: 1.5, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: -5, rrMax: 0 },
    notes: 'Thionamide. Step 1 in thyroid storm treatment. Blocks thyroid peroxidase → prevents new hormone SYNTHESIS. Also blocks peripheral T4→T3 conversion (unique dual action vs methimazole). Give FIRST, then wait ≥1h before Lugol\'s iodide. Preferred in storm and 1st trimester pregnancy. No IV formulation — must use PO/NG tube. Hepatotoxicity risk (monitoring required). Onset 1-2h. Does NOT affect existing circulating hormones.'
  },
  methimazole: {
    name: 'Methimazole', classes: ['Antithyroid Agent'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0, mechanism: 'Thyroid Peroxidase Inhibitor', targetReceptor: 'Thyroid Peroxidase',
    indications: { 'Hyperthyroidism': { dose: '10-40', unit: 'mg', type: 'Bolus' }, 'Thyroid Storm': { dose: '40-60', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 0, V3: 0, k10: 0.015, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: -3, rrMax: 0 },
    notes: 'Thionamide. Preferred over PTU for maintenance (once-daily, less hepatotoxic). Also used in thyroid storm. Does NOT block T4→T3 conversion (unlike PTU). Avoid in 1st trimester pregnancy (teratogenic). Give before Lugol\'s iodide.'
  },
  lugolsIodide: {
    name: 'Lugol\'s Iodide', classes: ['Antithyroid Agent', 'Thyroid Release Blocker'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Iodine metabolism', proteinBinding: 0, mechanism: 'Wolff-Chaikoff Effect (iodide inhibits thyroid hormone release)', targetReceptor: 'Thyroid Follicular Cell',
    indications: { 'Thyroid Storm': { dose: '5-10', unit: 'drops', type: 'Bolus' }, 'Preoperative Iodide Loading': { dose: '1-2', unit: 'drops', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.01, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: -8, rrMax: 0 },
    notes: 'Potassium iodide solution (5% iodine + 10% KI). CRITICAL TIMING: Must be given ≥1 hour AFTER PTU or methimazole. If given FIRST, provides substrate for MORE hormone synthesis → worsens storm. Blocks thyroid hormone RELEASE via Wolff-Chaikoff effect. Rapid onset (hours). Dose: 5-10 drops PO q6-8h. Also used pre-operatively for thyroid surgery (reduces vascularity).'
  },
  rfviia: {
    name: 'Recombinant Factor VIIa (NovoSeven)', classes: ['Coagulation Factor', 'Reversal'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Catabolism', proteinBinding: 0.0, mechanism: 'Platelet Surface Factor X Activation', targetReceptor: 'Platelet Membrane',
    indications: { 'Hemophilia with Inhibitors': { dose: '90', unit: 'mcg/kg', type: 'Bolus' }, 'Refractory Hemorrhage': { dose: '90', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.015, k12: 0, k21: 0, ke0: 1.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Recombinant activated Factor VII (rFVIIa). Direct Factor X activation on platelet surfaces, bypassing FVIII/FIX. Used in hemophilia with inhibitors and refractory surgical hemorrhage. Supratherapeutic doses carry thromboembolism risks.'
  },

  // ===== BRONCHODILATORS (previously entirely absent) =====
  albuterol: {
    name: 'Albuterol (Salbutamol)', classes: ['Beta-2 Agonist', 'Bronchodilator'], routes: ['IV', 'Inhaled'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / GI', proteinBinding: 0.10, mechanism: 'Agonist', targetReceptor: 'Beta-2 Adrenergic',
    indications: { 'Bronchospasm': { dose: '2.5', unit: 'mg', type: 'Bolus' }, 'Hyperkalemia': { dose: '20', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 60.0, V3: 0, k10: 0.03, k12: 0.04, k21: 0.025, k13: 0, k31: 0, ke0: 0.6, coSensitivity: 0.2 },
    // F29: c50 0.5→0.05 — a 2.5 mg dose reaches only Ce≈0.05, so the β2-agonist tachycardia (a real,
    // expected side effect, pronounced at the 20 mg hyperkalemia dose) was absent.
    pd: { c50: 0.05, gamma: 1.5, sysMax: -8, diaMax: -5, hrMax: 15, rrMax: 0 },
    notes: 'Selective beta-2 adrenergic agonist. Primary bronchodilator for intraoperative bronchospasm (nebulized or MDI through ETT, or IV in severe cases). DUAL USE: also treats hyperkalemia by driving K+ intracellularly (shifts K+ ~0.5-1.0 mEq/L; slower onset than calcium but additive with insulin/glucose). Short t1/2 ~4h. Side effects: tachycardia, hypokalemia (dose-dependent), tremor. Does NOT reduce cardiac death risk in hyperkalemia (membrane stabilization requires calcium).'
  },
  ipratropium: {
    name: 'Ipratropium Bromide', classes: ['Anticholinergic Bronchodilator'], routes: ['Inhaled'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hydrolysis', proteinBinding: 0.0, mechanism: 'Blocker', targetReceptor: 'Muscarinic M3',
    indications: { 'Bronchospasm / COPD': { dose: '0.5', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 10.0, V3: 0, k10: 0.02, k12: 0.03, k21: 0.03, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 2, rrMax: 0 },
    notes: 'Quaternary anticholinergic bronchodilator. Blocks muscarinic M3 receptors on bronchial smooth muscle → bronchodilation. Minimal systemic absorption (quaternary compound does NOT cross BBB, does not cause tachycardia at therapeutic inhaled doses unlike atropine). Used as adjunct to albuterol in severe bronchospasm (additive effect via different receptor pathway). Also first-line for COPD exacerbation (cholinergic tone is the primary bronchoconstrictive mechanism in COPD). Onset 15-30 min, duration 4-6h.'
  },

  // ===== ENDOCRINE: INSULIN & GLUCAGON =====
  regularInsulin: {
    name: 'Regular Insulin', classes: ['Hormone', 'Antidiabetic'], routes: ['IV', 'SubQ'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal / Hepatic (insulinase)', proteinBinding: 0.05, mechanism: 'Agonist', targetReceptor: 'Insulin Receptor',
    indications: { 'Hyperglycemia': { dose: '0.1', unit: 'units/kg/hr', type: 'Infusion' }, 'Hyperkalemia': { dose: '10', unit: 'units', type: 'Bolus' }, 'DKA': { dose: '0.1', unit: 'units/kg/hr', type: 'Infusion' } },
    pk: { V1: 8.0, V2: 12.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.3 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Short-acting insulin. Three critical perioperative uses: (1) HYPERGLYCEMIA -- IV infusion titrated to glucose 140-180 mg/dL; (2) HYPERKALEMIA -- 10 units IV with 50 mL D50W; drives K+ intracellularly within 15-30 min, lowers serum K+ ~0.5-1.0 mEq/L (temporary, must follow with definitive treatment); (3) DKA -- 0.1 units/kg/hr infusion to close the anion gap, along with aggressive fluid replacement and electrolyte replacement (especially K+). WARNING: simultaneously lowers both glucose AND potassium -- monitor closely to avoid hypoglycemia AND hypokalemia, especially in DKA where total body K+ is depleted despite high serum K+.'
  },
  glucagon: {
    name: 'Glucagon', classes: ['Hormone', 'Antidiabetic Adjunct'], routes: ['IV', 'IM', 'SubQ'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Proteolysis (liver, kidney)', proteinBinding: 0.0, mechanism: 'Agonist', targetReceptor: 'Glucagon Receptor (Gs-coupled)',
    indications: { 'Hypoglycemia (No IV)': { dose: '1.0', unit: 'mg', type: 'Bolus' }, 'Beta-Blocker Overdose': { dose: '3-10', unit: 'mg', type: 'Bolus' }, 'CCB Overdose': { dose: '3-10', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.20, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 10, diaMax: 5, hrMax: 20, rrMax: 0 },
    notes: 'Counter-regulatory hormone to insulin. TWO key anesthesia uses: (1) HYPOGLYCEMIA WITHOUT IV ACCESS -- 1mg IM/SubQ raises glucose by stimulating hepatic glycogenolysis; works even in unconscious patient; (2) BETA-BLOCKER OR CCB OVERDOSE -- glucagon activates adenylyl cyclase INDEPENDENTLY of beta receptors (bypasses the blockade); 3-10mg IV bolus followed by 3-5 mg/hr infusion causes positive inotropy and chronotropy; this is the SPECIFIC treatment for beta-blocker bradycardia refractory to atropine and epinephrine. Nausea/vomiting are common side effects (limiting for conscious patients).'
  },

  // ===== DESMOPRESSIN (DDAVP) =====
  desmopressin: {
    name: 'Desmopressin (DDAVP)', classes: ['Vasopressin Analogue', 'Hemostatic Agent'], routes: ['IV', 'SubQ', 'Intranasal'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Renal', proteinBinding: 0.0, mechanism: 'Agonist', targetReceptor: 'V2 Vasopressin Receptor',
    indications: { 'Von Willebrand Disease Type 1': { dose: '0.3', unit: 'mcg/kg', type: 'Bolus' }, 'Mild Hemophilia A': { dose: '0.3', unit: 'mcg/kg', type: 'Bolus' }, 'Central Diabetes Insipidus': { dose: '0.3', unit: 'mcg/kg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 15.0, V3: 0, k10: 0.004, k12: 0.02, k21: 0.015, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: 5, rrMax: 0 },
    notes: 'Synthetic analogue of vasopressin (V2 selective). THREE anesthesia uses: (1) VWD TYPE 1 -- V2 receptor activation on endothelial Weibel-Palade bodies releases stored VWF → 3-5x increase in VWF and Factor VIII levels within 30 min. CONTRAINDICATED in Type 2B VWD (induces platelet aggregation and thrombocytopenia). (2) MILD HEMOPHILIA A -- same VWF release mechanism also releases Factor VIII; effective if baseline FVIII > 5%. (3) CENTRAL DI -- selective V2 action increases renal water reabsorption via aquaporin-2 insertion; does NOT cause vasoconstriction at therapeutic doses (V2 selectivity). Duration 8-12h. Tachyphylaxis with repeated doses (Weibel-Palade bodies depleted). Hyponatremia from water retention is a risk.'
  },

  // ===== OPIOIDS PREVIOUSLY MISSING =====
  codeine: {
    name: 'Codeine', classes: ['Opioid Prodrug'], routes: ['PO', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6 to morphine)', proteinBinding: 0.25, mechanism: 'Prodrug (via morphine)', targetReceptor: 'Mu-Opioid (via CYP2D6 conversion)',
    indications: { 'Mild-Moderate Pain': { dose: '30-60', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 100.0, V3: 0, k10: 0.015, k12: 0.04, k21: 0.025, k13: 0, k31: 0, ke0: 0.2, coSensitivity: 0.4 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: -3, rrMax: -8 },
    notes: 'Opioid PRODRUG -- codeine itself has minimal intrinsic analgesic activity. CYP2D6 converts ~10% to active morphine. CRITICAL PHARMACOGENOMICS: CYP2D6 Ultra-Rapid Metabolizers (UM, 1-10% by ethnicity) convert excessive codeine to morphine → respiratory arrest and death at STANDARD doses (FDA black-box warning; multiple pediatric post-tonsillectomy fatalities). CYP2D6 Poor Metabolizers (PM, 7% Caucasian) get NO analgesia (prodrug not activated). PharmacogenomicsEngine.ts models these effects. Contraindicated in children undergoing tonsillectomy/adenoidectomy and breastfeeding mothers who may be CYP2D6 UM. Also has weak direct antitussive activity (cough suppression) independent of CYP2D6.'
  },
  tramadol: {
    name: 'Tramadol', classes: ['Atypical Opioid', 'SNRI'], routes: ['IV', 'PO', 'IM'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6 to O-desmethyltramadol, CYP3A4/2B6)', proteinBinding: 0.20, mechanism: 'Agonist + Reuptake Inhibitor', targetReceptor: 'Mu-Opioid + Serotonin/Norepinephrine Transporters',
    indications: { 'Moderate Pain': { dose: '50-100', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 60.0, V3: 0, k10: 0.012, k12: 0.04, k21: 0.025, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.4 },
    pd: { c50: 0.8, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: -2, rrMax: -6 },
    notes: 'Dual mechanism: weak mu-opioid agonist (20x less potent than morphine) + serotonin/norepinephrine reuptake inhibitor (SNRI). CRITICAL INTERACTIONS: (1) MAOI INTERACTION -- DO NOT use with MAO inhibitors → severe serotonin syndrome (hyperthermia, rigidity, clonus, altered consciousness). DrugInteractionModel.ts tracks this. (2) CYP2D6 PHARMACOGENOMICS -- PM patients get inadequate analgesia; UM patients may have excessive mu-opioid effect. (3) SEIZURE RISK -- lowers seizure threshold, especially in combination with other serotonergic drugs. (4) SEROTONIN SYNDROME -- also occurs with SSRIs, SNRIs, linezolid, methylene blue. Lower abuse potential than morphine but still a controlled substance. Not recommended post-tonsillectomy in children (similar CYP2D6 risks to codeine).'
  },
  meperidine: {
    name: 'Meperidine (Pethidine)', classes: ['Opioid'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2B6/3A4 to normeperidine)', proteinBinding: 0.60, mechanism: 'Agonist', targetReceptor: 'Mu-Opioid',
    indications: { 'Post-Op Shivering': { dose: '25', unit: 'mg', type: 'Bolus' }, 'Acute Pain (limited)': { dose: '25-50', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 60.0, V3: 200.0, k10: 0.025, k12: 0.05, k21: 0.02, k13: 0.02, k31: 0.002, ke0: 0.5, coSensitivity: 0.5 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -10, diaMax: -5, hrMax: 8, rrMax: -10 },
    notes: 'Opioid with unique ANTI-SHIVERING property at sub-analgesic doses (25mg IV) via kappa receptor and alpha-2 activity -- the drug of choice for postoperative shivering. CRITICAL INTERACTION: MAOI COMBINATION (phenelzine, tranylcypromine, selegiline) → SEROTONIN SYNDROME with FATAL OUTCOMES -- absolute contraindication; even after discontinuing MAOIs, wait 14 days. Mechanism: meperidine blocks serotonin reuptake + MAOIs increase serotonin → serotonergic excess → hyperthermia + rigidity + autonomic instability. Also has LOCAL ANESTHETIC PROPERTIES (mild sodium channel block). Active metabolite NORMEPERIDINE accumulates in renal failure → seizures. Not recommended for chronic pain due to normeperidine toxicity. Causes tachycardia (unlike other opioids) due to vagolytic effect of structural similarity to atropine.'
  },
  oxycodone: {
    name: 'Oxycodone', classes: ['Opioid'], routes: ['PO', 'IV'], types: ['Bolus'], dosingWeight: 'IBW',
    metabolism: 'Hepatic (CYP3A4 primary, CYP2D6 to oxymorphone secondary)', proteinBinding: 0.45, mechanism: 'Agonist', targetReceptor: 'Mu-Opioid (predominantly)',
    indications: { 'Moderate-Severe Pain': { dose: '5-10', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 40.0, V3: 150.0, k10: 0.018, k12: 0.04, k21: 0.02, k13: 0.008, k31: 0.002, ke0: 0.3, coSensitivity: 0.5 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -8, diaMax: -5, hrMax: -4, rrMax: -10 },
    notes: 'Semi-synthetic opioid. Potency approximately 1.5x oral morphine. CYP3A4 is the primary metabolic pathway (unlike codeine/tramadol which use CYP2D6 predominantly) -- CYP3A4 inhibitors (fluconazole, erythromycin) markedly increase plasma levels and toxicity. CYP2D6 converts a small fraction to oxymorphone (more potent mu-agonist) -- CYP2D6 PMs have slightly reduced analgesic efficacy and CYP2D6 UMs have slightly enhanced effect but this is less clinically impactful than with codeine. Available as immediate-release and controlled-release formulations. Abuse potential and risk similar to other schedule II opioids.'
  },

  // ===== ANTIEMETICS MISSING FROM DB =====
  palonosetron: {
    name: 'Palonosetron', classes: ['Antiemetic', '5-HT3 Antagonist (Second Generation)'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6/3A4)', proteinBinding: 0.62, mechanism: 'Blocker', targetReceptor: '5-HT3',
    indications: { 'PONV Prophylaxis': { dose: '0.075', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 35.0, V2: 60.0, V3: 0, k10: 0.0009, k12: 0.02, k21: 0.015, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.02, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Second-generation 5-HT3 receptor antagonist. Key advantages over ondansetron: (1) MUCH LONGER HALF-LIFE (~40 hours vs ondansetron 6h) → single preoperative dose provides 24-72h coverage; (2) ALLOSTERIC BINDING -- binds 5-HT3 receptor at both orthosteric and allosteric sites → more potent and persistent effect; (3) LOWER QTc PROLONGATION RISK vs ondansetron; (4) PHASE II PONV coverage -- ondansetron/granisetron are less effective for delayed PONV (>24h), palonosetron maintains efficacy. Guideline-recommended first-choice 5-HT3 agent for PONV prophylaxis in high-risk patients (Gan et al. PONV consensus guidelines 2020).'
  },
  granisetron: {
    name: 'Granisetron', classes: ['Antiemetic', '5-HT3 Antagonist'], routes: ['IV', 'PO', 'Transdermal'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.65, mechanism: 'Blocker', targetReceptor: '5-HT3',
    indications: { 'PONV Prophylaxis': { dose: '1.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 55.0, V3: 0, k10: 0.006, k12: 0.02, k21: 0.015, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.1, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Selective 5-HT3 receptor antagonist. Similar efficacy to ondansetron for PONV prevention. Slightly LONGER half-life (~9h vs 6h for ondansetron) → better coverage into the PACU period. LOWER QT PROLONGATION RISK than ondansetron (the FDA ondansetron QTc warning specifically calls out ondansetron doses ≥32mg IV; granisetron has a cleaner cardiac safety profile). Available as transdermal patch (Sancuso) for 7-day coverage -- useful in chemotherapy patients and for opioid-induced nausea in chronic pain patients. CYP3A4 metabolism means interactions with CYP3A4 inhibitors/inducers.'
  },
  droperidol: {
    name: 'Droperidol', classes: ['Antiemetic', 'Antipsychotic (D2 Antagonist)'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.85, mechanism: 'Blocker', targetReceptor: 'Dopamine D2 (CTZ)',
    indications: { 'PONV Prophylaxis': { dose: '0.625-1.25', unit: 'mg', type: 'Bolus' }, 'PONV Rescue': { dose: '0.625', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 50.0, V3: 0, k10: 0.025, k12: 0.04, k21: 0.025, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.1, gamma: 1.5, sysMax: -8, diaMax: -5, hrMax: 0, rrMax: 0 },
    notes: 'Butyrophenone antipsychotic/antiemetic. Works at dopamine D2 receptors in the CTZ (chemoreceptor trigger zone). EXTREMELY effective for PONV at LOW doses (0.625mg IV) -- equal to ondansetron efficacy with different receptor. FDA BLACK BOX WARNING (2001): QT prolongation/Torsades de Pointes risk → requires baseline ECG and 2-4h post-administration monitoring. This black box warning drastically reduced use despite strong efficacy at low doses. Recent evidence suggests the 0.625mg dose carries acceptable QT risk. Extrapyramidal side effects (akathisia, tardive dyskinesia) at higher antipsychotic doses, uncommon at antiemetic doses. Acts on CTZ only (unlike promethazine which also has vestibular antiemetic effect). DrugInteractionModel.ts tracks its QT contribution.'
  },
  haloperidol: {
    name: 'Haloperidol', classes: ['Antipsychotic (Typical)', 'D2 Antagonist'], routes: ['IV', 'IM', 'PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6/3A4)', proteinBinding: 0.92, mechanism: 'Blocker', targetReceptor: 'Dopamine D2',
    indications: { 'PACU Delirium / Agitation': { dose: '0.5-2.0', unit: 'mg', type: 'Bolus' }, 'ICU Delirium': { dose: '1.0-5.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 30.0, V2: 100.0, V3: 0, k10: 0.005, k12: 0.03, k21: 0.015, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.2 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: 0, rrMax: 0 },
    notes: 'Typical antipsychotic. Potent D2 receptor blocker. PACU USE: treatment of emergence delirium and postoperative agitation, especially in elderly or confused patients. NEUROLEPTIC MALIGNANT SYNDROME (NMS) risk at high doses or in susceptible patients: hyperthermia + rigidity + altered consciousness + autonomic instability. Distinct from MH: NMS has slower onset (days), caused by dopaminergic blockade (not RYR1 mutation), treated with bromocriptine (dopamine agonist) + dantrolene, NOT triggered by volatile anesthetics. QT PROLONGATION: significant risk, especially at IV doses (DrugInteractionModel.ts tracks). Extrapyramidal effects (akathisia, dystonia) common at higher doses. Long half-life (~21h) -- effects persist well beyond single PACU dose.'
  },
  promethazine: {
    name: 'Promethazine', classes: ['Antiemetic', 'Antihistamine', 'Phenothiazine'], routes: ['IV', 'IM', 'PO', 'PR'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic', proteinBinding: 0.93, mechanism: 'Blocker', targetReceptor: 'H1 / D2 / Muscarinic',
    indications: { 'PONV / Motion Sickness': { dose: '6.25-12.5', unit: 'mg', type: 'Bolus' }, 'Allergy / Pruritus': { dose: '12.5-25', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 35.0, V2: 80.0, V3: 0, k10: 0.008, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.2 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: -3, rrMax: -3 },
    notes: 'Phenothiazine antiemetic with multiple receptor activities (H1, D2, muscarinic, alpha-1). Effective for vestibular PONV (motion-sickness type). WARNING: IV administration risks SEVERE TISSUE NECROSIS if extravasates -- preferably given via large bore IV or IM (but IM injection can cause necrosis too). IV injection rate must be slow. FDA warning against IV administration in some countries. HIGH SEDATION potential (antihistaminergic + dopaminergic). Anticholinergic side effects. Contraindicated in children under 2 years (risk of respiratory depression and death -- FDA black box). Used for opioid-induced pruritus at low doses. Respiratory depression risk compounds with opioids.'
  },
  diphenhydramine: {
    name: 'Diphenhydramine (Benadryl)', classes: ['Antihistamine H1', 'Antiemetic'], routes: ['IV', 'IM', 'PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP2D6)', proteinBinding: 0.98, mechanism: 'Blocker', targetReceptor: 'H1 Histamine',
    indications: { 'Allergic Reaction': { dose: '25-50', unit: 'mg', type: 'Bolus' }, 'Opioid Pruritus': { dose: '25', unit: 'mg', type: 'Bolus' }, 'PONV (vestibular)': { dose: '25-50', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 80.0, V3: 0, k10: 0.01, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.4, coSensitivity: 0.2 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: 5, rrMax: -2 },
    notes: 'First-generation H1 antihistamine. Multiple uses: (1) ALLERGIC REACTIONS -- H1 blockade treats urticaria/pruritus (does NOT replace epinephrine in anaphylaxis but adjunctive treatment); (2) OPIOID-INDUCED PRURITUS -- mechanism incompletely understood but often effective; (3) MOTION SICKNESS/VESTIBULAR PONV -- crosses BBB unlike second-generation antihistamines; (4) SEDATION -- frequently used for procedural anxiolysis. ANTICHOLINERGIC EFFECTS: urinary retention, constipation, dry mouth, blurred vision, tachycardia. CNS effects: sedation, dizziness, rarely paradoxical excitation (especially in children and elderly). Significant sedation potentiates all CNS depressants. CYP2D6 metabolism means interactions with fluoxetine, bupropion.'
  },
  aprepitant: {
    name: 'Aprepitant', classes: ['Antiemetic', 'NK1 Receptor Antagonist'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.95, mechanism: 'Blocker', targetReceptor: 'NK1 (Neurokinin-1/Substance P)',
    indications: { 'PONV Prevention (High Risk)': { dose: '80', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 25.0, V2: 40.0, V3: 0, k10: 0.005, k12: 0.02, k21: 0.015, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'NK1 receptor (substance P) antagonist. THE MOST POTENT PONV agent when used in multimodal regimens -- NK1 antagonists target a pathway that 5-HT3 and D2 antagonists do NOT, providing true additive benefit in multimodal protocols. PONVModel.ts references the NK1 pathway. 80mg PO given 1-3h before induction (no IV formulation widely available in US -- fosaprepitant is IV prodrug). Significant CYP3A4 INHIBITION (moderate inhibitor) → increases plasma levels of other CYP3A4 substrates (midazolam, fentanyl, steroids) by 20-50%. Also INDUCES CYP2C9 → reduces warfarin and hormonal contraceptive efficacy. Often reserved for high-risk PONV patients (Apfel score 3-4) or where other agents have failed. 40-60% relative risk reduction in PONV when added to existing prophylaxis.'
  },
  fosaprepitant: {
    name: 'Fosaprepitant (Emend IV)', classes: ['Antiemetic', 'NK1 Antagonist (IV Prodrug)'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Rapid hydrolysis to aprepitant (CYP3A4)', proteinBinding: 0.95, mechanism: 'Prodrug→Aprepitant NK1 Blocker', targetReceptor: 'NK1 (via aprepitant)',
    indications: { 'PONV Prevention (High Risk)': { dose: '150', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 20.0, V3: 0, k10: 0.3, k12: 0.1, k21: 0.04, k13: 0, k31: 0, ke0: 0.6, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Intravenous prodrug rapidly converted to aprepitant. Allows NK1 antagonism in patients who cannot take oral medications or where rapid onset is needed. Single 150mg IV dose provides equivalent exposure to 3-day oral aprepitant regimen. Same CYP3A4 inhibitor/CYP2C9 inducer interactions as oral aprepitant. Site-specific infusion site reactions (burning, phlebitis) common -- dilute and infuse slowly. Expensive but cost-justified in high-PONV-risk surgical patients where overall healthcare costs (reoperations, prolonged PACU stays, unexpected admissions) are considered.'
  },

  // ===== VASOPRESSORS/INOTROPES MISSING =====
  isoproterenol: {
    name: 'Isoproterenol', classes: ['Beta-1/Beta-2 Agonist', 'Chronotrope'], routes: ['IV'], types: ['Infusion', 'Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (COMT)', proteinBinding: 0.0, mechanism: 'Agonist', targetReceptor: 'Beta-1 / Beta-2 Adrenergic',
    indications: { 'Bradycardia (Transplanted Heart)': { dose: '2-10', unit: 'mcg/min', type: 'Infusion' }, 'Complete Heart Block': { dose: '2-10', unit: 'mcg/min', type: 'Infusion' }, 'Brugada Syndrome Crisis': { dose: '1-5', unit: 'mcg/min', type: 'Infusion' } },
    pk: { V1: 15.0, V2: 30.0, V3: 0, k10: 0.15, k12: 0.08, k21: 0.05, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.3 },
    // F26: c50 0.5→0.004 mg/L. Isoproterenol is dosed in mcg/min (2-10), giving a plasma Css of only
    // ~0.002-0.004 mg/L — 100x below the old c50, so the drug was clinically INERT (no chronotropy) at
    // every real dose. It is an extremely potent β-agonist (effective plasma levels ~ng/mL, like the
    // catecholamine scale used for norepinephrine's c50=0.001). With c50=0.004: 5 mcg/min→~+11 bpm,
    // 10 mcg/min→more — restoring its role as the chronotrope of choice for the denervated (transplant)
    // heart and complete heart block, where atropine is useless.
    pd: { c50: 0.004, gamma: 1.5, sysMax: -10, diaMax: -8, hrMax: 30, rrMax: 0 },
    notes: 'Pure beta-1 AND beta-2 agonist. No alpha activity. THREE key anesthesia indications: (1) DENERVATED HEART (cardiac transplant) -- the transplanted heart has NO vagal innervation → atropine is completely ineffective for bradycardia; isoproterenol (or epinephrine) is the ONLY pharmacological chronotrope that works; (2) COMPLETE HEART BLOCK awaiting pacemaker -- pure chronotropy without the alpha vasoconstriction; (3) BRUGADA SYNDROME CRISIS -- quinidine and isoproterenol are the specific pharmacological treatments for ventricular storm in Brugada. Unlike epinephrine, isoproterenol causes vasodilation (beta-2 effect) → may cause hypotension despite increasing HR. Massive tachycardia and arrhythmia risk at higher doses.'
  },

  // ===== ANTIPSYCHOTICS/DELIRIUM =====

  // (haloperidol already added above)

  // ===== ENDOCRINE ADDITIONAL =====
  octreotide: {
    name: 'Octreotide', classes: ['Somatostatin Analogue'], routes: ['IV', 'SubQ'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic / Renal', proteinBinding: 0.65, mechanism: 'Agonist', targetReceptor: 'Somatostatin Receptors (SSTR2/5)',
    indications: { 'Carcinoid Crisis': { dose: '100-500', unit: 'mcg', type: 'Bolus' }, 'Esophageal Varices': { dose: '50', unit: 'mcg', type: 'Bolus' }, 'Acromegaly': { dose: '100', unit: 'mcg', type: 'Bolus' } },
    pk: { V1: 10.0, V2: 20.0, V3: 0, k10: 0.02, k12: 0.03, k21: 0.025, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 5, diaMax: 3, hrMax: -5, rrMax: 0 },
    notes: 'Long-acting somatostatin analogue. CRITICAL CARCINOID CRISIS USE: the ONLY pharmacological treatment that works for carcinoid crisis by BLOCKING TUMOR HORMONE RELEASE (serotonin, bradykinin, histamine) at the source. Standard antihistamines and vasopressors are ineffective against carcinoid-mediated bronchospasm and flushing. Give BEFORE tumor manipulation if carcinoid is known. Additional uses: esophageal variceal bleeding (reduces portal pressure by splanchnic vasoconstriction), acromegaly, VIPomas, glucagonomas. Side effects: hyperglycemia (inhibits insulin release), nausea, cholelithiasis with chronic use. The somatostatin analogue sandbox for carcinoid is one of the classic "what drug is the patient MISSING" teaching scenarios.'
  },
  bromocriptine: {
    name: 'Bromocriptine', classes: ['Dopamine D2 Agonist', 'NMS Treatment'], routes: ['PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP3A4)', proteinBinding: 0.96, mechanism: 'Agonist', targetReceptor: 'Dopamine D2',
    indications: { 'Neuroleptic Malignant Syndrome': { dose: '2.5', unit: 'mg', type: 'Bolus' }, 'Parkinson (Adjunct)': { dose: '1.25', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 50.0, V2: 100.0, V3: 0, k10: 0.008, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.2 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: 5, rrMax: 0 },
    notes: 'Ergot-derived dopamine D2 receptor agonist. THE SPECIFIC TREATMENT for Neuroleptic Malignant Syndrome (NMS): NMS is caused by dopaminergic blockade (antipsychotics) → bromocriptine REVERSES this by acting as a dopamine agonist. Dose 2.5mg PO q8h, titrate up. Dantrolene is also used in NMS for rigidity and hyperthermia, but bromocriptine addresses the CAUSE. DISTINGUISH FROM MH: NMS is NOT triggered by volatile anesthetics, onset is slower (hours to days after antipsychotic exposure vs minutes for MH), fever is LESS extreme in early stages, and creatinine kinase elevation is common. MH patient should NOT receive haloperidol (may worsen NMS-like features). Also used for Parkinson disease, hyperprolactinemia, and acromegaly.'
  },
  physostigmine: {
    name: 'Physostigmine', classes: ['Cholinesterase Inhibitor (Central)', 'Anticholinergic Antidote'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hydrolysis (cholinesterase)', proteinBinding: 0.05, mechanism: 'Inhibitor', targetReceptor: 'Cholinesterase (Central + Peripheral)',
    indications: { 'Central Anticholinergic Syndrome': { dose: '1.0-2.0', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 20.0, V2: 15.0, V3: 0, k10: 0.04, k12: 0.05, k21: 0.04, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0.1 },
    pd: { c50: 0.5, gamma: 1.5, sysMax: -5, diaMax: -3, hrMax: -10, rrMax: 0 },
    notes: 'Tertiary amine cholinesterase inhibitor -- CROSSES THE BLOOD-BRAIN BARRIER (unlike neostigmine/edrophonium which are quaternary). This CNS penetration makes it THE SPECIFIC ANTIDOTE for central anticholinergic syndrome (central anti-cholinergic toxidrome): hot (hyperthermia), dry (anhidrosis, dry mucous membranes), flushed (vasodilation), blind (mydriasis), tachycardic, delirious/agitated. Caused by: atropine (overdose), scopolamine, diphenhydramine, tricyclic antidepressants, plant alkaloids (jimsonweed). Dose: 1-2mg slow IV; works within 5 minutes; duration ~60-90 min. May need repeat dosing. CHOLINERGIC SIDE EFFECTS (excessive salivation, bronchospasm, bradycardia) -- have atropine available. Do NOT confuse with emergence delirium (post-anesthesia confusion resolves spontaneously vs anticholinergic syndrome which does not).'
  },

  // ===== FLUIDS / SOLUTIONS MISSING =====
  hypertonicSaline3: {
    name: 'Hypertonic Saline 3%', classes: ['Hypertonic Crystalloid', 'Osmotic Agent'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Renal excretion', proteinBinding: 0.0, mechanism: 'Osmotic Gradient', targetReceptor: 'N/A (osmotic effect)',
    indications: { 'Symptomatic Hyponatremia': { dose: '100-150', unit: 'mL', type: 'Infusion' }, 'Raised ICP': { dose: '1-2', unit: 'mL/kg', type: 'Bolus' } },
    pk: { V1: 3.0, V2: 42.0, V3: 0, k10: 0.04, k12: 0.3, k21: 0.02, k13: 0, k31: 0, ke0: 0.8, coSensitivity: 0.0 },
    pd: { c50: 5.0, gamma: 1.0, sysMax: 8, diaMax: 5, hrMax: 0, rrMax: 0 },
    notes: 'Hypertonic (3% NaCl = 513 mEq/L Na) used to raise serum sodium and plasma osmolality. TWO INDICATIONS: (1) SYMPTOMATIC HYPONATREMIA (Na < 120 mEq/L with seizures/coma): 100-150mL bolus raises Na by ~2 mEq/L; CORRECTION RATE CRITICAL -- too fast → central pontine myelinolysis (osmotic demyelination); maximum 10-12 mEq/L per 24h; (2) RAISED ICP (ALTERNATIVE TO MANNITOL): hypertonicity draws fluid from cerebral edematous tissue across intact BBB (same mechanism as mannitol but lasts longer, avoids mannitol rebound, and can be used in hypovolemia where mannitol is contraindicated). AcidBaseModel.ts effects: sodium load raises SID (alkalinizing effect) while chloride load reduces SID (acidifying); net effect varies by exact formulation. Monitor serum Na every 2-4 hours during administration.'
  },
  factorVIIIconcentrate: {
    name: 'Factor VIII Concentrate (rFVIII)', classes: ['Coagulation Factor', 'Hemostatic Agent'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Catabolism', proteinBinding: 0.0, mechanism: 'Cofactor Replacement', targetReceptor: 'Intrinsic Coagulation Pathway',
    indications: { 'Hemophilia A Bleeding': { dose: '25-50', unit: 'units/kg', type: 'Bolus' }, 'Surgical Coverage Hemophilia A': { dose: '50', unit: 'units/kg', type: 'Bolus' } },
    pk: { V1: 8.0, V2: 0, V3: 0, k10: 0.006, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Recombinant Factor VIII (Advate, Helixate, Kovaltry) for Hemophilia A treatment. DOSING: each unit/kg raises Factor VIII level by ~2%; target levels: minor hemorrhage 20-40%, major/surgical 80-100% (maintain for 7-14 days post-op). Half-life ~8-12h → twice-daily dosing needed for surgical coverage. INHIBITOR COMPLICATION: ~30% of severe Hemophilia A patients develop anti-FVIII antibodies (inhibitors) → standard FVIII becomes ineffective → switch to bypassing agents (rFVIIa, APCC). DeepCoagulationModel.ts simulates the Factor VIII level response. Requires refrigeration, infuse within hours of reconstitution.'
  },
  rasburicase: {
    name: 'Rasburicase', classes: ['Antidote', 'Urate Oxidase'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Intracellular degradation', proteinBinding: 0, mechanism: 'Urate Oxidase', targetReceptor: 'Uric Acid',
    indications: { 'Tumor Lysis Syndrome': { dose: '0.2', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.005, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Recombinant urate oxidase. Converts uric acid → allantoin (water-soluble, renally excreted) — DEGRADES existing uric acid, unlike allopurinol (prevents new synthesis only). Much more rapidly effective in TLS. ABSOLUTE CONTRAINDICATION: G6PD deficiency (generates H2O2 → hemolytic anemia). Check G6PD before administration. Obtain blood sample for uric acid BEFORE giving rasburicase (H2O2 in blood tube → in vitro degradation → falsely low results).'
  },
  c1InhConcentrate: {
    name: 'C1-INH Concentrate', classes: ['Antidote', 'Complement Inhibitor'], routes: ['IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Catabolism', proteinBinding: 0, mechanism: 'C1-Esterase Inhibitor', targetReceptor: 'Complement Cascade / Kallikrein-Kinin',
    indications: { 'Hereditary Angioedema (HAE)': { dose: '20', unit: 'units/kg', type: 'Bolus' }, 'ACE-I Angioedema': { dose: '1000', unit: 'units', type: 'Bolus' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.01, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'C1-esterase inhibitor concentrate (Berinert, Cinryze). Primary treatment for hereditary angioedema (HAE) and ACE inhibitor-induced bradykinin-mediated angioedema. Works by inhibiting complement activation and kallikrein → reduces bradykinin generation. NOT effective against histamine-mediated allergic angioedema (that requires epinephrine). Onset: 20-60 min. Effect lasts 12-24h. Safer alternative to FFP (which also contains C1-INH but also introduces large volumes and clotting factors).'
  },
  icatibant: {
    name: 'Icatibant', classes: ['Antidote', 'Bradykinin B2 Antagonist'], routes: ['SC', 'IV'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Proteolytic degradation', proteinBinding: 0.44, mechanism: 'Antagonist', targetReceptor: 'Bradykinin B2 Receptor',
    indications: { 'HAE / ACE-I Angioedema': { dose: '30', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.02, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Selective bradykinin B2 receptor antagonist (Firazyr). Self-injectable for HAE — works in 30-60 min. Also effective for ACE inhibitor-induced angioedema. Blocks bradykinin effects at receptor level. Dose: 30 mg SC in abdomen. Can repeat × 2 (max 3 doses per 24h). Has NO effect on histamine-mediated allergic reactions. Does NOT require G6PD check (unlike rasburicase).'
  },
  hemin: {
    name: 'Hemin (Panhematin)', classes: ['Antidote', 'Heme Synthesis'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Incorporated into heme pool', proteinBinding: 0.85, mechanism: 'ALAS1 Suppressor', targetReceptor: 'ALA-Synthase-1 (ALAS1)',
    indications: { 'Acute Porphyria': { dose: '4', unit: 'mg/kg', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 0.003, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0 },
    pd: { c50: 1.0, gamma: 1.5, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Hematin reconstituted with human serum albumin. Replenishes heme pool → negative feedback on ALAS1 → reduces porphyrin precursor production. MAINSTAY of acute porphyria treatment. Dose: 3-4 mg/kg IV over 60 min once daily × 4 days. Benefit seen within 24-48h. Most effective when started early. Side effect: coagulopathy (anticoagulant effect from iron in hematin — use albumin reconstitution to reduce). Reconstitute with 25% albumin (NOT water alone) to reduce phlebitis.'
  },
  procainamide: {
    name: 'Procainamide', classes: ['Class IA Antiarrhythmic'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (N-acetyltransferase) to active NAPA', proteinBinding: 0.15, mechanism: 'Blocker', targetReceptor: 'Na⁺ Channel + IKr (hERG)',
    indications: { 'WPW + AF': { dose: '15', unit: 'mg/kg', type: 'Bolus' }, 'VT': { dose: '10-17', unit: 'mg/kg', type: 'Bolus' } },
    // F37 (L3): effect-t½ 20→108 min (clinical procainamide 3-4h). Already Ce≫c50 (saturated) so a
    // gentle k10 0.08→0.02 (+ k12 0.05→0.03, k21 0.04→0.05) lengthens it without pinning the effect flat.
    pk: { V1: 40.0, V2: 60.0, V3: 0, k10: 0.02, k12: 0.03, k21: 0.05, k13: 0, k31: 0, ke0: 0.3, coSensitivity: 0.1 },
    pd: { c50: 2.0, gamma: 1.5, sysMax: -15, diaMax: -10, hrMax: -10, rrMax: 0 },
    notes: 'Class IA antiarrhythmic. UNIQUE ROLE: One of the few safe drugs for WPW + AF (also blocks accessory pathway — unlike adenosine, verapamil, diltiazem, digoxin which are DANGEROUS in WPW+AF). Also effective for VT. SLOW IV infusion required (15 mg/kg over 30-60 min) — rapid administration → hypotension. Active metabolite NAPA also antiarrhythmic. Lupus-like syndrome with prolonged use. QT prolongation risk. Renally cleared — dose reduce in CKD.'
  },
  caffeine: {
    name: 'Caffeine', classes: ['Methylxanthine', 'Adenosine Antagonist'], routes: ['IV', 'PO'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (CYP1A2)', proteinBinding: 0.35, mechanism: 'Antagonist', targetReceptor: 'Adenosine Receptors',
    indications: { 'Post-Dural Puncture Headache': { dose: '300-500', unit: 'mg', type: 'Bolus' }, 'Apnea of Prematurity': { dose: '20', unit: 'mg/kg', type: 'Bolus' } },
    pk: { V1: 40.0, V2: 0, V3: 0, k10: 0.03, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 0.5, coSensitivity: 0 },
    pd: { c50: 5.0, gamma: 1.5, sysMax: 10, diaMax: 5, hrMax: 12, rrMax: 2 },
    notes: 'Methylxanthine. Adenosine receptor antagonist — ANTAGONIZES adenosine used for SVT (if patient has caffeine in system, need higher adenosine dose). Uses: (1) Post-dural puncture headache: 300-500 mg IV/PO → causes cerebral vasoconstriction + increases CSF production → reduces PDPH severity (temporary, 4-8h effect); (2) Apnea of prematurity: stimulates respiratory center. Note: Caffeine reduces susceptibility to bronchodilation by theophylline (competition). Does NOT reduce susceptibility to epinephrine or catecholamines.'
  },
  angiotensin_ii: {
    name: 'Angiotensin II', classes: ['Vasopressor'], routes: ['IV'], types: ['Infusion'], dosingWeight: 'TBW',
    metabolism: 'Plasma Peptidases (immediate)', mechanism: 'Agonist', targetReceptor: 'AT1',
    indications: { 'Refractory Shock': { dose: '20-80', unit: 'ng/kg/min', type: 'Infusion' } },
    pk: { V1: 5.0, V2: 0, V3: 0, k10: 2.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 3.0, coSensitivity: 0.05 },
    pd: { c50: 0.005, gamma: 2.0, sysMax: 60, diaMax: 70, hrMax: 0, rrMax: 0 },
    notes: 'Synthetic human angiotensin II. Binds G-protein coupled AT1 receptors. Specifically designed for vasodilatory, catecholamine-refractory shock.'
  },
  lorazepam: {
    name: 'Lorazepam', classes: ['Benzodiazepine'], routes: ['IV', 'IM'], types: ['Bolus'], dosingWeight: 'TBW',
    metabolism: 'Hepatic (glucuronidation only, no active metabolites)', proteinBinding: 0.85, synergyGroup: 'Sedative', pkModel: 'Greenblatt',
    mechanism: 'Allosteric Modulator', targetReceptor: 'GABA-A',
    indications: { 'Anxiolysis / Seizure': { dose: '1-2', unit: 'mg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 35.0, V3: 0, k10: 0.003, k12: 0.03, k21: 0.02, k13: 0, k31: 0, ke0: 0.08, coSensitivity: 0.1 },
    pd: { c50: 0.05, gamma: 1.5, sysMax: -5, diaMax: -5, hrMax: 0, rrMax: -4, inducesApneaAtCe: 0.5 },
    notes: 'Intermediate-acting benzodiazepine. Slower onset than midazolam. Highly stable profile.'
  },
  // L5/F6: duplicate `sotalol` and `verapamil` keys removed here — they were DEAD (JS object literals keep
  // the LAST key, so these later, sparser entries silently shadowed the richer earlier ones). pk/pd were
  // byte-identical, so removal is behavior-neutral; the earlier entries (with the WPW/beta-blocker
  // contraindication notes) are now the single definitions.
  factorIXconcentrate: {
    name: 'Factor IX Concentrate (rFIX)', classes: ['Coagulation Factor', 'Hemostatic Agent'], routes: ['IV'], types: ['Bolus', 'Infusion'], dosingWeight: 'TBW',
    metabolism: 'Catabolism', proteinBinding: 0.0, mechanism: 'Serine Protease Replacement', targetReceptor: 'Intrinsic Coagulation Pathway',
    indications: { 'Hemophilia B Bleeding': { dose: '25-50', unit: 'units/kg', type: 'Bolus' }, 'Surgical Coverage Hemophilia B': { dose: '50-100', unit: 'units/kg', type: 'Bolus' } },
    pk: { V1: 15.0, V2: 0, V3: 0, k10: 0.004, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.0, coSensitivity: 0.0 },
    pd: { c50: 1.0, gamma: 1.0, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: 0 },
    notes: 'Recombinant Factor IX (BeneFIX, Rixubis, Alprolix) for Hemophilia B treatment. DIFFERENT DOSING from FVIII: each unit/kg raises FIX by ONLY 1% (vs 2% for FVIII) because FIX has a LARGER VOLUME OF DISTRIBUTION (distributes into extravascular space). LONGER HALF-LIFE than FVIII (~18-24h for standard FIX; extended half-life products up to 100h) → once-daily or every-other-day dosing for surgical coverage. Clinically IDENTICAL presentation to Hemophilia A but treated differently. Some FIX products associated with anaphylaxis (particularly in severe Hemophilia B patients with inversions/deletions -- similar mechanism to FVIII inhibitors). Half-life products can make once-weekly or even less frequent prophylaxis possible.'
  }
};

export function calculateLungVolumes(heightCm, age, sex, bmi, position = 'Supine', isCopd = false, isRestrictive = false, isAnesthetized = false, pregnancyFrcMultiplier = 1.0) {
    // Delegates to the single canonical implementation (avoids divergent duplicate logic).
    return RespiratoryEngine.calculateLungVolumes(heightCm, age, sex, bmi, position, isCopd, isRestrictive, isAnesthetized, pregnancyFrcMultiplier);
}

/**
 * Computes the fraction of a target organ/vascular bed's sympathetic supply silenced by a
 * thoracic epidural local anesthetic block, using the dermatomal innervation map in
 * TABLE 15.2 (Summary of Visceral Innervation on Gastrointestinal Tract), Miller's 9th Ed.
 * A therapeutic epidural bolus is assumed to spread ~4 dermatomes cranial and caudal from the
 * catheter insertion level (~8-10 total segments) — not a textbook-sourced constant, but a
 * standard clinical estimate used only to translate a single insertion level into a band.
 * Returns 0 (no block) to 1 (the organ's entire sympathetic range is covered).
 */
export function calculateDermatomalBlockFraction(epiduralLevel, organRangeLowT, organRangeHighT, spread = 4) {
    if (typeof epiduralLevel !== 'number' || !Number.isFinite(epiduralLevel)) {
        return 1.0; // Back-compat: epiduralBlockActive set with no level specified assumes full coverage.
    }
    const blockLow = epiduralLevel - spread;
    const blockHigh = epiduralLevel + spread;
    const overlap = Math.max(0, Math.min(blockHigh, organRangeHighT) - Math.max(blockLow, organRangeLowT));
    const organRangeSpan = Math.max(1, organRangeHighT - organRangeLowT);
    return Math.max(0, Math.min(1.0, overlap / organRangeSpan));
}

/**
 * Computes the delivered gas mixture from the anesthesia workstation flowmeters, applying the
 * two independent gas-supply safety interlocks described in Ch22 (Inhaled Anesthetics: Delivery
 * Systems), Miller's 9th Ed:
 *
 * 1. Link-25 mechanical proportioning system (p.583): a 15-tooth N2O sprocket and 29-tooth O2
 *    sprocket joined by a chain mechanically enforce a maximum 3:1 N2O:O2 flow ratio. Modeled
 *    here as a stateless floor on O2 flow (`o2F = max(dialedO2F, n2oFlow/3)`) — a simplified
 *    equivalent of the source's bidirectional description (it can also lower N2O flow when O2
 *    is reduced) that guarantees the same minimum-FiO2 safety outcome regardless of which dial
 *    the user is conceptually turning. This constrains dialed flow RATES, not gas identity, so
 *    it provides no protection during pipeline crossover (see (2) below).
 * 2. Oxygen supply failure protection device / "fail-safe valve" (p.901-909): responds to low O2
 *    SUPPLY PRESSURE (distinct from the dialed-flow-ratio system above) by shutting off N2O flow
 *    entirely (binary valve). Per the source this is explicitly NOT protective during pipeline
 *    crossover/contamination, since the valve only senses pressure, not gas identity.
 *
 * @param gasSettings { o2Flow, airFlow, n2oFlow } dialed flowmeter settings (L/min)
 * @param hasO2Supply whether the O2 supply (pipeline or backup cylinder) is currently pressurized
 * @param o2SourceIsO2 true if the O2 flowmeter channel is actually delivering O2
 * @param o2SourceIsN2O true if the O2 flowmeter channel is contaminated and actually delivering N2O (crossover)
 */
export function calculateLink25GasMixture(gasSettings, hasO2Supply, o2SourceIsO2, o2SourceIsN2O) {
    const dialedO2F = typeof gasSettings?.o2Flow === 'number' && Number.isFinite(gasSettings.o2Flow) ? gasSettings.o2Flow : 0;
    const airF = typeof gasSettings?.airFlow === 'number' && Number.isFinite(gasSettings.airFlow) ? gasSettings.airFlow : 0;
    const n2oF = typeof gasSettings?.n2oFlow === 'number' && Number.isFinite(gasSettings.n2oFlow) ? gasSettings.n2oFlow : 0;

    // 1. Link-25 proportioning: floor O2 flow at a minimum 1:3 ratio to dialed N2O flow.
    const o2F = Math.max(dialedO2F, n2oF / 3.0);

    const isO2PressureLow = o2F > 0 && !hasO2Supply;

    // 2. Oxygen supply failure protection device ("fail-safe valve"): cuts N2O flow if O2 supply
    // pressure is lost. Does not protect against crossover (handled via o2SourceIsN2O below).
    const failSafeN2OCutoff = !hasO2Supply;
    const effectiveN2OFlow = failSafeN2OCutoff ? 0 : n2oF;

    const actualO2FromFlowmeter = o2SourceIsO2 ? o2F : 0;
    const actualN2OFromFlowmeter = effectiveN2OFlow + (o2SourceIsN2O ? o2F : 0);

    const actualO2 = actualO2FromFlowmeter + airF * 0.21;
    const actualN2O = actualN2OFromFlowmeter;
    const actualN2 = airF * 0.79;

    const totalFGF = actualO2 + actualN2O + actualN2;

    let deliveredFiO2 = 21;
    let n2oPercent = 0;
    let freshGasFlow = 0;
    if (totalFGF > 0.001) {
        deliveredFiO2 = (actualO2 / totalFGF) * 100;
        n2oPercent = (actualN2O / totalFGF) * 100;
        freshGasFlow = totalFGF;
    }

    return { o2F, effectiveN2OFlow, deliveredFiO2, n2oPercent, freshGasFlow, isO2PressureLow, failSafeN2OCutoff, n2oDialedFlow: n2oF };
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
    retentionIntact: 1.0, retentionInflamed: 0.90, hct: 0.70, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 0, angle: 0 }, viscosity: 3.5 
  }, 
  'Fresh Frozen Plasma (FFP)': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 10, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, osm: 300, tonicity: 'Isotonic', coag: { r: -4, ma: 0, angle: 5 }, viscosity: 1.8 
  },
  'Platelets': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 5, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, osm: 300, tonicity: 'Isotonic', coag: { r: -1, ma: 15, angle: 10 }, viscosity: 2.0 
  },
  'Cryoprecipitate': { 
    type: 'Blood Product', defaultVol: 50, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 5, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.95, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 5, angle: 15 }, viscosity: 1.8 
  },
  'Fibrinogen Concentrate': {
    type: 'Blood Product', defaultVol: 50, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.95, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 15, angle: 10 }, viscosity: 1.8
  }
};