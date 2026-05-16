import { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, FLUIDS, INHALATIONAL_AGENTS, calculateIBW, calculateLBW, calculateAgeAdjustedMAC } from './Pharmacology.js';
import { PKPDModel } from './PKPDEngine.js';
import { GasKineticsModel } from './GasKineticsEngine.js';

export function usePhysiology({ activeCase, isRunning, isPaused, ventSettings, gasSettings, logEvent }) {
  const [time, setTime] = useState(0);
  const [vitals, setVitals] = useState({});
  const [targetVitals, setTargetVitals] = useState({});
  const [patient, setPatient] = useState({});
  const [activeMeds, setActiveMeds] = useState([]);
  const [gasModels, setGasModels] = useState({});
  
  const [intravascularVolume, setIntravascularVolume] = useState(0); 
  const [totalBodyWaterLiters, setTotalBodyWaterLiters] = useState(42);
  const [electrolytes, setElectrolytes] = useState({ na: 140, k: 4.0, cl: 100, ca: 9.0, ph: 7.4 });
  const [coags, setCoags] = useState({ r_offset: 0, ma_offset: 0, angle_offset: 0 });
  const [surgicalPhase, setSurgicalPhase] = useState('Pre-Op');
  const [prevCaseId, setPrevCaseId] = useState(null);

  // CRITICAL FIX: The Physics Engine State Bridge. 
  // Prevents stale closures without forcing the interval to reset.
  const stateRef = useRef({ time, vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, ventSettings, gasSettings, surgicalPhase });

  useEffect(() => {
    stateRef.current = { time, vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, ventSettings, gasSettings, surgicalPhase };
  });

  if (activeCase && activeCase.id !== prevCaseId) {
    setPrevCaseId(activeCase.id);
      const initialMap = (activeCase.baseVitals.dia) + (((activeCase.baseVitals.sys) - (activeCase.baseVitals.dia)) / 3);
      const assumedBaseSV = activeCase.patient.isObese ? 85 : 70; 
      const initialCO = (activeCase.baseVitals.hr * assumedBaseSV) / 1000;
      const calculatedBaseSVR = (initialMap * 80) / initialCO;

      setVitals({ 
        ...activeCase.baseVitals, pip: 0, pplat: 0, vte: 0, bis: 98, temp: 37.0, 
        tofCount: 4, tofRatio: 1.0, mac: 0, etAgent: 0, etN2O: 0, 
        pao2: activeCase.patient.isObese ? 75 : 100, 
        paco2: activeCase.patient.isObese ? 52 : 40, 
        ph: activeCase.patient.isSeptic ? 7.22 : (activeCase.patient.isObese ? 7.36 : 7.4), 
        co: initialCO, svr: calculatedBaseSVR 
      });
      setTargetVitals({ ...activeCase.baseVitals });
      
      const heightCm = activeCase.patient.height || 170;
      const weightKg = activeCase.patient.weight || 70;
      const sex = activeCase.patient.sex || 'male';
      const ebv = weightKg * (sex.toLowerCase() === 'male' ? 75 : 65);
      const baseBleedRate = activeCase.id === 'trauma' ? 1.5 : 0.05; 

      setPatient({
        ...activeCase.patient, height: heightCm, weight: weightKg, sex, ebv, ebl: 0, bleedRate: baseBleedRate,
        ibw: calculateIBW(heightCm, sex), lbw: calculateLBW(heightCm, weightKg, sex),
        isApneic: false, isParalyzed: false, isTopicalized: false,
        airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
        hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21, oxygenBuffer: 21,
        hasBisMonitor: false, hasTofMonitor: false,
        isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0,
        arrestThreshold: 1200, codeStartTime: null,
        shuntFraction: activeCase.id === 'trauma' ? 0.20 : (activeCase.patient.isObese ? 0.12 : 0.05),
        patientBaseSVR: calculatedBaseSVR,
        patientBaseSV: assumedBaseSV
      });
      
     setTime(0); setActiveMeds([]); setIntravascularVolume(0); setSurgicalPhase('Pre-Op');
      
      // Dynamically map ALL inhalational agents from Pharmacology to prevent Missing Object crashes
      const safeGasModels = {};
      Object.keys(INHALATIONAL_AGENTS).forEach(key => {
          if (INHALATIONAL_AGENTS[key]) {
              safeGasModels[key] = new GasKineticsModel(INHALATIONAL_AGENTS[key]);
          }
      });
      setGasModels(safeGasModels);
      
      setTotalBodyWaterLiters(weightKg * 0.6); 
      setElectrolytes({ na: 140, k: activeCase.patient.trauma ? 5.2 : 4.0, cl: 100, ca: 9.0, ph: activeCase.patient.isSeptic ? 7.2 : 7.4 });
      setCoags({ r_offset: activeCase.patient.trauma ? 6 : 0, ma_offset: activeCase.patient.trauma ? -15 : 0, angle_offset: activeCase.patient.trauma ? -15 : 0 });
  }

  const pushFluid = (fluidName, volumeStr) => {
    const volume = parseFloat(volumeStr);
    const hasCVC = patient.accessLines?.some(l => l.includes('CVC') || l.includes('Cordis') || l.includes('Introducer'));
    const hasPIV = patient.accessLines?.some(l => l.includes('PIV'));
    const hasIO = patient.accessLines?.some(l => l.includes('IO'));
    const hasArt = patient.accessLines?.some(l => l.includes('Arterial'));
    
    if (!hasCVC && !hasPIV && !hasIO) {
        if (hasArt) {
            logEvent(`🚨 CRITICAL ERROR: Attempted fluid resuscitation via Arterial Line! Arteries cannot accommodate high volume infusion. Retrograde flow risks cerebral embolization and severe limb ischemia!`);
        } else {
            logEvent(`❌ FAILED: Cannot administer ${fluidName}. No venous access!`);
        }
        return false;
    }

    const fluidData = FLUIDS[fluidName]; if (!fluidData) return false;
    const isUnit = fluidData.type === 'Blood Product' || fluidData.type === 'Colloid';
    const effectiveVolumeML = isUnit && !fluidName.includes('Fibrinogen') ? volume * (fluidData.defaultVol || 300) : volume;
    const volumeLiters = effectiveVolumeML / 1000;
    
    logEvent(`💧 Administered ${volume} ${isUnit ? 'Units' : (fluidName.includes('Fibrinogen') ? 'g' : 'mL')} of ${fluidName}.`);
    
    // Glycocalyx Integrity Check: Sepsis/Trauma sheds the EGL, dropping retention drastically
    const retentionFactor = (patient.isSeptic || patient.trauma) ? fluidData.retentionInflamed : fluidData.retentionIntact;
    
    setIntravascularVolume(prev => prev + (effectiveVolumeML * retentionFactor));
    if (fluidName.includes('PRBC')) setPatient(prev => ({ ...prev, ebl: Math.max(0, prev.ebl - effectiveVolumeML) }));

    setTotalBodyWaterLiters(prevTBW => {
      const newTBW = prevTBW + volumeLiters;
      setElectrolytes(prev => ({
        na: ((prev.na * prevTBW) + (fluidData.na * volumeLiters)) / newTBW,
        k: ((prev.k * prevTBW) + (fluidData.k * volumeLiters)) / newTBW,
        cl: ((prev.cl * prevTBW) + (fluidData.cl * volumeLiters)) / newTBW,
        // Citrate toxicity mathematically drops ionized calcium
        ca: prev.ca + (fluidData.ca * (isUnit ? volume : volumeLiters)) - (fluidData.citrateLoad * volume * 0.02),
        ph: prev.ph - (fluidData.cl > 110 ? 0.05 * volumeLiters : 0)
      }));
      return newTBW;
    });
    setCoags(prev => ({ r_offset: prev.r_offset + (fluidData.coag.r * volume), ma_offset: prev.ma_offset + (fluidData.coag.ma * volume), angle_offset: prev.angle_offset + (fluidData.coag.angle * volume) }));
    return true;
  };

  const processMed = (medId, doseInput, route, type, unit) => {
    const hasCVC = patient.accessLines?.some(l => l.includes('CVC') || l.includes('Cordis') || l.includes('Introducer'));
    const hasPIV = patient.accessLines?.some(l => l.includes('PIV'));
    const hasIO = patient.accessLines?.some(l => l.includes('IO'));
    const hasArt = patient.accessLines?.some(l => l.includes('Arterial'));

    if (route === 'IV' && !hasCVC && !hasPIV && !hasIO) {
        if (hasArt) {
            logEvent(`🚨 CRITICAL ERROR: Injected ${medId} into Arterial Line! This causes immediate profound arterial vasospasm, endothelial destruction, and severe distal limb necrosis!`);
        } else {
            logEvent(`❌ FAILED: No venous access available for ${medId}!`);
        }
        return false; 
    }

    const medData = MEDICATIONS[medId]; if (!medData) return false;

    // Route specific physiological warnings for venous access
    if (route === 'IV' && !hasCVC && (hasPIV || hasIO)) {
        if (type === 'Infusion' && medData.classes.some(c => c.includes('Vasopressor')) && medId !== 'phenylephrine') {
            logEvent(`⚠️ WARNING: Infusing ${medData.name} via Peripheral IV. High risk of extravasation and severe tissue necrosis. Central line strongly recommended.`);
        }
        if (medId === 'calcium') {
            logEvent(`⚠️ WARNING: Administering Calcium Chloride via PIV. High risk of severe phlebitis and tissue necrosis. Calcium Gluconate or CVC preferred.`);
        }
        if (medId === 'amiodarone' && type === 'Infusion') {
            logEvent(`⚠️ WARNING: Continuous Amiodarone infusion via PIV risks severe chemical phlebitis.`);
        }
    }

    let doseInMg = parseFloat(doseInput);
    const dosingWeight = medData.dosingWeight === 'IBW' ? patient.ibw : (medData.dosingWeight === 'LBW' ? patient.lbw : patient.weight);
    if (unit.includes('mcg/kg/min')) doseInMg = (doseInMg * dosingWeight) / 1000;
    else if (unit.includes('mcg')) doseInMg = doseInMg / 1000;
    else if (unit.includes('mg/kg')) doseInMg = doseInMg * dosingWeight;

    let existingModel = activeMeds.find(m => m.name === medData.name);
    if (!existingModel) { existingModel = new PKPDModel(medData, patient.weight); setActiveMeds(prev => [...prev, existingModel]); }

    if (type === 'Bolus') {
      const bio = route === 'IV' ? 1.0 : (route === 'IM' ? 0.8 : 0.5);
      existingModel.giveBolus(doseInMg * bio);
      logEvent(`💉 Pushed ${doseInput} ${unit} of ${medData.name} via ${route}.`);
      
      if (medId === 'sugammadex') {
        const roc = activeMeds.find(m => m.name === 'Rocuronium');
        if (roc) { roc.chelate(Math.min(1.0, (doseInMg / (patient.weight * 16)))); logEvent("⚡ Sugammadex encapsulated Rocuronium."); }
      }

      // === SURGICAL TIMELINE AUTO-PROGRESSION (PRE-OP -> INDUCTION) ===
      if (stateRef.current.surgicalPhase === 'Pre-Op' && (medData.classes.includes('Sedative') || medData.classes.includes('Hypnotic') || medData.classes.includes('Dissociative'))) {
        setSurgicalPhase('Induction');
        logEvent(`➡️ Surgical Timeline Auto-Advanced: INDUCTION phase initiated.`);
      }

    } else if (type === 'Infusion') {
      existingModel.setInfusion(doseInMg / 60);
      existingModel.displayDose = doseInput;
      existingModel.displayUnit = unit;
      existingModel.medId = medId; 
      logEvent(`🔁 Started/Updated ${medData.name} infusion at ${doseInput} ${unit}.`);
    } else if (type === 'Stop Infusion') {
      existingModel.setInfusion(0);
      existingModel.displayDose = 0;
      logEvent(`⏹ Stopped ${medData.name} infusion.`);
    }
  };

  const pushMed = (medName) => { if (medName.includes('Topical')) { logEvent(`Administered Topical Lidocaine.`); setPatient(prev => ({...prev, isTopicalized: true})); } };

  const toggleCPR = () => {
    setPatient(p => {
      const newState = !p.cprActive;
      logEvent(newState ? "🩺 Initiated Chest Compressions." : "⏹ Stopped Chest Compressions.");
      return { ...p, cprActive: newState, cprStartTime: newState ? (stateRef.current.time ?? 0) : null };
    });
  };

  const deliverShock = (joules, isSync) => {
    logEvent(`⚡ ${isSync ? 'Synchronized Cardioversion' : 'Defibrillation'} delivered at ${joules}J.`);
    setPatient(p => {
        let updated = { ...p };
        if (!p.isArrest) {
            if (!isSync) {
                logEvent(`❌ WARNING: Unsynchronized shock induced R-on-T VFib!`);
                updated.isArrest = true; updated.cardiacRhythm = 'vfib';
                updated.codeStartTime = updated.codeStartTime || stateRef.current.time;
            } else { updated.myocardialStunning = (p.myocardialStunning || 0) + 15; }
            return updated;
        }
        if (p.cardiacRhythm === 'vfib' || p.cardiacRhythm === 'vtach') {
            const amioBonus = activeMeds.find(m => m.name === 'Amiodarone') ? 0.25 : 0;
            const lidoBonus = activeMeds.find(m => m.name === 'Lidocaine') ? 0.20 : 0;
            const epiBonus = activeMeds.find(m => m.name === 'Epinephrine') ? 0.10 : 0;
            
            const bloodLossRatio = (p.ebl || 0) / (p.ebv || 5000);
            const hypoxiaPenalty = p.oxygenBuffer < 40 ? 0.6 : 0; 
            const hypovolemiaPenalty = bloodLossRatio > 0.3 ? 0.6 : 0;
            
            const totalBonus = Math.min(0.4, amioBonus + lidoBonus + epiBonus);
            const ischemicPenalty = ((p.ischemicDamage || 0) / 5000);
            
            const successChance = Math.max(0.01, 0.7 + totalBonus - ischemicPenalty - hypoxiaPenalty - hypovolemiaPenalty);
            
            if (Math.random() < successChance) {
                if (p.ischemicDamage > 4000) {
                    logEvent("⚠️ Shock converted rhythm to PEA. Myocardium too ischemic for ROSC.");
                    updated.cardiacRhythm = 'pea';
                } else {
                    logEvent("✅ ROSC ACHIEVED! Organized rhythm restored.");
                    updated.isArrest = false; 
                    updated.cardiacRhythm = 'normal'; 
                    updated.myocardialStunning = 60;
                    updated.arrestThreshold = (p.ischemicDamage || 0) + 1500; 
                    updated.codeStartTime = null;
                }
            } else { 
                logEvent("⚡ Shock delivered. Rhythm remains VFib/VTach. Fix H's and T's if refractory."); 
            }
        } else {
            logEvent(`❌ WARNING: Shock delivered to non-shockable rhythm (${p.cardiacRhythm.toUpperCase()}). No effect.`);
        }
        return updated;
    });
  };

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        try {
          setTime((t) => t + 1);
          
          const st = stateRef.current;
          if (!st || !st.vitals || Object.keys(st.vitals).length === 0) return;

          let totalHrDelta = 0; let totalRrDelta = 0; 
          let sedativeEff = 0; let opioidEff = 0; let maxNMJOccupancy = 0;
          let svrMod = 1.0; let drugSvrMod = 1.0; let drugInotropyMod = 1.0; 

          let compensatoryRR = 0;
          const safePaCO2 = st.vitals.paco2 || 40;
          const safePaO2 = st.vitals.pao2 || 100;
          const safeSys = st.vitals.sys || 120;
          const safeDia = st.vitals.dia || 80;
          
          if (safePaCO2 > 45) compensatoryRR += (safePaCO2 - 45) * 0.8; 
          if (safePaO2 < 70) compensatoryRR += (70 - safePaO2) * 0.4;   
          if (safeSys < 90) compensatoryRR += 6;                          

          const currentCOForPK = st.vitals.co || 5.0;
          const coRatio = currentCOForPK / 5.0;
          
          // Calculate dynamic V1 modifier based on active fluid/blood volume state
          const currentBloodVolume = (st.patient.ebv || 5000) - (st.patient.ebl || 0) + st.intravascularVolume;
          const v1VolumeRatio = Math.max(0.4, currentBloodVolume / (st.patient.ebv || 5000));

          if (st.activeMeds) {
            st.activeMeds.forEach(model => {
              const effects = model.tick(1, coRatio, v1VolumeRatio); 
              totalHrDelta += effects.hrDelta || 0; 
              totalRrDelta += effects.rrDelta || 0;
              
              if (effects.diaDelta) drugSvrMod += (effects.diaDelta / 80); 
              if (effects.sysDelta) {
                 const pulsePressureDelta = effects.sysDelta - (effects.diaDelta || 0);
                 drugInotropyMod += (pulsePressureDelta / 60); 
              }
              
              if (effects.group === 'Sedative') sedativeEff = 1 - (1 - sedativeEff) * (1 - effects.hypnoticEffect);
              if (effects.group === 'Opioid') opioidEff = 1 - (1 - opioidEff) * (1 - effects.hypnoticEffect);
              if (effects.receptorOccupancy > maxNMJOccupancy) maxNMJOccupancy = effects.receptorOccupancy;
            });
          }

          let currentMac = 0; let currentEtAgent = 0; let currentEtN2O = 0; 
          let deliveredFiO2 = 21; let n2oPercent = 0;

          if (st.gasSettings && st.patient.airwaySecured) {
            const o2F = st.gasSettings.o2Flow || 0; 
            const airF = st.gasSettings.airFlow || 0; 
            const n2oF = st.gasSettings.n2oFlow || 0;
            const totalFGF = o2F + airF + n2oF;
            if (totalFGF > 0) {
              deliveredFiO2 = ((o2F * 100) + (airF * 21)) / totalFGF;
              n2oPercent = (n2oF / totalFGF) * 100;
            }
          }
          
          if (st.gasModels && Object.keys(st.gasModels).length > 0) {
            const effectiveMv = st.patient.airwaySecured ? (st.vitals.mv || 0) : (st.patient.isApneic ? 0 : 6.0);
            const currentFRC = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0);

            Object.keys(st.gasModels).forEach(key => {
              const model = st.gasModels[key];
              const agentData = INHALATIONAL_AGENTS[key];
              
              if (key !== 'n2o' && agentData) {
                if (st.gasSettings && st.gasSettings.agent === key && st.patient.airwaySecured) model.setDial(st.gasSettings.dial || 0);
                else model.setDial(0);
                
                const gasState = model.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction);
                if (gasState.Fa > 0.01) {
                  currentEtAgent = gasState.Fa;
                  const adjMac = calculateAgeAdjustedMAC(agentData.mac40, st.patient.age || 40);
                  const macContribution = gasState.Fb / adjMac;
                  currentMac += macContribution;
                  sedativeEff = 1 - (1 - sedativeEff) * (1 - Math.min(1, macContribution));
                  svrMod *= (1 - (macContribution * 0.15)); 
                }
              }
            });

            if (st.gasModels.n2o && INHALATIONAL_AGENTS.n2o) {
              st.gasModels.n2o.setDial(st.patient.airwaySecured ? n2oPercent : 0);
              const n2oState = st.gasModels.n2o.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction);
              currentEtN2O = n2oState.Fa;
              const n2oAdjMac = calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.n2o.mac40, st.patient.age || 40);
              currentMac += (n2oState.Fb / n2oAdjMac);
            }
          }

          const aggregateHypnosis = sedativeEff + opioidEff - (sedativeEff * opioidEff); 
          const macBAR_Multiplier = Math.max(0.1, 1.5 - (opioidEff * 1.5)); 
          const autonomicBlunting = Math.min(1.0, currentMac / macBAR_Multiplier);
          const totalAnalgesia = Math.min(1.0, (opioidEff * 0.8) + (autonomicBlunting * 0.6)); 
          
          let stimulus = 0;
          if (st.surgicalPhase === 'Induction') stimulus = 30;
          if (st.surgicalPhase === 'Incision') stimulus = 120;
          if (st.surgicalPhase === 'Maintenance') stimulus = 40;
          if (st.surgicalPhase === 'Emergence') stimulus = 20;
          
          if (safePaCO2 > 55) stimulus += (safePaCO2 - 55) * 2;
          const unbluntedStimulus = Math.max(0, stimulus * (1 - totalAnalgesia));

          const VO2_sec = 0.250 / 60;

          // === POSITIONAL PHYSIOLOGY MODIFIERS ===
          let positionFRCMod = 0;
          let positionPreloadMod = 0;
          const pos = st.patient.position || 'Supine';

          if (pos === 'Ramped' || pos === 'Rev Trendelenburg') {
              positionFRCMod = 0.3;
              positionPreloadMod = -200; // Venous pooling
          } else if (pos === 'Sitting') {
              positionFRCMod = 0.5;
              positionPreloadMod = -400; // Severe venous pooling
          } else if (pos === 'Trendelenburg') {
              positionFRCMod = -0.5; // Visceral compression
              positionPreloadMod = 300; // Venous auto-transfusion
          } else if (pos === 'Lithotomy') {
              positionFRCMod = -0.4;
              positionPreloadMod = 400; // Leg auto-transfusion
          } else if (pos === 'Prone') {
              positionFRCMod = 0.2; // Posterior recruitment
              positionPreloadMod = -100; // IVC compression risk
          } else if (pos === 'Lateral') {
              positionFRCMod = -0.1;
          }

          const FRC_Liters = Math.max(0.5, (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0) + ((st.ventSettings?.peep || 0) * 0.05) + positionFRCMod);
          let buffer = st.patient.oxygenBuffer || 21;

          if ((st.patient.isApneic || st.patient.isParalyzed) && !st.patient.airwaySecured) {
            buffer -= (VO2_sec / FRC_Liters) * 100; 
          } else {
            const replenishmentFiO2 = st.patient.airwaySecured ? deliveredFiO2 : (st.patient.currentFiO2 || 21);
            let flowLitersPerSec = st.patient.currentO2Flow !== undefined ? (st.patient.currentO2Flow / 60) : 0.25;
            if (!st.patient.airwaySecured && flowLitersPerSec < 0.1) flowLitersPerSec = ((st.targetVitals.rr || 12) * 0.5) / 60;
            
            buffer += (flowLitersPerSec / FRC_Liters) * (replenishmentFiO2 - buffer); 
          }
          const currentBuffer = Math.min(100, Math.max(0, buffer));

          let newPip = 0; let newVte = 0; let newPplat = 0; let newPmean = 0; let newMv = 0; let newPeep = 0;
          const opioidRRDrop = opioidEff * 10;
          let patientDriveRR = (st.patient.isApneic || st.patient.isParalyzed) ? 0 : Math.max(0, (st.targetVitals.rr || 12) + compensatoryRR + totalRrDelta - opioidRRDrop);
          let targetRR = patientDriveRR;

          // === DYNAMIC PULMONARY MECHANICS ===
          let currentCompliance = 65; 
          if (st.patient.isObese) currentCompliance -= 25; 
          if (st.patient.isSeptic) currentCompliance -= 20; 
          if (st.patient.trauma) currentCompliance -= 15; 
          if (st.patient.chf) currentCompliance -= 20; // Pulmonary Edema
          if (st.patient.copd) currentCompliance += 15; // Emphysema hyper-compliance
          if (positionFRCMod < 0) currentCompliance -= 10; // Positional restriction
          
          let currentResistance = 5; 
          if (st.patient.isObese) currentResistance += 3;
          if (st.patient.copd) currentResistance += 18; // Massive bronchospasm/airway resistance

          if (st.patient.airwaySecured && st.ventSettings) {
              newPeep = st.ventSettings.peep || 0;
              
              if (st.ventSettings.mode === 'PSV') {
                  targetRR = patientDriveRR; 
                  if (targetRR === 0) { 
                      newPip = newPeep; newVte = 0; 
                  } else { 
                      newPip = newPeep + (st.ventSettings.ps || 10); 
                      newPplat = newPip - 2; 
                      newVte = (newPplat - newPeep) * currentCompliance; 
                  }
              } else {
                  targetRR = Math.max(patientDriveRR, (st.ventSettings.rr || 12));
                  if (st.ventSettings.mode === 'VCV') {
                      newVte = st.ventSettings.vt || 500; 
                      newPplat = newPeep + (newVte / currentCompliance); 
                      
                      // True Resistive Drop (P = F * R)
                      const ieRatio = st.ventSettings.ieRatio || 2;
                      const inspTimeSec = (60 / targetRR) * (1 / (1 + ieRatio));
                      const flow_L_s = (newVte / 1000) / inspTimeSec;
                      newPip = newPplat + (flow_L_s * currentResistance * 5); 
                  } else if (st.ventSettings.mode === 'PCV') {
                      newPip = (st.ventSettings.pinsp || 20) + newPeep; 
                      newPplat = newPip - 2; 
                      newVte = (newPplat - newPeep) * currentCompliance;
                  } else if (st.ventSettings.mode === 'PCV-VG') {
                      newVte = st.ventSettings.vt || 500; 
                      newPplat = newPeep + (newVte / currentCompliance); 
                      newPip = newPplat + 2; 
                  }
              }
              if (st.ventSettings.pmax && newPip > st.ventSettings.pmax) { 
                  newPip = st.ventSettings.pmax; 
                  newPplat = newPip - 2; 
                  newVte = Math.max(0, (newPplat - newPeep) * currentCompliance); 
              }
              newPmean = newPeep + ((newPip - newPeep) / 3);
              newMv = (newVte * targetRR) / 1000;
          }

          const deadSpace = (st.patient.ibw * 2.2) / 1000; 
          const tidalVolLiters = st.patient.airwaySecured ? (newVte / 1000) : ((st.patient.ibw * 7) / 1000);
          const currentAlvVent_L_min = Math.max(0, (tidalVolLiters - deadSpace) * targetRR);
          const baseTidalVolLiters = (st.patient.ibw * 7) / 1000;
          const baseAlvVent_L_min = (baseTidalVolLiters - deadSpace) * (st.targetVitals.rr || 12);
          
          // COPD dictates a severely elevated baseline CO2
          const baselinePaCO2 = st.patient.copd ? 55 : (st.patient.isObese ? 48 : 40);

          let targetPaCO2;
          let targetEtco2 = 0;

          if (targetRR === 0 || currentAlvVent_L_min <= 0.1) {
              targetPaCO2 = safePaCO2 + 0.05; 
              targetEtco2 = 0;
          } else {
              targetPaCO2 = baselinePaCO2 * (baseAlvVent_L_min / currentAlvVent_L_min);
              targetPaCO2 = Math.max(15, Math.min(120, targetPaCO2)); 
              let co2Gradient = st.patient.isObese ? 7 : (st.patient.copd ? 10 : 4);
              if (safeSys < 80) co2Gradient += (80 - safeSys) * 0.5; 
              targetEtco2 = Math.max(0, targetPaCO2 - co2Gradient);
          }
          let newPaCO2 = safePaCO2 + (targetPaCO2 - safePaCO2) * 0.05;

          // === HEMODYNAMIC COUPLING ===
          let currentEbl = (st.patient.ebl || 0) + (st.patient.bleedRate || 0);
          const bloodLossRatio = currentEbl / (st.patient.ebv || 5000);

          let autonomicHrMod = 0;
          if (drugSvrMod > 1.5 && currentMac < 0.5) autonomicHrMod = -20; 

          // Gravitational shift mathematically modifies circulating volume equivalent
          const effectiveIntravascularVolume = st.intravascularVolume + positionPreloadMod;
          
          const inotropyFinal = 1.0 - ((st.patient.myocardialStunning || 0) / 100) + (unbluntedStimulus / 500) + (drugInotropyMod - 1.0);
          const preloadSV = Math.max(0.1, 1.0 - (bloodLossRatio * 1.2) + (effectiveIntravascularVolume / 2500));
          
          const targetHR = Math.max(0, (st.targetVitals.hr || 70) + totalHrDelta + autonomicHrMod + (bloodLossRatio * 150) + unbluntedStimulus);
          
          // CHF cripples max stroke volume capacity
          const chfInotropicPenalty = st.patient.chf ? 0.5 : 1.0;
          const maxSV = (st.patient.patientBaseSV || 70) * (st.patient.chf ? 1.0 : 1.6);
          let currentSV = Math.min(maxSV, (st.patient.patientBaseSV || 70) * preloadSV * Math.max(0.1, inotropyFinal) * chfInotropicPenalty);
          
          const baseSVR = st.patient.patientBaseSVR || 1200;
          let targetSVR = (baseSVR * svrMod * drugSvrMod * (st.patient.isSeptic ? 0.6 : 1.0)) + (unbluntedStimulus * 8);
          
          if (targetSVR > 1600) currentSV *= (1600 / targetSVR); 

          const targetCO = (targetHR * currentSV) / 1000; 
          let targetMAP = (targetCO * targetSVR) / 80;
          targetMAP = Math.min(220, Math.max(15, targetMAP));

          const sysPressorEffect = (effectiveIntravascularVolume / 250) * 12;
          const pulsePressureRatio = Math.max(0.2, Math.min(2.5, (currentSV / (st.patient.patientBaseSV || 70))));
          
          let targetSys = targetMAP + (targetMAP * 0.3 * pulsePressureRatio) + sysPressorEffect - (st.patient.isSeptic ? 20 : 0);
          let targetDia = targetMAP - (targetMAP * 0.2 * pulsePressureRatio) + (sysPressorEffect / 2) - (st.patient.isSeptic ? 40 : 0);

          const hrNoise = st.patient.isArrest ? 0 : (Math.random() * 2 - 1);
          const sysNoise = st.patient.isArrest ? 0 : (Math.random() * 4 - 2);
          const diaNoise = st.patient.isArrest ? 0 : (Math.random() * 2 - 1);

          let newHr = (st.vitals.hr || 70) + (targetHR - (st.vitals.hr || 70)) * 0.1 + hrNoise;
          let newSys = safeSys + (targetSys - safeSys) * 0.1 + sysNoise;
          let newDia = safeDia + (targetDia - safeDia) * 0.1 + diaNoise;
          // === ACID-BASE CALCULUS ===
          const baseDeficit = (st.patient.isSeptic ? 8 : 0) + (bloodLossRatio * 20);
          const hco3 = Math.max(8, 24 - baseDeficit);
          let newPh = 6.1 + Math.log10(hco3 / (0.03 * newPaCO2));

          // === ADVANCED OXYGENATION CALCULUS (FICK PRINCIPLE & RILEY SHUNT) ===
          const PAO2 = (713 * (currentBuffer / 100)) - (newPaCO2 / 0.8);
          const AaGradient = (st.patient.age * 0.3) + (st.patient.isObese ? 12 : 5);
          const capillaryPO2 = Math.max(10, PAO2 - AaGradient);

          const bohrShift = Math.pow(10, 0.48 * (newPh - 7.4) - 0.024 * ((st.vitals.temp || 37.0) - 37.0));
          const effectiveCapillaryPO2 = capillaryPO2 * bohrShift;

          const ScO2 = Math.min(100, ((Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2) / (Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2 + 23400)) * 100);

          const baseHb = st.patient.trauma ? 11.2 : 14.5;
          const currentHb = Math.max(3.0, (baseHb * (1 - bloodLossRatio)) - ((st.intravascularVolume / (st.patient.ebv || 5000)) * 3.0));
          
          const capillaryO2Content = (currentHb * 1.34 * (ScO2 / 100)) + (capillaryPO2 * 0.0031);
          const VO2 = st.patient.weight * 3.5; 
          
          const venousO2Content = Math.max(1.0, capillaryO2Content - (VO2 / (Math.max(0.5, targetCO) * 10)));
          
          const actualShunt = st.patient.shuntFraction || 0.05;
          const arterialO2Content = (capillaryO2Content * (1 - actualShunt)) + (venousO2Content * actualShunt);

          let targetSpo2 = Math.min(100, (arterialO2Content / (currentHb * 1.34)) * 100);
          let targetPaO2 = capillaryPO2 * (1 - (actualShunt * 1.5)); 
          
          let newSpo2 = (st.vitals.spo2 || 100) + (targetSpo2 - (st.vitals.spo2 || 100)) * 0.05;
          let newRr = (st.vitals.rr || 12) + (targetRR - (st.vitals.rr || 12)) * 0.2;
          let newEtco2 = targetRR === 0 ? 0 : (st.vitals.etco2 || 40) + (targetEtco2 - (st.vitals.etco2 || 40)) * 0.2;

          if (Math.abs(targetHR - (st.vitals.hr || 70)) < 1.5 && hrNoise === 0) newHr = targetHR;
          if (Math.abs(targetSys - safeSys) < 1.5 && sysNoise === 0) newSys = targetSys;
          if (Math.abs(targetDia - safeDia) < 1.5 && diaNoise === 0) newDia = targetDia;
          if (Math.abs(targetSpo2 - (st.vitals.spo2 || 100)) < 1.5) newSpo2 = targetSpo2;
          if (Math.abs(targetRR - (st.vitals.rr || 12)) < 1.5) newRr = targetRR;
          if (Math.abs(targetEtco2 - (st.vitals.etco2 || 40)) < 1.5) newEtco2 = targetEtco2;

          let hypoxiaSeverity = Math.max(0, 90 - newSpo2);
          let hypoPerfusionSeverity = Math.max(0, 55 - targetMAP);
          
          let newDamage = (st.patient.ischemicDamage || 0) + (hypoxiaSeverity * 0.4) + (hypoPerfusionSeverity * 0.7);
          if (st.patient.cprActive) newDamage = Math.max(0, newDamage - 1.5); 
          
          let currentIsArrest = st.patient.isArrest;
          let activeRhythm = st.patient.cardiacRhythm;
          const bloodLossRatioForArrest = currentEbl / (st.patient.ebv || 5000);
          
          if (!currentIsArrest && !st.patient.biologicalDeath && newDamage > (st.patient.arrestThreshold || 1200)) {
              currentIsArrest = true;
              if (newSpo2 < 60) activeRhythm = 'asystole';
              else if (bloodLossRatioForArrest > 0.35) activeRhythm = 'pea';
              else activeRhythm = Math.random() > 0.5 ? 'vfib' : 'asystole';
              logEvent(`🚨 CARDIAC ARREST! Rhythm: ${activeRhythm.toUpperCase()}`);
          }
          
          let bioDeath = st.patient.biologicalDeath;
          if (newDamage > 6000 && !bioDeath) {
              logEvent(`💀 BIOLOGICAL DEATH. No further resuscitation possible.`);
              bioDeath = true;
          }

          let spontaneousRosc = false;
          if (currentIsArrest && (activeRhythm === 'pea' || activeRhythm === 'asystole') && st.patient.cprActive) {
              const hasEpi = st.activeMeds.some(m => m.name === 'Epinephrine' && m.A1 > 0.1);
              if (currentBuffer > 50 && bloodLossRatioForArrest < 0.2 && hasEpi && Math.random() < 0.04) {
                  spontaneousRosc = true;
              }
          }

          if (spontaneousRosc) {
              currentIsArrest = false;
              activeRhythm = 'normal';
              logEvent(`✅ SPONTANEOUS ROSC ACHIEVED from ${activeRhythm.toUpperCase()}! Underlying causes treated.`);
          }

          if (currentIsArrest) {
              newSys = st.patient.cprActive ? 80 + (Math.random() * 15) : 0;
              newDia = st.patient.cprActive ? 25 + (Math.random() * 10) : 0;
              newSpo2 = st.patient.cprActive ? 85 : 0;
              newEtco2 = (st.patient.cprActive && st.patient.airwaySecured) ? 15 + (Math.random() * 5) : 0;
              if (!st.patient.cprActive || activeRhythm === 'vfib' || activeRhythm === 'asystole') newHr = 0;
          } else if (st.patient.myocardialStunning > 0) {
              newSys -= st.patient.myocardialStunning;
              newDia -= (st.patient.myocardialStunning * 0.6);
              if (targetMAP < 40) newSpo2 = 0; 
          }

          if (newDia >= newSys - 10) newDia = Math.max(0, newSys - 10);

          const corticalSuppression = aggregateHypnosis;
          const burstSuppression = Math.max(0, (currentMac - 1.5) * 40); 
          let targetBis = 98 - (corticalSuppression * 55) - burstSuppression;
          if (targetMAP < 50) {
              const ischemicSlowing = (50 - targetMAP) * 1.5;
              targetBis -= ischemicSlowing;
          }
          let finalBis = Math.max(0, Math.min(98, targetBis + (unbluntedStimulus * 0.2)));
          if (currentIsArrest) finalBis = bioDeath ? 0 : Math.max(0, (st.vitals.bis || 98) - 5);

          let t1 = 1.0; let t4 = 1.0;
          if (maxNMJOccupancy > 0.70) {
              t1 = Math.max(0, 1 - Math.pow((maxNMJOccupancy - 0.70) / 0.30, 2));
              t4 = Math.max(0, 1 - Math.pow((maxNMJOccupancy - 0.60) / 0.35, 2.5));
          }
          let targetTofCount = 0;
          if (t1 > 0.05) targetTofCount = 1;
          if (maxNMJOccupancy < 0.90) targetTofCount = 2;
          if (maxNMJOccupancy < 0.80) targetTofCount = 3;
          if (t4 > 0.05) targetTofCount = 4;
          
          let targetTofRatio = (targetTofCount === 4) ? (t4 / t1) : 0.0;
          if (isNaN(targetTofRatio) || targetTofRatio < 0) targetTofRatio = 0;
          targetTofRatio = Math.min(1.0, targetTofRatio);

          if (st.patient.airwaySecured && st.surgicalPhase === 'Induction') {
              setSurgicalPhase('Maintenance');
              logEvent(`➡️ Airway Secured. Surgical Timeline Auto-Advanced: MAINTENANCE phase initiated.`);
          }

          setPatient(prev => {
              let codeTime = prev.codeStartTime;
              if (currentIsArrest && !prev.isArrest) codeTime = time; 
              if (!currentIsArrest) codeTime = null;
              
              let newThreshold = prev.arrestThreshold || 1200;
              if (spontaneousRosc) newThreshold = newDamage + 1500;

              return { 
                  ...prev, ebl: currentEbl, oxygenBuffer: currentBuffer, 
                  ischemicDamage: newDamage, isArrest: currentIsArrest, biologicalDeath: bioDeath,
                  cardiacRhythm: activeRhythm, myocardialStunning: Math.max(0, (prev.myocardialStunning || 0) - 0.2),
                  codeStartTime: codeTime, arrestThreshold: newThreshold
              };
          });

          setVitals(prev => ({
              ...prev, hr: Math.round(newHr), sys: Math.max(0, Math.round(newSys)), dia: Math.max(0, Math.round(newDia)),
              co: targetCO, svr: targetSVR, map: Math.round((newSys + 2*newDia)/3),
              spo2: Math.round(newSpo2), etco2: Math.max(0, Math.round(newEtco2)), rr: Math.round(newRr),
              temp: (prev.temp || 37.0) - 0.0001, bis: Math.round(finalBis), 
              tofCount: targetTofCount, tofRatio: targetTofRatio,
              vte: Math.round(newVte), pip: Math.round(newPip), pplat: Math.round(newPplat), 
              peep: newPeep, pmean: Math.round(newPmean), mv: newMv,
              mac: currentMac, etAgent: currentEtAgent, etN2O: currentEtN2O, pao2: targetPaO2, paco2: newPaCO2, ph: newPh,
              compl: Math.round(currentCompliance), res: Math.round(currentResistance)
          }));
        } catch (error) {
          console.error("Physics Engine Tick Failed: ", error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]); 

  const createSnapshot = () => {
    const clonedMeds = activeMeds.map(m => {
        const proto = Object.getPrototypeOf(m);
        const clone = Object.create(proto);
        return Object.assign(clone, JSON.parse(JSON.stringify(m)));
    });

    const clonedGas = {};
    Object.keys(gasModels).forEach(k => {
        const proto = Object.getPrototypeOf(gasModels[k]);
        const clone = Object.create(proto);
        clonedGas[k] = Object.assign(clone, JSON.parse(JSON.stringify(gasModels[k])));
    });

    return {
        time,
        vitals: JSON.parse(JSON.stringify(vitals)),
        targetVitals: JSON.parse(JSON.stringify(targetVitals)),
        patient: JSON.parse(JSON.stringify(patient)),
        intravascularVolume,
        totalBodyWaterLiters,
        electrolytes: JSON.parse(JSON.stringify(electrolytes)),
        coags: JSON.parse(JSON.stringify(coags)),
        surgicalPhase,
        activeMeds: clonedMeds,
        gasModels: clonedGas
    };
  };

  const restoreSnapshot = (snap) => {
    if (!snap) return;
    setTime(snap.time);
    setVitals(snap.vitals);
    setTargetVitals(snap.targetVitals);
    setPatient(snap.patient);
    setIntravascularVolume(snap.intravascularVolume);
    setTotalBodyWaterLiters(snap.totalBodyWaterLiters);
    setElectrolytes(snap.electrolytes);
    setCoags(snap.coags);
    setSurgicalPhase(snap.surgicalPhase);
    setActiveMeds(snap.activeMeds);
    setGasModels(snap.gasModels);

    stateRef.current = {
        vitals: snap.vitals, targetVitals: snap.targetVitals, patient: snap.patient,
        activeMeds: snap.activeMeds, gasModels: snap.gasModels,
        intravascularVolume: snap.intravascularVolume, ventSettings, gasSettings,
        surgicalPhase: snap.surgicalPhase
    };
  };

  return { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid, activeMeds, intravascularVolume, electrolytes, coags, deliverShock, toggleCPR, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot };
}