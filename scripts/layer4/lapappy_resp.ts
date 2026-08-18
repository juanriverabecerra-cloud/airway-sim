/** Trace what drives PIP 15->40 in the routine lap appy. */
import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';

const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
const h = makeFuzzHandlers(s);
const n = (x: any, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '--');

function row(label: string) {
  const v: any = s.state.vitals; const p: any = s.state.patient;
  console.log(
    `${label.padEnd(10)} PIP=${n(v.pip).padStart(3)} Pplat=${n(v.pplat).padStart(3)} compl=${n(v.compl).padStart(3)} res=${n(v.res).padStart(4)}` +
    ` VTe=${n(v.vte).padStart(4)} MV=${n(v.mv, 1).padStart(4)} etco2=${n(v.etco2).padStart(3)} paco2=${n(v.paco2).padStart(3)}` +
    ` shunt=${n(v.shunt, 2)} atel=${n(p.atelectasis, 2)} FRC=${n(p.lungVolumes?.frc_L, 2)}` +
    ` rigid=${p.opioidRigidityActive} bronchCa=${n(p.bronchialSmoothMuscleCa, 2)} edema=${n(p.pulmonaryEdema ?? p.lungWater, 2)}` +
    ` pneumo=${p.pneumoperitoneumActive ?? '-'} iap=${n(p.intraAbdominalPressure)} MAP=${n(v.map)}`,
  );
}

h.handleSetO2('Face Mask', 15, 100);
stepN(s, 180);
giveMed(s, 'lidocaine', 100, { unit: 'mg' });
giveMed(s, 'fentanyl', 150, { unit: 'mcg' });
stepN(s, 30);
giveMed(s, 'propofol', 160, { unit: 'mg' });
stepN(s, 20);
giveMed(s, 'rocuronium', 50, { unit: 'mg' });
stepN(s, 40);
const p: any = s.state.patient;
p.airwaySecured = true; p.ventilationStatus = 'mechanical'; p.tubePosition = 'trachea';
h.handleSetVentSettings({ mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 50 });
Object.assign(s.state.gasSettings, { agent: 'sevoflurane', dial: 2.0, o2Flow: 1.0, airFlow: 1.0 });
s.ctx.setSurgicalPhase('Incision');
row('intubated');
for (let m = 1; m <= 16; m++) { stepN(s, 60); row(`+${m}m`); }
