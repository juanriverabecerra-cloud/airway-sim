import { describe, it, expect } from 'vitest';
import { PostopPainManagementModel } from '../engine/PostopPainManagementModel';

describe('PostopPainManagementModel — multimodal analgesia, ERAS, CPSP', () => {
  it('falls back safely with no inputs', () => {
    expect(() => PostopPainManagementModel.tick(undefined as any)).not.toThrow();
    const out = PostopPainManagementModel.tick({});
    expect(out.analgesiaAdequate).toBe(false); // no analgesia = high pain
  });

  describe('Multimodal analgesia pillars', () => {
    it('acetaminophen alone provides ~30% pain reduction', () => {
      const out = PostopPainManagementModel.tick({ currentPainNRS: 8, acetaminophenCe: 2.0 });
      expect(out.acetaminophenContrib).toBeGreaterThanOrEqual(0.15);
    });

    it('regional block alone achieves adequate analgesia for its territory', () => {
      const out = PostopPainManagementModel.tick({
        currentPainNRS: 7, regionalBlockActive: true, regionalBlockCoverage: 0.9,
      });
      expect(out.regionalContrib).toBeGreaterThan(0.5);
      expect(out.analgesiaAdequate).toBe(true);
    });

    it('full multimodal protocol achieves excellent analgesia without opioids', () => {
      const out = PostopPainManagementModel.tick({
        currentPainNRS: 7,
        acetaminophenCe: 2.0,
        ketorolacCe: 1.5,
        ketamineCe: 0.5,
        regionalBlockActive: true, regionalBlockCoverage: 0.7,
      });
      expect(out.analgesiaAdequate).toBe(true);
      expect(out.totalOpioidSparingFraction).toBeGreaterThan(0.5);
    });

    it('ketamine reduces central sensitization (NMDA antagonism)', () => {
      const noKet = PostopPainManagementModel.tick({ currentPainNRS: 8, acetaminophenCe: 2.0, ketamineCe: 0 });
      const withKet = PostopPainManagementModel.tick({ currentPainNRS: 8, acetaminophenCe: 2.0, ketamineCe: 0.5 });
      expect(withKet.effectivePainNRS).toBeLessThan(noKet.effectivePainNRS);
    });
  });

  describe('Opioid sparing', () => {
    it('multimodal reduces opioid requirements', () => {
      const opioidsOnly = PostopPainManagementModel.tick({ currentPainNRS: 8, opioidCe: 2.0 });
      const multimodal = PostopPainManagementModel.tick({
        currentPainNRS: 8, acetaminophenCe: 2.0, ketorolacCe: 1.5, opioidCe: 2.0,
      });
      expect(multimodal.totalOpioidSparingFraction).toBeGreaterThan(0.3);
    });
  });

  describe('CPSP risk', () => {
    it('thoracic surgery has higher CPSP risk', () => {
      const minor = PostopPainManagementModel.tick({ currentPainNRS: 5, surgeryType: 'minor' });
      const thoracic = PostopPainManagementModel.tick({ currentPainNRS: 5, surgeryType: 'thoracic' });
      expect(thoracic.cpspRisk).toBeGreaterThan(minor.cpspRisk);
    });

    it('regional anesthesia reduces CPSP risk', () => {
      const noRegional = PostopPainManagementModel.tick({ currentPainNRS: 7, surgeryType: 'major_abdominal' });
      const withRegional = PostopPainManagementModel.tick({
        currentPainNRS: 7, surgeryType: 'major_abdominal', regionalBlockActive: true,
      });
      expect(withRegional.cpspRisk).toBeLessThan(noRegional.cpspRisk);
    });
  });

  describe('GOSRD risk', () => {
    it('gabapentinoid + opioid combination increases respiratory depression risk', () => {
      const noGaba = PostopPainManagementModel.tick({ opioidCe: 2.0, gabapentinCe: 0 });
      const withGaba = PostopPainManagementModel.tick({ opioidCe: 2.0, gabapentinCe: 2.0 });
      expect(withGaba.gosrdRisk).toBeGreaterThan(noGaba.gosrdRisk);
    });
  });

  describe('ERAS score', () => {
    it('more ERAS elements = higher ERAS score', () => {
      const minimal = PostopPainManagementModel.tick({ acetaminophenCe: 2.0 });
      const full = PostopPainManagementModel.tick({
        acetaminophenCe: 2.0, ketorolacCe: 1.5, regionalBlockActive: true,
        earlyMobilization: true, earlyOralIntake: true, normalThermia: true, dexamethasoneCe: 2.0,
      });
      expect(full.erasScore).toBeGreaterThan(minimal.erasScore);
    });
  });
});
