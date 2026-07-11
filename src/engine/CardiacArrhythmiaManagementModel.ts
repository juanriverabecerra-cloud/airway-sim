/**
 * Cardiac Arrhythmia Management Model
 *
 * Specific arrhythmia types and their perioperative management protocols.
 * The EKG model and cardiovascular engine handle general HR/rhythm, but specific
 * arrhythmia recognition, management protocols, and drug-specific interactions
 * were not formalized. This model addresses:
 *
 * A) SVT (Supraventricular Tachycardia) — AVNRT, AVRT
 * B) Wolff-Parkinson-White (WPW) — life-threatening drug interactions
 * C) Ventricular Tachycardia / VF management (ACLS algorithm elements)
 * D) AF/Flutter rate vs rhythm control strategies
 *
 * =========================================================================
 * A. SVT (Supraventricular Tachycardia)
 * =========================================================================
 * Most common SVT: AVNRT (AV nodal reentrant tachycardia) — 60-70% of SVTs.
 * Rates typically 150-250 bpm. Mechanism: reentrant circuit within AV node.
 *
 * TREATMENT HIERARCHY:
 * 1. VAGAL MANEUVERS: Carotid sinus massage, Valsalva, cold water facial immersion
 *    Mechanism: increases vagal tone → slows AV node → breaks reentry
 *    Success rate: ~25% for traditional Valsalva; ~40-50% for REVERT technique
 *    (modified Valsalva with leg elevation)
 *
 * 2. ADENOSINE: 6 mg rapid IV push, then 12 mg if no response.
 *    Mechanism: A1 receptor activation → hyperpolarization of AV nodal cells
 *    → transient AV block → breaks reentrant circuit
 *    Success rate: ~90% termination rate for AVNRT/AVRT
 *    Duration: 10-30 seconds (extremely short t½ due to RBC uptake)
 *    Side effects: transient chest tightness/dyspnea, flushing, sinus pause
 *    CONTRAINDICATIONS: WPW with AF (can cause VF via rapid antegrade conduction),
 *    2nd/3rd degree AV block, sick sinus syndrome, severe bronchospasm (relative)
 *    CAUTION: Dipyridamole potentiates (blocks adenosine uptake) → reduce to 3 mg.
 *             Theophylline/caffeine antagonize (blockade A1 receptors) → may need more.
 *
 * 3. If adenosine fails: CCB (verapamil, diltiazem) or beta-blockers IV
 *    Synchronized cardioversion if hemodynamically unstable (50-100 J)
 *
 * =========================================================================
 * B. WOLFF-PARKINSON-WHITE (WPW)
 * =========================================================================
 * Accessory pathway (Bundle of Kent) bypasses AV node → pre-excitation (delta wave on ECG).
 *
 * THE LETHAL TRAP: If AF develops in WPW patient:
 *   - Accessory pathway conducts at MUCH faster rate than AV node (no decremental conduction)
 *   - AF conduction → accessory pathway → RVR up to 300+ bpm → VF
 *   - STANDARD AF DRUGS (digoxin, verapamil, diltiazem, adenosine) BLOCK THE AV NODE
 *     but DO NOT BLOCK the accessory pathway → FORCES all conduction through accessory
 *     pathway → LIFE-THREATENING VENTRICULAR FIBRILLATION
 *   - EXCEPTION: Amiodarone (blocks both) and IV procainamide are SAFE
 *
 * SAFE IN WPW + AF: IV procainamide, IV amiodarone, DC cardioversion
 * DANGEROUS IN WPW + AF: Digoxin, Verapamil, Diltiazem, Adenosine, Beta-blockers
 *
 * For regular SVT in WPW (orthodromic AVRT): Adenosine is safe (only retrograde
 * conduction, not antegrade; accessory pathway is concealed in orthodromic).
 *
 * =========================================================================
 * C. VENTRICULAR TACHYCARDIA (VT) / VF
 * =========================================================================
 * Sustained VT with pulse → hemodynamics permitting:
 *   - Amiodarone 150 mg IV over 10 min, then 1 mg/min × 6h (Class I)
 *   - Lidocaine 1.5 mg/kg IV (second line)
 *   - Magnesium for polymorphic VT/TdP
 * Pulseless VT/VF: ACLS (CPR + defibrillation + epinephrine + amiodarone)
 *
 * =========================================================================
 * D. AF RATE CONTROL vs RHYTHM CONTROL
 * =========================================================================
 * Rate control target: ventricular rate < 110 bpm (lenient) or < 80 bpm (strict).
 * Drugs: beta-blockers (first-line), CCBs (non-DHP: diltiazem, verapamil), digoxin.
 * NEVER digoxin alone: cannot control ventricular rate during exercise/stress.
 *
 * Rhythm control: pharmacologic or DC cardioversion.
 * CARDIOVERSION REQUIRES: rule out thrombus (if AF > 48h → TEE or 3 weeks anticoagulation).
 * Recent onset AF (< 48h): can cardiovert without prior anticoagulation.
 *
 * Sources: January CT, Circulation 2019 (AF guidelines); Brugada J, Heart 2019;
 * Miller's 9th Ed Ch 39 (Intraoperative Arrhythmias).
 */

