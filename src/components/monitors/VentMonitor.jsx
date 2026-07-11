import { useState } from 'react';
import { CanvasWaveform } from '../CanvasWaveform';
import { FlowVolumeLoopCanvas } from '../FlowVolumeLoopCanvas';
import { PressureVolumeLoopCanvas } from '../PressureVolumeLoopCanvas';

export const VentMonitor = ({ patient, vitals, rrSpeed, ventSettings, setVentSettings, activeMeds, onVitalClick, onWaveformClick }) => {
  const [monitorView, setMonitorView] = useState('waves'); // 'waves' | 'loops'
  const [activeLoop, setActiveLoop] = useState('fv'); // 'fv' | 'pv'

  // If the airway is not secured, the ventilator monitor hides itself.
  if (!patient || !patient.airwaySecured) return null;

  const ventValClass3 = "text-2xl @[200px]:text-3xl @[240px]:text-4xl @[280px]:text-4xl @[345px]:text-5xl @[410px]:text-5xl";
  const ventValClass2 = "text-3xl @[200px]:text-4xl @[240px]:text-5xl @[280px]:text-5xl @[345px]:text-6xl @[410px]:text-6xl";

  return (
    <>
    <div className="glass-panel glass-emerald p-2 flex flex-col md:grid md:grid-cols-4 gap-2 min-h-[360px] md:min-h-0 md:h-auto lg:h-[420px] relative overflow-hidden">
      {/* Waveforms & Loops Main Panel */}
      <div className="col-span-1 md:col-span-3 flex flex-col justify-between relative z-10 w-full h-[220px] md:h-full gap-1 overflow-hidden">
        {/* View Toggle Tabs - Floating HUD Overlay */}
        <div className="absolute top-2 left-2 right-2 z-30 flex justify-between items-center pointer-events-none select-none">
          <div className="flex gap-1.5 pointer-events-auto bg-slate-950/85 px-1.5 py-1 rounded border border-slate-900/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <button
              onClick={() => setMonitorView('waves')}
              className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border transition-all cursor-pointer ${
                monitorView === 'waves'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/40'
              }`}
            >
              Waveforms
            </button>
            <button
              onClick={() => {
                setMonitorView('loops');
                if (!activeLoop) setActiveLoop('fv');
              }}
              className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border transition-all cursor-pointer ${
                monitorView === 'loops'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/40'
              }`}
            >
              Loops View
            </button>
          </div>

          {monitorView === 'loops' && (
            <div className="flex items-center gap-1 bg-slate-950/85 p-0.5 rounded border border-slate-900/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md pointer-events-auto">
              <button
                onClick={() => setActiveLoop('fv')}
                className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded transition-all cursor-pointer ${
                  activeLoop === 'fv'
                    ? 'bg-emerald-500 text-black shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                F-V Loop
              </button>
              <button
                onClick={() => setActiveLoop('pv')}
                className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded transition-all cursor-pointer ${
                  activeLoop === 'pv'
                    ? 'bg-yellow-500 text-black shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                P-V Loop
              </button>
            </div>
          )}
        </div>

        {/* Content Area (Waveforms + optional Loop) */}
        <div className="flex-grow flex gap-2 w-full min-h-0 relative p-1">
          {/* Active Loop Column */}
          {monitorView === 'loops' && (
            <div
              onClick={e => onWaveformClick?.(activeLoop === 'fv' ? 'flowVolume' : 'pvLoop', e)}
              className="relative shrink-0 w-[140px] sm:w-[180px] md:w-[230px] lg:w-[280px] aspect-square bg-slate-950/50 rounded border border-slate-900/80 p-2 overflow-hidden self-center shadow-inner cursor-pointer hover:border-emerald-700/40 group transition-colors"
              title={`Click for ${activeLoop === 'fv' ? 'Flow-Volume Loop' : 'P-V Loop'} guide`}
            >
              <div className="absolute top-1.5 right-2 z-20 hidden group-hover:flex items-center">
                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
              </div>
              {activeLoop === 'fv' ? (
                <FlowVolumeLoopCanvas patient={patient} vitals={vitals} active={!!vitals?.rr} />
              ) : (
                <PressureVolumeLoopCanvas patient={patient} vitals={vitals} ventSettings={ventSettings} active={!!vitals?.rr} />
              )}
            </div>
          )}

          {/* Waveforms Column */}
          <div className="flex-1 flex flex-col justify-between h-full gap-1 min-w-0">
            <div
              onClick={e => onWaveformClick?.('ventPressure', e)}
              className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-yellow-950/10 group transition-colors"
              title="Click for Pressure-Time waveform guide"
            >
              <div className={`absolute text-yellow-600/50 text-[10px] md:text-xs top-1.5 z-20 font-bold flex items-center gap-1.5 leading-none transition-all ${
                monitorView === 'loops' ? 'left-2' : 'left-[185px] sm:left-[215px] md:left-[245px]'
              }`}>
                <span>Paw cmH2O</span>
                <span className="hidden group-hover:inline text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
              </div>
              <CanvasWaveform
                color="#ca8a04"
                speed={rrSpeed}
                rrSpeed={0}
                active={rrSpeed > 0}
                type="ventPressure"
                patientState={patient}
                vitals={vitals}
                ventSettings={ventSettings}
              />
            </div>
            <div
              onClick={e => onWaveformClick?.('ventFlow', e)}
              className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-green-950/10 group transition-colors"
              title="Click for Flow-Time waveform guide"
            >
              <div className="absolute text-green-500/50 text-[10px] md:text-xs top-1.5 left-2 z-20 font-bold flex items-center gap-1.5 leading-none">
                <span>Flow L/min</span>
                <span className="hidden group-hover:inline text-[8px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
              </div>
              <CanvasWaveform
                color="#22c55e"
                speed={rrSpeed}
                rrSpeed={0}
                active={rrSpeed > 0}
                type="ventFlow"
                patientState={patient}
                vitals={vitals}
                ventSettings={ventSettings}
              />
            </div>
            <div
              onClick={e => onWaveformClick?.('etco2', e)}
              className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-yellow-950/10 group transition-colors"
              title="Click for Capnography (EtCO₂) guide"
            >
              <div className="absolute text-yellow-400/50 text-[10px] md:text-xs top-1.5 left-2 z-20 font-bold flex items-center gap-1.5 leading-none">
                <span>EtCO2</span>
                <span className="hidden group-hover:inline text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
              </div>
              <CanvasWaveform
                color="#facc15"
                speed={rrSpeed}
                rrSpeed={rrSpeed}
                active={rrSpeed > 0}
                type="etco2"
                ieRatio={ventSettings?.ieRatio || 2}
                ampScale={Math.min(1.5, (vitals?.etco2 || 40) / 40)}
                baseScale={patient?.phaseIBaselineMmHg ? patient.phaseIBaselineMmHg / 40 : 0}
                patientState={patient}
                vitals={vitals}
                activeMeds={activeMeds}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vent Numericals - Matching High-Legibility numerical styling of Primary Monitor */}
      <div className="@container col-span-1 grid grid-rows-4 bg-black/45 backdrop-blur-md p-1.5 rounded-lg h-[340px] md:h-full border border-slate-800/60 shadow-inner gap-1.5 overflow-hidden z-30">
        {/* Card 1: Pressures */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-yellow-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-yellow-500 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Pressures (cmH2O)</span>
          </div>
          <div className="flex-1 flex justify-between items-stretch gap-1 mt-1">
            {/* PIP Card */}
            <div onClick={e => onVitalClick?.("pip", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-yellow-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-yellow-600 font-bold uppercase tracking-wider leading-none">PIP</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass3} font-black text-white leading-none`}>
                  {Math.round(vitals?.pip || 0)}
                </span>
              </div>
            </div>

            {/* PLAT Card */}
            <div onClick={e => onVitalClick?.("plat", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-yellow-500/20 transition-all overflow-hidden cursor-pointer">
              <span className="text-[7.5px] lg:text-[8.5px] text-yellow-600 font-bold uppercase tracking-wider leading-none">PLAT</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass3} font-black text-slate-300`}>
                  {Math.round(vitals?.pplat || 0)}
                </span>
              </div>
            </div>

            {/* PEEP Card */}
            <div onClick={e => onVitalClick?.("peep", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-yellow-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-yellow-600 font-bold uppercase tracking-wider leading-none">PEEP</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass3} font-black text-slate-300`}>
                  {Math.round(vitals?.peep || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Volumes */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-green-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-green-500 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Volumes</span>
          </div>
          <div className="flex-1 flex justify-between items-stretch gap-1.5 mt-1">
            {/* VTe Card */}
            <div onClick={e => onVitalClick?.("vte", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-green-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-green-600 font-bold uppercase tracking-wider leading-none">VTe (mL)</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass2} font-black text-green-400 leading-none`}>
                  {Math.round(vitals?.vte || 0)}
                </span>
              </div>
            </div>

            {/* MVe Card */}
            <div onClick={e => onVitalClick?.("mv", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-green-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-green-600 font-bold uppercase tracking-wider leading-none">MVe (L/min)</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass2} font-black text-green-400 leading-none`}>
                  {(vitals?.mv || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Rates & Compliance */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-blue-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-blue-400 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Vent Ventilation</span>
          </div>
          <div className="flex-1 flex justify-between items-stretch gap-1 mt-1 mb-1">
            {/* RR Card */}
            <div onClick={e => onVitalClick?.("rr", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-blue-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-blue-400 font-bold uppercase tracking-wider leading-none">RR /min</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass3} font-black text-white`}>
                  {vitals?.rr || 0}
                </span>
              </div>
            </div>

            {/* Cdyn Card */}
            <div onClick={e => onVitalClick?.("cdyn", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-blue-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">Cdyn</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass3} font-black text-slate-300`}>
                  {Math.round(vitals?.compl || 60)}
                </span>
              </div>
            </div>

            {/* Raw Card */}
            <div onClick={e => onVitalClick?.("raw", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-blue-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">Raw</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${ventValClass3} font-black text-slate-300`}>
                  {Math.round(vitals?.res || 5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: EtCO2 & I:E Ratio */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-yellow-500/30 transition-all overflow-hidden">
          <div className="flex justify-between items-center w-full border-b border-slate-900/40 pb-0.5">
            <span className="text-yellow-500 font-bold text-[9px] lg:text-[10px] leading-none uppercase">Pulmonary Telemetry</span>
            <div className="flex gap-1 items-center">
              {patient?.recruitmentTime > 0 && (
                <span className="text-[7px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-black animate-pulse">
                  RECRUITING ({Math.round(patient.recruitmentTime)}s)
                </span>
              )}
              {patient?.lungVolumes && patient?.lungVolumes?.frc_L < patient?.lungVolumes?.cc_L && (
                <span className="text-[7px] bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded font-black animate-pulse" title="FRC is below Closing Capacity; airway closure is causing shunt!">
                  AIRWAY CLOSURE
                </span>
              )}
              {patient?.atelectasis > 0.01 && (
                <span className="text-[7px] bg-orange-500/20 text-orange-400 px-1 py-0.5 rounded font-black animate-pulse" title={`Alveolar atelectasis is ${Math.round(patient.atelectasis * 100)}%`}>
                  ATELECTASIS ({Math.round(patient.atelectasis * 100)}%)
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 flex justify-between items-stretch gap-1 mt-1">
            {/* EtCO2 Card */}
            <div onClick={e => onVitalClick?.("etco2", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-yellow-500/20 transition-all overflow-hidden">
              <span className="text-[7.5px] lg:text-[8.5px] text-yellow-600 font-bold uppercase tracking-wider leading-none">EtCO2</span>
              <div className="flex-grow flex items-center justify-center">
                <span className="text-xl font-black text-yellow-400 leading-none">
                  {vitals?.etco2 ?? '--'}
                </span>
              </div>
            </div>

            {/* Shunt & FRC/CC Card */}
            <div onClick={e => onVitalClick?.("shunt", e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-emerald-500/20 transition-all overflow-hidden cursor-pointer">
              <span className="text-[7.5px] lg:text-[8.5px] text-emerald-500 font-bold uppercase tracking-wider leading-none">Shunt / FRC</span>
              <div className="flex-grow flex flex-col items-center justify-center leading-none mt-0.5">
                <span className="text-[14px] font-black text-emerald-400">
                  {vitals?.shunt !== undefined ? `${(vitals.shunt * 100).toFixed(1)}%` : '--'}
                </span>
                {patient?.lungVolumes && (
                  <span className="text-[6.5px] text-slate-400 mt-0.5 font-mono leading-none">
                    F:{patient.lungVolumes.frc_L.toFixed(1)}/C:{patient.lungVolumes.cc_L.toFixed(1)}L
                  </span>
                )}
                {vitals?.vdVt !== undefined && (
                  <span
                    className={`text-[6.5px] mt-0.5 font-mono leading-none ${vitals.vdVt > 0.5 ? 'text-rose-400' : 'text-slate-500'}`}
                    title="Physiologic dead space fraction of tidal volume (VD/VT)"
                  >
                    VD/VT:{(vitals.vdVt * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            {/* I:E Ratio Card */}
            <div onClick={e => { e.stopPropagation(); onVitalClick?.("ieratio", e); }} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between items-center hover:border-cyan-500/20 transition-all overflow-hidden cursor-pointer">
              <span className="text-[7.5px] lg:text-[8.5px] text-cyan-600 font-bold uppercase tracking-wider leading-none">I:E Ratio</span>
              <div className="flex-grow flex items-center justify-center gap-0.5 leading-none">
                <span className="text-[9px] font-bold text-slate-400">1:</span>
                {setVentSettings ? (
                  <select 
                    value={ventSettings?.ieRatio || 2}
                    onChange={(e) => setVentSettings({...ventSettings, ieRatio: parseFloat(e.target.value)})}
                    className="bg-black/50 border border-slate-800 text-[9px] text-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer leading-none font-bold font-mono"
                  >
                    <option value={1}>1.0</option>
                    <option value={1.5}>1.5</option>
                    <option value={2}>2.0</option>
                    <option value={2.5}>2.5</option>
                    <option value={3}>3.0</option>
                    <option value={4}>4.0</option>
                  </select>
                ) : (
                  <span className="text-slate-300 text-[10px] font-bold">{ventSettings?.ieRatio || 2}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};