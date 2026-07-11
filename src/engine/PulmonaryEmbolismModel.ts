/**
 * Pulmonary Embolism Model: Intraoperative PE Crisis
 *
 * Gap closure. Pulmonary embolism is the third most common cardiovascular cause of death
 * and occurs intraoperatively with acute, dramatic hemodynamic collapse. The existing
 * cardiovascular engine had no PE trigger mechanism.
 *
 * === MECHANISMS ===
 *
 * PE occludes pulmonary vasculature → immediate increase in PVR (pulmonary vascular resistance).
 * The right ventricle is thin-walled and highly sensitive to sudden afterload increases:
 *
 * 1. MASSIVE PE (>50% pulmonary vasculature occluded):
 *    - PVR doubles or triples within seconds
 *    - RV dilates rapidly (dilation visible on echo: "D sign" in LV on parasternal short axis)
 *    - RV outflow obstruction → reduced PA flow → reduced LA filling → reduced LV preload
 *    - Systemic hypotension + paradoxical bradycardia → cardiovascular collapse
 *    - Classic echo: McConnell's sign (apical RV hyperkinesis with RV free wall akinesis)
 *    - Dead space increase: VQ mismatch (occlusion without perfusion) → EtCO2 drops suddenly
 *      while PaCO2 RISES (EtCO2 reflects dead space washout, not alveolar CO2)
 *    - EtCO2 sudden drop = the MOST RELIABLE intraoperative PE sign during IPPV
 *
 * 2. PARADOXICAL EMBOLISM: venous clot → passes through PFO (patent foramen ovale, present in
 *    ~25% of population) → becomes ARTERIAL embolism. Can cause simultaneous PE + stroke.
 *
 * 3. VENOUS AIR EMBOLISM (VAE): distinct mechanism but similar presentation. Air occludes
 *    pulmonary capillaries and outflow tracts → same hemodynamic pattern.
 *    (Modeled separately in VenousAirEmbolismModel.ts)
 *
 * === INTRAOPERATIVE DISTINGUISHING FEATURES ===
 * - Sudden unexplained hypotension + desaturation during IPPV
 * - SUDDEN EtCO2 DROP (pathognomonic during positive-pressure ventilation)
 * - INCREASED PaCO2 with simultaneous decreased EtCO2 (widening dead space gradient)
 * - Increased airway pressure (if RV failure causes pulmonary vascular congestion)
 * - S1Q3T3 on ECG (right heart strain pattern) -- pathognomonic but only seen in ~50%
 * - Confirmed by: intraoperative TEE (RV dilation, McConnell's sign), CT-PA post-op
 *
 * === TREATMENTS ===
 * - Immediate: O2 100%, STOP N2O (if used), maintain BP
 * - Systemic thrombolysis (tPA, alteplase): if hemodynamically unstable, can be given
 *   INTRAOPERATIVELY (risk of massive surgical bleeding must be weighed)
 * - ECMO: for refractory PE causing cardiac arrest
 * - Surgical embolectomy: for massive PE where thrombolysis is contraindicated or failed
 * - Aspirin, anticoagulation with heparin/LMWH: for stable/submassive PE
 *
 * Source: Konstantinides SV et al. Eur Heart J 2020 (ESC PE guidelines);
 * Aissaoui N et al. Intensive Care Med 2016 (intraoperative PE management).
 */

export interface PulmonaryEmbolismInputs {
  active?: boolean; // PE event is occurring
  severity?: 'submassive' | 'massive'; // extent of vascular occlusion
  occlusionFraction?: number; // 0-1, fraction of pulmonary vasculature occluded
  minutesSinceOnset?: number; // time progression of untreated PE
  tpaActive?: boolean; // systemic thrombolysis active (tPA)
  heparinCe?: number; // anticoagulation (prevents extension, doesn't lyse clot acutely)
  prevCollapseLogged?: boolean;
  prevEtco2DropLogged?: boolean;
}

export interface PulmonaryEmbolismOutput {
  active: boolean;
  severity: string;
  occlusionFraction: number;

  // Hemodynamic consequences
  pvrIncreaseFraction: number; // fractional PVR increase (feeds FourChamberCircuitModel)
  rvFailureSeverity: number; // 0-1, degree of acute RV failure
  svrReductionFraction: number; // paradoxical SVR drop from cardiogenic shock
  cardiacOutputFraction: number; // CO as fraction of baseline

  // Respiratory consequences
  etco2DropMmHg: number; // EtCO2 falls (increased dead space)
  paco2RiseMmHg: number; // PaCO2 rises (CO2 can't get to dead-space alveoli)
  deadSpaceIncreaseFraction: number; // Vd/Vt increases
  spo2DropPercent: number; // hypoxia from shunting + reduced CO

  // Thrombolysis response
  lysisRate: number; // fraction of clot being lysed per hour
  resolutionFraction: number; // how much of clot has lysed

