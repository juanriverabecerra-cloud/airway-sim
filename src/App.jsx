import React, { useState, useEffect } from 'react';
import { usePhysiology } from './engine/usePhysiology';
import { Search, Activity } from 'lucide-react';

// Components
import { PatientHeader } from './components/PatientHeader';
import { PrimaryMonitor } from './components/monitors/PrimaryMonitor';
import { VentMonitor } from './components/monitors/VentMonitor';
import { BottomBar } from './components/controls/BottomBar';
import { ActionPanel } from './components/controls/ActionPanel';
import { Pharmacopoeia } from './components/controls/Pharmacopoeia';
import { AirwayPanel } from './components/controls/AirwayPanel';
import { LogPanel } from './components/controls/LogPanel';
import { AccessModal, PocusModal, SetupModal, TubeConfirmModal, AirwayQuizModal, ViewModal } from './components/modals/Modals';

const CASES = [
  {
    id: 'normal', name: 'Elective Surgery (Perfect Baseline)', difficulty: ' Easy',
    description: '45yo Female, ASA 1. Fasting for 12 hours. Normal neck anatomy, Mallampati I. Perfectly stable hemodynamics.',
    baseVitals: { hr: 72, sys: 120, dia: 80, spo2: 99, etco2: 0, rr: 12 },
    patient: { age: 45, sex: 'female', weight: 60, height: 165, ibw: 56, bmi: 22.0, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: false, baseGrade: 1, isSeptic: false, hasCCollar: false, stomach: 'empty', limitedMouth: false, trauma: false }
  },
  {
    id: 'trauma', name: 'Motor Vehicle Trauma (Bloody Airway)', difficulty: ' Hard',
    description: '54yo Male, GCS 7. Facial trauma, active bleeding in airway. Cervical collar in place restricting neck extension.',
    baseVitals: { hr: 115, sys: 105, dia: 65, spo2: 88, etco2: 0, rr: 24 },
    patient: { age: 54, sex: 'male', weight: 85, height: 180, ibw: 75, bmi: 26.2, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: true, isObese: false, baseGrade: 3, isSeptic: false, hasCCollar: true, stomach: 'full', limitedMouth: false, trauma: true }
  },
  {
    id: 'septic', name: 'Septic Shock (Hemodynamic Cliff)', difficulty: ' Hard',
    description: '68yo Male, urosepsis. Profoundly vasodilated, living on endogenous catecholamines. High risk of cardiovascular collapse.',
    baseVitals: { hr: 135, sys: 85, dia: 40, spo2: 92, etco2: 0, rr: 28 },
    patient: { age: 68, sex: 'male', weight: 70, height: 175, ibw: 70, bmi: 22.9, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: false, baseGrade: 2, isSeptic: true, hasCCollar: false, stomach: 'empty', limitedMouth: false, trauma: false }
  },
  {
    id: 'obese', name: 'Morbid Obesity / OSA (Rapid Desat)', difficulty: ' Medium',
    description: '50yo Male, BMI 45, severe Obstructive Sleep Apnea (OSA). Severely decreased Functional Residual Capacity (FRC).',
    baseVitals: { hr: 88, sys: 150, dia: 95, spo2: 94, etco2: 0, rr: 18 },
    patient: { age: 50, sex: 'male', weight: 142, height: 178, bmi: 44.8, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: true, baseGrade: 3, isSeptic: false, hasCCollar: false, stomach: 'full', limitedMouth: false, trauma: false }
  }
];

const TEGVisualizer = React.memo(({ historyData }) => {
  const generateTEGPath = (r, angleDeg, ma) => {
    const scaleX = 2;
    const R_px = r * scaleX;
    const startY = 75;
    const rad = angleDeg * (Math.PI / 180);
    const distanceToMA = (ma / 2) / Math.tan(rad);
    const maX = R_px + distanceToMA;
    const path = `M 0,${startY} L ${R_px},${startY} L ${maX},${startY - (ma/2)} L 300,${startY - (ma/2)} ` +
                 `M 0,${startY} L ${R_px},${startY} L ${maX},${startY + (ma/2)} L 300,${startY + (ma/2)}`;
    return path;
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="w-full h-48 bg-slate-900 rounded-lg border border-slate-700 relative overflow-hidden flex items-center mb-4">
      <div className="absolute left-2 top-2 text-[10px] text-slate-500 font-bold tracking-widest">THROMBOELASTOGRAPHY (OVERLAY)</div>
      <svg viewBox="0 0 300 150" className="w-full h-full preserveAspectRatio-none">
        <line x1="0" y1="75" x2="300" y2="75" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        {historyData && historyData.map((h, i) => (
          <path key={i} d={generateTEGPath(parseFloat(h.results['R'].val), parseFloat(h.results['Angle'].val), parseFloat(h.results['MA'].val))} fill="none" stroke={colors[i % colors.length]} strokeWidth="2" opacity={i === historyData.length - 1 ? 1.0 : 0.4} />
        ))}
      </svg>
      <div className="absolute bottom-2 left-2 flex gap-3">
        {historyData && historyData.map((h, i) => (
          <div key={i} className="flex items-center gap-1 text-[9px] text-white"><div className="w-2 h-2 rounded-full" style={{backgroundColor: colors[i % colors.length]}}></div> @ {h.time}</div>
        ))}
      </div>
    </div>
  );
});

