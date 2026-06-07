import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamicMedicationRegistry } from '../knowledge/DynamicMedicationRegistry.ts';
import { DynamicProceduralRegistry } from '../knowledge/DynamicProceduralRegistry.ts';
import { PKPDModel } from '../engine/PKPDEngine.ts';
import { ProceduralEngine } from '../engine/ProceduralEngine.ts';
import { extractTextbookRules } from './oracle_query.ts';
import { textbookProse, physiologicalMatrices } from '../knowledge/medical_truth_snapshot.ts';
import { ClientDbBridge } from '../knowledge/ClientDbBridge.ts';

describe('AirwaySim OS Dynamic Ingestion Integration Tests', () => {

  beforeEach(async () => {
    await ClientDbBridge.init();
    // Reset registries before each test
    DynamicMedicationRegistry.reset();
    DynamicProceduralRegistry.reset();
  });

  afterEach(() => {
    // Reset registries after each test
    DynamicMedicationRegistry.reset();
    DynamicProceduralRegistry.reset();
  });

  it('should dynamically parse, recover, and register a novel medication from a textbook table', () => {
    // 1. Setup a mock matrix representing a new, non-hardcoded drug "Myocordin" in the snapshot
    const mockMatrixPayload = {
      matrix_rows: [
        ['Parameter', 'Value'],
        ['Drug', 'Myocordin'],
        ['Class', 'Vasopressor'],
        ['V1', '12.5'],
        ['k10', '0.35'],
        ['c50', '0.008'],
        ['gamma', '1.8'],
        ['receptorAlpha1', '4']
      ]
    };

    physiologicalMatrices.push({
      id: 'FIG_TEST_01',
      archetype: 'COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS',
      caption: 'Pharmacokinetic parameters of Myocordin',
      structured_payload: JSON.stringify(mockMatrixPayload),
      is_authoritative: 1
    });

    try {
      // 2. Trigger dynamic hydration
      const registered = DynamicMedicationRegistry.hydrate();

      // 3. Assertions on dynamic registration
      expect(registered.myocordin).toBeDefined();
      expect(registered.myocordin.name).toBe('Myocordin');
      expect(registered.myocordin.pk.V1).toBe(12.5);
      expect(registered.myocordin.pk.k10).toBe(0.35);
      expect(registered.myocordin.pd.c50).toBe(0.008);
      expect(registered.myocordin.pd.gamma).toBe(1.8);
      expect(registered.myocordin.pd.receptors?.Alpha1).toBe(4);

      // Verify class-based averages hydrated missing values safely
      expect(registered.myocordin.pk.V2).toBeDefined(); // V2 was not specified, should fall back
      expect(registered.myocordin.pd.sysMax).toBe(30);  // sysMax from Vasopressor class-average

      // 4. Instantiation contract: Verify PKPDModel can instantiate and tick this drug
      const model = new PKPDModel(registered.myocordin as any, 70);
      expect(model.name).toBe('Myocordin');
      
      model.giveBolus(10); // push 10 mg
      expect(model.A1).toBe(10);

      const effects = model.tick(1, 1.0, 1.0, 1.0, 1.0, 1.0);
      expect(effects).toBeDefined();
      expect(model.A1).toBeLessThan(10); // should eliminate/distribute
      expect(model.Ce).toBeGreaterThan(0); // should enter effect site
    } finally {
      // Cleanup
      physiologicalMatrices.pop();
    }
  });

  it('should dynamically parse un-hardcoded rules from textbook prose for the new medication', () => {
    // 1. Setup mock prose sentence with a dynamic rule for the un-hardcoded medication
    textbookProse.push({
      id: 'PROSE_TEST_01',
      chapter_title: 'test_chapter.pdf',
      section_heading: 'Myocordin hemodynamic rules',
      body_text: 'Administration of Myocordin increases mean arterial pressure by 15% due to vasoconstriction.',
      is_authoritative: 1
    });

    // Make sure Myocordin is registered in the registry first
    DynamicMedicationRegistry.registerMedication('myocordin', {
      name: 'Myocordin',
      classes: ['Vasopressor'],
      routes: ['IV'],
      types: ['Bolus'],
      dosingWeight: 'TBW',
      metabolism: 'Hepatic',
      pk: { V1: 8, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5 },
      pd: { c50: 0.01, gamma: 1.5 },
      indications: {},
      notes: ''
    });

    try {
      // 2. Extract rules
      const rules = extractTextbookRules();

      // 3. Assertions
      const myocordinRule = rules.find(r => r.condition === 'myocordin' && r.targetVital === 'map');
      expect(myocordinRule).toBeDefined();
      expect(myocordinRule?.operator).toBe('scale');
      expect(myocordinRule?.value).toBeCloseTo(1.15, 2);
    } finally {
      // Cleanup
      textbookProse.pop();
    }
  });

  it('should dynamically parse a procedural step pathway and validate simulator state compliance', () => {
    // 1. Setup mock matrix representing a procedural steps timeline
    physiologicalMatrices.push({
      id: 'TIMELINE_TEST_01',
      archetype: 'TIMELINE_STEP_CHART_HYPNOGRAM',
      caption: 'Awake Fiberoptic Intubation procedure timelines',
      structured_payload: JSON.stringify({
        labels: [
          'Pre-oxygenate patient',
          'Topicalize mucosa with local anesthetic',
          'Advance flexible scope'
        ]
      }),
      is_authoritative: 1
    });

    try {
      // 2. Trigger dynamic hydration of procedural pathways
      const pathways = DynamicProceduralRegistry.hydrate();
      expect(pathways['awake fiberoptic intubation']).toBeDefined();

      // 3. Validation: Verify that intubation outcome evaluation fails if mandatory step is not met
      const nonTopicalizedState = {
        mallampati: 1,
        neckMobility: 'normal',
        isApneic: false,
        isTopicalized: false // Violation of mucosal topicalization step!
      };

      const outcome = ProceduralEngine.evaluateIntubationOutcome(
        'Flexible Fiberoptic Bronchoscope',
        'None',
        1,
        nonTopicalizedState
      );

      expect(outcome.success).toBe(false);
      expect(outcome.failReason).toContain('topicalization');

      // 4. Verify that intubation succeeds if mandatory step is met
      const topicalizedState = {
        mallampati: 1,
        neckMobility: 'normal',
        isApneic: false,
        isTopicalized: true // Step satisfied!
      };

      const successfulOutcome = ProceduralEngine.evaluateIntubationOutcome(
        'Flexible Fiberoptic Bronchoscope',
        'None',
        1,
        topicalizedState
      );

      expect(successfulOutcome.success).toBe(true);
    } finally {
      // Cleanup
      physiologicalMatrices.pop();
    }
  });
});
