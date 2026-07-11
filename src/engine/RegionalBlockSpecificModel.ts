/**
 * Specific Regional Anesthesia Block Types and Complications Model
 *
 * The existing NerveConductionBlockModel.ts and NeuraxialPKModel.ts cover the general
 * physics of regional anesthesia (differential block, baricity, dermatomal spread).
 * This model adds SPECIFIC NAMED BLOCKS with their coverage territories, technique-specific
 * complications, and clinical considerations.
 *
 * =========================================================================
 * KEY PERIPHERAL NERVE BLOCKS
 * =========================================================================
 *
 * UPPER EXTREMITY:
 *
 * INTERSCALENE (ISB): C5-C6 ± C7 (shoulder, upper arm)
 *   - Complications: 100% ipsilateral phrenic palsy (already in ISBModel),
 *     Horner's syndrome (ptosis/miosis/anhidrosis) ~25%,
 *     recurrent laryngeal nerve block (hoarseness) ~12%,
 *     vertebral artery injection (most feared — convulsions, brainstem anesthesia)
 *   - Contraindications: contralateral phrenic palsy, severe COPD (FEV1 < 50%)
 *
 * SUPRACLAVICULAR (SCB): C5-T1 (entire arm below shoulder)
 *   - Most complete brachial plexus block for arm surgery
 *   - Complications: pneumothorax (1-2% traditional, <0.5% US-guided),
 *     phrenic palsy (50%), Horner's (30%)
 *
 * AXILLARY: Musculocutaneous + radial + median + ulnar (elbow/forearm/hand)
 *   - No phrenic/Horner's risk (far from phrenic nerve origin)
 *   - Most common failure: musculocutaneous nerve (requires separate block)
 *
 * LOWER EXTREMITY:
 *
 * FEMORAL NERVE BLOCK (FNB): Anterior thigh, medial knee
 *   - Most common block for total knee arthroplasty (TKA)
 *   - Limitation: does NOT cover posterior knee (sciatic needed for complete TKA)
 *   - Motor block: quadriceps → fall risk (10% increased fall rate in early ambulation)
 *   - Adductor canal block: motor-sparing alternative for TKA (preserves quad strength)
 *
 * SCIATIC NERVE BLOCK:
 *   - Via popliteal fossa approach: below knee, ankle/foot surgery
 *   - Subgluteal approach: entire lower leg including posterior knee
 *   - Duration: 12-24h with long-acting LA; 24-36h with dexamethasone additive
 *
 * TRUNK BLOCKS (relatively new, ultrasound-guided):
 *
 * TAP (TRANSVERSUS ABDOMINIS PLANE) BLOCK:
 *   - Anterior abdominal wall (T10-L1 dermatomes)
 *   - Reduces opioid use by 40% for laparoscopy, hernia, cesarean section
 *   - Bilateral technique for midline incisions
 *   - Short duration (6-12h); does NOT cover visceral pain
 *
 * PECS I/II BLOCK:
 *   - PECS I: Pectoralis major/minor plane; blocks medial/lateral pectoral nerves
 *   - PECS II (modified): additional serratus plane block → lateral intercostals
 *   - Application: mastectomy, breast augmentation
 *
 * ERECTOR SPINAE PLANE (ESP) BLOCK:
 *   - Posterior approach; LA spreads into paravertebral space
 *   - Blocks dorsal + ventral rami → multilevel analgesia
 *   - Applications: thoracotomy, rib fractures, spine surgery
 *   - Advantages: farther from pleura than paravertebral (lower pneumothorax risk)
 *
 * =========================================================================
 * DEXAMETHASONE AS LOCAL ANESTHETIC ADJUVANT
 * =========================================================================
 * When added TO THE BLOCK (perineural, not systemic):
 *   - Extends duration by 50-100% (4-8h additional for bupivacaine blocks)
 *   - Mechanism: local vasoconstriction + Na-channel effect (alpha-2 agonism)
 *   - Dose: 4-8 mg perineural dexamethasone
 *   - EVIDENCE: Multiple RCTs show benefit; meta-analysis (Pehora 2017) confirms.
 *   - Systemic dexamethasone (8 mg IV) also extends block by ~6h (possible endocrine mechanism)
 *
 * Sources: Fredrickson MJ, Br J Anaesth 2010 (ISB); Liu SS, Anesthesiology 2010 (peripheral blocks);
 * Pehora C, Cochrane Database 2017 (dexamethasone adjuvant); Miller's 9th Ed Ch 52-53.
 */

export interface RegionalBlockInputs {
  // Block type
  blockType?: string;  // 'interscalene' | 'supraclavicular' | 'axillary' | 'femoral' | 'sciatic_popliteal' | 'tap' | 'pecs' | 'esp' | 'adductor_canal'

