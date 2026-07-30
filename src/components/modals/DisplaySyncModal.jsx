import React, { useState } from 'react';
import { syncEngine } from '../../sync/SyncEngine';
import { Monitor, Smartphone, ShieldAlert, Radio, ExternalLink, X, QrCode, Copy, Check } from 'lucide-react';

export function DisplaySyncModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [blindMode, setBlindMode] = useState(syncEngine.state.blindMode || false);

  if (!isOpen) return null;

  const roomCode = syncEngine.state.roomCode || 'SIM-8492';
  const joinUrl = `${window.location.origin}${window.location.pathname}?display=vitals&room=${roomCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleBlind = () => {
    const nextBlind = !blindMode;
    setBlindMode(nextBlind);
    syncEngine.toggleBlindMode(nextBlind);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide">
                MULTI-DISPLAY & REMOTE SYNC CONTROL
              </h2>
              <p className="text-xs text-slate-400">
                Pop out displays to multiple screens or connect mobile devices / iPads.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Multi-Monitor Popouts (0ms Local Sync) */}
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              1. Multi-Monitor Screen Popouts (Instant 0ms Sync)
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => syncEngine.openPopoutWindow('vent')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-black text-emerald-400 mb-1 group-hover:text-emerald-300 flex items-center justify-between">
                    <span>Ventilator Display</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Fullscreen ICU Vent monitor with waveforms & loops.
                  </p>
                </div>
                <div className="mt-3 text-[9px] font-mono text-slate-500">Pop out → Screen 2</div>
              </button>

              <button
                onClick={() => syncEngine.openPopoutWindow('vitals')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-black text-cyan-400 mb-1 group-hover:text-cyan-300 flex items-center justify-between">
                    <span>Patient Monitor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Fullscreen EKG, SpO2, EtCO2, Art Line & BIS EEG.
                  </p>
                </div>
                <div className="mt-3 text-[9px] font-mono text-slate-500">Pop out → Screen 3</div>
              </button>

              <button
                onClick={() => syncEngine.openPopoutWindow('loops')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-yellow-500/50 transition-all text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-black text-yellow-400 mb-1 group-hover:text-yellow-300 flex items-center justify-between">
                    <span>Mechanics Station</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Side-by-side Flow-Volume & Pressure-Volume loops.
                  </p>
                </div>
                <div className="mt-3 text-[9px] font-mono text-slate-500">Pop out → Screen 4</div>
              </button>

              <button
                onClick={() => syncEngine.openPopoutWindow('meds')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-all text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-black text-indigo-400 mb-1 group-hover:text-indigo-300 flex items-center justify-between">
                    <span>Pharmacopoeia & Lines</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Drug dosing, infusions, IV lines & resuscitation.
                  </p>
                </div>
                <div className="mt-3 text-[9px] font-mono text-slate-500">Pop out → Screen 5</div>
              </button>

              <button
                onClick={() => syncEngine.openPopoutWindow('attending')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-400/50 transition-all text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-black text-emerald-300 mb-1 group-hover:text-emerald-200 flex items-center justify-between">
                    <span>Attending AI Consult</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    AI chat, textbook knowledge search & clinical hints.
                  </p>
                </div>
                <div className="mt-3 text-[9px] font-mono text-slate-500">Pop out → Screen 6</div>
              </button>

              <button
                onClick={() => syncEngine.openPopoutWindow('receptors')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-400/50 transition-all text-left group flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-black text-purple-300 mb-1 group-hover:text-purple-200 flex items-center justify-between">
                    <span>Receptor Biophysics</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    GABA-A, Mu, Alpha-2 & Beta-1 site dynamics.
                  </p>
                </div>
                <div className="mt-3 text-[9px] font-mono text-slate-500">Pop out → Screen 7</div>
              </button>
            </div>
          </div>

          {/* Section 2: Mobile / iPad Remote Connect & Room Code */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-black text-slate-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                2. Connect iPad, Phone, or Remote Device
              </div>
              <p className="text-[10px] text-slate-400 max-w-sm">
                Connect external tablets or mobile controllers using the live session room code.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-3 font-mono">
                <span className="text-xs text-slate-400">ROOM CODE:</span>
                <span className="text-base font-black text-emerald-400 tracking-wider">{roomCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Instructor Remote Dashboard & Blind Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-black text-red-400 mb-1 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  3. Instructor "God Mode" Remote
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mb-3">
                  Launch the remote dashboard to trigger AFib, Bronchospasm, Laryngospasm, or Pneumothorax live during a case.
                </p>
              </div>

              <button
                onClick={() => syncEngine.openPopoutWindow('instructor')}
                className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/20"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                LAUNCH INSTRUCTOR REMOTE
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-black text-amber-400 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  4. Blind Exam Mode
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mb-3">
                  Hides SpO2 / EtCO2 readouts and diagnostic loops on student screens to force clinical reasoning.
                </p>
              </div>

              <button
                onClick={handleToggleBlind}
                className={`w-full py-2.5 rounded-lg text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                  blindMode
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {blindMode ? 'DISABLE BLIND MODE' : 'ENABLE BLIND EXAM MODE'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
