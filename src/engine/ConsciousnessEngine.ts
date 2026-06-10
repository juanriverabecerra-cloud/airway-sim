export interface ConsciousnessInputs {
  propofolCe: number;
  dexmedCe: number;
  thiopentalCe: number;
  midazolamCe: number;
  ketamineCe: number;
  etomidateCe: number;
  atipamezoleCe: number;
  methylphenidateCe: number;
  scopolamineCe: number;
  sevoMac: number;
  isoMac: number;
  haloMac: number;
  n2oMac: number;
  isSyncShock: boolean;
  time: number;
}

export class ConsciousnessEngine {
  /**
   * Ticks the consciousness, subcortical sleep-wake pathways, and memory networks forward by 1 second.
   * Leverages 10x Euler sub-stepping for numerical stability of volatile receptor/transmembrane kinetics.
   */
  static tick(
    dt: number = 1,
    patient: any,
    vitals: any,
    inputs: ConsciousnessInputs
  ): any {
    const subSteps = 10;
    const subDt = dt / subSteps;

    // Retrieve previous states or establish baselines (1.0 = fully wake/active, 0.0 = completely silent)
    let lc = typeof patient.lcActivity === 'number' ? patient.lcActivity : 1.0;
    let tmn = typeof patient.tmnActivity === 'number' ? patient.tmnActivity : 1.0;
    let vlpo = typeof patient.vlpoActivity === 'number' ? patient.vlpoActivity : 0.0;
    let mnpo = typeof patient.mnpoActivity === 'number' ? patient.mnpoActivity : 0.0;
    let ldtPpt = typeof patient.ldtPptActivity === 'number' ? patient.ldtPptActivity : 1.0;
    let prf = typeof patient.prfActivity === 'number' ? patient.prfActivity : 1.0;
    let vta = typeof patient.vtaActivity === 'number' ? patient.vtaActivity : 1.0;
    let orexin = typeof patient.orexinLevel === 'number' ? patient.orexinLevel : (patient.narcolepsy ? 0.1 : 1.0);
    let soPower = typeof patient.slowOscillationPower === 'number' ? patient.slowOscillationPower : 0.1;

    // 1. Numerical Integration Loop (Euler Sub-stepping)
    for (let i = 0; i < subSteps; i++) {
      // Competitive antagonism: Atipamezole blocks Dexmedetomidine at Alpha-2 receptors in the LC
      const effectiveDexCe = inputs.dexmedCe / (1.0 + inputs.atipamezoleCe * 8.0);
      
      // Locus Ceruleus noradrenergic activity deactivation
      const lcTarget = Math.max(0.01, 1.0 
        - 0.9 * (patient.alpha2AKnockout ? 0.0 : effectiveDexCe) // alpha-2A receptor knockout confers dexmed resistance in LC
        - 0.5 * inputs.propofolCe 
        - 0.4 * inputs.thiopentalCe 
        - 0.4 * inputs.haloMac 
        + 0.3 * inputs.ketamineCe // Ketamine increases LC activity
        - 0.8 * vlpo
      );
      lc += (lcTarget - lc) * 0.1 * subDt;

      // TMN histaminergic deactivation (propofol-resistant in specific genetic variant)
      const propofolTmnEffect = patient.tmnPropofolResistant ? 0.0 : 0.85 * inputs.propofolCe;
      const tmnTarget = Math.max(0.01, 1.0 
        - propofolTmnEffect 
        - 0.7 * inputs.thiopentalCe 
        - 0.6 * inputs.haloMac 
        - 0.8 * vlpo
      );
      tmn += (tmnTarget - tmn) * 0.1 * subDt;

      // VLPO sleep-promoting GABA/galanin activation
      const vlpoTarget = Math.min(1.0, 
        0.8 * inputs.propofolCe 
        + 0.7 * inputs.thiopentalCe 
        + 0.9 * effectiveDexCe 
        + 0.5 * inputs.isoMac // Isoflurane depolarizes sleep-active VLPO neurons
      );
      vlpo += (vlpoTarget - vlpo) * 0.1 * subDt;

      // Orexin arousal drive depletion (spared by halothane)
      const orexinBase = patient.narcolepsy ? 0.1 : 1.0;
      const orexinTarget = Math.max(0.0, orexinBase 
        - 0.8 * inputs.propofolCe 
        - 0.6 * inputs.sevoMac 
        - 0.6 * inputs.isoMac
      );
      orexin += (orexinTarget - orexin) * 0.1 * subDt;

      // LDT/PPT cholinergic activity deactivation (sleep spindles during halothane/isoflurane)
      const ldtPptTarget = Math.max(0.01, 1.0 
        - 0.6 * inputs.propofolCe 
        - 0.5 * inputs.haloMac 
        - 0.5 * inputs.isoMac
      );
      ldtPpt += (ldtPptTarget - ldtPpt) * 0.1 * subDt;

      // Pontine Reticular Formation (PRF) GABA-ergic deactivation
      const prfTarget = Math.max(0.01, 1.0 
        - 0.75 * inputs.isoMac 
        - 0.7 * inputs.propofolCe
      );
      prf += (prfTarget - prf) * 0.1 * subDt;

      // Ventral Tegmental Area (VTA) dopaminergic activity
      const vtaTarget = Math.max(0.01, Math.min(2.0, 1.0 
        - 0.4 * inputs.propofolCe 
        + 1.2 * inputs.methylphenidateCe // Methylphenidate strongly excites VTA
      ));
      vta += (vtaTarget - vta) * 0.15 * subDt;

      // Slow delta oscillation power build-up (propofol causes rapid delta fragmentation within 5s of LOC)
      const soPowerTarget = 2.5 * inputs.propofolCe + 1.8 * inputs.sevoMac + 1.5 * inputs.isoMac;
      soPower += (soPowerTarget - soPower) * 0.25 * subDt;
    }

    // 2. Connectivity & Pathway Coherences (Functional & Effective Connectivity)
    // Nonspecific thalamocortical path disconnection best accounts for propofol/sevo LOC
    const thalamocortical = Math.max(0.0, Math.min(1.0, 1.0 
      - 0.9 * inputs.propofolCe 
      - 0.85 * inputs.sevoMac 
      - 0.8 * inputs.isoMac 
      - 0.7 * inputs.midazolamCe 
      + 0.2 * inputs.ketamineCe // Ketamine spares or activates thalamic connectivity
    ));

    // Frontoparietal feedback (top-down) directional connectivity disruption
    const frontoparietal = Math.max(0.0, Math.min(1.0, 1.0 
      - 0.95 * inputs.propofolCe 
      - 0.9 * inputs.sevoMac 
      - 0.85 * inputs.isoMac 
      - 0.85 * inputs.midazolamCe 
      - 0.8 * inputs.thiopentalCe 
      - 0.7 * inputs.ketamineCe
    ));

    // Global corticocortical phase synchronization
    const corticocortical = frontoparietal * (1.0 - Math.min(0.85, soPower * 0.08));

    // Frontal cortex-basal ganglia functional connectivity (putamen/caudate disconnect)
    const basalGanglia = Math.max(0.0, Math.min(1.0, 1.0 
      - 0.85 * inputs.isoMac 
      - 0.8 * inputs.propofolCe
    ));

    // 3. Receptor-Level Binding and Mutational Knockouts
    const alpha5Kd = 0.5;
    // Methylphenidate (CNS stimulant) indirectly opposes hypnotic GABA potentiation
    const effectiveEtomidate = inputs.etomidateCe * (1.0 - inputs.methylphenidateCe * 0.15);
    const alpha5Gabaa = patient.alpha5Knockout ? 0.0 : (effectiveEtomidate + inputs.isoMac) / (alpha5Kd + effectiveEtomidate + inputs.isoMac);
    const alpha4Gabaa = patient.alpha4Knockout ? 0.0 : (inputs.isoMac * 1.5) / (1.0 + inputs.isoMac * 1.5);

    // 4. Memory Decay & Consolidation (Power Law: m(t) = lambda * t^(-psi))
    const baseArousal = Math.max(0.01, lc * 0.4 + tmn * 0.4 + orexin * 0.2);
    
    // Encoding Strength (lambda) - Thiopental, Dexmedetomidine, Scopolamine, High-dose midazolam cause encoding failure
    let lambda = Math.max(0.0, baseArousal * (1.0 
      - 0.85 * inputs.thiopentalCe 
      - 0.9 * inputs.dexmedCe 
      - 0.8 * (inputs.midazolamCe > 0.08 ? 1.0 : inputs.midazolamCe * 12.5) 
      - 0.25 * inputs.propofolCe 
      - 0.85 * inputs.scopolamineCe
    ));
    lambda = Math.max(0.0, Math.min(1.0, lambda));

    // Consolidation Failure Rate (psi) - Propofol and Midazolam cause consolidation failure
    let psi = 0.1 
      + 0.85 * inputs.propofolCe 
      + 0.85 * (inputs.midazolamCe > 0.01 ? 1.0 : 0.0) 
      + 0.4 * inputs.sevoMac 
      + 0.4 * inputs.isoMac;
    
    // LTP block via hippocampal alpha-5 / alpha-4 GABA-A receptor activation
    const ltpInductionInhibited = (alpha5Gabaa > 0.4) || (alpha4Gabaa > 0.5) || (inputs.propofolCe > 0.5);
    if (ltpInductionInhibited) {
      psi = Math.max(3.5, psi * 2.5); // accelerated memory decay (instant consolidation block)
    }

    // 5. Electrophysiology (ERP Waves)
    const p300 = 10.0 * Math.max(0.0, 1.0 - 0.75 * inputs.propofolCe - 0.7 * inputs.midazolamCe - 0.4 * inputs.dexmedCe);
    const n2p3 = 12.0 * Math.max(0.0, 1.0 - 0.85 * inputs.propofolCe - 0.8 * inputs.midazolamCe - 0.3 * inputs.dexmedCe);
    const p2 = 8.0 * Math.max(0.0, 1.0 - 0.7 * (psi - 0.1));
    const oldNew = 3.0 * Math.max(0.0, 1.0 - 0.9 * inputs.propofolCe - 0.9 * inputs.midazolamCe);
    const mismatch = 3.5 * Math.max(0.0, 1.0 - 0.8 * inputs.propofolCe);
    const p1 = 4.0; // Primary sensory processing remains spared
    const n2Lat = Math.round(200 + (inputs.propofolCe * 120) + (inputs.dexmedCe * 50));

    // 6. Hippocampal Theta Rhythm Dynamics
    // Isoflurane and halothane slow theta peak frequency, while scopolamine accelerates it
    const thetaFreq = Math.max(1.0, Math.min(10.0, 7.0 - 2.5 * inputs.isoMac - 1.5 * inputs.haloMac - 1.0 * inputs.n2oMac + 2.0 * inputs.scopolamineCe));
    // Scopolamine and deep propofol cause a loss of absolute power
    const thetaPower = Math.max(0.0, 1.0 - 0.75 * inputs.scopolamineCe - (inputs.propofolCe > 1.5 ? 0.5 : 0.0));
    const amygdaloHippocampal = Math.max(0.0, Math.min(1.0, thetaPower * (thetaFreq / 7.0) * thalamocortical));

    // 7. Hysteresis / Neural Inertia
    // Emergence lag from volatile agents and propofol
    const anestheticPressure = inputs.sevoMac + inputs.isoMac + inputs.haloMac + inputs.propofolCe / 2.5;
    let inertiaLag = typeof patient.neuralInertiaLag === 'number' ? patient.neuralInertiaLag : 0.0;
    if (anestheticPressure > 0.8) {
      inertiaLag = Math.min(1.0, inertiaLag + 0.05 * dt);
    } else {
      // Emergence is accelerated by orexin, methylphenidate, and VTA activity
      const emergenceDrive = orexin * 0.4 + inputs.methylphenidateCe * 0.4 + vta * 0.2;
      inertiaLag = Math.max(0.0, inertiaLag - 0.03 * emergenceDrive * dt);
    }

    return {
      lcActivity: parseFloat(lc.toFixed(3)),
      tmnActivity: parseFloat(tmn.toFixed(3)),
      vlpoActivity: parseFloat(vlpo.toFixed(3)),
      ldtPptActivity: parseFloat(ldtPpt.toFixed(3)),
      prfActivity: parseFloat(prf.toFixed(3)),
      vtaActivity: parseFloat(vta.toFixed(3)),
      orexinLevel: parseFloat(orexin.toFixed(3)),
      slowOscillationPower: parseFloat(soPower.toFixed(3)),
      thalamocorticalConn: parseFloat(thalamocortical.toFixed(3)),
      frontoparietalFeedback: parseFloat(frontoparietal.toFixed(3)),
      corticocorticalConn: parseFloat(corticocortical.toFixed(3)),
      basalGangliaConn: parseFloat(basalGanglia.toFixed(3)),
      alpha5GabaaOccupancy: parseFloat(alpha5Gabaa.toFixed(3)),
      alpha4GabaaOccupancy: parseFloat(alpha4Gabaa.toFixed(3)),
      explicitEncoding: parseFloat(lambda.toFixed(3)),
      explicitConsolidation: parseFloat(psi.toFixed(3)),
      ltpInductionInhibited,
      p300Amplitude: parseFloat(p300.toFixed(2)),
      n2p3Amplitude: parseFloat(n2p3.toFixed(2)),
      p2Amplitude: parseFloat(p2.toFixed(2)),
      oldNewEffect: parseFloat(oldNew.toFixed(2)),
      mismatchNegativity: parseFloat(mismatch.toFixed(2)),
      p1Amplitude: parseFloat(p1.toFixed(2)),
      n2Latency: n2Lat,
      hippocampalThetaFreq: parseFloat(thetaFreq.toFixed(2)),
      hippocampalThetaPower: parseFloat(thetaPower.toFixed(2)),
      amygdaloHippocampalConn: parseFloat(amygdaloHippocampal.toFixed(3)),
      neuralInertiaLag: parseFloat(inertiaLag.toFixed(3))
    };
  }
}
