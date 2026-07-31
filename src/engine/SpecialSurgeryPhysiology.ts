/**
 * Special Surgical Physiology Model
 *
 * Consolidates several surgery-specific physiologic phenomena that each warrant
 * dedicated teaching but don't require full standalone engines. Covers:
 *
 * A) PRONE POSITION-SPECIFIC COMPLICATIONS
 * B) LAPAROSCOPIC STEEP TRENDELENBURG (ROBOT-ASSISTED) PHYSIOLOGY
 * C) TOURNIQUET PHYSIOLOGY (beyond reperfusion — covered in CarotidEndCerebralModel)
 * D) LASER AIRWAY SURGERY FIRE RISK
 * E) OPHTHALMIC SURGERY SPECIFICS (IOP, oculocardiac reflex grounding)
 * F) ROBOTIC SURGERY EXTREME POSITION EFFECTS
 *
 * =========================================================================
 * A. PRONE POSITION COMPLICATIONS (beyond existing positional compliance changes)
 * =========================================================================
 * Beyond the 30% compliance reduction already modeled, prone position introduces:
 *
 * 1. PRESSURE EYE INJURY (ischemic optic neuropathy / corneal abrasion):
 *    Eyes must be protected with foam head-rest. Any direct pressure on the globe
 *    → venous outflow obstruction → central retinal artery occlusion → blindness.
 *    Risk: long duration, hypotension, blood in head-rest frame.
 *    Prevention: foam horseshoe or Mayfield pins, no pressure on globe.
 *
 * 2. BRACHIAL PLEXUS INJURY:
 *    Arms extended overhead (swimmer's position) or at sides.
 *    Swimmer's position: brachial plexus stretched → ulnar/median nerve injury.
 *    Both arms at sides: brachial plexus compressed.
 *
 * 3. FACIAL EDEMA:
 *    Head-down prone → dependent edema in face, tongue, pharynx.
 *    Risk: prolonged (>4h) prone cases → post-op airway edema on extubation.
 *    Assessment: cuff leak test before extubation after long prone cases.
 *
 * 4. VENOUS AIR EMBOLISM (sitting/semi-sitting):
 *    Negative venous pressure at operative site (sitting craniotomy, posterior fossa) →
 *    air entry through open dural sinuses → VAE. Already covered in VenousAirEmbolismModel.ts.
 *
 * 5. SPINAL CORD ISCHEMIA (spine surgery in prone):
 *    Hypotension → spinal cord ischemia → paraplegia (wake-up test, MEPs).
 *    MAP target typically > 70-80 mmHg during spine instrumentation.
 *
 * =========================================================================
 * B. ROBOTIC EXTREME TRENDELENBURG (da Vinci)
 * =========================================================================
 * Robotic-assisted laparoscopic surgery (prostatectomy, hysterectomy) requires:
 * - Steep Trendelenburg (30-45°) to displace bowel cephalad
 * - CO2 pneumoperitoneum 12-15 mmHg (already in PneumoperitoneumModel.ts)
 * Combined effects (ADDITIVE to pneumoperitoneum effects):
 *
 * 1. INCREASED ICP: head-down + pneumoperitoneum → elevated ICP.
 *    Mechanism: reduced venous drainage from intracranial compartment + raised IAP.
 *    Clinical range: ICP may rise from ~10 → 30+ mmHg after 2-3h extreme Trendelenburg.
 *    Concern: cerebral edema, visual loss (posterior ischemic optic neuropathy).
 *
 * 2. AIRWAY EDEMA: prolonged head-down → facial/tongue/laryngeal edema.
 *    Post-op: difficult/failed extubation, reintubation.
 *
 * 3. INTRAOCULAR PRESSURE (IOP): head-down → venous congestion → IOP ↑.
 *    Normal IOP 10-21 mmHg. Trendelenburg can raise to 30-40+ mmHg.
 *    Concern: ischemic optic neuropathy (ION) → post-op vision loss.
 *
 * =========================================================================
 * C. TOURNIQUET PHYSIOLOGY
 * =========================================================================
 * Beyond reperfusion (covered in CarotidEndCerebralModel):
 *
 * 1. TOURNIQUET PAIN: Despite adequate block/anesthesia, tourniquet inflation for
 *    >30-45 min → ischemic pain unblocked by most regional techniques (A-delta/C fibers).
 *    Management: IV opioid supplementation; may require general conversion for procedures >90 min.
 *
 * 2. TOURNIQUET HYPERTENSION: Tourniquet pain → catecholamine surge → HTN + tachycardia.
 *    Increases intraoperative bleeding from systemic pressure.
 *
 * 3. BILATERAL SIMULTANEOUS TOURNIQUETS: TKA bilateral (rare): double reperfusion burden.
 *
 * =========================================================================
 * D. LASER AIRWAY SURGERY FIRE RISK
 * =========================================================================
 * The "airway fire triad": ignition source (laser) + oxidizer (O2/N2O) + fuel (ETT, drapes).
 * Risk factors:
 * - Higher FiO2: fire requires O2 concentration >30%; risk increases dramatically >50%
 * - N2O: supports combustion even more than O2 (and is flammable at concentrations used)
 * - Standard PVC ETT: flammable; use laser-resistant tube (metal-spiral, silicone-coated)
 * - Cuffed tube: saline-filled cuff reduces combustion risk
 *
 * Management:
 * - Use lowest effective FiO2 (target SpO2 94-96%, keep FiO2 < 0.30 if possible)
 * - Avoid N2O in ALL airway laser cases
 * - Use laser-resistant ETT or Hunsaker jet ventilation (no tube at field)
 * - Saline-soaked pledgets around cuff
 * - If fire: IMMEDIATE removal of ETT, flood airway with saline, 100% O2 via mask
 *
 * =========================================================================
 * E. INTRAOCULAR PRESSURE (IOP) AND OPHTHALMIC SURGERY
 * =========================================================================
 * IOP is tightly regulated (10-21 mmHg). Elevated IOP during ophthalmic surgery
 * can cause lens extrusion (in open eye injury/penetrating keratoplasty).
 *
 * Drugs that INCREASE IOP:
 * - Ketamine (historically avoided; newer data shows modest transient increase)
 * - Succinylcholine: +6-8 mmHg for 3-10 min (dangerous in open globe injuries)
 * - Laryngoscopy response (HTN + HR → venous congestion)
 * - N2O: IOP increase not proven at clinical concentrations
 *
 * Drugs that DECREASE IOP:
 * - ALL IV anesthetics (propofol, barbiturates): reduce IOP
 * - Volatile anesthetics: reduce IOP proportional to MAC
 * - Opioids: modest IOP reduction
 * - Non-depolarizing NMBs: reduce IOP
 * - Acetazolamide: carbonic anhydrase inhibitor, reduces aqueous humor production
 *
 * Open globe injury anesthesia challenge: succinylcholine contraindicated
 * (vitreous expulsion risk) → use modified RSI with rocuronium 1.2 mg/kg.
 *
 * Sources: Miller's 9th Ed Ch 82-84 (Ophthalmic, Robotic, Thoracic Anesthesia);
 * Dhanda KD, Br J Anaesth 2012 (prone complications);
 * Heidenreich TF, Anesthesiology 2006 (IOP and anesthetics).
 */

