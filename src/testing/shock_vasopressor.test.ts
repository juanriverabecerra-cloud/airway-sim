import { describe, it, expect } from 'vitest';
import { ShockVasopressorModel } from '../engine/ShockVasopressorModel';

describe('ShockVasopressorModel — shock classification, vasopressor selection', () => {
  it('falls back safely with no inputs', () => {
    expect(() => ShockVasopressorModel.tick(undefined as any)).not.toThrow();
    const out = ShockVasopressorModel.tick({});
    expect(out.shockType).toBe('distributive');
  });

  describe('Shock type classification and vasopressor recommendations', () => {
    it('distributive shock: norepinephrine is first-line (SOAP II evidence)', () => {
      const out = ShockVasopressorModel.tick({ shockType: 'distributive', currentMAP: 50 });
      expect(out.norepi_recommended).toBe(true);
      expect(out.firstLineVasopressor).toContain('Norepinephrine');
    });

    it('cardiogenic shock: requires inodilator (dobutamine) in addition to NE', () => {
      const out = ShockVasopressorModel.tick({ shockType: 'cardiogenic', currentMAP: 55, currentCO: 2.5 });
      expect(out.norepi_recommended).toBe(true);
      expect(out.dobutamine_recommended).toBe(true);
    });

    it('hypovolemic shock: volume replacement is primary treatment (not vasopressors)', () => {
      const out = ShockVasopressorModel.tick({ shockType: 'hypovolemic', currentMAP: 55, volumeReplete: false });
      expect(out.primaryTreatment).toContain('VOLUME');
    });

    it('RV failure: vasopressin preferred over NE (less PVR increase)', () => {
      const out = ShockVasopressorModel.tick({ isRVFailure: true, currentMAP: 58 });
      expect(out.vasopressin_recommended).toBe(true);
      expect(out.firstLineVasopressor).toContain('Vasopressin');
    });

    it('post-CPB vasoplegia: vasopressin first-line', () => {
      const out = ShockVasopressorModel.tick({ isPostCPBVasoplegia: true, currentMAP: 52 });
      expect(out.vasopressin_recommended).toBe(true);
    });
  });

  describe('Dopamine warning', () => {
    it('fires warning when dopamine is used (worse than NE per SOAP II)', () => {
      const out = ShockVasopressorModel.tick({
        shockType: 'distributive', dopamineCe: 3.0, prevVasopressorLogged: false,
      });
      expect(out.events.some(e => e.includes('DOPAMINE'))).toBe(true);
    });
  });

  describe('Vasopressor efficacy and goals', () => {
    it('adequate vasopressor on board results in MAP goal being met', () => {
      const out = ShockVasopressorModel.tick({
        shockType: 'distributive', norepinephrineCe: 2.0, currentMAP: 70, targetMAP: 65,
      });
      expect(out.mapGoalMet).toBe(true);
    });

    it('inadequate vasopressor with low MAP = goal not met', () => {
      const out = ShockVasopressorModel.tick({
        shockType: 'distributive', norepinephrineCe: 0, currentMAP: 48, targetMAP: 65,
      });
      expect(out.mapGoalMet).toBe(false);
    });
  });

  describe('Liver failure specific', () => {
    it('liver failure: vasopressin recommended (endogenous deficiency)', () => {
      const out = ShockVasopressorModel.tick({ isLiverFailure: true, currentMAP: 55 });
      expect(out.vasopressin_recommended).toBe(true);
      expect(out.firstLineVasopressor).toContain('Vasopressin');
    });
  });
});
