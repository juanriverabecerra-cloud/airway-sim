export class PKPDModel {
  constructor(med, weight) {
    this.name = med.name || 'Unknown';
    this.classes = med.classes || [];
    
    // Defensive PK parameters sanitization
    const rawPk = med.pk || {};
    this.pk = {
      V1: typeof rawPk.V1 === 'number' && Number.isFinite(rawPk.V1) && rawPk.V1 > 0 ? rawPk.V1 : 10.0,
      V2: typeof rawPk.V2 === 'number' && Number.isFinite(rawPk.V2) && rawPk.V2 >= 0 ? rawPk.V2 : 0,
      V3: typeof rawPk.V3 === 'number' && Number.isFinite(rawPk.V3) && rawPk.V3 >= 0 ? rawPk.V3 : 0,
      k10: typeof rawPk.k10 === 'number' && Number.isFinite(rawPk.k10) && rawPk.k10 >= 0 ? rawPk.k10 : 0.05,
      k12: typeof rawPk.k12 === 'number' && Number.isFinite(rawPk.k12) && rawPk.k12 >= 0 ? rawPk.k12 : 0,
      k21: typeof rawPk.k21 === 'number' && Number.isFinite(rawPk.k21) && rawPk.k21 >= 0 ? rawPk.k21 : 0,
      k13: typeof rawPk.k13 === 'number' && Number.isFinite(rawPk.k13) && rawPk.k13 >= 0 ? rawPk.k13 : 0,
      k31: typeof rawPk.k31 === 'number' && Number.isFinite(rawPk.k31) && rawPk.k31 >= 0 ? rawPk.k31 : 0,
      ke0: typeof rawPk.ke0 === 'number' && Number.isFinite(rawPk.ke0) && rawPk.ke0 >= 0 ? rawPk.ke0 : 0.1,
      coSensitivity: typeof rawPk.coSensitivity === 'number' && Number.isFinite(rawPk.coSensitivity) ? Math.max(0, Math.min(1.0, rawPk.coSensitivity)) : 0.5,
      proteinBinding: typeof rawPk.proteinBinding === 'number' && Number.isFinite(rawPk.proteinBinding) ? Math.max(0, Math.min(0.999, rawPk.proteinBinding)) : 0,
      renalFraction: typeof rawPk.renalFraction === 'number' && Number.isFinite(rawPk.renalFraction) ? Math.max(0, Math.min(1.0, rawPk.renalFraction)) : 0,
      hepaticFraction: typeof rawPk.hepaticFraction === 'number' && Number.isFinite(rawPk.hepaticFraction) ? Math.max(0, Math.min(1.0, rawPk.hepaticFraction)) : 0,
    };
    
    // Defensive PD parameters sanitization
    const rawPd = med.pd || {};
    this.pd = {
      c50: typeof rawPd.c50 === 'number' && Number.isFinite(rawPd.c50) && rawPd.c50 > 0 ? rawPd.c50 : 1.0,
      gamma: typeof rawPd.gamma === 'number' && Number.isFinite(rawPd.gamma) && rawPd.gamma > 0 ? rawPd.gamma : 1.0,
      sysMax: typeof rawPd.sysMax === 'number' && Number.isFinite(rawPd.sysMax) ? rawPd.sysMax : 0,
      diaMax: typeof rawPd.diaMax === 'number' && Number.isFinite(rawPd.diaMax) ? rawPd.diaMax : 0,
      hrMax: typeof rawPd.hrMax === 'number' && Number.isFinite(rawPd.hrMax) ? rawPd.hrMax : 0,
      rrMax: typeof rawPd.rrMax === 'number' && Number.isFinite(rawPd.rrMax) ? rawPd.rrMax : 0,
      synergyGroup: typeof rawPd.synergyGroup === 'string' ? rawPd.synergyGroup : 'None',
      inducesApneaAtCe: typeof rawPd.inducesApneaAtCe === 'number' && Number.isFinite(rawPd.inducesApneaAtCe) ? rawPd.inducesApneaAtCe : 999,
      inducesParalysisAtCe: typeof rawPd.inducesParalysisAtCe === 'number' && Number.isFinite(rawPd.inducesParalysisAtCe) ? rawPd.inducesParalysisAtCe : 999,
      receptors: rawPd.receptors ? {
        Alpha1: typeof rawPd.receptors.Alpha1 === 'number' && Number.isFinite(rawPd.receptors.Alpha1) ? rawPd.receptors.Alpha1 : 0,
        Beta1: typeof rawPd.receptors.Beta1 === 'number' && Number.isFinite(rawPd.receptors.Beta1) ? rawPd.receptors.Beta1 : 0,
        Beta2: typeof rawPd.receptors.Beta2 === 'number' && Number.isFinite(rawPd.receptors.Beta2) ? rawPd.receptors.Beta2 : 0,
        V1: typeof rawPd.receptors.V1 === 'number' && Number.isFinite(rawPd.receptors.V1) ? rawPd.receptors.V1 : 0,
      } : undefined
    };

    // Validate and clamp weight
    let w = Number(weight);
    if (isNaN(w) || !isFinite(w) || w <= 0) {
      w = 70.0;
    }
    this.weight = Math.max(1.0, Math.min(500.0, w));
    
    // Compartment amounts in milligrams (mg)
    this.A1 = 0; // Central compartment (Blood plasma)
    this.A2 = 0; // Rapidly equilibrating compartment (Muscle/Organs)
    this.A3 = 0; // Slowly equilibrating compartment (Fat)
    
    this.Ce = 0; // Effect-site concentration (mg/L)
    this.currentInfusionRate = 0; // mg/sec
    this.Cp = 0; // Plasma concentration (mg/L)
    this.dynamicV1 = 0; // Dynamic central volume of distribution (L)
    this.infusionDurationSeconds = 0; // Cumulative duration of active infusion (seconds)
    this.csht = 0; // Context-sensitive half-time (minutes)
    
    this.tciMode = 'none';
    this.tciTarget = 0;
    this.tciModelName = 'Schnider';
  }

  setTci(mode, target, modelName, patient) {
    this.tciMode = mode;
    this.tciTarget = Number(target) || 0;
    if (modelName) {
      this.tciModelName = modelName;
    }
    if (mode !== 'none' && patient) {
      this.updateModelParameters(this.tciModelName, patient);
    }
  }

  updateModelParameters(modelName, patient) {
    const age = patient.age || 40;
    const weight = this.weight;
    const height = patient.height || 170;
    const sex = patient.sex || 'male';

    if (modelName === 'Marsh') {
      this.pk.V1 = 0.228 * weight;
      this.pk.V2 = 0.363 * weight;
      this.pk.V3 = 2.893 * weight;
      this.pk.k10 = 0.119;
      this.pk.k12 = 0.112;
      this.pk.k13 = 0.042;
      this.pk.k21 = 0.055;
      this.pk.k31 = 0.0033;
      this.pk.ke0 = 0.26;
    } else if (modelName === 'Schnider') {
      this.pk.V1 = 4.27;
      this.pk.V2 = 18.9 - 0.391 * (age - 53);
      this.pk.V3 = 238.0;
      const Cl1 = 1.29 - 0.024 * (age - 53);
      this.pk.k10 = Cl1 / this.pk.V1;
      this.pk.k12 = 0.302 - 0.0056 * (age - 53);
      this.pk.k13 = 0.196;
      this.pk.k21 = Cl1 / this.pk.V2;
      this.pk.k31 = 0.0035;
      this.pk.ke0 = 0.456;
    } else if (modelName === 'Paedfusor') {
      this.pk.V1 = 0.458 * weight;
      this.pk.V2 = 1.34 * weight;
      this.pk.V3 = 8.20 * weight;
      this.pk.k10 = 70.0 * Math.pow(weight, -0.3) / 458.3;
      this.pk.k12 = 0.12;
      this.pk.k13 = 0.034;
      this.pk.k21 = 0.041;
      this.pk.k31 = 0.0019;
      this.pk.ke0 = 0.26;
    } else if (modelName === 'Kataria') {
      this.pk.V1 = 0.52 * weight;
      this.pk.V2 = 1.0 * weight;
      this.pk.V3 = 8.2 * weight;
      this.pk.k10 = 0.066;
      this.pk.k12 = 0.113;
      this.pk.k13 = 0.051;
      this.pk.k21 = 0.059;
      this.pk.k31 = 0.0032;
      this.pk.ke0 = 0.26;
    } else if (modelName === 'Domino') {
      this.pk.V1 = 0.063 * weight;
      this.pk.V2 = 0.207 * weight;
      this.pk.V3 = 1.51 * weight;
      this.pk.k10 = 0.4381;
      this.pk.k12 = 0.5921;
      this.pk.k13 = 0.59;
      this.pk.k21 = 0.2470;
      this.pk.k31 = 0.0146;
      this.pk.ke0 = 0.15;
    }
  }

  // Administer a bolus (instantly enters V1)
  giveBolus(doseMg) {
    const d = Number(doseMg);
    if (!isNaN(d) && isFinite(d) && d > 0) {
      this.A1 = Math.max(0, Math.min(1e9, this.A1 + d));
    }
  }

  // Physical removal of drug mass (e.g., Sugammadex encapsulation)
  chelate(fraction) {
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
  setInfusion(rateMgPerSec) {
    let r = Number(rateMgPerSec);
    if (isNaN(r) || !isFinite(r) || r < 0) {
      r = 0;
    }
    this.currentInfusionRate = Math.min(1e6, r);
  }

  /**
   * Ticks the physics forward
   * @param {number} dt seconds
   * @param {number} coRatio Current CO / Baseline CO (1.0 = normal)
   * @param {number} v1VolumeRatio Current Blood Vol / Baseline EBV (Hemoconcentration modifier)
   * @param {number} renalRatio GFR clearance ratio (1.0 = normal)
   * @param {number} pdSensitivityCoeff Sensitivity modifier (1.0 = normal)
   * @param {number} hepaticRatio Hepatic clearance ratio (1.0 = normal)
   */
  tick(
    dt = 1,
    coRatio = 1.0,
    v1VolumeRatio = 1.0,
    renalRatio = 1.0,
    pdSensitivityCoeff = 1.0,
    hepaticRatio = 1.0,
    bcheMultiplier = 1.0,
    hofmannMultiplier = 1.0,
    lCysteineCe = 0.0
  ) {
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

    let safeBcheMultiplier = Number(bcheMultiplier);
    if (isNaN(safeBcheMultiplier) || !isFinite(safeBcheMultiplier) || safeBcheMultiplier < 0) {
      safeBcheMultiplier = 1.0;
    }

    let safeHofmannMultiplier = Number(hofmannMultiplier);
    if (isNaN(safeHofmannMultiplier) || !isFinite(safeHofmannMultiplier) || safeHofmannMultiplier < 0) {
      safeHofmannMultiplier = 1.0;
    }

    let safeLCysteineCe = Number(lCysteineCe);
    if (isNaN(safeLCysteineCe) || !isFinite(safeLCysteineCe) || safeLCysteineCe < 0) {
      safeLCysteineCe = 0.0;
    }

    // Internal sub-stepping for numerical stability (10 steps per tick)
    const subSteps = 10;
    const subDt = safeDt / subSteps;

    // Apply flow-dependency to elimination (k10) and distribution (k12, k13)
    const coMod = Math.max(0, 1 + (safeCoRatio - 1) * (this.pk.coSensitivity !== undefined ? this.pk.coSensitivity : 0.5));
    
    let k10Raw = this.pk.k10 || 0;

    // Apply Chapter 27 dynamic clearance multipliers
    if (this.name === 'Succinylcholine') {
      k10Raw *= safeBcheMultiplier;
    } else if (this.name === 'Atracurium' || this.name === 'Cisatracurium') {
      k10Raw *= safeHofmannMultiplier;
    } else if (this.name === 'Gantacurium' || this.name === 'CW002') {
      if (safeLCysteineCe > 0.01) {
        k10Raw *= (1.0 + 20.0 * (safeLCysteineCe / (safeLCysteineCe + 0.5)));
      }
    }
    
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
    let ke0Mod;
    if (this.classes.includes('Sedative') || this.classes.includes('Hypnotic') || this.classes.includes('Opioid')) {
      // Cerebral autoregulation preserves brain blood flow (and ke0) until severe shock
      ke0Mod = safeCoRatio < 0.5 ? (safeCoRatio * 2) : 1.0; 
    } else {
      // Systemic/Muscle perfusion drops linearly with CO (delays paralytic/pressor onset in shock)
      ke0Mod = Math.max(0.1, safeCoRatio);
    }
    const ke0 = ((this.pk.ke0 || 0.1) / 60) * ke0Mod;

    // Track active infusion time (seconds)
    if (this.currentInfusionRate > 0) {
      this.infusionDurationSeconds += safeDt;
    }

    // Calculate Context-Sensitive Half-Time (CSHT) in minutes
    const tInf = this.infusionDurationSeconds / 60; // in minutes
    if (this.name === 'Remifentanil') {
      this.csht = 3.5;
    } else if (this.name === 'Propofol') {
      this.csht = 3.0 + 37.0 * tInf / (tInf + 80.0);
    } else if (this.name === 'Fentanyl') {
      this.csht = 5.0 + 300.0 * Math.pow(tInf, 1.2) / (Math.pow(tInf, 1.2) + 120.0);
    } else if (this.name === 'Sufentanil') {
      this.csht = 4.0 + 80.0 * tInf / (tInf + 240.0);
    } else if (this.name === 'Midazolam') {
      this.csht = 5.0 + 150.0 * tInf / (tInf + 180.0);
    } else {
      this.csht = 0;
    }

    // Dynamic V1 based on hemorrhage / massive fluid resuscitation and cardiac output (front-end recirculatory model)
    const dynamicV1 = Math.max(0.1, this.pk.V1 * safeV1VolumeRatio * (0.6 + 0.4 * safeCoRatio));
    this.dynamicV1 = dynamicV1;

    // Protein Binding & Free Fraction
    const proteinBinding = this.pk.proteinBinding || 0;
    const freeFraction = 1.0 - proteinBinding; 
    // Severe hemodilution (v1VolumeRatio > 1.2) dilutes plasma proteins, increasing free fraction.
    const effectiveFreeFraction = Math.min(1.0, freeFraction * (safeV1VolumeRatio > 1.2 ? 1.2 : 1.0));

    for (let i = 0; i < subSteps; i++) {
      if (this.tciMode === 'Cp' || this.tciMode === 'Ce') {
        let targetCp = this.tciTarget;
        if (this.tciMode === 'Ce') {
          // Ce-controlled overshoot targeting
          targetCp = Math.max(0, Math.min(3.0 * this.tciTarget, this.tciTarget + (this.tciTarget - this.Ce) * 1.5));
        }
        const targetA1 = targetCp * dynamicV1;
        // Euler backward-solving for required infusion rate (mg/sec)
        const reqInfRate = (targetA1 - this.A1) / subDt + (k10 + k12 + k13) * this.A1 - k21 * this.A2 - k31 * this.A3;
        this.currentInfusionRate = Math.max(0, reqInfRate);
      }

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
      this.Cp = Cp;
      this.Ce += ke0 * (Cp - this.Ce) * subDt;
      this.Ce = Math.max(0, Math.min(1e9, this.Ce));
    }

    return this.getEffects(safePdSensitivityCoeff);
  }

  // Hill Equation for Pharmacodynamics
  getEffects(pdSensitivityCoeff = 1.0) {
    const effects = { 
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
      const gamma = Math.max(0.001, Math.min(100.0, this.pd.gamma || 1.0));
      const safeCe = Math.max(0, this.Ce); 
      const activeCe = safeCe * pdSensitivityCoeff;
      if (activeCe > 0) {
        // Base-ratio division to mathematically prevent floating point overflows to Infinity
        if (activeCe >= this.pd.c50) {
          const ratio = this.pd.c50 / activeCe;
          fraction = 1.0 / (1.0 + Math.pow(ratio, gamma));
        } else {
          const ratio = activeCe / this.pd.c50;
          const power = Math.pow(ratio, gamma);
          fraction = power / (1.0 + power);
        }
      }
    }
    if (isNaN(fraction) || !isFinite(fraction)) {
      fraction = 0.5; // Defensive fallback
    }
    fraction = Math.max(0, Math.min(1.0, fraction));
    if (fraction < 1e-15) fraction = 0.0;
    if (fraction > 1.0 - 1e-15) fraction = 1.0;

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
    
    // Prevent negative zero (-0) propagation in clinical deltas
    effects.hrDelta += 0;
    effects.sysDelta += 0;
    effects.diaDelta += 0;
    effects.rrDelta += 0;

    return effects;
  }
}