export interface SpecialSurgeryInputs {
  /** Injected deterministic RNG (Layer 1A). Defaults to Math.random when omitted. */
  rng?: () => number;
  // Position-specific
  position?: string;                // 'Prone', 'Trendelenburg', 'Steep Trendelenburg', etc.
  durationMinutes?: number;         // total case duration
  headDownAngleDegrees?: number;    // 0 = flat, 30-45 = steep Trendelenburg
  adequateEyePads?: boolean;        // eye protection in prone

  // Tourniquet
  tourniquetActive?: boolean;
  tourniquetDurationMinutes?: number;

  // Laser
  laserActive?: boolean;
  currentFiO2?: number;             // fractional (0-1)
  n2oActive?: boolean;
  laserResistantETT?: boolean;

  // IOP / ophthalmic
  openGlobeInjury?: boolean;
  currentMAP?: number;
  succinylcholineCe?: number;
  ketorolacCe?: number;
  currentVolatileMac?: number;

  // IAP from pneumoperitoneum
  iapMmHg?: number;

  // Event guards
  prevEyePressureLogged?: boolean;
  prevFacialEdemaLogged?: boolean;
  prevTourniquetPainLogged?: boolean;
  prevFireRiskLogged?: boolean;
  prevIopLogged?: boolean;
}

