/**
 * Helper function to calculate Ideal Body Weight (IBW) based on the Devine formula.
 * @param {number} heightCm - Height in centimeters.
 * @param {string} sex - 'male' or 'female'.
 * @returns {number} Ideal Body Weight in kg.
 */
export function calculateIBW(heightCm, sex) {
  const heightInches = heightCm / 2.54;
  const heightOver60 = Math.max(0, heightInches - 60);

  if (sex.toLowerCase() === 'male') {
    return 50.0 + (2.3 * heightOver60);
  } else {
    return 45.5 + (2.3 * heightOver60);
  }
}

/**
 * Helper function to calculate Lean Body Weight (LBW) based on the Boer formula.
 * @param {number} heightCm - Height in centimeters.
 * @param {number} weightKg - Total body weight in kg.
 * @param {string} sex - 'male' or 'female'.
 * @returns {number} Lean Body Weight in kg.
 */
export function calculateLBW(heightCm, weightKg, sex) {
  if (sex.toLowerCase() === 'male') {
    return (0.407 * weightKg) + (0.267 * heightCm) - 19.2;
  } else {
    return (0.252 * weightKg) + (0.473 * heightCm) - 48.3;
  }
}

/**
 * MEDICATIONS Database
 * Contains pharmacokinetic and pharmacodynamic properties of common anesthesia medications.
 */
