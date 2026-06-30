/**
 * Musculoskeletal Model: Rhabdomyolysis, Positioning Nerve Injury Risk, Compartment Syndrome
 *
 * Phase 4 (musculoskeletal bucket) of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * Deliberately scoped to the three most clinically relevant perioperative musculoskeletal
 * mechanisms for an anesthesia simulator -- those an anesthesiologist can directly cause,
 * prevent, or detect:
 *
 * 1. **Rhabdomyolysis**: muscle fiber breakdown releasing myoglobin and creatine kinase into
 *    the bloodstream. Myoglobin precipitates in renal tubules, worsening AKI risk (already
 *    tracked in `RenalEngine.ts` via the `hasRhabdomyolysis` flag -- this model populates
 *    the underlying CK/myoglobin state that DRIVES that flag, rather than just being a
 *    boolean). Real intraoperative causes modeled: malignant hyperthermia (the most dramatic
 *    and immediate, can reach CK > 100,000 U/L), succinylcholine-triggered crises in
 *    myopathic patients (moderate CK rise, real mechanism underlying the existing
 *    Succinylcholine-in-MD `QualityEvent`), and tourniquet ischemia + reperfusion (local
 *    muscle ischemia during inflation, large CK spike on deflation from reperfusion injury).
 * 2. **Positioning-related peripheral nerve injury risk**: accumulates over time based on
 *    current position, padding adequacy, and duration -- the principal factors determining
 *    intraoperative nerve injury risk per ASRA/ASA positioning guidelines. Positions modeled
 *    as high-risk include lithotomy (peroneal nerve compression at the fibular head, common
 *    peroneal palsy), lateral decubitus (brachial plexus stretch, axillary compression),
 *    and beach chair (brachial plexus stretch, ulnar neuropathy). Adequate padding
 *    dramatically reduces but does not eliminate the risk.
 * 3. **Compartment syndrome risk**: specifically lithotomy position with prolonged duration
 *    (the classic teaching point -- well-leg compartment syndrome is a recognized, serious,
 *    litigated complication of prolonged lithotomy), scaling with time in the position and
 *    separate from the nerve injury index above.
 *
 * Source: general anesthesia physiology/surgery (rhabdomyolysis CK kinetics, positioning
 * injury risk, compartment syndrome duration thresholds) -- not a specific Miller's citation;
 * disclosed per this project's standing convention. All calibration constants are disclosed,
 * reasoned estimates referenced against real teaching-point magnitudes.
 */

export interface MusculoskeletalInputs {
  prevCkLevelUPerL?: number; // creatine kinase U/L, normal ~200
  prevMyoglobinUgL?: number; // myoglobin μg/L, normal ~30
  prevNerveInjuryRiskIndex?: number; // 0-1
  prevCompartmentSyndromeRisk?: number; // 0-1
  prevRhabdomyolysisLogged?: boolean;
  prevMyoglobinuriaLogged?: boolean;
  prevCompartmentSyndromeLogged?: boolean;

  mhActive?: boolean;
  succinylcholineMyopathyRhabdo?: boolean; // concurrent sux + myopathy crisis (set by existing sux-in-MD QualityEvent flow)
  tourniquetActive?: boolean;
  tourniquetInflatedTimeSeconds?: number; // cumulative time inflated this case
  isReperfusion?: boolean; // tourniquet just deflated (peak CK release moment)

  position?: string;
  positionDurationSeconds?: number;
  paddingAdequate?: boolean;

  dt?: number; // seconds
}

