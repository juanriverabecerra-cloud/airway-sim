import { describe, it, expect } from 'vitest';
import { GasKineticsModel } from '../engine/GasKineticsEngine';
import { INHALATIONAL_AGENTS } from '../engine/Pharmacology';
import { RespiratoryEngine } from '../engine/RespiratoryEngine';

describe('Chapter 19: Inhalational Anesthetics & Physiology Tests', () => {

  describe('1. Dynamic Solubility Coefficients', () => {
    it('should verify tissue fat-blood solubility is calculated dynamically from oil-gas and blood-gas partition coefficients', () => {
      const sevoModel = new GasKineticsModel(INHALATIONAL_AGENTS.sevoflurane);
      const desModel = new GasKineticsModel(INHALATIONAL_AGENTS.desflurane);
      const isoModel = new GasKineticsModel(INHALATIONAL_AGENTS.isoflurane);
      const n2oModel = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);

      expect(sevoModel.lambda_fg).toBeCloseTo(47 / 0.65, 2);
      expect(desModel.lambda_fg).toBeCloseTo(19 / 0.45, 2);
      // TABLE 20.1, Miller's 9th Ed: isoflurane oil/gas 90.8, blood/gas 1.4 (Ch20 correction).
      expect(isoModel.lambda_fg).toBeCloseTo(90.8 / 1.4, 2);
      // TABLE 20.1, Miller's 9th Ed: N2O oil/gas 1.3, blood/gas 0.47 (Ch20 correction).
      expect(n2oModel.lambda_fg).toBeCloseTo(1.3 / 0.47, 2);
    });
  });

  describe('2. The Concentration Effect', () => {
    it('should verify high concentration administration (70%) accelerates its own wash-in (Fa/Fi ratio)', () => {
      // Create two identical N2O models
      const n2oLow = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);
      const n2oHigh = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);

      // Low concentration: dial at 10%
      n2oLow.setDial(10);
      // High concentration: dial at 70%
      n2oHigh.setDial(70);

      // Run both for 5 seconds under identical ventilation (4 L/min) and CO (5 L/min)
      for (let t = 0; t < 5; t++) {
        n2oLow.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
        n2oHigh.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
      }

      // Calculate Fa/Fi ratio
      const ratioLow = n2oLow.Fa / (n2oLow.Fi * 100);
      const ratioHigh = n2oHigh.Fa / (n2oHigh.Fi * 100);

      // Due to the concentration effect (higher volume uptake concentrates remaining gas and pulls in more fresh gas),
      // the high concentration wash-in ratio should be greater than the low concentration ratio.
      expect(ratioHigh).toBeGreaterThan(ratioLow);
    });
  });

  describe('3. The Second Gas Effect', () => {
    it('should verify that co-administration of N2O (70%) accelerates Sevoflurane (2%) wash-in rate', () => {
      const sevoAlone = new GasKineticsModel(INHALATIONAL_AGENTS.sevoflurane);
      const sevoWithN2O = new GasKineticsModel(INHALATIONAL_AGENTS.sevoflurane);
      const n2oModel = new GasKineticsModel(INHALATIONAL_AGENTS.n2o);

      sevoAlone.setDial(2);
      sevoWithN2O.setDial(2);
      n2oModel.setDial(70);

      // Run both scenarios for 5 seconds
      for (let t = 0; t < 5; t++) {
        // Scenario A: Sevoflurane alone (no co-administered gas uptake, otherUptake_L_sec = 0)
        sevoAlone.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0, 0.0);

        // Scenario B: Sevoflurane with N2O (pass the N2O uptake to Sevoflurane's tick)
        const n2oState = n2oModel.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0);
        const n2oUptake_L_sec = n2oState.uptake_vol_sec;

        sevoWithN2O.tick(1, 4.0, 5.0, 2.5, 70, 0.0, 6.0, n2oUptake_L_sec);
      }

      // Calculate Fa/Fi ratios
      const ratioAlone = sevoAlone.Fa / (sevoAlone.Fi * 100);
      const ratioWithN2O = sevoWithN2O.Fa / (sevoWithN2O.Fi * 100);

      // The second gas effect should cause the Sevoflurane co-administered with N2O to have a faster wash-in ratio.
      expect(ratioWithN2O).toBeGreaterThan(ratioAlone);
    });
  });

  describe('4. Diffusion Hypoxia (Fink Effect)', () => {
    it('should verify that N2O washout (negative uptake) dilutes oxygen buffer and causes hypoxia on room air, but is prevented by 100% O2', () => {
      const patientBase = {
        height: 175,
        weight: 70,
        age: 40,
        sex: 'male',
        bmi: 22.8,
        position: 'Supine',
        isApneic: false,
        isParalyzed: false,
        shuntFraction: 0.05,
        oxygenBuffer: 0.45, // Room air baseline
        airwaySecured: true
      };

      const vitalsBase = {
        hr: 75,
        sys: 120,
        dia: 80,
        rr: 12,
        spo2: 98,
        paco2: 40,
        pao2: 95
      };

      // Scenario A: Room air breathing (FiO2 = 21%) during N2O washout (negative uptake rate of -0.15 L/sec)
      let patientAir = { ...patientBase };
      let vitalsAir = { ...vitalsBase, n2oUptakeRate: -0.15 }; // -0.15 L/sec = -9.0 L/min washout flow

      // Tick RespiratoryEngine for 10 seconds under room air (FiO2 = 21%)
      for (let t = 0; t < 10; t++) {
        const out = RespiratoryEngine.tick(1, {
          patient: patientAir,
          vitals: vitalsAir,
          time: t
        }, { mode: 'spontaneous' }, 21, { maxNMJOccupancy: 0 });

        patientAir.oxygenBuffer = out.oxygenBuffer;
        vitalsAir.spo2 = out.vitals.spo2;
        vitalsAir.pao2 = out.vitals.pao2;
      }

      // Scenario B: 100% O2 breathing (FiO2 = 100%) during the same N2O washout
      let patientO2 = { ...patientBase };
      let vitalsO2 = { ...vitalsBase, n2oUptakeRate: -0.15 };

      for (let t = 0; t < 10; t++) {
        const out = RespiratoryEngine.tick(1, {
          patient: patientO2,
          vitals: vitalsO2,
          time: t
        }, { mode: 'spontaneous' }, 100, { maxNMJOccupancy: 0 });

        patientO2.oxygenBuffer = out.oxygenBuffer;
        vitalsO2.spo2 = out.vitals.spo2;
        vitalsO2.pao2 = out.vitals.pao2;
      }

      // Room air desaturation should occur (SpO2 drops due to dilution)
      expect(vitalsAir.spo2).toBeLessThanOrEqual(95);
      
      // 100% O2 should result in a significantly higher SpO2 compared to room air
      expect(vitalsO2.spo2).toBeGreaterThan(vitalsAir.spo2);
    });
  });
});
