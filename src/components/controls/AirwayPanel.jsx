import React, { useState } from 'react';
import { Droplet, Wind, Stethoscope } from 'lucide-react';

export const AirwayPanel = ({ patient, setPatient, handleSuction, optimizeAirway, pushMed, setViewModal, setSetupModal, setTubeConfirmModal, logEvent, handleSurgicalCric, handleExtubation }) => {
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });

  const renderAirwayToolButton = (id, label, hint, sizes) => {
    const isActive = airwayToolInput.tool === id;
    return (
      <div className="flex flex-col gap-1 mb-1">
        <button onClick={() => setAirwayToolInput(isActive ? { tool: null, size: '' } : { tool: id, size: sizes[0] })} className={`bg-slate-800 p-2 rounded text-xs text-left border transition-all ${isActive ? 'border-yellow-400' : 'border-slate-700'}`}>
          {label} <span className="text-[10px] text-slate-500 float-right">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-2 p-2 bg-slate-900 border border-yellow-900 rounded animate-in slide-in-from-top-1">
            <select value={airwayToolInput.size} onChange={(e) => setAirwayToolInput({...airwayToolInput, size: e.target.value})} className="w-2/3 bg-slate-950 text-xs text-white border border-slate-700 p-1 rounded outline-none">
              {sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => { optimizeAirway(`${id} (Size ${airwayToolInput.size})`); setAirwayToolInput({ tool: null, size: ''}); }} className="w-1/3 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-bold text-white">PLACE</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px]">
      {!patient.airwaySecured ? (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold">Airway Optimization</h3>
          <div className="flex flex-col gap-2">
            <button onClick={handleSuction} className="bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-600 p-3 rounded text-sm font-bold text-left shadow flex justify-between">Suction Airway <Droplet size={18} className="text-yellow-400"/></button>
            <div className="flex flex-col mt-1">
              {renderAirwayToolButton('Oropharyngeal Airway (OPA)', 'Oropharyngeal Airway', 'Guedel', ['80mm (Small Adult)', '90mm (Medium Adult)', '100mm (Large Adult)'])}
              {renderAirwayToolButton('Nasopharyngeal Airway (NPA)', 'Nasopharyngeal Airway', 'French', ['28F (Small)', '30F (Medium)', '32F (Large)', '34F (X-Large)'])}
            </div>
            <button onClick={() => pushMed('Topical Lidocaine 4% (Atomizer)', 0)} className="bg-teal-900/40 hover:bg-teal-800 p-2 rounded text-xs text-center border border-teal-800 mt-1">Topicalize Airway (Awake Prep)</button>
          </div>
          
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2">Intubation</h3>
          <button onClick={() => { setViewModal(v => ({...v, blade: '', bladeSize: '', tubeSize: '', adjunct: ''})); setSetupModal(true); }} className="bg-green-900/40 hover:bg-green-800 p-4 rounded text-base text-center border border-green-500 font-black shadow-lg uppercase text-green-300">
            Prepare to Intubate
          </button>

          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-auto">Rescue / Surgical</h3>
          <div className="flex flex-col gap-2 mt-1">
            {renderAirwayToolButton('Laryngeal Mask Airway', 'Insert LMA (Rescue)', 'Size', ['Size 3', 'Size 4', 'Size 5'])}
           <button onClick={handleSurgicalCric} className="bg-red-900/40 hover:bg-red-800 p-2 rounded text-xs text-left text-red-200 border border-red-900 mt-1">Surgical Cricothyroidotomy</button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50">
           <Wind size={48} className="text-cyan-500/50 mb-4" />
           <h3 className="text-cyan-400 font-bold text-lg mb-2 uppercase tracking-widest">Airway Secured</h3>
           <p className="text-slate-400 text-sm mb-4">Ventilator controls are active.</p>
           
           <div className="flex flex-col w-full gap-3 mt-4">
             <button onClick={() => setTubeConfirmModal({ show: true, result: '' })} className="bg-indigo-900/40 hover:bg-indigo-800 p-3 w-full rounded text-sm text-center border border-indigo-500 text-indigo-200 font-bold">
                <Stethoscope size={16} className="inline mr-2"/> Auscultate / Confirm
             </button>
             
             <button onClick={() => {
               logEvent("Airway removed / Extubated patient.");
               setPatient(p => ({
                 ...p, 
                 airwaySecured: false, 
                 ventilationStatus: p.isApneic ? 'failed' : 'spontaneous', 
                 tubePosition: null, 
                 currentO2Device: 'Room Air', 
                 currentFiO2: 21, 
                 currentO2Flow: 0
               }));
             }} className="bg-red-900/40 hover:bg-red-800 p-3 w-full rounded text-sm text-center border border-red-500 text-red-200 font-bold mt-4">
                Remove Airway / Extubate
             </button>
           </div>
        </div>
      )}
    </div>
  );
};