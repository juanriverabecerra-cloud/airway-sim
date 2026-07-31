import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';

/**
 * Layer 1B golden master. A healthy, unmedicated adult with no intervention must stay physiologically
 * stable across time — this simultaneously proves createInitialSimState builds a faithful seed and
 * runPhysicsStep integrates it without drift. The recorded trajectory is frozen as a regression
 * fixture (toMatchSnapshot) that any future physiology/engine change must not silently alter.
 */
describe('Layer 1B — golden master (healthy adult, no intervention)', () => {
  it('stays physiologically stable over 300s', () => {
    const sim = createHeadlessSim(HEALTHY_CASE, { seed: 12345 });
    const traj = stepN(sim, 300);

    const at = (i: number) => traj[i];
    const last = at(traj.length - 1);
    // eslint-disable-next-line no-console
    console.log('[gm] t=1', at(0), '\n[gm] t=150', at(149), '\n[gm] t=300', last);

    for (const p of traj) {
      for (const k of Object.keys(p)) expect(Number.isFinite(p[k]), `${k}=${p[k]}`).toBe(true);
    }
    // Healthy, unmedicated, room-air: vitals should remain in a physiological band the whole time.
    for (const p of traj) {
      expect(p.hr).toBeGreaterThan(50); expect(p.hr).toBeLessThan(110);
      expect(p.map).toBeGreaterThan(65); expect(p.map).toBeLessThan(115);
      expect(p.spo2).toBeGreaterThan(93); expect(p.spo2).toBeLessThanOrEqual(100);
      expect(p.temp).toBeGreaterThan(35.5); expect(p.temp).toBeLessThan(38);
    }
  });

  it('is deterministic and matches the frozen golden trajectory', () => {
    const round = (p: Record<string, number>) => {
      const r: Record<string, number> = {};
      for (const k of Object.keys(p)) r[k] = Math.round(p[k] * 100) / 100;
      return r;
    };
    const runOnce = () => stepN(createHeadlessSim(HEALTHY_CASE, { seed: 4242 }), 60).map(round);
    const a = runOnce();
    const b = runOnce();
    expect(a).toEqual(b); // determinism
    // Regression fixture: sample every 10th tick to keep the snapshot compact.
    const sampled = a.filter((_, i) => i % 10 === 0 || i === a.length - 1);
    expect(sampled).toMatchSnapshot();
  });
});
