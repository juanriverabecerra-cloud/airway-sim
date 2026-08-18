export interface RespiratoryPatientState {
  height: number;
  age: number;
  sex: string;
  bmi: number;
  position: string;
  copd?: boolean;
  restrictive?: boolean;
  isObese?: boolean;
  isSeptic?: boolean;
  trauma?: boolean;
  chf?: boolean;
  ibw: number;
  airwaySecured: boolean;
  ventilationStatus: string;
  currentO2Device?: string;
  currentO2Flow?: number;
  currentFiO2?: number;
  oxygenBuffer: number | null;
  apneaStartTime?: number | null;
  hasAspirated?: boolean;
  aspirationMitigated?: boolean;
  anaphylaxisTriggered?: boolean;
  anaphylaxisTreated?: boolean;
  anaphylaxisCompliancePenalty?: number;
  anaphylaxisResistancePenalty?: number;
  metHb?: number;
  coHb?: number;
  cyanide?: number;
  lacticAcid?: number;
  shuntFraction?: number;
  olvShuntContribution?: number;           // additive from OneLungVentilationModel
  olvCompliancePenaltyFraction?: number;   // 0-0.5 multiplicative compliance reduction
  inhalationInjuryCompliancePenalty?: number; // 0-0.5 from BurnsPhysiologyModel
  inhalationInjuryResistancePenalty?: number; // cmH2O/L/s additive from BurnsPhysiologyModel
  inhalationInjuryShuntContribution?: number; // additive from BurnsPhysiologyModel
  pfoShuntContribution?: number;              // additive from PediatricPhysiologyEngine (PFO R-to-L)
  n2oDiffusionHypoxiaShunt?: number;          // Fink effect: N2O washout dilutes alveolar O2
  femShuntContribution?: number;              // fat embolism syndrome V/Q mismatch shunt
  femCompliancePenalty?: number;              // fat embolism ARDS compliance reduction
  isbCompliancePenalty?: number;              // interscalene block: 100% ipsilateral phrenic palsy → 25% FVC reduction
  cholinergicResistancePenalty?: number;      // cholinergic toxidrome: bronchospasm + secretions
  tacoCompliancePenalty?: number;             // TACO: hydrostatic pulmonary edema
  acsShuntContribution?: number;              // sickle cell ACS: pulmonary vaso-occlusion
  acsCompliancePenalty?: number;              // sickle cell ACS: ARDS-like compliance loss
  angioedemaResistancePenalty?: number;       // bradykinin/allergic angioedema airway swelling
  pneumothoraxCompliancePenalty?: number;     // instructor-triggered tension pneumothorax: lung collapse
  ardsProgressionCompliancePenalty?: number;  // instructor-triggered timed ARDS compliance drop
  bronchospasmTrendResistancePenalty?: number; // instructor-triggered timed bronchospasm resistance rise
  cuffLeakVtePenalty?: number;                // instructor-triggered ET tube cuff leak: fraction of Vte lost around cuff
  circuitDisconnected?: boolean;              // instructor-triggered breathing circuit disconnection
  hpsShuntContribution?: number;              // hepatopulmonary syndrome intrapulmonary shunts
  tacoShuntContribution?: number;             // TACO: flooded alveoli shunt
  tacoResistancePenalty?: number;             // TACO: airway secretions
  femResistancePenalty?: number;              // fat embolism airway resistance increase
  pulmonaryComorbidity?: string;
  laryngospasm?: boolean;
  bronchospasm?: boolean;
  isBucking?: boolean;
  C_cat?: number;
  swallowingActive?: boolean;
  breathingCircuitType?: string;
  co2AbsorptiveCapacity?: number;
  stuckExpiratoryValve?: boolean;
  stuckInspiratoryValve?: boolean;
  aplValveSetting?: number;
  hasPneumothorax?: boolean;
  opioidRigidityActive?: boolean;
  renarcotizationActive?: boolean;
  icp?: number;
  cpp?: number;
}

export interface RespiratoryVitalsState {
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
  pip?: number;
  pplat?: number;
  vte?: number;
  pmean?: number;
  mv?: number;
  peep?: number;
  bowelGasVolume?: number;
  fico2?: number;
}

export interface VentSettings {
  mode: string;
  vt: number;
  rr: number;
  peep: number;
  fio2: number;
  pinsp: number;
  ieRatio: number;
  pmax: number;
  ps: number;
}

export interface RespiratoryDrugEffects {
  maxNMJOccupancy: number;
  totalRrDelta: number;
  ruleRrScale: number;
  ruleRrOffset: number;
  ruleComplScale: number;
  rulePipOffset: number;
  ruleSpo2Offset: number;
  ruleKOffset: number;
}

export interface RespiratoryOutput {
  vitals: RespiratoryVitalsState;
  oxygenBuffer: number;
  isApneic: boolean;
  isParalyzed: boolean;
  lungVolumes: any;
  currentAlvVent_L_min: number;
  newPaCO2: number;
  newPh: number;
  measuredSpo2: number;
  newSpo2: number;
  newRr: number;
  newEtco2: number;
  compliance: number;
  resistance: number;
  pip: number;
  vte: number;
  fico2?: number;
  actualShunt?: number;
  vdVtRatio?: number;
}

