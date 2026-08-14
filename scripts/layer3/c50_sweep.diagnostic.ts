import { describe, it } from 'vitest';
import { writeFileSync } from 'fs';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';
// @ts-ignore
import { MEDICATIONS } from '../engine/Pharmacology.js';

/**
 * Layer 3 · Phase 3A.2 — c50 vs clinical-dose sweep. For every drug with a numeric pd.c50, administer its
 * FIRST indication dose, track the PEAK effect-site Ce reached, and compute the Hill effect fraction at
 * that peak: f = Ce^γ/(Ce^γ + c50^γ). A well-scaled c50 puts the clinical dose on the responsive part of
 * the curve (f≈0.2–0.9). f<0.15 ⇒ the drug is ~inert at its clinical dose (c50 too HIGH, the F26/F29
 * class). f>0.97 ⇒ saturated, no dose-response (c50 too LOW). This generalizes the isoproterenol/F29
 * detector over all drugs. Output is triaged manually into the provenance ledger.
 */
function pickDose(doseStr: string): number {
  const parts = String(doseStr).split('-').map((s) => parseFloat(s)).filter((n) => Number.isFinite(n));
  return parts.length ? parts[parts.length - 1] : NaN;
}

describe('L3 c50 sweep', () => {
  it('peak Ce vs c50 for every drug', () => {
    const rows: { key: string; ce: number; c50: number; g: number; f: number; dose: string }[] = [];
    for (const key of Object.keys(MEDICATIONS)) {
      const med: any = MEDICATIONS[key];
      if (!med?.pd || typeof med.pd.c50 !== 'number' || !med.indications) continue;
      const ind: any = Object.values(med.indications)[0];
      const dose = pickDose(ind.dose);
      if (!Number.isFinite(dose)) continue;
      const opts = { unit: ind.unit || 'mg', type: ind.type || 'Bolus' };
      const steps = opts.type === 'Infusion' ? 600 : 240;
      let sim;
      try {
        sim = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
        giveMed(sim, key, dose, opts);
      } catch { continue; }
      let peakCe = 0;
      for (let i = 0; i < steps / 20; i++) {
        stepN(sim, 20);
        const m = (sim.state.activeMeds || []).find((mm: any) => mm.name === med.name);
        if (m && m.Ce > peakCe) peakCe = m.Ce;
      }
      const c50 = med.pd.c50; const g = med.pd.gamma || 1;
      const f = Math.pow(peakCe, g) / (Math.pow(peakCe, g) + Math.pow(c50, g));
      rows.push({ key, ce: peakCe, c50, g, f: Number.isFinite(f) ? f : 0, dose: `${dose}${opts.unit} ${opts.type}` });
    }
    rows.sort((a, b) => a.f - b.f);
    const fmt = (r: typeof rows[0]) => `${r.key.padEnd(24)} f=${r.f.toFixed(3)} peakCe=${r.ce.toExponential(2)} c50=${r.c50} γ=${r.g}  [${r.dose}]`;
    const inert = rows.filter((r) => r.f < 0.15);
    const sat = rows.filter((r) => r.f > 0.97);
    const ok = rows.filter((r) => r.f >= 0.15 && r.f <= 0.97);
    const out = [
      `=== L3 c50-vs-dose sweep (${rows.length} drugs with numeric c50) ===`,
      `INERT at clinical dose (f<0.15) — c50 likely TOO HIGH: ${inert.length}`,
      ...inert.map((r) => '  ' + fmt(r)),
      ``, `SATURATED (f>0.97) — c50 likely TOO LOW / no dose-response: ${sat.length}`,
      ...sat.map((r) => '  ' + fmt(r)),
      ``, `RESPONSIVE (0.15–0.97) — plausible c50 scaling: ${ok.length}`,
      ...ok.map((r) => '  ' + fmt(r)),
    ];
    writeFileSync('/tmp/l3_c50.txt', out.join('\n') + '\n');
  });
});
