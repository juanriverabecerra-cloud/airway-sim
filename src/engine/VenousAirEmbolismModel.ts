/**
 * Venous Air Embolism (VAE) Model
 *
 * Gap closure. VAE occurs in the OR from: central line placement (air entrainment during
 * venipuncture), sitting-position neurosurgery (surgical site negative pressure sucks air
 * into open veins), laparoscopy (CO2 embolism from vascular trocar entry), liver surgery
 * (hepatic veins), obstetrics (after delivery, uterine veins).
 *
 * === MECHANISM ===
 *
 * Air enters venous system → travels to RV → enters pulmonary vasculature → occludes
 * pulmonary capillaries and small arteries (air is compressible and traps in outflow tracts).
 * Large bubbles → "air lock" in RV outflow → near-complete obstruction of pulmonary flow.
 *
 * PARADOXICAL AIR EMBOLISM: air crossing a patent foramen ovale (PFO, ~25% prevalence)
 * → arterial embolism → stroke, MI, renal/mesenteric infarction simultaneously.
 *
 * === CLINICAL DETECTION ===
 *
 * Intraoperative monitoring sensitivity (most to least sensitive):
 * 1. Precordial Doppler (most sensitive - detects micro-bubbles inaudible otherwise)
 * 2. Transesophageal echocardiography (TEE) -- sees bubbles directly in RV
 * 3. ETCO2 drop (same mechanism as PE -- dead space increase)
 * 4. Mill-wheel murmur on auscultation (continuous churning murmur, "water-wheel" sound)
 * 5. ETCO2 in exhaled gas (late sign)
 * 6. PA catheter reading (if present): abrupt CO fall
 *
 * CLASSIC SIGN: Mill-wheel murmur heard via esophageal stethoscope.
 *
 * === TREATMENT ===
 *
 * 1. STOP gas entry: pack surgical site with wet sponges, flood field with saline
 * 2. POSITION: LEFT LATERAL DECUBITUS (Durant's maneuver) + HEAD DOWN: traps air in RV
 *    apex rather than outflow tract → reduces outflow obstruction
 * 3. ASPIRATE: through CVP catheter in right atrium (can remove 50-60% of air)
 * 4. 100% FiO2: increases N2 washout → smaller bubbles → faster reabsorption
 * 5. STOP N2O: N2O diffuses INTO air bubbles → increases bubble size → worsens obstruction
 * 6. CPR if cardiac arrest: mechanical fragmentation of large bubbles
 *
 * Source: Mirski MA et al. Anesthesiology 2007 (venous air embolism review);
 * Porter JM & Pidgeon C Acta Neurochir 1999 (sitting position VAE management).
 */

export interface VAEInputs {
  active?: boolean;
  airVolumeMl?: number; // total air entered venous system (mL)
  entryRateMlPerSec?: number; // ongoing air entry rate if not stopped
  hasN2O?: boolean; // N2O in circuit markedly worsens by diffusing into bubbles
  durantsManeuvreActive?: boolean; // left lateral decubitus + head down positioning
  aspiratingCVC?: boolean; // aspirating through CVC in right atrium
  fiO2100?: boolean; // 100% O2 to accelerate N2 washout from bubbles
  hasPFO?: boolean; // patent foramen ovale increases paradoxical embolism risk
  minutesSinceOnset?: number;
  prevMillWheelLogged?: boolean;
  prevParadoxLogged?: boolean;
}

