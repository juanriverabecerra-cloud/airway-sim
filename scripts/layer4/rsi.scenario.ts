import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';

// (A) Preox apnea time with mask REMOVED after preox (classic RSI, no apneic oxygenation)
{
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const h = makeFuzzHandlers(s);
  h.handleSetO2('Face Mask', 15, 100); stepN(s, 180);
  h.handleSetO2('Room Air', 0, 21); // remove mask for intubation
  giveMed(s, 'etomidate', 20, { unit: 'mg' });
  giveMed(s, 'succinylcholine', 100, { unit: 'mg' });
  let tTo90 = -1;
  for (let t = 1; t <= 900; t++) { stepN(s, 1); if (tTo90 < 0 && (s.state.vitals.spo2 ?? 100) < 90) { tTo90 = t; break; } }
  console.log(`PREOX + mask OFF: time to SpO2<90 = ${tTo90 < 0 ? '>900' : (tTo90/60).toFixed(1)+'min'} (clinical ~6-8min)`);
}
// (B) Etomidate hemodynamics in ISOLATION (ventilated, no apnea/sux confound)
{
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const h = makeFuzzHandlers(s);
  h.handleSetO2('Face Mask', 15, 100); stepN(s, 30);
  const base = s.state.vitals.map;
  giveMed(s, 'etomidate', 20, { unit: 'mg' });
  h.handleSetVentSettings({ rr: 12 }); // keep ventilated to isolate drug effect
  (s.state.patient as any).airwaySecured = true; (s.state.patient as any).ventilationStatus = 'mechanical'; (s.state.patient as any).tubePosition = 'trachea';
  let nadir = 999;
  for (let t = 1; t <= 180; t++) { stepN(s, 1); if (s.state.vitals.map! < nadir) nadir = s.state.vitals.map!; }
  console.log(`ETOMIDATE alone (ventilated): MAP ${base?.toFixed(0)}→nadir ${nadir?.toFixed(0)} (${(100*(nadir-base!)/base!).toFixed(0)}%; clinical etomidate ~-5 to -10%)`);
}
