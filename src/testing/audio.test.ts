import { describe, it, expect } from 'vitest';
import * as SoundManager from '../engine/SoundManager';

describe('Anesthesia Monitor Sound Engine', () => {
  it('should initialize and synchronize settings correctly', () => {
    SoundManager.updateSettings({ master: false, pulse: true, vent: true, alarms: true });
    
    // Test update of physiology parameters
    const vitalsMock = { hr: 80, spo2: 95, rr: 12 };
    const patientMock = { isArrest: false, airwaySecured: true };
    const ventSettingsMock = { rr: 10, ieRatio: 2 };
    
    expect(() => {
      SoundManager.updatePhysiology(vitalsMock, patientMock, ventSettingsMock, false);
    }).not.toThrow();
  });

  it('should handle master switch activation safely without Web Audio Context issues in headless environments', () => {
    // In node/vitest, window.AudioContext may not exist. SoundManager handles this gracefully.
    expect(() => {
      SoundManager.updateSettings({ master: true, pulse: false });
    }).not.toThrow();
    
    // Clean up
    SoundManager.updateSettings({ master: false });
  });
});
