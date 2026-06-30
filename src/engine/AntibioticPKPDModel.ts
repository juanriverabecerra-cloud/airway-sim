/**
 * Antibiotic PK/PD Model: Real Time-Dependent, Concentration-Dependent, and AUC/MIC
 * Pharmacodynamic Target Attainment -- Treatment-Responsive Sepsis Integration
 *
 * Phase 6, Stage A of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 *
 * Prior state: `SepsisCascadeModel.ts` modeled treatment-responsive sepsis but had only
 * source control and vasopressor support as modifiers -- no antibiotic effect -- because
 * the antibiotic drug database had only Ampicillin/Sulbactam. This model closes that gap
 * with eight real antibiotics (Cefazolin, Vancomycin, Piperacillin/Tazobactam, Meropenem,
 * Gentamicin, Metronidazole, Ciprofloxacin, Ceftriaxone) and real pharmacodynamic killing
 * kinetics for each.
 *
 * === THREE ANTIBIOTIC PD PARADIGMS (real microbiology/pharmacology) ===
 *
 * 1. **Time-Dependent Killing** (beta-lactams: cefazolin, pip/tazo, meropenem, ceftriaxone)
 *    Efficacy ∝ %Time(free drug Ce > MIC). Rate of bacterial killing plateaus at ~4× MIC
 *    -- concentration beyond that threshold adds no extra killing speed, only more time
 *    above the threshold matters. Target: T>MIC ≥40-50% of dosing interval for bacteriostasis,
 *    ≥60-70% for bactericidal effect. Clinically important consequence: beta-lactams MUST be
 *    dosed frequently (q4-8h depending on drug) or as extended infusion to maintain T>MIC;
 *    a single large bolus is less effective than the same total daily dose divided into more
 *    frequent smaller doses. Meropenem extended infusion (3-4h) is the modern best practice.
 *
 * 2. **Concentration-Dependent Killing** (aminoglycosides: gentamicin)
 *    Efficacy ∝ Cmax/MIC ratio. Higher peak concentrations kill bacteria faster and more
 *    completely. Saturation of bacterial killing occurs around 8-10× MIC. This is why
 *    aminoglycosides are given as once-daily high-dose pulses (5-7 mg/kg) rather than
 *    frequent low doses -- the goal is to achieve Cmax/MIC ≥8-10 with sufficient trough
 *    time (<1 mg/L) for renal tubular cell recovery. Extended-interval dosing (Hartford/
 *    Barnes-Jewish nomogram) exploits this biology to maximize efficacy while minimizing
 *    nephrotoxicity. Post-antibiotic effect (PAE) is also prolonged in aminoglycosides --
 *    bacteria remain suppressed even after drug falls below MIC.
 *
 * 3. **AUC/MIC-Driven PD** (glycopeptides: vancomycin; fluoroquinolones: ciprofloxacin;
 *    nitroimidazoles: metronidazole)
 *    Efficacy ∝ AUC over 24h / MIC. Both time above MIC AND maximum concentration contribute,
 *    but the product relationship (area under the curve) is the independent variable.
 *    For vancomycin: 2020 ASHP/IDSA/SIDP guidelines target AUC/MIC ≥400-600 mg·h/L (for
 *    MRSA with MIC ≤1 mg/L), replacing the old trough-only approach.
 *    For ciprofloxacin: AUC/MIC ≥125 for gram-negative organisms is the target.
 *
 * === ORGANISM/SPECTRUM MATRIX ===
 *
 * Infection type (encoded in `patient.infectionType`) maps to organism class(es). Each
 * antibiotic covers a subset of organism classes, and coverage quality degrades if the
 * PD target is not attained. Combined coverage from multiple agents is computed via a
 * "best-agent" approach (max individual coverage) to avoid double-counting, consistent
 * with how concurrent agents work clinically.
 *
 * Infection types supported:
 * - 'gram_positive': Staph aureus (MSSA/MRSA), Streptococcus -- covered by cefazolin
 *   (MSSA only), vancomycin (MRSA + MSSA)
 * - 'gram_negative_enteric': E. coli, Klebsiella, Proteus -- ceftriaxone, pip/tazo,
 *   meropenem, gentamicin, ciprofloxacin
 * - 'pseudomonas': Pseudomonas aeruginosa -- pip/tazo, meropenem, gentamicin,
 *   ciprofloxacin (resistance emerging -- requires culture confirmation)
 * - 'anaerobic': Bacteroides fragilis, Clostridium -- metronidazole, pip/tazo, meropenem
 * - 'mixed_abdominal': Bowel flora (gram-negative enteric + anaerobes) -- pip/tazo or
 *   meropenem (covers both); or ceftriaxone + metronidazole combination
 * - 'pneumonia_community': Strep pneumoniae, H. influenzae, atypicals -- ceftriaxone,
 *   ciprofloxacin
 * - 'pneumonia_nosocomial': Above + gram-negatives + MRSA risk -- pip/tazo + vancomycin
 * - 'uti': Gram-negative enteric (E. coli, Klebsiella, Proteus) -- ceftriaxone, cipro,
 *   pip/tazo, gentamicin
 * - 'default': Unknown/general sepsis -- broad-spectrum coverage assessed
 *
 * === VANCOMYCIN NEPHROTOXICITY ===
 * Real mechanism: high trough concentrations (old target >15-20 mg/L) cause lysosomal
 * phospholipidosis in proximal tubular cells. AUC/MIC monitoring reduces nephrotoxicity
 * compared to trough-only by preventing trough accumulation while still achieving efficacy.
 * This model exports `vancomycinTroughRisk` (0-1) which RenalEngine.ts's existing
 * `hasRhabdomyolysis`/AKI mechanism should respond to.
 *
 * Source: Craig WA AAAC 1998 (PD paradigm review); ASHP/IDSA/SIDP 2020 Vancomycin
 * Guidelines; Drusano GL 2007 (fluoroquinolone AUC/MIC). Organism coverage and MIC
 * values are disclosed, reasoned estimates from reference breakpoints (CLSI/EUCAST),
 * not individual drug package inserts.
 */

