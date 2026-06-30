import { describe, it, expect } from 'vitest';
import { BrainstemEngine } from '../engine/BrainstemEngine';

describe('BrainstemEngine — peripheral chemoreceptor (hypoxic) drive + vasomotor center', () => {
  it('produces zero contributions at normal SpO2/MAP', () => {
    const out = BrainstemEngine.tick({});
    expect(out.hypoxicDriveRR).toBe(0);
    expect(out.vasomotorSvrContribution).toBeCloseTo(0, 10);
  });

  it('hypoxia (SpO2 < 90) produces a hypoxic ventilatory drive that scales with severity', () => {
    const mild = BrainstemEngine.tick({ spo2: 88 });
    const severe = BrainstemEngine.tick({ spo2: 75 });
    expect(mild.hypoxicDriveRR).toBeGreaterThan(0);
    expect(severe.hypoxicDriveRR).toBeGreaterThan(mild.hypoxicDriveRR);
  });

  it('volatile anesthesia disproportionately blunts hypoxic drive even at modest MAC', () => {
    const awake = BrainstemEngine.tick({ spo2: 80, currentMac: 0 });
    const lightMac = BrainstemEngine.tick({ spo2: 80, currentMac: 0.3 });
    const deepMac = BrainstemEngine.tick({ spo2: 80, currentMac: 1.2 });
    expect(lightMac.hypoxicDriveRR).toBeLessThan(awake.hypoxicDriveRR);
    expect(deepMac.hypoxicDriveRR).toBeLessThan(lightMac.hypoxicDriveRR);
  });

  it('opioids further blunt hypoxic drive on top of volatile blunting', () => {
    const noOpioid = BrainstemEngine.tick({ spo2: 80, currentMac: 0.3, opioidEffect: 0 });
    const withOpioid = BrainstemEngine.tick({ spo2: 80, currentMac: 0.3, opioidEffect: 0.8 });
    expect(withOpioid.hypoxicDriveRR).toBeLessThan(noOpioid.hypoxicDriveRR);
  });

  it('hypotension (MAP below setpoint) produces a positive (vasoconstrictive) SVR contribution', () => {
    const out = BrainstemEngine.tick({ map: 60, mapSet: 93 });
    expect(out.vasomotorSvrContribution).toBeGreaterThan(0);
  });

  it('hypertension (MAP above setpoint) produces a negative (vasodilatory) SVR contribution', () => {
    const out = BrainstemEngine.tick({ map: 130, mapSet: 93 });
    expect(out.vasomotorSvrContribution).toBeLessThan(0);
  });

  it('deep volatile anesthesia (MAC >= ~1.5) abolishes the baroreflex-driven vasomotor response, matching CardiovascularEngine.ts\'s existing HR-side baroreflexGain threshold', () => {
    const out = BrainstemEngine.tick({ map: 50, mapSet: 93, currentMac: 1.6 });
    expect(out.vasomotorSvrContribution).toBe(0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => BrainstemEngine.tick(undefined as any)).not.toThrow();
    expect(() => BrainstemEngine.tick({ spo2: NaN, currentMac: NaN, map: NaN, mapSet: NaN })).not.toThrow();
    const out = BrainstemEngine.tick({ spo2: -50, currentMac: -5, opioidEffect: 5 });
    expect(Number.isFinite(out.hypoxicDriveRR)).toBe(true);
    expect(Number.isFinite(out.vasomotorSvrContribution)).toBe(true);
  });
});
