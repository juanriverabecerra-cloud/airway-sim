import { describe, it, expect } from 'vitest';
import { AcidBaseModel } from '../engine/AcidBaseModel';

describe('AcidBaseModel — Stewart SID acid-base, corrected AG, citrate hypocalcemia', () => {
  it('produces a normal arterial pH and HCO3 at physiologic baseline conditions', () => {
    const out = AcidBaseModel.tick({ sodiumMeqL: 140, potassiumMeqL: 4, chlorideMeqL: 103, lactateMmolL: 1, paco2MmHg: 40, albuminGdL: 4 });
    expect(out.computedPh).toBeCloseTo(7.4, 1);
    expect(out.computedHco3).toBeCloseTo(24, 1);
    expect(out.sid).toBeCloseTo(36, 1); // Na(140) - Cl(103) - Lactate(1) = 36 mEq/L
    expect(out.baseExcess).toBeCloseTo(0, 1);
  });

  it('NS-driven hyperchloremia (Cl > 110) reduces SID and produces a non-anion-gap metabolic acidosis', () => {
    const ns = AcidBaseModel.tick({ sodiumMeqL: 140, potassiumMeqL: 4, chlorideMeqL: 118, lactateMmolL: 1, paco2MmHg: 40 });
    expect(ns.computedPh).toBeLessThan(7.35);
    expect(ns.anionGap).toBeLessThan(15);
    expect(ns.hyperchloremicAcidosisPresent).toBe(true);
  });

  it('LR/PlasmaLyte (lower Cl, positive buffer) maintains a more neutral SID than NS', () => {
    const ns = AcidBaseModel.tick({ sodiumMeqL: 140, chlorideMeqL: 118, paco2MmHg: 40 });
    const lr = AcidBaseModel.tick({ sodiumMeqL: 136, chlorideMeqL: 106, lactateMmolL: 0.5, bufferedBicarbEq: 20, paco2MmHg: 40 });
    expect(lr.computedPh).toBeGreaterThan(ns.computedPh);
    expect(lr.sid).toBeGreaterThan(ns.sid);
  });

  it('lactic acidosis reduces SID_effective and elevates the corrected anion gap', () => {
    const low = AcidBaseModel.tick({ lactateMmolL: 1, paco2MmHg: 40 });
    const high = AcidBaseModel.tick({ lactateMmolL: 8, paco2MmHg: 40 });
    expect(high.computedPh).toBeLessThan(low.computedPh);
    expect(high.anionGap).toBeGreaterThan(low.anionGap);
  });

  it('AKI-driven uremic anion accumulation produces elevated corrected AG with metabolic acidosis', () => {
    const normal = AcidBaseModel.tick({ akiDamage: 0, paco2MmHg: 40 });
    const aki = AcidBaseModel.tick({ akiDamage: 0.8, paco2MmHg: 40 });
    expect(aki.correctedAg).toBeGreaterThan(normal.correctedAg);
    expect(aki.computedPh).toBeLessThan(normal.computedPh);
  });

  it('hypoalbuminemia does not change raw AG (albumin is not in Na/Cl/HCO3) but corrected AG reveals hidden unmeasured anions', () => {
    const normalAlbumin = AcidBaseModel.tick({ albuminGdL: 4.0, akiDamage: 0.5, paco2MmHg: 40 });
    const lowAlbumin = AcidBaseModel.tick({ albuminGdL: 1.5, akiDamage: 0.5, paco2MmHg: 40 });
    // Raw AG is identical (albumin doesn't appear in Na-Cl-HCO3)
    expect(lowAlbumin.anionGap).toBeCloseTo(normalAlbumin.anionGap, 1);
    // Corrected AG is HIGHER for low albumin (adds the "missing" buffer contribution back)
    expect(lowAlbumin.correctedAg).toBeGreaterThan(normalAlbumin.correctedAg);
  });

  it('respiratory acidosis (high PaCO2) lowers pH even with normal metabolic state', () => {
    const normal = AcidBaseModel.tick({ paco2MmHg: 40 });
    const hypo = AcidBaseModel.tick({ paco2MmHg: 80 });
    expect(hypo.computedPh).toBeLessThan(normal.computedPh);
  });

  it('respiratory alkalosis (low PaCO2) raises pH -- e.g., pregnancy (baseline PaCO2 ~32)', () => {
    const normal = AcidBaseModel.tick({ paco2MmHg: 40 });
    const pregnancy = AcidBaseModel.tick({ paco2MmHg: 32 });
    expect(pregnancy.computedPh).toBeGreaterThan(normal.computedPh);
  });

  it('sepsis adds unmeasured organic anions, driving a high-AG metabolic acidosis', () => {
    const healthy = AcidBaseModel.tick({ isSeptic: false });
    const septic = AcidBaseModel.tick({ isSeptic: true });
    expect(septic.computedPh).toBeLessThan(healthy.computedPh);
    expect(septic.correctedAg).toBeGreaterThan(healthy.correctedAg);
    expect(septic.hyperchloremicAcidosisPresent).toBe(false);
  });

  it('ionized calcium below 1.0 mmol/L triggers a citrate hypocalcemia alert once', () => {
    const onset = AcidBaseModel.tick({ ionizedCalciumMmolL: 0.85, prevCitratHypocalcemiaLogged: false });
    expect(onset.hypocalcemiaFromCitrate).toBe(true);
    expect(onset.events.some(e => e.includes('Ionized hypocalcemia'))).toBe(true);
    const steady = AcidBaseModel.tick({ ionizedCalciumMmolL: 0.85, prevCitratHypocalcemiaLogged: true });
    expect(steady.events.some(e => e.includes('hypocalcemia'))).toBe(false);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => AcidBaseModel.tick(undefined as any)).not.toThrow();
    expect(() => AcidBaseModel.tick({ sodiumMeqL: NaN, chlorideMeqL: NaN, paco2MmHg: NaN } as any)).not.toThrow();
    const out = AcidBaseModel.tick({ sodiumMeqL: -50, chlorideMeqL: -50, paco2MmHg: -10 });
    expect(Number.isFinite(out.computedPh)).toBe(true);
    expect(Number.isFinite(out.computedHco3)).toBe(true);
    expect(out.computedPh).toBeGreaterThan(6);
  });
});
