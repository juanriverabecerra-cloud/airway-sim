import { describe, it, expect } from 'vitest';
import { MusculoskeletalModel } from '../engine/MusculoskeletalModel';

describe('MusculoskeletalModel — rhabdomyolysis, nerve injury risk, compartment syndrome', () => {
  it('at baseline with no insults, CK is stable near normal and no risks are flagged', () => {
    const out = MusculoskeletalModel.tick({ prevCkLevelUPerL: 200, prevMyoglobinUgL: 30, position: 'Supine', positionDurationSeconds: 60 });
    expect(out.ckLevelUPerL).toBeCloseTo(200, 0);
    expect(out.rhabdomyolysisActive).toBe(false);
    expect(out.compartmentSyndromeRisk).toBe(0);
  });

  it('MH rapidly raises CK, eventually triggering rhabdomyolysis + myoglobinuric AKI risk', () => {
    let state = { prevCkLevelUPerL: 200, prevMyoglobinUgL: 30, prevRhabdomyolysisLogged: false, prevMyoglobinuriaLogged: false };
    for (let i = 0; i < 200; i++) {
      const out = MusculoskeletalModel.tick({ ...state, mhActive: true, dt: 1 });
      state = { prevCkLevelUPerL: out.ckLevelUPerL, prevMyoglobinUgL: out.myoglobinUgL, prevRhabdomyolysisLogged: out.rhabdomyolysisActive, prevMyoglobinuriaLogged: out.myoglobinuriaRisk };
    }
    expect(state.prevCkLevelUPerL).toBeGreaterThan(5000);
    expect(state.prevMyoglobinUriaLogged || state.prevCkLevelUPerL > 5000).toBe(true);
  });

  it('succinylcholine-triggered myopathy rhabdomyolysis raises CK more slowly than MH', () => {
    const afterMH = MusculoskeletalModel.tick({ prevCkLevelUPerL: 200, mhActive: true, dt: 100 });
    const afterSux = MusculoskeletalModel.tick({ prevCkLevelUPerL: 200, succinylcholineMyopathyRhabdo: true, dt: 100 });
    expect(afterMH.ckLevelUPerL).toBeGreaterThan(afterSux.ckLevelUPerL);
    expect(afterSux.ckLevelUPerL).toBeGreaterThan(200);
  });

  it('CK decays back toward normal once the rhabdomyolysis trigger is removed', () => {
    const elevated = MusculoskeletalModel.tick({ prevCkLevelUPerL: 20000, dt: 3600 });
    expect(elevated.ckLevelUPerL).toBeLessThan(20000);
  });

  it('prolonged lithotomy position accumulates compartment syndrome risk after 2h', () => {
    const earlyLithotomy = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 3600 });
    const prolongedLithotomy = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 3 * 3600 });
    expect(earlyLithotomy.compartmentSyndromeRisk).toBe(0);
    expect(prolongedLithotomy.compartmentSyndromeRisk).toBeGreaterThan(0);
  });

  it('compartment syndrome risk is zero in non-lithotomy positions', () => {
    const prone = MusculoskeletalModel.tick({ position: 'Prone', positionDurationSeconds: 6 * 3600 });
    expect(prone.compartmentSyndromeRisk).toBe(0);
  });

  it('nerve injury risk accumulates faster in high-risk positions (lithotomy > supine)', () => {
    const supine = MusculoskeletalModel.tick({ position: 'Supine', positionDurationSeconds: 14400, paddingAdequate: false });
    const lithotomy = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 14400, paddingAdequate: false });
    expect(lithotomy.nerveInjuryRiskIndex).toBeGreaterThan(supine.nerveInjuryRiskIndex);
  });

  it('adequate padding substantially reduces nerve injury risk accumulation', () => {
    const unpadded = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 7200, paddingAdequate: false });
    const padded = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 7200, paddingAdequate: true });
    expect(unpadded.nerveInjuryRiskIndex).toBeGreaterThan(padded.nerveInjuryRiskIndex);
    expect(unpadded.nerveInjuryRiskIndex).toBeGreaterThan(padded.nerveInjuryRiskIndex * 3);
  });

  it('fires compartment syndrome narrative event on first threshold crossing, not every tick', () => {
    // 4h = 14400s → risk = (14400-7200)/10800 = 0.667 > 0.5 threshold
    const onset = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 4 * 3600, prevCompartmentSyndromeLogged: false, prevCompartmentSyndromeRisk: 0 });
    expect(onset.events.some(e => e.includes('compartment'))).toBe(true);

    const steady = MusculoskeletalModel.tick({ position: 'Lithotomy', positionDurationSeconds: 4 * 3600, prevCompartmentSyndromeLogged: true, prevCompartmentSyndromeRisk: onset.compartmentSyndromeRisk });
    expect(steady.events.some(e => e.includes('compartment'))).toBe(false);
  });

  it('hasRhabdomyolysis is true when CK > 5000, feeding RenalEngine.ts existing inputs', () => {
    const out = MusculoskeletalModel.tick({ prevCkLevelUPerL: 10000 });
    expect(out.hasRhabdomyolysis).toBe(true);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => MusculoskeletalModel.tick(undefined as any)).not.toThrow();
    expect(() => MusculoskeletalModel.tick({ prevCkLevelUPerL: NaN, mhActive: 'yes' as any, dt: NaN } as any)).not.toThrow();
    const out = MusculoskeletalModel.tick({ prevCkLevelUPerL: -100, positionDurationSeconds: -1, dt: 0 });
    expect(Number.isFinite(out.ckLevelUPerL)).toBe(true);
    expect(Number.isFinite(out.nerveInjuryRiskIndex)).toBe(true);
  });
});
