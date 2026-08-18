import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
const h = makeFuzzHandlers(s);
h.handleSetO2('Face Mask', 15, 100); stepN(s, 180);
h.handleSetO2('Room Air', 0, 21);
giveMed(s, 'etomidate', 20, { unit: 'mg' }); giveMed(s, 'succinylcholine', 100, { unit: 'mg' });
for (const m of [1,2,4,6,8,10,12,15]) { stepN(s, m*60 - (s.state.time - 180)); const v:any=s.state.vitals;
  console.log(`  t=${m}min apnea: SpO2=${v.spo2?.toFixed(0)} pao2=${v.pao2?.toFixed(0)} O2buf=${(s.state.patient as any).oxygenBuffer?.toFixed(2)}L`); }
