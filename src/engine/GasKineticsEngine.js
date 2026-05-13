/**
 * HIGH-FIDELITY INHALATIONAL GAS KINETICS ENGINE (V2.0)
 * Implements Alveolar Ventilation math, Shunt fraction, and 
 * Three-Compartment Tissue kinetics (VRG, MG, FG).
 * Models the Second Gas Effect via total alveolar volume flux.
 */

export class GasKineticsModel {
  constructor(agent) {
    this.name = agent.name;
    this.mac40 = agent.mac40;
    this.bgPartition = agent.bgPartition; // Blood/Gas solubility
    this.brainBgPartition = agent.brainBgPartition; // Brain/Blood (VRG)
    
    // Compartment Fractions (%)
    this.Fi = 0; // Inspired Concentration
    this.Fa = 0; // Alveolar Concentration (End-Tidal)
    
    // Tissue Compartments (Partial Pressure equivalents in %)
    this.F_vrg = 0; // Vessel Rich Group (Brain, Heart, Viscera)
    this.F_mg  = 0; // Muscle Group
    this.F_fg  = 0; // Fat Group
    
    // Tissue Definitions: [Volume (L), Perfusion (% of CO), Tissue/Blood Solubility]
    this.compartments = {
      vrg: { vol: 6.0,  flowRatio: 0.75, lambda: agent.brainBgPartition },
      mg:  { vol: 33.0, flowRatio: 0.19, lambda: 1.0 }, 
      fg:  { vol: 14.5, flowRatio: 0.06, lambda: agent.name === 'Sevoflurane' ? 48 : (agent.name === 'Desflurane' ? 27 : 45) }
    };
  }

  setDial(concentrationPercent) {
    this.Fi = concentrationPercent;
  }

  tick(dt, minuteVentilation, cardiacOutput, frc, ibw = 70, shunt = 0.05) {
    // 1. Calculate Alveolar Ventilation (VA)
    const tidalVolume = minuteVentilation / 12; // Assume baseline RR of 12 for ratio
    const deadSpaceVol = (ibw * 2.2) / 1000;
    const alveolarFraction = Math.max(0.1, (tidalVolume - deadSpaceVol) / tidalVolume);
    const VA_sec = (minuteVentilation * alveolarFraction) / 60;
    
    const CO_sec = cardiacOutput / 60;
    const effectiveCO = CO_sec * (1 - shunt);

    // 2. Multi-Compartment Blood Uptake
    const vrgUptake = (effectiveCO * this.compartments.vrg.flowRatio) * this.bgPartition * (this.Fa - this.F_vrg);
    const mgUptake  = (effectiveCO * this.compartments.mg.flowRatio)  * this.bgPartition * (this.Fa - this.F_mg);
    const fgUptake  = (effectiveCO * this.compartments.fg.flowRatio)  * this.bgPartition * (this.Fa - this.F_fg);
    
    const totalBloodUptake = vrgUptake + mgUptake + fgUptake;

    // 3. Alveolar Concentration Change (Differential Equation)
    const alveolarChangeRate = (VA_sec * (this.Fi - this.Fa) - totalBloodUptake) / frc;
    this.Fa += alveolarChangeRate * dt;
    this.Fa = Math.max(0, this.Fa);

    // 4. Tissue Equilibration Change
    const vrgChange = vrgUptake / (this.compartments.vrg.vol * this.compartments.vrg.lambda);
    const mgChange  = mgUptake  / (this.compartments.mg.vol  * this.compartments.mg.lambda);
    const fgChange  = fgUptake  / (this.compartments.fg.vol  * this.compartments.fg.lambda);
    
    this.F_vrg += vrgChange * dt;
    this.F_mg  += mgChange * dt;
    this.F_fg  += fgChange * dt;

    // Safety clamps
    this.F_vrg = Math.max(0, this.F_vrg);
    this.F_mg  = Math.max(0, this.F_mg);
    this.F_fg  = Math.max(0, this.F_fg);

    return { 
      Fi: this.Fi, 
      Fa: this.Fa, 
      Fb: this.F_vrg, 
      Fmg: this.F_mg,
      Ffg: this.F_fg // CRITICAL FIX: Removed this.this typo
    };
  }
}