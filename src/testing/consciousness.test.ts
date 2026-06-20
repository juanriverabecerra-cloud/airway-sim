import { describe, it, expect } from 'vitest';
import { ConsciousnessEngine, ConsciousnessInputs } from '../engine/ConsciousnessEngine';

describe('Chapter 9 Consciousness, Connectivities, and Memory Systems Unit Tests', () => {

  const createBaselinePatient = () => ({
    lcActivity: 1.0,
    tmnActivity: 1.0,
    vlpoActivity: 0.0,
    mnpoActivity: 0.0,
    ldtPptActivity: 1.0,
    prfActivity: 1.0,
    vtaActivity: 1.0,
    orexinLevel: 1.0,
    slowOscillationPower: 0.1,
    thalamocorticalConn: 1.0,
    frontoparietalFeedback: 1.0,
    corticocorticalConn: 1.0,
    basalGangliaConn: 1.0,
    alpha5GabaaOccupancy: 0.0,
    alpha4GabaaOccupancy: 0.0,
    explicitEncoding: 1.0,
    explicitConsolidation: 0.1,
    ltpInductionInhibited: false,
    p300Amplitude: 10.0,
    n2p3Amplitude: 12.0,
    p2Amplitude: 8.0,
    oldNewEffect: 3.0,
    mismatchNegativity: 3.5,
    p1Amplitude: 4.0,
    n2Latency: 200,
    hippocampalThetaFreq: 7.0,
    hippocampalThetaPower: 1.0,
    amygdaloHippocampalConn: 1.0,
    rightAmygdaloHippocampalConn: 1.0,
    leftAmygdaloHippocampalConn: 1.0,
    nbmHippocampalConn: 1.0,
    soPhaseCouplingDecay: 0.0,
    hippocampalRecollection: 1.0,
    perirhinalFamiliarity: 1.0,
    caudateProcedural: 1.0,
    neuralInertiaLag: 0.0,
    alpha5Knockout: false,
    alpha4Knockout: false,
    tmnPropofolResistant: false,
    narcolepsy: false,
    alpha2AKnockout: false
  });

  const createBaselineInputs = (): ConsciousnessInputs => ({
    propofolCe: 0.0,
    dexmedCe: 0.0,
    thiopentalCe: 0.0,
    midazolamCe: 0.0,
    ketamineCe: 0.0,
    etomidateCe: 0.0,
    atipamezoleCe: 0.0,
    methylphenidateCe: 0.0,
    scopolamineCe: 0.0,
    sevoMac: 0.0,
    isoMac: 0.0,
    haloMac: 0.0,
    n2oMac: 0.0,
    isSyncShock: false,
    time: 100
  });

  it('should verify Propofol induces consolidation failure (high psi) and blocks LTP', () => {
    const patient = createBaselinePatient();
    const inputs = createBaselineInputs();
    inputs.propofolCe = 2.0;

    const output = ConsciousnessEngine.tick(1, patient, {}, inputs);

    expect(output.explicitConsolidation).toBeGreaterThan(3.5);
    expect(output.ltpInductionInhibited).toBe(true);
  });

  it('should verify Dexmedetomidine induces encoding failure (low lambda)', () => {
    const patient = createBaselinePatient();
    const inputs = createBaselineInputs();
    inputs.dexmedCe = 1.2;

    const output = ConsciousnessEngine.tick(1, patient, {}, inputs);

    expect(output.explicitEncoding).toBeLessThan(0.2);
  });

  it('should verify Atipamezole competitive antagonism reverses Dexmedetomidine-induced LC suppression', () => {
    const patient = createBaselinePatient();
    
    const inputsA = createBaselineInputs();
    inputsA.dexmedCe = 1.0;
    const outputA = ConsciousnessEngine.tick(1, patient, {}, inputsA);

    const inputsB = createBaselineInputs();
    inputsB.dexmedCe = 1.0;
    inputsB.atipamezoleCe = 0.5;
    const outputB = ConsciousnessEngine.tick(1, patient, {}, inputsB);

    expect(outputB.lcActivity).toBeGreaterThan(outputA.lcActivity);
  });

  it('should verify Alpha-5 GABAA Knockout models are resistant to Isoflurane-induced LTP block / amnesia', () => {
    const patientA = createBaselinePatient();
    const inputsA = createBaselineInputs();
    inputsA.isoMac = 1.0;
    const outputA = ConsciousnessEngine.tick(1, patientA, {}, inputsA);

    const patientB = createBaselinePatient();
    patientB.alpha5Knockout = true;
    patientB.alpha4Knockout = true;
    const inputsB = createBaselineInputs();
    inputsB.isoMac = 1.0;
    const outputBRes = ConsciousnessEngine.tick(1, patientB, {}, inputsB);

    expect(outputA.alpha5GabaaOccupancy).toBeGreaterThan(0.5);
    expect(outputA.ltpInductionInhibited).toBe(true);

    expect(outputBRes.alpha5GabaaOccupancy).toBe(0.0);
    expect(outputBRes.ltpInductionInhibited).toBe(false);
  });

  it('should verify Sevoflurane 0.25% (0.125 MAC) removes right amygdala and NBM positive influence on hippocampus but spares left amygdala', () => {
    const patient = createBaselinePatient();
    const inputs = createBaselineInputs();
    inputs.sevoMac = 0.125; // 0.25% sevoflurane

    const output = ConsciousnessEngine.tick(1, patient, {}, inputs);

    expect(output.rightAmygdaloHippocampalConn).toBeCloseTo(0.0, 2);
    expect(output.nbmHippocampalConn).toBeCloseTo(0.0, 2);
    expect(output.leftAmygdaloHippocampalConn).toBeGreaterThan(0.4);
  });

  it('should verify Propofol induces slow oscillation phase coupling decay rapidly', () => {
    let patient = createBaselinePatient();
    const inputs = createBaselineInputs();
    inputs.propofolCe = 2.0;

    // Run for 10 seconds to allow slow oscillation power to build up
    for (let t = 0; t < 10; t++) {
      const output = ConsciousnessEngine.tick(1, patient, {}, inputs);
      Object.assign(patient, output);
    }

    expect(patient.slowOscillationPower).toBeGreaterThan(4.0);
    expect(patient.soPhaseCouplingDecay).toBeGreaterThan(0.7);
  });

  it('should verify recollection memory is highly sensitive to low-dose propofol while familiarity and procedural memory are spared', () => {
    const patient = createBaselinePatient();
    const inputs = createBaselineInputs();
    inputs.propofolCe = 0.35; // Light sedative dose

    const output = ConsciousnessEngine.tick(1, patient, {}, inputs);

    expect(output.hippocampalRecollection).toBeLessThan(0.3);
    expect(output.perirhinalFamiliarity).toBeGreaterThan(0.6);
    expect(output.caudateProcedural).toBeGreaterThan(0.8);
  });
});

