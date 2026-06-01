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
    const H = heightCm / 100;
    const isMale = sex.toLowerCase() === 'male';

    let fvc_pred = 0, fev1_pred = 0, tlc_pred = 0, rv_pred = 0, frc_pred = 0;
    if (isMale) {
      fvc_pred  = 5.76 * H - 0.026 * age - 4.34;
      fev1_pred = 4.30 * H - 0.029 * age - 2.49;
      tlc_pred  = 7.99 * H - 7.08;
      rv_pred   = 1.31 * H + 0.022 * age - 1.23;
      frc_pred  = 2.34 * H + 0.009 * age - 1.09;
    } else {
      fvc_pred  = 4.43 * H - 0.026 * age - 2.89;
      fev1_pred = 3.95 * H - 0.025 * age - 2.60;
      tlc_pred  = 6.60 * H - 5.79;
      rv_pred   = 1.81 * H + 0.016 * age - 2.00;
      frc_pred  = 2.24 * H + 0.001 * age - 1.00;
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

    const obesityFactor = bmi > 25 ? Math.exp(-0.02 * (bmi - 25)) : 1.0;
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
    const posFactor = positionFactors[position] || 0.80;
    frc *= posFactor;

    frc  = Math.max(0.5, frc);
    tlc  = Math.max(2.0, tlc);
    rv   = Math.max(0.5, rv);
    fvc  = Math.max(1.0, fvc);
    fev1 = Math.max(0.5, fev1);

    const vc  = Math.max(0.5, tlc - rv);
    const erv = Math.max(0, frc - rv);
    const ibwKg = isMale ? (50 + 2.3 * ((heightCm / 2.54) - 60)) : (45.5 + 2.3 * ((heightCm / 2.54) - 60));
    const vt_L = 0.007 * ibwKg;
    const irv = Math.max(0, vc - vt_L - erv);
    const vd = ibwKg * 2.2 / 1000;

    const fev1PercentPredicted = Math.round((fev1 / fev1_pred) * 100);
    const fvcPercentPredicted = Math.round((fvc / fvc_pred) * 100);
    const fev1FvcRatio = Math.round((fev1 / fvc) * 100);

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
    }
  ): RespiratoryOutput {
    const { patient, vitals } = st;
    const {
      VO2_sec,
      totalMetabolicMultiplier,
      compensatoryRR,
      opioidRRDrop,
      m6gRrDelta,
      shiveringRRDrive,
      currentHb,
      targetMAP,
      targetCO,
      hco3,
      volatileRightShift,
      dpgDepletionShift,
      baselinePaCO2,
      anaphylaxisCompliancePenalty,
      anaphylaxisResistancePenalty,
      aspirationCompliancePenalty,
      aspirationResistancePenalty
    } = inputs;

    const {
      maxNMJOccupancy,
      totalRrDelta,
      ruleRrScale,
      ruleRrOffset,
      ruleComplScale,
      rulePipOffset,
      ruleSpo2Offset
    } = drugEffects;

    const isParalyzed = maxNMJOccupancy > 0.90;
    const isApneic = isParalyzed || (vitals.rr !== undefined ? vitals.rr < 1 : false);

    // Calculate current volumes
    const currentLungVols = this.calculateLungVolumes(
      patient.height || 170,
      patient.age || 40,
      patient.sex || 'male',
      patient.bmi || 25,
      patient.position || 'Supine',
      patient.copd || false,
      patient.restrictive || false
    );
    const currentFRC_L = currentLungVols.frc_L;

    // FRC O2 buffer calculation
    let buffer = (patient.oxygenBuffer !== undefined && patient.oxygenBuffer !== null) 
      ? patient.oxygenBuffer 
      : (currentFRC_L * 0.21);

    const isBagMaskActive = (patient.currentO2Device && patient.currentO2Device.includes('Bag-Mask')) 
      || patient.ventilationStatus === 'assisted';

    let passiveO2Influx = 0;
    if ((isParalyzed || isApneic) && !patient.airwaySecured && !isBagMaskActive) {
      const currentO2Flow = patient.currentO2Flow || 0;
      const currentFiO2 = patient.currentFiO2 || 21;
      if (currentO2Flow > 0 && currentFiO2 > 21) {
        const flowFraction = Math.min(1.0, currentO2Flow / 10.0);
        const fiO2Fraction = (currentFiO2 - 21) / (100 - 21);
        passiveO2Influx = VO2_sec * 0.8 * flowFraction * fiO2Fraction;
      }
    }

    let effectiveMV_L_min = 0;
    if (patient.airwaySecured) {
      effectiveMV_L_min = vitals.mv || 6.0;
    } else if (isBagMaskActive) {
      effectiveMV_L_min = 5.0;
    } else if (!isParalyzed && !isApneic) {
      const currentRR = vitals.rr !== undefined ? vitals.rr : 12;
      effectiveMV_L_min = (currentRR * 0.5);
    }

    if (effectiveMV_L_min > 0.1) {
      const replenishmentFiO2 = patient.airwaySecured ? deliveredFiO2 : (patient.currentFiO2 || 21);
      const targetO2_L = currentFRC_L * (replenishmentFiO2 / 100);
      const k = effectiveMV_L_min / 60 / currentFRC_L;
      buffer += k * (targetO2_L - buffer);
    } else {
      buffer -= (VO2_sec - passiveO2Influx);
    }
    buffer = Math.max(0, Math.min(currentFRC_L, buffer));
    const currentBuffer = buffer;

    // Pulmonary compliance & resistance loops
    let pulmComplianceBonus = 0;
    let pulmResistanceBonus = 0;
    if (patient.pulmonaryComorbidity) {
      const pulm = patient.pulmonaryComorbidity.toLowerCase();
      if (pulm.includes('copd gold i')) { pulmComplianceBonus = 5; pulmResistanceBonus = 5; }
      else if (pulm.includes('copd gold ii')) { pulmComplianceBonus = 10; pulmResistanceBonus = 10; }
      else if (pulm.includes('copd gold iii')) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; }
      else if (pulm.includes('copd gold iv')) { pulmComplianceBonus = 20; pulmResistanceBonus = 25; }
      else if (pulm.includes('asthma')) { pulmComplianceBonus = -12; pulmResistanceBonus = 20; }
    } else {
      if (patient.copd) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; }
    }

    let currentCompliance = 65;
    if (patient.isObese) currentCompliance -= 25;
    if (patient.isSeptic) currentCompliance -= 20;
    if (patient.trauma) currentCompliance -= 15;
    if (patient.chf) currentCompliance -= 20;
    currentCompliance += pulmComplianceBonus;
    if (patient.position === 'Trendelenburg') {
      currentCompliance *= 0.80; // 20% compliance reduction
    } else if (patient.position === 'Lithotomy') {
      currentCompliance -= 10;
    }
    currentCompliance -= aspirationCompliancePenalty;
    currentCompliance -= anaphylaxisCompliancePenalty;
    currentCompliance *= ruleComplScale;
    currentCompliance = Math.max(5, currentCompliance);

    let currentResistance = 5;
    if (patient.isObese) currentResistance += 3;
    currentResistance += pulmResistanceBonus;
    currentResistance += aspirationResistancePenalty;
    currentResistance += anaphylaxisResistancePenalty;

    // Ventilation settings and dynamic pressure calculations
    let newPip = 0; let newVte = 0; let newPplat = 0; let newPmean = 0; let newMv = 0; let newPeep = 0;

    let patientDriveRR = isParalyzed ? 0 : Math.max(0, (vitals.rr || 12) + compensatoryRR + shiveringRRDrive + totalRrDelta - opioidRRDrop);
    let targetRR = patientDriveRR;
    targetRR = Math.max(0, targetRR * ruleRrScale + ruleRrOffset);

    if (patient.airwaySecured && ventSettings) {
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
    if (newPip > 0) newPip = Math.max(0, newPip + rulePipOffset);

    // Alveolar Ventilation
    const deadSpace = (patient.ibw * 2.2) / 1000;
    const tidalVolLiters = patient.airwaySecured ? (newVte / 1000) : ((patient.ibw * 7) / 1000);
    const currentAlvVent_L_min = Math.max(0, (tidalVolLiters - deadSpace) * targetRR);
    const baseTidalVolLiters = (patient.ibw * 7) / 1000;
    const baseAlvVent_L_min = (baseTidalVolLiters - deadSpace) * 12;

    let targetPaCO2;
    let targetEtco2 = 0;

    const safePaCO2 = vitals.paco2 || 40;
    const safeSys = vitals.sys || 120;

    // Eger & Severinghaus Apnea CO2 accumulation
    if (targetRR === 0 || currentAlvVent_L_min <= 0.1) {
      const currentApneaDuration = patient.apneaStartTime ? (st.time - patient.apneaStartTime) : 0;
      const co2RiseRate_sec = (currentApneaDuration < 60) ? (6 / 60) : (3 / 60);

      targetPaCO2 = safePaCO2 + (co2RiseRate_sec * totalMetabolicMultiplier);
      targetEtco2 = 0;
    } else {
      targetPaCO2 = baselinePaCO2 * ((baseAlvVent_L_min * totalMetabolicMultiplier) / Math.max(0.1, currentAlvVent_L_min));
      targetPaCO2 = Math.max(15, Math.min(120, targetPaCO2));
      let co2Gradient = patient.isObese ? 7 : (patient.copd ? 10 : 4);
      if (safeSys < 80) co2Gradient += (80 - safeSys) * 0.5;
      targetEtco2 = Math.max(0, targetPaCO2 - co2Gradient);
    }
    const newPaCO2 = safePaCO2 + (targetPaCO2 - safePaCO2) * 0.05;

    // pH calculation
    const newPh = 6.1 + Math.log10(hco3 / (0.03 * newPaCO2));

    // Riley Shunt exchange mathematics
    const alveolarFiO2 = Math.min(100, (currentBuffer / currentFRC_L) * 100);
    const PAO2 = (713 * (alveolarFiO2 / 100)) - (newPaCO2 / 0.8);
    const baseAaGradient = (patient.age / 4) + 4;
    const AaGradient = baseAaGradient + (patient.isObese ? 12 : 0) + (patient.isSeptic ? 15 : 0) + (patient.hasAspirated ? 25 : 0);
    const capillaryPO2 = Math.max(10, PAO2 - AaGradient);

    // Bohr Shift
    const bohrShift = Math.pow(10, 0.48 * (newPh - 7.4) - 0.024 * (vitals.temp - 37.0) - volatileRightShift + dpgDepletionShift);

    const effectiveCapillaryPO2 = capillaryPO2 * bohrShift;
    const ScO2 = Math.min(100, ((Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2) / (Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2 + 23400)) * 100);

    const capillaryO2Content = (currentHb * 1.34 * (ScO2 / 100)) + (capillaryPO2 * 0.0031);
    const VO2_ml_min = VO2_sec * 60 * 1000;

    // Fick equation for mixed venous O2 content
    const venousO2Content = Math.max(1.0, capillaryO2Content - (VO2_ml_min / (Math.max(0.5, targetCO) * 10)));

    const actualShunt = patient.shuntFraction || 0.05;
    const arterialO2Content = (capillaryO2Content * (1 - actualShunt)) + (venousO2Content * actualShunt);

    let targetSpo2 = Math.min(100, (arterialO2Content / (currentHb * 1.34)) * 100);
    let targetPaO2 = capillaryPO2 * (1 - (actualShunt * 1.5));

    // Optical pulse oximetry model
    const SaO2 = targetSpo2;
    const SM = (patient.metHb || 0.8) / 100;
    const SC = (patient.coHb || 1.0) / 100;
    const SO = (SaO2 / 100) * (1 - SM - SC);
    const SD = ((100 - SaO2) / 100) * (1 - SM - SC);
    const A660 = 0.1 * SO + 1.0 * SD + 1.0 * SM + 0.1 * SC;
    const A940 = 1.0 * SO + 0.1 * SD + 1.0 * SM + 1.0 * SC;
    const R_ratio = A660 / A940;

    let measuredSpo2 = 110 - 25 * R_ratio;
    measuredSpo2 = Math.min(100, Math.max(0, measuredSpo2));

    if (patient.cyanide && patient.cyanide > 0.3) {
      measuredSpo2 = 100;
    }

    let newSpo2 = (vitals.spo2 || 100) + (measuredSpo2 - (vitals.spo2 || 100)) * 0.05;
    newSpo2 = Math.min(100, Math.max(0, newSpo2 + ruleSpo2Offset));

    const activeMechanicalVent = patient.airwaySecured && ventSettings && (ventSettings.rr > 0 || ventSettings.mode === 'PCV' || ventSettings.mode === 'VCV' || ventSettings.mode === 'PCV-VG');
    const isBMVActiveVal = patient.ventilationStatus === 'assisted';
    const hasTidalExchange = activeMechanicalVent || isBMVActiveVal || (!isApneic && targetRR > 0);

    let newEtco2 = !hasTidalExchange ? 0 : (targetRR === 0 ? 0 : (vitals.etco2 || 40) + (targetEtco2 - (vitals.etco2 || 40)) * 0.2);

    let newRr = (vitals.rr || 12) + (targetRR - (vitals.rr || 12)) * 0.2;
    if (Math.abs(measuredSpo2 - (vitals.spo2 || 100)) < 1.5) newSpo2 = measuredSpo2;
    if (Math.abs(targetRR - (vitals.rr || 12)) < 1.5) newRr = targetRR;
    if (Math.abs(targetEtco2 - (vitals.etco2 || 40)) < 1.5) newEtco2 = targetEtco2;

    const outVitals = {
      ...vitals,
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
      lungVolumes: currentLungVols,
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
