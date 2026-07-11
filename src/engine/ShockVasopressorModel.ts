/**
 * Shock Classification and Vasopressor Selection Model
 *
 * Shock = inadequate tissue perfusion. Classification guides vasopressor selection:
 *
 * === FOUR SHOCK TYPES + VASOPRESSOR CHOICE ===
 *
 * 1. DISTRIBUTIVE SHOCK (septic, neurogenic, anaphylactic, vasodilatory)
 *    Physiology: ↓SVR, ↑CO (hyperdynamic), distributive oxygen delivery failure
 *    FIRST-LINE VASOPRESSOR: NOREPINEPHRINE (alpha-1 > beta-1)
 *    Evidence: Multiple RCTs + meta-analyses (SOAP II: NE > dopamine)
 *    SECOND: Vasopressin 0.03-0.04 units/min (V1 agonist — bypasses adrenergic receptors,
 *            preserved efficacy in acidemia unlike catecholamines)
 *    THIRD (add-on): Epinephrine (when CO also depressed)
 *    AVOID: Phenylephrine alone (reflex bradycardia → worse CO)
 *
 * 2. CARDIOGENIC SHOCK (pump failure: MI, HF, cardiomyopathy, valve rupture)
 *    Physiology: ↓CO, ↑SVR (compensatory), ↑PCWP
 *    GOAL: ↑CO without increasing afterload
 *    FIRST: Norepinephrine (maintains CPP to ischemic ventricle, supports MAP)
 *    SECOND: Inodilators — Dobutamine (beta-1 agonist → inotropy) or Milrinone (PDE3I)
 *    AVOID: Pure vasopressors without inotropy (phenylephrine alone → worse CO)
 *    RESCUE: IABP or Impella (mechanical cardiac support)
 *
 * 3. HYPOVOLEMIC SHOCK (hemorrhagic, dehydration)
 *    Physiology: ↓Preload → ↓CO → ↑SVR
 *    PRIMARY TREATMENT: VOLUME REPLACEMENT (blood products/fluids)
 *    Vasopressors: bridge-only, temporary, while getting volume in
 *    AVOID: Vasopressors as substitute for volume (masks decompensation)
 *
 * 4. OBSTRUCTIVE SHOCK (PE, tamponade, tension pneumothorax)
 *    Physiology: mechanical obstruction to flow → ↓CO despite normal or high preload
 *    PRIMARY: TREAT THE OBSTRUCTION (drain, lyse, decompress)
 *    Vasopressors: supportive while treating cause
 *    TAMPONADE: Vasopressin or norepinephrine; avoid tachycardia (reduces filling time)
 *
 * === SPECIFIC SCENARIOS ===
 *
 * RV FAILURE (from PE, PH, cardiogenic):
 *   RV needs: ↑CPP to RV (systemic vasopressor), ↓PVR (iNO, milrinone, epoprostenol)
 *   VASOPRESSIN preferred over NE for systemic support in isolated RV failure
 *   (NE increases PVR slightly via non-selective alpha → worse for RV)
 *
 * POST-CPB VASOPLEGIC SYNDROME:
 *   Massive inflammatory response from CPB → profound vasodilation
 *   FIRST: Vasopressin (most effective for CPB-related vasoplegia)
 *   SECOND: Norepinephrine
 *   THIRD: Methylene blue (blocks NO synthase — experimental but effective)
 *
 * LIVER TRANSPLANT / HEPATIC FAILURE:
 *   Endogenous vasopressin deficiency (liver fails to synthesize)
 *   → VASOPRESSIN particularly effective (replacing what liver is not making)
 *
 * Sources: De Backer D, NEJM 2010 (SOAP II - NE vs DA); Annane D, JAMA 2007;
 * Rhodes A, Intensive Care Med 2017 (Surviving Sepsis Campaign);
 * Miller's 9th Ed Ch 93 (Shock and Vasopressors).
 */

export interface ShockVasopressorInputs {
  // Shock classification
  shockType?: 'distributive' | 'cardiogenic' | 'hypovolemic' | 'obstructive' | 'mixed';
  isRVFailure?: boolean;
  isPostCPBVasoplegia?: boolean;
  isLiverFailure?: boolean;

  // Current hemodynamics
  currentMAP?: number;
  currentCO?: number;            // L/min
  currentSVR?: number;           // dyn·s/cm⁵
  currentCVP?: number;
  currentPCWP?: number;          // pulmonary capillary wedge pressure

  // Current vasopressors (Ce values)
  norepinephrineCe?: number;
  vasopressinCe?: number;
  epinephrineCe?: number;
  phenylephrineCe?: number;
  dobutamineCe?: number;
  milrinoneCe?: number;
  dopamineCe?: number;

  // Volume status
  volumeReplete?: boolean;       // adequate preload restored

  // Targets
  targetMAP?: number;            // mmHg (default 65-70)

  // Event guards
  prevShockLogged?: boolean;
  prevVasopressorLogged?: boolean;
}

