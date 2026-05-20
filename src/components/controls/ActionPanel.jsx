import React, { useState, useEffect, useRef } from 'react';
import { Zap, Eye, Syringe, Search, Wind, Activity, ArrowUpRight, X } from 'lucide-react';

export const ActionPanel = ({ 
  patient, 
  setPatient, 
  defibSettings, 
  setDefibSettings, 
  toggleCPR, 
  deliverShock, 
  examineAirway, 
  handlePocus, 
  setAccessModal, 
  generateLab, 
  handleSetO2, 
  logEvent, 
  surgicalPhase, 
  setSurgicalPhase, 
  toggleBis, 
  toggleTof, 
  checkRhythm, 
  time, 
  formatTime,
  setPreopModal,
  setMsmaidsModal,
  msmaidsComplete,
  setPostIntubationModal,
  setExtubationModal,
  performLarsonManeuver,
  checkCuffLeak,
  examineNpoHistory
}) => {
  
  const [o2Input, setO2Input] = useState({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef(null);

  // QoL: Global Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleO2Submit = (id) => {
    handleSetO2(id, o2Input.flow, o2Input.fio2, o2Input.ipap, o2Input.epap, o2Input.rate); 
    setO2Input({device: null, flow: '', fio2: '', ipap: '', epap: '', rate: ''});
    setSearchTerm(''); // Auto-reset UI for next emergency
  };

  const renderAdvancedO2Button = (id, label, type) => {
    const isActive = o2Input.device === id;
    if (searchTerm && !label.toLowerCase().includes(searchTerm.toLowerCase())) return null;

    return (
      <div className="flex flex-col gap-1">
        <button onClick={() => setO2Input(isActive ? { device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' } : { device: id, flow: '', fio2: '', ipap: '', epap: '', rate: '' })}
          className={`bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border transition-all ${isActive ? 'border-blue-400' : 'border-transparent'}`}>
          {label}
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-blue-900 rounded animate-in slide-in-from-top-1">
            {type === 'flow' && (
              <input autoFocus type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-full" />
            )}
            {type === 'hfnc' && (
              <div className="flex gap-2">
                <input autoFocus type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
                <input type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
              </div>
            )}
            {(type === 'cpap' || type === 'bipap') && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input autoFocus type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-full" />
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="EPAP/PEEP" value={o2Input.epap} onChange={(e) => setO2Input({...o2Input, epap: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
                  {type === 'bipap' && (
                    <input type="number" placeholder="IPAP" value={o2Input.ipap} onChange={(e) => setO2Input({...o2Input, ipap: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-1/2" />
                  )}
                </div>
                {type === 'bipap' && (
                  <input type="number" placeholder="Backup Rate (Optional)" value={o2Input.rate} onChange={(e) => setO2Input({...o2Input, rate: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 w-full" />
                )}
              </div>
            )}
            <button onClick={() => handleO2Submit(id)} className="w-full bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold text-white py-1">APPLY</button>
          </div>
        )}
      </div>
    );
  };

  const getPosClass = (posName) => {
      const isCurrent = patient.position === posName || (!patient.position && posName === 'Supine');
      return `p-2 rounded text-[9px] leading-tight text-center border font-bold transition-all ${isCurrent ? 'bg-indigo-900/60 border-indigo-400 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`;
  };

  // Section Filtering Logic
  const term = searchTerm.toLowerCase();
  const showCPR = !term || ['defib', 'cpr', 'shock', 'rhythm', 'joules', 'sync', 'compressions', 'code', 'arrest'].some(k => k.includes(term));
  const showPos = !term || ['position', 'supine', 'sniffing', 'ramped', 'trendelenburg', 'rev trend', 'lithotomy', 'lateral', 'prone', 'sitting'].some(k => k.includes(term));
  const showSurg = !term || ['surgical', 'timeline', 'pre-op', 'induction', 'incision', 'maintenance', 'emergence'].some(k => k.includes(term));
  const showChecklists = !term || ['checklist', 'maneuver', 'pre-op', 'msmaids', 'larson', 'cuff', 'npo', 'history', 'intubation', 'extubation'].some(k => k.includes(term));
  const showDiag = !term || ['diagnostic', 'pocus', 'exam', 'tte', 'lung', 'gastric', 'airway'].some(k => k.includes(term));
  const showNeuro = !term || ['neuro', 'bis', 'tof', 'nmb', 'twitch'].some(k => k.includes(term));
  const showLabs = !term || ['access', 'lab', 'piv', 'iv', 'central line', 'io', 'arterial', 'abg', 'vbg', 'cbc', 'cmp', 'teg', 'coag'].some(k => k.includes(term));
  const showO2 = !term || ['oxygen', 'bmv', 'bag', 'cannula', 'mask', 'nrb', 'hfnc', 'cpap', 'bipap', 'room air'].some(k => k.includes(term));

  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto overflow-x-hidden custom-scrollbar h-full max-h-full min-h-full relative shadow-inner">
      
      {/* Omni-Search Header */}
      <div className="sticky top-0 z-50 bg-slate-900 pb-2 border-b border-slate-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search size={14} className="text-blue-500" />
          </div>
          <input 
            ref={searchRef}
            type="text"
            placeholder="Search Actions, Labs, O2 (Cmd+K)"
            className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 pl-8 text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-500"
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

      {showCPR && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold flex items-center gap-2 mt-1"><Activity size={14}/> Defibrillator & CPR</h3>
          {(patient.cprActive || patient.isArrest) && (
            <div className="bg-red-950/50 border border-red-800 p-2 rounded flex justify-between items-center shadow-inner">
               <span className="text-red-400 font-bold text-xs animate-pulse">
                  {patient.isArrest ? 'CODE BLUE ACTIVE' : 'CPR ACTIVE'}
               </span>
               <span className="text-white font-mono font-black text-lg">
                  {formatTime(time - (patient.isArrest ? (patient.codeStartTime ?? time) : (patient.cprStartTime ?? time)))}
               </span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <button onClick={() => { toggleCPR(); setSearchTerm(''); }} className={`flex-1 p-2 rounded text-xs font-bold border transition shadow-lg ${patient.cprActive ? 'bg-red-600 text-white animate-pulse border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-red-900/40 hover:bg-red-800/60 text-red-200 border-red-800'}`}>
                  {patient.cprActive ? 'STOP COMPRESSIONS' : 'START COMPRESSIONS'}
                </button>
                <button onClick={() => { checkRhythm(); setSearchTerm(''); }} disabled={!patient.cprActive && !patient.isArrest} className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 text-slate-300 p-2 rounded text-xs font-bold transition flex items-center justify-center gap-1">
                  <Eye size={12}/> CHECK RHYTHM
                </button>
            </div>
            <div className="flex gap-2">
              <select value={defibSettings.joules} onChange={(e) => setDefibSettings({...defibSettings, joules: parseInt(e.target.value)})} className="bg-slate-950 text-xs text-white border border-slate-700 rounded p-1 flex-1">
                <option value={50}>50 Joules</option><option value={100}>100 Joules</option><option value={150}>150 Joules</option><option value={200}>200 Joules (Max)</option>
              </select>
              <button onClick={() => setDefibSettings({...defibSettings, sync: !defibSettings.sync})} className={`px-2 py-1 rounded text-xs font-bold border transition ${defibSettings.sync ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                SYNC
              </button>
              <button onClick={() => { deliverShock(defibSettings.joules, defibSettings.sync); setSearchTerm(''); }} className="bg-orange-600 hover:bg-orange-500 border border-orange-500 px-3 py-1 rounded text-xs font-bold text-white">
                SHOCK
              </button>
            </div>
          </div>
        </>
      )}

      {showPos && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><ArrowUpRight size={14}/> Patient Positioning</h3>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <button onClick={() => { setPatient(p => ({...p, position: 'Supine'})); logEvent("Position: Supine. FRC at baseline."); setSearchTerm(''); }} className={getPosClass('Supine')}>SUPINE</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Sniffing'})); logEvent("Position: Sniffing. Airway axes aligned."); setSearchTerm(''); }} className={getPosClass('Sniffing')}>SNIFFING</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Ramped'})); logEvent("Position: Ramped. FRC optimized."); setSearchTerm(''); }} className={getPosClass('Ramped')}>RAMPED</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Trendelenburg'})); logEvent("Position: Trendelenburg. Increased venous return, severe FRC drop."); setSearchTerm(''); }} className={getPosClass('Trendelenburg')}>TREND</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Rev Trendelenburg'})); logEvent("Position: Reverse Trendelenburg. Venous pooling, improved FRC."); setSearchTerm(''); }} className={getPosClass('Rev Trendelenburg')}>REV TREND</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Lithotomy'})); logEvent("Position: Lithotomy. Auto-transfusion from legs, decreased FRC."); setSearchTerm(''); }} className={getPosClass('Lithotomy')}>LITHOTOMY</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Lateral'})); logEvent("Position: Lateral Decubitus. V/Q mismatch altered."); setSearchTerm(''); }} className={getPosClass('Lateral')}>LATERAL</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Prone'})); logEvent("Position: Prone. Posterior lung recruitment improved."); setSearchTerm(''); }} className={getPosClass('Prone')}>PRONE</button>
            <button onClick={() => { setPatient(p => ({...p, position: 'Sitting'})); logEvent("Position: Sitting / Beach Chair. Severe venous pooling, excellent FRC."); setSearchTerm(''); }} className={getPosClass('Sitting')}>SITTING</button>
          </div>
        </>
      )}

      {showSurg && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Zap size={14}/> Surgical Timeline</h3>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {['Pre-Op', 'Induction', 'Incision', 'Maintenance', 'Emergence'].map(phase => {
              const isLockedInduction = phase === 'Induction' && !msmaidsComplete && !patient.emergentRSI;
              let btnClass = '';
              if (surgicalPhase === phase) {
                btnClass = 'bg-cyan-700 text-white ring-1 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
              } else if (isLockedInduction) {
                btnClass = 'bg-slate-900 border border-dashed border-red-900/60 text-red-400/80 hover:bg-red-950/20 hover:border-red-700/60 transition-colors duration-200 cursor-help';
              } else {
                btnClass = 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700';
              }

              const handlePhaseClick = () => {
                if (isLockedInduction) {
                  logEvent("⚠️ CLINICAL INTERLOCK BLOCKED: Induction phase locked. Complete MSMAIDS pre-induction checklist first.");
                  setMsmaidsModal(true);
                  setSearchTerm('');
                  return;
                }
                setSurgicalPhase(phase);
                setSearchTerm('');
              };

              return (
                <button
                  key={phase}
                  onClick={handlePhaseClick}
                  className={`flex-1 min-w-[30%] px-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${btnClass}`}
                  title={isLockedInduction ? "Induction Locked: Complete MSMAIDS setup checklist first" : ""}
                >
                  {isLockedInduction ? '🔒 Induction' : phase}
                </button>
              );
            })}
          </div>
        </>
      )}

      {showChecklists && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Activity size={14}/> Checklists & Maneuvers</h3>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button 
              onClick={() => { setPreopModal(true); setSearchTerm(''); }} 
              className="bg-indigo-900/40 hover:bg-indigo-800/60 p-2 rounded text-xs text-left text-indigo-200 border border-indigo-800 font-bold"
            >
              📋 Pre-Op Assessment
            </button>
            <button 
              onClick={() => { setMsmaidsModal(true); setSearchTerm(''); }} 
              className="bg-emerald-900/40 hover:bg-emerald-800/60 p-2 rounded text-xs text-left text-emerald-200 border border-emerald-800 font-bold"
            >
              🛠️ MSMAIDS Check
            </button>
            <button 
              onClick={() => { setPostIntubationModal(true); setSearchTerm(''); }} 
              disabled={!patient.airwaySecured}
              className="bg-cyan-900/40 hover:bg-cyan-800/60 disabled:opacity-50 p-2 rounded text-xs text-left text-cyan-200 border border-cyan-800 font-bold"
            >
              🔄 Post-Intubation "A's"
            </button>
            <button 
              onClick={() => { setExtubationModal(true); setSearchTerm(''); }} 
              disabled={!patient.airwaySecured}
              className="bg-rose-900/40 hover:bg-rose-800/60 disabled:opacity-50 p-2 rounded text-xs text-left text-rose-200 border border-rose-800 font-bold"
            >
              💨 Awake Extubation Check
            </button>
            <button 
              onClick={() => { performLarsonManeuver(); setSearchTerm(''); }} 
              className="bg-purple-900/40 hover:bg-purple-800/60 p-2 rounded text-xs text-left text-purple-200 border border-purple-800 font-bold"
            >
              ✊ Perform Larson's
            </button>
            <button 
              onClick={() => { checkCuffLeak(); setSearchTerm(''); }} 
              disabled={!patient.airwaySecured}
              className="bg-amber-900/40 hover:bg-amber-800/60 disabled:opacity-50 p-2 rounded text-xs text-left text-amber-200 border border-amber-800 font-bold"
            >
              💨 Cuff Leak Test
            </button>
            <button 
              onClick={() => { examineNpoHistory(); setSearchTerm(''); }} 
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-600 text-slate-300 font-bold col-span-2"
            >
              📋 Examine NPO & History
            </button>
          </div>
        </>
      )}

      {showDiag && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Eye size={14}/> Diagnostics</h3>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => { examineAirway(); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Airway Exam</button>
            <button onClick={() => { handlePocus('Cardiac (TTE)'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">TTE POCUS</button>
            <button onClick={() => { handlePocus('Lung'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Lung POCUS</button>
            <button onClick={() => { handlePocus('Gastric'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Gastric POCUS</button>
          </div>
        </>
      )}

      {showNeuro && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Activity size={14}/> Neuro & NMB Monitors</h3>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => { toggleBis(); setSearchTerm(''); }} className={`p-2 rounded text-xs text-left border transition-all font-bold tracking-wider ${patient.hasBisMonitor ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
              {patient.hasBisMonitor ? 'BIS ATTACHED' : 'ATTACH BIS'}
            </button>
            <button onClick={() => { toggleTof(); setSearchTerm(''); }} className={`p-2 rounded text-xs text-left border transition-all font-bold tracking-wider ${patient.hasTofMonitor ? 'bg-orange-900/40 border-orange-500 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
              {patient.hasTofMonitor ? 'TOF ATTACHED' : 'ATTACH TOF'}
            </button>
          </div>
        </>
      )}

      {showLabs && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Syringe size={14}/> Access & Labs</h3>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => { setAccessModal({show: true, category: 'Peripheral IV'}); setSearchTerm(''); }} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Place PIV</button>
            <button onClick={() => { setAccessModal({show: true, category: 'Central Line'}); setSearchTerm(''); }} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Central Line</button>
            <button onClick={() => { setAccessModal({show: true, category: 'Intraosseous (IO)'}); setSearchTerm(''); }} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Place IO</button>
            <button onClick={() => { setAccessModal({show: true, category: 'Arterial Line'}); setSearchTerm(''); }} className="bg-green-900/40 hover:bg-green-800/60 p-2 rounded text-xs text-left text-green-200 border border-green-800">Arterial Line</button>
            <button onClick={() => { generateLab('ABG'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 mt-2">Order ABG</button>
            <button onClick={() => { generateLab('VBG'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 mt-2">Order VBG</button>
            <button onClick={() => { generateLab('CBC'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order CBC</button>
            <button onClick={() => { generateLab('CMP'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order CMP</button>
            <button onClick={() => { generateLab('Coagulation'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order Coags</button>
            <button onClick={() => { generateLab('TEG'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order TEG</button>
            <button onClick={() => { generateLab('LFTs'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order LFTs</button>
            <button onClick={() => { generateLab('Thyroid'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order Thyroid</button>
            <button onClick={() => { generateLab('Urinalysis'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order UA</button>
            <button onClick={() => { generateLab('Pregnancy'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order hCG</button>
            <button onClick={() => { generateLab('Type & Screen'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order T&S</button>
            <button onClick={() => { generateLab('Type & Cross'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800">Order T&Cross</button>
            <button onClick={() => { generateLab('HbA1c'); setSearchTerm(''); }} className="bg-blue-900/40 hover:bg-blue-800/60 p-2 rounded text-xs text-left text-blue-200 border border-blue-800 col-span-2 text-center">Order HbA1c</button>
          </div>
        </>
      )}

      {showO2 && (
        <>
          <h3 className="text-slate-400 text-sm border-b border-slate-700 pb-1 uppercase font-bold mt-2 flex items-center gap-2"><Wind size={14}/> Oxygenation</h3>
          <div className="flex flex-col gap-2 mt-1">
            {renderAdvancedO2Button('Bag-Mask Valve (BMV)', 'Bag-Mask Ventilation (100% O2)', 'fixed')}
            {renderAdvancedO2Button('Nasal Cannula', 'Nasal Cannula (1-15L)', 'flow')}
            {renderAdvancedO2Button('Simple Face Mask', 'Simple Face Mask (5-10L)', 'flow')}
            {renderAdvancedO2Button('Non-Rebreather Mask (NRB)', 'Non-Rebreather Mask (15L, 100% FiO2)', 'fixed')}
            {renderAdvancedO2Button('High Flow Nasal Cannula (HFNC)', 'High Flow Nasal Cannula (Flow / FiO2)', 'hfnc')}
            {renderAdvancedO2Button('CPAP', 'CPAP (Continuous Positive Airway Pressure)', 'cpap')}
            {renderAdvancedO2Button('BiPAP', 'BiPAP (Bilevel Positive Airway Pressure)', 'bipap')}
            {(!searchTerm || 'room air'.includes(searchTerm.toLowerCase())) && (
              <button onClick={() => { handleSetO2('Room Air'); setSearchTerm(''); }} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-center border border-slate-600 text-slate-300 font-bold mt-2">REMOVE O2 DEVICE (ROOM AIR)</button>
            )}
          </div>
        </>
      )}

    </div>
  );
};