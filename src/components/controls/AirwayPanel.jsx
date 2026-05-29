import React, { useState } from 'react';
import { Wind, Stethoscope, AlertTriangle, Droplet, Zap, Sliders, CheckSquare, RefreshCw } from 'lucide-react';

export const AirwayPanel = ({ 
  patient, 
  setPatient, 
  handleSuction, 
  optimizeAirway, 
  pushMed, 
  setViewModal, 
  setSetupModal, 
  setTubeConfirmModal, 
  logEvent, 
  handleSurgicalCric, 
  handleExtubation,
  setExtubationModal,
  setPostIntubationModal,
  checkCuffLeak,
  isCollapsed,
  setIsCollapsed
}) => {
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });
  const [extubateConfirm, setExtubateConfirm] = useState(false);
  const [o2Input, setO2Input] = useState({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });

  if (isCollapsed) {
    return (
      <div className="glass-panel glass-cyan p-3.5 flex items-center justify-between shrink-0 font-mono transition-all duration-300">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
          <Wind size={16} className={patient.airwaySecured ? "text-emerald-400" : "text-amber-400"} />
          <span className="font-mono text-xs font-extrabold uppercase tracking-wide text-slate-100">Airway Panel</span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
            patient.airwaySecured 
              ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-900/40 text-amber-300 animate-pulse'
          }`}>
            {patient.airwaySecured ? 'Secured' : 'Unsecured'}
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
    if (id.includes('Nasopharyngeal') && patient.trauma) {
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
            <button onClick={() => handlePlaceAirway(id, airwayToolInput.size)} className="w-1/3 glass-button glass-button-amber py-0.5 text-[10px]">PLACE</button>
          </div>
        )}
      </div>
    );
  };

  // Render Secured Airway Dashboard
  if (patient.airwaySecured) {
    return (
      <div className="glass-panel glass-cyan p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Header Minimize Row */}
        <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0 font-mono">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wind size={12} className="text-emerald-400" /> Airway Controls
          </span>
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="text-[8px] text-slate-400 hover:text-slate-200 font-bold bg-slate-950/60 border border-white/5 px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer"
          >
            MINIMIZE
          </button>
        </div>
        {/* Status Bezel */}
        <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-2xl flex flex-col gap-1 shadow-inner shrink-0 font-mono text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-black tracking-wider text-xs animate-pulse">
            <Wind size={16} /> AIRWAY SECURED
          </div>
          <span className="text-[9px] text-slate-400">Position: {patient.tubePosition?.replace('_', ' ') || 'trachea'}</span>
        </div>

        {/* Secured Airway Actions Checklist */}
        <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1">Airway Maintenance</h4>
          
          <button 
            onClick={() => { handleSuction(); logEvent("Performed deep in-line tracheal suctioning. Cleared ETT of mucous plugs."); }} 
            className="w-full glass-button hover:bg-slate-800/40 p-2.5 text-left border text-xs flex items-center justify-between"
          >
            <span><Droplet size={14} className="inline mr-2 text-blue-400"/> In-Line Tracheal Suction</span>
            <span className="text-[9px] text-slate-500 font-mono">Yankauer</span>
          </button>

          <button 
            onClick={() => setTubeConfirmModal({ show: true, result: '' })} 
            className="w-full glass-button glass-button-cyan hover:bg-slate-850 p-2.5 text-left border text-xs flex items-center justify-between"
          >
            <span><Stethoscope size={14} className="inline mr-2"/> Auscultate Breath Sounds</span>
            <span className="text-[9px] text-cyan-400 font-mono font-bold">Lungs</span>
          </button>

          <button 
            onClick={() => { if (checkCuffLeak) checkCuffLeak(); }} 
            className="w-full glass-button glass-button-purple p-2.5 text-left border text-xs flex items-center justify-between"
          >
            <span><Sliders size={14} className="inline mr-2"/> Perform Cuff Leak Test</span>
            <span className="text-[9px] text-purple-400 font-mono font-bold">ETT</span>
          </button>

          {/* Quick Checklist Links */}
          <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1 mt-3">Clinical Protocols</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => { if (setPostIntubationModal) setPostIntubationModal(true); }}
              className="bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-900/40 p-2 rounded-lg text-[10px] text-indigo-300 font-bold uppercase tracking-wider text-center font-mono"
            >
              📋 Post-Intub A's
            </button>
            <button 
              onClick={() => { if (setExtubationModal) setExtubationModal(true); }}
              className="bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/40 p-2 rounded-lg text-[10px] text-rose-300 font-bold uppercase tracking-wider text-center font-mono"
            >
              💨 Extubation Check
            </button>
          </div>
        </div>

        {/* Emergency Extubation trigger at bottom */}
        <div className="shrink-0 w-full mt-auto border-t border-white/5 pt-3">
          <button 
            onClick={executeExtubation} 
            className={`w-full p-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-300 ${
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
    <div className="glass-panel glass-cyan p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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
        patient.airwayBlood 
          ? 'bg-red-950/20 border-red-800/40 text-red-400' 
          : patient.ventilationStatus === 'failed' 
            ? 'bg-orange-950/20 border-orange-850/40 text-orange-400 animate-pulse'
            : 'bg-slate-950/30 border-white/5 text-slate-300'
      }`}>
        <div className="font-black tracking-wider text-xs flex items-center justify-center gap-1.5">
          {patient.airwayBlood ? (
            <>⚠️ AIRWAY COMPROMISED</>
          ) : patient.ventilationStatus === 'failed' ? (
            <>🚨 FAILED VENTILATION</>
          ) : (
            <>🌬️ SPONTANEOUS DRIVE</>
          )}
        </div>
        <span className="text-[9px] text-slate-500">
          {patient.airwayBlood ? 'Active blood/secretions obscuring pharynx' : 'Ventilation patency is critical'}
        </span>
      </div>

      {/* Control Actions Scroll Area */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {/* Support & Suction */}
        <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1">1. Airway Patency</h4>
        <div className="flex gap-2 font-mono">
          <button onClick={handleJawThrust} className="flex-1 p-2 text-[10px] rounded-lg border glass-button border-slate-800">
            JAW THRUST
          </button>
          <button 
            onClick={handleSuction} 
            className={`flex-1 p-2 text-[10px] rounded-lg border font-bold transition-all ${
              patient.airwayBlood 
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
            patient.isTopicalized 
              ? 'glass-button-emerald text-green-200 border-green-800/40' 
              : 'glass-button border-slate-800'
          }`}
        >
          {patient.isTopicalized ? '✓ AIRWAY TOPICALIZED' : 'SPRAY LIDOCAINE 4%'}
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