export default function App() {
  const [activeCase, setActiveCase] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [nibp, setNibp] = useState({ sys: 0, dia: 0, time: 0 });
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [labs, setLabs] = useState({});
  const [showLabPanel, setShowLabPanel] = useState(false);
  
  const [airwayQuizModal, setAirwayQuizModal] = useState({ show: false, description: '', trueMallampati: 1 });
  const [accessModal, setAccessModal] = useState({ show: false, category: '' });
  const [tubeConfirmModal, setTubeConfirmModal] = useState({ show: false, result: '' });
  const [viewModal, setViewModal] = useState({ show: false, blade: '', bladeSize: '', tubeSize: '', adjunct: '', description: '', trueGrade: 1 });
  const [setupModal, setSetupModal] = useState(false);
  const [pocusModal, setPocusModal] = useState({ show: false, title: '', finding: '' });
  
  const [ventSettings, setVentSettings] = useState({ mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, fio2: 50, pinsp: 20, ieRatio: 2, pmax: 40, ps: 10, air: 0.4, o2: 0.6 });
  const [gasSettings, setGasSettings] = useState({ agent: 'sevoflurane', dial: 0, airFlow: 0.0, o2Flow: 2.0, n2oFlow: 0.0 });
  const [defibSettings, setDefibSettings] = useState({ joules: 200, sync: false });

  function formatTime(seconds) {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  const logEvent = (msg) => {
    setLogs(prev => [`${formatTime(time || 0)} - ${msg}`, ...prev]);
  };
 
  const {
    time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient,
    processMed, pushMed, pushFluid, activeMeds, intravascularVolume, electrolytes, coags,
    deliverShock, toggleCPR, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot
  } = usePhysiology({
    activeCase,
    isRunning,
    isPaused: viewModal.show || setupModal || pocusModal.show || airwayQuizModal.show || accessModal.show || tubeConfirmModal.show,
    ventSettings,
    gasSettings,
    logEvent
  });

  // DEEP STATE SERIALIZATION: Enables the master undo function
  const saveState = (actionName = null) => {
    const engineSnapshot = createSnapshot();
    setHistory(prev => [...prev, {
      appState: {
        ventSettings: JSON.parse(JSON.stringify(ventSettings)),
        gasSettings: JSON.parse(JSON.stringify(gasSettings)),
        defibSettings: JSON.parse(JSON.stringify(defibSettings)),
        logs: [...logs],
      },
      engineSnapshot
    }]);
    if (actionName) logEvent(actionName);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];

      setVentSettings(prevState.appState.ventSettings);
      setGasSettings(prevState.appState.gasSettings);
      setDefibSettings(prevState.appState.defibSettings);
      setLogs(prevState.appState.logs);

      restoreSnapshot(prevState.engineSnapshot);

      setHistory(history.slice(0, -1));
      logEvent("⏪ UNDO: Reverted simulator to the previous clinical state.");
    }
  };

