/**
 * Uterine Tone Model: Real Postpartum Uterine Atony and Hemorrhage Mechanics
 *
 * Phase 4 (genitourinary/reproductive bucket), Stage C of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. The existing "OB/GYN - Emergent
 * C-Section (PPH)" case preset (CaseManager.jsx) narratively describes "severe postpartum
 * hemorrhage" but sets zero physiology behind it -- no uterine tone concept, no uterotonic
 * drugs, and (confirmed by direct audit) no continuous surgical/obstetric bleeding-rate
 * mechanism anywhere in this codebase at all; `patient.ebl` only ever increases via discrete,
 * one-off additions (e.g. the existing methoxyflurane-nephrotoxicity-driven dehydration term in
 * `usePhysiology.js`), never a continuous physiologic process. This model is the first
 * continuous bleeding-RATE mechanism in this codebase, following that same established
 * "add to `patient.ebl` each tick" pattern rather than inventing a new one.
 *
 * Real mechanism: after placental delivery, myometrial contraction compresses the spiral
 * arteries that previously fed the placenta -- this, not clotting, is what actually stops
 * postpartum bleeding. Uteroplacental blood flow at term is massive (several hundred mL/min);
 * an atonic (poorly contracted) uterus bleeds at a correspondingly massive rate, while a
 * well-contracted one reduces flow to a trickle. Risk factors for atony modeled here:
 * dose-dependent uterine relaxation by volatile anesthetics (a real, important teaching point --
 * avoid high-dose volatiles during Cesarean delivery for exactly this reason) and by magnesium
 * sulfate (a tocolytic side effect of the same drug given for preeclampsia/eclampsia seizure
 * prophylaxis -- already modeled elsewhere in this codebase via `Pharmacology.js`'s existing
 * Magnesium Sulfate entry, reused here rather than duplicated), prolonged labor, chorioamnionitis,
 * and retained placental tissue (a MECHANICAL cause that caps achievable tone regardless of
 * uterotonic therapy until physically resolved -- uterotonics alone cannot fully correct it).
 *
 * Four real uterotonic drugs (newly added to `Pharmacology.js`/`meds.config.ts`) restore tone:
 * Oxytocin (first-line), Methylergonovine (potent, but real-world CONTRAINDICATED in
 * hypertension/preeclampsia -- vasoconstriction risk), Carboprost (potent, CONTRAINDICATED in
 * asthma -- bronchospasm risk), Misoprostol (weaker/slower, no major contraindications).
 * Deliberately does NOT block or reduce a contraindicated drug's uterotonic effect -- in real
 * medicine "contraindicated" means dangerous, not ineffective; Methylergonovine still works as a
 * uterotonic in a preeclamptic patient, it just risks a hypertensive crisis via the SAME
 * vasoconstrictive pd profile already on its `Pharmacology.js` entry (feeding the existing
 * generic PKPD-driven CV effect). The contraindication itself is a vigilance/pharmacologic-choice
 * teaching moment, surfaced as a `QualityEvent` from `usePhysiology.js` (mirroring the existing
 * precedent for Succinylcholine in muscular dystrophy), not gated inside this pure-physics model.
 *
 * Source: general obstetric/anesthesia physiology (uterine atony mechanism, uterotonic
 * pharmacology, volatile/magnesium-induced uterine relaxation) -- not a specific Miller's
 * citation; disclosed per this project's standing convention. All calibration constants
 * (the bleeding-rate range, tone-recovery kinetics, relaxation/uterotonic magnitudes) are
 * disclosed, reasoned estimates referenced against real teaching-point magnitudes.
 */

export interface UterineToneInputs {
  deliveryOccurred?: boolean;
  prevUterineTone?: number;
  volatileMac?: number;
  magnesiumCe?: number;
  oxytocinCe?: number;
  methylergonovineCe?: number;
  carboprostCe?: number;
  misoprostolCe?: number;
  retainedPlacentaActive?: boolean;
  prolongedLaborRisk?: boolean;
  chorioamnionitisActive?: boolean;
  dt?: number; // seconds
}

