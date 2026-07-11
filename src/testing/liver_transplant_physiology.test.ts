import { describe, it, expect } from 'vitest';
import { LiverTransplantPhysiologyModel } from '../engine/LiverTransplantPhysiologyModel';

describe('LiverTransplantPhysiologyModel — ESLD, anhepatic, reperfusion, HPS', () => {
  it('falls back safely with no inputs', () => {
    expect(() => LiverTransplantPhysiologyModel.tick(undefined as any)).not.toThrow();
    const out = LiverTransplantPhysiologyModel.tick({});
    expect(out.currentPhase).toBe('pre_anhepatic');
  });

  describe('Pre-anhepatic ESLD hemodynamics', () => {
    it('high MELD score causes more SVR reduction (hyperdynamic circulation)', () => {
      const mild = LiverTransplantPhysiologyModel.tick({ meldScore: 15, oltPhase: 'pre_anhepatic' });
      const severe = LiverTransplantPhysiologyModel.tick({ meldScore: 35, oltPhase: 'pre_anhepatic' });
      expect(severe.svrReductionFromCirrhosis).toBeGreaterThan(mild.svrReductionFromCirrhosis);
      expect(severe.hyperdynamicCOMult).toBeGreaterThan(mild.hyperdynamicCOMult);
    });

    it('ESLD cardiomyopathy causes inotropy penalty', () => {
      const low = LiverTransplantPhysiologyModel.tick({ meldScore: 12, oltPhase: 'pre_anhepatic' });
      const high = LiverTransplantPhysiologyModel.tick({ meldScore: 38, oltPhase: 'pre_anhepatic' });
      expect(high.esldInotropyPenalty).toBeGreaterThan(low.esldInotropyPenalty);
    });
  });

  describe('Anhepatic phase', () => {
    it('IVC clamping causes significant venous return reduction', () => {
      const out = LiverTransplantPhysiologyModel.tick({ oltPhase: 'anhepatic' });
      expect(out.anhepaticVRReduction).toBeGreaterThan(0.4);
    });

    it('glucose depletes in anhepatic phase (no gluconeogenesis)', () => {
      const out = LiverTransplantPhysiologyModel.tick({ oltPhase: 'anhepatic' });
      expect(out.glucoseDepletion).toBeGreaterThan(0);
    });

    it('lactate accumulates in anhepatic phase (no clearance)', () => {
      const out = LiverTransplantPhysiologyModel.tick({ oltPhase: 'anhepatic' });
      expect(out.lactateAccumulation).toBeGreaterThan(0);
    });

    it('citrate from FFP chelates ionized Ca in anhepatic phase', () => {
      const noFFP = LiverTransplantPhysiologyModel.tick({ oltPhase: 'anhepatic', ffpVolumeMlThisPhase: 0 });
      const withFFP = LiverTransplantPhysiologyModel.tick({ oltPhase: 'anhepatic', ffpVolumeMlThisPhase: 2000 });
      expect(withFFP.citrateCaDropRate).toBeGreaterThan(noFFP.citrateCaDropRate);
    });

    it('fires anhepatic event on first entry to phase', () => {
      const out = LiverTransplantPhysiologyModel.tick({ oltPhase: 'anhepatic', prevAnhepacticLogged: false });
      expect(out.events.some(e => e.includes('ANHEPATIC PHASE'))).toBe(true);
    });
  });

  describe('Reperfusion phase', () => {
    it('fibrinolysis peaks immediately at reperfusion', () => {
      const out = LiverTransplantPhysiologyModel.tick({ oltPhase: 'reperfusion' });
      expect(out.fibrinolysisIndex).toBeGreaterThan(0.5);
    });

    it('fires reperfusion event on first entry', () => {
      const out = LiverTransplantPhysiologyModel.tick({ oltPhase: 'reperfusion', prevReperfusionLogged: false });
      expect(out.events.some(e => e.includes('OLT REPERFUSION'))).toBe(true);
    });
  });

  describe('Hepatopulmonary syndrome', () => {
    it('HPS adds significant shunt contribution', () => {
      const noHPS = LiverTransplantPhysiologyModel.tick({ hasHepPulmonarySyndrome: false, meldScore: 25 });
      const withHPS = LiverTransplantPhysiologyModel.tick({ hasHepPulmonarySyndrome: true, meldScore: 25 });
      expect(withHPS.hpsShuntContribution).toBeGreaterThan(noHPS.hpsShuntContribution);
    });

    it('higher MELD = worse HPS shunt', () => {
      const mild = LiverTransplantPhysiologyModel.tick({ hasHepPulmonarySyndrome: true, meldScore: 15 });
      const severe = LiverTransplantPhysiologyModel.tick({ hasHepPulmonarySyndrome: true, meldScore: 35 });
      expect(severe.hpsShuntContribution).toBeGreaterThan(mild.hpsShuntContribution);
    });

    it('fires HPS event once on first detection', () => {
      const out = LiverTransplantPhysiologyModel.tick({
        hasHepPulmonarySyndrome: true, meldScore: 28, prevHPSLogged: false,
      });
      expect(out.events.some(e => e.includes('HEPATOPULMONARY SYNDROME'))).toBe(true);
    });
  });
});
