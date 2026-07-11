import { describe, it, expect } from 'vitest';
import { ThyroidStormTreatmentModel } from '../engine/ThyroidStormTreatmentModel';

describe('ThyroidStormTreatmentModel — Burch-Wartofsky, drug cascade, iodide timing', () => {
  it('falls back safely with no inputs', () => {
    expect(() => ThyroidStormTreatmentModel.tick(undefined as any)).not.toThrow();
    const out = ThyroidStormTreatmentModel.tick({});
    expect(out.isThyroidStorm).toBe(false);
  });

  describe('Burch-Wartofsky scoring', () => {
    it('normal vitals = low Burch-Wartofsky score', () => {
      const out = ThyroidStormTreatmentModel.tick({ currentHR: 80, currentTemp: 37.0 });
      expect(out.burchWartofsky).toBeLessThan(45);
      expect(out.isThyroidStorm).toBe(false);
    });

    it('high HR + high temp + AF = thyroid storm (score > 45)', () => {
      const out = ThyroidStormTreatmentModel.tick({
        currentHR: 148, currentTemp: 39.6, hasAF: true,
      });
      expect(out.burchWartofsky).toBeGreaterThan(45);
      expect(out.isThyroidStorm).toBe(true);
    });

    it('delirium/seizures dramatically increase score', () => {
      const without = ThyroidStormTreatmentModel.tick({ currentHR: 130, currentTemp: 39.0 });
      const with_ = ThyroidStormTreatmentModel.tick({ currentHR: 130, currentTemp: 39.0, hasDeliriumOrSeizures: true });
      expect(with_.burchWartofsky).toBeGreaterThan(without.burchWartofsky + 20);
    });
  });

  describe('Treatment cascade efficacy', () => {
    it('PTU reduces T3/T4 level (synthesis block)', () => {
      const noTx = ThyroidStormTreatmentModel.tick({ thyroidStormActive: true, ptuCe: 0 });
      const withPTU = ThyroidStormTreatmentModel.tick({ thyroidStormActive: true, ptuCe: 2.0 });
      expect(withPTU.t3T4ReductionFraction).toBeGreaterThan(noTx.t3T4ReductionFraction);
    });

    it('Lugol\'s iodide is safe only after PTU (CRITICAL SEQUENCING)', () => {
      const safeAfterPTU = ThyroidStormTreatmentModel.tick({
        thyroidStormActive: true, ptuCe: 2.0, lugolsIodideCe: 1.5, ptuGivenBeforeIodide: true,
      });
      const unsafe = ThyroidStormTreatmentModel.tick({
        thyroidStormActive: true, ptuCe: 0, lugolsIodideCe: 1.5, ptuGivenBeforeIodide: false,
      });
      expect(safeAfterPTU.iodideSafeToGive).toBe(true);
      expect(unsafe.iodideSafeToGive).toBe(false);
    });

    it('fires iodide timing error when given before PTU', () => {
      const out = ThyroidStormTreatmentModel.tick({
        thyroidStormActive: true, ptuCe: 0, lugolsIodideCe: 1.5,
        ptuGivenBeforeIodide: false, prevIodideTimingLogged: false,
      });
      expect(out.events.some(e => e.includes('IODIDE TIMING ERROR'))).toBe(true);
    });

    it('combined PTU + Lugol\'s + beta-blocker + steroid achieves high efficacy', () => {
      const maxTx = ThyroidStormTreatmentModel.tick({
        thyroidStormActive: true,
        ptuCe: 2.5, lugolsIodideCe: 1.5, ptuGivenBeforeIodide: true,
        betaBlockerCe: 2.0, hydrocortisoneCe: 2.0,
      });
      expect(maxTx.treatmentEfficacy).toBeGreaterThan(0.7);
    });

    it('beta-blocker reduces HR in thyroid storm', () => {
      const out = ThyroidStormTreatmentModel.tick({ thyroidStormActive: true, betaBlockerCe: 2.0 });
      expect(out.hrTreatmentEffect).toBeLessThan(0);
    });
  });
});
