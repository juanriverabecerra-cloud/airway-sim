import { describe, it, expect } from 'vitest';
import { BladderModel } from '../engine/BladderModel';

describe('BladderModel — pressure-volume mechanics, sex-specific overflow, autonomic dysreflexia', () => {
  it('does not fill while retention is inactive (the existing drainage trigger lives upstream)', () => {
    const out = BladderModel.tick({ prevVolumeMl: 0, inflowRateMlPerMin: 2, urinaryRetentionActive: false, dt: 60 });
    expect(out.bladderVolumeMl).toBe(0);
  });

  it('does not fill while a Foley is in place, even if urinaryRetentionActive is somehow still true', () => {
    const out = BladderModel.tick({ prevVolumeMl: 100, inflowRateMlPerMin: 2, urinaryRetentionActive: true, hasFoley: true, dt: 60 });
    expect(out.bladderVolumeMl).toBeLessThanOrEqual(100);
  });

  it('fills during active retention without a Foley, proportional to inflow rate and time', () => {
    const out = BladderModel.tick({ prevVolumeMl: 100, inflowRateMlPerMin: 1, urinaryRetentionActive: true, hasFoley: false, dt: 60 });
    expect(out.bladderVolumeMl).toBeCloseTo(101, 1);
  });

  it('keeps bladder pressure low (near baseline) below the ~400 mL functional capacity threshold', () => {
    const low = BladderModel.tick({ prevVolumeMl: 200 });
    const nearThreshold = BladderModel.tick({ prevVolumeMl: 390 });
    expect(low.bladderPressureCmH2O).toBeCloseTo(5, 0);
    expect(nearThreshold.bladderPressureCmH2O).toBeLessThan(10);
  });

  it('bladder pressure rises steeply above the functional capacity threshold', () => {
    const moderate = BladderModel.tick({ prevVolumeMl: 700 });
    const severe = BladderModel.tick({ prevVolumeMl: 900 });
    expect(severe.bladderPressureCmH2O).toBeGreaterThan(moderate.bladderPressureCmH2O);
    expect(moderate.bladderPressureCmH2O).toBeGreaterThan(30);
  });

  it('overflow leak activates once bladder pressure exceeds the sex-specific urethral closure pressure, capping further volume growth', () => {
    // Female closure pressure (60 cmH2O) is reached at a lower volume than male (90 cmH2O).
    const femaleAtModeratelyHighVolume = BladderModel.tick({ prevVolumeMl: 850, sex: 'female', urinaryRetentionActive: true, inflowRateMlPerMin: 1, dt: 60 });
    const maleAtSameVolume = BladderModel.tick({ prevVolumeMl: 850, sex: 'male', urinaryRetentionActive: true, inflowRateMlPerMin: 1, dt: 60 });
    expect(femaleAtModeratelyHighVolume.overflowLeakActive).toBe(true);
    expect(maleAtSameVolume.overflowLeakActive).toBe(false);
    expect(femaleAtModeratelyHighVolume.bladderVolumeMl).toBeLessThan(maleAtSameVolume.bladderVolumeMl);
  });

  it('BPH raises the effective male closure pressure further, worsening retention/distension before any overflow relief', () => {
    const noBph = BladderModel.tick({ prevVolumeMl: 950, sex: 'male', bphSeverity: 0 });
    const severeBph = BladderModel.tick({ prevVolumeMl: 950, sex: 'male', bphSeverity: 1.0 });
    expect(noBph.overflowLeakActive).toBe(true);
    expect(severeBph.overflowLeakActive).toBe(false);
  });

  it('BPH has no effect on female urethral closure pressure', () => {
    const noBph = BladderModel.tick({ prevVolumeMl: 850, sex: 'female', bphSeverity: 0 });
    const withBph = BladderModel.tick({ prevVolumeMl: 850, sex: 'female', bphSeverity: 1.0 });
    expect(withBph.overflowLeakRateMlPerMin).toBeCloseTo(noBph.overflowLeakRateMlPerMin, 2);
  });

  it('bladder volume never grows without bound -- overflow leak rate scales with the pressure excess', () => {
    const mild = BladderModel.tick({ prevVolumeMl: 850, sex: 'female' });
    const severe = BladderModel.tick({ prevVolumeMl: 1100, sex: 'female' });
    expect(severe.overflowLeakRateMlPerMin).toBeGreaterThan(mild.overflowLeakRateMlPerMin);
  });

  it('distensionSympatheticIndex is continuous and graded by pressure, not a flat on/off value', () => {
    const mild = BladderModel.tick({ prevVolumeMl: 450 });
    const moderate = BladderModel.tick({ prevVolumeMl: 650 });
    const severe = BladderModel.tick({ prevVolumeMl: 850 });
    expect(mild.distensionSympatheticIndex).toBeGreaterThan(0);
    expect(moderate.distensionSympatheticIndex).toBeGreaterThan(mild.distensionSympatheticIndex);
    expect(severe.distensionSympatheticIndex).toBeGreaterThan(moderate.distensionSympatheticIndex);
    expect(severe.distensionSympatheticIndex).toBeLessThanOrEqual(1);
  });

  it('autonomic dysreflexia requires BOTH spinal cord injury above T6 AND a bladder pressure above its (low) trigger threshold', () => {
    const sciLowPressure = BladderModel.tick({ prevVolumeMl: 200, hasSpinalCordInjuryAboveT6: true });
    expect(sciLowPressure.autonomicDysreflexiaActive).toBe(false);

    const noSciHighPressure = BladderModel.tick({ prevVolumeMl: 700, hasSpinalCordInjuryAboveT6: false });
    expect(noSciHighPressure.autonomicDysreflexiaActive).toBe(false);

    const sciHighPressure = BladderModel.tick({ prevVolumeMl: 700, hasSpinalCordInjuryAboveT6: true });
    expect(sciHighPressure.autonomicDysreflexiaActive).toBe(true);
    expect(sciHighPressure.autonomicDysreflexiaSeverity).toBeGreaterThan(0);
  });

  it('autonomic dysreflexia triggers at a much lower pressure than would concern a neurologically intact patient', () => {
    // 600 mL is well below the ~900+ mL range where the generic distension response becomes
    // severe, but already enough to trigger dysreflexia in an SCI patient.
    const out = BladderModel.tick({ prevVolumeMl: 600, hasSpinalCordInjuryAboveT6: true });
    expect(out.autonomicDysreflexiaActive).toBe(true);
    expect(out.distensionSympatheticIndex).toBeLessThan(0.5);
  });

  it('a Foley relieves autonomic dysreflexia even at a previously high volume/pressure', () => {
    const withoutFoley = BladderModel.tick({ prevVolumeMl: 700, hasSpinalCordInjuryAboveT6: true, hasFoley: false });
    const withFoley = BladderModel.tick({ prevVolumeMl: 700, hasSpinalCordInjuryAboveT6: true, hasFoley: true });
    expect(withoutFoley.autonomicDysreflexiaActive).toBe(true);
    expect(withFoley.autonomicDysreflexiaActive).toBe(false);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => BladderModel.tick(undefined as any)).not.toThrow();
    expect(() => BladderModel.tick({ prevVolumeMl: NaN, inflowRateMlPerMin: NaN, sex: 123 as any, dt: NaN } as any)).not.toThrow();
    const out = BladderModel.tick({ prevVolumeMl: -100, inflowRateMlPerMin: -5, dt: 0 });
    expect(Number.isFinite(out.bladderVolumeMl)).toBe(true);
    expect(Number.isFinite(out.bladderPressureCmH2O)).toBe(true);
    expect(Number.isFinite(out.overflowLeakRateMlPerMin)).toBe(true);
    expect(Number.isFinite(out.distensionSympatheticIndex)).toBe(true);
    expect(Number.isFinite(out.autonomicDysreflexiaSeverity)).toBe(true);
  });
});
