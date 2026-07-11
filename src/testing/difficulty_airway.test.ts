import { describe, it, expect } from 'vitest';
import { DifficultyAirwayModel } from '../engine/DifficultyAirwayModel';

describe('DifficultyAirwayModel — LEMON score, CICO, cricothyroidotomy', () => {
  it('falls back safely with no inputs', () => {
    expect(() => DifficultyAirwayModel.tick(undefined as any)).not.toThrow();
    const out = DifficultyAirwayModel.tick({});
    expect(out.lemonScore).toBeGreaterThanOrEqual(0);
  });

  describe('LEMON score calculation', () => {
    it('ideal airway scores low LEMON', () => {
      const out = DifficultyAirwayModel.tick({
        mallampati: 1, mouthOpeningCm: 5, submandibularDistanceCm: 8,
        thyroMentalDistanceCm: 9, neckMobility: 'normal', hasObstruction: false, isObese: false,
      });
      expect(out.lemonScore).toBeLessThan(3);
      expect(out.predictedCormackLehane).toBeLessThanOrEqual(2);
    });

    it('difficult airway features increase LEMON score', () => {
      const easy = DifficultyAirwayModel.tick({ mallampati: 1, neckMobility: 'normal' });
      const hard = DifficultyAirwayModel.tick({
        mallampati: 4, mouthOpeningCm: 2.5, neckMobility: 'fixed',
        hasObstruction: true, isObese: true, hasFacialTrauma: true,
      });
      expect(hard.lemonScore).toBeGreaterThan(easy.lemonScore);
      expect(hard.predictedDifficultyIndex).toBeGreaterThan(easy.predictedDifficultyIndex);
    });

    it('Mallampati 4 drives higher LEMON score', () => {
      const mp1 = DifficultyAirwayModel.tick({ mallampati: 1 });
      const mp4 = DifficultyAirwayModel.tick({ mallampati: 4 });
      expect(mp4.lemonScore).toBeGreaterThan(mp1.lemonScore);
    });

    it('neck obstruction in pregnancy increases score', () => {
      const normal = DifficultyAirwayModel.tick({ mallampati: 2, neckMobility: 'normal', isPregnant: false });
      const pregnant = DifficultyAirwayModel.tick({ mallampati: 2, neckMobility: 'normal', isPregnant: true });
      expect(pregnant.lemonScore).toBeGreaterThanOrEqual(normal.lemonScore);
    });
  });

  describe('Airway management strategy', () => {
    it('routine strategy for low-risk airway', () => {
      const out = DifficultyAirwayModel.tick({ mallampati: 1, neckMobility: 'normal', lemonScore: 1 } as any);
      expect(out.airwayStrategy).toBe('routine');
    });

    it('video first strategy for Mallampati 3 + obesity', () => {
      const out = DifficultyAirwayModel.tick({ mallampati: 3, isObese: true });
      expect(['video_first', 'awake_intubation'].includes(out.airwayStrategy)).toBe(true);
    });

    it('awake intubation recommended for obstruction + Mallampati 4', () => {
      const out = DifficultyAirwayModel.tick({ mallampati: 4, hasObstruction: true });
      expect(out.airwayStrategy).toBe('awake_intubation');
    });

    it('obese patient has reduced max safe apnea time', () => {
      const normal = DifficultyAirwayModel.tick({ isObese: false });
      const obese = DifficultyAirwayModel.tick({ isObese: true });
      expect(obese.maxSafeApneaSeconds).toBeLessThan(normal.maxSafeApneaSeconds);
    });
  });

  describe('CICO recognition and management', () => {
    it('3+ failed intubation attempts = high CICO risk', () => {
      const out = DifficultyAirwayModel.tick({
        intubationAttemptsMade: 3, airwaySecured: false, currentSpO2: 85,
        sgaVentilating: false,
      });
      expect(out.cicoRisk).toBeGreaterThan(0.5);
    });

    it('CICO with SpO2 < 90 and failed SGA → cricothyroidotomy recommended', () => {
      const out = DifficultyAirwayModel.tick({
        cicoActive: true, currentSpO2: 83, sgaVentilating: false, cricothyroidotomyDone: false,
      });
      expect(out.recommendCricothyroidotomy).toBe(true);
    });

    it('cricothyroidotomy when done provides high efficacy', () => {
      const out = DifficultyAirwayModel.tick({
        cicoActive: true, cricothyroidotomyDone: true,
      });
      expect(out.cricothyroidotomyEfficacy).toBeGreaterThan(0.8);
    });

    it('fires CICO event when cricothyroidotomy is indicated', () => {
      const out = DifficultyAirwayModel.tick({
        cicoActive: true, currentSpO2: 80, sgaVentilating: false,
        prevCICOLogged: false,
      });
      expect(out.events.some(e => e.includes('CICO'))).toBe(true);
    });

    it('fires failed intubation event after 3 attempts', () => {
      const out = DifficultyAirwayModel.tick({
        intubationAttemptsMade: 3, airwaySecured: false, currentSpO2: 89,
        sgaVentilating: false, prevFailedLogged: false,
      });
      expect(out.events.some(e => e.includes('FAILED INTUBATION'))).toBe(true);
    });

    it('SGA providing ventilation prevents CICO declaration', () => {
      const withSGA = DifficultyAirwayModel.tick({
        intubationAttemptsMade: 3, airwaySecured: false,
        sgaInPlace: true, sgaVentilating: true, currentSpO2: 96,
      });
      expect(withSGA.cicoRisk).toBeLessThan(0.9);
      expect(withSGA.recommendCricothyroidotomy).toBe(false);
    });
  });
});
