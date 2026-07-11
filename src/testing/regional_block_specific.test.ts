import { describe, it, expect } from 'vitest';
import { RegionalBlockSpecificModel } from '../engine/RegionalBlockSpecificModel';

describe('RegionalBlockSpecificModel — named blocks, coverage, dexamethasone extension', () => {
  it('falls back safely with no inputs', () => {
    expect(() => RegionalBlockSpecificModel.tick(undefined as any)).not.toThrow();
    const out = RegionalBlockSpecificModel.tick({});
    expect(out.opioidSparingFraction).toBe(0);
  });

  describe('Block coverage and duration', () => {
    it('interscalene covers shoulder surgery', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'interscalene', localAnestheticCe: 2.0 });
      expect(out.blockCoverage.some(c => c.includes('Shoulder'))).toBe(true);
      expect(out.blockDurationHours).toBeGreaterThan(12);
    });

    it('supraclavicular provides broadest arm coverage', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'supraclavicular', localAnestheticCe: 2.0 });
      expect(out.blockCoverage.some(c => c.includes('Hand'))).toBe(true);
    });

    it('TAP block covers anterior abdominal wall only', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'tap', localAnestheticCe: 2.0 });
      expect(out.blockCoverage.some(c => c.includes('abdominal'))).toBe(true);
    });
  });

  describe('Dexamethasone extension', () => {
    it('perineural dexamethasone extends block duration', () => {
      const noDex = RegionalBlockSpecificModel.tick({ blockType: 'interscalene', localAnestheticCe: 2.0 });
      const withDex = RegionalBlockSpecificModel.tick({ blockType: 'interscalene', localAnestheticCe: 2.0, dexamethasonePeriNeural: 8 });
      expect(withDex.totalDurationHours).toBeGreaterThan(noDex.totalDurationHours);
      expect(withDex.dexExtensionHours).toBeGreaterThan(0);
    });

    it('systemic dexamethasone also extends block', () => {
      const noDex = RegionalBlockSpecificModel.tick({ blockType: 'femoral', localAnestheticCe: 2.0 });
      const withSysDex = RegionalBlockSpecificModel.tick({ blockType: 'femoral', localAnestheticCe: 2.0, systemicDexaCe: 1.0 });
      expect(withSysDex.dexExtensionHours).toBeGreaterThan(0);
    });
  });

  describe('Specific block risks', () => {
    it('interscalene has 100% phrenic nerve palsy risk', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'interscalene', localAnestheticCe: 2.0 });
      expect(out.phrenic_palsy_risk).toBe(1.0);
    });

    it('axillary block has NO phrenic nerve risk', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'axillary', localAnestheticCe: 2.0 });
      expect(out.phrenic_palsy_risk).toBe(0);
    });

    it('supraclavicular has pneumothorax risk', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'supraclavicular', localAnestheticCe: 2.0 });
      expect(out.pneumothorax_risk).toBeGreaterThan(0);
    });

    it('femoral nerve block causes fall risk from quad weakness', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'femoral', localAnestheticCe: 2.0 });
      expect(out.fallRiskIncrease).toBe(true);
    });

    it('adductor canal block (motor-sparing) has no fall risk', () => {
      const out = RegionalBlockSpecificModel.tick({ blockType: 'adductor_canal', localAnestheticCe: 2.0 });
      expect(out.fallRiskIncrease).toBe(false);
    });
  });

  describe('Block wears off over time', () => {
    it('opioid sparing reduces as block wears off', () => {
      const fresh = RegionalBlockSpecificModel.tick({ blockType: 'sciatic_popliteal', localAnestheticCe: 2.0, blockMinutesSince: 30 });
      const wearing = RegionalBlockSpecificModel.tick({ blockType: 'sciatic_popliteal', localAnestheticCe: 2.0, blockMinutesSince: 1200 });
      expect(wearing.opioidSparingFraction).toBeLessThan(fresh.opioidSparingFraction);
    });
  });
});
