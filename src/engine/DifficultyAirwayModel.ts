/**
 * Difficult Airway Assessment and Management Model
 *
 * Difficult airway management is the single most important clinical skill in anesthesia.
 * Unanticipated difficult intubation occurs in ~1-2% of cases; failed intubation in ~0.2%.
 * Cannot Intubate Cannot Oxygenate (CICO) occurs in ~1:50,000 cases but is the primary
 * cause of anesthesia-related death and brain damage.
 *
 * =========================================================================
 * PART A: PRE-INTUBATION ASSESSMENT
 * =========================================================================
 *
 * === LEMON ASSESSMENT ===
 * A validated bedside prediction tool (Reed MJ, Emerg Med J 2005):
 * L — LOOK externally: facial trauma, obesity, beard, teeth, small mouth
 * E — EVALUATE 3-3-2 rule:
 *       3 fingers fit between incisors (mouth opening)
 *       3 fingers fit between hyoid and chin (submandibular space)
 *       2 fingers between thyroid notch and floor of mouth (larynx position)
 * M — MALLAMPATI classification (Class I-IV)
 * O — OBSTRUCTION: stridor, tonsillar hypertrophy, hematoma, epiglottitis
 * N — NECK MOBILITY: cervical spine disease, collar, halo fixator, obesity
 *
 * === MALLAMPATI CLASSIFICATION ===
 * Class I: Full soft palate, fauces, uvula, anterior/posterior pillars visible
 * Class II: Soft palate, fauces, uvula visible
 * Class III: Soft palate, base of uvula visible
 * Class IV: Soft palate NOT visible
 * Sensitivity 42%, specificity 87% for difficult intubation (Naguib M 2006)
 *
 * === CORMACK-LEHANE GRADE ===
 * Grade I: Full glottis visible
 * Grade II: Only posterior commissure/arytenoids visible (partial)
 * Grade IIb: Only arytenoids visible (no vocal cords seen)
 * Grade III: Only epiglottis visible (no glottis)
 * Grade IV: Not even epiglottis visible
 * Difficult intubation defined as Grade III/IV on direct laryngoscopy
 *
 * =========================================================================
 * PART B: FAILED INTUBATION MANAGEMENT (ASA ALGORITHM 2022)
 * =========================================================================
 *
 * PLAN A: Direct/Video Laryngoscopy
 *   - DL blade (Macintosh/Miller) ± bougie
 *   - Video laryngoscopy (better grade in >90% of cases where DL was III/IV)
 *   - External laryngeal manipulation (BURP: backward, upward, rightward pressure)
 *   - Limit to 3 (some say 2) attempts — MORE attempts increase complication risk
 *
 * PLAN B: Supraglottic Airway (SGA) Rescue
 *   - iGel, LMA Supreme, LMA ProSeal (provide better seal than Classic LMA)
 *   - Can place with epiglottis displaced, minimal mouth opening
 *   - Then: wakeup patient (if possible) or use SGA as conduit for fiberoptic intubation
 *
 * PLAN C: Wakeup and Postpone (if patient still apneic but oxygenating via SGA)
 *   - Maintain oxygenation, allow patient to wake up
 *   - Awake fiberoptic or awake video laryngoscopy as definitive management
 *
 * PLAN D: CICO — Emergency Front of Neck Access (FONA)
 *   "Can't Intubate, Can't Oxygenate" — scalpel-bougie-tube cricothyroidotomy
 *   TECHNIQUE (DAS 2015 guidelines, scalpel over cannula preferred):
 *     1. Scalpel vertical incision through skin
 *     2. Transverse incision through cricothyroid membrane
 *     3. Bougie through incision
 *     4. 6.0 ETT over bougie into trachea
 *   Time to oxygenation: trained practitioners ~30-60 seconds
 *   NEVER attempt jet ventilation as first CICO technique (high complication rate)
 *
 * === CANNOT INTUBATE CANNOT OXYGENATE (CICO) ===
 * Definition: SpO2 falling despite maximum BMV/SGA attempts with bag-valve
 * Time window: at SpO2 85-90%, brain injury begins; at SpO2 80%, cardiac arrest follows
 * Recognition is the KEY — delay in declaring CICO = death
 * Management: scalpel cricothyroidotomy (the ONLY intervention with sufficient evidence)
 *
 * Sources: DAS (Difficult Airway Society) Guidelines 2015; ASA Difficult Airway Algorithm 2022;
 * Frerk C, Anaesthesia 2015; Miller's 9th Ed Ch 55 (Airway Management).
 */

