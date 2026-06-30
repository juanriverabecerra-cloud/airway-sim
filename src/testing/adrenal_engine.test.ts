import { describe, it, expect } from 'vitest';
import { AdrenalEngine } from '../engine/AdrenalEngine';
import { PainEngine } from '../engine/PainEngine';
import { CardiovascularEngine } from '../engine/CardiovascularEngine';

describe('AdrenalEngine — adrenal medulla (catecholamine trigger) + cortex (cortisol/HPA axis)', () => {
  it('produces zero non-nociceptive sympathetic stimulus and baseline cortisol at normal vitals', () => {
    const out = AdrenalEngine.tick(1, { patient: {}, vitals: { glucose: 100, spo2: 98, map: 90 }, time: 0 }, {});
    expect(out.nonNociceptiveSympatheticStimulus).toBe(0);
    expect(out.cortisolLevel).toBeCloseTo(0.1, 5);
    expect(out.catecholamineSensitivityMultiplier).toBeCloseTo(1.0, 5);
  });

  it('hypoglycemia triggers a counter-regulatory sympathetic stimulus, scaling with severity', () => {
    const mild = AdrenalEngine.tick(1, { patient: {}, vitals: { glucose: 60, spo2: 98, map: 90 }, time: 0 }, {});
    const severe = AdrenalEngine.tick(1, { patient: {}, vitals: { glucose: 30, spo2: 98, map: 90 }, time: 0 }, {});
    expect(mild.nonNociceptiveSympatheticStimulus).toBeGreaterThan(0);
    expect(severe.nonNociceptiveSympatheticStimulus).toBeGreaterThan(mild.nonNociceptiveSympatheticStimulus);
  });

  it('hypoxia and hemorrhagic shock each independently trigger a sympathetic stimulus', () => {
    const hypoxia = AdrenalEngine.tick(1, { patient: {}, vitals: { glucose: 100, spo2: 75, map: 90 }, time: 0 }, {});
    const shock = AdrenalEngine.tick(1, { patient: {}, vitals: { glucose: 100, spo2: 98, map: 45 }, time: 0 }, { bloodLossRatio: 0.4 });
    expect(hypoxia.nonNociceptiveSympatheticStimulus).toBeGreaterThan(0);
    expect(shock.nonNociceptiveSympatheticStimulus).toBeGreaterThan(0);
  });

  it('combined triggers stack but stay capped at 100 (the nociception-equivalent scale ceiling)', () => {
    const out = AdrenalEngine.tick(1, { patient: {}, vitals: { glucose: 20, spo2: 70, map: 30 }, time: 0 }, { bloodLossRatio: 0.6 });
    expect(out.nonNociceptiveSympatheticStimulus).toBeLessThanOrEqual(100);
  });

  it('cortisol rises toward a stress-proportional target under sustained sympathetic stimulus', () => {
    let patient: any = {};
    let out: any;
    for (let i = 0; i < 600; i++) {
      out = AdrenalEngine.tick(1, { patient, vitals: { glucose: 30, spo2: 98, map: 90 }, time: i }, {});
      patient = { cortisolLevel: out.cortisolLevel };
    }
    expect(out.cortisolLevel).toBeGreaterThan(0.1);
  });

  it('etomidate suppresses cortisol synthesis toward near-zero over realistic kinetics, dropping catecholamine sensitivity', () => {
    let patient: any = { cortisolLevel: 0.3, adrenalSuppressionActive: true };
    let out: any;
    for (let i = 0; i < 600; i++) {
      out = AdrenalEngine.tick(1, { patient, vitals: { glucose: 100, spo2: 98, map: 90 }, time: i }, { etomidateCe: 0.2 });
      patient = { cortisolLevel: out.cortisolLevel, adrenalSuppressionActive: true };
    }
    expect(out.cortisolLevel).toBeLessThan(0.1);
    expect(out.catecholamineSensitivityMultiplier).toBeLessThan(1.0);
  });

  it('dexamethasone coverage prevents etomidate-driven cortisol collapse', () => {
    let patient: any = { cortisolLevel: 0.3, adrenalSuppressionActive: true };
    let out: any;
    for (let i = 0; i < 600; i++) {
      out = AdrenalEngine.tick(1, { patient, vitals: { glucose: 100, spo2: 98, map: 90 }, time: i }, { etomidateCe: 0.2, dexamethasoneCe: 0.5 });
      patient = { cortisolLevel: out.cortisolLevel, adrenalSuppressionActive: true };
    }
    expect(out.cortisolLevel).toBeGreaterThan(0.05);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => AdrenalEngine.tick(1, undefined as any, {})).not.toThrow();
    expect(() => AdrenalEngine.tick(NaN, { patient: {}, vitals: {}, time: 0 }, undefined as any)).not.toThrow();
    const out = AdrenalEngine.tick(1, { patient: { cortisolLevel: NaN }, vitals: { glucose: NaN, spo2: NaN, map: NaN }, time: 0 }, { bloodLossRatio: -5 });
    expect(Number.isFinite(out.cortisolLevel)).toBe(true);
    expect(Number.isFinite(out.nonNociceptiveSympatheticStimulus)).toBe(true);
    expect(Number.isFinite(out.catecholamineSensitivityMultiplier)).toBe(true);
  });
});

