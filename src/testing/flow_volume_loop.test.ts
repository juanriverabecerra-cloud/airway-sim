import { describe, it, expect } from 'vitest';
import {
  generateFlowVolumeLoop,
  expiratoryFlowFraction,
  inspiratoryFlowFraction,
} from '../engine/FlowVolumeLoopModel.js';

const normalPatient = { lungVolumes: { tlc_mL: 6000, rv_mL: 1500, fvc_mL: 4500, fev1FvcRatio: 82 } };
const normalVitals = { res: 5, compl: 60, rr: 12 };

describe('Canonical MEFV limb shape (the core "normal is linear, obstruction is scooped" contrast)', () => {
  it('normal expiratory descent is near-linear (NOT scooped)', () => {
    // Sample the descent from PEF (~12% exhaled) to RV. For a straight line, the flow at
    // the midpoint of the descent should be close to the midpoint flow value (~0.5).
    const atQuarter = expiratoryFlowFraction(0.12 + 0.25 * 0.88, { obstruction: 0 });
    const atMid = expiratoryFlowFraction(0.12 + 0.5 * 0.88, { obstruction: 0 });
    const atThreeQ = expiratoryFlowFraction(0.12 + 0.75 * 0.88, { obstruction: 0 });
    // Near-linear: quarter ≈ 0.75, mid ≈ 0.5, three-quarter ≈ 0.25 (each within 0.1).
    expect(Math.abs(atQuarter - 0.75)).toBeLessThan(0.1);
    expect(Math.abs(atMid - 0.5)).toBeLessThan(0.1);
    expect(Math.abs(atThreeQ - 0.25)).toBeLessThan(0.1);
  });

  it('obstruction makes the descent concave/scooped — flow sits well below the normal line', () => {
    const normalMid = expiratoryFlowFraction(0.12 + 0.5 * 0.88, { obstruction: 0 });
    const obstructedMid = expiratoryFlowFraction(0.12 + 0.5 * 0.88, { obstruction: 0.7 });
    // The scoop pulls mid-descent flow substantially below the normal (near-linear) value.
    expect(obstructedMid).toBeLessThan(normalMid - 0.2);
  });

  it('peak expiratory flow is reached early (near TLC) and both limbs return to zero at the ends', () => {
    expect(expiratoryFlowFraction(0, { obstruction: 0 })).toBeCloseTo(0, 5); // zero flow at TLC
    expect(expiratoryFlowFraction(0.12, { obstruction: 0 })).toBeCloseTo(1, 2); // PEF at ~12% exhaled
    expect(expiratoryFlowFraction(1, { obstruction: 0 })).toBeCloseTo(0, 5); // zero flow at RV
    expect(inspiratoryFlowFraction(0)).toBeCloseTo(0, 5); // zero at RV
    expect(inspiratoryFlowFraction(1)).toBeCloseTo(0, 5); // zero at TLC
    expect(inspiratoryFlowFraction(0.5)).toBeCloseTo(1, 5); // peak mid-VC (symmetric semicircle)
  });

  it('a plateau caps the limb flat (upper-airway obstruction morphology)', () => {
    // Expiratory plateau (fixed / variable-intrathoracic): peak clipped to the ceiling.
    expect(expiratoryFlowFraction(0.12, { obstruction: 0, plateau: 0.4 })).toBeCloseTo(0.4, 5);
    // Inspiratory plateau (fixed / variable-extrathoracic): mid-VC clipped to the ceiling.
    expect(inspiratoryFlowFraction(0.5, { plateau: 0.3 })).toBeCloseTo(0.3, 5);
  });
});

