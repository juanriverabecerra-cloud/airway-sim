import React from 'react';

export const UltrasoundMachineConsole = ({
  gainDb,
  setGainDb,
  depthCm,
  setDepthCm,
  frequencyMHz,
  setFrequencyMHz,
  tgc,
  setTgc,
  probeType,
  setProbeType,
  mode,
  setMode,
  showOverlays,
  setShowOverlays,
  isFrozen,
  setIsFrozen
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-xl flex flex-col space-y-4 font-sans">
      {/* Top Console Bar: Mode Buttons & Probe Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Mode Selector */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMode('b_mode')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              mode === 'b_mode' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D B-Mode
          </button>
          <button
            onClick={() => setMode('color_doppler')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              mode === 'color_doppler' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Color Doppler (BART)
          </button>
        </div>

        {/* Probe Transducer Selection */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">PROBE:</span>
          <select
            value={probeType}
            onChange={(e) => setProbeType(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-cyan-400 text-xs font-mono font-bold rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="linear">Linear (7-15 MHz) - High Res</option>
            <option value="curvilinear">Curvilinear (2-5 MHz) - Deep</option>
            <option value="phased_array">Phased Array (1-5 MHz) - Cardiac</option>
            <option value="tee_multiplane">Multiplane TEE (3-8 MHz)</option>
          </select>
        </div>

        {/* Freeze & Overlay Toggles */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`px-3 py-1.5 text-xs font-bold rounded border transition ${
              showOverlays
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {showOverlays ? '👁️ Overlays ON' : '👁️ Overlays OFF'}
          </button>
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-4 py-1.5 text-xs font-bold rounded border transition ${
              isFrozen
                ? 'bg-red-600 border-red-500 text-white animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isFrozen ? '❄️ UNFREEZE' : '❄️ FREEZE'}
          </button>
        </div>
      </div>

      {/* Main Console Knobs & TGC Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        {/* Master Gain Control */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-cyan-400">GAIN CONTROL</span>
            <span className="text-white font-bold">{gainDb} dB</span>
          </div>
          <input
            type="range"
            min="20"
            max="90"
            value={gainDb}
            onChange={(e) => setGainDb(Number(e.target.value))}
            className="accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>20 dB (Dark)</span>
            <span>90 dB (Noise)</span>
          </div>
        </div>

        {/* Depth & Frequency Controls */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-cyan-400">DEPTH & FREQ</span>
            <span className="text-white font-bold">{depthCm} cm / {frequencyMHz} MHz</span>
          </div>
          <div className="flex space-x-3">
            <div className="flex-1 flex flex-col space-y-1">
              <span className="text-[10px] text-slate-400">Depth</span>
              <input
                type="range"
                min="1.5"
                max="20.0"
                step="0.5"
                value={depthCm}
                onChange={(e) => setDepthCm(Number(e.target.value))}
                className="accent-cyan-500 cursor-pointer"
              />
            </div>
            <div className="flex-1 flex flex-col space-y-1">
              <span className="text-[10px] text-slate-400">Frequency</span>
              <input
                type="range"
                min="2.0"
                max="15.0"
                step="0.5"
                value={frequencyMHz}
                onChange={(e) => setFrequencyMHz(Number(e.target.value))}
                className="accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Time Gain Compensation (TGC) 3-Zone Sliders */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-bold text-cyan-400">TGC SLIDERS</span>
            <span className="text-slate-400 text-[10px]">Near / Mid / Far</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 mb-1">Near ({tgc.near}dB)</span>
              <input
                type="range"
                min="-15"
                max="15"
                value={tgc.near}
                onChange={(e) => setTgc({ ...tgc, near: Number(e.target.value) })}
                className="accent-cyan-500 cursor-pointer w-full"
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 mb-1">Mid ({tgc.mid}dB)</span>
              <input
                type="range"
                min="-15"
                max="15"
                value={tgc.mid}
                onChange={(e) => setTgc({ ...tgc, mid: Number(e.target.value) })}
                className="accent-cyan-500 cursor-pointer w-full"
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 mb-1">Far ({tgc.far}dB)</span>
              <input
                type="range"
                min="-15"
                max="15"
                value={tgc.far}
                onChange={(e) => setTgc({ ...tgc, far: Number(e.target.value) })}
                className="accent-cyan-500 cursor-pointer w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
