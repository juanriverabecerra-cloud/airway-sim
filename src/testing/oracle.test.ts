import { describe, it, expect } from 'vitest';
import { evaluateFidelity } from '../engine/FidelityOracle';

describe('Clinical Fidelity Oracle Invariant Tests', () => {

  // Safe nested factory
  const createBaseState = (overrides: any = {}) => {
    return {
      time: overrides.time !== undefined ? overrides.time : 120,
      vitals: {
        hr: 75,
        sys: 120,
        dia: 80,
        map: 93.3, // 80 + 40/3
        co: 5.0,
        svr: 1200,
        spo2: 99,
        pao2: 95,
        paco2: 40,
        etco2: 40,
        temp: 37.0,
        bis: 50,
        tofCount: 4,
        pip: 14,
        compl: 60,
        res: 10,
        lacticAcid: 1.0,
        mac: 0.0,
        ...(overrides.vitals || {})
      },
      patient: {
        isArrest: false,
        cprActive: false,
        myocardialStunning: 0,
        ebl: 100,
        ebv: 5000,
        position: 'Supine',
        airwaySecured: true,
        tubePosition: 'trachea',
        isApneic: false,
        accessLines: [],
        ...(overrides.patient || {})
      },
      activeMeds: overrides.activeMeds || []
    };
  };

  // 1. Telemetry Finiteness Protection
  describe('Telemetry Finiteness & Value Sanity', () => {
    it('should flag a CRITICAL anomaly if map is NaN', () => {
      const state = createBaseState({
        vitals: { map: NaN }
      });
      const { anomalies, systemStatus } = evaluateFidelity(state);
      expect(systemStatus.hemodynamics).toBe('FAILED');
      const item = anomalies.find(a => a.rule === 'Telemetry Value Finiteness');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should pass cleanly under healthy, finite base state', () => {
      const state = createBaseState();
      // Adjust map and CO-SVR to perfectly match Ohm's Law (5.0 * 1200 / 80 = 75 mmHg)
      state.vitals.map = 75;
      state.vitals.dia = 60;
      state.vitals.sys = 105; // 60 + 45/3 = 75 mmHg
      
      const { anomalies } = evaluateFidelity(state);
      const criticals = anomalies.filter(a => a.severity === 'CRITICAL');
      expect(criticals.length).toBe(0);
    });
  });

  // 2. Hemodynamics & Hydraulic Loops
  describe('Hemodynamics Laws', () => {
    it('should flag a discrepancy if SVR, Cardiac Output, and MAP are physically decoupled', () => {
      const state = createBaseState();
      state.vitals.map = 150; // Decoupled from SVR=1200, CO=5.0 (which equals MAP 75)
      
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Ohm Cardiovascular Law Consistency');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should flag cardiac electrical rhythm conflict when HR is 0 in non-arrest', () => {
      const state = createBaseState({
        vitals: { hr: 0 },
        patient: { isArrest: false, cardiacRhythm: 'sinus' }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'ECG Rhythm - HR Congruency');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should flag cardiac arrest flatline without active CPR pressures', () => {
      const state = createBaseState({
        vitals: { sys: 120, map: 90 },
        patient: { isArrest: true, cprActive: false }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Cardiac Arrest Passive Circulatory Decay');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });
  });

  // 3. Ventilation, Gases, & Aspiration
  describe('Ventilation and Gas Laws', () => {
    it('should flag esophageal intubation when high EtCO2 is reported', () => {
      const state = createBaseState({
        vitals: { etco2: 38 },
        patient: { tubePosition: 'esophagus' }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Esophageal Intubation Capnography');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should flag full stomach positive pressure ventilation aspiration failure', () => {
      const state = createBaseState({
        patient: { stomach: 'full', airwaySecured: false, ventilationStatus: 'mechanical' }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Full Stomach PPV Aspiration Interlock');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should flag thermodynamic Alveolar Gas Equation violation when arterial oxygen exceeds alveolar ceiling', () => {
      const state = createBaseState({
        vitals: { pao2: 700, paco2: 40 },
        ventSettings: { fio2: 50 } // PAO2 = 50 * 7.13 - 40 / 0.8 = 356.5 - 50 = 306.5 mmHg
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Alveolar Gas Equation Thermodynamic Violation');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });
  });

  // 4. Case-Insensitive Pharmacology
  describe('Pharmacology and Case-Insensitivity', () => {
    it('should identify propofol concentration and flag warning even if name is lowercase', () => {
      const state = createBaseState({
        vitals: { svr: 1200 },
        activeMeds: [{ name: 'propofol', Ce: 3.5, classes: ['Sedative'] }] // lowercase name
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Propofol SVR Depressive Vasodilation');
      expect(item).toBeDefined();
      expect(item.severity).toBe('WARNING');
    });

    it('should flag upregulated nAChR succinylcholine hyperkalemia failure', () => {
      const state = createBaseState({
        electrolytes: { k: 4.1 },
        patient: { nAChR_state: 'upregulated', suxPotassiumLeaked: false },
        activeMeds: [{ name: 'SUCCINYLCHOLINE', Ce: 0.15 }] // uppercase name
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Upregulated nAChR Succinylcholine Efflux');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });
  });

  // 5. Lines, Positions, and Physics
  describe('Physics, Lines, and Positioning', () => {
    it('should flag Belmont Rapid Infusion on an IO line as an active blowout anomaly', () => {
      const state = createBaseState({
        patient: {
          accessLines: [
            { category: 'IO Line', fluidLine: 'belmont', activeInfusions: [{ name: 'NS' }], failed: false }
          ]
        }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'IO Rapid Infuser Pressure Blowout');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should flag active resuscitation boluses connected to Arterial Lines', () => {
      const state = createBaseState({
        patient: {
          accessLines: [
            { category: 'Arterial Line', name: 'Radial A-Line', activeInfusions: [{ name: 'Normal Saline (0.9% NS)' }] }
          ]
        }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Arterial Resuscitation Bolus Block');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });

    it('should enforce hydrostatic blood pressure sitting modifications in sitting position', () => {
      const state = createBaseState({
        vitals: { map: 90, cmap: 90 }, // cmap not sitting-compensated
        patient: { position: 'Sitting' }
      });
      const { anomalies } = evaluateFidelity(state);
      const item = anomalies.find(a => a.rule === 'Beach Chair Hydrostatic Cerebral Gradient');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });
  });

  // 6. Time-Delayed expectations
  describe('Time-Delayed Timeline Expectations', () => {
    it('should flag delayed Sugammadex recovery failure when TOF count is depressed after 120s', () => {
      const state = createBaseState({
        vitals: { tofCount: 2 }
      });
      
      const history = [
        { tick: 0, actionText: 'Push Sugammadex 1000mg (Rescue/Deep)' },
        { tick: 20, actionText: 'Observe physiology' },
        { tick: 40, actionText: 'Observe physiology' },
        { tick: 60, actionText: 'Observe physiology' },
        { tick: 80, actionText: 'Observe physiology' },
        { tick: 120, actionText: 'Observe physiology' }
      ];

      const { anomalies } = evaluateFidelity(state, history);
      const item = anomalies.find(a => a.rule === 'Sugammadex Reversal Delayed Recovery');
      expect(item).toBeDefined();
      expect(item.severity).toBe('CRITICAL');
    });
  });
});
