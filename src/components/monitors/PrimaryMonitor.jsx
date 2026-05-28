import React from 'react';
import { Activity, Heart, Wind, RefreshCw, Thermometer } from 'lucide-react';
import { CanvasWaveform } from '../CanvasWaveform';

export const PrimaryMonitor = ({ patient, vitals, nibp, cycleNibp, isCyclingNibp, hrSpeed, rrSpeed, gasSettings, ventSettings, nibpIntervalMs, setNibpIntervalMs }) => {
  const showBottomRow = patient.hasBisMonitor || patient.hasTofMonitor || (patient.airwaySecured && vitals.mac > 0);

  return (
    <div className="glass-panel glass-cyan p-2 flex flex-col md:grid md:grid-cols-4 gap-2 min-h-[450px] md:min-h-0 md:h-[380px] lg:h-[450px] relative overflow-hidden">
      
      {patient.isArrest && (
         <>
            <div className="absolute inset-0 bg-red-600/20 z-40 animate-pulse pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-red-500 font-black text-4xl lg:text-6xl tracking-widest uppercase border-4 border-red-500 p-4 bg-black/90 rotate-[-5deg] pointer-events-none whitespace-nowrap">
                {patient.biologicalDeath ? 'BIOLOGICAL DEATH' : 'CARDIAC ARREST'}
            </div>
         </>
      )}
      
      {/* Primary Waveforms */}
      <div className="col-span-1 md:col-span-3 flex flex-col justify-between relative w-full h-[220px] md:h-full gap-1">
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-green-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">ECG II {patient.isArrest ? `(${patient.cardiacRhythm.toUpperCase()})` : (patient.ischemicDamage > 400 ? '(ST-ELEV)' : '')}</div>
          <CanvasWaveform 
             color="#22c55e" 
             speed={patient.isArrest ? (patient.cardiacRhythm === 'vfib' ? 150 : (patient.cardiacRhythm === 'asystole' ? 0 : hrSpeed)) : hrSpeed} 
             rrSpeed={rrSpeed} 
             active={true} 
             type="ecg" 
             morphology={patient.isArrest ? (patient.cardiacRhythm === 'vfib' ? 'vfib' : (patient.cardiacRhythm === 'vtach' ? 'vtach' : 'normal')) : (patient.ischemicDamage > 400 ? 'st_elevation' : 'normal')} 
          />
        </div>
        {patient.hasALine && (
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-red-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">ART</div>
            <CanvasWaveform color="#ef4444" speed={patient.cprActive ? 100 : hrSpeed} rrSpeed={rrSpeed} active={vitals.sys > 20 || patient.cprActive} type="aline" />
          </div>
        )}
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-cyan-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">PLETH</div>
          <CanvasWaveform color="#06b6d4" speed={patient.cprActive ? 100 : hrSpeed} rrSpeed={rrSpeed} active={(vitals.spo2 > 50 && !patient.isArrest) || patient.cprActive} type="pleth" />
        </div>
        {patient.airwaySecured && (
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-yellow-400/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">EtCO2</div>
            <CanvasWaveform 
              color="#facc15" 
              speed={rrSpeed} 
              rrSpeed={rrSpeed} 
              active={vitals.etco2 > 5} 
              type="etco2" 
              ieRatio={ventSettings?.ieRatio || 2}
              ampScale={Math.min(1.5, (vitals.etco2 || 40) / 40)} 
            />
          </div>
        )}
      </div>

      {/* Primary Numerical Vitals - 2-Column Grid */}
      <div className="col-span-1 grid grid-cols-2 gap-1 bg-black/45 backdrop-blur-md p-1 rounded-lg h-full border border-slate-800/60 shadow-inner align-content-start overflow-y-auto custom-scrollbar">
        
        {/* Heart Rate Card */}
        <div className="col-span-1 bg-slate-900/60 border border-slate-800/80 rounded p-1 flex flex-col justify-between h-[52px]">
          <div className="text-green-500 font-bold flex items-center gap-1 text-[9px] leading-none">
            <Heart size={10} className="text-green-500 animate-pulse"/>
            <span>HR</span>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-green-400 leading-none text-right">
            {vitals.hr}
          </div>
        </div>

        {/* SpO2 Card */}
        <div className="col-span-1 bg-slate-900/60 border border-slate-800/80 rounded p-1 flex flex-col justify-between h-[52px]">
          <div className="text-cyan-500 font-bold flex items-center gap-1 text-[9px] leading-none">
            <Wind size={10} className="text-cyan-500"/>
            <span>SpO2</span>
          </div>
          <div className="flex items-baseline justify-between leading-none">
            <span className="text-[6.5px] text-cyan-600 font-mono leading-none">
              M:{(vitals.metHb ?? 0).toFixed(0)}%<br/>
              C:{(vitals.coHb ?? 0).toFixed(0)}%
            </span>
            <div className={`text-2xl lg:text-3xl font-black leading-none text-right ${vitals.spo2 < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>
              {vitals.spo2}%
            </div>
          </div>
        </div>

        {/* Blood Pressure Card */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800/80 rounded p-1.5 flex flex-col justify-between h-[64px]">
          <div className="text-red-500 font-bold flex justify-between items-center w-full text-[9px] mb-0.5 leading-none">
            <span className="flex items-center gap-1 leading-none">
              <Activity size={10}/> 
              {patient.hasALine ? <abbr title="Arterial Line" className="no-underline">ART</abbr> : <abbr title="Non-Invasive Blood Pressure" className="no-underline">NIBP</abbr>}
            </span>
            {!patient.hasALine && (
              <div className="flex items-center gap-1 leading-none">
                <select 
                  value={nibpIntervalMs} 
                  onChange={(e) => setNibpIntervalMs(Number(e.target.value))}
                  className="bg-black/50 border border-slate-800 text-[8px] text-slate-300 rounded p-0.5 outline-none cursor-pointer leading-none h-[15px]"
                >
                  <option value={0}>Manual</option>
                  <option value={15000}>15s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={120000}>2m</option>
                  <option value={180000}>3m</option>
                  <option value={300000}>5m</option>
                </select>
                <button onClick={cycleNibp} disabled={isCyclingNibp} className={`bg-black/50 border border-slate-800 p-0.5 rounded transition h-[15px] flex items-center justify-center ${isCyclingNibp ? 'animate-spin text-cyan-400' : 'text-slate-400'}`}><RefreshCw size={8}/></button>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-end w-full">
            {/* PPV Column */}
            <div className="flex flex-col items-start leading-none">
              <span className="text-[7.5px] text-red-500/60 font-bold uppercase tracking-wider leading-none mb-0.5"><abbr title="Pulse Pressure Variation" className="no-underline">PPV</abbr></span>
              {(() => {
                const hasSinus = patient.cardiacRhythm === 'normal';
                const isMechVent = patient.ventilationStatus === 'mechanical' || (ventSettings?.mode && ventSettings?.mode !== 'spontaneous');
                const tvPerKg = (vitals.vte || 0) / (patient.weight || 70);
                const hasSufficientTv = tvPerKg >= 7.0;
                const hasHrRrRatio = (vitals.hr || 70) / (vitals.rr || 12) >= 4.0;
                const isPpvValid = hasSinus && isMechVent && hasSufficientTv && hasHrRrRatio;

                const eblRatio = (patient.ebl || 0) / (patient.ebv || 5000);
                const calculatedPpvVal = Math.max(3, Math.min(45, Math.round(8 + eblRatio * 50)));

                if (isPpvValid) {
                  return <span className="text-sm font-black text-red-400 leading-none">{calculatedPpvVal}%</span>;
                } else {
                  return (
                    <span 
                      className="text-[6.5px] font-bold text-slate-500 bg-black/40 border border-slate-800 px-0.5 py-0.2 rounded leading-none"
                      title="PPV INVALID (Spontaneous breaths, open abdomen, low TV, or rhythm)"
                    >
                      INVALID
                    </span>
                  );
                }
              })()}
            </div>
            
            {/* BP & MAP & cMAP Column */}
            <div className="flex items-baseline gap-1.5 leading-none">
              <div className="text-xl lg:text-2xl font-black text-red-400 leading-none">
                {patient.hasALine ? `${vitals.sys}/${vitals.dia}` : `${nibp.sys}/${nibp.dia}`}
              </div>
              <div className="flex flex-col items-end leading-none">
                <span className="text-[7px] text-red-500/60 font-bold uppercase tracking-wider mb-0.5">MAP</span>
                <span className="text-[11px] font-black text-red-400 leading-none">
                  ({Math.round(patient.hasALine ? vitals.map : (nibp.dia + (nibp.sys - nibp.dia) / 3))})
                </span>
                {patient.position && patient.position !== 'Supine' && (
                  <span className="text-[6.5px] text-orange-400 font-bold leading-none mt-0.5" title="Cerebral perfusion pressure adjusted MAP at circle of Willis">
                    cMAP ({Math.round(vitals.cmap || 0)})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* EtCO2 Card */}
        <div className="col-span-1 bg-slate-900/60 border border-slate-800/80 rounded p-1 flex flex-col justify-between h-[42px]">
          <span className="text-yellow-500 font-bold text-[9px] leading-none">EtCO2</span>
          {patient.airwaySecured ? (
            <span className="text-xl lg:text-2xl font-black text-yellow-400 leading-none text-right">{vitals.etco2}</span>
          ) : (
            <span className="text-[7.5px] text-slate-500 font-bold uppercase text-right leading-none">No Airway</span>
          )}
        </div>

        {/* RR Card */}
        <div className="col-span-1 bg-slate-900/60 border border-slate-800/80 rounded p-1 flex flex-col justify-between h-[42px]">
          <span className="text-white font-bold text-[9px] leading-none">RR</span>
          <span className={`text-xl lg:text-2xl font-black leading-none text-right ${vitals.rr < 8 ? 'text-slate-400 animate-pulse' : 'text-white'}`}>
            {vitals.rr}
          </span>
        </div>

        {/* Temperature Card */}
        <div className="col-span-2 bg-slate-900/60 border border-slate-800/80 rounded p-1 flex justify-between items-center h-[22px]">
          <div className="text-slate-400 font-bold flex items-center gap-1 text-[9px] leading-none">
            <Thermometer size={10} className="text-slate-400"/>
            <span>TEMP</span>
          </div>
          <div className="text-xs font-black text-slate-300 leading-none">
            {(vitals.temp || 37.0).toFixed(1)} <span className="text-[8px] font-normal text-slate-500">°C</span>
          </div>
        </div>

        {/* Bottom Row / Anesthesia & Neuromuscular Blockade */}
        {showBottomRow && (
          <div className="col-span-2 bg-slate-950/80 border border-slate-800/80 rounded p-1 flex flex-col gap-0.5">
            <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-0.5 leading-none">Anesthesia & NMJ Block</span>
            <div className="flex justify-between items-stretch gap-1">
              {/* MAC (Teal) */}
              {(patient.airwaySecured && vitals.mac > 0) ? (
                <div className="flex flex-col justify-between w-1/3 leading-none pr-0.5">
                  <span className="text-[7.5px] text-teal-400 font-bold leading-none">MAC</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-sm font-black text-teal-300 leading-none">{vitals.mac?.toFixed(1)}</span>
                    <span className="text-[6.5px] text-teal-500 font-bold leading-none" title={gasSettings?.agent}>
                      {gasSettings?.agent?.charAt(0).toUpperCase()}{vitals.etAgent?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : <div className="w-1/3 text-[7px] text-slate-600 font-bold italic flex items-center leading-none">No Gas</div>}
              
              {/* BIS (Purple) */}
              {patient.hasBisMonitor ? (
                <div className="flex flex-col justify-between w-1/3 border-l border-slate-800/60 px-1 leading-none">
                  <span className="text-[7.5px] text-purple-400 font-bold leading-none">BIS</span>
                  <span className="text-sm font-black text-purple-300 leading-none text-right mt-0.5">{vitals.bis || 98}</span>
                </div>
              ) : <div className="w-1/3 border-l border-slate-800/60 px-1 text-[7px] text-slate-600 font-bold italic flex items-center leading-none">No EEG</div>}
              
              {/* TOF (Orange) */}
              {patient.hasTofMonitor ? (
                <div className="flex flex-col justify-between w-1/3 border-l border-slate-800/60 pl-1 leading-none">
                  <span className="text-[7.5px] text-orange-400 font-bold leading-none">TOF</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-sm font-black text-orange-300 leading-none">{vitals.tofCount}/4</span>
                    <span className="text-[6.5px] text-orange-500 font-bold">{(vitals.tofRatio * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ) : <div className="w-1/3 border-l border-slate-800/60 pl-1 text-[7px] text-slate-600 font-bold italic flex items-center leading-none font-mono">No TOF</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};