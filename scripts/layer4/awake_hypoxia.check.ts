import { createHeadlessSim, stepN, HEALTHY_CASE } from '../../src/testing/harness/headlessSim';
// Awake patient made hypoxic (no hypnotic) MUST still mount a tachypneic drive (F40 must not break this).
const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
stepN(s, 10);
(s.state.vitals as any).pao2 = 45; (s.state.vitals as any).spo2 = 80; // force hypoxia
stepN(s, 15);
console.log(`AWAKE hypoxic (SpO2 forced 80, no hypnotic): RR=${s.state.vitals.rr?.toFixed(0)} (expect elevated >12)`);
