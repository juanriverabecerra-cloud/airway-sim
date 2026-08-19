/**
 * Pediatric Physiology Engine
 *
 * Pediatric anesthesia is not "small adult anesthesia" — the physiology differs
 * fundamentally across neonates (<1 month), infants (1-12 months), toddlers (1-3 years),
 * children (3-12 years), and adolescents (12-18 years). Key differences relevant to
 * intraoperative management are modeled here.
 *
 * === MAC CORRECTION BY AGE ===
 * MAC values peak in infancy (1-6 months) and decline with age toward adult values.
 * Using adult MAC values for pediatric patients DANGEROUSLY UNDERESTIMATES anesthetic depth:
 *
 * Sevoflurane MAC by age (Lerman BA, Anesthesiology 1994; Targ AG, Anesthesiology 1989):
 *   Neonate (< 1 month):    MAC = 3.3%  (factor 1.65× adult 2.0%)
 *   Infant 1-6 months:      MAC = 3.2%  (factor 1.60×)
 *   Infant 6-12 months:     MAC = 2.8%  (factor 1.40×)
 *   Child 1-3 years:        MAC = 2.5%  (factor 1.25×)
 *   Child 3-6 years:        MAC = 2.4%  (factor 1.20×)
 *   Child 6-12 years:       MAC = 2.1%  (factor 1.05×)
 *   Adolescent >12 years:   MAC = 2.0%  (adult value, factor 1.0×)
 *
 * Isoflurane MAC (Nicolson SC, Anesth Analg 1993):
 *   Infant 0-1 months:  MAC = 1.6%  (factor 1.33× adult 1.2%)
 *   Infant 1-6 months:  MAC = 1.87% (factor 1.56×)
 *   Child 6-24 months:  MAC = 1.4%  (factor 1.17×)
 *   >12 years:          MAC = 1.2%  (adult)
 *
 * === PEDIATRIC VITAL SIGN NORMS ===
 * Normal ranges differ substantially from adults (Gregory GA, Pediatric Anesthesia, 5th ed):
 *
 * Heart Rate (bpm):
 *   Neonate/Infant 0-1y: 100-160 (target ~130)
 *   Toddler 1-3y:         80-130 (target ~110)
 *   Child 3-6y:           75-120 (target ~100)
 *   Child 6-12y:          70-110 (target ~90)
 *   Adolescent 12-18y:    60-100 (target ~80, adult range)
 *
 * Blood Pressure (MAP, mmHg):
 *   Neonate:  Systolic 60-90,  MAP ~45-60
 *   Infant:   Systolic 70-100, MAP ~50-65
 *   Toddler:  Systolic 80-110, MAP ~55-70
 *   Child:    Systolic 85-115, MAP ~60-75
 *   Adolescent: adult range (MAP 70-100)
 *
 * Respiratory Rate (bpm):
 *   Neonate/Infant 0-1y: 30-60 (target ~40)
 *   Toddler 1-3y:         24-40 (target ~30)
 *   Child 3-6y:           22-34 (target ~26)
 *   Child 6-12y:          18-30 (target ~22)
 *   Adolescent:           12-20 (adult)
 *
 * === PATENT FORAMEN OVALE / TRANSITIONAL CIRCULATION ===
 * At birth: ductus arteriosus closes (functional ~hours, anatomical ~weeks), foramen ovale
 * closes functionally immediately (but only anatomically in ~80% by age 1 year).
 * Hypoxia in neonates/infants → increased PVR → right-to-left shunting through PFO →
 * paradoxical hypoxemia that doesn't respond to O2 (bypasses pulmonary circulation entirely).
 * Risk period: neonates and infants < 3 months particularly vulnerable.
 *
 * === HEPATIC DRUG METABOLISM IMMATURITY ===
 * CYP3A4 (major drug metabolizing enzyme): ~10% of adult activity at birth, adult levels by ~6-12 months.
 * Result: drugs metabolized by CYP3A4 (fentanyl, midazolam, alfentanil, most volatiles' metabolites)
 * have prolonged half-lives in neonates. Clinical implication: use LOWER DOSES and LONGER INTERVALS
 * for neonates. After 6-12 months, metabolism can exceed adult rates (higher relative liver mass).
 *
 * === RAPID DESATURATION / FAST OXYGEN CONSUMPTION ===
 * Oxygen consumption in neonates: ~6-7 mL/kg/min (vs ~3 mL/kg/min in adults).
 * Combined with lower absolute FRC (fewer oxygen reserves), neonates desaturate from SpO2 100%
 * to < 80% in as little as 20-30 seconds of apnea (vs 2-3 minutes in pre-oxygenated adults).
 * Pre-oxygenation more critical and effective denitrogenation is faster.
 *
 * === TEMPERATURE INSTABILITY ===
 * Neonates have a large BSA:weight ratio and minimal subcutaneous insulation → rapid heat loss.
 * Shivering thermogenesis is limited; rely on non-shivering thermogenesis (brown adipose tissue).
 * Hypothermia develops in minutes in a cold OR without active warming.
 *
 * Sources: Miller's 9th Ed Ch 77-80 (Pediatric Anesthesia); Gregory GA (ed), Pediatric
 * Anesthesia 5th Ed; Lerman BA, Anesthesiology 1994; Motoyama EK, Smith CA (eds).
 */

