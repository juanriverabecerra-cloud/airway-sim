export interface GastrointestinalPatientState {
  stomach?: string; // 'empty' | 'full'
  airwaySecured?: boolean;
  isSeptic?: boolean;
  trauma?: boolean;
  suxInjectionTime?: number;
  hasAspirated?: boolean;
  aspirationEventSeverity?: number; // 0-1, Mendelson-criteria severity frozen at the moment of aspiration (Phase 4)
  manipulationIndex?: number; // 1.0 for open, 0.3 for laparoscopic, 0.0 for none
  epiduralBlockActive?: boolean;
  epiduralLevel?: number; // Thoracic dermatome of catheter insertion (e.g. 8 for T8)
  epiduralConcentrationIndex?: number; // 0-1+, 1.0 = surgical-strength (default); lower = motor-sparing differential block (Phase 3)
  celiacBlockActive?: boolean;
  swallowingActive?: boolean;
  npoSolids?: number; // hours since last solid food
  npoLiquids?: number; // hours since last clear liquid
  glp1Active?: boolean;
  emergentRSI?: boolean;
  gastricVolume?: number; // mL (Phase 4: GastricEmptyingModel)
  gastricPH?: number; // Phase 4: GastricEmptyingModel
  ppiSuppressionLevel?: number; // 0-1, irreversible PPI proton-pump suppression (Phase 4)
  weight?: number; // kg, for weight-scaled Mendelson aspiration criteria
}

export interface GastrointestinalVitalsState {
  lesTone?: number;
  gastricPressure?: number;
  bowelGasVolume?: number;
  gutMotility?: number;
  inflammatoryIleus?: number;
  postoperativeIleus?: number;
  stomachMotility?: number;
  smallBowelMotility?: number;
  colonicMotility?: number;
  stomachIleusDurationHours?: number;
  smallBowelIleusDurationHours?: number;
  colonicIleusDurationHours?: number;
}

export interface GastrointestinalOutput {
  lesTone: number;
  gastricPressure: number;
  bowelGasVolume: number;
  gutMotility: number;
  inflammatoryIleus: number;
  postoperativeIleus: number;
  hasRegurgitated: boolean;
  hasAspirated: boolean;
  aspirationEventSeverity: number;
  aspirationSeverityIndex: number; // live, ungated Mendelson severity from current gastric content (Phase 4)
  gastricVolume: number;
  gastricPH: number;
  ppiSuppressionLevel: number;
  stomachMotility: number;
  smallBowelMotility: number;
  colonicMotility: number;
  stomachIleusDurationHours: number;
  smallBowelIleusDurationHours: number;
  colonicIleusDurationHours: number;
  events: string[];
}

import { calculateDermatomalBlockFraction } from './Pharmacology.js';
import { calculateDifferentialDermatomalBlock } from './NerveConductionBlockModel';
import { GastricEmptyingModel } from './GastricEmptyingModel';

// TABLE 15.2, Miller's 9th Ed: small bowel, cecum, ascending and transverse colon (the
// principal substrate of postoperative ileus) are supplied T9-L1 via the celiac plexus.
const GUT_ILEUS_RANGE: [number, number] = [9, 13]; // T9 .. L1 (L1 = 13 on a T1-T12,L1-L5 scale)