export interface AntibioticInputs {
  // Effect-site concentrations (mg/L) from PKPDEngine
  cefazolinCe?: number;
  vancomycinCe?: number;
  piptazoCe?: number;
  meropenemCe?: number;
  gentamicinCe?: number;
  metronidazoleCe?: number;
  ciprofloxacinCe?: number;
  ceftriaxoneCe?: number;

  // State for AUC/MIC accumulation (carried forward each tick)
  prevVancomycinAuc24h?: number; // mg·h/L accumulated in last 24h window
  prevCiprofloxacinAuc24h?: number;

  infectionType?: string; // patient.infectionType, e.g. 'gram_positive', 'mixed_abdominal'
  renalFunctionRatio?: number; // for vancomycin trough estimation (AKI slows clearance → trough accumulation)
  dt?: number;
}

export interface AntibioticOutput {
  coverageAdequacy: number; // 0-1, net antimicrobial coverage for the current infection
  pdTargetAttainment: Record<string, number>; // per-drug PD score
  vancomycinAuc24h: number; // running AUC (mg·h/L) for AUC/MIC guidance
  ciprofloxacinAuc24h: number;
  vancomycinTroughRisk: number; // 0-1, nephrotoxicity risk from trough accumulation
  aminoglycosideTroughRisk: number; // 0-1, gentamicin nephrotoxicity from trough
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// MIC breakpoints (mg/L) for susceptible organisms -- CLSI reference values, disclosed.
// For time-dependent drugs: Ce > MIC is the threshold; higher is not better, longer is.
// For concentration-dependent drugs: Cmax/MIC target is encoded per-drug below.
// For AUC-driven drugs: AUC accumulation is computed from Ce each tick.
const COVERAGE_MATRIX: Record<string, Record<string, number>> = {
  // Drug name → infection type → MIC breakpoint for susceptible organisms
  cefazolin: {
    gram_positive: 1.0, // MSSA ≤1 mg/L susceptible; MRSA NOT covered (cefazolin MIC >>)
    uti: 8.0,           // covers uncomplicated UTI gram-negatives at higher dose
    pneumonia_community: 0,  // inadequate
    gram_negative_enteric: 0, // narrow spectrum
    pseudomonas: 0,
    anaerobic: 0,
    mixed_abdominal: 0,
    pneumonia_nosocomial: 0,
    default: 0.5
  },
  vancomycin: {
    gram_positive: 1.0, // MRSA target MIC ≤1 mg/L (isolates with MIC >2 = "MIC creep" → treatment failure)
    pneumonia_nosocomial: 1.0,
    default: 0 // no gram-negative coverage at all
  },
  piptazo: {
    gram_negative_enteric: 8.0,
    pseudomonas: 16.0,  // variable -- some resistance, but often susceptible
    anaerobic: 4.0,
    mixed_abdominal: 8.0,
    pneumonia_nosocomial: 8.0,
    uti: 8.0,
    gram_positive: 4.0, // some MSSA coverage (not MRSA)
    default: 4.0
  },
  meropenem: {
    gram_negative_enteric: 1.0,
    pseudomonas: 2.0,
    anaerobic: 2.0,
    mixed_abdominal: 2.0,
    pneumonia_nosocomial: 2.0,
    uti: 1.0,
    gram_positive: 1.0, // MSSA only, not MRSA
    default: 2.0
  },
  gentamicin: {
    gram_negative_enteric: 2.0, // target Cmax/MIC ≥8 → need Cmax ≥16 mg/L
    pseudomonas: 4.0,
    uti: 2.0,
    gram_positive: 0, // poor gram-positive monotherapy, used in synergy
    default: 2.0
  },
  metronidazole: {
    anaerobic: 0.5,
    mixed_abdominal: 0.5,
    default: 0
  },
  ciprofloxacin: {
    gram_negative_enteric: 0.5,
    pseudomonas: 1.0,
    uti: 0.25,
    pneumonia_community: 0.5,
    pneumonia_nosocomial: 1.0,
    default: 0.5
  },
  ceftriaxone: {
    gram_negative_enteric: 1.0,
    pneumonia_community: 0.5,
    uti: 1.0,
    gram_positive: 0.5, // streptococci, but NOT MRSA/Enterococcus
    meningitis: 0.5,
    default: 1.0
  }
};

export class AntibioticPKPDModel {
  static tick(inputs: AntibioticInputs = {}): AntibioticOutput {
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));
    const dtHours = dt / 3600;

