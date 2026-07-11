/**
 * Post-Dural Puncture Headache (PDPH) Model
 *
 * PDPH is the most common serious complication of spinal anesthesia and a major
 * complication of epidural anesthesia (when accidental dural puncture occurs).
 * Incidence: ~30-50% after 17-18G epidural needle (accidental dural puncture);
 *            ~1% after 25G spinal needle; ~0.5% after 27G spinal needle.
 *
 * === PATHOPHYSIOLOGY ===
 * CSF leak through dural hole → reduced CSF pressure → intracranial hypotension →
 * downward traction on pain-sensitive intracranial structures (meningeal vessels,
 * cranial nerves V, IX, X, upper cervical nerves) → headache.
 *
 * Gravitational component: CSF leak is worsened by upright posture (increased pressure
 * gradient) → CLASSIC POSTURAL HEADACHE: bilateral, occipital/frontal, worse sitting
 * or standing, completely (or nearly completely) relieved by lying flat within 30 min.
 * This postural feature is PATHOGNOMONIC — a headache not relieved by recumbency is
 * very unlikely to be PDPH.
 *
 * Onset: 12-48h after dural puncture (time for CSF pressure to equilibrate down)
 * Duration without treatment: 1-2 weeks (spontaneous CSF seal)
 *
 * === ASSOCIATED FEATURES ===
 * - Neck stiffness (meningeal irritation from stretched meninges)
 * - Auditory symptoms (tinnitus, hearing loss — perilymph equilibrates with CSF)
 * - Visual disturbances (occasional, from cranial nerve VI stretch)
 * - Nausea, photophobia
 *
 * === SEVERITY FACTORS ===
 * - Needle size: larger bore = larger hole = worse PDPH (17G >> 25G >> 27G)
 * - Needle design: cutting (Quincke) > pencil-point (Sprotte, Whitacre) for same gauge
 * - Orientation: cutting needle bevel parallel to dural fibers = smaller hole
 * - Number of punctures: more attempts = higher risk
 * - Young women: higher incidence than older men (CSF pressure physiology)
 * - Pregnancy: dural fibers under more tension → higher risk
 * - Prior PDPH history: higher susceptibility
 *
 * === TREATMENT LADDER ===
 * 1. CONSERVATIVE (first 24-48h):
 *    - Bed rest (supine relieves headache)
 *    - Aggressive oral hydration (increases CSF production)
 *    - Caffeine 300-500mg oral or 500mg IV (vasoconstriction → increases CSF production)
 *    - NSAIDs/acetaminophen for pain
 *    - Theophylline, sumatriptan (alternatives)
 *
 * 2. EPIDURAL BLOOD PATCH (EBP) — definitive treatment:
 *    - 15-20 mL autologous blood injected into epidural space at or below puncture level
 *    - Mechanism: blood clots → tamponades the dural hole; also increases epidural pressure
 *      → reverses intracranial hypotension within minutes
 *    - SUCCESS RATE: ~85-90% complete relief with first patch; 95%+ after second patch
 *    - Timing: most effective ≥24h after dural puncture (earlier patches are less durable)
 *    - Contraindications: fever/infection, coagulopathy, anticoagulation
 *
 * 3. Prophylactic options (controversial; not standard of care):
 *    - Epidural saline bolus (transient)
 *    - Epidural fibrin glue (rarely used)
 *    - Intrathecal catheter for 24h (reduces PDPH incidence after accidental dural puncture)
 *
 * Sources: Turnbull DK, Headache 2003; Vilming ST, J Neurol 1989;
 * Simonneau G, Lancet 1994; Miller's 9th Ed Ch 26 (Spinal and Epidural Anesthesia).
 */

export interface PDPHInputs {
  dptOccurred?: boolean;          // accidental dural puncture has occurred
  dptNeedleGauge?: number;        // gauge of needle (17=large, 25=small); affects severity
  dptNeedleType?: 'cutting' | 'pencil-point'; // Quincke vs Sprotte/Whitacre
  dptTimeHours?: number;          // hours since dural puncture
  isPregnant?: boolean;           // amplifies risk and severity
  patientSex?: string;            // 'female' higher risk
  patientAge?: number;            // younger higher risk
  isUpright?: boolean;            // sitting/standing worsens headache