export interface UterineToneOutput {
  uterineTone: number; // 0-1
  postpartumHemorrhageRateMlPerMin: number;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class UterineToneModel {
  static tick(inputs: UterineToneInputs = {}): UterineToneOutput {
    if (!inputs.deliveryOccurred) {
      // Atony/PPH mechanics are only meaningful after placental delivery.
      return { uterineTone: 1.0, postpartumHemorrhageRateMlPerMin: 0 };
    }

    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));
    const volatileMac = Math.max(0, safeNumber(inputs.volatileMac, 0));
    const magnesiumCe = Math.max(0, safeNumber(inputs.magnesiumCe, 0));
    const oxytocinCe = Math.max(0, safeNumber(inputs.oxytocinCe, 0));
    const methylergonovineCe = Math.max(0, safeNumber(inputs.methylergonovineCe, 0));
    const carboprostCe = Math.max(0, safeNumber(inputs.carboprostCe, 0));
    const misoprostolCe = Math.max(0, safeNumber(inputs.misoprostolCe, 0));
    const retainedPlacentaActive = !!inputs.retainedPlacentaActive;
    const prolongedLaborRisk = !!inputs.prolongedLaborRisk;
    const chorioamnionitisActive = !!inputs.chorioamnionitisActive;

    // Baseline immediate-postpartum tone: real physiologic contraction provides SOME protection,
    // but not full security -- the real reason prophylactic oxytocin is routine practice, not
    // reserved for high-risk patients only.
    const baselineTone = 0.6;

    const volatileRelaxation = 0.3 * Math.min(1, volatileMac / 1.5);
    const magnesiumRelaxation = 0.2 * (magnesiumCe / (magnesiumCe + 0.5));
    const prolongedLaborPenalty = prolongedLaborRisk ? 0.15 : 0;
    const chorioamnionitisPenalty = chorioamnionitisActive ? 0.15 : 0;

    const oxytocinEffect = 0.35 * (oxytocinCe / (oxytocinCe + 0.3));
    const methylergonovineEffect = 0.30 * (methylergonovineCe / (methylergonovineCe + 0.4));
    const carboprostEffect = 0.30 * (carboprostCe / (carboprostCe + 0.3));
    const misoprostolEffect = 0.15 * (misoprostolCe / (misoprostolCe + 0.5));
    // Combining multiple uterotonics for refractory atony is standard practice; the combined
    // benefit still has a real ceiling rather than summing without limit.
    const totalUterotonicBoost = Math.min(0.5, oxytocinEffect + methylergonovineEffect + carboprostEffect + misoprostolEffect);

    // Retained placental tissue is a MECHANICAL obstruction to contraction -- uterotonics alone
    // cannot fully correct it until the tissue is physically removed (manual extraction/D&C).
    const maxAchievableTone = retainedPlacentaActive ? 0.5 : 1.0;

    const targetTone = clamp(
      baselineTone - volatileRelaxation - magnesiumRelaxation - prolongedLaborPenalty - chorioamnionitisPenalty + totalUterotonicBoost,
      0,
      maxAchievableTone
    );

    const prevUterineTone = clamp(safeNumber(inputs.prevUterineTone, baselineTone), 0, 1);
    // Uterine smooth muscle responds within minutes -- fast kinetics relative to most of this
    // codebase's other compartments.
    const rateConstant = Math.log(2) / (3 * 60);
    const uterineTone = clamp(prevUterineTone + (targetTone - prevUterineTone) * Math.min(1, rateConstant * dt), 0, 1);

    // Postpartum hemorrhage rate: a well-contracted uterus reduces bleeding to a lochia-level
    // trickle; a fully atonic one bleeds at a substantial fraction of term uteroplacental flow.
    // Quadratic falloff with tone -- clinically, even partial tone recovery helps disproportionately.
    const minWellContractedRate = 2;
    const maxAtonicRate = 500;
    const postpartumHemorrhageRateMlPerMin = minWellContractedRate + (maxAtonicRate - minWellContractedRate) * Math.pow(1 - uterineTone, 2);

    return {
      uterineTone: parseFloat(uterineTone.toFixed(4)),
      postpartumHemorrhageRateMlPerMin: parseFloat(postpartumHemorrhageRateMlPerMin.toFixed(2))
    };
  }
}
