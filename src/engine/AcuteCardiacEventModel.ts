/**
 * Acute Cardiac Event Model
 *
 * Covers two distinct but clinically important acute cardiac syndromes not yet modeled:
 *
 * =========================================================================
 * A. CARDIAC TAMPONADE
 * =========================================================================
 * Accumulation of fluid in the pericardial space → compression of cardiac chambers →
 * impaired ventricular filling → reduced CO → cardiovascular collapse if untreated.
 *
 * CAUSES:
 * - Trauma (hemopericardium — most common in OR)
 * - Post-cardiac surgery (25-40% small effusions; clinically significant ~1%)
 * - Aortic dissection Type A (hemopericardium from aortic root)
 * - Malignancy (slowly progressive, often large effusion before tamponade)
 * - Uremia (dialysis patients)
 * - Iatrogenic: central line, pacemaker/ICD lead perforation, transcatheter procedures
 *
 * PATHOPHYSIOLOGY:
 * Normal pericardial pressure: -5 to -3 mmHg (slightly negative, like pleural).
 * Small acute effusion (~200 mL) can cause tamponade (pericardium cannot stretch quickly).
 * Large chronic effusion (>500 mL) may not cause tamponade (pericardium slowly stretches).
 *
 * As pericardial pressure rises toward RVEDP and LVEDP:
 * → Diastolic filling impaired (all 4 chambers compressed)
 * → Most severe in thin-walled chambers: RA (first) → RV → LV
 * → Ventricular interdependence: with each inspiration, RV expands at expense of LV
 *   → Pulsus paradoxus: SBP drops > 10 mmHg on inspiration (hallmark)
 *
 * BECK'S TRIAD (classic but insensitive: only 33% of cases have all 3):
 *   1. Hypotension (↓CO)
 *   2. Elevated JVP / Elevated CVP (↑pericardial pressure → ↑right-sided pressures)
 *   3. Muffled heart sounds (fluid-filled pericardium dampens sounds)
 *
 * HEMODYNAMIC PATTERN:
 * - Equalization of diastolic pressures (RA = RV diastolic = PA diastolic = PCWP)
 * - Low CO with compensatory tachycardia
 * - SVR increases (catecholamine surge to maintain MAP)
 * - CVP HIGH (not LOW) — distinguishes from hemorrhagic hypovolemia
 * - Pulsus paradoxus (> 10 mmHg SBP variation with respiratory cycle)
 *
 * ANESTHESIA IMPLICATIONS:
 * - GA is EXTREMELY dangerous: induction → vasodilation + loss of sympathetic tone
 *   → tamponade physiology acutely decompensates → cardiac arrest on induction
 * - Ketamine preferred induction agent (maintains catecholamine tone)
 * - Avoid positive pressure ventilation (increases intrathoracic pressure → worse filling)
 * - Use spontaneous ventilation until pericardiocentesis relieves tamponade
 * - Pericardiocentesis: subxiphoid approach (under echo guidance)
 *   Relief is often dramatic: even 10-20 mL removal dramatically improves CO
 *
 * =========================================================================
 * B. TAKOTSUBO (STRESS CARDIOMYOPATHY / APICAL BALLOONING SYNDROME)
 * =========================================================================
 * Transient LV dysfunction triggered by catecholamine surge:
 * - Intense emotional or physical stress
 * - Subarachnoid hemorrhage (neurogenic stunned myocardium)
 * - Pheochromocytoma
 * - MH crisis
 * - Major surgery
 *
 * MECHANISM:
 * Catecholamine excess (epinephrine, norepinephrine) → diffuse beta-1 stimulation →
 * myocardial contraction-band necrosis → transient dysfunction:
 * - Apical-dominant: classic Takotsubo. Apical hypokinesia/akinesia + basal hyperkinesia
 *   (explains the "octopus pot" shape on ventriculography: ballooned apex)
 * - Reverse Takotsubo: apical hyperkinesia + basal hypokinesia (less common)
 *
 * DIFFERENTIATING FROM STEMI:
 * - Both: ST elevation, troponin rise, wall motion abnormality
 * - Takotsubo: wall motion abnormality extends BEYOND single coronary territory
 * - Takotsubo: normal or non-obstructed coronary arteries (no plaque)
 * - Takotsubo: rapid recovery (days to weeks — unlike MI which scars permanently)
 * - Takotsubo predominantly in post-menopausal women (90% female, 80% >55y)
 *
 * MANAGEMENT:
 * Supportive: beta-blockers (reduce catecholamine effects), ACE inhibitors.
 * AVOID catecholamines if LV dysfunction: they may worsen the spasm.
 * For cardiogenic shock: IABP or Impella mechanical support (NOT catecholamines).
 *
 * Sources: Akashi YJ, Heart 2008; Mandel DL, JACC 2018;
 * Miller's 9th Ed Ch 40 (Non-Cardiac Surgery in Cardiac Disease).
 */

