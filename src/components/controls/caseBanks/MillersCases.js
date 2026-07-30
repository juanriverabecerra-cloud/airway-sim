// Verified case bank: cases genuinely traceable to a documented Miller's Anesthesia
// chapter-integration session (see docs/chapters/*.md), plus the original foundational
// one-case-per-specialty representative set this app started with.
//
// Split out from a larger 37-case bank (2026-07) after auditing every case for an actual
// citation: NONE of the 37 carry an inline page citation the way JaffeCases.js entries do
// (compare "Jaffe AMSP 6th Ed., Ch7 p.306-308" there vs. nothing here). Of the 37, only
// mh_susceptible and myasthenia_gravis have a real paper trail -- their distinctive
// physiology (Dantrolene PK/PD, the MH crisis loop, the MG ventilation risk scorecard) is
// documented as built during the Ch35 integration session in docs/chapters/ch35.md. The
// other 12 here (general/trauma/neuro/cardiac/thoracic/bariatric/obgyn/ortho/vascular/
// ent/urology/transplant) are the original seed set: one classic representative case per
// surgical specialty, mirroring how Miller's Anesthesia itself is organized by specialty,
// but not tied to a specific chapter/page the way a real citation would be.
//
// Everything else that isn't Jaffe-sourced -- pharmacogenomics, toxicology, hematology,
// and single-teaching-point crisis vignettes (WPW+AF, MAOI interaction, carcinoid crisis,
// etc.) -- moved to caseBanks/GeneralKnowledgeCases.js: real, working physiology (every
// flag these cases set is consumed by a live engine -- verified, not decorative), but
// built from general clinical/board-exam-style knowledge, not a specific textbook citation.
//
// See docs/case_integration_prompt.md for how new banks get added.

