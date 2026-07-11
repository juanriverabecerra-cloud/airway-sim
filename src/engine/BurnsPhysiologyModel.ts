/**
 * Burns Physiology Model
 *
 * Severe burn injuries present the most complex physiologic challenge in anesthesia:
 * massive fluid shifts, systemic inflammatory response, hypermetabolism, coagulopathy,
 * airway edema from inhalation injury, and a prolonged catabolic state lasting months.
 *
 * === BURN ASSESSMENT ===
 * Rule of Nines (adult): Head 9%, each arm 9%, chest (anterior) 9%, abdomen 9%,
 * upper back 9%, lower back 9%, each thigh 4.5%, each lower leg 4.5%, perineum 1%.
 * Lund-Browder chart is more accurate (accounts for age-related BSA distribution).
 * Only 2nd and 3rd degree burns count toward Parkland resuscitation.
 *
 * === PARKLAND FORMULA ===
 * Ringer's Lactate: 4 mL × kg body weight × %TBSA burned
 * - First half: in first 8h from TIME OF INJURY (not from hospital arrival)
 * - Second half: over next 16h
 * 24h total = 4 × 80kg × 40% TBSA = 12,800 mL (12.8 L)
 * (Baxter CR, Shires T, Ann NY Acad Sci 1968; Warden GD, J Burn Care Rehab 1992)
 *
 * === HYPERMETABOLISM ===
 * The hypermetabolic response peaks at 40-60% TBSA, reaching 180-200% of normal VO2.
 * Driven by: catecholamine surge, inflammatory cytokines, wound-driven thermogenesis,
 * loss of skin barrier (evaporative heat/fluid loss). Persists for months post-burn.
 * Formula: metabolicMultiplier = 1 + 0.017 × TBSA% (capped at 2.0)
 * (Jeschke MG et al. Crit Care Med 2011; Gauglitz GG et al. Mol Med 2008)
 *
 * === INHALATION INJURY ===
 * Upper airway (supraglottic): thermal injury → edema over 2-8h → potential airway loss.
 * Subglottic: chemical injury from combustion products (aldehydes, HCl, SO2) → mucosal
 * sloughing, bronchospasm, impaired mucociliary clearance, ARDS within 12-72h.
 * Signs: singed nasal hair/eyebrows, hoarseness, stridor, carbonaceous sputum.
 * Immediate intubation if inhalation injury suspected → don't wait for edema to progress.
 *
 * === NMB CONSIDERATIONS ===
 * SUCCINYLCHOLINE ABSOLUTELY CONTRAINDICATED from 48h to 2 years post-burn:
 * Upregulated extrajunctional AChRs → massive K+ release → fatal hyperkalemia.
 * (Already flagged in usePhysiology.js via the burns/nAChR_state='upregulated' check)
 * Safe NDMRs: rocuronium (dose ↑ 30-50% due to receptor upregulation), vecuronium.
 *
 * === FLUID SHIFTS IN ACUTE BURNS ===
 * Phase 1 (0-24h): Massive capillary leak → third-spacing of fluid → hypovolemia
 *   despite Parkland resuscitation (similar mechanism to LymphaticSystemModel.ts)
 * Phase 2 (24-72h): Capillary resealing → fluid mobilization → risk of pulmonary edema
 *   if Parkland was over-administered
 * Phase 3 (>72h): Hypermetabolism, protein catabolism, nutritional needs dominate
 *
 * Sources: Miller's 9th Ed Ch 87 (Burn Injury); Brigham PA, McLoughlin E, JAMA 1996;
 * Jeschke MG, Lancet 2018.
 */

export interface BurnsInputs {
  burnsTBSAPercent?: number;       // % total body surface area, 2nd+3rd degree only
  hoursPostBurn?: number;          // hours since injury (for fluid phase calculation)
  weightKg?: number;               // for Parkland formula
  inhalationInjury?: boolean;      // suspected or confirmed inhalation/smoke injury
  inhalationSeverity?: number;     // 0-1: 0=mild upper airway only, 1=severe subglottic
  airwaySecured?: boolean;         // ETT in place (affects inhalation injury risk)
  totalParklandGivenMl?: number;   // how much Parkland fluid has actually been given
  currentFiO2?: number;            // affects inhalation injury oxygenation
  prevBurnOnsetLogged?: boolean;
  prevInhalationLogged?: boolean;
  prevAirwayEdemaLogged?: boolean;
  prevParklandAlertLogged?: boolean;
}