export interface VAEOutput {
  active: boolean;
  effectiveAirVolumeMl: number;
  millWheelMurmur: boolean;
  etco2DropMmHg: number;
  cardiacOutputFraction: number;
  pvrIncreaseFraction: number;
  paradoxicalEmbolismRisk: number; // 0-1 if PFO present
  paradoxicalEmbolismActive: boolean;
  treatmentEfficacy: number; // 0-1 how effective current treatments are
  prevMillWheelLogged: boolean;
  prevParadoxLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class VenousAirEmbolismModel {
  static tick(inputs: VAEInputs = {}): VAEOutput {
    const events: string[] = [];
    const active = !!inputs.active;

    if (!active) {
      return {
        active: false, effectiveAirVolumeMl: 0, millWheelMurmur: false,
        etco2DropMmHg: 0, cardiacOutputFraction: 1.0, pvrIncreaseFraction: 0,
        paradoxicalEmbolismRisk: 0, paradoxicalEmbolismActive: false,
        treatmentEfficacy: 0, prevMillWheelLogged: false, prevParadoxLogged: false,
        events
      };
    }

    let airVolumeMl = Math.max(0, safeNumber(inputs.airVolumeMl, 0));
    const entryRateMlPerSec = Math.max(0, safeNumber(inputs.entryRateMlPerSec, 0));
    const hasN2O = !!inputs.hasN2O;
    const durantsManeuvreActive = !!inputs.durantsManeuvreActive;
    const aspiratingCVC = !!inputs.aspiratingCVC;
    const fiO2100 = !!inputs.fiO2100;
    const hasPFO = !!inputs.hasPFO;
    const minutesSinceOnset = Math.max(0, safeNumber(inputs.minutesSinceOnset, 0));
    let prevMillWheelLogged = !!inputs.prevMillWheelLogged;
    let prevParadoxLogged = !!inputs.prevParadoxLogged;

    // N2O markedly increases bubble size (N2O diffuses in faster than N2 diffuses out)
    const n2oMultiplier = hasN2O ? 2.5 : 1.0;

    // Treatment efficacy: Durant's maneuver + aspiration significantly reduce obstruction
    const durantsBenefit = durantsManeuvreActive ? 0.5 : 0;
    const aspirationBenefit = aspiratingCVC ? 0.4 : 0;
    const n2oWashoutBenefit = fiO2100 ? 0.2 : 0;
    const treatmentEfficacy = Math.min(0.85, durantsBenefit + aspirationBenefit + n2oWashoutBenefit);

    // Natural reabsorption (N2 reabsorption from bubbles): ~5-15 mL/hr without 100% O2
    const naturalReabsorption = fiO2100 ? 0.02 : 0.003; // mL/min
    const spontaneousResolution = naturalReabsorption * minutesSinceOnset;

    // Effective air volume accounting for treatment and reabsorption
    const effectiveAirVolumeMl = Math.max(0, airVolumeMl * n2oMultiplier * (1 - treatmentEfficacy) - spontaneousResolution);

    // Hemodynamic effects based on effective air volume
    // Critical volume for hemodynamic compromise: ~3-5 mL/kg (in 70kg patient: ~200-350 mL)
    const hemodynamicThresholdMl = 250;
    const severityFraction = clamp(effectiveAirVolumeMl / hemodynamicThresholdMl, 0, 1);

    const pvrIncreaseFraction = severityFraction * 3.0; // up to 3x PVR at critical volume
    const cardiacOutputFraction = clamp(1.0 - severityFraction * 0.8, 0.1, 1.0);
    const etco2DropMmHg = severityFraction * 15;

    // Mill-wheel murmur: audible when significant air in RV
    const millWheelMurmur = effectiveAirVolumeMl > 20;

    // Paradoxical embolism risk: when RV pressure exceeds LA pressure → PFO can open
    // This occurs when RV failure/pressure elevation opens the PFO valve
    const pvhyprtensionRisk = pvrIncreaseFraction > 0.5;
    const paradoxicalEmbolismRisk = hasPFO && pvhyprtensionRisk ? clamp(severityFraction * 0.4, 0, 0.4) : 0;
    const paradoxicalEmbolismActive = paradoxicalEmbolismRisk > 0.2;

    // Events
    if (millWheelMurmur && !prevMillWheelLogged) {
      events.push("🚨 CRITICAL: Mill-Wheel (Water-Wheel) Murmur detected via esophageal stethoscope -- VENOUS AIR EMBOLISM. IMMEDIATE ACTIONS: (1) Pack surgical site with wet sponges, flood field with saline to STOP AIR ENTRY; (2) LEFT LATERAL DECUBITUS + HEAD DOWN (Durant's maneuver -- traps air in RV apex away from outflow tract); (3) 100% FiO2; (4) STOP N2O immediately (N2O diffuses into bubbles increasing size); (5) Aspirate via CVC if in RV/RA position. EtCO2 drop and hemodynamic collapse may follow rapidly.");
      prevMillWheelLogged = true;
    }

    if (paradoxicalEmbolismActive && !prevParadoxLogged) {
      events.push("🚨 EMERGENCY: PARADOXICAL AIR EMBOLISM through patent foramen ovale. PFO open due to elevated RV pressure exceeding LA pressure. Arterial gas emboli possible → stroke, MI, renal/mesenteric infarction simultaneously. Aggressive RV pressure reduction. Neurology consultation for stroke assessment.");
      prevParadoxLogged = true;
    }

    if (!millWheelMurmur) prevMillWheelLogged = false;
    if (!paradoxicalEmbolismActive) prevParadoxLogged = false;

    return {
      active: true,
      effectiveAirVolumeMl: parseFloat(effectiveAirVolumeMl.toFixed(2)),
      millWheelMurmur,
      etco2DropMmHg: parseFloat(etco2DropMmHg.toFixed(1)),
      cardiacOutputFraction: parseFloat(cardiacOutputFraction.toFixed(4)),
      pvrIncreaseFraction: parseFloat(pvrIncreaseFraction.toFixed(4)),
      paradoxicalEmbolismRisk: parseFloat(paradoxicalEmbolismRisk.toFixed(4)),
      paradoxicalEmbolismActive,
      treatmentEfficacy: parseFloat(treatmentEfficacy.toFixed(4)),
      prevMillWheelLogged,
      prevParadoxLogged,
      events
    };
  }
}
