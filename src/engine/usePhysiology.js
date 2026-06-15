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
import { ConsciousnessEngine } from './ConsciousnessEngine';
import { GastrointestinalEngine } from './GastrointestinalEngine';
import { HepaticEngine } from './HepaticEngine';
import { RenalEngine } from './RenalEngine';

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
          cao2: 20.0, cvo2: 15.0, p50: 26.6, r_ratio: 0.90,
          lesTone: 25.0, gastricPressure: 7.0, bowelGasVolume: 1.0, gutMotility: 1.0, inflammatoryIleus: 0.0, postoperativeIleus: 0.0,
          mPAP: 15.0, HVPG: 5.0, pbf: 1000.0, habf: 300.0, thbf: 1300.0, renalArteryResistance: 1.0, cvp: 5.0
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
          patientBaseSBP: safeBaseVitals.sys || 120,
          patientBaseDBP: safeBaseVitals.dia || 80,
          oculocardiacTriggered: false,
          patientBaseRR: safeBaseVitals.rr || 12,
          lastAirwayManipulationTime: -999,
          lastAirwayManipulationType: '',
          laryngoscopyActive: false,
          laryngoscopyTime: -999,
          cricPlacedTime: -999,
          cricSympatheticSurgeActive: false,
          ioPlacedTime: -999,
          ioSympatheticSurgeActive: false,
          lastLinePlacementTime: -999,
          lastLineCategory: '',
          
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
          isSeizure: false,
          celiacBlockActive: safePatientObj.celiacBlockActive || false,
          epiduralBlockActive: safePatientObj.epiduralBlockActive || false,
          swallowingActive: safePatientObj.swallowingActive || false,
          manipulationIndex: typeof safePatientObj.manipulationIndex === 'number' ? safePatientObj.manipulationIndex : 0.0,
          hasRegurgitated: false,
          hasAspirated: false,

          // Hepatic states
          cirrhosisFactor: safePatientObj.cirrhosisFactor || 0.0,
          bilirubin: safePatientObj.bilirubin || 1.0,
          inr: safePatientObj.inr || 1.0,
          creatinine: (() => {
              if (safePatientObj.creatinine !== undefined) return safePatientObj.creatinine;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 5.2;
                  if (ren.includes('stage 4')) return 2.8;
                  if (ren.includes('stage 3')) return 1.8;
                  if (ren.includes('stage 2')) return 1.3;
                  if (ren.includes('aki')) return 2.2;
              }
              return 0.85;
          })(),
          albumin: safePatientObj.albumin || 4.0,
          encephalopathyGrade: safePatientObj.encephalopathyGrade || 0,
          ascitesDegree: safePatientObj.ascitesDegree || 0,
          surgicalProcedure: safePatientObj.surgicalProcedure || '',
          varicealBleedingActive: false,
          varicealBleedTime: null,
          hasPoPHCollapse: false,
          hasTIPS: safePatientObj.hasTIPS || false,

          // Renal states
          gfr: (() => {
              if (safePatientObj.gfr !== undefined) return safePatientObj.gfr;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 12.5;
                  if (ren.includes('stage 4')) return 25.0;
                  if (ren.includes('stage 3')) return 45.0;
                  if (ren.includes('stage 2')) return 75.0;
                  if (ren.includes('aki')) return 35.0;
              }
              return 125.0;
          })(),
          rbf: 1100.0,
          bun: (() => {
              if (safePatientObj.bun !== undefined) return safePatientObj.bun;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 74.0;
                  if (ren.includes('stage 4')) return 42.0;
                  if (ren.includes('stage 3')) return 28.0;
                  if (ren.includes('stage 2')) return 18.0;
                  if (ren.includes('aki')) return 32.0;
              }
              return 12.0;
          })(),
          urineOutput: 0.0,
          urineOutputRate: 70.0,
          urineOsmolality: 350.0,
          feNa: 1.0,
          akiStage: 0,
          akiDamage: 0.0,
          uopOliguriaTimer: 0,
          uopAnuriaTimer: 0,
          baselineCreatinine: (() => {
              if (safePatientObj.baselineCreatinine !== undefined) return safePatientObj.baselineCreatinine;
              if (safePatientObj.creatinine !== undefined) return safePatientObj.creatinine;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 5.2;
                  if (ren.includes('stage 4')) return 2.8;
                  if (ren.includes('stage 3')) return 1.8;
                  if (ren.includes('stage 2')) return 1.3;
                  if (ren.includes('aki')) return 2.2;
              }
              return 0.85;
          })(),
          baselineBun: (() => {
              if (safePatientObj.baselineBun !== undefined) return safePatientObj.baselineBun;
              if (safePatientObj.bun !== undefined) return safePatientObj.bun;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 74.0;
                  if (ren.includes('stage 4')) return 42.0;
                  if (ren.includes('stage 3')) return 28.0;
                  if (ren.includes('stage 2')) return 18.0;
                  if (ren.includes('aki')) return 32.0;
              }
              return 12.0;
          })(),
          vasopressinLevel: 0.1,
          aldosteroneLevel: 0.1,
          osm: 285.0,
          hasAki: false,
          hasPrerenalOliguria: false,
          hasFluidOverloadEdema: false,
          netFluidBalance: 0.0,

          // Consciousness & Memory states
          lcActivity: 1.0,
          tmnActivity: 1.0,
          vlpoActivity: 0.0,
          mnpoActivity: 0.0,
          ldtPptActivity: 1.0,
          prfActivity: 1.0,
          vtaActivity: 1.0,
          orexinLevel: safePatientObj.narcolepsy ? 0.1 : 1.0,
          slowOscillationPower: 0.1,
          thalamocorticalConn: 1.0,
          frontoparietalFeedback: 1.0,
          corticocorticalConn: 1.0,
          basalGangliaConn: 1.0,
          alpha5GabaaOccupancy: 0.0,
          alpha4GabaaOccupancy: 0.0,
          explicitEncoding: 1.0,
          explicitConsolidation: 0.1,
          ltpInductionInhibited: false,
          p300Amplitude: 10.0,
          n2p3Amplitude: 12.0,
          p2Amplitude: 8.0,
          oldNewEffect: 3.0,
          mismatchNegativity: 3.5,
          p1Amplitude: 4.0,
          n2Latency: 200,
          hippocampalThetaFreq: 7.0,
          hippocampalThetaPower: 1.0,
          amygdaloHippocampalConn: 1.0,
          neuralInertiaLag: 0.0,
          alpha5Knockout: safePatientObj.alpha5Knockout || false,
          alpha4Knockout: safePatientObj.alpha4Knockout || false,
          tmnPropofolResistant: safePatientObj.tmnPropofolResistant || false,
          narcolepsy: safePatientObj.narcolepsy || false,
          alpha2AKnockout: safePatientObj.alpha2AKnockout || false,
          
          isAwarenessActive: false,
          ptsdScore: 0.0,
          hasExplicitRecall: false,
          hasImplicitRecall: false,
          isDreaming: false,
          preopMemoryEncoded: true,
          retrogradeFacilitationRatio: 1.0,
          fearMemoryRetrieved: false,
          reconsolidationWindowOpen: false,
          reconsolidationTimer: 0,
          fearConditioning: 0.0,
          fearExtinguished: false,
          displayEmergenceLag: false,
          isF6Active: false,
          isF3Active: false,
          isTASK1Knockout: safePatientObj.isTASK1Knockout || false,
          isTASK3Knockout: safePatientObj.isTASK3Knockout || false,
          isTREK1Knockout: safePatientObj.isTREK1Knockout || false,
          isHCN1Knockout: safePatientObj.isHCN1Knockout || false,
          gabaa_occupancy: 0.0,
          glycine_occupancy: 0.0,
          k2p_activation: 0.0,
          nmda_blockade: 0.0,
          hcn_inhibition: 0.0,
          nav_blockade: 0.0,
          nachr_inhibition: 0.0,
          tfaAdducts: 0.0,
          AST: safePatientObj.AST || 25.0,
          ALT: safePatientObj.ALT || 25.0,
          bilirubin: safePatientObj.bilirubin || 1.0,
          inr: safePatientObj.inr || 1.0,
          albumin: safePatientObj.albumin || 4.0,
          isHepatitisActive: false,
          priorAnestheticExposure: safePatientObj.priorAnestheticExposure || false,
          serumFluoride: 0.0,
          accumulatedFluorideTime: 0.0,
          hasFluorideNephrotoxicity: false,
          coHb: activeCase.id === 'trauma' ? 12.0 : 1.0,
          compoundA: 0.0,
          absorbent: { waterContent: 15.0, temperature: 22.0, type: 'soda_lime' },
          isAirwayFire: false,
          methionineSynthaseActivity: 1.0,
          homocysteine: 10.0,
          b12Baseline: safePatientObj.b12Baseline || 400.0,
          pediatricNeuroRisk: 0.0,
          pocdRisk: 0.0,
          ciliaBeatFrequency: 100.0,
          ciliaryAtelectasisAccumulation: 0.0,
          isMucusPlugged: false,
          surfactantProduction: 100.0,
          hpvInhibition: 0.0,
          intercostalContribution: 1.0,
          diaphragmContribution: 1.0,
          isParadoxicalBreathing: false,
          dilatorMuscleTone: 1.0,
          airwayObstructionIndex: 0.0,
          isAirwayObstruction: false,
          bronchialSmoothMuscleCa: 1.0,
          atelectasis: 0.0,
          isO2PipelineCrossover: false,
          isO2CylinderOpen: false,
          isO2PipelineDisconnected: false,
          isOxygenFlushPressed: false,
          breathingCircuitType: 'circle',
          co2AbsorptiveCapacity: 100.0,
          stuckExpiratoryValve: false,
          stuckInspiratoryValve: false,
          aplValveSetting: 0.0,
          hasPneumothorax: false
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

  const processMed = (medId, doseInput, route, type, unit, lineId = null, modelName = null) => {
    const currentPatient = stateRef.current.patient || patient;
    const currentActiveMeds = stateRef.current.activeMeds || activeMeds;

    const targetLine = lineId ? currentPatient.accessLines?.find(l => l.id === lineId) : null;
    let injectedArterial = false;
    if (targetLine && targetLine.category?.includes('Arterial')) {
        injectedArterial = true;
        if (medId === 'thiopental' || medId === 'methohexital') {
            const baseProb = 0.50;
            const willPrecipitate = currentPatient.forceBarbituratePrecipitation || (Math.random() < baseProb);
            if (willPrecipitate) {
                logEvent(`🚨 CRITICAL EMERGENCY: Injected Barbiturate ${medId === 'thiopental' ? 'Thiopental' : 'Methohexital'} into Arterial Line: ${targetLine.name}! This triggers immediate chemical endarteritis, microvascular crystal precipitation, profound arterial vasospasm, and severe distal limb ischemia!`);
                setPatient(prev => ({
                    ...prev,
                    barbiturateArterialPrecipitation: true,
                    barbiturateArterialPrecipitationTime: stateRef.current.time,
                    barbiturateArterialDrugName: medId === 'thiopental' ? 'Thiopental' : 'Methohexital'
                }));
            } else {
                logEvent(`⚠️ Clinical Note: Injected Barbiturate ${medId === 'thiopental' ? 'Thiopental' : 'Methohexital'} into Arterial Line: ${targetLine.name}. Fortunately, microvascular crystal precipitation did not occur (occurs in ~50% of intra-arterial injections). Monitor extremity for delayed vasospasm.`);
            }
        } else {
            logEvent(`🚨 CRITICAL ERROR: Injected ${medId} into Arterial Line: ${targetLine.name}! This causes immediate profound arterial vasospasm and endothelial irritation!`);
            setPatient(prev => ({
                ...prev,
                genericArterialSpasm: true,
                genericArterialSpasmTime: stateRef.current.time
            }));
        }
    }
    if (targetLine && targetLine.failed) {
        logEvent(`❌ FAILED: Cannot administer ${medId}. Access Line: ${targetLine.name} has been BLOWN OUT!`);
        return false;
    }
    const hasCVC = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('CVC') || l.type?.includes('CVC') || l.category?.includes('Central') || l.type?.includes('Central') || l.type?.includes('Cordis') || l.type?.includes('Introducer')));
    const hasPIV = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('PIV') || l.name?.includes('PIV') || l.category?.includes('IV') || l.name?.includes('IV') || l.category?.includes('Peripheral')));
    const hasIO = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('IO') || l.name?.includes('IO') || l.type?.includes('IO') || l.type?.includes('Intraosseous')));
    const hasArt = currentPatient.accessLines?.some(l => l.category?.includes('Arterial') || l.name?.includes('Arterial'));

    if (route === 'IV' && !hasCVC && !hasPIV && !hasIO && !injectedArterial) {
        logEvent(`❌ FAILED: No venous access available for ${medId}!`);
        return false; 
    }

    const medData = MEDICATIONS[medId]; if (!medData) return false;

    const safePatientWeight = typeof currentPatient.weight === 'number' && Number.isFinite(currentPatient.weight) && currentPatient.weight > 0 ? currentPatient.weight : 70;
    const safePatientIbw = typeof currentPatient.ibw === 'number' && Number.isFinite(currentPatient.ibw) && currentPatient.ibw > 0 ? currentPatient.ibw : 70;
    const safePatientLbw = typeof currentPatient.lbw === 'number' && Number.isFinite(currentPatient.lbw) && currentPatient.lbw > 0 ? currentPatient.lbw : 60;

    if (type === 'TCI_Cp' || type === 'TCI_Ce') {
      const targetConc = parseFloat(doseInput);
      if (isNaN(targetConc) || targetConc <= 0) {
        logEvent(`❌ FAILED: Invalid target concentration specified!`);
        return false;
      }
      
      const mode = type === 'TCI_Cp' ? 'Cp' : 'Ce';
      const selectedModelName = modelName || medData.pkModel || 'Schnider';
      
      let existingModel = currentActiveMeds.find(m => m.name === medData.name);
      let updatedMeds = [...currentActiveMeds];
      if (!existingModel) { 
        existingModel = new PKPDModel(medData, safePatientWeight); 
        updatedMeds.push(existingModel); 
      }
      
      existingModel.setTci(mode, targetConc, selectedModelName, currentPatient);
      existingModel.displayDose = `target: ${targetConc}`;
      existingModel.displayUnit = 'mcg/mL';
      existingModel.medId = medId;

      const targetLineId = lineId || (currentPatient.accessLines || []).find(l => !l.category?.includes('Arterial'))?.id;
      if (targetLineId) {
        setPatient(prev => {
          const updatedLines = (prev.accessLines || []).map(l => {
            if (l.id !== targetLineId) return l;
            const meds = [...(l.activeMedInfusions || [])];
            const idx = meds.findIndex(m => m.medId === medId);
            const infItem = { medId, rate: 0.0, unit: `mcg/mL (TCI ${mode} - ${selectedModelName})` };
            if (idx >= 0) {
              meds[idx] = infItem;
            } else {
              meds.push(infItem);
            }
            return { ...l, activeMedInfusions: meds };
          });
          return { ...prev, accessLines: updatedLines };
        });
      }
      
      setActiveMeds(updatedMeds);
      logEvent(`🔁 Started TCI (${mode}-controlled) for ${medData.name} targeting ${targetConc} mcg/mL using ${selectedModelName} model.`);
      return true;
    }

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
      existingModel.tciMode = 'none';
      existingModel.tciTarget = 0;
      
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
          if (st.patient.gfr !== undefined) {
              renalRatio = Math.max(0.05, Math.min(1.0, st.patient.gfr / 100));
          } else if (st.patient.renalComorbidity) {
              const ren = st.patient.renalComorbidity.toLowerCase();
              if (ren.includes('stage 5') || ren.includes('dialysis')) renalRatio = 0.1;
              else if (ren.includes('stage 4')) renalRatio = 0.25;
              else if (ren.includes('stage 3')) renalRatio = 0.5;
              else if (ren.includes('stage 2')) renalRatio = 0.75;
              else if (ren.includes('aki')) renalRatio = 0.3;
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

          // const esmololModel = st.activeMeds?.find(m => m.name === 'Esmolol');
          // const labetalolModel = st.activeMeds?.find(m => m.name === 'Labetalol');
          // const metoprololModel = st.activeMeds?.find(m => m.name === 'Metoprolol');
          const dexmedModel = st.activeMeds?.find(m => m.name === 'Dexmedetomidine');
          // const lidoModel = st.activeMeds?.find(m => m.name === 'Lidocaine');

          let bcheMultiplier = 1.0;
          if (st.patient.butyrylcholinesteraseVariant === 'heterozygous') {
              bcheMultiplier = 0.1;
          } else if (st.patient.butyrylcholinesteraseVariant === 'atypical') {
              bcheMultiplier = 0.01;
          }
          if (st.patient.pregnancy) {
              bcheMultiplier *= 0.8;
          }
          if (st.patient.cirrhosis || st.patient.childPugh === 'C') {
              bcheMultiplier *= 0.5;
          }
          const neostigmineModelForBche = st.activeMeds?.find(m => m.name === 'Neostigmine');
          if (neostigmineModelForBche && neostigmineModelForBche.Ce > 0.01) {
              bcheMultiplier *= 0.1;
          }

          const currentTemp = st.vitals.temp || 37.0;
          const currentPhForHofmann = st.electrolytes.ph || 7.4;
          const hofmannMultiplier = Math.pow(1.07, currentTemp - 37.0) * Math.pow(10, currentPhForHofmann - 7.4);

          const cysteineModel = st.activeMeds?.find(m => m.name === 'L-Cysteine');
          const cysteineCe = cysteineModel ? cysteineModel.Ce : 0.0;

          let laudanosineAccumulated = 0;

          if (st.activeMeds) {
              st.activeMeds.forEach(model => {
                  const matchingId = Object.keys(MEDICATIONS).find(key => MEDICATIONS[key].name === model.name);
                  if (matchingId && lineMedicationRates[matchingId] !== undefined) {
                      if (!model.tciMode || model.tciMode === 'none') {
                          model.currentInfusionRate = lineMedicationRates[matchingId];
                      }
                  }

                  const isNDMR = model.classes.includes('NDMR');
                  const pdSens = (isNDMR && hasMG) ? 4.0 : 1.0;
                  const effects = model.tick(1, coRatio, v1VolumeRatio, renalRatio, pdSens, hepaticRatio, bcheMultiplier, hofmannMultiplier, cysteineCe);
                  
                  if (model.name === 'Atracurium') {
                      laudanosineAccumulated += model.A1 * ((model.pk.k10 * hofmannMultiplier) / 60) * 0.30;
                  } else if (model.name === 'Cisatracurium') {
                      laudanosineAccumulated += model.A1 * ((model.pk.k10 * hofmannMultiplier) / 60) * 0.10;
                  }
                  
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
                      let mult = effects.svrMultiplier;
                      if (st.patient.adrenalSuppressionActive && mult > 1.0) {
                          mult = 1.0 + (mult - 1.0) * 0.6;
                      }
                      drugSvrMod *= mult;
                  }
                  if (effects.coMultiplier !== undefined) {
                      let mult = effects.coMultiplier;
                      if (st.patient.adrenalSuppressionActive && mult > 1.0) {
                          mult = 1.0 + (mult - 1.0) * 0.6;
                      }
                      drugInotropyMod *= mult;
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

          // Apply active metabolites of Midazolam and Ketamine to global effects
          let currentHydroxyMidazolam = st.patient.hydroxyMidazolam || 0;
          let currentNorketamine = st.patient.norketamine || 0;
          if (currentHydroxyMidazolam > 0.01) {
              sedativeEff = 1 - (1 - sedativeEff) * (1 - Math.min(0.95, currentHydroxyMidazolam * 1.5));
          }
          if (currentNorketamine > 0.01) {
              // Norketamine retains 20-30% of parent drug potency
              opioidEff = 1 - (1 - opioidEff) * (1 - Math.min(0.5, currentNorketamine * 0.3));
          }

          const naloxoneModel = st.activeMeds?.find(m => m.name === 'Naloxone');
          const naloxoneCe = naloxoneModel ? naloxoneModel.Ce : 0;
          if (naloxoneCe > 0) {
              const naloxoneAntagonism = naloxoneCe / (naloxoneCe + 0.001); // Ki = 0.001 mg/L for Naloxone
              opioidEff *= (1.0 - naloxoneAntagonism);
          }

          const rocuroniumModel = st.activeMeds?.find(m => m.name === 'Rocuronium');
          const rocuroniumCe = rocuroniumModel ? rocuroniumModel.Ce : 0;
          const vecuroniumModel = st.activeMeds?.find(m => m.name === 'Vecuronium');
          const vecuroniumCe = vecuroniumModel ? vecuroniumModel.Ce : 0;
          const cisatracuriumModel = st.activeMeds?.find(m => m.name === 'Cisatracurium');
          const cisatracuriumCe = cisatracuriumModel ? cisatracuriumModel.Ce : 0;
          const succinylcholineModel = st.activeMeds?.find(m => m.name === 'Succinylcholine');
          const succinylcholineCe = succinylcholineModel ? succinylcholineModel.Ce : 0;
          const atracuriumModel = st.activeMeds?.find(m => m.name === 'Atracurium');
          const atracuriumCe = atracuriumModel ? atracuriumModel.Ce : 0;
          const gantacuriumModel = st.activeMeds?.find(m => m.name === 'Gantacurium');
          const gantacuriumCe = gantacuriumModel ? gantacuriumModel.Ce : 0;
          const cw002Model = st.activeMeds?.find(m => m.name === 'CW002');
          const cw002Ce = cw002Model ? cw002Model.Ce : 0;

           const rocOccupancy = rocuroniumCe <= 0.15 ? (rocuroniumCe / 0.15) * 0.70 : 0.70 + Math.min(0.30, (rocuroniumCe - 0.15) * 0.5);
          if (rocOccupancy > maxNMJOccupancy) maxNMJOccupancy = rocOccupancy;

          const vecOccupancy = vecuroniumCe <= 0.05 ? (vecuroniumCe / 0.05) * 0.70 : 0.70 + Math.min(0.30, (vecuroniumCe - 0.05) * 1.5);
          if (vecOccupancy > maxNMJOccupancy) maxNMJOccupancy = vecOccupancy;

          const cisOccupancy = cisatracuriumCe <= 0.08 ? (cisatracuriumCe / 0.08) * 0.70 : 0.70 + Math.min(0.30, (cisatracuriumCe - 0.08) * 1.0);
          if (cisOccupancy > maxNMJOccupancy) maxNMJOccupancy = cisOccupancy;

          const suxOccupancy = succinylcholineCe <= 0.08 ? (succinylcholineCe / 0.08) * 0.70 : 0.70 + Math.min(0.30, (succinylcholineCe - 0.08) * 1.0);
          if (suxOccupancy > maxNMJOccupancy) maxNMJOccupancy = suxOccupancy;

          const atrOccupancy = atracuriumCe <= 0.08 ? (atracuriumCe / 0.08) * 0.70 : 0.70 + Math.min(0.30, (atracuriumCe - 0.08) * 1.0);
          if (atrOccupancy > maxNMJOccupancy) maxNMJOccupancy = atrOccupancy;

          const gantOccupancy = gantacuriumCe <= 0.04 ? (gantacuriumCe / 0.04) * 0.70 : 0.70 + Math.min(0.30, (gantacuriumCe - 0.04) * 2.0);
          if (gantOccupancy > maxNMJOccupancy) maxNMJOccupancy = gantOccupancy;

          const cwOccupancy = cw002Ce <= 0.03 ? (cw002Ce / 0.03) * 0.70 : 0.70 + Math.min(0.30, (cw002Ce - 0.03) * 2.5);
          if (cwOccupancy > maxNMJOccupancy) maxNMJOccupancy = cwOccupancy;

          // Active Metabolites
          const renalMult = (st.patient.isRenal || st.patient.renalFailure) ? 0.1 : 1.0;
          const vecCe = vecuroniumCe;
          const morModel = st.activeMeds?.find(m => m.name === 'Morphine');
          const morCe = morModel ? morModel.Ce : 0;
          const mepModel = st.activeMeds?.find(m => m.name === 'Meperidine');
          const mepCe = mepModel ? mepModel.Ce : 0;
          const midazolamModel = st.activeMeds?.find(m => m.name === 'Midazolam');
          const midazolamCe = midazolamModel ? midazolamModel.Ce : 0;
          const ketamineModel = st.activeMeds?.find(m => m.name === 'Ketamine');
          const ketamineCe = ketamineModel ? ketamineModel.Ce : 0;

          let currentVec3oh = st.patient.vec3oh || 0;
          let currentNormep = st.patient.normep || 0;
          let currentM6g = st.patient.m6g || 0;
          let currentLaudanosine = st.patient.laudanosine || 0;
          // currentHydroxyMidazolam and currentNorketamine are already declared and initialized above

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

          if (midazolamCe > 0.01) {
              currentHydroxyMidazolam = Math.max(0, currentHydroxyMidazolam + midazolamCe * 0.02 - 0.003 * renalMult);
          } else {
              currentHydroxyMidazolam = Math.max(0, currentHydroxyMidazolam - 0.003 * renalMult);
          }

          if (ketamineCe > 0.01) {
              currentNorketamine = Math.max(0, currentNorketamine + ketamineCe * 0.02 - 0.004);
          } else {
              currentNorketamine = Math.max(0, currentNorketamine - 0.004);
          }

          // Laudanosine metabolism and clearance
          const laudanosineClearance = 0.005 * (0.3 * renalRatio + 0.7 * hepaticRatio);
          currentLaudanosine = Math.max(0, currentLaudanosine + laudanosineAccumulated - laudanosineClearance);

          if (currentVec3oh > 0) {
              maxNMJOccupancy = Math.min(1.0, maxNMJOccupancy + (currentVec3oh * 0.8));
          }

          let isSeizure = false;
          let seizureMetabolicMultiplier = 1.0;
          
          // Normeperidine seizures
          if (currentNormep < 0.2) {
              st.patient.normepSeizureRolled = undefined;
          }
          if (currentNormep > 1.2) {
              if (st.patient.normepSeizureRolled === undefined) {
                  const baseProb = 0.15; // 15% base probability of seizures
                  const hasRisk = (st.patient.epilepsy || st.patient.seizureHistory) ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * hasRisk);
                  st.patient.normepSeizureRolled = Math.random() < prob;
              }
              if (st.patient.forceNormepSeizure || st.patient.normepSeizureRolled) {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
                  logEvent("🚨 CRITICAL EMERGENCY: High levels of active metabolite Normeperidine have accumulated, triggering generalized tonic-clonic seizures!");
              } else {
                  st.patient.normepSeizureRolled = false;
                  logEvent("⚠️ Clinical Note: Normeperidine levels are elevated. Fortunately, generalized seizures were not triggered (neurological threshold remains stable).");
              }
          }

          // Laudanosine seizures
          if (currentLaudanosine < 0.2) {
              st.patient.laudanosineSeizureRolled = undefined;
          }
          if (currentLaudanosine > 2.0 && !st.patient.laudanosineSeizureTriggered && st.patient.laudanosineSeizureRolled === undefined) {
              const baseProb = 0.15;
              const hasRisk = (st.patient.epilepsy || st.patient.seizureHistory) ? 3.0 : 1.0;
              const prob = Math.min(1.0, baseProb * hasRisk);
              st.patient.laudanosineSeizureRolled = Math.random() < prob;
              if (st.patient.forceLaudanosineSeizure || st.patient.laudanosineSeizureRolled) {
                  st.patient.laudanosineSeizureTriggered = true;
                  logEvent("🚨 CRITICAL EMERGENCY: High levels of active metabolite Laudanosine have accumulated, triggering generalized seizures!");
              } else {
                  st.patient.laudanosineSeizureRolled = false;
                  logEvent("⚠️ Clinical Note: Laudanosine levels are elevated. Fortunately, generalized seizures were not triggered.");
              }
          }
          if (st.patient.laudanosineSeizureTriggered) {
              if (propofolCe > 1.2 || midazolamCe > 0.08) {
                  st.patient.laudanosineSeizureTriggered = false;
                  logEvent("✅ SUCCESS: Anticonvulsant sedative administered. Laudanosine-induced seizure activity aborted.");
              } else {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
              }
          }

          let m6gRrDelta = 0;
          if (currentM6g > 0.8) {
              m6gRrDelta = -10;
          }
          if (naloxoneCe > 0) {
              const naloxoneAntagonism = naloxoneCe / (naloxoneCe + 0.001);
              m6gRrDelta *= (1.0 - naloxoneAntagonism);
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
          activeBleedRate += st.patient.activeHepaticBleedRate || 0.0;
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

          const isPipelineConnected = !st.patient.isO2PipelineDisconnected;
          const isCrossover = st.patient.isO2PipelineCrossover;
          const isCylinderOpen = st.patient.isO2CylinderOpen;

          let o2SourceIsO2 = false;
          let o2SourceIsN2O = false;
          let hasO2Supply = false;

          if (isPipelineConnected) {
              hasO2Supply = true;
              if (isCrossover) {
                  o2SourceIsN2O = true;
              } else {
                  o2SourceIsO2 = true;
              }
          } else {
              if (isCylinderOpen) {
                  hasO2Supply = true;
                  o2SourceIsO2 = true;
              } else {
                  hasO2Supply = false;
              }
          }

          if (st.gasSettings) {
              const o2F = typeof st.gasSettings.o2Flow === 'number' && Number.isFinite(st.gasSettings.o2Flow) ? st.gasSettings.o2Flow : 0;
              const airF = typeof st.gasSettings.airFlow === 'number' && Number.isFinite(st.gasSettings.airFlow) ? st.gasSettings.airFlow : 0;
              const n2oF = typeof st.gasSettings.n2oFlow === 'number' && Number.isFinite(st.gasSettings.n2oFlow) ? st.gasSettings.n2oFlow : 0;

              const isO2PressureLow = o2F > 0 && !hasO2Supply;
              if (isO2PressureLow && !st.patient.hasLowO2PressureLog) {
                  st.patient.hasLowO2PressureLog = true;
                  logEvent("🚨 CRITICAL WARNING: Oxygen pipeline pressure is 0 psi and backup cylinder is closed! Oxygen supply pressure failure!");
              }
              if (!isO2PressureLow && st.patient.hasLowO2PressureLog) {
                  st.patient.hasLowO2PressureLog = false;
              }

              const actualO2FromFlowmeter = o2SourceIsO2 ? o2F : 0;
              const actualN2OFromFlowmeter = n2oF + (o2SourceIsN2O ? o2F : 0);

              const actualO2 = actualO2FromFlowmeter + airF * 0.21;
              const actualN2O = actualN2OFromFlowmeter;
              const actualN2 = airF * 0.79;
              
              const totalFGF = actualO2 + actualN2O + actualN2;
              
              if (totalFGF > 0.001) {
                  deliveredFiO2 = (actualO2 / totalFGF) * 100;
                  n2oPercent = (actualN2O / totalFGF) * 100;
                  freshGasFlow = totalFGF;
              } else {
                  deliveredFiO2 = 21;
                  n2oPercent = 0;
                  freshGasFlow = 0;
              }
              if (isNaN(deliveredFiO2) || !Number.isFinite(deliveredFiO2)) deliveredFiO2 = 21;
              if (isNaN(n2oPercent) || !Number.isFinite(n2oPercent)) n2oPercent = 0;
          }

          // Crossover warning log
          const isCrossoverActive = st.patient.isO2PipelineCrossover && !st.patient.isO2PipelineDisconnected;
          if (isCrossoverActive && !st.patient.hasCrossoverWarningLogged) {
              st.patient.hasCrossoverWarningLogged = true;
              logEvent("🚨 CRITICAL WARNING: Oxygen analyzer measures low inspired oxygen concentration (FiO2)! Low oxygen alarm active!");
          }
          if (!isCrossoverActive && st.patient.hasCrossoverWarningLogged) {
              st.patient.hasCrossoverWarningLogged = false;
          }

          // Oxygen Flush dilutes circuit volatile agents and pre-oxygenates
          if (st.patient.isOxygenFlushPressed) {
              const currentFRC = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0);
              patientAfterFluidics.oxygenBuffer = Math.max(0.5, currentFRC);
              
              if (st.gasModels) {
                  Object.keys(st.gasModels).forEach(key => {
                      const model = st.gasModels[key];
                      if (model) {
                          model.Fi *= 0.5;
                          model.Fa *= 0.5;
                      }
                  });
              }

              const isVentilatingPPV = st.patient.ventilationStatus === 'mechanical' 
                || (st.ventSettings && st.ventSettings.mode !== 'spontaneous' && st.ventSettings.rr > 0);
              const isAplClosed = st.patient.aplValveSetting >= 30;
              
              if (isVentilatingPPV || isAplClosed) {
                  if (!st.patient.hasPneumothorax) {
                      st.patient.hasPneumothorax = true;
                      logEvent("🚨 CRITICAL EMERGENCY: Oxygen flush valve pressed with closed circuit exhalation path or positive-pressure inspiration! PIP surged > 65 cmH2O, triggering a massive tension pneumothorax!");
                  }
              } else {
                  logEvent("💨 Oxygen flush pressed. Circuit agent concentration diluted by 50%. FRC oxygen buffer filled.");
              }
              
              st.patient.isOxygenFlushPressed = false;
          }

          let currentFiAgent = 0;
          let currentFiN2O = 0;
          let n2oUptake_L_sec = 0;

          if (st.gasModels && Object.keys(st.gasModels).length > 0) {
              const isParalyzed = maxNMJOccupancy > 0.90;
              const isApneic = isParalyzed || (st.vitals.rr !== undefined ? st.vitals.rr < 1 : false);
              const effectiveMv = st.patient.airwaySecured ? (st.vitals.mv || 0) : (isApneic ? 0 : 6.0);
              const currentFRC = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0);

              // 1. Tick N2O first to calculate its uptake rate for the Second Gas Effect
              if (st.gasModels.n2o && INHALATIONAL_AGENTS.n2o) {
                  st.gasModels.n2o.setDial(st.patient.airwaySecured ? n2oPercent : 0);
                  const n2oState = st.gasModels.n2o.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction, freshGasFlow);
                  currentEtN2O = n2oState.Fa;
                  currentFiN2O = st.gasModels.n2o.Fi * 100;
                  n2oUptake_L_sec = n2oState.uptake_vol_sec || 0;
                  
                  const n2oAdjMac = Math.max(0.01, calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.n2o.mac40, st.patient.age || 40));
                  displayedMac += (n2oState.Fa / n2oAdjMac);
                  brainMac += (n2oState.Fb / n2oAdjMac);
              }

              // 2. Tick volatile agents, passing the co-administered N2O uptake to model Second Gas Effect
              Object.keys(st.gasModels).forEach(key => {
                  const model = st.gasModels[key];
                  const agentData = INHALATIONAL_AGENTS[key];
                  if (key !== 'n2o' && agentData) {
                      if (st.gasSettings && st.gasSettings.agent === key && st.patient.airwaySecured) model.setDial(st.gasSettings.dial || 0);
                      else model.setDial(0);
                      
                      const gasState = model.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction, freshGasFlow, n2oUptake_L_sec);
                      if (gasState.Fa > 0.01 || model.Fi > 0.0001) {
                          currentEtAgent = gasState.Fa;
                          currentFiAgent = model.Fi * 100;
                          
                          if (gasState.Fa > 0.01) {
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
                  }
              });
          }

          const f6Model = st.activeMeds?.find(m => m.name === 'F6 (Nonimmobilizer)');
          const f6Ce = f6Model ? f6Model.Ce : 0;
          const f3Model = st.activeMeds?.find(m => m.name === 'F3 (Anesthetic)');
          const f3Ce = f3Model ? f3Model.Ce : 0;
          const sIsoModel = st.activeMeds?.find(m => m.name === 'S-Isoflurane');
          const sIsofluraneCe = sIsoModel ? sIsoModel.Ce : 0;
          const rIsoModel = st.activeMeds?.find(m => m.name === 'R-Isoflurane');
          const rIsofluraneCe = rIsoModel ? rIsoModel.Ce : 0;

          const f3MacContribution = f3Ce / 1.2;
          const sIsoMacContribution = sIsofluraneCe / 0.9;
          const rIsoMacContribution = rIsofluraneCe / 1.8;

          displayedMac += f3MacContribution + sIsoMacContribution + rIsoMacContribution;
          brainMac += f3MacContribution + sIsoMacContribution + rIsoMacContribution;

          const currentMac = brainMac;

          // Consciousness Engine Tick
          const sevoMac = st.gasModels?.sevoflurane ? st.gasModels.sevoflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.sevoflurane.mac40, st.patient.age || 40) : 0;
          const isoMac = st.gasModels?.isoflurane ? st.gasModels.isoflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.isoflurane.mac40, st.patient.age || 40) : 0;
          const haloMac = st.gasModels?.halothane ? st.gasModels.halothane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.halothane.mac40, st.patient.age || 40) : 0;
          const n2oMac = st.gasModels?.n2o ? st.gasModels.n2o.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.n2o.mac40, st.patient.age || 40) : 0;
          const desMac = st.gasModels?.desflurane ? st.gasModels.desflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.desflurane.mac40, st.patient.age || 40) : 0;
          const xenonMac = st.gasModels?.xenon ? st.gasModels.xenon.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.xenon.mac40, st.patient.age || 40) : 0;

          const propofolModel = st.activeMeds?.find(m => m.name === 'Propofol');
          const propofolCe = propofolModel ? propofolModel.Ce : 0;
          const dexmedCe = dexmedModel ? dexmedModel.Ce : 0;
          const thiopentalModel = st.activeMeds?.find(m => m.name === 'Thiopental');
          const thiopentalCe = thiopentalModel ? thiopentalModel.Ce : 0;
          // midazolamModel/midazolamCe and ketamineModel/ketamineCe already declared above (~L1211-1214)
          const etomidateModel = st.activeMeds?.find(m => m.name === 'Etomidate');
          const etomidateCe = etomidateModel ? etomidateModel.Ce : 0;
          const atipamezoleModel = st.activeMeds?.find(m => m.name === 'Atipamezole');
          const atipamezoleCe = atipamezoleModel ? atipamezoleModel.Ce : 0;
          const methylphenidateModel = st.activeMeds?.find(m => m.name === 'Methylphenidate');
          const methylphenidateCe = methylphenidateModel ? methylphenidateModel.Ce : 0;
          const scopolamineModel = st.activeMeds?.find(m => m.name === 'Scopolamine');
          const scopolamineCe = scopolamineModel ? scopolamineModel.Ce : 0;

          const f3Ce_total = f3Ce + (st.gasModels?.f3 ? st.gasModels.f3.Fb : 0);
          const sIsoCe_total = sIsofluraneCe + (st.gasModels?.s_isoflurane ? st.gasModels.s_isoflurane.Fb : 0);
          const rIsoCe_total = rIsofluraneCe + (st.gasModels?.r_isoflurane ? st.gasModels.r_isoflurane.Fb : 0);
          const f6Ce_total = f6Ce + (st.gasModels?.f6 ? st.gasModels.f6.Fb : 0);

          const methohexitalModel = st.activeMeds?.find(m => m.name === 'Methohexital');
          const methohexitalCe = methohexitalModel ? methohexitalModel.Ce : 0;

          const gabapentinModel = st.activeMeds?.find(m => m.name === 'Gabapentin');
          const gabapentinCe = gabapentinModel ? gabapentinModel.Ce : 0;
          const pregabalinModel = st.activeMeds?.find(m => m.name === 'Pregabalin');
          const pregabalinCe = pregabalinModel ? pregabalinModel.Ce : 0;
          const topiramateModel = st.activeMeds?.find(m => m.name === 'Topiramate');
          const topiramateCe = topiramateModel ? topiramateModel.Ce : 0;

          const consciousnessOutput = ConsciousnessEngine.tick(1, st.patient, st.vitals, {
              propofolCe,
              dexmedCe,
              thiopentalCe,
              midazolamCe,
              ketamineCe,
              etomidateCe,
              atipamezoleCe,
              methylphenidateCe,
              scopolamineCe,
              sevoMac,
              isoMac,
              haloMac,
              n2oMac,
              isSyncShock: false,
              time: st.time,
              f3Ce: f3Ce_total,
              sIsofluraneCe: sIsoCe_total,
              rIsofluraneCe: rIsoCe_total,
              f6Ce: f6Ce_total,
              methohexitalCe,
              gabapentinCe,
              pregabalinCe,
              topiramateCe
          });

          // Chapter 19: Compute receptor-binding occupancies (0.0 - 1.0)
          const gabaa_sum = (propofolCe / 2.5) + (midazolamCe / 0.05) + (etomidateCe / 0.3) + (thiopentalCe / 1.0) + (methohexitalCe * (15.0 / 3.5) / 1.0) + sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8);
          const gabaa_occupancy = Math.max(0.0, Math.min(1.0, gabaa_sum / (1.0 + gabaa_sum)));

          const glycine_sum = sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8) + (propofolCe / 5.0);
          const glycine_occupancy = Math.max(0.0, Math.min(1.0, glycine_sum / (1.0 + glycine_sum)));

          const k2p_sum = sevoMac + isoMac + haloMac + desMac + n2oMac + xenonMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8);
          const k2p_mult = 1.0 - (st.patient.isTASK1Knockout ? 0.3 : 0.0) - (st.patient.isTASK3Knockout ? 0.3 : 0.0) - (st.patient.isTREK1Knockout ? 0.4 : 0.0);
          const k2p_activation = Math.max(0.0, Math.min(1.0, k2p_mult * (k2p_sum / (1.0 + k2p_sum))));

          const nmda_sum = (ketamineCe / 1.0) + (n2oMac * 1.5) + (xenonMac * 2.0) + (sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8)) * 0.5;
          const nmda_blockade = Math.max(0.0, Math.min(1.0, nmda_sum / (1.0 + nmda_sum)));

          const hcn_sum = sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8);
          const hcn_mult = st.patient.isHCN1Knockout ? 0.25 : 1.0;
          const hcn_inhibition = Math.max(0.0, Math.min(1.0, hcn_mult * (hcn_sum / (1.0 + hcn_sum))));

          const lidocaineModel = st.activeMeds?.find(m => m.name === 'Lidocaine');
          const lidocaineCe = lidocaineModel ? lidocaineModel.Ce : 0;
          const nav_sum = (lidocaineCe / 2.0) + (sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8)) * 0.3;
          const nav_blockade = Math.max(0.0, Math.min(1.0, nav_sum / (1.0 + nav_sum)));

          const cisModel = st.activeMeds?.find(m => m.name === 'Cisatracurium');
          const cisCe = cisModel ? cisModel.Ce : 0;
          const nachr_sum = (f6Ce_total / 2.0) * 3.0 + (sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8)) * 2.0 + (scopolamineCe / 0.05) + (rocuroniumCe / 1.5) + (vecuroniumCe / 0.2) + (cisCe / 0.3);
          const nachr_inhibition = Math.max(0.0, Math.min(1.0, nachr_sum / (1.0 + nachr_sum)));

          const receptorOutputs = {
              gabaa_occupancy,
              glycine_occupancy,
              k2p_activation,
              nmda_blockade,
              hcn_inhibition,
              nav_blockade,
              nachr_inhibition
          };

          // Merge consciousnessOutput and receptorOutputs into st.patient and patientAfterFluidics
          Object.assign(st.patient, consciousnessOutput, receptorOutputs);
          Object.assign(patientAfterFluidics, consciousnessOutput, receptorOutputs);

          // Chapter 9: Clinical Crises & Reflex Loops
          const isParalyzed = maxNMJOccupancy > 0.90;
          const isLightAnesthesia = currentMac < 0.4 && (propofolCe < 0.8) && (thiopentalCe < 1.0) && (midazolamCe < 0.05) && (etomidateCe < 0.1);
          const surgicalStimulus = st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance';
          const hasAwarenessTrigger = isParalyzed && isLightAnesthesia && surgicalStimulus;

          let isAwarenessActive = st.patient.isAwarenessActive || false;
          let ptsdScore = st.patient.ptsdScore || 0.0;
          let hasExplicitRecall = st.patient.hasExplicitRecall || false;
          let hasImplicitRecall = st.patient.hasImplicitRecall || false;

          let awarenessHrOffset = 0;
          let awarenessSvrOffset = 0;

          if (hasAwarenessTrigger) {
              if (!isAwarenessActive) {
                  isAwarenessActive = true;
                  logEvent(`🚨 WARNING: Patient is PARALYZED but experiencing CONNECTED AWARENESS due to inadequate anesthesia!`);
              }
              
              // Severe sympathetic surge: spikes HR by +35, SBP/DBP by +45 (implemented as offsets)
              awarenessHrOffset = 35;
              awarenessSvrOffset = 45;

              // Midazolam administration during awareness (Ce > 0.08) prevents explicit memory consolidation
              // and halts PTSD score accumulation.
              const midazolamAmnestic = midazolamCe > 0.08;
              if (midazolamAmnestic) {
                  if (!st.patient.midazolamAmnesiaLogged) {
                      logEvent(`ℹ️ CLINICAL UPDATE: Midazolam administered during awareness. Memory consolidation blocked, halting further PTSD risk accumulation.`);
                      st.patient.midazolamAmnesiaLogged = true;
                  }
              } else {
                  // Accumulate PTSD risk
                  ptsdScore = Math.min(100.0, ptsdScore + 1.2);
                  if (ptsdScore > 60.0 && !st.patient.ptsdLogged) {
                      logEvent(`🚨 CRITICAL ERROR: Patient experienced connected intraoperative awareness during surgery! Sympathetic storm occurred with severe risk of PTSD.`);
                      st.patient.ptsdLogged = true;
                  }
                  
                  // Consolidate explicit recall if encoding is active and psi is low
                  if (consciousnessOutput.explicitEncoding > 0.5 && consciousnessOutput.explicitConsolidation < 1.0) {
                      hasExplicitRecall = true;
                  }
              }

              // Nonconscious implicit memory (priming) can occur even in deeper levels (propofolCe < 1.5)
              if (propofolCe < 1.5 && currentMac < 0.6) {
                  hasImplicitRecall = true;
              }
          }

          // Resolution criteria for Connected Awareness:
          // Volatile MAC increased to >0.8 OR propofol infusion is started (Ce > 1.5)
          const restoredDepth = currentMac > 0.8 || propofolCe > 1.5;
          if (isAwarenessActive && restoredDepth) {
              isAwarenessActive = false;
              logEvent(`✅ SUCCESS: Anesthetic depth restored. Connected consciousness suppressed.`);
          }

          // B. Physiological Loop: Retrograde Facilitation of Pre-induction Memory
          let retrogradeFacilitationRatio = 1.0;
          if (st.patient.preopMemoryEncoded) {
              if ((propofolCe > 0.01 && propofolCe < 0.5) || (midazolamCe > 0.001 && midazolamCe < 0.05)) {
                  retrogradeFacilitationRatio = 1.3;
              }
          }

          // C. Clinical Event: Reconsolidation Window Memory Modulatory Erasure
          let reconsolidationWindowOpen = st.patient.reconsolidationWindowOpen || false;
          let reconsolidationTimer = typeof st.patient.reconsolidationTimer === 'number' ? st.patient.reconsolidationTimer : 0;
          let fearConditioning = typeof st.patient.fearConditioning === 'number' ? st.patient.fearConditioning : 0.0;
          let fearExtinguished = st.patient.fearExtinguished || false;

          if (st.patient.fearMemoryRetrieved && !st.patient.reconsolidationWindowOpen) {
              reconsolidationWindowOpen = true;
              reconsolidationTimer = 600; // 10 minutes in seconds
              fearConditioning = 1.0; // Initialize fear memory strength
              logEvent("ℹ️ CLINICAL UPDATE: Fear memory retrieval cue presented. Reconsolidation window open for 600 seconds.");
          }

          if (reconsolidationWindowOpen) {
              reconsolidationTimer = Math.max(0, reconsolidationTimer - 1);
              if (reconsolidationTimer === 0) {
                  reconsolidationWindowOpen = false;
                  logEvent("ℹ️ CLINICAL UPDATE: Reconsolidation window closed.");
              }

              // If midazolam or low-dose sevoflurane is present during this window:
              const isEraseAgentPresent = midazolamCe > 0.01 || (sevoMac > 0.05 && sevoMac < 0.3);
              if (isEraseAgentPresent) {
                  fearConditioning = Math.max(0.0, fearConditioning - 0.005);
                  if (fearConditioning === 0.0 && !fearExtinguished) {
                      fearExtinguished = true;
                      logEvent("✅ SUCCESS: Traumatic fear memory successfully extinguished during the reconsolidation window!");
                  }
              }
          }

          // D. Narcolepsy Emergence Lag (Hysteresis)
          let displayEmergenceLag = false;
          if (st.surgicalPhase === 'Emergence' && currentMac < 0.1 && propofolCe < 0.1) {
              if (consciousnessOutput.neuralInertiaLag > 0.15) {
                  displayEmergenceLag = true;
                  if (!st.patient.emergenceLagLogged) {
                      logEvent(`ℹ️ CLINICAL UPDATE: Patient is in emergence lag. Neural inertia is preventing immediate wakefulness despite clearance of anesthetic agents.`);
                      st.patient.emergenceLagLogged = true;
                  }
              } else if (st.patient.emergenceLagLogged && !st.patient.emergenceLagResolved) {
                  logEvent(`✅ SUCCESS: Patient has emerged from anesthesia. Neural inertia overcome.`);
                  st.patient.emergenceLagResolved = true;
              }
          }

          if (st.patient.isF6Active) {
              st.patient.explicitEncoding = 0;
              patientAfterFluidics.explicitEncoding = 0;
              fearConditioning = 0.0;
          }

          // Apply updates to the patient state object
          st.patient.isAwarenessActive = isAwarenessActive;
          st.patient.ptsdScore = ptsdScore;
          st.patient.hasExplicitRecall = hasExplicitRecall;
          st.patient.hasImplicitRecall = hasImplicitRecall;
          st.patient.retrogradeFacilitationRatio = retrogradeFacilitationRatio;
          st.patient.reconsolidationWindowOpen = reconsolidationWindowOpen;
          st.patient.reconsolidationTimer = reconsolidationTimer;
          st.patient.fearConditioning = fearConditioning;
          st.patient.fearExtinguished = fearExtinguished;
          st.patient.displayEmergenceLag = displayEmergenceLag;

          patientAfterFluidics.isAwarenessActive = isAwarenessActive;
          patientAfterFluidics.ptsdScore = ptsdScore;
          patientAfterFluidics.hasExplicitRecall = hasExplicitRecall;
          patientAfterFluidics.hasImplicitRecall = hasImplicitRecall;
          patientAfterFluidics.retrogradeFacilitationRatio = retrogradeFacilitationRatio;
          patientAfterFluidics.reconsolidationWindowOpen = reconsolidationWindowOpen;
          patientAfterFluidics.reconsolidationTimer = reconsolidationTimer;
          patientAfterFluidics.fearConditioning = fearConditioning;
          patientAfterFluidics.fearExtinguished = fearExtinguished;
          patientAfterFluidics.displayEmergenceLag = displayEmergenceLag;

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

          // === CHAPTER 20: METABOLISM & TOXICITY LOOPS ===
          
          // Initialize absorbent if missing
          if (!st.patient.absorbent) {
              st.patient.absorbent = { waterContent: 15.0, temperature: 22.0, type: 'soda_lime' };
          }
          
          // Desiccation logic: High FGF over time reduces water content
          if (freshGasFlow > 10.0) {
              st.patient.absorbent.waterContent = Math.max(0.5, st.patient.absorbent.waterContent - 0.005);
          }

          // 1. Halothane Hepatitis Loop
          const isHalothaneActive = st.gasSettings?.agent === 'halothane';
          const faHalo = isHalothaneActive ? currentEtAgent : 0.0;
          let tfaAdducts = st.patient.tfaAdducts || 0.0;
          if (isHalothaneActive) {
              tfaAdducts += 0.03 * faHalo; // generates TFA neoantigens
          }
          st.patient.tfaAdducts = tfaAdducts;

          let ast = st.patient.AST || 25.0;
          let alt = st.patient.ALT || 25.0;
          let bilirubin = st.patient.bilirubin || 1.0;
          let inr = st.patient.inr || 1.0;
          let albumin = st.patient.albumin || 4.0;
          const priorExposure = st.patient.priorAnestheticExposure || false;
          let isHepatitisActive = st.patient.isHepatitisActive || false;

          if (!isHalothaneActive && tfaAdducts > 0) {
              tfaAdducts = Math.max(0, tfaAdducts - 0.02);
          }
          if (tfaAdducts < 1.0) {
              st.patient.halothaneHepatitisRolled = undefined;
          }
          if (tfaAdducts > 15.0 && !isHepatitisActive && st.patient.halothaneHepatitisRolled === undefined) {
              const baseProb = 0.005; // 0.5% base probability when threshold is crossed
              const age = typeof st.patient.age === 'number' ? st.patient.age : 40;
              const isObese = st.patient.isObese || (st.patient.bmi && st.patient.bmi > 30.0);
              const hasRisk = (priorExposure ? 10.0 : 1.0) * (isObese ? 2.0 : 1.0) * (st.patient.sex === 'female' ? 2.0 : 1.0) * (age > 30 && age < 60 ? 2.0 : 1.0);
              const prob = Math.min(1.0, baseProb * hasRisk);
              st.patient.halothaneHepatitisRolled = Math.random() < prob;
              
              if (st.patient.forceHalothaneHepatitis || st.patient.halothaneHepatitisRolled) {
                  isHepatitisActive = true;
                  logEvent("🚨 CRITICAL EMERGENCY: Massive immune-mediated hepatocellular injury (Halothane Hepatitis) has been triggered by toxic trifluoroacetyl (TFA) neoantigens!");
              } else {
                  st.patient.halothaneHepatitisRolled = false;
                  logEvent("⚠️ Clinical Note: High levels of TFA neoantigens detected. Fortunately, immune-mediated Halothane Hepatitis did not trigger (baseline clinical susceptibility is limited).");
              }
          }

          if (isHepatitisActive) {
              ast = Math.min(1500, ast + 15.0);
              alt = Math.min(1600, alt + 18.0);
              bilirubin = Math.min(15.0, bilirubin + 0.1);
              inr = Math.min(4.0, inr + 0.03);
              albumin = Math.max(1.5, albumin - 0.02);
              // Systemic inflammatory response spikes temperature
              newTemp = Math.min(41.0, newTemp + 0.02);
          }

          // Resolution of hepatitis: stop halothane and administer dexamethasone
          const hasDexamethasone = st.activeMeds?.find(m => m.name === 'Dexamethasone')?.Ce > 0.01;
          if (isHepatitisActive && !isHalothaneActive && hasDexamethasone) {
              isHepatitisActive = false;
              logEvent("✅ SUCCESS: Halothane Hepatitis is resolving under high-dose corticosteroid therapy and volatile drug removal.");
          }

          if (!isHepatitisActive && (ast > 25.0 || alt > 25.0)) {
              ast = Math.max(25.0, ast - 5.0);
              alt = Math.max(25.0, alt - 5.0);
              bilirubin = Math.max(1.0, bilirubin - 0.05);
              inr = Math.max(1.0, inr - 0.01);
              albumin = Math.min(4.0, albumin + 0.01);
              newTemp = Math.max(37.0, newTemp - 0.02);
          }
          
          st.patient.AST = ast;
          st.patient.ALT = alt;
          st.patient.bilirubin = bilirubin;
          st.patient.inr = inr;
          st.patient.albumin = albumin;
          st.patient.isHepatitisActive = isHepatitisActive;

          // 2. Methoxyflurane Fluoride-Induced Nephrotoxicity Loop
          const isMethoxyfluraneActive = st.gasSettings?.agent === 'methoxyflurane';
          const faMeth = isMethoxyfluraneActive ? currentEtAgent : 0.0;
          let serumFluoride = st.patient.serumFluoride || 0.0;
          let accumulatedFluorideTime = st.patient.accumulatedFluorideTime || 0.0;

          if (isMethoxyfluraneActive) {
              serumFluoride += 0.5 * faMeth - 0.02 * serumFluoride;
          } else {
              serumFluoride = Math.max(0.0, serumFluoride - 0.05);
          }

          if (serumFluoride > 50.0) {
              // 1s sim = 1min patient time (1/60 hours)
              accumulatedFluorideTime += (serumFluoride - 50.0) * (1.0 / 60.0);
          }
          st.patient.serumFluoride = serumFluoride;
          st.patient.accumulatedFluorideTime = accumulatedFluorideTime;

          let hasFluorideNephrotoxicity = st.patient.hasFluorideNephrotoxicity || false;
          if (serumFluoride < 5.0) {
              st.patient.methoxyfluraneNephrotoxicityRolled = undefined;
          }
          if (accumulatedFluorideTime > 150.0 && !hasFluorideNephrotoxicity && st.patient.methoxyfluraneNephrotoxicityRolled === undefined) {
              const baseProb = 0.15; // 15% base probability when cumulative dose is reached
              const isElderly = typeof st.patient.age === 'number' && st.patient.age > 65;
              const hasRenalDisease = st.patient.isRenal || st.patient.renalFailure || st.patient.hasAki;
              const modifier = (isElderly ? 2.0 : 1.0) * (hasRenalDisease ? 3.0 : 1.0);
              const prob = Math.min(1.0, baseProb * modifier);
              st.patient.methoxyfluraneNephrotoxicityRolled = Math.random() < prob;
              
              if (st.patient.forceMethoxyfluraneNephrotoxicity || st.patient.methoxyfluraneNephrotoxicityRolled) {
                  hasFluorideNephrotoxicity = true;
                  logEvent("🚨 CRITICAL ALERT: Toxic fluoride threshold exceeded (>50 µM for >150 µM-hours)! Methoxyflurane-induced high-output renal failure triggered.");
              } else {
                  st.patient.methoxyfluraneNephrotoxicityRolled = false;
                  logEvent("⚠️ Clinical Note: High accumulated fluoride exposure from Methoxyflurane. Fortunately, severe high-output nephrotoxicity did not trigger (baseline clinical susceptibility is limited).");
              }
          }

          if (hasFluorideNephrotoxicity) {
              st.patient.urineOutputRate = 4.5 * st.patient.weight; // polyuria
              st.patient.urineOsmolality = 300.0; // isosthenuria
              st.patient.feNa = 3.5; // sodium wasting
              st.patient.creatinine = Math.min(8.0, st.patient.creatinine + 0.01);
              st.patient.bun = Math.min(120.0, st.patient.bun + 0.5);
              st.patient.akiStage = 3;
              st.patient.akiDamage = Math.min(1.0, st.patient.akiDamage + 0.005);
              st.patient.hasAki = true;
              // Dehydration increases EBL to drain intravascular volume
              st.patient.ebl = (st.patient.ebl || 0.0) + 1.5;
          }

          // Resolution: stop methoxyflurane and flush
          if (!isMethoxyfluraneActive && serumFluoride < 30.0 && hasFluorideNephrotoxicity) {
              st.patient.urineOutputRate = Math.max(70.0, st.patient.urineOutputRate - 5.0);
              if (st.patient.urineOutputRate <= 70.0) {
                  hasFluorideNephrotoxicity = false;
                  logEvent("✅ SUCCESS: High-output renal failure resolved. Renal concentration function has recovered.");
              }
          }
          st.patient.hasFluorideNephrotoxicity = hasFluorideNephrotoxicity;

          // 3. Carbon Dioxide Absorbent Chemical Degradation
          const isDesfluraneActive = st.gasSettings?.agent === 'desflurane';
          const isIsofluraneActive = st.gasSettings?.agent === 'isoflurane';
          const isSevofluraneActive = st.gasSettings?.agent === 'sevoflurane';

          // Carbon Monoxide Poisoning
          if (st.patient.absorbent.waterContent < 1.4 && (isDesfluraneActive || isIsofluraneActive)) {
              const coRate = isDesfluraneActive ? 0.3 : 0.08;
              st.patient.coHb = Math.min(80.0, (st.patient.coHb || 1.0) + coRate * currentEtAgent);
              if (st.patient.coHb > 15.0 && !st.patient.hasCoPoisoningLog) {
                  logEvent("🚨 CRITICAL EMERGENCY: Desiccated CO2 absorbent reacting with difluoromethyl group! Carbon Monoxide (CO) poisoning in progress.");
                  st.patient.hasCoPoisoningLog = true;
              }
          }

          // Sevoflurane & Compound A
          if (isSevofluraneActive && freshGasFlow < 2.0 && currentEtAgent > 0.1) {
              st.patient.compoundA = (st.patient.compoundA || 0.0) + 0.05 * currentEtAgent * (2.0 - freshGasFlow);
              if (st.patient.compoundA > 150.0 && !st.patient.hasCompoundALog) {
                  logEvent("⚠️ CLINICAL ALERT: Low fresh gas flow with Sevoflurane has produced nephrotoxic Compound A exceeding 150 ppm-hours in the loop!");
                  st.patient.hasCompoundALog = true;
              }
          }

          // Exothermic Canister Reaction & Airway Fire
          if (st.patient.absorbent.waterContent < 1.4 && isSevofluraneActive && currentEtAgent > 0.5) {
              st.patient.absorbent.temperature = (st.patient.absorbent.temperature || 22.0) + 0.5 * currentEtAgent;
              if (st.patient.absorbent.temperature < 40.0) {
                  st.patient.airwayFireRolled = undefined;
              }
              if (st.patient.absorbent.temperature > 80.0 && !st.patient.isAirwayFire && st.patient.airwayFireRolled === undefined) {
                  const baseProb = 0.02; // 2% chance of runaway exothermic reaction leading to active fire
                  st.patient.airwayFireRolled = Math.random() < baseProb;
                  if (st.patient.forceAirwayFire || st.patient.airwayFireRolled) {
                      st.patient.isAirwayFire = true;
                      logEvent("🚨🚨 CRITICAL EMERGENCY: Desiccated CO2 absorbent has undergone a runaway exothermic reaction with Sevoflurane! Canister temperature has exceeded 80°C, melting circuit plastics and triggering an active AIRWAY FIRE!");
                  } else {
                      st.patient.airwayFireRolled = false;
                      logEvent("⚠️ Clinical Note: Carbon dioxide canister temperature is dangerously high (>80°C) due to Sevoflurane reacting with desiccated soda lime. Fortunately, a runaway exothermic ignition did not trigger an active airway fire. Swap the CO2 absorbent canister immediately!");
                  }
              }
          }

          // If airway fire is active, damage respiratory tree and drop SpO2
          if (st.patient.isAirwayFire) {
              ruleSpo2Offset -= 2.0; 
              ruleComplScale *= 0.15;
              rulePipOffset += 30; // PIP spikes
          }

          // 4. Nitrous Oxide-Induced Vitamin B12 & Methionine Synthase Shutdown
          const isN2OActive = currentEtN2O > 30.0;
          let methionineSynthaseActivity = st.patient.methionineSynthaseActivity !== undefined ? st.patient.methionineSynthaseActivity : 1.0;
          let homocysteine = st.patient.homocysteine || 10.0;
          const b12Baseline = st.patient.b12Baseline || 400.0;

          if (isN2OActive && b12Baseline < 200.0) {
              methionineSynthaseActivity = Math.max(0.0, methionineSynthaseActivity - 0.05);
              if (methionineSynthaseActivity === 0.0 && !st.patient.hasB12ShutdownLog) {
                  logEvent("🚨 CRITICAL ALERT: Nitrous Oxide has irreversibly oxidized Vitamin B12, causing complete shutdown of Methionine Synthase activity!");
                  st.patient.hasB12ShutdownLog = true;
              }
          }

          if (methionineSynthaseActivity < 0.2) {
              homocysteine += 1.5;
              if (homocysteine > 100.0 && !st.patient.hasHomocysteineLog) {
                  logEvent("🚨 WARNING: Severe hyperhomocysteinemia! Vascular endothelial inflammation and risk of subacute combined degeneration of the spinal cord is high.");
                  st.patient.hasHomocysteineLog = true;
              }
          }
          st.patient.methionineSynthaseActivity = methionineSynthaseActivity;
          st.patient.homocysteine = homocysteine;

          // 5. Pediatric Anesthesia Neurodevelopmental Risk & Postoperative Cognitive Decline (POCD)
          let pediatricNeuroRisk = st.patient.pediatricNeuroRisk || 0.0;
          let pocdRisk = st.patient.pocdRisk || 0.0;
          const isAnestheticActive = currentMac > 0.4 || (propofolCe || 0) > 0.5;

          if (isAnestheticActive && st.time > 240.0) { // >4 hours exposure
              if (st.patient.age < 2.0) {
                  pediatricNeuroRisk += 0.05;
                  if (pediatricNeuroRisk > 5.0 && !st.patient.hasPediatricNeuroLog) {
                      logEvent("🚨 CLINICAL ALERT: Prolonged exposure to general anesthesia in a patient under 2 years old has exceeded 4 hours. Neurodevelopmental apoptotic injury risk is accumulating.");
                      st.patient.hasPediatricNeuroLog = true;
                  }
              } else if (st.patient.age > 65.0) {
                  pocdRisk += 0.05;
                  if (pocdRisk > 5.0 && !st.patient.hasPocdLog) {
                      logEvent("🚨 CLINICAL ALERT: Prolonged exposure to general anesthesia in an elderly patient has exceeded 4 hours. Postoperative Cognitive Decline (POCD) risk is accumulating.");
                      st.patient.hasPocdLog = true;
                  }
              }
          }
          st.patient.pediatricNeuroRisk = pediatricNeuroRisk;
          st.patient.pocdRisk = pocdRisk;
          
          // === CHAPTER 21: PULMONARY PHARMACOLOGY & RESPIRATORY DRIVE ===
          const activeAgent = st.gasSettings?.agent;
          const agentMac = currentMac; // cumulative MAC

          // 1. Cilia Beat Frequency & Mucus Transport
          let ciliaBeatFrequency = st.patient.ciliaBeatFrequency !== undefined ? st.patient.ciliaBeatFrequency : 100.0;
          ciliaBeatFrequency = 100.0 - 25.0 * agentMac - (st.patient.tobaccoSmoker ? 30.0 : 0.0) - (st.gasSettings?.freshGasFlow > 5.0 ? 15.0 : 0.0);
          ciliaBeatFrequency = Math.max(10.0, ciliaBeatFrequency);
          st.patient.ciliaBeatFrequency = ciliaBeatFrequency;

          let ciliaryAtelectasisAccumulation = st.patient.ciliaryAtelectasisAccumulation || 0.0;
          let isMucusPlugged = st.patient.isMucusPlugged || false;
          if (ciliaBeatFrequency < 45.0) {
              ciliaryAtelectasisAccumulation += 0.015 * (45.0 - ciliaBeatFrequency) / 100.0;
              if (ciliaryAtelectasisAccumulation < 0.1) {
                  st.patient.mucusPlugRolled = undefined;
              }
              if (ciliaryAtelectasisAccumulation > 3.0 && !isMucusPlugged && st.patient.mucusPlugRolled === undefined) {
                  const baseProb = 0.05; // 5% base chance of thick mucus plug forming
                  const hasRisk = (st.patient.tobaccoSmoker ? 2.0 : 1.0) * (st.patient.copd ? 2.0 : 1.0) * (st.patient.asthma ? 2.0 : 1.0);
                  const prob = Math.min(1.0, baseProb * hasRisk);
                  st.patient.mucusPlugRolled = Math.random() < prob;
                  
                  if (st.patient.forceMucusPlug || st.patient.mucusPlugRolled) {
                      isMucusPlugged = true;
                      logEvent("🚨 CLINICAL ALERT: Severe ciliary beat frequency inhibition and mucous pooling have produced a focal mucous plug in the main bronchus!");
                  } else {
                      st.patient.mucusPlugRolled = false;
                      logEvent("⚠️ Clinical Note: Inadequate ciliary clearance and dry gases present. Fortunately, a focal mainstem bronchus mucus plug did not consolidate (occurs in ~5% of un-humidified circuits over time).");
                  }
              }
          }
          st.patient.ciliaryAtelectasisAccumulation = ciliaryAtelectasisAccumulation;
          st.patient.isMucusPlugged = isMucusPlugged;

          // 2. Surfactant Production (Alveolar Type II cells)
          let surfactantProduction = st.patient.surfactantProduction !== undefined ? st.patient.surfactantProduction : 100.0;
          surfactantProduction = Math.max(10.0, 100.0 - 20.0 * agentMac * (st.time > 600 ? 1.5 : 1.0));
          st.patient.surfactantProduction = surfactantProduction;

          // 3. Hypoxic Pulmonary Vasoconstriction (HPV) Inhibition
          let hpvInhibition = 0.0;
          if (activeAgent && activeAgent !== 'xenon') {
              hpvInhibition = Math.min(0.80, agentMac * 0.20); // 20% at 1 MAC
          }
          st.patient.hpvInhibition = hpvInhibition;

          // 4. Rib Cage vs Diaphragmatic breathing contributions
          let intercostalContribution = Math.max(0.1, 1.0 - 0.7 * agentMac);
          let diaphragmContribution = Math.max(0.5, 1.0 - 0.15 * agentMac);
          st.patient.intercostalContribution = intercostalContribution;
          st.patient.diaphragmContribution = diaphragmContribution;

          let isParadoxicalBreathing = st.patient.isParadoxicalBreathing || false;
          if (intercostalContribution < 0.4 && !isParadoxicalBreathing && !st.patient.isParalyzed && !st.patient.isApneic && st.patient.ventilationStatus === 'spontaneous') {
              isParadoxicalBreathing = true;
              logEvent("⚠️ CLINICAL ALERT: Rib cage muscle activity is severely depressed compared to the diaphragm. Paradoxical (abdominal) breathing observed.");
          }
          if ((intercostalContribution >= 0.4 || st.patient.isParalyzed || st.patient.isApneic) && isParadoxicalBreathing) {
              isParadoxicalBreathing = false;
          }
          st.patient.isParadoxicalBreathing = isParadoxicalBreathing;

          // 5. Genioglossus muscle tone & upper airway obstruction
          let dilatorMuscleTone = 1.0;
          dilatorMuscleTone = Math.max(0.01, 1.0 - maxNMJOccupancy - 0.7 * Math.min(1.0, propofolCe / 4.0) - 0.5 * Math.min(1.5, agentMac));
          st.patient.dilatorMuscleTone = dilatorMuscleTone;

          // Airway Obstruction Index
          let isAirwayObstruction = st.patient.isAirwayObstruction || false;
          const isOsa = st.patient.pulmonaryComorbidity?.toLowerCase().includes('osa') || st.patient.osa || false;
          const pcrit = isOsa ? 1.0 : -5.0;
          let airwayObstructionIndex = 0.0;
          
          if (!st.patient.airwaySecured && st.patient.ventilationStatus === 'spontaneous') {
              airwayObstructionIndex = Math.max(0.0, Math.min(1.0, (1.0 - dilatorMuscleTone) * (pcrit + 6.0) / 7.0));
              if (airwayObstructionIndex > 0.6 && !isAirwayObstruction) {
                  isAirwayObstruction = true;
                  logEvent("🚨 CRITICAL ALERT: Upper airway obstruction! Genioglossus muscle tone is insufficient to maintain pharyngeal patency. Patient is snoring/obstructed.");
              }
          }
          if (st.patient.airwaySecured || st.patient.ventilationStatus !== 'spontaneous' || airwayObstructionIndex <= 0.3) {
              if (isAirwayObstruction) {
                  isAirwayObstruction = false;
                  logEvent("✅ SUCCESS: Upper airway obstruction resolved.");
              }
          }
          st.patient.airwayObstructionIndex = airwayObstructionIndex;
          st.patient.isAirwayObstruction = isAirwayObstruction;

          // 6. Bronchial Smooth Muscle Calcium Concentration (for bronchodilation)
          let bronchialSmoothMuscleCa = 1.0;
          if (activeAgent && activeAgent !== 'xenon') {
              bronchialSmoothMuscleCa = Math.max(0.2, 1.0 - 0.5 * agentMac);
          }
          st.patient.bronchialSmoothMuscleCa = bronchialSmoothMuscleCa;

          // 7. Atelectasis accumulation
          let atelectasis = st.patient.atelectasis !== undefined ? st.patient.atelectasis : 0.0;
          const currentFiO2Val = st.patient.airwaySecured ? Number(deliveredFiO2) : Number(st.patient.currentFiO2 || 21);
          const currentPeepVal = st.ventSettings?.peep || 0;
          
          if (currentFiO2Val > 21) {
              const rateBase = 0.0005 * ((currentFiO2Val - 21) / 79.0) - 0.0002 * currentPeepVal;
              const paralyzeFactor = st.patient.isParalyzed ? 2.0 : 1.0;
              const obeseFactor = st.patient.isObese ? 1.5 : 1.0;
              const change = rateBase * paralyzeFactor * obeseFactor;
              if (change > 0) {
                  atelectasis = Math.min(1.0, atelectasis + change);
              } else {
                  atelectasis = Math.max(0.0, atelectasis + change * 0.1);
              }
          } else {
              atelectasis = Math.max(0.0, atelectasis - 0.001);
          }
          
          if (currentPeepVal > 0) {
              atelectasis = Math.max(0.0, atelectasis - 0.002 * currentPeepVal);
          }
          st.patient.atelectasis = atelectasis;
          
          // CO2 absorbent canister depletion
          let co2AbsorptiveCapacity = st.patient.co2AbsorptiveCapacity !== undefined ? st.patient.co2AbsorptiveCapacity : 100.0;
          if (st.patient.breathingCircuitType === 'circle' && !st.patient.isApneic) {
              const co2ProductionFactor = shiveringMultiplier * seizureMetabolicMultiplier;
              co2AbsorptiveCapacity = Math.max(0.0, co2AbsorptiveCapacity - 0.015 * co2ProductionFactor);
          }
          st.patient.co2AbsorptiveCapacity = co2AbsorptiveCapacity;

          if (co2AbsorptiveCapacity < 10.0 && !st.patient.hasAbsorbentExhaustedLog) {
              st.patient.hasAbsorbentExhaustedLog = true;
              logEvent("⚠️ CLINICAL ALERT: CO2 absorbent is nearly exhausted (capacity < 10%). Inspired CO2 (FiCO2) is rising!");
          }
          if (co2AbsorptiveCapacity >= 10.0 && st.patient.hasAbsorbentExhaustedLog) {
              st.patient.hasAbsorbentExhaustedLog = false;
          }

          if (st.patient.hasPneumothorax && !st.patient.hasPneumothoraxWarningLogged) {
              st.patient.hasPneumothoraxWarningLogged = true;
              logEvent("🚨 CRITICAL EMERGENCY: Tension pneumothorax! Compliance collapsed by 75% and venous return compromised. SBP and MAP are crashing. Perform needle decompression immediately!");
          }
          if (!st.patient.hasPneumothorax && st.patient.hasPneumothoraxWarningLogged) {
              st.patient.hasPneumothoraxWarningLogged = false;
          }
          
          // Merge these properties to patientAfterFluidics as well
          Object.assign(patientAfterFluidics, {
              hasPneumothoraxWarningLogged: st.patient.hasPneumothoraxWarningLogged,
              tfaAdducts: st.patient.tfaAdducts,
              AST: st.patient.AST,
              ALT: st.patient.ALT,
              bilirubin: st.patient.bilirubin,
              inr: st.patient.inr,
              albumin: st.patient.albumin,
              isHepatitisActive: st.patient.isHepatitisActive,
              serumFluoride: st.patient.serumFluoride,
              accumulatedFluorideTime: st.patient.accumulatedFluorideTime,
              hasFluorideNephrotoxicity: st.patient.hasFluorideNephrotoxicity,
              coHb: st.patient.coHb,
              compoundA: st.patient.compoundA,
              absorbent: st.patient.absorbent,
              isAirwayFire: st.patient.isAirwayFire,
              methionineSynthaseActivity: st.patient.methionineSynthaseActivity,
              homocysteine: st.patient.homocysteine,
              pediatricNeuroRisk: st.patient.pediatricNeuroRisk,
              pocdRisk: st.patient.pocdRisk,
              ciliaBeatFrequency: st.patient.ciliaBeatFrequency,
              ciliaryAtelectasisAccumulation: st.patient.ciliaryAtelectasisAccumulation,
              isMucusPlugged: st.patient.isMucusPlugged,
              surfactantProduction: st.patient.surfactantProduction,
              hpvInhibition: st.patient.hpvInhibition,
              intercostalContribution: st.patient.intercostalContribution,
              diaphragmContribution: st.patient.diaphragmContribution,
              isParadoxicalBreathing: st.patient.isParadoxicalBreathing,
              dilatorMuscleTone: st.patient.dilatorMuscleTone,
              airwayObstructionIndex: st.patient.airwayObstructionIndex,
              isAirwayObstruction: st.patient.isAirwayObstruction,
              bronchialSmoothMuscleCa: st.patient.bronchialSmoothMuscleCa,
              atelectasis: st.patient.atelectasis,
              isO2PipelineCrossover: st.patient.isO2PipelineCrossover,
              isO2CylinderOpen: st.patient.isO2CylinderOpen,
              isO2PipelineDisconnected: st.patient.isO2PipelineDisconnected,
              isOxygenFlushPressed: st.patient.isOxygenFlushPressed,
              breathingCircuitType: st.patient.breathingCircuitType,
              co2AbsorptiveCapacity: st.patient.co2AbsorptiveCapacity,
              stuckExpiratoryValve: st.patient.stuckExpiratoryValve,
              stuckInspiratoryValve: st.patient.stuckInspiratoryValve,
              aplValveSetting: st.patient.aplValveSetting,
              hasPneumothorax: st.patient.hasPneumothorax
          });

          const totalMetabolicMultiplier = shiveringMultiplier * seizureMetabolicMultiplier;
          const VO2_sec = (0.250 * totalMetabolicMultiplier * cyanideVO2Mod) / 60;
          // eslint-disable-next-line no-unused-vars
          const VCO2_sec = (0.200 * totalMetabolicMultiplier) / 60;
          const opioidRRDrop = opioidEff * 10;

          // Pain Engine Tick
          if (st.surgicalPhase === 'Incision' && st.patient.incisionStartTime === undefined) {
              st.patient.incisionStartTime = st.time;
          }

          const isTASK1 = st.patient.isTASK1Knockout;
          const isTASK3 = st.patient.isTASK3Knockout;
          const isTREK1 = st.patient.isTREK1Knockout;
          const macKnockoutResistFactor = 1.0 * (isTASK1 ? 1.3 : 1.0) * (isTASK3 ? 1.4 : 1.0) * (isTREK1 ? 1.5 : 1.0);
          const painOutput = PainEngine.tick(1, st.patient, st.vitals, st.activeMeds, currentMac / macKnockoutResistFactor, st.time);
          
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

          const aggregateHypnosis = Math.min(1.0, sedativeEff + opioidEff + 1.8 * sedativeEff * opioidEff);
          const hrSympatheticSpike = painOutput.hrSpike + awarenessHrOffset;
          const contractilitySympatheticSpike = painOutput.contractilitySpike + (awarenessHrOffset > 0 ? 0.3 : 0.0);
          const svrSympatheticSpike = painOutput.svrSpike + awarenessSvrOffset;

          // Anaphylaxis triggers
          const unasynModel = st.activeMeds?.find(m => m.name === 'Ampicillin/Sulbactam');
          const unasynCe = unasynModel ? unasynModel.Ce : 0;
          let anaphylaxisTriggered = st.patient.anaphylaxisTriggered || false;
          let anaphylaxisSvrMod = 1.0;
          let anaphylaxisCompliancePenalty = 0;
          let anaphylaxisResistancePenalty = 0;
          let anaphylaxisHrMod = 0;

          if (unasynCe < 0.01) {
              st.patient.penicillinAnaphylaxisRolled = undefined;
          }

          if (unasynCe > 0.05 && (st.patient.penicillinAllergy || (st.patient.allergies && st.patient.allergies.toLowerCase().includes('penicillin'))) && !anaphylaxisTriggered) {
              if (st.patient.penicillinAnaphylaxisRolled === undefined) {
                  const baseProb = 0.02;
                  const hasRisk = st.patient.copd || st.patient.asthma || st.patient.atopic || st.patient.highAnxiety;
                  const prob = Math.min(1.0, baseProb * (hasRisk ? 4.0 : 1.0));
                  st.patient.penicillinAnaphylaxisRolled = Math.random() < prob;
              }
              if (st.patient.forcePenicillinAnaphylaxis || st.patient.penicillinAnaphylaxisRolled) {
                  anaphylaxisTriggered = true;
                  st.patient.anaphylaxisTriggered = true;
                  st.patient.anaphylaxisTime = st.time;
                  logEvent(`🚨 CRITICAL EMERGENCY: Penicillin-containing Ampicillin/Sulbactam administered to a patient with severe Penicillin Allergy! Triggered hyperacute IgE-mediated anaphylactic shock! (Profound vasoplegic hypotension, severe bronchospasm, extreme airway resistance).`);
              } else {
                  st.patient.penicillinAnaphylaxisRolled = false;
                  logEvent(`⚠️ Clinical Note: Penicillin-containing Ampicillin/Sulbactam administered to allergy-documented patient. Fortunately, no acute anaphylaxis occurred (only ~2% baseline clinical incidence).`);
              }
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

          // 1. PRIS (Propofol Infusion Syndrome)
          // propofolModel and propofolCe are already declared in this scope above
          const safePatientWeight = typeof st.patient.weight === 'number' && Number.isFinite(st.patient.weight) && st.patient.weight > 0 ? st.patient.weight : 70;
          let currentPrisAccum = st.patient.prisAccumulation || 0;
          let prisTriggered = st.patient.prisTriggered || false;
          
          if (propofolModel && propofolModel.currentInfusionRate > 0) {
              const rateMcgKgMin = (propofolModel.currentInfusionRate * 1000 * 60) / safePatientWeight;
              if (rateMcgKgMin > 67.0) {
                  currentPrisAccum += 1;
              }
          }
          if (currentPrisAccum === 0) {
              st.patient.prisRolled = undefined;
          }
          if (currentPrisAccum > 120 && !prisTriggered) {
              if (st.patient.prisRolled === undefined) {
                  const baseProb = 0.05;
                  const isYoung = typeof st.patient.age === 'number' && st.patient.age < 12;
                  const modifier = (st.patient.isSeptic || st.patient.trauma || isYoung) ? 4.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.prisRolled = Math.random() < prob;
              }
              if (st.patient.forcePris || st.patient.prisRolled) {
                  prisTriggered = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Propofol Infusion Syndrome (PRIS) triggered! The patient has developed profound metabolic acidosis, hyperkalemia, rhabdomyolysis, and progressive myocardial failure!`);
              } else {
                  st.patient.prisRolled = false;
                  logEvent(`⚠️ Clinical Note: Propofol infusion rate was maintained above 67 mcg/kg/min for a prolonged period. Fortunately, PRIS did not manifest (occurs in <5% of cases). Close monitoring of pH and potassium is advised.`);
              }
          }
          
          let currentK = fluidicsOutput.electrolytes.k;
          let stunning = st.patient.myocardialStunning || 0;
          
          if (prisTriggered) {
              const isInfusing = propofolModel && propofolModel.currentInfusionRate > 0;
              if (isInfusing) {
                  currentK += 0.03; // Progressive hyperkalemia from rhabdo
                  currentLactate += 0.08; // Progressive metabolic acidosis
                  stunning = Math.min(85, stunning + 0.5); // Myocardial stunning
              } else {
                  // Recovery if propofol is stopped
                  currentK = Math.max(4.0, currentK - 0.01);
                  currentLactate = Math.max(1.0, currentLactate - 0.015);
                  stunning = Math.max(0, stunning - 0.2);
              }
              
              // Treatment with Bicarbonate shifts K and treats acidosis
              const bicarbModel = st.activeMeds?.find(m => m.name === 'Bicarbonate');
              if (bicarbModel && bicarbModel.Ce > 0.02) {
                  currentK = Math.max(4.0, currentK - 0.05);
                  currentLactate = Math.max(1.0, currentLactate - 0.1);
              }
          }
          
          // Save updated potassium in fluidicsOutput.electrolytes
          fluidicsOutput.electrolytes.k = currentK;
          st.patient.prisAccumulation = currentPrisAccum;
          st.patient.prisTriggered = prisTriggered;
          st.patient.myocardialStunning = stunning;
          patientAfterFluidics.prisAccumulation = currentPrisAccum;
          patientAfterFluidics.prisTriggered = prisTriggered;
          patientAfterFluidics.myocardialStunning = stunning;

          // 2. Adrenocortical Suppression
          // etomidateModel and etomidateCe are already declared in this scope above
          let cortisol = st.patient.cortisolLevel !== undefined ? st.patient.cortisolLevel : 15.0;
          let adrenalSuppressionActive = st.patient.adrenalSuppressionActive || false;
          
          if (etomidateCe < 0.01) {
              st.patient.adrenalSuppressionRolled = undefined;
          }
          if (etomidateCe > 0.05 && !adrenalSuppressionActive) {
              if (st.patient.adrenalSuppressionRolled === undefined) {
                  const baseProb = 0.10;
                  const isElderly = typeof st.patient.age === 'number' && st.patient.age > 65;
                  const modifier = (st.patient.isSeptic || st.patient.trauma || isElderly) ? 5.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.adrenalSuppressionRolled = Math.random() < prob;
              }
              if (st.patient.forceAdrenalSuppression || st.patient.adrenalSuppressionRolled) {
                  adrenalSuppressionActive = true;
                  logEvent(`🚨 CLINICAL ALERT: Etomidate administration has inhibited 11-beta-hydroxylase, triggering adrenocortical suppression! Cortisol production has shut down, blunting endogenous sympathetic tone and vascular responsiveness to catecholamines.`);
              } else {
                  st.patient.adrenalSuppressionRolled = false;
                  logEvent(`⚠️ Clinical Note: Etomidate was administered. While biochemically 11-beta-hydroxylase inhibition occurs, no acute adrenocortical suppression or sympathetic blunting occurred in this patient (occurs in ~10% of elective cases).`);
              }
          }
          
          const dexaModel = st.activeMeds?.find(m => m.name === 'Dexamethasone');
          const dexaCe = dexaModel ? dexaModel.Ce : 0;
          if (dexaCe > 0.01 && adrenalSuppressionActive) {
              adrenalSuppressionActive = false;
              cortisol = 15.0;
              logEvent(`✅ SUCCESS: Dexamethasone administered! Corticosteroid activity restored, reversing etomidate-induced adrenocortical suppression and restoring vasopressor sensitivity.`);
          }
          
          if (adrenalSuppressionActive) {
              cortisol = Math.max(1.5, cortisol - 0.1);
          } else {
              cortisol = Math.min(15.0, cortisol + 0.15);
          }
          
          st.patient.cortisolLevel = cortisol;
          st.patient.adrenalSuppressionActive = adrenalSuppressionActive;
          patientAfterFluidics.cortisolLevel = cortisol;
          patientAfterFluidics.adrenalSuppressionActive = adrenalSuppressionActive;

          // 3. Ketamine Emergence Delirium
          // ketamineModel/ketamineCe already declared above (~L1213-1214)
          let emergenceDeliriumTriggered = st.patient.emergenceDeliriumTriggered || false;
          let deliriumHrMod = 0;
          let deliriumMapMod = 0;
          
          if (ketamineCe < 0.01) {
              st.patient.emergenceDeliriumRolled = undefined;
          }
          if (ketamineCe > 0.4) {
              st.patient.ketaminePeakAchieved = true;
              patientAfterFluidics.ketaminePeakAchieved = true;
          }
          if (ketamineCe > 0.02 && ketamineCe < 0.25 && sedativeEff < 0.2 && !emergenceDeliriumTriggered && st.patient.ketaminePeakAchieved) {
              if (st.patient.emergenceDeliriumRolled === undefined) {
                  const baseProb = 0.15;
                  const isAgeExtreme = typeof st.patient.age === 'number' && (st.patient.age < 18 || st.patient.age > 65);
                  const modifier = (st.patient.highAnxiety || st.patient.trauma || isAgeExtreme) ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.emergenceDeliriumRolled = Math.random() < prob;
              }
              if (st.patient.forceEmergenceDelirium || st.patient.emergenceDeliriumRolled) {
                  emergenceDeliriumTriggered = true;
                  logEvent(`🚨 CLINICAL WARNING: Patient is emerging from Ketamine anesthesia and experiencing Emergence Delirium! Signs include severe psychomotor agitation, visual hallucinations, sialorrhea, tachycardia, and hypertension.`);
              } else {
                  st.patient.emergenceDeliriumRolled = false;
                  st.patient.ketaminePeakAchieved = false;
                  patientAfterFluidics.ketaminePeakAchieved = false;
                  logEvent(`⚠️ Clinical Note: Patient emerged from Ketamine anesthesia. No emergence delirium occurred (occurs in ~15% of cases without co-administered sedatives).`);
              }
          }
          if (emergenceDeliriumTriggered) {
              if (sedativeEff > 0.35) {
                  emergenceDeliriumTriggered = false;
                  logEvent(`✅ SUCCESS: Sedative administered! Emergence delirium successfully suppressed.`);
              } else {
                  deliriumHrMod = 20;
                  deliriumMapMod = 25;
                  
                  // In un-intubated patients, saliva can trigger laryngospasm
                  if (!st.patient.airwaySecured && st.patient.laryngospasm === false && Math.random() < 0.02) {
                      st.patient.laryngospasm = true;
                      patientAfterFluidics.laryngospasm = true;
                      logEvent(`🚨 CRITICAL ALERT: Sialorrhea from Ketamine emergence delirium has triggered a Laryngospasm! Airway resistance is now infinite.`);
                  }
              }
          }
          
          st.patient.emergenceDeliriumTriggered = emergenceDeliriumTriggered;
          patientAfterFluidics.emergenceDeliriumTriggered = emergenceDeliriumTriggered;

          // 4. Barbiturate Arterial Precipitation
          let barbiturateArterialPrecipitation = st.patient.barbiturateArterialPrecipitation || false;
          let arterialIschemiaHrMod = 0;
          let arterialIschemiaMapMod = 0;
          
          if (barbiturateArterialPrecipitation) {
              const lidoModel = st.activeMeds?.find(m => m.name === 'Lidocaine');
              const lidoCe = lidoModel ? lidoModel.Ce : 0;
              const papModel = st.activeMeds?.find(m => m.name === 'Papaverine');
              const papCe = papModel ? papModel.Ce : 0;
              
              if (lidoCe > 0.05 || papCe > 0.05) {
                  barbiturateArterialPrecipitation = false;
                  st.patient.barbiturateArterialPrecipitation = false;
                  logEvent(`✅ SUCCESS: Vasodilator administered into arterial line! Profound arterial vasospasm resolved, crystals dissolved, and distal tissue perfusion restored.`);
              } else {
                  arterialIschemiaHrMod = 30;
                  arterialIschemiaMapMod = 40;
              }
          }
          
          st.patient.barbiturateArterialPrecipitation = barbiturateArterialPrecipitation;
          patientAfterFluidics.barbiturateArterialPrecipitation = barbiturateArterialPrecipitation;

          // 5. Benzodiazepine Withdrawal Seizures
          const flumModel = st.activeMeds?.find(m => m.name === 'Flumazenil');
          const flumCe = flumModel ? flumModel.Ce : 0;
          // isSeizure and seizureMetabolicMultiplier are already declared in this scope above
          
          if (flumCe < 0.01) {
              st.patient.benzoWithdrawalSeizureRolled = undefined;
          }
          if (flumCe > 0.02 && st.patient.chronicBenzoUse && !st.patient.benzoWithdrawalSeizureTriggered && st.patient.benzoWithdrawalSeizureRolled === undefined) {
              if (st.patient.benzoWithdrawalSeizureRolled === undefined) {
                  const baseProb = 0.10;
                  const modifier = (st.patient.isSeptic || st.patient.trauma || st.patient.highAnxiety) ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.benzoWithdrawalSeizureRolled = Math.random() < prob;
              }
              if (st.patient.forceBenzoWithdrawalSeizure || st.patient.benzoWithdrawalSeizureRolled) {
                  st.patient.benzoWithdrawalSeizureTriggered = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Flumazenil administered to a chronic benzodiazepine user! Triggered acute benzodiazepine withdrawal tonic-clonic seizures! Metabolic rate has surged, causing severe hypoxia risk.`);
              } else {
                  st.patient.benzoWithdrawalSeizureRolled = false;
                  logEvent(`⚠️ Clinical Note: Flumazenil was administered to a chronic benzodiazepine user. While acute withdrawal or anxiety commonly occurs, no withdrawal seizures were triggered (occurs in ~10% of cases).`);
              }
          }
          if (st.patient.benzoWithdrawalSeizureTriggered) {
              if (propofolCe > 1.2 || midazolamCe > 0.08) {
                  st.patient.benzoWithdrawalSeizureTriggered = false;
                  logEvent(`✅ SUCCESS: Anticonvulsant sedative administered. Seizure activity aborted.`);
              } else {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
              }
          }
          
          st.patient.isSeizure = isSeizure;
          patientAfterFluidics.isSeizure = isSeizure;

          // ==========================================
          // CHAPTER 24: OPIOID CRITICAL SCENARIOS
          // ==========================================
          const fentanylCe = st.activeMeds?.find(m => m.name === 'Fentanyl')?.Ce || 0;
          const remifentanilCe = st.activeMeds?.find(m => m.name === 'Remifentanil')?.Ce || 0;
          const sufentanilCe = st.activeMeds?.find(m => m.name === 'Sufentanil')?.Ce || 0;
          const morphineCe = st.activeMeds?.find(m => m.name === 'Morphine')?.Ce || 0;
          const hydromorphoneCe = st.activeMeds?.find(m => m.name === 'Hydromorphone')?.Ce || 0;

          // 1. Opioid-Induced Chest Wall Rigidity ("Wooden Chest Syndrome")
          let opioidRigidityActive = st.patient.opioidRigidityActive || false;
          if (fentanylCe < 0.0002 && remifentanilCe < 0.0002 && sufentanilCe < 0.00002) {
              st.patient.opioidRigidityRolled = undefined;
          }
          if (!opioidRigidityActive && maxNMJOccupancy < 0.8 && naloxoneCe < 0.001) {
              const hasHighOpioids = fentanylCe > 0.0015 || remifentanilCe > 0.003 || sufentanilCe > 0.00015;
              if (hasHighOpioids && st.patient.opioidRigidityRolled === undefined) {
                  if (st.patient.opioidRigidityRolled === undefined) {
                      const baseProb = 0.03;
                      const isAgeExtreme = typeof st.patient.age === 'number' && (st.patient.age < 12 || st.patient.age > 65);
                      const modifier = (isAgeExtreme || (sedativeEff < 0.1)) ? 4.0 : 1.0;
                      const prob = Math.min(1.0, baseProb * modifier);
                      st.patient.opioidRigidityRolled = Math.random() < prob;
                  }
                  if (st.patient.forceOpioidRigidity || st.patient.opioidRigidityRolled) {
                      opioidRigidityActive = true;
                      logEvent("🚨 CRITICAL EMERGENCY: Rapid bolus of potent lipophilic opioids has triggered Opioid-Induced Chest Wall Rigidity ('Wooden Chest Syndrome')! The chest wall is locked, compliance has dropped to 3 mL/cmH2O, and airway resistance is 999 cmH2O/L/s, making manual/bag-mask ventilation impossible.");
                  } else {
                      st.patient.opioidRigidityRolled = false;
                      logEvent("⚠️ Clinical Note: High dose of potent lipophilic opioid administered. Fortunately, chest wall rigidity was not triggered (baseline incidence ~3%). Spontaneous or manual ventilation remains patent.");
                  }
              }
          }
          if (opioidRigidityActive) {
              if (maxNMJOccupancy >= 0.8) {
                  opioidRigidityActive = false;
                  logEvent("✅ SUCCESS: Muscle relaxant administered! Nicotinic acetylcholine receptor blockade has resolved chest wall rigidity and restored chest wall compliance.");
              } else if (naloxoneCe > 0.001) {
                  opioidRigidityActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Competitive mu-receptor antagonism has resolved chest wall rigidity.");
              }
          }
          st.patient.opioidRigidityActive = opioidRigidityActive;
          patientAfterFluidics.opioidRigidityActive = opioidRigidityActive;

          // 2. Remifentanil-Induced Hyperalgesia (OIH)
          let remifentanilInfusionDuration = st.patient.remifentanilInfusionDuration || 0;
          let remifentanilHyperalgesiaActive = st.patient.remifentanilHyperalgesiaActive || false;
          const remiModel = st.activeMeds?.find(m => m.name === 'Remifentanil');
          const remiInfRate = remiModel ? remiModel.currentInfusionRate : 0;

          if (remiInfRate > 0.15 || remifentanilCe > 0.003) {
              remifentanilInfusionDuration += 1;
              st.patient.remiHyperalgesiaRolled = undefined;
          }

          if (remifentanilInfusionDuration > 180 && remiInfRate === 0 && remifentanilCe < 0.0005 && !remifentanilHyperalgesiaActive && st.patient.remiHyperalgesiaRolled === undefined) {
              if (st.patient.remiHyperalgesiaRolled === undefined) {
                  const baseProb = 0.15;
                  const modifier = (st.patient.highAnxiety || st.patient.sex === 'female') ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.remiHyperalgesiaRolled = Math.random() < prob;
              }
              if (st.patient.forceRemifentanilHyperalgesia || st.patient.remiHyperalgesiaRolled) {
                  remifentanilHyperalgesiaActive = true;
                  logEvent("🚨 CLINICAL ALERT: Prolonged high-dose Remifentanil infusion has been discontinued, triggering acute Opioid-Induced Hyperalgesia (OIH)! Central glutamate and substance P sensitization has amplified nociceptive transmission.");
              } else {
                  st.patient.remiHyperalgesiaRolled = false;
                  remifentanilInfusionDuration = 0;
                  logEvent("⚠️ Clinical Note: Prolonged Remifentanil infusion discontinued. Fortunately, no acute opioid-induced hyperalgesia (OIH) was triggered (baseline incidence ~15%).");
              }
          }

          // Prevention/Resolution by Ketamine or Magnesium
          const magnesiumModel = st.activeMeds?.find(m => m.name === 'Magnesium Sulfate');
          const magnesiumCe = magnesiumModel ? magnesiumModel.Ce : 0;

          if (remifentanilHyperalgesiaActive && (ketamineCe > 0.05 || magnesiumCe > 1.0)) {
              remifentanilHyperalgesiaActive = false;
              remifentanilInfusionDuration = 0; // reset
              logEvent("✅ SUCCESS: NMDA antagonist administered! Central hyperalgesia pathways blocked, successfully reversing opioid-induced hyperalgesia.");
          }

          st.patient.remifentanilInfusionDuration = remifentanilInfusionDuration;
          st.patient.remifentanilHyperalgesiaActive = remifentanilHyperalgesiaActive;
          patientAfterFluidics.remifentanilInfusionDuration = remifentanilInfusionDuration;
          patientAfterFluidics.remifentanilHyperalgesiaActive = remifentanilHyperalgesiaActive;

          // 3. Sphincter of Oddi Spasm
          let sphincterOfOddiSpasmActive = st.patient.sphincterOfOddiSpasmActive || false;
          if (morphineCe < 0.01 && fentanylCe < 0.0002) {
              st.patient.sphincterOfOddiRolled = undefined;
          }
          if (!sphincterOfOddiSpasmActive) {
              const hasTriggerAgonists = morphineCe > 0.04 || fentanylCe > 0.001;
              if (hasTriggerAgonists && st.patient.sphincterOfOddiRolled === undefined) {
                  if (st.patient.sphincterOfOddiRolled === undefined) {
                      const baseProb = 0.02;
                      const isElderly = typeof st.patient.age === 'number' && st.patient.age > 50;
                      let modifier = 1.0;
                      if (st.patient.biliaryDisease || st.patient.cholecystectomy) {
                          modifier = 10.0;
                      } else if (isElderly) {
                          modifier = 4.0;
                      }
                      const prob = Math.min(1.0, baseProb * modifier);
                      st.patient.sphincterOfOddiRolled = Math.random() < prob;
                  }
                  if (st.patient.forceSphincterOfOddiSpasm || st.patient.sphincterOfOddiRolled) {
                      sphincterOfOddiSpasmActive = true;
                      logEvent("🚨 CLINICAL ALERT: Opioid administration has induced spasm of the sphincter of Oddi! Common bile duct pressure has spiked, causing severe biliary colic pain.");
                  } else {
                      st.patient.sphincterOfOddiRolled = false;
                      logEvent("⚠️ Clinical Note: Opioids administered. Sphincter of Oddi tone remained stable (biliary spasm occurs in ~2% of patients).");
                  }
              }
          }
          let oddiHrMod = 0;
          let oddiMapMod = 0;
          if (sphincterOfOddiSpasmActive) {
              const atropineModel = st.activeMeds?.find(m => m.name === 'Atropine');
              const atropineCe = atropineModel ? atropineModel.Ce : 0;
              if (naloxoneCe > 0.001) {
                  sphincterOfOddiSpasmActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Competitive mu-receptor antagonism has resolved sphincter of Oddi spasm.");
              } else if (atropineCe > 0.01) {
                  sphincterOfOddiSpasmActive = false;
                  logEvent("✅ SUCCESS: Atropine administered! Muscarinic receptor blockade has relaxed the sphincter of Oddi and resolved spasm.");
              } else {
                  oddiHrMod = 15;
                  oddiMapMod = 20;
              }
          }
          st.patient.sphincterOfOddiSpasmActive = sphincterOfOddiSpasmActive;
          patientAfterFluidics.sphincterOfOddiSpasmActive = sphincterOfOddiSpasmActive;

          // 4. Opioid-Induced Pruritus
          let opioidPruritusActive = st.patient.opioidPruritusActive || false;
          if (morphineCe < 0.01) {
              st.patient.opioidPruritusRolled = undefined;
          }
          if (morphineCe > 0.03 && !opioidPruritusActive && st.patient.opioidPruritusRolled === undefined) {
              if (st.patient.opioidPruritusRolled === undefined) {
                  const baseProb = 0.10;
                  const modifier = (st.patient.sex === 'female') ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.opioidPruritusRolled = Math.random() < prob;
              }
              if (st.patient.forceOpioidPruritus || st.patient.opioidPruritusRolled) {
                  opioidPruritusActive = true;
                  logEvent("🚨 CLINICAL ALERT: Morphine administration has triggered significant opioid-induced pruritus (facial itching)! This is mediated by central mu-receptor and gastrin-releasing peptide receptor co-activation.");
              } else {
                  st.patient.opioidPruritusRolled = false;
                  logEvent("⚠️ Clinical Note: Morphine administered. Facial itching was not triggered (baseline clinical incidence ~10%).");
              }
          }
          if (opioidPruritusActive) {
              const ondansetronModel = st.activeMeds?.find(m => m.name === 'Ondansetron');
              const ondansetronCe = ondansetronModel ? ondansetronModel.Ce : 0;
              if (ondansetronCe > 0.02) {
                  opioidPruritusActive = false;
                  logEvent("✅ SUCCESS: Ondansetron administered! 5-HT3 receptor blockade has successfully treated opioid-induced pruritus.");
              } else if (naloxoneCe > 0.0002 && naloxoneCe < 0.002) {
                  opioidPruritusActive = false;
                  logEvent("✅ SUCCESS: Low-dose Naloxone titrated! Competitive mu-receptor antagonism has resolved pruritus while preserving systemic analgesia.");
              } else if (naloxoneCe >= 0.002) {
                  opioidPruritusActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Pruritus resolved, but warning: full dose has antagonized all opioid analgesia!");
              }
          }
          st.patient.opioidPruritusActive = opioidPruritusActive;
          patientAfterFluidics.opioidPruritusActive = opioidPruritusActive;

          // 5. Naloxone Sympathetic Surge
          let naloxoneSurgeTriggered = st.patient.naloxoneSurgeTriggered || false;
          let naloxoneSurgeActive = st.patient.naloxoneSurgeActive || false;
          let naloxoneSurgeTime = st.patient.naloxoneSurgeTime !== undefined ? st.patient.naloxoneSurgeTime : 0;

          if (naloxoneCe < 0.0005) {
              st.patient.naloxoneSurgeRolled = undefined;
          }
          if (naloxoneCe > 0.002 && !naloxoneSurgeTriggered && opioidEff > 0.4 && st.patient.naloxoneSurgeRolled === undefined) {
              if (st.patient.naloxoneSurgeRolled === undefined) {
                  const baseProb = 0.05;
                  const modifier = (st.patient.cad || st.patient.chf || st.patient.highAnxiety) ? 5.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.naloxoneSurgeRolled = Math.random() < prob;
              }
              if (st.patient.forceNaloxoneSurge || st.patient.naloxoneSurgeRolled) {
                  naloxoneSurgeTriggered = true;
                  naloxoneSurgeActive = true;
                  naloxoneSurgeTime = 120; // 120 seconds duration
                  logEvent("🚨 CRITICAL ALERT: Rapid Naloxone reversal has triggered an acute autonomic sympathetic surge! Release of endogenous catecholamines causes severe hypertension and tachycardia.");
              } else {
                  st.patient.naloxoneSurgeRolled = false;
                  logEvent("⚠️ Clinical Note: Rapid Naloxone reversal performed. Fortunately, no acute sympathetic surge occurred (occurs in ~5% of reversals). Hemodynamics remain stable.");
              }
          }
          let surgeHrMod = 0;
          let surgeMapMod = 0;
          if (naloxoneSurgeActive && naloxoneSurgeTime > 0) {
              naloxoneSurgeTime--;
              const factor = naloxoneSurgeTime / 120;
              surgeHrMod = Math.round(30 * factor);
              surgeMapMod = Math.round(35 * factor);
              if (naloxoneSurgeTime === 0) {
                  naloxoneSurgeActive = false;
                  logEvent("✅ SUCCESS: Naloxone-induced sympathetic surge has resolved and hemodynamics have stabilized.");
              }
          }
          st.patient.naloxoneSurgeTriggered = naloxoneSurgeTriggered;
          st.patient.naloxoneSurgeActive = naloxoneSurgeActive;
          st.patient.naloxoneSurgeTime = naloxoneSurgeTime;
          patientAfterFluidics.naloxoneSurgeTriggered = naloxoneSurgeTriggered;
          patientAfterFluidics.naloxoneSurgeActive = naloxoneSurgeActive;
          patientAfterFluidics.naloxoneSurgeTime = naloxoneSurgeTime;

          // 6. Renarcotization
          let renarcotizationActive = st.patient.renarcotizationActive || false;
          if (naloxoneSurgeTriggered && naloxoneCe < 0.0005 && !renarcotizationActive) {
              const longAgonistActive = (fentanylCe > 0.002) || (morphineCe > 0.04) || (sufentanilCe > 0.0004) || (hydromorphoneCe > 0.015);
              if (longAgonistActive) {
                  renarcotizationActive = true;
                  logEvent("🚨 CRITICAL EMERGENCY: Naloxone levels have decayed below the therapeutic threshold while high levels of long-acting opioid agonists remain! Renarcotization has occurred, re-triggering central respiratory arrest.");
              }
          }
          if (renarcotizationActive && naloxoneCe >= 0.001) {
              renarcotizationActive = false;
              logEvent("✅ SUCCESS: Repeat Naloxone dose administered! Renarcotization reversed and spontaneous respiration restored.");
          }
          st.patient.renarcotizationActive = renarcotizationActive;
          patientAfterFluidics.renarcotizationActive = renarcotizationActive;

          // Apply clinical offsets
          ruleHrOffset += deliriumHrMod + arterialIschemiaHrMod + oddiHrMod + surgeHrMod;
          ruleMapOffset += deliriumMapMod + arterialIschemiaMapMod + oddiMapMod + surgeMapMod;

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

          // Gastrointestinal Engine Tick
          const isParalyzedCurrent = maxNMJOccupancy > 0.90;
          const isApneicCurrent = isParalyzedCurrent || (st.vitals.rr !== undefined && Number.isFinite(st.vitals.rr) ? st.vitals.rr < 1 : false);
          const spontaneousBreathingActive = !isParalyzedCurrent && !isApneicCurrent;
          const isVentilatingPPV = st.patient.ventilationStatus === 'mechanical' || (st.ventSettings && st.ventSettings.mode !== 'spontaneous') || (st.vitals.pip && st.vitals.pip > 15);

          const giOutput = GastrointestinalEngine.tick(1, {
              patient: {
                  ...st.patient,
                  hasAspirated: st.patient.hasAspirated || false
              },
              vitals: {
                  ...st.vitals,
                  bowelGasVolume: st.vitals.bowelGasVolume,
                  inflammatoryIleus: st.vitals.inflammatoryIleus,
                  postoperativeIleus: st.vitals.postoperativeIleus
              },
              time: st.time
          }, st.activeMeds || [], {
              EtN_2O: currentEtN2O,
              currentMac,
              C_cat: painOutput.C_cat || 0,
              positivePressureVentilationActive: isVentilatingPPV,
              spontaneousBreathingActive
          });

          if (giOutput.events && giOutput.events.length > 0) {
              giOutput.events.forEach(evt => logEvent(evt));
          }

          if (giOutput.hasRegurgitated && !st.patient.hasRegurgitated) {
              logEvent("⚠️ WARNING: Gastric regurgitation detected! Acidic stomach contents are rising into the pharynx.");
              st.patient.hasRegurgitated = true;
          }

          // Hepatic Engine Tick
          const safeEbvForCvp = st.patient.ebv || 5000;
          const safeEblForCvp = st.patient.ebl || 0;
          const safeAddedForCvp = fluidicsOutput.intravascularVolumeAdded_mL || 0;
          const safeVolForCvp = safeEbvForCvp - safeEblForCvp + safeIntravascularVolume + safeAddedForCvp + positionPreloadMod;
          const peepValCvp = (st.ventSettings && st.ventSettings.peep) ? st.ventSettings.peep : 0;
          const calculatedCVP = 4.0 + 3.0 * ((safeVolForCvp - safeEbvForCvp) / 250) + peepValCvp;
          const cvp = Math.max(0.0, Math.min(25.0, calculatedCVP));

          const hepaticOutput = HepaticEngine.tick(1, {
              patient: st.patient,
              vitals: {
                  mPAP: st.vitals.mPAP,
                  HVPG: st.vitals.HVPG,
                  pbf: st.vitals.pbf,
                  habf: st.vitals.habf,
                  thbf: st.vitals.thbf,
                  renalArteryResistance: st.vitals.renalArteryResistance
              },
              time: st.time
          }, st.activeMeds || [], {
              coRatio: coRatio,
              map: st.vitals.map || 90.0,
              sys: st.vitals.sys || 120.0,
              spo2: st.vitals.spo2 || 98.0,
              paco2: st.vitals.paco2 || 40.0,
              temp: newTemp,
              cvp: cvp,
              surgicalPhase: st.surgicalPhase,
              renalRatio: renalRatio,
              FiO2: deliveredFiO2
          });

          if (hepaticOutput.events && hepaticOutput.events.length > 0) {
              hepaticOutput.events.forEach(evt => logEvent(evt));
          }

          // Propagate hepatic values to patient states
          st.patient.creatinine = hepaticOutput.creatinine;
          st.patient.varicealBleedingActive = hepaticOutput.varicealBleedingActive;
          st.patient.varicealBleedTime = hepaticOutput.varicealBleedTime;
          st.patient.hasPoPHCollapse = hepaticOutput.hasPoPHCollapse;
          st.patient.activeHepaticBleedRate = hepaticOutput.activeBleedRate;
          st.patient.childPughScore = hepaticOutput.childPughScore;
          st.patient.childPughClass = hepaticOutput.childPughClass;
          st.patient.meldScore = hepaticOutput.meldScore;
          st.patient.hpsShunt = hepaticOutput.hpsShunt;
          st.patient.varicealBleedRolled = hepaticOutput.varicealBleedRolled;
          st.patient.poPHCollapseRolled = hepaticOutput.poPHCollapseRolled;

          patientAfterFluidics.creatinine = hepaticOutput.creatinine;
          patientAfterFluidics.varicealBleedingActive = hepaticOutput.varicealBleedingActive;
          patientAfterFluidics.varicealBleedTime = hepaticOutput.varicealBleedTime;
          patientAfterFluidics.hasPoPHCollapse = hepaticOutput.hasPoPHCollapse;
          patientAfterFluidics.activeHepaticBleedRate = hepaticOutput.activeBleedRate;
          patientAfterFluidics.childPughScore = hepaticOutput.childPughScore;
          patientAfterFluidics.childPughClass = hepaticOutput.childPughClass;
          patientAfterFluidics.meldScore = hepaticOutput.meldScore;
          patientAfterFluidics.hpsShunt = hepaticOutput.hpsShunt;
          patientAfterFluidics.varicealBleedRolled = hepaticOutput.varicealBleedRolled;
          patientAfterFluidics.poPHCollapseRolled = hepaticOutput.poPHCollapseRolled;

          // Renal Engine Tick
          const netFluidBalance = (st.patient.netFluidBalance || 0.0) + fluidicsOutput.intravascularVolumeAdded_mL - (st.patient.urineOutputRate || 70.0) * (1.0 / 3600.0);
          
          const isSevoFluorideNephrotoxic = (st.patient.sevoLowFlowTime || 0) > 600;
          const finalHasFluorideNephrotoxicity = !!(st.patient.hasFluorideNephrotoxicity || isSevoFluorideNephrotoxic);
          const hasMismatchedTransfusion = st.patient.hasTransfusionReaction || false;
          const hasRhabdomyolysis = st.patient.suxUpregulatedPotassiumLeakActive || false;
          const hasContrastNephropathy = st.patient.contrastAdministered || false;

          const renalOutput = RenalEngine.tick(1, {
              patient: st.patient,
              vitals: {
                  gfr: st.vitals.gfr,
                  rbf: st.vitals.rbf,
                  bun: st.vitals.bun,
                  creatinine: st.patient.creatinine, // Use the post-hepatic creatinine value
                  urineOutput: st.vitals.urineOutput,
                  urineOutputRate: st.vitals.urineOutputRate,
                  urineOsmolality: st.vitals.urineOsmolality,
                  feNa: st.vitals.feNa,
                  akiStage: st.vitals.akiStage,
                  akiDamage: st.vitals.akiDamage,
                  uopOliguriaTimer: st.vitals.uopOliguriaTimer,
                  uopAnuriaTimer: st.vitals.uopAnuriaTimer,
                  vasopressinLevel: st.vitals.vasopressinLevel,
                  aldosteroneLevel: st.vitals.aldosteroneLevel,
                  osm: st.vitals.osm
              },
              time: st.time,
              electrolytes: st.electrolytes
          }, st.activeMeds || [], {
              coRatio: coRatio,
              map: st.vitals.map || 90.0,
              sys: st.vitals.sys || 120.0,
              cvp: cvp,
              peep: peepValCvp,
              temp: newTemp,
              currentMac: currentMac,
              C_cat: painOutput.C_cat || 0.0,
              ebl: safeEblForCvp,
              ebv: safeEbvForCvp,
              netFluidBalance: netFluidBalance,
              hasFluorideNephrotoxicity: finalHasFluorideNephrotoxicity,
              hasMismatchedTransfusion,
              hasRhabdomyolysis,
              hasContrastNephropathy
          });

          if (renalOutput.events && renalOutput.events.length > 0) {
              renalOutput.events.forEach(evt => logEvent(evt));
          }

          // Propagate renal values to patient and vitals state
          st.patient.gfr = renalOutput.gfr;
          st.patient.rbf = renalOutput.rbf;
          st.patient.bun = renalOutput.bun;
          st.patient.creatinine = renalOutput.creatinine;
          st.patient.urineOutput = renalOutput.urineOutput;
          st.patient.urineOutputRate = renalOutput.urineOutputRate;
          st.patient.urineOsmolality = renalOutput.urineOsmolality;
          st.patient.feNa = renalOutput.feNa;
          st.patient.akiStage = renalOutput.akiStage;
          st.patient.akiDamage = renalOutput.akiDamage;
          st.patient.uopOliguriaTimer = renalOutput.uopOliguriaTimer;
          st.patient.uopAnuriaTimer = renalOutput.uopAnuriaTimer;
          st.patient.vasopressinLevel = renalOutput.vasopressinLevel;
          st.patient.aldosteroneLevel = renalOutput.aldosteroneLevel;
          st.patient.osm = renalOutput.osm;
          st.patient.hasAki = renalOutput.hasAki;
          st.patient.hasPrerenalOliguria = renalOutput.hasPrerenalOliguria;
          st.patient.hasFluidOverloadEdema = renalOutput.hasFluidOverloadEdema;
          st.patient.netFluidBalance = netFluidBalance;
          st.patient.fluidOverloadEdemaRolled = renalOutput.fluidOverloadEdemaRolled;

          patientAfterFluidics.gfr = renalOutput.gfr;
          patientAfterFluidics.rbf = renalOutput.rbf;
          patientAfterFluidics.bun = renalOutput.bun;
          patientAfterFluidics.creatinine = renalOutput.creatinine;
          patientAfterFluidics.urineOutput = renalOutput.urineOutput;
          patientAfterFluidics.urineOutputRate = renalOutput.urineOutputRate;
          patientAfterFluidics.urineOsmolality = renalOutput.urineOsmolality;
          patientAfterFluidics.feNa = renalOutput.feNa;
          patientAfterFluidics.akiStage = renalOutput.akiStage;
          patientAfterFluidics.akiDamage = renalOutput.akiDamage;
          patientAfterFluidics.uopOliguriaTimer = renalOutput.uopOliguriaTimer;
          patientAfterFluidics.uopAnuriaTimer = renalOutput.uopAnuriaTimer;
          patientAfterFluidics.vasopressinLevel = renalOutput.vasopressinLevel;
          patientAfterFluidics.aldosteroneLevel = renalOutput.aldosteroneLevel;
          patientAfterFluidics.osm = renalOutput.osm;
          patientAfterFluidics.hasAki = renalOutput.hasAki;
          patientAfterFluidics.hasPrerenalOliguria = renalOutput.hasPrerenalOliguria;
          patientAfterFluidics.hasFluidOverloadEdema = renalOutput.hasFluidOverloadEdema;
          patientAfterFluidics.netFluidBalance = netFluidBalance;
          patientAfterFluidics.fluidOverloadEdemaRolled = renalOutput.fluidOverloadEdemaRolled;

          // Gastric Aspiration triggers
          let hasAspirated = st.patient.hasAspirated || giOutput.hasAspirated || false;
          let aspirationCompliancePenalty = 0;
          let aspirationResistancePenalty = 0;
          
          if (!st.patient.airwaySecured && st.patient.stomach === 'full') {
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

          // 4. RespiratoryEngine Tick
          const safePaCO2 = st.vitals.paco2 || 40;
          const safePaO2 = st.vitals.pao2 || 100;
          const safeSys = st.vitals.sys || 120;

          // HVR and HCVR Blunting
          let hvrBlunting = 0.0;
          if (activeAgent === 'desflurane' || activeAgent === 'xenon') {
              if (agentMac > 0.1) {
                  hvrBlunting = Math.min(1.0, (agentMac - 0.1) / 1.0);
              }
          } else if (activeAgent) { // sevoflurane, isoflurane, halothane, methoxyflurane
              if (agentMac <= 0.1) {
                  hvrBlunting = (agentMac / 0.1) * 0.7;
              } else {
                  hvrBlunting = Math.min(1.0, 0.7 + (agentMac - 0.1) * 0.3);
              }
          }

          let hcvrBlunting = 0.0;
          if (activeAgent && activeAgent !== 'xenon') {
              hcvrBlunting = Math.min(1.0, agentMac * 0.6);
          }

          let compensatoryRR = 0;
          if (safePaCO2 > 45) {
              compensatoryRR += Math.max(0, (safePaCO2 - 45) * 0.8 * (1.0 - hcvrBlunting));
          }
          if (safePaO2 < 70) {
              compensatoryRR += Math.max(0, (70 - safePaO2) * 0.4 * (1.0 - hvrBlunting));
          }
          if (safeSys < 90) compensatoryRR += 6; 

          const actualBaseDeficit = (st.patient.isSeptic ? 8 : 0) + (bloodLossRatio * 20) + (currentLactate - 1.0);
          const hco3 = Math.max(8, 24 - actualBaseDeficit);
          const baselinePaCO2 = st.patient.copd ? 55 : (st.patient.isObese ? 48 : 40);

          const respOutput = RespiratoryEngine.tick(1, {
              patient: {
                  ...patientAfterFluidics,
                  isApneic: st.patient.isApneic,
                  isParalyzed: st.patient.isParalyzed,
                  swallowingActive: !!st.patient.swallowingActive
              },
              vitals: {
                  ...st.vitals,
                  temp: newTemp,
                  bowelGasVolume: giOutput.bowelGasVolume,
                  n2oUptakeRate: st.vitals.n2oUptakeRate || 0
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
              aspirationResistancePenalty,
              hpsShunt: st.patient.hpsShunt || 0.0,
              fluidOverloadCompliancePenalty: st.patient.hasFluidOverloadEdema ? 25 : 0,
              agent: st.gasSettings?.agent,
              etAgent: currentEtAgent,
              currentMac: currentMac,
              isMucusPlugged: st.patient.isMucusPlugged,
              bronchialSmoothMuscleCa: st.patient.bronchialSmoothMuscleCa,
              intercostalContribution: st.patient.intercostalContribution,
              airwayObstructionIndex: st.patient.airwayObstructionIndex,
              hpvInhibition: st.patient.hpvInhibition,
              fgf_L_min: freshGasFlow
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
              getAnatomicalParameter,
              currentHb
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
              isSeizure: isSeizure,
              hasRegurgitated: giOutput.hasRegurgitated || st.patient.hasRegurgitated || false,
              hasAspirated: hasAspirated,
              celiacBlockActive: !!st.patient.celiacBlockActive,
              epiduralBlockActive: !!st.patient.epiduralBlockActive,
              swallowingActive: !!st.patient.swallowingActive,
              manipulationIndex: typeof st.patient.manipulationIndex === 'number' ? st.patient.manipulationIndex : 0.0,
              
              // Hepatic states
              cirrhosisFactor: st.patient.cirrhosisFactor,
              bilirubin: st.patient.bilirubin,
              inr: st.patient.inr,
              creatinine: st.patient.creatinine,
              albumin: st.patient.albumin,
              encephalopathyGrade: st.patient.encephalopathyGrade,
              ascitesDegree: st.patient.ascitesDegree,
              varicealBleedingActive: st.patient.varicealBleedingActive,
              varicealBleedTime: st.patient.varicealBleedTime,
              hasPoPHCollapse: st.patient.hasPoPHCollapse,
              activeHepaticBleedRate: st.patient.activeHepaticBleedRate,
              childPughScore: st.patient.childPughScore,
              childPughClass: st.patient.childPughClass,
              meldScore: st.patient.meldScore,
              hpsShunt: st.patient.hpsShunt,
              hasTIPS: st.patient.hasTIPS,
              isO2PipelineCrossover: st.patient.isO2PipelineCrossover,
              isO2CylinderOpen: st.patient.isO2CylinderOpen,
              isO2PipelineDisconnected: st.patient.isO2PipelineDisconnected,
              isOxygenFlushPressed: st.patient.isOxygenFlushPressed,
              breathingCircuitType: st.patient.breathingCircuitType,
              co2AbsorptiveCapacity: st.patient.co2AbsorptiveCapacity,
              stuckExpiratoryValve: st.patient.stuckExpiratoryValve,
              stuckInspiratoryValve: st.patient.stuckInspiratoryValve,
              aplValveSetting: st.patient.aplValveSetting,
              hasPneumothorax: st.patient.hasPneumothorax,
              hasPneumothoraxWarningLogged: st.patient.hasPneumothoraxWarningLogged,
              cortisolLevel: st.patient.cortisolLevel,
              adrenalSuppressionActive: st.patient.adrenalSuppressionActive,
              prisAccumulation: st.patient.prisAccumulation,
              prisTriggered: st.patient.prisTriggered,
              emergenceDeliriumTriggered: st.patient.emergenceDeliriumTriggered,
              barbiturateArterialPrecipitation: st.patient.barbiturateArterialPrecipitation,
              hydroxyMidazolam: st.patient.hydroxyMidazolam || 0,
              norketamine: st.patient.norketamine || 0,
              laudanosine: currentLaudanosine,
              laudanosineSeizureTriggered: st.patient.laudanosineSeizureTriggered || false,
              suxPhase2Accumulation: st.patient.suxPhase2Accumulation || 0,
              cumulativeSuxDose: st.patient.cumulativeSuxDose || 0,
              butyrylcholinesteraseVariant: st.patient.butyrylcholinesteraseVariant || 'normal',
              dibucaineNumber: st.patient.dibucaineNumber || 80,
              chronicBenzoUse: st.patient.chronicBenzoUse,
              opioidRigidityActive: st.patient.opioidRigidityActive,
              remifentanilHyperalgesiaActive: st.patient.remifentanilHyperalgesiaActive,
              remifentanilInfusionDuration: st.patient.remifentanilInfusionDuration,
              sphincterOfOddiSpasmActive: st.patient.sphincterOfOddiSpasmActive,
              opioidPruritusActive: st.patient.opioidPruritusActive,
              renarcotizationActive: st.patient.renarcotizationActive,
              naloxoneSurgeTriggered: st.patient.naloxoneSurgeTriggered,
              naloxoneSurgeActive: st.patient.naloxoneSurgeActive,
              naloxoneSurgeTime: st.patient.naloxoneSurgeTime,
              forcePenicillinAnaphylaxis: st.patient.forcePenicillinAnaphylaxis,
              forcePris: st.patient.forcePris,
              forceAdrenalSuppression: st.patient.forceAdrenalSuppression,
              forceEmergenceDelirium: st.patient.forceEmergenceDelirium,
              forceBarbituratePrecipitation: st.patient.forceBarbituratePrecipitation,
              forceBenzoWithdrawalSeizure: st.patient.forceBenzoWithdrawalSeizure,
              forceOpioidRigidity: st.patient.forceOpioidRigidity,
              forceRemifentanilHyperalgesia: st.patient.forceRemifentanilHyperalgesia,
              forceSphincterOfOddiSpasm: st.patient.forceSphincterOfOddiSpasm,
              forceOpioidPruritus: st.patient.forceOpioidPruritus,
              forceNaloxoneSurge: st.patient.forceNaloxoneSurge,
              forceHalothaneHepatitis: st.patient.forceHalothaneHepatitis,
              forceMethoxyfluraneNephrotoxicity: st.patient.forceMethoxyfluraneNephrotoxicity,
              forceAirwayFire: st.patient.forceAirwayFire,
              forceMucusPlug: st.patient.forceMucusPlug,
              forceVaricealBleed: st.patient.forceVaricealBleed,
              forcePoPHCollapse: st.patient.forcePoPHCollapse,
              forceFluidOverloadEdema: st.patient.forceFluidOverloadEdema,
              forceNormepSeizure: st.patient.forceNormepSeizure,
              forceLaudanosineSeizure: st.patient.forceLaudanosineSeizure,
              halothaneHepatitisRolled: st.patient.halothaneHepatitisRolled,
              methoxyfluraneNephrotoxicityRolled: st.patient.methoxyfluraneNephrotoxicityRolled,
              airwayFireRolled: st.patient.airwayFireRolled,
              mucusPlugRolled: st.patient.mucusPlugRolled,
              varicealBleedRolled: st.patient.varicealBleedRolled,
              poPHCollapseRolled: st.patient.poPHCollapseRolled,
              fluidOverloadEdemaRolled: st.patient.fluidOverloadEdemaRolled,
              normepSeizureRolled: st.patient.normepSeizureRolled,
              laudanosineSeizureRolled: st.patient.laudanosineSeizureRolled
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
              fico2: respOutput.vitals.fico2 || 0,
              ph: respOutput.newPh,
              paco2: respOutput.newPaCO2,
              pao2: respOutput.vitals.pao2,
              compl: Math.round(respOutput.compliance),
              res: Math.round(respOutput.resistance),
              cao2: respOutput.vitals.cao2,
              cvo2: respOutput.vitals.cvo2,
              temp: newTemp,
              etAgent: currentEtAgent,
              fiAgent: currentFiAgent,
              etN2O: currentEtN2O,
              fiN2O: currentFiN2O,
              n2oUptakeRate: n2oUptake_L_sec,
              mac: displayedMac,
              lesTone: giOutput.lesTone,
              gastricPressure: giOutput.gastricPressure,
              bowelGasVolume: giOutput.bowelGasVolume,
              gutMotility: giOutput.gutMotility,
              inflammatoryIleus: giOutput.inflammatoryIleus,
              postoperativeIleus: giOutput.postoperativeIleus,
              mPAP: hepaticOutput.mPAP,
              HVPG: hepaticOutput.HVPG,
              pbf: hepaticOutput.pbf,
              habf: hepaticOutput.habf,
              thbf: hepaticOutput.thbf,
              renalArteryResistance: hepaticOutput.renalArteryResistance,
              cvp: cvp
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

          // Processed EEG metrics (SEF95, BSR, and BIS) based on subcortical arousal & pathways
          let bsrVal = 0;
          if (displayedMac > 1.5) {
              bsrVal = (displayedMac - 1.5) * 70;
          }
          if (propofolCe > 4.5) {
              bsrVal = Math.max(bsrVal, (propofolCe - 4.5) * 20);
          }
          bsrVal = Math.round(Math.max(0, Math.min(100, bsrVal)));

          let bisBase = 98;
          if (finalPatient.lcActivity !== undefined) {
              const pathwayCoherence = (
                  finalPatient.thalamocorticalConn * 0.4 + 
                  finalPatient.frontoparietalFeedback * 0.4 + 
                  ((finalPatient.lcActivity + finalPatient.tmnActivity + finalPatient.orexinLevel) / 3.0) * 0.2
              );
              bisBase = 98 * Math.max(0.0, Math.min(1.0, pathwayCoherence));
          } else {
              bisBase = 98 - (aggregateHypnosis * 55);
          }

          if (displayEmergenceLag) {
              bisBase = Math.min(bisBase, 40 + (1.0 - finalPatient.neuralInertiaLag) * 20);
          }

          let targetBis = bisBase * (1.0 - bsrVal / 100);
          if (finalVitals.cmap < 50) {
              const ischemicSlowing = (50 - finalVitals.cmap) * 1.5;
              targetBis -= ischemicSlowing;
          }

          let finalBis = Math.max(0, Math.min(98, targetBis + painOutput.bisSpike));
          if (finalPatient.isArrest) {
              finalBis = finalPatient.biologicalDeath ? 0 : Math.max(0, (st.vitals.bis || 98) - 5);
          }

          let sefVal = 30.0;
          if (finalPatient.frontoparietalFeedback !== undefined) {
              sefVal = Math.max(1.0, 30.0 * (0.8 * finalPatient.frontoparietalFeedback + 0.2 * finalPatient.thalamocorticalConn));
              sefVal = sefVal * (1.0 - bsrVal / 100);
              if (finalBis < 5) sefVal = 0;
          } else {
              sefVal = 30.0 - (aggregateHypnosis * 25);
          }
          sefVal = parseFloat(sefVal.toFixed(1));

          const isSuxActive = succinylcholineCe > 0.01;
          const hasNDMR = st.activeMeds?.some(m => m.classes.includes('NDMR') && m.Ce > 0.01);
          
          let suxPhase2Accumulation = st.patient.suxPhase2Accumulation || 0;
          if (isSuxActive) {
              suxPhase2Accumulation += 1;
          } else {
              suxPhase2Accumulation = Math.max(0, suxPhase2Accumulation - 0.5);
          }
          st.patient.suxPhase2Accumulation = suxPhase2Accumulation;
          
          const cumulativeSuxDose = st.patient.cumulativeSuxDose || 0;
          const isSuxPhaseII = isSuxActive && (cumulativeSuxDose > 300 || suxPhase2Accumulation > 120);

          let t1 = 1.0; let t4 = 1.0;
          let t2 = 1.0; let t3 = 1.0;
          let targetTofCount = 4;
          let targetTofRatio = 1.0;

          if (maxNMJOccupancy > 0.0) {
              if (isSuxActive && !isSuxPhaseII && !hasNDMR) {
                  // Phase I depolarizing block: no fade, all four twitches decrease together
                  t1 = maxNMJOccupancy <= 0.30 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.30) / (0.95 - 0.30));
                  t2 = t1;
                  t3 = t1;
                  t4 = t1;
                  targetTofRatio = 1.0;
                  targetTofCount = t1 > 0.05 ? 4 : 0;
              } else {
                  // Non-depolarizing block or Phase II block: exhibits fade
                  t1 = maxNMJOccupancy <= 0.60 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.60) / (0.95 - 0.60));
                  t2 = maxNMJOccupancy <= 0.50 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.50) / (0.90 - 0.50));
                  t3 = maxNMJOccupancy <= 0.40 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.40) / (0.85 - 0.40));
                  t4 = maxNMJOccupancy <= 0.30 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.30) / (0.75 - 0.30));

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
                  targetTofRatio = (targetTofCount === 4 && t1 > 0.001) ? (t4 / t1) : 0.0;
              }

              // Nullify twitches that are blocked based on count
              if (targetTofCount < 4) t4 = 0;
              if (targetTofCount < 3) t3 = 0;
              if (targetTofCount < 2) t2 = 0;
              if (targetTofCount < 1) t1 = 0;
          }
          if (isNaN(targetTofRatio) || targetTofRatio < 0) targetTofRatio = 0;
          targetTofRatio = Math.min(1.0, targetTofRatio);

          if (finalPatient.airwaySecured && st.surgicalPhase === 'Induction') {
              setSurgicalPhase('Maintenance');
              logEvent(`➡️ Airway Secured. Surgical Timeline Auto-Advanced: MAINTENANCE phase initiated.`);
          }

          if (st.activeMeds && finalPatient.accessLines) {
              const safePatientWeight = typeof finalPatient.weight === 'number' && finalPatient.weight > 0 ? finalPatient.weight : 70;
              const safePatientIbw = typeof finalPatient.ibw === 'number' && finalPatient.ibw > 0 ? finalPatient.ibw : 70;
              const safePatientLbw = typeof finalPatient.lbw === 'number' && finalPatient.lbw > 0 ? finalPatient.lbw : 60;

              st.activeMeds.forEach(model => {
                  if (model.tciMode && model.tciMode !== 'none') {
                      const matchingId = Object.keys(MEDICATIONS).find(key => MEDICATIONS[key].name === model.name);
                      if (matchingId) {
                          const medData = MEDICATIONS[matchingId];
                          finalPatient.accessLines.forEach(line => {
                              if (line.activeMedInfusions) {
                                  const medInf = line.activeMedInfusions.find(mi => mi.medId === matchingId);
                                  if (medInf) {
                                      const dosingWeight = medData.dosingWeight === 'IBW' ? safePatientIbw : (medData.dosingWeight === 'LBW' ? safePatientLbw : safePatientWeight);
                                      if (medInf.unit.includes('mcg/kg/min')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 1000 * 60) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mg/kg/hr')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 3600) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mcg/kg/hr')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 1000 * 3600) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mcg/min')) {
                                          medInf.rate = parseFloat((model.currentInfusionRate * 1000 * 60).toFixed(2));
                                      } else if (medInf.unit.includes('mg/hr')) {
                                          medInf.rate = parseFloat((model.currentInfusionRate * 3600).toFixed(2));
                                      } else {
                                          medInf.rate = parseFloat((model.currentInfusionRate * 3600).toFixed(2));
                                      }
                                  }
                              }
                          });
                      }
                  }
              });
          }

          // Update final states
          setPatient(finalPatient);
          setActiveMeds([...st.activeMeds]);
           setVitals({
              ...finalVitals,
              bis: Math.round(finalBis),
              sef95: sefVal,
              bsr: bsrVal,
              tofCount: targetTofCount,
              tofRatio: targetTofRatio,
              t1: t1,
              t2: t2,
              t3: t3,
              t4: t4,
              p300Amplitude: finalPatient.p300Amplitude,
              n2p3Amplitude: finalPatient.n2p3Amplitude,
              p2Amplitude: finalPatient.p2Amplitude,
              oldNewEffect: finalPatient.oldNewEffect,
              mismatchNegativity: finalPatient.mismatchNegativity,
              p1Amplitude: finalPatient.p1Amplitude,
              n2Latency: finalPatient.n2Latency
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