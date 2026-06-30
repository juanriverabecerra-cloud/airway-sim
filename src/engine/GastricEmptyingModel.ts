/**
 * Gastric Emptying Model: Real Gastric Content Volume + pH, Replacing the Binary
 * `patient.stomach === 'empty' | 'full'` Flag as the Sole Aspiration-Risk Driver,
 * Now With Real Aspiration-Prophylaxis Pharmacology
 *
 * Phase 4, GI subdivision of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * Direct code search confirmed `patient.gastricVolume` existed as an orphaned field (read by
 * `ClinicalAiChat.js` but never assigned anywhere) and no gastric pH concept existed at all. This
 * model fills both, continuously, driven by NPO times (`patient.npoSolids`/`npoLiquids`, already
 * tracked for the PreOp aspiration-risk assessment), by conditions that persistently slow gastric
 * emptying throughout a case rather than just at induction (GLP-1 agonist therapy, trauma/sepsis-
 * driven ileus, emergent RSI, pregnancy's progesterone-mediated slowing -- PregnancyPhysiologyEngine.ts,
 * Phase 4), and now by four real aspiration-prophylaxis drugs newly added to
 * `Pharmacology.js`/`meds.config.ts`: Sodium Citrate, Famotidine, Pantoprazole, Metoclopramide.
 *
 * Deliberately does NOT touch `GastrointestinalEngine.ts`'s existing, unchanged, tested aspiration
 * TRIGGER logic (`patient.stomach === 'full' && gastricPressure > lesTone`) -- that stays keyed on
 * the binary scenario-level flag exactly as before, zero regression risk on that path. This model's
 * `aspirationSeverityIndex` only GRADES the severity of an aspiration event AFTER the existing
 * trigger fires, via the classic Mendelson's syndrome criteria (pH < 2.5 AND volume > ~0.4 mL/kg
 * predict severe chemical pneumonitis) -- weight-scaled here rather than a fixed 25 mL, since the
 * real modern refinement of the original 1946 Mendelson criteria is per-kg, not absolute.
 *
 * Real per-drug mechanisms modeled (Ch15/anesthesia pharmacology, general knowledge, disclosed):
 *
 * 1. **Sodium Citrate** (nonparticulate antacid): a direct chemical reaction with acid already
 *    present in the stomach -- modeled as an INSTANT additive pH bump (not a kinetic-target shift
 *    like the other three), since real antacid neutralization happens on contact within minutes,
 *    not as a slow re-equilibration. No effect on future secretion or on volume.
 * 2. **Famotidine** (H2 blocker): reversibly blocks histamine-driven acid secretion. Tracks Ce
 *    directly -- raises the fasting-equilibrium TARGET pH (less acidic floor) and modestly reduces
 *    the secretion-driven volume floor. Has no effect on acid already secreted before the drug took
 *    effect (only on what the stomach goes on to secrete).
 * 3. **Pantoprazole** (PPI): covalently and IRREVERSIBLY inhibits the H+/K+-ATPase proton pump.
 *    Real PPI pharmacodynamics are decoupled from plasma Ce, which clears in ~1-1.5h, because
 *    covalent pump inhibition persists until new pumps are synthesized (~24-48h) -- modeled with a
 *    SEPARATE slow on/off accumulator (`ppiSuppressionLevel`), not a direct Ce-tracking effect like
 *    Famotidine, so the simulator captures the real PK/PD dissociation rather than incorrectly
 *    tying acid suppression to a drug that has already cleared the plasma.
 * 4. **Metoclopramide** (prokinetic): speeds gastric emptying (enhanced antral contractions) --
 *    modeled as a direct multiplier on the emptying rate constant. Its lower esophageal sphincter
 *    tone effect is modeled separately, in `GastrointestinalEngine.ts`, where `lesTone` already
 *    exists and directly drives the aspiration trigger.
 *
 * Source: general gastroenterology/anesthesia pharmacology (gastric emptying kinetics, fasting
 * gastric pH, opioid/stress-induced delayed emptying, H2/PPI/antacid/prokinetic mechanisms,
 * Mendelson's criteria) -- not a specific Miller's citation; disclosed per this project's standing
 * convention. All calibration constants (rate constants, EC50s, magnitude caps) are disclosed,
 * reasoned estimates referenced against real onset/duration/potency teaching points, not directly
 * sourced numeric data.
 */

