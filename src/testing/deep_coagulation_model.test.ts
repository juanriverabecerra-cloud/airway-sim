import { describe, it, expect } from 'vitest';
import { DeepCoagulationModel } from '../engine/DeepCoagulationModel';

describe('DeepCoagulationModel — VWF, hemophilia, reversal agents, platelet function', () => {
  it('normal patient has 100% VWF activity and normal PFA closure times', () => {
    const out = DeepCoagulationModel.tick({ plateletCountK: 250 });
    expect(out.vwfActivityPercent).toBe(100);
    expect(out.pfaADPAbnormal).toBe(false);
    expect(out.pfaEpiAbnormal).toBe(false);
  });

  it('Type 1 VWD has reduced VWF activity and abnormal PFA closure times', () => {
    const vwd = DeepCoagulationModel.tick({ hasVWD: true, vwdType: '1', plateletCountK: 250 });
    expect(vwd.vwfActivityPercent).toBeLessThan(100);
    expect(vwd.pfaADPAbnormal).toBe(true);
  });

  it('DDAVP releases stored VWF and normalizes activity in Type 1 VWD (but NOT Type 2B)', () => {
    const type1WithDDAVP = DeepCoagulationModel.tick({ hasVWD: true, vwdType: '1', ddavpCe: 2.0 });
    const type2bWithDDAVP = DeepCoagulationModel.tick({ hasVWD: true, vwdType: '2B', ddavpCe: 2.0 });
    expect(type1WithDDAVP.vwfActivityPercent).toBeGreaterThan(50);
    expect(type2bWithDDAVP.vwfActivityPercent).toBeLessThan(type1WithDDAVP.vwfActivityPercent);
  });

  it('severe Hemophilia A has near-zero Factor VIII, causing impaired factor activity boost', () => {
    const severe = DeepCoagulationModel.tick({ hasHemophiliaA: true, factorVIIIPercent: 1 });
    expect(severe.factorVIIIPercent).toBeLessThan(5);
    expect(severe.effectiveFactorActivityBoost).toBeLessThan(-0.3);
  });

  it('aspirin prolongs C-Epi closure time but NOT C-ADP (aspirin blocks TXA2 but not ADP pathway)', () => {
    const noAspirin = DeepCoagulationModel.tick({ plateletCountK: 250 });
    const withAspirin = DeepCoagulationModel.tick({ plateletCountK: 250, aspirinActive: true });
    expect(withAspirin.pfaEpiClosureTimeSec).toBeGreaterThan(noAspirin.pfaEpiClosureTimeSec + 50);
    expect(withAspirin.pfaADPClosureTimeSec).toBeCloseTo(noAspirin.pfaADPClosureTimeSec, 5);
  });

  it('4-factor PCC reverses warfarin (90% reversal)', () => {
    const pcc = DeepCoagulationModel.tick({ pccGiven: true });
    expect(pcc.warfarinReversal).toBeCloseTo(0.9, 1);
  });

  it('idarucizumab reverses dabigatran nearly completely (97%)', () => {
    const idarucizumab = DeepCoagulationModel.tick({ idarucizumabGiven: true });
    expect(idarucizumab.dabigatranReversal).toBeCloseTo(0.97, 2);
  });

  it('andexanet alfa reverses Factor Xa inhibitors (apixaban/rivaroxaban)', () => {
    const andexanet = DeepCoagulationModel.tick({ andexanetGiven: true });
    expect(andexanet.fxaInhibitorReversal).toBeGreaterThan(0.8);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => DeepCoagulationModel.tick(undefined as any)).not.toThrow();
    expect(() => DeepCoagulationModel.tick({ factorVIIIPercent: NaN, plateletCountK: NaN } as any)).not.toThrow();
    const out = DeepCoagulationModel.tick({ plateletCountK: -100, factorVIIIPercent: -50 });
    expect(Number.isFinite(out.pfaADPClosureTimeSec)).toBe(true);
    expect(out.pfaADPClosureTimeSec).toBeGreaterThan(0);
  });
});