export interface ArrhythmiaManagementInputs {
  // Current rhythm
  cardiacRhythm?: string;           // 'svt', 'wpw_af', 'vt', 'vf', 'afib', 'normal', etc.
  currentHR?: number;
  isHemodynamicallyUnstable?: boolean; // SBP < 90, altered consciousness, etc.

  // WPW
  hasWPW?: boolean;
  wpwHasAF?: boolean;               // AF in context of WPW = dangerous

  // SVT management
  vagalManeuverAttempted?: boolean;
  adenosineCe?: number;
  verapamilCe?: number;
  diltiazemCe?: number;
  dipyridamoleCe?: number;          // adenosine potentiator
  caffeinePresent?: boolean;        // adenosine antagonist

  // AF management
  afibRateControl?: boolean;        // goal is rate control
  metoproloLCeForAF?: number;
  diltiazem_afCe?: number;
  digoxinCeForAF?: number;

  // VT/VF
  amiodaroneCe?: number;
  lidocaineCe?: number;
  procainamideCe?: number;

  // Cardioversion
  synchronizedCardioversionDone?: boolean;
  cardioversionJoules?: number;

  // Event guards
  prevSVTLogged?: boolean;
  prevWPWLogged?: boolean;
  prevVTLogged?: boolean;
}

export interface ArrhythmiaManagementOutput {
  // SVT
  svtActive: boolean;
  adenosineEfficacy: number;        // 0-1 (predicted termination)
  expectedTermination: boolean;     // will this adenosine dose terminate SVT?
  adenosineDoseSufficient: boolean; // is current dose adequate (6 mg initial)?

  // WPW
  wpwDrugDangerActive: boolean;     // dangerous drug given in WPW+AF context
  wpwDangerousDrug: string;         // which drug is dangerous
  recommendedWPWDrug: string;       // safe alternative

  // Rate control efficacy
  afRateControlEfficacy: number;    // 0-1

  // VT efficacy
  vtConversionEfficacy: number;

