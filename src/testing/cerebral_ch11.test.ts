import { describe, it, expect } from 'vitest';
import { CerebralEngine } from '../engine/CerebralEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';

describe('Chapter 11: Cerebral Physiology & Intracranial Mechanics Tests', () => {

  describe('1. CBF Autoregulation', () => {
    it('should maintain stable CBF within the autoregulation plateau (CPP 65 - 150 mmHg)', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Test CPP = 75 (MAP = 85, ICP = 10)
      const outPlateau1 = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 85 });
      // Test CPP = 130 (MAP = 140, ICP = 10)
      const outPlateau2 = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 140 });

      // Both should yield normal baseline CBF (~50 mL/100 g/min)
      expect(outPlateau1.cbf).toBeCloseTo(50.0, 1);
      expect(outPlateau2.cbf).toBeCloseTo(50.0, 1);
    });

    it('should show pressure-passive CBF below LLA (<65 mmHg CPP) and above ULA (>150 mmHg CPP)', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Test severe hypotension: CPP = 30 (MAP = 40, ICP = 10) -> below LLA
      const outHypotension = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 40 });
      expect(outHypotension.cbf).toBeLessThan(50.0);

      // Test severe hypertension: CPP = 170 (MAP = 180, ICP = 10) -> above ULA
      const outHypertension = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 180 });
      expect(outHypertension.cbf).toBeGreaterThan(50.0);
    });

    it('should dose-dependently impair autoregulation with volatile anesthetics', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        map: 50, // CPP = 40 mmHg (hypotension, below autoreg limit)
        sys: 75,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // No volatile: autoregulation is active, tries to compensate but drops because CPP < 65
      const outNormal = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, baseInputs);

      // Volatile 1.5 MAC: autoregulation is completely lost (autoregEfficiency = 0)
      const outVolatile = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, {
        ...baseInputs,
        isoMac: 1.5 // 1.5 MAC Isoflurane
      });

      // Loss of compensatory vasoconstriction/vasodilation means passive CBF is lower in hypotension
      expect(outVolatile.cbf).toBeLessThan(outNormal.cbf);
    });
  });

  describe('2. Chemical Regulation & Reactivity', () => {
    it('should verify Paco2 reactivity slopes in normotension', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        map: 90, // normotension
        sys: 120,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Baseline PaCO2 = 40
      const outBase = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, paco2: 40 });

      // Hypercapnia: PaCO2 = 50 (+2.5% per mmHg -> +25%)
      const outHyper = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, paco2: 50 });
      expect(outHyper.cbf / outBase.cbf).toBeCloseTo(1.25, 2);

      // Hypocapnia: PaCO2 = 30 (symmetric 2.5%/mmHg → -25%, corrected from asymmetric 1.67%).
      // Clinical: hyperventilation to PaCO2=30 reduces CBF by ~25% (matching known physiology).
      const outHypo = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, paco2: 30 });
      expect(outHypo.cbf / outBase.cbf).toBeCloseTo(0.75, 2);
    });

    it('should blunt Paco2 reactivity in moderate hypotension and abolish in severe hypotension', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Moderate hypotension: MAP = 50 mmHg (reduced by ~44% from 90 mmHg baseline)
      // Paco2 = 50 should trigger blunted +1.3% per mmHg (+13%)
      const outModHypotensionBase = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 50, sys: 70, paco2: 40 });
      const outModHypotensionHyper = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 50, sys: 70, paco2: 50 });
      // Moderate hypotension: 1.3%/mmHg slope. At PaCO2=50: +10mmHg → CBF +13% → ratio 1.13.
      // The slope is unchanged at moderate hypotension (only normotension slope was corrected).
      expect(outModHypotensionHyper.cbf / outModHypotensionBase.cbf).toBeCloseTo(1.13, 2);

      // Severe hypotension: MAP = 25 mmHg (reduced by ~72%)
      // Paco2 reactivity should be fully abolished (0% change)
      const outSevHypotensionBase = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 25, sys: 40, paco2: 40 });
      const outSevHypotensionHyper = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, map: 25, sys: 40, paco2: 50 });
      expect(outSevHypotensionHyper.cbf).toBe(outSevHypotensionBase.cbf);
    });

    it('should increase CBF during hypoxia (Pao2 < 60 mmHg) inversely with SpO2', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Normal oxygenation: PaO2 = 100, SpO2 = 98 -> CBF baseline
      const outNormoxia = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, pao2: 100, spo2: 98 });
      
      // Hypoxia: PaO2 = 45, SpO2 = 80 -> CBF should rise inversely linear with SpO2
      const outHypoxia = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, pao2: 45, spo2: 80 });
      
      expect(outHypoxia.cbf).toBeGreaterThan(outNormoxia.cbf);
    });
  });

  describe('3. Temperature & Metabolism', () => {
    it('should suppress CMRO2 and CBF dynamically during hypothermia (Q10 = 2.4)', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // 37°C
      const outNormo = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, temp: 37.0 });
      // 27°C (approx 10°C drop should decrease CMR to ~40% of baseline due to Q10 = 2.4)
      const outHypo = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, temp: 27.0 });

      expect(outHypo.cmro2).toBeCloseTo(outNormo.cmro2 / 2.4, 1);
    });

    it('should show isoelectric functional CMRO2 suppression below 17°C', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // 15°C (less than 17°C) -> electrophysiologic function should be 0, leaving only cell integrity CMR
      const outSevereHypo = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, { ...baseInputs, temp: 15.0 });
      
      // Calculate normal cell integrity CMR at 15°C
      const tempFactor = Math.pow(2.4, (15.0 - 37.0) / 10.0);
      const expectedIntegrityCMR = 1.32 * tempFactor;
      expect(outSevereHypo.cmro2).toBeCloseTo(expectedIntegrityCMR, 2);
    });
  });

  describe('4. Anesthetic and Catecholamine Pharmacology', () => {
    it('should suppress both CBF and CMRO2 in parallel with coupled IV anesthetics (Propofol)', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds = [{ name: 'Propofol', Ce: 4.0 }]; // therapeutic dose
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      const outBase = CerebralEngine.tick(1, { patient: {}, vitals, time: 0 }, [], baseInputs);
      const outPropofol = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, baseInputs);

      // Both CMRO2 and CBF should drop in parallel
      expect(outPropofol.cmro2).toBeLessThan(outBase.cmro2);
      expect(outPropofol.cbf).toBeLessThan(outBase.cbf);
    });

    it('should uncouple CBF and CMRO2 with high dose volatile anesthetics (>1.0 MAC)', () => {
      const patient = { icp: 10.0, complianceState: 'normal' as const };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds: any[] = [];
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      const outBase = CerebralEngine.tick(1, { patient: {}, vitals, time: 0 }, activeMeds, baseInputs);
      
      // 1.8 MAC volatile (Sevoflurane) -> uncouples flow/metabolism
      const outVolatile = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, {
        ...baseInputs,
        sevoMac: 1.8
      });

      // CMRO2 is suppressed, but CBF is elevated due to direct cerebral vasodilation
      expect(outVolatile.cmro2).toBeLessThan(outBase.cmro2);
      expect(outVolatile.cbf).toBeGreaterThan(outBase.cbf);
    });

    it('should verify catecholamine effects (Table 11.2) under open vs. intact BBB', () => {
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const activeMeds = [{ name: 'Epinephrine', Ce: 0.2 }];
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Intact BBB
      const outIntact = CerebralEngine.tick(1, { patient: { isBBBOpen: false }, vitals, time: 0 }, activeMeds, baseInputs);
      // Open BBB
      const outOpen = CerebralEngine.tick(1, { patient: { isBBBOpen: true }, vitals, time: 0 }, activeMeds, baseInputs);

      // Open BBB allows catecholamines to directly stimulate cerebral metabolism, triggering massive increases in CBF & CMR
      expect(outOpen.cbf).toBeGreaterThan(outIntact.cbf);
      expect(outOpen.cmro2).toBeGreaterThan(outIntact.cmro2);
    });
  });

  describe('5. CSF and Monro-Kellie Mechanics', () => {
    it('should verify CSF production and absorption rates (Table 11.3)', () => {
      const baseVitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Isoflurane increases CSF absorption rate
      let patientIso = { csfVolume: 150.0, icp: 10.0 };
      for (let i = 0; i < 100; i++) {
        const out = CerebralEngine.tick(1, { patient: patientIso, vitals: baseVitals, time: i }, [], {
          ...baseInputs,
          isoMac: 1.0
        });
        patientIso.csfVolume = out.csfVolume;
        patientIso.icp = out.icp;
      }
      
      // Halothane decreases CSF secretion and absorption rate
      let patientHalo = { csfVolume: 150.0, icp: 10.0 };
      for (let i = 0; i < 100; i++) {
        const out = CerebralEngine.tick(1, { patient: patientHalo, vitals: baseVitals, time: i }, [], {
          ...baseInputs,
          haloMac: 1.0
        });
        patientHalo.csfVolume = out.csfVolume;
        patientHalo.icp = out.icp;
      }

      expect(patientIso.csfVolume).toBeLessThan(150.0);
      expect(patientHalo.csfVolume).toBeGreaterThan(patientIso.csfVolume);
    });

    it('should verify Mannitol 20% draws water from brain tissue and lowers ICP', () => {
      const patient = { csfVolume: 130.0, icp: 25.0, complianceState: 'impaired' as const, intracranialVolumeOffset: 60.0 };
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 25.0, rso2: 70.0 };
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // No Mannitol
      const outNoMannitol = CerebralEngine.tick(1, { patient, vitals, time: 0 }, [], baseInputs);
      // With Mannitol
      const activeMeds = [{ name: 'Mannitol 20%', Ce: 50.0 }];
      const outWithMannitol = CerebralEngine.tick(1, { patient, vitals, time: 0 }, activeMeds, baseInputs);

      expect(outWithMannitol.brainVolume).toBeLessThan(outNoMannitol.brainVolume);
      expect(outWithMannitol.icp).toBeLessThan(outNoMannitol.icp);
    });

    it('should show exponential ICP rise in exhausted compliance states', () => {
      const vitals = { cbf: 50.0, cmro2: 3.3, cpp: 80.0, cbv: 1.0, icp: 10.0, rso2: 70.0 };
      const baseInputs = {
        map: 90,
        sys: 120,
        paco2: 40,
        pao2: 100,
        spo2: 98,
        temp: 37.0,
        cvp: 5,
        sevoMac: 0,
        isoMac: 0,
        desMac: 0,
        haloMac: 0,
        n2oMac: 0,
        xenonMac: 0,
        positionHydrostaticMod: 0
      };

      // Impaired elastance = 0.04 vs Exhausted elastance = 0.08
      // Add a 50 mL intracranial volume offset (tumor/bleed)
      const outImpaired = CerebralEngine.tick(1, {
        patient: { complianceState: 'impaired', intracranialVolumeOffset: 50.0 },
        vitals,
        time: 0
      }, [], baseInputs);

      const outExhausted = CerebralEngine.tick(1, {
        patient: { complianceState: 'exhausted', intracranialVolumeOffset: 50.0 },
        vitals,
        time: 0
      }, [], baseInputs);

      expect(outExhausted.icp).toBeGreaterThan(outImpaired.icp);
    });
  });

  describe('6. Cushing\'s Reflex Loop', () => {
    it('should trigger systemic vasoconstriction and bradycardia in CardiovascularEngine', () => {
      const patient = {
        isArrest: false,
        cardiacRhythm: 'normal',
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
        intravascularVolume: 5000,
        patientBaseSVR: 1200,
        patientBaseHR: 70,
        // Elevated ICP / compromised CPP: triggers Cushing's reflex
        icp: 30.0,
        cpp: 30.0
      };

      const baseVitals = {
        hr: 70,
        sys: 110,
        dia: 70,
        map: 83,
        co: 5.0,
        svr: 1200,
        cmap: 83,
        bis: 98,
        temp: 37.0,
        spo2: 98,
        paco2: 40,
        etco2: 40
      };

      const drugEffects = {
        drugSvrMod: 1.0,
        drugInotropyMod: 1.0,
        svrSympatheticSpike: 0,
        contractilitySympatheticSpike: 0,
        hrSympatheticSpike: 0,
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
      };

      const st = {
        patient,
        vitals: baseVitals,
        time: 0,
        electrolytes: { k: 4.0 }
      };

      const inputs = {
        currentMac: 0,
        bloodLossRatio: 0,
        currentEbl: 0,
        positionPreloadMod: 0,
        positionHydrostaticMod: 0,
        shiveringMultiplier: 1.0,
        seizureMetabolicMultiplier: 1.0,
        cyanideVO2Mod: 1.0,
        VO2_sec: 4.0,
        currentBuffer: 1.0,
        currentFRC_L: 2.5,
        newTemp: 37.0,
        newPaCO2: 40.0,
        activeMeds: [],
        getAnatomicalParameter: (k: string, d: number) => d
      };

      const out = CardiovascularEngine.tick(1, st, drugEffects, inputs);

      // SVR should rise (due to sympathetic vasoconstriction surge)
      // HR should fall (due to reflex bradycardia)
      expect(out.vitals.svr).toBeGreaterThan(1200);
      expect(out.vitals.hr).toBeLessThan(70);
    });

    it('should trigger gasping and central apnea in RespiratoryEngine', () => {
      const patient = {
        height: 170,
        age: 40,
        sex: 'male',
        bmi: 24,
        position: 'Supine',
        ibw: 70,
        airwaySecured: false,
        ventilationStatus: 'spontaneous',
        oxygenBuffer: 1.0,
        // Case A: CPP = 45 mmHg (moderate ischemia) -> gasping respirations
        icp: 30.0,
        cpp: 45.0
      };

      const baseVitals = {
        hr: 70,
        sys: 110,
        dia: 70,
        map: 83,
        co: 5.0,
        svr: 1200,
        cmap: 83,
        bis: 98,
        temp: 37.0,
        spo2: 98,
        paco2: 40,
        etco2: 40
      };

      const drugEffects = {
        maxNMJOccupancy: 0,
        totalRrDelta: 0,
        ruleRrScale: 1.0,
        ruleRrOffset: 0,
        ruleComplScale: 1.0,
        rulePipOffset: 0,
        ruleSpo2Offset: 0,
        ruleKOffset: 0
      };

      const st = {
        patient,
        vitals: baseVitals,
        time: 0
      };

      const inputs = {
        VO2_sec: 4.0,
        totalMetabolicMultiplier: 1.0,
        compensatoryRR: 0,
        opioidRRDrop: 0,
        m6gRrDelta: 0,
        shiveringRRDrive: 0,
        currentHb: 14.0,
        targetMAP: 85,
        targetCO: 5.0,
        hco3: 24.0,
        volatileRightShift: 0,
        dpgDepletionShift: 0,
        baselinePaCO2: 40.0,
        anaphylaxisCompliancePenalty: 0,
        anaphylaxisResistancePenalty: 0,
        aspirationCompliancePenalty: 0,
        aspirationResistancePenalty: 0,
        maxNMJOccupancy: 0,
        bronchialSmoothMuscleCa: 1.0,
        intercostalContribution: 1.0,
        airwayObstructionIndex: 0,
        hpvInhibition: 0,
        fgf_L_min: 2.0
      };

      // Run tick for Case A (gasping)
      const outGasp = RespiratoryEngine.tick(1, st, null, 21.0, drugEffects, inputs);

      // Gasping should be active, targetRR is modulated but remains spontaneous
      expect(outGasp.vitals.rr).toBeGreaterThan(0);

      // Case B: CPP = 35 mmHg (severe ischemia) -> central apnea
      let patientState = {
        ...patient,
        cpp: 35.0
      };
      
      let vitalsState = {
        ...baseVitals
      };

      // Loop for 25 seconds to allow respiratory rate to transition to 0
      for (let i = 0; i < 25; i++) {
        const out = RespiratoryEngine.tick(1, { patient: patientState, vitals: vitalsState, time: i }, null, 21.0, drugEffects, inputs);
        patientState = { ...patientState, ...out.lungVolumes };
        vitalsState = out.vitals;
        console.log(`Step ${i}: rr = ${vitalsState.rr}, targetRR = ${out.vitals.rr}, isApneic = ${out.isApneic}`);
      }

      // Severe ischemia triggers central apnea (RR drops to 0)
      expect(vitalsState.rr).toBe(0);
    });
  });
});
