/**
 * Lymphatic System & Interstitial Fluid Balance Engine
 *
 * Phase 1, Stage B/C of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Models
 * capillary filtration (the Starling forces governing fluid exchange between plasma and
 * interstitium) and lymphatic return as a real, continuously-tracked compartment, rather
 * than `RenalEngine.ts`'s existing `hasFluidOverloadEdema` (a probabilistic clinical-event
 * flag for renal-failure-driven fluid retention specifically -- a complementary, coarser
 * mechanism this file doesn't replace or duplicate). Net fluid that leaves the vasculature
 * faster than lymphatics can return it accumulates as edema -- the real, clinically
 * important "third-spacing" phenomenon (e.g. sepsis/capillary-leak syndrome, burns,
 * prolonged surgery) that previously had no mechanism in this codebase at all.
 *
 * Starling equation: Jv = Kf * [(Pc - Pi) - sigma*(piPlasma - piInterstitial)]
 *   Pc: capillary hydrostatic pressure, approximated from CVP (most of the arterial-to-
 *       venous pressure drop happens across arterioles, so capillary pressure sits much
 *       closer to venous than arterial -- a standard simplification, disclosed, not a
 *       literal per-bed capillary pressure model).
 *   Pi: interstitial hydrostatic pressure, rises with interstitial volume via its own
 *       (very high, real-physiology-consistent) compliance.
 *   sigma: capillary reflection coefficient (~0.9 normal; falls with capillary leak --
 *          sepsis/burns/anaphylaxis/ARDS -- letting protein leak through too, which also
 *          raises interstitial oncotic pressure, collapsing the gradient that normally
 *          limits filtration -- the real reason capillary-leak states cause severe edema).
 *   piPlasma: plasma oncotic pressure, driven by albumin (same `25 * albumin/4.0` scaling
 *             convention RenalEngine.ts/HepaticEngine.ts already use for albumin-driven
 *             oncotic pressure, here at the systemic-capillary baseline of ~25 mmHg rather
 *             than the glomerular-specific figure RenalEngine.ts uses).
 *
 * Lymphatic return increases with interstitial pressure (the real flow-stimulating effect
 * of tissue pressure on lymphatic uptake) on top of a baseline active-pumping rate, up to
 * a finite maximum capacity -- lymphatics have a real "safety factor" (~10x normal flow)
 * before being overwhelmed; sustained filtration beyond that capacity is what allows edema
 * to accumulate progressively rather than reaching a new steady state.
 *
 * Source: general cardiovascular/lymphatic systems physiology (the Starling filtration
 * framework, lymphatic safety-factor concept) -- not a specific Miller's citation;
 * disclosed per this project's standing convention. Absolute calibration constants (`Kf`,
 * baseline lymphatic flow, interstitial compliance) found by direct numerical solving for
 * a balanced (near-zero net accumulation) baseline state, the same approach used
 * throughout this redesign.
 */

export interface LymphaticPatientState {
  interstitialVolumeMl?: number;
  albumin?: number; // g/dL, normal 4.0 (shared field, also read by HepaticEngine.ts/RenalEngine.ts)
  isSeptic?: boolean;
  capillaryLeakSeverity?: number; // 0-1 override; auto-derived from isSeptic if absent
  lymphaticObstructionSeverity?: number; // 0-1, e.g. post-lymphadenectomy/filariasis
}

export interface LymphaticVitalsState {
  cvp?: number;
}

