/**
 * HIGH-FIDELITY PK/PD ENGINE (V4.0)
 * Uses multi-compartment mammillary modeling with flow-dependent clearance.
 * Implements dynamic V1 (hemoconcentration/dilution), protein-binding free fractions,
 * and organ-specific perfusion-coupled ke0 (Cerebral Autoregulation vs Systemic).
 * CA-1 INTEGRATION: Dynamic SVR/CO multipliers based on specific receptor affinities.
 */

export class PKPDModel {
  constructor(med, weight) {
    this.name = med.name;
    this.pk = med.pk; // V1, V2, V3, k10, k12, k21, k13, k31, ke0, coSensitivity
    this.pd = med.pd; // c50, gamma, maxEffects, mechanism, receptors
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
   * @param {number} v1VolumeRatio Current Blood Vol / Baseline EBV (Hemoconcentration modifier)
   */
  tick(dt = 1, coRatio = 1.0, v1VolumeRatio = 1.0, renalRatio = 1.0, pdSensitivityCoeff = 1.0, hepaticRatio = 1.0) {
    // Internal sub-stepping for numerical stability (10 steps per tick)
    const subSteps = 10;
    const subDt = dt / subSteps;

    // Apply flow-dependency to elimination (k10) and distribution (k12, k13)
    const coMod = 1 + (coRatio - 1) * (this.pk.coSensitivity || 0.5);
    
    let k10Raw = this.pk.k10 || 0;
    // Apply GFR-dependent and hepatic-dependent clearance for specific drugs
    const lowercaseName = this.name.toLowerCase();
    if (lowercaseName === 'sugammadex') {
        k10Raw *= renalRatio;
    } else if (lowercaseName === 'vecuronium') {
        // ~60% biliary/hepatic excretion, ~40% renal
        k10Raw *= (0.6 * hepaticRatio + 0.4 * renalRatio);
    } else if (lowercaseName === 'rocuronium') {
        // ~70% biliary/hepatic excretion, ~30% renal
        k10Raw *= (0.7 * hepaticRatio + 0.3 * renalRatio);
    } else if (lowercaseName === 'neostigmine') {
        k10Raw *= (0.5 + 0.5 * renalRatio);
    } else if (lowercaseName === 'pancuronium') {
        k10Raw *= (0.4 * hepaticRatio + 0.6 * renalRatio);
    } else if (lowercaseName === 'meperidine') {
        k10Raw *= (0.7 * hepaticRatio + 0.3 * renalRatio);
    } else if (lowercaseName === 'fentanyl' || lowercaseName === 'propofol' || lowercaseName === 'midazolam' || lowercaseName === 'lidocaine') {
        k10Raw *= hepaticRatio;
    }

    const k10 = (k10Raw / 60) * coMod;
    const k12 = ((this.pk.k12 || 0) / 60) * coMod;
    const k21 = (this.pk.k21 || 0) / 60;
    const k13 = ((this.pk.k13 || 0) / 60) * coMod;
    const k31 = (this.pk.k31 || 0) / 60;

    // Autoregulation of Effect-Site Equilibration (ke0)
    let ke0Mod = 1.0;
    if (this.classes.includes('Sedative') || this.classes.includes('Hypnotic') || this.classes.includes('Opioid')) {
        // Cerebral autoregulation preserves brain blood flow (and ke0) until severe shock
        ke0Mod = coRatio < 0.5 ? (coRatio * 2) : 1.0; 
    } else {
        // Systemic/Muscle perfusion drops linearly with CO (delays paralytic/pressor onset in shock)
        ke0Mod = Math.max(0.1, coRatio);
    }
    const ke0 = ((this.pk.ke0 || 0.1) / 60) * ke0Mod;

    // Dynamic V1 based on hemorrhage / massive fluid resuscitation
    // A drop in blood volume shrinks V1, concentrating the drug aggressively.
    const dynamicV1 = Math.max(0.1, this.pk.V1 * v1VolumeRatio);

    // Protein Binding & Free Fraction
    // Only the unbound fraction of the drug is active and crosses into Ce.
    const proteinBinding = this.pk.proteinBinding || 0;
    const freeFraction = 1.0 - proteinBinding; 
    // Severe hemodilution (v1VolumeRatio > 1.2) dilutes plasma proteins, increasing free fraction.
    const effectiveFreeFraction = Math.min(1.0, freeFraction * (v1VolumeRatio > 1.2 ? 1.2 : 1.0));

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

      // 4. Update Effect-Site Concentration (Ce) driven by Unbound Plasma Concentration
      const Cp = (this.A1 / dynamicV1) * effectiveFreeFraction;
      this.Ce += ke0 * (Cp - this.Ce) * subDt;
    }

    return this.getEffects(pdSensitivityCoeff);
  }

