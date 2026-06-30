import { describe, it, expect } from 'vitest';
import { PregnancyPhysiologyEngine } from '../engine/PregnancyPhysiologyEngine';

describe('PregnancyPhysiologyEngine — CV/Resp/GI changes of pregnancy', () => {
  it('produces zero/neutral effects when not pregnant', () => {
    const out = PregnancyPhysiologyEngine.tick({ isPregnant: false });
    expect(out.bloodVolumeExpansionMl).toBe(0);
    expect(out.svrMultiplier).toBe(1.0);
    expect(out.hrBaselineShift).toBe(0);
    expect(out.frcMultiplier).toBe(1.0);
    expect(out.metabolicMultiplier).toBe(1.0);
    expect(out.baselinePaCO2Target).toBe(40.0);
    expect(out.aortocavalCompressionActive).toBe(false);
    expect(out.giMotilitySlowingActive).toBe(false);
  });

  it('produces minimal hemodynamic/respiratory effect in the 1st trimester (before 12 weeks)', () => {
    const out = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 8 });
    expect(out.bloodVolumeExpansionMl).toBe(0);
    expect(out.svrMultiplier).toBe(1.0);
    expect(out.hrBaselineShift).toBe(0);
  });

  it('scales blood volume expansion, SVR decrease, and HR increase with gestational age, peaking near term', () => {
    const midTrimester = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 26 });
    const term = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 40 });
    expect(term.bloodVolumeExpansionMl).toBeGreaterThan(midTrimester.bloodVolumeExpansionMl);
    expect(term.svrMultiplier).toBeLessThan(midTrimester.svrMultiplier);
    expect(term.hrBaselineShift).toBeGreaterThan(midTrimester.hrBaselineShift);
    expect(term.bloodVolumeExpansionMl).toBeCloseTo(1800, 0);
    expect(term.svrMultiplier).toBeCloseTo(0.8, 2);
    expect(term.hrBaselineShift).toBeCloseTo(15, 0);
  });

  it('decreases FRC and increases metabolic rate (VO2) with gestational age, and lowers baseline PaCO2 toward ~32 mmHg at term', () => {
    const term = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 40 });
    expect(term.frcMultiplier).toBeCloseTo(0.8, 2);
    expect(term.metabolicMultiplier).toBeCloseTo(1.2, 2);
    expect(term.baselinePaCO2Target).toBeCloseTo(32, 0);
  });

  it('GI motility slowing (LES tone penalty) becomes active earlier than the mechanical/hemodynamic changes (progesterone effect)', () => {
    const earlyPregnancy = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 16 });
    expect(earlyPregnancy.giMotilitySlowingActive).toBe(true);
    expect(earlyPregnancy.lesTonePenaltyFraction).toBeGreaterThan(0);
    // GI effects ramp from week 8, ahead of the mechanical/hemodynamic ramp starting at week 12 --
    // at week 16, GI is further along its own ramp than the hemodynamic changes are along theirs.
    const giRampProgress = earlyPregnancy.lesTonePenaltyFraction / 0.3;
    const hemodynamicRampProgress = (1.0 - earlyPregnancy.svrMultiplier) / 0.20;
    expect(giRampProgress).toBeGreaterThan(hemodynamicRampProgress);
  });

  it('aortocaval compression requires BOTH gestational age > ~20 weeks AND a flat supine-like position', () => {
    const earlySupine = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 15, position: 'Supine' });
    expect(earlySupine.aortocavalCompressionActive).toBe(false);

    const termLateral = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 38, position: 'Lateral' });
    expect(termLateral.aortocavalCompressionActive).toBe(false);

    const termSupine = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 38, position: 'Supine' });
    expect(termSupine.aortocavalCompressionActive).toBe(true);
    expect(termSupine.aortocavalCompressionPreloadPenaltyMl).toBeGreaterThan(0);
  });

  it('left uterine displacement relieves aortocaval compression even when otherwise supine at term', () => {
    const withoutDisplacement = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 38, position: 'Supine', leftUterineDisplacement: false });
    const withDisplacement = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 38, position: 'Supine', leftUterineDisplacement: true });
    expect(withoutDisplacement.aortocavalCompressionActive).toBe(true);
    expect(withDisplacement.aortocavalCompressionActive).toBe(false);
    expect(withDisplacement.aortocavalCompressionPreloadPenaltyMl).toBe(0);
  });

  it('aortocaval compression severity (and preload penalty) increases with gestational age past 20 weeks', () => {
    const earlyThird = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 28, position: 'Supine' });
    const term = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 40, position: 'Supine' });
    expect(term.aortocavalCompressionSeverity).toBeGreaterThan(earlyThird.aortocavalCompressionSeverity);
    expect(term.aortocavalCompressionPreloadPenaltyMl).toBeGreaterThan(earlyThird.aortocavalCompressionPreloadPenaltyMl);
  });

  it('defaults to near-term gestational age (38 weeks) when isPregnant is true but gestationalAgeWeeks is unspecified', () => {
    const unspecified = PregnancyPhysiologyEngine.tick({ isPregnant: true });
    const explicit38 = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 38 });
    expect(unspecified.bloodVolumeExpansionMl).toBeCloseTo(explicit38.bloodVolumeExpansionMl, 1);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => PregnancyPhysiologyEngine.tick(undefined as any)).not.toThrow();
    expect(() => PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: NaN, position: 123 as any } as any)).not.toThrow();
    const out = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: -50, position: 'Nonexistent' });
    expect(Number.isFinite(out.bloodVolumeExpansionMl)).toBe(true);
    expect(Number.isFinite(out.svrMultiplier)).toBe(true);
    expect(Number.isFinite(out.hrBaselineShift)).toBe(true);
    expect(Number.isFinite(out.frcMultiplier)).toBe(true);
    expect(Number.isFinite(out.metabolicMultiplier)).toBe(true);
    expect(Number.isFinite(out.baselinePaCO2Target)).toBe(true);
    expect(Number.isFinite(out.aortocavalCompressionSeverity)).toBe(true);
    expect(Number.isFinite(out.aortocavalCompressionPreloadPenaltyMl)).toBe(true);
    expect(Number.isFinite(out.lesTonePenaltyFraction)).toBe(true);

    const outOver = PregnancyPhysiologyEngine.tick({ isPregnant: true, gestationalAgeWeeks: 999, position: 'Supine' });
    expect(Number.isFinite(outOver.aortocavalCompressionSeverity)).toBe(true);
    expect(outOver.aortocavalCompressionSeverity).toBeLessThanOrEqual(1);
  });
});
