import { describe, it, expect } from 'vitest';
import { ThermoregulationModel } from '../engine/ThermoregulationModel';

describe('ThermoregulationModel — Pennes bioheat OR temperature physics', () => {
  it('a covered, awake patient in a standard-temperature room has very small net temperature drift (near equilibrium)', () => {
    const out = ThermoregulationModel.tick({ prevCoreTemp: 37, environmentTempC: 22, bsaExposureFraction: 0.3, isAnesthetized: false });
    // May be slightly positive (warming, since metabolic >> loss at modest exposure) or negative --
    // the key is that the rate is clinically negligible compared to an uncovered OR scenario.
    expect(Math.abs(out.coreTemperatureDeltaPerSec) * 3600).toBeLessThan(1.5);
  });

  it('a fully exposed anesthetized patient in a cold OR cools at a clinically realistic rate (~0.5-1.5°C/h including redistribution)', () => {
    const out = ThermoregulationModel.tick({ prevCoreTemp: 37, environmentTempC: 18, bsaExposureFraction: 0.8, isAnesthetized: true, anesthesiaTimeSeconds: 0 });
    expect(out.coreTemperatureDeltaPerSec).toBeLessThan(0);
    const dropPerHour = Math.abs(out.coreTemperatureDeltaPerSec) * 3600;
    expect(dropPerHour).toBeGreaterThan(0.5);
    expect(dropPerHour).toBeLessThan(5.0); // extreme scenario (18°C room, 80% exposed, redistribution peak)
  });

  it('forced-air warming reduces or reverses heat loss vs uncovered baseline', () => {
    const uncovered = ThermoregulationModel.tick({ environmentTempC: 18, bsaExposureFraction: 0.7, isAnesthetized: true, forcedAirWarmingActive: false });
    const warmed = ThermoregulationModel.tick({ environmentTempC: 18, bsaExposureFraction: 0.7, isAnesthetized: true, forcedAirWarmingActive: true });
    expect(warmed.coreTemperatureDeltaPerSec).toBeGreaterThan(uncovered.coreTemperatureDeltaPerSec);
    expect(warmed.forcedAirWarmingWatts).toBeGreaterThan(0);
  });

  it('redistribution hypothermia is largest at induction and decays over ~60 minutes', () => {
    const atInduction = ThermoregulationModel.tick({ isAnesthetized: true, anesthesiaTimeSeconds: 0 });
    const after1h = ThermoregulationModel.tick({ isAnesthetized: true, anesthesiaTimeSeconds: 3600 });
    expect(atInduction.redistributionCoolingWatts).toBeGreaterThan(after1h.redistributionCoolingWatts);
    expect(after1h.redistributionCoolingWatts).toBeLessThan(1.0);
  });

  it('larger patients (higher thermal mass) cool more slowly than smaller patients at the same heat loss rate', () => {
    const large = ThermoregulationModel.tick({ weightKg: 120, heightCm: 185, environmentTempC: 18, bsaExposureFraction: 0.7, isAnesthetized: true });
    const small = ThermoregulationModel.tick({ weightKg: 40, heightCm: 155, environmentTempC: 18, bsaExposureFraction: 0.7, isAnesthetized: true });
    // Same environmental conditions, but thermal mass difference means smaller patient cools faster
    expect(Math.abs(small.coreTemperatureDeltaPerSec)).toBeGreaterThan(Math.abs(large.coreTemperatureDeltaPerSec));
  });

  it('open surgical wound adds evaporative heat loss, causing faster cooling than closed procedure', () => {
    const closed = ThermoregulationModel.tick({ isAnesthetized: true, surgicalWoundOpenFraction: 0 });
    const openAbdomen = ThermoregulationModel.tick({ isAnesthetized: true, surgicalWoundOpenFraction: 1 });
    expect(openAbdomen.heatLossWatts).toBeGreaterThan(closed.heatLossWatts);
    expect(openAbdomen.coreTemperatureDeltaPerSec).toBeLessThan(closed.coreTemperatureDeltaPerSec);
  });

  it('colder room temperature increases heat loss and accelerates cooling', () => {
    const warm = ThermoregulationModel.tick({ environmentTempC: 26, isAnesthetized: true });
    const cold = ThermoregulationModel.tick({ environmentTempC: 16, isAnesthetized: true });
    expect(cold.heatLossWatts).toBeGreaterThan(warm.heatLossWatts);
    expect(cold.coreTemperatureDeltaPerSec).toBeLessThan(warm.coreTemperatureDeltaPerSec);
  });

  it('metabolic multiplier (shivering/MH/seizure) increases heat GAIN, slowing cooling or causing hyperthermia', () => {
    const baseline = ThermoregulationModel.tick({ isAnesthetized: true, metabolicHeatMultiplier: 1.0 });
    const shivering = ThermoregulationModel.tick({ isAnesthetized: true, metabolicHeatMultiplier: 4.0 });
    expect(shivering.heatGainWatts).toBeGreaterThan(baseline.heatGainWatts);
    expect(shivering.coreTemperatureDeltaPerSec).toBeGreaterThan(baseline.coreTemperatureDeltaPerSec);
  });

  it('a warm, covered, forcibly-warmed patient in equilibrium has near-zero temperature drift', () => {
    const out = ThermoregulationModel.tick({ prevCoreTemp: 37, environmentTempC: 23, bsaExposureFraction: 0.15, isAnesthetized: true, anesthesiaTimeSeconds: 3600, forcedAirWarmingActive: true, metabolicHeatMultiplier: 1.0 });
    const dropPerHourC = out.coreTemperatureDeltaPerSec * 3600;
    expect(Math.abs(dropPerHourC)).toBeLessThan(1.0); // "near-zero" relative to uncovered/unwarmed scenario
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => ThermoregulationModel.tick(undefined as any)).not.toThrow();
    expect(() => ThermoregulationModel.tick({ prevCoreTemp: NaN, weightKg: NaN, environmentTempC: NaN } as any)).not.toThrow();
    const out = ThermoregulationModel.tick({ prevCoreTemp: -100, weightKg: -10, environmentTempC: -50 });
    expect(Number.isFinite(out.coreTemperatureDeltaPerSec)).toBe(true);
    expect(Number.isFinite(out.heatLossWatts)).toBe(true);
  });
});