export class RespiratoryEngine {
  /**
   * Calculates the predicted lung volumes based on ECCS/ERS 1993 reference equations.
   * Completely pure and headless.
   */
  static calculateLungVolumes(
    heightCm: number,
    age: number,
    sex: string,
    bmi: number,
    position: string = 'Supine',
    isCopd: boolean = false,
    isRestrictive: boolean = false,
    isAnesthetized: boolean = false,
    pregnancyFrcMultiplier: number = 1.0
  ) {
    let hCm = Number(heightCm);
    if (isNaN(hCm) || !Number.isFinite(hCm) || hCm <= 0) {
      hCm = 170.0;
    }
    hCm = Math.max(50.0, Math.min(250.0, hCm));

    let safeAge = Number(age);
    if (isNaN(safeAge) || !Number.isFinite(safeAge) || safeAge <= 0) {
      safeAge = 40.0;
    }
    safeAge = Math.max(1.0, Math.min(120.0, safeAge));

    let safeSex = 'male';
    if (typeof sex === 'string') {
      const trimmed = sex.trim().toLowerCase();
      if (trimmed === 'female') {
        safeSex = 'female';
      }
    }
    const isMale = safeSex === 'male';

    let safeBmi = Number(bmi);
    if (isNaN(safeBmi) || !Number.isFinite(safeBmi) || safeBmi <= 0) {
      safeBmi = 25.0;
    }
    safeBmi = Math.max(10.0, Math.min(100.0, safeBmi));

    const safePosition = typeof position === 'string' ? position : 'Supine';

    const H = hCm / 100;

    let fvc_pred = 0, fev1_pred = 0, tlc_pred = 0, rv_pred = 0, frc_pred = 0;
    if (isMale) {
      fvc_pred  = 5.76 * H - 0.026 * safeAge - 4.34;
      fev1_pred = 4.30 * H - 0.029 * safeAge - 2.49;
      tlc_pred  = 7.99 * H - 7.08;
      rv_pred   = 1.31 * H + 0.022 * safeAge - 1.23;
      frc_pred  = 2.34 * H + 0.009 * safeAge - 1.09;
    } else {
      fvc_pred  = 4.43 * H - 0.026 * safeAge - 2.89;
      fev1_pred = 3.95 * H - 0.025 * safeAge - 2.60;
      tlc_pred  = 6.60 * H - 5.79;
      rv_pred   = 1.81 * H + 0.016 * safeAge - 2.00;
      frc_pred  = 2.24 * H + 0.001 * safeAge - 1.00;
    }

    let fvc = fvc_pred;
    let fev1 = fev1_pred;
    let tlc = tlc_pred;
    let rv = rv_pred;
    let frc = frc_pred;

    if (isCopd) {
      rv = rv_pred * 1.40;
      frc = frc_pred * 1.35;
      tlc = tlc_pred * 1.05;
      fvc = fvc_pred * 0.86;
      fev1 = fvc * 0.44;
    } else if (isRestrictive) {
      rv = rv_pred * 0.52;
      frc = frc_pred * 0.52;
      tlc = tlc_pred * 0.52;
      fvc = fvc_pred * 0.48;
      fev1 = fvc * 0.84;
    } else {
      fvc = fvc_pred * 0.98;
      fev1 = fvc * 0.81;
    }

    const frc_upright_baseline = frc; // FRC baseline before obesity and position scaling
    const cc_L = frc_upright_baseline * (0.50 + 0.0075 * safeAge); // Fig 13.9, Miller's 9th Ed

    // Obesity FRC: exponent -0.035 (Pelosi 1998). Prior -0.02 gave FRC=74% at BMI=40 (clinical 55-65%),
    // leading to falsely long safe apnea time (6.8 min vs correct 2-4 min for the obese difficult airway).
    const obesityFactor = safeBmi > 25 ? Math.exp(-0.035 * (safeBmi - 25)) : 1.0;
    frc *= obesityFactor;

    const positionFactors: Record<string, number> = {
      'Sitting': 1.00,
      'Ramped': 0.90,
      'Rev Trendelenburg': 0.90,
      'Supine': 0.80,
      'Sniffing': 0.80,
      'Prone': 0.85,
      'Lateral': 0.82,
      'Lithotomy': 0.72,
      'Trendelenburg': 0.70
    };
    const posFactor = positionFactors[safePosition] || 0.80;
    frc *= posFactor;

    // General anesthesia induces a further, position-independent FRC decrease (cranial
    // diaphragm shift + reduced thoracic transverse diameter) on top of the postural drop.
    // Fig 13.13, Miller's 9th Ed.
    const anesthesiaFrcFactor = isAnesthetized ? 0.85 : 1.0;
    frc *= anesthesiaFrcFactor;

    // Pregnancy's diaphragm-elevating gravid uterus further decreases FRC, ~20% by term
    // (PregnancyPhysiologyEngine.ts, Phase 4) -- independent of and on top of the position/
    // obesity/anesthesia factors above.
    const safePregnancyFrcMultiplier = typeof pregnancyFrcMultiplier === 'number' && Number.isFinite(pregnancyFrcMultiplier) && pregnancyFrcMultiplier > 0 ? pregnancyFrcMultiplier : 1.0;
    frc *= safePregnancyFrcMultiplier;

    frc  = Math.max(0.5, frc);
    tlc  = Math.max(2.0, tlc);
    rv   = Math.max(0.5, rv);
    fvc  = Math.max(1.0, fvc);
    fev1 = Math.max(0.5, fev1);

    const vc  = Math.max(0.5, tlc - rv);
    const erv = Math.max(0, frc - rv);
    
    // devine formula with correct height above 60 inches clamp
    const devineHeightDiff = Math.max(0, (hCm / 2.54) - 60);
    const ibwKg = isMale ? (50 + 2.3 * devineHeightDiff) : (45.5 + 2.3 * devineHeightDiff);
    
    const vt_L = 0.007 * ibwKg;
    const irv = Math.max(0, vc - vt_L - erv);
    const vd = ibwKg * 2.2 / 1000;

    // Guard final predictions to prevent non-finite division
    if (!Number.isFinite(fev1_pred) || fev1_pred <= 0) fev1_pred = 3.5;
    if (!Number.isFinite(fvc_pred) || fvc_pred <= 0) fvc_pred = 4.5;
    if (!Number.isFinite(fev1) || fev1 <= 0) fev1 = 2.8;
    if (!Number.isFinite(fvc) || fvc <= 0) fvc = 3.8;

    let fev1PercentPredicted = Math.round((fev1 / fev1_pred) * 100);
    let fvcPercentPredicted = Math.round((fvc / fvc_pred) * 100);
    let fev1FvcRatio = Math.round((fev1 / fvc) * 100);

    if (isNaN(fev1PercentPredicted) || !Number.isFinite(fev1PercentPredicted)) fev1PercentPredicted = 80;
    if (isNaN(fvcPercentPredicted) || !Number.isFinite(fvcPercentPredicted)) fvcPercentPredicted = 80;
    if (isNaN(fev1FvcRatio) || !Number.isFinite(fev1FvcRatio)) fev1FvcRatio = 80;

    return {
      frc_mL: Math.round(frc * 1000),
      tlc_mL: Math.round(tlc * 1000),
      rv_mL: Math.round(rv * 1000),
      vc_mL: Math.round(vc * 1000),
      erv_mL: Math.round(erv * 1000),
      irv_mL: Math.round(irv * 1000),
      fvc_mL: Math.round(fvc * 1000),
      fev1_mL: Math.round(fev1 * 1000),
      vd_mL: Math.round(vd * 1000),
      frc_L: parseFloat(frc.toFixed(2)),
      tlc_L: parseFloat(tlc.toFixed(2)),
      cc_L: parseFloat(cc_L.toFixed(2)),
      cc_mL: Math.round(cc_L * 1000),
      obesityFactor: parseFloat(obesityFactor.toFixed(3)),
      positionFactor: posFactor,
      anesthesiaFrcFactor,
      fev1PercentPredicted,
      fvcPercentPredicted,
      fev1FvcRatio
    };
  }

