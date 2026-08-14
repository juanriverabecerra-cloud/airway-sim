import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE, makeFuzzHandlers } from './harness/headlessSim';
import { giveMed, intubateMechanical, getVital } from './harness/metamorphic';

/**
 * Layer 2 — procedures/mechanisms: intubation (tracheal vs esophageal), defibrillation, volatile gas
 * wash-in, and CPR. Full audit passed; these guard the safety-critical directions.
 */
const evOf = (s: any) => (s.events || []).map((e: any) => (typeof e === 'string' ? e : e?.message || '')).join(' | ');

describe('Layer 2 — procedures / mechanisms', () => {
  it('esophageal intubation desaturates (airway not secured, ventilation failed)', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    giveMed(s, 'rocuronium', 100, { unit: 'mg' });
    // Mirrors App.jsx's real esophageal-placement flags.
    s.state.patient.tubePosition = 'esophagus';
    s.state.patient.ventilationStatus = 'failed';
    s.state.patient.airwaySecured = false;
    stepN(s, 140); // past the transient gastric-CO2 washout the CapnographyModel emits early
    expect(getVital(s, 'spo2')!, 'esophageal intubation must cause hypoxia').toBeLessThan(60);
    expect(getVital(s, 'etco2')!, 'no sustained EtCO2 through the esophagus (gastric CO2 washes out)').toBeLessThan(10);
  });

  it('correct tracheal mechanical ventilation oxygenates and controls PaCO2', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    giveMed(s, 'rocuronium', 100, { unit: 'mg' });
    intubateMechanical(s, 12);
    stepN(s, 150);
    expect(getVital(s, 'spo2')!).toBeGreaterThan(94);
    expect(getVital(s, 'paco2')!).toBeGreaterThan(30);
    expect(getVital(s, 'paco2')!).toBeLessThan(50);
  });

  it('defibrillation: shock fires on a shockable rhythm, warns on a non-shockable one', () => {
    const vf = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    vf.state.patient.isArrest = true; vf.state.patient.cardiacRhythm = 'vfib';
    makeFuzzHandlers(vf).handleDeliverShock(200, false);
    expect(/shock|convert|rosc|rhythm/i.test(evOf(vf))).toBe(true);

    const asys = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    asys.state.patient.isArrest = true; asys.state.patient.cardiacRhythm = 'asystole';
    makeFuzzHandlers(asys).handleDeliverShock(200, false);
    expect(asys.state.patient.cardiacRhythm).toBe('asystole');
    expect(/non-shockable|no effect/i.test(evOf(asys))).toBe(true);
  });

  it('volatile gas wash-in: alveolar MAC rises monotonically toward the dial', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    giveMed(s, 'rocuronium', 50, { unit: 'mg' });
    intubateMechanical(s, 12);
    Object.assign(s.state.gasSettings, { agent: 'sevoflurane', dial: 2.5, o2Flow: 2.0 });
    const macs: number[] = [];
    for (let i = 0; i < 5; i++) { stepN(s, 60); macs.push(getVital(s, 'mac') ?? 0); }
    for (let i = 1; i < macs.length; i++) expect(macs[i], `MAC should rise: ${macs.join(',')}`).toBeGreaterThan(macs[i - 1]);
    expect(macs[macs.length - 1]).toBeGreaterThan(0.5);
  });

  it('CPR generates forward perfusion during arrest', () => {
    const noCpr = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    noCpr.state.patient.isArrest = true; noCpr.state.patient.cardiacRhythm = 'asystole';
    stepN(noCpr, 20);
    const cpr = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    cpr.state.patient.isArrest = true; cpr.state.patient.cardiacRhythm = 'asystole'; cpr.state.patient.cprActive = true;
    stepN(cpr, 20);
    expect(getVital(cpr, 'map')!, 'CPR should generate a perfusing pressure').toBeGreaterThan(getVital(noCpr, 'map')! + 15);
  });
});
