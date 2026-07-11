import { describe, it, expect } from 'vitest';
import { AnticoagulationPerioperativeModel } from '../engine/AnticoagulationPerioperativeModel';

describe('AnticoagulationPerioperativeModel — warfarin, DOAC, neuraxial safety', () => {
  it('falls back safely with no inputs', () => {
    expect(() => AnticoagulationPerioperativeModel.tick(undefined as any)).not.toThrow();
    const out = AnticoagulationPerioperativeModel.tick({});
    expect(out.daysToHoldBeforeSurgery).toBe(0);
  });

  describe('Warfarin management', () => {
    it('warfarin requires 5 days hold before elective surgery', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'warfarin', urgency: 'elective' });
      expect(out.daysToHoldBeforeSurgery).toBe(5);
    });

    it('warfarin: no bridging needed for low thrombotic risk (BRIDGE trial)', () => {
      const out = AnticoagulationPerioperativeModel.tick({
        anticoagulant: 'warfarin', thromboticRisk: 'low', afibCHA2DS2VASc: 2,
      });
      expect(out.bridgingRecommended).toBe(false);
    });

    it('warfarin: bridging recommended for mechanical heart valve', () => {
      const out = AnticoagulationPerioperativeModel.tick({
        anticoagulant: 'warfarin', hasMechanicalValve: true, urgency: 'elective',
      });
      expect(out.bridgingRecommended).toBe(true);
    });

    it('warfarin INR ≤ 1.4 is acceptable for neuraxial', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'warfarin', currentINR: 1.2 });
      expect(out.inrAcceptable).toBe(true);
    });

    it('warfarin INR > 1.4 blocks neuraxial anesthesia', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'warfarin', currentINR: 1.8 });
      expect(out.inrAcceptable).toBe(false);
    });
  });

  describe('DOAC management', () => {
    it('dabigatran requires longer hold in renal insufficiency', () => {
      const normal = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'dabigatran', gfr: 90 });
      const renal = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'dabigatran', gfr: 35 });
      expect(renal.daysToHoldBeforeSurgery).toBeGreaterThan(normal.daysToHoldBeforeSurgery);
    });

    it('idarucizumab is the reversal agent for dabigatran', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'dabigatran', urgency: 'emergent' });
      expect(out.reversalAgent).toContain('Idarucizumab');
    });

    it('rivaroxaban/apixaban: andexanet alfa is primary reversal', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'rivaroxaban', urgency: 'emergent' });
      expect(out.reversalAgent).toContain('Andexanet');
    });
  });

  describe('Neuraxial anesthesia safety', () => {
    it('neuraxial is NOT safe with active LMWH (therapeutic) and insufficient hold', () => {
      const out = AnticoagulationPerioperativeModel.tick({
        anticoagulant: 'lmwh_therapeutic', isNeuraxialPlanned: true, daysSinceLastDose: 0.5, // 12 hours
        prevNeuraxialLogged: false,
      });
      expect(out.neuraxial_safe).toBe(false);
      expect(out.events.some(e => e.includes('NEURAXIAL'))).toBe(true);
    });

    it('neuraxial safe after adequate washout', () => {
      const out = AnticoagulationPerioperativeModel.tick({
        anticoagulant: 'lmwh_therapeutic', isNeuraxialPlanned: true, daysSinceLastDose: 2,
        currentINR: 1.0,
      });
      expect(out.neuraxial_safe).toBe(true);
    });
  });

  describe('Antiplatelet management', () => {
    it('aspirin: continue for most cases (no hold for cardiac patients)', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'aspirin', isNeuraxialPlanned: false });
      expect(out.daysToHoldBeforeSurgery).toBe(0);
    });

    it('aspirin: hold 7 days if neuraxial planned', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'aspirin', isNeuraxialPlanned: true });
      expect(out.daysToHoldBeforeSurgery).toBe(7);
    });

    it('P2Y12 inhibitor: hold 5 days (clopidogrel/ticagrelor)', () => {
      const out = AnticoagulationPerioperativeModel.tick({ anticoagulant: 'p2y12' });
      expect(out.daysToHoldBeforeSurgery).toBe(5);
    });
  });
});
