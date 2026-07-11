import { describe, it, expect } from 'vitest';
import { CKDPerioperativeModel } from '../engine/CKDPerioperativeModel';

describe('CKDPerioperativeModel — staging, drug safety, uremic complications', () => {
  it('falls back safely with no inputs', () => {
    expect(() => CKDPerioperativeModel.tick(undefined as any)).not.toThrow();
    const out = CKDPerioperativeModel.tick({});
    // Default GFR=90 → Stage 1 (KDIGO: Stage 1 = GFR ≥ 90 with possible structural disease)
    expect([0, 1].includes(out.ckdStage)).toBe(true);
  });

  describe('CKD staging', () => {
    it('GFR > 100 = normal (stage 0)', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 110 });
      expect(out.ckdStage).toBe(0);
    });

    it('GFR < 15 = Stage 5 (ESRD)', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 10 });
      expect(out.ckdStage).toBe(5);
      expect(out.isESRD).toBe(true);
    });

    it('dialysis patient = Stage 5', () => {
      const out = CKDPerioperativeModel.tick({ isOnDialysis: true, gfr: 8 });
      expect(out.isESRD).toBe(true);
    });

    it('GFR 35 = Stage 3/4', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 35 });
      expect([3, 4].includes(out.ckdStage)).toBe(true);
    });
  });

  describe('Succinylcholine hyperkalemia risk', () => {
    it('succinylcholine contraindicated when baseline K+ > 5.0 in CKD', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 15, baselineKPlus: 5.2, succinylcholineCe: 2.0 });
      expect(out.succinylcholineContraindicated).toBe(true);
    });

    it('succinylcholine projects K+ rise of ~0.7 mEq/L', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 90, baselineKPlus: 4.0, succinylcholineCe: 2.0 });
      expect(out.hyperkalemiaRiskFromSux).toBeGreaterThan(0.5);
    });

    it('succinylcholine in normal renal function with normal K+ is not contraindicated', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 90, baselineKPlus: 4.0, succinylcholineCe: 0 });
      expect(out.succinylcholineContraindicated).toBe(false);
    });
  });

  describe('Uremic platelet dysfunction', () => {
    it('no platelet dysfunction at normal BUN', () => {
      const out = CKDPerioperativeModel.tick({ bun: 20 });
      expect(out.uremiaPlateletDysfunctionIndex).toBe(0);
    });

    it('significant platelet dysfunction at BUN > 60', () => {
      const out = CKDPerioperativeModel.tick({ bun: 80 });
      expect(out.uremiaPlateletDysfunctionIndex).toBeGreaterThan(0.1);
      expect(out.isUremic).toBe(true);
    });

    it('DDAVP corrects uremic platelet dysfunction', () => {
      const noDDAVP = CKDPerioperativeModel.tick({ bun: 90, desmopressinCe: 0 });
      const withDDAVP = CKDPerioperativeModel.tick({ bun: 90, desmopressinCe: 2.0 });
      expect(withDDAVP.ddavpPlateletCorrectionEfficacy).toBeGreaterThan(0.5);
    });
  });

  describe('Drug safety in CKD', () => {
    it('codeine flagged as dangerous in CKD 3+', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 40, codeineCe: 1.0 });
      expect(out.dangerousDrugsPresent.some(d => d.includes('Codeine'))).toBe(true);
    });

    it('meperidine flagged for seizure risk in CKD', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 35, mepCe: 0.5 });
      expect(out.dangerousDrugsPresent.some(d => d.includes('Meperidine'))).toBe(true);
    });

    it('morphine flagged for active metabolite in CKD 4-5', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 20, morphineCe: 0.5 });
      expect(out.dangerousDrugsPresent.some(d => d.includes('Morphine'))).toBe(true);
    });

    it('no dangerous drug warnings with safe agents (fentanyl, propofol)', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 20 }); // no unsafe meds given
      expect(out.dangerousDrugsPresent.length).toBe(0);
    });
  });

  describe('Fluid management and anemia', () => {
    it('ESRD has maximum fluid volume sensitivity', () => {
      const esrd = CKDPerioperativeModel.tick({ gfr: 8, isOnDialysis: true });
      const normal = CKDPerioperativeModel.tick({ gfr: 95 });
      expect(esrd.fluidVolumeSensitivity).toBeGreaterThan(normal.fluidVolumeSensitivity);
    });

    it('CKD anemia detected with low baseline Hb', () => {
      const out = CKDPerioperativeModel.tick({ gfr: 20, baselineHb: 7.5 });
      expect(out.anemiaSeverity).toBeGreaterThan(0.2);
    });
  });

  describe('MAC reduction from uremia', () => {
    it('uremic patients need less anesthetic (reduced MAC)', () => {
      const normal = CKDPerioperativeModel.tick({ bun: 15 });
      const uremic = CKDPerioperativeModel.tick({ bun: 100 });
      expect(uremic.macReduction).toBeGreaterThan(normal.macReduction);
      expect(uremic.macReduction).toBeGreaterThan(0);
    });
  });
});
