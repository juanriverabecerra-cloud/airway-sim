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
  // F11 fix (alpha-2 agonists + labetalol now lower HR instead of paradoxical reflex tachycardia):
  { name: 'dexmedetomidine->HR down', mutate: (s) => giveMed(s, 'dexmedetomidine', 100, { unit: 'mcg' }), key: 'hr', direction: 'down', minDelta: 2, steps: 60 },
  { name: 'clonidine->HR down', mutate: (s) => giveMed(s, 'clonidine', 150, { unit: 'mcg' }), key: 'hr', direction: 'down', minDelta: 2, steps: 60 },
  { name: 'labetalol->HR down', mutate: (s) => giveMed(s, 'labetalol', 20, { unit: 'mg' }), key: 'hr', direction: 'down', minDelta: 2, steps: 60 },
  // F15 fix (etomidate now a hypnotic in the BIS depth terms):
  { name: 'etomidate->BIS down', mutate: (s) => giveMed(s, 'etomidate', 20, { unit: 'mg' }), key: 'bis', direction: 'down', minDelta: 5, steps: 30 },
  // F13 fix (IV sodium bicarbonate now alkalinizes):
  { name: 'bicarbonate->pH up', mutate: (s) => giveMed(s, 'bicarbonate', 100, { unit: 'mEq' }), key: 'ph', direction: 'up', minDelta: 0.02, steps: 40 },
  // F14 fix (flumazenil now reverses benzodiazepine sedation):
  { name: 'flumazenil reverses benzo->BIS up', key: 'bis', direction: 'up', minDelta: 3, steps: 40, settle: 60,
    setup: (s) => giveMed(s, 'midazolam', 5, { unit: 'mg' }), mutate: (s) => giveMed(s, 'flumazenil', 0.5, { unit: 'mg' }) },
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

// All findings F11–F15 surfaced by this battery have been FIXED and their laws moved into VERIFIED
// above. Keep this file's laws green — a regression here means a physiology coupling has broken.
