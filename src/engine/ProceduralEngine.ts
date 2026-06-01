import { DynamicProceduralRegistry } from '../knowledge/DynamicProceduralRegistry.ts';

export interface ProceduralPatientState {
  mallampati: number; // 1 to 4
  neckMobility: 'normal' | 'reduced';
  isObese?: boolean;
  airwayBlood?: boolean;
  airwaySecured?: boolean;
  ventilationStatus?: string; // 'none' | 'assisted' | 'successful' | 'failed' | 'spontaneous'
  isApneic?: boolean;
  tubePosition?: 'none' | 'trachea' | 'right_mainstem' | 'left_mainstem' | 'esophagus';
  isSeptic?: boolean;
  stomach?: 'empty' | 'full';
  trauma?: boolean;
  dlAttempts?: number;
  isTopicalized?: boolean;
}

export class ProceduralEngine {
  /**
   * Calculates the Cormack-Lehane Grade during laryngoscopy.
   * Completely pure and headless.
   */
  static calculateCormackLehaneGrade(
    patient: ProceduralPatientState,
    blade: string
  ): { grade: number; description: string } {
    // 1. Calculate Base Cormack-Lehane Grade from Anatomy
    let baseGrade = patient.mallampati || 1;
    if (patient.neckMobility === 'reduced') baseGrade += 1;
    if (patient.isObese) baseGrade += 1;
    let finalGrade = Math.min(4, baseGrade);

    let desc = `You insert the ${blade}. `;

    if (patient.airwayBlood) { 
      desc += "The lens/view is completely obscured by thick red blood and secretions. You cannot see any anatomical landmarks."; 
      finalGrade = 4; 
    } else if (blade.includes('Fiberoptic')) { 
      desc += "Navigating the flexible scope, you bypass the upper airway soft tissue and clearly visualize the vocal cords."; 
      finalGrade = 1; 
    } else if (blade.includes('Hyperangulated')) {
      finalGrade = Math.max(1, finalGrade - 2); // Improves view significantly
      if (finalGrade === 1) desc += "The steep angle of the hyperangulated blade provides an excellent 'around the corner' view of the glottic opening.";
      else if (finalGrade === 2) desc += "You can see the posterior half of the vocal cords and the arytenoids.";
      else desc += "Even with the hyperangulated blade, you can only see the tip of the epiglottis due to the severe anterior airway.";
    } else {
      // Standard Mac/Miller
      if (finalGrade === 1) desc += "You sweep the tongue and have a direct, full line of sight to the vocal cords.";
      else if (finalGrade === 2) desc += "You can see the posterior half of the glottic opening and arytenoids, but the anterior commissure is hidden.";
      else if (finalGrade === 3) desc += "You can only see the epiglottis. The vocal cords are completely hidden (Anterior Airway).";
      else desc += "You can only see the soft palate and posterior pharynx. No laryngeal structures are visible.";
    }

    return { grade: finalGrade, description: desc };
  }

  /**
   * Evaluates the mechanical/anatomical outcome of ETT tube placement.
   * Completely pure and headless.
   */
  static evaluateIntubationOutcome(
    blade: string,
    adjunct: string,
    trueGrade: number,
    patientState?: any
  ): { success: boolean; failReason: string } {
    if (patientState) {
      const pathwayKey = blade.includes('Fiberoptic') ? 'Awake Fiberoptic Intubation' : 'Rapid Sequence Induction';
      const check = DynamicProceduralRegistry.validateState(pathwayKey, patientState);
      if (!check.success) {
        return { success: false, failReason: check.failReason };
      }
    }

    let success = false;
    let failReason = "";

    if (trueGrade === 4 && !blade.includes('Fiberoptic')) {
      failReason = "Cannot intubate blindly with Grade IV view. Esophageal intubation.";
    } else if (blade.includes('Hyperangulated') && !adjunct.includes('Hyperangulated') && !adjunct.includes('Articulating')) {
      failReason = "A hyperangulated blade requires a rigid hyperangulated stylet or articulating bougie to navigate the steep curve. A standard stylet/bougie cannot make the turn.";
    } else if (trueGrade === 3 && adjunct.includes('None')) {
      failReason = "Cannot direct tube into anterior airway without a stylet or bougie on a Grade III view.";
    } else {
      success = true;
    }

    return { success, failReason };
  }

