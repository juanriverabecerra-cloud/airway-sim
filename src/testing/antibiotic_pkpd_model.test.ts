import { describe, it, expect } from 'vitest';
import { AntibioticPKPDModel } from '../engine/AntibioticPKPDModel';

describe('AntibioticPKPDModel — time-dependent, concentration-dependent, and AUC/MIC PD', () => {
  it('produces zero coverage when no antibiotics are administered', () => {
    const out = AntibioticPKPDModel.tick({ infectionType: 'gram_positive' });
    expect(out.coverageAdequacy).toBe(0);
  });

  it('cefazolin covers gram-positive MSSA infections but NOT gram-negatives or MRSA (organism mismatch)', () => {
    const mssa = AntibioticPKPDModel.tick({ cefazolinCe: 50, infectionType: 'gram_positive' });
    const mrsa = AntibioticPKPDModel.tick({ cefazolinCe: 50, infectionType: 'gram_negative_enteric' });
    expect(mssa.coverageAdequacy).toBeGreaterThan(0.5);
    expect(mrsa.coverageAdequacy).toBe(0);
  });

  it('vancomycin is the correct agent for MRSA (gram_positive), not gram-negatives', () => {
    const mrsaCoverage = AntibioticPKPDModel.tick({ vancomycinCe: 20, prevVancomycinAuc24h: 500, infectionType: 'gram_positive' });
    const gramNegCoverage = AntibioticPKPDModel.tick({ vancomycinCe: 20, prevVancomycinAuc24h: 500, infectionType: 'gram_negative_enteric' });
    expect(mrsaCoverage.coverageAdequacy).toBeGreaterThan(gramNegCoverage.coverageAdequacy);
  });

  it('meropenem (broadest spectrum) achieves coverage for gram-positive, gram-negative, anaerobic, and Pseudomonas', () => {
    const infections = ['gram_positive', 'gram_negative_enteric', 'anaerobic', 'pseudomonas'];
    for (const type of infections) {
      const out = AntibioticPKPDModel.tick({ meropenemCe: 10, infectionType: type });
      expect(out.coverageAdequacy).toBeGreaterThan(0);
    }
  });

  it('mixed abdominal infection requires BOTH gram-negative AND anaerobic coverage simultaneously', () => {
    const gramNegOnly = AntibioticPKPDModel.tick({ ceftriaxoneCe: 20, metronidazoleCe: 0, infectionType: 'mixed_abdominal' });
    const anaerobicOnly = AntibioticPKPDModel.tick({ metronidazoleCe: 10, ceftriaxoneCe: 0, infectionType: 'mixed_abdominal' });
    const both = AntibioticPKPDModel.tick({ ceftriaxoneCe: 20, metronidazoleCe: 10, infectionType: 'mixed_abdominal' });
    expect(both.coverageAdequacy).toBeGreaterThan(gramNegOnly.coverageAdequacy);
    expect(both.coverageAdequacy).toBeGreaterThan(anaerobicOnly.coverageAdequacy);
  });

  it('aminoglycosides (concentration-dependent): higher PEAK Ce produces better PD target attainment', () => {
    const lowPeak = AntibioticPKPDModel.tick({ gentamicinCe: 5, infectionType: 'gram_negative_enteric' });
    const highPeak = AntibioticPKPDModel.tick({ gentamicinCe: 20, infectionType: 'gram_negative_enteric' });
    expect(highPeak.pdTargetAttainment.gentamicin).toBeGreaterThan(lowPeak.pdTargetAttainment.gentamicin);
  });

  it('vancomycin AUC accumulates over time (AUC/MIC-based), not just from single Ce reading', () => {
    const singleReading = AntibioticPKPDModel.tick({ vancomycinCe: 15, prevVancomycinAuc24h: 0, infectionType: 'gram_positive', dt: 1 });
    const accumulated = AntibioticPKPDModel.tick({ vancomycinCe: 15, prevVancomycinAuc24h: 400, infectionType: 'gram_positive', dt: 1 });
    expect(accumulated.pdTargetAttainment.vancomycin).toBeGreaterThan(singleReading.pdTargetAttainment.vancomycin);
    expect(accumulated.coverageAdequacy).toBeGreaterThan(singleReading.coverageAdequacy);
  });

  it('vancomycin trough risk escalates when AUC accumulation exceeds the safe range', () => {
    const safe = AntibioticPKPDModel.tick({ vancomycinCe: 10, prevVancomycinAuc24h: 350 });
    const toxic = AntibioticPKPDModel.tick({ vancomycinCe: 10, prevVancomycinAuc24h: 900 });
    expect(toxic.vancomycinTroughRisk).toBeGreaterThan(safe.vancomycinTroughRisk);
  });

  it('AKI worsens vancomycin nephrotoxicity risk (slower clearance → trough accumulation)', () => {
    const normalRenal = AntibioticPKPDModel.tick({ vancomycinCe: 15, prevVancomycinAuc24h: 600, renalFunctionRatio: 1.0 });
    const aki = AntibioticPKPDModel.tick({ vancomycinCe: 15, prevVancomycinAuc24h: 600, renalFunctionRatio: 0.2 });
    expect(aki.vancomycinTroughRisk).toBeGreaterThan(normalRenal.vancomycinTroughRisk);
  });

  it('gentamicin aminoglycoside trough risk activates when Ce stays elevated (failed extended-interval dosing)', () => {
    const lowTrough = AntibioticPKPDModel.tick({ gentamicinCe: 0.5 });
    const highTrough = AntibioticPKPDModel.tick({ gentamicinCe: 8.0 });
    expect(highTrough.aminoglycosideTroughRisk).toBeGreaterThan(lowTrough.aminoglycosideTroughRisk);
    expect(lowTrough.aminoglycosideTroughRisk).toBe(0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => AntibioticPKPDModel.tick(undefined as any)).not.toThrow();
    expect(() => AntibioticPKPDModel.tick({ cefazolinCe: NaN, vancomycinCe: NaN } as any)).not.toThrow();
    const out = AntibioticPKPDModel.tick({ cefazolinCe: -10, infectionType: 'unknown_organism' });
    expect(Number.isFinite(out.coverageAdequacy)).toBe(true);
    expect(out.coverageAdequacy).toBeGreaterThanOrEqual(0);
    expect(out.coverageAdequacy).toBeLessThanOrEqual(1);
  });
});
