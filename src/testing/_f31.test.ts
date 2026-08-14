import { describe, it } from 'vitest';
import { writeFileSync } from 'fs';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed, intubateMechanical, getVital } from './harness/metamorphic';

describe('F31 opioid hemodynamics', () => {
  it('fentanyl + morphine: bradycardia, ~neutral MAP, modest CO change', () => {
    const L: string[] = [];
    const mk = () => { const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true }); giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12); return s; };
    for (const [nm, drug, dose, unit] of [['fentanyl', 'fentanyl', 200, 'mcg'], ['morphine', 'morphine', 8, 'mg']] as const) {
      const base = mk(); const s = mk(); giveMed(s, drug, dose as number, { unit });
      const rows: string[] = [];
      for (let i = 0; i < 8; i++) {
        stepN(base, 60); stepN(s, 60);
        rows.push(`${(i + 1) * 60}s HRΔ=${(getVital(s, 'hr')! - getVital(base, 'hr')!).toFixed(0)} MAPΔ=${(getVital(s, 'map')! - getVital(base, 'map')!).toFixed(0)} COΔ=${(getVital(s, 'co')! - getVital(base, 'co')!).toFixed(2)}`);
      }
      L.push(`--- ${nm} ---  ` + rows.join('  '));
    }
    writeFileSync('/tmp/f31.txt', L.join('\n') + '\n');
  });
});
