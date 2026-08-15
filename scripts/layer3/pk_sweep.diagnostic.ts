import { describe, it } from 'vitest';
import { writeFileSync } from 'fs';
// @ts-ignore
import { MEDICATIONS } from '../engine/Pharmacology.js';

/**
 * Layer 3 · Phase 3A.3 — PK derived-quantity sweep (static; no sim). For every drug compute:
 *  - elimination t½ = ln2/k10   (k's are per-minute)
 *  - time-to-peak effect t_peak = ln(ke0/k10)/(ke0-k10)  (effect-site peak for the simplified model)
 *  - Vdss = V1+V2+V3 (L); central V1 (L); clearance CL = k10·V1 (L/min)
 *  - initial plasma conc after a 1 mg bolus = 1/V1 (mg/L) — sanity for potency scaling
 * These are the numbers to grade against published PK (Shafer/Minto/Marsh/Schnider/Eleveld, Miller's Ch.18/26).
 */
const ln2 = Math.log(2);
function tPeak(ke0: number, k10: number): number {
  if (!(ke0 > 0) || !(k10 > 0) || ke0 === k10) return NaN;
  return Math.log(ke0 / k10) / (ke0 - k10); // minutes
}

describe('L3 PK sweep', () => {
  it('derived PK quantities for every drug', () => {
    const rows: any[] = [];
    for (const key of Object.keys(MEDICATIONS)) {
      const m: any = MEDICATIONS[key];
      if (!m?.pk) continue;
      const { V1 = 0, V2 = 0, V3 = 0, k10 = 0, ke0 = 0 } = m.pk;
      rows.push({
        key, cls: (m.classes || []).join('/'),
        thalf: k10 > 0 ? ln2 / k10 : Infinity, // min
        tpeak: tPeak(ke0, k10),                 // min
        vdss: V1 + V2 + V3, v1: V1,
        cl: k10 * V1,                            // L/min
        cp1mg: V1 > 0 ? 1 / V1 : Infinity,       // mg/L per 1 mg bolus
      });
    }
    const fmt = (r: any) => `${r.key.padEnd(22)} t½=${r.thalf === Infinity ? 'inf' : r.thalf.toFixed(0)}min tpeak=${Number.isFinite(r.tpeak) ? r.tpeak.toFixed(1) : 'na'}min Vdss=${r.vdss.toFixed(0)}L V1=${r.v1.toFixed(1)}L CL=${r.cl.toFixed(2)}L/min  [${r.cls}]`;
    // Focus groups for grading
    const opioids = rows.filter((r) => /Opioid/.test(r.cls));
    const sed = rows.filter((r) => /Sedative|Hypnotic|Induction|Benzo/.test(r.cls));
    const nmb = rows.filter((r) => /NDMR|Depolarizing|Paralytic|NMB/.test(r.cls));
    // Flags: implausible derived values
    const flags = rows.filter((r) =>
      (Number.isFinite(r.tpeak) && (r.tpeak > 30 || r.tpeak < 0)) ||   // effect peak >30 min or negative
      (r.thalf !== Infinity && (r.thalf < 0.3 || r.thalf > 3000)) ||   // t½ <18 s or >50 h
      r.vdss > 2000 || (r.v1 > 0 && r.v1 < 1)                          // implausible Vd
    );
    const out = [
      '=== OPIOIDS (grade vs Shafer/Minto) ===', ...opioids.sort((a, b) => a.tpeak - b.tpeak).map(fmt),
      '', '=== SEDATIVES/HYPNOTICS (grade vs Marsh/Schnider/Eleveld) ===', ...sed.map(fmt),
      '', '=== NMBs ===', ...nmb.map(fmt),
      '', `=== IMPLAUSIBLE DERIVED-VALUE FLAGS (${flags.length}) ===`, ...flags.map(fmt),
    ];
    writeFileSync('/tmp/l3_pk.txt', out.join('\n') + '\n');
  });
});
