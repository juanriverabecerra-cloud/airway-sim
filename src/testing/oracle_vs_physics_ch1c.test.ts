import { describe, it, expect } from 'vitest';
import { createHeadlessSim, runWithOracle, HEALTHY_CASE, AUDIT_CASES } from './harness/headlessSim';

/**
 * Layer 1C — the closed loop. Run the real physics core and audit EVERY tick with the FidelityOracle
 * (which had never before seen a live trajectory — only hand-crafted states). A CRITICAL anomaly is a
 * hard physics-law violation (MAP=CO·SVR/80, alveolar gas equation, arrest decay, NaN telemetry, …)
 * and must never occur. Seeded ⇒ every failure is reproducible.
 */
function summarize(criticals: any[]) {
  const byRule: Record<string, { count: number; firstTick: number; example: string }> = {};
  for (const c of criticals) {
    if (!byRule[c.rule]) byRule[c.rule] = { count: 0, firstTick: c.tick, example: c.message };
    byRule[c.rule].count++;
  }
  return byRule;
}

describe('Layer 1C — FidelityOracle vs. live physics', () => {
  it('healthy adult produces zero CRITICAL anomalies over 300s', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 12345 });
    const { criticals, warnings } = runWithOracle(sim, 300);
    if (criticals.length) {
      // eslint-disable-next-line no-console
      console.log('[1c] healthy CRITICALS:', JSON.stringify(summarize(criticals), null, 2));
    }
    // eslint-disable-next-line no-console
    console.log('[1c] healthy warning rules:', [...new Set(warnings.map((w) => w.rule))]);
    expect(criticals, JSON.stringify(summarize(criticals))).toHaveLength(0);
  });

  // Every representative comorbid case: the hard physics-law invariants must hold under stress too.
  // Run across a few seeds so stochastic complication rolls don't hide a violation behind one RNG path.
  for (const kase of AUDIT_CASES) {
    for (const seed of [1, 7, 99]) {
      it(`${kase.id} (seed ${seed}) produces zero CRITICAL anomalies over 240s`, () => {
        const sim = createHeadlessSim(kase, { seed });
        const { criticals } = runWithOracle(sim, 240);
        expect(criticals, JSON.stringify(summarize(criticals))).toHaveLength(0);
      });
    }
  }

  // KNOWN LAYER-2 FINDING (surfaced by this harness): the CV engine applies disease-specific MAP
  // modifiers (sepsisMAPShift, obesity/COPD shifts) directly to MAP without adjusting CO/SVR, so the
  // displayed CO·SVR·CVP identity drifts ~12–17 mmHg in comorbid patients. This test PINS the finding
  // so it stays visible and regression-tracked. When Layer 2 routes those shifts through SVR, this
  // drift should collapse to ~0 and this expectation should be updated to assert its ABSENCE.
  it('DOCUMENTS the MAP-CO-SVR coupling drift in comorbid patients (Layer 2 backlog)', () => {
    const septic = AUDIT_CASES.find((c) => c.id === 'gm_septic')!;
    const { warnings } = runWithOracle(createHeadlessSim(septic, { seed: 1 }), 120);
    const drift = warnings.filter((w) => w.rule === 'MAP-CO-SVR Coupling Drift');
    expect(drift.length, 'expected the known septic MAP-CO-SVR drift to still be present').toBeGreaterThan(0);
  });
});