  /**
   * Ticks the respiratory and blood-gas exchange system.
   * Deterministic, headless, and mathematically identical to the Golden Version logic.
   */
  static tick(
    dt: number = 1,
    st: { patient: RespiratoryPatientState; vitals: RespiratoryVitalsState; time: number },
    ventSettings: VentSettings | null,
    deliveredFiO2: number,
    drugEffects: RespiratoryDrugEffects,
    inputs: {
      VO2_sec: number;
      totalMetabolicMultiplier: number;
      compensatoryRR: number;
      opioidRRDrop: number;
      m6gRrDelta: number;
      shiveringRRDrive: number;
      currentHb: number;
      targetMAP: number;
      targetCO: number;
      hco3: number;
      volatileRightShift: number;
      dpgDepletionShift: number;
      baselinePaCO2: number;
      anaphylaxisCompliancePenalty: number;
      anaphylaxisResistancePenalty: number;
      aspirationCompliancePenalty: number;
      aspirationResistancePenalty: number;
      hpsShunt?: number;
      fluidOverloadCompliancePenalty?: number;
      agent?: string;
      etAgent?: number;
      currentMac?: number;
      isMucusPlugged?: boolean;
      bronchialSmoothMuscleCa?: number;
      intercostalContribution?: number;
      airwayObstructionIndex?: number;
      hpvInhibition?: number;
      fgf_L_min?: number;
      pregnancyFrcMultiplier?: number;
    }
  ): RespiratoryOutput {
    const { patient, vitals } = st || { patient: {} as any, vitals: {} as any };
    const safePatient = patient || {} as any;
    const safeVitals = vitals || {} as any;

    const safeInputs = inputs || {} as any;
    const hpsShunt = typeof safeInputs.hpsShunt === 'number' && Number.isFinite(safeInputs.hpsShunt) ? safeInputs.hpsShunt : 0.0;
    const VO2_sec = typeof safeInputs.VO2_sec === 'number' && Number.isFinite(safeInputs.VO2_sec) && safeInputs.VO2_sec >= 0 ? safeInputs.VO2_sec : 0.004;
    const safeTotalMetabolicMultiplier = typeof safeInputs.totalMetabolicMultiplier === 'number' && Number.isFinite(safeInputs.totalMetabolicMultiplier) && safeInputs.totalMetabolicMultiplier >= 0 ? safeInputs.totalMetabolicMultiplier : 1.0;
    const compensatoryRR = typeof safeInputs.compensatoryRR === 'number' && Number.isFinite(safeInputs.compensatoryRR) ? safeInputs.compensatoryRR : 0;
    const opioidRRDrop = typeof safeInputs.opioidRRDrop === 'number' && Number.isFinite(safeInputs.opioidRRDrop) ? safeInputs.opioidRRDrop : 0;
    const shiveringRRDrive = typeof safeInputs.shiveringRRDrive === 'number' && Number.isFinite(safeInputs.shiveringRRDrive) ? safeInputs.shiveringRRDrive : 0;
    const safeCurrentHb = typeof safeInputs.currentHb === 'number' && Number.isFinite(safeInputs.currentHb) && safeInputs.currentHb > 0 ? safeInputs.currentHb : 14.0;
    const targetMAP = typeof safeInputs.targetMAP === 'number' && Number.isFinite(safeInputs.targetMAP) ? safeInputs.targetMAP : 90.0;
    const safeTargetCO = typeof safeInputs.targetCO === 'number' && Number.isFinite(safeInputs.targetCO) && safeInputs.targetCO > 0 ? safeInputs.targetCO : 5.0;
    const safeHco3 = typeof safeInputs.hco3 === 'number' && Number.isFinite(safeInputs.hco3) && safeInputs.hco3 > 0 ? safeInputs.hco3 : 24.0;
    const safeVolatileRightShift = typeof safeInputs.volatileRightShift === 'number' && Number.isFinite(safeInputs.volatileRightShift) ? safeInputs.volatileRightShift : 0.0;
    const safeDpgDepletionShift = typeof safeInputs.dpgDepletionShift === 'number' && Number.isFinite(safeInputs.dpgDepletionShift) ? safeInputs.dpgDepletionShift : 0.0;
    const safeBaselinePaCO2 = typeof safeInputs.baselinePaCO2 === 'number' && Number.isFinite(safeInputs.baselinePaCO2) && safeInputs.baselinePaCO2 > 0 ? safeInputs.baselinePaCO2 : 40.0;
    const anaphylaxisCompliancePenalty = typeof safeInputs.anaphylaxisCompliancePenalty === 'number' && Number.isFinite(safeInputs.anaphylaxisCompliancePenalty) ? safeInputs.anaphylaxisCompliancePenalty : 0;
    const anaphylaxisResistancePenalty = typeof safeInputs.anaphylaxisResistancePenalty === 'number' && Number.isFinite(safeInputs.anaphylaxisResistancePenalty) ? safeInputs.anaphylaxisResistancePenalty : 0;
    const aspirationCompliancePenalty = typeof safeInputs.aspirationCompliancePenalty === 'number' && Number.isFinite(safeInputs.aspirationCompliancePenalty) ? safeInputs.aspirationCompliancePenalty : 0;
    const aspirationResistancePenalty = typeof safeInputs.aspirationResistancePenalty === 'number' && Number.isFinite(safeInputs.aspirationResistancePenalty) ? safeInputs.aspirationResistancePenalty : 0;
    const fluidOverloadCompliancePenalty = typeof safeInputs.fluidOverloadCompliancePenalty === 'number' && Number.isFinite(safeInputs.fluidOverloadCompliancePenalty) ? safeInputs.fluidOverloadCompliancePenalty : 0;

    const safeDrugEffects = drugEffects || {} as any;
    const maxNMJOccupancy = typeof safeDrugEffects.maxNMJOccupancy === 'number' && Number.isFinite(safeDrugEffects.maxNMJOccupancy) ? safeDrugEffects.maxNMJOccupancy : 0;
    const safeTotalRrDelta = typeof safeDrugEffects.totalRrDelta === 'number' && Number.isFinite(safeDrugEffects.totalRrDelta) ? safeDrugEffects.totalRrDelta : 0;
    const safeRuleRrScale = typeof safeDrugEffects.ruleRrScale === 'number' && Number.isFinite(safeDrugEffects.ruleRrScale) ? safeDrugEffects.ruleRrScale : 1.0;
    const safeRuleRrOffset = typeof safeDrugEffects.ruleRrOffset === 'number' && Number.isFinite(safeDrugEffects.ruleRrOffset) ? safeDrugEffects.ruleRrOffset : 0;
    const safeRuleComplScale = typeof safeDrugEffects.ruleComplScale === 'number' && Number.isFinite(safeDrugEffects.ruleComplScale) ? safeDrugEffects.ruleComplScale : 1.0;
    const safeRulePipOffset = typeof safeDrugEffects.rulePipOffset === 'number' && Number.isFinite(safeDrugEffects.rulePipOffset) ? safeDrugEffects.rulePipOffset : 0;
    const safeRuleSpo2Offset = typeof safeDrugEffects.ruleSpo2Offset === 'number' && Number.isFinite(safeDrugEffects.ruleSpo2Offset) ? safeDrugEffects.ruleSpo2Offset : 0;

    const isParalyzed = maxNMJOccupancy > 0.90;
    const isApneic = isParalyzed || safePatient.swallowingActive || safePatient.opioidRigidityActive || safePatient.renarcotizationActive || (safeVitals.rr !== undefined && Number.isFinite(safeVitals.rr) ? safeVitals.rr < 1 : false);

    // Calculate current volumes
    const isAnesthetized = isParalyzed || !!safePatient.airwaySecured;
    const safePregnancyFrcMultiplierInput = typeof safeInputs.pregnancyFrcMultiplier === 'number' && Number.isFinite(safeInputs.pregnancyFrcMultiplier) && safeInputs.pregnancyFrcMultiplier > 0 ? safeInputs.pregnancyFrcMultiplier : 1.0;
    const currentLungVols = this.calculateLungVolumes(
      safePatient.height || 170,
      safePatient.age || 40,
      safePatient.sex || 'male',
      safePatient.bmi || 25,
      safePatient.position || 'Supine',
      safePatient.copd || false,
      safePatient.restrictive || false,
      isAnesthetized,
      safePregnancyFrcMultiplierInput
    );
      const currentFRC_L = currentLungVols.frc_L;

      const safeVentSettings = ventSettings || {
        mode: 'spontaneous',
        vt: 500,
        rr: 12,
        peep: 5,
        fio2: 50,
        pinsp: 20,
        ieRatio: 2,
        pmax: 40,
        ps: 10
      };

      const currentO2DeviceStr = typeof safePatient.currentO2Device === 'string' ? safePatient.currentO2Device : '';
      const isBagMaskActive = currentO2DeviceStr.includes('Bag-Mask') 
        || safePatient.ventilationStatus === 'assisted';

      let effectivePeep = 0;
      if (safePatient.airwaySecured) {
        effectivePeep = (ventSettings && typeof ventSettings.peep === 'number') ? ventSettings.peep : 0;
      } else {
        if (currentO2DeviceStr.includes('CPAP')) {
          effectivePeep = safePatient.nippv?.epap || 5;
        } else if (currentO2DeviceStr.includes('BiPAP')) {
          effectivePeep = safePatient.nippv?.epap || 5;
        } else if (currentO2DeviceStr.includes('HFNC') || currentO2DeviceStr.includes('High Flow')) {
          // HFNC delivers approx 1 cmH2O of PEEP per 10 L/min of flow with mouth closed
          effectivePeep = Math.min(6.0, (safePatient.currentO2Flow || 50) / 10.0);
        } else if (isBagMaskActive) {
          effectivePeep = safePatient.bmvPeep || 5;
        }
      }

      // PEEP recruits collapsed/atelectatic alveoli, expanding the effective FRC volume
      // PEEP reduces shunt by recruiting atelectatic alveoli. Clinical: ~0.3-0.5% per cmH2O in
      // healthy anesthetized patient (Rothen 1995). Prior 0.015/cmH2O was 3× too aggressive —
      // PEEP=3 already abolished shunt. Corrected to 0.005/cmH2O: PEEP=3→shunt 3.5%, PEEP=5→2.75%.
      const shuntReduction = effectivePeep > 0 ? Math.min(0.10, effectivePeep * 0.005) : 0;
      const lungRecruitment = effectivePeep > 0 ? (safePatient.isObese || safePatient.chf ? 0.045 : 0.03) * effectivePeep : 0;
      let intercostalScale = 1.0;
      if (safeInputs.intercostalContribution !== undefined) {
        intercostalScale = 0.7 + 0.3 * safeInputs.intercostalContribution;
      }
      const recruitedFRC_L = currentFRC_L * (1.0 + lungRecruitment) * intercostalScale;

      // FRC O2 buffer calculation based on recruited FRC volume
      let buffer = (typeof safePatient.oxygenBuffer === 'number' && Number.isFinite(safePatient.oxygenBuffer)) 
        ? safePatient.oxygenBuffer 
        : (recruitedFRC_L * 0.21);

      // Calculate replenishment FiO2
      let replenishmentFiO2 = 21;
      if (safePatient.airwaySecured || isBagMaskActive) {
        replenishmentFiO2 = Number(deliveredFiO2);
      } else {
        const deviceFiO2 = Number(safePatient.currentFiO2 || 21);
        if (safePatient.isO2PipelineCrossover && !safePatient.isO2PipelineDisconnected) {
          // Wall oxygen pipeline crossover: wall oxygen contains N2O (0% O2).
          // Dilutes inspired gas depending on device.
          if (currentO2DeviceStr.includes('Nasal Cannula')) {
            const flow = safePatient.currentO2Flow || 2;
            replenishmentFiO2 = Math.max(10, 21 - (flow * 1.5));
          } else if (currentO2DeviceStr.includes('Face Mask')) {
            const flow = safePatient.currentO2Flow || 5;
            replenishmentFiO2 = Math.max(10, 21 - (flow * 1.8));
          } else {
            // NRB, HFNC, CPAP, BiPAP deliver pure N2O.
            replenishmentFiO2 = 10; // minimum O2% in crossed closed system
          }
        } else {
          replenishmentFiO2 = deviceFiO2;
        }
      }
      if (isNaN(replenishmentFiO2) || !Number.isFinite(replenishmentFiO2)) {
        replenishmentFiO2 = 21;
      }
      replenishmentFiO2 = Math.max(10, Math.min(100, replenishmentFiO2));

      let passiveO2Influx = 0;
      if ((isParalyzed || isApneic) && !safePatient.airwaySecured && !isBagMaskActive) {
        const currentO2Flow = safePatient.currentO2Flow || 0;
        
        if (currentO2Flow > 0 && replenishmentFiO2 > 21) {
          const flowFraction = Math.min(1.0, currentO2Flow / 15.0);
          const fiO2Fraction = Math.max(0, (replenishmentFiO2 - 21) / (100 - 21));
          passiveO2Influx = VO2_sec * 0.9 * flowFraction * fiO2Fraction;
        }
        
        if (currentO2DeviceStr.includes('HFNC') || currentO2DeviceStr.includes('High Flow')) {
          const fiO2Fraction = Math.max(0, (replenishmentFiO2 - 21) / (100 - 21));
          passiveO2Influx = VO2_sec * 0.98 * fiO2Fraction;
        } else if (currentO2DeviceStr.includes('CPAP') || currentO2DeviceStr.includes('BiPAP')) {
          const fiO2Fraction = Math.max(0, (replenishmentFiO2 - 21) / (100 - 21));
          passiveO2Influx = VO2_sec * 0.95 * fiO2Fraction;
        }
      }

      let effectiveMV_L_min = 0;
      const circuitType = safePatient.breathingCircuitType || 'circle';
      const aplSetting = typeof safePatient.aplValveSetting === 'number' ? safePatient.aplValveSetting : 0;

      if (circuitType.includes('Mapleson')) {
        if (isApneic) {
          if (aplSetting < 5) {
            effectiveMV_L_min = 0;
          } else if (aplSetting < 15) {
            effectiveMV_L_min = 6.0 * (aplSetting / 15);
          } else {
            effectiveMV_L_min = 6.0;
          }
        } else {
          const currentRR = safeVitals.rr !== undefined && Number.isFinite(safeVitals.rr) ? safeVitals.rr : 12;
          effectiveMV_L_min = (currentRR * 0.5);
        }
      } else {
        if (safePatient.airwaySecured) {
          effectiveMV_L_min = safeVitals.mv || 6.0;
        } else if (isBagMaskActive) {
          if (isApneic) {
            if (aplSetting < 5) {
              effectiveMV_L_min = 0;
            } else if (aplSetting < 15) {
              effectiveMV_L_min = 5.0 * (aplSetting / 15);
            } else {
              effectiveMV_L_min = 5.0;
            }
          } else {
            const currentRR = safeVitals.rr !== undefined && Number.isFinite(safeVitals.rr) ? safeVitals.rr : 12;
            effectiveMV_L_min = (currentRR * 0.5);
          }
        } else if (!isParalyzed && !isApneic) {
          const currentRR = safeVitals.rr !== undefined && Number.isFinite(safeVitals.rr) ? safeVitals.rr : 12;
          effectiveMV_L_min = (currentRR * 0.5);
        }
      }

      if (effectiveMV_L_min > 0.1) {
        const targetO2_L = recruitedFRC_L * (replenishmentFiO2 / 100);
        const k = effectiveMV_L_min / 60 / recruitedFRC_L;

        let modalityWashinMultiplier = 1.0;
        if (currentO2DeviceStr.includes('HFNC') || currentO2DeviceStr.includes('High Flow')) {
          modalityWashinMultiplier = 2.5;
        } else if (currentO2DeviceStr.includes('CPAP') || currentO2DeviceStr.includes('BiPAP')) {
          modalityWashinMultiplier = 2.2;
        } else if (currentO2DeviceStr.includes('Non-Rebreather') || currentO2DeviceStr.includes('NRB')) {
          modalityWashinMultiplier = 1.8;
        } else if (isBagMaskActive || currentO2DeviceStr.includes('BMV')) {
          modalityWashinMultiplier = 1.5;
        } else if (currentO2DeviceStr.includes('Simple Face Mask') || currentO2DeviceStr.includes('Face Mask')) {
          modalityWashinMultiplier = 1.2;
        }

        buffer += k * modalityWashinMultiplier * (targetO2_L - buffer);
      } else {
        buffer -= (VO2_sec - passiveO2Influx);
      }
      // Diffusion Hypoxia (Fink Effect) due to Nitrous Oxide washout
      const n2oUptakeRate = safeVitals.n2oUptakeRate || 0; // average uptake rate in L/sec
      if (n2oUptakeRate < 0) {
        buffer -= (buffer / recruitedFRC_L) * (-n2oUptakeRate) * dt;
      }

      buffer = Math.max(0, Math.min(recruitedFRC_L, buffer));
      const currentBuffer = buffer;

    // Pulmonary compliance & resistance loops
    let pulmComplianceBonus = 0;
    let pulmResistanceBonus = 0;
    // Alveolar dead-space multiplier: V/Q mismatch from destroyed capillary bed (emphysema)
    // or airway obstruction can dramatically increase VD/VT (key point & Table 13.2, Miller's
    // 9th Ed: "dead space ventilation can be...increased...to more than 80% of minute
    // ventilation" in severe COPD). Asthma's dead-space contribution is comparatively minor
    // (Table 13.2: VQ mismatch '++', vs '+++' for emphysema).
    let deadSpaceMultiplier = 1.0;
    const pulmComorbStr = typeof safePatient.pulmonaryComorbidity === 'string' ? safePatient.pulmonaryComorbidity.toLowerCase() : '';
    if (pulmComorbStr) {
      // Checked most-specific-first: 'copd gold i' is a substring of 'gold ii'/'iii'/'iv',
      // so it must be evaluated last among the GOLD stages or it would always match first.
      if (pulmComorbStr.includes('copd gold iv')) { pulmComplianceBonus = 20; pulmResistanceBonus = 25; deadSpaceMultiplier = 2.00; }
      else if (pulmComorbStr.includes('copd gold iii')) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; deadSpaceMultiplier = 1.60; }
      else if (pulmComorbStr.includes('copd gold ii')) { pulmComplianceBonus = 10; pulmResistanceBonus = 10; deadSpaceMultiplier = 1.30; }
      else if (pulmComorbStr.includes('copd gold i')) { pulmComplianceBonus = 5; pulmResistanceBonus = 5; deadSpaceMultiplier = 1.10; }
      else if (pulmComorbStr.includes('asthma')) { pulmComplianceBonus = -12; pulmResistanceBonus = 20; deadSpaceMultiplier = 1.15; }
    } else {
      if (safePatient.copd) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; deadSpaceMultiplier = 1.30; }
    }

    let currentCompliance = 65;
    if (safePatient.isObese) currentCompliance -= 25;
    if (safePatient.isSeptic) currentCompliance -= 20;
    if (safePatient.trauma) currentCompliance -= 15;
    if (safePatient.chf) currentCompliance -= 20;
    currentCompliance += pulmComplianceBonus;
    if (safePatient.position === 'Trendelenburg') {
      currentCompliance *= 0.80; // 20% compliance reduction
    } else if (safePatient.position === 'Lithotomy') {
      currentCompliance -= 10;
    } else if (safePatient.position === 'Prone' && !safePatient.proneSupportsPlaced) {
      currentCompliance *= 0.70; // 30% compliance reduction due to unmitigated abdominal compression
    }
    currentCompliance -= aspirationCompliancePenalty;
    currentCompliance -= anaphylaxisCompliancePenalty;
    currentCompliance -= fluidOverloadCompliancePenalty;
    currentCompliance *= safeRuleComplScale;

    if (safePatient.hasPneumothorax) {
      currentCompliance *= 0.25; // 75% compliance drop
    }

    const bowelGasVol = typeof safeVitals.bowelGasVolume === 'number' && Number.isFinite(safeVitals.bowelGasVolume) ? safeVitals.bowelGasVolume : 1.0;
    const complianceModBowel = 1.0 / (1.0 + 0.3 * Math.max(0, bowelGasVol - 1.0));
    currentCompliance *= complianceModBowel;

    // F44 (L4): general anesthesia reduces respiratory-system compliance MODESTLY (~10-15%), via loss
    // of inspiratory-muscle tone and the cephalad diaphragm shift. The bulk of GA's respiratory-mechanics
    // penalty is FRC loss and atelectasis, which this engine already models on its own dedicated paths —
    // it must not be double-counted here.
    // This is deliberately NOT a raw multiply by `intercostalContribution`. That value (1 - 0.7*MAC,
    // floored at 0.1) is a muscle ACTIVITY index, used correctly elsewhere to detect paradoxical
    // breathing during SPONTANEOUS ventilation; multiplying a static MECHANICAL property by it was a
    // category error. Its effect was catastrophic and silent: at 1 MAC it cost 70% of static compliance,
    // so a routine maintenance case decayed to ~13 mL/cmH2O, PIP climbed to pmax, PCV-VG could no longer
    // deliver the set tidal volume, minute ventilation collapsed, and a healthy patient arrested from
    // respiratory acidosis (PaCO2 120, pH 6.2) at ~16 min with nothing administered.
    if (safeInputs.intercostalContribution !== undefined) {
      const gaDepthIndex = Math.max(0, Math.min(1, 1 - safeInputs.intercostalContribution));
      currentCompliance *= (1 - 0.12 * gaDepthIndex);
    }

    // Surfactant and compliance (Chapter 21). Only a SUBSTANTIAL surfactant deficit is mechanically
    // significant — alveolar stability is preserved across the normal-to-mildly-reduced range, and the
    // states where surfactant genuinely drives compliance (neonatal RDS, ARDS) sit far below it. The
    // prior raw `production/100` ratio was linear from the very top of the range, so the routine 1-MAC
    // volatile reduction (production 70) silently cost 30% of static compliance in every single case.
    if (safePatient.surfactantProduction !== undefined) {
      const surfactantDeficit = Math.max(0, 1 - safePatient.surfactantProduction / 100.0);
      currentCompliance *= Math.max(0.6, 1 - 0.2 * surfactantDeficit);
    }

    // Bronchospasm is a disease of airway RESISTANCE, not compliance.
    // Static compliance (Pplat) should be normal; only dynamic compliance falls
    // (from air trapping/auto-PEEP). Removing the erroneous 0.5× compliance multiplication
    // preserves the key teaching: bronchospasm = high PIP with near-normal Pplat.
    // (Auto-PEEP from air trapping is modeled separately via the resistance + PEEP terms.)
    if (safePatient.laryngospasm) {
      currentCompliance = 2;
    }
    if (safePatient.opioidRigidityActive) {
      currentCompliance = 3.0; // drops compliance to 3 mL/cmH2O
    }

    // OLV: ventilating one lung with same TV ≈ halved compliance.
    if (safePatient.olvCompliancePenaltyFraction && safePatient.olvCompliancePenaltyFraction > 0) {
      currentCompliance *= (1.0 - safePatient.olvCompliancePenaltyFraction);
    }
    // Inhalation injury: alveolar edema and mucosal injury progressively reduce compliance
    if (safePatient.inhalationInjuryCompliancePenalty && safePatient.inhalationInjuryCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.inhalationInjuryCompliancePenalty);
    }
    // Fat embolism: biochemical ARDS phase reduces compliance
    if (safePatient.femCompliancePenalty && safePatient.femCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.femCompliancePenalty);
    }
    // ISB phrenic nerve palsy: ipsilateral hemidiaphragm paralysis → ~22% compliance reduction
    if (safePatient.isbCompliancePenalty && safePatient.isbCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.isbCompliancePenalty);
    }
    // TACO: hydrostatic pulmonary edema (cardiogenic, responds to diuresis)
    if (safePatient.tacoCompliancePenalty && safePatient.tacoCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.tacoCompliancePenalty);
    }
    // Sickle cell ACS: ARDS-like pulmonary vaso-occlusion
    if (safePatient.acsCompliancePenalty && safePatient.acsCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.acsCompliancePenalty);
    }
    // Tension pneumothorax (instructor incident injection): intrapleural air collapses the lung
    if (safePatient.pneumothoraxCompliancePenalty && safePatient.pneumothoraxCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.pneumothoraxCompliancePenalty);
    }
    // Timed ARDS progression (instructor incident injection): gradual diffuse alveolar damage
    if (safePatient.ardsProgressionCompliancePenalty && safePatient.ardsProgressionCompliancePenalty > 0) {
      currentCompliance *= (1.0 - safePatient.ardsProgressionCompliancePenalty);
    }
    currentCompliance = Math.max(2, currentCompliance);

    let currentResistance = 5;
    let upperAirwayRes = 0;
    if (!safePatient.airwaySecured && safePatient.ventilationStatus === 'spontaneous') {
      const R_base = 5.0;
      const dilatorTone = typeof safePatient.dilatorMuscleTone === 'number' ? safePatient.dilatorMuscleTone : 1.0;
      const pcrit = typeof safePatient.pcrit === 'number' ? safePatient.pcrit : (safePatient.osa || safePatient.pulmonaryComorbidity?.toLowerCase().includes('osa') ? 1.0 : -5.0);
      const pAirway = typeof safeInputs.peep === 'number' ? safeInputs.peep : (safeVitals.peep || 0);

      // OSA Collapse Crisis (Ch. 10): Sleep stage REM (R) or N3, or dilator tone < 0.35 and collapse pressure exceeds airway pressure
      const isOsaCollapse = (safePatient.sleepStage === 'R' || safePatient.sleepStage === 'N3' || dilatorTone < 0.35) && (pcrit > pAirway);
      if (isOsaCollapse) {
        upperAirwayRes = 999.0;
      } else {
        upperAirwayRes = (R_base / Math.pow(dilatorTone, 2.5)) * Math.max(1.0, Math.exp(0.5 * (pcrit - pAirway)));
      }
      currentResistance = upperAirwayRes;
    } else {
      if (safePatient.isObese) currentResistance += 3;
    }
    currentResistance += pulmResistanceBonus;
    currentResistance += aspirationResistancePenalty;
    currentResistance += anaphylaxisResistancePenalty;

    if (safePatient.isBucking) {
      currentResistance += 15;
    }
    if (safePatient.bronchospasm) {
      const spasmResist = 40.0 * (safeInputs.bronchialSmoothMuscleCa !== undefined ? safeInputs.bronchialSmoothMuscleCa : 1.0);
      currentResistance += spasmResist;
    }
    if (safePatient.laryngospasm) {
      currentResistance = 999;
    }
    if (safePatient.opioidRigidityActive) {
      currentResistance = 999; // surges resistance to 999 cmH2O/L/s
    }

    // Xenon density/viscosity increase
    if (safeInputs.agent === 'xenon' && typeof safeInputs.etAgent === 'number' && safeInputs.etAgent > 0) {
      const xenonResistanceMultiplier = 1.0 + 0.4 * (safeInputs.etAgent / 70.0) * (1.0 + (safePatient.bronchospasm ? 1.5 : 0.0));
      currentResistance *= xenonResistanceMultiplier;
    }

    // Desflurane high-density paradoxical airway resistance increase (Ch21, Miller's 9th Ed,
    // p.543): unlike other volatiles, which bronchodilate, desflurane's increased inspired gas
    // density raises total respiratory system resistance R(rs) by up to 26% at 1.5 MAC, with no
    // significant effect reported at 1.0 MAC. Uses desflurane's own end-tidal concentration (as
    // with the Xenon density effect above) rather than cumulative anesthetic-depth MAC, since this
    // is a gas-density property specific to desflurane's own partial pressure, not co-administered
    // agents (e.g. N2O). mac40 = 6.0 vol% (TABLE 20.1/21.1, Miller's 9th Ed).
    if (safeInputs.agent === 'desflurane' && typeof safeInputs.etAgent === 'number' && safeInputs.etAgent > 0) {
      const desfluraneMacEquivalent = safeInputs.etAgent / 6.0;
      if (desfluraneMacEquivalent > 1.0) {
        const desfluraneResistanceMultiplier = 1.0 + 0.26 * Math.min(1.0, (desfluraneMacEquivalent - 1.0) / 0.5);
        currentResistance *= desfluraneResistanceMultiplier;
      }
    }

    // Mucus plug resistance penalty
    if (safeInputs.isMucusPlugged) {
      currentResistance += 20.0;
    }

    // Upper airway obstruction resistance penalty
    if (safeInputs.airwayObstructionIndex && safeInputs.airwayObstructionIndex > 0) {
      currentResistance += 35.0 * safeInputs.airwayObstructionIndex;
    }

    // Inhalation injury: mucosal swelling, bronchospasm from combustion products
    if (safePatient.inhalationInjuryResistancePenalty && safePatient.inhalationInjuryResistancePenalty > 0) {
      currentResistance += safePatient.inhalationInjuryResistancePenalty;
    }
    // Fat embolism: biochemical-driven airway inflammation
    if (safePatient.femResistancePenalty && safePatient.femResistancePenalty > 0) {
      currentResistance += safePatient.femResistancePenalty;
    }
    // Cholinergic toxidrome: bronchospasm + secretion flooding
    if (safePatient.cholinergicResistancePenalty && safePatient.cholinergicResistancePenalty > 0) {
      currentResistance += safePatient.cholinergicResistancePenalty;
    }
    // Timed bronchospasm progression (instructor incident injection): gradual airway narrowing
    if (safePatient.bronchospasmTrendResistancePenalty && safePatient.bronchospasmTrendResistancePenalty > 0) {
      currentResistance += safePatient.bronchospasmTrendResistancePenalty;
    }
    // TACO: airway secretions from hydrostatic edema
    if (safePatient.tacoResistancePenalty && safePatient.tacoResistancePenalty > 0) {
      currentResistance += safePatient.tacoResistancePenalty;
    }
    // Angioedema: subglottic/supraglottic swelling (bradykinin or histamine-mediated)
    if (safePatient.angioedemaResistancePenalty && safePatient.angioedemaResistancePenalty > 0) {
      currentResistance += safePatient.angioedemaResistancePenalty;
    }

    // Ventilation settings and dynamic pressure calculations
    let newPip = 0; let newVte = 0; let newPplat = 0; let newPmean = 0; let newMv = 0; let newPeep = 0;

    const baseRR = typeof safePatient.patientBaseRR === 'number' && Number.isFinite(safePatient.patientBaseRR) && safePatient.patientBaseRR > 0
      ? safePatient.patientBaseRR
      : (safeVitals.rr || 12);
    // F10 fix: flag-based apnea causes force spontaneous RR to 0. Opioid-induced chest-wall rigidity
    // (rigid thorax can't ventilate) and renarcotization (returning opioid depression) previously did
    // NOT zero the drive, so as the opioid effect decayed the hypoxic drive un-blunted and produced a
    // paradoxical tachypnea while the patient was still flagged apneic. (isApneic's rr<1 branch is
    // deliberately NOT gated here — that would latch a transient apnea permanently.)
    const flagBasedApnea = isParalyzed || safePatient.swallowingActive || safePatient.opioidRigidityActive || safePatient.renarcotizationActive;
    let patientDriveRR = flagBasedApnea ? 0 : Math.max(0, baseRR + compensatoryRR + shiveringRRDrive + safeTotalRrDelta - opioidRRDrop);
    if (safeInputs.agent === 'xenon' && typeof safeInputs.etAgent === 'number' && safeInputs.etAgent > 0) {
      const xenonRRDepression = 0.25 * safeInputs.etAgent;
      patientDriveRR = Math.max(0, patientDriveRR - xenonRRDepression);
    }
    let targetRR = patientDriveRR;
    if (safePatient.swallowingActive) {
      targetRR = 0;
    }
    targetRR = Math.max(0, targetRR * safeRuleRrScale + safeRuleRrOffset);

    // Irregular gasping breathing pattern under high C_cat (pain/stress)
    const C_cat = typeof safePatient.C_cat === 'number' ? safePatient.C_cat : 0;
    let vtGaspMultiplier = 1.0;
    if (C_cat > 30 && !isParalyzed && !isApneic) {
      const gaspSeverity = Math.min(1.0, (C_cat - 30) / 70);
      const timeSec = typeof st.time === 'number' ? st.time : 0;
      const rrOsc = Math.sin(timeSec * 0.4) * 3 + (timeSec % 7 < 3 ? -4 : 2);
      targetRR = Math.max(4, targetRR + rrOsc * gaspSeverity);
      
      // Gasping Vt multiplier (irregular deep/shallow breaths, on average deeper)
      vtGaspMultiplier = 1.0 + (Math.sin(timeSec * 0.3) * 0.4 + 0.3) * gaspSeverity;
    }

    // Cushing's reflex breathing changes: gasping or central apnea (Miller's 9th Ed Ch 11)
    if (safePatient.icp && safePatient.cpp && safePatient.icp > 20.0 && safePatient.cpp < 50.0 && !isParalyzed) {
      if (safePatient.cpp < 40.0) {
        targetRR = 0; // central apnea
      } else {
        const gaspSeverity = (50.0 - safePatient.cpp) / 10.0;
        const timeSec = typeof st.time === 'number' ? st.time : 0;
        const rrOsc = Math.sin(timeSec * 0.4) * 3 + (timeSec % 7 < 3 ? -4 : 2);
        targetRR = Math.max(4, targetRR + rrOsc * gaspSeverity);
        vtGaspMultiplier = Math.max(vtGaspMultiplier, 1.0 + (Math.sin(timeSec * 0.3) * 0.4 + 0.3) * gaspSeverity);
      }
    }



    // ibwVal needed by vent mode branching below and again for dead space (moved before use)
    let ibwVal = Number(safePatient.ibw);
    if (isNaN(ibwVal) || !Number.isFinite(ibwVal) || ibwVal <= 0) {
      ibwVal = 70.0;
    }

    if (safePatient.airwaySecured && !safePatient.circuitDisconnected && safeVentSettings) {
      newPeep = safeVentSettings.peep || 0;

      if (safeVentSettings.mode === 'PSV') {
        targetRR = patientDriveRR;
        if (targetRR === 0) {
          newPip = newPeep; newVte = 0;
        } else {
          newPip = newPeep + (safeVentSettings.ps || 10);
          newPplat = newPip - 2;
          newVte = (newPplat - newPeep) * currentCompliance;
        }
      } else if (safeVentSettings.mode === 'spontaneous') {
        targetRR = patientDriveRR;
        newVte = targetRR > 0 ? (ibwVal * 7) : 0;
        newPip = newPeep;
        newPplat = newPeep;
      } else {
        targetRR = Math.max(patientDriveRR, (safeVentSettings.rr || 12));
        if (safeVentSettings.mode === 'VCV') {
          newVte = safeVentSettings.vt || 500;
          newPplat = newPeep + (newVte / currentCompliance);

          const ieRatio = safeVentSettings.ieRatio || 2;
          const inspTimeSec = (60 / targetRR) * (1 / (1 + ieRatio));
          // VCV square-wave flow: clamp to clinical minimum 40 L/min (0.667 L/s).
          // Prior formula used I:E time-cycle only, producing 18 L/min — so low that
          // bronchospasm PIP only reached 26 vs clinical ~58 cmH2O at resistance=45 cmH2O/L/s.
          const flow_L_s = Math.max(0.667, (newVte / 1000) / inspTimeSec);
          newPip = newPplat + (flow_L_s * currentResistance);
        } else if (safeVentSettings.mode === 'PCV') {
          newPip = (safeVentSettings.pinsp || 20) + newPeep;
          newPplat = newPip - 2;
          newVte = (newPplat - newPeep) * currentCompliance;
        } else if (safeVentSettings.mode === 'PCV-VG') {
          newVte = safeVentSettings.vt || 500;
          newPplat = newPeep + (newVte / currentCompliance);
          newPip = newPplat + 2;
        }
      }
      if (safeVentSettings.pmax && newPip > safeVentSettings.pmax) {
        newPip = safeVentSettings.pmax;
        newPplat = newPip - 2;
        newVte = Math.max(0, (newPplat - newPeep) * currentCompliance);
      }
      // ET tube cuff leak (instructor incident injection): a fraction of each delivered breath
      // escapes around the cuff before it reaches the exhalation limb sensor.
      if (safePatient.cuffLeakVtePenalty && safePatient.cuffLeakVtePenalty > 0) {
        newVte *= (1.0 - safePatient.cuffLeakVtePenalty);
      }
      newPmean = newPeep + ((newPip - newPeep) / 3);
      newMv = (newVte * targetRR) / 1000;
    }
    if (newPip > 0) newPip = Math.max(0, newPip + safeRulePipOffset);

    if (safePatient.swallowingActive) {
      targetRR = 0;
      newVte = 0;
      newMv = 0;
      newPip = newPeep;
      newPplat = newPeep;
      newPmean = newPeep;
    }

    // Alveolar Ventilation
    const deadSpace = ((ibwVal * 2.2) / 1000) * deadSpaceMultiplier;
    const tidalVolLiters = (safePatient.airwaySecured ? (newVte / 1000) : ((ibwVal * 7) / 1000)) * vtGaspMultiplier;
    const currentAlvVent_L_min = Math.max(0, (tidalVolLiters - deadSpace) * targetRR);
    const baseTidalVolLiters = (ibwVal * 7) / 1000;
    const baseAlvVent_L_min = (baseTidalVolLiters - deadSpace) * 12;
    // VD/VT: physiologic dead space fraction of tidal volume. Can exceed 0.8 in severe
    // obstructive disease (key point, Miller's 9th Ed Ch13).
    const vdVtRatio = tidalVolLiters > 0.01 ? Math.min(0.95, deadSpace / tidalVolLiters) : 0;

    let targetPaCO2;
    let targetEtco2 = 0;

    const safePaCO2 = safeVitals.paco2 || 40;
    const safeSys = safeVitals.sys || 120;

    let rebreathingFraction = 0.0;
    const totalFGF = typeof safeInputs.fgf_L_min === 'number' ? safeInputs.fgf_L_min : 2.0;

    if (circuitType === 'Mapleson A') {
      const isControlled = isApneic;
      if (!isControlled) {
        const fgfReq = effectiveMV_L_min;
        if (fgfReq > 0.1 && totalFGF < fgfReq) {
          rebreathingFraction = 1.0 - (totalFGF / fgfReq);
        }
      } else {
        const fgfReq = Math.max(20.0, 3.0 * effectiveMV_L_min);
        if (fgfReq > 0.1 && totalFGF < fgfReq) {
          rebreathingFraction = 1.0 - (totalFGF / fgfReq);
        }
      }
    } else if (circuitType === 'Mapleson D') {
      const isControlled = isApneic;
      if (!isControlled) {
        const fgfReq = 2.5 * effectiveMV_L_min;
        if (fgfReq > 0.1 && totalFGF < fgfReq) {
          rebreathingFraction = 1.0 - (totalFGF / fgfReq);
        }
      } else {
        const fgfReq = 2.0 * effectiveMV_L_min;
        if (fgfReq > 0.1 && totalFGF < fgfReq) {
          rebreathingFraction = 1.0 - (totalFGF / fgfReq);
        }
      }
    } else {
      const absorbentCapacity = typeof safePatient.co2AbsorptiveCapacity === 'number' ? safePatient.co2AbsorptiveCapacity : 100.0;
      const rebreathingAbsorbent = Math.max(0, 1.0 - absorbentCapacity / 100.0);
      const rebreathingValves = (safePatient.stuckInspiratoryValve || safePatient.stuckExpiratoryValve) ? 0.40 : 0.0;
      rebreathingFraction = Math.max(rebreathingAbsorbent, rebreathingValves);
    }
    rebreathingFraction = Math.max(0.0, Math.min(0.85, rebreathingFraction));

    const currentEt = typeof safeVitals.etco2 === 'number' ? safeVitals.etco2 : 40;
    const fico2 = rebreathingFraction * currentEt;

    // Eger & Severinghaus Apnea CO2 accumulation
    if (targetRR === 0 || currentAlvVent_L_min <= 0.1) {
      const currentApneaDuration = safePatient.apneaStartTime ? (st.time - safePatient.apneaStartTime) : 0;
      const co2RiseRate_sec = (currentApneaDuration < 60) ? (6 / 60) : (3 / 60);

      targetPaCO2 = safePaCO2 + (co2RiseRate_sec * safeTotalMetabolicMultiplier);
      targetEtco2 = 0;
    } else {
      targetPaCO2 = safeBaselinePaCO2 * ((baseAlvVent_L_min * safeTotalMetabolicMultiplier) / Math.max(0.1, currentAlvVent_L_min));
      targetPaCO2 += fico2;
      targetPaCO2 = Math.max(15, Math.min(120, targetPaCO2));
      let co2Gradient = safePatient.isObese ? 7 : (safePatient.copd ? 10 : 4);
      if (safeSys < 80) co2Gradient += (80 - safeSys) * 0.5;
      targetEtco2 = Math.max(0, targetPaCO2 - co2Gradient);
    }
    // CO2 store time constant: 0.015/s (τ≈67s, 90% response in ~2.5 min).
    // Prior 0.05/s was 5× too fast — doubled RR dropped PaCO2 fully in 60s (clinical: 3-5 min).
    const newPaCO2 = safePaCO2 + (targetPaCO2 - safePaCO2) * 0.015;

    // pH calculation
    const newPh = 6.1 + Math.log10(safeHco3 / (0.03 * newPaCO2));

      // Riley Shunt exchange mathematics using recruited FRC
      const alveolarFiO2 = Math.min(100, (currentBuffer / recruitedFRC_L) * 100);
    const PAO2 = (713 * (alveolarFiO2 / 100)) - (newPaCO2 / 0.8);
    // A-a gradient: Murray & Nadel formula. Prior +4 produced A-a=14 at age 40 → SpO2 96-97%.
    // Corrected to +2.5: age 40 → 12.5 mmHg → SpO2 ~97% (clinical 97-99% for healthy adults).
    const baseAaGradient = ((safePatient.age || 40) / 4) + 2.5;
    const AaGradient = baseAaGradient + (safePatient.isObese ? 12 : 0) + (safePatient.isSeptic ? 15 : 0) + (safePatient.hasAspirated ? 25 : 0);
    const capillaryPO2 = Math.max(10, PAO2 - AaGradient);

    // Bohr Shift exponent clamping
    const safeTemp = typeof safeVitals.temp === 'number' && Number.isFinite(safeVitals.temp) ? safeVitals.temp : 37.0;
    let bohrExponent = 0.48 * (newPh - 7.4) - 0.024 * (safeTemp - 37.0) - safeVolatileRightShift + safeDpgDepletionShift;
    bohrExponent = Math.max(-5.0, Math.min(5.0, bohrExponent));
    const bohrShift = Math.pow(10, bohrExponent);

    // Capillary PO2 Bohr Clamping
    const effectiveCapillaryPO2 = Math.max(0, Math.min(10000.0, capillaryPO2 * bohrShift));
    const ScO2 = Math.min(100, ((Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2) / (Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2 + 23400)) * 100);

    // CO poisoning: CoHb% reduces functional Hb proportionally.
    // SpO2 reads falsely high (handled in pulse-ox model below) but actual O2 transport
    // is limited to the remaining Hb not bound by CO. This is the primary tissue hypoxia
    // mechanism in CO poisoning — ABG PaO2 normal, SaO2 looks OK, but O2 delivery crashes.
    // F39 (L3): this functionalHb feeds only targetSpo2 (below), which is ~invariant to it, and no
    // CaO2/DO2 is output here — so the RESP engine alone does not turn reduced functional Hb into a
    // consequence. The dyshemoglobin tissue-hypoxia consequence (methemoglobinemia / CO-poisoning lactic
    // acidosis) is instead wired at the O2-DELIVERY level in usePhysiology.js: the anaerobic-metabolism/
    // lactate trigger now uses an effective-delivery ratio = coRatio·(1 − dysHbFrac), so metHb/coHb reduce
    // tissue O2 delivery and drive real, graded lactic acidosis. This functionalHb line is left coHb-only
    // (adding metHb here is unobservable given the invariance) and the SpO2~85% artifact is unchanged.
    const coHbFraction = Math.max(0, Math.min(0.95, (safePatient.coHb || 1.0) / 100));
    const functionalHb = safeCurrentHb * (1.0 - coHbFraction);
    const capillaryO2Content = (functionalHb * 1.34 * (ScO2 / 100)) + (capillaryPO2 * 0.0031);
    const VO2_ml_min = VO2_sec * 60 * 1000;

    // Fick equation for mixed venous O2 content
    const venousO2Content = Math.max(1.0, capillaryO2Content - (VO2_ml_min / (Math.max(0.5, safeTargetCO) * 10)));

      const baselineShunt = safePatient.shuntFraction || 0.05;
      const atelectasis = safePatient.atelectasis || 0.0;
      const hpvInhibition = safeInputs.hpvInhibition !== undefined ? safeInputs.hpvInhibition : (safePatient.hpvInhibition || 0.0);
      const shuntHpvPenalty = 0.25 * atelectasis * hpvInhibition;
      
      // Airway Closure Shunt calculation (Fig 13.9 & Table 13.2, Miller's 9th Ed)
      const airwayClosureFraction = recruitedFRC_L < currentLungVols.cc_L
        ? (currentLungVols.cc_L - recruitedFRC_L) / currentLungVols.cc_L
        : 0.0;
      const airwayClosureShunt = 0.12 * airwayClosureFraction; // Up to 12% additional shunt due to dependent airway closure
      
      const olvShunt = Math.max(0, safePatient.olvShuntContribution || 0);
      const inhalShunt = Math.max(0, safePatient.inhalationInjuryShuntContribution || 0);
      const pfoShunt = Math.max(0, safePatient.pfoShuntContribution || 0);
      const finkShunt = Math.max(0, safePatient.n2oDiffusionHypoxiaShunt || 0);
      const femShunt = Math.max(0, safePatient.femShuntContribution || 0);
      const tacoShunt = Math.max(0, safePatient.tacoShuntContribution || 0);
      const acsShunt = Math.max(0, safePatient.acsShuntContribution || 0);
      const hepPulmShunt = Math.max(0, safePatient.hpsShuntContribution || 0); // hepatopulmonary syndrome
      const actualShunt = Math.max(0.02, baselineShunt - shuntReduction + hpsShunt + 0.15 * atelectasis + shuntHpvPenalty + airwayClosureShunt + olvShunt + inhalShunt + pfoShunt + finkShunt + femShunt + tacoShunt + acsShunt + hepPulmShunt);
    const arterialO2Content = (capillaryO2Content * (1 - actualShunt)) + (venousO2Content * actualShunt);

    const contentDenom = Math.max(0.1, functionalHb * 1.34);
    let targetSpo2 = Math.min(100, (arterialO2Content / contentDenom) * 100);
    let targetPaO2 = capillaryPO2 * (1 - (actualShunt * 1.5));

    // Pulse oximetry artifact model (Barker & Tremper 1987, empirically validated):
    //
    // MetHb: reads toward 85% regardless of true SaO2 as MetHb rises.
    //   SpO2_display = trueSaO2 + (85 - trueSaO2) × MetHb_frac
    //   Prior A660/A940 ratio model failed — at MetHb=30% + SaO2=97%, it read 100%.
    //
    // COHb: COHb absorbs like OxyHb at 660nm → reads as falsely high SpO2.
    //   SpO2_display = trueSaO2 × (1 - COHb_frac) + COHb_frac × 100
    //   (COHb "counts" as OxyHb at the sensor)
    const SM_frac = Math.max(0, Math.min(0.95, (safePatient.metHb || 0.8) / 100));
    const SC_frac = Math.max(0, Math.min(0.95, (safePatient.coHb || 1.0) / 100));
    const metHbAdjusted = targetSpo2 + (85 - targetSpo2) * SM_frac;       // drag toward 85%
    const coHbAdjusted = metHbAdjusted * (1 - SC_frac) + SC_frac * 100;   // COHb reads as OxyHb
    let measuredSpo2 = Math.min(100, Math.max(0, coHbAdjusted));

    if (safePatient.cyanide && safePatient.cyanide > 0.3) {
      measuredSpo2 = 100;
    }

    let newSpo2 = (safeVitals.spo2 || 100) + (measuredSpo2 - (safeVitals.spo2 || 100)) * 0.05;
    newSpo2 = Math.min(100, Math.max(0, newSpo2 + safeRuleSpo2Offset));

    const activeMechanicalVent = !safePatient.circuitDisconnected && safePatient.airwaySecured && safeVentSettings && (safeVentSettings.rr > 0 || safeVentSettings.mode === 'PCV' || safeVentSettings.mode === 'VCV' || safeVentSettings.mode === 'PCV-VG');
    const isBMVActiveVal = safePatient.ventilationStatus === 'assisted';
    // A disconnected breathing circuit reads zero EtCO2 regardless of the patient's own
    // respiratory drive — no sample line is connected to the airway to measure it from.
    const hasTidalExchange = !safePatient.circuitDisconnected && (activeMechanicalVent || isBMVActiveVal || (!isApneic && targetRR > 0));

    let newEtco2 = !hasTidalExchange ? 0 : (targetRR === 0 ? 0 : (safeVitals.etco2 || 40) + (targetEtco2 - (safeVitals.etco2 || 40)) * 0.2);

    let newRr = (safeVitals.rr || 12) + (targetRR - (safeVitals.rr || 12)) * 0.2;
    if (Math.abs(measuredSpo2 - (safeVitals.spo2 || 100)) < 1.5) newSpo2 = measuredSpo2;
    if (Math.abs(targetRR - (safeVitals.rr || 12)) < 1.5) newRr = targetRR;
    if (Math.abs(targetEtco2 - (safeVitals.etco2 || 40)) < 1.5) newEtco2 = targetEtco2;

    // F7 fix: the displayed PaO2 was FROZEN — targetPaO2 (computed above from the alveolar gas
    // equation + A-a gradient + shunt) was never applied to output vitals, so pao2 never responded to
    // ventilation and could exceed the alveolar ceiling (PaO2 > PAO2, thermodynamically impossible).
    // Apply it (damped) and hard-clamp to PAO2: arterial PO2 can never exceed alveolar PO2.
    const targetPaO2Capped = Math.min(targetPaO2, PAO2);
    let newPaO2 = (safeVitals.pao2 || 100) + (targetPaO2Capped - (safeVitals.pao2 || 100)) * 0.1;
    if (Math.abs(targetPaO2Capped - (safeVitals.pao2 || 100)) < 1.5) newPaO2 = targetPaO2Capped;
    newPaO2 = Math.max(10, Math.min(PAO2, newPaO2));

    if (safePatient.swallowingActive || (safePatient.icp && safePatient.cpp && safePatient.icp > 20.0 && safePatient.cpp < 40.0)) {
      newRr = 0;
    }

    // F30: a flag-apneic patient (paralyzed / chest-wall rigid / renarcotized) moves NO air of their own,
    // so the monitored respiratory rate must read 0 unless a machine or hand is breathing for them. The
    // drive is already zeroed for these flags (patientDriveRR=0), but a large pain/stress `ruleRrOffset`
    // under severe hypoxia leaks past it (targetRR = 0*scale + offset), which otherwise displays a
    // paradoxical RISING RR on a fully paralyzed patient — contradicting the EtCO2=0 apnea reading the
    // capnograph shows for the same tick. (Completes the F10 flag-apnea fix, which zeroed only the drive.)
    if (flagBasedApnea && !activeMechanicalVent && !isBMVActiveVal) {
      newRr = 0;
    }

    const outVitals = {
      ...safeVitals,
      spo2: Math.round(newSpo2),
      pao2: Math.round(newPaO2), // F7 fix: was never set here -> pao2 had been frozen at its input value
      paco2: newPaCO2,
      etco2: Math.round(newEtco2),
      rr: Math.round(newRr),
      pip: Math.round(newPip),
      pplat: Math.round(newPplat),
      vte: Math.round(newVte),
      pmean: Math.round(newPmean),
      mv: parseFloat(newMv.toFixed(2)),
      peep: newPeep,
      fico2: Math.round(fico2)
    };

    return {
      vitals: outVitals,
      oxygenBuffer: currentBuffer,
      isApneic,
      isParalyzed,
      lungVolumes: {
        ...currentLungVols,
        frc_L: recruitedFRC_L,
        frc_mL: Math.round(recruitedFRC_L * 1000)
      },
      currentAlvVent_L_min,
      newPaCO2,
      newPh,
      measuredSpo2,
      newSpo2,
      newRr,
      newEtco2,
      compliance: currentCompliance,
      resistance: currentResistance,
      pip: newPip,
      vte: newVte,
      fico2: Math.round(fico2),
      actualShunt,
      vdVtRatio
    };
  }
}
