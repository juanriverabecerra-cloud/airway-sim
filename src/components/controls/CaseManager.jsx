import { useState, useEffect } from 'react';
import { Activity, Dices, FileText, ArrowLeft, Info, Settings, Heart, ShieldAlert } from 'lucide-react';
import { calculateIBW, calculateLungVolumes } from '../../engine/Pharmacology';
import { AetherisLogo } from '../AetherisLogo';

import { MILLERS_CASE_PRESETS, MILLERS_CASE_METADATA } from './caseBanks/MillersCases';
import { GENERAL_KNOWLEDGE_CASE_PRESETS, GENERAL_KNOWLEDGE_CASE_METADATA } from './caseBanks/GeneralKnowledgeCases';
import { JAFFE_CASE_PRESETS, JAFFE_CASE_METADATA } from './caseBanks/JaffeCases';
import { JAFFE_PROCEDURES, getJaffeProceduresBySubspecialty } from '../../engine/JaffeProcedureKnowledgeEngine';

// Physiology engines (RespiratoryEngine.ts, usePhysiology.js, PositioningKnowledgeEngine.ts,
// etc.) do strict equality checks against this exact small set of position strings -- e.g.
// `patient.position === 'Trendelenburg'`. Jaffe's own "Position" field is free descriptive
// text (e.g. "Supine, arms tucked"), which would silently fail every one of those checks if
// assigned directly, degrading positioning-physiology and POVL-risk lookups for that case
// without ever throwing. Order matters: check more specific terms before the generic ones
// they'd otherwise be swallowed by (e.g. "Beach Chair"/"Reverse Trendelenburg" before "Sitting"/"Trendelenburg").
const KNOWN_PATIENT_POSITIONS = ['Reverse Trendelenburg', 'Trendelenburg', 'Beach Chair', 'Lithotomy', 'Prone', 'Lateral', 'Sitting', 'Standing', 'Ramped', 'Supine'];
function normalizeJaffePosition(rawText) {
  if (!rawText) return null;
  const lower = rawText.toLowerCase();
  return KNOWN_PATIENT_POSITIONS.find(p => lower.startsWith(p.toLowerCase())) || null;
}

// `source` is tagged here at merge time (not per-case in the bank files) so every case
// bank added in the future gets it automatically -- see docs/case_integration_prompt.md.
// Three banks, not two: MillersCases.js was audited (2026-07) and split into the subset
// actually traceable to a documented Miller's chapter session (or the original
// foundational one-per-specialty set) vs. general-knowledge crisis/pharmacogenomics/
// toxicology vignettes that were never citation-backed -- see that file's header comment.
const PRESETS = [
  ...MILLERS_CASE_PRESETS.map(p => ({ ...p, source: 'millers' })),
  ...GENERAL_KNOWLEDGE_CASE_PRESETS.map(p => ({ ...p, source: 'general' })),
  ...JAFFE_CASE_PRESETS.map(p => ({ ...p, source: 'jaffe' })),
];
const PRESET_METADATA = { ...MILLERS_CASE_METADATA, ...GENERAL_KNOWLEDGE_CASE_METADATA, ...JAFFE_CASE_METADATA };
// Category tabs are derived from whatever categories actually exist in the data rather
// than a hardcoded list -- the hardcoded list this replaced didn't include "General
// Surgery" at all, so the Jaffe cases added this session were reachable only via "All".
// Deriving it keeps every future chapter's subspecialty automatically filterable.
const PRESET_CATEGORIES = ['All', ...new Set(PRESETS.map(p => (PRESET_METADATA[p.id] || {}).category).filter(Boolean))];
// Computed once at module load (JAFFE_PROCEDURES is a static constant, not per-render
// state) rather than inside the component -- the custom-case form re-renders on every
// keystroke across its many fields, and this grouping has no reason to redo that work
// each time. Matters more once the KB grows past a couple hundred procedures.
const JAFFE_PROCEDURES_BY_SUBSPECIALTY = getJaffeProceduresBySubspecialty();

