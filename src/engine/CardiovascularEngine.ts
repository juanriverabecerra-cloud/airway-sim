import { calculateDermatomalBlockFraction } from './Pharmacology.js';
import { calculateDifferentialDermatomalBlock } from './NerveConductionBlockModel';
import { simulateFourChamberCycle } from './FourChamberCircuitModel';

export interface PatientState {
  isArrest: boolean;
  cardiacRhythm: string;
  cprActive: boolean;
  ischemicDamage: number;
  biologicalDeath: boolean;
  myocardialStunning: number;
  ebl: number;
  ebv: number;
  height: number;
  weight: number;
  sex: string;
  age: number;
  bmi: number;
  position: string;
  copd?: boolean;
  restrictive?: boolean;
  arrestThreshold?: number;
  codeStartTime?: number | null;
  apneaStartTime?: number | null;
  bradycardiaTriggered?: boolean;
  bradycardiaTime?: number;
  cad?: boolean;
  hasCAD?: boolean;
  chf?: boolean;
  ef?: number;
  as?: boolean;
  aorticStenosis?: boolean;
  afib?: boolean;
  hasAFib?: boolean;
  onBetaBlocker?: boolean;
  betaBlocker?: boolean;
  hasBetaBlocker?: boolean;
  patientBaseSV?: number;
  patientBaseSVR?: number;
  patientBaseHR?: number;
  isSeptic?: boolean;
  calciumStabilized?: boolean;
  calciumStabilizedTime?: number;
  serotoninSyndromeTriggered?: boolean;
  intravascularVolume?: number;
  patientBaseSBP?: number;
  patientBaseDBP?: number;
  oculocardiacTriggered?: boolean;
  epiduralBlockActive?: boolean;
  epiduralLevel?: number;
  epiduralConcentrationIndex?: number; // 0-1+, 1.0 = surgical-strength (default); lower = motor-sparing differential block (Phase 3)
  celiacBlockActive?: boolean;
  hasPoPHCollapse?: boolean;
  ischemiaActive?: boolean;
  ischemiaMildLogged?: boolean;
  ischemiaSevereLogged?: boolean;
  hasPneumothorax?: boolean;
  adrenalSuppressionActive?: boolean;
  icp?: number;
  cpp?: number;
  ziconotideHypotensionActive?: boolean;
}

export interface VitalsState {
  hr: number;
  sys: number;
  dia: number;
  map: number;
  co: number;
  svr: number;
  cmap: number;
  bis: number;
  temp: number;
  spo2: number;
  paco2: number;
  etco2: number;
  pao2?: number;
  lvedp?: number;
  cpp_coronary?: number;
  diastoleTimeRatio?: number;
  mvo2?: number;
  mvo2Supply?: number;
  pip?: number;
}

export interface CardiovascularDrugEffects {
  drugSvrMod: number;
  drugInotropyMod: number;
  svrSympatheticSpike: number;
  contractilitySympatheticSpike: number;
  hrSympatheticSpike: number;
  shiveringHRDrive: number;
  anaphylaxisHrMod: number;
  anaphylaxisSvrMod: number;
  totalHrDelta: number;
  ruleHrScale: number;
  ruleHrOffset: number;
  ruleHrClamp?: number;
  ruleMapScale: number;
  ruleMapOffset: number;
  ruleKOffset: number;
  ruleSpo2Offset: number;
  catecholamineSensitivityMultiplier?: number; // from AdrenalEngine.ts's cortisol-driven permissive effect (Phase 2)
  alpha1ActivityIndex?: number; // aggregate exogenous + endogenous alpha-1 activity, for per-vascular-bed redistribution (Phase 2's receptor-unification piece)
  beta2ActivityIndex?: number;
  vasomotorSvrContribution?: number; // BrainstemEngine.ts's baroreflex vasoconstrictive arm (Phase 3), additive to targetSVR
  pregnancySvrMultiplier?: number; // PregnancyPhysiologyEngine.ts (Phase 4), multiplicative on targetSVR
}

export interface ResuscitationOutput {
  patient: PatientState;
  vitals: VitalsState;
  events: string[];
}

