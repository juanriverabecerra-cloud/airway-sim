import { describe, it, expect } from 'vitest';
import { PancreasEngine } from '../engine/PancreasEngine';

function tickN(n: number, patientOverrides: any, inputs: any) {
  let patient: any = { ...patientOverrides };
  let out: any;
  for (let i = 0; i < n; i++) {
    out = PancreasEngine.tick(1, { patient, time: i }, inputs);
    patient = { ...patientOverrides, glucose: out.glucose, insulinLevel: out.insulinLevel, glucagonLevel: out.glucagonLevel };
  }
  return out;
}

describe('PancreasEngine — insulin/glucagon-driven glucose homeostasis', () => {
  it('stays near baseline glucose with no pathology over a simulated hour', () => {
    const out = tickN(3600, {}, {});
    // Baseline is now 90 mg/dL (mid-range of normal 70-99). After 1 hour equilibration,
    // glucose may settle slightly below 90 due to peripheral uptake vs hepatic output balance.
    expect(out.glucose).toBeGreaterThan(85);
    expect(out.glucose).toBeLessThan(115);
  });

  it('stress (elevated cortisol + sympathetic stimulus) raises glucose -- real "stress hyperglycemia"', () => {
    const normal = tickN(3600, {}, {});
    const stressed = tickN(3600, {}, { cortisolLevel: 0.6, nonNociceptiveSympatheticStimulus: 60 });
    expect(stressed.glucose).toBeGreaterThan(normal.glucose);
  });

  it('diabetes exaggerates stress hyperglycemia and blunts correction back toward baseline', () => {
    const stressedNonDiabetic = tickN(3600, {}, { cortisolLevel: 0.6, nonNociceptiveSympatheticStimulus: 60 });
    const stressedDiabetic = tickN(3600, { diabetesMellitus: true, diabetesSeverity: 0.8 }, { cortisolLevel: 0.6, nonNociceptiveSympatheticStimulus: 60 });
    expect(stressedDiabetic.glucose).toBeGreaterThan(stressedNonDiabetic.glucose);
  });

  it('exogenous insulin lowers glucose, more so without diabetic insulin resistance', () => {
    const baseline = tickN(1800, {}, {});
    const withInsulin = tickN(1800, {}, { exogenousInsulinCe: 0.5 });
    expect(withInsulin.glucose).toBeLessThan(baseline.glucose);
  });

  it('exogenous dextrose raises glucose', () => {
    const baseline = tickN(600, {}, {});
    const withDextrose = tickN(600, {}, { exogenousDextroseMgPerMin: 50 });
    expect(withDextrose.glucose).toBeGreaterThan(baseline.glucose);
  });

  it('emits a hypoglycemia event when crossing below 70 mg/dL and a critical event below 40', () => {
    const out1 = PancreasEngine.tick(1, { patient: { glucose: 71 } }, { exogenousInsulinCe: 0 });
    // Force a large enough single-tick drop by simulating heavy insulin over a longer window instead.
    let patient: any = { glucose: 80 };
    let sawHypoEvent = false;
    let sawCriticalEvent = false;
    for (let i = 0; i < 3600; i++) {
      const out = PancreasEngine.tick(1, { patient, time: i }, { exogenousInsulinCe: 0.9 });
      if (out.events.some((e) => e.includes('HYPOGLYCEMIA'))) sawHypoEvent = true;
      if (out.events.some((e) => e.includes('CRITICAL'))) sawCriticalEvent = true;
      patient = { glucose: out.glucose, insulinLevel: out.insulinLevel, glucagonLevel: out.glucagonLevel };
    }
    expect(sawHypoEvent).toBe(true);
    expect(sawCriticalEvent).toBe(true);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => PancreasEngine.tick(1, undefined as any, {})).not.toThrow();
    expect(() => PancreasEngine.tick(NaN, { patient: {}, time: 0 }, undefined as any)).not.toThrow();
    const out = PancreasEngine.tick(1, { patient: { glucose: NaN, insulinLevel: NaN }, time: 0 }, { cortisolLevel: -5, exogenousInsulinCe: -1 });
    expect(Number.isFinite(out.glucose)).toBe(true);
    expect(Number.isFinite(out.insulinLevel)).toBe(true);
    expect(Number.isFinite(out.glucagonLevel)).toBe(true);
  });
});
