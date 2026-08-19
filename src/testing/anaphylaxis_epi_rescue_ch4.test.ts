import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 4 · F54 — epinephrine must be able to RESCUE anaphylactic shock.
 *
 * Blind anaphylaxis-scenario review: the epi-reversal term was `recovery = min(1, epiCe * 12)`, but a
 * clinical IV epi dose (100 mcg) produces epiCe ~0.01-0.03 (already ~85% receptor occupancy at c50 0.002),
 * so `epiCe*12` delivered only ~15% reversal against the 75% SVR collapse — the patient ALWAYS progressed
 * to arrest and anaphylaxis was UNSURVIVABLE regardless of treatment (a training-critical failure). Fixed
 * by scaling the reversal by receptor OCCUPANCY (Ce/(Ce+0.005)). These guard the contrast: untreated
 * anaphylaxis crashes to peri-arrest, and adequate epi + fluids keeps the patient alive and perfusing.
 */
function runAnaphylaxis(treat: boolean, minutes: number): number {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  stepN(s, 20);
  (s.state.patient as any).anaphylaxisTriggered = true;
  stepN(s, 40);
  if (treat) giveMed(s, 'Lactated Ringers (LR)', 2000, { unit: 'mL' });
  let minMap = 999;
  for (let m = 0; m < minutes; m++) {
    if (treat) giveMed(s, 'epinephrine', 0.1, { unit: 'mg' }); // q1min epi
    stepN(s, 60);
    minMap = Math.min(minMap, s.state.vitals.map ?? 999);
  }
  return minMap; // lowest MAP reached (0 = arrested)
}

describe('Layer 4 — epinephrine rescue of anaphylaxis (F54)', () => {
  it('adequate epi + fluids keeps the patient alive and perfusing (was always fatal)', () => {
    const treatedMinMap = runAnaphylaxis(true, 6);
    expect(treatedMinMap, `treated min MAP = ${treatedMinMap}`).toBeGreaterThan(30);
  }, 60000);

  it('untreated anaphylaxis progresses to peri-arrest (epi actually matters)', () => {
    const untreatedMinMap = runAnaphylaxis(false, 6);
    expect(untreatedMinMap, `untreated min MAP = ${untreatedMinMap}`).toBeLessThan(30);
  }, 60000);
});
