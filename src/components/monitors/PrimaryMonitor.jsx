import React from 'react';
import { Activity, Heart, Wind, RefreshCw } from 'lucide-react';
import { CanvasWaveform } from '../CanvasWaveform';

export const PrimaryMonitor = ({ patient, vitals, nibp, cycleNibp, hrSpeed, rrSpeed, gasSettings }) => {
  return (
    <div className="bg-black border-2 border-slate-800 rounded-xl p-2 flex flex-col lg:grid lg:grid-cols-4 gap-2 min-h-[450px] lg:h-[450px] shadow-2xl relative overflow-hidden">
      
      {patient.isArrest && (
         <>
            <div className="absolute inset-0 bg-red-600/20 z-40 animate-pulse pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-red-500 font-black text-4xl lg:text-6xl tracking-widest uppercase border-4 border-red-500 p-4 bg-black/90 rotate-[-5deg] pointer-events-none whitespace-nowrap">
                {patient.biologicalDeath ? 'BIOLOGICAL DEATH' : 'CARDIAC ARREST'}
            </div>
         </>
      )}
      
      {/* Primary Waveforms */}
      <div className="col-span-1 lg:col-span-3 flex flex-col justify-between relative w-full h-[300px] lg:h-full gap-1">
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-green-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">ECG II {patient.isArrest ? `(${patient.cardiacRhythm.toUpperCase()})` : ''}</div>
          <CanvasWaveform 
             color="#22c55e" 
             speed={patient.isArrest ? (patient.cardiacRhythm === 'vfib' ? 1.5 : (patient.cardiacRhythm === 'asystole' ? 0 : hrSpeed)) : hrSpeed} 
             rrSpeed={rrSpeed} 
             active={true} 
             type="ecg" 
             morphology={patient.isArrest ? (patient.cardiacRhythm === 'vfib' ? 'vfib' : (patient.cardiacRhythm === 'vtach' ? 'vtach' : 'normal')) : 'normal'} 
          />
        </div>
        {patient.hasALine && (
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-red-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">ART</div>
            <CanvasWaveform color="#ef4444" speed={patient.cprActive ? 1.6 : hrSpeed} rrSpeed={rrSpeed} active={vitals.sys > 20 || patient.cprActive} type="aline" />
          </div>
        )}
        <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
          <div className="absolute text-cyan-500/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">PLETH</div>
          <CanvasWaveform color="#06b6d4" speed={patient.cprActive ? 1.6 : hrSpeed} rrSpeed={rrSpeed} active={(vitals.spo2 > 50 && !patient.isArrest) || patient.cprActive} type="pleth" />
        </div>
        {patient.airwaySecured && (
          <div className="flex-1 flex items-center w-full border-b border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute text-yellow-400/50 text-[10px] md:text-xs top-1 left-1 z-20 font-bold">EtCO2</div>
            <CanvasWaveform color="#facc15" speed={rrSpeed} rrSpeed={rrSpeed} active={vitals.etco2 > 5} type="etco2" />
          </div>
        )}
      </div>

      {/* Primary Numerical Vitals */}
      <div className="col-span-1 flex flex-col bg-[#050505] p-2 rounded-lg h-full border border-slate-800 shadow-inner justify-between">
        <div className="flex justify-between items-center w-full">
          <div className="text-green-500 font-bold flex flex-col"><span className="text-xs"><Heart size={14} className="inline mr-1"/>HR</span></div>
          <div className="text-5xl lg:text-6xl font-black text-green-400 leading-none">{vitals.hr}</div>
        </div>
        
        <div className="flex justify-between items-center w-full mt-1">
          <div className="text-cyan-500 font-bold flex flex-col"><span className="text-xs"><Wind size={14} className="inline mr-1"/>SpO2</span></div>
          <div className={`text-4xl lg:text-5xl font-black leading-none ${vitals.spo2 < 88 ? 'text-cyan-600 animate-pulse' : 'text-cyan-400'}`}>{vitals.spo2}</div>
        </div>
        
        <div className="flex flex-col w-full my-1 pt-2 border-t border-slate-800">
          <div className="text-red-500 font-bold flex justify-between items-end w-full mb-1">
            <span className="flex items-center gap-1 text-xs"><Activity size={14} className="inline"/> {patient.hasALine ? 'ART' : 'NIBP'}</span>
            {!patient.hasALine && <button onClick={cycleNibp} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded transition"><RefreshCw size={10}/></button>}
          </div>
          <div className="flex flex-col items-end w-full">
            <div className="text-3xl lg:text-4xl font-black text-red-400 leading-none tracking-tighter">
              {patient.hasALine ? `${vitals.sys}/${vitals.dia}` : `${nibp.sys}/${nibp.dia}`}
            </div>
            <div className="text-lg lg:text-xl font-black text-red-500/90 mt-1 flex items-center gap-1">
              <span className="text-[10px] text-red-500/70 font-bold tracking-widest uppercase">MAP</span>
              ({Math.round((patient.hasALine ? vitals.dia : nibp.dia) + ((patient.hasALine ? vitals.sys : nibp.sys) - (patient.hasALine ? vitals.dia : nibp.dia)) / 3)})
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

        {(patient.hasBisMonitor || patient.hasTofMonitor) && (
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