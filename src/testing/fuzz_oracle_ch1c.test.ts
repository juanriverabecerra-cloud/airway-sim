import { describe, it, expect } from 'vitest';
import { fuzzWithOracle, HEALTHY_CASE, KNOWN_LAYER2_CRITICAL_RULES } from './harness/headlessSim';

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

describe('Layer 1C — guided fuzzer vs. live physics + oracle (regression gate)', () => {
  for (const seed of [1, 2, 3, 5, 8]) {
    it(`seed ${seed}: 40 guided actions surface no UNEXPECTED critical physics violation`, () => {
      const { criticals, warnings, applied } = fuzzWithOracle(HEALTHY_CASE, { seed, actions: 40, stepsPerAction: 6 });
      const unexpected = criticals.filter((c) => !KNOWN_LAYER2_CRITICAL_RULES.has(c.rule));
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
