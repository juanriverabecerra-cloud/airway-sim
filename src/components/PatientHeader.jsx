import React, { useState } from 'react';
import { Undo2, FileText, X } from 'lucide-react';

export const PatientHeader = ({ activeCase, patient, vitals, setActiveCase, handleUndo, history, showLabPanel, setShowLabPanel, isRunning, setIsRunning }) => {
  const [showPreOp, setShowPreOp] = useState(false);

  return (
    <>
      <header className="flex flex-col bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg gap-4 relative z-10">
        {/* Top Row: Demographics & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center w-full gap-4">
          <div className="flex flex-col gap-1 w-full lg:w-auto">
            <h1 className="text-2xl font-bold text-cyan-400">{activeCase.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50">
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Age:</span> {patient.age}</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Sex:</span> {patient.sex}</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Height:</span> {patient.height} cm</span>
              {/* STRICT CLINICAL ROUNDING ENFORCED HERE */}
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">TBW:</span> {Math.round(patient.weight || 0)} kg</span>
              <span><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">IBW:</span> {Math.round(patient.ibw || 0)} kg</span>
              <span className={`ml-auto lg:ml-2 border-l border-slate-700 pl-3 ${patient.bmi > 30 ? 'text-orange-400 font-bold' : ''}`}><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">BMI:</span>{(patient.bmi || 22).toFixed(1)}</span>
              <span className="text-red-300 ml-2 border-l border-slate-700 pl-3 bg-red-950/30 px-2 py-0.5 rounded"><span className="text-red-500 font-bold uppercase tracking-wider text-[10px] mr-1">EBL:</span>{Math.round(patient.ebl || 0)} mL</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 w-full lg:w-auto">
            <button onClick={() => setActiveCase(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs md:text-sm font-bold transition flex-1 lg:flex-none">End Case</button>
            <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-xs md:text-sm font-bold transition flex-1 lg:flex-none"><Undo2 size={16} /> Undo</button>
            
            {/* EMR BRIEFING ACCESS BUTTON */}
            {activeCase?.preOpBriefing && (
              <button onClick={() => setShowPreOp(true)} className="px-4 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700 rounded text-xs md:text-sm font-bold flex items-center justify-center transition flex-1 lg:flex-none shadow-[0_0_10px_rgba(37,99,235,0.2)]">
                <FileText size={16} className="mr-1" /> Pre-Op EMR
              </button>
            )}

            <button onClick={() => setShowLabPanel(!showLabPanel)} className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded text-xs md:text-sm font-bold flex items-center justify-center transition flex-1 lg:flex-none">Live Labs</button>
            <button onClick={() => setIsRunning(!isRunning)} className={`px-6 py-2 rounded text-xs md:text-sm font-bold shadow-lg transition w-full lg:w-auto ${isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>{isRunning ? 'PAUSE SIM' : 'START SIM'}</button>
          </div>
        </div>

        {/* Bottom Row: FRC Oxygen Buffer / Denitrogenation Status */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 w-full shadow-inner">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest min-w-max">Pre-Ox FRC</p>
          
          {/* Clinical FRC Visualizer — converts volume-based oxygenBuffer (L O2) to FRC O2 saturation % */}
          {(() => {
            const frcL = (patient.lungVolumes && patient.lungVolumes.frc_L) || 2.5;
            const bufferPct = Math.min(100, Math.max(0, ((patient.oxygenBuffer || 0) / frcL) * 100));
            return (
              <>
                <div className="h-6 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
                   <div className="absolute top-0 bottom-0 left-0 w-[21%] bg-red-950/40"></div>
                   <div className="absolute top-0 bottom-0 left-[21%] border-l-2 border-red-500/50 z-10"></div>
                   <span className="absolute top-[3px] left-[22%] text-[9px] font-bold text-red-400/80 z-10 leading-none">RA (21%)</span>
                   
                   <div className="absolute top-0 bottom-0 left-[90%] border-l-2 border-green-500/50 z-10"></div>
                   <span className="absolute top-[3px] left-[91%] text-[9px] font-bold text-green-400/80 z-10 leading-none">TARGET</span>
                   <div className="absolute top-0 bottom-0 left-[90%] right-0 bg-green-950/20"></div>

                   <div 
                     className={`h-full transition-all duration-1000 ease-linear relative ${
                       bufferPct < 21 ? 'bg-red-500' : (bufferPct > 88 ? 'bg-green-500' : 'bg-blue-500')
                     }`} 
                     style={{width: `${bufferPct}%`}}
                   >
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20"></div> {/* 3D Shine */}
                   </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-4 min-w-max">
                   <span className={`font-black text-lg w-12 text-right ${bufferPct < 21 ? 'text-red-500' : (bufferPct > 88 ? 'text-green-400' : 'text-blue-400')}`}>
                     {Math.round(bufferPct)}%
                   </span>
                   <div className="text-slate-500 text-[10px] leading-tight border-l border-slate-700 pl-3">
                     Device:<br/><span className="text-slate-300 font-bold text-xs">{patient.currentO2Device}</span>
                   </div>
                </div>
              </>
            );
          })()}
        </div>
      </header>

      {/* PRE-OP EMR MODAL OVERLAY */}
      {showPreOp && activeCase?.preOpBriefing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl p-6 w-full max-w-3xl flex flex-col gap-6 text-white font-mono animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
              <h2 className="text-2xl md:text-3xl font-black text-blue-400 flex items-center gap-3"><FileText size={28}/> Pre-Op Briefing (EMR)</h2>
              <button onClick={() => setShowPreOp(false)} className="text-slate-400 hover:text-white transition"><X size={28}/></button>
            </div>

            <div className="flex flex-col gap-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
              <div>
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">History of Present Illness</h3>
                <p className="text-slate-200 text-sm md:text-base">{activeCase.preOpBriefing.hpi}</p>
              </div>
              <div>
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Past Medical History</h3>
                <p className="text-slate-200 text-sm md:text-base">{activeCase.preOpBriefing.pmhx}</p>
              </div>
              <div>
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Baseline Vitals</h3>
                <p className="text-cyan-300 font-bold text-sm md:text-base bg-cyan-950/30 p-2 rounded border border-cyan-900/50">{activeCase.preOpBriefing.vitals}</p>
              </div>
              <div>
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Airway Exam</h3>
                <p className="text-yellow-200 text-sm md:text-base border-l-2 border-yellow-500 pl-3 py-1">{activeCase.preOpBriefing.airway}</p>
              </div>
            </div>

            <div className="bg-purple-950/30 border border-purple-900/50 p-4 rounded-lg">
              <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-1">Attending Anesthesiologist Rationale</h3>
              <p className="text-purple-200 text-sm md:text-base italic">"{activeCase.preOpBriefing.rationale}"</p>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowPreOp(false)} className="px-8 py-3 rounded font-black text-white bg-slate-700 hover:bg-slate-600 transition shadow-lg">
                Close Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};