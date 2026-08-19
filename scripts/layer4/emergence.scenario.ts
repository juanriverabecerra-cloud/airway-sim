import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed, intubateMechanical } from '../../src/testing/harness/metamorphic';
function emerge(reversal: string, dose: number) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  intubateMechanical(s, 12);
  giveMed(s, 'propofol', 120, { unit: 'mg' });
  giveMed(s, 'rocuronium', 50, { unit: 'mg' });
  stepN(s, 180); // maintenance / deep block established
  const row=(l:string)=>{const v:any=s.state.vitals;console.log(`  ${l.padEnd(12)} TOF=${v.tofCount} TOFr=${v.tofRatio?.toFixed(2)} BIS=${String(v.bis?.toFixed(0)).padStart(3)} RR=${v.rr?.toFixed(0)} SpO2=${v.spo2?.toFixed(0)}`);};
  console.log(`${reversal} ${dose}${reversal==='sugammadex'?'mg':'mg'} at deep block (TOF=${s.state.vitals.tofCount}):`);
  row('pre-reversal');
  // stop propofol (already bolus, will wash out), stop vent to allow spontaneous, give reversal
  (s.state.patient as any).ventilationStatus = 'spontaneous';
  giveMed(s, reversal, dose, { unit: 'mg' });
  for (const m of [1,3,5,8]) { stepN(s, m===1?60:120); row(`+${m===1?1:[1,3,5,8].slice(0,[1,3,5,8].indexOf(m)+1).reduce((a,b)=>b)}m`); }
}
emerge('sugammadex', 200);
emerge('neostigmine', 5);
