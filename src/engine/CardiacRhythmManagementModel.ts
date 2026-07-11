/**
 * Cardiac Rhythm Management Model
 *
 * Covers specific rhythm management scenarios not fully addressed elsewhere:
 *
 * A. COMPLETE HEART BLOCK / HIGH-DEGREE AV BLOCK
 * B. SICK SINUS SYNDROME
 * C. LONG QT SYNDROME (congenital)
 * D. BRUGADA SYNDROME
 * E. EXTERNAL PACING (transcutaneous/transvenous)
 * F. IMPLANTABLE CARDIAC DEVICES (ICD/PPM) in operating room
 *
 * =========================================================================
 * A. COMPLETE HEART BLOCK (Third-Degree AVB)
 * =========================================================================
 * P waves and QRS complexes completely dissociated.
 * Causes: inferior MI (usually AV node), anterior MI (His-Purkinje), drugs
 * (beta-blockers + CCBs, digoxin toxicity, amiodarone), Lyme disease.
 *
 * ANESTHESIA: Pacing required before elective GA.
 * HEMODYNAMICS: Junctional escape rhythm 20-40 bpm → usually symptomatic.
 * DRUGS: Isoproterenol (increases junctional rate); atropine (less effective below AV node).
 *
 * =========================================================================
 * B. SICK SINUS SYNDROME (SSS)
 * =========================================================================
 * SA node dysfunction → bradycardia, sinus pauses, brady-tachy syndrome.
 * BRADYCARDIA part: treat with chronotropic agents or pacing.
 * TACHYCARDIA part (AF/flutter): anticoagulation, rate control.
 * CAUTION: Drugs that slow SA node (beta-blockers, CCBs, digoxin) may worsen SSS
 *   → precipitate symptomatic bradycardia or pauses.
 *
 * =========================================================================
 * C. CONGENITAL LONG QT SYNDROME (LQTS)
 * =========================================================================
 * Genetic channelopathy → prolonged ventricular repolarization → TdP risk.
 * LQT1 (KCNQ1): adrenergic trigger (exercise, emotional stress)
 * LQT2 (HERG): sudden noise trigger (alarm, doorbell); hypokalemia worsens
 * LQT3 (SCN5A): more malignant; occurs during rest/sleep
 *
 * ANESTHESIA: Avoid all QT-prolonging drugs (already in DrugInteractionModel.ts).
 * KEY: Beta-blockers protect LQT1/2 (reduce sympathetic trigger).
 * REGIONAL preferred over GA in LQTS (avoids drug QT effects).
 * ICD placement common in symptomatic LQTS.
 *
 * =========================================================================
 * D. BRUGADA SYNDROME
 * =========================================================================
 * SCN5A mutation → right precordial ST elevation pattern + sudden cardiac arrest.
 * Trigger: fever (antipyretics mandatory), class I antiarrhythmics, sodium channel
 *   blockers (AVOID: propofol, bupivacaine at high doses, tricyclics, cocaine).
 * Treatment: ICD. Quinidine for electrical storm.
 * ANESTHESIA: Regional preferred; GA with sevoflurane/isoflurane (not propofol if Brugada).
 *
 * =========================================================================
 * E. TEMPORARY PACING (Transcutaneous / Transvenous)
 * =========================================================================
 * TRANSCUTANEOUS (TCP): Emergency bridge until transvenous placed.
 * - Energy: 50-200 mA, rate 60-100 bpm
 * - NOT comfortable (muscle stimulation) → sedation/analgesia needed
 * - Verify mechanical capture (pulse/SpO2 tracing) not just electrical capture
 *
 * TRANSVENOUS (TVP): More reliable; floating balloon catheter to RV apex.
 * - Rate 60-80 bpm (or just above intrinsic rate for demand mode)
 * - Sensitivity setting: too sensitive = can sense artifact → inhibit pacing
 * - Threshold test: lowest energy producing consistent capture
 *
 * =========================================================================
 * F. IMPLANTABLE DEVICES (PPM / ICD) IN OPERATING ROOM
 * =========================================================================
 * MONOPOLAR ELECTROCAUTERY: Creates electromagnetic interference (EMI) →
 * may inhibit demand pacing (device "thinks" EMI = intrinsic rhythm).
 * ALSO: ICD may inappropriately shock (misidentifies EMI as VF).
 *
 * PROTOCOL:
 * 1. Identify device type (PPM only? ICD? CRT?)
 * 2. If pacemaker-dependent: program to asynchronous mode (VOO/DOO) or
 *    apply magnet (most PPMs → asynchronous; ICDs → suspend tachyarrhythmia detection)
 * 3. Use BIPOLAR cautery when possible (much less EMI)
 * 4. Keep cautery bursts short (<1s), stay far from device
 * 5. Have external defibrillator immediately available for ICD patients
 * 6. Reprogram device back to original settings post-operatively
 *
 * Sources: Crossley GH, Heart Rhythm 2011 (HRS/ASA guidelines on cardiac devices in OR);
 * Priori SG, EP Europace 2015 (channelopathies); Miller's 9th Ed Ch 39.
 */

