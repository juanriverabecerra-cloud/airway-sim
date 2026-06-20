export interface CerebralPatientState {
  cbf?: number;                   // Cerebral Blood Flow (mL/100 g/min)
  cmro2?: number;                 // Cerebral Metabolic Rate of Oxygen (mL/100 g/min)
  cpp?: number;                   // Cerebral Perfusion Pressure (mmHg)
  cbv?: number;                   // Cerebral Blood Volume index (0.0 - 1.0)
  icp?: number;                   // Intracranial Pressure (mmHg)
  brainVolume?: number;           // Brain tissue volume (mL)
  csfVolume?: number;             // CSF volume (mL)
  intracranialVolumeOffset?: number; // Volume offset representing edema/hematoma/tumor (mL)
  complianceState?: 'normal' | 'impaired' | 'exhausted';
  hasCerebralIschemia?: boolean;
  rso2?: number;                  // Regional cerebral oxygen saturation (%)
  isBBBOpen?: boolean;            // Blood-brain barrier integrity flag
  cerebralElastance?: number;     // Direct override for elastance parameter
  neuronalInjury?: number;        // Cumulative focal ischemic neuronal injury index (0-100)
  isTREK1Knockout?: boolean;
}

export interface CerebralVitalsState {
  cbf?: number;
  cmro2?: number;
  cpp?: number;
  cbv?: number;
  icp?: number;
  rso2?: number;
}

export interface CerebralOutput {
  cbf: number;
  cmro2: number;
  cpp: number;
  cbv: number;
  icp: number;
  brainVolume: number;
  csfVolume: number;
  hasCerebralIschemia: boolean;
  rso2: number;
  neuronalInjury: number;
  events: string[];
}