export interface BurnsOutput {
  burnsTBSAPercent: number;
  burnsMetabolicMultiplier: number;         // multiplier for totalMetabolicMultiplier chain
  parklandTotalRequiredMl: number;          // 4 × kg × TBSA
  parklandFirst8hRequiredMl: number;        // half, due in first 8h from injury
  parklandFluidDeficitMl: number;           // required - given (positive = undertreated)
  parklandOver24hRequiredMl: number;        // full 24h requirement
  evaporativeHeatLossW: number;             // Watts lost through wounds (feeds ThermoregulationModel)
  inhalationInjuryCompliancePenalty: number;  // fraction (0-0.5) multiply compliance by (1-this)
  inhalationInjuryResistancePenalty: number;  // cmH2O/L/s additive increase
  inhalationInjuryShuntContribution: number;  // additive to actualShunt (0-0.25)
  upperAirwayEdemaRisk: number;             // 0-1: 0=safe, 1=imminent airway loss
  suxContraindicated: boolean;              // true after 48h post-burn
  prevBurnOnsetLogged: boolean;
  prevInhalationLogged: boolean;
  prevAirwayEdemaLogged: boolean;
  prevParklandAlertLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class BurnsPhysiologyModel {
  static tick(inputs: BurnsInputs = {}): BurnsOutput {
    const events: string[] = [];
    let prevBurnOnsetLogged = !!inputs.prevBurnOnsetLogged;
    let prevInhalationLogged = !!inputs.prevInhalationLogged;
    let prevAirwayEdemaLogged = !!inputs.prevAirwayEdemaLogged;
    let prevParklandAlertLogged = !!inputs.prevParklandAlertLogged;

    const tbsa = clamp(safeNumber(inputs.burnsTBSAPercent, 0), 0, 100);
    const hoursPost = clamp(safeNumber(inputs.hoursPostBurn, 0), 0, 240);
    const weightKg = clamp(safeNumber(inputs.weightKg, 70), 10, 300);
    const inhalation = !!inputs.inhalationInjury;
    const inhalSeverity = clamp(safeNumber(inputs.inhalationSeverity, 0.5), 0, 1.0);
    const airwaySecured = !!inputs.airwaySecured;
    const parklandGiven = clamp(safeNumber(inputs.totalParklandGivenMl, 0), 0, 50000);

    if (tbsa === 0 && !inhalation) {
      return {
        burnsTBSAPercent: 0,
        burnsMetabolicMultiplier: 1.0,
        parklandTotalRequiredMl: 0,
        parklandFirst8hRequiredMl: 0,
        parklandFluidDeficitMl: 0,
        parklandOver24hRequiredMl: 0,
        evaporativeHeatLossW: 0,
        inhalationInjuryCompliancePenalty: 0,
        inhalationInjuryResistancePenalty: 0,
        inhalationInjuryShuntContribution: 0,
        upperAirwayEdemaRisk: 0,
        suxContraindicated: false,
        prevBurnOnsetLogged,
        prevInhalationLogged,
        prevAirwayEdemaLogged,
        prevParklandAlertLogged,
        events,
      };
    }

    // ===========================
    // BURN ONSET EVENT
    // ===========================
    if ((tbsa > 0 || inhalation) && !prevBurnOnsetLogged) {
      const suxWarning = hoursPost >= 48 ? ' SUCCINYLCHOLINE ABSOLUTELY CONTRAINDICATED (receptor upregulation — fatal hyperkalemia risk).' : ' If surgery required >48h post-burn: SUCCINYLCHOLINE CONTRAINDICATED; use rocuronium (increased dose 30-50%).';
      events.push(
        `🔥 MAJOR BURN INJURY: TBSA ${tbsa.toFixed(0)}% (2nd/3rd degree). Parkland formula: ${(4 * weightKg * tbsa).toFixed(0)} mL RL total in 24h — half (${(2 * weightKg * tbsa).toFixed(0)} mL) in first 8h from INJURY TIME. Monitor UO 0.5-1 mL/kg/hr as resuscitation endpoint. Expect massive third-spacing, capillary leak phase (0-24h), hypermetabolism.${suxWarning} Inhalation injury: ${inhalation ? 'SUSPECTED — early intubation before airway edema progresses' : 'not currently flagged'}.`,
      );
      prevBurnOnsetLogged = true;
    }

    // ===========================
    // HYPERMETABOLISM
    // ===========================
    // Peaks at ~40-60% TBSA, formula validated against Wilmore 1974 calorimetry data.
    // metabolicMultiplier = 1 + 0.017 × TBSA (capped 2.0)
    const burnsMetabolicMultiplier = clamp(1.0 + 0.017 * tbsa, 1.0, 2.0);

    // ===========================
    // PARKLAND FORMULA
    // ===========================
    const parklandTotal = 4.0 * weightKg * tbsa;          // mL
    const parklandFirst8h = parklandTotal / 2;             // mL in first 8h
    const parklandOver24h = parklandTotal;                 // 24h total

    // How much should have been given by now?
    let parklandDueSoFar = 0;
    if (hoursPost <= 8) {
      // Linear delivery of first half over 8h
      parklandDueSoFar = (parklandFirst8h / 8) * hoursPost;
    } else if (hoursPost <= 24) {
      // First half complete + linear delivery of second half over 16h
      parklandDueSoFar = parklandFirst8h + (parklandFirst8h / 16) * (hoursPost - 8);
    } else {
      parklandDueSoFar = parklandTotal; // 24h cycle complete
    }

    const parklandFluidDeficitMl = Math.max(0, parklandDueSoFar - parklandGiven);

    // Alert if >500 mL behind on Parkland with >10% TBSA
    if (parklandFluidDeficitMl > 500 && tbsa >= 10 && !prevParklandAlertLogged) {
      events.push(
        `⚠️ PARKLAND UNDER-RESUSCITATION: ${parklandFluidDeficitMl.toFixed(0)} mL behind on Parkland target. Expected by now: ${parklandDueSoFar.toFixed(0)} mL. Given: ${parklandGiven.toFixed(0)} mL. Current TBSA: ${tbsa.toFixed(0)}%. Inadequate resuscitation → hypovolemia, AKI (UO target 0.5 mL/kg/hr = ${(0.5 * weightKg).toFixed(0)} mL/hr), end-organ ischemia. Increase RL infusion rate.`,
      );
      prevParklandAlertLogged = true;
    }
    if (parklandFluidDeficitMl < 200) prevParklandAlertLogged = false;

    // ===========================
    // EVAPORATIVE HEAT LOSS THROUGH WOUNDS
    // ===========================
    // Evaporative loss from burns: (25 + 0.6 × %TBSA) × BSA in mL/hr
    // Heat of vaporization water = 0.67 Wh/mL → convert to Watts
    // BSA ≈ 1.73 m² adult. Watts = [evapMlPerHr / 3600] × 0.67 × 3600 (cancel)
    // = (25 + 0.6 × TBSA) × BSA × 0.67
    const evapMlPerHrPerM2 = 25 + 0.6 * tbsa;
    const evaporativeHeatLossW = evapMlPerHrPerM2 * 1.73 * 0.67; // Watts

    // ===========================
    // INHALATION INJURY (respiratory effects)
    // ===========================
    let inhalationInjuryCompliancePenalty = 0;
    let inhalationInjuryResistancePenalty = 0;
    let inhalationInjuryShuntContribution = 0;
    let upperAirwayEdemaRisk = 0;

    if (inhalation) {
      // Upper airway edema: peaks at 4-8h post-burn, worst below 24h
      // Danger zone: hoursPost 2-24h (edema progresses)
      const edemaTimeModifier = hoursPost < 2 ? 0 :
        hoursPost <= 8 ? (hoursPost - 2) / 6 :
        hoursPost <= 24 ? 1.0 :
        Math.max(0, 1.0 - (hoursPost - 24) / 48); // gradually resolves

      upperAirwayEdemaRisk = edemaTimeModifier * inhalSeverity;

      // Compliance penalty: alveolar edema, surfactant loss, mucosal sloughing
      // Peaks at 24-72h as chemical injury progresses to ARDS pattern
      const ards_timing = hoursPost > 12 ? Math.min(1.0, (hoursPost - 12) / 60) : 0;
      inhalationInjuryCompliancePenalty = clamp(inhalSeverity * 0.4 * ards_timing, 0, 0.5);

      // Resistance penalty: bronchospasm from irritants, mucosal swelling
      inhalationInjuryResistancePenalty = clamp(inhalSeverity * 8 * Math.min(1, hoursPost / 4), 0, 20);

      // Shunt: atelectasis from mucosal plugging, surfactant dysfunction
      inhalationInjuryShuntContribution = clamp(inhalSeverity * 0.20 * ards_timing, 0, 0.25);

      if (!prevInhalationLogged) {
        events.push(
          `⚠️ INHALATION INJURY PRESENT: Thermal/chemical injury to airway. Edema peaks at 4-8h post-exposure. Signs of impending airway loss: hoarseness, stridor, carbonaceous sputum, singed nasal hair, facial burns. If not already intubated: EARLY INTUBATION before progressive edema makes intubation impossible. Expect worsening compliance and resistance over 12-72h as chemical ARDS pattern develops. Monitor CXR, A-a gradient, PaO2/FiO2 ratio.`,
        );
        prevInhalationLogged = true;
      }

      if (upperAirwayEdemaRisk > 0.6 && !airwaySecured && !prevAirwayEdemaLogged) {
        events.push(
          `🚨 AIRWAY EMERGENCY: High upper airway edema risk (${(upperAirwayEdemaRisk * 100).toFixed(0)}%). Airway is NOT secured. At this stage post-inhalation injury, laryngeal and supraglottic edema may make direct laryngoscopy impossible. RSI NOW with anticipated difficult airway backup (video laryngoscope, surgical airway kit at bedside). If patient able, consider awake fiberoptic. DO NOT DELAY — this window is closing.`,
        );
        prevAirwayEdemaLogged = true;
      }
    }

    // ===========================
    // SUX CONTRAINDICATION
    // ===========================
    const suxContraindicated = hoursPost >= 48 && tbsa >= 10;

    // ===========================
    // SUX CONTRAINDICATION WARNING (if not already caught by usePhysiology burns flag)
    // ===========================

    return {
      burnsTBSAPercent: tbsa,
      burnsMetabolicMultiplier: parseFloat(burnsMetabolicMultiplier.toFixed(4)),
      parklandTotalRequiredMl: parseFloat(parklandTotal.toFixed(0)),
      parklandFirst8hRequiredMl: parseFloat(parklandFirst8h.toFixed(0)),
      parklandFluidDeficitMl: parseFloat(parklandFluidDeficitMl.toFixed(0)),
      parklandOver24hRequiredMl: parseFloat(parklandOver24h.toFixed(0)),
      evaporativeHeatLossW: parseFloat(evaporativeHeatLossW.toFixed(1)),
      inhalationInjuryCompliancePenalty: parseFloat(inhalationInjuryCompliancePenalty.toFixed(4)),
      inhalationInjuryResistancePenalty: parseFloat(inhalationInjuryResistancePenalty.toFixed(2)),
      inhalationInjuryShuntContribution: parseFloat(inhalationInjuryShuntContribution.toFixed(4)),
      upperAirwayEdemaRisk: parseFloat(upperAirwayEdemaRisk.toFixed(4)),
      suxContraindicated,
      prevBurnOnsetLogged,
      prevInhalationLogged,
      prevAirwayEdemaLogged,
      prevParklandAlertLogged,
      events,
    };
  }
}
