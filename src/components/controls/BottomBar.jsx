import React from 'react';
import { INHALATIONAL_AGENTS } from '../../engine/Pharmacology';

export const BottomBar = ({ gasSettings, setGasSettings, ventSettings, setVentSettings, patient }) => {
  // If the airway is not secured, the controls hide themselves.
  if (!patient.airwaySecured) return null;

  return (
    <div className="flex flex-col xl:flex-row gap-3 bg-[#0a0a0a] p-3 rounded-xl border border-slate-700 shadow-2xl mt-4">
      
      {/* 1. Fresh Gas Flow */}
      <div className="flex flex-col flex-1 bg-slate-900/50 border border-slate-800 rounded-lg p-2 justify-between shadow-inner min-w-[200px]">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-1">Fresh Gas (L/min)</span>
        <div className="flex justify-around gap-2">
          <div className="flex flex-col items-center flex-1 bg-black rounded p-1 border border-green-900/50">
            <span className="text-[10px] text-green-500 font-bold mb-1">O2</span>
            <div className="flex items-center w-full justify-between px-1">
              <button onClick={() => setGasSettings(s => ({...s, o2Flow: Math.max(0, s.o2Flow - 0.5)}))} className="text-green-500 bg-slate-800 hover:bg-slate-700 px-2 rounded font-bold">-</button>
              <span className="text-sm font-black text-green-400 text-center">{gasSettings.o2Flow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, o2Flow: s.o2Flow + 0.5}))} className="text-green-500 bg-slate-800 hover:bg-slate-700 px-2 rounded font-bold">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-black rounded p-1 border border-yellow-900/50">
            <span className="text-[10px] text-yellow-500 font-bold mb-1">Air</span>
            <div className="flex items-center w-full justify-between px-1">
              <button onClick={() => setGasSettings(s => ({...s, airFlow: Math.max(0, s.airFlow - 0.5)}))} className="text-yellow-500 bg-slate-800 hover:bg-slate-700 px-2 rounded font-bold">-</button>
              <span className="text-sm font-black text-yellow-400 text-center">{gasSettings.airFlow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, airFlow: s.airFlow + 0.5}))} className="text-yellow-500 bg-slate-800 hover:bg-slate-700 px-2 rounded font-bold">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-black rounded p-1 border border-blue-900/50">
            <span className="text-[10px] text-blue-500 font-bold mb-1">N2O</span>
            <div className="flex items-center w-full justify-between px-1">
              <button onClick={() => setGasSettings(s => ({...s, n2oFlow: Math.max(0, s.n2oFlow - 0.5)}))} className="text-blue-500 bg-slate-800 hover:bg-slate-700 px-2 rounded font-bold">-</button>
              <span className="text-sm font-black text-blue-400 text-center">{gasSettings.n2oFlow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, n2oFlow: s.n2oFlow + 0.5}))} className="text-blue-500 bg-slate-800 hover:bg-slate-700 px-2 rounded font-bold">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Vaporizer */}
      <div className="flex flex-col flex-1 bg-slate-900/50 border border-slate-800 rounded-lg p-2 justify-between shadow-inner min-w-[220px]">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">Vaporizer</span>
          <span className="text-[9px] text-teal-300 font-bold bg-teal-900/40 px-1.5 py-0.5 rounded border border-teal-800">1.0 MAC = {INHALATIONAL_AGENTS[gasSettings.agent]?.mac40}%</span>
        </div>
        <div className="flex gap-2 h-full items-center">
          <select value={gasSettings.agent} style={{ textAlignLast: 'center' }} onChange={e => setGasSettings(s => ({...s, agent: e.target.value}))} className="flex-1 bg-black text-sm font-bold text-teal-300 border border-teal-900/50 rounded outline-none appearance-none px-2 py-2 text-center h-full">
            <option value="sevoflurane">Sevoflurane</option>
            <option value="desflurane">Desflurane</option>
            <option value="isoflurane">Isoflurane</option>
          </select>
          <div className="flex items-center justify-between bg-black rounded border border-teal-900/50 w-28 px-1 py-1 h-full">
            <button onClick={() => setGasSettings(s => ({...s, dial: Math.max(0, s.dial - 0.1)}))} className="text-teal-500 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">-</button>
            <span className="text-lg font-black text-white text-center flex-1">{gasSettings.dial.toFixed(1)}<span className="text-[10px] text-teal-500 ml-0.5">%</span></span>
            <button onClick={() => setGasSettings(s => ({...s, dial: s.dial + 0.1}))} className="text-teal-500 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">+</button>
          </div>
        </div>
      </div>
      
      {/* 3. Ventilator Settings */}
      <div className="flex flex-col flex-[2] bg-slate-900/50 border border-slate-800 rounded-lg p-2 justify-between shadow-inner">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-1">Ventilator Setup</span>
        <div className="flex flex-wrap md:flex-nowrap gap-2">
          <div className="flex flex-col flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[70px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">MODE</span>
            <select value={ventSettings.mode} style={{ textAlignLast: 'center' }} onChange={e => setVentSettings(s => ({...s, mode: e.target.value}))} className="w-full bg-slate-800 text-sm font-black text-white outline-none appearance-none text-center h-full rounded">
              <option value="PCV-VG">PCV-VG</option><option value="VCV">VCV</option><option value="PCV">PCV</option><option value="PSV">PSV</option>
            </select>
            <span className="text-[8px] text-slate-600 text-center mt-1">Control</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[100px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">{ventSettings.mode === 'PCV' ? 'Pinsp (cmH2O)' : 'Vt (mL)'}</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ventSettings.mode === 'PCV' ? ({...s, pinsp: Math.max(5, s.pinsp - 1)}) : ({...s, vt: Math.max(50, s.vt - 10)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.mode === 'PCV' ? ventSettings.pinsp : ventSettings.vt}</span>
               <button onClick={() => setVentSettings(s => ventSettings.mode === 'PCV' ? ({...s, pinsp: Math.min(40, s.pinsp + 1)}) : ({...s, vt: Math.min(1000, s.vt + 10)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">{ventSettings.mode === 'PCV' ? 'Target: 15-20' : `[IBW] Target: ${Math.round(patient.ibw*6)}-${Math.round(patient.ibw*8)}`}</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">RR (bpm)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, rr: Math.max(4, s.rr - 1)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.rr}</span>
               <button onClick={() => setVentSettings(s => ({...s, rr: Math.min(40, s.rr + 1)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Target: 10-14</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">PEEP (cmH2O)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, peep: Math.max(0, s.peep - 1)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.peep}</span>
               <button onClick={() => setVentSettings(s => ({...s, peep: Math.min(20, s.peep + 1)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Target: 4-8</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-black rounded border border-slate-700 p-1 justify-between min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">Pmax (cmH2O)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, pmax: Math.max(10, (s.pmax||40) - 1)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">-</button>
               <span className="text-lg font-black text-white text-center">{ventSettings.pmax || 40}</span>
               <button onClick={() => setVentSettings(s => ({...s, pmax: Math.min(80, (s.pmax||40) + 1)}))} className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded font-bold">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Alarm Limit</span>
          </div>
        </div>
      </div>
      
    </div>
  );
};