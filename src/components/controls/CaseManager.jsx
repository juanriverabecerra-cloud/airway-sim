import React, { useState, useEffect } from 'react';
import { Activity, Dices, AlertTriangle, CheckCircle2, FileText, ArrowLeft, Play, Info, Settings, Heart, ShieldAlert } from 'lucide-react';
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
    burns: false, immobility: false, cp: 'none', htn: false, as: false
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
    burns: false, immobility: false, cp: 'none', htn: false, as: false
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
    burns: false, immobility: false, cp: 'none', htn: true, as: false
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
    burns: false, immobility: false, cp: 'none', htn: false, as: false
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
    cirrhosis: true, childPugh: 'C'
  }
];

export const CaseManager = ({ onStart, stagedCase: propStagedCase, setStagedCase: propSetStagedCase, openPreOpEMR }) => {
  const [activeTab, setActiveTab] = useState('presets'); 
  const [localStagedCase, localSetStagedCase] = useState(null);
  const stagedCase = propStagedCase !== undefined ? propStagedCase : localStagedCase;
  const setStagedCase = propSetStagedCase !== undefined ? propSetStagedCase : localSetStagedCase;

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
    burns: false, immobility: false, cp: 'none', htn: false
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
    const height = customForm.height;
    const weight = customForm.weight;
    const sex = customForm.sex;
    const age = customForm.age;
    const position = customForm.position;

    const bmi = weight / Math.pow(height / 100, 2);
    const ibw = calculateIBW(height, sex);
    
    // lean body weight (Janmahasatian equation)
    let lbw = 0;
    if (sex === 'male') {
      lbw = (9270 * weight) / (6680 + 216 * bmi);
    } else {
      lbw = (9270 * weight) / (8780 + 244 * bmi);
    }

    const ebv = sex === 'male' ? weight * 75 : weight * 65;
    const bsa = Math.sqrt((height * weight) / 3600);
    const lung = calculateLungVolumes(height, age, sex, bmi, position, customForm.copd || false, customForm.restrictive || false);

    setDemographics({
      bmi: parseFloat(bmi.toFixed(1)),
      ibw: parseFloat(ibw.toFixed(1)),
      lbw: parseFloat(lbw.toFixed(1)),
      ebv: Math.round(ebv),
      bsa: parseFloat(bsa.toFixed(2)),
      lung: lung
    });
  }, [customForm.height, customForm.weight, customForm.sex, customForm.age, customForm.position, customForm.copd, customForm.restrictive]);

  const calculateDifficulty = (data) => {
    let score = 0;
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    if (bmi > 35) score += 2;
    if (bmi > 48) score += 2;
    if (data.age > 70) score += 1;
    if (data.sys < 95 || data.sys > 155) score += 2;
    if (data.spo2 < 93) score += 3;
    if (data.mallampati > 2) score += (data.mallampati - 2) * 2.5;
    if (data.neckMobility === 'reduced') score += 3;
    if (data.airwayBlood) score += 5;
    
    if (data.septic) score += 4;
    if (data.trauma) score += 4;
    if (data.chf && data.ef < 40) score += 3;
    if (data.cad) score += 2;
    if (data.as) score += 3;
    if (data.gfr < 30) score += 2;
    if (data.cp !== 'none') score += 3;
    if (data.mg) score += 3;

    if (score <= 3) return { level: 'Easy', color: 'text-green-400', border: 'border-green-500' };
    if (score <= 8) return { level: 'Medium', color: 'text-yellow-400', border: 'border-yellow-500' };
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

    let rationale = "";
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
      id: 'case-' + Date.now(),
      name: nameOverride || data.name,
      difficulty: finalLevel,
      description: briefing.hpi,
      preOpBriefing: briefing,
      baseVitals: { hr: data.hr, sys: data.sys, dia: data.dia, spo2: data.spo2, etco2: 0, rr: data.rr, temp: data.temp },
      patient: { 
        age: data.age, sex: data.sex, weight: Math.round(data.weight), height: data.height, ibw: ibw, bmi: bmi,
        position: data.position || 'Supine',
        oxygenBuffer: 21, targetBuffer: 21, 
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
        shuntFraction: data.procedure.includes('OLV') ? 0.25 : 0.05,
        npoSolids: data.npoSolids || 8,
        npoLiquids: data.npoLiquids || 4,
        allergies: data.penicillinAllergy ? 'Penicillin' : 'NKDA',
        pmhx: briefing.pmhx
      }
    };
    setStagedCase(newCase);
  };

  const currDiff = calculateDifficulty(customForm);

  if (stagedCase) {
    const b = stagedCase.preOpBriefing;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-3xl flex flex-col gap-6 text-white font-mono animate-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-black text-blue-400 flex items-center gap-3"><FileText size={28}/> Pre-Op Briefing (EMR)</h2>
          <span className={`px-3 py-1 rounded border font-bold text-xs ${stagedCase.difficulty === 'Easy' ? 'bg-green-950 border-green-500 text-green-400' : stagedCase.difficulty === 'Medium' ? 'bg-yellow-950 border-yellow-500 text-yellow-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
            {stagedCase.difficulty} Case
          </span>
        </div>

        <div className="flex flex-col gap-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">History of Present Illness</h3>
            <p className="text-slate-200 text-sm">{b.hpi}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Past Medical History</h3>
            <p className="text-slate-200 text-sm">{b.pmhx}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Baseline Vitals</h3>
            <p className="text-cyan-300 font-bold text-sm bg-cyan-950/30 p-2 rounded border border-cyan-900/50">{b.vitals}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Airway Exam</h3>
            <p className="text-yellow-200 text-sm border-l-2 border-yellow-500 pl-2">{b.airway}</p>
          </div>
        </div>

        <div className="bg-purple-950/30 border border-purple-900/50 p-4 rounded-lg">
          <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-1">Attending Anesthesiologist Rationale</h3>
          <p className="text-purple-200 text-sm italic">"{b.rationale}"</p>
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-800 mt-2 gap-4 flex-wrap">
          <button onClick={() => setStagedCase(null)} className="px-6 py-2 rounded font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition flex items-center gap-2">
            <ArrowLeft size={16}/> Back
          </button>
          <div className="flex gap-3">
            <button onClick={() => openPreOpEMR(stagedCase)} className="px-6 py-2 rounded font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition flex items-center gap-2 shadow-[0_0_10px_rgba(79,70,229,0.3)]">
              <FileText size={16}/> Review EMR Chart
            </button>
            <button onClick={() => onStart(stagedCase)} className="px-8 py-2 rounded font-black text-white bg-blue-600 hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
              Proceed to OR <Play size={16}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-6xl flex flex-col gap-6 text-white font-mono">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-black text-cyan-400 flex items-center gap-3"><Activity size={28}/> Anesthesia Clinical Builder</h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('presets')} className={`px-4 py-2 font-bold rounded ${activeTab === 'presets' ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Clinical Specialty Presets</button>
          <button onClick={() => setActiveTab('custom')} className={`px-4 py-2 font-bold rounded ${activeTab === 'custom' ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>High-Fidelity Customizer</button>
        </div>
      </div>

      {activeTab === 'presets' ? (
        <div className="flex flex-col gap-6">
          <p className="text-slate-300 text-sm mb-2 max-w-3xl">Select an approved surgical specialty preset. These presets represent distinct pathophysiological configurations (e.g. fixed stroke volume in AS, upregulated ACh receptors in burns, severe vasoplegia in sepsis) designed to test critical anesthesia reasoning.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {PRESETS.map((preset) => (
              <button 
                key={preset.id} 
                onClick={() => {
                  applyPresetToForm(preset);
                  setActiveTab('custom');
                }} 
                className={`bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between items-start gap-3 transition-all hover:scale-102 hover:border-cyan-500 hover:shadow-lg text-left`}
              >
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-cyan-400 font-extrabold uppercase bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-850">{preset.specialty}</span>
                    <Heart size={14} className={preset.chf || preset.cad || preset.as ? "text-red-500" : "text-slate-600"} />
                  </div>
                  <h4 className="font-bold text-sm text-slate-100 line-clamp-1">{preset.name.split(' - ')[1]}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
                </div>
                <div className="flex justify-between items-center w-full border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 font-semibold">
                  <span>{preset.age}yo {preset.sex === 'male' ? 'M' : 'F'}</span>
                  <span>{preset.position}</span>
                  <span className="text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-0.5">Customize &rarr;</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center bg-slate-950 p-4 border border-slate-800 rounded-lg mt-4">
             <div className="flex items-center gap-3">
               <Dices size={28} className="text-slate-500 animate-pulse" />
               <div>
                  <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">Quick Clinical Scenario Staging</span>
                  <span className="text-[11px] text-slate-500">Pick any preset above to load its full organ-system demographics, then stage or fine-tune.</span>
               </div>
             </div>
             <button onClick={() => {
               const randPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
               applyPresetToForm(randPreset);
               handleStageCase(randPreset);
             }} className="px-6 py-2.5 rounded-lg font-bold text-xs bg-cyan-700 hover:bg-cyan-600 transition flex items-center gap-1.5 shadow-md">
               <Dices size={14} /> STAGE RANDOM SPECIALTY
             </button>
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
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Neuromuscular</span>
                 <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300">
                     <input type="checkbox" checked={customForm.mg} onChange={e => setCustomForm({...customForm, mg: e.target.checked})} className="accent-green-500" /> Myasthenia Gravis
                   </label>
                   <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300" title="Triggers upregulated nAChR state with fatal hyperkalemic arrest on Succinylcholine!">
                     <input type="checkbox" checked={customForm.burns || customForm.immobility} onChange={e => setCustomForm({...customForm, burns: e.target.checked, immobility: e.target.checked})} className="accent-red-500" /> Upregulated AChR ⚠️
                   </label>
                 </div>
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