import { describe, it, expect } from 'vitest';
import { MAOIModel } from '../engine/MAOIModel';

describe('MAOIModel — MAOI drug interaction: serotonin syndrome and hypertensive crisis', () => {
  it('no effect when MAOIs are not active', () => {
    const out = MAOIModel.tick({ maoisActive: false, meperidineCe: 5.0 });
    expect(out.maoisActive).toBe(false);
    expect(out.serotoninSyndromeActive).toBe(false);
    expect(out.hypertensiveCrisisActive).toBe(false);
  });

  it('meperidine + MAOI triggers serotonin syndrome (most dangerous combination)', () => {
    const out = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, meperidineCe: 1.0 });
    expect(out.serotoninSyndromeActive).toBe(true);
    expect(out.serotoninSyndromeSeverity).toBeGreaterThan(0.3);
    expect(out.events.some(e => e.includes('SEROTONIN SYNDROME'))).toBe(true);
  });

  it('tramadol + MAOI also triggers serotonin syndrome (same mechanism, slightly weaker)', () => {
    const meperidine = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, meperidineCe: 1.0 });
    const tramadol = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, tramadolCe: 1.0 });
    expect(tramadol.serotoninSyndromeActive).toBe(true);
    expect(meperidine.serotoninSyndromeSeverity).toBeGreaterThan(tramadol.serotoninSyndromeSeverity);
  });

  it('methylene blue + MAOI is catastrophic (methylene blue itself inhibits MAO)', () => {
    const out = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, methylene_blue_Ce: 1.0 });
    expect(out.serotoninSyndromeActive).toBe(true);
    expect(out.events.some(e => e.includes('Methylene Blue'))).toBe(true);
  });

  it('ephedrine + MAOI triggers hypertensive crisis (indirect sympathomimetic)', () => {
    const out = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, ephedrineCe: 0.5 });
    expect(out.hypertensiveCrisisActive).toBe(true);
    expect(out.hypertensiveSVRSpike).toBeGreaterThan(0);
    expect(out.events.some(e => e.includes('HYPERTENSIVE CRISIS'))).toBe(true);
  });

  it('phenylephrine is safer than ephedrine in MAOI patients (direct vs indirect mechanism)', () => {
    const ephedrine = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, ephedrineCe: 0.5 });
    const phenylephrine = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, phenylephrineCe: 0.5 });
    expect(ephedrine.hypertensiveCrisisActive).toBe(true);
    expect(phenylephrine.hypertensiveCrisisActive).toBe(false);
  });

  it('MAOI washout reduces severity proportionally (14-day washout for irreversible agents)', () => {
    const fresh = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, ephedrineCe: 0.5 });
    const partialWashout = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 7, ephedrineCe: 0.5 });
    const fullWashout = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 0, ephedrineCe: 0.5 });
    expect(fresh.hypertensiveCrisisSeverity).toBeGreaterThan(partialWashout.hypertensiveCrisisSeverity);
    expect(fullWashout.hypertensiveCrisisActive).toBe(false);
  });

  it('direct sympathomimetics have enhanced sensitivity with active MAOIs', () => {
    const noMAOI = MAOIModel.tick({ maoisActive: false });
    const withMAOI = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14 });
    expect(withMAOI.directSympatheticSensitivityMultiplier).toBeGreaterThan(noMAOI.directSympatheticSensitivityMultiplier);
  });

  it('crisis events fire on first occurrence only, not every tick', () => {
    const onset = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, meperidineCe: 1.0, prevSerotoninSyndromeLogged: false });
    expect(onset.events.some(e => e.includes('SEROTONIN SYNDROME'))).toBe(true);
    const steady = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: 14, meperidineCe: 1.0, prevSerotoninSyndromeLogged: true });
    expect(steady.events.some(e => e.includes('SEROTONIN SYNDROME'))).toBe(false);
  });

  it('falls back to sane defaults and never throws', () => {
    expect(() => MAOIModel.tick(undefined as any)).not.toThrow();
    expect(() => MAOIModel.tick({ maoisActive: true, meperidineCe: NaN } as any)).not.toThrow();
    const out = MAOIModel.tick({ maoisActive: true, maoiWashoutDaysRemaining: -5 });
    expect(Number.isFinite(out.serotoninSyndromeSeverity)).toBe(true);
  });
});
