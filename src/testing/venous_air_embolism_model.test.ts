import { describe, it, expect } from 'vitest';
import { VenousAirEmbolismModel } from '../engine/VenousAirEmbolismModel';

describe('VenousAirEmbolismModel — venous air embolism and paradoxical embolism', () => {
  it('inactive when no VAE', () => {
    const out = VenousAirEmbolismModel.tick({ active: false });
    expect(out.active).toBe(false);
    expect(out.millWheelMurmur).toBe(false);
    expect(out.cardiacOutputFraction).toBe(1.0);
  });

  it('small air volume: mill-wheel murmur but hemodynamically stable', () => {
    const out = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 30 });
    expect(out.millWheelMurmur).toBe(true);
    expect(out.cardiacOutputFraction).toBeGreaterThan(0.85);
  });

  it('large air volume causes significant hemodynamic compromise', () => {
    const out = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 250 });
    expect(out.cardiacOutputFraction).toBeLessThan(0.7);
    expect(out.pvrIncreaseFraction).toBeGreaterThan(1.0);
    expect(out.etco2DropMmHg).toBeGreaterThan(5);
  });

  it('N2O dramatically worsens VAE by diffusing into bubbles and increasing their size', () => {
    const noN2O = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 100, hasN2O: false });
    const withN2O = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 100, hasN2O: true });
    expect(withN2O.effectiveAirVolumeMl).toBeGreaterThan(noN2O.effectiveAirVolumeMl * 1.5);
    expect(withN2O.cardiacOutputFraction).toBeLessThan(noN2O.cardiacOutputFraction);
  });

  it("Durant's maneuver + CVC aspiration + 100% O2 significantly reduces severity", () => {
    const untreated = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 150 });
    const treated = VenousAirEmbolismModel.tick({
      active: true, airVolumeMl: 150,
      durantsManeuvreActive: true, aspiratingCVC: true, fiO2100: true
    });
    expect(treated.effectiveAirVolumeMl).toBeLessThan(untreated.effectiveAirVolumeMl * 0.5);
    expect(treated.cardiacOutputFraction).toBeGreaterThan(untreated.cardiacOutputFraction);
  });

  it('paradoxical embolism risk requires both PFO presence AND RV hypertension', () => {
    const noPFO = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 200, hasPFO: false });
    const withPFO = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 200, hasPFO: true });
    expect(noPFO.paradoxicalEmbolismRisk).toBe(0);
    expect(withPFO.paradoxicalEmbolismRisk).toBeGreaterThan(0);
  });

  it('fires mill-wheel murmur event on first occurrence', () => {
    const onset = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 50, prevMillWheelLogged: false });
    expect(onset.millWheelMurmur).toBe(true);
    expect(onset.events.some(e => e.includes('Mill-Wheel'))).toBe(true);
    const steady = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: 50, prevMillWheelLogged: true });
    expect(steady.events.some(e => e.includes('Mill-Wheel'))).toBe(false);
  });

  it('falls back safely and never throws', () => {
    expect(() => VenousAirEmbolismModel.tick(undefined as any)).not.toThrow();
    expect(() => VenousAirEmbolismModel.tick({ active: true, airVolumeMl: NaN } as any)).not.toThrow();
    const out = VenousAirEmbolismModel.tick({ active: true, airVolumeMl: -50 });
    expect(Number.isFinite(out.cardiacOutputFraction)).toBe(true);
  });
});
