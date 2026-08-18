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
  desMac?: number;  // desflurane — added; absent caused BIS≈98 during desflurane GA
  isSyncShock: boolean;
  time: number;
  f3Ce?: number;
  sIsofluraneCe?: number;
  rIsofluraneCe?: number;
  f6Ce?: number;
  methohexitalCe?: number;
  gabapentinCe?: number;
  pregabalinCe?: number;
  topiramateCe?: number;
  suvorexantCe?: number;
  surgicalStimulus?: boolean;
  spo2?: number;
  paco2?: number;
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

    // Retrieve sleep states (Chapter 10)
    let sleepStage = patient.sleepStage || 'W';
    let sleepTimeInStage = typeof patient.sleepTimeInStage === 'number' ? patient.sleepTimeInStage : 0;
    let sleepDebt = typeof patient.sleepDebt === 'number' ? patient.sleepDebt : 0.0;
    let postOpSleepNight = typeof patient.postOpSleepNight === 'number' ? patient.postOpSleepNight : 0;
    let remReboundIntensity = typeof patient.remReboundIntensity === 'number' ? patient.remReboundIntensity : 1.0;

    // Inputs (Chapter 10)
    const suvorexantCe = inputs.suvorexantCe || 0;
    const surgicalStimulus = !!inputs.surgicalStimulus;
    const spo2 = typeof inputs.spo2 === 'number' ? inputs.spo2 : 98.0;
    const paco2 = typeof inputs.paco2 === 'number' ? inputs.paco2 : 40.0;

    // Chapter 19: Molecular receptor inputs & chiral potencies
    const f3CeVal = inputs.f3Ce || 0;
    const sIsoCe = inputs.sIsofluraneCe || 0;
    const rIsoCe = inputs.rIsofluraneCe || 0;
    const f6CeVal = inputs.f6Ce || 0;

    const activeIsoMac = inputs.isoMac + (sIsoCe / 0.9) + (rIsoCe / 1.8) + (f3CeVal / 1.2);
    
    // Genetic forebrain HCN1 knockout blunts hypnotic sensitivity to volatile agents
    const volatileHypnoticMultiplier = patient.isHCN1Knockout ? 0.5 : 1.0;

    // 1. Numerical Integration Loop (Euler Sub-stepping)
    const methoCe = inputs.methohexitalCe || 0;
    const effectiveBarbiturateCe = inputs.thiopentalCe + methoCe * (15.0 / 3.5);

    const gabaCe = inputs.gabapentinCe || 0;
    const pregabCe = inputs.pregabalinCe || 0;
    const topCe = inputs.topiramateCe || 0;

    const gabapentinoidEff = (gabaCe > 0 ? (gabaCe / (gabaCe + 5.0)) : 0) + (pregabCe > 0 ? (pregabCe / (pregabCe + 3.0)) : 0);
    const topiramateEff = topCe > 0 ? (topCe / (topCe + 4.0)) : 0;

    for (let i = 0; i < subSteps; i++) {
      // Competitive antagonism: Atipamezole blocks Dexmedetomidine at Alpha-2 receptors in the LC
      const effectiveDexCe = inputs.dexmedCe / (1.0 + inputs.atipamezoleCe * 8.0);
      
      // Locus Ceruleus noradrenergic activity deactivation (Table 10.5, MnPO reciprocal inhibition)
      const lcTarget = Math.max(0.01, 1.0 
        - 0.9 * (patient.alpha2AKnockout ? 0.0 : effectiveDexCe) // alpha-2A receptor knockout confers dexmed resistance in LC
        - 0.5 * inputs.propofolCe 
        - 0.4 * effectiveBarbiturateCe 
        - 0.4 * inputs.haloMac * volatileHypnoticMultiplier
        + 0.3 * inputs.ketamineCe // Ketamine increases LC activity
        - 0.8 * vlpo
        - 0.5 * mnpo // Median Preoptic Nucleus reciprocal inhibition (Ch. 10)
        - 0.15 * gabapentinoidEff // Gabapentinoids blunt noradrenergic outflow
        - 0.10 * topiramateEff
      );
      lc += (lcTarget - lc) * 0.1 * subDt;

      // TMN histaminergic deactivation (propofol-resistant in specific genetic variant)
      const propofolTmnEffect = patient.tmnPropofolResistant ? 0.0 : 0.85 * inputs.propofolCe;
      const tmnTarget = Math.max(0.01, 1.0 
        - propofolTmnEffect 
        - 0.7 * effectiveBarbiturateCe 
        - 0.6 * inputs.haloMac * volatileHypnoticMultiplier
        - 0.8 * vlpo
        - 0.6 * mnpo // Median Preoptic Nucleus reciprocal inhibition (Ch. 10)
      );
      tmn += (tmnTarget - tmn) * 0.1 * subDt;

      // VLPO sleep-promoting GABA/galanin activation
      const vlpoTarget = Math.min(1.0, 
        0.8 * inputs.propofolCe 
        + 0.7 * effectiveBarbiturateCe 
        + 0.9 * effectiveDexCe 
        + 0.5 * activeIsoMac * volatileHypnoticMultiplier // Isoflurane depolarizes sleep-active VLPO neurons
        + 0.20 * gabapentinoidEff // Gabapentinoids enhance sleep pathways
        + 0.15 * topiramateEff // Topiramate enhances GABA-A sleep drive
      );
      vlpo += (vlpoTarget - vlpo) * 0.1 * subDt;

      // MnPO sleep-pressure activity activation (Chapter 10, Median Preoptic Nucleus)
      const mnpoTarget = Math.min(1.0,
        0.75 * inputs.propofolCe
        + 0.6 * effectiveBarbiturateCe
        + 0.8 * effectiveDexCe
        + 0.4 * activeIsoMac * volatileHypnoticMultiplier
      );
      mnpo += (mnpoTarget - mnpo) * 0.1 * subDt;

      // Orexin arousal drive depletion (spared by halothane)
      const orexinBase = patient.narcolepsy ? 0.1 : 1.0;
      const orexinTarget = Math.max(0.0, orexinBase 
        - 0.8 * inputs.propofolCe 
        - 0.6 * inputs.sevoMac * volatileHypnoticMultiplier
        - 0.6 * activeIsoMac * volatileHypnoticMultiplier
      );
      orexin += (orexinTarget - orexin) * 0.1 * subDt;

      // LDT/PPT cholinergic activity deactivation (sleep spindles during halothane/isoflurane)
      const ldtPptTarget = Math.max(0.01, 1.0 
        - 0.6 * inputs.propofolCe 
        - 0.5 * inputs.haloMac * volatileHypnoticMultiplier
        - 0.5 * activeIsoMac * volatileHypnoticMultiplier
      );
      ldtPpt += (ldtPptTarget - ldtPpt) * 0.1 * subDt;

      // Pontine Reticular Formation (PRF) GABA-ergic deactivation
      const prfTarget = Math.max(0.01, 1.0 
        - 0.75 * activeIsoMac * volatileHypnoticMultiplier
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
      const soPowerTarget = 2.5 * inputs.propofolCe + 1.8 * inputs.sevoMac * volatileHypnoticMultiplier + 1.5 * activeIsoMac * volatileHypnoticMultiplier;
      soPower += (soPowerTarget - soPower) * 0.25 * subDt;
    }

    // 2. Connectivity & Pathway Coherences (Functional & Effective Connectivity)
    // Thalamocortical: propofol coefficients normalized by EC50 (≈3.5 mcg/mL for LOC).
    // Prior: -0.9 × propofolCe gave -2.7 at Ce=3 (maintenance) → clamped to 0 → BIS ≈ 0.
    // Fixed: -0.40 × (Ce/3.5) → at Ce=3: -0.34, giving thalamocortical=0.66 → BIS ~45-55 ✓.
    // Desflurane added (absent before; BIS read ~98 during desflurane anesthesia → false awareness).
    const desMac = (inputs as any).desMac || 0;
    const thalamocortical = Math.max(0.0, Math.min(1.0, 1.0
      - 0.40 * (inputs.propofolCe / 3.5)   // EC50=3.5 mcg/mL for thalamocortical LOC
      - 0.85 * inputs.sevoMac * volatileHypnoticMultiplier
      - 0.80 * activeIsoMac * volatileHypnoticMultiplier
      - 0.80 * desMac * volatileHypnoticMultiplier     // desflurane (similar potency to sevo/iso)
      - 0.40 * inputs.n2oMac * volatileHypnoticMultiplier // N2O weaker at thalamocortical level
      - 0.70 * inputs.midazolamCe
      - 0.40 * (inputs.etomidateCe / 0.3) // F15: etomidate is a potent hypnotic (EC50 ~0.3 mcg/mL) — was absent from BIS depth
      + 0.20 * inputs.ketamineCe // Ketamine ACTIVATES thalamic connectivity (paradox)
    ));

    // Frontoparietal: same propofol normalization.
    // Ketamine paradox: ketamine does NOT suppress frontoparietal connectivity (it disrupts it
    // differently — keeping EEG/BIS elevated during dissociation). Prior -0.7×ketamineCe caused
    // frontoparietal=0 at Ce=1.5 → BIS≈0 during ketamine TIVA, triggering false awareness events.
    const frontoparietal = Math.max(0.0, Math.min(1.0, 1.0
      - 0.45 * (inputs.propofolCe / 3.5)   // EC50 normalization
      - 0.90 * inputs.sevoMac * volatileHypnoticMultiplier
      - 0.85 * activeIsoMac * volatileHypnoticMultiplier
      - 0.85 * desMac * volatileHypnoticMultiplier
      - 0.45 * inputs.n2oMac * volatileHypnoticMultiplier
      - 0.85 * inputs.midazolamCe
      - 0.45 * (inputs.etomidateCe / 0.3) // F15: etomidate hypnotic depth
      - 0.80 * effectiveBarbiturateCe
      - 0.05 * inputs.ketamineCe  // ketamine: very mild disruption (not suppression) of FP
      - 0.15 * gabapentinoidEff
      - 0.10 * topiramateEff
    ));

    // Global corticocortical phase synchronization
    const corticocortical = frontoparietal * (1.0 - Math.min(0.85, soPower * 0.08));

    // Frontal cortex-basal ganglia functional connectivity (putamen/caudate disconnect)
    const basalGanglia = Math.max(0.0, Math.min(1.0, 1.0 
      - 0.85 * activeIsoMac * volatileHypnoticMultiplier
      - 0.8 * inputs.propofolCe
    ));

    // 3. Receptor-Level Binding and Mutational Knockouts
    const alpha5Kd = 0.5;
    // Methylphenidate (CNS stimulant) indirectly opposes hypnotic GABA potentiation
    const effectiveEtomidate = inputs.etomidateCe * (1.0 - inputs.methylphenidateCe * 0.15);
    const alpha5Gabaa = patient.alpha5Knockout ? 0.0 : (effectiveEtomidate + activeIsoMac) / (alpha5Kd + effectiveEtomidate + activeIsoMac);
    const alpha4Gabaa = patient.alpha4Knockout ? 0.0 : (activeIsoMac * 1.5) / (1.0 + activeIsoMac * 1.5);

    // 4. Memory Decay & Consolidation (Power Law: m(t) = lambda * t^(-psi))
    const orexinEffective = orexin / (1.0 + suvorexantCe * 5.0); // Competitive orexin antagonism (Ch. 10)
    const baseArousal = Math.max(0.01, lc * 0.4 + tmn * 0.4 + orexinEffective * 0.2);

    // Sleep Stage Transitions (Chapter 10 / AASM Sleep Architecture)
    const W_drive = (lc + tmn + orexinEffective) / 3.0;
    const S_drive = (vlpo + mnpo) / 2.0;

    sleepTimeInStage += dt;
    if (sleepStage === 'W') {
      sleepDebt = Math.min(24.0, sleepDebt + dt / 3600.0);
    } else {
      sleepDebt = Math.max(0.0, sleepDebt - dt / 3600.0);
    }

    // Cortical Arousal triggers: force immediate transition to Wake ('W')
    // 1. Hypoxia (spo2 < 85%) or Hypercapnia (paco2 > 50 mmHg)
    // 2. Surgical stimulus while NOT anesthetized (propofolCe < 1.0 and activeIsoMac < 0.4)
    const isAnesthetized = inputs.propofolCe >= 1.0 || activeIsoMac >= 0.4 || inputs.sevoMac >= 0.4 || inputs.thiopentalCe >= 1.0 || inputs.midazolamCe >= 0.08;
    // F42 (L4): cortical arousal — from hypoxia/hypercapnia OR surgical stimulus — is ABOLISHED by deep
    // anesthesia. A GA patient does NOT wake from hypoxia (the reason GA apnea is lethal). Previously the
    // hypoxia/hypercapnia arm fired regardless of depth, so a deep-propofol hypoxic patient was force-woken
    // to 'W' every tick, making BIS oscillate (arousal pulls it up, propofol pulls it down: 83↔33 at SpO2<25).
    // Gate the whole trigger by !isAnesthetized. (OSA / procedural-sedation patients are NOT "anesthetized"
    // by this threshold, so they still correctly arouse from hypoxia — the protective response is preserved.)
    const isArousalTriggered = !isAnesthetized && ((spo2 < 85.0) || (paco2 > 50.0) || surgicalStimulus);

    if (isArousalTriggered) {
      if (sleepStage !== 'W') {
        sleepStage = 'W';
        sleepTimeInStage = 0;
      }
    } else {
      // Normal Sleep Stage Transitions
      if (sleepStage === 'W') {
        if (S_drive > 0.6 && W_drive < 0.4) {
          sleepStage = 'N1';
          sleepTimeInStage = 0;
        }
      } else if (sleepStage === 'N1') {
        if (sleepTimeInStage >= 300) {
          sleepStage = 'N2';
          sleepTimeInStage = 0;
        } else if (W_drive >= 0.6 || S_drive <= 0.3) {
          sleepStage = 'W';
          sleepTimeInStage = 0;
        }
      } else if (sleepStage === 'N2') {
        const H_sleep = Math.min(1.0, sleepDebt / 16.0);
        // Transition to N3: driven by sleep debt and slow wave delta power
        // Night 1 post-op suppresses N3 & REM sleep
        if (H_sleep > 0.7 && soPower > 1.5 && postOpSleepNight !== 1) {
          sleepStage = 'N3';
          sleepTimeInStage = 0;
        } else {
          // Transition to R (REM): pontine REM-on pathways are disinhibited by low monoaminergic tone
          const P_rem_on_base = Math.max(0.0, 1.0 - lc - tmn);
          let P_rem_on = P_rem_on_base;
          if (postOpSleepNight === 1) {
            P_rem_on *= 0.1; // Suppress REM sleep
          } else if (postOpSleepNight >= 2 && postOpSleepNight <= 4) {
            const R_rebound = 2.5 * sleepDebt;
            P_rem_on = Math.min(1.0, P_rem_on * (1.0 + R_rebound));
          }
          if (P_rem_on > 0.75 && postOpSleepNight !== 1) {
            sleepStage = 'R';
            sleepTimeInStage = 0;
          } else if (W_drive >= 0.6 || S_drive <= 0.3) {
            sleepStage = 'W';
            sleepTimeInStage = 0;
          }
        }
      } else if (sleepStage === 'N3') {
        if (sleepTimeInStage > 1800 || soPower <= 1.2) {
          sleepStage = 'N2';
          sleepTimeInStage = 0;
        } else if (W_drive >= 0.6 || S_drive <= 0.3) {
          sleepStage = 'W';
          sleepTimeInStage = 0;
        }
      } else if (sleepStage === 'R') {
        if (sleepTimeInStage > 600 || lc > 0.4 || tmn > 0.4) {
          sleepStage = 'N2';
          sleepTimeInStage = 0;
        } else if (W_drive >= 0.6 || S_drive <= 0.3) {
          sleepStage = 'W';
          sleepTimeInStage = 0;
        }
      }
    }

    // REM Rebound Drive Intensity
    remReboundIntensity = parseFloat((postOpSleepNight >= 2 && postOpSleepNight <= 4 ? 2.5 * sleepDebt : 1.0).toFixed(3));
    
    // Encoding Strength (lambda) - Thiopental, Dexmedetomidine, Scopolamine, High-dose midazolam cause encoding failure
    let lambda = Math.max(0.0, baseArousal * (1.0 
      - 0.85 * effectiveBarbiturateCe 
      - 0.9 * inputs.dexmedCe 
      - 0.8 * (inputs.midazolamCe > 0.08 ? 1.0 : inputs.midazolamCe * 12.5) 
      - 0.25 * inputs.propofolCe 
      - 0.85 * inputs.scopolamineCe
    ));
    lambda = Math.max(0.0, Math.min(1.0, lambda));

    // Chapter 19: Amnestic Nonimmobilizer (F6) blocks learning/episodic encoding completely
    const isF6Active = f6CeVal > 0.1;
    const isF3Active = f3CeVal > 0.1;
    if (isF6Active) {
      lambda = 0.0;
    }

    // Consolidation Failure Rate (psi) - Propofol and Midazolam cause consolidation failure
    let psi = 0.1 
      + 0.85 * inputs.propofolCe 
      + 0.85 * (inputs.midazolamCe > 0.01 ? 1.0 : 0.0) 
      + 0.4 * inputs.sevoMac 
      + 0.4 * activeIsoMac;
    
    // LTP block via hippocampal alpha-5 / alpha-4 GABA-A receptor activation
    const ltpInductionInhibited = (alpha5Gabaa > 0.4) || (alpha4Gabaa > 0.5) || (inputs.propofolCe > 0.5) || isF6Active;
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
    // TASK-3 is required for halothane-induced theta slowing. isTASK3Knockout blunts this effect.
    const effectiveHaloMacForThetaFreq = patient.isTASK3Knockout ? 0.0 : inputs.haloMac;
    const thetaFreq = Math.max(1.0, Math.min(10.0, 7.0 - 2.5 * activeIsoMac - 1.5 * effectiveHaloMacForThetaFreq - 1.0 * inputs.n2oMac + 2.0 * inputs.scopolamineCe));
    
    // Scopolamine and deep propofol cause a loss of absolute power; TASK-3 knockout + Halothane causes theta rhythm to disappear
    let thetaPower = Math.max(0.0, 1.0 - 0.75 * inputs.scopolamineCe - (inputs.propofolCe > 1.5 ? 0.5 : 0.0));
    if (patient.isTASK3Knockout && inputs.haloMac > 0.05) {
      thetaPower = 0.0;
    }
    const amygdaloHippocampal = Math.max(0.0, Math.min(1.0, thetaPower * (thetaFreq / 7.0) * thalamocortical));

    // Chapter 9: Bilateral Amygdalo-Hippocampal & NBM Pathways (Fig. 9.5 & Page 263-264)
    // Sevoflurane 0.25% (~0.125 MAC) removes right amygdalo-hippocampal and NBM connectivity, while sparing left amygdalo-hippocampal connectivity.
    const rightAmygdaloHippocampal = Math.max(0.0, 1.0 - (inputs.sevoMac / 0.125) - (inputs.propofolCe / 0.5) - (inputs.midazolamCe / 0.03));
    const leftAmygdaloHippocampal = Math.max(0.0, 1.0 - (inputs.sevoMac / 0.25) - (inputs.propofolCe / 0.5) - (inputs.midazolamCe / 0.03));
    const nbmHippocampal = Math.max(0.0, 1.0 - (inputs.sevoMac / 0.125) - (inputs.propofolCe / 0.5) - (inputs.midazolamCe / 0.03));

    // Chapter 9: Slow Oscillation Phase Coupling Decay (Page 255)
    // Power increases and phase coupling decays across distance within 5 seconds of propofol-induced unconsciousness.
    const soPhaseCouplingDecay = Math.min(1.0, soPower / (soPower + 1.2));

    // Chapter 9: Multiple Memory Systems - Recollection vs. Familiarity vs. Procedural (Page 256-257)
    // Recollection (hippocampus) is highly sensitive; familiarity (perirhinal) and procedural (caudate) are spared at sedative/low doses.
    const hippocampalRecollection = Math.max(0.0, Math.min(1.0, lambda * (1.0 - alpha5Gabaa) * (1.0 - alpha4Gabaa) * (1.0 - (inputs.propofolCe / 0.4)) * (1.0 - (inputs.midazolamCe / 0.04))));
    const perirhinalFamiliarity = Math.max(0.0, Math.min(1.0, baseArousal * (1.0 - 0.4 * inputs.propofolCe - 0.3 * inputs.midazolamCe - 0.1 * inputs.dexmedCe)));
    const caudateProcedural = Math.max(0.0, Math.min(1.0, baseArousal * (1.0 - 0.1 * inputs.propofolCe - 0.1 * inputs.midazolamCe)));

    // 7. Hysteresis / Neural Inertia
    // Emergence lag from volatile agents and propofol
    const anestheticPressure = inputs.sevoMac + activeIsoMac + inputs.haloMac + inputs.propofolCe / 2.5;
    let inertiaLag = typeof patient.neuralInertiaLag === 'number' ? patient.neuralInertiaLag : 0.0;
    if (anestheticPressure > 0.8) {
      inertiaLag = Math.min(1.0, inertiaLag + 0.05 * dt);
    } else {
      // Emergence is accelerated by orexin, methylphenidate, and VTA activity
      const emergenceDrive = orexin * 0.4 + inputs.methylphenidateCe * 0.4 + vta * 0.2;
      inertiaLag = Math.max(0.0, inertiaLag - 0.03 * emergenceDrive * dt);
    }

    return {
      // ── Sleep-wake nuclei (shown in MemoryPanel, affect BIS) ──────────────
      lcActivity: parseFloat(lc.toFixed(3)),
      tmnActivity: parseFloat(tmn.toFixed(3)),
      vlpoActivity: parseFloat(vlpo.toFixed(3)),
      vtaActivity: parseFloat(vta.toFixed(3)),
      orexinLevel: parseFloat(orexin.toFixed(3)),
      // ── Cortical connectivities (drive BIS calculation) ───────────────────
      thalamocorticalConn: parseFloat(thalamocortical.toFixed(3)),
      frontoparietalFeedback: parseFloat(frontoparietal.toFixed(3)),
      corticocorticalConn: parseFloat(corticocortical.toFixed(3)),
      basalGangliaConn: parseFloat(basalGanglia.toFixed(3)),
      // ── Memory encoding (awareness risk shown in MemoryPanel) ─────────────
      explicitEncoding: parseFloat(lambda.toFixed(3)),
      explicitConsolidation: parseFloat(psi.toFixed(3)),
      ltpInductionInhibited,
      // ── Emergence lag (shown in MemoryPanel) ─────────────────────────────
      neuralInertiaLag: parseFloat(inertiaLag.toFixed(3)),
      // ── Internal sleep-state persistence (needed across ticks) ───────────
      // These are not shown in the UI but must be returned so ConsciousnessEngine
      // can read them from patient state on the next tick to continue tracking.
      // sleepStage is also used by RespiratoryEngine for OSA airway collapse modeling.
      isF6Active,
      isF3Active,
      sleepStage,
      sleepTimeInStage,
      sleepDebt: parseFloat(sleepDebt.toFixed(6)),
      postOpSleepNight,
      remReboundIntensity,
    };
  }
}
