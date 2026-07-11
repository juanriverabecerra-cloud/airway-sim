import { describe, it, expect } from 'vitest';
import { SexHormoneModel } from '../engine/SexHormoneModel';

describe('SexHormoneModel — progesterone, estrogen, testosterone perioperative effects', () => {
  it('male patients have zero MAC reduction and zero procoagulant boost without hormone therapy', () => {
    const male = SexHormoneModel.tick({ sex: 'male', age: 40 });
    expect(male.macReductionFromProgesterone).toBe(0);
    expect(male.baselineHgbAdjustmentGdL).toBeGreaterThan(0); // males have higher Hgb
    expect(male.ponvRiskFromHormones).toBe(0);
  });

  it('luteal-phase female (day 21) has maximal MAC reduction vs follicular-phase (day 7)', () => {
    const follicular = SexHormoneModel.tick({ sex: 'female', age: 30, menstrualCycleDay: 7 });
    const luteal = SexHormoneModel.tick({ sex: 'female', age: 30, menstrualCycleDay: 21 });
    expect(luteal.macReductionFromProgesterone).toBeGreaterThan(follicular.macReductionFromProgesterone);
    // Peak luteal MAC reduction is ~12% (published 5-15% for non-pregnant; pregnancy itself is separate)
    expect(luteal.macReductionFromProgesterone).toBeGreaterThan(0.05);
    expect(luteal.macReductionFromProgesterone).toBeLessThanOrEqual(0.15);
  });

  it('chronic progestin therapy mimics mid-luteal progesterone levels in MAC reduction', () => {
    const noTherapy = SexHormoneModel.tick({ sex: 'female', age: 40, menstrualCycleDay: 7 });
    const therapy = SexHormoneModel.tick({ sex: 'female', age: 40, chronicProgestinTherapy: true });
    expect(therapy.macReductionFromProgesterone).toBeGreaterThan(noTherapy.macReductionFromProgesterone);
  });

  it('postmenopausal females without HRT have minimal progesterone and estrogen effects', () => {
    const postmeno = SexHormoneModel.tick({ sex: 'female', age: 60, isPostmenopausal: true });
    expect(postmeno.macReductionFromProgesterone).toBe(0);
    expect(postmeno.estrogenCoagulantBoost).toBeLessThan(0.01);
  });

  it('estrogen therapy raises coagulation factor activity (OCP/HRT procoagulant effect)', () => {
    const noHRT = SexHormoneModel.tick({ sex: 'female', age: 55, isPostmenopausal: true });
    const withHRT = SexHormoneModel.tick({ sex: 'female', age: 55, isPostmenopausal: true, estrogenTherapy: true });
    expect(withHRT.estrogenCoagulantBoost).toBeGreaterThan(noHRT.estrogenCoagulantBoost);
  });

  it('female sex produces higher PONV risk contribution, lower in postmenopausal state', () => {
    const youngFemale = SexHormoneModel.tick({ sex: 'female', age: 28 });
    const postmeno = SexHormoneModel.tick({ sex: 'female', age: 60, isPostmenopausal: true });
    const male = SexHormoneModel.tick({ sex: 'male', age: 35 });
    expect(youngFemale.ponvRiskFromHormones).toBeGreaterThan(postmeno.ponvRiskFromHormones);
    expect(postmeno.ponvRiskFromHormones).toBeGreaterThan(male.ponvRiskFromHormones);
  });

  it('pregnant state returns neutral hormonal outputs (handled by PregnancyPhysiologyEngine)', () => {
    const pregnant = SexHormoneModel.tick({ sex: 'female', age: 28, isPregnant: true, menstrualCycleDay: 21 });
    expect(pregnant.macReductionFromProgesterone).toBe(0); // PregnancyPhysiologyEngine handles this
    expect(pregnant.estrogenCoagulantBoost).toBe(0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => SexHormoneModel.tick(undefined as any)).not.toThrow();
    expect(() => SexHormoneModel.tick({ age: NaN, menstrualCycleDay: NaN } as any)).not.toThrow();
    const out = SexHormoneModel.tick({ sex: 'invalid' as any, age: -10 });
    expect(Number.isFinite(out.macReductionFromProgesterone)).toBe(true);
    expect(out.macReductionFromProgesterone).toBeGreaterThanOrEqual(0);
  });
});
