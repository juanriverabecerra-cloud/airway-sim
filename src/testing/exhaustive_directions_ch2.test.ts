import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, intubateMechanical, type Direction } from './harness/metamorphic';
// @ts-ignore
import { makeFuzzHandlers, HEALTHY_CASE, type SimHandle } from './harness/headlessSim';

/**
 * Layer 2 — EXHAUSTIVE metamorphic direction laws across drug classes, reversal agents, and mechanical
 * ventilation. VERIFIED laws hold (assert the correct direction). DOCUMENTED FINDINGS pin current buggy
 * behaviour so it is regression-tracked; each has a matching row in audit_findings.md and flips to a
 * VERIFIED law when the underlying finding is fixed.
 */
interface Law {
  name: string; mutate: (s: SimHandle) => void; key: string; direction: Direction; minDelta: number;
  steps: number; settle?: number; setup?: (s: SimHandle) => void;
}

const VERIFIED: Law[] = [
  { name: 'ephedrine->MAP up', mutate: (s) => giveMed(s, 'ephedrine', 15, { unit: 'mg' }), key: 'map', direction: 'up', minDelta: 3, steps: 25 },
  { name: 'vasopressin->MAP up', mutate: (s) => giveMed(s, 'vasopressin', 2, { unit: 'units' }), key: 'map', direction: 'up', minDelta: 3, steps: 30 },
  { name: 'nitroglycerin->MAP down', mutate: (s) => giveMed(s, 'nitroglycerin', 100, { unit: 'mcg' }), key: 'map', direction: 'down', minDelta: 3, steps: 30 },
  { name: 'hydralazine->MAP down', mutate: (s) => giveMed(s, 'hydralazine', 20, { unit: 'mg' }), key: 'map', direction: 'down', minDelta: 3, steps: 60 },
  { name: 'clevidipine->MAP down', mutate: (s) => giveMed(s, 'clevidipine', 4, { unit: 'mg' }), key: 'map', direction: 'down', minDelta: 3, steps: 40 },
  { name: 'succinylcholine->TOF down', mutate: (s) => giveMed(s, 'succinylcholine', 100, { unit: 'mg' }), key: 'tofCount', direction: 'down', minDelta: 1, steps: 30 },
  { name: 'cisatracurium->TOF down', mutate: (s) => giveMed(s, 'cisatracurium', 20, { unit: 'mg' }), key: 'tofCount', direction: 'down', minDelta: 1, steps: 90 },
  // F12 fix (pancuronium/mivacurium now wired into the NMJ occupancy):
  { name: 'pancuronium->TOF down', mutate: (s) => giveMed(s, 'pancuronium', 10, { unit: 'mg' }), key: 'tofCount', direction: 'down', minDelta: 1, steps: 90 },
  { name: 'mivacurium->TOF down', mutate: (s) => giveMed(s, 'mivacurium', 16, { unit: 'mg' }), key: 'tofCount', direction: 'down', minDelta: 1, steps: 90 },
  { name: 'naloxone reverses opioid->RR up', key: 'rr', direction: 'up', minDelta: 1, steps: 30, settle: 45,
    setup: (s) => giveMed(s, 'fentanyl', 200, { unit: 'mcg' }), mutate: (s) => giveMed(s, 'naloxone', 0.4, { unit: 'mg' }) },
  { name: 'higher vent RR->PaCO2 down', key: 'paco2', direction: 'down', minDelta: 2, steps: 60, settle: 40,
    setup: (s) => { giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12); }, mutate: (s) => makeFuzzHandlers(s).handleSetVentSettings({ rr: 22 }) },
  { name: 'higher vent RR->pH up', key: 'ph', direction: 'up', minDelta: 0.02, steps: 60, settle: 40,
    setup: (s) => { giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12); }, mutate: (s) => makeFuzzHandlers(s).handleSetVentSettings({ rr: 22 }) },
];

describe('Layer 2 — exhaustive direction laws (VERIFIED)', () => {
  for (const law of VERIFIED) {
    it(law.name, () => {
      const r = runMetamorphic(HEALTHY_CASE, law.mutate, {
        key: law.key, direction: law.direction, minDelta: law.minDelta, steps: law.steps, settle: law.settle ?? 0, setup: law.setup, seed: 4,
      });
      expect(r.pass, `${law.name}: base=${r.base} treat=${r.treat} delta=${Math.round((r.delta ?? 0) * 1000) / 1000}`).toBe(true);
    });
  }
});

/**
 * DOCUMENTED FINDINGS (Layer 2 backlog) — the metamorphic net surfaced these; each pins the current
 * (incorrect) behaviour. When fixed, flip the assertion to the correct direction and move to VERIFIED.
 */
describe('Layer 2 — exhaustive direction laws (DOCUMENTED FINDINGS)', () => {
  // F11: alpha-2 agonists (dexmedetomidine, clonidine) and labetalol lower BP but their bradycardic /
  // baroreflex-blunting effect is unmodeled, so they produce PARADOXICAL reflex tachycardia.
  for (const [drug, dose, unit] of [['dexmedetomidine', 100, 'mcg'], ['clonidine', 150, 'mcg'], ['labetalol', 20, 'mg']] as const) {
    it(`F11: ${drug} currently RAISES HR (should lower it)`, () => {
      const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, drug, dose, { unit }), { key: 'hr', direction: 'up', minDelta: 3, steps: 60, seed: 4 });
      expect(r.pass, `F11 pinned: ${drug} HR base=${r.base} treat=${r.treat} (bug: goes up)`).toBe(true);
    });
  }

  // F13: IV sodium bicarbonate does not alkalinize the blood (no effect on pH / displayed HCO3).
  it('F13: sodium bicarbonate currently does NOT raise pH', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, 'bicarbonate', 100, { unit: 'mEq' }), { key: 'ph', direction: 'same', sameTol: 0.01, steps: 40, seed: 4 });
    expect(r.pass, `F13 pinned: bicarbonate pH base=${r.base} treat=${r.treat} (bug: no change)`).toBe(true);
  });

  // F14: flumazenil does not reverse benzodiazepine sedation (no effect on BIS after midazolam).
  it('F14: flumazenil currently does NOT reverse benzodiazepine sedation', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, 'flumazenil', 0.5, { unit: 'mg' }),
      { key: 'bis', direction: 'same', sameTol: 2, steps: 40, settle: 60, setup: (s) => giveMed(s, 'midazolam', 5, { unit: 'mg' }), seed: 4 });
    expect(r.pass, `F14 pinned: flumazenil BIS base=${r.base} treat=${r.treat} (bug: no reversal)`).toBe(true);
  });

  // F15: etomidate reaches a therapeutic effect-site Ce (~0.33) and is in the GABA-A sedation sum, yet
  // BIS does not drop — it under-sedates relative to propofol/midazolam at equivalent GABA-A occupancy.
  it('F15: etomidate currently does NOT drop BIS despite therapeutic Ce', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s) => giveMed(s, 'etomidate', 20, { unit: 'mg' }), { key: 'bis', direction: 'same', sameTol: 3, steps: 30, seed: 4 });
    expect(r.pass, `F15 pinned: etomidate BIS base=${r.base} treat=${r.treat} (bug: no drop)`).toBe(true);
  });
});
