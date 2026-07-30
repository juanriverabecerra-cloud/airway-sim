import React from 'react';
import { AnatomicalBodyMap } from './AnatomicalBodyMap';

export const UltrasoundBodyPositioner = ({
  procedure,
  pose,
  setPose,
  needleState,
  setNeedleState,
  onInjectLocalAnesthetic,
  alignmentScore = 100,
  windowStatus = 'off_axis',
  hint = ''
}) => {
  const targetPos = procedure?.targetMapPos || { xPercent: 50, yPercent: 50 };
  const region = procedure?.bodyRegion || 'neck';

  const setPoseField = (patch) => setPose((prev) => ({ ...prev, ...patch }));

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-xl flex flex-col space-y-3 font-sans">
      {/* Header & Alignment Quality Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-xs uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
          🧍 SCAN-THROUGH BODY MAP
        </span>
        <div className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
          alignmentScore >= 75 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
            : alignmentScore >= 35 ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
            : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
        }`}>
          ALIGNMENT: {alignmentScore}%
        </div>
      </div>

      {/* Interactive Anatomical Body (drag probe to scan through) */}
      <AnatomicalBodyMap
        region={region}
        pose={pose}
        targetPos={targetPos}
        onProbeMove={(xPercent, yPercent) => setPoseField({ xPercent, yPercent })}
        windowStatus={windowStatus}
        alignmentScore={alignmentScore}
      />

      {/* Live steering hint */}
      {hint && (
        <div className="text-[11px] font-mono text-cyan-200 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 leading-snug">
          {hint}
        </div>
      )}

      {/* Probe orientation controls: rotation (short↔long axis) + tilt/fan */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 gap-3 font-mono">
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Rotate</span>
            <span className="text-cyan-300 font-bold">{Math.round(pose?.rotationDeg ?? 0)}°</span>
          </div>
          <input
            type="range" min="-90" max="90" step="5"
            value={pose?.rotationDeg ?? 0}
            onChange={(e) => setPoseField({ rotationDeg: Number(e.target.value) })}
            className="accent-cyan-500 cursor-pointer w-full"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Short axis</span><span>Long axis</span>
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Tilt / Fan</span>
            <span className="text-cyan-300 font-bold">{Math.round(pose?.tiltDeg ?? 0)}°</span>
          </div>
          <input
            type="range" min="-45" max="45" step="5"
            value={pose?.tiltDeg ?? 0}
            onChange={(e) => setPoseField({ tiltDeg: Number(e.target.value) })}
            className="accent-cyan-500 cursor-pointer w-full"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Heel</span><span>Toe</span>
          </div>
        </div>
      </div>

      {/* Gamified Keyboard Controls HUD & Needle Controls */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col space-y-2.5 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-cyan-400">⌨️ WASD NEEDLE CONTROLS</span>
          <button
            onClick={() => setNeedleState({ ...needleState, isInserted: !needleState.isInserted })}
            className={`px-3 py-1 text-xs font-bold rounded transition ${
              needleState?.isInserted ? 'bg-red-600 text-white shadow' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {needleState?.isInserted ? 'RETRACT NEEDLE' : '💉 INSERT NEEDLE (WASD)'}
          </button>
        </div>

        {/* Keyboard Control Key Badges */}
        <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-900/80 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-cyan-300 rounded font-bold">W/S</kbd>
            <span className="text-slate-400">Depth +/-</span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-cyan-300 rounded font-bold">A/D</kbd>
            <span className="text-slate-400">Steer L/R</span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-cyan-300 rounded font-bold">SPACE</kbd>
            <span className="text-slate-400">Inject LA</span>
          </div>
        </div>

        {/* Hydrodissection Injection Action */}
        {needleState?.isInserted && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-300">Hydrodissection Inject:</span>
            <button
              onClick={() => onInjectLocalAnesthetic(5.0)}
              className="px-3.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs transition shadow flex items-center gap-1"
            >
              💧 Inject 5 mL LA (Spacebar)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