export const CaseManager = ({ stagedCase: propStagedCase, setStagedCase: propSetStagedCase, openPreOpEMR, onStart, initialTab, onBack, autoWingIt }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'presets'); 
  const [selectedPresetId, setSelectedPresetId] = useState(PRESETS[0].id);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeCustomTab, setActiveCustomTab] = useState('demographics');
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
    position: 'Supine', procedure: 'Elective Exploratory Laparoscopy', jaffeProcedureId: null,
    ebl: 'Low', duration: 90, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 4, ef: 60, gfr: 100,
    betaBlocker: false, cad: false, afib: false, as: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false,
    avDissociation: false, tricuspidRegurgitation: false, mitralRegurgitation: false,
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
    vitalCapacity: 3.5,
    // Add additional physiological customizer properties:
    phPresent: false,
    phWhoGroup: 1,
    phSeverity: 'severe',
    baselineMpap: 20,
    restrictive: false,
    asthma: false,
    hasVWD: false,
    vwdType: '1',
    vwfActivityPercent: 100,
    factorVIIIPercent: 100,
    hemophiliaA: false,
    hemophiliaB: false,
    hemophiliaInhibitors: false,
    chronicPrednisoneDoseMgPerDay: 0,
    chronicSteroidDurationWeeks: 0,
    isPregnant: false,
    gestationalAgeWeeks: 39,
    deliveryOccurred: false,
    hasSpinalCordInjuryAboveT6: false,
    bphSeverity: 0,
    g6pdDeficiency: false,
    cyp2d6Phenotype: 'EM',
    cyp2c9Phenotype: 'normal',
    cyp2c19Phenotype: 'normal',
    vkorc1SensitiveAllele: false,
    historyPONV: false,
    maoisActive: false,
    maoiWashoutDaysRemaining: 14,
    carcinoidTumor: false,
    pneumoperitoneumActive: false,
    iapMmHg: 0,
    hasPFO: false,
    pheo: false,
    pheoBlockadeAdequate: false,
    olvActive: false,
    olvLateralOperativeLungUp: false,
    dltInPlace: false,
    smokeExposureActive: false,
    smokeSeverity: 0,
    burnsTBSAPercent: 0,
    hoursPostBurn: 0,
    inhalationInjury: false,
    inhalationSeverity: 0,
    coHb: 1.0
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
        avDissociation: !!data.avDissociation,
        tricuspidRegurgitation: !!data.tricuspidRegurgitation,
        mitralRegurgitation: !!data.mitralRegurgitation,
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
        jaffeProcedureId: data.jaffeProcedureId || null,
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
        vitalCapacity: data.vitalCapacity !== undefined ? data.vitalCapacity : (data.id === 'myasthenia_gravis' ? 2.5 : 3.5),
        // Phase 4/5 new patient flags propagated from case presets
        bphSeverity: data.bphSeverity !== undefined ? data.bphSeverity : 0,
        hasSpinalCordInjuryAboveT6: !!data.hasSpinalCordInjuryAboveT6,
        // Phase 6 new flags
        hasVWD: data.hasVWD !== undefined ? !!data.hasVWD : false,
        vwdType: data.vwdType || '1',
        hemophiliaA: !!data.hemophiliaA,
        hemophiliaB: !!data.hemophiliaB,
        hemophiliaInhibitors: !!data.hemophiliaInhibitors,
        cyp2d6Phenotype: data.cyp2d6Phenotype || 'EM',
        cyp2c9Phenotype: data.cyp2c9Phenotype || 'normal',
        cyp2c19Phenotype: data.cyp2c19Phenotype || 'normal',
        g6pdDeficiency: !!data.g6pdDeficiency,
        vkorc1SensitiveAllele: !!data.vkorc1SensitiveAllele,
        historyPONV: !!data.historyPONV,
        chronicPrednisoneDoseMgPerDay: data.chronicPrednisoneDoseMgPerDay || 0,
        chronicSteroidDurationWeeks: data.chronicSteroidDurationWeeks || 0,
        infectionType: data.infectionType || undefined,
        // New crisis/physiology flags
        carcinoidTumor: !!data.carcinoidTumor,
        maoisActive: !!data.maoisActive,
        maoiWashoutDaysRemaining: data.maoiWashoutDaysRemaining || 0,
        pneumoperitoneumActive: !!data.pneumoperitoneumActive,
        iapMmHg: data.iapMmHg || 0,
        hasPFO: !!data.hasPFO,
        pheo: !!data.pheo,
        pheoBlockadeAdequate: !!data.pheoBlockadeAdequate,
        olvActive: !!data.olvActive,
        olvLateralOperativeLungUp: !!data.olvLateralOperativeLungUp,
        dltInPlace: !!data.dltInPlace,
        smokeExposureActive: !!data.smokeExposureActive,
        smokeSeverity: data.smokeSeverity || 0,
        burnsTBSAPercent: data.burnsTBSAPercent || 0,
        hoursPostBurn: data.hoursPostBurn || 0,
        inhalationInjury: !!data.inhalationInjury,
        inhalationSeverity: data.inhalationSeverity || 0.5,
        coHb: data.coHb || undefined,
        phPresent: !!data.phPresent,
        phWhoGroup: data.phWhoGroup || undefined,
        phSeverity: data.phSeverity || undefined,
        baselineMpap: data.baselineMpap || undefined,
        hasPreeclampsia: !!data.hasPreeclampsia,
        afeActive: !!data.afeActive,
        alcoholic: !!data.alcoholic,
        malnourished: !!data.malnourished
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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-blue-400 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
            {onBack ? (
              <div 
                onClick={onBack} 
                className="cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 shrink-0"
                title="Back to Aetheris Splash Screen"
              >
                <AetherisLogo className="w-8 h-8" glow={true} />
              </div>
            ) : (
              <AetherisLogo className="w-8 h-8 shrink-0" glow={true} />
            )}
            <span>Anesthesia Clinical Builder</span>
          </h2>
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
        <div className="flex flex-col gap-6 font-sans">
          <p className="text-slate-300 text-sm mb-2 max-w-4xl">
            Select an approved surgical specialty preset. These presets represent distinct pathophysiological configurations (e.g. fixed stroke volume in AS, upregulated ACh receptors in burns, severe vasoplegia in sepsis) designed to test critical anesthesia reasoning.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Categories & Scrollable Cards List */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto shrink-0 pb-1.5 border-b border-slate-800 custom-scrollbar font-mono text-[9px] font-black uppercase tracking-wider">
                {PRESET_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-md transition shrink-0 cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold shadow-md' 
                        : 'bg-slate-900/40 border border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Scrollable Presets Grid */}
              <div className="max-h-[52vh] overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
                {(() => {
                  const filtered = PRESETS.filter(p => {
                    if (selectedCategory === 'All') return true;
                    const meta = PRESET_METADATA[p.id];
                    return meta && meta.category === selectedCategory;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-slate-500 text-xs italic text-center py-12 font-mono">
                        No presets found for this category.
                      </div>
                    );
                  }

                  return filtered.map(preset => {
                    const meta = PRESET_METADATA[preset.id] || { category: preset.specialty, difficulty: 'Medium', duration: 90, teachingObjective: preset.description, challenges: [] };
                    const isActive = selectedPresetId === preset.id;
                    const cleanName = preset.name.split(' - ')[1] || preset.name;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 ${
                          isActive 
                            ? 'border-cyan-500 bg-cyan-950/15 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.01]' 
                            : 'border-slate-800/80 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">{meta.category}</span>
                            {preset.jaffeProcedureId && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-800/60 text-amber-400" title="Includes a full procedural case brief">
                                📋 PROCEDURE GUIDE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">⏱️ {meta.duration} min</span>
                            <span className={`px-2 py-0.5 rounded border font-bold ${
                              meta.difficulty === 'Easy' ? 'bg-green-950/30 border-green-900/50 text-green-400' :
                              meta.difficulty === 'Medium' ? 'bg-yellow-950/30 border-yellow-900/50 text-yellow-400' :
                              'bg-red-950/30 border-red-900/50 text-red-400'
                            }`}>
                              {meta.difficulty}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-100">{cleanName}</h4>
                          {(preset.chf || preset.cad || preset.as) && (
                            <Heart size={12} className="text-red-500 animate-pulse shrink-0" />
                          )}
                        </div>

                        <div className="text-[10px] text-cyan-305/90 font-medium leading-relaxed font-mono mt-0.5">
                          <span className="text-slate-500 uppercase font-black tracking-wider text-[8px] mr-1.5">Focus:</span>
                          {meta.teachingObjective}
                        </div>

                        {isActive && meta.challenges && meta.challenges.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1.5 border-t border-slate-900 pt-2 animate-in slide-in-from-top-1 duration-150">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest font-mono">Key Challenges:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {meta.challenges.map((ch, idx) => (
                                <span key={idx} className="bg-red-950/20 border border-red-900/30 text-red-400 text-[8.5px] px-1.5 py-0.5 rounded font-mono">
                                  ⚠️ {ch}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Random case staging panel */}
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-950/60 p-4 border border-slate-850 rounded-xl gap-4 shadow-lg shrink-0 mt-2">
                <div className="flex items-center gap-3">
                  <Dices size={24} className="text-slate-500 animate-pulse" />
                  <div>
                    <span className="text-slate-400 text-[10px] font-black block uppercase tracking-wider font-mono">Quick Random Staging</span>
                    <span className="text-[11px] text-slate-500 leading-tight">Instantly stage a random case filtered by difficulty.</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button onClick={() => stageRandomByDifficulty('Easy')} className="px-3 py-2 rounded-lg font-bold text-[10px] bg-green-950/60 border border-green-800/80 text-green-400 hover:bg-green-900/40 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer font-mono">
                    EASY
                  </button>
                  <button onClick={() => stageRandomByDifficulty('Medium')} className="px-3 py-2 rounded-lg font-bold text-[10px] bg-yellow-950/60 border border-yellow-800/80 text-yellow-400 hover:bg-yellow-900/40 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer font-mono">
                    MEDIUM
                  </button>
                  <button onClick={() => stageRandomByDifficulty('Hard')} className="px-3 py-2 rounded-lg font-bold text-[10px] bg-red-950/60 border border-red-800/80 text-red-400 hover:bg-red-900/40 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer font-mono">
                    HARD
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Pre-Op Staging Review Card */}
            <div className="lg:col-span-5 bg-slate-950/50 border border-slate-850 p-6 rounded-xl flex flex-col gap-5 shadow-inner">
              {(() => {
                const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];
                const meta = PRESET_METADATA[currentPreset.id] || { category: currentPreset.specialty, teachingObjective: currentPreset.description, challenges: [] };
                const diffInfo = calculateDifficulty(currentPreset);
                const cleanName = currentPreset.name.split(' - ')[1] || currentPreset.name;

                return (
                  <>
                    <div className="border-b border-slate-850/60 pb-3 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-cyan-400 font-black uppercase tracking-wider bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/50 font-mono">
                            {currentPreset.specialty}
                          </span>
                          {currentPreset.jaffeProcedureId && (
                            <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60 font-mono" title="Includes a full procedural case brief">
                              📋 PROCEDURE GUIDE
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded border font-bold text-[9px] font-mono ${
                          diffInfo.level === 'Easy' ? 'bg-green-950/40 border-green-800 text-green-400' :
                          diffInfo.level === 'Medium' ? 'bg-yellow-950/40 border-yellow-800 text-yellow-400' :
                          'bg-red-950/40 border-red-800 text-red-400'
                        }`}>
                          {diffInfo.level}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-100">{cleanName}</h3>
                      <div className="text-[10px] text-slate-400 leading-normal font-mono">
                        <span className="text-slate-500 uppercase font-black tracking-wider text-[8px] mr-1">Procedure:</span>
                        {currentPreset.procedure}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider font-mono">Clinical Presentation</span>
                      <p className="text-slate-300 text-xs leading-relaxed font-sans">{currentPreset.description}</p>
                    </div>

                    {/* Vitals & Demographics Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-400 font-mono bg-slate-950/90 p-4 rounded-lg border border-slate-900">
                      <div>
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">Age & Sex</span>
                        <span className="font-bold text-slate-200 text-xs">{currentPreset.age}yo / {currentPreset.sex.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">Weight & Height</span>
                        <span className="font-bold text-slate-200 text-xs">{currentPreset.weight} kg / {currentPreset.height} cm</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">Baseline Vitals</span>
                        <span className="font-bold text-cyan-400 text-xs">{currentPreset.hr} bpm | {currentPreset.sys}/{currentPreset.dia} mmHg</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">Airway Classification</span>
                        <span className="font-bold text-yellow-300 text-xs">Mallampati {currentPreset.mallampati} | {currentPreset.position}</span>
                      </div>
                    </div>

                    {/* Teaching Challenges */}
                    {meta.challenges && meta.challenges.length > 0 && (
                      <div className="flex flex-col gap-2.5 border-t border-slate-900 pt-3">
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider font-mono">Physiological Challenges</span>
                        <div className="flex flex-wrap gap-1.5">
                          {meta.challenges.map((ch, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono font-medium flex items-center gap-1.5"
                            >
                              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse"></span>
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Primary Stage Action Button */}
                    <button
                      onClick={() => {
                        applyPresetToForm(currentPreset);
                        handleStageCase(currentPreset);
                      }}
                      className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-950/40 transition-all duration-200 hover:scale-[1.02] active:scale-98 animate-pulse cursor-pointer flex items-center justify-center gap-2"
                    >
                      Stage Selected Case &rarr;
                    </button>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 font-sans">
          
          {/* Preset templates quickloader */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2.5 items-center">
              <Settings size={18} className="text-cyan-500 animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider font-mono block">Load Template Preset Base</span>
                <span className="text-xs font-black text-cyan-400 font-mono uppercase">{customForm.name}</span>
              </div>
            </div>
            <div className="w-full sm:w-auto flex flex-col gap-1">
              <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block font-mono">Select Template Scenario</label>
              <select 
                value={activePresetId} 
                onChange={(e) => {
                  const selected = PRESETS.find(p => p.id === e.target.value);
                  if (selected) applyPresetToForm(selected);
                }}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2 outline-none text-xs font-bold w-full sm:w-72 cursor-pointer hover:border-cyan-500 focus:border-cyan-500 transition font-mono"
              >
                {['Airway & Ventilation', 'Cardiovascular & Hemodynamics', 'Neuromuscular & Neuro', 'Pharmacogenomics & Crisis', 'Obstetrics & Specialty'].map(cat => {
                  const catPresets = PRESETS.filter(p => {
                    const meta = PRESET_METADATA[p.id];
                    return meta && meta.category === cat;
                  });
                  if (catPresets.length === 0) return null;
                  return (
                    <optgroup key={cat} label={cat.toUpperCase()} className="bg-slate-900 text-slate-400 font-bold font-mono">
                      {catPresets.map(p => {
                        const cleanName = p.name.split(' - ')[1] || p.name;
                        return (
                          <option key={p.id} value={p.id} className="bg-slate-950 text-white font-bold font-mono">
                            {cleanName}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Sticky Case Staging Metrics & Action */}
            <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-4">
              
              <div className="bg-slate-950/50 border border-slate-850 p-5 rounded-xl flex flex-col gap-4 shadow-inner">
                <h3 className="text-cyan-400 font-extrabold uppercase tracking-widest text-[10px] border-b border-slate-900 pb-2 font-mono flex items-center gap-1.5">
                  <Info size={12}/> Live Physiological Metrics
                </h3>

                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-905 text-[10px] flex flex-col gap-1.5 font-mono text-slate-350 leading-relaxed">
                  <div className="flex justify-between border-b border-slate-900 pb-1 font-bold text-cyan-400">
                    <span>INDEXED METRIC</span>
                    <span>VALUE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BMI (Body Mass Index)</span>
                    <span className={`font-bold ${demographics.bmi > 30 ? "text-yellow-400" : "text-green-400"}`}>{demographics.bmi} kg/m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IBW (Ideal Body Wt)</span>
                    <span className="font-bold text-slate-100">{demographics.ibw} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LBW (Lean Body Wt)</span>
                    <span className="font-bold text-slate-100">{demographics.lbw} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EBV (Estimated Blood Vol)</span>
                    <span className="font-bold text-slate-100">{demographics.ebv} mL</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-slate-900 pt-1.5 font-bold text-yellow-500">
                    <span>LUNG VOLUMES ({customForm.position})</span>
                    <span>PREDICTED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FRC (Func Residual Cap)</span>
                    <span className="font-bold text-slate-100">{demographics.lung.frc_mL || 0} mL</span>
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
                    <div className="text-[9px] text-yellow-500/80 italic mt-1 leading-tight border-t border-slate-900/60 pt-1.5">
                      ⚠️ Obesity decay factor: {demographics.lung.obesityFactor} applied to starting FRC volume.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 border-t border-slate-900 pt-3">
                  <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider font-mono">Calculated Case Difficulty</span>
                  <span className={`text-xl font-black uppercase tracking-widest font-mono ${currDiff.color}`}>{currDiff.level}</span>
                </div>

                <button 
                  onClick={() => handleStageCase(customForm)} 
                  className={`w-full mt-2 py-3.5 rounded-lg font-black text-xs uppercase tracking-widest bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white border border-cyan-500/20 shadow-lg shadow-cyan-950/45 hover:scale-[1.02] active:scale-98 transition duration-150 animate-pulse cursor-pointer flex items-center justify-center gap-1.5`}
                >
                  Stage Custom Scenario &rarr;
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Settings Workspace */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-1.5 font-mono text-[9px] font-black uppercase tracking-wider">
                {[
                  { id: 'demographics', label: '👤 Demographics' },
                  { id: 'cardiopulmonary', label: '🫁 Cardio & Pulm' },
                  { id: 'neurogenetics', label: '🧠 Neuro & Genetics' },
                  { id: 'hemeendocrine', label: '🩸 Heme & Endo' },
                  { id: 'specialty', label: '🔬 Specialty Systems' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCustomTab(tab.id)}
                    className={`px-3 py-2 rounded-md transition cursor-pointer ${
                      activeCustomTab === tab.id
                        ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold shadow-md'
                        : 'bg-slate-900/40 border border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Panel */}
              <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-xl flex flex-col gap-6 min-h-[55vh]">
                
                {/* 1. DEMOGRAPHICS & SURGERY */}
                {activeCustomTab === 'demographics' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 font-mono">
                      Scenario & Demographics
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Scenario Name</label>
                      <input 
                        type="text" 
                        value={customForm.name} 
                        onChange={e => setCustomForm({...customForm, name: e.target.value})} 
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-bold outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Age</label>
                        <input 
                          type="number" 
                          min={18} 
                          max={99} 
                          value={customForm.age} 
                          onChange={e => setCustomForm({...customForm, age: Math.max(18, Math.min(99, Number(e.target.value)))})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono" 
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Sex</label>
                        <select 
                          value={customForm.sex} 
                          onChange={e => setCustomForm({...customForm, sex: e.target.value})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Height (cm)</label>
                        <input 
                          type="number" 
                          value={customForm.height} 
                          onChange={e => setCustomForm({...customForm, height: Number(e.target.value)})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono" 
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Weight (kg)</label>
                        <input 
                          type="number" 
                          value={customForm.weight} 
                          onChange={e => setCustomForm({...customForm, weight: Number(e.target.value)})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono" 
                        />
                      </div>
                    </div>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Airway & Fasting
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Mallampati Class</label>
                        <select 
                          value={customForm.mallampati} 
                          onChange={e => setCustomForm({...customForm, mallampati: Number(e.target.value)})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value={1}>Class I</option>
                          <option value={2}>Class II</option>
                          <option value={3}>Class III</option>
                          <option value={4}>Class IV</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Neck Mobility</label>
                        <select 
                          value={customForm.neckMobility} 
                          onChange={e => setCustomForm({...customForm, neckMobility: e.target.value})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="normal">Normal Extension</option>
                          <option value="reduced">Reduced / Limited</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-300 select-none cursor-pointer pt-4 self-center">
                        <input 
                          type="checkbox" 
                          checked={customForm.airwayBlood} 
                          onChange={e => setCustomForm({...customForm, airwayBlood: e.target.checked})} 
                          className="w-4 h-4 rounded border-slate-700 text-cyan-600 bg-slate-900 focus:ring-cyan-500" 
                        />
                        <span>Airway Blood / Vomit</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs mt-2 border-t border-slate-900 pt-3">
                      <div className="flex items-center justify-between bg-slate-900/35 p-2.5 rounded-lg border border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">NPO Solids (hrs)</span>
                        <input 
                          type="number" 
                          min={0} 
                          value={customForm.npoSolids} 
                          onChange={e => setCustomForm({...customForm, npoSolids: Number(e.target.value)})} 
                          className="bg-slate-950 border border-slate-700 text-white text-center w-12 p-1 rounded text-xs font-bold font-mono outline-none" 
                        />
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/35 p-2.5 rounded-lg border border-slate-900">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">NPO Liquids (hrs)</span>
                        <input 
                          type="number" 
                          min={0} 
                          value={customForm.npoLiquids} 
                          onChange={e => setCustomForm({...customForm, npoLiquids: Number(e.target.value)})} 
                          className="bg-slate-950 border border-slate-700 text-white text-center w-12 p-1 rounded text-xs font-bold font-mono outline-none" 
                        />
                      </div>
                    </div>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Surgical Procedure
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">
                        Procedure Library <span className="text-slate-600 normal-case font-semibold">(optional -- pairs any patient below with a full case brief)</span>
                      </label>
                      <select
                        value={customForm.jaffeProcedureId || ''}
                        onChange={e => {
                          const proc = JAFFE_PROCEDURES.find(p => p.id === e.target.value);
                          setCustomForm({
                            ...customForm,
                            jaffeProcedureId: proc ? proc.id : null,
                            procedure: proc ? proc.name : customForm.procedure,
                            position: (proc && normalizeJaffePosition(proc.surgical.position)) || customForm.position,
                          });
                        }}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-bold outline-none focus:border-cyan-500"
                      >
                        <option value="">-- Not selected (free-text procedure below) --</option>
                        {Object.entries(JAFFE_PROCEDURES_BY_SUBSPECIALTY).map(([subspecialty, procs]) => (
                          <optgroup key={subspecialty} label={subspecialty}>
                            {procs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Procedure Name</label>
                      <input
                        type="text"
                        value={customForm.procedure}
                        onChange={e => setCustomForm({...customForm, procedure: e.target.value, jaffeProcedureId: null})}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-bold outline-none focus:border-cyan-500"
                      />
                    </div>
                    {customForm.jaffeProcedureId && (() => {
                      const proc = JAFFE_PROCEDURES.find(p => p.id === customForm.jaffeProcedureId);
                      if (!proc) return null;
                      const s = proc.surgical;
                      return (
                        <div className="bg-slate-950/60 border border-cyan-900/50 rounded-lg p-3 text-[10px] font-mono text-slate-300 space-y-1">
                          <div className="text-cyan-400 font-black uppercase tracking-wider mb-1.5">📋 Case Brief Preview</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {s.position && <div><span className="text-slate-500">Position:</span> {s.position}</div>}
                            {s.incision && <div><span className="text-slate-500">Incision:</span> {s.incision}</div>}
                            {s.surgicalTimeRange && <div><span className="text-slate-500">Surgical time:</span> {s.surgicalTimeRange}</div>}
                            {s.eblExpected && <div><span className="text-slate-500">EBL:</span> {s.eblExpected}</div>}
                            {s.painScore && <div><span className="text-slate-500">Pain score:</span> {s.painScore}/10</div>}
                            {s.mortality && <div><span className="text-slate-500">Mortality:</span> {s.mortality}</div>}
                          </div>
                          {s.uniqueConsiderations && <div className="pt-1 text-amber-400/90">⚠ {s.uniqueConsiderations}</div>}
                          <div className="text-slate-500 pt-1">Full preop/intraop/postop anesthetic plan available in the Anesthesia Plan tab once the case is staged.</div>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Expected EBL</label>
                        <select 
                          value={customForm.ebl} 
                          onChange={e => setCustomForm({...customForm, ebl: e.target.value})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="Low">Low (&lt;200 mL)</option>
                          <option value="Moderate">Moderate (500 mL)</option>
                          <option value="High">High (&gt;1500 mL)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Position</label>
                        <select 
                          value={customForm.position} 
                          onChange={e => setCustomForm({...customForm, position: e.target.value})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono"
                        >
                          <option value="Supine">Supine</option>
                          <option value="Ramped">Ramped</option>
                          <option value="Sitting">Sitting</option>
                          <option value="Prone">Prone</option>
                          <option value="Lateral">Lateral</option>
                          <option value="Lithotomy">Lithotomy</option>
                          <option value="Trendelenburg">Trendelenburg</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">Surgical Duration (min)</label>
                        <input 
                          type="number" 
                          value={customForm.duration} 
                          onChange={e => setCustomForm({...customForm, duration: Number(e.target.value)})} 
                          className="bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none focus:border-cyan-500 font-mono" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CARDIOVASCULAR & PULMONARY */}
                {activeCustomTab === 'cardiopulmonary' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 font-mono">
                      Cardiovascular Diseases
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.cad} onChange={e => setCustomForm({...customForm, cad: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Coronary Artery Disease</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.as} onChange={e => setCustomForm({...customForm, as: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Aortic Stenosis</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.afib} onChange={e => setCustomForm({...customForm, afib: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Atrial Fibrillation</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-355 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.htn} onChange={e => setCustomForm({...customForm, htn: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Hypertension</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.avDissociation} onChange={e => setCustomForm({...customForm, avDissociation: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>AV Dissociation</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.hasPFO} onChange={e => setCustomForm({...customForm, hasPFO: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Patent Foramen Ovale (PFO)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.tricuspidRegurgitation} onChange={e => setCustomForm({...customForm, tricuspidRegurgitation: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Tricuspid Regurgitation</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.mitralRegurgitation} onChange={e => setCustomForm({...customForm, mitralRegurgitation: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Mitral Regurgitation</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.carcinoidTumor} onChange={e => setCustomForm({...customForm, carcinoidTumor: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Carcinoid Tumor (Crisis risk)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.chf} onChange={e => setCustomForm({...customForm, chf: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>Heart Failure (CHF)</span>
                        </label>
                        {customForm.chf && (
                          <div className="flex items-center justify-between text-xs animate-in slide-in-from-top-1 duration-150 pl-6">
                            <span className="text-slate-400 font-mono">Ejection Fraction (EF %)</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min={10} 
                                max={75} 
                                value={customForm.ef} 
                                onChange={e => setCustomForm({...customForm, ef: Number(e.target.value)})} 
                                className="bg-slate-950 border border-slate-850 text-white p-1 rounded text-center w-16 font-mono text-xs outline-none" 
                              />
                              <span className="text-slate-400 font-mono">%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.pheo} onChange={e => setCustomForm({...customForm, pheo: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>Pheochromocytoma</span>
                        </label>
                        {customForm.pheo && (
                          <label className="flex items-center gap-2 text-xs pl-6 cursor-pointer text-slate-400 animate-in slide-in-from-top-1 duration-150 select-none">
                            <input type="checkbox" checked={customForm.pheoBlockadeAdequate} onChange={e => setCustomForm({...customForm, pheoBlockadeAdequate: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>Alpha-blockade adequate?</span>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.phPresent} onChange={e => setCustomForm({...customForm, phPresent: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Pulmonary Arterial Hypertension (PAH)</span>
                      </label>
                      {customForm.phPresent && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-6 animate-in slide-in-from-top-2 duration-150 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-450 text-[10px] font-mono uppercase">WHO Group</span>
                            <select value={customForm.phWhoGroup} onChange={e => setCustomForm({...customForm, phWhoGroup: Number(e.target.value)})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none">
                              <option value={1}>Group 1 (PAH)</option>
                              <option value={2}>Group 2 (LHD)</option>
                              <option value={3}>Group 3 (Lung Disease)</option>
                              <option value={4}>Group 4 (CTEPH)</option>
                              <option value={5}>Group 5 (Unclear/Misc)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-455 text-[10px] font-mono uppercase">Severity</span>
                            <select value={customForm.phSeverity} onChange={e => setCustomForm({...customForm, phSeverity: e.target.value})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none">
                              <option value="mild">Mild</option>
                              <option value="moderate">Moderate</option>
                              <option value="severe">Severe</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-450 text-[10px] font-mono uppercase">Baseline mPAP (mmHg)</span>
                            <input type="number" min={15} max={80} value={customForm.baselineMpap} onChange={e => setCustomForm({...customForm, baselineMpap: Number(e.target.value)})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none font-mono" />
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Pulmonary Comorbidities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex flex-col gap-1 bg-slate-900/35 p-2 rounded border border-slate-900">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider font-mono">COPD Severity</label>
                        <select 
                          value={customForm.pulmonaryComorbidity || (customForm.copd ? 'copd gold ii' : 'none')} 
                          onChange={e => {
                            const val = e.target.value;
                            setCustomForm({
                              ...customForm, 
                              pulmonaryComorbidity: val === 'none' ? null : val,
                              copd: val !== 'none' && val.includes('copd')
                            });
                          }}
                          className="bg-slate-900 text-white border border-slate-700 rounded p-1 text-xs outline-none"
                        >
                          <option value="none">None</option>
                          <option value="copd gold i">GOLD I (Mild)</option>
                          <option value="copd gold ii">GOLD II (Moderate)</option>
                          <option value="copd gold iii">GOLD III (Severe)</option>
                          <option value="copd gold iv">GOLD IV (Very Severe)</option>
                        </select>
                      </div>
                      
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition justify-center select-none">
                        <input type="checkbox" checked={customForm.asthma} onChange={e => setCustomForm({...customForm, asthma: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Active Bronchospastic Asthma</span>
                      </label>
                      
                      <label className="flex items-center gap-2 text-xs text-slate-355 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition justify-center select-none">
                        <input type="checkbox" checked={customForm.restrictive} onChange={e => setCustomForm({...customForm, restrictive: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Restrictive Lung Disease</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900 mt-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.pneumoperitoneumActive} onChange={e => setCustomForm({...customForm, pneumoperitoneumActive: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Active Laparoscopic Pneumoperitoneum (CO2 insufflation)</span>
                      </label>
                      {customForm.pneumoperitoneumActive && (
                        <div className="flex items-center justify-between text-xs pl-6 animate-in slide-in-from-top-1 duration-150">
                          <span className="text-slate-400 font-mono">Intra-abdominal Pressure (IAP mmHg)</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min={5} 
                              max={25} 
                              value={customForm.iapMmHg} 
                              onChange={e => setCustomForm({...customForm, iapMmHg: Number(e.target.value)})} 
                              className="bg-slate-950 border border-slate-800 text-white p-1 rounded text-center w-16 font-mono text-xs outline-none" 
                            />
                            <span className="text-slate-400 font-mono">mmHg</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. NEUROMUSCULAR & GENETICS */}
                {activeCustomTab === 'neurogenetics' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 font-mono">
                      Neuromuscular Conditions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.mhSusceptible} onChange={e => setCustomForm({...customForm, mhSusceptible: e.target.checked})} className="w-4 h-4 rounded text-red-500 accent-red-500" />
                        <span className="text-red-400 font-bold">MH Susceptible ⚠️</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none" title="Triggers lethal hyperkalemic surge on Succinylcholine!">
                        <input type="checkbox" checked={customForm.burns || customForm.immobility} onChange={e => setCustomForm({...customForm, burns: e.target.checked, immobility: e.target.checked})} className="w-4 h-4 rounded text-red-500 accent-red-500" />
                        <span className="text-red-400 font-bold">Upregulated AChR ⚠️</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.dmd} onChange={e => setCustomForm({...customForm, dmd: e.target.checked})} className="w-4 h-4 rounded text-red-500 accent-red-500" />
                        <span className="text-red-400 font-bold">Duchenne Dystrophy ⚠️</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.bmd} onChange={e => setCustomForm({...customForm, bmd: e.target.checked})} className="w-4 h-4 rounded text-red-500 accent-red-500" />
                        <span className="text-red-400 font-bold">Becker Dystrophy ⚠️</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.cmt} onChange={e => setCustomForm({...customForm, cmt: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Charcot-Marie-Tooth</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.elms} onChange={e => setCustomForm({...customForm, elms: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Eaton-Lambert</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.cip} onChange={e => setCustomForm({...customForm, cip: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Critical Illness Poly.</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.mitochondrial} onChange={e => setCustomForm({...customForm, mitochondrial: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Mitochondrial Myo.</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none" title="K+ triggers attacks. Succinylcholine & Neostigmine contraindicated.">
                        <input type="checkbox" checked={customForm.hyperPP} onChange={e => setCustomForm({...customForm, hyperPP: e.target.checked, hypoPP: e.target.checked ? false : customForm.hypoPP})} className="w-4 h-4 rounded text-yellow-500 accent-yellow-500" />
                        <span>Hyperkalemic PP ⚠️</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none" title="Avoid glucose, catecholamines, long NMBAs. Possible MH link.">
                        <input type="checkbox" checked={customForm.hypoPP} onChange={e => setCustomForm({...customForm, hypoPP: e.target.checked, hyperPP: e.target.checked ? false : customForm.hyperPP})} className="w-4 h-4 rounded text-yellow-500 accent-yellow-500" />
                        <span>Hypokalemic PP ⚠️</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.mg} onChange={e => setCustomForm({...customForm, mg: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Myasthenia Gravis</span>
                      </label>
                      {customForm.mg && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 text-xs animate-in slide-in-from-top-1 duration-150 border-l border-slate-800 ml-2">
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-455 font-mono">MG Duration (yrs)</span>
                            <input type="number" min={0} value={customForm.mgDurationYears} onChange={e => setCustomForm({...customForm, mgDurationYears: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-450 font-mono">Pyridostigmine (mg/day)</span>
                            <input type="number" min={0} value={customForm.pyridostigmineDoseMgPerDay} onChange={e => setCustomForm({...customForm, pyridostigmineDoseMgPerDay: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-450 font-mono">Anti-AChR Ab (U/mL)</span>
                            <input type="number" min={0} value={customForm.antiAchR} onChange={e => setCustomForm({...customForm, antiAchR: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-455 font-mono">Vital Capacity (L)</span>
                            <input type="number" step={0.1} min={0.5} max={6} value={customForm.vitalCapacity} onChange={e => setCustomForm({...customForm, vitalCapacity: parseFloat(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                            <input type="checkbox" checked={customForm.bulbarSymptoms} onChange={e => setCustomForm({...customForm, bulbarSymptoms: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>Bulbar Symptoms Present</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                            <input type="checkbox" checked={customForm.historyMyasthenicCrisis} onChange={e => setCustomForm({...customForm, historyMyasthenicCrisis: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>History of Myasthenic Crisis</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer col-span-2 select-none">
                            <input type="checkbox" checked={customForm.decrementalResponse} onChange={e => setCustomForm({...customForm, decrementalResponse: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>EMG Decremental Response (&gt;10%)</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Enzymatic & Genetic Modifiers
                    </h3>
                    <div className="flex flex-col gap-2.5 bg-slate-900/35 p-3 rounded border border-slate-900 text-xs">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono font-black">Pseudocholinesterase Genotype</span>
                      <div className="flex items-center gap-4">
                        <select 
                          value={customForm.butyrylcholinesteraseVariant || 'normal'} 
                          onChange={e => setCustomForm({...customForm, butyrylcholinesteraseVariant: e.target.value})} 
                          className="bg-slate-950 border border-slate-800 text-[11px] text-white rounded p-1 w-64 outline-none"
                        >
                          <option value="normal">Normal (E1u-E1u, DN 80)</option>
                          <option value="heterozygous">Heterozygous (E1u-E1a, DN 50)</option>
                          <option value="atypical">Atypical (E1a-E1a, DN 20)</option>
                        </select>
                        <span className="text-[10px] text-slate-455 font-mono">Dibucaine Number (DN): {customForm.butyrylcholinesteraseVariant === 'heterozygous' ? 50 : (customForm.butyrylcholinesteraseVariant === 'atypical' ? 20 : 80)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 bg-slate-900/35 p-3 rounded border border-slate-900 text-xs">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono font-black font-mono">Channel / Receptor Knockouts (Sensitivity modification)</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.isTASK1Knockout} onChange={e => setCustomForm({...customForm, isTASK1Knockout: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>TASK-1 Knockout (Volatile resistance 1.3x)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.isTASK3Knockout} onChange={e => setCustomForm({...customForm, isTASK3Knockout: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>TASK-3 Knockout (Volatile resistance 1.4x)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.isTREK1Knockout} onChange={e => setCustomForm({...customForm, isTREK1Knockout: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>TREK-1 Knockout (Volatile resistance 1.5x)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.isHCN1Knockout} onChange={e => setCustomForm({...customForm, isHCN1Knockout: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>HCN1 Knockout (Hypnotic resistance)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. HEMATOLOGY & ENDOCRINE */}
                {activeCustomTab === 'hemeendocrine' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 font-mono">
                      Hematology & Coagulation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.anemia} onChange={e => setCustomForm({...customForm, anemia: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Anemia</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.thrombocytopenia} onChange={e => setCustomForm({...customForm, thrombocytopenia: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Thrombocytopenia</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/35 p-2 rounded border border-slate-900 hover:border-slate-800 transition select-none">
                        <input type="checkbox" checked={customForm.coagulopathy} onChange={e => setCustomForm({...customForm, coagulopathy: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>General Coagulopathy</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-350 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.hasVWD} onChange={e => setCustomForm({...customForm, hasVWD: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Von Willebrand Disease (VWD)</span>
                      </label>
                      {customForm.hasVWD && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-6 animate-in slide-in-from-top-1 duration-150 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-450 text-[10px] font-mono uppercase">VWD Type</span>
                            <select value={customForm.vwdType} onChange={e => setCustomForm({...customForm, vwdType: e.target.value})} className="bg-slate-950 border border-slate-805 text-white rounded p-1 text-xs outline-none">
                              <option value="1">Type 1 (Mild/Moderate)</option>
                              <option value="2">Type 2 (Qualitative)</option>
                              <option value="3">Type 3 (Severe/Complete)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-450 text-[10px] font-mono uppercase">VWF Activity (%)</span>
                            <input type="number" min={0} max={100} value={customForm.vwfActivityPercent} onChange={e => setCustomForm({...customForm, vwfActivityPercent: Number(e.target.value)})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none font-mono" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-455 text-[10px] font-mono uppercase">Factor VIII (%)</span>
                            <input type="number" min={0} max={100} value={customForm.factorVIIIPercent} onChange={e => setCustomForm({...customForm, factorVIIIPercent: Number(e.target.value)})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none font-mono" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-350 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.hemophiliaA} onChange={e => setCustomForm({...customForm, hemophiliaA: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Hemophilia A</span>
                      </label>
                      {customForm.hemophiliaA && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-1 duration-150 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-450 text-[10px] font-mono uppercase">Factor VIII Activity Level (%)</span>
                            <input type="number" min={0} max={100} value={customForm.factorVIIIPercent} onChange={e => setCustomForm({...customForm, factorVIIIPercent: Number(e.target.value)})} className="bg-slate-950 border border-slate-805 text-white rounded p-1 text-xs outline-none font-mono" />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer self-end pb-1.5 select-none">
                            <input type="checkbox" checked={customForm.hemophiliaInhibitors} onChange={e => setCustomForm({...customForm, hemophiliaInhibitors: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>Acquired Inhibitors present?</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/20 p-3 rounded-lg border border-slate-900 hover:border-slate-800 transition select-none">
                      <input type="checkbox" checked={customForm.hemophiliaB} onChange={e => setCustomForm({...customForm, hemophiliaB: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                      <span>Hemophilia B (Factor IX deficiency)</span>
                    </label>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Endocrine & Metabolism
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.diabetes} onChange={e => setCustomForm({...customForm, diabetes: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>Diabetes Mellitus</span>
                        </label>
                        {customForm.diabetes && (
                          <label className="flex items-center gap-2 text-xs pl-6 cursor-pointer text-slate-400 animate-in slide-in-from-top-1 duration-150 select-none">
                            <input type="checkbox" checked={customForm.insulin} onChange={e => setCustomForm({...customForm, insulin: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>Insulin-Dependent (IDDM)</span>
                          </label>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.penicillinAllergy} onChange={e => setCustomForm({...customForm, penicillinAllergy: e.target.checked})} className="w-4 h-4 rounded text-red-500 accent-red-500" />
                          <span className="text-red-400">Penicillin Allergy ⚠️</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900 font-sans">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.chronicPrednisoneDoseMgPerDay > 0} 
                          onChange={e => {
                            const active = e.target.checked;
                            setCustomForm({
                              ...customForm,
                              chronicPrednisoneDoseMgPerDay: active ? 15 : 0,
                              chronicSteroidDurationWeeks: active ? 24 : 0
                            });
                          }} 
                          className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" 
                        />
                        <span>Chronic Corticosteroid Therapy (Adrenal Suppression risk)</span>
                      </label>
                      {customForm.chronicPrednisoneDoseMgPerDay > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-1 duration-150 text-xs">
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-450 font-mono">Prednisone Dose (mg/day)</span>
                            <input type="number" min={1} value={customForm.chronicPrednisoneDoseMgPerDay} onChange={e => setCustomForm({...customForm, chronicPrednisoneDoseMgPerDay: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-455 font-mono">Therapy Duration (wks)</span>
                            <input type="number" min={1} value={customForm.chronicSteroidDurationWeeks} onChange={e => setCustomForm({...customForm, chronicSteroidDurationWeeks: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. SPECIALIZED SYSTEMS */}
                {activeCustomTab === 'specialty' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 font-mono">
                      Pregnancy & Obstetrics
                    </h3>
                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900 text-xs">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.isPregnant} onChange={e => setCustomForm({...customForm, isPregnant: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                        <span>Active Pregnancy (Term gestational physiological changes)</span>
                      </label>
                      {customForm.isPregnant && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-1 duration-150">
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-455 font-mono">Gestational Age (weeks)</span>
                            <input type="number" min={20} max={42} value={customForm.gestationalAgeWeeks} onChange={e => setCustomForm({...customForm, gestationalAgeWeeks: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <label className="flex items-center gap-2 text-slate-400 cursor-pointer self-center pl-2 select-none">
                            <input type="checkbox" checked={customForm.deliveryOccurred} onChange={e => setCustomForm({...customForm, deliveryOccurred: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>Delivery Occurred (PPH active status)</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Thermal Burns & Inhalation Injury
                    </h3>
                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900 text-xs font-sans">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-305 cursor-pointer select-none">
                        <input type="checkbox" checked={customForm.burns} onChange={e => setCustomForm({...customForm, burns: e.target.checked})} className="w-4 h-4 rounded text-red-500 accent-red-500" />
                        <span className="text-red-400 font-bold">Active Thermal Burn Injury</span>
                      </label>
                      {customForm.burns && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-1 duration-150">
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-450 font-mono">Total Burn Surface Area (%)</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min={0} max={100} value={customForm.burnsTBSAPercent} onChange={e => setCustomForm({...customForm, burnsTBSAPercent: Number(e.target.value)})} className="bg-slate-900 border border-slate-805 text-white text-center w-12 p-0.5 rounded font-mono outline-none" />
                              <span className="text-slate-500">%</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                            <span className="text-slate-455 font-mono">Hours Post-Burn</span>
                            <input type="number" min={0} value={customForm.hoursPostBurn} onChange={e => setCustomForm({...customForm, hoursPostBurn: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-12 p-0.5 rounded font-mono outline-none" />
                          </div>
                          <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                            <input type="checkbox" checked={customForm.inhalationInjury} onChange={e => setCustomForm({...customForm, inhalationInjury: e.target.checked})} className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-500" />
                            <span>Inhalation Airway Injury present</span>
                          </label>
                          {customForm.inhalationInjury && (
                            <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded col-span-2">
                              <span className="text-slate-450 font-mono text-[10px] pl-4">Inhalation Severity (0.1 to 1.0)</span>
                              <input type="number" step={0.1} min={0.1} max={1.0} value={customForm.inhalationSeverity} onChange={e => setCustomForm({...customForm, inhalationSeverity: parseFloat(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-12 p-0.5 rounded font-mono outline-none" />
                            </div>
                          )}
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded col-span-2 mt-1">
                            <span className="text-slate-455 font-mono">Initial Carboxyhemoglobin (COHb %)</span>
                            <div className="flex items-center gap-1">
                              <input type="number" step={1} min={1} max={80} value={customForm.coHb} onChange={e => setCustomForm({...customForm, coHb: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-12 p-0.5 rounded font-mono outline-none" />
                              <span className="text-slate-500">%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest border-b border-slate-900 pb-2 mt-4 font-mono">
                      Specialized Organ Systems
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      
                      <div className="flex flex-col gap-2 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.hasSpinalCordInjuryAboveT6} onChange={e => setCustomForm({...customForm, hasSpinalCordInjuryAboveT6: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>Spinal Cord Injury (above T6)</span>
                        </label>
                        <span className="text-[9.5px] text-slate-550 leading-normal pl-6 font-mono">
                          Activates severe autonomic dysreflexia reflex loops in response to bladder stimulation.
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <span className="text-[10px] text-slate-405 uppercase font-black tracking-wider font-mono">BPH severity (TURP syndrome trigger)</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-slate-505 font-mono">BPH Rating (0.0 to 1.0)</span>
                          <input type="number" step={0.1} min={0.0} max={1.0} value={customForm.bphSeverity} onChange={e => setCustomForm({...customForm, bphSeverity: parseFloat(e.target.value)})} className="bg-slate-950 border border-slate-800 text-white text-center w-16 p-0.5 rounded font-mono outline-none" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 bg-slate-900/20 p-3 rounded-lg border border-slate-900 font-sans">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-355 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.maoisActive} onChange={e => setCustomForm({...customForm, maoisActive: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>Active MAOI Therapy (Phenelzine)</span>
                        </label>
                        {customForm.maoisActive && (
                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded pl-6 animate-in slide-in-from-top-1 duration-150">
                            <span className="text-slate-450 font-mono text-[10px]">Washout Days Remaining</span>
                            <input type="number" min={0} max={14} value={customForm.maoiWashoutDaysRemaining} onChange={e => setCustomForm({...customForm, maoiWashoutDaysRemaining: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 text-white text-center w-12 p-0.5 rounded font-mono outline-none" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-355 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.g6pdDeficiency} onChange={e => setCustomForm({...customForm, g6pdDeficiency: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>G6PD Deficiency (Oxidative hemolysis risk)</span>
                        </label>
                        <span className="text-[9.5px] text-slate-550 leading-normal pl-6 font-mono">
                          Methylene blue triggers severe hemolysis instead of curing MetHb.
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-900/20 p-3 rounded-lg border border-slate-900 text-xs mt-1">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono font-black font-mono">Pharmacogenomic Metabolizer Profiles</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-500 font-mono">CYP2D6 Profile</span>
                          <select value={customForm.cyp2d6Phenotype} onChange={e => setCustomForm({...customForm, cyp2d6Phenotype: e.target.value})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none">
                            <option value="EM">Normal (Extensive - EM)</option>
                            <option value="PM">Poor Metabolizer (PM)</option>
                            <option value="IM">Intermediate Metabolizer (IM)</option>
                            <option value="UM">Ultra-Rapid Metabolizer (UM)</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-500 font-mono">CYP2C9 Profile</span>
                          <select value={customForm.cyp2c9Phenotype} onChange={e => setCustomForm({...customForm, cyp2c9Phenotype: e.target.value})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none">
                            <option value="normal">Normal</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="poor">Poor</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-500 font-mono">CYP2C19 Profile</span>
                          <select value={customForm.cyp2c19Phenotype} onChange={e => setCustomForm({...customForm, cyp2c19Phenotype: e.target.value})} className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none">
                            <option value="normal">Normal</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="poor">Poor</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 border-t border-slate-900 pt-2.5">
                        <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.vkorc1SensitiveAllele} onChange={e => setCustomForm({...customForm, vkorc1SensitiveAllele: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>VKORC1 Sensitive Allele (Warfarin susceptibility)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer select-none">
                          <input type="checkbox" checked={customForm.historyPONV} onChange={e => setCustomForm({...customForm, historyPONV: e.target.checked})} className="w-4 h-4 rounded text-cyan-600 accent-cyan-500" />
                          <span>History of PONV (High Apfel score)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>      )}
    </div>
  );
};