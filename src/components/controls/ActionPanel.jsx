import React, { useState, useEffect, useRef } from 'react';
import { Zap, Eye, Syringe, Search, Wind, Activity, ArrowUpRight, X, Heart, ShieldAlert, Award, FileText, Stethoscope } from 'lucide-react';

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
      <div className="flex flex-col gap-1 mb-1" key={id}>
        <button 
          onClick={() => setO2Input(isActive ? { device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' } : { device: id, flow: '', fio2: '', ipap: '', epap: '', rate: '' })}
          className={`p-2 rounded-lg text-xs text-left border transition-all glass-button ${isActive ? 'border-blue-400 text-blue-200 font-bold' : 'border-slate-800'}`}
        >
          {label}
        </button>
        {isActive && (
          <div className="flex flex-col gap-2 p-2.5 bg-slate-950/90 border border-blue-900/50 rounded-lg animate-in slide-in-from-top-1 font-mono">
            {type === 'flow' && (
              <input autoFocus type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-blue-500" />
            )}
            {type === 'hfnc' && (
              <div className="flex gap-2">
                <input autoFocus type="number" placeholder="Flow (L/min)" value={o2Input.flow} onChange={(e) => setO2Input({...o2Input, flow: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
                <input type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
              </div>
            )}
            {(type === 'cpap' || type === 'bipap') && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input autoFocus type="number" placeholder="FiO2 (%)" value={o2Input.fio2} onChange={(e) => setO2Input({...o2Input, fio2: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-blue-500" />
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="EPAP/PEEP" value={o2Input.epap} onChange={(e) => setO2Input({...o2Input, epap: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
                  {type === 'bipap' && (
                    <input type="number" placeholder="IPAP" value={o2Input.ipap} onChange={(e) => setO2Input({...o2Input, ipap: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-blue-500" />
                  )}
                </div>
                {type === 'bipap' && (
                  <input type="number" placeholder="Backup Rate (Optional)" value={o2Input.rate} onChange={(e) => setO2Input({...o2Input, rate: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') handleO2Submit(id); }} className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-blue-500" />
                )}
              </div>
            )}
            <button onClick={() => handleO2Submit(id)} className="w-full glass-button glass-button-blue py-1 text-xs">APPLY</button>
          </div>
        )}
      </div>
    );
  };

  const getPosClass = (posName) => {
    const isCurrent = patient?.position === posName || (!patient?.position && posName === 'Supine');
    return `p-2 rounded-lg text-[9px] leading-tight text-center border font-bold transition-all ${isCurrent ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.25)]' : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200'}`;
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
    <div className="col-span-1 glass-panel glass-blue p-4 flex flex-col gap-4 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-[500px] max-h-[800px]">
      
      {/* Omni-Search Header */}
      <div className="relative shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={14} className="text-blue-400" />
        </div>
        <input 
          ref={searchRef}
          type="text"
          placeholder="Search Actions, Labs, O2 (Cmd+K)"
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

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        {/* CPR & Defibrillator */}
        {showCPR && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><Activity size={12} className="text-red-500 animate-pulse"/> Defibrillator & CPR</h3>
            {(patient?.cprActive || patient?.isArrest) && (
              <div className="bg-red-950/20 border border-red-900/40 p-2.5 rounded-xl flex justify-between items-center shadow-inner font-mono">
                <span className="text-red-400 font-black text-[10px] animate-pulse">
                  {patient?.isArrest ? '🚨 CODE BLUE ACTIVE' : '❤️ CPR ACTIVE'}
                </span>
                <span className="text-white font-black text-base">
                  {formatTime(time - (patient?.isArrest ? (patient?.codeStartTime ?? time) : (patient?.cprStartTime ?? time)))}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2 font-mono">
              <div className="flex gap-2">
                <button onClick={() => { toggleCPR(); setSearchTerm(''); }} className={`flex-1 p-2 rounded-lg text-[10px] font-black border transition active:scale-97 shadow-lg ${patient?.cprActive ? 'glass-button-rose text-white border-red-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse' : 'glass-button border-red-950/30 text-red-300 hover:bg-red-950/20'}`}>
                  {patient?.cprActive ? 'STOP COMPRESSIONS' : 'START CPR'}
                </button>
                <button onClick={() => { checkRhythm(); setSearchTerm(''); }} disabled={!patient?.cprActive && !patient?.isArrest} className="flex-1 glass-button text-[10px] border border-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1">
                  <Eye size={12}/> CHECK RHYTHM
                </button>
              </div>
              <div className="flex gap-2">
                <select value={defibSettings.joules} onChange={(e) => setDefibSettings({...defibSettings, joules: parseInt(e.target.value)})} className="bg-slate-950 border border-white/5 rounded-lg p-1.5 text-[10px] text-slate-300 outline-none flex-1 font-mono">
                  <option value={50}>50 Joules</option><option value={100}>100 Joules</option><option value={150}>150 Joules</option><option value={200}>200 J (Max)</option>
                </select>
                <button onClick={() => setDefibSettings({...defibSettings, sync: !defibSettings.sync})} className={`px-2.5 py-1 text-[10px] rounded-lg border font-black transition ${defibSettings.sync ? 'glass-button-amber text-yellow-300 border-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.25)]' : 'glass-button border-slate-800'}`}>
                  SYNC
                </button>
                <button onClick={() => { deliverShock(defibSettings.joules, defibSettings.sync); setSearchTerm(''); }} className="glass-button glass-button-rose border-rose-500 hover:bg-red-600 px-3.5 py-1 rounded-lg text-[10px] text-white">
                  SHOCK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Positioning */}
        {showPos && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1.5 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><ArrowUpRight size={12} className="text-blue-500"/> Patient Positioning</h3>
            <div className="grid grid-cols-3 gap-1.5 font-mono">
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
          </div>
        )}

        {/* Surgical Timeline */}
        {showSurg && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><Zap size={12} className="text-blue-400"/> Surgical Timeline</h3>
            <div className="flex flex-wrap gap-1.5 justify-center font-mono">
              {['Pre-Op', 'Induction', 'Incision', 'Maintenance', 'Emergence'].map(phase => {
                const isLockedInduction = phase === 'Induction' && !msmaidsComplete && !patient?.emergentRSI;
                let btnClass = '';
                if (surgicalPhase === phase) {
                  btnClass = 'glass-button-blue border border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]';
                } else if (isLockedInduction) {
                  btnClass = 'glass-button border border-dashed border-red-950 text-red-400/70 hover:bg-red-950/20';
                } else {
                  btnClass = 'glass-button border-slate-800 text-slate-400 hover:bg-slate-800';
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
                    className={`flex-1 min-w-[30%] py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${btnClass}`}
                    title={isLockedInduction ? "Induction Locked: Complete MSMAIDS setup checklist first" : ""}
                  >
                    {isLockedInduction ? '🔒 Induct' : phase}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Checklists & Protocols */}
        {showChecklists && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><ShieldAlert size={12} className="text-blue-400"/> Checklists & Maneuvers</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button 
                onClick={() => { setPreopModal(true); setSearchTerm(''); }} 
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/40 hover:border-blue-400 p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
              >
                📋 Pre-Op EMR Evals
              </button>
              <button 
                onClick={() => { setMsmaidsModal(true); setSearchTerm(''); }} 
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/40 hover:border-blue-400 p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
              >
                🛠️ MSMAIDS Check
              </button>
              <button 
                onClick={() => { setPostIntubationModal(true); setSearchTerm(''); }} 
                disabled={!patient?.airwaySecured}
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/40 hover:border-blue-400 disabled:opacity-20 disabled:pointer-events-none p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
              >
                🔄 Post-Intub A's
              </button>
              <button 
                onClick={() => { setExtubationModal(true); setSearchTerm(''); }} 
                disabled={!patient?.airwaySecured}
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/40 hover:border-blue-400 disabled:opacity-20 disabled:pointer-events-none p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
              >
                💨 Extubation Check
              </button>
              <button 
                onClick={() => { performLarsonManeuver(); setSearchTerm(''); }} 
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/40 hover:border-blue-400 p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider col-span-2 text-center transition-all duration-200"
              >
                ✊ Perform Larson's Maneuver
              </button>
              <button 
                onClick={() => { examineNpoHistory(); setSearchTerm(''); }} 
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/40 hover:border-blue-400 p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider col-span-2 text-center transition-all duration-200"
              >
                📋 Review NPO & Fasting History
              </button>
            </div>
          </div>
        )}
 
        {/* Diagnostics & POCUS */}
        {showDiag && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><Eye size={12} className="text-blue-400"/> Diagnostics & POCUS</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button onClick={() => { examineAirway(); setSearchTerm(''); }} className="glass-button glass-button-blue p-2.5 rounded-lg text-[10px] border">Airway Exam</button>
              <button onClick={() => { handlePocus('Cardiac (TTE)'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2.5 rounded-lg text-[10px] border">TTE POCUS</button>
              <button onClick={() => { handlePocus('Lung'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2.5 rounded-lg text-[10px] border">Lung POCUS</button>
              <button onClick={() => { handlePocus('Gastric'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2.5 rounded-lg text-[10px] border">Gastric POCUS</button>
            </div>
          </div>
        )}
 
        {/* Neuro Monitors */}
        {showNeuro && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><Award size={12} className="text-blue-400"/> Neuro & Twitch Monitors</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button onClick={() => { toggleBis(); setSearchTerm(''); }} className={`p-2 rounded-lg text-[10px] border transition-all font-black uppercase tracking-wider ${patient?.hasBisMonitor ? 'glass-button-blue text-blue-300 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]' : 'glass-button border-slate-800 text-slate-500'}`}>
                {patient?.hasBisMonitor ? '✓ BIS ATTACHED' : 'ATTACH BIS'}
              </button>
              <button onClick={() => { toggleTof(); setSearchTerm(''); }} className={`p-2 rounded-lg text-[10px] border transition-all font-black uppercase tracking-wider ${patient?.hasTofMonitor ? 'glass-button-blue text-blue-300 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]' : 'glass-button border-slate-800 text-slate-500'}`}>
                {patient?.hasTofMonitor ? '✓ TOF ATTACHED' : 'ATTACH TOF'}
              </button>
            </div>
          </div>
        )}

        {/* Access Placements */}
        {showLabs && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><Syringe size={12} className="text-purple-400"/> Access Placements</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button onClick={() => { setAccessModal({show: true, category: 'Peripheral IV'}); setSearchTerm(''); }} className="glass-button glass-button-cyan p-2.5 rounded-lg text-[10px]">Place PIV</button>
              <button onClick={() => { setAccessModal({show: true, category: 'Central Line'}); setSearchTerm(''); }} className="glass-button glass-button-indigo p-2.5 rounded-lg text-[10px]">Central Line</button>
              <button onClick={() => { setAccessModal({show: true, category: 'Intraosseous (IO)'}); setSearchTerm(''); }} className="glass-button glass-button-amber p-2.5 rounded-lg text-[10px]">Place IO</button>
              <button onClick={() => { setAccessModal({show: true, category: 'Arterial Line'}); setSearchTerm(''); }} className="glass-button glass-button-rose p-2.5 rounded-lg text-[10px]">Arterial Line</button>
            </div>
          </div>
        )}

        {/* POC Lab Orders */}
        {showLabs && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><FileText size={12} className="text-blue-400"/> POC Lab Orders</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button onClick={() => { generateLab('ABG'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order ABG</button>
              <button onClick={() => { generateLab('VBG'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order VBG</button>
              <button onClick={() => { generateLab('CBC'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order CBC</button>
              <button onClick={() => { generateLab('CMP'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order CMP</button>
              <button onClick={() => { generateLab('Coagulation'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order Coags</button>
              <button onClick={() => { generateLab('TEG'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order TEG</button>
              <button onClick={() => { generateLab('LFTs'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order LFTs</button>
              <button onClick={() => { generateLab('Thyroid'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order Thyroid</button>
              <button onClick={() => { generateLab('Urinalysis'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order UA</button>
              <button onClick={() => { generateLab('Pregnancy'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order hCG</button>
              <button onClick={() => { generateLab('Type & Screen'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order T&S</button>
              <button onClick={() => { generateLab('Type & Cross'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] border">Order T&Cross</button>
              <button onClick={() => { generateLab('HbA1c'); setSearchTerm(''); }} className="glass-button glass-button-blue p-2 rounded-lg text-[9px] col-span-2 text-center border">Order HbA1c</button>
            </div>
          </div>
        )}

        {/* Non-Invasive Oxygenation */}
        {showO2 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-slate-400 text-[10px] border-b border-white/5 pb-1 uppercase font-black tracking-wider flex items-center gap-2 font-mono"><Wind size={12} className="text-blue-400"/> Non-Invasive Oxygenation</h3>
            <div className="flex flex-col gap-1.5 font-mono">
              {renderAdvancedO2Button('Bag-Mask Valve (BMV)', 'Bag-Mask Ventilation (100% O2)', 'fixed')}
              {renderAdvancedO2Button('Nasal Cannula', 'Nasal Cannula (1-15 L/min)', 'flow')}
              {renderAdvancedO2Button('Simple Face Mask', 'Simple Face Mask (5-10 L/min)', 'flow')}
              {renderAdvancedO2Button('Non-Rebreather Mask (NRB)', 'Non-Rebreather Mask (15 L/min, 100%)', 'fixed')}
              {renderAdvancedO2Button('High Flow Nasal Cannula (HFNC)', 'High Flow Nasal Cannula (Flow/FiO2)', 'hfnc')}
              {renderAdvancedO2Button('CPAP', 'CPAP (PEEP/FiO2)', 'cpap')}
              {renderAdvancedO2Button('BiPAP', 'BiPAP (IPAP/EPAP/FiO2)', 'bipap')}
              {(!searchTerm || 'room air'.includes(searchTerm.toLowerCase())) && (
                <button onClick={() => { handleSetO2('Room Air'); setSearchTerm(''); }} className="glass-button text-[10px] font-black p-2.5 rounded-lg border border-slate-800 text-center text-slate-300 mt-1 hover:border-rose-900/40">
                  REMOVE O2 DEVICE (ROOM AIR)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};