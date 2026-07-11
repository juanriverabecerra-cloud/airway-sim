/**
 * Spinal Cord Injury (SCI) Perioperative Model
 *
 * SCI patients present multiple unique anesthetic challenges beyond the already-modeled
 * autonomic dysreflexia (BladderModel.ts handles bladder-triggered dysreflexia).
 * This model covers the broader physiological consequences of chronic SCI.
 *
 * === LEVEL-DEPENDENT PHYSIOLOGY ===
 *
 * HIGH CERVICAL (C1-C4): Ventilator-dependent
 *   - No diaphragmatic function → requires mechanical ventilation
 *   - Anesthesia: general preferred (neuraxial impractical, limited monitoring)
 *   - Airway: often tracheostomized; difficult direct laryngoscopy (cervical injury)
 *
 * MID-CERVICAL (C5-C7): Variable respiratory compromise
 *   - Some diaphragmatic function; no intercostal muscles
 *   - Reduced vital capacity (40-60% predicted)
 *   - High aspiration risk (impaired cough)
 *   - Quadriplegia with variable arm function
 *
 * THORACIC (T1-T6): Loss of cardiac accelerator nerves + sympathetic outflow
 *   - Bradycardia at rest (vagal dominance without sympathetic counterpart)
 *   - Orthostatic hypotension
 *   - Impaired sweating below lesion → temperature dysregulation
 *   - AUTONOMIC DYSREFLEXIA: any stimulus below level of injury triggers
 *     massive sympathetic surge → dangerous hypertension (already in BladderModel)
 *
 * THORACIC BELOW T6 + LUMBAR:
 *   - Lower risk for autonomic dysreflexia
 *   - Variable leg strength and bowel/bladder function
 *
 * === CRITICAL DRUG CONSIDERATIONS ===
 *
 * SUCCINYLCHOLINE: ABSOLUTELY CONTRAINDICATED > 48-72h after SCI
 *   Mechanism: upregulation of extrajunctional AChRs throughout entire denervated
 *   muscle below level of injury (nAChR_state = 'upregulated').
 *   Risk: massive K+ release → fatal hyperkalemia → VF → cardiac arrest.
 *   Already partially modeled via `burns`/`nAChR_state` checks, but SCI-specific trigger
 *   not yet added.
 *   Safe window: succinylcholine SAFE in first 24-48h (before upregulation occurs)
 *   Risk period: 48h post-injury to YEARS (upregulation persists indefinitely)
 *
 * NDMRs: INCREASED SENSITIVITY (fewer receptors to block) → use reduced doses
 *
 * === ANESTHESIA FOR SCI PATIENTS ===
 * Neuraxial: CAN be used in SCI patients (useful for T6+ to prevent autonomic dysreflexia)
 *   - Low spinal (below injury) can prevent afferent input from triggering dysreflexia
 *   - Problem: incomplete blocks may be worse (partial stimulus still triggers dysreflexia)
 * General: More predictable; controls autonomic dysreflexia better
 * Volatile agents: preferred for SCI > T6 (also block autonomic dysreflexia)
 * Position: very careful — decubitus ulcers develop rapidly, pressure areas vulnerable
 *
 * Sources: Karlsson AK, Spinal Cord 2006; Brouwers HA, Eur J Anesthesiol 2011;
 * Miller's 9th Ed Ch 73 (Orthopedic + SCI Anesthesia).
 */

export interface SCIInputs {
  // Injury level
  sciLevel?: 'none' | 'C1-C4' | 'C5-C7' | 'T1-T6' | 'T7-L1' | 'L2_below';
  daysPostInjury?: number;         // critical for succinylcholine window

  // Current physiology
  isVentilatorDependent?: boolean;
  hasAutonomicDysreflexia?: boolean;  // from BladderModel or other trigger
  currentHR?: number;
  currentMAP?: number;
  currentTemp?: number;

  // Succinylcholine given?
  succinylcholineGivenSCI?: boolean;

  // Anesthesia type
  anesthesiaType?: 'general' | 'neuraxial' | 'regional';

  // Event guards
  prevSCISuxLogged?: boolean;
  prevADLogged?: boolean;
  prevBradycardiaLogged?: boolean;
}

export interface SCIOutput {
  // Physiology
  sciLevel: string;
  ventilatorDependentRisk: boolean;
  autonomicDysreflexiaRisk: number;   // 0-1 (high above T6)

  // Drug safety
  suxContraindicated: boolean;         // > 48h post-injury
  suxSafeWindow: boolean;              // within 48h
  ndmrReducedDoseNeeded: boolean;

  // Temperature
  poikilothermiaRisk: boolean;         // cannot regulate temp below injury

  // Bradycardia
  bradycardiaRisk: number;            // 0-1 (vagal dominance at T1-T6)

