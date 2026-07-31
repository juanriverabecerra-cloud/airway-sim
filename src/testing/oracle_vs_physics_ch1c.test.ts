import { describe, it, expect } from 'vitest';
import { createHeadlessSim, runWithOracle, HEALTHY_CASE, AUDIT_CASES, KNOWN_LAYER2_CRITICAL_RULES } from './harness/headlessSim';

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
      it(`${kase.id} (seed ${seed}) surfaces no UNEXPECTED critical physics violation over 240s`, () => {
        const sim = createHeadlessSim(kase, { seed });
        const { criticals } = runWithOracle(sim, 240);
        // Regression gate: only the tracked Layer-2 findings are allowed (e.g. gm_trauma reaches severe
        // hemorrhagic shock where F5's MAP-CO-SVR decoupling exceeds the CRITICAL threshold).
        const unexpected = criticals.filter((c) => !KNOWN_LAYER2_CRITICAL_RULES.has(c.rule));
        expect(unexpected, JSON.stringify(summarize(unexpected))).toHaveLength(0);
      });
    }
  }

  // F5 RESOLVED (Layer 2): displayed SVR is now the identity-consistent 80*(MAP-CVP)/CO, so comorbid
  // patients no longer show MAP-CO-SVR coupling drift. This guards the fix from regressing.
  it('F5 RESOLVED: comorbid patients show no MAP-CO-SVR coupling drift', () => {
    for (const kase of AUDIT_CASES) {
      const { warnings } = runWithOracle(createHeadlessSim(kase, { seed: 1 }), 120);
      const drift = warnings.filter((w) => w.rule === 'MAP-CO-SVR Coupling Drift');
      expect(drift.length, `${kase.id}: F5 fix should keep displayed SVR identity-consistent`).toBe(0);
    }
  });
});
