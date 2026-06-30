import { describe, it, expect } from 'vitest';
import { PONVModel } from '../engine/PONVModel';

describe('PONVModel — Apfel score and receptor-specific antiemetic pathways', () => {
  it('produces a 10% baseline risk (Apfel 0 score) for a male, smoking patient without PONV history', () => {
    const out = PONVModel.tick({ femaleSex: false, isNonSmoker: false, historyPONV: false, postopOpioidUse: false });
    expect(out.apfelScore).toBe(0);
    expect(out.baselinePONVProbability).toBeCloseTo(0.10, 2);
    expect(out.prophylaxisRecommendation).toBe('none');
  });

  it('highest-risk patient (all 4 Apfel factors) has 79% PONV probability and requires multimodal prophylaxis', () => {
    const out = PONVModel.tick({ femaleSex: true, isNonSmoker: true, historyPONV: true, postopOpioidUse: true });
    expect(out.apfelScore).toBe(4);
    expect(out.baselinePONVProbability).toBeCloseTo(0.79, 2);
    expect(out.prophylaxisRecommendation).toBe('multimodal');
    expect(out.tivaBenefit).toBe(true);
  });

  it('volatile anesthesia increases modified risk beyond Apfel baseline', () => {
    const tiva = PONVModel.tick({ femaleSex: true, isNonSmoker: true, usedVolatileAnesthesia: false });
    const volatile = PONVModel.tick({ femaleSex: true, isNonSmoker: true, usedVolatileAnesthesia: true });
    expect(volatile.modifiedPONVRisk).toBeGreaterThan(tiva.modifiedPONVRisk);
  });

  it('ondansetron provides meaningful PONV risk reduction via 5-HT3 pathway', () => {
    const noAntiemetic = PONVModel.tick({ femaleSex: true, historyPONV: true, isNonSmoker: true });
    const withOndansetron = PONVModel.tick({ femaleSex: true, historyPONV: true, isNonSmoker: true, ondansetronCe: 0.2 });
    expect(withOndansetron.residualPONVRisk).toBeLessThan(noAntiemetic.residualPONVRisk);
  });

  it('multimodal antiemetic prophylaxis (ondansetron + dexamethasone) is more effective than either alone', () => {
    const ondOnly = PONVModel.tick({ femaleSex: true, historyPONV: true, isNonSmoker: true, ondansetronCe: 0.2 });
    const dexOnly = PONVModel.tick({ femaleSex: true, historyPONV: true, isNonSmoker: true, dexamethasoneCe: 0.5 });
    const combo = PONVModel.tick({ femaleSex: true, historyPONV: true, isNonSmoker: true, ondansetronCe: 0.2, dexamethasoneCe: 0.5 });
    expect(combo.residualPONVRisk).toBeLessThan(ondOnly.residualPONVRisk);
    expect(combo.residualPONVRisk).toBeLessThan(dexOnly.residualPONVRisk);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => PONVModel.tick(undefined as any)).not.toThrow();
    expect(() => PONVModel.tick({ ondansetronCe: NaN, durationHours: NaN } as any)).not.toThrow();
    const out = PONVModel.tick({});
    expect(Number.isFinite(out.baselinePONVProbability)).toBe(true);
    expect(out.apfelScore).toBeGreaterThanOrEqual(0);
  });
});
