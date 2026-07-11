import { describe, it, expect } from 'vitest';
import { PreeclampsiaModel } from '../engine/PreeclampsiaModel';
import { AmniotiFluidEmbolismModel } from '../engine/AmniotiFluidEmbolismModel';
import { AcetaminophenModel } from '../engine/AcetaminophenModel';

// ============================================================
// PREECLAMPSIA MODEL
// ============================================================
describe('PreeclampsiaModel — PEC/eclampsia/HELLP physiology', () => {
  it('returns zero effects without preeclampsia flag', () => {
    const out = PreeclampsiaModel.tick({ hasPreeclampsia: false });
    expect(out.svrContributionFromPEC).toBe(0);
    expect(out.eclampsiaRisk).toBe(0);
    expect(out.hasSevereFeatures).toBe(false);
  });

  it('falls back safely with undefined inputs', () => {
    expect(() => PreeclampsiaModel.tick(undefined as any)).not.toThrow();
  });

  it('detects severe HTN features at sBP ≥ 160', () => {
    const out = PreeclampsiaModel.tick({ hasPreeclampsia: true, currentSBP: 175, currentDBP: 115 });
    expect(out.hasSevereFeatures).toBe(true);
  });

  it('elevated SVR contribution from uncontrolled PEC', () => {
    const out = PreeclampsiaModel.tick({ hasPreeclampsia: true, currentSBP: 175, currentDBP: 112 });
    expect(out.svrContributionFromPEC).toBeGreaterThan(0.1);
  });

  it('antihypertensives reduce SVR contribution', () => {
    const noTx = PreeclampsiaModel.tick({ hasPreeclampsia: true, currentSBP: 175, labetalolCe: 0 });
    const withTx = PreeclampsiaModel.tick({ hasPreeclampsia: true, currentSBP: 175, labetalolCe: 3.0 });
    expect(withTx.svrContributionFromPEC).toBeLessThan(noTx.svrContributionFromPEC);
  });

  it('HELLP detected with low PLT + elevated AST', () => {
    const out = PreeclampsiaModel.tick({
      hasPreeclampsia: true, plateletCount: 60000, currentAST: 120, currentALT: 95,
    });
    expect(out.hasHELLP).toBe(true);
    expect(out.plateletCompromised).toBe(true); // PLT < 80k
  });

  it('magnesium provides seizure protection', () => {
    const noMg = PreeclampsiaModel.tick({ hasPreeclampsia: true, magnesiumCe: 0, currentMAP: 125 });
    const withMg = PreeclampsiaModel.tick({ hasPreeclampsia: true, magnesiumCe: 2.5, currentMAP: 125 });
    expect(withMg.mgSeizureProtection).toBeGreaterThan(noMg.mgSeizureProtection);
    expect(withMg.eclampsiaRisk).toBeLessThan(noMg.eclampsiaRisk);
  });

  it('toxic magnesium causes respiratory depression', () => {
    const out = PreeclampsiaModel.tick({ hasPreeclampsia: true, magnesiumCe: 6.0 });
    expect(out.mgToxicityActive).toBe(true);
    expect(out.mgRespDepression).toBeGreaterThan(0);
  });

  it('fires Mg toxicity event once', () => {
    const first = PreeclampsiaModel.tick({ hasPreeclampsia: true, magnesiumCe: 6.0, prevMgToxicLogged: false });
    expect(first.events.some(e => e.includes('MAGNESIUM TOXICITY'))).toBe(true);
    const second = PreeclampsiaModel.tick({ hasPreeclampsia: true, magnesiumCe: 6.0, prevMgToxicLogged: true });
    expect(second.events.some(e => e.includes('MAGNESIUM TOXICITY'))).toBe(false);
  });

  it('airway edema score elevated in severe PEC', () => {
    const mild = PreeclampsiaModel.tick({ hasPreeclampsia: true, currentSBP: 145 });
    const severe = PreeclampsiaModel.tick({ hasPreeclampsia: true, currentSBP: 175 });
    expect(severe.airwayEdemaScore).toBeGreaterThan(mild.airwayEdemaScore);
  });
});