export interface AcuteCardiacInputs {
  // Cardiac Tamponade
  pericardialEffusionMl?: number;    // mL of fluid in pericardial space
  effusionAccumulationRateMlMin?: number; // rate of accumulation (acute trauma = fast)
  isChronicEffusion?: boolean;        // chronic = pericardium stretched → tolerates more
  pericardiocentesisDone?: boolean;   // relief procedure performed
  pericardiocentesisVolumeMl?: number; // how much removed

  // Takotsubo
  takotsuboActive?: boolean;
  catecholamineSurgeIndex?: number;   // 0-1 (from AdrenalEngine/PainEngine output)
  isFemalePostmenopausal?: boolean;   // highest risk demographic
  hasSAH?: boolean;                   // subarachnoid hemorrhage → neurogenic stunned myocardium
  minutesSinceTakotsuboOnset?: number;
  betaBlockerCe?: number;             // treatment

  // Current hemodynamics
  currentCO?: number;
  currentCVP?: number;
  currentMAP?: number;

  // Event guards
  prevTamponadeLogged?: boolean;
  prevTakotsuboLogged?: boolean;
}

export interface AcuteCardiacOutput {
  // Tamponade
  tamponadeActive: boolean;
  tamponadeSeverity: number;          // 0-1 (0=no tamponade, 1=impending cardiac arrest)
  pericardiaPressureMmHg: number;     // mmHg (normal 0-5)
  tamponadeHRContribution: number;    // compensatory tachycardia (bpm)
  tamponadeSVRContribution: number;   // compensatory vasoconstriction (fraction increase)
  tamponadeCOReduction: number;       // fraction CO reduced (0-0.8)
  tamponadeCVPContribution: number;   // mmHg added to CVP (high CVP is hallmark)
  pulsusParadoxusMmHg: number;       // SBP variation with inspiration (> 10 = tamponade)
  pericardiocentesisEfficacy: number; // 0-1 after drainage

  // Takotsubo
  takotsuboActive: boolean;
  takotsuboSeverity: number;          // 0-1
  takotsuboInotropyPenalty: number;   // 0-0.6 (LV dysfunction)
  takotsuboRecoveryFraction: number;  // 0-1 (spontaneous recovery over days)