export class CardiovascularEngine {
  /**
   * Ticks the cardiovascular system forward by 1 second.
   * Deterministic, headless, and 100% mathematically faithful to the Golden Version equations.
   */
  static tick(
    dt: number = 1,
    st: { patient: PatientState; vitals: VitalsState; time: number; electrolytes: { k: number } },
    drugEffects: CardiovascularDrugEffects,
    inputs: {
      currentMac: number;
      bloodLossRatio: number;
      currentEbl: number;
      positionPreloadMod: number;
      positionHydrostaticMod: number;
      shiveringMultiplier: number;
      seizureMetabolicMultiplier: number;
      cyanideVO2Mod: number;
      VO2_sec: number;
      currentBuffer: number;
      currentFRC_L: number;
      newTemp: number;
      newPaCO2: number;
      activeMeds: { name: string; A1: number }[];
      getAnatomicalParameter: (keyword: string, defaultValue: number) => number;
      currentHb?: number;
      vasopressinLevel?: number;
      angiotensinIILevel?: number;
      lastCvSeverity?: number;
      lastCvToxicityActive?: boolean;
      /** Injected deterministic RNG (Layer 1A). Defaults to Math.random when omitted. */
      rng?: () => number;
    }
  ): ResuscitationOutput {
    const events: string[] = [];
    const rng = inputs.rng || Math.random;
    const patient = { ...st.patient };
    const vitals = { ...st.vitals };

    // Sanitizing inputs defensively to prevent NaN/Infinity propagation
    const safeTime = typeof st.time === 'number' && Number.isFinite(st.time) ? st.time : 0;
    const safeElectrolytes = st.electrolytes || {};
    const safeK = typeof safeElectrolytes.k === 'number' && Number.isFinite(safeElectrolytes.k) ? safeElectrolytes.k : 4.0;
    const safeHR = typeof vitals.hr === 'number' && Number.isFinite(vitals.hr) ? vitals.hr : 70;
    const safeSys = typeof vitals.sys === 'number' && Number.isFinite(vitals.sys) ? vitals.sys : 120;
    const safeDia = typeof vitals.dia === 'number' && Number.isFinite(vitals.dia) ? vitals.dia : 80;
    const safeMap = typeof vitals.map === 'number' && Number.isFinite(vitals.map) ? vitals.map : 90;
    const safeCO = typeof vitals.co === 'number' && Number.isFinite(vitals.co) ? vitals.co : 5.0;
    // Vasomotor TONE SVR drives the four-chamber model + reflexes. Read the persisted tone
    // (`svrTone`) rather than the displayed `svr`, which as of the Layer 2 F5 fix is the
    // identity-consistent measured value 80*(MAP-CVP)/CO, not the tone. Fall back to `svr` for the
    // first tick / callers that don't carry svrTone.
    const safeSVR = typeof (vitals as any).svrTone === 'number' && Number.isFinite((vitals as any).svrTone)
      ? (vitals as any).svrTone
      : (typeof vitals.svr === 'number' && Number.isFinite(vitals.svr) ? vitals.svr : 1200);

    const safeCurrentMac = typeof inputs.currentMac === 'number' && Number.isFinite(inputs.currentMac) ? Math.max(0, inputs.currentMac) : 0;
    const safeBloodLossRatio = typeof inputs.bloodLossRatio === 'number' && Number.isFinite(inputs.bloodLossRatio) ? Math.max(0, Math.min(1.0, inputs.bloodLossRatio)) : 0;
    const safeCurrentEbl = typeof inputs.currentEbl === 'number' && Number.isFinite(inputs.currentEbl) ? Math.max(0, inputs.currentEbl) : 0;
    const safePreloadMod = typeof inputs.positionPreloadMod === 'number' && Number.isFinite(inputs.positionPreloadMod) ? inputs.positionPreloadMod : 0;
    const safeHydrostaticMod = typeof inputs.positionHydrostaticMod === 'number' && Number.isFinite(inputs.positionHydrostaticMod) ? inputs.positionHydrostaticMod : 0;
    const safeShiveringMultiplier = typeof inputs.shiveringMultiplier === 'number' && Number.isFinite(inputs.shiveringMultiplier) ? Math.max(0, inputs.shiveringMultiplier) : 1.0;
    const safeBuffer = typeof inputs.currentBuffer === 'number' && Number.isFinite(inputs.currentBuffer) ? Math.max(0, inputs.currentBuffer) : 0.5;
    const safeFRC_L = typeof inputs.currentFRC_L === 'number' && Number.isFinite(inputs.currentFRC_L) && inputs.currentFRC_L > 0 ? inputs.currentFRC_L : 2.4;
    const safeNewTemp = typeof inputs.newTemp === 'number' && Number.isFinite(inputs.newTemp) ? Math.max(20, Math.min(45, inputs.newTemp)) : 37;
    const safeVasopressinLevel = typeof inputs.vasopressinLevel === 'number' && Number.isFinite(inputs.vasopressinLevel) ? Math.max(0, Math.min(1.0, inputs.vasopressinLevel)) : 0.1;
    const safeAngiotensinIILevel = typeof inputs.angiotensinIILevel === 'number' && Number.isFinite(inputs.angiotensinIILevel) ? Math.max(0, Math.min(1.0, inputs.angiotensinIILevel)) : 0.1;

    const safeAlpha1ActivityIndex = typeof drugEffects.alpha1ActivityIndex === 'number' && Number.isFinite(drugEffects.alpha1ActivityIndex) ? Math.max(0, drugEffects.alpha1ActivityIndex) : 0;
    const safeBeta2ActivityIndex = typeof drugEffects.beta2ActivityIndex === 'number' && Number.isFinite(drugEffects.beta2ActivityIndex) ? Math.max(0, drugEffects.beta2ActivityIndex) : 0;
    const safeDrugSvrMod = typeof drugEffects.drugSvrMod === 'number' && Number.isFinite(drugEffects.drugSvrMod) ? Math.max(0.1, drugEffects.drugSvrMod) : 1.0;
    const safeDrugInotropyMod = typeof drugEffects.drugInotropyMod === 'number' && Number.isFinite(drugEffects.drugInotropyMod) ? Math.max(0.1, drugEffects.drugInotropyMod) : 1.0;
    let safeSvrSympatheticSpike = typeof drugEffects.svrSympatheticSpike === 'number' && Number.isFinite(drugEffects.svrSympatheticSpike) ? drugEffects.svrSympatheticSpike : 0;
    let safeContractilitySympatheticSpike = typeof drugEffects.contractilitySympatheticSpike === 'number' && Number.isFinite(drugEffects.contractilitySympatheticSpike) ? drugEffects.contractilitySympatheticSpike : 0;
    // Cortisol's graduated permissive effect on catecholamine receptor responsiveness
    // (AdrenalEngine.ts, Phase 2) replaces the old fixed 0.6x `adrenalSuppressionActive`
    // discount -- a continuous function of actual cortisol level (which itself responds
    // to etomidate suppression/dexamethasone coverage over real kinetics) rather than an
    // instant on/off switch. Falls back to the old fixed 0.6x if the new engine's output
    // isn't supplied (e.g. older test fixtures), preserving existing behavior exactly.
    const catecholamineSensitivityMultiplier = typeof drugEffects.catecholamineSensitivityMultiplier === 'number' && Number.isFinite(drugEffects.catecholamineSensitivityMultiplier)
      ? drugEffects.catecholamineSensitivityMultiplier
      : (patient.adrenalSuppressionActive ? 0.6 : 1.0);
    safeSvrSympatheticSpike *= catecholamineSensitivityMultiplier;
    safeContractilitySympatheticSpike *= catecholamineSensitivityMultiplier;
    let safeHrSympatheticSpike = typeof drugEffects.hrSympatheticSpike === 'number' && Number.isFinite(drugEffects.hrSympatheticSpike) ? drugEffects.hrSympatheticSpike : 0;
    
    // Calculate LAST Cardiotoxicity (tCv) and Cocaine NET Blockade Sympathetic Surge
    let tCv = typeof inputs.lastCvSeverity === 'number' && Number.isFinite(inputs.lastCvSeverity) ? inputs.lastCvSeverity * 1.3 : 0.0;
    let cocaineHrSpike = 0;
    let cocaineSvrSpike = 0;
    let cocaineContractilitySpike = 0;

    const currentPh = typeof (vitals as any).ph === 'number' ? (vitals as any).ph : (st.electrolytes as any)?.ph || 7.4;
    const age = patient.age || 40;
    const ageFactor = (age < 1) ? 0.5 : 1.0;
    const acidosisFactor = Math.max(0.5, 1.0 - Math.max(0, 7.4 - currentPh) * 0.5);

    // Acidemia blunting: pH < 7.2 blunts cardiac inotropy/contractility and SVR vasoconstrictive response.
    // In severe acidosis (e.g. pH 6.8), adrenergic receptors are protonated and desensitized.
    const acidosisSvrBlunting = Math.max(0.4, 1.0 - Math.max(0, 7.2 - currentPh) * 1.5);
    const acidosisInotropyBlunting = Math.max(0.3, 1.0 - Math.max(0, 7.2 - currentPh) * 1.8);

    safeSvrSympatheticSpike *= acidosisSvrBlunting;
    safeContractilitySympatheticSpike *= acidosisInotropyBlunting;

    const lipidSinkVol = (patient as any).lipidSinkVol || 0;
    const safeEbvVal = typeof patient.ebv === 'number' && Number.isFinite(patient.ebv) && patient.ebv > 0 ? patient.ebv : 5000;
    const vLipid = lipidSinkVol / safeEbvVal;

    if (inputs.activeMeds) {
      inputs.activeMeds.forEach(m => {
        const med = m as any;
        const ce = med.Ce || 0;

        if (med.name === 'Cocaine') {
          const thresholdCns = 0.5;
          const ccCnsRatio = 3.0;
          const pb = 0.90;
          const kLipid = 30.0;
          if (ce > 0.01) {
            const sens = ce / (ce + 0.1);
            cocaineHrSpike = 35.0 * sens;
            cocaineSvrSpike = 400.0 * sens;
            cocaineContractilitySpike = 0.5 * sens;

            const freeFraction = 1.0 - pb * acidosisFactor * ageFactor;
            const fLipidBound = (kLipid * vLipid) / (1.0 + kLipid * vLipid);
            const ceFree = ce * freeFraction * (1.0 - fLipidBound);
            tCv += ceFree / (thresholdCns * ccCnsRatio);
          }
        }
      });
    }

    safeSvrSympatheticSpike += cocaineSvrSpike;
    safeContractilitySympatheticSpike += cocaineContractilitySpike;
    safeHrSympatheticSpike += cocaineHrSpike;

    const safeShiveringHRDrive = typeof drugEffects.shiveringHRDrive === 'number' && Number.isFinite(drugEffects.shiveringHRDrive) ? drugEffects.shiveringHRDrive : 0;
    const safeAnaphylaxisHrMod = typeof drugEffects.anaphylaxisHrMod === 'number' && Number.isFinite(drugEffects.anaphylaxisHrMod) ? drugEffects.anaphylaxisHrMod : 0;
    const safeAnaphylaxisSvrMod = typeof drugEffects.anaphylaxisSvrMod === 'number' && Number.isFinite(drugEffects.anaphylaxisSvrMod) ? drugEffects.anaphylaxisSvrMod : 1.0;

    let totalHrDelta = typeof drugEffects.totalHrDelta === 'number' && Number.isFinite(drugEffects.totalHrDelta) ? drugEffects.totalHrDelta : 0;

    // Autonomic reflexes: Baroreceptor Reflex
    let baroreflexGain = Math.max(0, 1.0 - safeCurrentMac * 0.67);
    if (patient.isAwarenessActive) {
      baroreflexGain = 0; // Overridden by central sympathetic surge during awareness crisis
    }
    if (patient.ziconotideHypotensionActive) {
      baroreflexGain *= 0.15; // reduces baroreflexGain by 85%
    }
    const baseSBP_set = patient.patientBaseSBP || 120;
    const baseDBP_set = patient.patientBaseDBP || 80;
    const MAP_set = baseDBP_set + (baseSBP_set - baseDBP_set) / 3.0;
    const errorBaro = safeMap - MAP_set;
    let autonomicHrMod = Math.max(-25, Math.min(30, -1.2 * errorBaro * baroreflexGain));

    if (autonomicHrMod < 0 && totalHrDelta > 15) {
      autonomicHrMod = 0; // Vagal tone blocked by antimuscarinics (Atropine/Glycopyrrolate)
    }

    let isArrestState = patient.isArrest;
    let currentRhythm = patient.cardiacRhythm;

    // Neostigmine Vagal Bradycardia Arrest Trigger
    if (patient.bradycardiaTriggered && patient.bradycardiaTime !== undefined) {
      const bradycardiaDuration = Math.max(0, safeTime - patient.bradycardiaTime);
      const bradycardiaHrDrop = Math.min(60, bradycardiaDuration * 2.5); // rapid drop
      totalHrDelta -= bradycardiaHrDrop;

      const expectedHR = safeHR + totalHrDelta;
      if (expectedHR < 15 && !isArrestState) {
        isArrestState = true;
        currentRhythm = 'asystole';
        events.push('🚨 CRITICAL EMERGENCY: Neostigmine-induced profound vagal bradycardia led to cardiac arrest (Asystole)!');
      }
    }

    // Portopulmonary Hypertension (PoPH) Right Ventricular Failure Arrest Trigger
    if (patient.hasPoPHCollapse && !isArrestState) {
      isArrestState = true;
      currentRhythm = 'pea';
      events.push('🚨 CRITICAL EMERGENCY: Acute right ventricular failure from Portopulmonary Hypertension (PoPH) triggered PEA cardiac arrest!');
    }

    // Preload & Contractility Calculus
    const safeEbv = typeof patient.ebv === 'number' && Number.isFinite(patient.ebv) && patient.ebv > 0 ? patient.ebv : 5000;
    const volumeOffset = (patient.intravascularVolume || 0) > 2000 && patient.isAwarenessActive
      ? (patient.intravascularVolume || 0) - safeEbv 
      : (patient.intravascularVolume || 0);

    // Splanchnic vasculature follows the same visceral sympathetic chain as the GI organs it
    // perfuses (TABLE 15.2, Miller's 9th Ed: T5-L1 via the celiac plexus, spanning liver/
    // biliary through sigmoid/rectum). Celiac plexus block silences this directly; a thoracic
    // epidural's effect is graded by dermatomal overlap via `epiduralLevel`, AND by local
    // anesthetic concentration via the differential nerve block model (Phase 3, Stage A of
    // mutable-roaming-newell.md) -- sympathetic B-fibers are the most susceptible fiber
    // class, so even a dilute, motor-sparing ("labor epidural" strength) block still
    // produces substantial sympathetic blockade; `epiduralConcentrationIndex` defaults to
    // 1.0 (surgical strength) when not specified, preserving the prior flat-coverage
    // assumption almost exactly (sympathetic fibers are >99% blocked at that concentration).
    const epiduralSpatialCoverage = patient.epiduralBlockActive
      ? calculateDermatomalBlockFraction(patient.epiduralLevel, 5, 13)
      : 0.0;
    const epiduralSplanchnicCoverage = calculateDifferentialDermatomalBlock(
      epiduralSpatialCoverage, 'sympathetic', patient.epiduralConcentrationIndex
    );
    const sympatheticBlock = patient.celiacBlockActive ? 1.0 : epiduralSplanchnicCoverage;
    const hasNeoSynephrine = inputs.activeMeds.some(m => m.name === 'Phenylephrine' && m.A1 > 0.1);
    const hasNorepi = inputs.activeMeds.some(m => m.name === 'Norepinephrine' && m.A1 > 0.1);
    const hasEpi = inputs.activeMeds.some(m => m.name === 'Epinephrine' && m.A1 > 0.1);
    const alphaAgonistEffect = (hasNeoSynephrine || hasNorepi || hasEpi) ? 1.0 : 0.0;
    const splanchnicVol = 1.0 + 0.3 * sympatheticBlock * (1.0 - alphaAgonistEffect);
    // Splanchnic pooling is now a real venous-compartment mechanism inside
    // FourChamberCircuitModel.ts (Phase 1 of mutable-roaming-newell.md) rather than a flat
    // volume offset subtracted here -- `splanchnicTone` (inverse of the pooling multiplier
    // above: lower tone = more sympathetic-block-driven dilation = more unstressed venous
    // capacity recruited) is passed through to both engine calls below instead.
    const splanchnicTone = Math.max(0.3, 1.0 / splanchnicVol);

    // Third-spacing (Phase 1, Stage B/C of mutable-roaming-newell.md): fluid the
    // LymphaticSystemModel.ts engine has lost to the interstitium faster than lymphatics
    // can return it is no longer part of effective circulating volume -- the real
    // mechanism behind "normal" or even elevated total body fluid coexisting with
    // relative intravascular hypovolemia (sepsis/capillary-leak states, burns).
    const rawThirdSpacedVolumeMl = (patient as any).thirdSpacedVolumeMl;
    const thirdSpacedVolumeMl = typeof rawThirdSpacedVolumeMl === 'number' && Number.isFinite(rawThirdSpacedVolumeMl) ? Math.max(0, rawThirdSpacedVolumeMl) : 0;
    const effectiveIntravascularVolume = Math.max(100, safeEbv - safeCurrentEbl + safePreloadMod + volumeOffset - thirdSpacedVolumeMl);
    // Thyroid status influences baseline inotropy and vascular tone (Phase 2, Graves' disease/storm)
    const thyroidFunctionIndex = typeof patient.thyroidFunctionIndex === 'number' && Number.isFinite(patient.thyroidFunctionIndex) ? patient.thyroidFunctionIndex : 1.0;
    const thyroidStormActive = !!patient.thyroidStormActive;

    let thyroidInotropyMod = 1.0;
    if (thyroidFunctionIndex > 1.0) {
      thyroidInotropyMod += 0.35 * (thyroidFunctionIndex - 1.0);
    }
    if (thyroidStormActive) {
      thyroidInotropyMod += 0.85; // hyperdynamic storm contractility boost
    }

    let newStunning = typeof patient.myocardialStunning === 'number' && Number.isFinite(patient.myocardialStunning) ? patient.myocardialStunning : 0;
    let lastInotropyScale = 1.0;
    if (tCv >= 0.5) {
      lastInotropyScale = Math.max(0.05, 1.0 - 0.7 * (tCv - 0.5));
    }
    const inotropyInitial = Math.max(0.01, (1.0 - (newStunning / 100) + safeContractilitySympatheticSpike + (safeDrugInotropyMod - 1.0)) * lastInotropyScale * thyroidInotropyMod);

    // Severe Aortic Stenosis (Fig 14.4, Miller's 9th Ed): the fixed outflow obstruction drives
    // compensatory concentric LV hypertrophy via Laplace's law (wall stress = P*R/(2*wall thickness)) —
    // increased wall thickness normalizes wall stress despite elevated LV pressure, but the resulting
    // ventricle is diastolically stiff and preload-dependent (requires higher filling pressure for the
    // same end-diastolic volume) with little reserve to recruit additional stroke volume.
    const isAorticStenosis = !!(patient.as || patient.aorticStenosis);

    // Left Ventricular End-Diastolic Pressure (LVEDP) -- now a direct output of the
    // closed four-chamber RA-RV-PA-LA-LV-Aorta ODE (Phase 0, Stage E of
    // /Users/jsriverab/.claude/plans/mutable-roaming-newell.md) rather than a separate
    // algebraic formula. Called here with `inotropyInitial` (pre-ischemia-loop) because
    // the ischemia-detection loop below needs this tick's CPP/MVO2 *before* stunning is
    // updated -- mirroring the original formula's same inotropyInitial/inotropyFinal
    // split, just sourced from the new engine instead of a separate equation. TR/MR/
    // AV-dissociation aren't yet patient-state flags read by this tick engine (they
    // currently drive only the CVP/PA-catheter waveform display layer) so default to
    // absent here; the unified model still accepts them for that display layer's use.
    // Neurohormonal venoconstriction (TABLE 14.1, Miller's 9th Ed): vasopressin/Angiotensin
    // II don't just act directly on the heart (neurohormonalInotropy/HRdelta below) -- their
    // physiologic role in hemorrhagic shock compensation is substantially venoconstrictive,
    // shifting blood from venous capacitance into the effective circulating volume that
    // reaches the heart. Applied as an "effective volume" boost on top of the real
    // venous-compartment model's own SVR-driven venoconstriction (Phase 1 of mutable-
    // roaming-newell.md) -- a disclosed proxy for hormone-specific venoconstriction beyond
    // what the generic sympathetic-tone signal already captures, not yet its own tracked
    // compartment-volume shift. Coefficients recalibrated down (0.20/0.15 -> 0.08/0.06)
    // after the real venous-compartment model (Phase 1) turned out far more volume-
    // sensitive than the old preloadRatio-based model this was originally tuned against --
    // the prior magnitude pushed MAP into the 140s+ at max AVP/AngII, triggering a
    // baroreflex overcorrection that dropped HR below baseline instead of raising it.
    const neurohormonalPreloadBoost = 1.0 + 0.08 * Math.max(0, safeVasopressinLevel - 0.1) + 0.06 * Math.max(0, safeAngiotensinIILevel - 0.1);
    const volumeScaleFactor = 5000 / safeEbv;
    const totalBloodVolumeForCycle = Math.max(250, effectiveIntravascularVolume * neurohormonalPreloadBoost * volumeScaleFactor);
    const lvedpVal = simulateFourChamberCycle({
      hr: safeHR,
      inotropy: inotropyInitial,
      svr: safeSVR,
      totalBloodVolumeMl: totalBloodVolumeForCycle,
      splanchnicTone,
      alpha1ActivityIndex: safeAlpha1ActivityIndex,
      beta2ActivityIndex: safeBeta2ActivityIndex,
      aorticStenosis: isAorticStenosis,
      chf: !!patient.chf,
      ef: patient.ef,
      afib: !!(patient.afib || patient.hasAFib || patient.cardiacRhythm === 'afib'),
      prIntervalMs: (patient as any).prInterval,
    }).aggregates.lvedp;

    // Coronary Perfusion Pressure (CPP_coronary = DBP - LVEDP)
    const cppCoronaryVal = Math.max(5.0, safeDia - lvedpVal);

    // Diastolic Time Ratio (DiastoleTimeRatio = (60 - 0.2 * HR) / 60)
    const diastoleTimeRatioVal = Math.max(0.20, Math.min(0.85, (60.0 - 0.2 * safeHR) / 60.0));

    // Radius Modifier (RadiusMod = 1.0 + max(0, (LVEDP - 12) / 15))
    const radiusModVal = 1.0 + Math.max(0, (lvedpVal - 12.0) / 15.0);

    // Myocardial Oxygen Demand (MVO2 = HR * SBP * Inotropy * RadiusMod)
    const mvo2Val = safeHR * safeSys * inotropyInitial * radiusModVal;

    // Myocardial Oxygen Supply (Supply_myo = CPP_coronary * DiastoleTimeRatio * CaO2 * coronaryStenosisMod * 8.5)
    const safeCurrentHb = typeof inputs.currentHb === 'number' && Number.isFinite(inputs.currentHb) ? inputs.currentHb : 14.0;
    const safePaO2 = typeof vitals.pao2 === 'number' && Number.isFinite(vitals.pao2) ? vitals.pao2 : 100;
    const safeCurrentSpo2 = typeof vitals.spo2 === 'number' && Number.isFinite(vitals.spo2) ? vitals.spo2 : 98;
    const safeRuleSpo2Offset = typeof drugEffects.ruleSpo2Offset === 'number' && Number.isFinite(drugEffects.ruleSpo2Offset) ? drugEffects.ruleSpo2Offset : 0;
    const newSpo2 = Math.max(0, Math.min(100, safeCurrentSpo2 + safeRuleSpo2Offset));
    const caO2Val = safeCurrentHb * 1.34 * (newSpo2 / 100) + safePaO2 * 0.0031;
    // CAD mod: 0.40 was too aggressive — at rest, stable CAD patients are NOT in cardiogenic
    // shock. 0.40 gave supply/demand = 0.27 at rest, causing immediate ischemia.
    // 0.65 represents significant-but-compensated CAD (50-70% stenosis with preserved
    // resting flow). Ischemia only fires during stress (tachycardia, hypotension, anemia).
    const coronaryStenosisModVal = (patient.cad || patient.hasCAD) ? 0.65 : 1.0;
    // Supply multiplier 12.0→18.0 to give realistic coronary reserve at rest for healthy hearts
    // and align CAD ischemia onset with clinical RPP thresholds (~14,000).
    const supplyVal = cppCoronaryVal * diastoleTimeRatioVal * caO2Val * coronaryStenosisModVal * 18.0;

    // Ischemia & Stunning Loop — with 25% demand-excess safety margin before ischemia fires.
    // In physiology, coronary autoregulation and metabolic vasodilation maintain adequate
    // supply across a range of demands. Only when demand exceeds supply by >25% (beyond
    // the coronary reserve) does true supply-demand ischemia begin.
    // Anesthetic-Induced Ischemic Preconditioning (Ch19, Miller's 9th Ed).
    const anestheticPreconditioning = Math.min(0.3, 0.3 * safeCurrentMac);
    let stunningIncrease = 0;
    // isCurrentlyIschemic: fires only when demand exceeds supply by >25% (exhausted reserve).
    const isCurrentlyIschemic = (supplyVal * 1.25 < mvo2Val) && !isArrestState;
    if (isCurrentlyIschemic) {
      stunningIncrease = Math.round((mvo2Val - supplyVal) * 0.0000381 * (1.0 - anestheticPreconditioning) * 10) / 10;
      newStunning = Math.min(60, Math.max(0, newStunning + stunningIncrease));
    }

    if (isCurrentlyIschemic && newStunning >= 1.0) {
      if (!patient.ischemiaActive) {
        patient.ischemiaActive = true;
        let msg = `⚠️ MYOCARDIAL ISCHEMIA: Oxygen supply fails to meet metabolic demand! Stunning is beginning (Stunning: ${newStunning.toFixed(1)}%).\n`;
        msg += `• Pathophysiology: `;
        const details: string[] = [];
        if (safeHR > 95) {
          details.push(`Tachycardia (HR: ${safeHR} bpm) limits diastolic coronary perfusion time`);
        }
        if (safeDia < 65) {
          details.push(`Hypotension (DBP: ${safeDia} mmHg) reduces coronary perfusion pressure`);
        }
        if (lvedpVal > 18) {
          details.push(`High preload (LVEDP: ${Math.round(lvedpVal)} mmHg) compresses subendocardial vessels`);
        }
        if (newSpo2 < 92) {
          details.push(`Hypoxia (SpO2: ${newSpo2.toFixed(0)}%) reduces arterial oxygen content`);
        }
        if (safeCurrentHb < 9.0) {
          details.push(`Anemia (Hb: ${safeCurrentHb.toFixed(1)} g/dL) reduces oxygen carrying capacity`);
        }
        if (patient.cad || patient.hasCAD) {
          details.push(`Coronary Artery Disease limits flow reserve`);
        }
        if (isAorticStenosis) {
          details.push(`Fixed valvular orifice (Aortic Stenosis) prevents compensatory stroke volume increase, and concentric LV hypertrophy elevates myocardial oxygen demand`);
        }
        if (details.length === 0) {
          details.push(`Increased cardiac workload (MVO2: ${Math.round(mvo2Val)}) exceeds coronary delivery`);
        }
        msg += details.join(", ") + ".\n";

        msg += `• Interventions: `;
        const interventions: string[] = [];
        if (safeHR > 95) {
          interventions.push(`Control heart rate (e.g., titrate [esmolol] or deepen anesthesia)`);
        }
        if (safeDia < 65 || safeMap < 65) {
          interventions.push(`Raise perfusion pressure (e.g., administer [phenylephrine] or [norepinephrine] bolus/infusion)`);
        }
        if (newSpo2 < 92) {
          interventions.push(`Optimize ventilation / increase inspired oxygen fraction (FiO2)`);
        }
        if (safeCurrentHb < 9.0) {
          interventions.push(`Consider blood transfusion (PRBC)`);
        }
        if (isAorticStenosis) {
          interventions.push(`Maintain sinus rhythm and avoid further tachycardia; treat with phenylephrine/norepinephrine rather than fluid boluses if the cause is reduced SVR`);
        }
        if (interventions.length === 0) {
          interventions.push(`Deepen anesthetic or reduce surgical stress to lower heart rate and afterload`);
        }
        msg += interventions.join("; ") + ".";
        events.push(msg);
      } else {
        // Severity progression warnings
        if (newStunning >= 10.0 && !patient.ischemiaMildLogged) {
          patient.ischemiaMildLogged = true;
          events.push(`⚠️ MYOCARDIAL ISCHEMIA PROGRESSION: Stunning has reached ${newStunning.toFixed(1)}%. Wall motion abnormalities and subendocardial hypokinesia are developing. Deepen anesthesia, slow the heart, or support MAP!`);
        }
        if (newStunning >= 30.0 && !patient.ischemiaSevereLogged) {
          patient.ischemiaSevereLogged = true;
          events.push(`🚨 SEVERE MYOCARDIAL ISCHEMIA: Stunning has reached ${newStunning.toFixed(1)}%. High risk of cardiogenic shock and critical low cardiac output failure. Intervene immediately to restore supply-demand balance!`);
        }
      }
    } else if (!isCurrentlyIschemic && patient.ischemiaActive) {
      patient.ischemiaActive = false;
      patient.ischemiaMildLogged = false;
      patient.ischemiaSevereLogged = false;
      events.push(`✅ MYOCARDIAL ISCHEMIA RESOLVED: Coronary perfusion supply now meets myocardial metabolic demand. Myocardial stunning has stabilized and is recovering.`);
    }

    const inotropyFinal = Math.max(0.01, (1.0 - (newStunning / 100) + safeContractilitySympatheticSpike + (safeDrugInotropyMod - 1.0)) * lastInotropyScale * thyroidInotropyMod) * acidosisInotropyBlunting;

    // Neurohormonal cardiac support (TABLE 14.1, Miller's 9th Ed): vasopressin and angiotensin II
    // exert direct +inotropy/+chronotropy via V1a/AT1 myocardial receptors. Both rise above their
    // RenalEngine.ts baseline (~0.1) during hypovolemia/stress, becoming clinically relevant mainly
    // in shock states. Aldosterone's cardiac action cell is blank in Table 14.1 (mineralocorticoid/
    // fibrotic, not contractile) and is intentionally NOT given a direct inotropic/chronotropic effect.
    const neurohormonalInotropy = 1.0 + 0.15 * Math.max(0, safeVasopressinLevel - 0.1) + 0.10 * Math.max(0, safeAngiotensinIILevel - 0.1);
    const neurohormonalHrDelta = 8.0 * Math.max(0, safeVasopressinLevel - 0.1) + 6.0 * Math.max(0, safeAngiotensinIILevel - 0.1);

    const shiveringHRDriveVal = (safeShiveringMultiplier > 1.0) ? ((safeShiveringMultiplier - 1.0) * 15) : 0;

    // AFib HR Flutter
    let afibHRFlutter = 0;
    if (patient.afib || patient.hasAFib || patient.cardiacRhythm === 'afib') {
      afibHRFlutter = (rng() - 0.5) * 12;
    }

    // Bezold-Jarisch Reflex
    let bjActive = false;
    if (newStunning > 25.0 || safeBloodLossRatio > 0.35) {
      bjActive = true;
      totalHrDelta -= 20; // Bradycardia efferent response
    }

    // Bainbridge Reflex
    let bainbridgeActive = false;
    let hrBainbridge = 0;
    if (lvedpVal > 18.0 && !bjActive) {
      bainbridgeActive = true;
      hrBainbridge = Math.max(0, Math.min(20, 1.5 * (lvedpVal - 18.0)));
    }

    // Oculocardiac Reflex
    const hasAntimuscarinic = inputs.activeMeds.some(m => (m.name === 'Atropine' || m.name === 'Glycopyrrolate') && m.A1 > 0.1);
    let oculocardiacActive = false;
    if (patient.oculocardiacTriggered && !hasAntimuscarinic) {
      oculocardiacActive = true;
      totalHrDelta -= 35;
    }

    // Beta-blocker compensatory tachycardia blunting
    let adjustedAutonomicHrMod = autonomicHrMod;
    let adjustedHypovolemicTachy = safeBloodLossRatio * 150;
    if (patient.onBetaBlocker || patient.hasBetaBlocker || patient.betaBlocker) {
      adjustedAutonomicHrMod *= 0.15;
      adjustedHypovolemicTachy *= 0.15;
    }

    const baseHR = typeof patient.patientBaseHR === 'number' && Number.isFinite(patient.patientBaseHR) && patient.patientBaseHR > 0 ? patient.patientBaseHR : 70;
    let targetHR = Math.max(0, baseHR + totalHrDelta + adjustedAutonomicHrMod + adjustedHypovolemicTachy + safeHrSympatheticSpike + shiveringHRDriveVal + afibHRFlutter + safeAnaphylaxisHrMod + hrBainbridge + neurohormonalHrDelta);
    let lastHrPenalty = 0;
    if (tCv >= 0.5) {
      lastHrPenalty = 25.0 * (tCv - 0.5);
    }
    targetHR = Math.max(0, targetHR - lastHrPenalty);

    let prInterval = 160;
    let qrsDuration = 80;
    if (tCv >= 0.5) {
      prInterval = Math.round(160.0 * (1.0 + 0.8 * (tCv - 0.5)));
      qrsDuration = Math.round(80.0 * (1.0 + 1.5 * (tCv - 0.5)));
    }
    (patient as any).prInterval = prInterval;
    (patient as any).qrsDuration = qrsDuration;

    // Cushing's reflex bradycardia (Table 11.1, Fig. 11.3, Miller's 9th Ed).
    // Trigger CPP < 40 (corrected from 50): full triad requires profound brainstem hypoperfusion.
    // CPP 40-50 is the "watershed" zone — Cushing may start but the SVR surge below handles it.
    if (patient.icp && patient.cpp && patient.icp > 20.0 && patient.cpp < 40.0) {
      targetHR = Math.max(35, Math.min(targetHR, 35 + Math.max(0, patient.cpp) * 0.2));
    }

    const safeRuleHrScale = typeof drugEffects.ruleHrScale === 'number' && Number.isFinite(drugEffects.ruleHrScale) ? drugEffects.ruleHrScale : 1.0;
    const safeRuleHrOffset = typeof drugEffects.ruleHrOffset === 'number' && Number.isFinite(drugEffects.ruleHrOffset) ? drugEffects.ruleHrOffset : 0;
    targetHR = targetHR * safeRuleHrScale + safeRuleHrOffset;
    if (drugEffects.ruleHrClamp !== undefined && Number.isFinite(drugEffects.ruleHrClamp)) targetHR = Math.min(drugEffects.ruleHrClamp, targetHR);
    targetHR = Math.max(0, targetHR);

    const baseSV = typeof patient.patientBaseSV === 'number' && Number.isFinite(patient.patientBaseSV) && patient.patientBaseSV > 0 ? patient.patientBaseSV : 70;

    // SVR computation (afterload -- an INPUT to the chamber model below, not something it
    // derives; vasomotor tone is set by sympathetic/septic/drug/reflex state, independent
    // of cardiac mechanics).
    const baseSVR = typeof patient.patientBaseSVR === 'number' && Number.isFinite(patient.patientBaseSVR) && patient.patientBaseSVR > 0 ? patient.patientBaseSVR : 1200;
    // Sepsis SVR reduction: replaced the prior flat isSeptic ? 0.6 with a continuous
    // sepsisScore-driven multiplier from SepsisCascadeModel.ts (Phase 5, Stage 4).
    // Same calibration at peak severity (score=3): 1 - 0.40 = 0.60 -- matching the prior
    // flat value so existing cases behave identically at maximum untreated severity.
    const safeSepsisScore = typeof (patient as any).sepsisScore === 'number' && Number.isFinite((patient as any).sepsisScore) ? (patient as any).sepsisScore : (patient.isSeptic ? 3 : 0);
    const sepsisVasoplegiaMod = patient.isSeptic ? (1 - 0.40 * safeSepsisScore / 3) : 1.0;
    let thyroidSvrMod = 1.0;
    if (thyroidFunctionIndex > 1.0) {
      thyroidSvrMod -= 0.15 * (thyroidFunctionIndex - 1.0); // direct thyroid-driven vasodilation
    }
    if (thyroidStormActive) {
      thyroidSvrMod -= 0.20; // severe hyperdynamic vasodilation
    }
    thyroidSvrMod = Math.max(0.4, thyroidSvrMod);

    let targetSVR = ((baseSVR * safeDrugSvrMod * thyroidSvrMod * sepsisVasoplegiaMod * safeAnaphylaxisSvrMod * (bjActive ? 0.75 : 1.0) * (1.0 - 0.15 * sympatheticBlock)) + safeSvrSympatheticSpike) * acidosisSvrBlunting;

    if (patient.ziconotideHypotensionActive) {
      const pos = patient.position || 'Supine';
      const isSittingOrRevT = pos === 'Sitting' || pos === 'Beach Chair' || pos === 'Rev Trendelenburg';
      if (isSittingOrRevT) {
        targetSVR *= 0.65; // 35% reduction total
      } else {
        targetSVR *= 0.80; // 20% reduction at baseline
      }
    }

    // Cushing's reflex SVR surge (Miller 9th Ed Ch 11)
    if (patient.icp && patient.cpp && patient.icp > 20.0 && patient.cpp < 40.0) {
      const cushingSvrMultiplier = 1.0 + 1.5 * (1.0 - Math.max(0, patient.cpp) / 40.0);
      targetSVR *= cushingSvrMultiplier;
    }

    // Vasomotor center's baroreflex-driven vasoconstrictive arm (BrainstemEngine.ts,
    // Phase 3) -- the baroreflex previously only ever drove heart rate in this engine;
    // this is the missing general-case vasoconstrictive contribution (Cushing's reflex
    // above remains its own separate, ICP-specific special case, unchanged).
    const safeVasomotorSvrContribution = typeof drugEffects.vasomotorSvrContribution === 'number' && Number.isFinite(drugEffects.vasomotorSvrContribution) ? drugEffects.vasomotorSvrContribution : 0;
    targetSVR += safeVasomotorSvrContribution;

    // Pregnancy's progesterone-mediated vasodilation (PregnancyPhysiologyEngine.ts, Phase 4) --
    // ~20% SVR reduction by term, one of the two main drivers (alongside the preload increase
    // fed in via positionPreloadMod) of pregnancy's ~40% cardiac output increase by term.
    const safePregnancySvrMultiplier = typeof drugEffects.pregnancySvrMultiplier === 'number' && Number.isFinite(drugEffects.pregnancySvrMultiplier) && drugEffects.pregnancySvrMultiplier > 0 ? drugEffects.pregnancySvrMultiplier : 1.0;
    targetSVR *= safePregnancySvrMultiplier;

    targetSVR = Math.max(50, targetSVR);

    // Final stroke volume / CO / MAP / SBP / DBP / LVEDP -- a second call into the
    // closed four-chamber circuit model (Phase 0, Stage E of /Users/jsriverab/.claude/
    // plans/mutable-roaming-newell.md), now with this tick's post-ischemia-loop
    // `inotropyFinal`, the just-computed `targetHR`/`targetSVR`, and this tick's
    // `prInterval`. Replaces the former Frank-Starling-curve SV formula, the
    // maxSV/afibSVModifier/chfInotropicPenalty multiplier stack, and the Ohm's-law
    // `(CO*SVR)/80` MAP/pulse-pressure-ratio SBP/DBP split with one coupled RA-RV-PA-LA-
    // LV-Aorta simulation; AS/CHF/AFib are read by the model directly (concentric
    // hypertrophy, diastolic stiffness, and atrial-kick loss respectively) rather than
    // as external caps layered on top of the old formula.
    const chamberOutput = simulateFourChamberCycle({
      hr: targetHR,
      inotropy: Math.max(0.1, inotropyFinal) * neurohormonalInotropy,
      svr: targetSVR,
      totalBloodVolumeMl: totalBloodVolumeForCycle,
      splanchnicTone,
      alpha1ActivityIndex: safeAlpha1ActivityIndex,
      beta2ActivityIndex: safeBeta2ActivityIndex,
      aorticStenosis: isAorticStenosis,
      chf: !!patient.chf,
      ef: patient.ef,
      afib: !!(patient.afib || patient.hasAFib || patient.cardiacRhythm === 'afib'),
      prIntervalMs: prInterval,
    });

    let currentSV = chamberOutput.aggregates.sv;
    let chamberCo = chamberOutput.aggregates.co;
    let chamberMap = chamberOutput.aggregates.map;
    let chamberSbp = chamberOutput.aggregates.sbp;
    let chamberDbp = chamberOutput.aggregates.dbp;

    if (patient.hasPneumothorax) {
      // Vena-cava compression collapses venous return -- modeled as a preload-equivalent
      // hit, scaling SV/CO/pressures together (the engine's own internal Ohm's-law-style
      // CO/SVR/MAP coupling, not a separately-derived pressure penalty).
      const pneumothoraxScale = 0.3;
      currentSV *= pneumothoraxScale;
      chamberCo *= pneumothoraxScale;
      chamberMap *= pneumothoraxScale;
      chamberSbp *= pneumothoraxScale;
      chamberDbp *= pneumothoraxScale;
    }
    const pipVal = vitals.pip || 0;
    if (pipVal >= 30.0) {
      // Fig 13.19 / §6.21: high airway pressure restricts venous return (decreases cardiac preload and SV by up to 30%)
      const recruitmentPreloadMod = Math.max(0.70, 1.0 - 0.015 * (pipVal - 20.0));
      currentSV *= recruitmentPreloadMod;
      chamberCo *= recruitmentPreloadMod;
      chamberMap *= recruitmentPreloadMod;
      chamberSbp *= recruitmentPreloadMod;
      chamberDbp *= recruitmentPreloadMod;
    }
    currentSV = Math.max(0.1, currentSV);

    const targetCO = Math.max(0, Math.min(30.0, chamberCo));

    // Systemic MAP Shifts not yet modeled inside the chamber engine (sepsis's distributive
    // shock pathophysiology -- pathologic AV shunting/maldistributed flow -- is a separate
    // mechanism from this engine's preload/afterload/contractility inputs; folding sepsis's
    // SVR reduction into `targetSVR` above already captures most of its hypotension, this
    // is the residual distributive-shock component).
    const sepsisMAPShift = patient.isSeptic ? -10 : 0;

    // CO now comes directly out of the same coherent chamber-mechanics computation as SV/
    // MAP/SBP/DBP (all read undamped, immediately responsive each tick -- the original
    // "snap to target if close" damping existed specifically to resolve CO and SVR being
    // independently-sourced quantities recombined via Ohm's law; that risk doesn't exist
    // here, and keeping CO damped while everything else from the same engine call is
    // undamped produced a real artifact: whichever of two compared scenarios happened to
    // have its target closer to the fixture's starting CO would "snap" fully while the
    // other only moved 10%, occasionally reversing the expected ordering). SVR keeps its
    // own damping -- it's an independent input (vasomotor tone), not a chamber-engine
    // output, and physiologically does ramp smoothly with receptor occupancy.
    let newCO = targetCO;
    let newSVR = safeSVR + (targetSVR - safeSVR) * 0.1;
    if (Math.abs(targetSVR - safeSVR) < 5) newSVR = targetSVR;

    const targetMapDamped = chamberMap + sepsisMAPShift;
    const targetSbpDamped = chamberSbp + sepsisMAPShift;
    const targetDbpDamped = chamberDbp + sepsisMAPShift;
    // Unlike CO/SVR (independently-sourced quantities the old formula recombined via
    // Ohm's law, needing damping to avoid instantaneous-recombination artifacts), MAP/SBP/
    // DBP here come directly out of one coherent ODE alongside SV -- which itself was
    // never damped in the original formula either. Reading them undamped each tick
    // preserves that same "stroke volume responds immediately to this tick's inputs"
    // behavior the original engine had.
    let exactMap = targetMapDamped;
    let dampedSbp = targetSbpDamped;
    let dampedDbp = targetDbpDamped;
    if (isArrestState) {
      exactMap = targetMapDamped;
    }

    if (patient.ziconotideHypotensionActive) {
      const pos = patient.position || 'Supine';
      const isSittingOrRevT = pos === 'Sitting' || pos === 'Beach Chair' || pos === 'Rev Trendelenburg';
      if (isSittingOrRevT) {
        exactMap = Math.max(15, exactMap - 15); // drop MAP by an additional 15 mmHg
      }
    }
    const safeRuleMapScale = typeof drugEffects.ruleMapScale === 'number' && Number.isFinite(drugEffects.ruleMapScale) ? drugEffects.ruleMapScale : 1.0;
    const safeRuleMapOffset = typeof drugEffects.ruleMapOffset === 'number' && Number.isFinite(drugEffects.ruleMapOffset) ? drugEffects.ruleMapOffset : 0;
    exactMap = exactMap * safeRuleMapScale + safeRuleMapOffset;
    exactMap = Math.min(220, Math.max(15, exactMap));

    // Pulse pressure now comes directly from the chamber engine's damped SBP/DBP rather
    // than a separately-derived ratio; basePP is kept only as the half-width used by the
    // myocardial-stunning/noise terms below, computed from the damped pressures themselves.
    const basePP = Math.max(5, dampedSbp - dampedDbp);

    // Myocardial stunning map cap
    if (newStunning > 0 && !isArrestState) {
      exactMap = Math.max(15, exactMap - newStunning);
    }

    const rrVal = typeof vitals.rr === 'number' && Number.isFinite(vitals.rr) ? Math.max(4, vitals.rr) : 12;
    const respPeriod = 60 / rrVal;
    const respPhase = safeTime * 2 * Math.PI / respPeriod;
    
    // Respiratory Sinus Arrhythmia & BP respiratory variations (intrathoracic pressure swings)
    const rsaEffect = isArrestState ? 0 : Math.sin(respPhase) * 1.3;
    const respBpVar = isArrestState ? 0 : Math.sin(respPhase) * 2.2;

    // Slow homeostatic vasomotor waves (Traube-Hering-Mayer waves, 10s period)
    const thmEffect = isArrestState ? 0 : Math.sin(safeTime * 2 * Math.PI / 10.0) * 0.9;

    // Micro-fluctuations (Pulse Rate Variability / minor blood pressure noise)
    const hrMicro = isArrestState ? 0 : (rng() - 0.5) * 0.4;
    const bpMicro = isArrestState ? 0 : (rng() - 0.5) * 0.7;

    const hrNoise = rsaEffect + thmEffect * 0.2 + hrMicro;
    const sysNoise = respBpVar + thmEffect + bpMicro * 1.5;
    const diaNoise = respBpVar * 0.7 + thmEffect * 0.8 + bpMicro;
    const mapNoise = respBpVar * 0.8 + thmEffect * 0.9 + bpMicro * 1.2;

    let newHr = safeHR + (targetHR - safeHR) * 0.1 + hrNoise;

    // Vagal bradycardia heart rate limit clamp
    if (patient.bradycardiaTriggered && patient.bradycardiaTime !== undefined) {
      const bradycardiaDuration = Math.max(0, safeTime - patient.bradycardiaTime);
      const neostigmineBradyLimit = typeof inputs.getAnatomicalParameter === 'function' 
        ? inputs.getAnatomicalParameter("Neostigmine muscarinic bradycardia heart rate limit", 40) 
        : 40;
      const targetBradyHR = Math.max(neostigmineBradyLimit, 70 - bradycardiaDuration * 3.5);
      if (newHr > targetBradyHR) {
        newHr = targetBradyHR;
      }
    }

    let newMap = Math.max(0, Math.round(exactMap + mapNoise));
    let roundedSys = Math.max(0, Math.round(newMap + (2 / 3) * basePP + sysNoise));
    let roundedDia = Math.max(0, Math.round(newMap - (1 / 3) * basePP + diaNoise));
    if (roundedDia >= roundedSys - 10) roundedDia = Math.max(0, roundedSys - 10);

    // CPR Resuscitation Pressures (first pass — used for ischemic damage calculation below)
    // Alpha-1 vasoconstriction from epinephrine increases diastolic BP during CPR,
    // directly raising coronary perfusion pressure (CPP = diastolic − LVEDP), the
    // primary physiologic determinant of ROSC (Paradis et al. JAMA 1990; AHA 2020).
    // Vasopressin provides an additive CPP boost via V1 receptor vasoconstriction.
    const cprEpiAlpha1 = (isArrestState && patient.cprActive)
      ? Math.min(1.0, safeAlpha1ActivityIndex / 1.5) : 0;
    const cprVasopressinPresent = isArrestState && patient.cprActive
      && inputs.activeMeds.some(m => m.name === 'Vasopressin' && (m as any).A1 > 0.01);
    const cprDiastolicBoost = cprEpiAlpha1 * 22 + (cprVasopressinPresent ? 8 : 0);
    if (isArrestState) {
      if (patient.cprActive) {
        roundedSys = Math.round(80 + cprDiastolicBoost * 0.7 + rng() * 15);
        roundedDia = Math.round(22 + cprDiastolicBoost + rng() * 8);
      } else {
        roundedSys = 0;
        roundedDia = 0;
      }
      newMap = Math.max(0, Math.round(roundedDia + (roundedSys - roundedDia) / 3));
    }

    const newCmap = Math.max(0, newMap + safeHydrostaticMod);

    // Potassium ECG widened QRS and arrest limits
    const safeRuleKOffset = typeof drugEffects.ruleKOffset === 'number' && Number.isFinite(drugEffects.ruleKOffset) ? drugEffects.ruleKOffset : 0;
    let kLevel = safeK + safeRuleKOffset;
    const isCalciumStabilized = !!(patient.calciumStabilized && (patient.calciumStabilizedTime !== undefined && safeTime - patient.calciumStabilizedTime < 300));

    if (!isCalciumStabilized) {
      if (kLevel > 10.0) {
        if (!isArrestState) {
          isArrestState = true;
          currentRhythm = 'asystole';
          events.push(`🚨 CRITICAL EMERGENCY: Hyperkalemia (K+ = ${kLevel.toFixed(1)} mEq/L) induced myocardial arrest!`);
        }
      } else if (kLevel > 8.5) {
        currentRhythm = 'sine wave';
      } else if (kLevel > 7.0) {
        currentRhythm = 'widened QRS';
      } else if (kLevel > 5.5) {
        currentRhythm = 'peaked T-waves';
      }
    } else {
      if (kLevel > 9.0) {
        currentRhythm = 'widened QRS';
      } else if (kLevel > 7.0) {
        currentRhythm = 'peaked T-waves';
      }
    }

    // Ischemic Damage Accumulation — two physiologically distinct components:
    //
    // 1. Cerebral ischemia (fast): cerebral autoregulation maintains flow to cmap≈50 mmHg.
    //    Below ~40 mmHg (where autoregulation fails), rapid neuronal injury begins.
    //    Prior threshold of 55 mmHg caused: sitting/beach-chair patients (cmap = MAP−29.6)
    //    with a normal MAP of 84 to accumulate damage — any induction hypotension in upright
    //    positions triggered unrecoverable death spirals within minutes.
    //
    // 2. Systemic organ ischemia (slow): sustained MAP<55 (supine) causes gradual organ
    //    damage (kidneys, gut, heart — all have higher perfusion thresholds than the brain).
    //    Coefficient 0.15 (vs 0.7 for cerebral) gives time to intervene (~25 min at MAP=50).
    //
    // Damage rates (per second):
    //   cmap=40 (sitting MAP=70, autoregulation failure): cerebral = 0 → 0 damage ✓
    //   cmap=38 (sitting MAP=68): cerebral = 2×0.7 = 1.4/sec → arrest in 14 min ✓
    //   cmap=30 (sitting MAP=60): cerebral = 10×0.7 = 7.0/sec → arrest in 2.9 min ✓
    //   MAP=50 supine, cmap=50: cerebral=0; systemic=5×0.15=0.75/sec → arrest in 27 min ✓
    //   MAP=40 supine, cmap=40: cerebral=0; systemic=15×0.15=2.25/sec → arrest in 9 min ✓
    //   MAP=35 supine, cmap=35: cerebral=5×0.7=3.5; systemic=20×0.15=3.0 = 6.5/sec → 3 min ✓
    const hypoxiaSeverity = Math.max(0, 90 - newSpo2);
    const cerebalIschemicStress = Math.max(0, 40 - newCmap);     // autoregulation failure
    const systemicIschemicStress = Math.max(0, 55 - newMap);     // systemic organ ischemia

    let newDamage = typeof patient.ischemicDamage === 'number' && Number.isFinite(patient.ischemicDamage) ? patient.ischemicDamage : 0;
    if (patient.cprActive) {
      const recoveryRate = newSpo2 >= 80 ? 4.5 : 1.0;
      newDamage = Math.max(0, newDamage - recoveryRate);
    } else {
      newDamage += (hypoxiaSeverity * 0.4) + (cerebalIschemicStress * 0.7) + (systemicIschemicStress * 0.15);
    }
    // Clamping to prevent infinite mathematical overflow/divergence
    newDamage = Math.max(0, Math.min(10000, newDamage));

    if (!isArrestState && !patient.biologicalDeath && (newDamage > (patient.arrestThreshold || 1200) || tCv >= 1.3)) {
      isArrestState = true;
      if (tCv >= 1.3) {
        const bup = inputs.activeMeds.find(m => m.name === 'Bupivacaine');
        if (bup && (bup as any).Ce > 0.3) {
          currentRhythm = 'vfib';
        } else {
          currentRhythm = rng() > 0.5 ? 'pea' : 'asystole';
        }
        patient.isLAST = true;
        events.push(`🚨 CRITICAL EMERGENCY: Local Anesthetic Systemic Toxicity (LAST) has triggered cardiac arrest (rhythm: ${currentRhythm.toUpperCase()})!`);
      } else {
        if (newSpo2 < 60) currentRhythm = 'asystole';
        else if (safeBloodLossRatio > 0.35) currentRhythm = 'pea';
        else currentRhythm = rng() > 0.5 ? 'vfib' : 'asystole';
        events.push(`🚨 CARDIAC ARREST! Rhythm: ${currentRhythm.toUpperCase()}`);
      }
    }

    let bioDeath = !!patient.biologicalDeath;
    if (newDamage > 6000 && !bioDeath) {
      events.push(`💀 BIOLOGICAL DEATH. No further resuscitation possible.`);
      bioDeath = true;
    }

    // Serotonin Syndrome Extreme Hyperpyrexia Fatal Arrest
    if (patient.serotoninSyndromeTriggered && safeNewTemp > 42.0 && !isArrestState) {
      isArrestState = true;
      currentRhythm = 'asystole';
      events.push(`🚨 CRITICAL FATALITY: Extreme hyperpyrexia (Temp = ${safeNewTemp.toFixed(1)}°C) from Serotonin Syndrome triggered cardiac arrest!`);
    }

    // Spontaneous ROSC (PEA/Asystole)
    // Model: ROSC probability per tick scales with coronary perfusion pressure (CPP)
    // during CPR. CPP = diastolic BP during compressions − LVEDP. Epinephrine raises
    // diastolic pressure via alpha-1 vasoconstriction, which is why it is the first-line
    // drug in ACLS. Target CPP > 15 mmHg correlates with ROSC (AHA 2020 guidelines).
    let spontaneousRosc = false;
    if (isArrestState && (currentRhythm === 'pea' || currentRhythm === 'asystole') && patient.cprActive && !patient.biologicalDeath) {
      // Estimated CPP during CPR (uses same drug-augmented diastolic as the pressure block above)
      const cprCPP = Math.max(0, (22 + cprDiastolicBoost) - lvedpVal);

      // ROSC probability per tick: nonlinear function of CPP.
      // CPP=0→ ~0.05%/tick, CPP=10→ ~0.19%/tick, CPP=20→ ~0.85%/tick, CPP=30→ ~4%/tick
      let roscProb = 0.0005 + Math.min(0.04, Math.pow(cprCPP / 30, 2) * 0.04);

      // Oxygenation: severe hypoxia during CPR severely impairs ROSC probability.
      // Relaxed from the prior hard gate (buffer > 50% FRC) to a probability modifier,
      // covering scenarios where the airway is not yet secured but bag-mask is being used.
      if (safeBuffer < safeFRC_L * 0.25) roscProb *= 0.15;

      // Hypovolemia: hemorrhagic PEA requires volume resuscitation — ROSC is impaired
      // but not impossible (tourniquet application, proximal aortic compression in trauma).
      if (safeBloodLossRatio > 0.4) roscProb *= 0.05;
      else if (safeBloodLossRatio > 0.2) roscProb *= 0.25;

      // LAST (local anesthetic cardiac toxicity): highly refractory to standard ACLS.
      // Requires Intralipid lipid-sink rescue to terminate.
      if (tCv >= 1.3) roscProb *= 0.05;

      if (rng() < roscProb) {
        spontaneousRosc = true;
      }
    }

    if (spontaneousRosc) {
      isArrestState = false;
      currentRhythm = 'normal';
      events.push(`✅ ROSC ACHIEVED! Organized rhythm restored. Monitor EtCO₂ (should rise), check pulse, and treat reversible causes to prevent re-arrest.`);
    }

    // Final vitals overrides under arrest — must be last to capture all arrest triggers
    if (isArrestState) {
      if (patient.cprActive) {
        // Drug-augmented CPR pressures (same formula as first-pass block above, for consistency)
        roundedSys = Math.round(80 + cprDiastolicBoost * 0.7 + rng() * 15);
        roundedDia = Math.round(22 + cprDiastolicBoost + rng() * 8);
        newMap = Math.max(0, Math.round(roundedDia + (roundedSys - roundedDia) / 3));
      } else {
        roundedSys = 0;
        roundedDia = 0;
        newMap = 0;
      }
      if (!patient.cprActive || currentRhythm === 'vfib' || currentRhythm === 'asystole') newHr = 0;
    }

    // Update vital signs target values
    vitals.co = newCO;
    // Layer 2 (F5 fix): persist the vasomotor tone as svrTone (drives the model + reflexes next tick),
    // and DISPLAY svr as the identity-consistent value a clinician back-calculates from MAP/CO/CVP, so
    // displayed hemodynamics satisfy SVR = 80*(MAP-CVP)/CO by construction. MAP/CO are unchanged (they
    // come from the tone-driven four-chamber call), so this only corrects the displayed SVR.
    (vitals as any).svrTone = newSVR;
    const cvpForSvr = (typeof vitals.cvp === 'number' && Number.isFinite(vitals.cvp)) ? vitals.cvp : 5.0;
    vitals.svr = (!isArrestState && newCO > 0.2 && newMap > cvpForSvr)
      ? Math.max(50, Math.min(6000, Math.round((80 * (newMap - cvpForSvr)) / newCO)))
      : Math.round(newSVR);
    vitals.hr = Math.round(newHr);
    vitals.sys = roundedSys;
    vitals.dia = roundedDia;
    vitals.map = newMap;
    vitals.cmap = newCmap;
    vitals.lvedp = lvedpVal;
    vitals.cpp_coronary = cppCoronaryVal;
    vitals.diastoleTimeRatio = diastoleTimeRatioVal;
    vitals.mvo2 = mvo2Val;
    vitals.mvo2Supply = supplyVal;

    // Update patient states
    patient.isArrest = isArrestState;
    patient.cardiacRhythm = currentRhythm;
    patient.ischemicDamage = newDamage;
    patient.biologicalDeath = bioDeath;
    patient.myocardialStunning = Math.max(0, newStunning - 0.005);

    if (isArrestState && !st.patient.isArrest) {
      patient.codeStartTime = safeTime;
      // Reset ACLS drug counters on new arrest so the UI timers start fresh
      (patient as any).lastEpiPushTime = null;
      (patient as any).amioDosesGivenInArrest = 0;
    }
    if (!isArrestState) {
      patient.codeStartTime = null;
    }
    if (spontaneousRosc) {
      patient.arrestThreshold = newDamage + 1500;
    }

    return {
      patient,
      vitals,
      events
    };
  }

