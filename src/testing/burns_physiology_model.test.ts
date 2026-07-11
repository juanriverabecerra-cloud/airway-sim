import { describe, it, expect } from 'vitest';
import { BurnsPhysiologyModel } from '../engine/BurnsPhysiologyModel';

describe('BurnsPhysiologyModel — burns physiology, Parkland, inhalation injury', () => {
  describe('Safe defaults', () => {
    it('returns identity values with no burn', () => {
      const out = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 0, inhalationInjury: false });
      expect(out.burnsMetabolicMultiplier).toBe(1.0);
      expect(out.parklandTotalRequiredMl).toBe(0);
      expect(out.suxContraindicated).toBe(false);
    });

    it('falls back safely with undefined inputs', () => {
      expect(() => BurnsPhysiologyModel.tick(undefined as any)).not.toThrow();
    });
  });

  describe('Hypermetabolism', () => {
    it('metabolic multiplier increases with TBSA%', () => {
      const burn20 = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 20, weightKg: 70 });
      const burn40 = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 40, weightKg: 70 });
      expect(burn40.burnsMetabolicMultiplier).toBeGreaterThan(burn20.burnsMetabolicMultiplier);
      expect(burn40.burnsMetabolicMultiplier).toBeGreaterThan(1.0);
    });

    it('metabolic multiplier caps at 2.0 for extreme burns', () => {
      const out = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 80, weightKg: 70 });
      expect(out.burnsMetabolicMultiplier).toBeLessThanOrEqual(2.0);
    });

    it('40% TBSA produces approximately 1.68× baseline metabolic rate', () => {
      const out = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 40, weightKg: 70 });
      // 1 + 0.017 × 40 = 1.68
      expect(out.burnsMetabolicMultiplier).toBeCloseTo(1.68, 1);
    });
  });

  describe('Parkland formula', () => {
    it('calculates correct Parkland requirement: 4 × kg × TBSA', () => {
      const out = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 40, weightKg: 80 });
      // 4 × 80 × 40 = 12,800 mL
      expect(out.parklandTotalRequiredMl).toBeCloseTo(12800, 0);
      expect(out.parklandFirst8hRequiredMl).toBeCloseTo(6400, 0);
    });

    it('detects fluid deficit when Parkland given < required for time elapsed', () => {
      const out = BurnsPhysiologyModel.tick({
        burnsTBSAPercent: 30, weightKg: 75, hoursPostBurn: 4,
        totalParklandGivenMl: 0, // nothing given yet
      });
      // By 4h, should have given: 9000/2 / 8 × 4 = 2250 mL
      expect(out.parklandFluidDeficitMl).toBeGreaterThan(2000);
    });

    it('no deficit when adequate fluids given', () => {
      const out = BurnsPhysiologyModel.tick({
        burnsTBSAPercent: 30, weightKg: 75, hoursPostBurn: 4,
        totalParklandGivenMl: 3000, // more than needed
      });
      expect(out.parklandFluidDeficitMl).toBe(0);
    });
  });

  describe('Succinylcholine contraindication', () => {
    it('sux not contraindicated in first 48h post-burn', () => {
      const out = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 30, hoursPostBurn: 24, weightKg: 70 });
      expect(out.suxContraindicated).toBe(false);
    });

    it('sux contraindicated after 48h post-burn with >= 10% TBSA', () => {
      const out = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 30, hoursPostBurn: 72, weightKg: 70 });
      expect(out.suxContraindicated).toBe(true);
    });
  });

  describe('Inhalation injury', () => {
    it('compliance penalty develops over time with inhalation injury', () => {
      const early = BurnsPhysiologyModel.tick({ inhalationInjury: true, inhalationSeverity: 0.8, hoursPostBurn: 6, weightKg: 70 });
      const late = BurnsPhysiologyModel.tick({ inhalationInjury: true, inhalationSeverity: 0.8, hoursPostBurn: 36, weightKg: 70 });
      expect(late.inhalationInjuryCompliancePenalty).toBeGreaterThan(early.inhalationInjuryCompliancePenalty);
    });

    it('resistance penalty develops with inhalation injury', () => {
      const out = BurnsPhysiologyModel.tick({ inhalationInjury: true, inhalationSeverity: 0.7, hoursPostBurn: 4, weightKg: 70 });
      expect(out.inhalationInjuryResistancePenalty).toBeGreaterThan(0);
    });

    it('upper airway edema risk peaks at 4-8h post-burn', () => {
      const early = BurnsPhysiologyModel.tick({ inhalationInjury: true, inhalationSeverity: 1.0, hoursPostBurn: 0.5, weightKg: 70 });
      const peak = BurnsPhysiologyModel.tick({ inhalationInjury: true, inhalationSeverity: 1.0, hoursPostBurn: 8, weightKg: 70 });
      expect(peak.upperAirwayEdemaRisk).toBeGreaterThan(early.upperAirwayEdemaRisk);
    });

    it('fires airway emergency event when edema risk is high and airway not secured', () => {
      const out = BurnsPhysiologyModel.tick({
        inhalationInjury: true, inhalationSeverity: 1.0, hoursPostBurn: 6,
        airwaySecured: false, weightKg: 70,
        prevBurnOnsetLogged: true, prevInhalationLogged: true, prevAirwayEdemaLogged: false,
      });
      expect(out.events.some(e => e.includes('AIRWAY EMERGENCY'))).toBe(true);
    });

    it('no airway emergency event if airway already secured', () => {
      const out = BurnsPhysiologyModel.tick({
        inhalationInjury: true, inhalationSeverity: 1.0, hoursPostBurn: 6,
        airwaySecured: true, weightKg: 70,
        prevBurnOnsetLogged: true, prevInhalationLogged: true, prevAirwayEdemaLogged: false,
      });
      expect(out.events.some(e => e.includes('AIRWAY EMERGENCY'))).toBe(false);
    });

    it('fires inhalation injury event on first encounter', () => {
      const out = BurnsPhysiologyModel.tick({
        inhalationInjury: true, inhalationSeverity: 0.6, hoursPostBurn: 1,
        weightKg: 70, prevBurnOnsetLogged: true, prevInhalationLogged: false,
      });
      expect(out.events.some(e => e.includes('INHALATION INJURY'))).toBe(true);
    });
  });

  describe('Evaporative heat loss', () => {
    it('evaporative heat loss increases with TBSA', () => {
      const burn10 = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 10, weightKg: 70 });
      const burn40 = BurnsPhysiologyModel.tick({ burnsTBSAPercent: 40, weightKg: 70 });
      expect(burn40.evaporativeHeatLossW).toBeGreaterThan(burn10.evaporativeHeatLossW);
    });
  });
});
