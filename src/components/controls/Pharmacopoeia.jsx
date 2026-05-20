import React, { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, FLUIDS } from '../../engine/Pharmacology';
import { Search, X } from 'lucide-react';

export const Pharmacopoeia = ({ pushFluid, processMed, patient, setPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [medInput, setMedInput] = useState({ drug: null, dose: '', indication: '', route: 'IV', type: 'Bolus', unit: '', lineId: '' });
  const [fluidInput, setFluidInput] = useState({ fluid: null, dose: '', lineId: '' });
  const searchRef = useRef(null);

  // QoL: Global Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMedSubmit = (medId) => {
    if (medInput.dose) {
      processMed(medId, medInput.dose, medInput.route, medInput.type, medInput.unit, medInput.lineId || patient.accessLines?.[0]?.id);
      setMedInput({ drug: null, dose: '', indication: '', route: 'IV', type: 'Bolus', unit: '', lineId: '' });
      setSearchTerm(''); // Auto-reset UI for next emergency
    }
  };

  const handleFluidSubmit = (fluidId) => {
    if (fluidInput.dose) {
      pushFluid(fluidId, fluidInput.dose, fluidInput.lineId || patient.accessLines?.[0]?.id);
      setFluidInput({ fluid: null, dose: '', lineId: '' });
      setSearchTerm('');
    }
  };

  const renderFluidButton = (fluidId, label, hint, colorClass) => {
    const isActive = fluidInput.fluid === fluidId;
    return (
      <div className="flex flex-col gap-1 mb-1" key={fluidId}>
        <button onClick={() => setFluidInput(isActive ? { fluid: null } : { fluid: fluidId, dose: '' })} className={`p-2 rounded text-xs text-left border transition-all ${colorClass} ${isActive ? 'ring-2 ring-white border-white' : 'hover:border-slate-400'}`}>
          <span className="font-bold text-white">{label}</span> <span className="text-slate-400 text-[10px] float-right">{hint}</span>
        </button>
        {isActive && (
          <div className="flex flex-col p-2 bg-slate-950 border border-slate-700 rounded animate-in slide-in-from-top-1 duration-200">
            <select value={fluidInput.lineId || patient.accessLines?.[0]?.id || ''} onChange={(e) => setFluidInput({...fluidInput, lineId: e.target.value})} className="w-full bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded p-1 mb-2">
              {patient.accessLines?.length > 0 ? patient.accessLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>) : <option value="">No Lines Available</option>}
            </select>
            {medInput.route === 'IV' && (
              <select value={medInput.lineId || patient.accessLines?.[0]?.id || ''} onChange={(e) => setMedInput({...medInput, lineId: e.target.value})} className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded p-1">
                {patient.accessLines?.length > 0 ? patient.accessLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>) : <option value="">No Venous Lines</option>}
              </select>
            )}
            <div className="flex gap-2">
              <input 
              autoFocus 
              type="number" 
              placeholder="Vol" 
              className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500" 
              value={fluidInput.dose} 
              onChange={(e) => setFluidInput({...fluidInput, dose: e.target.value})} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleFluidSubmit(fluidId); }}
            />
            <button onClick={() => handleFluidSubmit(fluidId)} className="w-1/2 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold text-white">PUSH</button>
            </div>
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
            {medInput.route === 'IV' && (
              <select value={medInput.lineId || patient.accessLines?.[0]?.id || ''} onChange={(e) => setMedInput({...medInput, lineId: e.target.value})} className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded p-1">
                {patient.accessLines?.length > 0 ? patient.accessLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>) : <option value="">No Venous Lines</option>}
              </select>
            )}
            <div className="flex gap-2">
              <select value={medInput.route} onChange={(e)=>setMedInput({...medInput, route: e.target.value})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/3">
                {med.routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input 
                autoFocus 
                type="number" 
                placeholder={`Dose (${medInput.unit})`} 
                className="w-1/3 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                value={medInput.dose} 
                onChange={(e) => setMedInput({...medInput, dose: e.target.value})} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleMedSubmit(medId); }}
              />
              <button onClick={() => handleMedSubmit(medId)} className="w-1/3 bg-cyan-700 hover:bg-cyan-600 rounded text-xs font-bold text-white">
                {medInput.type === 'Infusion' ? 'START INF' : 'PUSH'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const term = searchTerm.toLowerCase();
  const filteredFluids = Object.keys(FLUIDS).filter(id => id.toLowerCase().includes(term));
  const filteredMeds = Object.keys(MEDICATIONS).filter(id => MEDICATIONS[id].name.toLowerCase().includes(term) || MEDICATIONS[id].classes.some(c => c.toLowerCase().includes(term)));

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px] relative">
      
      {/* Omni-Search Header */}
      <div className="sticky top-0 z-50 bg-slate-900 pb-2 border-b border-slate-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search size={14} className="text-cyan-500" />
          </div>
          <input 
            ref={searchRef}
            type="text"
            placeholder="Search Meds & Fluids (Cmd+F)"
            className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 pl-8 text-xs font-bold outline-none focus:border-cyan-500 transition-all shadow-inner placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {searchTerm ? (
        <div className="flex flex-col gap-1 mt-2">
          {filteredFluids.length > 0 && <span className="text-teal-400 text-[10px] font-bold uppercase tracking-widest border-b border-teal-900 pb-1 mt-2 mb-1">Fluids & Blood</span>}
          {filteredFluids.map(f => renderFluidButton(f, f, '', FLUIDS[f].type === 'Blood Product' ? 'bg-red-900/40 border-red-800' : 'bg-blue-900/20 border-blue-800'))}
          
          {filteredMeds.length > 0 && <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest border-b border-cyan-900 pb-1 mt-2 mb-1">Medications</span>}
          {filteredMeds.map(m => renderAdvancedMedButton(m))}
          
          {filteredFluids.length === 0 && filteredMeds.length === 0 && (
            <div className="text-slate-500 text-xs italic text-center mt-4">No matching medications or fluids.</div>
          )}
        </div>
      ) : (
        <>
          {/* Fluid Resuscitation Line Selector */}
          {(!searchTerm || ['gravity', 'ranger', 'belmont', 'infusion', 'equipment', 'line', 'resuscitation', 'fluid line'].some(k => k.includes(searchTerm.toLowerCase()))) && (
            <div className="bg-slate-950/60 border border-teal-950 p-3 rounded-lg mb-2 flex flex-col gap-2">
              <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                Fluid Infusion Equipment
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'gravity', label: 'Gravity Drip', multiplier: '1.0x' },
                  { id: 'ranger', label: 'Ranger Warmer', multiplier: '1.5x' },
                  { id: 'belmont', label: 'Belmont Rapid', multiplier: '4.0x' }
                ].map(item => {
                  const isActive = (patient.fluidLine || 'gravity') === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPatient(p => ({ ...p, fluidLine: item.id }))}
                      className={`flex flex-col items-center justify-center p-1.5 rounded text-[10px] border font-bold transition-all ${
                        isActive 
                          ? 'bg-teal-950/45 border-teal-500 text-teal-200 shadow-[0_0_8px_rgba(20,184,166,0.2)] border-t border-t-teal-400' 
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[8px] mt-0.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`}>
                        {item.multiplier} Flow
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <details className="group">
            <summary className="text-teal-400 text-sm border-b border-teal-900 pb-1 uppercase font-bold cursor-pointer hover:text-teal-300 list-none flex justify-between">
              Crystalloids & Colloids <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {[ 'Albumin 5%', 'Lactated Ringers (LR)', 'Normal Saline (0.9% NS)', 'Plasmalyte' ].map(f => renderFluidButton(f, f, '', 'bg-blue-900/20 border-blue-800'))}
            </div>
          </details>

          <details className="group">
            <summary className="text-red-400 text-sm border-b border-red-900 pb-1 uppercase font-bold cursor-pointer hover:text-red-300 list-none flex justify-between">
              Blood Products <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {[
                { id: 'Cryoprecipitate', style: 'bg-slate-800 border-slate-700' },
                { id: 'Fibrinogen Concentrate', style: 'bg-slate-800 border-slate-700' },
                { id: 'Fresh Frozen Plasma (FFP)', style: 'bg-yellow-900/40 border-yellow-800' },
                { id: 'Packed Red Blood Cells (PRBC)', style: 'bg-red-900/40 border-red-800' },
                { id: 'Platelets', style: 'bg-yellow-900/40 border-yellow-800' }
              ].map(f => renderFluidButton(f.id, f.id, '', f.style))}
            </div>
          </details>

          <details className="group" open>
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Sedatives & Hypnotics <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['dexmedetomidine', 'etomidate', 'ketamine', 'midazolam', 'propofol'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Opioids & Analgesics <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['fentanyl', 'hydromorphone', 'morphine', 'remifentanil', 'sufentanil'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Paralytics & Reversals <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['cisatracurium', 'glycopyrrolate', 'neostigmine', 'rocuronium', 'succinylcholine', 'sugammadex', 'vecuronium'].map(renderAdvancedMedButton)}
            </div>
          </details>

          <details className="group">
            <summary className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold cursor-pointer hover:text-white list-none flex justify-between">
              Inotropes & Vasopressors <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['dobutamine', 'dopamine', 'ephedrine', 'epinephrine', 'milrinone', 'norepinephrine', 'phenylephrine', 'vasopressin'].map(renderAdvancedMedButton)}
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
              Diuretics <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {['acetazolamide', 'bumetanide', 'furosemide', 'mannitol'].map(renderAdvancedMedButton)}
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
        </>
      )}
    </div>
  );
};