export interface MusculoskeletalOutput {
  ckLevelUPerL: number;
  myoglobinUgL: number;
  nerveInjuryRiskIndex: number; // 0-1
  compartmentSyndromeRisk: number; // 0-1
  rhabdomyolysisActive: boolean;
  myoglobinuriaRisk: boolean; // myoglobin > 1000 μg/L = tubular precipitation risk threshold
  hasRhabdomyolysis: boolean; // for RenalEngine.ts's existing inputs.hasRhabdomyolysis flag
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Positions with meaningful cumulative nerve injury risk and their risk intensity (0-1).
const POSITION_NERVE_RISK: Record<string, number> = {
  'Lithotomy': 0.9,   // peroneal nerve at fibular head (most cited in litigation)
  'Beach Chair': 0.7, // brachial plexus stretch, ulnar nerve at elbow
  'Lateral': 0.6,     // axillary compression, brachial plexus stretch on the down side
  'Prone': 0.4,       // eye/retinal ischemia, ulnar nerve, breast/groin vasculature
  'Supine': 0.2,      // ulnar nerve at elbow, occiput pressure with prolonged cases
};

const NERVE_INJURY_RISK_HOUR_TO_REACH_THRESHOLD = 4; // hours of max-risk positioning without padding to reach risk=1.0

export class MusculoskeletalModel {
  static tick(inputs: MusculoskeletalInputs = {}): MusculoskeletalOutput {
    const events: string[] = [];
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));

    const prevCk = clamp(safeNumber(inputs.prevCkLevelUPerL, 200), 0, 1_000_000);
    const prevMyoglobin = clamp(safeNumber(inputs.prevMyoglobinUgL, 30), 0, 100_000);
    let prevNerveRisk = clamp(safeNumber(inputs.prevNerveInjuryRiskIndex, 0), 0, 1);
    let prevCompartmentRisk = clamp(safeNumber(inputs.prevCompartmentSyndromeRisk, 0), 0, 1);
    let rhabdomyolysisLogged = !!inputs.prevRhabdomyolysisLogged;
    let myoglobinuriaLogged = !!inputs.prevMyoglobinuriaLogged;
    let compartmentSyndromeLogged = !!inputs.prevCompartmentSyndromeLogged;

    const mhActive = !!inputs.mhActive;
    const succinylcholineMyopathyRhabdo = !!inputs.succinylcholineMyopathyRhabdo;
    const tourniquetActive = !!inputs.tourniquetActive;
    const tourniquetInflatedTimeSeconds = Math.max(0, safeNumber(inputs.tourniquetInflatedTimeSeconds, 0));
    const isReperfusion = !!inputs.isReperfusion;
    const position = typeof inputs.position === 'string' ? inputs.position : 'Supine';
    const positionDurationSeconds = Math.max(0, safeNumber(inputs.positionDurationSeconds, 0));
    const paddingAdequate = inputs.paddingAdequate !== false; // default true

    // --- Creatine Kinase (CK) ---
    // Normal ~200 U/L; rhabdomyolysis threshold traditionally ~1000 U/L (5x ULN) but
    // clinical significance in anesthesia typically cited at >5000 U/L for myoglobin-mediated
    // AKI risk. MH is the most rapid and severe cause, capable of reaching 100,000+ U/L.
    let ckRiseRatePerSec = 0;
    if (mhActive) {
      ckRiseRatePerSec = 50;
    } else if (succinylcholineMyopathyRhabdo) {
      ckRiseRatePerSec = 5;
    }
    if (tourniquetActive && tourniquetInflatedTimeSeconds > 1800) {
      ckRiseRatePerSec += 0.3;
    }
    if (isReperfusion) {
      ckRiseRatePerSec += 80;
    }

    const ckDecayRatePerSec = Math.max(0, (prevCk - 200) * Math.log(2) / (3 * 24 * 3600));
    let ckLevelUPerL = prevCk + (ckRiseRatePerSec - ckDecayRatePerSec) * dt;
    ckLevelUPerL = clamp(ckLevelUPerL, 0, 1_000_000);

    // Myoglobin: released proportionally to CK rise (smaller molecule, faster release than
    // CK -- reaches bloodstream sooner). Cleared renally with a half-life of ~1-2h.
    const myoglobinRiseRate = ckRiseRatePerSec * 2;
    const myoglobinDecayRate = Math.max(0, (prevMyoglobin - 30) * Math.log(2) / (1.5 * 3600));
    let myoglobinUgL = prevMyoglobin + (myoglobinRiseRate - myoglobinDecayRate) * dt;
    myoglobinUgL = clamp(myoglobinUgL, 0, 100_000);

