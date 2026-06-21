import { INHALATIONAL_AGENTS, calculateLink25GasMixture } from '../../engine/Pharmacology';

export const BottomBar = ({ gasSettings, setGasSettings, ventSettings, setVentSettings, patient, setPatient, logEvent }) => {
  // === PHYSIOLOGICAL STOICHIOMETRY ===
  // Mirrors usePhysiology.js's gas-source derivation so this preview reflects the same Link-25 +
  // fail-safe-valve-protected mixture the engine will actually deliver (Ch22, Miller's 9th Ed).
  const isPipelineConnected = !patient?.isO2PipelineDisconnected;
  const isCrossover = !!patient?.isO2PipelineCrossover;
  const isCylinderOpen = !!patient?.isO2CylinderOpen;
  let hasO2Supply = false, o2SourceIsO2 = false, o2SourceIsN2O = false;
  if (isPipelineConnected) {
    hasO2Supply = true;
    if (isCrossover) { o2SourceIsN2O = true; } else { o2SourceIsO2 = true; }
  } else if (isCylinderOpen) {
    hasO2Supply = true;
    o2SourceIsO2 = true;
  }
  const gasMix = calculateLink25GasMixture(gasSettings, hasO2Supply, o2SourceIsO2, o2SourceIsN2O);
  const totalFGF = gasMix.freshGasFlow;
  const deliveredFiO2 = Math.round(gasMix.deliveredFiO2);
  const isHypoxic = deliveredFiO2 < 25;
 
  // === VAPORIZER MECHANICAL LIMITS ===
  const maxDialMap = { 
    sevoflurane: 8.0, 
    desflurane: 18.0, 
    isoflurane: 5.0,
    halothane: 5.0,
    methoxyflurane: 3.0,
    xenon: 75.0,
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
      setGasSettings(s => ({ ...s, agent: newAgent, dial: Math.min(s.dial, newMax) }));
  };

  const handleDialChange = (direction) => {
      setGasSettings(s => {
          const newVal = s.dial + (direction * 0.1);
          const roundedVal = Math.round(newVal * 10) / 10;
          return { ...s, dial: Math.max(0, Math.min(currentMaxDial, roundedVal)) };
      });
  };

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap xl:flex-nowrap gap-3 glass-panel glass-cyan p-3 shadow-2xl">
      
      {/* 1. Fresh Gas Flow & Stoichiometry */}
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-initial md:flex-[1_1_280px]" style={{ minWidth: 0 }}>
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
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-initial md:flex-[1_1_280px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Vaporizer</span>
          <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/30 px-1.5 py-0.5 rounded-md border border-cyan-900/30 font-mono">1.0 MAC = {INHALATIONAL_AGENTS[gasSettings.agent]?.mac40}%</span>
        </div>
        <div className="flex gap-2 h-full items-center">
          <select value={gasSettings.agent} style={{ textAlignLast: 'center' }} onChange={handleAgentChange} className="flex-1 glass-input text-xs font-bold text-cyan-300 border border-white/10 rounded-lg outline-none appearance-none px-2 py-2 text-center h-9 sm:h-10 cursor-pointer hover:border-cyan-500/80 transition font-mono">
            <option value="sevoflurane">Sevoflurane</option>
            <option value="desflurane">Desflurane</option>
            <option value="isoflurane">Isoflurane</option>
            <option value="halothane">Halothane</option>
            <option value="methoxyflurane">Methoxyflurane</option>
            <option value="xenon">Xenon</option>
            <option value="f3">F3 (Anesthetic)</option>
            <option value="f6">F6 (Nonimmobilizer)</option>
            <option value="s_isoflurane">S-Isoflurane</option>
            <option value="r_isoflurane">R-Isoflurane</option>
          </select>
          <div className="flex items-center justify-between bg-slate-950/60 rounded-lg border border-white/5 w-28 sm:w-32 px-0.5 py-0.5 sm:px-1 sm:py-1 h-9 sm:h-10 shadow-inner">
            <button onClick={() => handleDialChange(-1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-cyan font-bold text-xs sm:text-base cursor-pointer">-</button>
            <span className={`text-base sm:text-lg font-black text-center flex-1 font-mono ${gasSettings.dial >= currentMaxDial ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {gasSettings.dial.toFixed(1)}<span className="text-[9px] sm:text-[10px] text-cyan-500 ml-0.5">%</span>
            </span>
            <button onClick={() => handleDialChange(1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-cyan font-bold text-xs sm:text-base cursor-pointer">+</button>
          </div>
        </div>
      </div>
      
      {/* 3. Ventilator Settings */}
      {patient?.airwaySecured && (
        <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-initial md:flex-[2_1_450px] md:w-full xl:w-auto">
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
      )}

      {/* 4. Circuit & APL Setup */}
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-initial md:flex-[1_1_250px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1 border-b border-white/5 pb-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Breathing Circuit</span>
          <span className="text-[10px] text-emerald-300 font-bold font-mono">APL: {patient?.aplValveSetting || 0} cmH2O</span>
        </div>
        <div className="flex gap-2 h-full items-center">
          <select 
            value={patient?.breathingCircuitType || 'circle'} 
            style={{ textAlignLast: 'center' }} 
            onChange={(e) => {
              const val = e.target.value;
              if (setPatient) {
                setPatient(p => ({ ...p, breathingCircuitType: val }));
              }
            }} 
            className="flex-1 glass-input text-xs font-bold text-emerald-300 border border-white/10 rounded-lg outline-none appearance-none px-2 py-2 text-center h-9 sm:h-10 cursor-pointer hover:border-emerald-500/80 transition font-mono"
          >
            <option value="circle">Circle System</option>
            <option value="Mapleson A">Mapleson A</option>
            <option value="Mapleson D">Mapleson D</option>
          </select>
          <div className="flex items-center justify-between bg-slate-950/60 rounded-lg border border-white/5 w-28 sm:w-32 px-0.5 py-0.5 sm:px-1 sm:py-1 h-9 sm:h-10 shadow-inner">
            <button 
              onClick={() => {
                const currentVal = typeof patient?.aplValveSetting === 'number' ? patient.aplValveSetting : 0;
                const nextVal = Math.max(0, currentVal - 5);
                if (setPatient) {
                  setPatient(p => ({ ...p, aplValveSetting: nextVal }));
                }
              }} 
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-emerald font-bold text-xs sm:text-base cursor-pointer"
            >
              -
            </button>
            <span className="text-sm sm:text-base font-black text-center flex-1 font-mono text-white">
              {patient?.aplValveSetting || 0}
            </span>
            <button 
              onClick={() => {
                const currentVal = typeof patient?.aplValveSetting === 'number' ? patient.aplValveSetting : 0;
                const nextVal = Math.min(70, currentVal + 5);
                if (setPatient) {
                  setPatient(p => ({ ...p, aplValveSetting: nextVal }));
                }
              }} 
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center glass-button glass-button-emerald font-bold text-xs sm:text-base cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 5. Troubleshooting & Safety Overrides */}
      <div className="flex flex-col bg-slate-950/40 border border-white/5 rounded-xl p-2 justify-between shadow-inner flex-initial md:flex-[1_1_220px]" style={{ minWidth: 0 }}>
        <div className="flex justify-between items-center mb-1 px-1 border-b border-white/5 pb-1">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 font-mono">⚠️ Machine Safety</span>
          <div className="flex gap-1">
            {patient?.isO2PipelineCrossover && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Pipeline Crossover Warning" />}
            {patient?.isO2PipelineDisconnected && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]" title="Pipeline Disconnection Warning" />}
            {(patient?.stuckInspiratoryValve || patient?.stuckExpiratoryValve) && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" title="Stuck Circuit Valve Warning" />}
          </div>
        </div>
        <div className="relative font-mono mt-1">
          <select 
            value="" 
            onChange={(e) => {
              const action = e.target.value;
              if (action === 'crossover') {
                const nextVal = !patient?.isO2PipelineCrossover;
                setPatient(p => ({ ...p, isO2PipelineCrossover: nextVal }));
                if (logEvent) logEvent(`Action: ${nextVal ? 'Simulated pipeline crossover! Wall oxygen pipeline now delivers nitrous oxide.' : 'Resolved pipeline crossover. Wall oxygen pipeline restored.'}`);
              } else if (action === 'disconnect') {
                const nextVal = !patient?.isO2PipelineDisconnected;
                setPatient(p => ({ ...p, isO2PipelineDisconnected: nextVal }));
                if (logEvent) logEvent(`Action: ${nextVal ? 'Disconnected oxygen pipeline from wall outlet.' : 'Connected oxygen pipeline to wall outlet.'}`);
              } else if (action === 'cylinder') {
                const nextVal = !patient?.isO2CylinderOpen;
                setPatient(p => ({ ...p, isO2CylinderOpen: nextVal }));
                if (logEvent) logEvent(`Action: ${nextVal ? 'Opened backup oxygen cylinder (E-cylinder).' : 'Closed backup oxygen cylinder.'}`);
              } else if (action === 'valves') {
                const hasStuck = patient?.stuckInspiratoryValve || patient?.stuckExpiratoryValve;
                if (hasStuck) {
                  setPatient(p => ({ ...p, stuckInspiratoryValve: false, stuckExpiratoryValve: false }));
                  if (logEvent) logEvent("Action: Unstuck breathing circuit unidirectional valves.");
                } else {
                  setPatient(p => ({ ...p, stuckInspiratoryValve: true }));
                  if (logEvent) logEvent("Action: Sticking circle system inspiratory unidirectional valve open (rebreathing induced).");
                }
              } else if (action === 'flush') {
                const isInsp = patient?.ventilationStatus === 'mechanical' || patient?.ventilationStatus === 'assisted'; 
                const aplSetting = typeof patient?.aplValveSetting === 'number' ? patient.aplValveSetting : 0;
                const closedApl = aplSetting >= 30;
                const triggersPneumo = isInsp || closedApl;

                setPatient(p => {
                  const lungVols = p.lungVolumes || { frc_L: 2.5 };
                  const nextO2Buffer = lungVols.frc_L * 1.0; 
                  return {
                    ...p,
                    isOxygenFlushPressed: true,
                    oxygenBuffer: nextO2Buffer,
                    hasPneumothorax: triggersPneumo ? true : p.hasPneumothorax
                  };
                });

                if (triggersPneumo) {
                  if (logEvent) logEvent("🚨 BAROTRAUMA! Pressed Oxygen Flush valve with a closed APL valve or during positive-pressure inspiration, triggering a TENSION PNEUMOTHORAX!");
                } else {
                  if (logEvent) logEvent("💨 Pressed Oxygen Flush valve. Momentum flush pre-oxygenates FRC buffer and dilutes circuit anesthetic agents by 50%.");
                }
              } else if (action === 'canister') {
                setPatient(p => ({
                  ...p,
                  absorbent: { waterContent: 15.0, temperature: 22.0, type: 'soda_lime' },
                  isAirwayFire: false,
                  hasCoPoisoningLog: false,
                  hasCompoundALog: false
                }));
                if (logEvent) logEvent("✅ SUCCESS: CO2 absorbent canister replaced with a fresh, hydrated canister! Temperature reset to 22.0°C and circuit fire resolved.");
              }
            }} 
            className="w-full glass-input text-[10px] font-bold text-red-300 border border-white/10 rounded-lg outline-none appearance-none px-2 py-1.5 text-center cursor-pointer hover:border-red-500/85 transition font-mono bg-slate-950"
          >
            <option value="" disabled>🛠️ Troubleshooting Overrides...</option>
            <option value="flush">💨 Press Oxygen Flush Valve</option>
            <option value="canister">🔄 Replace CO2 Absorbent</option>
            <option value="cylinder">
              {patient?.isO2CylinderOpen ? '🛢️ Close Backup O2 Cylinder' : '🛢️ Open Backup O2 Cylinder'}
            </option>
            <option value="disconnect">
              {patient?.isO2PipelineDisconnected ? '🔌 Connect O2 Pipeline' : '🔌 Disconnect O2 Pipeline'}
            </option>
            <option value="crossover">
              {patient?.isO2PipelineCrossover ? '⚠️ Fix Pipeline Crossover' : '⚠️ Simulate Pipeline Crossover'}
            </option>
            <option value="valves">
              {(patient?.stuckInspiratoryValve || patient?.stuckExpiratoryValve) ? '🔄 Unstick Unidirectional Valves' : '🔄 Stick Circle Valve Open'}
            </option>
          </select>
        </div>
      </div>
      
    </div>
  );
};