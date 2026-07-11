import { describe, it, expect } from 'vitest';
import { ToxidromeModel } from '../engine/ToxidromeModel';
import { CarotidEndCerebralModel } from '../engine/CarotidEndCerebralModel';

// ============================================================
// TOXIDROME MODEL
// ============================================================
describe('ToxidromeModel — anticholinergic and cholinergic syndromes', () => {
  it('falls back safely with no inputs', () => {
    expect(() => ToxidromeModel.tick(undefined as any)).not.toThrow();
    const out = ToxidromeModel.tick({});
    expect(out.anticholinergicActive).toBe(false);
    expect(out.cholinergicActive).toBe(false);
  });

  describe('Anticholinergic toxidrome', () => {
    it('atropine overdose triggers anticholinergic toxidrome', () => {
      const out = ToxidromeModel.tick({ atropineCe: 5.0 });
      expect(out.anticholinergicActive).toBe(true);
      expect(out.anticholinergicHREffect).toBeGreaterThan(0); // tachycardia
      expect(out.anticholinergicTempEffect).toBeGreaterThan(0); // hyperthermia
    });

    it('scopolamine causes central anticholinergic (delirium risk) — glycopyrrolate does NOT', () => {
      const scopOut = ToxidromeModel.tick({ scopolamineCe: 1.5 });
      const glycOut = ToxidromeModel.tick({ glycopyrrolateCe: 5.0 });
      expect(scopOut.centralAnticholinergicActive).toBe(true);
      expect(scopOut.deliriumRisk).toBeGreaterThan(0.3);
      // Glycopyrrolate: peripheral only (quaternary ammonium), no BBB crossing
      expect(glycOut.centralAnticholinergicActive).toBe(false);
      expect(glycOut.deliriumRisk).toBe(0);
    });

    it('physostigmine reverses central anticholinergic effect', () => {
      const noPhys = ToxidromeModel.tick({ atropineCe: 4.0, physostigmineCe: 0 });
      const withPhys = ToxidromeModel.tick({ atropineCe: 4.0, physostigmineCe: 1.5 });
      expect(withPhys.physostigmineEfficacy).toBeGreaterThan(0.5);
      // Physostigmine opposes the central effects
    });

    it('fires anticholinergic event at significant combined burden', () => {
      // Realistic scenario: scopolamine patch + IV atropine + diphenhydramine antiemetic
      // Combined burden exceeds threshold for clinical toxidrome
      const out = ToxidromeModel.tick({
        atropineCe: 3.0, scopolamineCe: 0.8, diphenhydramineCe: 4.0,
        prevAnticholinLogged: false,
      });
      expect(out.anticholinergicActive).toBe(true);
      expect(out.anticholinergicIndex).toBeGreaterThan(0.4);
      expect(out.events.some(e => e.includes('ANTICHOLINERGIC TOXIDROME'))).toBe(true);
    });

    it('anticholinergic SVR effect is vasodilatory (negative fraction)', () => {
      const out = ToxidromeModel.tick({ atropineCe: 4.0 });
      expect(out.anticholinergicSVREffect).toBeLessThan(0);
    });
  });

  describe('Cholinergic toxidrome', () => {
    it('neostigmine overdose causes cholinergic toxidrome', () => {
      const out = ToxidromeModel.tick({ neostigmineCe: 5.0 });
      expect(out.cholinergicActive).toBe(true);
      expect(out.cholinergicHREffect).toBeLessThan(0); // bradycardia
      expect(out.cholinergicBronchospasmContribution).toBeGreaterThan(0);
    });

    it('organophosphate poisoning creates severe cholinergic crisis', () => {
      const out = ToxidromeModel.tick({ organophosphatePoisoning: true, organophosphateConcentration: 0.8 });
      expect(out.cholinergicIndex).toBeGreaterThan(0.5);
      expect(out.cholinergicResistancePenalty).toBeGreaterThan(10); // severe bronchospasm
      expect(out.nmjDepolarizingBlock).toBeGreaterThan(0); // NMJ paralysis
    });

    it('atropine reverses muscarinic effects of cholinergic crisis', () => {
      const noAtrop = ToxidromeModel.tick({ organophosphatePoisoning: true, organophosphateConcentration: 0.6, atropineCe: 0 });
      const withAtrop = ToxidromeModel.tick({ organophosphatePoisoning: true, organophosphateConcentration: 0.6, atropineCe: 3.0 });
      expect(withAtrop.atropineEfficacy).toBeGreaterThan(0.5);
      // With atropine, HR and SVR effects should be attenuated
      expect(Math.abs(withAtrop.cholinergicHREffect)).toBeLessThan(Math.abs(noAtrop.cholinergicHREffect));
    });

    it('fires SEVERE cholinergic event at critical threshold', () => {
      const out = ToxidromeModel.tick({
        organophosphatePoisoning: true, organophosphateConcentration: 0.9,
        prevCholinergicLogged: true, prevCholinergicSevereLogged: false,
      });
      expect(out.events.some(e => e.includes('SEVERE CHOLINERGIC CRISIS'))).toBe(true);
    });

    it('glycopyrrolate provides peripheral muscarinic block for cholinergic toxidrome', () => {
      const noGlyc = ToxidromeModel.tick({ neostigmineCe: 4.0, glycopyrrolateCe: 0 });
      const withGlyc = ToxidromeModel.tick({ neostigmineCe: 4.0, glycopyrrolateCe: 2.0 });
      expect(withGlyc.atropineEfficacy).toBeGreaterThan(0);
      expect(withGlyc.cholinergicResistancePenalty).toBeLessThan(noGlyc.cholinergicResistancePenalty);
    });
  });
});

