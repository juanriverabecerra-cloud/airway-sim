import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — fluid/transfusion effects (F32 + fluid census). Registers a fluid on the access line (the
 * real FluidicsEngine path) and asserts its physiologic effect. F32: a PRBC transfusion had DILUTED Hb
 * like saline because prbcVolumeReceivedMl was lost on write-back every tick; and non-red-cell blood
 * products spuriously counted as RBC volume. Now PRBC raises Hb; FFP/platelets/cryo dilute it but carry
 * their coag/citrate effects.
 */
function giveFluid(sim: any, name: string, volume = 2000) {
  sim.state.patient.accessLines[0].activeInfusions = [{ name, remainingVolume: volume, userRate: undefined, currentRate: 0 }];
}
function runPair(name: string, steps = 600) {
  const base = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  giveFluid(s, name);
  stepN(base, steps); stepN(s, steps);
  return { base, s };
}
const hb = (h: any) => h.state.patient.currentHemoglobin as number;
const ca = (h: any) => h.state.electrolytes.ca as number;
const coag = (h: any) => h.state.coags as { r_offset: number; ma_offset: number; angle_offset: number };

describe('Layer 2 — fluid & transfusion effects', () => {
  it('F32: PRBC RAISES hemoglobin (was diluting it like saline)', () => {
    const { base, s } = runPair('Packed Red Blood Cells (PRBC)', 800);
    expect(hb(s), `PRBC Hb ${hb(s).toFixed(2)} vs base ${hb(base).toFixed(2)}`).toBeGreaterThan(hb(base) + 0.15);
    expect(s.state.patient.prbcVolumeReceivedMl, 'prbcVolumeReceivedMl must accumulate').toBeGreaterThan(50);
  });

  it('albumin (a red-cell-free colloid) DILUTES hemoglobin', () => {
    const { base, s } = runPair('Albumin 5%');
    expect(hb(s), `albumin Hb ${hb(s).toFixed(2)} vs base ${hb(base).toFixed(2)}`).toBeLessThan(hb(base) - 0.3);
  });

  it('FFP does NOT raise hemoglobin (no red cells) but shortens R-time (clotting factors)', () => {
    const { base, s } = runPair('Fresh Frozen Plasma (FFP)');
    expect(hb(s), 'FFP should not raise Hb').toBeLessThan(hb(base));
    expect(coag(s).r_offset, 'FFP shortens R (faster clot initiation)').toBeLessThan(coag(base).r_offset - 2);
  });

  it('platelets strengthen the clot (MA up)', () => {
    const { base, s } = runPair('Platelets');
    expect(coag(s).ma_offset, 'platelets raise MA').toBeGreaterThan(coag(base).ma_offset + 5);
  });

  it('LR raises ionized calcium (contains Ca); citrate-loaded PRBC lowers it', () => {
    const lr = runPair('Lactated Ringers (LR)');
    expect(ca(lr.s), 'LR raises Ca').toBeGreaterThan(ca(lr.base) + 0.2);
    const prbc = runPair('Packed Red Blood Cells (PRBC)', 800);
    expect(ca(prbc.s), 'PRBC citrate lowers Ca').toBeLessThan(ca(prbc.base));
  }, 90000); // runs 4 long sims (~2800 steps); raise timeout so parallel-load CPU contention can't time it out

  it('crystalloid causes dilutional coagulopathy (MA down)', () => {
    const { base, s } = runPair('Normal Saline (0.9% NS)');
    expect(coag(s).ma_offset, 'NS dilutes -> lower MA').toBeLessThan(coag(base).ma_offset);
  });
});
