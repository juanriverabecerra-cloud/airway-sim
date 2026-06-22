import { Undo2, FileText } from 'lucide-react';
import { AetherisLogo } from './AetherisLogo';

export const PatientHeader = ({ 
  activeCase, 
  patient, 
  setActiveCase, 
  handleUndo, 
  history, 
  showLabPanel, 
  setShowLabPanel, 
  isRunning, 
  setIsRunning, 
  setShowPreOp,
  showFidelityPanel,
  setShowFidelityPanel,
  surgicalPhase,
  setSurgicalPhase,
  msmaidsComplete,
  setMsmaidsModal,
  logEvent
}) => {
  return (
    <>
      <header className="flex flex-col glass-panel glass-emerald p-4 gap-4 relative z-10">
        {/* Top Row: Demographics & Controls */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center w-full gap-4">
          <div className="flex flex-col gap-2 w-full xl:w-auto">
            <div className="flex items-center gap-3">
              <AetherisLogo 
                className="w-8 h-8 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200" 
                glow={false} 
                onClick={() => {
                  logEvent("🏠 Navigating back to home screen via header logo click");
                  setActiveCase(null);
                }} 
              />
              <h1 className="text-2xl font-black tracking-tight text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">{activeCase.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-white/5 font-mono">
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Age:</span> {patient?.age ?? '--'}</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Sex:</span> {patient?.sex ?? '--'}</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Height:</span> {patient?.height ?? '--'} cm</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">TBW:</span> {Math.round(patient?.weight || 0)} kg</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">IBW:</span> {Math.round(patient?.ibw || 0)} kg</span>
              <span className={`ml-auto xl:ml-2 border-l border-slate-800 pl-3 ${patient?.bmi > 30 ? 'text-orange-400 font-bold animate-pulse' : ''}`}><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">BMI:</span>{(patient?.bmi || 22).toFixed(1)}</span>
              <span className="text-red-300 ml-2 border-l border-slate-800 pl-3 bg-red-950/30 px-2.5 py-0.5 rounded-md border border-red-900/30"><span className="text-red-400 font-extrabold uppercase tracking-wider text-[10px] mr-1">EBL:</span>{Math.round(patient?.ebl || 0)} mL</span>
            </div>
            
            {/* Surgical Phase Timeline */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 border border-white/5 p-1 rounded-xl font-mono text-[9px] font-black uppercase tracking-wider w-full xl:w-auto">
              <span className="text-slate-500 px-2 py-1 text-[8px] font-extrabold uppercase font-mono">CASE PHASE:</span>
              {['Pre-Op', 'Induction', 'Incision', 'Maintenance', 'Emergence', 'PACU'].map((phase) => {
                const isLockedInduction = phase === 'Induction' && !msmaidsComplete && !patient?.emergentRSI;
                const isActive = surgicalPhase === phase;
                
                let btnStyle;
                if (isActive) {
                  btnStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.35)]';
                } else if (isLockedInduction) {
                  btnStyle = 'border border-dashed border-red-950 text-red-400/60 hover:bg-red-950/20';
                } else {
                  btnStyle = 'border border-white/5 text-slate-400 hover:bg-white/5';
                }

                const handleClick = () => {
                  if (isLockedInduction) {
                    logEvent("⚠️ CLINICAL INTERLOCK BLOCKED: Induction phase locked. Complete MSMAIDS pre-induction checklist first.");
                    if (setMsmaidsModal) setMsmaidsModal(true);
                    return;
                  }
                  if (setSurgicalPhase) setSurgicalPhase(phase);
                };

                return (
                  <button
                    key={phase}
                    onClick={handleClick}
                    className={`px-2.5 py-1 rounded-lg transition-all text-center flex items-center gap-1 ${btnStyle}`}
                    title={isLockedInduction ? "Induction Locked: Complete MSMAIDS setup checklist first" : ""}
                  >
                    {isLockedInduction ? '🔒 ' : ''}{phase}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 w-full xl:w-auto font-mono">
            <button onClick={() => setActiveCase(null)} className="px-4 py-2 glass-button hover:bg-slate-800/40 text-xs md:text-sm font-bold flex-1 xl:flex-none whitespace-nowrap">End Case</button>
            <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 glass-button glass-button-purple text-xs md:text-sm font-bold flex-1 xl:flex-none disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"><Undo2 size={14} /> Undo</button>
            
            {activeCase?.preOpBriefing && (
              <button onClick={() => setShowPreOp(true)} className="px-4 py-2 glass-button glass-button-blue text-xs md:text-sm font-bold flex items-center justify-center flex-1 xl:flex-none whitespace-nowrap">
                <FileText size={14} className="mr-1 shrink-0" /> Pre-Op EMR
              </button>
            )}

            <button 
              onClick={() => setShowFidelityPanel(!showFidelityPanel)} 
              className={`px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-center flex-1 xl:flex-none whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border ${
                showFidelityPanel 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-black' 
                  : 'glass-button hover:bg-slate-800/40 text-slate-300 border-slate-700'
              }`}
            >
              🔬 FIDELITY AUDIT
            </button>

            <button onClick={() => setShowLabPanel(!showLabPanel)} className="px-4 py-2 glass-button glass-button-purple text-xs md:text-sm font-bold flex items-center justify-center flex-1 xl:flex-none whitespace-nowrap">Live Labs</button>
            
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className={`px-6 py-2 rounded-lg text-xs md:text-sm font-bold shadow-lg transition duration-200 active:scale-95 w-full xl:w-auto whitespace-nowrap ${
                isRunning 
                  ? 'glass-button-rose text-red-200 hover:bg-red-950 border border-red-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse' 
                  : 'glass-button-emerald text-green-200 hover:bg-green-950 border border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isRunning ? 'PAUSE SIM' : 'START SIM'}
            </button>
          </div>
        </div>

        {/* Bottom Row: FRC Oxygen Buffer / Denitrogenation Status */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 w-full shadow-inner">
          <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest min-w-max font-mono">Pre-Ox FRC</p>
          
          {(() => {
            const frcL = (patient?.lungVolumes && patient?.lungVolumes?.frc_L) || 2.5;
            const bufferPct = Math.min(100, Math.max(0, ((patient?.oxygenBuffer || 0) / frcL) * 100));
            return (
              <>
                <div className="h-6 w-full bg-slate-900/60 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
                   <div className="absolute top-0 bottom-0 left-0 w-[21%] bg-red-950/30"></div>
                   <div className="absolute top-0 bottom-0 left-[21%] border-l-2 border-red-500/30 z-10"></div>
                   <span className="absolute top-[5px] left-[22%] text-[8px] font-black text-red-400/80 z-10 leading-none font-mono">RA (21%)</span>
                   
                   <div className="absolute top-0 bottom-0 left-[90%] border-l-2 border-green-500/30 z-10"></div>
                   <span className="absolute top-[5px] left-[91%] text-[8px] font-black text-green-400/80 z-10 leading-none font-mono">TARGET</span>
                   <div className="absolute top-0 bottom-0 left-[90%] right-0 bg-green-950/10"></div>
 
                   <div 
                     className={`h-full transition-all duration-1000 ease-linear relative ${
                       bufferPct < 21 ? 'bg-gradient-to-r from-red-600 to-red-500' : (bufferPct > 88 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400')
                     }`} 
                     style={{width: `${bufferPct}%`}}
                   >
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10"></div>
                   </div>
                </div>
 
                <div className="flex items-center justify-between w-full md:w-auto gap-4 md:min-w-max font-mono">
                   <span className={`font-black text-lg w-12 text-right ${bufferPct < 21 ? 'text-red-500 animate-pulse' : (bufferPct > 88 ? 'text-emerald-400' : 'text-cyan-400')}`}>
                     {Math.round(bufferPct)}%
                   </span>
                   <div className="text-slate-500 text-[9px] leading-tight border-l border-slate-800 pl-3">
                     Device:<br/><span className="text-slate-200 font-bold text-xs">{patient?.currentO2Device || 'None'}</span>
                   </div>
                </div>
              </>
            );
          })()}
        </div>
      </header>
    </>
  );
};