export interface CardiacRhythmInputs {
  // Rhythm disorder
  rhythmDisorder?: 'chb' | 'sss' | 'lqts' | 'brugada' | 'none';
  lqtsType?: 1 | 2 | 3;

  // CHB specific
  junctionalEscapeRateBpm?: number;   // in CHB
  isJunctionalEscape?: boolean;

  // Pacing
  transcutaneousPacingActive?: boolean;
  transvenousPacingActive?: boolean;
  pacingRateBpm?: number;
  pacingEnergyMA?: number;
  mechanicalCaptureVerified?: boolean;

  // Implanted device
  hasImplantedPPM?: boolean;
  hasImplantedICD?: boolean;
  isPacemakerDependent?: boolean;
  monopolarCautery?: boolean;         // EMI risk
  icdMagnetApplied?: boolean;         // suspends tachy detection

  // LQTS specific
  currentQTcMs?: number;
  isAdrenergeUTrigger?: boolean;       // exercise/noise/startle

  // Brugada specific
  currentTempBrugada?: number;
  propofol_brugadaCe?: number;         // may unmask Brugada pattern

  // Drug context
  betaBlockerCe?: number;              // protects LQT1/LQT2
  isoproterenolCe?: number;            // for CHB chronotropy
  atropineCe?: number;

  // Event guards
  prevCHBLogged?: boolean;
  prevICDInterferenceLogged?: boolean;
  prevBrugadaLogged?: boolean;
  prevLQTSLogged?: boolean;
}

export interface CardiacRhythmOutput {
  // Current rhythm status
  isPacerDependent: boolean;
  effectiveHRFromPacing: number;    // HR produced by pacing

  // CHB
  chbActive: boolean;
  junctionalRateBpm: number;
  isPacingMechanicallyCaptured: boolean;
  isoproterenolChronoEffect: number; // increased junctional rate

  // Device safety
  emdInterferenceRisk: number;       // 0-1 (electrocautery EMI risk)
  icdWillShockFromEMI: boolean;      // dangerous if monopolar without magnet

  // LQTS management
  lqtsBetaBlockerBenefit: boolean;   // beta-blockers protect LQT1/2
  lqtsTriggersPresent: boolean;

  // Brugada warning
  brugadaUnmasked: boolean;

