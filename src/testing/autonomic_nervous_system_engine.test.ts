import { describe, it, expect } from 'vitest';
import { AutonomicNervousSystemEngine } from '../engine/AutonomicNervousSystemEngine';

describe('AutonomicNervousSystemEngine — continuous parasympathetic (vagal) tone + sympathetic tone aggregation', () => {
  it('baseline (no anesthesia, no stimulus) gives the resting 0.5 vagal tone with zero net HR effect', () => {
    const out = AutonomicNervousSystemEngine.tick({}, {});
    expect(out.vagalTone).toBeCloseTo(0.5, 5);
    expect(out.vagalHrEffect).toBeCloseTo(0, 5);
    expect(out.sympatheticToneIndex).toBe(0);
  });

  it('deeper anesthesia raises vagal tone and produces a bradycardic (negative) HR contribution', () => {
    const light = AutonomicNervousSystemEngine.tick({}, { currentMac: 0.3 });
    const deep = AutonomicNervousSystemEngine.tick({}, { currentMac: 1.8 });
    expect(deep.vagalTone).toBeGreaterThan(light.vagalTone);
    expect(deep.vagalHrEffect).toBeLessThan(light.vagalHrEffect);
    expect(deep.vagalHrEffect).toBeLessThan(0);
  });

  it('acute vagal stimulation triggers (oculocardiac, laryngospasm) raise vagal tone', () => {
    const baseline = AutonomicNervousSystemEngine.tick({}, {});
    const oculocardiac = AutonomicNervousSystemEngine.tick({ oculocardiacTriggered: true }, {});
    const laryngospasm = AutonomicNervousSystemEngine.tick({ laryngospasm: true }, {});
    expect(oculocardiac.vagalTone).toBeGreaterThan(baseline.vagalTone);
    expect(laryngospasm.vagalTone).toBeGreaterThan(baseline.vagalTone);
  });

  it('sympathetic activation (catecholamine pool) reciprocally suppresses vagal tone', () => {
    const baseline = AutonomicNervousSystemEngine.tick({}, { C_cat: 0 });
    const stressed = AutonomicNervousSystemEngine.tick({}, { C_cat: 100 });
    expect(stressed.vagalTone).toBeLessThan(baseline.vagalTone);
    expect(stressed.vagalHrEffect).toBeGreaterThan(baseline.vagalHrEffect);
  });

  it('anticholinergics (atropine/glycopyrrolate) suppress vagal tone, producing a tachycardic-permissive contribution', () => {
    const baseline = AutonomicNervousSystemEngine.tick({}, {});
    const atropine = AutonomicNervousSystemEngine.tick({}, { anticholinergicCe: 0.8 });
    expect(atropine.vagalTone).toBeLessThan(baseline.vagalTone);
    expect(atropine.vagalHrEffect).toBeGreaterThan(0);
  });

  it('vagal tone stays within [0.05, 1.0] across combined extreme inputs', () => {
    const extremeHigh = AutonomicNervousSystemEngine.tick({ oculocardiacTriggered: true, laryngospasm: true }, { currentMac: 3 });
    const extremeLow = AutonomicNervousSystemEngine.tick({}, { C_cat: 150, anticholinergicCe: 5 });
    expect(extremeHigh.vagalTone).toBeLessThanOrEqual(1.0);
    expect(extremeLow.vagalTone).toBeGreaterThanOrEqual(0.05);
  });

  it('sympatheticToneIndex aggregates and rises with each contributing signal independently', () => {
    const baseline = AutonomicNervousSystemEngine.tick({}, {});
    const withCcat = AutonomicNervousSystemEngine.tick({}, { C_cat: 60 });
    const withStimulus = AutonomicNervousSystemEngine.tick({}, { nonNociceptiveSympatheticStimulus: 50 });
    const withCortisol = AutonomicNervousSystemEngine.tick({}, { cortisolLevel: 0.6 });
    const withBaroreflex = AutonomicNervousSystemEngine.tick({}, { baroreflexErrorMagnitude: 30 });
    expect(withCcat.sympatheticToneIndex).toBeGreaterThan(baseline.sympatheticToneIndex);
    expect(withStimulus.sympatheticToneIndex).toBeGreaterThan(baseline.sympatheticToneIndex);
    expect(withCortisol.sympatheticToneIndex).toBeGreaterThan(baseline.sympatheticToneIndex);
    expect(withBaroreflex.sympatheticToneIndex).toBeGreaterThan(baseline.sympatheticToneIndex);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => AutonomicNervousSystemEngine.tick(undefined as any, undefined as any)).not.toThrow();
    expect(() => AutonomicNervousSystemEngine.tick({}, { currentMac: NaN, C_cat: -50, anticholinergicCe: NaN })).not.toThrow();
    const out = AutonomicNervousSystemEngine.tick({}, { currentMac: NaN, C_cat: NaN });
    expect(Number.isFinite(out.vagalTone)).toBe(true);
    expect(Number.isFinite(out.vagalHrEffect)).toBe(true);
    expect(Number.isFinite(out.sympatheticToneIndex)).toBe(true);
  });
});
