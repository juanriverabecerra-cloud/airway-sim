import { PKParameters, PDParameters } from './config/meds.config';

export interface MedicationProfileInput {
  name: string;
  classes?: string[];
  pk: PKParameters;
  pd: PDParameters;
}

export interface PKPDEffects {
  hrDelta: number;
  sysDelta: number;
  diaDelta: number;
  rrDelta: number;
  hypnoticEffect: number;
  receptorOccupancy: number;
  group: string;
  svrMultiplier: number;
  coMultiplier: number;
}

export class PKPDModel {
  name: string;
  pk: PKParameters;
  pd: PDParameters;
  classes: string[];
  weight: number;
  
  // Compartment amounts in milligrams (mg)
  A1: number = 0; // Central compartment (Blood plasma)
  A2: number = 0; // Rapidly equilibrating compartment (Muscle/Organs)
  A3: number = 0; // Slowly equilibrating compartment (Fat)
  
  Ce: number = 0; // Effect-site concentration (mg/L)
  currentInfusionRate: number = 0; // mg/sec

  constructor(med: MedicationProfileInput, weight: number) {
    this.name = med.name || 'Unknown';
    this.pk = med.pk; // V1, V2, V3, k10, k12, k21, k13, k31, ke0, coSensitivity, proteinBinding, renalFraction, hepaticFraction
    this.pd = med.pd; // c50, gamma, sysMax, diaMax, hrMax, rrMax, receptors, synergyGroup, inducesApneaAtCe, inducesParalysisAtCe
    this.classes = med.classes || [];
    
    // Validate and clamp weight
    let w = Number(weight);
    if (isNaN(w) || !isFinite(w) || w <= 0) {
      w = 70.0;
    }
    this.weight = Math.max(1.0, Math.min(500.0, w));
  }

  // Administer a bolus (instantly enters V1)
  giveBolus(doseMg: number): void {
    const d = Number(doseMg);
    if (!isNaN(d) && isFinite(d) && d > 0) {
      this.A1 = Math.max(0, Math.min(1e9, this.A1 + d));
    }
  }

  // Physical removal of drug mass (e.g., Sugammadex encapsulation)
  chelate(fraction: number): void {
    // Sugammadex binds Rocuronium/Vecuronium in a 1:1 molar ratio in the plasma (A1)
    let f = Number(fraction);
    if (isNaN(f) || !isFinite(f)) {
      f = 0;
    }
    f = Math.max(0, Math.min(1.0, f));
    this.A1 *= (1 - f);
    // Note: This creates a concentration gradient that pulls drug out of Ce and A2/A3
  }

  // Set continuous infusion rate
  setInfusion(rateMgPerSec: number): void {
    let r = Number(rateMgPerSec);
    if (isNaN(r) || !isFinite(r) || r < 0) {
      r = 0;
    }
    this.currentInfusionRate = Math.min(1e6, r);
  }

