import { describe, it, expect } from 'vitest';
import { ChronicDiseaseManagementModel } from '../engine/ChronicDiseaseManagementModel';

describe('ChronicDiseaseManagementModel — MG, MD, PD, RA, Epilepsy', () => {
  it('falls back safely with no inputs', () => {
    expect(() => ChronicDiseaseManagementModel.tick(undefined as any)).not.toThrow();
    const out = ChronicDiseaseManagementModel.tick({});
    expect(out.ndmrSensitivityMultiplier).toBe(1.0);
    expect(out.suxContraindicatedMD).toBe(false);
  });

  describe('Myasthenia Gravis', () => {
    it('MG requires dramatically reduced NDMR doses (10-25% of normal)', () => {
      const out = ChronicDiseaseManagementModel.tick({ hasMG: true, ossermannGrade: 3 });
      expect(out.ndmrSensitivityMultiplier).toBeLessThan(0.25);
    });

    it('succinylcholine is resistant in MG (need 2× dose)', () => {
      const out = ChronicDiseaseManagementModel.tick({ hasMG: true });
      expect(out.suxResistanceMG).toBe(true);
    });

    it('severe MG (grade 4) has higher crisis risk than mild (grade 1)', () => {
      const mild = ChronicDiseaseManagementModel.tick({ hasMG: true, ossermannGrade: 1, pyridostigmineCe: 1.0 });
      const severe = ChronicDiseaseManagementModel.tick({ hasMG: true, ossermannGrade: 4, pyridostigmineCe: 0 });
      expect(severe.mgCrisisRisk).toBeGreaterThan(mild.mgCrisisRisk);
    });
  });

  describe('Myotonic Dystrophy', () => {
    it('succinylcholine is ABSOLUTELY CONTRAINDICATED in myotonic dystrophy', () => {
      const out = ChronicDiseaseManagementModel.tick({ hasMyotonicDystrophy: true });
      expect(out.suxContraindicatedMD).toBe(true);
    });

    it('succinylcholine administration triggers myotonia warning event', () => {
      const out = ChronicDiseaseManagementModel.tick({
        hasMyotonicDystrophy: true, succinylcholineGivenMD: true, prevMDSuxLogged: false,
      });
      expect(out.myotoniaRisk).toBeGreaterThan(0.8);
      expect(out.events.some(e => e.includes('CONTRAINDICATED'))).toBe(true);
    });

    it('cold exposure worsens myotonia risk', () => {
      const warm = ChronicDiseaseManagementModel.tick({ hasMyotonicDystrophy: true, isPatientCold: false });
      const cold = ChronicDiseaseManagementModel.tick({ hasMyotonicDystrophy: true, isPatientCold: true });
      expect(cold.myotoniaRisk).toBeGreaterThan(warm.myotoniaRisk);
    });
  });

  describe('Parkinson\'s Disease', () => {
    it('missed levodopa increases akinesia crisis risk proportionally', () => {
      const recent = ChronicDiseaseManagementModel.tick({ hasParkinsonDisease: true, levodopaMissedHours: 2 });
      const late = ChronicDiseaseManagementModel.tick({ hasParkinsonDisease: true, levodopaMissedHours: 8 });
      expect(late.pdAkinesiasRisk).toBeGreaterThan(recent.pdAkinesiasRisk);
    });

    it('haloperidol and metoclopramide flagged as dangerous in PD', () => {
      const out = ChronicDiseaseManagementModel.tick({
        hasParkinsonDisease: true, haloperidolGivenPD: true, metoclopramideGivenPD: true,
      });
      expect(out.avoidDrugsInPD.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Rheumatoid Arthritis', () => {
    it('atlantoaxial instability triggers video laryngoscopy recommendation', () => {
      const out = ChronicDiseaseManagementModel.tick({
        hasRheumatoidArthritis: true, hasAtlantcoaxialInstability: true,
      });
      expect(out.cervicalSpineRisk).toBe(true);
      expect(out.videoLaryngoscopyRecommended).toBe(true);
    });

    it('RA without C-spine instability still gets airway warning', () => {
      const out = ChronicDiseaseManagementModel.tick({
        hasRheumatoidArthritis: true, hasAtlantcoaxialInstability: false, prevRALogged: false,
      });
      expect(out.events.some(e => e.includes('RHEUMATOID ARTHRITIS'))).toBe(true);
    });
  });

  describe('Epilepsy', () => {
    it('missed AEDs dramatically increases seizure risk', () => {
      const withAEDs = ChronicDiseaseManagementModel.tick({ hasEpilepsy: true, aedsMissed: false });
      const withoutAEDs = ChronicDiseaseManagementModel.tick({ hasEpilepsy: true, aedsMissed: true });
      expect(withoutAEDs.seizureRisk).toBeGreaterThan(withAEDs.seizureRisk);
    });

    it('meperidine flagged as dangerous in epilepsy', () => {
      const out = ChronicDiseaseManagementModel.tick({
        hasEpilepsy: true, meperidineCeEpil: 2.0, aedsMissed: false,
      });
      expect(out.avoidDrugsInEpilepsy.some(d => d.includes('Meperidine'))).toBe(true);
    });

    it('sevoflurane > 1.5 MAC flagged for epileptiform EEG risk', () => {
      const out = ChronicDiseaseManagementModel.tick({
        hasEpilepsy: true, sevofluraneMacHigh: 2.0, aedsMissed: false,
      });
      expect(out.avoidDrugsInEpilepsy.some(d => d.includes('Sevoflurane'))).toBe(true);
    });
  });
});
