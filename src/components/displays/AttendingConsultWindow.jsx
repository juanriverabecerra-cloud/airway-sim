import React, { useState, Suspense, lazy } from 'react';
import { useSimState } from '../../sync/useSimState';
import { Activity, Maximize2, Bot } from 'lucide-react';

const AttendingPanel = lazy(() => import('../controls/AttendingPanel'));

export function AttendingConsultWindow() {
  const { state: syncedState } = useSimState();
  const [attendingMode, setAttendingMode] = useState('chat');

  const patient = syncedState.patient;
  const vitals = syncedState.vitals;
  const logs = syncedState.logs || [];
  const activeMeds = syncedState.activeMeds || [];
  // attendingGuidance, generateClinicalHint and handleExecuteClinicalAction are host-only
  // closures (see App.jsx's window.__AETHERIS_HOST__ wiring) — only present via the
  // zero-latency window.opener path. Over the BroadcastChannel-only remote/cross-device
  // fallback they're undefined, so the guidance card and action buttons degrade to inert
  // rather than throwing.
  const attendingGuidance = syncedState.attendingGuidance || {};
  const noopActionClick = () => {};
  const noopGenerateHint = () => {};

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Banner */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200 flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            AETHERIS ATTENDING AI CONSULT & AUDIT STATION
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
            <Activity className="w-12 h-12 mb-3 animate-spin text-emerald-400/60" />
            <p className="text-sm font-bold text-slate-300">Awaiting Live Host Simulation Stream...</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 overflow-hidden">
            <Suspense fallback={<div className="p-4 text-xs text-slate-400 font-mono">Loading Attending AI...</div>}>
              <AttendingPanel
                vitals={vitals}
                patient={patient}
                caseId={syncedState.activeCase?.id}
                activeMeds={activeMeds}
                surgicalPhase={syncedState.surgicalPhase || 'Induction'}
                time={syncedState.time || 0}
                logs={logs}
                attendingMode={attendingMode}
                setAttendingMode={setAttendingMode}
                primaryGuidance={attendingGuidance.primaryGuidance}
                fullAudit={attendingGuidance.fullAudit || []}
                activeAlertsCount={attendingGuidance.activeAlertsCount || 0}
                formatTime={(s) => `${Math.floor(s/60)}m ${s%60}s`}
                generateClinicalHint={syncedState.generateClinicalHint || noopGenerateHint}
                onActionClick={syncedState.handleExecuteClinicalAction || noopActionClick}
                nearFutureForecast={attendingGuidance.nearFutureForecast}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
