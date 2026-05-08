import React, { useState, useEffect } from 'react';
import { usePhysiology } from './engine/usePhysiology';
import { Activity, Heart, Wind, Undo2, AlertTriangle, Syringe, Stethoscope, Droplet, Zap, Search, Eye, RefreshCw, Cylinder, X } from 'lucide-react';
import { WAVEFORMS } from './engine/WaveformDatabase';

// --- SCALABLE SVG PATHS (For the Ventilator) ---
const PATHS = {
  ventPressure: "M0,80 L20,80 L35,20 L65,25 L75,80 L200,80",
  ventFlow: "M0,50 L20,50 L20,10 L50,10 L50,90 C70,90 85,50 100,50 L200,50",
  ventVolume: "M0,90 L20,90 L50,10 L75,90 L200,90"
};

const CASES = [
  {
    id: 'normal', name: 'Elective Surgery (Perfect Baseline)', difficulty: ' Easy',
    description: '45yo Female, ASA 1. Fasting for 12 hours. Normal neck anatomy, Mallampati I. Perfectly stable hemodynamics.',
    baseVitals: { hr: 72, sys: 120, dia: 80, spo2: 99, etco2: 0, rr: 12 },
    patient: { age: 45, sex: 'female', weight: 60, height: 165, bmi: 22.0, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: false, baseGrade: 1, isSeptic: false, hasCCollar: false, stomach: 'empty', limitedMouth: false, trauma: false }
  },
  {
    id: 'trauma', name: 'Motor Vehicle Trauma (Bloody Airway)', difficulty: ' Hard',
    description: '54yo Male, GCS 7. Facial trauma, active bleeding in airway. Cervical collar in place restricting neck extension.',
    baseVitals: { hr: 115, sys: 105, dia: 65, spo2: 88, etco2: 0, rr: 24 },
    patient: { age: 54, sex: 'male', weight: 85, height: 180, bmi: 26.2, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: true, isObese: false, baseGrade: 3, isSeptic: false, hasCCollar: true, stomach: 'full', limitedMouth: false, trauma: true }
  },
  {
    id: 'septic', name: 'Septic Shock (Hemodynamic Cliff)', difficulty: ' Hard',
    description: '68yo Male, urosepsis. Profoundly vasodilated, living on endogenous catecholamines. High risk of cardiovascular collapse.',
    baseVitals: { hr: 135, sys: 85, dia: 40, spo2: 92, etco2: 0, rr: 28 },
    patient: { age: 68, sex: 'male', weight: 70, height: 175, bmi: 22.9, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: false, baseGrade: 2, isSeptic: true, hasCCollar: false, stomach: 'empty', limitedMouth: false, trauma: false }
  },
  {
    id: 'obese', name: 'Morbid Obesity / OSA (Rapid Desat)', difficulty: ' Medium',
    description: '50yo Male, BMI 45, severe Obstructive Sleep Apnea (OSA). Severely decreased Functional Residual Capacity (FRC).',
    baseVitals: { hr: 88, sys: 150, dia: 95, spo2: 94, etco2: 0, rr: 18 },
    patient: { age: 50, sex: 'male', weight: 142, height: 178, bmi: 44.8, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: true, baseGrade: 3, isSeptic: false, hasCCollar: false, stomach: 'full', limitedMouth: false, trauma: false }
  }
];

