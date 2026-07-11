import { MEDICATIONS } from '../engine/Pharmacology.js';

const GROUPS = {
  induction: {
    'Sedatives & Hypnotics': [
      'etomidate',
      'methohexital',
      'propofol',
      'thiopental'
    ],
    'Alpha-2 Agonists': [
      'dexmedetomidine'
    ],
    'Dissociatives': [
      'esketamine',
      'ketamine'
    ],
    'Benzodiazepines': [
      'midazolam'
    ],
    'Orexin Receptor Antagonists': [
      'suvorexant'
    ]
  },
  analgesia: {
    'Opioids (Intravenous)': [
      'alfentanil',
      'fentanyl',
      'hydromorphone',
      'meperidine',
      'morphine',
      'remifentanil',
      'sufentanil'
    ],
    'Opioids (Oral/Supplemental)': [
      'codeine',
      'oxycodone',
      'tramadol'
    ],
    'Local Anesthetics (Amides)': [
      'bupivacaine',
      'levobupivacaine',
      'lidocaine',
      'mepivacaine',
      'mexiletine',
      'prilocaine',
      'ropivacaine'
    ],
    'Local Anesthetics (Esters)': [
      'benzocaine',
      'chloroprocaine',
      'cocaine',
      'prilocaine_met',
      'tetracaine'
    ],
    'Non-Opioid Analgesics': [
      'acetaminophen',
      'ketorolac'
    ],
    'Anticonvulsants & Adjuvants': [
      'carbamazepine',
      'gabapentin',
      'lamotrigine',
      'levetiracetam',
      'oxcarbazepine',
      'pregabalin',
      'topiramate',
      'ziconotide',
      'zonisamide'
    ]
  },
  paralytics: {
    'Depolarizing NMBAs': [
      'succinylcholine'
    ],
    'Nondepolarizing NMBAs': [
      'atracurium',
      'cisatracurium',
      'cw002',
      'gantacurium',
      'mivacurium',
      'pancuronium',
      'rocuronium',
      'vecuronium'
    ],
    'Anticholinergics': [
      'atropine',
      'glycopyrrolate',
      'scopolamine'
    ],
    'Cholinesterase Inhibitors': [
      'edrophonium',
      'neostigmine',
      'physostigmine',
      'pyridostigmine'
    ],
    'Specific Reversal Agents': [
      'atipamezole',
      'flumazenil',
      'l_cysteine',
      'sugammadex'
    ]
  },
  hemodynamics: {
    'Vasopressors': [
      'ephedrine',
      'epinephrine',
      'norepinephrine',
      'phenylephrine',
      'vasopressin'
    ],
    'Inotropes': [
      'dobutamine',
      'dopamine',
      'isoproterenol',
      'milrinone'
    ],
    'Beta-Blockers': [
      'esmolol',
      'labetalol',
      'metoprolol'
    ],
    'Calcium Channel Blockers': [
      'clevidipine',
      'nicardipine'
    ],
    'Vasodilators': [
      'clonidine',
      'enalaprilat',
      'hydralazine',
      'nitroglycerin',
      'nitroprusside',
      'papaverine',
      'phentolamine'
    ],
    'Antiarrhythmics': [
      'adenosine',
      'amiodarone',
      'digoxin',
      'diltiazem',
      'ibutilide'
    ]
  },
  adjuncts: {
    'Electrolytes & Buffers': [
      'albumin',
      'bicarbonate',
      'calcium',
      'calciumChloride',
      'calciumGluconate',
      'dextrose',
      'hypertonicSaline3',
      'magnesium',
      'magnesiumSulfate',
      'potassium',
      'potassiumChloride',
      'sodiumBicarbonate'
    ],
    'Diuretics': [
      'acetazolamide',
      'bumetanide',
      'furosemide',
      'mannitol'
    ],
    'Corticosteroids': [
      'dexamethasone',
      'hydrocortisone'
    ],
    'Emergency Rescue & Antidotes': [
      'dantrolene',
      'intralipid',
      'methyleneBlue',
      'naloxone'
    ],
    'Anticoagulation & Hemostasis': [
      'andexanet',
      'desmopressin',
      'factorIXconcentrate',
      'factorVIIIconcentrate',
      'heparin',
      'idarucizumab',
      'pcc',
      'protamine',
      'rfviia',
      'tranexamicAcid'
    ],
    'Gastric Prophylaxis & Antacids': [
      'famotidine',
      'pantoprazole',
      'sodiumCitrate'
    ],
    'Antiemetics & Neuroleptics': [
      'aprepitant',
      'droperidol',
      'fosaprepitant',
      'granisetron',
      'haloperidol',
      'metoclopramide',
      'ondansetron',
      'palonosetron',
      'promethazine'
    ],
    'Uterotonics': [
      'carboprost',
      'methylergonovine',
      'misoprostol',
      'oxytocin'
    ],
    'Other Specialty Adjuncts': [
      'albuterol',
      'bromocriptine',
      'diphenhydramine',
      'glucagon',
      'ipratropium',
      'methylphenidate',
      'octreotide',
      'regularInsulin'
    ]
  },
  antibiotics: {
    'Cephalosporins': [
      'cefazolin',
      'ceftriaxone'
    ],
    'Penicillins & Combinations': [
      'piperacillin_tazobactam',
      'unasyn'
    ],
    'Carbapenems': [
      'meropenem'
    ],
    'Glycopeptides': [
      'vancomycin'
    ],
    'Aminoglycosides': [
      'gentamicin'
    ],
    'Fluoroquinolones': [
      'ciprofloxacin'
    ],
    'Nitroimidazoles': [
      'metronidazole'
    ]
  }
};

const allGroupedMeds = new Set();
Object.values(GROUPS).forEach(tab => {
  Object.values(tab).forEach(list => {
    list.forEach(id => allGroupedMeds.add(id));
  });
});

const missing = [];
Object.keys(MEDICATIONS).forEach(id => {
  // Ignore F3 and F6 volatile agents as they are Vaporizer-only gases
  if (id === 'f3' || id === 'f6') return;
  
  if (!allGroupedMeds.has(id)) {
    missing.push(id);
  }
});

console.log('--- MISSING MEDS V2 ---');
console.log(missing);
