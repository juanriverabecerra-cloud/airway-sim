import { describe, it, expect } from 'vitest';
import { ObstetricHemorrhageModel } from '../engine/ObstetricHemorrhageModel';

describe('ObstetricHemorrhageModel — PPH severity, uterotonics, IE prophylaxis', () => {
  it('falls back safely with no inputs', () => {
    expect(() => ObstetricHemorrhageModel.tick(undefined as any)).not.toThrow();
    const out = ObstetricHemorrhageModel.tick({});
    expect(out.pphActive).toBe(false);
  });

  describe('PPH classification', () => {
    it('blood loss < 500 mL = no PPH', () => {
      const out = ObstetricHemorrhageModel.tick({ isPostpartum: true, bloodLossMl: 300 });
      expect(out.pphSeverity).toBe('none');
      expect(out.pphActive).toBe(false);
    });

    it('blood loss 1000-2500 mL = major PPH', () => {
      const out = ObstetricHemorrhageModel.tick({ isPostpartum: true, bloodLossMl: 1500 });
      expect(out.pphSeverity).toBe('major');
      expect(out.pphActive).toBe(true);
    });

    it('blood loss > 2500 mL = massive PPH', () => {
      const out = ObstetricHemorrhageModel.tick({ isPostpartum: true, bloodLossMl: 3000 });
      expect(out.pphSeverity).toBe('massive');
    });
  });

  describe('4 T\'s etiology', () => {
    it('uterine atony is identified as primary cause', () => {
      const out = ObstetricHemorrhageModel.tick({
        isPostpartum: true, bloodLossMl: 1500, uterineAtonyPresent: true,
      });
      expect(out.primaryCause).toContain('tone');
    });

    it('high volatile MAC causes uterine relaxation', () => {
      const out = ObstetricHemorrhageModel.tick({
        isPostpartum: true, bloodLossMl: 1200, volatileMac: 1.8,
      });
      expect(out.primaryCause).toContain('tone');
    });
  });

  describe('Uterotonic efficacy', () => {
    it('combined uterotonics more effective than oxytocin alone', () => {
      const oxyOnly = ObstetricHemorrhageModel.tick({ isPostpartum: true, oxytocinCe: 2.0, carboprostCe: 0 });
      const combined = ObstetricHemorrhageModel.tick({
        isPostpartum: true, oxytocinCe: 2.0, methylergCe: 1.0, carboprostCe: 1.0, misoprostolCe: 1.0,
      });
      expect(combined.utoronicEfficacy).toBeGreaterThan(oxyOnly.utoronicEfficacy);
    });
  });

  describe('IE prophylaxis', () => {
    it('prosthetic valve + dental procedure = IE prophylaxis indicated', () => {
      const out = ObstetricHemorrhageModel.tick({ hasProstheticValve: true, isDentalProcedure: true });
      expect(out.ieProphylaxisIndicated).toBe(true);
    });

    it('non-dental procedure = prophylaxis NOT indicated even with prosthetic valve', () => {
      const out = ObstetricHemorrhageModel.tick({ hasProstheticValve: true, isDentalProcedure: false });
      expect(out.ieProphylaxisIndicated).toBe(false);
    });

    it('fires prophylaxis reminder when not given for high-risk dental procedure', () => {
      const out = ObstetricHemorrhageModel.tick({
        hasProstheticValve: true, isDentalProcedure: true,
        amoxicillinGiven: false, prevIEProphylaxisLogged: false,
      });
      expect(out.events.some(e => e.includes('IE PROPHYLAXIS REQUIRED'))).toBe(true);
    });

    it('prophylaxis is adequate when amoxicillin given', () => {
      const out = ObstetricHemorrhageModel.tick({
        hasProstheticValve: true, isDentalProcedure: true, amoxicillinGiven: true,
      });
      expect(out.prophylaxisAdequate).toBe(true);
    });
  });
});
