import { describe, it, expect } from 'vitest';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';
import { FLUIDS_CONFIG } from '../engine/config/fluids.config';
import { POSITIONS_CONFIG } from '../engine/config/positions.config';

describe('Ingestion Configurations Integrity Test', () => {
  it('should load and validate MEDICATIONS_CONFIG', () => {
    expect(MEDICATIONS_CONFIG).toBeDefined();
    expect(MEDICATIONS_CONFIG.propofol).toBeDefined();
    expect(MEDICATIONS_CONFIG.propofol.name).toBe('Propofol');
    expect(MEDICATIONS_CONFIG.propofol.pk.V1).toBe(4.27);
    expect(MEDICATIONS_CONFIG.propofol.pd.c50).toBe(2.5);
    expect(MEDICATIONS_CONFIG.epinephrine.pd.receptors).toBeDefined();
    expect(MEDICATIONS_CONFIG.epinephrine.pd.receptors?.Alpha1).toBe(3);
  });

  it('should load and validate FLUIDS_CONFIG', () => {
    expect(FLUIDS_CONFIG).toBeDefined();
    expect(FLUIDS_CONFIG['Normal Saline (0.9% NS)']).toBeDefined();
    expect(FLUIDS_CONFIG['Normal Saline (0.9% NS)'].type).toBe('Crystalloid');
    expect(FLUIDS_CONFIG['Normal Saline (0.9% NS)'].na).toBe(154);
    expect(FLUIDS_CONFIG['Packed Red Blood Cells (PRBC)'].viscosity).toBe(3.5);
  });

  it('should load and validate POSITIONS_CONFIG', () => {
    expect(POSITIONS_CONFIG).toBeDefined();
    expect(POSITIONS_CONFIG['Trendelenburg']).toBeDefined();
    expect(POSITIONS_CONFIG['Trendelenburg'].frcFactor).toBe(0.70);
    expect(POSITIONS_CONFIG['Trendelenburg'].complianceFactor).toBe(0.80);
    expect(POSITIONS_CONFIG['Sitting'].preloadMod).toBe(-400);
  });
});
