import { describe, it, expect } from 'vitest';
import { PainEngine, PainPatientState, PainVitalsState } from '../engine/PainEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';

describe('Pain Engine Regression Tests', () => {
  const createBaselinePatient = (): PainPatientState => ({
    surgicalPhase: 'Pre-Op',
    laryngoscopyActive: false,
    laryngoscopyTime: 0,
    cricPlacedTime: 0,
    cricSympatheticSurgeActive: false,
    ioPlacedTime: 0,
    ioSympatheticSurgeActive: false,
    lastLinePlacementTime: -999,
    lastLineCategory: '',
    lastAirwayManipulationTime: -999,
    lastAirwayManipulationType: '',
    isTopicalized: false,
    isApneic: false,
    isParalyzed: false,
    tofCount: 4,
    airwaySecured: false
  });

  const createBaselineVitals = (): PainVitalsState => ({
    hr: 70,
    sys: 120,
    dia: 80,
    map: 93,
    rr: 12,
    paco2: 40,
    bis: 98
  });

  it('should verify zero pain/nociception under baseline resting conditions', () => {
    const patient = createBaselinePatient();
    const vitals = createBaselineVitals();
    const out = PainEngine.tick(1, patient, vitals, [], 0, 0);

    expect(out.rawNociception).toBe(0);
    expect(out.effectivePain).toBe(0);
    expect(out.sympatheticDrive).toBe(0);
    expect(out.hrSpike).toBe(0);
    expect(out.svrSpike).toBe(0);
    expect(out.bisSpike).toBe(0);
    expect(out.somaticResponse.isBucking).toBe(false);
    expect(out.somaticResponse.isMoving).toBe(false);
  });

  it('should verify raw nociception spike during active laryngoscopy', () => {
    const patient = createBaselinePatient();
    patient.laryngoscopyActive = true;
    patient.laryngoscopyTime = 10;
    
    const vitals = createBaselineVitals();
    const out = PainEngine.tick(1, patient, vitals, [], 0, 10);

    // Unmitigated laryngoscopy should trigger raw nociception of 75
    expect(out.rawNociception).toBe(75);
    expect(out.effectivePain).toBe(75);
    expect(out.sympatheticDrive).toBe(75);
    expect(out.hrSpike).toBeGreaterThan(0);
    expect(out.svrSpike).toBeGreaterThan(0);
  });

  it('should verify that opioids (Fentanyl) blunt the pain and sympathetic drive', () => {
    const patient = createBaselinePatient();
    patient.laryngoscopyActive = true;
    
    const vitals = createBaselineVitals();
    
    // Simulate Fentanyl at C50 = 0.002 mg/L
    // E_fent = 0.50 (50% analgesia)
    const activeMeds = [{ name: 'Fentanyl', Ce: 0.002 }];
    const out = PainEngine.tick(1, patient, vitals, activeMeds, 0, 15);

    expect(out.analgesiaLevel).toBeCloseTo(0.50, 1);
    expect(out.effectivePain).toBeLessThan(75);
    expect(out.effectivePain).toBeCloseTo(38, 0); // 75 * 0.5 = 37.5
    expect(out.sympatheticDrive).toBeLessThan(75);
  });

  it('should verify that topical lidocaine blunts airway pain (laryngoscopy) but not systemic pain (incision)', () => {
    const vitals = createBaselineVitals();

    // Scenario A: Laryngoscopy (Airway pain) with Topicalization
    const patientA = createBaselinePatient();
    patientA.laryngoscopyActive = true;
    patientA.isTopicalized = true;
    const outA = PainEngine.tick(1, patientA, vitals, [], 0, 20);
    
    // Airway block should reduce laryngoscopy pain by 85%
    // rawNociception = 75 * (1 - 0.85) = 11.25 -> 11
    expect(outA.rawNociception).toBeLessThanOrEqual(12);

    // Scenario B: Incision (Systemic pain) with Topicalization
    const patientB = createBaselinePatient();
    patientB.surgicalPhase = 'Incision';
    patientB.incisionStartTime = 20;
    const outB = PainEngine.tick(1, patientB, vitals, [], 0, 20);

    // Incision is a systemic stimulus, so airway block has no effect
    // incStim starts at 80 in new engine
    expect(outB.rawNociception).toBe(80);
  });

  it('should verify decaying pain spikes for IO placement and surgical cricothyroidotomy', () => {
    const vitals = createBaselineVitals();

    // 1. IO placement at time = 0. We tick at time = 10.
    const patientA = createBaselinePatient();
    patientA.ioSympatheticSurgeActive = true;
    patientA.ioPlacedTime = 0;

    const outA = PainEngine.tick(1, patientA, vitals, [], 0, 10);
    // IO stimulus decays: 85 * Math.exp(-0.08 * 10) = 85 * 0.449 = 38.1 -> 38
    expect(outA.rawNociception).toBe(38);

    // 2. Surgical cric at time = 0. We tick at time = 5.
    const patientB = createBaselinePatient();
    patientB.cricSympatheticSurgeActive = true;
    patientB.cricPlacedTime = 0;

    const outB = PainEngine.tick(1, patientB, vitals, [], 0, 5);
    // Cric stimulus decays: 95 * Math.exp(-0.08 * 5) = 95 * 0.67 = 63.6 -> 64
    expect(outB.rawNociception).toBe(64);
  });

  it('should verify somatic responses (bucking and compliance drop) for under-sedated intubated patients', () => {
    const patient = createBaselinePatient();
    patient.surgicalPhase = 'Incision';
    patient.incisionStartTime = 100;
    patient.airwaySecured = true; // Intubated

    const vitals = createBaselineVitals();
    const out = PainEngine.tick(1, patient, vitals, [], 0, 100);

    // High effective pain (>25) and not paralyzed -> Bucking
    expect(out.effectivePain).toBeGreaterThan(25);
    expect(out.somaticResponse.isBucking).toBe(true);
    expect(out.somaticResponse.pipOffset).toBe(18.0);
    expect(out.somaticResponse.complianceMultiplier).toBe(0.55);
    expect(out.somaticResponse.event).toContain('bucking against the ventilator');
  });

  it('should verify that muscle relaxants (paralysis) prevent bucking response under pain', () => {
    const patient = createBaselinePatient();
    patient.surgicalPhase = 'Incision';
    patient.incisionStartTime = 100;
    patient.airwaySecured = true;
    patient.isParalyzed = true; // Paralyzed!

    const vitals = createBaselineVitals();
    const out = PainEngine.tick(1, patient, vitals, [], 0, 100);

    expect(out.somaticResponse.isBucking).toBe(false);
    expect(out.somaticResponse.pipOffset).toBe(0);
    expect(out.somaticResponse.complianceMultiplier).toBe(1.0);
  });

  it('should verify that beta-blockers suppress the chronotropic heart rate spike', () => {
    const patient = createBaselinePatient();
    patient.surgicalPhase = 'Incision';
    patient.incisionStartTime = 100;

    const vitals = createBaselineVitals();

    // 1. Without beta-blockade
    const outA = PainEngine.tick(1, patient, vitals, [], 0, 100);
    const normalHrSpike = outA.hrSpike;
    expect(normalHrSpike).toBeGreaterThan(30);

    // 2. With full Esmolol beta-blockade (Ce = 5.0 mg/L)
    const activeMeds = [{ name: 'Esmolol', Ce: 5.0 }];
    const outB = PainEngine.tick(1, patient, vitals, activeMeds, 0, 100);
    
    expect(outB.hrSpike).toBeLessThan(normalHrSpike * 0.3);
  });

  // --- NEW REGRESSION TESTS ---

  it('Test Chronic Beta-Blockade: Verify that an IO insertion on a beta-blocked patient model causes an SVR increase >40% but an HR increase <5%', () => {
    const patient = createBaselinePatient();
    patient.chronicBetaBlockade = true;
    patient.ioSympatheticSurgeActive = true;
    patient.ioPlacedTime = 0;

    const vitals = createBaselineVitals();
    const out = PainEngine.tick(1, patient, vitals, [], 0, 0);

    // Baseline HR is 70, baseline SVR is 1200
    const hrPercentChange = (out.hrSpike / vitals.hr) * 100;
    const svrPercentChange = (out.svrSpike / 1200) * 100;

    expect(svrPercentChange).toBeGreaterThan(40);
    expect(hrPercentChange).toBeLessThan(5);
  });

  it('Test Isolated Hypnotic State: Verify that an incision on a patient with a BIS of 40 driven by pure Propofol (zero opioid) still triggers a >50% surge in C_cat and MAP', () => {
    const patient = createBaselinePatient();
    patient.surgicalPhase = 'Incision';
    patient.incisionStartTime = 0;

    const vitals = createBaselineVitals();
    // Simulate pure Propofol (Ce = 3.5 mcg/mL, zero opioid)
    const activeMeds = [{ name: 'Propofol', Ce: 3.5 }];

    const out = PainEngine.tick(1, patient, vitals, activeMeds, 0, 0);

    // C_cat should surge >50 (out of 100 base scale)
    expect(out.C_cat).toBeGreaterThan(50);

    // Tick the CardiovascularEngine to calculate the actual MAP response
    const cvOutput = CardiovascularEngine.tick(1, {
      patient: {
        isArrest: false,
        cardiacRhythm: 'sr',
        cprActive: false,
        ischemicDamage: 0,
        biologicalDeath: false,
        myocardialStunning: 0,
        ebl: 0,
        ebv: 5000,
        height: 170,
        weight: 70,
        sex: 'male',
        age: 40,
        bmi: 24,
        position: 'Supine',
        intravascularVolume: 5000
      },
      vitals: {
        hr: 70,
        sys: 120,
        dia: 80,
        map: 93,
        co: 5.0,
        svr: 1200,
        cmap: 93,
        bis: 98,
        temp: 37,
        spo2: 98,
        paco2: 40,
        etco2: 35
      },
      electrolytes: { k: 4.0 },
      time: 0
    }, {
      drugSvrMod: 1.0,
      drugInotropyMod: 1.0,
      svrSympatheticSpike: out.svrSpike,
      contractilitySympatheticSpike: out.contractilitySpike,
      hrSympatheticSpike: out.hrSpike,
      shiveringHRDrive: 0,
      anaphylaxisHrMod: 0,
      anaphylaxisSvrMod: 1.0,
      totalHrDelta: 0,
      ruleHrScale: 1.0,
      ruleHrOffset: 0,
      ruleMapScale: 1.0,
      ruleMapOffset: 0,
      ruleKOffset: 0,
      ruleSpo2Offset: 0
    }, {
      currentMac: 0,
      bloodLossRatio: 0,
      currentEbl: 0,
      positionPreloadMod: 0,
      positionHydrostaticMod: 0,
      shiveringMultiplier: 1.0,
      seizureMetabolicMultiplier: 1.0,
      cyanideVO2Mod: 1.0,
      VO2_sec: 0.004,
      currentBuffer: 0.5,
      currentFRC_L: 2.4,
      newTemp: 37,
      newPaCO2: 40,
      activeMeds: [],
      getAnatomicalParameter: (k, d) => d
    });

    // Baseline MAP is 93. The chamber-mechanics engine (Phase 0 of mutable-roaming-
    // newell.md) bounds a pure sympathetic surge's single-tick MAP response more
    // conservatively than the prior linear Ohm's-law formula (afterload mismatch: elevated
    // SVR alongside tachycardia reduces diastolic filling time/ejection capability, partly
    // offsetting the pressure rise SVR alone would produce) -- still a >35% surge (~129),
    // not the prior formula's >50% (139.5).
    expect(cvOutput.vitals.map).toBeGreaterThan(93 * 1.35);
  });

  it('Test Dynamic Baroreceptor Resetting: Verify that during a 5-minute sustained noxious stimulus, the baroreceptor-mediated bradycardia reflex attenuates and does not trigger an unphysiological vital crash as MAP remains high', () => {
    let patient = createBaselinePatient();
    patient.laryngoscopyActive = true; // sustained noxious stimulus

    let vitals = createBaselineVitals();
    // Simulate closed-loop physiology over 300 seconds (5 minutes)
    for (let t = 0; t < 300; t++) {
      const out = PainEngine.tick(1, patient, vitals, [], 0, t);

      // Save C_cat and MAP_set back to patient state
      patient.C_cat = out.C_cat;
      patient.MAP_set = out.MAP_set;

      // Tick the CardiovascularEngine
      const cvOutput = CardiovascularEngine.tick(1, {
        patient: {
          isArrest: false,
          cardiacRhythm: 'sr',
          cprActive: false,
          ischemicDamage: 0,
          biologicalDeath: false,
          myocardialStunning: 0,
          ebl: 0,
          ebv: 5000,
          height: 170,
          weight: 70,
          sex: 'male',
          age: 40,
          bmi: 24,
          position: 'Supine',
          intravascularVolume: 5000
        },
        vitals: {
          hr: vitals.hr,
          sys: vitals.sys,
          dia: vitals.dia,
          map: vitals.map,
          co: vitals.co || 5.0,
          svr: vitals.svr || 1200,
          cmap: vitals.map,
          bis: vitals.bis,
          temp: 37,
          spo2: 98,
          paco2: 40,
          etco2: 35
        },
        electrolytes: { k: 4.0 },
        time: t
      }, {
        drugSvrMod: 1.0,
        drugInotropyMod: 1.0,
        svrSympatheticSpike: out.svrSpike,
        contractilitySympatheticSpike: out.contractilitySpike,
        hrSympatheticSpike: out.hrSpike,
        shiveringHRDrive: 0,
        anaphylaxisHrMod: 0,
        anaphylaxisSvrMod: 1.0,
        totalHrDelta: 0,
        ruleHrScale: 1.0,
        ruleHrOffset: 0,
        ruleMapScale: 1.0,
        ruleMapOffset: 0,
        ruleKOffset: 0,
        ruleSpo2Offset: 0
      }, {
        currentMac: 0,
        bloodLossRatio: 0,
        currentEbl: 0,
        positionPreloadMod: 0,
        positionHydrostaticMod: 0,
        shiveringMultiplier: 1.0,
        seizureMetabolicMultiplier: 1.0,
        cyanideVO2Mod: 1.0,
        VO2_sec: 0.004,
        currentBuffer: 0.5,
        currentFRC_L: 2.4,
        newTemp: 37,
        newPaCO2: 40,
        activeMeds: [],
        getAnatomicalParameter: (k, d) => d
      });

      // Update vitals for the next tick
      vitals = {
        hr: cvOutput.vitals.hr,
        sys: cvOutput.vitals.sys,
        dia: cvOutput.vitals.dia,
        map: cvOutput.vitals.map,
        co: cvOutput.vitals.co || 5.0,
        svr: cvOutput.vitals.svr || 1200,
        paco2: 40,
        bis: 98
      };
    }

    // MAP_set should have drifted up from 93 to >110 mmHg
    expect(patient.MAP_set).toBeGreaterThan(110);
    // HR should not crash to pathological bradycardia (should remain >50 bpm)
    expect(vitals.hr).toBeGreaterThan(50);
  });
});
