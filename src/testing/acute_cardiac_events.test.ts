import { describe, it, expect } from 'vitest';
import { AcuteCardiacEventModel } from '../engine/AcuteCardiacEventModel';

describe('AcuteCardiacEventModel — tamponade and Takotsubo', () => {
  it('falls back safely with no inputs', () => {
    expect(() => AcuteCardiacEventModel.tick(undefined as any)).not.toThrow();
    const out = AcuteCardiacEventModel.tick({});
    expect(out.tamponadeActive).toBe(false);
    expect(out.takotsuboActive).toBe(false);
  });

  describe('Cardiac Tamponade', () => {
    it('small pericardial effusion does not cause acute tamponade', () => {
      const out = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 100 });
      expect(out.tamponadeActive).toBe(false);
    });

    it('acute 300 mL effusion causes tamponade (threshold ~200 mL acute)', () => {
      const out = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 350, isChronicEffusion: false });
      expect(out.tamponadeActive).toBe(true);
      expect(out.tamponadeSeverity).toBeGreaterThan(0);
    });

    it('chronic large effusion requires more volume before tamponade', () => {
      const acuteSmall = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 350, isChronicEffusion: false });
      const chronicSame = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 350, isChronicEffusion: true });
      expect(acuteSmall.tamponadeSeverity).toBeGreaterThan(chronicSame.tamponadeSeverity);
    });

    it('tamponade causes compensatory tachycardia and vasoconstriction', () => {
      const out = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 500 });
      if (out.tamponadeActive) {
        expect(out.tamponadeHRContribution).toBeGreaterThan(0);
        expect(out.tamponadeSVRContribution).toBeGreaterThan(0);
      }
    });

    it('tamponade causes HIGH CVP (distinguishes from hemorrhage)', () => {
      const out = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 500 });
      if (out.tamponadeActive) {
        expect(out.tamponadeCVPContribution).toBeGreaterThan(0); // CVP elevated
      }
    });

    it('pulsus paradoxus > 10 mmHg during tamponade', () => {
      const out = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 400 });
      if (out.tamponadeActive) {
        expect(out.pulsusParadoxusMmHg).toBeGreaterThan(10);
      }
    });

    it('pericardiocentesis reduces tamponade severity', () => {
      const noTx = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 500, pericardiocentesisDone: false });
      const withDrainage = AcuteCardiacEventModel.tick({
        pericardialEffusionMl: 500, pericardiocentesisDone: true, pericardiocentesisVolumeMl: 200,
      });
      expect(withDrainage.pericardiocentesisEfficacy).toBeGreaterThan(0.5);
      expect(withDrainage.tamponadeSeverity).toBeLessThan(noTx.tamponadeSeverity);
    });

    it('rapid accumulation worsens severity more than same volume slow effusion', () => {
      const slow = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 400, effusionAccumulationRateMlMin: 0.5 });
      const fast = AcuteCardiacEventModel.tick({ pericardialEffusionMl: 400, effusionAccumulationRateMlMin: 20 });
      expect(fast.tamponadeSeverity).toBeGreaterThan(slow.tamponadeSeverity);
    });
  });

  describe('Takotsubo', () => {
    it('no Takotsubo without trigger', () => {
      const out = AcuteCardiacEventModel.tick({ takotsuboActive: false, catecholamineSurgeIndex: 0.3 });
      expect(out.takotsuboActive).toBe(false);
    });

    it('Takotsubo causes LV dysfunction (inotropy penalty)', () => {
      const out = AcuteCardiacEventModel.tick({ takotsuboActive: true, minutesSinceTakotsuboOnset: 60 });
      expect(out.takotsuboActive).toBe(true);
      expect(out.takotsuboInotropyPenalty).toBeGreaterThan(0.2);
    });

    it('Takotsubo spontaneously recovers over days', () => {
      const acute = AcuteCardiacEventModel.tick({ takotsuboActive: true, minutesSinceTakotsuboOnset: 60 });
      const days_later = AcuteCardiacEventModel.tick({ takotsuboActive: true, minutesSinceTakotsuboOnset: 7 * 24 * 60 });
      expect(days_later.takotsuboInotropyPenalty).toBeLessThan(acute.takotsuboInotropyPenalty);
      expect(days_later.takotsuboRecoveryFraction).toBeGreaterThan(0.5);
    });

    it('beta-blockers accelerate Takotsubo recovery', () => {
      const noBB = AcuteCardiacEventModel.tick({ takotsuboActive: true, minutesSinceTakotsuboOnset: 120, betaBlockerCe: 0 });
      const withBB = AcuteCardiacEventModel.tick({ takotsuboActive: true, minutesSinceTakotsuboOnset: 120, betaBlockerCe: 2.0 });
      expect(withBB.takotsuboSeverity).toBeLessThan(noBB.takotsuboSeverity);
    });

    it('fires Takotsubo event on first recognition', () => {
      const out = AcuteCardiacEventModel.tick({
        takotsuboActive: true, minutesSinceTakotsuboOnset: 30,
        catecholamineSurgeIndex: 0.9, hasSAH: true,
        prevTakotsuboLogged: false,
      });
      expect(out.events.some(e => e.includes('TAKOTSUBO'))).toBe(true);
    });
  });
});
