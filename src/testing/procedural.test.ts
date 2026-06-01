import { describe, it, expect } from 'vitest';
import { ProceduralEngine, ProceduralPatientState } from '../engine/ProceduralEngine';

describe('Procedural & Clinical Exam Engine Regression Tests', () => {

  const createBaselinePatient = (): ProceduralPatientState => ({
    mallampati: 1,
    neckMobility: 'normal',
    isObese: false,
    airwayBlood: false,
    airwaySecured: false,
    ventilationStatus: 'spontaneous',
    isApneic: false,
    tubePosition: 'none',
    isSeptic: false,
    stomach: 'empty',
    trauma: false,
    dlAttempts: 0,
    isTopicalized: false
  });

  describe('1. Cormack-Lehane Grade Calculations', () => {
    it('should calculate Grade 1 for a normal elective patient', () => {
      const patient = createBaselinePatient();
      const view = ProceduralEngine.calculateCormackLehaneGrade(patient, 'Macintosh 3');

      expect(view.grade).toBe(1);
      expect(view.description).toContain('You sweep the tongue and have a direct, full line of sight to the vocal cords.');
    });

    it('should calculate worse grades for an obese patient with reduced neck mobility', () => {
      const patient = createBaselinePatient();
      patient.mallampati = 3;
      patient.isObese = true;
      patient.neckMobility = 'reduced';
      
      // baseGrade = 3 + 1 (reduced neck) + 1 (obese) = 5 -> clamped to 4
      const view = ProceduralEngine.calculateCormackLehaneGrade(patient, 'Macintosh 3');

      expect(view.grade).toBe(4);
      expect(view.description).toContain('You can only see the soft palate and posterior pharynx.');
    });

    it('should improve glottic exposure when using a Hyperangulated video laryngoscope blade', () => {
      const patient = createBaselinePatient();
      patient.mallampati = 3;
      patient.isObese = true;
      patient.neckMobility = 'reduced';

      // baseGrade = 5 -> clamped to 4
      // Hyperangulated: grade = max(1, 4 - 2) = 2
      const view = ProceduralEngine.calculateCormackLehaneGrade(patient, 'Hyperangulated 3');

      expect(view.grade).toBe(2);
      expect(view.description).toContain('You can see the posterior half of the vocal cords and the arytenoids.');
    });

    it('should obscure view completely to Grade 4 when active airway hemorrhage is present', () => {
      const patient = createBaselinePatient();
      patient.airwayBlood = true;

      const view = ProceduralEngine.calculateCormackLehaneGrade(patient, 'Macintosh 3');

      expect(view.grade).toBe(4);
      expect(view.description).toContain('The lens/view is completely obscured by thick red blood');
    });
  });

  describe('2. Intubation Outcomes and Stylet/Bougie Rules', () => {
    it('should fail intubation blindly on a Grade 4 view', () => {
      const outcome = ProceduralEngine.evaluateIntubationOutcome('Macintosh 3', 'Stylet', 4);

      expect(outcome.success).toBe(false);
      expect(outcome.failReason).toContain('Cannot intubate blindly with Grade IV view');
    });

    it('should fail hyperangulated blade intubation if a standard stylet is used', () => {
      const outcome = ProceduralEngine.evaluateIntubationOutcome('Hyperangulated 3', 'Standard Stylet', 2);

      expect(outcome.success).toBe(false);
      expect(outcome.failReason).toContain('A hyperangulated blade requires a rigid hyperangulated stylet');
    });

    it('should succeed hyperangulated blade intubation when using a hyperangulated rigid stylet', () => {
      const outcome = ProceduralEngine.evaluateIntubationOutcome('Hyperangulated 3', 'Hyperangulated Stylet', 1);

      expect(outcome.success).toBe(true);
      expect(outcome.failReason).toBe('');
    });

    it('should fail Grade 3 intubation if no ETT guide adjunct is used', () => {
      const outcome = ProceduralEngine.evaluateIntubationOutcome('Macintosh 3', 'None', 3);

      expect(outcome.success).toBe(false);
      expect(outcome.failReason).toContain('Cannot direct tube into anterior airway without a stylet or bougie');
    });

    it('should verify height-dependent right mainstem endobronchial intubation risk', () => {
      // Shorter patient (150cm) has high mainstem risk:
      // mainstemRisk = max(0.01, 0.40 - (10 * 0.01)) = 0.30 (30% chance of mainstem)
      // Let's force a randVal = 0.15 (triggers right mainstem)
      const posShort = ProceduralEngine.calculateTubePosition(true, 150, 0.15);
      expect(posShort).toBe('right_mainstem');

      // Let's force a randVal = 0.35 (should be normal trachea, greater than 0.30 + 0.02)
      const posNormal = ProceduralEngine.calculateTubePosition(true, 150, 0.35);
      expect(posNormal).toBe('trachea');
    });
  });

  describe('3. Lung Fields & Gastric Stethoscopic Auscultation', () => {
    it('should hear epigastric gurgling borborygmi if tube is placed in esophagus', () => {
      const patient = createBaselinePatient();
      patient.airwaySecured = true;
      patient.tubePosition = 'esophagus';
      patient.ventilationStatus = 'failed';

      const soundsEpigastrium = ProceduralEngine.auscultateLungs('Epigastrium', patient);
      const soundsLung = ProceduralEngine.auscultateLungs('Left Lung', patient);

      expect(soundsEpigastrium).toContain('Loud gurgling (Borborygmi) heard with each ventilator breath');
      expect(soundsLung).toContain('Diminished or absent breath sounds.');
    });

    it('should hear asymmetric absent breath sounds if tube is right mainstemmed', () => {
      const patient = createBaselinePatient();
      patient.airwaySecured = true;
      patient.tubePosition = 'right_mainstem';
      patient.ventilationStatus = 'successful';

      const leftSounds = ProceduralEngine.auscultateLungs('Left Lung', patient);
      const rightSounds = ProceduralEngine.auscultateLungs('Right Lung', patient);
      const stomachSounds = ProceduralEngine.auscultateLungs('Epigastrium', patient);

      expect(leftSounds).toBe('Absent breath sounds on the left side.');
      expect(rightSounds).toBe('Clear, loud breath sounds on the right side.');
      expect(stomachSounds).toBe('Silent. No borborygmi heard over stomach.');
    });

    it('should hear clear equal bilateral sounds if tube is in trachea', () => {
      const patient = createBaselinePatient();
      patient.airwaySecured = true;
      patient.tubePosition = 'trachea';
      patient.ventilationStatus = 'successful';

      const leftSounds = ProceduralEngine.auscultateLungs('Left Lung', patient);
      const stomachSounds = ProceduralEngine.auscultateLungs('Epigastrium', patient);

      expect(leftSounds).toBe('Clear, equal bilateral breath sounds with mechanical ventilation.');
      expect(stomachSounds).toBe('Silent. No borborygmi heard over stomach.');
    });
  });

  describe('4. POCUS Ultrasonography Findings', () => {
    it('should identify a full stomach on Gastric ultrasound', () => {
      const patient = createBaselinePatient();
      patient.stomach = 'full';

      const finding = ProceduralEngine.performPocus('Gastric', patient);
      expect(finding).toBe('Antrum is distended with echogenic material (Full Stomach).');
    });

    it('should identify double-tract sign on airway ultrasound during esophageal intubation', () => {
      const patient = createBaselinePatient();
      patient.ventilationStatus = 'failed';
      patient.dlAttempts = 1;

      const finding = ProceduralEngine.performPocus('Airway', patient);
      expect(finding).toBe('Double-Tract Sign visible! Tube in esophagus!');
    });

    it('should identify morison pouch free fluid in trauma eFAST scans', () => {
      const patient = createBaselinePatient();
      patient.trauma = true;

      const finding = ProceduralEngine.performPocus('eFAST', patient);
      expect(finding).toBe("Positive FAST: Anechoic free fluid seen in Morison's pouch (RUQ).");
    });
  });
});
