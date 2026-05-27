import React, { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, FLUIDS } from '../../engine/Pharmacology';
import { Search, X, Droplet, Activity, ShieldAlert, Zap, Layers, RefreshCw } from 'lucide-react';

export const Pharmacopoeia = ({ 
  pushFluid, 
  processMed, 
  patient, 
  setPatient, 
  updateFluidRate, 
  removeFluid, 
  logEvent 
}) => {
  const [activeTab, setActiveTab] = useState('meds'); // 'meds' | 'infusions'
  const [activeSubTab, setActiveSubTab] = useState('induction'); // 'induction' | 'analgesia' | 'hemodynamics' | 'other' | 'fluids'
  const [searchTerm, setSearchTerm] = useState('');
  const [medInput, setMedInput] = useState({ drug: null, dose: '', indication: '', route: 'IV', type: 'Bolus', unit: '', lineId: '' });
  const [fluidInput, setFluidInput] = useState({ fluid: null, dose: '', lineId: '' });
  const [editInfusionDose, setEditInfusionDose] = useState({});
  const [bolusInfusionDose, setBolusInfusionDose] = useState({});
  const searchRef = useRef(null);

  // QoL: Global Keyboard Shortcut to focus search
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
      setSearchTerm('');
    }
  };

  const handleFluidSubmit = (fluidId) => {
    const selectedLineId = fluidInput.lineId || patient.accessLines?.[0]?.id;
    const selectedLine = patient.accessLines?.find(l => l.id === selectedLineId);
    if (selectedLine?.category === 'Arterial Line') return;
    if (fluidInput.dose) {
      pushFluid(fluidId, fluidInput.dose, selectedLineId);
      setFluidInput({ fluid: null, dose: '', lineId: '' });
      setSearchTerm('');
    }
  };

  const getFluidUnitLabel = (fluidId) => {
    if (fluidId.includes('Fibrinogen')) return 'g';
    const type = FLUIDS[fluidId]?.type;
    if (type === 'Blood Product' || type === 'Colloid') return 'Units';
    return 'mL';
  };

  const getFluidVolumePreview = (fluidId, doseStr) => {
    const dose = parseFloat(doseStr);
    if (isNaN(dose) || dose <= 0) return '';
    const fluid = FLUIDS[fluidId];
    if (!fluid) return '';
    if (fluidId.includes('Fibrinogen')) {
      return `≈ ${dose * 50} mL (${dose} g)`;
    }
    if (fluid.type === 'Blood Product' || fluid.type === 'Colloid') {
      return `≈ ${dose * (fluid.defaultVol || 300)} mL (${dose} Units)`;
    }
    return '';
  };

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

  // Group Definitions
  const GROUPS = {
    induction: ['propofol', 'etomidate', 'ketamine', 'midazolam', 'dexmedetomidine'],
    analgesia: ['fentanyl', 'sufentanil', 'remifentanil', 'hydromorphone', 'morphine', 'rocuronium', 'succinylcholine', 'vecuronium', 'cisatracurium'],
    hemodynamics: ['norepinephrine', 'epinephrine', 'phenylephrine', 'vasopressin', 'ephedrine', 'atropine', 'esmolol', 'labetalol', 'metoprolol', 'nicardipine', 'clevidipine', 'nitroglycerin'],
    other: ['sugammadex', 'neostigmine', 'glycopyrrolate', 'unasyn', 'albuterol', 'calcium', 'magnesium', 'bicarbonate', 'lidocaine', 'adenosine', 'amiodarone', 'furosemide'],
    fluids: ['Lactated Ringers (LR)', 'Normal Saline (0.9% NS)', 'Plasmalyte', 'Albumin 5%', 'Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets', 'Cryoprecipitate', 'Fibrinogen Concentrate']
  };

  const renderFluidButton = (fluidId, colorClass) => {
    const isActive = fluidInput.fluid === fluidId;
    const selectedLineId = fluidInput.lineId || patient.accessLines?.[0]?.id;
    const selectedLine = patient.accessLines?.find(l => l.id === selectedLineId);
    const isArterial = selectedLine?.category === 'Arterial Line';

    return (
      <div className="flex flex-col gap-1 mb-1.5" key={fluidId}>
        <button 
          onClick={() => setFluidInput(isActive ? { fluid: null } : { fluid: fluidId, dose: '', lineId: selectedLineId })} 
          className={`p-2 rounded-lg text-xs text-left border transition-all glass-button ${colorClass} ${isActive ? 'border-cyan-400 text-cyan-200' : 'border-slate-800'}`}
        >
          <span className="font-bold text-slate-100">{fluidId}</span>
        </button>
        {isActive && (
          <div className="flex flex-col p-2.5 bg-slate-950/90 border border-cyan-900/50 rounded-lg animate-in slide-in-from-top-1 duration-200">
            <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider font-mono">Select Resus Line</label>
            <select 
              value={selectedLineId || ''} 
              onChange={(e) => setFluidInput({...fluidInput, lineId: e.target.value})} 
              className="w-full bg-slate-900 text-xs text-slate-300 border border-slate-700 rounded-md p-1.5 mb-2 focus:border-cyan-500 focus:outline-none font-mono"
            >
              {patient.accessLines?.length > 0 ? patient.accessLines.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}{l.failed ? ' (FAILED)' : ''}
                </option>
              )) : <option value="">No Lines Placed</option>}
            </select>

            {isArterial && (
              <div className="bg-rose-950/60 border border-rose-900 rounded p-2 mb-2 text-[10px] text-rose-300 leading-normal animate-pulse font-mono">
                <span className="font-extrabold text-rose-400 block mb-0.5">⚠️ ARTERIAL INFUSION CONTRAINDICATED</span>
                Do not push fluids into an arterial line. Risks include limb ischemia and mechanical blowout.
              </div>
            )}

            <div className="flex gap-2">
              <div className="w-1/2 flex flex-col">
                <input 
                  autoFocus 
                  type="number" 
                  disabled={isArterial}
                  placeholder={`Dose (${getFluidUnitLabel(fluidId)})`} 
                  className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono ${isArterial ? 'opacity-40' : ''}`} 
                  value={fluidInput.dose} 
                  onChange={(e) => setFluidInput({...fluidInput, dose: e.target.value})} 
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isArterial) handleFluidSubmit(fluidId); }}
                />
                {fluidInput.dose && getFluidVolumePreview(fluidId, fluidInput.dose) && (
                  <div className="text-[9px] text-emerald-400 font-bold font-mono mt-1">
                    {getFluidVolumePreview(fluidId, fluidInput.dose)}
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleFluidSubmit(fluidId)} 
                disabled={isArterial}
                className={`w-1/2 glass-button ${isArterial ? 'opacity-30 cursor-not-allowed' : 'glass-button-cyan'}`}
              >
                PUSH
              </button>
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
        <button 
          onClick={() => setMedInput(isActive ? { drug: null } : { drug: medId, indication: indicationKeys[0], route: med.routes[0], type: med.indications[indicationKeys[0]].type, unit: med.indications[indicationKeys[0]].unit, dose: '' })}
          className={`p-2 rounded-lg text-xs text-left border transition-all glass-button ${isActive ? 'border-cyan-400 text-cyan-200' : 'border-slate-800'}`}
        >
          <span className="font-bold text-slate-100">{med.name}</span> 
          <span className="text-slate-400 text-[9px] float-right uppercase font-mono">{med.classes[0]}</span>
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2.5 bg-slate-950/90 border border-cyan-900/50 rounded-lg animate-in slide-in-from-top-1 duration-200 font-mono text-[11px]">
            <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold border-b border-slate-900 pb-1">
              <span>Dosing Profile</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">Uses {med.dosingWeight || 'TBW'}</span>
            </div>
            
            <select value={medInput.indication} onChange={handleIndicationChange} className="bg-slate-900 text-slate-200 border border-slate-700 rounded p-1 outline-none">
              {indicationKeys.map(ind => <option key={ind} value={ind}>{ind} (Rec: {med.indications[ind].dose} {med.indications[ind].unit})</option>)}
            </select>
            
            {medInput.route === 'IV' && (
              <select value={medInput.lineId || patient.accessLines?.[0]?.id || ''} onChange={(e) => setMedInput({...medInput, lineId: e.target.value})} className="bg-slate-900 text-slate-200 border border-slate-700 rounded p-1 outline-none">
                {patient.accessLines?.length > 0 ? patient.accessLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>) : <option value="">No Venous Access</option>}
              </select>
            )}
            
            <div className="flex gap-2">
              <select value={medInput.route} onChange={(e)=>setMedInput({...medInput, route: e.target.value})} className="bg-slate-900 text-slate-200 border border-slate-700 rounded p-1 w-1/3 outline-none">
                {med.routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input 
                autoFocus 
                type="number" 
                placeholder={`Dose (${medInput.unit})`} 
                className="w-1/3 bg-slate-900 border border-slate-700 rounded p-1 text-white outline-none focus:border-cyan-500"
                value={medInput.dose} 
                onChange={(e) => setMedInput({...medInput, dose: e.target.value})} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleMedSubmit(medId); }}
              />
              <button onClick={() => handleMedSubmit(medId)} className="w-1/3 glass-button glass-button-cyan py-1 text-[10px]">
                {medInput.type === 'Infusion' ? 'START INF' : 'PUSH'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const term = searchTerm.toLowerCase();
  const filteredMeds = Object.keys(MEDICATIONS).filter(id => MEDICATIONS[id].name.toLowerCase().includes(term) || MEDICATIONS[id].classes.some(c => c.toLowerCase().includes(term)));
  const filteredFluids = Object.keys(FLUIDS).filter(id => id.toLowerCase().includes(term));

  const resusLines = (patient.accessLines || []).filter(l => l.category !== 'Arterial Line');
  let totalMedInfusionsCount = 0;
  resusLines.forEach(l => {
    if (!l.failed && l.activeMedInfusions) {
      totalMedInfusionsCount += l.activeMedInfusions.filter(m => parseFloat(m.rate) > 0).length;
    }
  });

  return (
    <div className="col-span-1 glass-panel p-4 flex flex-col gap-4 overflow-y-auto overflow-x-hidden custom-scrollbar h-[500px] xl:h-full xl:max-h-full">
      
      {/* Omni-Search */}
      <div className="relative shrink-0 font-mono">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={14} className="text-cyan-500" />
        </div>
        <input 
          ref={searchRef}
          type="text"
          placeholder="Search Meds & Fluids (Cmd+F)"
          className="w-full glass-input rounded-xl p-2 pl-9 text-xs font-bold outline-none placeholder:text-slate-500 font-mono"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {searchTerm ? (
        <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {filteredMeds.length > 0 && <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest border-b border-cyan-950 pb-1 mt-2 mb-1 font-mono">Medications</span>}
          {filteredMeds.map(m => renderAdvancedMedButton(m))}
          
          {filteredFluids.length > 0 && <span className="text-teal-400 text-[10px] font-black uppercase tracking-widest border-b border-teal-950 pb-1 mt-3 mb-1 font-mono">Resus Fluids</span>}
          {filteredFluids.map(f => renderFluidButton(f, 'bg-blue-900/10 border-blue-900/30'))}

          {filteredMeds.length === 0 && filteredFluids.length === 0 && (
            <div className="text-slate-600 text-xs italic text-center mt-6 font-mono font-bold">No matching drugs or fluids.</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          {/* Category Sub-Tabs */}
          <div className="flex gap-1 overflow-x-auto shrink-0 pb-1 border-b border-white/5 custom-scrollbar font-mono text-[9px] font-black uppercase tracking-wider">
            {[
              { id: 'induction', label: 'Induction', color: 'text-cyan-400' },
              { id: 'analgesia', label: 'Analgesia/NMB', color: 'text-teal-400' },
              { id: 'hemodynamics', label: 'Hemodyn', color: 'text-rose-400' },
              { id: 'other', label: 'Other/Rev', color: 'text-purple-400' },
              { id: 'fluids', label: 'Fluids', color: 'text-emerald-400' }
            ].map(sub => (
              <button 
                key={sub.id} 
                onClick={() => setActiveSubTab(sub.id)}
                className={`px-2.5 py-1.5 rounded-md transition shrink-0 ${activeSubTab === sub.id ? 'bg-white/10 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <span className={sub.color}>{sub.label}</span>
              </button>
            ))}
          </div>

          {/* Category Grids */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {activeSubTab === 'fluids' ? (
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider block mb-2 font-mono">Select Resus Crystalloid or Blood Product:</span>
                {GROUPS.fluids.map(f => renderFluidButton(f, 'bg-blue-900/10 border-blue-900/30'))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {GROUPS[activeSubTab].map(renderAdvancedMedButton)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};