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

  // CRITICAL FIX: The Physics Engine State Bridge. 
  // Prevents stale closures without forcing the interval to reset.
  const stateRef = useRef({ vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, ventSettings, gasSettings, surgicalPhase });

  useEffect(() => {
    stateRef.current = { vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, ventSettings, gasSettings, surgicalPhase };
  });

  useEffect(() => {
    if (activeCase) {
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
        shuntFraction: activeCase.id === 'trauma' ? 0.20 : (activeCase.patient.isObese ? 0.12 : 0.05),
        patientBaseSVR: calculatedBaseSVR,
        patientBaseSV: assumedBaseSV
      });
      
      setTime(0); setActiveMeds([]); setIntravascularVolume(0); setSurgicalPhase('Pre-Op');
      
      const safeGasModels = {};
      if (INHALATIONAL_AGENTS.sevoflurane) safeGasModels.sevoflurane = new GasKineticsModel(INHALATIONAL_AGENTS.sevoflurane);
      if (INHALATIONAL_AGENTS.desflurane) safeGasModels.desflurane = new GasKineticsModel(INHALATIONAL_AGENTS.desflurane);
      if (INHALATIONAL_AGENTS.isoflurane) safeGasModels.isoflurane = new GasKineticsModel(INHALATIONAL_AGENTS.isoflurane);
      if (INHALATIONAL_AGENTS.n2o) safeGasModels.n2o = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);
      setGasModels(safeGasModels);
      
      setTotalBodyWaterLiters(weightKg * 0.6); 
      setElectrolytes({ na: 140, k: activeCase.patient.trauma ? 5.2 : 4.0, cl: 100, ca: 9.0, ph: activeCase.patient.isSeptic ? 7.2 : 7.4 });
      setCoags({ r_offset: activeCase.patient.trauma ? 6 : 0, ma_offset: activeCase.patient.trauma ? -15 : 0, angle_offset: activeCase.patient.trauma ? -15 : 0 });
    }
  }, [activeCase]);

  const pushFluid = (fluidName, volumeStr) => {
    const volume = parseFloat(volumeStr);
    if (!patient.hasIV && !patient.hasALine) { logEvent(`❌ Cannot administer ${fluidName}. No Access!`); return false; }
    const fluidData = FLUIDS[fluidName]; if (!fluidData) return false;
    const isUnit = fluidData.type === 'Blood Product' || fluidData.type === 'Colloid';
    const effectiveVolumeML = isUnit && !fluidName.includes('Fibrinogen') ? volume * (fluidData.defaultVol || 300) : volume;
    const volumeLiters = effectiveVolumeML / 1000;
    logEvent(`💧 Administered ${volume} ${isUnit ? 'Units' : (fluidName.includes('Fibrinogen') ? 'g' : 'mL')} of ${fluidName}.`);
    
    setIntravascularVolume(prev => prev + (effectiveVolumeML * fluidData.retention));
    if (fluidName.includes('PRBC')) setPatient(prev => ({ ...prev, ebl: Math.max(0, prev.ebl - effectiveVolumeML) }));

    setTotalBodyWaterLiters(prevTBW => {
      const newTBW = prevTBW + volumeLiters;
      setElectrolytes(prev => ({
        na: ((prev.na * prevTBW) + (fluidData.na * volumeLiters)) / newTBW,
        k: ((prev.k * prevTBW) + (fluidData.k * volumeLiters)) / newTBW,
        cl: ((prev.cl * prevTBW) + (fluidData.cl * volumeLiters)) / newTBW,
        ca: prev.ca + (fluidData.ca * (isUnit ? volume : volumeLiters)),
        ph: prev.ph - (fluidData.cl > 110 ? 0.05 * volumeLiters : 0)
      }));
      return newTBW;
    });
    setCoags(prev => ({ r_offset: prev.r_offset + (fluidData.coag.r * volume), ma_offset: prev.ma_offset + (fluidData.coag.ma * volume), angle_offset: prev.angle_offset + (fluidData.coag.angle * volume) }));
    return true;
  };

  const processMed = (medId, doseInput, route, type, unit) => {
    if (!patient.hasIV && route === 'IV') { logEvent(`❌ FAILED: No IV access for ${medId}!`); return false; }
    const medData = MEDICATIONS[medId]; if (!medData) return false;
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
    } else if (type === 'Infusion') {
      existingModel.setInfusion(doseInMg / 60); logEvent(`🔁 Started ${medData.name} infusion at ${doseInput} ${unit}.`);
    } else if (type === 'Stop Infusion') {
      existingModel.setInfusion(0); logEvent(`⏹ Stopped ${medData.name} infusion.`);
    }
  };

  const pushMed = (medName, dose) => { if (medName.includes('Topical')) { logEvent(`Administered Topical Lidocaine.`); setPatient(prev => ({...prev, isTopicalized: true})); } };

  const toggleCPR = () => {
    setPatient(p => {
      const newState = !p.cprActive;
      logEvent(newState ? "🩺 Initiated Chest Compressions." : "⏹ Stopped Chest Compressions.");
      return { ...p, cprActive: newState };
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
            } else { updated.myocardialStunning = (p.myocardialStunning || 0) + 15; }
            return updated;
        }
        if (p.cardiacRhythm === 'vfib' || p.cardiacRhythm === 'vtach') {
            const successChance = Math.max(0.05, 0.7 - ((p.ischemicDamage || 0) / 4000));
            if (Math.random() < successChance) {
                logEvent("✅ ROSC ACHIEVED!");
                updated.isArrest = false; updated.cardiacRhythm = 'normal'; updated.myocardialStunning = 60;
            } else { logEvent("⚡ Shock delivered. Rhythm remains VFib."); }
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

          let totalSysDelta = 0; let totalHrDelta = 0; let totalRrDelta = 0; 
          let sedativeEff = 0; let opioidEff = 0; let maxNMJOccupancy = 0;
          let svrMod = 1.0; let drugSvrMod = 1.0; let drugInotropyMod = 1.0; 

          // 1. DYNAMIC RESPIRATORY DRIVE
          let compensatoryRR = 0;
          const safePaCO2 = st.vitals.paco2 || 40;
          const safePaO2 = st.vitals.pao2 || 100;
          const safeSys = st.vitals.sys || 120;
          
          if (safePaCO2 > 45) compensatoryRR += (safePaCO2 - 45) * 0.8; 
          if (safePaO2 < 70) compensatoryRR += (70 - safePaO2) * 0.4;   
          if (safeSys < 90) compensatoryRR += 6;                          

          const currentCOForPK = st.vitals.co || 5.0;
          const coRatio = currentCOForPK / 5.0;

          // 2. IV PK/PD CALCULUS & TRANSLATIONAL BRIDGE
          if (st.activeMeds) {
            st.activeMeds.forEach(model => {
              const effects = model.tick(1, coRatio); 
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

          // 3. GAS KINETICS (MAC Calculation)
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

          // 4. AUTONOMIC NERVOUS SYSTEM (MAC-BAR & Neuro-State)
          // CRITICAL FIX: The ReferenceError for aggregateHypnosis is resolved here
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

          // 5. OXYGEN BUFFER (FRC) MATH & WASH-IN
          const VO2_sec = 0.250 / 60;
          const FRC_Liters = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0) + ((st.ventSettings?.peep || 0) * 0.05);
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

          // 6. VENTILATOR MODE PHYSICS
          let newVte = 0; let newPip = 0; let newPplat = 0; let newPmean = 0; let newMv = 0; let newPeep = 0;
          
          const opioidRRDrop = opioidEff * 10;
          let patientDriveRR = (st.patient.isApneic || st.patient.isParalyzed) ? 0 : Math.max(0, (st.targetVitals.rr || 12) + compensatoryRR + totalRrDelta - opioidRRDrop);
          let targetRR = patientDriveRR;

          if (st.patient.airwaySecured && st.ventSettings) {
              newPeep = st.ventSettings.peep || 0;
              targetRR = (st.patient.isApneic || st.patient.isParalyzed) ? (st.ventSettings.rr || 12) : Math.max(patientDriveRR, (st.ventSettings.rr || 12));
              const comp = st.patient.isObese ? 35 : (st.patient.trauma ? 42 : 55);
              const res = 10;
              
              if (st.ventSettings.mode === 'VCV') {
                  newVte = st.ventSettings.vt || 500; newPplat = newPeep + (newVte / comp); newPip = newPplat + res;
              } else if (st.ventSettings.mode === 'PCV') {
                  newPip = (st.ventSettings.pinsp || 20) + newPeep; newPplat = newPip - 2; newVte = (newPplat - newPeep) * comp;
              } else if (st.ventSettings.mode === 'PCV-VG') {
                  newVte = st.ventSettings.vt || 500; newPplat = newPeep + (newVte / comp); newPip = newPplat + 2;
              } else if (st.ventSettings.mode === 'PSV') {
                  if (st.patient.isApneic || st.patient.isParalyzed) { newPip = newPeep; newVte = 0; }
                  else { newPip = newPeep + (st.ventSettings.ps || 10); newPplat = newPip - 2; newVte = (newPplat - newPeep) * comp; }
              }
              if (st.ventSettings.pmax && newPip > st.ventSettings.pmax) { newPip = st.ventSettings.pmax; newPplat = newPip - 2; newVte = (newPplat - newPeep) * comp; }
              newPmean = newPeep + ((newPip - newPeep) / 3);
              newMv = (newVte * targetRR) / 1000;
          }

          // 7. ALVEOLAR MASS BALANCE (True EtCO2 & PaCO2 Rigor)
          const deadSpace = (st.patient.ibw * 2.2) / 1000; 
          const tidalVolLiters = st.patient.airwaySecured ? (newVte / 1000) : ((st.patient.ibw * 7) / 1000);
          const currentAlvVent_L_min = Math.max(0, (tidalVolLiters - deadSpace) * targetRR);

          const baseTidalVolLiters = (st.patient.ibw * 7) / 1000;
          const baseAlvVent_L_min = (baseTidalVolLiters - deadSpace) * (st.targetVitals.rr || 12);
          const baselinePaCO2 = st.patient.isObese ? 52 : 40;

          let targetPaCO2;
          let targetEtco2 = 0;

          if (targetRR === 0 || currentAlvVent_L_min <= 0.1) {
              targetPaCO2 = safePaCO2 + 0.05; 
              targetEtco2 = 0;
          } else {
              targetPaCO2 = baselinePaCO2 * (baseAlvVent_L_min / currentAlvVent_L_min);
              targetPaCO2 = Math.max(15, Math.min(120, targetPaCO2)); 
              
              let co2Gradient = st.patient.isObese ? 7 : 4;
              if (safeSys < 80) co2Gradient += (80 - safeSys) * 0.5; 
              targetEtco2 = Math.max(0, targetPaCO2 - co2Gradient);
          }
          
          let newPaCO2 = safePaCO2 + (targetPaCO2 - safePaCO2) * 0.05;

          // 8. OXYGEN DISSOCIATION
          const PAO2 = (713 * (currentBuffer / 100)) - (newPaCO2 / 0.8);
          const AaGradient = (st.patient.age * 0.3) + (st.patient.isObese ? 12 : 5) + ((st.patient.shuntFraction || 0.05) * 100);
          let targetPaO2 = Math.max(5, (PAO2 - AaGradient) * (1 - (st.patient.shuntFraction || 0.05)));

          let targetSpo2 = Math.min(100, ((Math.pow(targetPaO2, 3) + 150 * targetPaO2) / (Math.pow(targetPaO2, 3) + 150 * targetPaO2 + 23400)) * 100);

          // 9. ISCHEMIC DAMAGE & ARREST TRIGGERS
          const safeDia = st.vitals.dia || 80;
          let currentMap = safeDia + ((safeSys - safeDia) / 3);
          let hypoxiaSeverity = Math.max(0, 90 - (st.vitals.spo2 || 100));
          let hypoPerfusionSeverity = Math.max(0, 55 - currentMap);
          
          let newDamage = (st.patient.ischemicDamage || 0) + (hypoxiaSeverity * 0.4) + (hypoPerfusionSeverity * 0.7);
          if (st.patient.cprActive) newDamage = Math.max(0, newDamage - 1.5); 
          
          let currentIsArrest = st.patient.isArrest;
          let activeRhythm = st.patient.cardiacRhythm;
          
          if (!st.patient.isArrest && !st.patient.biologicalDeath && newDamage > 1200) {
              currentIsArrest = true;
              activeRhythm = Math.random() > 0.5 ? 'vfib' : 'asystole';
              logEvent(`🚨 CARDIAC ARREST! Rhythm: ${activeRhythm.toUpperCase()}`);
          }
          
          let bioDeath = st.patient.biologicalDeath;
          if (newDamage > 6000 && !bioDeath) {
              logEvent(`💀 BIOLOGICAL DEATH. No further resuscitation possible.`);
              bioDeath = true;
          }

          // 10. HEMODYNAMIC COUPLING (CO x SVR) 
          let currentEbl = (st.patient.ebl || 0) + (st.patient.bleedRate || 0);
          const bloodLossRatio = currentEbl / (st.patient.ebv || 5000);

          const inotropyFinal = 1.0 - ((st.patient.myocardialStunning || 0) / 100) + (unbluntedStimulus / 500) + (drugInotropyMod - 1.0);
          const preloadSV = Math.max(0.1, 1.0 - (bloodLossRatio * 1.2) + (st.intravascularVolume / 2500));
          
          const targetHR = Math.max(0, (st.targetVitals.hr || 70) + totalHrDelta + (bloodLossRatio * 150) + unbluntedStimulus);
          const currentSV = (st.patient.patientBaseSV || 70) * preloadSV * Math.max(0.1, inotropyFinal);
          const targetCO = (targetHR * currentSV) / 1000; 
          
          const baseSVR = st.patient.patientBaseSVR || 1200;
          const targetSVR = (baseSVR * svrMod * drugSvrMod * (st.patient.isSeptic ? 0.6 : 1.0)) + (unbluntedStimulus * 8);
          const targetMAP = (targetCO * targetSVR) / 80;
          
          const sysPressorEffect = (st.intravascularVolume / 250) * 12;
          const pulsePressureRatio = Math.max(0.2, Math.min(2.5, (currentSV / (st.patient.patientBaseSV || 70))));
          
          let targetSys = targetMAP + (targetMAP * 0.3 * pulsePressureRatio) + sysPressorEffect - (st.patient.isSeptic ? 20 : 0);
          let targetDia = targetMAP - (targetMAP * 0.2 * pulsePressureRatio) + (sysPressorEffect / 2) - (st.patient.isSeptic ? 40 : 0);

          // 11. DRIFT CALCULUS (Applying Noise & Smooth Interpolation)
          const hrNoise = currentIsArrest ? 0 : (Math.random() * 2 - 1);
          const sysNoise = currentIsArrest ? 0 : (Math.random() * 4 - 2);
          const diaNoise = currentIsArrest ? 0 : (Math.random() * 2 - 1);

          let newHr = (st.vitals.hr || 70) + (targetHR - (st.vitals.hr || 70)) * 0.1 + hrNoise;
          let newSys = safeSys + (targetSys - safeSys) * 0.1 + sysNoise;
          let newDia = safeDia + (targetDia - safeDia) * 0.1 + diaNoise;
          
          let newSpo2 = (st.vitals.spo2 || 100) + (targetSpo2 - (st.vitals.spo2 || 100)) * 0.05;
          let newRr = (st.vitals.rr || 12) + (targetRR - (st.vitals.rr || 12)) * 0.2;
          let newEtco2 = targetRR === 0 ? 0 : (st.vitals.etco2 || 40) + (targetEtco2 - (st.vitals.etco2 || 40)) * 0.2;

          if (currentIsArrest) {
              newSys = st.patient.cprActive ? 80 + (Math.random() * 15) : 0;
              newDia = st.patient.cprActive ? 25 + (Math.random() * 10) : 0;
              newSpo2 = st.patient.cprActive ? 85 : 0;
              newEtco2 = (st.patient.cprActive && st.patient.airwaySecured) ? 15 + (Math.random() * 5) : 0;
              if (!st.patient.cprActive || activeRhythm === 'vfib' || activeRhythm === 'asystole') newHr = 0;
          } else if (st.patient.myocardialStunning > 0) {
              newSys -= st.patient.myocardialStunning;
              newDia -= (st.patient.myocardialStunning * 0.6);
              if (currentMap < 40) newSpo2 = 0; 
          }

          if (newDia >= newSys - 10) newDia = Math.max(0, newSys - 10);

          // 12. NEUROMONITORING & ACID-BASE
          const baseDeficit = (st.patient.isSeptic ? 8 : 0) + (bloodLossRatio * 20);
          const hco3 = Math.max(8, 24 - baseDeficit);
          let newPh = 6.1 + Math.log10(hco3 / (0.03 * newPaCO2));

          let targetBis = 98 - (aggregateHypnosis * 60);
          if (((newSys + 2*newDia)/3) < 50) targetBis -= (50 - ((newSys + 2*newDia)/3)) * 1.2;
          let finalBis = Math.max(0, targetBis + (unbluntedStimulus * 0.15));
          if (currentIsArrest) finalBis = bioDeath ? 0 : Math.max(0, (st.vitals.bis || 98) - 5);

          let targetTofCount = 4; let targetTofRatio = 1.0;
          if (maxNMJOccupancy > 0.95) { targetTofCount = 0; targetTofRatio = 0; }
          else if (maxNMJOccupancy > 0.85) { targetTofCount = 1; targetTofRatio = 0; }
          else if (maxNMJOccupancy > 0.75) { targetTofCount = 2; targetTofRatio = 0; }
          else { targetTofRatio = 1 - (maxNMJOccupancy * 1.2); }

          // 13. FINAL STATE UPDATES
          setPatient(prev => ({ 
              ...prev, ebl: currentEbl, oxygenBuffer: currentBuffer, 
              ischemicDamage: newDamage, isArrest: currentIsArrest, biologicalDeath: bioDeath,
              cardiacRhythm: activeRhythm, myocardialStunning: Math.max(0, (prev.myocardialStunning || 0) - 0.2) 
          }));

          setVitals(prev => ({
              ...prev, hr: Math.round(newHr), sys: Math.max(0, Math.round(newSys)), dia: Math.max(0, Math.round(newDia)),
              co: targetCO, svr: targetSVR, map: Math.round((newSys + 2*newDia)/3),
              spo2: Math.round(newSpo2), etco2: Math.max(0, Math.round(newEtco2)), rr: Math.round(newRr),
              temp: (prev.temp || 37.0) - 0.0001, bis: Math.round(finalBis), 
              tofCount: targetTofCount, tofRatio: targetTofRatio,
              vte: Math.round(newVte), pip: Math.round(newPip), pplat: Math.round(newPplat), 
              peep: newPeep, pmean: Math.round(newPmean), mv: newMv,
              mac: currentMac, etAgent: currentEtAgent, etN2O: currentEtN2O, pao2: targetPaO2, paco2: newPaCO2, ph: newPh
          }));
        } catch (error) {
          console.error("Physics Engine Tick Failed: ", error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
// THE VITAL DEPENDENCY FIX: The interval only resets when play/pause state is toggled.
  }, [isRunning, isPaused]); 

  // DEEP STATE SERIALIZATION: createSnapshot & restoreSnapshot
  const createSnapshot = () => {
    // Deep clone activeMeds maintaining class prototypes
    const clonedMeds = activeMeds.map(m => {
        const proto = Object.getPrototypeOf(m);
        const clone = Object.create(proto);
        return Object.assign(clone, JSON.parse(JSON.stringify(m)));
    });

    // Deep clone gasModels maintaining class prototypes
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

    // Force the ref to update immediately so the interval doesn't overwrite with stale data
    stateRef.current = {
        vitals: snap.vitals, targetVitals: snap.targetVitals, patient: snap.patient,
        activeMeds: snap.activeMeds, gasModels: snap.gasModels,
        intravascularVolume: snap.intravascularVolume, ventSettings, gasSettings,
        surgicalPhase: snap.surgicalPhase
    };
  };

  return { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid, activeMeds, intravascularVolume, electrolytes, coags, deliverShock, toggleCPR, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot };
}