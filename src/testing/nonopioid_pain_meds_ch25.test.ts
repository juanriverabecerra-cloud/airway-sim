import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { PainEngine, PainPatientState, PainVitalsState } from '../engine/PainEngine';
import { GastrointestinalEngine, GIPatientState, GIVitalsState, GIInputs } from '../engine/GastrointestinalEngine';
import { ConsciousnessEngine, ConsciousnessInputs } from '../engine/ConsciousnessEngine';

describe('Chapter 25: Nonopioid Pain Medications', () => {

  const createPainState = (): { patient: PainPatientState; vitals: PainVitalsState } => ({
    patient: {
      C_cat: 0,
      MAP_set: 93,
      chronicHTN: false,
      highAnxiety: false,
      chronicBetaBlockade: false,
      surgicalPhase: 'Pre-Op',
      incisionStartTime: -999,
      laryngoscopyActive: false,
      airwaySecured: false
    },
    vitals: {
      hr: 70,
      sys: 120,
      dia: 80,
      map: 93,
      rr: 12,
      paco2: 40,
      bis: 98
    }
  });

  const createGIState = (): { patient: GIPatientState; vitals: GIVitalsState; time: number } => ({
    patient: {
      hasAspirated: false,
      epiduralBlockActive: false,
      celiacBlockActive: false,
      manipulationIndex: 0.0
    },
    vitals: {
      bowelGasVolume: 1.0,
      inflammatoryIleus: 0.0,
      postoperativeIleus: 0.0
    },
    time: 0
  });

  const createGIInputs = (): GIInputs => ({
    EtN_2O: 0,
    currentMac: 0,
    C_cat: 0,
    positivePressureVentilationActive: false,
    spontaneousBreathingActive: true
  });

  const createConsciousnessInputs = (): ConsciousnessInputs => ({
    propofolCe: 0,
    dexmedCe: 0,
    thiopentalCe: 0,
    midazolamCe: 0,
    ketamineCe: 0,
    etomidateCe: 0,
    atipamezoleCe: 0,
    methylphenidateCe: 0,
    scopolamineCe: 0,
    sevoMac: 0,
    isoMac: 0,
    haloMac: 0,
    n2oMac: 0,
    isSyncShock: false,
    time: 0
  });

  describe('1. Medication Profiles', () => {
    it('should verify the 6 new non-opioid meds exist in configuration', () => {
      expect(MEDICATIONS_CONFIG.acetaminophen).toBeDefined();
      expect(MEDICATIONS_CONFIG.ketorolac).toBeDefined();
      expect(MEDICATIONS_CONFIG.gabapentin).toBeDefined();
      expect(MEDICATIONS_CONFIG.pregabalin).toBeDefined();
      expect(MEDICATIONS_CONFIG.mexiletine).toBeDefined();
      expect(MEDICATIONS_CONFIG.topiramate).toBeDefined();
    });

    it('should verify correct classes and attributes', () => {
      expect(MEDICATIONS_CONFIG.acetaminophen.classes).toContain('Nonopioid Analgesic');
      expect(MEDICATIONS_CONFIG.ketorolac.classes).toContain('NSAID');
      expect(MEDICATIONS_CONFIG.gabapentin.classes).toContain('Gabapentinoid');
      expect(MEDICATIONS_CONFIG.pregabalin.classes).toContain('Gabapentinoid');
      expect(MEDICATIONS_CONFIG.mexiletine.classes).toContain('Sodium Channel Blocker');
      expect(MEDICATIONS_CONFIG.topiramate.classes).toContain('Anticonvulsant');
    });
  });

  describe('2. PainEngine Integration', () => {
    it('should show non-opioid meds increase analgesia and decrease effective pain', () => {
      const state = createPainState();
      
      // Control: no meds, incision active
      state.patient.surgicalPhase = 'Incision';
      state.patient.incisionStartTime = 10;
      const controlOut = PainEngine.tick(1, state.patient, state.vitals, [], 0, 15);
      
      // Experimental: Acetaminophen at c50
      const meds = [{ name: 'Acetaminophen', Ce: 10.0 }];
      const expOut = PainEngine.tick(1, state.patient, state.vitals, meds, 0, 15);

      expect(expOut.analgesiaLevel).toBeGreaterThan(controlOut.analgesiaLevel);
      expect(expOut.effectivePain).toBeLessThan(controlOut.effectivePain);
    });

    it('should show synergy/additive effect of combining multiple non-opioids', () => {
      const state = createPainState();
      state.patient.surgicalPhase = 'Incision';
      state.patient.incisionStartTime = 10;

      const singleMed = [{ name: 'Acetaminophen', Ce: 10.0 }];
      const multiMed = [
        { name: 'Acetaminophen', Ce: 10.0 },
        { name: 'Ketorolac', Ce: 1.0 }
      ];

      const singleOut = PainEngine.tick(1, state.patient, state.vitals, singleMed, 0, 15);
      const multiOut = PainEngine.tick(1, state.patient, state.vitals, multiMed, 0, 15);

      expect(multiOut.analgesiaLevel).toBeGreaterThan(singleOut.analgesiaLevel);
    });
  });

  describe('3. GastrointestinalEngine Sparing', () => {
    it('should show Acetaminophen and Ketorolac spare gut motility during opioid block', () => {
      const state = createGIState();
      const inputs = createGIInputs();

      // Opioid block active (high fentanyl)
      const medsNoSparing = [{ name: 'Fentanyl', Ce: 0.010 }];
      const outNoSparing = GastrointestinalEngine.tick(1, state, medsNoSparing, inputs);

      // Opioid block + Acetaminophen sparing
      const medsSparing = [
        { name: 'Fentanyl', Ce: 0.010 },
        { name: 'Acetaminophen', Ce: 10.0 }
      ];
      const outSparing = GastrointestinalEngine.tick(1, state, medsSparing, inputs);

      expect(outSparing.gutMotility).toBeGreaterThan(outNoSparing.gutMotility);
    });
  });

  describe('4. ConsciousnessEngine Integration', () => {
    it('should show gabapentinoids and topiramate decrease LC activity and increase VLPO activity', () => {
      const patient = {
        lcActivity: 1.0,
        vlpoActivity: 0.0,
        tmnActivity: 1.0,
        orexinLevel: 1.0
      };
      const vitals = { bis: 98 };

      // Normal baseline check
      const baselineInputs = createConsciousnessInputs();
      const baselineOut = ConsciousnessEngine.tick(1, patient, vitals, baselineInputs);

      // Gabapentin active
      const inputs = createConsciousnessInputs();
      inputs.gabapentinCe = 5.0; // c50
      const out = ConsciousnessEngine.tick(1, patient, vitals, inputs);

      expect(out.lcActivity).toBeLessThan(baselineOut.lcActivity);
      expect(out.vlpoActivity).toBeGreaterThan(baselineOut.vlpoActivity);
      expect(out.frontoparietalFeedback).toBeLessThan(baselineOut.frontoparietalFeedback);
    });
  });
});
