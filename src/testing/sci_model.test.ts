import { describe, it, expect } from 'vitest';
import { SpinalCordInjuryModel } from '../engine/SpinalCordInjuryModel';

describe('SpinalCordInjuryModel — succinylcholine contraindication, autonomic dysreflexia', () => {
  it('falls back safely with no inputs', () => {
    expect(() => SpinalCordInjuryModel.tick(undefined as any)).not.toThrow();
    const out = SpinalCordInjuryModel.tick({});
    expect(out.suxContraindicated).toBe(false);
  });

  it('no SCI = no restrictions', () => {
    const out = SpinalCordInjuryModel.tick({ sciLevel: 'none' });
    expect(out.suxContraindicated).toBe(false);
    expect(out.autonomicDysreflexiaRisk).toBe(0);
  });

  describe('Succinylcholine contraindication', () => {
    it('succinylcholine CONTRAINDICATED after 48h post-SCI', () => {
      const out = SpinalCordInjuryModel.tick({ sciLevel: 'T1-T6', daysPostInjury: 5 });
      expect(out.suxContraindicated).toBe(true);
      expect(out.suxSafeWindow).toBe(false);
    });

    it('succinylcholine SAFE within 48h of acute SCI', () => {
      const out = SpinalCordInjuryModel.tick({ sciLevel: 'T1-T6', daysPostInjury: 1 });
      expect(out.suxContraindicated).toBe(false);
      expect(out.suxSafeWindow).toBe(true);
    });

    it('fires hyperkalemia warning when sux given to chronic SCI', () => {
      const out = SpinalCordInjuryModel.tick({
        sciLevel: 'T1-T6', daysPostInjury: 30,
        succinylcholineGivenSCI: true, prevSCISuxLogged: false,
      });
      expect(out.events.some(e => e.includes('CONTRAINDICATED IN CHRONIC SCI'))).toBe(true);
    });
  });

  describe('Autonomic dysreflexia risk', () => {
    it('high risk above T6 (T1-T6 level)', () => {
      const out = SpinalCordInjuryModel.tick({ sciLevel: 'T1-T6' });
      expect(out.autonomicDysreflexiaRisk).toBeGreaterThan(0.5);
    });

    it('lower risk below T7', () => {
      const high = SpinalCordInjuryModel.tick({ sciLevel: 'T1-T6' });
      const low = SpinalCordInjuryModel.tick({ sciLevel: 'T7-L1' });
      expect(low.autonomicDysreflexiaRisk).toBeLessThan(high.autonomicDysreflexiaRisk);
    });

    it('fires AD emergency event when triggered in high-level SCI', () => {
      const out = SpinalCordInjuryModel.tick({
        sciLevel: 'C5-C7', hasAutonomicDysreflexia: true,
        currentMAP: 185, prevADLogged: false,
      });
      expect(out.events.some(e => e.includes('AUTONOMIC DYSREFLEXIA'))).toBe(true);
    });
  });

  describe('Level-specific physiology', () => {
    it('C1-C4 SCI patient is ventilator-dependent', () => {
      const out = SpinalCordInjuryModel.tick({ sciLevel: 'C1-C4' });
      expect(out.ventilatorDependentRisk).toBe(true);
    });

    it('T1-T6 has significant bradycardia risk (cardiac accelerator loss)', () => {
      const out = SpinalCordInjuryModel.tick({ sciLevel: 'T1-T6' });
      expect(out.bradycardiaRisk).toBeGreaterThan(0.3);
    });

    it('poikilothermia risk above T6 (cannot regulate temperature)', () => {
      const high = SpinalCordInjuryModel.tick({ sciLevel: 'T1-T6' });
      const low = SpinalCordInjuryModel.tick({ sciLevel: 'L2_below' });
      expect(high.poikilothermiaRisk).toBe(true);
      expect(low.poikilothermiaRisk).toBe(false);
    });
  });
});