describe('AdrenalEngine integration — feeds PainEngine\'s catecholamine pool and CardiovascularEngine\'s sensitivity', () => {
  it('PainEngine.tick() accepts the non-nociceptive sympathetic stimulus and raises C_cat even with zero nociception', () => {
    const patient: any = { C_cat: 0 };
    const vitals: any = { hr: 70, sys: 120, dia: 80, map: 93, rr: 12, paco2: 40, bis: 98 };
    const withoutStimulus = PainEngine.tick(1, patient, vitals, [], 0, 0, 0);
    const withStimulus = PainEngine.tick(1, patient, vitals, [], 0, 0, 70);
    expect(withStimulus.C_cat).toBeGreaterThan(withoutStimulus.C_cat);
  });

  it('CardiovascularEngine.tick() blunts sympathetic spikes proportionally to a supplied catecholamineSensitivityMultiplier', () => {
    const patient: any = {
      isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false,
      myocardialStunning: 0, ebl: 0, ebv: 5000, height: 175, weight: 70, sex: 'male', age: 40, bmi: 22.9, position: 'Supine'
    };
    const vitals: any = { hr: 70, sys: 120, dia: 80, map: 93, co: 5.0, svr: 1200, cmap: 93, bis: 98, temp: 37, spo2: 99, paco2: 40, etco2: 40 };
    const baseDrugEffects: any = {
      drugSvrMod: 1.0, drugInotropyMod: 1.0, svrSympatheticSpike: 200, contractilitySympatheticSpike: 0.3, hrSympatheticSpike: 10,
      shiveringHRDrive: 0, anaphylaxisHrMod: 0, anaphylaxisSvrMod: 1.0, totalHrDelta: 0, ruleHrScale: 1.0, ruleHrOffset: 0,
      ruleMapScale: 1.0, ruleMapOffset: 0, ruleKOffset: 0, ruleSpo2Offset: 0
    };
    const inputs: any = {
      currentMac: 0, bloodLossRatio: 0, currentEbl: 0, positionPreloadMod: 0, positionHydrostaticMod: 0,
      shiveringMultiplier: 1.0, seizureMetabolicMultiplier: 1.0, cyanideVO2Mod: 1.0, VO2_sec: 0.004, currentBuffer: 0.5,
      currentFRC_L: 2.4, newTemp: 37, newPaCO2: 40, activeMeds: [], getAnatomicalParameter: (_k: string, d: number) => d
    };
    const fullSensitivity = CardiovascularEngine.tick(1, { patient, vitals, time: 1, electrolytes: { k: 4.0 } }, { ...baseDrugEffects, catecholamineSensitivityMultiplier: 1.0 }, inputs);
    const reducedSensitivity = CardiovascularEngine.tick(1, { patient, vitals, time: 1, electrolytes: { k: 4.0 } }, { ...baseDrugEffects, catecholamineSensitivityMultiplier: 0.4 }, inputs);
    expect(reducedSensitivity.vitals.map).toBeLessThan(fullSensitivity.vitals.map);
  });
});
