import { describe, it, expect } from 'vitest';
import { PulmonaryEmbolismModel } from '../engine/PulmonaryEmbolismModel';

describe('PulmonaryEmbolismModel — intraoperative PE crisis', () => {
  it('inactive when no PE event', () => {
    const out = PulmonaryEmbolismModel.tick({ active: false });
    expect(out.active).toBe(false);
    expect(out.pvrIncreaseFraction).toBe(0);
    expect(out.cardiacOutputFraction).toBe(1.0);
  });

  it('massive PE causes significant PVR increase and RV failure', () => {
    const out = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.6 });
    expect(out.pvrIncreaseFraction).toBeGreaterThan(1.0);
    expect(out.rvFailureSeverity).toBeGreaterThan(0.5);
    expect(out.cardiacOutputFraction).toBeLessThan(0.8);
  });

  it('EtCO2 drops while PaCO2 rises (pathognomonic dead space sign)', () => {
    const out = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.5 });
    expect(out.etco2DropMmHg).toBeGreaterThan(5);
    expect(out.paco2RiseMmHg).toBeGreaterThan(0);
  });

  it('larger occlusion produces greater hemodynamic collapse', () => {
    const moderate = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.35 });
    const massive = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.7 });
    expect(massive.rvFailureSeverity).toBeGreaterThan(moderate.rvFailureSeverity);
    expect(massive.cardiacOutputFraction).toBeLessThan(moderate.cardiacOutputFraction);
    expect(massive.etco2DropMmHg).toBeGreaterThan(moderate.etco2DropMmHg);
  });

  it('tPA thrombolysis lyses clot and reduces effective occlusion over time', () => {
    const noTreatment = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.6, minutesSinceOnset: 60, tpaActive: false });
    const withTPA = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.6, minutesSinceOnset: 60, tpaActive: true });
    expect(withTPA.occlusionFraction).toBeLessThan(noTreatment.occlusionFraction);
    expect(withTPA.cardiacOutputFraction).toBeGreaterThan(noTreatment.cardiacOutputFraction);
  });

  it('fires EtCO2 drop event and RV failure event at appropriate thresholds', () => {
    const moderate = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.35, prevEtco2DropLogged: false });
    expect(moderate.events.some(e => e.includes('EtCO2 DROP'))).toBe(true);

    const massive = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.7, prevEtco2DropLogged: true, prevCollapseLogged: false });
    expect(massive.events.some(e => e.includes('MASSIVE PULMONARY EMBOLISM'))).toBe(true);
  });

  it('events only fire once (transition-gated)', () => {
    const steady = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: 0.6, prevEtco2DropLogged: true, prevCollapseLogged: true });
    expect(steady.events.length).toBe(0);
  });

  it('falls back safely and never throws', () => {
    expect(() => PulmonaryEmbolismModel.tick(undefined as any)).not.toThrow();
    expect(() => PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: NaN } as any)).not.toThrow();
    const out = PulmonaryEmbolismModel.tick({ active: true, occlusionFraction: -1 });
    expect(Number.isFinite(out.cardiacOutputFraction)).toBe(true);
    expect(out.cardiacOutputFraction).toBeGreaterThan(0);
  });
});
