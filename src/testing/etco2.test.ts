import { describe, it, expect } from 'vitest';
import { synthesizeEtCo2 } from '../engine/EtCo2Model';

describe('EtCO2 Capnography Waveform Synthesizer Tests', () => {
  const defaultHeight = 100;
  const beatDuration = 5.0; // 12 breaths per minute (60 / 12 = 5 seconds per breath)
  const ieRatio = 2.0;

  const mockVitals = (etco2 = 40, rr = 12, hr = 75, paco2 = 40) => ({
    etco2,
    rr,
    hr,
    paco2,
    sys: 120,
    dia: 80,
    map: 93,
    svr: 1200,
    co: 5.0,
    cmap: 93,
    bis: 98,
    temp: 37.0,
    spo2: 99
  });

  const mockPatient = (tubePosition = 'trachea', ventilationStatus = 'mechanical', isBucking = false, isCuffDeflated = false, lastAirwayTime = 0) => ({
    tubePosition,
    ventilationStatus,
    isBucking,
    isCuffDeflated,
    lastAirwayManipulationTime: lastAirwayTime,
    ebl: 0,
    ebv: 5000,
    height: 175,
    weight: 70,
    sex: 'male',
    age: 40,
    bmi: 22.9,
    position: 'Supine'
  });

  it('should return baseline for apnea (rr = 0) or zero etco2', () => {
    const vitals = mockVitals(40, 0); // rr = 0
    const patient = mockPatient();
    
    const y = synthesizeEtCo2(2.0, beatDuration, defaultHeight, 0, patient, vitals, [], ieRatio);
    // Should be at the baseline (approx 95)
    expect(y).toBeGreaterThanOrEqual(93);
    expect(y).toBeLessThanOrEqual(97);
  });

  it('should rise during expiratory phase under normal conditions', () => {
    const vitals = mockVitals();
    const patient = mockPatient();
    
    // In a 5.0s breath with I:E = 1:2:
    // inspTime = 5.0 * 1/3 = 1.67 seconds
    // expTime = 3.33 seconds
    // At t = 1.0 (inspiration): should be at baseline (95)
    const yInspiration = synthesizeEtCo2(1.0, beatDuration, defaultHeight, 0, patient, vitals, [], ieRatio);
    expect(yInspiration).toBeGreaterThanOrEqual(93);
    expect(yInspiration).toBeLessThanOrEqual(97);

    // At t = 3.0 (expiration): should rise to peak (which is baseline - 70 * ampScale = 95 - 70 * 1 = 25)
    const yExpiration = synthesizeEtCo2(3.0, beatDuration, defaultHeight, 0, patient, vitals, [], ieRatio);
    expect(yExpiration).toBeLessThan(50);
    expect(yExpiration).toBeGreaterThan(15);
  });

  it('should slow the upstroke under bronchospasm (shark-fin)', () => {
    const vitals = mockVitals();
    const patientNormal = mockPatient();
    const patientObstructed = mockPatient();
    // Enable bronchospasm
    (patientObstructed as any).bronchospasm = true;

    // Test early expiration phase, shortly after expTime begins (inspTime = 1.67, test at t = 2.0s => tExp = 0.33s)
    const testTime = 2.0;
    const yNormal = synthesizeEtCo2(testTime, beatDuration, defaultHeight, 0, patientNormal, vitals, [], ieRatio);
    const yObstructed = synthesizeEtCo2(testTime, beatDuration, defaultHeight, 0, patientObstructed, vitals, [], ieRatio);

    // Obstruction causes slower rise (higher Y = lower CO2 concentration at early expiration)
    expect(yObstructed).toBeGreaterThan(yNormal);
  });

  it('should flatline after 20 seconds during esophageal intubation', () => {
    const vitals = mockVitals();
    const patientEsophageal = mockPatient('esophagus', 'mechanical', false, false, 0); // intubated at time 0

    // After 20 seconds of esophageal placement: should flatline to baseline
    const yLate = synthesizeEtCo2(3.0, beatDuration, defaultHeight, 20.0, patientEsophageal, vitals, [], ieRatio);
    expect(yLate).toBeGreaterThanOrEqual(93);
    expect(yLate).toBeLessThanOrEqual(97);
  });

  it('should perform transient gastric washout during initial esophageal intubation', () => {
    const vitals = mockVitals();
    const patientEsophageal = mockPatient('esophagus', 'mechanical', false, false, 5000); // intubated at time 5s (5000ms)

    // At absolute time 10s (elapsed = 5s): washout should show a decaying wave (Y is lower than baseline)
    const yWashout = synthesizeEtCo2(3.0, beatDuration, defaultHeight, 10.0, patientEsophageal, vitals, [], ieRatio);
    expect(yWashout).toBeLessThan(baselineOf(defaultHeight)); 
  });

  it('should render a curare cleft dip when NMB is recovering', () => {
    const vitals = mockVitals();
    (vitals as any).tofCount = 2; // recovering muscle function
    const patient = mockPatient('trachea', 'mechanical');

    // Cleft occurs around 65% of expTime (inspTime = 1.67, expTime = 3.33 => cleft around 1.67 + 3.33 * 0.65 = 3.83s)
    const yCleft = synthesizeEtCo2(3.83, beatDuration, defaultHeight, 0, patient, vitals, [], ieRatio);
    const yPlateauNoCleft = synthesizeEtCo2(2.5, beatDuration, defaultHeight, 0, patient, vitals, [], ieRatio);

    // Cleft should pull the plateau down towards baseline (higher Y coordinate value)
    expect(yCleft).toBeGreaterThan(yPlateauNoCleft);
  });

  it('should render cardiogenic oscillations when fully paralyzed', () => {
    const vitals = mockVitals();
    (vitals as any).tofCount = 0; // fully paralyzed
    const patient = mockPatient('trachea', 'mechanical');

    // Test at two different absolute times during the plateau (t = 3.0s)
    const yTime1 = synthesizeEtCo2(3.0, beatDuration, defaultHeight, 1.0, patient, vitals, [], ieRatio);
    const yTime2 = synthesizeEtCo2(3.0, beatDuration, defaultHeight, 1.5, patient, vitals, [], ieRatio);

    // Oscillations should modulate the plateau dynamically over time
    expect(yTime1).not.toEqual(yTime2);
  });

  it('should dilute alveolar gas and drop the plateau when ETT cuff is deflated', () => {
    const vitals = mockVitals();
    const patientCuffDeflated = mockPatient('trachea', 'mechanical', false, true); // cuff deflated

    // Test near the end of expiration (t = 4.8s)
    const yCuffDeflated = synthesizeEtCo2(4.8, beatDuration, defaultHeight, 0, patientCuffDeflated, vitals, [], ieRatio);
    const yNormal = synthesizeEtCo2(4.8, beatDuration, defaultHeight, 0, mockPatient(), vitals, [], ieRatio);

    // Deflated cuff leak drops the CO2 concentration (higher Y value)
    expect(yCuffDeflated).toBeGreaterThan(yNormal);
  });

  function baselineOf(h: number) {
    return h * 0.95;
  }
});
