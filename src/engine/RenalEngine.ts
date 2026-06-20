export interface RenalPatientState {
  gfr?: number;
  rbf?: number;
  bun?: number;
  creatinine?: number;
  urineOutput?: number;
  urineOutputRate?: number;
  urineOsmolality?: number;
  feNa?: number;
  akiStage?: number;
  akiDamage?: number;
  uopOliguriaTimer?: number;
  uopAnuriaTimer?: number;
  baselineCreatinine?: number;
  baselineBun?: number;
  vasopressinLevel?: number;
  aldosteroneLevel?: number;
  angiotensinIILevel?: number;
  osm?: number;
  hasAki?: boolean;
  hasPrerenalOliguria?: boolean;
  hasFluidOverloadEdema?: boolean;
  isSeptic?: boolean;
  trauma?: boolean;
  weight?: number;
  ckd?: boolean;
  glucose?: number;
  fluidOverloadEdemaRolled?: boolean;
  forceFluidOverloadEdema?: boolean;
  chf?: boolean;
  cad?: boolean;
  renalFailure?: boolean;
  isRenal?: boolean;
  age?: number;
  albumin?: number; // Added for glomerular pressures calculation
  mapUnder60Time?: number;
  mapUnder55Time?: number;
  mapUnder60AlertTriggered?: boolean;
  mapUnder55AlertTriggered?: boolean;
  cortexRbf?: number;
  medullaRbf?: number;
  cortexPo2?: number;
  medullaPo2?: number;
  cortexO2Extraction?: number;
  medullaO2Extraction?: number;
  glomerularCapillaryPressure?: number;
  bowmanSpacePressure?: number;
  glomerularOncoticPressure?: number;
  netFiltrationPressure?: number;
}

export interface RenalVitalsState {
  gfr?: number;
  rbf?: number;
  bun?: number;
  creatinine?: number;
  urineOutput?: number;
  urineOutputRate?: number;
  urineOsmolality?: number;
  feNa?: number;
  akiStage?: number;
  akiDamage?: number;
  uopOliguriaTimer?: number;
  uopAnuriaTimer?: number;
  vasopressinLevel?: number;
  aldosteroneLevel?: number;
  angiotensinIILevel?: number;
  osm?: number;
  spo2?: number; // Added for renal PO2 calculations
  mapUnder60Time?: number;
  mapUnder55Time?: number;
  mapUnder60AlertTriggered?: boolean;
  mapUnder55AlertTriggered?: boolean;
}

export interface RenalOutput {
  gfr: number;
  rbf: number;
  bun: number;
  creatinine: number;
  urineOutput: number;
  urineOutputRate: number;
  urineOsmolality: number;
  feNa: number;
  akiStage: number;
  akiDamage: number;
  uopOliguriaTimer: number;
  uopAnuriaTimer: number;
  vasopressinLevel: number;
  aldosteroneLevel: number;
  angiotensinIILevel: number;
  osm: number;
  hasAki: boolean;
  hasPrerenalOliguria: boolean;
  hasFluidOverloadEdema: boolean;
  events: string[];
  fluidOverloadEdemaRolled?: boolean;
  
  // Chapter 17 specific variables
  mapUnder60Time: number;
  mapUnder55Time: number;
  mapUnder60AlertTriggered: boolean;
  mapUnder55AlertTriggered: boolean;
  cortexRbf: number;
  medullaRbf: number;
  cortexPo2: number;
  medullaPo2: number;
  cortexO2Extraction: number;
  medullaO2Extraction: number;
  glomerularCapillaryPressure: number;
  bowmanSpacePressure: number;
  glomerularOncoticPressure: number;
  netFiltrationPressure: number;
}