  // LA parameters
  localAnestheticCe?: number;
  dexamethasonePeriNeural?: number; // mg perineural dexamethasone
  systemicDexaCe?: number;          // systemic dex (also extends block)

  // Current status
  blockMinutesSince?: number;       // minutes since block placed
  blockQuality?: number;            // 0-1 user-assessed block quality

  // Complications
  pneumothoraxFromBlock?: boolean;
  intravascularInjectionFromBlock?: boolean;
  nerveDamageFromBlock?: boolean;

  // Procedure
  surgeryType?: string;             // for appropriateness check

  // Event guards
  prevBlockLogged?: boolean;
  prevComplicationLogged?: boolean;
}

export interface RegionalBlockOutput {
  // Block quality
  blockCoverage: string[];          // body regions covered
  blockDurationHours: number;       // expected duration with current LA
  dexExtensionHours: number;        // additional hours from dexamethasone
  totalDurationHours: number;       // combined expected duration

  // Adequacy
  blocAdequateForSurgery: boolean;  // covers surgical territory
  opioidSparingFraction: number;    // 0-0.8

  // Risk profile
  phrenic_palsy_risk: number;       // 0-1 (highest with ISB)
  pneumothorax_risk: number;        // 0-1 (highest with supraclavicular)
  LAST_risk: number;                // 0-1 Local Anesthetic Systemic Toxicity risk

  // Fall risk (for motor-blocking blocks)
  fallRiskIncrease: boolean;        // e.g., femoral nerve block → quad weakness

