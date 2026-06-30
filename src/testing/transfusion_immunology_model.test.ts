import { describe, it, expect } from 'vitest';
import { TransfusionImmunologyModel } from '../engine/TransfusionImmunologyModel';

describe('TransfusionImmunologyModel — TRALI, HIT, ABO incompatibility', () => {
  it('produces zero risk at baseline with no transfusion products and no heparin', () => {
    const out = TransfusionImmunologyModel.tick({});
    expect(out.traliRisk).toBe(0);
    expect(out.traliActive).toBe(false);
    expect(out.hitActive).toBe(false);
    expect(out.hemolysisActive).toBe(false);
  });

  it('TRALI risk accumulates with plasma-containing products (FFP > platelets in risk)', () => {
    const ffpOnly = TransfusionImmunologyModel.tick({ ffpVolumeReceivedMl: 2000 });
    const pltOnly = TransfusionImmunologyModel.tick({ plateletsVolumeReceivedMl: 2000 });
    expect(ffpOnly.traliRisk).toBeGreaterThan(pltOnly.traliRisk);
    expect(ffpOnly.traliRisk).toBeGreaterThan(0);
  });

  it('existing inflammation (surgery/sepsis) amplifies TRALI risk 4-fold (two-hit model)', () => {
    const healthy = TransfusionImmunologyModel.tick({ ffpVolumeReceivedMl: 1000, existingInflammation: false });
    const inflamed = TransfusionImmunologyModel.tick({ ffpVolumeReceivedMl: 1000, existingInflammation: true });
    expect(inflamed.traliRisk).toBeGreaterThan(healthy.traliRisk * 3);
  });

  it('TRALI when active adds a compliance penalty (non-cardiogenic pulmonary edema)', () => {
    const traliCase = TransfusionImmunologyModel.tick({ prevTraliRisk: 0.8 });
    expect(traliCase.traliActive).toBe(true);
    expect(traliCase.traliCompliance).toBeLessThan(0);
    expect(traliCase.traliResistance).toBeGreaterThan(0);
  });

  it('HIT antibody score develops after 5+ days of heparin exposure, not in the first 4 days', () => {
    const early = TransfusionImmunologyModel.tick({ heparinCe: 2.0, heparinExposureDays: 2, prevHitAntibodyScore: 0, dt: 86400 });
    const late = TransfusionImmunologyModel.tick({ heparinCe: 2.0, heparinExposureDays: 7, prevHitAntibodyScore: 0, dt: 86400 });
    expect(late.hitAntibodyScore).toBeGreaterThan(early.hitAntibodyScore);
  });

  it('4T score thrombocytopenia component increases with greater platelet fall from baseline', () => {
    const mild = TransfusionImmunologyModel.tick({ prevPlateletCountK: 250, currentPlateletCountK: 200 }); // 20% fall
    const severe = TransfusionImmunologyModel.tick({ prevPlateletCountK: 250, currentPlateletCountK: 80 }); // 68% fall
    expect(severe.fourTScore).toBeGreaterThan(mild.fourTScore);
  });

  it('high 4T score with active antibodies and platelet fall activates HIT status', () => {
    const hit = TransfusionImmunologyModel.tick({
      heparinCe: 2.0,
      heparinExposureDays: 8,
      prevHitAntibodyScore: 0.6,
      prevPlateletCountK: 250,
      currentPlateletCountK: 100,
      newThrombosisDetected: true
    });
    expect(hit.hitActive).toBe(true);
    expect(hit.hitProbability).toBe('high');
  });

  it('HIT is PROTHROMBOTIC, not just thrombocytopenic -- procoagulant effect from platelet microparticles', () => {
    const hitActive = TransfusionImmunologyModel.tick({
      heparinCe: 2.0, heparinExposureDays: 8, prevHitAntibodyScore: 0.7,
      prevPlateletCountK: 250, currentPlateletCountK: 80, newThrombosisDetected: true
    });
    expect(hitActive.procoagulantEffectFromHit).toBeGreaterThan(1.0);
    expect(hitActive.plateletEffectFromHit).toBeLessThan(0);
  });

  it('ABO-incompatible transfusion immediately triggers hemolysis crisis', () => {
    const mismatch = TransfusionImmunologyModel.tick({ bloodTypeMismatch: true });
    expect(mismatch.hemolysisActive).toBe(true);
    expect(mismatch.hemolysisIntensity).toBeGreaterThan(0.5);
    expect(mismatch.events.some(e => e.includes('ABO-INCOMPATIBLE'))).toBe(true);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => TransfusionImmunologyModel.tick(undefined as any)).not.toThrow();
    expect(() => TransfusionImmunologyModel.tick({ heparinCe: NaN, ffpVolumeReceivedMl: NaN } as any)).not.toThrow();
    const out = TransfusionImmunologyModel.tick({ heparinCe: -5, ffpVolumeReceivedMl: -100 });
    expect(Number.isFinite(out.traliRisk)).toBe(true);
    expect(Number.isFinite(out.hitAntibodyScore)).toBe(true);
  });
});