// ============================================================
// CAROTID ENDARTERECTOMY + REPERFUSION MODEL
// ============================================================
describe('CarotidEndCerebralModel — CEA cerebral perfusion + reperfusion syndrome', () => {
  it('falls back safely with no inputs', () => {
    expect(() => CarotidEndCerebralModel.tick(undefined as any)).not.toThrow();
    const out = CarotidEndCerebralModel.tick({});
    expect(out.cerebralPerfusionAdequate).toBe(true);
    expect(out.reperfusionSyndromeSeverity).toBe(0);
  });

  describe('Carotid endarterectomy', () => {
    it('adequate collateral flow with good stump pressure (> 50 mmHg)', () => {
      const out = CarotidEndCerebralModel.tick({
        ceaActive: true, carotidClamped: true, carotidShuntInPlace: false,
        carotidStumpPressureMmHg: 65, ipsilateralRSO2Baseline: 68, ipsilateralRSO2Current: 65,
        currentMAP: 85,
      });
      expect(out.cerebralPerfusionAdequate).toBe(true);
      expect(out.recommendShunt).toBe(false);
    });

    it('inadequate collateral flow with low stump pressure (< 40 mmHg) → shunt recommended', () => {
      const out = CarotidEndCerebralModel.tick({
        ceaActive: true, carotidClamped: true, carotidShuntInPlace: false,
        carotidStumpPressureMmHg: 30, ipsilateralRSO2Baseline: 70, ipsilateralRSO2Current: 50,
        currentMAP: 75,
      });
      expect(out.recommendShunt).toBe(true);
      expect(out.cerebralPerfusionAdequate).toBe(false);
    });

    it('shunt in place restores collateral flow index', () => {
      const noShunt = CarotidEndCerebralModel.tick({
        ceaActive: true, carotidClamped: true, carotidShuntInPlace: false,
        carotidStumpPressureMmHg: 28, currentMAP: 70,
      });
      const withShunt = CarotidEndCerebralModel.tick({
        ceaActive: true, carotidClamped: true, carotidShuntInPlace: true,
        carotidStumpPressureMmHg: 28, currentMAP: 70,
      });
      // When shunt is in, collateral index defaults to 1.0 (shunt bypasses clamp)
      expect(withShunt.collateralFlowIndex).toBeGreaterThan(noShunt.collateralFlowIndex);
    });

    it('carotid body manipulation causes vagal bradycardia', () => {
      const out = CarotidEndCerebralModel.tick({
        ceaActive: true, carotidClamped: false, carotidBodyManipulation: true,
      });
      expect(out.carotidBodyVagalEffect).toBeLessThan(-10); // significant bradycardia
    });

    it('fires clamp event on first carotid clamping', () => {
      const out = CarotidEndCerebralModel.tick({
        ceaActive: true, carotidClamped: true, prevClampLogged: false,
        carotidStumpPressureMmHg: 55, ipsilateralRSO2Baseline: 68, ipsilateralRSO2Current: 64,
        currentMAP: 85,
      });
      expect(out.events.some(e => e.includes('CAROTID CROSS-CLAMP'))).toBe(true);
    });
  });

  describe('Reperfusion syndrome', () => {
    it('hepatic reperfusion after long ischemia causes significant hemodynamic effect', () => {
      const out = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'hepatic',
        ischemicDurationMinutes: 90, reperfusionTimeSec: 60,
        coldPreservationSolution: true, preservationKMEqL: 115,
      });
      expect(out.reperfusionSyndromeSeverity).toBeGreaterThan(0);
      expect(out.reperfusionHypotensionFraction).toBeGreaterThan(0);
      expect(out.reperfusionKPulse).toBeGreaterThan(0);
    });

    it('cold preservation solution worsens K+ spike', () => {
      const warm = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'hepatic',
        ischemicDurationMinutes: 60, reperfusionTimeSec: 60,
        coldPreservationSolution: false,
      });
      const cold = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'hepatic',
        ischemicDurationMinutes: 60, reperfusionTimeSec: 60,
        coldPreservationSolution: true, preservationKMEqL: 130,
      });
      expect(cold.reperfusionKPulse).toBeGreaterThan(warm.reperfusionKPulse);
    });

    it('longer ischemia duration causes more severe reperfusion syndrome', () => {
      const short = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'limb',
        ischemicDurationMinutes: 30, reperfusionTimeSec: 60,
      });
      const long = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'limb',
        ischemicDurationMinutes: 240, reperfusionTimeSec: 60,
      });
      expect(long.reperfusionSyndromeSeverity).toBeGreaterThan(short.reperfusionSyndromeSeverity);
    });

    it('reperfusion syndrome is time-limited (subsides after peak)', () => {
      const peak = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'hepatic',
        ischemicDurationMinutes: 90, reperfusionTimeSec: 90,
      });
      const late = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'hepatic',
        ischemicDurationMinutes: 90, reperfusionTimeSec: 1800, // 30 min later
      });
      expect(late.reperfusionSyndromeSeverity).toBeLessThan(peak.reperfusionSyndromeSeverity);
    });

    it('fires reperfusion event on first reperfusion tick', () => {
      const out = CarotidEndCerebralModel.tick({
        reperfusionActive: true, reperfusionType: 'hepatic',
        ischemicDurationMinutes: 90, reperfusionTimeSec: 30,
        prevReperfusionLogged: false,
      });
      expect(out.events.some(e => e.includes('REPERFUSION SYNDROME'))).toBe(true);
    });
  });
});