  prevCollapseLogged: boolean;
  prevEtco2DropLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class PulmonaryEmbolismModel {
  static tick(inputs: PulmonaryEmbolismInputs = {}): PulmonaryEmbolismOutput {
    const events: string[] = [];
    const active = !!inputs.active;

    if (!active) {
      return {
        active: false, severity: 'none', occlusionFraction: 0,
        pvrIncreaseFraction: 0, rvFailureSeverity: 0, svrReductionFraction: 0,
        cardiacOutputFraction: 1.0, etco2DropMmHg: 0, paco2RiseMmHg: 0,
        deadSpaceIncreaseFraction: 0, spo2DropPercent: 0, lysisRate: 0,
        resolutionFraction: 0, prevCollapseLogged: false, prevEtco2DropLogged: false,
        events
      };
    }

    const severity = inputs.severity || 'massive';
    const occlusionFraction = clamp(safeNumber(inputs.occlusionFraction, severity === 'massive' ? 0.6 : 0.3), 0, 1);
    const minutesSinceOnset = Math.max(0, safeNumber(inputs.minutesSinceOnset, 0));
    const tpaActive = !!inputs.tpaActive;
    const heparinCe = Math.max(0, safeNumber(inputs.heparinCe, 0));
    let prevCollapseLogged = !!inputs.prevCollapseLogged;
    let prevEtco2DropLogged = !!inputs.prevEtco2DropLogged;

    // PVR increases proportional to occlusion
    // At 50% occlusion: ~2× PVR; at 75%: ~4× PVR (exponential because remaining vessels
    // must accommodate full cardiac output through half the vascular bed)
    const pvrIncreaseFraction = clamp(Math.pow(occlusionFraction / 0.5, 1.5) * 1.5, 0, 5);

    // RV failure: thin-walled RV cannot handle sudden PVR increase
    const rvFailureSeverity = clamp(occlusionFraction * 1.4, 0, 1);

    // Compensatory SVR response → then failure as CO drops → cardiogenic shock → SVR drops
    const svrReductionFraction = rvFailureSeverity > 0.6 ? (rvFailureSeverity - 0.6) * 1.5 : 0;

    // CO drops: initially preserved by tachycardia, then falls with RV failure
    const cardiacOutputFraction = clamp(1.0 - rvFailureSeverity * 0.8, 0.1, 1.0);

    // Respiratory: EtCO2 drops (dead space), PaCO2 rises
    const etco2DropMmHg = occlusionFraction * 20; // 50% occlusion → EtCO2 drops ~10 mmHg
    const paco2RiseMmHg = occlusionFraction * 10;
    const deadSpaceIncreaseFraction = occlusionFraction * 0.6;
    const spo2DropPercent = rvFailureSeverity * 15 + occlusionFraction * 10; // shunt + low CO

    // Thrombolysis: tPA can lyse clot at ~15-30% per hour, plateau at ~80% resolution
    const lysisRate = tpaActive ? 0.25 : (heparinCe > 0.5 ? 0.02 : 0);
    const resolutionFraction = Math.min(0.8, lysisRate * minutesSinceOnset / 60);
    const effectiveOcclusion = occlusionFraction * (1 - resolutionFraction);

    // Recalculate hemodynamic consequences based on EFFECTIVE (post-lysis) occlusion
    const effectivePvr = clamp(Math.pow(effectiveOcclusion / 0.5, 1.5) * 1.5, 0, 5);
    const effectiveRVFailure = clamp(effectiveOcclusion * 1.4, 0, 1);
    const effectiveSVRReduction = effectiveRVFailure > 0.6 ? (effectiveRVFailure - 0.6) * 1.5 : 0;
    const effectiveCO = clamp(1.0 - effectiveRVFailure * 0.8, 0.1, 1.0);
    const effectiveEtco2Drop = effectiveOcclusion * 20;
    const effectivePaCO2Rise = effectiveOcclusion * 10;
    const effectiveDeadSpace = effectiveOcclusion * 0.6;
    const effectiveSPO2Drop = effectiveRVFailure * 15 + effectiveOcclusion * 10;

    // Events
    if (effectiveOcclusion > 0.3 && !prevEtco2DropLogged) {
      events.push("🚨 CRITICAL: Sudden EtCO2 DROP during positive-pressure ventilation -- consider PULMONARY EMBOLISM. Pathognomonic: EtCO2 falls while PaCO2 rises (widening dead space gradient). Hemodynamic: hypotension + tachycardia + desaturation. Actions: 100% FiO2, maintain BP with vasopressors (vasopressin preferred -- avoids RV tachycardia), IMMEDIATE TEE (D-sign, McConnell's sign). If massive and hemodynamically unstable: systemic thrombolysis (tPA 50-100mg IV over 2h) despite surgical bleeding risk.");
      prevEtco2DropLogged = true;
    }

    if (effectiveOcclusion > 0.55 && rvFailureSeverity > 0.7 && !prevCollapseLogged) {
      events.push("🚨 EMERGENCY: MASSIVE PULMONARY EMBOLISM with RV failure. CVP rising, CO collapsing, MAP falling. Initiate systemic thrombolysis IMMEDIATELY if not contraindicated. Consider ECMO consultation. Vasopressin + phenylephrine to maintain coronary perfusion pressure. Avoid agents that reduce RV afterload (nitroglycerin can worsen systemic hypotension with RV failure).");
      prevCollapseLogged = true;
    }

    return {
      active: true,
      severity: effectiveOcclusion > 0.5 ? 'massive' : 'submassive',
      occlusionFraction: parseFloat(effectiveOcclusion.toFixed(4)),
      pvrIncreaseFraction: parseFloat(effectivePvr.toFixed(4)),
      rvFailureSeverity: parseFloat(effectiveRVFailure.toFixed(4)),
      svrReductionFraction: parseFloat(effectiveSVRReduction.toFixed(4)),
      cardiacOutputFraction: parseFloat(effectiveCO.toFixed(4)),
      etco2DropMmHg: parseFloat(effectiveEtco2Drop.toFixed(1)),
      paco2RiseMmHg: parseFloat(effectivePaCO2Rise.toFixed(1)),
      deadSpaceIncreaseFraction: parseFloat(effectiveDeadSpace.toFixed(4)),
      spo2DropPercent: parseFloat(effectiveSPO2Drop.toFixed(1)),
      lysisRate: parseFloat(lysisRate.toFixed(4)),
      resolutionFraction: parseFloat(resolutionFraction.toFixed(4)),
      prevCollapseLogged,
      prevEtco2DropLogged,
      events
    };
  }
}
