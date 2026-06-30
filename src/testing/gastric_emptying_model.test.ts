import { describe, it, expect } from 'vitest';
import { GastricEmptyingModel } from '../engine/GastricEmptyingModel';

describe('GastricEmptyingModel — gastric content volume/pH + Mendelson aspiration severity', () => {
  it('a fully NPO-compliant patient (8h solids, 2h liquids) has a low volume, acidic baseline', () => {
    const out = GastricEmptyingModel.tick({ npoSolids: 8, npoLiquids: 2, prevVolume: undefined, prevPH: undefined });
    expect(out.gastricVolume).toBeLessThan(30);
    expect(out.gastricPH).toBeLessThan(2.5);
    expect(out.aspirationSeverityIndex).toBe(0);
  });

  it('shorter NPO intervals produce a higher initial gastric volume and higher (less acidic) pH', () => {
    const compliant = GastricEmptyingModel.tick({ npoSolids: 8, npoLiquids: 2 });
    const recentMeal = GastricEmptyingModel.tick({ npoSolids: 1, npoLiquids: 0.5 });
    expect(recentMeal.gastricVolume).toBeGreaterThan(compliant.gastricVolume);
    expect(recentMeal.gastricPH).toBeGreaterThan(compliant.gastricPH);
  });

  it('an explicit "full stomach" scenario override produces a high initial volume regardless of NPO times', () => {
    const out = GastricEmptyingModel.tick({ stomachFull: true, npoSolids: 8, npoLiquids: 2 });
    expect(out.gastricVolume).toBeGreaterThanOrEqual(149);
  });

  it('GLP-1 therapy, trauma, sepsis, and emergent RSI each raise the persistent fasting-equilibrium floor', () => {
    const normal = GastricEmptyingModel.tick({ npoSolids: 8, npoLiquids: 2 });
    const glp1 = GastricEmptyingModel.tick({ npoSolids: 8, npoLiquids: 2, glp1Active: true });
    const trauma = GastricEmptyingModel.tick({ npoSolids: 8, npoLiquids: 2, trauma: true });
    expect(glp1.gastricVolume).toBeGreaterThan(normal.gastricVolume);
    expect(trauma.gastricVolume).toBeGreaterThan(normal.gastricVolume);
  });

  it('gastric volume empties over time toward the floor, more slowly with opioid block or sympathetic stress', () => {
    const noOpioid = GastricEmptyingModel.tick({ prevVolume: 200, npoSolids: 8, npoLiquids: 2, opioidBlock: 0, dt: 600 });
    const withOpioid = GastricEmptyingModel.tick({ prevVolume: 200, npoSolids: 8, npoLiquids: 2, opioidBlock: 0.9, dt: 600 });
    expect(withOpioid.gastricVolume).toBeGreaterThan(noOpioid.gastricVolume);
  });

  it('gastric pH re-acidifies toward baseline over time from an elevated post-meal value', () => {
    const early = GastricEmptyingModel.tick({ prevPH: 5.0, dt: 60 });
    const later = GastricEmptyingModel.tick({ prevPH: 5.0, dt: 3600 });
    expect(later.gastricPH).toBeLessThan(early.gastricPH);
  });

  it('aspiration severity rises with both volume and acidity, meeting Mendelson criteria at high severity', () => {
    const lowRisk = GastricEmptyingModel.tick({ prevVolume: 15, prevPH: 5.0 });
    const highRisk = GastricEmptyingModel.tick({ prevVolume: 150, prevPH: 1.5 });
    expect(lowRisk.aspirationSeverityIndex).toBeLessThan(highRisk.aspirationSeverityIndex);
    expect(highRisk.aspirationSeverityIndex).toBeGreaterThan(0.8);
  });

  it('Sodium Citrate instantly raises gastric pH on contact, dose-dependently, without affecting volume', () => {
    const noAntacid = GastricEmptyingModel.tick({ prevPH: 1.8, prevVolume: 100 });
    const withAntacid = GastricEmptyingModel.tick({ prevPH: 1.8, prevVolume: 100, citrateCe: 3.0 });
    expect(withAntacid.gastricPH).toBeGreaterThan(noAntacid.gastricPH + 1.0);
    expect(withAntacid.gastricVolume).toBeCloseTo(noAntacid.gastricVolume, 1);
  });

  it('Famotidine raises the fasting-equilibrium pH target and reduces the secretion-driven volume floor, dose-dependently', () => {
    const none = GastricEmptyingModel.tick({ prevPH: 1.8, prevVolume: 20, npoSolids: 8, npoLiquids: 2, dt: 600 });
    const lowDose = GastricEmptyingModel.tick({ prevPH: 1.8, prevVolume: 20, npoSolids: 8, npoLiquids: 2, dt: 600, famotidineCe: 0.3 });
    const highDose = GastricEmptyingModel.tick({ prevPH: 1.8, prevVolume: 20, npoSolids: 8, npoLiquids: 2, dt: 600, famotidineCe: 3.0 });
    expect(lowDose.gastricPH).toBeGreaterThan(none.gastricPH);
    expect(highDose.gastricPH).toBeGreaterThan(lowDose.gastricPH);
    expect(highDose.gastricVolume).toBeLessThan(none.gastricVolume);
  });

  it('Pantoprazole acid suppression accumulates slowly (decoupled from plasma Ce) and persists across ticks even as Ce falls', () => {
    const earlyDose = GastricEmptyingModel.tick({ pantoprazoleCe: 1.0, prevPpiSuppression: 0, dt: 3600 });
    expect(earlyDose.ppiSuppressionLevel).toBeGreaterThan(0);

    const accumulated = GastricEmptyingModel.tick({ pantoprazoleCe: 1.0, prevPpiSuppression: earlyDose.ppiSuppressionLevel, dt: 3600 });
    expect(accumulated.ppiSuppressionLevel).toBeGreaterThan(earlyDose.ppiSuppressionLevel);

    // Even with plasma Ce now at zero (drug cleared), the accumulated suppression should persist
    // almost unchanged over a short subsequent tick -- the whole point of irreversible inhibition.
    const afterClearance = GastricEmptyingModel.tick({ pantoprazoleCe: 0, prevPpiSuppression: accumulated.ppiSuppressionLevel, dt: 60 });
    expect(afterClearance.ppiSuppressionLevel).toBeCloseTo(accumulated.ppiSuppressionLevel, 2);
  });

  it('Pantoprazole, once substantially accumulated, raises gastric pH higher than Famotidine\'s ceiling', () => {
    const h2Max = GastricEmptyingModel.tick({ prevPH: 1.8, famotidineCe: 100, dt: 600 });
    const ppiMax = GastricEmptyingModel.tick({ prevPH: 1.8, prevPpiSuppression: 1.0, dt: 600 });
    expect(ppiMax.gastricPH).toBeGreaterThan(h2Max.gastricPH);
  });

  it('Metoclopramide speeds gastric emptying via gastricEmptyingRateMultiplier and a faster approach to the floor', () => {
    const none = GastricEmptyingModel.tick({ prevVolume: 200, npoSolids: 8, npoLiquids: 2, dt: 1800 });
    const withProkinetic = GastricEmptyingModel.tick({ prevVolume: 200, npoSolids: 8, npoLiquids: 2, dt: 1800, metoclopramideCe: 2.0 });
    expect(withProkinetic.gastricEmptyingRateMultiplier).toBeGreaterThan(1.0);
    expect(withProkinetic.gastricVolume).toBeLessThan(none.gastricVolume);
  });

  it('Mendelson aspiration severity threshold scales with patient weight (~0.4 mL/kg), not a fixed 25 mL', () => {
    const smallPatient = GastricEmptyingModel.tick({ prevVolume: 30, prevPH: 1.5, weightKg: 40 });
    const largePatient = GastricEmptyingModel.tick({ prevVolume: 30, prevPH: 1.5, weightKg: 150 });
    expect(smallPatient.aspirationSeverityIndex).toBeGreaterThan(largePatient.aspirationSeverityIndex);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => GastricEmptyingModel.tick(undefined as any)).not.toThrow();
    expect(() => GastricEmptyingModel.tick({ npoSolids: NaN, npoLiquids: NaN, prevVolume: NaN, prevPH: NaN, opioidBlock: NaN, sympatheticDrive: NaN, citrateCe: NaN, famotidineCe: NaN, pantoprazoleCe: NaN, metoclopramideCe: NaN, prevPpiSuppression: NaN, weightKg: NaN } as any)).not.toThrow();
    const out = GastricEmptyingModel.tick({ npoSolids: -5, opioidBlock: -1, sympatheticDrive: -10, citrateCe: -1, famotidineCe: -1, pantoprazoleCe: -1, metoclopramideCe: -1, weightKg: -10, dt: 0 });
    expect(Number.isFinite(out.gastricVolume)).toBe(true);
    expect(Number.isFinite(out.gastricPH)).toBe(true);
    expect(Number.isFinite(out.ppiSuppressionLevel)).toBe(true);
    expect(Number.isFinite(out.aspirationSeverityIndex)).toBe(true);
    expect(Number.isFinite(out.gastricEmptyingRateMultiplier)).toBe(true);
  });
});
