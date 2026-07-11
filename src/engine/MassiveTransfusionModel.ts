/**
 * Massive Transfusion Protocol (MTP) + Damage Control Resuscitation Model
 *
 * Massive transfusion is defined as: > 10 units pRBC in 24h, or > 4 units in 1h,
 * or transfusion of > 50% blood volume (EBV) in 3h.
 *
 * === DAMAGE CONTROL RESUSCITATION (DCR) ===
 * Evidence-based strategy from military trauma that revolutionized hemorrhagic shock management:
 *
 * OLD APPROACH: Crystalloid resuscitation (saline/LR) → dilutional coagulopathy,
 * acidosis, hypothermia ("lethal triad") → more bleeding → death.
 *
 * NEW APPROACH (Damage Control Resuscitation):
 * 1. BALANCED RATIO TRANSFUSION: pRBC : FFP : Platelets ≈ 1:1:1 (or 2:1:1)
 *    Rationale: replace blood with "reconstituted whole blood" → prevents dilutional
 *    coagulopathy. FFP provides clotting factors; platelets provide hemostasis.
 *    Evidence: PROPPR trial (JAMA 2015): 1:1:1 vs 2:1:1 → no difference in 24h mortality,
 *    but 1:1:1 achieved hemostasis more frequently at 24h.
 *
 * 2. PERMISSIVE HYPOTENSION (until hemorrhage controlled):
 *    Target MAP 50-65 mmHg (instead of normal) in hemorrhage.
 *    Rationale: higher pressure → dislodges clot → more bleeding.
 *    Exception: TBI (traumatic brain injury) → MAP ≥ 80 to maintain CPP.
 *
 * 3. MINIMIZE CRYSTALLOIDS:
 *    Avoid saline-based fluids (hyperchloremic acidosis, dilutional coagulopathy).
 *    Use blood products instead of crystalloid as primary resuscitation fluid.
 *
 * 4. TRANEXAMIC ACID (TXA): 1g IV over 10 min WITHIN 3 HOURS of injury
 *    (CRASH-2 trial: 15% reduction in mortality when given early).
 *    After 3h: possibly harmful (fibrinolysis inhibition during clot formation).
 *
 * 5. CALCIUM REPLACEMENT: Citrate in blood products chelates Ca²⁺
 *    → ionized hypocalcemia → myocardial depression → worsens coagulopathy.
 *    Give calcium gluconate 1g for every 2-4 units of blood products.
 *
 * 6. TEMPERATURE MAINTENANCE: Hypothermia impairs coagulation enzymatically.
 *    Warm IV fluids, blood warmer, forced-air warming, warm OR (26°C).
 *
 * === TRANSFUSION TRIGGERS (Evidence-Based) ===
 * Perioperative/ICU (non-hemorrhagic):
 *   - Liberal (9 g/dL): equivalent to restrictive in most patients (TRICC trial)
 *   - RESTRICTIVE (7 g/dL): non-inferior in MOST patients → use 7 g/dL trigger
 *   - Cardiac surgery: 8 g/dL (higher due to myocardial O2 demand)
 *   - Active ACS/cardiac ischemia: 8-10 g/dL (ACS patients not studied in TRICC)
 *   - Neurologic injury: 7-9 g/dL
 *
 * Massive hemorrhage: Different rules (see DCR above — ratio-based, not Hb-based).
 *
 * === COMPLICATIONS OF MASSIVE TRANSFUSION ===
 * 1. Dilutional coagulopathy (if 1:1:1 not used)
 * 2. Hypothermia (cold products)
 * 3. Hypocalcemia (citrate)
 * 4. Hyperkalemia (old pRBC releases K⁺)
 * 5. TACO (volume overload) — already modeled
 * 6. TRALI — already modeled
 * 7. Hemolytic reaction (ABO incompatibility) — already modeled
 *
 * Sources: Holcomb JB (PROPPR), JAMA 2015; CRASH-2, Lancet 2010;
 * Holcomb JB, J Trauma 2008 (DCR); Miller's 9th Ed Ch 55 (Transfusion Therapy).
 */

