import { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { INHALATIONAL_AGENTS, calculateLink25GasMixture } from '../../engine/Pharmacology';

const HoldButton = ({ onTrigger, className, children, disabled }) => {
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const startPress = (e) => {
    if (disabled) return;
    e.currentTarget.focus();
    e.preventDefault();
    onTrigger();

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onTrigger();
      }, 100);
    }, 400);
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <button
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      className={className}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};


export const BottomBar = ({ gasSettings, setGasSettings, ventSettings, setVentSettings, patient, setPatient, vitals, logEvent, openDrugConsult }) => {
  const agentName = gasSettings?.agent ? (
    gasSettings.agent.includes('sev') ? 'SEV' :
    gasSettings.agent.includes('des') ? 'DES' :
    gasSettings.agent.includes('iso') ? 'ISO' :
    gasSettings.agent.includes('hal') ? 'HAL' :
    gasSettings.agent.includes('met') ? 'MET' :
    gasSettings.agent.includes('xen') ? 'XEN' :
    gasSettings.agent.toUpperCase().slice(0, 3)
  ) : 'SEV';

  // === PHYSIOLOGICAL STOICHIOMETRY ===
  // Mirrors usePhysiology.js's gas-source derivation so this preview reflects the same Link-25 +
  // fail-safe-valve-protected mixture the engine will actually deliver (Ch22, Miller's 9th Ed).
  const isPipelineConnected = !patient?.isO2PipelineCrossover ? !patient?.isO2PipelineDisconnected : !patient?.isO2PipelineDisconnected;
  const isCrossover = !!patient?.isO2PipelineCrossover;
  const isCylinderOpen = !!patient?.isO2CylinderOpen;
  let hasO2Supply = false, o2SourceIsO2 = false, o2SourceIsN2O = false;
  if (!patient?.isO2PipelineDisconnected) {
    hasO2Supply = true;
    if (isCrossover) { o2SourceIsN2O = true; } else { o2SourceIsO2 = true; }
  } else if (isCylinderOpen) {
    hasO2Supply = true;
    o2SourceIsO2 = true;
  }
  const gasMix = calculateLink25GasMixture(gasSettings, hasO2Supply, o2SourceIsO2, o2SourceIsN2O);
  const totalFGF = gasMix.freshGasFlow;
  const deliveredFiO2 = Math.round(gasMix.deliveredFiO2);

  // Hypoxic warning: only when N2O is dialed and driving FiO2 toward the 25% Link-25 floor,
  // or when crossover/supply failure produces a genuinely sub-atmospheric oxygen fraction.
  // Pure air delivery (21%) is NOT hypoxic and must not trigger this flag.
  const isHypoxic = deliveredFiO2 < 21 || (gasSettings.n2oFlow > 0 && deliveredFiO2 < 25);

  // === VAPORIZER MECHANICAL LIMITS ===
  // These match the physical vaporizer dial stops for each agent.
  const maxDialMap = {
    sevoflurane: 8.0,    // Dräger D-Vapor 3000 / GE Tec 7: 0–8%
    desflurane: 18.0,    // Aladin 2 cassette / Dräger D-Vapor: 0–18%
    isoflurane: 5.0,     // Dräger Vapor 2000: 0–5%
    halothane: 5.0,      // Fluotec Mk5: 0–5%
    methoxyflurane: 3.0, // Historical; high-dose anesthesia abandoned (nephrotoxicity)
    xenon: 75.0,         // MAC ≈ 63–71%; 75% leaves O2 headroom
    f3: 5.0,
    f6: 5.0,
    s_isoflurane: 5.0,
    r_isoflurane: 5.0
  };
  const currentMaxDial = maxDialMap[gasSettings.agent] || 8.0;

  // === DYNAMIC VENTILATOR TARGETS ===
  // Tidal volume IBW targets: 6–8 mL/kg IBW for routine surgery (Serpa Neto 2012 meta-analysis);
  // 6 mL/kg IBW for ARDSnet LPV (ARMA trial, N Engl J Med 2000). 8 mL/kg is the upper limit
  // for non-ARDS patients. Show per-kg range so the user understands the IBW basis.
  const ibw = patient?.ibw || 70;
  const vtLow  = Math.round(ibw * 6);
  const vtHigh = Math.round(ibw * 8);

  let primaryTargetLabel = 'Vt (mL)';
  let primaryTargetValue = ventSettings.vt;
  let primaryTargetTarget = `6–8 mL/kg IBW (${vtLow}–${vtHigh} mL)`;

  if (ventSettings.mode === 'PCV') {
      primaryTargetLabel = 'Pinsp (cmH₂O)';
      primaryTargetValue = ventSettings.pinsp;
      primaryTargetTarget = 'Titrate → Vt 6–8 mL/kg IBW';
  } else if (ventSettings.mode === 'PSV') {
      primaryTargetLabel = 'PS (cmH₂O)';
      primaryTargetValue = ventSettings.ps || 10;
      primaryTargetTarget = 'Overcome circuit resistance';
  }

  const handleTargetChange = (direction) => {
      setVentSettings(s => {
          if (s.mode === 'PCV') return { ...s, pinsp: Math.max(5, Math.min(40, s.pinsp + (direction * 1))) };
          if (s.mode === 'PSV') return { ...s, ps: Math.max(0, Math.min(30, (s.ps || 10) + (direction * 1))) };
          return { ...s, vt: Math.max(100, Math.min(1000, s.vt + (direction * 10))) };
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

  // I:E ratio: stored as the expiratory ratio (ieRatio=2 → 1:2 normal; 3 → 1:3 COPD/asthma).
  // Step through clinically meaningful presets. Inverse ratio (ieRatio<1) used in ARDS IRV.
  const ieRatio = ventSettings.ieRatio || 2;
  const iePresets = [0.5, 1, 1.5, 2, 3, 4];
  const ieIdx     = iePresets.indexOf(ieRatio);
  const handleIeChange = (dir) => {
    const next = iePresets[Math.max(0, Math.min(iePresets.length - 1, ieIdx + dir))];
    setVentSettings(s => ({ ...s, ieRatio: next }));
  };
  const ieLabel = ieRatio < 1 ? `${Math.round(1/ieRatio)}:1` : `1:${ieRatio}`;
  const ieHint  = ieRatio <= 1 ? 'IRV (ARDS)' : ieRatio <= 2 ? 'Normal' : ieRatio <= 3 ? 'COPD/Asthma' : 'Severe obstruction';

  // Mapleson circuit minimum FGF: displayed as a clinical hint in the circuit section.
  // Mapleson A: spontaneous ≥ MV, controlled ≥ 3× MV (Mapleson 1954; Bain & Spoerel 1972).
  // Mapleson D: spontaneous ≥ 2.5× MV, controlled ≥ 2× MV.
  // Circle: low-flow feasible once equilibrated (≥ 0.5 L/min maintenance; ≥ 2 L/min induction).
  const circuitType = patient?.breathingCircuitType || 'circle';
  const estimatedMV = vitals?.mv || 6.0;
  const minFGFHint = (() => {
    if (circuitType === 'Mapleson A') {
      const isControlled = patient?.airwaySecured;
      const req = isControlled ? Math.round(3 * estimatedMV * 10) / 10 : Math.round(estimatedMV * 10) / 10;
      return `Min FGF: ${req} L/min (${isControlled ? '3× MV, controlled' : '1× MV, spontaneous'})`;
    }
    if (circuitType === 'Mapleson D') {
      const isControlled = patient?.airwaySecured;
      const req = isControlled ? Math.round(2 * estimatedMV * 10) / 10 : Math.round(2.5 * estimatedMV * 10) / 10;
      return `Min FGF: ${req} L/min (${isControlled ? '2× MV, controlled' : '2.5× MV, spontaneous'})`;
    }
    return totalFGF < 1.0 ? 'Low-flow ✓ (soda lime active)' : `FGF ${totalFGF.toFixed(1)} L/min`;
  })();

  const minFGFWarning = (() => {
    if (circuitType === 'Mapleson A') {
      const req = patient?.airwaySecured ? 3 * estimatedMV : estimatedMV;
      return totalFGF < req;
    }
    if (circuitType === 'Mapleson D') {
      const req = patient?.airwaySecured ? 2 * estimatedMV : 2.5 * estimatedMV;
      return totalFGF < req;
    }
    return false;
  })();

  return (
    <div className="w-full glass-panel glass-cyan p-2 sm:p-2.5 md:p-3 shadow-2xl rounded-2xl border border-cyan-500/20 bg-slate-950/85 backdrop-blur-xl transition-all duration-300">
      <div className="flex flex-wrap items-stretch gap-2 sm:gap-2.5 w-full">

        {/* 1. Fresh Gas Flow & Stoichiometry */}
        <div className="flex flex-col bg-slate-950/50 border border-white/10 rounded-xl p-2 sm:p-2.5 justify-between shadow-inner flex-[1_1_250px] min-w-[240px] max-w-full">
          <div className="flex justify-between items-center mb-1.5 px-1 border-b border-white/10 pb-1 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fresh Gas</span>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-slate-400 font-bold">Total: <span className="text-white font-bold">{totalFGF.toFixed(1)} L</span></span>
              <span className={`font-bold ${isHypoxic ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                FiO₂: {deliveredFiO2}%{isHypoxic ? ' ⚠' : ''}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-1 flex-1">
            {/* O2 */}
            <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1 sm:p-1.5 border border-white/5 shadow-inner min-w-0">
              <span className="text-[10px] text-emerald-400 font-black tracking-wide">O₂</span>
              <div className="flex items-center justify-between w-full gap-0.5 my-0.5 px-0.5 h-8 sm:h-9">
                <HoldButton 
                  onTrigger={() => setGasSettings(s => ({...s, o2Flow: Math.max(0, Math.round((s.o2Flow - 0.5) * 10) / 10)}))} 
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-emerald font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  -
                </HoldButton>
                <span className="text-xs sm:text-sm font-black text-emerald-400 text-center font-mono truncate px-0.5">
                  {gasSettings.o2Flow.toFixed(1)}
                </span>
                <HoldButton 
                  onTrigger={() => setGasSettings(s => ({...s, o2Flow: Math.min(15, Math.round((s.o2Flow + 0.5) * 10) / 10)}))} 
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-emerald font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  +
                </HoldButton>
              </div>
              <span className="text-[8.5px] text-emerald-500/70 font-mono font-medium">L/min</span>
            </div>

            {/* Air */}
            <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1 sm:p-1.5 border border-white/5 shadow-inner min-w-0">
              <span className="text-[10px] text-amber-400 font-black tracking-wide">Air</span>
              <div className="flex items-center justify-between w-full gap-0.5 my-0.5 px-0.5 h-8 sm:h-9">
                <HoldButton 
                  onTrigger={() => setGasSettings(s => ({...s, airFlow: Math.max(0, Math.round((s.airFlow - 0.5) * 10) / 10)}))} 
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-amber font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  -
                </HoldButton>
                <span className="text-xs sm:text-sm font-black text-amber-400 text-center font-mono truncate px-0.5">
                  {gasSettings.airFlow.toFixed(1)}
                </span>
                <HoldButton 
                  onTrigger={() => setGasSettings(s => ({...s, airFlow: Math.min(15, Math.round((s.airFlow + 0.5) * 10) / 10)}))} 
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-amber font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  +
                </HoldButton>
              </div>
              <span className="text-[8.5px] text-amber-500/70 font-mono font-medium">L/min</span>
            </div>

            {/* N2O */}
            <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1 sm:p-1.5 border border-white/5 shadow-inner min-w-0">
              <span className="text-[10px] text-blue-400 font-black tracking-wide">N₂O</span>
              <div className="flex items-center justify-between w-full gap-0.5 my-0.5 px-0.5 h-8 sm:h-9">
                <HoldButton 
                  onTrigger={() => setGasSettings(s => ({...s, n2oFlow: Math.max(0, Math.round((s.n2oFlow - 0.5) * 10) / 10)}))} 
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-blue font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  -
                </HoldButton>
                <span className="text-xs sm:text-sm font-black text-blue-400 text-center font-mono truncate px-0.5">
                  {gasSettings.n2oFlow.toFixed(1)}
                </span>
                <HoldButton 
                  onTrigger={() => setGasSettings(s => ({...s, n2oFlow: Math.min(15, Math.round((s.n2oFlow + 0.5) * 10) / 10)}))} 
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-blue font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  +
                </HoldButton>
              </div>
              <span className="text-[8.5px] text-blue-500/70 font-mono font-medium">L/min</span>
            </div>
          </div>
        </div>

        {/* 2. Vaporizer & Mechanical Limiters */}
        <div className="flex flex-col bg-slate-950/50 border border-white/10 rounded-xl p-2 sm:p-2.5 justify-between shadow-inner flex-[1_1_220px] min-w-[210px] max-w-full">
          <div className="flex justify-between items-center mb-1.5 px-1 border-b border-white/10 pb-1 shrink-0">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Vaporizer</span>
            <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded-md border border-cyan-800/40 font-mono">
              1.0 MAC = {INHALATIONAL_AGENTS[gasSettings.agent]?.mac40}%
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1 flex-1">
            <select 
              value={gasSettings.agent} 
              style={{ textAlignLast: 'center' }} 
              onChange={handleAgentChange} 
              className="flex-1 glass-input text-xs font-bold text-cyan-300 border border-white/10 rounded-xl outline-none appearance-none px-2.5 py-1.5 text-center h-9 sm:h-10 cursor-pointer hover:border-cyan-500/80 transition font-mono bg-slate-950/70"
            >
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
            <div className="flex items-center justify-between bg-slate-950/70 rounded-xl border border-white/10 px-1.5 py-1 h-9 sm:h-10 shadow-inner sm:w-28 shrink-0">
              <HoldButton 
                onTrigger={() => handleDialChange(-1)} 
                className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
              >
                -
              </HoldButton>
              <span className={`text-sm sm:text-base font-black text-center flex-1 font-mono px-1 ${gasSettings.dial >= currentMaxDial ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {gasSettings.dial.toFixed(1)}<span className="text-[9px] text-cyan-400 ml-0.5">%</span>
              </span>
              <HoldButton 
                onTrigger={() => handleDialChange(1)} 
                className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
              >
                +
              </HoldButton>
            </div>
          </div>
        </div>

        {/* 2b. Gas Analyzer */}
        <div className="flex flex-col bg-slate-950/50 border border-white/10 rounded-xl p-2 sm:p-2.5 justify-between shadow-inner flex-[1_1_180px] min-w-[170px] max-w-full">
          <div className="flex justify-between items-center mb-1.5 px-1 border-b border-white/10 pb-1 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gas Analyzer</span>
          </div>
          <div className="flex flex-col gap-1.5 justify-center flex-1 mt-0.5">
            {/* O2 Gas Block */}
            <div className="flex items-center justify-between bg-slate-950/70 rounded-lg px-2 py-1 border border-white/5 shadow-inner">
              <span className="text-[11px] font-black text-emerald-400 font-mono">O₂</span>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-slate-400"><span className="text-slate-500 font-bold">Fi:</span> <span className="text-white font-black">{vitals?.fiO2 !== undefined ? Math.round(vitals.fiO2) : 21}</span></span>
                <span className="text-emerald-400"><span className="text-emerald-500/80 font-bold">Et:</span> <span className="font-black">{vitals?.etO2 !== undefined ? Math.round(vitals.etO2) : 21}</span></span>
              </div>
            </div>

            {/* N2O Gas Block */}
            <div className="flex items-center justify-between bg-slate-950/70 rounded-lg px-2 py-1 border border-white/5 shadow-inner">
              <span className="text-[11px] font-black text-blue-400 font-mono">N₂O</span>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-slate-400"><span className="text-slate-500 font-bold">Fi:</span> <span className="text-white font-black">{vitals?.fiN2O !== undefined ? Math.round(vitals.fiN2O) : 0}</span></span>
                <span className="text-blue-400"><span className="text-blue-500/80 font-bold">Et:</span> <span className="font-black">{vitals?.etN2O !== undefined ? Math.round(vitals.etN2O) : 0}</span></span>
              </div>
            </div>

            {/* Agent Gas Block */}
            <div className="flex items-center justify-between bg-slate-950/70 rounded-lg px-2 py-1 border border-white/5 shadow-inner">
              <button
                onClick={() => {
                  if (openDrugConsult && gasSettings?.agent) {
                    openDrugConsult(gasSettings.agent);
                  }
                }}
                className="text-[11px] font-black text-cyan-400 font-mono hover:text-cyan-300 hover:underline cursor-pointer border-b border-dashed border-cyan-800/40"
                title="How does this agent work? (Ask Attending)"
              >
                {agentName}
              </button>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-slate-400"><span className="text-slate-500 font-bold">Fi:</span> <span className="text-white font-black">{vitals?.fiAgent !== undefined ? vitals.fiAgent.toFixed(1) : '0.0'}</span></span>
                <span className="text-cyan-400"><span className="text-cyan-500/80 font-bold">Et:</span> <span className="font-black">{vitals?.etAgent !== undefined ? vitals.etAgent.toFixed(1) : '0.0'}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ventilator Settings */}
        {patient?.airwaySecured && (
          <div className="flex flex-col bg-slate-950/50 border border-white/10 rounded-xl p-2 sm:p-2.5 justify-between shadow-inner flex-[2.5_1_480px] min-w-[320px] max-w-full">
            <div className="flex justify-between items-center mb-1.5 px-1 border-b border-white/10 pb-1 shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ventilator Setup</span>
            </div>

            <div className="grid grid-cols-2 min-[440px]:grid-cols-3 xl:grid-cols-6 gap-1.5 sm:gap-2 mt-1 flex-1 items-stretch">
              
              {/* Mode */}
              <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1.5 border border-white/5 shadow-inner min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center truncate w-full">
                  MODE
                </span>
                <select 
                  value={ventSettings.mode} 
                  style={{ textAlignLast: 'center' }} 
                  onChange={e => setVentSettings(s => ({...s, mode: e.target.value}))} 
                  className="w-full glass-input text-xs font-black text-cyan-300 outline-none appearance-none text-center h-8 sm:h-9 my-0.5 rounded-lg cursor-pointer hover:border-cyan-500/80 transition bg-slate-950/80"
                >
                  <option value="PCV-VG">PCV-VG</option>
                  <option value="VCV">VCV</option>
                  <option value="PCV">PCV</option>
                  <option value="PSV">PSV</option>
                </select>
                <span className="text-[8px] text-slate-500 text-center uppercase font-bold tracking-wider">
                  Control
                </span>
              </div>

              {/* Vt / Pinsp / PS Target */}
              <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1.5 border border-white/5 shadow-inner min-w-0">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider text-center truncate w-full" title={primaryTargetLabel}>
                  {primaryTargetLabel}
                </span>
                <div className="flex items-center justify-between w-full gap-1 my-0.5 px-0.5 h-8 sm:h-9">
                  <HoldButton 
                    onTrigger={() => handleTargetChange(-1)} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    -
                  </HoldButton>
                  <span className="text-xs sm:text-sm font-black text-white text-center font-mono truncate px-0.5">
                    {primaryTargetValue}
                  </span>
                  <HoldButton 
                    onTrigger={() => handleTargetChange(1)} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    +
                  </HoldButton>
                </div>
                <span className="text-[8px] text-slate-400 text-center font-mono leading-tight px-0.5 min-h-[16px] flex items-center justify-center w-full" title={primaryTargetTarget}>
                  {primaryTargetTarget}
                </span>
              </div>

              {/* RR */}
              <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1.5 border border-white/5 shadow-inner min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center truncate w-full">
                  RR (bpm)
                </span>
                <div className="flex items-center justify-between w-full gap-1 my-0.5 px-0.5 h-8 sm:h-9">
                  <HoldButton 
                    onTrigger={() => setVentSettings(s => ({...s, rr: Math.max(6, s.rr - 1)}))} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    -
                  </HoldButton>
                  <span className="text-xs sm:text-sm font-black text-white text-center font-mono truncate px-0.5">
                    {ventSettings.rr}
                  </span>
                  <HoldButton 
                    onTrigger={() => setVentSettings(s => ({...s, rr: Math.min(40, s.rr + 1)}))} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    +
                  </HoldButton>
                </div>
                <span className="text-[8px] text-slate-500 text-center leading-tight min-h-[16px] flex items-center justify-center w-full">
                  {ventSettings.mode === 'PSV' ? 'Apnea backup' : 'Target: 10–14'}
                </span>
              </div>

              {/* PEEP */}
              <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1.5 border border-white/5 shadow-inner min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center truncate w-full">
                  PEEP (cmH₂O)
                </span>
                <div className="flex items-center justify-between w-full gap-1 my-0.5 px-0.5 h-8 sm:h-9">
                  <HoldButton 
                    onTrigger={() => setVentSettings(s => ({...s, peep: Math.max(0, s.peep - 1)}))} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    -
                  </HoldButton>
                  <span className={`text-xs sm:text-sm font-black text-center font-mono truncate px-0.5 ${ventSettings.peep < 3 ? 'text-amber-400' : 'text-white'}`}>
                    {ventSettings.peep}
                  </span>
                  <HoldButton 
                    onTrigger={() => setVentSettings(s => ({...s, peep: Math.min(20, s.peep + 1)}))} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    +
                  </HoldButton>
                </div>
                <span className="text-[8px] text-slate-500 text-center leading-tight min-h-[16px] flex items-center justify-center w-full">
                  {ventSettings.peep < 3 ? '≥5 prevents collapse' : 'Target: 5–8'}
                </span>
              </div>

              {/* I:E */}
              <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1.5 border border-white/5 shadow-inner min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center truncate w-full">
                  I:E
                </span>
                <div className="flex items-center justify-between w-full gap-1 my-0.5 px-0.5 h-8 sm:h-9">
                  <button 
                    onClick={() => handleIeChange(-1)} 
                    disabled={ieIdx <= 0} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="text-xs sm:text-sm font-black text-white text-center font-mono truncate px-0.5">
                    {ieLabel}
                  </span>
                  <button 
                    onClick={() => handleIeChange(1)} 
                    disabled={ieIdx >= iePresets.length - 1} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                <span className={`text-[8px] text-center leading-tight font-mono min-h-[16px] flex items-center justify-center w-full ${ieRatio > 2 ? 'text-amber-400' : ieRatio < 1 ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {ieHint}
                </span>
              </div>

              {/* Pmax */}
              <div className="flex flex-col items-center justify-between bg-slate-950/70 rounded-xl p-1.5 border border-white/5 shadow-inner min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center truncate w-full">
                  Pmax (cmH₂O)
                </span>
                <div className="flex items-center justify-between w-full gap-1 my-0.5 px-0.5 h-8 sm:h-9">
                  <HoldButton 
                    onTrigger={() => setVentSettings(s => ({...s, pmax: Math.max(15, (s.pmax||40) - 1)}))} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    -
                  </HoldButton>
                  <span className={`text-xs sm:text-sm font-black text-center font-mono truncate px-0.5 ${(ventSettings.pmax||40) < 20 ? 'text-amber-400' : 'text-white'}`}>
                    {ventSettings.pmax || 40}
                  </span>
                  <HoldButton 
                    onTrigger={() => setVentSettings(s => ({...s, pmax: Math.min(80, (s.pmax||40) + 1)}))} 
                    className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-cyan font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    +
                  </HoldButton>
                </div>
                <span className="text-[8px] text-slate-500 text-center leading-tight min-h-[16px] flex items-center justify-center w-full">
                  PIP limit
                </span>
              </div>

            </div>
          </div>
        )}

        {/* 4. Circuit & APL Setup */}
        <div className="flex flex-col bg-slate-950/50 border border-white/10 rounded-xl p-2 sm:p-2.5 justify-between shadow-inner flex-[1_1_220px] min-w-[210px] max-w-full">
          <div className="flex justify-between items-center mb-1.5 px-1 border-b border-white/10 pb-1 shrink-0">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Breathing Circuit</span>
            <span className="text-[10px] text-emerald-300 font-bold font-mono">APL: {patient?.aplValveSetting || 0} cmH₂O</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1 flex-1 justify-between">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={patient?.breathingCircuitType || 'circle'}
                style={{ textAlignLast: 'center' }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (setPatient) {
                    setPatient(p => ({ ...p, breathingCircuitType: val }));
                  }
                }}
                className="flex-1 glass-input text-xs font-bold text-emerald-300 border border-white/10 rounded-xl outline-none appearance-none px-2.5 py-1.5 text-center h-9 sm:h-10 cursor-pointer hover:border-emerald-500/80 transition font-mono bg-slate-950/70"
              >
                <option value="circle">Circle System</option>
                <option value="Mapleson A">Mapleson A</option>
                <option value="Mapleson D">Mapleson D</option>
              </select>
              <div className="flex items-center justify-between bg-slate-950/70 rounded-xl border border-white/10 px-1.5 py-1 h-9 sm:h-10 shadow-inner sm:w-28 shrink-0">
                <HoldButton
                  onTrigger={() => {
                    const currentVal = typeof patient?.aplValveSetting === 'number' ? patient.aplValveSetting : 0;
                    const nextVal = Math.max(0, currentVal - 5);
                    if (setPatient) {
                      setPatient(p => ({ ...p, aplValveSetting: nextVal }));
                    }
                  }}
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-emerald font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  -
                </HoldButton>
                <span className="text-xs sm:text-sm font-black text-center flex-1 font-mono text-white px-1">
                  {patient?.aplValveSetting || 0}
                </span>
                <HoldButton
                  onTrigger={() => {
                    const currentVal = typeof patient?.aplValveSetting === 'number' ? patient.aplValveSetting : 0;
                    const nextVal = Math.min(70, currentVal + 5);
                    if (setPatient) {
                      setPatient(p => ({ ...p, aplValveSetting: nextVal }));
                    }
                  }}
                  className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg glass-button glass-button-emerald font-black text-xs sm:text-sm flex items-center justify-center shrink-0 cursor-pointer"
                >
                  +
                </HoldButton>
              </div>
            </div>
            {/* Mapleson FGF minimum guidance */}
            <div className={`text-[9px] font-mono px-1 leading-tight ${minFGFWarning ? 'text-amber-400' : 'text-slate-500'}`}>
              {minFGFWarning ? '⚠ ' : ''}{minFGFHint}
            </div>
          </div>
        </div>

        {/* 5. Machine Safety */}
        <div className="flex flex-col bg-slate-950/50 border border-white/10 rounded-xl p-2 sm:p-2.5 justify-between shadow-inner flex-[1_1_200px] min-w-[190px] max-w-full">
          <div className="flex justify-between items-center mb-1.5 px-1 border-b border-white/10 pb-1 shrink-0">
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 font-mono">
              <ShieldAlert size={12} className="text-red-400 animate-pulse" /> Machine Safety
            </span>
            <div className="flex gap-1">
              {patient?.isO2PipelineCrossover && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Pipeline Crossover Warning" />}
              {patient?.isO2PipelineDisconnected && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]" title="Pipeline Disconnection Warning" />}
              {(patient?.stuckInspiratoryValve || patient?.stuckExpiratoryValve) && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" title="Stuck Circuit Valve Warning" />}
            </div>
          </div>
          <div className="flex-1 flex items-center mt-1">
            <select
              value=""
              style={{ textAlignLast: 'center' }}
              onChange={(e) => {
                const action = e.target.value;
                if (action === 'crossover') {
                  const nextVal = !patient?.isO2PipelineCrossover;
                  setPatient(p => ({ ...p, isO2PipelineCrossover: nextVal }));
                  if (logEvent) logEvent(`Action: ${nextVal ? '🚨 PIPELINE CROSSOVER! Wall O₂ pipeline is delivering N₂O. FiO₂ will fall — identify source by smell and switch to backup cylinder immediately.' : '✅ Pipeline crossover resolved. Wall O₂ pipeline restored to oxygen.'}`);
                } else if (action === 'disconnect') {
                  const nextVal = !patient?.isO2PipelineDisconnected;
                  setPatient(p => ({ ...p, isO2PipelineDisconnected: nextVal }));
                  if (logEvent) logEvent(`Action: ${nextVal ? '⚠️ O₂ pipeline disconnected from wall outlet. Gas supply now from backup E-cylinder (if open) only.' : '✅ O₂ pipeline reconnected to wall outlet.'}`);
                } else if (action === 'cylinder') {
                  const nextVal = !patient?.isO2CylinderOpen;
                  setPatient(p => ({ ...p, isO2CylinderOpen: nextVal }));
                  if (logEvent) logEvent(`Action: ${nextVal ? '🛢️ Backup E-cylinder opened. Check pressure gauge — a full E-cylinder holds ~660 L O₂ at 2000 psi.' : 'Backup O₂ E-cylinder closed.'}`);
                } else if (action === 'valves') {
                  const hasStuck = patient?.stuckInspiratoryValve || patient?.stuckExpiratoryValve;
                  if (hasStuck) {
                    setPatient(p => ({ ...p, stuckInspiratoryValve: false, stuckExpiratoryValve: false }));
                    if (logEvent) logEvent("✅ Circuit unidirectional valves freed. CO₂ rebreathing resolved.");
                  } else {
                    setPatient(p => ({ ...p, stuckInspiratoryValve: true }));
                    if (logEvent) logEvent("⚠️ Inspiratory unidirectional valve stuck OPEN. Expired gas can now enter the inspiratory limb → CO₂ rebreathing. Monitor: rising FiCO₂ and EtCO₂. Fix: check and replace valve.");
                  }
                } else if (action === 'flush') {
                  const isInsp = patient?.ventilationStatus === 'mechanical' || patient?.ventilationStatus === 'assisted';
                  const aplSetting = typeof patient?.aplValveSetting === 'number' ? patient.aplValveSetting : 0;
                  const closedApl = aplSetting >= 55;
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
                    if (logEvent) logEvent("🚨 BAROTRAUMA! O₂ flush valve pressed against near-closed APL or during PPV inspiration. High-flow 100% O₂ (35–75 L/min) generated supraphysiologic airway pressure → TENSION PNEUMOTHORAX.");
                  } else {
                    if (logEvent) logEvent("💨 O₂ flush valve pressed (~50 L/min, 100% O₂). Circuit washed out with O₂ — FiO₂ and O₂ buffer transiently maximized. Vaporizer dial unchanged; EtAgent will fall briefly then recover. Avoid flushing during active PPV or with APL near-closed.");
                  }
                } else if (action === 'canister') {
                  setPatient(p => ({
                    ...p,
                    absorbent: { waterContent: 15.0, temperature: 22.0, type: 'soda_lime' },
                    co2AbsorptiveCapacity: 100.0,
                    isAirwayFire: false,
                    hasCoPoisoningLog: false,
                    hasCompoundALog: false,
                    hasAbsorbentExhaustedLog: false,
                  }));
                  if (logEvent) logEvent("✅ CO₂ absorbent canister replaced with fresh, hydrated soda lime (water content 13–15%, temp 22°C). Capacity restored to 100%. CO compound A and CO production risk eliminated.");
                }
              }}
              className="w-full glass-input text-xs font-bold text-red-300 border border-white/10 rounded-xl outline-none appearance-none px-2.5 py-1.5 text-center h-9 sm:h-10 cursor-pointer hover:border-red-500/80 transition font-mono bg-slate-950/70"
            >
              <option value="" disabled>🛠️ Troubleshooting Overrides</option>
              <option value="flush">💨 Press Oxygen Flush Valve</option>
              <option value="canister">🔄 Replace CO₂ Absorbent</option>
              <option value="cylinder">
                {patient?.isO2CylinderOpen ? '🛢️ Close Backup O₂ Cylinder' : '🛢️ Open Backup O₂ Cylinder'}
              </option>
              <option value="disconnect">
                {patient?.isO2PipelineDisconnected ? '🔌 Connect O₂ Pipeline' : '🔌 Disconnect O₂ Pipeline'}
              </option>
              <option value="crossover">
                {patient?.isO2PipelineCrossover ? '⚠️ Fix Pipeline Crossover' : '⚠️ Simulate Pipeline Crossover'}
              </option>
              <option value="valves">
                {(patient?.stuckInspiratoryValve || patient?.stuckExpiratoryValve) ? '🔄 Unstick Unidirectional Valves' : '🔄 Stick Inspiratory Valve Open'}
              </option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
