/**
 * Perioperative Anticoagulation Management Model
 *
 * Managing anticoagulants perioperatively requires balancing thrombotic risk (stopping
 * anticoagulants) against bleeding risk (continuing them). This is one of the most
 * common and consequential perioperative drug management decisions.
 *
 * =========================================================================
 * WARFARIN (Vitamin K Antagonist)
 * =========================================================================
 * Mechanism: inhibits Vitamin K epoxide reductase → ↓factors II, VII, IX, X, protein C/S.
 * Half-life: ~40 hours; effective anticoagulation lasts 3-5 days after stopping.
 * Monitoring: INR (target 2-3 for AF, 2.5-3.5 for mechanical valves).
 *
 * BRIDGING STRATEGIES:
 * HIGH thrombotic risk (mechanical mitral valve, AF + stroke < 3 months):
 *   Bridge with therapeutic-dose LMWH (enoxaparin 1 mg/kg BID or 1.5 mg/kg daily)
 *   Last dose: 24h before surgery; resume 24-48h after surgery.
 *
 * MODERATE/LOW risk (AF without high-risk factors):
 *   NO BRIDGING needed for most patients (BRIDGE trial, NEJM 2015)
 *   → stop warfarin 5 days preop, resume after surgery without bridging.
 *   BRIDGE trial showed bridging did NOT reduce thromboembolism but INCREASED bleeding.
 *
 * REVERSAL for urgent surgery:
 *   - Vitamin K 5-10 mg PO (12-24h to reverse) or IV (4-6h)
 *   - 4-factor PCC (Kcentra): immediate reversal, dose 25-50 units/kg
 *   - FFP: 2-4 units; takes longer; large volume
 *
 * =========================================================================
 * DIRECT ORAL ANTICOAGULANTS (DOACs)
 * =========================================================================
 * DABIGATRAN (Pradaxa): Direct thrombin inhibitor. Renally cleared (80%).
 *   Stop: 2 days preop for normal renal; 4 days for GFR 30-50; 5-7 days for <30.
 *   Reversal: Idarucizumab (Praxbind) 5g IV — immediate, complete reversal.
 *
 * RIVAROXABAN (Xarelto) / APIXABAN (Eliquis): Direct factor Xa inhibitors.
 *   Stop: 2-3 days preop (24-48h for minor; 48-72h for major surgery).
 *   Reversal: Andexanet alfa (Andexxa) — reverses Xa inhibitors.
 *   Alternative: 4-factor PCC 50 units/kg (less specific but available).
 *
 * EDOXABAN: Also direct Xa inhibitor; similar to rivaroxaban timing.
 *
 * UNIVERSAL DOAC RULE: "48h hold" for most patients with normal renal function.
 * CrCl < 50: extend hold to 3-4 days for dabigatran (renally cleared).
 *
 * =========================================================================
 * LOW MOLECULAR WEIGHT HEPARIN (LMWH)
 * =========================================================================
 * Mechanism: enhances antithrombin III → inhibits Xa (mainly) and IIa.
 * Monitoring: anti-Xa levels (peak 4h after dose).
 *
 * Prophylactic dose (enoxaparin 40mg daily): can proceed with surgery 12h after last dose.
 * Therapeutic dose (enoxaparin 1mg/kg BID): 24h hold before neuraxial.
 *
 * NEURAXIAL ANESTHESIA TIMING:
 * Critical intervals (ASRA guidelines):
 * - LMWH prophylactic: 12h before neuraxial; 2h after (NOT therapeutic)
 * - LMWH therapeutic: 24h before neuraxial
 * - Warfarin: INR ≤ 1.4 before epidural
 * - DOACs: depends on drug; typically 3-5 elimination half-lives
 *
 * =========================================================================
 * ANTIPLATELET AGENTS
 * =========================================================================
 * Aspirin: COX-1 inhibitor; irreversible; platelet lifespan 7-10 days.
 *   Continue for most cardiac surgery, vascular surgery, high cardiac risk.
 *   Hold 7-10 days for neuraxial, elective neurosurgery, ophthalmology.
 *
 * P2Y12 inhibitors (clopidogrel/ticagrelor/prasugrel):
 *   Hold 5-7 days (clopidogrel), 5 days (ticagrelor), 7 days (prasugrel).
 *   DUAL ANTIPLATELET: within 1 year of ACS or DES → very high thrombotic risk;
 *   defer elective surgery if possible; if urgent, hold only P2Y12 not aspirin.
 *
 * Sources: BRIDGE Trial, NEJM 2015; Douketis JD, NEJM 2015;
 * ASRA Guidelines 2018 (neuraxial anticoagulation); Miller's 9th Ed Ch 44.
 */