export interface MTPInputs {
  isActiveMTP?: boolean;         // MTP activation criteria met
  prbcUnitsGiven?: number;       // cumulative pRBC units (standard 250-350 mL each)
  ffpUnitsGiven?: number;        // FFP units given
  plateletsUnitsGiven?: number;  // platelet pools given
  cryoUnitsGiven?: number;       // cryoprecipitate units

  // DCR elements
  txaGiven?: boolean;
  txaTimeFromInjuryHours?: number; // must be < 3h for benefit (CRASH-2)
  currentCaIonized?: number;     // mmol/L (normal 1.1-1.3)

  // Goals
  targetHb?: number;             // g/dL
  currentHb?: number;
  permissiveHypotension?: boolean; // MAP target 50-65 during uncontrolled hemorrhage

  // Current physiology
  currentMAP?: number;
  currentTemp?: number;
  hasTBI?: boolean;              // TBI = cannot use permissive hypotension

  // Event guards
  prevMTPLogged?: boolean;
  prevTXALogged?: boolean;
  prevCalciumLogged?: boolean;
}

export interface MTPOutput {
  // Ratio assessment
  currentRatioPRBCFFP: number;    // current pRBC:FFP ratio
  currentRatioPRBCPLT: number;    // current pRBC:PLT ratio
  isBalancedResuscitation: boolean; // ratio ≈ 1:1:1

  // TXA
  txaBeneficial: boolean;         // given within 3h window
  txaHarmful: boolean;            // given after 3h (may increase mortality)

  // DCR hemodynamic target
  mapTarget: number;              // permissive or normal MAP target
  mapTargetAdequate: boolean;     // current MAP meets DCR goals

  // Calcium
  calciumDeficiency: number;      // estimated ionized Ca²⁺ drop from citrate
  calciumSupplementationNeeded: boolean;

  // Blood product needs
  ffpNeeded: number;              // units FFP needed to achieve 1:1 ratio
  plateletsNeeded: number;        // units platelets needed

