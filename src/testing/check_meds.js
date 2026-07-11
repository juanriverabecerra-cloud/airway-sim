import { MEDICATIONS } from '../engine/Pharmacology.js';
// We copy the GROUPS definition from Pharmacopoeia.jsx to check
const GROUPS = {
  induction: {
    'Sedatives & Hypnotics': ['etomidate', 'methohexital', 'propofol', 'thiopental'],
    'Alpha-2 Agonists': ['dexmedetomidine'],
    'Dissociatives': ['esketamine', 'ketamine'],
    'Benzodiazepines': ['midazolam'],
    'Orexin Receptor Antagonists': ['suvorexant']
  },
  analgesia: {
    'Opioids (Intravenous)': ['alfentanil', 'fentanyl', 'hydromorphone', 'meperidine', 'morphine', 'remifentanil', 'sufentanil'],
    'Opioids (Oral/Supplemental)': ['codeine', 'oxycodone', 'tramadol'],
    'Local Anesthetics (Amides)': ['bupivacaine', 'levobupivacaine', 'mepivacaine', 'mexiletine', 'prilocaine', 'ropivacaine'],
    'Local Anesthetics (Esters)': ['benzocaine', 'chloroprocaine', 'prilocaine_met', 'tetracaine'],
    'Non-Opioid Analgesics': ['acetaminophen', 'ketorolac'],
    'Gabapentinoids': ['gabapentin', 'pregabalin']
  },
  paralytics: {
    'Depolarizing NMBAs': ['succinylcholine'],
    'Nondepolarizing NMBAs': ['cisatracurium', 'mivacurium', 'pancuronium', 'rocuronium', 'vecuronium'],
    'Cholinesterase Inhibitors': ['edrophonium', 'neostigmine', 'pyridostigmine'],
    'Specific Reversal Agents': ['atipamezole', 'flumazenil', 'sugammadex']
  },
  hemodynamics: {
    'Vasopressors': ['epinephrine', 'norepinephrine', 'phenylephrine', 'vasopressin'],
    'Inotropes': ['dobutamine', 'dopamine', 'milrinone'],
    'Beta-Blockers': ['esmolol', 'labetalol', 'metoprolol'],
    'Calcium Channel Blockers': ['clevidipine', 'nicardipine'],
    'Vasodilators': ['nitroglycerin', 'nitroprusside', 'phentolamine']
  },
  adjuncts: {
    'Electrolytes & Buffers': ['calciumChloride', 'calciumGluconate', 'magnesiumSulfate', 'potassiumChloride', 'sodiumBicarbonate'],
    'Diuretics': ['acetazolamide', 'bumetanide', 'furosemide'],
    'Corticosteroids': ['dexamethasone', 'hydrocortisone'],
    'Emergency Rescue & Antidotes': ['dantrolene', 'intralipid', 'methyleneBlue'],
    'Gastric Prophylaxis & Antacids': ['famotidine', 'pantoprazole', 'sodiumCitrate'],
    'Antiemetics & Neuroleptics': ['aprepitant', 'droperidol', 'fosaprepitant', 'granisetron', 'haloperidol', 'metoclopramide', 'ondansetron', 'palonosetron', 'promethazine'],
    'Uterotonics': ['carboprost', 'methylergonovine', 'misoprostol', 'oxytocin'],
    'Other Specialty Adjuncts': ['albuterol', 'bromocriptine', 'diphenhydramine', 'glucagon', 'ipratropium', 'methylphenidate', 'octreotide', 'regularInsulin']
  },
  antibiotics: {
    'Cephalosporins': ['cefazolin', 'ceftriaxone'],
    'Penicillins & Combinations': ['piperacillin_tazobactam', 'unasyn'],
    'Carbapenems': ['meropenem'],
    'Glycopeptides': ['vancomycin'],
    'Aminoglycosides': ['gentamicin'],
    'Fluoroquinolones': ['ciprofloxacin'],
    'Nitroimidazoles': ['metronidazole']
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
  if (!allGroupedMeds.has(id)) {
    missing.push(id);
  }
});

console.log('--- MEDICATIONS DEFINED BUT NOT Grouped inside Pharmacopoeia.jsx ---');
console.log(missing);
