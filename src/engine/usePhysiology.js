import { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, calculateIBW, calculateLBW } from './Pharmacology.js';

export function usePhysiology({ activeCase, isRunning, isPaused, logEvent }) {
  const [time, setTime] = useState(0);
  const [vitals, setVitals] = useState({});
  const [targetVitals, setTargetVitals] = useState({});
  const [patient, setPatient] = useState({});
  const [activeMeds, setActiveMeds] = useState([]);
  const [fluidVolume, setFluidVolume] = useState(0);

  // Setup/Reset when activeCase changes
  useEffect(() => {
    if (activeCase) {
      setVitals({ ...activeCase.baseVitals, pip: 0, pplat: 0, vte: 0 });
      setTargetVitals({ ...activeCase.baseVitals });
      
      // Calculate derived weights
      const heightCm = activeCase.patient.height || 170;
      const weightKg = activeCase.patient.weight || 70;
      const sex = activeCase.patient.sex || 'male';
      const ibw = calculateIBW(heightCm, sex);
      const lbw = calculateLBW(heightCm, weightKg, sex);

      setPatient({
        ...activeCase.patient,
        height: heightCm,
        weight: weightKg,
        sex,
        ibw,
        lbw,
        isApneic: false,
        isParalyzed: false,
        isTopicalized: false,
        airwaySecured: false,
        airwayExamined: false,
        ventilationStatus: 'spontaneous',
        hasIV: false,
        hasALine: false,
        currentO2Device: 'Room Air (21% FiO2)'
      });
      setTime(0);
      setActiveMeds([]);
      setFluidVolume(0);
    }
  }, [activeCase]);

  const pushFluid = (fluidName, volume) => {
    if (!patient.hasIV && !patient.hasALine) {
      logEvent(`❌ FAILED: Cannot administer ${fluidName}. No IV access!`); return false;
    }
    const isUnitBased = fluidName.includes('Units') || fluidName.includes('PRBCs') || fluidName.includes('Platelets') || fluidName.includes('FFP') || fluidName.includes('Cryoprecipitate') || fluidName.includes('Fibrinogen');
    logEvent(`💧 Administered ${volume} ${isUnitBased ? 'Units' : 'mL'} of ${fluidName}.`);
    const isCrystalloid = fluidName.includes('Saline') || fluidName.includes('Lactated') || fluidName.includes('Plasmalyte') || fluidName.includes('Crystalloid');
    let effectiveVolume = 0;
    if (fluidName.includes('PRBCs')) effectiveVolume = volume * 300;
    else if (fluidName.includes('FFP')) effectiveVolume = volume * 250;
    else if (fluidName.includes('Platelets') || fluidName.includes('Fibrinogen')) effectiveVolume = volume * 50;
    else if (fluidName.includes('Cryoprecipitate')) effectiveVolume = volume * 15;
    else effectiveVolume = isCrystalloid ? volume * 0.25 : volume;
    setFluidVolume(prev => prev + effectiveVolume);
    return true;
  };

  const pushMed = (medId, dose, inducesApnea = false, inducesParalysis = false) => {
    if (!patient.hasIV && !medId.includes('Topical')) {
      logEvent(`❌ FAILED: Cannot administer ${medId}. No Intravenous (IV) access!`);
      return false;
    }

    const med = MEDICATIONS[medId];
    if (!med && !medId.includes('Topical')) {
        // Fallback for meds not in the database (or just log it)
        logEvent(`Administered ${medId}. (Not found in DB)`);
        return true;
    }
    
    if (medId.includes('Topical')) {
        logEvent(`Administered ${medId}.`);
        setPatient(p => ({ ...p, isTopicalized: true }));
        return true;
    }

    // Weight calculation
    let weightToUse = patient.weight;
    if (med.dosingWeight === 'IBW') weightToUse = patient.ibw;
    if (med.dosingWeight === 'LBW') weightToUse = patient.lbw;

    // Calculate effect based on dose proportion
    // If the drug standard dose is typically an array (e.g. [1.5, 2.5] mg/kg)
    const avgStandardDosePerKg = (med.standardDoseRange[0] + med.standardDoseRange[1]) / 2;
    let expectedTotalDose = avgStandardDosePerKg * weightToUse;

    // Some drugs are dosed absolute (e.g. Epi 10-100 mcg)
    if (med.dosingWeight === 'TBW' && med.standardDoseRange[1] > 10) { // arbitrary heuristic for fixed doses in DB
        // If it looks like a fixed dose (e.g. Epi 100mcg)
        if (medId === 'epinephrine' || medId === 'phenylephrine' || medId === 'adenosine' || medId === 'amiodarone' || medId === 'atropine' || medId === 'magnesiumSulfate' || medId === 'sodiumBicarbonate') {
            expectedTotalDose = (med.standardDoseRange[0] + med.standardDoseRange[1]) / 2;
        }
    }

    const doseProportion = dose / expectedTotalDose;
    const targetHrEffect = med.hrEffect * doseProportion;
    const targetSysEffect = med.sysEffect * doseProportion;

    logEvent(`Administered ${med.name} (${dose} ${dose > 10 ? 'mg/mcg' : 'mg/kg'}).`);

    setActiveMeds(prev => [...prev, {
      ...med,
      id: Date.now() + Math.random(),
      timePushed: time,
      doseGiven: dose,
      doseProportion,
      targetHrEffect,
      targetSysEffect,
      currentHrEffect: 0,
      currentSysEffect: 0
    }]);

    setPatient(p => ({
      ...p,
      isApneic: inducesApnea || p.isApneic,
      isParalyzed: inducesParalysis || p.isParalyzed
    }));

    return true;
  };

  // --- THE TIME-DELAYED PHYSIOLOGIC ENGINE ---
  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime((t) => t + 1);
        
        // 1. Calculate Medication Effects Gradually
        let totalMedHrEffect = 0;
        let totalMedSysEffect = 0;

        // Calculate current effects for all active meds synchronously
        const updatedMeds = activeMeds.map(med => {
          const timeSincePush = time - med.timePushed;
          // Cap the time to onsetSeconds so effect plateaus
          const effectTime = Math.min(timeSincePush, med.onsetSeconds);
          const progress = med.onsetSeconds > 0 ? (effectTime / med.onsetSeconds) : 1;
          
          // Linear onset
          const currentHrEffect = med.targetHrEffect * progress;
          const currentSysEffect = med.targetSysEffect * progress;
          
          // TODO: Handle drug duration/wear off if timeSincePush > durationMinutes * 60
          
          totalMedHrEffect += currentHrEffect;
          totalMedSysEffect += currentSysEffect;

          return { ...med, currentHrEffect, currentSysEffect };
        });

        setActiveMeds(updatedMeds);
        setFluidVolume(prev => Math.max(0, prev - 1));

        // 2. Patient Physiology Loop
        setPatient(prevPatient => {
          let updatedPatient = { ...prevPatient };
          let isEffectivelyVentilating = updatedPatient.ventilationStatus === 'successful' || updatedPatient.airwaySecured;
          
          if (time > 0 && time % 15 === 0 && !updatedPatient.airwaySecured) {
              if (Math.random() > 0.90 && updatedPatient.isApneic && !updatedPatient.airwayBlood && updatedPatient.stomach === 'full') {
                  // Wait, how to avoid spamming logs? This runs in setInterval.
                  // It's safe if it happens rarely.
                  updatedPatient.airwayBlood = true;
              }
          }

          // Pre-Oxygenation Delay
          if (updatedPatient.isApneic && !isEffectivelyVentilating) {
            updatedPatient.targetBuffer = 0;
            updatedPatient.oxygenBuffer = Math.max(0, updatedPatient.oxygenBuffer - (updatedPatient.isObese ? 4 : 2));
          } else {
            if (updatedPatient.oxygenBuffer < updatedPatient.targetBuffer) {
              updatedPatient.oxygenBuffer += 2;
            } else if (updatedPatient.oxygenBuffer > updatedPatient.targetBuffer) {
              updatedPatient.oxygenBuffer -= 1;
            }
          }

          setVitals(prevVitals => {
            let currentTarget = { ...targetVitals };
            let newSpo2 = prevVitals.spo2;

            // Apply Med Effects over base targets
            const baseSys = activeCase ? activeCase.baseVitals.sys : 120;
            const baseDia = activeCase ? activeCase.baseVitals.dia : 80;
            const baseHr = activeCase ? activeCase.baseVitals.hr : 80;
            const baseRr = activeCase ? activeCase.baseVitals.rr : 14;

            if (updatedPatient.isApneic && !isEffectivelyVentilating && updatedPatient.oxygenBuffer <= 10) {
              newSpo2 = Math.max(20, newSpo2 - (updatedPatient.isObese ? 3 : 1));
            } else if (isEffectivelyVentilating || (!updatedPatient.isApneic && currentTarget.rr > 0)) {
              newSpo2 = Math.min(100, newSpo2 + 2);
            }

            if (updatedPatient.isApneic && !isEffectivelyVentilating) {
              currentTarget.rr = 0;
              currentTarget.etco2 = 0;
            } else if (updatedPatient.airwaySecured) {
              currentTarget.rr = 14;
              currentTarget.etco2 = 38;
            } else if (!updatedPatient.isApneic) {
              // 1. Sedatives depress respiratory drive (estimated via HR depression)
              const respiratoryDepression = totalMedHrEffect / 3;
              let targetRr = Math.max(4, baseRr + respiratoryDepression);
              // 2. Hypoxic Drive kicks in if SpO2 drops
              if (newSpo2 < 90) targetRr += (90 - newSpo2);
              currentTarget.rr = Math.round(targetRr);
              // 3. Inverse Correlation: Hypoventilation = CO2 Retention. Hyperventilation = Blow off CO2.
              const rrDifference = baseRr - currentTarget.rr;
              currentTarget.etco2 = Math.max(15, Math.min(80, 35 + (rrDifference * 1.5)));
            }

            const fluidPressorEffect = (fluidVolume / 100) * 3;
            const finalTargetSys = currentTarget.sys + totalMedSysEffect + fluidPressorEffect;
            const finalTargetHr = currentTarget.hr + totalMedHrEffect;
            const finalTargetDia = currentTarget.dia + (totalMedSysEffect * 0.6) + (fluidPressorEffect * 0.6);

            // SMOOTH SPRING PHYSICS
            let newSys = prevVitals.sys + (finalTargetSys - prevVitals.sys) * 0.05 + (Math.random() * 2 - 1);
            let newDia = prevVitals.dia + (finalTargetDia - prevVitals.dia) * 0.05 + (Math.random() * 1.5 - 0.75);
            let newHR = prevVitals.hr + (finalTargetHr - prevVitals.hr) * 0.05 + (Math.random() * 1.5 - 0.75);
            let newEtco2 = prevVitals.etco2 + (currentTarget.etco2 - prevVitals.etco2) * 0.3;

            // STRICT PULSE PRESSURE ENFORCEMENT
            if (newDia >= newSys - 15) newDia = newSys - 15;

            // Slowly revert targetVitals towards base
            setTargetVitals(prev => ({
                ...prev,
                sys: prev.sys + (baseSys - prev.sys) * 0.01,
                dia: prev.dia + (baseDia - prev.dia) * 0.01,
                hr: prev.hr + (baseHr - prev.hr) * 0.01,
            }));

            return {
              hr: Math.max(0, Math.min(220, Math.round(newHR))),
              sys: Math.max(0, Math.round(newSys)),
              dia: Math.max(0, Math.round(newDia)),
              spo2: Math.round(newSpo2),
              etco2: Math.round(newEtco2),
              rr: currentTarget.rr,
              pip: updatedPatient.airwaySecured ? (updatedPatient.isObese ? 32 : 22) + (Math.random() * 2 - 1) : 0,
              pplat: updatedPatient.airwaySecured ? (updatedPatient.isObese ? 28 : 18) + (Math.random() * 1 - 0.5) : 0,
              vte: updatedPatient.airwaySecured ? 450 + (Math.random() * 10 - 5) : 0
            };
          });

          return updatedPatient;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, time, activeCase, targetVitals, activeMeds]);

  return {
    time,
    setTime,
    vitals,
    setVitals,
    targetVitals,
    setTargetVitals,
    patient,
    setPatient,
    pushMed,
    activeMeds,
    pushFluid
  };
}
