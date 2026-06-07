import { describe, it, expect } from 'vitest';
import { getAttendingResponse, resetConversationHistory, verifyResponseGrounding } from '../engine/ClinicalAiChat';
import { boardQuestions } from '../knowledge/BoardQuestions';
import { searchKnowledge } from '../knowledge/KnowledgeSearch';
import { ClientDbBridge } from '../knowledge/ClientDbBridge.ts';
import { beforeAll } from 'vitest';

describe('Clinical AI Chat Engine (getAttendingResponse)', () => {
  beforeAll(async () => {
    await ClientDbBridge.init();
  });
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

  describe('Phase 2: Conversation Memory & Search Quality', () => {
    it('should expand synonyms and find related textbook contents', () => {
      const res = getAttendingResponse('rem sleep', {});
      expect(res).toContain('Attending Knowledge Base Consultation');
      expect(res.toLowerCase()).toContain('rapid eye movement');
    });

    it('should boost heading matches and bigram matches', () => {
      const resHeading = getAttendingResponse('consciousness', {});
      expect(resHeading).toContain('Attending Knowledge Base Consultation');
      expect(resHeading).toContain('Source 1');
    });

    it('should remember previous conversation topics and recall them upon temporal query', () => {
      resetConversationHistory();
      const state = { vitals: { hr: 75, sys: 120, dia: 80, map: 93, spo2: 98 } };
      
      // First turn
      const res1 = getAttendingResponse('What did Miller say about consciousness and sleep?', state);
      expect(res1).toContain('Attending Knowledge Base Consultation');
      
      // Second turn: temporal follow-up
      const res2 = getAttendingResponse('what did you say about consciousness earlier?', state);
      expect(res2).toContain('Conversation Memory Recall');
      expect(res2).toContain('What did Miller say about consciousness and sleep?');
      expect(res2).toContain('Context Badge: [Memory Recall]');
    });
  });

  describe('Phase 3: Source Anchoring, Hallucination Verification & Board Study Mode', () => {
    it('should calculate inline citations in the formatted response text', () => {
      const res = getAttendingResponse('GABA receptors propofol', {});
      expect(res).toContain('[Miller ');
    });

    it('should verify response grounding against current simulator vitals state', () => {
      const state = { vitals: { hr: 80, sys: 120, dia: 80, map: 93, spo2: 99 } };
      
      // Fully grounded response containing actual values
      const groundedResp = "The patient is stable with HR: 80 bpm and BP: 120/80 (MAP: 93 mmHg) and SpO2: 99%.";
      expect(verifyResponseGrounding(groundedResp, state)).toBe(true);
      
      // Hallucinated response claiming different telemetry
      const hallucinatedResp = "The patient has crashed with SpO2: 45% and HR: 140 bpm.";
      expect(verifyResponseGrounding(hallucinatedResp, state)).toBe(false);
    });

    it('should retrieve high-relevance reference context for board exam questions', () => {
      expect(boardQuestions.length).toBeGreaterThanOrEqual(10);
      const q = boardQuestions[0];
      const results = searchKnowledge(q.searchQuery, 3, 0.4);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].record.body_text).toBeDefined();
    });
  });
});