  prevCHBLogged: boolean;
  prevICDInterferenceLogged: boolean;
  prevBrugadaLogged: boolean;
  prevLQTSLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class CardiacRhythmManagementModel {
  static tick(inputs: CardiacRhythmInputs = {}): CardiacRhythmOutput {
    const events: string[] = [];
    let prevCHBLogged = !!inputs.prevCHBLogged;
    let prevICDInterferenceLogged = !!inputs.prevICDInterferenceLogged;
    let prevBrugadaLogged = !!inputs.prevBrugadaLogged;
    let prevLQTSLogged = !!inputs.prevLQTSLogged;

    const rhythmDisorder = inputs.rhythmDisorder || 'none';
    const hasICD = !!inputs.hasImplantedICD;
    const hasPPM = !!inputs.hasImplantedPPM;
    const isPacerDependent = !!inputs.isPacemakerDependent;
    const monopolarCautery = !!inputs.monopolarCautery;
    const icdMagnet = !!inputs.icdMagnetApplied;
    const tcpActive = !!inputs.transcutaneousPacingActive;
    const tvpActive = !!inputs.transvenousPacingActive;
    const pacingRate = clamp(safeNumber(inputs.pacingRateBpm, 70), 30, 180);
    const mechanicalCapture = !!inputs.mechanicalCaptureVerified;
    const junctionalRate = clamp(safeNumber(inputs.junctionalEscapeRateBpm, 30), 15, 70);
    const betaBlockerCe = clamp(safeNumber(inputs.betaBlockerCe, 0), 0, 5);
    const isoproterenolCe = clamp(safeNumber(inputs.isoproterenolCe, 0), 0, 5);
    const lqtsType = inputs.lqtsType || 1;
    const currentQTc = clamp(safeNumber(inputs.currentQTcMs, 400), 300, 700);
    const currentTemp = clamp(safeNumber(inputs.currentTempBrugada, 37), 34, 42);
    const propofolBrugada = clamp(safeNumber(inputs.propofol_brugadaCe, 0), 0, 5);

    // ===========================
    // COMPLETE HEART BLOCK
    // ===========================
    const chbActive = rhythmDisorder === 'chb';
    const isPacingActive = tcpActive || tvpActive || hasPPM;
    const effectiveHRFromPacing = isPacingActive ? pacingRate : junctionalRate;
    const isPacingMechanicallyCaptured = isPacingActive && mechanicalCapture;

    // Isoproterenol increases junctional rate
    const isoproterenolChronoEffect = isoproterenolCe > 0
      ? clamp(isoproterenolCe * 10, 0, 40) : 0; // +40 bpm max

    if (chbActive && !isPacingActive && !prevCHBLogged) {
      events.push(
        `🚨 COMPLETE HEART BLOCK: Junctional escape rate ${junctionalRate.toFixed(0)} bpm. Hemodynamic compromise likely at this rate. IMMEDIATE ACTIONS: (1) TRANSCUTANEOUS PACING (TCP): Set rate 60-80 bpm, start at 50 mA, increase until MECHANICAL capture confirmed (check pulse/SpO2 — not just ECG; can have electrical without mechanical); (2) Sedate patient for TCP discomfort (midazolam + fentanyl); (3) TRANSVENOUS pacing for definitive management; (4) Isoproterenol 2-10 mcg/min ONLY as temporary bridge (may increase junctional rate). CAUTION: Atropine INEFFECTIVE below AV node (junctional and ventricular escapes don't respond to vagal blockade).`,
      );
      prevCHBLogged = true;
    }

    // ===========================
    // ICD / PPM EMI INTERFERENCE
    // ===========================
    const emdInterferenceRisk = monopolarCautery && (hasICD || hasPPM)
      ? (isPacerDependent ? 0.8 : 0.4) : 0;

    const icdWillShockFromEMI = hasICD && monopolarCautery && !icdMagnet;

    if (icdWillShockFromEMI && !prevICDInterferenceLogged) {
      events.push(
        `🚨 ICD + MONOPOLAR ELECTROCAUTERY — EMI RISK: ICD will sense monopolar electrocautery as VF/VT → INAPPROPRIATE SHOCK (up to 800V). IMMEDIATELY: (1) APPLY MAGNET to ICD → suspends tachyarrhythmia detection (does NOT affect pacing function); (2) Inform surgeon to use BIPOLAR cautery if pacemaker-dependent; (3) Have external AED/defibrillator at bedside; (4) Monitor rhythm continuously. POST-OP: Remove magnet and reprogram device to original settings before patient leaves OR.`,
      );
      prevICDInterferenceLogged = true;
    }

    // ===========================
    // LONG QT
    // ===========================
    const lqtsActive = rhythmDisorder === 'lqts';
    const lqtsBetaBlockerBenefit = lqtsActive && (lqtsType === 1 || lqtsType === 2) && betaBlockerCe > 0;
    const lqtsTriggersPresent = lqtsActive && (
      (lqtsType === 2 && !!inputs.isAdrenergeUTrigger)
      || currentQTc > 500
    );

    if (lqtsActive && currentQTc > 500 && !prevLQTSLogged) {
      events.push(
        `⚠️ CONGENITAL LONG QT SYNDROME (Type ${lqtsType}): QTc ${currentQTc.toFixed(0)} ms (CRITICAL > 500 ms = TdP risk). TYPE ${lqtsType} TRIGGER: ${lqtsType === 1 ? 'adrenergic (exercise/stress) → beta-blocker IS protective' : lqtsType === 2 ? 'sudden noise → beta-blocker helpful; replenish K⁺/Mg²⁺' : 'bradycardia/sleep → pacing may help; beta-blockers LESS effective in LQT3'}. ANESTHESIA: AVOID QT-prolonging drugs (ondansetron, droperidol, haloperidol, ciprofloxacin, methadone). REGIONAL preferred. CORRECT: K⁺ ≥ 4.0, Mg²⁺ ≥ 1.8 mEq/L. ICD if symptomatic (syncope/VF).`,
      );
      prevLQTSLogged = true;
    }

    // ===========================
    // BRUGADA
    // ===========================
    const brugadaActive = rhythmDisorder === 'brugada';
    const brugadaUnmasked = brugadaActive && (currentTemp > 38.5 || propofolBrugada > 1.0);

    if (brugadaActive && brugadaUnmasked && !prevBrugadaLogged) {
      const trigger = currentTemp > 38.5 ? `FEVER (temp ${currentTemp.toFixed(1)}°C)` : `PROPOFOL (Ce ${propofolBrugada.toFixed(1)})`;
      events.push(
        `⚠️ BRUGADA SYNDROME — UNMASKED: ${trigger} may unmask or worsen right precordial ST elevation → increased VF risk. IMMEDIATELY: ${currentTemp > 38.5 ? 'Treat fever aggressively (acetaminophen/ibuprofen IMMEDIATELY — do NOT wait)' : 'Consider switching from propofol to alternative induction agent (ketamine, etomidate)'}. DRUGS TO AVOID: propofol, class I antiarrhythmics (procainamide), sodium channel blockers, tricyclic antidepressants. PREFERRED ANESTHESIA: Regional >> sevoflurane/isoflurane GA >> propofol (AVOID in Brugada if possible). ICD is definitive treatment for Brugada with prior VF.`,
      );
      prevBrugadaLogged = true;
    }

    return {
      isPacerDependent,
      effectiveHRFromPacing,
      chbActive,
      junctionalRateBpm: junctionalRate,
      isPacingMechanicallyCaptured,
      isoproterenolChronoEffect: parseFloat(isoproterenolChronoEffect.toFixed(1)),
      emdInterferenceRisk: parseFloat(emdInterferenceRisk.toFixed(4)),
      icdWillShockFromEMI,
      lqtsBetaBlockerBenefit,
      lqtsTriggersPresent,
      brugadaUnmasked,
      prevCHBLogged,
      prevICDInterferenceLogged,
      prevBrugadaLogged,
      prevLQTSLogged,
      events,
    };
  }
}
