import React from 'react';

export const UltrasoundGuidePanel = ({
  procedure,
  gameScore = null,
  patientModifiers = null
}) => {
  if (!procedure) return null;

  const grade = gameScore?.masteryGrade || 'C';
  const badge = gameScore?.badge || '🎯 TRAINEE';
  const statusMsg = gameScore?.statusMessage || 'Position probe and insert needle...';

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-xl flex flex-col space-y-4 font-sans text-xs overflow-y-auto max-h-[520px]">
      {/* Procedure Title & Technique Summary */}
      <div className="border-b border-slate-800 pb-2">
        <h3 className="font-bold text-sm text-cyan-400 font-mono">{procedure.name}</h3>
        <p className="text-[11px] text-slate-400 mt-1 font-sans">{procedure.techniqueSummary}</p>
      </div>

      {/* Gamified Clinical Mastery Scorecard Banner */}
      <div className={`p-3.5 rounded-xl border flex flex-col space-y-2 font-mono shadow-lg transition-all ${
        grade === 'A+' || grade === 'A'
          ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
          : grade === 'B'
          ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-200'
          : grade === 'F'
          ? 'bg-rose-950/80 border-rose-500/80 text-rose-200 animate-pulse'
          : 'bg-amber-950/80 border-amber-500/80 text-amber-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black">{grade}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">{badge}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">HYDRODISSECTION</div>
            <div className="font-bold text-sm">{gameScore?.hydrodissectionAccuracy || 0}%</div>
          </div>
        </div>
        <p className="text-[11px] font-sans font-medium border-t border-white/10 pt-2 leading-relaxed">
          {statusMsg}
        </p>
      </div>

      {/* Live Patient Physiology & Clinical Findings */}
      {patientModifiers && (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col space-y-1">
          <span className="font-bold text-amber-400 font-mono text-[11px]">📋 LIVE CLINICAL FINDINGS:</span>
          <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
            {patientModifiers.findingsNarrative}
          </p>
        </div>
      )}

      {/* Recommended Anatomical Landmarks Checklist */}
      <div className="flex flex-col space-y-1.5">
        <span className="font-bold text-slate-300 font-mono text-[11px] uppercase tracking-wider">
          🔍 Key Sonographic Landmarks:
        </span>
        <ul className="space-y-1 pl-1">
          {procedure.landmarks.map((lm, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-slate-400">
              <span className="text-cyan-400 font-bold">•</span>
              <span>{lm}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Hydrodissection Target Plane */}
      {procedure.hydrodissectionTarget && (
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <span className="font-bold text-cyan-400 font-mono text-[10px] uppercase">Target Injection Plane:</span>
          <p className="text-slate-300 text-[11px] mt-0.5">{procedure.hydrodissectionTarget}</p>
        </div>
      )}

      {/* Complications & Safety Warnings */}
      <div className="flex flex-col space-y-1.5 border-t border-slate-800 pt-3">
        <span className="font-bold text-rose-400 font-mono text-[11px] uppercase tracking-wider">
          ⚠️ Clinical Risks & Complications:
        </span>
        <ul className="space-y-1 pl-1 text-[11px]">
          {procedure.complications.map((comp, idx) => (
            <li key={idx} className="flex items-center space-x-2 text-rose-300">
              <span>•</span>
              <span>{comp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
