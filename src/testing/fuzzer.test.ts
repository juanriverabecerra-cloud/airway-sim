import { describe, it, expect, vi } from 'vitest';
import { 
  getRandomFuzzAction, 
  getGuidedFuzzAction, 
  executeFuzzAction, 
  generateFidelityReport, 
  FUZZ_ACTIONS, 
  FALLBACK_ACTION 
} from '../engine/FidelityFuzzer';

describe('Scenario Fuzzer Integration & Safety Tests', () => {
  
  // 1. Basic Action Generation & Fallbacks
  describe('Basic Action Generation', () => {
    it('should return a valid random fuzz action', () => {
      const action = getRandomFuzzAction();
      expect(action).toBeDefined();
      expect(action.name).toBeTypeOf('string');
      expect(FUZZ_ACTIONS).toContainEqual(action);
    });

    it('should return a random fuzz action if simulator state is missing', () => {
      const action = getGuidedFuzzAction(null, {});
      expect(action).toBeDefined();
      expect(action.name).toBeTypeOf('string');
    });

    it('should initialize empty fuzzerState if called with empty object', () => {
      const fuzzerState: any = {};
      const state = {
        patient: {},
        vitals: {},
        activeMeds: []
      };
      
      const action = getGuidedFuzzAction(state, fuzzerState);
      expect(action).toBeDefined();
      expect(fuzzerState.phase).toBe('PRE_OP');
      expect(fuzzerState.currentSequence).toBeDefined();
      expect(fuzzerState.drugsGiven).toBeDefined();
    });

    it('should safeguard call even if fuzzerState is undefined/null', () => {
      const state = {
        patient: {},
        vitals: {},
        activeMeds: []
      };
      
      // Should not throw
      const action = getGuidedFuzzAction(state, null);
      expect(action).toBeDefined();
      expect(action.name).toBeTypeOf('string');
    });
  });

  // 2. Strategy Archetypes & Sequences
  describe('Fuzzer Strategy Archetypes', () => {
    
    // Helper state structure
    const createMockState = (overrides = {}) => ({
      patient: {
        accessLines: [],
        isParalyzed: false,
        airwaySecured: false,
        isArrest: false,
        hasBisMonitor: false,
        hasTofMonitor: false,
        ...((overrides as any).patient || {})
      },
      vitals: {
        map: 80,
        hr: 75,
        bis: 50,
        tofCount: 4,
        spo2: 98,
        ...((overrides as any).vitals || {})
      },
      activeMeds: [],
      ...overrides
    });

    it('should progress through standard guided sequence phases', () => {
      const state = createMockState();
      const fuzzerState: any = {};
      
      // Step 1: Place IV (Pre-op)
      const action1 = getGuidedFuzzAction(state, fuzzerState, 'guided');
      expect(action1.type).toBe('line');
      expect(fuzzerState.phase).toBe('PRE_OP');

      // Step 2: Since flags are false, fuzzer queues monitors setup
      state.patient.accessLines.push({ category: 'Peripheral IV', id: 'iv1' });
      const action2 = getGuidedFuzzAction(state, fuzzerState, 'guided');
      expect(action2.actionName).toBe('attach_bis');
      
      // Exhausting the monitor setup sequence
      expect(fuzzerState.currentSequence.length).toBeGreaterThan(0);
      fuzzerState.currentSequence = []; // Clear sequence to test standard switch
      
      // Set triggers to advance to INDUCTION
      state.patient.hasBisMonitor = true;
      state.patient.hasTofMonitor = true;
      
      const action3 = getGuidedFuzzAction(state, fuzzerState, 'guided');
      // When induction is queued, fuzzerState immediately advances to AIRWAY_MGMT phase
      expect(fuzzerState.phase).toBe('AIRWAY_MGMT');
      expect(action3.drug).toBe('Fentanyl');
    });

    it('should execute polypharmacy strategy actions', () => {
      const state = createMockState({
        patient: {
          accessLines: [{ category: 'Peripheral IV', id: 'iv1' }, { category: 'Arterial Line', id: 'art1' }],
          hasBisMonitor: true,
          hasTofMonitor: true
        }
      });
      const fuzzerState: any = {};

      const action = getGuidedFuzzAction(state, fuzzerState, 'polypharmacy');
      // Since it immediately transitions PRE_OP -> INDUCTION -> AIRWAY_MGMT
      expect(fuzzerState.phase).toBe('AIRWAY_MGMT');
      expect(action.drug).toBe('Midazolam');
    });

    it('should execute ultimate coverage strategy phases without crashing', () => {
      const state = createMockState();
      const fuzzerState: any = {
        ultimatePhase: 'PRE_OP'
      };

      const action = getGuidedFuzzAction(state, fuzzerState, 'ultimate');
      expect(action.action).toBe('npo');
      expect(fuzzerState.ultimatePhase).toBe('INDUCTION');
    });

    it('should simulate malpractice errors and fixation bias during hypoxia', () => {
      const state = createMockState({
        vitals: { spo2: 70 } // hypoxia
      });
      const fuzzerState: any = {
        phase: 'AIRWAY_MGMT',
        attemptCount: 0
      };

      const action = getGuidedFuzzAction(state, fuzzerState, 'malpractice');
      expect(action.name).toContain('Failed Intubation attempt');
      expect(fuzzerState.attemptCount).toBe(1);
    });

    it('should simulate mechanical failure scenarios under right mainstem misplacement', () => {
      const state = createMockState({
        patient: { tubePosition: 'right_mainstem' },
        vitals: { spo2: 88 }
      });
      const fuzzerState: any = {
        phase: 'MAINTENANCE'
      };

      const action = getGuidedFuzzAction(state, fuzzerState, 'mechanical');
      expect(action.actionName).toBe('pull_back_ett');
    });
  });

  // 3. Defensive Callback Execution
  describe('Action Dispatch & Execution Safeguards', () => {
    it('should safely exit without crashing when no action object is provided', () => {
      const result = executeFuzzAction(null, {});
      expect(result).toBe('No action provided');
    });

    it('should map undefined handlers to safe fallback mocks', () => {
      const action = { type: 'position', value: 'Trendelenburg' };
      // Passing empty object as handlers should not crash, since setPatient defaults safely
      const result = executeFuzzAction(action, {});
      expect(result).toBe('Change position to Trendelenburg');
    });

    it('should execute medical push successfully and lower-case drug key', () => {
      const action = { type: 'med', drug: 'Propofol', dose: 150, route: 'IV', medType: 'Bolus', unit: 'mg' };
      const mockHandleProcessMed = vi.fn();
      
      const result = executeFuzzAction(action, {
        handleProcessMed: mockHandleProcessMed
      } as any);

      expect(mockHandleProcessMed).toHaveBeenCalledWith('propofol', 150, 'IV', 'Bolus', 'mg', null);
      expect(result).toBe('Push Propofol 150mg IV');
    });

    it('should successfully pick correct access line depending on action constraints', () => {
      const action = { type: 'fluid', nameFluid: 'Lactated Ringers (LR)', volume: 500 };
      const patient = {
        accessLines: [
          { category: 'Peripheral IV', id: 'piv-1', failed: false },
          { category: 'Arterial Line', id: 'art-1', failed: false }
        ]
      };
      const mockHandlePushFluid = vi.fn();

      const result = executeFuzzAction(action, {
        patient,
        handlePushFluid: mockHandlePushFluid
      } as any);

      expect(mockHandlePushFluid).toHaveBeenCalledWith('Lactated Ringers (LR)', 500, 'piv-1');
      expect(result).toContain('Resus: 500 unit/mL of Lactated Ringers (LR)');
    });
  });

  // 4. Verification & Fidelity Report Formatting
  describe('Fidelity Report Formatting', () => {
    it('should successfully build success message report if anomalies are empty', () => {
      const report = generateFidelityReport([], []);
      expect(report).toContain('Clinical Fidelity Verification Bug Report');
      expect(report).toContain('SUCCESS');
      expect(report).toContain('All physiological, pharmacological, and mechanical bounds are fully compliant');
    });

    it('should format reports correctly and handle non-finite vital states gracefully', () => {
      const anomalies = [
        {
          rule: 'Oxygen Desaturation Rate',
          system: 'Respiratory',
          severity: 'Critical',
          message: 'SpO2 dropped rapidly below safety thresholds',
          rationale: 'Apneic mass flow decay was too rapid.',
          resolution: 'Ensure correct functional residual capacity calculations.'
        }
      ];

      const history = [
        {
          tick: 5,
          actionText: 'Push Propofol 1500mg (10x Overdose)',
          vitals: {
            hr: NaN, // non-finite check
            sys: 90,
            dia: 55,
            map: 67,
            spo2: undefined, // undefined check
            etco2: 40
          },
          electrolytes: {
            ph: 7.38
          }
        }
      ];

      const report = generateFidelityReport(anomalies, history, { name: 'Audit Subject', asaStatus: 'III' });
      expect(report).toContain('Audit Subject');
      expect(report).toContain('ASA III');
      expect(report).toContain('Bug #1: Oxygen Desaturation Rate');
      expect(report).toContain('HR: N/A');
      expect(report).toContain('SpO2: N/A');
      expect(report).toContain('MAP: 67');
      expect(report).toContain('pH: 7.38');
    });
  });
});