  prevSVTLogged: boolean;
  prevWPWLogged: boolean;
  prevVTLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class CardiacArrhythmiaManagementModel {
  static tick(inputs: ArrhythmiaManagementInputs = {}): ArrhythmiaManagementOutput {
    const events: string[] = [];
    let prevSVTLogged = !!inputs.prevSVTLogged;
    let prevWPWLogged = !!inputs.prevWPWLogged;
    let prevVTLogged = !!inputs.prevVTLogged;

    const rhythm = (inputs.cardiacRhythm || 'normal').toLowerCase();
    const hr = clamp(safeNumber(inputs.currentHR, 80), 20, 320);
    const unstable = !!inputs.isHemodynamicallyUnstable;
    const hasWPW = !!inputs.hasWPW;
    const wpwHasAF = !!inputs.wpwHasAF;

    const adenosineCe = clamp(safeNumber(inputs.adenosineCe, 0), 0, 20);
    const verapamilCe = clamp(safeNumber(inputs.verapamilCe, 0), 0, 10);
    const diltiazemCe = clamp(safeNumber(inputs.diltiazemCe, 0), 0, 10);
    const dipyridamoleCe = clamp(safeNumber(inputs.dipyridamoleCe, 0), 0, 5);
    const caffeinePresent = !!inputs.caffeinePresent;
    const amiodaroneCe = clamp(safeNumber(inputs.amiodaroneCe, 0), 0, 10);
    const lidocaineCe = clamp(safeNumber(inputs.lidocaineCe, 0), 0, 5);
    const procainamideCe = clamp(safeNumber(inputs.procainamideCe, 0), 0, 5);
    const cardioversionDone = !!inputs.synchronizedCardioversionDone;

    // ===========================
    // SVT MANAGEMENT
    // ===========================
    const svtActive = rhythm.includes('svt') || (hr >= 150 && !rhythm.includes('vt') && !rhythm.includes('afib') && !rhythm.includes('flutter'));

    // Adenosine dose correction
    // - Dipyridamole potentiates: effective dose 2× higher (reduce by 50%)
    // - Caffeine/theophylline antagonize: may need more
    let effectiveAdenosineDose = adenosineCe;
    if (dipyridamoleCe > 0) effectiveAdenosineDose *= 2.0; // effectively doubled by potentiation
    if (caffeinePresent) effectiveAdenosineDose *= 0.6; // caffeine reduces efficacy

    // First 6 mg dose: good efficacy; 12 mg dose: excellent
    const adenosineEfficacy = effectiveAdenosineDose > 0
      ? clamp(effectiveAdenosineDose / 10 * 0.85, 0, 0.92) : 0;
    const expectedTermination = adenosineEfficacy > 0.7;
    const adenosineDoseSufficient = adenosineCe >= 6;

    if (svtActive && !prevSVTLogged) {
      const maneuversString = inputs.vagalManeuverAttempted ? 'Vagal maneuvers attempted. ' : 'Consider vagal maneuvers first (Valsalva REVERT technique 40% conversion). ';
      events.push(
        `⚠️ SVT MANAGEMENT: HR ${hr} bpm, narrow complex tachycardia. ${maneuversString}ADENOSINE: 6 mg IV RAPID PUSH (fastest peripheral IV, followed immediately by 20 mL NS flush — must reach central circulation rapidly to overcome short t½); repeat 12 mg × 2 if no response. Expected termination rate ~90% for AVNRT. WATCH FOR: transient asystole, chest tightness (normal), bronchospasm (relative CI in severe asthma). CARDIOVERSION if hemodynamically unstable: 50-100 J synchronized. ${hasWPW ? '⚠️ WPW PRESENT — see WPW warning below' : ''}`,
      );
      prevSVTLogged = true;
    }
    if (!svtActive) prevSVTLogged = false;

    // ===========================
    // WPW DANGEROUS DRUG DETECTION
    // ===========================
    const wpwDangerousDrugs = [];
    const isDangerousInWPWAF = hasWPW && wpwHasAF;

    if (isDangerousInWPWAF) {
      if (adenosineCe > 0) wpwDangerousDrugs.push('Adenosine');
      if (verapamilCe > 0) wpwDangerousDrugs.push('Verapamil');
      if (diltiazemCe > 0) wpwDangerousDrugs.push('Diltiazem');
      if (inputs.digoxinCeForAF && inputs.digoxinCeForAF > 0) wpwDangerousDrugs.push('Digoxin');
    }

    const wpwDrugDangerActive = isDangerousInWPWAF && wpwDangerousDrugs.length > 0;
    const wpwDangerousDrug = wpwDangerousDrugs.join(', ');
    const recommendedWPWDrug = amiodaroneCe > 0 ? 'Amiodarone (already active)' : procainamideCe > 0 ? 'Procainamide (already active)' : 'IV Procainamide 15 mg/kg over 30-60 min OR IV Amiodarone';

    if (wpwDrugDangerActive && !prevWPWLogged) {
      events.push(
        `🚨🚨 WPW + AF — LIFE-THREATENING DRUG ERROR: ${wpwDangerousDrug} administered to patient with Wolff-Parkinson-White syndrome and atrial fibrillation. These drugs BLOCK THE AV NODE but NOT the accessory pathway → all conduction forced through accessory pathway → RVR 300+ bpm → VENTRICULAR FIBRILLATION. STOP ${wpwDangerousDrug} IMMEDIATELY. SAFE ALTERNATIVES: IV PROCAINAMIDE (15 mg/kg over 30-60 min) or IV AMIODARONE — both block accessory pathway. SYNCHRONIZED CARDIOVERSION if hemodynamically unstable. NEVER give adenosine, verapamil, diltiazem, beta-blockers, or digoxin in WPW + AF.`,
      );
      prevWPWLogged = true;
    }
    if (!wpwDrugDangerActive) prevWPWLogged = false;

    // ===========================
    // VT CONVERSION EFFICACY
    // ===========================
    const vtActive = rhythm.includes('vt') || rhythm.includes('vf');
    const vtConversionEfficacy = vtActive
      ? clamp(
          amiodaroneCe / (amiodaroneCe + 0.5) * 0.70
          + lidocaineCe / (lidocaineCe + 1.0) * 0.40
          + (cardioversionDone ? 0.80 : 0),
          0, 0.95,
        )
      : 0;

    if (vtActive && !unstable && !prevVTLogged) {
      events.push(
        `⚠️ VENTRICULAR TACHYCARDIA (HR ${hr} bpm): If PULSELESS → ACLS (CPR + defib 200J + epi 1mg + amiodarone 300mg). If PULSE PRESENT and STABLE: Amiodarone 150 mg IV over 10 min (then 1 mg/min × 6h); or Lidocaine 1.5 mg/kg IV. For POLYMORPHIC VT/Torsades: MgSO4 2g IV over 2 min. For refractory: synchronized cardioversion 100-200 J. Investigate cause: ischemia (PMI model), electrolytes (K⁺, Mg²⁺), drug toxicity, structural heart disease.`,
      );
      prevVTLogged = true;
    }
    if (!vtActive) prevVTLogged = false;

    // ===========================
    // AF RATE CONTROL
    // ===========================
    const metCe = clamp(safeNumber(inputs.metoproloLCeForAF, 0), 0, 10);
    const dilAFCe = clamp(safeNumber(inputs.diltiazem_afCe, 0), 0, 10);
    const digAFCe = clamp(safeNumber(inputs.digoxinCeForAF, 0), 0, 10);

    const afRateControlEfficacy = clamp(
      metCe / (metCe + 0.5) * 0.6
      + dilAFCe / (dilAFCe + 0.5) * 0.5
      + digAFCe / (digAFCe + 2.0) * 0.3,
      0, 0.85,
    );

    return {
      svtActive,
      adenosineEfficacy: parseFloat(adenosineEfficacy.toFixed(4)),
      expectedTermination,
      adenosineDoseSufficient,
      wpwDrugDangerActive,
      wpwDangerousDrug,
      recommendedWPWDrug,
      afRateControlEfficacy: parseFloat(afRateControlEfficacy.toFixed(4)),
      vtConversionEfficacy: parseFloat(vtConversionEfficacy.toFixed(4)),
      prevSVTLogged,
      prevWPWLogged,
      prevVTLogged,
      events,
    };
  }
}