  /**
   * Calculates ETT tube placement depth outcomes (tracheal vs. endobronchial mainstem vs. esophageal).
   * Completely pure and headless.
   */
  static calculateTubePosition(
    success: boolean,
    patientHeight: number,
    randVal: number = Math.random()
  ): string {
    if (!success) return 'esophagus';

    const mainstemRisk = Math.max(0.01, 0.40 - ((patientHeight - 140) * 0.01));
    
    if (randVal < mainstemRisk) return 'right_mainstem';
    if (randVal < mainstemRisk + 0.02) return 'left_mainstem';
    return 'trachea';
  }

  /**
   * Maps stethoscopic auscultation breath sounds.
   * Completely pure and headless.
   */
  static auscultateLungs(location: string, patient: ProceduralPatientState): string {
    let finding = "";
    const isTrachealOrSuccessful = patient.tubePosition === 'trachea' || patient.ventilationStatus === 'successful';
    const isEsophagealOrFailed = patient.tubePosition === 'esophagus' || patient.ventilationStatus === 'failed';

    if (!patient.airwaySecured && patient.isApneic) {
      finding = "Silent. No breath sounds heard (Patient is apneic).";
    } else if (!patient.airwaySecured && !patient.isApneic) {
      finding = "Normal vesicular breath sounds. Clear bilaterally.";
    } else if (patient.tubePosition === 'right_mainstem') {
      if (location === 'Left Lung') finding = "Absent breath sounds on the left side.";
      else if (location === 'Right Lung') finding = "Clear, loud breath sounds on the right side.";
      else if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
    } else if (patient.tubePosition === 'left_mainstem') {
      if (location === 'Left Lung') finding = "Clear, loud breath sounds on the left side.";
      else if (location === 'Right Lung') finding = "Absent breath sounds on the right side.";
      else if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
    } else if (isTrachealOrSuccessful) {
      if (location === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
      else finding = "Clear, equal bilateral breath sounds with mechanical ventilation.";
    } else if (isEsophagealOrFailed) {
      if (location === 'Epigastrium') finding = "Loud gurgling (Borborygmi) heard with each ventilator breath! TUBE IS IN THE STOMACH!";
      else finding = "Diminished or absent breath sounds.";
    }
    
    return finding;
  }

  /**
   * Compiles Point-Of-Care Ultrasound (POCUS) findings.
   * Completely pure and headless.
   */
  static performPocus(type: string, patient: ProceduralPatientState): string {
    let finding = "";
    if (type === 'Cardiac (TTE)') {
      finding = patient.isSeptic 
        ? "Hyperdynamic left ventricle, underfilled Right Ventricle (Vasodilatory Shock)." 
        : "Normal LV/RV function. Good contractility.";
    } else if (type === 'Gastric') {
      finding = patient.stomach === 'full' 
        ? "Antrum is distended with echogenic material (Full Stomach)." 
        : "Antrum is flat and empty (Target sign).";
    } else if (type === 'Airway') {
      const dlAttempts = patient.dlAttempts || 0;
      finding = patient.airwaySecured 
        ? "Single air-mucosal interface (Confirmed Tracheal Placement)." 
        : (patient.ventilationStatus === 'failed' && dlAttempts > 0 
            ? "Double-Tract Sign visible! Tube in esophagus!" 
            : "Normal tracheal anatomy.");
    } else if (type === 'Lung') {
      finding = (!patient.isApneic || patient.airwaySecured) 
        ? "Bilateral lung sliding present (Ants marching sign)." 
        : "Absent lung sliding bilaterally (Apnea).";
    } else if (type === 'eFAST') {
      finding = patient.trauma 
        ? "Positive FAST: Anechoic free fluid seen in Morison's pouch (RUQ)." 
        : "Negative FAST. No free fluid in dependent views.";
    }
    return finding;
  }
}
