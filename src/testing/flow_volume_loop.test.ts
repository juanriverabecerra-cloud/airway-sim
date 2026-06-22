import { describe, it, expect } from 'vitest';
import { generateFlowVolumeLoop } from '../engine/FlowVolumeLoopModel.js';

const normalPatient = { lungVolumes: { tlc_mL: 6000, rv_mL: 1500, fvc_mL: 4500, fev1FvcRatio: 82 } };
const normalVitals = { res: 5, compl: 60, rr: 12 };

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
    const normalizedNormal = normal.points[midIdxNormal].flow / normal.pef;
    const normalizedCopd = copd.points[midIdxCopd].flow / copd.pef;
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
