import React, { useState, useEffect } from 'react';
import { Activity, Heart, Wind, Undo2, AlertTriangle, Syringe, Stethoscope, Droplet, Zap, Search } from 'lucide-react';

// --- HIGH-FIDELITY SVG WAVEFORM DATABASE ---
const SVGS = {
  // Hemodynamics
  ecgNormal: "data:image/svg+xml,%3Csvg width='150' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,70 L10,70 C15,60 20,60 25,70 L30,70 L33,75 L40,20 L45,85 L50,70 L60,70 C70,50 85,50 95,70 L150,70' fill='none' stroke='%2322c55e' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  ecgTachy: "data:image/svg+xml,%3Csvg width='90' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,70 L5,70 C10,60 15,60 20,70 L25,70 L28,75 L35,20 L40,85 L45,70 L50,70 C55,50 65,50 75,70 L90,70' fill='none' stroke='%2322c55e' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  ecgBrady: "data:image/svg+xml,%3Csvg width='250' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,70 L10,70 C15,60 20,60 25,70 L30,70 L33,75 L40,20 L45,85 L50,70 L60,70 C70,50 85,50 95,70 L250,70' fill='none' stroke='%2322c55e' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  plethNormal: "data:image/svg+xml,%3Csvg width='150' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,90 C15,90 25,20 35,20 C45,20 55,50 60,50 C65,45 75,70 90,90 L150,90' fill='none' stroke='%2322d3ee' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  plethLowAmp: "data:image/svg+xml,%3Csvg width='150' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,90 C15,90 25,60 35,60 C45,60 55,75 60,75 C65,70 75,85 90,90 L150,90' fill='none' stroke='%2322d3ee' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  alineNormal: "data:image/svg+xml,%3Csvg width='150' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,90 C15,90 20,20 25,20 C35,20 45,55 50,55 L55,45 C75,85 100,90 150,90' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  alineLowAmp: "data:image/svg+xml,%3Csvg width='150' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,90 C15,90 20,60 25,60 C35,60 45,75 50,75 L55,65 C75,85 100,90 150,90' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  etco2Normal: "data:image/svg+xml,%3Csvg width='200' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,90 L20,90 L25,30 Q30,25 35,25 L100,15 Q105,15 110,90 L200,90' fill='none' stroke='%23facc15' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  
  // Ventilator Scalars
  ventPressure: "data:image/svg+xml,%3Csvg width='300' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,80 L40,80 L60,20 L100,30 L120,80 L300,80' fill='none' stroke='%23eab308' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  ventFlow: "data:image/svg+xml,%3Csvg width='300' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,50 L40,50 L40,10 L100,10 L100,90 C120,90 140,50 300,50' fill='none' stroke='%2322c55e' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  ventVolume: "data:image/svg+xml,%3Csvg width='300' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,90 L40,90 L100,10 L140,90 L300,90' fill='none' stroke='%2306b6d4' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E"
};

