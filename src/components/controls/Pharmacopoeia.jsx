import React, { useState } from 'react';
import { MEDICATIONS } from '../../engine/Pharmacology';

export const Pharmacopoeia = ({ pushFluid, processMed, patient }) => {
  const [medInput, setMedInput] = useState({ drug: null, dose: '', indication: '', route: 'IV', type: 'Bolus', unit: '' });
  const [fluidInput, setFluidInput] = useState({ fluid: null, dose: '' });

  const renderFluidButton = (fluidId, label, hint, colorClass) => {
    const isActive = fluidInput.fluid === fluidId;
    return (
      <div className="flex flex-col gap-1 mb-1" key={fluidId}>
        <button onClick={() => setFluidInput(isActive ? { fluid: null } : { fluid: fluidId, dose: '' })} className={`p-2 rounded text-xs text-left border transition-all ${colorClass} ${isActive ? 'ring-2 ring-white border-white' : 'hover:border-slate-400'}`}>
          <span className="font-bold text-white">{label}</span> <span className="text-slate-400 text-[10px] float-right">{hint}</span>
        </button>
        {isActive && (
          <div className="flex gap-2 p-2 bg-slate-950 border border-slate-700 rounded animate-in slide-in-from-top-1 duration-200">
            <input autoFocus type="number" placeholder="Vol" className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" value={fluidInput.dose} onChange={(e) => setFluidInput({...fluidInput, dose: e.target.value})} />
            <button onClick={() => { if (fluidInput.dose) { pushFluid(fluidId, fluidInput.dose); setFluidInput({ fluid: null }); } }} className="w-1/2 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold text-white">PUSH</button>
          </div>
        )}
      </div>
    );
  };

  const renderAdvancedMedButton = (medId) => {
    const med = MEDICATIONS[medId];
    if (!med) return null;
    const isActive = medInput.drug === medId;
    const indicationKeys = Object.keys(med.indications);

    const handleIndicationChange = (e) => {
      const ind = e.target.value; const data = med.indications[ind];
      setMedInput({ ...medInput, indication: ind, route: med.routes[0], type: data.type, unit: data.unit, dose: '' });
    };

    return (
      <div className="flex flex-col gap-1 mb-2" key={medId}>
        <button onClick={() => setMedInput(isActive ? { drug: null } : { drug: medId, indication: indicationKeys[0], route: med.routes[0], type: med.indications[indicationKeys[0]].type, unit: med.indications[indicationKeys[0]].unit, dose: '' })}
          className={`bg-slate-800 p-2 rounded text-[11px] text-left border transition-all ${isActive ? 'border-cyan-400 ring-1 ring-cyan-500' : 'border-slate-700 hover:border-slate-500'}`}>
          <span className="font-bold text-white">{med.name}</span> <span className="text-slate-400 text-[9px] float-right">{med.classes[0]}</span>
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-cyan-900 rounded animate-in slide-in-from-top-1 duration-200">
            <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold px-1 uppercase tracking-widest border-b border-cyan-900/50 pb-1">
              <span>Dosing Profile</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-white">Uses {med.dosingWeight || 'TBW'}</span>
            </div>
            <select value={medInput.indication} onChange={handleIndicationChange} className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded p-1">
              {indicationKeys.map(ind => <option key={ind} value={ind}>{ind} (Rec: {med.indications[ind].dose} {med.indications[ind].unit})</option>)}
            </select>
            <div className="flex gap-2">
              <select value={medInput.route} onChange={(e)=>setMedInput({...medInput, route: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/3">
                {med.routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input autoFocus type="number" placeholder={`Dose (${medInput.unit})`} className="w-1/3 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                value={medInput.dose} onChange={(e) => setMedInput({...medInput, dose: e.target.value})} />
              <button onClick={() => { if (medInput.dose) { processMed(medId, medInput.dose, medInput.route, medInput.type, medInput.unit); setMedInput({ drug: null }); } }}
                className="w-1/3 bg-cyan-700 hover:bg-cyan-600 rounded text-xs font-bold text-white">
                {medInput.type === 'Infusion' ? 'START INF' : 'PUSH'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px]">
      
      <details className="group">
        <summary className="text-teal-400 text-sm border-b border-teal-900 pb-1 uppercase font-bold cursor-pointer hover:text-teal-300 list-none flex justify-between">
          Crystalloids & Colloids <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {[
            { id: 'Albumin 5%', label: 'Albumin 5%', hint: '500 mL' },
            { id: 'Lactated Ringers (LR)', label: 'Lactated Ringers (LR)', hint: '500-1000 mL' },
            { id: 'Normal Saline (0.9% NS)', label: 'Normal Saline (0.9% NS)', hint: '500-1000 mL' },
            { id: 'Plasmalyte', label: 'Plasmalyte', hint: '500-1000 mL' }
          ].map(f => renderFluidButton(f.id, f.label, f.hint, 'bg-blue-900/20 border-blue-800'))}
        </div>
      </details>

      <details className="group">
        <summary className="text-red-400 text-sm border-b border-red-900 pb-1 uppercase font-bold cursor-pointer hover:text-red-300 list-none flex justify-between">
          Blood Products <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {[
            { id: 'Cryoprecipitate', label: 'Cryoprecipitate', hint: '10 Units', style: 'bg-slate-800 border-slate-700' },
            { id: 'Fibrinogen Concentrate', label: 'Fibrinogen', hint: '2-4 g', style: 'bg-slate-800 border-slate-700' },
            { id: 'Fresh Frozen Plasma (FFP)', label: 'Fresh Frozen Plasma', hint: '1-2 Units', style: 'bg-yellow-900/40 border-yellow-800' },
            { id: 'Packed Red Blood Cells (PRBC)', label: 'Packed Red Blood Cells', hint: '1-2 Units', style: 'bg-red-900/40 border-red-800' },
            { id: 'Platelets', label: 'Platelets', hint: '1 Unit', style: 'bg-yellow-900/40 border-yellow-800' }
          ].map(f => renderFluidButton(f.id, f.label, f.hint, f.style))}
        </div>
      </details>

      <details className="group" open>
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Sedatives & Hypnotics <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['dexmedetomidine', 'etomidate', 'ketamine', 'lorazepam', 'midazolam', 'propofol', 'thiopental'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Opioids & Analgesics <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['fentanyl', 'hydromorphone', 'meperidine', 'morphine', 'remifentanil', 'sufentanil'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Paralytics <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['cisatracurium', 'pancuronium', 'rocuronium', 'succinylcholine', 'vecuronium'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Reversals & Rescue <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['flumazenil', 'glycopyrrolate', 'naloxone', 'neostigmine', 'sugammadex'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Inotropes & Vasopressors <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['angiotensin_ii', 'dobutamine', 'dopamine', 'ephedrine', 'epinephrine', 'methylene_blue', 'milrinone', 'norepinephrine', 'phenylephrine', 'vasopressin'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Antihypertensives <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['clevidipine', 'clonidine', 'enalaprilat', 'esmolol', 'hydralazine', 'labetalol', 'metoprolol', 'nicardipine', 'nitroglycerin', 'nitroprusside', 'phentolamine'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Cardiac & Electrolytes <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['adenosine', 'amiodarone', 'atropine', 'bicarbonate', 'calcium', 'digoxin', 'diltiazem', 'ibutilide', 'lidocaine', 'magnesium', 'procainamide', 'sotalol', 'verapamil'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Diuretics <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['acetazolamide', 'bumetanide', 'furosemide', 'mannitol'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Coagulation & Hematologic <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['heparin', 'protamine', 'tranexamic_acid'].map(renderAdvancedMedButton)}
        </div>
      </details>

      <details className="group">
        <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
          Antiemetics & Respiratory <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex flex-col gap-1 mt-2">
          {['albuterol', 'dexamethasone', 'ondansetron'].map(renderAdvancedMedButton)}
        </div>
      </details>
    </div>
  );
};