  /**
   * Ticks the physics forward
   * @param dt seconds
   * @param coRatio Current CO / Baseline CO (1.0 = normal)
   * @param v1VolumeRatio Current Blood Vol / Baseline EBV (Hemoconcentration modifier)
   * @param renalRatio GFR clearance ratio (1.0 = normal)
   * @param pdSensitivityCoeff Sensitivity modifier (1.0 = normal)
   * @param hepaticRatio Hepatic clearance ratio (1.0 = normal)
   */
  tick(
    dt: number = 1,
    coRatio: number = 1.0,
    v1VolumeRatio: number = 1.0,
    renalRatio: number = 1.0,
    pdSensitivityCoeff: number = 1.0,
    hepaticRatio: number = 1.0
  ): PKPDEffects {
    // Validate inputs
    let safeDt = Number(dt);
    if (isNaN(safeDt) || !isFinite(safeDt) || safeDt <= 0) {
      safeDt = 1.0;
    }
    safeDt = Math.max(0.001, Math.min(3600.0, safeDt));

    let safeCoRatio = Number(coRatio);
    if (isNaN(safeCoRatio) || !isFinite(safeCoRatio) || safeCoRatio < 0) {
      safeCoRatio = 1.0;
    }
    safeCoRatio = Math.max(0.0, Math.min(10.0, safeCoRatio));

    let safeV1VolumeRatio = Number(v1VolumeRatio);
    if (isNaN(safeV1VolumeRatio) || !isFinite(safeV1VolumeRatio) || safeV1VolumeRatio <= 0) {
      safeV1VolumeRatio = 1.0;
    }
    safeV1VolumeRatio = Math.max(0.1, Math.min(5.0, safeV1VolumeRatio));

    let safeRenalRatio = Number(renalRatio);
    if (isNaN(safeRenalRatio) || !isFinite(safeRenalRatio) || safeRenalRatio < 0) {
      safeRenalRatio = 1.0;
    }
    safeRenalRatio = Math.max(0.0, Math.min(5.0, safeRenalRatio));

    let safePdSensitivityCoeff = Number(pdSensitivityCoeff);
    if (isNaN(safePdSensitivityCoeff) || !isFinite(safePdSensitivityCoeff) || safePdSensitivityCoeff < 0) {
      safePdSensitivityCoeff = 1.0;
    }
    safePdSensitivityCoeff = Math.max(0.0, Math.min(10.0, safePdSensitivityCoeff));

    let safeHepaticRatio = Number(hepaticRatio);
    if (isNaN(safeHepaticRatio) || !isFinite(safeHepaticRatio) || safeHepaticRatio < 0) {
      safeHepaticRatio = 1.0;
    }
    safeHepaticRatio = Math.max(0.0, Math.min(5.0, safeHepaticRatio));

    // Internal sub-stepping for numerical stability (10 steps per tick)
    const subSteps = 10;
    const subDt = safeDt / subSteps;

    // Apply flow-dependency to elimination (k10) and distribution (k12, k13)
    const coMod = Math.max(0, 1 + (safeCoRatio - 1) * (this.pk.coSensitivity !== undefined ? this.pk.coSensitivity : 0.5));
    
    let k10Raw = this.pk.k10 || 0;
    
    // Configuration-driven organ impairment clearance calculations
    const renalFrac = this.pk.renalFraction !== undefined ? this.pk.renalFraction : 0.0;
    const hepaticFrac = this.pk.hepaticFraction !== undefined ? this.pk.hepaticFraction : 0.0;
    const independentFrac = Math.max(0, 1.0 - renalFrac - hepaticFrac);
    
    k10Raw *= (independentFrac + renalFrac * safeRenalRatio + hepaticFrac * safeHepaticRatio);

    const k10 = (k10Raw / 60) * coMod;
    const k12 = ((this.pk.k12 || 0) / 60) * coMod;
    const k21 = (this.pk.k21 || 0) / 60;
    const k13 = ((this.pk.k13 || 0) / 60) * coMod;
    const k31 = (this.pk.k31 || 0) / 60;

    // Autoregulation of Effect-Site Equilibration (ke0)
    let ke0Mod = 1.0;
    if (this.classes.includes('Sedative') || this.classes.includes('Hypnotic') || this.classes.includes('Opioid')) {
      // Cerebral autoregulation preserves brain blood flow (and ke0) until severe shock
      ke0Mod = safeCoRatio < 0.5 ? (safeCoRatio * 2) : 1.0; 
    } else {
      // Systemic/Muscle perfusion drops linearly with CO (delays paralytic/pressor onset in shock)
      ke0Mod = Math.max(0.1, safeCoRatio);
    }
    const ke0 = ((this.pk.ke0 || 0.1) / 60) * ke0Mod;

    // Dynamic V1 based on hemorrhage / massive fluid resuscitation
    const dynamicV1 = Math.max(0.1, this.pk.V1 * safeV1VolumeRatio);

    // Protein Binding & Free Fraction
    const proteinBinding = this.pk.proteinBinding || 0;
    const freeFraction = 1.0 - proteinBinding; 
    // Severe hemodilution (v1VolumeRatio > 1.2) dilutes plasma proteins, increasing free fraction.
    const effectiveFreeFraction = Math.min(1.0, freeFraction * (safeV1VolumeRatio > 1.2 ? 1.2 : 1.0));

    for (let i = 0; i < subSteps; i++) {
      // 1. Add continuous infusion to Central Compartment
      this.A1 += this.currentInfusionRate * subDt;

      // 2. Calculate flux between compartments (Euler)
      const flux10 = k10 * this.A1 * subDt; 
      const flux12 = k12 * this.A1 * subDt; 
      const flux21 = k21 * this.A2 * subDt; 
      const flux13 = k13 * this.A1 * subDt; 
      const flux31 = k31 * this.A3 * subDt; 

      // 3. Update compartment masses (guarded against overflow/divergence and underflow)
      this.A1 = Math.max(0, Math.min(1e9, this.A1 - flux10 - flux12 + flux21 - flux13 + flux31));
      this.A2 = Math.max(0, Math.min(1e9, this.A2 + flux12 - flux21));
      this.A3 = Math.max(0, Math.min(1e9, this.A3 + flux13 - flux31));

      // 4. Update Effect-Site Concentration (Ce) driven by Unbound Plasma Concentration
      const Cp = (this.A1 / dynamicV1) * effectiveFreeFraction;
      this.Ce += ke0 * (Cp - this.Ce) * subDt;
      this.Ce = Math.max(0, Math.min(1e9, this.Ce));
    }

    return this.getEffects(safePdSensitivityCoeff);
  }

