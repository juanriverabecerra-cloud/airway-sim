import { describe, it, expect } from 'vitest';
import { CapnographyModel } from '../engine/CapnographyModel';

describe('CapnographyModel — CO2 waveform physics and SpO2 artifact', () => {
  it('produces a normal waveform with zero Phase I baseline and steep Phase II slope at baseline', () => {
    const out = CapnographyModel.tick({ etco2MmHg: 38 });
    expect(out.phaseIBaselineMmHg).toBe(0);
    expect(out.phaseIISlopeDegrees).toBeGreaterThan(80);
    expect(out.phaseIIISlopeMmHgPerSec).toBeCloseTo(0, 1);
    expect(out.waveformPattern).toBe('normal');
  });

  it('rebreathing from exhausted CO2 absorber raises Phase I baseline (CO2 not cleared from dead space)', () => {
    const normal = CapnographyModel.tick({ co2AbsorberExhausted: false, etco2MmHg: 40 });
    const rebreathing = CapnographyModel.tick({ co2AbsorberExhausted: true, etco2MmHg: 40 });
    expect(rebreathing.phaseIBaselineMmHg).toBeGreaterThan(normal.phaseIBaselineMmHg);
    expect(rebreathing.waveformPattern).toBe('rebreathing');
    expect(rebreathing.betaAngleDegrees).toBeLessThan(90);
  });

  it('bronchospasm produces the shark-fin pattern: shallower Phase II slope and rising Phase III plateau', () => {
    const normal = CapnographyModel.tick({ bronchospasmSeverity: 0, etco2MmHg: 40 });
    const bronchospasm = CapnographyModel.tick({ bronchospasmSeverity: 0.8, etco2MmHg: 40 });
    expect(bronchospasm.phaseIISlopeDegrees).toBeLessThan(normal.phaseIISlopeDegrees);
    expect(bronchospasm.phaseIIISlopeMmHgPerSec).toBeGreaterThan(normal.phaseIIISlopeMmHgPerSec);
    expect(bronchospasm.alphaAngleDegrees).toBeGreaterThan(normal.alphaAngleDegrees);
    expect(bronchospasm.waveformPattern).toBe('bronchospasm');
  });

  it('esophageal intubation is classified as its own waveform pattern', () => {
    const esophageal = CapnographyModel.tick({ isEsophagealIntubation: true });
    expect(esophageal.waveformPattern).toBe('esophageal');
  });

  it('SpO2 reads ~85% in methemoglobinemia regardless of true SaO2 (classic 85% ceiling artifact)', () => {
    const highSaO2_highMetHb = CapnographyModel.tick({ trueSao2: 98, metHbPercent: 50 });
    const lowSaO2_highMetHb = CapnographyModel.tick({ trueSao2: 60, metHbPercent: 50 });
    expect(Math.abs(highSaO2_highMetHb.displayedSpO2 - 85)).toBeLessThan(10);
    expect(Math.abs(lowSaO2_highMetHb.displayedSpO2 - 85)).toBeLessThan(15);
    expect(highSaO2_highMetHb.metHbArtifact).toBe(true);
  });

  it('COHb causes falsely HIGH SpO2 -- pulse ox reads carboxyhemoglobin as if it were oxygenated hemoglobin', () => {
    const noCoHb = CapnographyModel.tick({ trueSao2: 75, coHbPercent: 0 });
    const highCoHb = CapnographyModel.tick({ trueSao2: 75, coHbPercent: 20 });
    expect(highCoHb.displayedSpO2).toBeGreaterThan(noCoHb.displayedSpO2);
    expect(highCoHb.coHbArtifact).toBe(true);
    expect(highCoHb.trueSao2).toBe(75); // true saturation unchanged
  });

  it('low perfusion state causes signal quality loss (unreliable SpO2 reading)', () => {
    const normal = CapnographyModel.tick({ perfusionIndex: 1.0, trueSao2: 95 });
    const poor = CapnographyModel.tick({ perfusionIndex: 0.05, trueSao2: 95 });
    expect(normal.signalQualityLost).toBe(false);
    expect(poor.signalQualityLost).toBe(true);
    expect(poor.displayedSpO2).toBe(0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => CapnographyModel.tick(undefined as any)).not.toThrow();
    expect(() => CapnographyModel.tick({ etco2MmHg: NaN, bronchospasmSeverity: NaN, trueSao2: NaN } as any)).not.toThrow();
    const out = CapnographyModel.tick({ etco2MmHg: -5, bronchospasmSeverity: -1, trueSao2: -50 });
    expect(Number.isFinite(out.phaseIISlopeDegrees)).toBe(true);
    expect(Number.isFinite(out.displayedSpO2)).toBe(true);
  });
});