  // Treatment
  bloodPatchGiven?: boolean;
  bloodPatchTimeSinceDPTHours?: number; // hours after DPT when patch was given
  caffeineActive?: boolean;
  caffeineDose?: number;          // mg (300-500 typical)

  // Event guards
  prevPDPHOnsetLogged?: boolean;
  prevBloodPatchLogged?: boolean;
}

export interface PDPHOutput {
  pdphActive: boolean;
  pdphSeverity: number;           // 0-1 (NRS analog: 0=none, 1=severe)
  posturalComponent: number;      // 0-1 (how much worse in upright position)
  headacheNRS: number;            // 0-10 numeric rating scale equivalent
  bloodPatchEfficacy: number;     // 0-1 after patch placed
  caffeineBenefit: number;        // 0-0.3 reduction in severity
  recommendBloodPatch: boolean;   // NRS >= 7 or failing conservative
  prevPDPHOnsetLogged: boolean;
  prevBloodPatchLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class PDPHModel {
  static tick(inputs: PDPHInputs = {}): PDPHOutput {
    const events: string[] = [];
    let prevPDPHOnsetLogged = !!inputs.prevPDPHOnsetLogged;
    let prevBloodPatchLogged = !!inputs.prevBloodPatchLogged;

    const dptOccurred = !!inputs.dptOccurred;

    if (!dptOccurred) {
      return {
        pdphActive: false, pdphSeverity: 0, posturalComponent: 0, headacheNRS: 0,
        bloodPatchEfficacy: 0, caffeineBenefit: 0, recommendBloodPatch: false,
        prevPDPHOnsetLogged, prevBloodPatchLogged, events,
      };
    }

    const gauge = clamp(safeNumber(inputs.dptNeedleGauge, 17), 17, 30);
    const needleType = inputs.dptNeedleType || 'cutting';
    const dptHours = clamp(safeNumber(inputs.dptTimeHours, 0), 0, 240);
    const isPregnant = !!inputs.isPregnant;
    const isFemale = (inputs.patientSex || 'female').toLowerCase().includes('f');
    const age = clamp(safeNumber(inputs.patientAge, 35), 10, 90);
    const isUpright = !!inputs.isUpright;

    // ===========================
    // BASELINE PDPH SEVERITY BY NEEDLE SIZE
    // ===========================
    // Gauge: 17G Tuohy = severe risk, 25G = mild risk, 27G = minimal risk
    // Pencil-point needles produce smaller, round holes that seal faster
    const gaugeRisk = gauge <= 18 ? 0.90 : gauge <= 21 ? 0.50 : gauge <= 24 ? 0.20 : 0.08;
    const needleTypeModifier = needleType === 'cutting' ? 1.0 : 0.5;
    const baseSeverity = gaugeRisk * needleTypeModifier;

    // Patient factors
    const ageModifier = age < 40 ? 1.2 : age > 65 ? 0.6 : 1.0; // young = worse
    const sexModifier = isFemale ? 1.15 : 1.0;
    const pregnancyModifier = isPregnant ? 1.25 : 1.0;

    const patientAdjustedSeverity = clamp(baseSeverity * ageModifier * sexModifier * pregnancyModifier, 0, 1.0);

    // ===========================
    // TEMPORAL DEVELOPMENT
    // ===========================
    // Headache develops over 12-48h; peaks at 24-48h; spontaneously resolves over 1-2 weeks
    let timeFactor: number;
    if (dptHours < 6) {
      timeFactor = 0; // too early to develop
    } else if (dptHours < 48) {
      timeFactor = Math.min(1.0, (dptHours - 6) / 24); // ramps up
    } else if (dptHours < 240) {
      timeFactor = Math.max(0, 1.0 - (dptHours - 48) / 200); // very slow spontaneous resolution
    } else {
      timeFactor = 0; // >10 days: usually resolved
    }

    // ===========================
    // BLOOD PATCH EFFECT
    // ===========================
    let bloodPatchEfficacy = 0;
    if (inputs.bloodPatchGiven) {
      const patchHoursAfterDPT = clamp(safeNumber(inputs.bloodPatchTimeSinceDPTHours, dptHours), 0, dptHours);
      // Early patches (<24h) are less durable; >24h patches are most effective
      const timingFactor = patchHoursAfterDPT >= 24 ? 0.95 : Math.max(0.6, patchHoursAfterDPT / 24 * 0.35 + 0.6);
      bloodPatchEfficacy = timingFactor;
      if (!prevBloodPatchLogged) {
        const reliefMsg = patchHoursAfterDPT < 24
          ? `Blood patch placed ${patchHoursAfterDPT.toFixed(0)}h after DPT. Relief expected ~85% at this timing (earlier patches are slightly less durable). Position patient supine for 1-2h post-patch. Relief should be immediate (increased epidural pressure). Monitor for 30-60 min.`
          : `Blood patch placed ${patchHoursAfterDPT.toFixed(0)}h after DPT. Optimal timing (>24h) — 90-95% complete relief expected. Immediate CSF pressure restoration.`;
        events.push(
          `✅ EPIDURAL BLOOD PATCH (EBP) PERFORMED: 15-20 mL autologous blood injected into epidural space at/below puncture level. ${reliefMsg} If headache persists or recurs: second EBP has 95%+ cure rate. Post-procedure: avoid Valsalva, heavy lifting × 24-48h (blood clot maturation). Contraindications: fever/bacteremia, coagulopathy.`,
        );
        prevBloodPatchLogged = true;
      }
    }

    // ===========================
    // CAFFEINE BENEFIT
    // ===========================
    const caffeineActive = !!inputs.caffeineActive;
    const caffeineDose = clamp(safeNumber(inputs.caffeineDose, 0), 0, 1000);
    const caffeineBenefit = caffeineActive && caffeineDose >= 200
      ? clamp(caffeineDose / 1000 * 0.35, 0, 0.30) // up to 30% severity reduction
      : 0;

    // ===========================
    // FINAL SEVERITY + POSTURAL COMPONENT
    // ===========================
    const rawSeverity = patientAdjustedSeverity * timeFactor * (1 - bloodPatchEfficacy) - caffeineBenefit;
    const pdphSeverity = clamp(rawSeverity, 0, 1.0);
    const pdphActive = pdphSeverity > 0.1;

    // Postural component: upright dramatically worsens (classic orthostatic pattern)
    const posturalComponent = pdphActive
      ? (isUpright ? 0.8 : 0.2) // standing: 80% of worsening; lying: only 20% baseline
      : 0;
    const effectiveSeverity = clamp(pdphSeverity * (isUpright ? 1.5 : 0.5), 0, 1.0);
    const headacheNRS = Math.round(effectiveSeverity * 10);

    // Recommend blood patch when conservative fails (NRS ≥ 7) or >48h of significant headache
    const recommendBloodPatch = pdphActive && (headacheNRS >= 7 || (dptHours > 48 && pdphSeverity > 0.4));

    // ===========================
    // ONSET EVENT
    // ===========================
    if (pdphActive && !prevPDPHOnsetLogged) {
      const needleDesc = `${gauge}G ${needleType === 'cutting' ? 'Quincke (cutting)' : 'pencil-point'} needle`;
      events.push(
        `⚠️ POST-DURAL PUNCTURE HEADACHE (PDPH): Onset ${dptHours.toFixed(0)}h after accidental dural puncture with ${needleDesc}. Classic features: BILATERAL OCCIPITAL/FRONTAL headache (NRS ${headacheNRS}/10 upright), COMPLETELY RELIEVED LYING FLAT within 30 min (pathognomonic), neck stiffness, possible tinnitus/visual changes. Management: (1) CONSERVATIVE first 24-48h: bed rest, aggressive oral hydration, caffeine 300-500mg oral q6-8h, NSAIDs; (2) EPIDURAL BLOOD PATCH if NRS ≥ 7 or failing conservative: 15-20 mL autologous blood at/below puncture level → 90% cure. Timing: EBP most effective >24h after DPT. URGENT: If fever, meningismus, or severe progressive headache → rule out bacterial meningitis, subdural hematoma (rare but life-threatening complications).`,
      );
      prevPDPHOnsetLogged = true;
    }
    if (!pdphActive) prevPDPHOnsetLogged = false;

    return {
      pdphActive,
      pdphSeverity: parseFloat(pdphSeverity.toFixed(4)),
      posturalComponent: parseFloat(posturalComponent.toFixed(4)),
      headacheNRS,
      bloodPatchEfficacy: parseFloat(bloodPatchEfficacy.toFixed(4)),
      caffeineBenefit: parseFloat(caffeineBenefit.toFixed(4)),
      recommendBloodPatch,
      prevPDPHOnsetLogged,
      prevBloodPatchLogged,
      events,
    };
  }
}
