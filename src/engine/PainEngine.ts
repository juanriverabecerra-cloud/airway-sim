import { computeModulatedEndogenousCoupling } from './ReceptorPharmacologyModel';

export interface PainPatientState {
  C_cat?: number;
  MAP_set?: number;
  chronicHTN?: boolean;
  highAnxiety?: boolean;
  chronicBetaBlockade?: boolean;
  laryngospasm?: boolean;
  bronchospasm?: boolean;
  surgicalPhase?: string;
  incisionStartTime?: number;
  laryngoscopyActive?: boolean;
  laryngoscopyTime?: number;
  cricPlacedTime?: number;
  cricSympatheticSurgeActive?: boolean;
  ioPlacedTime?: number;
  ioSympatheticSurgeActive?: boolean;
  lastLinePlacementTime?: number;
  lastLineCategory?: string;
  lastAirwayManipulationTime?: number;
  lastAirwayManipulationType?: string;
  isTopicalized?: boolean;
  isApneic?: boolean;
  isParalyzed?: boolean;
  tofCount?: number;
  airwaySecured?: boolean;
  remifentanilHyperalgesiaActive?: boolean;
}

export interface PainVitalsState {
  hr: number;
  sys: number;
  dia: number;
  map: number;
  rr: number;
  paco2: number;
  bis: number;
}

export interface PainEngineOutput {
  C_cat: number;
  MAP_set: number;
  rawNociception: number;
  analgesiaLevel: number;
  effectivePain: number;
  sympatheticDrive: number;
  hrSpike: number;
  svrSpike: number;
  contractilitySpike: number;
  alpha1Activity: number; // endogenous catecholamine pool's receptor activity (Phase 2's receptor-unification piece), for per-vascular-bed redistribution
  beta2Activity: number;
  rrSpike: number;
  bisSpike: number;
  pupilSize: number;
  somaticResponse: {
    isBucking: boolean;
    isMoving: boolean;
    pipOffset: number;
    complianceMultiplier: number;
    resistanceOffset: number;
    event: string | null;
    triggerLaryngospasm: boolean;
    triggerBronchospasm: boolean;
  };
}

