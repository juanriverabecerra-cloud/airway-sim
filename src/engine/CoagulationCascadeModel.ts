/**
 * Coagulation Cascade Model: Real Platelet/Fibrinogen/Factor Physiology, TEG/ROTEM-Style
 * Output, and the Lethal Triad (Hypothermia + Acidosis + Coagulopathy)
 *
 * Phase 4 (hematology/coagulation bucket) of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. Direct audit confirmed the
 * existing coagulation model consisted of: a single `patient.inr` scalar modified only by
 * HepaticEngine (synthetic dysfunction) and halothane hepatitis; a `coags` object with
 * `{r_offset, ma_offset, angle_offset}` offsets accumulated ONLY from blood products
 * administered via FluidicsEngine (display-layer feature, not real physiology); no platelet
 * count, no fibrinogen, no aPTT, no TXA-reversible fibrinolysis, and no mechanisms for the
 * most clinically important causes of intraoperative coagulopathy: hypothermia-induced enzyme
 * impairment, acidosis-induced enzyme impairment, dilutional coagulopathy from massive
 * crystalloid infusion, or consumptive coagulopathy (DIC from sepsis/trauma).
 *
 * Four real state parameters, each evolving via first-order kinetics each tick:
 *
 * 1. **Platelet count** (k/μL, normal 150-400): consumed by hemorrhage and DIC, diluted by
 *    crystalloid, replenished by platelet transfusion.
 * 2. **Fibrinogen** (mg/dL, normal 200-400): consumed by hemorrhage and DIC, cleavage-
 *    accelerated by hyperfibrinolysis, replenished by cryoprecipitate/fibrinogen concentrate.
 *    First major coagulation factor to fall in massive hemorrhage (shorter half-life than
 *    many other factors) -- the reason cryoprecipitate/fibrinogen concentrate are administered
 *    early in massive transfusion protocols.
 * 3. **Coagulation factor activity fraction** (0-1, normal 1.0, directly drives INR/aPTT):
 *    diluted by crystalloid (no factors in saline/LR), impaired by hypothermia (enzymatic
 *    rate constants drop -- one of the three "lethal triad" components -- Q10 effect on
 *    serine protease activity), impaired by acidosis (pH<7.2 -- the second -- protonation
 *    of active-site histidine residues impairs factor binding/activity), depleted by
 *    hemorrhage and DIC, replenished by FFP (all factors), heparin/protamine modulated.
 * 4. **Fibrinolysis index** (0-1, 0 = physiologic, 1 = hyperfibrinolysis): activated by
 *    acute severe hemorrhage/DIC/hypoperfusion, representing plasmin-mediated clot lysis;
 *    suppressed by Tranexamic Acid (TXA -- already in Pharmacology.js as an antifibrinolytic).
 *    Drives TEG LY30 (% clot lysis at 30 min, normal <5%, elevated in hyperfibrinolysis).
 *
 * **Lethal triad detection**: simultaneous hypothermia (temp < 34°C), acidosis (pH < 7.2),
 * and coagulopathy (INR > 2.0 or platelets < 50k) -- the recognized driver of damage-control
 * surgery philosophy and massive transfusion protocols. Surfaced as a `lethalTriadActive`
 * output with a narrative event on the transition, giving this previously absent concept its
 * first representation in this simulator.
 *
 * TEG/ROTEM-style outputs replace the existing abstract offset model with parameters derived
 * from actual tracked physiology rather than blood-product administration history only:
 * - `tegR` (reaction/latency time, min): primarily factor-activity-driven
 * - `tegK` (clot kinetics): primarily fibrinogen-driven
 * - `tegAlpha` (alpha-angle, degrees): fibrinogen + platelet propagation speed
 * - `tegMA` (max amplitude, mm): platelet + fibrinogen composite clot strength
 * - `tegLY30` (% lysis at 30 min): fibrinolysis-driven, normalized by TXA
 *
 * Source: general hematology/anesthesia physiology (coagulation factor half-lives, TEG
 * parameter ranges, hypothermia/acidosis coagulopathy impairment magnitudes, dilutional
 * coagulopathy kinetics) -- not a specific Miller's citation; disclosed per this project's
 * standing convention. All calibration constants are disclosed, reasoned estimates.
 */

export interface CoagulationInputs {
  prevPlateletCountK?: number; // k/μL
  prevFibrinogenMgDl?: number;
  prevFactorActivityFraction?: number; // 0-1
  prevFibrinolysisIndex?: number; // 0-1
  prevLethalTriadLogged?: boolean;