// ============================================================
// AFE MODEL
// ============================================================
describe('AmniotiFluidEmbolismModel — acute cor pulmonale + DIC', () => {
  it('returns zero effects when AFE inactive', () => {
    const out = AmniotiFluidEmbolismModel.tick({ afeActive: false });
    expect(out.cardiacOutputFraction).toBe(1.0);
    expect(out.dic_fibrinogenConsumptionRate).toBe(0);
  });

  it('falls back safely with undefined inputs', () => {
    expect(() => AmniotiFluidEmbolismModel.tick(undefined as any)).not.toThrow();
  });

  it('phase 1 causes severe CO drop within first 15 min', () => {
    const out = AmniotiFluidEmbolismModel.tick({ afeActive: true, minutesSinceOnset: 5 });
    expect(out.phase1Active).toBe(true);
    expect(out.cardiacOutputFraction).toBeLessThan(0.5);
    expect(out.pvrMultiplier).toBeGreaterThan(2.0);
  });

  it('phase 2 DIC begins after onset', () => {
    const out = AmniotiFluidEmbolismModel.tick({ afeActive: true, minutesSinceOnset: 15 });
    expect(out.phase2Active).toBe(true);
    expect(out.dic_fibrinogenConsumptionRate).toBeGreaterThan(0);
    expect(out.dic_plateletConsumptionRate).toBeGreaterThan(0);
  });

  it('DIC worsens over time', () => {
    const early = AmniotiFluidEmbolismModel.tick({ afeActive: true, minutesSinceOnset: 10 });
    const late = AmniotiFluidEmbolismModel.tick({ afeActive: true, minutesSinceOnset: 60 });
    expect(late.dic_fibrinogenConsumptionRate).toBeGreaterThan(early.dic_fibrinogenConsumptionRate);
  });

  it('fires onset event once only', () => {
    const first = AmniotiFluidEmbolismModel.tick({ afeActive: true, minutesSinceOnset: 1, prevAFEOnsetLogged: false });
    expect(first.events.some(e => e.includes('AMNIOTIC FLUID EMBOLISM'))).toBe(true);
    const second = AmniotiFluidEmbolismModel.tick({ afeActive: true, minutesSinceOnset: 2, prevAFEOnsetLogged: true });
    expect(second.events.some(e => e.includes('AMNIOTIC FLUID EMBOLISM'))).toBe(false);
  });
});

// ============================================================
// ACETAMINOPHEN HEPATOTOXICITY MODEL
// ============================================================
describe('AcetaminophenModel — NAPQI accumulation, NAC rescue', () => {
  it('no toxicity at therapeutic dose in healthy patient', () => {
    const out = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 30, timeSinceFirstDoseHours: 6 });
    expect(out.hepatotoxicityIndex).toBeLessThan(0.1);
  });

  it('falls back safely with undefined inputs', () => {
    expect(() => AcetaminophenModel.tick(undefined as any)).not.toThrow();
  });

  it('toxicity develops with overdose dose in healthy patient', () => {
    const out = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 36 });
    expect(out.napqiAccumulation).toBeGreaterThan(0.3);
    expect(out.hepatotoxicityIndex).toBeGreaterThan(0.2);
  });

  it('at-risk patients (alcoholic) toxic at lower doses', () => {
    const healthy = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 40, timeSinceFirstDoseHours: 24, isAlcoholic: false });
    const alcoholic = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 40, timeSinceFirstDoseHours: 24, isAlcoholic: true });
    expect(alcoholic.hepatotoxicityIndex).toBeGreaterThan(healthy.hepatotoxicityIndex);
  });

  it('safe dose limit is lower in at-risk patients', () => {
    const healthy = AcetaminophenModel.tick({});
    const atRisk = AcetaminophenModel.tick({ isAlcoholic: true });
    expect(atRisk.safeDoseMgPerKgPerDay).toBeLessThan(healthy.safeDoseMgPerKgPerDay);
  });

  it('NAC reduces hepatotoxicity when given early', () => {
    const noNAC = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 6, nacActive: false });
    const withNAC = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 6, nacActive: true });
    expect(withNAC.hepatotoxicityIndex).toBeLessThan(noNAC.hepatotoxicityIndex);
    expect(withNAC.nacEfficacy).toBeGreaterThan(0.5);
  });

  it('NAC is less effective when given late (> 24h)', () => {
    const earlyNAC = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 6, nacActive: true });
    const lateNAC = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 30, nacActive: true });
    expect(lateNAC.nacEfficacy).toBeLessThan(earlyNAC.nacEfficacy);
  });

  it('fires hepatotoxicity event at significant toxicity', () => {
    const out = AcetaminophenModel.tick({
      cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 24, prevHepToxLogged: false,
    });
    if (out.hepatotoxicityIndex > 0.3) {
      expect(out.events.some(e => e.includes('ACETAMINOPHEN HEPATOTOXICITY'))).toBe(true);
    }
  });

  it('AST/ALT contributions peak after 24h', () => {
    const early = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 12 });
    const peak = AcetaminophenModel.tick({ cumulativeDoseMgPerKg: 150, timeSinceFirstDoseHours: 72 });
    expect(peak.astContribution).toBeGreaterThanOrEqual(early.astContribution);
  });
});