// WRAPPED ACTION HANDLERS
  const handlePushFluid = (...args) => { saveState(); pushFluid(...args); };
  const handleProcessMed = (...args) => { saveState(); processMed(...args); };
  const handlePushMed = (...args) => { saveState(); pushMed(...args); };
  const handleToggleCPR = () => { saveState(); toggleCPR(); };
  const handleDeliverShock = (...args) => { saveState(); deliverShock(...args); };
  const handleOptimizeAirway = (...args) => { saveState(); optimizeAirway(...args); };
  const handleSetVentSettings = (update) => { saveState(); setVentSettings(update); };
  const handleSetGasSettings = (update) => { saveState(); setGasSettings(update); };
  const handleSetSurgicalPhase = (val) => { saveState(); setSurgicalPhase(val); };
  const handleSetDefibSettings = (val) => { saveState(); setDefibSettings(val); };
  const handleToggleBis = () => { saveState(); setPatient(p => ({...p, hasBisMonitor: !p.hasBisMonitor})); logEvent(patient.hasBisMonitor ? "Removed BIS Monitor." : "Attached BIS Monitor."); };
  const handleToggleTof = () => { saveState(); setPatient(p => ({...p, hasTofMonitor: !p.hasTofMonitor})); logEvent(patient.hasTofMonitor ? "Removed TOF Monitor." : "Attached TOF Monitor."); };
  const handleCheckRhythm = () => { saveState(); logEvent("⏸ Rhythm Check: CPR Paused. Assessing monitor..."); setPatient(p => ({ ...p, cprActive: false })); };

  const handleSurgicalCric = () => {
    saveState();
    logEvent("Performed Surgical Cric.");
    setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful', tubePosition: 'trachea', currentO2Device: 'Cricothyroidotomy (100% FiO2)', currentFiO2: 100, currentO2Flow: 15}));
  };

  const handleExtubation = () => {
    saveState();
    logEvent("Airway removed / Extubated patient.");
    setPatient(p => ({
        ...p, 
        airwaySecured: false, 
        ventilationStatus: p.isApneic ? 'failed' : 'spontaneous', 
        tubePosition: null, 
        currentO2Device: 'Room Air', 
        currentFiO2: 21, 
        currentO2Flow: 0
    }));
  };

  const adjustTube = (action) => {
    saveState();
    if (action === 'pull_back') {
      if (patient.tubePosition === 'right_mainstem' || patient.tubePosition === 'left_mainstem') {
        logEvent("Pulled Endotracheal Tube back 2cm. Tube is now correctly positioned in the trachea.");
        setPatient(p => ({ ...p, tubePosition: 'trachea' }));
        setTubeConfirmModal(prev => ({ ...prev, result: "Tube pulled back 2cm. Re-auscultate to confirm placement." }));
      } else if (patient.tubePosition === 'trachea') {
        logEvent("Pulled Endotracheal Tube back 2cm. Tube dislodged into vocal cords/esophagus!");
        setPatient(p => ({ ...p, tubePosition: 'esophagus', ventilationStatus: 'failed', airwaySecured: false }));
        setTubeConfirmModal(prev => ({ ...prev, result: "Tube pulled back 2cm. Patient lost airway!" }));
      } else {
        logEvent("Pulled Endotracheal Tube back 2cm. Tube remains in the esophagus.");
        setTubeConfirmModal(prev => ({ ...prev, result: "Tube pulled back 2cm. Still in esophagus." }));
      }
    } else if (action === 'remove') {
      handleExtubation();
      setTubeConfirmModal({ show: false, result: '' });
    }
  };

  const startCase = (selectedCase) => {
    setActiveCase(selectedCase);
    setVitals({ ...selectedCase.baseVitals, pip: 0, pplat: 0, vte: 0 });
    setTargetVitals({ ...selectedCase.baseVitals });
    setNibp({ sys: selectedCase.baseVitals.sys, dia: selectedCase.baseVitals.dia, time: 0 });
    setPatient({
      ...selectedCase.patient,
      isApneic: false, isParalyzed: false, isTopicalized: false, airwaySecured: false, airwayExamined: false,
      ventilationStatus: 'spontaneous', hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentFiO2: 21, currentO2Flow: 0, oxygenBuffer: 21, drugEffects: { sys: 0, hr: 0 }, accessLines: []
    });
    setLogs([`00:00 - Case Started: ${selectedCase.name}. ${selectedCase.description}`]);
    setLabs({});
    setTime(0); setHistory([]); setIsRunning(true);
  };

  const cycleNibp = () => { setNibp({ sys: vitals.sys, dia: vitals.dia, time: time }); logEvent(`Cycled NIBP: ${vitals.sys}/${vitals.dia} mmHg`); };

  const examineAirway = () => {
    let mallampati = patient.baseGrade || 1;
    let thyromental = patient.isObese ? "< 6cm (Short / Anterior Airway Risk)" : "> 6cm (Normal)";
    let biteTest = patient.limitedMouth ? "Class III (Cannot bite upper lip)" : "Class I (Lower incisors bite above vermillion border)";
    let mobility = patient.hasCCollar ? "Severely Restricted (C-Collar in place)" : "Normal full extension/flexion";
          
    let desc = `Thyromental Distance: ${thyromental}\nUpper Lip Bite Test: ${biteTest}\nNeck Mobility: ${mobility}\n\nYou ask the patient to open their mouth wide and protrude their tongue without phonating. `;
          
    if (patient.airwayBlood) {
      desc += "However, the oropharynx is obscured by massive blood and secretions. You cannot clearly identify the tonsillar pillars, fauces, or soft palate.";
    } else if (patient.limitedMouth) {
      desc += "The patient can only open their mouth 1-2 fingers wide. Only the hard palate is clearly visible.";
    } else if (mallampati === 1) {
      desc += "You have a full view of the soft palate, fauces, uvula, and tonsillar pillars.";
    } else if (mallampati === 2) {
      desc += "You can see the soft palate, fauces, and uvula, but the tonsillar pillars are hidden.";
    } else if (mallampati === 3) {
      desc += "You can only see the soft palate and the base of the uvula.";
    } else {
      desc += "You can only see the hard palate. The soft palate is completely obscured by the base of the tongue.";
    }
    setAirwayQuizModal({ show: true, description: desc, trueMallampati: mallampati });
  };

  const submitAirwayQuiz = (selectedClass) => {
    const isCorrect = selectedClass === airwayQuizModal.trueMallampati;
    logEvent(`Airway Assessment: Identified as Mallampati Class ${selectedClass}. (${isCorrect ? 'Correct' : 'Incorrect'})`);
    setPatient(p => ({ ...p, airwayExamined: true }));
    setAirwayQuizModal({ show: false, description: '', trueMallampati: 1 });
  };