  // Hill Equation for Pharmacodynamics
  getEffects(pdSensitivityCoeff: number = 1.0): PKPDEffects {
    const effects: PKPDEffects = { 
      hrDelta: 0, 
      sysDelta: 0, 
      diaDelta: 0, 
      rrDelta: 0, 
      hypnoticEffect: 0, 
      receptorOccupancy: 0,
      group: this.pd?.synergyGroup || 'None',
      svrMultiplier: 1.0,
      coMultiplier: 1.0
    };

    if (!this.pd) return effects;

    let fraction = 0;
    if (this.pd.c50 && this.pd.c50 > 0) {
      const gamma = this.pd.gamma || 1;
      const safeCe = Math.max(0, this.Ce); 
      const activeCe = safeCe * pdSensitivityCoeff;
      if (activeCe > 0) {
        const ceGamma = Math.pow(activeCe, gamma);
        const c50Gamma = Math.pow(this.pd.c50, gamma);
        const sum = ceGamma + c50Gamma;
        if (sum > 0 && isFinite(sum)) {
          fraction = ceGamma / sum;
        } else {
          // Safe fallback if power functions overflow to Infinity
          fraction = 1.0;
        }
      }
    }
    fraction = Math.max(0, Math.min(1.0, fraction));

    // Direct Deltas for non-vasopressor agents (Sedatives, Opioids)
    if (this.pd.sysMax && !this.pd.receptors) effects.sysDelta = this.pd.sysMax * fraction;
    if (this.pd.diaMax && !this.pd.receptors) effects.diaDelta = this.pd.diaMax * fraction;
    if (this.pd.hrMax && !this.pd.receptors) effects.hrDelta = this.pd.hrMax * fraction;
    if (this.pd.rrMax) effects.rrDelta = this.pd.rrMax * fraction;

    // HIGH-FIDELITY VASOPRESSOR / RECEPTOR COUPLING (CA-1 Integration)
    if (this.pd.receptors) {
      const alpha1 = this.pd.receptors.Alpha1 || 0;
      const beta1 = this.pd.receptors.Beta1 || 0;
      const beta2 = this.pd.receptors.Beta2 || 0;
      const v1 = this.pd.receptors.V1 || 0;

      // SVR is driven heavily by Alpha-1 and V1, antagonized by Beta-2
      const svrIncrease = (alpha1 * 0.25 * fraction) + (v1 * 0.30 * fraction);
      const svrDecrease = (beta2 * 0.15 * fraction);
      effects.svrMultiplier += (svrIncrease - svrDecrease);

      // Cardiac Output (Contractility) is driven purely by Beta-1
      const coIncrease = (beta1 * 0.25 * fraction);
      effects.coMultiplier += coIncrease;
      
      // Beta-1 directly drives chronotropy
      effects.hrDelta += (beta1 * 15 * fraction);
      
      // Baroreceptor Reflex Simulation: 
      if (alpha1 > 0 && beta1 === 0) effects.hrDelta -= (alpha1 * 5 * fraction);
      if (v1 > 0 && beta1 === 0) effects.hrDelta -= (v1 * 5 * fraction);
    }

    // Clinical Hypnosis
    if (this.classes.includes('Sedative') || 
        this.classes.includes('Hypnotic') || 
        this.classes.includes('Dissociative') || 
        this.classes.includes('Opioid')) {
      effects.hypnoticEffect = fraction;
    }

    // Neuromuscular Junction Occupancy
    if (this.classes.includes('NDMR') || this.classes.includes('Depolarizing NMBA') || this.classes.includes('NMBA')) {
      effects.receptorOccupancy = fraction;
    }
    
    return effects;
  }
}
