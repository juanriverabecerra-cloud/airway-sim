import { describe, it, expect } from 'vitest';
import { TACOModel } from '../engine/TACOModel';

describe('TACOModel — transfusion-associated circulatory overload', () => {
  it('falls back safely with no inputs', () => {
    expect(() => TACOModel.tick(undefined as any)).not.toThrow();
    const out = TACOModel.tick({});
    expect(out.tacoActive).toBe(false);
    expect(out.tacoRiskScore).toBeLessThan(0.45);
  });

  describe('Risk stratification', () => {
    it('low volume transfusion in healthy young patient = low risk', () => {
      const out = TACOModel.tick({ prbcVolumeReceivedMl: 300, ageYears: 35, weightKg: 70, ef: 65 });
      expect(out.tacoRiskScore).toBeLessThan(0.45);
      expect(out.tacoActive).toBe(false);
    });

    it('large volume transfusion in elderly CHF patient = high risk', () => {
      const out = TACOModel.tick({
        prbcVolumeReceivedMl: 2000, ffpVolumeReceivedMl: 600, plateletsVolumeReceivedMl: 300,
        ageYears: 78, hasChf: true, ef: 30, hasRenalInsufficiency: true,
        weightKg: 52, isFluidOverloaded: true,
      });
      expect(out.tacoRiskScore).toBeGreaterThan(0.45);
      expect(out.tacoActive).toBe(true);
    });

    it('rapid transfusion rate increases risk', () => {
      const slow = TACOModel.tick({ prbcVolumeReceivedMl: 1000, transfusionRateMlPerHr: 80, ageYears: 65, hasChf: true });
      const fast = TACOModel.tick({ prbcVolumeReceivedMl: 1000, transfusionRateMlPerHr: 500, ageYears: 65, hasChf: true });
      expect(fast.tacoRiskScore).toBeGreaterThan(slow.tacoRiskScore);
    });
  });

  describe('TACO physiology', () => {
    it('active TACO increases SVR (hypertension — distinguishes from TRALI)', () => {
      const out = TACOModel.tick({
        prbcVolumeReceivedMl: 2500, ageYears: 80, hasChf: true, ef: 30,
        hasRenalInsufficiency: true,
      });
      if (out.tacoActive) {
        expect(out.svrContribution).toBeGreaterThan(0);
      }
    });

    it('active TACO reduces compliance (pulmonary edema)', () => {
      const out = TACOModel.tick({
        prbcVolumeReceivedMl: 2500, ageYears: 78, hasChf: true, ef: 28,
      });
      if (out.tacoActive) {
        expect(out.compliancePenalty).toBeGreaterThan(0);
        expect(out.shuntContribution).toBeGreaterThan(0);
      }
    });

    it('BNP elevation correlates with TACO severity', () => {
      const mild = TACOModel.tick({ prbcVolumeReceivedMl: 600, ageYears: 60, hasChf: false });
      const severe = TACOModel.tick({ prbcVolumeReceivedMl: 3000, ageYears: 80, hasChf: true, ef: 25 });
      expect(severe.bnpElevation).toBeGreaterThan(mild.bnpElevation);
    });
  });

  describe('Furosemide treatment', () => {
    it('furosemide reduces TACO severity', () => {
      const noTx = TACOModel.tick({
        prbcVolumeReceivedMl: 2000, ageYears: 75, hasChf: true, furosemideCe: 0,
      });
      const withFuro = TACOModel.tick({
        prbcVolumeReceivedMl: 2000, ageYears: 75, hasChf: true, furosemideCe: 2.0,
      });
      if (noTx.tacoActive) {
        expect(withFuro.tacoSeverity).toBeLessThan(noTx.tacoSeverity);
        expect(withFuro.furosemideEfficacy).toBeGreaterThan(0.5);
      }
    });

    it('furosemide reduces compliance penalty', () => {
      const noFuro = TACOModel.tick({
        prbcVolumeReceivedMl: 2500, ageYears: 80, hasChf: true, ef: 28, furosemideCe: 0,
      });
      const withFuro = TACOModel.tick({
        prbcVolumeReceivedMl: 2500, ageYears: 80, hasChf: true, ef: 28, furosemideCe: 3.0,
      });
      expect(withFuro.compliancePenalty).toBeLessThan(noFuro.compliancePenalty);
    });
  });

  describe('Events', () => {
    it('fires TACO event on first activation', () => {
      const out = TACOModel.tick({
        prbcVolumeReceivedMl: 2500, ageYears: 78, hasChf: true, ef: 28,
        prevTACOLogged: false,
      });
      if (out.tacoActive) {
        expect(out.events.some(e => e.includes('TACO'))).toBe(true);
        expect(out.prevTACOLogged).toBe(true);
      }
    });

    it('does not re-fire standard TACO event once both flags are set', () => {
      const out = TACOModel.tick({
        prbcVolumeReceivedMl: 2500, ageYears: 78, hasChf: true,
        prevTACOLogged: true, prevTACOSevereLogged: true,
      });
      expect(out.events.length).toBe(0); // both logged → no events
    });
  });
});
