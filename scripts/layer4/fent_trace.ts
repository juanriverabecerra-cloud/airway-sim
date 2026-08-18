/** Second-by-second trace of fentanyl-only and propofol-only on a ventilated healthy adult. */
import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';

const n = (x: any, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '--');

function trace(med: string, dose: number, unit: string) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const h = makeFuzzHandlers(s);
  h.handleSetO2('Face Mask', 15, 100);
  stepN(s, 60);
  const p: any = s.state.patient;
  p.airwaySecured = true; p.ventilationStatus = 'mechanical'; p.tubePosition = 'trachea';
  h.handleSetVentSettings({ mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 50 });
  stepN(s, 60);
  console.log(`\n=== ${med} ${dose}${unit} ===`);
  const show = (t: string) => {
    const v: any = s.state.vitals; const q: any = s.state.patient;
    const m = (s.state.activeMeds || []).find((x: any) => x.name.toLowerCase().startsWith(med.slice(0, 5)));
    console.log(
      `${t.padEnd(8)} MAP=${n(v.map).padStart(3)} HR=${n(v.hr).padStart(3)} SVR=${n(v.svr).padStart(4)} CO=${n(v.co, 1).padStart(4)}` +
      ` SV=${n(v.sv).padStart(3)} contr=${n(q.contractility, 2)} preload=${n(q.preload ?? v.cvp, 1)}` +
      ` Ce=${n(m?.Ce, 4)} vent=${q.ventilationStatus} apneic=${q.isApneic} paco2=${n(v.paco2)} spo2=${n(v.spo2)}` +
      ` bis=${n(v.bis)} painIdx=${n(q.painIndex ?? q.nociception, 2)} catechol=${n(q.endogenousCatecholamines ?? q.catecholamineLevel, 2)}`,
    );
  };
  show('pre');
  giveMed(s, med, dose, { unit });
  for (const t of [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240]) {
    while ((s.state.time ?? 0) < 120 + t) stepN(s, 1);
    show(`+${t}s`);
  }
}

trace('fentanyl', 150, 'mcg');
trace('propofol', 160, 'mg');
