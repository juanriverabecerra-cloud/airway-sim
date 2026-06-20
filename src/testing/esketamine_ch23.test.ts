import { describe, it, expect } from 'vitest';
import { CerebralEngine } from '../engine/CerebralEngine';
import { PainEngine } from '../engine/PainEngine';
import { INHALATIONAL_AGENTS, MEDICATIONS } from '../engine/Pharmacology';

describe("Chapter 23: Intravenous Anesthetics - Esketamine (S(+)-Ketamine)", () => {
  describe('1. Esketamine Medication Profile Fidelity (Ch23, "3 to 4 times more potent")', () => {
    it('should set esketamine c50 to racemic ketamine c50 / 3.5 (midpoint of the cited 3-4x potency range)', () => {
      expect(MEDICATIONS.esketamine.pd.c50).toBeCloseTo(MEDICATIONS.ketamine.pd.c50 / 3.5, 2);
    });

    it('should keep PK compartment volumes/rate constants identical to racemic ketamine (no quantified clearance magnitude given in the source)', () => {
      expect(MEDICATIONS.esketamine.pk).toEqual(MEDICATIONS.ketamine.pk);
    });

    it('should use half the racemic ketamine induction dose, consistent with established clinical equivalence', () => {
      const esketamineDose = MEDICATIONS.esketamine.indications['Induction'].dose;
      const ketamineDose = MEDICATIONS.ketamine.indications['Induction'].dose;
      expect(esketamineDose).toBe('0.5-1.0');
      expect(ketamineDose).toBe('1.0-2.0');
    });
  });

  describe('2. Cerebral Metabolic Rate (CMRO2) Boost Equivalence (CerebralEngine.ts)', () => {
    const baseInputs = {
      map: 85, sys: 120, paco2: 40, pao2: 100, spo2: 98, temp: 37.0, cvp: 5,
      sevoMac: 0, isoMac: 0, desMac: 0, haloMac: 0, n2oMac: 0, xenonMac: 0,
      positionHydrostaticMod: 0
    };
    const patient = { icp: 10.0, complianceState: 'normal' as const };
    const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };

    it('should produce the same CMRO2 boost from esketamine Ce=0.2 as racemic ketamine Ce=0.7 (0.2*3.5=0.7 equivalence)', () => {
      const withKetamine = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [{ name: 'Ketamine', Ce: 0.7 }], baseInputs);
      const withEsketamine = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [{ name: 'Esketamine', Ce: 0.2 }], baseInputs);
      expect(withEsketamine.cmro2).toBeCloseTo(withKetamine.cmro2, 3);
    });

    it('should sum contributions when both racemic ketamine and esketamine are simultaneously active', () => {
      const noDrug = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [], baseInputs);
      const both = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [{ name: 'Ketamine', Ce: 0.3 }, { name: 'Esketamine', Ce: 0.1 }], baseInputs);
      const ketamineOnlyEquivalent = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [{ name: 'Ketamine', Ce: 0.65 }], baseInputs); // 0.3 + 0.1*3.5
      expect(both.cmro2).toBeGreaterThan(noDrug.cmro2);
      expect(both.cmro2).toBeCloseTo(ketamineOnlyEquivalent.cmro2, 3);
    });
  });

  describe('3. Analgesic Potency Equivalence (PainEngine.ts)', () => {
    const basePatient = { surgicalPhase: 'Incision', incisionStartTime: 0 };
    const baseVitals = { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 };

    it('should produce comparable analgesia from esketamine at its proportionally lower (potency-scaled) concentration', () => {
      const withKetamine = PainEngine.tick(1, basePatient, baseVitals, [{ name: 'Ketamine', Ce: 0.5 }], 0, 10);
      const withEsketamine = PainEngine.tick(1, basePatient, baseVitals, [{ name: 'Esketamine', Ce: 0.5 / 3.5 }], 0, 10);
      expect(withEsketamine.analgesiaLevel).toBeCloseTo(withKetamine.analgesiaLevel, 2);
    });

    it('should provide LESS analgesia from an equal numeric Ce of esketamine vs racemic ketamine being treated as equipotent (sanity check that potency scaling matters)', () => {
      // If esketamine were (incorrectly) treated as equipotent mg-for-mg with racemic ketamine,
      // the same raw Ce should produce MORE analgesia than racemic ketamine at that Ce, since it is
      // more potent — confirming the c50 scaling is actually wired in and not a no-op.
      const withKetamine = PainEngine.tick(1, basePatient, baseVitals, [{ name: 'Ketamine', Ce: 0.3 }], 0, 10);
      const withEsketamineSameCe = PainEngine.tick(1, basePatient, baseVitals, [{ name: 'Esketamine', Ce: 0.3 }], 0, 10);
      expect(withEsketamineSameCe.analgesiaLevel).toBeGreaterThan(withKetamine.analgesiaLevel);
    });

    it('should combine racemic ketamine and esketamine analgesia via independent-probability merging (never exceeding 1.0 contribution)', () => {
      const out = PainEngine.tick(1, basePatient, baseVitals, [{ name: 'Ketamine', Ce: 2.0 }, { name: 'Esketamine', Ce: 2.0 }], 0, 10);
      expect(Number.isFinite(out.analgesiaLevel)).toBe(true);
      expect(out.analgesiaLevel).toBeGreaterThanOrEqual(0);
      expect(out.analgesiaLevel).toBeLessThanOrEqual(1.0001);
    });
  });

  describe('4. Sanity & Stability Checks', () => {
    it('should remain finite and bounded across a wide range of esketamine concentrations', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const baseInputs = {
        map: 85, sys: 120, paco2: 40, pao2: 100, spo2: 98, temp: 37.0, cvp: 5,
        sevoMac: 0, isoMac: 0, desMac: 0, haloMac: 0, n2oMac: 0, xenonMac: 0,
        positionHydrostaticMod: 0
      };
      for (const ce of [0, 0.01, 1.0, 50.0, 1000.0]) {
        const out = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [{ name: 'Esketamine', Ce: ce }], baseInputs);
        expect(Number.isFinite(out.cmro2)).toBe(true);
        expect(out.cmro2).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not affect xenon/sevoflurane/other INHALATIONAL_AGENTS data (no unintended cross-contamination from this change)', () => {
      expect(INHALATIONAL_AGENTS.xenon.mac40).toBe(71);
      expect(INHALATIONAL_AGENTS.sevoflurane.mac40).toBeCloseTo(2.05, 2);
    });
  });
});