  prevBlockLogged: boolean;
  prevComplicationLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Block coverage territories and risk profiles
const BLOCK_DATA: Record<string, {
  coverage: string[];
  durationHoursBupi: number;
  phrenicRisk: number;
  pneumoRisk: number;
  fallRisk: boolean;
  opioidSparing: number;
}> = {
  interscalene: { coverage: ['Shoulder', 'Upper arm', 'Elbow (partial)'], durationHoursBupi: 18, phrenicRisk: 1.0, pneumoRisk: 0.02, fallRisk: false, opioidSparing: 0.75 },
  supraclavicular: { coverage: ['Entire arm below shoulder', 'Elbow', 'Forearm', 'Hand'], durationHoursBupi: 16, phrenicRisk: 0.50, pneumoRisk: 0.015, fallRisk: false, opioidSparing: 0.80 },
  axillary: { coverage: ['Forearm', 'Hand (partial)', 'Elbow (partial)'], durationHoursBupi: 14, phrenicRisk: 0, pneumoRisk: 0, fallRisk: false, opioidSparing: 0.70 },
  femoral: { coverage: ['Anterior thigh', 'Medial knee', 'Medial lower leg'], durationHoursBupi: 16, phrenicRisk: 0, pneumoRisk: 0, fallRisk: true, opioidSparing: 0.55 },
  adductor_canal: { coverage: ['Medial knee', 'Medial lower leg (sensory only)'], durationHoursBupi: 14, phrenicRisk: 0, pneumoRisk: 0, fallRisk: false, opioidSparing: 0.45 },
  sciatic_popliteal: { coverage: ['Below knee', 'Ankle', 'Foot', 'Posterior knee'], durationHoursBupi: 20, phrenicRisk: 0, pneumoRisk: 0, fallRisk: true, opioidSparing: 0.60 },
  tap: { coverage: ['Anterior abdominal wall T10-L1 (somatic only)'], durationHoursBupi: 12, phrenicRisk: 0, pneumoRisk: 0, fallRisk: false, opioidSparing: 0.40 },
  pecs: { coverage: ['Anterior chest wall', 'Breast', 'Lateral intercostals'], durationHoursBupi: 14, phrenicRisk: 0, pneumoRisk: 0.005, fallRisk: false, opioidSparing: 0.50 },
  esp: { coverage: ['Multilevel paravertebral (thoracic or lumbar)'], durationHoursBupi: 16, phrenicRisk: 0, pneumoRisk: 0.003, fallRisk: false, opioidSparing: 0.60 },
};

export class RegionalBlockSpecificModel {
  static tick(inputs: RegionalBlockInputs = {}): RegionalBlockOutput {
    const events: string[] = [];
    let prevBlockLogged = !!inputs.prevBlockLogged;
    let prevComplicationLogged = !!inputs.prevComplicationLogged;

    const blockType = (inputs.blockType || 'unknown').toLowerCase();
    const laCe = clamp(safeNumber(inputs.localAnestheticCe, 0), 0, 10);
    const dexPN = clamp(safeNumber(inputs.dexamethasonePeriNeural, 0), 0, 16);
    const dexSys = clamp(safeNumber(inputs.systemicDexaCe, 0), 0, 5);
    const blockMin = clamp(safeNumber(inputs.blockMinutesSince, 0), 0, 2880);

    const blockData = BLOCK_DATA[blockType];

    if (!blockData) {
      return {
        blockCoverage: ['Unknown block type'], blockDurationHours: 0, dexExtensionHours: 0,
        totalDurationHours: 0, blocAdequateForSurgery: false, opioidSparingFraction: 0,
        phrenic_palsy_risk: 0, pneumothorax_risk: 0, LAST_risk: 0, fallRiskIncrease: false,
        prevBlockLogged, prevComplicationLogged, events,
      };
    }

    // Duration calculation
    const baseDurationHours = laCe > 0 ? blockData.durationHoursBupi : 0;
    const dexExtensionHours = clamp(
      (dexPN > 0 ? Math.min(8, dexPN / 4 * 6) : 0)  // perineural: up to 8h extension
      + (dexSys > 0 ? 4 : 0),                          // systemic: ~4h extension
      0, 12,
    );
    const totalDurationHours = baseDurationHours + dexExtensionHours;

    // Efficacy (degrades over time)
    const blockEfficacy = totalDurationHours > 0
      ? Math.max(0, 1.0 - blockMin / (totalDurationHours * 60))
      : 0;
    const opioidSparingFraction = blockData.opioidSparing * blockEfficacy;

    // LAST risk: proportional to LA dose and proximity to vascular structures
    const LAST_risk = laCe > 0
      ? clamp(laCe / 5 * (blockData.pneumoRisk > 0.01 ? 0.02 : 0.005), 0, 0.05)
      : 0;

    if (laCe > 0 && !prevBlockLogged) {
      const dexNote = dexPN > 0 || dexSys > 0
        ? ` Dexamethasone adjuvant (${dexPN > 0 ? `${dexPN.toFixed(0)} mg perineural` : 'systemic 8 mg IV'}): extends duration by ${dexExtensionHours.toFixed(0)} hours.`
        : '';
      events.push(
        `✅ ${blockType.replace(/_/g, ' ').toUpperCase()} BLOCK PLACED: Coverage: ${blockData.coverage.join(', ')}. Expected duration: ${baseDurationHours.toFixed(0)}h.${dexNote} Opioid sparing: ~${(opioidSparingFraction * 100).toFixed(0)}%.${blockData.phrenicRisk > 0.5 ? ` ⚠️ PHRENIC NERVE PALSY ${(blockData.phrenicRisk * 100).toFixed(0)}% incidence — monitor respiratory function.` : ''}${blockData.pneumoRisk > 0.005 ? ` ⚠️ Pneumothorax risk ${(blockData.pneumoRisk * 100).toFixed(1)}% — consider post-block CXR.` : ''}${blockData.fallRisk ? ' ⚠️ MOTOR BLOCK → FALL RISK: Quad weakness (femoral block) or foot drop (sciatic). Ambulation with assistance only; fall prevention protocol.' : ''}`,
      );
      prevBlockLogged = true;
    }

    if ((!!inputs.pneumothoraxFromBlock || !!inputs.intravascularInjectionFromBlock) && !prevComplicationLogged) {
      if (inputs.pneumothoraxFromBlock) {
        events.push(`🚨 PNEUMOTHORAX from ${blockType} block. Symptoms: chest pain, hypoxia, unilateral breath sounds. Diagnosis: CXR. Management: O2, needle/chest tube drainage if >20% or symptomatic.`);
      }
      if (inputs.intravascularInjectionFromBlock) {
        events.push(`🚨 INTRAVASCULAR LA INJECTION from ${blockType} block. LAST protocol: (1) Stop LA; (2) Intralipid 20% 1.5 mL/kg IV bolus → 0.25 mL/kg/min infusion; (3) Airway + CPR; (4) Avoid vasopressin, CCBs, beta-blockers. Have resuscitation team nearby for all major blocks.`);
      }
      prevComplicationLogged = true;
    }

    return {
      blockCoverage: blockData.coverage,
      blockDurationHours: parseFloat(baseDurationHours.toFixed(1)),
      dexExtensionHours: parseFloat(dexExtensionHours.toFixed(1)),
      totalDurationHours: parseFloat(totalDurationHours.toFixed(1)),
      blocAdequateForSurgery: blockEfficacy > 0.5,
      opioidSparingFraction: parseFloat(opioidSparingFraction.toFixed(4)),
      phrenic_palsy_risk: blockData.phrenicRisk,
      pneumothorax_risk: blockData.pneumoRisk,
      LAST_risk: parseFloat(LAST_risk.toFixed(5)),
      fallRiskIncrease: blockData.fallRisk,
      prevBlockLogged,
      prevComplicationLogged,
      events,
    };
  }
}
