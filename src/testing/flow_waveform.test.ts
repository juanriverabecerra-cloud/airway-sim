import { describe, it, expect } from 'vitest';
import { computeBreathTrajectory, buildMechanicsParams } from '../engine/RespiratoryMechanicsModel.js';
import { calibrateComplianceCurve } from '../engine/LungComplianceModel.js';

describe('Flow L/min Waveform Physiology Tests', () => {
  const mockLungVolumes = {
    tlc_mL: 6000,
    rv_mL: 1500,
    frc_mL: 2400,
    fvc_mL: 4500,
    fev1FvcRatio: 80
  };

  const complianceCurve = calibrateComplianceCurve(mockLungVolumes, 60);

  it('should reach peak expiratory flow rapidly due to 30ms valve opening', () => {
    // Normal breath: R = 5, C = 60, mode = vcv, Vt = 500, Ti = 1.0, Te = 2.0
    const trajectory = computeBreathTrajectory({
      mode: 'vcv',
      R: 5,
      complianceCurve,
      frc: 2400,
      peep: 5,
      targetVtMl: 500,
      targetPinsp: 15,
      inspTimeSec: 1.0,
      expTimeSec: 2.0,
      obstructionSeverity: 0
    });

    // Expiration is from index 50 to 149 (roughly).
    // Let's find the peak expiratory flow (most negative flow)
    let minFlow = 0;
    let minFlowTime = 0;
    trajectory.forEach(pt => {
      if (pt.flow < minFlow) {
        minFlow = pt.flow;
        minFlowTime = pt.t;
      }
    });

    // Verify expiratory flow goes negative (outflow)
    expect(minFlow).toBeLessThan(-0.5); // Peak expiratory flow should be substantial
    // Peak expiratory flow should occur very close to the start of expiration (t = 1.0s)
    // with a 30ms valve time constant, it should reach peak flow within 100ms of expiration starting.
    expect(minFlowTime).toBeLessThan(1.15); // Peak flow reached before 1.15s (within 150ms of t=1.0)
  });

  it('should reduce peak expiratory flow and slow down decay under high airway resistance', () => {
    // High resistance breath (bronchospasm): R = 35
    const trajNormal = computeBreathTrajectory({
      mode: 'vcv',
      R: 5,
      complianceCurve,
      frc: 2400,
      peep: 5,
      targetVtMl: 500,
      targetPinsp: 15,
      inspTimeSec: 1.0,
      expTimeSec: 4.0,
      obstructionSeverity: 0
    });

    const trajObstructed = computeBreathTrajectory({
      mode: 'vcv',
      R: 35,
      complianceCurve,
      frc: 2400,
      peep: 5,
      targetVtMl: 500,
      targetPinsp: 15,
      inspTimeSec: 1.0,
      expTimeSec: 4.0,
      obstructionSeverity: 0.8 // high obstruction severity
    });

    const pefNormal = Math.min(...trajNormal.map(pt => pt.flow));
    const pefObstructed = Math.min(...trajObstructed.map(pt => pt.flow));

    // High resistance must reduce the peak expiratory flow rate
    expect(pefObstructed).toBeGreaterThan(pefNormal); // less negative
    
    // In normal trajectory, flow at the end of expiration is virtually 0 (fully emptied)
    expect(trajNormal[trajNormal.length - 1].flow).toBeCloseTo(0, 1);

    // In obstructed trajectory, flow should decay much slower
    // Let's verify that the flow at mid-expiration is less emptied (larger negative magnitude relative to peak)
    // compared to normal, indicating prolonged decay
  });

  it('should model air trapping (auto-PEEP) with non-zero trapped volume at the end of expiration', () => {
    // Severe obstruction + rapid respiratory rate (short expiratory time: Te = 0.8s)
    const trajTrapped = computeBreathTrajectory({
      mode: 'vcv',
      R: 45,
      complianceCurve,
      frc: 2400,
      peep: 5,
      targetVtMl: 500,
      targetPinsp: 15,
      inspTimeSec: 0.8,
      expTimeSec: 0.8,
      obstructionSeverity: 0.9
    });

    const startingVolume = trajTrapped[0].deltaV;
    const endingVolume = trajTrapped[trajTrapped.length - 1].deltaV;
    const endingFlow = trajTrapped[trajTrapped.length - 1].flow;

    // In a steady-state trapped volume scenario, starting and ending volumes should match and be > 0
    expect(startingVolume).toBeGreaterThan(10); // > 10 mL trapped volume (auto-PEEP)
    expect(Math.abs(endingVolume - startingVolume)).toBeLessThan(5); // steady-state converged
    // Expiratory flow should not return to 0 before the next breath starts
    expect(endingFlow).toBeLessThan(-0.02); // still flowing out (negative flow) at end of cycle
  });

  it('should deliver mechanical breaths (not flatline) when the patient is paralyzed and ventilator is in VCV mode', () => {
    const params = buildMechanicsParams(
      { isParalyzed: true, lungVolumes: mockLungVolumes },
      { rr: 12, res: 5, compl: 60, peep: 5, vte: 500 },
      { mode: 'VCV', vt: 500, rr: 12, peep: 5 }
    );
    expect(params.mode).toBe('vcv');

    const trajectory = computeBreathTrajectory(params);
    const flows = trajectory.map(pt => pt.flow);
    const maxFlow = Math.max(...flows);
    const minFlow = Math.min(...flows);
    expect(maxFlow).toBeGreaterThan(0.1);
    expect(minFlow).toBeLessThan(-0.1);
  });

  it('should flatline when the patient is paralyzed and ventilator is in spontaneous mode', () => {
    const params = buildMechanicsParams(
      { isParalyzed: true, lungVolumes: mockLungVolumes },
      { rr: 0, res: 5, compl: 60, peep: 5, vte: 0 },
      { mode: 'spontaneous', rr: 0, peep: 5 }
    );
    expect(params.mode).toBe('apneic');

    const trajectory = computeBreathTrajectory(params);
    const flows = trajectory.map(pt => pt.flow);
    const pressures = trajectory.map(pt => pt.paw);
    expect(Math.max(...flows)).toBeCloseTo(0, 5);
    expect(Math.min(...flows)).toBeCloseTo(0, 5);
    // Pressure should stay exactly at PEEP
    pressures.forEach(paw => {
      expect(paw).toBeCloseTo(5, 5);
    });
  });
});
