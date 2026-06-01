import { describe, it, expect } from 'vitest';
import { evaluateAttendingGuidance } from '../engine/AttendingEngine';

describe('Attending Consultation Engine (evaluateAttendingGuidance)', () => {
  describe('Input Sanitization & Parameter Parsing', () => {
    it('should handle null or undefined parameters gracefully without crashing', () => {
      // @ts-ignore - explicitly passing empty object or null to verify crash resilience
      const resNull = evaluateAttendingGuidance(null);
      expect(resNull).toBeDefined();
      expect(resNull.activeAlertsCount).toBe(1); // MAP defaults to 0, triggering severe hypotension warning
      expect(resNull.nearFutureForecast).toBeDefined();

      // @ts-ignore - passing empty parameter object
      const resEmpty = evaluateAttendingGuidance({});
      expect(resEmpty).toBeDefined();
      expect(resEmpty.activeAlertsCount).toBe(1); // MAP defaults to 0, triggering severe hypotension warning
    });

    it('should format numbers and non-finite values safely using fmt helper', () => {
      // Test the attending alerts formatting stability
      const result = evaluateAttendingGuidance({
        vitals: { hr: NaN, map: Infinity, spo2: 85 }, // extreme parameters
        patient: { myocardialStunning: NaN, ebl: 900, ebv: 0 }, // ebl > 800 with ebv = 0
        attendingMode: 'observing'
      });
      expect(result).toBeDefined();
      // Should handle ebl > 800 and ebv = 0 safely without producing NaN/Infinity in forecast
      expect(result.nearFutureForecast).not.toContain('NaN');
      expect(result.nearFutureForecast).not.toContain('Infinity');
    });
  });

  describe('Clinical Zero-Value Guards & Overrides', () => {
    it('should respect a true physiological zero oxygen saturation (SpO2) reading and trigger hypoxemia alert', () => {
      const result = evaluateAttendingGuidance({
        vitals: { spo2: 0 }, // Severe arrest/hypoxia state
        patient: { isArrest: false },
        attendingMode: 'observing'
      });
      
      expect(result.fullAudit.some(a => a.id === 'hypoxemia')).toBe(true);
      const hypoxemiaAlert = result.fullAudit.find(a => a.id === 'hypoxemia');
      expect(hypoxemiaAlert?.message).toContain('SpO2: 0%');
    });

    it('should respect a true physiological zero compliance reading and trigger high airway pressure warning', () => {
      const result = evaluateAttendingGuidance({
        vitals: { compl: 0, pip: 45 },
        attendingMode: 'observing'
      });
      
      expect(result.fullAudit.some(a => a.id === 'airway_pressure_high')).toBe(true);
    });

    it('should trigger hypocapnia suggestion on extremely low paco2 (e.g. 5 mmHg) and not override to 40', () => {
      const result = evaluateAttendingGuidance({
        vitals: { paco2: 5 },
        attendingMode: 'observing'
      });

      expect(result.fullAudit.some(a => a.id === 'hypocapnia')).toBe(true);
    });
  });

  describe('Medical Alert Triggers & Resolution Interlocks', () => {
    it('should trigger Life-Threatening Anaphylaxis warning and resolve it when anaphylaxis is treated', () => {
      const activeState = evaluateAttendingGuidance({
        vitals: { spo2: 95, map: 45, compl: 15 },
        patient: { anaphylaxisTriggered: true, anaphylaxisTreated: false },
        attendingMode: 'observing'
      });
      expect(activeState.fullAudit.some(a => a.id === 'anaphylaxis_active')).toBe(true);

      const resolvedState = evaluateAttendingGuidance({
        vitals: { spo2: 95, map: 70, compl: 45 },
        patient: { anaphylaxisTriggered: true, anaphylaxisTreated: true },
        attendingMode: 'observing'
      });
      expect(resolvedState.fullAudit.some(a => a.id === 'anaphylaxis_active')).toBe(false);
    });

    it('should trigger Neostigmine Bradycardia alert when active and resolve it when bradycardiaTriggered goes false', () => {
      const activeState = evaluateAttendingGuidance({
        vitals: { hr: 30 },
        patient: { bradycardiaTriggered: true },
        attendingMode: 'observing'
      });
      expect(activeState.fullAudit.some(a => a.id === 'unopposed_muscarinic')).toBe(true);

      const resolvedState = evaluateAttendingGuidance({
        vitals: { hr: 75 },
        patient: { bradycardiaTriggered: false },
        attendingMode: 'observing'
      });
      expect(resolvedState.fullAudit.some(a => a.id === 'unopposed_muscarinic')).toBe(false);
    });

    it('should trigger Hyperkalemia warning when potassium exceeds 5.5', () => {
      const normalKState = evaluateAttendingGuidance({
        patient: { potassiumLevel: 4.0, suxPotassiumLeaked: false },
        attendingMode: 'observing'
      });
      expect(normalKState.fullAudit.some(a => a.id === 'hyperkalemia_alarm')).toBe(false);

      const hyperKState = evaluateAttendingGuidance({
        patient: { potassiumLevel: 5.8, suxPotassiumLeaked: false },
        attendingMode: 'observing'
      });
      expect(hyperKState.fullAudit.some(a => a.id === 'hyperkalemia_alarm')).toBe(true);
    });

    it('should trigger suxPotassiumLeaked hyperkalemia alert even if no baseline potassiumLevel is provided', () => {
      const leakState = evaluateAttendingGuidance({
        patient: { suxPotassiumLeaked: true },
        attendingMode: 'observing'
      });
      expect(leakState.fullAudit.some(a => a.id === 'hyperkalemia_alarm')).toBe(true);
    });

    it('should trigger beach chair cerebral ischemia alert when position is Beach Chair and measured arm MAP is low', () => {
      const activeState = evaluateAttendingGuidance({
        vitals: { map: 65 },
        patient: { position: 'Beach Chair' },
        attendingMode: 'observing'
      });
      expect(activeState.fullAudit.some(a => a.id === 'beach_chair_ischemia')).toBe(true);

      const normalState = evaluateAttendingGuidance({
        vitals: { map: 90 },
        patient: { position: 'Beach Chair' },
        attendingMode: 'observing'
      });
      expect(normalState.fullAudit.some(a => a.id === 'beach_chair_ischemia')).toBe(false);
    });
  });

  describe('Advisory Modes and Fallbacks', () => {
    it('should return teaching primaryGuidance under teachingMode and criticalAlert active', () => {
      const state = evaluateAttendingGuidance({
        vitals: { spo2: 0 },
        attendingMode: 'teaching'
      });
      expect(state.primaryGuidance).toBeDefined();
      expect(state.primaryGuidance?.priority).toBe('CRITICAL');
      expect(state.primaryGuidance?.title).toContain('HYPOXEMIA');
    });

    it('should return null primaryGuidance under observingMode when no critical/warning alerts are active', () => {
      const state = evaluateAttendingGuidance({
        vitals: { spo2: 98, map: 85, hr: 70 },
        attendingMode: 'observing'
      });
      expect(state.primaryGuidance).toBeNull();
    });

    it('should return procedural_step info at the end of the fullAudit array as a baseline fallback', () => {
      const state = evaluateAttendingGuidance({
        vitals: { spo2: 98, map: 85, hr: 70 },
        attendingMode: 'observing'
      });
      const lastAuditItem = state.fullAudit[state.fullAudit.length - 1];
      expect(lastAuditItem.id).toBe('procedural_step');
    });
  });
});
