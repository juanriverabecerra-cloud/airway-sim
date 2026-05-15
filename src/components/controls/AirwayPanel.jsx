import React, { useState } from 'react';
import { Droplet, Wind, Stethoscope, AlertTriangle } from 'lucide-react';
import { MEDICATIONS } from '../../engine/Pharmacology';

export const AirwayPanel = ({ patient, setPatient, handleSuction, optimizeAirway, pushMed, setViewModal, setSetupModal, setTubeConfirmModal, logEvent, handleSurgicalCric, handleExtubation, activeMeds, processMed }) => {
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });
  const [editInfusionDose, setEditInfusionDose] = useState({});
  const [bolusInfusionDose, setBolusInfusionDose] = useState({});
  const [extubateConfirm, setExtubateConfirm] = useState(false);

  const activeInfusions = activeMeds ? activeMeds.filter(m => m.currentInfusionRate > 0) : [];

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

  const renderActiveInfusions = (isSecured) => (
     <div className={`flex flex-col gap-2 w-full shrink min-h-0 ${isSecured ? 'flex-1' : ''}`}>
        <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center justify-between shrink-0">
          Active Infusions
          <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-[10px] border border-blue-800">{activeInfusions.length}</span>
        </h3>
        {activeInfusions.length === 0 ? (
           <div className="text-slate-600 text-xs text-center mt-2 mb-2 italic border border-dashed border-slate-800 rounded p-4 bg-slate-900/30 shrink-0">No active infusions.</div>
        ) : (
           <div className={`flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 mb-2 ${isSecured ? 'h-full max-h-none' : 'max-h-[350px]'}`}>
              {activeInfusions.map((med, idx) => {
                 const medData = MEDICATIONS[med.medId];
                 const baseUnit = med.displayUnit ? med.displayUnit.replace('/hr', '').replace('/min', '') : 'mg';
                 
                 let hint = '';
                 if (medData && medData.indications) {
                   const infInd = Object.values(medData.indications).find(i => i.type === 'Infusion');
                   if (infInd) hint = `${infInd.dose} ${infInd.unit}`;
                 }

                 return (
                   <div key={idx} className="bg-slate-900/80 border border-slate-700 rounded p-2 flex flex-col gap-2 shadow-sm transition-colors hover:border-slate-500 shrink-0">
                      <div className="flex justify-between items-start">
                         <div className="flex flex-col">
                           <span className="font-bold text-white text-xs">{med.name}</span>
                           {hint && <span className="text-[9px] text-slate-500 font-mono tracking-tighter">Rec: {hint}</span>}
                         </div>
                         <span className="text-green-400 font-mono text-xs bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/50">{med.displayDose} {med.displayUnit}</span>
                      </div>
                      
                      <div className="flex gap-1.5">
                         <input type="number" placeholder="New Rate" className="w-1/3 bg-slate-950 border border-slate-600 focus:border-blue-500 rounded px-1 py-1 text-[10px] text-white outline-none text-center transition-colors" 
                                value={editInfusionDose[med.medId] || ''} onChange={(e) => setEditInfusionDose({...editInfusionDose, [med.medId]: e.target.value})} />
                         <button onClick={() => { handleUpdateInfusion(med.medId, editInfusionDose[med.medId], med.displayUnit); setEditInfusionDose({...editInfusionDose, [med.medId]: ''}); }} 
                                 className="w-1/3 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-800 text-blue-200 text-[9px] font-bold rounded uppercase tracking-wider transition-colors">Update</button>
                         <button onClick={() => processMed(med.medId, 0, 'IV', 'Stop Infusion', '')} 
                                 className="w-1/3 bg-red-900/40 hover:bg-red-800/60 border border-red-800 text-red-200 text-[9px] font-bold rounded uppercase tracking-wider transition-colors">Stop</button>
                      </div>
                      
                      <div className="flex gap-1.5 border-t border-slate-800/50 pt-2">
                         <input type="number" placeholder={`Push (${baseUnit})`} className="w-1/2 bg-slate-950 border border-slate-600 focus:border-purple-500 rounded px-1 py-1 text-[10px] text-white outline-none text-center transition-colors" 
                                value={bolusInfusionDose[med.medId] || ''} onChange={(e) => setBolusInfusionDose({...bolusInfusionDose, [med.medId]: e.target.value})} />
                         <button onClick={() => { handlePushFromInfusion(med.medId, bolusInfusionDose[med.medId], med.displayUnit); setBolusInfusionDose({...bolusInfusionDose, [med.medId]: ''}); }} 
                                 className="w-1/2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-800 text-purple-200 text-[9px] font-bold rounded uppercase tracking-wider transition-colors">Give Push</button>
                      </div>
                   </div>
                 );
              })}
           </div>
        )}
     </div>
  );

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