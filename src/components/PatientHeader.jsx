import { useState } from 'react';
import { Undo2, FileText, CheckCircle2, Lock, Unlock, ShieldAlert, Check, FlaskConical, FastForward, Gauge, Dna } from 'lucide-react';
import { AetherisLogo } from './AetherisLogo';

export const PatientHeader = ({
  activeCase,
  patient,
  vitals,
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
  showReceptorPanel,
  setShowReceptorPanel,
  uiFontScale,
  setUiFontScale,
  surgicalPhase,
  setSurgicalPhase,
  msmaidsComplete,
  setMsmaidsModal,
  logEvent,
  setPatient,
  onOpenUltrasoundStudio
}) => {
  const FONT_MIN = 0.80;
  const FONT_MAX = 1.50;
  const FONT_STEP = 0.05;
  const currentScale = uiFontScale || 1.1;
  const scalePct = Math.round(currentScale * 100);
  const decreaseFontSize = (e) => {
    e.stopPropagation();
    if (setUiFontScale) setUiFontScale(prev => Math.max(FONT_MIN, Math.round((prev - FONT_STEP) * 100) / 100));
  };
  const increaseFontSize = (e) => {
    e.stopPropagation();
    if (setUiFontScale) setUiFontScale(prev => Math.min(FONT_MAX, Math.round((prev + FONT_STEP) * 100) / 100));
  };
  const resetFontSize = (e) => {
    e.stopPropagation();
    if (setUiFontScale) setUiFontScale(1.1);
  };
  const [showTimeOutModal, setShowTimeOutModal] = useState(false);
  const [showFfDropdown, setShowFfDropdown] = useState(false);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [timeOutChecks, setTimeOutChecks] = useState({
    identity: false,
    equipment: false
  });

  const handleFastForward = (seconds) => {
    setPatient(prev => {
      const activeFF = (prev.fastForwardRemaining || 0) > 0;
      const newRemaining = (prev.fastForwardRemaining || 0) + seconds;
      const newTotal = activeFF ? ((prev.fastForwardTotal || prev.fastForwardRemaining || 0) + seconds) : newRemaining;
      return {
        ...prev,
        fastForwardRemaining: newRemaining,
        fastForwardTotal: newTotal
      };
    });
    setIsRunning(true);
    setShowFfDropdown(false);
    logEvent(`Initiated timeskip/fast-forward for ${seconds / 60} minute(s)...`);
  };

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
            {(() => {
              const steps = [
                { name: 'Pre-Op', phase: 'Pre-Op' },
                { name: 'Time-Out', phase: 'Time-Out' },
                { name: 'Induction', phase: 'Induction' },
                { name: 'Incision', phase: 'Incision' },
                { name: 'Maintenance', phase: 'Maintenance' },
                { name: 'Emergence', phase: 'Emergence' },
                { name: 'PACU', phase: 'PACU' }
              ];

              const getActiveStepIndex = () => {
                if (surgicalPhase === 'Pre-Op') {
                  if (!patient?.timeOutAuthorized) return 1; // Time-Out is active
                  return 0; // Pre-Op complete
                }
                if (surgicalPhase === 'Induction') return 2;
                if (surgicalPhase === 'Incision') return 3;
                if (surgicalPhase === 'Maintenance') return 4;
                if (surgicalPhase === 'Emergence') return 5;
                if (surgicalPhase === 'PACU') return 6;
                return 0;
              };

              const activeStepIndex = getActiveStepIndex();

              return (
                <>
                  <div className="flex items-center gap-2 bg-slate-950/60 border border-white/5 p-2 rounded-xl font-mono text-[9px] font-black uppercase tracking-wider w-full xl:w-auto overflow-x-auto select-none">
                    <span className="text-slate-500 px-1 text-[8px] font-extrabold uppercase font-mono hidden md:inline">PHASE:</span>
                    <div className="flex items-center gap-0.5 relative min-w-max">
                      {steps.map((step, index) => {
                        const isCompleted = index < activeStepIndex;
                        const isActive = index === activeStepIndex;
                        const isPending = index > activeStepIndex;

                        let nodeStyle = '';
                        let textStyle = '';
                        if (isActive) {
                          if (step.phase === 'Time-Out') {
                            nodeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse border-2';
                            textStyle = 'text-amber-300 font-bold';
                          } else {
                            nodeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)] border-2';
                            textStyle = 'text-blue-200 font-bold';
                          }
                        } else if (isCompleted) {
                          nodeStyle = 'bg-emerald-950/30 text-emerald-400 border-emerald-500/50';
                          textStyle = 'text-emerald-400/80';
                        } else {
                          nodeStyle = 'border-slate-800 text-slate-500 bg-slate-900/20';
                          textStyle = 'text-slate-600';
                        }

                        const handleClick = () => {
                          if (step.phase === 'Time-Out') {
                            setShowTimeOutModal(true);
                          } else if (setSurgicalPhase) {
                            if (!patient?.timeOutAuthorized && step.phase !== 'Pre-Op') {
                              return;
                            }
                            setSurgicalPhase(step.phase);
                          }
                        };

                        const isFirstNode = step.phase === 'Pre-Op';

                        return (
                          <div className="flex items-center animate-in fade-in duration-300" key={step.name}>
                            {!isFirstNode && (
                              <div className={`h-[2px] w-3 md:w-5 transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500/50' : (isActive ? 'bg-blue-500/40 animate-pulse' : 'bg-slate-800')
                              }`} />
                            )}

                            <button
                              onClick={handleClick}
                              data-tutorial={"phase-" + step.phase.toLowerCase().replace(" ", "-")}
                              className={`flex items-center gap-1 px-2 py-0.5 md:py-1 rounded-lg border transition-all duration-200 text-left font-mono whitespace-nowrap text-[9px] ${nodeStyle}`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                              ) : isActive && step.phase === 'Time-Out' ? (
                                <ShieldAlert size={10} className="text-amber-400 animate-bounce shrink-0" />
                              ) : (
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPending ? 'bg-slate-700' : 'bg-blue-400 animate-ping'}`} />
                              )}
                              <span className={textStyle}>{step.name}</span>
                              {isActive && step.phase === 'Time-Out' && (
                                <span className="text-[7px] bg-amber-950/50 px-1 rounded text-amber-300 font-extrabold animate-pulse border border-amber-500/20 ml-0.5">REQUIRED</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* WHO pre-induction Safety Checklist Modal */}
                  {showTimeOutModal && (
                    <div data-tutorial="timeout-modal" className="fixed left-4 top-28 z-[100] w-[380px] max-h-[calc(100vh-140px)] shadow-[0_10px_50px_rgba(0,0,0,0.85)] rounded-xl border border-amber-500/50 bg-slate-950/95 p-5 overflow-y-auto custom-scrollbar flex flex-col pointer-events-auto animate-in slide-in-from-left duration-250 font-mono text-slate-200">
                      {/* Title */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="text-amber-500 animate-bounce shrink-0" size={18} />
                          <h3 className="text-amber-400 font-black text-xs uppercase tracking-wider">WHO Checklist: Sign-In</h3>
                        </div>
                        <button 
                          onClick={() => setTimeOutChecks({ identity: true, equipment: true })}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-[9px] text-amber-300 font-extrabold uppercase transition duration-150 active:scale-95"
                        >
                          Select All
                        </button>
                      </div>
                      
                      {/* Checklist items */}
                      <div className="flex flex-col gap-4 text-xs">
                        {/* Case Verification Info */}
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                          <div className="flex justify-between border-b border-slate-950 pb-1">
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Patient identity:</span>
                            <span className="text-slate-200 font-bold">{activeCase?.name || 'Unknown Patient'}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-950 pb-1">
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Procedure:</span>
                            <span className="text-slate-200 font-bold">{activeCase?.procedure || patient?.procedure || 'Scheduled Operation'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Position:</span>
                            <span className="text-slate-200 font-bold">{patient?.position || 'Supine'}</span>
                          </div>
                        </div>

                        {/* Verification Checks */}
                        <div className="flex flex-col gap-2.5">
                          {/* Venous Access Check */}
                          {(() => {
                            const hasVenousAccess = patient?.accessLines?.some(l => !l.failed && !l.category?.includes('Arterial'));
                            const activeIV = patient?.accessLines?.find(l => !l.failed && !l.category?.includes('Arterial'));
                            return (
                              <div className={`flex flex-col gap-1.5 p-2.5 rounded border ${hasVenousAccess ? 'bg-emerald-950/20 border-emerald-950' : 'bg-red-950/20 border-red-900/40'}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Check className={hasVenousAccess ? "text-emerald-400 font-bold shrink-0" : "text-slate-500 shrink-0"} size={14} />
                                    <span className="text-slate-300 font-bold">Functional Intravenous Access</span>
                                  </div>
                                  <span className={`font-extrabold text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${
                                    hasVenousAccess ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-red-950/40 text-red-400 border-red-900/30 animate-pulse'
                                  }`}>
                                    {hasVenousAccess ? activeIV.name : 'Missing'}
                                  </span>
                                </div>
                                {!hasVenousAccess && (
                                  <div className="text-[8px] text-red-300 leading-normal font-mono bg-red-950/60 p-2 rounded border border-red-900/20 mt-1">
                                    ⚠️ DANGER: No patent intravenous line is currently established. Administering induction agents without functional IV access is a critical clinical hazard.
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Airway Assessment */}
                          <div className="flex flex-col gap-1 p-2.5 bg-slate-900/40 rounded border border-slate-850">
                            <span className="text-slate-500 font-extrabold text-[8px] uppercase tracking-wider mb-1">Pre-induction Airway Assessment:</span>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded border border-slate-950">
                                <span className="text-slate-400">Mallampati Class:</span>
                                <span className="font-bold text-slate-200">Class {patient?.mallampati || activeCase?.mallampati || 1}</span>
                              </div>
                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded border border-slate-950">
                                <span className="text-slate-400">Stomach Status:</span>
                                <span className={`font-bold ${patient?.stomach === 'full' ? 'text-amber-400 font-extrabold' : 'text-slate-200'}`}>
                                  {patient?.stomach === 'full' ? 'Full (RSI Required)' : 'Empty / NPO'}
                                </span>
                              </div>
                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded border border-slate-950 col-span-2">
                                <span className="text-slate-400">Cervical Mobility:</span>
                                <span className="font-bold text-slate-200">
                                  {patient?.hasCCollar ? '⚠️ C-Collar Immobilized' : 'Normal neck mobility'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Pre-induction Vitals Check */}
                          <div className="flex flex-col gap-1 p-2.5 bg-slate-900/40 rounded border border-slate-850">
                            <span className="text-slate-500 font-extrabold text-[8px] uppercase tracking-wider mb-1">Pre-induction baseline vitals:</span>
                            <div className="grid grid-cols-4 gap-1 text-[9px] text-center">
                              <div className="bg-slate-950/60 p-1 rounded border border-slate-950">
                                <div className="text-slate-500 font-bold uppercase text-[7px]">HR</div>
                                <div className="text-slate-200 font-bold">{vitals?.hr || 75}</div>
                              </div>
                              <div className="bg-slate-950/60 p-1 rounded border border-slate-900">
                                <div className="text-slate-500 font-bold uppercase text-[7px]">NIBP</div>
                                <div className="text-slate-200 font-bold">{vitals?.sbp || 120}/{vitals?.dbp || 80}</div>
                              </div>
                              <div className="bg-slate-950/60 p-1 rounded border border-slate-900">
                                <div className="text-slate-500 font-bold uppercase text-[7px]">SPO2</div>
                                <div className="text-slate-200 font-bold">{vitals?.spo2 || 98}%</div>
                              </div>
                              <div className="bg-slate-950/60 p-1 rounded border border-slate-900">
                                <div className="text-slate-500 font-bold uppercase text-[7px]">BIS</div>
                                <div className="text-slate-200 font-bold">{vitals?.bis || 98}</div>
                              </div>
                            </div>
                          </div>

                          {/* Standard Sign-In Safety Assertions */}
                          <div className="flex flex-col gap-1.5 p-2 bg-slate-950/20 border border-slate-850/60 rounded">
                            <button 
                              onClick={() => setTimeOutChecks(prev => ({ ...prev, identity: !prev.identity }))}
                              className={`flex items-center gap-2 w-full text-left p-1.5 rounded transition ${timeOutChecks.identity ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
                            >
                              <input 
                                type="checkbox" 
                                checked={timeOutChecks.identity} 
                                readOnly 
                                className="accent-emerald-500 shrink-0 pointer-events-none" 
                              />
                              <span className="text-[10px]">Patient identity, consent, procedure & site verified</span>
                            </button>
                            
                            <button 
                              onClick={() => setTimeOutChecks(prev => ({ ...prev, equipment: !prev.equipment }))}
                              className={`flex items-center gap-2 w-full text-left p-1.5 rounded transition ${timeOutChecks.equipment ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
                            >
                              <input 
                                type="checkbox" 
                                checked={timeOutChecks.equipment} 
                                readOnly 
                                className="accent-emerald-500 shrink-0 pointer-events-none" 
                              />
                              <span className="text-[10px]">Anesthesia machine setup and drug check complete</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer buttons */}
                      <div className="bg-slate-950/40 p-4 border-t border-slate-900 flex justify-end gap-2.5 mt-4">
                        <button 
                          onClick={() => setShowTimeOutModal(false)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold rounded-lg text-xs transition duration-200 active:scale-95 border border-slate-800"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            setPatient(p => ({ ...p, timeOutAuthorized: true }));
                            if (setSurgicalPhase) setSurgicalPhase('Induction');
                            logEvent("⚡ Preoperative Safety Checklist (Sign-In/Time-Out) completed. Patient authorized for induction.");
                            setShowTimeOutModal(false);
                          }}
                          disabled={!timeOutChecks.identity || !timeOutChecks.equipment}
                          data-tutorial="timeout-authorize-btn"
                          className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-30 disabled:pointer-events-none text-white font-extrabold rounded-lg text-xs transition duration-200 active:scale-95 shadow-md shadow-emerald-950/50"
                        >
                          Authorize Induction
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex flex-wrap justify-end gap-2 w-full xl:w-auto font-mono">
            <button onClick={() => setActiveCase(null)} className="px-4 py-2 glass-button hover:bg-slate-800/40 text-xs md:text-sm font-bold flex-1 xl:flex-none whitespace-nowrap">End Case</button>
            <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 glass-button glass-button-purple text-xs md:text-sm font-bold flex-1 xl:flex-none disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"><Undo2 size={14} /> Undo</button>
            
            {activeCase?.preOpBriefing && (
              <button 
                onClick={() => setShowPreOp(true)} 
                data-tutorial="emr-btn"
                className="px-4 py-2 glass-button glass-button-blue text-xs md:text-sm font-bold flex items-center justify-center flex-1 xl:flex-none whitespace-nowrap"
              >
                <FileText size={14} className="mr-1 shrink-0" /> Pre-Op EMR
              </button>
            )}

            <button
              onClick={() => setShowFidelityPanel(!showFidelityPanel)}
              className={`px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 flex-1 xl:flex-none whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border ${
                showFidelityPanel
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-black'
                  : 'glass-button hover:bg-slate-800/40 text-slate-300 border-slate-700'
              }`}
            >
              <FlaskConical size={14} /> FIDELITY AUDIT
            </button>

            {/* Receptor Activity Panel Toggle */}
            <button
              onClick={() => setShowReceptorPanel && setShowReceptorPanel(!showReceptorPanel)}
              data-tutorial="receptor-btn"
              className={`px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 flex-1 xl:flex-none whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border ${
                showReceptorPanel
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.35)] font-black animate-pulse'
                  : 'glass-button hover:bg-slate-800/40 text-cyan-400/70 border-slate-700 hover:border-cyan-500/30'
              }`}
            >
              <Dna size={14} /> RECEPTORS
            </button>

            {/* Ultrasound Studio Modal Toggle */}
            {onOpenUltrasoundStudio && (
              <button
                onClick={onOpenUltrasoundStudio}
                className="px-4 py-2 text-xs md:text-sm font-black flex items-center justify-center gap-1.5 flex-1 xl:flex-none whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border bg-cyan-500/20 text-cyan-300 border-cyan-500/60 hover:bg-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
              >
                📡 ULTRASOUND STUDIO
              </button>
            )}

            {/* Font Size Control */}
            {setUiFontScale && (
              <div
                className="flex items-stretch gap-0 rounded-lg border border-slate-700 overflow-hidden shadow-md flex-1 xl:flex-none"
                title="Adjust UI text size — persists across sessions"
              >
                <button
                  onClick={decreaseFontSize}
                  onMouseDown={e => e.stopPropagation()}
                  disabled={currentScale <= FONT_MIN}
                  className="px-2.5 py-2 text-sm font-black text-slate-300 hover:bg-slate-700/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition border-r border-slate-700 select-none"
                >
                  A<span style={{ fontSize: '0.65em', verticalAlign: 'super' }}>−</span>
                </button>
                <button
                  onClick={resetFontSize}
                  onMouseDown={e => e.stopPropagation()}
                  className="px-2 py-2 font-mono text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700/40 active:scale-95 transition min-w-[36px] text-center select-none tabular-nums"
                  title="Reset to default (110%)"
                >
                  {scalePct}%
                </button>
                <button
                  onClick={increaseFontSize}
                  onMouseDown={e => e.stopPropagation()}
                  disabled={currentScale >= FONT_MAX}
                  className="px-2.5 py-2 text-sm font-black text-slate-300 hover:bg-slate-700/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition border-l border-slate-700 select-none"
                >
                  A<span style={{ fontSize: '0.65em', verticalAlign: 'super' }}>+</span>
                </button>
              </div>
            )}

            {/* Timeskip / Fast-Forward Control */}
            <div className="relative flex-1 xl:flex-none">
              <button 
                onClick={() => setShowFfDropdown(!showFfDropdown)}
                data-tutorial="timeskip-btn"
                className={`px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 w-full whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border ${
                  patient?.fastForwardRemaining > 0 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)] animate-pulse' 
                    : 'glass-button hover:bg-slate-800/40 text-amber-400 border-slate-700 hover:border-amber-500/30'
                }`}
              >
                <FastForward size={14} className={patient?.fastForwardRemaining > 0 ? "animate-pulse" : ""} /> {patient?.fastForwardRemaining > 0 ? `FF: ${Math.ceil(patient.fastForwardRemaining)}s` : 'TIME SKIP'}
              </button>
              
              {showFfDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-slate-950/95 border border-white/10 p-1.5 z-50 backdrop-blur-md">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold px-2.5 py-1.5 border-b border-white/5 mb-1 font-mono">Skip Ahead</p>
                  <button onClick={() => handleFastForward(60)} className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/50 hover:text-white rounded transition font-mono flex justify-between items-center">
                    <span>+1 Minute</span>
                    <span className="text-[10px] text-slate-500">60s</span>
                  </button>
                  <button onClick={() => handleFastForward(300)} className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/50 hover:text-white rounded transition font-mono flex justify-between items-center">
                    <span>+5 Minutes</span>
                    <span className="text-[10px] text-slate-500">300s</span>
                  </button>
                  <button onClick={() => handleFastForward(600)} className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/50 hover:text-white rounded transition font-mono flex justify-between items-center">
                    <span>+10 Minutes</span>
                    <span className="text-[10px] text-slate-500">600s</span>
                  </button>
                  {patient?.fastForwardRemaining > 0 && (
                    <button 
                      onClick={() => {
                        setPatient(prev => ({ ...prev, fastForwardRemaining: 0, fastForwardTotal: 0 }));
                        setShowFfDropdown(false);
                        logEvent(`Fast-forward cancelled by user.`);
                      }} 
                      className="w-full text-left mt-1.5 border-t border-white/5 pt-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded transition font-mono flex justify-between items-center font-bold"
                    >
                      <span>Cancel Fast-Forward</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Speed Selector Control */}
            <div className="relative flex-1 xl:flex-none">
              <button 
                onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
                className="px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 w-full whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border glass-button hover:bg-slate-800/40 text-cyan-400 border-slate-700 hover:border-cyan-500/30"
              >
                <Gauge size={14} /> Speed: {patient?.timeScale ? `${patient.timeScale}x` : '1x'}
              </button>
              
              {showSpeedDropdown && (
                <div className="absolute right-0 mt-2 w-40 rounded-lg shadow-xl bg-slate-950/95 border border-white/10 p-1.5 z-50 backdrop-blur-md">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold px-2.5 py-1.5 border-b border-white/5 mb-1 font-mono">Select Speed</p>
                  {[1, 5, 10, 30, 60].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => {
                        setPatient(prev => ({ ...prev, timeScale: speed }));
                        setShowSpeedDropdown(false);
                        logEvent(`Changed simulation speed to ${speed}x.`);
                      }} 
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition font-mono flex justify-between items-center ${
                        (patient?.timeScale || 1) === speed 
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <span>{
                        speed === 1 ? '1x (Real Time)' :
                        speed === 5 ? '5x (Fast)' :
                        speed === 10 ? '10x (Very Fast)' :
                        speed === 30 ? '30x (Super Fast)' :
                        '60x (Hyper Fast)'
                      }</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowLabPanel(!showLabPanel)} 
              data-tutorial="labs-btn" 
              className={`px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 flex-1 xl:flex-none whitespace-nowrap rounded-lg shadow-md transition duration-200 active:scale-95 border ${
                showLabPanel
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.35)] font-black animate-pulse'
                  : 'glass-button glass-button-purple hover:border-purple-400/50'
              }`}
            >
              <FlaskConical size={14} /> Live Labs
            </button>
            
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