import { describe, it, expect } from 'vitest';
import { HpaAxisModel } from '../engine/HpaAxisModel';

describe('HpaAxisModel — chronic steroid suppression and perioperative adrenal crisis', () => {
  it('no suppression for short-duration or low-dose steroid use', () => {
    const shortTerm = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 10, chronicSteroidDurationWeeks: 1 });
    const lowDose = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 3, chronicSteroidDurationWeeks: 12 });
    expect(shortTerm.hpaSuppressionFraction).toBe(0);
    expect(lowDose.hpaSuppressionFraction).toBe(0);
  });

  it('suppression scales with dose and duration above the threshold (≥5 mg/day, ≥3 weeks)', () => {
    const mild = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 10, chronicSteroidDurationWeeks: 6 });
    const severe = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 20, chronicSteroidDurationWeeks: 52 });
    expect(mild.hpaSuppressionFraction).toBeGreaterThan(0);
    expect(severe.hpaSuppressionFraction).toBeGreaterThan(mild.hpaSuppressionFraction);
  });

  it('cortisol deficit is proportional to stress level and suppression during intraoperative stress', () => {
    const baseline = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 15, chronicSteroidDurationWeeks: 26, surgicalStressLevel: 'none', isIntraoperative: false });
    const minor = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 15, chronicSteroidDurationWeeks: 26, surgicalStressLevel: 'minor', isIntraoperative: true });
    const major = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 15, chronicSteroidDurationWeeks: 26, surgicalStressLevel: 'major', isIntraoperative: true });
    expect(baseline.cortisolStressDeficit).toBe(0);
    expect(major.cortisolStressDeficit).toBeGreaterThan(minor.cortisolStressDeficit);
    expect(major.cortisolStressDeficit).toBeGreaterThan(0.5);
  });

  it('adrenal crisis activates when: intraoperative + significant deficit + hypotension + no stress-dose coverage', () => {
    const crisis = HpaAxisModel.tick({
      chronicPrednisoneDoseEquivMgPerDay: 15, chronicSteroidDurationWeeks: 52,
      surgicalStressLevel: 'major', isIntraoperative: true,
      mapMmHg: 55, dexamethasoneCe: 0, hydrocortisoneCe: 0
    });
    expect(crisis.adrenalCrisisActive).toBe(true);
    expect(crisis.events.some(e => e.includes('Adrenal Crisis'))).toBe(true);
  });

  it('stress-dose steroids (dexamethasone or hydrocortisone) prevent adrenal crisis', () => {
    const withDex = HpaAxisModel.tick({
      chronicPrednisoneDoseEquivMgPerDay: 15, chronicSteroidDurationWeeks: 52,
      surgicalStressLevel: 'major', isIntraoperative: true,
      mapMmHg: 55, dexamethasoneCe: 0.5
    });
    expect(withDex.stressDoseCoverageAdequate).toBe(true);
    expect(withDex.adrenalCrisisActive).toBe(false);
  });

  it('catecholamine sensitivity reduction is proportional to cortisol deficit (vasopressor resistance)', () => {
    const noDeficit = HpaAxisModel.tick({ surgicalStressLevel: 'none', isIntraoperative: false });
    const highDeficit = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: 20, chronicSteroidDurationWeeks: 52, surgicalStressLevel: 'major', isIntraoperative: true });
    expect(highDeficit.catecholamineSensitivityReduction).toBeGreaterThan(noDeficit.catecholamineSensitivityReduction);
    expect(highDeficit.catecholamineSensitivityReduction).toBeGreaterThan(0.2);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => HpaAxisModel.tick(undefined as any)).not.toThrow();
    expect(() => HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: NaN, mapMmHg: NaN } as any)).not.toThrow();
    const out = HpaAxisModel.tick({ chronicPrednisoneDoseEquivMgPerDay: -100, chronicSteroidDurationWeeks: -5 });
    expect(Number.isFinite(out.hpaSuppressionFraction)).toBe(true);
    expect(out.hpaSuppressionFraction).toBeGreaterThanOrEqual(0);
  });
});
