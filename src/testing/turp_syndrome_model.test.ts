import { describe, it, expect } from 'vitest';
import { TurpSyndromeModel } from '../engine/TurpSyndromeModel';

describe('TurpSyndromeModel — irrigation fluid absorption during TURP', () => {
  it('produces zero rates when TURP surgery is not active', () => {
    const out = TurpSyndromeModel.tick({ turpSurgeryActive: false, resectionSeverity: 1.0 });
    expect(out.irrigationAbsorptionRateMlPerMin).toBe(0);
    expect(out.sodiumDropRateMEqPerMin).toBe(0);
    expect(out.temperatureDropRateCPerMin).toBe(0);
  });

  it('produces nonzero absorption/sodium-drop/temperature-drop rates when active', () => {
    const out = TurpSyndromeModel.tick({ turpSurgeryActive: true, resectionSeverity: 0.5 });
    expect(out.irrigationAbsorptionRateMlPerMin).toBeGreaterThan(0);
    expect(out.sodiumDropRateMEqPerMin).toBeGreaterThan(0);
    expect(out.temperatureDropRateCPerMin).toBeGreaterThan(0);
  });

  it('all rates scale with resection severity (more venous sinus opening = faster absorption)', () => {
    const mild = TurpSyndromeModel.tick({ turpSurgeryActive: true, resectionSeverity: 0.2 });
    const severe = TurpSyndromeModel.tick({ turpSurgeryActive: true, resectionSeverity: 1.0 });
    expect(severe.irrigationAbsorptionRateMlPerMin).toBeGreaterThan(mild.irrigationAbsorptionRateMlPerMin);
    expect(severe.sodiumDropRateMEqPerMin).toBeGreaterThan(mild.sodiumDropRateMEqPerMin);
  });

  it('a sustained severe resection can drop sodium by a clinically significant amount over a realistic case duration', () => {
    const out = TurpSyndromeModel.tick({ turpSurgeryActive: true, resectionSeverity: 1.0 });
    const totalDropOver75Min = out.sodiumDropRateMEqPerMin * 75;
    expect(totalDropOver75Min).toBeGreaterThan(20);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => TurpSyndromeModel.tick(undefined as any)).not.toThrow();
    expect(() => TurpSyndromeModel.tick({ turpSurgeryActive: true, resectionSeverity: NaN } as any)).not.toThrow();
    const out = TurpSyndromeModel.tick({ turpSurgeryActive: true, resectionSeverity: -5 });
    expect(Number.isFinite(out.irrigationAbsorptionRateMlPerMin)).toBe(true);
    expect(Number.isFinite(out.sodiumDropRateMEqPerMin)).toBe(true);
    expect(Number.isFinite(out.temperatureDropRateCPerMin)).toBe(true);
  });
});
