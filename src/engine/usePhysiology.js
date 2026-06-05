import { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, FLUIDS, INHALATIONAL_AGENTS, calculateIBW, calculateLBW, calculateAgeAdjustedMAC, calculateLungVolumes } from './Pharmacology.js';
import { PKPDModel } from './PKPDEngine';
import { GasKineticsModel } from './GasKineticsEngine';
import { getAnatomicalParameter, extractTextbookRules } from '../testing/oracle_query.ts';
import { DynamicMedicationRegistry } from '../knowledge/DynamicMedicationRegistry.ts';
import { FluidicsEngine } from './FluidicsEngine';
import { CardiovascularEngine } from './CardiovascularEngine';
import { RespiratoryEngine } from './RespiratoryEngine';
import { PainEngine } from './PainEngine';

export function usePhysiology({ activeCase, isRunning, isPaused, ventSettings, gasSettings, logEvent, msmaidsComplete }) {
  const [timeVal, setTimeState] = useState(0);
  const [vitalsVal, setVitalsState] = useState({});
  const [targetVitalsVal, setTargetVitalsState] = useState({});
  const [patientVal, setPatientState] = useState({});
  const [activeMedsVal, setActiveMedsState] = useState([]);
  const [gasModels, setGasModels] = useState({});
  
  const [intravascularVolumeVal, setIntravascularVolumeState] = useState(0); 
  const [totalBodyWaterLitersVal, setTotalBodyWaterLitersState] = useState(42);
  const [electrolytesVal, setElectrolytesState] = useState({ na: 140, k: 4.0, cl: 100, ca: 9.0, ph: 7.4 });
  const [coagsVal, setCoagsState] = useState({ r_offset: 0, ma_offset: 0, angle_offset: 0 });
  const [surgicalPhaseVal, setSurgicalPhaseState] = useState('Pre-Op');
  const [prevCaseId, setPrevCaseId] = useState(null);

  // Synchronous State Setter Wrappers to synchronously bridge changes into stateRef
  const stateRef = useRef({ time: timeVal, vitals: vitalsVal, targetVitals: targetVitalsVal, patient: patientVal, activeMeds: activeMedsVal, gasModels, intravascularVolume: intravascularVolumeVal, electrolytes: electrolytesVal, ventSettings, gasSettings, surgicalPhase: surgicalPhaseVal, msmaidsComplete });

  const setTime = (update) => {
    const prev = stateRef.current.time !== undefined ? stateRef.current.time : timeVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.time = next;
    setTimeState(next);
  };

  const setVitals = (update) => {
    const prev = stateRef.current.vitals || vitalsVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.vitals = next;
    setVitalsState(next);
  };

  const setTargetVitals = (update) => {
    const prev = stateRef.current.targetVitals || targetVitalsVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.targetVitals = next;
    setTargetVitalsState(next);
  };

  const setPatient = (update) => {
    const prev = stateRef.current.patient || patientVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.patient = next;
    setPatientState(next);
  };

  const setActiveMeds = (update) => {
    const prev = stateRef.current.activeMeds || activeMedsVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.activeMeds = next;
    setActiveMedsState(next);
  };

  const setIntravascularVolume = (update) => {
    const prev = stateRef.current.intravascularVolume !== undefined ? stateRef.current.intravascularVolume : intravascularVolumeVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.intravascularVolume = next;
    setIntravascularVolumeState(next);
  };

  const setTotalBodyWaterLiters = (update) => {
    const prev = stateRef.current.totalBodyWaterLiters !== undefined ? stateRef.current.totalBodyWaterLiters : totalBodyWaterLitersVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.totalBodyWaterLiters = next;
    setTotalBodyWaterLitersState(next);
  };

  const setElectrolytes = (update) => {
    const prev = stateRef.current.electrolytes || electrolytesVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.electrolytes = next;
    setElectrolytesState(next);
  };

  const setCoags = (update) => {
    const prev = stateRef.current.coags || coagsVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.coags = next;
    setCoagsState(next);
  };

  const setSurgicalPhase = (update) => {
    const prev = stateRef.current.surgicalPhase || surgicalPhaseVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.surgicalPhase = next;
    setSurgicalPhaseState(next);
  };

  const time = timeVal;
  const vitals = vitalsVal;
  const targetVitals = targetVitalsVal;
  const patient = patientVal;
  const activeMeds = activeMedsVal;
  const intravascularVolume = intravascularVolumeVal;
  const totalBodyWaterLiters = totalBodyWaterLitersVal;
  const electrolytes = electrolytesVal;
  const coags = coagsVal;
  const surgicalPhase = surgicalPhaseVal;

  useEffect(() => {
    stateRef.current = { 
      time, vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, totalBodyWaterLiters, electrolytes, coags, ventSettings, gasSettings, surgicalPhase, msmaidsComplete 
    };
  });

  useEffect(() => {
    if (activeCase && activeCase.id !== prevCaseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrevCaseId(activeCase.id);
      DynamicMedicationRegistry.hydrate();
        const safeBaseVitals = activeCase.baseVitals || {};
        const baseDia = typeof safeBaseVitals.dia === 'number' && Number.isFinite(safeBaseVitals.dia) ? safeBaseVitals.dia : 80;
        const baseSys = typeof safeBaseVitals.sys === 'number' && Number.isFinite(safeBaseVitals.sys) ? safeBaseVitals.sys : 120;
        const baseHr = typeof safeBaseVitals.hr === 'number' && Number.isFinite(safeBaseVitals.hr) && safeBaseVitals.hr > 0 ? safeBaseVitals.hr : 70;

        const initialMap = baseDia + ((baseSys - baseDia) / 3);
        const safePatientObj = activeCase.patient || {};
        const assumedBaseSV = safePatientObj.isObese ? 85 : 70; 
        let initialCO = (baseHr * assumedBaseSV) / 1000;
        if (isNaN(initialCO) || !Number.isFinite(initialCO) || initialCO <= 0.1) {
          initialCO = 5.0;
        }
        let calculatedBaseSVR = (initialMap * 80) / initialCO;
        if (isNaN(calculatedBaseSVR) || !Number.isFinite(calculatedBaseSVR) || calculatedBaseSVR <= 10.0) {
          calculatedBaseSVR = 1200.0;
        }

        setVitals({ 
          ...safeBaseVitals, pip: 0, pplat: 0, vte: 0, bis: 98, temp: 37.0, 
          tofCount: 4, tofRatio: 1.0, mac: 0, etAgent: 0, etN2O: 0, 
          pao2: safePatientObj.isObese ? 75 : 100, 
          paco2: safePatientObj.isObese ? 52 : 40, 
          ph: safePatientObj.isSeptic ? 7.22 : (safePatientObj.isObese ? 7.36 : 7.4), 
          co: initialCO, svr: calculatedBaseSVR, map: Math.round(initialMap), cmap: Math.round(initialMap), 
          metHb: 0.8, coHb: activeCase.id === 'trauma' ? 12.0 : 1.0, cyanide: 0.0, lacticAcid: safePatientObj.isSeptic ? 4.5 : 1.0,
          cao2: 20.0, cvo2: 15.0, p50: 26.6, r_ratio: 0.90
        });
        setTargetVitals({ ...safeBaseVitals });
        
        const heightCm = typeof safePatientObj.height === 'number' && Number.isFinite(safePatientObj.height) ? safePatientObj.height : 170;
        const weightKg = typeof safePatientObj.weight === 'number' && Number.isFinite(safePatientObj.weight) ? safePatientObj.weight : 70;
        const sex = typeof safePatientObj.sex === 'string' ? safePatientObj.sex : 'male';
        
        const clampedHeight = Math.max(50.0, Math.min(250.0, heightCm));
        const clampedWeight = Math.max(5.0, Math.min(300.0, weightKg));
        const clampedAge = Math.max(1.0, Math.min(120.0, typeof safePatientObj.age === 'number' && Number.isFinite(safePatientObj.age) ? safePatientObj.age : 40));
        
        const ebv = typeof safePatientObj.ebv === 'number' && Number.isFinite(safePatientObj.ebv) && safePatientObj.ebv > 0 
          ? safePatientObj.ebv 
          : (clampedWeight * (sex.toLowerCase() === 'female' ? 65 : 75));
        const baseBleedRate = typeof safePatientObj.bleedRate === 'number' && Number.isFinite(safePatientObj.bleedRate) ? safePatientObj.bleedRate : (activeCase.id === 'trauma' ? 1.5 : 0.05); 

        const bmi = typeof safePatientObj.bmi === 'number' && Number.isFinite(safePatientObj.bmi) && safePatientObj.bmi > 0 
          ? safePatientObj.bmi 
          : (clampedWeight / Math.pow(clampedHeight / 100, 2));
        const position = typeof safePatientObj.position === 'string' ? safePatientObj.position : 'Supine';
        const lungVols = calculateLungVolumes(clampedHeight, clampedAge, sex, bmi, position, safePatientObj.copd || false, safePatientObj.restrictive || false);

        setPatient({
          ...safePatientObj, height: clampedHeight, weight: clampedWeight, sex, ebv, ebl: safePatientObj.ebl || 0, bleedRate: baseBleedRate,
          ibw: calculateIBW(clampedHeight, sex), lbw: calculateLBW(clampedHeight, clampedWeight, sex),
          lungVolumes: lungVols,
          position: position,
          isApneic: false, isParalyzed: false, isTopicalized: false,
          airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
          hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21,
          oxygenBuffer: lungVols.frc_L * 0.21, 
          hasBisMonitor: false, hasTofMonitor: false,
          isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0,
          arrestThreshold: 1200, codeStartTime: null, apneaStartTime: null,
          shuntFraction: activeCase.id === 'trauma' ? 0.20 : (safePatientObj.isObese ? 0.12 : 0.05),
          patientBaseSVR: calculatedBaseSVR,
          patientBaseSV: assumedBaseSV,
          patientBaseHR: baseHr,
          
          metHb: 0.8,
          coHb: activeCase.id === 'trauma' ? 12.0 : 1.0,
          cyanide: 0.0,
          lacticAcid: safePatientObj.isSeptic ? 4.5 : 1.0,
          glp1Held: activeCase.id === 'obese' ? false : true,
          nAChR_state: activeCase.id === 'trauma' ? 'upregulated' : 'normal',
          ivGauge: '18G',
          fluidLine: 'gravity',
          stomach: activeCase.id === 'obese' ? 'full' : (activeCase.id === 'trauma' ? 'full' : 'empty'),
          fluidInfusing: null,
          suxPotassiumLeaked: false,
          isSeizure: false
        });
        
        setTime(0); setActiveMeds([]); setIntravascularVolume(0); setSurgicalPhase('Pre-Op');
        
        const safeGasModels = {};
        Object.keys(INHALATIONAL_AGENTS).forEach(key => {
            if (INHALATIONAL_AGENTS[key]) {
                safeGasModels[key] = new GasKineticsModel(INHALATIONAL_AGENTS[key]);
            }
        });
        setGasModels(safeGasModels);
        
        setTotalBodyWaterLiters(clampedWeight * 0.6); 
        setElectrolytes({ na: 140, k: safePatientObj.trauma ? 5.2 : 4.0, cl: 100, ca: 9.0, ph: safePatientObj.isSeptic ? 7.2 : 7.4 });
        setCoags({ r_offset: safePatientObj.trauma ? 6 : 0, ma_offset: safePatientObj.trauma ? -15 : 0, angle_offset: safePatientObj.trauma ? -15 : 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase, prevCaseId]);

  const pushFluid = (fluidName, volumeStr, lineId, rateStr = undefined) => {
    const currentPatient = stateRef.current.patient || patient;
    const volume = parseFloat(volumeStr);
    if (isNaN(volume) || !Number.isFinite(volume) || volume <= 0) {
        logEvent(`❌ FAILED: Cannot administer ${fluidName}. Invalid volume specified!`);
        return false;
    }
    const targetLine = currentPatient.accessLines?.find(l => l.id === lineId);
    
    if (!targetLine) {
        logEvent(`❌ FAILED: Cannot administer ${fluidName}. No valid venous access line selected!`);
        return false;
    }
    
    if (targetLine.failed) {
        logEvent(`❌ FAILED: Cannot administer ${fluidName}. Access Line: ${targetLine.name} has been BLOWN OUT!`);
        return false;
    }
    
    if (targetLine.category.includes('Arterial')) {
        logEvent(`🚨 CRITICAL ERROR: Attempted fluid resuscitation via Arterial Line! Arteries cannot accommodate high volume infusion. Retrograde flow risks cerebral embolization and severe limb ischemia!`);
        return false;
    }

    const fluidData = FLUIDS[fluidName]; if (!fluidData) return false;
    const isBlood = fluidData.type === 'Blood Product';
    
    if (isBlood) {
        const bb = currentPatient.bloodBank || { status: 'none', unitsInOR: 0, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: 'none' };

        if (bb.status === 'available' && bb.unitsInOR > 0) {
            const requestedUnits = volume;
            if (requestedUnits > bb.unitsInOR) {
                logEvent(`❌ FAILED: Requested ${requestedUnits} unit(s) of ${fluidName}, but only ${bb.unitsInOR} unit(s) remain in the OR cooler. Order more from Blood Bank.`);
                return false;
            }
            setPatient(prev => ({
                ...prev,
                bloodBank: {
                    ...prev.bloodBank,
                    unitsInOR: prev.bloodBank.unitsInOR - requestedUnits
                }
            }));
            if (bb.unitsInOR - requestedUnits <= 0) {
                logEvent(`⚠️ Blood Bank: Last unit(s) from OR cooler being administered. Order additional units if hemorrhage continues.`);
            }
        } else if (bb.status === 'ordered') {
            const remaining = Math.ceil(bb.deliveryCountdown);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            logEvent(`❌ FAILED: Blood products have not arrived yet! Cooler ETA: ${mins}m ${secs}s remaining (${remaining}s). Blood Bank is processing.`);
            return false;
        } else {
            const hasTypeAndScreen = currentPatient.preOpOrders?.labs?.typeAndScreen || false;
            const hasTypeAndCross = currentPatient.preOpOrders?.labs?.typeAndCross || false;

            if (hasTypeAndCross && bb.status === 'none') {
                logEvent(`✅ Blood Bank: Type & Crossmatch was completed pre-operatively. 2 crossmatched units of PRBCs are in the OR cooler. Proceeding with transfusion.`);
                const requestedUnits = volume;
                setPatient(prev => ({
                    ...prev,
                    bloodBank: {
                        status: 'available',
                        unitsInOR: Math.max(0, 2 - requestedUnits),
                        deliveryCountdown: 0,
                        totalDeliveryTime: 0,
                        preOpWorkup: 'crossmatch'
                    }
                }));
            } else {
                const baselineDelay = 600; 
                const delaySeconds = hasTypeAndScreen ? (baselineDelay * 0.50) : baselineDelay;
                const deliveryUnits = 4; 

                const rationale = hasTypeAndCross
                    ? `Previous crossmatch on file. Reorder delivery: ${Math.round(delaySeconds)}s. Blood Bank pulling ${deliveryUnits} additional units.`
                    : hasTypeAndScreen
                        ? `Type & Screen on file — ABO/Rh and antibody screen already completed. Electronic crossmatch in progress. Delivery: ${Math.round(delaySeconds)}s (${Math.round(delaySeconds/60)} min). ${deliveryUnits} units being prepared.`
                        : `NO pre-operative blood workup on file! Emergency uncrossmatched O-Negative release protocol initiated. Full ABO/Rh typing and antibody screen running concurrently. Delivery: ${Math.round(delaySeconds)}s (${Math.round(delaySeconds/60)} min). ${deliveryUnits} uncrossmatched units being dispatched.`;

                logEvent(`🚨 Blood Bank: Emergency order placed for ${fluidName}. ${rationale}`);

                setPatient(prev => ({
                    ...prev,
                    bloodBank: {
                        status: 'ordered',
                        unitsInOR: 0,
                        deliveryCountdown: delaySeconds,
                        totalDeliveryTime: delaySeconds,
                        pendingUnits: deliveryUnits,
                        preOpWorkup: hasTypeAndCross ? 'crossmatch' : (hasTypeAndScreen ? 'screen' : 'none')
                    }
                }));
                return false;
            }
        }
    }

    const isUnit = isBlood || fluidData.type === 'Colloid';
    
    if (isUnit) {
        if (volume > 20) {
            logEvent(`❌ FAILED: Attempted to infuse ${volume} units of ${fluidName}. That is physiologically impossible and clinically absurd.`);
            return false;
        }
    } else {
        if (volume > 5000) {
            logEvent(`❌ FAILED: Attempted to infuse ${volume} mL of ${fluidName} in a single bolus. That is clinically absurd.`);
            return false;
        }
    }

    const effectiveVolumeML = fluidName.includes('Fibrinogen') ? volume * 50 : (isUnit ? volume * (fluidData.defaultVol || 300) : volume);

    let initialUserRate = undefined;
    if (rateStr !== undefined && rateStr !== null && rateStr !== '') {
        const parsedRate = parseFloat(rateStr);
        if (!isNaN(parsedRate) && Number.isFinite(parsedRate) && parsedRate > 0) {
            initialUserRate = parsedRate;
        }
    }

    setPatient(prev => {
        const newLines = [...(prev.accessLines || [])];
        const lineIndex = newLines.findIndex(l => l.id === lineId);
        if (lineIndex >= 0) {
            newLines[lineIndex] = {
                ...newLines[lineIndex],
                activeInfusions: [
                    ...(newLines[lineIndex].activeInfusions || []),
                    { id: Date.now().toString(), name: fluidName, remainingVolume: effectiveVolumeML, startingVolume: effectiveVolumeML, userRate: initialUserRate, currentRate: 0 }
                ]
            };
        }
        return { ...prev, accessLines: newLines };
    });

    logEvent(`💧 Attached: ${volume} ${isUnit ? 'Units' : (fluidName.includes('Fibrinogen') ? 'g' : 'mL')} of ${fluidName} to ${targetLine.name}.`);
    return true;
  };

  const updateFluidRate = (lineId, infusionId, newRate_ml_hr) => {
    setPatient(prev => {
        const newLines = (prev.accessLines || []).map(l => {
            if (l.id !== lineId) return l;
            return {
                ...l,
                activeInfusions: (l.activeInfusions || []).map(inf => {
                    if (inf.id !== infusionId) return inf;
                    return { ...inf };
                })
            };
        });
        const lineIndex = newLines.findIndex(l => l.id === lineId);
        if (lineIndex >= 0) {
            const line = newLines[lineIndex];
            const infusions = line.activeInfusions;
            const infIndex = infusions.findIndex(i => i.id === infusionId);
            if (infIndex >= 0) {
                if (newRate_ml_hr === '' || newRate_ml_hr === null || isNaN(parseFloat(newRate_ml_hr))) {
                    delete infusions[infIndex].userRate;
                    logEvent(`Max flow enabled for ${infusions[infIndex].name} on ${line.name}.`);
                } else {
                    let rate = parseFloat(newRate_ml_hr);
                    if (isNaN(rate) || !Number.isFinite(rate) || rate < 0) {
                        logEvent(`❌ FAILED: Invalid flow rate requested!`);
                        return prev;
                    }
                    const lType = line.fluidLine || prev.fluidLine || 'gravity';
                    let pInfusion = 74; 
                    if (lType === 'ranger') pInfusion = 150;
                    else if (lType === 'belmont') pInfusion = 300;
                    
                    const pv = line.venousPressure !== undefined ? line.venousPressure : 10;
                    const rv = line.veinResistance !== undefined ? line.veinResistance : 500;
                    let deltaP = pInfusion - pv;
                    if (deltaP < 0) deltaP = 0;
                    
                    const fluidData = FLUIDS[infusions[infIndex].name];
                    const eta = fluidData ? Math.max(0.01, fluidData.viscosity || 1.0) : 1.0;
                    
                    let rTubing = 400;
                    if (lType === 'ranger') rTubing = 800;
                    else if (lType === 'belmont') rTubing = 200;
                    
                    const safeRadius = Math.max(0.01, line.radius || 0.475);
                    const safeLength = Math.max(1, line.length || 30);
                    const rCath = safeLength / Math.pow(safeRadius, 4);
                    const rTotal = Math.max(1.0, rTubing + rCath + rv);
                    
                    let q_ml_min = 1200 * deltaP / (eta * rTotal);
                    if (isNaN(q_ml_min) || !Number.isFinite(q_ml_min) || q_ml_min < 0) {
                        q_ml_min = 0;
                    }
                    if (lType === 'belmont' && q_ml_min > 500) q_ml_min = 500;
                    
                    const max_ml_hr = q_ml_min * 60;
                    if (rate > max_ml_hr) {
                        rate = max_ml_hr;
                        logEvent(`⚠️ Requested rate exceeds physical limits of ${line.name}. Capped at ${Math.round(rate)} mL/hr.`);
                    }
                    infusions[infIndex].userRate = rate;
                }
            }
        }
        return { ...prev, accessLines: newLines };
    });
  };

  const removeFluid = (lineId, infusionId) => {
    setPatient(prev => {
        const newLines = [...(prev.accessLines || [])];
        const lineIndex = newLines.findIndex(l => l.id === lineId);
        if (lineIndex >= 0) {
            const infusions = [...(newLines[lineIndex].activeInfusions || [])];
            const filtered = infusions.filter(i => i.id !== infusionId);
            newLines[lineIndex] = { ...newLines[lineIndex], activeInfusions: filtered };
        }
        return { ...prev, accessLines: newLines };
    });
    logEvent(`Stopped and removed fluid infusion.`);
  };

  const processMed = (medId, doseInput, route, type, unit, lineId = null) => {
    const currentPatient = stateRef.current.patient || patient;
    const currentActiveMeds = stateRef.current.activeMeds || activeMeds;

    const targetLine = lineId ? currentPatient.accessLines?.find(l => l.id === lineId) : null;
    if (targetLine && targetLine.category?.includes('Arterial')) {
        logEvent(`🚨 CRITICAL ERROR: Injected ${medId} into Arterial Line: ${targetLine.name}! This causes immediate profound arterial vasospasm, endothelial destruction, and severe distal limb necrosis!`);
        return false;
    }
    if (targetLine && targetLine.failed) {
        logEvent(`❌ FAILED: Cannot administer ${medId}. Access Line: ${targetLine.name} has been BLOWN OUT!`);
        return false;
    }
    const hasCVC = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('CVC') || l.type?.includes('CVC') || l.category?.includes('Central') || l.type?.includes('Central') || l.type?.includes('Cordis') || l.type?.includes('Introducer')));
    const hasPIV = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('PIV') || l.name?.includes('PIV') || l.category?.includes('IV') || l.name?.includes('IV') || l.category?.includes('Peripheral')));
    const hasIO = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('IO') || l.name?.includes('IO') || l.type?.includes('IO') || l.type?.includes('Intraosseous')));
    const hasArt = currentPatient.accessLines?.some(l => l.category?.includes('Arterial') || l.name?.includes('Arterial'));

    if (route === 'IV' && !hasCVC && !hasPIV && !hasIO) {
        if (hasArt) {
            logEvent(`🚨 CRITICAL ERROR: Injected ${medId} into Arterial Line! This causes immediate profound arterial vasospasm, endothelial destruction, and severe distal limb necrosis!`);
        } else {
            logEvent(`❌ FAILED: No venous access available for ${medId}!`);
        }
        return false; 
    }

    const medData = MEDICATIONS[medId]; if (!medData) return false;

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
    if (isNaN(doseInMg) || !Number.isFinite(doseInMg) || doseInMg <= 0) {
        logEvent(`❌ FAILED: Invalid medication dose specified!`);
        return false;
    }
    const safePatientWeight = typeof currentPatient.weight === 'number' && Number.isFinite(currentPatient.weight) && currentPatient.weight > 0 ? currentPatient.weight : 70;
    const safePatientIbw = typeof currentPatient.ibw === 'number' && Number.isFinite(currentPatient.ibw) && currentPatient.ibw > 0 ? currentPatient.ibw : 70;
    const safePatientLbw = typeof currentPatient.lbw === 'number' && Number.isFinite(currentPatient.lbw) && currentPatient.lbw > 0 ? currentPatient.lbw : 60;

    const dosingWeight = medData.dosingWeight === 'IBW' ? safePatientIbw : (medData.dosingWeight === 'LBW' ? safePatientLbw : safePatientWeight);
    const safeUnit = typeof unit === 'string' ? unit : '';
    if (safeUnit.includes('mcg/kg/min')) doseInMg = (doseInMg * dosingWeight) / 1000;
    else if (safeUnit.includes('mcg')) doseInMg = doseInMg / 1000;
    else if (safeUnit.includes('mg/kg')) doseInMg = doseInMg * dosingWeight;

    if (isNaN(doseInMg) || !Number.isFinite(doseInMg) || doseInMg <= 0) {
        logEvent(`❌ FAILED: Invalid calculated medication dose in mg!`);
        return false;
    }

    let existingModel = currentActiveMeds.find(m => m.name === medData.name);
    let updatedMeds = [...currentActiveMeds];
    if (!existingModel) { 
      existingModel = new PKPDModel(medData, safePatientWeight); 
      updatedMeds.push(existingModel); 
    }

    if (type === 'Bolus') {
      const bio = route === 'IV' ? 1.0 : (route === 'IM' ? 0.8 : 0.5);
      existingModel.giveBolus(doseInMg * bio);
      logEvent(`💉 Pushed ${doseInput} ${unit} of ${medData.name} via ${route}.`);
      
      if (medId === 'sugammadex') {
        const roc = currentActiveMeds.find(m => m.name === 'Rocuronium');
        const vec = currentActiveMeds.find(m => m.name === 'Vecuronium');
        const doseMgPerKg = doseInMg / currentPatient.weight;
        let chelateFraction = 1.0;
        if (doseMgPerKg >= 16) chelateFraction = 1.0;
        else if (doseMgPerKg >= 4) chelateFraction = 0.95;
        else if (doseMgPerKg >= 2) chelateFraction = 0.8;
        else chelateFraction = doseMgPerKg / 2.0 * 0.8;
        
        chelateFraction = Math.min(1.0, chelateFraction);
        
        if (roc) {
          roc.chelate(chelateFraction);
          logEvent(`⚡ Sugammadex encapsulated Rocuronium (chelated ${Math.round(chelateFraction * 100)}%).`);
        }
        if (vec) {
          vec.chelate(chelateFraction);
          setPatient(prev => ({
            ...prev,
            vec3oh: Math.max(0, (prev.vec3oh || 0) * (1 - chelateFraction))
          }));
          logEvent(`⚡ Sugammadex encapsulated Vecuronium and its active 3-OH metabolite (chelated ${Math.round(chelateFraction * 100)}%).`);
        }
      }
 
      if (medId === 'succinylcholine') {
        let leak = 0.5; 
        if (currentPatient.nAChR_state === 'upregulated') {
          leak = getAnatomicalParameter("Succinylcholine upregulated potassium leak", 5.2);
          logEvent(`🚨 CRITICAL CLINICAL EMERGENCY: Succinylcholine given to patient with nAChR upregulation! Extrajunctional receptors opened, triggering massive potassium leak (+${leak.toFixed(1)} mEq/L)!`);
        } else {
          logEvent(`⚡ Succinylcholine administered. Normal transient potassium release (+0.5 mEq/L) observed.`);
        }
        setElectrolytes(prev => ({ ...prev, k: prev.k + leak }));
        setPatient(prev => ({ ...prev, suxPotassiumLeaked: true }));
      }

      if (medId === 'neostigmine') {
        const glyco = currentActiveMeds.find(m => m.name === 'Glycopyrrolate');
        const glycoCe = glyco ? glyco.Ce : 0;
        if (glycoCe < 0.05) {
          setPatient(prev => ({
            ...prev,
            bradycardiaTriggered: true,
            bradycardiaTime: stateRef.current.time || 0
          }));
          logEvent(`🚨 CRITICAL CLINICAL EMERGENCY: Neostigmine administered without Glycopyrrolate! Unopposed muscarinic activation is causing profound vagal bradycardia and salivation!`);
        } else {
          logEvent(`⚡ Neostigmine and Glycopyrrolate administered. Safe reversal of neuromuscular blockade initiated.`);
        }
      }

      if (medId === 'glycopyrrolate') {
        if (currentPatient.bradycardiaTriggered) {
          setPatient(prev => ({ ...prev, bradycardiaTriggered: false }));
          logEvent(`✅ Glycopyrrolate administered. Muscarinic bradycardia successfully resolved. Heart rate recovering.`);
        }
      }

      if (medId === 'calcium') {
        setPatient(prev => ({
          ...prev,
          calciumStabilized: true,
          calciumStabilizedTime: stateRef.current.time || 0
        }));
        logEvent(`⚡ Calcium Chloride administered. Myocardial membranes stabilized. Hyperkalemic cardiac arrest risk mitigated.`);
      }

      if (stateRef.current.surgicalPhase === 'Pre-Op' && (medData.classes.includes('Sedative') || medData.classes.includes('Hypnotic') || medData.classes.includes('Dissociative'))) {
        if (stateRef.current.msmaidsComplete || stateRef.current.patient.emergentRSI || stateRef.current.patient.isFuzzing) {
          setSurgicalPhase('Induction');
          logEvent(`➡️ Surgical Timeline Auto-Advanced: INDUCTION phase initiated.`);
        } else {
          logEvent(`⚠️ CLINICAL INTERLOCK BLOCKED: Auto-progression to Induction locked. Complete MSMAIDS checklist first.`);
        }
      }

    } else if (type === 'Infusion') {
      existingModel.setInfusion(doseInMg / 60);
      existingModel.displayDose = doseInput;
      existingModel.displayUnit = unit;
      existingModel.medId = medId; 

      const targetLineId = lineId || (currentPatient.accessLines || []).find(l => !l.category?.includes('Arterial'))?.id;

      if (targetLineId) {
        setPatient(prev => {
          const updatedLines = (prev.accessLines || []).map(l => {
            if (l.id !== targetLineId) return l;
            const meds = [...(l.activeMedInfusions || [])];
            const idx = meds.findIndex(m => m.medId === medId);
            if (idx >= 0) {
              meds[idx] = { ...meds[idx], rate: parseFloat(doseInput), unit };
            } else {
              meds.push({ medId, rate: parseFloat(doseInput), unit });
            }
            return { ...l, activeMedInfusions: meds };
          });
          return { ...prev, accessLines: updatedLines };
        });
      }
      logEvent(`🔁 Started/Updated ${medData.name} infusion at ${doseInput} ${unit}.`);
    } else if (type === 'Stop Infusion') {
      existingModel.setInfusion(0);
      existingModel.displayDose = 0;
      
      setPatient(prev => {
        const updatedLines = (prev.accessLines || []).map(l => ({
          ...l,
          activeMedInfusions: (l.activeMedInfusions || []).filter(m => m.medId !== medId)
        }));
        return { ...prev, accessLines: updatedLines };
      });
      logEvent(`⏹ Stopped ${medData.name} infusion.`);
    }
    setActiveMeds(updatedMeds);
  };

  const pushMed = (medName) => { 
    if (medName.includes('Topical')) { 
      logEvent(`Administered Topical Lidocaine.`); 
      setPatient(prev => ({...prev, isTopicalized: true})); 
    } 
  };

  const toggleCPR = () => {
    setPatient(p => {
      const newState = !p.cprActive;
      logEvent(newState ? "🩺 Initiated Chest Compressions." : "⏹ Stopped Chest Compressions.");
      return { ...p, cprActive: newState, cprStartTime: newState ? (stateRef.current.time ?? 0) : null };
    });
  };

  const deliverShock = (joules, isSync) => {
    const currentPatient = stateRef.current.patient || patient;
    const bloodLossRatio = (currentPatient.ebl || 0) / (currentPatient.ebv || 5000);
    const patLungVols = calculateLungVolumes(
      currentPatient.height || 170,
      currentPatient.age || 40,
      currentPatient.sex || 'male',
      currentPatient.bmi || 25,
      currentPatient.position || 'Supine',
      currentPatient.copd || false,
      currentPatient.restrictive || false
    );
    const currentFRC_L = patLungVols.frc_L;

    const result = CardiovascularEngine.deliverShock({
      patient: currentPatient,
      activeMeds: stateRef.current.activeMeds || activeMeds,
      currentBuffer: currentPatient.oxygenBuffer || (currentFRC_L * 0.21),
      currentFRC_L,
      bloodLossRatio,
      joules,
      isSync,
      simulationTime: stateRef.current.time || time
    });

    setPatient(result.patient);
    result.events.forEach(msg => logEvent(msg));
  };

  useEffect(() => {
    let interval;
    const actualPaused = isPaused && !patient?.isFuzzing;
    if (isRunning && !actualPaused) {
      interval = setInterval(() => {
        try {
          setTime((t) => t + 1);
          
          const st = stateRef.current;
          if (!st || !st.vitals || Object.keys(st.vitals).length === 0) return;

          // ==========================================
          // TEXTBOOK CLINICAL RULE INTERPRETER
          // ==========================================
          let ruleHrOffset = 0;
          let ruleHrScale = 1.0;
          let ruleHrClamp = undefined;
          let ruleRrOffset = 0;
          let ruleRrScale = 1.0;
          let ruleMapOffset = 0;
          let ruleMapScale = 1.0;
          let ruleSpo2Offset = 0;
          let ruleKOffset = 0;
          let ruleComplScale = 1.0;
          let rulePipOffset = 0;
          let ruleTempOffset = 0;

          const evaluateCondition = (rule, state) => {
            const cond = rule.condition.toLowerCase();
            
            if (state.patient.position && state.patient.position.toLowerCase().includes(cond)) {
              return true;
            }
            
            if (cond === 'sepsis' && state.patient.isSeptic) return true;
            if (cond === 'burn' && (state.patient.nAChR_state === 'upregulated' || state.patient.burns || state.patient.burn)) return true;
            if (cond === 'obese' && state.patient.isObese) return true;
            if (cond === 'copd' && state.patient.copd) return true;
            if (cond === 'seizure' && state.patient.isSeizure) return true;
            if (cond === 'trauma' && state.patient.trauma) return true;
            
            const med = state.activeMeds && state.activeMeds.find(m => m.name.toLowerCase() === cond);
            if (med && med.Ce > 0.01) {
              return true;
            }
            
            return false;
          };

          try {
            const activeRules = extractTextbookRules();
            for (const rule of activeRules) {
              if (evaluateCondition(rule, st)) {
                const op = rule.operator;
                const val = rule.value;
                
                if (rule.targetVital === 'hr') {
                  if (op === '+') ruleHrOffset += val;
                  else if (op === '-') ruleHrOffset -= val;
                  else if (op === 'scale') ruleHrScale *= val;
                  else if (op === 'clamp') ruleHrClamp = val;
                } else if (rule.targetVital === 'rr') {
                  if (op === '+') ruleRrOffset += val;
                  else if (op === '-') ruleRrOffset -= val;
                  else if (op === 'scale') ruleRrScale *= val;
                } else if (rule.targetVital === 'map') {
                  if (op === '+') ruleMapOffset += val;
                  else if (op === '-') ruleMapOffset -= val;
                  else if (op === 'scale') ruleMapScale *= val;
                } else if (rule.targetVital === 'spo2') {
                  if (op === '+') ruleSpo2Offset += val;
                  else if (op === '-') ruleSpo2Offset -= val;
                } else if (rule.targetVital === 'k') {
                  if (op === '+') ruleKOffset += val;
                  else if (op === '-') ruleKOffset -= val;
                } else if (rule.targetVital === 'compl') {
                  if (op === 'scale') ruleComplScale *= val;
                } else if (rule.targetVital === 'pip') {
                  if (op === '+') rulePipOffset += val;
                  else if (op === '-') rulePipOffset -= val;
                } else if (rule.targetVital === 'temp') {
                  if (op === '+') ruleTempOffset += val;
                  else if (op === '-') ruleTempOffset -= val;
                }
              }
            }
          } catch (e) {
            console.error("Error executing dynamic textbook rules:", e);
          }
          // ==========================================

          // 2. Fluidics Engine Tick
          const fluidicsOutput = FluidicsEngine.tick(1, {
            patient: st.patient,
            electrolytes: st.electrolytes,
            coags: st.coags,
            vitals: st.vitals,
            time: st.time
          });

          // Extract continuous medication rates from non-blown lines
          const lineMedicationRates = {};
          const nonBlownLines = fluidicsOutput.accessLines.filter(l => !l.failed);
          nonBlownLines.forEach(line => {
              if (line.activeMedInfusions) {
                  line.activeMedInfusions.forEach(medInf => {
                      if (medInf.rate > 0) {
                          lineMedicationRates[medInf.medId] = (lineMedicationRates[medInf.medId] || 0) + parseFloat(medInf.rate);
                      }
                  });
              }
          });

          // Log events from fluidics
          if (fluidicsOutput.events && fluidicsOutput.events.length > 0) {
              fluidicsOutput.events.forEach(evt => logEvent(evt.msg));
          }

          // Apply fluidics updates
          const patientAfterFluidics = {
              ...st.patient,
              accessLines: fluidicsOutput.accessLines,
              bloodBank: fluidicsOutput.bloodBank
          };
          
          if (fluidicsOutput.events && fluidicsOutput.events.length > 0) {
              fluidicsOutput.events.forEach(evt => {
                  patientAfterFluidics.events = [
                      ...(patientAfterFluidics.events || []),
                      { time: Date.now(), msg: evt.msg, type: evt.type }
                  ];
              });
          }

          if (fluidicsOutput.tbwDelta_L > 0) {
              setTotalBodyWaterLiters(prev => prev + fluidicsOutput.tbwDelta_L);
              setElectrolytes(fluidicsOutput.electrolytes);
              setCoags(fluidicsOutput.coags);
          }
          setIntravascularVolume(prev => prev + fluidicsOutput.intravascularVolumeAdded_mL);

          // 3. PK/PD and Gas models loops
          let currentCOForPK = Number(st.vitals.co);
          if (isNaN(currentCOForPK) || !isFinite(currentCOForPK) || currentCOForPK <= 0) {
              currentCOForPK = 5.0;
          }
          const coRatio = currentCOForPK / 5.0;

          const safeEbv = (st.patient && typeof st.patient.ebv === 'number' && Number.isFinite(st.patient.ebv) && st.patient.ebv > 0) ? st.patient.ebv : 5000;
          const safeEbl = (st.patient && typeof st.patient.ebl === 'number' && Number.isFinite(st.patient.ebl)) ? st.patient.ebl : 0;
          const safeIntravascularVolume = typeof st.intravascularVolume === 'number' && Number.isFinite(st.intravascularVolume) ? st.intravascularVolume : 0;
          const safeAdded = typeof fluidicsOutput.intravascularVolumeAdded_mL === 'number' && Number.isFinite(fluidicsOutput.intravascularVolumeAdded_mL) ? fluidicsOutput.intravascularVolumeAdded_mL : 0;
          const currentBloodVolume = Math.max(100.0, safeEbv - safeEbl + safeIntravascularVolume + safeAdded);
          const v1VolumeRatio = Math.max(0.4, Math.min(10.0, currentBloodVolume / safeEbv));

          let renalRatio = 1.0;
          if (st.patient.renalComorbidity) {
              const ren = st.patient.renalComorbidity.toLowerCase();
              if (ren.includes('stage 5') || ren.includes('dialysis')) renalRatio = 0.1;
              else if (ren.includes('stage 4')) renalRatio = 0.25;
              else if (ren.includes('stage 3')) renalRatio = 0.5;
              else if (ren.includes('stage 2')) renalRatio = 0.75;
              else if (ren.includes('aki')) renalRatio = 0.3;
          } else if (st.patient.gfr !== undefined) {
              renalRatio = Math.max(0.05, Math.min(1.0, st.patient.gfr / 100));
          }

          let hepaticRatio = 1.0;
          if (st.patient.cirrhosis || st.patient.hasCirrhosis || st.patient.liverComorbidity) {
              const cp = (st.patient.childPugh || '').toUpperCase();
              if (cp.includes('C')) hepaticRatio = 0.25;
              else if (cp.includes('B')) hepaticRatio = 0.50;
              else hepaticRatio = 0.80;
          }

          const hasMG = st.patient.hasMG || st.patient.myastheniaGravis || (st.patient.neurologicComorbidity && st.patient.neurologicComorbidity.toLowerCase().includes('myasthenia'));
          
          let totalHrDelta = 0;
          let totalRrDelta = 0;
          let drugSvrMod = 1.0;
          let drugInotropyMod = 1.0;
          let sedativeEff = 0;
          let opioidEff = 0;
          let maxNMJOccupancy = 0;

          const esmololModel = st.activeMeds?.find(m => m.name === 'Esmolol');
          const labetalolModel = st.activeMeds?.find(m => m.name === 'Labetalol');
          const metoprololModel = st.activeMeds?.find(m => m.name === 'Metoprolol');
          const dexmedModel = st.activeMeds?.find(m => m.name === 'Dexmedetomidine');
          const lidoModel = st.activeMeds?.find(m => m.name === 'Lidocaine');

          if (st.activeMeds) {
              st.activeMeds.forEach(model => {
                  const matchingId = Object.keys(MEDICATIONS).find(key => MEDICATIONS[key].name === model.name);
                  if (matchingId && lineMedicationRates[matchingId] !== undefined) {
                      model.currentInfusionRate = lineMedicationRates[matchingId];
                  }

                  const isNDMR = model.classes.includes('NDMR');
                  const pdSens = (isNDMR && hasMG) ? 4.0 : 1.0;
                  const effects = model.tick(1, coRatio, v1VolumeRatio, renalRatio, pdSens, hepaticRatio);
                  
                  totalHrDelta += effects.hrDelta || 0;
                  totalRrDelta += effects.rrDelta || 0;
                  
                  if (effects.diaDelta) {
                      const scalingFactor = model.name === 'Propofol' ? (getAnatomicalParameter("Propofol SVR drop scaling factor", 4.5) * (st.patient.chronicHTN ? 1.6 : 1.0)) : 1.0;
                      drugSvrMod *= (1.0 + ((effects.diaDelta * scalingFactor) / 120));
                  }
                  if (effects.sysDelta) {
                      const pulsePressureDelta = effects.sysDelta - (effects.diaDelta || 0);
                      drugInotropyMod *= (1.0 + (pulsePressureDelta / 100));
                  }
                  
                  if (effects.svrMultiplier !== undefined) {
                      drugSvrMod *= effects.svrMultiplier;
                  }
                  if (effects.coMultiplier !== undefined) {
                      drugInotropyMod *= effects.coMultiplier;
                  }
                  
                  if (effects.group === 'Sedative') sedativeEff = 1 - (1 - sedativeEff) * (1 - effects.hypnoticEffect);
                  if (effects.group === 'Opioid') opioidEff = 1 - (1 - opioidEff) * (1 - effects.hypnoticEffect);
                  
                  let occupancy = effects.receptorOccupancy;
                  if (model.classes.includes('NDMR')) {
                      if (st.patient.nAChR_state === 'downregulated') {
                          occupancy = Math.min(1.0, occupancy * 2.0);
                      } else if (st.patient.nAChR_state === 'upregulated') {
                          occupancy = occupancy * 0.5;
                      }
                  } else if (model.classes.includes('Depolarizing NMBA')) {
                      if (st.patient.nAChR_state === 'downregulated') {
                          occupancy = occupancy * 0.5;
                      } else if (st.patient.nAChR_state === 'upregulated') {
                          occupancy = Math.min(1.0, occupancy * 1.5);
                      }
                  }
                  if (occupancy > maxNMJOccupancy) maxNMJOccupancy = occupancy;
              });
              
              drugSvrMod = Math.max(0.55, drugSvrMod);
              drugInotropyMod = Math.max(0.50, drugInotropyMod);
          }

          const rocuroniumModel = st.activeMeds?.find(m => m.name === 'Rocuronium');
          const rocuroniumCe = rocuroniumModel ? rocuroniumModel.Ce : 0;
          const vecuroniumModel = st.activeMeds?.find(m => m.name === 'Vecuronium');
          const vecuroniumCe = vecuroniumModel ? vecuroniumModel.Ce : 0;
          const cisatracuriumModel = st.activeMeds?.find(m => m.name === 'Cisatracurium');
          const cisatracuriumCe = cisatracuriumModel ? cisatracuriumModel.Ce : 0;
          const succinylcholineModel = st.activeMeds?.find(m => m.name === 'Succinylcholine');
          const succinylcholineCe = succinylcholineModel ? succinylcholineModel.Ce : 0;

          if (rocuroniumCe > 0.15) {
              const rocOccupancy = 0.80 + Math.min(0.20, (rocuroniumCe - 0.15) * 0.5);
              if (rocOccupancy > maxNMJOccupancy) maxNMJOccupancy = rocOccupancy;
          }
          if (vecuroniumCe > 0.05) {
              const vecOccupancy = 0.80 + Math.min(0.20, (vecuroniumCe - 0.05) * 1.5);
              if (vecOccupancy > maxNMJOccupancy) maxNMJOccupancy = vecOccupancy;
          }
          if (cisatracuriumCe > 0.08) {
              const cisOccupancy = 0.80 + Math.min(0.20, (cisatracuriumCe - 0.08) * 1.0);
              if (cisOccupancy > maxNMJOccupancy) maxNMJOccupancy = cisOccupancy;
          }
          if (succinylcholineCe > 0.08) {
              const suxOccupancy = 0.80 + Math.min(0.20, (succinylcholineCe - 0.08) * 1.0);
              if (suxOccupancy > maxNMJOccupancy) maxNMJOccupancy = suxOccupancy;
          }

          // Active Metabolites
          const renalMult = (st.patient.isRenal || st.patient.renalFailure) ? 0.1 : 1.0;
          const vecCe = vecuroniumCe;
          const morModel = st.activeMeds?.find(m => m.name === 'Morphine');
          const morCe = morModel ? morModel.Ce : 0;
          const mepModel = st.activeMeds?.find(m => m.name === 'Meperidine');
          const mepCe = mepModel ? mepModel.Ce : 0;

          let currentVec3oh = st.patient.vec3oh || 0;
          let currentNormep = st.patient.normep || 0;
          let currentM6g = st.patient.m6g || 0;

          if (vecCe > 0.01) {
              currentVec3oh = Math.max(0, currentVec3oh + vecCe * 0.01 - 0.002 * renalMult);
          } else {
              currentVec3oh = Math.max(0, currentVec3oh - 0.002 * renalMult);
          }

          if (mepCe > 0.01) {
              currentNormep = Math.max(0, currentNormep + mepCe * 0.01 - 0.002 * renalMult);
          } else {
              currentNormep = Math.max(0, currentNormep - 0.002 * renalMult);
          }

          if (morCe > 0.01) {
              currentM6g = Math.max(0, currentM6g + morCe * 0.01 - 0.002 * renalMult);
          } else {
              currentM6g = Math.max(0, currentM6g - 0.002 * renalMult);
          }

          if (currentVec3oh > 0) {
              maxNMJOccupancy = Math.min(1.0, maxNMJOccupancy + (currentVec3oh * 0.8));
          }

          let isSeizure = false;
          let seizureMetabolicMultiplier = 1.0;
          if (currentNormep > 1.2) {
              isSeizure = true;
              seizureMetabolicMultiplier = 8.0;
          }

          let m6gRrDelta = 0;
          if (currentM6g > 0.8) {
              m6gRrDelta = -10;
          }

          const nipModel = st.activeMeds?.find(m => m.name === 'Nitroprusside');
          const nipCe = nipModel ? nipModel.Ce : 0;
          let currentCyanide = st.patient.cyanide || 0;
          if (nipCe > 1.5) {
              currentCyanide = Math.min(1.0, currentCyanide + nipCe * 0.002);
          } else {
              currentCyanide = Math.max(0, currentCyanide - 0.005);
          }

          let cyanideVO2Mod = 1.0;
          if (currentCyanide > 0.01) {
              cyanideVO2Mod = Math.max(0.1, 1 - currentCyanide * 2.0);
          }

          // Lactic Acid modeling (anaerobic metabolism during shock, arrest, or sepsis)
          const baselineLactate = st.patient.isSeptic ? 4.5 : 1.0;
          let currentLactate = st.patient.lacticAcid || baselineLactate;
          
          if (st.patient.isArrest) {
              if (st.patient.cprActive) {
                  // CPR provides low-flow perfusion, slowing lactate accumulation
                  currentLactate += 0.01;
              } else {
                  // No flow in arrest causes rapid anaerobic conversion
                  currentLactate += 0.05;
              }
          } else if (coRatio < 0.8) {
              // Shock-induced hypoperfusion converts to anaerobic glycolysis
              const deficit = 0.8 - coRatio;
              currentLactate += deficit * 0.02;
          } else {
              // Normal perfusion allows hepatic/renal lactate clearance towards baseline
              currentLactate -= (currentLactate - baselineLactate) * 0.005;
          }
          currentLactate = Math.max(0.5, Math.min(25.0, currentLactate));

          // Bleed rates & Haemoglobin dilution
          const baseHb = st.patient.trauma ? 11.2 : 14.5;
          let activeBleedRate = 0;
          if (st.patient.trauma) {
              activeBleedRate = st.patient.bleedRate !== undefined ? st.patient.bleedRate : 1.5;
          } else if (st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance') {
              activeBleedRate = st.patient.bleedRate !== undefined ? st.patient.bleedRate : 0.05;
          }
          const safeCurrentEbl = typeof st.patient.ebl === 'number' && Number.isFinite(st.patient.ebl) ? st.patient.ebl : 0;
          const currentEbl = safeCurrentEbl + activeBleedRate;
          let bloodLossRatio = currentEbl / safeEbv;
          if (isNaN(bloodLossRatio) || !Number.isFinite(bloodLossRatio)) {
              bloodLossRatio = 0.05;
          }
          bloodLossRatio = Math.max(0, Math.min(0.95, bloodLossRatio));

          const safeVolumeAdded = typeof fluidicsOutput.intravascularVolumeAdded_mL === 'number' && Number.isFinite(fluidicsOutput.intravascularVolumeAdded_mL) ? fluidicsOutput.intravascularVolumeAdded_mL : 0;
          
          let calculatedHb = (baseHb * (1 - bloodLossRatio)) - (((safeIntravascularVolume + safeVolumeAdded) / safeEbv) * 3.0);
          if (isNaN(calculatedHb) || !Number.isFinite(calculatedHb)) {
              calculatedHb = 12.0;
          }
          const currentHb = Math.max(3.0, Math.min(25.0, calculatedHb));

          // Gas kinetics
          let brainMac = 0;
          let displayedMac = 0;
          let currentEtAgent = 0;
          let currentEtN2O = 0;
          let deliveredFiO2 = 21;
          let n2oPercent = 0;
          let freshGasFlow = 2.0; // default 2 L/min

          if (st.gasSettings && st.patient.airwaySecured) {
              const o2F = typeof st.gasSettings.o2Flow === 'number' && Number.isFinite(st.gasSettings.o2Flow) ? st.gasSettings.o2Flow : 0;
              const airF = typeof st.gasSettings.airFlow === 'number' && Number.isFinite(st.gasSettings.airFlow) ? st.gasSettings.airFlow : 0;
              const n2oF = typeof st.gasSettings.n2oFlow === 'number' && Number.isFinite(st.gasSettings.n2oFlow) ? st.gasSettings.n2oFlow : 0;
              const totalFGF = o2F + airF + n2oF;
              if (Number.isFinite(totalFGF) && totalFGF > 0.001) {
                  deliveredFiO2 = ((o2F * 100) + (airF * 21)) / totalFGF;
                  n2oPercent = (n2oF / totalFGF) * 100;
                  freshGasFlow = totalFGF;
              }
              if (isNaN(deliveredFiO2) || !Number.isFinite(deliveredFiO2)) deliveredFiO2 = 21;
              if (isNaN(n2oPercent) || !Number.isFinite(n2oPercent)) n2oPercent = 0;
          } else if (st.gasSettings) {
              const o2F = typeof st.gasSettings.o2Flow === 'number' && Number.isFinite(st.gasSettings.o2Flow) ? st.gasSettings.o2Flow : 0;
              const airF = typeof st.gasSettings.airFlow === 'number' && Number.isFinite(st.gasSettings.airFlow) ? st.gasSettings.airFlow : 0;
              const n2oF = typeof st.gasSettings.n2oFlow === 'number' && Number.isFinite(st.gasSettings.n2oFlow) ? st.gasSettings.n2oFlow : 0;
              const total = o2F + airF + n2oF;
              if (Number.isFinite(total) && total > 0.001) {
                  freshGasFlow = total;
              }
          }

          if (st.gasModels && Object.keys(st.gasModels).length > 0) {
              const isParalyzed = maxNMJOccupancy > 0.90;
              const isApneic = isParalyzed || (st.vitals.rr !== undefined ? st.vitals.rr < 1 : false);
              const effectiveMv = st.patient.airwaySecured ? (st.vitals.mv || 0) : (isApneic ? 0 : 6.0);
              const currentFRC = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0);

              Object.keys(st.gasModels).forEach(key => {
                  const model = st.gasModels[key];
                  const agentData = INHALATIONAL_AGENTS[key];
                  if (key !== 'n2o' && agentData) {
                      if (st.gasSettings && st.gasSettings.agent === key && st.patient.airwaySecured) model.setDial(st.gasSettings.dial || 0);
                      else model.setDial(0);
                      
                      const gasState = model.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction, freshGasFlow);
                      if (gasState.Fa > 0.01) {
                          currentEtAgent = gasState.Fa;
                          
                          let macModifier = 1.0;
                          if (st.vitals.temp < 36.0) macModifier -= (36.0 - st.vitals.temp) * 0.05;
                          if (st.patient.isSeptic) macModifier -= 0.1;
                          if (currentHb < 5.0) macModifier -= 0.1;
                          macModifier = Math.max(0.4, macModifier);
                          
                          const safeAdjMac = Math.max(0.01, calculateAgeAdjustedMAC(agentData.mac40, st.patient.age || 40) * macModifier);
                          
                          displayedMac += gasState.Fa / safeAdjMac;
                          const brainMacContribution = gasState.Fb / safeAdjMac;
                          brainMac += brainMacContribution;
                          
                          sedativeEff = 1 - (1 - sedativeEff) * (1 - Math.min(1, brainMacContribution));
                          drugSvrMod = drugSvrMod * (1 - (brainMacContribution * 0.15));
                      }
                  }
              });

              if (st.gasModels.n2o && INHALATIONAL_AGENTS.n2o) {
                  st.gasModels.n2o.setDial(st.patient.airwaySecured ? n2oPercent : 0);
                  const n2oState = st.gasModels.n2o.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction, freshGasFlow);
                  currentEtN2O = n2oState.Fa;
                  const n2oAdjMac = Math.max(0.01, calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.n2o.mac40, st.patient.age || 40));
                  displayedMac += (n2oState.Fa / n2oAdjMac);
                  brainMac += (n2oState.Fb / n2oAdjMac);
              }
          }

          const currentMac = brainMac;

          // Thermoregulation & metabolic multi
          let tempDropRate = 0.0001;
          if (currentMac > 0.5 && st.time < 1800) {
              tempDropRate = 0.0008;
          }
          let newTemp = (st.vitals.temp || 37.0) - tempDropRate + (fluidicsOutput.fluidInducedTempDrop || 0);
          if (st.patient.cprActive) newTemp -= 0.002;
          newTemp += ruleTempOffset;

          let shiveringMultiplier = 1.0;
          if (newTemp < 35.5 && currentMac < 0.2 && maxNMJOccupancy < 0.5 && st.surgicalPhase === 'Emergence') {
              shiveringMultiplier = Math.min(5.0, 1.0 + ((35.5 - newTemp) * 2.5));
          }
          if (st.patient.serotoninSyndromeTriggered) {
              newTemp += 0.05;
          }

          const totalMetabolicMultiplier = shiveringMultiplier * seizureMetabolicMultiplier;
          const VO2_sec = (0.250 * totalMetabolicMultiplier * cyanideVO2Mod) / 60;
          // eslint-disable-next-line no-unused-vars
          const VCO2_sec = (0.200 * totalMetabolicMultiplier) / 60;
          const opioidRRDrop = opioidEff * 10;

          // Pain Engine Tick
          if (st.surgicalPhase === 'Incision' && st.patient.incisionStartTime === undefined) {
              st.patient.incisionStartTime = st.time;
          }

          const painOutput = PainEngine.tick(1, st.patient, st.vitals, st.activeMeds, currentMac, st.time);
          
          // Log bucking/movement events
          if (painOutput.somaticResponse.event && (!st.patient.lastPainEventTime || st.time - st.patient.lastPainEventTime >= 8)) {
              logEvent(painOutput.somaticResponse.event);
              st.patient.lastPainEventTime = st.time;
          }

          // Spasm Logic & Resolution
          let finalLaryngospasm = st.patient.laryngospasm || false;
          let finalBronchospasm = st.patient.bronchospasm || false;

          if (painOutput.somaticResponse.triggerLaryngospasm) {
              finalLaryngospasm = true;
              logEvent("🚨 CRITICAL ALERT: Laryngospasm triggered due to airway manipulation under inadequate anesthesia! Airway resistance is now infinite.");
          }
          if (painOutput.somaticResponse.triggerBronchospasm) {
              finalBronchospasm = true;
              logEvent("🚨 CRITICAL ALERT: Bronchospasm triggered due to airway manipulation/pain under inadequate anesthesia! Compliance is halved and resistance is elevated.");
          }

          // Spasm Resolution
          if (finalLaryngospasm && (maxNMJOccupancy > 0.90 || currentMac > 1.2)) {
              finalLaryngospasm = false;
              logEvent("✅ SUCCESS: Laryngospasm resolved (deep anesthesia or muscle relaxation achieved).");
          }
          const epiModelForSpasm = st.activeMeds?.find(m => m.name === 'Epinephrine');
          const epiActive = epiModelForSpasm ? epiModelForSpasm.Ce > 0.01 : false;
          if (finalBronchospasm && (currentMac > 1.2 || epiActive)) {
              finalBronchospasm = false;
              logEvent("✅ SUCCESS: Bronchospasm resolved (bronchodilation achieved via deep anesthesia or Epinephrine).");
          }

          // Propagating updated states to patient objects for subsequent calculations in this tick
          st.patient.C_cat = painOutput.C_cat;
          st.patient.MAP_set = painOutput.MAP_set;
          st.patient.laryngospasm = finalLaryngospasm;
          st.patient.bronchospasm = finalBronchospasm;
          st.patient.isBucking = painOutput.somaticResponse.isBucking;

          patientAfterFluidics.C_cat = painOutput.C_cat;
          patientAfterFluidics.MAP_set = painOutput.MAP_set;
          patientAfterFluidics.laryngospasm = finalLaryngospasm;
          patientAfterFluidics.bronchospasm = finalBronchospasm;
          patientAfterFluidics.isBucking = painOutput.somaticResponse.isBucking;

          const aggregateHypnosis = sedativeEff + opioidEff - (sedativeEff * opioidEff);
          const hrSympatheticSpike = painOutput.hrSpike;
          const contractilitySympatheticSpike = painOutput.contractilitySpike;
          const svrSympatheticSpike = painOutput.svrSpike;

          // Anaphylaxis triggers
          const unasynModel = st.activeMeds?.find(m => m.name === 'Ampicillin/Sulbactam');
          const unasynCe = unasynModel ? unasynModel.Ce : 0;
          let anaphylaxisTriggered = st.patient.anaphylaxisTriggered || false;
          let anaphylaxisSvrMod = 1.0;
          let anaphylaxisCompliancePenalty = 0;
          let anaphylaxisResistancePenalty = 0;
          let anaphylaxisHrMod = 0;

          if (unasynCe > 0.05 && (st.patient.penicillinAllergy || (st.patient.allergies && st.patient.allergies.toLowerCase().includes('penicillin'))) && !anaphylaxisTriggered) {
              anaphylaxisTriggered = true;
              st.patient.anaphylaxisTriggered = true;
              st.patient.anaphylaxisTime = st.time;
              logEvent(`🚨 CRITICAL EMERGENCY: Penicillin-containing Ampicillin/Sulbactam administered to a patient with severe Penicillin Allergy! Triggered hyperacute IgE-mediated anaphylactic shock! (Profound vasoplegic hypotension, severe bronchospasm, extreme airway resistance).`);
          }

          if (st.patient.anaphylaxisTriggered) {
              const startTime = st.patient.anaphylaxisTime || st.time;
              const dt_anaph = st.time - startTime;
              anaphylaxisSvrMod = 0.25 + 0.75 * Math.exp(-0.05 * dt_anaph);
              anaphylaxisCompliancePenalty = Math.min(45, 45 * (1 - Math.exp(-0.08 * dt_anaph)));
              anaphylaxisResistancePenalty = Math.min(45, 45 * (1 - Math.exp(-0.08 * dt_anaph)));
              anaphylaxisHrMod = Math.min(40, 40 * (1 - Math.exp(-0.08 * dt_anaph)));
              
              const epiModel = st.activeMeds?.find(m => m.name === 'Epinephrine');
              const epiCe = epiModel ? epiModel.Ce : 0;
              if (epiCe > 0.01) {
                  const recovery = Math.min(1.0, epiCe * 12);
                  anaphylaxisSvrMod = anaphylaxisSvrMod + (1.0 - anaphylaxisSvrMod) * recovery;
                  anaphylaxisCompliancePenalty *= (1 - recovery);
                  anaphylaxisResistancePenalty *= (1 - recovery);
                  anaphylaxisHrMod *= (1 - recovery);
                  if (recovery > 0.8 && !st.patient.anaphylaxisTreated) {
                      logEvent(`✅ SUCCESS: Epinephrine administered! Vasomotor tone restored and bronchospasm reversed in treating anaphylactic shock.`);
                      st.patient.anaphylaxisTreated = true;
                  }
              }
          }

          // Gastric Aspiration triggers
          let hasAspirated = st.patient.hasAspirated || false;
          let aspirationCompliancePenalty = 0;
          let aspirationResistancePenalty = 0;
          
          if (!st.patient.airwaySecured && st.patient.stomach === 'full') {
              const isVentilatingPPV = st.patient.ventilationStatus === 'mechanical' || (st.ventSettings && st.ventSettings.mode !== 'spontaneous') || (st.vitals.pip && st.vitals.pip > 15);
              if (isVentilatingPPV && !hasAspirated) {
                  hasAspirated = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Positive Pressure Ventilation delivered on a full stomach without a secured airway! Mass aspiration of acidic gastric contents occurred, causing chemical pneumonitis and severe bronchospasm!`);
              }
          }
          
          if (hasAspirated) {
              let complPenalty = 30;
              let resPenalty = 25;
              if (st.patient.isSuctioned && st.patient.position === 'Trendelenburg') {
                  complPenalty = 10;
                  resPenalty = 8;
                  if (!st.patient.aspirationMitigated) {
                      logEvent(`✅ SUCCESS: Airway suctioned in Trendelenburg position! Acidic aspirate cleared, reducing bronchospastic and compliance penalties.`);
                      st.patient.aspirationMitigated = true;
                  }
              }
              aspirationCompliancePenalty = complPenalty;
              aspirationResistancePenalty = resPenalty;
          }

          // Position modifiers
          let positionPreloadMod = 0;
          let positionHydrostaticMod = 0; 
          const pos = st.patient.position || 'Supine';
          if (pos === 'Ramped' || pos === 'Rev Trendelenburg') {
              positionPreloadMod = -200; positionHydrostaticMod = -14.8; 
          } else if (pos === 'Sitting' || pos === 'Beach Chair') {
              positionPreloadMod = -400; positionHydrostaticMod = -29.6; 
          } else if (pos === 'Trendelenburg') {
              positionPreloadMod = 300; positionHydrostaticMod = +14.8; 
          } else if (pos === 'Lithotomy') {
              positionPreloadMod = 400; 
          } else if (pos === 'Prone') {
              positionPreloadMod = -100; 
          }

          // 4. RespiratoryEngine Tick
          const safePaCO2 = st.vitals.paco2 || 40;
          const safePaO2 = st.vitals.pao2 || 100;
          const safeSys = st.vitals.sys || 120;
          let compensatoryRR = 0;
          if (safePaCO2 > 45) compensatoryRR += (safePaCO2 - 45) * 0.8; 
          if (safePaO2 < 70) compensatoryRR += (70 - safePaO2) * 0.4;   
          if (safeSys < 90) compensatoryRR += 6; 

          const actualBaseDeficit = (st.patient.isSeptic ? 8 : 0) + (bloodLossRatio * 20) + (currentLactate - 1.0);
          const hco3 = Math.max(8, 24 - actualBaseDeficit);
          const baselinePaCO2 = st.patient.copd ? 55 : (st.patient.isObese ? 48 : 40);

          const respOutput = RespiratoryEngine.tick(1, {
              patient: {
                  ...patientAfterFluidics,
                  isApneic: st.patient.isApneic,
                  isParalyzed: st.patient.isParalyzed
              },
              vitals: {
                  ...st.vitals,
                  temp: newTemp
              },
              time: st.time
          }, st.ventSettings, deliveredFiO2, {
              maxNMJOccupancy,
              totalRrDelta,
              ruleRrScale,
              ruleRrOffset: ruleRrOffset + painOutput.rrSpike,
              ruleComplScale: ruleComplScale * painOutput.somaticResponse.complianceMultiplier,
              rulePipOffset: rulePipOffset + painOutput.somaticResponse.pipOffset,
              ruleSpo2Offset,
              ruleKOffset
          }, {
              VO2_sec,
              totalMetabolicMultiplier,
              compensatoryRR,
              opioidRRDrop,
              m6gRrDelta,
              shiveringRRDrive: (shiveringMultiplier > 1.5) ? (shiveringMultiplier * 4) : 0,
              currentHb,
              targetMAP: st.vitals.map,
              targetCO: currentCOForPK,
              hco3,
              volatileRightShift: currentMac * 0.05,
              dpgDepletionShift: Math.min(0.15, ((st.intravascularVolume + fluidicsOutput.intravascularVolumeAdded_mL) / 5000) * 0.1),
              baselinePaCO2,
              anaphylaxisCompliancePenalty,
              anaphylaxisResistancePenalty,
              aspirationCompliancePenalty,
              aspirationResistancePenalty
          });

          // 5. CardiovascularEngine Tick
          const cvOutput = CardiovascularEngine.tick(1, {
              patient: {
                  ...patientAfterFluidics,
                  intravascularVolume: safeIntravascularVolume + safeAdded,
                  hasAspirated,
                  anaphylaxisTriggered,
                  anaphylaxisTreated: st.patient.anaphylaxisTreated,
                  myocardialStunning: st.patient.myocardialStunning || 0,
                  vec3oh: currentVec3oh,
                  normep: currentNormep,
                  m6g: currentM6g,
                  cyanide: currentCyanide,
                  lacticAcid: currentLactate,
                  temp: newTemp
              },
              vitals: {
                  ...respOutput.vitals,
                  co: st.vitals.co || 5.0,
                  svr: st.vitals.svr || 1200
              },
              electrolytes: fluidicsOutput.electrolytes,
              time: st.time
          }, {
              drugSvrMod,
              drugInotropyMod,
              svrSympatheticSpike,
              contractilitySympatheticSpike,
              hrSympatheticSpike,
              shiveringHRDrive: (shiveringMultiplier > 1.0) ? ((shiveringMultiplier - 1.0) * 15) : 0,
              anaphylaxisHrMod,
              anaphylaxisSvrMod,
              totalHrDelta,
              ruleHrScale,
              ruleHrOffset: ruleHrOffset,
              ruleHrClamp,
              ruleMapScale,
              ruleMapOffset: ruleMapOffset,
              ruleKOffset,
              ruleSpo2Offset
          }, {
              currentMac,
              bloodLossRatio,
              currentEbl,
              positionPreloadMod,
              positionHydrostaticMod,
              shiveringMultiplier,
              seizureMetabolicMultiplier,
              cyanideVO2Mod,
              VO2_sec,
              currentBuffer: respOutput.oxygenBuffer,
              currentFRC_L: respOutput.lungVolumes.frc_L,
              newTemp,
              newPaCO2: respOutput.newPaCO2,
              activeMeds: st.activeMeds || [],
              getAnatomicalParameter
          });

          // Log CV events
          if (cvOutput.events && cvOutput.events.length > 0) {
              cvOutput.events.forEach(evt => logEvent(evt));
          }

          // 6. Post-Tick calculations
          const finalPatient = {
              ...patientAfterFluidics,
              ...cvOutput.patient,
              oxygenBuffer: respOutput.oxygenBuffer,
              isApneic: respOutput.isApneic,
              isParalyzed: respOutput.isParalyzed,
              lungVolumes: respOutput.lungVolumes,
              isSeizure: isSeizure
          };

          const finalVitals = {
              ...cvOutput.vitals,
              spo2: respOutput.vitals.spo2,
              etco2: respOutput.vitals.etco2,
              rr: respOutput.vitals.rr,
              pip: respOutput.vitals.pip,
              pplat: respOutput.vitals.pplat,
              vte: respOutput.vitals.vte,
              pmean: respOutput.vitals.pmean,
              mv: respOutput.vitals.mv,
              peep: respOutput.vitals.peep,
              ph: respOutput.newPh,
              paco2: respOutput.newPaCO2,
              pao2: respOutput.vitals.pao2,
              compl: Math.round(respOutput.compliance),
              res: Math.round(respOutput.resistance),
              cao2: respOutput.vitals.cao2,
              cvo2: respOutput.vitals.cvo2,
              temp: newTemp,
              etAgent: currentEtAgent,
              etN2O: currentEtN2O,
              mac: displayedMac
          };

          // Apply natural wave-like fluctuations in non-arrest states
          if (!finalPatient.isArrest && finalVitals.hr > 0 && finalPatient.cardiacRhythm !== 'asystole') {
              const hrOsc = Math.sin(st.time * 0.1) * 0.8 + Math.cos(st.time * 0.03) * 0.4;
              finalVitals.hr = Math.round(finalVitals.hr + hrOsc);

              const bpOsc = Math.sin(st.time * 0.07) * 1.5 + Math.cos(st.time * 0.02) * 1.0;
              if (finalVitals.sys > 0) finalVitals.sys = Math.round(finalVitals.sys + bpOsc);
              if (finalVitals.dia > 0) finalVitals.dia = Math.round(finalVitals.dia + bpOsc);
              if (finalVitals.map > 0) finalVitals.map = Math.round(finalVitals.map + bpOsc);
              if (finalVitals.cmap > 0) finalVitals.cmap = Math.round(finalVitals.cmap + bpOsc);

              if (finalVitals.rr > 0 && finalPatient.ventilationStatus === 'spontaneous') {
                  const rrOsc = Math.sin(st.time * 0.05) * 0.5;
                  finalVitals.rr = Math.round(finalVitals.rr + rrOsc);
              }

              if (finalVitals.spo2 > 50 && finalVitals.spo2 <= 100) {
                  const spo2Osc = Math.sin(st.time * 0.04) * 0.3;
                  finalVitals.spo2 = Math.round(Math.max(0, Math.min(100, finalVitals.spo2 + spo2Osc)));
              }
          }

          const burstSuppression = Math.max(0, (currentMac - 1.5) * 40);
          let targetBis = 98 - (aggregateHypnosis * 55) - burstSuppression;
          if (finalVitals.cmap < 50) {
              const ischemicSlowing = (50 - finalVitals.cmap) * 1.5;
              targetBis -= ischemicSlowing;
          }
          let finalBis = Math.max(0, Math.min(98, targetBis + painOutput.bisSpike));
          if (finalPatient.isArrest) {
              finalBis = finalPatient.biologicalDeath ? 0 : Math.max(0, (st.vitals.bis || 98) - 5);
          }

          let t1 = 1.0; let t4 = 1.0;
          if (maxNMJOccupancy > 0.70) {
              t1 = Math.max(0, 1 - Math.pow((maxNMJOccupancy - 0.70) / 0.30, 2));
              t4 = Math.max(0, 1 - Math.pow((maxNMJOccupancy - 0.60) / 0.35, 2.5));
          }
          let targetTofCount = 4;
          if (maxNMJOccupancy >= 0.95) {
              targetTofCount = 0;
          } else if (maxNMJOccupancy >= 0.90) {
              targetTofCount = 1;
          } else if (maxNMJOccupancy >= 0.85) {
              targetTofCount = 2;
          } else if (maxNMJOccupancy >= 0.75) {
              targetTofCount = 3;
          } else {
              targetTofCount = 4;
          }
          
          let targetTofRatio = (targetTofCount === 4 && t1 > 0.001) ? (t4 / t1) : 0.0;
          if (isNaN(targetTofRatio) || targetTofRatio < 0) targetTofRatio = 0;
          targetTofRatio = Math.min(1.0, targetTofRatio);

          if (finalPatient.airwaySecured && st.surgicalPhase === 'Induction') {
              setSurgicalPhase('Maintenance');
              logEvent(`➡️ Airway Secured. Surgical Timeline Auto-Advanced: MAINTENANCE phase initiated.`);
          }

          // Update final states
          setPatient(finalPatient);
          setActiveMeds([...st.activeMeds]);
          setVitals({
              ...finalVitals,
              bis: Math.round(finalBis),
              tofCount: targetTofCount,
              tofRatio: targetTofRatio
          });

        } catch (error) {
          console.error("Physics Engine Tick Failed: ", error);
        }
      }, typeof patient?.simulationSpeed === 'number' && Number.isFinite(patient.simulationSpeed) ? Math.max(50, Math.min(5000, patient.simulationSpeed)) : 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused, patient?.simulationSpeed, patient?.isFuzzing]); 

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
        time: snap.time,
        vitals: snap.vitals,
        targetVitals: snap.targetVitals,
        patient: snap.patient,
        activeMeds: snap.activeMeds,
        gasModels: snap.gasModels,
        intravascularVolume: snap.intravascularVolume,
        totalBodyWaterLiters: snap.totalBodyWaterLiters,
        electrolytes: snap.electrolytes,
        coags: snap.coags,
        ventSettings,
        gasSettings,
        surgicalPhase: snap.surgicalPhase,
        msmaidsComplete
    };
  };

  return { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid, updateFluidRate, removeFluid, activeMeds, intravascularVolume, electrolytes, coags, deliverShock, toggleCPR, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot };
}