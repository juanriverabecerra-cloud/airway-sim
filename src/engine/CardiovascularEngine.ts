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
  celiacBlockActive?: boolean;
  hasPoPHCollapse?: boolean;
  ischemiaActive?: boolean;
  ischemiaMildLogged?: boolean;
  ischemiaSevereLogged?: boolean;
  hasPneumothorax?: boolean;
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
    }
  ): ResuscitationOutput {
    const events: string[] = [];
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
    const safeSVR = typeof vitals.svr === 'number' && Number.isFinite(vitals.svr) ? vitals.svr : 1200;

    const safeCurrentMac = typeof inputs.currentMac === 'number' && Number.isFinite(inputs.currentMac) ? Math.max(0, inputs.currentMac) : 0;
    const safeBloodLossRatio = typeof inputs.bloodLossRatio === 'number' && Number.isFinite(inputs.bloodLossRatio) ? Math.max(0, Math.min(1.0, inputs.bloodLossRatio)) : 0;
    const safeCurrentEbl = typeof inputs.currentEbl === 'number' && Number.isFinite(inputs.currentEbl) ? Math.max(0, inputs.currentEbl) : 0;
    const safePreloadMod = typeof inputs.positionPreloadMod === 'number' && Number.isFinite(inputs.positionPreloadMod) ? inputs.positionPreloadMod : 0;
    const safeHydrostaticMod = typeof inputs.positionHydrostaticMod === 'number' && Number.isFinite(inputs.positionHydrostaticMod) ? inputs.positionHydrostaticMod : 0;
    const safeShiveringMultiplier = typeof inputs.shiveringMultiplier === 'number' && Number.isFinite(inputs.shiveringMultiplier) ? Math.max(0, inputs.shiveringMultiplier) : 1.0;
    const safeBuffer = typeof inputs.currentBuffer === 'number' && Number.isFinite(inputs.currentBuffer) ? Math.max(0, inputs.currentBuffer) : 0.5;
    const safeFRC_L = typeof inputs.currentFRC_L === 'number' && Number.isFinite(inputs.currentFRC_L) && inputs.currentFRC_L > 0 ? inputs.currentFRC_L : 2.4;
    const safeNewTemp = typeof inputs.newTemp === 'number' && Number.isFinite(inputs.newTemp) ? Math.max(20, Math.min(45, inputs.newTemp)) : 37;

    const safeDrugSvrMod = typeof drugEffects.drugSvrMod === 'number' && Number.isFinite(drugEffects.drugSvrMod) ? Math.max(0.1, drugEffects.drugSvrMod) : 1.0;
    const safeDrugInotropyMod = typeof drugEffects.drugInotropyMod === 'number' && Number.isFinite(drugEffects.drugInotropyMod) ? Math.max(0.1, drugEffects.drugInotropyMod) : 1.0;
    const safeSvrSympatheticSpike = typeof drugEffects.svrSympatheticSpike === 'number' && Number.isFinite(drugEffects.svrSympatheticSpike) ? drugEffects.svrSympatheticSpike : 0;
    const safeContractilitySympatheticSpike = typeof drugEffects.contractilitySympatheticSpike === 'number' && Number.isFinite(drugEffects.contractilitySympatheticSpike) ? drugEffects.contractilitySympatheticSpike : 0;
    const safeHrSympatheticSpike = typeof drugEffects.hrSympatheticSpike === 'number' && Number.isFinite(drugEffects.hrSympatheticSpike) ? drugEffects.hrSympatheticSpike : 0;
    const safeShiveringHRDrive = typeof drugEffects.shiveringHRDrive === 'number' && Number.isFinite(drugEffects.shiveringHRDrive) ? drugEffects.shiveringHRDrive : 0;
    const safeAnaphylaxisHrMod = typeof drugEffects.anaphylaxisHrMod === 'number' && Number.isFinite(drugEffects.anaphylaxisHrMod) ? drugEffects.anaphylaxisHrMod : 0;
    const safeAnaphylaxisSvrMod = typeof drugEffects.anaphylaxisSvrMod === 'number' && Number.isFinite(drugEffects.anaphylaxisSvrMod) ? drugEffects.anaphylaxisSvrMod : 1.0;

    let totalHrDelta = typeof drugEffects.totalHrDelta === 'number' && Number.isFinite(drugEffects.totalHrDelta) ? drugEffects.totalHrDelta : 0;

    // Autonomic reflexes: Baroreceptor Reflex
    let baroreflexGain = Math.max(0, 1.0 - safeCurrentMac * 0.67);
    if (patient.isAwarenessActive) {
      baroreflexGain = 0; // Overridden by central sympathetic surge during awareness crisis
    }
    const baseSBP_set = patient.patientBaseSBP || 120;
    const baseDBP_set = patient.patientBaseDBP || 80;
    const MAP_set = baseDBP_set + (baseSBP_set - baseDBP_set) / 3.0;
    const errorBaro = safeMap - MAP_set;
    let autonomicHrMod = Math.max(-25, Math.min(30, -0.5 * errorBaro * baroreflexGain));

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

    const sympatheticBlock = (patient.epiduralBlockActive || patient.celiacBlockActive) ? 1.0 : 0.0;
    const hasNeoSynephrine = inputs.activeMeds.some(m => m.name === 'Phenylephrine' && m.A1 > 0.1);
    const hasNorepi = inputs.activeMeds.some(m => m.name === 'Norepinephrine' && m.A1 > 0.1);
    const hasEpi = inputs.activeMeds.some(m => m.name === 'Epinephrine' && m.A1 > 0.1);
    const alphaAgonistEffect = (hasNeoSynephrine || hasNorepi || hasEpi) ? 1.0 : 0.0;
    const splanchnicVol = 1.0 + 0.3 * sympatheticBlock * (1.0 - alphaAgonistEffect);
    const splanchnicPoolingOffset = 1000 * (splanchnicVol - 1.0);

    const effectiveIntravascularVolume = Math.max(100, safeEbv - safeCurrentEbl + safePreloadMod + volumeOffset - splanchnicPoolingOffset);
    let newStunning = typeof patient.myocardialStunning === 'number' && Number.isFinite(patient.myocardialStunning) ? patient.myocardialStunning : 0;
    const inotropyInitial = Math.max(0.01, 1.0 - (newStunning / 100) + safeContractilitySympatheticSpike + (safeDrugInotropyMod - 1.0));

    // Left Ventricular End-Diastolic Pressure (LVEDP)
    const baseLVEDP = 8.0;
    const lvedpVal = Math.max(2.0, Math.min(40.0, baseLVEDP + 4.0 * ((effectiveIntravascularVolume - safeEbv) / 250) + 5.0 / inotropyInitial));

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
    const coronaryStenosisModVal = (patient.cad || patient.hasCAD) ? 0.40 : 1.0;
    const supplyVal = cppCoronaryVal * diastoleTimeRatioVal * caO2Val * coronaryStenosisModVal * 8.5;

    // Ischemia & Stunning Loop
    let stunningIncrease = 0;
    const isCurrentlyIschemic = (supplyVal < mvo2Val) && !isArrestState;
    if (isCurrentlyIschemic) {
      stunningIncrease = Math.round((mvo2Val - supplyVal) * 0.0000381 * 10) / 10;
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

    const inotropyFinal = Math.max(0.01, 1.0 - (newStunning / 100) + safeContractilitySympatheticSpike + (safeDrugInotropyMod - 1.0));

    // Frank-Starling stroke volume preload factor
    const starlingPreloadSV = 1.2 * (1.0 - Math.exp(-0.15 * lvedpVal));
    const preloadSV = Math.max(0.1, starlingPreloadSV * (1.0 - safeBloodLossRatio * 1.2));

    const shiveringHRDriveVal = (safeShiveringMultiplier > 1.0) ? ((safeShiveringMultiplier - 1.0) * 15) : 0;

    // AFib HR Flutter
    let afibHRFlutter = 0;
    if (patient.afib || patient.hasAFib || patient.cardiacRhythm === 'afib') {
      afibHRFlutter = (Math.random() - 0.5) * 12;
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
    let targetHR = Math.max(0, baseHR + totalHrDelta + adjustedAutonomicHrMod + adjustedHypovolemicTachy + safeHrSympatheticSpike + shiveringHRDriveVal + afibHRFlutter + safeAnaphylaxisHrMod + hrBainbridge);
    const safeRuleHrScale = typeof drugEffects.ruleHrScale === 'number' && Number.isFinite(drugEffects.ruleHrScale) ? drugEffects.ruleHrScale : 1.0;
    const safeRuleHrOffset = typeof drugEffects.ruleHrOffset === 'number' && Number.isFinite(drugEffects.ruleHrOffset) ? drugEffects.ruleHrOffset : 0;
    targetHR = targetHR * safeRuleHrScale + safeRuleHrOffset;
    if (drugEffects.ruleHrClamp !== undefined && Number.isFinite(drugEffects.ruleHrClamp)) targetHR = Math.min(drugEffects.ruleHrClamp, targetHR);
    targetHR = Math.max(0, targetHR);

    // CHF inotropic EF penalty
    let chfInotropicPenalty = 1.0;
    if (patient.chf) {
      const safeEf = typeof patient.ef === 'number' && Number.isFinite(patient.ef) && patient.ef > 0 ? patient.ef : 55;
      chfInotropicPenalty = Math.max(0.15, safeEf / 55);
    }
    
    const baseSV = typeof patient.patientBaseSV === 'number' && Number.isFinite(patient.patientBaseSV) && patient.patientBaseSV > 0 ? patient.patientBaseSV : 70;
    const maxSV = baseSV * (patient.chf ? 1.0 : 1.6);

    // AFib SV Penalty (15% reduction)
    const afibSVModifier = (patient.afib || patient.hasAFib || patient.cardiacRhythm === 'afib') ? 0.85 : 1.0;

    let currentSV = Math.min(maxSV, baseSV * preloadSV * Math.max(0.1, inotropyFinal) * chfInotropicPenalty * afibSVModifier);
    if (patient.hasPneumothorax) {
      currentSV *= 0.3; // 70% drop in SV due to vena cava compression
    }
    currentSV = Math.max(0.1, currentSV);

    // SVR computation
    const baseSVR = typeof patient.patientBaseSVR === 'number' && Number.isFinite(patient.patientBaseSVR) && patient.patientBaseSVR > 0 ? patient.patientBaseSVR : 1200;
    let targetSVR = (baseSVR * safeDrugSvrMod * (patient.isSeptic ? 0.6 : 1.0) * safeAnaphylaxisSvrMod * (bjActive ? 0.75 : 1.0) * (1.0 - 0.15 * sympatheticBlock)) + safeSvrSympatheticSpike;
    targetSVR = Math.max(50, targetSVR);

    const targetCO = Math.max(0, Math.min(30.0, (targetHR * currentSV) / 1000));

    // Systemic MAP Shifts
    const pressorMAPShift = ((effectiveIntravascularVolume - safeEbv) / 250) * 8;
    const sepsisMAPShift = patient.isSeptic ? -33.33 : 0;

    // Damped transitions to resolve Ohm's law violations
    let newCO = safeCO + (targetCO - safeCO) * 0.1;
    let newSVR = safeSVR + (targetSVR - safeSVR) * 0.1;
    if (Math.abs(targetCO - safeCO) < 0.05) newCO = targetCO;
    if (Math.abs(targetSVR - safeSVR) < 5) newSVR = targetSVR;
    if (isArrestState) {
      newCO = targetCO;
    }

    let exactMap = ((newCO * newSVR) / 80) + pressorMAPShift + sepsisMAPShift;
    if (patient.hasPneumothorax) {
      exactMap = Math.max(15, exactMap - 30); // 30 mmHg MAP drop
    }
    const safeRuleMapScale = typeof drugEffects.ruleMapScale === 'number' && Number.isFinite(drugEffects.ruleMapScale) ? drugEffects.ruleMapScale : 1.0;
    const safeRuleMapOffset = typeof drugEffects.ruleMapOffset === 'number' && Number.isFinite(drugEffects.ruleMapOffset) ? drugEffects.ruleMapOffset : 0;
    exactMap = exactMap * safeRuleMapScale + safeRuleMapOffset;
    exactMap = Math.min(220, Math.max(15, exactMap));

    // Derive SBP & DBP using mathematically consistent Pulse Pressure PP
    const pulsePressureRatio = Math.max(0.2, Math.min(2.5, (currentSV / baseSV)));
    const basePP = 40 * pulsePressureRatio;

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
    const hrMicro = isArrestState ? 0 : (Math.random() - 0.5) * 0.4;
    const bpMicro = isArrestState ? 0 : (Math.random() - 0.5) * 0.7;

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

    // CPR Resuscitation Pressures
    if (isArrestState) {
      roundedSys = patient.cprActive ? Math.round(80 + (Math.random() * 15)) : 0;
      roundedDia = patient.cprActive ? Math.round(25 + (Math.random() * 10)) : 0;
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

    // Ischemic Damage Accumulation
    const hypoxiaSeverity = Math.max(0, 90 - newSpo2);
    const hypoPerfusionSeverity = Math.max(0, 55 - newCmap);

    let newDamage = typeof patient.ischemicDamage === 'number' && Number.isFinite(patient.ischemicDamage) ? patient.ischemicDamage : 0;
    if (patient.cprActive) {
      const recoveryRate = newSpo2 >= 80 ? 4.5 : 1.0;
      newDamage = Math.max(0, newDamage - recoveryRate);
    } else {
      newDamage += (hypoxiaSeverity * 0.4) + (hypoPerfusionSeverity * 0.7);
    }
    // Clamping to prevent infinite mathematical overflow/divergence
    newDamage = Math.max(0, Math.min(10000, newDamage));

    if (!isArrestState && !patient.biologicalDeath && newDamage > (patient.arrestThreshold || 1200)) {
      isArrestState = true;
      if (newSpo2 < 60) currentRhythm = 'asystole';
      else if (safeBloodLossRatio > 0.35) currentRhythm = 'pea';
      else currentRhythm = Math.random() > 0.5 ? 'vfib' : 'asystole';
      events.push(`🚨 CARDIAC ARREST! Rhythm: ${currentRhythm.toUpperCase()}`);
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
    let spontaneousRosc = false;
    if (isArrestState && (currentRhythm === 'pea' || currentRhythm === 'asystole') && patient.cprActive) {
      const hasEpi = activeMeds.some(m => m.name === 'Epinephrine' && m.A1 > 0.1);
      if (safeBuffer > (safeFRC_L * 0.50) && safeBloodLossRatio < 0.2 && hasEpi && Math.random() < 0.04) {
        spontaneousRosc = true;
      }
    }

    if (spontaneousRosc) {
      isArrestState = false;
      currentRhythm = 'normal';
      events.push(`✅ SPONTANEOUS ROSC ACHIEVED from PEA/Asystole! Underlying causes treated.`);
    }

    // Vitals overrides under arrest
    if (isArrestState) {
      roundedSys = patient.cprActive ? 80 + Math.round(Math.random() * 15) : 0;
      roundedDia = patient.cprActive ? 25 + Math.round(Math.random() * 10) : 0;
      newMap = Math.max(0, Math.round(roundedDia + (roundedSys - roundedDia) / 3));
      if (!patient.cprActive || currentRhythm === 'vfib' || currentRhythm === 'asystole') newHr = 0;
    }

    // Update vital signs target values
    vitals.co = newCO;
    vitals.svr = newSVR;
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
    patient.myocardialStunning = Math.max(0, newStunning - 0.2);

    if (isArrestState && !st.patient.isArrest) {
      patient.codeStartTime = safeTime;
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
    }
  ): { patient: PatientState; events: string[] } {
    const { patient, activeMeds, currentBuffer, currentFRC_L, bloodLossRatio, joules, isSync, simulationTime } = inputs;
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

      const successChance = Math.max(0.01, 0.7 + totalBonus - ischemicPenalty - hypoxiaPenalty - hypovolemiaPenalty);

      if (Math.random() < successChance) {
        if (ischemicDamage > 4000) {
          events.push("⚠️ Shock converted rhythm to PEA. Myocardium too ischemic for ROSC.");
          updated.cardiacRhythm = 'pea';
        } else {
          events.push("✅ ROSC ACHIEVED! Organized rhythm restored.");
          updated.isArrest = false;
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
