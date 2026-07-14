import { useState, useEffect } from 'react';
import { Droplet, Activity, Eye, Syringe, FileText } from 'lucide-react';
import { MEDICATIONS } from '../../engine/Pharmacology';
import { getMedColor, getFluidColor } from './Pharmacopoeia';

export const LinesResusPanel = ({
  patient,
  setPatient,
  updateFluidRate,
  removeFluid,
  logEvent,
  processMed,
  activeMeds = [],
  defibSettings,
  setDefibSettings,
  toggleCPR,
  deliverShock,
  checkRhythm,
  time,
  formatTime,
  vitals,
  setAccessModal,
  generateLab,
  placeEpidural,
  removeEpidural,
  toggleCeliacBlock
}) => {
  const isCodeActive = !!(patient?.cprActive || patient?.isArrest);
  const [showCPRDefib, setShowCPRDefib] = useState(isCodeActive);
  const [showAccess, setShowAccess] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showRegional, setShowRegional] = useState(false);
  const [showHTs, setShowHTs] = useState(false);
  const [epiduralLevelInput, setEpiduralLevelInput] = useState(8);

  useEffect(() => {
    if (isCodeActive) {
      setShowCPRDefib(true);
    }
  }, [isCodeActive]);
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

    if (parseFloat(newDose) <= 0) {
      processMed(medId, 0, 'IV', 'Stop Infusion', originalUnit);
      logEvent(`Stopped ${medId} infusion on selected line.`);
    } else {
      processMed(medId, newDose, 'IV', 'Infusion', originalUnit);
      logEvent(`Set ${medId} infusion rate to ${newDose} ${originalUnit} on selected line.`);
    }
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

  // ACLS computed values
  const aclsRhythm = patient?.cardiacRhythm || 'normal';
  const aclsIsShockable = aclsRhythm === 'vfib' || aclsRhythm === 'vtach';
  const aclsIsNonShockable = aclsRhythm === 'pea' || aclsRhythm === 'asystole';
  const codeElapsed = patient?.isArrest ? Math.max(0, Math.floor((time || 0) - (patient?.codeStartTime || time || 0))) : 0;
  const cprCycleTime = codeElapsed > 0 ? codeElapsed % 120 : 0;
  const cprCycleNum = codeElapsed > 0 ? Math.floor(codeElapsed / 120) + 1 : 1;
  const secsSinceEpi = (patient?.lastEpiPushTime != null && patient?.isArrest) ? Math.floor((time || 0) - patient.lastEpiPushTime) : null;
  const epiDueIn = secsSinceEpi != null ? Math.max(0, 300 - secsSinceEpi) : null;
  const epiOverdue = secsSinceEpi != null && secsSinceEpi >= 300;
  const epiNearlySoon = epiDueIn != null && epiDueIn <= 60 && !epiOverdue;
  const etco2Display = vitals?.etco2 != null ? Math.round(vitals.etco2) : 0;
  const amioDoses = patient?.amioDosesGivenInArrest || 0;

  const fmtSec = (s) => {
    if (s == null || s < 0) return '--:--';
    const m = Math.floor(s / 60); const sc = Math.floor(s % 60);
    return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
  };
  const pushACLS = (medId, dose, unit) => {
    if (processMed) processMed(medId, dose, 'IV', 'Bolus', unit, null, null);
  };
  const rhythmConfig = {
    vfib:     { label: 'V-FIB',     sub: 'SHOCKABLE ⚡',       bg: 'bg-red-950/60',     border: 'border-red-500',   text: 'text-red-400',     pulse: true  },
    vtach:    { label: 'V-TACH',    sub: 'SHOCKABLE ⚡',       bg: 'bg-red-950/60',     border: 'border-red-500',   text: 'text-red-400',     pulse: true  },
    pea:      { label: 'PEA',       sub: 'NON-SHOCKABLE',      bg: 'bg-yellow-950/50',  border: 'border-yellow-600',text: 'text-yellow-400',  pulse: false },
    asystole: { label: 'ASYSTOLE',  sub: 'NON-SHOCKABLE',      bg: 'bg-slate-900/80',   border: 'border-slate-600', text: 'text-slate-300',   pulse: false },
    normal:   { label: 'ORGANIZED', sub: '✅ ROSC',            bg: 'bg-emerald-950/50', border: 'border-emerald-600',text: 'text-emerald-400', pulse: false },
  };
  const rc = rhythmConfig[aclsRhythm] || { label: aclsRhythm?.toUpperCase() || '---', sub: '', bg: 'bg-slate-900/60', border: 'border-slate-700', text: 'text-slate-300', pulse: false };

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

      {/* Bedside Procedures & Access Accordions */}
      {/* Establish Access Accordion */}
      <div className="border border-cyan-500/20 bg-cyan-950/5 rounded-xl overflow-hidden shrink-0">
        <button
          onClick={() => setShowAccess(!showAccess)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-cyan-950/20 border-b border-white/5 font-mono text-[9px] font-black text-cyan-400 uppercase tracking-wider hover:bg-cyan-950/30 transition-all"
        >
          <span className="flex items-center gap-1.5">
            <Syringe size={12} className="text-cyan-400" />
            Establish Access
          </span>
          <span>{showAccess ? '▲' : '▼'}</span>
        </button>
        {showAccess && (
          <div className="p-2.5 grid grid-cols-2 gap-2 font-mono">
            <button
              onClick={() => { if (setAccessModal) setAccessModal({ show: true, category: 'Peripheral IV' }); }}
              className="glass-button border-slate-800 text-cyan-300 hover:bg-cyan-950/20 py-1.5 text-[9px]"
            >
              Peripheral IV (PIV)
            </button>
            <button
              onClick={() => { if (setAccessModal) setAccessModal({ show: true, category: 'Central Line' }); }}
              className="glass-button border-slate-800 text-cyan-300 hover:bg-cyan-950/20 py-1.5 text-[9px]"
            >
              Central Line (CVC)
            </button>
            <button
              onClick={() => { if (setAccessModal) setAccessModal({ show: true, category: 'Intraosseous (IO)' }); }}
              className="glass-button border-slate-800 text-cyan-300 hover:bg-cyan-950/20 py-1.5 text-[9px]"
            >
              Intraosseous (IO)
            </button>
            <button
              onClick={() => { if (setAccessModal) setAccessModal({ show: true, category: 'Arterial Line' }); }}
              className="glass-button border-slate-800 text-cyan-300 hover:bg-cyan-950/20 py-1.5 text-[9px]"
            >
              Arterial Line
            </button>
          </div>
        )}
      </div>

      {/* Order Labs Accordion */}
      <div className="border border-purple-500/20 bg-purple-950/5 rounded-xl overflow-hidden shrink-0">
        <button
          onClick={() => setShowLabs(!showLabs)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-purple-950/20 border-b border-white/5 font-mono text-[9px] font-black text-purple-400 uppercase tracking-wider hover:bg-purple-950/30 transition-all"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={12} className="text-purple-400" />
            Order Labs
          </span>
          <span>{showLabs ? '▲' : '▼'}</span>
        </button>
        {showLabs && (
          <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
            {[
              { label: 'ABG (Arterial)', value: 'ABG' },
              { label: 'VBG (Venous)', value: 'VBG' },
              { label: 'CBC (Hemoglobin)', value: 'CBC' },
              { label: 'CMP (Electrolytes)', value: 'CMP' },
              { label: 'Coags (PT/INR)', value: 'Coagulation' },
              { label: 'TEG (Viscoelastic)', value: 'TEG' },
              { label: 'LFTs (Liver)', value: 'LFTs' },
              { label: 'Thyroid Panel', value: 'Thyroid' },
              { label: 'Urinalysis', value: 'Urinalysis' },
              { label: 'Pregnancy (hCG)', value: 'Pregnancy' },
              { label: 'Type & Screen', value: 'Type & Screen' },
              { label: 'Type & Cross', value: 'Type & Cross' },
              { label: 'HbA1c', value: 'HbA1c' },
              { label: 'PFT / Ciliary Audit', value: 'PFTs' },
              { label: 'Local Anesthetics', value: 'Local Anesthetics' }
            ].map(lab => (
              <button
                key={lab.value}
                onClick={() => { if (generateLab) generateLab(lab.value); }}
                className="glass-button border-slate-800 text-purple-300 hover:bg-purple-950/20 py-1.5 text-[8.5px] leading-tight"
              >
                {lab.label}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* ACLS Console — Defib & CPR */}
      <div className="border border-red-500/20 bg-red-950/5 rounded-xl overflow-hidden shrink-0">
        <button
          onClick={() => setShowCPRDefib(!showCPRDefib)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-red-950/20 border-b border-white/5 font-mono text-[9px] font-black text-red-400 uppercase tracking-wider hover:bg-red-950/30 transition-all"
        >
          <span className="flex items-center gap-1.5">
            <Activity size={12} className={isCodeActive ? 'text-red-500 animate-pulse' : 'text-red-400'}/>
            Defib &amp; ACLS Console
          </span>
          <span>{showCPRDefib ? '▲' : '▼'}</span>
        </button>

        {showCPRDefib && (
          <div className="p-2.5 flex flex-col gap-2 font-mono">

            {/* Rhythm Banner */}
            <div className={`${rc.bg} border ${rc.border} rounded-lg p-2 flex items-center justify-between`}>
              <div className="flex flex-col gap-0.5">
                <span className={`text-[11px] font-black tracking-wider ${rc.text} ${rc.pulse ? 'animate-pulse' : ''}`}>
                  {rc.label}
                </span>
                <span className="text-[8px] text-slate-400">{rc.sub}</span>
              </div>
              {patient?.isArrest && patient?.biologicalDeath ? (
                <span className="text-[8px] text-red-500 font-black animate-pulse">BIOLOGICAL DEATH</span>
              ) : patient?.isArrest ? (
                <div className="text-right">
                  <div className="text-[7px] text-slate-500 uppercase">Code Time</div>
                  <div className="text-[11px] text-white font-bold tabular-nums">{fmtSec(codeElapsed)}</div>
                </div>
              ) : (
                <span className="text-[8px] text-slate-600">No active code</span>
              )}
            </div>

            {/* Timers Row (active code only) */}
            {patient?.isArrest && !patient?.biologicalDeath && (
              <div className="grid grid-cols-3 gap-1">
                <div className="bg-slate-950/60 border border-white/5 rounded-lg p-1.5 text-center">
                  <div className="text-[7px] text-slate-500 uppercase">Cycle {cprCycleNum}</div>
                  <div className={`text-[9px] font-bold tabular-nums ${cprCycleTime > 90 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {fmtSec(cprCycleTime)}/2:00
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-white/5 rounded-lg p-1.5 text-center">
                  <div className="text-[7px] text-slate-500 uppercase">EtCO₂</div>
                  <div className={`text-[9px] font-bold tabular-nums ${etco2Display >= 20 ? 'text-emerald-400' : etco2Display > 0 ? 'text-yellow-300' : 'text-slate-600'}`}>
                    {etco2Display > 0 ? `${etco2Display} mmHg` : '---'}
                  </div>
                </div>
                <div className={`border rounded-lg p-1.5 text-center ${epiOverdue ? 'bg-red-950/50 border-red-500' : epiNearlySoon ? 'bg-yellow-950/30 border-yellow-700' : 'bg-slate-950/60 border-white/5'}`}>
                  <div className="text-[7px] text-slate-500 uppercase">EPI Due</div>
                  <div className={`text-[9px] font-bold tabular-nums ${epiOverdue ? 'text-red-400 animate-pulse' : epiNearlySoon ? 'text-yellow-400' : epiDueIn == null ? 'text-slate-500' : 'text-white'}`}>
                    {epiDueIn == null ? 'GIVE NOW' : epiOverdue ? 'OVERDUE' : fmtSec(epiDueIn)}
                  </div>
                </div>
              </div>
            )}

            {/* CPR Controls */}
            <div className="flex gap-1.5">
              <button
                onClick={() => toggleCPR?.()}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition active:scale-97 ${
                  patient?.cprActive
                    ? 'bg-rose-600 border-red-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.35)] animate-pulse'
                    : 'glass-button border-red-950/30 text-red-300 hover:bg-red-950/20'
                }`}
              >
                {patient?.cprActive ? '■ STOP CPR' : '▶ START CPR'}
              </button>
              <button
                onClick={() => checkRhythm?.()}
                disabled={!patient?.cprActive && !patient?.isArrest}
                className="flex-1 glass-button text-[9px] border border-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1 py-1.5"
              >
                <Eye size={10}/> RHYTHM CHECK
              </button>
            </div>

            {/* ACLS Drug Quick Panel */}
            {patient?.isArrest && !patient?.biologicalDeath && (
              <div className="flex flex-col gap-1">
                <div className="text-[7.5px] text-slate-500 uppercase tracking-wider font-bold border-b border-white/5 pb-0.5">ACLS Drugs</div>

                {/* Epinephrine — universal first-line */}
                <button
                  onClick={() => pushACLS('epinephrine', '1.0', 'mg')}
                  className={`w-full py-1.5 px-2 rounded-lg text-[9px] font-black border transition active:scale-97 text-left ${
                    epiOverdue
                      ? 'bg-red-700/40 border-red-500 text-white animate-pulse'
                      : 'glass-button border-red-900/50 text-red-300 hover:bg-red-950/30'
                  }`}
                >
                  💉 EPINEPHRINE 1mg IV
                  <span className="text-[7.5px] ml-1 opacity-70">
                    {epiDueIn == null ? '(give q3-5 min)' : epiOverdue ? '← OVERDUE, give now' : `· ${fmtSec(epiDueIn)} until due`}
                  </span>
                </button>

                {/* VF/pVT shockable-rhythm antiarrhythmics */}
                {aclsIsShockable && (
                  <>
                    <div className="flex gap-1">
                      <button
                        onClick={() => pushACLS('amiodarone', '300', 'mg')}
                        disabled={amioDoses >= 1}
                        className="flex-1 glass-button border-amber-900/50 text-amber-300 hover:bg-amber-950/20 py-1.5 text-[8.5px] font-bold disabled:opacity-25 disabled:pointer-events-none rounded-lg border transition"
                      >
                        AMIO 300mg <span className="text-[7px] opacity-60">(1st dose)</span>
                      </button>
                      <button
                        onClick={() => pushACLS('amiodarone', '150', 'mg')}
                        disabled={amioDoses < 1 || amioDoses >= 2}
                        className="flex-1 glass-button border-amber-900/50 text-amber-300 hover:bg-amber-950/20 py-1.5 text-[8.5px] font-bold disabled:opacity-25 disabled:pointer-events-none rounded-lg border transition"
                      >
                        AMIO 150mg <span className="text-[7px] opacity-60">(2nd dose)</span>
                      </button>
                    </div>
                    <button
                      onClick={() => pushACLS('lidocaine', '1.5', 'mg/kg')}
                      className="w-full glass-button border-amber-900/30 text-amber-200/70 hover:bg-amber-950/10 py-1 text-[8.5px] font-bold rounded-lg border transition"
                    >
                      LIDOCAINE 1.5mg/kg <span className="text-[7px] opacity-60">(alt if no amio)</span>
                    </button>
                  </>
                )}

                {/* Treat the H's — supportive/metabolic */}
                <div className="grid grid-cols-3 gap-1 mt-0.5">
                  <button
                    onClick={() => pushACLS('bicarbonate', '50', 'mEq')}
                    className="glass-button border-slate-700 text-slate-300 hover:bg-slate-800/30 py-1.5 text-[8px] font-bold rounded-lg border transition text-center"
                  >
                    NaHCO₃<br/><span className="text-[6.5px] text-slate-500">50mEq · H⁺ / HyperK</span>
                  </button>
                  <button
                    onClick={() => pushACLS('calcium', '1.0', 'g')}
                    className="glass-button border-slate-700 text-slate-300 hover:bg-slate-800/30 py-1.5 text-[8px] font-bold rounded-lg border transition text-center"
                  >
                    CaCl₂ 1g<br/><span className="text-[6.5px] text-slate-500">HyperK / CCB / Ca²⁺</span>
                  </button>
                  <button
                    onClick={() => pushACLS('magnesium', '2.0', 'g')}
                    className="glass-button border-slate-700 text-slate-300 hover:bg-slate-800/30 py-1.5 text-[8px] font-bold rounded-lg border transition text-center"
                  >
                    MgSO₄ 2g<br/><span className="text-[6.5px] text-slate-500">Torsades</span>
                  </button>
                </div>
              </div>
            )}

            {/* Defibrillator */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[7.5px] text-slate-500 uppercase tracking-wider font-bold border-b border-white/5 pb-0.5 flex items-center gap-1.5">
                Defibrillator
                {aclsIsShockable && <span className="text-red-400 animate-pulse">⚡ SHOCK INDICATED</span>}
                {aclsIsNonShockable && patient?.isArrest && <span className="text-slate-500">· Non-Shockable Rhythm</span>}
              </div>
              {defibSettings && (
                <div className="flex gap-1.5 items-center">
                  <select
                    value={defibSettings.joules}
                    onChange={(e) => setDefibSettings({...defibSettings, joules: parseInt(e.target.value)})}
                    className="bg-slate-950 border border-white/5 rounded-lg p-1 text-[9px] text-slate-300 outline-none flex-1 h-7 font-mono"
                  >
                    <option value={50}>50 J</option>
                    <option value={100}>100 J</option>
                    <option value={150}>150 J</option>
                    <option value={200}>200 J (Biphasic Max)</option>
                    <option value={360}>360 J (Monophasic)</option>
                  </select>
                  <button
                    onClick={() => setDefibSettings({...defibSettings, sync: !defibSettings.sync})}
                    className={`px-2 h-7 text-[9px] rounded-lg border font-black transition ${
                      defibSettings.sync
                        ? 'bg-amber-600/20 text-yellow-300 border-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'glass-button border-slate-800'
                    }`}
                  >
                    SYNC
                  </button>
                  <button
                    onClick={() => deliverShock?.(defibSettings.joules, defibSettings.sync)}
                    className={`h-7 px-3 rounded-lg text-[9px] font-black border transition ${
                      aclsIsShockable
                        ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] hover:bg-red-500'
                        : 'glass-button border-slate-700 text-slate-400 hover:opacity-80'
                    }`}
                  >
                    ⚡ SHOCK
                  </button>
                </div>
              )}
            </div>

            {/* H's and T's */}
            <div className="border border-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowHTs(!showHTs)}
                className="w-full flex items-center justify-between px-2 py-1 text-[8px] font-bold text-slate-400 hover:bg-slate-800/20 transition"
              >
                <span>H&#39;s &amp; T&#39;s — Reversible Causes</span>
                <span className="text-slate-600">{showHTs ? '▲' : '▼'}</span>
              </button>
              {showHTs && (
                <div className="px-2 pb-2 grid grid-cols-2 gap-x-3 text-[8px]">
                  <div>
                    <div className="text-slate-500 font-bold uppercase text-[7px] mt-1 mb-0.5">H&#39;s</div>
                    {['Hypovolemia','Hypoxia','H⁺ Ion (Acidosis)','Hypo/Hyperkalemia','Hypothermia'].map(h => (
                      <div key={h} className="text-slate-300 py-0.5">{h}</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold uppercase text-[7px] mt-1 mb-0.5">T&#39;s</div>
                    {['Tension PTX','Tamponade','Thrombosis (PE)','Thrombosis (MI)','Toxins (Drugs)'].map(t => (
                      <div key={t} className="text-slate-300 py-0.5">{t}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Regional / Neuraxial Sympathetic Blocks (Ch15, Miller's 9th Ed) */}
      <div className="border border-indigo-500/20 bg-indigo-950/5 rounded-xl overflow-hidden shrink-0">
        <button
          onClick={() => setShowRegional(!showRegional)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-indigo-950/20 border-b border-white/5 font-mono text-[9px] font-black text-indigo-400 uppercase tracking-wider hover:bg-indigo-950/30 transition-all"
        >
          <span className="flex items-center gap-1.5">
            <Syringe size={12} className={patient?.epiduralBlockActive || patient?.celiacBlockActive ? "text-indigo-400 animate-pulse" : "text-indigo-500"}/>
            Regional / Neuraxial Blocks
          </span>
          <span>{showRegional ? '▲' : '▼'}</span>
        </button>
        {showRegional && (
          <div className="p-2.5 flex flex-col gap-2 font-mono">
            {/* Thoracic Epidural */}
            <div className="bg-slate-950/60 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-indigo-300">Thoracic Epidural</span>
              {patient?.epiduralBlockActive ? (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-emerald-400 font-bold">Active at T{patient.epiduralLevel ?? '?'}</span>
                  <button
                    onClick={() => { if (removeEpidural) removeEpidural(); }}
                    className="glass-button text-[8px] border border-slate-800 px-2 py-1 rounded-md"
                  >
                    STOP
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    value={epiduralLevelInput}
                    onChange={(e) => setEpiduralLevelInput(parseInt(e.target.value))}
                    className="bg-slate-950 border border-white/5 rounded-lg p-1 text-[9px] text-slate-300 outline-none flex-1 h-7"
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(lvl => (
                      <option key={lvl} value={lvl}>T{lvl}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { if (placeEpidural) placeEpidural(epiduralLevelInput); }}
                    className="glass-button glass-button-cyan text-[8px] border border-cyan-700 px-2 h-7 rounded-md text-cyan-200"
                  >
                    PLACE
                  </button>
                </div>
              )}
              <span className="text-[7.5px] text-slate-500 leading-snug">Sympathetic coverage of gut/splanchnic outflow is graded by insertion level — a mid-thoracic catheter (T8-T9) best covers small bowel/colon innervation (T9-L1).</span>
            </div>
            {/* Celiac Plexus Block */}
            <div className="bg-slate-950/60 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-indigo-300">Celiac Plexus Block</span>
              <button
                onClick={() => { if (toggleCeliacBlock) toggleCeliacBlock(); }}
                className={`w-full py-1.5 rounded-lg text-[9px] font-black border transition active:scale-97 ${
                  patient?.celiacBlockActive
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                    : 'glass-button border-slate-800 text-indigo-300'
                }`}
              >
                {patient?.celiacBlockActive ? 'ACTIVE — REVERSE' : 'PERFORM BLOCK'}
              </button>
              <span className="text-[7.5px] text-slate-500 leading-snug">Targets the celiac ganglion directly — complete splanchnic sympathetic block of "the majority of the GI tract up to the rectum" regardless of level.</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1 min-h-0">
        {resusLines.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-8 italic border border-dashed border-white/5 rounded-2xl bg-white/[0.01] font-mono leading-normal my-auto">
            No resuscitation lines placed.<br/>
            <span className="text-[10px] text-slate-500 font-bold block mt-1.5">Place PIV or Central Line in Action Center.</span>
          </div>
        ) : (
          resusLines.map((line) => {
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

                      <div className="flex justify-between items-center text-[8px] text-slate-500">
                        <span>Flow: <span className={`font-extrabold ${isBlood ? 'text-red-400' : 'text-cyan-400'}`}>{fluid.currentRate ? (fluid.currentRate / 60).toFixed(1) : '0.0'} mL/min</span><span className="text-slate-600 ml-1">({fluid.currentRate ? Math.round(fluid.currentRate) : 0}/hr)</span></span>
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
                              ? 'text-rose-400'
                              : 'text-purple-400';

                    const activeMedModel = activeMeds.find(m => m.name.toLowerCase() === (medData?.name || medInf.medId).toLowerCase());

                    return (
                      <div key={resolvedId} className="bg-slate-950/60 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5 font-mono mt-0.5">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className={`font-extrabold ${textColorClass} text-[10px] tracking-wide`}>{medData?.name || medInf.medId}</span>
                          <span className={`font-bold border px-1.5 py-0.5 rounded text-[10px] ${textColorClass} bg-slate-900/40 border-white/5`}>
                            {medInf.rate} {medInf.unit || 'mcg/kg/min'}
                          </span>
                        </div>
                        {activeMedModel && (
                          <div className="flex justify-between text-[8.5px] text-slate-400 border-b border-white/5 pb-1 mt-0.5">
                            <span>Cp: <span className="text-slate-300 font-bold">{activeMedModel.Cp ? activeMedModel.Cp.toFixed(3) : '0.000'}</span></span>
                            <span>Ce: <span className="text-slate-300 font-bold">{activeMedModel.Ce ? activeMedModel.Ce.toFixed(3) : '0.000'}</span></span>
                            {activeMedModel.csht > 0 && (
                              <span>CSHT: <span className="text-slate-300 font-bold">{activeMedModel.csht.toFixed(1)}m</span></span>
                            )}
                          </div>
                        )}
                        
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

      {/* Renal status moved to dedicated RenalPanel above this column */}
    </div>
  );
};
