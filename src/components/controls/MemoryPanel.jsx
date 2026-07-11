import { useState } from 'react';
import { Brain, ShieldAlert, FlaskConical } from 'lucide-react';
import { calculatePacuReadiness } from '../../engine/OutcomeScoringEngine.ts';

// ─── helpers ────────────────────────────────────────────────────────────────
const pct = (val) => typeof val === 'number' ? `${Math.round(val * 100)}%` : '0%';
const bar = (val, color) => (
  <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
    <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${Math.min(100, (val || 0) * 100)}%` }} />
    <span className="absolute right-1.5 text-[11.5px] font-black text-slate-300 leading-none">{pct(val)}</span>
  </div>
);

// ─── nucleus clinical label map ─────────────────────────────────────────────
// Neuroscience label → { clinical, mechanism, awake, asleep }
const NUCLEI = [
  {
    key: 'lcActivity',
    nsLabel: 'LC (NE)',
    clinLabel: 'Norepinephrine Arousal System',
    mechanism: 'Locus Coeruleus: releases NE → global cortical arousal. Suppressed by dexmedetomidine (unique arousable sedation).',
    awakeHigh: true,   // high when awake
    color: 'bg-emerald-500',
    drugNote: (patient, meds) => meds?.find(m => m.name === 'Dexmedetomidine')?.Ce > 0.1 ? `↓ by Dexmedetomidine` : null,
  },
  {
    key: 'tmnActivity',
    nsLabel: 'TMN (Hist)',
    clinLabel: 'Histamine Wake Drive',
    mechanism: 'Tuberomammillary Nucleus: releases histamine → cortical activation. Blocked by H1 antihistamines (why diphenhydramine causes drowsiness).',
    awakeHigh: true,
    color: 'bg-emerald-500',
    drugNote: () => null,
  },
  {
    key: 'vlpoActivity',
    nsLabel: 'VLPO (GABA)',
    clinLabel: 'Sleep Promoter',
    mechanism: 'Ventrolateral Preoptic nucleus: GABA-ergic — inhibits all arousal nuclei. Activated by propofol and natural sleep. LOW when awake, HIGH during anesthesia.',
    awakeHigh: false,  // HIGH means anesthetized
    color: 'bg-cyan-500',
    drugNote: (patient, meds) => {
      const propCe = meds?.find(m => m.name === 'Propofol')?.Ce || 0;
      if (propCe > 0.5) return `↑ activated by Propofol`;
      if ((patient?.vlpoActivity || 0) > 0.4) return `Active (sleep/anesthesia state)`;
      return null;
    },
  },
  {
    key: 'orexinLevel',
    nsLabel: 'Orexin',
    clinLabel: 'Wake Peptide (Orexin/Hypocretin)',
    mechanism: 'Lateral Hypothalamus: orexin sustains wakefulness and stabilizes arousal state. Absent in narcolepsy. Blocked by suvorexant (dual orexin receptor antagonist).',
    awakeHigh: true,
    color: 'bg-emerald-500',
    drugNote: (patient, meds) => {
      if (patient?.narcolepsy) return `↓ (Narcolepsy — absent orexin neurons)`;
      if (meds?.find(m => m.name === 'Suvorexant')?.Ce > 0.1) return `↓ blocked by Suvorexant`;
      return null;
    },
  },
  {
    key: 'vtaActivity',
    nsLabel: 'VTA (DA)',
    clinLabel: 'Dopamine Reward / Motivation',
    mechanism: 'Ventral Tegmental Area: dopamine → motivation, reward, and arousal. Ketamine increases VTA DA release (contributes to dissociation). Involved in emergence delirium.',
    awakeHigh: true,
    color: 'bg-purple-500',
    drugNote: (patient, meds) => {
      if (meds?.find(m => m.name === 'Ketamine')?.Ce > 0.2) return `↑ Ketamine → ↑DA release (dissociation)`;
      return null;
    },
  },
];

const CONNECTIVITIES = [
  {
    key: 'thalamocorticalConn',
    nsLabel: 'Thalamocortical',
    clinLabel: 'Sensory Relay → Cortex',
    mechanism: 'Thalamus acts as a gating station for all sensory signals. When this pathway is disrupted by anesthetics, the cortex no longer receives external world information — the primary mechanism of unconsciousness.',
    color: 'bg-cyan-500',
  },
  {
    key: 'frontoparietalFeedback',
    nsLabel: 'Frontoparietal',
    clinLabel: 'Conscious Perception Network',
    mechanism: 'Top-down feedback from frontal to parietal cortex — the neural correlate of conscious awareness. Disruption here predicts BIS < 60. Propofol specifically targets this pathway.',
    color: 'bg-teal-500',
  },
  {
    key: 'corticocorticalConn',
    nsLabel: 'Corticocortical',
    clinLabel: 'Cortical Integration',
    mechanism: 'Lateral connections between cortical areas enabling complex thought and unified experience. Reduced during anesthesia as information integration breaks down.',
    color: 'bg-purple-500',
  },
  {
    key: 'basalGangliaConn',
    nsLabel: 'Basal Ganglia',
    clinLabel: 'Subcortical Motor / Action Selection',
    mechanism: 'Selects and gates motor programs. Preserved longer than cortical connections during anesthesia — explains why patients may move to noxious stimuli (spinal reflex) even when unconscious.',
    color: 'bg-indigo-500',
  },
];



// ─── main component ─────────────────────────────────────────────────────────
export const MemoryPanel = ({ patient, vitals, activeMeds, setPatient, logEvent, toggleBis, toggleTof, toggleTofMode, surgicalPhase }) => {
  const [nsMode, setNsMode] = useState(false); // false = clinical, true = neuroscience

  const isBis = patient?.hasBisMonitor;
  const isTof = patient?.hasTofMonitor;
  const showPacuReadiness = surgicalPhase === 'Emergence' || surgicalPhase === 'PACU';
  const pacuReadiness = showPacuReadiness ? calculatePacuReadiness(vitals, patient) : null;
  const isQualitativeTof = isTof && patient?.tofMonitorMode === 'qualitative';
  const displayTofCount  = isQualitativeTof ? vitals?.perceivedTofCount : vitals?.tofCount;
  const displayTofRatio  = isQualitativeTof ? vitals?.perceivedTofRatio : vitals?.tofRatio;


  const getNucleusColor = (key, val) => {
    const nucleus = NUCLEI.find(n => n.key === key);
    if (!nucleus) return 'bg-emerald-500';
    // For sleep-promoter (VLPO), HIGH activity during anesthesia is good (protective)
    if (!nucleus.awakeHigh) return val > 0.5 ? 'bg-cyan-500' : 'bg-slate-700';
    return val > 0.7 ? 'bg-emerald-500' : val > 0.3 ? 'bg-yellow-500' : 'bg-slate-700';
  };

  // ── Awareness risk classification ────────────────────────────────────────
  const encoding     = patient?.explicitEncoding ?? 1.0;
  const bisVal       = vitals?.bis || 98;
  const isAware      = patient?.isAwarenessActive || false;
  const ptsdScore    = patient?.ptsdScore || 0;
  const ltpInhibited = patient?.ltpInductionInhibited || false;

  const awarenessRisk = (() => {
    if (isAware)        return { level: 'AWARENESS DETECTED', color: 'red',   glow: 'rgba(239,68,68,0.4)',   bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.4)' };
    if (encoding > 0.6) return { level: 'HIGH RISK',          color: 'amber', glow: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.4)' };
    if (encoding > 0.3) return { level: 'MODERATE RISK',      color: 'amber', glow: 'rgba(251,191,36,0.2)', bg: 'rgba(251,191,36,0.04)', border: 'rgba(251,191,36,0.3)' };
    if (ltpInhibited)   return { level: 'PROTECTED',          color: 'green', glow: 'rgba(52,211,153,0.2)', bg: 'rgba(52,211,153,0.05)', border: 'rgba(52,211,153,0.3)' };
    return               { level: 'LOW RISK',                 color: 'green', glow: 'rgba(52,211,153,0.15)',bg: 'rgba(52,211,153,0.04)', border: 'rgba(52,211,153,0.25)' };
  })();

  const RISK_TEXT = { red: 'text-red-400', amber: 'text-amber-400', green: 'text-emerald-400' };
  const riskClass = RISK_TEXT[awarenessRisk.color];

  // ── Section label helper (shows clinical or neuroscience name) ────────────
  const sectionLabel = (clinLabel, nsLabel) => nsMode ? nsLabel : clinLabel;

  return (
    <div className="glass-panel glass-purple p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full max-h-[800px]">

      {/* ── PANEL HEADER ── */}
      <div className="flex items-center justify-between border-b border-purple-900 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="text-purple-400 shrink-0" size={18} />
          <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-200">
            Neuro & Neuromuscular
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {/* Clinical / Neuroscience toggle */}
          <button
            onClick={() => setNsMode(v => !v)}
            title={nsMode ? 'Switch to clinical language' : 'Switch to neuroscience notation'}
            className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${
              nsMode
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/60 shadow-[0_0_6px_rgba(99,102,241,0.3)]'
                : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-300'
            }`}
          >
            <FlaskConical size={9} />
            {nsMode ? 'NS View' : 'Clinical'}
          </button>
          <button
            onClick={() => { if (toggleBis) toggleBis(); }}
            className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border transition-all ${
              isBis ? 'bg-purple-950/65 text-purple-300 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.35)]'
                    : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400 font-normal'
            }`}
          >{isBis ? '✓ BIS On' : 'Attach BIS'}</button>
          <button
            onClick={() => { if (toggleTof) toggleTof(); }}
            className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border transition-all ${
              isTof ? 'bg-purple-950/65 text-purple-300 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.35)]'
                    : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400 font-normal'
            }`}
          >{isTof ? '✓ TOF On' : 'Attach TOF'}</button>
          {isTof && (
            <button
              onClick={() => { if (toggleTofMode) toggleTofMode(); }}
              title="Qualitative (manual tactile) cannot detect fade above ~40% TOF ratio."
              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border transition-all ${
                isQualitativeTof
                  ? 'bg-amber-950/50 text-amber-400 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                  : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400 font-normal'
              }`}
            >{isQualitativeTof ? '◔ Qualitative (Manual)' : '◉ Quantitative (AMG)'}</button>
          )}
        </div>
      </div>

      {/* ── PACU READINESS ── */}
      {pacuReadiness && (
        <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-2.5">
          <div className="text-[13px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-between border-b border-slate-900 pb-1.5">
            <span>PACU Readiness (Aldrete-style)</span>
            <span className={`px-1.5 py-0.5 rounded text-[11.5px] font-extrabold uppercase border ${pacuReadiness.isReadyForDischarge ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-red-950/40 text-red-400 border-red-500/20'}`}>
              {pacuReadiness.totalScore}/{pacuReadiness.maxScore}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-[12.5px] font-mono">
            {Object.values(pacuReadiness.criteria).map(c => (
              <div key={c.label} className="flex items-center justify-between bg-slate-900/30 px-2 py-1 rounded border border-slate-850">
                <span className="text-slate-400">{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-300">{c.detail}</span>
                  <span className={`font-black ${c.points === 2 ? 'text-emerald-400' : c.points === 1 ? 'text-amber-400' : 'text-red-400'}`}>{c.points}/{c.maxPoints}</span>
                </span>
              </div>
            ))}
          </div>
          <div className={`text-[12.5px] leading-snug ${pacuReadiness.isReadyForDischarge ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pacuReadiness.isReadyForDischarge
              ? 'Meets conventional PACU transfer readiness (score ≥ 9/10).'
              : 'Below PACU readiness threshold. Transferring will be recorded as a quality-of-care event.'}
          </div>
        </div>
      )}

      {/* ── PONV ── */}
      {patient?.apfelScore !== undefined && (
        <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-2">
          <div className="text-[13px] font-black uppercase tracking-widest text-purple-400 flex items-center justify-between border-b border-slate-900 pb-1.5">
            <span>PONV Risk (Apfel Score)</span>
            <span className="px-1.5 py-0.5 rounded text-[11.5px] font-extrabold uppercase border bg-purple-950/40 text-purple-400 border-purple-500/20">{patient.apfelScore}/4</span>
          </div>
          <div className="flex items-center justify-between bg-slate-900/30 px-2 py-1 rounded border border-slate-850 text-[12.5px] font-mono">
            <span className="text-slate-400">Post-op Estimated Risk</span>
            <span className="font-black text-purple-400">{Math.round(patient.ponvRisk || 0)}%</span>
          </div>
          {patient.ponvProphylaxisRecommendation && (
            <div className="flex flex-col bg-slate-900/30 px-2 py-1.5 rounded border border-slate-850 gap-1 leading-snug text-[12.5px] font-mono">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold">Guideline:</span>
              <span className="text-slate-300 font-semibold">{patient.ponvProphylaxisRecommendation}</span>
            </div>
          )}
        </div>
      )}

      {/* ── NO MONITORS ── */}
      {!isBis && !isTof ? (
        <div className="flex flex-col gap-4 py-8">
          <div className="flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-6">
            <ShieldAlert className="text-purple-500/40" size={36} />
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Diagnostic Monitors Offline</div>
            <div className="text-[13px] text-slate-300 max-w-[240px] leading-relaxed">
              Attach processed EEG (BIS) to monitor depth of anesthesia and awareness risk, or TOF to assess neuromuscular blockade before extubation.
            </div>
            <div className="flex gap-2.5 mt-2">
              <button onClick={() => { if (toggleBis) toggleBis(); }} className="glass-button glass-button-purple text-[12px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-lg">Attach BIS</button>
              <button onClick={() => { if (toggleTof) toggleTof(); }} className="glass-button glass-button-purple text-[12px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-lg">Attach TOF</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 font-mono text-[11px]">

          {/* ═══════════════════ TOF SECTION (unchanged) ═══════════════════ */}
          {isTof && (
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-3">
              <div className="text-[13px] font-black uppercase tracking-widest text-orange-400 flex items-center justify-between border-b border-slate-900 pb-1.5">
                <span>Neuromuscular Transmission (TOF)</span>
                <span className={`px-1.5 py-0.5 rounded text-[11.5px] font-extrabold uppercase border ${isQualitativeTof ? 'bg-amber-950/40 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-orange-400 border-orange-500/10'}`}>
                  {isQualitativeTof ? 'MANUAL PNS' : 'ACTIVE (AMG)'}
                </span>
              </div>
              {isQualitativeTof && (
                <div className="text-[12px] text-amber-400/90 leading-snug bg-amber-950/20 border border-amber-900/30 rounded p-1.5">
                  Manual tactile assessment cannot detect fade once true TOF ratio exceeds ~40%. Values below reflect what a clinician would perceive, not ground truth.
                </div>
              )}
              <div className="text-[12.5px] text-slate-400 font-mono flex justify-between bg-slate-900/30 p-2 rounded border border-slate-850">
                <span>Genotype: <strong className="text-orange-400 uppercase">{patient?.butyrylcholinesteraseVariant === 'atypical' ? 'Atypical (E1a-E1a)' : patient?.butyrylcholinesteraseVariant === 'heterozygous' ? 'Heterozygous (E1u-E1a)' : 'Normal (E1u-E1u)'}</strong></span>
                <span>Dibucaine No: <strong className="text-orange-400">{patient?.butyrylcholinesteraseVariant === 'atypical' ? 20 : patient?.butyrylcholinesteraseVariant === 'heterozygous' ? 50 : 80}</strong></span>
              </div>
              <div className="flex gap-4 justify-around py-3 bg-slate-900/35 border border-slate-900 rounded-lg">
                {[{ label: 'T1', val: vitals?.t1 },{ label: 'T2', val: vitals?.t2 },{ label: 'T3', val: vitals?.t3 },{ label: 'T4', val: vitals?.t4 }].map((t, idx) => {
                  const raw = typeof t.val === 'number' && isFinite(t.val) ? t.val : 1.0;
                  const blocked = raw <= 0.001;
                  const v = isQualitativeTof ? (blocked ? 0 : 1.0) : raw;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 w-12">
                      <span className="text-[12px] font-bold text-slate-400">{t.label}</span>
                      <div className="w-6 bg-slate-950 h-24 rounded-md border border-slate-850 overflow-hidden relative flex flex-col justify-end p-0.5">
                        {!blocked ? (
                          <div className="bg-gradient-to-t from-orange-600 to-amber-400 w-full rounded-sm transition-all duration-500" style={{ height: `${Math.round(v * 100)}%` }} />
                        ) : (
                          <div className="absolute inset-0 border border-dashed border-slate-900 rounded-sm flex items-center justify-center">
                            <span className="text-[12px] text-slate-800 font-black">X</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[11.5px] font-mono font-black ${blocked ? 'text-slate-400' : 'text-slate-300'}`}>{blocked ? '0%' : `${Math.round(v * 100)}%`}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-900/40 p-2 border border-slate-850 rounded">
                  <span className="text-[11.5px] text-slate-400 uppercase block mb-1">TOF Count</span>
                  <span className="font-black text-xs text-orange-400">{displayTofCount !== undefined ? `${displayTofCount}/4` : '4/4'}</span>
                </div>
                <div className="bg-slate-900/40 p-2 border border-slate-850 rounded">
                  <span className="text-[11.5px] text-slate-400 uppercase block mb-1">TOF Ratio</span>
                  <span className="font-black text-xs text-orange-400">{displayTofCount === 4 && displayTofRatio !== undefined ? `${Math.round(displayTofRatio * 100)}%` : 'N/A'}</span>
                </div>
              </div>
              <div className="bg-slate-900/40 p-2 border border-slate-850 rounded flex justify-between items-center text-[13px]">
                <span className="text-slate-300 uppercase font-black text-[12px]">Block Depth</span>
                <span className="font-black uppercase text-orange-400">
                  {displayTofCount === 0 ? 'Profound (occ. > 95%)' : displayTofCount === 1 ? 'Deep (occ. ~90%)' : displayTofCount <= 3 ? 'Moderate (occ. 75-85%)' : displayTofRatio < 0.90 ? 'Residual (occ. < 75%)' : 'Fully Recovered'}
                </span>
              </div>
              <div className={`p-2 rounded-lg border text-[12.5px] leading-normal flex items-start gap-1.5 ${displayTofCount === 4 && displayTofRatio >= 0.90 ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' : 'bg-red-950/30 border-red-900/40 text-red-400 animate-pulse border-dashed'}`}>
                {displayTofCount === 4 && displayTofRatio >= 0.90 ? (
                  <><span className="font-black uppercase shrink-0">✓ SAFE:</span><span>TOF Ratio ≥ 90%. Neuromuscular transmission adequately restored.{isQualitativeTof && vitals?.tofRatio < 0.90 ? ' ⚠️ Manual assessment may be falsely reassuring.' : ''}</span></>
                ) : (
                  <><span className="font-black uppercase shrink-0 text-red-400">⚠️ RISK:</span><span>Residual blockade present. Do NOT extubate — high risk of post-op respiratory failure.</span></>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════ BIS / CONSCIOUSNESS SECTION ═══════════════════ */}
          {isBis && (
            <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-900 flex flex-col gap-4">

              {/* ── 1. AWARENESS STATUS (hero) ─────────────────────────── */}
              <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: awarenessRisk.bg, border: `1.5px solid ${awarenessRisk.border}`, boxShadow: `0 0 18px ${awarenessRisk.glow}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black uppercase tracking-widest text-slate-400 font-mono">Intraoperative Awareness Risk</span>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${riskClass} ${isAware ? 'animate-pulse' : ''}`}>
                    {isAware ? '🚨 ' : ''}{awarenessRisk.level}
                  </span>
                </div>

                {/* Memory formation rate — the core signal */}
                <div>
                  <div className="flex justify-between items-center text-[12px] mb-1">
                    <span className="text-slate-400 font-mono">
                      {nsMode
                        ? 'Episodic Encoding (Λ) — rate of memory trace formation'
                        : 'Memory Encoding Rate — how actively the brain is recording events'}
                    </span>
                    <span className={`font-black ${encoding > 0.5 ? 'text-red-400' : encoding > 0.2 ? 'text-amber-400' : 'text-emerald-400'}`}>{pct(encoding)}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full rounded-full transition-all duration-300 ${encoding > 0.5 ? 'bg-red-500' : encoding > 0.2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                         style={{ width: `${(encoding || 0) * 100}%` }} />
                  </div>
                  {!nsMode && (
                    <p className="text-[13.5px] text-slate-400 mt-1 leading-tight">
                      {encoding > 0.7 ? '⚠ Patient is actively forming memories. Surgical stimulus during this window can be recalled.' :
                       encoding > 0.3 ? 'Memory formation partially suppressed. Increase anesthetic depth.' :
                       ltpInhibited ? 'Memory consolidation inhibited at the synaptic (hippocampal) level. Anesthesia protective.' :
                       'Memory encoding suppressed. Awareness risk is low at this depth.'}
                    </p>
                  )}
                </div>

                {/* PTSD Risk */}
                {ptsdScore > 0 && (
                  <div>
                    <div className="flex justify-between items-center text-[12px] mb-1">
                      <span className="text-slate-400 font-mono">PTSD Risk — cumulative awareness exposure score</span>
                      <span className={`font-black ${ptsdScore > 60 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>{ptsdScore.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full rounded-full transition-all duration-300 ${ptsdScore > 60 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${ptsdScore}%` }} />
                    </div>
                  </div>
                )}

                {/* Explicit / Implicit recall */}
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="bg-black/20 rounded p-1.5 border border-white/5">
                    <span className="text-slate-300 block">{nsMode ? 'Explicit Recall' : 'Conscious Memory'}</span>
                    <span className={`font-black uppercase ${patient?.hasExplicitRecall ? 'text-red-400' : 'text-slate-500'}`}>
                      {patient?.hasExplicitRecall ? '🚨 Consolidated' : 'None'}
                    </span>
                  </div>
                  <div className="bg-black/20 rounded p-1.5 border border-white/5">
                    <span className="text-slate-300 block">{nsMode ? 'Implicit Priming' : 'Subconscious Priming'}</span>
                    <span className={`font-black uppercase ${patient?.hasImplicitRecall ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {patient?.hasImplicitRecall ? 'Active' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Neural inertia / emergence lag */}
              {patient?.displayEmergenceLag && (
                <div className="bg-orange-950/30 border border-orange-900/40 rounded p-2 text-[13px] text-orange-400 leading-normal animate-pulse">
                  <span className="font-extrabold uppercase block mb-0.5">⚠️ {nsMode ? 'Neural Inertia Active' : 'Delayed Emergence'}</span>
                  {nsMode
                    ? 'Hysteresis emergence lag: neural inertia preventing wakefulness despite cleared agents.'
                    : 'Anesthetic agents have cleared but the brain has not yet "switched on" — a known hysteresis phenomenon especially in prolonged cases, elderly patients, and after high-dose opioids.'}
                </div>
              )}

              {/* ── 2. MEMORY CONSOLIDATION PARAMETERS ─────────────────── */}
              <div className="flex flex-col gap-2 border-t border-slate-900/60 pt-3">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1">
                  <span className="text-[12.5px] font-black uppercase tracking-widest text-slate-400">
                    {nsMode ? 'Memory System Parameters' : 'Memory Consolidation Status'}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {/* Consolidation decay */}
                  <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-slate-850 rounded text-[12.5px]">
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">
                        {nsMode ? 'Consolidation Decay (Ψ)' : 'Memory Persistence Factor'}
                      </span>
                      {!nsMode && <span className="text-slate-400 text-[11px]">How quickly formed memories are consolidated into long-term storage</span>}
                    </div>
                    <span className="text-slate-200 font-black">{(patient?.explicitConsolidation || 0.1).toFixed(2)}</span>
                  </div>
                  {/* Hippocampal LTP */}
                  <div className="flex justify-between items-center p-2 bg-slate-900/40 border border-slate-850 rounded text-[12.5px]">
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">
                        {nsMode ? 'Hippocampal LTP Status' : 'Long-term Memory Formation'}
                      </span>
                      {!nsMode && <span className="text-slate-400 text-[11px]">Synaptic strengthening required to convert short-term to long-term memory</span>}
                    </div>
                    <span className={`font-black uppercase ${ltpInhibited ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {ltpInhibited ? '✓ BLOCKED' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 3. BRAIN AROUSAL NUCLEI ────────────────────────────── */}
              <div className="flex flex-col gap-2 border-t border-slate-900/60 pt-3">
                <div className="text-[12.5px] font-black uppercase tracking-widest text-slate-300 border-b border-slate-900 pb-1">
                  {nsMode ? 'Sleep-Wake Nuclei Activity' : 'Brain Arousal System'}
                </div>
                {!nsMode && (
                  <p className="text-[11px] text-slate-400 leading-tight -mt-1">
                    These brain regions control your patient's level of consciousness. Anesthesia works by suppressing arousal nuclei and activating sleep-promoters (VLPO). Each drug has a specific mechanism.
                  </p>
                )}
                <div className="bg-slate-900/20 border border-slate-850 rounded-lg p-2.5 flex flex-col gap-2">
                  {NUCLEI.map(n => {
                    const val = patient?.[n.key] || 0;
                    const note = n.drugNote(patient, activeMeds);
                    return (
                      <div key={n.key} className="flex items-center gap-2" title={n.mechanism}>
                        <div className="w-[38%] shrink-0">
                          <span className="text-slate-300 text-[12px] uppercase block leading-tight">
                            {nsMode ? n.nsLabel : n.clinLabel.split(' ').slice(0,2).join(' ')}
                          </span>
                          {note && <span className="text-[13.5px] text-cyan-400/70 leading-none">{note}</span>}
                        </div>
                        <div className="flex-1 bg-slate-950 h-3 rounded border border-slate-850 overflow-hidden relative flex items-center">
                          <div className={`h-full ${getNucleusColor(n.key, val)} transition-all duration-300`}
                               style={{ width: `${Math.min(100, val * 100)}%` }} />
                          <span className="absolute right-1.5 text-[11.5px] font-black text-slate-300 leading-none">{val.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!nsMode && (
                  <div className="text-[13.5px] text-slate-400 leading-tight">
                    💡 VLPO↑ = anesthesia working. LC↓ = dexmedetomidine's unique mechanism. Orexin↓ = loss of wake drive (target of suvorexant).
                  </div>
                )}
              </div>

              {/* ── 4. CORTICAL CONNECTIVITIES ─────────────────────────── */}
              <div className="flex flex-col gap-2 border-t border-slate-900/60 pt-3">
                <div className="text-[12.5px] font-black uppercase tracking-widest text-slate-300 border-b border-slate-900 pb-1">
                  {nsMode ? 'Cortical Connectivities' : 'Neural Pathway Integrity (drives BIS)'}
                </div>
                {!nsMode && (
                  <p className="text-[11px] text-slate-400 leading-tight -mt-1">
                    BIS = (Thalamocortical × 40%) + (Frontoparietal × 40%) + (Arousal nuclei × 20%). These are the exact pathways anesthetics disrupt to produce unconsciousness.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {CONNECTIVITIES.map(c => {
                    const val = patient?.[c.key] || 0;
                    return (
                      <div key={c.key} className="bg-slate-900/40 p-2 border border-slate-850 rounded flex flex-col gap-1" title={c.mechanism}>
                        <span className="text-[11px] text-slate-300 uppercase block">
                          {nsMode ? c.nsLabel : c.clinLabel}
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-xs text-slate-200">{pct(val)}</span>
                          <div className="w-14 bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                            <div className={`h-full ${c.color} transition-all duration-300`} style={{ width: `${val * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Offline footers */}
          {!isBis && (
            <div className="bg-slate-950/35 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between gap-3 text-[13px]">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-400 uppercase">EEG / BIS Offline</span>
                <span className="text-slate-300 text-[11.5px]">Attach BIS monitor to track awareness risk, memory formation, and anesthetic depth.</span>
              </div>
              <button onClick={() => { if (toggleBis) toggleBis(); }} className="glass-button glass-button-purple text-[11.5px] font-black uppercase py-1 px-2.5 rounded shrink-0 border border-purple-900/60">Attach BIS</button>
            </div>
          )}
          {!isTof && (
            <div className="bg-slate-950/35 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between gap-3 text-[13px]">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-400 uppercase">TOF Monitor Offline</span>
                <span className="text-slate-300 text-[11.5px]">Attach TOF monitor to visualize neuromuscular twitches and confirm extubation safety.</span>
              </div>
              <button onClick={() => { if (toggleTof) toggleTof(); }} className="glass-button glass-button-purple text-[11.5px] font-black uppercase py-1 px-2.5 rounded shrink-0 border border-purple-900/60">Attach TOF</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
