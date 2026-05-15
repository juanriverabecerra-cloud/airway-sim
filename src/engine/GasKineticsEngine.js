/**
 * HIGH-FIDELITY INHALATIONAL GAS KINETICS ENGINE (V3.1 - CLINICAL GRADE)
 * Implements:
 * - True Riley Shunt Admixing
 * - Autoregulatory Flow Redistribution
 * - Bulletproof constructor fallbacks for newly mapped agents.
 */

export class GasKineticsModel {
  constructor(agent) {
    this.name = agent?.name || 'Unknown';
    this.mac40 = agent?.mac40 || 1.0;
    this.bgPartition = agent?.bgPartition || 0.5; 
    
    // Fractional Concentrations (0.0 - 1.0 internally)
    this.Fi = 0; // Inspired Fractional Concentration
    this.Fa = 0; // Alveolar Fractional Concentration (End-Tidal)
    this.Fb = 0; // Brain Effect-Site Concentration (Lags VRG due to BBB)
    
    // Tissue Compartments (Equilibrated fractional concentrations)
    this.F_vrg = 0; // Vessel Rich Group (Brain, Heart, Viscera)
    this.F_mg  = 0; // Muscle Group
    this.F_fg  = 0; // Fat Group
    
    // Tissue/Blood Solubility Coefficients (lambda_t/b)
    this.lambda_vrg = agent?.brainBgPartition || 1.2;
    this.lambda_mg = 1.5; 
    // Adipose tissue has massive affinity for halogenated agents. 
    this.lambda_fg = this.name.toLowerCase().includes('nitrous') ? 1.2 : 
                    (this.name.toLowerCase().includes('desflurane') ? 27 : 45); 
  }

  // Receives the dial setting from the UI (0 - 100%)
  setDial(dialPercent) {
    this.Fi = (dialPercent || 0) / 100;
  }

  /**
   * Tick the physics forward
   */
  tick(dt = 1, alveolarVentilation_L_min, cardiacOutput_L_min, frc_L, ibw_kg, shuntFraction) {
    // Internal Euler sub-stepping for differential equation stability
    const subSteps = 10;
    const subDt = dt / subSteps;

    const VA_sec = Math.max(0, alveolarVentilation_L_min / 60);
    const CO_sec = Math.max(0.1, cardiacOutput_L_min / 60);

    // Dynamic Compartment Volume Scaling (Based on 70kg standard)
    const scale = Math.max(0.5, ibw_kg / 70);
    const V_vrg = 6.0 * scale;
    const V_mg  = 33.0 * scale;
    const V_fg  = 14.5 * scale; 

    // Autoregulated Flow Distribution
    // During shock (CO < 4.0 L/min), the body shunts blood away from muscle/fat to preserve the brain/heart
    let q_vrg_ratio = 0.75;
    let q_mg_ratio = 0.19;
    let q_fg_ratio = 0.06;

    if (cardiacOutput_L_min < 4.0) {
        q_vrg_ratio = Math.min(0.95, 0.75 * (5.0 / Math.max(0.1, cardiacOutput_L_min)));
        const remainder = 1.0 - q_vrg_ratio;
        q_mg_ratio = remainder * 0.75;
        q_fg_ratio = remainder * 0.25;
    }

    const Q_vrg = CO_sec * q_vrg_ratio;
    const Q_mg  = CO_sec * q_mg_ratio;
    const Q_fg  = CO_sec * q_fg_ratio;

    for (let i = 0; i < subSteps; i++) {
        // 1. Calculate Mixed Venous Return Concentration (F_v_bar)
        const F_v_bar = (Q_vrg * this.F_vrg + Q_mg * this.F_mg + Q_fg * this.F_fg) / CO_sec;

        // 2. Alveolar Gas Equation (Uptake)
        const Q_cap = CO_sec * (1 - shuntFraction);
        const uptake_vol_sec = Q_cap * this.bgPartition * (this.Fa - F_v_bar);

        // The Concentration Effect
        const concentrationEffectFlux = uptake_vol_sec * this.Fi;

        const dFa = ((VA_sec * (this.Fi - this.Fa)) - uptake_vol_sec + concentrationEffectFlux) / Math.max(0.5, frc_L);
        this.Fa = Math.max(0, this.Fa + dFa * subDt);

        // 3. True Arterial Admixing (Riley Shunt Equation)
        const F_a = (this.Fa * (1 - shuntFraction)) + (F_v_bar * shuntFraction);

        // 4. Tissue Uptake Physics
        this.F_vrg += (Q_vrg * (F_a - this.F_vrg) / (V_vrg * this.lambda_vrg)) * subDt;
        this.F_mg  += (Q_mg  * (F_a - this.F_mg)  / (V_mg  * this.lambda_mg))  * subDt;
        this.F_fg  += (Q_fg  * (F_a - this.F_fg)  / (V_fg  * this.lambda_fg))  * subDt;
    }

    // 5. Blood-Brain Barrier (BBB) Equilibration Delay
    const ke0_brain = 0.45 / 60; 
    this.Fb += ke0_brain * (this.F_vrg - this.Fb) * dt;

    return {
        Fa: this.Fa * 100, 
        Fb: this.Fb * 100  
    };
  }
}