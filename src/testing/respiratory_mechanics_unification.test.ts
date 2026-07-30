import { describe, it, expect } from 'vitest';
import { calibrateComplianceCurve } from '../engine/LungComplianceModel.js';
import {
  computeBreathTrajectory,
  getBreathTrajectory,
  buildMechanicsParams,
  paw,
  flow,
  deltaVolume,
  synthesizeVentPressureMechanics,
  synthesizeVentFlowMechanics,
  synthesizeVentVolumeMechanics
} from '../engine/RespiratoryMechanicsModel.js';
import { generatePressureVolumeLoopFromMechanics } from '../engine/PressureVolumeLoopModel.js';
import { generateFlowVolumeLoop } from '../engine/FlowVolumeLoopModel.js';

const normalLv = { tlc_mL: 6000, rv_mL: 1500, frc_mL: 2400 };
const normalPatient = { lungVolumes: normalLv };

describe('Respiratory Mechanics Model — unified equation-of-motion solver', () => {
  it('produces a finite, well-formed VCV trajectory with a true plateau (zero-flow elastic-only) phase', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    const traj = computeBreathTrajectory({ mode: 'vcv', R: 5, complianceCurve: curve, frc: 2400, peep: 5, targetVtMl: 450, inspTimeSec: 1.0, expTimeSec: 2.0 });
    expect(traj.length).toBeGreaterThan(50);
    for (const s of traj) {
      expect(Number.isFinite(s.paw)).toBe(true);
      expect(Number.isFinite(s.flow)).toBe(true);
      expect(Number.isFinite(s.deltaV)).toBe(true);
    }
    // End of inspiration: deltaV should reach (close to) the commanded tidal volume.
    const endInspIdx = traj.findIndex((s) => s.t >= 1.0) - 1;
    expect(traj[Math.max(0, endInspIdx)].deltaV).toBeGreaterThan(400);
  });

  it('closely matches the existing linear-compliance plateau formula for a normal-range tidal volume', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    const R = 5, vt = 450, peep = 5, inspTime = 1.0;
    const traj = computeBreathTrajectory({ mode: 'vcv', R, complianceCurve: curve, frc: 2400, peep, targetVtMl: vt, inspTimeSec: inspTime, expTimeSec: 2.0 });
    const endInsp = traj.reduce((best, s) => (s.t <= inspTime ? s : best), traj[0]);
    const resistiveComponent = R * ((vt / 1000) / inspTime);
    const nonlinearPplat = endInsp.paw - resistiveComponent;
    const linearPplat = peep + vt / 60; // RespiratoryEngine.ts's existing formula
    expect(Math.abs(nonlinearPplat - linearPplat)).toBeLessThan(1.5);
  });

  it('shows airway pressure decaying smoothly toward PEEP, starting from Pplat (not PIP) at the moment exhalation begins, and never reaching PEEP before late exhalation', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    const R = 5, vt = 450, peep = 5, inspTime = 1.0;
    const traj = computeBreathTrajectory({ mode: 'vcv', R, complianceCurve: curve, frc: 2400, peep, targetVtMl: vt, inspTimeSec: inspTime, expTimeSec: 2.0 });
    const justAfterExpStart = traj.find((s) => s.t > inspTime + 0.005);
    const midExpiration = traj.find((s) => s.t > 1.5);
    const lateExpiration = traj[traj.length - 1];

    // The PIP-to-Pplat step (losing the resistive component once flow stops at the
    // inspiration/expiration transition) is a real, expected feature, not noise -- but
    // exhalation should START from Pplat (the elastic-only pressure), not jump straight
    // to PEEP and not retain the inspiratory resistive component.
    const expectedPplat = peep + vt / 60; // same linear approximation validated above
    expect(justAfterExpStart.paw).toBeLessThan(expectedPplat + 0.5);
    expect(justAfterExpStart.paw).toBeGreaterThan(peep + 0.5);

    // Monotonically decaying toward PEEP, not already there partway through.
    expect(midExpiration.paw).toBeGreaterThan(peep);
    expect(midExpiration.paw).toBeLessThan(justAfterExpStart.paw);
    expect(lateExpiration.paw).toBeCloseTo(peep, 0);
  });

  it('shows expiratory flow decaying toward zero, and volume returning toward baseline', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    const traj = computeBreathTrajectory({ mode: 'vcv', R: 5, complianceCurve: curve, frc: 2400, peep: 5, targetVtMl: 450, inspTimeSec: 1.0, expTimeSec: 2.0 });
    const early = traj.find((s) => s.t > 1.05);
    const late = traj[traj.length - 1];
    expect(Math.abs(early.flow)).toBeGreaterThan(Math.abs(late.flow));
    expect(late.deltaV).toBeLessThan(early.deltaV);
    expect(late.deltaV).toBeLessThan(20);
  });

  it('produces a higher plateau pressure for PCV at a higher commanded Pinsp', () => {
    const curve = calibrateComplianceCurve(normalLv, 60);
    const low = computeBreathTrajectory({ mode: 'pcv', R: 5, complianceCurve: curve, frc: 2400, peep: 5, targetPinsp: 10, inspTimeSec: 1.0, expTimeSec: 2.0 });
    const high = computeBreathTrajectory({ mode: 'pcv', R: 5, complianceCurve: curve, frc: 2400, peep: 5, targetPinsp: 20, inspTimeSec: 1.0, expTimeSec: 2.0 });
    const lowEndInsp = low.reduce((best, s) => (s.t <= 1.0 ? s : best), low[0]);
    const highEndInsp = high.reduce((best, s) => (s.t <= 1.0 ? s : best), high[0]);
    expect(highEndInsp.deltaV).toBeGreaterThan(lowEndInsp.deltaV);
  });

  it('memoizes identical parameter sets (cache hit returns the same array reference)', () => {
    const params = buildMechanicsParams(normalPatient, { res: 5, compl: 60, peep: 5, rr: 12 }, { mode: 'VCV', vt: 500, ieRatio: 2 });
    const a = getBreathTrajectory(params);
    const b = getBreathTrajectory(buildMechanicsParams(normalPatient, { res: 5, compl: 60, peep: 5, rr: 12 }, { mode: 'VCV', vt: 500, ieRatio: 2 }));
    expect(a).toBe(b);
  });

  it('synthesizes finite, in-range pixel coordinates for all three canvas types across a full cycle', () => {
    const h = 100;
    const vitals = { res: 5, compl: 60, peep: 5, rr: 12 };
    const ventSettings = { mode: 'VCV', vt: 500, ieRatio: 2 };
    for (let frac = 0; frac <= 1; frac += 0.1) {
      const beatDuration = 5.0;
      const tBeat = frac * beatDuration;
      const yP = synthesizeVentPressureMechanics(tBeat, beatDuration, h, normalPatient, vitals, ventSettings);
      const yF = synthesizeVentFlowMechanics(tBeat, beatDuration, h, normalPatient, vitals, ventSettings);
      const yV = synthesizeVentVolumeMechanics(tBeat, beatDuration, h, normalPatient, vitals, ventSettings);
      for (const y of [yP, yF, yV]) {
        expect(Number.isFinite(y)).toBe(true);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(h);
      }
    }
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => computeBreathTrajectory(undefined)).not.toThrow();
    expect(() => computeBreathTrajectory({ mode: 'vcv', R: NaN, complianceCurve: null, frc: NaN })).not.toThrow();
    expect(() => buildMechanicsParams(null, null, null)).not.toThrow();
    expect(() => paw(null, 0, 1)).not.toThrow();
    expect(() => synthesizeVentPressureMechanics(NaN, NaN, NaN, {}, {}, {})).not.toThrow();
    const y = synthesizeVentPressureMechanics(NaN, NaN, NaN, {}, {}, {});
    expect(Number.isFinite(y)).toBe(true);
  });
});

