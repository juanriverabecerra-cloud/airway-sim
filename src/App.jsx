import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { usePhysiology } from './engine/usePhysiology';
import { ProceduralEngine } from './engine/ProceduralEngine';
import { Search, Activity } from 'lucide-react';
import { CaseManager } from './components/controls/CaseManager';

// Components
import { PatientHeader } from './components/PatientHeader';
import { PrimaryMonitor } from './components/monitors/PrimaryMonitor';
import { VentMonitor } from './components/monitors/VentMonitor';
import { BottomBar } from './components/controls/BottomBar';
import { ActionPanel } from './components/controls/ActionPanel';
import { Pharmacopoeia } from './components/controls/Pharmacopoeia';
import { AirwayPanel } from './components/controls/AirwayPanel';
import { LogPanel } from './components/controls/LogPanel';
import { LinesResusPanel } from './components/controls/LinesResusPanel';
import { AccessModal, PocusModal, SetupModal, TubeConfirmModal, AirwayQuizModal, ViewModal, PreopModal, MsmaidsModal, PostIntubationModal, ExtubationModal } from './components/modals/Modals';
import { PreOpEMR } from './components/modals/PreOpEMR';

// Attending Engine & Panel
import { evaluateAttendingGuidance } from './engine/AttendingEngine';
import AttendingPanel from './components/controls/AttendingPanel';
import FidelityPanel from './components/controls/FidelityPanel';
import { CLINICAL_ACTIONS } from './engine/ClinicalActions';