// =========================================================================
// 1. PRIMARY MONITOR CANVAS ENGINE (For ECG, SpO2, EtCO2, A-Line)
// =========================================================================
const CanvasWaveform = React.memo(({ color, speed, rrSpeed = 0, active, type = 'ecg', morphology = 'normal' }) => {
  const canvasRef = React.useRef(null);
  const drawState = React.useRef({ x: 0, lastTime: performance.now(), lastY: null, tBeat: 0 });
  const propsRef = React.useRef({ speed, rrSpeed, active, color, type, morphology });

  useEffect(() => {
    propsRef.current = { speed, rrSpeed, active, color, type, morphology };
  }, [speed, rrSpeed, active, color, type, morphology]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (time) => {
      const { speed, rrSpeed, active, color, type, morphology } = propsRef.current;

      const rect = canvas.parentElement.getBoundingClientRect();
      const roundedWidth = Math.floor(rect.width);
      const roundedHeight = Math.floor(rect.height);
      
      if (roundedWidth > 0 && roundedHeight > 0 && (canvas.width !== roundedWidth || canvas.height !== roundedHeight)) {
        canvas.width = roundedWidth;
        canvas.height = roundedHeight;
        drawState.current.x = 0;
        drawState.current.lastY = null;
      }

      if (canvas.width === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      if (!active || speed <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.5;
        ctx.moveTo(0, canvas.height * 0.8);
        ctx.lineTo(canvas.width, canvas.height * 0.8);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      let dt = (time - drawState.current.lastTime) / 1000;
      if (dt > 0.1) dt = 0.016; 
      drawState.current.lastTime = time;

      const pixelsPerSec = canvas.width / 4;
      let newX = drawState.current.x + (dt * pixelsPerSec);
      let isWrapping = false;

      if (newX >= canvas.width) {
        newX = 0;
        isWrapping = true;
      }

      const h = canvas.height;
      const base = h * 0.7;
      let y = base;
      
      const freq = speed > 0 ? (1 / speed) : 1; 
      const beatDuration = 1000 / freq; 

      drawState.current.tBeat += (dt * 1000);
      if (drawState.current.tBeat >= beatDuration) {
        drawState.current.tBeat %= beatDuration;
      }
      const tBeat = drawState.current.tBeat;

      // Respiratory Variation (Pleth Variability Index)
      let respShift = 0;
      if ((type === 'pleth' || type === 'aline') && rrSpeed > 0) {
          const rrFreq = 1 / rrSpeed;
          const totalSecs = time / 1000;
          respShift = Math.sin(totalSecs * Math.PI * 2 * rrFreq) * (h * 0.1);
      }

     // Dynamic Waveform Lookup from Database with Crash Protection
      if (type === 'etco2') {
        const phase = tBeat / beatDuration;
        const baseline = h * 0.9;
        const peak = h * 0.2;
        const morphFn = WAVEFORMS.etco2[morphology] || WAVEFORMS.etco2.normal;
        y = morphFn(phase, baseline, peak, h);
      } else {
        const morphFn = (WAVEFORMS[type] && WAVEFORMS[type][morphology]) ? WAVEFORMS[type][morphology] : WAVEFORMS[type].normal;
        y = morphFn(tBeat, beatDuration, h, base, time) + respShift;
      }

      ctx.clearRect(newX, 0, 30, h);
      if (!isWrapping && drawState.current.lastY !== null) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.moveTo(drawState.current.x, drawState.current.lastY);
        ctx.lineTo(newX, y);
        ctx.stroke();
      }

      drawState.current.x = newX;
      drawState.current.lastY = y;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="absolute inset-0 z-10 w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
});

// =========================================================================
// 2. VENTILATOR SVG ENGINE
// =========================================================================
const SvgWaveform = React.memo(({ path, color, speed, active }) => {
  const animRef = React.useRef(null);
  const lastSpeedRef = React.useRef(speed);

  useEffect(() => {
    if (animRef.current && active && speed > 0) {
      if (Math.abs(speed - lastSpeedRef.current) > 0.2 || !animRef.current.style.animationDuration) {
        animRef.current.style.animationDuration = `${speed}s`;
        lastSpeedRef.current = speed;
      }
    }
  }, [speed, active]);

  return (
    <div className="absolute inset-0 overflow-hidden z-10 flex items-center w-full h-full">
      {active && speed > 0 ? (
        <div ref={animRef} className="w-[200%] h-full flex items-center animate-[slide_linear_infinite]" style={{ animationDuration: `${lastSpeedRef.current}s` }}>
          <svg className="w-1/2 h-full" preserveAspectRatio="none" viewBox="0 0 200 100">
            <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <svg className="w-1/2 h-full" preserveAspectRatio="none" viewBox="0 0 200 100">
            <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      ) : (
        <div className="w-full h-[2px] opacity-50" style={{ backgroundColor: color }}></div>
      )}
    </div>
  );
});

// =========================================================================
// 3. MAIN APPLICATION
// =========================================================================
export default function App() {
  const [activeCase, setActiveCase] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [nibp, setNibp] = useState({ sys: 0, dia: 0, time: 0 });
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [fluidInput, setFluidInput] = useState({ fluid: null, dose: '' });
  const [labs, setLabs] = useState({});
  const [showLabPanel, setShowLabPanel] = useState(false);
  const [airwayQuizModal, setAirwayQuizModal] = useState({ show: false, description: '', trueMallampati: 1 });
  const [accessModal, setAccessModal] = useState({ show: false, category: '' });
  const [tubeConfirmModal, setTubeConfirmModal] = useState(false);

  const [medInput, setMedInput] = useState({ drug: null, dose: '', category: '' });
  const [o2Input, setO2Input] = useState({ device: null, flow: '', fio2: '' });
  
  const [viewModal, setViewModal] = useState({ show: false, blade: '', adjunct: '', description: '', trueGrade: 1 });
  const [setupModal, setSetupModal] = useState(false);
  const [pocusModal, setPocusModal] = useState({ show: false, title: '', finding: '' });

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const logEvent = (msg) => setLogs(prev => [`${formatTime(time)} - ${msg}`, ...prev]);

  const { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, pushMed, pushFluid } = usePhysiology({
    activeCase, isRunning, isPaused: viewModal.show || setupModal || pocusModal.show || airwayQuizModal.show || accessModal.show || tubeConfirmModal, logEvent
  });

  const startCase = (selectedCase) => {
    setActiveCase(selectedCase);
    setVitals({ ...selectedCase.baseVitals, pip: 0, pplat: 0, vte: 0 });
    setTargetVitals({ ...selectedCase.baseVitals });
    setNibp({ sys: selectedCase.baseVitals.sys, dia: selectedCase.baseVitals.dia, time: 0 });
    setPatient({
      ...selectedCase.patient,
      isApneic: false, isParalyzed: false, isTopicalized: false, airwaySecured: false, airwayExamined: false,
      ventilationStatus: 'spontaneous', hasIV: false, hasALine: false, currentO2Device: 'Room Air (21% FiO2)', drugEffects: { sys: 0, hr: 0 }, accessLines: []
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
       hasIV: p.hasIV || category !== 'Arterial', 
       hasALine: p.hasALine || category === 'Arterial',
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
    logEvent(`✅ Placed ${device}. Airway patency improved for BMV.`);
    setPatient(p => ({...p, bmvOptimized: true}));
  };

  const auscultateLungs = (location) => {
    let finding = "";
    if (!patient.airwaySecured && patient.isApneic) {
      finding = "Silent. No breath sounds heard (Patient is apneic).";
    } else if (!patient.airwaySecured && !patient.isApneic) {
      finding = "Normal vesicular breath sounds. Clear bilaterally.";
    } else if (patient.ventilationStatus === 'successful') {
      if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
      else finding = "Clear, equal bilateral breath sounds with mechanical ventilation.";
    } else if (patient.ventilationStatus === 'failed') {
      if (location === 'Epigastrium') finding = "Loud gurgling (Borborygmi) heard with each ventilator breath! TUBE IS IN THE STOMACH!";
      else finding = "Diminished or absent breath sounds.";
    }
    logEvent(`Auscultated ${location}: ${finding}`);
  };

  const saveState = (actionName) => {
    setHistory((prev) => [...prev, { time, vitals: { ...vitals }, targetVitals: {...targetVitals}, patient: { ...patient }, logs: [...logs] }]);
    if (actionName) logEvent(actionName);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setTime(lastState.time);
    setVitals(lastState.vitals);
    setTargetVitals(lastState.targetVitals);
    setPatient(lastState.patient);
    setLogs(lastState.logs);
    setHistory(history.slice(0, -1)); 
  };

  const handleSetO2 = (id, flow, fio2) => {
    let desc = id;
    let targetBuffer = 21;

    if (id === 'Bag-Mask Valve (BMV)') {
      desc = "BMV (100% FiO2)";
      targetBuffer = 100;
    } else if (id === 'Non-Rebreather Mask (NRB)') {
      desc = "NRB (100% FiO2)";
      targetBuffer = 90;
    } else if (id.includes('Nasal Cannula') && flow) {
      desc = `Nasal Cannula @ ${flow}L`;
      targetBuffer = 21 + (parseInt(flow) * 4);
    } else if (id.includes('High Flow') && flow && fio2) {
      desc = `HFNC @ ${flow}L / ${fio2}%`;
      targetBuffer = parseInt(fio2);
    }
         
    saveState(`Applied ${desc}. O2 Buffer equilibrating...`);
    setPatient(p => ({ ...p, currentO2Device: desc, targetBuffer: Math.min(100, targetBuffer) }));
    setO2Input({ device: null, flow: '', fio2: '' });
  };

  const renderO2Button = (id, label, type) => {
    const isActive = o2Input.device === id;
    return (
      <div className="flex flex-col gap-1">
        <button onClick={() => setO2Input(isActive ? { device: null, flow: '', fio2: '' } : { device: id, flow: '', fio2: '' })}
          className={`bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border transition-all ${isActive ? 'border-blue-400' : 'border-transparent'}`}>
          {label}
        </button>
        {isActive && (
          <div className="flex gap-1 animate-in slide-in-from-top-1 duration-200">
            {(type === 'flow' || type === 'hfnc') && (
              <input autoFocus type="number" placeholder="Flow (L)" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white"
                value={o2Input.flow} onChange={(e) => setO2Input({ ...o2Input, flow: e.target.value })} />
            )}
            {type === 'hfnc' && (
              <input type="number" placeholder="FiO2 (%)" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white"
                value={o2Input.fio2} onChange={(e) => setO2Input({ ...o2Input, fio2: e.target.value })} />
            )}
            <button onClick={() => { if ((type === 'flow' && o2Input.flow) || (type === 'hfnc' && o2Input.flow && o2Input.fio2) || type === 'fixed') { handleSetO2(id, o2Input.flow, o2Input.fio2); } }}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-[10px] font-bold">APPLY</button>
          </div>
        )}
      </div>
    );
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
    
    let hint = "";

    // 1. SYSTEM & ACCESS CHECKS
    if (!patient.hasIV && !patient.hasALine) {
      hint = "⚠️ VASCULAR ACCESS REQUIRED: The patient has no Intravenous (IV) access. You cannot administer systemic medications. Prioritize placing an 18G Peripheral IV (PIV).";
    }
    // 2. AIRWAY (A)
    else if (patient.airwayBlood && !patient.airwaySecured) {
      hint = "🔴 AIRWAY COMPROMISED: Active bleeding/secretions detected in the oropharynx. Attempting Bag-Mask Ventilation (BMV) or intubation will force aspirate into the lungs. IMMEDIATE ACTION: Use Suction Airway.";
    }
    else if (patient.ventilationStatus === 'failed') {
      hint = "🔴 FAILED AIRWAY: Direct Laryngoscopy has failed. Call for help. Optimize with a Hyperangulated Video Laryngoscope (VL) or place a rescue Laryngeal Mask Airway (LMA) to re-establish oxygenation.";
    }
    // 3. BREATHING (B)
    else if (vitals.spo2 < 90 && !patient.airwaySecured) {
      hint = "🟠 HYPOXEMIA: Oxygen Saturation (SpO2) is critically low. Ensure High Flow Nasal Cannula or Bag-Mask Ventilation (BMV) is applied. If apneic, prioritize securing the airway immediately.";
    }
    else if (patient.isApneic && patient.oxygenBuffer < 30 && !patient.airwaySecured) {
      hint = "🟠 CRITICAL APNEA: The patient is not breathing and their Functional Residual Capacity (FRC) oxygen buffer is depleting. Denitrogenate (Pre-oxygenate) using Bag-Mask Ventilation (BMV) to buy time before intubation.";
    }
    // 4. CIRCULATION (C) - Hemodynamic Optimization
    else if (vitals.sys < 90) {
      if (vitals.hr > 100) {
        hint = "🔴 HYPOTENSION W/ TACHYCARDIA: The patient is hypotensive and tachycardic (compensatory or vasodilatory). Avoid Ephedrine (will worsen tachycardia). SUGGESTION: Administer Phenylephrine (50-100 mcg push) to increase Systemic Vascular Resistance (SVR).";
      } else {
        hint = "🔴 HYPOTENSION W/ BRADYCARDIA: The patient is hypotensive and heart rate is low/normal. SUGGESTION: Administer Ephedrine (5-10 mg push) for mixed alpha/beta-1 agonism, or Epinephrine (10-20 mcg push) if profound.";
      }
    }
    else if (vitals.sys > 160) {
      if (vitals.hr > 100) {
        hint = "🟠 HYPERTENSION W/ TACHYCARDIA: Sympathetic overdrive detected (likely pain or light anesthesia). SUGGESTION: Deepen anesthesia (Propofol 10-20 mg) or provide analgesia (Fentanyl 50-100 mcg). If vitals persist, consider Esmolol (10-20 mg push) to control HR and BP.";
      } else {
        hint = "🟠 ISOLATED HYPERTENSION: SUGGESTION: Consider deepening anesthesia, or administer a direct vasodilator like Nitroglycerin (50-100 mcg push) or a mixed antagonist like Labetalol (10-20 mg push).";
      }
    }
    else if (vitals.hr < 45) {
      hint = "🔴 SEVERE BRADYCARDIA: Heart rate is critically low, risking cardiac output. SUGGESTION: Administer Atropine (0.5 mg push) to block vagal tone, or Ephedrine (5-10 mg push) if accompanied by hypotension.";
    }
    else if (vitals.hr > 130 && vitals.sys > 100) {
      hint = "🟠 TACHYCARDIA: Evaluate for underlying causes (hypovolemia, pain, light anesthesia, hypoxia). If a primary arrhythmia is suspected, consider Adenosine (6 mg rapid push) for SVT or Amiodarone (150 mg) for ventricular rhythms.";
    }
    // 5. MAINTENANCE
    else if (!patient.airwaySecured && !patient.isApneic) {
      hint = "🟢 STABLE INDUCTION PREP: Hemodynamics are currently optimized. Continue pre-oxygenation to maximize the FRC buffer. Prepare Induction (e.g., Propofol 1.5-2.5 mg/kg) and Paralytic (e.g., Rocuronium 0.6-1.2 mg/kg) when ready to secure the airway.";
    } 
    else {
      hint = "🟢 HEMODYNAMICALLY STABLE: The patient's vitals are currently within acceptable clinical parameters. Continue monitoring End-Tidal Carbon Dioxide (EtCO2) and hemodynamics.";
    }

    // Push the hint to the log
    logEvent(`💡 ATTENDING CONSULT: ${hint}`);
  };

  const generateLab = (type) => {
    logEvent(`Sent ${type} to the lab...`);
    setTimeout(() => {
      let results = {};
      if (type === 'ABG') {
        const lactate = patient.isSeptic ? (4.5 + Math.random() * 2).toFixed(1) : (0.8 + Math.random() * 0.5).toFixed(1);
        results = {
          pH: { val: (7.35 - (patient.isSeptic ? 0.15 : 0)).toFixed(2), range: '7.35-7.45', alert: patient.isSeptic },
          pCO2: { val: (40 + (patient.isApneic ? 15 : 0)).toFixed(1), range: '35-45', alert: patient.isApneic },
          pO2: { val: Math.round(vitals.spo2 * 0.8), range: '80-100', alert: vitals.spo2 < 92 },
          HCO3: { val: (patient.isSeptic ? 18 : 24), range: '22-26', alert: patient.isSeptic },
          Lactate: { val: lactate, range: '0.5 - 2.0 mmol/L', alert: lactate > 2.0 }
        };
      } else if (type === 'CBC') {
        results = {
          Hgb: { val: (patient.trauma ? 8.2 : 13.5).toFixed(1), range: '13.5-17.5', alert: patient.trauma },
          WBC: { val: (patient.isSeptic ? 22.4 : 7.2).toFixed(1), range: '4.0-11.0', alert: patient.isSeptic },
          Plt: { val: (patient.trauma ? 110 : 250), range: '150-450', alert: patient.trauma }
        };
      } else if (type === 'CMP') {
        results = {
          Na: { val: 138, range: '135-145', alert: false },
          K: { val: (patient.trauma ? 5.2 : 4.1).toFixed(1), range: '3.5-5.1', alert: patient.trauma },
          Cr: { val: (patient.isSeptic ? 2.1 : 0.9).toFixed(1), range: '0.7-1.3', alert: patient.isSeptic },
          Gluc: { val: (patient.isSeptic ? 180 : 105), range: '70-100', alert: patient.isSeptic }
        };
      } else if (type === 'TEG') {
        results = {
          R: { val: (patient.trauma ? 12 : 6).toFixed(1), range: '5-10', alert: patient.trauma },
          MA: { val: (patient.trauma ? 45 : 60), range: '50-70', alert: patient.trauma },
          Angle: { val: (patient.trauma ? 48 : 65), range: '55-75', alert: patient.trauma }
        };
      } else if (type === 'VBG') {
        results = {
          pvH: { val: (7.31 - (patient.isSeptic ? 0.12 : 0)).toFixed(2), range: '7.31-7.41', alert: patient.isSeptic },
          pvCO2: { val: (46 + (patient.isApneic ? 12 : 0)).toFixed(1), range: '41-51', alert: patient.isApneic },
          Lactate: { val: (patient.isSeptic ? 5.4 : 0.8).toFixed(1), range: '0.5-2.2', alert: patient.isSeptic }
        };
      }

      setLabs(prev => {
        const existing = prev[type] || {
          testNames: Object.keys(results),
          history: []
        };
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
      logEvent(`✅ Intubation SUCCESSFUL. Tube secured to Mechanical Ventilator.`);
      setPatient(p => ({ ...p, airwaySecured: true, ventilationStatus: 'successful' }));
    } else {
      logEvent(`❌ Intubation FAILED. ${failReason}`);
      setPatient(p => ({ ...p, ventilationStatus: 'failed' }));
    }
    setViewModal({ show: false, blade: '', adjunct: '', description: '', trueGrade: 1 });
  };

  const renderFluidButton = (id, label, hint, colorClass) => {
    const isActive = fluidInput.fluid === id;
    return (
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => setFluidInput(isActive ? { fluid: null, dose: '' } : { fluid: id, dose: '' })}
          className={`${colorClass} p-2 rounded text-[10px] text-left border transition-all ${isActive ? 'ring-2 ring-white' : 'opacity-90 hover:opacity-100'}`}
        >
          {label} <span className="opacity-70 font-normal">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-1 animate-in slide-in-from-top-1 duration-200">
            <input 
              autoFocus type="number" placeholder="Vol (mL)" 
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-cyan-500"
              value={fluidInput.dose}
              onChange={(e) => setFluidInput(prev => ({ ...prev, dose: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fluidInput.dose) {
                  pushFluid(id, parseFloat(fluidInput.dose));
                  setFluidInput({ fluid: null, dose: '' });
                }
              }}
            />
            <button 
              onClick={() => {
                if (fluidInput.dose) {
                  pushFluid(id, parseFloat(fluidInput.dose));
                  setFluidInput({ fluid: null, dose: '' });
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-500 px-2 py-1 rounded text-[10px] font-bold"
            >GIVE</button>
          </div>
        )}
      </div>
    );
  };

  const renderMedButton = (id, label, hint, colorClass, isHypnotic = false, isParalytic = false) => {
    const isActive = medInput.drug === id;
    return (
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => setMedInput(isActive ? { drug: null, dose: '', category: '' } : { drug: id, dose: '', category: label })}
          className={`${colorClass} p-2 rounded text-[10px] text-left border transition-all ${isActive ? 'ring-2 ring-white' : 'opacity-90 hover:opacity-100'}`}
        >
          {label} <span className="opacity-70 font-normal">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-1 animate-in slide-in-from-top-1 duration-200">
            <input 
              autoFocus type="number" placeholder="Dose" 
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-cyan-500"
              value={medInput.dose}
              onChange={(e) => setMedInput(prev => ({ ...prev, dose: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && medInput.dose) {
                  pushMed(id, parseFloat(medInput.dose), isHypnotic, isParalytic);
                  setMedInput({ drug: null, dose: '', category: '' });
                }
              }}
            />
            <button 
              onClick={() => {
                if (medInput.dose) {
                  pushMed(id, parseFloat(medInput.dose), isHypnotic, isParalytic);
                  setMedInput({ drug: null, dose: '', category: '' });
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-500 px-2 py-1 rounded text-[10px] font-bold"
            >GO</button>
          </div>
        )}
      </div>
    );
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

  // Animation Speeds
  const stableHr = Math.round((vitals.hr || 70) / 5) * 5;
  const stableRr = Math.round((vitals.rr || 12) / 2) * 2;
  const hrSpeed = stableHr > 0 ? (60 / stableHr).toFixed(3) : 0;
  const rrSpeed = stableRr > 0 ? (60 / stableRr).toFixed(3) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 font-mono select-none flex flex-col gap-4">
      
      {/* HEADER & NEW HORIZONTAL FRC BUFFER */}
      <header className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-cyan-400">{activeCase.name}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span><span className="text-slate-500">Age:</span> {patient.age}</span>
            <span><span className="text-slate-500">Sex:</span> {patient.sex}</span>
            <span><span className="text-slate-500">Height:</span> {patient.height} cm</span>
            <span><span className="text-slate-500">TBW:</span> {patient.weight} kg</span>
          </div>
          
          {/* HORIZONTAL 3D CYLINDER FOR OXYGEN BUFFER */}
          <div className="flex items-center gap-4 mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800 w-max shadow-inner">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Pre-Ox FRC</p>
            <div className="h-6 w-64 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
               <div className="bg-blue-500 h-full transition-all duration-1000 ease-linear relative" style={{width: `${patient.oxygenBuffer}%`}}>
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20"></div> {/* 3D Shine Effect */}
               </div>
            </div>
            <span className="text-blue-400 font-black text-lg w-12 text-right">{Math.round(patient.oxygenBuffer)}%</span>
            <p className="text-slate-500 text-xs ml-2 border-l border-slate-700 pl-4">Device: <br/><span className="text-slate-300 font-bold">{patient.currentO2Device}</span></p>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setActiveCase(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition">End Case</button>
          <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm font-bold transition">
            <Undo2 size={16} /> Undo
          </button>
          <button onClick={() => setShowLabPanel(!showLabPanel)} className="px-4 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700 rounded text-sm font-bold flex items-center gap-2 transition">
            EMR Labs
          </button>
          <button onClick={() => setIsRunning(!isRunning)} className={`px-6 py-2 rounded font-bold shadow-lg transition ${isRunning ? 'bg-red-600' : 'bg-green-600'}`}>
            {isRunning ? 'PAUSE SIM' : 'START SIM'}
          </button>
        </div>
      </header>

      {/* EMR SLIDING PANEL */}
      <div className={`fixed top-0 right-0 h-full w-[500px] bg-slate-900 border-l border-slate-700 shadow-2xl z-[150] transform transition-transform duration-300 ease-in-out overflow-y-auto p-6 ${showLabPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2"><Search size={24}/> Electronic Medical Record</h2>
          <button onClick={() => setShowLabPanel(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>

        {Object.keys(labs).length === 0 ? (
          <div className="text-slate-500 italic text-center mt-20">No laboratory data available. Order labs from the clinical menu.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(labs).map(([labType, labData]) => (
              <div key={labType} className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 font-bold text-sm text-blue-200 uppercase tracking-wider">{labType} Panel</div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="p-3 text-slate-500 font-normal">Test Name</th>
                      {labData.history.map((h, i) => (
                        <th key={i} className="p-3 text-center text-slate-300">@ {h.time}</th>
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
                        <td className="p-3 text-slate-500 italic">{labData.history[0].results[testName].range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {pocusModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-8 max-w-lg shadow-2xl w-full text-center">
            <Search size={48} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">{pocusModal.title} Finding</h2>
            <p className="text-lg text-slate-300 mb-8 p-4 bg-slate-800 rounded border border-slate-700">"{pocusModal.finding}"</p>
            <button onClick={() => setPocusModal({show: false, title:'', finding:''})} className="bg-blue-600 hover:bg-blue-500 font-bold py-2 px-8 rounded">Close</button>
          </div>
        </div>
      )}

      {airwayQuizModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-8 max-w-2xl shadow-2xl w-full">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24}/> Pre-Intubation Airway Assessment</h2>
            <p className="text-lg text-slate-300 mb-6 italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-800/50 whitespace-pre-wrap">{airwayQuizModal.description}</p>
            <h3 className="text-yellow-400 font-bold mb-4">Based on your visualization, select the correct Mallampati Score:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(grade => (
                <button key={grade} onClick={() => submitAirwayQuiz(grade)} className="bg-slate-800 hover:bg-cyan-900 p-4 rounded text-left border border-slate-700 hover:border-cyan-400 transition">
                  <span className="font-bold text-white block">Mallampati Class {['I', 'II', 'III', 'IV'][grade-1]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {accessModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-green-500 rounded-xl p-8 max-w-4xl shadow-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Select {accessModal.category} Access Site</h2>
              <button onClick={() => setAccessModal({show: false, category: ''})} className="text-slate-400 hover:text-white"><X size={24}/></button>
            </div>
            
            {accessModal.category === 'Peripheral IV' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-green-400 mb-2">Antecubital (AC)</h3>
                  <button onClick={() => establishAccess('PIV', '16G PIV', 'Right AC')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-green-500">16G Right AC</button>
                  <button onClick={() => establishAccess('PIV', '18G PIV', 'Left AC')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-green-500">18G Left AC</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-green-400 mb-2">Forearm</h3>
                  <button onClick={() => establishAccess('PIV', '18G PIV', 'Right Forearm')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-green-500">18G Right Forearm</button>
                  <button onClick={() => establishAccess('PIV', '20G PIV', 'Left Forearm')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-green-500">20G Left Forearm</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-green-400 mb-2">Hand</h3>
                  <button onClick={() => establishAccess('PIV', '20G PIV', 'Right Hand')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-green-500">20G Right Hand</button>
                  <button onClick={() => establishAccess('PIV', '22G PIV', 'Left Hand')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-green-500">22G Left Hand</button>
                </div>
              </div>
            )}

            {accessModal.category === 'Central Line' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-purple-400 mb-2">Internal Jugular (IJ)</h3>
                  <button onClick={() => establishAccess('CVC', 'Triple Lumen CVC', 'Right IJ')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-purple-500">Right IJ (Standard)</button>
                  <button onClick={() => establishAccess('CVC', 'MAC Introducer', 'Right IJ')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-purple-500">Right IJ (MAC Cordis)</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-purple-400 mb-2">Subclavian</h3>
                  <button onClick={() => establishAccess('CVC', 'Triple Lumen CVC', 'Right Subclavian')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-purple-500">Right Subclavian</button>
                  <button onClick={() => establishAccess('CVC', 'Triple Lumen CVC', 'Left Subclavian')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-purple-500">Left Subclavian</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-purple-400 mb-2">Femoral</h3>
                  <button onClick={() => establishAccess('CVC', 'Triple Lumen CVC', 'Right Femoral')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-purple-500">Right Femoral</button>
                  <button onClick={() => establishAccess('CVC', 'Trauma Cordis', 'Right Femoral')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-purple-500">Right Femoral Cordis</button>
                </div>
              </div>
            )}

            {accessModal.category === 'Intraosseous (IO)' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-orange-400 mb-2">Proximal Tibia</h3>
                  <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Proximal Tibia')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-orange-500">Right Tibia</button>
                  <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Proximal Tibia')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Tibia</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-orange-400 mb-2">Humeral Head</h3>
                  <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Humeral Head')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm mb-1 border border-transparent hover:border-orange-500">Right Humerus</button>
                  <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Humeral Head')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Humerus</button>
                </div>
              </div>
            )}

            {accessModal.category === 'Arterial Line' && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Radial</h3>
                  <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Right Radial')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-xs mb-1 border border-transparent hover:border-red-500">Right Radial</button>
                  <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Left Radial')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left Radial</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Brachial</h3>
                  <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Right Brachial')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-xs mb-1 border border-transparent hover:border-red-500">Right Brachial</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Axillary</h3>
                  <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Right Axillary')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-xs mb-1 border border-transparent hover:border-red-500">Right Axillary</button>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Femoral</h3>
                  <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Right Femoral')} className="block w-full text-left p-2 hover:bg-slate-700 rounded text-xs mb-1 border border-transparent hover:border-red-500">Right Femoral</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tubeConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl p-8 max-w-xl shadow-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Stethoscope size={24}/> Auscultate</h2>
              <button onClick={() => setTubeConfirmModal(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
            </div>
            <p className="text-slate-300 mb-6">Select an anatomical location to auscultate for breath sounds or gastric insufflation:</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => auscultateLungs('Left Lung')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold">Left Lung Field</button>
              <button onClick={() => auscultateLungs('Right Lung')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold">Right Lung Field</button>
              <button onClick={() => auscultateLungs('Epigastrium')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold">Epigastrium (Stomach)</button>
            </div>
          </div>
        </div>
      )}

      {setupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-green-500 rounded-xl p-8 max-w-3xl shadow-2xl w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Equipment Selection</h2>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-green-400 font-bold mb-3 border-b border-green-900 pb-1">1. Select Blade / Scope</h3>
                <div className="flex flex-col gap-2">
                  {['Macintosh 3 (Curved DL)', 'Macintosh 4 (Curved DL)', 'Miller 2 (Straight DL)', 'Standard Geometry Video Laryngoscope (VL)', 'Hyperangulated Video Laryngoscope (VL)', 'Fiberoptic Bronchoscope'].map(blade => (
                    <button key={blade} onClick={() => setViewModal(prev => ({...prev, blade}))} className={`p-2 rounded text-sm text-left border ${viewModal.blade === blade ? 'bg-green-800 border-green-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>{blade}</button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-blue-400 font-bold mb-3 border-b border-blue-900 pb-1">2. Select Adjunct</h3>
                <div className="flex flex-col gap-2">
                  {['None (Direct Tube)', 'Standard Malleable Stylet', 'Standard Bougie (Eschmann)', 'Articulating Bougie / Steerable'].map(adjunct => (
                    <button key={adjunct} onClick={() => setViewModal(prev => ({...prev, adjunct}))} className={`p-2 rounded text-sm text-left border ${viewModal.adjunct === adjunct ? 'bg-blue-800 border-blue-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>{adjunct}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setSetupModal(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold">Cancel</button>
              <button onClick={() => processIntubation(viewModal.blade, viewModal.adjunct)} disabled={!viewModal.blade || !viewModal.adjunct} className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded font-bold text-white">Proceed to Intubate</button>
            </div>
          </div>
        </div>
      )}

      {viewModal.show && viewModal.description && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-8 max-w-2xl shadow-2xl w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Direct Visualization: {viewModal.blade}</h2>
            <p className="text-lg text-slate-300 mb-8 italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-800/50">"{viewModal.description}"</p>
            <h3 className="text-yellow-400 font-bold mb-4">Select the Cormack-Lehane Grade:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(grade => (
                <button key={grade} onClick={() => submitGrade(grade)} className="bg-slate-800 hover:bg-cyan-900 p-4 rounded text-left border border-slate-700 hover:border-cyan-400 transition">
                  <span className="font-bold text-white block">Grade {['I', 'II', 'III', 'IV'][grade-1]}</span>
                  {['Full view of glottis', 'Partial view of glottis', 'Epiglottis only visible', 'No structures visible'][grade-1]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY ICU MONITOR */}
      <div className="bg-black border-2 border-slate-800 rounded-xl p-4 grid grid-cols-4 gap-4 h-80 shadow-2xl relative overflow-hidden">
        
        <div className="col-span-3 flex flex-col justify-between relative z-10 w-full h-full">
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-green-500/30 text-xs top-1 left-1 z-20">ECG II</div>
            <CanvasWaveform color="#22c55e" speed={hrSpeed} rrSpeed={rrSpeed} active={true} type="ecg" />
          </div>
          
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-cyan-500/30 text-xs top-1 left-1 z-20">PLETH</div>
            <CanvasWaveform color="#06b6d4" speed={hrSpeed} rrSpeed={rrSpeed} active={vitals.spo2 > 50} type="pleth" />
          </div>
          
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-yellow-400/30 text-xs top-1 left-1 z-20">EtCO2</div>
            <CanvasWaveform color="#facc15" speed={rrSpeed} rrSpeed={rrSpeed} active={vitals.etco2 > 5} type="etco2" />
          </div>

          {patient.hasALine && (
            <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
              <div className="absolute text-red-500/30 text-xs top-1 left-1 z-20">ART (A-Line)</div>
              <CanvasWaveform color="#ef4444" speed={hrSpeed} rrSpeed={rrSpeed} active={true} type="aline" />
            </div>
          )}
        </div>

        <div className="col-span-1 flex flex-col justify-between bg-slate-900/50 p-3 rounded z-30">
          <div className="flex justify-between items-start">
            <div className="text-green-500 font-bold flex items-center gap-1"><Heart size={14}/> HR</div>
            <div className="text-5xl font-black text-green-400">{vitals.hr}</div>
          </div>
          
          <div className="flex justify-between items-start mt-2">
            <div className="text-cyan-500 font-bold flex items-center gap-1"><Wind size={14}/> SpO2</div>
            <div className={`text-5xl font-black ${vitals.spo2 < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>{vitals.spo2}</div>
          </div>
          
          <div className="flex justify-between items-start mt-2">
            <div className="text-red-500 font-bold flex flex-col items-start gap-1">
              <span className="flex items-center gap-1"><Activity size={14}/> {patient.hasALine ? 'ART' : 'NIBP'}</span>
              {!patient.hasALine && <button onClick={cycleNibp} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded transition ml-1"><RefreshCw size={10}/></button>}
            </div>
            <div className="text-3xl font-black text-red-400 mt-1 text-right">
              {patient.hasALine ? `${vitals.sys}/${vitals.dia}` : `${nibp.sys}/${nibp.dia}`}
            </div>
          </div>

          <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-800">
            <div>
              <div className="text-yellow-400 font-bold text-xs mb-1">EtCO2</div>
              <div className="text-4xl font-black text-yellow-400">{vitals.etco2}</div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-xs mb-1">RR</div>
              <div className={`text-4xl font-black ${vitals.rr < 8 ? 'text-slate-400 animate-pulse' : 'text-white'}`}>{vitals.rr}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY VENTILATOR MONITOR */}
      {patient.airwaySecured && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl p-3 grid grid-cols-4 gap-4 h-48 shadow-2xl relative overflow-hidden">
          <div className="col-span-3 flex flex-col justify-between relative z-10 gap-1">
            <div className="h-1/3 flex items-center w-full border-b border-slate-800 relative overflow-hidden">
              <div className="absolute text-yellow-500/50 text-xs top-0 left-1 z-20">Paw (cmH2O)</div>
              <SvgWaveform path={PATHS.ventPressure} color="#eab308" speed={rrSpeed} active={rrSpeed > 0} />
            </div>
            <div className="h-1/3 flex items-center w-full border-b border-slate-800 relative overflow-hidden">
              <div className="absolute text-green-500/50 text-xs top-0 left-1 z-20">Flow (L/min)</div>
              <SvgWaveform path={PATHS.ventFlow} color="#22c55e" speed={rrSpeed} active={rrSpeed > 0} />
            </div>
            <div className="h-1/3 flex items-center w-full relative overflow-hidden">
              <div className="absolute text-cyan-500/50 text-xs top-0 left-1 z-20">Volume (mL)</div>
              <SvgWaveform path={PATHS.ventVolume} color="#06b6d4" speed={rrSpeed} active={rrSpeed > 0} />
            </div>
          </div>

          <div className="col-span-1 grid grid-cols-2 gap-2 bg-black p-2 rounded z-30 content-start">
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-yellow-500 text-[10px] uppercase font-bold">PIP</div>
              <div className="text-xl font-black text-yellow-400">{Math.round(vitals.pip)}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-yellow-600 text-[10px] uppercase font-bold">Pplat</div>
              <div className="text-xl font-black text-yellow-500">{Math.round(vitals.pplat)}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-cyan-500 text-[10px] uppercase font-bold">VTE</div>
              <div className="text-xl font-black text-cyan-400">{Math.round(vitals.vte)}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold">RR</div>
              <div className="text-xl font-black text-white">{vitals.rr}</div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[400px]">
        {/* Col 1: Assess, Access & O2 */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center gap-2"><Eye size={14}/> Assess / POCUS</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={examineAirway} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow border border-slate-600 col-span-2 text-center font-bold">Examine Airway (Look/Feel)</button>
            <button onClick={() => handlePocus('Cardiac (TTE)')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Cardiac (TTE)</button>
            <button onClick={() => handlePocus('Lung')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Lung (Pleural)</button>
            <button onClick={() => handlePocus('Gastric')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Gastric (Antrum)</button>
            <button onClick={() => handlePocus('Airway')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow border border-blue-900 text-blue-200">Airway (Trachea)</button>
            <button onClick={() => handlePocus('eFAST')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow col-span-2 text-center border border-purple-900 text-purple-200">Trauma eFAST Exam</button>
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Syringe size={14}/> Vascular Access</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAccessModal({show: true, category: 'Peripheral IV'})} className="bg-slate-800 hover:bg-green-900 p-2 rounded text-[11px] text-center shadow border border-slate-700 hover:border-green-500 transition">Place PIV</button>
            <button onClick={() => setAccessModal({show: true, category: 'Central Line'})} className="bg-slate-800 hover:bg-purple-900 p-2 rounded text-[11px] text-center shadow border border-slate-700 hover:border-purple-500 transition">Place CVC</button>
            <button onClick={() => setAccessModal({show: true, category: 'Intraosseous (IO)'})} className="bg-slate-800 hover:bg-orange-900 p-2 rounded text-[11px] text-center shadow border border-slate-700 hover:border-orange-500 transition">Place IO</button>
            <button onClick={() => setAccessModal({show: true, category: 'Arterial Line'})} className="bg-slate-800 hover:bg-red-900 p-2 rounded text-[11px] text-center shadow border border-slate-700 hover:border-red-500 transition">Place A-Line</button>
          </div>
          {patient.accessLines && patient.accessLines.length > 0 && (
            <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Active Lines:</span>
              <ul className="text-xs text-slate-300 list-disc pl-4">
                {patient.accessLines.map((line, idx) => <li key={idx}>{line}</li>)}
              </ul>
            </div>
          )}
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Search size={14}/> Diagnostics</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => generateLab('ABG')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order ABG</button>
            <button onClick={() => generateLab('VBG')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order VBG</button>
            <button onClick={() => generateLab('CBC')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order CBC</button>
            <button onClick={() => generateLab('CMP')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order CMP</button>
            <button onClick={() => generateLab('TEG')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 col-span-2 text-center">Order TEG / Coags</button>
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Wind size={14}/> Oxygenation</h3>
          <div className="flex flex-col gap-2">
            {renderO2Button('Nasal Cannula', 'Nasal Cannula (1-15L)', 'flow')}
            {renderO2Button('Simple Face Mask', 'Simple Face Mask (5-10L)', 'flow')}
            {renderO2Button('Non-Rebreather Mask (NRB)', 'Non-Rebreather Mask (15L, 100% FiO2)', 'fixed')}
            {renderO2Button('High Flow Nasal Cannula (HFNC)', 'High Flow Nasal Cannula (Flow / FiO2)', 'hfnc')}
            {renderO2Button('Bag-Mask Valve (BMV)', 'Bag-Mask Ventilation (15L, 100% FiO2)', 'fixed')}
          </div>
        </div>

        {/* Col 2: Pharmacopoeia */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-teal-400 text-sm border-b border-teal-900 pb-1 uppercase font-bold">Fluids & Blood Products</h3>
          <div className="flex flex-col gap-1">
            {renderFluidButton('Lactated Ringers (LR)', 'Lactated Ringers (LR)', '500-1000 mL', 'bg-blue-900/20 border-blue-800')}
            {renderFluidButton('Normal Saline (NS)', 'Normal Saline (0.9% NS)', '500-1000 mL', 'bg-blue-900/20 border-blue-800')}
            {renderFluidButton('Plasmalyte', 'Plasmalyte', '500-1000 mL', 'bg-blue-900/20 border-blue-800')}
            {renderFluidButton('PRBCs', 'Packed Red Blood Cells', '1-2 Units', 'bg-red-900/40 border-red-800')}
            {renderFluidButton('FFP', 'Fresh Frozen Plasma', '1-2 Units', 'bg-yellow-900/40 border-yellow-800')}
            {renderFluidButton('Platelets', 'Platelets', '1 Unit', 'bg-yellow-900/40 border-yellow-800')}
            {renderFluidButton('Cryoprecipitate', 'Cryoprecipitate', '10 Units', 'bg-slate-800 border-slate-700')}
            {renderFluidButton('Fibrinogen', 'Fibrinogen', '2-4 g', 'bg-slate-800 border-slate-700')}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold">Induction / Hypnotics</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('propofol', 'Propofol (mg)', '1.5-2.5 mg/kg', 'bg-purple-900/40 border-purple-800', true)}
            {renderMedButton('ketamine', 'Ketamine (mg)', '1.0-2.0 mg/kg', 'bg-purple-900/40 border-purple-800', true)}
            {renderMedButton('etomidate', 'Etomidate (mg)', '0.2-0.3 mg/kg', 'bg-purple-900/40 border-purple-800', true)}
            {renderMedButton('midazolam', 'Midazolam (mg)', '0.02-0.04 mg/kg', 'bg-purple-900/40 border-purple-800')}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Paralytics (NMBAs)</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('succinylcholine', 'Succinylcholine (mg)', '1.0-1.5 mg/kg', 'bg-orange-900/40 border-orange-800', false, true)}
            {renderMedButton('rocuronium', 'Rocuronium (mg)', '0.6-1.2 mg/kg', 'bg-orange-900/40 border-orange-800', false, true)}
            {renderMedButton('vecuronium', 'Vecuronium (mg)', '0.08-0.1 mg/kg', 'bg-orange-900/40 border-orange-800', false, true)}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Analgesics</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('fentanyl', 'Fentanyl (mcg)', '1.0-2.0 mcg/kg', 'bg-slate-800 border-slate-700')}
            {renderMedButton('hydromorphone', 'Hydromorphone (mg)', '0.2-1.0 mg', 'bg-slate-800 border-slate-700')}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Pressors / Inotropes</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('epinephrine_push', 'Epi Push (mcg)', '10-100 mcg', 'bg-red-900/40 border-red-800')}
            {renderMedButton('phenylephrine', 'Phenylephrine (mcg)', '50-100 mcg', 'bg-red-900/40 border-red-800')}
            {renderMedButton('ephedrine', 'Ephedrine (mg)', '5-10 mg', 'bg-red-900/40 border-red-800')}
            {renderMedButton('norepinephrine', 'Norepi Gtt (mcg/min)', '1-30 mcg/min', 'bg-red-900/40 border-red-800')}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Antihypertensives</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('esmolol', 'Esmolol (mg)', '0.5-1.0 mg/kg', 'bg-blue-900/40 border-blue-800 text-blue-200')}
            {renderMedButton('labetalol', 'Labetalol (mg)', '10-20 mg', 'bg-blue-900/40 border-blue-800 text-blue-200')}
            {renderMedButton('nitroglycerin', 'Nitroglycerin (mcg)', '5-100 mcg/min', 'bg-blue-900/40 border-blue-800 text-blue-200')}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Anti-Arrhythmics</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('amiodarone', 'Amiodarone (mg)', '150 mg', 'bg-yellow-900/40 border-yellow-800 text-yellow-200')}
            {renderMedButton('lidocaine', 'Lidocaine (mg)', '1.0-1.5 mg/kg', 'bg-yellow-900/40 border-yellow-800 text-yellow-200')}
            {renderMedButton('adenosine', 'Adenosine (mg)', '6-12 mg', 'bg-yellow-900/40 border-yellow-800 text-yellow-200')}
            {renderMedButton('atropine', 'Atropine (mg)', '0.5-1.0 mg', 'bg-yellow-900/40 border-yellow-800 text-yellow-200')}
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">ACLS / Resuscitation</h3>
          <div className="flex flex-col gap-1">
            {renderMedButton('epinephrine_acls', 'Epinephrine (mg)', '1.0 mg', 'bg-rose-900/60 border-rose-500 font-bold text-white')}
            {renderMedButton('amiodarone_acls', 'Amiodarone (mg)', '300 mg', 'bg-rose-900/60 border-rose-500 font-bold text-white')}
          </div>
        </div>

        {/* Col 3: Airway Procedures */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold">Airway Optimization</h3>
          <div className="flex flex-col gap-2">
            <button onClick={handleSuction} className="bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-600 p-3 rounded text-sm font-bold text-left shadow flex justify-between">Suction Airway <Droplet size={18} className="text-yellow-400"/></button>
            <div className="grid grid-cols-1 gap-2 mt-1">
              <button onClick={() => optimizeAirway('Oropharyngeal Airway (OPA) - Guedel 80mm')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Oropharyngeal Airway (OPA) - Guedel 80mm</button>
              <button onClick={() => optimizeAirway('Oropharyngeal Airway (OPA) - Guedel 100mm')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Oropharyngeal Airway (OPA) - Guedel 100mm</button>
              <button onClick={() => optimizeAirway('Nasopharyngeal Airway (NPA) - 28F')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Nasopharyngeal Airway (NPA) - 28F</button>
              <button onClick={() => optimizeAirway('Nasopharyngeal Airway (NPA) - 32F')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Nasopharyngeal Airway (NPA) - 32F</button>
            </div>
            <button onClick={() => pushMed('Topical Lidocaine 4% (Atomizer)', 0)} className="bg-teal-900/40 hover:bg-teal-800 p-2 rounded text-xs text-center border border-teal-800 mt-1">Topicalize Airway (Awake Prep)</button>
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Intubation</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => { setViewModal(v => ({...v, blade: '', adjunct: ''})); setSetupModal(true); }} className="bg-green-900/40 hover:bg-green-800 p-4 rounded text-base text-center border border-green-500 font-black shadow-lg uppercase text-green-300">
              Prepare to Intubate
            </button>
            <button onClick={() => setTubeConfirmModal(true)} className="bg-indigo-900/40 hover:bg-indigo-800 p-2 rounded text-sm text-center border border-indigo-500 text-indigo-200 mt-1 z-[60] relative">
              <Stethoscope size={14} className="inline mr-2"/> Confirm Placement
            </button>
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Rescue / Surgical</h3>
          <div className="flex flex-col gap-2 mt-1">
            <button onClick={() => {logEvent("Placed LMA Classic."); setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful'}))}} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Insert LMA (Classic)</button>
            <button onClick={() => {logEvent("Performed Surgical Cric."); setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful'}))}} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left text-red-200 border border-red-900">Surgical Cricothyroidotomy</button>
          </div>
        </div>

        {/* Col 4: Log */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
            <h3 className="text-yellow-400 font-bold flex items-center gap-2"><Zap size={18}/> Clinical Log</h3>
            <button 
              onClick={generateClinicalHint}
              className="flex items-center gap-1 bg-purple-900/40 hover:bg-purple-800 text-purple-300 px-2 py-1 rounded text-[10px] font-bold transition"
            >
              <Search size={12}/> Get Clinical Hint
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {logs.map((log, index) => (
              <div key={index} className={index === 0 ? "text-sm text-white font-bold" : "text-[11px] text-slate-400"}>{log}</div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}