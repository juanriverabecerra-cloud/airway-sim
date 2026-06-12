import { CaseManager } from '../src/components/controls/CaseManager.jsx';
import { PainEngine } from '../src/engine/PainEngine.ts';
import fs from 'fs';
import path from 'path';

// Let's import the thoracic preset from CaseManager.jsx using dynamic import / reading file
// Or we can just extract it since we know the thoracic preset structure.
// Let's print st.patient at start.

const selectedCase = {
  id: 'thoracic',
  name: 'Thoracic - Lobectomy (OLV)',
  difficulty: 'Medium',
  baseVitals: { hr: 88, sys: 130, dia: 78, spo2: 92, rr: 18, temp: 37.0 },
  patient: {
    age: 64, sex: 'female', weight: 58, height: 160,
    position: 'Lateral',
    airwayBlood: false, mallampati: 2, neckMobility: 'normal',
    isObese: false, isSeptic: false, trauma: false,
    copd: true, chf: false, ef: 55, gfr: 80, htn: false,
    ebv: 3770, ebl: 0,
    patientBaseSV: 70, patientBaseSVR: 1100, patientBaseRR: 18,
    shuntFraction: 0.25,
    npoSolids: 8, npoLiquids: 4, allergies: 'NKDA',
    procedure: 'VATS Lobectomy (OLV)',
    emergentRSI: false
  }
};

// Now simulate usePhysiology initialization:
const safePatientObj = selectedCase.patient;
const assumedBaseSV = safePatientObj.isObese ? 85 : 70;
const baseHr = selectedCase.baseVitals.hr;
const initialMap = selectedCase.baseVitals.dia + (selectedCase.baseVitals.sys - selectedCase.baseVitals.dia) / 3;
const initialCO = (baseHr * assumedBaseSV) / 1000;
const calculatedBaseSVR = (initialMap * 80) / initialCO;

const patient = {
  ...safePatientObj,
  height: 160, weight: 58, sex: 'female', ebv: 3770, ebl: 0, bleedRate: 0.05,
  ibw: 52, lbw: 43,
  position: 'Lateral',
  isApneic: false, isParalyzed: false, isTopicalized: false,
  airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
  hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21,
  oxygenBuffer: 2.1 * 0.21,
  hasBisMonitor: false, hasTofMonitor: false,
  isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0,
  arrestThreshold: 1200, codeStartTime: null, apneaStartTime: null,
  shuntFraction: 0.25,
  patientBaseSVR: calculatedBaseSVR,
  patientBaseSV: assumedBaseSV,
  patientBaseHR: baseHr,
  patientBaseSBP: 130,
  patientBaseDBP: 78,
  oculocardiacTriggered: false,
  patientBaseRR: 18,
  // ... rest of usePhysiology init
};

console.log("lastAirwayManipulationTime in initialized patient:", patient.lastAirwayManipulationTime);

// Let's tick the pain engine
const out = PainEngine.tick(1, patient, { hr: 88, sys: 130, dia: 78, map: initialMap, rr: 18, paco2: 40, bis: 98 }, [], 0, 0);
console.log("laryngoscopyActive:", patient.laryngoscopyActive);
console.log("lastAirwayTime calculated in PainEngine:", typeof patient.lastAirwayManipulationTime === 'number' ? patient.lastAirwayManipulationTime : -999);
console.log("airwayProcActive in PainEngine:", !!patient.laryngoscopyActive || ((typeof patient.lastAirwayManipulationTime === 'number' ? patient.lastAirwayManipulationTime : -999) >= 0 && (0 - (typeof patient.lastAirwayManipulationTime === 'number' ? patient.lastAirwayManipulationTime : -999) < 10)));
