import { describe, it, expect } from 'vitest';
import { FetalMonitoringModel } from '../engine/FetalMonitoringModel';

describe('FetalMonitoringModel — fetal HR response to maternal perfusion/oxygenation', () => {
  it('is inert (baseline FHR, no decel/bradycardia) when not pregnant', () => {
    const out = FetalMonitoringModel.tick({ isPregnant: false });
    expect(out.fetalHR).toBe(140);
    expect(out.lateDecelerationActive).toBe(false);
    expect(out.fetalBradycardiaActive).toBe(false);
  });

  it('is inert after delivery, even if isPregnant is still flagged true', () => {
    const out = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: true, maternalMAP: 40, maternalSpO2: 80 });
    expect(out.fetalHR).toBe(140);
    expect(out.lateDecelerationActive).toBe(false);
  });

  it('produces a normal baseline FHR with adequate maternal MAP/SpO2', () => {
    const out = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 90, maternalSpO2: 98 });
    expect(out.fetalHR).toBeCloseTo(140, 0);
    expect(out.lateDecelerationActive).toBe(false);
    expect(out.fetalBradycardiaActive).toBe(false);
  });

  it('maternal hypotension produces a graded late-deceleration-pattern FHR drop, worsening with severity', () => {
    const mild = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 70, maternalSpO2: 98 });
    const severe = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 40, maternalSpO2: 98 });
    expect(mild.fetalHR).toBeLessThan(140);
    expect(severe.fetalHR).toBeLessThan(mild.fetalHR);
    expect(severe.fetalBradycardiaActive).toBe(true);
  });

  it('maternal hypoxia (low SpO2) also produces fetal heart rate depression', () => {
    const normal = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 90, maternalSpO2: 98 });
    const hypoxic = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 90, maternalSpO2: 75 });
    expect(hypoxic.fetalHR).toBeLessThan(normal.fetalHR);
  });

  it('integrates directly with maternal aortocaval-compression-driven hypotension (PregnancyPhysiologyEngine.ts) by simply taking maternalMAP as input', () => {
    // A supine, undisplaced gravid patient's MAP drop (modeled by PregnancyPhysiologyEngine.ts)
    // is exactly the kind of value this model should react to -- no special-case wiring needed.
    const supineCompressed = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 55, maternalSpO2: 98 });
    expect(supineCompressed.lateDecelerationActive).toBe(true);
  });

  it('oxytocin overdose (uterine hyperstimulation) depresses FHR independently of maternal perfusion, but only above the therapeutic-dose threshold', () => {
    const therapeuticDose = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 90, maternalSpO2: 98, oxytocinCe: 1.0 });
    const overdose = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 90, maternalSpO2: 98, oxytocinCe: 20 });
    expect(therapeuticDose.uterineHyperstimulationActive).toBe(false);
    expect(overdose.uterineHyperstimulationActive).toBe(true);
    expect(overdose.fetalHR).toBeLessThan(therapeuticDose.fetalHR);
  });

  it('maternal opioids reduce FHR variability, dose-dependently', () => {
    const none = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, opioidEffect: 0 });
    const high = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, opioidEffect: 0.8 });
    expect(high.variabilityIndex).toBeLessThan(none.variabilityIndex);
  });

  it('a severely bradycardic fetus loses variability further still, an ominous combined finding', () => {
    const mild = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 70, maternalSpO2: 98 });
    const severe = FetalMonitoringModel.tick({ isPregnant: true, deliveryOccurred: false, maternalMAP: 35, maternalSpO2: 90 });
    expect(severe.variabilityIndex).toBeLessThan(mild.variabilityIndex);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => FetalMonitoringModel.tick(undefined as any)).not.toThrow();
    expect(() => FetalMonitoringModel.tick({ isPregnant: true, maternalMAP: NaN, maternalSpO2: NaN, oxytocinCe: NaN, opioidEffect: NaN } as any)).not.toThrow();
    const out = FetalMonitoringModel.tick({ isPregnant: true, maternalMAP: -50, maternalSpO2: -10, oxytocinCe: -5, opioidEffect: -1 });
    expect(Number.isFinite(out.fetalHR)).toBe(true);
    expect(Number.isFinite(out.variabilityIndex)).toBe(true);
    expect(Number.isFinite(out.fetalBradycardiaSeverity)).toBe(true);
  });
});
