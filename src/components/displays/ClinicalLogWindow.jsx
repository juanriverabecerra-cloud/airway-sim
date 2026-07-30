import React from 'react';
import { useSimState } from '../../sync/useSimState';
import { LogPanel } from '../controls/LogPanel';
import { Activity, Maximize2, FileText } from 'lucide-react';

export function ClinicalLogWindow() {
  const { state: syncedState } = useSimState();

  const patient = syncedState.patient;
  const logs = syncedState.logs || [];

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Banner */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            AETHERIS CLINICAL LOG & EVENT HISTORY
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            ROOM: {syncedState.roomCode || 'LOCAL'}
          </span>
        </div>

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
        >
          <Maximize2 className="w-3 h-3" /> Fullscreen
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-3 min-h-0 bg-slate-950 overflow-hidden">
        {!patient ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Activity className="w-12 h-12 mb-3 animate-spin text-cyan-400/60" />
            <p className="text-sm font-bold text-slate-300">Awaiting Live Host Simulation Stream...</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 overflow-hidden">
            <LogPanel
              logs={logs}
              formatTime={(s) => `${Math.floor(s/60)}m ${s%60}s`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
