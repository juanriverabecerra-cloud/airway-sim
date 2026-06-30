import { describe, it, expect } from 'vitest';
import { SepsisCascadeModel } from '../engine/SepsisCascadeModel';

describe('SepsisCascadeModel — dynamic SIRS→Septic Shock severity progression', () => {
  it('produces zero physiologic effect when not septic', () => {
    const out = SepsisCascadeModel.tick({ isSeptic: false });
    expect(out.sepsisScore).toBe(0);
    expect(out.svrMultiplierFromSepsis).toBe(1.0);
    expect(out.lactateContributionMmolL).toBe(0);
    expect(out.cardiacFunctionMultiplier).toBe(1.0);
  });

  it('untreated sepsis (no MAP support, no source control) progresses toward septic shock over time', () => {
    // Simulate 2 hours of sepsis without adequate MAP support (MAP 45, no source control)
    const out = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 0.5, mapMmHg: 45, dt: 7200 });
    expect(out.sepsisScore).toBeGreaterThan(2.0);
  });

  it('adequate MAP support (>65 mmHg) significantly slows sepsis progression', () => {
    const untreated = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 1.0, mapMmHg: 45, dt: 1800 });
    const supported = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 1.0, mapMmHg: 75, dt: 1800 });
    expect(untreated.sepsisScore).toBeGreaterThan(supported.sepsisScore);
  });

  it('source control actively reverses sepsis progression once MAP is also adequate', () => {
    const noControl = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 2.0, mapMmHg: 70, dt: 3600 });
    const withControl = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 2.0, mapMmHg: 70, sourceControlActive: true, dt: 3600 });
    expect(withControl.sepsisScore).toBeLessThan(noControl.sepsisScore);
  });

  it('corticosteroids slow sepsis progression without eliminating the source', () => {
    const noSteroid = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 2.5, mapMmHg: 60, dt: 3600 });
    const withSteroid = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 2.5, mapMmHg: 60, corticosteroidCe: 0.5, dt: 3600 });
    expect(withSteroid.sepsisScore).toBeLessThan(noSteroid.sepsisScore);
  });

  it('SVR multiplier decreases proportionally with score (progressive vasodilation)', () => {
    const mild = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 0.5 });
    const shock = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 3.0 });
    expect(shock.svrMultiplierFromSepsis).toBeLessThan(mild.svrMultiplierFromSepsis);
    expect(shock.svrMultiplierFromSepsis).toBeCloseTo(0.6, 1);
  });

  it('lactate rises with severity, reflecting tissue hypoperfusion', () => {
    const mild = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 0.5 });
    const shock = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 3.0 });
    expect(shock.lactateContributionMmolL).toBeGreaterThan(mild.lactateContributionMmolL);
    expect(shock.lactateContributionMmolL).toBeGreaterThan(2.0);
  });

  it('septic cardiomyopathy (cardiac depression) only emerges at score > 2', () => {
    const moderate = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 1.5 });
    const shock = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: 3.0 });
    expect(moderate.cardiacFunctionMultiplier).toBe(1.0);
    expect(shock.cardiacFunctionMultiplier).toBeLessThan(1.0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => SepsisCascadeModel.tick(undefined as any)).not.toThrow();
    expect(() => SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: NaN, mapMmHg: NaN, dt: NaN } as any)).not.toThrow();
    const out = SepsisCascadeModel.tick({ isSeptic: true, prevSepsisScore: -5, mapMmHg: -50 });
    expect(Number.isFinite(out.sepsisScore)).toBe(true);
    expect(out.sepsisScore).toBeGreaterThanOrEqual(0);
    expect(out.sepsisScore).toBeLessThanOrEqual(3);
  });
});
