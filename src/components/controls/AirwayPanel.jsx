import { useState, useEffect } from 'react';
import { Wind, Stethoscope, AlertTriangle, Droplet, Sliders, ShieldAlert, Eye } from 'lucide-react';

export const AirwayPanel = ({
  patient,
  setPatient,
  handleSuction,
  optimizeAirway,
  pushMed,
  setSetupModal,
  setTubeConfirmModal,
  logEvent,
  handleSurgicalCric,
  handleExtubation,
  setExtubationModal,
  setPostIntubationModal,
  checkCuffLeak,
  isCollapsed,
  setIsCollapsed,
  examineAirway,
  handlePocus,
  handleSetO2,
  setPreopModal,
  setMsmaidsModal,
  msmaidsComplete,
  performLarsonManeuver,
  examineNpoHistory,
  vitals,
}) => {
  const [airwayToolInput, setAirwayToolInput] = useState({ tool: null, size: '' });
  const [extubateConfirm, setExtubateConfirm] = useState(false);
  const [showChecklists, setShowChecklists] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
  const [showExams, setShowExams] = useState(false);
  const [showO2, setShowO2] = useState(false);
  const [o2Config, setO2Config] = useState({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });

  // Auto-open checklists when there is tension pneumothorax or mucous plug
  useEffect(() => {
    if (patient?.hasPneumothorax || patient?.isMucusPlugged) setShowChecklists(true);
  }, [patient?.hasPneumothorax, patient?.isMucusPlugged]);

  if (isCollapsed) {
    return (
      <div className="glass-panel glass-cyan p-3.5 flex items-center justify-between shrink-0 font-mono transition-all duration-300">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
          <Wind size={16} className={patient?.airwaySecured ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="font-mono text-xs font-extrabold uppercase tracking-wide text-slate-100">Airway Panel</span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
            patient?.airwaySecured
              ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-900/40 text-amber-300 animate-pulse'
          }`}>
            {patient?.airwaySecured ? 'Secured' : 'Unsecured'}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-[9px] text-cyan-400 hover:text-cyan-300 font-black bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-md transition-all font-mono shadow-[0_0_8px_rgba(34,211,238,0.2)] active:scale-95 cursor-pointer uppercase tracking-wider"
        >
          EXPAND
        </button>
      </div>
    );
  }

  // ── Computed helpers ────────────────────────────────────────────────────────

  // Live FiO2 preview for NC (validated formula to 6 L/min)
  const previewNcFiO2 = (flow) => {
    const f = Math.min(6, Math.max(1, parseInt(flow) || 0));
    return f > 0 ? 21 + f * 4 : null;
  };

  // Live FiO2 preview for simple face mask (5-12 L/min)
  const previewFaceMaskFiO2 = (flow) => {
    const f = Math.min(12, Math.max(5, parseInt(flow) || 0));
    return f > 0 ? Math.min(60, 40 + f * 2) : null;
  };

  const resetO2Config = () => setO2Config({ device: null, flow: '', fio2: '', ipap: '', epap: '', rate: '' });

  const handleO2Submit = (id) => {
    if (handleSetO2) handleSetO2(id, o2Config.flow, o2Config.fio2, o2Config.ipap, o2Config.epap, o2Config.rate);
    resetO2Config();
    setShowO2(false);
  };

  // ── Airway tool placement ──────────────────────────────────────────────────

  const handlePlaceAirway = (id, size) => {
    if (id.includes('Nasopharyngeal') && patient?.trauma) {
      logEvent('🚨 CRITICAL ERROR: Attempted NPA placement in severe facial/basilar skull trauma! The device breached the fractured cribriform plate and entered the cranial vault!');
      setAirwayToolInput({ tool: null, size: '' });
      return;
    }
    optimizeAirway(`${id} (Size ${size})`);
    setAirwayToolInput({ tool: null, size: '' });
  };

  // ── Airway patency maneuvers ───────────────────────────────────────────────

  const handleHeadTiltChinLift = () => {
    logEvent('Applied Head-Tilt Chin-Lift. Extended atlanto-occipital joint to open hypopharynx. Upper airway repositioned.');
    setPatient(p => ({ ...p, bmvOptimized: true }));
  };

  const handleJawThrust = () => {
    logEvent('Applied firm Jaw Thrust and Two-Handed Mask Seal. Displaced mandible anteriorly, lifting tongue and epiglottis off posterior pharyngeal wall. Upper airway obstruction relieved.');
    setPatient(p => ({ ...p, bmvOptimized: true }));
  };

  const handleTwoPersonBMV = () => {
    logEvent('⚠️ Two-person BMV initiated: one provider maintains bimanual E-C clamp seal, second squeezes bag. Improved tidal volumes expected.');
    setPatient(p => ({ ...p, bmvOptimized: true, bmvTwoPersonActive: true }));
  };

  // ── Extubation ─────────────────────────────────────────────────────────────

  const executeExtubation = () => {
    if (extubateConfirm) {
      handleExtubation();
      setExtubateConfirm(false);
    } else {
      logEvent('⚠️ CLINICAL PAUSE: Evaluating extubation criteria. Confirm TOF ratio ≥ 0.90 via quantitative monitoring, adequate spontaneous tidal volumes, and intact protective airway reflexes. Click EXTUBATE again to pull the tube.');
      setExtubateConfirm(true);
      setTimeout(() => setExtubateConfirm(false), 5500);
    }
  };

  // ── Reusable sub-sections ──────────────────────────────────────────────────

  const renderAirwayToolButton = (id, label, hint, sizes) => {
    const isActive = airwayToolInput.tool === id;
    // Weight-based LMA size guidance
    const lmaSizeHint = id.includes('LMA') && patient?.weight
      ? (patient.weight < 50 ? 'Rec: Size 3' : patient.weight <= 70 ? 'Rec: Size 4' : 'Rec: Size 5')
      : null;

    return (
      <div className="flex flex-col gap-1 mb-1.5" key={id}>
        <button
          onClick={() => setAirwayToolInput(isActive ? { tool: null, size: '' } : { tool: id, size: sizes[0] })}
          data-tutorial={id === 'Oropharyngeal Airway (OPA)' ? 'opa-btn' : undefined}
          className={`p-2 rounded-lg text-xs text-left border transition-all glass-button ${isActive ? 'border-yellow-400 text-yellow-200 shadow-inner' : 'border-slate-800'}`}
        >
          <span>{label}</span>
          <span className="text-slate-500 text-[9px] font-mono float-right">({hint})</span>
        </button>
        {isActive && (
          <div className="flex gap-2 p-2 bg-slate-950/80 border border-yellow-900/40 rounded-lg animate-in slide-in-from-top-1 font-mono">
            <select
              value={airwayToolInput.size}
              onChange={(e) => setAirwayToolInput({ ...airwayToolInput, size: e.target.value })}
              className="w-2/3 bg-slate-900 text-xs text-white border border-slate-700 rounded-md p-1 outline-none font-mono"
            >
              {sizes.map(s => <option key={s} value={s}>{s}{lmaSizeHint && s === sizes[0] ? ` — ${lmaSizeHint}` : ''}</option>)}
            </select>
            <button
              onClick={() => handlePlaceAirway(id, airwayToolInput.size)}
              data-tutorial={id === 'Oropharyngeal Airway (OPA)' ? 'apply-opa-btn' : undefined}
              className="w-1/3 glass-button glass-button-cyan py-0.5 text-[10px]"
            >
              PLACE
            </button>
          </div>
        )}
        {isActive && lmaSizeHint && (
          <p className="text-[9px] text-cyan-400/70 font-mono pl-1">{lmaSizeHint} based on weight ({patient?.weight} kg)</p>
        )}
      </div>
    );
  };

  const renderPositionDropdown = () => (
    <div className="border border-white/5 bg-slate-950/30 rounded-xl overflow-hidden shrink-0 font-mono">
      <button
        onClick={() => setShowPosition(!showPosition)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-950/40 border-b border-white/5 font-mono text-[9px] font-black text-cyan-400 uppercase tracking-wider hover:bg-slate-950/60 transition-all"
      >
        <span className="flex items-center gap-1.5 text-cyan-300">
          👤 Position: {(patient?.position || 'Supine').toUpperCase()}
        </span>
        <span>{showPosition ? '▲' : '▼'}</span>
      </button>
      {showPosition && (
        <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'Supine', value: 'Supine' },
            { label: 'Sniffing', value: 'Sniffing' },
            { label: 'Ramped', value: 'Ramped' },
            { label: 'Trendelenburg', value: 'Trendelenburg' },
            { label: 'Reverse Trendelenburg', value: 'Rev Trendelenburg' },
            { label: 'Lithotomy', value: 'Lithotomy' },
            { label: 'Lateral Decubitus', value: 'Lateral' },
            { label: 'Prone', value: 'Prone' },
            { label: 'Sitting / Beach Chair', value: 'Sitting' },
          ].map(pos => (
            <button
              key={pos.value}
              onClick={() => {
                setPatient(p => ({ ...p, position: pos.value }));
                logEvent(`Position: ${pos.value}. Physiological alignment updated.`);
                setShowPosition(false);
              }}
              className={`glass-button border-slate-800 py-1.5 text-[8.5px] leading-tight ${
                (patient?.position || 'Supine') === pos.value ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200' : 'text-cyan-300 hover:bg-cyan-950/20'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderExamsDropdown = () => (
    <div className="border border-white/5 bg-slate-950/30 rounded-xl overflow-hidden shrink-0 font-mono">
      <button
        onClick={() => setShowExams(!showExams)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-950/40 border-b border-white/5 font-mono text-[9px] font-black text-cyan-400 uppercase tracking-wider hover:bg-slate-950/60 transition-all"
      >
        <span className="flex items-center gap-1.5 text-cyan-300">🔍 Perform Bedside Exam</span>
        <span>{showExams ? '▲' : '▼'}</span>
      </button>
      {showExams && (
        <div className="p-2.5 grid grid-cols-2 gap-2">
          {[
            { label: '📡 Ultrasound Studio', value: 'Studio' },
            { label: 'Airway Assessment', value: 'Airway' },
            { label: 'Cardiac (TTE POCUS)', value: 'Cardiac (TTE)' },
            { label: 'Lung POCUS', value: 'Lung' },
            { label: 'Gastric POCUS', value: 'Gastric' },
            { label: 'eFAST Exam', value: 'eFAST' },
          ].map(exam => (
            <button
              key={exam.value}
              onClick={() => {
                if (exam.value === 'Airway') { if (examineAirway) examineAirway(); }
                else { if (handlePocus) handlePocus(exam.value); }
                setShowExams(false);
              }}
              className="glass-button border-slate-800 text-cyan-300 hover:bg-cyan-950/20 py-1.5 text-[9px]"
            >
              {exam.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderChecklistsAccordion = () => (
    <div className="border border-white/5 bg-slate-950/30 rounded-xl overflow-hidden shrink-0 font-mono">
      <button
        onClick={() => setShowChecklists(!showChecklists)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-950/40 border-b border-white/5 font-mono text-[9px] font-black text-cyan-400 uppercase tracking-wider hover:bg-slate-950/60 transition-all"
      >
        <span className="flex items-center gap-1.5"><ShieldAlert size={12} /> Checklists & Maneuvers</span>
        <span>{showChecklists ? '▲' : '▼'}</span>
      </button>
      {showChecklists && (
        <div className="p-2 flex flex-col gap-1.5 font-mono text-[9px] bg-slate-950/10">
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => { if (setPreopModal) setPreopModal(true); }} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-350 font-bold hover:bg-white/5 text-center">📋 PRE-OP EVALS</button>
            <button onClick={() => { if (setMsmaidsModal) setMsmaidsModal(true); }} data-tutorial="msmaids-btn" className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-355 font-bold hover:bg-white/5 text-center">🛠️ MSMAIDS CHECK</button>
            <button onClick={() => { if (setPostIntubationModal) setPostIntubationModal(true); }} disabled={!patient?.airwaySecured} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-350 font-bold disabled:opacity-20 disabled:pointer-events-none hover:bg-white/5 text-center">🔄 POST-INTUB</button>
            <button onClick={() => { if (setExtubationModal) setExtubationModal(true); }} disabled={!patient?.airwaySecured} className="bg-slate-950 border border-white/5 py-1 px-1.5 rounded-lg text-slate-350 font-bold disabled:opacity-20 disabled:pointer-events-none hover:bg-white/5 text-center">💨 EXTUBATION</button>
          </div>
          <button onClick={() => { if (performLarsonManeuver) performLarsonManeuver(); }} data-tutorial="larson-btn" className="w-full bg-slate-950 border border-white/5 p-1 rounded-lg text-slate-300 font-bold hover:bg-white/5 text-center">✊ Perform Larson's Maneuver</button>
          <button onClick={() => { if (examineNpoHistory) examineNpoHistory(); }} className="w-full bg-slate-950 border border-white/5 p-1 rounded-lg text-slate-300 font-bold hover:bg-white/5 text-center">📋 Review NPO History</button>
          <button
            onClick={() => {
              // In-line tracheal suctioning clears both airway blood AND ETT mucous plugs
              setPatient(p => ({ ...p, airwayBlood: false, isSuctioned: true, isMucusPlugged: false, ciliaryAtelectasisAccumulation: 0.0 }));
              logEvent('✅ SUCCESS: Deep bronchial suctioning (airway toilet) performed! Removed mucous plug and cleared secretions.');
            }}
            className="w-full bg-slate-950 border border-white/5 p-1 rounded-lg text-slate-300 font-bold hover:bg-white/5 text-center"
          >
            🧼 Bronchial Suctioning (Toilet)
          </button>
          <button
            onClick={() => {
              setPatient(p => ({ ...p, hasPneumothorax: false }));
              logEvent('✅ SUCCESS: Needle decompression performed! Released trapped pleural air, resolving tension pneumothorax.');
            }}
            disabled={!patient?.hasPneumothorax}
            className="w-full bg-rose-950/20 border border-rose-900/40 p-1 rounded-lg text-rose-300 font-bold disabled:opacity-20 disabled:pointer-events-none hover:bg-rose-900/20 text-center animate-pulse"
          >
            📌 Needle Decompression
          </button>
        </div>
      )}
    </div>
  );

  // ── O2 support configuration section ──────────────────────────────────────

  const renderO2ConfigPanel = () => {
    if (!o2Config.device || o2Config.device === 'Room Air') return null;

    const ncFiO2Preview = o2Config.device === 'Nasal Cannula' ? previewNcFiO2(o2Config.flow) : null;
    const fmFiO2Preview = o2Config.device === 'Simple Face Mask' ? previewFaceMaskFiO2(o2Config.flow) : null;

    return (
      <div className="flex flex-col gap-2 p-2.5 bg-slate-950/80 border border-cyan-900/30 rounded-lg font-mono text-[10px] mt-1">
        {/* Device label + change link */}
        <div className="flex items-center justify-between">
          <span className="text-cyan-300 font-bold text-[9px]">{o2Config.device}</span>
          <button onClick={resetO2Config} className="text-slate-500 hover:text-slate-300 text-[8px] underline">Change ×</button>
        </div>

        {/* Nasal Cannula: 1-6 L/min, +4%/L/min */}
        {o2Config.device === 'Nasal Cannula' && (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              type="number" min="1" max="6"
              placeholder="Flow (1–6 L/min)"
              value={o2Config.flow}
              onChange={(e) => setO2Config({ ...o2Config, flow: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
              className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-cyan-500"
            />
            {ncFiO2Preview && (
              <span className="text-cyan-300">Predicted FiO₂: ~{ncFiO2Preview}%</span>
            )}
            <span className="text-amber-500/70 text-[8px]">Max 6 L/min — above 6 L/min requires humidified HFNC</span>
          </div>
        )}

        {/* Simple Face Mask: 5-12 L/min, 50-60% FiO2 */}
        {o2Config.device === 'Simple Face Mask' && (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              type="number" min="5" max="12"
              placeholder="Flow (5–12 L/min)"
              value={o2Config.flow}
              onChange={(e) => setO2Config({ ...o2Config, flow: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
              className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-cyan-500"
            />
            {fmFiO2Preview && (
              <span className="text-cyan-300">Predicted FiO₂: ~{fmFiO2Preview}%</span>
            )}
            <span className="text-amber-500/70 text-[8px]">Min 5 L/min — below 5 L/min risks CO₂ rebreathing in mask dead space</span>
          </div>
        )}

        {/* BMV: one-click apply */}
        {o2Config.device === 'Bag-Mask Valve (BMV)' && (
          <button onClick={() => handleO2Submit(o2Config.device)} data-tutorial="apply-bmv-btn" className="w-full glass-button glass-button-cyan py-1.5 text-[9px] font-black">
            APPLY 100% BMV (15 L/min)
          </button>
        )}

        {/* NRB: one-click apply */}
        {o2Config.device === 'Non-Rebreather Mask (NRB)' && (
          <button onClick={() => handleO2Submit(o2Config.device)} data-tutorial="apply-nrb-btn" className="w-full glass-button glass-button-cyan py-1.5 text-[9px] font-black">
            APPLY NRB ~90% FiO₂ (15 L/min)
          </button>
        )}

        {/* HFNC: flow + FiO2, 20-60 L/min */}
        {o2Config.device === 'High Flow Nasal Cannula (HFNC)' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                autoFocus
                type="number" min="20" max="60"
                placeholder="Flow (20–60 L/min)"
                value={o2Config.flow}
                onChange={(e) => setO2Config({ ...o2Config, flow: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-cyan-500"
              />
              <input
                type="number" min="21" max="100"
                placeholder="FiO₂ (%)"
                value={o2Config.fio2}
                onChange={(e) => setO2Config({ ...o2Config, fio2: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-slate-500 text-[8px]">High-flow humidified O₂ — apneic oxygenation extends safe apnea time during RSI</span>
          </div>
        )}

        {/* CPAP: FiO2 + single pressure level */}
        {o2Config.device === 'CPAP' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                autoFocus
                type="number" min="21" max="100"
                placeholder="FiO₂ (%)"
                value={o2Config.fio2}
                onChange={(e) => setO2Config({ ...o2Config, fio2: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-cyan-500"
              />
              <input
                type="number" min="3" max="20"
                placeholder="CPAP (cmH₂O)"
                value={o2Config.epap}
                onChange={(e) => setO2Config({ ...o2Config, epap: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* BiPAP: FiO2 + EPAP + IPAP + backup rate */}
        {o2Config.device === 'BiPAP' && (
          <div className="flex flex-col gap-1.5">
            <input
              autoFocus
              type="number" min="21" max="100"
              placeholder="FiO₂ (%)"
              value={o2Config.fio2}
              onChange={(e) => setO2Config({ ...o2Config, fio2: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
              className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <input
                type="number" min="3" max="20"
                placeholder="EPAP (cmH₂O)"
                value={o2Config.epap}
                onChange={(e) => setO2Config({ ...o2Config, epap: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-cyan-500"
              />
              <input
                type="number" min="5" max="40"
                placeholder="IPAP (cmH₂O)"
                value={o2Config.ipap}
                onChange={(e) => setO2Config({ ...o2Config, ipap: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-1/2 outline-none focus:border-cyan-500"
              />
            </div>
            <input
              type="number" min="0" max="40"
              placeholder="Backup rate (breaths/min, optional)"
              value={o2Config.rate}
              onChange={(e) => setO2Config({ ...o2Config, rate: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') handleO2Submit(o2Config.device); }}
              className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white w-full outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Apply button for all devices that need parameter input */}
        {!['Bag-Mask Valve (BMV)', 'Non-Rebreather Mask (NRB)'].includes(o2Config.device) && (
          <button onClick={() => handleO2Submit(o2Config.device)} className="w-full glass-button glass-button-cyan py-1 text-[9px] font-black mt-0.5">
            APPLY
          </button>
        )}
      </div>
    );
  };

  // ── TOF display helper ─────────────────────────────────────────────────────

  const renderTofStatus = () => {
    if (!patient?.hasTofMonitor) return null;
    const ratio = vitals?.tofRatio;
    const count = vitals?.tofCount;
    const ready = count === 4 && ratio >= 0.9;
    return (
      <div className={`text-[9px] font-mono font-bold px-2 py-1 rounded border mt-1 ${
        ready
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
          : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
      }`}>
        TOF: {count !== undefined ? `${count}/4` : '--'} | Ratio: {ratio !== undefined ? ratio.toFixed(2) : '--'}
        {ready ? ' ✓ Reversal adequate' : ' ✗ Residual block — verify reversal'}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECURED AIRWAY DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  if (patient?.airwaySecured) {
    return (
      <div className="glass-panel glass-cyan p-4 flex flex-col gap-3.5 flex-1 min-h-[250px] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0 font-mono">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wind size={12} className="text-cyan-400 animate-pulse" /> Airway Controls
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-[8px] text-slate-400 hover:text-slate-200 font-bold bg-slate-950/60 border border-white/5 px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer"
          >
            MINIMIZE
          </button>
        </div>

        <div className="bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-2xl flex flex-col gap-1 shadow-inner shrink-0 font-mono text-center">
          <div className="flex items-center justify-center gap-2 text-cyan-400 font-black tracking-wider text-xs animate-pulse">
            <Wind size={16} /> AIRWAY SECURED
          </div>
          <span className="text-[9px] text-slate-400">Position: {patient?.tubePosition?.replace('_', ' ') || 'trachea'}</span>
        </div>

        {renderPositionDropdown()}
        {renderExamsDropdown()}
        {renderChecklistsAccordion()}

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1">Airway Maintenance</h4>

          <button
            onClick={() => {
              // Secured-airway suction clears both blood/secretions AND ETT mucous plugs
              setPatient(p => ({ ...p, airwayBlood: false, isSuctioned: true, isMucusPlugged: false }));
              logEvent('Performed deep in-line tracheal suctioning. Cleared ETT of mucous plugs and secretions.');
            }}
            className="w-full glass-button hover:bg-slate-800/40 p-2 text-left border text-xs flex items-center justify-between gap-2 overflow-hidden font-mono"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Droplet size={14} className="text-blue-400 shrink-0" />
              <span className="truncate">In-Line Tracheal Suction</span>
            </span>
            <span className="text-[9px] text-slate-500 font-mono shrink-0">ETT / Mucous</span>
          </button>

          <button
            onClick={() => setTubeConfirmModal({ show: true, result: '' })}
            className="w-full glass-button glass-button-cyan hover:bg-slate-850 p-2 text-left border text-xs flex items-center justify-between gap-2 overflow-hidden font-mono"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Stethoscope size={14} className="text-cyan-400 shrink-0" />
              <span className="truncate">Auscultate Breath Sounds</span>
            </span>
            <span className="text-[9px] text-cyan-400 font-mono font-bold shrink-0">Lungs</span>
          </button>

          <button
            onClick={() => { if (checkCuffLeak) checkCuffLeak(); }}
            className="w-full glass-button glass-button-cyan p-2 text-left border text-xs flex items-center justify-between gap-2 overflow-hidden font-mono"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Sliders size={14} className="text-cyan-400 shrink-0" />
              <span className="truncate">Perform Cuff Leak Test</span>
            </span>
            <span className="text-[9px] text-cyan-400 font-mono font-bold shrink-0">Pre-Extubation</span>
          </button>
        </div>

        {/* Extubation — two-step confirm with live TOF status */}
        <div className="shrink-0 w-full mt-auto border-t border-white/5 pt-3">
          {renderTofStatus()}
          <button
            onClick={executeExtubation}
            className={`w-full p-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-300 mt-2 ${
              extubateConfirm
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'glass-button-rose border-rose-900 text-rose-300 hover:bg-rose-950/40'
            }`}
          >
            {extubateConfirm ? <><AlertTriangle size={14} className="inline mr-1" /> CONFIRM EXTUBATION</> : 'EXTUBATE PATIENT'}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UNSECURED AIRWAY DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  const isBmvActive = patient?.currentO2Device?.includes('BMV') || patient?.currentO2Device?.includes('Bag-Mask');
  const isVentFailing = patient?.ventilationStatus === 'failed';
  const isObstructed = patient?.isAirwayObstruction;

  const bezelColor = patient?.airwayBlood
    ? 'bg-red-950/20 border-red-800/40 text-red-400'
    : isVentFailing
      ? 'bg-orange-950/20 border-orange-850/40 text-orange-400 animate-pulse'
      : isObstructed
        ? 'bg-amber-950/20 border-amber-800/40 text-amber-400 animate-pulse'
        : 'bg-slate-950/30 border-white/5 text-slate-300';

  const bezelLabel = patient?.airwayBlood
    ? '⚠️ AIRWAY COMPROMISED'
    : isVentFailing
      ? '🚨 FAILED VENTILATION'
      : isObstructed
        ? '⚠️ AIRWAY OBSTRUCTION'
        : patient?.ventilationStatus === 'mechanical'
          ? '🤖 MECHANICAL VENTILATION'
          : '🌬️ SPONTANEOUS DRIVE';

  const bezelSub = patient?.airwayBlood
    ? 'Active blood/secretions obscuring pharynx'
    : isVentFailing
      ? 'Positive pressure mask ventilation ineffective'
      : isObstructed
        ? 'Upper airway soft tissue obstruction — apply jaw thrust or HTCL'
        : patient?.ventilationStatus === 'mechanical'
          ? 'Positive pressure ventilation in progress'
          : 'Ventilation patency is critical';

  return (
    <div className="glass-panel glass-cyan p-4 flex flex-col gap-3.5 flex-1 min-h-[250px] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0 font-mono">
        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
          <Wind size={12} className="text-amber-400" /> Airway Controls
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-[8px] text-slate-400 hover:text-slate-200 font-bold bg-slate-950/60 border border-white/5 px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer"
        >
          MINIMIZE
        </button>
      </div>

      {/* Status bezel — now shows airway obstruction state */}
      <div className={`border p-3 rounded-2xl flex flex-col gap-1 shadow-inner shrink-0 font-mono text-center ${bezelColor}`}>
        <div className="font-black tracking-wider text-xs flex items-center justify-center gap-1.5">
          {bezelLabel}
        </div>
        <span className="text-[9px] text-slate-500">{bezelSub}</span>
      </div>

      {renderPositionDropdown()}
      {renderExamsDropdown()}

      {/* O2 Support Selector */}
      <div className="flex flex-col gap-1 shrink-0 font-mono text-[9px]">
        <div className="border border-white/5 bg-slate-950/30 rounded-xl overflow-hidden">
          <button
            onClick={() => { setShowO2(!showO2); if (o2Config.device) resetO2Config(); }}
            data-tutorial="o2-dropdown-btn"
            className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-950/40 border-b border-white/5 font-mono text-[9px] font-black text-cyan-400 uppercase tracking-wider hover:bg-slate-950/60 transition-all"
          >
            <span className="flex items-center gap-1.5 text-cyan-300">
              💨 O2 Support: {(patient?.currentO2Device || 'Room Air').toUpperCase()}
            </span>
            <span>{showO2 ? '▲' : '▼'}</span>
          </button>
          {showO2 && (
            <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Room Air', value: 'Room Air' },
                { label: 'Bag-Mask Valve', value: 'Bag-Mask Valve (BMV)' },
                { label: 'Nasal Cannula', value: 'Nasal Cannula' },
                { label: 'Simple Face Mask', value: 'Simple Face Mask' },
                { label: 'Non-Rebreather', value: 'Non-Rebreather Mask (NRB)' },
                { label: 'High Flow (HFNC)', value: 'High Flow Nasal Cannula (HFNC)' },
                { label: 'CPAP', value: 'CPAP' },
                { label: 'BiPAP', value: 'BiPAP' },
              ].map(dev => (
                <button
                  key={dev.value}
                  onClick={() => {
                    if (dev.value === 'Room Air') {
                      if (handleSetO2) handleSetO2('Room Air');
                      setShowO2(false);
                    } else {
                      setO2Config({ device: dev.value, flow: '', fio2: '', ipap: '', epap: '', rate: '' });
                      setShowO2(false);
                    }
                  }}
                  data-tutorial={dev.value === 'Bag-Mask Valve (BMV)' ? 'bmv-device-btn' : dev.value === 'Non-Rebreather Mask (NRB)' ? 'nrb-device-btn' : undefined}
                  className={`glass-button border-slate-800 py-1.5 text-[8.5px] leading-tight ${
                    (patient?.currentO2Device || 'Room Air') === dev.value ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200' : 'text-cyan-300 hover:bg-cyan-950/20'
                  }`}
                >
                  {dev.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Device configuration panel */}
        {renderO2ConfigPanel()}

        {/* Active device status bar */}
        {patient?.currentO2Device && patient.currentO2Device !== 'Room Air' && !o2Config.device && (
          <div className="bg-cyan-950/30 border border-cyan-800/40 p-2 rounded-lg text-[9px] text-cyan-300 font-mono flex justify-between items-center mt-1">
            <span className="truncate">
              Active: {patient.currentO2Device}
              {patient.currentO2Flow ? ` · ${patient.currentO2Flow} L/min` : ''}
              {patient.currentFiO2 && patient.currentFiO2 !== 21 ? ` · FiO₂ ${patient.currentFiO2}%` : ''}
            </span>
            <button
              onClick={() => { if (handleSetO2) handleSetO2('Room Air'); }}
              className="text-red-400 hover:text-red-300 font-bold uppercase tracking-widest text-[8px] bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded ml-2 shrink-0"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {renderChecklistsAccordion()}

      {/* Main action area */}
      <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1">1. Airway Patency</h4>

        {/* Jaw thrust and Head-Tilt Chin-Lift */}
        <div className="flex gap-2 font-mono">
          <button
            onClick={handleJawThrust}
            title="Jaw thrust: preferred in trauma (neutral C-spine)"
            className={`flex-1 p-2 text-[9px] rounded-lg border glass-button font-bold transition-all ${
              isObstructed ? 'border-amber-500 text-amber-200 bg-amber-950/10' : 'border-slate-800'
            }`}
          >
            ✊ JAW THRUST
          </button>
          <button
            onClick={handleHeadTiltChinLift}
            disabled={!!patient?.trauma}
            title={patient?.trauma ? 'Contraindicated: suspected C-spine injury' : 'Head-Tilt Chin-Lift: first-line in non-trauma'}
            className={`flex-1 p-2 text-[9px] rounded-lg border glass-button font-bold transition-all disabled:opacity-30 disabled:pointer-events-none ${
              isObstructed && !patient?.trauma ? 'border-amber-500 text-amber-200 bg-amber-950/10' : 'border-slate-800'
            }`}
          >
            👆 HEAD-TILT
          </button>
        </div>

        {/* Two-person BMV — appears when BMV is active and ventilation is difficult */}
        {isBmvActive && (
          <button
            onClick={handleTwoPersonBMV}
            className={`w-full p-2 rounded-lg border font-bold text-[9px] font-mono transition-all ${
              isVentFailing
                ? 'glass-button-rose border-rose-500 text-rose-200 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'glass-button border-cyan-800/40 text-cyan-300'
            }`}
          >
            👥 TWO-PERSON BMV{isVentFailing ? ' — FAILED VENTILATION' : ''}
          </button>
        )}

        <div className="flex gap-2 font-mono">
          <button
            onClick={handleSuction}
            data-tutorial="yankauer-btn"
            className={`flex-1 p-2 text-[10px] rounded-lg border font-bold transition-all ${
              patient?.airwayBlood
                ? 'glass-button-rose text-red-200 border-red-500 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse'
                : 'glass-button border-slate-800'
            }`}
          >
            <Droplet size={12} className="inline mr-1 text-blue-400" /> YANKAUER
          </button>
          <button
            onClick={() => pushMed('Topical Lidocaine Spray', 1)}
            className={`flex-1 p-2 rounded-lg border font-bold transition-all text-[9px] font-mono ${
              patient?.isTopicalized
                ? 'glass-button-emerald text-green-200 border-green-800/40'
                : 'glass-button border-slate-800'
            }`}
          >
            {patient?.isTopicalized ? '✓ TOPICALIZED' : 'LIDO 4% SPRAY'}
          </button>
        </div>

        {/* Airway adjuncts */}
        <div className="mt-1">
          {renderAirwayToolButton('Oropharyngeal Airway (OPA)', 'Place OPA (Bite Block)', 'Contra: Awake reflexes', ['80mm', '90mm', '100mm'])}
          {renderAirwayToolButton('Nasopharyngeal Airway (NPA)', 'Place NPA (Nasal Trumpet)', 'Contra: Basilar trauma', ['28Fr', '30Fr', '32Fr'])}
          {renderAirwayToolButton('Laryngeal Mask Airway (LMA)', 'Place LMA (Supraglottic Rescue)', 'Based on weight (see below)', ['Size 3', 'Size 4', 'Size 5'])}
        </div>

        {/* Intubation & Rescue */}
        <h4 className="text-slate-400 text-[10px] uppercase font-black tracking-wider font-mono border-b border-white/5 pb-1 mt-3">2. Laryngoscopy & Intubation</h4>
        <button
          onClick={() => setSetupModal(true)}
          data-tutorial="intubation-prepare-btn"
          className="w-full bg-green-950/20 hover:bg-green-900/30 border border-green-600/40 p-3 rounded-xl font-black text-green-400 text-xs shadow-[0_0_12px_rgba(34,197,94,0.15)] transition-all active:scale-97 uppercase tracking-wider font-mono"
        >
          PREPARE INTUBATION EQUIPMENT
        </button>

        <button
          onClick={handleSurgicalCric}
          className="w-full bg-red-950/30 hover:bg-red-900/40 border border-red-700/50 p-2.5 rounded-xl font-black text-red-300 text-[10px] uppercase tracking-wider font-mono mt-1 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
        >
          🔪 SURGICAL CRICOTHYROIDOTOMY
        </button>
      </div>
    </div>
  );
};
