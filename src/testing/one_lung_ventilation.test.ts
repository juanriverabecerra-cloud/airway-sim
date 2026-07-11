import { describe, it, expect } from 'vitest';
import { OneLungVentilationModel } from '../engine/OneLungVentilationModel';

describe('OneLungVentilationModel — thoracic surgery OLV physiology', () => {
  describe('Baseline / no OLV', () => {
    it('returns zero shunt contribution when OLV inactive', () => {
      const out = OneLungVentilationModel.tick({ olvActive: false });
      expect(out.olvShuntContribution).toBe(0);
      expect(out.olvCompliancePenaltyFraction).toBe(0);
      expect(out.olvActive).toBe(false);
    });

    it('falls back safely with undefined inputs', () => {
      expect(() => OneLungVentilationModel.tick(undefined as any)).not.toThrow();
      const out = OneLungVentilationModel.tick({});
      expect(out.olvActive).toBe(false);
    });
  });

  describe('OLV initiation — massive shunt', () => {
    it('creates large shunt contribution immediately on OLV start (t=0 min)', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true,
        olvStartTimeSec: 100,
        currentTimeSec: 100, // t=0: HPV not yet developed
        hpvInhibitionFraction: 0,
        olvCpapCmH2O: 0,
        olvLateralOperativeLungUp: false,
      });
      // At OLV start: non-vent lung receives ~50% of blood; effective shunt = ~0.45 (minus 5% baseline)
      expect(out.olvShuntContribution).toBeGreaterThan(0.40);
      expect(out.olvShuntContribution).toBeLessThanOrEqual(0.48);
    });

    it('fires onset narrative event on first tick', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 0,
        prevOlvOnsetLogged: false,
      });
      expect(out.events.some(e => e.includes('OLV INITIATED'))).toBe(true);
      expect(out.prevOlvOnsetLogged).toBe(true);
    });

    it('does NOT re-fire onset event on subsequent ticks', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 60,
        prevOlvOnsetLogged: true,
      });
      expect(out.events.some(e => e.includes('OLV INITIATED'))).toBe(false);
    });
  });

  describe('HPV time course', () => {
    it('HPV compensation increases with duration (shunt decreases over time)', () => {
      const early = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 60, // 1 min
        hpvInhibitionFraction: 0,
      });
      const late = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 1200, // 20 min
        hpvInhibitionFraction: 0,
      });
      expect(late.olvShuntContribution).toBeLessThan(early.olvShuntContribution);
      expect(late.hpvCompensationFraction).toBeGreaterThan(early.hpvCompensationFraction);
    });

    it('HPV reaches full compensation at ~20+ min without volatile inhibition', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 2400, // 40 min
        hpvInhibitionFraction: 0,
      });
      // Full HPV reduces non-vent lung blood flow from 50% to ~25%
      expect(out.nonVentLungBloodFlowFraction).toBeLessThan(0.30);
    });
  });

  describe('Volatile HPV inhibition', () => {
    it('volatile inhibition attenuates HPV benefit and worsens shunt', () => {
      const noVol = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 1200,
        hpvInhibitionFraction: 0, // TIVA — HPV fully intact
      });
      const highVol = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 1200,
        hpvInhibitionFraction: 0.6, // ~1.5 MAC volatile
      });
      expect(highVol.olvShuntContribution).toBeGreaterThan(noVol.olvShuntContribution);
      expect(highVol.hpvInhibitedFraction).toBeGreaterThan(0);
    });
  });

  describe('CPAP to non-ventilated lung', () => {
    it('CPAP 5 cmH2O reduces OLV shunt contribution', () => {
      const noCPAP = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 600,
        hpvInhibitionFraction: 0, olvCpapCmH2O: 0,
      });
      const withCPAP = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 600,
        hpvInhibitionFraction: 0, olvCpapCmH2O: 5,
      });
      expect(withCPAP.olvShuntContribution).toBeLessThan(noCPAP.olvShuntContribution);
      expect(withCPAP.olvCpapBenefit).toBeGreaterThan(0);
    });

    it('CPAP 10 cmH2O provides greater benefit than CPAP 5', () => {
      const cpap5 = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 600,
        olvCpapCmH2O: 5,
      });
      const cpap10 = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 600,
        olvCpapCmH2O: 10,
      });
      expect(cpap10.olvCpapBenefit).toBeGreaterThan(cpap5.olvCpapBenefit);
    });
  });

  describe('Compliance penalty', () => {
    it('OLV reduces effective compliance by ~45% (single-lung physiology)', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 300,
      });
      expect(out.olvCompliancePenaltyFraction).toBeCloseTo(0.45, 1);
    });
  });

  describe('DLT malposition', () => {
    it('DLT malposition triggers warning event and reduces compliance penalty', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 60,
        dltMalpositioned: true, prevOlvOnsetLogged: true,
      });
      expect(out.dltMalpositionActive).toBe(true);
      expect(out.events.some(e => e.includes('MALPOSITION'))).toBe(true);
      // Malposition = incomplete isolation = smaller compliance penalty
      expect(out.olvCompliancePenaltyFraction).toBeLessThan(0.45);
    });
  });

  describe('Lateral decubitus positioning benefit', () => {
    it('lateral position with operative lung up provides additional shunt reduction', () => {
      const supine = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 600,
        hpvInhibitionFraction: 0, olvLateralOperativeLungUp: false,
      });
      const lateral = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 600,
        hpvInhibitionFraction: 0, olvLateralOperativeLungUp: true,
      });
      expect(lateral.olvShuntContribution).toBeLessThan(supine.olvShuntContribution);
    });
  });

  describe('Hypoxia event', () => {
    it('fires hypoxia event when SpO2 < 90% during OLV', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 300,
        prevOlvOnsetLogged: true, prevOlvHypoxiaLogged: false,
        currentSpO2: 87,
      });
      expect(out.events.some(e => e.includes('OLV HYPOXIA'))).toBe(true);
      expect(out.prevOlvHypoxiaLogged).toBe(true);
    });

    it('does not fire hypoxia event at SpO2 >= 90%', () => {
      const out = OneLungVentilationModel.tick({
        olvActive: true, olvStartTimeSec: 0, currentTimeSec: 300,
        prevOlvOnsetLogged: true, prevOlvHypoxiaLogged: false,
        currentSpO2: 94,
      });
      expect(out.events.some(e => e.includes('OLV HYPOXIA'))).toBe(false);
    });
  });
});
