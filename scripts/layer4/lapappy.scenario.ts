/**
 * Layer 4 scenario: routine healthy lap appendectomy.
 * 38yo healthy male, 80kg. Standard induction: lidocaine 100mg, fentanyl 150mcg,
 * propofol 160mg, rocuronium 50mg. Then intubate, sevo maintenance, run 60 min.
 * Reproduces the user-reported bug cluster (induction crash, CPP<50, ICP drift,
 * spontaneous recruitment maneuvers, adrenal suppression, late decompensation).
 */
import { createHeadlessSim, stepN, makeFuzzHandlers, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
import { giveMed } from '../../src/testing/harness/metamorphic';

const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
const h = makeFuzzHandlers(s);

const n = (x: any, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '--');
function row(label: string) {
  const v: any = s.state.vitals; const p: any = s.state.patient;
  console.log(
    `${label.padEnd(14)} HR=${n(v.hr).padStart(3)} BP=${n(v.sys)}/${n(v.dia)} MAP=${n(v.map).padStart(3)}` +
    ` SpO2=${n(v.spo2).padStart(3)} BIS=${n(v.bis).padStart(3)} ETCO2=${n(v.etco2).padStart(2)}` +
    ` PIP=${n(v.pip).padStart(2)} ICP=${n(p.icp, 1).padStart(5)} CPP=${n(p.cpp).padStart(4)}` +
    ` CO=${n(v.co, 1).padStart(4)} SVR=${n(v.svr).padStart(4)} cort=${n(p.cortisol, 1).padStart(5)}` +
    ` atel=${n(p.atelectasis, 2)} recT=${n(p.recruitmentTime)}`,
  );
}

h.handleSetO2('Face Mask', 15, 100);
stepN(s, 180); row('preox done');

giveMed(s, 'lidocaine', 100, { unit: 'mg' });
giveMed(s, 'fentanyl', 150, { unit: 'mcg' });
stepN(s, 30); row('post-fent');
giveMed(s, 'propofol', 160, { unit: 'mg' });
stepN(s, 20); row('post-prop');
giveMed(s, 'rocuronium', 50, { unit: 'mg' });
stepN(s, 40); row('post-roc');

// Intubate + mechanical ventilation + sevo maintenance
const p: any = s.state.patient;
p.airwaySecured = true; p.ventilationStatus = 'mechanical'; p.tubePosition = 'trachea';
h.handleSetVentSettings({ mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 50 });
Object.assign(s.state.gasSettings, { agent: 'sevoflurane', dial: 2.0, o2Flow: 1.0, airFlow: 1.0 });
h.handleSetSurgicalPhase?.('Incision');
s.ctx.setSurgicalPhase('Incision');
stepN(s, 60); row('intubated+1m');

for (let m = 2; m <= 60; m++) {
  stepN(s, 60);
  if (m <= 10 || m % 5 === 0) row(`maint+${m}m`);
}

const evs = s.events;
const recruitEvents = evs.filter((e) => /recruitment maneuver completed/i.test(e)).length;
console.log(`\n--- recruitment-maneuver "SUCCESS" events fired: ${recruitEvents} (user never requested one) ---`);
console.log('--- last 25 log events ---');
evs.slice(-25).forEach((e) => console.log('  ' + e));