const establishAccess = (category, type, location) => {
    const fullName = `${type} (${location})`;
    logEvent(`Placed ${fullName}.`);
    setPatient(p => ({ 
       ...p, 
       hasIV: p.hasIV || !category.includes('Arterial'), 
       hasALine: p.hasALine || category.includes('Arterial'),
      accessLines: [...(p.accessLines || []), fullName]
    }));
    setAccessModal({ show: false, category: '' });
  };

  const optimizeAirway = (device) => {
    if (patient.airwayBlood) {
      logEvent(`❌ FAILED: Attempted to place ${device}, but massive blood/secretions in the airway rendered it immediately ineffective and triggered gagging/coughing.`);
      return;
    }
    if (patient.isTopicalized === false && !patient.isApneic && device.includes('OPA')) {
      logEvent(`❌ FAILED: Patient is awake! Placing an OPA caused severe gagging and laryngospasm!`);
      return;
    }
    if (device.includes('Laryngeal Mask Airway')) {
      logEvent(`✅ Placed ${device}. Airway secured via supraglottic device.`);
      setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful', currentO2Device: 'LMA (100% FiO2)', currentFiO2: 100, currentO2Flow: 15}));
      return;
    }
    logEvent(`✅ Placed ${device}. Airway patency improved for BMV.`);
    setPatient(p => ({...p, bmvOptimized: true}));
  };

  const handleSetO2 = (id, flow, fio2, ipap, epap, rate) => {
    if (id === 'Room Air') {
      logEvent(`Removed O2 device. Patient on Room Air.`);
      setPatient(p => ({ ...p, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21, nippv: null }));
      return;
    }

    let desc = id;
    let tFio2 = 21;
    let tFlow = flow ? parseInt(flow) : (id.includes('Cannula') ? 2 : 15);

    if (id === 'Bag-Mask Valve (BMV)' || id.includes('Non-Rebreather')) { tFio2 = 100; tFlow = 15; }
    else if (id.includes('Nasal Cannula')) tFio2 = 21 + (tFlow * 4);
    else if (id.includes('Face Mask')) tFio2 = 40 + (tFlow * 2);
    else if (id.includes('High Flow') || id.includes('CPAP') || id.includes('BiPAP')) tFio2 = fio2 ? parseInt(fio2) : 100;

    saveState(`Applied ${desc}. O2 Buffer equilibrating...`);
    setPatient(p => ({ 
      ...p, 
      currentO2Device: desc + ` (${tFio2}%)`, 
      currentO2Flow: tFlow, 
      currentFiO2: Math.min(100, tFio2),
      nippv: id.includes('BiPAP') ? { ipap: parseInt(ipap)||10, epap: parseInt(epap)||5, rate: parseInt(rate)||12, isBipapST: true } : (id.includes('CPAP') ? { ipap: parseInt(epap)||5, epap: parseInt(epap)||5, rate: 0, isBipapST: false } : null),
      ventilationStatus: id === 'Bag-Mask Valve (BMV)' ? 'successful' : 'spontaneous'
    }));
  };

  const auscultateLungs = (location) => {
    let finding = "";
    if (!patient.airwaySecured && patient.isApneic) {
      finding = "Silent. No breath sounds heard (Patient is apneic).";
    } else if (!patient.airwaySecured && !patient.isApneic) {
      finding = "Normal vesicular breath sounds. Clear bilaterally.";
    } else if (patient.tubePosition === 'right_mainstem') {
      if (location === 'Left Lung') finding = "Absent breath sounds on the left side.";
      else if (location === 'Right Lung') finding = "Clear, loud breath sounds on the right side.";
      else if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
    } else if (patient.tubePosition === 'left_mainstem') {
      if (location === 'Left Lung') finding = "Clear, loud breath sounds on the left side.";
      else if (location === 'Right Lung') finding = "Absent breath sounds on the right side.";
      else if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
    } else if (patient.tubePosition === 'trachea' || patient.ventilationStatus === 'successful') {
      if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
      else finding = "Clear, equal bilateral breath sounds with mechanical ventilation.";
    } else if (patient.tubePosition === 'esophagus' || patient.ventilationStatus === 'failed') {
      if (location === 'Epigastrium') finding = "Loud gurgling (Borborygmi) heard with each ventilator breath! TUBE IS IN THE STOMACH!";
      else finding = "Diminished or absent breath sounds.";
    }
    logEvent(`Auscultated ${location}: ${finding}`);
    setTubeConfirmModal(prev => ({ ...prev, result: `Auscultated ${location}: ${finding}` }));
  };

  const handleSuction = () => {
    saveState("Performed rigid Yankauer suction. Cleared airway of blood and secretions.");
    setPatient(p => ({ ...p, airwayBlood: false }));
  };

  const handlePocus = (type) => {
    let finding = "";
    if (type === 'Cardiac (TTE)') finding = patient.isSeptic ? "Hyperdynamic left ventricle, underfilled Right Ventricle (Vasodilatory Shock)." : "Normal LV/RV function. Good contractility.";
    else if (type === 'Gastric') finding = patient.stomach === 'full' ? "Antrum is distended with echogenic material (Full Stomach)." : "Antrum is flat and empty (Target sign).";
    else if (type === 'Airway') finding = patient.airwaySecured ? "Single air-mucosal interface (Confirmed Tracheal Placement)." : (patient.ventilationStatus === 'failed' && patient.dlAttempts > 0 ? "Double-Tract Sign visible! Tube in esophagus!" : "Normal tracheal anatomy.");
    else if (type === 'Lung') finding = (!patient.isApneic || patient.airwaySecured) ? "Bilateral lung sliding present (Ants marching sign)." : "Absent lung sliding bilaterally (Apnea).";
    else if (type === 'eFAST') finding = patient.trauma ? "Positive FAST: Anechoic free fluid seen in Morison's pouch (RUQ)." : "Negative FAST. No free fluid in dependent views.";
    setPocusModal({ show: true, title: `${type} Ultrasound`, finding });
    logEvent(`Performed ${type} Ultrasound.`);
  };

  const generateClinicalHint = () => {
    if (!activeCase) return;
    let hint;

    if (!patient.hasIV && !patient.hasALine) {
      hint = "⚠️ VASCULAR ACCESS REQUIRED: The patient has no Intravenous (IV) access. You cannot administer systemic medications. Prioritize placing an 18G Peripheral IV (PIV).";
    } else if (patient.airwayBlood && !patient.airwaySecured) {
      hint = "🔴 AIRWAY COMPROMISED: Active bleeding/secretions detected in the oropharynx. Attempting Bag-Mask Ventilation (BMV) or intubation will force aspirate into the lungs. IMMEDIATE ACTION: Use Suction Airway.";
    } else if (patient.ventilationStatus === 'failed') {
      hint = "🔴 FAILED AIRWAY: Direct Laryngoscopy has failed. Call for help. Optimize with a Hyperangulated Video Laryngoscope (VL) or place a rescue Laryngeal Mask Airway (LMA) to re-establish oxygenation.";
    } else if (vitals.spo2 < 90 && !patient.airwaySecured) {
      hint = "🟠 HYPOXEMIA: Oxygen Saturation (SpO2) is critically low. Ensure High Flow Nasal Cannula or Bag-Mask Ventilation (BMV) is applied. If apneic, prioritize securing the airway immediately.";
    } else if (patient.isApneic && patient.oxygenBuffer < 30 && !patient.airwaySecured) {
      hint = "🟠 CRITICAL APNEA: The patient is not breathing and their Functional Residual Capacity (FRC) oxygen buffer is depleting. Denitrogenate (Pre-oxygenate) using Bag-Mask Ventilation (BMV) to buy time before intubation.";
    } else if (vitals.sys < 90) {
      if (vitals.hr > 100) hint = "🔴 HYPOTENSION W/ TACHYCARDIA: The patient is hypotensive and tachycardic (compensatory or vasodilatory). Avoid Ephedrine (will worsen tachycardia). SUGGESTION: Administer Phenylephrine (50-100 mcg push) to increase Systemic Vascular Resistance (SVR).";
      else hint = "🔴 HYPOTENSION W/ BRADYCARDIA: The patient is hypotensive and heart rate is low/normal. SUGGESTION: Administer Ephedrine (5-10 mg push) for mixed alpha/beta-1 agonism, or Epinephrine (10-20 mcg push) if profound.";
    } else if (vitals.sys > 160) {
      if (vitals.hr > 100) hint = "🟠 HYPERTENSION W/ TACHYCARDIA: Sympathetic overdrive detected (likely pain or light anesthesia). SUGGESTION: Deepen anesthesia (Propofol 10-20 mg) or provide analgesia (Fentanyl 50-100 mcg). If vitals persist, consider Esmolol (10-20 mg push) to control HR and BP.";
      else hint = "🟠 ISOLATED HYPERTENSION: SUGGESTION: Consider deepening anesthesia, or administer a direct vasodilator like Nitroglycerin (50-100 mcg push) or a mixed antagonist like Labetalol (10-20 mg push).";
    } else if (vitals.hr < 45) {
      hint = "🔴 SEVERE BRADYCARDIA: Heart rate is critically low, risking cardiac output. SUGGESTION: Administer Atropine (0.5 mg push) to block vagal tone, or Ephedrine (5-10 mg push) if accompanied by hypotension.";
    } else if (vitals.hr > 130 && vitals.sys > 100) {
      hint = "🟠 TACHYCARDIA: Evaluate for underlying causes (hypovolemia, pain, light anesthesia, hypoxia). If a primary arrhythmia is suspected, consider Adenosine (6 mg rapid push) for SVT or Amiodarone (150 mg) for ventricular rhythms.";
    } else if (!patient.airwaySecured && !patient.isApneic) {
      hint = "🟢 STABLE INDUCTION PREP: Hemodynamics are currently optimized. Continue pre-oxygenation to maximize the FRC buffer. Prepare Induction (e.g., Propofol 1.5-2.5 mg/kg) and Paralytic (e.g., Rocuronium 0.6-1.2 mg/kg) when ready to secure the airway.";
    } else {
      hint = "🟢 HEMODYNAMICALLY STABLE: The patient's vitals are currently within acceptable clinical parameters. Continue monitoring End-Tidal Carbon Dioxide (EtCO2) and hemodynamics.";
    }
    logEvent(`💡 ATTENDING CONSULT: ${hint}`);
  };

  const generateLab = (type) => {
    logEvent(`Sent ${type} to the lab...`);
    setTimeout(() => {
      let results = {};
      if (type === 'ABG') {
        const baseHco3 = patient.isObese ? 32 : 24; 
        const metabolicAcidosis = (patient.isSeptic ? 8 : 0) + ((patient.ebl || 0) > 1500 ? 6 : 0);
        const currentHco3 = Math.max(10, baseHco3 - metabolicAcidosis);
        
        results = {
          'pH': { val: (vitals.ph || 7.4).toFixed(2), range: '7.35 - 7.45', alert: vitals.ph < 7.35 || vitals.ph > 7.45 },
          'pCO2': { val: (vitals.paco2 || 40).toFixed(1), range: '35 - 45 mmHg', alert: vitals.paco2 < 35 || vitals.paco2 > 45 },
          'pO2': { val: Math.round(vitals.pao2 || 100), range: '75 - 100 mmHg', alert: vitals.pao2 < 60 },
          'HCO3': { val: currentHco3.toFixed(1), range: '22 - 26 mEq/L', alert: currentHco3 < 20 || currentHco3 > 28 },
          'Lactate': { val: (patient.isSeptic ? 6.2 : ((patient.ebl || 0) > 1500 ? 4.5 : 1.2)).toFixed(1), range: '0.5 - 2.0 mmol/L', alert: patient.isSeptic || (patient.ebl || 0) > 1500 }
        };
      } else if (type === 'CBC') {
        const ebv = patient.ebv || 5000;
        const bloodLossRatio = (patient.ebl || 0) / ebv;
        const baseHb = patient.trauma ? 11.2 : 14.5;
        const dilutionFactor = intravascularVolume / ebv;
        const currentHb = Math.max(3.0, (baseHb * (1 - bloodLossRatio)) - (dilutionFactor * 3.0));
        const currentHct = currentHb * 3;
        
        const wbc = patient.isSeptic ? (Math.random() * 5 + 18).toFixed(1) : (Math.random() * 2 + 6).toFixed(1);
        const basePlt = patient.isSeptic ? 90 : 250;
        const currentPlt = Math.round(basePlt * (1 - bloodLossRatio));

        results = {
          'WBC': { val: wbc, range: '4.5 - 11.0 x10^3/µL', alert: patient.isSeptic },
          'Hemoglobin (Hb)': { val: currentHb.toFixed(1), range: '12.0 - 17.5 g/dL', alert: currentHb < 10.0 },
          'Hematocrit (Hct)': { val: currentHct.toFixed(1), range: '36 - 50 %', alert: currentHct < 30 },
          'Platelets': { val: currentPlt, range: '150 - 450 x10^3/µL', alert: currentPlt < 150 }
        };
      } else if (type === 'CMP') {
        results = {
          Na: { val: 138, range: '135-145', alert: false },
          K: { val: (patient.trauma ? (Math.random() * 0.5 + 5.0).toFixed(1) : 4.1), range: '3.5-5.1', alert: patient.trauma },
          Cr: { val: (patient.isSeptic ? (Math.random() * 0.5 + 2.2).toFixed(1) : 0.9), range: '0.7-1.3', alert: patient.isSeptic },
          Gluc: { val: (patient.isSeptic ? Math.round(Math.random() * 40 + 180) : 105), range: '70-100', alert: patient.isSeptic }
        };
      } else if (type === 'TEG') {
        results = {
          R: { val: (patient.trauma ? (Math.random() * 2 + 11).toFixed(1) : 6), range: '5-10 min', alert: patient.trauma },
          Angle: { val: (patient.trauma ? Math.round(Math.random() * 5 + 42) : 65), range: '53-72 deg', alert: patient.trauma },
          MA: { val: (patient.trauma ? Math.round(Math.random() * 5 + 40) : 60), range: '50-70 mm', alert: patient.trauma }
        };
      } else if (type === 'VBG') {
        results = {
          pvH: { val: (7.31 - (patient.isSeptic ? 0.15 : 0)).toFixed(2), range: '7.31-7.41', alert: patient.isSeptic },
          pvCO2: { val: (46 + (patient.isApneic ? 12 : 0) + (patient.isObese ? 10 : 0)).toFixed(1), range: '41-51 mmHg', alert: patient.isApneic || patient.isObese },
          Lactate: { val: (patient.isSeptic ? 6.2 : 0.8).toFixed(1), range: '0.5-2.2 mmol/L', alert: patient.isSeptic }
        };
      }
      setLabs(prev => {
        const existing = prev[type] || { testNames: Object.keys(results), history: [] };
        return {
          ...prev,
          [type]: { ...existing, history: [...existing.history, { time: formatTime(time), results }] }
        };
      });
      setShowLabPanel(true);
      logEvent(`Results back for ${type}.`);
    }, 2000);
  };

  const processIntubation = (blade, adjunct) => {
    setSetupModal(false);
    let desc = `You insert the ${blade}. `;
    let trueGrade = patient.baseGrade;
    setPatient(p => ({...p, dlAttempts: (p.dlAttempts || 0) + 1}));

    if (!patient.isApneic && !blade.includes('Fiberoptic')) {
       if (!patient.isTopicalized) {
          logEvent(` FAILED: Patient is awake and not topicalized! Severe gag reflex and laryngospasm triggered!`);
          setPatient(p => ({...p, ventilationStatus: 'failed', targetBuffer: 0}));
          return;
       }
    }

    if (patient.airwayBlood) { desc += "The lens/view is obscured by thick red blood and secretions."; trueGrade = 4; } 
    else if (patient.hasCCollar || patient.limitedMouth) {
      desc += "Anatomy is highly restricted. ";
      if (blade.includes('Hyperangulated')) { desc += "Looking around the curve, you get a view of the glottic opening."; trueGrade = 2; } 
      else if (blade.includes('Fiberoptic')) { desc += "You visualize the vocal cords perfectly through the scope."; trueGrade = 1; } 
      else { desc += "Using a standard blade, you can only see the epiglottis."; trueGrade = 3; }
    } 
    else if (patient.baseGrade === 1) { desc += "You sweep the tongue and have a direct line of sight to the cords."; trueGrade = 1; }

    logEvent(`Attempted Intubation using ${blade} with ${adjunct}. Analyzing view...`);
    setViewModal({ show: true, blade, adjunct, description: desc, trueGrade });
  };

  const submitGrade = (selectedGrade) => {
    const isCorrect = selectedGrade === viewModal.trueGrade;
    logEvent(`Student identified view as Grade ${selectedGrade}. (${isCorrect ? 'Correct' : 'Incorrect'})`);

    let success = false;
    let failReason = "";
    if (viewModal.trueGrade === 4) failReason = "Cannot intubate blindly with Grade IV view. Esophageal intubation.";
    else if (viewModal.blade.includes('Hyperangulated') && viewModal.adjunct.includes('Standard Bougie')) failReason = "Standard Bougie cannot navigate the steep angle of a hyperangulated VL blade.";
    else if (viewModal.trueGrade === 3 && viewModal.adjunct.includes('None')) failReason = "Cannot direct tube into anterior airway without an adjunct on a Grade III view.";
    else success = true;

    if (success) {
      const rand = Math.random();
      let tubePos = 'trachea';
      if (rand < 0.20) tubePos = 'right_mainstem';
      else if (rand < 0.25) tubePos = 'left_mainstem';

      logEvent(`✅ Intubation completed. Tube secured to Mechanical Ventilator.`);
      setPatient(p => ({ ...p, airwaySecured: true, ventilationStatus: 'successful', tubePosition: tubePos, currentO2Device: 'Mechanical Ventilator (100% FiO2)', currentO2Flow: 15, currentFiO2: 100 }));
    } else {
      logEvent(`❌ Intubation FAILED. ${failReason}`);
      setPatient(p => ({ ...p, ventilationStatus: 'failed', tubePosition: 'esophagus' }));
    }
    setViewModal({ show: false, blade: '', adjunct: '', description: '', trueGrade: 1 });
  };

  if (!activeCase) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 font-mono flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-cyan-400 mb-2 flex items-center gap-3"><Activity size={36}/> AirwaySim OS</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mt-8">
          {CASES.map((c) => (
            <div key={c.id} onClick={() => startCase(c)} className="bg-slate-900 border border-slate-700 hover:border-cyan-400 p-6 rounded-xl cursor-pointer shadow-lg group">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-white group-hover:text-cyan-400">{c.name}</h2>
                <span className="text-sm bg-slate-800 px-2 py-1 rounded">{c.difficulty}</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">{c.description}</p>
              <button className="w-full bg-slate-800 group-hover:bg-cyan-900 font-bold py-2 rounded">Load Scenario</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PASS THE ACTUAL RATE (BPM/RPM) TO THE RENDERING ENGINE
  const hrSpeed = Math.round((vitals.hr || 70) / 5) * 5;
  const rrSpeed = Math.round((vitals.rr || 12) / 2) * 2;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 font-mono select-none flex flex-col gap-4">
      
      {/* EMR SLIDING PANEL */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-slate-900 border-l border-slate-700 shadow-2xl z-[150] transform transition-transform duration-300 ease-in-out overflow-y-auto p-4 md:p-6 ${showLabPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-xl md:text-2xl font-bold text-blue-400 flex items-center gap-2"><Search size={20} className="md:w-6 md:h-6"/> Electronic Medical Record</h2>
          <button onClick={() => setShowLabPanel(false)} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>

        {Object.keys(labs).length === 0 ? (
          <div className="text-slate-500 italic text-center mt-20">No laboratory data available. Order labs from the clinical menu.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(labs).map(([labType, labData]) => (
              <div key={labType} className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 font-bold text-sm text-blue-200 uppercase tracking-wider">{labType} Panel</div>
                {labType === 'TEG' && <TEGVisualizer historyData={labData.history} />}
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-left text-xs border-collapse min-w-[350px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="p-3 text-slate-500 font-normal">Test Name</th>
                        {labData.history.map((h, i) => (
                          <th key={i} className="p-3 text-center text-slate-300 whitespace-nowrap">@ {h.time}</th>
                        ))}
                        <th className="p-3 text-slate-500 font-normal">Ref Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labData.testNames.map(testName => (
                        <tr key={testName} className="border-b border-slate-900 hover:bg-slate-900/50">
                          <td className="p-3 font-bold text-slate-300">{testName}</td>
                          {labData.history.map((h, i) => (
                            <td key={i} className={`p-3 text-center font-mono text-sm ${h.results[testName].alert ? 'text-red-500 font-bold' : 'text-green-400'}`}>{h.results[testName].val}</td>
                          ))}
                          <td className="p-3 text-slate-500 italic whitespace-nowrap">{labData.history[0].results[testName].range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PatientHeader 
        activeCase={activeCase} 
        patient={patient} 
        vitals={vitals} 
        setActiveCase={() => setActiveCase(null)} 
        handleUndo={handleUndo} 
        history={history} 
        showLabPanel={showLabPanel} 
        setShowLabPanel={setShowLabPanel} 
        isRunning={isRunning} 
        setIsRunning={setIsRunning} 
      />

      <PrimaryMonitor 
        patient={patient} 
        vitals={vitals} 
        nibp={nibp} 
        cycleNibp={cycleNibp} 
        hrSpeed={hrSpeed} 
        rrSpeed={rrSpeed} 
        gasSettings={gasSettings} 
        ventSettings={ventSettings}
      />

      {patient.airwaySecured && (
        <VentMonitor 
          patient={patient} 
          vitals={vitals} 
          rrSpeed={rrSpeed} 
          ventSettings={ventSettings} 
          setVentSettings={handleSetVentSettings}
        />
      )}
      
        <BottomBar 
        gasSettings={gasSettings} 
        setGasSettings={handleSetGasSettings} 
        ventSettings={ventSettings} 
        setVentSettings={handleSetVentSettings} 
        patient={patient} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[400px]">
        <ActionPanel 
           patient={patient} 
           setPatient={setPatient} 
           defibSettings={defibSettings} 
           setDefibSettings={handleSetDefibSettings} 
           toggleCPR={handleToggleCPR} 
           deliverShock={handleDeliverShock} 
           examineAirway={examineAirway} 
           handlePocus={handlePocus} 
           setAccessModal={setAccessModal} 
           generateLab={generateLab} 
           handleSetO2={handleSetO2} 
           logEvent={logEvent} 
           surgicalPhase={surgicalPhase} 
           setSurgicalPhase={handleSetSurgicalPhase}
           toggleBis={handleToggleBis}
           toggleTof={handleToggleTof}
           checkRhythm={handleCheckRhythm}
           time={time}
           formatTime={formatTime}
        />
        
        <Pharmacopoeia
           pushFluid={handlePushFluid} 
           processMed={handleProcessMed} 
           patient={patient} 
        />
        
        <AirwayPanel 
           patient={patient} 
           setPatient={setPatient} 
           handleSuction={handleSuction} 
           optimizeAirway={handleOptimizeAirway} 
           pushMed={handlePushMed} 
           setViewModal={setViewModal} 
           setSetupModal={setSetupModal} 
           setTubeConfirmModal={setTubeConfirmModal} 
           logEvent={logEvent} 
           handleSurgicalCric={handleSurgicalCric}
           handleExtubation={handleExtubation}
           activeMeds={activeMeds}
           processMed={handleProcessMed}
        />
        
        <LogPanel 
           logs={logs} 
           generateClinicalHint={generateClinicalHint} 
           formatTime={formatTime} 
        />
      </div>

      <PocusModal 
        data={pocusModal} 
        close={() => setPocusModal({show: false, title: '', finding: ''})} 
      />

      <AirwayQuizModal 
        data={airwayQuizModal} 
        submitAirwayQuiz={submitAirwayQuiz} 
      />

      <AccessModal 
        data={accessModal} 
        close={() => setAccessModal({show: false, category: ''})} 
        establishAccess={establishAccess} 
      />

      <TubeConfirmModal 
        data={tubeConfirmModal} 
        close={() => setTubeConfirmModal({show: false, result: ''})} 
        patient={patient} 
        auscultateLungs={auscultateLungs} 
        adjustTube={adjustTube} 
      />

      <SetupModal 
        show={setupModal} 
        close={() => setSetupModal(false)} 
        viewModal={viewModal} 
        setViewModal={setViewModal} 
        processIntubation={processIntubation} 
      />

      <ViewModal 
        data={viewModal} 
        submitGrade={submitGrade} 
      />

    </div>
  );
}