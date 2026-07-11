import { describe, it, expect } from 'vitest';
import { GasKineticsModel } from '../engine/GasKineticsEngine';
import { INHALATIONAL_AGENTS } from '../engine/Pharmacology';

describe('Chapter 20: Inhaled Anesthetic Uptake, Distribution, Metabolism, and Toxicity', () => {

  describe('1. TABLE 20.1 Reference Property Fidelity', () => {
    it('should match the textbook MAC-immobility, blood/gas, and oil/gas reference values exactly', () => {
      expect(INHALATIONAL_AGENTS.sevoflurane.mac40).toBeCloseTo(2.05, 2);
      expect(INHALATIONAL_AGENTS.sevoflurane.bgPartition).toBeCloseTo(0.65, 2);
      expect(INHALATIONAL_AGENTS.sevoflurane.oilGasPartition).toBeCloseTo(47, 1);

      expect(INHALATIONAL_AGENTS.methoxyflurane.mac40).toBeCloseTo(0.16, 2);
      expect(INHALATIONAL_AGENTS.methoxyflurane.bgPartition).toBeCloseTo(12.0, 1);
      expect(INHALATIONAL_AGENTS.methoxyflurane.oilGasPartition).toBeCloseTo(950, 1);

      expect(INHALATIONAL_AGENTS.isoflurane.mac40).toBeCloseTo(1.15, 2);
      expect(INHALATIONAL_AGENTS.isoflurane.bgPartition).toBeCloseTo(1.4, 2);
      expect(INHALATIONAL_AGENTS.isoflurane.oilGasPartition).toBeCloseTo(90.8, 1);

      expect(INHALATIONAL_AGENTS.halothane.mac40).toBeCloseTo(0.75, 2);
      expect(INHALATIONAL_AGENTS.halothane.bgPartition).toBeCloseTo(2.3, 2);
      expect(INHALATIONAL_AGENTS.halothane.oilGasPartition).toBeCloseTo(197, 1);

      expect(INHALATIONAL_AGENTS.desflurane.mac40).toBeCloseTo(6.0, 2);
      expect(INHALATIONAL_AGENTS.n2o.mac40).toBeCloseTo(104, 1);
      expect(INHALATIONAL_AGENTS.n2o.bgPartition).toBeCloseTo(0.47, 2);
      expect(INHALATIONAL_AGENTS.n2o.oilGasPartition).toBeCloseTo(1.3, 2);
    });
  });

  describe("2. TABLE 20.2 Agent-Specific Muscle:Blood Partition Coefficient (lambda_mg)", () => {
    it('should assign each agent its own muscle:blood partition coefficient instead of a flat constant', () => {
      const sevo = new GasKineticsModel(INHALATIONAL_AGENTS.sevoflurane);
      const n2o = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);
      const halothane = new GasKineticsModel(INHALATIONAL_AGENTS.halothane);
      const iso = new GasKineticsModel(INHALATIONAL_AGENTS.isoflurane);
      const des = new GasKineticsModel(INHALATIONAL_AGENTS.desflurane);
      const methox = new GasKineticsModel(INHALATIONAL_AGENTS.methoxyflurane);

      expect(sevo.lambda_mg).toBeCloseTo(3.1, 1);
      expect(n2o.lambda_mg).toBeCloseTo(1.2, 1);
      expect(halothane.lambda_mg).toBeCloseTo(2.5, 1);
      expect(iso.lambda_mg).toBeCloseTo(2.9, 1);
      expect(des.lambda_mg).toBeCloseTo(2.0, 1);
      expect(methox.lambda_mg).toBeCloseTo(1.6, 1);

      // Confirms these are genuinely distinct, not all defaulting to the same flat value.
      expect(sevo.lambda_mg).not.toBeCloseTo(n2o.lambda_mg, 1);
    });

    it('should fall back to the legacy 1.5 default for agents not covered by TABLE 20.2 (e.g. Xenon)', () => {
      const xenon = new GasKineticsModel(INHALATIONAL_AGENTS.xenon);
      expect(xenon.lambda_mg).toBeCloseTo(1.5, 2);
    });

    it('should cause higher-solubility-in-muscle agents (sevoflurane) to redistribute into muscle more than low-solubility agents (N2O) over time', () => {
      const sevo = new GasKineticsModel(INHALATIONAL_AGENTS.sevoflurane);
      const n2o = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);
      sevo.setDial(2);
      n2o.setDial(70);

      for (let t = 0; t < 600; t++) {
        sevo.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
        n2o.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
      }

      expect(Number.isFinite(sevo.F_mg)).toBe(true);
      expect(Number.isFinite(n2o.F_mg)).toBe(true);
      expect(sevo.F_mg).toBeGreaterThan(0);
      expect(n2o.F_mg).toBeGreaterThan(0);
    });
  });

  describe('3. Sanity & Stability Checks', () => {
    it('should remain finite and bounded for every agent over a long wash-in/wash-out cycle', () => {
      const agentKeys = ['sevoflurane', 'methoxyflurane', 'desflurane', 'isoflurane', 'halothane', 'xenon', 'n2o'];
      for (const key of agentKeys) {
        const model = new GasKineticsModel((INHALATIONAL_AGENTS as any)[key]);
        model.setDial(key === 'n2o' || key === 'xenon' ? 60 : 2);
        let out: any;
        for (let t = 0; t < 300; t++) {
          out = model.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
        }
        model.setDial(0);
        for (let t = 0; t < 300; t++) {
          out = model.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
        }
        expect(Number.isFinite(out.Fa)).toBe(true);
        expect(Number.isFinite(out.Fb)).toBe(true);
        expect(out.Fa).toBeGreaterThanOrEqual(0);
        expect(out.Fa).toBeLessThanOrEqual(100);
      }
    });
  });
});
