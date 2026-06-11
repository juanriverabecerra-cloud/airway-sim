import { CardiovascularEngine } from '../src/engine/CardiovascularEngine.js';

const patient = {
  isArrest: false,
  cardiacRhythm: 'normal',
  cprActive: false,
  ischemicDamage: 0,
  biologicalDeath: false,
  myocardialStunning: 0,
  ebl: 0,
  ebv: 5000,
  height: 175,
  weight: 70,
  sex: 'male',
  age: 40,
  bmi: 22.9,
  position: 'Supine',
  arrestThreshold: 1200,
  patientBaseSV: 70,
  patientBaseSVR: 1200,
  patientBaseHR: 70,
  patientBaseRR: 12,
  intravascularVolume: 5000,
  isAwarenessActive: true
};

const vitals = {
  hr: 70,
  sys: 120,
  dia: 80,
  map: 93,
  co: 5.0,
  svr: 1200,
  cmap: 93,
  bis: 98,
  temp: 37.0,
  spo2: 99,
  paco2: 40,
  etco2: 40,
  pao2: 100
};

const drugEffects = {
  drugSvrMod: 1.0,
  drugInotropyMod: 1.0,
  svrSympatheticSpike: 45,
  contractilitySympatheticSpike: 0.3,
  hrSympatheticSpike: 35,
  shiveringHRDrive: 0,
  anaphylaxisHrMod: 0,
  anaphylaxisSvrMod: 1.0,
  totalHrDelta: 0,
  ruleHrScale: 1.0,
  ruleHrOffset: 0,
  ruleMapScale: 1.0,
  ruleMapOffset: 0,
  ruleKOffset: 0,
  ruleSpo2Offset: 0
};

const cvInput = {
  currentMac: 0,
  bloodLossRatio: 0,
  currentEbl: 0,
  positionPreloadMod: 0,
  positionHydrostaticMod: 0,
  shiveringMultiplier: 1.0,
  seizureMetabolicMultiplier: 1.0,
  cyanideVO2Mod: 1.0,
  VO2_sec: 0.004,
  currentBuffer: 0.5,
  currentFRC_L: 2.4,
  newTemp: 37,
  newPaCO2: 40,
  activeMeds: [],
  getAnatomicalParameter: (k, d) => d
};

let currentState = { patient, vitals: { ...vitals }, electrolytes: { k: 4.0 }, time: 100 };
console.log("Starting debug simulation...");
for (let t = 0; t < 45; t++) {
  currentState.time++;
  const out = CardiovascularEngine.tick(1, currentState, drugEffects, cvInput);
  console.log(`Tick ${t+1}: HR=${out.vitals.hr}, MAP=${out.vitals.map}, SBP=${out.vitals.sys}, DBP=${out.vitals.dia}, CO=${out.vitals.co.toFixed(2)}, SVR=${out.vitals.svr.toFixed(0)}, LVEDP=${out.vitals.lvedp.toFixed(1)}, MVO2=${Math.round(out.vitals.mvo2)}, Supply=${Math.round(out.vitals.mvo2Supply)}, Stunning=${out.patient.myocardialStunning.toFixed(1)}`);
  currentState.vitals = out.vitals;
  currentState.patient = out.patient;
}
