import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 3 · F36 — LAST (Local Anesthetic Systemic Toxicity) must be driven by the PLASMA concentration
 * spike from intravascular injection, not the slowly-equilibrating effect-site Ce. A local anesthetic's
 * ke0 is deliberately slow (models the LOCAL block onset), so the effect-site Ce is heavily damped and a
 * grossly toxic IV bolus produced NO toxicity. The LastModel now reads plasma Cp = A1/V1.
 */
function runLA(key: string, name: string, dose: number, seconds = 120) {
  const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  const base = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
  giveMed(s, key, dose, { unit: 'mg' });
  let cns = false, seizure = false, minMap = 999;
  for (let i = 0; i < seconds / 2; i++) {
    stepN(s, 2); stepN(base, 2);
    const p: any = s.state.patient;
    if (p.isSeizure) seizure = true;
    const map = s.state.vitals.map; if (typeof map === 'number' && map < minMap) minMap = map;
  }
  // CV toxicity manifests as cardiac depression (drugInotropyMod/drugSvrMod), i.e. a MAP drop vs baseline.
  const mapDrop = (base.state.vitals.map ?? 90) - minMap;
  return { cns, seizure, mapDrop };
}

describe('Layer 3 — LAST from intravascular LA injection (F36)', () => {
  it('a toxic IV bupivacaine bolus triggers LAST (CNS toxicity / seizure)', () => {
    const r = runLA('bupivacaine', 'Bupivacaine', 150);
    expect(r.cns || r.seizure, 'bupivacaine 150mg IV must trigger LAST').toBe(true);
  });

  it('a therapeutic IV lidocaine bolus does NOT trigger LAST (Cp below threshold)', () => {
    const r = runLA('lidocaine', 'Lidocaine', 100); // ~1.5 mg/kg, Cp0 ~4 < CNS threshold 5
    expect(r.cns || r.seizure, 'therapeutic lidocaine must not falsely trigger LAST').toBe(false);
  });

  it('bupivacaine is more cardiotoxic than ropivacaine at the same dose (CC:CNS ordering)', () => {
    const bup = runLA('bupivacaine', 'Bupivacaine', 50);
    const rop = runLA('ropivacaine', 'Ropivacaine', 50);
    // Bupivacaine's cvCollapse threshold (4.5) is far below ropivacaine's (8.0), so at an equal dose its
    // CV toxicity (cardiac depression) drops MAP more.
    expect(bup.mapDrop, `bupiv MAP drop=${bup.mapDrop.toFixed(0)} should exceed ropiv=${rop.mapDrop.toFixed(0)}`).toBeGreaterThan(rop.mapDrop);
  });
});
