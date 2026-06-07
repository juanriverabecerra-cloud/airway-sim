import { describe, it, expect } from 'vitest';
import { synthesizeArterialLine } from '../engine/ArterialLineModel';

describe('Arterial Line Waveform Ingestion & Synthesis Tests', () => {
  const defaultHeight = 100;
  const beatDuration = 0.8; // ~75 BPM

  const mockVitals = (sys = 120, dia = 80, map = 93, svr = 1200, rr = 12) => ({
    sys,
    dia,
    map,
    svr,
    rr,
    hr: 75,
    co: 5.0,
    cmap: map,
    bis: 98,
    temp: 37.0,
    spo2: 99,
    paco2: 40,
    etco2: 40
  });

  const mockPatient = (isArrest = false, cardiacRhythm = 'normal', cprActive = false, stunning = 0, accessLines: any[] = []) => ({
    isArrest,
    cardiacRhythm,
    cprActive,
    myocardialStunning: stunning,
    ebl: 0,
    ebv: 5000,
    height: 175,
    weight: 70,
    sex: 'male',
    age: 40,
    bmi: 22.9,
    position: 'Supine',
    ventilationStatus: 'spontaneous',
    accessLines
  });

  it('should generate a normal baseline waveform mapping properly to y-coordinates', () => {
    const vitals = mockVitals();
    // Default fallback is radial, SBP gets amplified by +12% => 120 * 1.12 = 134.4 SBP
    // Ceiling is 200. SBP = 134.4 => y = 100 * (1 - 134.4/200) = 32.8
    // We add the radial phase lag (0.09) to align with the peak
    const patient = mockPatient();

    const peakTBeat = (0.14 + 0.09) * beatDuration;
    const yPeak = synthesizeArterialLine(peakTBeat, beatDuration, defaultHeight, 0, patient, vitals, []);
    expect(yPeak).toBeLessThanOrEqual(38);
    expect(yPeak).toBeGreaterThanOrEqual(28);

    // DBP gets dropped by -6% => 80 * 0.94 = 75.2 DBP
    // y = 100 * (1 - 75.2/200) = 62.4
    // We add the radial phase lag (0.09) to align with the trough
    const troughTBeat = (0.99 + 0.09) * beatDuration;
    const yTrough = synthesizeArterialLine(troughTBeat, beatDuration, defaultHeight, 0, patient, vitals, []);
    expect(yTrough).toBeLessThanOrEqual(67);
    expect(yTrough).toBeGreaterThanOrEqual(57);
  });

  it('should flatline during cardiac arrest when CPR is not active', () => {
    const vitals = mockVitals(0, 0, 0);
    const patient = mockPatient(true, 'asystole', false);

    const y = synthesizeArterialLine(0.2 * beatDuration, beatDuration, defaultHeight, 0, patient, vitals, []);
    
    // Flatline is at 0 pressure, which maps to bottom of canvas (h * 0.95 = 95)
    expect(y).toBeGreaterThanOrEqual(92);
    expect(y).toBeLessThanOrEqual(98);
  });

  it('should display CPR compression spikes during cardiac arrest when CPR is active', () => {
    const vitals = mockVitals(0, 0, 0);
    const patient = mockPatient(true, 'asystole', true);

    const peakY = synthesizeArterialLine(0.12 * beatDuration, beatDuration, defaultHeight, 0, patient, vitals, []);
    
    // Compressions generate SBP ~90 mmHg => y = 100 * (1 - 90/200) = 55
    expect(peakY).toBeLessThan(90);
    expect(peakY).toBeGreaterThan(45);
  });

  it('should adjust upstroke timing based on contractility', () => {
    const vitals = mockVitals();
    const patient = mockPatient();
    
    // EPI has faster upstroke (higher contractility) => higher pressure (lower y) at early phase p = 0.08
    // Note: since phase lag is 0.09, we test around p = 0.12 (effective phase after lag)
    const testTBeat = 0.12 * beatDuration;
    const yEpi = synthesizeArterialLine(testTBeat, beatDuration, defaultHeight, 0, patient, vitals, [{ name: 'Epinephrine' }]);
    const yNormal = synthesizeArterialLine(testTBeat, beatDuration, defaultHeight, 0, patient, vitals, []);

    expect(yEpi).toBeLessThan(yNormal);
  });

  it('should apply PPV swings when mechanically ventilated', () => {
    const vitals = mockVitals();
    const patient = mockPatient();
    patient.ebl = 2000;
    patient.ventilationStatus = 'mechanical';

    const yAtTime1 = synthesizeArterialLine(0.15 * beatDuration, beatDuration, defaultHeight, 1.0, patient, vitals, []);
    const yAtTime2 = synthesizeArterialLine(0.15 * beatDuration, beatDuration, defaultHeight, 5.0, patient, vitals, []);

    expect(yAtTime1).not.toEqual(yAtTime2);
  });

  it('should respect damping overrides from the patient state', () => {
    const vitals = mockVitals();
    const patientOverdamped = mockPatient();
    patientOverdamped.alineDamping = 'overdamped';

    const testTBeat = 0.15 * beatDuration;
    const yOverdamped = synthesizeArterialLine(testTBeat, beatDuration, defaultHeight, 0, patientOverdamped, vitals, []);
    
    // Overdamped peaks are delayed and lower, so it will have reached a lower pressure (higher y)
    const yNormal = synthesizeArterialLine(testTBeat, beatDuration, defaultHeight, 0, mockPatient(), vitals, []);
    expect(yOverdamped).toBeGreaterThan(yNormal);
  });

  it('should differentiate between radial and axillary catheter amplification', () => {
    const vitals = mockVitals(120, 80, 93);
    
    // Case A: Radial (distal pulse amplification: +12% SBP => SBP 134.4)
    const patientRadial = mockPatient(false, 'normal', false, 0, [
      { category: 'Arterial', name: '20G Arterial Line (Right Radial)' }
    ]);
    const peakTRadial = (0.14 + 0.09) * beatDuration; // systolic peak + radial phase lag
    const yRadial = synthesizeArterialLine(peakTRadial, beatDuration, defaultHeight, 0, patientRadial, vitals, []);

    // Case B: Axillary (central caliber, no SBP amplification => SBP 120)
    const patientAxillary = mockPatient(false, 'normal', false, 0, [
      { category: 'Arterial', name: '18G Arterial Line (Right Axillary)' }
    ]);
    const peakTAxillary = (0.14 + 0.02) * beatDuration; // systolic peak + axillary phase lag
    const yAxillary = synthesizeArterialLine(peakTAxillary, beatDuration, defaultHeight, 0, patientAxillary, vitals, []);

    // Radial peak pressure is higher, so yRadial (higher pressure) should be a lower pixel value than yAxillary (lower pressure)
    expect(yRadial).toBeLessThan(yAxillary);
  });

  it('should simulate central-to-peripheral gradient reversal (radial squeeze) during vasodilatory shock', () => {
    // SVR = 500 (< 700) triggers low SVR radial squeeze
    const vitalsLowSvr = mockVitals(120, 80, 93, 500); 

    // Case A: Radial line (underestimates SBP by -15% => SBP 102)
    const patientRadial = mockPatient(false, 'normal', false, 0, [
      { category: 'Arterial', name: '20G Arterial Line (Right Radial)' }
    ]);
    const peakTRadial = (0.14 + 0.09) * beatDuration;
    const yRadial = synthesizeArterialLine(peakTRadial, beatDuration, defaultHeight, 0, patientRadial, vitalsLowSvr, []);

    // Case B: Axillary line (central caliber, does not drop SBP => SBP 120)
    const patientAxillary = mockPatient(false, 'normal', false, 0, [
      { category: 'Arterial', name: '18G Arterial Line (Right Axillary)' }
    ]);
    const peakTAxillary = (0.14 + 0.02) * beatDuration;
    const yAxillary = synthesizeArterialLine(peakTAxillary, beatDuration, defaultHeight, 0, patientAxillary, vitalsLowSvr, []);

    // Under low SVR, radial line underestimates pressure (lower SBP = higher y value) compared to central axillary line
    expect(yRadial).toBeGreaterThan(yAxillary);
  });
});
