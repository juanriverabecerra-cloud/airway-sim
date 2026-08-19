import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
const h = makeFuzzHandlers(s);
stepN(s, 10);
(s.state.patient as any).cardiacRhythm = 'vfib'; (s.state.patient as any).isArrest = true;
h.handleToggleCPR();
for (const m of [1,2,3]) { giveMed(s,'epinephrine',1,{unit:'mg'}); stepN(s,60);
  const p:any=s.state.patient; const v:any=s.state.vitals;
  console.log(`CPR+epi ${m}min: cprCPP=${p.cprCPP?.toFixed?.(1)??p.cprCoronaryPerfusionPressure?.toFixed?.(1)??'?'} MAP=${v.map?.toFixed(0)} cmap=${v.cmap?.toFixed(0)}`); }
