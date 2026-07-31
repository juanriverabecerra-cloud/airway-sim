import { describe, it, expect } from 'vitest';
import { fuzzWithOracle, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 1C — closed loop WITH perturbation. A seeded guided fuzzer drives real clinical actions
 * (drugs via the real processMedCore, plus vent/cpr/shock) into the physics; the FidelityOracle audits
 * every resulting tick. CRITICAL = hard physics-law violation. Reproducible from `seed`.
 */
function summarize(anoms: any[]) {
  const by: Record<string, { count: number; firstTick: number; example: string }> = {};
  for (const a of anoms) {
    if (!by[a.rule]) by[a.rule] = { count: 0, firstTick: a.tick, example: a.message };
    by[a.rule].count++;
  }
  return by;
}

/**
 * CRITICAL anomaly rules the perturbation fuzzer is KNOWN to surface, each a tracked Layer-2 physics
 * finding (docs/architecture/audit_findings.md). This harness is a REGRESSION GATE: it must fail on any
 * *new/unexpected* CRITICAL rule (a fresh physics break), while allowing these known ones. As Layer 2
 * fixes each, delete it from this set — the gate then enforces its absence.
 */
const KNOWN_LAYER2_CRITICALS = new Set([
  // F7: PaO2 stays ~100 when PaCO2 rises on room air, exceeding the alveolar O2 ceiling.
  'Alveolar Gas Equation Thermodynamic Violation',
  // F5 (amplified): vasopressors drive MAP directly (~38 mmHg) without raising SVR -> identity breaks.
  'Ohm Cardiovascular Law Consistency',
  // F8: TOF still 0/4 120s after sugammadex — real reversal gap OR oracle check is dose/depth-unaware.
  'Sugammadex Reversal Delayed Recovery',
]);

describe('Layer 1C — guided fuzzer vs. live physics + oracle (regression gate)', () => {
  for (const seed of [1, 2, 3, 5, 8]) {
    it(`seed ${seed}: 40 guided actions surface no UNEXPECTED critical physics violation`, () => {
      const { criticals, warnings, applied } = fuzzWithOracle(HEALTHY_CASE, { seed, actions: 40, stepsPerAction: 6 });
      const unexpected = criticals.filter((c) => !KNOWN_LAYER2_CRITICALS.has(c.rule));
      if (unexpected.length) {
        // eslint-disable-next-line no-console
        console.log(`[fuzz seed ${seed}] UNEXPECTED CRITICALS:`, JSON.stringify(summarize(unexpected), null, 2));
      }
      // eslint-disable-next-line no-console
      console.log(`[fuzz seed ${seed}] known-critical rules:`, [...new Set(criticals.map((c) => c.rule))], '| warnings:', [...new Set(warnings.map((w) => w.rule))], '| actions:', applied.length);
      expect(unexpected, JSON.stringify(summarize(unexpected))).toHaveLength(0);
    });
  }

  // The fuzzer must actually be exercising drugs (else the gate is vacuous): confirm it drives real meds.
  it('actually administers medications (harness sanity)', () => {
    const { applied } = fuzzWithOracle(HEALTHY_CASE, { seed: 2, actions: 40, stepsPerAction: 4 });
    const pushes = applied.filter((a) => /Push|Bolus|Transfuse/i.test(a));
    expect(pushes.length).toBeGreaterThan(3);
  });
});
