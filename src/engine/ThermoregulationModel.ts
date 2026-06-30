/**
 * Thermoregulation Model: Pennes Bioheat-Based Core Temperature Physics
 *
 * Phase 4 (integumentary/thermoregulation/adipose bucket) of
 * /Users/jsriverab/.claude/plans/mutable-roaming-newell.md. The existing model used a single
 * flat constant `tempDropRate = 0.0001°C/s` at rest and `0.0008°C/s` during early
 * anesthesia -- no environmental temperature, no body surface area, no warming intervention
 * physics, and no decomposition into the real mechanisms (radiation, convection, evaporation).
 * This model replaces that constant with a real net-heat-balance computation:
 *
 * Pennes bioheat equation (simplified to a lumped single-compartment core-temperature model
 * appropriate for this simulator's 1Hz, whole-body granularity):
 *
 *   dT_core/dt = (Q_metabolic + Q_warming - Q_radiation - Q_convection - Q_evaporation)
 *                / (m_body * C_body)
 *
 * where `m_body * C_body` (~70kg * 3.47 kJ/kg/°C ≈ 243 kJ/°C for a typical adult) is the
 * body's total thermal mass -- the reason large patients cool more slowly than small ones.
 *
 * Real OR thermal context modeled:
 *
 * 1. **Radiation** (~40-50% of heat loss in uncovered OR patient): proportional to
 *    skin-to-environment temperature difference and total exposed body surface area (BSA).
 *    Draping/blanket coverage reduces this by covering the BSA that would otherwise radiate.
 * 2. **Convection** (~30% of heat loss): airflow over exposed skin. The OR's ventilation
 *    (HVAC) circulates cold air that strips heat from exposed surfaces -- exacerbated by
 *    pre-op skin prep solutions (alcohol/chlorhexidine) evaporating and cooling the surface.
 * 3. **Evaporation** (~15-20%): respiratory moisture from dry inspired gas, plus surgical
 *    wound surface evaporation (especially with large abdominal/thoracic incisions).
 * 4. **Redistribution hypothermia** (the main early mechanism -- not a heat LOSS to the
 *    environment but a heat REDISTRIBUTION from core to periphery when GA-induced vasodilation
 *    allows core-to-periphery thermal equilibration): modeled as an additional early-phase
 *    temperature drop that's largest in the first ~40-60 minutes of anesthesia and independent
 *    of the environmental heat loss mechanisms above. This is why core temperature falls faster
 *    in the first hour than can be explained by ambient heat loss alone.
 * 5. **Forced-air warming** (the most effective active OR warming strategy): modeled as a
 *    fixed heat injection into the body at a physiologically realistic magnitude (~30-50W for
 *    a standard Bair Hugger blanket at medium/high setting), counteracting the heat losses
 *    above and, at high settings, reversing hypothermia.
 *
 * Source: general anesthesia physiology/biomedical engineering (Pennes bioheat equation,
 * OR heat balance, forced-air warming magnitude) -- not a specific Miller's citation;
 * disclosed per this project's standing convention. All constants are disclosed, reasoned
 * estimates, calibrated so the total heat balance produces realistic core temperature
 * trajectories (~0.5-1.5°C drop in the first hour of GA in a cold OR without warming,
 * as empirically described in the literature).
 */

export interface ThermoregulationInputs {
  prevCoreTemp?: number; // °C
  weightKg?: number;
  heightCm?: number;
  metabolicHeatMultiplier?: number; // from totalMetabolicMultiplier (shivering/MH/seizure/pregnancy)
  environmentTempC?: number; // OR room temperature, default 20°C
  bsaExposureFraction?: number; // 0-1: 0 = fully covered/draped, 1 = totally exposed (e.g. open abdomen)
  isAnesthetized?: boolean;
  anesthesiaTimeSeconds?: number; // how long GA has been active, for redistribution phase
  surgicalWoundOpenFraction?: number; // 0-1, additional evaporative loss from open wound
  forcedAirWarmingActive?: boolean;
  warmBlanketActive?: boolean;
  dt?: number; // seconds
}