// eslint-disable-next-line no-unused-vars
const CASES = [
  {
    id: 'normal', name: 'Elective Surgery (Perfect Baseline)', difficulty: 'Easy',
    description: '45yo Female, ASA 1. Fasting for 12 hours. Normal neck anatomy, Mallampati I. Perfectly stable hemodynamics.',
    baseVitals: { hr: 72, sys: 120, dia: 80, spo2: 99, etco2: 0, rr: 12 },
    patient: { age: 45, sex: 'female', weight: 60, height: 165, ibw: 56, bmi: 22.0, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: false, baseGrade: 1, isSeptic: false, hasCCollar: false, stomach: 'empty', limitedMouth: false, trauma: false }
  },
  {
    id: 'trauma', name: 'Motor Vehicle Trauma (Bloody Airway)', difficulty: 'Hard',
    description: '54yo Male, GCS 7. Facial trauma, active bleeding in airway. Cervical collar in place restricting neck extension.',
    baseVitals: { hr: 115, sys: 105, dia: 65, spo2: 88, etco2: 0, rr: 24 },
    patient: { age: 54, sex: 'male', weight: 85, height: 180, ibw: 75, bmi: 26.2, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: true, isObese: false, baseGrade: 3, isSeptic: false, hasCCollar: true, stomach: 'full', limitedMouth: false, trauma: true }
  },
  {
    id: 'septic', name: 'Septic Shock (Hemodynamic Cliff)', difficulty: 'Hard',
    description: '68yo Male, urosepsis. Profoundly vasodilated, living on endogenous catecholamines. High risk of cardiovascular collapse.',
    baseVitals: { hr: 135, sys: 85, dia: 40, spo2: 92, etco2: 0, rr: 28 },
    patient: { age: 68, sex: 'male', weight: 70, height: 175, ibw: 70, bmi: 22.9, oxygenBuffer: 21, targetBuffer: 21, airwayBlood: false, isObese: false, baseGrade: 2, isSeptic: true, hasCCollar: false, stomach: 'empty', limitedMouth: false, trauma: false }
  },
  {
    id: 'obese', name: 'Morbid Obesity / OSA (Rapid Desat)', difficulty: 'Hard',
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
  const [nibpIntervalMs, setNibpIntervalMs] = useState(0);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [labs, setLabs] = useState({});
  const [showLabPanel, setShowLabPanel] = useState(false);
  const [showFidelityPanel, setShowFidelityPanel] = useState(false);
  
  const [airwayQuizModal, setAirwayQuizModal] = useState({ show: false, description: '', trueMallampati: 1 });
  const [accessModal, setAccessModal] = useState({ show: false, category: '' });
  const [tubeConfirmModal, setTubeConfirmModal] = useState({ show: false, result: '' });
  const [viewModal, setViewModal] = useState({ show: false, blade: '', bladeSize: '', tubeSize: '', adjunct: '', description: '', trueGrade: 1 });
  const [setupModal, setSetupModal] = useState(false);
  const [pocusModal, setPocusModal] = useState({ show: false, title: '', finding: '' });
  const [isCyclingNibp, setIsCyclingNibp] = useState(false);
  const [isAirwayCollapsed, setIsAirwayCollapsed] = useState(false);

  const [preopModal, setPreopModal] = useState(false);
  const [preOpEMR, setPreOpEMR] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showPreOp, setShowPreOp] = useState(false);
  const [stagedCase, setStagedCase] = useState(null);
  const [msmaidsModal, setMsmaidsModal] = useState(false);
  const [msmaidsComplete, setMsmaidsComplete] = useState(false);
  const [attendingMode, setAttendingMode] = useState('observing');
  const [postIntubationModal, setPostIntubationModal] = useState(false);
  const [extubationModal, setExtubationModal] = useState(false);
  
  const [ventSettings, setVentSettings] = useState({ mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, fio2: 50, pinsp: 20, ieRatio: 2, pmax: 40, ps: 10, air: 0.4, o2: 0.6 });
  const [gasSettings, setGasSettings] = useState({ agent: 'sevoflurane', dial: 0, airFlow: 0.0, o2Flow: 2.0, n2oFlow: 0.0 });
  const [defibSettings, setDefibSettings] = useState({ joules: 200, sync: false });

  function formatTime(seconds) {
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  const vitalsRef = useRef({ hr: 0, sys: 0, dia: 0, spo2: 0, rr: 0 });
  const timeRef = useRef(0);

  const logEvent = useCallback((msg) => {
    setLogs(prev => [`${formatTime(timeRef.current || 0)} - ${msg}`, ...prev]);
  }, []);
 
  const {
    time, setTime, vitals, setVitals, setTargetVitals, patient, setPatient,
    processMed, pushMed, pushFluid, updateFluidRate, removeFluid, activeMeds, intravascularVolume, electrolytes, coags,
    deliverShock, toggleCPR, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot
  } = usePhysiology({
    activeCase,
    isRunning,
    isPaused: viewModal.show || setupModal || pocusModal.show || airwayQuizModal.show || accessModal.show || tubeConfirmModal.show || preopModal || msmaidsModal || postIntubationModal || extubationModal,
    ventSettings,
    gasSettings,
    logEvent,
    msmaidsComplete
  });

  useEffect(() => {
    vitalsRef.current = vitals;
  }, [vitals]);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  const cycleNibp = useCallback(() => { 
    if (isCyclingNibp) return;
    setIsCyclingNibp(true);
    logEvent(`Started NIBP measurement cycle (15s)...`);
    setTimeout(() => {
      const currentVitals = vitalsRef.current;
      const currentTime = timeRef.current;
      setNibp({ sys: currentVitals.sys, dia: currentVitals.dia, time: currentTime }); 
      logEvent(`NIBP Result: ${Math.round(currentVitals.sys)}/${Math.round(currentVitals.dia)} mmHg`); 
      setIsCyclingNibp(false);
    }, 15000); 
  }, [isCyclingNibp, logEvent]);

  // Periodic NIBP cycle evaluation
  useEffect(() => {
    const isPaused = viewModal.show || setupModal || pocusModal.show || airwayQuizModal.show || accessModal.show || tubeConfirmModal.show || preopModal || msmaidsModal || postIntubationModal || extubationModal;
    if (isRunning && !isPaused && nibpIntervalMs > 0 && !patient?.hasALine) {
      const intervalSec = nibpIntervalMs / 1000;
      if (time > 0 && time % intervalSec === 0 && !isCyclingNibp) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        cycleNibp();
      }
    }
  }, [time, isRunning, nibpIntervalMs, isCyclingNibp, patient?.hasALine, viewModal.show, setupModal, pocusModal.show, airwayQuizModal.show, accessModal.show, tubeConfirmModal.show, preopModal, msmaidsModal, postIntubationModal, extubationModal, cycleNibp]);

  const attendingGuidance = evaluateAttendingGuidance({
    vitals,
    patient,
    activeMeds,
    surgicalPhase,
    time,
    logs,
    attendingMode,
    msmaidsComplete,
    ventSettings,
    gasSettings
  });

  // === QoL: GLOBAL CLINICAL TIME-OUT (SPACEBAR) ===
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Ignore if user is actively typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (activeCase) setIsRunning(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [activeCase]);

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
  const handleUpdateFluidRate = (...args) => { saveState(); updateFluidRate(...args); };
  const handleRemoveFluid = (...args) => { saveState(); removeFluid(...args); };
  const handleProcessMed = (...args) => { saveState(); processMed(...args); };
  const handlePushMed = (...args) => { saveState(); pushMed(...args); };
  const handleToggleCPR = () => { saveState(); toggleCPR(); };
  const handleDeliverShock = (...args) => { saveState(); deliverShock(...args); };
  const handleOptimizeAirway = (...args) => { saveState(); optimizeAirway(...args); };
  const handleSetVentSettings = (update) => { saveState(); setVentSettings(update); };
  const handleSetGasSettings = (update) => { saveState(); setGasSettings(update); };
  const handleSetSurgicalPhase = (val) => {
    if (val === 'Induction' && !msmaidsComplete && !patient?.emergentRSI && !patient?.isFuzzing) {
      logEvent("⚠️ CLINICAL INTERLOCK BLOCKED: Induction phase locked. Complete MSMAIDS pre-induction checklist first.");
      setMsmaidsModal(true);
      return;
    }
    saveState();
    setSurgicalPhase(val);
  };
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

  const handleExecuteClinicalAction = (actionKey) => {
    const action = CLINICAL_ACTIONS[actionKey.toLowerCase()];
    if (!action) return;

    if (action.type === 'medication') {
      handleProcessMed(action.drug, action.dose, action.route, action.drugType, action.unit);
    } else if (action.type === 'fluid') {
      // Find the first available venous access line (non-arterial, non-failed)
      const targetLine = patient.accessLines?.find(l => l.category !== 'Arterial Line' && !l.failed);
      if (!targetLine) {
        logEvent(`❌ FAILED: Cannot administer ${action.fluid}. No valid venous access line exists!`);
      } else {
        handlePushFluid(action.fluid, action.dose, targetLine.id);
      }
    } else if (action.type === 'procedure') {
      if (action.action === 'suction') {
        handleSuction();
      } else if (action.action === 'larson') {
        performLarsonManeuver();
      } else if (action.action === 'laryngoscopy') {
        setSetupModal(true);
      } else if (action.action === 'npo') {
        examineNpoHistory();
      } else if (action.action === 'airway_exam') {
        examineAirway();
      } else if (action.action === 'place_piv') {
        setAccessModal({ show: true, category: 'Peripheral IV' });
      } else if (action.action === 'place_cvc') {
        setAccessModal({ show: true, category: 'Central Line' });
      } else if (action.action === 'place_io') {
        setAccessModal({ show: true, category: 'Intraosseous (IO)' });
      } else if (action.action === 'place_art') {
        setAccessModal({ show: true, category: 'Arterial Line' });
      } else if (action.action === 'msmaids') {
        setMsmaidsModal(true);
      } else if (action.action === 'preop') {
        setPreopModal(true);
      } else if (action.action === 'post_intub') {
        setPostIntubationModal(true);
      } else if (action.action === 'extub') {
        setExtubationModal(true);
      } else if (action.action === 'cuff_leak') {
        checkCuffLeak();
      } else if (action.action === 'cpr') {
        toggleCPR();
      } else if (action.action === 'check_rhythm') {
        handleCheckRhythm();
      } else if (action.action === 'shock') {
        deliverShock(defibSettings.joules, defibSettings.sync);
      } else if (action.action === 'jaw_thrust') {
        logEvent("Applied firm Jaw Thrust and Two-Handed Mask Seal. Upper airway soft tissue obstruction temporarily relieved.");
        setPatient(p => ({ ...p, bmvOptimized: true }));
      } else if (action.action === 'place_opa') {
        optimizeAirway("Oropharyngeal Airway (OPA) (Size 90mm)");
      } else if (action.action === 'place_npa') {
        if (patient.trauma) {
          logEvent(`🚨 CRITICAL ERROR: Attempted NPA placement in severe facial/basilar skull trauma! The device breached the fractured cribriform plate and entered the cranial vault!`);
        } else {
          optimizeAirway("Nasopharyngeal Airway (NPA) (Size 30Fr)");
        }
      } else if (action.action === 'place_lma') {
        optimizeAirway("Laryngeal Mask Airway (LMA) (Size 4)");
      } else if (action.action === 'spray_lidocaine') {
        pushMed('Topical Lidocaine Spray', 1);
      } else if (action.action === 'surgical_cric') {
        handleSurgicalCric();
      } else if (action.action === 'extubate') {
        handleExtubation();
      } else if (action.action === 'auscultate_lungs') {
        setTubeConfirmModal({ show: true, result: '' });
      } else if (action.action === 'toggle_bis') {
        handleToggleBis();
      } else if (action.action === 'toggle_tof') {
        handleToggleTof();
      } else if (action.action === 'pull_back') {
        adjustTube('pull_back');
      } else if (action.action === 'remove_tube') {
        adjustTube('remove');
      } else if (action.action.startsWith('swap_')) {
        const targetLines = patient.accessLines?.filter(l => l.category !== 'Arterial Line' && !l.failed);
        if (!targetLines || targetLines.length === 0) {
          logEvent(`❌ FAILED: No active venous lines to swap delivery equipment!`);
        } else {
          const eqId = action.action.replace('swap_', '');
          setPatient(prev => {
            const newLines = (prev.accessLines || []).map(l => {
              if (l.category !== 'Arterial Line' && !l.failed) {
                return { ...l, fluidLine: eqId };
              }
              return l;
            });
            return { ...prev, accessLines: newLines };
          });
          logEvent(`Swapped delivery equipment to ${eqId.toUpperCase()} on all active venous lines.`);
        }
      } else if (action.action.startsWith('pos_')) {
        const rawPos = action.action.replace('pos_', '');
        const posMap = {
          supine: 'Supine',
          sniffing: 'Sniffing',
          ramped: 'Ramped',
          trendelenburg: 'Trendelenburg',
          rev_trendelenburg: 'Rev Trendelenburg',
          lithotomy: 'Lithotomy',
          lateral: 'Lateral',
          prone: 'Prone',
          sitting: 'Sitting'
        };
        const finalPos = posMap[rawPos] || 'Supine';
        setPatient(p => ({ ...p, position: finalPos }));
        logEvent(`Position updated to ${finalPos} via Attending recommendation.`);
      } else if (action.action.startsWith('phase_')) {
        const rawPhase = action.action.replace('phase_', '');
        const phaseMap = {
          preop: 'Pre-Op',
          induction: 'Induction',
          incision: 'Incision',
          maintenance: 'Maintenance',
          emergence: 'Emergence'
        };
        const targetPhase = phaseMap[rawPhase];
        if (targetPhase === 'Induction' && !msmaidsComplete && !patient?.emergentRSI && !patient?.isFuzzing) {
          logEvent("⚠️ CLINICAL INTERLOCK BLOCKED: Induction phase locked. Complete MSMAIDS pre-induction checklist first.");
          setMsmaidsModal(true);
        } else {
          setSurgicalPhase(targetPhase);
          logEvent(`Surgical phase advanced to ${targetPhase}.`);
        }
      } else if (action.action.startsWith('pocus_')) {
        const rawPocus = action.action.replace('pocus_', '');
        const pocusMap = {
          cardiac: 'Cardiac (TTE)',
          lung: 'Lung',
          gastric: 'Gastric',
          efast: 'eFAST'
        };
        const finalType = pocusMap[rawPocus];
        if (finalType) {
          handlePocus(finalType);
        }
      } else if (action.action.startsWith('o2_')) {
        const rawO2 = action.action.replace('o2_', '');
        const o2Map = {
          bmv: 'Bag-Mask Valve (BMV)',
          cannula: 'Nasal Cannula',
          mask: 'Simple Face Mask',
          nrb: 'Non-Rebreather Mask (NRB)',
          hfnc: 'High Flow Nasal Cannula (HFNC)',
          cpap: 'CPAP',
          bipap: 'BiPAP',
          room_air: 'Room Air'
        };
        const finalDevice = o2Map[rawO2];
        if (finalDevice) {
          handleSetO2(finalDevice);
        }
      } else if (action.action.startsWith('order_')) {
        const rawLab = action.action.replace('order_', '');
        const labMap = {
          abg: 'ABG',
          vbg: 'VBG',
          cbc: 'CBC',
          cmp: 'CMP',
          coags: 'Coagulation',
          teg: 'TEG',
          lfts: 'LFTs',
          thyroid: 'Thyroid',
          urinalysis: 'Urinalysis',
          pregnancy: 'Pregnancy',
          ts: 'Type & Screen',
          tcross: 'Type & Cross',
          hba1c: 'HbA1c'
        };
        const finalLab = labMap[rawLab] || 'ABG';
        generateLab(finalLab);
      }
    } else if (action.type === 'ui') {
      if (action.action === 'review_chart') {
        setShowPreOp(true);
      } else if (action.action === 'live_labs') {
        setShowLabPanel(true);
      }
    }

    // DEVELOPER NOTE: If any new feature or action is added to the simulator in the future, make sure to add its execution handler here inside handleExecuteClinicalAction.
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

  const openPreOpEMR = (stagedC) => {
    setStagedCase(stagedC);
    setPreOpEMR(true);
  };

  const startCase = (selectedCase) => {
    setActiveCase(selectedCase);
    setMsmaidsComplete(false);
    const initialMap = Math.round(selectedCase.baseVitals.dia + (selectedCase.baseVitals.sys - selectedCase.baseVitals.dia) / 3);
    setVitals({ ...selectedCase.baseVitals, pip: 0, pplat: 0, vte: 0, map: initialMap, cmap: initialMap });
    setTargetVitals({ ...selectedCase.baseVitals });
    setNibp({ sys: selectedCase.baseVitals.sys, dia: selectedCase.baseVitals.dia, time: 0 });
    setPatient({
      ...selectedCase.patient,
      isApneic: false, isParalyzed: false, isTopicalized: false, airwaySecured: false, airwayExamined: false,
      ventilationStatus: 'spontaneous', hasIV: false,
      hasALine: selectedCase.patient.hasALine || false,
      hasCVC: selectedCase.patient.hasCVC || false,
      currentO2Device: 'Room Air', currentFiO2: 21, currentO2Flow: 0,
      oxygenBuffer: null, // Let engine calculate from FRC
      drugEffects: { sys: 0, hr: 0 }, accessLines: [],
      patientBaseHR: selectedCase.baseVitals.hr
    });
    if (selectedCase.preOpLabs) {
      setLabs(selectedCase.preOpLabs);
    } else {
      setLabs({});
    }
    setLogs([`00:00 - Case Started: ${selectedCase.name}. ${selectedCase.description}`]);
    setIsCyclingNibp(false);
    setTime(0); setHistory([]); setIsRunning(true);
  };

  const performLarsonManeuver = () => {
    saveState();
    logEvent("✊ Larson's Point jaw-thrust maneuver performed at the styloid process behind the lobule of the pinna. Severe bilateral airway obstruction and laryngospasm resolved!");
    setPatient(p => ({ ...p, airwayObstruction: false, laryngospasm: false }));
  };

  const checkCuffLeak = () => {
    saveState();
    logEvent("💨 Cuff Leak Test performed: ETT cuff deflated. Audible high-volume leak heard around the tube, confirming minimal to no airway/laryngeal edema. Extubation is highly favored.");
  };

  const examineNpoHistory = () => {
    logEvent(`📋 Clinical History & Fasting Assessment:\n- Name: ${patient.name || 'Elective Patient'}\n- Age/Weight: ${patient.age || 45}yo / ${patient.weight || 60}kg\n- NPO Solids: ${patient.npoDuration || 8} hours\n- GLP-1 Receptor Agonists: ${patient.glp1Active ? 'ACTIVE (Delayed Gastric Emptying Risk)' : 'NO'}\n- Primary Comorbidities: ${[patient.cad ? 'CAD' : '', patient.chf ? 'CHF' : '', patient.diabetes ? 'Diabetes' : '', patient.mg ? 'Myasthenia Gravis' : ''].filter(Boolean).join(', ') || 'None'}`);
  };

  const examineAirway = () => {
    const mallampati = patient.mallampati || 1;
    if (patient?.isFuzzing) {
      logEvent(`Airway Assessment (Fuzzer): Automatically identified Mallampati Class ${mallampati}.`);
      setPatient(p => ({ ...p, airwayExamined: true, mallampatiScore: mallampati }));
      return;
    }
    const thyromental = patient.isObese ? "< 6cm (Short / Anterior Airway Risk)" : "> 6cm (Normal)";
    const biteTest = patient.limitedMouth ? "Class III (Cannot bite upper lip)" : "Class I (Lower incisors bite above vermillion border)";
    const mobility = patient.neckMobility === 'reduced' ? "Severely Restricted (C-Collar or anatomical limitation)" : "Normal full extension/flexion";
          
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
    setPatient(p => ({ ...p, airwayExamined: true, mallampatiScore: selectedClass }));
    setAirwayQuizModal({ show: false, description: '', trueMallampati: 1 });
  };

  const establishAccess = (category = '', type = '', location = '') => {
    if (!category || !type) return;
    const fullName = `${type} (${location})`;

    if (type.includes('Triple Lumen CVC')) {
       const newLine1 = { id: Date.now().toString() + '1', name: `Distal Lumen (16G) - ${location}`, category, type: '16G CVC', location, radius: 0.665, length: 200, venousPressure: 5, veinResistance: 0, activeInfusions: [], activeMedInfusions: [] };
       const newLine2 = { id: Date.now().toString() + '2', name: `Medial Lumen (18G) - ${location}`, category, type: '18G CVC', location, radius: 0.475, length: 200, venousPressure: 5, veinResistance: 0, activeInfusions: [], activeMedInfusions: [] };
       const newLine3 = { id: Date.now().toString() + '3', name: `Proximal Lumen (18G) - ${location}`, category, type: '18G CVC', location, radius: 0.475, length: 200, venousPressure: 5, veinResistance: 0, activeInfusions: [], activeMedInfusions: [] };
       
       logEvent(`Placed Triple Lumen CVC (${location}). 3 ports available.`);
       setPatient(p => {
         const prev = p || {};
         return {
           ...prev,
           hasIV: true,
           hasCVC: true,
           accessLines: [...(prev.accessLines || []).filter(l => l && typeof l !== 'string'), newLine1, newLine2, newLine3]
         };
       });
       setAccessModal({ show: false, category: '' });
       return;
    }
    if (type.includes('Double Lumen CVC')) {
       const newLine1 = { id: Date.now().toString() + '1', name: `Distal Lumen (14G) - ${location}`, category, type: '14G CVC', location, radius: 0.85, length: 200, venousPressure: 5, veinResistance: 0, activeInfusions: [], activeMedInfusions: [] };
       const newLine2 = { id: Date.now().toString() + '2', name: `Proximal Lumen (18G) - ${location}`, category, type: '18G CVC', location, radius: 0.475, length: 200, venousPressure: 5, veinResistance: 0, activeInfusions: [], activeMedInfusions: [] };
       
       logEvent(`Placed Double Lumen CVC (${location}). 2 ports available.`);
       setPatient(p => {
         const prev = p || {};
         return {
           ...prev,
           hasIV: true,
           hasCVC: true,
           accessLines: [...(prev.accessLines || []).filter(l => l && typeof l !== 'string'), newLine1, newLine2]
         };
       });
       setAccessModal({ show: false, category: '' });
       return;
    }
    
    let radius = 0.5; // mm default
    let length = 30; // mm default
    let venousPressure = 10; // mmHg default
    let veinResistance = 500; // arbitrary total series default
    
    if (type.includes('14G') && !type.includes('CVC')) { radius = 0.85; length = 45; }
    else if (type.includes('16G') && !type.includes('CVC')) { radius = 0.665; length = 45; }
    else if (type.includes('18G') && !type.includes('CVC')) { radius = 0.475; length = 32; }
    else if (type.includes('20G') && !type.includes('CVC')) { radius = 0.405; length = 30; }
    else if (type.includes('22G') && !type.includes('CVC')) { radius = 0.30; length = 25; }
    else if (type.includes('24G') && !type.includes('CVC')) { radius = 0.235; length = 19; }
    else if (type.includes('Single Lumen CVC')) { radius = 0.85; length = 200; venousPressure = 5; veinResistance = 0; }
    else if (type.includes('CVC')) { radius = 0.475; length = 200; venousPressure = 5; veinResistance = 0; }
    else if (type.includes('Trauma Cordis')) { radius = 1.15; length = 100; venousPressure = 5; veinResistance = 0; }
    else if (type.includes('MAC') || type.includes('Cordis')) { radius = 1.25; length = 100; venousPressure = 5; veinResistance = 0; }
    else if (category.includes('IO')) { 
      radius = 0.45; 
      length = 25; 
      if (location.includes('Humeral')) {
        venousPressure = 15;
        veinResistance = 1500;
      } else {
        venousPressure = 18;
        veinResistance = 2500;
      }
    }
    
    // Assign peripheral parameters based on location
    if (category.includes('PIV')) {
      if (location.includes('Hand')) {
        venousPressure = 18;
        veinResistance = 2200;
      } else if (location.includes('Forearm')) {
        venousPressure = 12;
        veinResistance = 800;
      } else if (location.includes('AC')) {
        venousPressure = 8;
        veinResistance = 200;
      }
    }

    if (category.includes('Arterial')) {
      radius = 0.405;
      length = 30;
      venousPressure = 0;
      veinResistance = 99999; // block venous flow
    }
    
    const newLine = { 
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7), 
      name: fullName, 
      category, 
      type, 
      location, 
      radius, 
      length, 
      venousPressure,
      veinResistance,
      activeInfusions: [],
      activeMedInfusions: []
    };

    if (category.includes('IO')) {
      logEvent(`🚨 CLINICAL ALERT: IO placement into bone cavity triggered intense autonomic pain response! Transient sympathetic surge initiated.`);
    }

    logEvent(`Placed ${fullName}. Physical dimensions initialized (r: ${radius}mm, L: ${length}mm, Pv: ${venousPressure}mmHg, Rv: ${veinResistance}).`);
    setPatient(p => {
       const prev = p || {};
       const isIO = category.includes('IO');
       return { 
         ...prev, 
         hasIV: prev.hasIV || !category.includes('Arterial'), 
         hasALine: prev.hasALine || category.includes('Arterial'),
         hasCVC: prev.hasCVC || category.includes('CVC') || type.includes('MAC'),
         ioSympatheticSurgeActive: prev.ioSympatheticSurgeActive || isIO,
         ioPlacedTime: isIO ? time : prev.ioPlacedTime,
         accessLines: [...(prev.accessLines || []).filter(l => l && typeof l !== 'string'), newLine] // Clear legacy string lines
       };
    });
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
    const finding = ProceduralEngine.auscultateLungs(location, patient);
    logEvent(`Auscultated ${location}: ${finding}`);
    setTubeConfirmModal(prev => ({ ...prev, result: `Auscultated ${location}: ${finding}` }));
  };

  const handleSuction = () => {
    saveState("Performed rigid Yankauer suction. Cleared airway of blood and secretions.");
    setPatient(p => ({ ...p, airwayBlood: false, isSuctioned: true }));
  };

  const handlePocus = (type) => {
    const finding = ProceduralEngine.performPocus(type, patient);
    setPocusModal({ show: true, title: `${type} Ultrasound`, finding });
    logEvent(`Performed ${type} Ultrasound.`);
  };

  const generateClinicalHint = () => {
    if (!activeCase) return;
    
    let currentStatus;
    let forecast;

    // Pull from high-fidelity, unified AttendingEngine findings
    const guidance = attendingGuidance?.primaryGuidance;
    const audit = attendingGuidance?.fullAudit;
    
    if (guidance) {
      currentStatus = `${guidance.title.replace(/🚨|⚠️|📚|💡|👀/g, '').trim()}: ${guidance.text}`;
      forecast = guidance.suggestion || "Monitor vitals and maintain stable anesthetic depth.";
    } else {
      // Find the first warning or suggestion from the audit, or default to stable
      const firstWarning = audit?.find(item => item.priority === 'CRITICAL' || item.priority === 'WARNING');
      if (firstWarning) {
        currentStatus = `${firstWarning.id.replace(/_/g, ' ').toUpperCase()}: ${firstWarning.message}`;
        forecast = firstWarning.action || "Evaluate patient physiology and take corrective measures.";
      } else {
        const firstSuggestion = audit?.find(item => item.priority === 'SUGGESTION' || item.priority === 'TEACHING');
        if (firstSuggestion) {
          currentStatus = firstSuggestion.message;
          forecast = firstSuggestion.action || "Monitor vitals and ensure clinical safety.";
        } else {
          currentStatus = "🟢 Physiology is currently stable and all parameters are within normal physiological bounds.";
          forecast = "No active clinical hazards. Maintain current anesthetic depth and ventilation settings.";
        }
      }
    }

    logEvent(`💡 ATTENDING CONSULT:\n[STATUS] ${currentStatus}\n[FORECAST] ${forecast}`);
  };

  const generateLab = (type) => {
    let delay = 3000; // default 3s for POC iSTAT
    let label = type;
    
    if (type === 'ABG' || type === 'VBG' || type === 'Lactate') {
      logEvent(`Sent blood to iSTAT cartridge for immediate ${type} analysis (ETA ~2 min)...`);
      delay = 3000;
    } else if (type === 'CBC' || type === 'CMP') {
      logEvent(`Sent blood for point-of-care ${type} panel (ETA ~2 min)...`);
      delay = 4000;
    } else if (type === 'Coagulation') {
      logEvent(`Sent blood for Central Lab Coagulation Panel (PT/INR/PTT) (ETA ~5 min)...`);
      delay = 6000;
      label = 'Coagulation';
    } else if (type === 'LFTs' || type === 'Thyroid' || type === 'Urinalysis' || type === 'Pregnancy' || type === 'HbA1c') {
      logEvent(`Sent specimen for ${type} analysis (ETA ~5-15 min)...`);
      delay = 8000;
    } else if (type === 'TEG') {
      logEvent(`Sent blood to TEG analyzer. Cup and pin warming up (ETA ~10 min)...`);
      delay = 12000;
    } else if (type === 'Type & Screen' || type === 'Type & Cross') {
      logEvent(`Sent blood bank tubes for ${type}. Crossmatching PRBCs (ETA ~45 min)...`);
      delay = 20000;
    }

    setTimeout(() => {
      let results = {};
      const currentPh = vitals.ph || electrolytes.ph || 7.4;
      const currentPaCO2 = vitals.paco2 || 40;
      const currentPaO2 = vitals.pao2 || 100;
      const baseHco3 = patient.isObese ? 32 : 24; 
      const metabolicAcidosis = (patient.isSeptic ? 8 : 0) + ((patient.ebl || 0) > 1500 ? 6 : 0);
      const currentHco3 = Math.max(8, baseHco3 - metabolicAcidosis - ((7.4 - currentPh) * 100));
      const currentLactate = (patient.isSeptic ? 4.5 + Math.random() * 2 : 1.0 + ((patient.ebl || 0) / 600));

      const ebv = (patient.sex === 'male' ? patient.weight * 70 : patient.weight * 65) || 5000;
      const bloodLossRatio = (patient.ebl || 0) / ebv;
      const startingHb = patient.startingHb || (patient.anemia ? 8.9 : 14.2);
      const dilutionRatio = (intravascularVolume || ebv) / ebv;
      const currentHb = Math.max(3.0, (startingHb * (1 - bloodLossRatio)) / Math.max(0.6, dilutionRatio));
      const currentHct = currentHb * 3;
      const currentPlt = Math.max(10, Math.round((patient.thrombocytopenia ? 75 : 245) * (1 - bloodLossRatio)));

      if (type === 'ABG') {
        results = {
          'pH': { val: currentPh.toFixed(2), range: '7.35 - 7.45', alert: currentPh < 7.35 || currentPh > 7.45 },
          'pCO2': { val: currentPaCO2.toFixed(1), range: '35 - 45 mmHg', alert: currentPaCO2 < 35 || currentPaCO2 > 45 },
          'pO2': { val: Math.round(currentPaO2), range: '75 - 100 mmHg', alert: currentPaO2 < 60 },
          'HCO3': { val: currentHco3.toFixed(1), range: '22 - 26 mEq/L', alert: currentHco3 < 20 || currentHco3 > 28 },
          'Lactate': { val: currentLactate.toFixed(1), range: '0.5 - 2.0 mmol/L', alert: currentLactate > 2.0 }
        };
      } else if (type === 'VBG') {
        results = {
          'pvH': { val: (currentPh - 0.04).toFixed(2), range: '7.31 - 7.41', alert: (currentPh - 0.04) < 7.31 || (currentPh - 0.04) > 7.41 },
          'pvCO2': { val: (currentPaCO2 + 5).toFixed(1), range: '41 - 51 mmHg', alert: (currentPaCO2 + 5) > 51 },
          'pvO2': { val: Math.max(25, Math.round(35 + (currentPaO2 - 100) * 0.08)), range: '30 - 50 mmHg', alert: false },
          'HCO3': { val: currentHco3.toFixed(1), range: '22 - 26 mEq/L', alert: currentHco3 < 20 || currentHco3 > 28 },
          'Lactate': { val: currentLactate.toFixed(1), range: '0.5 - 2.2 mmol/L', alert: currentLactate > 2.2 }
        };
      } else if (type === 'CBC') {
        const wbc = patient.isSeptic ? (Math.random() * 5 + 18).toFixed(1) : (Math.random() * 2 + 6).toFixed(1);
        results = {
          'WBC': { val: wbc, range: '4.5 - 11.0 x10^3/µL', alert: patient.isSeptic || parseFloat(wbc) > 11.0 },
          'Hemoglobin (Hb)': { val: currentHb.toFixed(1), range: '12.0 - 17.5 g/dL', alert: currentHb < 10.0 },
          'Hematocrit (Hct)': { val: currentHct.toFixed(1), range: '36 - 50 %', alert: currentHct < 30 },
          'Platelets': { val: currentPlt, range: '150 - 450 x10^3/µL', alert: currentPlt < 150 }
        };
      } else if (type === 'CMP') {
        const currentNa = electrolytes.na || 138;
        const currentK = electrolytes.k || 4.1;
        const currentCl = electrolytes.cl || 102;
        const bunVal = patient.ckd ? 48 : (patient.isSeptic ? 28 : 12);
        const crVal = (patient.startingCreatinine || (patient.ckd ? 2.8 : 0.85)) + (patient.isSeptic ? 0.8 : 0);
        const glucVal = (patient.startingGlucose || (patient.diabetes ? 195 : 98)) + (patient.isSeptic ? 60 : 0);
        
        results = {
          'Sodium (Na)': { val: Math.round(currentNa), range: '135 - 145 mEq/L', alert: currentNa < 135 || currentNa > 145 },
          'Potassium (K)': { val: currentK.toFixed(1), range: '3.5 - 5.1 mEq/L', alert: currentK < 3.5 || currentK > 5.1 },
          'Chloride (Cl)': { val: Math.round(currentCl), range: '96 - 106 mEq/L', alert: false },
          'CO2 (Bicarbonate)': { val: currentHco3.toFixed(1), range: '22 - 29 mEq/L', alert: currentHco3 < 22 },
          'BUN': { val: bunVal, range: '7 - 20 mg/dL', alert: bunVal > 20 },
          'Creatinine (Cr)': { val: crVal.toFixed(2), range: '0.70 - 1.30 mg/dL', alert: crVal > 1.3 },
          'Glucose': { val: Math.round(glucVal), range: '70 - 100 mg/dL', alert: glucVal > 100 }
        };
      } else if (type === 'Coagulation') {
        const tempFactor = vitals.temp < 36.0 ? Math.pow(1.15, 36.0 - vitals.temp) : 1.0;
        const ptVal = (12.0 + (coags.r_offset || 0) * 1.8) * tempFactor;
        const inrVal = ptVal / 12.0;
        const pttVal = (31.0 + (coags.r_offset || 0) * 3.2) * tempFactor;
        
        results = {
          'Prothrombin Time (PT)': { val: ptVal.toFixed(1) + ' s', range: '11.0 - 13.5 s', alert: ptVal > 13.5 },
          'INR': { val: inrVal.toFixed(1), range: '0.8 - 1.2', alert: inrVal > 1.2 },
          'Partial Thromboplastin Time (PTT)': { val: pttVal.toFixed(1) + ' s', range: '25.0 - 35.0 s', alert: pttVal > 35.0 }
        };
      } else if (type === 'TEG') {
        const tempDiff = vitals.temp < 36.0 ? 36.0 - vitals.temp : 0;
        const rTempFactor = 1.0 + tempDiff * 0.20;
        const rVal = (6.0 + (coags.r_offset || 0)) * rTempFactor;
        const angleVal = Math.max(10, 65.0 + (coags.angle_offset || 0) - tempDiff * 5);
        const maVal = Math.max(5, 60.0 + (coags.ma_offset || 0) - tempDiff * 6);
        results = {
          'R': { val: rVal.toFixed(1) + ' min', range: '5 - 10 min', alert: rVal > 10.0 },
          'Angle': { val: Math.round(angleVal) + ' deg', range: '53 - 72 deg', alert: angleVal < 53.0 },
          'MA': { val: Math.round(maVal) + ' mm', range: '50 - 70 mm', alert: maVal < 50.0 }
        };
      } else if (type === 'LFTs') {
        const isCirrhosis = patient.cirrhosis;
        const astVal = isCirrhosis ? 134 : 22;
        const altVal = isCirrhosis ? 118 : 25;
        const alkVal = isCirrhosis ? 210 : 68;
        const biliVal = isCirrhosis ? 3.4 : 0.6;
        const albVal = isCirrhosis ? 2.5 : 4.1;
        results = {
          'AST': { val: astVal + ' U/L', range: '10 - 40 U/L', alert: isCirrhosis },
          'ALT': { val: altVal + ' U/L', range: '7 - 56 U/L', alert: isCirrhosis },
          'Alkaline Phosphatase': { val: alkVal + ' U/L', range: '44 - 147 U/L', alert: isCirrhosis },
          'Total Bilirubin': { val: biliVal.toFixed(1) + ' mg/dL', range: '0.2 - 1.2 mg/dL', alert: isCirrhosis },
          'Albumin': { val: albVal.toFixed(1) + ' g/dL', range: '3.5 - 5.0 g/dL', alert: isCirrhosis }
        };
      } else if (type === 'Thyroid') {
        const isHyper = patient.hyperthyroid || patient.thyroid === 'hyper';
        const isHypo = patient.hypothryoid || patient.thyroid === 'hypo';
        const tsh = isHyper ? 0.05 : (isHypo ? 14.5 : 1.8);
        const t4 = isHyper ? 3.2 : (isHypo ? 0.4 : 1.2);
        results = {
          'TSH': { val: tsh.toFixed(2) + ' mIU/L', range: '0.40 - 4.00 mIU/L', alert: isHyper || isHypo },
          'Free T4': { val: t4.toFixed(1) + ' ng/dL', range: '0.8 - 1.8 ng/dL', alert: isHyper || isHypo }
        };
      } else if (type === 'Urinalysis') {
        results = {
          'Appearance': { val: patient.isSeptic ? 'Cloudy' : 'Clear', range: 'Clear', alert: patient.isSeptic },
          'Nitrite': { val: patient.isSeptic ? 'Positive' : 'Negative', range: 'Negative', alert: patient.isSeptic },
          'Leukocyte Esterase': { val: patient.isSeptic ? 'Trace' : 'Negative', range: 'Negative', alert: patient.isSeptic },
          'Protein': { val: 'Negative', range: 'Negative', alert: false }
        };
      } else if (type === 'Pregnancy') {
        results = {
          'Urine beta-hCG': { val: patient.isPregnant ? 'POSITIVE' : 'NEGATIVE', range: 'NEGATIVE', alert: patient.isPregnant }
        };
      } else if (type === 'Type & Screen') {
        results = {
          'ABO / Rh Type': { val: patient.sex === 'male' ? 'A Positive' : 'O Negative', range: 'N/A', alert: false },
          'Antibody Screen': { val: 'Negative', range: 'Negative', alert: false }
        };
      } else if (type === 'Type & Cross') {
        results = {
          'Units Ordered': { val: '2 Units PRBC', range: 'N/A', alert: false },
          'Crossmatch Status': { val: 'Compatible - In Blood Bank', range: 'Compatible', alert: false }
        };
      } else if (type === 'HbA1c') {
        const a1c = patient.diabetes ? 8.4 : 5.3;
        results = {
          'HbA1c': { val: a1c.toFixed(1) + ' %', range: '< 5.7 %', alert: patient.diabetes }
        };
      }

      setLabs(prev => {
        const existing = prev[label] || { testNames: Object.keys(results), history: [] };
        return {
          ...prev,
          [label]: { ...existing, history: [...existing.history, { time: formatTime(time), results }] }
        };
      });
      setShowLabPanel(true);
      logEvent(`📊 [LAB RESULTS] ${label} Panel results are back.`);
    }, delay);
  };

  const processIntubation = (blade, adjunct) => {
    setSetupModal(false);
    setPatient(p => ({...p, dlAttempts: (p.dlAttempts || 0) + 1}));

    if (!patient.isApneic && !blade.includes('Fiberoptic')) {
       if (!patient.isTopicalized) {
          logEvent(`❌ FAILED: Patient is awake and not topicalized! Severe gag reflex and laryngospasm triggered!`);
          setPatient(p => ({...p, ventilationStatus: 'failed', targetBuffer: 0}));
          return;
       }
    }

    const clResult = ProceduralEngine.calculateCormackLehaneGrade(patient, blade);
    logEvent(`Attempted Intubation using ${blade} with ${adjunct}. Analyzing view...`);
    setViewModal({ show: true, blade, adjunct, description: clResult.description, trueGrade: clResult.grade });
  };

  const submitGrade = (selectedGrade) => {
    const isCorrect = selectedGrade === viewModal.trueGrade;
    logEvent(`Student identified view as Grade ${selectedGrade}. (${isCorrect ? 'Correct' : 'Incorrect'})`);

    const outcome = ProceduralEngine.evaluateIntubationOutcome(viewModal.blade, viewModal.adjunct, viewModal.trueGrade, patient);

    if (outcome.success) {
      const height = patient.height || 170;
      const tubePos = ProceduralEngine.calculateTubePosition(true, height, Math.random());

      logEvent(`✅ Intubation completed. Tube secured to Mechanical Ventilator.`);
      if (tubePos === 'right_mainstem' || tubePos === 'left_mainstem') logEvent(`⚠️ Note: Tube depth may be excessive for patient's height.`);

      setPatient(p => ({ 
        ...p, 
        airwaySecured: true, 
        ventilationStatus: 'successful', 
        tubePosition: tubePos, 
        currentO2Device: 'Mechanical Ventilator (100% FiO2)', 
        currentO2Flow: 15, 
        currentFiO2: 100 
      }));
      setPostIntubationModal(true);
    } else {
      logEvent(`❌ Intubation FAILED. ${outcome.failReason}`);
      setPatient(p => ({ ...p, ventilationStatus: 'failed', tubePosition: 'esophagus' }));
    }
    setViewModal({ show: false, blade: '', adjunct: '', description: '', trueGrade: 1 });
  };

  if (!activeCase) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 p-8 font-sans flex flex-col items-center justify-center relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-900/15 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-[140px] pointer-events-none"></div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-cyan-400 mb-8 flex items-center gap-4 z-10 drop-shadow-[0_0_18px_rgba(34,211,238,0.35)] tracking-tight">
           <Activity size={48} className="animate-pulse text-cyan-400"/> AirwaySim OS
        </h1>
        
        <div className="z-10 w-full flex justify-center">
           <CaseManager 
             onStart={startCase} 
             stagedCase={stagedCase}
             setStagedCase={setStagedCase}
             openPreOpEMR={openPreOpEMR}
           />
        </div>

        {preOpEMR && stagedCase && (
          <PreOpEMR
            show={preOpEMR}
            close={() => setPreOpEMR(false)}
            stagedCase={stagedCase}
            setStagedCase={setStagedCase}
            onStart={startCase}
            logEvent={logEvent}
          />
        )}
      </div>
    );
  }

  // PASS THE ACTUAL RATE (BPM/RPM) TO THE RENDERING ENGINE
  const hrSpeed = Math.round((vitals.hr || 70) / 5) * 5;
  const rrSpeed = Math.round((vitals.rr || 12) / 2) * 2;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 p-4 font-sans select-none flex flex-col gap-4 relative overflow-x-hidden">
      {/* Premium Ambient Subsystem Mesh Glow Orbs */}
      <div className="absolute top-[5%] left-[5%] w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-[25%] right-[10%] w-[450px] h-[450px] bg-cyan-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] left-[15%] w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] bg-amber-500/[0.02] rounded-full blur-[100px] pointer-events-none z-0"></div>
      
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
        showPreOp={preOpEMR}
        setShowPreOp={setPreOpEMR}
        showFidelityPanel={showFidelityPanel}
        setShowFidelityPanel={setShowFidelityPanel}
      />

      <div className={`grid grid-cols-1 ${patient?.airwaySecured ? 'lg:grid-cols-2' : ''} gap-4 mb-4`}>
        <PrimaryMonitor 
          patient={patient} 
          vitals={vitals} 
          nibp={nibp} 
          cycleNibp={cycleNibp}
          nibpIntervalMs={nibpIntervalMs}
          setNibpIntervalMs={setNibpIntervalMs} 
          isCyclingNibp={isCyclingNibp}
          hrSpeed={hrSpeed} 
          rrSpeed={rrSpeed} 
          gasSettings={gasSettings} 
          ventSettings={ventSettings}
        />

        {patient?.airwaySecured && (
          <VentMonitor 
            patient={patient} 
            vitals={vitals} 
            rrSpeed={rrSpeed} 
            ventSettings={ventSettings} 
            setVentSettings={handleSetVentSettings}
          />
        )}
      </div>
      
        <BottomBar 
        gasSettings={gasSettings} 
        setGasSettings={handleSetGasSettings} 
        ventSettings={ventSettings} 
        setVentSettings={handleSetVentSettings} 
        patient={patient} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch" style={{ minHeight: '500px' }}>
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
           setPreopModal={setPreopModal}
           setMsmaidsModal={setMsmaidsModal}
           msmaidsComplete={msmaidsComplete}
           setPostIntubationModal={setPostIntubationModal}
           setExtubationModal={setExtubationModal}
           performLarsonManeuver={performLarsonManeuver}
           checkCuffLeak={checkCuffLeak}
           examineNpoHistory={examineNpoHistory}
        />
        
        <Pharmacopoeia
           pushFluid={handlePushFluid} 
           processMed={handleProcessMed} 
           patient={patient} 
           setPatient={setPatient}
           updateFluidRate={handleUpdateFluidRate}
           removeFluid={handleRemoveFluid}
           logEvent={logEvent}
        />
        
        <div className="col-span-1 flex flex-col gap-4 min-h-[500px]">
          <LinesResusPanel
             patient={patient}
             setPatient={setPatient}
             updateFluidRate={handleUpdateFluidRate}
             removeFluid={handleRemoveFluid}
             logEvent={logEvent}
             processMed={handleProcessMed}
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
             setExtubationModal={setExtubationModal}
             setPostIntubationModal={setPostIntubationModal}
             checkCuffLeak={checkCuffLeak}
             isCollapsed={isAirwayCollapsed}
             setIsCollapsed={setIsAirwayCollapsed}
          />
        </div>
        
        <LogPanel 
           logs={logs} 
           formatTime={formatTime} 
           onActionClick={handleExecuteClinicalAction}
        />
      </div>

      {!patient?.isFuzzing && (
        <>
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

          <PreopModal
            show={preopModal}
            close={() => setPreopModal(false)}
            patient={patient}
            setPatient={setPatient}
            logEvent={logEvent}
          />

          <MsmaidsModal
            show={msmaidsModal}
            close={() => setMsmaidsModal(false)}
            logEvent={logEvent}
            onComplete={() => setMsmaidsComplete(true)}
          />

          <PostIntubationModal
            show={postIntubationModal}
            close={() => setPostIntubationModal(false)}
            logEvent={logEvent}
          />

          <ExtubationModal
            show={extubationModal}
            close={() => setExtubationModal(false)}
            vitals={vitals}
            patient={patient}
            logEvent={logEvent}
            performExtubation={handleExtubation}
          />
        </>
      )}

      {preOpEMR && (activeCase || stagedCase) && (
        <PreOpEMR
          show={preOpEMR}
          close={() => setPreOpEMR(false)}
          stagedCase={activeCase || stagedCase}
          setStagedCase={activeCase ? () => {} : setStagedCase}
          onStart={activeCase ? () => {} : startCase}
          logEvent={logEvent}
          intraop={!!activeCase}
        />
      )}

      {activeCase && (
        <FidelityPanel
          isOpen={showFidelityPanel}
          setIsOpen={setShowFidelityPanel}
          vitals={vitals}
          patient={patient}
          activeMeds={activeMeds}
          gasSettings={gasSettings}
          ventSettings={ventSettings}
          surgicalPhase={surgicalPhase}
          electrolytes={electrolytes}
          coags={coags}
          time={time}
          setPatient={setPatient}
          handleProcessMed={handleProcessMed}
          handlePushMed={handlePushMed}
          handlePushFluid={handlePushFluid}
          handleSetVentSettings={handleSetVentSettings}
          handleSetO2={handleSetO2}
          handleToggleCPR={handleToggleCPR}
          handleDeliverShock={handleDeliverShock}
          establishAccess={establishAccess}
          performLarsonManeuver={performLarsonManeuver}
          checkCuffLeak={checkCuffLeak}
          examineNpoHistory={examineNpoHistory}
          generateLab={generateLab}
          logEvent={logEvent}
          setSurgicalPhase={handleSetSurgicalPhase}
          handleExtubation={handleExtubation}
          setMsmaidsComplete={setMsmaidsComplete}
        />
      )}

      {activeCase && (
        <AttendingPanel
          vitals={vitals}
          patient={patient}
          activeMeds={activeMeds}
          surgicalPhase={surgicalPhase}
          time={time}
          logs={logs}
          attendingMode={attendingMode}
          setAttendingMode={setAttendingMode}
          primaryGuidance={attendingGuidance.primaryGuidance}
          fullAudit={attendingGuidance.fullAudit}
          activeAlertsCount={attendingGuidance.activeAlertsCount}
          formatTime={formatTime}
          generateClinicalHint={generateClinicalHint}
          onActionClick={handleExecuteClinicalAction}
          nearFutureForecast={attendingGuidance.nearFutureForecast}
        />
      )}

    </div>
  );
}