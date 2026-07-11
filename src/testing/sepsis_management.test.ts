import { describe, it, expect } from 'vitest';
import { SepsisManagementProtocolModel } from '../engine/SepsisManagementProtocolModel';

describe('SepsisManagementProtocolModel — Hour-1 bundle, antibiotics, hemodynamic targets', () => {
  it('falls back safely when sepsis not diagnosed', () => {
    expect(() => SepsisManagementProtocolModel.tick(undefined as any)).not.toThrow();
    const out = SepsisManagementProtocolModel.tick({ sepsisDiagnosed: false });
    expect(out.hour1BundleComplete).toBe(false);
  });

  describe('Hour-1 bundle assessment', () => {
    it('incomplete bundle with all elements missing', () => {
      const out = SepsisManagementProtocolModel.tick({
        sepsisDiagnosed: true, currentMAP: 50, currentLactate: 3.5,
      });
      expect(out.hour1BundleComplete).toBe(false);
      expect(out.bundleItemsMissing.length).toBeGreaterThan(0);
    });

    it('complete bundle when all 5 elements done', () => {
      const out = SepsisManagementProtocolModel.tick({
        sepsisDiagnosed: true,
        lactateDrawn: true,
        bloodCulturesDrawn: true,
        antibioticsGiven: true, antibioticMinsFromOnset: 30,
        fluidsGiven30mlKg: true,
        vasopressorsStarted: true,
        currentMAP: 68,
      });
      expect(out.hour1BundleComplete).toBe(true);
      expect(out.bundleItemsCompleted).toBe(5);
    });
  });

  describe('Antibiotic selection', () => {
    it('MRSA history triggers vancomycin coverage', () => {
      const out = SepsisManagementProtocolModel.tick({ sepsisDiagnosed: true, priorMRSA: true });
      expect(out.recommendedAntibiotics).toContain('Vancomycin');
    });

    it('community-acquired without risk factors: ceftriaxone', () => {
      const out = SepsisManagementProtocolModel.tick({
        sepsisDiagnosed: true, isCommunityAcquired: true, priorMRSA: false, priorPseudomonas: false,
      });
      expect(out.recommendedAntibiotics).toContain('Ceftriaxone');
    });

    it('antibiotic delay > 60 min flags warning', () => {
      const out = SepsisManagementProtocolModel.tick({
        sepsisDiagnosed: true, antibioticsGiven: false, antibioticMinsFromOnset: 90,
        prevBundleIncompleteLogged: false,
      });
      expect(out.antibioticDelayRisk).toBe(true);
      expect(out.events.some(e => e.includes('ANTIBIOTIC DELAY'))).toBe(true);
    });
  });

  describe('Hemodynamic targets', () => {
    it('MAP ≥ 65 meets goal', () => {
      const out = SepsisManagementProtocolModel.tick({ sepsisDiagnosed: true, currentMAP: 70 });
      expect(out.mapGoalMet).toBe(true);
    });

    it('MAP < 65 fails goal and triggers vasopressor escalation', () => {
      const out = SepsisManagementProtocolModel.tick({
        sepsisDiagnosed: true, septicShockPresent: true, currentMAP: 58,
        prevShockTargetLogged: false,
      });
      expect(out.mapGoalMet).toBe(false);
      expect(out.events.some(e => e.includes('MAP TARGET NOT MET'))).toBe(true);
    });

    it('hydrocortisone indicated for refractory shock', () => {
      const out = SepsisManagementProtocolModel.tick({
        sepsisDiagnosed: true, septicShockPresent: true, norepinephrineCe: 0.8, currentMAP: 58,
      });
      expect(out.hydrocortisoneIndicated).toBe(true);
    });
  });

  describe('Lactate clearance', () => {
    it('lactate < 2.0 mmol/L is adequate clearance', () => {
      const out = SepsisManagementProtocolModel.tick({ sepsisDiagnosed: true, currentLactate: 1.5 });
      expect(out.lactateClearanceAdequate).toBe(true);
    });

    it('lactate > 2.0 mmol/L indicates inadequate clearance', () => {
      const out = SepsisManagementProtocolModel.tick({ sepsisDiagnosed: true, currentLactate: 3.8 });
      expect(out.lactateClearanceAdequate).toBe(false);
    });
  });
});
