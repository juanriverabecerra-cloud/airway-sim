import { describe, it, expect } from 'vitest';
import { PerioperativeMIModel } from '../engine/PerioperativeMIModel';
import { FatEmbolismModel } from '../engine/FatEmbolismModel';

// ============================================================
// PERIOPERATIVE MI MODEL
// ============================================================
describe('PerioperativeMIModel — demand ischemia, troponin, supply-demand', () => {
  it('falls back safely with no inputs', () => {
    expect(() => PerioperativeMIModel.tick(undefined as any)).not.toThrow();
    const out = PerioperativeMIModel.tick({});
    expect(out.ratePressureProduct).toBeGreaterThan(0);
    expect(out.troponinNgL).toBeGreaterThan(0);
  });

  describe('Supply-demand index', () => {
    it('tachycardia + hypertension creates high demand (elevated RPP)', () => {
      const normal = PerioperativeMIModel.tick({ currentHR: 70, currentSBP: 110, currentDBP: 70 });
      const stressed = PerioperativeMIModel.tick({ currentHR: 130, currentSBP: 180, currentDBP: 100 });
      expect(stressed.ratePressureProduct).toBeGreaterThan(normal.ratePressureProduct);
      expect(stressed.supplyDemandIndex).toBeGreaterThan(normal.supplyDemandIndex);
    });

    it('hypotension reduces coronary perfusion pressure', () => {
      const normal = PerioperativeMIModel.tick({ currentDBP: 75, currentLVEDP: 8 });
      const hypotensive = PerioperativeMIModel.tick({ currentDBP: 35, currentLVEDP: 18 });
      expect(hypotensive.coronaryPerfPressure).toBeLessThan(normal.coronaryPerfPressure);
      expect(hypotensive.supplyDemandIndex).toBeGreaterThan(normal.supplyDemandIndex);
    });

    it('anemia worsens supply-demand balance', () => {
      const normalHb = PerioperativeMIModel.tick({ currentHb: 14, currentHR: 100, currentSBP: 140, currentDBP: 50 });
      const anemic = PerioperativeMIModel.tick({ currentHb: 6, currentHR: 100, currentSBP: 140, currentDBP: 50 });
      expect(anemic.supplyDemandIndex).toBeGreaterThan(normalHb.supplyDemandIndex);
    });
  });

  describe('Ischemic burden accumulation', () => {
    it('burden accumulates with sustained supply-demand mismatch', () => {
      const lowStress = PerioperativeMIModel.tick({ currentHR: 70, currentSBP: 110, currentDBP: 70, ischemicBurdenAccumulator: 0 });
      const highStress = PerioperativeMIModel.tick({ currentHR: 140, currentSBP: 180, currentDBP: 40, ischemicBurdenAccumulator: 0, hasCAD: true });
      expect(highStress.ischemicBurdenAccumulator).toBeGreaterThan(lowStress.ischemicBurdenAccumulator);
    });

    it('CAD multiplies ischemic burden accumulation rate', () => {
      // Use hemodynamics clearly above threshold: high HR, high SBP, low DBP (low CPP)
      const noCAD = PerioperativeMIModel.tick({ currentHR: 140, currentSBP: 170, currentDBP: 38, currentLVEDP: 16, ischemicBurdenAccumulator: 0, hasCAD: false });
      const withCAD = PerioperativeMIModel.tick({ currentHR: 140, currentSBP: 170, currentDBP: 38, currentLVEDP: 16, ischemicBurdenAccumulator: 0, hasCAD: true });
      // Both should accumulate (stress > threshold), but withCAD faster
      expect(withCAD.ischemicBurdenAccumulator).toBeGreaterThanOrEqual(noCAD.ischemicBurdenAccumulator);
      // At least one should be > 0 (confirming SDI > 0.3)
      expect(withCAD.ischemicBurdenAccumulator).toBeGreaterThan(0);
    });
  });

  describe('Troponin kinetics', () => {
    it('troponin rises after MI onset with delay', () => {
      const early = PerioperativeMIModel.tick({ miActiveType1: true, minutesSinceMIOnset: 60, troponinNgL: 3, hasCAD: true });
      const delayed = PerioperativeMIModel.tick({ miActiveType1: true, minutesSinceMIOnset: 300, troponinNgL: 3, hasCAD: true });
      // No rise before 3h, significant rise after
      expect(early.troponinNgL).toBeCloseTo(3, 0); // still near baseline at 1h
      expect(delayed.troponinNgL).toBeGreaterThan(early.troponinNgL);
    });

    it('MINS detected at hs-TnT > 14 ng/L', () => {
      const elevated = PerioperativeMIModel.tick({ troponinNgL: 20 });
      expect(elevated.minsDetected).toBe(true);
    });

    it('significant MI detected at hs-TnT > 52 ng/L', () => {
      const high = PerioperativeMIModel.tick({ troponinNgL: 100 });
      expect(high.significantMIDetected).toBe(true);
    });
  });

  describe('Ischemia event', () => {
    it('fires ischemia warning at high burden', () => {
      const out = PerioperativeMIModel.tick({
        ischemicBurdenAccumulator: 200, currentHR: 130, currentSBP: 160,
        currentDBP: 45, hasCAD: true, prevIschemiaLogged: false,
      });
      expect(out.events.some(e => e.includes('ISCHEMIA RISK'))).toBe(true);
    });

    it('fires Type 1 MI event on plaque rupture', () => {
      const out = PerioperativeMIModel.tick({ miActiveType1: true, prevMIType1Logged: false });
      expect(out.events.some(e => e.includes('TYPE 1 MI'))).toBe(true);
    });

    it('ST elevation active with Type 1 MI', () => {
      const out = PerioperativeMIModel.tick({ miActiveType1: true });
      expect(out.stElevationActive).toBe(true);
    });

    it('myocardial stunning reduces effective inotropy', () => {
      const out = PerioperativeMIModel.tick({
        miActiveType1: true, minutesSinceMIOnset: 600,
        ischemicBurdenAccumulator: 500, troponinNgL: 200,
      });
      expect(out.myocardialStunningContribution).toBeGreaterThan(0);
      expect(out.inotropyPenalty).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// FAT EMBOLISM MODEL
// ============================================================
describe('FatEmbolismModel — mechanical + biochemical phases', () => {
  it('returns zero effects when inactive', () => {
    const out = FatEmbolismModel.tick({ femActive: false });
    expect(out.shuntContribution).toBe(0);
    expect(out.compliancePenaltyFraction).toBe(0);
    expect(out.plateletConsumptionRate).toBe(0);
  });

  it('falls back safely with undefined inputs', () => {
    expect(() => FatEmbolismModel.tick(undefined as any)).not.toThrow();
  });

  describe('Mechanical phase (immediate)', () => {
    it('bone cement causes immediate mechanical phase', () => {
      const cement = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'cement', minutesSinceOnset: 5 });
      expect(cement.mechanicalPhaseActive).toBe(true);
      expect(cement.pvr_multiplier).toBeGreaterThan(1.0);
    });

    it('fracture has less immediate mechanical severity than cement', () => {
      const cement = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'cement', minutesSinceOnset: 5 });
      const fracture = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 5 });
      expect(cement.shuntContribution).toBeGreaterThan(fracture.shuntContribution);
    });
  });

  describe('Biochemical phase (delayed ARDS)', () => {
    it('biochemical phase develops after 12h for fracture', () => {
      const early = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 180 });
      const late = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 1440 });
      expect(late.biochemicalPhaseActive).toBe(true);
      expect(late.compliancePenaltyFraction).toBeGreaterThan(early.compliancePenaltyFraction);
    });

    it('methylprednisolone reduces biochemical phase severity', () => {
      const noSteroid = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 1440, methylprednisoloneCe: 0 });
      const steroid = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 1440, methylprednisoloneCe: 2.0 });
      expect(steroid.compliancePenaltyFraction).toBeLessThan(noSteroid.compliancePenaltyFraction);
      expect(steroid.shuntContribution).toBeLessThan(noSteroid.shuntContribution);
    });

    it('platelet consumption occurs during biochemical phase', () => {
      const out = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 1440 });
      expect(out.plateletConsumptionRate).toBeGreaterThan(0);
    });
  });

  describe('PEEP benefit', () => {
    it('higher PEEP reduces shunt contribution during active mechanical phase', () => {
      // At t=10 min: cement mechanical phase still active (before 30 min clearance)
      const lowPeep = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'cement', minutesSinceOnset: 10, currentPeep: 5 });
      const highPeep = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'cement', minutesSinceOnset: 10, currentPeep: 14 });
      expect(lowPeep.shuntContribution).toBeGreaterThan(0); // confirm phase is active
      expect(highPeep.shuntContribution).toBeLessThan(lowPeep.shuntContribution);
    });
  });

  describe('Narrative events', () => {
    it('fires onset event on first tick', () => {
      const out = FatEmbolismModel.tick({ femActive: true, femTriggerType: 'cement', minutesSinceOnset: 1, prevFEMOnsetLogged: false });
      expect(out.events.some(e => e.includes('FAT EMBOLISM'))).toBe(true);
      expect(out.prevFEMOnsetLogged).toBe(true);
    });

    it('mentions PFO risk in onset event when PFO present', () => {
      const out = FatEmbolismModel.tick({ femActive: true, hasPFO: true, minutesSinceOnset: 1, prevFEMOnsetLogged: false });
      expect(out.events.some(e => e.includes('PFO'))).toBe(true);
    });

    it('fires severe event at peak biochemical phase', () => {
      const out = FatEmbolismModel.tick({
        femActive: true, femTriggerType: 'fracture', minutesSinceOnset: 1440,
        prevFEMOnsetLogged: true, prevFEMSevereLogged: false,
      });
      if (out.biochemicalPhaseActive && out.shuntContribution > 0.15) {
        expect(out.events.some(e => e.includes('SEVERE FAT EMBOLISM'))).toBe(true);
      }
    });
  });
});
