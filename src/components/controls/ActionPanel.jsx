import React, { useState } from 'react';
import { Zap, Eye, Syringe, Search, Wind, Activity } from 'lucide-react';

export const ActionPanel = ({ patient, setPatient, defibSettings, setDefibSettings, toggleCPR, deliverShock, examineAirway, handlePocus, setAccessModal, generateLab, handleSetO2, logEvent, surgicalPhase, setSurgicalPhase, toggleBis, toggleTof, checkRhythm, time, formatTime }) => {
  
  const [o2Input, setO2Input] = useState({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });

  const renderAdvancedO2Button = (id, label, type) => {
    const isActive = o2Input.device === id;
    return (
      <div className="flex flex-col gap-1">
        <button onClick={() => setO2Input(isActive ? { device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' } : { device: id, flow: '', fio2: '', ipap: '', epap: '', rate: '' })}
          className={`bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border transition-all ${isActive ? 'border-blue-400' : 'border-transparent'}`}>
          {label}
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-blue-900 rounded animate-in slide-in-from-top-1">
            {type === 'flow' && (
              <input type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-full" />
            )}
            {type === 'hfnc' && (
              <div className="flex gap-2">
                <input type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
                <input type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
              </div>
            )}
            {(type === 'cpap' || type === 'bipap') && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-full" />
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="EPAP/PEEP" value={o2Input.epap} onChange={(e) => setO2Input({...o2Input, epap: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
                  {type === 'bipap' && (
                    <input type="number" placeholder="IPAP" value={o2Input.ipap} onChange={(e) => setO2Input({...o2Input, ipap: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
                  )}
                </div>
                {type === 'bipap' && (
                  <input type="number" placeholder="Backup Rate (Optional)" value={o2Input.rate} onChange={(e) => setO2Input({...o2Input, rate: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-full" />
                )}
              </div>
            )}
            <button onClick={() => { handleSetO2(id, o2Input.flow, o2Input.fio2, o2Input.ipap, o2Input.epap, o2Input.rate); setO2Input({device: null}); }} className="w-full bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold text-white py-1">APPLY</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px]">
      
      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center gap-2"><Activity size={14}/> Defibrillator & CPR</h3>
      
      {(patient.cprActive || patient.isArrest) && (
        <div className="bg-red-950/50 border border-red-800 p-2 rounded mt-1 flex justify-between items-center shadow-inner">
           <span className="text-red-400 font-bold text-xs animate-pulse">
              {patient.isArrest ? 'CODE BLUE ACTIVE' : 'CPR ACTIVE'}
           </span>
           <span className="text-white font-mono font-black text-lg">
              {formatTime(time - (patient.isArrest ? (patient.codeStartTime ?? time) : (patient.cprStartTime ?? time)))}
           </span>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-1">
        <div className="flex gap-2">
            <button onClick={toggleCPR} className={`flex-1 p-2 rounded text-xs font-bold border transition shadow-lg ${patient.cprActive ? 'bg-red-600 text-white animate-pulse border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-red-900/40 hover:bg-red-800/60 text-red-200 border-red-800'}`}>
              {patient.cprActive ? 'STOP COMPRESSIONS' : 'START COMPRESSIONS'}
            </button>
            <button onClick={checkRhythm} disabled={!patient.cprActive && !patient.isArrest} className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 text-slate-300 p-2 rounded text-xs font-bold transition flex items-center justify-center gap-1">
              <Eye size={12}/> CHECK RHYTHM
            </button>
        </div>
        <div className="flex gap-2">
          <select value={defibSettings.joules} onChange={(e) => setDefibSettings({...defibSettings, joules: parseInt(e.target.value)})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 flex-1">
            <option value={50}>50 Joules</option>
            <option value={100}>100 Joules</option>
            <option value={150}>150 Joules</option>
            <option value={200}>200 Joules (Max)</option>
          </select>
          <button onClick={() => setDefibSettings({...defibSettings, sync: !defibSettings.sync})} className={`px-2 py-1 rounded text-xs font-bold border transition ${defibSettings.sync ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            SYNC
          </button>
          <button onClick={() => deliverShock(defibSettings.joules, defibSettings.sync)} className="bg-orange-600 hover:bg-orange-500 border border-orange-500 px-3 py-1 rounded text-xs font-bold text-white">
            SHOCK
          </button>
        </div>
      </div>

      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Zap size={14}/> Surgical Timeline</h3>
      <div className="flex flex-wrap justify-center gap-1.5 mt-1">
        {['Pre-Op', 'Induction', 'Incision', 'Maintenance', 'Emergence'].map(phase => (
          <button 
             key={phase} 
             onClick={() => setSurgicalPhase(phase)} 
             className={`flex-1 min-w-[30%] px-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${surgicalPhase === phase ? 'bg-cyan-700 text-white ring-1 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
             {phase}
          </button>
        ))}
      </div>

      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Eye size={14}/> Diagnostics</h3>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button onClick={examineAirway} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Airway Exam</button>
        <button onClick={() => handlePocus('Cardiac (TTE)')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">TTE POCUS</button>
        <button onClick={() => handlePocus('Lung')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Lung POCUS</button>
        <button onClick={() => handlePocus('Gastric')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Gastric POCUS</button>
      </div>

      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Activity size={14}/> Neuro & NMB Monitors</h3>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button onClick={toggleBis} className={`p-2 rounded text-xs text-left border transition-all font-bold tracking-wider ${patient.hasBisMonitor ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
          {patient.hasBisMonitor ? 'BIS ATTACHED' : 'ATTACH BIS'}
        </button>
        <button onClick={toggleTof} className={`p-2 rounded text-xs text-left border transition-all font-bold tracking-wider ${patient.hasTofMonitor ? 'bg-orange-900/40 border-orange-500 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
          {patient.hasTofMonitor ? 'TOF ATTACHED' : 'ATTACH TOF'}
        </button>
      </div>

      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Syringe size={14}/> Access & Labs</h3>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button onClick={() => setAccessModal({show: true, category: 'Peripheral IV'})} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Place PIV</button>
        <button onClick={() => setAccessModal({show: true, category: 'Central Line'})} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Central Line</button>
        <button onClick={() => setAccessModal({show: true, category: 'Intraosseous (IO)'})} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Place IO</button>
        <button onClick={() => setAccessModal({show: true, category: 'Arterial Line'})} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Arterial Line</button>
        <button onClick={() => generateLab('ABG')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 mt-2">Order ABG</button>
        <button onClick={() => generateLab('VBG')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 mt-2">Order VBG</button>
        <button onClick={() => generateLab('CBC')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order CBC</button>
        <button onClick={() => generateLab('CMP')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order CMP</button>
        <button onClick={() => generateLab('TEG')} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 col-span-2 text-center">Order TEG / Coags</button>
      </div>

      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Wind size={14}/> Oxygenation</h3>
      <div className="flex flex-col gap-2 mt-1">
        {renderAdvancedO2Button('Nasal Cannula', 'Nasal Cannula (1-15L)', 'flow')}
        {renderAdvancedO2Button('Simple Face Mask', 'Simple Face Mask (5-10L)', 'flow')}
        {renderAdvancedO2Button('Non-Rebreather Mask (NRB)', 'Non-Rebreather Mask (15L, 100% FiO2)', 'fixed')}
        {renderAdvancedO2Button('High Flow Nasal Cannula (HFNC)', 'High Flow Nasal Cannula (Flow / FiO2)', 'hfnc')}
        {renderAdvancedO2Button('CPAP', 'CPAP (Continuous Positive Airway Pressure)', 'cpap')}
        {renderAdvancedO2Button('BiPAP', 'BiPAP (Bilevel Positive Airway Pressure)', 'bipap')}
        <button onClick={() => handleSetO2('Room Air')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-600 text-slate-300 font-bold mt-2">REMOVE O2 DEVICE (ROOM AIR)</button>
      </div>
    </div>
  );
};