describe('Flow-Volume Loop Model', () => {
  it('produces a closed loop with no NaN/non-finite points for a normal patient', () => {
    const loop = generateFlowVolumeLoop(normalPatient, normalVitals);
    expect(loop.points.length).toBeGreaterThan(50);
    for (const p of loop.points) {
      expect(Number.isFinite(p.volume)).toBe(true);
      expect(Number.isFinite(p.flow)).toBe(true);
    }
    // First point (start of expiration, at TLC) and last point (end of inspiration, at TLC) should coincide.
    const first = loop.points[0];
    const last = loop.points[loop.points.length - 1];
    expect(first.volume).toBeCloseTo(last.volume, 1);
    expect(first.flow).toBeCloseTo(0, 1);
    expect(last.flow).toBeCloseTo(0, 1);
    expect(loop.pattern).toBe('normal');
  });

  it('reduces peak flow and applies expiratory scooping for an obstructive (COPD) patient', () => {
    const normal = generateFlowVolumeLoop(normalPatient, normalVitals);
    const copd = generateFlowVolumeLoop(
      { copd: true, lungVolumes: { tlc_mL: 6300, rv_mL: 2100, fvc_mL: 4200, fev1FvcRatio: 55 } },
      { res: 23, compl: 75, rr: 14 }
    );
    expect(copd.pef).toBeLessThan(normal.pef);
    expect(['obstructive', 'mild_obstructive']).toContain(copd.pattern);

    // Scooping check: at the same fractional point along expiration, the obstructive
    // curve's flow should sit below the normal curve's flow once normalized by PEF
    // (concave/coved descent vs. the normal near-linear one).
    const midIdxNormal = Math.floor(normal.points.length * 0.25);
    const midIdxCopd = Math.floor(copd.points.length * 0.25);
    const normalizedNormal = Math.abs(normal.points[midIdxNormal].flow) / normal.pef;
    const normalizedCopd = Math.abs(copd.points[midIdxCopd].flow) / copd.pef;
    expect(normalizedCopd).toBeLessThan(normalizedNormal);
  });

  it('narrows the volume span while keeping a proportionally normal shape for a restrictive patient', () => {
    const normal = generateFlowVolumeLoop(normalPatient, normalVitals);
    const restrictive = generateFlowVolumeLoop(
      { restrictive: true, lungVolumes: { tlc_mL: 3120, rv_mL: 780, fvc_mL: 2340, fev1FvcRatio: 83 } },
      { res: 5, compl: 30, rr: 18 }
    );
    expect(restrictive.tlc).toBeLessThan(normal.tlc);
    expect(restrictive.fvc).toBeLessThan(normal.fvc);
    expect(restrictive.pattern).toBe('restrictive');
  });

  it('flattens the inspiratory limb only for variable extrathoracic obstruction', () => {
    const extrathoracic = generateFlowVolumeLoop(
      { dilatorMuscleTone: 0.25, pcrit: 2.0, ...normalPatient },
      normalVitals
    );
    expect(extrathoracic.pattern).toBe('variable_extrathoracic');

    const inspFlows = extrathoracic.points.filter((p) => p.flow < 0).map((p) => p.flow);
    const expFlows = extrathoracic.points.filter((p) => p.flow > 0).map((p) => p.flow);
    const inspMin = Math.min(...inspFlows);
    const expMax = Math.max(...expFlows);

    // Inspiratory peak should be suppressed well below the theoretical PIF...
    expect(Math.abs(inspMin)).toBeLessThan(extrathoracic.pif * 0.5);
    // ...while the expiratory limb stays close to the full PEF (selectively spared).
    expect(expMax).toBeGreaterThan(extrathoracic.pef * 0.9);
  });

  it('treats laryngospasm as at least as severe as a collapsible upper airway', () => {
    const laryngospasm = generateFlowVolumeLoop({ laryngospasm: true, ...normalPatient }, normalVitals);
    expect(laryngospasm.pattern).toBe('variable_extrathoracic');
  });

  it('collapses to a single zero-flow point on apnea (rr = 0)', () => {
    const apneic = generateFlowVolumeLoop(normalPatient, { ...normalVitals, rr: 0 });
    expect(apneic.pattern).toBe('apneic');
    for (const p of apneic.points) {
      expect(p.flow).toBe(0);
      expect(Number.isFinite(p.volume)).toBe(true);
    }
  });

  it('falls back to sane defaults and never throws or produces NaN on malformed/missing input', () => {
    expect(() => generateFlowVolumeLoop(undefined, undefined)).not.toThrow();
    expect(() => generateFlowVolumeLoop(null, null)).not.toThrow();
    expect(() => generateFlowVolumeLoop({}, {})).not.toThrow();
    expect(() => generateFlowVolumeLoop({ lungVolumes: { tlc_mL: NaN, rv_mL: 'x' } }, { res: -5, compl: 0, rr: NaN })).not.toThrow();

    const loop = generateFlowVolumeLoop({ lungVolumes: { tlc_mL: NaN } }, { res: NaN, compl: NaN, rr: NaN });
    for (const p of loop.points) {
      expect(Number.isFinite(p.volume)).toBe(true);
      expect(Number.isFinite(p.flow)).toBe(true);
    }
    expect(loop.tlc).toBeGreaterThan(loop.rv);
  });
});
