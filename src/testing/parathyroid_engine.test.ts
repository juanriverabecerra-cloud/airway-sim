import { describe, it, expect } from 'vitest';
import { ParathyroidEngine } from '../engine/ParathyroidEngine';

function tickN(n: number, patientOverrides: any, startCalcium: number, inputs: any) {
  let patient: any = { ...patientOverrides };
  let calcium = startCalcium;
  let out: any;
  for (let i = 0; i < n; i++) {
    out = ParathyroidEngine.tick(1, { patient, time: i }, { ...inputs, calcium });
    calcium = out.calcium;
    patient = { ...patientOverrides, pthLevel: out.pthLevel };
  }
  return out;
}

describe('ParathyroidEngine — PTH-driven calcium homeostasis / vitamin D dependence', () => {
  it('stays at baseline calcium with no depletion and no pathology', () => {
    const out = tickN(3600, {}, 9.0, {});
    expect(out.calcium).toBeCloseTo(9.0, 1);
  });

  it('corrects depleted calcium (e.g. post-citrate-binding from massive transfusion) back toward baseline over time', () => {
    const out = tickN(3600, {}, 6.5, {});
    expect(out.calcium).toBeGreaterThan(6.5);
    expect(out.calcium).toBeLessThan(9.0);
  });

  it('PTH rises in response to hypocalcemia (real negative feedback)', () => {
    const normal = ParathyroidEngine.tick(1, { patient: { pthLevel: 0.1 }, time: 0 }, { calcium: 9.0 });
    const hypocalcemic = ParathyroidEngine.tick(1, { patient: { pthLevel: 0.1 }, time: 0 }, { calcium: 6.0 });
    expect(hypocalcemic.pthLevel).toBeGreaterThan(normal.pthLevel);
  });

  it('hypoparathyroidism blunts the correction, leaving calcium lower after the same depletion and recovery time', () => {
    const normalPTH = tickN(3600, {}, 6.5, {});
    const hypoPTH = tickN(3600, { hypoparathyroidism: true }, 6.5, {});
    expect(hypoPTH.calcium).toBeLessThan(normalPTH.calcium);
  });

  it('reduced renal function (vitamin D activation dependence) blunts correction even with normal PTH response', () => {
    const normalRenal = tickN(3600, {}, 6.5, { renalFunctionRatio: 1.0 });
    const ckd = tickN(3600, {}, 6.5, { renalFunctionRatio: 0.2 });
    expect(ckd.calcium).toBeLessThan(normalRenal.calcium);
  });

  it('emits a hypocalcemia event when input calcium is below 7.0 mg/dL (once, via the logged-flag guard) and a critical event below 6.0', () => {
    // This engine only ever raises calcium (the correction layer) -- it never lowers it
    // (FluidicsEngine.ts's citrate mechanism does that), so these events fire off the
    // current input level directly, with a logged-flag guard, not a before/after
    // transition this engine's own output could never produce.
    let patient: any = { pthLevel: 0.1 };
    let sawWarning = false;
    let sawCritical = false;
    for (const calcium of [7.5, 6.9, 6.5, 5.9]) {
      const out = ParathyroidEngine.tick(1, { patient, time: 0 }, { calcium });
      if (out.events.some((e: string) => e.includes('HYPOCALCEMIA'))) sawWarning = true;
      if (out.events.some((e: string) => e.includes('CRITICAL'))) sawCritical = true;
      patient = { pthLevel: out.pthLevel, hypocalcemiaLogged: out.hypocalcemiaLogged, severeHypocalcemiaLogged: out.severeHypocalcemiaLogged };
    }
    expect(sawWarning).toBe(true);
    expect(sawCritical).toBe(true);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => ParathyroidEngine.tick(1, undefined as any, {})).not.toThrow();
    expect(() => ParathyroidEngine.tick(NaN, { patient: {}, time: 0 }, undefined as any)).not.toThrow();
    const out = ParathyroidEngine.tick(1, { patient: { pthLevel: NaN } }, { calcium: NaN, renalFunctionRatio: -5 });
    expect(Number.isFinite(out.calcium)).toBe(true);
    expect(Number.isFinite(out.pthLevel)).toBe(true);
  });
});