  // Hill Equation for Pharmacodynamics
  getEffects(pdSensitivityCoeff = 1.0) {
    let effects = { 
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

    // Bulletproof against NaN divide-by-zero for Chelators (Sugammadex c50 = 0)
    let fraction = 0;
    if (this.pd.c50 && this.pd.c50 > 0) {
        const gamma = this.pd.gamma || 1;
        const safeCe = Math.max(0, this.Ce); 
        const activeCe = safeCe * pdSensitivityCoeff;
        const ceGamma = Math.pow(activeCe, gamma);
        const c50Gamma = Math.pow(this.pd.c50, gamma);
        fraction = ceGamma / (ceGamma + c50Gamma);
    }

    // Direct Deltas for non-vasopressor agents (Sedatives, Opioids)
    if (this.pd.sysMax && !this.pd.receptors) effects.sysDelta = this.pd.sysMax * fraction;
    if (this.pd.diaMax && !this.pd.receptors) effects.diaDelta = this.pd.diaMax * fraction;
    if (this.pd.hrMax && !this.pd.receptors) effects.hrDelta = this.pd.hrMax * fraction;
    if (this.pd.rrMax) effects.rrDelta = this.pd.rrMax * fraction;

    // HIGH-FIDELITY VASOPRESSOR / RECEPTOR COUPLING (CA-1 Integration)
    // Modifies underlying SVR and CO rather than flat BP deltas
    if (this.pd.receptors) {
        let alpha1 = this.pd.receptors.Alpha1 || 0;
        let beta1 = this.pd.receptors.Beta1 || 0;
        let beta2 = this.pd.receptors.Beta2 || 0;
        let v1 = this.pd.receptors.V1 || 0;

        // SVR is driven heavily by Alpha-1 and V1, antagonized by Beta-2
        let svrIncrease = (alpha1 * 0.25 * fraction) + (v1 * 0.30 * fraction);
        let svrDecrease = (beta2 * 0.15 * fraction);
        effects.svrMultiplier += (svrIncrease - svrDecrease);

        // Cardiac Output (Contractility) is driven purely by Beta-1
        let coIncrease = (beta1 * 0.25 * fraction);
        effects.coMultiplier += coIncrease;
        
        // Beta-1 directly drives chronotropy
        effects.hrDelta += (beta1 * 15 * fraction);
        
        // Baroreceptor Reflex Simulation: 
        // Pure Alpha-1 / V1 triggers reflex bradycardia if beta-1 is absent to offset it
        if (alpha1 > 0 && beta1 === 0) effects.hrDelta -= (alpha1 * 5 * fraction);
        if (v1 > 0 && beta1 === 0) effects.hrDelta -= (v1 * 5 * fraction);
    }

    // Clinical Hypnosis (Used for BIS and surgical responsiveness)
    if (this.classes.includes('Sedative') || 
        this.classes.includes('Hypnotic') || 
        this.classes.includes('Dissociative') || 
        this.classes.includes('Opioid')) {
        effects.hypnoticEffect = fraction;
    }

    // Neuromuscular Junction Occupancy (Used for Train-of-Four calculation)
    if (this.classes.includes('NDMR') || this.classes.includes('Depolarizing NMBA') || this.classes.includes('NMBA')) {
        effects.receptorOccupancy = fraction;
    }
    
    return effects;
  }
}