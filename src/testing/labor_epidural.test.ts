import { describe, it, expect } from 'vitest';
import { LaborEpiduralModel } from '../engine/LaborEpiduralModel';

describe('LaborEpiduralModel — differential block, motor-sparing, complications', () => {
  it('falls back safely with no inputs', () => {
    expect(() => LaborEpiduralModel.tick(undefined as any)).not.toThrow();
    const out = LaborEpiduralModel.tick({});
    expect(out.analgesiaAdequate).toBe(false);
  });

  it('no block when epidural inactive', () => {
    const out = LaborEpiduralModel.tick({ laborEpiduralActive: false });
    expect(out.motorBlockIndex).toBe(0);
    expect(out.cFiberBlockFraction).toBe(0);
  });

  describe('Differential block physics', () => {
    it('low-concentration labor epidural blocks pain fibers but not motor', () => {
      const labor = LaborEpiduralModel.tick({
        laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.0625,
        fentanylConcentrationMcgMl: 2,
      });
      expect(labor.cFiberBlockFraction).toBeGreaterThan(0.6); // pain blocked (dilute bupi = partial)
      expect(labor.motorFiberBlockFraction).toBeLessThan(0.2); // motor preserved
      expect(labor.ambulation_possible).toBe(true);
    });

    it('surgical concentration blocks both pain AND motor fibers', () => {
      const surgical = LaborEpiduralModel.tick({
        laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.5,
      });
      expect(surgical.cFiberBlockFraction).toBeGreaterThan(0.9);
      expect(surgical.motorFiberBlockFraction).toBeGreaterThan(0.5);
      expect(surgical.ambulation_possible).toBe(false);
    });

    it('labor concentration preserves pushing ability (motor block < 0.4)', () => {
      const out = LaborEpiduralModel.tick({
        laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.1,
      });
      expect(out.motorBlockPreservesAbilityToPush).toBe(true);
    });

    it('motor block increases with bupivacaine concentration', () => {
      const low = LaborEpiduralModel.tick({ laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.0625 });
      const high = LaborEpiduralModel.tick({ laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.5 });
      expect(high.motorFiberBlockFraction).toBeGreaterThan(low.motorFiberBlockFraction);
    });
  });

  describe('CSE walking epidural', () => {
    it('CSE provides immediate analgesia from intrathecal component', () => {
      const regularEpi = LaborEpiduralModel.tick({ laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.0625 });
      const cse = LaborEpiduralModel.tick({
        laborEpiduralActive: true, bupivacaineConcentrationPercent: 0.0625,
        isCSE: true, intrathecalBupivacaineMg: 4.0, // 4mg intrathecal → csePainRelief > 0.5
        fentanylConcentrationMcgMl: 2,
      });
      expect(cse.analgesiaAdequate).toBe(true);
    });
  });

  describe('Complications', () => {
    it('intravascular test dose detected by HR increase > 20 bpm', () => {
      const out = LaborEpiduralModel.tick({
        laborEpiduralActive: true, epiTestDoseHRChange: 28, prevHighBlockLogged: false,
      });
      expect(out.highBlockRisk).toBeGreaterThan(0.5);
      expect(out.events.some(e => e.includes('HIGH/TOTAL SPINAL RISK'))).toBe(true);
    });

    it('maternal hypotension triggers vasopressor event', () => {
      const out = LaborEpiduralModel.tick({
        laborEpiduralActive: true, currentMAP: 58, hasHypotension: true,
        prevHypotensionLogged: false,
      });
      expect(out.hypotensionRisk).toBeGreaterThan(0);
      expect(out.events.some(e => e.includes('EPIDURAL HYPOTENSION'))).toBe(true);
    });

    it('fetal bradycardia in context of maternal hypotension', () => {
      const out = LaborEpiduralModel.tick({
        laborEpiduralActive: true, fetalHR: 88, hasHypotension: true, currentMAP: 55,
        prevFetalBradyLogged: false,
      });
      expect(out.events.some(e => e.includes('FETAL BRADYCARDIA'))).toBe(true);
    });
  });
});