  temperature?: number; // °C, for hypothermia impairment
  pH?: number; // for acidosis impairment (derived from hco3/paco2 - caller provides)
  bloodLossRateMlPerSec?: number; // active hemorrhage rate driving consumption
  ebv?: number; // estimated blood volume, for dilution calculations
  crystalloidInfusionRateMlPerSec?: number; // dilution of factors/platelets
  isActiveDIC?: boolean; // sepsis/trauma/AFE-triggered consumptive coagulopathy
  isDICLogged?: boolean; // guard flag for the DIC onset narrative event

  heparinCe?: number;
  protamineCe?: number;
  txaCe?: number;

  // Blood products - incremental volume infused THIS tick (from FluidicsEngine)
  ffpVolumeMlThisTick?: number;
  plateletsVolumeMlThisTick?: number;
  cryoprecipitateVolumeMlThisTick?: number;
  fibrinogenConcentrateVolumeMlThisTick?: number;

  // Hepatic synthetic function impairment (from HepaticEngine - drives chronic factor deficiency)
  hepaticSyntheticFraction?: number; // 0-1, 1 = normal, 0 = complete failure

  dt?: number; // seconds
}

export interface CoagulationOutput {
  plateletCountK: number;
  fibrinogenMgDl: number;
  factorActivityFraction: number;
  fibrinolysisIndex: number;

  inr: number;
  aptt: number; // seconds
  tegR: number; // minutes
  tegK: number; // minutes
  tegAlpha: number; // degrees
  tegMA: number; // mm
  tegLY30: number; // %

  hypothermiaCoagImpairment: number; // 0-1
  acidosisCoagImpairment: number; // 0-1

  isDIC: boolean;
  isDICLogged: boolean;
  lethalTriadActive: boolean;
  prevLethalTriadLogged: boolean;

  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

const NORMAL_PLATELET_K = 250; // k/μL
const NORMAL_FIBRINOGEN = 300; // mg/dL
const NORMAL_FACTOR_ACTIVITY = 1.0;
const NORMAL_FIBRINOLYSIS = 0.0;

const HALF_LIFE_FACTOR_SEC = 6 * 3600; // composite factor activity ~6h half-life for acute modeling
const HALF_LIFE_FIBRINOGEN_SEC = 4 * 3600; // shorter than many factors -- first to fall in massive hemorrhage

export class CoagulationCascadeModel {
  static tick(inputs: CoagulationInputs = {}): CoagulationOutput {
    const events: string[] = [];
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));

    const prev_plt = clamp(safeNumber(inputs.prevPlateletCountK, NORMAL_PLATELET_K), 0, 1200);
    const prev_fib = clamp(safeNumber(inputs.prevFibrinogenMgDl, NORMAL_FIBRINOGEN), 0, 800);
    const prev_fac = clamp(safeNumber(inputs.prevFactorActivityFraction, NORMAL_FACTOR_ACTIVITY), 0, 1);
    const prev_lys = clamp(safeNumber(inputs.prevFibrinolysisIndex, NORMAL_FIBRINOLYSIS), 0, 1);
    const prevLethalTriadLogged = !!inputs.prevLethalTriadLogged;
    let isDICLogged = !!inputs.isDICLogged;

    const temperature = clamp(safeNumber(inputs.temperature, 37), 20, 43);
    const pH = clamp(safeNumber(inputs.pH, 7.4), 6.5, 7.8);
    const bloodLossRateMlPerSec = Math.max(0, safeNumber(inputs.bloodLossRateMlPerSec, 0));
    const ebv = Math.max(500, safeNumber(inputs.ebv, 5000));
    const crystalloidRateMlPerSec = Math.max(0, safeNumber(inputs.crystalloidInfusionRateMlPerSec, 0));
    const isActiveDIC = !!inputs.isActiveDIC;

    const heparinCe = Math.max(0, safeNumber(inputs.heparinCe, 0));
    const protamineCe = Math.max(0, safeNumber(inputs.protamineCe, 0));
    const txaCe = Math.max(0, safeNumber(inputs.txaCe, 0));

    const ffpVol = Math.max(0, safeNumber(inputs.ffpVolumeMlThisTick, 0));
    const pltVol = Math.max(0, safeNumber(inputs.plateletsVolumeMlThisTick, 0));
    const cryoVol = Math.max(0, safeNumber(inputs.cryoprecipitateVolumeMlThisTick, 0));
    const fibconcVol = Math.max(0, safeNumber(inputs.fibrinogenConcentrateVolumeMlThisTick, 0));

    const hepaticSyntheticFraction = clamp(safeNumber(inputs.hepaticSyntheticFraction, 1.0), 0, 1);

    // --- Hypothermia and acidosis coagulation enzyme impairment ---
    // Serine proteases (clotting factors) are Q10-sensitive enzymes -- their rate constants
    // drop significantly at hypothermic temperatures, primarily below 35-36°C. pH<7.2
    // protonates active-site histidine residues, similarly blunting factor binding/activity.
    const hypothermiaImpairment = clamp((36 - temperature) / 7.0, 0, 1);
    const acidosisImpairment = clamp((7.2 - pH) / 0.5, 0, 1);
    const enzymeImpairment = 1 - (1 - hypothermiaImpairment) * (1 - acidosisImpairment);

