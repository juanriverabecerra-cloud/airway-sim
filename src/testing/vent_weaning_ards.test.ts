import { describe, it, expect } from 'vitest';
import { VentilatorWeaningARDSModel } from '../engine/VentilatorWeaningARDSModel';

describe('VentilatorWeaningARDSModel — LPV, driving pressure, SBT, extubation', () => {
  it('falls back safely with no inputs', () => {
    expect(() => VentilatorWeaningARDSModel.tick(undefined as any)).not.toThrow();
    const out = VentilatorWeaningARDSModel.tick({});
    expect(out.ards_severity).toBe('none');
  });

  describe('ARDS severity classification', () => {
    it('P/F > 300 = no ARDS', () => {
      const out = VentilatorWeaningARDSModel.tick({ currentPaO2: 320, currentFiO2: 0.4 });
      expect(out.ards_severity).toBe('none');
    });

    it('P/F 150-200 = moderate ARDS', () => {
      const out = VentilatorWeaningARDSModel.tick({ isARDS: true, currentPaO2: 80, currentFiO2: 0.5 });
      // P/F = 80/0.5 = 160 = moderate
      expect(out.ards_severity).toBe('moderate');
    });

    it('P/F ≤ 100 = severe ARDS', () => {
      const out = VentilatorWeaningARDSModel.tick({ isARDS: true, currentPaO2: 60, currentFiO2: 0.8 });
      // P/F = 60/0.8 = 75 = severe
      expect(out.ards_severity).toBe('severe');
      expect(out.proneBeneficial).toBe(true);
    });
  });

  describe('Lung-protective ventilation adherence', () => {
    it('6 mL/kg IBW is adherent (standard ARDSNet)', () => {
      const out = VentilatorWeaningARDSModel.tick({ currentTV_mL: 420, ibwKg: 70 });
      // 420/70 = 6 mL/kg
      expect(out.tvMlPerKgIBW).toBeCloseTo(6, 0);
      expect(out.isLPV_TVAdherent).toBe(true);
    });

    it('12 mL/kg (old standard) is NOT adherent', () => {
      const out = VentilatorWeaningARDSModel.tick({ currentTV_mL: 840, ibwKg: 70 });
      expect(out.isLPV_TVAdherent).toBe(false);
    });

    it('plateau pressure > 30 cmH2O is unsafe', () => {
      const out = VentilatorWeaningARDSModel.tick({ currentPPlateau: 35 });
      expect(out.platPressureSafe).toBe(false);
    });

    it('driving pressure ≤ 15 cmH2O is safe', () => {
      const out = VentilatorWeaningARDSModel.tick({ currentPPlateau: 22, currentPEEP: 8 });
      // DP = 22 - 8 = 14
      expect(out.drivingPressure).toBeCloseTo(14, 0);
      expect(out.drivingPressureSafe).toBe(true);
    });

    it('driving pressure > 15 cmH2O is dangerous in ARDS', () => {
      const out = VentilatorWeaningARDSModel.tick({ currentPPlateau: 28, currentPEEP: 5, isARDS: true });
      // DP = 23 > 15
      expect(out.drivingPressureSafe).toBe(false);
    });

    it('PEEP recommendation increases with FiO2 requirement', () => {
      const lowFiO2 = VentilatorWeaningARDSModel.tick({ currentFiO2: 0.35 });
      const highFiO2 = VentilatorWeaningARDSModel.tick({ currentFiO2: 0.90 });
      expect(highFiO2.peepRecommended).toBeGreaterThan(lowFiO2.peepRecommended);
    });
  });

  describe('RSBI and weaning readiness', () => {
    it('RSBI ≤ 105 suggests successful SBT (Yang-Tobin criterion)', () => {
      // RSBI = RR / TV(L) = 15 / 0.5 = 30 — excellent
      const out = VentilatorWeaningARDSModel.tick({ currentRR: 15, currentTV_mL: 500 });
      expect(out.rsbi).toBeLessThan(106);
    });

    it('high RSBI suggests SBT failure', () => {
      // RSBI = 40 / 0.2 = 200 — very high
      const out = VentilatorWeaningARDSModel.tick({ currentRR: 40, currentTV_mL: 200 });
      expect(out.rsbi).toBeGreaterThan(105);
    });
  });

  describe('Extubation readiness', () => {
    it('meets extubation criteria after successful SBT', () => {
      const out = VentilatorWeaningARDSModel.tick({
        currentFiO2: 0.35, currentPEEP: 5, currentRR: 18, currentSpO2: 95,
        currentHR: 85, currentMAP: 78, currentPPlateau: 18, currentPaCO2: 42,
        currentPH: 7.38, ibwKg: 70, currentTV_mL: 420,
        isSBTInProgress: true, sbtDurationMin: 45,
        adequateCough: true, lowSecretions: true,
        consciousAndFollowsCommands: true, tofRatio: 0.95,
      });
      expect(out.isReadyForExtubation).toBe(true);
    });

    it('does NOT allow extubation with inadequate TOF (residual NMB)', () => {
      const out = VentilatorWeaningARDSModel.tick({
        currentFiO2: 0.35, currentPEEP: 5, currentRR: 16, currentSpO2: 96,
        sbtDurationMin: 40, adequateCough: true, lowSecretions: true,
        consciousAndFollowsCommands: true,
        tofRatio: 0.75, // residual NMB!
      });
      expect(out.isReadyForExtubation).toBe(false);
    });
  });
});
