/**
 * HIGH-FIDELITY PK/PD ENGINE (V2.0)
 * Uses multi-compartment mammillary modeling with flow-dependent clearance.
 * Implements internal sub-stepping for numerical stability with short-acting agents.
 */

export class PKPDModel {
  constructor(med, weight) {
    this.name = med.name;
    this.pk = med.pk; // V1, V2, V3, k10, k12, k21, k13, k31, ke0, coSensitivity
    this.pd = med.pd; // c50, gamma, maxEffects, mechanism
    this.classes = med.classes || [];
    this.weight = weight;
    
    // Compartment amounts in milligrams (mg)
    this.A1 = 0; // Central compartment (Blood plasma)
    this.A2 = 0; // Rapidly equilibrating compartment (Muscle/Organs)
    this.A3 = 0; // Slowly equilibrating compartment (Fat)
    
    this.Ce = 0; // Effect-site concentration (mg/L)
    this.currentInfusionRate = 0; // mg/sec
  }

  // Administer a bolus (instantly enters V1)
  giveBolus(doseMg) {
    this.A1 += doseMg;
  }

  // Physical removal of drug mass (e.g., Sugammadex encapsulation)
  chelate(fraction) {
    // Sugammadex binds Rocuronium in a 1:1 molar ratio in the plasma (A1)
    this.A1 *= (1 - fraction);
    // Note: This creates a concentration gradient that pulls drug out of Ce and A2/A3
  }

  // Set continuous infusion rate
  setInfusion(rateMgPerSec) {
    this.currentInfusionRate = rateMgPerSec;
  }

  /**
   * Tick the physics forward
   * @param {number} dt seconds
   * @param {number} coRatio Current CO / Baseline CO (1.0 = normal)
   */
  tick(dt = 1, coRatio = 1.0) {
    // Internal sub-stepping for numerical stability (10 steps per tick)
    const subSteps = 10;
    const subDt = dt / subSteps;

    // Apply flow-dependency to elimination (k10) and distribution (k12, k13)
    // coSensitivity 0.8 means clearance is 80% dependent on CO (e.g. Fentanyl)
    // coSensitivity 0.1 means clearance is mostly independent (e.g. Remifentanil)
    const coMod = 1 + (coRatio - 1) * (this.pk.coSensitivity || 0.5);
    
    const k10 = ((this.pk.k10 || 0) / 60) * coMod;
    const k12 = ((this.pk.k12 || 0) / 60) * coMod;
    const k21 = (this.pk.k21 || 0) / 60;
    const k13 = ((this.pk.k13 || 0) / 60) * coMod;
    const k31 = (this.pk.k31 || 0) / 60;
    const ke0 = (this.pk.ke0 || 0.1) / 60; 

    for (let i = 0; i < subSteps; i++) {
      // 1. Add continuous infusion to Central Compartment
      this.A1 += this.currentInfusionRate * subDt;

      // 2. Calculate flux between compartments (Euler)
      const flux10 = k10 * this.A1 * subDt; 
      const flux12 = k12 * this.A1 * subDt; 
      const flux21 = k21 * this.A2 * subDt; 
      const flux13 = k13 * this.A1 * subDt; 
      const flux31 = k31 * this.A3 * subDt; 

      // 3. Update compartment masses
      this.A1 = Math.max(0, this.A1 - flux10 - flux12 + flux21 - flux13 + flux31);
      this.A2 = Math.max(0, this.A2 + flux12 - flux21);
      this.A3 = Math.max(0, this.A3 + flux13 - flux31);

      // 4. Update Effect-Site Concentration (Ce)
      const Cp = this.A1 / this.pk.V1;
      this.Ce += ke0 * (Cp - this.Ce) * subDt;
    }

    return this.getEffects();
  }

  // Hill Equation for Pharmacodynamics
  getEffects() {
    let effects = { 
      hrDelta: 0, 
      sysDelta: 0, 
      diaDelta: 0, 
      rrDelta: 0, 
      hypnoticEffect: 0, 
      receptorOccupancy: 0,
      group: this.pd?.synergyGroup || 'None'
    };

    if (!this.pd) return effects;

    // The Hill Equation: E = Emax * (Ce^gamma / (Ce^gamma + C50^gamma))
    const gamma = this.pd.gamma || 1;
    const ceGamma = Math.pow(this.Ce, gamma);
    const c50Gamma = Math.pow(this.pd.c50, gamma);
    const fraction = ceGamma / (ceGamma + c50Gamma);

    // Cardiovascular Deltas
    if (this.pd.hrMax) effects.hrDelta = this.pd.hrMax * fraction;
    if (this.pd.sysMax) effects.sysDelta = this.pd.sysMax * fraction;
    if (this.pd.diaMax) effects.diaDelta = this.pd.diaMax * fraction;
    if (this.pd.rrMax) effects.rrDelta = this.pd.rrMax * fraction;

    // Clinical Hypnosis (Used for BIS and surgical responsiveness)
    // Propofol and Midazolam are in the 'Sedative' synergy group
    if (this.classes.includes('Sedative') || 
        this.classes.includes('Hypnotic') || 
        this.classes.includes('Dissociative') || 
        this.classes.includes('Opioid')) {
        effects.hypnoticEffect = fraction;
    }

    // Neuromuscular Junction Occupancy (Used for Train-of-Four calculation)
    if (this.classes.includes('NDMR') || this.classes.includes('Depolarizing NMBA')) {
        effects.receptorOccupancy = fraction;
    }
    
    return effects;
  }
}