export class GastrointestinalEngine {
  /**
   * Ticks the gastrointestinal system forward by 1 second.
   * Headless, deterministic, and pure.
   */
  static tick(
    dt: number = 1,
    st: { patient: GastrointestinalPatientState; vitals: GastrointestinalVitalsState; time: number },
    activeMeds: { name: string; Ce: number }[],
    inputs: {
      EtN_2O: number;
      currentMac: number;
      C_cat: number;
      positivePressureVentilationActive: boolean;
      spontaneousBreathingActive: boolean;
      pregnancyLesTonePenalty?: number; // PregnancyPhysiologyEngine.ts's lesTonePenaltyFraction (Phase 4)
      pregnancyGiSlowing?: boolean; // PregnancyPhysiologyEngine.ts's giMotilitySlowingActive (Phase 4)
    }
  ): GastrointestinalOutput {
    const events: string[] = [];
    const patient = st.patient || {};
    const vitals = st.vitals || {};

    // Sanitizing inputs defensively
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;
    const safeTime = typeof st.time === 'number' && Number.isFinite(st.time) ? st.time : 0;
    const safeEtN2O = typeof inputs.EtN_2O === 'number' && Number.isFinite(inputs.EtN_2O) ? inputs.EtN_2O : 0;
    const safeMac = typeof inputs.currentMac === 'number' && Number.isFinite(inputs.currentMac) ? Math.max(0, inputs.currentMac) : 0;
    const safeCcat = typeof inputs.C_cat === 'number' && Number.isFinite(inputs.C_cat) ? Math.max(0, inputs.C_cat) : 0;
    const safePregnancyLesTonePenalty = typeof inputs.pregnancyLesTonePenalty === 'number' && Number.isFinite(inputs.pregnancyLesTonePenalty) ? Math.max(0, inputs.pregnancyLesTonePenalty) : 0;

    // 1. LES Tone calculation (Propofol & Volatiles depress tone; Metoclopramide, a real
    // prokinetic that enhances cholinergic LES tone, raises it -- Phase 4. This is the only one
    // of the four new aspiration-prophylaxis drugs that affects the BARRIER itself rather than
    // just the gastric content, so it can genuinely prevent the aspiration trigger from firing at
    // all, not just reduce its severity once it does. Pregnancy's progesterone-mediated LES
    // relaxation (PregnancyPhysiologyEngine.ts) is the one non-drug physiologic cause of LES
    // depression modeled here -- part of why pregnancy is a "full stomach" aspiration risk.)
    const propofolModel = activeMeds.find(m => m.name === 'Propofol');
    const propofolCe = propofolModel ? propofolModel.Ce : 0;
    const metoclopramideModel = activeMeds.find(m => m.name === 'Metoclopramide');
    const metoclopramideCe = metoclopramideModel ? metoclopramideModel.Ce : 0;
    const metoclopramideLesBoost = 0.4 * (metoclopramideCe / (metoclopramideCe + 0.5));

    const baseLESTone = 25.0;
    const lesTone = baseLESTone * Math.max(0.2, 1.0 + metoclopramideLesBoost - 0.4 * (propofolCe / 2.5) - 0.3 * safeMac - safePregnancyLesTonePenalty);

    // 2. Gastric Pressure calculation (Succinylcholine fasciculations spike pressure)
    const suxModel = activeMeds.find(m => m.name === 'Succinylcholine');
    let suxFasciculation = 0.0;
    if (suxModel && patient.suxInjectionTime !== undefined) {
      const timeSinceSux = safeTime - patient.suxInjectionTime;
      if (timeSinceSux >= 0 && timeSinceSux <= 45) {
        suxFasciculation = 1.0;
      }
    }
    const gastricPressure = 7.0 + 15.0 * suxFasciculation;

    // 3. Regurgitation and Aspiration Trigger (unchanged -- still keyed on the binary
    // patient.stomach scenario-level flag; the new gastric content model below only grades
    // severity of an event this trigger has already decided will happen).
    let hasRegurgitated = false;
    const prevHasAspirated = !!patient.hasAspirated;
    let hasAspirated = prevHasAspirated;

    if (patient.stomach === 'full' && gastricPressure > lesTone && !patient.airwaySecured) {
      hasRegurgitated = true;
      if (inputs.positivePressureVentilationActive || inputs.spontaneousBreathingActive) {
        if (!hasAspirated) {
          hasAspirated = true;
          events.push("🚨 CRITICAL EMERGENCY: Gastric Aspiration Chemical Pneumonitis! Stomach contents have entered the lungs due to low LES barrier pressure.");
        }
      }
    }

    // Opioid block (moved ahead of the gastric content model below, which also needs it --
    // opioids slow gastric emptying via the same mu-receptor mechanism that causes ileus).
    const fentanylModel = activeMeds.find(m => m.name === 'Fentanyl');
    const fentanylCe = fentanylModel ? fentanylModel.Ce : 0;
    const morphineModel = activeMeds.find(m => m.name === 'Morphine');
    const morphineCe = morphineModel ? morphineModel.Ce : 0;
    const remiModel = activeMeds.find(m => m.name === 'Remifentanil');
    const remiCe = remiModel ? remiModel.Ce : 0;
    const maxOpioidCe = Math.max(fentanylCe * 500, morphineCe * 20, remiCe * 1000);
    const opioidBlock = maxOpioidCe / (maxOpioidCe + 1.0);

    // 3b. Gastric content model (Phase 4): real volume/pH replacing the binary flag as the sole
    // aspiration-risk driver, feeding a Mendelson-criteria severity grade once aspiration occurs.
    // Now also driven by the four real aspiration-prophylaxis drugs added to Pharmacology.js.
    const citrateModel = activeMeds.find(m => m.name === 'Sodium Citrate');
    const famotidineModel = activeMeds.find(m => m.name === 'Famotidine');
    const pantoprazoleModel = activeMeds.find(m => m.name === 'Pantoprazole');
    const safeWeight = typeof patient.weight === 'number' && Number.isFinite(patient.weight) && patient.weight > 0 ? patient.weight : 70;

    const gastricModelOutput = GastricEmptyingModel.tick({
      prevVolume: patient.gastricVolume,
      prevPH: patient.gastricPH,
      prevPpiSuppression: patient.ppiSuppressionLevel,
      npoSolids: patient.npoSolids,
      npoLiquids: patient.npoLiquids,
      stomachFull: patient.stomach === 'full',
      glp1Active: patient.glp1Active,
      trauma: patient.trauma,
      isSeptic: patient.isSeptic,
      emergentRSI: patient.emergentRSI,
      pregnancyGiSlowing: inputs.pregnancyGiSlowing,
      opioidBlock: opioidBlock,
      sympatheticDrive: safeCcat,
      weightKg: safeWeight,
      citrateCe: citrateModel ? citrateModel.Ce : 0,
      famotidineCe: famotidineModel ? famotidineModel.Ce : 0,
      pantoprazoleCe: pantoprazoleModel ? pantoprazoleModel.Ce : 0,
      metoclopramideCe: metoclopramideCe,
      dt: safeDt
    });

    let aspirationEventSeverity = typeof patient.aspirationEventSeverity === 'number' && Number.isFinite(patient.aspirationEventSeverity)
      ? patient.aspirationEventSeverity
      : 0;
    if (hasAspirated && !prevHasAspirated) {
      aspirationEventSeverity = gastricModelOutput.aspirationSeverityIndex;
    }

    // 4. Nitrous Oxide Bowel Gas Expansion (Eger solubility model)
    let bowelGasVolume = typeof vitals.bowelGasVolume === 'number' && Number.isFinite(vitals.bowelGasVolume) ? vitals.bowelGasVolume : 1.0;
    const dBowel = 0.02 * (safeEtN2O / 100) - 0.005 * (bowelGasVolume - 1.0);
    bowelGasVolume = Math.max(1.0, Math.min(2.5, bowelGasVolume + dBowel * safeDt));

    // 5. Postoperative Ileus and Gut Motility Index

    // Nonopioid Sparing (Chapter 25)
    const acetaminophenModel = activeMeds.find(m => m.name === 'Acetaminophen');
    const acetCe = acetaminophenModel ? acetaminophenModel.Ce : 0;
    const acetEff = acetCe > 0 ? (Math.pow(acetCe, 1.5) / (Math.pow(acetCe, 1.5) + Math.pow(10.0, 1.5))) : 0;

    const ketorolacModel = activeMeds.find(m => m.name === 'Ketorolac');
    const ketoCe = ketorolacModel ? ketorolacModel.Ce : 0;
    const ketoEff = ketoCe > 0 ? (Math.pow(ketoCe, 1.5) / (Math.pow(ketoCe, 1.5) + Math.pow(1.0, 1.5))) : 0;

    // Acetaminophen / Ketorolac reduce the opioid block effect on the gut by up to 40%
    const sparingFactor = 1.0 - 0.40 * Math.max(acetEff, ketoEff);
    const gutOpioidBlock = opioidBlock * sparingFactor;

    // Sympathetic block. Celiac plexus block targets the celiac ganglion directly (Fig 15.4/
    // 15.5, Miller's 9th Ed) — the final common sympathetic relay for "the majority of the GI
    // tract up to the rectum" (Fig 15.1 caption) — so it is modeled as complete splanchnic
    // block. A thoracic epidural's effect is graded by dermatomal overlap with the gut's
    // ileus-relevant innervation (TABLE 15.2) via `epiduralLevel`, AND by local anesthetic
    // concentration via the differential nerve block model (Phase 3, Stage A of
    // mutable-roaming-newell.md) -- sympathetic B-fibers block at low concentration, so even
    // a motor-sparing epidural still substantially blunts splanchnic sympathetic tone.
    const epiduralActive = !!patient.epiduralBlockActive;
    const celiacActive = !!patient.celiacBlockActive;
    const epiduralSpatialCoverageGI = epiduralActive
      ? calculateDermatomalBlockFraction(patient.epiduralLevel, GUT_ILEUS_RANGE[0], GUT_ILEUS_RANGE[1])
      : 0.0;
    const epiduralCoverageFraction = calculateDifferentialDermatomalBlock(
      epiduralSpatialCoverageGI, 'sympathetic', patient.epiduralConcentrationIndex
    );
    const sympatheticBlock = celiacActive ? 1.0 : epiduralCoverageFraction;
    
    const sympatheticInhibition = Math.min(0.9, 0.4 * (safeCcat / 40.0) * (1.0 - sympatheticBlock));

    // Inflammatory ileus accumulation (based on manipulation and epidural protection)
    let inflammatoryIleus = typeof vitals.inflammatoryIleus === 'number' && Number.isFinite(vitals.inflammatoryIleus) ? vitals.inflammatoryIleus : 0.0;
    const manipulationIndex = typeof patient.manipulationIndex === 'number' && Number.isFinite(patient.manipulationIndex) ? patient.manipulationIndex : 0.0;
    // Cochrane review: thoracic epidural analgesia for abdominal surgery reduces ileus duration
    // by ~36h, but only when the catheter level actually covers the operated gut segment's
    // sympathetic supply — scaled by dermatomal coverage rather than treated as all-or-nothing.
    const epiduralAnalgesiaBonus = 0.36 * (celiacActive ? 1.0 : epiduralCoverageFraction);
    
    const dInflam = 0.00015 * manipulationIndex * (1.0 - epiduralAnalgesiaBonus);
    inflammatoryIleus = Math.max(0.0, Math.min(1.0, inflammatoryIleus + dInflam * safeDt));

    // Direct volatile depression of GI smooth muscle/enteric neuron activity (Ch15, Miller's
    // 9th Ed: "Volatile anesthetics depress the spontaneous, electrical... bowel activity";
    // propofol-remifentanil TIVA produced greater intestinal motility than sevoflurane-
    // remifentanil in head-to-head studies). This is mechanistically distinct from the systemic
    // opioid-receptor and sympathetic-stress pathways above. No specific percentage is given in
    // the source text, so this reuses the same dose-coefficient (0.3/MAC) already established
    // for volatile depression of LES tone elsewhere in this engine, rather than inventing a new one.
    const volatileMotilityDepression = Math.min(0.6, 0.3 * safeMac);

    // Gut motility calculation (composite, kept for backward compatibility -- confirmed by direct
    // search that nothing outside this engine reads gutMotility, so this is a free-standing
    // average of the three segment values below, not an independently-derived metric).

    // Segment-specific motility/ileus recovery (Phase 4, GI subdivision). Real, well-established
    // clinical teaching: postoperative small bowel motility returns within hours, gastric emptying
    // within ~24-48h, and colonic motility last, ~48-72h -- the classic "small bowel, then
    // stomach, then colon" ileus-resolution sequence (bowel sounds/flatus/first bowel movement).
    // Modeled by applying the SAME inflammatoryIleus accumulator (unchanged) with a per-segment
    // sensitivity multiplier -- colon most sensitive/slowest to recover, small bowel least.
    const SEGMENT_ILEUS_SENSITIVITY = { stomach: 0.7, smallBowel: 0.35, colon: 1.0 };
    const SEGMENT_ILEUS_BASE_HOURS = { stomach: 48.0, smallBowel: 24.0, colon: 72.0 };

    const stomachInflammatoryIleus = inflammatoryIleus * SEGMENT_ILEUS_SENSITIVITY.stomach;
    const smallBowelInflammatoryIleus = inflammatoryIleus * SEGMENT_ILEUS_SENSITIVITY.smallBowel;
    const colonicInflammatoryIleus = inflammatoryIleus * SEGMENT_ILEUS_SENSITIVITY.colon;

    const stomachMotility = (1.0 - gutOpioidBlock) * (1.0 - sympatheticInhibition) * (1.0 - stomachInflammatoryIleus) * (1.0 - volatileMotilityDepression);
    const smallBowelMotility = (1.0 - gutOpioidBlock) * (1.0 - sympatheticInhibition) * (1.0 - smallBowelInflammatoryIleus) * (1.0 - volatileMotilityDepression);
    const colonicMotility = (1.0 - gutOpioidBlock) * (1.0 - sympatheticInhibition) * (1.0 - colonicInflammatoryIleus) * (1.0 - volatileMotilityDepression);

    const gutMotility = (stomachMotility + smallBowelMotility + colonicMotility) / 3.0;

    // Per-segment postoperative ileus DURATION ESTIMATES (hours), same formula structure as the
    // original single `postoperativeIleus` figure, scaled by each segment's base recovery time.
    // Matches the original's carry-forward behavior: once manipulationIndex returns to 0 (closure),
    // each estimate HOLDS its last computed value rather than resetting to 0 -- this number is a
    // prediction made during surgery, most needed during PACU after manipulation has stopped.
    let stomachIleusDurationHours = typeof vitals.stomachIleusDurationHours === 'number' && Number.isFinite(vitals.stomachIleusDurationHours) ? vitals.stomachIleusDurationHours : 0.0;
    let smallBowelIleusDurationHours = typeof vitals.smallBowelIleusDurationHours === 'number' && Number.isFinite(vitals.smallBowelIleusDurationHours) ? vitals.smallBowelIleusDurationHours : 0.0;
    let colonicIleusDurationHours = typeof vitals.colonicIleusDurationHours === 'number' && Number.isFinite(vitals.colonicIleusDurationHours) ? vitals.colonicIleusDurationHours : 0.0;
    if (manipulationIndex > 0) {
      const bowelDistensionFactor = 1.0 + 0.5 * Math.max(0, bowelGasVolume - 1.0);
      const nonopiodDurationSparing = 1.0 - 0.25 * Math.max(acetEff, ketoEff);
      const commonFactor = manipulationIndex * (1.0 - sympatheticBlock * 0.36) * bowelDistensionFactor * nonopiodDurationSparing;
      stomachIleusDurationHours = SEGMENT_ILEUS_BASE_HOURS.stomach * commonFactor;
      smallBowelIleusDurationHours = SEGMENT_ILEUS_BASE_HOURS.smallBowel * commonFactor;
      colonicIleusDurationHours = SEGMENT_ILEUS_BASE_HOURS.colon * commonFactor;
    }
    const postoperativeIleus = Math.max(stomachIleusDurationHours, smallBowelIleusDurationHours, colonicIleusDurationHours);

    return {
      lesTone: parseFloat(lesTone.toFixed(2)),
      gastricPressure: parseFloat(gastricPressure.toFixed(2)),
      bowelGasVolume: parseFloat(bowelGasVolume.toFixed(4)),
      gutMotility: parseFloat(gutMotility.toFixed(4)),
      inflammatoryIleus: parseFloat(inflammatoryIleus.toFixed(4)),
      postoperativeIleus: parseFloat(postoperativeIleus.toFixed(2)),
      hasRegurgitated,
      hasAspirated,
      aspirationEventSeverity: parseFloat(aspirationEventSeverity.toFixed(4)),
      aspirationSeverityIndex: gastricModelOutput.aspirationSeverityIndex,
      gastricVolume: gastricModelOutput.gastricVolume,
      gastricPH: gastricModelOutput.gastricPH,
      ppiSuppressionLevel: gastricModelOutput.ppiSuppressionLevel,
      stomachMotility: parseFloat(stomachMotility.toFixed(4)),
      smallBowelMotility: parseFloat(smallBowelMotility.toFixed(4)),
      colonicMotility: parseFloat(colonicMotility.toFixed(4)),
      stomachIleusDurationHours: parseFloat(stomachIleusDurationHours.toFixed(2)),
      smallBowelIleusDurationHours: parseFloat(smallBowelIleusDurationHours.toFixed(2)),
      colonicIleusDurationHours: parseFloat(colonicIleusDurationHours.toFixed(2)),
      events
    };
  }
}
