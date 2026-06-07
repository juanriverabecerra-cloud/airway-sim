import { Activity, Heart, Wind, RefreshCw } from 'lucide-react';
import { CanvasWaveform } from '../CanvasWaveform';

export const PrimaryMonitor = ({ patient, vitals, nibp, cycleNibp, isCyclingNibp, hrSpeed, rrSpeed, gasSettings, ventSettings, nibpIntervalMs, setNibpIntervalMs }) => {
  const isSplit = patient?.airwaySecured;
  const hrSpO2Class = isSplit ? "text-2xl sm:text-3xl md:text-3.5xl xl:text-4xl" : "text-3xl sm:text-4xl md:text-5xl xl:text-6xl";
  const bpClass = isSplit ? "text-xl sm:text-2xl md:text-2.5xl xl:text-3xl" : "text-2xl sm:text-3xl md:text-4xl xl:text-5xl";
  const mapClass = isSplit ? "text-[10px] sm:text-xs md:text-lg xl:text-xl" : "text-xs sm:text-sm md:text-xl xl:text-2xl";
  const advClass = isSplit ? "text-[10px] sm:text-xs md:text-lg xl:text-2xl" : "text-[11px] sm:text-sm md:text-2xl lg:text-3xl xl:text-4xl";

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
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-green-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">ECG II {patient?.isArrest ? `(${ (patient?.cardiacRhythm || '').toUpperCase() })` : (patient?.ischemicDamage > 400 ? '(ST-ELEV)' : '')}</div>
          <CanvasWaveform 
             color="#22c55e" 
             speed={patient?.isArrest ? (patient?.cardiacRhythm === 'vfib' ? 150 : (patient?.cardiacRhythm === 'asystole' ? 0 : hrSpeed)) : hrSpeed} 
             rrSpeed={rrSpeed} 
             active={true} 
             type="ecg" 
             morphology={patient?.isArrest ? (patient?.cardiacRhythm === 'vfib' ? 'vfib' : (patient?.cardiacRhythm === 'vtach' ? 'vtach' : 'normal')) : (patient?.ischemicDamage > 400 ? 'st_elevation' : 'normal')} 
          />
        </div>
        {patient?.hasALine && (
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-red-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">ART</div>
            <CanvasWaveform color="#ef4444" speed={patient?.cprActive ? 100 : hrSpeed} rrSpeed={rrSpeed} active={vitals?.sys > 20 || patient?.cprActive} type="aline" />
          </div>
        )}
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-cyan-550/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">PLETH</div>
          <CanvasWaveform color="#06b6d4" speed={patient?.cprActive ? 100 : hrSpeed} rrSpeed={rrSpeed} active={(vitals?.spo2 > 50 && !patient?.isArrest) || patient?.cprActive} type="pleth" />
        </div>
        {patient?.airwaySecured && (
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-yellow-400/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">EtCO2</div>
            <CanvasWaveform 
              color="#facc15" 
              speed={rrSpeed} 
              rrSpeed={rrSpeed} 
              active={vitals?.etco2 > 5} 
              type="etco2" 
              ieRatio={ventSettings?.ieRatio || 2}
              ampScale={Math.min(1.5, (vitals?.etco2 || 40) / 40)} 
            />
          </div>
        )}
      </div>

      {/* Primary Numerical Vitals - High-Legibility Space-Stretching Layout */}
      <div className="col-span-1 grid grid-rows-[23%_26%_23%_28%] bg-black/45 backdrop-blur-md p-1.5 rounded-lg h-[340px] md:h-full border border-slate-800/60 shadow-inner gap-1.5 overflow-hidden">
        
        {/* Row 1: HR & SpO2 */}
        <div className="flex gap-1.5 w-full h-full">
          {/* Heart Rate Card */}
          <div className={`flex-1 bg-slate-900/60 border rounded p-1.5 flex flex-col justify-between hover:border-green-500/30 transition-all overflow-hidden ${ (vitals?.hr || 0) > 120 || (vitals?.hr || 0) < 50 || patient?.isArrest ? 'animate-alert-warning' : 'border-slate-800/80'}`}>
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
          <div className={`flex-1 bg-slate-900/60 border rounded p-1.5 flex flex-col justify-between hover:border-cyan-500/30 transition-all overflow-hidden ${ (vitals?.spo2 || 0) < 88 ? 'animate-alert-hypoxic' : 'border-slate-800/80'}`}>
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
                {vitals?.spo2 ?? '--'}%
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Blood Pressure Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-red-500/30 transition-all overflow-hidden">
          {/* Top Row: Label & Controls */}
          <div className="flex justify-between items-center w-full">
            <span className="text-red-500 font-bold flex items-center gap-1 text-[10px] lg:text-xs leading-none uppercase">
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
          
          {/* Middle Row: Main BP Number */}
          <div className="flex-1 flex items-center justify-center py-0.5">
            <span className={`${bpClass} font-black text-red-400 leading-none tracking-tighter select-all`}>
              {patient?.hasALine ? `${vitals?.sys ?? '--'}/${vitals?.dia ?? '--'}` : `${nibp?.sys ?? '--'}/${nibp?.dia ?? '--'}`}
            </span>
          </div>

          {/* Bottom Row: PPV (left) & MAP/cMAP (right) */}
          <div className="flex justify-between items-center w-full border-t border-slate-900/40 pt-1">
            {/* PPV Block */}
            <div className="flex items-center gap-1 leading-none">
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

            {/* MAP & cMAP Block */}
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[8px] lg:text-[9px] text-red-500/60 font-bold uppercase tracking-wider">MAP</span>
              <span className={`${mapClass} font-black text-red-400 leading-none`}>
                ({Math.round(patient?.hasALine ? (vitals?.map || 0) : ((nibp?.dia || 80) + ((nibp?.sys || 120) - (nibp?.dia || 80)) / 3))})
              </span>
              {patient?.position && patient?.position !== 'Supine' && (
                <span className="text-[9px] lg:text-[10px] text-orange-400 font-bold leading-none" title="Cerebral perfusion pressure adjusted MAP at circle of Willis">
                  cMAP {Math.round(vitals?.cmap || 0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: EtCO2 & RR */}
        <div className="flex gap-1.5 w-full h-full">
          {/* EtCO2 Card */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-yellow-500/30 transition-all overflow-hidden">
            <div className="flex justify-between items-center w-full">
              <span className="text-yellow-500 font-bold text-[10px] lg:text-xs leading-none uppercase">EtCO2</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {patient?.airwaySecured ? (
                <span className={`${hrSpO2Class} font-black text-yellow-400 leading-none select-all`}>{vitals?.etco2 ?? '--'}</span>
              ) : (
                <span className="text-[9px] lg:text-[10px] text-slate-500 font-black uppercase tracking-wider select-none">No Airway</span>
              )}
            </div>
          </div>

          {/* RR Card */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between hover:border-slate-500/30 transition-all overflow-hidden">
            <div className="flex justify-between items-center w-full">
              <span className="text-white font-bold text-[10px] lg:text-xs leading-none uppercase">RR</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className={`${hrSpO2Class} font-black leading-none select-all ${ (vitals?.rr || 0) < 8 ? 'text-slate-400 animate-pulse' : 'text-white'}`}>
                {vitals?.rr ?? '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: Advanced Monitoring Grid */}
        <div className="bg-slate-955/80 border border-slate-800/85 rounded p-1.5 flex flex-col justify-between h-full overflow-hidden shadow-md">
          <span className="text-[8.5px] text-slate-550 font-black uppercase tracking-widest border-b border-slate-900 pb-0.5 leading-none mb-1">Advanced Monitoring</span>
          
          <div className="flex-1 flex justify-between items-stretch gap-1.5">
            {/* TEMP (Slate) */}
            <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-slate-500/20 transition-all overflow-hidden">
              <span className="text-[8px] lg:text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">TEMP</span>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${advClass} font-black text-slate-300 leading-none select-all`}>
                  {(vitals?.temp || 37.0).toFixed(1)}<span className="text-[10px] lg:text-xs font-normal text-slate-500 ml-0.5">°C</span>
                </span>
              </div>
            </div>

            {/* MAC (Teal) */}
            <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-teal-500/20 transition-all overflow-hidden">
              <span className="text-[8px] lg:text-[9.5px] text-teal-400 font-bold uppercase tracking-wider leading-none">MAC</span>
              <div className="flex-1 flex items-center justify-center">
                {(patient?.airwaySecured && (vitals?.mac || 0) > 0) ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className={`${advClass} font-black text-teal-300 leading-none select-all`}>{vitals?.mac?.toFixed(1)}</span>
                    <span className="text-[8.5px] text-teal-500 font-bold mt-0.5 leading-none" title={gasSettings?.agent}>
                      {gasSettings?.agent?.charAt(0).toUpperCase()}{vitals?.etAgent?.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[8px] lg:text-[9.5px] text-slate-600 font-bold uppercase tracking-wider select-none italic text-center">NO GAS</span>
                )}
              </div>
            </div>
            
            {/* BIS (Purple) */}
            <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-purple-500/20 transition-all overflow-hidden">
              <span className="text-[8px] lg:text-[9.5px] text-purple-400 font-bold uppercase tracking-wider leading-none">BIS</span>
              <div className="flex-1 flex items-center justify-center">
                {patient?.hasBisMonitor ? (
                  <span className={`${advClass} font-black text-purple-300 leading-none select-all`}>{vitals?.bis || 98}</span>
                ) : (
                  <span className="text-[8px] lg:text-[9.5px] text-slate-655 font-bold uppercase tracking-wider select-none italic text-center">NO EEG</span>
                )}
              </div>
            </div>
            
            {/* TOF (Orange) */}
            <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded p-1 flex flex-col justify-between hover:border-orange-555/20 transition-all overflow-hidden">
              <span className="text-[8px] lg:text-[9.5px] text-orange-400 font-bold uppercase tracking-wider leading-none">TOF</span>
              <div className="flex-1 flex items-center justify-center">
                {patient?.hasTofMonitor ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className={`${advClass} font-black text-orange-300 leading-none select-all`}>{vitals?.tofCount}/4</span>
                    <span className="text-[8.5px] text-orange-555 font-bold mt-0.5 leading-none">{(vitals?.tofRatio * 100).toFixed(0)}%</span>
                  </div>
                ) : (
                  <span className="text-[8px] lg:text-[9.5px] text-slate-655 font-black uppercase tracking-wider select-none italic font-mono text-center">NO TOF</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};