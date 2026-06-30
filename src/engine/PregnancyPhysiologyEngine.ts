/**
 * Pregnancy Physiology Engine: Real Cardiovascular/Respiratory/GI Changes of Pregnancy
 *
 * Phase 4 (genitourinary + reproductive system bucket) of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md, Stage A. Direct code audit
 * confirmed pregnancy was UI-only/inert before this: `patient.pregnancy`/beta-hCG lab flags
 * exist (PreOpEMR.jsx), and the existing "OB/GYN - Emergent C-Section" case preset
 * (CaseManager.jsx) describes a postpartum hemorrhage scenario, but NO engine anywhere read
 * a pregnancy flag to modify blood volume, cardiac output, SVR, HR, FRC, ventilatory drive,
 * or GI motility/LES tone. The only pre-existing pregnancy-aware code found was a single
 * PKPD plasma-cholinesterase-activity multiplier for Mivacurium metabolism -- confirmed
 * genuinely isolated, not part of a broader pregnancy physiology system.
 *
 * Real physiologic changes of pregnancy modeled here (general OB anesthesia teaching,
 * disclosed, not a specific Miller's citation), all ramping with gestational age rather than
 * appearing as a step function at conception -- most become clinically significant only in
 * the 2nd-3rd trimester:
 *
 * 1. **Blood volume expansion** (~45% by term -- plasma volume expands more than red cell
 *    mass, hence the relative "physiologic anemia of pregnancy"). Modeled as an additive mL
 *    contribution, fed into the SAME `positionPreloadMod` channel `usePhysiology.js` already
 *    uses for position-dependent preload changes (Trendelenburg/Sitting/etc.) -- this is
 *    genuinely the same kind of quantity (an mL-equivalent preload offset), not a new concept.
 * 2. **Decreased SVR** (~20% by term, progesterone-mediated vasodilation) and **increased HR
 *    baseline** (~+15 bpm by term) -- cardiac output rises ~40% by term primarily through
 *    these two changes plus the increased preload above, which is why this engine does NOT
 *    need its own direct CO multiplier: CO emerges from the existing chamber-mechanics model
 *    once preload/HR/SVR are corrected, exactly as it should.
 * 3. **Decreased FRC** (~20% by term -- the gravid uterus elevates the diaphragm) and
 *    **increased minute ventilation / VO2** (~20-50% by term, progesterone-driven) producing a
 *    chronic mild respiratory alkalosis (baseline PaCO2 ~30-32 mmHg instead of 40) -- together
 *    these are why pregnant patients desaturate dramatically faster during apnea/induction
 *    than non-pregnant patients of the same size, a major OB anesthesia teaching point that
 *    emerges here from the FRC/VO2 changes rather than needing its own bespoke mechanism.
 * 4. **Aortocaval compression / supine hypotensive syndrome**: after ~20 weeks, the gravid
 *    uterus can compress the IVC (reducing venous return) and aorta when supine, causing a
 *    sudden, severe preload drop -- relieved by left uterine displacement/lateral tilt. Gated
 *    on BOTH gestational age and actual supine positioning (not just being pregnant), since
 *    this is the one effect here that depends on what the patient is doing right now, not just
 *    how pregnant they are.
 * 5. **Decreased LES tone / delayed gastric emptying** (progesterone + mechanical
 *    displacement of the GE junction) -- becomes clinically significant after ~12-16 weeks,
 *    contributing to pregnancy's well-known "full stomach" aspiration-risk status. Feeds into
 *    `GastricEmptyingModel.ts`'s existing `persistentGastroparesis` OR-condition (alongside
 *    GLP-1/trauma/sepsis/emergent RSI) and a new LES-tone reduction term in
 *    `GastrointestinalEngine.ts`'s existing `lesTone` formula.
 *
 * All ramp magnitudes and the 12/20/40-week gating thresholds are disclosed, reasoned
 * estimates referenced against real teaching points (the magnitudes of each named change), not
 * directly sourced numeric data.
 */

export interface PregnancyPhysiologyInputs {
  isPregnant?: boolean;
  gestationalAgeWeeks?: number; // defaults to 38 (near-term) if isPregnant but unspecified
  position?: string;
  leftUterineDisplacement?: boolean; // wedge/manual displacement mitigating aortocaval compression
}

