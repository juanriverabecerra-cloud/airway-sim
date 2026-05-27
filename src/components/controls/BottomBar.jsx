import React from 'react';
import { INHALATIONAL_AGENTS } from '../../engine/Pharmacology';

export const BottomBar = ({ gasSettings, setGasSettings, ventSettings, setVentSettings, patient }) => {
  // If the airway is not secured, the controls hide themselves.
  if (!patient.airwaySecured) return null;

  // === PHYSIOLOGICAL STOICHIOMETRY ===
  const totalFGF = gasSettings.o2Flow + gasSettings.airFlow + gasSettings.n2oFlow;
  // Air is ~21% oxygen.
  const deliveredFiO2 = totalFGF > 0 ? Math.round(((gasSettings.o2Flow * 100) + (gasSettings.airFlow * 21)) / totalFGF) : 21;
  const isHypoxic = deliveredFiO2 < 25;

  // === VAPORIZER MECHANICAL LIMITS ===
  const maxDialMap = { sevoflurane: 8.0, desflurane: 18.0, isoflurane: 5.0 };
  const currentMaxDial = maxDialMap[gasSettings.agent] || 8.0;

  // === DYNAMIC VENTILATOR TARGETS ===
  let primaryTargetLabel = 'Vt (mL)';
  let primaryTargetValue = ventSettings.vt;
  let primaryTargetTarget = `[IBW] Target: ${Math.round((patient.ibw || 70)*6)}-${Math.round((patient.ibw || 70)*8)}`;
  
  if (ventSettings.mode === 'PCV') { 
      primaryTargetLabel = 'Pinsp (cmH2O)'; 
      primaryTargetValue = ventSettings.pinsp; 
      primaryTargetTarget = 'Target: 15-20';
  } else if (ventSettings.mode === 'PSV') {
      primaryTargetLabel = 'PS (cmH2O)';
      primaryTargetValue = ventSettings.ps || 10;
      primaryTargetTarget = 'Overcome Resistance';
  }

  const handleTargetChange = (direction) => {
      setVentSettings(s => {
          if (s.mode === 'PCV') return { ...s, pinsp: Math.max(5, Math.min(40, s.pinsp + (direction * 1))) };
          if (s.mode === 'PSV') return { ...s, ps: Math.max(0, Math.min(30, (s.ps || 10) + (direction * 1))) };
          return { ...s, vt: Math.max(50, Math.min(1000, s.vt + (direction * 10))) }; // VCV
      });
  };

  const handleAgentChange = (e) => {
      const newAgent = e.target.value;
      const newMax = maxDialMap[newAgent] || 8.0;
      // If switching to an agent with a lower max, automatically snap the dial down to prevent overdose.
      setGasSettings(s => ({ ...s, agent: newAgent, dial: Math.min(s.dial, newMax) }));
  };

  const handleDialChange = (direction) => {
      setGasSettings(s => {
          const newVal = s.dial + (direction * 0.1);
          // Floating point rounding fix and mechanical clamping
          const roundedVal = Math.round(newVal * 10) / 10;
          return { ...s, dial: Math.max(0, Math.min(currentMaxDial, roundedVal)) };
      });
  };

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap xl:flex-nowrap gap-3 bg-[#0a0a0a] p-3 rounded-xl border border-slate-700 shadow-2xl mt-4">
      
      {/* 1. Fresh Gas Flow & Stoichiometry */}
      <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-lg p-2 justify-between shadow-inner flex-[1_1_280px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1 border-b border-slate-800 pb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Fresh Gas</span>
            <div className="flex gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Total: <span className="text-white">{totalFGF.toFixed(1)} L</span></span>
                <span className={`text-[10px] font-bold ${isHypoxic ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                    FiO2: {deliveredFiO2}%
                </span>
            </div>
        </div>
        <div className="flex justify-around gap-2 mt-1">
          <div className="flex flex-col items-center flex-1 bg-black rounded p-1 border border-green-900/50">
            <span className="text-[10px] text-green-500 font-bold mb-1">O2</span>
            <div className="flex items-center w-full justify-between px-1">
              <button onClick={() => setGasSettings(s => ({...s, o2Flow: Math.max(0, s.o2Flow - 0.5)}))} className="w-8 h-8 flex items-center justify-center text-green-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">-</button>
              <span className="text-sm font-black text-green-400 text-center">{gasSettings.o2Flow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, o2Flow: Math.min(15, s.o2Flow + 0.5)}))} className="w-8 h-8 flex items-center justify-center text-green-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-black rounded p-1 border border-yellow-900/50">
            <span className="text-[10px] text-yellow-500 font-bold mb-1">Air</span>
            <div className="flex items-center w-full justify-between px-1">
              <button onClick={() => setGasSettings(s => ({...s, airFlow: Math.max(0, s.airFlow - 0.5)}))} className="w-8 h-8 flex items-center justify-center text-yellow-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">-</button>
              <span className="text-sm font-black text-yellow-400 text-center">{gasSettings.airFlow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, airFlow: Math.min(15, s.airFlow + 0.5)}))} className="w-8 h-8 flex items-center justify-center text-yellow-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-black rounded p-1 border border-blue-900/50">
            <span className="text-[10px] text-blue-500 font-bold mb-1">N2O</span>
            <div className="flex items-center w-full justify-between px-1">
              <button onClick={() => setGasSettings(s => ({...s, n2oFlow: Math.max(0, s.n2oFlow - 0.5)}))} className="w-8 h-8 flex items-center justify-center text-blue-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">-</button>
              <span className="text-sm font-black text-blue-400 text-center">{gasSettings.n2oFlow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, n2oFlow: Math.min(15, s.n2oFlow + 0.5)}))} className="w-8 h-8 flex items-center justify-center text-blue-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Vaporizer & Mechanical Limiters */}
      <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-lg p-2 justify-between shadow-inner flex-[1_1_280px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">Vaporizer</span>
          <span className="text-[9px] text-teal-300 font-bold bg-teal-900/40 px-1.5 py-0.5 rounded border border-teal-800">1.0 MAC = {INHALATIONAL_AGENTS[gasSettings.agent]?.mac40}%</span>
        </div>
        <div className="flex gap-2 h-full items-center">
          <select value={gasSettings.agent} style={{ textAlignLast: 'center' }} onChange={handleAgentChange} className="flex-1 bg-black text-sm font-bold text-teal-300 border border-teal-900/50 rounded outline-none appearance-none px-2 py-2 text-center h-full cursor-pointer hover:border-teal-700 transition">
            <option value="sevoflurane">Sevoflurane</option>
            <option value="desflurane">Desflurane</option>
            <option value="isoflurane">Isoflurane</option>
          </select>
          <div className="flex items-center justify-between bg-black rounded border border-teal-900/50 w-32 px-1 py-1 h-full">
            <button onClick={() => handleDialChange(-1)} className="w-8 h-8 flex items-center justify-center text-teal-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">-</button>
            <span className={`text-lg font-black text-center flex-1 ${gasSettings.dial >= currentMaxDial ? 'text-red-400' : 'text-white'}`}>
                {gasSettings.dial.toFixed(1)}<span className="text-[10px] text-teal-500 ml-0.5">%</span>
            </span>
            <button onClick={() => handleDialChange(1)} className="w-8 h-8 flex items-center justify-center text-teal-500 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-base cursor-pointer">+</button>
          </div>
        </div>
      </div>
      
      {/* 3. Ventilator Settings */}
      <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-lg p-2 justify-between shadow-inner flex-[2_1_450px] md:w-full xl:w-auto">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-1">Ventilator Setup</span>
        <div className="flex flex-wrap md:flex-nowrap gap-2">
          
          <div className="flex flex-col flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[70px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">MODE</span>
            <select value={ventSettings.mode} style={{ textAlignLast: 'center' }} onChange={e => setVentSettings(s => ({...s, mode: e.target.value}))} className="w-full bg-slate-800 text-sm font-black text-white outline-none appearance-none text-center h-full rounded cursor-pointer hover:border-slate-500 border border-transparent transition">
              <option value="PCV-VG">PCV-VG</option><option value="VCV">VCV</option><option value="PCV">PCV</option><option value="PSV">PSV</option>
            </select>
            <span className="text-[8px] text-slate-600 text-center mt-1">Control</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[100px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1 whitespace-nowrap">{primaryTargetLabel}</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => handleTargetChange(-1)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">-</button>
               <span className="text-lg font-black text-white text-center">{primaryTargetValue}</span>
               <button onClick={() => handleTargetChange(1)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1 whitespace-nowrap text-center">{primaryTargetTarget}</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">RR (bpm)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, rr: Math.max(4, s.rr - 1)}))} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.rr}</span>
               <button onClick={() => setVentSettings(s => ({...s, rr: Math.min(40, s.rr + 1)}))} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">{ventSettings.mode === 'PSV' ? 'Apnea Backup' : 'Target: 10-14'}</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">PEEP (cmH2O)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, peep: Math.max(0, s.peep - 1)}))} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.peep}</span>
               <button onClick={() => setVentSettings(s => ({...s, peep: Math.min(20, s.peep + 1)}))} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Target: 4-8</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">Pmax (cmH2O)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, pmax: Math.max(10, (s.pmax||40) - 1)}))} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.pmax || 40}</span>
               <button onClick={() => setVentSettings(s => ({...s, pmax: Math.min(80, (s.pmax||40) + 1)}))} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Alarm Limit</span>
          </div>

        </div>
      </div>
      
    </div>
  );
};