export interface ShockVasopressorOutput {
  // Shock characterization
  shockType: string;
  hemodynamicPattern: string;    // description of pattern
  primaryTreatment: string;      // what to do first
  firstLineVasopressor: string;  // best choice
  secondLineVasopressor: string;
  vasopressorsToAvoid: string[];

  // Current vasopressor adequacy
  currentVasopressorEfficacy: number; // 0-1
  mapGoalMet: boolean;
  coGoalMet: boolean;

  // Vasopressor dose recommendations
  norepi_recommended: boolean;
  vasopressin_recommended: boolean;
  dobutamine_recommended: boolean;
  milrinone_recommended: boolean;

  prevShockLogged: boolean;
  prevVasopressorLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ShockVasopressorModel {
  static tick(inputs: ShockVasopressorInputs = {}): ShockVasopressorOutput {
    const events: string[] = [];
    let prevShockLogged = !!inputs.prevShockLogged;
    let prevVasopressorLogged = !!inputs.prevVasopressorLogged;

    const shockType = inputs.shockType || 'distributive';
    const currentMAP = clamp(safeNumber(inputs.currentMAP, 65), 20, 150);
    const currentCO = clamp(safeNumber(inputs.currentCO, 5), 0, 20);
    const currentSVR = clamp(safeNumber(inputs.currentSVR, 800), 100, 3000);
    const currentCVP = clamp(safeNumber(inputs.currentCVP, 8), 0, 30);
    const isRV = !!inputs.isRVFailure;
    const isPostCPB = !!inputs.isPostCPBVasoplegia;
    const isLF = !!inputs.isLiverFailure;
    const targetMAP = clamp(safeNumber(inputs.targetMAP, 65), 50, 100);
    const volumeReplete = inputs.volumeReplete !== false;

    const norepiCe = clamp(safeNumber(inputs.norepinephrineCe, 0), 0, 5);
    const vasopCe = clamp(safeNumber(inputs.vasopressinCe, 0), 0, 2);
    const epiCe = clamp(safeNumber(inputs.epinephrineCe, 0), 0, 5);
    const phenylCe = clamp(safeNumber(inputs.phenylephrineCe, 0), 0, 5);
    const dobutCe = clamp(safeNumber(inputs.dobutamineCe, 0), 0, 10);
    const milCe = clamp(safeNumber(inputs.milrinoneCe, 0), 0, 2);
    const dopCe = clamp(safeNumber(inputs.dopamineCe, 0), 0, 10);

    // ===========================
    // SHOCK CLASSIFICATION
    // ===========================
    let hemodynamicPattern: string;
    let primaryTreatment: string;
    let firstLineVasopressor: string;
    let secondLineVasopressor: string;
    let vasopressorsToAvoid: string[];
    let norepi_recommended = false;
    let vasopressin_recommended = false;
    let dobutamine_recommended = false;
    let milrinone_recommended = false;

    if (isPostCPB) {
      hemodynamicPattern = 'Post-CPB vasoplegia: ↓SVR (massive NO release from CPB), ↑CO, ↓MAP';
      primaryTreatment = 'Vasopressin (most effective for CPB-induced vasoplegia) + Norepinephrine';
      firstLineVasopressor = 'Vasopressin 0.03-0.04 units/min';
      secondLineVasopressor = 'Norepinephrine 0.05-0.5 mcg/kg/min';
      vasopressorsToAvoid = ['Phenylephrine alone (inadequate for CPB vasoplegia)'];
      norepi_recommended = true;
      vasopressin_recommended = true;
    } else if (isLF) {
      hemodynamicPattern = 'Hepatic failure vasoplegia: ↓SVR, ↑CO, vasopressin deficiency';
      primaryTreatment = 'Vasopressin (liver failure = endogenous vasopressin deficiency) + Norepinephrine';
      firstLineVasopressor = 'Vasopressin 0.03-0.04 units/min';
      secondLineVasopressor = 'Norepinephrine';
      vasopressorsToAvoid = [];
      norepi_recommended = true;
      vasopressin_recommended = true;
    } else if (isRV) {
      hemodynamicPattern = 'RV failure: ↑CVP, ↓CO, ↑PVR, normal-low PCWP';
      primaryTreatment = 'Systemic vasopressor to maintain RV perfusion pressure (MAP - CVP) + ↓PVR';
      firstLineVasopressor = 'Vasopressin 0.03 units/min (less PVR increase than NE)';
      secondLineVasopressor = 'Norepinephrine';
      vasopressorsToAvoid = ['Phenylephrine (↑PVR via pure alpha)'];
      norepi_recommended = true;
      vasopressin_recommended = true;
      milrinone_recommended = true;
    } else {
      switch (shockType) {
        case 'distributive':
          hemodynamicPattern = 'Distributive: ↓SVR, ↑or normal CO, warm extremities, bounding pulse';
          primaryTreatment = 'Norepinephrine as first-line vasopressor (SOAP II trial evidence)';
          firstLineVasopressor = 'Norepinephrine 0.01-1.0 mcg/kg/min (titrate to MAP ≥ 65)';
          secondLineVasopressor = 'Vasopressin 0.03-0.04 units/min (add when NE > 0.25 mcg/kg/min)';
          vasopressorsToAvoid = ['Dopamine (less evidence, more arrhythmias than NE — SOAP II)'];
          norepi_recommended = true;
          vasopressin_recommended = norepiCe > 0.5;
          break;
        case 'cardiogenic':
          hemodynamicPattern = 'Cardiogenic: ↓CO, ↑SVR, ↑PCWP, cool extremities, narrow pulse pressure';
          primaryTreatment = 'Norepinephrine to maintain MAP + Inodilator (dobutamine/milrinone) to ↑CO';
          firstLineVasopressor = 'Norepinephrine (to maintain coronary perfusion) + Dobutamine 2-20 mcg/kg/min';
          secondLineVasopressor = 'Milrinone (inodilator, also ↓PVR)';
          vasopressorsToAvoid = ['Phenylephrine alone (↑afterload worsens CO)'];
          norepi_recommended = true;
          dobutamine_recommended = true;
          milrinone_recommended = currentCO < 3;
          break;
        case 'hypovolemic':
          hemodynamicPattern = 'Hypovolemic: ↓Preload, ↓CO, ↑SVR, cool skin, narrow pulse pressure';
          primaryTreatment = 'VOLUME REPLACEMENT (crystalloid, colloid, blood products) is primary treatment';
          firstLineVasopressor = 'Norepinephrine — bridge only until volume restored';
          secondLineVasopressor = 'Vasopressin';
          vasopressorsToAvoid = ['Vasopressors instead of volume (masks decompensation, worsens outcome)'];
          norepi_recommended = !volumeReplete; // only while getting volume
          break;
        default: // obstructive or mixed
          hemodynamicPattern = 'Obstructive: ↓CO despite normal/high CVP; treat underlying cause';
          primaryTreatment = 'Treat cause (drain tamponade, lyse PE, decompress pneumothorax)';
          firstLineVasopressor = 'Norepinephrine as bridge to definitive treatment';
          secondLineVasopressor = 'Vasopressin';
          vasopressorsToAvoid = [];
          norepi_recommended = true;
      }
    }

    // ===========================
    // EFFICACY ASSESSMENT
    // ===========================
    const totalVasopressorEffect = Math.min(1.0,
      norepiCe / (norepiCe + 0.2) * 0.6
      + vasopCe / (vasopCe + 0.05) * 0.4
      + epiCe / (epiCe + 0.3) * 0.5
      + phenylCe / (phenylCe + 0.2) * 0.4
      + dobutCe / (dobutCe + 3) * 0.3
    );

    const currentVasopressorEfficacy = totalVasopressorEffect;
    const mapGoalMet = currentMAP >= targetMAP;
    const coGoalMet = currentCO >= 4.0 || shockType === 'distributive';

    if (!prevShockLogged && currentMAP < targetMAP) {
      events.push(
        `🚨 SHOCK — ${shockType.toUpperCase()}: MAP ${currentMAP.toFixed(0)} mmHg < target ${targetMAP.toFixed(0)} mmHg. CO: ${currentCO.toFixed(1)} L/min, SVR: ${currentSVR.toFixed(0)} dyn·s/cm⁵. Pattern: ${hemodynamicPattern}. TREATMENT: ${primaryTreatment}. FIRST-LINE: ${firstLineVasopressor}. SECOND-LINE: ${secondLineVasopressor}.${vasopressorsToAvoid.length > 0 ? ` AVOID: ${vasopressorsToAvoid.join(', ')}.` : ''}`,
      );
      prevShockLogged = true;
    }
    if (currentMAP >= targetMAP - 5) prevShockLogged = false;

    if (dopCe > 0 && !prevVasopressorLogged) {
      events.push(
        `⚠️ DOPAMINE USE: Dopamine is associated with HIGHER ARRHYTHMIA RATE and higher mortality vs norepinephrine in distributive shock (SOAP II, De Backer 2010, NEJM). Switch to NOREPINEPHRINE as first-line vasopressor in all shock types except complete heart block (where dopamine's chronotropic effect is desired). Reserve dopamine for bradycardia-associated hypotension.`,
      );
      prevVasopressorLogged = true;
    }

    return {
      shockType,
      hemodynamicPattern,
      primaryTreatment,
      firstLineVasopressor,
      secondLineVasopressor,
      vasopressorsToAvoid,
      currentVasopressorEfficacy: parseFloat(currentVasopressorEfficacy.toFixed(4)),
      mapGoalMet,
      coGoalMet,
      norepi_recommended,
      vasopressin_recommended,
      dobutamine_recommended,
      milrinone_recommended,
      prevShockLogged,
      prevVasopressorLogged,
      events,
    };
  }
}
