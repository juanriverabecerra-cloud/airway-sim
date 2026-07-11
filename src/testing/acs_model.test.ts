import { describe, it, expect } from 'vitest';
import { AcuteCoronarySyndromeModel } from '../engine/AcuteCoronarySyndromeModel';

describe('AcuteCoronarySyndromeModel — STEMI, NSTEMI, Killip classification', () => {
  it('falls back safely with no inputs', () => {
    expect(() => AcuteCoronarySyndromeModel.tick(undefined as any)).not.toThrow();
    const out = AcuteCoronarySyndromeModel.tick({});
    expect(out.acsActive).toBe(false);
    expect(out.stemiActive).toBe(false);
  });

  describe('STEMI', () => {
    it('ST elevation + high troponin = STEMI active', () => {
      const out = AcuteCoronarySyndromeModel.tick({ acsType: 'stemi', stElevationPresent: true, troponinNgL: 5000 });
      expect(out.stemiActive).toBe(true);
      expect(out.reperfusionUrgent).toBe(true);
    });

    it('PCI within 12h of STEMI onset is within therapeutic window', () => {
      const out = AcuteCoronarySyndromeModel.tick({ acsType: 'stemi', minutesSinceACSOnset: 60 });
      expect(out.timeWindowForPCI).toBe(true);
    });

    it('STEMI after 12h is outside primary PCI window', () => {
      const out = AcuteCoronarySyndromeModel.tick({ acsType: 'stemi', minutesSinceACSOnset: 800 });
      expect(out.timeWindowForPCI).toBe(false);
    });

    it('fires STEMI event with PCI urgency message', () => {
      const out = AcuteCoronarySyndromeModel.tick({
        acsType: 'stemi', stElevationPresent: true, troponinNgL: 1000,
        pciFeasible: true, prevSTEMILogged: false,
      });
      expect(out.events.some(e => e.includes('STEMI'))).toBe(true);
      expect(out.events.some(e => e.includes('CATH LAB'))).toBe(true);
    });
  });

  describe('Killip classification', () => {
    it('Killip I: no heart failure signs (normal CO)', () => {
      const out = AcuteCoronarySyndromeModel.tick({ acsType: 'nstemi', currentCO: 5.0, currentSBP: 125 });
      expect(out.killipClass).toBe(1);
    });

    it('Killip III/IV: cardiogenic shock (very low CO + hypotension)', () => {
      const out = AcuteCoronarySyndromeModel.tick({ acsType: 'stemi', currentCO: 1.2, currentSBP: 78 });
      expect([3, 4].includes(out.killipClass)).toBe(true);
      expect(out.inotropyPenalty).toBeGreaterThan(0.3);
    });
  });

  describe('Rate-pressure product (myocardial demand)', () => {
    it('RPP ≤ 10,000 meets demand goal', () => {
      const out = AcuteCoronarySyndromeModel.tick({ currentHR: 70, currentSBP: 120 });
      expect(out.ratePressureProduct).toBeLessThanOrEqual(10000);
      expect(out.rppGoalMet).toBe(true);
    });

    it('tachycardia + hypertension exceeds demand goal', () => {
      const out = AcuteCoronarySyndromeModel.tick({ currentHR: 130, currentSBP: 165 });
      expect(out.ratePressureProduct).toBeGreaterThan(10000);
      expect(out.rppGoalMet).toBe(false);
    });
  });

  describe('NSTEMI', () => {
    it('fires NSTEMI event with elevated troponin', () => {
      const out = AcuteCoronarySyndromeModel.tick({
        acsType: 'nstemi', troponinNgL: 85, prevNSTEMILogged: false,
      });
      expect(out.events.some(e => e.includes('NSTEMI'))).toBe(true);
    });
  });
});