// --- CASE DATABASE ---
const CASES = [
  {
    id: 'normal',
    name: 'Elective Surgery (Perfect Baseline)',
    difficulty: '🟢 Easy',
    description: '45yo Female, ASA 1. Fasting for 12 hours. Normal neck anatomy, Mallampati I. Perfectly stable hemodynamics. Use to practice standard RSI or standard induction.',
    vitals: { hr: 72, sys: 120, dia: 80, spo2: 99, etco2: 0, pip: 0, pplat: 0, vte: 0, rr: 0 },
    patient: { oxygenBuffer: 80, airwayBlood: false, isObese: false, baseGrade: 1, isSeptic: false, hasCCollar: false, stomach: 'empty', limitedMouth: false }
  },
  {
    id: 'trauma',
    name: 'Motor Vehicle Trauma (Bloody Airway)',
    difficulty: '🔴 Hard',
    description: '54yo Male, GCS 7. Facial trauma, active bleeding in airway. Cervical collar in place restricting neck extension. Unknown fasting status.',
    vitals: { hr: 115, sys: 105, dia: 65, spo2: 86, etco2: 0, pip: 0, pplat: 0, vte: 0, rr: 0 },
    patient: { oxygenBuffer: 20, airwayBlood: true, isObese: false, baseGrade: 3, isSeptic: false, hasCCollar: true, stomach: 'full', limitedMouth: false }
  },
  {
    id: 'septic',
    name: 'Septic Shock (Hemodynamic Cliff)',
    difficulty: '🔴 Hard',
    description: '68yo Male, urosepsis. Profoundly vasodilated, living on endogenous catecholamines. High risk of cardiovascular collapse upon induction.',
    vitals: { hr: 135, sys: 85, dia: 40, spo2: 92, etco2: 0, pip: 0, pplat: 0, vte: 0, rr: 0 },
    patient: { oxygenBuffer: 50, airwayBlood: false, isObese: false, baseGrade: 2, isSeptic: true, hasCCollar: false, stomach: 'empty', limitedMouth: false }
  },
  {
    id: 'obese',
    name: 'Morbid Obesity / OSA (Rapid Desat)',
    difficulty: '🟠 Medium',
    description: '50yo Male, BMI 45, severe Obstructive Sleep Apnea (OSA). Severely decreased Functional Residual Capacity (FRC). Mask ventilation will be difficult.',
    vitals: { hr: 88, sys: 150, dia: 95, spo2: 94, etco2: 0, pip: 0, pplat: 0, vte: 0, rr: 0 },
    patient: { oxygenBuffer: 30, airwayBlood: false, isObese: true, baseGrade: 3, isSeptic: false, hasCCollar: false, stomach: 'full', limitedMouth: false }
  },
  {
    id: 'radiation',
    name: 'Head & Neck Cancer (Known Difficult)',
    difficulty: '🟣 Extreme',
    description: '60yo Male, prior neck radiation. Mouth opening limited to 1 finger-breadth. Neck is rigid. Cannot be mask ventilated easily. Consider Awake options.',
    vitals: { hr: 85, sys: 140, dia: 90, spo2: 95, etco2: 0, pip: 0, pplat: 0, vte: 0, rr: 0 },
    patient: { oxygenBuffer: 70, airwayBlood: false, isObese: false, baseGrade: 4, isSeptic: false, hasCCollar: true, stomach: 'empty', limitedMouth: true }
  }
];

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeCase, setActiveCase] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [vitals, setVitals] = useState({});
  const [patient, setPatient] = useState({});
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]); 
  
  // Modals
  const [viewModal, setViewModal] = useState({ show: false, blade: '', adjunct: '', description: '', trueGrade: 1 });
  const [setupModal, setSetupModal] = useState(false);
  const [pocusModal, setPocusModal] = useState({ show: false, title: '', finding: '' });

  // --- INITIALIZE CASE ---
  const startCase = (selectedCase) => {
    setActiveCase(selectedCase);
    setVitals({ ...selectedCase.vitals });
    setPatient({
      ...selectedCase.patient,
      isApneic: false,
      isParalyzed: false,
      isTopicalized: false,
      airwaySecured: false,
      airwayExamined: false,
      bmvOptimized: false,
      ventilationStatus: 'spontaneous',
      hasIV: false,
      hasALine: false,
      currentO2Device: 'Room Air (21% FiO2)'
    });
    setLogs([`00:00 - Case Started: ${selectedCase.name}. ${selectedCase.description}`]);
    setTime(0);
    setHistory([]);
    setIsRunning(true);
  };

  // --- THE PHYSIOLOGIC & COMPLICATION ENGINE ---
  useEffect(() => {
    let interval;
    if (isRunning && !viewModal.show && !setupModal && !pocusModal.show) { 
      interval = setInterval(() => {
        setTime((t) => t + 1);
        
        // COMPLICATION ENGINE
        if (time > 0 && time % 15 === 0 && !patient.airwaySecured) {
            const diceRoll = Math.random();
            if (diceRoll > 0.90 && patient.isApneic && !patient.airwayBlood && patient.stomach === 'full') {
                setLogs(prev => [`${formatTime(time)} - ⚠️ COMPLICATION: Patient passively regurgitated gastric contents into airway!`, ...prev]);
                setPatient(p => ({ ...p, airwayBlood: true })); 
                setVitals(v => ({ ...v, spo2: v.spo2 - 5 }));
            }
        }

        // VITAL SIGNS ENGINE
        setVitals((prev) => {
          let newHR = prev.hr + (Math.random() * 2 - 1);
          let newSys = prev.sys + (Math.random() * 4 - 2);
          let newDia = prev.dia + (Math.random() * 2 - 1);
          let newSpo2 = prev.spo2;
          let newEtco2 = prev.etco2;
          let newPip = 0, newPplat = 0, newVte = 0, newRr = 0;

          let isEffectivelyVentilating = patient.ventilationStatus === 'successful' || patient.airwaySecured;
          
          if (patient.isApneic && !isEffectivelyVentilating) {
            const bufferDrop = patient.isObese ? 4 : 2; 
            setPatient(p => ({ ...p, oxygenBuffer: Math.max(0, p.oxygenBuffer - bufferDrop) }));
          }

          if (patient.isApneic && !isEffectivelyVentilating && patient.oxygenBuffer === 0) {
            newSpo2 -= 2.5; 
            if (newSpo2 < 60) newHR -= 3; 
            if (newSpo2 < 40) newSys -= 5; 
          } else if (isEffectivelyVentilating) {
            setPatient(p => ({ ...p, oxygenBuffer: Math.min(100, p.oxygenBuffer + 10) }));
            newSpo2 += 3.0; 
            newEtco2 = 35 + (Math.random() * 5); 
          } else if (!patient.isApneic) {
            newEtco2 = 20 + (Math.random() * 10); 
          }

          // Ventilator Dynamics
          if (patient.airwaySecured) {
            newPip = patient.isObese ? 34 : (patient.baseGrade >= 3 ? 26 : 21);
            newPip += (Math.random() * 2 - 1);
            newPplat = patient.isObese ? 29 : (patient.baseGrade >= 3 ? 22 : 17);
            newPplat += (Math.random() * 1.5 - 0.5);
            newVte = 450 + (Math.random() * 15 - 5);
            newRr = 14;
          }

          return {
            hr: Math.max(0, Math.min(220, Math.round(newHR))),
            sys: Math.max(0, Math.round(newSys)),
            dia: Math.max(0, Math.round(newDia)),
            spo2: Math.max(0, Math.min(100, Math.round(newSpo2))),
            etco2: !isEffectivelyVentilating && patient.isApneic ? 0 : Math.round(newEtco2),
            pip: newPip,
            pplat: newPplat,
            vte: newVte,
            rr: newRr
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, patient, viewModal.show, setupModal, pocusModal.show, time]);

  // --- ACTION HELPERS ---
  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const saveState = (actionName) => {
    setHistory((prev) => [...prev, { time, vitals: { ...vitals }, patient: { ...patient }, logs: [...logs] }]);
    if (actionName) setLogs(prev => [`${formatTime(time)} - ${actionName}`, ...prev]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setTime(lastState.time);
    setVitals(lastState.vitals);
    setPatient(lastState.patient);
    setLogs(lastState.logs);
    setHistory(history.slice(0, -1)); 
  };

  // --- CLINICAL ACTIONS ---
  const setOxygen = (device, bufferRate) => {
    saveState(`Applied ${device}.`);
    setPatient(p => ({ ...p, currentO2Device: device, oxygenBuffer: Math.min(100, p.oxygenBuffer + bufferRate) }));
  };

  const establishAccess = (type, fullName) => {
    saveState(`Placed ${fullName}. Venous access established.`);
    setPatient({ ...patient, hasIV: true });
    if (type === 'ALine') setPatient({ ...patient, hasALine: true });
  };

  const pushMed = (medName, effect) => {
    if (!patient.hasIV && medName !== 'Topical Lidocaine 4%') {
      setLogs(prev => [`${formatTime(time)} - ❌ FAILED: Cannot push ${medName}. No Intravenous (IV) access!`, ...prev]);
      return;
    }
    saveState(`Administered ${medName}.`);
    effect();
  };

  const handleSuction = () => {
    saveState("Performed rigid Yankauer suction. Cleared airway of blood and secretions.");
    setPatient({ ...patient, airwayBlood: false });
  };

  // --- DYNAMIC POCUS LOGIC ---
  const handlePocus = (type) => {
    let finding = "";
    saveState();
    
    if (type === 'Cardiac (TTE)') {
      finding = patient.isSeptic 
        ? "Hyperdynamic left ventricle, kissing papillary muscles, underfilled Right Ventricle (Vasodilatory Shock)." 
        : "Normal LV/RV function. Good contractility. No pericardial effusion.";
    } else if (type === 'Gastric') {
      finding = patient.stomach === 'full' 
        ? "Antrum is distended with heterogeneous echogenic material. High risk for aspiration (Full Stomach)." 
        : "Antrum is flat and empty (Target sign).";
    } else if (type === 'Airway') {
      if (patient.airwaySecured) {
        finding = "Single air-mucosal interface with posterior reverberation artifact (Confirmed Tracheal Placement).";
      } else if (patient.ventilationStatus === 'failed' && patient.dlAttempts > 0) {
        finding = "Double-Tract Sign visible! Endotracheal tube is currently in the esophagus!";
      } else {
        finding = "Normal tracheal anatomy. Esophagus is empty and collapsed.";
      }
    } else if (type === 'Lung') {
      if (!patient.isApneic || patient.airwaySecured || patient.ventilationStatus === 'successful') {
        finding = "Bilateral lung sliding present (Ants marching sign). Pleural interfaces are intact.";
      } else {
        finding = "Absent lung sliding bilaterally. Lung pulse is visible (Patient is Apneic).";
      }
    }
    
    setPocusModal({ show: true, title: `${type} Ultrasound`, finding });
    setLogs(prev => [`${formatTime(time)} - Performed ${type} Ultrasound.`, ...prev]);
  };

  // --- INTUBATION LOGIC ---
  const processIntubation = (blade, adjunct) => {
    setSetupModal(false);
    let desc = `You insert the ${blade}. `;
    let trueGrade = patient.baseGrade;

    setPatient(p => ({...p, dlAttempts: (p.dlAttempts || 0) + 1}));

    if (!patient.isApneic && blade !== 'Fiberoptic Bronchoscope') {
       if (!patient.isTopicalized) {
          setLogs(prev => [`${formatTime(time)} - ❌ FAILED: Patient is awake and not topicalized! Severe gag reflex and laryngospasm triggered!`, ...prev]);
          setPatient(p => ({...p, ventilationStatus: 'failed', oxygenBuffer: 0}));
          return;
       }
    }

    if (patient.airwayBlood) {
      desc += "The lens/view is completely obscured by thick red blood and pooling secretions. You cannot identify landmarks.";
      trueGrade = 4;
    } else if (patient.hasCCollar || patient.limitedMouth) {
      desc += "Anatomy is highly restricted. ";
      if (blade === 'Hyperangulated Video Laryngoscope (VL)') {
        desc += "Using the hyperangulated blade, you look around the curve and get a good view of the glottic opening.";
        trueGrade = 2;
      } else if (blade === 'Fiberoptic Bronchoscope') {
        desc += "Navigating carefully, you visualize the vocal cords perfectly through the scope.";
        trueGrade = 1;
      } else {
        desc += "Using a standard straight/curved blade, you can only see the epiglottis due to restricted neck extension.";
        trueGrade = 3;
      }
    } else if (patient.baseGrade === 1) {
      desc += "You sweep the tongue and have a perfect, direct line of sight to the vocal cords.";
      trueGrade = 1;
    }

    saveState(`Attempted Intubation using ${blade} with ${adjunct}. Analyzing view...`);
    setViewModal({ show: true, blade, adjunct, description: desc, trueGrade });
  };

  const submitGrade = (selectedGrade) => {
    const isCorrect = selectedGrade === viewModal.trueGrade;
    setLogs(prev => [`${formatTime(time)} - Student identified view as Grade ${selectedGrade}. (${isCorrect ? 'Correct' : 'Incorrect'})`, ...prev]);
    
    let success = false;
    let failReason = "";

    if (viewModal.trueGrade === 4) {
      success = false;
      failReason = "Cannot intubate blindly with Grade IV view. Tube passed into esophagus.";
    } else if (viewModal.blade === 'Hyperangulated Video Laryngoscope (VL)' && viewModal.adjunct === 'Standard Bougie') {
      success = false;
      failReason = "Standard Bougie cannot navigate the steep angle of a hyperangulated VL blade. Need rigid stylet.";
    } else if (viewModal.trueGrade === 3 && viewModal.adjunct === 'None') {
      success = false;
      failReason = "Cannot direct tube into anterior airway without an adjunct (Bougie/Stylet) on a Grade III view.";
    } else if (viewModal.trueGrade <= 2 || (viewModal.trueGrade === 3 && viewModal.adjunct.includes('Bougie'))) {
      success = true;
    }

    if (success) {
      setLogs(prev => [`${formatTime(time)} - ✅ Intubation SUCCESSFUL. Tube secured and connected to Mechanical Ventilator.`, ...prev]);
      setPatient({ ...patient, airwaySecured: true, ventilationStatus: 'successful' });
    } else {
      setLogs(prev => [`${formatTime(time)} - ❌ Intubation attempt FAILED. ${failReason}`, ...prev]);
      setPatient({ ...patient, ventilationStatus: 'failed' });
    }
    
    setViewModal({ show: false, blade: '', adjunct: '', description: '', trueGrade: 1 });
  };

  // --- RENDER HELPERS ---
  const getEcgInfo = () => {
    if (vitals.hr > 110) return { url: SVGS.ecgTachy, cls: 'anim-ecg-tachy' };
    if (vitals.hr < 60) return { url: SVGS.ecgBrady, cls: 'anim-ecg-brady' };
    return { url: SVGS.ecgNormal, cls: 'anim-ecg-normal' };
  };

  const getPlethInfo = () => {
    if (vitals.spo2 < 50) return null; 
    if (vitals.sys < 90) return { url: SVGS.plethLowAmp, cls: 'anim-pleth' };
    return { url: SVGS.plethNormal, cls: 'anim-pleth' };
  };

  const getAlineInfo = () => {
    if (vitals.sys < 90) return { url: SVGS.alineLowAmp, cls: 'anim-aline' };
    return { url: SVGS.alineNormal, cls: 'anim-aline' };
  };

  const ecg = getEcgInfo();
  const pleth = getPlethInfo();
  const aline = getAlineInfo();

  // --- RENDER: CASE SELECTOR ---
  if (!activeCase) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 font-mono flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-cyan-400 mb-2 flex items-center gap-3"><Activity size={36}/> AirwaySim OS</h1>
        <p className="text-slate-400 mb-8">Select a clinical scenario to begin the simulation.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {CASES.map((c) => (
            <div key={c.id} onClick={() => startCase(c)} className="bg-slate-900 border border-slate-700 hover:border-cyan-400 p-6 rounded-xl cursor-pointer transition shadow-lg group">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition">{c.name}</h2>
                <span className="text-sm bg-slate-800 px-2 py-1 rounded">{c.difficulty}</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">{c.description}</p>
              <button className="w-full bg-slate-800 group-hover:bg-cyan-900 text-white font-bold py-2 rounded transition">Load Scenario</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN SIMULATION ---
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 font-mono select-none flex flex-col gap-4">
      
      {/* HEADER */}
      <header className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">{activeCase.name}</h1>
          <p className="text-slate-400 text-sm">Pre-Ox FRC Buffer: <span className="text-blue-400 font-bold">{patient.oxygenBuffer}%</span> | Device: {patient.currentO2Device}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setActiveCase(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition">End Case</button>
          <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm font-bold transition">
            <Undo2 size={16} /> Undo
          </button>
          <button onClick={() => setIsRunning(!isRunning)} className={`px-6 py-2 rounded font-bold shadow-lg transition ${isRunning ? 'bg-red-600' : 'bg-green-600'}`}>
            {isRunning ? 'PAUSE SIM' : 'START SIM'}
          </button>
        </div>
      </header>

      {/* POCUS MODAL */}
      {pocusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-8 max-w-lg shadow-2xl w-full text-center">
            <Search size={48} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">{pocusModal.title} Finding</h2>
            <p className="text-lg text-slate-300 mb-8 p-4 bg-slate-800 rounded border border-slate-700">"{pocusModal.finding}"</p>
            <button onClick={() => setPocusModal({show: false, title:'', finding:''})} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded">Close Image</button>
          </div>
        </div>
      )}

      {/* INTUBATION SETUP MODAL */}
      {setupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
              <button 
                onClick={() => processIntubation(viewModal.blade, viewModal.adjunct)} 
                disabled={!viewModal.blade || !viewModal.adjunct}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold text-white shadow-lg"
              >
                Proceed to Intubate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIRWAY VIEW QUIZ MODAL */}
      {viewModal.show && viewModal.description && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
      <div className="bg-black border-2 border-slate-800 rounded-xl p-4 grid grid-cols-4 gap-4 min-h-[200px] shadow-2xl relative overflow-hidden">
        <div className="col-span-3 flex flex-col justify-between relative z-10">
          
          <div className="h-1/3 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-green-500/30 text-xs top-1 left-1 z-20">ECG II</div>
            <div className={`w-full h-full ${ecg.cls}`} style={{ backgroundImage: `url("${ecg.url}")`, backgroundRepeat: 'repeat-x' }}></div>
          </div>
          
          <div className="h-1/3 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-red-500/30 text-xs top-1 left-1 z-20">{patient.hasALine ? 'ART (Arterial Line)' : 'PLETH (Pulse Ox)'}</div>
            {patient.hasALine 
              ? <div className={`w-full h-full ${aline.cls}`} style={{ backgroundImage: `url("${aline.url}")`, backgroundRepeat: 'repeat-x' }}></div> 
              : (pleth && <div className={`w-full h-full ${pleth.cls}`} style={{ backgroundImage: `url("${pleth.url}")`, backgroundRepeat: 'repeat-x' }}></div>)
            }
          </div>
          
          <div className="h-1/3 flex items-center w-full relative overflow-hidden">
            <div className="absolute text-yellow-400/30 text-xs top-1 left-1 z-20">EtCO2 (End-Tidal CO2)</div>
            {vitals.etco2 > 5 && <div className="w-full h-full anim-etco2" style={{ backgroundImage: `url("${SVGS.etco2Normal}")`, backgroundRepeat: 'repeat-x' }}></div>}
            {vitals.etco2 <= 5 && <div className="w-full h-0.5 bg-yellow-400 opacity-50 absolute top-1/2"></div>}
          </div>
          
        </div>

        <div className="col-span-1 flex flex-col justify-between bg-slate-900/50 p-2 rounded z-30">
          <div className="text-right">
            <div className="text-green-500 font-bold flex items-center justify-end gap-1"><Heart size={14}/> HR</div>
            <div className="text-4xl font-black text-green-400">{vitals.hr}</div>
          </div>
          <div className="text-right">
            <div className="text-red-500 font-bold flex items-center justify-end gap-1"><Activity size={14}/> {patient.hasALine ? 'ART BP' : 'NIBP'}</div>
            <div className="text-3xl font-black text-red-400">{vitals.sys}/{vitals.dia}</div>
          </div>
          <div className="text-right flex justify-between items-end">
            <div>
              <div className="text-yellow-400 font-bold text-xs flex items-center justify-start gap-1">EtCO2</div>
              <div className="text-xl font-black text-yellow-400">{vitals.etco2}</div>
            </div>
            <div>
              <div className="text-cyan-400 font-bold text-xs flex items-center justify-end gap-1"><Wind size={12}/> SpO2</div>
              <div className={`text-4xl font-black ${vitals.spo2 < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>{vitals.spo2}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY VENTILATOR MONITOR (Only appears when intubated) */}
      {patient.airwaySecured && (
        <div className="bg-slate-950 border-2 border-slate-700 rounded-xl p-3 grid grid-cols-4 gap-4 min-h-[160px] shadow-2xl relative overflow-hidden">
          
          <div className="col-span-3 flex flex-col justify-between relative z-10 gap-1">
            <div className="h-1/3 flex items-center w-full border-b border-slate-800 relative overflow-hidden">
              <div className="absolute text-yellow-500/50 text-xs top-0 left-1 z-20">Paw (cmH2O)</div>
              <div className="w-full h-full anim-vent" style={{ backgroundImage: `url("${SVGS.ventPressure}")`, backgroundRepeat: 'repeat-x' }}></div>
            </div>
            <div className="h-1/3 flex items-center w-full border-b border-slate-800 relative overflow-hidden">
              <div className="absolute text-green-500/50 text-xs top-0 left-1 z-20">Flow (L/min)</div>
              <div className="w-full h-full anim-vent" style={{ backgroundImage: `url("${SVGS.ventFlow}")`, backgroundRepeat: 'repeat-x' }}></div>
            </div>
            <div className="h-1/3 flex items-center w-full relative overflow-hidden">
              <div className="absolute text-cyan-500/50 text-xs top-0 left-1 z-20">Volume (mL)</div>
              <div className="w-full h-full anim-vent" style={{ backgroundImage: `url("${SVGS.ventVolume}")`, backgroundRepeat: 'repeat-x' }}></div>
            </div>
          </div>

          <div className="col-span-1 grid grid-cols-2 gap-2 bg-black p-2 rounded z-30 content-start">
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-yellow-500 text-[10px] uppercase font-bold">PIP</div>
              <div className="text-lg font-black text-yellow-400">{Math.round(vitals.pip)}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-yellow-600 text-[10px] uppercase font-bold">Pplat</div>
              <div className="text-lg font-black text-yellow-500">{Math.round(vitals.pplat)}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-cyan-500 text-[10px] uppercase font-bold">VTE (mL)</div>
              <div className="text-lg font-black text-cyan-400">{Math.round(vitals.vte)}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold">RR (f)</div>
              <div className="text-lg font-black text-white">{vitals.rr}</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold">PEEP</div>
              <div className="text-lg font-black text-white">5</div>
            </div>
            <div className="text-right bg-slate-900 p-1 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold">FiO2</div>
              <div className="text-lg font-black text-white">100%</div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 h-[400px]">
        
        {/* Col 1: Assess, Access & O2 */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center gap-2"><Search size={14}/> POCUS (Ultrasound)</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handlePocus('Cardiac (TTE)')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Cardiac (TTE)</button>
            <button onClick={() => handlePocus('Lung')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Lung (Pleural)</button>
            <button onClick={() => handlePocus('Gastric')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow">Gastric (Antrum)</button>
            <button onClick={() => handlePocus('Airway')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left shadow border border-blue-900 text-blue-200">Airway (Trachea)</button>
          </div>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center gap-2 mt-2"><Syringe size={14}/> Vascular Access</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => establishAccess('PIV', '18G Peripheral IV (PIV)')} className={`p-2 rounded text-xs text-left shadow transition ${patient.hasIV ? 'bg-green-900 border border-green-500' : 'bg-slate-800 hover:bg-slate-700'}`}>Peripheral IV (18G PIV)</button>
            <button onClick={() => establishAccess('ALine', 'Radial Arterial Line (A-Line)')} className={`p-2 rounded text-xs text-left shadow transition ${patient.hasALine ? 'bg-green-900 border border-green-500' : 'bg-slate-800 hover:bg-slate-700'}`}>Arterial Line (A-Line)</button>
          </div>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Wind size={14}/> Oxygenation / Vent</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => setOxygen('Nasal Cannula (2L)', 10)} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200">Nasal Cannula (NC) - 2L</button>
            <button onClick={() => setOxygen('Nasal Cannula (15L / Apneic Ox)', 25)} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200">NC (15L) - Apneic Oxygenation</button>
            <button onClick={() => setOxygen('HFNC (60L / 100%)', 80)} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200">High Flow Nasal Cannula (HFNC)</button>
            <button onClick={() => setOxygen('Non-Rebreather (15L)', 40)} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200">Non-Rebreather Mask (NRB)</button>
            <button onClick={() => setOxygen('CPAP / BiPAP Mask', 70)} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200">CPAP Mask (Positive Pressure)</button>
            <button onClick={() => setOxygen('Bag-Mask (15L)', 50)} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border-t border-blue-500 pt-2 mt-1">Bag-Mask Ventilation (BMV)</button>
          </div>
        </div>

        {/* Col 2: Pharmacopoeia */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold">Induction Agents</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => pushMed('Propofol (1.5mg/kg)', () => { setPatient(p => ({...p, isApneic: true})); setVitals(v => ({...v, sys: patient.isSeptic ? v.sys - 45 : v.sys - 20})) })} className="bg-purple-900/40 hover:bg-purple-800 p-2 rounded text-xs text-left border border-purple-800">Propofol (Profound Vasodilator)</button>
            <button onClick={() => pushMed('Ketamine (1.5mg/kg)', () => { setPatient(p => ({...p, isApneic: true})); setVitals(v => ({...v, sys: v.sys + 20, hr: v.hr + 15})) })} className="bg-purple-900/40 hover:bg-purple-800 p-2 rounded text-xs text-left border border-purple-800">Ketamine (Sympathomimetic)</button>
            <button onClick={() => pushMed('Etomidate (0.3mg/kg)', () => { setPatient(p => ({...p, isApneic: true})) })} className="bg-purple-900/40 hover:bg-purple-800 p-2 rounded text-xs text-left border border-purple-800">Etomidate (Cardio-Stable)</button>
            <button onClick={() => pushMed('Midazolam (Versed)', () => { setPatient(p => ({...p, isApneic: true})); setVitals(v => ({...v, sys: v.sys - 10})) })} className="bg-purple-900/40 hover:bg-purple-800 p-2 rounded text-xs text-left border border-purple-800">Midazolam (Benzodiazepine)</button>
            <button onClick={() => pushMed('Dexmedetomidine (Precedex)', () => { setVitals(v => ({...v, sys: v.sys - 10, hr: v.hr - 15})) })} className="bg-purple-900/40 hover:bg-purple-800 p-2 rounded text-xs text-left border border-purple-800">Dexmedetomidine (Maintains Resp)</button>
          </div>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Paralytics (NMBAs)</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => pushMed('Succinylcholine (1.5mg/kg)', () => setPatient(p => ({...p, isParalyzed: true})))} className="bg-orange-900/40 hover:bg-orange-800 p-2 rounded text-xs text-left border border-orange-800">Succinylcholine (Depolarizing)</button>
            <button onClick={() => pushMed('Rocuronium (1.2mg/kg - High Dose)', () => setPatient(p => ({...p, isParalyzed: true})))} className="bg-orange-900/40 hover:bg-orange-800 p-2 rounded text-xs text-left border border-orange-800">Rocuronium (Non-Depolarizing RSI)</button>
            <button onClick={() => pushMed('Vecuronium (0.1mg/kg)', () => setPatient(p => ({...p, isParalyzed: true})))} className="bg-orange-900/40 hover:bg-orange-800 p-2 rounded text-xs text-left border border-orange-800">Vecuronium</button>
          </div>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Hemodynamics & Adjuncts</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => pushMed('Topical Lidocaine 4% (Atomizer)', () => setPatient(p => ({...p, isTopicalized: true})) )} className="bg-teal-900/40 hover:bg-teal-800 p-2 rounded text-xs text-left border border-teal-800">Topical Lidocaine (Awake Prep)</button>
            <button onClick={() => pushMed('Epinephrine (10mcg push)', () => setVitals(v => ({...v, sys: v.sys + 30, hr: v.hr + 20})) )} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left border border-red-800">Epinephrine (Adrenaline)</button>
            <button onClick={() => pushMed('Phenylephrine (100mcg push)', () => setVitals(v => ({...v, sys: v.sys + 25, hr: v.hr - 10})) )} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left border border-red-800">Phenylephrine (Neo-Synephrine)</button>
            <button onClick={() => pushMed('Ephedrine (10mg push)', () => setVitals(v => ({...v, sys: v.sys + 15, hr: v.hr + 15})) )} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left border border-red-800">Ephedrine</button>
            <button onClick={() => pushMed('Fentanyl (100mcg)', () => setVitals(v => ({...v, sys: v.sys - 10, hr: v.hr - 15})) )} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Fentanyl (Opioid)</button>
            <button onClick={() => pushMed('Sugammadex (16mg/kg)', () => setPatient(p => ({...p, isParalyzed: false})) )} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Sugammadex (Roc Reversal)</button>
          </div>
        </div>

        {/* Col 3: Airway Procedures */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold">Airway Optimization</h3>
          <div className="flex flex-col gap-2">
            <button onClick={handleSuction} className="bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-600 p-3 rounded text-sm font-bold text-left shadow transition flex justify-between">
              Suction Airway <Droplet size={18} className="text-yellow-400"/>
            </button>
            <button onClick={() => {saveState("Placed Oropharyngeal Airway (OPA)."); setPatient(p => ({...p, bmvOptimized: true}))}} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Insert Oropharyngeal Airway (OPA)</button>
            <button onClick={() => {saveState("Placed Nasopharyngeal Airway (NPA)."); setPatient(p => ({...p, bmvOptimized: true}))}} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Insert Nasopharyngeal Airway (NPA)</button>
          </div>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Intubation</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => { setViewModal(v => ({...v, blade: '', adjunct: ''})); setSetupModal(true); }} className="bg-green-900/40 hover:bg-green-800 p-4 rounded text-base text-center border border-green-500 font-black shadow-lg uppercase tracking-wider text-green-300">
              Prepare to Intubate
            </button>
          </div>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Extraglottic / Surgical</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => {saveState("Placed Laryngeal Mask Airway (LMA Classic)."); setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful'}))}} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Insert LMA (Classic)</button>
            <button onClick={() => {saveState("Placed Intubating LMA (Fastrach)."); setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful'}))}} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-left">Insert Intubating LMA (Fastrach)</button>
            <button onClick={() => {saveState("Performed Surgical Cricothyroidotomy. Front of neck access secured."); setPatient(p => ({...p, airwaySecured: true, ventilationStatus: 'successful'}))}} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left text-red-200 mt-2 border border-red-900">Surgical Cricothyroidotomy (Cric)</button>
          </div>
        </div>

        {/* Col 4: Log */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
          <h3 className="text-yellow-400 font-bold mb-3 border-b border-slate-700 pb-2 flex items-center gap-2"><Zap size={18}/> Clinical Log</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {logs.map((log, index) => (
              <div key={index} className={index === 0 ? "text-sm text-white font-bold" : "text-sm text-slate-400"}>
                {log}
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        /* Perfectly matched keyframes to exactly 1 loop of the SVG width to prevent ANY jumping */
        @keyframes sweep90  { from { background-position: 0 0; } to { background-position: -90px 0; } }
        @keyframes sweep150 { from { background-position: 0 0; } to { background-position: -150px 0; } }
        @keyframes sweep200 { from { background-position: 0 0; } to { background-position: -200px 0; } }
        @keyframes sweep250 { from { background-position: 0 0; } to { background-position: -250px 0; } }
        @keyframes sweep300 { from { background-position: 0 0; } to { background-position: -300px 0; } }

        /* Dynamic Tailwind-injected Classes */
        .anim-ecg-normal { animation: sweep150 1.5s linear infinite; }
        .anim-ecg-tachy  { animation: sweep90 0.8s linear infinite; }
        .anim-ecg-brady  { animation: sweep250 2.5s linear infinite; }
        .anim-pleth      { animation: sweep150 1.5s linear infinite; }
        .anim-aline      { animation: sweep150 1.5s linear infinite; }
        .anim-etco2      { animation: sweep200 4s linear infinite; }
        .anim-vent       { animation: sweep300 4s linear infinite; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
}