export const MILLERS_CASE_PRESETS = [
  {
    id: 'general',
    name: 'General - Laparoscopic Appendectomy',
    specialty: 'General Surgery',
    description: 'Elective appendectomy for acute appendicitis in a healthy adult.',
    age: 38, sex: 'male', height: 175, weight: 80,
    hr: 72, sys: 120, dia: 80, spo2: 99, rr: 12, temp: 37.2,
    mallampati: 1, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Laparoscopic Appendectomy',
    ebl: 'Low', duration: 45, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 100,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    emergentRSI: false
  },
  {
    id: 'trauma',
    name: 'Trauma - Penetrating Polytrauma',
    specialty: 'Trauma',
    description: 'Emergent exploratory laparotomy for gunshot wound. Severe hemorrhage.',
    age: 25, sex: 'male', height: 180, weight: 85,
    hr: 125, sys: 82, dia: 45, spo2: 93, rr: 24, temp: 35.8,
    mallampati: 2, neckMobility: 'normal', airwayBlood: true,
    obese: false, septic: false, trauma: true, copd: false, chf: false,
    position: 'Supine', procedure: 'Exploratory Laparotomy',
    ebl: 'High', duration: 120, penicillinAllergy: false,
    npoSolids: 1, npoLiquids: 1, ef: 65, gfr: 90,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    emergentRSI: true
  },
  {
    id: 'neuro',
    name: 'Neurosurgery - Awake Craniotomy',
    specialty: 'Neurosurgery',
    description: 'Elective craniotomy for tumor resection. Elevated baseline intracranial pressure.',
    age: 52, sex: 'female', height: 165, weight: 62,
    hr: 68, sys: 135, dia: 82, spo2: 98, rr: 14, temp: 36.6,
    mallampati: 2, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Craniotomy (Awake)',
    ebl: 'Moderate', duration: 240, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 95,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false
  },
  {
    id: 'cardiac',
    name: 'Cardiac - CABG & Valve Replacement',
    specialty: 'Cardiac',
    description: 'Severe CAD, severe Aortic Stenosis (gradient 45mmHg), Atrial Fibrillation. High risk induction!',
    age: 69, sex: 'male', height: 172, weight: 88,
    hr: 82, sys: 110, dia: 65, spo2: 96, rr: 16, temp: 36.8,
    mallampati: 3, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: true,
    position: 'Supine', procedure: 'CABG & Aortic Valve Replacement',
    ebl: 'High', duration: 300, penicillinAllergy: true,
    npoSolids: 8, npoLiquids: 4, ef: 35, gfr: 52,
    betaBlocker: true, cad: true, afib: true, as: true, mg: false,
    burns: false, immobility: false, cp: 'none', htn: true
  },
  {
    id: 'thoracic',
    name: 'Thoracic - Lobectomy (OLV)',
    specialty: 'Thoracic',
    description: 'Video-Assisted Thoracoscopic Surgery (VATS) lobectomy requiring One-Lung Ventilation (OLV). Severe COPD.',
    age: 64, sex: 'female', height: 160, weight: 58,
    hr: 88, sys: 130, dia: 78, spo2: 92, rr: 18, temp: 37.0,
    mallampati: 2, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: true, chf: false,
    position: 'Lateral', procedure: 'VATS Lobectomy (OLV)',
    ebl: 'Moderate', duration: 180, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 55, gfr: 80,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false
  },
  {
    id: 'bariatric',
    name: 'Bariatric - Gastric Sleeve Bypass',
    specialty: 'Bariatric',
    description: 'Morbid obesity (BMI 51.4), severe OSA, active GERD / aspiration risk.',
    age: 39, sex: 'female', height: 165, weight: 140,
    hr: 80, sys: 138, dia: 84, spo2: 95, rr: 16, temp: 37.2,
    mallampati: 3, neckMobility: 'normal', airwayBlood: false,
    obese: true, septic: false, trauma: false, copd: false, chf: false,
    position: 'Ramped', procedure: 'Laparoscopic Gastric Sleeve',
    ebl: 'Low', duration: 90, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 110,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: true, as: false,
    diabetes: true, insulin: true
  },
  {
    id: 'obgyn',
    name: 'OB/GYN - Emergent C-Section (PPH)',
    specialty: 'OB/GYN',
    description: 'Emergent Cesarean for fetal distress followed by severe postpartum hemorrhage.',
    age: 29, sex: 'female', height: 162, weight: 95,
    hr: 115, sys: 95, dia: 55, spo2: 98, rr: 18, temp: 37.4,
    mallampati: 2, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Emergent Cesarean Section',
    ebl: 'High', duration: 75, penicillinAllergy: false,
    npoSolids: 2, npoLiquids: 2, ef: 65, gfr: 120,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    emergentRSI: true,
    // Phase 4 §4.27/§4.28: activates PregnancyPhysiologyEngine.ts (Stage A) and
    // UterineToneModel.ts (Stage C) -- this case starts at the PPH crisis the title/
    // description name (deliveryOccurred: true), not the earlier fetal-distress phase, since
    // no case-progression/"deliver" workflow action exists yet to transition between them.
    isPregnant: true, gestationalAgeWeeks: 39, deliveryOccurred: true
  },
  {
    id: 'ortho',
    name: 'Orthopedic - Spine Fusion',
    specialty: 'Orthopedic',
    description: 'Multilevel spinal fusion in prone position. Advanced age, osteoarthritis.',
    age: 76, sex: 'female', height: 158, weight: 65,
    hr: 65, sys: 125, dia: 75, spo2: 97, rr: 12, temp: 36.4,
    mallampati: 2, neckMobility: 'reduced', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Prone', procedure: 'Posterior Lumbar Spinal Fusion',
    ebl: 'Moderate', duration: 240, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 68,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false
  },
  {
    id: 'vascular',
    name: 'Vascular - Open AAA Repair',
    specialty: 'Vascular',
    description: 'Abdominal Aortic Aneurysm repair. High baseline SVR, chronic renal insufficiency.',
    age: 71, sex: 'male', height: 176, weight: 80,
    hr: 70, sys: 155, dia: 90, spo2: 95, rr: 14, temp: 36.5,
    mallampati: 3, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Open AAA Repair',
    ebl: 'High', duration: 180, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 50, gfr: 38,
    betaBlocker: true, cad: true, afib: false, as: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: true
  },
  {
    id: 'ent',
    name: 'ENT/Airway - Awake Tracheostomy',
    specialty: 'ENT/Airway',
    description: 'Subglottic stenosis. Severe compromised airway, Mallampati IV, rigid neck.',
    age: 48, sex: 'male', height: 172, weight: 75,
    hr: 95, sys: 142, dia: 88, spo2: 90, rr: 20, temp: 37.1,
    mallampati: 4, neckMobility: 'reduced', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Sitting', procedure: 'Awake Tracheostomy',
    ebl: 'Low', duration: 60, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 90,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false
  },
  {
    id: 'urology',
    name: 'Urology - Radical Nephrectomy',
    specialty: 'Urology',
    description: 'Renal cell carcinoma resection in lateral position. Dialysis-dependent CKD.',
    age: 62, sex: 'male', height: 170, weight: 78,
    hr: 75, sys: 130, dia: 82, spo2: 98, rr: 12, temp: 36.8,
    mallampati: 2, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Lateral', procedure: 'Radical Nephrectomy',
    ebl: 'Moderate', duration: 150, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 55, gfr: 12,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: true, as: false
  },
  {
    id: 'transplant',
    name: 'Transplant - Liver Transplant',
    specialty: 'Transplant',
    description: 'ESLD (MELD 28), Child-Pugh C liver cirrhosis, baseline anemia, severe coagulopathy.',
    age: 58, sex: 'male', height: 173, weight: 70,
    hr: 90, sys: 105, dia: 55, spo2: 94, rr: 16, temp: 36.0,
    mallampati: 3, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Orthotopic Liver Transplant',
    ebl: 'High', duration: 360, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 72,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'C', htn: false, as: false,
    cirrhosis: true, childPugh: 'C',
    anemia: true, coagulopathy: true, thrombocytopenia: true
  },
  {
    id: 'mh_susceptible',
    name: 'Neuromuscular - Malignant Hyperthermia Susceptible',
    specialty: 'General Surgery',
    description: 'Laparoscopic hernia repair in a patient with a family history of Malignant Hyperthermia. Volatiles/Succinylcholine triggered.',
    age: 32, sex: 'male', height: 180, weight: 85,
    hr: 72, sys: 120, dia: 80, spo2: 99, rr: 12, temp: 37.0,
    mallampati: 1, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Laparoscopic Inguinal Hernia Repair',
    ebl: 'Low', duration: 60, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 65, gfr: 100,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    mhSusceptible: true
  },
  {
    id: 'myasthenia_gravis',
    name: 'Neuromuscular - Myasthenia Gravis',
    specialty: 'Thoracic',
    description: 'Transsternal thymectomy for a patient with severe generalized Myasthenia Gravis. High NDMR sensitivity, postoperative ventilation risk.',
    age: 44, sex: 'female', height: 165, weight: 60,
    hr: 80, sys: 115, dia: 70, spo2: 97, rr: 14, temp: 36.8,
    mallampati: 2, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Transsternal Thymectomy',
    ebl: 'High', duration: 120, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 90,
    betaBlocker: false, cad: false, afib: false, mg: true,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    mgDurationYears: 8, pyridostigmineDoseMgPerDay: 480, bulbarSymptoms: true, historyMyasthenicCrisis: false, antiAchR: 120, decrementalResponse: true, vitalCapacity: 2.5
  }
];

