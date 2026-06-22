import { useState, useEffect } from 'react';
import { Activity, Dices, FileText, ArrowLeft, Info, Settings, Heart, ShieldAlert } from 'lucide-react';
import { calculateIBW, calculateLungVolumes } from '../../engine/Pharmacology';

const PRESETS = [
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
    emergentRSI: true
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

export const CaseManager = ({ stagedCase: propStagedCase, setStagedCase: propSetStagedCase, openPreOpEMR, onStart, initialTab, onBack, autoWingIt }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'presets'); 
  const [selectedPresetId, setSelectedPresetId] = useState(PRESETS[0].id);
  const [localStagedCase, localSetStagedCase] = useState(null);
  const stagedCase = propStagedCase !== undefined ? propStagedCase : localStagedCase;
  const setStagedCase = propSetStagedCase !== undefined ? propSetStagedCase : localSetStagedCase;

  useEffect(() => {
    if (initialTab && initialTab !== 'splash' && initialTab !== 'wing-it') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (autoWingIt) {
      handleWingIt();
    }
  }, [autoWingIt]);

  // --- CUSTOM BUILDER STATE ---
  const [customForm, setCustomForm] = useState({
    name: 'Custom Physiological Scenario',
    age: 45, sex: 'male', weight: 80, height: 175,
    hr: 75, sys: 120, dia: 80, spo2: 99, rr: 14, temp: 37.0,
    mallampati: 1, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Elective Exploratory Laparoscopy',
    ebl: 'Low', duration: 90, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 100,
    betaBlocker: false, cad: false, afib: false, as: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false,
    anemia: false, thrombocytopenia: false, coagulopathy: false, diabetes: false, insulin: false,
    emergentRSI: false,
    isTASK1Knockout: false,
    isTASK3Knockout: false,
    isTREK1Knockout: false,
    isHCN1Knockout: false,
    butyrylcholinesteraseVariant: 'normal',
    mhSusceptible: false,
    dmd: false,
    bmd: false,
    cmt: false,
    elms: false,
    cip: false,
    mitochondrial: false,
    hyperPP: false,
    hypoPP: false,
    mgDurationYears: 0,
    pyridostigmineDoseMgPerDay: 0,
    bulbarSymptoms: false,
    historyMyasthenicCrisis: false,
    antiAchR: 0,
    decrementalResponse: false,
    vitalCapacity: 3.5
  });

  const [activePresetId, setActivePresetId] = useState('general');

  // Load preset details into the custom form for quick customization
  const applyPresetToForm = (preset) => {
    setCustomForm({ ...preset });
    setActivePresetId(preset.id);
  };

  // Helper values calculated in real time
  const [demographics, setDemographics] = useState({
    bmi: 0, ibw: 0, lbw: 0, ebv: 0, bsa: 0, lung: {}
  });

  useEffect(() => {
    const height = typeof customForm.height === 'number' && Number.isFinite(customForm.height) && customForm.height > 0 ? customForm.height : 170;
    const weight = typeof customForm.weight === 'number' && Number.isFinite(customForm.weight) && customForm.weight > 0 ? customForm.weight : 70;
    const sex = typeof customForm.sex === 'string' ? customForm.sex : 'male';
    const age = typeof customForm.age === 'number' && Number.isFinite(customForm.age) && customForm.age > 0 ? customForm.age : 40;
    const position = typeof customForm.position === 'string' ? customForm.position : 'Supine';

    const bmi = weight / Math.pow(height / 100, 2);
    const ibw = calculateIBW(height, sex);
    
    // lean body weight (Janmahasatian equation)
    let lbw;
    if (sex === 'male') {
      lbw = (9270 * weight) / (6680 + 216 * bmi);
    } else {
      lbw = (9270 * weight) / (8780 + 244 * bmi);
    }

    const ebv = sex === 'male' ? weight * 75 : weight * 65;
    const bsa = Math.sqrt((height * weight) / 3600);
    const lung = calculateLungVolumes(height, age, sex, bmi, position, customForm.copd || false, customForm.restrictive || false);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemographics({
      bmi: parseFloat(Number.isFinite(bmi) ? bmi.toFixed(1) : '24.5'),
      ibw: parseFloat(Number.isFinite(ibw) ? ibw.toFixed(1) : '65.0'),
      lbw: parseFloat(Number.isFinite(lbw) ? lbw.toFixed(1) : '55.0'),
      ebv: Math.round(Number.isFinite(ebv) ? ebv : 5000),
      bsa: parseFloat(Number.isFinite(bsa) ? bsa.toFixed(2) : '1.8'),
      lung: lung || {}
    });
  }, [customForm.height, customForm.weight, customForm.sex, customForm.age, customForm.position, customForm.copd, customForm.restrictive]);

  const calculateDifficulty = (data) => {
    if (!data) return { level: 'Medium', color: 'text-yellow-400', border: 'border-yellow-500' };
    let score = 0;

    // 1. Calculate Body Mass Index (BMI) and apply obesity difficulty weighting
    const height = typeof data.height === 'number' && Number.isFinite(data.height) && data.height > 0 ? data.height : 170;
    const weight = typeof data.weight === 'number' && Number.isFinite(data.weight) && data.weight > 0 ? data.weight : 70;
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi > 30) score += 1;   // Class I Obesity (moderately reduced FRC)
    if (bmi > 35) score += 2;   // Class II Obesity (significantly reduced FRC, mechanical airway compromise)
    if (bmi > 45) score += 2;   // Morbid Obesity (extremely rapid apnea desaturation, high aspiration risk)

    // 2. Age-related physiological reserve decay
    const age = typeof data.age === 'number' ? data.age : 40;
    if (age > 65) score += 1;
    if (age > 75) score += 1; // Elderly patients have reduced cardiac compliance and respiratory elasticity

    // 3. Baseline Vitals / Hemodynamic reserve
    const sys = typeof data.sys === 'number' ? data.sys : 120;
    const dia = typeof data.dia === 'number' ? data.dia : 80;
    const spo2 = typeof data.spo2 === 'number' ? data.spo2 : 99;
    if (sys < 100) {
      score += 3; // Profound hypotension/shock (extreme risk of vascular collapse on induction!)
    } else if (sys > 160 || dia > 100) {
      score += 1.5; // Severe baseline hypertension (hyperdynamic response, high risk of myocardial ischemia)
    }
    if (spo2 < 93) {
      score += 3; // Baseline hypoxemia (pre-depleted oxygen reserve, extremely short safe apnea time)
    }

    // 4. Airway Anatomy and Intubation difficulty (Cormack-Lehane Grade predictors)
    if (data.mallampati > 2) {
      score += (data.mallampati - 2) * 2.5; // Mallampati III = +2.5, Mallampati IV = +5.0 (highly predictive of poor glottic view)
    }
    if (data.neckMobility === 'reduced') score += 3; // Rigid neck / C-collar prevents sniffing position and atlanto-occipital extension
    if (data.airwayBlood) score += 5; // Active bleeding or thick vomit in airway (massive occlusion, visual loss)
    if (data.limitedMouth) score += 4; // Limited mouth opening (<3cm or Class III bite) severely restricts blade passage

    // 5. Systemic Comorbidities & Pathophysiologies
    if (data.septic) score += 5; // Severe sepsis/septic shock (profound vasoplegia, vasopressor dependency)
    if (data.trauma) score += 5; // Polytrauma / hemorrhagic shock (critically volume depleted, high risk of cardiac arrest)
    if (data.chf) {
      if (data.ef < 40) score += 4; // Severe HFrEF (unstable, high susceptibility to negative inotropes like Propofol)
      else if (data.ef < 50) score += 2; // Moderate heart failure
    }
    if (data.cad) score += 2; // Coronary Artery Disease (vulnerable to tachycardia/hypotension-induced myocardial infarction)
    if (data.as) score += 4; // Severe Aortic Stenosis (fixed stroke volume; sudden drop in SVR is catastrophic!)
    if (data.copd || data.asthma) score += 2; // Active pulmonary bronchospastic disease (severe FRC depletion, air trapping/auto-PEEP risk)
    if (data.gfr) {
      if (data.gfr < 30) score += 2.5; // Severe renal impairment / Stage 4/5 CKD (uremic coagulopathy, altered drug clearances)
      else if (data.gfr < 60) score += 1; // Moderate renal impairment
    }
    if (data.cp && data.cp !== 'none') {
      if (data.cp === 'C') score += 4; // Child-Pugh Class C (severe ESLD, profound baseline coagulopathy, hyperdynamic state)
      else if (data.cp === 'B') score += 2; // Child-Pugh Class B
      else score += 1; // Child-Pugh Class A
    }
    if (data.mg) score += 3; // Myasthenia Gravis (extreme sensitivity to non-depolarizing NMBAs, resistant to Succinylcholine)
    if (data.burns || data.immobility) score += 3; // Extrajunctional nAChR upregulation (Succinylcholine is CONTRAINDICATED; lethal hyperkalemic surge!)

    // 6. Surgical Procedure & Specialty-specific risk factors
    if (data.emergentRSI) score += 2; // Emergent crash airway / full stomach aspiration risk
    if (data.ebl === 'High') score += 2; // Expected massive blood loss (requires aggressive resuscitation and arterial monitoring)
    if (data.position === 'Prone' || data.position === 'Lateral') score += 1.5; // High-risk surgical positioning (difficult to rescue airway if lost)
    
    // Procedure-specific difficulty overlays
    const specialty = (data.specialty || '').toLowerCase();
    const id = (data.id || '').toLowerCase();
    if (specialty === 'transplant' || id === 'transplant') score += 5; // Multi-organ surgical trauma, severe baseline coagulopathy
    else if (specialty === 'cardiac' || id === 'cardiac') score += 4; // Bypass stress, cardiopulmonary instability
    else if (specialty === 'vascular' || id === 'vascular') score += 3; // Aortic cross-clamping, high hemodynamic volatility
    else if (specialty === 'thoracic' || id === 'thoracic') score += 3; // One-lung ventilation shunt fraction, airway sharing
    else if (specialty === 'neurosurgery' || id === 'neuro') score += 2.5; // Awake positioning, strictly controlled intracranial pressures
    else if (specialty === 'ob/gyn' || id === 'obgyn') score += 2.5; // Physiological changes of pregnancy, high uterine bleeding risk

    // 7. Functional Capacity (METs) Integration
    // ACC/AHA guidelines show that poor functional capacity (<4 METs) is a critical independent predictor of 
    // perioperative major adverse cardiovascular events (MACE).
    let mets = 'adequate';
    const hasCirrhosis = data.cirrhosis || (data.cp && data.cp !== 'none');
    if (
      data.trauma || 
      data.septic || 
      data.chf || 
      data.cad || 
      data.copd || 
      hasCirrhosis || 
      data.age > 75 || 
      ['cardiac', 'transplant', 'urology', 'vascular', 'bariatric', 'thoracic'].includes(id)
    ) {
      mets = 'poor';
    }

    if (mets === 'poor') {
      score += 5; // Major risk increment; will guarantee this is NEVER an Easy case (Easy threshold is <= 4)
    }

    // Return the difficulty level based on revamped scale
    if (score <= 4) return { level: 'Easy', color: 'text-green-400', border: 'border-green-500' };
    if (score <= 10) return { level: 'Medium', color: 'text-yellow-400', border: 'border-yellow-500' };
    return { level: 'Hard', color: 'text-red-500', border: 'border-red-600' };
  };

  const generateBriefing = (data, levelStr) => {
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    let pmhx = [];
    if (data.obese || bmi > 30) pmhx.push(bmi > 40 ? "Morbid Obesity" : "Obesity");
    if (data.copd) pmhx.push(data.pulmonaryComorbidity ? `COPD (${data.pulmonaryComorbidity.toUpperCase()})` : "COPD");
    if (data.asthma) pmhx.push("Severe Asthma");
    if (data.chf) pmhx.push(`Congestive Heart Failure (Ejection Fraction: ${data.ef}%)`);
    if (data.cad) pmhx.push("Coronary Artery Disease");
    if (data.as) pmhx.push("Severe Aortic Stenosis");
    if (data.afib) pmhx.push("Atrial Fibrillation");
    if (data.htn) pmhx.push("Hypertension");
    if (data.septic) pmhx.push("Severe Sepsis");
    if (data.trauma) pmhx.push("Major Polytrauma");
    if (data.gfr < 90) pmhx.push(`Chronic Kidney Disease (GFR ${data.gfr} mL/min, Stage ${data.gfr < 15 ? '5' : data.gfr < 30 ? '4' : '3'})`);
    if (data.cp !== 'none') pmhx.push(`Liver Cirrhosis (Child-Pugh Class ${data.cp})`);
    if (data.mg) pmhx.push("Myasthenia Gravis");
    if (data.burns) pmhx.push("Major Thermal Burns");
    if (data.immobility) pmhx.push("Immobility >72 hours (nAChR Up-regulation)");

    const pmhxStr = pmhx.length > 0 ? pmhx.join(', ') : "None (ASA I. Healthy patient)";

    let airway = `Mallampati Class ${['I', 'II', 'III', 'IV'][data.mallampati - 1]}. `;
    airway += data.neckMobility === 'reduced' ? "Severe neck mobility restriction. " : "Normal neck extension. ";
    if (data.airwayBlood) airway += "Active blood/secretions in the oropharynx. ";

    let rationale;
    if (levelStr === 'Easy') {
      rationale = "Healthy patient, excellent physiological reserve. Tolerates standard induction doses. Straightforward direct laryngoscopy anticipated.";
    } else if (levelStr === 'Medium') {
      rationale = "Compromised physiological reserve. Requires careful drug titration to prevent induction-related cardiovascular collapse. Be ready to optimize airway positioning.";
    } else {
      rationale = "CRITICAL HIGH RISK. Highly vulnerable to rapid cardiac arrest. ";
      if (data.trauma) rationale += "Active hemorrhage depletes preload. Induction will cause profound vascular vasoplegia. ";
      if (data.septic) rationale += "Sepsis vasoplegia limits vascular tone; high dependent on endogenous sympathetic drive. ";
      if (data.as) rationale += "Fixed stroke volume from Aortic Stenosis. Tachycardia or sudden drop in SVR will be catastrophic for coronary perfusion. ";
      if (data.penicillinAllergy) rationale += "Critical risk of anaphylactic shock if penicillin-like antibiotics are administered. ";
      if (data.burns || data.immobility) rationale += "Upregulated nicotinic ACh receptors. Succinylcholine will trigger lethal hyperkalemia! ";
      if (data.mg) rationale += "Myasthenia Gravis. Patient is highly sensitive to NDMRs (Vecuronium/Rocuronium) but resistant to Succinylcholine. ";
      if (bmi > 35) rationale += "Drastic decline in Functional Residual Capacity (FRC). Desaturations during apnea will occur within seconds. ";
    }

    return {
      hpi: `Patient is a ${data.age}yo ${data.sex === 'male' ? 'M' : 'F'} scheduled for ${data.procedure || 'surgery'} in the ${data.position} position. Expected blood loss: ${data.ebl}.`,
      pmhx: pmhxStr,
      airway: airway.trim(),
      vitals: `HR: ${data.hr} bpm | BP: ${data.sys}/${data.dia} mmHg | SpO2: ${data.spo2}% | RR: ${data.rr} | Temp: ${data.temp}°C`,
      rationale: rationale
    };
  };

  const handleStageCase = (data, nameOverride, levelOverride) => {
    const ibw = calculateIBW(data.height, data.sex);
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    const diff = calculateDifficulty(data);
    const finalLevel = levelOverride || diff.level;
    const briefing = generateBriefing(data, finalLevel);

    const isMale = data.sex.toLowerCase() === 'male';
    const finalEbv = Math.round(isMale ? data.weight * 75 : data.weight * 65);
    const finalEbl = data.trauma ? 800 : 0;

    const stagedRenal = data.gfr < 90 ? `stage ${data.gfr < 15 ? '5' : data.gfr < 30 ? '4' : '3'}` : null;

    const newCase = {
      id: data.id || 'case-' + Date.now(),
      name: nameOverride || data.name,
      difficulty: finalLevel,
      description: briefing.hpi,
      preOpBriefing: briefing,
      baseVitals: { hr: data.hr, sys: data.sys, dia: data.dia, spo2: data.spo2, etco2: 0, rr: data.rr, temp: data.temp },
      patient: { 
        age: data.age, sex: data.sex, weight: Math.round(data.weight), height: data.height, ibw: ibw, bmi: bmi,
        position: data.position || 'Supine',
        oxygenBuffer: null, targetBuffer: 21, 
        airwayBlood: data.airwayBlood, mallampati: data.mallampati, neckMobility: data.neckMobility,
        isObese: data.obese || bmi > 30, isSeptic: data.septic, trauma: data.trauma, 
        copd: data.copd || data.asthma, 
        pulmonaryComorbidity: data.pulmonaryComorbidity || (data.copd ? 'copd gold ii' : (data.asthma ? 'asthma' : null)),
        chf: data.chf, ef: data.ef || 60,
        cad: data.cad, afib: data.afib, as: data.as, htn: data.htn,
        onBetaBlocker: data.betaBlocker,
        penicillinAllergy: data.penicillinAllergy,
        renalComorbidity: stagedRenal,
        gfr: data.gfr || 100,
        cirrhosis: data.cirrhosis || (data.cp !== 'none'),
        childPugh: data.cp || 'none',
        nAChR_state: (data.burns || data.immobility) ? 'upregulated' : 'normal',
        ebv: finalEbv, ebl: finalEbl, 
        patientBaseSV: data.chf ? Math.round(70 * (data.ef / 60)) : 70, 
        patientBaseSVR: data.septic ? 600 : (data.htn ? 1450 : 1100),
        patientBaseRR: data.rr || 12,
        shuntFraction: (data?.procedure || '').includes('OLV') ? 0.25 : 0.05,
        npoSolids: data.npoSolids || 8,
        npoLiquids: data.npoLiquids || 4,
        allergies: data.penicillinAllergy ? 'Penicillin' : 'NKDA',
        pmhx: briefing.pmhx,
        procedure: data.procedure || 'surgery',
        emergentRSI: !!data.emergentRSI,
        anemia: !!data.anemia,
        thrombocytopenia: !!data.thrombocytopenia,
        coagulopathy: !!data.coagulopathy,
        diabetes: !!data.diabetes,
        insulin: !!data.insulin,
        isTASK1Knockout: !!data.isTASK1Knockout,
        isTASK3Knockout: !!data.isTASK3Knockout,
        isTREK1Knockout: !!data.isTREK1Knockout,
        isHCN1Knockout: !!data.isHCN1Knockout,
        butyrylcholinesteraseVariant: data.butyrylcholinesteraseVariant || 'normal',
        dibucaineNumber: data.butyrylcholinesteraseVariant === 'heterozygous' ? 50 : (data.butyrylcholinesteraseVariant === 'atypical' ? 20 : 80),
        mhSusceptible: !!data.mhSusceptible,
        mg: !!data.mg,
        dmd: !!data.dmd,
        bmd: !!data.bmd,
        cmt: !!data.cmt,
        elms: !!data.elms,
        cip: !!data.cip,
        mitochondrial: !!data.mitochondrial,
        hyperPP: !!data.hyperPP,
        hypoPP: !!data.hypoPP,
        mgDurationYears: data.mgDurationYears !== undefined ? data.mgDurationYears : (data.id === 'myasthenia_gravis' ? 8 : 0),
        pyridostigmineDoseMgPerDay: data.pyridostigmineDoseMgPerDay !== undefined ? data.pyridostigmineDoseMgPerDay : (data.id === 'myasthenia_gravis' ? 480 : 0),
        bulbarSymptoms: data.bulbarSymptoms !== undefined ? !!data.bulbarSymptoms : (data.id === 'myasthenia_gravis'),
        historyMyasthenicCrisis: data.historyMyasthenicCrisis !== undefined ? !!data.historyMyasthenicCrisis : false,
        antiAchR: data.antiAchR !== undefined ? data.antiAchR : (data.id === 'myasthenia_gravis' ? 120 : 0),
        decrementalResponse: data.decrementalResponse !== undefined ? !!data.decrementalResponse : (data.id === 'myasthenia_gravis'),
        vitalCapacity: data.vitalCapacity !== undefined ? data.vitalCapacity : (data.id === 'myasthenia_gravis' ? 2.5 : 3.5)
      }
    };
    setStagedCase(newCase);
  };

  const stageRandomByDifficulty = (level) => {
    const filtered = PRESETS.filter(p => {
      const diff = calculateDifficulty(p);
      return diff.level.toLowerCase() === level.toLowerCase();
    });
    if (filtered.length > 0) {
      const randPreset = filtered[Math.floor(Math.random() * filtered.length)];
      applyPresetToForm(randPreset);
      handleStageCase(randPreset, null, level);
    }
  };

  const handleWingIt = () => {
    const randPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    const ibw = calculateIBW(randPreset.height, randPreset.sex);
    const bmi = randPreset.weight / Math.pow(randPreset.height / 100, 2);
    const diff = calculateDifficulty(randPreset);
    const briefing = generateBriefing(randPreset, diff.level);

    const isMale = randPreset.sex.toLowerCase() === 'male';
    const finalEbv = Math.round(isMale ? randPreset.weight * 75 : randPreset.weight * 65);
    const finalEbl = randPreset.trauma ? 800 : 0;

    const stagedRenal = randPreset.gfr < 90 ? `stage ${randPreset.gfr < 15 ? '5' : randPreset.gfr < 30 ? '4' : '3'}` : null;

    const newCase = {
      id: randPreset.id || 'case-' + Date.now(),
      name: randPreset.name,
      difficulty: diff.level,
      description: briefing.hpi,
      preOpBriefing: briefing,
      baseVitals: { hr: randPreset.hr, sys: randPreset.sys, dia: randPreset.dia, spo2: randPreset.spo2, etco2: 0, rr: randPreset.rr, temp: randPreset.temp },
      patient: { 
        age: randPreset.age, sex: randPreset.sex, weight: Math.round(randPreset.weight), height: randPreset.height, ibw: ibw, bmi: bmi,
        position: randPreset.position || 'Supine',
        oxygenBuffer: null, targetBuffer: 21, 
        airwayBlood: randPreset.airwayBlood, mallampati: randPreset.mallampati, neckMobility: randPreset.neckMobility,
        isObese: randPreset.obese || bmi > 30, isSeptic: randPreset.septic, trauma: randPreset.trauma, 
        copd: randPreset.copd || randPreset.asthma, 
        pulmonaryComorbidity: randPreset.pulmonaryComorbidity || (randPreset.copd ? 'copd gold ii' : (randPreset.asthma ? 'asthma' : null)),
        chf: randPreset.chf, ef: randPreset.ef || 60,
        cad: randPreset.cad, afib: randPreset.afib, as: randPreset.as, htn: randPreset.htn,
        onBetaBlocker: randPreset.betaBlocker,
        penicillinAllergy: randPreset.penicillinAllergy,
        renalComorbidity: stagedRenal,
        gfr: randPreset.gfr || 100,
        cirrhosis: randPreset.cirrhosis || (randPreset.cp !== 'none'),
        childPugh: randPreset.cp || 'none',
        nAChR_state: (randPreset.burns || randPreset.immobility) ? 'upregulated' : 'normal',
        ebv: finalEbv, ebl: finalEbl, 
        patientBaseSV: randPreset.chf ? Math.round(70 * (randPreset.ef / 60)) : 70, 
        patientBaseSVR: randPreset.septic ? 600 : (randPreset.htn ? 1450 : 1100),
        patientBaseRR: randPreset.rr || 12,
        shuntFraction: (randPreset?.procedure || '').includes('OLV') ? 0.25 : 0.05,
        npoSolids: randPreset.npoSolids || 8,
        npoLiquids: randPreset.npoLiquids || 4,
        allergies: randPreset.penicillinAllergy ? 'Penicillin' : 'NKDA',
        pmhx: briefing.pmhx,
        procedure: randPreset.procedure || 'surgery',
        emergentRSI: !!randPreset.emergentRSI,
        anemia: !!randPreset.anemia,
        thrombocytopenia: !!randPreset.thrombocytopenia,
        coagulopathy: !!randPreset.coagulopathy,
        diabetes: !!randPreset.diabetes,
        insulin: !!randPreset.insulin
      }
    };
    setStagedCase(null);
    if (onStart) {
      onStart(newCase);
    }
  };

  const currDiff = calculateDifficulty(customForm);

  if (stagedCase) {
    const b = stagedCase.preOpBriefing || { hpi: '', pmhx: '', vitals: '', airway: '', rationale: '' };
    return (
      <div className="glass-panel glass-blue p-4 sm:p-6 w-full max-w-3xl flex flex-col gap-6 text-slate-100 font-sans animate-in slide-in-from-bottom-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-white/5 pb-4 gap-2">
          <h2 className="text-3xl font-black text-blue-400 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"><FileText size={28}/> Pre-Op Briefing (EMR)</h2>
          <span className={`px-3 py-1 rounded-lg border font-bold text-xs ${stagedCase.difficulty === 'Easy' ? 'bg-green-950/40 border-green-500/40 text-green-400' : stagedCase.difficulty === 'Medium' ? 'bg-yellow-950/40 border-yellow-500/40 text-yellow-400' : 'bg-red-950/40 border-red-500/40 text-red-400'}`}>
            {stagedCase.difficulty} Case
          </span>
        </div>

        <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5 shadow-inner">
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-1">History of Present Illness</h3>
            <p className="text-slate-200 text-sm leading-relaxed">{b.hpi}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-1">Past Medical History</h3>
            <p className="text-slate-200 text-sm leading-relaxed">{b.pmhx}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-1">Baseline Vitals</h3>
            <p className="text-cyan-300 font-bold text-sm bg-cyan-950/30 p-2 rounded-lg border border-cyan-900/30">{b.vitals}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-1">Airway Exam</h3>
            <p className="text-yellow-200 text-sm border-l-2 border-yellow-500 pl-2 leading-relaxed">{b.airway}</p>
          </div>
        </div>

        <div className="bg-purple-950/20 border border-purple-900/35 p-4 rounded-xl shadow-inner">
          <h3 className="text-purple-400 font-bold uppercase tracking-widest text-[10px] mb-1">Attending Anesthesiologist Rationale</h3>
          <p className="text-purple-200 text-sm italic leading-relaxed">"{b.rationale}"</p>
        </div>

        <div className="flex justify-between pt-4 border-t border-white/5 mt-2 gap-4 flex-wrap">
          <button onClick={() => setStagedCase(null)} className="px-5 py-2 rounded-lg font-bold text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-900/40 border border-white/5 transition flex items-center gap-2 active:scale-97 cursor-pointer">
            <ArrowLeft size={16}/> Back
          </button>
          <div className="flex gap-3">
            <button onClick={() => openPreOpEMR(stagedCase)} className="px-6 py-2 rounded-lg font-black text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 transition flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-97 cursor-pointer">
              <FileText size={16}/> Perform Pre-Op EMR Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel glass-blue p-4 sm:p-6 w-full max-w-6xl flex flex-col gap-6 text-slate-100 font-sans max-h-[82vh] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 pb-4 gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack} 
              className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center mr-1"
              title="Back to Aetheris Splash Screen"
            >
              <ArrowLeft size={16}/>
            </button>
          )}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-blue-400 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"><Activity size={28}/> Anesthesia Clinical Builder</h2>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <button onClick={() => setActiveTab('presets')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'presets' ? 'glass-button-blue text-white shadow-md' : 'glass-button text-slate-400 hover:text-slate-200'}`}>Clinical Specialty Presets</button>
          <button onClick={() => setActiveTab('custom')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'custom' ? 'glass-button-blue text-white shadow-md' : 'glass-button text-slate-400 hover:text-slate-200'}`}>High-Fidelity Customizer</button>
          <button 
            onClick={handleWingIt} 
            className="px-4 py-2 text-xs font-extrabold rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all duration-200 hover:scale-[1.05] active:scale-95 cursor-pointer flex items-center gap-1.5 ml-2"
            title="Bypass EMR and pre-op; jump straight into the simulator with a random case preset"
          >
            <Dices size={12}/> WING IT! 🎲
          </button>
        </div>
      </div>

      {activeTab === 'presets' ? (
        <div className="flex flex-col gap-6">
          <p className="text-slate-300 text-sm mb-2 max-w-3xl">Select an approved surgical specialty preset. These presets represent distinct pathophysiological configurations (e.g. fixed stroke volume in AS, upregulated ACh receptors in burns, severe vasoplegia in sepsis) designed to test critical anesthesia reasoning.</p>
          
          {/* Simplistic and Modern Dropdown Selection Selector */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-950 p-4 border border-slate-800 rounded-xl">
            <div className="flex-1 w-full flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Select Clinical Case Preset</label>
              <select 
                value={selectedPresetId} 
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 outline-none text-xs font-bold w-full cursor-pointer hover:border-cyan-500 focus:border-cyan-500 transition font-mono"
              >
                {PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    [{preset.specialty.toUpperCase()}] {preset.name.split(' - ')[1] || preset.name}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => {
                const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
                applyPresetToForm(currentPreset);
                handleStageCase(currentPreset);
              }}
              className="w-full md:w-auto px-8 py-3 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-md transition-all shrink-0 self-end animate-pulse"
            >
              Stage Selected Case &rarr;
            </button>
          </div>

          {/* Focused details card for the active selection */}
          {(() => {
            const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
            const difficultyInfo = calculateDifficulty(currentPreset);
            return (
              <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-xl flex flex-col gap-4 animate-in fade-in duration-200 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-850/60 pb-3">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-extrabold uppercase bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-850">{currentPreset.specialty}</span>
                    <h3 className="font-extrabold text-lg text-slate-100 mt-1.5">{currentPreset.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${
                      difficultyInfo.level === 'Easy' ? 'bg-green-950/40 border-green-800 text-green-400' :
                      difficultyInfo.level === 'Medium' ? 'bg-yellow-950/40 border-yellow-800 text-yellow-400' :
                      'bg-red-950/40 border-red-800 text-red-400'
                    }`}>
                      {difficultyInfo.level} Case
                    </span>
                    <Heart size={16} className={currentPreset.chf || currentPreset.cad || currentPreset.as ? "text-red-500 animate-pulse" : "text-slate-600"} />
                  </div>
                </div>
                
                <p className="text-slate-300 text-xs leading-relaxed">{currentPreset.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-slate-400 font-mono mt-2 bg-slate-950/80 p-3 rounded-lg border border-slate-900">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Age & Sex</span>
                    <span className="font-bold text-slate-200 text-xs">{currentPreset.age}yo / {currentPreset.sex.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Weight & Height</span>
                    <span className="font-bold text-slate-200 text-xs">{currentPreset.weight} kg / {currentPreset.height} cm</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Starting Vitals</span>
                    <span className="font-bold text-cyan-400 text-xs">{currentPreset.hr} bpm | {currentPreset.sys}/{currentPreset.dia} mmHg</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Airway & Position</span>
                    <span className="font-bold text-yellow-300 text-xs">Mallampati {currentPreset.mallampati} | {currentPreset.position}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Random case selection with Easy, Medium, Hard selectors */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-slate-950 p-4 border border-slate-800 rounded-lg mt-4 gap-4 shadow-lg">
             <div className="flex items-center gap-3">
               <Dices size={28} className="text-slate-500 animate-pulse" />
               <div>
                  <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">Quick Clinical Scenario Staging</span>
                  <span className="text-[11px] text-slate-500">Instantly stage a random case filtered by difficulty level.</span>
               </div>
             </div>
             <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
               <button onClick={() => stageRandomByDifficulty('Easy')} className="flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-xs bg-green-950 border border-green-800/80 text-green-400 hover:bg-green-900/40 transition flex items-center justify-center gap-1.5 shadow-sm">
                 <Dices size={12} /> STAGE RANDOM EASY
               </button>
               <button onClick={() => stageRandomByDifficulty('Medium')} className="flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-xs bg-yellow-950 border border-yellow-800/80 text-yellow-400 hover:bg-yellow-900/40 transition flex items-center justify-center gap-1.5 shadow-sm">
                 <Dices size={12} /> STAGE RANDOM MEDIUM
               </button>
               <button onClick={() => stageRandomByDifficulty('Hard')} className="flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-xs bg-red-950 border border-red-800/80 text-red-400 hover:bg-red-900/40 transition flex items-center justify-center gap-1.5 shadow-sm">
                 <Dices size={12} /> STAGE RANDOM HARD
               </button>
             </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center gap-4 flex-wrap">
            <div className="flex gap-2 items-center">
              <Settings size={20} className="text-slate-500" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Editing Template Presets</span>
                <span className="text-sm font-bold text-cyan-400">{customForm.name}</span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => applyPresetToForm(p)} 
                  className={`px-2.5 py-1 text-[10px] rounded border font-semibold transition ${activePresetId === p.id ? 'bg-cyan-950 text-cyan-400 border-cyan-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  {p.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Section 2: Demographics & Computed Lung Volumes */}
            <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
               <h3 className="text-cyan-500 font-extrabold border-b border-slate-800 pb-1.5 uppercase tracking-widest text-xs flex items-center gap-1.5">
                 <Info size={14}/> 1. Demographics & Volumes
               </h3>
               
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] text-slate-400 uppercase font-bold">Scenario Name</label>
                 <input type="text" value={customForm.name} onChange={e => setCustomForm({...customForm, name: e.target.value})} className="bg-slate-900 text-white p-2 rounded outline-none border border-slate-700 focus:border-cyan-500 text-xs font-bold" />
               </div>

               <div className="grid grid-cols-2 gap-2">
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase font-semibold">Age (18-99)</label>
                   <input type="number" min={18} max={99} value={customForm.age} onChange={e => setCustomForm({...customForm, age: Math.max(18, Math.min(99, Number(e.target.value)))})} className="bg-slate-900 text-white p-1.5 rounded outline-none border border-slate-750 focus:border-cyan-500 text-xs" />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase font-semibold">Sex</label>
                   <select value={customForm.sex} onChange={e => setCustomForm({...customForm, sex: e.target.value})} className="bg-slate-900 text-white p-1.5 rounded outline-none border border-slate-750 text-xs">
                     <option value="male">Male</option><option value="female">Female</option>
                   </select>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase font-semibold">Height (cm)</label>
                   <input type="number" value={customForm.height} onChange={e => setCustomForm({...customForm, height: Number(e.target.value)})} className="bg-slate-900 text-white p-1.5 rounded outline-none border border-slate-750 focus:border-cyan-500 text-xs" />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase font-semibold">Weight (kg)</label>
                   <input type="number" value={customForm.weight} onChange={e => setCustomForm({...customForm, weight: Number(e.target.value)})} className="bg-slate-900 text-white p-1.5 rounded outline-none border border-slate-750 focus:border-cyan-500 text-xs" />
                 </div>
               </div>

               {/* Live Computed Values */}
               <div className="bg-slate-950 p-3 rounded border border-slate-800 text-[10px] flex flex-col gap-1.5 font-mono text-slate-300">
                  <div className="flex justify-between border-b border-slate-900 pb-1 font-bold text-cyan-400">
                    <span>INDEXED METRICS</span>
                    <span>VALUES</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BMI (Body Mass Index)</span>
                    <span className={`font-bold ${demographics.bmi > 30 ? "text-yellow-400" : "text-green-400"}`}>{demographics.bmi} kg/m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IBW (Ideal Body Wt)</span>
                    <span className="font-bold">{demographics.ibw} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LBW (Lean Body Wt)</span>
                    <span className="font-bold">{demographics.lbw} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EBV (Estimated Blood Vol)</span>
                    <span className="font-bold">{demographics.ebv} mL</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-1 font-bold text-yellow-500">
                    <span>SPIROMETRIC VOLUMES ({customForm.position})</span>
                    <span>PREDICTED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FRC (Func Residual Cap)</span>
                    <span className="font-bold text-slate-100">{demographics.lung.frc_mL || 0} mL ({Math.round(demographics.lung.positionFactor*100)}% pos)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TLC (Total Lung Cap)</span>
                    <span className="font-bold text-slate-100">{demographics.lung.tlc_mL || 0} mL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anatomic Dead Space (Vd)</span>
                    <span className="font-bold text-slate-100">{demographics.lung.vd_mL || 0} mL</span>
                  </div>
                  {demographics.bmi > 25 && (
                    <div className="text-[9px] text-yellow-500/80 italic mt-1 leading-tight">
                      ⚠️ Obesity Pelosi decay factor: {demographics.lung.obesityFactor} applied to starting FRC volume.
                    </div>
                  )}
               </div>
            </div>

            {/* Section 3: Organ System Review */}
            <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
               <h3 className="text-green-500 font-extrabold border-b border-slate-800 pb-1.5 uppercase tracking-widest text-xs flex items-center gap-1.5">
                 <Heart size={14}/> 2. Organ System Review
               </h3>
               
               {/* CARDIAC */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Cardiovascular</span>
                 <div className="grid grid-cols-2 gap-1.5">
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.cad} onChange={e => setCustomForm({...customForm, cad: e.target.checked})} className="accent-green-500" /> CAD (Ischemia)
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.as} onChange={e => setCustomForm({...customForm, as: e.target.checked})} className="accent-green-500" /> Aortic Stenosis
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.afib} onChange={e => setCustomForm({...customForm, afib: e.target.checked})} className="accent-green-500" /> A-Fib (Flutter)
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.htn} onChange={e => setCustomForm({...customForm, htn: e.target.checked})} className="accent-green-500" /> Hypertension
                   </label>
                 </div>
                 <div className="flex items-center gap-3 mt-1 text-[11px] justify-between">
                   <label className="flex items-center gap-1 text-slate-300">
                     <input type="checkbox" checked={customForm.chf} onChange={e => setCustomForm({...customForm, chf: e.target.checked})} className="accent-green-500" /> CHF
                   </label>
                   {customForm.chf && (
                     <div className="flex items-center gap-1">
                       <span className="text-[9px] text-slate-400 uppercase">EF %</span>
                       <input type="number" min={10} max={70} value={customForm.ef} onChange={e => setCustomForm({...customForm, ef: Number(e.target.value)})} className="bg-slate-900 text-white p-0.5 rounded outline-none border border-slate-700 text-center w-10 text-[10px]" />
                     </div>
                   )}
                 </div>
               </div>

               {/* PULMONARY */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Pulmonary</span>
                 <div className="flex flex-col gap-1.5">
                   <div className="flex justify-between items-center text-[11px]">
                     <span className="text-slate-300">COPD Severity</span>
                     <select value={customForm.pulmonaryComorbidity || (customForm.copd ? 'copd gold ii' : 'none')} 
                       onChange={e => {
                         const val = e.target.value;
                         setCustomForm({
                           ...customForm, 
                           pulmonaryComorbidity: val === 'none' ? null : val,
                           copd: val !== 'none' && val.includes('copd')
                         });
                       }}
                       className="bg-slate-900 text-slate-200 border border-slate-750 rounded p-0.5 text-[10px] outline-none"
                     >
                       <option value="none">None</option>
                       <option value="copd gold i">GOLD I (Mild)</option>
                       <option value="copd gold ii">GOLD II (Mod)</option>
                       <option value="copd gold iii">GOLD III (Sev)</option>
                       <option value="copd gold iv">GOLD IV (V.Sev)</option>
                     </select>
                   </div>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.asthma} onChange={e => setCustomForm({...customForm, asthma: e.target.checked})} className="accent-green-500" /> Active Bronchospastic Asthma
                   </label>
                 </div>
               </div>

               {/* RENAL & LIVER */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Renal & Hepatic</span>
                 <div className="flex flex-col gap-1.5">
                   <div className="flex justify-between items-center text-[11px]">
                     <span className="text-slate-300">Renal CKD GFR</span>
                     <select value={customForm.gfr} onChange={e => setCustomForm({...customForm, gfr: Number(e.target.value)})} className="bg-slate-900 text-slate-200 border border-slate-750 rounded p-0.5 text-[10px] outline-none">
                       <option value={100}>Normal (&gt;90)</option>
                       <option value={75}>CKD Stage 2 (GFR 75)</option>
                       <option value={45}>CKD Stage 3 (GFR 45)</option>
                       <option value={22}>CKD Stage 4 (GFR 22)</option>
                       <option value={10}>CKD Stage 5 (Dialysis)</option>
                     </select>
                   </div>
                   <div className="flex justify-between items-center text-[11px]">
                     <span className="text-slate-300">Liver Child-Pugh</span>
                     <select value={customForm.cp} onChange={e => setCustomForm({...customForm, cp: e.target.value})} className="bg-slate-900 text-slate-200 border border-slate-750 rounded p-0.5 text-[10px] outline-none">
                       <option value="none">Normal / NKDA</option>
                       <option value="A">Child-Pugh A (Mild)</option>
                       <option value="B">Child-Pugh B (Mod)</option>
                       <option value="C">Child-Pugh C (Severe)</option>
                     </select>
                   </div>
                 </div>
               </div>

               {/* NEURO & MUSCULO */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider font-mono">Neuromuscular & Genetics</span>
                  <div className="grid grid-cols-2 gap-1.5 mt-0.5 pb-1.5 border-b border-slate-800/35">
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.mg} onChange={e => setCustomForm({...customForm, mg: e.target.checked})} className="accent-green-500" /> Myasthenia Gravis
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="Triggers upregulated nAChR state with fatal hyperkalemic arrest on Succinylcholine!">
                      <input type="checkbox" checked={customForm.burns || customForm.immobility} onChange={e => setCustomForm({...customForm, burns: e.target.checked, immobility: e.target.checked})} className="accent-red-500" /> Upregulated AChR ⚠️
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.mhSusceptible} onChange={e => setCustomForm({...customForm, mhSusceptible: e.target.checked})} className="accent-red-500" /> MH Susceptible ⚠️
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.dmd} onChange={e => setCustomForm({...customForm, dmd: e.target.checked})} className="accent-red-500" /> DMD ⚠️
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.bmd} onChange={e => setCustomForm({...customForm, bmd: e.target.checked})} className="accent-red-500" /> Becker Dystrophy ⚠️
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.cmt} onChange={e => setCustomForm({...customForm, cmt: e.target.checked})} className="accent-green-500" /> Charcot-Marie-Tooth
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.elms} onChange={e => setCustomForm({...customForm, elms: e.target.checked})} className="accent-green-500" /> Eaton-Lambert
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.cip} onChange={e => setCustomForm({...customForm, cip: e.target.checked})} className="accent-green-500" /> Critical Illness Poly.
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                      <input type="checkbox" checked={customForm.mitochondrial} onChange={e => setCustomForm({...customForm, mitochondrial: e.target.checked})} className="accent-green-500" /> Mitochondrial Myo.
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="HyperPP: SCN4A channelopathy. Succinylcholine & neostigmine CONTRAINDICATED; K+ triggers attacks.">
                      <input type="checkbox" checked={customForm.hyperPP} onChange={e => setCustomForm({...customForm, hyperPP: e.target.checked, hypoPP: e.target.checked ? false : customForm.hypoPP})} className="accent-yellow-500" /> HyperPP ⚠️
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="HypoPP: CACNA1S/SCN4A channelopathy. Avoid glucose IVF, long-acting NMBAs, & catecholamines; possible MH link.">
                      <input type="checkbox" checked={customForm.hypoPP} onChange={e => setCustomForm({...customForm, hypoPP: e.target.checked, hyperPP: e.target.checked ? false : customForm.hyperPP})} className="accent-yellow-500" /> HypoPP ⚠️
                    </label>
                  </div>
                  <div className="flex flex-col gap-1 mt-1 pb-1.5 border-b border-slate-800/35">
                    <span className="text-[9px] text-green-400/80 font-bold uppercase tracking-wider font-mono">Pseudocholinesterase Genotype</span>
                    <div className="flex items-center gap-2">
                      <select 
                        value={customForm.butyrylcholinesteraseVariant || 'normal'} 
                        onChange={e => setCustomForm({...customForm, butyrylcholinesteraseVariant: e.target.value})} 
                        className="bg-slate-950 border border-slate-800 text-[11px] text-white rounded px-1.5 py-0.5"
                      >
                        <option value="normal">Normal (E1u-E1u, DN 80)</option>
                        <option value="heterozygous">Heterozygous (E1u-E1a, DN 50)</option>
                        <option value="atypical">Atypical (E1a-E1a, DN 20)</option>
                      </select>
                      <span className="text-[9px] text-slate-400 font-mono">DN: {customForm.butyrylcholinesteraseVariant === 'heterozygous' ? 50 : (customForm.butyrylcholinesteraseVariant === 'atypical' ? 20 : 80)}</span>
                    </div>
                  </div>
                 <div className="flex flex-col gap-1 mt-1.5">
                   <span className="text-[9px] text-green-400/80 font-bold uppercase tracking-wider font-mono">Genetic Knockouts</span>
                   <div className="grid grid-cols-2 gap-1.5">
                     <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="TASK-1 Knockout: Increases resistance to volatile MAC immobility (1.3x)">
                       <input type="checkbox" checked={customForm.isTASK1Knockout} onChange={e => setCustomForm({...customForm, isTASK1Knockout: e.target.checked})} className="accent-green-500" /> TASK-1 Knockout
                     </label>
                     <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="TASK-3 Knockout: Blunts volatile-induced theta-slowing and increases MAC immobility resistance (1.4x)">
                       <input type="checkbox" checked={customForm.isTASK3Knockout} onChange={e => setCustomForm({...customForm, isTASK3Knockout: e.target.checked})} className="accent-green-500" /> TASK-3 Knockout
                     </label>
                     <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="TREK-1 Knockout: Removes neuroprotective preconditioning and increases MAC immobility resistance (1.5x)">
                       <input type="checkbox" checked={customForm.isTREK1Knockout} onChange={e => setCustomForm({...customForm, isTREK1Knockout: e.target.checked})} className="accent-green-500" /> TREK-1 Knockout
                     </label>
                     <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="HCN1 Knockout: Blunts volatile anesthetic hypnotic sensitivity (0.5x LC/TMN deactivation, 0.25x HCN inhibition)">
                       <input type="checkbox" checked={customForm.isHCN1Knockout} onChange={e => setCustomForm({...customForm, isHCN1Knockout: e.target.checked})} className="accent-green-500" /> HCN1 Knockout
                     </label>
                   </div>
                 </div>
               </div>

               {/* HEMATOLOGY & METABOLISM */}
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Hematology & Metabolism</span>
                 <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.anemia} onChange={e => setCustomForm({...customForm, anemia: e.target.checked})} className="accent-green-500" /> Anemia
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.thrombocytopenia} onChange={e => setCustomForm({...customForm, thrombocytopenia: e.target.checked})} className="accent-green-500" /> Thrombocytopenia
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.coagulopathy} onChange={e => setCustomForm({...customForm, coagulopathy: e.target.checked})} className="accent-green-500" /> Coagulopathy
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.diabetes} onChange={e => setCustomForm({...customForm, diabetes: e.target.checked})} className="accent-green-500" /> Diabetes
                   </label>
                 </div>
                 {customForm.diabetes && (
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300 mt-1">
                     <input type="checkbox" checked={customForm.insulin} onChange={e => setCustomForm({...customForm, insulin: e.target.checked})} className="accent-green-500" /> Insulin-Dependent
                   </label>
                 )}
               </div>
            </div>

            {/* Section 4: Meds, Allergies, Surgical Context */}
            <div className="flex flex-col gap-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
               <h3 className="text-yellow-500 font-extrabold border-b border-slate-800 pb-1.5 uppercase tracking-widest text-xs flex items-center gap-1.5">
                 <ShieldAlert size={14}/> 3. Safety & Context
               </h3>

               {/* OUTPATIENT MEDS */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Outpatient Medications</span>
                 <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="Blunts tachycardia compensatory drives by 85%">
                   <input type="checkbox" checked={customForm.betaBlocker} onChange={e => setCustomForm({...customForm, betaBlocker: e.target.checked})} className="accent-yellow-500" /> Chronic Beta-Blocker Med
                 </label>
               </div>

               {/* ALLERGIES */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Allergies</span>
                 <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-red-400 font-semibold" title="Ampicillin/Sulbactam administration triggers severe IgE vasoplegic shock!">
                   <input type="checkbox" checked={customForm.penicillinAllergy} onChange={e => setCustomForm({...customForm, penicillinAllergy: e.target.checked})} className="accent-red-500" /> Penicillin Allergy ⚠️
                 </label>
                 {customForm.penicillinAllergy && (
                   <span className="text-[9px] text-red-500 leading-tight block">
                     Induction alerts: Anaphylactic shock active for penicillin-derived beta-lactams.
                   </span>
                 )}
               </div>

               {/* CLINICAL TIMEOUT & INTERLOCK EXCEPTION */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Clinical Context / RSI</span>
                 <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-orange-400 font-bold" title="Flag as emergent Rapid Sequence Intubation case to bypass the pre-induction checklist lock.">
                   <input type="checkbox" checked={customForm.emergentRSI} onChange={e => setCustomForm({...customForm, emergentRSI: e.target.checked})} className="accent-orange-500" /> Emergent RSI Case ⚠️
                 </label>
               </div>

               {/* NPO TIMES */}
               <div className="flex flex-col gap-1 border-b border-slate-850 pb-2">
                 <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">NPO Status (hours)</span>
                 <div className="grid grid-cols-2 gap-2 text-xs">
                   <div className="flex items-center justify-between">
                     <span className="text-slate-400 text-[10px]">Solids</span>
                     <input type="number" min={0} value={customForm.npoSolids} onChange={e => setCustomForm({...customForm, npoSolids: Number(e.target.value)})} className="bg-slate-900 border border-slate-700 text-white text-center w-10 p-0.5 rounded text-[10px]" />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-slate-400 text-[10px]">Liquids</span>
                     <input type="number" min={0} value={customForm.npoLiquids} onChange={e => setCustomForm({...customForm, npoLiquids: Number(e.target.value)})} className="bg-slate-900 border border-slate-700 text-white text-center w-10 p-0.5 rounded text-[10px]" />
                   </div>
                 </div>
               </div>

               {/* SURGICAL CONTEXT */}
               <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Surgical Context</span>
                 
                 <div className="flex flex-col gap-0.5">
                   <label className="text-[9px] text-slate-400 uppercase">Procedure Name</label>
                   <input type="text" value={customForm.procedure} onChange={e => setCustomForm({...customForm, procedure: e.target.value})} className="bg-slate-900 border border-slate-700 text-white p-1 rounded text-xs outline-none focus:border-yellow-500 font-bold" />
                 </div>

                 <div className="grid grid-cols-2 gap-2 text-xs">
                   <div className="flex flex-col gap-0.5">
                     <label className="text-[9px] text-slate-400 uppercase">Expected EBL</label>
                     <select value={customForm.ebl} onChange={e => setCustomForm({...customForm, ebl: e.target.value})} className="bg-slate-900 text-white border border-slate-700 rounded p-1 text-[10px] outline-none">
                       <option value="Low">Low (&lt;200mL)</option>
                       <option value="Moderate">Moderate (500mL)</option>
                       <option value="High">High (&gt;1500mL)</option>
                     </select>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <label className="text-[9px] text-slate-400 uppercase">Position</label>
                     <select value={customForm.position} onChange={e => setCustomForm({...customForm, position: e.target.value})} className="bg-slate-900 text-white border border-slate-700 rounded p-1 text-[10px] outline-none">
                       <option value="Supine">Supine</option>
                       <option value="Ramped">Ramped</option>
                       <option value="Sitting">Sitting</option>
                       <option value="Prone">Prone</option>
                       <option value="Lateral">Lateral</option>
                       <option value="Lithotomy">Lithotomy</option>
                       <option value="Trendelenburg">Trendelenburg</option>
                     </select>
                   </div>
                 </div>
               </div>

            </div>

          </div>

          {/* Staging bottom block */}
          <div className="flex items-center justify-between bg-slate-950 p-4 border border-slate-700 rounded-lg">
             <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Calculated Case Difficulty</span>
                <span className={`text-2xl font-black uppercase tracking-widest ${currDiff.color}`}>{currDiff.level}</span>
             </div>
             <button onClick={() => handleStageCase(customForm)} className={`px-12 py-4 rounded-xl font-black text-xl bg-slate-900 border-2 ${currDiff.border} ${currDiff.color} hover:bg-slate-800 transition shadow-lg`}>
               STAGE SCENARIO
             </button>
          </div>

        </div>
      )}
    </div>
  );
};