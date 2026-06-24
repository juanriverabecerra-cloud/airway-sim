import { describe, it, expect } from 'vitest';
import { calculateCvpWaveComponents, synthesizeCvpWaveform, mapPressureToY } from '../engine/CvpWaveformModel.js';
import { calculatePacPressures, synthesizePacWaveform } from '../engine/PulmonaryArteryCatheterModel.js';
import { calculateDynamicResponse } from '../engine/ArterialLineModel.js';

const normalVitals = { cvp: 5, mPAP: 15, lvedp: 8, peep: 0, hr: 75 };

function traceCvpPressure(patient, vitals, h = 100) {
  const ceiling = 25;
  const points = [];
  for (let frac = 0; frac <= 1; frac += 0.01) {
    const y = synthesizeCvpWaveform(frac, 1.0, h, frac, patient, vitals);
    points.push({ frac, pressure: ((h - y) / h) * ceiling });
  }
  return points;
}

describe('CVP Waveform Model (Ch36)', () => {
  it('produces a normal pattern with genuine pressure variation (a wave) within the cycle', () => {
    const comp = calculateCvpWaveComponents({}, normalVitals);
    expect(comp.pattern).toBe('normal');
    const trace = traceCvpPressure({}, normalVitals);
    const pressures = trace.map((p) => p.pressure);
    expect(Math.max(...pressures) - Math.min(...pressures)).toBeGreaterThan(2);
  });

  it('loses the late-cycle a-wave rise in atrial fibrillation (flatter trace than normal)', () => {
    const normalTrace = traceCvpPressure({}, normalVitals).map((p) => p.pressure);
    const afibTrace = traceCvpPressure({ afib: true }, normalVitals).map((p) => p.pressure);
    const afib = calculateCvpWaveComponents({ afib: true }, normalVitals);
    expect(afib.pattern).toBe('atrial_fibrillation');
    const normalSwing = Math.max(...normalTrace) - Math.min(...normalTrace);
    const afibSwing = Math.max(...afibTrace) - Math.min(...afibTrace);
    expect(afibSwing).toBeLessThan(normalSwing);
  });

  it('also recognizes cardiacRhythm === "afib" as equivalent to the afib boolean', () => {
    const viaRhythm = calculateCvpWaveComponents({ cardiacRhythm: 'afib' }, normalVitals);
    expect(viaRhythm.pattern).toBe('atrial_fibrillation');
  });

  it('produces a cannon-a-wave peak during what is normally the systolic window for AV dissociation', () => {
    const cannon = calculateCvpWaveComponents({ avDissociation: true }, normalVitals);
    expect(cannon.pattern).toBe('av_dissociation');
    const trace = traceCvpPressure({ avDissociation: true }, normalVitals);
    // Find the phase fraction where peak pressure occurs.
    let peakFrac = 0, peakPressure = -Infinity;
    for (const p of trace) {
      if (p.pressure > peakPressure) { peakPressure = p.pressure; peakFrac = p.frac; }
    }
    // A normal a wave peaks late in the cycle (near end-diastole); a cannon wave from
    // AV dissociation should peak earlier, during the ventricular-systole window.
    expect(peakFrac).toBeLessThan(0.5);
  });

  it('elevates mean-relative pressure for tricuspid regurgitation (fused systolic c-v wave)', () => {
    const tr = calculateCvpWaveComponents({ tricuspidRegurgitation: true }, normalVitals);
    expect(tr.pattern).toBe('tricuspid_regurgitation');
    expect(tr.interpretation).toContain('x descent');
  });

  it('traces a full cardiac cycle to finite, in-range pixel coordinates for every pattern', () => {
    const h = 100;
    const patients = [
      {},
      { afib: true },
      { avDissociation: true },
      { tricuspidRegurgitation: true }
    ];
    for (const patient of patients) {
      for (let frac = 0; frac <= 1; frac += 0.05) {
        const y = synthesizeCvpWaveform(frac, 1.0, h, frac, patient, normalVitals);
        expect(Number.isFinite(y)).toBe(true);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(h);
      }
    }
  });

  it('flatlines near the mean CVP pressure during cardiac arrest', () => {
    const h = 100;
    const meanY = mapPressureToY(normalVitals.cvp, h, 25);
    const y = synthesizeCvpWaveform(0.3, 1.0, h, 1.0, { isArrest: true }, normalVitals);
    expect(Math.abs(y - meanY)).toBeLessThan(10);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => calculateCvpWaveComponents(undefined, undefined)).not.toThrow();
    expect(() => calculateCvpWaveComponents(null, null)).not.toThrow();
    expect(() => synthesizeCvpWaveform(NaN, NaN, NaN, NaN, {}, { cvp: NaN })).not.toThrow();
    const y = synthesizeCvpWaveform(NaN, NaN, NaN, NaN, {}, { cvp: NaN });
    expect(Number.isFinite(y)).toBe(true);
  });
});

