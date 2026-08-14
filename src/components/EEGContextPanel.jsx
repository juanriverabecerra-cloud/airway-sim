/**
 * EEGContextPanel — Interactive EEG teaching panel
 *
 * Opens when the EEG strip is clicked. Shows:
 *   1. Current patient EEG state (live, driven by BIS/BSR)
 *   2. Clickable guide to all EEG depth states with mini waveform previews
 *   3. Expanded waveform + full clinical explanation when a state is selected
 *
 * The waveform SVGs are pre-computed at module load (deterministic, no Math.random)
 * using display-scaled frequencies that match what the live EEG strip renders.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, GripVertical, Brain } from 'lucide-react';
import { useResizable, ResizeHandle } from './useResizable';

// ─── Pre-compute SVG waveform paths ─────────────────────────────────────────
// These are generated once at module load. Each function models the visual
// character of that EEG state using the same display-scaled frequencies as
// the live CanvasWaveform EEG synthesis.

function makePath(fn, { w = 280, h = 52, dur = 6, steps = 400 } = {}) {
  const cy = h / 2;
  const scale = h / 80;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * dur;
    const x = (i / steps) * w;
    const y = cy + fn(t) * scale;
    pts.push(`${x.toFixed(1)},${Math.max(2, Math.min(h - 2, y)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}

const TAU = 2 * Math.PI;

const EEG_PATHS = {
  // AWAKE: fast, low-amplitude, dense irregular oscillations
  awake: makePath(t =>
    Math.sin(t * TAU * 5.5) * 5 +
    Math.sin(t * TAU * 7.3) * 3.5 +
    Math.sin(t * TAU * 4.1) * 4 +
    Math.sin(t * TAU * 9.2) * 2.5 +
    Math.sin(t * TAU * 6.7) * 3),

  // ALPHA SPINDLES: waxing-waning medium-frequency enveloped bursts
  alpha: makePath(t => {
    const env1 = Math.max(0, Math.sin(t * TAU * 0.4));
    const env2 = Math.max(0, Math.sin(t * TAU * 0.35 + 2.1));
    return Math.sin(t * TAU * 2.2) * 22 * env1 +
           Math.sin(t * TAU * 1.9) * 14 * env2 +
           Math.sin(t * TAU * 5.1) * 3 * (1 - env1);
  }),

  // THETA: medium-slow, transitional
  theta: makePath(t =>
    Math.sin(t * TAU * 1.1) * 22 +
    Math.cos(t * TAU * 0.9) * 13 +
    Math.sin(t * TAU * 1.6) * 8 +
    Math.sin(t * TAU * 2.8) * 4),

  // DELTA: large, slow sweeping waves — the hallmark of surgical anesthesia
  delta: makePath(t =>
    Math.sin(t * TAU * 0.35) * 32 +
    Math.cos(t * TAU * 0.22) * 18 +
    Math.sin(t * TAU * 0.55) * 12 +
    Math.sin(t * TAU * 0.15) * 8),

  // BURST SUPPRESSION: flat suppressed segments interrupted by high bursts
  burst: makePath(t => {
    const cycleDur = 2.2;
    const phase = t % cycleDur;
    const isBurst = phase > 1.35 && phase < 2.05;
    if (isBurst) {
      return Math.sin(t * TAU * 1.5) * 34 +
             Math.sin(t * TAU * 0.9) * 20 +
             Math.sin(t * TAU * 2.4) * 12;
    }
    // Suppression: near-flat (tiny residual activity)
    return Math.sin(t * TAU * 8.0) * 1.8;
  }),

  // ISOELECTRIC: essentially flat, no meaningful electrical activity
  isoelectric: makePath(t => Math.sin(t * TAU * 11) * 1.5),
};

// ─── EEG state definitions ───────────────────────────────────────────────────
const EEG_STATES = [
  {
    id:        'awake',
    label:     'AWAKE',
    subtitle:  'Alert Consciousness',
    bisRange:  'BIS 85-100',
    color:     '#22d3ee',
    mechanism: 'Thalamocortical relay intact → frontal cortex receives unfiltered sensory stream. Locus coeruleus (NE) + TMN (histamine) + Orexin all firing → global cortical desynchronization → fast, low-amplitude, irregular EEG.',
    character: 'Fast (β/γ: 13-30+ Hz), low amplitude, irregular, dense. On the monitor: appears as fine tremor.',
    clinical:  'SEF95 ≈ 25-30 Hz. No anesthetic effect. BIS 95-98 = fully awake. BIS 85 = light sedation onset.',
    drugs:     'No significant anesthetic effect. Caffeine/stimulants can increase power. Dexmedetomidine paradoxically maintains arousable state despite ↓LC firing.',
    note:      null,
  },
  {
    id:        'alpha',
    label:     'ALPHA SPINDLES',
    subtitle:  'Light Sedation',
    bisRange:  'BIS 70-85',
    color:     '#a78bfa',
    mechanism: 'Propofol blocks thalamocortical relay → thalamus generates intrinsic 8-13 Hz alpha spindles that reach frontal cortex. Classic "propofol alpha paradox": alpha power INCREASES during induction (opposite of natural sleep). Also seen with volatile agents at sub-anesthetic doses.',
    character: 'Medium frequency (α: 8-13 Hz), waxing-waning amplitude envelopes (spindles). On the monitor: regular grouped oscillations appearing and fading.',
    clinical:  'SEF95 ≈ 15-20 Hz. Patient may be sedated but arousable. Key awareness risk zone. Not yet unconscious.',
    drugs:     'Propofol (primary), volatile anesthetics (sevo/des/iso at 0.5-1 MAC), benzodiazepines.',
    note:      '⚠ The "alpha paradox" — increased alpha = deeper, not lighter. This is counter-intuitive and confuses trainees who expect less activity = more depth.',
  },
  {
    id:        'theta',
    label:     'THETA / MODERATE',
    subtitle:  'Moderate Depth',
    bisRange:  'BIS 55-70',
    color:     '#818cf8',
    mechanism: 'Further GABA-A potentiation → thalamocortical relay progressively more suppressed. Alpha gives way to slower theta (4-7 Hz) as cortical integration begins to fail. Patient crosses the threshold of unconsciousness in this range.',
    character: 'Medium-slow (θ: 4-7 Hz), increasing amplitude. Slower, more organized waves replacing the dense alpha activity.',
    clinical:  'SEF95 ≈ 10-15 Hz. Unconscious but not at surgical depth. LOC typically occurs around BIS 65-70.',
    drugs:     'Propofol (moderate infusion rate), volatile agents at 0.7-1 MAC, high-dose dexmedetomidine, ketamine (uniquely preserves frontal connectivity even at this depth).',
    note:      null,
  },
  {
    id:        'delta',
    label:     'DELTA WAVES',
    subtitle:  'Surgical Anesthesia',
    bisRange:  'BIS 40-60',
    color:     '#60a5fa',
    mechanism: 'Deep GABA-A receptor activation → thalamus enters slow oscillation mode (0.5-2 Hz delta). Cortical neurons cycle between "up states" (brief firing bursts) and "down states" (silence). This generates the large slow waves. Frontoparietal connectivity collapses — the neural substrate of consciousness.',
    character: 'Slow (δ: 0.5-2 Hz), high amplitude, sweeping. On the monitor: large slow waves traverse the entire screen. Very different visual character from awake state.',
    clinical:  'SEF95 ≈ 8-12 Hz. Standard surgical anesthesia target. BIS 40-60. Patient cannot perceive or respond. Nociception still present (spinal cord, not brain).',
    drugs:     'Propofol (standard maintenance doses), volatile anesthetics at 1-1.5 MAC.',
    note:      '💡 KEY TEACHING: Delta waves are not just "slower BIS" — they represent a fundamental state change in thalamocortical dynamics. The large amplitude reflects synchronous neuronal up/down cycling, not just suppression.',
  },
  {
    id:        'burst',
    label:     'BURST SUPPRESSION',
    subtitle:  'Very Deep Anesthesia',
    bisRange:  'BIS < 40, BSR > 0',
    color:     '#fbbf24',
    mechanism: 'Extreme GABA-A potentiation → periods of complete electrical silence (suppression) interrupted by brief synchronized discharges (bursts). The brain oscillates between neuronal exhaustion and brief recovery. BSR measures % of time in suppression. This pattern indicates very deep anesthesia beyond what is needed for surgery.',
    character: 'FLAT suppression periods alternating with high-amplitude, polymorphic burst clusters. Unmistakable on the strip — nothing else looks like this.',
    clinical:  'BSR > 0. Used INTENTIONALLY for: neuroprotection after cardiac arrest, treatment of refractory status epilepticus (thiopental/propofol coma), severe TBI. Intraoperatively: usually overdose — not a target for routine surgery. ↑ POCD risk.',
    drugs:     'High-dose propofol (> 5 mcg/mL), barbiturates (thiopental, phenobarbital), isoflurane > 2 MAC, hypothermia (worsens burst suppression at normal anesthetic doses).',
    note:      '⚠ Do NOT confuse with artifact. Burst suppression is symmetric, stereotyped, and correlates with deep BIS. Random movement artifact has irregular non-repeating character.',
  },
  {
    id:        'isoelectric',
    label:     'ISOELECTRIC',
    subtitle:  'Near-Flat / No Activity',
    bisRange:  'BIS < 3',
    color:     '#f87171',
    mechanism: 'Complete suppression of cerebral electrical activity. All synaptic transmission halted. Causes: profound anesthetic overdose, cardiac arrest (global ischemia), severe hypothermia (< 20°C), or brain death. The brain is consuming essentially no energy.',
    character: 'Near-flat line. Minimal electrical noise. No organized activity whatsoever.',
    clinical:  'BIS reads 0-3. SEF95 undefined or 0. Intentional isoelectric EEG is used: during hypothermic circulatory arrest (cardiac surgery), for maximum cerebral protection during aneurysm clipping ("brain protection cocktail").',
    drugs:     'Massive overdose of any anesthetic agent. Also: cardiac arrest (global cerebral ischemia), profound hypothermia, barbiturate coma (pentobarbital for refractory ICP).',
    note:      '⚠ Isoelectric ≠ brain death. Drug-induced isoelectric EEG is reversible when the agent is cleared. Brain death requires specific confirmatory testing beyond EEG alone.',
  },
];

// ─── Main panel ───────────────────────────────────────────────────────────────
export const EEGContextPanel = ({ patient, vitals, activeMeds, anchorRect, onClose }) => {
  const panelRef  = useRef(null);
  const dragRef   = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const [position, setPosition]   = useState({ left: 0, top: 0 });
  const [dragging, setDragging]   = useState(false);
  const [tab,      setTab]        = useState('guide');      // 'current' | 'guide'
  const [selected, setSelected]   = useState(null);         // selected state id
  const { size, isResizing, onResizeStart } = useResizable({ width: 380, height: 440, minWidth: 320, minHeight: 200 });

  // Position near anchor on open
  useEffect(() => {
    if (!anchorRect || !panelRef.current) return;
    const pw = panelRef.current.offsetWidth  || 380;
    const ph = panelRef.current.offsetHeight || 520;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchorRect.right + 8;
    let top  = anchorRect.top;
    if (left + pw > vw - 12) left = anchorRect.left - pw - 8;
    if (top + ph > vh - 12) top = vh - ph - 12;
    if (top < 8) top = 8;
    if (left < 8) left = 8;
    setPosition({ left, top });
  }, [anchorRect]);

  // Drag
  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: position.left, oy: position.top };
    setDragging(true);
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const pw = panelRef.current?.offsetWidth  || 380;
      const ph = panelRef.current?.offsetHeight || 520;
      setPosition({
        left: Math.max(0, Math.min(vw - pw - 4, dragRef.current.ox + (e.clientX - dragRef.current.startX))),
        top:  Math.max(0, Math.min(vh - ph - 4, dragRef.current.oy + (e.clientY - dragRef.current.startY))),
      });
    };
    const onUp = () => { dragRef.current.active = false; setDragging(false); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // Click-outside
  useEffect(() => {
    const handler = (e) => {
      if (dragRef.current.active) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Live EEG state from patient
  const bis = vitals?.bis || 98;
  const bsr = vitals?.bsr || 0;
  const sef = vitals?.sef95 || 30;
  const isArrest = patient?.isArrest || false;

  const currentStateId = isArrest || bis < 3  ? 'isoelectric'
    : bsr > 0    ? 'burst'
    : bis <= 40  ? 'delta'        // deep
    : bis <= 55  ? 'delta'        // surgical depth
    : bis <= 70  ? 'theta'
    : bis <= 85  ? 'alpha'
    :               'awake';

  const currentState = EEG_STATES.find(s => s.id === currentStateId) || EEG_STATES[0];
  const selectedState = selected ? EEG_STATES.find(s => s.id === selected) : null;

  // Active drugs affecting EEG
  const eegDrugs = (activeMeds || []).filter(m => {
    const n = m.name;
    return m.Ce > 0.01 && ['Propofol','Midazolam','Ketamine','Sevoflurane','Isoflurane','Desflurane','Dexmedetomidine','Thiopental','Etomidate'].includes(n);
  }).map(m => `${m.name} (Ce ${m.Ce.toFixed(2)})`);

  const BORDER = 'rgba(168,85,247,0.25)';

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)}
      className="flex-1 text-[10px] font-bold font-mono uppercase tracking-wider py-1.5 transition-colors"
      style={{
        background: tab === id ? 'rgba(168,85,247,0.14)' : 'transparent',
        color:      tab === id ? '#d8b4fe' : 'rgba(100,116,139,0.8)',
        borderBottom: tab === id ? '1.5px solid #a855f7' : '1.5px solid transparent',
      }}>
      {label}
    </button>
  );

  return (
    <div ref={panelRef} className="fixed z-[210] select-none"
         style={{ left: position.left, top: position.top, width: size.width }}>
      <div className="rounded-xl overflow-hidden shadow-2xl"
           style={{ background: 'linear-gradient(160deg,rgba(2,6,22,0.99) 0%,rgba(5,10,35,0.97) 100%)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(20px)' }}>

        {/* ── HEADER (drag handle) ── */}
        <div onMouseDown={onDragStart}
             className="flex items-center justify-between px-3 py-2.5"
             style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(168,85,247,0.04)', cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}>
          <div className="flex items-center gap-2">
            <GripVertical size={12} className="text-slate-700 rotate-90" />
            <Brain size={13} className="text-purple-400" />
            <div>
              <p className="text-[11px] font-black text-slate-100 font-mono tracking-wide">EEG / Processed EEG (BIS)</p>
              <p className="text-[8.5px] text-slate-500 font-mono">Electroencephalogram · Anesthetic Depth Monitoring</p>
            </div>
          </div>
          <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors"><X size={13} /></button>
        </div>

        {/* ── CURRENT STATE RIBBON ── */}
        <div className="px-3 py-2 flex items-center justify-between"
             style={{ background: currentState.color + '12', borderBottom: `1px solid ${currentState.color}25` }}>
          <div>
            <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider block">Current Patient EEG State</span>
            <span className="text-[13px] font-black font-mono" style={{ color: currentState.color }}>{currentState.label}</span>
            <span className="text-[10px] text-slate-400 font-mono ml-2">{currentState.subtitle}</span>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono text-slate-400">BIS <span className="font-black" style={{ color: currentState.color }}>{bis}</span> · SEF95 <span className="font-black text-slate-200">{sef} Hz</span></div>
            <div className="text-[9px] font-mono text-slate-400">BSR <span className={`font-black ${bsr > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{bsr}%</span></div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          <TabBtn id="guide"   label="EEG State Guide" />
          <TabBtn id="current" label="Current Interpretation" />
        </div>

        {/* ── CONTENT ── */}
        <div className="overflow-y-auto" style={{ maxHeight: size.height, overflowX: 'hidden', pointerEvents: isResizing ? 'none' : 'auto' }}>

          {/* ═══ EEG GUIDE TAB ═══════════════════════════════════════════ */}
          {tab === 'guide' && !selectedState && (
            <div className="p-3 space-y-1.5">
              <p className="text-[9px] text-slate-500 font-mono leading-relaxed mb-2">
                Click any state below to see the characteristic waveform and full clinical explanation.
                States are ordered from awake → deepest suppression.
              </p>
              {EEG_STATES.map(state => (
                <button key={state.id}
                  onClick={() => setSelected(state.id)}
                  className="w-full text-left rounded-lg overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: state.color + '0c', border: `1px solid ${state.color}30` }}>
                  {/* State header */}
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: state.color, boxShadow: `0 0 6px ${state.color}` }} />
                      <span className="text-[10px] font-black font-mono" style={{ color: state.color }}>{state.label}</span>
                      <span className="text-[8.5px] text-slate-500 font-mono">{state.subtitle}</span>
                    </div>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: state.color + '18', color: state.color }}>{state.bisRange}</span>
                  </div>
                  {/* Mini waveform preview */}
                  <div className="px-2 pb-1.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <svg viewBox={`0 0 280 52`} width="100%" height="44" preserveAspectRatio="none"
                         style={{ display: 'block' }}>
                      {/* Baseline */}
                      <line x1="0" y1="26" x2="280" y2="26" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      {/* Waveform */}
                      <path d={EEG_PATHS[state.id]} fill="none" stroke={state.color} strokeWidth="1.2"
                            strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
                    </svg>
                  </div>
                  {/* One-line character */}
                  <div className="px-3 pb-1.5">
                    <p className="text-[8.5px] text-slate-500 font-mono leading-tight">{state.character}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ═══ SELECTED STATE (expanded) ══════════════════════════════ */}
          {tab === 'guide' && selectedState && (
            <div className="p-3 space-y-3">
              <button onClick={() => setSelected(null)}
                className="text-[9px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
                ← All States
              </button>

              {/* State header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedState.color, boxShadow: `0 0 8px ${selectedState.color}` }} />
                  <span className="text-[14px] font-black font-mono" style={{ color: selectedState.color }}>{selectedState.label}</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded"
                      style={{ background: selectedState.color + '18', color: selectedState.color, border: `1px solid ${selectedState.color}35` }}>
                  {selectedState.bisRange}
                </span>
              </div>

              {/* Full waveform example */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${selectedState.color}25` }}>
                <div className="px-2 pt-1.5 pb-0.5 flex justify-between items-center">
                  <span className="text-[8px] font-bold font-mono uppercase tracking-wider" style={{ color: selectedState.color + 'aa' }}>Waveform Example</span>
                  <span className="text-[7.5px] text-slate-600 font-mono">Display-scaled · not literal Hz</span>
                </div>
                <svg viewBox="0 0 280 65" width="100%" height="65" preserveAspectRatio="none"
                     style={{ display: 'block' }}>
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75].map(frac => (
                    <line key={frac} x1="0" y1={65 * frac} x2="280" y2={65 * frac}
                          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="3,3" />
                  ))}
                  <line x1="0" y1="32.5" x2="280" y2="32.5" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
                  {/* Waveform — recomputed at h=65 */}
                  <path d={makePath(
                    selectedState.id === 'awake'        ? t => Math.sin(t*TAU*5.5)*5+Math.sin(t*TAU*7.3)*3.5+Math.sin(t*TAU*4.1)*4+Math.sin(t*TAU*9.2)*2.5+Math.sin(t*TAU*6.7)*3
                    : selectedState.id === 'alpha'       ? t => { const e1=Math.max(0,Math.sin(t*TAU*0.4)); const e2=Math.max(0,Math.sin(t*TAU*0.35+2.1)); return Math.sin(t*TAU*2.2)*22*e1+Math.sin(t*TAU*1.9)*14*e2+Math.sin(t*TAU*5.1)*3*(1-e1); }
                    : selectedState.id === 'theta'       ? t => Math.sin(t*TAU*1.1)*22+Math.cos(t*TAU*0.9)*13+Math.sin(t*TAU*1.6)*8+Math.sin(t*TAU*2.8)*4
                    : selectedState.id === 'delta'       ? t => Math.sin(t*TAU*0.35)*32+Math.cos(t*TAU*0.22)*18+Math.sin(t*TAU*0.55)*12+Math.sin(t*TAU*0.15)*8
                    : selectedState.id === 'burst'       ? t => { const p=t%2.2; const b=p>1.35&&p<2.05; return b?(Math.sin(t*TAU*1.5)*34+Math.sin(t*TAU*0.9)*20+Math.sin(t*TAU*2.4)*12):Math.sin(t*TAU*8)*1.8; }
                    :                                      t => Math.sin(t*TAU*11)*1.5, // isoelectric
                    { w: 280, h: 65, dur: 7, steps: 500 }
                  )} fill="none" stroke={selectedState.color} strokeWidth="1.5"
                     strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
                </svg>
              </div>

              {/* Clinical detail sections */}
              {[
                { title: 'What this looks like', body: selectedState.character },
                { title: 'Mechanism',           body: selectedState.mechanism },
                { title: 'Clinical significance', body: selectedState.clinical },
                { title: 'Which drugs produce this', body: selectedState.drugs },
              ].map(s => (
                <div key={s.title} className="rounded-lg p-2.5 space-y-1"
                     style={{ background: selectedState.color + '08', border: `1px solid ${selectedState.color}18` }}>
                  <p className="text-[8px] font-black uppercase tracking-wider font-mono" style={{ color: selectedState.color + 'aa' }}>{s.title}</p>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">{s.body}</p>
                </div>
              ))}

              {selectedState.note && (
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <p className="text-[10px] text-amber-200 font-mono leading-relaxed">{selectedState.note}</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ CURRENT INTERPRETATION TAB ════════════════════════════ */}
          {tab === 'current' && (
            <div className="p-3 space-y-3">
              {/* Current waveform preview */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${currentState.color}25` }}>
                <div className="px-2 pt-1.5 pb-0.5 flex justify-between items-center">
                  <span className="text-[8px] font-bold font-mono uppercase tracking-wider" style={{ color: currentState.color + 'aa' }}>Current EEG Character</span>
                  <span className="text-[8px] font-black font-mono" style={{ color: currentState.color }}>{currentState.label}</span>
                </div>
                <svg viewBox="0 0 280 55" width="100%" height="55" preserveAspectRatio="none" style={{ display: 'block' }}>
                  <line x1="0" y1="27.5" x2="280" y2="27.5" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  <path d={EEG_PATHS[currentStateId] || EEG_PATHS.awake}
                        fill="none" stroke={currentState.color} strokeWidth="1.4"
                        strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
                </svg>
              </div>

              {/* Vitals grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'BIS',   value: bis,         color: bis < 40 ? '#60a5fa' : bis < 60 ? '#818cf8' : bis < 80 ? '#a78bfa' : '#22d3ee', unit: '' },
                  { label: 'SEF95', value: `${sef} Hz`, color: '#d8b4fe', unit: '' },
                  { label: 'BSR',   value: `${bsr}%`,   color: bsr > 0 ? '#fbbf24' : '#64748b', unit: '' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[8px] text-slate-500 font-mono uppercase">{m.label}</p>
                    <p className="text-[14px] font-black font-mono" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Active drugs */}
              {eegDrugs.length > 0 && (
                <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <p className="text-[8px] font-black uppercase tracking-wider font-mono text-purple-400/70">EEG-Active Drugs</p>
                  {eegDrugs.map(d => (
                    <p key={d} className="text-[9.5px] font-mono text-slate-300">• {d}</p>
                  ))}
                </div>
              )}

              {/* State interpretation */}
              {[
                { title: 'What the EEG shows', body: currentState.character },
                { title: 'Clinical meaning',   body: currentState.clinical },
              ].map(s => (
                <div key={s.title} className="rounded-lg p-2.5 space-y-1"
                     style={{ background: currentState.color + '08', border: `1px solid ${currentState.color}18` }}>
                  <p className="text-[8px] font-black uppercase tracking-wider font-mono" style={{ color: currentState.color + 'aa' }}>{s.title}</p>
                  <p className="text-[10px] text-slate-300 font-mono leading-relaxed">{s.body}</p>
                </div>
              ))}

              {/* What is BIS — brief explainer */}
              <div className="rounded-lg p-2.5 space-y-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[8px] font-black uppercase tracking-wider font-mono text-slate-500">How BIS Is Computed From Raw EEG</p>
                <p className="text-[9.5px] text-slate-400 font-mono leading-relaxed">
                  BIS (Bispectral Index) is a proprietary algorithm that computes four sub-parameters from the raw EEG:
                  <br/>• <span className="text-slate-200">SynchFastSlow</span> — ratio of high-frequency to low-frequency synchrony
                  <br/>• <span className="text-slate-200">SEF95</span> — frequency below which 95% of EEG power lies
                  <br/>• <span className="text-slate-200">BSR</span> — burst suppression ratio (% isoelectric)
                  <br/>• <span className="text-slate-200">QUAZI</span> — near-suppression detection
                  <br/>These are combined into a single 0-100 index. 100 = fully awake, 0 = isoelectric.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <ResizeHandle onResizeStart={onResizeStart} color="rgba(168,85,247,0.6)" />
    </div>
  );
};