  prevMTPLogged: boolean;
  prevTXALogged: boolean;
  prevCalciumLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class MassiveTransfusionModel {
  static tick(inputs: MTPInputs = {}): MTPOutput {
    const events: string[] = [];
    let prevMTPLogged = !!inputs.prevMTPLogged;
    let prevTXALogged = !!inputs.prevTXALogged;
    let prevCalciumLogged = !!inputs.prevCalciumLogged;

    const isActive = !!inputs.isActiveMTP;
    const prbc = clamp(safeNumber(inputs.prbcUnitsGiven, 0), 0, 100);
    const ffp = clamp(safeNumber(inputs.ffpUnitsGiven, 0), 0, 100);
    const plt = clamp(safeNumber(inputs.plateletsUnitsGiven, 0), 0, 50);
    const txaGiven = !!inputs.txaGiven;
    const txaHours = clamp(safeNumber(inputs.txaTimeFromInjuryHours, 0), 0, 72);
    const caIonized = clamp(safeNumber(inputs.currentCaIonized, 1.2), 0.3, 1.6);
    const currentMAP = clamp(safeNumber(inputs.currentMAP, 65), 30, 150);
    const permissiveHTN = !!inputs.permissiveHypotension;
    const hasTBI = !!inputs.hasTBI;
    const currentHb = clamp(safeNumber(inputs.currentHb, 12), 2, 20);

    // ===========================
    // RATIO ASSESSMENT
    // ===========================
    const currentRatioPRBCFFP = ffp > 0 ? prbc / ffp : prbc; // want ~1.0
    const currentRatioPRBCPLT = plt > 0 ? prbc / plt : prbc; // want ~1.0 (pool:pool)
    const isBalancedResuscitation = currentRatioPRBCFFP <= 1.5 && currentRatioPRBCPLT <= 1.5;

    // Units needed to reach 1:1:1
    const ffpNeeded = Math.max(0, prbc - ffp);
    const plateletsNeeded = Math.max(0, prbc - plt);

    // ===========================
    // TXA TIMING
    // ===========================
    const txaBeneficial = txaGiven && txaHours <= 3;
    const txaHarmful = txaGiven && txaHours > 3;

    // ===========================
    // MAP TARGET (DCR)
    // ===========================
    let mapTarget: number;
    if (hasTBI) {
      mapTarget = 80; // TBI: need CPP → cannot use permissive hypotension
    } else if (permissiveHTN && isActive) {
      mapTarget = 55; // uncontrolled hemorrhage: permissive hypotension
    } else {
      mapTarget = 65; // standard
    }
    const mapTargetAdequate = currentMAP >= mapTarget;

    // ===========================
    // CALCIUM DEFICIENCY
    // ===========================
    // Citrate from blood products chelates ionized Ca²⁺
    const totalUnits = prbc + ffp + plt;
    const citrateCaEffect = totalUnits > 0 ? Math.min(0.3, totalUnits * 0.015) : 0;
    const calciumDeficiency = Math.max(0, 1.2 - caIonized + citrateCaEffect);
    const calciumSupplementationNeeded = calciumDeficiency > 0.1 || totalUnits >= 4;

    // ===========================
    // EVENTS
    // ===========================
    if (isActive && !prevMTPLogged) {
      events.push(
        `🚨 MASSIVE TRANSFUSION PROTOCOL (MTP) ACTIVATED: Hemorrhagic shock requiring massive transfusion. DAMAGE CONTROL RESUSCITATION: (1) BALANCED 1:1:1 RATIO: pRBC:FFP:Platelets = 1:1:1 (or at minimum 2:1:1). Currently: pRBC ${prbc} units, FFP ${ffp} units, PLT ${plt} pools → NEED ${ffpNeeded} more FFP and ${plateletsNeeded} more platelets for balance; (2) ${hasTBI ? 'TBI PRESENT: CANNOT use permissive hypotension — target MAP > 80 mmHg' : 'PERMISSIVE HYPOTENSION: target MAP 50-65 mmHg until hemorrhage controlled (higher pressure dislodges clot)'}; (3) CALCIUM GLUCONATE 1-2g IV per 4 units blood products (citrate chelates Ca²⁺ → myocardial depression); (4) WARM all products (blood warmer mandatory); (5) MINIMIZE CRYSTALLOIDS (dilutes clotting factors).`,
      );
      prevMTPLogged = true;
    }

    if (txaGiven && !prevTXALogged) {
      const timingMsg = txaBeneficial
        ? `✅ BENEFIT: Given ${txaHours.toFixed(1)}h after injury — within 3h window (CRASH-2 data: 15% mortality reduction). Continue second dose 1g IV over 8h.`
        : `🚨 TIMING CONCERN: Given ${txaHours.toFixed(1)}h after injury — AFTER 3h cutoff. CRASH-2 data suggests possible harm when given late (fibrinolysis inhibition during active clot formation). Consider withholding second dose.`;
      events.push(`💊 TRANEXAMIC ACID: ${timingMsg}`);
      prevTXALogged = true;
    }

    if (calciumSupplementationNeeded && !prevCalciumLogged) {
      events.push(
        `⚠️ CALCIUM SUPPLEMENTATION NEEDED: ${totalUnits.toFixed(0)} units blood products given. Ionized Ca²⁺: ${caIonized.toFixed(2)} mmol/L (normal 1.1-1.3). Citrate from blood products chelates Ca²⁺ → myocardial depression, coagulopathy (Ca²⁺ is a cofactor in coagulation cascade). GIVE: Calcium gluconate 1-2g IV (preferred for peripheral access) or calcium chloride 500 mg-1g IV (central only — more concentrated, 3× ionized Ca per gram but caustic). Repeat every 4 units or if ionized Ca < 1.0 mmol/L.`,
      );
      prevCalciumLogged = true;
    }

    return {
      currentRatioPRBCFFP: parseFloat(currentRatioPRBCFFP.toFixed(2)),
      currentRatioPRBCPLT: parseFloat(currentRatioPRBCPLT.toFixed(2)),
      isBalancedResuscitation,
      txaBeneficial,
      txaHarmful,
      mapTarget,
      mapTargetAdequate,
      calciumDeficiency: parseFloat(calciumDeficiency.toFixed(3)),
      calciumSupplementationNeeded,
      ffpNeeded,
      plateletsNeeded,
      prevMTPLogged,
      prevTXALogged,
      prevCalciumLogged,
      events,
    };
  }
}