export interface DifficultyAirwayInputs {
  // Pre-intubation assessment
  mallampati?: 1 | 2 | 3 | 4;
  mouthOpeningCm?: number;         // normal ≥ 4 cm
  submandibularDistanceCm?: number; // 3-finger test (normal ≥ 6 cm)
  thyroMentalDistanceCm?: number;  // normal ≥ 7 cm
  neckMobility?: 'normal' | 'limited' | 'fixed';
  hasObstruction?: boolean;        // stridor, epiglottitis, hematoma
  isObese?: boolean;
  hasFacialTrauma?: boolean;
  hasCervicalSpineInjury?: boolean;
  isPregnant?: boolean;            // reduced mouth opening + airway edema

  // Intraoperative status
  intubationAttemptsMade?: number;
  cormackLehaneGrade?: 1 | 2 | 3 | 4;
  airwaySecured?: boolean;
  sgaInPlace?: boolean;            // supraglottic airway placed as rescue
  sgaVentilating?: boolean;        // SGA providing adequate ventilation
  currentSpO2?: number;
  apneaDurationSeconds?: number;

  // Laryngoscopy aids used
  videolaryngoscopyUsed?: boolean;
  bougieTried?: boolean;
  burpApplied?: boolean;

  // CICO
  cicoActive?: boolean;            // declared CICO (cannot intubate AND cannot oxygenate)
  cricothyroidotomyDone?: boolean; // front-of-neck access performed

  // Event guards
  prevDifficultyLogged?: boolean;
  prevFailedLogged?: boolean;
  prevCICOLogged?: boolean;
}

export interface DifficultyAirwayOutput {
  // Risk scores
  lemonScore: number;              // 0-10 (each letter = 0, 1, or 2 points)
  predictedDifficultyIndex: number; // 0-1
  predictedCormackLehane: 1 | 2 | 3 | 4; // most likely laryngoscopy grade

  // Management status
  airwayStrategy: 'routine' | 'modified' | 'video_first' | 'awake_intubation' | 'cico_prepare';
  maxSafeApneaSeconds: number;     // seconds before SpO2 reaches critical level

  // CICO
  cicoRisk: number;               // 0-1 ongoing CICO risk
  recommendCricothyroidotomy: boolean;
  cricothyroidotomyEfficacy: number; // 0-1 if performed