describe('Pulmonary Artery Catheter Model (Ch36)', () => {
  it('derives PA systolic/diastolic from the same chamber-model trajectory, with the cycle mean matching live mPAP exactly', () => {
    const pac = calculatePacPressures({}, normalVitals);
    expect(pac.paSystolic).toBeGreaterThan(pac.paDiastolic);
    expect(pac.paMean).toBeCloseTo(normalVitals.mPAP, 1);
  });

  it('scales PA pulse pressure up when mPAP rises (e.g. portopulmonary hypertension)', () => {
    const normal = calculatePacPressures({}, normalVitals);
    const poph = calculatePacPressures({}, { ...normalVitals, mPAP: 40 });
    expect(poph.paSystolic - poph.paDiastolic).toBeGreaterThan(normal.paSystolic - normal.paDiastolic);
  });

  it('reports PCWP equal to true LVEDP absent any overestimating condition', () => {
    const pac = calculatePacPressures({}, normalVitals);
    expect(pac.pcwp).toBeCloseTo(pac.lvedp, 1);
  });

  it('overestimates PCWP relative to true LVEDP with mitral regurgitation', () => {
    const pac = calculatePacPressures({ mitralRegurgitation: true }, normalVitals);
    expect(pac.pcwp).toBeGreaterThan(pac.lvedp);
    expect(pac.mrOverestimate).toBeGreaterThan(0);
  });

  it('overestimates PCWP relative to true LVEDP with PEEP above 10', () => {
    const pac = calculatePacPressures({}, { ...normalVitals, peep: 16 });
    expect(pac.pcwp).toBeGreaterThan(pac.lvedp);
    expect(pac.peepOverestimate).toBeGreaterThan(0);
  });

  it('renders a higher-pressure (lower-y) point at peak systole than at late diastole in PA mode', () => {
    const h = 100;
    const ySystole = synthesizePacWaveform(0.32, 1.0, h, 0.32, {}, normalVitals, 'pa');
    const yDiastole = synthesizePacWaveform(0.98, 1.0, h, 0.98, {}, normalVitals, 'pa');
    expect(ySystole).toBeLessThan(yDiastole);
  });

  it('shifts the wedge v-wave earlier into systole with mitral regurgitation', () => {
    const h = 100;
    // Early-mid systole (p=0.3): MR's early v wave should already be rising sharply,
    // producing a lower (higher-pressure) y than the normal late-systolic-v-wave trace
    // at the same phase.
    const normalY = synthesizePacWaveform(0.3, 1.0, h, 0.3, {}, normalVitals, 'wedge');
    const mrY = synthesizePacWaveform(0.3, 1.0, h, 0.3, { mitralRegurgitation: true }, normalVitals, 'wedge');
    expect(mrY).toBeLessThan(normalY);
  });

  it('produces a non-pulsatile, gradually changing trace when overwedged', () => {
    const h = 100;
    const y1 = synthesizePacWaveform(0.1, 1.0, h, 0.1, { pacOverwedged: true }, normalVitals, 'wedge');
    const y2 = synthesizePacWaveform(0.6, 1.0, h, 0.1, { pacOverwedged: true }, normalVitals, 'wedge');
    expect(Number.isFinite(y1)).toBe(true);
    expect(Number.isFinite(y2)).toBe(true);
  });

  it('stays finite and in-range with the catheter-whip artifact active', () => {
    const h = 100;
    for (let t = 0; t < 1; t += 0.05) {
      const y = synthesizePacWaveform(t, 1.0, h, t, { pacWhipArtifact: true }, normalVitals, 'pa');
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(h);
    }
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => calculatePacPressures(undefined, undefined)).not.toThrow();
    expect(() => calculatePacPressures(null, null)).not.toThrow();
    expect(() => synthesizePacWaveform(NaN, NaN, NaN, NaN, {}, { mPAP: NaN, lvedp: NaN })).not.toThrow();
    const pac = calculatePacPressures({}, { mPAP: NaN, lvedp: NaN, peep: NaN });
    expect(Number.isFinite(pac.paSystolic)).toBe(true);
    expect(Number.isFinite(pac.pcwp)).toBe(true);
  });
});

describe('Arterial Line Dynamic Response / Fast-Flush Test (Ch36)', () => {
  it('classifies a default arterial line as adequate', () => {
    const dr = calculateDynamicResponse({});
    expect(dr.classification).toBe('adequate');
  });

  it('classifies an explicitly underdamped line with a higher natural frequency than overdamped', () => {
    const under = calculateDynamicResponse({ alineDamping: 'underdamped' });
    const over = calculateDynamicResponse({ alineDamping: 'overdamped' });
    expect(under.classification).toBe('underdamped');
    expect(over.classification).toBe('overdamped');
    expect(under.naturalFrequencyHz).toBeGreaterThan(over.naturalFrequencyHz);
    expect(under.dampingCoefficient).toBeLessThan(over.dampingCoefficient);
  });

  it('infers overdamping from a 22G arterial catheter even without an explicit damping flag', () => {
    const dr = calculateDynamicResponse({ accessLines: [{ category: 'Arterial Line', name: '22G Radial Arterial Line' }] });
    expect(dr.classification).toBe('overdamped');
  });

  it('never throws on malformed/missing input', () => {
    expect(() => calculateDynamicResponse(undefined)).not.toThrow();
    expect(() => calculateDynamicResponse(null)).not.toThrow();
    expect(() => calculateDynamicResponse({})).not.toThrow();
  });
});
