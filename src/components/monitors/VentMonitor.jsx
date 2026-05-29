import React from 'react';
import { CanvasWaveform } from '../CanvasWaveform';

export const VentMonitor = ({ patient, vitals, rrSpeed, ventSettings, setVentSettings }) => {
  // If the airway is not secured, the ventilator monitor hides itself.
  if (!patient.airwaySecured) return null;

  // Derive the morphological shape of the waveform based on the active ventilator mode
  const ventMorphology = ventSettings?.mode === 'VCV' ? 'vcv' : 'pcv';

  return (
    <div className="glass-panel glass-cyan p-2 md:p-3 flex flex-col gap-2 mt-4">
      <div className="flex flex-col md:grid md:grid-cols-4 gap-2 min-h-[300px] md:min-h-0 md:h-[280px] lg:h-[320px]">
        
        {/* Waveforms */}
        <div className="col-span-1 md:col-span-3 flex flex-col justify-between relative z-10 w-full h-[220px] md:h-full gap-1">
          <div className="flex-1 flex items-center w-full border border-slate-800 bg-black relative overflow-hidden rounded">
            <div className="absolute text-yellow-600/80 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Paw cmH2O</div>
            <CanvasWaveform 
              color="#ca8a04" 
              speed={rrSpeed} 
              rrSpeed={0} 
              active={rrSpeed > 0} 
              type="ventPressure" 
              morphology={ventMorphology}
              ieRatio={ventSettings?.ieRatio || 2} 
              ampScale={Math.min(1, (vitals.pip || 0) / 60)} 
              baseScale={Math.min(1, (vitals.peep || 0) / 20)} 
            />
          </div>
          <div className="flex-1 flex items-center w-full border border-slate-800 bg-black relative overflow-hidden rounded">
            <div className="absolute text-green-500/80 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Flow L/min</div>
            <CanvasWaveform 
              color="#22c55e" 
              speed={rrSpeed} 
              rrSpeed={0} 
              active={rrSpeed > 0} 
              type="ventFlow" 
              morphology={ventMorphology}
              ieRatio={ventSettings?.ieRatio || 2} 
              ampScale={Math.min(1, (vitals.pip || 0) / 40)} 
            />
          </div>
          <div className="flex-1 flex items-center w-full border border-slate-800 bg-black relative overflow-hidden rounded">
            <div className="absolute text-cyan-500/80 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Vol mL</div>
            <CanvasWaveform 
              color="#06b6d4" 
              speed={rrSpeed} 
              rrSpeed={0} 
              active={rrSpeed > 0} 
              type="ventVolume" 
              morphology={ventMorphology}
              ieRatio={ventSettings?.ieRatio || 2} 
              ampScale={Math.min(1, (vitals.vte || 0) / 1000)} 
            />
          </div>
        </div>

        {/* Vent Numericals */}
        <div className="col-span-1 flex flex-col bg-black/45 backdrop-blur-md p-2 md:p-3 rounded z-30 gap-2 md:gap-3 lg:gap-4 border border-slate-800/60 justify-between">
          <div className="flex flex-col gap-1 border-b border-slate-800 pb-2">
            <div className="flex justify-between items-end">
              <span className="text-yellow-600 text-[10px] font-bold uppercase tracking-widest">Ppeak / Pplat</span>
              <span className="text-yellow-700 text-[10px] font-bold uppercase tracking-widest">Pmean / PEEP</span>
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-4xl font-black text-white leading-none">{Math.round(vitals.pip || 0)}</span>
                <span className="text-yellow-500 text-[9px] font-bold uppercase tracking-widest mt-1">Pplat</span>
                <span className="text-2xl font-black text-slate-300 leading-none">{Math.round(vitals.pplat || 0)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-slate-300 leading-none">{Math.round(vitals.pmean || 0)}</span>
                <span className="text-yellow-600 text-[9px] font-bold uppercase tracking-widest mt-1">PEEP</span>
                <span className="text-2xl font-black text-white leading-none">{Math.round(vitals.peep || 0)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-b border-slate-800 pb-2">
            <div className="flex justify-between items-end">
              <span className="text-cyan-600 text-xs font-bold uppercase tracking-widest">VTe <span className="text-[9px] lowercase opacity-60">mL</span></span>
              <span className="text-cyan-700 text-[10px] font-bold uppercase tracking-widest">MVe</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black text-green-400 leading-none">{Math.round(vitals.vte || 0)}</span>
              <span className="text-3xl font-black text-green-400 leading-none">{(vitals.mv || 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">RR <span className="text-[9px] lowercase opacity-60">/min</span></span>
              <div className="flex gap-3">
                 <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-right">Cdyn<br/><span className="text-[8px] opacity-70">mL/cmH2O</span></span>
                 <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-right">Raw<br/><span className="text-[8px] opacity-70">cmH2O/L/s</span></span>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                  <span className="text-4xl font-black text-white leading-none">{vitals.rr}</span>
                  <div className="flex items-center gap-1 mt-1">
                     <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">I:E 1:</span>
                     {setVentSettings ? (
                       <select 
                         value={ventSettings?.ieRatio || 2}
                         onChange={(e) => setVentSettings({...ventSettings, ieRatio: parseFloat(e.target.value)})}
                         className="glass-input text-slate-300 text-[10px] font-bold rounded px-1 py-0.5 cursor-pointer"
                       >
                         <option value={1}>1</option>
                         <option value={1.5}>1.5</option>
                         <option value={2}>2</option>
                         <option value={2.5}>2.5</option>
                         <option value={3}>3</option>
                         <option value={4}>4</option>
                       </select>
                     ) : (
                       <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{ventSettings?.ieRatio || 2}</span>
                     )}
                  </div>
              </div>
              <div className="flex gap-4">
                 <span className="text-3xl font-black text-slate-300 leading-none">{Math.round(vitals.compl || 60)}</span>
                 <span className="text-3xl font-black text-slate-300 leading-none">{Math.round(vitals.res || 5)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};