export interface PregnancyPhysiologyOutput {
  bloodVolumeExpansionMl: number; // additive, feeds the existing positionPreloadMod channel
  svrMultiplier: number; // multiplicative, 1.0 = no effect
  hrBaselineShift: number; // additive bpm, feeds the existing totalHrDelta accumulator
  frcMultiplier: number; // multiplicative, for calculateLungVolumes
  metabolicMultiplier: number; // multiplicative, feeds the existing totalMetabolicMultiplier chain
  baselinePaCO2Target: number; // mmHg, replaces the flat 40 baseline when pregnant
  aortocavalCompressionActive: boolean;
  aortocavalCompressionSeverity: number; // 0-1
  aortocavalCompressionPreloadPenaltyMl: number; // additive (subtract from preload), 0 when not active
  giMotilitySlowingActive: boolean; // for GastricEmptyingModel.ts's persistentGastroparesis OR-condition
  lesTonePenaltyFraction: number; // 0-0.3, subtracted from GastrointestinalEngine.ts's lesTone multiplier
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Flat, horizontal-on-back positions where the gravid uterus can compress the IVC/aorta.
// Trendelenburg/Reverse Trendelenburg/Sitting/Beach Chair/Prone/Lateral are NOT flat supine.
const SUPINE_LIKE_POSITIONS = new Set(['Supine', 'Lithotomy', 'Ramped', 'Sniffing']);

export class PregnancyPhysiologyEngine {
  /**
   * Pure function, deterministic, headless, stateless -- matches BrainstemEngine.ts/
   * CerebellarEngine.ts's shape. All outputs are direct functions of this tick's inputs.
   */
  static tick(inputs: PregnancyPhysiologyInputs = {}): PregnancyPhysiologyOutput {
    const isPregnant = !!inputs.isPregnant;

    if (!isPregnant) {
      return {
        bloodVolumeExpansionMl: 0,
        svrMultiplier: 1.0,
        hrBaselineShift: 0,
        frcMultiplier: 1.0,
        metabolicMultiplier: 1.0,
        baselinePaCO2Target: 40.0,
        aortocavalCompressionActive: false,
        aortocavalCompressionSeverity: 0,
        aortocavalCompressionPreloadPenaltyMl: 0,
        giMotilitySlowingActive: false,
        lesTonePenaltyFraction: 0
      };
    }

    const gestationalAgeWeeks = clamp(safeNumber(inputs.gestationalAgeWeeks, 38), 0, 42);
    const position = typeof inputs.position === 'string' ? inputs.position : 'Supine';
    const leftUterineDisplacement = !!inputs.leftUterineDisplacement;

    // Most systemic changes ramp from ~12 weeks (early 2nd trimester) to term (40 weeks).
    const gestationalFraction = clamp((gestationalAgeWeeks - 12) / (40 - 12), 0, 1);

    const bloodVolumeExpansionMl = 1800 * gestationalFraction;
    const svrMultiplier = 1.0 - 0.20 * gestationalFraction;
    const hrBaselineShift = 15 * gestationalFraction;
    const frcMultiplier = 1.0 - 0.20 * gestationalFraction;
    const metabolicMultiplier = 1.0 + 0.20 * gestationalFraction;
    const baselinePaCO2Target = 40.0 - 8.0 * gestationalFraction;

    // GI motility/LES tone changes become significant earlier (progesterone rises sharply in
    // the 1st trimester, well before the uterus is mechanically large) -- a separate, earlier
    // ramp than the mechanical/hemodynamic changes above.
    const giFraction = clamp((gestationalAgeWeeks - 8) / (40 - 8), 0, 1);
    const giMotilitySlowingActive = giFraction > 0.1;
    const lesTonePenaltyFraction = 0.3 * giFraction;

    // Aortocaval compression: requires both sufficient gestational age (uterus large enough to
    // reach the IVC/aorta, clinically significant after ~20 weeks) AND actual flat positioning
    // right now, not mitigated by left uterine displacement.
    const aortocavalFraction = clamp((gestationalAgeWeeks - 20) / (40 - 20), 0, 1);
    const isFlatPosition = SUPINE_LIKE_POSITIONS.has(position);
    const aortocavalCompressionActive = aortocavalFraction > 0 && isFlatPosition && !leftUterineDisplacement;
    const aortocavalCompressionSeverity = aortocavalCompressionActive ? aortocavalFraction : 0;
    // Up to ~700 mL effective preload loss at term in full supine, severe enough to meaningfully
    // drop cardiac output -- the real mechanism behind "supine hypotensive syndrome of pregnancy".
    const aortocavalCompressionPreloadPenaltyMl = 700 * aortocavalCompressionSeverity;

    return {
      bloodVolumeExpansionMl: parseFloat(bloodVolumeExpansionMl.toFixed(1)),
      svrMultiplier: parseFloat(svrMultiplier.toFixed(4)),
      hrBaselineShift: parseFloat(hrBaselineShift.toFixed(2)),
      frcMultiplier: parseFloat(frcMultiplier.toFixed(4)),
      metabolicMultiplier: parseFloat(metabolicMultiplier.toFixed(4)),
      baselinePaCO2Target: parseFloat(baselinePaCO2Target.toFixed(2)),
      aortocavalCompressionActive,
      aortocavalCompressionSeverity: parseFloat(aortocavalCompressionSeverity.toFixed(4)),
      aortocavalCompressionPreloadPenaltyMl: parseFloat(aortocavalCompressionPreloadPenaltyMl.toFixed(1)),
      giMotilitySlowingActive,
      lesTonePenaltyFraction: parseFloat(lesTonePenaltyFraction.toFixed(4))
    };
  }
}