export interface SpecialSurgeryOutput {
  // Eye pressure risk in prone
  eyePressureRisk: number;       // 0-1: risk of ischemic optic injury

  // Facial/airway edema from head-down
  facialEdemaIndex: number;      // 0-1: progressive edema accumulation
  airwayEdemaRisk: number;       // 0-1: post-op extubation risk from edema

  // ICP elevation from steep Trendelenburg
  icpContribution: number;       // mmHg added to existing ICP

  // Tourniquet pain
  tourniquetPainIndex: number;   // 0-1 (0 = no pain, 1 = refractory)
  tourniquetHRContribution: number; // bpm (pain-driven tachycardia)
  tourniquetSVRContribution: number; // fractional SVR increase

  // Laser fire risk
  laserFireRisk: number;         // 0-1 (0 = safe, 1 = extreme risk)
  laserFireActive: boolean;      // fire has occurred

  // Intraocular pressure
  iopEstimate: number;           // mmHg
  iopCritical: boolean;          // IOP > 40 mmHg (extrusion risk in open globe)

  prevEyePressureLogged: boolean;
  prevFacialEdemaLogged: boolean;
  prevTourniquetPainLogged: boolean;
  prevFireRiskLogged: boolean;
  prevIopLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class SpecialSurgeryPhysiology {
  static tick(inputs: SpecialSurgeryInputs = {}): SpecialSurgeryOutput {
    const events: string[] = [];
    const rng = inputs.rng || Math.random;
    let prevEyePressureLogged = !!inputs.prevEyePressureLogged;
    let prevFacialEdemaLogged = !!inputs.prevFacialEdemaLogged;
    let prevTourniquetPainLogged = !!inputs.prevTourniquetPainLogged;
    let prevFireRiskLogged = !!inputs.prevFireRiskLogged;
    let prevIopLogged = !!inputs.prevIopLogged;

    const position = (inputs.position || 'Supine').toLowerCase();
    const durationMin = clamp(safeNumber(inputs.durationMinutes, 0), 0, 720);
    const headDownAngle = clamp(safeNumber(inputs.headDownAngleDegrees, 0), 0, 45);
    const adequateEyePads = inputs.adequateEyePads !== false; // default true
    const isProne = position.includes('prone');
    const isTrendelenburg = position.includes('trendelenburg') || headDownAngle > 10;
    const iapMmHg = clamp(safeNumber(inputs.iapMmHg, 0), 0, 25);

    // ===========================
    // A. PRONE EYE PRESSURE RISK
    // ===========================
    let eyePressureRisk = 0;
    if (isProne) {
      const durationFactor = clamp(durationMin / 240, 0, 1); // risk ramps over 4h
      eyePressureRisk = durationFactor * (adequateEyePads ? 0.2 : 0.8);
      if (eyePressureRisk > 0.5 && !prevEyePressureLogged) {
        events.push(
          `⚠️ PRONE POSITION EYE INJURY RISK (${durationMin.toFixed(0)} min elapsed): ${adequateEyePads ? 'Eye pads in place' : '⚠️ EYE PROTECTION STATUS UNCLEAR'}. Risk of ischemic optic neuropathy (ION) and corneal abrasion increases with duration > 2-3h. Periodic checks: (1) Confirm no direct pressure on globes (use foam horseshoe or Mayfield head holder); (2) Any MAP < 70 mmHg worsens risk — maintain adequate CPP; (3) Blood accumulation in head-rest → pressure → check q45min; (4) Post-op: check visual acuity and light perception upon emergence.`,
        );
        prevEyePressureLogged = true;
      }
    }

    // ===========================
    // B. FACIAL/AIRWAY EDEMA
    // ===========================
    // Head-down position + duration → edema accumulation
    const headDownFactor = isTrendelenburg ? clamp(headDownAngle / 30, 0, 1) : 0;
    const iapFactor = iapMmHg > 0 ? clamp(iapMmHg / 15, 0, 1) : 0; // pneumoperitoneum worsens
    const facialEdemaIndex = clamp(headDownFactor * (durationMin / 180) + iapFactor * 0.3, 0, 1.0);
    const airwayEdemaRisk = facialEdemaIndex * 0.7; // not all facial edema = airway edema

    if (facialEdemaIndex > 0.5 && isTrendelenburg && !prevFacialEdemaLogged) {
      events.push(
        `⚠️ PROGRESSIVE HEAD-DOWN EDEMA: ${durationMin.toFixed(0)} min of steep Trendelenburg (${headDownAngle.toFixed(0)}°)${iapMmHg > 0 ? ` + pneumoperitoneum (${iapMmHg.toFixed(0)} mmHg)` : ''}. Facial, tongue, and laryngeal edema accumulating. POST-OP AIRWAY CONCERN: (1) Perform CUFF LEAK TEST before extubation (deflate cuff → listen for leak around ETT → leak present = upper airway diameter sufficient); (2) Have surgical airway kit at bedside; (3) Consider keeping intubated until edema resolves if no cuff leak; (4) Early steroid (dexamethasone 0.1-0.2 mg/kg IV) may reduce airway edema.`,
      );
      prevFacialEdemaLogged = true;
    }

    // ===========================
    // C. ICP FROM STEEP TRENDELENBURG + PNEUMOPERITONEUM
    // ===========================
    // Head-down → impaired intracranial venous drainage → ICP rise
    const icpContribution = isTrendelenburg
      ? clamp(headDownAngle * 0.4 + iapMmHg * 0.3, 0, 25)
      : 0;

    // ===========================
    // D. TOURNIQUET PAIN
    // ===========================
    const tourniquetActive = !!inputs.tourniquetActive;
    const tourniquet_min = clamp(safeNumber(inputs.tourniquetDurationMinutes, 0), 0, 360);

    let tourniquetPainIndex = 0;
    let tourniquetHRContribution = 0;
    let tourniquetSVRContribution = 0;

    if (tourniquetActive && tourniquet_min > 30) {
      // Pain develops progressively after 30 min; C-fibers not blocked by most regional blocks
      tourniquetPainIndex = clamp((tourniquet_min - 30) / 60, 0, 1.0);
      tourniquetHRContribution = tourniquetPainIndex * 25; // +25 bpm at severe pain
      tourniquetSVRContribution = tourniquetPainIndex * 0.20; // +20% SVR

      if (tourniquetPainIndex > 0.5 && !prevTourniquetPainLogged) {
        events.push(
          `⚠️ TOURNIQUET PAIN (${tourniquet_min.toFixed(0)} min inflation): Despite adequate block, ischemic C-fiber activation from prolonged tourniquet causes breakthrough pain (tourniquet bypass of most regional blocks, particularly spinal and epidural for lower extremity). Signs: rising HR and BP, patient movement in non-paralyzed cases. MANAGEMENT: IV opioid supplementation (fentanyl 25-50 mcg PRN); deepening of IV anesthesia; if prolonged (>90 min), consider converting regional block to general anesthesia. Limit tourniquet to 90-120 min max; periodic deflation (10 min) if longer case needed.`,
        );
        prevTourniquetPainLogged = true;
      }
    }
    if (!tourniquetActive) prevTourniquetPainLogged = false;

    // ===========================
    // E. LASER FIRE RISK
    // ===========================
    const laserActive = !!inputs.laserActive;
    const fio2 = clamp(safeNumber(inputs.currentFiO2, 0.30), 0, 1.0);
    const n2oActive = !!inputs.n2oActive;
    const laserResistantETT = !!inputs.laserResistantETT;

    let laserFireRisk = 0;
    let laserFireActive = false;

    if (laserActive) {
      // Fire risk increases dramatically above FiO2 0.30
      const o2Risk = fio2 > 0.30 ? clamp((fio2 - 0.30) / 0.50, 0, 1.0) : 0;
      const n2oRisk = n2oActive ? 0.4 : 0;
      const ettRisk = laserResistantETT ? 0.1 : 0.7;
      laserFireRisk = clamp((o2Risk + n2oRisk + ettRisk) / 2.0, 0, 1.0);

      if (laserFireRisk > 0.5 && !prevFireRiskLogged) {
        const safetyGaps = [];
        if (fio2 > 0.30) safetyGaps.push(`FiO2 ${(fio2 * 100).toFixed(0)}% > 30% safe threshold`);
        if (n2oActive) safetyGaps.push('N2O active (supports combustion)');
        if (!laserResistantETT) safetyGaps.push('Standard ETT (flammable)');
        events.push(
          `🔥 LASER AIRWAY FIRE RISK: ${safetyGaps.join('; ')}. Fire requires: ignition (laser) + oxidizer (O2/N2O) + fuel (ETT/drapes). IMMEDIATE ACTIONS: (1) REDUCE FiO2 to lowest maintaining SpO2 94-96% (target < 0.30); (2) ELIMINATE N2O — use air/O2 mixture; (3) Use LASER-RESISTANT ETT (metal-spiral or silicone-coated) or jet ventilation; (4) Fill ETT cuff with SALINE (dye-tinged) → if fire burns through cuff, leak indicates early warning; (5) Saline-soaked pledgets around cuff at surgical site. IF FIRE OCCURS: remove ETT immediately, flood airway with saline, ventilate via mask, rigid bronchoscopy to assess airway injury.`,
        );
        prevFireRiskLogged = true;
      }

      // Probabilistic fire: depends on risk level (very low even at high risk)
      laserFireActive = laserFireRisk > 0.8 && rng() < 0.0001; // very rare but catastrophic
    }
    if (!laserActive) prevFireRiskLogged = false;

    // ===========================
    // F. INTRAOCULAR PRESSURE
    // ===========================
    const openGlobe = !!inputs.openGlobeInjury;
    const currentMAP = clamp(safeNumber(inputs.currentMAP, 85), 40, 200);
    const suxCe = clamp(safeNumber(inputs.succinylcholineCe, 0), 0, 10);
    const volMac = clamp(safeNumber(inputs.currentVolatileMac, 0), 0, 3);
    const headDown = isTrendelenburg;

    // Baseline IOP calculation
    let iopEstimate = 15; // mmHg (normal 10-21)
    iopEstimate += (currentMAP - 85) * 0.1; // HTN increases IOP
    iopEstimate += suxCe > 0.1 ? 7.0 : 0; // succinylcholine +6-8 mmHg
    iopEstimate -= volMac * 4.0;           // volatile anesthetics reduce IOP ~4 mmHg per MAC
    iopEstimate += headDown ? (headDownAngle * 0.3) : 0; // head-down increases IOP
    iopEstimate += iapMmHg * 0.4;          // IAP from pneumoperitoneum increases IOP
    iopEstimate = clamp(iopEstimate, 5, 60);
    const iopCritical = openGlobe && iopEstimate > 20; // ANY IOP elevation in open globe is dangerous (vitreous expulsion risk)

    if (openGlobe && suxCe > 0.1 && !prevIopLogged) {
      events.push(
        `🚨 OPEN GLOBE INJURY + SUCCINYLCHOLINE: SUCCINYLCHOLINE IS CONTRAINDICATED IN OPEN GLOBE INJURY! Succinylcholine increases IOP +6-8 mmHg (extraocular muscle fasciculations) → vitreous expulsion, retinal detachment risk. Estimated IOP now: ${iopEstimate.toFixed(0)} mmHg. IMMEDIATE: Use MODIFIED RSI with ROCURONIUM 1.2 mg/kg (full RSI dose, onset 60s) + sugammadex 16 mg/kg if failed airway. Alternative: avoid rapid-sequence if clinical situation allows. IV propofol and opioid reduce IOP. Have sugammadex ready at all times when rocuronium used for RSI.`,
      );
      prevIopLogged = true;
    }
    if (!openGlobe || suxCe < 0.05) prevIopLogged = false;

    return {
      eyePressureRisk: parseFloat(eyePressureRisk.toFixed(4)),
      facialEdemaIndex: parseFloat(facialEdemaIndex.toFixed(4)),
      airwayEdemaRisk: parseFloat(airwayEdemaRisk.toFixed(4)),
      icpContribution: parseFloat(icpContribution.toFixed(2)),
      tourniquetPainIndex: parseFloat(tourniquetPainIndex.toFixed(4)),
      tourniquetHRContribution: parseFloat(tourniquetHRContribution.toFixed(1)),
      tourniquetSVRContribution: parseFloat(tourniquetSVRContribution.toFixed(4)),
      laserFireRisk: parseFloat(laserFireRisk.toFixed(4)),
      laserFireActive,
      iopEstimate: parseFloat(iopEstimate.toFixed(1)),
      iopCritical,
      prevEyePressureLogged,
      prevFacialEdemaLogged,
      prevTourniquetPainLogged,
      prevFireRiskLogged,
      prevIopLogged,
      events,
    };
  }
}