    // --- Consumption / dilution rates ---
    const bleedFraction = bloodLossRateMlPerSec / ebv;
    const dilutionFraction = crystalloidRateMlPerSec / ebv;
    const dicConsumptionRate = isActiveDIC ? 0.0005 : 0;

    // --- Factor activity ---
    // Target: hepatic synthetic ceiling (cirrhosis/liver failure caps achievable activity),
    // further depressed by enzyme impairment (hypothermia + acidosis -- immediate effect).
    // Natural recovery toward hepatic ceiling via factor synthesis half-lives.
    const factorTarget = hepaticSyntheticFraction * (1 - enzymeImpairment * 0.8);
    const factorHalfLifeRateConstant = Math.log(2) / HALF_LIFE_FACTOR_SEC;
    let factorActivity = prev_fac;
    factorActivity -= (bleedFraction + dilutionFraction * 0.5) * prev_fac * dt;
    factorActivity -= dicConsumptionRate * dt;
    factorActivity += factorHalfLifeRateConstant * (factorTarget - factorActivity) * dt;

    // Heparin anticoagulant effect: reduces effective factor activity (via antithrombin III
    // activation -- the MECHANISM, not a direct binding to factor proteins themselves, but
    // produces the same net reduction in thrombin/Xa activity measured by aPTT).
    const heparinEffect = clamp(heparinCe / (heparinCe + 1.5), 0, 0.9);
    const protamineReversal = clamp(protamineCe / (protamineCe + 0.5), 0, 1);
    const netHeparinEffect = heparinEffect * (1 - protamineReversal);

    // FFP replenishes ALL factors (and fibrinogen, though less efficiently than cryo).
    const ffpFactorReplenishment = (ffpVol / 250) * 0.12 * NORMAL_FACTOR_ACTIVITY;
    factorActivity += ffpFactorReplenishment;
    factorActivity = clamp(factorActivity, 0, 1);

    // --- Platelet count ---
    const pltHalfLifeRateConstant = Math.log(2) / (5 * 24 * 3600); // ~5-day platelet lifespan
    let plateletCountK = prev_plt;
    plateletCountK -= (bleedFraction * 0.7 + dilutionFraction * 0.4) * prev_plt * dt;
    plateletCountK -= dicConsumptionRate * 2000 * dt;
    plateletCountK += pltHalfLifeRateConstant * (NORMAL_PLATELET_K - prev_plt) * dt;
    const pltReplenishment = (pltVol / 250) * 50;
    plateletCountK += pltReplenishment;
    plateletCountK = clamp(plateletCountK, 0, 1200);

    // --- Fibrinogen ---
    let fibrinogenMgDl = prev_fib;
    fibrinogenMgDl -= (bleedFraction * 0.8 + dilutionFraction * 0.5) * prev_fib * dt;
    fibrinogenMgDl -= dicConsumptionRate * 200 * dt;
    const fibHalfLifeRateConstant = Math.log(2) / HALF_LIFE_FIBRINOGEN_SEC;
    fibrinogenMgDl += fibHalfLifeRateConstant * (NORMAL_FIBRINOGEN * hepaticSyntheticFraction - prev_fib) * dt;
    const cryoReplenishment = (cryoVol / 10) * 50;
    const fibconcReplenishment = (fibconcVol / 5) * 200;
    fibrinogenMgDl += cryoReplenishment + fibconcReplenishment + (ffpVol / 250) * 15;
    fibrinogenMgDl = clamp(fibrinogenMgDl, 0, 800);

    // --- Fibrinolysis index ---
    // Hyperfibrinolysis: trauma/DIC/hypoperfusion activates tPA (tissue plasminogen
    // activator), generating plasmin which cleaves fibrin and fibrinogen (worsening both
    // hemostasis and fibrinogen levels). TXA blocks plasminogen-to-plasmin conversion,
    // effectively reducing fibrinolysis index toward zero.
    const fibrinolysisActivationRate = (isActiveDIC ? 0.0008 : 0) + (bleedFraction > 0.001 ? bleedFraction * 0.5 : 0);
    const txaFibrinolysisInhibition = txaCe / (txaCe + 10);
    let fibrinolysisIndex = prev_lys;
    fibrinolysisIndex += fibrinolysisActivationRate * dt;
    fibrinolysisIndex -= txaFibrinolysisInhibition * prev_lys * 0.01 * dt;
    fibrinolysisIndex -= 0.0001 * prev_lys * dt; // spontaneous resolution
    fibrinolysisIndex = clamp(fibrinolysisIndex, 0, 1);