export const MEDICATIONS = {
  // ==========================================
  // 1. IV Induction Agents
  // ==========================================
  propofol: {
    name: 'Propofol',
    class: 'Sedative/Hypnotic',
    dosingWeight: 'LBW',
    standardDoseRange: [1.5, 2.5], // mg/kg
    onsetSeconds: 30,
    durationMinutes: 5,
    hrEffect: -10,
    sysEffect: -20
  },
  etomidate: {
    name: 'Etomidate',
    class: 'Sedative/Hypnotic',
    dosingWeight: 'TBW',
    standardDoseRange: [0.2, 0.3], // mg/kg
    onsetSeconds: 30,
    durationMinutes: 5,
    hrEffect: 0,
    sysEffect: 0
  },
  ketamine: {
    name: 'Ketamine',
    class: 'NMDA Antagonist / Dissociative',
    dosingWeight: 'IBW',
    standardDoseRange: [1.0, 2.0], // mg/kg
    onsetSeconds: 45,
    durationMinutes: 15,
    hrEffect: 20,
    sysEffect: 20
  },
  thiopental: {
    name: 'Thiopental',
    class: 'Barbiturate',
    dosingWeight: 'LBW',
    standardDoseRange: [3.0, 5.0], // mg/kg
    onsetSeconds: 30,
    durationMinutes: 10,
    hrEffect: 10,
    sysEffect: -15
  },

  // ==========================================
  // 2. Inhalational (Volatile) Anesthetics
  // ==========================================
  sevoflurane: {
    name: 'Sevoflurane',
    class: 'Volatile Anesthetic',
    dosingWeight: 'TBW', // Not dosed by weight, but MAC
    standardDoseRange: [1.0, 3.0], // % Vol
    onsetSeconds: 60,
    durationMinutes: 10,
    hrEffect: 0,
    sysEffect: -15
  },
  desflurane: {
    name: 'Desflurane',
    class: 'Volatile Anesthetic',
    dosingWeight: 'TBW', // MAC
    standardDoseRange: [4.0, 8.0], // % Vol
    onsetSeconds: 30,
    durationMinutes: 5,
    hrEffect: 15, // Transient tachycardia
    sysEffect: -10
  },
  isoflurane: {
    name: 'Isoflurane',
    class: 'Volatile Anesthetic',
    dosingWeight: 'TBW', // MAC
    standardDoseRange: [1.0, 2.0], // % Vol
    onsetSeconds: 120,
    durationMinutes: 15,
    hrEffect: 5,
    sysEffect: -15
  },
  nitrousOxide: {
    name: 'Nitrous Oxide',
    class: 'Inhalational Anesthetic',
    dosingWeight: 'TBW', // MAC
    standardDoseRange: [50, 70], // % Vol
    onsetSeconds: 60,
    durationMinutes: 5,
    hrEffect: 0,
    sysEffect: 0
  },

  // ==========================================
  // 3. Opioid Analgesics
  // ==========================================
  fentanyl: {
    name: 'Fentanyl',
    class: 'Opioid',
    dosingWeight: 'LBW',
    standardDoseRange: [1.0, 2.0], // mcg/kg
    onsetSeconds: 120,
    durationMinutes: 30,
    hrEffect: -10,
    sysEffect: -10
  },
  remifentanil: {
    name: 'Remifentanil',
    class: 'Opioid',
    dosingWeight: 'IBW',
    standardDoseRange: [0.5, 1.0], // mcg/kg (bolus/loading)
    onsetSeconds: 60,
    durationMinutes: 5,
    hrEffect: -15,
    sysEffect: -15
  },
  sufentanil: {
    name: 'Sufentanil',
    class: 'Opioid',
    dosingWeight: 'LBW',
    standardDoseRange: [0.1, 0.5], // mcg/kg
    onsetSeconds: 180,
    durationMinutes: 45,
    hrEffect: -15,
    sysEffect: -10
  },
  morphine: {
    name: 'Morphine',
    class: 'Opioid',
    dosingWeight: 'TBW',
    standardDoseRange: [0.05, 0.2], // mg/kg
    onsetSeconds: 300,
    durationMinutes: 120,
    hrEffect: -5,
    sysEffect: -10
  },

  // ==========================================
  // 4. Neuromuscular Blocking Agents (Paralytics)
  // ==========================================
  succinylcholine: {
    name: 'Succinylcholine',
    class: 'Depolarizing Muscle Relaxant (DMR)',
    dosingWeight: 'TBW',
    standardDoseRange: [1.0, 1.5], // mg/kg
    onsetSeconds: 45,
    durationMinutes: 5,
    hrEffect: 5,
    sysEffect: 0
  },
  rocuronium: {
    name: 'Rocuronium',
    class: 'Non-Depolarizing Muscle Relaxant (NDMR)',
    dosingWeight: 'IBW',
    standardDoseRange: [0.6, 1.2], // mg/kg
    onsetSeconds: 60,
    durationMinutes: 45,
    hrEffect: 5,
    sysEffect: 0
  },
  vecuronium: {
    name: 'Vecuronium',
    class: 'Non-Depolarizing Muscle Relaxant (NDMR)',
    dosingWeight: 'IBW',
    standardDoseRange: [0.08, 0.1], // mg/kg
    onsetSeconds: 180,
    durationMinutes: 45,
    hrEffect: 0,
    sysEffect: 0
  },
  cisatracurium: {
    name: 'Cisatracurium',
    class: 'Non-Depolarizing Muscle Relaxant (NDMR)',
    dosingWeight: 'IBW',
    standardDoseRange: [0.1, 0.2], // mg/kg
    onsetSeconds: 180,
    durationMinutes: 45,
    hrEffect: 0,
    sysEffect: 0
  },

  // ==========================================
  // 5. Sedatives and Anxiolytics
  // ==========================================
  midazolam: {
    name: 'Midazolam',
    class: 'Benzodiazepine',
    dosingWeight: 'TBW',
    standardDoseRange: [0.02, 0.04], // mg/kg
    onsetSeconds: 120,
    durationMinutes: 30,
    hrEffect: 0,
    sysEffect: -5
  },
  dexmedetomidine: {
    name: 'Dexmedetomidine',
    class: 'Alpha-2 Agonist',
    dosingWeight: 'TBW',
    standardDoseRange: [0.5, 1.0], // mcg/kg
    onsetSeconds: 300,
    durationMinutes: 60,
    hrEffect: -15,
    sysEffect: -15
  },
  lorazepam: {
    name: 'Lorazepam',
    class: 'Benzodiazepine',
    dosingWeight: 'TBW',
    standardDoseRange: [0.02, 0.04], // mg/kg
    onsetSeconds: 300,
    durationMinutes: 240,
    hrEffect: 0,
    sysEffect: -5
  },
  diazepam: {
    name: 'Diazepam',
    class: 'Benzodiazepine',
    dosingWeight: 'TBW',
    standardDoseRange: [0.05, 0.1], // mg/kg
    onsetSeconds: 120,
    durationMinutes: 120,
    hrEffect: 0,
    sysEffect: -5
  },

  // ==========================================
  // 6. Local and Regional Anesthetics
  // ==========================================
  lidocaine: {
    name: 'Lidocaine',
    class: 'Local Anesthetic',
    dosingWeight: 'TBW',
    standardDoseRange: [1.0, 1.5], // mg/kg (Systemic dose)
    onsetSeconds: 60,
    durationMinutes: 60,
    hrEffect: 0,
    sysEffect: 0
  },
  bupivacaine: {
    name: 'Bupivacaine',
    class: 'Local Anesthetic',
    dosingWeight: 'TBW',
    standardDoseRange: [1.0, 2.0], // mg/kg max
    onsetSeconds: 300,
    durationMinutes: 240,
    hrEffect: 0,
    sysEffect: 0
  },
  ropivacaine: {
    name: 'Ropivacaine',
    class: 'Local Anesthetic',
    dosingWeight: 'TBW',
    standardDoseRange: [2.0, 3.0], // mg/kg max
    onsetSeconds: 300,
    durationMinutes: 240,
    hrEffect: 0,
    sysEffect: 0
  },

  // ==========================================
  // 7. Adjuncts and Reversal Agents
  // ==========================================
  ondansetron: {
    name: 'Ondansetron',
    class: 'Antiemetic',
    dosingWeight: 'TBW',
    standardDoseRange: [4.0, 8.0], // mg
    onsetSeconds: 180,
    durationMinutes: 240,
    hrEffect: 0,
    sysEffect: 0
  },
  dexamethasone: {
    name: 'Dexamethasone',
    class: 'Corticosteroid',
    dosingWeight: 'TBW',
    standardDoseRange: [4.0, 8.0], // mg
    onsetSeconds: 600,
    durationMinutes: 1440,
    hrEffect: 0,
    sysEffect: 0
  },
  sugammadex: {
    name: 'Sugammadex',
    class: 'Reversal Agent',
    dosingWeight: 'TBW',
    standardDoseRange: [2.0, 4.0], // mg/kg
    onsetSeconds: 60,
    durationMinutes: 120,
    hrEffect: 0,
    sysEffect: 0
  },
  neostigmine: {
    name: 'Neostigmine',
    class: 'Acetylcholinesterase Inhibitor / Reversal',
    dosingWeight: 'TBW',
    standardDoseRange: [0.03, 0.05], // mg/kg
    onsetSeconds: 180,
    durationMinutes: 60,
    hrEffect: -20,
    sysEffect: 0
  },
  glycopyrrolate: {
    name: 'Glycopyrrolate',
    class: 'Anticholinergic',
    dosingWeight: 'TBW',
    standardDoseRange: [0.01, 0.02], // mg/kg
    onsetSeconds: 60,
    durationMinutes: 120,
    hrEffect: 20,
    sysEffect: 0
  },

  // ==========================================
  // 8. Vasoactive / Cardiovascular Agents
  // ==========================================
  epinephrine: {
    name: 'Epinephrine',
    class: 'Inotrope/Vasopressor',
    dosingWeight: 'TBW',
    standardDoseRange: [10, 100], // mcg (bolus)
    onsetSeconds: 30,
    durationMinutes: 5,
    hrEffect: 30,
    sysEffect: 40
  },
  phenylephrine: {
    name: 'Phenylephrine',
    class: 'Vasopressor',
    dosingWeight: 'TBW',
    standardDoseRange: [50, 100], // mcg (bolus)
    onsetSeconds: 30,
    durationMinutes: 5,
    hrEffect: -15,
    sysEffect: 30
  },
  esmolol: {
    name: 'Esmolol',
    class: 'Beta Blocker',
    dosingWeight: 'TBW',
    standardDoseRange: [0.5, 1.0], // mg/kg
    onsetSeconds: 60,
    durationMinutes: 10,
    hrEffect: -20,
    sysEffect: -15
  },

  // ==========================================
  // 9. Primary Cardiac Arrest Medications
  // ==========================================
  // Note: Epinephrine and Lidocaine are defined in other categories but are also used here.
  amiodarone: {
    name: 'Amiodarone',
    class: 'Antiarrhythmic',
    dosingWeight: 'TBW',
    standardDoseRange: [150, 300], // mg (bolus)
    onsetSeconds: 120,
    durationMinutes: 60,
    hrEffect: -10,
    sysEffect: -15
  },

  // ==========================================
  // 10. Medications for Tachycardia
  // ==========================================
  adenosine: {
    name: 'Adenosine',
    class: 'Antiarrhythmic',
    dosingWeight: 'TBW',
    standardDoseRange: [6, 12], // mg (rapid push)
    onsetSeconds: 10,
    durationMinutes: 1,
    hrEffect: -40, // Can cause brief asystole
    sysEffect: -20
  },
  procainamide: {
    name: 'Procainamide',
    class: 'Antiarrhythmic',
    dosingWeight: 'TBW',
    standardDoseRange: [20, 50], // mg/min (infusion)
    onsetSeconds: 300,
    durationMinutes: 180,
    hrEffect: -15,
    sysEffect: -20
  },
  metoprolol: {
    name: 'Metoprolol',
    class: 'Beta Blocker',
    dosingWeight: 'TBW',
    standardDoseRange: [2.5, 5], // mg (IV push)
    onsetSeconds: 300,
    durationMinutes: 240,
    hrEffect: -25,
    sysEffect: -15
  },
  diltiazem: {
    name: 'Diltiazem',
    class: 'Calcium Channel Blocker',
    dosingWeight: 'TBW',
    standardDoseRange: [15, 20], // mg (IV bolus)
    onsetSeconds: 180,
    durationMinutes: 60,
    hrEffect: -20,
    sysEffect: -15
  },

  // ==========================================
  // 11. Medications for Bradycardia
  // ==========================================
  atropine: {
    name: 'Atropine',
    class: 'Anticholinergic',
    dosingWeight: 'TBW',
    standardDoseRange: [0.5, 1.0], // mg (bolus)
    onsetSeconds: 60,
    durationMinutes: 60,
    hrEffect: 30, // Primary use is to increase HR
    sysEffect: 0
  },
  dopamine: {
    name: 'Dopamine',
    class: 'Inotrope/Vasopressor',
    dosingWeight: 'TBW',
    standardDoseRange: [5, 20], // mcg/kg/min (infusion)
    onsetSeconds: 120,
    durationMinutes: 10,
    hrEffect: 20,
    sysEffect: 30
  },

  // ==========================================
  // 12. Special Resuscitation & Reversal Agents
  // ==========================================
  magnesiumSulfate: {
    name: 'Magnesium Sulfate',
    class: 'Electrolyte',
    dosingWeight: 'TBW',
    standardDoseRange: [1000, 2000], // mg
    onsetSeconds: 180,
    durationMinutes: 30,
    hrEffect: -5,
    sysEffect: -10
  },
  sodiumBicarbonate: {
    name: 'Sodium Bicarbonate',
    class: 'Alkalinizing Agent',
    dosingWeight: 'TBW',
    standardDoseRange: [50, 100], // mEq
    onsetSeconds: 60,
    durationMinutes: 60,
    hrEffect: 0,
    sysEffect: 0
  },
  nitroglycerin: {
    name: 'Nitroglycerin',
    class: 'Vasodilator',
    dosingWeight: 'TBW',
    standardDoseRange: [0.4, 0.8], // mg (sublingual) or mcg/min (infusion)
    onsetSeconds: 60,
    durationMinutes: 5,
    hrEffect: 10, // Reflex tachycardia possible
    sysEffect: -30
  },
  naloxone: {
    name: 'Naloxone',
    class: 'Opioid Antagonist',
    dosingWeight: 'TBW',
    standardDoseRange: [0.4, 2.0], // mg
    onsetSeconds: 60,
    durationMinutes: 45,
    hrEffect: 10, // Can cause tachycardia due to abrupt opioid reversal
    sysEffect: 15
  }
};