export interface GastricEmptyingInputs {
  prevVolume?: number; // mL, from patient.gastricVolume
  prevPH?: number; // from patient.gastricPH
  prevPpiSuppression?: number; // 0-1, from patient.ppiSuppressionLevel
  npoSolids?: number; // hours since last solid food
  npoLiquids?: number; // hours since last clear liquid
  stomachFull?: boolean; // explicit scenario-level override (patient.stomach === 'full')
  glp1Active?: boolean;
  trauma?: boolean;
  isSeptic?: boolean;
  emergentRSI?: boolean;
  pregnancyGiSlowing?: boolean; // PregnancyPhysiologyEngine.ts's giMotilitySlowingActive (Phase 4)
  opioidBlock?: number; // 0-1, reuses GastrointestinalEngine.ts's existing opioid-receptor gut block
  sympatheticDrive?: number; // C_cat, this codebase's existing 0-100ish endogenous catecholamine pool
  weightKg?: number; // for weight-scaled Mendelson volume threshold
  citrateCe?: number; // Sodium Citrate
  famotidineCe?: number;
  pantoprazoleCe?: number;
  metoclopramideCe?: number;
  dt?: number; // seconds
}

export interface GastricEmptyingOutput {
  gastricVolume: number; // mL
  gastricPH: number;
  ppiSuppressionLevel: number; // 0-1, carried forward across ticks (patient.ppiSuppressionLevel)
  aspirationSeverityIndex: number; // 0-1, Mendelson-criteria-graded
  gastricEmptyingRateMultiplier: number; // for GastrointestinalEngine.ts's use, if needed elsewhere
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class GastricEmptyingModel {
  static tick(inputs: GastricEmptyingInputs = {}): GastricEmptyingOutput {
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));
    const npoSolids = Math.max(0, safeNumber(inputs.npoSolids, 8));
    const npoLiquids = Math.max(0, safeNumber(inputs.npoLiquids, 4));
    const stomachFull = !!inputs.stomachFull;
    const persistentGastroparesis = !!inputs.glp1Active || !!inputs.trauma || !!inputs.isSeptic || !!inputs.emergentRSI || !!inputs.pregnancyGiSlowing;
    const opioidBlock = clamp(safeNumber(inputs.opioidBlock, 0), 0, 1);
    const sympatheticDrive = Math.max(0, safeNumber(inputs.sympatheticDrive, 0));
    const weightKg = Math.max(5, safeNumber(inputs.weightKg, 70));
    const citrateCe = Math.max(0, safeNumber(inputs.citrateCe, 0));
    const famotidineCe = Math.max(0, safeNumber(inputs.famotidineCe, 0));
    const pantoprazoleCe = Math.max(0, safeNumber(inputs.pantoprazoleCe, 0));
    const metoclopramideCe = Math.max(0, safeNumber(inputs.metoclopramideCe, 0));

    // --- Pantoprazole: irreversible proton-pump suppression, decoupled from plasma Ce. ---
    // Real PPIs covalently inhibit the pump; effect accumulates while drug is present (k_on) and
    // decays only as slowly as new pumps are synthesized (k_off, ~33h functional half-life --
    // matches the real ~24-48h clinical duration of acid suppression long after plasma clearance).
    const ppiDriveEffect = pantoprazoleCe / (pantoprazoleCe + 1.0);
    const ppiOnRate = 0.0003; // per second
    const ppiOffRate = Math.log(2) / (33 * 3600); // per second
    const prevPpiSuppression = clamp(safeNumber(inputs.prevPpiSuppression, 0), 0, 1);
    let ppiSuppressionLevel = prevPpiSuppression + (ppiOnRate * ppiDriveEffect * (1 - prevPpiSuppression) - ppiOffRate * prevPpiSuppression) * dt;
    ppiSuppressionLevel = clamp(ppiSuppressionLevel, 0, 1);

    // --- Famotidine: reversible H2-receptor blockade of acid secretion, tracks Ce directly. ---
    const h2Effect = famotidineCe / (famotidineCe + 0.3);

    // Secretion suppression reduces both the fasting-equilibrium volume floor and (further below)
    // raises the equilibrium pH target. PPI is the more potent of the two at saturation; combined
    // via max (not additive), matching the real teaching that both converge on the same final
    // proton-pump step, so stacking them gives little added benefit over the stronger agent alone.
    const secretionSuppression = Math.max(0.3 * h2Effect, 0.4 * ppiSuppressionLevel);

    // Fasting-equilibrium "floor" volume: basal gastric secretions (~20 mL) for a truly fasted
    // patient, raised for conditions that persistently slow/block emptying throughout the case,
    // reduced by H2/PPI secretion suppression.
    const baselineFloor = (20 + (persistentGastroparesis ? 60 : 0)) * (1 - secretionSuppression);

