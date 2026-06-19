import { describe, it, expect } from 'vitest';
import { MEDICATIONS } from '../engine/Pharmacology.js';
import { PKPDModel } from '../engine/PKPDEngine';

describe('Infusion Rate Investigation', () => {
  it('should check how infusion rate is processed', () => {
    const medData = MEDICATIONS['propofol'];
    const model = new PKPDModel(medData, 70);
    
    // Dialed rate = 5.0 mcg/kg/min
    const doseInput = "5.0";
    const unit = "mcg/kg/min";
    const safePatientWeight = 70;
    
    let doseInMg = parseFloat(doseInput);
    doseInMg = (doseInMg * safePatientWeight) / 1000; // 0.35 mg/min
    const rateMgPerSec = doseInMg / 60; // 0.00583 mg/sec
    
    model.setInfusion(rateMgPerSec);
    expect(model.currentInfusionRate).toBeCloseTo(0.00583, 5);
    
    // Simulate what L1271 does: model.currentInfusionRate = lineMedicationRates[matchingId]
    // lineMedicationRates[matchingId] is the dialed rate, e.g. 5.0
    const dialedRate = parseFloat(doseInput);
    model.currentInfusionRate = dialedRate; 
    
    // Now simulate the end of tick update:
    const updatedRate = ((model.currentInfusionRate * 1000 * 60) / safePatientWeight);
    console.log("Updated rate in UI:", updatedRate);
    
    expect(updatedRate).toBe(4285.714285714285);
  });
});
