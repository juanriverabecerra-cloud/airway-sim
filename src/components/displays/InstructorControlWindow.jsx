import React, { useState, useEffect } from 'react';
import { syncEngine } from '../../sync/SyncEngine';
import { Zap, ShieldAlert, Clock, Award, Activity, AlertTriangle, Radio, Play, CheckCircle2, RotateCcw } from 'lucide-react';

export function InstructorControlWindow() {
  const [syncedState, setSyncedState] = useState(syncEngine.state);
  const [activeTriggers, setActiveTriggers] = useState(syncedState.activeTriggers || {});
  const [blindMode, setBlindMode] = useState(syncedState.blindMode || false);
  const [logEvents, setLogEvents] = useState([]);
  const [trendTimer, setTrendTimer] = useState(null);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((event) => {
      if (event.type === 'STATE_SYNC') {
        setSyncedState(event.state);
        setActiveTriggers(event.state.activeTriggers || {});
        setBlindMode(event.state.blindMode || false);
      }
    });
    return unsubscribe;
  }, []);

  const handleToggleTrigger = (incidentId, label) => {
    const nextState = !activeTriggers[incidentId];
    setActiveTriggers((prev) => ({ ...prev, [incidentId]: nextState }));
    syncEngine.triggerIncident(incidentId, nextState);

    const logEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      text: `${nextState ? 'ACTIVATED' : 'RESOLVED'}: ${label}`,
      type: nextState ? 'trigger' : 'resolve',
    };
    setLogEvents((prev) => [logEntry, ...prev]);
  };

  const handleToggleBlindMode = () => {
    const nextBlind = !blindMode;
    setBlindMode(nextBlind);
    syncEngine.toggleBlindMode(nextBlind);

    const logEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      text: `BLIND EXAM MODE: ${nextBlind ? 'ENABLED' : 'DISABLED'}`,
      type: 'system',
    };
    setLogEvents((prev) => [logEntry, ...prev]);
  };

  const INCIDENTS = [
    { id: 'afib', label: 'AFib w/ RVR (HR 145)', desc: 'Sudden irregular tachycardia, loss of atrial kick', category: 'Cardiac', color: 'red' },
    { id: 'vtach', label: 'Ventricular Tachycardia', desc: 'Broad complex tachycardia, severe hypotension', category: 'Cardiac', color: 'red' },
    { id: 'bronchospasm', label: 'Severe Bronchospasm', desc: 'High R_aw (35 cmH2O/L/s), scooped F-V loop, auto-PEEP', category: 'Respiratory', color: 'orange' },
    { id: 'laryngospasm', label: 'Laryngospasm', desc: 'Complete upper airway closure during emergence', category: 'Respiratory', color: 'orange' },
    { id: 'pneumothorax', label: 'Tension Pneumothorax', desc: 'Sudden compliance drop (10 mL/cmH2O), PIP spike', category: 'Respiratory', color: 'red' },
    { id: 'circuit_disconnect', label: 'Circuit Disconnection', desc: 'Zero tidal volume, instant loss of Paw', category: 'Equipment', color: 'amber' },
    { id: 'cuff_leak', label: 'ET Tube Cuff Leak', desc: 'Vte drops by 60%, air leaking around cuff', category: 'Equipment', color: 'amber' },
  ];

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            INSTRUCTOR "GOD MODE" REMOTE CONTROL
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            SESSION ROOM: {syncedState.roomCode || 'LOCAL'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleBlindMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              blindMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {blindMode ? 'BLIND EXAM ACTIVE' : 'ENABLE BLIND EXAM MODE'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0 bg-slate-950 overflow-y-auto">
        {/* Left Column: Quick Incident Injection Menu */}
        <div className="col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Live Clinical Emergency Injections (Click to Trigger)
            </div>

            <div className="grid grid-cols-2 gap-3">
              {INCIDENTS.map((inc) => {
                const isActive = !!activeTriggers[inc.id];
                return (
                  <button
                    key={inc.id}
                    onClick={() => handleToggleTrigger(inc.id, inc.label)}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-red-950/60 border-red-500 text-red-200 shadow-lg shadow-red-500/20 scale-[1.01]'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-black">{inc.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isActive
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : inc.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">{inc.desc}</p>
                    <div className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      {isActive ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> CLICK TO RESOLVE
                        </span>
                      ) : (
                        <span className="text-slate-500 hover:text-slate-300">CLICK TO TRIGGER</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timed Disease Trends */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Gradual Disease Progression Timers
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  syncEngine.triggerIncident('ards_progression', true);
                  const logEntry = {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString(),
                    text: 'TIMED TREND: Gradual ARDS Progression Started (C: 60 → 15 over 2 min)',
                    type: 'system',
                  };
                  setLogEvents((prev) => [logEntry, ...prev]);
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Start 2-Min ARDS Compliance Drop
              </button>
              <button
                onClick={() => {
                  syncEngine.triggerIncident('ards_progression', false);
                  const logEntry = {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString(),
                    text: 'TIMED TREND: ARDS Progression Reset',
                    type: 'resolve',
                  };
                  setLogEvents((prev) => [logEntry, ...prev]);
                }}
                className="px-3 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Reset compliance back to baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>

              <button
                onClick={() => {
                  syncEngine.triggerIncident('bronchospasm_trend', true);
                  const logEntry = {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString(),
                    text: 'TIMED TREND: Gradual Bronchospasm Started (Raw: 5 → 30 over 90 sec)',
                    type: 'system',
                  };
                  setLogEvents((prev) => [logEntry, ...prev]);
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                Start 90-Sec Bronchospasm Rise
              </button>
              <button
                onClick={() => {
                  syncEngine.triggerIncident('bronchospasm_trend', false);
                  const logEntry = {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString(),
                    text: 'TIMED TREND: Bronchospasm Rise Reset',
                    type: 'resolve',
                  };
                  setLogEvents((prev) => [logEntry, ...prev]);
                }}
                className="px-3 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Reset resistance back to baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Instructor Simulation Event Log */}
        <div className="col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col h-full">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Instructor Event Log
            </span>
            <button
              onClick={() => setLogEvents([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>

          <div className="flex-1 min-h-0 bg-slate-950 rounded-lg border border-slate-800 p-2.5 overflow-y-auto space-y-2 font-mono">
            {logEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-600">
                No incidents triggered in this session.
              </div>
            ) : (
              logEvents.map((evt) => (
                <div key={evt.id} className="text-[10px] flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">{evt.time}</span>
                  <span
                    className={
                      evt.type === 'trigger'
                        ? 'text-red-400 font-bold'
                        : evt.type === 'resolve'
                        ? 'text-emerald-400 font-bold'
                        : 'text-cyan-300'
                    }
                  >
                    {evt.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
