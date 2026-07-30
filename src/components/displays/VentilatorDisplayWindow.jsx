import React, { useState, useCallback } from 'react';
import { useSimState } from '../../sync/useSimState';
import { VentMonitor } from '../monitors/VentMonitor';
import { WaveformContextPanel } from '../WaveformContextPanel';
import { Activity, Maximize2, ShieldAlert } from 'lucide-react';

export function VentilatorDisplayWindow() {
  const { state: syncedState, actions } = useSimState();
  const [waveformContext, setWaveformContext] = useState(null);

  const patient = syncedState.patient;
  const vitals = syncedState.vitals;
  const ventSettings = syncedState.ventSettings;
  const blindMode = syncedState.blindMode;

  const openWaveformContext = useCallback((id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const rect = e && e.currentTarget ? e.currentTarget.getBoundingClientRect() : { top: 100, left: 100 };
    setWaveformContext((prev) => (prev?.id === id ? null : { id, rect }));
  }, []);

  const handleUpdateVentSettings = (updater) => {
    actions.setVentSettings(updater);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans relative">
      {/* Top Standalone Banner */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">
            AETHERIS STANDALONE VENTILATOR DISPLAY
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            ROOM: {syncedState.roomCode || 'LOCAL'}
          </span>
        </div>

        {blindMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            BLIND EXAM MODE ACTIVE
          </div>
        )}

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

      {/* Main Display Body */}
      <div className="flex-1 p-3 min-h-0 bg-slate-950 relative overflow-hidden">
        {!patient || !ventSettings ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Activity className="w-12 h-12 mb-3 animate-spin text-emerald-500/60" />
            <p className="text-sm font-bold text-slate-300">Awaiting Live Host Simulation Stream...</p>
            <p className="text-xs mt-1 text-slate-500">Room: {syncedState.roomCode}</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden relative">
            <VentMonitor
              patient={{ ...patient, airwaySecured: true }}
              vitals={vitals}
              ventSettings={ventSettings}
              setVentSettings={handleUpdateVentSettings}
              onWaveformClick={openWaveformContext}
              onVitalClick={openWaveformContext}
            />
          </div>
        )}
      </div>

      {/* Waveform & Loops Context Overlay */}
      {waveformContext && vitals && patient && (
        <WaveformContextPanel
          waveformId={waveformContext.id}
          vitals={vitals}
          patient={patient}
          ventSettings={ventSettings}
          onClose={() => setWaveformContext(null)}
        />
      )}
    </div>
  );
}