export const MILLERS_CASE_METADATA = {
  general: {
    category: 'Airway & Ventilation',
    difficulty: 'Easy',
    duration: 45,
    teachingObjective: 'Basic induction, airway maintenance, and laparoscopy exposure.',
    challenges: ['Trendelenburg ventilation changes', 'Basic pharmacology titration']
  },
  trauma: {
    category: 'Obstetrics & Specialty',
    difficulty: 'Hard',
    duration: 120,
    teachingObjective: 'Resuscitation of massive hemorrhagic shock and emergent RSI.',
    challenges: ['Severe hemorrhagic shock', 'Airway contamination / blood', 'Emergent RSI protocol']
  },
  neuro: {
    category: 'Neuromuscular & Neuro',
    difficulty: 'Hard',
    duration: 240,
    teachingObjective: 'Managing intracranial pressure (ICP) and hemodynamics in craniotomy.',
    challenges: ['Elevated intracranial pressure', 'Hemodynamic tight control', 'Awake craniotomy management']
  },
  cardiac: {
    category: 'Cardiovascular & Hemodynamics',
    difficulty: 'Hard',
    duration: 300,
    teachingObjective: 'Fixed stroke volume dynamics in severe aortic stenosis and CAD.',
    challenges: ['Severe Aortic Stenosis (fixed stroke volume)', 'Low Ejection Fraction (35%)', 'Atrial Fibrillation rhythm control']
  },
  thoracic: {
    category: 'Airway & Ventilation',
    difficulty: 'Medium',
    duration: 180,
    teachingObjective: 'Initiating One-Lung Ventilation (OLV) and managing hypoxic pulmonary vasoconstriction.',
    challenges: ['One-Lung Ventilation', 'Severe COPD physiology', 'Lateral positioning ventilation shifts']
  },
  bariatric: {
    category: 'Airway & Ventilation',
    difficulty: 'Medium',
    duration: 90,
    teachingObjective: 'Morbid obesity induction, OSA airway safety, and rapid sequence intubation (RSI) for GERD.',
    challenges: ['Morbid obesity (BMI 51)', 'Aspiration risk (GERD)', 'Ramped positioning requirements']
  },
  obgyn: {
    category: 'Obstetrics & Specialty',
    difficulty: 'Hard',
    duration: 75,
    teachingObjective: 'Pregnancy-associated respiratory changes and massive postpartum hemorrhage.',
    challenges: ['Postpartum Hemorrhage (PPH) crisis', 'Pregnancy hypercoagulability/engorgement', 'Emergent RSI requirements']
  },
  ortho: {
    category: 'Airway & Ventilation',
    difficulty: 'Easy',
    duration: 240,
    teachingObjective: 'Prone position ventilation dynamics and geriatric physiology.',
    challenges: ['Prone position complications', 'Reduced cervical range of motion', 'Geriatric organ reserve']
  },
  vascular: {
    category: 'Cardiovascular & Hemodynamics',
    difficulty: 'Hard',
    duration: 180,
    teachingObjective: 'High SVR control, renal protection, and aortic cross-clamp hemodynamics.',
    challenges: ['Aortic cross-clamp SVR surges', 'Chronic renal insufficiency', 'Severe hypertension']
  },
  ent: {
    category: 'Airway & Ventilation',
    difficulty: 'Hard',
    duration: 60,
    teachingObjective: 'Awake fiberoptic or surgical airway management in severe subglottic stenosis.',
    challenges: ['Mallampati IV / rigid neck', 'Severe subglottic stenosis airway compromise', 'Awake tracheostomy flow']
  },
  urology: {
    category: 'Obstetrics & Specialty',
    difficulty: 'Medium',
    duration: 150,
    teachingObjective: 'Renal clearance limitations in end-stage CKD and lateral position ventilation.',
    challenges: ['Dialysis-dependent CKD (GFR 12)', 'Lateral positioning compliance changes', 'Careful volume titration']
  },
  transplant: {
    category: 'Obstetrics & Specialty',
    difficulty: 'Hard',
    duration: 360,
    teachingObjective: 'Cirrhosis portal hypertension, severe coagulopathy, and transfusion management.',
    challenges: ['Child-Pugh C cirrhosis', 'Severe pre-existing coagulopathy', 'High volume blood loss / OLT']
  },
  mh_susceptible: {
    category: 'Neuromuscular & Neuro',
    difficulty: 'Hard',
    duration: 120,
    teachingObjective: 'Identifying Malignant Hyperthermia crisis triggers and administering Dantrolene.',
    challenges: ['Malignant Hyperthermia triggers', 'Rapid hyperthermia and acidemic spikes', 'Administering Dantrolene rescue']
  },
  myasthenia_gravis: {
    category: 'Neuromuscular & Neuro',
    difficulty: 'Medium',
    duration: 120,
    teachingObjective: 'Sensitivity to neuromuscular blockers and postoperative respiratory weakness.',
    challenges: ['Extreme NDMR sensitivity', 'Pre-existing chronic muscle weakness', 'Post-op respiratory failure risk']
  }
};
