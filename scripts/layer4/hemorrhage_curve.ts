import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
function atLoss(pct: number) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const ebv = (s.state.patient as any).ebv || 5000;
  stepN(s, 10);
  (s.state.patient as any).ebl = ebv * pct/100;
  stepN(s, 60);
  const v:any = s.state.vitals;
  return { hr: v.hr, map: v.map, svr: v.svr, co: v.co };
}
console.log('Blood loss → HR / MAP / SVR / CO (after HR-cap fix):');
for (const pct of [0, 10, 20, 30, 40]) {
  const r = atLoss(pct);
  console.log(`  ${String(pct).padStart(2)}% : HR=${r.hr?.toFixed(0).padStart(3)} MAP=${r.map?.toFixed(0).padStart(3)} SVR=${r.svr?.toFixed(0)} CO=${r.co?.toFixed(1)}`);
}
console.log('Clinical: 10-20% loss → SVR should RISE (vasoconstriction), CO falls modestly, MAP maintained ~85-90');