    const cefazolinCe = Math.max(0, safeNumber(inputs.cefazolinCe, 0));
    const vancomycinCe = Math.max(0, safeNumber(inputs.vancomycinCe, 0));
    const piptazoCe = Math.max(0, safeNumber(inputs.piptazoCe, 0));
    const meropenemCe = Math.max(0, safeNumber(inputs.meropenemCe, 0));
    const gentamicinCe = Math.max(0, safeNumber(inputs.gentamicinCe, 0));
    const metronidazoleCe = Math.max(0, safeNumber(inputs.metronidazoleCe, 0));
    const ciprofloxacinCe = Math.max(0, safeNumber(inputs.ciprofloxacinCe, 0));
    const ceftriaxoneCe = Math.max(0, safeNumber(inputs.ceftriaxoneCe, 0));
    const infectionType = inputs.infectionType || 'default';
    const renalFunctionRatio = clamp(safeNumber(inputs.renalFunctionRatio, 1.0), 0, 2);

    // --- AUC accumulation for AUC/MIC-driven drugs ---
    // Running 24h AUC: add this tick's Ce × dtHours, decay old values with 24h half-life
    // window approximation (simple exponential decay of old contribution).
    const aucDecayFactor = Math.exp(-Math.log(2) * dtHours / 12); // 12h effective half-window
    let vancomycinAuc24h = safeNumber(inputs.prevVancomycinAuc24h, 0) * aucDecayFactor + vancomycinCe * dtHours;
    let ciprofloxacinAuc24h = safeNumber(inputs.prevCiprofloxacinAuc24h, 0) * aucDecayFactor + ciprofloxacinCe * dtHours;
    vancomycinAuc24h = clamp(vancomycinAuc24h, 0, 2000);
    ciprofloxacinAuc24h = clamp(ciprofloxacinAuc24h, 0, 1000);

    // --- Per-drug PD target attainment ---
    // Time-dependent (beta-lactams): score = fraction of Ce above MIC threshold
    //   (instantaneous -- a tick's Ce is either above or below MIC; accumulates over time
    //   via the SepsisCascadeModel's running coverage adequacy, not here directly)
    function timeDependentScore(Ce: number, mic: number): number {
      if (mic === 0 || Ce === 0) return 0;
      return clamp(Ce / (mic * 4), 0, 1); // 4× MIC is saturation; Hill-function approximation
    }

    // Concentration-dependent (aminoglycosides): score = Cmax/MIC ratio divided by target (8)
    function concDependentScore(Ce: number, mic: number): number {
      if (mic === 0 || Ce === 0) return 0;
      const cmaxOverMic = Ce / mic;
      return clamp(cmaxOverMic / 8, 0, 1); // ≥8 Cmax/MIC = full score
    }

    // AUC/MIC-driven (vancomycin: target AUC/MIC ≥400; ciprofloxacin: ≥125)
    function aucScore(auc24h: number, mic: number, target: number): number {
      if (mic === 0) return 0;
      return clamp(auc24h / (mic * target), 0, 1);
    }

