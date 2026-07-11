import { describe, it, expect } from 'vitest';
import { DrugInteractionSafetyModel } from '../engine/DrugInteractionSafetyModel';

describe('DrugInteractionSafetyModel — serotonin syndrome, NMS, CYP3A4, BB+CCB', () => {
  it('falls back safely with no inputs', () => {
    expect(() => DrugInteractionSafetyModel.tick(undefined as any)).not.toThrow();
    const out = DrugInteractionSafetyModel.tick({});
    expect(out.serotoninSyndromeRisk).toBe(0);
  });

  describe('Serotonin Syndrome', () => {
    it('linezolid + SSRI creates high serotonin syndrome risk', () => {
      const out = DrugInteractionSafetyModel.tick({ ssriCe: 2.0, linezolid: true });
      expect(out.serotoninSyndromeRisk).toBeGreaterThan(0.5);
    });

    it('tramadol + SSRI has moderate serotonin risk', () => {
      const out = DrugInteractionSafetyModel.tick({ tramadolCe: 2.0, ssriCe: 1.5 });
      expect(out.serotoninSyndromeRisk).toBeGreaterThan(0.2);
    });

    it('fires serotonin syndrome event for high-risk combination', () => {
      const out = DrugInteractionSafetyModel.tick({
        ssriCe: 2.0, linezolid: true, currentTemp: 38.5, prevSerotoninLogged: false,
      });
      expect(out.events.some(e => e.includes('SEROTONIN SYNDROME'))).toBe(true);
    });

    it('SSRI alone without serotonergic opioid = low risk', () => {
      const out = DrugInteractionSafetyModel.tick({ ssriCe: 2.0 });
      expect(out.serotoninSyndromeRisk).toBeLessThan(0.5);
    });
  });

  describe('NMS', () => {
    it('high-dose antipsychotic creates NMS risk', () => {
      const out = DrugInteractionSafetyModel.tick({ antipsychoticCe: 3.0, currentTemp: 39.2 });
      expect(out.nmsRisk).toBeGreaterThan(0.4);
    });

    it('sudden levodopa withdrawal is highest NMS risk', () => {
      const out = DrugInteractionSafetyModel.tick({ levodopaSuddenStop: true, currentTemp: 39.5 });
      expect(out.nmsRisk).toBeGreaterThan(0.5);
    });
  });

  describe('CYP3A4 fluconazole + midazolam', () => {
    it('fluconazole dramatically prolongs midazolam', () => {
      const noFluconazole = DrugInteractionSafetyModel.tick({ midazolamCe: 2.0, fluconazoleCe: 0 });
      const withFluconazole = DrugInteractionSafetyModel.tick({ midazolamCe: 2.0, fluconazoleCe: 3.0 });
      expect(withFluconazole.midazolamProlongation).toBeGreaterThan(2.0);
      expect(noFluconazole.midazolamProlongation).toBe(1.0);
    });

    it('fires CYP3A4 interaction warning', () => {
      const out = DrugInteractionSafetyModel.tick({
        fluconazoleCe: 2.0, midazolamCe: 3.0, prevCYP3A4Logged: false,
      });
      expect(out.cyp3a4InteractionActive).toBe(true);
      expect(out.events.some(e => e.includes('CYP3A4'))).toBe(true);
    });
  });

  describe('Beta-blocker + Verapamil AV block risk', () => {
    it('combination creates AV block risk', () => {
      const out = DrugInteractionSafetyModel.tick({ betaBlockerCe: 2.0, verapamilCe: 2.0 });
      expect(out.avBlockRisk).toBeGreaterThan(0.2);
    });

    it('beta-blocker without CCB has no AV block risk', () => {
      const out = DrugInteractionSafetyModel.tick({ betaBlockerCe: 2.0, verapamilCe: 0 });
      expect(out.avBlockRisk).toBe(0);
    });
  });

  describe('Sugammadex + oral contraceptive', () => {
    it('sugammadex given to patient on OCP = interaction warning', () => {
      const out = DrugInteractionSafetyModel.tick({
        sugammadexGiven: true, onHormonalContraceptive: true, prevSugammadexOCPLogged: false,
      });
      expect(out.sugammadexOCPWarning).toBe(true);
      expect(out.events.some(e => e.includes('SUGAMMADEX + ORAL CONTRACEPTIVE'))).toBe(true);
    });

    it('sugammadex without OCP = no interaction', () => {
      const out = DrugInteractionSafetyModel.tick({ sugammadexGiven: true, onHormonalContraceptive: false });
      expect(out.sugammadexOCPWarning).toBe(false);
    });
  });
});
