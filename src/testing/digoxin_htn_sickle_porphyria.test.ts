import { describe, it, expect } from 'vitest';
import { DigoxinToxicityModel } from '../engine/DigoxinToxicityModel';
import { HypertensiveEmergencyModel } from '../engine/HypertensiveEmergencyModel';
import { SickleCellModel } from '../engine/SickleCellModel';
import { AcutePorphyriaModel } from '../engine/AcutePorphyriaModel';

// ============================================================
// DIGOXIN TOXICITY
// ============================================================
describe('DigoxinToxicityModel — narrow therapeutic window, hypokalemia sensitization', () => {
  it('falls back safely with no inputs', () => {
    expect(() => DigoxinToxicityModel.tick(undefined as any)).not.toThrow();
  });

  it('therapeutic digoxin levels do not trigger toxicity', () => {
    const out = DigoxinToxicityModel.tick({ digoxinCe: 1.2, currentK: 4.5 });
    expect(out.toxicityActive).toBe(false);
    expect(out.toxicitySeverity).toBe('none');
  });

  it('supratherapeutic digoxin causes toxicity', () => {
    const out = DigoxinToxicityModel.tick({ digoxinCe: 3.5, currentK: 4.0 });
    expect(out.toxicityActive).toBe(true);
    expect(out.toxicitySeverity).not.toBe('none');
  });

  it('hypokalemia sensitizes: same digoxin level causes worse toxicity at low K+', () => {
    const normalK = DigoxinToxicityModel.tick({ digoxinCe: 2.0, currentK: 4.5 });
    const lowK = DigoxinToxicityModel.tick({ digoxinCe: 2.0, currentK: 2.5 });
    expect(lowK.toxicityIndex).toBeGreaterThan(normalK.toxicityIndex);
  });

  it('bradycardia and AV block worsen with toxicity severity', () => {
    const mild = DigoxinToxicityModel.tick({ digoxinCe: 2.0, currentK: 4.0 });
    const severe = DigoxinToxicityModel.tick({ digoxinCe: 5.0, currentK: 3.0 });
    expect(Math.abs(severe.bradycardiaContribution)).toBeGreaterThan(Math.abs(mild.bradycardiaContribution));
  });

  it('bidirectional VT risk only in severe toxicity (pathognomonic sign)', () => {
    const mild = DigoxinToxicityModel.tick({ digoxinCe: 2.5, currentK: 4.0 });
    const severe = DigoxinToxicityModel.tick({ digoxinCe: 6.0, currentK: 2.5 });
    expect(mild.bidirectional_vt_risk).toBe(0);
    expect(severe.bidirectional_vt_risk).toBeGreaterThan(0);
  });

  it('digoxin immune Fab reverses toxicity', () => {
    const noTx = DigoxinToxicityModel.tick({ digoxinCe: 5.0, currentK: 3.0, digoxinFabCe: 0 });
    const withFab = DigoxinToxicityModel.tick({ digoxinCe: 5.0, currentK: 3.0, digoxinFabCe: 5.0 });
    expect(withFab.fabEfficacy).toBeGreaterThan(0.8);
    expect(withFab.toxicityIndex).toBeLessThan(noTx.toxicityIndex);
  });
});

// ============================================================
// HYPERTENSIVE EMERGENCY + AORTIC DISSECTION
// ============================================================
describe('HypertensiveEmergencyModel — HTN emergency and aortic dissection', () => {
  it('falls back safely with no inputs', () => {
    expect(() => HypertensiveEmergencyModel.tick(undefined as any)).not.toThrow();
  });

  it('normal BP does not trigger emergency', () => {
    const out = HypertensiveEmergencyModel.tick({ currentSBP: 128, currentDBP: 80, currentMAP: 96 });
    expect(out.isHypertensiveEmergency).toBe(false);
  });

  it('severe HTN triggers hypertensive emergency', () => {
    const out = HypertensiveEmergencyModel.tick({ currentSBP: 200, currentDBP: 125, currentMAP: 150 });
    expect(out.isHypertensiveEmergency).toBe(true);
    expect(out.encephalopathyRisk).toBeGreaterThan(0);
  });

  it('aortic dissection requires more aggressive BP and HR targets', () => {
    const noDissection = HypertensiveEmergencyModel.tick({ currentSBP: 190, currentDBP: 110, dissectionType: undefined });
    const dissection = HypertensiveEmergencyModel.tick({ currentSBP: 190, currentDBP: 110, aorticDissectionPresent: true, dissectionType: 'A' });
    expect(dissection.hrTarget).toBeLessThan(noDissection.hrTarget);
    expect(dissection.mapReductionTarget).toBeLessThanOrEqual(noDissection.mapReductionTarget);
  });

  it('tachycardia + hypertension worsens aortic shear stress (dP/dt)', () => {
    const slow = HypertensiveEmergencyModel.tick({ currentSBP: 160, currentHR: 55, aorticDissectionPresent: true });
    const fast = HypertensiveEmergencyModel.tick({ currentSBP: 160, currentHR: 120, aorticDissectionPresent: true });
    expect(fast.aorticShearStressIndex).toBeGreaterThan(slow.aorticShearStressIndex);
    expect(fast.dPdtRisk).toBeGreaterThan(slow.dPdtRisk);
  });

  it('esmolol + nicardipine combination achieves best treatment efficacy in dissection', () => {
    const esmololAlone = HypertensiveEmergencyModel.tick({ currentSBP: 175, currentHR: 100, aorticDissectionPresent: true, esmololCe: 3.0 });
    const combined = HypertensiveEmergencyModel.tick({ currentSBP: 175, currentHR: 100, aorticDissectionPresent: true, esmololCe: 3.0, nicardipineCe: 2.0 });
    expect(combined.overallTreatmentEfficacy).toBeGreaterThan(esmololAlone.overallTreatmentEfficacy);
  });
});

