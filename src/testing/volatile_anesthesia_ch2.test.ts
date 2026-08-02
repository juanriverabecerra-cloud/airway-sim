import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed, intubateMechanical } from './harness/metamorphic';

/**
 * Layer 2 — volatile anesthesia depth (F21). The per-gas brain MAC fed to the ConsciousnessEngine was
 * recomputed from the STORED model.Fb (which the GasKineticsModel keeps ~100x smaller than the tick's
 * returned gasState.Fb), so sevoMac/isoMac/etc. were ≈0 and volatiles NEVER dropped BIS. Fixed by
 * reusing the loop's per-gas brain MAC. This guards that a rising volatile MAC now anesthetizes.
 */
describe('Layer 2 — volatile anesthesia (F21)', () => {
  it('rising sevoflurane MAC drops BIS (volatile anesthesia works)', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    giveMed(sim, 'rocuronium', 50, { unit: 'mg' });
    intubateMechanical(sim, 12);
    Object.assign(sim.state.gasSettings, { agent: 'sevoflurane', dial: 2.5, o2Flow: 2.0 });

    const bisStart = sim.state.vitals.bis;
    stepN(sim, 240);
    const v = sim.state.vitals;
    expect(v.mac, 'sevoflurane MAC should build').toBeGreaterThan(0.5);
    // ~0.6-0.7 MAC of a volatile must meaningfully suppress BIS (was frozen at ~98).
    expect(v.bis, `BIS should fall from ${bisStart} as MAC builds`).toBeLessThan(90);
  });
});
