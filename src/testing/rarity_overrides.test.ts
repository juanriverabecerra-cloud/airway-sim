import { describe, it, expect } from 'vitest';
import { HepaticEngine } from '../engine/HepaticEngine';
import { RenalEngine } from '../engine/RenalEngine';

describe('Global Rarity and Overrides Tests', () => {

  describe('1. Hepatic Variceal Bleeding', () => {
    it('should NOT trigger variceal bleeding by default (probabilistic, 10% chance)', () => {
      const patient = {
        cirrhosisFactor: 0.8,
        varicealBleedingActive: false,
        varicealBleedTime: null
      };
      const vitals = {
        mPAP: 15.0,
        HVPG: 15.0
      };

      // Mock Math.random to return 0.5 (which is > 0.10, so it should not trigger)
      const originalRandom = Math.random;
      Math.random = () => 0.5;

      try {
        const output = HepaticEngine.tick(1, { patient, vitals, time: 100 }, [], {
          coRatio: 1.0,
          map: 120.0,
          sys: 170.0, // hypertensive surge
          spo2: 98.0,
          paco2: 40.0,
          temp: 37.0,
          cvp: 5.0,
          surgicalPhase: 'Pre-Op',
          renalRatio: 1.0,
          FiO2: 21.0
        });

        expect(output.varicealBleedingActive).toBe(false);
        expect(output.varicealBleedRolled).toBe(false);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should trigger variceal bleeding deterministically if forceVaricealBleed is true', () => {
      const patient = {
        cirrhosisFactor: 0.8,
        varicealBleedingActive: false,
        varicealBleedTime: null,
        forceVaricealBleed: true
      };
      const vitals = {
        mPAP: 15.0,
        HVPG: 15.0
      };

      const originalRandom = Math.random;
      Math.random = () => 0.99; // would normally fail

      try {
        const output = HepaticEngine.tick(1, { patient, vitals, time: 100 }, [], {
          coRatio: 1.0,
          map: 120.0,
          sys: 170.0,
          spo2: 98.0,
          paco2: 40.0,
          temp: 37.0,
          cvp: 5.0,
          surgicalPhase: 'Pre-Op',
          renalRatio: 1.0,
          FiO2: 21.0
        });

        expect(output.varicealBleedingActive).toBe(true);
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('2. PoPH Collapse', () => {
    it('should NOT trigger right heart collapse by default under stress (10% chance)', () => {
      const patient = {
        cirrhosisFactor: 0.9,
        isArrest: false,
        cardiacRhythm: 'normal'
      };
      const vitals = {
        mPAP: 37.5,
        HVPG: 15.0,
        spo2: 80.0,
        paco2: 40.0
      };

      const originalRandom = Math.random;
      Math.random = () => 0.5;

      try {
        const output = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
          coRatio: 1.0,
          map: 90.0,
          sys: 120.0,
          spo2: 80.0,
          paco2: 40.0,
          temp: 37.0,
          cvp: 5.0,
          surgicalPhase: 'Pre-Op',
          renalRatio: 1.0,
          FiO2: 21.0
        });

        expect(output.hasPoPHCollapse).toBe(false);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should trigger right heart collapse deterministically if forcePoPHCollapse is true', () => {
      const patient = {
        cirrhosisFactor: 0.9,
        isArrest: false,
        cardiacRhythm: 'normal',
        forcePoPHCollapse: true
      };
      const vitals = {
        mPAP: 37.5,
        HVPG: 15.0,
        spo2: 80.0,
        paco2: 40.0
      };

      const originalRandom = Math.random;
      Math.random = () => 0.99;

      try {
        const output = HepaticEngine.tick(1, { patient, vitals, time: 10 }, [], {
          coRatio: 1.0,
          map: 90.0,
          sys: 120.0,
          spo2: 80.0,
          paco2: 40.0,
          temp: 37.0,
          cvp: 5.0,
          surgicalPhase: 'Pre-Op',
          renalRatio: 1.0,
          FiO2: 21.0
        });

        expect(output.hasPoPHCollapse).toBe(true);
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('3. Fluid Overload Pulmonary Edema', () => {
    it('should NOT trigger pulmonary edema by default (10% chance)', () => {
      const patient = {
        weight: 70.0,
        hasFluidOverloadEdema: false
      };
      const vitals = {};

      const originalRandom = Math.random;
      Math.random = () => 0.5;

      try {
        const output = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
          coRatio: 1.0,
          map: 90.0,
          sys: 120.0,
          cvp: 5.0,
          peep: 0.0,
          temp: 37.0,
          currentMac: 0.0,
          C_cat: 0.0,
          ebl: 0.0,
          ebv: 5000.0,
          netFluidBalance: 2500.0 // +2.5L overload
        });

        expect(output.hasFluidOverloadEdema).toBe(false);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should trigger pulmonary edema deterministically if forceFluidOverloadEdema is true', () => {
      const patient = {
        weight: 70.0,
        hasFluidOverloadEdema: false,
        forceFluidOverloadEdema: true
      };
      const vitals = {};

      const originalRandom = Math.random;
      Math.random = () => 0.99;

      try {
        const output = RenalEngine.tick(1, { patient, vitals, time: 0 }, [], {
          coRatio: 1.0,
          map: 90.0,
          sys: 120.0,
          cvp: 5.0,
          peep: 0.0,
          temp: 37.0,
          currentMac: 0.0,
          C_cat: 0.0,
          ebl: 0.0,
          ebv: 5000.0,
          netFluidBalance: 2500.0
        });

        expect(output.hasFluidOverloadEdema).toBe(true);
      } finally {
        Math.random = originalRandom;
      }
    });
  });
});