  prevTamponadeLogged: boolean;
  prevTakotsuboLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AcuteCardiacEventModel {
  static tick(inputs: AcuteCardiacInputs = {}): AcuteCardiacOutput {
    const events: string[] = [];
    let prevTamponadeLogged = !!inputs.prevTamponadeLogged;
    let prevTakotsuboLogged = !!inputs.prevTakotsuboLogged;

    // ===========================
    // CARDIAC TAMPONADE
    // ===========================
    const effusionMl = clamp(safeNumber(inputs.pericardialEffusionMl, 0), 0, 2000);
    const accumulationRate = clamp(safeNumber(inputs.effusionAccumulationRateMlMin, 0), 0, 100);
    const isChronic = !!inputs.isChronicEffusion;
    const pericardiocentesisDone = !!inputs.pericardiocentesisDone;
    const pericardiocentesisVol = clamp(safeNumber(inputs.pericardiocentesisVolumeMl, 0), 0, effusionMl);

    // Effective effusion after any drainage
    const effectiveEffusionMl = Math.max(0, effusionMl - pericardiocentesisVol);

    // Tamponade threshold: acute ~200 mL; chronic ~500-1000 mL (pericardium stretches)
    const tamponadeThreshold = isChronic ? 600 : 200;

    // Severity rises steeply above threshold (J-shaped)
    const rawSeverity = effectiveEffusionMl > tamponadeThreshold
      ? clamp(Math.pow((effectiveEffusionMl - tamponadeThreshold) / 400, 0.7), 0, 1.0)
      : 0;

    // Fast accumulation worsens severity (less time for compensation)
    const acutenessFactor = Math.min(2.0, 1.0 + accumulationRate / 20);
    const tamponadeSeverity = clamp(rawSeverity * acutenessFactor, 0, 1.0);
    const tamponadeActive = tamponadeSeverity > 0.15;

    // Pericardial pressure model (normally 0-5 mmHg)
    const pericardiaPressureMmHg = clamp(tamponadeSeverity * 25, 0, 30);

    // Hemodynamic effects — Beck's triad + compensatory responses
    const tamponadeHRContribution = tamponadeActive ? clamp(tamponadeSeverity * 50, 0, 60) : 0; // compensatory tachycardia
    const tamponadeSVRContribution = tamponadeActive ? clamp(tamponadeSeverity * 0.50, 0, 0.60) : 0; // vasoconstriction
    const tamponadeCOReduction = tamponadeActive ? clamp(tamponadeSeverity * 0.75, 0, 0.80) : 0;
    const tamponadeCVPContribution = tamponadeActive ? clamp(tamponadeSeverity * 15, 0, 20) : 0; // HIGH CVP is hallmark

    // Pulsus paradoxus: SBP variation with respiration (> 10 mmHg = pathological)
    const pulsusParadoxusMmHg = tamponadeActive ? clamp(tamponadeSeverity * 30, 0, 40) : 2;

    const pericardiocentesisEfficacy = pericardiocentesisDone && pericardiocentesisVol > 0
      ? clamp(pericardiocentesisVol / Math.max(1, effectiveEffusionMl + pericardiocentesisVol) * 1.5, 0, 0.95)
      : 0;

    if (tamponadeActive && !prevTamponadeLogged) {
      const becksTrueCount = [
        pericardiaPressureMmHg > 10, // hypotension mechanism
        tamponadeCVPContribution > 8, // elevated CVP
        true // muffled sounds implied
      ].filter(Boolean).length;
      events.push(
        `🚨 CARDIAC TAMPONADE: Pericardial effusion ${effectiveEffusionMl.toFixed(0)} mL${isChronic ? ' (chronic)' : ' (acute)'}. Beck's Triad: ${becksTrueCount}/3 criteria met. Pulsus paradoxus ${pulsusParadoxusMmHg.toFixed(0)} mmHg (> 10 = pathological). CO reduced ${(tamponadeCOReduction * 100).toFixed(0)}%. CVP ELEVATED (${tamponadeCVPContribution.toFixed(0)} mmHg above baseline) — distinguishes from hemorrhagic hypovolemia where CVP is LOW. HEMODYNAMIC PATTERN: Low CO + High SVR + High CVP + Equalization of diastolic pressures. TREATMENT: PERICARDIOCENTESIS IMMEDIATELY. Subxiphoid approach under echo guidance; even 20-30 mL removed dramatically improves CO. ANESTHESIA: If GA required (e.g., traumatic arrest), use KETAMINE (maintains catecholamine tone); avoid propofol (vasodilates → acute decompensation). Maintain spontaneous ventilation until drainage complete.`,
      );
      prevTamponadeLogged = true;
    }
    if (!tamponadeActive) prevTamponadeLogged = false;

    // ===========================
    // TAKOTSUBO (STRESS CARDIOMYOPATHY)
    // ===========================
    const takotsuboActiveInput = !!inputs.takotsuboActive;
    const catecholamineIndex = clamp(safeNumber(inputs.catecholamineSurgeIndex, 0), 0, 1);
    const isFemalePostmenopausal = !!inputs.isFemalePostmenopausal;
    const hasSAH = !!inputs.hasSAH;
    const minutesSinceTakotsubo = clamp(safeNumber(inputs.minutesSinceTakotsuboOnset, 0), 0, 20000);
    const betaBlockerCe = clamp(safeNumber(inputs.betaBlockerCe, 0), 0, 10);

    // Takotsubo can be triggered by catecholamine surge, SAH, or major physiologic stress
    const takotsuboRisk = (catecholamineIndex > 0.7 || hasSAH) && (isFemalePostmenopausal ? 3 : 1) * 0.001;
    const takotsuboActive = takotsuboActiveInput || (catecholamineIndex > 0.8 && hasSAH);

    // Severity peaks at onset, recovers spontaneously over days-weeks
    const recoveryFraction = minutesSinceTakotsubo > 0
      ? Math.min(0.95, minutesSinceTakotsubo / (7 * 24 * 60)) // recover over ~7 days
      : 0;

    const rawTakotsuboSeverity = takotsuboActive
      ? clamp(1.0 - recoveryFraction, 0.05, 1.0)
      : 0;

    // Beta-blockers accelerate recovery and reduce severity
    const betaBlockerBenefit = betaBlockerCe > 0 ? clamp(betaBlockerCe / (betaBlockerCe + 0.5) * 0.5, 0, 0.5) : 0;
    const takotsuboSeverity = rawTakotsuboSeverity * (1 - betaBlockerBenefit);
    const takotsuboRecoveryFraction = recoveryFraction;

    // LV apical dysfunction → reduced effective inotropy
    const takotsuboInotropyPenalty = clamp(takotsuboSeverity * 0.55, 0, 0.60);

    if (takotsuboActive && takotsuboSeverity > 0.2 && !prevTakotsuboLogged) {
      events.push(
        `⚠️ TAKOTSUBO (STRESS CARDIOMYOPATHY): Catecholamine-mediated transient LV apical ballooning. Presenting like STEMI (ST elevation, troponin rise, new wall motion abnormality) but NORMAL CORONARY ARTERIES. 90% female, 80% post-menopausal. TRIGGERS: ${catecholamineIndex > 0.7 ? 'catecholamine surge' : ''}${hasSAH ? ' subarachnoid hemorrhage (neurogenic stunned myocardium)' : ''}. LV: apical hypokinesia/akinesia + basal hyperkinesia (apical ballooning → 'octopus pot' shape). DISTINGUISHING FROM STEMI: echo wall motion defect beyond single coronary territory. MANAGEMENT: Beta-blockers (atenolol, metoprolol — slow catecholamine effects); ACE inhibitors. AVOID catecholamines for shock support (worsen coronary vasospasm); use IABP or Impella if refractory. PROGNOSIS: usually FULLY REVERSIBLE over days to weeks — unlike STEMI.`,
      );
      prevTakotsuboLogged = true;
    }
    if (!takotsuboActive) prevTakotsuboLogged = false;

    return {
      tamponadeActive,
      tamponadeSeverity: parseFloat(tamponadeSeverity.toFixed(4)),
      pericardiaPressureMmHg: parseFloat(pericardiaPressureMmHg.toFixed(1)),
      tamponadeHRContribution: parseFloat(tamponadeHRContribution.toFixed(1)),
      tamponadeSVRContribution: parseFloat(tamponadeSVRContribution.toFixed(4)),
      tamponadeCOReduction: parseFloat(tamponadeCOReduction.toFixed(4)),
      tamponadeCVPContribution: parseFloat(tamponadeCVPContribution.toFixed(1)),
      pulsusParadoxusMmHg: parseFloat(pulsusParadoxusMmHg.toFixed(1)),
      pericardiocentesisEfficacy: parseFloat(pericardiocentesisEfficacy.toFixed(4)),
      takotsuboActive,
      takotsuboSeverity: parseFloat(takotsuboSeverity.toFixed(4)),
      takotsuboInotropyPenalty: parseFloat(takotsuboInotropyPenalty.toFixed(4)),
      takotsuboRecoveryFraction: parseFloat(takotsuboRecoveryFraction.toFixed(4)),
      prevTamponadeLogged,
      prevTakotsuboLogged,
      events,
    };
  }
}
