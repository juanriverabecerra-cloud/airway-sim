import React, { useState } from 'react';
import { Droplet, Zap, AlertTriangle } from 'lucide-react';
import { MEDICATIONS } from '../../engine/Pharmacology';
import { getMedColor, getFluidColor } from './Pharmacopoeia';

export const LinesResusPanel = ({
  patient,
  setPatient,
  updateFluidRate,
  removeFluid,
  logEvent,
  processMed
}) => {
  const [editInfusionDose, setEditInfusionDose] = useState({});
  const [bolusInfusionDose, setBolusInfusionDose] = useState({});

  const handleUpdateInfusion = (medId, newDose, originalUnit, lineId) => {
    if ((newDose === undefined || newDose === null || newDose === '') || !lineId) return;
    
    setPatient(prev => {
      const newLines = (prev.accessLines || []).map(l => {
        if (l.id !== lineId) return l;
        const currentMeds = [...(l.activeMedInfusions || [])];
        const existingIdx = currentMeds.findIndex(m => m.medId === medId);
        
        if (parseFloat(newDose) <= 0) {
          return { ...l, activeMedInfusions: currentMeds.filter(m => m.medId !== medId) };
        }

        if (existingIdx >= 0) {
          currentMeds[existingIdx] = { ...currentMeds[existingIdx], rate: parseFloat(newDose) };
        } else {
          currentMeds.push({ medId, rate: parseFloat(newDose), unit: originalUnit });
        }
        return { ...l, activeMedInfusions: currentMeds };
      });
      return { ...prev, accessLines: newLines };
    });

    processMed(medId, newDose, 'IV', 'Infusion', originalUnit);
    logEvent(`Set ${medId} infusion rate to ${newDose} ${originalUnit} on selected line.`);
  };

  const handlePushFromInfusion = (medId, doseToPush, originalUnit, lineId) => {
    if (!doseToPush || !lineId) return;
    processMed(medId, doseToPush, 'IV', 'Bolus', originalUnit.replace('/hr', '').replace('/min', ''));
  };

  const resusLines = (patient?.accessLines || []).filter(l => l.category !== 'Arterial Line');
  let totalMedInfusionsCount = 0;
  resusLines.forEach(l => {
    if (l && !l.failed && l.activeMedInfusions) {
      totalMedInfusionsCount += l.activeMedInfusions.filter(m => m && parseFloat(m.rate) > 0).length;
    }
  });

  return (
    <div className="glass-panel glass-purple p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1.5 uppercase font-black flex items-center justify-between shrink-0 font-mono tracking-wider">
        <span className="flex items-center gap-1.5 text-purple-400"><Droplet size={14} /> Lines & Resus</span>
        <div className="flex gap-1.5">
          <span className="bg-purple-950/60 text-purple-400 px-2 py-0.5 rounded-md border border-purple-800/40 text-[9px] font-black font-mono">
            {resusLines.length} Lines
          </span>
          <span className="bg-purple-950/60 text-purple-400 px-2 py-0.5 rounded-md border border-purple-800/40 text-[9px] font-black font-mono">
            {totalMedInfusionsCount} Infusions
          </span>
        </div>
      </h3>

      <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1 min-h-0">
        {resusLines.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-8 italic border border-dashed border-white/5 rounded-2xl bg-white/[0.01] font-mono leading-normal my-auto">
            No resuscitation lines placed.<br/>
            <span className="text-[10px] text-slate-500 font-bold block mt-1.5">Place PIV or Central Line in Action Center.</span>
          </div>
        ) : (
          resusLines.map((line) => {
            const hasFluidInfusion = line.activeInfusions && line.activeInfusions.length > 0;
            const hasMedInfusion = line.activeMedInfusions && line.activeMedInfusions.some(m => parseFloat(m.rate) > 0);
            const isBlown = line.failed;
            const currentLineEq = line.fluidLine || patient.fluidLine || 'gravity';
            
            const isPIVOrIO = line.category?.includes('Peripheral IV') || line.category?.includes('IO') || line.category?.includes('Intraosseous');
            
            const isBelmontOnIOOrSmallIV = currentLineEq === 'belmont' && !isBlown && (
              line.category?.includes('IO') || 
              line.type?.includes('20G') || 
              line.type?.includes('22G') || 
              line.type?.includes('24G')
            );
            
            const hasPRBCInSmallIV = !isBlown && (
              line.activeInfusions && line.activeInfusions.some(inf => inf.name?.includes('PRBC')) && (
                line.type?.includes('22G') || 
                line.type?.includes('24G')
              )
            );

            return (
              <div 
                key={line.id} 
                className={`border rounded-2xl p-3.5 flex flex-col gap-3 transition-all duration-300 relative shadow-inner backdrop-blur-md ${
                  isBlown 
                    ? 'border-red-500/35 bg-red-950/10 shadow-[0_2px_12px_rgba(239,68,68,0.05)] opacity-50' 
                    : isPIVOrIO
                      ? 'border-cyan-500/30 bg-cyan-950/10 shadow-[0_2px_12px_rgba(6,182,212,0.08)]' 
                      : 'border-purple-500/30 bg-purple-950/10 shadow-[0_2px_12px_rgba(168,85,247,0.08)]'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      {!isBlown && (
                        <span className={`w-2 h-2 rounded-full inline-block ${
                          currentLineEq === 'belmont' 
                            ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
                            : currentLineEq === 'ranger' 
                              ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                              : 'bg-emerald-400'
                        }`} />
                      )}
                      <span className={`font-black text-xs tracking-wide font-mono ${
                        isBlown 
                          ? 'text-red-500 line-through' 
                          : isPIVOrIO
                            ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.15)]'
                            : 'text-purple-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.15)]'
                      }`}>
                        {line.name}
                      </span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono tracking-tighter mt-1">
                      r: {line.radius}mm | L: {line.length}mm | Pv: {line.venousPressure} | Rv: {line.veinResistance}
                    </span>
                  </div>
                  
                  {isBlown ? (
                    <span className="bg-red-950 border border-red-800 text-red-400 font-mono text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse">
                      BLOWN
                    </span>
                  ) : (
                    <span className={`font-mono text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                      currentLineEq === 'belmont' 
                        ? 'bg-rose-950/40 border-rose-900/40 text-rose-300' 
                        : currentLineEq === 'ranger' 
                          ? 'bg-amber-950/40 border-amber-900/40 text-amber-300' 
                          : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300'
                    }`}>
                      {currentLineEq === 'belmont' ? 'Belmont' : currentLineEq === 'ranger' ? 'Ranger' : 'Gravity'}
                    </span>
                  )}
                </div>

                {/* Delivery Equipment Toggle Selector */}
                {!isBlown && (
                  <div className="grid grid-cols-3 gap-1 bg-slate-950/90 border border-white/5 p-0.5 rounded-lg shrink-0 font-mono">
                    {[
                      { id: 'gravity', label: 'GRAVITY' },
                      { id: 'ranger', label: 'RANGER (3x)' },
                      { id: 'belmont', label: 'BELMONT (10x)' }
                    ].map(eq => {
                      const isEqActive = currentLineEq === eq.id;
                      return (
                        <button
                          key={eq.id}
                          onClick={() => {
                            setPatient(prev => {
                              const newLines = (prev.accessLines || []).map(l => {
                                if (l.id === line.id) return { ...l, fluidLine: eq.id };
                                return l;
                              });
                              return { ...prev, accessLines: newLines };
                            });
                            logEvent(`Swapped delivery equipment to ${eq.label} on ${line.name}. Flow dynamics updated.`);
                          }}
                          className={`py-1 text-[8px] font-black rounded-md tracking-tighter transition-all ${
                            isEqActive
                              ? eq.id === 'belmont'
                                ? 'bg-rose-900/40 text-rose-300 border border-rose-800/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                : eq.id === 'ranger'
                                  ? 'bg-amber-850/40 text-amber-300 border border-amber-800/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                  : 'bg-emerald-800/40 text-emerald-300 border border-emerald-800/40 shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                              : 'text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {eq.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isBelmontOnIOOrSmallIV && (
                  <div className="bg-rose-950/60 border border-rose-900/40 rounded-lg p-2 text-[9px] text-rose-300 leading-normal animate-pulse font-mono flex items-start gap-1.5">
                    <span>
                      <span className="font-black text-rose-400">⚠️ BLOWOUT RISK:</span> High pressure Belmont pump (300 mmHg) on {line.category.includes('IO') ? 'IO bone cavity' : 'narrow cannula'} can trigger an immediate vessel blowout!
                    </span>
                  </div>
                )}

                {hasPRBCInSmallIV && (
                  <div className="bg-amber-950/60 border border-amber-900/40 rounded-lg p-2 text-[9px] text-amber-300 leading-normal animate-pulse font-mono flex items-start gap-1.5">
                    <span>
                      <span className="font-black text-amber-400">⚠️ VISCOSITY DELAY:</span> High viscosity blood products will flow extremely slowly through a narrow IV cannula.
                    </span>
                  </div>
                )}

                {line.activeInfusions && line.activeInfusions.map((fluid) => {
                  const startVol = fluid.startingVolume || Math.max(fluid.remainingVolume, 300);
                  const pct = Math.max(0, Math.min(100, (fluid.remainingVolume / startVol) * 100));
                  const fluidColorTheme = getFluidColor(fluid.name);
                  const isBlood = fluid.name.includes('PRBC') || fluid.name.includes('Plasma') || fluid.name.includes('Platelets') || fluid.name.includes('Fibrinogen') || fluid.name.includes('Cryo');

                  return (
                    <div key={fluid.id} className="bg-slate-950/60 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5 font-mono">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-extrabold text-slate-200 text-[10px] tracking-wide">{fluid.name}</span>
                        <span className={`font-bold border px-1.5 py-0.5 rounded text-[10px] ${isBlood ? 'text-red-400 bg-red-950/20 border-red-900/40' : 'text-cyan-400 bg-cyan-950/20 border-cyan-900/40'}`}>
                          {Math.round(fluid.remainingVolume)} mL left
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${fluidColorTheme.progress} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      {fluid.currentRate > 0 && (
                        <div className="w-full h-1.5 bg-slate-950 border border-white/5 rounded-full overflow-hidden relative mt-0.5" title="Active intravenous infusion line">
                          <div className={`h-full w-full ${fluid.currentRate > 500 ? 'flowing-line-fast' : 'flowing-line'}`} />
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[8px] text-slate-500">
                        <span>Flow: <span className={`font-extrabold ${isBlood ? 'text-red-400' : 'text-cyan-400'}`}>{fluid.currentRate ? Math.round(fluid.currentRate) : 0} mL/hr</span></span>
                        <span>{Math.round(pct)}% left</span>
                      </div>
                      <div className="flex gap-1 mt-0.5">
                        <input 
                          type="number" 
                          disabled={isBlown}
                          placeholder="Rate" 
                          className="w-[30%] bg-slate-900 border border-slate-700 rounded px-1 text-[9px] text-white text-center outline-none focus:border-purple-500/50 transition-colors" 
                          value={editInfusionDose[fluid.id] !== undefined ? editInfusionDose[fluid.id] : ''} 
                          onChange={(e) => setEditInfusionDose({...editInfusionDose, [fluid.id]: e.target.value})} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateFluidRate(line.id, fluid.id, editInfusionDose[fluid.id]);
                            }
                          }}
                        />
                        <button onClick={() => updateFluidRate(line.id, fluid.id, editInfusionDose[fluid.id])} disabled={isBlown} className={`flex-1 glass-button ${fluidColorTheme.btn} py-0.5 text-[8px]`}>SET</button>
                        <button onClick={() => updateFluidRate(line.id, fluid.id, '')} disabled={isBlown} className={`flex-1 glass-button ${fluidColorTheme.btn} py-0.5 text-[8px]`}>MAX</button>
                        <button onClick={() => removeFluid(line.id, fluid.id)} className="flex-1 glass-button glass-button-rose py-0.5 text-[8px]">STOP</button>
                      </div>
                    </div>
                  );
                })}

                {/* Vasoactive Meds on line */}
                {(() => {
                  const combinedList = line.activeMedInfusions || [];

                  return combinedList.map((medInf) => {
                    if (!medInf.medId || parseFloat(medInf.rate) <= 0) return null;

                    const medData = MEDICATIONS[medInf.medId] || Object.values(MEDICATIONS).find(m => m.name.toLowerCase() === medInf.medId.toLowerCase());
                    const resolvedId = medData ? Object.keys(MEDICATIONS).find(k => MEDICATIONS[k].name === medData.name) : medInf.medId;
                    const baseUnit = medInf.unit ? medInf.unit.replace('/hr', '').replace('/min', '') : 'mg';
                    const medColorTheme = getMedColor(resolvedId);
                    const textColorClass = medColorTheme.active.includes('text-yellow') 
                      ? 'text-yellow-400' 
                      : medColorTheme.active.includes('text-orange')
                        ? 'text-orange-400'
                        : medColorTheme.active.includes('text-blue')
                          ? 'text-blue-400'
                          : medColorTheme.active.includes('text-emerald')
                            ? 'text-emerald-400'
                            : medColorTheme.active.includes('text-rose')
                              ? 'text-rose-455'
                              : 'text-purple-400';

                    return (
                      <div key={resolvedId} className="bg-slate-950/60 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5 font-mono mt-0.5">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className={`font-extrabold ${textColorClass} text-[10px] tracking-wide`}>{medData?.name || medInf.medId}</span>
                          <span className={`font-bold border px-1.5 py-0.5 rounded text-[10px] ${textColorClass} bg-slate-900/40 border-white/5`}>
                            {medInf.rate} {medInf.unit || 'mcg/kg/min'}
                          </span>
                        </div>
                        
                        <div className="flex gap-1.5 mt-0.5">
                          <input 
                            type="number" 
                            placeholder="Rate" 
                            className="w-1/3 bg-slate-900 border border-slate-700 rounded px-1 text-[9px] text-white text-center outline-none focus:border-purple-500/50 transition-colors" 
                            value={editInfusionDose[resolvedId] || ''} 
                            onChange={(e) => setEditInfusionDose({...editInfusionDose, [resolvedId]: e.target.value})} 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editInfusionDose[resolvedId]) {
                                handleUpdateInfusion(resolvedId, editInfusionDose[resolvedId], medInf.unit, line.id);
                                setEditInfusionDose({...editInfusionDose, [resolvedId]: ''});
                              }
                            }}
                          />
                          <button onClick={() => { if (editInfusionDose[resolvedId]) { handleUpdateInfusion(resolvedId, editInfusionDose[resolvedId], medInf.unit, line.id); setEditInfusionDose({...editInfusionDose, [resolvedId]: ''}); } }} className={`w-1/3 glass-button ${medColorTheme.btn} py-0.5 text-[8px]`}>UPDATE</button>
                          <button onClick={() => { handleUpdateInfusion(resolvedId, 0, medInf.unit, line.id); }} className="w-1/3 glass-button glass-button-rose py-0.5 text-[8px]">STOP</button>
                        </div>

                        <div className="flex gap-1.5 border-t border-slate-900 pt-1.5 mt-0.5">
                          <input 
                            type="number" 
                            placeholder={`Push (${baseUnit})`} 
                            className="w-1/2 bg-slate-900 border border-slate-700 rounded px-1 text-[9px] text-white text-center outline-none focus:border-purple-500/50 transition-colors" 
                            value={bolusInfusionDose[resolvedId] || ''} 
                            onChange={(e) => setBolusInfusionDose({...bolusInfusionDose, [resolvedId]: e.target.value})} 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && bolusInfusionDose[resolvedId]) {
                                handlePushFromInfusion(resolvedId, bolusInfusionDose[resolvedId], medInf.unit, line.id);
                                setBolusInfusionDose({...bolusInfusionDose, [resolvedId]: ''});
                              }
                            }}
                          />
                          <button 
                            onClick={() => { if (bolusInfusionDose[resolvedId]) { handlePushFromInfusion(resolvedId, bolusInfusionDose[resolvedId], medInf.unit, line.id); setBolusInfusionDose({...bolusInfusionDose, [resolvedId]: ''}); } }} 
                            className={`w-1/2 glass-button ${medColorTheme.btn} py-0.5 text-[8px] uppercase tracking-wider`}
                          >
                            GIVE PUSH
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
