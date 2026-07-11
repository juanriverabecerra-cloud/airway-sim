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

    // alpha5/alpha4 GABA-A occupancy fields removed (not shown in UI, not clinically actionable)
    // Core clinical output remains: LTP inhibition under isoflurane
    expect(outputA.ltpInductionInhibited).toBe(true);
    expect(outputBRes.ltpInductionInhibited).toBe(false);
  });

  // Tests for amygdaloHippocampal, NBM, slowOscillationPower, soPhaseCouplingDecay,
  // hippocampalRecollection, perirhinalFamiliarity, caudateProcedural removed —
  // these research neuroscience constructs are no longer exported by ConsciousnessEngine
  // (they were never displayed in the UI or used for any clinical decision in the simulator).
});