  prevDifficultyLogged: boolean;
  prevFailedLogged: boolean;
  prevCICOLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class DifficultyAirwayModel {
  static tick(inputs: DifficultyAirwayInputs = {}): DifficultyAirwayOutput {
    const events: string[] = [];
    let prevDifficultyLogged = !!inputs.prevDifficultyLogged;
    let prevFailedLogged = !!inputs.prevFailedLogged;
    let prevCICOLogged = !!inputs.prevCICOLogged;

    const mallampati = safeNumber(inputs.mallampati, 2) as 1 | 2 | 3 | 4;
    const mouthCm = clamp(safeNumber(inputs.mouthOpeningCm, 5), 0, 8);
    const subManCm = clamp(safeNumber(inputs.submandibularDistanceCm, 7), 0, 10);
    const thyroMentalCm = clamp(safeNumber(inputs.thyroMentalDistanceCm, 8), 0, 14);
    const neckMobility = inputs.neckMobility || 'normal';
    const hasObstruction = !!inputs.hasObstruction;
    const isObese = !!inputs.isObese;
    const isPregnant = !!inputs.isPregnant;
    const hasFacialTrauma = !!inputs.hasFacialTrauma;
    const hasCervicalSpine = !!inputs.hasCervicalSpineInjury;

    const intubAttempts = clamp(safeNumber(inputs.intubationAttemptsMade, 0), 0, 10);
    const clGrade = safeNumber(inputs.cormackLehaneGrade, 1) as 1 | 2 | 3 | 4;
    const airwaySecured = !!inputs.airwaySecured;
    const sgaInPlace = !!inputs.sgaInPlace;
    const sgaVentilating = !!inputs.sgaVentilating;
    const currentSpO2 = clamp(safeNumber(inputs.currentSpO2, 99), 50, 100);
    const apneaSec = clamp(safeNumber(inputs.apneaDurationSeconds, 0), 0, 3600);

    const videoUsed = !!inputs.videolaryngoscopyUsed;
    const bougieTried = !!inputs.bougieTried;
    const burpApplied = !!inputs.burpApplied;

    const cicoActive = !!inputs.cicoActive;
    const cricothyroidotomyDone = !!inputs.cricothyroidotomyDone;

    // ===========================
    // LEMON SCORE CALCULATION
    // ===========================
    let lemonScore = 0;

    // L — External look (0-2)
    let lScore = 0;
    if (isObese) lScore++;
    if (hasFacialTrauma) lScore++;
    lScore = Math.min(2, lScore);

    // E — 3-3-2 evaluation (0-2)
    let eScore = 0;
    if (mouthCm < 4) eScore++;
    if (subManCm < 6) eScore++;
    if (thyroMentalCm < 7) eScore++;
    eScore = Math.min(2, eScore);

    // M — Mallampati (0-2)
    const mScore = mallampati >= 3 ? mallampati - 2 : 0; // 0 for MP1/2, 1 for MP3, 2 for MP4

    // O — Obstruction (0-1)
    const oScore = hasObstruction ? 1 : 0;

    // N — Neck mobility (0-1)
    let nScore = 0;
    if (neckMobility === 'limited') nScore = 1;
    else if (neckMobility === 'fixed') nScore = 2;
    nScore = Math.min(2, nScore + (hasCervicalSpine ? 1 : 0) + (isPregnant ? 1 : 0));
    nScore = Math.min(2, nScore);

    lemonScore = clamp(lScore + eScore + mScore + oScore + nScore, 0, 10);

    // Predicted difficulty index (0-1)
    const predictedDifficultyIndex = clamp(lemonScore / 10, 0, 1.0);

    // Predicted Cormack-Lehane grade
    let predictedCormackLehane: 1 | 2 | 3 | 4;
    if (lemonScore <= 2) predictedCormackLehane = 1;
    else if (lemonScore <= 4) predictedCormackLehane = 2;
    else if (lemonScore <= 6) predictedCormackLehane = 3;
    else predictedCormackLehane = 4;

    // ===========================
    // AIRWAY MANAGEMENT STRATEGY
    // ===========================
    let airwayStrategy: 'routine' | 'modified' | 'video_first' | 'awake_intubation' | 'cico_prepare';

    if (hasObstruction || mallampati === 4 || (mallampati === 3 && (mouthCm < 3 || neckMobility === 'fixed'))) {
      airwayStrategy = 'awake_intubation';
    } else if (mallampati >= 3 || lemonScore >= 5 || isPregnant || hasFacialTrauma) {
      airwayStrategy = 'video_first';
    } else if (lemonScore >= 3 || neckMobility === 'limited' || isObese) {
      airwayStrategy = 'modified';
    } else {
      airwayStrategy = 'routine';
    }

    // Override for active emergency
    if (cicoActive) airwayStrategy = 'cico_prepare';

    // ===========================
    // MAXIMUM SAFE APNEA TIME
    // ===========================
    // Time from apnea start to SpO2 < 90% (assumes adequate pre-oxygenation)
    // Normal adult: ~8-10 min; obese: ~3-4 min; pediatric: ~1-2 min
    let maxSafeApneaSeconds = 480; // 8 min normal
    if (isObese) maxSafeApneaSeconds = Math.min(maxSafeApneaSeconds, 240); // 4 min
    if (isPregnant) maxSafeApneaSeconds = Math.min(maxSafeApneaSeconds, 300); // 5 min
    if (hasObstruction) maxSafeApneaSeconds = Math.min(maxSafeApneaSeconds, 120); // 2 min

    // ===========================
    // CICO ASSESSMENT
    // ===========================
    const cannotIntubate = (intubAttempts >= 3 && !airwaySecured) || clGrade >= 3;
    const cannotOxygenate = currentSpO2 < 90 && !sgaVentilating;
    const cicoRisk = (cannotIntubate && cannotOxygenate) || cicoActive ? 1.0
      : cannotIntubate ? 0.5
      : 0;

    const recommendCricothyroidotomy = cicoActive || (cicoRisk > 0.9 && !airwaySecured && !sgaVentilating);

    const cricothyroidotomyEfficacy = cricothyroidotomyDone
      ? 0.90 // high success rate if trained practitioner
      : 0;

    // ===========================
    // EVENTS
    // ===========================
    if (predictedDifficultyIndex > 0.4 && !prevDifficultyLogged) {
      const strategyText = {
        routine: 'Standard direct laryngoscopy approach reasonable',
        modified: 'Modified approach: video laryngoscopy as backup, bougie readily available, extra resources',
        video_first: 'VIDEO LARYNGOSCOPY AS FIRST CHOICE (predictive risk score ≥ 5)',
        awake_intubation: 'AWAKE INTUBATION STRONGLY RECOMMENDED (high risk of lost airway)',
        cico_prepare: 'CICO TEAM AND FRONT-OF-NECK ACCESS PREPARED',
      }[airwayStrategy];

      events.push(
        `⚠️ PREDICTED DIFFICULT AIRWAY: LEMON score ${lemonScore}/10. ${strategyText}. Risk factors: MP ${mallampati}${mouthCm < 4 ? ', limited mouth opening' : ''}${neckMobility !== 'normal' ? `, ${neckMobility} neck mobility` : ''}${hasObstruction ? ', airway obstruction' : ''}${isObese ? ', obesity' : ''}${isPregnant ? ', pregnancy' : ''}. Pre-oxygenation target: SpO2 100%, EtO2 > 90%. Pre-prepare: video laryngoscope (King Vision/GlideScope), size 3 iGEL, bougie, surgical airway kit at bedside.`,
      );
      prevDifficultyLogged = true;
    }

    if (cannotIntubate && intubAttempts >= 3 && !airwaySecured && !prevFailedLogged) {
      events.push(
        `🚨 FAILED INTUBATION (${intubAttempts} attempts): STOP — no more laryngoscopy attempts. PROGRESS THROUGH DAS/ASA ALGORITHM: → PLAN B: Insert iGEL or LMA Supreme immediately. If oxygenating via SGA: → PLAN C: Maintain SpO2, allow emergence/wake-up, plan awake intubation (fiberoptic or video). If NOT oxygenating via SGA: → PLAN D: FRONT OF NECK ACCESS NOW. Declare CICO. Scalpel cricothyroidotomy — DO NOT DELAY. Multiple failed attempts increase soft tissue swelling, making subsequent attempts harder and increasing CICO risk.`,
      );
      prevFailedLogged = true;
    }

    if (recommendCricothyroidotomy && !cricothyroidotomyDone && !prevCICOLogged) {
      events.push(
        `🚨🚨 CICO — CANNOT INTUBATE CANNOT OXYGENATE: EMERGENCY FRONT OF NECK ACCESS REQUIRED. SCALPEL CRICOTHYROIDOTOMY (DAS 2015 technique): (1) EXTEND neck; (2) Palpate cricothyroid membrane (CTM) between thyroid and cricoid cartilage; (3) BOLD horizontal stab incision through CTM; (4) HOOK trachea downward with left index finger; (5) BOUGIE through incision into trachea; (6) 6.0 ETT over bougie; (7) INFLATE cuff and ventilate. Do NOT attempt cannula/jet ventilation first (high failure rate in CICO). Time to oxygenation: < 60 seconds for trained practitioner. Brain injury begins at SpO2 < 85% (now ${currentSpO2}%). EVERY SECOND COUNTS.`,
      );
      prevCICOLogged = true;
    }

    return {
      lemonScore,
      predictedDifficultyIndex: parseFloat(predictedDifficultyIndex.toFixed(4)),
      predictedCormackLehane,
      airwayStrategy,
      maxSafeApneaSeconds,
      cicoRisk: parseFloat(cicoRisk.toFixed(4)),
      recommendCricothyroidotomy,
      cricothyroidotomyEfficacy: parseFloat(cricothyroidotomyEfficacy.toFixed(4)),
      prevDifficultyLogged,
      prevFailedLogged,
      prevCICOLogged,
      events,
    };
  }
}