export interface ThermoregulationOutput {
  coreTemperatureDeltaPerSec: number; // °C/s
  heatLossWatts: number;
  heatGainWatts: number;
  redistributionCoolingWatts: number;
  forcedAirWarmingWatts: number;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Mosteller BSA formula (m²): BSA = sqrt(height_cm * weight_kg / 3600)
function computeBsa(heightCm: number, weightKg: number): number {
  return Math.sqrt((heightCm * weightKg) / 3600);
}

export class ThermoregulationModel {
  static tick(inputs: ThermoregulationInputs = {}): ThermoregulationOutput {
    const prevCoreTemp = clamp(safeNumber(inputs.prevCoreTemp, 37), 25, 43);
    const weightKg = Math.max(5, safeNumber(inputs.weightKg, 70));
    const heightCm = Math.max(100, Math.min(230, safeNumber(inputs.heightCm, 170)));
    const metabolicHeatMultiplier = Math.max(1, safeNumber(inputs.metabolicHeatMultiplier, 1.0));
    const environmentTempC = clamp(safeNumber(inputs.environmentTempC, 20), 15, 30);
    const bsaExposureFraction = clamp(safeNumber(inputs.bsaExposureFraction, 0.4), 0, 1);
    const isAnesthetized = !!inputs.isAnesthetized;
    const anesthesiaTimeSeconds = Math.max(0, safeNumber(inputs.anesthesiaTimeSeconds, 0));
    const surgicalWoundOpenFraction = clamp(safeNumber(inputs.surgicalWoundOpenFraction, 0), 0, 1);
    const forcedAirWarmingActive = !!inputs.forcedAirWarmingActive;
    const warmBlanketActive = !!inputs.warmBlanketActive;
    // warmIVFluidsTempEffect removed: FluidicsEngine already computes per-tick °C delta directly;
    // caller (usePhysiology.js) adds it to newTemp separately, not via this watts-based model.

    const bsa = computeBsa(heightCm, weightKg);
    // Body thermal mass: whole-body heat capacity
    const bodyThermalMassKJ_perC = weightKg * 3.47;

    // Baseline metabolic heat production from BMR (Harris-Benedict-like simplified):
    // ~1 W/kg at rest for an anesthetized patient (GA reduces BMR ~30-40%).
    const basalMetabolicWatts = weightKg * (isAnesthetized ? 0.65 : 1.0);
    const metabolicHeatWatts = basalMetabolicWatts * metabolicHeatMultiplier;

    // Skin temperature: ~2-3°C below core when awake/vasoconstricted;
    // under GA, vasoconstriction is lost and skin temperature rises toward core (~1°C below).
    const skinTempC = prevCoreTemp - (isAnesthetized ? 1.2 : 2.5);
    const tempGradient = Math.max(0, skinTempC - environmentTempC);

    // Radiation heat loss: ~ emissivity * Stefan-Boltzmann constant * BSA_exposed * delta_T
    // Simplified to a linear (not quartic) approximation for the small temperature ranges
    // involved in clinical scenarios (~20-37°C skin vs 18-25°C environment):
    // ~5 W/m²/°C gradient for skin-to-environment -- a disclosed, commonly-used linear
    // approximation of the full Stefan-Boltzmann radiation equation in this regime.
    const radiationLossPerM2PerDegC = 5.0;
    const radiationLossWatts = radiationLossPerM2PerDegC * bsa * bsaExposureFraction * tempGradient;

    // Convection heat loss: ~10 W/m²/°C in a typical air-conditioned OR with active
    // HVAC airflow (much higher than still-air natural convection, which would be ~2-3 W/m²/°C).
    const convectionLossPerM2PerDegC = 6.5; // W/m²/°C -- elevated vs still-air (~2-3) for OR-HVAC airflow
    const convectionLossWatts = convectionLossPerM2PerDegC * bsa * bsaExposureFraction * tempGradient * 0.7;

    // Evaporation: respiratory + wound. Breathing dry-to-humidify costs ~10W at normal RR.
    // Open surgical wound adds up to ~20W additional (large laparotomy) proportional to
    // exposed wound fraction -- one of the reasons abdominal surgery causes more hypothermia
    // than peripheral surgery at the same ambient conditions.
    const respiratoryEvapLossWatts = isAnesthetized ? 7 : 12;
    const woundEvapLossWatts = 20 * surgicalWoundOpenFraction;
    const evaporationLossWatts = respiratoryEvapLossWatts + woundEvapLossWatts;

    const totalEnvironmentalLossWatts = radiationLossWatts + convectionLossWatts + evaporationLossWatts;

    // Redistribution hypothermia: the most clinically important early contributor. GA abolishes
    // thermoregulatory vasoconstriction, allowing the normally-insulated core to equilibrate
    // with the cooler peripheral compartment (muscle, skin, fat). This is purely an
    // INTERNAL heat redistribution, not an environmental loss, but its effect on core
    // temperature is real and large (~0.5-1.5°C drop in the first 30-60 min). Models as an
    // exponentially decaying additional cooling term peaking at induction and resolving
    // over ~60 min (when core-peripheral equilibration is substantially complete).
    let redistributionCoolingWatts = 0;
    if (isAnesthetized && anesthesiaTimeSeconds < 3600) {
      const redistributionFraction = Math.exp(-anesthesiaTimeSeconds / 1800);
      redistributionCoolingWatts = 30 * redistributionFraction;
    }

    // Active warming: forced-air warming (Bair Hugger-type) delivers ~30-50W through
    // convective warming of a large draping blanket. Warm blanket adds ~10-15W conductive.
    let forcedAirWarmingWatts = 0;
    if (forcedAirWarmingActive) {
      forcedAirWarmingWatts = 40;
    } else if (warmBlanketActive) {
      forcedAirWarmingWatts = 12;
    }

    const totalHeatGainWatts = metabolicHeatWatts + forcedAirWarmingWatts;
    const totalHeatLossWatts = totalEnvironmentalLossWatts + redistributionCoolingWatts;

    const netHeatWatts = totalHeatGainWatts - totalHeatLossWatts;

    // dT_core/dt from net heat balance: Q(W) = kJ/s, body thermal mass in kJ/°C
    const coreTemperatureDeltaPerSec = netHeatWatts / (bodyThermalMassKJ_perC * 1000);

    return {
      coreTemperatureDeltaPerSec: parseFloat(coreTemperatureDeltaPerSec.toFixed(8)),
      heatLossWatts: parseFloat(totalHeatLossWatts.toFixed(2)),
      heatGainWatts: parseFloat(totalHeatGainWatts.toFixed(2)),
      redistributionCoolingWatts: parseFloat(redistributionCoolingWatts.toFixed(2)),
      forcedAirWarmingWatts: parseFloat(forcedAirWarmingWatts.toFixed(1))
    };
  }
}