    // Initial (first-tick) content: the explicit scenario override (e.g. a trauma/obese case
    // preset) or NPO-deficit-derived -- shorter fasting intervals leave more residual volume,
    // referenced against the ASA 8h-solids/2h-liquids "low risk" thresholds (PreOpEMR.jsx's own
    // 6h/2h aspiration-risk classification uses the same reference points).
    const npoDeficitVolume = 200 * Math.max(0, (8 - npoSolids) / 8) + 100 * Math.max(0, (2 - npoLiquids) / 2);
    const initialVolume = stomachFull ? Math.max(150, baselineFloor + npoDeficitVolume) : baselineFloor + npoDeficitVolume;
    const prevVolume = typeof inputs.prevVolume === 'number' && Number.isFinite(inputs.prevVolume) ? inputs.prevVolume : initialVolume;

    // --- Metoclopramide: prokinetic, directly speeds the emptying rate constant. ---
    const prokineticBoost = metoclopramideCe / (metoclopramideCe + 0.5);
    const gastricEmptyingRateMultiplier = 1 + 1.0 * prokineticBoost; // up to 2x at saturation

    // Gastric emptying kinetics: first-order approach toward the floor. Baseline half-life ~90 min
    // (a coarse, disclosed perioperative-timescale estimate -- liquids empty faster than solids in
    // reality, not distinguished here). Opioids and sympathetic stress both slow gastric emptying;
    // metoclopramide speeds it.
    const baseRateConstant = Math.log(2) / (90 * 60); // per second
    const opioidSlowing = 1 - 0.7 * opioidBlock;
    const stressSlowing = 1 - Math.min(0.5, 0.005 * sympatheticDrive);
    const gastroparesisSlowing = persistentGastroparesis ? 0.4 : 1.0;
    const rateConstant = baseRateConstant * opioidSlowing * stressSlowing * gastroparesisSlowing * gastricEmptyingRateMultiplier;

    let gastricVolume = prevVolume + (baselineFloor - prevVolume) * Math.min(1, rateConstant * dt);
    gastricVolume = clamp(gastricVolume, 5, 500);

    // Gastric pH: fasting baseline is strongly acidic (~1.8); a recent meal transiently buffers it
    // toward neutral, re-acidifying over a similar timescale to emptying. H2/PPI secretion
    // suppression raises the EQUILIBRIUM target itself (less acid being made in the first place),
    // not just the transient post-meal value -- PPI's ceiling (~6.5) is higher than H2's (~4.5),
    // combined via max for the same reason as the volume-floor reduction above.
    const acidSuppressionPHBoost = Math.max(2.7 * h2Effect, 4.7 * ppiSuppressionLevel);
    const fastingTargetPH = 1.8 + acidSuppressionPHBoost;
    const initialPH = stomachFull ? 3.0 : fastingTargetPH + 2.5 * Math.max(0, (2 - npoSolids) / 2);
    const prevPH = typeof inputs.prevPH === 'number' && Number.isFinite(inputs.prevPH) ? inputs.prevPH : initialPH;
    const phRateConstant = Math.log(2) / (60 * 60);
    let gastricPH = prevPH + (fastingTargetPH - prevPH) * Math.min(1, phRateConstant * dt);

    // Sodium Citrate: a direct chemical neutralization on contact, not a kinetic re-equilibration --
    // applied as an instant additive bump on top of the kinetic value above, every tick the drug's
    // buffering capacity remains active.
    const citrateBump = 4.0 * (citrateCe / (citrateCe + 2.0));
    gastricPH = clamp(gastricPH + citrateBump, 1.0, 7.5);

    // Mendelson's syndrome criteria: pH < 2.5 AND aspirate volume > ~0.4 mL/kg together predict
    // severe chemical pneumonitis (the modern, weight-scaled refinement of the original 1946
    // fixed-25-mL criterion) -- an AND, not an OR: without appreciable aspirate volume, acidity
    // alone has nothing to injure the lung with. Volume is therefore the primary gate; acidity
    // modulates how destructive the aspirated material is once there is enough of it. Grades
    // severity of an aspiration event already triggered elsewhere; does not itself decide whether
    // aspiration occurs.
    const volumeThreshold = 0.4 * weightKg;
    const volumeRampWidth = 1.5 * weightKg;
    const volumeFactor = clamp((gastricVolume - volumeThreshold) / volumeRampWidth, 0, 1);
    const phFactor = clamp((4.0 - gastricPH) / 1.5, 0, 1);
    const aspirationSeverityIndex = clamp(volumeFactor * (0.3 + 0.7 * phFactor), 0, 1);

    return {
      gastricVolume: parseFloat(gastricVolume.toFixed(2)),
      gastricPH: parseFloat(gastricPH.toFixed(3)),
      ppiSuppressionLevel: parseFloat(ppiSuppressionLevel.toFixed(4)),
      aspirationSeverityIndex: parseFloat(aspirationSeverityIndex.toFixed(4)),
      gastricEmptyingRateMultiplier: parseFloat(gastricEmptyingRateMultiplier.toFixed(4))
    };
  }
}
