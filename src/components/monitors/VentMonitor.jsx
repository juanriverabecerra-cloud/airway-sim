import { CanvasWaveform } from '../CanvasWaveform';

export const VentMonitor = ({ patient, vitals, rrSpeed, ventSettings, setVentSettings }) => {
  // If the airway is not secured, the ventilator monitor hides itself.
  if (!patient || !patient.airwaySecured) return null;

  // Derive the morphological shape of the waveform based on the active ventilator mode
  const ventMorphology = ventSettings?.mode === 'VCV' ? 'vcv' : 'pcv';

  return (
    <div className="glass-panel glass-emerald crt-monitor p-2 flex flex-col md:grid md:grid-cols-4 gap-2 min-h-[300px] md:min-h-0 md:h-[280px] lg:h-[420px] relative overflow-hidden">
      {/* Waveforms */}
      <div className="col-span-1 md:col-span-3 flex flex-col justify-between relative z-10 w-full h-[220px] md:h-full gap-1">
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-yellow-600/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Paw cmH2O</div>
          <CanvasWaveform 
            color="#ca8a04" 
            speed={rrSpeed} 
            rrSpeed={0} 
            active={rrSpeed > 0} 
            type="ventPressure" 
            morphology={ventMorphology}
            ieRatio={ventSettings?.ieRatio || 2} 
            ampScale={Math.min(1, (vitals?.pip || 0) / 60)} 
            baseScale={Math.min(1, (vitals?.peep || 0) / 20)} 
          />
        </div>
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-green-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Flow L/min</div>
          <CanvasWaveform 
            color="#22c55e" 
            speed={rrSpeed} 
            rrSpeed={0} 
            active={rrSpeed > 0} 
            type="ventFlow" 
            morphology={ventMorphology}
            ieRatio={ventSettings?.ieRatio || 2} 
            ampScale={Math.min(1, (vitals?.pip || 0) / 40)} 
          />
        </div>
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-cyan-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">Vol mL</div>
          <CanvasWaveform 
            color="#06b6d4" 
            speed={rrSpeed} 
            rrSpeed={0} 
            active={rrSpeed > 0} 
            type="ventVolume" 
            morphology={ventMorphology}
            ieRatio={ventSettings?.ieRatio || 2} 
            ampScale={Math.min(1, (vitals?.vte || 0) / 1000)} 
          />
        </div>
      </div>

      {/* Vent Numericals - Matching High-Legibility numerical styling of Primary Monitor */}
      <div className="col-span-1 grid grid-rows-3 bg-black/45 backdrop-blur-md p-1.5 rounded-lg h-full border border-slate-800/60 shadow-inner gap-1.5 overflow-hidden z-30">
        {/* Card 1: Pressures */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-yellow-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-yellow-500 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Pressures (cmH2O)</span>
          </div>
          <div className="flex-grow flex justify-between items-center py-0.5">
            <div className="flex flex-col">
              <span className="text-3xl lg:text-3.5xl xl:text-4xl font-black text-white leading-none">{Math.round(vitals?.pip || 0)}</span>
              <span className="text-yellow-600 text-[8px] font-bold uppercase mt-0.5 leading-none">Pip</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl lg:text-2.5xl font-black text-slate-300 leading-none">{Math.round(vitals?.pplat || 0)}</span>
              <span className="text-yellow-600 text-[8px] font-bold uppercase mt-0.5 leading-none">Plat</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xl lg:text-2.5xl font-black text-slate-300 leading-none">{Math.round(vitals?.peep || 0)}</span>
              <span className="text-yellow-600 text-[8px] font-bold uppercase mt-0.5 leading-none">PEEP</span>
            </div>
          </div>
        </div>

        {/* Card 2: Volumes */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-green-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-green-500 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Volumes</span>
          </div>
          <div className="flex-grow flex justify-between items-center py-0.5">
            <div className="flex flex-col">
              <span className="text-3xl lg:text-3.5xl xl:text-4xl font-black text-green-400 leading-none">{Math.round(vitals?.vte || 0)}</span>
              <span className="text-green-600 text-[8px] font-bold uppercase mt-0.5 leading-none">VTe (mL)</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl lg:text-3.5xl xl:text-4xl font-black text-green-400 leading-none">{(vitals?.mv || 0).toFixed(1)}</span>
              <span className="text-green-600 text-[8px] font-bold uppercase mt-0.5 leading-none">MVe (L/min)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Rates & Compliance */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-blue-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-blue-400 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Vent Ventilation</span>
          </div>
          <div className="flex-grow flex justify-between items-center py-1">
            <div className="flex flex-col justify-center">
              <span className="text-3xl lg:text-3.5xl xl:text-4xl font-black text-white leading-none">{vitals?.rr || 0}</span>
              <span className="text-blue-400 text-[8px] font-bold uppercase mt-0.5 leading-none">RR /min</span>
            </div>
            <div className="flex flex-col justify-center items-center">
              <span className="text-xl lg:text-2.5xl font-black text-slate-300 leading-none">{Math.round(vitals?.compl || 60)}</span>
              <span className="text-slate-500 text-[8px] font-bold uppercase mt-0.5 leading-none">Cdyn</span>
            </div>
            <div className="flex flex-col justify-center items-end">
              <span className="text-xl lg:text-2.5xl font-black text-slate-300 leading-none">{Math.round(vitals?.res || 5)}</span>
              <span className="text-slate-500 text-[8px] font-bold uppercase mt-0.5 leading-none">Raw</span>
            </div>
          </div>
          <div className="flex items-center gap-1 leading-none border-t border-slate-900/40 pt-1">
            <span className="text-[8px] text-slate-500 font-bold uppercase">I:E 1:</span>
            {setVentSettings ? (
              <select 
                value={ventSettings?.ieRatio || 2}
                onChange={(e) => setVentSettings({...ventSettings, ieRatio: parseFloat(e.target.value)})}
                className="bg-black/50 border border-slate-800 text-[9px] text-slate-300 rounded px-1 py-0.5 outline-none cursor-pointer leading-none h-[18px]"
              >
                <option value={1}>1</option>
                <option value={1.5}>1.5</option>
                <option value={2}>2</option>
                <option value={2.5}>2.5</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            ) : (
              <span className="text-slate-500 text-[9px] font-bold uppercase">{ventSettings?.ieRatio || 2}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};