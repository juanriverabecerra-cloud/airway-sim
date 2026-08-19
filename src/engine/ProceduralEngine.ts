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
    const p: any = patient || {};
    const safeBlade = typeof blade === 'string' ? blade : '';
    
    // 1. Calculate Base Cormack-Lehane Grade from Anatomy
    let m = Number(p.mallampati);
    if (isNaN(m) || !Number.isFinite(m) || m < 1 || m > 4) {
      m = 1;
    }
    let baseGrade = m;
    if (p.neckMobility === 'reduced') baseGrade += 1;
    if (p.isObese) baseGrade += 1;
    let finalGrade = Math.min(4, baseGrade);

    let desc = `You insert the ${safeBlade}. `;

    if (p.airwayBlood) { 
      desc += "The lens/view is completely obscured by thick red blood and secretions. You cannot see any anatomical landmarks."; 
      finalGrade = 4; 
    } else if (safeBlade.includes('Fiberoptic')) { 
      desc += "Navigating the flexible scope, you bypass the upper airway soft tissue and clearly visualize the vocal cords."; 
      finalGrade = 1; 
    } else if (safeBlade.includes('Hyperangulated')) {
      finalGrade = Math.max(1, finalGrade - 2); // Improves view significantly
      if (finalGrade === 1) desc += "The steep angle of the hyperangulated blade provides an excellent 'around the corner' view of the glottic opening.";
      else if (finalGrade === 2) desc += "You can see the posterior half of the vocal cords and the arytenoids.";
      else desc += "Even with the hyperangulated blade, you can only see the tip of the glottis due to the severe anterior airway.";
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
    const safeBlade = typeof blade === 'string' ? blade : '';
    const safeAdjunct = typeof adjunct === 'string' ? adjunct : '';
    let g = Number(trueGrade);
    if (isNaN(g) || !Number.isFinite(g)) {
      g = 1;
    }

    if (patientState) {
      const pathwayKey = safeBlade.includes('Fiberoptic') ? 'Awake Fiberoptic Intubation' : 'Rapid Sequence Induction';
      const check = DynamicProceduralRegistry.validateState(pathwayKey, patientState);
      if (!check.success) {
        return { success: false, failReason: check.failReason };
      }
    }

    let success = false;
    let failReason = "";

    if (g === 4 && !safeBlade.includes('Fiberoptic')) {
      failReason = "Cannot intubate blindly with Grade IV view. Esophageal intubation.";
    } else if (safeBlade.includes('Hyperangulated') && !safeAdjunct.includes('Hyperangulated') && !safeAdjunct.includes('Articulating')) {
      failReason = "A hyperangulated blade requires a rigid hyperangulated stylet or articulating bougie to navigate the steep curve. A standard stylet/bougie cannot make the turn.";
    } else if (g === 3 && safeAdjunct.includes('None')) {
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

    let h = Number(patientHeight);
    if (isNaN(h) || !Number.isFinite(h) || h <= 0) {
      h = 170.0;
    }
    h = Math.max(50.0, Math.min(250.0, h));

    // Clamp mainstemRisk between 1% and 95%
    const mainstemRisk = Math.max(0.01, Math.min(0.95, 0.40 - ((h - 140) * 0.01)));
    
    // Clamp randVal between 0.0 and 1.0 to prevent out-of-bounds comparison
    let r = Number(randVal);
    if (isNaN(r) || !Number.isFinite(r)) {
      r = Math.random();
    }
    r = Math.max(0.0, Math.min(1.0, r));
    
    if (r < mainstemRisk) return 'right_mainstem';
    if (r < mainstemRisk + 0.02) return 'left_mainstem';
    return 'trachea';
  }

  static auscultateLungs(location: string, patient: ProceduralPatientState): string {
    const safeLocation = typeof location === 'string' ? location : '';
    const p: any = patient || {};
    const tubePosition = p.tubePosition || 'none';
    const ventilationStatus = p.ventilationStatus || 'none';
    const airwaySecured = !!p.airwaySecured;
    const isApneic = !!p.isApneic;

    let finding = "";
    const isTrachealOrSuccessful = tubePosition === 'trachea' || ventilationStatus === 'successful';
    const isEsophagealOrFailed = tubePosition === 'esophagus' || ventilationStatus === 'failed';

    if (!airwaySecured && isApneic) {
      finding = "Silent. No breath sounds heard (Patient is apneic).";
    } else if (!airwaySecured && !isApneic) {
      finding = "Normal vesicular breath sounds. Clear bilaterally.";
    } else if (tubePosition === 'right_mainstem') {
      if (safeLocation === 'Left Lung') finding = "Absent breath sounds on the left side.";
      else if (safeLocation === 'Right Lung') finding = "Clear, loud breath sounds on the right side.";
      else if (safeLocation === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
    } else if (tubePosition === 'left_mainstem') {
      if (safeLocation === 'Left Lung') finding = "Clear, loud breath sounds on the left side.";
      else if (safeLocation === 'Right Lung') finding = "Absent breath sounds on the right side.";
      else if (safeLocation === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
    } else if (isTrachealOrSuccessful) {
      if (safeLocation === 'Epigastrium') finding = "Silent. No borborygmi heard over stomach.";
      else finding = "Clear, equal bilateral breath sounds with mechanical ventilation.";
    } else if (isEsophagealOrFailed) {
      if (safeLocation === 'Epigastrium') finding = "Loud gurgling (Borborygmi) heard with each ventilator breath! TUBE IS IN THE STOMACH!";
      else finding = "Diminished or absent breath sounds.";
    }
    
    return finding;
  }

  /**
   * Compiles Point-Of-Care Ultrasound (POCUS) findings.
   * Completely pure and headless.
   */
  static performPocus(type: string, patient: ProceduralPatientState): string {
    const safeType = typeof type === 'string' ? type : '';
    const p: any = patient || {};
    const isSeptic = !!p.isSeptic;
    const stomach = p.stomach || 'empty';
    const dlAttempts = p.dlAttempts || 0;
    const airwaySecured = !!p.airwaySecured;
    const ventilationStatus = p.ventilationStatus || 'none';
    const isApneic = !!p.isApneic;
    const trauma = !!p.trauma;

    let finding = "";
    if (safeType === 'Cardiac (TTE)') {
      finding = isSeptic 
        ? "Hyperdynamic left ventricle, underfilled Right Ventricle (Vasodilatory Shock)." 
        : "Normal LV/RV function. Good contractility.";
    } else if (safeType === 'Gastric') {
      finding = stomach === 'full' 
        ? "Antrum is distended with echogenic material (Full Stomach)." 
        : "Antrum is flat and empty (Target sign).";
    } else if (safeType === 'Airway') {
      finding = airwaySecured 
        ? "Single air-mucosal interface (Confirmed Tracheal Placement)." 
        : (ventilationStatus === 'failed' && dlAttempts > 0 
            ? "Double-Tract Sign visible! Tube in esophagus!" 
            : "Normal tracheal anatomy.");
    } else if (safeType === 'Lung') {
      finding = (!isApneic || airwaySecured) 
        ? "Bilateral lung sliding present (Ants marching sign)." 
        : "Absent lung sliding bilaterally (Apnea).";
    } else if (safeType === 'eFAST') {
      finding = trauma 
        ? "Positive FAST: Anechoic free fluid seen in Morison's pouch (RUQ)." 
        : "Negative FAST. No free fluid in dependent views.";
    }
    return finding;
  }
}
