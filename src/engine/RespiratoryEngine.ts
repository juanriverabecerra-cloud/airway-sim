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
  pulmonaryComorbidity?: string;
  laryngospasm?: boolean;
  bronchospasm?: boolean;
  isBucking?: boolean;
  C_cat?: number;
  swallowingActive?: boolean;
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
    isRestrictive: boolean = false
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

    const obesityFactor = safeBmi > 25 ? Math.exp(-0.02 * (safeBmi - 25)) : 1.0;
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
      obesityFactor: parseFloat(obesityFactor.toFixed(3)),
      positionFactor: posFactor,
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
    const isApneic = isParalyzed || safePatient.swallowingActive || (safeVitals.rr !== undefined && Number.isFinite(safeVitals.rr) ? safeVitals.rr < 1 : false);

    // Calculate current volumes
    const currentLungVols = this.calculateLungVolumes(
      safePatient.height || 170,
      safePatient.age || 40,
      safePatient.sex || 'male',
      safePatient.bmi || 25,
      safePatient.position || 'Supine',
      safePatient.copd || false,
      safePatient.restrictive || false
    );
      const currentFRC_L = currentLungVols.frc_L;

      const currentO2DeviceStr = typeof safePatient.currentO2Device === 'string' ? safePatient.currentO2Device : '';
      const isBagMaskActive = currentO2DeviceStr.includes('Bag-Mask') 
        || safePatient.ventilationStatus === 'assisted';

      // Calculate non-invasive positive airway pressure (PEEP)
      let nippvPeep = 0;
      if (currentO2DeviceStr.includes('CPAP')) {
        nippvPeep = safePatient.nippv?.epap || 5;
      } else if (currentO2DeviceStr.includes('BiPAP')) {
        nippvPeep = safePatient.nippv?.epap || 5;
      } else if (currentO2DeviceStr.includes('HFNC') || currentO2DeviceStr.includes('High Flow')) {
        // HFNC delivers approx 1 cmH2O of PEEP per 10 L/min of flow with mouth closed
        nippvPeep = Math.min(6.0, (safePatient.currentO2Flow || 50) / 10.0);
      } else if (isBagMaskActive) {
        nippvPeep = safePatient.bmvPeep || 5;
      }

      // PEEP recruits collapsed/atelectatic alveoli, expanding the effective FRC volume
      const shuntReduction = nippvPeep > 0 ? Math.min(0.15, nippvPeep * 0.015) : 0;
      const lungRecruitment = nippvPeep > 0 ? (safePatient.isObese || safePatient.chf ? 0.045 : 0.03) * nippvPeep : 0;
      const recruitedFRC_L = currentFRC_L * (1.0 + lungRecruitment);

      // FRC O2 buffer calculation based on recruited FRC volume
      let buffer = (typeof safePatient.oxygenBuffer === 'number' && Number.isFinite(safePatient.oxygenBuffer)) 
        ? safePatient.oxygenBuffer 
        : (recruitedFRC_L * 0.21);

      let passiveO2Influx = 0;
      if ((isParalyzed || isApneic) && !safePatient.airwaySecured && !isBagMaskActive) {
        const currentO2Flow = safePatient.currentO2Flow || 0;
        const currentFiO2 = safePatient.currentFiO2 || 21;
        
        if (currentO2Flow > 0 && currentFiO2 > 21) {
          const flowFraction = Math.min(1.0, currentO2Flow / 15.0);
          const fiO2Fraction = (currentFiO2 - 21) / (100 - 21);
          passiveO2Influx = VO2_sec * 0.9 * flowFraction * fiO2Fraction;
        }
        
        if (currentO2DeviceStr.includes('HFNC') || currentO2DeviceStr.includes('High Flow')) {
          const fiO2Fraction = (currentFiO2 - 21) / (100 - 21);
          passiveO2Influx = VO2_sec * 0.98 * fiO2Fraction;
        } else if (currentO2DeviceStr.includes('CPAP') || currentO2DeviceStr.includes('BiPAP')) {
          const fiO2Fraction = (currentFiO2 - 21) / (100 - 21);
          passiveO2Influx = VO2_sec * 0.95 * fiO2Fraction;
        }
      }

      let effectiveMV_L_min = 0;
      if (safePatient.airwaySecured) {
        effectiveMV_L_min = safeVitals.mv || 6.0;
      } else if (isBagMaskActive) {
        effectiveMV_L_min = 5.0;
      } else if (!isParalyzed && !isApneic) {
        const currentRR = safeVitals.rr !== undefined && Number.isFinite(safeVitals.rr) ? safeVitals.rr : 12;
        effectiveMV_L_min = (currentRR * 0.5);
      }

      if (effectiveMV_L_min > 0.1) {
        let replenishmentFiO2 = safePatient.airwaySecured ? Number(deliveredFiO2) : Number(safePatient.currentFiO2 || 21);
        if (isNaN(replenishmentFiO2) || !Number.isFinite(replenishmentFiO2)) {
          replenishmentFiO2 = 21;
        }
        replenishmentFiO2 = Math.max(10, Math.min(100, replenishmentFiO2));
        
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
      buffer = Math.max(0, Math.min(recruitedFRC_L, buffer));
      const currentBuffer = buffer;

    // Pulmonary compliance & resistance loops
    let pulmComplianceBonus = 0;
    let pulmResistanceBonus = 0;
    const pulmComorbStr = typeof safePatient.pulmonaryComorbidity === 'string' ? safePatient.pulmonaryComorbidity.toLowerCase() : '';
    if (pulmComorbStr) {
      if (pulmComorbStr.includes('copd gold i')) { pulmComplianceBonus = 5; pulmResistanceBonus = 5; }
      else if (pulmComorbStr.includes('copd gold ii')) { pulmComplianceBonus = 10; pulmResistanceBonus = 10; }
      else if (pulmComorbStr.includes('copd gold iii')) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; }
      else if (pulmComorbStr.includes('copd gold iv')) { pulmComplianceBonus = 20; pulmResistanceBonus = 25; }
      else if (pulmComorbStr.includes('asthma')) { pulmComplianceBonus = -12; pulmResistanceBonus = 20; }
    } else {
      if (safePatient.copd) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; }
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
    }
    currentCompliance -= aspirationCompliancePenalty;
    currentCompliance -= anaphylaxisCompliancePenalty;
    currentCompliance -= fluidOverloadCompliancePenalty;
    currentCompliance *= safeRuleComplScale;

    const bowelGasVol = typeof safeVitals.bowelGasVolume === 'number' && Number.isFinite(safeVitals.bowelGasVolume) ? safeVitals.bowelGasVolume : 1.0;
    const complianceModBowel = 1.0 / (1.0 + 0.3 * Math.max(0, bowelGasVol - 1.0));
    currentCompliance *= complianceModBowel;

    if (safePatient.bronchospasm) {
      currentCompliance *= 0.5;
    }
    if (safePatient.laryngospasm) {
      currentCompliance = 2;
    }
    currentCompliance = Math.max(2, currentCompliance);

    let currentResistance = 5;
    if (safePatient.isObese) currentResistance += 3;
    currentResistance += pulmResistanceBonus;
    currentResistance += aspirationResistancePenalty;
    currentResistance += anaphylaxisResistancePenalty;

    if (safePatient.isBucking) {
      currentResistance += 15;
    }
    if (safePatient.bronchospasm) {
      currentResistance += 40;
    }
    if (safePatient.laryngospasm) {
      currentResistance = 999;
    }

    // Ventilation settings and dynamic pressure calculations
    let newPip = 0; let newVte = 0; let newPplat = 0; let newPmean = 0; let newMv = 0; let newPeep = 0;

    const baseRR = typeof safePatient.patientBaseRR === 'number' && Number.isFinite(safePatient.patientBaseRR) && safePatient.patientBaseRR > 0
      ? safePatient.patientBaseRR
      : (safeVitals.rr || 12);
    let patientDriveRR = (isParalyzed || safePatient.swallowingActive) ? 0 : Math.max(0, baseRR + compensatoryRR + shiveringRRDrive + safeTotalRrDelta - opioidRRDrop);
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

    if (safePatient.airwaySecured && ventSettings) {
      newPeep = ventSettings.peep || 0;

      if (ventSettings.mode === 'PSV') {
        targetRR = patientDriveRR;
        if (targetRR === 0) {
          newPip = newPeep; newVte = 0;
        } else {
          newPip = newPeep + (ventSettings.ps || 10);
          newPplat = newPip - 2;
          newVte = (newPplat - newPeep) * currentCompliance;
        }
      } else {
        targetRR = Math.max(patientDriveRR, (ventSettings.rr || 12));
        if (ventSettings.mode === 'VCV') {
          newVte = ventSettings.vt || 500;
          newPplat = newPeep + (newVte / currentCompliance);

          const ieRatio = ventSettings.ieRatio || 2;
          const inspTimeSec = (60 / targetRR) * (1 / (1 + ieRatio));
          const flow_L_s = (newVte / 1000) / inspTimeSec;
          newPip = newPplat + (flow_L_s * currentResistance * 5);
        } else if (ventSettings.mode === 'PCV') {
          newPip = (ventSettings.pinsp || 20) + newPeep;
          newPplat = newPip - 2;
          newVte = (newPplat - newPeep) * currentCompliance;
        } else if (ventSettings.mode === 'PCV-VG') {
          newVte = ventSettings.vt || 500;
          newPplat = newPeep + (newVte / currentCompliance);
          newPip = newPplat + 2;
        }
      }
      if (ventSettings.pmax && newPip > ventSettings.pmax) {
        newPip = ventSettings.pmax;
        newPplat = newPip - 2;
        newVte = Math.max(0, (newPplat - newPeep) * currentCompliance);
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
    let ibwVal = Number(safePatient.ibw);
    if (isNaN(ibwVal) || !Number.isFinite(ibwVal) || ibwVal <= 0) {
      ibwVal = 70.0;
    }
    const deadSpace = (ibwVal * 2.2) / 1000;
    const tidalVolLiters = (safePatient.airwaySecured ? (newVte / 1000) : ((ibwVal * 7) / 1000)) * vtGaspMultiplier;
    const currentAlvVent_L_min = Math.max(0, (tidalVolLiters - deadSpace) * targetRR);
    const baseTidalVolLiters = (ibwVal * 7) / 1000;
    const baseAlvVent_L_min = (baseTidalVolLiters - deadSpace) * 12;

    let targetPaCO2;
    let targetEtco2 = 0;

    const safePaCO2 = safeVitals.paco2 || 40;
    const safeSys = safeVitals.sys || 120;

    // Eger & Severinghaus Apnea CO2 accumulation
    if (targetRR === 0 || currentAlvVent_L_min <= 0.1) {
      const currentApneaDuration = safePatient.apneaStartTime ? (st.time - safePatient.apneaStartTime) : 0;
      const co2RiseRate_sec = (currentApneaDuration < 60) ? (6 / 60) : (3 / 60);

      targetPaCO2 = safePaCO2 + (co2RiseRate_sec * safeTotalMetabolicMultiplier);
      targetEtco2 = 0;
    } else {
      targetPaCO2 = safeBaselinePaCO2 * ((baseAlvVent_L_min * safeTotalMetabolicMultiplier) / Math.max(0.1, currentAlvVent_L_min));
      targetPaCO2 = Math.max(15, Math.min(120, targetPaCO2));
      let co2Gradient = safePatient.isObese ? 7 : (safePatient.copd ? 10 : 4);
      if (safeSys < 80) co2Gradient += (80 - safeSys) * 0.5;
      targetEtco2 = Math.max(0, targetPaCO2 - co2Gradient);
    }
    const newPaCO2 = safePaCO2 + (targetPaCO2 - safePaCO2) * 0.05;

    // pH calculation
    const newPh = 6.1 + Math.log10(safeHco3 / (0.03 * newPaCO2));

      // Riley Shunt exchange mathematics using recruited FRC
      const alveolarFiO2 = Math.min(100, (currentBuffer / recruitedFRC_L) * 100);
    const PAO2 = (713 * (alveolarFiO2 / 100)) - (newPaCO2 / 0.8);
    const baseAaGradient = ((safePatient.age || 40) / 4) + 4;
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

    const capillaryO2Content = (safeCurrentHb * 1.34 * (ScO2 / 100)) + (capillaryPO2 * 0.0031);
    const VO2_ml_min = VO2_sec * 60 * 1000;

    // Fick equation for mixed venous O2 content
    const venousO2Content = Math.max(1.0, capillaryO2Content - (VO2_ml_min / (Math.max(0.5, safeTargetCO) * 10)));

      const baselineShunt = safePatient.shuntFraction || 0.05;
      const actualShunt = Math.max(0.02, baselineShunt - shuntReduction + hpsShunt);
    const arterialO2Content = (capillaryO2Content * (1 - actualShunt)) + (venousO2Content * actualShunt);

    const contentDenom = Math.max(0.1, safeCurrentHb * 1.34);
    let targetSpo2 = Math.min(100, (arterialO2Content / contentDenom) * 100);
    let targetPaO2 = capillaryPO2 * (1 - (actualShunt * 1.5));

    // Optical pulse oximetry model
    const SaO2 = targetSpo2;
    const SM = (safePatient.metHb || 0.8) / 100;
    const SC = (safePatient.coHb || 1.0) / 100;
    const SO = (SaO2 / 100) * (1 - SM - SC);
    const SD = ((100 - SaO2) / 100) * (1 - SM - SC);
    const A660 = 0.1 * SO + 1.0 * SD + 1.0 * SM + 0.1 * SC;
    const A940 = 1.0 * SO + 0.1 * SD + 1.0 * SM + 1.0 * SC;
    
    // Clamp A940 denominator to prevent division-by-zero
    const R_ratio = A940 > 0.0001 ? A660 / A940 : A660 / 0.0001;

    let measuredSpo2 = 110 - 25 * R_ratio;
    measuredSpo2 = Math.min(100, Math.max(0, measuredSpo2));

    if (safePatient.cyanide && safePatient.cyanide > 0.3) {
      measuredSpo2 = 100;
    }

    let newSpo2 = (safeVitals.spo2 || 100) + (measuredSpo2 - (safeVitals.spo2 || 100)) * 0.05;
    newSpo2 = Math.min(100, Math.max(0, newSpo2 + safeRuleSpo2Offset));

    const activeMechanicalVent = safePatient.airwaySecured && ventSettings && (ventSettings.rr > 0 || ventSettings.mode === 'PCV' || ventSettings.mode === 'VCV' || ventSettings.mode === 'PCV-VG');
    const isBMVActiveVal = safePatient.ventilationStatus === 'assisted';
    const hasTidalExchange = activeMechanicalVent || isBMVActiveVal || (!isApneic && targetRR > 0);

    let newEtco2 = !hasTidalExchange ? 0 : (targetRR === 0 ? 0 : (safeVitals.etco2 || 40) + (targetEtco2 - (safeVitals.etco2 || 40)) * 0.2);

    let newRr = (safeVitals.rr || 12) + (targetRR - (safeVitals.rr || 12)) * 0.2;
    if (Math.abs(measuredSpo2 - (safeVitals.spo2 || 100)) < 1.5) newSpo2 = measuredSpo2;
    if (Math.abs(targetRR - (safeVitals.rr || 12)) < 1.5) newRr = targetRR;
    if (Math.abs(targetEtco2 - (safeVitals.etco2 || 40)) < 1.5) newEtco2 = targetEtco2;

    if (safePatient.swallowingActive) {
      newRr = 0;
    }

    const outVitals = {
      ...safeVitals,
      spo2: Math.round(newSpo2),
      paco2: newPaCO2,
      etco2: Math.round(newEtco2),
      rr: Math.round(newRr),
      pip: Math.round(newPip),
      pplat: Math.round(newPplat),
      vte: Math.round(newVte),
      pmean: Math.round(newPmean),
      mv: parseFloat(newMv.toFixed(2)),
      peep: newPeep
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
      vte: newVte
    };
  }
}
