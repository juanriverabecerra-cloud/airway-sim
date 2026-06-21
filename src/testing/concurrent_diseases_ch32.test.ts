import { describe, it, expect } from 'vitest';
import {
  STOP_BANG_ITEMS,
  calculateStopBangScore,
  calculateChronicMedicationManagementPlan,
  assessPheoBlockadeAdequacy
} from '../components/modals/PreOpEMR.jsx';
import { getAttendingResponse, resetConversationHistory } from '../engine/ClinicalAiChat.js';

describe('Ch32: Anesthetic Implications of Concurrent Diseases', () => {

  describe('calculateStopBangScore (STOP-BANG OSA screening)', () => {
    it('should classify 0-2 checked items as low risk', () => {
      expect(calculateStopBangScore({}).riskLevel).toBe('low');
      expect(calculateStopBangScore({ snoring: true, tiredness: true }).riskLevel).toBe('low');
    });

    it('should classify 3-4 checked items as intermediate risk', () => {
      const result = calculateStopBangScore({ snoring: true, tiredness: true, observedApnea: true });
      expect(result.score).toBe(3);
      expect(result.riskLevel).toBe('intermediate');
    });

    it('should classify 5+ checked items as high risk', () => {
      const result = calculateStopBangScore({ snoring: true, tiredness: true, observedApnea: true, pressure: true, bmi: true });
      expect(result.score).toBe(5);
      expect(result.riskLevel).toBe('high');
    });

    it('should reach the maximum score of 8 when all items are checked', () => {
      const allChecked = STOP_BANG_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: true }), {});
      expect(calculateStopBangScore(allChecked).score).toBe(8);
    });

    it('should not throw on missing/malformed input', () => {
      expect(() => calculateStopBangScore(undefined)).not.toThrow();
      expect(() => calculateStopBangScore(null)).not.toThrow();
    });
  });

  describe('calculateChronicMedicationManagementPlan (Ch32: HTN / statin guidance)', () => {
    it('should recommend holding ACE-I/ARB and continuing other antihypertensives for an HTN patient', () => {
      const plan = calculateChronicMedicationManagementPlan({ htn: true });
      const acei = plan.find(p => p.drug.includes('ACE'));
      const others = plan.find(p => p.drug.includes('All Other'));
      expect(acei.action).toMatch(/Hold/);
      expect(others.action).toMatch(/Continue/);
    });

    it('should recommend statin continuation for a documented CAD patient', () => {
      const plan = calculateChronicMedicationManagementPlan({ cad: true });
      const statin = plan.find(p => p.drug.includes('Statin'));
      expect(statin).toBeDefined();
      expect(statin.action).toMatch(/Continue/);
    });

    it('should recommend statin therapy for a diabetic patient aged 40-75', () => {
      const inRange = calculateChronicMedicationManagementPlan({ diabetes: true, age: 55 });
      const outOfRange = calculateChronicMedicationManagementPlan({ diabetes: true, age: 30 });
      expect(inRange.find(p => p.drug.includes('Statin'))).toBeDefined();
      expect(outOfRange.find(p => p.drug.includes('Statin'))).toBeUndefined();
    });

    it('should recommend statin therapy for LDL >= 190 regardless of other flags', () => {
      const plan = calculateChronicMedicationManagementPlan({ ldl: 195 });
      expect(plan.find(p => p.drug.includes('Statin'))).toBeDefined();
    });

    it('should return an empty plan for a patient with no HTN/CAD/diabetes/high LDL', () => {
      expect(calculateChronicMedicationManagementPlan({})).toEqual([]);
    });

    it('should not throw on missing patient', () => {
      expect(() => calculateChronicMedicationManagementPlan(undefined)).not.toThrow();
    });
  });

  describe('assessPheoBlockadeAdequacy (Ch32: pheochromocytoma blockade criteria)', () => {
    it('should consider blockade adequate when all four criteria are met', () => {
      const result = assessPheoBlockadeAdequacy({ maxSbp48h: 150, maxDbp48h: 85, standingSbp: 95, standingDbp: 60, ecgStChangesPersistent: false, pvcPer5Min: 0 });
      expect(result.isAdequatelyBlocked).toBe(true);
    });

    it('should flag inadequate blockade when BP exceeds 165/90 in the preceding 48h', () => {
      const result = assessPheoBlockadeAdequacy({ maxSbp48h: 170, maxDbp48h: 95, standingSbp: 95, standingDbp: 60, ecgStChangesPersistent: false, pvcPer5Min: 0 });
      expect(result.bpControlled).toBe(false);
      expect(result.isAdequatelyBlocked).toBe(false);
    });

    it('should flag inadequate blockade when standing BP drops below 80/45', () => {
      const result = assessPheoBlockadeAdequacy({ maxSbp48h: 150, maxDbp48h: 85, standingSbp: 70, standingDbp: 40, ecgStChangesPersistent: false, pvcPer5Min: 0 });
      expect(result.orthostasisAcceptable).toBe(false);
    });

    it('should flag inadequate blockade for persistent ECG ST-T changes or excessive PVCs', () => {
      const ecgFail = assessPheoBlockadeAdequacy({ maxSbp48h: 150, maxDbp48h: 85, standingSbp: 95, standingDbp: 60, ecgStChangesPersistent: true, pvcPer5Min: 0 });
      expect(ecgFail.ecgClear).toBe(false);
      const pvcFail = assessPheoBlockadeAdequacy({ maxSbp48h: 150, maxDbp48h: 85, standingSbp: 95, standingDbp: 60, ecgStChangesPersistent: false, pvcPer5Min: 3 });
      expect(pvcFail.pvcControlled).toBe(false);
    });

    it('should not throw and should default to not-adequately-blocked on missing data', () => {
      expect(() => assessPheoBlockadeAdequacy(undefined)).not.toThrow();
      expect(assessPheoBlockadeAdequacy(undefined).isAdequatelyBlocked).toBe(false);
    });
  });

  describe('Attending Chat: OSA / Pheochromocytoma Knowledge Layer (Ch32)', () => {
    it('should answer an OSA/STOP-BANG question grounded in the live patient chart when available', () => {
      resetConversationHistory();
      const state = {
        vitals: { hr: 70, sys: 120, dia: 80, map: 93, spo2: 98 },
        patient: { osaStopBangScore: 6, osaRiskLevel: 'high' },
        caseId: 'general',
        activeMeds: [],
        surgicalPhase: 'Pre-Op',
        time: 0,
        logs: []
      };
      const response = getAttendingResponse('what is this patient\'s OSA / STOP-BANG risk?', state, []);
      expect(response).toContain('STOP-BANG');
      expect(response).toContain('6/8');
      expect(response).toContain('HIGH RISK');
    });

    it('should answer a pheochromocytoma preparation question with the alpha-before-beta blockade protocol', () => {
      resetConversationHistory();
      const state = {
        vitals: { hr: 70, sys: 120, dia: 80, map: 93, spo2: 98 },
        patient: {},
        caseId: 'general',
        activeMeds: [],
        surgicalPhase: 'Pre-Op',
        time: 0,
        logs: []
      };
      const response = getAttendingResponse('how should I prepare a pheochromocytoma patient?', state, []);
      expect(response).toContain('phenoxybenzamine');
      expect(response).toContain('alpha-adrenergic blockade');
    });
  });
});
