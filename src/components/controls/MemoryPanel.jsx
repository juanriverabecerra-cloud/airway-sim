import { Brain, ShieldAlert, Award } from 'lucide-react';

export const MemoryPanel = ({ patient, setPatient, logEvent, toggleBis, toggleTof }) => {
  const isBis = patient?.hasBisMonitor;

  const triggerFearRecall = () => {
    if (patient?.fearMemoryRetrieved) return;
    setPatient(prev => ({ ...prev, fearMemoryRetrieved: true }));
    logEvent("Cue presented to retrieve consolidated traumatic fear memory. Reconsolidation window opened.");
  };

  const formatPercent = (val) => {
    if (typeof val !== 'number') return '0%';
    return `${Math.round(val * 100)}%`;
  };

  const getNucleusColorClass = (val) => {
    if (val > 0.7) return 'bg-emerald-500';
    if (val > 0.3) return 'bg-yellow-500';
    return 'bg-slate-700';
  };

  return (
    <div className="glass-panel glass-purple p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px]">
      <div className="flex items-center justify-between border-b border-purple-900 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="text-purple-400 shrink-0" size={18} />
          <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-200">
            Neuro & EEG Monitors
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { if (toggleBis) toggleBis(); }} 
            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all ${
              patient?.hasBisMonitor 
                ? 'bg-purple-950/65 text-purple-300 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.35)]' 
                : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400 font-normal'
            }`}
          >
            {patient?.hasBisMonitor ? '✓ BIS On' : 'Attach BIS'}
          </button>
          <button 
            onClick={() => { if (toggleTof) toggleTof(); }} 
            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all ${
              patient?.hasTofMonitor 
                ? 'bg-purple-950/65 text-purple-300 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.35)]' 
                : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400 font-normal'
            }`}
          >
            {patient?.hasTofMonitor ? '✓ TOF On' : 'Attach TOF'}
          </button>
        </div>
      </div>

      {!isBis ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
          <ShieldAlert className="text-purple-500/40" size={36} />
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            EEG / BIS Monitor Not Connected
          </div>
          <div className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
            Attach the BIS monitor to initialize raw processed EEG waveforms and cognitive pathway metrics.
          </div>
          <button 
            onClick={() => { if (toggleBis) toggleBis(); }} 
            className="mt-2 glass-button glass-button-purple text-[9px] font-black uppercase tracking-wider py-1 px-3.5 rounded-lg"
          >
            Attach BIS Monitor
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 font-mono text-[11px]">
          {/* Section: Consciousness State */}
          <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1 flex items-center justify-between">
              <span>Connected Consciousness</span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${patient?.isAwarenessActive ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' : 'bg-slate-900 text-slate-500'}`}>
                {patient?.isAwarenessActive ? 'ACTIVE 🚨' : 'DISCONNECTED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="bg-slate-900/40 p-2 border border-slate-800/60 rounded">
                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Explicit Recall</span>
                <span className={`font-black uppercase ${patient?.hasExplicitRecall ? 'text-red-400' : 'text-slate-500'}`}>
                  {patient?.hasExplicitRecall ? 'Consolidated 🚨' : 'None'}
                </span>
              </div>
              <div className="bg-slate-900/40 p-2 border border-slate-800/60 rounded">
                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Implicit Priming</span>
                <span className={`font-black uppercase ${patient?.hasImplicitRecall ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {patient?.hasImplicitRecall ? 'Consolidated' : 'None'}
                </span>
              </div>
            </div>

            {patient?.displayEmergenceLag && (
              <div className="bg-orange-950/30 border border-orange-900/40 rounded p-2 text-[10px] text-orange-400 leading-normal animate-pulse">
                <span className="font-extrabold uppercase block mb-0.5">⚠️ Neural Inertia Active</span>
                Hysteresis emergence lag is delaying wakefulness despite clearing anesthetic agents.
              </div>
            )}
          </div>

          {/* Section: Memory Matrices */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1">
              Memory System parameters
            </span>

            <div className="flex flex-col gap-2">
              {/* Explicit Encoding */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 uppercase">Episodic Encoding (λ)</span>
                  <span className="text-slate-200 font-bold">{formatPercent(patient?.explicitEncoding)}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (patient?.explicitEncoding || 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Consolidation Decay */}
              <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-slate-800/60 rounded">
                <span className="text-slate-400 uppercase">Consolidation Decay (ψ)</span>
                <span className="text-slate-200 font-bold">{(patient?.explicitConsolidation || 0.1).toFixed(2)}</span>
              </div>

              {/* LTP Inhibition */}
              <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-slate-800/60 rounded">
                <span className="text-slate-400 uppercase">Hippocampal LTP Status</span>
                <span className={`font-bold uppercase ${patient?.ltpInductionInhibited ? 'text-red-400' : 'text-emerald-400'}`}>
                  {patient?.ltpInductionInhibited ? 'INHIBITED 🚫' : 'ACTIVE'}
                </span>
              </div>

              {/* PTSD Risk Score */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 uppercase">PTSD Risk Score</span>
                  <span className={`font-bold ${patient?.ptsdScore > 50 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                    {(patient?.ptsdScore || 0.0).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${patient?.ptsdScore > 50 ? 'bg-red-500' : 'bg-orange-500'}`}
                    style={{ width: `${patient?.ptsdScore || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Pathway Connectivities */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1">
              Cortical Connectivities
            </span>

            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="bg-slate-900/40 p-2 border border-slate-800/60 rounded flex flex-col justify-between">
                <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Thalamocortical</span>
                <div className="flex justify-between items-end">
                  <span className="font-black text-xs text-slate-200">{formatPercent(patient?.thalamocorticalConn)}</span>
                  <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                    <div className="bg-cyan-500 h-full" style={{ width: `${(patient?.thalamocorticalConn || 0) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 p-2 border border-slate-800/60 rounded flex flex-col justify-between">
                <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Frontoparietal</span>
                <div className="flex justify-between items-end">
                  <span className="font-black text-xs text-slate-200">{formatPercent(patient?.frontoparietalFeedback)}</span>
                  <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                    <div className="bg-teal-500 h-full" style={{ width: `${(patient?.frontoparietalFeedback || 0) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 p-2 border border-slate-800/60 rounded flex flex-col justify-between">
                <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Corticocortical</span>
                <div className="flex justify-between items-end">
                  <span className="font-black text-xs text-slate-200">{formatPercent(patient?.corticocorticalConn)}</span>
                  <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${(patient?.corticocorticalConn || 0) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 p-2 border border-slate-800/60 rounded flex flex-col justify-between">
                <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Basal Ganglia</span>
                <div className="flex justify-between items-end">
                  <span className="font-black text-xs text-slate-200">{formatPercent(patient?.basalGangliaConn)}</span>
                  <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${(patient?.basalGangliaConn || 0) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Subcortical Nuclei */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1">
              Sleep-Wake Nuclei Activity
            </span>

            <div className="bg-slate-900/20 border border-slate-900/80 rounded-lg p-2.5 flex flex-col gap-2">
              {/* Locus Ceruleus */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-1/3">LC (NE)</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className={`h-full ${getNucleusColorClass(patient?.lcActivity)}`} style={{ width: `${Math.min(100, (patient?.lcActivity || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.lcActivity || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* TMN */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-1/3">TMN (Hist)</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className={`h-full ${getNucleusColorClass(patient?.tmnActivity)}`} style={{ width: `${Math.min(100, (patient?.tmnActivity || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.tmnActivity || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* VLPO */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-1/3">VLPO (GABA)</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className={`h-full ${getNucleusColorClass(patient?.vlpoActivity)}`} style={{ width: `${Math.min(100, (patient?.vlpoActivity || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.vlpoActivity || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Orexin */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-1/3">Orexin</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className={`h-full ${getNucleusColorClass(patient?.orexinLevel)}`} style={{ width: `${Math.min(100, (patient?.orexinLevel || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.orexinLevel || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* VTA */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-1/3">VTA (DA)</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className={`h-full ${getNucleusColorClass(patient?.vtaActivity)}`} style={{ width: `${Math.min(100, (patient?.vtaActivity || 0) * 50)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.vtaActivity || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Molecular Receptor Diagnostics */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1">
              Molecular Receptor Diagnostics
            </span>

            <div className="bg-slate-900/20 border border-slate-900/80 rounded-lg p-2.5 flex flex-col gap-2">
              {/* GABA-A Occupancy */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">GABA-A Occupancy</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-indigo-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.gabaa_occupancy || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.gabaa_occupancy)}</span>
                </div>
              </div>

              {/* Glycine Occupancy */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">Glycine Occupancy</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-cyan-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.glycine_occupancy || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.glycine_occupancy)}</span>
                </div>
              </div>

              {/* K2P Activation */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">K2P Activation</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-emerald-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.k2p_activation || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.k2p_activation)}</span>
                </div>
              </div>

              {/* NMDA Blockade */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">NMDA Blockade</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-rose-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.nmda_blockade || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.nmda_blockade)}</span>
                </div>
              </div>

              {/* HCN Inhibition */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">HCN Inhibition</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-yellow-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.hcn_inhibition || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.hcn_inhibition)}</span>
                </div>
              </div>

              {/* Nav Blockade */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">Nav Blockade</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-blue-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.nav_blockade || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.nav_blockade)}</span>
                </div>
              </div>

              {/* nAChR Inhibition */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase w-[40%]">nAChR Inhibition</span>
                <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-800 overflow-hidden relative flex items-center">
                  <div className="h-full bg-orange-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.nachr_inhibition || 0) * 100)}%` }} />
                  <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.nachr_inhibition)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Action Buttons */}
          <div className="border-t border-purple-900/40 pt-3 flex flex-col gap-2">
            {patient?.reconsolidationWindowOpen ? (
              <div className="bg-purple-950/30 border border-purple-900/60 rounded p-2.5 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-purple-400">
                  <span className="uppercase">Reconsolidation Window Open</span>
                  <span>{patient?.reconsolidationTimer}s</span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span>Fear memory conditioning strength:</span>
                  <span className="font-extrabold text-purple-300">{((patient?.fearConditioning || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-purple-400 h-full" style={{ width: `${(patient?.fearConditioning || 0) * 100}%` }} />
                </div>
                {patient?.fearExtinguished && (
                  <div className="flex items-center gap-1.5 text-[9.5px] text-emerald-400 font-black uppercase mt-1 animate-pulse">
                    <Award size={12} />
                    <span>Traumatic Fear Memory Extinguished!</span>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={triggerFearRecall}
                disabled={patient?.fearMemoryRetrieved}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all border ${patient?.fearMemoryRetrieved ? 'bg-purple-950/20 border-purple-900/20 text-purple-500 cursor-not-allowed' : 'glass-button glass-button-purple text-purple-200 border-purple-800/80 hover:border-purple-600'}`}
              >
                PRESENT FEAR MEMORY RETRIEVAL CUE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
