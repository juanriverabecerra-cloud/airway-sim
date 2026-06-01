import { describe, it, expect } from 'vitest';
import { getAttendingResponse } from '../engine/ClinicalAiChat';

describe('Clinical AI Chat Engine (getAttendingResponse)', () => {
  describe('Input Sanitization & Parameter Parsing', () => {
    it('should handle null or undefined parameters gracefully without crashing', () => {
      // @ts-ignore - passing empty query/null state
      const resNull = getAttendingResponse(null, null);
      expect(resNull).toBeDefined();
      expect(typeof resNull).toBe('string');
      expect(resNull).toContain('Attending Briefing');

      // @ts-ignore - passing empty query and state
      const resEmpty = getAttendingResponse('', {});
      expect(resEmpty).toBeDefined();
      expect(resEmpty).toContain('Attending Briefing');
    });

    it('should format numbers and non-finite values safely without crash or NaN propagation', () => {
      const state = {
        vitals: { hr: NaN, map: Infinity, spo2: 85 },
        patient: { ebl: 900, ebv: 0 }, // ebl > 800 and ebv = 0 division risk
        attendingMode: 'observing'
      };
      const res = getAttendingResponse('audit hypovolemia', state);
      expect(res).toBeDefined();
      expect(res).not.toContain('NaN');
      expect(res).not.toContain('Infinity');
    });
  });

  describe('Clinical Zero-Value Guards & Overrides', () => {
    it('should respect a true physiological zero oxygen saturation (SpO2) reading in the hypoxia audit report', () => {
      const state = {
        vitals: { spo2: 0 },
        patient: { isArrest: true, tubePosition: 'trachea' }
      };
      const res = getAttendingResponse('audit hypoxia', state);
      expect(res).toContain('SpO2)**: 0%');
      expect(res).toContain('CONFIRMED SEVERE HYPOXIA');
    });

    it('should respect a true physiological zero compliance reading in the anaphylaxis report', () => {
      const state = {
        vitals: { spo2: 90, map: 45, compl: 0, res: 45 },
        patient: { anaphylaxisTriggered: true, anaphylaxisTreated: false }
      };
      const res = getAttendingResponse('allergy', state);
      expect(res).toContain('Airway compliance is dangerously low at 0 mL/cmH2O');
      expect(res).toContain('LIFE-THREATENING PENICILLIN ANAPHYLAXIS');
    });
  });

  describe('Directives & Case Audits', () => {
    it('should output hyperkalemia directives when potassium exceeds 5.5', () => {
      const state = {
        patient: { potassiumLevel: 6.5 }
      };
      const res = getAttendingResponse('potassium level', state);
      expect(res).toContain('Estimated Potassium (K+)**: 6.5 mEq/L');
      expect(res).toContain('calcium chloride');
      expect(res).toContain('albuterol');
    });

    it('should generate neostigmine vagal bradycardia warning and treatment when active', () => {
      const state = {
        vitals: { hr: 32 },
        patient: { bradycardiaTriggered: true }
      };
      const res = getAttendingResponse('bradycardia', state);
      expect(res).toContain('SEVERE UNOPPOSED MUSCARINIC SURGE');
      expect(res).toContain('glycopyrrolate');
      expect(res).toContain('atropine');
    });

    it('should output beach chair cerebral perfusion warning and calculate actual MAP height gradient', () => {
      const state = {
        vitals: { map: 70 },
        patient: { position: 'Beach Chair' }
      };
      const res = getAttendingResponse('position', state);
      expect(res).toContain('Beach Chair / Sitting Positioning Warning');
      expect(res).toContain('actual cerebral pressure is only ~40 mmHg');
      expect(res).toContain('MAP > 85 mmHg');
    });
  });
});
