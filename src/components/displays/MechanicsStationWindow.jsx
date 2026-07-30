import React, { useState } from 'react';
import { useSimState } from '../../sync/useSimState';
import { FlowVolumeLoopCanvas } from '../FlowVolumeLoopCanvas';
import { PressureVolumeLoopCanvas } from '../PressureVolumeLoopCanvas';
import { WaveformContextPanel } from '../WaveformContextPanel';
import { Activity, Maximize2, ShieldAlert } from 'lucide-react';

export function MechanicsStationWindow() {
  const { state: syncedState } = useSimState();
  const [activeTab, setActiveTab] = useState('loops'); // 'loops' | 'fv_guide' | 'pv_guide'

  const patient = syncedState.patient;
  const vitals = syncedState.vitals;
  const ventSettings = syncedState.ventSettings;
  const blindMode = syncedState.blindMode;

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Banner */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">
            AETHERIS PULMONARY MECHANICS & LOOPS STATION
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            ROOM: {syncedState.roomCode || 'LOCAL'}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('loops')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'loops' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Live Loops Side-by-Side
          </button>
          <button
            onClick={() => setActiveTab('fv_guide')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'fv_guide' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Flow-Volume Guide
          </button>
          <button
            onClick={() => setActiveTab('pv_guide')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'pv_guide' ? 'bg-slate-800 text-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Pressure-Volume Guide
          </button>
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

      {/* Main Display Body */}
      <div className="flex-1 p-3 min-h-0 bg-slate-950">
        {!patient || !vitals ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Activity className="w-12 h-12 mb-3 animate-spin text-yellow-400/60" />
            <p className="text-sm font-bold text-slate-300">Awaiting Live Host Simulation Stream...</p>
            <p className="text-xs mt-1 text-slate-500">Room: {syncedState.roomCode}</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 overflow-hidden relative">
            {activeTab === 'loops' && (
              <div className="grid grid-cols-2 gap-3 h-full">
                {/* Flow-Volume Loop */}
                <div className="rounded-lg border border-emerald-500/30 bg-slate-950 p-2 flex flex-col">
                  <div className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Flow-Volume Loop</span>
                    <span className="text-[10px] text-slate-500 font-mono">Top: Exp (+), Bot: Insp (-)</span>
                  </div>
                  <div className="flex-1 min-h-0 relative">
                    <FlowVolumeLoopCanvas
                      patient={patient}
                      vitals={vitals}
                      ventSettings={ventSettings}
                      active={true}
                    />
                  </div>
                </div>

                {/* Pressure-Volume Loop */}
                <div className="rounded-lg border border-yellow-500/30 bg-slate-950 p-2 flex flex-col">
                  <div className="text-xs font-black text-yellow-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Pressure-Volume Loop</span>
                    <span className="text-[10px] text-slate-500 font-mono">Paw (X) vs Vt (Y)</span>
                  </div>
                  <div className="flex-1 min-h-0 relative">
                    <PressureVolumeLoopCanvas
                      patient={patient}
                      vitals={vitals}
                      ventSettings={ventSettings}
                      active={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {blindMode && activeTab === 'loops' && (
              <div className="absolute inset-3 z-10 rounded-lg bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-amber-300">
                <ShieldAlert className="w-8 h-8" />
                <p className="text-sm font-black uppercase tracking-wider">Blind Exam Mode</p>
                <p className="text-xs text-slate-400">Diagnostic loops are hidden. Reason from vitals and mechanics alone.</p>
              </div>
            )}

            {activeTab === 'fv_guide' && (
              <div className="w-full h-full overflow-y-auto">
                <WaveformContextPanel
                  waveformId="flowVolume"
                  vitals={vitals}
                  patient={patient}
                  ventSettings={ventSettings}
                  onClose={() => setActiveTab('loops')}
                />
              </div>
            )}

            {activeTab === 'pv_guide' && (
              <div className="w-full h-full overflow-y-auto">
                <WaveformContextPanel
                  waveformId="pvLoop"
                  vitals={vitals}
                  patient={patient}
                  ventSettings={ventSettings}
                  onClose={() => setActiveTab('loops')}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
