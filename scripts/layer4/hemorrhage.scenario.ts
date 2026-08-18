import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
(s.state.patient as any).trauma = true;
const ebv = (s.state.patient as any).ebv || 5000;
const row = (label: string) => { const v:any=s.state.vitals; const p:any=s.state.patient;
  console.log(`${label.padEnd(14)} HR=${String(v.hr?.toFixed(0)).padStart(3)} MAP=${String(v.map?.toFixed(0)).padStart(3)} PP=${(v.sys-v.dia)?.toFixed(0)} EBL=${(p.ebl||0).toFixed(0)}(${(100*(p.ebl||0)/ebv).toFixed(0)}%) Hgb=${p.currentHemoglobin?.toFixed(1)??p.hemoglobin} lact=${p.lacticAcid?.toFixed(1)}`); };
stepN(s, 20); row('baseline');
(s.state.patient as any).bleedRate = 4; // 240 mL/min
for (const m of [2,4,6,8]) { stepN(s, 120); row(`bleed ${m}min`); }
(s.state.patient as any).bleedRate = 0;
giveMed(s, 'Packed Red Blood Cells (PRBC)', 3, { unit: 'unit' });
giveMed(s, 'Lactated Ringers (LR)', 1500, { unit: 'mL' });
for (const m of [3,6,10]) { stepN(s, 180); row(`resus +${m}min`); }