    // Additional fibrinogen loss from active fibrinolysis (plasmin cleaves fibrinogen)
    fibrinogenMgDl = Math.max(0, fibrinogenMgDl - fibrinolysisIndex * 0.02 * dt);

    // --- Derived clinical parameters ---
    // INR: 1.0 at normal factor activity, rises as activity falls. Hepatic vitamin-K-dependent
    // factors (II, VII, IX, X) are most reflected. Simplified relationship:
    // factorActivity → INR: 1.0 = 1.0, 0.5 = ~1.7, 0.3 = ~2.5, 0.1 = ~4.0
    const effectiveFactor = factorActivity * (1 - netHeparinEffect * 0.3);
    const inr = clamp(1 + (1 - effectiveFactor) * 3.5, 1.0, 10.0);

    // aPTT: more sensitive to intrinsic pathway factors (VIII, IX, XI) and heparin.
    const aptt = clamp(25 + (1 - effectiveFactor) * 60 + netHeparinEffect * 120, 25, 300);

    // TEG/ROTEM-style outputs replacing the abstract offset model:
    const tegR = clamp(4 + (1 - effectiveFactor) * 12 + netHeparinEffect * 20, 2, 40);
    const fibNorm = fibrinogenMgDl / NORMAL_FIBRINOGEN;
    const tegK = clamp(1.5 + (1 - fibNorm) * 4 + (1 - effectiveFactor) * 3, 1, 15);
    const tegAlpha = clamp(53 + fibNorm * 17 + (plateletCountK / NORMAL_PLATELET_K) * 10 - enzymeImpairment * 20, 0, 80);
    const tegMA = clamp(40 + (plateletCountK / NORMAL_PLATELET_K) * 30 + fibNorm * 15, 10, 90);
    const tegLY30 = clamp(fibrinolysisIndex * 80, 0, 100);

    // --- Lethal triad detection ---
    const isCoagulopathic = inr > 2.0 || plateletCountK < 50;
    const isHypothermic = temperature < 34;
    const isAcidotic = pH < 7.2;
    const lethalTriadActive = isCoagulopathic && isHypothermic && isAcidotic;
    let newLethalTriadLogged = prevLethalTriadLogged;
    if (lethalTriadActive && !prevLethalTriadLogged) {
      events.push("🚨 CRITICAL: Lethal triad of trauma anesthesia detected -- simultaneous hypothermia (temp < 34°C), acidosis (pH < 7.2), and coagulopathy (INR > 2 or platelets < 50k). Damage-control resuscitation is indicated: warm blood products in a 1:1:1 ratio (PRBC:FFP:Platelets), active warming, and correction of acidosis before surgical hemostasis.");
      newLethalTriadLogged = true;
    } else if (!lethalTriadActive && prevLethalTriadLogged) {
      events.push("✅ CLINICAL UPDATE: Lethal triad has been broken -- hypothermia, acidosis, and coagulopathy are no longer simultaneously present.");
      newLethalTriadLogged = false;
    }

    // --- DIC detection ---
    const isDIC = !!inputs.isActiveDIC;
    if (isDIC && !isDICLogged) {
      events.push("🚨 CRITICAL: Disseminated Intravascular Coagulation (DIC) is active -- simultaneous microthrombi formation and consumptive coagulopathy. Treat the underlying trigger; support with platelets, FFP, and cryoprecipitate; consider TXA if primary fibrinolysis component is dominant.");
      isDICLogged = true;
    } else if (!isDIC && isDICLogged) {
      isDICLogged = false;
    }

    return {
      plateletCountK: parseFloat(plateletCountK.toFixed(3)),
      fibrinogenMgDl: parseFloat(fibrinogenMgDl.toFixed(3)),
      factorActivityFraction: parseFloat(factorActivity.toFixed(4)),
      fibrinolysisIndex: parseFloat(fibrinolysisIndex.toFixed(4)),
      inr: parseFloat(inr.toFixed(2)),
      aptt: parseFloat(aptt.toFixed(1)),
      tegR: parseFloat(tegR.toFixed(2)),
      tegK: parseFloat(tegK.toFixed(2)),
      tegAlpha: parseFloat(tegAlpha.toFixed(1)),
      tegMA: parseFloat(tegMA.toFixed(1)),
      tegLY30: parseFloat(tegLY30.toFixed(1)),
      hypothermiaCoagImpairment: parseFloat(hypothermiaImpairment.toFixed(4)),
      acidosisCoagImpairment: parseFloat(acidosisImpairment.toFixed(4)),
      isDIC,
      isDICLogged,
      lethalTriadActive,
      prevLethalTriadLogged: newLethalTriadLogged,
      events
    };
  }
}
