import { describe, it, expect } from 'vitest';
import { runMetamorphic, giveMed, intubateMechanical, getVital, type SimHandle } from './harness/metamorphic';
import { createHeadlessSim, stepN, HEALTHY_CASE, makeFuzzHandlers } from './harness/headlessSim';

/**
 * Layer 2 — monitored-instrument ↔ physiology consistency. Capnography (EtCO2), the oxyhemoglobin
 * dissociation curve (SpO2↔PaO2), dynamic preload indices (SVV/PPV), and the apnea/RR display must all
 * track the underlying physiology. Includes F30: a flag-apneic (paralyzed) patient must read RR 0.
 */
const vent = (s: SimHandle) => { giveMed(s, 'rocuronium', 50, { unit: 'mg' }); intubateMechanical(s, 12); };

describe('Layer 2 — instrument/physiology consistency', () => {
  it('capnography: hypoventilation raises EtCO2, hyperventilation lowers it', () => {
    const up = runMetamorphic(HEALTHY_CASE, (s) => makeFuzzHandlers(s).handleSetVentSettings({ rr: 4 }), { key: 'etco2', direction: 'up', minDelta: 3, steps: 120, seed: 4, setup: vent });
    const dn = runMetamorphic(HEALTHY_CASE, (s) => makeFuzzHandlers(s).handleSetVentSettings({ rr: 22 }), { key: 'etco2', direction: 'down', minDelta: 2, steps: 120, seed: 4, setup: vent });
    expect(up.pass, `hypovent EtCO2 ${up.base}->${up.treat}`).toBe(true);
    expect(dn.pass, `hypervent EtCO2 ${dn.base}->${dn.treat}`).toBe(true);
  });

  it('oxygenation: a hypoxic fresh-gas mixture drives PaO2 down', () => {
    const r = runMetamorphic(HEALTHY_CASE, (s) => { Object.assign(s.state.gasSettings, { o2Flow: 0.3, airFlow: 0.0, n2oFlow: 4.0 }); },
      { key: 'pao2', direction: 'down', minDelta: 20, steps: 200, seed: 4, setup: vent });
    expect(r.pass, `hypoxic mix PaO2 ${r.base}->${r.treat}`).toBe(true);
  });

  it('dynamic preload: hypovolemia raises SVV and PPV under mechanical ventilation', () => {
    const svv = runMetamorphic(HEALTHY_CASE, (s) => { s.state.patient.ebl = 1800; }, { key: 'svv', direction: 'up', minDelta: 1, steps: 120, seed: 4, setup: vent });
    const ppv = runMetamorphic(HEALTHY_CASE, (s) => { s.state.patient.ebl = 1800; }, { key: 'ppv', direction: 'up', minDelta: 1, steps: 120, seed: 4, setup: vent });
    expect(svv.pass, `SVV ${svv.base}->${svv.treat}`).toBe(true);
    expect(ppv.pass, `PPV ${ppv.base}->${ppv.treat}`).toBe(true);
  });

  it('SpO2 tracks PaO2 down the dissociation curve during apnea', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    s.state.patient.ventilationStatus = 'spontaneous';
    s.state.patient.airwaySecured = false;
    giveMed(s, 'rocuronium', 100, { unit: 'mg' });
    stepN(s, 40); const early = { pao2: getVital(s, 'pao2')!, spo2: getVital(s, 'spo2')! };
    stepN(s, 60); const late = { pao2: getVital(s, 'pao2')!, spo2: getVital(s, 'spo2')! };
    // As PaO2 falls onto the steep part (<60), SpO2 must fall substantially too.
    expect(late.pao2, 'PaO2 should fall during apnea').toBeLessThan(early.pao2);
    expect(late.spo2, 'SpO2 should fall onto the steep part of the curve').toBeLessThan(85);
    expect(early.spo2, 'SpO2 should still be high while PaO2 is on the flat part').toBeGreaterThan(90);
  });

  it('F30: a fully paralyzed (apneic) patient reads RR 0 even while desaturating', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 4, withPIV: true });
    s.state.patient.ventilationStatus = 'spontaneous';
    s.state.patient.airwaySecured = false;
    giveMed(s, 'rocuronium', 100, { unit: 'mg' });
    stepN(s, 200); // deep into desaturation, where the hypoxic drive/pain offset is large
    expect(getVital(s, 'tofCount')).toBeLessThanOrEqual(1);
    expect(getVital(s, 'spo2')!, 'should be desaturated').toBeLessThan(80);
    expect(getVital(s, 'rr'), 'paralyzed patient moves no air -> monitored RR must be 0').toBe(0);
  });
});