export class RenalEngine {
  /**
   * Ticks the renal physiological engine forward by dt seconds (1 second).
   * Pure function, deterministic, headless, and free of side-effects.
   */
  static tick(
    dt: number = 1,
    st: { patient: RenalPatientState; vitals: RenalVitalsState; time: number; electrolytes?: { na: number; k: number } },
    activeMeds: { name: string; Ce: number }[],
    inputs: {
      coRatio: number;
      map: number;
      sys: number;
      cvp: number;
      peep: number;
      temp: number;
      currentMac: number;
      C_cat: number;
      ebl: number;
      ebv: number;
      netFluidBalance: number; // cumulative IV input - urine output
      hasFluorideNephrotoxicity?: boolean;
      hasMismatchedTransfusion?: boolean;
      hasRhabdomyolysis?: boolean;
      hasContrastNephropathy?: boolean;
    }
  ): RenalOutput {
    const events: string[] = [];
    const patient = st.patient || {};
    const vitals = st.vitals || {};
    const safeDt = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 1;
    const safeTime = typeof st.time === 'number' && Number.isFinite(st.time) ? st.time : 0;

    // 1. Sanitize baseline constants
    const weight = typeof patient.weight === 'number' && Number.isFinite(patient.weight) ? patient.weight : 70.0;
    const baselineCreatinine = typeof patient.baselineCreatinine === 'number' && Number.isFinite(patient.baselineCreatinine) ? patient.baselineCreatinine : 0.85;
    const baselineBun = typeof patient.baselineBun === 'number' && Number.isFinite(patient.baselineBun) ? patient.baselineBun : 12.0;

    // 2. Calculate Renal Perfusion Pressure (RPP)
    const cvp = typeof inputs.cvp === 'number' && Number.isFinite(inputs.cvp) ? inputs.cvp : 5.0;
    const peep = typeof inputs.peep === 'number' && Number.isFinite(inputs.peep) ? inputs.peep : 0.0;
    const rvp = cvp + 0.5 * peep; // PEEP transmits pressure to IVC and renal veins
    const rpp = Math.max(0.0, inputs.map - rvp);

    // 3. Renal Blood Flow (RBF) Autoregulation and Vasomotor tone
    let rbfAuto = 1.0;
    if (rpp < 80.0) {
      rbfAuto = Math.max(0.1, 0.1 + 0.9 * ((rpp - 40.0) / 40.0));
    } else if (rpp > 180.0) {
      rbfAuto = 1.0 + ((rpp - 180.0) / 180.0) * 0.2;
    }
    rbfAuto = Math.min(1.5, rbfAuto);

    // Volatiles blunt autoregulation dose-dependently
    const currentMac = typeof inputs.currentMac === 'number' && Number.isFinite(inputs.currentMac) ? Math.max(0.0, inputs.currentMac) : 0.0;
    const autoregEffect = Math.max(0.0, 1.0 - currentMac * 0.5);
    const passiveFlowScale = rpp / 90.0;
    const finalRbfAuto = autoregEffect * rbfAuto + (1.0 - autoregEffect) * passiveFlowScale;

    // Sympathetic and hormonal vasoconstriction (stress catecholamines and vasopressors)
    const symp = Math.max(0.0, Math.min(1.0, inputs.C_cat / 40.0));
    const epinephrineModel = activeMeds.find(m => m.name === 'Epinephrine');
    const norepiModel = activeMeds.find(m => m.name === 'Norepinephrine');
    const phenylephrineModel = activeMeds.find(m => m.name === 'Phenylephrine');
    const vasopressinModel = activeMeds.find(m => m.name === 'Vasopressin');
    
    const activePressors = (epinephrineModel ? epinephrineModel.Ce : 0.0) +
                           (norepiModel ? norepiModel.Ce : 0.0) +
                           (phenylephrineModel ? phenylephrineModel.Ce : 0.0) +
                           (vasopressinModel ? vasopressinModel.Ce : 0.0);

    const vasoScale = Math.max(0.4, 1.0 - 0.35 * symp - 0.25 * Math.min(1.0, activePressors * 5.0));

    // Fenoldopam (selective DA1 agonist) promotes afferent arteriolar dilation, preserving/raising RBF
    const fenoldopamModel = activeMeds.find(m => m.name === 'Fenoldopam');
    const fenoldopamCe = fenoldopamModel ? fenoldopamModel.Ce : 0.0;
    const fenoldopamEffect = Math.min(0.4, fenoldopamCe * 2.5);
    const finalVasoScale = Math.min(1.35, vasoScale + fenoldopamEffect);

    const coRatio = typeof inputs.coRatio === 'number' && Number.isFinite(inputs.coRatio) ? inputs.coRatio : 1.0;
    let akiDamage = typeof patient.akiDamage === 'number' && Number.isFinite(patient.akiDamage) ? patient.akiDamage : 0.0;
    
    const rbf = Math.max(30.0, Math.min(1600.0, 1100.0 * coRatio * finalRbfAuto * finalVasoScale * (1.0 - 0.4 * akiDamage)));

    // 4. Glomerular Filtration Rate (GFR) physics-based model (Table 17.2, Fig 17.8, Miller's 9th Ed)
    const gfrMac = Math.max(0.4, 1.0 - 0.25 * currentMac);
    const avpCe = vasopressinModel ? vasopressinModel.Ce : 0.0;
    const efferentVasoconstriction = Math.min(0.25, (avpCe * 5.0 + symp * 0.4) * (1.0 - currentMac * 0.5));
    const gfrEfferentMod = 1.0 + efferentVasoconstriction;

    // Glomerular Capillary Pressure (P_gc) with Autoregulation (Table 17.2, Fig 17.8/17.9)
    let pGcAuto = 1.0;
    if (inputs.map < 90.0) {
      // Linear decrease from normal MAP=90 (pGc=60) down to MAP=50 (pGc=46.8, where NFP becomes 0)
      pGcAuto = Math.max(0.78, 0.78 + 0.22 * ((inputs.map - 50.0) / 40.0));
    } else if (inputs.map > 180.0) {
      pGcAuto = 1.0 + ((inputs.map - 180.0) / 180.0) * 0.1;
    }
    const passivePgScale = inputs.map / 100.0;
    const finalPgScale = autoregEffect * pGcAuto + (1.0 - autoregEffect) * passivePgScale;
    const pGc = Math.max(0.0, Math.min(120.0, 60.0 * finalPgScale * gfrEfferentMod * finalVasoScale * gfrMac));

    // Bowman Space Hydrostatic Pressure (P_bs)
    const pBs = 18.0 + 0.5 * peep;

    // Glomerular Oncotic Pressure (pi_gc)
    const albumin = typeof patient.albumin === 'number' && Number.isFinite(patient.albumin) ? patient.albumin : 4.0;
    const piGc = 32.0 * (albumin / 4.0);

    // Net Filtration Pressure (NFP)
    const nfp = Math.max(0.0, pGc - pBs - piGc);

    // GFR Calculation (directly proportional to NFP)
    const gfr = Math.max(0.0, Math.min(180.0, 12.5 * nfp * (1.0 - akiDamage)));

    // 5. Plasma Osmolality (Osm)
    const electrolytes = st.electrolytes || { na: 140.0, k: 4.0 };
    const na = typeof electrolytes.na === 'number' && Number.isFinite(electrolytes.na) ? electrolytes.na : 140.0;
    const k = typeof electrolytes.k === 'number' && Number.isFinite(electrolytes.k) ? electrolytes.k : 4.0;
    const bun = typeof patient.bun === 'number' && Number.isFinite(patient.bun) ? patient.bun : 12.0;
    const glucose = typeof patient.glucose === 'number' && Number.isFinite(patient.glucose) ? patient.glucose : 100.0;
    
    const osm = 2.0 * na + 2.0 * k + (bun / 2.8) + (glucose / 18.0);

    // 6. ADH (AVP) and Aldosterone loops
    const eblRatio = inputs.ebv > 0 ? Math.max(0.0, Math.min(1.0, inputs.ebl / inputs.ebv)) : 0.0;
    const avpVol = eblRatio > 0.1 ? Math.min(1.0, (eblRatio - 0.1) / 0.2) : 0.0;
    const avpStress = Math.max(0.0, Math.min(0.8, (inputs.C_cat - 12.0) / 38.0));
    
    const vasopressinLevel = Math.max(0.05, Math.min(1.0, 0.1 + (osm - 280.0) / 20.0 + avpVol + avpStress));
    const aldosteroneLevel = Math.max(0.05, Math.min(1.0, 0.1 + 0.65 * symp + 0.25 * vasopressinLevel));
    // Renin-Angiotensin II: the proximate RAAS secretagogue for aldosterone release, driven by the
    // same sympathetic/hypovolemic afferents already used above (juxtaglomerular beta-1 stimulation
    // and reduced renal perfusion). Exposed separately because Table 14.1 (Miller's 9th Ed) lists a
    // direct +inotropy/+chronotropy cardiac action for Angiotensin distinct from Aldosterone (whose
    // cardiac action cell is blank/mineralocorticoid-only) — see CardiovascularEngine.ts.
    const angiotensinIILevel = Math.max(0.05, Math.min(1.0, 0.1 + 0.7 * symp + 0.5 * avpVol));

    // 7. Urine Output (UOP) Flow rate
    const furosemideModel = activeMeds.find(m => m.name === 'Furosemide');
    const bumetanideModel = activeMeds.find(m => m.name === 'Bumetanide');
    const loopDiureticCe = (furosemideModel ? furosemideModel.Ce : 0.0) + (bumetanideModel ? bumetanideModel.Ce * 40.0 : 0.0);
    const mannitolModel = activeMeds.find(m => m.name === 'Mannitol 20%');
    const mannitolCe = mannitolModel ? mannitolModel.Ce : 0.0;
    
    const totalDiureticCe = loopDiureticCe + mannitolCe * 0.15;
    const diureticEffect = Math.max(0.0, Math.min(0.92, totalDiureticCe / (totalDiureticCe + 1.2)));
    const diureticMultiplier = 1.0 + 8.5 * diureticEffect;

    const uopMlMin = (gfr * 0.01) * (1.0 - 0.92 * vasopressinLevel * (1.0 - diureticEffect)) * diureticMultiplier;
    const prevUop = typeof patient.urineOutput === 'number' && Number.isFinite(patient.urineOutput) ? patient.urineOutput : 0.0;
    const urineOutput = parseFloat(Math.max(0.0, prevUop + (uopMlMin * (safeDt / 60.0))).toFixed(2));
    const urineOutputRate = parseFloat((uopMlMin * 60.0).toFixed(2));

    // Cortical vs. Medullary perfusion & oxygenation (Table 17.1, Miller's 9th Ed)
    const cortexRbf = 0.94 * rbf;
    const medullaRbf = 0.06 * rbf;
    const spo2 = typeof vitals.spo2 === 'number' && Number.isFinite(vitals.spo2) ? vitals.spo2 : 98.0;
    const cortexPo2 = Math.max(0.0, Math.min(100.0, 50.0 * (cortexRbf / 1034.0) * (spo2 / 98.0)));
    const medullaPo2 = Math.max(0.0, Math.min(25.0, 8.0 * (medullaRbf / 66.0) * (spo2 / 98.0)));
    const cortexO2Extraction = Math.max(0.0, Math.min(1.0, 0.18 * (1034.0 / Math.max(50.0, cortexRbf))));
    const medullaO2Extraction = Math.max(0.0, Math.min(1.0, 0.79 + 0.16 * Math.max(0.0, 1.0 - (medullaRbf / 66.0))));

    // 8. AKI Staging and Damage Accumulation
    let dDamage = 0.0;
    
    // Hemodynamic / Ischemic stress
    if (inputs.map < 60.0) {
      dDamage += ((60.0 - inputs.map) / 10.0) * 0.00018;
    }
    if (inputs.map < 55.0) {
      dDamage += ((55.0 - inputs.map) / 5.0) * 0.00045;
    }

    // Cumulative Hypotension AKI Thresholds (Ch 17, Miller's 9th Ed)
    let mapUnder60Time = typeof patient.mapUnder60Time === 'number' ? patient.mapUnder60Time : 0.0;
    let mapUnder55Time = typeof patient.mapUnder55Time === 'number' ? patient.mapUnder55Time : 0.0;
    let mapUnder60AlertTriggered = !!patient.mapUnder60AlertTriggered;
    let mapUnder55AlertTriggered = !!patient.mapUnder55AlertTriggered;

    if (inputs.map < 60.0) {
      mapUnder60Time += safeDt * 60;
    }
    if (inputs.map < 55.0) {
      mapUnder55Time += safeDt * 60;
    }

    if (mapUnder60Time > 11 * 60) {
      if (!mapUnder60AlertTriggered) {
        mapUnder60AlertTriggered = true;
        events.push("🚨 CLINICAL WARNING: Cumulative exposure to MAP < 60 mmHg has exceeded 11 minutes (Kheterpal et al., Anesthesiology 2007). Ischemic renal tubular stress is active, increasing the risk of Acute Kidney Injury.");
      }
      dDamage += 0.003;
    }
    if (mapUnder55Time > 10 * 60) {
      if (!mapUnder55AlertTriggered) {
        mapUnder55AlertTriggered = true;
        events.push("🚨 CLINICAL WARNING: Cumulative exposure to MAP < 55 mmHg has exceeded 10 minutes (Kheterpal et al., Anesthesiology 2007). Accelerating ischemic injury to renal parenchyma.");
      }
      dDamage += 0.003;
    }

    // Nephrotoxins & Pigment injury
    if (inputs.hasFluorideNephrotoxicity) {
      dDamage += 0.0008;
    }
    if (inputs.hasContrastNephropathy) {
      dDamage += 0.0015;
    }
    if (inputs.hasRhabdomyolysis) {
      dDamage += 0.0045; // severe myoglobin cast nephropathy
    }
    if (inputs.hasMismatchedTransfusion) {
      dDamage += 0.0075; // severe hemoglobin precipitate
    }

    akiDamage = Math.max(0.0, Math.min(1.0, akiDamage + dDamage * safeDt));

    // Accelerated Oliguria/Anuria KDIGO timers (1 simulation second = 1 game minute)
    let uopOliguriaTimer = typeof patient.uopOliguriaTimer === 'number' ? patient.uopOliguriaTimer : 0;
    let uopAnuriaTimer = typeof patient.uopAnuriaTimer === 'number' ? patient.uopAnuriaTimer : 0;
    
    const uopPerKgHr = urineOutputRate / weight;
    
    if (uopPerKgHr < 0.5) {
      uopOliguriaTimer += safeDt * 60; // 1s = 60s patient time
    } else {
      uopOliguriaTimer = 0;
    }

    if (uopPerKgHr < 0.1) {
      uopAnuriaTimer += safeDt * 60;
    } else {
      uopAnuriaTimer = 0;
    }

    // Creatinine and BUN kinetics
    const creatinine = typeof patient.creatinine === 'number' && Number.isFinite(patient.creatinine) ? patient.creatinine : 0.85;
    const crRatio = creatinine / baselineCreatinine;

    // KDIGO Staging criteria
    let akiStage = 0;
    if (crRatio >= 3.0 || creatinine >= 4.0 || uopAnuriaTimer >= 12 * 3600 || uopOliguriaTimer >= 24 * 3600) {
      akiStage = 3;
    } else if (crRatio >= 2.0 || uopOliguriaTimer >= 12 * 3600) {
      akiStage = 2;
    } else if (crRatio >= 1.5 || uopOliguriaTimer >= 6 * 3600) {
      akiStage = 1;
    }

    // Creatinine and BUN differential accumulation rates
    const dCr = 0.000018 * (1.0 - (gfr / 125.0) * (creatinine / baselineCreatinine));
    const nextCreatinine = Math.max(0.4, Math.min(10.0, creatinine + dCr * safeDt));

    const dBun = 0.00025 * (1.0 - (gfr / 125.0) * (bun / baselineBun) * (1.0 - 0.35 * (1.0 - gfr / 125.0)));
    const nextBun = Math.max(5.0, Math.min(120.0, bun + dBun * safeDt));

    // Tubular function indicators: Urine Osmolality & FE_Na
    let urineOsmolality = 350.0;
    let feNa = 1.0;

    if (akiDamage > 0.4) {
      // Intrinsic AKI / Acute Tubular Necrosis (ATN)
      // Tubular concentration completely broken -> isosthenuria and sodium wasting
      urineOsmolality = 300.0;
      feNa = parseFloat((1.0 + 3.5 * akiDamage).toFixed(2));
    } else if (uopPerKgHr < 0.5) {
      // Prerenal state: tubules function normally, absorbing sodium and water
      urineOsmolality = parseFloat((300.0 + 900.0 * vasopressinLevel).toFixed(1));
      feNa = parseFloat(Math.max(0.1, Math.min(0.99, 1.0 - 0.9 * ((80.0 - inputs.map) / 30.0))).toFixed(2));
    } else {
      urineOsmolality = parseFloat((300.0 + 400.0 * vasopressinLevel).toFixed(1));
      feNa = 1.0;
    }

    // 9. Crises Triggers
    const hasPrerenalOliguria = (uopPerKgHr < 0.5) && (akiDamage < 0.3) && (rpp < 65.0);
    const hasAki = akiDamage > 0.35 || akiStage >= 1;

    // Fluid Overload: net fluid balance (inputs - outputs) > 2000 mL and UOP is blunted (< 15 mL/h)
    let hasFluidOverloadEdema = !!patient.hasFluidOverloadEdema;
    let fluidOverloadEdemaRolled = patient.fluidOverloadEdemaRolled;

    if (inputs.netFluidBalance < 1500.0) {
      fluidOverloadEdemaRolled = undefined;
    }

    const edemaCondition = inputs.netFluidBalance > 2000.0 && urineOutputRate < 15.0;

    if (edemaCondition && !hasFluidOverloadEdema && fluidOverloadEdemaRolled === undefined) {
      const baseProb = 0.10; // 10% base chance of pulmonary edema under fluid overload
      const isElderly = typeof patient.age === 'number' && patient.age > 65;
      const modifier = (patient.chf || patient.cad ? 4.0 : 1.0) * (patient.isRenal || patient.renalFailure || isElderly ? 3.0 : 1.0);
      const prob = Math.min(1.0, baseProb * modifier);
      fluidOverloadEdemaRolled = Math.random() < prob;

      if (patient.forceFluidOverloadEdema || fluidOverloadEdemaRolled) {
        hasFluidOverloadEdema = true;
        events.push("🚨 CRITICAL EMERGENCY: Fluid Overload Pulmonary Edema! Massive fluid resuscitation in the face of severe oliguria has precipitated alveolar fluid extravasation.");
      } else {
        fluidOverloadEdemaRolled = false;
        events.push("⚠️ Clinical Note: Net fluid balance exceeds +2000 mL under oliguric conditions. Fortunately, pulmonary capillary membranes remain intact (no acute pulmonary edema triggered). Monitor compliance.");
      }
    }

    // Event Logging
    if (hasPrerenalOliguria && !patient.hasPrerenalOliguria) {
      events.push("⚠️ CLINICAL ALERT: Prerenal Oliguria detected! Urine output has fallen below 0.5 mL/kg/hr due to poor renal perfusion pressure.");
    }
    if (hasAki && !patient.hasAki) {
      events.push(`🚨 CLINICAL ALERT: Acute Kidney Injury (Stage ${akiStage}) has developed! Serum creatinine has risen and tubular function is impaired.`);
    }

    return {
      gfr: parseFloat(gfr.toFixed(2)),
      rbf: parseFloat(rbf.toFixed(2)),
      bun: parseFloat(nextBun.toFixed(6)),
      creatinine: parseFloat(nextCreatinine.toFixed(8)),
      urineOutput,
      urineOutputRate,
      urineOsmolality,
      feNa,
      akiStage,
      akiDamage: parseFloat(akiDamage.toFixed(4)),
      uopOliguriaTimer,
      uopAnuriaTimer,
      vasopressinLevel: parseFloat(vasopressinLevel.toFixed(3)),
      aldosteroneLevel: parseFloat(aldosteroneLevel.toFixed(3)),
      angiotensinIILevel: parseFloat(angiotensinIILevel.toFixed(3)),
      osm: parseFloat(osm.toFixed(2)),
      hasAki,
      hasPrerenalOliguria,
      hasFluidOverloadEdema,
      events,
      fluidOverloadEdemaRolled,
      mapUnder60Time,
      mapUnder55Time,
      mapUnder60AlertTriggered,
      mapUnder55AlertTriggered,
      cortexRbf: parseFloat(cortexRbf.toFixed(2)),
      medullaRbf: parseFloat(medullaRbf.toFixed(2)),
      cortexPo2: parseFloat(cortexPo2.toFixed(2)),
      medullaPo2: parseFloat(medullaPo2.toFixed(2)),
      cortexO2Extraction: parseFloat(cortexO2Extraction.toFixed(4)),
      medullaO2Extraction: parseFloat(medullaO2Extraction.toFixed(4)),
      glomerularCapillaryPressure: parseFloat(pGc.toFixed(2)),
      bowmanSpacePressure: parseFloat(pBs.toFixed(2)),
      glomerularOncoticPressure: parseFloat(piGc.toFixed(2)),
      netFiltrationPressure: parseFloat(nfp.toFixed(2))
    };
  }
}
