import { describe, it, expect } from 'vitest';
import { AngioedemaStatusAsthmaModel } from '../engine/AngioedemaStatusAsthmaModel';

describe('AngioedemaStatusAsthmaModel — ACE-I angioedema, HAE, status asthmaticus', () => {
  it('falls back safely with no inputs', () => {
    expect(() => AngioedemaStatusAsthmaModel.tick(undefined as any)).not.toThrow();
    const out = AngioedemaStatusAsthmaModel.tick({});
    expect(out.angioedemaActive).toBe(false);
    expect(out.statusAsthmaActive).toBe(false);
  });

  describe('Angioedema — bradykinin vs histamine type', () => {
    it('ACE inhibitor angioedema is bradykinin-mediated', () => {
      const out = AngioedemaStatusAsthmaModel.tick({ aceInhibitorActive: true, angioedemaPresent: true });
      expect(out.bradykininMediated).toBe(true);
    });

    it('HAE is bradykinin-mediated', () => {
      const out = AngioedemaStatusAsthmaModel.tick({ hasHAE: true, angioedemaPresent: true });
      expect(out.bradykininMediated).toBe(true);
    });

    it('epinephrine is FUTILE for bradykinin-mediated angioedema (critical teaching point)', () => {
      const out = AngioedemaStatusAsthmaModel.tick({
        aceInhibitorActive: true, angioedemaPresent: true, epinephrineCeForAngioedema: 2.0,
      });
      expect(out.bradykininMediated).toBe(true);
      expect(out.epinephrineFutile).toBe(true);
    });

    it('airway obstruction worsens progressively with time', () => {
      const early = AngioedemaStatusAsthmaModel.tick({ aceInhibitorActive: true, angioedemaPresent: true, angioedemaMinutesSince: 30 });
      const late = AngioedemaStatusAsthmaModel.tick({ aceInhibitorActive: true, angioedemaPresent: true, angioedemaMinutesSince: 180 });
      expect(late.angioedemaAirwayScore).toBeGreaterThan(early.angioedemaAirwayScore);
    });

    it('C1-INH concentrate reverses bradykinin angioedema', () => {
      const noTx = AngioedemaStatusAsthmaModel.tick({ hasHAE: true, angioedemaPresent: true, angioedemaMinutesSince: 60, c1InhConcentrateCe: 0 });
      const withC1INH = AngioedemaStatusAsthmaModel.tick({ hasHAE: true, angioedemaPresent: true, angioedemaMinutesSince: 60, c1InhConcentrateCe: 3.0 });
      expect(withC1INH.c1InhEfficacy).toBeGreaterThan(0.6);
      expect(withC1INH.angioedemaAirwayScore).toBeLessThan(noTx.angioedemaAirwayScore);
    });

    it('angioedema causes upper airway resistance penalty', () => {
      const out = AngioedemaStatusAsthmaModel.tick({ aceInhibitorActive: true, angioedemaPresent: true, angioedemaMinutesSince: 120 });
      if (out.angioedemaAirwayScore > 0.2) {
        expect(out.uppperAirwayResistancePenalty).toBeGreaterThan(5);
      }
    });
  });

  describe('Status Asthmaticus', () => {
    it('no status asthmaticus effects without active episode', () => {
      const out = AngioedemaStatusAsthmaModel.tick({ statusAsthmaticusActive: false });
      expect(out.statusAsthmaActive).toBe(false);
    });

    it('status asthmaticus worsens over time without treatment', () => {
      const early = AngioedemaStatusAsthmaModel.tick({ statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 10 });
      const late = AngioedemaStatusAsthmaModel.tick({ statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 120 });
      expect(late.bronchospasmSeverity).toBeGreaterThan(early.bronchospasmSeverity);
    });

    it('combined albuterol + ipratropium + magnesium is more effective than albuterol alone', () => {
      const albuOnly = AngioedemaStatusAsthmaModel.tick({ statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 60, albuterolCe: 2.0 });
      const triple = AngioedemaStatusAsthmaModel.tick({
        statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 60,
        albuterolCe: 2.0, ipratropiumCe: 2.0, magnesiumCeForAsthma: 3.0,
      });
      expect(triple.bronchodilatorEfficacy).toBeGreaterThan(albuOnly.bronchodilatorEfficacy);
      expect(triple.bronchospasmSeverity).toBeLessThan(albuOnly.bronchospasmSeverity);
    });

    it('mechanical ventilation creates auto-PEEP in severe status asthmaticus', () => {
      const out = AngioedemaStatusAsthmaModel.tick({
        statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 60,
        ventilatedDuringAsthma: true,
      });
      expect(out.autoPEEPEstimate).toBeGreaterThan(0);
      expect(out.autoPEEPCOImpact).toBeGreaterThan(0);
    });

    it('heliox reduces turbulence and improves bronchospasm severity', () => {
      const noHeliox = AngioedemaStatusAsthmaModel.tick({ statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 60, helioxActive: false });
      const withHeliox = AngioedemaStatusAsthmaModel.tick({ statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 60, helioxActive: true });
      expect(withHeliox.bronchodilatorEfficacy).toBeGreaterThan(noHeliox.bronchodilatorEfficacy);
    });

    it('recommends heliox when refractory and not already using it', () => {
      const out = AngioedemaStatusAsthmaModel.tick({
        statusAsthmaticusActive: true, statusAsthmaticusMinutesSince: 90, helioxActive: false,
      });
      if (out.bronchospasmSeverity > 0.5) {
        expect(out.recommendHeliumMixture).toBe(true);
      }
    });
  });
});
