import { describe, it, expect } from 'vitest';
import { NeuromuscularMonitoringModel } from '../engine/NeuromuscularMonitoringModel';

describe('NeuromuscularMonitoringModel — TOF physics, residual block, reversal', () => {
  it('falls back safely with no inputs', () => {
    expect(() => NeuromuscularMonitoringModel.tick(undefined as any)).not.toThrow();
    const out = NeuromuscularMonitoringModel.tick({});
    expect(out.blockDepth).toBe('recovered');
    expect(out.safeToExtubate).toBe(true);
  });

  describe('Block depth classification', () => {
    it('TOFR = 1.0 = recovered (no block)', () => {
      const out = NeuromuscularMonitoringModel.tick({ tofRatio: 1.0, tofCount: 4 });
      expect(out.blockDepth).toBe('recovered');
    });

    it('TOFR = 0.7 = partial block (clinically significant)', () => {
      const out = NeuromuscularMonitoringModel.tick({ tofRatio: 0.7, tofCount: 4 });
      expect(out.blockDepth).toBe('partial');
      expect(out.safeToExtubate).toBe(false);
    });

    it('TOF count = 0 = deep/complete block', () => {
      const out = NeuromuscularMonitoringModel.tick({ tofCount: 0, ptcCount: 5 });
      expect(['deep', 'complete'].includes(out.blockDepth)).toBe(true);
    });

    it('TOFR ≥ 0.90 is required before extubation', () => {
      const tofr085 = NeuromuscularMonitoringModel.tick({ tofRatio: 0.85, tofCount: 4, isEmergencePhase: true });
      const tofr092 = NeuromuscularMonitoringModel.tick({ tofRatio: 0.92, tofCount: 4 });
      expect(tofr085.safeToExtubate).toBe(false);
      expect(tofr092.safeToExtubate).toBe(true);
    });
  });

  describe('Intubating conditions', () => {
    it('T1 suppressed ≥ 95% = intubating conditions', () => {
      const out = NeuromuscularMonitoringModel.tick({ t1Amplitude: 2, tofCount: 0, isIntubationPhase: true });
      expect(out.intubatingConditions).toBe(true);
    });
  });

  describe('Residual block detection', () => {
    it('TOFR < 0.90 at emergence = residual block', () => {
      const out = NeuromuscularMonitoringModel.tick({ tofRatio: 0.75, tofCount: 4, isEmergencePhase: true });
      expect(out.residualBlockPresent).toBe(true);
    });

    it('fires residual block event with management advice', () => {
      const out = NeuromuscularMonitoringModel.tick({
        tofRatio: 0.72, tofCount: 4, isEmergencePhase: true,
        isRocuroniumOrVecuronium: true, prevResidualBlockLogged: false,
      });
      expect(out.events.some(e => e.includes('RESIDUAL'))).toBe(true);
      expect(out.events.some(e => e.includes('SUGAMMADEX'))).toBe(true);
    });
  });

  describe('Sugammadex dosing', () => {
    it('2 mg/kg for moderate block (TOF T2 present)', () => {
      const out = NeuromuscularMonitoringModel.tick({
        tofCount: 2, isRocuroniumOrVecuronium: true, isEmergencePhase: true,
      });
      expect(out.sugammadexDoseRecommended).toBe(2);
    });

    it('4 mg/kg for deep block (PTC present but no TOF)', () => {
      const out = NeuromuscularMonitoringModel.tick({
        tofCount: 0, ptcCount: 5, isRocuroniumOrVecuronium: true, isEmergencePhase: true,
      });
      expect(out.sugammadexDoseRecommended).toBe(4);
    });

    it('16 mg/kg for immediate rescue (PTC = 0)', () => {
      const out = NeuromuscularMonitoringModel.tick({
        tofCount: 0, ptcCount: 0, isRocuroniumOrVecuronium: true, isEmergencePhase: true,
      });
      expect(out.sugammadexDoseRecommended).toBe(16);
    });
  });

  describe('Neostigmine feasibility', () => {
    it('neostigmine feasible only when TOF T2+ is present (non-rocuronium)', () => {
      const deepBlock = NeuromuscularMonitoringModel.tick({ tofCount: 1, isRocuroniumOrVecuronium: false });
      const adequateBlock = NeuromuscularMonitoringModel.tick({ tofCount: 2, isRocuroniumOrVecuronium: false });
      expect(deepBlock.neostigmineFeasible).toBe(false); // tofCount 1 < 2
      expect(adequateBlock.neostigmineFeasible).toBe(true);
    });

    it('neostigmine NOT feasible for rocuronium (sugammadex preferred)', () => {
      const out = NeuromuscularMonitoringModel.tick({
        tofCount: 3, isRocuroniumOrVecuronium: true,
      });
      expect(out.neostigmineFeasible).toBe(false);
    });
  });
});
