import { describe, it, expect } from 'vitest';
import { CarbonMonoxideModel } from '../engine/CarbonMonoxideModel';

describe('CarbonMonoxideModel — CO poisoning physiology', () => {
  describe('Safe defaults', () => {
    it('falls back safely with no inputs', () => {
      expect(() => CarbonMonoxideModel.tick(undefined as any)).not.toThrow();
      const out = CarbonMonoxideModel.tick({});
      expect(out.coHbPercent).toBeGreaterThanOrEqual(0);
    });

    it('returns near-baseline COHb without smoke exposure', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 1.0, smokeExposureActive: false, currentFiO2: 1.0 });
      // On 100% O2, COHb should DECREASE from 1.0% (elimination faster than accumulation)
      expect(out.coHbPercent).toBeLessThanOrEqual(1.0);
    });
  });

  describe('CO accumulation during smoke exposure', () => {
    it('COHb rises during active smoke exposure', () => {
      const out = CarbonMonoxideModel.tick({
        coHbPercent: 1.0, smokeExposureActive: true, smokeSeverity: 0.5,
        currentFiO2: 0.21,
      });
      expect(out.coHbPercent).toBeGreaterThan(1.0);
      expect(out.coAccumRatePerMin).toBeGreaterThan(0);
    });

    it('higher smoke severity causes faster COHb rise', () => {
      const light = CarbonMonoxideModel.tick({ coHbPercent: 1.0, smokeExposureActive: true, smokeSeverity: 0.2, currentFiO2: 0.21 });
      const heavy = CarbonMonoxideModel.tick({ coHbPercent: 1.0, smokeExposureActive: true, smokeSeverity: 1.0, currentFiO2: 0.21 });
      expect(heavy.coAccumRatePerMin).toBeGreaterThan(light.coAccumRatePerMin);
    });
  });

  describe('CO elimination kinetics', () => {
    it('100% O2 eliminates CO faster than room air', () => {
      const roomAir = CarbonMonoxideModel.tick({ coHbPercent: 30, smokeExposureActive: false, currentFiO2: 0.21 });
      const highO2 = CarbonMonoxideModel.tick({ coHbPercent: 30, smokeExposureActive: false, currentFiO2: 1.0 });
      // Per-second tick change is sub-0.01% — compare elimination RATE, not absolute value
      // 100% O2 rate constant (0.0077/min) >> room air (0.00217/min)
      expect(highO2.coElimRatePerMin).toBeGreaterThan(roomAir.coElimRatePerMin);
    });

    it('HBO eliminates CO faster than 100% O2 NBO', () => {
      const nbo = CarbonMonoxideModel.tick({ coHbPercent: 30, smokeExposureActive: false, currentFiO2: 1.0, hyperbaricO2Active: false });
      const hbo = CarbonMonoxideModel.tick({ coHbPercent: 30, smokeExposureActive: false, currentFiO2: 1.0, hyperbaricO2Active: true });
      expect(hbo.coHbPercent).toBeLessThan(nbo.coHbPercent);
    });
  });

  describe('Functional hemoglobin and tissue hypoxia', () => {
    it('functional Hb fraction decreases proportionally with COHb', () => {
      const out50 = CarbonMonoxideModel.tick({ coHbPercent: 50, smokeExposureActive: false });
      expect(out50.functionalHbFraction).toBeCloseTo(0.50, 1);
    });

    it('Haldane bohr shift is negative (left shift, worse O2 offloading)', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 30 });
      expect(out.haldaneBohrShift).toBeLessThan(0);
    });

    it('cytochrome toxicity increases above 20% COHb', () => {
      const low = CarbonMonoxideModel.tick({ coHbPercent: 10 });
      const high = CarbonMonoxideModel.tick({ coHbPercent: 45 });
      expect(low.cytochromeToxicityIndex).toBe(0);
      expect(high.cytochromeToxicityIndex).toBeGreaterThan(0);
    });
  });

  describe('Clinical threshold events', () => {
    it('fires event at COHb 20%', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 20, prevCO20Logged: false });
      expect(out.events.some(e => e.includes('CO POISONING'))).toBe(true);
      expect(out.prevCO20Logged).toBe(true);
    });

    it('does not re-fire 20% event once logged', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 22, prevCO20Logged: true });
      expect(out.events.length).toBe(0);
    });

    it('fires CRITICAL event at COHb 40%', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 40, prevCO20Logged: true, prevCO30Logged: true, prevCO40Logged: false });
      expect(out.events.some(e => e.includes('CRITICAL CO POISONING'))).toBe(true);
    });

    it('fires LETHAL event at COHb 50%', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 52, prevCO20Logged: true, prevCO30Logged: true, prevCO40Logged: true, prevCO50Logged: false });
      expect(out.events.some(e => e.includes('LETHAL'))).toBe(true);
    });

    it('resets 20% event flag when COHb drops below 18%', () => {
      const out = CarbonMonoxideModel.tick({ coHbPercent: 15, prevCO20Logged: true });
      expect(out.prevCO20Logged).toBe(false);
    });
  });
});
