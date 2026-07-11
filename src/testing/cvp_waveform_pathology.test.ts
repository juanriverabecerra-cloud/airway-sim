import { describe, it, expect } from 'vitest';
import { calculateCvpWaveComponents, synthesizeCvpWaveform } from '../engine/CvpWaveformModel.js';

const normalPatient = {};
const normalVitals = { cvp: 5, hr: 75 };

function cycleMeanPressure(synthFn, h, ceiling) {
  let sum = 0, n = 0;
  for (let frac = 0; frac < 1; frac += 0.01) {
    const y = synthFn(frac, 1.0, h);
    sum += (1 - y / h) * ceiling;
    n++;
  }
  return sum / n;
}

describe('CVP Waveform Pathology Classification', () => {
  it('classifies normal patient CVP correctly', () => {
    const res = calculateCvpWaveComponents(normalPatient, normalVitals);
    expect(res.pattern).toBe('normal');
    expect(res.title).toBe('Normal CVP Waveform');
  });

  it('classifies tricuspid regurgitation CVP correctly', () => {
    const res = calculateCvpWaveComponents({ tricuspidRegurgitation: 0.8 }, normalVitals);
    expect(res.pattern).toBe('tricuspid_regurgitation');
  });

  it('classifies atrial fibrillation CVP correctly', () => {
    const res = calculateCvpWaveComponents({ afib: true }, normalVitals);
    expect(res.pattern).toBe('atrial_fibrillation');
  });

  it('classifies AV dissociation CVP correctly', () => {
    const res = calculateCvpWaveComponents({ avDissociation: true }, normalVitals);
    expect(res.pattern).toBe('av_dissociation');
  });

  it('classifies tricuspid stenosis CVP correctly', () => {
    const res = calculateCvpWaveComponents({ tricuspidStenosis: 0.8 }, normalVitals);
    expect(res.pattern).toBe('tricuspid_stenosis');
  });

  it('classifies cardiac tamponade CVP correctly', () => {
    const res = calculateCvpWaveComponents({ tamponadeActive: true }, normalVitals);
    expect(res.pattern).toBe('cardiac_tamponade');
  });

  it('classifies constrictive pericarditis CVP correctly', () => {
    const res = calculateCvpWaveComponents({ constrictivePericarditis: 0.8 }, normalVitals);
    expect(res.pattern).toBe('constrictive_pericarditis');
  });
});

describe('CVP Waveform Synthesis Rescale Guarantee under Pathologies', () => {
  const pathologies = [
    { name: 'Normal', patient: {} },
    { name: 'TR', patient: { tricuspidRegurgitation: 0.85 } },
    { name: 'TS', patient: { tricuspidStenosis: 0.85 } },
    { name: 'AFib', patient: { afib: true } },
    { name: 'AV Dissociation', patient: { avDissociation: true } },
    { name: 'Tamponade', patient: { tamponadeActive: true, tamponadeSeverity: 0.7 } },
    { name: 'Constriction', patient: { constrictivePericarditis: 0.85 } }
  ];

  pathologies.forEach(({ name, patient }) => {
    it(`synthesizes ${name} CVP waveform and matches vitals.cvp exactly`, () => {
      const h = 120;
      const targetCvp = 8;
      const vitals = { ...normalVitals, cvp: targetCvp };
      const mean = cycleMeanPressure(
        (frac, bd, hh) => synthesizeCvpWaveform(frac, bd, hh, 0.0, patient, vitals),
        h, 25
      );
      expect(mean).toBeCloseTo(targetCvp, 0);
    });
  });
});
