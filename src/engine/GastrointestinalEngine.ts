export interface GastrointestinalPatientState {
  stomach?: string; // 'empty' | 'full'
  airwaySecured?: boolean;
  isSeptic?: boolean;
  trauma?: boolean;
  suxInjectionTime?: number;
  hasAspirated?: boolean;
  manipulationIndex?: number; // 1.0 for open, 0.3 for laparoscopic, 0.0 for none
  epiduralBlockActive?: boolean;
  epiduralLevel?: number; // Thoracic dermatome of catheter insertion (e.g. 8 for T8)
  celiacBlockActive?: boolean;
  swallowingActive?: boolean;
}

export interface GastrointestinalVitalsState {
  lesTone?: number;
  gastricPressure?: number;
  bowelGasVolume?: number;
  gutMotility?: number;
  inflammatoryIleus?: number;
  postoperativeIleus?: number;
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
  events: string[];
}

import { calculateDermatomalBlockFraction } from './Pharmacology.js';

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

    // 1. LES Tone calculation (Propofol & Volatiles depress tone)
    const propofolModel = activeMeds.find(m => m.name === 'Propofol');
    const propofolCe = propofolModel ? propofolModel.Ce : 0;
    
    const baseLESTone = 25.0;
    const lesTone = baseLESTone * Math.max(0.2, 1.0 - 0.4 * (propofolCe / 2.5) - 0.3 * safeMac);

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

    // 3. Regurgitation and Aspiration Trigger
    let hasRegurgitated = false;
    let hasAspirated = !!patient.hasAspirated;
    
    if (patient.stomach === 'full' && gastricPressure > lesTone && !patient.airwaySecured) {
      hasRegurgitated = true;
      if (inputs.positivePressureVentilationActive || inputs.spontaneousBreathingActive) {
        if (!hasAspirated) {
          hasAspirated = true;
          events.push("🚨 CRITICAL EMERGENCY: Gastric Aspiration Chemical Pneumonitis! Stomach contents have entered the lungs due to low LES barrier pressure.");
        }
      }
    }

    // 4. Nitrous Oxide Bowel Gas Expansion (Eger solubility model)
    let bowelGasVolume = typeof vitals.bowelGasVolume === 'number' && Number.isFinite(vitals.bowelGasVolume) ? vitals.bowelGasVolume : 1.0;
    const dBowel = 0.02 * (safeEtN2O / 100) - 0.005 * (bowelGasVolume - 1.0);
    bowelGasVolume = Math.max(1.0, Math.min(2.5, bowelGasVolume + dBowel * safeDt));

    // 5. Postoperative Ileus and Gut Motility Index
    // Opioid block
    const fentanylModel = activeMeds.find(m => m.name === 'Fentanyl');
    const fentanylCe = fentanylModel ? fentanylModel.Ce : 0;
    const morphineModel = activeMeds.find(m => m.name === 'Morphine');
    const morphineCe = morphineModel ? morphineModel.Ce : 0;
    const remiModel = activeMeds.find(m => m.name === 'Remifentanil');
    const remiCe = remiModel ? remiModel.Ce : 0;
    const maxOpioidCe = Math.max(fentanylCe * 500, morphineCe * 20, remiCe * 1000);
    const opioidBlock = maxOpioidCe / (maxOpioidCe + 1.0);

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
    // ileus-relevant innervation (TABLE 15.2) via `epiduralLevel`.
    const epiduralActive = !!patient.epiduralBlockActive;
    const celiacActive = !!patient.celiacBlockActive;
    const epiduralCoverageFraction = epiduralActive
      ? calculateDermatomalBlockFraction(patient.epiduralLevel, GUT_ILEUS_RANGE[0], GUT_ILEUS_RANGE[1])
      : 0.0;
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

    // Gut motility calculation
    const gutMotility = (1.0 - gutOpioidBlock) * (1.0 - sympatheticInhibition) * (1.0 - inflammatoryIleus) * (1.0 - volatileMotilityDepression);

    // Postoperative Ileus hours (reduced by up to 25% by nonopioids)
    let postoperativeIleus = typeof vitals.postoperativeIleus === 'number' && Number.isFinite(vitals.postoperativeIleus) ? vitals.postoperativeIleus : 0.0;
    if (manipulationIndex > 0) {
      const bowelDistensionFactor = 1.0 + 0.5 * Math.max(0, bowelGasVolume - 1.0);
      const nonopiodDurationSparing = 1.0 - 0.25 * Math.max(acetEff, ketoEff);
      postoperativeIleus = 72.0 * manipulationIndex * (1.0 - sympatheticBlock * 0.36) * bowelDistensionFactor * nonopiodDurationSparing;
    }

    return {
      lesTone: parseFloat(lesTone.toFixed(2)),
      gastricPressure: parseFloat(gastricPressure.toFixed(2)),
      bowelGasVolume: parseFloat(bowelGasVolume.toFixed(4)),
      gutMotility: parseFloat(gutMotility.toFixed(4)),
      inflammatoryIleus: parseFloat(inflammatoryIleus.toFixed(4)),
      postoperativeIleus: parseFloat(postoperativeIleus.toFixed(2)),
      hasRegurgitated,
      hasAspirated,
      events
    };
  }
}