  prevSCISuxLogged: boolean;
  prevADLogged: boolean;
  prevBradycardiaLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class SpinalCordInjuryModel {
  static tick(inputs: SCIInputs = {}): SCIOutput {
    const events: string[] = [];
    let prevSCISuxLogged = !!inputs.prevSCISuxLogged;
    let prevADLogged = !!inputs.prevADLogged;
    let prevBradycardiaLogged = !!inputs.prevBradycardiaLogged;

    const sciLevel = inputs.sciLevel || 'none';
    const daysPost = clamp(safeNumber(inputs.daysPostInjury, 0), 0, 36500);
    const suxGiven = !!inputs.succinylcholineGivenSCI;
    const hasAD = !!inputs.hasAutonomicDysreflexia;
    const currentHR = clamp(safeNumber(inputs.currentHR, 75), 20, 200);
    const currentMAP = clamp(safeNumber(inputs.currentMAP, 80), 30, 200);

    if (sciLevel === 'none') {
      return {
        sciLevel, ventilatorDependentRisk: false, autonomicDysreflexiaRisk: 0,
        suxContraindicated: false, suxSafeWindow: true, ndmrReducedDoseNeeded: false,
        poikilothermiaRisk: false, bradycardiaRisk: 0,
        prevSCISuxLogged, prevADLogged, prevBradycardiaLogged, events,
      };
    }

    // Level-dependent risks
    const isHighCervical = sciLevel === 'C1-C4';
    const isMidCervical = sciLevel === 'C5-C7';
    const isHighThoracic = sciLevel === 'T1-T6';
    const aboveT6 = isHighCervical || isMidCervical || isHighThoracic;

    const ventilatorDependentRisk = isHighCervical;
    const autonomicDysreflexiaRisk = aboveT6 ? 0.7 : 0.1;
    const suxContraindicated = daysPost >= 2; // > 48h after injury
    const suxSafeWindow = daysPost < 2; // only safe within first 48h
    const ndmrReducedDoseNeeded = true; // all chronic SCI: denervated muscle supersensitivity
    const poikilothermiaRisk = aboveT6;
    const bradycardiaRisk = isHighThoracic ? 0.5 : isHighCervical || isMidCervical ? 0.4 : 0;

    if (suxGiven && suxContraindicated && !prevSCISuxLogged) {
      events.push(
        `🚨 SUCCINYLCHOLINE CONTRAINDICATED IN CHRONIC SCI (${daysPost.toFixed(0)} days post-injury): Injury > 48h → extrajunctional AChR upregulation throughout ALL denervated muscle below injury level → depolarization of ALL these receptors → MASSIVE K+ release → FATAL HYPERKALEMIA → VF → cardiac arrest. This is NOT the same as a burn/denervation check — SCI-specific upregulation affects the ENTIRE denervated area. SAFE ALTERNATIVE: Rocuronium 1.2 mg/kg (modified RSI dose, onset 60s) + sugammadex 16 mg/kg available. Succinylcholine ONLY safe in first 24-48h after acute SCI (before upregulation occurs).`,
      );
      prevSCISuxLogged = true;
    }

    if (aboveT6 && hasAD && !prevADLogged) {
      events.push(
        `🚨 AUTONOMIC DYSREFLEXIA (Level ${sciLevel}): Noxious stimulus below level of injury → uninhibited sympathetic surge → massive HTN (SBP can reach 200-300 mmHg), reflex bradycardia, flushing above lesion, pallor below. THIS IS AN EMERGENCY. Stroke and intracerebral hemorrhage possible. TREATMENT: (1) Remove triggering stimulus (most common: bladder distension → empty Foley immediately); (2) Sit patient up (orthostatic BP reduction via pooling); (3) Antihypertensive: nifedipine 10 mg SL, nitropaste, hydralazine, or IV labetalol; (4) Anesthesia can prevent (volatile agents block afferent input). Management similar for surgical stimuli — deepen anesthetic.`,
      );
      prevADLogged = true;
    }

    if (bradycardiaRisk > 0.3 && currentHR < 55 && !prevBradycardiaLogged) {
      events.push(
        `⚠️ SCI BRADYCARDIA (Level ${sciLevel}): Vagal dominance without sympathetic counterbalance (cardiac accelerators T1-T4 disrupted). HR ${currentHR} bpm. At risk for severe bradycardia with hypoxia, tracheal suctioning, or neck turning. MANAGEMENT: Atropine (0.5-1 mg IV) for acute bradycardia; glycopyrrolate as prophylaxis before suctioning. Isoproterenol for refractory; temporary pacing for complete heart block.`,
      );
      prevBradycardiaLogged = true;
    }
    if (currentHR >= 60) prevBradycardiaLogged = false;

    return {
      sciLevel,
      ventilatorDependentRisk,
      autonomicDysreflexiaRisk: parseFloat(autonomicDysreflexiaRisk.toFixed(4)),
      suxContraindicated,
      suxSafeWindow,
      ndmrReducedDoseNeeded,
      poikilothermiaRisk,
      bradycardiaRisk: parseFloat(bradycardiaRisk.toFixed(4)),
      prevSCISuxLogged,
      prevADLogged,
      prevBradycardiaLogged,
      events,
    };
  }
}
