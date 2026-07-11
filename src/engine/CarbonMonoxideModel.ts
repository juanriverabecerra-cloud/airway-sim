/**
 * Carbon Monoxide Poisoning Model
 *
 * CO is the most common cause of poisoning death in the developed world. Relevance to
 * anesthesia: smoke inhalation patients, CO-rich environments (house fires, generator
 * exposures), methylene chloride metabolism (paint strippers → endogenous CO),
 * and nitroprusside-associated cyanide toxicity (separate mechanism, modeled elsewhere).
 *
 * === MECHANISM ===
 * 1. CO-Hemoglobin (COHb): CO binds Hb with 240× affinity over O2 → displaces O2,
 *    reduces functional O2-carrying capacity proportional to COHb%.
 * 2. Haldane Effect: CO on remaining Hb increases Hb-O2 affinity (left-shifts ODC) →
 *    O2 delivered to tissues cannot be offloaded normally.
 * 3. Cytochrome Binding: CO directly inhibits cytochrome c oxidase (Complex IV) →
 *    impairs mitochondrial O2 utilization even when dissolved O2 is available.
 * 4. Pulse Oximetry Error: SpO2 reads falsely HIGH because oximeter cannot distinguish
 *    COHb from OxyHb at 660/940 nm wavelengths (already modeled in RespiratoryEngine).
 *    CO-oximetry (multi-wavelength) or ABG co-oximetry required for diagnosis.
 *
 * === CO ELIMINATION HALF-LIVES ===
 * - Room air (21% O2):    t½ ≈ 320 min  → k = 0.00217/min
 * - 100% O2 via NRB:      t½ ≈  90 min  → k = 0.00770/min
 * - HBO at 2.5 ATM:       t½ ≈  20 min  → k = 0.03466/min
 * (Weaver 2002; Hampson 1998; O2 competitively displaces CO from Hb)
 *
 * === CLINICAL THRESHOLDS ===
 * - COHb ≤  5%: Normal (smokers up to ~8%, urban dwellers ~2%)
 * - COHb 10-20%: Headache, dyspnea on exertion
 * - COHb 20-30%: Throbbing headache, nausea, confusion
 * - COHb 30-40%: Confusion, visual disturbances, chest pain, ECG changes
 * - COHb 40-50%: Syncope, bradycardia, arrhythmias, cardiovascular collapse
 * - COHb  >50%: Coma, seizures, death
 *
 * === ANESTHESIA IMPLICATIONS ===
 * - SpO2 monitoring UNRELIABLE: falsely elevated by up to COHb% amount
 * - ABG shows "normal" PaO2 (dissolved O2 unaffected) but actual O2 delivery impaired
 * - Treat: 100% O2 immediately (fastest elimination possible without HBO)
 * - HBO indications: COHb >25%, loss of consciousness, pregnancy, cardiac ischemia
 *
 * Sources: Weaver LK et al. NEJM 2002; Hampson NB, Chest 2012;
 * Kao LW, Nanagas KA, Emerg Med Clin N Am 2004.
 */

export interface COInputs {
  coHbPercent?: number;            // current COHb% (starts at patient.coHb)
  smokeExposureActive?: boolean;   // ongoing smoke/CO inhalation
  smokeSeverity?: number;          // 0-1: 1 = worst-case structural fire with victim inside
  currentFiO2?: number;            // FiO2 determines elimination rate
  hyperbaricO2Active?: boolean;    // HBO therapy
  inhalationInjuryPresent?: boolean; // thermal/chemical airway injury complicating management
  prevCO20Logged?: boolean;
  prevCO30Logged?: boolean;
  prevCO40Logged?: boolean;
  prevCO50Logged?: boolean;
}

