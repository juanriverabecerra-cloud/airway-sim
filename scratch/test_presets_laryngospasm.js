import fs from 'fs';
import path from 'path';
import { PainEngine } from '../src/engine/PainEngine.ts';

// Parse presets from CaseManager.jsx using regex to find the PRESETS array
const caseManagerContent = fs.readFileSync(path.resolve('./src/components/controls/CaseManager.jsx'), 'utf-8');
const presetsMatch = caseManagerContent.match(/const PRESETS = (\[[\s\S]*?\]);/);
if (!presetsMatch) {
  console.error("Could not find PRESETS in CaseManager.jsx");
  process.exit(1);
}

// Evaluate presets using a safe eval-like function by wrapping it
// Or we can just import the file if it's exported, but it's not exported.
// Let's clean the JS content a bit or use Function:
const presetsStr = presetsMatch[1].replace(/calculateIBW\([\s\S]*?\)/g, 'null').replace(/calculateLungVolumes\([\s\S]*?\)/g, '{}');
const presets = new Function(`return ${presetsStr};`)();

console.log(`Loaded ${presets.length} presets.`);

presets.forEach(preset => {
  // Mock the newCase.patient logic from CaseManager.jsx handleStageCase / handleWingIt:
  const baseVitals = { hr: preset.hr, sys: preset.sys, dia: preset.dia, spo2: preset.spo2, etco2: 0, rr: preset.rr, temp: preset.temp };
  const initialMap = baseVitals.dia + (baseVitals.sys - baseVitals.dia) / 3;
  const assumedBaseSV = preset.obese ? 85 : 70;
  const initialCO = (preset.hr * assumedBaseSV) / 1000;
  const calculatedBaseSVR = (initialMap * 80) / initialCO;

  const patient = {
    age: preset.age, sex: preset.sex, weight: Math.round(preset.weight), height: preset.height,
    position: preset.position || 'Supine',
    oxygenBuffer: null, targetBuffer: 21,
    airwayBlood: preset.airwayBlood, mallampati: preset.mallampati, neckMobility: preset.neckMobility,
    isObese: preset.obese, isSeptic: preset.septic, trauma: preset.trauma,
    copd: preset.copd || preset.asthma,
    chf: preset.chf, ef: preset.ef || 60,
    cad: preset.cad, afib: preset.afib, as: preset.as, htn: preset.htn,
    onBetaBlocker: preset.betaBlocker,
    penicillinAllergy: preset.penicillinAllergy,
    gfr: preset.gfr || 100,
    cirrhosis: preset.cirrhosis || (preset.cp !== 'none'),
    childPugh: preset.cp || 'none',
    ebv: 5000, ebl: 0,
    patientBaseSV: assumedBaseSV,
    patientBaseSVR: calculatedBaseSVR,
    patientBaseRR: preset.rr || 12,
    shuntFraction: 0.05,
    npoSolids: preset.npoSolids || 8,
    npoLiquids: preset.npoLiquids || 4,
    allergies: preset.penicillinAllergy ? 'Penicillin' : 'NKDA',
    procedure: preset.procedure || 'surgery',
    emergentRSI: !!preset.emergentRSI,
    anemia: !!preset.anemia,
    thrombocytopenia: !!preset.thrombocytopenia,
    coagulopathy: !!preset.coagulopathy,
    diabetes: !!preset.diabetes,
    insulin: !!preset.insulin,
    
    // Now simulate usePhysiology's setPatient updates on activeCase mount:
    isApneic: false, isParalyzed: false, isTopicalized: false,
    airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
    hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21,
    hasBisMonitor: false, hasTofMonitor: false,
    isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0,
    arrestThreshold: 1200, codeStartTime: null, apneaStartTime: null,
    patientBaseSBP: preset.sys || 120,
    patientBaseDBP: preset.dia || 80,
    oculocardiacTriggered: false,
  };

  // Run 100 ticks
  let triggeredLaryngo = 0;
  let triggeredBroncho = 0;
  for (let run = 0; run < 100; run++) {
    const pState = { ...patient };
    for (let t = 0; t < 100; t++) {
      const out = PainEngine.tick(1, pState, { hr: preset.hr, sys: preset.sys, dia: preset.dia, map: initialMap, rr: preset.rr, paco2: 40, bis: 98 }, [], 0, t);
      if (out.somaticResponse.triggerLaryngospasm) {
        triggeredLaryngo++;
        break;
      }
      if (out.somaticResponse.triggerBronchospasm) {
        triggeredBroncho++;
        break;
      }
      pState.C_cat = out.C_cat;
      pState.MAP_set = out.MAP_set;
    }
  }

  console.log(`Preset: ${preset.name} -> Laryngospasm: ${triggeredLaryngo} / 100, Bronchospasm: ${triggeredBroncho} / 100`);
});
