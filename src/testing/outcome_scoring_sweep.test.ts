import { describe, it, expect } from 'vitest';
import { createQualityEvent, scoreQualityEvents, calculatePacuReadiness } from '../engine/OutcomeScoringEngine.ts';
import { getAttendingResponse, resetConversationHistory } from '../engine/ClinicalAiChat.js';

describe('Ch9-30 Retroactive Sweep: Outcome Scoring & PACU Infrastructure', () => {

  describe('1. QualityEvent Creation & Defensive Defaults', () => {
    it('should create a valid event from full input', () => {
      const ev = createQualityEvent({ time: 120, phase: 'PACU', category: 'CrisisManagement', severity: 'critical', description: 'Test event' });
      expect(ev.time).toBe(120);
      expect(ev.phase).toBe('PACU');
      expect(ev.category).toBe('CrisisManagement');
      expect(ev.severity).toBe('critical');
    });

    it('should fall back to safe defaults for missing/invalid fields rather than throwing', () => {
      expect(() => createQualityEvent({})).not.toThrow();
      const ev = createQualityEvent({ phase: 'NotAPhase', severity: 'NotASeverity', category: 'NotACategory' });
      expect(ev.phase).toBe('Intraoperative');
      expect(ev.severity).toBe('minor');
      expect(ev.category).toBe('Vigilance');
      expect(ev.description).toBe('Unspecified quality-of-care event.');
    });
  });

  describe('2. Outcome Score Aggregation', () => {
    it('should return a perfect score of 100 for an empty or missing event list', () => {
      expect(scoreQualityEvents([]).score).toBe(100);
      expect(scoreQualityEvents(undefined).score).toBe(100);
      expect(scoreQualityEvents(null).score).toBe(100);
    });

    it('should deduct severity-weighted penalties and never go below 0', () => {
      const events = [
        createQualityEvent({ severity: 'critical' }), // -30
        createQualityEvent({ severity: 'major' }),     // -15
        createQualityEvent({ severity: 'moderate' }),  // -5
      ];
      const result = scoreQualityEvents(events);
      expect(result.score).toBe(50); // 100 - 30 - 15 - 5
      expect(result.criticalEventCount).toBe(1);
      expect(result.majorEventCount).toBe(1);
    });

    it('should clamp the score at 0 even with many critical events', () => {
      const events = Array.from({ length: 10 }, () => createQualityEvent({ severity: 'critical' }));
      expect(scoreQualityEvents(events).score).toBe(0);
    });

    it('should not deduct points for "info" severity events', () => {
      const events = [createQualityEvent({ severity: 'info' }), createQualityEvent({ severity: 'info' })];
      expect(scoreQualityEvents(events).score).toBe(100);
    });

    it('should break down penalties by category and phase of care', () => {
      const events = [
        createQualityEvent({ severity: 'major', category: 'CrisisManagement', phase: 'Intraoperative' }),
        createQualityEvent({ severity: 'moderate', category: 'PostopReadiness', phase: 'PACU' }),
      ];
      const result = scoreQualityEvents(events);
      expect(result.categoryBreakdown.CrisisManagement).toBe(15);
      expect(result.categoryBreakdown.PostopReadiness).toBe(5);
      expect(result.phaseBreakdown.Intraoperative).toBe(15);
      expect(result.phaseBreakdown.PACU).toBe(5);
    });
  });

  describe('3. PACU Readiness (Aldrete-style) Scoring', () => {
    const fullyRecoveredVitals = { tofCount: 4, tofRatio: 1.0, rr: 14, map: 80, bis: 98, spo2: 98 };
    const fullyRecoveredPatient = { baselineMap: 80, currentO2Device: 'Room Air', isApneic: false };

    it('should score a fully recovered patient at 10/10 and ready for discharge', () => {
      const result = calculatePacuReadiness(fullyRecoveredVitals, fullyRecoveredPatient);
      expect(result.totalScore).toBe(10);
      expect(result.isReadyForDischarge).toBe(true);
    });

    it('should dock the Activity criterion for residual neuromuscular blockade', () => {
      const result = calculatePacuReadiness({ ...fullyRecoveredVitals, tofCount: 3, tofRatio: 0 }, fullyRecoveredPatient);
      expect(result.criteria.activity.points).toBe(0);
      expect(result.isReadyForDischarge).toBe(false);
    });

    it('should dock the Respiration criterion for apnea or abnormal respiratory rate', () => {
      const apneic = calculatePacuReadiness(fullyRecoveredVitals, { ...fullyRecoveredPatient, isApneic: true });
      expect(apneic.criteria.respiration.points).toBe(0);

      const tachypneic = calculatePacuReadiness({ ...fullyRecoveredVitals, rr: 32 }, fullyRecoveredPatient);
      expect(tachypneic.criteria.respiration.points).toBe(0);
    });

    it('should dock the Circulation criterion proportionally to MAP deviation from baseline', () => {
      const mild = calculatePacuReadiness({ ...fullyRecoveredVitals, map: 65 }, fullyRecoveredPatient); // 18.75% deviation
      expect(mild.criteria.circulation.points).toBe(2);

      const moderate = calculatePacuReadiness({ ...fullyRecoveredVitals, map: 60 }, fullyRecoveredPatient); // 25% deviation
      expect(moderate.criteria.circulation.points).toBe(1);

      const severe = calculatePacuReadiness({ ...fullyRecoveredVitals, map: 35 }, fullyRecoveredPatient); // 56% deviation
      expect(severe.criteria.circulation.points).toBe(0);
    });

    it('should dock the Consciousness criterion for low BIS (still anesthetized)', () => {
      const result = calculatePacuReadiness({ ...fullyRecoveredVitals, bis: 45 }, fullyRecoveredPatient);
      expect(result.criteria.consciousness.points).toBe(0);
    });

    it('should dock the O2 Saturation criterion for hypoxemia or supplemental O2 dependence', () => {
      const onO2 = calculatePacuReadiness({ ...fullyRecoveredVitals, spo2: 95 }, { ...fullyRecoveredPatient, currentO2Device: 'Nasal Cannula' });
      expect(onO2.criteria.oxygenation.points).toBe(1);

      const hypoxemic = calculatePacuReadiness({ ...fullyRecoveredVitals, spo2: 85 }, fullyRecoveredPatient);
      expect(hypoxemic.criteria.oxygenation.points).toBe(0);
    });

    it('should require both score >= 9 AND no single criterion at 0 for discharge readiness', () => {
      // Score could reach 9 with one criterion at 1 (2+2+2+2+1=9), which IS ready (no zero).
      const nineNoZero = calculatePacuReadiness({ ...fullyRecoveredVitals, map: 60 }, fullyRecoveredPatient);
      expect(nineNoZero.totalScore).toBe(9);
      expect(nineNoZero.isReadyForDischarge).toBe(true);

      // A score that happens to reach 8 via one criterion at 0 should NOT be ready even if others compensate.
      const eightWithZero = calculatePacuReadiness({ ...fullyRecoveredVitals, bis: 40, map: 80 }, fullyRecoveredPatient);
      expect(eightWithZero.criteria.consciousness.points).toBe(0);
      expect(eightWithZero.isReadyForDischarge).toBe(false);
    });

    it('should remain finite and bounded for malformed/missing vitals or patient', () => {
      const result = calculatePacuReadiness(undefined, undefined);
      expect(Number.isFinite(result.totalScore)).toBe(true);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(10);
    });
  });

  describe('4. Attending Chat: RCRI & PACU Knowledge-Layer Wiring (Ch30/Ch9-30 sweep)', () => {
    it('should answer an RCRI/cardiac-risk question grounded in the live patient/case state', () => {
      resetConversationHistory();
      const state = {
        vitals: { hr: 70, sys: 120, dia: 80, map: 93, spo2: 98 },
        patient: { cad: true, chf: true, weight: 70 },
        caseId: 'vascular',
        activeMeds: [],
        surgicalPhase: 'Pre-Op',
        time: 0,
        logs: []
      };
      const response = getAttendingResponse('what is this patient\'s RCRI cardiac risk?', state, []);
      expect(response).toContain('RCRI');
      expect(response).toContain('3/6');
    });

    it('should answer a PACU readiness question grounded in live vitals', () => {
      resetConversationHistory();
      const state = {
        vitals: { hr: 70, sys: 120, dia: 80, map: 80, spo2: 98, tofCount: 4, tofRatio: 1.0, bis: 98, rr: 14 },
        patient: { baselineMap: 80, currentO2Device: 'Room Air' },
        caseId: 'general',
        activeMeds: [],
        surgicalPhase: 'Emergence',
        time: 0,
        logs: []
      };
      const response = getAttendingResponse('is this patient ready for PACU?', state, []);
      expect(response).toContain('PACU Readiness');
      expect(response).toContain('10/10');
    });
  });
});
