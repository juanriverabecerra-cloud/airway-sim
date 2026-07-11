import { describe, it, expect } from 'vitest';
import { ChronicOpioidToleranceModel } from '../engine/ChronicOpioidToleranceModel';

describe('ChronicOpioidToleranceModel — opioid tolerance, withdrawal, delirium', () => {
  it('falls back safely with no inputs', () => {
    expect(() => ChronicOpioidToleranceModel.tick(undefined as any)).not.toThrow();
    const out = ChronicOpioidToleranceModel.tick({});
    expect(out.opioidToleranceMultiplier).toBe(1.0);
  });

  describe('Opioid tolerance', () => {
    it('non-opioid user has 1.0× multiplier', () => {
      const out = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: false });
      expect(out.opioidToleranceMultiplier).toBe(1.0);
    });

    it('high-dose chronic opioid user requires 3-5× normal doses', () => {
      const out = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: true, morphineEquivalentDosePerDay: 150 });
      expect(out.opioidToleranceMultiplier).toBeGreaterThan(3.0);
    });

    it('tolerance multiplier increases with MEDD', () => {
      const low = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: true, morphineEquivalentDosePerDay: 20 });
      const high = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: true, morphineEquivalentDosePerDay: 200 });
      expect(high.opioidToleranceMultiplier).toBeGreaterThan(low.opioidToleranceMultiplier);
    });

    it('buprenorphine interaction warning when patient is on Suboxone', () => {
      const out = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: true, onBuprenorphine: true });
      expect(out.buprenorphineInteractionWarning).toBe(true);
    });

    it('methadone status string is informative', () => {
      const out = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: true, onMethadone: true });
      expect(out.methadoneStatus).toContain('Continue');
    });
  });

  describe('Opioid withdrawal', () => {
    it('no withdrawal risk without flag', () => {
      const out = ChronicOpioidToleranceModel.tick({ isChronicOpioidUser: true, opioidWithdrawalRisk: false });
      expect(out.withdrawalRisk).toBe(0);
    });

    it('withdrawal risk identified with flag + sympathetic signs', () => {
      const out = ChronicOpioidToleranceModel.tick({
        isChronicOpioidUser: true, opioidWithdrawalRisk: true, currentHR: 115, currentSBP: 155,
        prevWithdrawalLogged: false,
      });
      expect(out.withdrawalRisk).toBeGreaterThan(0);
      expect(out.events.some(e => e.includes('WITHDRAWAL'))).toBe(true);
    });
  });

  describe('OIH', () => {
    it('OIH active with prolonged high-dose exposure', () => {
      const out = ChronicOpioidToleranceModel.tick({
        isChronicOpioidUser: true, morphineEquivalentDosePerDay: 80,
        prolongedHighDoseOpioidExposure: true,
      });
      expect(out.oihActive).toBe(true);
    });
  });

  describe('Postoperative delirium', () => {
    it('elderly + cognitive impairment + benzodiazepines = high delirium risk', () => {
      const out = ChronicOpioidToleranceModel.tick({
        ageYears: 82, hasBaselineCognitivImpairment: true,
        isPostoperative: true, benzodiazepineCe: 1.5,
      });
      expect(out.podeliriumRiskScore).toBeGreaterThan(0.5);
    });

    it('benzodiazepines increase delirium risk', () => {
      const noBenzo = ChronicOpioidToleranceModel.tick({ ageYears: 75, benzodiazepineCe: 0 });
      const withBenzo = ChronicOpioidToleranceModel.tick({ ageYears: 75, benzodiazepineCe: 2.0 });
      expect(withBenzo.podeliriumRiskScore).toBeGreaterThan(noBenzo.podeliriumRiskScore);
      expect(withBenzo.benzoDiazepineDeliriumRisk).toBeGreaterThan(0);
    });

    it('haloperidol and dexmedetomidine have anti-delirium efficacy', () => {
      const noTx = ChronicOpioidToleranceModel.tick({ ageYears: 80, isPostoperative: true, haloperidolCe: 0 });
      const withTx = ChronicOpioidToleranceModel.tick({ ageYears: 80, isPostoperative: true, haloperidolCe: 1.0, dexmedetomidineCe: 1.0 });
      expect(withTx.antiDeliriumEfficacy).toBeGreaterThan(noTx.antiDeliriumEfficacy);
    });
  });
});
