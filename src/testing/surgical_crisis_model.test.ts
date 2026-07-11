import { describe, it, expect } from 'vitest';
import { SurgicalCrisisModel } from '../engine/SurgicalCrisisModel';

describe('SurgicalCrisisModel — carcinoid, pheo, NPPE, masseter rigidity', () => {
  describe('Carcinoid Crisis', () => {
    it('no crisis without tumor manipulation', () => {
      const out = SurgicalCrisisModel.tick({ carcinoidTumorPresent: true, surgeonManipulatingTumor: false });
      expect(out.carcinoidCrisisActive).toBe(false);
    });

    it('tumor manipulation triggers crisis (flushing, hypotension, bronchospasm)', () => {
      const out = SurgicalCrisisModel.tick({ carcinoidTumorPresent: true, surgeonManipulatingTumor: true, octreotideCe: 0 });
      expect(out.carcinoidCrisisActive).toBe(true);
      expect(out.carcinoidSVRMod).toBeLessThan(0);
      expect(out.carcinoidBronchospasmActive).toBe(true);
    });

    it('octreotide is the ONLY effective treatment and prevents/aborts carcinoid crisis', () => {
      const noDrug = SurgicalCrisisModel.tick({ carcinoidTumorPresent: true, surgeonManipulatingTumor: true, octreotideCe: 0 });
      const withOctreotide = SurgicalCrisisModel.tick({ carcinoidTumorPresent: true, surgeonManipulatingTumor: true, octreotideCe: 5.0 });
      expect(noDrug.carcinoidCrisisActive).toBe(true);
      expect(withOctreotide.carcinoidCrisisActive).toBe(false);
      expect(withOctreotide.octreotideEfficacy).toBeGreaterThan(0.8);
    });
  });

  describe('Pheochromocytoma Crisis', () => {
    it('inadequate preoperative blockade worsens hypertensive crisis during manipulation', () => {
      const badBlockade = SurgicalCrisisModel.tick({ pheoPresent: true, pheoBlockadeAdequate: false, surgeonTouchingAdrenal: true });
      const goodBlockade = SurgicalCrisisModel.tick({ pheoPresent: true, pheoBlockadeAdequate: true, surgeonTouchingAdrenal: true });
      expect(badBlockade.pheoHypertensiveCrisisActive).toBe(true);
      expect(badBlockade.pheoSVRSpike).toBeGreaterThan(goodBlockade.pheoSVRSpike);
    });

    it('phentolamine controls hypertensive crisis', () => {
      const noTx = SurgicalCrisisModel.tick({ pheoPresent: true, pheoBlockadeAdequate: false, surgeonTouchingAdrenal: true, phentolamineCe: 0 });
      const withPhentolamide = SurgicalCrisisModel.tick({ pheoPresent: true, pheoBlockadeAdequate: false, surgeonTouchingAdrenal: true, phentolamineCe: 3.0 });
      expect(withPhentolamide.pheoSVRSpike).toBeLessThan(noTx.pheoSVRSpike);
    });

    it('post-ligation hypotension: tumor removed → catecholamine withdrawal → vasoplegic shock', () => {
      const out = SurgicalCrisisModel.tick({ pheoPresent: true, tumorLigated: true, pheoBlockadeAdequate: false });
      expect(out.pheoHypotensionActive).toBe(true);
      expect(out.pheoHypotensionSVRDrop).toBeLessThan(0);
    });
  });

  describe('Negative-Pressure Pulmonary Edema', () => {
    it('NPPE develops minutes after laryngospasm, not immediately', () => {
      const immediate = SurgicalCrisisModel.tick({ laryngospasmOccurred: true, minutesSinceLaryngospasm: 0 });
      const later = SurgicalCrisisModel.tick({ laryngospasmOccurred: true, minutesSinceLaryngospasm: 20 });
      expect(immediate.nppePulmonaryEdemaActive).toBe(false);
      expect(later.nppePulmonaryEdemaActive).toBe(true);
    });

    it('NPPE causes compliance and resistance penalties', () => {
      const out = SurgicalCrisisModel.tick({ laryngospasmOccurred: true, minutesSinceLaryngospasm: 30 });
      expect(out.nppeCompliancePenalty).toBeLessThan(0);
      expect(out.nppeResistancePenalty).toBeGreaterThan(0);
    });

    it('fires narrative event on NPPE onset, once only', () => {
      const onset = SurgicalCrisisModel.tick({ laryngospasmOccurred: true, minutesSinceLaryngospasm: 20, prevNPPELogged: false });
      expect(onset.events.some(e => e.includes('NPPE'))).toBe(true);
      const steady = SurgicalCrisisModel.tick({ laryngospasmOccurred: true, minutesSinceLaryngospasm: 25, prevNPPELogged: true });
      expect(steady.events.some(e => e.includes('NPPE'))).toBe(false);
    });
  });

  describe('Masseter Muscle Rigidity', () => {
    it('MMR triggers in MH-susceptible patient given succinylcholine', () => {
      const out = SurgicalCrisisModel.tick({ succinylcholineGivenToMHSusceptible: true, prevMMRLogged: false });
      expect(out.masseterRigidityActive).toBe(true);
      expect(out.events.some(e => e.includes('MASSETER'))).toBe(true);
    });
  });

  it('falls back safely', () => {
    expect(() => SurgicalCrisisModel.tick(undefined as any)).not.toThrow();
    const out = SurgicalCrisisModel.tick({});
    expect(out.carcinoidCrisisActive).toBe(false);
    expect(out.masseterRigidityActive).toBe(false);
  });
});