    const rhabdomyolysisActive = ckLevelUPerL > 5000;
    const myoglobinuriaRisk = myoglobinUgL > 1000;
    const hasRhabdomyolysis = rhabdomyolysisActive;

    if (rhabdomyolysisActive && !rhabdomyolysisLogged) {
      events.push("🚨 CRITICAL ALERT: Rhabdomyolysis -- serum CK has exceeded 5000 U/L! Aggressive IV fluid resuscitation is indicated to protect renal tubules from myoglobin precipitation.");
      rhabdomyolysisLogged = true;
    } else if (!rhabdomyolysisActive && rhabdomyolysisLogged) {
      rhabdomyolysisLogged = false;
    }

    if (myoglobinuriaRisk && !myoglobinuriaLogged) {
      events.push("⚠️ CLINICAL ALERT: Myoglobin > 1000 μg/L -- risk of myoglobinuric AKI. Target urine output > 1 mL/kg/hr and consider urinary alkalinization.");
      myoglobinuriaLogged = true;
    } else if (!myoglobinuriaRisk && myoglobinuriaLogged) {
      myoglobinuriaLogged = false;
    }

    // --- Nerve injury risk ---
    const positionRiskIntensity = POSITION_NERVE_RISK[position] ?? 0.2;
    const paddingMultiplier = paddingAdequate ? 0.2 : 1.0;
    const nerveRiskRatePerSec = positionRiskIntensity * paddingMultiplier / (NERVE_INJURY_RISK_HOUR_TO_REACH_THRESHOLD * 3600);
    const nerveInjuryRiskIndex = clamp(prevNerveRisk + nerveRiskRatePerSec * dt, 0, 1);

    // --- Compartment syndrome risk (lithotomy-specific) ---
    // Classic teaching: risk increases meaningfully after ~2h in lithotomy, becomes significant
    // by ~3-4h, and is well-documented in cases lasting >4h; well-leg compartment syndrome
    // is one of the few truly catastrophic, largely preventable anesthesia complications.
    let compartmentSyndromeRisk = prevCompartmentRisk;
    if (position === 'Lithotomy') {
      const riskOnsetSeconds = 2 * 3600;
      const riskPeakSeconds = 5 * 3600;
      if (positionDurationSeconds > riskOnsetSeconds) {
        compartmentSyndromeRisk = clamp((positionDurationSeconds - riskOnsetSeconds) / (riskPeakSeconds - riskOnsetSeconds), 0, 1);
      }
    } else {
      compartmentSyndromeRisk = Math.max(0, compartmentSyndromeRisk - 0.001 * dt);
    }

    if (compartmentSyndromeRisk > 0.5 && !compartmentSyndromeLogged) {
      events.push("⚠️ CLINICAL WARNING: Prolonged lithotomy position (>2 hours) -- well-leg compartment syndrome risk is elevated. Consider repositioning breaks, reducing leg elevation, and monitoring calf compartment pressures.");
      compartmentSyndromeLogged = true;
    } else if (compartmentSyndromeRisk > 0.85 && compartmentSyndromeLogged) {
      events.push("🚨 CRITICAL: Lithotomy duration has exceeded the high-risk threshold (>3-4 hours) for well-leg compartment syndrome. Immediate position assessment and compartment pressure measurement are indicated.");
      compartmentSyndromeLogged = true;
    } else if (compartmentSyndromeRisk <= 0.4 && compartmentSyndromeLogged) {
      compartmentSyndromeLogged = false;
    }

    return {
      ckLevelUPerL: parseFloat(ckLevelUPerL.toFixed(1)),
      myoglobinUgL: parseFloat(myoglobinUgL.toFixed(2)),
      nerveInjuryRiskIndex: parseFloat(nerveInjuryRiskIndex.toFixed(4)),
      compartmentSyndromeRisk: parseFloat(compartmentSyndromeRisk.toFixed(4)),
      rhabdomyolysisActive,
      myoglobinuriaRisk,
      hasRhabdomyolysis,
      events
    };
  }
}