export interface AnticoagulationInputs {
  // Anticoagulant being managed
  anticoagulant?: 'warfarin' | 'dabigatran' | 'rivaroxaban' | 'apixaban' | 'lmwh_prophylactic' | 'lmwh_therapeutic' | 'aspirin' | 'p2y12' | 'dual_antiplatelet' | 'none';

  // Patient risk
  thromboticRisk?: 'low' | 'intermediate' | 'high'; // for bridging decision
  hasMechanicalValve?: boolean;     // highest thrombotic risk
  afibCHA2DS2VASc?: number;         // 0-9 (score for AF stroke risk)
  recentDVTPE?: boolean;            // VTE within 3 months
  recentStroke?: boolean;           // stroke within 3 months

  // Surgery characteristics
  bleedingRisk?: 'low' | 'moderate' | 'high';    // surgical bleeding risk
  isNeuraxialPlanned?: boolean;      // epidural/spinal (strict timing rules)
  urgency?: 'elective' | 'urgent' | 'emergent';

  // Current lab values
  currentINR?: number;
  currentAntiXa?: number;           // anti-Xa level for LMWH monitoring
  gfr?: number;                      // for DOAC dose adjustment

  // Days since last dose
  daysSinceLastDose?: number;

  // Reversal drugs available
  pccAvailable?: boolean;           // 4-factor PCC
  idarucizumabAvailable?: boolean;  // Praxbind
  andexanetAvailable?: boolean;     // Andexxa

  // Event guards
  prevAnticoagLogged?: boolean;
  prevNeuraxialLogged?: boolean;
}

export interface AnticoagulationOutput {
  // Management decision
  safeToHoldAnticoagulant: boolean;     // holding is appropriate
  bridgingRecommended: boolean;          // bridge with LMWH
  reversal_needed: boolean;              // emergent reversal needed
  neuraxial_safe: boolean;              // safe to proceed with neuraxial

  // Timing
  daysToHoldBeforeSurgery: number;
  hoursToResumeAfterSurgery: number;

  // INR readiness
  inrAcceptable: boolean;               // INR ≤ 1.4 for neuraxial
  inrForSurgery: boolean;               // INR ≤ 1.4-1.5 for most procedures

  // Reversal options
  reversalAgent: string;                // recommended reversal agent

