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

      {/* Primary Numerical Vitals */}
      <div className="col-span-1 flex flex-col bg-black/45 backdrop-blur-md p-2 rounded-lg h-full border border-slate-800/60 shadow-inner justify-between">
        <div className="flex justify-between items-center w-full">
          <div className="text-green-500 font-bold flex flex-col"><span className="text-xs"><Heart size={14} className="inline mr-1"/>HR</span></div>
          <div className="text-5xl lg:text-6xl font-black text-green-400 leading-none">{vitals.hr}</div>
        </div>
        
        <div className="flex flex-col w-full mt-1 pt-1 border-t border-slate-900">
          <div className="flex justify-between items-center w-full">
            <div className="text-cyan-500 font-bold flex flex-col"><span className="text-xs"><Wind size={14} className="inline mr-1"/>SpO2</span></div>
            <div className={`text-4xl lg:text-5xl font-black leading-none ${vitals.spo2 < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>{vitals.spo2}%</div>
          </div>
          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 mt-1 text-[9px] text-cyan-600 font-bold border-t border-slate-900 pt-1">
            <div><abbr title="Methemoglobin">MetHb</abbr>: <span className="text-cyan-400">{(vitals.metHb ?? 0).toFixed(1)}%</span></div>
            <div><abbr title="Carboxyhemoglobin">COHb</abbr>: <span className="text-cyan-400">{(vitals.coHb ?? 0).toFixed(1)}%</span></div>
            <div>R-Ratio: <span className="text-cyan-400">{(vitals.r_ratio ?? 0.85).toFixed(2)}</span></div>
            <div><abbr title="Arterial Oxygen Content">CaO2</abbr>: <span className="text-cyan-400">{(vitals.cao2 ?? 20).toFixed(1)} <span className="text-[7px]">mL/dL</span></span></div>
            <div className="col-span-2"><abbr title="Venous Oxygen Content">CvO2</abbr>: <span className="text-cyan-400">{(vitals.cvo2 ?? 15).toFixed(1)} <span className="text-[7px]">mL/dL</span></span></div>
          </div>
        </div>

        {/* Core Temperature Addition */}
        <div className="flex justify-between items-center w-full mt-1">
          <div className="text-slate-400 font-bold flex flex-col"><span className="text-xs"><Thermometer size={14} className="inline mr-1"/>TEMP</span></div>
          <div className="text-2xl lg:text-3xl font-black text-slate-300 leading-none">{(vitals.temp || 37.0).toFixed(1)} <span className="text-sm">°C</span></div>
        </div>
        
        <div className="flex flex-col w-full my-1 pt-2 border-t border-slate-800">
          <div className="text-red-500 font-bold flex justify-between items-end w-full mb-1">
            <span className="flex items-center gap-1 text-xs"><Activity size={14} className="inline"/> {patient.hasALine ? <abbr title="Arterial Line (Invasive Blood Pressure)">ART</abbr> : <abbr title="Non-Invasive Blood Pressure">NIBP</abbr>}</span>
            {!patient.hasALine && (
              <div className="flex items-center gap-1">
                  <select 
                      value={nibpIntervalMs} 
                      onChange={(e) => setNibpIntervalMs(Number(e.target.value))}
                      className="glass-input text-[10px] text-slate-300 rounded p-0.5 outline-none cursor-pointer"
                  >
                      <option value={0}>Manual</option>
                      <option value={15000}>15s</option>
                      <option value={30000}>30s</option>
                      <option value={60000}>1m</option>
                      <option value={120000}>2m</option>
                      <option value={180000}>3m</option>
                      <option value={300000}>5m</option>
                  </select>
                  <button onClick={cycleNibp} disabled={isCyclingNibp} className={`glass-button p-1 transition ${isCyclingNibp ? 'animate-spin text-cyan-400 border-cyan-400' : 'text-slate-400'}`}><RefreshCw size={10}/></button>
              </div>
            )}
          </div>
          <div className="flex justify-between items-start w-full">
            {/* PPV Column */}
            <div className="flex flex-col items-start w-[35%]">
              <span className="text-[10px] text-red-500/70 font-bold tracking-widest uppercase"><abbr title="Pulse Pressure Variation">PPV</abbr></span>
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
                  return <span className="text-xl font-black text-red-400 leading-none">{calculatedPpvVal}%</span>;
                } else {
                  return (
                    <span 
                      className="text-[8px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded cursor-help hover:text-red-300 transition-colors whitespace-nowrap"
                      title="PPV INVALID (Spontaneous breaths, open abdomen, low TV, or rhythm)"
                    >
                      INVALID
                    </span>
                  );
                }
              })()}
            </div>
            
            {/* Blood Pressure & MAP Column */}
            <div className="flex flex-col items-end w-[65%]">
              <div className="text-3xl lg:text-4xl font-black text-red-400 leading-none tracking-tighter">
                {patient.hasALine ? `${vitals.sys}/${vitals.dia}` : `${nibp.sys}/${nibp.dia}`}
              </div>
              <div className="text-lg lg:text-xl font-black text-red-500/90 mt-1 flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-red-500/70 font-bold tracking-widest uppercase"><abbr title="Mean Arterial Pressure">MAP</abbr></span>
                  <span>({Math.round(patient.hasALine ? vitals.map : (nibp.dia + (nibp.sys - nibp.dia) / 3))})</span>
                </div>
                {patient.position && patient.position !== 'Supine' && (
                  <div className="flex items-center gap-1 text-orange-400">
                    <span className="text-[9px] font-bold tracking-widest uppercase opacity-85"><abbr title="Calculated Mean Arterial Pressure at base of skull">cMAP</abbr></span>
                    <span>({Math.round(vitals.cmap || 0)})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end w-full mt-1 pt-2 border-t border-slate-800">
          <div className="flex flex-col">
             {patient.airwaySecured ? (
               <>
                <span className="text-yellow-400 font-bold text-xs">EtCO2</span>
                <span className="text-3xl lg:text-4xl font-black text-yellow-400 leading-none mt-1">{vitals.etco2}</span>
               </>
             ) : (
               <span className="text-slate-700 text-xs font-bold uppercase tracking-widest">No Airway</span>
             )}
          </div>
          <div className="flex flex-col items-end">
             <span className="text-white font-bold text-xs">RR</span>
             <span className={`text-3xl lg:text-4xl font-black leading-none mt-1 ${vitals.rr < 8 ? 'text-slate-400 animate-pulse' : 'text-white'}`}>{vitals.rr}</span>
          </div>
        </div>

        {showBottomRow && (
          <div className="flex justify-between w-full border-t border-slate-800 pt-1 mt-1">
            {(patient.airwaySecured && vitals.mac > 0) ? (
               <div className="flex flex-col items-start w-1/3 pr-2">
                  <span className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">MAC (Age {patient.age})</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl lg:text-4xl font-black text-teal-300 leading-none">{vitals.mac?.toFixed(1)}</span>
                    <div className="flex flex-col mb-0.5">
                      <span className="text-[10px] text-teal-500 font-bold leading-none">{gasSettings?.agent?.charAt(0).toUpperCase() + gasSettings?.agent?.slice(1)} {vitals.etAgent?.toFixed(1)}%</span>
                      {vitals.etN2O > 0 && <span className="text-[10px] text-blue-500 font-bold leading-none mt-0.5">Nitrous Oxide {vitals.etN2O?.toFixed(0)}%</span>}
                    </div>
                  </div>
               </div>
            ) : <div className="w-1/3"></div>}
            
            {patient.hasBisMonitor ? (
               <div className="flex flex-col items-center w-1/3 border-l border-slate-800 px-2">
                  <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase">BIS</span>
                  <span className="text-3xl lg:text-4xl font-black text-purple-300 leading-none">{vitals.bis || 98}</span>
               </div>
            ) : <div className="w-1/3 border-l border-slate-800 px-2"></div>}
            
            {patient.hasTofMonitor ? (
               <div className="flex flex-col items-end w-1/3 border-l border-slate-800 pl-2">
                  <span className="text-[10px] text-orange-400 font-bold tracking-widest uppercase">TOF</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl lg:text-4xl font-black text-orange-300 leading-none">{vitals.tofCount}/4</span>
                    <span className="text-xs text-orange-500 font-bold">{(vitals.tofRatio * 100).toFixed(0)}%</span>
                  </div>
               </div>
            ) : <div className="w-1/3 border-l border-slate-800 pl-2"></div>}
          </div>
        )}
      </div>
    </div>
  );
};