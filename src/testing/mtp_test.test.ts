import { describe, it, expect } from 'vitest';
import { MassiveTransfusionModel } from '../engine/MassiveTransfusionModel';

describe('MassiveTransfusionModel — DCR, TXA timing, calcium', () => {
  it('falls back safely with no inputs', () => {
    expect(() => MassiveTransfusionModel.tick(undefined as any)).not.toThrow();
    const out = MassiveTransfusionModel.tick({});
    expect(out.isBalancedResuscitation).toBe(true); // zero units = balanced
  });

  describe('Blood product ratio assessment', () => {
    it('1:1:1 ratio is balanced resuscitation', () => {
      const out = MassiveTransfusionModel.tick({
        isActiveMTP: true, prbcUnitsGiven: 6, ffpUnitsGiven: 6, plateletsUnitsGiven: 6,
      });
      expect(out.isBalancedResuscitation).toBe(true);
      expect(out.ffpNeeded).toBe(0);
    });

    it('unbalanced resuscitation (pRBC without FFP) flags imbalance', () => {
      const out = MassiveTransfusionModel.tick({
        isActiveMTP: true, prbcUnitsGiven: 8, ffpUnitsGiven: 2, plateletsUnitsGiven: 2,
      });
      expect(out.isBalancedResuscitation).toBe(false);
      expect(out.ffpNeeded).toBeGreaterThan(0);
    });

    it('calculates units needed to achieve 1:1:1', () => {
      const out = MassiveTransfusionModel.tick({
        isActiveMTP: true, prbcUnitsGiven: 10, ffpUnitsGiven: 4, plateletsUnitsGiven: 6,
      });
      expect(out.ffpNeeded).toBe(6); // 10 - 4 = 6 FFP needed
    });
  });

  describe('TXA timing window', () => {
    it('TXA given within 3h of injury is beneficial', () => {
      const out = MassiveTransfusionModel.tick({ txaGiven: true, txaTimeFromInjuryHours: 1.5 });
      expect(out.txaBeneficial).toBe(true);
      expect(out.txaHarmful).toBe(false);
    });

    it('TXA given after 3h may be harmful', () => {
      const out = MassiveTransfusionModel.tick({ txaGiven: true, txaTimeFromInjuryHours: 4.5 });
      expect(out.txaBeneficial).toBe(false);
      expect(out.txaHarmful).toBe(true);
    });
  });

  describe('DCR hemodynamic targets', () => {
    it('permissive hypotension target is MAP 55 (not 65)', () => {
      const out = MassiveTransfusionModel.tick({ isActiveMTP: true, permissiveHypotension: true, hasTBI: false });
      expect(out.mapTarget).toBe(55);
    });

    it('TBI overrides permissive hypotension — target MAP 80', () => {
      const out = MassiveTransfusionModel.tick({ isActiveMTP: true, permissiveHypotension: true, hasTBI: true });
      expect(out.mapTarget).toBe(80);
    });
  });

  describe('Calcium supplementation', () => {
    it('large transfusion volume triggers calcium supplementation need', () => {
      const out = MassiveTransfusionModel.tick({
        isActiveMTP: true, prbcUnitsGiven: 8, ffpUnitsGiven: 6,
        currentCaIonized: 0.9, // low calcium
      });
      expect(out.calciumSupplementationNeeded).toBe(true);
    });

    it('fires calcium warning event', () => {
      const out = MassiveTransfusionModel.tick({
        isActiveMTP: true, prbcUnitsGiven: 6, ffpUnitsGiven: 4,
        currentCaIonized: 0.9, prevCalciumLogged: false,
      });
      expect(out.events.some(e => e.includes('CALCIUM'))).toBe(true);
    });
  });
});
