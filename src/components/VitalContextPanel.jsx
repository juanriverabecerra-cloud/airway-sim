/**
 * VitalContextPanel — Context-sensitive floating panel for vital signs
 *
 * Click any vital box on any monitor → this panel appears showing:
 *   1. What's driving the current value (live dynamic analysis)
 *   2. Quick one-click actions (meds, vent adjustments, interventions)
 *   3. Clinical context and a pearl
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, Info, ChevronRight, GripVertical } from 'lucide-react';
import { VITAL_CONFIG } from '../engine/vitalContextConfig';
import { useResizable, ResizeHandle } from './useResizable';

// Status → color mapping
const STATUS_COLORS = {
  ok:       { dot: '#22d3ee', text: 'text-slate-300' },
  warn:     { dot: '#fbbf24', text: 'text-amber-300' },
  critical: { dot: '#f87171', text: 'text-red-300' },
};

// Category → badge style
const CAT_STYLES = {
  med:     { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', text: '#a5b4fc', label: 'MED' },
  vent:    { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.30)',  text: '#86efac', label: 'VENT' },
  gas:     { bg: 'rgba(14,165,233,0.10)', border: 'rgba(14,165,233,0.30)', text: '#7dd3fc', label: 'GAS' },
  monitor: { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.30)', text: '#d8b4fe', label: 'MONITOR' },
  other:   { bg: 'rgba(100,116,139,0.10)',border: 'rgba(100,116,139,0.30)',text: '#cbd5e1', label: 'ACTION' },
};

// Accent border per vital color
const VITAL_BORDERS = {
  green:  'rgba(52,211,153,0.35)',
  cyan:   'rgba(34,211,238,0.35)',
  red:    'rgba(248,113,113,0.35)',
  yellow: 'rgba(251,191,36,0.35)',
  blue:   'rgba(96,165,250,0.35)',
  purple: 'rgba(167,139,250,0.35)',
  orange: 'rgba(251,146,60,0.35)',
  white:  'rgba(226,232,240,0.20)',
};

export const VitalContextPanel = ({
  vitalId,
  anchorRect,   // DOMRect from getBoundingClientRect() of the clicked element
  onClose,
  // All live state
  vitals,
  patient,
  activeMeds,
  gasSettings,
  ventSettings,
  electrolytes,
  // Action callbacks
  onProcessMed,   // processMed(medId, dose, route, type, unit) — real drug administration
  onSetVent,
  onSetGas,
  onSetPatient,
  onSetO2,        // handleSetO2(id, flow, fio2) — O2 device for non-intubated patients
  onLogEvent,
}) => {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState('drivers'); // 'drivers' | 'actions' | 'info'
  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const { size, isResizing, onResizeStart } = useResizable({ width: 296, height: 320, minWidth: 240, minHeight: 160 });

  const config = VITAL_CONFIG[vitalId];

  // Click-outside to close — skip if currently dragging
  useEffect(() => {
    const handler = (e) => {
      if (dragRef.current.active) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position the panel intelligently near the anchor (only on first open)
  useEffect(() => {
    if (!anchorRect || !panelRef.current) return;
    const panel = panelRef.current;
    const pw = panel.offsetWidth  || 300;
    const ph = panel.offsetHeight || 400;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchorRect.right + 8;
    let top  = anchorRect.top;

    if (left + pw > vw - 12) left = anchorRect.left - pw - 8;
    if (top + ph > vh - 12) top = vh - ph - 12;
    if (top < 8) top = 8;
    if (left < 8) left = 8;

    setPosition({ left, top });
  }, [anchorRect, vitalId]);

  // Drag: document-level mouse handlers so fast movement doesn't lose the panel
  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: position.left, oy: position.top };
    setDragging(true);
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pw = panelRef.current?.offsetWidth  || 300;
      const ph = panelRef.current?.offsetHeight || 400;
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

  if (!config) return null;

  // MAC panel is only meaningful when a volatile anesthetic can actually be delivered
  if (vitalId === 'mac' && !patient?.airwaySecured) {
    // Use computed position (updated by drag) or fall back to anchor-based initial position
    const macLeft = position.left || Math.min(window.innerWidth - 280, (anchorRect?.right ?? 200) + 8);
    const macTop  = position.top  || Math.max(8, Math.min(window.innerHeight - 160, anchorRect?.top ?? 200));
    return (
      <div ref={panelRef} className="fixed z-[200]" style={{ left: macLeft, top: macTop, width: 260 }}>
        <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(160deg,rgba(2,8,23,0.99) 0%,rgba(4,14,36,0.97) 100%)', border: '1px solid rgba(20,184,166,0.3)', backdropFilter: 'blur(20px)' }}>
          <div onMouseDown={onDragStart}
               className="flex items-center justify-between px-3 py-2.5"
               style={{ borderBottom: '1px solid rgba(20,184,166,0.15)', cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}>
            <div className="flex items-center gap-1.5">
              <GripVertical size={11} className="text-slate-700 rotate-90" />
              <div>
                <p className="text-[11px] font-black text-slate-200 font-mono">MAC — No Volatile Delivery</p>
                <p className="text-[8px] text-slate-500 font-mono mt-0.5">Airway must be secured first</p>
              </div>
            </div>
            <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors"><X size={13} /></button>
          </div>
          <div className="px-3 py-3 space-y-2">
            <p className="text-[9px] text-slate-400 font-mono leading-relaxed">Volatile anesthetics require a secured airway (ETT or LMA) for delivery. MAC is only measurable when inhaled agents are being administered via the breathing circuit.</p>
            <p className="text-[8.5px] text-teal-400/70 font-mono">Secure the airway first, then titrate the volatile agent dial on the anesthesia machine.</p>
          </div>
        </div>
      </div>
    );
  }

  const ctx = { vitals, patient, activeMeds: activeMeds || [], gasSettings, ventSettings, electrolytes };

  // Wrap config calls in try-catch — a misconfigured or partially-initialized state
  // in any engine should not crash the entire monitor panel.
  let drivers = [];
  let pearl = '';
  let actions = [];
  try { drivers = config.getDrivers ? config.getDrivers(ctx) : []; } catch (e) { console.error('VitalContextPanel drivers error:', e); }
  try { pearl   = config.getClinicalPearl ? config.getClinicalPearl(ctx) : ''; } catch (e) { /* silent */ }

  const callbacks = {
    processMed: onProcessMed,
    setVent:    onSetVent,
    setGas:     onSetGas,
    setPatient: onSetPatient,
    setO2:      onSetO2,
    logEvent:   onLogEvent,
  };
  try { actions = config.getActions ? config.getActions(ctx, callbacks) : []; } catch (e) { console.error('VitalContextPanel actions error:', e); }

  const urgentActions = actions.filter(a => a.urgent);
  const normalActions = actions.filter(a => !a.urgent);

  const borderColor = VITAL_BORDERS[config.color] || VITAL_BORDERS.white;

  // Get the current value to display in the header
  const currentValue = (() => {
    try {
      switch (vitalId) {
        case 'hr':    return `${vitals?.hr ?? '--'} bpm`;
        case 'spo2':  return `${vitals?.spo2 ?? '--'}%`;
        case 'map':   return `${Math.round(vitals?.map || 0)} mmHg`;
        case 'bp':    return patient?.hasALine ? `${vitals?.sys ?? '--'}/${vitals?.dia ?? '--'} mmHg` : `${0}/${0}`;
        case 'ppv':   { const tvPerKg=(vitals?.vte||0)/(patient?.weight||70); const isMech=patient?.ventilationStatus==='mechanical'||(ventSettings?.mode&&ventSettings?.mode!=='spontaneous'); const isValid=patient?.cardiacRhythm==='normal'&&isMech&&tvPerKg>=7&&(vitals?.hr||70)/(vitals?.rr||12)>=4; return isValid ? `${Math.max(3,Math.min(45,Math.round(8+((patient?.ebl||0)/(patient?.ebv||5000))*50)))}%` : 'INVALID'; }
        case 'cmap':  return `${Math.round(vitals?.cmap || vitals?.map || 0)} mmHg`;
        case 'etco2': return `${vitals?.etco2 ?? '--'} mmHg`;
        case 'temp':  return `${(vitals?.temp || 37).toFixed(1)}°C`;
        case 'bis':   return patient?.hasBisMonitor ? `${vitals?.bis ?? '--'}` : 'No Monitor';
        case 'tof':   return patient?.hasTofMonitor ? `${vitals?.tofCount ?? 4}/4` : 'No Monitor';
        case 'cvp':   return `${Math.round(vitals?.cvp || 0)} mmHg`;
        case 'rr':    return `${vitals?.rr ?? '--'} /min`;
        case 'pip':   return `${Math.round(vitals?.pip || 0)} cmH2O`;
        case 'peep':  return `${ventSettings?.peep || 0} cmH2O`;
        case 'vte':   return `${Math.round(vitals?.vte || 0)} mL`;
        case 'cdyn':  return `${Math.round(vitals?.compl || 60)} mL/cmH2O`;
        case 'raw':   return `${Math.round(vitals?.res || 5)} cmH2O/L/s`;
        case 'mv':    return `${(vitals?.mv || 0).toFixed(1)} L/min`;
        case 'mac':     return `${(vitals?.mac || 0).toFixed(2)} MAC`;
        case 'plat':    return `${Math.round(vitals?.pplat || 0)} cmH2O`;
        case 'shunt':   return vitals?.shunt !== undefined ? `${(vitals.shunt * 100).toFixed(1)}%` : '--';
        case 'ieratio':    return `1 : ${ventSettings?.ieRatio || 2}`;
        // ── Renal panel vitals ──────────────────────────────────────────
        case 'uop':        { const rPerKg=((patient?.urineOutputRate||0)/(patient?.weight||70)); return `${rPerKg.toFixed(2)} mL/kg/hr`; }
        case 'egfr':       return `${Math.round(patient?.gfr || 125)} mL/min`;
        case 'creatinine': return `${(patient?.creatinine||0.85).toFixed(2)} / ${Math.round(patient?.bun||12)}`;
        case 'fena':       return `${(patient?.feNa||1.0).toFixed(2)}%`;
        case 'uosm':       return `${Math.round(patient?.urineOsmolality||350)} mOsm`;
        case 'sosm':       return `${Math.round(patient?.osm||285)} mOsm`;
        default:           return '--';
      }
    } catch { return '--'; }
  })();

  return (
    <div
      ref={panelRef}
      className="fixed z-[200] select-none"
      style={{ left: position.left, top: position.top, width: size.width }}
    >
      <div
        className="rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, rgba(2,8,23,0.99) 0%, rgba(4,14,36,0.97) 100%)',
          border: `1px solid ${borderColor}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* ── HEADER (drag handle) ── */}
        <div
          onMouseDown={onDragStart}
          className="flex items-center justify-between px-3 py-2.5"
          style={{
            borderBottom: `1px solid ${borderColor}`,
            background: 'rgba(255,255,255,0.02)',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Grip indicator */}
            <GripVertical size={12} className="text-slate-700 shrink-0 rotate-90" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider font-mono text-slate-300">
                  {config.label}
                </span>
                <span className="text-[14px] font-black font-mono" style={{ color: borderColor.replace('0.35', '0.9') }}>
                  {currentValue}
                </span>
              </div>
              <p className="text-[8.5px] text-slate-400 font-mono leading-none mt-0.5">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7.5px] text-slate-600 font-mono">{config.normal}</span>
            <button
              onMouseDown={e => e.stopPropagation()} // don't start drag on close button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-300 transition-colors ml-1"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { id: 'drivers', label: `Drivers (${drivers.length})` },
            { id: 'actions', label: `Actions (${actions.length})` },
            { id: 'info',    label: 'Context' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 text-[8.5px] font-bold font-mono uppercase tracking-wider py-1.5 transition-colors"
              style={{
                background: tab === t.id ? borderColor.replace('0.35', '0.12') : 'transparent',
                color: tab === t.id ? borderColor.replace('0.35', '0.9') : 'rgba(100,116,139,0.8)',
                borderBottom: tab === t.id ? `1.5px solid ${borderColor.replace('0.35','0.7')}` : '1.5px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div className="overflow-y-auto" style={{ maxHeight: size.height, overflowX: 'hidden', pointerEvents: isResizing ? 'none' : 'auto' }}>

          {/* DRIVERS TAB */}
          {tab === 'drivers' && (
            <div className="p-2.5 space-y-1">
              {drivers.length === 0 && (
                <p className="text-[9px] text-slate-600 font-mono text-center py-4">No driver data available</p>
              )}
              {drivers.map((d, i) => {
                const sc = STATUS_COLORS[d.status] || STATUS_COLORS.ok;
                return (
                  <div key={i} className="flex items-start justify-between gap-2 py-1 px-1.5 rounded"
                    style={{ background: d.status === 'critical' ? 'rgba(248,113,113,0.06)' : d.status === 'warn' ? 'rgba(251,191,36,0.04)' : 'transparent' }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                           style={{ background: sc.dot, boxShadow: d.status !== 'ok' ? `0 0 4px ${sc.dot}` : 'none' }} />
                      <span className="text-[9px] font-bold font-mono text-slate-400 truncate">{d.label}</span>
                    </div>
                    <span className={`text-[9px] font-black font-mono shrink-0 text-right ${sc.text}`}
                          style={{ maxWidth: 140, wordBreak: 'break-word' }}>{d.value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ACTIONS TAB */}
          {tab === 'actions' && (
            <div className="p-2.5 space-y-1.5">
              {actions.length === 0 && (
                <p className="text-[9px] text-slate-600 font-mono text-center py-4">No actions available</p>
              )}

              {/* Urgent actions first */}
              {urgentActions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[7px] font-black uppercase tracking-widest text-red-400/70 font-mono px-0.5">⚠ Urgent</p>
                  {urgentActions.map((a, i) => (
                    <ActionButton key={`u-${i}`} action={a} onClose={onClose} />
                  ))}
                </div>
              )}

              {/* Normal actions */}
              {normalActions.length > 0 && (
                <div className="space-y-1">
                  {urgentActions.length > 0 && <div className="border-t my-1" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                  {normalActions.map((a, i) => (
                    <ActionButton key={`n-${i}`} action={a} onClose={onClose} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INFO / PEARL TAB */}
          {tab === 'info' && (
            <div className="p-3 space-y-3">
              {/* ── ACRONYM EXPANSION — the most prominent element ── */}
              <div className="rounded-lg p-3 space-y-1.5"
                   style={{ background: borderColor.replace('0.35','0.06'), border: `1px solid ${borderColor.replace('0.35','0.25')}` }}>
                <p className="text-[7.5px] font-black uppercase tracking-widest font-mono"
                   style={{ color: borderColor.replace('0.35','0.6') }}>WHAT THIS IS</p>
                <p className="text-[17px] font-black font-mono leading-none"
                   style={{ color: borderColor.replace('0.35','0.95') }}>{config.label}</p>
                <p className="text-[11px] font-bold text-slate-200 leading-tight">{config.subtitle}</p>
                {config.unit && (
                  <p className="text-[8.5px] text-slate-500 font-mono mt-1">
                    Unit: <span className="text-slate-300">{config.unit}</span>
                  </p>
                )}
              </div>

              {/* ── NORMAL RANGE ── */}
              <div className="rounded-lg p-2.5 space-y-1"
                   style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.1)' }}>
                <p className="text-[8px] font-black uppercase tracking-wider text-cyan-500/70 font-mono">Normal Range</p>
                <p className="text-[10px] font-bold text-slate-200 font-mono">{config.normal}</p>
              </div>

              {/* ── CLINICAL PEARL ── */}
              <div className="rounded-lg p-2.5 space-y-1"
                   style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)' }}>
                <p className="text-[8px] font-black uppercase tracking-wider text-amber-500/70 font-mono">Clinical Pearl</p>
                <p className="text-[9px] leading-relaxed text-slate-300 font-mono">{pearl}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <ResizeHandle onResizeStart={onResizeStart} color={borderColor.replace('0.35', '0.7').replace('0.20', '0.6')} />
    </div>
  );
};

// ─── Action Button ──────────────────────────────────────────────────────────
const ActionButton = ({ action, onClose }) => {
  const [ran, setRan] = useState(false);
  const cs = CAT_STYLES[action.category] || CAT_STYLES.other;

  const handleClick = useCallback(() => {
    if (ran) return;
    try { action.action && action.action(); } catch (e) { console.error(e); }
    setRan(true);
    setTimeout(() => { onClose(); }, 600);
  }, [action, ran, onClose]);

  return (
    <button
      onClick={handleClick}
      disabled={ran}
      className="w-full text-left rounded-lg px-2.5 py-2 transition-all active:scale-98 group"
      style={{
        background: ran ? 'rgba(52,211,153,0.08)' : (action.urgent ? 'rgba(248,113,113,0.08)' : cs.bg),
        border: `1px solid ${ran ? 'rgba(52,211,153,0.3)' : (action.urgent ? 'rgba(248,113,113,0.3)' : cs.border)}`,
        opacity: ran ? 0.7 : 1,
        cursor: ran ? 'default' : 'pointer',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Category badge */}
        <span className="text-[6.5px] font-black px-1 py-0.5 rounded leading-none shrink-0 font-mono"
              style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>
          {cs.label}
        </span>
        {/* Label */}
        <span className="text-[9.5px] font-bold font-mono flex-1"
              style={{ color: ran ? '#34d399' : (action.urgent ? '#fca5a5' : '#e2e8f0') }}>
          {ran ? '✓ Done' : action.label}
        </span>
        {!ran && <ChevronRight size={10} className="text-slate-600 group-hover:text-slate-400 shrink-0" />}
      </div>
      {/* Detail text */}
      {action.detail && !ran && (
        <p className="text-[7.5px] text-slate-600 leading-tight mt-1 font-mono pl-7">
          {action.detail}
        </p>
      )}
    </button>
  );
};
