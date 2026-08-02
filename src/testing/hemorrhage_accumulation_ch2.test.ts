import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — hemorrhage accumulation (F28). A bleed RATE must accumulate into total blood loss so the
 * patient progressively deteriorates. Previously the surgical/trauma bleed drove the current tick's
 * bloodLossRatio/Hb-dilution but was never written back to patient.ebl, so ebl stayed flat and a
 * "bleeding" patient never lost MAP/Hgb. This guards that a sustained bleed now progresses.
 */
describe('Layer 2 — hemorrhage accumulates (F28)', () => {
  it('a sustained trauma bleed accumulates EBL and deteriorates hemodynamics', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    sim.state.patient.trauma = true;
    sim.state.patient.bleedRate = 2.0; // mL/sec

    stepN(sim, 60);
    const ebl1 = sim.state.patient.ebl ?? 0;
    const map1 = sim.state.vitals.map ?? 0;
    stepN(sim, 120);
    const ebl2 = sim.state.patient.ebl ?? 0;
    const map2 = sim.state.vitals.map ?? 0;

    // EBL must GROW over time (a rate that accumulates), not sit flat.
    expect(ebl1, 'EBL should accumulate in the first 60s').toBeGreaterThan(60);
    expect(ebl2, 'EBL should keep growing (roughly linear with the bleed rate)').toBeGreaterThan(ebl1 + 100);
    // ~360 mL lost by t=180 in a 5 L patient -> falling MAP (compensated then decompensating).
    expect(map2, `MAP should fall as blood is lost (t=60 MAP=${map1}, t=180 MAP=${map2})`).toBeLessThan(map1);
  });
});
