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
    this.mac40 = Number.isFinite(agent?.mac40) && agent.mac40 > 0 ? agent.mac40 : 1.0;
    this.bgPartition = Number.isFinite(agent?.bgPartition) && agent.bgPartition > 0 ? Math.max(0.01, agent.bgPartition) : 0.5; 
    
    // Fractional Concentrations (0.0 - 1.0 internally)
    this.Fi = 0; // Inspired Fractional Concentration
    this.Fa = 0; // Alveolar Fractional Concentration (End-Tidal)
    this.Fb = 0; // Brain Effect-Site Concentration (Lags VRG due to BBB)
    
    // Tissue Compartments (Equilibrated fractional concentrations)
    this.F_vrg = 0; // Vessel Rich Group (Brain, Heart, Viscera)
    this.F_mg  = 0; // Muscle Group
    this.F_fg  = 0; // Fat Group
    
    // Tissue/Blood Solubility Coefficients (lambda_t/b)
    this.lambda_vrg = Number.isFinite(agent?.brainBgPartition) && agent.brainBgPartition > 0 ? agent.brainBgPartition : 1.2;
    this.lambda_mg = 1.5; 
    // Adipose tissue has massive affinity for halogenated agents. 
    this.lambda_fg = this.name.toLowerCase().includes('nitrous') ? 1.2 : 
                    (this.name.toLowerCase().includes('desflurane') ? 27.0 : 45.0); 
  }

  // Receives the dial setting from the UI (0 - 100%)
  setDial(dialPercent) {
    const val = Number.isFinite(dialPercent) ? dialPercent : 0;
    this.Fi = Math.max(0, Math.min(1.0, val / 100));
  }

  /**
   * Tick the physics forward
   */
  tick(dt = 1, alveolarVentilation_L_min, cardiacOutput_L_min, frc_L, ibw_kg, shuntFraction) {
    // Internal Euler sub-stepping for differential equation stability
    const subSteps = 10;
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 1;
    const subDt = safeDt / subSteps;

    const safeVA = Number.isFinite(alveolarVentilation_L_min) ? alveolarVentilation_L_min : 4.0;
    const safeCO = Number.isFinite(cardiacOutput_L_min) ? cardiacOutput_L_min : 5.0;
    const safeFrc = Number.isFinite(frc_L) && frc_L > 0 ? frc_L : 2.5;
    const safeIbw = Number.isFinite(ibw_kg) && ibw_kg > 0 ? ibw_kg : 70;
    const safeShunt = Number.isFinite(shuntFraction) ? Math.max(0, Math.min(0.99, shuntFraction)) : 0;

    const VA_sec = Math.max(0, safeVA / 60);
    const CO_sec = Math.max(0.1, safeCO / 60);

    // Dynamic Compartment Volume Scaling (Based on 70kg standard)
    const scale = Math.max(0.5, safeIbw / 70);
    const V_vrg = 6.0 * scale;
    const V_mg  = 33.0 * scale;
    const V_fg  = 14.5 * scale; 

    // Autoregulated Flow Distribution
    // During shock (CO < 4.0 L/min), the body shunts blood away from muscle/fat to preserve the brain/heart
    let q_vrg_ratio = 0.75;
    let q_mg_ratio = 0.19;
    let q_fg_ratio = 0.06;

    if (safeCO < 4.0) {
        q_vrg_ratio = Math.min(0.95, 0.75 * (5.0 / Math.max(0.1, safeCO)));
        const remainder = 1.0 - q_vrg_ratio;
        q_mg_ratio = remainder * 0.75;
        q_fg_ratio = remainder * 0.25;
    }

    const Q_vrg = CO_sec * q_vrg_ratio;
    const Q_mg  = CO_sec * q_mg_ratio;
    const Q_fg  = CO_sec * q_fg_ratio;

    // Numerical Finiteness Safeguards before loop
    if (!Number.isFinite(this.Fi)) this.Fi = 0;
    if (!Number.isFinite(this.Fa)) this.Fa = 0;
    if (!Number.isFinite(this.F_vrg)) this.F_vrg = 0;
    if (!Number.isFinite(this.F_mg)) this.F_mg = 0;
    if (!Number.isFinite(this.F_fg)) this.F_fg = 0;

    const safeLambdaVrg = Math.max(0.01, this.lambda_vrg);
    const safeLambdaMg = Math.max(0.01, this.lambda_mg);
    const safeLambdaFg = Math.max(0.01, this.lambda_fg);

    for (let i = 0; i < subSteps; i++) {
        // 1. Calculate Mixed Venous Return Concentration (F_v_bar)
        let F_v_bar = (Q_vrg * this.F_vrg + Q_mg * this.F_mg + Q_fg * this.F_fg) / CO_sec;
        if (!Number.isFinite(F_v_bar)) F_v_bar = 0;

        // 2. Alveolar Gas Equation (Uptake)
        const Q_cap = CO_sec * (1 - safeShunt);
        const uptake_vol_sec = Q_cap * this.bgPartition * (this.Fa - F_v_bar);

        // The Concentration Effect
        const concentrationEffectFlux = uptake_vol_sec * this.Fi;

        const dFa = ((VA_sec * (this.Fi - this.Fa)) - uptake_vol_sec + concentrationEffectFlux) / Math.max(0.5, safeFrc);
        if (Number.isFinite(dFa)) {
            this.Fa = Math.max(0, this.Fa + dFa * subDt);
        }

        // 3. True Arterial Admixing (Riley Shunt Equation)
        let F_a = (this.Fa * (1 - safeShunt)) + (F_v_bar * safeShunt);
        if (!Number.isFinite(F_a)) F_a = this.Fa;

        // 4. Tissue Uptake Physics
        const dF_vrg = Q_vrg * (F_a - this.F_vrg) / Math.max(0.01, V_vrg * safeLambdaVrg);
        if (Number.isFinite(dF_vrg)) this.F_vrg += dF_vrg * subDt;

        const dF_mg = Q_mg * (F_a - this.F_mg) / Math.max(0.01, V_mg * safeLambdaMg);
        if (Number.isFinite(dF_mg)) this.F_mg += dF_mg * subDt;

        const dF_fg = Q_fg * (F_a - this.F_fg) / Math.max(0.01, V_fg * safeLambdaFg);
        if (Number.isFinite(dF_fg)) this.F_fg += dF_fg * subDt;
    }

    // 5. Blood-Brain Barrier (BBB) Equilibration Delay
    const ke0_brain = 0.45 / 60; 
    if (!Number.isFinite(this.Fb)) this.Fb = 0;
    const dFb = ke0_brain * (this.F_vrg - this.Fb) * safeDt;
    if (Number.isFinite(dFb)) {
        this.Fb += dFb;
    }

    // Secondary sanity bounds clamp
    if (!Number.isFinite(this.Fa)) this.Fa = 0;
    if (!Number.isFinite(this.Fb)) this.Fb = 0;

    return {
        Fa: this.Fa * 100, 
        Fb: this.Fb * 100  
    };
  }
}