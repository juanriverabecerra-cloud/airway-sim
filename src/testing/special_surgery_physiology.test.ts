import { describe, it, expect } from 'vitest';
import { SpecialSurgeryPhysiology } from '../engine/SpecialSurgeryPhysiology';

describe('SpecialSurgeryPhysiology — prone/Trendelenburg/tourniquet/laser/IOP', () => {
  it('falls back safely with no inputs', () => {
    expect(() => SpecialSurgeryPhysiology.tick(undefined as any)).not.toThrow();
    const out = SpecialSurgeryPhysiology.tick({});
    expect(out.laserFireRisk).toBe(0);
    expect(out.iopCritical).toBe(false);
  });

  describe('Prone position eye injury risk', () => {
    it('increases with duration in prone', () => {
      const short = SpecialSurgeryPhysiology.tick({ position: 'Prone', durationMinutes: 60 });
      const long = SpecialSurgeryPhysiology.tick({ position: 'Prone', durationMinutes: 300 });
      expect(long.eyePressureRisk).toBeGreaterThan(short.eyePressureRisk);
    });

    it('inadequate eye protection greatly increases risk', () => {
      const protected_ = SpecialSurgeryPhysiology.tick({ position: 'Prone', durationMinutes: 240, adequateEyePads: true });
      const unprotected = SpecialSurgeryPhysiology.tick({ position: 'Prone', durationMinutes: 240, adequateEyePads: false });
      expect(unprotected.eyePressureRisk).toBeGreaterThan(protected_.eyePressureRisk);
    });
  });

  describe('Steep Trendelenburg effects', () => {
    it('steep Trendelenburg raises ICP contribution', () => {
      const flat = SpecialSurgeryPhysiology.tick({ position: 'Supine', headDownAngleDegrees: 0 });
      const steep = SpecialSurgeryPhysiology.tick({ position: 'Trendelenburg', headDownAngleDegrees: 35 });
      expect(steep.icpContribution).toBeGreaterThan(flat.icpContribution);
    });

    it('adds ICP when combined with pneumoperitoneum', () => {
      const noPneumo = SpecialSurgeryPhysiology.tick({ position: 'Trendelenburg', headDownAngleDegrees: 35, iapMmHg: 0 });
      const withPneumo = SpecialSurgeryPhysiology.tick({ position: 'Trendelenburg', headDownAngleDegrees: 35, iapMmHg: 15 });
      expect(withPneumo.icpContribution).toBeGreaterThan(noPneumo.icpContribution);
    });

    it('facial edema accumulates with prolonged head-down position', () => {
      const shortCase = SpecialSurgeryPhysiology.tick({ position: 'Trendelenburg', headDownAngleDegrees: 30, durationMinutes: 60 });
      const longCase = SpecialSurgeryPhysiology.tick({ position: 'Trendelenburg', headDownAngleDegrees: 30, durationMinutes: 240 });
      expect(longCase.facialEdemaIndex).toBeGreaterThan(shortCase.facialEdemaIndex);
    });
  });

  describe('Tourniquet pain', () => {
    it('no tourniquet pain before 30 min', () => {
      const out = SpecialSurgeryPhysiology.tick({ tourniquetActive: true, tourniquetDurationMinutes: 20 });
      expect(out.tourniquetPainIndex).toBe(0);
    });

    it('tourniquet pain develops after 30+ min', () => {
      const out = SpecialSurgeryPhysiology.tick({ tourniquetActive: true, tourniquetDurationMinutes: 90 });
      expect(out.tourniquetPainIndex).toBeGreaterThan(0);
      expect(out.tourniquetHRContribution).toBeGreaterThan(0);
      expect(out.tourniquetSVRContribution).toBeGreaterThan(0);
    });

    it('tourniquet pain increases with duration', () => {
      const early = SpecialSurgeryPhysiology.tick({ tourniquetActive: true, tourniquetDurationMinutes: 45 });
      const late = SpecialSurgeryPhysiology.tick({ tourniquetActive: true, tourniquetDurationMinutes: 120 });
      expect(late.tourniquetPainIndex).toBeGreaterThan(early.tourniquetPainIndex);
    });
  });

  describe('Laser fire risk', () => {
    it('no fire risk without laser', () => {
      const out = SpecialSurgeryPhysiology.tick({ laserActive: false, currentFiO2: 0.50 });
      expect(out.laserFireRisk).toBe(0);
    });

    it('laser with high FiO2 creates significant fire risk', () => {
      const safe = SpecialSurgeryPhysiology.tick({ laserActive: true, currentFiO2: 0.25, laserResistantETT: true, n2oActive: false });
      const risky = SpecialSurgeryPhysiology.tick({ laserActive: true, currentFiO2: 0.80, n2oActive: false, laserResistantETT: false });
      expect(risky.laserFireRisk).toBeGreaterThan(safe.laserFireRisk);
    });

    it('laser-resistant ETT reduces fire risk', () => {
      const standard = SpecialSurgeryPhysiology.tick({ laserActive: true, currentFiO2: 0.45, laserResistantETT: false });
      const resistant = SpecialSurgeryPhysiology.tick({ laserActive: true, currentFiO2: 0.45, laserResistantETT: true });
      expect(resistant.laserFireRisk).toBeLessThan(standard.laserFireRisk);
    });

    it('N2O with laser dramatically increases risk', () => {
      const noN2O = SpecialSurgeryPhysiology.tick({ laserActive: true, currentFiO2: 0.35, n2oActive: false });
      const withN2O = SpecialSurgeryPhysiology.tick({ laserActive: true, currentFiO2: 0.35, n2oActive: true });
      expect(withN2O.laserFireRisk).toBeGreaterThan(noN2O.laserFireRisk);
    });
  });

  describe('Intraocular pressure', () => {
    it('succinylcholine increases IOP', () => {
      const noSux = SpecialSurgeryPhysiology.tick({ succinylcholineCe: 0, currentMAP: 85 });
      const withSux = SpecialSurgeryPhysiology.tick({ succinylcholineCe: 2.0, currentMAP: 85 });
      expect(withSux.iopEstimate).toBeGreaterThan(noSux.iopEstimate);
    });

    it('volatile anesthetics reduce IOP', () => {
      const awake = SpecialSurgeryPhysiology.tick({ currentVolatileMac: 0 });
      const anesthetized = SpecialSurgeryPhysiology.tick({ currentVolatileMac: 1.5 });
      expect(anesthetized.iopEstimate).toBeLessThan(awake.iopEstimate);
    });

    it('succinylcholine in open globe injury creates critical IOP situation', () => {
      const out = SpecialSurgeryPhysiology.tick({
        openGlobeInjury: true, succinylcholineCe: 2.0, currentMAP: 95,
      });
      expect(out.iopCritical).toBe(true);
      expect(out.iopEstimate).toBeGreaterThan(20);
    });

    it('fires warning event for succinylcholine in open globe', () => {
      const out = SpecialSurgeryPhysiology.tick({
        openGlobeInjury: true, succinylcholineCe: 2.0, currentMAP: 90,
        prevIopLogged: false,
      });
      expect(out.events.some(e => e.includes('OPEN GLOBE'))).toBe(true);
    });
  });
});