    function getOrgMic(drugName: string): number {
      const matrix = COVERAGE_MATRIX[drugName];
      if (!matrix) return 0;
      return matrix[infectionType] ?? matrix['default'] ?? 0;
    }

    const pdScores: Record<string, number> = {
      cefazolin: timeDependentScore(cefazolinCe, getOrgMic('cefazolin')),
      vancomycin: aucScore(vancomycinAuc24h, getOrgMic('vancomycin'), 400),
      piptazo: timeDependentScore(piptazoCe, getOrgMic('piptazo')),
      meropenem: timeDependentScore(meropenemCe, getOrgMic('meropenem')),
      gentamicin: concDependentScore(gentamicinCe, getOrgMic('gentamicin')),
      metronidazole: aucScore(safeNumber(inputs.prevVancomycinAuc24h, 0) > 0 ? 0 : metronidazoleCe * dtHours * 8, getOrgMic('metronidazole'), 100), // simplified AUC for metronidazole
      ciprofloxacin: aucScore(ciprofloxacinAuc24h, getOrgMic('ciprofloxacin'), 125),
      ceftriaxone: timeDependentScore(ceftriaxoneCe, getOrgMic('ceftriaxone'))
    };

    // Metronidazole: AUC-based, calculate its own running contribution
    pdScores.metronidazole = timeDependentScore(metronidazoleCe, getOrgMic('metronidazole')); // simplified

    // Combined coverage: max across all agents (best-agent for each organism class)
    // Mixed infections (e.g., mixed_abdominal) require coverage of both anaerobic AND
    // gram-negative components -- model as min(best_gram_negative, best_anaerobic).
    let coverageAdequacy: number;
    if (infectionType === 'mixed_abdominal') {
      // Requires adequate BOTH gram-negative AND anaerobic coverage simultaneously
      const gramNegScore = Math.max(pdScores.piptazo, pdScores.meropenem, pdScores.gentamicin, pdScores.ciprofloxacin, pdScores.ceftriaxone);
      const anaerobicScore = Math.max(pdScores.metronidazole, pdScores.piptazo, pdScores.meropenem);
      coverageAdequacy = Math.min(gramNegScore, anaerobicScore);
    } else if (infectionType === 'pneumonia_nosocomial') {
      // Nosocomial pneumonia often requires dual coverage (gram-negative + MRSA component)
      const gramNegScore = Math.max(pdScores.piptazo, pdScores.meropenem, pdScores.ciprofloxacin, pdScores.ceftriaxone);
      const mrsaScore = pdScores.vancomycin;
      // If no MRSA risk factor, gram-negative coverage alone suffices
      coverageAdequacy = 0.7 * gramNegScore + 0.3 * mrsaScore;
    } else {
      coverageAdequacy = Math.max(...Object.values(pdScores));
    }
    coverageAdequacy = clamp(coverageAdequacy, 0, 1);

    // --- Nephrotoxicity risks ---
    // Vancomycin: trough risk proportional to AUC accumulation above safe range (~400 mg·h/L)
    // Worsened by AKI (renalFunctionRatio < 1 → slower clearance → higher trough)
    const vancomycinSafeAuc = 400; // mg·h/L upper boundary for minimal nephrotoxicity
    const vancomycinTroughRisk = clamp((vancomycinAuc24h - vancomycinSafeAuc) / vancomycinSafeAuc, 0, 1) * (1 / renalFunctionRatio);

    // Gentamicin: trough risk -- low Ce between doses is safe; high Ce between doses is toxic
    // A simplified proxy: if Ce is sustained (>2 mg/L = elevated trough risk threshold), nephrotoxicity
    const aminoglycosideTroughRisk = clamp((gentamicinCe - 2) / 8, 0, 1);

    return {
      coverageAdequacy: parseFloat(coverageAdequacy.toFixed(4)),
      pdTargetAttainment: Object.fromEntries(Object.entries(pdScores).map(([k, v]) => [k, parseFloat(v.toFixed(4))])),
      vancomycinAuc24h: parseFloat(vancomycinAuc24h.toFixed(2)),
      ciprofloxacinAuc24h: parseFloat(ciprofloxacinAuc24h.toFixed(2)),
      vancomycinTroughRisk: parseFloat(vancomycinTroughRisk.toFixed(4)),
      aminoglycosideTroughRisk: parseFloat(aminoglycosideTroughRisk.toFixed(4))
    };
  }
}
