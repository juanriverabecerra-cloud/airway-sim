import React, { useState } from 'react';
import { Droplet, Wind, Stethoscope, AlertTriangle } from 'lucide-react';
import { MEDICATIONS } from '../../engine/Pharmacology';

export const AirwayPanel = ({ patient, setPatient, handleSuction, optimizeAirway, pushMed, setViewModal, setSetupModal, setTubeConfirmModal, logEvent, handleSurgicalCric, handleExtubation, activeMeds, processMed, updateFluidRate, removeFluid }) => {
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });
  const [editInfusionDose, setEditInfusionDose] = useState({});
  const [bolusInfusionDose, setBolusInfusionDose] = useState({});
  const [extubateConfirm, setExtubateConfirm] = useState(false);

  const activeInfusions = activeMeds ? activeMeds.filter(m => m.currentInfusionRate > 0) : [];
  
  const activeFluids = [];
  (patient.accessLines || []).forEach(line => {
    (line.activeInfusions || []).forEach(inf => {
       activeFluids.push({ ...inf, lineId: line.id, lineName: line.name });
    });
  });

  const handleUpdateInfusion = (medId, newDose, originalUnit) => {
    if (newDose) processMed(medId, newDose, 'IV', 'Infusion', originalUnit);
  };

  const handlePushFromInfusion = (medId, doseToPush, originalUnit) => {
    if (doseToPush) processMed(medId, doseToPush, 'IV', 'Bolus', originalUnit.replace('/hr', '').replace('/min', ''));
  };

  const handlePlaceAirway = (id, size) => {
    // ATLS CRITICAL GUARD: Basilar Skull Fracture / Facial Trauma Contraindication
    if (id.includes('Nasopharyngeal') && patient.trauma) {
      logEvent(`🚨 CRITICAL ERROR: Attempted NPA placement in severe facial/basilar skull trauma! The device breached the fractured cribriform plate and entered the cranial vault!`);
      setAirwayToolInput({tool: null});
      return;
    }
    optimizeAirway(`${id} (Size ${size})`);
    setAirwayToolInput({tool: null});
  };

  const handleJawThrust = () => {
    logEvent("Applied firm Jaw Thrust and Two-Handed Mask Seal. Upper airway soft tissue obstruction temporarily relieved.");
    setPatient(p => ({...p, bmvOptimized: true}));
  };

  const executeExtubation = () => {
    if (extubateConfirm) {
      handleExtubation();
      setExtubateConfirm(false);
    } else {
      logEvent("⚠️ CLINICAL PAUSE: Evaluating Extubation Criteria. Ensure TOF > 90%, spontaneous respiratory drive, and intact airway reflexes. Click EXTUBATE again to pull the tube.");
      setExtubateConfirm(true);
      setTimeout(() => setExtubateConfirm(false), 5000); // 5 second confirmation window
    }
  };

  const renderActiveInfusions = (isSecured) => {
    const lines = patient.accessLines || [];
    // Resuscitation lines are lines with category !== 'Arterial Line'
    const resusLines = lines.filter(l => l.category !== 'Arterial Line');
    
    return (
      <div className={`flex flex-col gap-3 w-full shrink min-h-0 ${isSecured ? 'flex-1' : ''}`}>
         {/* Resuscitation Section Header */}
         <h3 className="text-slate-400 text-xs border-b border-slate-800 pb-1 uppercase font-black flex items-center justify-between shrink-0 font-mono tracking-wider">
           Resuscitation Access & Fluids
           <span className="bg-teal-950 text-teal-300 px-2 py-0.5 rounded text-[10px] border border-teal-800 font-bold font-mono">
             {resusLines.length} Placed
           </span>
         </h3>

         {/* Access Line Cards */}
         <div className={`flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 shrink-0 ${isSecured ? 'max-h-[300px]' : 'max-h-[220px]'}`}>
           {resusLines.length === 0 ? (
             <div className="text-slate-600 text-xs text-center py-4 italic border border-dashed border-slate-800 rounded-xl bg-slate-900/30 font-mono">
               No resuscitation lines placed.
             </div>
           ) : (
             resusLines.map((line, idx) => {
               const hasInfusion = line.activeInfusions && line.activeInfusions.length > 0;
               const isBlown = line.failed;
               
               const currentLineEq = line.fluidLine || patient.fluidLine || 'gravity';
               
               // Warning conditions
               const isBelmontOnIOOrSmallIV = currentLineEq === 'belmont' && !isBlown && (
                 line.category.includes('IO') || 
                 line.type.includes('20G') || 
                 line.type.includes('22G') || 
                 line.type.includes('24G')
               );
               
               const hasPRBCInSmallIV = !isBlown && (
                 line.activeInfusions && line.activeInfusions.some(inf => inf.name.includes('PRBC')) && (
                   line.type.includes('22G') || 
                   line.type.includes('24G')
                 )
               );

               return (
                 <div 
                   key={line.id} 
                   className={`bg-slate-950/80 border rounded-xl p-3 flex flex-col gap-2.5 transition-all duration-300 relative shadow-lg backdrop-blur-md ${
                     isBlown 
                       ? 'border-red-950 opacity-60 bg-red-950/10' 
                       : hasInfusion 
                         ? 'border-teal-900/80 hover:border-teal-700/80 shadow-teal-950/20' 
                         : 'border-slate-800 hover:border-slate-700'
                   }`}
                 >
                   {/* Header Row */}
                   <div className="flex justify-between items-start">
                     <div className="flex flex-col">
                       <div className="flex items-center gap-1.5">
                         {/* Equipment Indicator Dot */}
                         {!isBlown && (
                           <span className={`w-2 h-2 rounded-full inline-block ${
                             currentLineEq === 'belmont' 
                               ? 'bg-rose-500 animate-pulse' 
                               : currentLineEq === 'ranger' 
                                 ? 'bg-amber-400 animate-pulse' 
                                 : 'bg-teal-400'
                           }`} />
                         )}
                         <span className={`font-extrabold text-xs tracking-wide ${isBlown ? 'text-red-500 line-through' : 'text-slate-200'}`}>
                           {line.name}
                         </span>
                       </div>
                       <span className="text-[9px] text-slate-500 font-mono tracking-tighter mt-0.5">
                         r: {line.radius}mm | L: {line.length}mm | Pv: {line.venousPressure} | Rv: {line.veinResistance}
                       </span>
                     </div>
                     
                     {isBlown ? (
                       <span className="bg-red-950/80 border border-red-800 text-red-400 font-mono text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse">
                         BLOWN OUT
                       </span>
                     ) : (
                       <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                         currentLineEq === 'belmont' 
                           ? 'bg-rose-950/50 border border-rose-900/60 text-rose-300' 
                           : currentLineEq === 'ranger' 
                             ? 'bg-amber-950/50 border border-amber-900/60 text-amber-300' 
                             : 'bg-teal-950/50 border border-teal-900/60 text-teal-300'
                       }`}>
                         {currentLineEq === 'belmont' ? 'Belmont' : currentLineEq === 'ranger' ? 'Ranger' : 'Gravity'}
                       </span>
                     )}
                   </div>

                   {/* Delivery Equipment Toggle Selector (Segments) */}
                   {!isBlown && (
                     <div className="grid grid-cols-3 gap-1 bg-slate-900/80 border border-slate-800 p-0.5 rounded-lg">
                       {[
                         { id: 'gravity', label: 'GRAVITY' },
                         { id: 'ranger', label: 'RANGER' },
                         { id: 'belmont', label: 'BELMONT' }
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
                             className={`py-1 text-[8px] font-bold rounded-md font-mono tracking-wider transition-all ${
                               isEqActive
                                 ? eq.id === 'belmont'
                                   ? 'bg-rose-900 text-rose-100 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                   : eq.id === 'ranger'
                                     ? 'bg-amber-850 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                     : 'bg-teal-800 text-teal-100 shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                                 : 'text-slate-500 hover:bg-slate-800 hover:text-slate-400'
                             }`}
                           >
                             {eq.label}
                           </button>
                         );
                       })}
                     </div>
                   )}

                   {/* Belmont IO / Narrow Cannula Blowout Alert */}
                   {isBelmontOnIOOrSmallIV && (
                     <div className="bg-rose-950/60 border border-rose-900/60 rounded-lg p-2 text-[9px] text-rose-300 leading-normal animate-pulse font-mono flex items-start gap-1.5">
                       <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                       <span>
                         <span className="font-extrabold text-rose-400">⚠️ BLOWOUT DANGER:</span> Belmont pump driving pressure (300 mmHg) on {line.category.includes('IO') ? 'IO marrow sinusoids' : 'narrow IV'} causes high resistance pressure loads. High risk of immediate {line.category.includes('IO') ? 'marrow blowout / compartment syndrome' : 'catheter vein blowout'}!
                       </span>
                     </div>
                   )}

                   {/* Sluggish Viscosity Alert */}
                   {hasPRBCInSmallIV && (
                     <div className="bg-amber-950/60 border border-amber-900/60 rounded-lg p-2 text-[9px] text-amber-300 leading-normal animate-pulse font-mono flex items-start gap-1.5">
                       <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                       <span>
                         <span className="font-extrabold text-amber-400">⚠️ VISCOSITY IMPEDANCE:</span> Viscous PRBCs (η = 3.5) passing through a narrow {line.type} cannula will experience massive resistance. Flow rates will be severely sluggish.
                       </span>
                     </div>
                   )}

                   {/* Infusions list on this line */}
                   {line.activeInfusions && line.activeInfusions.map((fluid, fIdx) => {
                     const startVol = fluid.startingVolume || Math.max(fluid.remainingVolume, 300);
                     const pct = Math.max(0, Math.min(100, (fluid.remainingVolume / startVol) * 100));
                     
                     // Get viscosity class name
                     const viscosity = fluid.name.includes('PRBC') ? 3.5 : (fluid.name.includes('Albumin') ? 1.5 : (fluid.name.includes('FFP') || fluid.name.includes('Platelets') || fluid.name.includes('Cryo') || fluid.name.includes('Fibrinogen') ? 1.8 : 1.0));

                     return (
                       <div key={fluid.id} className="bg-slate-900/90 border border-slate-800/85 rounded-lg p-2.5 flex flex-col gap-2 font-mono">
                         <div className="flex justify-between items-center text-[10px]">
                           <div className="flex flex-col">
                             <span className="font-extrabold text-slate-100 text-[11px] tracking-wide">{fluid.name}</span>
                             <span className="text-[8px] text-slate-500 mt-0.5">Viscosity η = {viscosity}</span>
                           </div>
                           <div className="flex flex-col items-end">
                             <span className="text-teal-400 font-bold text-xs bg-teal-950 border border-teal-900 px-2 py-0.5 rounded">
                               {Math.round(fluid.remainingVolume)} mL left
                             </span>
                           </div>
                         </div>

                         {/* High Tech Glowing Progress Bar */}
                         <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden relative shadow-inner">
                           <div 
                             className={`h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full shadow-[0_0_6px_rgba(20,184,166,0.5)] transition-all duration-300 ${fluid.currentRate > 0 ? 'animate-pulse' : ''}`}
                             style={{ width: `${pct}%` }}
                           />
                         </div>

                         <div className="flex justify-between items-center text-[9px] text-slate-400">
                           <span>Flow: <span className="text-emerald-400 font-extrabold">{fluid.currentRate ? Math.round(fluid.currentRate) : 0} mL/hr</span> {fluid.userRate !== undefined ? '(LIMIT)' : '(MAX)'}</span>
                           <span>{Math.round(pct)}% remaining</span>
                         </div>

                         {/* Resuscitation Controls Row */}
                         <div className="flex gap-1.5 mt-1">
                           <input 
                             type="number" 
                             disabled={isBlown}
                             placeholder="mL/hr" 
                             className={`w-[30%] bg-slate-950 border border-slate-700 focus:border-teal-500 rounded px-1.5 py-1 text-[9px] text-white outline-none text-center transition-colors ${isBlown ? 'opacity-40' : ''}`} 
                             value={editInfusionDose[fluid.id] !== undefined ? editInfusionDose[fluid.id] : ''} 
                             onChange={(e) => setEditInfusionDose({...editInfusionDose, [fluid.id]: e.target.value})} 
                           />
                           <button 
                             onClick={() => { updateFluidRate(line.id, fluid.id, editInfusionDose[fluid.id]); setEditInfusionDose({...editInfusionDose, [fluid.id]: ''}); }} 
                             disabled={isBlown}
                             className={`flex-1 bg-teal-950 hover:bg-teal-900/60 border border-teal-800 text-teal-300 text-[8px] font-bold rounded uppercase tracking-wider transition-all py-1 ${isBlown ? 'opacity-40 cursor-not-allowed' : ''}`}
                           >
                             SET
                           </button>
                           <button 
                             onClick={() => updateFluidRate(line.id, fluid.id, '')} 
                             disabled={isBlown}
                             className={`flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[8px] font-bold rounded uppercase tracking-wider transition-all py-1 ${isBlown ? 'opacity-40 cursor-not-allowed' : ''}`}
                           >
                             MAX
                           </button>
                           <button 
                             onClick={() => removeFluid(line.id, fluid.id)} 
                             className="flex-1 bg-red-950/60 hover:bg-red-900/60 border border-red-900/50 text-red-300 text-[8px] font-bold rounded uppercase tracking-wider transition-all py-1"
                           >
                             STOP
                           </button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               );
             })
           )}
         </div>

         {/* Vasoactive & Sedative Infusions Header */}
         <h3 className="text-slate-400 text-xs border-b border-slate-800 pb-1 uppercase font-black flex items-center justify-between shrink-0 font-mono tracking-wider mt-2">
           Vasoactive & Sedative Infusions
           <span className="bg-green-950 text-green-300 px-2 py-0.5 rounded text-[10px] border border-green-800 font-bold font-mono">
             {activeInfusions.length} Running
           </span>
         </h3>

         {/* Vasoactive/Medication Infusions List */}
         <div className={`flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 mb-2 ${isSecured ? 'max-h-[220px]' : 'max-h-[150px]'}`}>
           {activeInfusions.length === 0 ? (
             <div className="text-slate-600 text-xs text-center py-4 italic border border-dashed border-slate-800 rounded-xl bg-slate-900/30 font-mono">
               No medication infusions active.
             </div>
           ) : (
             activeInfusions.map((med, idx) => {
               const medData = MEDICATIONS[med.medId];
               const baseUnit = med.displayUnit ? med.displayUnit.replace('/hr', '').replace('/min', '') : 'mg';
               
               let hint = '';
               if (medData && medData.indications) {
                 const infInd = Object.values(medData.indications).find(i => i.type === 'Infusion');
                 if (infInd) hint = `${infInd.dose} ${infInd.unit}`;
               }

               return (
                 <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 transition-colors hover:border-slate-700 shadow-md">
                   <div className="flex justify-between items-start font-mono">
                     <div className="flex flex-col">
                       <span className="font-extrabold text-slate-200 text-xs tracking-wide">{med.name}</span>
                       {hint && <span className="text-[8px] text-slate-500 tracking-tighter mt-0.5">Rec: {hint}</span>}
                     </div>
                     <span className="text-emerald-400 font-bold text-xs bg-emerald-950/50 border border-emerald-900/60 px-2 py-0.5 rounded">
                       {med.displayDose} {med.displayUnit}
                     </span>
                   </div>
                   
                   <div className="flex gap-1.5">
                     <input 
                       type="number" 
                       placeholder="New Rate" 
                       className="w-1/3 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-2 py-1 text-[9px] text-white outline-none text-center transition-colors font-mono" 
                       value={editInfusionDose[med.medId] || ''} 
                       onChange={(e) => setEditInfusionDose({...editInfusionDose, [med.medId]: e.target.value})} 
                     />
                     <button 
                       onClick={() => { handleUpdateInfusion(med.medId, editInfusionDose[med.medId], med.displayUnit); setEditInfusionDose({...editInfusionDose, [med.medId]: ''}); }} 
                       className="w-1/3 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 text-[8px] font-bold rounded-lg uppercase tracking-wider transition-all font-mono py-1"
                     >
                       UPDATE
                     </button>
                     <button 
                       onClick={() => processMed(med.medId, 0, 'IV', 'Stop Infusion', '')} 
                       className="w-1/3 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-[8px] font-bold rounded-lg uppercase tracking-wider transition-all font-mono py-1"
                     >
                       STOP
                     </button>
                   </div>
                   
                   <div className="flex gap-1.5 border-t border-slate-800/40 pt-2">
                     <input 
                       type="number" 
                       placeholder={`Push (${baseUnit})`} 
                       className="w-1/2 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-lg px-2 py-1 text-[9px] text-white outline-none text-center transition-colors font-mono" 
                       value={bolusInfusionDose[med.medId] || ''} 
                       onChange={(e) => setBolusInfusionDose({...bolusInfusionDose, [med.medId]: e.target.value})} 
                     />
                     <button 
                       onClick={() => { handlePushFromInfusion(med.medId, bolusInfusionDose[med.medId], med.displayUnit); setBolusInfusionDose({...bolusInfusionDose, [med.medId]: ''}); }} 
                       className="w-1/2 bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 text-[8px] font-bold rounded-lg uppercase tracking-wider transition-all font-mono py-1"
                     >
                       GIVE PUSH
                     </button>
                   </div>
                 </div>
               );
             })
           )}
         </div>
      </div>
    );
  };

  const renderAirwayToolButton = (id, label, hint, sizes) => {
    const isActive = airwayToolInput.tool === id;
    return (
      <div className="flex flex-col gap-1 mb-1">
        <button onClick={() => setAirwayToolInput(isActive ? { tool: null, size: '' } : { tool: id, size: sizes[0] })} className={`bg-slate-800 p-2 rounded text-xs text-left border transition-all ${isActive ? 'border-yellow-400' : 'border-slate-700 hover:border-slate-500'}`}>
          {label} <span className="text-[10px] text-slate-500 float-right">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-2 p-2 bg-slate-900 border border-yellow-900 rounded animate-in slide-in-from-top-1">
            <select value={airwayToolInput.size} onChange={(e) => setAirwayToolInput({...airwayToolInput, size: e.target.value})} className="w-2/3 bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 outline-none">
              {sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => handlePlaceAirway(id, airwayToolInput.size)} className="w-1/3 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-bold text-white">PLACE</button>
          </div>
        )}
      </div>
    );
  };

  if (patient.airwaySecured) {
    return (
      <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 h-full max-h-[800px] overflow-hidden">
         {/* Active Infusions Block (Passed TRUE for flex-1 expansion) */}
         {renderActiveInfusions(true)}
         
         {/* Airway Secured Header (Compact, anchored at absolute bottom) */}
         <div className="flex flex-col items-center justify-center text-center p-3 border border-slate-700 rounded-xl bg-slate-900/50 shadow-inner shrink-0 w-full mt-auto gap-3">
           <div className="flex items-center gap-2">
             <Wind size={24} className="text-cyan-500/50" />
             <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-widest">Airway Secured</h3>
           </div>
           
           <button onClick={() => { handleSuction(); logEvent("Performed deep in-line tracheal suctioning. Cleared ETT of mucous plugs."); }} className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded text-[10px] text-center border border-slate-600 text-slate-300 font-bold transition-colors">
              <Droplet size={14} className="inline mr-2 text-blue-400"/> IN-LINE TRACHEAL SUCTION
           </button>

           <div className="flex w-full gap-2">
             <button onClick={() => setTubeConfirmModal({ show: true, result: '' })} className="flex-1 bg-indigo-900/40 hover:bg-indigo-800/60 p-2 rounded text-[10px] text-center border border-indigo-800 text-indigo-200 font-bold uppercase tracking-wider transition-colors flex items-center justify-center">
                <Stethoscope size={14} className="mr-1"/> Auscultate
             </button>
             <button onClick={executeExtubation} 
               className={`flex-1 p-2 rounded text-[10px] text-center border font-bold uppercase tracking-wider transition-colors flex items-center justify-center ${extubateConfirm ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white animate-pulse' : 'bg-red-900/40 hover:bg-red-800/60 border-red-800 text-red-200'}`}>
                {extubateConfirm ? <><AlertTriangle size={14} className="mr-1"/> CONFIRM PULL</> : 'Extubate'}
             </button>
           </div>
         </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 h-full max-h-[800px] overflow-hidden">
      
      {/* Active Infusions Block (Passed FALSE to restrict height) */}
      {renderActiveInfusions(false)}

      <div className="shrink-0 flex flex-col gap-2 w-full">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 shrink-0">
           <h3 className="text-yellow-400 font-bold flex items-center gap-2"><Wind size={18}/> Airway Control</h3>
           {patient.airwayBlood && <span className="animate-pulse bg-red-900/50 text-red-400 text-[10px] px-2 py-1 rounded font-bold border border-red-800">AIRWAY COMPROMISED</span>}
        </div>

        <div className="flex gap-2 w-full">
            <button onClick={handleJawThrust} className="flex-1 p-2 rounded text-xs text-center border font-bold transition-all bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700">
              JAW THRUST / MASK SEAL
            </button>
            <button onClick={handleSuction} className={`flex-1 p-2 rounded text-xs text-center border transition-all font-bold ${patient.airwayBlood ? 'bg-red-700 text-white animate-pulse border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
              <Droplet size={14} className="inline mr-1"/> YANKAUER
            </button>
        </div>

        <button onClick={() => pushMed('Topical Lidocaine Spray', 1)} className={`p-2 rounded text-xs text-center border font-bold transition-all ${patient.isTopicalized ? 'bg-green-900/40 border-green-800 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
          {patient.isTopicalized ? 'TOPICALIZED' : 'TOPICALIZE AIRWAY (LIDOCAINE 4%)'}
        </button>

        <div className="mt-2">
          {renderAirwayToolButton('Oropharyngeal Airway (OPA)', 'Place OPA', 'Bite Block', ['80mm', '90mm', '100mm'])}
          {renderAirwayToolButton('Nasopharyngeal Airway (NPA)', 'Place NPA', 'Nasal Trumpet', ['28Fr', '30Fr', '32Fr'])}
          {renderAirwayToolButton('Laryngeal Mask Airway (LMA)', 'Place LMA', 'Rescue Airway', ['Size 3', 'Size 4', 'Size 5'])}
        </div>

        <button onClick={() => setSetupModal(true)} className="w-full mt-2 bg-green-900/40 hover:bg-green-800/60 border border-green-500 p-3 rounded font-black text-green-400 text-sm shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all active:scale-95 uppercase tracking-widest">
          PREPARE TO INTUBATE
        </button>

        <button onClick={handleSurgicalCric} onDoubleClick={handleSurgicalCric} className="w-full mt-2 bg-red-950 hover:bg-red-900 border-2 border-red-800 p-2 rounded font-black text-red-500 text-xs text-center uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity">
          Surgical Cricothyroidotomy
        </button>
      </div>

    </div>
  );
};