import { useState } from 'react';
import { Activity, Heart, Wind, RefreshCw, Waves, Volume2, VolumeX } from 'lucide-react';
import { CanvasWaveform } from '../CanvasWaveform';
import { calculatePacPressures } from '../../engine/PulmonaryArteryCatheterModel';

export const PrimaryMonitor = ({
  patient,
  vitals,
  nibp,
  cycleNibp,
  isCyclingNibp,
  hrSpeed,
  rrSpeed,
  gasSettings,
  ventSettings,
  nibpIntervalMs,
  setNibpIntervalMs,
  electrolytes,
  activeMeds,
  onEkgClick,
  soundSettings,
  setSoundSettings,
  onVitalClick,
  onWaveformClick,
}) => {
  const [paWedged, setPaWedged] = useState(false);
  const [showSoundDropdown, setShowSoundDropdown] = useState(false);
  const pacPressures = patient?.hasPAC ? calculatePacPressures(patient, vitals) : null;
  const hrSpO2Class = "text-3xl @[200px]:text-4xl @[240px]:text-5xl @[280px]:text-5xl @[345px]:text-[44px] @[410px]:text-[48px]";
  const bpClass = "text-2xl @[200px]:text-3xl @[240px]:text-4xl @[280px]:text-4xl @[345px]:text-[40px] @[410px]:text-[42px]";
  const mapClass = "text-xs @[200px]:text-sm @[240px]:text-base @[280px]:text-lg @[345px]:text-lg @[410px]:text-xl";
  const advClass = "text-sm @[200px]:text-base @[240px]:text-lg @[280px]:text-xl @[345px]:text-xl @[410px]:text-2xl";
  const tempBisClass = "text-base @[200px]:text-lg @[240px]:text-xl @[280px]:text-2xl @[345px]:text-[26px] @[410px]:text-[28px]";

  return (
    <div className="glass-panel glass-emerald p-2 flex flex-col md:grid md:grid-cols-4 gap-2 min-h-[360px] md:min-h-0 md:h-auto lg:h-[420px] relative overflow-hidden">
      
      {patient?.isArrest && (
         <>
            <div className="absolute inset-0 bg-red-600/20 z-40 animate-pulse pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-red-500 font-black text-4xl lg:text-6xl tracking-widest uppercase border-4 border-red-500 p-4 bg-black/90 rotate-[-5deg] pointer-events-none whitespace-nowrap">
                {patient?.biologicalDeath ? 'BIOLOGICAL DEATH' : 'CARDIAC ARREST'}
            </div>
         </>
      )}
      
      {/* Primary Waveforms */}
      <div className="col-span-1 md:col-span-3 flex flex-col justify-between relative w-full h-[220px] md:h-full gap-1">
        
        {/* Floating Sound Controller Widget */}
        <div className="absolute top-1 right-2 z-30 flex flex-col items-end font-mono">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSoundDropdown(prev => !prev);
            }}
            onMouseEnter={() => setShowSoundDropdown(true)}
            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-md bg-slate-950/90 ${soundSettings?.master ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
            title="Audio & Alarms Settings"
          >
            {soundSettings?.master ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          
          {showSoundDropdown && (
            <div 
              onMouseLeave={() => setShowSoundDropdown(false)}
              className="mt-1 bg-slate-950/95 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2 shadow-2xl w-44 animate-in fade-in slide-in-from-top-1 duration-150 text-[10px]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[8px]">Monitor Sound</span>
                {soundSettings?.master && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>}
              </div>
              
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={soundSettings?.master || false}
                  onChange={(e) => setSoundSettings(prev => ({ ...prev, master: e.target.checked }))}
                  className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                />
                <span className="font-bold">Master Audio</span>
              </label>

              <div className={`flex flex-col gap-1.5 pl-5 border-l border-slate-800 transition-opacity duration-200 ${soundSettings?.master ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}`}>
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-200 select-none">
                  <input
                    type="checkbox"
                    disabled={!soundSettings?.master}
                    checked={soundSettings?.pulse || false}
                    onChange={(e) => setSoundSettings(prev => ({ ...prev, pulse: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <span>Pulse Beep</span>
                </label>

                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-200 select-none">
                  <input
                    type="checkbox"
                    disabled={!soundSettings?.master}
                    checked={soundSettings?.vent || false}
                    onChange={(e) => setSoundSettings(prev => ({ ...prev, vent: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <span>Ventilator Hum</span>
                </label>

                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-200 select-none">
                  <input
                    type="checkbox"
                    disabled={!soundSettings?.master}
                    checked={soundSettings?.alarms || false}
                    onChange={(e) => setSoundSettings(prev => ({ ...prev, alarms: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <span>Crisis Alarms</span>
                </label>
              </div>
            </div>
          )}
        </div>
        
        {/* ECG Lead II */}
        <div 
          onClick={onEkgClick}
          data-tutorial="waveform-ecg"
          className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-slate-800/20 active:bg-slate-800/40 transition-colors group"
          title="Click to view Multi-Lead EKG"
        >
          <div className="absolute text-green-500/60 text-[10px] md:text-xs top-1 left-1 z-20 font-bold flex items-center gap-1.5 leading-none">
            <span>ECG II {patient?.isArrest ? `(${ (patient?.cardiacRhythm || '').toUpperCase() })` : (patient?.ischemicDamage > 400 ? '(ST-ELEV)' : '')}</span>
            <span className="hidden group-hover:inline text-[8px] bg-green-500/25 text-green-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold ml-1">Click to Zoom</span>
          </div>
          <CanvasWaveform 
             color="#22c55e" 
             speed={patient?.isArrest ? (patient?.cardiacRhythm === 'vfib' ? 150 : (patient?.cardiacRhythm === 'asystole' ? 0 : hrSpeed)) : hrSpeed} 
             rrSpeed={rrSpeed} 
             active={true} 
             type="ecg" 
             lead="II"
             patientState={patient}
             electrolytes={electrolytes}
             activeMeds={activeMeds}
          />
        </div>

        {/* ECG Lead V5 */}
        <div 
          onClick={onEkgClick}
          className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-slate-800/20 active:bg-slate-800/40 transition-colors group"
          title="Click to view Multi-Lead EKG"
        >
          <div className="absolute text-green-400/60 text-[10px] md:text-xs top-1 left-1 z-20 font-bold flex items-center gap-1.5 leading-none">
            <span>ECG V5</span>
            <span className="hidden group-hover:inline text-[8px] bg-green-500/25 text-green-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold ml-1">Click to Zoom</span>
          </div>
          <CanvasWaveform 
             color="#4ade80" 
             speed={patient?.isArrest ? (patient?.cardiacRhythm === 'vfib' ? 150 : (patient?.cardiacRhythm === 'asystole' ? 0 : hrSpeed)) : hrSpeed} 
             rrSpeed={rrSpeed} 
             active={true} 
             type="ecg" 
             lead="V5"
             patientState={patient}
             electrolytes={electrolytes}
             activeMeds={activeMeds}
          />
        </div>

        {patient?.hasALine && (
          <div
            onClick={e => onWaveformClick?.('aline', e)}
            className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-red-950/10 transition-colors group"
            title="Click for A-line waveform guide"
          >
            <div className="absolute text-red-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold flex items-center gap-1.5 leading-none">
              <span>ART</span>
              <span className="hidden group-hover:inline text-[8px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
            </div>
            <CanvasWaveform
              color="#ef4444"
              speed={patient?.cprActive ? 100 : hrSpeed}
              rrSpeed={rrSpeed}
              active={vitals?.sys > 20 || patient?.cprActive}
              type="aline"
              patientState={patient}
              vitals={vitals}
              activeMeds={activeMeds}
            />
          </div>
        )}
        {patient?.hasCVC && (
          <div
            onClick={e => onWaveformClick?.('cvp', e)}
            className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-blue-950/10 transition-colors group"
            title="Click for CVP waveform guide"
          >
            <div className="absolute text-blue-400/60 text-[10px] md:text-xs top-1 left-1 z-20 font-bold flex items-center gap-1.5 leading-none">
              <span>CVP</span>
              <span className="hidden group-hover:inline text-[8px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
            </div>
            <CanvasWaveform
              color="#60a5fa"
              speed={patient?.cprActive ? 100 : hrSpeed}
              rrSpeed={rrSpeed}
              active={true}
              type="cvp"
              patientState={patient}
              vitals={vitals}
            />
          </div>
        )}



        <div
          onClick={e => onWaveformClick?.('pleth', e)}
          className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:bg-cyan-950/10 transition-colors group"
          title="Click for SpO₂ pleth waveform guide"
        >
          <div className="absolute text-cyan-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold flex items-center gap-1.5 leading-none">
            <span>PLETH</span>
            <span className="hidden group-hover:inline text-[8px] bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold">Guide</span>
          </div>
          <CanvasWaveform
            color="#06b6d4"
            speed={patient?.cprActive ? 100 : hrSpeed}
            rrSpeed={rrSpeed}
            active={true}
            type="pleth"
            patientState={patient}
            vitals={vitals}
          />
        </div>

        {patient?.hasBisMonitor && (() => {
          const bis = vitals?.bis || 98;
          const bsr = vitals?.bsr || 0;
          // EEG state label — tells the user what the waveform character means
          const eegStateLabel = patient?.isArrest ? 'ISOELECTRIC'
            : bsr > 0          ? `BURST-SUPPRESS (BSR ${bsr}%)`
            : bis < 3          ? 'ISOELECTRIC'
            : bis <= 40        ? 'DEEP / DELTA WAVES'
            : bis <= 55        ? 'SURGICAL DEPTH'
            : bis <= 70        ? 'MODERATE — THETA/DELTA'
            : bis <= 85        ? 'LIGHT — ALPHA SPINDLES'
            :                    'AWAKE — β/γ ACTIVITY';
          const eegStateColor = patient?.isArrest || bsr > 0  ? '#f87171'
            : bis <= 55 ? '#818cf8'
            : bis <= 85 ? '#a78bfa'
            :             '#c084fc';
          return (
            <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden cursor-pointer hover:border-purple-500/20 transition-colors" style={{ minHeight: 48 }}
                 onClick={e => onVitalClick?.('eeg', e)}>
              {/* Label row: EEG + state annotation + metrics */}
              <div className="absolute top-1 left-1 right-1 z-20 flex justify-between items-start leading-none pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] md:text-xs font-bold text-purple-400/70">EEG</span>
                  <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded"
                        style={{ background: eegStateColor + '18', color: eegStateColor, border: `1px solid ${eegStateColor}40` }}>
                    {eegStateLabel}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-purple-400/50">
                  SEF95: {vitals?.sef95 ?? '--'} Hz | BSR: {bsr}%
                </span>
              </div>
              <CanvasWaveform
                color="#c084fc"
                speed={patient?.isArrest ? 0 : 25}
                rrSpeed={0}
                active={true}
                type="eeg"
                patientState={patient}
                vitals={vitals}
                activeMeds={activeMeds}
              />
            </div>
          );
        })()}

      </div>

      {/* Primary Numerical Vitals - High-Legibility Space-Stretching Layout */}
      <div className="@container col-span-1 grid grid-rows-[22%_28%_22%_28%] bg-black/45 backdrop-blur-md p-1.5 rounded-lg h-[340px] md:h-full border border-slate-800/60 shadow-inner gap-1.5 overflow-hidden">
        
        {/* Row 1: HR & SpO2 */}
        <div className="flex gap-1.5 w-full h-full">
          {/* Heart Rate Card */}
          <div onClick={e => onVitalClick?.('hr', e)} data-tutorial="vital-hr" className={`flex-1 bg-slate-900/60 border rounded p-1.5 flex flex-col justify-between hover:border-green-500/30 transition-all overflow-hidden cursor-pointer ${ (vitals?.hr || 0) > 120 || (vitals?.hr || 0) < 50 || patient?.isArrest ? 'animate-alert-warning' : 'border-slate-800/80'}`}>
            <div className="flex justify-between items-center w-full">
              <span className="text-green-500 font-bold flex items-center gap-1 text-[10px] lg:text-xs leading-none uppercase">
                <span className="beat-scale flex items-center justify-center shrink-0">
                  <Heart size={12} className="text-green-500 shrink-0"/>
                </span>
                <span>HR</span>
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className={`${hrSpO2Class} font-black text-green-400 leading-none select-all`}>
                {vitals?.hr ?? '--'}
              </span>
            </div>
          </div>

          {/* SpO2 Card */}
          <div onClick={e => onVitalClick?.('spo2', e)} data-tutorial="vital-spo2" className={`flex-1 bg-slate-900/60 border rounded p-1.5 flex flex-col justify-between hover:border-cyan-500/30 transition-all overflow-hidden cursor-pointer ${ (vitals?.spo2 || 0) < 88 ? 'animate-alert-hypoxic' : 'border-slate-800/80'}`}>
            <div className="flex justify-between items-center w-full">
              <span className="text-cyan-500 font-bold flex items-center gap-1 text-[10px] lg:text-xs leading-none uppercase">
                <Wind size={12} className="text-cyan-500 shrink-0"/>
                <span>SpO2</span>
              </span>
              <span className="text-[8px] lg:text-[9px] text-cyan-600 font-mono leading-none text-right">
                M:{((vitals?.metHb) ?? 0).toFixed(0)}% C:{((vitals?.coHb) ?? 0).toFixed(0)}%
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className={`${hrSpO2Class} font-black leading-none select-all ${ (vitals?.spo2 || 0) < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>
                {vitals?.spo2 ?? '--'}
                <span className="text-[0.55em] font-bold ml-0.5">%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Blood Pressure Card */}
        {/* Blood pressure card — outer div has NO onClick; each sub-element has its own */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded pt-1.5 px-1.5 pb-2.5 flex flex-col justify-between hover:border-red-500/30 transition-all overflow-hidden">
          {/* Top Row: Label & Controls */}
          <div className="flex justify-between items-center w-full">
            {/* ART/NIBP label — clicking opens the general MAP/BP context */}
            <span onClick={e => onVitalClick?.('map', e)}
                  className="text-red-500 font-bold flex items-center gap-1 text-[10px] lg:text-xs leading-none uppercase cursor-pointer hover:text-red-400 transition-colors select-none"
                  title="Click for blood pressure context">
              <Activity size={12} className="shrink-0"/>
              <span>{patient?.hasALine ? 'ART' : 'NIBP'}</span>
            </span>
            {!patient?.hasALine && (
              <div className="flex items-center gap-1 leading-none">
                <select 
                  value={nibpIntervalMs} 
                  onChange={(e) => setNibpIntervalMs(Number(e.target.value))}
                  className="bg-black/50 border border-slate-800 text-[9px] text-slate-300 rounded px-1 py-0.5 outline-none cursor-pointer leading-none h-[18px]"
                >
                  <option value={0}>Manual</option>
                  <option value={15000}>15s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={120000}>2m</option>
                  <option value={180000}>3m</option>
                  <option value={300000}>5m</option>
                </select>
                <button onClick={cycleNibp} disabled={isCyclingNibp} className={`bg-black/50 border border-slate-800 p-1 rounded transition h-[18px] w-[18px] flex items-center justify-center ${isCyclingNibp ? 'animate-spin text-cyan-400' : 'text-slate-400'}`}><RefreshCw size={10}/></button>
              </div>
            )}
          </div>
          
          {/* Middle Row: Main BP Number — click opens SBP/DBP context */}
          <div className="flex-1 flex items-center justify-center py-0.5"
               onClick={e => onVitalClick?.('bp', e)}
               style={{ cursor: 'pointer' }}>
            <span className={`${bpClass} font-black text-red-400 leading-none tracking-tighter select-all hover:text-red-300 transition-colors`}
                  title="Click for SBP/DBP context">
              {patient?.hasALine ? `${vitals?.sys ?? '--'}/${vitals?.dia ?? '--'}` : `${nibp?.sys ?? '--'}/${nibp?.dia ?? '--'}`}
            </span>
          </div>

          {/* Bottom Row: PPV (left) & MAP/cMAP (right) — each independently clickable */}
          <div className="flex justify-between items-center w-full border-t border-slate-900/40 pt-1 pb-0.5">
            {/* PPV Block — click opens PPV context */}
            <div className="flex items-center gap-1 leading-none cursor-pointer hover:opacity-80 transition-opacity select-none"
                 onClick={e => onVitalClick?.('ppv', e)}
                 title="Click for PPV context">
              <span className="text-[8px] lg:text-[9px] text-red-500/60 font-bold uppercase tracking-wider">PPV</span>
              {(() => {
                const hasSinus = patient?.cardiacRhythm === 'normal';
                const isMechVent = patient?.ventilationStatus === 'mechanical' || (ventSettings?.mode && ventSettings?.mode !== 'spontaneous');
                const tvPerKg = (vitals?.vte || 0) / (patient?.weight || 70);
                const hasSufficientTv = tvPerKg >= 7.0;
                const hasHrRrRatio = (vitals?.hr || 70) / (vitals?.rr || 12) >= 4.0;
                const isPpvValid = hasSinus && isMechVent && hasSufficientTv && hasHrRrRatio;
                const eblRatio = (patient?.ebl || 0) / (patient?.ebv || 5000);
                const calculatedPpvVal = Math.max(3, Math.min(45, Math.round(8 + eblRatio * 50)));
                if (isPpvValid) {
                  return <span className="text-[10px] lg:text-xs font-black text-red-400 leading-none">{calculatedPpvVal}%</span>;
                } else {
                  return (
                    <span className="text-[7px] lg:text-[8px] font-bold text-slate-500 bg-black/40 border border-slate-800 px-1 py-0.5 rounded leading-none">
                      INVALID
                    </span>
                  );
                }
              })()}
            </div>

            {/* MAP & cMAP Block — each value independently clickable */}
            <div className="flex items-center gap-1.5 leading-none">
              {/* MAP — click opens MAP context */}
              <span className="text-[8px] lg:text-[9px] text-red-500/60 font-bold uppercase tracking-wider cursor-pointer hover:text-red-400/80 transition-colors select-none"
                    onClick={e => onVitalClick?.('map', e)}
                    title="Click for MAP context">MAP</span>
              <span className={`${mapClass} font-black text-red-400 leading-none cursor-pointer hover:text-red-300 transition-colors`}
                    onClick={e => onVitalClick?.('map', e)}
                    title="Click for MAP context">
                ({Math.round(patient?.hasALine ? (vitals?.map || 0) : ((nibp?.dia || 80) + ((nibp?.sys || 120) - (nibp?.dia || 80)) / 3))})
              </span>
              {/* cMAP — only shown in non-supine positions; click opens cMAP context */}
              {patient?.position && patient?.position !== 'Supine' && (
                <span className="text-[9px] lg:text-[10px] text-orange-400 font-bold leading-none cursor-pointer hover:text-orange-300 transition-colors select-none"
                      onClick={e => onVitalClick?.('cmap', e)}
                      title="Click for cMAP (corrected cerebral MAP) context">
                  cMAP {Math.round(vitals?.cmap || 0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: RR & Invasive Pressures (CVP/PA) Card */}
        <div className="flex gap-1.5 w-full h-[60px] md:h-auto">
          {/* RR Card */}
          <div onClick={e => onVitalClick?.('rr', e)} className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-slate-500/30 transition-all overflow-hidden cursor-pointer">
            <div className="flex justify-between items-center w-full">
              <span className="text-white font-bold text-[10px] lg:text-xs leading-none uppercase">RR</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className={`${hrSpO2Class} font-black leading-none select-all ${(vitals?.rr || 0) < 8 ? 'text-slate-400 animate-pulse' : 'text-white'}`}>
                {vitals?.rr ?? '--'}
              </span>
            </div>
          </div>

          {/* Invasive Pressures (CVP/PA) Card */}
          {(patient?.hasCVC || patient?.hasPAC) && (
            <div onClick={e => onVitalClick?.('cvp', e)} className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-blue-500/30 transition-all overflow-hidden cursor-pointer">
              <div className="flex justify-between items-center w-full">
                <span className="text-blue-400 font-bold text-[10px] lg:text-xs leading-none uppercase">
                  {patient?.hasPAC ? (paWedged ? 'PCWP' : 'PA') : 'CVP'}
                </span>
                {patient?.hasPAC && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaWedged(w => !w);
                    }}
                    title={paWedged ? 'Deflate balloon (return to PA)' : 'Inflate balloon (read PCWP)'}
                    className="text-orange-400/80 hover:text-orange-300 text-[8px] font-mono leading-none border border-orange-500/30 rounded px-1 py-0.5 bg-black/40 cursor-pointer active:scale-95 transition-all select-none"
                  >
                    Wedge
                  </button>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center leading-none">
                {patient?.hasPAC ? (
                  paWedged ? (
                    <span className={`${hrSpO2Class} font-black text-orange-400 leading-none select-all`}>
                      {pacPressures ? Math.round(pacPressures.pcwp) : '--'}
                    </span>
                  ) : (
                    <div className="flex flex-col items-center justify-center leading-none">
                      <span className="text-[14px] lg:text-[16px] font-black text-orange-400 leading-none select-all">
                        {pacPressures ? `${Math.round(pacPressures.paSystolic)}/${Math.round(pacPressures.paDiastolic)}` : '--/--'}
                      </span>
                      <span className="text-[9px] font-bold text-orange-500/70 font-mono mt-0.5 leading-none">
                        ({pacPressures ? Math.round((pacPressures.paSystolic + 2 * pacPressures.paDiastolic) / 3) : '--'})
                      </span>
                    </div>
                  )
                ) : (
                  <span className={`${hrSpO2Class} font-black text-blue-400 leading-none select-all`}>
                    {vitals?.cvp !== undefined ? Math.round(vitals.cvp) : '--'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Advanced Monitoring Grid */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between h-full overflow-hidden shadow-md">
          <span className="text-[8.5px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-900 pb-0.5 leading-none mb-1">Advanced Monitoring</span>
          
          <div className="flex-1 flex justify-between items-stretch gap-1.5">
            {/* TEMP (Slate) */}
            <div onClick={e => onVitalClick?.('temp', e)} className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-slate-500/20 transition-all overflow-hidden cursor-pointer">
              <span className="text-[8px] lg:text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">TEMP</span>
              <div className="flex-1 flex flex-col items-center justify-center leading-none">
                <span className={`${tempBisClass} font-black text-slate-300 leading-none select-all`}>
                  {(vitals?.temp || 37.0).toFixed(1)}
                </span>
                <span className="text-[8px] @[240px]:text-[9px] @[280px]:text-[10px] font-bold text-slate-500 mt-0.5 leading-none">
                  °C
                </span>
              </div>
            </div>

            {/* MAC (Teal) */}
            <div
              onClick={e => onVitalClick?.('mac', e)}
              className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-teal-500/20 transition-all overflow-hidden cursor-pointer"
              title={`Volatile Agent: ${gasSettings?.agent || 'None'} (Fi: ${(vitals?.fiAgent || 0).toFixed(1)}%, Et: ${(vitals?.etAgent || 0).toFixed(1)}%, Fa/Fi: ${(vitals?.fiAgent > 0.05 ? vitals.etAgent / vitals.fiAgent : 0).toFixed(2)})\nNitrous Oxide: (Fi: ${(vitals?.fiN2O || 0).toFixed(0)}%, Et: ${(vitals?.etN2O || 0).toFixed(0)}%, Fa/Fi: ${(vitals?.fiN2O > 0.5 ? vitals.etN2O / vitals.fiN2O : 0).toFixed(2)})`}
            >
              <span className="text-[8px] lg:text-[9.5px] text-teal-400 font-bold uppercase tracking-wider leading-none">MAC</span>
              <div className="flex-1 flex items-center justify-center">
                {(patient?.airwaySecured && (vitals?.mac || 0) > 0) ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className={`${advClass} font-black text-teal-300 leading-none select-all`}>{vitals?.mac?.toFixed(1)}</span>
                    <div className="text-[7px] lg:text-[8px] text-teal-500 font-bold mt-0.5 leading-none flex flex-col items-center gap-0.5 font-mono">
                      {vitals?.etAgent > 0.01 && (
                        <span title={`Fa/Fi: ${(vitals?.fiAgent > 0.05 ? vitals.etAgent / vitals.fiAgent : 0).toFixed(2)}`}>
                          {gasSettings?.agent?.slice(0, 3).toUpperCase()}: {vitals?.fiAgent?.toFixed(1)}/{vitals?.etAgent?.toFixed(1)}
                        </span>
                      )}
                      {vitals?.etN2O > 0.1 && (
                        <span title={`Fa/Fi: ${(vitals?.fiN2O > 0.5 ? vitals.etN2O / vitals.fiN2O : 0).toFixed(2)}`}>
                          N2O: {vitals?.fiN2O?.toFixed(0)}/{vitals?.etN2O?.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-[8px] lg:text-[9.5px] text-slate-600 font-bold uppercase tracking-wider select-none italic text-center">NO GAS</span>
                )}
              </div>
            </div>
            
            {/* BIS (Purple) */}
            <div onClick={e => onVitalClick?.('bis', e)} data-tutorial="vital-bis" className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-purple-500/20 transition-all overflow-hidden cursor-pointer">
              <span className="text-[8px] lg:text-[9.5px] text-purple-400 font-bold uppercase tracking-wider leading-none">BIS</span>
              <div className="flex-1 flex items-center justify-center">
                {patient?.hasBisMonitor ? (
                  <span className={`${tempBisClass} font-black text-purple-300 leading-none select-all`}>{vitals?.bis || 98}</span>
                ) : (
                  <span className="text-[8px] lg:text-[9.5px] text-slate-500 font-bold uppercase tracking-wider select-none italic text-center">NO EEG</span>
                )}
              </div>
            </div>
            
            {/* TOF (Orange) */}
            <div onClick={e => onVitalClick?.('tof', e)} data-tutorial="vital-tof" className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-orange-500/20 transition-all overflow-hidden cursor-pointer">
              <span className="text-[8px] lg:text-[9.5px] text-orange-400 font-bold uppercase tracking-wider leading-none">TOF</span>
              <div className="flex-1 flex items-center justify-center">
                {patient?.hasTofMonitor ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className={`${advClass} font-black text-orange-300 leading-none select-all`}>{vitals?.tofCount}/4</span>
                    <span className="text-[8.5px] text-orange-500 font-bold mt-0.5 leading-none">{(vitals?.tofRatio * 100).toFixed(0)}%</span>
                  </div>
                ) : (
                  <span className="text-[8px] lg:text-[9.5px] text-slate-500 font-black uppercase tracking-wider select-none italic font-mono text-center">NO TOF</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};