/**
 * TRUE PHARMACOKINETIC / PHARMACODYNAMIC (PK/PD) ENGINE
 * Uses Euler integration to model 1, 2, or 3-compartment drug distribution and effect-site equilibration.
 */

export class PKPDModel {
  constructor(med, weight) {
    this.name = med.name;
    this.pk = med.pk; // V1, V2, V3, k10, k12, k21, k13, k31, ke0
    this.pd = med.pd; // c50, gamma, maxEffects
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

  // Set continuous infusion rate
  setInfusion(rateMgPerSec) {
    this.currentInfusionRate = rateMgPerSec;
  }

  // Tick the physics forward by 'dt' seconds
  tick(dt = 1) {
    // 1. Convert rates from per-minute (standard PK) to per-second
    const k10 = (this.pk.k10 || 0) / 60;
    const k12 = (this.pk.k12 || 0) / 60;
    const k21 = (this.pk.k21 || 0) / 60;
    const k13 = (this.pk.k13 || 0) / 60;
    const k31 = (this.pk.k31 || 0) / 60;
    const ke0 = (this.pk.ke0 || 0.1) / 60; 

    // 2. Add continuous infusion to Central Compartment
    this.A1 += this.currentInfusionRate * dt;

    // 3. Calculate flux between compartments (Euler Integration)
    const flux10 = k10 * this.A1 * dt; // Elimination
    const flux12 = k12 * this.A1 * dt; // V1 -> V2
    const flux21 = k21 * this.A2 * dt; // V2 -> V1
    const flux13 = k13 * this.A1 * dt; // V1 -> V3
    const flux31 = k31 * this.A3 * dt; // V3 -> V1

    // 4. Update compartment masses
    this.A1 = Math.max(0, this.A1 - flux10 - flux12 + flux21 - flux13 + flux31);
    this.A2 = Math.max(0, this.A2 + flux12 - flux21);
    this.A3 = Math.max(0, this.A3 + flux13 - flux31);

    // 5. Calculate Plasma Concentration (Cp) in mg/L
    const Cp = this.A1 / this.pk.V1;

    // 6. Calculate Effect-Site Concentration (Ce)
    // dCe/dt = ke0 * (Cp - Ce)
    this.Ce += ke0 * (Cp - this.Ce) * dt;

    return this.getEffects();
  }

  // Hill Equation for Pharmacodynamics
  getEffects() {
    let effects = { hrDelta: 0, sysDelta: 0, sedation: 0 };
    if (!this.pd) return effects;

    // E = Emax * (Ce^gamma / (Ce^gamma + C50^gamma))
    const ceGamma = Math.pow(this.Ce, this.pd.gamma || 1);

    if (this.pd.hrMax) {
      const c50GammaHr = Math.pow(this.pd.c50_hr || this.pd.c50, this.pd.gamma || 1);
      effects.hrDelta = this.pd.hrMax * (ceGamma / (ceGamma + c50GammaHr));
    }
    if (this.pd.sysMax) {
      const c50GammaSys = Math.pow(this.pd.c50_sys || this.pd.c50, this.pd.gamma || 1);
      effects.sysDelta = this.pd.sysMax * (ceGamma / (ceGamma + c50GammaSys));
    }
    
    return effects;
  }
}