export class CerebralEngine {
  /**
   * Ticks the cerebral physiological sub-engine forward by 1 second.
   * Pure function, deterministic, headless, and free of side effects.
   */
  static tick(
    dt: number = 1,
    st: { patient: CerebralPatientState; vitals: CerebralVitalsState; time: number },
    activeMeds: { name: string; Ce: number }[],
    inputs: {
      map: number;
      sys: number;
      paco2: number;
      pao2: number;
      spo2: number;
      temp: number;
      cvp: number;
      sevoMac: number;
      isoMac: number;
      desMac: number;
      haloMac: number;
      n2oMac: number;
      xenonMac: number;
      positionHydrostaticMod: number;
    }
  ): CerebralOutput {
    const events: string[] = [];
    const patient = st.patient || {};
    const prevICP = typeof patient.icp === 'number' ? patient.icp : 10.0;
    const prevCPP = typeof patient.cpp === 'number' ? patient.cpp : 80.0;

    // 1. Temperature-dependent metabolic components (Fig. 11.5, Miller's 9th Ed)
    // Baseline CMRO2 = 3.3 mL/100 g/min (60% functional, 40% integrity at 37°C)
    const baseFunctional = 1.98;
    const baseIntegrity = 1.32;

    // Q10 temperature scaling (Q10 = 2.4)
    const tempFactor = Math.pow(2.4, (inputs.temp - 37.0) / 10.0);
    // Functional metabolism ceases below 17°C (isoelectric EEG)
    let functionalTempFactor = 1.0;
    if (inputs.temp < 20.0) {
      functionalTempFactor = Math.max(0.0, (inputs.temp - 17.0) / 3.0);
    }
    
    let cmro2_functional = baseFunctional * functionalTempFactor * tempFactor;
    let cmro2_integrity = baseIntegrity * tempFactor;

    // 2. Anesthetic impacts on CMRO2 (coupled metabolic suppression)
    // IV Hypnoids (Propofol, Thiopental, Etomidate) reduce functional CMR up to 60%
    const propofolModel = activeMeds.find(m => m.name === 'Propofol');
    const thiopentalModel = activeMeds.find(m => m.name === 'Thiopental');
    const etomidateModel = activeMeds.find(m => m.name === 'Etomidate');

    const propofolCe = propofolModel ? propofolModel.Ce : 0.0;
    const thiopentalCe = thiopentalModel ? thiopentalModel.Ce : 0.0;
    const etomidateCe = etomidateModel ? etomidateModel.Ce : 0.0;

    const propofolSuppression = 0.6 * (propofolCe / (propofolCe + 4.0));
    const thiopentalSuppression = 0.6 * (thiopentalCe / (thiopentalCe + 15.0));
    const etomidateSuppression = 0.6 * (etomidateCe / (etomidateCe + 0.3));
    const gabaSuppression = Math.max(propofolSuppression, thiopentalSuppression, etomidateSuppression);

    // Volatile agents suppress CMR dose-dependently up to 60%
    const volatileMac = inputs.sevoMac + inputs.isoMac + inputs.desMac + inputs.haloMac;
    const volatileSuppression = 0.6 * (volatileMac / (volatileMac + 0.5));
    
    cmro2_functional *= (1.0 - Math.max(gabaSuppression, volatileSuppression));

    // Ketamine increases CMR modestly (+15% at high concentrations). Esketamine (S(+)-isomer) is
    // 3-4x more potent (Ch23, Miller's 9th Ed) — its Ce is converted to a racemic-ketamine-
    // equivalent concentration (midpoint ratio 3.5x) before being pooled with racemic ketamine Ce.
    const ketamineModel = activeMeds.find(m => m.name === 'Ketamine');
    const esketamineModel = activeMeds.find(m => m.name === 'Esketamine');
    const ketamineCe = (ketamineModel ? ketamineModel.Ce : 0.0) + (esketamineModel ? esketamineModel.Ce * 3.5 : 0.0);
    const ketamineCMRBoost = 0.15 * (ketamineCe / (ketamineCe + 0.5));

    // Dexmedetomidine (pure alpha-2 agonist) decreases CMR modestly (-20%)
    const dexmedModel = activeMeds.find(m => m.name === 'Dexmedetomidine');
    const dexmedCe = dexmedModel ? dexmedModel.Ce : 0.0;
    const dexSuppression = 0.2 * (dexmedCe / (dexmedCe + 0.6));

    // Catecholamines effect on CMR (Table 11.2, Miller's 9th Ed)
    let catechoCMRMod = 0.0;
    const epiModel = activeMeds.find(m => m.name === 'Epinephrine');
    const norepiModel = activeMeds.find(m => m.name === 'Norepinephrine');
    const epiCe = epiModel ? epiModel.Ce : 0.0;
    const norepiCe = norepiModel ? norepiModel.Ce : 0.0;
    const isBBBOpen = !!patient.isBBBOpen;

    if (isBBBOpen) {
      // BBB open: Epinephrine increases CMR (+60%), Norepinephrine increases CMR (+15%)
      catechoCMRMod += 0.6 * (epiCe / (epiCe + 0.1)) + 0.15 * (norepiCe / (norepiCe + 1.0));
    } else {
      // BBB intact: Epinephrine (+15%), Norepinephrine (+5%)
      catechoCMRMod += 0.15 * (epiCe / (epiCe + 0.1)) + 0.05 * (norepiCe / (norepiCe + 1.0));
    }

    let cmro2 = (cmro2_functional + cmro2_integrity) * (1.0 + ketamineCMRBoost) * (1.0 - dexSuppression) * (1.0 + catechoCMRMod);
    cmro2 = Math.max(0.1, Math.min(7.0, cmro2));

    // 3. Cerebral Blood Flow (CBF) Calculations
    // Coupling: baseline CBF = 50 mL/100 g/min, scales with CMRO2
    let cbf_coupled = 50.0 * (cmro2 / 3.3);

    // Volatile uncoupling (vasodilation at > 1.0 MAC)
    const volatileVasodilation = 0.5 * Math.max(0, volatileMac - 1.0);
    let cbf_uncoupled = cbf_coupled + 50.0 * volatileVasodilation;

    // Ketamine CBF boost (+50% at high doses)
    const ketamineCBFBoost = 0.5 * (ketamineCe / (ketamineCe + 0.5));
    cbf_uncoupled *= (1.0 + ketamineCBFBoost);

    // Catecholamines effect on CBF (Table 11.2, Miller's 9th Ed)
    let catechoCBFMod = 0.0;
    const phenylephrineModel = activeMeds.find(m => m.name === 'Phenylephrine');
    const phenylephrineCe = phenylephrineModel ? phenylephrineModel.Ce : 0.0;

    // Phenylephrine (pure alpha-1): mild decrease (-5%)
    catechoCBFMod -= 0.05 * (phenylephrineCe / (phenylephrineCe + 0.1));
    // Dexmedetomidine (alpha-2): CBF decrease (-25%)
    catechoCBFMod -= 0.25 * (dexmedCe / (dexmedCe + 0.6));

    if (isBBBOpen) {
      // BBB open: Epinephrine (+60%), Norepinephrine (+15%)
      catechoCBFMod += 0.6 * (epiCe / (epiCe + 0.1)) + 0.15 * (norepiCe / (norepiCe + 1.0));
    } else {
      // BBB intact: Epinephrine (+15%), Norepinephrine (-5% due to alpha-1 vasoconstriction)
      catechoCBFMod += 0.15 * (epiCe / (epiCe + 0.1)) - 0.05 * (norepiCe / (norepiCe + 1.0));
    }
    cbf_uncoupled *= (1.0 + catechoCBFMod);

    // 4. Chemical Regulation of CBF
    // Paco2 reactivity (Page 300, Miller's 9th Ed)
    // Normotension: Hypercapnia = +2.5% per mmHg (PaCO2 > 40), Hypocapnia = -1.67% per mmHg (PaCO2 < 40)
    // Moderate Hypotension (<33% reduction of MAP from 90 mmHg baseline): 1.3% per mmHg (both)
    // Severe Hypotension (<66% reduction of MAP from 90 mmHg baseline): 0% reactivity (abolished)
    const mapBaseline = 90.0;
    const mapReduction = Math.max(0, (mapBaseline - inputs.map) / mapBaseline);
    const clampedPaCO2 = Math.max(25, Math.min(75, inputs.paco2));
    
    let co2Mult = 1.0;
    if (mapReduction < 0.33) {
      // Normotension
      if (clampedPaCO2 > 40) {
        co2Mult = 1.0 + 0.025 * (clampedPaCO2 - 40);
      } else {
        co2Mult = 1.0 + 0.0167 * (clampedPaCO2 - 40);
      }
    } else if (mapReduction < 0.66) {
      // Moderate Hypotension
      co2Mult = 1.0 + 0.013 * (clampedPaCO2 - 40);
    } else {
      // Severe Hypotension (Abolished)
      co2Mult = 1.0;
    }
    cbf_uncoupled *= co2Mult;

    // Pao2 reactivity (Fig. 11.7, Miller's 9th Ed)
    // Inversely linear with SpO2 below 90% SpO2 (corresponding to PaO2 < 60 mmHg)
    let hypoxiaMult = 1.0;
    if (inputs.pao2 < 60.0) {
      const desat = Math.max(0, 90.0 - inputs.spo2);
      hypoxiaMult = 1.0 + 0.035 * desat;
    }
    cbf_uncoupled *= hypoxiaMult;

    // 5. Autoregulation mechanics (Fig. 11.3, conventional view limits 65 - 150 mmHg)
    // Loss of autoregulation by volatiles (lost at 1.5 MAC)
    const autoregEfficiency = Math.max(0.0, 1.0 - (volatileMac / 1.5));
    const cerebralMap = Math.max(0, inputs.map + inputs.positionHydrostaticMod);
    const cpp = Math.max(0, cerebralMap - prevICP);

    let cbf_autoreg = cbf_uncoupled;
    if (cpp < 65.0) {
      // Pressure passive drop below lower limit
      cbf_autoreg = cbf_uncoupled * (cpp / 65.0);
    } else if (cpp > 150.0) {
      // Pressure passive surge above upper limit
      cbf_autoreg = cbf_uncoupled * (1.0 + 0.01 * (cpp - 150.0));
    }

    const cbf_passive = cbf_uncoupled * (cpp / 80.0); // baseline CPP assumed ~80
    let finalCBF = autoregEfficiency * cbf_autoreg + (1.0 - autoregEfficiency) * cbf_passive;
    finalCBF = Math.max(0.0, Math.min(200.0, finalCBF));

    // 6. Intracranial pressure volume mechanics (Monro-Kellie)
    // CSF secretion and absorption (Table 11.3, Miller's 9th Ed)
    let csfSecretionMult = 1.0;
    let csfAbsorptionMult = 1.0;

    // Isoflurane: secretion --, absorption ↑ (+40%)
    csfAbsorptionMult += 0.4 * Math.min(1.0, inputs.isoMac);
    // Desflurane: secretion ↑ (+50%), absorption --
    csfSecretionMult += 0.5 * Math.min(1.0, inputs.desMac);
    // Halothane: secretion ↓ (-40%), absorption ↓ (-40%)
    csfSecretionMult -= 0.4 * Math.min(1.0, inputs.haloMac);
    csfAbsorptionMult -= 0.4 * Math.min(1.0, inputs.haloMac);
    // Fentanyl: secretion --, absorption ↑ (+40%)
    const fentanylModel = activeMeds.find(m => m.name === 'Fentanyl');
    const fentanylCe = fentanylModel ? fentanylModel.Ce : 0.0;
    csfAbsorptionMult += 0.4 * Math.min(1.0, fentanylCe / 2.0);
    // Etomidate: secretion ↓ (-40%), absorption ↑ (+40%)
    csfSecretionMult -= 0.4 * Math.min(1.0, etomidateCe / 0.3);
    csfAbsorptionMult += 0.4 * Math.min(1.0, etomidateCe / 0.3);

    // Baseline CSF dynamics: secretion & absorption at normal ICP/CVP = 0.0058 mL/s
    const baseCsfRate = 0.00583;
    const csfPressureGradient = Math.max(0, prevICP - inputs.cvp);
    const csfNormalGradient = 5.0; // 10 mmHg normal ICP - 5 mmHg normal CVP
    
    const csfSecretionRate = baseCsfRate * csfSecretionMult;
    const csfAbsorptionRate = baseCsfRate * csfAbsorptionMult * (csfPressureGradient / csfNormalGradient);

    let csfVolume = (typeof patient.csfVolume === 'number' ? patient.csfVolume : 130.0) + (csfSecretionRate - csfAbsorptionRate) * dt;
    csfVolume = Math.max(50.0, Math.min(250.0, csfVolume));

    // Brain tissue volume: reduced by Osmotic Diuretic Mannitol 20% (draws up to 35 mL of water)
    const mannitolModel = activeMeds.find(m => m.name === 'Mannitol 20%');
    const mannitolCe = mannitolModel ? mannitolModel.Ce : 0.0;
    const brainVolumeReduction = 35.0 * (mannitolCe / (mannitolCe + 50.0));
    const brainVolume = 1300.0 - brainVolumeReduction;

    // Cerebral Blood Volume: scales with uncoupling volatiles, CO2, and CBF ratio
    const volatileCBV = 1.0 + 0.15 * Math.max(0, volatileMac - 1.0);
    const co2CBV = 1.0 + 0.01 * (clampedPaCO2 - 40.0);
    const cbvFactor = volatileCBV * co2CBV * Math.sqrt(finalCBF / 50.0);
    const cbvIndex = Math.max(0.5, Math.min(2.0, cbvFactor));
    const cbvVolume = 110.0 * cbvIndex;

    // Exponential volume-pressure elastance model
    const intracranialVolumeOffset = typeof patient.intracranialVolumeOffset === 'number' ? patient.intracranialVolumeOffset : 0.0;
    const totalIntracranialVol = brainVolume + csfVolume + cbvVolume + intracranialVolumeOffset;
    const baselineVol = 1300.0 + 130.0 + 110.0; // 1540
    const deltaV = totalIntracranialVol - baselineVol;

    const complianceState = patient.complianceState || 'normal';
    const elastance = typeof patient.cerebralElastance === 'number' 
      ? patient.cerebralElastance 
      : (complianceState === 'impaired' ? 0.04 : (complianceState === 'exhausted' ? 0.08 : 0.015));

    let icp = 10.0 * Math.exp(elastance * deltaV);
    icp = Math.max(1.0, Math.min(100.0, icp));

    // Recompute CPP with final ICP
    const finalCPP = Math.max(0, cerebralMap - icp);

    // Ischemia flag
    const hasCerebralIschemia = finalCBF < 20.0;

    // Cerebral ischemic neuronal injury accumulation, driven by the CBF deficit below the
    // ischemic threshold (20 mL/100g/min). Xenon and sevoflurane activate TREK-1 K2P channels,
    // hyperpolarizing neurons and limiting Ca2+ overload/glutamate excitotoxicity during ischemia
    // — a neuroprotective mechanism specific to these two agents (Ch19, Miller's 9th Ed, p.1537:
    // "The K+ channel TREK-1 also contributes to the neuroprotective effects of xenon and
    // sevoflurane"). The source gives no specific magnitude for this effect, so a conservative
    // illustrative 50% reduction is used (class-average fallback convention), not a textbook-
    // derived constant. `isTREK1Knockout` abolishes the protection (§6.36).
    let neuronalInjury = typeof patient.neuronalInjury === 'number' && Number.isFinite(patient.neuronalInjury) ? patient.neuronalInjury : 0.0;
    if (hasCerebralIschemia) {
      const cbfDeficit = Math.max(0, 20.0 - finalCBF);
      const trek1NeuroprotectionActive = !patient.isTREK1Knockout && (inputs.xenonMac > 0.05 || inputs.sevoMac > 0.05);
      const trek1ProtectionFactor = trek1NeuroprotectionActive ? 0.5 : 1.0;
      neuronalInjury = Math.max(0, Math.min(100.0, neuronalInjury + cbfDeficit * 0.05 * trek1ProtectionFactor * dt));
    }

    // Regional O2 saturation: scales with CBF and arterial sat
    let targetRso2 = 70.0 * (finalCBF / 50.0) * (inputs.spo2 / 100.0);
    const rso2 = Math.max(15.0, Math.min(95.0, targetRso2));

    // 7. Generate clinical events based on state transitions
    if (icp > 20.0 && prevICP <= 20.0) {
      events.push("🚨 CLINICAL UPDATE: Intracranial Pressure (ICP) has risen above 20 mmHg, indicating active intracranial hypertension!");
    } else if (icp <= 20.0 && prevICP > 20.0) {
      events.push("✅ CLINICAL UPDATE: Intracranial Pressure (ICP) has normalized below 20 mmHg.");
    }

    if (finalCPP < 50.0 && prevCPP >= 50.0) {
      events.push("🚨 WARNING: Cerebral Perfusion Pressure (CPP) has fallen below 50 mmHg! Widespread cerebral watershed ischemia is imminent.");
    } else if (finalCPP >= 50.0 && prevCPP < 50.0) {
      events.push("✅ CLINICAL UPDATE: Cerebral Perfusion Pressure (CPP) has recovered above 50 mmHg.");
    }

    const cushingTriggered = icp > 20.0 && finalCPP < 50.0;
    const prevCushingTriggered = prevICP > 20.0 && prevCPP < 50.0;
    if (cushingTriggered && !prevCushingTriggered) {
      events.push("🚨 EMERGENCY: Cushing's reflex triggered! Compromised brainstem perfusion has activated a massive sympathetic vasomotor surge.");
    }

    return {
      cbf: parseFloat(finalCBF.toFixed(1)),
      cmro2: parseFloat(cmro2.toFixed(3)),
      cpp: parseFloat(finalCPP.toFixed(1)),
      cbv: parseFloat(cbvIndex.toFixed(4)),
      icp: parseFloat(icp.toFixed(3)),
      brainVolume: parseFloat(brainVolume.toFixed(2)),
      csfVolume: parseFloat(csfVolume.toFixed(4)),
      hasCerebralIschemia,
      rso2: parseFloat(rso2.toFixed(2)),
      neuronalInjury: parseFloat(neuronalInjury.toFixed(3)),
      events
    };
  }
}
