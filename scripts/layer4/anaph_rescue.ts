import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
stepN(s, 20); (s.state.patient as any).anaphylaxisTriggered = true;
stepN(s, 40);
const row=(l:string)=>{const v:any=s.state.vitals;console.log(`${l.padEnd(12)} HR=${String(v.hr?.toFixed(0)).padStart(3)} MAP=${String(v.map?.toFixed(0)).padStart(3)}`);};
row('anaph 40s');
giveMed(s, 'Lactated Ringers (LR)', 2000, { unit: 'mL' });
for (let m=1;m<=8;m++){ giveMed(s,'epinephrine',0.1,{unit:'mg'}); stepN(s,60); row(`epi q1m +${m}m`); } // q1min epi (sustained tx)
