import { useState, useEffect } from 'react';
import { MEDICATIONS, FLUIDS, calculateIBW, calculateLBW } from './Pharmacology.js';
import { PKPDModel } from './PKPDEngine.js';

export function usePhysiology({ activeCase, isRunning, isPaused, logEvent }) {
  const [time, setTime] = useState(0);
  const [vitals, setVitals] = useState({});
  const [targetVitals, setTargetVitals] = useState({});
  const [patient, setPatient] = useState({});
  const [activeMeds, setActiveMeds] = useState([]);
  // True Physiology Compartments
  const [intravascularVolume, setIntravascularVolume] = useState(0); 
  const [, setTotalBodyWaterLiters] = useState(42);
  const [electrolytes, setElectrolytes] = useState({ na: 140, k: 4.0, cl: 100, ca: 9.0, ph: 7.4 });
  const [coags, setCoags] = useState({ r_offset: 0, ma_offset: 0, angle_offset: 0 }); // Deviations from baseline

  useEffect(() => {
    if (activeCase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVitals({ ...activeCase.baseVitals, pip: 0, pplat: 0, vte: 0 });
       
      setTargetVitals({ ...activeCase.baseVitals });

      const heightCm = activeCase.patient.height || 170;
      const weightKg = activeCase.patient.weight || 70;
      const sex = activeCase.patient.sex || 'male';

       
      setPatient({
        ...activeCase.patient, height: heightCm, weight: weightKg, sex,
        ibw: calculateIBW(heightCm, sex), lbw: calculateLBW(heightCm, weightKg, sex),
        isApneic: false, isParalyzed: false, isTopicalized: false,
        airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
        hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21, oxygenBuffer: 21
      });
      
      setTime(0); setActiveMeds([]); setIntravascularVolume(0);
      setTotalBodyWaterLiters(weightKg * 0.6); 
      setElectrolytes({ na: 140, k: activeCase.patient.trauma ? 5.2 : 4.0, cl: 100, ca: 9.0, ph: activeCase.patient.isSeptic ? 7.2 : 7.4 });
      setCoags({ r_offset: activeCase.patient.trauma ? 6 : 0, ma_offset: activeCase.patient.trauma ? -15 : 0, angle_offset: activeCase.patient.trauma ? -15 : 0 });
    }
  }, [activeCase]);

  const pushFluid = (fluidName, volumeStr) => {
    const volume = parseFloat(volumeStr);
    if (!patient.hasIV && !patient.hasALine) { logEvent(`❌ Cannot administer ${fluidName}. No Access!`); return false; }
    const fluidData = FLUIDS[fluidName]; if (!fluidData) return false;
    const isUnit = fluidData.type === 'Colloid' && !fluidName.includes('Fibrinogen');
    const effectiveVolumeML = isUnit ? volume * fluidData.defaultVol : volume;
    const volumeLiters = effectiveVolumeML / 1000;
    logEvent(`💧 Administered ${volume} ${isUnit ? 'Units' : (fluidName.includes('Fibrinogen') ? 'g' : 'mL')} of ${fluidName}.`);
    
    setIntravascularVolume(prev => prev + (effectiveVolumeML * fluidData.retention));
    
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

    setCoags(prev => ({
      r_offset: prev.r_offset + (fluidData.coag.r * volume),
      ma_offset: prev.ma_offset + (fluidData.coag.ma * volume),
      angle_offset: prev.angle_offset + (fluidData.coag.angle * volume)
    }));
    return true;
  };

  const processMed = (medId, doseInput, route, type, unit) => {
    if (!patient.hasIV && route === 'IV') { logEvent(`❌ FAILED: No IV access for ${medId}!`); return false; }
    const medData = MEDICATIONS[medId]; if (!medData) return false;

    let doseInMg = parseFloat(doseInput);
    if (unit.includes('mcg/kg/min')) doseInMg = (doseInMg * patient.weight) / 1000;
    else if (unit.includes('mcg')) doseInMg = doseInMg / 1000;
    else if (unit.includes('mg/kg')) doseInMg = doseInMg * patient.weight;

    let existingModel = activeMeds.find(m => m.name === medData.name);
    if (!existingModel) { existingModel = new PKPDModel(medData, patient.weight); setActiveMeds(prev => [...prev, existingModel]); }

    if (type === 'Bolus') {
      const bio = route === 'IV' ? 1.0 : (route === 'IM' ? 0.8 : 0.5);
      existingModel.giveBolus(doseInMg * bio);
      logEvent(`💉 Pushed ${doseInput} ${unit} of ${medData.name} via ${route}.`);
      if (medId === 'sugammadex') {
         const roc = activeMeds.find(m => m.name === 'Rocuronium');
         if (roc) { roc.Ce = 0; logEvent("⚡ Sugammadex encapsulated Rocuronium. Paralysis reversed."); }
      }
    } else if (type === 'Infusion') {
      existingModel.setInfusion(doseInMg / 60); logEvent(`🔁 Started ${medData.name} infusion at ${doseInput} ${unit}.`);
    } else if (type === 'Stop Infusion') {
      existingModel.setInfusion(0); logEvent(`⏹ Stopped ${medData.name} infusion.`);
    }
  };

  const pushMed = (medName) => {
    if (medName.includes('Topical')) { logEvent(`Administered Topical Lidocaine.`); setPatient(prev => ({...prev, isTopicalized: true})); }
  };

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime((t) => t + 1);
        let totalSysDelta = 0; let totalHrDelta = 0; let totalRrDelta = 0; let isApneicFromDrugs = false; let isParalyzedFromDrugs = false;

        // 1. TICK PK/PD
        activeMeds.forEach(model => {
          const effects = model.tick(1); 
          totalSysDelta += effects.sysDelta; totalHrDelta += effects.hrDelta; 
          if (model.pd && model.pd.rrMax) {
            const ceGamma = Math.pow(model.Ce, model.pd.gamma || 1);
            const c50Gamma = Math.pow(model.pd.c50, model.pd.gamma || 1);
            totalRrDelta += model.pd.rrMax * (ceGamma / (ceGamma + c50Gamma));
          }
          if (model.pd) {
            if (model.pd.inducesApneaAtCe && model.Ce > model.pd.inducesApneaAtCe) isApneicFromDrugs = true;
            if (model.pd.inducesParalysisAtCe && model.Ce > model.pd.inducesParalysisAtCe) isParalyzedFromDrugs = true;
          }
        });

        setIntravascularVolume(prev => Math.max(0, prev - 1)); // 3rd spacing

        // 2. OXYGENATION, NIPPV, & RESPIRATORY DRIVE CALCULUS
        setPatient(prev => {
          let updated = { ...prev, isApneic: isApneicFromDrugs || prev.isApneic, isParalyzed: isParalyzedFromDrugs || prev.isParalyzed };
          let isVentilating = updated.ventilationStatus === 'successful' || updated.airwaySecured;
          
          // Base FRC calculated via height/weight (Ideal Body Weight concepts)
          let FRC_Liters = (updated.height * 20) / 1000 - (updated.isObese ? 0.8 : 0);
          
          // NIPPV FRC Recruitment: EPAP/PEEP splints alveoli open, increasing FRC
          if (updated.nippv) {
            FRC_Liters += (updated.nippv.epap * 0.05); // 50mL recruitment per cmH2O
          }

          const VO2_LitersPerSec = 0.250 / 60;
          let currentBuffer = updated.oxygenBuffer || 21;

          if (updated.isApneic && !isVentilating && !updated.nippv?.isBipapST) {
            // Wash-out: O2 is consumed from the FRC reservoir
            const dropPercentage = (VO2_LitersPerSec / FRC_Liters) * 100;
            currentBuffer -= dropPercentage;
          } else if (isVentilating || updated.nippv) {
            // Mechanical or NIPPV Wash-in
            const targetFiO2 = updated.currentFiO2 || 21;
            currentBuffer += (targetFiO2 - currentBuffer) * 0.15; // Faster equilibration under pressure
          } else if (updated.currentFiO2 > 21) {
            // Spontaneous Wash-in: Time Constant (Tau) = Volume / Flow
            const flowLitersPerSec = Math.max(0.05, (updated.currentO2Flow || 15) / 60); 
            const tau = FRC_Liters / flowLitersPerSec;
            currentBuffer += (updated.currentFiO2 - currentBuffer) * (1 / tau);
          } else {
            // Room Air Equilibration
            currentBuffer -= (currentBuffer - 21) * 0.05;
          }

          updated.oxygenBuffer = Math.min(100, Math.max(0, currentBuffer));
          return updated;
        });

        // 3. VITALS CALCULUS
        setVitals(prev => {
          const fluidPressorEffect = (intravascularVolume / 100) * 3;
          
          // Positive Pressure Preload Penalty (Reduces Venous Return)
          let preloadPenalty = 0;
          let pressureSupport = 0;
          if (patient.nippv) {
            const epap = patient.nippv.epap || 0;
            const ipap = patient.nippv.ipap || epap;
            pressureSupport = Math.max(0, ipap - epap);
            const meanAirwayPressure = epap + (pressureSupport / 3);
            preloadPenalty = meanAirwayPressure * 0.8; // Drops Sys BP by ~0.8 mmHg per cmH2O MAP
          }
          if (patient.airwaySecured) preloadPenalty = 10; // Standard vent penalty

          // Cardiovascular
          const targetSys = targetVitals.sys + totalSysDelta + fluidPressorEffect - preloadPenalty;
          const targetHr = targetVitals.hr + totalHrDelta;
          const targetDia = targetVitals.dia + (totalSysDelta * 0.6) + (fluidPressorEffect * 0.6) - (preloadPenalty * 0.5);
          
          let newSys = prev.sys + (targetSys - prev.sys) * 0.1 + (Math.random() * 2 - 1);
          let newHr = prev.hr + (targetHr - prev.hr) * 0.1 + (Math.random() * 2 - 1);
          let newDia = (prev.dia || 80) + (targetDia - (prev.dia || 80)) * 0.1 + (Math.random() * 1.5 - 0.75);
          
          if (newDia >= newSys - 15) newDia = newSys - 15; // Pulse pressure enforcement

          // Respiratory Drive & EtCO2
          let targetRr = targetVitals.rr + totalRrDelta;
          if (prev.spo2 < 92) targetRr += (92 - prev.spo2) * 0.5; // Hypoxia drive
          if (newSys < 80) targetRr += 6; // Shock drive

          let newRr = Math.max(0, Math.round(prev.rr + (targetRr - prev.rr) * 0.2));
          if (patient.isApneic) newRr = 0;
          if (patient.ventilationStatus === 'successful' || patient.nippv?.isBipapST) newRr = patient.nippv?.rate || 14;

          // EtCO2 Washout (Correlates with Pressure Support and RR)
          let targetEtco2 = 0;
          if (newRr > 0) {
              targetEtco2 = 40 + (14 - newRr) * 1.5;
              if (pressureSupport > 0) targetEtco2 -= (pressureSupport * 0.5); // PS blows off CO2
              if (newSys < 70) targetEtco2 -= 15; // Poor lung perfusion drops EtCO2
          }
          let newEtco2 = prev.etco2 + (targetEtco2 - prev.etco2) * 0.2;

          return { hr: Math.max(0, Math.round(newHr)), sys: Math.max(0, Math.round(newSys)), dia: Math.max(0, Math.round(newDia)), spo2: prev.spo2, etco2: Math.max(0, Math.round(newEtco2)), rr: newRr };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, activeMeds, intravascularVolume, targetVitals, patient]);

  return { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid, activeMeds, intravascularVolume, electrolytes, coags };
}