import { describe, it, expect } from 'vitest';
import { NeuraxialPKModel } from '../engine/NeuraxialPKModel';

describe('NeuraxialPKModel — baricity, spread, IT opioid rostral migration', () => {
  it('hyperbaric spinal in sitting position produces a low (saddle) block', () => {
    const saddle = NeuraxialPKModel.tick({ spinalBaricityType: 'hyperbaric', injectionPosition: 'Sitting', minutesSinceInjection: 30 });
    expect(saddle.spreadComplete).toBe(true);
    expect(saddle.predictedBlockLevel).toBeGreaterThan(24); // stays sacral
    expect(saddle.highSpinalRisk).toBe(false);
  });

  it('hyperbaric spinal in Trendelenburg position risks high spinal block', () => {
    const high = NeuraxialPKModel.tick({ spinalBaricityType: 'hyperbaric', injectionPosition: 'Trendelenburg', minutesSinceInjection: 20 });
    expect(high.predictedBlockLevel).toBeLessThan(12); // rises to thoracic/cervical
    expect(high.highSpinalRisk).toBe(true);
    expect(high.events.some(e => e.includes('HIGH SPINAL'))).toBe(true);
  });

  it('baricity determines spread direction: hyperbaric reaches lower level in supine than hypobaric in sitting', () => {
    const hyperbaricSupine = NeuraxialPKModel.tick({ spinalBaricityType: 'hyperbaric', injectionPosition: 'Supine', minutesSinceInjection: 20 });
    const hypobaricSitting = NeuraxialPKModel.tick({ spinalBaricityType: 'hypobaric', injectionPosition: 'Sitting', minutesSinceInjection: 20 });
    // Hypobaric in sitting position floats UP -- very high spinal risk!
    expect(hypobaricSitting.predictedBlockLevel).toBeLessThan(hyperbaricSupine.predictedBlockLevel);
  });

  it('pregnancy produces 2 dermatomal levels higher spread than the same drug in a non-pregnant patient', () => {
    const nonPregnant = NeuraxialPKModel.tick({ spinalBaricityType: 'hyperbaric', injectionPosition: 'Supine', minutesSinceInjection: 20, isPregnant: false });
    const pregnant = NeuraxialPKModel.tick({ spinalBaricityType: 'hyperbaric', injectionPosition: 'Supine', minutesSinceInjection: 20, isPregnant: true });
    expect(pregnant.predictedBlockLevel).toBeLessThanOrEqual(nonPregnant.predictedBlockLevel - 2);
  });

  it('intrathecal morphine shows delayed peak rostral concentration (12h), not immediate', () => {
    const immediate = NeuraxialPKModel.tick({ intrathecalMorphineMg: 0.2, minutesSinceInjection: 30 });
    const peak = NeuraxialPKModel.tick({ intrathecalMorphineMg: 0.2, prevRostralMorphineConcentration: 0.8, minutesSinceInjection: 720 });
    const delayed = NeuraxialPKModel.tick({ intrathecalMorphineMg: 0.2, prevRostralMorphineConcentration: 0.95, minutesSinceInjection: 720 });
    expect(peak.rostralMorphineConcentration).toBeGreaterThan(immediate.rostralMorphineConcentration);
    expect(delayed.respiratoryDepressionFromMorphine).toBe(true);
    expect(delayed.events.some(e => e.includes('DELAYED RESPIRATORY DEPRESSION'))).toBe(true);
  });

  it('intrathecal fentanyl stays in cord (lipophilic): high cord concentration, no rostral migration', () => {
    const fentanylIT = NeuraxialPKModel.tick({ intrathecalFentanylMcg: 25, minutesSinceInjection: 60 });
    expect(fentanylIT.fentanylCordConcentration).toBeGreaterThan(0);
    expect(fentanylIT.rostralMorphineConcentration).toBe(0);
    expect(fentanylIT.delayedRespiratoryDepressionRisk).toBe(0);
  });

  it('epidural fentanyl is mostly absorbed systemically (80%), not delivering to cord', () => {
    const epiF = NeuraxialPKModel.tick({ epiduralFentanylCe: 2.0 });
    expect(epiF.epiduralFentanylSystemicFraction).toBeCloseTo(0.8, 1);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => NeuraxialPKModel.tick(undefined as any)).not.toThrow();
    expect(() => NeuraxialPKModel.tick({ minutesSinceInjection: NaN, intrathecalMorphineMg: NaN } as any)).not.toThrow();
    const out = NeuraxialPKModel.tick({ spinalBaricityType: 'hyperbaric', injectionPosition: 'Supine' });
    expect(Number.isFinite(out.predictedBlockLevel)).toBe(true);
    expect(Number.isFinite(out.rostralMorphineConcentration)).toBe(true);
  });
});
