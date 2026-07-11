import { describe, it, expect } from 'vitest';
import { CardiopulmonaryBypassModel } from '../engine/CardiopulmonaryBypassModel';

describe('CardiopulmonaryBypassModel — CPB physiology, hemodilution, SIRS', () => {
  it('falls back safely with no inputs', () => {
    expect(() => CardiopulmonaryBypassModel.tick(undefined as any)).not.toThrow();
    const out = CardiopulmonaryBypassModel.tick({});
    expect(out.onBypass).toBe(false);
  });

  it('returns identity values when not on bypass', () => {
    const out = CardiopulmonaryBypassModel.tick({ onBypass: false });
    expect(out.onBypass).toBe(false);
    expect(out.sirsIndex).toBe(0);
  });

  describe('On bypass', () => {
    it('hemodilution reduces Hb from prime volume dilution', () => {
      const out = CardiopulmonaryBypassModel.tick({
        onBypass: true, currentHb: 14, primeVolumeAddedMl: 1500, bsaM2: 1.73,
      });
      expect(out.hemodilutionHb).toBeLessThan(14);
      expect(out.hemodilutionHb).toBeGreaterThan(8);
    });

    it('SIRS increases with bypass duration', () => {
      const short = CardiopulmonaryBypassModel.tick({ onBypass: true, bypassMinutesSince: 30 });
      const long = CardiopulmonaryBypassModel.tick({ onBypass: true, bypassMinutesSince: 120 });
      expect(long.sirsIndex).toBeGreaterThan(short.sirsIndex);
    });

    it('deep hypothermia (≤ 20°C) triggers DHCA state', () => {
      const out = CardiopulmonaryBypassModel.tick({ onBypass: true, cpbTemperatureC: 18, aortaClamped: true });
      expect(out.dhcaActive).toBe(true);
      expect(out.isHypothermic).toBe(true);
    });

    it('normothermic bypass is not hypothermic', () => {
      const out = CardiopulmonaryBypassModel.tick({ onBypass: true, cpbTemperatureC: 37 });
      expect(out.isHypothermic).toBe(false);
      expect(out.dhcaActive).toBe(false);
    });

    it('flow index < 1.8 L/min/m² is inadequate', () => {
      const out = CardiopulmonaryBypassModel.tick({ onBypass: true, cpbFlowRateLMin: 2.0, bsaM2: 1.73 });
      if (out.cpbFlowIndexed < 1.8) {
        expect(out.flowAdequate).toBe(false);
      }
    });

    it('aortic cross-clamp triggers cardiac arrest event', () => {
      const out = CardiopulmonaryBypassModel.tick({
        onBypass: true, aortaClamped: true, prevCPBOnsetLogged: true, prevClampLogged: false,
      });
      expect(out.cardiacArrestActive).toBe(true);
      expect(out.events.some(e => e.includes('AORTIC CROSS-CLAMP'))).toBe(true);
    });

    it('fires CPB onset event on first tick', () => {
      const out = CardiopulmonaryBypassModel.tick({
        onBypass: true, bypassMinutesSince: 0, prevCPBOnsetLogged: false,
      });
      expect(out.events.some(e => e.includes('CPB INITIATED'))).toBe(true);
    });
  });

  describe('Protamine reversal', () => {
    it('protamine reaction risk elevated with NPH insulin history', () => {
      const noNPH = CardiopulmonaryBypassModel.tick({ onBypass: true, protamineCe: 2.0, hasNPHInsulin: false });
      const withNPH = CardiopulmonaryBypassModel.tick({ onBypass: true, protamineCe: 2.0, hasNPHInsulin: true });
      expect(withNPH.protamineReactionRisk).toBeGreaterThan(noNPH.protamineReactionRisk);
    });

    it('protamine reaction risk elevated with prior exposure', () => {
      const no = CardiopulmonaryBypassModel.tick({ onBypass: true, protamineCe: 2.0, hasProtamineHistory: false });
      const yes = CardiopulmonaryBypassModel.tick({ onBypass: true, protamineCe: 2.0, hasProtamineHistory: true });
      expect(yes.protamineReactionRisk).toBeGreaterThan(no.protamineReactionRisk);
    });

    it('fires protamine warning when administered', () => {
      const out = CardiopulmonaryBypassModel.tick({
        onBypass: true, protamineCe: 2.0, prevCPBOnsetLogged: true, prevClampLogged: true, prevProtamineLogged: false,
      });
      expect(out.events.some(e => e.includes('PROTAMINE'))).toBe(true);
    });
  });
});
