import { describe, it, expect } from 'vitest';
import { runMetamorphic, type Direction, type SimHandle } from './harness/metamorphic';
import { HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 2 — DISEASE-AXIS direction laws. Instead of a drug, the single differential input is a
 * pathophysiologic state (sepsis / hemorrhage / anaphylaxis), asserting the shock physiology moves the
 * mandated direction: distributive & hypovolemic shock both drop MAP and drive compensatory tachycardia.
 *
 * NOTE (anaphylaxis onset time): the engine computes anaphylaxis severity from
 * `dt = st.time - (st.patient.anaphylaxisTime || st.time)`. Because `|| st.time` treats a 0 onset time
 * as "unset", anaphylaxis triggered at simulation t=0 never progresses (dt stays 0). Real triggers fire
 * at t>0, so we settle a few ticks before triggering — mirroring reality. See F27 in audit_findings.md.
 */
interface Law {
  name: string; mutate: (s: SimHandle) => void; key: string; direction: Direction; minDelta: number; steps: number; settle?: number;
}

const VERIFIED: Law[] = [
  // Septic (distributive/vasodilatory) shock:
  { name: 'sepsis->MAP down', mutate: (s) => { s.state.patient.isSeptic = true; }, key: 'map', direction: 'down', minDelta: 5, steps: 200 },
  { name: 'sepsis->HR up (compensatory)', mutate: (s) => { s.state.patient.isSeptic = true; }, key: 'hr', direction: 'up', minDelta: 8, steps: 200 },
  // Hemorrhagic (hypovolemic) shock — established ~36% blood loss:
  { name: 'hemorrhage->MAP down', mutate: (s) => { s.state.patient.ebl = 1800; }, key: 'map', direction: 'down', minDelta: 10, steps: 120 },
  { name: 'hemorrhage->HR up (compensatory)', mutate: (s) => { s.state.patient.ebl = 1800; }, key: 'hr', direction: 'up', minDelta: 15, steps: 120 },
  // Anaphylactic (distributive/vasoplegic) shock:
  { name: 'anaphylaxis->MAP down', mutate: (s) => { s.state.patient.anaphylaxisTriggered = true; s.state.patient.anaphylaxisTime = s.state.time; }, key: 'map', direction: 'down', minDelta: 10, steps: 120, settle: 10 },
  { name: 'anaphylaxis->HR up', mutate: (s) => { s.state.patient.anaphylaxisTriggered = true; s.state.patient.anaphylaxisTime = s.state.time; }, key: 'hr', direction: 'up', minDelta: 15, steps: 120, settle: 10 },
];

describe('Layer 2 — disease-axis direction laws (VERIFIED)', () => {
  for (const law of VERIFIED) {
    it(law.name, () => {
      const r = runMetamorphic(HEALTHY_CASE, law.mutate, {
        key: law.key, direction: law.direction, minDelta: law.minDelta, steps: law.steps, settle: law.settle ?? 0, seed: 4,
      });
      expect(r.pass, `${law.name}: base=${r.base} treat=${r.treat} delta=${Math.round((r.delta ?? 0) * 100) / 100}`).toBe(true);
    });
  }
});
