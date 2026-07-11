import { describe, it, expect } from 'vitest';
import { PneumoperitoneumModel } from '../engine/PneumoperitoneumModel';

describe('PneumoperitoneumModel — laparoscopic CO2 pneumoperitoneum physiology', () => {
  it('inactive when pneumoperitoneum not established', () => {
    const out = PneumoperitoneumModel.tick({ active: false });
    expect(out.active).toBe(false);
    expect(out.peritonealCO2AbsorptionMlPerMin).toBe(0);
    expect(out.svrIncreaseFraction).toBe(0);
    expect(out.cardiacOutputFraction).toBe(1.0);
  });

  it('at standard IAP 12 mmHg produces CO2 absorption requiring MV increase', () => {
    const out = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, durationMinutes: 30 });
    expect(out.peritonealCO2AbsorptionMlPerMin).toBeGreaterThan(0);
    expect(out.recommendedMVIncreasePercent).toBeGreaterThan(0);
    // CO2 absorption requires proportional MV increase to maintain normocapnia
    expect(out.peritonealCO2AbsorptionMlPerMin).toBeGreaterThan(3);
  });

  it('SVR increases with IAP (mechanical aortic compression)', () => {
    const low = PneumoperitoneumModel.tick({ active: true, iapMmHg: 8 });
    const high = PneumoperitoneumModel.tick({ active: true, iapMmHg: 20 });
    expect(high.svrIncreaseFraction).toBeGreaterThan(low.svrIncreaseFraction);
  });

  it('cardiac output decreases despite elevated IAP (afterload increase predominates)', () => {
    const out = PneumoperitoneumModel.tick({ active: true, iapMmHg: 15 });
    expect(out.cardiacOutputFraction).toBeLessThan(1.0);
    expect(out.cardiacOutputFraction).toBeGreaterThan(0.6);
  });

  it('Trendelenburg position augments preload compared to reverse Trendelenburg', () => {
    const trendelenburg = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, position: 'Trendelenburg' });
    const revT = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, position: 'Rev Trendelenburg' });
    expect(trendelenburg.preloadModMl).toBeGreaterThan(revT.preloadModMl);
  });

  it('subcutaneous emphysema dramatically increases CO2 absorption and MV requirement', () => {
    const normal = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, durationMinutes: 30 });
    const emphysema = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, durationMinutes: 30, hasSubcutaneousEmphysema: true });
    expect(emphysema.peritonealCO2AbsorptionMlPerMin).toBeGreaterThan(normal.peritonealCO2AbsorptionMlPerMin * 2);
    expect(emphysema.events.some(e => e.includes('emphysema'))).toBe(true);
  });

  it('ICP increases with Trendelenburg + CO2 absorption', () => {
    const supine = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, durationMinutes: 30, position: 'Supine' });
    const trendelenburg = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12, durationMinutes: 30, position: 'Trendelenburg' });
    expect(trendelenburg.icpContributionMmHg).toBeGreaterThan(supine.icpContributionMmHg);
  });

  it('FRC decreases from diaphragm elevation, worsening with IAP', () => {
    const out12 = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12 });
    const out20 = PneumoperitoneumModel.tick({ active: true, iapMmHg: 20 });
    expect(out20.frcReductionFraction).toBeGreaterThan(out12.frcReductionFraction);
  });

  it('renal blood flow is significantly reduced even at therapeutic IAP', () => {
    const out = PneumoperitoneumModel.tick({ active: true, iapMmHg: 12 });
    expect(out.rebloodFlowReductionFraction).toBeGreaterThan(0.25);
  });

  it('falls back to sane defaults and never throws', () => {
    expect(() => PneumoperitoneumModel.tick(undefined as any)).not.toThrow();
    expect(() => PneumoperitoneumModel.tick({ active: true, iapMmHg: NaN } as any)).not.toThrow();
    const out = PneumoperitoneumModel.tick({ active: true, iapMmHg: -5 });
    expect(Number.isFinite(out.cardiacOutputFraction)).toBe(true);
    expect(out.cardiacOutputFraction).toBeGreaterThan(0);
  });
});
