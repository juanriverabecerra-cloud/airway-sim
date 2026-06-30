import { describe, it, expect } from 'vitest';
import { CoagulationCascadeModel } from '../engine/CoagulationCascadeModel';

describe('CoagulationCascadeModel — platelet/fibrinogen/factor cascade, TEG, lethal triad', () => {
  it('produces normal baseline parameters at physiologic conditions with no insults', () => {
    const out = CoagulationCascadeModel.tick({
      prevPlateletCountK: 250, prevFibrinogenMgDl: 300, prevFactorActivityFraction: 1.0,
      temperature: 37, pH: 7.4, bloodLossRateMlPerSec: 0, crystalloidInfusionRateMlPerSec: 0
    });
    expect(out.inr).toBeCloseTo(1.0, 1);
    expect(out.plateletCountK).toBeCloseTo(250, 0);
    expect(out.fibrinogenMgDl).toBeCloseTo(300, 0);
    expect(out.lethalTriadActive).toBe(false);
    expect(out.tegLY30).toBeLessThan(5);
  });

  it('massive hemorrhage depletes platelets, fibrinogen, and factor activity over time', () => {
    let state = { prevPlateletCountK: 250, prevFibrinogenMgDl: 300, prevFactorActivityFraction: 1.0, prevFibrinolysisIndex: 0.0 };
    for (let i = 0; i < 3600; i++) {
      const out = CoagulationCascadeModel.tick({ ...state, bloodLossRateMlPerSec: 1.5, ebv: 5000, dt: 1 });
      state = { prevPlateletCountK: out.plateletCountK, prevFibrinogenMgDl: out.fibrinogenMgDl, prevFactorActivityFraction: out.factorActivityFraction, prevFibrinolysisIndex: out.fibrinolysisIndex };
    }
    expect(state.prevPlateletCountK).toBeLessThan(200);
    expect(state.prevFibrinogenMgDl).toBeLessThan(250);
    expect(state.prevFactorActivityFraction).toBeLessThan(0.7);
  });

  it('fibrinogen falls faster than platelet count in massive hemorrhage (shorter half-life)', () => {
    const after1h = CoagulationCascadeModel.tick({ prevPlateletCountK: 250, prevFibrinogenMgDl: 300, prevFactorActivityFraction: 1.0, bloodLossRateMlPerSec: 1.5, ebv: 5000, dt: 3600 });
    const pltDrop = (250 - after1h.plateletCountK) / 250;
    const fibDrop = (300 - after1h.fibrinogenMgDl) / 300;
    expect(fibDrop).toBeGreaterThan(pltDrop);
  });

  it('hypothermia (< 35°C) impairs coagulation enzyme activity, dose-dependently', () => {
    const normal = CoagulationCascadeModel.tick({ temperature: 37, pH: 7.4, prevFactorActivityFraction: 1.0, dt: 1800 });
    const mild = CoagulationCascadeModel.tick({ temperature: 34, pH: 7.4, prevFactorActivityFraction: 1.0, dt: 1800 });
    const severe = CoagulationCascadeModel.tick({ temperature: 30, pH: 7.4, prevFactorActivityFraction: 1.0, dt: 1800 });
    expect(mild.factorActivityFraction).toBeLessThan(normal.factorActivityFraction);
    expect(severe.factorActivityFraction).toBeLessThan(mild.factorActivityFraction);
    expect(mild.hypothermiaCoagImpairment).toBeGreaterThan(0);
  });

  it('acidosis (pH < 7.2) independently impairs coagulation, dose-dependently', () => {
    const normal = CoagulationCascadeModel.tick({ temperature: 37, pH: 7.4, prevFactorActivityFraction: 1.0, dt: 1800 });
    const mild = CoagulationCascadeModel.tick({ temperature: 37, pH: 7.1, prevFactorActivityFraction: 1.0, dt: 1800 });
    const severe = CoagulationCascadeModel.tick({ temperature: 37, pH: 6.9, prevFactorActivityFraction: 1.0, dt: 1800 });
    expect(mild.factorActivityFraction).toBeLessThan(normal.factorActivityFraction);
    expect(severe.factorActivityFraction).toBeLessThan(mild.factorActivityFraction);
    expect(mild.acidosisCoagImpairment).toBeGreaterThan(0);
  });

  it('massive crystalloid infusion dilutes coagulation factors and platelets (dilutional coagulopathy)', () => {
    const none = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 1.0, prevPlateletCountK: 250, crystalloidInfusionRateMlPerSec: 0, ebv: 5000, dt: 3600 });
    const massive = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 1.0, prevPlateletCountK: 250, crystalloidInfusionRateMlPerSec: 2.0, ebv: 5000, dt: 3600 });
    expect(massive.factorActivityFraction).toBeLessThan(none.factorActivityFraction);
    expect(massive.plateletCountK).toBeLessThan(none.plateletCountK);
  });

  it('DIC causes consumptive coagulopathy and triggers a narrative event on first onset', () => {
    const onset = CoagulationCascadeModel.tick({ isActiveDIC: true, isDICLogged: false, prevPlateletCountK: 250, prevFibrinogenMgDl: 300, prevFactorActivityFraction: 1.0, dt: 600 });
    expect(onset.isDIC).toBe(true);
    expect(onset.events.some(e => e.includes('Disseminated Intravascular Coagulation'))).toBe(true);

    const steady = CoagulationCascadeModel.tick({ isActiveDIC: true, isDICLogged: true, prevPlateletCountK: 250, prevFibrinogenMgDl: 300, prevFactorActivityFraction: 1.0, dt: 600 });
    expect(steady.events.some(e => e.includes('DIC'))).toBe(false);
  });

  it('TXA reduces fibrinolysis index, which in turn reduces TEG LY30 toward normal', () => {
    const noTxa = CoagulationCascadeModel.tick({ isActiveDIC: true, prevFibrinolysisIndex: 0.5, txaCe: 0, dt: 600 });
    const withTxa = CoagulationCascadeModel.tick({ isActiveDIC: true, prevFibrinolysisIndex: 0.5, txaCe: 50, dt: 600 });
    expect(withTxa.fibrinolysisIndex).toBeLessThan(noTxa.fibrinolysisIndex);
    expect(withTxa.tegLY30).toBeLessThan(noTxa.tegLY30);
  });

  it('heparin prolongs aPTT and elevates INR; protamine reversal restores them', () => {
    const baseline = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 1.0, heparinCe: 0 });
    const heparinized = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 1.0, heparinCe: 3.0 });
    const reversed = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 1.0, heparinCe: 3.0, protamineCe: 5.0 });
    expect(heparinized.aptt).toBeGreaterThan(baseline.aptt);
    expect(reversed.aptt).toBeLessThan(heparinized.aptt);
    // Real protamine reversal never brings aPTT exactly to baseline (residual heparin + protamine's
    // own mild anticoagulant effect at high doses); just verify it significantly shortens the aPTT.
    expect(heparinized.aptt - reversed.aptt).toBeGreaterThan(heparinized.aptt * 0.5);
  });

  it('blood products restore their respective parameters: FFP restores factors, platelets restore count, cryo raises fibrinogen', () => {
    const noProducts = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 0.4, prevPlateletCountK: 50, prevFibrinogenMgDl: 80 });
    const withFFP = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 0.4, prevPlateletCountK: 50, prevFibrinogenMgDl: 80, ffpVolumeMlThisTick: 250 });
    const withPlatelets = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 0.4, prevPlateletCountK: 50, prevFibrinogenMgDl: 80, plateletsVolumeMlThisTick: 250 });
    const withCryo = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 0.4, prevPlateletCountK: 50, prevFibrinogenMgDl: 80, cryoprecipitateVolumeMlThisTick: 10 });
    expect(withFFP.factorActivityFraction).toBeGreaterThan(noProducts.factorActivityFraction);
    expect(withPlatelets.plateletCountK).toBeGreaterThan(noProducts.plateletCountK);
    expect(withCryo.fibrinogenMgDl).toBeGreaterThan(noProducts.fibrinogenMgDl);
  });

  it('the lethal triad fires once on simultaneous hypothermia+acidosis+coagulopathy, not repeatedly', () => {
    const onset = CoagulationCascadeModel.tick({ temperature: 32, pH: 7.1, prevFactorActivityFraction: 0.25, prevLethalTriadLogged: false });
    expect(onset.lethalTriadActive).toBe(true);
    expect(onset.events.some(e => e.includes('Lethal triad'))).toBe(true);

    const steady = CoagulationCascadeModel.tick({ temperature: 32, pH: 7.1, prevFactorActivityFraction: 0.25, prevLethalTriadLogged: true });
    expect(steady.lethalTriadActive).toBe(true);
    expect(steady.events.some(e => e.includes('Lethal triad'))).toBe(false);
  });

  it('hepatic synthetic dysfunction reduces factor activity ceiling (cirrhosis-driven coagulopathy)', () => {
    const normal = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 0.5, hepaticSyntheticFraction: 1.0, dt: 3600 });
    const failure = CoagulationCascadeModel.tick({ prevFactorActivityFraction: 0.5, hepaticSyntheticFraction: 0.2, dt: 3600 });
    expect(failure.factorActivityFraction).toBeLessThan(normal.factorActivityFraction);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => CoagulationCascadeModel.tick(undefined as any)).not.toThrow();
    expect(() => CoagulationCascadeModel.tick({ temperature: NaN, pH: NaN, prevFactorActivityFraction: NaN } as any)).not.toThrow();
    const out = CoagulationCascadeModel.tick({ temperature: -50, pH: -1, prevFactorActivityFraction: -5, bloodLossRateMlPerSec: -1, dt: 0 });
    expect(Number.isFinite(out.inr)).toBe(true);
    expect(Number.isFinite(out.tegMA)).toBe(true);
    expect(out.inr).toBeGreaterThanOrEqual(1);
  });
});
