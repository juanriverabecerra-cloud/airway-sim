import { describe, it, expect } from 'vitest';
import { LymphaticSystemModel } from '../engine/LymphaticSystemModel';

function tickN(n: number, vitals: any, patientOverrides: any = {}) {
  let patient: any = { ...patientOverrides };
  let out: any;
  for (let i = 0; i < n; i++) {
    out = LymphaticSystemModel.tick(1, { patient, vitals, time: i });
    patient = { ...patientOverrides, interstitialVolumeMl: out.interstitialVolumeMl };
  }
  return out;
}

describe('LymphaticSystemModel — capillary filtration / lymphatic return interstitial fluid balance', () => {
  it('stays at a true steady state at baseline (no net accumulation over a simulated hour)', () => {
    const out = tickN(3600, { cvp: 5 });
    expect(out.thirdSpacedVolumeMl).toBeCloseTo(0, 0);
    expect(out.edemaSeverity).toBe('none');
  });

  it('capillary leak (sepsis) produces edema accumulation over a simulated hour', () => {
    const normal = tickN(3600, { cvp: 5 });
    const septic = tickN(3600, { cvp: 5 }, { isSeptic: true });
    expect(septic.thirdSpacedVolumeMl).toBeGreaterThan(normal.thirdSpacedVolumeMl);
    expect(septic.netFiltrationRateMlPerMin).toBeGreaterThan(normal.netFiltrationRateMlPerMin);
  });

  it('hypoalbuminemia (reduced plasma oncotic pressure) produces more edema than normal albumin', () => {
    const normal = tickN(3600, { cvp: 5 }, { albumin: 4.0 });
    const low = tickN(3600, { cvp: 5 }, { albumin: 2.0 });
    expect(low.thirdSpacedVolumeMl).toBeGreaterThan(normal.thirdSpacedVolumeMl);
  });

  it('elevated CVP (e.g. right heart failure) raises capillary hydrostatic pressure and produces edema', () => {
    const normal = tickN(3600, { cvp: 5 });
    const chf = tickN(3600, { cvp: 20 });
    expect(chf.thirdSpacedVolumeMl).toBeGreaterThan(normal.thirdSpacedVolumeMl);
  });

  it('lymphatic obstruction reduces drainage capacity, producing edema even without increased filtration', () => {
    const normal = tickN(3600, { cvp: 5 });
    const obstructed = tickN(3600, { cvp: 5 }, { lymphaticObstructionSeverity: 0.9 });
    expect(obstructed.thirdSpacedVolumeMl).toBeGreaterThan(normal.thirdSpacedVolumeMl);
    // Filtration rate itself shouldn't differ much (the obstruction is downstream of filtration)
    expect(Math.abs(obstructed.netFiltrationRateMlPerMin - normal.netFiltrationRateMlPerMin)).toBeLessThan(2);
  });

  it('classifies edema severity by accumulated third-spaced volume', () => {
    const mild = tickN(1, { cvp: 5 }, { interstitialVolumeMl: 10000 + 600 });
    const moderate = tickN(1, { cvp: 5 }, { interstitialVolumeMl: 10000 + 2500 });
    const severe = tickN(1, { cvp: 5 }, { interstitialVolumeMl: 10000 + 4500 });
    expect(mild.edemaSeverity).toBe('mild');
    expect(moderate.edemaSeverity).toBe('moderate');
    expect(severe.edemaSeverity).toBe('severe');
  });

  it('combined sepsis + hypoalbuminemia (e.g. septic shock with capillary leak) produces more edema than either alone', () => {
    const sepsisOnly = tickN(3600, { cvp: 5 }, { isSeptic: true, albumin: 4.0 });
    const combined = tickN(3600, { cvp: 5 }, { isSeptic: true, albumin: 2.0 });
    expect(combined.thirdSpacedVolumeMl).toBeGreaterThan(sepsisOnly.thirdSpacedVolumeMl);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => LymphaticSystemModel.tick(1, undefined as any)).not.toThrow();
    expect(() => LymphaticSystemModel.tick(NaN, { patient: {}, vitals: {}, time: 0 })).not.toThrow();
    expect(() => LymphaticSystemModel.tick(1, { patient: { albumin: -5, interstitialVolumeMl: -100 }, vitals: { cvp: -10 }, time: 0 })).not.toThrow();
    const out = LymphaticSystemModel.tick(1, { patient: { interstitialVolumeMl: NaN }, vitals: {}, time: 0 });
    expect(Number.isFinite(out.interstitialVolumeMl)).toBe(true);
    expect(Number.isFinite(out.thirdSpacedVolumeMl)).toBe(true);
  });
});
