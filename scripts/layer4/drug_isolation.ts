/** Isolate each induction drug's hemodynamic effect on a ventilated healthy adult. */
import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';

const n = (x: any, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '--');

function isolate(label: string, med: string, dose: number, unit: string, secs = 240, clinical = '') {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
  const h = makeFuzzHandlers(s);
  h.handleSetO2('Face Mask', 15, 100);
  stepN(s, 60);
  // Fully ventilated so apnea/hypercapnia can't confound the drug's own hemodynamics
  const p: any = s.state.patient;
  p.airwaySecured = true; p.ventilationStatus = 'mechanical'; p.tubePosition = 'trachea';
  h.handleSetVentSettings({ mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 50 });
  stepN(s, 60);
  const v0: any = { ...s.state.vitals };
  giveMed(s, med, dose, { unit });
  let mapNadir = 999, mapPeak = -999, hrNadir = 999, hrPeak = -999;
  for (let t = 0; t < secs; t++) {
    stepN(s, 1);
    const v: any = s.state.vitals;
    if (v.map < mapNadir) mapNadir = v.map; if (v.map > mapPeak) mapPeak = v.map;
    if (v.hr < hrNadir) hrNadir = v.hr; if (v.hr > hrPeak) hrPeak = v.hr;
  }
  const pctDown = (100 * (mapNadir - v0.map) / v0.map);
  const pctUp = (100 * (mapPeak - v0.map) / v0.map);
  console.log(
    `${label.padEnd(26)} MAP ${n(v0.map)} -> nadir ${n(mapNadir)} (${pctDown.toFixed(0)}%) / peak ${n(mapPeak)} (+${pctUp.toFixed(0)}%)` +
    ` | HR ${n(v0.hr)} -> ${n(hrNadir)}..${n(hrPeak)}  ${clinical}`,
  );
}

console.log('=== ventilated healthy 38yo/80kg, each drug in isolation ===');
isolate('lidocaine 100mg (1.5mg/kg)', 'lidocaine', 100, 'mg', 240, '[clinical: MAP ~0 to -5%]');
isolate('fentanyl 150mcg (2mcg/kg)', 'fentanyl', 150, 'mcg', 240, '[clinical: MAP -5 to -10%, HR DOWN]');
isolate('propofol 160mg (2mg/kg)', 'propofol', 160, 'mg', 240, '[clinical: MAP -20 to -30%]');
isolate('rocuronium 50mg (0.6mg/kg)', 'rocuronium', 50, 'mg', 240, '[clinical: MAP ~0%]');
isolate('phenylephrine 100mcg', 'phenylephrine', 100, 'mcg', 240, '[clinical: MAP +20 to +30%, HR DOWN]');
isolate('phenylephrine 200mcg', 'phenylephrine', 200, 'mcg', 240, '[clinical: MAP +30 to +40%]');
isolate('ephedrine 10mg', 'ephedrine', 10, 'mg', 240, '[clinical: MAP +15 to +25%, HR UP]');