export class PainEngine {
  /**
   * Refactored Neuro-Autonomic Effector & Pain Engine
   * Implements:
   * 1. Endogenous Catecholamine Pool Kinetics (C_cat)
   * 2. Dynamic Baroreceptor Resetting Loop (MAP_set) & Central Gain Attenuation
   * 3. Response Surface Pharmacodynamics (MAC-BAR Synergy)
   * 4. Patient Phenotype Heterogeneity (Hypertension, Anxiety, Beta-Blockade)
   */
  static tick(
    dt: number = 1,
    patient: PainPatientState,
    vitals: PainVitalsState,
    activeMeds: any[],
    currentMac: number,
    simulationTime: number,
    nonNociceptiveSympatheticStimulus: number = 0
  ): PainEngineOutput {
    // 1. Sanitizing/Initializing State Variables
    const safeTime = typeof simulationTime === 'number' && Number.isFinite(simulationTime) ? simulationTime : 0;
    const safeMac = typeof currentMac === 'number' && Number.isFinite(currentMac) ? Math.max(0, currentMac) : 0;
    const p = { ...patient };
    const v = vitals || { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 };
    const currentMAP = typeof v.map === 'number' && Number.isFinite(v.map) ? v.map : 93.0;

    // Ingest Patient Phenotypes
    const isHTN = !!p.chronicHTN;
    const isAnxious = !!p.highAnxiety;
    const isBetaBlocked = !!p.chronicBetaBlockade;

    // Initialize C_cat (Catecholamine Pool)
    let currentCcat = typeof p.C_cat === 'number' && Number.isFinite(p.C_cat) ? p.C_cat : (isAnxious ? 25.0 : 0.0);

    // Initialize MAP_set (Baroreceptor Setpoint)
    let currentMAPset = typeof p.MAP_set === 'number' && Number.isFinite(p.MAP_set) ? p.MAP_set : (isHTN ? 130.0 : currentMAP);
    if (currentMAPset <= 0) currentMAPset = 93.0;

    // 2. Nociceptive Influx (I_nociceptive)
    const phase = typeof p.surgicalPhase === 'string' ? p.surgicalPhase : 'Pre-Op';
    const laryngoscopyActive = !!p.laryngoscopyActive;
    const cricSymActive = !!p.cricSympatheticSurgeActive;
    const cricPlacedTime = typeof p.cricPlacedTime === 'number' ? p.cricPlacedTime : -999;
    const ioSymActive = !!p.ioSympatheticSurgeActive;
    const ioPlacedTime = typeof p.ioPlacedTime === 'number' ? p.ioPlacedTime : -999;
    const lastLineTime = typeof p.lastLinePlacementTime === 'number' ? p.lastLinePlacementTime : -999;
    const lastLineCat = typeof p.lastLineCategory === 'string' ? p.lastLineCategory : '';
    const lastAirwayTime = typeof p.lastAirwayManipulationTime === 'number' ? p.lastAirwayManipulationTime : -999;
    const lastAirwayType = typeof p.lastAirwayManipulationType === 'string' ? p.lastAirwayManipulationType : '';

    const isTopicalized = !!p.isTopicalized;
    const isApneic = !!p.isApneic;
    const isParalyzed = !!p.isParalyzed || (typeof p.tofCount === 'number' && p.tofCount === 0);
    const airwaySecured = !!p.airwaySecured;

    let systemicNociception = 0;
    let airwayNociception = 0;

    // Incision
    if (phase === 'Incision') {
      const incisionDuration = Math.max(0, safeTime - (p.incisionStartTime !== undefined ? p.incisionStartTime : safeTime));
      systemicNociception += 40 + 40 * Math.exp(-0.005 * incisionDuration); // decays from 80 to 40
    } else if (phase === 'Maintenance') {
      systemicNociception += 30;
    } else if (phase === 'Emergence') {
      systemicNociception += 15;
    }

    // Laryngoscopy
    if (laryngoscopyActive) {
      airwayNociception += 75;
    }

    // Surgical Cric
    if (cricSymActive && cricPlacedTime >= 0) {
      const dt_cric = Math.max(0, safeTime - cricPlacedTime);
      if (dt_cric < 60) {
        airwayNociception += 95 * Math.exp(-0.08 * dt_cric);
      }
    }

    // IO Placement
    if (ioSymActive && ioPlacedTime >= 0) {
      const dt_io = Math.max(0, safeTime - ioPlacedTime);
      if (dt_io < 45) {
        systemicNociception += 85 * Math.exp(-0.08 * dt_io);
      }
    }

    // Lines (PIV, CVC, A-line)
    if (lastLineTime >= 0) {
      const dt_line = Math.max(0, safeTime - lastLineTime);
      if (lastLineCat.includes('PIV') || lastLineCat.includes('Peripheral')) {
        if (dt_line < 10) systemicNociception += 8 * Math.exp(-0.3 * dt_line);
      } else if (lastLineCat.includes('Arterial')) {
        if (dt_line < 10) systemicNociception += 12 * Math.exp(-0.3 * dt_line);
      } else if (lastLineCat.includes('CVC') || lastLineCat.includes('Central')) {
        if (dt_line < 20) systemicNociception += 20 * Math.exp(-0.15 * dt_line);
      }
    }

    // Airway Manipulations
    if (lastAirwayTime >= 0) {
      const dt_air = Math.max(0, safeTime - lastAirwayTime);
      if (dt_air < 10) {
        let baseValue = 0;
        if (lastAirwayType === 'suction') baseValue = 40;
        else if (lastAirwayType === 'device') baseValue = 45;
        else if (lastAirwayType === 'extubation') baseValue = 50;
        airwayNociception += baseValue * Math.exp(-0.4 * dt_air);
      }
    }

    // 3. Response Surface Analgesia Blunting
    const getDrugEffect = (name: string, c50: number, gamma: number): number => {
      const med = activeMeds?.find(m => m.name === name);
      const ce = med ? med.Ce : 0;
      if (ce <= 0) return 0;
      let effectiveC50 = c50;
      if (name !== 'Naloxone' && ['Fentanyl', 'Remifentanil', 'Sufentanil', 'Morphine', 'Hydromorphone'].includes(name)) {
        const naloxone = activeMeds?.find(m => m.name === 'Naloxone');
        if (naloxone && naloxone.Ce > 0) {
          effectiveC50 = c50 * (1.0 + (naloxone.Ce / 0.001)); // Ki = 0.001 mg/L for Naloxone competitive antagonism
        }
      }
      const powerCe = Math.pow(ce, gamma);
      const powerC50 = Math.pow(effectiveC50, gamma);
      return powerCe / (powerCe + powerC50);
    };

    // Opioids
    const fentEff = getDrugEffect('Fentanyl', 0.002, 1.5);
    const remiEff = getDrugEffect('Remifentanil', 0.001, 2.5);
    const sufentEff = getDrugEffect('Sufentanil', 0.0003, 1.5);
    const morphineEff = getDrugEffect('Morphine', 0.05, 1.5);
    const hydroEff = getDrugEffect('Hydromorphone', 0.015, 1.5);

    const opioidAnalgesia = 1.0 - (1.0 - fentEff) * (1.0 - remiEff) * (1.0 - sufentEff) * (1.0 - morphineEff) * (1.0 - hydroEff);

    // Other Analgesics. Esketamine (S(+)-isomer) is 3-4x more potent as an analgesic than racemic
    // ketamine (Ch23, Miller's 9th Ed) — modeled with a proportionally lower c50 (midpoint 3.5x:
    // 0.5/3.5 = 0.143), then merged with racemic ketamine's effect via independent-probability
    // combination, consistent with how this engine already combines multiple opioids above.
    const racemicKetamineEff = getDrugEffect('Ketamine', 0.5, 2.0);
    const esketamineEff = getDrugEffect('Esketamine', 0.143, 2.0);
    const ketamineEff = 1.0 - (1.0 - racemicKetamineEff) * (1.0 - esketamineEff);
    const lidocaineModel = activeMeds?.find(m => m.name === 'Lidocaine');
    const lidoCe = lidocaineModel ? lidocaineModel.Ce : 0;
    const lidoEff = lidoCe > 0 ? (Math.pow(lidoCe, 1.5) / (Math.pow(lidoCe, 1.5) + Math.pow(3.0, 1.5))) : 0;

    // Non-opioid Pain Medications (Chapter 25)
    const acetaminophenEff = getDrugEffect('Acetaminophen', 10.0, 1.5);
    const ketorolacEff = getDrugEffect('Ketorolac', 1.0, 1.5);
    const gabapentinEff = getDrugEffect('Gabapentin', 5.0, 1.5);
    const pregabalinEff = getDrugEffect('Pregabalin', 3.0, 1.5);
    const mexiletineEff = getDrugEffect('Mexiletine', 1.0, 1.5);
    const topiramateEff = getDrugEffect('Topiramate', 4.0, 1.5);
    const carbamazepineEff = getDrugEffect('Carbamazepine', 6.0, 1.5);
    const oxcarbazepineEff = getDrugEffect('Oxcarbazepine', 8.0, 1.5);
    const lamotrigineEff = getDrugEffect('Lamotrigine', 4.0, 1.5);
    const zonisamideEff = getDrugEffect('Zonisamide', 5.0, 1.5);
    const levetiracetamEff = getDrugEffect('Levetiracetam', 10.0, 1.5);
    const ziconotideEff = getDrugEffect('Ziconotide', 0.005, 1.5);

    const nonopioidEff = 1.0 - (1.0 - acetaminophenEff * 0.35) *
                              (1.0 - ketorolacEff * 0.40) *
                              (1.0 - gabapentinEff * 0.30) *
                              (1.0 - pregabalinEff * 0.35) *
                              (1.0 - mexiletineEff * 0.25) *
                              (1.0 - topiramateEff * 0.20) *
                              (1.0 - carbamazepineEff * 0.25) *
                              (1.0 - oxcarbazepineEff * 0.25) *
                              (1.0 - lamotrigineEff * 0.30) *
                              (1.0 - zonisamideEff * 0.20) *
                              (1.0 - levetiracetamEff * 0.20) *
                              (1.0 - ziconotideEff * 0.45);

    // Afferent Analgesia Blunting
    const analgesiaBlunting = 1.0 - (1.0 - opioidAnalgesia) * 
                              (1.0 - ketamineEff * 0.8) * 
                              (1.0 - lidoEff * 0.4) * 
                              (1.0 - nonopioidEff);

    // Airway specific blunting
    const airwayBlock = Math.min(0.85, (isTopicalized ? 0.85 : 0.0) + lidoEff * 0.5);

    // Blunted Influx
    const netSystemicNociceptive = systemicNociception * (1.0 - analgesiaBlunting);
    const netAirwayNociceptive = airwayNociception * (1.0 - analgesiaBlunting) * (1.0 - airwayBlock);
    const totalNociceptiveInflux = Math.min(100.0, netSystemicNociceptive + netAirwayNociceptive);

    // 4. Catecholamine kinetics pool
    // Clearance: t_1/2 ≈ 90 seconds (k_clearance = 0.0077 s^-1)
    // Dynamic rate: rapid onset, slow clearance
    const k_onset = 1.0;
    const k_clear = 0.0077;
    // One real adrenal medulla output, fed by every trigger that drives it -- nociception
    // (above) plus the non-pain sympathoadrenal triggers (hypoglycemia, hypoxia,
    // hemorrhage/hypotension) AdrenalEngine.ts computes on this same 0-100 nociception-
    // equivalent scale, rather than a second, parallel catecholamine pool that never
    // interacts with this one (Phase 2, Stage A of mutable-roaming-newell.md).
    const safeNonNociceptiveStimulus = typeof nonNociceptiveSympatheticStimulus === 'number' && Number.isFinite(nonNociceptiveSympatheticStimulus)
      ? Math.max(0, nonNociceptiveSympatheticStimulus)
      : 0;
    const targetCcat = Math.min(150.0, totalNociceptiveInflux + safeNonNociceptiveStimulus);
    if (targetCcat > currentCcat) {
      currentCcat += dt * k_onset * (targetCcat - currentCcat);
    } else {
      currentCcat += dt * k_clear * (targetCcat - currentCcat);
    }
    
    // Enforce Phenotype boundaries
    const minCcat = isAnxious ? 25.0 : 0.0;
    currentCcat = Math.max(minCcat, Math.min(150.0, currentCcat));

    // 5. Response Surface MAC-BAR Suppression Interaction Model (Minto/Greco Concept)
    // Opioid receptor occupancy shifts the EC50 for volatile gas and hypnotics required for BAR block
    const MAC_50_BAR = 1.2 * Math.exp(-3.0 * opioidAnalgesia);
    const Hypnotic_50_BAR = 1.5 * Math.exp(-3.0 * opioidAnalgesia);

    // Volatiles BAR suppression
    const volatileBAR = Math.min(0.95, Math.pow(safeMac, 1.5) / (Math.pow(safeMac, 1.5) + Math.pow(MAC_50_BAR, 1.5)));

    // Hypnotics BAR suppression
    const propofolEff = getDrugEffect('Propofol', 2.5, 2.0);
    const midazolamEff = getDrugEffect('Midazolam', 0.05, 1.5);
    const etomidateEff = getDrugEffect('Etomidate', 0.3, 3.0);
    const thiopentalEff = getDrugEffect('Thiopental', 15.0, 2.0);
    const methohexitalEff = getDrugEffect('Methohexital', 3.5, 2.0);
    const hypnoticFraction = (activeMeds?.find(m => m.name === 'Propofol') ? propofolEff * 2.0 : 0) +
                             (activeMeds?.find(m => m.name === 'Midazolam') ? midazolamEff * 1.5 : 0) +
                             (activeMeds?.find(m => m.name === 'Etomidate') ? etomidateEff * 1.5 : 0) +
                             (activeMeds?.find(m => m.name === 'Thiopental') ? thiopentalEff * 2.0 : 0) +
                             (activeMeds?.find(m => m.name === 'Methohexital') ? methohexitalEff * 2.0 : 0);

    const hypnoticBAR = Math.min(0.95, Math.pow(hypnoticFraction, 1.5) / (Math.pow(hypnoticFraction, 1.5) + Math.pow(Hypnotic_50_BAR, 1.5)));

    // MAC-BAR suppression level
    const BAR_suppression = Math.max(0.0, Math.min(0.99, 1.0 - (1.0 - volatileBAR) * (1.0 - hypnoticBAR)));

    // Sympathetic Surge Outflow
    let sympatheticDrive = currentCcat * (1.0 - BAR_suppression);
    if (p.remifentanilHyperalgesiaActive) {
      sympatheticDrive *= 2.5; // OIH scales sympathetic spikes by 2.5x
    }

    // 6. Dynamic Baroreceptor Resetting Loop
    // Setpoint drift (tau = 180 seconds)
    currentMAPset += dt * ((currentMAP - currentMAPset) / 180.0);
    currentMAPset = Math.max(50.0, Math.min(160.0, currentMAPset));

    // Central gain attenuation
    const G_baseline = 1.5;
    const k_pain = 0.05;
    const G_baro = G_baseline / (1.0 + k_pain * currentCcat);

    // Baroreflex modification on heart rate
    let baroModifier = -G_baro * (currentMAP - currentMAPset);
    baroModifier = Math.max(-35.0, Math.min(35.0, baroModifier));

    // 7. Receptor-Level Effector Dynamics
    // Beta-1 (β1) Chronotropy/Inotropy
    const esmololEff = getDrugEffect('Esmolol', 1.0, 1.5);
    const labetalolEff = getDrugEffect('Labetalol', 0.5, 2.0);
    const metoprololEff = getDrugEffect('Metoprolol', 0.1, 1.5);
    const betaBlockade = Math.min(0.95, esmololEff * 0.90 + labetalolEff * 0.75 + metoprololEff * 0.85);

    let E_beta1_max = 1.2 * (1.0 - betaBlockade);
    if (isBetaBlocked) {
      E_beta1_max = Math.min(0.05, E_beta1_max); // competitive cap
    }

    // Alpha-1 (α1) Vasoconstriction -- modulation factors computed before the shared
    // receptor-coupling call below, same as before.
    const phentolamineEff = getDrugEffect('Phentolamine', 0.5, 2.0);
    const alphaBlockade = Math.min(0.95, (labetalolEff * 0.40) + phentolamineEff * 0.90);
    const volatileVasodilation = Math.min(0.50, safeMac * 0.20);

    const baseE_alpha1_max = isHTN ? 2.5 : 1.5;
    const E_alpha1_max = baseE_alpha1_max * (1.0 - alphaBlockade) * (1.0 - volatileVasodilation);

    // Endogenous catecholamine receptor coupling (Phase 2's deferred receptor-
    // unification piece, mutable-roaming-newell.md): replaces the separate bespoke
    // sigmoid formulas for beta-1 (HR/contractility) and alpha-1 (SVR) with one shared
    // Hill-equation + receptor-coupling model -- the SAME machinery
    // `Pharmacology.js`/`PKPDEngine.ts` already use for exogenous epinephrine/
    // norepinephrine/phenylephrine/ephedrine -- so endogenous and exogenous
    // catecholamines are now computed through one mechanism instead of two that never
    // mathematically interacted. `E_beta1_max`/`E_alpha1_max`'s existing modulation
    // (beta-blockade, alpha-blockade, HTN baseline, volatile vasodilation) is preserved
    // exactly, now applied to this shared model's receptor potencies instead of the old
    // formula's magnitude constants. A small beta-2-mediated vasodilation component
    // (real epinephrine physiology, absent from the old endogenous-only formula) is a
    // disclosed, intentional addition -- see ReceptorPharmacologyModel.ts's header.
    const endogenousCoupling = computeModulatedEndogenousCoupling(sympatheticDrive, E_beta1_max, E_alpha1_max);

    // β1 chronotropic response
    const deltaHR_beta1 = endogenousCoupling.hrDeltaContribution;
    const hrSpike = deltaHR_beta1 + baroModifier;

    // β1 inotropic response -- damped 0.4x relative to the shared model's raw
    // coMultiplierDelta (calibrated against the old formula's independently-tuned
    // contractility magnitude constant; see ReceptorPharmacologyModel.ts).
    const contractilitySpike = endogenousCoupling.coMultiplierDelta * 0.4;

    // α1 (+ beta-2 antagonism) vasoactive resistance modifier, converted from the shared
    // model's multiplier-fraction convention to this engine's existing absolute-additive
    // convention by scaling against a representative baseline SVR (1200, this codebase's
    // existing default `patientBaseSVR`).
    const svrSpike = endogenousCoupling.svrMultiplierDelta * 1200;

    // 8. Respiratory, Neurological & Somatic Targets
    // Spontaneous respiration (Tachypnea blunted by opioids)
    const rrSpike = sympatheticDrive * 0.25 * (1.0 - opioidAnalgesia);

    // Cortical arousal (BIS spike)
    const macHypnosis = Math.min(1.0, safeMac);
    const totalHypnosis = Math.max(0, Math.min(1.0, 1.0 - (1.0 - propofolEff) * (1.0 - midazolamEff) * (1.0 - etomidateEff) * (1.0 - macHypnosis) * (1.0 - ketamineEff * 0.6)));
    const bisGain = isAnxious ? 0.45 : 0.30;
    const effectivePain = totalNociceptiveInflux;
    const bisSpike = effectivePain * bisGain * (1.0 - totalHypnosis * 0.8);

    // Pupillary kinetics
    let pupilSize = 3.0 + 5.0 * (Math.pow(sympatheticDrive, 1.5) / (Math.pow(sympatheticDrive, 1.5) + Math.pow(40.0, 1.5))) - 2.5 * opioidAnalgesia;
    pupilSize = Math.max(1.0, Math.min(8.0, pupilSize));

    // Somatic response (Coughing / Movement)
    let isBucking = false;
    let isMoving = false;
    let pipOffset = 0;
    let complianceMultiplier = 1.0;
    let resistanceOffset = 0;
    let eventMessage: string | null = null;

    const buckingThreshold = isAnxious ? 12.0 : 25.0;

    if (!isParalyzed && effectivePain > buckingThreshold) {
      if (airwaySecured) {
        isBucking = true;
        pipOffset = 18.0;
        complianceMultiplier = 0.55;
        resistanceOffset = 15.0;
        eventMessage = "🚨 CLINICAL WARNING: Patient is coughing and bucking against the ventilator! Airway pressures are spiking (PIP +18 cmH2O) due to insufficient sedation/analgesia.";
      } else {
        isMoving = true;
        eventMessage = "⚠️ CLINICAL ALERT: Patient is moving and groaning in response to painful stimuli! Depth of anesthesia is inadequate.";
      }
    }

    // Probabilistic check for spasm (laryngospasm or bronchospasm)
    let triggerLaryngospasm = false;
    let triggerBronchospasm = false;

    const airwayProcActive = laryngoscopyActive || (lastAirwayTime >= 0 && (safeTime - lastAirwayTime < 10));
    if (airwayProcActive && !isParalyzed && BAR_suppression < 0.50) {
      // 5% chance per second under inadequate anesthesia during airway manipulation
      // Seed/Mock compatibility
      const randVal = Math.random();
      if (randVal < 0.05) {
        if (Math.random() < 0.50 && !airwaySecured && !p.laryngospasm) {
          triggerLaryngospasm = true;
        } else if (!p.bronchospasm) {
          triggerBronchospasm = true;
        }
      }
    }

    return {
      C_cat: parseFloat(currentCcat.toFixed(4)),
      MAP_set: parseFloat(currentMAPset.toFixed(4)),
      rawNociception: Math.round(totalNociceptiveInflux),
      analgesiaLevel: parseFloat(analgesiaBlunting.toFixed(3)),
      effectivePain: Math.round(effectivePain),
      sympatheticDrive: parseFloat(sympatheticDrive.toFixed(4)),
      hrSpike: parseFloat(hrSpike.toFixed(2)),
      svrSpike: parseFloat(svrSpike.toFixed(2)),
      contractilitySpike: parseFloat(contractilitySpike.toFixed(4)),
      alpha1Activity: parseFloat(endogenousCoupling.alpha1Activity.toFixed(4)),
      beta2Activity: parseFloat(endogenousCoupling.beta2Activity.toFixed(4)),
      rrSpike: parseFloat(rrSpike.toFixed(2)),
      bisSpike: parseFloat(bisSpike.toFixed(2)),
      pupilSize: parseFloat(pupilSize.toFixed(2)),
      somaticResponse: {
        isBucking,
        isMoving,
        pipOffset,
        complianceMultiplier,
        resistanceOffset,
        event: eventMessage,
        triggerLaryngospasm,
        triggerBronchospasm
      }
    };
  }
}
