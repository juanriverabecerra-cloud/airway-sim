/** End-to-end verification of the seven reported issues. */
import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';
const n = (x:any,d=0)=> (typeof x==='number'&&Number.isFinite(x)?x.toFixed(d):'--');

// --- Routine lap appy, 60 min ---
const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
const h = makeFuzzHandlers(s);
h.handleSetO2('Face Mask', 15, 100); stepN(s, 180);
const base = s.state.vitals.map;
giveMed(s, 'lidocaine', 100, { unit: 'mg' });
giveMed(s, 'fentanyl', 150, { unit: 'mcg' }); stepN(s, 30);
giveMed(s, 'propofol', 160, { unit: 'mg' }); stepN(s, 20);
giveMed(s, 'rocuronium', 50, { unit: 'mg' }); stepN(s, 40);
let mapNadir = 999; for (let t=0;t<60;t++){ stepN(s,1); if (s.state.vitals.map < mapNadir) mapNadir = s.state.vitals.map; }
const p: any = s.state.patient;
p.airwaySecured = true; p.ventilationStatus='mechanical'; p.tubePosition='trachea';
h.handleSetVentSettings({ mode:'PCV-VG', vt:500, rr:12, peep:5, pmax:40, fio2:50 });
Object.assign(s.state.gasSettings, { agent:'sevoflurane', dial:2.0, o2Flow:1.0, airFlow:1.0 });
s.ctx.setSurgicalPhase('Incision');
let cppMin = 999, pipMax = 0, icpMax = 0, complMin = 999;
for (let t=0;t<3600;t++){ stepN(s,1);
  const v:any=s.state.vitals, q:any=s.state.patient;
  if (q.cpp < cppMin) cppMin = q.cpp; if (v.pip > pipMax) pipMax = v.pip;
  if (q.icp > icpMax) icpMax = q.icp; if (v.compl < complMin) complMin = v.compl; }
const v:any = s.state.vitals, q:any = s.state.patient;
const cnt = (re: RegExp) => s.events.filter(e => re.test(e)).length;

console.log('=== 60-min routine lap appendectomy, healthy 38yo (nothing else given) ===');
console.log(`1. Induction MAP    ${n(base)} -> nadir ${n(mapNadir)} (${(100*(mapNadir-base)/base).toFixed(0)}%)   [was -51%, clinical -25 to -35%]`);
console.log(`2. Survived 60 min  arrest=${!!q.isArrest}  final MAP=${n(v.map)} ETCO2=${n(v.etco2)} PaCO2=${n(v.paco2)} pH=${n(v.ph,2)}  [was: asystole @16min, ETCO2 114, pH 6.24]`);
console.log(`   Compliance min   ${n(complMin)} mL/cmH2O   PIP max ${n(pipMax)}   [was 8 mL/cmH2O and PIP 40]`);
console.log(`3. Adrenal crisis   ${cnt(/Adrenal Crisis/)} events   hydrocortisone needed=${!!q.adrenalCrisisActive}   [was: fired in every patient]`);
console.log(`4. CPP minimum      ${n(cppMin)} mmHg   CPP<50 alerts=${cnt(/Cerebral Perfusion Pressure \(CPP\) has fallen/)}   [was 26 mmHg, sustained <50]`);
console.log(`5. Recruitment      ${cnt(/recruitment maneuver completed/)} unrequested maneuvers   [was 422]`);
console.log(`6. ICP maximum      ${n(icpMax,1)} mmHg   ICP>20 alerts=${cnt(/Intracranial Pressure \(ICP\) has risen/)}   [was 26.6]`);
console.log(`   Biliary spasm    ${cnt(/sphincter of Oddi/)} events   [was: fired in 10/10 patients]`);

// --- 7. Phenylephrine rescue from real hypotension ---
const r = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
const rh = makeFuzzHandlers(r);
rh.handleSetO2('Face Mask', 15, 100); stepN(r, 60);
const rp: any = r.state.patient;
rp.airwaySecured = true; rp.ventilationStatus='mechanical'; rp.tubePosition='trachea';
rh.handleSetVentSettings({ mode:'PCV-VG', vt:500, rr:12, peep:5, pmax:40, fio2:50 });
giveMed(r, 'propofol', 200, { unit: 'mg' }); stepN(r, 120);
const preMap = r.state.vitals.map, preHr = r.state.vitals.hr;
giveMed(r, 'phenylephrine', 100, { unit: 'mcg' });
let peak = -999, hrMin = 999;
for (let t=0;t<180;t++){ stepN(r,1); if (r.state.vitals.map > peak) peak = r.state.vitals.map; if (r.state.vitals.hr < hrMin) hrMin = r.state.vitals.hr; }
console.log(`\n7. Phenylephrine 100mcg into propofol hypotension: MAP ${n(preMap)} -> ${n(peak)} (+${(100*(peak-preMap)/preMap).toFixed(0)}%)  HR ${n(preHr)} -> ${n(hrMin)} (no negative HR)`);

// --- Monitor coherence during a genuine arrest ---
const a = createHeadlessSim(HEALTHY_CASE, { seed: 9, withPIV: true });
(a.state.patient as any).isArrest = true; (a.state.patient as any).cardiacRhythm = 'asystole';
stepN(a, 60);
const av:any = a.state.vitals, aq:any = a.state.patient;
console.log(`\nMonitor coherence in ASYSTOLE: HR=${n(av.hr)} MAP=${n(av.map)} ICP=${n(aq.icp,1)} CPP=${n(aq.cpp)}  [was CPP=64 with MAP=0 — engines were fed a fabricated MAP of 90]`);