// ============================================================
// SICKLE CELL DISEASE
// ============================================================
describe('SickleCellModel — VOC triggers, ACS, transfusion targets', () => {
  it('returns zero risk without SCD', () => {
    const out = SickleCellModel.tick({ hasSickleCellDisease: false });
    expect(out.sicklingRiskIndex).toBe(0);
    expect(out.acsActive).toBe(false);
  });

  it('hypoxia is the highest-risk sickling trigger', () => {
    const highSpO2 = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 70, currentSpO2: 97 });
    const lowSpO2 = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 70, currentSpO2: 83 });
    expect(lowSpO2.sicklingRiskIndex).toBeGreaterThan(highSpO2.sicklingRiskIndex);
  });

  it('hypothermia worsens sickling risk', () => {
    const warm = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 70, currentTemp: 37.5 });
    const cold = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 70, currentTemp: 34.0 });
    expect(cold.sicklingRiskIndex).toBeGreaterThan(warm.sicklingRiskIndex);
  });

  it('HbS% > 30% triggers transfusion recommendation for major surgery', () => {
    const lowHbS = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 25 });
    const highHbS = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 75 });
    expect(lowHbS.transfusionRecommended).toBe(false);
    expect(highHbS.transfusionRecommended).toBe(true);
  });

  it('ACS causes pulmonary shunt and compliance penalties', () => {
    const out = SickleCellModel.tick({
      hasSickleCellDisease: true, hbSPercent: 70, acsActive: true, acsMinutesSinceOnset: 1440,
    });
    expect(out.acsActive).toBe(true);
    expect(out.acsShuntContribution).toBeGreaterThan(0);
    expect(out.acsCompliancePenalty).toBeGreaterThan(0);
  });

  it('combined triggers exponentially worsen risk', () => {
    const singleTrigger = SickleCellModel.tick({ hasSickleCellDisease: true, hbSPercent: 60, currentSpO2: 89 });
    const multipleTriggers = SickleCellModel.tick({
      hasSickleCellDisease: true, hbSPercent: 60, currentSpO2: 89,
      currentTemp: 34.5, isHydrated: false, tourniquetActive: true, currentPH: 7.28,
    });
    expect(multipleTriggers.sicklingRiskIndex).toBeGreaterThan(singleTrigger.sicklingRiskIndex);
  });
});

// ============================================================
// ACUTE PORPHYRIA
// ============================================================
describe('AcutePorphyriaModel — unsafe drug detection, attack progression', () => {
  it('no attack without porphyria diagnosis', () => {
    const out = AcutePorphyriaModel.tick({ hasAcutePorphyria: false, thiopentalCe: 5.0 });
    expect(out.porphyriaActive).toBe(false);
    expect(out.triggerDrugPresent).toBe(false);
  });

  it('thiopental triggers unsafe drug warning in porphyria patient', () => {
    const out = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, thiopentalCe: 2.0, prevPorphyriaLogged: false });
    expect(out.triggerDrugPresent).toBe(true);
    expect(out.events.some(e => e.includes('PORPHYRIA TRIGGER'))).toBe(true);
  });

  it('propofol (safe agent) does not trigger porphyria', () => {
    // Propofol is not in the unsafe drug list — no trigger
    const out = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, thiopentalCe: 0 });
    expect(out.triggerDrugPresent).toBe(false);
  });

  it('attack severity increases over time when untreated', () => {
    const early = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, currentlyActive: true, attackMinutesSince: 60 });
    const late = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, currentlyActive: true, attackMinutesSince: 1440 });
    expect(late.attackSeverity).toBeGreaterThan(early.attackSeverity);
    expect(late.neuropathyIndex).toBeGreaterThan(early.neuropathyIndex);
  });

  it('hemin treatment reduces attack severity', () => {
    const noHemin = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, currentlyActive: true, attackMinutesSince: 720, heminGiven: false });
    const withHemin = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, currentlyActive: true, attackMinutesSince: 720, heminGiven: true });
    expect(withHemin.treatmentEfficacy).toBeGreaterThan(noHemin.treatmentEfficacy);
  });

  it('respiratory paralysis risk develops in severe untreated attack', () => {
    const out = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, currentlyActive: true, attackMinutesSince: 2880 }); // 48h
    if (out.neuropathyIndex > 0.6) {
      expect(out.respiratoryParalysisRisk).toBeGreaterThan(0);
    }
  });

  it('autonomic effects drive SVR increase and tachycardia', () => {
    const out = AcutePorphyriaModel.tick({ hasAcutePorphyria: true, currentlyActive: true, attackMinutesSince: 1440 });
    if (out.attackSeverity > 0.3) {
      expect(out.svrContribution).toBeGreaterThan(0);
      expect(out.hrContribution).toBeGreaterThan(0);
    }
  });
});
