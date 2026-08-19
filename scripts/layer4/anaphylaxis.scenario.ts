import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed, intubateMechanical } from '../../src/testing/harness/metamorphic';
// (A) EARLY epi rescue (given at 1 min, MAP still ~45) — does it rescue or arrest?
{
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const row = (l:string)=>{const v:any=s.state.vitals;console.log(`  ${l.padEnd(12)} HR=${String(v.hr?.toFixed(0)).padStart(3)} MAP=${String(v.map?.toFixed(0)).padStart(3)} SVR=${String(v.svr?.toFixed(0)).padStart(4)}`);};
  stepN(s, 20); (s.state.patient as any).anaphylaxisTriggered = true;
  stepN(s, 60); row('anaph 1m');
  giveMed(s, 'epinephrine', 0.05, { unit: 'mg' }); // 50 mcg IV titrated
  for (const m of [1,2,4]) { stepN(s, 60); row(`epi50 +${m}m`); }
}
// (B) Intubated anaphylaxis — does bronchospasm raise PIP / drop SpO2?
{
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  intubateMechanical(s, 12);
  stepN(s, 20); (s.state.patient as any).anaphylaxisTriggered = true;
  console.log('  --- intubated ---');
  for (const m of [1,3,5]) { stepN(s, 60); const v:any=s.state.vitals; console.log(`  anaph ${m}m: PIP=${v.pip?.toFixed(0)} SpO2=${v.spo2?.toFixed(0)} MAP=${v.map?.toFixed(0)}`); }
}
