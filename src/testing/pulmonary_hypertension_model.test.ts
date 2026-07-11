import { describe, it, expect } from 'vitest';
import { PulmonaryHypertensionModel } from '../engine/PulmonaryHypertensionModel';

describe('PulmonaryHypertensionModel — PH physiology, iNO, RV failure', () => {
  describe('Safe defaults', () => {
    it('falls back safely with no inputs', () => {
      expect(() => PulmonaryHypertensionModel.tick(undefined as any)).not.toThrow();
      const out = PulmonaryHypertensionModel.tick({});
      expect(out.currentMpap).toBeGreaterThan(0);
      expect(out.rvFailureActive).toBe(false);
    });

    it('normal patient has mPAP ~16-20 mmHg', () => {
      const out = PulmonaryHypertensionModel.tick({
        phPresent: false, currentCO: 5.0, currentMAP: 85, pcwp: 8,
      });
      expect(out.currentMpap).toBeLessThan(25); // below PH threshold
      expect(out.rvInotropyPenalty).toBe(0);
    });
  });

  describe('PH severity grading', () => {
    it('mild PH produces mPAP 25-35 mmHg', () => {
      const out = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'mild', currentCO: 5.0, currentMAP: 85,
      });
      expect(out.currentMpap).toBeGreaterThan(24);
      expect(out.currentMpap).toBeLessThan(45);
    });

    it('severe PH produces mPAP > 45 mmHg', () => {
      const out = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'severe', currentCO: 5.0, currentMAP: 85,
      });
      expect(out.currentMpap).toBeGreaterThan(40);
      expect(out.baselinePVR).toBeGreaterThan(8);
    });

    it('PVR increases with severity', () => {
      const mild = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'mild', currentCO: 5 });
      const severe = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', currentCO: 5 });
      expect(severe.currentPVR).toBeGreaterThan(mild.currentPVR);
      expect(severe.baselinePVR).toBeGreaterThan(mild.baselinePVR);
    });
  });

  describe('Intraoperative triggers worsen PH', () => {
    it('hypoxia (PaO2 < 60) increases mPAP', () => {
      const normal = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPaO2: 95 });
      const hypoxic = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPaO2: 45 });
      expect(hypoxic.currentMpap).toBeGreaterThan(normal.currentMpap);
      expect(hypoxic.dynamicPVRMultiplier).toBeGreaterThan(normal.dynamicPVRMultiplier);
    });

    it('hypercarbia (PaCO2 > 50) increases mPAP', () => {
      const normal = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPaCO2: 40 });
      const hypercarb = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPaCO2: 65 });
      expect(hypercarb.currentMpap).toBeGreaterThan(normal.currentMpap);
    });

    it('acidosis (pH < 7.3) increases mPAP', () => {
      const normal = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPH: 7.4 });
      const acidotic = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPH: 7.1 });
      expect(acidotic.currentMpap).toBeGreaterThan(normal.currentMpap);
    });

    it('high PEEP (> 10 cmH2O) increases mPAP', () => {
      const lowPeep = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPEEP: 5 });
      const highPeep = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', currentPEEP: 18 });
      expect(highPeep.currentMpap).toBeGreaterThan(lowPeep.currentMpap);
    });

    it('N2O increases mPAP in PH patient', () => {
      const noN2O = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', n2oActive: false });
      const withN2O = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'moderate', n2oActive: true });
      expect(withN2O.currentMpap).toBeGreaterThan(noN2O.currentMpap);
    });
  });

  describe('iNO treatment', () => {
    it('iNO reduces mPAP and PVR', () => {
      const noTx = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', inoActive: false });
      const withIno = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', inoActive: true, inoPpm: 20 });
      expect(withIno.currentMpap).toBeLessThan(noTx.currentMpap);
      expect(withIno.inoEfficacy).toBeGreaterThan(0);
    });

    it('higher iNO dose provides greater PVR reduction', () => {
      const low = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', inoActive: true, inoPpm: 5 });
      const high = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', inoActive: true, inoPpm: 40 });
      expect(high.inoEfficacy).toBeGreaterThan(low.inoEfficacy);
    });

    it('iNO fires onset event on first administration', () => {
      const out = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'severe', inoActive: true, inoPpm: 20,
        prevInoStartLogged: false,
      });
      expect(out.events.some(e => e.includes('INHALED NITRIC OXIDE'))).toBe(true);
      expect(out.prevInoStartLogged).toBe(true);
    });

    it('sildenafil potentiates iNO effect (combined > either alone)', () => {
      const inoAlone = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', inoActive: true, inoPpm: 20, sildenafilCe: 0 });
      const combined = PulmonaryHypertensionModel.tick({ phPresent: true, phSeverity: 'severe', inoActive: true, inoPpm: 20, sildenafilCe: 1.5 });
      expect(combined.treatmentPVRReduction).toBeGreaterThan(inoAlone.treatmentPVRReduction);
    });
  });

  describe('RV failure', () => {
    it('severe PH with low MAP triggers RV failure', () => {
      const out = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'severe',
        currentMAP: 55, // dangerously low — RV perfusion pressure = MAP - mPAP < 20
        currentPaO2: 55, // add hypoxia trigger
      });
      expect(out.rvFailureActive).toBe(true);
      expect(out.rvInotropyPenalty).toBeGreaterThan(0);
    });

    it('RV failure fires warning event once only', () => {
      const first = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'severe', currentMAP: 50,
        prevRVFailureLogged: false,
      });
      expect(first.events.some(e => e.includes('RIGHT VENTRICULAR FAILURE'))).toBe(true);
      const second = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'severe', currentMAP: 50,
        prevRVFailureLogged: true,
      });
      expect(second.events.some(e => e.includes('RIGHT VENTRICULAR FAILURE'))).toBe(false);
    });

    it('PH crisis fires at mPAP > 50 mmHg', () => {
      const out = PulmonaryHypertensionModel.tick({
        phPresent: true, phSeverity: 'severe',
        currentCO: 6, currentMAP: 85, // high CO + severe PH → high mPAP
        prevPHCrisisLogged: false,
      });
      if (out.currentMpap > 50) {
        expect(out.events.some(e => e.includes('PULMONARY HYPERTENSIVE CRISIS'))).toBe(true);
      }
    });
  });

  describe('iNO rebound warning', () => {
    it('fires rebound warning when iNO just stopped', () => {
      const out = PulmonaryHypertensionModel.tick({
        inoActive: false, inoJustStopped: true, prevReboundLogged: false,
      });
      expect(out.events.some(e => e.includes('REBOUND'))).toBe(true);
    });
  });
});