export interface LymphaticOutput {
  interstitialVolumeMl: number;
  interstitialPressure: number; // mmHg
  netFiltrationRateMlPerMin: number; // signed; positive = fluid leaving the vasculature
  thirdSpacedVolumeMl: number; // cumulative excess above baseline -- subtract from circulating blood volume
  edemaSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const INTERSTITIAL_BASELINE_ML = 10000; // ~8-10 L in a 70 kg adult, general physiology estimate
const INTERSTITIAL_COMPLIANCE = 750; // mL/mmHg -- high compliance, edema accumulates before pressure rises much
const KF = 1.0; // mL/min/mmHg, solved so normal Starling forces balance at ~2 mL/min net filtration
const LYMPH_BASELINE_ML_PER_MIN = 3.0; // matches normal net filtration -- balanced at baseline
const LYMPH_PRESSURE_GAIN = 0.5; // mL/min per mmHg of interstitial pressure above baseline
const LYMPH_MAX_ML_PER_MIN = 20.0; // ~10x baseline -- the lymphatic system's real "safety factor"

export class LymphaticSystemModel {
  /**
   * Ticks the lymphatic/interstitial fluid balance forward by dt seconds. Pure function,
   * deterministic, headless -- matches this codebase's other pure sub-engines' shape.
   */
  static tick(
    dt: number = 1,
    st: { patient: LymphaticPatientState; vitals: LymphaticVitalsState; time: number }
  ): LymphaticOutput {
    const events: string[] = [];
    const safeSt = st || ({} as typeof st);
    const patient = safeSt.patient || {};
    const vitals = safeSt.vitals || {};
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;

    const cvp = Math.max(0, safeNumber(vitals.cvp, 5));
    const albumin = Math.max(0.5, safeNumber(patient.albumin, 4.0));
    const capillaryLeakSeverity = Math.max(
      0,
      Math.min(1, safeNumber(patient.capillaryLeakSeverity, patient.isSeptic ? 0.4 : 0))
    );
    const lymphaticObstructionSeverity = Math.max(0, Math.min(1, safeNumber(patient.lymphaticObstructionSeverity, 0)));

    const interstitialVolumeMl = Math.max(0, safeNumber(patient.interstitialVolumeMl, INTERSTITIAL_BASELINE_ML));
    const interstitialPressure = Math.max(-3, (interstitialVolumeMl - INTERSTITIAL_BASELINE_ML) / INTERSTITIAL_COMPLIANCE - 1);

    // Capillary hydrostatic pressure -- a standard simplification (most arterial-to-venous
    // pressure drop happens across arterioles, so capillary pressure sits much closer to
    // venous/CVP than to MAP).
    const pc = cvp + 15;

    // Capillary leak lowers the reflection coefficient (more protein crosses) AND raises
    // interstitial oncotic pressure (the leaked protein collects there), collapsing the
    // oncotic gradient that normally opposes filtration -- the real reason sepsis/burns/
    // ARDS cause especially severe edema, not just "more leak" alone.
    const sigma = Math.max(0.3, 0.9 - 0.5 * capillaryLeakSeverity);
    const piPlasma = 25.0 * (albumin / 4.0);
    const piInterstitial = 5.0 + 10.0 * capillaryLeakSeverity;

    const netFiltrationRateMlPerMin = KF * ((pc - interstitialPressure) - sigma * (piPlasma - piInterstitial));

    const lymphaticCapacity = LYMPH_MAX_ML_PER_MIN * (1 - lymphaticObstructionSeverity);
    const lymphaticReturnMlPerMin = Math.min(
      lymphaticCapacity,
      LYMPH_BASELINE_ML_PER_MIN * (1 - lymphaticObstructionSeverity) + LYMPH_PRESSURE_GAIN * Math.max(0, interstitialPressure)
    );

    const netRateMlPerSec = (netFiltrationRateMlPerMin - lymphaticReturnMlPerMin) / 60;
    const newInterstitialVolumeMl = Math.max(0, interstitialVolumeMl + netRateMlPerSec * safeDt);
    const thirdSpacedVolumeMl = Math.max(0, newInterstitialVolumeMl - INTERSTITIAL_BASELINE_ML);

    let edemaSeverity: LymphaticOutput['edemaSeverity'] = 'none';
    if (thirdSpacedVolumeMl > 4000) edemaSeverity = 'severe';
    else if (thirdSpacedVolumeMl > 2000) edemaSeverity = 'moderate';
    else if (thirdSpacedVolumeMl > 500) edemaSeverity = 'mild';

    if (edemaSeverity === 'severe' && !(patient as any).severeEdemaLogged) {
      events.push(
        `⚠️ ANASARCA: Cumulative third-spaced fluid has exceeded ${Math.round(thirdSpacedVolumeMl)} mL -- lymphatic drainage is overwhelmed relative to capillary filtration. Effective circulating volume is reduced despite total body fluid being elevated.`
      );
    }

    return {
      interstitialVolumeMl: newInterstitialVolumeMl,
      interstitialPressure,
      netFiltrationRateMlPerMin,
      thirdSpacedVolumeMl,
      edemaSeverity,
      events
    };
  }
}
