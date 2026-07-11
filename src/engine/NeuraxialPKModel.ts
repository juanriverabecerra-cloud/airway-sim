/**
 * Neuraxial PK Model: CSF Drug Distribution, Baricity, Spread, and Rostral Migration
 *
 * Phase 6, Stage G of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * The existing `NerveConductionBlockModel.ts` models differential fiber block (A/B/C fibers)
 * based on local anesthetic CONCENTRATION and spatial coverage -- but the real CSF
 * pharmacokinetics that determine WHAT concentration reaches which dermatomal level, and HOW
 * FAST spread occurs based on baricity and patient position, are completely absent.
 *
 * === BARICITY AND CSF SPREAD ===
 *
 * Baricity = (drug solution density) / (CSF density at 37°C = 1.0003-1.0007 g/mL).
 * This single physical property determines which direction a spinal drug spreads:
 *
 * - **Hyperbaric** (baricity > 1.004, e.g., 0.5% hyperbaric bupivacaine in 8.25% dextrose,
 *   baricity ~1.023): denser than CSF → sinks to dependent positions. In supine patient →
 *   pools posteriorly (dorsal surface) spreading toward sacral segments; in Trendelenburg →
 *   spreads cephalad toward thoracic level; in sitting position → stays sacral (saddle block).
 *   GOLD STANDARD for predictable spinal: position determines final level.
 *
 * - **Hypobaric** (baricity < 1.003, e.g., 0.1% bupivacaine plain in water, baricity ~1.001):
 *   less dense than CSF → floats to non-dependent positions. Useful for hip surgery in lateral
 *   decubitus (block rises to the operative side). Unpredictable in routine practice.
 *
 * - **Isobaric** (baricity ≈ CSF, e.g., 0.5% plain bupivacaine at 37°C): minimal gravity-
 *   driven spread; distributes by bulk CSF flow and diffusion. Less position-dependent.
 *   Spread typically 3-5 dermatomes below injection site.
 *
 * Clinical implications directly relevant to simulation:
 * 1. A sitting patient given hyperbaric bupivacaine and immediately laid supine will have
 *    MUCH HIGHER BLOCK LEVEL than one kept sitting -- the drug has already distributed based
 *    on the position at and just after injection (the "critical period" of ~5-10 minutes).
 * 2. Trendelenburg position with hyperbaric spinal = dangerous high spinal risk.
 * 3. Head-up position (beach chair) with hypobaric spinal = block rises to cervical level.
 *
 * === INTRATHECAL OPIOID PHARMACOKINETICS ===
 *
 * Water-soluble opioids (morphine, hydromorphone): low lipid solubility → stay in CSF,
 * spread rostrally via bulk CSF flow → delayed respiratory depression (6-18h after injection
 * as morphine reaches the respiratory center in the medulla). This is one of the most
 * clinically dangerous and uniquely neuraxial drug behaviors -- a patient can appear
 * completely stable for 12+ hours after intrathecal morphine, then develop fatal apnea.
 *
 * Lipid-soluble opioids (fentanyl, sufentanil): high lipid solubility → rapidly absorbed
 * into spinal cord lipid → MINIMAL rostral spread → spinal-level analgesia only with
 * very short duration. Safe from a respiratory depression standpoint (essentially no delayed
 * respiratory depression) but also less useful for postoperative pain management.
 *
 * === EPIDURAL FAT SEQUESTRATION ===
 *
 * Lipophilic drugs (fentanyl) administered epidurally are substantially absorbed into
 * epidural fat before reaching the spinal cord → lower effective concentration at the cord,
 * faster systemic absorption (epidural fentanyl achieves plasma levels similar to IM),
 * shorter duration. Hydrophilic opioids (morphine) are less absorbed by fat → more available
 * for cord penetration and rostral spread.
 *
 * Source: Bernards CM Anesth Analg 2002 (intrathecal drug spread mechanisms); Hocking G &
 * Wildsmith JAW Br J Anaesth 2004 (baricity and spread); Rathmell JP et al. Anesth Analg 2005
 * (neuraxial opioid pharmacokinetics). All calibration values are disclosed, reasoned estimates.
 */

export interface NeuraxialPKInputs {
  spinalBaricityType?: 'hyperbaric' | 'isobaric' | 'hypobaric'; // drug formulation
  injectionPosition?: string; // patient position at time of injection
  currentPosition?: string; // current patient position after injection
  minutesSinceInjection?: number; // 0 = just injected, affects spread completion

  // Intrathecal drug concentrations (if applicable)
  intrathecalMorphineMg?: number; // dose given; accumulates in CSF and spreads rostrally
  intrathecalFentanylMcg?: number; // rapidly absorbed into cord, minimal rostral spread
  intrathecalBupivacaineMg?: number; // dose, determines initial spread in conjunction with baricity

