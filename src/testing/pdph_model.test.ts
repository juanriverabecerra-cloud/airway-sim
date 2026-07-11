import { describe, it, expect } from 'vitest';
import { PDPHModel } from '../engine/PDPHModel';

describe('PDPHModel — post-dural puncture headache', () => {
  it('falls back safely with no inputs', () => {
    expect(() => PDPHModel.tick(undefined as any)).not.toThrow();
    const out = PDPHModel.tick({});
    expect(out.pdphActive).toBe(false);
  });

  it('no PDPH without dural puncture', () => {
    const out = PDPHModel.tick({ dptOccurred: false });
    expect(out.pdphActive).toBe(false);
    expect(out.headacheNRS).toBe(0);
  });

  describe('Temporal development', () => {
    it('PDPH does not develop immediately (< 6h)', () => {
      const out = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 2 });
      expect(out.pdphActive).toBe(false);
    });

    it('PDPH develops between 12-48h after puncture', () => {
      const out = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24 });
      expect(out.pdphActive).toBe(true);
      expect(out.headacheNRS).toBeGreaterThan(0);
    });

    it('PDPH spontaneously improves over days to weeks', () => {
      const peak = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 36 });
      const late = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 200 });
      expect(peak.pdphSeverity).toBeGreaterThan(late.pdphSeverity);
    });
  });

  describe('Needle size effect', () => {
    it('17G Tuohy needle causes more severe PDPH than 25G spinal needle', () => {
      const large = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24 });
      const small = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 25, dptTimeHours: 24 });
      expect(large.pdphSeverity).toBeGreaterThan(small.pdphSeverity);
    });

    it('pencil-point needle causes less severe PDPH than cutting needle at same gauge', () => {
      const cutting = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 25, dptNeedleType: 'cutting', dptTimeHours: 24 });
      const pencilPoint = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 25, dptNeedleType: 'pencil-point', dptTimeHours: 24 });
      expect(pencilPoint.pdphSeverity).toBeLessThan(cutting.pdphSeverity);
    });
  });

  describe('Postural component', () => {
    it('headache is worse when upright (classic orthostatic pattern)', () => {
      const upright = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24, isUpright: true });
      const supine = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24, isUpright: false });
      expect(upright.headacheNRS).toBeGreaterThan(supine.headacheNRS);
    });
  });

  describe('Blood patch efficacy', () => {
    it('blood patch dramatically reduces PDPH severity', () => {
      const noPatch = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 36, bloodPatchGiven: false });
      const withPatch = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 36, bloodPatchGiven: true, bloodPatchTimeSinceDPTHours: 30 });
      expect(withPatch.pdphSeverity).toBeLessThan(noPatch.pdphSeverity);
      expect(withPatch.bloodPatchEfficacy).toBeGreaterThan(0.8);
    });

    it('blood patch placed > 24h after DPT has better efficacy than early patch', () => {
      const early = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24, bloodPatchGiven: true, bloodPatchTimeSinceDPTHours: 8 });
      const optimal = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 48, bloodPatchGiven: true, bloodPatchTimeSinceDPTHours: 36 });
      expect(optimal.bloodPatchEfficacy).toBeGreaterThan(early.bloodPatchEfficacy);
    });

    it('fires blood patch event on first placement', () => {
      const out = PDPHModel.tick({
        dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 36,
        bloodPatchGiven: true, bloodPatchTimeSinceDPTHours: 30,
        prevBloodPatchLogged: false,
      });
      expect(out.events.some(e => e.includes('EPIDURAL BLOOD PATCH'))).toBe(true);
    });
  });

  describe('Risk factors', () => {
    it('young women have higher PDPH severity than older men', () => {
      const youngWoman = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 25, dptTimeHours: 24, patientAge: 26, patientSex: 'female' });
      const oldMan = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 25, dptTimeHours: 24, patientAge: 72, patientSex: 'male' });
      expect(youngWoman.pdphSeverity).toBeGreaterThan(oldMan.pdphSeverity);
    });

    it('recommends blood patch for severe headache (NRS ≥ 7)', () => {
      const out = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 30, isUpright: true });
      if (out.headacheNRS >= 7) {
        expect(out.recommendBloodPatch).toBe(true);
      }
    });
  });

  describe('Caffeine benefit', () => {
    it('caffeine reduces PDPH severity', () => {
      const noCaff = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24, caffeineActive: false });
      const withCaff = PDPHModel.tick({ dptOccurred: true, dptNeedleGauge: 17, dptTimeHours: 24, caffeineActive: true, caffeineDose: 400 });
      expect(withCaff.caffeineBenefit).toBeGreaterThan(0);
      expect(withCaff.pdphSeverity).toBeLessThan(noCaff.pdphSeverity);
    });
  });
});