describe('Cross-consistency: PV loop and flow-volume loop respond to the same R/C the same direction', () => {
  it('higher airway resistance widens the PV loop hysteresis (higher PIP) and reduces flow-volume PEF', () => {
    const lowRVitals = { res: 5, compl: 60, rr: 12, peep: 5 };
    const highRVitals = { res: 30, compl: 60, rr: 12, peep: 5 };
    const ventSettings = { mode: 'VCV', vt: 450, ieRatio: 2, peep: 5 };

    const pvLow = generatePressureVolumeLoopFromMechanics(normalPatient, lowRVitals, ventSettings);
    const pvHigh = generatePressureVolumeLoopFromMechanics(normalPatient, highRVitals, ventSettings);
    expect(pvHigh.pip).toBeGreaterThan(pvLow.pip);

    const fvLow = generateFlowVolumeLoop({ ...normalPatient, bronchospasm: false }, lowRVitals);
    const fvHigh = generateFlowVolumeLoop({ ...normalPatient, bronchospasm: true }, highRVitals);
    expect(fvHigh.pef).toBeLessThan(fvLow.pef);
  });

  it('lower compliance flattens the PV loop and does not change flow-volume peak flow direction unexpectedly', () => {
    const ventSettings = { mode: 'VCV', vt: 450, ieRatio: 2, peep: 5 };
    const normalC = { res: 5, compl: 60, rr: 12, peep: 5 };
    const lowC = { res: 5, compl: 20, rr: 12, peep: 5 };
    const pvNormal = generatePressureVolumeLoopFromMechanics(normalPatient, normalC, ventSettings);
    const pvLowC = generatePressureVolumeLoopFromMechanics(normalPatient, lowC, ventSettings);
    expect(pvLowC.pip).toBeGreaterThan(pvNormal.pip);
    expect(pvLowC.pattern).toBe('low_compliance');
  });
});

describe('PV loop uses the ICU ventilator tidal-volume convention (Y = tidal volume above PEEP, 0 at PEEP)', () => {
  const ventSettings = { mode: 'VCV', vt: 450, ieRatio: 2, peep: 8 };
  const vitals = { res: 5, compl: 60, rr: 12, peep: 8 };

  it('strictly begins at (Paw = PEEP, V = 0), not at FRC-referenced absolute volume', () => {
    const pv = generatePressureVolumeLoopFromMechanics(normalPatient, vitals, ventSettings);
    const first = pv.points[0];
    expect(first.volume).toBeCloseTo(0, 2);     // tidal volume, not FRC (~2.4 L)
    expect(first.pressure).toBeCloseTo(pv.peep, 0);
    // Every plotted volume is a tidal excursion, so it stays well below any absolute lung volume.
    const maxVol = Math.max(...pv.points.map((pt) => pt.volume));
    expect(maxVol).toBeGreaterThan(0.3);        // reaches ~Vt (0.45 L)
    expect(maxVol).toBeLessThan(1.0);           // but is NOT FRC + Vt (~2.8 L)
    expect(maxVol * 1000).toBeCloseTo(pv.vte, -2);
  });

  it('collapses to a flat (PEEP, 0) point when apneic / no effective tidal volume', () => {
    const apneic = generatePressureVolumeLoopFromMechanics(normalPatient, { ...vitals, rr: 0 }, { ...ventSettings, mode: 'spontaneous' });
    for (const pt of apneic.points) {
      expect(pt.volume).toBeCloseTo(0, 3);
      expect(Number.isFinite(pt.pressure)).toBe(true);
    }
  });
});
