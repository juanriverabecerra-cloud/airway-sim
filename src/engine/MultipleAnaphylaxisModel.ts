/**
 * Multiple Anaphylaxis Triggers Model
 *
 * The existing anaphylaxis model only handles penicillin/ampicillin-sulbactam.
 * In clinical reality, anaphylaxis in the perioperative setting has multiple triggers.
 * The most common causes of perioperative anaphylaxis (French GERAP registry data):
 *
 * 1. NEUROMUSCULAR BLOCKING AGENTS (NMBAs): ~50-60% of cases
 *    Rocuronium > succinylcholine > vecuronium > atracurium
 *    IgE-mediated sensitization to the ammonium quaternary epitope
 *    Succinylcholine may be more common in France/Europe
 *
 * 2. LATEX: ~15-20% (declining with latex-free OR environments)
 *    Highly relevant in: spina bifida (>70% sensitized), healthcare workers, multiple surgeries
 *    Cross-reactive foods: banana, avocado, kiwi, chestnut
 *    Timing: onset 20-60 min after exposure (delayed vs IgE-mediated)
 *
 * 3. ANTIBIOTICS: ~15% of cases
 *    Penicillins/Cephalosporins most common (already modeled for ampicillin-sulbactam)
 *    Cefazolin: especially common (Canadian/US data)
 *
 * 4. BLUE DYES (Patent Blue, Isosulfan Blue): used for sentinel lymph node mapping
 *    Incidence ~2% (much higher than other drugs for a single exposure)
 *    Immediate, severe reactions
 *    SpO2 artifact: blue dye causes falsely LOW SpO2 readings (not true desaturation)
 *
 * 5. CHLORHEXIDINE: increasingly recognized (up to 5% of cases in some series)
 *    Used for skin prep, urinary catheters (chg-coated), central lines
 *    Delayed reaction possible (15-30 min after exposure)
 *
 * 6. PROPOFOL: IgE-mediated in egg/soy-allergic patients (rare)
 *    Propofol contains soybean oil and egg lecithin phospholipids
 *    True severe reactions are very rare (<1:100,000)
 *
 * Sources: Mertes PM, Anesthesiology 2011; Harper NJN, Br J Anaesth 2018;
 * Kroigaard M, Acta Anaesthesiol Scand 2007.
 */

export interface MultipleAnaphylaxisInputs {
  /** Injected deterministic RNG (Layer 1A). Defaults to Math.random when omitted. */
  rng?: () => number;
  // Patient risk factors
  hasKnownLatexAllergy?: boolean;
  hasSpinaOrBifida?: boolean;           // high latex sensitization risk
  hasMultiplePriorSurgeries?: boolean;  // > 3 = elevated latex risk
  allergiesToCrossReactiveFoods?: boolean; // banana, avocado, kiwi, chestnut

  // Current drug/substance exposures (Ce values, bolus-specific for some)
  rocuroniumCe?: number;
  vecuroniumCe?: number;
  atracuriumCe?: number;
  cefazolinCe?: number;                 // common antibiotic trigger
  chlorhexidineExposure?: boolean;      // skin prep, catheter, central line
  blueDyeExposure?: boolean;            // sentinel lymph node blue dye
  latexExposure?: boolean;              // glove contact, equipment
  propofol_allergy?: boolean;           // patient has documented propofol allergy flag
  propofolCe?: number;

  // Treatment
  epinephrineCe?: number;               // primary treatment
  diphenhydramineCe?: number;           // adjunct H1 blocker
  methylprednisoloneCe?: number;        // adjunct steroid

  // Active anaphylaxis from existing model (to avoid double-counting)
  existingAnaphylaxisActive?: boolean;

  // Event guards
  prevNMBAAnaphLogged?: boolean;
  prevLatexAnaphLogged?: boolean;
  prevCefAnaphLogged?: boolean;
  prevChlorhexLogged?: boolean;
  prevBlueDyeLogged?: boolean;
}