  /**
   * Headless implementation of ACLS Defibrillation / Synchronized Shock delivery.
   * Completely decoupled from React components.
   */
  static deliverShock(
    inputs: {
      patient: PatientState;
      activeMeds: { name: string }[];
      currentBuffer: number;
      currentFRC_L: number;
      bloodLossRatio: number;
      joules: number;
      isSync: boolean;
      simulationTime: number;
      /** Injected deterministic RNG (Layer 1A). Defaults to Math.random when omitted. */
      rng?: () => number;
    }
  ): { patient: PatientState; events: string[] } {
    const { patient, activeMeds, currentBuffer, currentFRC_L, bloodLossRatio, joules, isSync, simulationTime } = inputs;
    const rng = inputs.rng || Math.random;
    const updated = { ...patient };
    const events: string[] = [];

    events.push(`⚡ ${isSync ? 'Synchronized Cardioversion' : 'Defibrillation'} delivered at ${joules}J.`);

    // Sanitizing inputs defensively to avoid NaN/Infinity propagation
    const safeBuffer = typeof currentBuffer === 'number' && Number.isFinite(currentBuffer) ? Math.max(0, currentBuffer) : 0.5;
    const safeFRC = typeof currentFRC_L === 'number' && Number.isFinite(currentFRC_L) && currentFRC_L > 0 ? currentFRC_L : 2.4;
    const safeBloodLossRatio = typeof bloodLossRatio === 'number' && Number.isFinite(bloodLossRatio) ? Math.max(0, Math.min(1.0, bloodLossRatio)) : 0;
    const safeTime = typeof simulationTime === 'number' && Number.isFinite(simulationTime) ? simulationTime : 0;

    if (!updated.isArrest) {
      if (!isSync) {
        events.push(`❌ WARNING: Unsynchronized shock induced R-on-T VFib!`);
        updated.isArrest = true;
        updated.cardiacRhythm = 'vfib';
        updated.codeStartTime = updated.codeStartTime || safeTime;
      } else {
        updated.myocardialStunning = Math.min(100, Math.max(0, (updated.myocardialStunning || 0) + 15));
      }
      return { patient: updated, events };
    }

    if (updated.cardiacRhythm === 'vfib' || updated.cardiacRhythm === 'vtach') {
      const amioBonus = activeMeds.some(m => m.name === 'Amiodarone') ? 0.25 : 0;
      const lidoBonus = activeMeds.some(m => m.name === 'Lidocaine') ? 0.20 : 0;
      const epiBonus = activeMeds.some(m => m.name === 'Epinephrine') ? 0.10 : 0;

      const hypoxiaPenalty = safeBuffer < (safeFRC * 0.40) ? 0.6 : 0;
      const hypovolemiaPenalty = safeBloodLossRatio > 0.3 ? 0.6 : 0;

      const totalBonus = Math.min(0.4, amioBonus + lidoBonus + epiBonus);
      const ischemicDamage = typeof updated.ischemicDamage === 'number' && Number.isFinite(updated.ischemicDamage) ? updated.ischemicDamage : 0;
      const ischemicPenalty = (ischemicDamage / 5000);

      // Calculate LAST Cardiotoxicity (tCv) for defibrillation penalty
      let tCv = typeof inputs.lastCvSeverity === 'number' && Number.isFinite(inputs.lastCvSeverity) ? inputs.lastCvSeverity * 1.3 : 0.0;
      if (activeMeds) {
        const cocaine = activeMeds.find(m => m.name === 'Cocaine');
        if (cocaine) {
          const ce = (cocaine as any).Ce || 0;
          if (ce > 0.01) {
            const thresholdCns = 0.5;
            const ccCnsRatio = 3.0;
            const pb = 0.90;
            const kLipid = 30.0;
            const age = updated.age || 40;
            const ageFactor = (age < 1) ? 0.5 : 1.0;
            const acidosisFactor = 1.0;
            const lipidSinkVol = (updated as any).lipidSinkVol || 0;
            const safeEbvVal = typeof updated.ebv === 'number' && Number.isFinite(updated.ebv) && updated.ebv > 0 ? updated.ebv : 5000;
            const vLipid = lipidSinkVol / safeEbvVal;

            const freeFraction = 1.0 - pb * acidosisFactor * ageFactor;
            const fLipidBound = (kLipid * vLipid) / (1.0 + kLipid * vLipid);
            const ceFree = ce * freeFraction * (1.0 - fLipidBound);
            tCv += ceFree / (thresholdCns * ccCnsRatio);
          }
        }
      }

      const lastPenalty = Math.min(0.9, 0.7 * tCv);
      const successChance = Math.max(0.01, 0.7 + totalBonus - ischemicPenalty - hypoxiaPenalty - hypovolemiaPenalty - lastPenalty);

      if (rng() < successChance) {
        if (ischemicDamage > 4000) {
          events.push("⚠️ Shock converted rhythm to PEA. Myocardium too ischemic for ROSC.");
          updated.cardiacRhythm = 'pea';
        } else {
          events.push("✅ ROSC ACHIEVED! Organized rhythm restored.");
          updated.isArrest = false;
          updated.isLAST = false;
          updated.cardiacRhythm = 'normal';
          updated.myocardialStunning = 60;
          updated.arrestThreshold = ischemicDamage + 1500;
          updated.codeStartTime = null;
        }
      } else {
        events.push("⚡ Shock delivered. Rhythm remains VFib/VTach. Fix H's and T's if refractory.");
      }
    } else {
      events.push(`❌ WARNING: Shock delivered to non-shockable rhythm (${updated.cardiacRhythm.toUpperCase()}). No effect.`);
    }

    return {
      patient: updated,
      events
    };
  }
}