export interface PediatricInputs {
  ageYears?: number;        // patient age in years (fractions: 0.083 = 1 month, 0.5 = 6 months)
  weightKg?: number;
  currentAgent?: string;    // 'sevoflurane', 'isoflurane', 'desflurane', 'halothane', 'xenon'
  currentHR?: number;       // for HR alarm computation
  currentMAP?: number;      // for BP alarm computation
  currentSpo2?: number;
  isApneic?: boolean;
  oxygenBufferNormalized?: number; // 0-1 (RespiratoryEngine's oxygenBuffer for FRC)
  hasPFO?: boolean;         // explicit PFO flag (if not set, estimated from age)
  currentPvr?: number;      // relative PVR (1.0 = normal); elevated in hypoxic newborns
  prevPediatricBradycardiaLogged?: boolean;
}

export interface PediatricOutput {
  isPediatric: boolean;
  isNeonate: boolean;       // < 1 month
  isInfant: boolean;        // 1-12 months
  isChild: boolean;         // 1-12 years
  isAdolescent: boolean;    // 12-18 years
  ageMacMultiplier: number; // multiply agent's adult MAC by this to get age-corrected MAC
  pediatricHRTarget: number;    // age-appropriate HR target (bpm)
  pediatricMAPFloor: number;    // minimum acceptable MAP (mmHg)
  pediatricRRTarget: number;    // age-appropriate RR target (bpm)
  hrAlarmLow: number;           // absolute HR alarm thresholds
  hrAlarmHigh: number;
  mapAlarmLow: number;
  hepaticMaturityFactor: number;  // 0.1-1.0 (scales CYP3A4-dependent drug clearance)
  pfoShuntRisk: number;           // 0-1: risk of R-to-L shunting through PFO (↑ with PVR)
  pfoShuntContribution: number;   // additive to RespiratoryEngine actualShunt (0-0.30)
  apneaDesaturationRateFactor: number; // multiply by this for faster SpO2 drop (2-5× adult)
  bsaToWeightRatio: number;       // higher = more temperature instability
  thermalInstabilityBonus: number;  // additional °C/min heat loss rate
  metabolicRatePerKg: number;       // mL O2/kg/min (neonates ~6-7 vs adult ~3.5)
  prevPediatricBradycardiaLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Age-appropriate sevoflurane MAC multiplier (relative to adult MAC = 2.0%)
// Used to correct ET-concentration → MAC-equivalent for depth-of-anesthesia computation
function sevoMacMultiplier(ageYears: number): number {
  if (ageYears < 1/12)          return 1.65;   // neonate (<1 month)
  if (ageYears < 6/12)          return 1.60;   // infant 1-6 months
  if (ageYears < 1.0)           return 1.40;   // infant 6-12 months
  if (ageYears < 3.0)           return 1.25;   // toddler 1-3 years
  if (ageYears < 6.0)           return 1.20;   // child 3-6 years
  if (ageYears < 12.0)          return 1.05;   // child 6-12 years
  return 1.0;                                   // adolescent/adult
}

// Isoflurane MAC multiplier (relative to adult MAC = 1.2%)
function isoMacMultiplier(ageYears: number): number {
  if (ageYears < 1/12)  return 1.33;
  if (ageYears < 6/12)  return 1.56;
  if (ageYears < 2.0)   return 1.17;
  if (ageYears < 12.0)  return 1.05;
  return 1.0;
}

// Desflurane MAC multiplier (relative to adult MAC = 6.0%)
function desMacMultiplier(ageYears: number): number {
  if (ageYears < 1/12)  return 1.37;  // ~8.2% in neonates
  if (ageYears < 6/12)  return 1.40;  // ~8.4% peak in infants
  if (ageYears < 1.0)   return 1.30;
  if (ageYears < 3.0)   return 1.15;
  if (ageYears < 12.0)  return 1.05;
  return 1.0;
}

export class PediatricPhysiologyEngine {
  static tick(inputs: PediatricInputs = {}): PediatricOutput {
    const events: string[] = [];
    const ageYears = clamp(safeNumber(inputs.ageYears, 30), 0, 120);
    const weightKg = clamp(safeNumber(inputs.weightKg, 70), 0.5, 200);
    const agent = inputs.currentAgent?.toLowerCase() ?? '';
    const pvrRelative = clamp(safeNumber(inputs.currentPvr, 1.0), 0.5, 5.0);

    // Age classification
    const isPediatric = ageYears < 18;
    const isNeonate = ageYears < 1 / 12;          // < 1 month
    const isInfant = ageYears >= 1 / 12 && ageYears < 1.0;
    const isChild = ageYears >= 1.0 && ageYears < 12.0;
    const isAdolescent = ageYears >= 12.0 && ageYears < 18.0;

    if (!isPediatric) {
      return {
        isPediatric: false, isNeonate: false, isInfant: false, isChild: false, isAdolescent: false,
        ageMacMultiplier: 1.0, pediatricHRTarget: 75, pediatricMAPFloor: 65, pediatricRRTarget: 14,
        hrAlarmLow: 50, hrAlarmHigh: 120, mapAlarmLow: 65,
        hepaticMaturityFactor: 1.0, pfoShuntRisk: 0, pfoShuntContribution: 0,
        apneaDesaturationRateFactor: 1.0, bsaToWeightRatio: 0.025,
        thermalInstabilityBonus: 0, metabolicRatePerKg: 3.5,
        prevPediatricBradycardiaLogged: false, // L5/F6: was omitted from the non-pediatric early return (required by PediatricOutput)
        events,
      };
    }

    // ===========================
    // MAC CORRECTION
    // ===========================
    let ageMacMultiplier = 1.0;
    if (agent.includes('sevo'))       ageMacMultiplier = sevoMacMultiplier(ageYears);
    else if (agent.includes('iso'))   ageMacMultiplier = isoMacMultiplier(ageYears);
    else if (agent.includes('des'))   ageMacMultiplier = desMacMultiplier(ageYears);
    else if (agent.includes('halo'))  ageMacMultiplier = sevoMacMultiplier(ageYears) * 0.9; // similar profile
    // N2O and xenon MAC don't vary significantly with age in the clinical range

    // ===========================
    // PEDIATRIC VITAL SIGN TARGETS
    // ===========================
    let pediatricHRTarget: number;
    let hrAlarmLow: number;
    let hrAlarmHigh: number;
    let pediatricMAPFloor: number;
    let mapAlarmLow: number;
    let pediatricRRTarget: number;

    if (isNeonate) {
      pediatricHRTarget = 130; hrAlarmLow = 80; hrAlarmHigh = 180;
      pediatricMAPFloor = 45;  mapAlarmLow = 35;
      pediatricRRTarget = 40;
    } else if (isInfant) {
      pediatricHRTarget = 120; hrAlarmLow = 70; hrAlarmHigh = 170;
      pediatricMAPFloor = 50;  mapAlarmLow = 40;
      pediatricRRTarget = 34;
    } else if (ageYears < 3.0) { // toddler
      pediatricHRTarget = 105; hrAlarmLow = 65; hrAlarmHigh = 155;
      pediatricMAPFloor = 55;  mapAlarmLow = 45;
      pediatricRRTarget = 28;
    } else if (ageYears < 6.0) { // preschool
      pediatricHRTarget = 95; hrAlarmLow = 60; hrAlarmHigh = 140;
      pediatricMAPFloor = 58;  mapAlarmLow = 48;
      pediatricRRTarget = 24;
    } else if (isChild) { // school-age
      pediatricHRTarget = 85; hrAlarmLow = 55; hrAlarmHigh = 130;
      pediatricMAPFloor = 62;  mapAlarmLow = 52;
      pediatricRRTarget = 20;
    } else { // adolescent
      pediatricHRTarget = 78; hrAlarmLow = 50; hrAlarmHigh = 120;
      pediatricMAPFloor = 65;  mapAlarmLow = 55;
      pediatricRRTarget = 16;
    }

    // ===========================
    // HEPATIC DRUG METABOLISM MATURITY
    // ===========================
    // CYP3A4 activity: ~10% at birth, reaches adult by 6-12 months.
    // After 1 year, metabolism per unit liver mass can EXCEED adult (higher relative liver mass).
    let hepaticMaturityFactor: number;
    if (ageYears < 1 / 12) {         hepaticMaturityFactor = 0.10; }
    else if (ageYears < 3 / 12) {    hepaticMaturityFactor = 0.25; }
    else if (ageYears < 6 / 12) {    hepaticMaturityFactor = 0.50; }
    else if (ageYears < 12 / 12) {   hepaticMaturityFactor = 0.80; }
    else if (ageYears < 3.0) {       hepaticMaturityFactor = 1.20; } // higher per-kg than adults
    else if (ageYears < 6.0) {       hepaticMaturityFactor = 1.10; }
    else if (ageYears < 12.0) {      hepaticMaturityFactor = 1.05; }
    else {                            hepaticMaturityFactor = 1.00; }

    // ===========================
    // PFO / TRANSITIONAL CIRCULATION
    // ===========================
    // PFO present in ~80% of neonates at birth; closed in ~80% by 12 months.
    // Estimated persistence: 1.0 at birth → 0.2 at 1 year (linear approximation)
    const estimatedPfoPresence = inputs.hasPFO ?? (isNeonate ? 1.0 : isInfant ? Math.max(0, 1.0 - ageYears / 1.0) * 0.8 : 0.05);

    // R-to-L shunting through PFO: occurs when PVR exceeds SVR (normal in utero, pathologic postnatal)
    // In neonates: hypoxia → PVR rise → PFO opens → profound hypoxia unresponsive to O2
    const pvrThreshold = 1.8; // PVR ratio at which PFO R-to-L flow starts
    const pfoShuntRisk = estimatedPfoPresence > 0.1 && pvrRelative > pvrThreshold
      ? clamp(estimatedPfoPresence * (pvrRelative - pvrThreshold) / 2.0, 0, 0.8)
      : 0;
    const pfoShuntContribution = pfoShuntRisk * 0.30; // up to 30% additional shunt at full PFO R-to-L

    // ===========================
    // APNEA DESATURATION RATE
    // ===========================
    // Neonates/infants have lower O2 reserves (lower FRC:VO2 ratio) → faster desaturation.
    // Factor of how much faster they desaturate vs a pre-oxygenated adult (nominally 1.0).
    const apneaDesaturationRateFactor =
      isNeonate ? 5.0 :
      isInfant ? 4.0 :
      ageYears < 3.0 ? 3.0 :
      ageYears < 6.0 ? 2.5 :
      isChild ? 2.0 :
      1.5; // adolescent still faster than adult

    // ===========================
    // TEMPERATURE STABILITY
    // ===========================
    // BSA (m²) estimated by Mosteller formula: √(height × weight / 3600)
    // BSA:weight ratio (m²/kg): higher = more heat loss per kg
    const heightCm = Math.pow(weightKg * 3600, 0.5) / 1.0; // rough IBW-like estimate
    const bsa = Math.sqrt((heightCm * weightKg) / 3600);
    const bsaToWeightRatio = bsa / weightKg;
    // Adult: ~0.025 m²/kg; Neonate: ~0.067 m²/kg
    const thermalInstabilityBonus = Math.max(0, (bsaToWeightRatio - 0.025) * 10); // extra °C/min heat loss

    // ===========================
    // METABOLIC RATE
    // ===========================
    // O2 consumption per kg: decreases with age
    const metabolicRatePerKg =
      isNeonate ? 6.5 :
      isInfant ? 6.0 :
      ageYears < 3.0 ? 5.0 :
      ageYears < 6.0 ? 4.5 :
      isChild ? 4.0 :
      3.5; // ml O2/kg/min

    // ===========================
    // CRITICAL BRADYCARDIA IN PEDIATRICS
    // ===========================
    const currentHR = safeNumber(inputs.currentHR, pediatricHRTarget);
    let prevPediatricBradycardiaLogged = !!inputs.prevPediatricBradycardiaLogged;
    if (isNeonate || isInfant) {
      if (currentHR < 80 && currentHR > 0) {
        if (!prevPediatricBradycardiaLogged) {
          events.push(
            `🚨 PEDIATRIC BRADYCARDIA: HR ${currentHR} bpm in ${isNeonate ? 'neonate' : 'infant'}. Pediatric cardiac output is HR-DEPENDENT (fixed small stroke volume) → bradycardia = critically low CO. TREATMENT: Atropine 0.02 mg/kg IV (minimum 0.1 mg, max 0.5 mg). Suck out secretions (vagal response to suction). Check: hypoxia, deep volatile, opioid excess, laryngospasm, RSI without atropine pre-treatment.`,
          );
          prevPediatricBradycardiaLogged = true;
        }
      } else {
        prevPediatricBradycardiaLogged = false;
      }
    } else {
      prevPediatricBradycardiaLogged = false;
    }

    return {
      isPediatric,
      isNeonate,
      isInfant,
      isChild,
      isAdolescent,
      ageMacMultiplier,
      pediatricHRTarget,
      pediatricMAPFloor,
      pediatricRRTarget,
      hrAlarmLow,
      hrAlarmHigh,
      mapAlarmLow,
      hepaticMaturityFactor,
      pfoShuntRisk: parseFloat(pfoShuntRisk.toFixed(4)),
      pfoShuntContribution: parseFloat(pfoShuntContribution.toFixed(4)),
      apneaDesaturationRateFactor,
      bsaToWeightRatio: parseFloat(bsaToWeightRatio.toFixed(4)),
      thermalInstabilityBonus: parseFloat(thermalInstabilityBonus.toFixed(3)),
      metabolicRatePerKg,
      prevPediatricBradycardiaLogged,
      events,
    };
  }
}