export interface MultipleAnaphylaxisOutput {
  anaphylaxisActive: boolean;
  anaphylaxisTrigger: string;          // which agent triggered
  anaphylaxisSeverity: number;         // 0-1
  svrDropFraction: number;             // 0-0.8 (profound vasodilation)
  compliancePenalty: number;           // bronchospasm
  resistancePenalty: number;
  hrEffect: number;                    // bpm (tachycardia reflex)
  blueDyeSpO2Artifact: number;         // false SpO2 depression from blue dye (not true hypoxia)
  treatmentEfficacy: number;           // 0-1 (epinephrine reversal)
  prevNMBAAnaphLogged: boolean;
  prevLatexAnaphLogged: boolean;
  prevCefAnaphLogged: boolean;
  prevChlorhexLogged: boolean;
  prevBlueDyeLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class MultipleAnaphylaxisModel {
  static tick(inputs: MultipleAnaphylaxisInputs = {}): MultipleAnaphylaxisOutput {
    const events: string[] = [];
    const rng = inputs.rng || Math.random;
    let prevNMBAAnaphLogged = !!inputs.prevNMBAAnaphLogged;
    let prevLatexAnaphLogged = !!inputs.prevLatexAnaphLogged;
    let prevCefAnaphLogged = !!inputs.prevCefAnaphLogged;
    let prevChlorhexLogged = !!inputs.prevChlorhexLogged;
    let prevBlueDyeLogged = !!inputs.prevBlueDyeLogged;

    // Skip if existing penicillin anaphylaxis already active
    if (inputs.existingAnaphylaxisActive) {
      return {
        anaphylaxisActive: false, anaphylaxisTrigger: '', anaphylaxisSeverity: 0,
        svrDropFraction: 0, compliancePenalty: 0, resistancePenalty: 0, hrEffect: 0,
        blueDyeSpO2Artifact: 0, treatmentEfficacy: 0,
        prevNMBAAnaphLogged, prevLatexAnaphLogged, prevCefAnaphLogged,
        prevChlorhexLogged, prevBlueDyeLogged, events,
      };
    }

    const rocCe = clamp(safeNumber(inputs.rocuroniumCe, 0), 0, 10);
    const vecCe = clamp(safeNumber(inputs.vecuroniumCe, 0), 0, 5);
    const atraCe = clamp(safeNumber(inputs.atracuriumCe, 0), 0, 5);
    const cefCe = clamp(safeNumber(inputs.cefazolinCe, 0), 0, 5);
    const epiCe = clamp(safeNumber(inputs.epinephrineCe, 0), 0, 5);
    const diphCe = clamp(safeNumber(inputs.diphenhydramineCe, 0), 0, 10);
    const methylpredCe = clamp(safeNumber(inputs.methylprednisoloneCe, 0), 0, 10);

    // ===========================
    // LATEX ALLERGY RISK
    // ===========================
    const hasLatexAllergy = !!inputs.hasKnownLatexAllergy;
    const hasSpinaBifida = !!inputs.hasSpinaOrBifida;
    const hasMultipleSurgeries = !!inputs.hasMultiplePriorSurgeries;
    const hasCrossReactive = !!inputs.allergiesToCrossReactiveFoods;

    // Latex sensitization probability (not same as clinical allergy)
    const latexSensitizationRisk = hasLatexAllergy ? 1.0
      : hasSpinaBifida ? 0.65  // >65% sensitization
      : hasMultipleSurgeries ? 0.15
      : hasCrossReactive ? 0.20
      : 0.01;

    const latexExposure = !!inputs.latexExposure;
    const latexAnaphylaxisActive = latexExposure && latexSensitizationRisk > 0.3 && (hasLatexAllergy || rng() < latexSensitizationRisk * 0.3);

    if (latexAnaphylaxisActive && !prevLatexAnaphLogged) {
      events.push(
        `🚨 LATEX ANAPHYLAXIS: IgE-mediated reaction to latex exposure. Common in spina bifida patients (65%+ sensitized), healthcare workers, multiple prior surgeries. SpO2 may be artifact-low. TREATMENT: (1) Remove ALL latex from environment (gloves → change to vinyl/nitrile, latex Foley → silicone); (2) Epinephrine 0.5-1 mg IM or 0.1 mg IV; (3) Diphenhydramine; (4) Methylprednisolone 125 mg IV; (5) Aggressive fluid resuscitation. Onset typically 20-60 min after latex contact. FUTURE: strict latex-free environment for all subsequent procedures. Cross-reactive foods: banana, avocado, kiwi, chestnut.`,
      );
      prevLatexAnaphLogged = true;
    }

    // ===========================
    // NMBA ANAPHYLAXIS
    // ===========================
    // ~1:6000 to 1:20,000 for rocuronium; atracurium slightly more common
    const nmbaCe = Math.max(rocCe, vecCe, atraCe);
    const nmbaAnaphylaxisActive = nmbaCe > 0.1 && rng() < 0.00001; // very rare per tick

    if (nmbaAnaphylaxisActive && !prevNMBAAnaphLogged) {
      const agent = rocCe > 0 ? 'Rocuronium' : vecCe > 0 ? 'Vecuronium' : 'Atracurium';
      events.push(
        `🚨 NMBA ANAPHYLAXIS (${agent}): IgE-mediated anaphylaxis — the #1 cause of perioperative anaphylaxis in most series. Sensitization may occur from prior NMBA exposure or cross-reaction with quaternary ammonium compounds. TREATMENT: Epinephrine immediately; discontinue NMBA infusion; aggressive fluid resuscitation. REVERSAL OF NMB IN ANAPHYLAXIS: Sugammadex 16 mg/kg for rocuronium (if also treating anaphylaxis, prioritize epinephrine first). Note: some case reports of sugammadex itself causing anaphylaxis — have alternative reversal ready. Alert blood bank for possible massive transfusion.`,
      );
      prevNMBAAnaphLogged = true;
    }

    // ===========================
    // CEFAZOLIN ANAPHYLAXIS
    // ===========================
    const cefAnaphylaxisActive = cefCe > 0.1 && rng() < 0.00003;

    if (cefAnaphylaxisActive && !prevCefAnaphLogged) {
      events.push(
        `🚨 CEFAZOLIN ANAPHYLAXIS: IgE-mediated reaction to cefazolin (most common antibiotic cause in North America). ~1:3000-5000 incidence. Does NOT always mean penicillin allergy (10% cross-reactivity). TREATMENT: Standard anaphylaxis protocol (epinephrine, fluids, steroids). Alternative antibiotics: vancomycin (for gram-positive), clindamycin, or aztreonam (if gram-negative coverage needed and penicillin allergy confirmed). Note skin test can confirm true allergy vs one-time reaction.`,
      );
      prevCefAnaphLogged = true;
    }

    // ===========================
    // CHLORHEXIDINE REACTION
    // ===========================
    const chlorhexExposure = !!inputs.chlorhexidineExposure;
    const chlorhexAnaphylaxisActive = chlorhexExposure && rng() < 0.000005;

    if (chlorhexAnaphylaxisActive && !prevChlorhexLogged) {
      events.push(
        `🚨 CHLORHEXIDINE ANAPHYLAXIS: IgE-mediated reaction to chlorhexidine. Increasingly recognized — now accounts for 5-10% of perioperative anaphylaxis. Sources: skin prep (CHG-based solutions), CHG-impregnated central venous catheters, urinary catheters, wound dressings. May present 15-30 min after exposure. TREATMENT: Same as all anaphylaxis — epinephrine. Remove/stop chlorhexidine exposure. Document and report as allergy. Alternative antiseptic: povidone-iodine (Betadine) or isopropyl alcohol.`,
      );
      prevChlorhexLogged = true;
    }

    // ===========================
    // BLUE DYE (PATENT BLUE / ISOSULFAN BLUE)
    // ===========================
    const blueDyeExposure = !!inputs.blueDyeExposure;
    const blueDyeReactionActive = blueDyeExposure && rng() < 0.00005; // ~1:50

    // SpO2 artifact from blue dye: blue dye absorbs at 660nm → pulse ox reads falsely LOW
    const blueDyeSpO2Artifact = blueDyeExposure ? -5 : 0; // SpO2 reads 5% lower than reality

    if (blueDyeReactionActive && !prevBlueDyeLogged) {
      events.push(
        `🚨 BLUE DYE ANAPHYLAXIS (Patent Blue/Isosulfan Blue): ~1-2% incidence of anaphylaxis with sentinel lymph node blue dyes — among the highest incidence of any single drug in anesthesia. ADDITIONAL NOTE: Blue dye causes FALSE LOW SpO2 readings on pulse oximetry (blue dye absorbs at 660nm) — SPO2 may read 80% when true saturation is 98%. Use CO-oximetry ABG to confirm actual oxygenation. TREATMENT: Standard anaphylaxis protocol. Discuss with surgeon whether blue dye injection can be stopped or location changed. Pre-treatment with diphenhydramine/steroids does NOT reliably prevent reaction.`,
      );
      prevBlueDyeLogged = true;
    }

    // ===========================
    // COMBINED SEVERITY
    // ===========================
    const anyAnaphylaxis = latexAnaphylaxisActive || nmbaAnaphylaxisActive || cefAnaphylaxisActive || chlorhexAnaphylaxisActive || blueDyeReactionActive;
    const anaphylaxisTrigger = latexAnaphylaxisActive ? 'Latex'
      : nmbaAnaphylaxisActive ? 'NMBA'
      : cefAnaphylaxisActive ? 'Cefazolin'
      : chlorhexAnaphylaxisActive ? 'Chlorhexidine'
      : blueDyeReactionActive ? 'Blue Dye'
      : '';

    const anaphylaxisSeverity = anyAnaphylaxis ? 0.9 : 0;

    // Epinephrine reversal
    const epiReversal = epiCe > 0 ? clamp(epiCe * 8, 0, 0.95) : 0;
    const treatmentEfficacy = clamp(epiReversal + diphCe * 0.05 + methylpredCe * 0.02, 0, 0.95);
    const netSeverity = anaphylaxisSeverity * (1 - treatmentEfficacy);

    return {
      anaphylaxisActive: anyAnaphylaxis,
      anaphylaxisTrigger,
      anaphylaxisSeverity: parseFloat(anaphylaxisSeverity.toFixed(4)),
      svrDropFraction: parseFloat((netSeverity * 0.7).toFixed(4)),
      compliancePenalty: parseFloat((netSeverity * 0.4).toFixed(4)),
      resistancePenalty: parseFloat((netSeverity * 30).toFixed(1)),
      hrEffect: parseFloat((netSeverity * 45).toFixed(1)),
      blueDyeSpO2Artifact,
      treatmentEfficacy: parseFloat(treatmentEfficacy.toFixed(4)),
      prevNMBAAnaphLogged,
      prevLatexAnaphLogged,
      prevCefAnaphLogged,
      prevChlorhexLogged,
      prevBlueDyeLogged,
      events,
    };
  }
}
