import { describe, it, expect, vi } from 'vitest';
import { 
  HERBAL_MEDICINES, 
  DIETARY_SUPPLEMENTS, 
  CAM_THERAPIES, 
  assessHerbalRisks, 
  getDiscontinuationGuidance 
} from '../engine/CAMKnowledgeEngine';

describe('Chapter 33: Complementary and Alternative Therapies Integration Tests', () => {

  describe('1. CAMKnowledgeEngine Data Structure and Integrity (Table 33.1)', () => {
    it('should have all 11 herbal medicines registered from Miller Ch33', () => {
      expect(HERBAL_MEDICINES.length).toBe(11);
      
      const expectedHerbs = [
        'echinacea', 'ephedra', 'garlic', 'ginger', 'ginkgo',
        'ginseng', 'green tea', 'kava', 'saw palmetto', 'st. john\'s wort', 'valerian'
      ];
      
      for (const herbId of expectedHerbs) {
        const herb = HERBAL_MEDICINES.find(h => h.id === herbId);
        expect(herb).toBeDefined();
        expect(herb?.commonName).toBeTruthy();
        expect(herb?.scientificName).toBeTruthy();
        expect(herb?.perioperativeConcerns.length).toBeGreaterThan(0);
      }
    });

    it('should have correct discontinuation timelines matching textbook consensus', () => {
      // Garlic: >= 7 days
      expect(HERBAL_MEDICINES.find(h => h.id === 'garlic')?.discontinueDays).toBe(7);
      // Ephedra: >= 24 hours (1 day)
      expect(HERBAL_MEDICINES.find(h => h.id === 'ephedra')?.discontinueDays).toBe(1);
      // Ginseng: >= 7 days
      expect(HERBAL_MEDICINES.find(h => h.id === 'ginseng')?.discontinueDays).toBe(7);
      // Ginkgo: >= 36 hours (2 days)
      expect(HERBAL_MEDICINES.find(h => h.id === 'ginkgo')?.discontinueDays).toBe(2);
      // St. John's Wort: >= 5 days
      expect(HERBAL_MEDICINES.find(h => h.id === 'st. john\'s wort')?.discontinueDays).toBe(5);
      // Kava: >= 24 hours (1 day)
      expect(HERBAL_MEDICINES.find(h => h.id === 'kava')?.discontinueDays).toBe(1);
      // Echinacea/Valerian: no data (null)
      expect(HERBAL_MEDICINES.find(h => h.id === 'echinacea')?.discontinueDays).toBeNull();
      expect(HERBAL_MEDICINES.find(h => h.id === 'valerian')?.discontinueDays).toBeNull();
    });

    it('should have all 3 major dietary supplements registered', () => {
      expect(DIETARY_SUPPLEMENTS.length).toBe(3);
      const fishOil = DIETARY_SUPPLEMENTS.find(s => s.id === 'fishOil');
      expect(fishOil).toBeDefined();
      expect(fishOil?.discontinueDays).toBe(14); // 2 weeks
    });

    it('should have Neiguan/P6 acupuncture, music therapy, and deep breathing registered', () => {
      expect(CAM_THERAPIES.length).toBe(3);
      const p6 = CAM_THERAPIES.find(t => t.id === 'acupuncture_p6');
      expect(p6).toBeDefined();
      expect(p6?.clinicalTiming).toBe('Initiate before anesthesia induction.');
    });
  });

  describe('2. assessHerbalRisks Clinical Evaluation Function', () => {
    it('should flag bleeding risks for garlic, ginkgo, ginseng, fish oil, and glucosamine', () => {
      const result = assessHerbalRisks(['garlic', 'ginkgo'], ['fishOil']);
      expect(result.bleedingRiskHerbs).toContain('Garlic');
      expect(result.bleedingRiskHerbs).toContain('Ginkgo');
      expect(result.bleedingRiskHerbs).toContain('Fish Oil (Omega-3 Fatty Acids)');
      expect(result.summary).toContain('Increased bleeding risk');
    });

    it('should flag sedation risks for valerian and kava', () => {
      const result = assessHerbalRisks(['valerian', 'kava']);
      expect(result.sedationRiskHerbs).toContain('Valerian');
      expect(result.sedationRiskHerbs).toContain('Kava');
      expect(result.summary).toContain('Potentiated sedation risk');
    });

    it('should flag CYP3A4 enzyme induction for St. John\'s Wort', () => {
      const result = assessHerbalRisks(['st. john\'s wort']);
      expect(result.enzymeInductionHerbs).toContain('St. John\'s Wort');
      expect(result.summary).toContain('CYP3A4 enzyme induction risk');
    });
  });

  describe('3. getDiscontinuationGuidance formatting', () => {
    it('should return explicit timelines for known herbs and supplements', () => {
      expect(getDiscontinuationGuidance('garlic')).toBe('Discontinue >= 7 day(s) before surgery (Ch33).');
      expect(getDiscontinuationGuidance('fishOil')).toBe('Discontinue >= 14 day(s) (2 weeks) before surgery (Ch33).');
    });

    it('should return specific warnings for herbs with no direct pharmacokinetic data', () => {
      expect(getDiscontinuationGuidance('valerian')).toContain('Taper gradually');
      expect(getDiscontinuationGuidance('echinacea')).toContain('hepatic compromise');
    });
  });

  describe('4. usePhysiology Quality check hook logic simulation', () => {
    // Replicate usePhysiology logic directly to test triggers
    const simulateCAMEval = (patient: any, activeMeds: any[], gasSettings: any, surgicalPhase: string) => {
      const events: any[] = [];
      const loggedCAMEvents: any = { ...(patient.loggedCAMEvents || {}) };
      
      const logQualityEvent = (evt: any) => {
        events.push(evt);
      };

      // 1. Herbal screening omission
      const hasHerbalOrDietary = (patient.herbalSupplements?.length > 0 || patient.dietarySupplements?.length > 0);
      if (hasHerbalOrDietary && !patient.herbalScreeningDone && surgicalPhase !== 'Pre-Op' && !loggedCAMEvents.herbalOmission) {
          loggedCAMEvents.herbalOmission = true;
          logQualityEvent({
              category: 'ChecklistAdherence',
              severity: 'moderate',
              description: 'Omission of preoperative herbal screening'
          });
      }

      // 2. Valerian + sedative synergy
      const hasValerianKava = patient.herbalSupplements?.some((h: string) => h === 'valerian' || h === 'kava');
      const activeGabaSedative = activeMeds?.find(m => (m.name === 'Midazolam' || m.name === 'Propofol') && m.Ce > 0.01);
      if (hasValerianKava && activeGabaSedative && !loggedCAMEvents.valerianSynergy) {
          loggedCAMEvents.valerianSynergy = true;
          logQualityEvent({
              category: 'PharmacologicChoice',
              severity: 'minor',
              description: 'Valerian/Kava potentiates GABA-ergic sedatives'
          });
      }

      // 3. St. John's Wort CYP3A4 induction
      const hasSjw = patient.herbalSupplements?.some((h: string) => h === 'stjohnswort' || h === 'st. john\'s wort' || h === "st. john's wort" || h === 'stJohnsWort');
      const activeCyp3a4Substrate = activeMeds?.find(m => (m.name === 'Alfentanil' || m.name === 'Midazolam' || m.name === 'Lidocaine' || m.name === 'Fentanyl' || m.name === 'Ondansetron') && m.Ce > 0.01);
      if (hasSjw && activeCyp3a4Substrate && !loggedCAMEvents.sjwInduction) {
          loggedCAMEvents.sjwInduction = true;
          logQualityEvent({
              category: 'PharmacologicChoice',
              severity: 'moderate',
              description: 'St. John\'s Wort induces CYP3A4'
          });
      }

      // 4. Bleeding risk herbs + neuraxial
      const bleedingCAMs = ['garlic', 'ginkgo', 'ginseng', 'sawPalmetto', 'ginger', 'green tea', 'fishOil', 'glucosamineChondroitin'];
      const hasBleedingCAM = patient.herbalSupplements?.some((h: string) => bleedingCAMs.includes(h)) || patient.dietarySupplements?.some((s: string) => bleedingCAMs.includes(s));
      const hasNeuraxialActive = patient.hasNeuraxial || patient.anesthesiaType?.neuraxial;
      if (hasBleedingCAM && hasNeuraxialActive && !loggedCAMEvents.bleedingNeuraxial) {
          loggedCAMEvents.bleedingNeuraxial = true;
          logQualityEvent({
              category: 'Vigilance',
              severity: 'major',
              description: 'Attempted neuraxial anesthesia with antiplatelet herbs'
          });
      }

      // 5. Ephedra + volatile anesthetic
      const hasEphedra = patient.herbalSupplements?.some((h: string) => h === 'ephedra' || h === 'ma huang');
      const activeVolatile = gasSettings?.agent;
      if (hasEphedra && activeVolatile && activeVolatile !== 'room_air' && activeVolatile !== 'none' && !loggedCAMEvents.ephedraArrhythmia) {
          loggedCAMEvents.ephedraArrhythmia = true;
          logQualityEvent({
              category: 'CrisisManagement',
              severity: 'major',
              description: 'Ephedra combined with volatile anesthetic'
          });
      }

      // 6. P6 stimulation for PONV
      if (patient.p6StimulationApplied && !loggedCAMEvents.p6Stimulation) {
          loggedCAMEvents.p6Stimulation = true;
          logQualityEvent({
              category: 'PharmacologicChoice',
              severity: 'info',
              description: 'P6 acupressure applied'
          });
      }

      return { events, loggedCAMEvents };
    };

    it('should fire herbalOmission event when patient has herbs but screening is omitted at induction', () => {
      const patient = { herbalSupplements: ['garlic'], herbalScreeningDone: false, loggedCAMEvents: {} };
      const { events } = simulateCAMEval(patient, [], {}, 'Induction');
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('ChecklistAdherence');
      expect(events[0].description).toBe('Omission of preoperative herbal screening');
    });

    it('should not fire herbalOmission if screening was performed', () => {
      const patient = { herbalSupplements: ['garlic'], herbalScreeningDone: true, loggedCAMEvents: {} };
      const { events } = simulateCAMEval(patient, [], {}, 'Induction');
      expect(events.length).toBe(0);
    });

    it('should detect valerian/sedative synergy', () => {
      const patient = { herbalSupplements: ['valerian'], herbalScreeningDone: true, loggedCAMEvents: {} };
      const activeMeds = [{ name: 'Midazolam', Ce: 0.05 }];
      const { events } = simulateCAMEval(patient, activeMeds, {}, 'Maintenance');
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('PharmacologicChoice');
      expect(events[0].severity).toBe('minor');
    });

    it('should detect St. John\'s Wort and CYP3A4 substrate interaction', () => {
      const patient = { herbalSupplements: ['st. john\'s wort'], herbalScreeningDone: true, loggedCAMEvents: {} };
      const activeMeds = [{ name: 'Fentanyl', Ce: 0.03 }];
      const { events } = simulateCAMEval(patient, activeMeds, {}, 'Maintenance');
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('PharmacologicChoice');
      expect(events[0].severity).toBe('moderate');
    });

    it('should flag neuraxial attempt when bleeding risk CAM is present', () => {
      const patient = { herbalSupplements: ['garlic'], hasNeuraxial: true, herbalScreeningDone: true, loggedCAMEvents: {} };
      const { events } = simulateCAMEval(patient, [], {}, 'Maintenance');
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('Vigilance');
      expect(events[0].severity).toBe('major');
    });

    it('should flag ephedra and volatile agent co-administration', () => {
      const patient = { herbalSupplements: ['ephedra'], herbalScreeningDone: true, loggedCAMEvents: {} };
      const gasSettings = { agent: 'sevoflurane' };
      const { events } = simulateCAMEval(patient, [], gasSettings, 'Maintenance');
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('CrisisManagement');
      expect(events[0].severity).toBe('major');
    });

    it('should award credit for P6 acupressure application', () => {
      const patient = { p6StimulationApplied: true, loggedCAMEvents: {} };
      const { events } = simulateCAMEval(patient, [], {}, 'Pre-Op');
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('PharmacologicChoice');
      expect(events[0].severity).toBe('info');
    });
  });
});
