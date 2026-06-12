import { INHALATIONAL_AGENTS } from '../../engine/Pharmacology';

export const BottomBar = ({ gasSettings, setGasSettings, ventSettings, setVentSettings, patient }) => {
  // If the airway is not secured, the controls hide themselves.
  if (!patient?.airwaySecured) return null;
 
  // === PHYSIOLOGICAL STOICHIOMETRY ===
  const totalFGF = gasSettings.o2Flow + gasSettings.airFlow + gasSettings.n2oFlow;
  // Air is ~21% oxygen.
  const deliveredFiO2 = totalFGF > 0 ? Math.round(((gasSettings.o2Flow * 100) + (gasSettings.airFlow * 21)) / totalFGF) : 21;
  const isHypoxic = deliveredFiO2 < 25;
 
  // === VAPORIZER MECHANICAL LIMITS ===
  const maxDialMap = { 
    sevoflurane: 8.0, 
    desflurane: 18.0, 
    isoflurane: 5.0,
    halothane: 5.0,
    methoxyflurane: 3.0,
    f3: 5.0,
    f6: 5.0,
    s_isoflurane: 5.0,
    r_isoflurane: 5.0
  };
  const currentMaxDial = maxDialMap[gasSettings.agent] || 8.0;
 
  // === DYNAMIC VENTILATOR TARGETS ===
  let primaryTargetLabel = 'Vt (mL)';
  let primaryTargetValue = ventSettings.vt;
  let primaryTargetTarget = `[IBW] Target: ${Math.round((patient?.ibw || 70)*6)}-${Math.round((patient?.ibw || 70)*8)}`;
  
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
    <div className="flex flex-col md:flex-row md:flex-wrap xl:flex-nowrap gap-3 glass-panel glass-cyan p-3 shadow-2xl">
      
      {/* 1. Fresh Gas Flow & Stoichiometry */}
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-[1_1_280px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1 border-b border-white/5 pb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Fresh Gas</span>
            <div className="flex gap-2">
                <span className="text-[10px] text-slate-400 font-bold font-mono">Total: <span className="text-white">{totalFGF.toFixed(1)} L</span></span>
                <span className={`text-[10px] font-bold font-mono ${isHypoxic ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                    FiO2: {deliveredFiO2}%
                </span>
            </div>
        </div>
        <div className="flex justify-around gap-1 sm:gap-2 mt-1">
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg p-0.5 sm:p-1 border border-white/5 shadow-inner">
            <span className="text-[10px] text-green-400 font-bold mb-1">O2</span>
            <div className="flex items-center w-full justify-between px-0.5 sm:px-1">
              <button onClick={() => setGasSettings(s => ({...s, o2Flow: Math.max(0, s.o2Flow - 0.5)}))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-emerald font-bold text-xs sm:text-base cursor-pointer">-</button>
              <span className="text-xs sm:text-sm font-black text-green-400 text-center font-mono">{gasSettings.o2Flow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, o2Flow: Math.min(15, s.o2Flow + 0.5)}))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-emerald font-bold text-xs sm:text-base cursor-pointer">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg p-0.5 sm:p-1 border border-white/5 shadow-inner">
            <span className="text-[10px] text-yellow-400 font-bold mb-1">Air</span>
            <div className="flex items-center w-full justify-between px-0.5 sm:px-1">
              <button onClick={() => setGasSettings(s => ({...s, airFlow: Math.max(0, s.airFlow - 0.5)}))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-amber font-bold text-xs sm:text-base cursor-pointer">-</button>
              <span className="text-xs sm:text-sm font-black text-yellow-400 text-center font-mono">{gasSettings.airFlow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, airFlow: Math.min(15, s.airFlow + 0.5)}))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-amber font-bold text-xs sm:text-base cursor-pointer">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg p-0.5 sm:p-1 border border-white/5 shadow-inner">
            <span className="text-[10px] text-blue-400 font-bold mb-1">N2O</span>
            <div className="flex items-center w-full justify-between px-0.5 sm:px-1">
              <button onClick={() => setGasSettings(s => ({...s, n2oFlow: Math.max(0, s.n2oFlow - 0.5)}))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-blue font-bold text-xs sm:text-base cursor-pointer">-</button>
              <span className="text-xs sm:text-sm font-black text-blue-400 text-center font-mono">{gasSettings.n2oFlow.toFixed(1)}</span>
              <button onClick={() => setGasSettings(s => ({...s, n2oFlow: Math.min(15, s.n2oFlow + 0.5)}))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-blue font-bold text-xs sm:text-base cursor-pointer">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Vaporizer & Mechanical Limiters */}
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-[1_1_280px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Vaporizer</span>
          <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/30 px-1.5 py-0.5 rounded-md border border-cyan-900/30 font-mono">1.0 MAC = {INHALATIONAL_AGENTS[gasSettings.agent]?.mac40}%</span>
        </div>
        <div className="flex gap-2 h-full items-center">
          <select value={gasSettings.agent} style={{ textAlignLast: 'center' }} onChange={handleAgentChange} className="flex-1 glass-input text-xs font-bold text-cyan-300 border border-white/10 rounded-lg outline-none appearance-none px-2 py-2 text-center h-full cursor-pointer hover:border-cyan-500/80 transition font-mono">
            <option value="sevoflurane">Sevoflurane</option>
            <option value="desflurane">Desflurane</option>
            <option value="isoflurane">Isoflurane</option>
            <option value="halothane">Halothane</option>
            <option value="methoxyflurane">Methoxyflurane</option>
            <option value="f3">F3 (Anesthetic)</option>
            <option value="f6">F6 (Nonimmobilizer)</option>
            <option value="s_isoflurane">S-Isoflurane</option>
            <option value="r_isoflurane">R-Isoflurane</option>
          </select>
          <div className="flex items-center justify-between bg-slate-950/60 rounded-lg border border-white/5 w-28 sm:w-32 px-0.5 py-0.5 sm:px-1 sm:py-1 h-full shadow-inner">
            <button onClick={() => handleDialChange(-1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-cyan font-bold text-xs sm:text-base cursor-pointer">-</button>
            <span className={`text-base sm:text-lg font-black text-center flex-1 font-mono ${gasSettings.dial >= currentMaxDial ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {gasSettings.dial.toFixed(1)}<span className="text-[9px] sm:text-[10px] text-cyan-500 ml-0.5">%</span>
            </span>
            <button onClick={() => handleDialChange(1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-cyan font-bold text-xs sm:text-base cursor-pointer">+</button>
          </div>
        </div>
      </div>
      
      {/* 3. Ventilator Settings */}
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-[2_1_450px] md:w-full xl:w-auto">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-1">Ventilator Setup</span>
        <div className="flex flex-wrap md:flex-nowrap gap-2">
          
          <div className="flex flex-col flex-1 bg-slate-950/60 rounded-lg border border-white/5 p-1 justify-between min-w-[70px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">MODE</span>
            <select value={ventSettings.mode} style={{ textAlignLast: 'center' }} onChange={e => setVentSettings(s => ({...s, mode: e.target.value}))} className="w-full glass-input text-xs font-black text-cyan-300 outline-none appearance-none text-center h-full rounded-lg cursor-pointer hover:border-cyan-500/80 transition">
              <option value="PCV-VG">PCV-VG</option><option value="VCV">VCV</option><option value="PCV">PCV</option><option value="PSV">PSV</option>
            </select>
            <span className="text-[8px] text-slate-650 text-center mt-1 uppercase font-bold">Control</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg border border-white/5 p-1 justify-between min-w-[85px] sm:min-w-[100px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">{primaryTargetLabel}</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => handleTargetChange(-1)} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">-</button>
               <span className="text-base sm:text-lg font-black text-white text-center font-mono">{primaryTargetValue}</span>
               <button onClick={() => handleTargetChange(1)} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1 text-center font-mono">{primaryTargetTarget}</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg border border-white/5 p-1 justify-between min-w-[80px] sm:min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">RR (bpm)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, rr: Math.max(4, s.rr - 1)}))} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">-</button>
               <span className="text-base sm:text-lg font-black text-white text-center font-mono">{ventSettings.rr}</span>
               <button onClick={() => setVentSettings(s => ({...s, rr: Math.min(40, s.rr + 1)}))} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1 text-center">{ventSettings.mode === 'PSV' ? 'Apnea Backup' : 'Target: 10-14'}</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg border border-white/5 p-1 justify-between min-w-[80px] sm:min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">PEEP (cmH2O)</span>
            <div className="flex items-center justify-between w-full px-1">
               <button onClick={() => setVentSettings(s => ({...s, peep: Math.max(0, s.peep - 1)}))} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">-</button>
               <span className="text-base sm:text-lg font-black text-white text-center font-mono">{ventSettings.peep}</span>
               <button onClick={() => setVentSettings(s => ({...s, peep: Math.min(20, s.peep + 1)}))} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Target: 4-8</span>
          </div>
          
          <div className="flex flex-col items-center flex-1 bg-slate-950/60 rounded-lg border border-white/5 p-1 justify-between min-w-[80px] sm:min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-bold text-center mb-1">Pmax (cmH2O)</span>
            <div className="flex items-center w-full justify-between px-1">
               <button onClick={() => setVentSettings(s => ({...s, pmax: Math.max(10, (s.pmax||40) - 1)}))} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">-</button>
               <span className="text-base sm:text-lg font-black text-white text-center font-mono">{ventSettings.pmax || 40}</span>
               <button onClick={() => setVentSettings(s => ({...s, pmax: Math.min(80, (s.pmax||40) + 1)}))} className="w-7 h-7 flex items-center justify-center glass-button glass-button-cyan font-bold cursor-pointer">+</button>
            </div>
            <span className="text-[8px] text-slate-500 mt-1">Alarm Limit</span>
          </div>
 
        </div>
      </div>
      
    </div>
  );
};