  prevAnticoagLogged: boolean;
  prevNeuraxialLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export class AnticoagulationPerioperativeModel {
  static tick(inputs: AnticoagulationInputs = {}): AnticoagulationOutput {
    const events: string[] = [];
    let prevAnticoagLogged = !!inputs.prevAnticoagLogged;
    let prevNeuraxialLogged = !!inputs.prevNeuraxialLogged;

    const anticoag = inputs.anticoagulant || 'none';
    const thromboticRisk = inputs.thromboticRisk || 'low';
    const bleedingRisk = inputs.bleedingRisk || 'moderate';
    const urgency = inputs.urgency || 'elective';
    const isNeuraxial = !!inputs.isNeuraxialPlanned;
    const hasMV = !!inputs.hasMechanicalValve;
    const recentStroke = !!inputs.recentStroke;
    const recentVTE = !!inputs.recentDVTPE;
    const cha2ds2vasc = safeNumber(inputs.afibCHA2DS2VASc, 0);
    const currentINR = safeNumber(inputs.currentINR, 1.0);
    const gfr = safeNumber(inputs.gfr, 90);
    const daysSinceLast = safeNumber(inputs.daysSinceLastDose, 0);

    // Determine if high thrombotic risk (bridging indication)
    const highThrombotic = hasMV || recentStroke || recentVTE
      || (cha2ds2vasc >= 5) || thromboticRisk === 'high';

    // Hold duration by drug and renal function
    let daysToHold = 0;
    let hoursToResume = 48;
    let reversalAgent = 'None needed (allow natural clearance)';
    let bridgingRecommended = false;
    let reversal_needed = urgency === 'emergent';

    switch (anticoag) {
      case 'warfarin':
        daysToHold = 5;
        hoursToResume = bleedingRisk === 'high' ? 72 : 48;
        reversalAgent = urgency === 'emergent' ? '4-Factor PCC 25-50 units/kg IV (immediate) OR Vitamin K 5-10 mg IV (4-6h)' : 'Vitamin K 5-10 mg PO (12-24h reversal) for elective reversal';
        bridgingRecommended = highThrombotic && urgency === 'elective';
        break;
      case 'dabigatran':
        daysToHold = gfr >= 50 ? 2 : gfr >= 30 ? 4 : 5;
        hoursToResume = bleedingRisk === 'high' ? 72 : 48;
        reversalAgent = 'Idarucizumab (Praxbind) 5g IV — immediate complete reversal';
        break;
      case 'rivaroxaban':
      case 'apixaban':
        daysToHold = bleedingRisk === 'high' ? 3 : 2;
        hoursToResume = bleedingRisk === 'high' ? 72 : 48;
        reversalAgent = 'Andexanet alfa (if available) OR 4-Factor PCC 50 units/kg IV';
        break;
      case 'lmwh_prophylactic':
        daysToHold = 0; // hours-based
        hoursToResume = isNeuraxial ? 2 : 12;
        reversalAgent = 'Protamine sulfate (reverses ~60% of anti-Xa activity)';
        break;
      case 'lmwh_therapeutic':
        daysToHold = 1;
        hoursToResume = bleedingRisk === 'high' ? 48 : 24;
        reversalAgent = 'Protamine sulfate';
        break;
      case 'aspirin':
        daysToHold = isNeuraxial ? 7 : 0; // aspirin: continue for most cardiac/vascular
        hoursToResume = 24;
        reversalAgent = 'Platelet transfusion if emergency bleeding';
        break;
      case 'p2y12':
        daysToHold = anticoag === 'p2y12' ? 5 : 7; // ticagrelor 5d, prasugrel 7d
        hoursToResume = 24;
        reversalAgent = 'Platelet transfusion (no specific antidote)';
        break;
      case 'dual_antiplatelet':
        daysToHold = 5; // hold P2Y12 only; keep aspirin if cardiac
        hoursToResume = 24;
        bridgingRecommended = cha2ds2vasc >= 3 || hasMV;
        reversalAgent = 'Platelet transfusion';
        break;
      default:
        daysToHold = 0;
        hoursToResume = 0;
    }

    const safeToHoldAnticoagulant = daysSinceLast >= daysToHold;
    const inrAcceptable = currentINR <= 1.4;
    const inrForSurgery = currentINR <= 1.5;
    const neuraxial_safe = anticoag === 'none' || (safeToHoldAnticoagulant && inrAcceptable);

    if (!prevAnticoagLogged && anticoag !== 'none') {
      const bridgeNote = bridgingRecommended
        ? ` BRIDGING REQUIRED (high thrombotic risk: ${hasMV ? 'mechanical valve' : recentStroke ? 'recent stroke' : recentVTE ? 'recent VTE' : 'CHA₂DS₂-VASc ≥5'}): Therapeutic LMWH last dose 24h before surgery; resume 24-48h after hemostasis confirmed.`
        : ' NO BRIDGING needed (BRIDGE trial 2015: bridging does NOT reduce thromboembolism but increases bleeding in AF patients).';
      events.push(
        `📋 ANTICOAGULATION MANAGEMENT (${anticoag.toUpperCase()}): Hold ${daysToHold > 0 ? `${daysToHold} days` : 'per hours protocol'} before surgery.${bridgeNote} Resume ${hoursToResume}h post-surgery. ${reversal_needed ? `URGENT REVERSAL: ${reversalAgent}.` : ''} ${isNeuraxial ? 'NEURAXIAL TIMING: ensure adequate washout (see ASRA 2018 guidelines).' : ''}`,
      );
      prevAnticoagLogged = true;
    }

    if (isNeuraxial && !neuraxial_safe && !prevNeuraxialLogged) {
      events.push(
        `🚨 NEURAXIAL ANESTHESIA SAFETY: Cannot proceed with epidural/spinal while ${anticoag} is active (insufficient washout: ${daysSinceLast.toFixed(1)} days since last dose, need ${daysToHold}d minimum for neuraxial). Neuraxial anesthesia with active anticoagulation → epidural hematoma risk (1:3,000 with LMWH; higher with therapeutic dosing). HOLD and reschedule, OR convert to general anesthesia.`,
      );
      prevNeuraxialLogged = true;
    }

    return {
      safeToHoldAnticoagulant,
      bridgingRecommended,
      reversal_needed,
      neuraxial_safe,
      daysToHoldBeforeSurgery: daysToHold,
      hoursToResumeAfterSurgery: hoursToResume,
      inrAcceptable,
      inrForSurgery,
      reversalAgent,
      prevAnticoagLogged,
      prevNeuraxialLogged,
      events,
    };
  }
}
