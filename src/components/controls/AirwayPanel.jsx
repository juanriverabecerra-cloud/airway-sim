import { useState, useEffect } from 'react';
import { Wind, Stethoscope, AlertTriangle, Droplet, Sliders, ShieldAlert, Eye } from 'lucide-react';

export const AirwayPanel = ({ 
  patient, 
  setPatient, 
  handleSuction, 
  optimizeAirway, 
  pushMed, 
  setSetupModal, 
  setTubeConfirmModal, 
  logEvent, 
  handleSurgicalCric, 
  handleExtubation,
  setExtubationModal,
  setPostIntubationModal,
  checkCuffLeak,
  isCollapsed,
  setIsCollapsed,
  examineAirway,
  handlePocus,
  handleSetO2,
  setPreopModal,
  setMsmaidsModal,
  msmaidsComplete,
  performLarsonManeuver,
  examineNpoHistory
}) => {
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });
  const [extubateConfirm, setExtubateConfirm] = useState(false);
  const [showChecklists, setShowChecklists] = useState(false);
  const [o2Input, setO2Input] = useState({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });

  // Auto-open checklists if there is a tension pneumothorax or airway plug
  useEffect(() => {
    if (patient?.hasPneumothorax || patient?.isMucusPlugged) {
      setShowChecklists(true);
    }
  }, [patient?.hasPneumothorax, patient?.isMucusPlugged]);

  if (isCollapsed) {
    return (
      <div className="glass-panel glass-cyan p-3.5 flex items-center justify-between shrink-0 font-mono transition-all duration-300">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
          <Wind size={16} className={patient?.airwaySecured ? "text-emerald-400" : "text-amber-400"} />
          <span className="font-mono text-xs font-extrabold uppercase tracking-wide text-slate-100">Airway Panel</span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
            patient?.airwaySecured 
              ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-900/40 text-amber-300 animate-pulse'
          }`}>
            {patient?.airwaySecured ? 'Secured' : 'Unsecured'}
          </span>
        </div>
        <button 
          onClick={() => setIsCollapsed(false)} 
          className="text-[9px] text-cyan-400 hover:text-cyan-300 font-black bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-md transition-all font-mono shadow-[0_0_8px_rgba(34,211,238,0.2)] active:scale-95 cursor-pointer uppercase tracking-wider"
        >
          EXPAND
        </button>
      </div>
    );
  }

  const handlePlaceAirway = (id, size) => {
    // ATLS CRITICAL GUARD: Basilar Skull Fracture / Facial Trauma Contraindication
    if (id.includes('Nasopharyngeal') && patient?.trauma) {
      logEvent(`🚨 CRITICAL ERROR: Attempted NPA placement in severe facial/basilar skull trauma! The device breached the fractured cribriform plate and entered the cranial vault!`);
      setAirwayToolInput({ tool: null, size: '' });
      return;
    }
    optimizeAirway(`${id} (Size ${size})`);
    setAirwayToolInput({ tool: null, size: '' });
  };

  const handleJawThrust = () => {
    logEvent("Applied firm Jaw Thrust and Two-Handed Mask Seal. Upper airway soft tissue obstruction temporarily relieved.");
    setPatient(p => ({ ...p, bmvOptimized: true }));
  };

  const executeExtubation = () => {
    if (extubateConfirm) {
      handleExtubation();
      setExtubateConfirm(false);
    } else {
      logEvent("⚠️ CLINICAL PAUSE: Evaluating Extubation Criteria. Ensure TOF > 90%, spontaneous respiratory drive, and intact airway reflexes. Click EXTUBATE again to pull the tube.");
      setExtubateConfirm(true);
      setTimeout(() => setExtubateConfirm(false), 5500); // 5.5 second confirmation window
    }
  };

  const handleO2Submit = (id) => {
    if (handleSetO2) {
      handleSetO2(id, o2Input.flow, o2Input.fio2, o2Input.ipap, o2Input.epap, o2Input.rate); 
    }
    setO2Input({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });
  };

  const renderAdvancedO2Button = (id, label, type) => {
    const isActive = o2Input.device === id;
    return (
      <div className="flex flex-col gap-1 mb-1.5" key={id}>
        <button 
          onClick={() => setO2Input(isActive ? { device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' } : { device: id, flow: '', fio2: '', ipap: '', epap: '', rate: '' })}
          className={`p-2 rounded-lg text-xs text-left border transition-all glass-button ${isActive ? 'border-blue-400 text-blue-200 font-bold shadow-inner' : 'border-slate-800'}`}
        >
          {label}
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2 bg-slate-950/90 border border-blue-900/50 rounded-lg font-mono">
            {type === 'flow' && (
              <input autoFocus type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-blue-500" />
            )}
            {type === 'hfnc' && (
              <div className="flex gap-2">
                <input autoFocus type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
                <input type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
              </div>
            )}
            {(type === 'cpap' || type === 'bipap') && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input autoFocus type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-blue-500" />
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="EPAP/PEEP" value={o2Input.epap} onChange={(e) => setO2Input({...o2Input, epap: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
                  {type === 'bipap' && (
                    <input type="number" placeholder="IPAP" value={o2Input.ipap} onChange={(e) => setO2Input({...o2Input, ipap: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
                  )}
                </div>
                {type === 'bipap' && (
                  <input type="number" placeholder="Backup Rate (Optional)" value={o2Input.rate} onChange={(e) => setO2Input({...o2Input, rate: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-blue-500" />
                )}
              </div>
            )}
            <button onClick={() => handleO2Submit(id)} className="w-full glass-button glass-button-blue py-1 text-xs">APPLY</button>
          </div>
        )}
      </div>
    );
  };

  const renderAirwayToolButton = (id, label, hint, sizes) => {
    const isActive = airwayToolInput.tool === id;
    return (
      <div className="flex flex-col gap-1 mb-1.5" key={id}>
        <button 
          onClick={() => setAirwayToolInput(isActive ? { tool: null, size: '' } : { tool: id, size: sizes[0] })} 
          className={`p-2 rounded-lg text-xs text-left border transition-all glass-button ${isActive ? 'border-yellow-400 text-yellow-200 shadow-inner' : 'border-slate-800'}`}
        >
          <span>{label}</span> <span className="text-slate-500 text-[9px] font-mono float-right">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-2 p-2 bg-slate-950/80 border border-yellow-900/40 rounded-lg animate-in slide-in-from-top-1 font-mono">
            <select 
              value={airwayToolInput.size} 
              onChange={(e) => setAirwayToolInput({...airwayToolInput, size: e.target.value})} 
              className="w-2/3 bg-slate-900 text-xs text-white border border-slate-700 rounded-md p-1 outline-none font-mono"
            >
              {sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => handlePlaceAirway(id, airwayToolInput.size)} className="w-1/3 glass-button glass-button-cyan py-0.5 text-[10px]">PLACE</button>
          </div>
        )}
      </div>
    );
  };

  // Reusable Patient Positioner Dropdown
  const renderPositionDropdown = () => (
    <div className="flex flex-col gap-1 bg-slate-950/40 border border-white/5 p-2 rounded-xl shrink-0 font-mono text-[9px]">
      <span className="text-slate-500 font-bold uppercase tracking-wider">Patient Position</span>
      <select 
        value={patient?.position || 'Supine'} 
        onChange={(e) => {
          const pos = e.target.value;
          setPatient(p => ({ ...p, position: pos }));
          logEvent(`Position: ${pos}. Physiological alignment updated.`);
        }}
        className="w-full glass-input text-[10px] font-black text-cyan-300 outline-none rounded-lg p-1.5 cursor-pointer hover:border-cyan-500/80 transition font-mono bg-slate-950"
      >
        <option value="Supine">SUPINE (Baseline FRC)</option>
        <option value="Sniffing">SNIFFING (Aligns Axes)</option>
        <option value="Ramped">RAMPED (Optimizes FRC)</option>
        <option value="Trendelenburg">TRENDELENBURG (Venous Return / FRC drop)</option>
        <option value="Rev Trendelenburg">REVERSE TRENDELENBURG (Venous pooling)</option>
        <option value="Lithotomy">LITHOTOMY (Decreased FRC)</option>
        <option value="Lateral">LATERAL DECUBITUS (V/Q shift)</option>
        <option value="Prone">PRONE (Posterior recruitment)</option>
        <option value="Sitting">SITTING / BEACH CHAIR (FRC maximized)</option>
      </select>
    </div>
  );

  // Reusable Bedside Exams Dropdown
  const renderExamsDropdown = () => (
    <div className="flex flex-col gap-1 bg-slate-950/40 border border-white/5 p-2 rounded-xl shrink-0 font-mono text-[9px]">
      <span className="text-slate-500 font-bold uppercase tracking-wider">Perform Bedside Exam</span>
      <select 
        value="" 
        onChange={(e) => {
          const exam = e.target.value;
          if (exam === 'Airway') {
            if (examineAirway) examineAirway();
          } else {
            if (handlePocus) handlePocus(exam);
          }
        }}
        className="w-full glass-input text-[10px] font-black text-cyan-300 outline-none rounded-lg p-1.5 cursor-pointer hover:border-cyan-500/80 transition font-mono bg-slate-950"
      >
        <option value="" disabled>🔍 Select Bedside Exam...</option>
        <option value="Airway">Airway Assessment (Mallampati/Neck)</option>
        <option value="Cardiac (TTE)">Transthoracic Echocardiogram (TTE POCUS)</option>
        <option value="Lung">Lung Ultrasound (Lung POCUS)</option>
        <option value="Gastric">Gastric Ultrasound (Gastric POCUS)</option>
      </select>
    </div>
  );

  // Reusable Checklists & Maneuvers Accordion Card
  const renderChecklistsAccordion = () => (
    <div className="border border-white/5 bg-slate-950/30 rounded-xl overflow-hidden shrink-0 font-mono">
      <button 
        onClick={() => setShowChecklists(!showChecklists)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-950/40 border-b border-white/5 font-mono text-[9px] font-black text-cyan-400 uppercase tracking-wider hover:bg-slate-950/60 transition-all"
      >
        <span className="flex items-center gap-1.5"><ShieldAlert size={12}/> Checklists & Maneuvers</span>
        <span>{showChecklists ? '▲' : '▼'}</span>
      </button>
      {showChecklists && (
        <div className="p-2 flex flex-col gap-1.5 font-mono text-[9px] bg-slate-950/10">
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => { if (setPreopModal) setPreopModal(true); }} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-350 font-bold hover:bg-white/5 text-center">📋 PRE-OP EVALS</button>
            <button onClick={() => { if (setMsmaidsModal) setMsmaidsModal(true); }} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-355 font-bold hover:bg-white/5 text-center">🛠️ MSMAIDS CHECK</button>
            <button onClick={() => { if (setPostIntubationModal) setPostIntubationModal(true); }} disabled={!patient?.airwaySecured} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-350 font-bold disabled:opacity-20 disabled:pointer-events-none hover:bg-white/5 text-center">🔄 POST-INTUB</button>
            <button onClick={() => { if (setExtubationModal) setExtubationModal(true); }} disabled={!patient?.airwaySecured} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-350 font-bold disabled:opacity-20 disabled:pointer-events-none hover:bg-white/5 text-center">💨 EXTUBATION</button>
          </div>
          <button onClick={() => { if (performLarsonManeuver) performLarsonManeuver(); }} className="w-full bg-slate-950 border border-white/5 p-1 rounded-lg text-slate-300 font-bold hover:bg-white/5 text-center">✊ Perform Larson's Maneuver</button>
          <button onClick={() => { if (examineNpoHistory) examineNpoHistory(); }} className="w-full bg-slate-950 border border-white/5 p-1 rounded-lg text-slate-300 font-bold hover:bg-white/5 text-center">📋 Review NPO History</button>
          <button 
            onClick={() => {
              setPatient(p => ({ ...p, isMucusPlugged: false, ciliaryAtelectasisAccumulation: 0.0 }));
              logEvent("✅ SUCCESS: Deep bronchial suctioning (airway toilet) performed! Removed mucous plug.");
            }} 
            className="w-full bg-slate-950 border border-white/5 p-1 rounded-lg text-slate-300 font-bold hover:bg-white/5 text-center"
          >
            🧼 Bronchial Suctioning (Toilet)
          </button>
          <button 
            onClick={() => {
              setPatient(p => ({ ...p, hasPneumothorax: false }));
              logEvent("✅ SUCCESS: Needle decompression performed! Released trapped pleural air, resolving tension pneumothorax.");
            }} 
            disabled={!patient?.hasPneumothorax}
            className="w-full bg-rose-950/20 border border-rose-900/40 p-1 rounded-lg text-rose-300 font-bold disabled:opacity-20 disabled:pointer-events-none hover:bg-rose-900/20 text-center animate-pulse"
          >
            📌 Needle Decompression
          </button>
        </div>
      )}
    </div>
  );

  // Render Secured Airway Dashboard
  if (patient?.airwaySecured) {
    return (
      <div className="glass-panel glass-cyan p-4 flex flex-col gap-3.5 flex-1 min-h-[250px] overflow-y-auto custom-scrollbar">
        {/* Header Minimize Row */}
        <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0 font-mono">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wind size={12} className="text-cyan-400 animate-pulse" /> Airway Controls
          </span>
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="text-[8px] text-slate-400 hover:text-slate-200 font-bold bg-slate-950/60 border border-white/5 px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer"
          >
            MINIMIZE
          </button>
        </div>

        {/* Status Bezel */}
        <div className="bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-2xl flex flex-col gap-1 shadow-inner shrink-0 font-mono text-center">
          <div className="flex items-center justify-center gap-2 text-cyan-400 font-black tracking-wider text-xs animate-pulse">
            <Wind size={16} /> AIRWAY SECURED
          </div>
          <span className="text-[9px] text-slate-400">Position: {patient?.tubePosition?.replace('_', ' ') || 'trachea'}</span>
        </div>

        {/* Positioner & Exams Dropdowns */}
        {renderPositionDropdown()}
        {renderExamsDropdown()}

        {/* Checklists & Protocols */}
        {renderChecklistsAccordion()}

        {/* Secured Airway Actions Checklist */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1">Airway Maintenance</h4>
          
          <button 
            onClick={() => { handleSuction(); logEvent("Performed deep in-line tracheal suctioning. Cleared ETT of mucous plugs."); }} 
            className="w-full glass-button hover:bg-slate-800/40 p-2 text-left border text-xs flex items-center justify-between gap-2 overflow-hidden font-mono"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Droplet size={14} className="text-blue-400 shrink-0"/> 
              <span className="truncate">In-Line Tracheal Suction</span>
            </span>
            <span className="text-[9px] text-slate-500 font-mono shrink-0">Yankauer</span>
          </button>

          <button 
            onClick={() => setTubeConfirmModal({ show: true, result: '' })} 
            className="w-full glass-button glass-button-cyan hover:bg-slate-850 p-2 text-left border text-xs flex items-center justify-between gap-2 overflow-hidden font-mono"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Stethoscope size={14} className="text-cyan-400 shrink-0"/> 
              <span className="truncate">Auscultate Breath Sounds</span>
            </span>
            <span className="text-[9px] text-cyan-400 font-mono font-bold shrink-0">Lungs</span>
          </button>

          <button 
            onClick={() => { if (checkCuffLeak) checkCuffLeak(); }} 
            className="w-full glass-button glass-button-cyan p-2 text-left border text-xs flex items-center justify-between gap-2 overflow-hidden font-mono"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Sliders size={14} className="text-cyan-400 shrink-0"/> 
              <span className="truncate">Perform Cuff Leak Test</span>
            </span>
            <span className="text-[9px] text-cyan-400 font-mono font-bold shrink-0">ETT</span>
          </button>
        </div>

        {/* Emergency Extubation trigger at bottom */}
        <div className="shrink-0 w-full mt-auto border-t border-white/5 pt-3">
          <button 
            onClick={executeExtubation} 
            className={`w-full p-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              extubateConfirm 
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                : 'glass-button-rose border-rose-900 text-rose-300 hover:bg-rose-950/40'
            }`}
          >
            {extubateConfirm ? <><AlertTriangle size={14} className="inline mr-1"/> CONFIRM EXTUBATION</> : 'EXTUBATE PATIENT'}
          </button>
        </div>
      </div>
    );
  }

  // Render Unsecured Airway Dashboard
  return (
    <div className="glass-panel glass-cyan p-4 flex flex-col gap-3.5 flex-1 min-h-[250px] overflow-y-auto custom-scrollbar">
      {/* Header Minimize Row */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0 font-mono">
        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
          <Wind size={12} className="text-amber-400" /> Airway Controls
        </span>
        <button 
          onClick={() => setIsCollapsed(true)} 
          className="text-[8px] text-slate-400 hover:text-slate-200 font-bold bg-slate-950/60 border border-white/5 px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer"
        >
          MINIMIZE
        </button>
      </div>

      {/* Airway Status Bezel */}
      <div className={`border p-3 rounded-2xl flex flex-col gap-1 shadow-inner shrink-0 font-mono text-center ${
        patient?.airwayBlood 
          ? 'bg-red-950/20 border-red-800/40 text-red-400' 
          : patient?.ventilationStatus === 'failed' 
            ? 'bg-orange-950/20 border-orange-850/40 text-orange-400 animate-pulse'
            : 'bg-slate-950/30 border-white/5 text-slate-300'
      }`}>
        <div className="font-black tracking-wider text-xs flex items-center justify-center gap-1.5">
          {patient?.airwayBlood ? (
            <>⚠️ AIRWAY COMPROMISED</>
          ) : patient?.ventilationStatus === 'failed' ? (
            <>🚨 FAILED VENTILATION</>
          ) : (
            <>🌬️ SPONTANEOUS DRIVE</>
          )}
        </div>
        <span className="text-[9px] text-slate-500">
          {patient?.airwayBlood ? 'Active blood/secretions obscuring pharynx' : 'Ventilation patency is critical'}
        </span>
      </div>

      {/* Positioning & Bedside Exams */}
      {renderPositionDropdown()}
      {renderExamsDropdown()}

      {/* Oxygen Support Selector */}
      <div className="flex flex-col gap-1 bg-slate-950/40 border border-white/5 p-2 rounded-xl shrink-0 font-mono text-[9px]">
        <span className="text-slate-500 font-bold uppercase tracking-wider">Non-Invasive O2 Support</span>
        <select
          value={patient?.o2Device || 'Room Air'}
          onChange={(e) => {
            const dev = e.target.value;
            if (dev === 'Room Air') {
              if (handleSetO2) handleSetO2('Room Air');
            } else {
              setO2Input({ device: dev, flow: '', fio2: '', ipap: '', epap: '', rate: '' });
            }
          }}
          className="w-full glass-input text-[10px] font-black text-cyan-300 outline-none rounded-lg p-1.5 cursor-pointer hover:border-cyan-500/80 transition font-mono bg-slate-950"
        >
          <option value="Room Air">Room Air (No support)</option>
          <option value="Bag-Mask Valve (BMV)">Bag-Mask Valve (100% O2)</option>
          <option value="Nasal Cannula">Nasal Cannula (1-15 L/min)</option>
          <option value="Simple Face Mask">Simple Face Mask (5-10 L/min)</option>
          <option value="Non-Rebreather Mask (NRB)">Non-Rebreather Mask (15 L/min, 100%)</option>
          <option value="High Flow Nasal Cannula (HFNC)">High Flow Nasal Cannula (HFNC)</option>
          <option value="CPAP">CPAP (PEEP / FiO2)</option>
          <option value="BiPAP">BiPAP (IPAP / EPAP / FiO2)</option>
        </select>
        
        {/* Render active device details & inputs */}
        {o2Input.device && o2Input.device !== 'Room Air' && (
          <div className="flex flex-col gap-2 p-2 bg-slate-950/80 border border-cyan-900/30 rounded-lg font-mono text-xs mt-1">
            {o2Input.device === 'Nasal Cannula' && renderAdvancedO2Button('Nasal Cannula', 'Configure Cannula (1-15 L/min)', 'flow')}
            {o2Input.device === 'Simple Face Mask' && renderAdvancedO2Button('Simple Face Mask', 'Configure Mask (5-10 L/min)', 'flow')}
            {o2Input.device === 'Bag-Mask Valve (BMV)' && (
              <button onClick={() => handleO2Submit('Bag-Mask Valve (BMV)')} className="w-full glass-button glass-button-cyan py-1 text-[9px] font-black font-mono">APPLY 100% BMV</button>
            )}
            {o2Input.device === 'Non-Rebreather Mask (NRB)' && (
              <button onClick={() => handleO2Submit('Non-Rebreather Mask (NRB)')} className="w-full glass-button glass-button-cyan py-1 text-[9px] font-black font-mono">APPLY 100% NRB</button>
            )}
            {o2Input.device === 'High Flow Nasal Cannula (HFNC)' && renderAdvancedO2Button('High Flow Nasal Cannula (HFNC)', 'Configure HFNC', 'hfnc')}
            {o2Input.device === 'CPAP' && renderAdvancedO2Button('CPAP', 'Configure CPAP', 'cpap')}
            {o2Input.device === 'BiPAP' && renderAdvancedO2Button('BiPAP', 'Configure BiPAP', 'bipap')}
          </div>
        )}
        
        {patient?.o2Device && patient.o2Device !== 'Room Air' && (
          <div className="bg-cyan-950/30 border border-cyan-800/40 p-2 rounded-lg text-[9px] text-cyan-300 font-mono flex justify-between items-center mt-1.5">
            <span className="truncate">Active: {patient.o2Device} {patient.o2Flow ? `(${patient.o2Flow} L/min)` : ''} {patient.fio2 ? `(${patient.fio2}% FiO2)` : ''}</span>
            <button onClick={() => { if (handleSetO2) handleSetO2('Room Air'); }} className="text-red-400 hover:text-red-300 font-bold uppercase tracking-widest text-[8px] bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded ml-2 shrink-0">Remove</button>
          </div>
        )}
      </div>

      {/* Checklists & Protocols */}
      {renderChecklistsAccordion()}

      {/* Control Actions Scroll Area */}
      <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {/* Support & Suction */}
        <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1">1. Airway Patency</h4>
        <div className="flex gap-2 font-mono">
          <button onClick={handleJawThrust} className="flex-1 p-2 text-[10px] rounded-lg border glass-button border-slate-800">
            JAW THRUST
          </button>
          <button 
            onClick={handleSuction} 
            className={`flex-1 p-2 text-[10px] rounded-lg border font-bold transition-all ${
              patient?.airwayBlood 
                ? 'glass-button-rose text-red-200 border-red-500 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse' 
                : 'glass-button border-slate-800'
            }`}
          >
            <Droplet size={12} className="inline mr-1 text-blue-400"/> YANKAUER
          </button>
        </div>

        <button 
          onClick={() => pushMed('Topical Lidocaine Spray', 1)} 
          className={`w-full p-2 rounded-lg border font-bold transition-all text-xs font-mono ${
            patient?.isTopicalized 
              ? 'glass-button-emerald text-green-200 border-green-800/40' 
              : 'glass-button border-slate-800'
          }`}
        >
          {patient?.isTopicalized ? '✓ AIRWAY TOPICALIZED' : 'SPRAY LIDOCAINE 4%'}
        </button>

        {/* Placing Airways */}
        <div className="mt-1">
          {renderAirwayToolButton('Oropharyngeal Airway (OPA)', 'Place OPA (Bite Block)', 'Contra: Awake reflexes', ['80mm', '90mm', '100mm'])}
          {renderAirwayToolButton('Nasopharyngeal Airway (NPA)', 'Place NPA (Nasal Trumpet)', 'Contra: Basilar trauma', ['28Fr', '30Fr', '32Fr'])}
          {renderAirwayToolButton('Laryngeal Mask Airway (LMA)', 'Place LMA (Supraglottic Rescue)', 'Airway Protection', ['Size 3', 'Size 4', 'Size 5'])}
        </div>

        {/* Surgical Rescue */}
        <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1 mt-3">2. Laryngoscopy & Intubation</h4>
        <button 
          onClick={() => setSetupModal(true)} 
          className="w-full bg-green-950/20 hover:bg-green-900/30 border border-green-600/40 p-3 rounded-xl font-black text-green-400 text-xs shadow-[0_0_12px_rgba(34,197,94,0.15)] transition-all active:scale-97 uppercase tracking-wider font-mono"
        >
          PREPARE INTUBATION EQUIPMENT
        </button>

        <button 
          onClick={handleSurgicalCric} 
          className="w-full bg-red-950/20 hover:bg-red-900/30 border border-red-800/30 p-2.5 rounded-xl font-black text-red-400 text-[10px] uppercase tracking-wider font-mono mt-1"
        >
          SURGICAL CRICOTHYROIDOTOMY
        </button>
      </div>
    </div>
  );
};