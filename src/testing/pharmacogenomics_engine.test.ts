import { describe, it, expect } from 'vitest';
import { PharmacogenomicsEngine } from '../engine/PharmacogenomicsEngine';

describe('PharmacogenomicsEngine — CYP polymorphisms, G6PD, VKORC1', () => {
  it('produces normal baseline multipliers for an extensive metabolizer (EM) with no variants', () => {
    const out = PharmacogenomicsEngine.tick({ cyp2d6Phenotype: 'EM', cyp2c9Phenotype: 'normal', cyp2c19Phenotype: 'normal' });
    expect(out.codeineK10Multiplier).toBe(1.0);
    expect(out.warfarinK10Multiplier).toBe(1.0);
    expect(out.clopidogrelActivationFraction).toBeCloseTo(0.333, 1);
    expect(out.codeineOpioidCeMultiplier).toBe(1.0);
    expect(out.codeineUMRisk).toBe(false);
    expect(out.clopidogrelPMStentRisk).toBe(false);
    expect(out.g6pdMethyleneBlueContraindicated).toBe(false);
  });

  it('CYP2D6 UM: codeine cleared 6× faster and generates toxic morphine levels (FDA black-box warning)', () => {
    const um = PharmacogenomicsEngine.tick({ cyp2d6Phenotype: 'UM', codeineCe: 0.5 });
    const em = PharmacogenomicsEngine.tick({ cyp2d6Phenotype: 'EM', codeineCe: 0.5 });
    expect(um.codeineK10Multiplier).toBeGreaterThan(em.codeineK10Multiplier);
    expect(um.codeineOpioidCeMultiplier).toBeGreaterThan(em.codeineOpioidCeMultiplier);
    expect(um.codeineUMRisk).toBe(true);
    expect(um.events.some(e => e.includes('Ultra-Rapid Metabolizer'))).toBe(true);
  });

  it('CYP2D6 PM: codeine provides no analgesia (no conversion to active morphine)', () => {
    const pm = PharmacogenomicsEngine.tick({ cyp2d6Phenotype: 'PM', codeineCe: 0.5 });
    expect(pm.codeineOpioidCeMultiplier).toBeLessThan(0.1);
    expect(pm.codeinepmNoEffect).toBe(true);
    expect(pm.events.some(e => e.includes('ineffective'))).toBe(true);
  });

  it('CYP2C9 PM: warfarin cleared 20× slower → catastrophic anticoagulation at standard doses', () => {
    const normal = PharmacogenomicsEngine.tick({ cyp2c9Phenotype: 'normal' });
    const pmWarfarin = PharmacogenomicsEngine.tick({ cyp2c9Phenotype: 'PM' });
    expect(pmWarfarin.warfarinK10Multiplier).toBeLessThan(normal.warfarinK10Multiplier / 5);
  });

  it('VKORC1 sensitive allele further reduces warfarin dose requirement on top of CYP2C9', () => {
    const baseline = PharmacogenomicsEngine.tick({ cyp2c9Phenotype: 'IM', vkorc1SensitiveAllele: false });
    const withVkorc1 = PharmacogenomicsEngine.tick({ cyp2c9Phenotype: 'IM', vkorc1SensitiveAllele: true });
    expect(withVkorc1.warfarinK10Multiplier).toBeLessThan(baseline.warfarinK10Multiplier);
  });

  it('CYP2C19 PM: clopidogrel has no antiplatelet effect (stent thrombosis risk) -- FDA black-box', () => {
    const pmClopidogrel = PharmacogenomicsEngine.tick({ cyp2c19Phenotype: 'PM', clopidogrelCe: 1.0 });
    const emClopidogrel = PharmacogenomicsEngine.tick({ cyp2c19Phenotype: 'normal', clopidogrelCe: 1.0 });
    expect(pmClopidogrel.clopidogrelActivationFraction).toBeLessThan(0.05);
    expect(pmClopidogrel.clopidogrelAntiplateletEffect).toBeLessThan(0.05);
    expect(pmClopidogrel.clopidogrelPMStentRisk).toBe(true);
    expect(emClopidogrel.clopidogrelAntiplateletEffect).toBeGreaterThan(pmClopidogrel.clopidogrelAntiplateletEffect);
    expect(pmClopidogrel.events.some(e => e.includes('Poor Metabolizer'))).toBe(true);
  });

  it('CYP2C19 UM: faster clopidogrel activation (not clinically contraindicated, just note)', () => {
    const um = PharmacogenomicsEngine.tick({ cyp2c19Phenotype: 'UM', clopidogrelCe: 1.0 });
    const em = PharmacogenomicsEngine.tick({ cyp2c19Phenotype: 'normal', clopidogrelCe: 1.0 });
    expect(um.clopidogrelActivationFraction).toBeGreaterThan(em.clopidogrelActivationFraction);
  });

  it('G6PD deficiency makes methylene blue CONTRAINDICATED (would cause hemolysis)', () => {
    const g6pdWithMB = PharmacogenomicsEngine.tick({ g6pdDeficiency: true, methyleneBlueCe: 0.5 });
    const g6pdNoMB = PharmacogenomicsEngine.tick({ g6pdDeficiency: true, methyleneBlueCe: 0 });
    const normalWithMB = PharmacogenomicsEngine.tick({ g6pdDeficiency: false, methyleneBlueCe: 0.5 });
    expect(g6pdWithMB.g6pdMethyleneBlueContraindicated).toBe(true);
    expect(g6pdNoMB.g6pdMethyleneBlueContraindicated).toBe(false);
    expect(normalWithMB.g6pdMethyleneBlueContraindicated).toBe(false);
    expect(g6pdWithMB.events.some(e => e.includes('Methylene Blue is CONTRAINDICATED'))).toBe(true);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => PharmacogenomicsEngine.tick(undefined as any)).not.toThrow();
    expect(() => PharmacogenomicsEngine.tick({ cyp2d6Phenotype: 'UNKNOWN' as any })).not.toThrow();
    const out = PharmacogenomicsEngine.tick({ cyp2d6Phenotype: 'EM' });
    expect(Number.isFinite(out.codeineK10Multiplier)).toBe(true);
    expect(out.codeineK10Multiplier).toBeGreaterThan(0);
  });
});
