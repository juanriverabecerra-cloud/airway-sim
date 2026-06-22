import { Brain, ShieldAlert, Award } from 'lucide-react';
import { calculatePacuReadiness } from '../../engine/OutcomeScoringEngine.ts';

export const MemoryPanel = ({ patient, vitals, setPatient, logEvent, toggleBis, toggleTof, toggleTofMode, surgicalPhase }) => {
  const isBis = patient?.hasBisMonitor;
  const isTof = patient?.hasTofMonitor;
  // Visible from Emergence onward, since that's when recovery readiness actually becomes
  // a real decision the user needs to make before transferring the patient to PACU.
  const showPacuReadiness = surgicalPhase === 'Emergence' || surgicalPhase === 'PACU';
  const pacuReadiness = showPacuReadiness ? calculatePacuReadiness(vitals, patient) : null;
  const isQualitativeTof = isTof && patient?.tofMonitorMode === 'qualitative';
  // Chapter 28, Miller's 9th Ed: a manual/tactile peripheral nerve stimulator cannot reliably perceive
  // fade once the true TOF ratio exceeds ~0.30-0.40, so a clinician relying on it sees "no fade" (falsely
  // reassuring) despite clinically significant residual blockade. Quantitative (AMG) monitoring shows the
  // true value at all times.
  const displayTofCount = isQualitativeTof ? vitals?.perceivedTofCount : vitals?.tofCount;
  const displayTofRatio = isQualitativeTof ? vitals?.perceivedTofRatio : vitals?.tofRatio;

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
            Neuro & Neuromuscular Monitors
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
          {isTof && (
            <button
              onClick={() => { if (toggleTofMode) toggleTofMode(); }}
              title="Chapter 28: Qualitative (manual tactile/visual PNS) monitoring cannot reliably detect fade above a TOF ratio of ~0.40, unlike Quantitative (AMG) monitoring."
              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all ${
                isQualitativeTof
                  ? 'bg-amber-950/50 text-amber-400 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                  : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400 font-normal'
              }`}
            >
              {isQualitativeTof ? '◔ Qualitative (Manual)' : '◉ Quantitative (AMG)'}
            </button>
          )}
        </div>
      </div>

      {pacuReadiness && (
        <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5 flex items-center justify-between border-b border-slate-900 pb-1.5">
            <span>PACU Readiness (Aldrete-style)</span>
            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase border ${pacuReadiness.isReadyForDischarge ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-red-950/40 text-red-400 border-red-500/20'}`}>
              {pacuReadiness.totalScore}/{pacuReadiness.maxScore}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-[9.5px] font-mono">
            {Object.values(pacuReadiness.criteria).map((c) => (
              <div key={c.label} className="flex items-center justify-between bg-slate-900/30 px-2 py-1 rounded border border-slate-850">
                <span className="text-slate-400">{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-500">{c.detail}</span>
                  <span className={`font-black ${c.points === 2 ? 'text-emerald-400' : c.points === 1 ? 'text-amber-400' : 'text-red-400'}`}>{c.points}/{c.maxPoints}</span>
                </span>
              </div>
            ))}
          </div>
          <div className={`text-[9.5px] leading-snug ${pacuReadiness.isReadyForDischarge ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pacuReadiness.isReadyForDischarge
              ? 'Meets conventional PACU transfer readiness (score ≥ 9/10, no criterion at 0).'
              : 'Below conventional PACU transfer readiness. Transferring now will be recorded as a quality-of-care event.'}
          </div>
        </div>
      )}

      {!isBis && !isTof ? (
        <div className="flex flex-col gap-4 py-8">
          <div className="flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-6">
            <ShieldAlert className="text-purple-500/40" size={36} />
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Diagnostic Monitors Offline
            </div>
            <div className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed">
              Connect processed EEG (BIS) or neuromuscular transmission (TOF) monitors to begin real-time subcortical and synaptic diagnostics.
            </div>
            <div className="flex gap-2.5 mt-2">
              <button 
                onClick={() => { if (toggleBis) toggleBis(); }} 
                className="glass-button glass-button-purple text-[9px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-lg"
              >
                Attach BIS Monitor
              </button>
              <button 
                onClick={() => { if (toggleTof) toggleTof(); }} 
                className="glass-button glass-button-purple text-[9px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-lg"
              >
                Attach TOF Monitor
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 font-mono text-[11px]">
          {/* TOF Monitor Panel */}
          {isTof && (
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5 flex items-center justify-between border-b border-slate-900 pb-1.5">
                <span>Neuromuscular Transmission (TOF)</span>
                <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase border ${isQualitativeTof ? 'bg-amber-950/40 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-orange-400 border-orange-500/10'}`}>
                  {isQualitativeTof ? 'MANUAL PNS' : 'ACTIVE (AMG)'}
                </span>
              </div>
              {isQualitativeTof && (
                <div className="text-[9px] text-amber-400/90 leading-snug bg-amber-950/20 border border-amber-900/30 rounded p-1.5">
                  Manual tactile/visual assessment cannot detect fade once the true TOF ratio exceeds ~40%. Values below reflect what a clinician would perceive, not ground truth.
                </div>
              )}

              {/* Genotype Parameters summary */}
              <div className="text-[9.5px] text-slate-400 font-mono flex justify-between bg-slate-900/30 p-2 rounded border border-slate-850">
                <span>Genotype: <strong className="text-orange-400 uppercase">{patient?.butyrylcholinesteraseVariant === 'atypical' ? 'Atypical (E1a-E1a)' : patient?.butyrylcholinesteraseVariant === 'heterozygous' ? 'Heterozygous (E1u-E1a)' : 'Normal (E1u-E1u)'}</strong></span>
                <span>Dibucaine No: <strong className="text-orange-400">{patient?.butyrylcholinesteraseVariant === 'atypical' ? 20 : patient?.butyrylcholinesteraseVariant === 'heterozygous' ? 50 : 80}</strong></span>
              </div>

              {/* Twitch height indicators bar chart */}
              <div className="flex gap-4 justify-around py-3 bg-slate-900/35 border border-slate-900 rounded-lg">
                {[
                  { label: 'T1', val: vitals?.t1 },
                  { label: 'T2', val: vitals?.t2 },
                  { label: 'T3', val: vitals?.t3 },
                  { label: 'T4', val: vitals?.t4 }
                ].map((twitch, idx) => {
                  const rawVal = typeof twitch.val === 'number' && isFinite(twitch.val) ? twitch.val : 1.0;
                  const isBlocked = rawVal <= 0.001;
                  // Qualitative (tactile/visual) assessment can perceive whether a twitch is present or
                  // absent, but not grade its relative height - so display it as either fully present or
                  // absent rather than the true continuous height (Ch28, Miller's 9th Ed).
                  const val = isQualitativeTof ? (isBlocked ? 0 : 1.0) : rawVal;
                  const percent = Math.round(val * 100);
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 w-12">
                      <span className="text-[9px] font-bold text-slate-500 font-mono">{twitch.label}</span>
                      <div className="w-6 bg-slate-950 h-24 rounded-md border border-slate-850 overflow-hidden relative flex flex-col justify-end p-0.5">
                        {!isBlocked ? (
                          <div 
                            className="bg-gradient-to-t from-orange-600 to-amber-400 w-full rounded-sm transition-all duration-500 ease-out" 
                            style={{ height: `${percent}%` }}
                          />
                        ) : (
                          <div className="absolute inset-0 border border-dashed border-slate-900 rounded-sm flex items-center justify-center">
                            <span className="text-[9px] text-slate-800 font-black font-mono">X</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[8.5px] font-mono font-black ${isBlocked ? 'text-slate-700' : 'text-slate-300'}`}>
                        {isBlocked ? '0%' : `${percent}%`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* TOF Statistics */}
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col justify-between">
                  <span className="text-[8.5px] text-slate-500 uppercase block mb-1">TOF Count</span>
                  <span className="font-black text-xs text-orange-400">
                    {displayTofCount !== undefined ? `${displayTofCount}/4` : '4/4'}
                  </span>
                </div>
                <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col justify-between">
                  <span className="text-[8.5px] text-slate-500 uppercase block mb-1">TOF Ratio</span>
                  <span className="font-black text-xs text-orange-400">
                    {displayTofCount === 4 && displayTofRatio !== undefined ? `${Math.round(displayTofRatio * 100)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Block Level Indicator */}
              <div className="bg-slate-900/40 p-2 border border-slate-855 rounded flex justify-between items-center p-2 border border-slate-850 text-[10px]">
                <span className="text-slate-500 uppercase font-black text-[9px]">Block Depth</span>
                <span className="font-black uppercase text-orange-400">
                  {displayTofCount === 0 ? 'Profound Block (occupancy > 95%)' :
                   displayTofCount === 1 ? 'Deep Block (occupancy ~ 90%)' :
                   displayTofCount === 2 || displayTofCount === 3 ? 'Moderate Block (occupancy 75-85%)' :
                   displayTofRatio < 0.90 ? 'Residual Block (occupancy < 75%)' : 'Fully Recovered'}
                </span>
              </div>

              {/* Reversal / Extubation Safety Alert */}
              <div className={`p-2 rounded-lg border text-[9.5px] leading-normal flex items-start gap-1.5 ${
                displayTofCount === 4 && displayTofRatio >= 0.90
                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
                  : 'bg-red-950/30 border-red-900/40 text-red-400 animate-pulse border-dashed'
              }`}>
                {displayTofCount === 4 && displayTofRatio >= 0.90 ? (
                  <>
                    <span className="font-black uppercase block shrink-0 text-emerald-400">✓ SAFE{isQualitativeTof ? ' (perceived)' : ''}:</span>
                    <span>TOF Ratio is ≥ 90%. Neuromuscular transmission is adequately restored for safe extubation.{isQualitativeTof && vitals?.tofRatio < 0.90 ? ' ⚠️ This reading may be a false negative — manual assessment cannot detect residual fade above a 40% true ratio.' : ''}</span>
                  </>
                ) : (
                  <>
                    <span className="font-black uppercase block shrink-0 text-red-400">⚠️ RISK:</span>
                    <span>Residual blockade present. High risk of post-op respiratory failure. Do NOT extubate.</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Processed EEG / BIS Monitor Panel */}
          {isBis && (
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-4">
              {/* Section: Consciousness State */}
              <div className="flex flex-col gap-2 border-b border-slate-900 pb-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1 flex items-center justify-between">
                  <span>Connected Consciousness</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${patient?.isAwarenessActive ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' : 'bg-slate-900 text-slate-500'}`}>
                    {patient?.isAwarenessActive ? 'ACTIVE 🚨' : 'DISCONNECTED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="bg-slate-900/40 p-2 border border-slate-850 rounded">
                    <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Explicit Recall</span>
                    <span className={`font-black uppercase ${patient?.hasExplicitRecall ? 'text-red-400' : 'text-slate-500'}`}>
                      {patient?.hasExplicitRecall ? 'Consolidated 🚨' : 'None'}
                    </span>
                  </div>
                  <div className="bg-slate-900/40 p-2 border border-slate-850 rounded">
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
              <div className="flex flex-col gap-2.5 border-b border-slate-900 pb-3">
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
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (patient?.explicitEncoding || 0) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Consolidation Decay */}
                  <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-slate-850 rounded">
                    <span className="text-slate-400 uppercase">Consolidation Decay (ψ)</span>
                    <span className="text-slate-200 font-bold">{(patient?.explicitConsolidation || 0.1).toFixed(2)}</span>
                  </div>

                  {/* LTP Inhibition */}
                  <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-slate-850 rounded">
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
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-855 border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${patient?.ptsdScore > 50 ? 'bg-red-500' : 'bg-orange-500'}`}
                        style={{ width: `${patient?.ptsdScore || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Pathway Connectivities */}
              <div className="flex flex-col gap-2 border-b border-slate-900 pb-3">
                <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1">
                  Cortical Connectivities
                </span>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col justify-between">
                    <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Thalamocortical</span>
                    <div className="flex justify-between items-end">
                      <span className="font-black text-xs text-slate-200">{formatPercent(patient?.thalamocorticalConn)}</span>
                      <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                        <div className="bg-cyan-500 h-full" style={{ width: `${(patient?.thalamocorticalConn || 0) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col justify-between">
                    <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Frontoparietal</span>
                    <div className="flex justify-between items-end">
                      <span className="font-black text-xs text-slate-200">{formatPercent(patient?.frontoparietalFeedback)}</span>
                      <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                        <div className="bg-teal-500 h-full" style={{ width: `${(patient?.frontoparietalFeedback || 0) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col justify-between">
                    <span className="text-[8.5px] text-slate-500 uppercase block mb-1">Corticocortical</span>
                    <div className="flex justify-between items-end">
                      <span className="font-black text-xs text-slate-200">{formatPercent(patient?.corticocorticalConn)}</span>
                      <div className="w-12 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: `${(patient?.corticocorticalConn || 0) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col justify-between">
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
              <div className="flex flex-col gap-2 border-b border-slate-900 pb-3">
                <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1">
                  Sleep-Wake Nuclei Activity
                </span>

                <div className="bg-slate-900/20 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                  {/* Locus Ceruleus */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-1/3">LC (NE)</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className={`h-full ${getNucleusColorClass(patient?.lcActivity)}`} style={{ width: `${Math.min(100, (patient?.lcActivity || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.lcActivity || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* TMN */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-1/3">TMN (Hist)</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-855 border-slate-850 overflow-hidden relative flex items-center">
                      <div className={`h-full ${getNucleusColorClass(patient?.tmnActivity)}`} style={{ width: `${Math.min(100, (patient?.tmnActivity || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.tmnActivity || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* VLPO */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-1/3">VLPO (GABA)</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className={`h-full ${getNucleusColorClass(patient?.vlpoActivity)}`} style={{ width: `${Math.min(100, (patient?.vlpoActivity || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.vlpoActivity || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Orexin */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-1/3">Orexin</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className={`h-full ${getNucleusColorClass(patient?.orexinLevel)}`} style={{ width: `${Math.min(100, (patient?.orexinLevel || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{(patient?.orexinLevel || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* VTA */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-1/3">VTA (DA)</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-855 border-slate-850 overflow-hidden relative flex items-center">
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

                <div className="bg-slate-900/20 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                  {/* GABA-A Occupancy */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">GABA-A Occupancy</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className="h-full bg-indigo-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.gabaa_occupancy || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.gabaa_occupancy)}</span>
                    </div>
                  </div>

                  {/* Glycine Occupancy */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">Glycine Occupancy</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-855 border-slate-850 overflow-hidden relative flex items-center">
                      <div className="h-full bg-cyan-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.glycine_occupancy || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.glycine_occupancy)}</span>
                    </div>
                  </div>

                  {/* K2P Activation */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">K2P Activation</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className="h-full bg-emerald-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.k2p_activation || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.k2p_activation)}</span>
                    </div>
                  </div>

                  {/* NMDA Blockade */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">NMDA Blockade</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className="h-full bg-rose-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.nmda_blockade || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.nmda_blockade)}</span>
                    </div>
                  </div>

                  {/* HCN Inhibition */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">HCN Inhibition</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className="h-full bg-yellow-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.hcn_inhibition || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.hcn_inhibition)}</span>
                    </div>
                  </div>

                  {/* Nav Blockade */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">Nav Blockade</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                      <div className="h-full bg-blue-500/85 transition-all duration-300" style={{ width: `${Math.min(100, (patient?.nav_blockade || 0) * 100)}%` }} />
                      <span className="absolute right-1.5 text-[8.5px] font-black text-slate-300 leading-none">{formatPercent(patient?.nav_blockade)}</span>
                    </div>
                  </div>

                  {/* nAChR Inhibition */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase w-[40%]">nAChR Inhibition</span>
                    <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
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

          {/* Offline Footer Warnings */}
          {!isBis && (
            <div className="bg-slate-950/35 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between gap-3 text-[10px]">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-400 uppercase">EEG / BIS Offline</span>
                <span className="text-slate-500 text-[8.5px]">Attach BIS monitor to track subcortical Sleep-Wake nuclei and memory parameters.</span>
              </div>
              <button 
                onClick={() => { if (toggleBis) toggleBis(); }}
                className="glass-button glass-button-purple text-[8.5px] font-black uppercase py-1 px-2.5 rounded shrink-0 border border-purple-900/60"
              >
                Attach BIS
              </button>
            </div>
          )}

          {!isTof && (
            <div className="bg-slate-950/35 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between gap-3 text-[10px]">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-400 uppercase">TOF Monitor Offline</span>
                <span className="text-slate-500 text-[8.5px]">Attach TOF monitor to visualize neuromuscular twitches and assess extubation safety.</span>
              </div>
              <button 
                onClick={() => { if (toggleTof) toggleTof(); }}
                className="glass-button glass-button-purple text-[8.5px] font-black uppercase py-1 px-2.5 rounded shrink-0 border border-purple-900/60"
              >
                Attach TOF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
