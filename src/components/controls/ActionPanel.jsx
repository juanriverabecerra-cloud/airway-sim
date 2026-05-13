import React, { useState } from 'react';
import { Zap, Eye, Syringe, Search, Wind } from 'lucide-react';

export const ActionPanel = ({ patient, setPatient, defibSettings, setDefibSettings, toggleCPR, deliverShock, examineAirway, handlePocus, setAccessModal, generateLab, handleSetO2, logEvent, surgicalPhase, setSurgicalPhase }) => {
  
  // Local state to handle the granular O2 input fields before applying them
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
          <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-blue-900 rounded animate-in slide-in-from-top-1 duration-200">
            <div className="flex gap-1">
              {(type === 'flow' || type === 'hfnc') && <input type="number" placeholder="Flow (LPM)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={o2Input.flow} onChange={(e) => setO2Input({ ...o2Input, flow: e.target.value })} />}
              {(type === 'hfnc' || type === 'cpap' || type === 'bipap') && <input type="number" placeholder="FiO2 (%)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={o2Input.fio2} onChange={(e) => setO2Input({ ...o2Input, fio2: e.target.value })} />}
            </div>
            {type === 'cpap' && (
              <div className="flex gap-1">
                <input type="number" placeholder="CPAP / PEEP (cmH2O)" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={o2Input.epap} onChange={(e) => setO2Input({ ...o2Input, epap: e.target.value })} />
              </div>
            )}
            {type === 'bipap' && (
              <div className="flex gap-1">
                <input type="number" placeholder="IPAP" className="w-1/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={o2Input.ipap} onChange={(e) => setO2Input({ ...o2Input, ipap: e.target.value })} />
                <input type="number" placeholder="EPAP" className="w-1/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={o2Input.epap} onChange={(e) => setO2Input({ ...o2Input, epap: e.target.value })} />
                <input type="number" placeholder="Rate" className="w-1/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={o2Input.rate} onChange={(e) => setO2Input({ ...o2Input, rate: e.target.value })} />
              </div>
            )}
            <button onClick={() => {
                if (type === 'fixed') handleSetO2(id, 15, 100);
                else handleSetO2(id, o2Input.flow, o2Input.fio2, o2Input.ipap, o2Input.epap, o2Input.rate);
                setO2Input({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });
            }} className="w-full bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs font-bold text-white transition-colors">APPLY OXYGENATION</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px]">
      
      {/* SURGICAL TIMELINE MODULE */}
      <div className="border-2 border-slate-700 bg-slate-900/80 rounded-xl p-3 shadow-inner">
        <h3 className="font-bold uppercase text-slate-400 mb-2 text-[10px] tracking-widest text-center">Surgical Timeline</h3>
        <div className="flex justify-between items-center gap-1 relative">
           <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-800 -z-10 transform -translate-y-1/2 rounded"></div>
           {['Pre-Op', 'Induction', 'Incision', 'Maintenance', 'Emergence'].map((phase) => {
             const isActive = surgicalPhase === phase;
             const phaseColors = {
               'Pre-Op': 'bg-slate-700 text-slate-300',
               'Induction': 'bg-purple-600 text-white',
               'Incision': 'bg-red-600 text-white animate-pulse',
               'Maintenance': 'bg-blue-600 text-white',
               'Emergence': 'bg-green-600 text-white'
             };
             return (
               <button
                 key={phase}
                 onClick={() => {
                   setSurgicalPhase(phase);
                   logEvent(`Surgeon declared Phase: ${phase}`);
                 }}
                 className={`text-[9px] md:text-xs font-bold px-2 py-1 md:py-2 rounded-lg border-2 transition-all ${isActive ? `${phaseColors[phase]} border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110 z-10` : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
               >
                 {phase}
               </button>
             );
           })}
        </div>
      </div>

      {/* DEFIBRILLATOR / ACLS MODULE */}
      <div className={`border-2 rounded-xl p-3 mb-2 ${patient.isArrest ? 'bg-red-950/50 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-slate-950 border-slate-800'}`}>
          <h3 className={`font-bold uppercase flex items-center gap-2 mb-2 ${patient.isArrest ? 'text-red-500' : 'text-slate-500'}`}><Zap size={16}/> Defibrillator / ACLS</h3>
          <div className="flex gap-2 mb-2">
              <button onClick={toggleCPR} className={`flex-1 font-bold rounded p-2 text-xs border ${patient.cprActive ? 'bg-green-600 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>{patient.cprActive ? 'STOP CPR' : 'START CPR'}</button>
              <button onClick={() => setPatient(p => ({...p, rhythmAnalyzed: true}))} className="flex-1 bg-blue-900/50 border border-blue-700 text-blue-200 hover:bg-blue-800 rounded p-2 text-xs font-bold transition">Analyze Rhythm</button>
          </div>
          {patient.rhythmAnalyzed && (
              <div className="bg-black p-2 rounded text-center text-xs font-mono text-green-400 mb-2 border border-slate-800 flex justify-center items-center">
                 RHYTHM: {patient.cardiacRhythm.toUpperCase()}
                 {(patient.cardiacRhythm === 'vfib' || patient.cardiacRhythm === 'vtach') ? <span className="text-red-500 ml-2 animate-pulse font-bold bg-red-950/50 px-1 rounded">SHOCK ADVISE</span> : <span className="text-slate-500 ml-2 bg-slate-900 px-1 rounded">NO SHOCK</span>}
              </div>
          )}
          <div className="flex gap-2 items-center bg-slate-900/50 p-2 rounded border border-slate-800">
              <div className="flex flex-col w-1/3">
                  <span className="text-[9px] text-slate-500 uppercase font-bold text-center">Energy (J)</span>
                  <select value={defibSettings.joules} onChange={e => setDefibSettings(s => ({...s, joules: parseInt(e.target.value)}))} className="bg-transparent text-white font-black text-center outline-none">
                      <option value="120">120J</option><option value="150">150J</option><option value="200">200J</option>
                  </select>
              </div>
              <div className="flex items-center gap-1 w-1/3 justify-center">
                  <input type="checkbox" checked={defibSettings.sync} onChange={e => setDefibSettings(s => ({...s, sync: e.target.checked}))} className="accent-yellow-500"/>
                  <span className="text-[9px] text-yellow-500 font-bold uppercase cursor-pointer" onClick={() => setDefibSettings(s => ({...s, sync: !s.sync}))}>Sync</span>
              </div>
              <button onClick={() => deliverShock(defibSettings.joules, defibSettings.sync)} className="w-1/3 bg-red-600 hover:bg-red-500 text-white font-black rounded p-2 text-xs shadow-[0_0_15px_rgba(220,38,38,0.6)] flex items-center justify-center transition"><Zap size={14}/></button>
          </div>
      </div>

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

      <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Search size={14}/> Diagnostics & Monitoring</h3>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => {logEvent("Applied BIS Monitor."); setPatient(p => ({...p, hasBisMonitor: true}))}} disabled={patient.hasBisMonitor} className="bg-purple-900/40 hover:bg-purple-800/60 disabled:opacity-50 p-2 rounded text-[11px] text-left text-purple-200 border border-purple-800 transition">Apply BIS Monitor</button>
        <button onClick={() => {logEvent("Applied TOF Monitor."); setPatient(p => ({...p, hasTofMonitor: true}))}} disabled={patient.hasTofMonitor} className="bg-orange-900/40 hover:bg-orange-800/60 disabled:opacity-50 p-2 rounded text-[11px] text-left text-orange-200 border border-orange-800 transition">Apply TOF Monitor</button>
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
  );
};