export interface COOutput {
  coHbPercent: number;             // updated COHb% this tick
  coHbFraction: number;            // coHbPercent/100 for use in RespiratoryEngine
  functionalHbFraction: number;    // (1 - coHbFraction): fraction of Hb available for O2
  haldaneBohrShift: number;        // additive to Bohr exponent (left shift, negative value)
  cytochromeToxicityIndex: number; // 0-1: direct mitochondrial inhibition (separate from Hb)
  coElimRatePerMin: number;        // current CO elimination rate (%/min from blood)
  coAccumRatePerMin: number;       // CO accumulation rate (%/min from exposure)
  prevCO20Logged: boolean;
  prevCO30Logged: boolean;
  prevCO40Logged: boolean;
  prevCO50Logged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// CO elimination rate constants (per minute):
// k = ln(2) / t_half_min
const K_ELIM_AIR  = 0.00217;  // t½ 320 min (room air)
const K_ELIM_O2   = 0.00770;  // t½  90 min (100% O2)
const K_ELIM_HBO  = 0.03466;  // t½  20 min (HBO 2.5 ATM)

// Smoke inhalation CO accumulation rates:
// Light smoke (smoldering furniture): ~0.5-1% per min
// Dense structural fire smoke: ~2-5% per min
const K_ACCUM_LIGHT = 0.8;  // %/min at severity = 0.3
const K_ACCUM_HEAVY = 5.0;  // %/min at severity = 1.0

export class CarbonMonoxideModel {
  static tick(inputs: COInputs = {}): COOutput {
    const events: string[] = [];
    let prevCO20Logged = !!inputs.prevCO20Logged;
    let prevCO30Logged = !!inputs.prevCO30Logged;
    let prevCO40Logged = !!inputs.prevCO40Logged;
    let prevCO50Logged = !!inputs.prevCO50Logged;

    let coHb = clamp(safeNumber(inputs.coHbPercent, 1.0), 0, 100);
    const inputCoHb = coHb; // snapshot before kinetics; used for threshold event gating
    const smokeActive = !!inputs.smokeExposureActive;
    const smokeSeverity = clamp(safeNumber(inputs.smokeSeverity, 0.5), 0, 1.0);
    const fio2 = clamp(safeNumber(inputs.currentFiO2, 0.21), 0.21, 1.0);
    const hboActive = !!inputs.hyperbaricO2Active;

    // ===========================
    // CO ACCUMULATION (per tick = per second → convert to per-second from per-minute)
    // ===========================
    let coAccumRatePerMin = 0;
    if (smokeActive) {
      // Linear interpolation between light and heavy smoke based on severity
      coAccumRatePerMin = K_ACCUM_LIGHT + (K_ACCUM_HEAVY - K_ACCUM_LIGHT) * Math.max(0, smokeSeverity - 0.2) / 0.8;
      coAccumRatePerMin = Math.max(0, coAccumRatePerMin);
      coHb = Math.min(100, coHb + coAccumRatePerMin / 60); // per-second tick
    }

    // ===========================
    // CO ELIMINATION (per second tick)
    // ===========================
    let elimRateConst: number;
    if (hboActive) {
      elimRateConst = K_ELIM_HBO;
    } else {
      // Linear interpolation between air and 100% O2 based on FiO2
      const fio2Normalized = (fio2 - 0.21) / 0.79;
      elimRateConst = K_ELIM_AIR + (K_ELIM_O2 - K_ELIM_AIR) * fio2Normalized;
    }
    const coElimRatePerMin = coHb * elimRateConst; // absolute %/min removed
    coHb = Math.max(0, coHb - coElimRatePerMin / 60); // per-second tick

    // ===========================
    // DERIVED QUANTITIES
    // ===========================
    const coHbFraction = coHb / 100;
    const functionalHbFraction = 1.0 - coHbFraction;

    // Haldane effect: CO on Hb increases remaining Hb's O2 affinity.
    // Each 10% COHb shifts P50 left by ~3 mmHg (from 26 → ~14 mmHg at 50% COHb).
    // Modeled as a negative additive to the Bohr exponent (more negative = more left shift = higher affinity).
    // Full P50 shift model would require rewriting the Hill equation; we approximate
    // using a fractional shift in the existing Bohr exponent.
    const haldaneBohrShift = -coHbFraction * 1.2;

    // Cytochrome inhibition: direct mitochondrial toxicity.
    // Clinically significant above ~30% COHb; maxes at ~50%.
    // This index contributes to tissue hypoxia independently of Hb binding.
    const cytochromeToxicityIndex = clamp((coHb - 20) / 30, 0, 1.0);

    // ===========================
    // THRESHOLD EVENTS (gated on input COHb to fire when entering threshold, not after elimination)
    // ===========================
    if (inputCoHb >= 20 && !prevCO20Logged) {
      events.push(
        `⚠️ CO POISONING — COHb ${coHb.toFixed(0)}%: Headache, nausea, dyspnea. SpO2 FALSELY HIGH — pulse oximetry cannot detect COHb. Actual O2 carrying capacity reduced ${coHb.toFixed(0)}% from baseline. TREATMENT: Maximize FiO2 to 1.0 (NRB mask or intubation). Consider co-oximetry ABG for accurate COHb. Document time of exposure and last room air reading.`,
      );
      prevCO20Logged = true;
    }
    if (inputCoHb >= 30 && !prevCO30Logged) {
      events.push(
        `🚨 CO POISONING — COHb ${inputCoHb.toFixed(0)}%: Confusion, visual disturbances, chest pain. ECG monitoring for ST changes and arrhythmias. SpO2 still reading falsely NORMAL despite critical tissue hypoxia. Begin 100% O2 via tight-fitting NRB (t½ reduced from 320 min → 90 min). Contact HBO center — indication threshold approaching. Cytochrome inhibition beginning to impair mitochondrial respiration.`,
      );
      prevCO30Logged = true;
    }
    if (inputCoHb >= 40 && !prevCO40Logged) {
      events.push(
        `🚨 CRITICAL CO POISONING — COHb ${inputCoHb.toFixed(0)}%: Syncope, bradycardia, risk of cardiovascular collapse. Intubate if not already done. FiO2 1.0 mandatory. HYPERBARIC O2 INDICATED (COHb >25% + cardiovascular compromise). HBO reduces t½ to 20 min. Monitor for rhabdomyolysis, troponin elevation, lactic acidosis. CO binds cytochrome c oxidase → cellular hypoxia despite "normal" PaO2 on ABG.`,
      );
      prevCO40Logged = true;
    }
    if (inputCoHb >= 50 && !prevCO50Logged) {
      events.push(
        `☠️ LETHAL CO POISONING — COHb ${inputCoHb.toFixed(0)}%: Coma, seizures, cardiovascular collapse imminent. Immediate resuscitation. 100% O2 via ETT is absolute priority. HBO if reachable and patient stable enough. Survival rate drops precipitously above 50% COHb without immediate treatment. This COHb level is typically associated with exposure duration of >4h in structural fire or intentional exposure.`,
      );
      prevCO50Logged = true;
    }

    // Reset logged flags if COHb has fallen significantly below each threshold
    if (inputCoHb < 18) prevCO20Logged = false;
    if (inputCoHb < 28) prevCO30Logged = false;
    if (inputCoHb < 38) prevCO40Logged = false;
    if (inputCoHb < 48) prevCO50Logged = false;

    return {
      coHbPercent: parseFloat(coHb.toFixed(2)),
      coHbFraction: parseFloat(coHbFraction.toFixed(4)),
      functionalHbFraction: parseFloat(functionalHbFraction.toFixed(4)),
      haldaneBohrShift: parseFloat(haldaneBohrShift.toFixed(4)),
      cytochromeToxicityIndex: parseFloat(cytochromeToxicityIndex.toFixed(4)),
      coElimRatePerMin: parseFloat(coElimRatePerMin.toFixed(4)),
      coAccumRatePerMin: parseFloat(coAccumRatePerMin.toFixed(4)),
      prevCO20Logged,
      prevCO30Logged,
      prevCO40Logged,
      prevCO50Logged,
      events,
    };
  }
}
