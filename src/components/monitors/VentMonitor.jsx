import React from 'react';
import { CanvasWaveform } from '../CanvasWaveform';

export const VentMonitor = ({ patient, vitals, rrSpeed, ventSettings }) => {
  // If the airway is not secured, the ventilator monitor hides itself.
  if (!patient.airwaySecured) return null;

  // Derive the morphological shape of the waveform based on the active ventilator mode
  const ventMorphology = ventSettings?.mode === 'VCV' ? 'vcv' : 'pcv';

  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-2 md:p-3 flex flex-col gap-2 mt-4 shadow-2xl">
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-2 min-h-[300px] lg:h-[320px]">
        
        {/* Waveforms */}
        <div className="col-span-1 lg:col-span-3 flex flex-col justify-between relative z-10 w-full h-[300px] lg:h-full gap-1">
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
              ampScale={Math.min(1, (vitals.pip || 0) / 40)} 
              baseScale={Math.min(1, (vitals.peep || 0) / 20)} 
            />
          </div>
          <div className="flex-1 flex items-center w-full border border-slate-800 bg-black relative overflow-hidden rounded">
            <div className="absolute text-green-500/80 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Flow l/min</div>
            <CanvasWaveform 
              color="#22c55e" 
              speed={rrSpeed} 
              rrSpeed={0} 
              active={rrSpeed > 0} 
              type="ventFlow" 
              morphology={ventMorphology}
              ieRatio={ventSettings?.ieRatio || 2} 
              ampScale={Math.min(1, (vitals.pip || 0) / 30)} 
            />
          </div>
          <div className="flex-1 flex items-center w-full border border-slate-800 bg-black relative overflow-hidden rounded">
            <div className="absolute text-cyan-500/80 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Vol ml</div>
            <CanvasWaveform 
              color="#06b6d4" 
              speed={rrSpeed} 
              rrSpeed={0} 
              active={rrSpeed > 0} 
              type="ventVolume" 
              morphology="normal"
              ieRatio={ventSettings?.ieRatio || 2} 
              ampScale={Math.min(1, (vitals.vte || 0) / 800)} 
            />
          </div>
        </div>

        {/* Vent Numericals */}
        <div className="col-span-1 flex flex-col bg-[#050505] p-3 rounded z-30 gap-4 border border-slate-800 justify-between">
          <div className="flex flex-col gap-1 border-b border-slate-800 pb-2">
            <div className="flex justify-between items-end">
              <span className="text-yellow-600 text-xs font-bold uppercase tracking-widest">Ppeak</span>
              <span className="text-yellow-700 text-[10px] font-bold uppercase tracking-widest">Pmean</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black text-white leading-none">{Math.round(vitals.pip || 0)}</span>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-white leading-none">{Math.round(vitals.pmean || 0)}</span>
                <span className="text-yellow-600 text-[10px] font-bold uppercase tracking-widest mt-1">PEEP</span>
                <span className="text-2xl font-black text-white leading-none">{Math.round(vitals.peep || 0)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-b border-slate-800 pb-2">
            <div className="flex justify-between items-end">
              <span className="text-cyan-600 text-xs font-bold uppercase tracking-widest">TVexp <span className="text-[9px] lowercase opacity-60">ml</span></span>
              <span className="text-cyan-700 text-[10px] font-bold uppercase tracking-widest">MV</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black text-green-400 leading-none">{Math.round(vitals.vte || 0)}</span>
              <span className="text-3xl font-black text-green-400 leading-none">{(vitals.mv || 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">RR <span className="text-[9px] lowercase opacity-60">/min</span></span>
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Compl</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-4xl font-black text-white leading-none">{vitals.rr}</span>
              <span className="text-3xl font-black text-slate-300 leading-none">{Math.round(vitals.compl || 50)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};