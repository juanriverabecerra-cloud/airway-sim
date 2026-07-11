import { describe, it, expect } from 'vitest';
import { PediatricSpecificClinicalModel } from '../engine/PediatricSpecificClinicalModel';

describe('PediatricSpecificClinicalModel — pyloric stenosis, apnea prematurity, CHD, TET', () => {
  it('falls back safely with no inputs', () => {
    expect(() => PediatricSpecificClinicalModel.tick(undefined as any)).not.toThrow();
    const out = PediatricSpecificClinicalModel.tick({});
    expect(out.metabolicReadyForSurgery).toBe(true);
    expect(out.apneaRiskHigh).toBe(false);
  });

  describe('Pyloric stenosis metabolic management', () => {
    it('NOT ready for surgery with untreated metabolic alkalosis', () => {
      const out = PediatricSpecificClinicalModel.tick({
        hasPyloricStenosis: true, currentCl: 88, currentK: 2.8, currentPH: 7.55,
      });
      expect(out.metabolicReadyForSurgery).toBe(false);
      expect(out.pyloric_cl_deficit).toBeGreaterThan(0);
      expect(out.pyloric_k_deficit).toBeGreaterThan(0);
    });

    it('ready for surgery after metabolic correction', () => {
      const out = PediatricSpecificClinicalModel.tick({
        hasPyloricStenosis: true, currentCl: 103, currentK: 3.7, currentPH: 7.38,
      });
      expect(out.metabolicReadyForSurgery).toBe(true);
    });

    it('fires pyloric stenosis teaching event', () => {
      const out = PediatricSpecificClinicalModel.tick({
        hasPyloricStenosis: true, currentCl: 90, prevPyloricStenosisLogged: false,
      });
      expect(out.events.some(e => e.includes('PYLORIC STENOSIS'))).toBe(true);
    });
  });

  describe('Apnea of prematurity', () => {
    it('high apnea risk for ex-preemie under 60 weeks PCA', () => {
      const out = PediatricSpecificClinicalModel.tick({ gestationalAgeAtBirth: 28, postConceptualAge: 44 });
      expect(out.apneaRiskHigh).toBe(true);
      expect(out.caffeineRecommended).toBe(true);
    });

    it('no apnea risk for term infant past 60 weeks PCA', () => {
      const out = PediatricSpecificClinicalModel.tick({ gestationalAgeAtBirth: 40, postConceptualAge: 65 });
      expect(out.apneaRiskHigh).toBe(false);
    });

    it('caffeine not recommended if already given', () => {
      const out = PediatricSpecificClinicalModel.tick({
        gestationalAgeAtBirth: 30, postConceptualAge: 48, caffeineActive: true,
      });
      expect(out.caffeineRecommended).toBe(false);
    });
  });

  describe('Congenital heart disease', () => {
    it('cyanotic CHD creates paradoxical embolism risk', () => {
      const out = PediatricSpecificClinicalModel.tick({ hasCHD: true, chdType: 'cyanotic' });
      expect(out.paradoxicalEmbolismRisk).toBeGreaterThan(0);
    });

    it('fires air bubble warning for all unrepaired CHD', () => {
      const out = PediatricSpecificClinicalModel.tick({
        hasCHD: true, chdType: 'acyanotic', prevAirBubbleLogged: false,
      });
      expect(out.events.some(e => e.includes('AIR EMBOLISM RISK'))).toBe(true);
    });

    it('TET spell with SpO2 < 80% triggers emergency', () => {
      const out = PediatricSpecificClinicalModel.tick({
        hasCHD: true, chdType: 'cyanotic', currentSpO2: 75, prevTETSpellLogged: false,
      });
      expect(out.tetSpellRisk).toBeGreaterThan(0.5);
      expect(out.events.some(e => e.includes('TET'))).toBe(true);
    });

    it('phenylephrine increases SVR and reduces TET spell (correct treatment)', () => {
      const noTx = PediatricSpecificClinicalModel.tick({ hasCHD: true, chdType: 'cyanotic', svr_phenylephrineCe: 0 });
      const withPheny = PediatricSpecificClinicalModel.tick({ hasCHD: true, chdType: 'cyanotic', svr_phenylephrineCe: 2.0 });
      expect(withPheny.phenylephrineBenefit).toBeGreaterThan(noTx.phenylephrineBenefit);
    });
  });

  describe('Laryngomalacia', () => {
    it('supine position worsens laryngomalacia obstruction risk', () => {
      const supine = PediatricSpecificClinicalModel.tick({ hasLaryngomalacia: true, positionSupine: true });
      const prone = PediatricSpecificClinicalModel.tick({ hasLaryngomalacia: true, positionSupine: false });
      expect(supine.laryngomalaciaObstructionRisk).toBeGreaterThan(prone.laryngomalaciaObstructionRisk);
    });
  });
});
