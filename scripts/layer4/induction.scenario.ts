import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
function ce(name:string){const m=(s.state as any).activeMeds?.find((x:any)=>x.name===name);return m?m.Ce:0;}
const row = (label: string) => { const v:any=s.state.vitals; console.log(`${label.padEnd(10)} SpO2=${v.spo2?.toFixed(0).padStart(3)} RR=${String(v.rr?.toFixed(0)).padStart(3)} BIS=${String(v.bis?.toFixed(0)).padStart(3)} TOF=${v.tofCount} propCe=${ce('Propofol').toFixed(2)} fentCe=${ce('Fentanyl').toFixed(2)}`); };
stepN(s, 30);
giveMed(s, 'fentanyl', 150, { unit: 'mcg' }); stepN(s, 60);
giveMed(s, 'propofol', 140, { unit: 'mg' }); stepN(s, 20);
giveMed(s, 'rocuronium', 42, { unit: 'mg' });
for (let i=0;i<12;i++){ stepN(s, 10); row(`roc+${(i+1)*10}s`); }
