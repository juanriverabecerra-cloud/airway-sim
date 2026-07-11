/**
 * Labor Epidural and Obstetric Regional Anesthesia Model
 *
 * Labor epidural analgesia is one of the most common anesthetic procedures globally
 * (~73% of US laboring patients). The physiology of labor epidural is distinct from
 * surgical epidural anesthesia in critical ways.
 *
 * === DIFFERENTIAL NERVE BLOCK IN LABOR EPIDURAL ===
 *
 * Labor pain has TWO components with different neuraxial anatomy:
 *
 * FIRST STAGE (contractions, 0-10 cm dilation):
 *   - Visceral pain from uterine contractions and cervical dilation
 *   - Transmitted via T10-L1 afferents (sympathetic nerves)
 *   - Responds to low concentrations of local anesthetic
 *
 * SECOND STAGE (pushing, fetal descent):
 *   - Somatic pain from perineal/vaginal stretching
 *   - Transmitted via S2-S4 (pudendal nerve)
 *   - Requires higher LA concentration to block
 *
 * === MOTOR-SPARING DIFFERENTIAL BLOCK ===
 * Goal: ANALGESIA without motor block → patient can push effectively.
 * Achieved with VERY DILUTE local anesthetic (0.0625-0.125% bupivacaine)
 * + LOW-DOSE opioid (fentanyl 2 mcg/mL or sufentanil).
 *
 * Mechanism (differential block physics):
 * - B/C fibers (pain, temperature, autonomic): blocked by LOW concentrations
 * - Aδ fibers (sharp pain, touch): partially blocked
 * - Aβ fibers (touch, proprioception): NOT blocked at labor epidural concentrations
 * - Aα fibers (motor): NOT blocked → ambulation possible ("walking epidural")
 *
 * At standard surgical concentrations (0.5% bupivacaine):
 * - ALL fiber types blocked → dense motor block → cannot push
 *
 * KEY TEACHING: Labor epidural uses 4-8× lower LA concentration than surgical epidural!
 * Labor: 0.0625-0.125% bupivacaine + fentanyl 2 mcg/mL
 * Surgical: 0.5% bupivacaine (or 0.75% for intrathecal)
 *
 * === COMBINED SPINAL-EPIDURAL (CSE) ===
 * Technique: intrathecal injection through spinal needle placed through epidural needle
 * → immediate analgesia (spinal component) + epidural catheter for maintenance.
 * "Walking epidural": very low-dose intrathecal (bupivacaine 2.5 mg + fentanyl 15 mcg)
 * → fast onset, motor-sparing, patient can ambulate.
 *
 * === COMPLICATIONS ===
 * 1. HIGH BLOCK: If epidural catheter migrated intrathecally → epidural dose becomes
 *    intrathecal dose → 3-4× more potent → TOTAL SPINAL. Test dose mandatory.
 * 2. INTRAVASCULAR INJECTION: 1.5 mg epinephrine in test dose → HR ↑ >20 bpm if IV
 * 3. PRURITUS: Most common opioid side effect from intrathecal/epidural opioids.
 *    Nalbuphine or low-dose naloxone if severe.
 * 4. HYPOTENSION: Sympathectomy → vasodilation. Treat with ephedrine or phenylephrine.
 *    Phenylephrine preferred in labor (less associated with fetal acidosis than ephedrine).
 * 5. FETAL BRADYCARDIA: From maternal hypotension (uteroplacental insufficiency)
 *    or intrathecal fentanyl (uterotonic effect from rapid drop in circulating catecholamines
 *    when pain is suddenly relieved — paradoxical hyperstimulation).
 *
 * Sources: Wong CA, NEJM 2007; ACOG Practice Bulletin 2019 (Labor Analgesia);
 * Comparative Obstetric Mobile Epidural Trial (COMET), Lancet 2001;
 * Miller's 9th Ed Ch 58 (Obstetric Analgesia and Anesthesia).
 */

export interface LaborEpiduralInputs {
  laborEpiduralActive?: boolean;
  laborStage?: 1 | 2;          // stage of labor
  bupivacaineConcentrationPercent?: number; // 0.0625 = labor, 0.5 = surgical
  fentanylConcentrationMcgMl?: number;    // typical 2 mcg/mL for labor
  isCSE?: boolean;             // combined spinal-epidural technique
  intrathecalBupivacaineMg?: number;     // CSE intrathecal component

  // Maternal hemodynamics
  currentMAP?: number;
  currentHR?: number;
  hasHypotension?: boolean;    // MAP < 80% baseline

  // Complications
  highBlockSuspected?: boolean;  // sudden maternal distress after dose
  prevTestDoseGiven?: boolean;
  epiTestDoseHRChange?: number;  // HR change 60s after test dose

  // Fetal
  fetalHR?: number;            // normal 120-160 bpm

  // Event guards
  prevLaborEpiduralLogged?: boolean;
  prevHighBlockLogged?: boolean;
  prevFetalBradyLogged?: boolean;
  prevHypotensionLogged?: boolean;
}

