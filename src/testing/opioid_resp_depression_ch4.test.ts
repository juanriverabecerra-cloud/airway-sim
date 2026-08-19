import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 4 · F41 (root fix) — the `sedativeEff` / `opioidEff` synergy signals must actually accumulate.
 *
 * `synergyGroup` is declared at the drug TOP LEVEL, but PKPDEngine read `pd.synergyGroup`, so `effects.group`
 * was always 'None' and both signals stayed ~0 for EVERY drug — silently disabling opioid respiratory-rate
 * depression (`opioidRRDrop = opioidEff*10`), opioid consciousness/GCS effects, aggregateHypnosis, and the
 * sedative/opioid one-shot event gates. Fixed by falling back to `med.synergyGroup`. This guard pins the most
 * clinically important restored behaviour: opioids depress the respiratory rate, dose-dependently — if the
 * signal ever goes dead again (e.g. a refactor drops the fallback), an unopposed opioid would stop depressing
 * ventilation and this fails.
 */
function opioidRrNadir(drug: string, dose: number, unit: string): number {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
  stepN(s, 20);
  giveMed(s, drug, dose, { unit });
  let minRR = 99;
  for (let i = 0; i < 15; i++) { stepN(s, 20); minRR = Math.min(minRR, s.state.vitals.rr ?? 99); }
  return minRR;
}

describe('Layer 4 — opioid respiratory depression via F41 signals', () => {
  it('fentanyl depresses the respiratory rate (opioidEff/synergyGroup wiring is live)', () => {
    // Baseline RR is ~12; a moderate fentanyl dose must pull it clinically lower (was a no-op pre-F41).
    expect(opioidRrNadir('fentanyl', 100, 'mcg'), 'fentanyl 100mcg RR nadir').toBeLessThan(11);
  });
  it('respiratory depression is dose-dependent (250mcg > 100mcg fentanyl)', () => {
    expect(opioidRrNadir('fentanyl', 250, 'mcg')).toBeLessThanOrEqual(opioidRrNadir('fentanyl', 100, 'mcg'));
  });
});
