import React, { useState, useEffect } from 'react';
import { usePhysiology } from './engine/usePhysiology';
import { Activity, Heart, Wind, Undo2, Syringe, Stethoscope, Droplet, Zap, Search, Eye, RefreshCw, X } from 'lucide-react';
import { WAVEFORMS } from './engine/WaveformDatabase';
import { MEDICATIONS } from './engine/Pharmacology';

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

// =========================================================================
// 1. PRIMARY MONITOR CANVAS ENGINE (For ECG, SpO2, EtCO2, A-Line)
// =========================================================================
const CanvasWaveform = React.memo(({ color, speed, rrSpeed = 0, active, type = 'ecg', morphology = 'normal' }) => {
  const canvasRef = React.useRef(null);
  // eslint-disable-next-line react-hooks/purity
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
      let y;
      
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

const TEGVisualizer = React.memo(({ historyData }) => {
  // Draws the TEG Pin/Cup diagram. R is flat line latency, Angle is slope of divergence, MA is max vertical amplitude.
  const generateTEGPath = (r, angleDeg, ma) => {
    const scaleX = 2; // pixel per minute
    const R_px = r * scaleX;
    const startY = 75; // center of 150px height
    const rad = angleDeg * (Math.PI / 180);

    // Calculate the point where divergence hits Max Amplitude (MA)
    const distanceToMA = (ma / 2) / Math.tan(rad);
    const maX = R_px + distanceToMA;

    // Upper path
    const path = `M 0,${startY} L ${R_px},${startY} L ${maX},${startY - (ma/2)} L 300,${startY - (ma/2)} ` +
                 // Lower path (mirrored)
                 `M 0,${startY} L ${R_px},${startY} L ${maX},${startY + (ma/2)} L 300,${startY + (ma/2)}`;
    return path;
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Blue, Green, Yellow, Red

  return (
    <div className="w-full h-48 bg-slate-900 rounded-lg border border-slate-700 relative overflow-hidden flex items-center mb-4">
      <div className="absolute left-2 top-2 text-[10px] text-slate-500 font-bold tracking-widest">THROMBOELASTOGRAPHY (OVERLAY)</div>
      <svg viewBox="0 0 300 150" className="w-full h-full preserveAspectRatio-none">
        {/* Center baseline grid */}
        <line x1="0" y1="75" x2="300" y2="75" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        {historyData && historyData.map((h, i) => (
          <path key={i} d={generateTEGPath(parseFloat(h.results['R'].val), parseFloat(h.results['Angle'].val), parseFloat(h.results['MA'].val))} fill="none" stroke={colors[i % colors.length]} strokeWidth="2" opacity={i === historyData.length - 1 ? 1.0 : 0.4} />
        ))}
      </svg>
      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-3">
        {historyData && historyData.map((h, i) => (
          <div key={i} className="flex items-center gap-1 text-[9px] text-white"><div className="w-2 h-2 rounded-full" style={{backgroundColor: colors[i % colors.length]}}></div> @ {h.time}</div>
        ))}
      </div>
    </div>
  );
});

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
        // eslint-disable-next-line react-hooks/refs
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
  const [tubeConfirmModal, setTubeConfirmModal] = useState({ show: false, result: '' });
  const [medInput, setMedInput] = useState({ drug: null, dose: '', indication: '', route: 'IV', type: 'Bolus', unit: '' });
  const [o2Input, setO2Input] = useState({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });

  const [viewModal, setViewModal] = useState({ show: false, blade: '', bladeSize: '', tubeSize: '', adjunct: '', description: '', trueGrade: 1 });
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });
  const [setupModal, setSetupModal] = useState(false);
  const [pocusModal, setPocusModal] = useState({ show: false, title: '', finding: '' });

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const logEvent = (msg) => setLogs(prev => [`${formatTime(time)} - ${msg}`, ...prev]);

  const { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid } = usePhysiology({
    activeCase, isRunning, isPaused: viewModal.show || setupModal || pocusModal.show || airwayQuizModal.show || accessModal.show || tubeConfirmModal.show, logEvent
  });

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
    if (device.includes('Laryngeal Mask Airway')) {
      logEvent(`✅ Placed ${device}. Airway secured via supraglottic device.`);
      setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful', currentO2Device: 'LMA (100% FiO2)', currentFiO2: 100, currentO2Flow: 15}));
      return;
    }
    logEvent(`✅ Placed ${device}. Airway patency improved for BMV.`);
    setPatient(p => ({...p, bmvOptimized: true}));
  };

  const handleSetO2 = (id, flow, fio2) => {
    if (id === 'Room Air') {
      logEvent(`Removed O2 device. Patient on Room Air.`);
      setPatient(p => ({ ...p, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21 }));
      setO2Input({ device: null, flow: '', fio2: '' });
      return;
    }

    let desc = id;
    let tFio2 = 21;
    let tFlow = flow ? parseInt(flow) : (id.includes('Cannula') ? 2 : 15);

    if (id === 'Bag-Mask Valve (BMV)' || id.includes('Non-Rebreather')) { tFio2 = 100; tFlow = 15; }
    else if (id.includes('Nasal Cannula')) tFio2 = 21 + (tFlow * 4);
    else if (id.includes('Face Mask')) tFio2 = 40 + (tFlow * 2);
    else if (id.includes('High Flow') && fio2) tFio2 = parseInt(fio2);

    saveState(`Applied ${desc}. O2 Buffer equilibrating...`);
    setPatient(p => ({ ...p, currentO2Device: desc + ` (${tFio2}%)`, currentO2Flow: tFlow, currentFiO2: Math.min(100, tFio2) }));
    setO2Input({ device: null, flow: '', fio2: '' });
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

  const adjustTube = (action) => {
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
      logEvent("Extubated patient. Removed Endotracheal Tube.");
      setPatient(p => ({ ...p, airwaySecured: false, ventilationStatus: patient.isApneic ? 'failed' : 'spontaneous', tubePosition: null }));
      setTubeConfirmModal({ show: false, result: '' });
    }
  };

  const saveState = (actionName) => {
    setHistory((prev) => [...prev, { time, vitals: { ...vitals }, targetVitals: {...targetVitals}, patient: { ...patient }, logs: [...logs] }]);
    if (actionName) logEvent(actionName);
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

  const handleUndo = () => {};

  const generateClinicalHint = () => {
    if (!activeCase) return;
    
    let hint;

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

  const renderAdvancedO2Button = (id, label, type) => {
    const isActive = o2Input.device === id;
    return (
      <div className="flex flex-col gap-1">
        <button onClick={() => setO2Input(isActive ? { device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' } : { device: id, flow: '', fio2: '', ipap: '', epap: '', rate: '' })}
          className={`bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border transition-all ${isActive ? 'border-blue-400' : 'border-transparent'}`}>
          {label}
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-blue-900 rounded animate-in slide-in-from-top-1 duration-200">
            <div className="flex gap-1">
              {(type === 'flow' || type === 'hfnc') && <input type="number" placeholder="Flow (LPM)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={o2Input.flow} onChange={(e) => setO2Input({ ...o2Input, flow: e.target.value })} />}
              {(type === 'hfnc' || type === 'cpap' || type === 'bipap') && <input type="number" placeholder="FiO2 (%)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={o2Input.fio2} onChange={(e) => setO2Input({ ...o2Input, fio2: e.target.value })} />}
            </div>
            {type === 'cpap' && (
              <div className="flex gap-1">
                <input type="number" placeholder="CPAP / PEEP (cmH2O)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={o2Input.epap} onChange={(e) => setO2Input({ ...o2Input, epap: e.target.value })} />
              </div>
            )}
            {type === 'bipap' && (
              <div className="flex gap-1">
                <input type="number" placeholder="IPAP" className="w-1/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={o2Input.ipap} onChange={(e) => setO2Input({ ...o2Input, ipap: e.target.value })} />
                <input type="number" placeholder="EPAP" className="w-1/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={o2Input.epap} onChange={(e) => setO2Input({ ...o2Input, epap: e.target.value })} />
                <input type="number" placeholder="Rate" className="w-1/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={o2Input.rate} onChange={(e) => setO2Input({ ...o2Input, rate: e.target.value })} />
              </div>
            )}
            <button onClick={() => {
                if (type === 'fixed') handleSetO2(id, 15, 100);
                else handleSetO2(id, o2Input.flow, o2Input.fio2, o2Input.ipap, o2Input.epap, o2Input.rate);
            }} className="w-full bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs font-bold text-white">APPLY OXYGENATION</button>
          </div>
        )}
      </div>
    );
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
      // eslint-disable-next-line react-hooks/purity
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

  const renderAirwayToolButton = (id, label, hint, sizes) => {
    const isActive = airwayToolInput.tool === id;
    return (
      <div className="flex flex-col gap-1 mb-1">
        <button onClick={() => setAirwayToolInput(isActive ? { tool: null, size: '' } : { tool: id, size: sizes[0] })} className={`bg-slate-800 p-2 rounded text-xs text-left border transition-all ${isActive ? 'border-yellow-400' : 'border-slate-700'}`}>
          {label} <span className="text-[10px] text-slate-500 float-right">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-2 p-2 bg-slate-900 border border-yellow-900 rounded animate-in slide-in-from-top-1">
            <select value={airwayToolInput.size} onChange={(e) => setAirwayToolInput({...airwayToolInput, size: e.target.value})} className="w-2/3 bg-slate-950 text-xs text-white border border-slate-700 p-1 rounded">
              {sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => { optimizeAirway(`${id} (Size ${airwayToolInput.size})`); setAirwayToolInput({ tool: null, size: ''}); }} className="w-1/3 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-bold">PLACE</button>
          </div>
        )}
      </div>
    );
  };

const renderAdvancedMedButton = (medId) => {
  const med = MEDICATIONS[medId];
  if (!med) return null;
  const isActive = medInput.drug === medId;
  const indicationKeys = Object.keys(med.indications);

  const handleIndicationChange = (e) => {
    const ind = e.target.value;
    const data = med.indications[ind];
    setMedInput({ ...medInput, indication: ind, route: med.routes[0], type: data.type, unit: data.unit, dose: '' });
  };

  return (
    <div className="flex flex-col gap-1 mb-2">
      <button onClick={() => setMedInput(isActive ? { drug: null } : { drug: medId, indication: indicationKeys[0], route: med.routes[0], type: med.indications[indicationKeys[0]].type, unit: med.indications[indicationKeys[0]].unit, dose: '' })}
        className={`bg-slate-800 p-2 rounded text-[11px] text-left border transition-all ${isActive ? 'border-cyan-400 ring-1 ring-cyan-500' : 'border-slate-700 hover:border-slate-500'}`}>
        <span className="font-bold text-white">{med.name}</span> <span className="text-slate-400 text-[9px] float-right">{med.classes[0]}</span>
      </button>
      {isActive && (
        <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-cyan-900 rounded animate-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold px-1 uppercase tracking-widest border-b border-cyan-900/50 pb-1">
            <span>Dosing Profile</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-white">Uses {med.dosingWeight || 'TBW'}</span>
          </div>
          <select value={medInput.indication} onChange={handleIndicationChange} className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded p-1">
            {indicationKeys.map(ind => <option key={ind} value={ind}>{ind} (Rec: {med.indications[ind].dose} {med.indications[ind].unit})</option>)}
          </select>
          <div className="flex gap-2">
            <select value={medInput.route} onChange={(e)=>setMedInput({...medInput, route: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/3">
              {med.routes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input autoFocus type="number" placeholder={`Dose (${medInput.unit})`} className="w-1/3 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
              value={medInput.dose} onChange={(e) => setMedInput({...medInput, dose: e.target.value})} />
            <button onClick={() => { if (medInput.dose) { processMed(medId, medInput.dose, medInput.route, medInput.type, medInput.unit); setMedInput({ drug: null }); } }}
              className="w-1/3 bg-cyan-700 hover:bg-cyan-600 rounded text-xs font-bold text-white">
              {medInput.type === 'Infusion' ? 'START INF' : 'PUSH'}
            </button>
          </div>
          {medInput.type === 'Infusion' && (
            <button onClick={() => { processMed(medId, 0, 'IV', 'Stop Infusion', ''); setMedInput({ drug: null }); }} className="w-full bg-red-900/40 border border-red-800 hover:bg-red-800 text-red-200 py-1 rounded text-xs font-bold">STOP INFUSION</button>
          )}
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg gap-4">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <h1 className="text-2xl font-bold text-cyan-400">{activeCase.name}</h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-slate-300">
            <span><span className="text-slate-500">Age:</span> {patient.age}</span>
            <span><span className="text-slate-500">Sex:</span> {patient.sex}</span>
            <span><span className="text-slate-500">Height:</span> {patient.height} cm</span>
            <span><span className="text-slate-500">TBW:</span> {patient.weight} kg</span>
            <span><span className="text-slate-500">IBW:</span> {Math.round(patient.ibw || 0)} kg</span>
          </div>
          
          {/* HORIZONTAL 3D CYLINDER FOR OXYGEN BUFFER */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 bg-slate-950 p-2 md:p-3 rounded-lg border border-slate-800 w-full md:w-max shadow-inner">
            <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest">Pre-Ox FRC</p>
            <div className="h-6 w-full max-w-[200px] md:max-w-xs bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
               <div className="bg-blue-500 h-full transition-all duration-1000 ease-linear relative" style={{width: `${patient.oxygenBuffer}%`}}>
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20"></div> {/* 3D Shine Effect */}
               </div>
            </div>
            <span className="text-blue-400 font-black text-base md:text-lg w-10 md:w-12 text-right">{Math.round(patient.oxygenBuffer)}%</span>
            <p className="text-slate-500 text-[10px] md:text-xs ml-0 md:ml-2 border-l-0 md:border-l border-slate-700 pl-0 md:pl-4">Device: <br className="hidden md:block"/><span className="text-slate-300 font-bold">{patient.currentO2Device}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap justify-start md:justify-end gap-2 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={() => setActiveCase(null)} className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs md:text-sm transition flex-1 md:flex-none">End Case</button>
          <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-xs md:text-sm font-bold transition flex-1 md:flex-none">
            <Undo2 size={16} /> Undo
          </button>
          <button onClick={() => setShowLabPanel(!showLabPanel)} className="px-3 md:px-4 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700 rounded text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition flex-1 md:flex-none">
            EMR Labs
          </button>
          <button onClick={() => setIsRunning(!isRunning)} className={`px-4 md:px-6 py-2 rounded text-xs md:text-sm font-bold shadow-lg transition w-full md:w-auto ${isRunning ? 'bg-red-600' : 'bg-green-600'}`}>
            {isRunning ? 'PAUSE SIM' : 'START SIM'}
          </button>
        </div>
      </header>

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

      {/* MODALS */}
      {pocusModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-purple-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Eye size={24}/> {pocusModal.title}</h2>
              <button onClick={() => setPocusModal({ show: false, title: '', finding: '' })} className="text-slate-400 hover:text-white"><X size={24}/></button>
            </div>
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
              <p className="text-purple-300 font-bold text-sm uppercase mb-2">Ultrasound Findings</p>
              <p className="text-white text-base md:text-lg">{pocusModal.finding}</p>
            </div>
            <button onClick={() => setPocusModal({ show: false, title: '', finding: '' })} className="mt-6 w-full bg-slate-700 hover:bg-slate-600 p-3 rounded font-bold text-white">Close Image</button>
          </div>
        </div>
      )}

      {airwayQuizModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-2xl shadow-2xl">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24}/> Pre-Intubation Airway Assessment</h2>
            <p className="text-sm md:text-lg text-slate-300 mb-6 italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-800/50 whitespace-pre-wrap">{airwayQuizModal.description}</p>
            <h3 className="text-yellow-400 font-bold mb-4 text-sm md:text-base">Based on your visualization, select the correct Mallampati Score:</h3>
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
          <div className="bg-slate-900 border-2 border-green-500 rounded-xl p-4 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Select {accessModal.category} Access Site</h2>
              <button onClick={() => setAccessModal({show: false, category: ''})} className="text-slate-400 hover:text-white"><X size={24}/></button>
            </div>
            
            {accessModal.category === 'Peripheral IV' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-green-400 mb-2">Antecubital (AC)</h3>
                  {['16G', '18G', '20G'].map(size => (
                    <div key={`ac-${size}`} className="flex gap-2 mb-1">
                      <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Right AC')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Right</button>
                      <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Left AC')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Left</button>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-green-400 mb-2">Forearm</h3>
                  {['18G', '20G', '22G'].map(size => (
                    <div key={`forearm-${size}`} className="flex gap-2 mb-1">
                      <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Right Forearm')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Right</button>
                      <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Left Forearm')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Left</button>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-green-400 mb-2">Hand</h3>
                  {['20G', '22G', '24G'].map(size => (
                    <div key={`hand-${size}`} className="flex gap-2 mb-1">
                      <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Right Hand')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Right</button>
                      <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Left Hand')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Left</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {accessModal.category === 'Central Line' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-purple-400 mb-2">Internal Jugular (IJ)</h3>
                  {['Triple Lumen CVC', 'MAC Introducer'].map(type => (
                    <div key={`ij-${type}`} className="flex flex-col gap-1 mb-3">
                      <span className="text-[10px] text-slate-400">{type}</span>
                      <div className="flex gap-2">
                        <button onClick={() => establishAccess('CVC', type, 'Right IJ')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                        <button onClick={() => establishAccess('CVC', type, 'Left IJ')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-purple-400 mb-2">Subclavian</h3>
                  {['Triple Lumen CVC', 'Trauma Cordis'].map(type => (
                    <div key={`sub-${type}`} className="flex flex-col gap-1 mb-3">
                      <span className="text-[10px] text-slate-400">{type}</span>
                      <div className="flex gap-2">
                        <button onClick={() => establishAccess('CVC', type, 'Right Subclavian')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                        <button onClick={() => establishAccess('CVC', type, 'Left Subclavian')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-purple-400 mb-2">Femoral</h3>
                  {['Triple Lumen CVC', 'Trauma Cordis'].map(type => (
                    <div key={`fem-${type}`} className="flex flex-col gap-1 mb-3">
                      <span className="text-[10px] text-slate-400">{type}</span>
                      <div className="flex gap-2">
                        <button onClick={() => establishAccess('CVC', type, 'Right Femoral')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                        <button onClick={() => establishAccess('CVC', type, 'Left Femoral')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {accessModal.category === 'Intraosseous (IO)' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-orange-400 mb-2">Proximal Tibia</h3>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Proximal Tibia')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Right Tibia</button>
                    <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Proximal Tibia')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Tibia</button>
                  </div>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-orange-400 mb-2">Humeral Head</h3>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Humeral Head')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Right Humerus</button>
                    <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Humeral Head')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Humerus</button>
                  </div>
                </div>
              </div>
            )}

            {accessModal.category === 'Arterial Line' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Radial (20G)</h3>
                  <div className="flex sm:flex-col gap-2 sm:gap-1">
                    <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Right Radial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                    <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Left Radial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
                  </div>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Brachial (20G)</h3>
                  <div className="flex sm:flex-col gap-2 sm:gap-1">
                    <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Right Brachial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                    <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Left Brachial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
                  </div>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Axillary (18G)</h3>
                  <div className="flex sm:flex-col gap-2 sm:gap-1">
                    <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Right Axillary')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                    <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Left Axillary')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
                  </div>
                </div>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                  <h3 className="font-bold text-red-400 mb-2">Femoral (18G)</h3>
                  <div className="flex sm:flex-col gap-2 sm:gap-1">
                    <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Right Femoral')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                    <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Left Femoral')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tubeConfirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Stethoscope size={24}/> Auscultate & Confirm</h2>
              <button onClick={() => setTubeConfirmModal({ show: false, result: '' })} className="text-slate-400 hover:text-white"><X size={24}/></button>
            </div>

            {tubeConfirmModal.result && (
              <div className="mb-6 p-4 bg-indigo-900/40 border border-indigo-500 rounded text-indigo-200 font-bold text-sm md:text-base">
                {tubeConfirmModal.result}
              </div>
            )}

            <p className="text-sm md:text-base text-slate-300 mb-4">Select an anatomical location to auscultate for breath sounds or gastric insufflation:</p>
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button onClick={() => auscultateLungs('Left Lung')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold text-sm md:text-base">Left Lung Field</button>
              <button onClick={() => auscultateLungs('Right Lung')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold text-sm md:text-base">Right Lung Field</button>
              <button onClick={() => auscultateLungs('Epigastrium')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold text-sm md:text-base">Epigastrium (Stomach)</button>
            </div>

            {(patient.tubePosition === 'right_mainstem' || patient.tubePosition === 'left_mainstem' || patient.tubePosition === 'trachea' || patient.tubePosition === 'esophagus') && (
              <>
                <h3 className="text-indigo-400 font-bold mb-3 border-b border-indigo-900 pb-1">Tube Interventions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => adjustTube('pull_back')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded text-sm text-center border border-slate-700 hover:border-slate-500 font-bold">Pull Tube Back 2cm</button>
                  <button onClick={() => adjustTube('remove')} className="bg-red-900/40 hover:bg-red-800 p-3 rounded text-sm text-center border border-red-900 hover:border-red-500 text-red-200 font-bold">Extubate / Remove Tube</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {setupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-green-500 rounded-xl p-4 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2"><Wind size={24}/> Intubation Equipment Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <h3 className="text-green-400 font-bold mb-3 border-b border-green-900 pb-1">1. Select Blade</h3>
                <div className="flex flex-col gap-2">
                  {['Macintosh (Curved DL)', 'Miller (Straight DL)', 'Standard VL', 'Hyperangulated VL', 'Fiberoptic'].map(blade => (
                    <button key={blade} onClick={() => setViewModal(prev => ({...prev, blade}))} className={`p-2 rounded text-xs text-left border ${viewModal.blade === blade ? 'bg-green-800 border-green-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>{blade}</button>
                  ))}
                </div>
                {viewModal.blade && !viewModal.blade.includes('Fiberoptic') && (
                  <select value={viewModal.bladeSize} onChange={(e) => setViewModal(prev => ({...prev, bladeSize: e.target.value}))} className="w-full mt-2 bg-slate-950 text-white text-xs p-2 border border-slate-700 rounded">
                    <option value="">Select Size (Hint: Size 3/4 Adult)</option>
                    <option value="2">Size 2 (Small)</option><option value="3">Size 3 (Normal)</option><option value="4">Size 4 (Large)</option>
                  </select>
                )}
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold mb-3 border-b border-cyan-900 pb-1">2. Select ETT</h3>
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                  <label className="text-[10px] md:text-xs text-slate-400 block mb-1">Tube Size (Hint: 7.0-7.5 Female, 7.5-8.0 Male)</label>
                  <select value={viewModal.tubeSize} onChange={(e) => setViewModal(prev => ({...prev, tubeSize: e.target.value}))} className="w-full bg-slate-950 text-white text-sm p-2 border border-slate-600 rounded">
                    <option value="">Select ETT Size...</option>
                    <option value="6.0">6.0 mm</option><option value="6.5">6.5 mm</option><option value="7.0">7.0 mm</option><option value="7.5">7.5 mm</option><option value="8.0">8.0 mm</option>
                  </select>
                </div>
              </div>
              <div>
                <h3 className="text-blue-400 font-bold mb-3 border-b border-blue-900 pb-1">3. Select Adjunct</h3>
                <div className="flex flex-col gap-2">
                  {['None (Direct Tube)', 'Standard Malleable Stylet', 'Standard Bougie (Eschmann)', 'Articulating Bougie'].map(adjunct => (
                    <button key={adjunct} onClick={() => setViewModal(prev => ({...prev, adjunct}))} className={`p-2 rounded text-xs text-left border ${viewModal.adjunct === adjunct ? 'bg-blue-800 border-blue-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>{adjunct}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
              <button onClick={() => setSetupModal(false)} className="px-6 py-3 sm:py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold w-full sm:w-auto">Cancel</button>
              <button onClick={() => processIntubation(`${viewModal.blade} Size ${viewModal.bladeSize || '-'} with ${viewModal.tubeSize} ETT`, viewModal.adjunct)} disabled={!viewModal.blade || !viewModal.adjunct || !viewModal.tubeSize} className="px-6 py-3 sm:py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded font-bold text-white w-full sm:w-auto">Proceed to Intubate</button>
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
      <div className="bg-black border-2 border-slate-800 rounded-xl p-2 md:p-4 flex flex-col lg:grid lg:grid-cols-4 gap-4 min-h-[450px] lg:h-80 shadow-2xl relative overflow-hidden">
        <div className="col-span-1 lg:col-span-3 flex flex-col justify-between relative z-10 w-full h-[300px] lg:h-full gap-1 lg:gap-0">
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden min-h-[70px]">
            <div className="absolute text-green-500/30 text-[10px] md:text-xs top-1 left-1 z-20">ECG II</div>
            <CanvasWaveform color="#22c55e" speed={hrSpeed} rrSpeed={rrSpeed} active={true} type="ecg" />
          </div>
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden min-h-[70px]">
            <div className="absolute text-cyan-500/30 text-[10px] md:text-xs top-1 left-1 z-20">PLETH</div>
            <CanvasWaveform color="#06b6d4" speed={hrSpeed} rrSpeed={rrSpeed} active={vitals.spo2 > 50} type="pleth" />
          </div>
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden min-h-[70px]">
            <div className="absolute text-yellow-400/30 text-[10px] md:text-xs top-1 left-1 z-20">EtCO2</div>
            <CanvasWaveform color="#facc15" speed={rrSpeed} rrSpeed={rrSpeed} active={vitals.etco2 > 5} type="etco2" />
          </div>
          {patient.hasALine && (
            <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden min-h-[70px]">
              <div className="absolute text-red-500/30 text-[10px] md:text-xs top-1 left-1 z-20">ART (A-Line)</div>
              <CanvasWaveform color="#ef4444" speed={hrSpeed} rrSpeed={rrSpeed} active={true} type="aline" />
            </div>
          )}
        </div>
        <div className="col-span-1 flex flex-row flex-wrap lg:flex-col justify-between bg-slate-900/50 p-2 md:p-3 rounded z-30 gap-2 lg:gap-0">
          <div className="flex flex-col lg:flex-row justify-between items-start w-[48%] lg:w-full">
            <div className="text-green-500 font-bold flex items-center gap-1 text-xs md:text-base"><Heart size={14} className="hidden md:block"/> HR</div>
            <div className="text-3xl md:text-5xl font-black text-green-400">{vitals.hr}</div>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-start mt-0 lg:mt-2 w-[48%] lg:w-full">
            <div className="text-cyan-500 font-bold flex items-center gap-1 text-xs md:text-base"><Wind size={14} className="hidden md:block"/> SpO2</div>
            <div className={`text-3xl md:text-5xl font-black ${vitals.spo2 < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>{vitals.spo2}</div>
          </div>
          <div className="flex justify-between items-end lg:items-start mt-2 w-full">
            <div className="text-red-500 font-bold flex flex-col items-start gap-1 w-1/3 lg:w-auto">
              <span className="flex items-center gap-1 text-xs md:text-base"><Activity size={14} className="hidden md:block"/> {patient.hasALine ? 'ART' : 'NIBP'}</span>
              {!patient.hasALine && <button onClick={cycleNibp} className="text-slate-400 hover:text-white bg-slate-800 p-1 md:p-2 rounded transition mt-1 w-full lg:w-auto"><RefreshCw size={12} className="mx-auto"/></button>}
            </div>
            <div className="text-3xl md:text-4xl font-black text-red-400 mt-1 text-right leading-none w-2/3 lg:w-auto">
              {patient.hasALine ? `${vitals.sys}/${vitals.dia}` : `${nibp.sys}/${nibp.dia}`}
            </div>
          </div>
          <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-800 w-full">
            <div className="w-1/2">
              <div className="text-yellow-400 font-bold text-[10px] md:text-xs mb-1">EtCO2</div>
              <div className="text-3xl md:text-4xl font-black text-yellow-400 leading-none">{vitals.etco2}</div>
            </div>
            <div className="text-right w-1/2">
              <div className="text-white font-bold text-[10px] md:text-xs mb-1">RR</div>
              <div className={`text-3xl md:text-4xl font-black leading-none ${vitals.rr < 8 ? 'text-slate-400 animate-pulse' : 'text-white'}`}>{vitals.rr}</div>
            </div>
          </div>
        </div>
      </div>
      {/* SECONDARY VENTILATOR MONITOR */}
      {patient.airwaySecured && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl p-2 md:p-3 flex flex-col lg:grid lg:grid-cols-4 gap-4 min-h-[300px] lg:h-48 shadow-2xl relative overflow-hidden">
          <div className="col-span-1 lg:col-span-3 flex flex-col justify-between relative z-10 gap-1 h-[200px] lg:h-full">
            <div className="h-1/3 flex items-center w-full border-b border-slate-800 relative overflow-hidden">
              <div className="absolute text-yellow-500/50 text-[10px] md:text-xs top-0 left-1 z-20">Paw</div>
              <SvgWaveform path={PATHS.ventPressure} color="#eab308" speed={rrSpeed} active={rrSpeed > 0} />
            </div>
            <div className="h-1/3 flex items-center w-full border-b border-slate-800 relative overflow-hidden">
              <div className="absolute text-green-500/50 text-[10px] md:text-xs top-0 left-1 z-20">Flow</div>
              <SvgWaveform path={PATHS.ventFlow} color="#22c55e" speed={rrSpeed} active={rrSpeed > 0} />
            </div>
            <div className="h-1/3 flex items-center w-full relative overflow-hidden">
              <div className="absolute text-cyan-500/50 text-[10px] md:text-xs top-0 left-1 z-20">Vol</div>
              <SvgWaveform path={PATHS.ventVolume} color="#06b6d4" speed={rrSpeed} active={rrSpeed > 0} />
            </div>
          </div>
          <div className="col-span-1 grid grid-cols-4 lg:grid-cols-2 gap-2 bg-black p-2 rounded z-30 content-start">
            <div className="text-center lg:text-right bg-slate-900 p-1 md:p-2 rounded border border-slate-800">
              <div className="text-yellow-500 text-[9px] md:text-[10px] uppercase font-bold">PIP</div>
              <div className="text-sm md:text-xl font-black text-yellow-400">{Math.round(vitals.pip)}</div>
            </div>
            <div className="text-center lg:text-right bg-slate-900 p-1 md:p-2 rounded border border-slate-800">
              <div className="text-yellow-600 text-[9px] md:text-[10px] uppercase font-bold">Pplat</div>
              <div className="text-sm md:text-xl font-black text-yellow-500">{Math.round(vitals.pplat)}</div>
            </div>
            <div className="text-center lg:text-right bg-slate-900 p-1 md:p-2 rounded border border-slate-800">
              <div className="text-cyan-500 text-[9px] md:text-[10px] uppercase font-bold">VTE</div>
              <div className="text-sm md:text-xl font-black text-cyan-400">{Math.round(vitals.vte)}</div>
            </div>
            <div className="text-center lg:text-right bg-slate-900 p-1 md:p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[9px] md:text-[10px] uppercase font-bold">RR</div>
              <div className="text-sm md:text-xl font-black text-white">{vitals.rr}</div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[400px]">
        {/* Col 1: Assess, Access & O2 */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center gap-2"><Eye size={14}/> Assess / POCUS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={examineAirway} className="bg-slate-800 hover:bg-slate-700 p-2 md:p-3 rounded text-xs text-left shadow border border-slate-600 sm:col-span-2 text-center font-bold">Examine Airway (Look/Feel)</button>
            <button onClick={() => handlePocus('Cardiac (TTE)')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Cardiac (TTE)</button>
            <button onClick={() => handlePocus('Lung')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Lung (Pleural)</button>
            <button onClick={() => handlePocus('Gastric')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Gastric (Antrum)</button>
            <button onClick={() => handlePocus('Airway')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow border border-blue-900 text-blue-200">Airway (Trachea)</button>
            <button onClick={() => handlePocus('eFAST')} className="bg-slate-800 hover:bg-slate-700 p-2 md:p-3 rounded text-xs text-left shadow sm:col-span-2 text-center border border-purple-900 text-purple-200">Trauma eFAST Exam</button>
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
            {renderAdvancedO2Button('Nasal Cannula', 'Nasal Cannula (1-15L)', 'flow')}
            {renderAdvancedO2Button('Simple Face Mask', 'Simple Face Mask (5-10L)', 'flow')}
            {renderAdvancedO2Button('Non-Rebreather Mask (NRB)', 'Non-Rebreather Mask (15L, 100% FiO2)', 'fixed')}
            {renderAdvancedO2Button('High Flow Nasal Cannula (HFNC)', 'High Flow Nasal Cannula (Flow / FiO2)', 'hfnc')}
            {renderAdvancedO2Button('CPAP', 'CPAP (Continuous Positive Airway Pressure)', 'cpap')}
            {renderAdvancedO2Button('BiPAP S/T', 'BiPAP (Bilevel Positive Airway Pressure)', 'bipap')}
            {renderAdvancedO2Button('Bag-Mask Valve (BMV)', 'Bag-Mask Ventilation (15L, 100% FiO2)', 'fixed')}
            <button onClick={() => handleSetO2('Room Air')} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-red-200 border border-red-900 mt-2">Remove O2 (Room Air)</button>
          </div>
        </div>

        {/* Col 2: Pharmacopoeia */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <details className="group">
            <summary className="text-teal-400 text-sm border-b border-teal-900 pb-1 uppercase font-bold cursor-pointer hover:text-teal-300 list-none flex justify-between">
              Crystalloids & Colloids <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {[
                { id: 'Albumin 5%', label: 'Albumin 5%', hint: '500 mL' },
                { id: 'Lactated Ringers (LR)', label: 'Lactated Ringers (LR)', hint: '500-1000 mL' },
                { id: 'Normal Saline (0.9% NS)', label: 'Normal Saline (0.9% NS)', hint: '500-1000 mL' },
                { id: 'Plasmalyte', label: 'Plasmalyte', hint: '500-1000 mL' }
              ].map(f => renderFluidButton(f.id, f.label, f.hint, 'bg-blue-900/20 border-blue-800'))}
            </div>
          </details>

          <details className="group">
            <summary className="text-red-400 text-sm border-b border-red-900 pb-1 uppercase font-bold cursor-pointer hover:text-red-300 list-none flex justify-between">
              Blood Products <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {[
                { id: 'Cryoprecipitate', label: 'Cryoprecipitate', hint: '10 Units', style: 'bg-slate-800 border-slate-700' },
                { id: 'Fibrinogen Concentrate', label: 'Fibrinogen', hint: '2-4 g', style: 'bg-slate-800 border-slate-700' },
                { id: 'Fresh Frozen Plasma (FFP)', label: 'Fresh Frozen Plasma', hint: '1-2 Units', style: 'bg-yellow-900/40 border-yellow-800' },
                { id: 'Packed Red Blood Cells (PRBC)', label: 'Packed Red Blood Cells', hint: '1-2 Units', style: 'bg-red-900/40 border-red-800' },
                { id: 'Platelets', label: 'Platelets', hint: '1 Unit', style: 'bg-yellow-900/40 border-yellow-800' }
              ].map(f => renderFluidButton(f.id, f.label, f.hint, f.style))}
            </div>
          </details>

          <details className="group" open>
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Sedatives & Hypnotics <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['dexmedetomidine', 'etomidate', 'ketamine', 'midazolam', 'propofol'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Opioids & Analgesics <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['fentanyl', 'hydromorphone', 'morphine', 'remifentanil', 'sufentanil'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Paralytics & Reversals <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['cisatracurium', 'glycopyrrolate', 'neostigmine', 'rocuronium', 'succinylcholine', 'sugammadex', 'vecuronium'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Inotropes & Vasopressors <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['dobutamine', 'dopamine', 'ephedrine', 'epinephrine', 'milrinone', 'norepinephrine', 'phenylephrine', 'vasopressin'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Antihypertensives <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['clevidipine', 'esmolol', 'labetalol', 'metoprolol', 'nicardipine', 'nitroglycerin', 'nitroprusside'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Cardiac & Electrolytes <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['adenosine', 'amiodarone', 'atropine', 'bicarbonate', 'calcium', 'lidocaine', 'magnesium'].map(renderAdvancedMedButton)}
            </div>
          </details>
        </div>

        {/* Col 3: Airway Procedures */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold">Airway Optimization</h3>
          <div className="flex flex-col gap-2">
            <button onClick={handleSuction} className="bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-600 p-3 rounded text-sm font-bold text-left shadow flex justify-between">Suction Airway <Droplet size={18} className="text-yellow-400"/></button>
            <div className="flex flex-col mt-1">
              {renderAirwayToolButton('Oropharyngeal Airway (OPA)', 'Oropharyngeal Airway', 'Guedel', ['80mm (Small Adult)', '90mm (Medium Adult)', '100mm (Large Adult)'])}
              {renderAirwayToolButton('Nasopharyngeal Airway (NPA)', 'Nasopharyngeal Airway', 'French', ['28F (Small)', '30F (Medium)', '32F (Large)', '34F (X-Large)'])}
            </div>
            <button onClick={() => pushMed('Topical Lidocaine 4% (Atomizer)', 0)} className="bg-teal-900/40 hover:bg-teal-800 p-2 rounded text-xs text-center border border-teal-800 mt-1">Topicalize Airway (Awake Prep)</button>
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Intubation</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => { setViewModal(v => ({...v, blade: '', bladeSize: '', tubeSize: '', adjunct: ''})); setSetupModal(true); }} className="bg-green-900/40 hover:bg-green-800 p-4 rounded text-base text-center border border-green-500 font-black shadow-lg uppercase text-green-300">
              Prepare to Intubate
            </button>
            <button onClick={() => setTubeConfirmModal({ show: true, result: '' })} className="bg-indigo-900/40 hover:bg-indigo-800 p-2 rounded text-sm text-center border border-indigo-500 text-indigo-200 mt-1 z-[60] relative">
              <Stethoscope size={14} className="inline mr-2"/> Confirm Placement
            </button>
          </div>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Rescue / Surgical</h3>
          <div className="flex flex-col gap-2 mt-1">
            {!patient.airwaySecured ? (
              <>
                {renderAirwayToolButton('Laryngeal Mask Airway', 'Insert LMA (Rescue)', 'Size', ['Size 3 (30-50kg)', 'Size 4 (50-70kg)', 'Size 5 (70-100kg)'])}
                <button onClick={() => {logEvent("Performed Surgical Cric."); setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful', currentO2Device: 'Cricothyroidotomy (100% FiO2)', currentFiO2: 100, currentO2Flow: 15}))}} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left text-red-200 border border-red-900 mt-1">Surgical Cricothyroidotomy</button>
              </>
            ) : (!patient.tubePosition && (
               <button onClick={() => {
                 logEvent("Removed Advanced Airway (LMA/Cric).");
                 setPatient(p => ({...p, airwaySecured: false, ventilationStatus: p.isApneic ? 'failed' : 'spontaneous', currentO2Device: 'Room Air', currentFiO2: 21, currentO2Flow: 0}));
               }} className="bg-slate-800 hover:bg-slate-700 p-3 rounded text-xs text-center border border-slate-500 font-bold text-white shadow-lg">Remove LMA / Cric</button>
            ))}
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