export interface LaborEpiduralOutput {
  // Block quality
  analgesiaAdequate: boolean;     // adequate first stage pain relief
  motorBlockIndex: number;        // 0-1 (0 = no motor block, 1 = dense)
  ambulation_possible: boolean;   // patient can walk (motor block < 0.2)
  blockLevel: number;             // dermatome level (T10 = 10, L1 = 1)

  // Differential block physics
  cFiberBlockFraction: number;    // 0-1 pain fibers blocked
  motorFiberBlockFraction: number; // 0-1 motor fibers blocked

  // Complications
  hypotensionRisk: number;        // 0-1
  highBlockRisk: number;          // 0-1 (if test dose shows HR change)
  fetalBradycardiaRisk: number;   // 0-1

  // Neonatal outcomes
  motorBlockPreservesAbilityToPush: boolean;

  prevLaborEpiduralLogged: boolean;
  prevHighBlockLogged: boolean;
  prevFetalBradyLogged: boolean;
  prevHypotensionLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class LaborEpiduralModel {
  static tick(inputs: LaborEpiduralInputs = {}): LaborEpiduralOutput {
    const events: string[] = [];
    let prevLaborEpiduralLogged = !!inputs.prevLaborEpiduralLogged;
    let prevHighBlockLogged = !!inputs.prevHighBlockLogged;
    let prevFetalBradyLogged = !!inputs.prevFetalBradyLogged;
    let prevHypotensionLogged = !!inputs.prevHypotensionLogged;

    const laborActive = !!inputs.laborEpiduralActive;

    if (!laborActive) {
      return {
        analgesiaAdequate: false, motorBlockIndex: 0, ambulation_possible: true,
        blockLevel: 0, cFiberBlockFraction: 0, motorFiberBlockFraction: 0,
        hypotensionRisk: 0, highBlockRisk: 0, fetalBradycardiaRisk: 0,
        motorBlockPreservesAbilityToPush: true,
        prevLaborEpiduralLogged, prevHighBlockLogged, prevFetalBradyLogged, prevHypotensionLogged, events,
      };
    }

    const bupiConc = clamp(safeNumber(inputs.bupivacaineConcentrationPercent, 0.1), 0, 0.75);
    const fentanylConc = clamp(safeNumber(inputs.fentanylConcentrationMcgMl, 2), 0, 5);
    const laborStage = inputs.laborStage || 1;
    const isCSE = !!inputs.isCSE;
    const intrathecalBupi = clamp(safeNumber(inputs.intrathecalBupivacaineMg, 0), 0, 5);
    const currentMAP = clamp(safeNumber(inputs.currentMAP, 85), 40, 150);
    const currentHR = clamp(safeNumber(inputs.currentHR, 80), 30, 200);
    const highBlockSuspected = !!inputs.highBlockSuspected;
    const epiHRChange = safeNumber(inputs.epiTestDoseHRChange, 0);
    const fetalHR = clamp(safeNumber(inputs.fetalHR, 140), 60, 200);
    const hasHypotension = !!inputs.hasHypotension || currentMAP < 65;

    // ===========================
    // DIFFERENTIAL BLOCK PHYSICS
    // ===========================
    // B/C fibers (pain): blocked at 0.0625% bupivacaine
    // Aα motor fibers: require >0.25% for significant block
    // This models the key differential block physics

    const bupiLaborNormalized = bupiConc / 0.5; // 1.0 = full surgical concentration

    // C-fiber (pain) block: essentially complete even at 0.0625%
    const cFiberBlockFraction = clamp(
      0.9 * (bupiConc / (bupiConc + 0.04)) // C-fibers blocked at very low concentration
      + fentanylConc * 0.05,               // intrathecal opioid contribution
      0, 1.0,
    );

    // Motor fiber block: steep sigmoid above 0.25%
    const motorFiberBlockFraction = clamp(
      Math.pow(Math.max(0, bupiConc - 0.10) / 0.40, 2.5), // threshold at 0.1%, steep above
      0, 1.0,
    );

    // CSE intrathecal component provides immediate analgesia
    const csePainRelief = isCSE && intrathecalBupi > 0
      ? clamp(intrathecalBupi / 5 * 0.8, 0, 0.8) : 0;

    const analgesiaAdequate = cFiberBlockFraction > 0.7 || csePainRelief > 0.5;
    const motorBlockIndex = motorFiberBlockFraction;
    const ambulation_possible = motorBlockIndex < 0.2;
    const motorBlockPreservesAbilityToPush = motorBlockIndex < 0.4;

    // Block level approximation (typical labor epidural: T10)
    const blockLevel = bupiConc > 0.25 ? 8 : bupiConc > 0.1 ? 10 : 12;

    // ===========================
    // COMPLICATIONS
    // ===========================
    // Hypotension risk: sympathectomy level
    const hypotensionRisk = clamp(bupiLaborNormalized * 0.3, 0, 0.4);

    // High block risk: intravascular test dose check
    const intravascularInjection = epiHRChange > 20; // >20 bpm rise = IV catheter
    const highBlockRisk = highBlockSuspected || intravascularInjection ? 0.8 : clamp(bupiLaborNormalized * 0.05, 0, 0.1);

    // Fetal bradycardia: from maternal hypotension or intrathecal opioid
    const fetalBradycardiaRisk = hasHypotension ? 0.6 : (isCSE && intrathecalBupi > 0 ? 0.3 : 0.05);

    // ===========================
    // EVENTS
    // ===========================
    if (!prevLaborEpiduralLogged) {
      const motorStatus = motorBlockIndex < 0.1 ? 'MINIMAL motor block — walking epidural possible' : motorBlockIndex < 0.4 ? 'partial motor block — pushing preserved' : 'DENSE motor block — pushing ability impaired (consider dose reduction)';
      events.push(
        `✅ LABOR EPIDURAL PLACED: Bupivacaine ${(bupiConc * 100).toFixed(3)}% + Fentanyl ${fentanylConc.toFixed(0)} mcg/mL. Differential block: C-fibers (pain) ${(cFiberBlockFraction * 100).toFixed(0)}% blocked vs motor fibers ${(motorFiberBlockFraction * 100).toFixed(0)}% blocked. ${motorStatus}. Block level: ~T${blockLevel}. ${isCSE ? 'CSE technique: immediate intrathecal analgesia providing fast onset (2-5 min).' : ''} MONITORING: FHR, maternal BP q5 min × 30 min after placement, then q15 min. TEST DOSE (with 3 mL 1.5% lidocaine + epinephrine 15 mcg): HR ↑ > 20 bpm = intravascular injection; high block signs = intrathecal placement.`,
      );
      prevLaborEpiduralLogged = true;
    }

    if (highBlockRisk > 0.6 && !prevHighBlockLogged) {
      events.push(
        `🚨 HIGH/TOTAL SPINAL RISK: ${intravascularInjection ? 'INTRAVASCULAR test dose injection (HR ↑ >20 bpm)' : 'Clinical signs of high block'}. If intravascular: catheter is IV → drugs enter circulation → will NOT produce block (use new catheter). If intrathecal: epidural dose administered intrathecally → 3-4× potency → TOTAL SPINAL risk. Signs of total spinal: sudden dyspnea, motor weakness spreading to arms, loss of consciousness. MANAGEMENT: Airway (RSI), vasopressors, left lateral tilt, call for help. PREVENTION: ALWAYS give test dose + use incremental dosing.`,
      );
      prevHighBlockLogged = true;
    }

    if (hasHypotension && !prevHypotensionLogged) {
      events.push(
        `⚠️ EPIDURAL HYPOTENSION: MAP ${currentMAP.toFixed(0)} mmHg post-epidural. TREATMENT: Phenylephrine 100-200 mcg IV bolus (preferred over ephedrine in labor — less fetal acidosis); or ephedrine 5-10 mg IV if bradycardia coexists (ephedrine raises HR too). Left lateral tilt (15-30°) for aortocaval decompression. IV fluid preload/coload. FHR monitoring — maternal hypotension → uteroplacental insufficiency → fetal bradycardia within 1-3 min.`,
      );
      prevHypotensionLogged = true;
    }

    if (fetalHR < 100 && fetalBradycardiaRisk > 0.3 && !prevFetalBradyLogged) {
      events.push(
        `🚨 FETAL BRADYCARDIA: FHR ${fetalHR} bpm following epidural/intrathecal placement. MANAGEMENT: (1) Left lateral tilt; (2) FiO2 100% for maternal oxygenation; (3) Vasopressor for maternal hypotension; (4) Discontinue oxytocin; (5) Manual uterine displacement; (6) If persistent (>3 min) and unresponsive: prepare for emergency cesarean section. CAUSE: Usually maternal hypotension (uteroplacental insufficiency) or intrathecal opioid → sudden pain relief → drop in circulating catecholamines → uterine hyperstimulation → fetal distress.`,
      );
      prevFetalBradyLogged = true;
    }
    if (!hasHypotension) prevHypotensionLogged = false;
    if (fetalHR >= 120) prevFetalBradyLogged = false;

    return {
      analgesiaAdequate,
      motorBlockIndex: parseFloat(motorBlockIndex.toFixed(4)),
      ambulation_possible,
      blockLevel,
      cFiberBlockFraction: parseFloat(cFiberBlockFraction.toFixed(4)),
      motorFiberBlockFraction: parseFloat(motorFiberBlockFraction.toFixed(4)),
      hypotensionRisk: parseFloat(hypotensionRisk.toFixed(4)),
      highBlockRisk: parseFloat(highBlockRisk.toFixed(4)),
      fetalBradycardiaRisk: parseFloat(fetalBradycardiaRisk.toFixed(4)),
      motorBlockPreservesAbilityToPush,
      prevLaborEpiduralLogged,
      prevHighBlockLogged,
      prevFetalBradyLogged,
      prevHypotensionLogged,
      events,
    };
  }
}
