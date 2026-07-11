/**
 * RenalPanel — Standalone renal function & fluid balance monitor
 *
 * Sits above the Lines/Resus panel. Every metric box is clickable and opens
 * the VitalContext panel (same system as PrimaryMonitor / VentMonitor).
 *
 * Clinical value:
 *  - UOP rate in mL/kg/hr (the clinically meaningful unit, not raw mL)
 *  - AKI staging badge (KDIGO criteria)
 *  - FE_Na interpretation inline (Prerenal / ATN / Invalid-on-diuretics)
 *  - Drug dosing warning when GFR is impaired
 *  - Running net fluid balance
 *  - All six metrics clickable for context panels with drivers + actions + pearls
 */

import { useState } from 'react';
import { Droplets, AlertTriangle, FlaskConical } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const colors = { ok: 'bg-emerald-400', warn: 'bg-amber-400 animate-pulse', critical: 'bg-red-400 animate-pulse' };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] || colors.ok}`} />;
};

// ─── main component ─────────────────────────────────────────────────────────
export const RenalPanel = ({ patient, vitals, activeMeds, onVitalClick }) => {
  const wt     = patient?.weight || 70;
  const uopRate  = (patient?.urineOutputRate || 0) / wt;   // mL/kg/hr
  const gfr      = patient?.gfr || 125;
  const cr       = patient?.creatinine || 0.85;
  const bun      = patient?.bun || 12;
  const feNa     = patient?.feNa || 1.0;
  const uOsm     = patient?.urineOsmolality || 350;
  const sOsm     = patient?.osm || 285;
  const akiStage = patient?.akiStage || 0;
  const netFluidL = ((patient?.netFluidBalance || 0) / 1000);

  // Haemofluids check
  const onDiuretics = activeMeds?.some(m => m.name === 'Furosemide' || m.name === 'Bumetanide' || m.name === 'Mannitol');

  // GFR-based drug dosing warning — check active renally-cleared drugs
  const renalDrugWarnings = (activeMeds || []).filter(m =>
    ['Rocuronium','Vecuronium','Morphine','Vancomycin','Gentamicin'].includes(m.name) && m.Ce > 0.01
  ).map(m => m.name);
  const showDrugWarning = gfr < 60 && renalDrugWarnings.length > 0;

  // FE_Na interpretation
  const fenaLabel = onDiuretics ? 'INVALID*' : feNa < 1 ? 'Prerenal' : feNa > 2 ? 'ATN' : 'Borderline';
  const fenaColor = onDiuretics ? 'text-amber-400' : feNa < 1 ? 'text-emerald-400' : feNa > 2 ? 'text-red-400' : 'text-amber-400';

  // Status helpers
  const uopStatus   = uopRate < 0.3 ? 'critical' : uopRate < 0.5 ? 'warn' : 'ok';
  const gfrStatus   = gfr < 30 ? 'critical' : gfr < 60 ? 'warn' : 'ok';
  const crStatus    = cr > 3 ? 'critical' : cr > 1.5 ? 'warn' : 'ok';
  const fenaStatus  = onDiuretics ? 'warn' : feNa < 1 ? 'ok' : feNa > 2 ? 'critical' : 'warn';
  const uOsmStatus  = uOsm < 350 ? 'warn' : 'ok';
  const sOsmStatus  = sOsm > 310 ? 'critical' : sOsm > 300 ? 'warn' : sOsm < 270 ? 'critical' : 'ok';

  const BOX = 'bg-slate-950/60 border border-white/5 rounded-lg p-2 flex flex-col gap-0.5 cursor-pointer hover:border-purple-500/30 hover:bg-purple-950/10 transition-all active:scale-[0.98] select-none';
  const LABEL = 'text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none';
  const VAL   = 'text-xs font-black font-mono leading-none';
  const SUB   = 'text-[8px] text-slate-500 leading-none font-mono';

  return (
    <div className="glass-panel p-3 flex flex-col gap-2.5 font-mono shrink-0"
         style={{ background: 'rgba(2,4,14,0.85)', border: '1px solid rgba(168,85,247,0.18)' }}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Droplets size={12} className="text-purple-400 shrink-0" />
          <span className="text-[9.5px] font-black uppercase tracking-widest text-purple-400">Renal & Fluid Status</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Net fluid balance */}
          <span className={`text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded border ${netFluidL < -0.5 ? 'text-amber-400 border-amber-800/50 bg-amber-950/20' : netFluidL > 2 ? 'text-blue-400 border-blue-800/50 bg-blue-950/20' : 'text-slate-400 border-slate-800/50'}`}
                title="Net fluid balance (IV in − UOP out)">
            Balance: {netFluidL > 0 ? '+' : ''}{netFluidL.toFixed(1)} L
          </span>
          {/* AKI stage badge */}
          {akiStage > 0 && (
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border animate-pulse ${akiStage >= 2 ? 'bg-red-950/80 border-red-700 text-red-400' : 'bg-amber-950/80 border-amber-700 text-amber-400'}`}>
              AKI Stage {akiStage}
            </span>
          )}
          {/* Drug dosing warning */}
          {showDrugWarning && (
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border bg-orange-950/80 border-orange-700 text-orange-400"
                  title={`GFR ${Math.round(gfr)}: review dosing — ${renalDrugWarnings.join(', ')}`}>
              <AlertTriangle size={8} className="inline mr-0.5" />Drug doses ↓
            </span>
          )}
        </div>
      </div>

      {/* ── THREE MAIN METRIC BOXES ── */}
      <div className="grid grid-cols-3 gap-2">

        {/* UOP */}
        <div className={BOX} onClick={e => onVitalClick?.('uop', e)}>
          <div className="flex items-center gap-1">
            <StatusDot status={uopStatus} />
            <span className={LABEL}>UOP Rate</span>
          </div>
          <span className={`${VAL} ${uopStatus === 'critical' ? 'text-red-400' : uopStatus === 'warn' ? 'text-amber-400' : 'text-purple-300'}`}>
            {uopRate.toFixed(2)}
          </span>
          <span className={SUB}>mL/kg/hr</span>
          <span className={`text-[8px] font-mono ${uopStatus !== 'ok' ? 'text-amber-400' : 'text-slate-600'}`}>
            {(patient?.urineOutput || 0).toFixed(0)} mL total
          </span>
        </div>

        {/* eGFR */}
        <div className={BOX} onClick={e => onVitalClick?.('egfr', e)}>
          <div className="flex items-center gap-1">
            <StatusDot status={gfrStatus} />
            <span className={LABEL}>eGFR</span>
          </div>
          <span className={`${VAL} ${gfrStatus === 'critical' ? 'text-red-400' : gfrStatus === 'warn' ? 'text-amber-400' : 'text-purple-300'}`}>
            {Math.round(gfr)}
          </span>
          <span className={SUB}>mL/min</span>
          <span className={`text-[8px] font-mono ${gfr < 30 ? 'text-red-400' : gfr < 60 ? 'text-amber-400' : 'text-slate-600'}`}>
            {gfr >= 90 ? 'Normal' : gfr >= 60 ? 'Mild ↓' : gfr >= 30 ? 'Moderate' : gfr >= 15 ? 'Severe' : 'Failure'}
          </span>
        </div>

        {/* Cr / BUN */}
        <div className={BOX} onClick={e => onVitalClick?.('creatinine', e)}>
          <div className="flex items-center gap-1">
            <StatusDot status={crStatus} />
            <span className={LABEL}>Cr / BUN</span>
          </div>
          <span className={`${VAL} ${crStatus === 'critical' ? 'text-red-400' : crStatus === 'warn' ? 'text-amber-400' : 'text-purple-300'}`}>
            {cr.toFixed(2)}
          </span>
          <span className={SUB}>mg/dL</span>
          <span className={`text-[8px] font-mono text-slate-500`}>
            BUN {Math.round(bun)} · ratio {(bun / Math.max(0.1, cr)).toFixed(0)}
          </span>
        </div>
      </div>

      {/* ── BOTTOM ROW: FE_Na, U_Osm, S_Osm ── */}
      <div className="grid grid-cols-3 gap-2">

        {/* FE_Na */}
        <div className={BOX} onClick={e => onVitalClick?.('fena', e)}>
          <div className="flex items-center gap-1">
            <StatusDot status={fenaStatus} />
            <span className={LABEL}>FE_Na</span>
          </div>
          <span className={`${VAL} ${fenaColor}`}>{feNa.toFixed(2)}%</span>
          <span className={`text-[8px] font-bold font-mono ${fenaColor}`}>{fenaLabel}</span>
          {onDiuretics && <span className="text-[7.5px] text-amber-500">*on diuretics</span>}
        </div>

        {/* U_Osm */}
        <div className={BOX} onClick={e => onVitalClick?.('uosm', e)}>
          <div className="flex items-center gap-1">
            <StatusDot status={uOsmStatus} />
            <span className={LABEL}>U_Osm</span>
          </div>
          <span className={`${VAL} ${uOsmStatus === 'warn' ? 'text-amber-400' : 'text-purple-300'}`}>
            {Math.round(uOsm)}
          </span>
          <span className={SUB}>mOsm/kg</span>
          <span className={`text-[8px] font-mono ${uOsm > 500 ? 'text-emerald-500' : uOsm < 350 ? 'text-amber-400' : 'text-slate-600'}`}>
            {uOsm > 500 ? 'Concentrated' : uOsm < 350 ? 'Dilute' : 'Intermediate'}
          </span>
        </div>

        {/* S_Osm */}
        <div className={BOX} onClick={e => onVitalClick?.('sosm', e)}>
          <div className="flex items-center gap-1">
            <StatusDot status={sOsmStatus} />
            <span className={LABEL}>Serum Osm</span>
          </div>
          <span className={`${VAL} ${sOsmStatus === 'critical' ? 'text-red-400' : sOsmStatus === 'warn' ? 'text-amber-400' : 'text-purple-300'}`}>
            {Math.round(sOsm)}
          </span>
          <span className={SUB}>mOsm/kg</span>
          <span className={`text-[8px] font-mono text-slate-600`}>
            {sOsm > 300 ? 'Hyperosmolar' : sOsm < 280 ? 'Hypo-osmolar' : 'Normal'}
          </span>
        </div>
      </div>

      {/* ── AKI INTERPRETATION BANNER (only when active) ── */}
      {akiStage > 0 && (
        <div className={`text-[9px] leading-relaxed rounded px-2 py-1.5 font-mono ${akiStage >= 2 ? 'bg-red-950/40 border border-red-900/50 text-red-300' : 'bg-amber-950/40 border border-amber-900/50 text-amber-300'}`}>
          {akiStage === 1 && `AKI Stage 1: Cr ×1.5-1.9 baseline OR UOP < 0.5 mL/kg/hr × 6h. Optimize MAP > 65, fluid balance, stop nephrotoxins.`}
          {akiStage === 2 && `AKI Stage 2: Cr ×2-2.9 baseline OR UOP < 0.5 mL/kg/hr × 12h. Urgent workup: FE_Na, U_Osm, BUN:Cr ratio. Consider nephrology.`}
          {akiStage >= 3 && `AKI Stage 3: Cr ×3+ baseline OR UOP < 0.3 mL/kg/hr × 24h. Renal replacement therapy may be required. Nephrology consult now.`}
        </div>
      )}

      {/* ── DRUG DOSING WARNING ── */}
      {showDrugWarning && (
        <div className="text-[8.5px] leading-relaxed rounded px-2 py-1 bg-orange-950/30 border border-orange-900/50 text-orange-300 font-mono">
          <AlertTriangle size={9} className="inline mr-1 text-orange-400" />
          GFR {Math.round(gfr)}: reduce doses — {renalDrugWarnings.join(', ')}
          {renalDrugWarnings.includes('Morphine') && ' (M6G accumulation → delayed toxicity)'}
          {renalDrugWarnings.includes('Vancomycin') && ' (AUC/MIC dosing required)'}
        </div>
      )}
    </div>
  );
};