  // Epidural opioid concentrations (Ce from PKPDEngine for drugs given epidurally)
  epiduralFentanylCe?: number; // high fat absorption → systemic effect mimics IV
  epiduralMorphineCe?: number; // hydrophilic → penetrates cord, modest rostral spread

  // Patient characteristics
  heightCm?: number;
  age?: number;
  isPregnant?: boolean;

  // Carried-forward state
  prevRostralMorphineConcentration?: number; // 0-1, relative CSF morphine at medullary level
  prevRespiratoryDepressionFromMorphine?: boolean;
  prevHighSpinalLogged?: boolean;
}

export interface NeuraxialPKOutput {
  // Spinal spread level (dermatomal)
  predictedBlockLevel: number; // dermatomal level (1=C1, 8=T1, 20=T12, 25=L5, 29=S4) -- integer approximation
  spreadComplete: boolean; // spread has reached its predicted final level
  highSpinalRisk: boolean; // predicted level ≥ T4 (classic danger zone)

  // Intrathecal opioid pharmacokinetics
  rostralMorphineConcentration: number; // 0-1, relative CSF morphine at medullary level
  delayedRespiratoryDepressionRisk: number; // 0-1, risk of delayed respiratory depression from IT morphine
  respiratoryDepressionFromMorphine: boolean;
  fentanylCordConcentration: number; // 0-1, rapid cord absorption

  // Epidural opioid behavior
  epiduralFentanylSystemicFraction: number; // fraction absorbed systemically (≈0.8 for epidural fentanyl)
  epiduralMorphineCordFraction: number; // fraction penetrating cord (≈0.3 for epidural morphine)

  prevHighSpinalLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Dermatomal spread predictions for each baricity type by injection position
// Numbers represent the cranial dermatomal level reached (1=C1, 8=T1, etc.)
// These are MAXIMUM levels -- realized level also depends on drug dose and patient factors
const SPREAD_LEVELS: Record<string, Record<string, number>> = {
  hyperbaric: {
    Sitting: 29,       // saddle block (stays sacral/perineal)
    Supine: 20,        // T12 typical (dorsal pooling, then limited cephalad spread)
    Trendelenburg: 8,  // T1-T4 or higher (DANGER -- very high spinal risk)
    'Rev Trendelenburg': 25, // L5-S1 (drug runs away from head)
    Lateral: 20,       // T12 (operative side lower = drug pools there)
    Prone: 25,         // L5 (tends to stay lumbar in prone)
    Lithotomy: 16,     // T8 (legs up with Trendelenburg tilt common in lithotomy)
    'Beach Chair': 29  // saddle block (drug away from head)
  },
  isobaric: {
    Sitting: 22, Supine: 18, Trendelenburg: 14, 'Rev Trendelenburg': 22,
    Lateral: 20, Prone: 22, Lithotomy: 16, 'Beach Chair': 22
  },
  hypobaric: {
    Sitting: 8,        // floats up toward cervical! (DANGER in sitting)
    Supine: 18,
    Trendelenburg: 22, // rises away from head (opposite of hyperbaric)
    'Rev Trendelenburg': 12, // floats cephalad
    Lateral: 20, Prone: 15, Lithotomy: 20, 'Beach Chair': 10
  }
};

export class NeuraxialPKModel {
  static tick(inputs: NeuraxialPKInputs = {}): NeuraxialPKOutput {
    const events: string[] = [];

    const baricityType = inputs.spinalBaricityType || 'isobaric';
    const injectionPosition = inputs.injectionPosition || 'Supine';
    const currentPosition = inputs.currentPosition || injectionPosition;
    const minutesSinceInjection = Math.max(0, safeNumber(inputs.minutesSinceInjection, 0));

    const intrathecalMorphineMg = Math.max(0, safeNumber(inputs.intrathecalMorphineMg, 0));
    const intrathecalFentanylMcg = Math.max(0, safeNumber(inputs.intrathecalFentanylMcg, 0));
    const epiduralFentanylCe = Math.max(0, safeNumber(inputs.epiduralFentanylCe, 0));
    const epiduralMorphineCe = Math.max(0, safeNumber(inputs.epiduralMorphineCe, 0));
    const isPregnant = !!inputs.isPregnant;

    let prevRostralMorphine = clamp(safeNumber(inputs.prevRostralMorphineConcentration, 0), 0, 1);
    let prevRespiratoryDepressionFromMorphine = !!inputs.prevRespiratoryDepressionFromMorphine;

    // Pregnancy raises CSF pressure (enlarged epidural veins, elevated intra-abdominal pressure)
    // → reduced intrathecal volume → drugs spread ~2 dermatomal levels higher than expected
    const pregnancySpreadBonus = isPregnant ? 2 : 0;

    // Predicted final dermatomal level: uses INJECTION position for hyperbaric/hypobaric
    // (baricity-driven spread occurs in the first 5-10 minutes), current position matters
    // if position changes during this critical window
    const criticalPeriodMinutes = 8;
    const positionForSpread = minutesSinceInjection < criticalPeriodMinutes ? currentPosition : injectionPosition;
    const spreadMatrix = SPREAD_LEVELS[baricityType] || SPREAD_LEVELS.isobaric;
    const maxLevel = (spreadMatrix[positionForSpread] || spreadMatrix['Supine']) - pregnancySpreadBonus;

    // Spread completes over ~10-20 minutes
    const spreadFraction = clamp(minutesSinceInjection / 15, 0, 1);
    const predictedBlockLevel = Math.round(maxLevel + (29 - maxLevel) * (1 - spreadFraction));
    // (starts at lumbar injection site ~L3/L4 = 26, spreads toward maxLevel)
    const spreadComplete = spreadFraction >= 0.9;

    // High spinal: level ≥ T4 (dermatomal level ≤ 9 in our 1=C1 convention)
    const highSpinalRisk = predictedBlockLevel <= 9;
    let prevHighSpinalLogged = !!inputs.prevHighSpinalLogged;
    if (highSpinalRisk && spreadComplete) {
      if (!prevHighSpinalLogged) {
        events.push("🚨 CRITICAL: HIGH SPINAL ANESTHETIC -- block level at or above T4. Risk of respiratory paralysis (phrenic nerve, C3-C5), profound hypotension, and cardiovascular collapse. Airway support, phenylephrine/ephedrine for BP, and possible emergency intubation. Position head-UP immediately if hyperbaric drug was used.");
        prevHighSpinalLogged = true;
      }
    } else {
      prevHighSpinalLogged = false;
    }

    // Intrathecal morphine rostral migration (water-soluble, stays in CSF, spreads cephalad)
    // Peak medullary concentration reached at 6-18h (typical for 0.1-0.2 mg dose)
    // Modeled as a time-delayed peak using a simplified PK absorption profile
    const morphineRostralPeakHour = 12; // hours after injection
    const morphineDurationHours = 24; // duration of effect
    if (intrathecalMorphineMg > 0) {
      const hoursPostInjection = minutesSinceInjection / 60;
      const risePhase = Math.min(1, hoursPostInjection / morphineRostralPeakHour);
      const fallPhase = hoursPostInjection > morphineRostralPeakHour
        ? Math.max(0, 1 - (hoursPostInjection - morphineRostralPeakHour) / (morphineDurationHours - morphineRostralPeakHour))
        : 1;
      prevRostralMorphine = risePhase * fallPhase * Math.min(1, intrathecalMorphineMg / 0.2);
    } else {
      prevRostralMorphine = Math.max(0, prevRostralMorphine - 0.001); // gradual decay
    }

    const delayedRespiratoryDepressionRisk = prevRostralMorphine * 0.3; // 30% max risk at peak concentration
    const respiratoryDepressionFromMorphine = prevRostralMorphine > 0.7;

    if (respiratoryDepressionFromMorphine && !prevRespiratoryDepressionFromMorphine) {
      events.push("🚨 CRITICAL: DELAYED RESPIRATORY DEPRESSION from intrathecal morphine -- drug has migrated rostrally in CSF and reached the medullary respiratory center. Apnea risk. Patient requires close monitoring for 18-24h after intrathecal morphine administration. Administer naloxone if needed.");
      prevRespiratoryDepressionFromMorphine = true;
    } else if (!respiratoryDepressionFromMorphine && prevRespiratoryDepressionFromMorphine) {
      prevRespiratoryDepressionFromMorphine = false;
    }

    // Intrathecal fentanyl: rapid cord absorption (lipophilic), minimal rostral spread
    const fentanylCordConcentration = intrathecalFentanylMcg > 0 ? Math.min(1, intrathecalFentanylMcg / 25) : 0;

    // Epidural drug behavior
    // Fentanyl: ~80% absorbed systemically (mimics IV), ~20% to cord
    const epiduralFentanylSystemicFraction = epiduralFentanylCe > 0 ? 0.8 : 0;
    // Morphine: ~70% to cord (hydrophilic, penetrates cord better, less fat sequestration)
    const epiduralMorphineCordFraction = epiduralMorphineCe > 0 ? 0.3 : 0;

    return {
      predictedBlockLevel,
      spreadComplete,
      highSpinalRisk,
      rostralMorphineConcentration: parseFloat(prevRostralMorphine.toFixed(4)),
      delayedRespiratoryDepressionRisk: parseFloat(delayedRespiratoryDepressionRisk.toFixed(4)),
      respiratoryDepressionFromMorphine,
      fentanylCordConcentration: parseFloat(fentanylCordConcentration.toFixed(4)),
      epiduralFentanylSystemicFraction: parseFloat(epiduralFentanylSystemicFraction.toFixed(2)),
      epiduralMorphineCordFraction: parseFloat(epiduralMorphineCordFraction.toFixed(2)),
      prevHighSpinalLogged,
      events
    };
  }
}
