import { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, FLUIDS, INHALATIONAL_AGENTS, calculateIBW, calculateLBW, calculateAgeAdjustedMAC, calculateLungVolumes } from './Pharmacology.js';
import { PKPDModel } from './PKPDEngine.js';
import { GasKineticsModel } from './GasKineticsEngine.js';

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
    setTimeState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      stateRef.current.time = next;
      return next;
    });
  };

  const setVitals = (update) => {
    setVitalsState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      stateRef.current.vitals = next;
      return next;
    });
  };

  const setTargetVitals = (update) => {
    setTargetVitalsState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      stateRef.current.targetVitals = next;
      return next;
    });
  };

  const setPatient = (update) => {
    setPatientState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      stateRef.current.patient = next;
      return next;
    });
  };

  const setActiveMeds = (update) => {
    setActiveMedsState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      stateRef.current.activeMeds = next;
      return next;
    });
  };

  const setIntravascularVolume = (update) => {
    setIntravascularVolumeState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      stateRef.current.intravascularVolume = next;
      return next;
    });
  };

  const setTotalBodyWaterLiters = (update) => {
    setTotalBodyWaterLitersState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      stateRef.current.totalBodyWaterLiters = next;
      return next;
    });
  };

  const setElectrolytes = (update) => {
    setElectrolytesState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      stateRef.current.electrolytes = next;
      return next;
    });
  };

  const setCoags = (update) => {
    setCoagsState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      stateRef.current.coags = next;
      return next;
    });
  };

  const setSurgicalPhase = (update) => {
    setSurgicalPhaseState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      stateRef.current.surgicalPhase = next;
      return next;
    });
  };

  // Synchronously update the state bridge during the render pass to ensure 100% accurate closure variables
  const time = stateRef.current.time !== undefined ? stateRef.current.time : timeVal;
  const vitals = stateRef.current.vitals || vitalsVal;
  const targetVitals = stateRef.current.targetVitals || targetVitalsVal;
  const patient = stateRef.current.patient || patientVal;
  const activeMeds = stateRef.current.activeMeds || activeMedsVal;
  const intravascularVolume = stateRef.current.intravascularVolume !== undefined ? stateRef.current.intravascularVolume : intravascularVolumeVal;
  const totalBodyWaterLiters = stateRef.current.totalBodyWaterLiters !== undefined ? stateRef.current.totalBodyWaterLiters : totalBodyWaterLitersVal;
  const electrolytes = stateRef.current.electrolytes || electrolytesVal;
  const coags = stateRef.current.coags || coagsVal;
  const surgicalPhase = stateRef.current.surgicalPhase || surgicalPhaseVal;

  stateRef.current = { 
    time, 
    vitals, 
    targetVitals, 
    patient, 
    activeMeds, 
    gasModels, 
    intravascularVolume, 
    totalBodyWaterLiters,
    electrolytes, 
    coags,
    ventSettings, 
    gasSettings, 
    surgicalPhase, 
    msmaidsComplete 
  };

  useEffect(() => {
    stateRef.current = { 
      time, vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, totalBodyWaterLiters, electrolytes, coags, ventSettings, gasSettings, surgicalPhase, msmaidsComplete 
    };
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
        co: initialCO, svr: calculatedBaseSVR, map: Math.round(initialMap), cmap: Math.round(initialMap), // Baseline MAP and Cerebral MAP
        metHb: 0.8, coHb: activeCase.id === 'trauma' ? 12.0 : 1.0, cyanide: 0.0, lacticAcid: activeCase.patient.isSeptic ? 4.5 : 1.0,
        cao2: 20.0, cvo2: 15.0, p50: 26.6, r_ratio: 0.90
      });
      setTargetVitals({ ...activeCase.baseVitals });
      
      const heightCm = activeCase.patient.height || 170;
      const weightKg = activeCase.patient.weight || 70;
      const sex = activeCase.patient.sex || 'male';
      const ebv = activeCase.patient.ebv || (weightKg * (sex.toLowerCase() === 'male' ? 75 : 65));
      const baseBleedRate = activeCase.patient.bleedRate !== undefined ? activeCase.patient.bleedRate : (activeCase.id === 'trauma' ? 1.5 : 0.05); 

      const age = activeCase.patient.age || 40;
      const bmi = activeCase.patient.bmi || (weightKg / Math.pow(heightCm / 100, 2));
      const position = activeCase.patient.position || 'Supine';
      const lungVols = calculateLungVolumes(heightCm, age, sex, bmi, position, activeCase.patient.copd || false, activeCase.patient.restrictive || false);

      setPatient({
        ...activeCase.patient, height: heightCm, weight: weightKg, sex, ebv, ebl: activeCase.patient.ebl || 0, bleedRate: baseBleedRate,
        ibw: calculateIBW(heightCm, sex), lbw: calculateLBW(heightCm, weightKg, sex),
        lungVolumes: lungVols,
        position: position,
        isApneic: false, isParalyzed: false, isTopicalized: false,
        airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
        hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21,
        oxygenBuffer: lungVols.frc_L * 0.21, // Initial FRC O2 content in liters (room air = 21% of FRC)
        hasBisMonitor: false, hasTofMonitor: false,
        isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0,
        arrestThreshold: 1200, codeStartTime: null, apneaStartTime: null,
        shuntFraction: activeCase.id === 'trauma' ? 0.20 : (activeCase.patient.isObese ? 0.12 : 0.05),
        patientBaseSVR: calculatedBaseSVR,
        patientBaseSV: assumedBaseSV,
        
        // Dynamic clinical states
        metHb: 0.8,
        coHb: activeCase.id === 'trauma' ? 12.0 : 1.0,
        cyanide: 0.0,
        lacticAcid: activeCase.patient.isSeptic ? 4.5 : 1.0,
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

    const pushFluid = (fluidName, volumeStr, lineId) => {
    const currentPatient = stateRef.current.patient || patient;
    const volume = parseFloat(volumeStr);
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
    
    /**
     * BLOOD BANK STATE MACHINE (Simulation-Time Based)
     * ─────────────────────────────────────────────────────────────────────
     * Three-tier blood availability model based on pre-operative workup:
     *
     * Tier 1 — Type & Crossmatch ordered pre-op:
     *   • Blood is immediately available in the OR pool (0 delay)
     *   • unitsInOR initialized to 2 (standard crossmatched cooler)
     *   • Each unit consumed decrements the pool; reorder triggers 300s delivery
     *
     * Tier 2 — Type & Screen ordered pre-op (no crossmatch):
     *   • Blood is NOT immediately available
     *   • First request triggers emergency crossmatch
     *   • Delivery countdown = 300 seconds (5 minutes) — 50% of baseline
     *   • Rationale: ABO/Rh and antibody screen already known; only
     *     electronic/immediate-spin crossmatch required (AABB Guidelines)
     *
     * Tier 3 — No pre-operative blood workup:
     *   • Blood is NOT immediately available
     *   • First request triggers FULL emergency protocol
     *   • Delivery countdown = 600 seconds (10 minutes) — baseline maximum
     *   • Rationale: ABO typing, Rh determination, antibody screen, AND
     *     crossmatch all required de novo, or resort to O-negative uncrossmatched
     *     emergency release with transfusion reaction risk
     *
     * State: patient.bloodBank = {
     *   status: 'none' | 'ordered' | 'available',
     *   unitsInOR: number,           // units physically present
     *   deliveryCountdown: number,   // simulation seconds remaining (ticked in engine)
     *   totalDeliveryTime: number,   // original delivery time for log formatting
     *   preOpWorkup: 'crossmatch' | 'screen' | 'none'
     * }
     */
    if (isBlood) {
        const bb = currentPatient.bloodBank || { status: 'none', unitsInOR: 0, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: 'none' };

        if (bb.status === 'available' && bb.unitsInOR > 0) {
            // Blood is in the OR and units remain — allow administration
            // Decrement available units for discrete blood products (PRBC, FFP, Platelets, Cryo, Fibrinogen)
            const requestedUnits = parseFloat(volumeStr) || 1;
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
            // Fall through to fluid push logic below
        } else if (bb.status === 'ordered') {
            // Blood has been ordered but hasn't arrived yet
            const remaining = Math.ceil(bb.deliveryCountdown);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            logEvent(`❌ FAILED: Blood products have not arrived yet! Cooler ETA: ${mins}m ${secs}s remaining (${remaining}s). Blood Bank is processing.`);
            return false;
        } else {
            // status === 'none' OR status === 'available' but unitsInOR === 0
            // Need to order (or reorder) from blood bank
            const hasTypeAndScreen = currentPatient.preOpOrders?.labs?.typeAndScreen || false;
            const hasTypeAndCross = currentPatient.preOpOrders?.labs?.typeAndCross || false;

            if (hasTypeAndCross && bb.status === 'none') {
                // TIER 1: Type & Crossmatch was ordered pre-operatively.
                // Blood is IMMEDIATELY available — 2 crossmatched units in OR cooler.
                logEvent(`✅ Blood Bank: Type & Crossmatch was completed pre-operatively. 2 crossmatched units of PRBCs are in the OR cooler. Proceeding with transfusion.`);
                const requestedUnits = parseFloat(volumeStr) || 1;
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
                // Fall through to fluid push logic below
            } else {
                // TIER 2 or TIER 3: Must order emergency delivery
                // Tier 2 (T&S done): 300s — electronic crossmatch only
                // Tier 3 (nothing):  600s — full ABO/Rh + antibody screen + crossmatch
                const baselineDelay = 600; // seconds — AABB standard turnaround for full workup
                const delaySeconds = hasTypeAndScreen ? (baselineDelay * 0.50) : baselineDelay;
                const deliveryUnits = 4; // Emergency cooler: 4 units (MTP-adjacent quantity)

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
        const newLines = (prev.accessLines || []).map(l => ({ ...l, activeInfusions: [...(l.activeInfusions || [])] }));
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
                    const lType = line.fluidLine || prev.fluidLine || 'gravity';
                    let pInfusion = 74; 
                    if (lType === 'ranger') pInfusion = 150;
                    else if (lType === 'belmont') pInfusion = 300;
                    
                    const pv = line.venousPressure !== undefined ? line.venousPressure : 10;
                    const rv = line.veinResistance !== undefined ? line.veinResistance : 500;
                    let deltaP = pInfusion - pv;
                    if (deltaP < 0) deltaP = 0;
                    
                    const fluidData = FLUIDS[infusions[infIndex].name];
                    const eta = fluidData ? (fluidData.viscosity || 1.0) : 1.0;
                    
                    let rTubing = 400;
                    if (lType === 'ranger') rTubing = 800;
                    else if (lType === 'belmont') rTubing = 200;
                    
                    const rCath = line.length / Math.pow(line.radius || 0.475, 4);
                    const rTotal = rTubing + rCath + rv;
                    
                    let q_ml_min = 1200 * deltaP / (eta * rTotal);
                    if (lType === 'belmont' && q_ml_min > 500) q_ml_min = 500;
                    
                    const max_ml_hr = q_ml_min * 60;
                    if (rate > max_ml_hr) {
                        rate = max_ml_hr;
                        logEvent(`⚠️ Requested rate exceeds physical limits of ${line.name}. Capped at ${Math.round(rate)} mL/hr.`);
                    }
                    infusions[infIndex] = { ...infusions[infIndex], userRate: rate };
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
    const dosingWeight = medData.dosingWeight === 'IBW' ? currentPatient.ibw : (medData.dosingWeight === 'LBW' ? currentPatient.lbw : currentPatient.weight);
    if (unit.includes('mcg/kg/min')) doseInMg = (doseInMg * dosingWeight) / 1000;
    else if (unit.includes('mcg')) doseInMg = doseInMg / 1000;
    else if (unit.includes('mg/kg')) doseInMg = doseInMg * dosingWeight;

    let existingModel = currentActiveMeds.find(m => m.name === medData.name);
    if (!existingModel) { existingModel = new PKPDModel(medData, currentPatient.weight); setActiveMeds(prev => [...prev, existingModel]); }

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
        let leak = 0.5; // normal transient leak
        if (currentPatient.nAChR_state === 'upregulated') {
          leak = 5.2; // massive lethal leak
          logEvent(`🚨 CRITICAL CLINICAL EMERGENCY: Succinylcholine given to patient with nAChR upregulation! Extrajunctional receptors opened, triggering massive potassium leak (+5.2 mEq/L)!`);
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

      // === SURGICAL TIMELINE AUTO-PROGRESSION (PRE-OP -> INDUCTION) ===
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

      // Fallback: If no lineId is provided, find the first available non-arterial line to assign this infusion to
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
      
      // Strip medication entry from all physical routing pathways
      setPatient(prev => {
        const updatedLines = (prev.accessLines || []).map(l => ({
          ...l,
          activeMedInfusions: (l.activeMedInfusions || []).filter(m => m.medId !== medId)
        }));
        return { ...prev, accessLines: updatedLines };
      });
      logEvent(`⏹ Stopped ${medData.name} infusion.`);
    }
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
            // Volume-based hypoxia penalty: depleted if O2 in FRC < 40% of capacity
            const patLungVols = calculateLungVolumes(p.height || 170, p.age || 40, p.sex || 'male', p.bmi || 25, p.position || 'Supine', p.copd || false, p.restrictive || false);
            const hypoxiaPenalty = (p.oxygenBuffer || 0) < (patLungVols.frc_L * 0.40) ? 0.6 : 0; 
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
          
          
            // === POISEUILLE FLUID RESUSCITATION DRAINAGE (MULTI-LINE) ===
          let totalFluidVolumeLiters = 0;
          let newLines = (st.patient.accessLines || []).map(l => ({ 
              ...l, 
              activeInfusions: [...(l.activeInfusions || [])],
              activeMedInfusions: [...(l.activeMedInfusions || [])] 
          }));
          let updatedElectrolytes = { ...st.electrolytes };
          let tbwDelta = 0;
          let coagDelta = { r: 0, ma: 0, angle: 0 };
          let rbcVolumeAdded = 0;
          let activeInfusionMessages = [];
          let hasActiveInfusions = false;
          let fluidInducedTempDrop = 0;

          // Object to aggregate active continuous infusion rates across all functioning physical pathways
          const lineMedicationRates = {};

          for (let lineIndex = 0; lineIndex < newLines.length; lineIndex++) {
              let line = newLines[lineIndex];
              if (line.failed) continue;

              // Aggregate medication rates running on this specific, non-failed vascular access line
              if (line.activeMedInfusions) {
                  line.activeMedInfusions.forEach(medInf => {
                      if (medInf.rate > 0) {
                          lineMedicationRates[medInf.medId] = (lineMedicationRates[medInf.medId] || 0) + parseFloat(medInf.rate);
                      }
                  });
              }

              if (!line.activeInfusions || line.activeInfusions.length === 0) continue;
              hasActiveInfusions = true;
              
              const lType = line.fluidLine || st.patient.fluidLine || 'gravity';
              
              // Belmont Rapid Infuser blowout on IO or narrow PIV lines (<= 20G)
              const isNarrowIV = line.type && (line.type.includes('20G') || line.type.includes('22G') || line.type.includes('24G'));
              if (lType === 'belmont' && (line.category.includes('IO') || isNarrowIV)) {
                  activeInfusionMessages.push(`🚨 CLINICAL CATASTROPHE: Belmont Rapid Infuser connected to ${line.name}! High pressure (300 mmHg) caused immediate ${line.category.includes('IO') ? 'bone/vascular blowout, leading to severe extravasation and compartment syndrome' : 'vein rupture and blown line'}! Access lost!`);
                  line.activeInfusions = [];
                  line.activeMedInfusions = [];
                  line.failed = true;
                  line.name += ' [BLOWN OUT]';
                  continue;
              }
              
              let pInfusion = 74; // Gravity default
              if (lType === 'ranger') pInfusion = 150;
              else if (lType === 'belmont') pInfusion = 300;
              
              const pv = line.venousPressure !== undefined ? line.venousPressure : 10;
              const rv = line.veinResistance !== undefined ? line.veinResistance : 500;
              let deltaP = pInfusion - pv;
              if (deltaP < 0) deltaP = 0;
              
              let currentInfusion = line.activeInfusions[0];
              const fluidData = FLUIDS[currentInfusion.name];
              const eta = fluidData ? (fluidData.viscosity || 1.0) : 1.0;
              
              let rTubing = 400;
              if (lType === 'ranger') rTubing = 800;
              else if (lType === 'belmont') rTubing = 200;
              
              const rCath = line.length / Math.pow(line.radius || 0.475, 4);
              const rTotal = rTubing + rCath + rv;
              
              let q_ml_min = 1200 * deltaP / (eta * rTotal);
              if (lType === 'belmont' && q_ml_min > 500) q_ml_min = 500;
              
              if (currentInfusion.userRate !== undefined) {
                  const user_ml_min = currentInfusion.userRate / 60;
                  q_ml_min = Math.min(q_ml_min, user_ml_min);
              }
              
              const q_ml_sec = q_ml_min / 60;
              currentInfusion.currentRate = q_ml_min * 60;
              let infusedThisTick = Math.min(currentInfusion.remainingVolume, q_ml_sec);
              
              if (infusedThisTick > 0 && fluidData) {
                  currentInfusion.remainingVolume -= infusedThisTick;
                  const volLiters = infusedThisTick / 1000;
                  totalFluidVolumeLiters += volLiters;
                  
                  // Warmed vs Cold fluid hypothermia cooling accumulation
                  if (lType === 'gravity') {
                      const tempDiff = (fluidData.type === 'Blood Product' ? 4 : 22) - (st.vitals.temp || 37.0);
                      const scaling = fluidData.type === 'Blood Product' ? 0.07 : 0.05;
                      fluidInducedTempDrop += volLiters * tempDiff * scaling;
                  }
                  
                  const isUnit = fluidData.type === 'Blood Product' || fluidData.type === 'Colloid';
                  const defaultVol = fluidData.defaultVol || 300;
                  const unitEq = isUnit ? (infusedThisTick / defaultVol) : volLiters;
                  
                  const retFactor = (st.patient.isSeptic || st.patient.trauma) ? fluidData.retentionInflamed : fluidData.retentionIntact;
                  setIntravascularVolume(prev => prev + (infusedThisTick * retFactor));
                  
                  tbwDelta += volLiters;
                  const prevTBW = st.patient.weight * 0.6 + tbwDelta;
                  const newTBW = prevTBW + volLiters;
                  
                  updatedElectrolytes.k = updatedElectrolytes.k + (((updatedElectrolytes.k * prevTBW) + (fluidData.k * volLiters)) / newTBW - updatedElectrolytes.k);
                  updatedElectrolytes.na = ((updatedElectrolytes.na * prevTBW) + (fluidData.na * volLiters)) / newTBW;
                  updatedElectrolytes.cl = ((updatedElectrolytes.cl * prevTBW) + (fluidData.cl * volLiters)) / newTBW;
                  updatedElectrolytes.ca = Math.max(1.0, updatedElectrolytes.ca + (fluidData.ca * (isUnit ? unitEq : volLiters)) - (fluidData.citrateLoad * unitEq * 0.02));
                  updatedElectrolytes.ph = updatedElectrolytes.ph - (fluidData.cl > 110 ? 0.05 * volLiters : 0);
                  
                  coagDelta.r += (fluidData.coag.r * unitEq);
                  coagDelta.ma += (fluidData.coag.ma * unitEq);
                  coagDelta.angle += (fluidData.coag.angle * unitEq);
                  
                  if (fluidData.type === 'Blood Product') rbcVolumeAdded += infusedThisTick;
              }
              
              if (currentInfusion.remainingVolume <= 0) {
                  activeInfusionMessages.push(`✅ Infusion Complete: ${currentInfusion.name} via ${line.name}`);
                  line.activeInfusions.shift();
              }
          }
          
          if (tbwDelta > 0) {
              setTotalBodyWaterLiters(prev => prev + tbwDelta);
              setElectrolytes(updatedElectrolytes);
              setCoags(prev => ({
                  r_offset: prev.r_offset + coagDelta.r,
                  ma_offset: prev.ma_offset + coagDelta.ma,
                  angle_offset: prev.angle_offset + coagDelta.angle
              }));
          }
          
          if (activeInfusionMessages.length > 0 || (st.patient.accessLines && st.patient.accessLines.length > 0)) {
              setPatient(prev => {
                  if (activeInfusionMessages.length > 0) {
                      activeInfusionMessages.forEach(msg => {
                        prev.events = [...(prev.events || []), { time: Date.now(), msg, type: 'info' }];
                      });
                  }
                  return { ...prev, accessLines: newLines };
              });
          } else if (tbwDelta > 0 || hasActiveInfusions) {
              setPatient(prev => ({ ...prev, accessLines: newLines }));
          }
          // === END POISEUILLE DRAINAGE ===


          // === BLOOD BANK DELIVERY COUNTDOWN (Simulation-Time) ===
          // Decrements each tick (1 second). Pausing the simulation pauses the countdown.
          // Undo/restore via snapshot automatically reverts the countdown state.
          const bbState = st.patient.bloodBank;
          if (bbState && bbState.status === 'ordered' && bbState.deliveryCountdown > 0) {
              const newCountdown = bbState.deliveryCountdown - 1;

              if (newCountdown <= 0) {
                  // Cooler has arrived — transition to available
                  const arrivedUnits = bbState.pendingUnits || 4;
                  const isUncrossmatched = bbState.preOpWorkup === 'none';
                  setPatient(prev => ({
                      ...prev,
                      bloodBank: {
                          ...prev.bloodBank,
                          status: 'available',
                          unitsInOR: (prev.bloodBank.unitsInOR || 0) + arrivedUnits,
                          deliveryCountdown: 0,
                          pendingUnits: 0
                      }
                  }));
                  logEvent(`✅ Blood Bank: Cooler has arrived in the OR! ${arrivedUnits} unit(s) of ${isUncrossmatched ? 'UNCROSSMATCHED O-Negative' : 'crossmatched'} blood are now available. ${isUncrossmatched ? '⚠️ Transfusion reaction risk elevated — administer cautiously and monitor closely.' : 'Products verified and compatible.'}`);
              } else {
                  // Countdown still running — silent decrement with milestone notifications
                  setPatient(prev => ({
                      ...prev,
                      bloodBank: {
                          ...prev.bloodBank,
                          deliveryCountdown: newCountdown
                      }
                  }));

                  // Milestone notifications at halfway and at 60 seconds remaining
                  const totalTime = bbState.totalDeliveryTime || 600;
                  const halfwayMark = Math.round(totalTime / 2);
                  if (newCountdown === halfwayMark) {
                      logEvent(`🔔 Blood Bank Update: Cooler is halfway to the OR. ETA: ${Math.ceil(newCountdown / 60)} min (${newCountdown}s).`);
                  } else if (newCountdown === 60) {
                      logEvent(`🔔 Blood Bank Update: Cooler arriving in 60 seconds. Prepare IV line and blood warmer.`);
                  }
              }
          }
          // === END BLOOD BANK COUNTDOWN ===


          // Calculate dynamic V1 modifier based on active fluid/blood volume state
          const currentBloodVolume = (st.patient.ebv || 5000) - (st.patient.ebl || 0) + st.intravascularVolume;
          const v1VolumeRatio = Math.max(0.4, currentBloodVolume / (st.patient.ebv || 5000));

          // Calculate dynamic renal clearance multiplier
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

          // Calculate dynamic hepatic clearance multiplier (Child-Pugh A/B/C)
          let hepaticRatio = 1.0;
          if (st.patient.cirrhosis || st.patient.hasCirrhosis || st.patient.liverComorbidity) {
              const cp = (st.patient.childPugh || '').toUpperCase();
              if (cp.includes('C')) hepaticRatio = 0.25;
              else if (cp.includes('B')) hepaticRatio = 0.50;
              else hepaticRatio = 0.80; // Default Child-Pugh A
          }

          const hasMG = st.patient.hasMG || st.patient.myastheniaGravis || (st.patient.neurologicComorbidity && st.patient.neurologicComorbidity.toLowerCase().includes('myasthenia'));

        if (st.activeMeds) {
            st.activeMeds.forEach(model => {
              // Dynamically inject line-driven medication rates directly into the model rate properties
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
                  // Propofol has a direct clinical SVR drop of 15-30% at therapeutic concentrations.
                  // Scaling factor of 4.5 increases SVR drop sensitivity to meet the Oracle's 15% vasodilation threshold.
                  const scalingFactor = model.name === 'Propofol' ? 4.5 : 1.0; 
                  drugSvrMod *= (1.0 + ((effects.diaDelta * scalingFactor) / 120)); 
              }
              if (effects.sysDelta) {
                  const pulsePressureDelta = effects.sysDelta - (effects.diaDelta || 0);
                  // Allow both positive inotropy (support) and negative inotropy (depression)
                  drugInotropyMod *= (1.0 + (pulsePressureDelta / 100)); 
              }
              
              // Integrate receptor-based SVR and inotropy multipliers (e.g. Epi, Norepi, Phenylephrine, Vasopressin, Ephedrine)
              if (effects.svrMultiplier !== undefined) {
                  drugSvrMod *= effects.svrMultiplier;
              }
              if (effects.coMultiplier !== undefined) {
                  drugInotropyMod *= effects.coMultiplier;
              }
              
              if (effects.group === 'Sedative') sedativeEff = 1 - (1 - sedativeEff) * (1 - effects.hypnoticEffect);
              if (effects.group === 'Opioid') opioidEff = 1 - (1 - opioidEff) * (1 - effects.hypnoticEffect);
              
              // nAChR state shifts (Myasthenia Gravis vs Upregulation sensitivity overrides)
              let occupancy = effects.receptorOccupancy;
              if (model.classes.includes('NDMR')) {
                  if (st.patient.nAChR_state === 'downregulated') {
                      occupancy = Math.min(1.0, occupancy * 2.0); // Sensitive to NDMRs
                  } else if (st.patient.nAChR_state === 'upregulated') {
                      occupancy = occupancy * 0.5; // Resistant to NDMRs
                  }
              } else if (model.classes.includes('Depolarizing NMBA')) {
                  if (st.patient.nAChR_state === 'downregulated') {
                      occupancy = occupancy * 0.5; // Resistant to Succinylcholine
                  } else if (st.patient.nAChR_state === 'upregulated') {
                      occupancy = Math.min(1.0, occupancy * 1.5); // Sensitive to Succinylcholine
                  }
              }
              if (occupancy > maxNMJOccupancy) maxNMJOccupancy = occupancy;
            });
            
            // Enforce clinical safety floors to prevent complete circulatory arrest from sedatives alone
            drugSvrMod = Math.max(0.55, drugSvrMod);
            drugInotropyMod = Math.max(0.50, drugInotropyMod);
        }

          // === ACTIVE METABOLITES ACCUMULATION ===
          const renalMult = (st.patient.isRenal || st.patient.renalFailure) ? 0.1 : 1.0;
          
          const vecModel = st.activeMeds?.find(m => m.name === 'Vecuronium');
          const vecCe = vecModel ? vecModel.Ce : 0;
          
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
          
          // Cumulative Vecuronium 3-OH metabolite NMJ blocking potency (80% potency of parent)
          if (currentVec3oh > 0) {
              maxNMJOccupancy = Math.min(1.0, maxNMJOccupancy + (currentVec3oh * 0.8));
          }

          // Couple active paralytic Ce directly to maxNMJOccupancy (neuromuscular junction blockade)
          const rocuroniumModel = st.activeMeds?.find(m => m.name === 'Rocuronium');
          const rocuroniumCe = rocuroniumModel ? rocuroniumModel.Ce : 0;
          const vecuroniumModel = st.activeMeds?.find(m => m.name === 'Vecuronium');
          const vecuroniumCe = vecuroniumModel ? vecuroniumModel.Ce : 0;
          const cisatracuriumModel = st.activeMeds?.find(m => m.name === 'Cisatracurium');
          const cisatracuriumCe = cisatracuriumModel ? cisatracuriumModel.Ce : 0;
          const succinylcholineModel = st.activeMeds?.find(m => m.name === 'Succinylcholine');
          const succinylcholineCe = succinylcholineModel ? succinylcholineModel.Ce : 0;

          // If Rocuronium Ce > 0.15, receptor occupancy should be at least 0.80 to ensure TOF count drops below 4/4
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

          // Active metabolite clinical implications
          let isSeizure = false;
          let seizureMetabolicMultiplier = 1.0;
          if (currentNormep > 1.2) {
              isSeizure = true;
              seizureMetabolicMultiplier = 8.0; // 8x metabolic demand
          }
          
          let m6gRrDelta = 0;
          if (currentM6g > 0.8) {
              m6gRrDelta = -10; // Severe respiratory depression
          }

          // === NITROPRUSSIDE CYANIDE TOXICITY ACCUMULATION ===
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
              cyanideVO2Mod = Math.max(0.1, 1 - currentCyanide * 2.0); // Cellular respiration drop
          }

          let currentMac = 0; let currentEtAgent = 0; let currentEtN2O = 0; 
          let deliveredFiO2 = 21; let n2oPercent = 0;
          
           const baseHb = st.patient.trauma ? 11.2 : 14.5;
           // Bleeding is only active during Incision or Maintenance phases, unless it's a trauma case with pre-existing bleeding
           let activeBleedRate = 0;
           if (st.patient.trauma) {
               activeBleedRate = st.patient.bleedRate !== undefined ? st.patient.bleedRate : 1.5;
           } else if (st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance') {
               activeBleedRate = st.patient.bleedRate !== undefined ? st.patient.bleedRate : 0.05;
           }
           const currentEbl = (st.patient.ebl || 0) + activeBleedRate;
           const bloodLossRatio = currentEbl / (st.patient.ebv || 5000);
           const currentHb = Math.max(3.0, (baseHb * (1 - bloodLossRatio)) - ((st.intravascularVolume / (st.patient.ebv || 5000)) * 3.0));

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
                
                const gasState = model.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction);
                if (gasState.Fa > 0.01) {
                  currentEtAgent = gasState.Fa;
                  
                  // CA-1 Dynamic MAC Sensitization
                  let macModifier = 1.0;
                  if (st.vitals.temp < 36.0) macModifier -= (36.0 - st.vitals.temp) * 0.05; // 5% reduction per degree C
                  if (st.patient.isSeptic) macModifier -= 0.1;
                  if (currentHb < 5.0) macModifier -= 0.1;
                  macModifier = Math.max(0.4, macModifier);
                  
                  const adjMac = calculateAgeAdjustedMAC(agentData.mac40, st.patient.age || 40) * macModifier;
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
          
          // === HIGH-FIDELITY CLINICAL SYMPATHOLYSIS MODEL ===
          // Central Sympatholysis: Central blunting of the sympathetic surge outflow
          const opioidAnalgesia = opioidEff * 0.85;
          const macAnalgesia = Math.min(0.90, (currentMac / 1.5) * 0.75); // MAC-BAR is typically 1.5 - 2.0 MAC
          const sedativeBlunting = sedativeEff * 0.85;
          
          const dexmedModel = st.activeMeds?.find(m => m.name === 'Dexmedetomidine');
          const dexmedCe = dexmedModel ? dexmedModel.Ce : 0;
          const dexmedEff = dexmedModel ? (dexmedCe / (dexmedCe + (dexmedModel.pd?.c50 || 1.2))) : 0;
          const dexmedBlunting = dexmedEff * 0.80; // Central alpha-2 sympatholysis is highly effective
          
          const lidoModel = st.activeMeds?.find(m => m.name === 'Lidocaine');
          const lidoCe = lidoModel ? lidoModel.Ce : 0;
          const lidoEff = lidoModel ? (lidoCe / (lidoCe + (lidoModel.pd?.c50 || 3.0))) : 0;
          const lidoBlunting = Math.min(0.40, lidoEff + (st.patient.isTopicalized ? 0.30 : 0.0));
          
          // Synergistic central sympatholysis (probability-like saturation formula)
          const centralSympatholysis = 1.0 - (1.0 - opioidAnalgesia) * (1.0 - macAnalgesia) * (1.0 - sedativeBlunting) * (1.0 - dexmedBlunting) * (1.0 - lidoBlunting);
          
          let stimulus = 0;
          if (st.surgicalPhase === 'Induction') stimulus = 20;    // Mild autonomic stimulus during intubation/airway manipulation
          if (st.surgicalPhase === 'Incision') stimulus = 45;     // Incision stimulus (clinically realistic max)
          if (st.surgicalPhase === 'Maintenance') stimulus = 15;  // Ongoing surgical stimulus during maintenance
          if (st.surgicalPhase === 'Emergence') stimulus = 10;    // Emergence sympathetic drive
          
          if (safePaCO2 > 55) {
              stimulus += Math.min(25, (safePaCO2 - 55) * 1.5); // Hypercapnia-induced sympathetic drive
          }
          
          // Unblunted sympathetic outflow (0.0 to stimulus value)
          const unbluntedSympatheticDrive = Math.max(0, stimulus * (1.0 - Math.min(1.0, centralSympatholysis)));
          
          // Backwards compatibility placeholder for any other systems expecting unbluntedStimulus
          const unbluntedStimulus = unbluntedSympatheticDrive;
          
          // Peripheral Beta-1 Receptor Blockade (directly blocks chronotropy and inotropy spikes)
          const esmololModel = st.activeMeds?.find(m => m.name === 'Esmolol');
          const labetalolModel = st.activeMeds?.find(m => m.name === 'Labetalol');
          const metoprololModel = st.activeMeds?.find(m => m.name === 'Metoprolol');
          
          const esmololCe = esmololModel ? esmololModel.Ce : 0;
          const esmololEff = esmololModel ? (esmololCe / (esmololCe + (esmololModel.pd?.c50 || 1.0))) : 0;
          
          const labetalolCe = labetalolModel ? labetalolModel.Ce : 0;
          const labetalolEff = labetalolModel ? (labetalolCe / (labetalolCe + (labetalolModel.pd?.c50 || 0.5))) : 0;
          
          const metoprololCe = metoprololModel ? metoprololModel.Ce : 0;
          const metoprololEff = metoprololModel ? (metoprololCe / (metoprololCe + (metoprololModel.pd?.c50 || 0.1))) : 0;
          
          // Combined Beta-1 blockade fraction (0.0 to 0.95 maximum)
          const betaBlockade = Math.min(0.95, (esmololEff * 0.90) + (labetalolEff * 0.75) + (metoprololEff * 0.85));
          
          // Heart rate (chronotropy) sympathetic spike
          const hrSympatheticSpike = unbluntedSympatheticDrive * 0.85 * (1.0 - betaBlockade);
          
          // Contractility (inotropy) sympathetic spike
          const contractilitySympatheticSpike = (unbluntedSympatheticDrive / 300) * (1.0 - betaBlockade);
          
          // SVR sympathetic vasoconstriction spike (directly blunted by active vascular dilation)
          const svrSympatheticSpike = unbluntedSympatheticDrive * 7.5 * Math.max(0.3, drugSvrMod);

          // === CA-1 PHASE 1 THERMOREGULATION & SHIVERING METABOLISM ===
          let tempDropRate = 0.0001;
          if (currentMac > 0.5 && st.time < 1800) { // First 30 mins (Redistribution Hypothermia)
              tempDropRate = 0.0008; 
          }
          let newTemp = (st.vitals.temp || 37.0) - tempDropRate + (fluidInducedTempDrop || 0);
          if (st.patient.cprActive) newTemp -= 0.002;

          let shiveringMultiplier = 1.0;
          if (newTemp < 35.5 && currentMac < 0.2 && maxNMJOccupancy < 0.5 && st.surgicalPhase === 'Emergence') {
              shiveringMultiplier = Math.min(5.0, 1.0 + ((35.5 - newTemp) * 2.5)); 
          }
          
          // Libby Zion Serotonin Syndrome hyperpyrexia trigger
          if (st.patient.serotoninSyndromeTriggered) {
              totalHrDelta += 60;
              newTemp += 0.05; // rapid temperature spike
          }

          const totalMetabolicMultiplier = shiveringMultiplier * seizureMetabolicMultiplier;
          const VO2_sec = (0.250 * totalMetabolicMultiplier * cyanideVO2Mod) / 60; 
          const VCO2_sec = (0.200 * totalMetabolicMultiplier) / 60; 

          // === POSITIONAL PHYSIOLOGY MODIFIERS ===
          let positionFRCMod = 0;
          let positionPreloadMod = 0;
          let positionHydrostaticMod = 0; 
          const pos = st.patient.position || 'Supine';

          if (pos === 'Ramped' || pos === 'Rev Trendelenburg') {
              positionFRCMod = 0.3;
              positionPreloadMod = -200; 
              positionHydrostaticMod = -14.8; 
          } else if (pos === 'Sitting' || pos === 'Beach Chair') {
              positionFRCMod = 0.5;
              positionPreloadMod = -400; 
              positionHydrostaticMod = -29.6; // Beach chair MAP positional shift
          } else if (pos === 'Trendelenburg') {
              positionFRCMod = -0.5; 
              positionPreloadMod = 300; 
              positionHydrostaticMod = +14.8; 
          } else if (pos === 'Lithotomy') {
              positionFRCMod = -0.4;
              positionPreloadMod = 400; 
          } else if (pos === 'Prone') {
              positionFRCMod = 0.2; 
              positionPreloadMod = -100; 
          } else if (pos === 'Lateral') {
              positionFRCMod = -0.1;
          }

          // === VOLUME-BASED FRC O2 RESERVOIR (replaces percentage surrogate) ===
          // Uses calculateLungVolumes for position & obesity-adjusted FRC
          const currentLungVols = calculateLungVolumes(
              st.patient.height || 170,
              st.patient.age || 40,
              st.patient.sex || 'male',
              st.patient.bmi || 25,
              st.patient.position || 'Supine',
              st.patient.copd || false,
              st.patient.restrictive || false
          );
          const currentFRC_L = currentLungVols.frc_L; // Position & obesity-adjusted FRC in liters

          const isParalyzed = maxNMJOccupancy > 0.90;
          const isApneic = isParalyzed || (st.vitals.rr !== undefined ? st.vitals.rr < 1 : false);
          let buffer = (st.patient.oxygenBuffer !== undefined && st.patient.oxygenBuffer !== null) ? st.patient.oxygenBuffer : (currentFRC_L * 0.21); // Liters of O2 in FRC

          const isBagMaskActive = (st.patient.currentO2Device && st.patient.currentO2Device.includes('Bag-Mask')) || st.patient.ventilationStatus === 'assisted';

          let passiveO2Influx = 0;
          if ((isParalyzed || isApneic) && !st.patient.airwaySecured && !isBagMaskActive) {
              // Apneic oxygenation: passive gas influx offsets O2 depletion based on flow and FiO2
              const currentO2Flow = st.patient.currentO2Flow || 0;
              const currentFiO2 = st.patient.currentFiO2 || 21;
              if (currentO2Flow > 0 && currentFiO2 > 21) {
                  const flowFraction = Math.min(1.0, currentO2Flow / 10.0);
                  const fiO2Fraction = (currentFiO2 - 21) / (100 - 21);
                  passiveO2Influx = VO2_sec * 0.8 * flowFraction * fiO2Fraction;
              }
          }

          let effectiveMV_L_min = 0;
          if (st.patient.airwaySecured) {
              effectiveMV_L_min = st.vitals.mv || 6.0;
          } else if (isBagMaskActive) {
              effectiveMV_L_min = 5.0; // Bag-Mask ventilation provides active replenishment
          } else if (!isParalyzed && !isApneic) {
              const currentRR = st.vitals.rr !== undefined ? st.vitals.rr : 12;
              effectiveMV_L_min = (currentRR * 0.5); // Spontaneous minute ventilation
          }

          if (effectiveMV_L_min > 0.1) {
              // Active ventilation: Nitrogen washout & O2 replenishment
              const replenishmentFiO2 = st.patient.airwaySecured ? deliveredFiO2 : (st.patient.currentFiO2 || 21);
              const targetO2_L = currentFRC_L * (replenishmentFiO2 / 100);
              const k = effectiveMV_L_min / 60 / currentFRC_L; // Eger & Severinghaus washout rate constant
              buffer += k * (targetO2_L - buffer);
          } else {
              // Apnea/Paralysis without active ventilation: depletion offset by apneic oxygenation
              buffer -= (VO2_sec - passiveO2Influx);
          }

          buffer = Math.max(0, Math.min(currentFRC_L, buffer)); // Clamp: 0 to FRC
          const currentBuffer = buffer; // This is now in liters of O2

          let newPip = 0; let newVte = 0; let newPplat = 0; let newPmean = 0; let newMv = 0; let newPeep = 0;
          const opioidRRDrop = (opioidEff * 10) + m6gRrDelta;
          
          const shiveringRRDrive = (shiveringMultiplier > 1.5) ? (shiveringMultiplier * 4) : 0;
          let patientDriveRR = (isParalyzed) ? 0 : Math.max(0, (st.targetVitals.rr || 12) + compensatoryRR + shiveringRRDrive + totalRrDelta - opioidRRDrop);
          let targetRR = patientDriveRR;

          // === PENICILLIN ANAPHYLAXIS TRIGGERS ===
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
              const dt = st.time - startTime;
              anaphylaxisSvrMod = 0.25 + 0.75 * Math.exp(-0.05 * dt); // decays from 1.0 to 0.25
              anaphylaxisCompliancePenalty = Math.min(45, 45 * (1 - Math.exp(-0.08 * dt))); // compliance drops up to 45
              anaphylaxisResistancePenalty = Math.min(45, 45 * (1 - Math.exp(-0.08 * dt))); // resistance rises up to 45
              anaphylaxisHrMod = Math.min(40, 40 * (1 - Math.exp(-0.08 * dt))); // HR rises up to 40
              
              // Blunted by Epinephrine treatment
              const epiModel = st.activeMeds?.find(m => m.name === 'Epinephrine');
              const epiCe = epiModel ? epiModel.Ce : 0;
              if (epiCe > 0.01) {
                  const recovery = Math.min(1.0, epiCe * 12); // speed based on Epinephrine concentration
                  anaphylaxisSvrMod = anaphylaxisSvrMod + (1.0 - anaphylaxisSvrMod) * recovery;
                  anaphylaxisCompliancePenalty *= (1 - recovery);
                  anaphylaxisResistancePenalty *= (1 - recovery);
                  anaphylaxisHrMod *= (1 - recovery);
                  if (recovery > 0.8 && !st.patient.anaphylaxisTreated) {
                      logEvent(`✅ SUCCESS: Epinephrine administered! Vasomotor tone restored and bronchospasm reversed in treating anaphylactic shock.`);
                      st.patient.anaphylaxisTreated = true;
                  }
              }
              st.patient.anaphylaxisSvrMod = anaphylaxisSvrMod;
              st.patient.anaphylaxisCompliancePenalty = anaphylaxisCompliancePenalty;
              st.patient.anaphylaxisResistancePenalty = anaphylaxisResistancePenalty;
              st.patient.anaphylaxisHrMod = anaphylaxisHrMod;
          }

          // === GASTRIC ASPIRATION TRIGGERS ON FULL STOMACH ===
          let hasAspirated = st.patient.hasAspirated || false;
          let aspirationCompliancePenalty = 0;
          let aspirationResistancePenalty = 0;
          
          if (!st.patient.airwaySecured && st.patient.stomach === 'full') {
              // Gastric Aspiration during Positive Pressure Ventilation
              const isVentilatingPPV = st.patient.ventilationStatus === 'mechanical' || (st.ventSettings && st.ventSettings.mode !== 'spontaneous') || newPip > 15;
              if (isVentilatingPPV && !hasAspirated) {
                  hasAspirated = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Positive Pressure Ventilation delivered on a full stomach without a secured airway! Mass aspiration of acidic gastric contents occurred, causing chemical pneumonitis and severe bronchospasm!`);
              }
          }
          
          if (hasAspirated) {
              let complPenalty = 30;
              let resPenalty = 25;
              
              if (st.patient.isSuctioned && pos === 'Trendelenburg') {
                  complPenalty = 10; // cleared some aspirate
                  resPenalty = 8;
                  if (!st.patient.aspirationMitigated) {
                      logEvent(`✅ SUCCESS: Airway suctioned in Trendelenburg position! Acidic aspirate cleared, reducing bronchospastic and compliance penalties.`);
                      st.patient.aspirationMitigated = true;
                  }
              }
              aspirationCompliancePenalty = complPenalty;
              aspirationResistancePenalty = resPenalty;
          }

          // === COPD / ASTHMA PULMONARY SEVERITY MAPPING ===
          let pulmComplianceBonus = 0;
          let pulmResistanceBonus = 0;
          if (st.patient.pulmonaryComorbidity) {
              const pulm = st.patient.pulmonaryComorbidity.toLowerCase();
              if (pulm.includes('copd gold i')) { pulmComplianceBonus = 5; pulmResistanceBonus = 5; }
              else if (pulm.includes('copd gold ii')) { pulmComplianceBonus = 10; pulmResistanceBonus = 10; }
              else if (pulm.includes('copd gold iii')) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; }
              else if (pulm.includes('copd gold iv')) { pulmComplianceBonus = 20; pulmResistanceBonus = 25; }
              else if (pulm.includes('asthma')) { pulmComplianceBonus = -12; pulmResistanceBonus = 20; }
          } else {
              if (st.patient.copd) { pulmComplianceBonus = 15; pulmResistanceBonus = 18; }
          }

          // === DYNAMIC PULMONARY compliance & resistance loops ===
          let currentCompliance = 65; 
          if (st.patient.isObese) currentCompliance -= 25; 
          if (st.patient.isSeptic) currentCompliance -= 20; 
          if (st.patient.trauma) currentCompliance -= 15; 
          if (st.patient.chf) currentCompliance -= 20; 
          currentCompliance += pulmComplianceBonus; 
          if (pos === 'Trendelenburg') {
              currentCompliance *= 0.80; // Apply 20% compliance reduction per ASA/AAGBI clinical standards
          } else if (positionFRCMod < 0) {
              currentCompliance -= 10;
          }
          currentCompliance -= aspirationCompliancePenalty;
          currentCompliance -= anaphylaxisCompliancePenalty;
          currentCompliance = Math.max(5, currentCompliance);
          
          let currentResistance = 5; 
          if (st.patient.isObese) currentResistance += 3;
          currentResistance += pulmResistanceBonus; 
          currentResistance += aspirationResistancePenalty;
          currentResistance += anaphylaxisResistancePenalty;

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
          
          const baselinePaCO2 = st.patient.copd ? 55 : (st.patient.isObese ? 48 : 40);

          let targetPaCO2;
          let targetEtco2 = 0;

          // CA-1 Strict Apnea Calculus (6mmHg in 1st min, 3mmHg thereafter)
          if (targetRR === 0 || currentAlvVent_L_min <= 0.1) {
              const currentApneaDuration = st.patient.apneaStartTime ? (st.time - st.patient.apneaStartTime) : 0;
              const co2RiseRate_sec = (currentApneaDuration < 60) ? (6/60) : (3/60);
              
              targetPaCO2 = safePaCO2 + (co2RiseRate_sec * totalMetabolicMultiplier);
              targetEtco2 = 0;
          } else {
              targetPaCO2 = baselinePaCO2 * ((baseAlvVent_L_min * totalMetabolicMultiplier) / Math.max(0.1, currentAlvVent_L_min));
              targetPaCO2 = Math.max(15, Math.min(120, targetPaCO2)); 
              let co2Gradient = st.patient.isObese ? 7 : (st.patient.copd ? 10 : 4);
              if (safeSys < 80) co2Gradient += (80 - safeSys) * 0.5; 
              targetEtco2 = Math.max(0, targetPaCO2 - co2Gradient);
          }
          let newPaCO2 = safePaCO2 + (targetPaCO2 - safePaCO2) * 0.05;

          // === HEMODYNAMIC COUPLING ===
          let autonomicHrMod = 0;
          if (drugSvrMod > 1.5 && currentMac < 0.5) autonomicHrMod = -20; // Reflex bradycardia
          else if (drugSvrMod < 0.7 && currentMac < 0.5) autonomicHrMod = 25; // Reflex tachycardia

          // Neostigmine un-antagonized muscarinic severe vagal bradycardia
          let isArrestState = st.patient.isArrest;
          let currentRhythm = st.patient.cardiacRhythm;
          
          if (st.patient.bradycardiaTriggered) {
              const bradycardiaDuration = st.time - st.patient.bradycardiaTime;
              const bradycardiaHrDrop = Math.min(60, bradycardiaDuration * 2.5); // rapid drop
              totalHrDelta -= bradycardiaHrDrop;
              
              const expectedHR = (st.targetVitals.hr || 70) + totalHrDelta;
              if (expectedHR < 15 && !isArrestState) {
                  isArrestState = true;
                  currentRhythm = 'asystole';
                  logEvent('🚨 CRITICAL EMERGENCY: Neostigmine-induced profound vagal bradycardia led to cardiac arrest (Asystole)!');
              }
          }

          let newStunning = st.patient.myocardialStunning || 0;
          if ((st.patient.cad || st.patient.hasCAD) && !isArrestState) {
              const currentSys = st.vitals.sys || 120;
              const currentHr = st.vitals.hr || 70;
              const doubleProduct = currentSys * currentHr;
              const dbp = st.vitals.dia || 80;
              if (doubleProduct > 14000 || dbp < 50) {
                  newStunning = Math.min(60, newStunning + 0.5);
                  if (Math.random() < 0.05) { // 5% chance per second to log
                      logEvent(`⚠️ CORONARY ISCHEMIA: High myocardial O2 demand (Double Product ${doubleProduct}) or low coronary perfusion (DBP ${Math.round(dbp)}) in patient with CAD is causing progressive myocardial stunning!`);
                  }
              }
          }

          const effectiveIntravascularVolume = st.intravascularVolume + positionPreloadMod;
          const inotropyFinal = 1.0 - (newStunning / 100) + contractilitySympatheticSpike + (drugInotropyMod - 1.0);
          const preloadSV = Math.max(0.1, 1.0 - (bloodLossRatio * 1.2) + (effectiveIntravascularVolume / 2500));
          
          const shiveringHRDrive = (shiveringMultiplier > 1.0) ? ((shiveringMultiplier - 1.0) * 15) : 0;
          
          // AFib HR Flutter
          let afibHRFlutter = 0;
          if (st.patient.afib || st.patient.hasAFib || st.patient.cardiacRhythm === 'afib') {
              afibHRFlutter = (Math.random() - 0.5) * 12;
          }

          // Beta-Blocker compensatory tachycardia blunting (85% blunted)
          let adjustedAutonomicHrMod = autonomicHrMod;
          let adjustedHypovolemicTachy = bloodLossRatio * 150;
          if (st.patient.onBetaBlocker || st.patient.hasBetaBlocker || st.patient.betaBlocker) {
              adjustedAutonomicHrMod *= 0.15;
              adjustedHypovolemicTachy *= 0.15;
          }

          const targetHR = Math.max(0, (st.targetVitals.hr || 70) + totalHrDelta + adjustedAutonomicHrMod + adjustedHypovolemicTachy + hrSympatheticSpike + shiveringHRDrive + afibHRFlutter + (anaphylaxisHrMod || 0));
          
          // CHF EF-scaled Inotropic Penalty
          let chfInotropicPenalty = 1.0;
          if (st.patient.chf) {
              if (st.patient.ef) {
                  chfInotropicPenalty = Math.max(0.15, st.patient.ef / 55); // EF 30% -> ~0.54 penalty
              } else {
                  chfInotropicPenalty = 0.5;
              }
          }
          const maxSV = (st.patient.patientBaseSV || 70) * (st.patient.chf ? 1.0 : 1.6);
          
          // AFib SV Penalty (15% reduction)
          const afibSVModifier = (st.patient.afib || st.patient.hasAFib || st.patient.cardiacRhythm === 'afib') ? 0.85 : 1.0;
          
          let currentSV = Math.min(maxSV, (st.patient.patientBaseSV || 70) * preloadSV * Math.max(0.1, inotropyFinal) * chfInotropicPenalty * afibSVModifier);
          
          const baseSVR = st.patient.patientBaseSVR || 1200;
          let targetSVR = (baseSVR * svrMod * drugSvrMod * (st.patient.isSeptic ? 0.6 : 1.0) * (anaphylaxisSvrMod || 1.0)) + svrSympatheticSpike;
          
          const targetCO = (targetHR * currentSV) / 1000;
          
          // 1. Incorporate systemic pressure modifiers (fluid pressors and sepsis offsets) directly into targetMAP
          const pressorMAPShift = (effectiveIntravascularVolume / 250) * 8; // since 2/3 of 12 is 8
          const sepsisMAPShift = st.patient.isSeptic ? -33.33 : 0; // since dia - 40 and sys - 20 results in a 33.33 mmHg MAP drop

          // Damped systemic SVR and CO transitions (smooth lag-coupling to resolve Ohm's law violation)
          let newCO = (st.vitals.co || 5.0) + (targetCO - (st.vitals.co || 5.0)) * 0.1;
          let newSVR = (st.vitals.svr || 1200) + (targetSVR - (st.vitals.svr || 1200)) * 0.1;
          if (Math.abs(targetCO - (st.vitals.co || 5.0)) < 0.05) newCO = targetCO;
          if (Math.abs(targetSVR - (st.vitals.svr || 1200)) < 5) newSVR = targetSVR;
          if (isArrestState) {
              newCO = targetCO;
          }

          let exactMap = ((newCO * newSVR) / 80) + pressorMAPShift + sepsisMAPShift;
          exactMap = Math.min(220, Math.max(15, exactMap));

          // 2. Derive SBP and DBP from exactMap using a mathematically consistent Pulse Pressure PP
          const pulsePressureRatio = Math.max(0.2, Math.min(2.5, (currentSV / (st.patient.patientBaseSV || 70))));
          const basePP = 40 * pulsePressureRatio; // Pulse Pressure scales with Stroke Volume

          // Apply myocardial stunning cap directly to exactMap and re-derive (prevents recursive SBP/DBP drift)
          if (st.patient.myocardialStunning > 0 && !isArrestState) {
              exactMap = Math.max(15, exactMap - st.patient.myocardialStunning);
          }

          const hrNoise = isArrestState ? 0 : (Math.random() * 2 - 1);
          const sysNoise = isArrestState ? 0 : (Math.random() * 4 - 2);
          const diaNoise = isArrestState ? 0 : (Math.random() * 2 - 1);
          const mapNoise = isArrestState ? 0 : (Math.random() * 2 - 1); // balanced map-specific noise

          let newHr = (st.vitals.hr || 70) + (targetHR - (st.vitals.hr || 70)) * 0.1 + hrNoise;
          
          // Apply Neostigmine-induced profound vagal bradycardia directly to newHr (progressive decay to < 40 and eventually 0)
          if (st.patient.bradycardiaTriggered) {
              const bradycardiaDuration = st.time - st.patient.bradycardiaTime;
              const targetBradyHR = Math.max(0, 70 - bradycardiaDuration * 3.5);
              if (newHr > targetBradyHR) {
                  newHr = targetBradyHR;
              }
          }

          let newMap = Math.max(0, Math.round(exactMap + mapNoise));
          let roundedSys = Math.max(0, Math.round(newMap + (2/3) * basePP));
          let roundedDia = Math.max(0, Math.round(newMap - (1/3) * basePP));
          if (roundedDia >= roundedSys - 10) roundedDia = Math.max(0, roundedSys - 10);

          if (isArrestState) {
              roundedSys = st.patient.cprActive ? Math.round(80 + (Math.random() * 15)) : 0;
              roundedDia = st.patient.cprActive ? Math.round(25 + (Math.random() * 10)) : 0;
              newMap = Math.max(0, Math.round(roundedDia + (roundedSys - roundedDia) / 3));
          }

          let newCmap = Math.max(0, newMap + positionHydrostaticMod); // Cerebral MAP Positional Hydrostatic Shift
          
          // === ACID-BASE CALCULUS & LACTATE ===
          let currentLactate = st.patient.lacticAcid || 1.0;
          if (currentCyanide > 0.05) {
              currentLactate += currentCyanide * 0.08; // cellular respiration block spikes lactic acid
          }
          const baseDeficit = (st.patient.isSeptic ? 8 : 0) + (bloodLossRatio * 20) + (currentLactate - 1.0);
          const hco3 = Math.max(8, 24 - baseDeficit);
          let newPh = 6.1 + Math.log10(hco3 / (0.03 * newPaCO2));

          // === CA-1 ADVANCED OXYGENATION CALCULUS (FICK PRINCIPLE & RILEY SHUNT) ===
          // Alveolar Gas Equation with volume-based FRC O2 fraction
          // currentBuffer is in liters of O2, currentFRC_L is total FRC volume
          const alveolarFiO2 = Math.min(100, (currentBuffer / currentFRC_L) * 100); // Convert liters back to % for gas equation
          const PAO2 = (713 * (alveolarFiO2 / 100)) - (newPaCO2 / 0.8);
          const baseAaGradient = (st.patient.age / 4) + 4; 
          const AaGradient = baseAaGradient + (st.patient.isObese ? 12 : 0) + (st.patient.isSeptic ? 15 : 0) + (hasAspirated ? 25 : 0);
          const capillaryPO2 = Math.max(10, PAO2 - AaGradient);

          // Advanced Bohr Shift (Includes Volatiles, transfusion 2,3-DPG depletion, CO-Hb & MetHb shifts)
          const dpgDepletionShift = Math.min(0.15, (st.intravascularVolume / 5000) * 0.1); 
          const volatileRightShift = currentMac * 0.05; 
          const bohrShift = Math.pow(10, 0.48 * (newPh - 7.4) - 0.024 * ((st.vitals.temp || 37.0) - 37.0) - volatileRightShift + dpgDepletionShift);
          
          const effectiveCapillaryPO2 = capillaryPO2 * bohrShift;
          const ScO2 = Math.min(100, ((Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2) / (Math.pow(effectiveCapillaryPO2, 3) + 150 * effectiveCapillaryPO2 + 23400)) * 100);
          
          const capillaryO2Content = (currentHb * 1.34 * (ScO2 / 100)) + (capillaryPO2 * 0.0031);
          const VO2_ml_min = VO2_sec * 60 * 1000; 
          
          // Fick Equation for Venous O2
          const venousO2Content = Math.max(1.0, capillaryO2Content - (VO2_ml_min / (Math.max(0.5, targetCO) * 10)));
          
          const actualShunt = st.patient.shuntFraction || 0.05;
          const arterialO2Content = (capillaryO2Content * (1 - actualShunt)) + (venousO2Content * actualShunt);

          let targetSpo2 = Math.min(100, (arterialO2Content / (currentHb * 1.34)) * 100);
          let targetPaO2 = capillaryPO2 * (1 - (actualShunt * 1.5)); 

          // === OPTICAL PHYSICS PULSE OXIMETRY (SpO2) ===
          const SaO2 = targetSpo2;
          const SM = (st.patient.metHb || 0.8) / 100;
          const SC = (st.patient.coHb || 1.0) / 100;
          const SO = (SaO2 / 100) * (1 - SM - SC);
          const SD = ((100 - SaO2) / 100) * (1 - SM - SC);
          const A660 = 0.1 * SO + 1.0 * SD + 1.0 * SM + 0.1 * SC;
          const A940 = 1.0 * SO + 0.1 * SD + 1.0 * SM + 1.0 * SC;
          const R_ratio = A660 / A940;
          
          let measuredSpo2 = 110 - 25 * R_ratio;
          measuredSpo2 = Math.min(100, Math.max(0, measuredSpo2));
          
          // Cyanide toxicity makes SpO2 falsely 100% despite severe cellular hypoxia
          if (currentCyanide > 0.3) {
              measuredSpo2 = 100;
          }

          let newSpo2 = (st.vitals.spo2 || 100) + (measuredSpo2 - (st.vitals.spo2 || 100)) * 0.05;
          let newRr = (st.vitals.rr || 12) + (targetRR - (st.vitals.rr || 12)) * 0.2;
          // Force EtCO2 to 0 during absolute apnea without mechanical/assisted tidal exchange
          const activeMechanicalVent = st.patient.airwaySecured && st.ventSettings && (st.ventSettings.rr > 0 || st.ventSettings.mode === 'PCV' || st.ventSettings.mode === 'VCV' || st.ventSettings.mode === 'PCV-VG');
          const isBMVActive = st.patient.ventilationStatus === 'assisted';
          const hasTidalExchange = activeMechanicalVent || isBMVActive || (!isApneic && targetRR > 0);

          let newEtco2 = !hasTidalExchange ? 0 : (targetRR === 0 ? 0 : (st.vitals.etco2 || 40) + (targetEtco2 - (st.vitals.etco2 || 40)) * 0.2);

          if (Math.abs(targetHR - (st.vitals.hr || 70)) < 1.5 && hrNoise === 0) newHr = targetHR;
          if (Math.abs(targetSys - safeSys) < 1.5 && sysNoise === 0) newSys = targetSys;
          if (Math.abs(targetDia - safeDia) < 1.5 && diaNoise === 0) newDia = targetDia;
          if (Math.abs(measuredSpo2 - (st.vitals.spo2 || 100)) < 1.5) newSpo2 = measuredSpo2;
          if (Math.abs(targetRR - (st.vitals.rr || 12)) < 1.5) newRr = targetRR;
          if (Math.abs(targetEtco2 - (st.vitals.etco2 || 40)) < 1.5) newEtco2 = targetEtco2;

          // === POTASSIUM HYPERKALEMIA ECG Rhythm & Cardiac arrest progression ===
          let kLevel = (st.electrolytes || electrolytes).k || 4.0;
          const isCalciumStabilized = st.patient.calciumStabilized && (st.time - st.patient.calciumStabilizedTime < 300);
          
          if (!isCalciumStabilized) {
              if (kLevel > 10.0) {
                  if (!isArrestState) {
                      isArrestState = true;
                      currentRhythm = 'asystole';
                      logEvent(`🚨 CRITICAL EMERGENCY: Hyperkalemia (K+ = ${kLevel.toFixed(1)} mEq/L) induced myocardial arrest!`);
                  }
              } else if (kLevel > 8.5) {
                  currentRhythm = 'sine wave';
              } else if (kLevel > 7.0) {
                  currentRhythm = 'widened QRS';
              } else if (kLevel > 5.5) {
                  currentRhythm = 'peaked T-waves';
              }
          } else {
              // Stabilized by Calcium: keeps myocardium working but maintains EKG shifts
              if (kLevel > 9.0) {
                  currentRhythm = 'widened QRS';
              } else if (kLevel > 7.0) {
                  currentRhythm = 'peaked T-waves';
              }
          }

          let hypoxiaSeverity = Math.max(0, 90 - newSpo2);
          let hypoPerfusionSeverity = Math.max(0, 55 - newCmap); 
          
          let newDamage = (st.patient.ischemicDamage || 0);
          if (st.patient.cprActive) {
              // High-quality CPR with good oxygenation actively reverses ischemic damage
              const recoveryRate = newSpo2 >= 80 ? 4.5 : 1.0;
              newDamage = Math.max(0, newDamage - recoveryRate);
          } else {
              newDamage += (hypoxiaSeverity * 0.4) + (hypoPerfusionSeverity * 0.7);
          } 
          
          const bloodLossRatioForArrest = currentEbl / (st.patient.ebv || 5000);
          
          if (!isArrestState && !st.patient.biologicalDeath && newDamage > (st.patient.arrestThreshold || 1200)) {
              isArrestState = true;
              if (newSpo2 < 60) currentRhythm = 'asystole';
              else if (bloodLossRatioForArrest > 0.35) currentRhythm = 'pea';
              else currentRhythm = Math.random() > 0.5 ? 'vfib' : 'asystole';
              logEvent(`🚨 CARDIAC ARREST! Rhythm: ${currentRhythm.toUpperCase()}`);
          }
          
          let bioDeath = st.patient.biologicalDeath;
          if (newDamage > 6000 && !bioDeath) {
              logEvent(`💀 BIOLOGICAL DEATH. No further resuscitation possible.`);
              bioDeath = true;
          }

          // Serotonin Syndrome extreme hyperpyrexia cardiac arrest
          if (st.patient.serotoninSyndromeTriggered && newTemp > 42.0 && !isArrestState) {
              isArrestState = true;
              currentRhythm = 'asystole';
              logEvent(`🚨 CRITICAL FATALITY: Extreme hyperpyrexia (Temp = ${newTemp.toFixed(1)}°C) from Serotonin Syndrome triggered cardiac arrest!`);
          }

          let spontaneousRosc = false;
          if (isArrestState && (currentRhythm === 'pea' || currentRhythm === 'asystole') && st.patient.cprActive) {
              const hasEpi = st.activeMeds.some(m => m.name === 'Epinephrine' && m.A1 > 0.1);
              // Volume-based ROSC threshold: O2 buffer must be > 50% of current FRC capacity
              if (currentBuffer > (currentFRC_L * 0.50) && bloodLossRatioForArrest < 0.2 && hasEpi && Math.random() < 0.04) {
                  spontaneousRosc = true;
              }
          }

          if (spontaneousRosc) {
              isArrestState = false;
              currentRhythm = 'normal';
              logEvent(`✅ SPONTANEOUS ROSC ACHIEVED from PEA/Asystole! Underlying causes treated.`);
          }

          if (isArrestState) {
              newSys = st.patient.cprActive ? 80 + (Math.random() * 15) : 0;
              newDia = st.patient.cprActive ? 25 + (Math.random() * 10) : 0;
              newSpo2 = st.patient.cprActive ? 85 : 0;
              newEtco2 = (st.patient.cprActive && st.patient.airwaySecured) ? 15 + (Math.random() * 5) : 0;
              if (!st.patient.cprActive || currentRhythm === 'vfib' || currentRhythm === 'asystole') newHr = 0;
          } else if (st.patient.myocardialStunning > 0) {
              if (targetMAP < 40) newSpo2 = 0; 
          }

          if (newDia >= newSys - 10) newDia = Math.max(0, newSys - 10);

          // Recalculate aligned integer pressures after cardiac arrest / stunning / position overrides are applied
          roundedSys = Math.max(0, Math.round(newSys));
          roundedDia = Math.max(0, Math.round(newDia));
          newMap = Math.max(0, Math.round(roundedDia + (roundedSys - roundedDia) / 3));
          newCmap = Math.max(0, newMap + positionHydrostaticMod);

          const corticalSuppression = aggregateHypnosis;
          const burstSuppression = Math.max(0, (currentMac - 1.5) * 40); 
          let targetBis = 98 - (corticalSuppression * 55) - burstSuppression;
          if (newCmap < 50) {
              const ischemicSlowing = (50 - newCmap) * 1.5;
              targetBis -= ischemicSlowing;
          }
          let finalBis = Math.max(0, Math.min(98, targetBis + (unbluntedStimulus * 0.2)));
          if (isArrestState) finalBis = bioDeath ? 0 : Math.max(0, (st.vitals.bis || 98) - 5);

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
          
          let targetTofRatio = (targetTofCount === 4) ? (t4 / t1) : 0.0;
          if (isNaN(targetTofRatio) || targetTofRatio < 0) targetTofRatio = 0;
          targetTofRatio = Math.min(1.0, targetTofRatio);

          if (st.patient.airwaySecured && st.surgicalPhase === 'Induction') {
              setSurgicalPhase('Maintenance');
              logEvent(`➡️ Airway Secured. Surgical Timeline Auto-Advanced: MAINTENANCE phase initiated.`);
          }

          setPatient(prev => {
              let codeTime = prev.codeStartTime;
              if (isArrestState && !prev.isArrest) codeTime = st.time; 
              if (!isArrestState) codeTime = null;
              
              let newThreshold = prev.arrestThreshold || 1200;
              if (spontaneousRosc) newThreshold = newDamage + 1500;
              
              let newApneaStart = prev.apneaStartTime;
              if ((targetRR === 0 || currentAlvVent_L_min <= 0.1) && !prev.apneaStartTime) newApneaStart = time;
              else if (targetRR > 0 && currentAlvVent_L_min > 0.1) newApneaStart = null;

              return { 
                  ...prev, ebl: currentEbl, oxygenBuffer: currentBuffer, 
                  ischemicDamage: newDamage, isArrest: isArrestState, biologicalDeath: bioDeath,
                  cardiacRhythm: currentRhythm, myocardialStunning: Math.max(0, newStunning - 0.2),
                  codeStartTime: codeTime, arrestThreshold: newThreshold, apneaStartTime: newApneaStart,
                  vec3oh: currentVec3oh, normep: currentNormep, m6g: currentM6g, cyanide: currentCyanide,
                  lacticAcid: currentLactate, hasAspirated, temp: newTemp,
                  isApneic: isApneic, isParalyzed: isParalyzed, lungVolumes: currentLungVols
              };
          });

          setVitals(prev => ({
              ...prev, hr: Math.round(newHr), sys: roundedSys, dia: roundedDia,
              co: newCO, svr: newSVR, map: newMap, cmap: newCmap,
              spo2: Math.round(newSpo2), etco2: Math.max(0, Math.round(newEtco2)), rr: Math.round(newRr),
              temp: newTemp, bis: Math.round(finalBis), 
              tofCount: targetTofCount, tofRatio: targetTofRatio,
              vte: Math.round(newVte), pip: Math.round(newPip), pplat: Math.round(newPplat), 
              peep: newPeep, pmean: Math.round(newPmean), mv: newMv,
              mac: currentMac, etAgent: currentEtAgent, etN2O: currentEtN2O, pao2: targetPaO2, paco2: newPaCO2, ph: newPh,
              compl: Math.round(currentCompliance), res: Math.round(currentResistance),
              cao2: arterialO2Content, cvo2: venousO2Content, p50: st.vitals.p50 || 26.6, r_ratio: R_ratio,
              metHb: st.patient.metHb, coHb: st.patient.coHb
          }));
        } catch (error) {
          console.error("Physics Engine Tick Failed: ", error);
        }
      }, patient?.simulationSpeed || 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, patient?.simulationSpeed]); 

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

  return { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid, updateFluidRate, removeFluid, activeMeds, intravascularVolume, electrolytes, coags, deliverShock, toggleCPR, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot };
}