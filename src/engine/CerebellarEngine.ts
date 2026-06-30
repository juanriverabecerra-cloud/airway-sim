/**
 * Cerebellar Engine: Anesthesia-Depth Eye/Coordination Signs + Tonsillar Herniation Risk
 *
 * Phase 3, Stage C (cerebellar piece) of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 * Deliberately NOT a restructuring of CerebralEngine.ts/ConsciousnessEngine.ts (still judged too
 * risky relative to payoff) -- this is a small, purely additive, read-mostly engine that consumes
 * CerebralEngine.ts's existing ICP/CPP/compliance tracking and the existing combined volatile MAC
 * signal, and produces clinical signs that had zero representation anywhere in this codebase before
 * (confirmed by direct grep: no prior "nystagmus", "ataxia", "herniation", or "tonsillar" reference
 * anywhere in src/).
 *
 * Two genuinely new, confirmed-absent pieces:
 *
 * 1. **Nystagmus / cerebellar-vestibular eye signs as an anesthesia-depth marker.** Ketamine is the
 *    classic dissociative-anesthetic cause of nystagmus (vertical/horizontal/rotary), via its action
 *    on vestibulocerebellar pathways -- modeled with the SAME Ce/(Ce+0.5) saturation form
 *    CerebralEngine.ts already uses for ketamine's CMR boost (`ketamineCMRBoost`), reusing an
 *    established calibration scale rather than inventing a new one. Separately, the classic Guedel
 *    "Stage II" light-plane excitement-stage eye signs (roving/disconjugate movements) are modeled as
 *    a function that peaks at a LIGHT volatile MAC and vanishes both at full wakefulness (MAC=0) and
 *    at surgical-plane depth (MAC>=1.0, where brainstem/cerebellar reflexes are suppressed) -- a
 *    parabola in normalized MAC, the simplest function with exactly that shape.
 * 2. **Cerebellar/vestibular ataxia as a lighter-plane sign**, modeled with its own, shallower peak
 *    in MAC (ataxia returns before full nystagmus resolution during emergence -- the lighter of the
 *    two signs) plus a benzodiazepine contribution: Midazolam causes ataxia/dysarthria/nystagmus as
 *    part of its classic sedative triad, using the SAME Ce/(Ce+0.03) saturation form
 *    `ConsciousnessEngine.ts` already uses for Midazolam's amygdalo-hippocampal disruption (line
 *    ~356), again reusing an established calibration rather than inventing one.
 * 3. **Tonsillar (cerebellar) herniation risk** -- distinct from the uncal/transtentorial herniation
 *    pattern (CN3 palsy/blown pupil) this engine does NOT model, since that is supratentorial, not
 *    cerebellar. Tonsillar herniation through the foramen magnum is driven by absolute ICP, how fast
 *    it got there (rapid rises are more dangerous than the same ICP reached slowly, since slow rises
 *    allow some compensation -- Monro-Kellie), CPP collapse, and exhausted intracranial compliance.
 *    This produces a continuous 0-1 risk index for monitoring/teaching plus a discrete
 *    `herniationImminent` crisis flag at a more severe ICP/CPP combination than the pre-existing
 *    Cushing's-reflex trigger in CerebralEngine.ts (confirmed by direct trace: that trigger fires at
 *    icp>20/cpp<50; this one requires icp>35/cpp<40) -- deliberately NOT duplicating it, since
 *    Cushing's reflex's own hemodynamic/respiratory consequences are already fully modeled there and
 *    in RespiratoryEngine.ts. This engine adds the missing named clinical concept (recognizing and
 *    treating impending herniation) on top of mechanics that already existed, mirroring exactly how
 *    CerebralEngine.ts surfaces its own Cushing's-reflex transition as a narrative `events` entry,
 *    not a new accumulator contribution.
 *
 * Source: general neuroanatomy/anesthesia physiology (ketamine/benzodiazepine cerebellar-vestibular
 * signs; Guedel stages; tonsillar herniation mechanics) -- not a specific Miller's citation;
 * disclosed per this project's standing convention. All calibration constants either reuse an
 * existing established value from this codebase (ketamine 0.5, midazolam 0.03) or are disclosed,
 * reasoned estimates (the MAC-parabola peak locations, the icp/cpp/rate risk weights).
 */

export interface CerebellarInputs {
  icp?: number; // current (post-tick) ICP, mmHg -- from CerebralOutput.icp
  prevIcp?: number; // previous tick's ICP, mmHg -- from patient.icp BEFORE this tick's CerebralEngine update
  cpp?: number; // current (post-tick) CPP, mmHg -- from CerebralOutput.cpp
  prevCpp?: number; // previous tick's CPP, mmHg -- from patient.cpp BEFORE this tick's CerebralEngine update
  complianceState?: 'normal' | 'impaired' | 'exhausted';
  dt?: number; // seconds
  currentMac?: number; // combined volatile MAC (0 = awake, ~1.0 = surgical plane)
  ketamineCe?: number; // mg/L (or this codebase's existing ketamine Ce units)
  midazolamCe?: number; // mg/L
}

export interface CerebellarOutput {
  nystagmusPresent: boolean;
  nystagmusSeverity: number; // 0-1
  ataxiaIndex: number; // 0-1
  tonsillarHerniationRisk: number; // 0-1, continuous
  herniationImminent: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// Parabola on [0, span] peaking at 1.0 at span/2, zero at both ends; zero outside [0, span].
function macPeak(macNorm: number, span: number): number {
  if (macNorm <= 0 || macNorm >= span) return 0;
  const x = macNorm / span;
  return 4 * x * (1 - x);
}

export class CerebellarEngine {
  /**
   * Pure function, deterministic, headless, stateless -- matches BrainstemEngine.ts's shape.
   * All "previous tick" values (prevIcp/prevCpp) must be supplied by the caller from patient
   * state captured BEFORE CerebralEngine.tick()'s writeback, exactly mirroring how
   * CerebralEngine.ts itself captures `prevICP`/`prevCPP` internally for its own Cushing's-
   * reflex transition detection.
   */
  static tick(inputs: CerebellarInputs = {}): CerebellarOutput {
    const events: string[] = [];

    const icp = clamp(safeNumber(inputs.icp, 10), 0, 100);
    const prevIcp = clamp(safeNumber(inputs.prevIcp, icp), 0, 100);
    const cpp = clamp(safeNumber(inputs.cpp, 80), 0, 200);
    const prevCpp = clamp(safeNumber(inputs.prevCpp, cpp), 0, 200);
    const complianceState = inputs.complianceState || 'normal';
    const dt = Math.max(0.001, safeNumber(inputs.dt, 1));
    const currentMac = Math.max(0, safeNumber(inputs.currentMac, 0));
    const ketamineCe = Math.max(0, safeNumber(inputs.ketamineCe, 0));
    const midazolamCe = Math.max(0, safeNumber(inputs.midazolamCe, 0));

    // 1. Nystagmus: ketamine (reuses CerebralEngine.ts's ketamine CMR-boost EC50 of 0.5) plus a
    // light-plane (Guedel Stage II) volatile-anesthesia term that peaks at MAC ~0.5 and vanishes
    // by MAC 1.0 (surgical plane suppresses cerebellar-vestibular reflexes).
    const ketamineNystagmus = ketamineCe / (ketamineCe + 0.5);
    const lightPlaneNystagmus = macPeak(currentMac, 1.0);
    const nystagmusSeverity = clamp(Math.max(ketamineNystagmus, 0.6 * lightPlaneNystagmus), 0, 1);
    const nystagmusPresent = nystagmusSeverity > 0.15;

    // 2. Ataxia: midazolam (reuses ConsciousnessEngine.ts's EC50 of 0.03 for amygdalo-hippocampal
    // disruption) plus an even-lighter-plane volatile term (ataxia returns before nystagmus fully
    // resolves during emergence, so its MAC-peak window is shallower/narrower than nystagmus's).
    const benzoAtaxia = midazolamCe / (midazolamCe + 0.03);
    const emergenceAtaxia = macPeak(currentMac, 0.5);
    const ataxiaIndex = clamp(Math.max(benzoAtaxia, emergenceAtaxia), 0, 1);

    // 3. Tonsillar herniation risk: absolute ICP, rate of rise, CPP collapse, and exhausted
    // compliance compounding the risk of decompensation (Monro-Kellie: a slow rise allows partial
    // compensation a fast one does not).
    const rateOfRise = (icp - prevIcp) / dt; // mmHg/s
    const icpRiskTerm = clamp((icp - 25) / 25, 0, 1); // ramps 25 -> 50 mmHg
    const cppRiskTerm = clamp((60 - cpp) / 60, 0, 1); // ramps as CPP falls below 60 mmHg
    const rateRiskTerm = clamp(rateOfRise / 2.0, 0, 1); // >2 mmHg/s (120 mmHg/min) treated as maximal
    const complianceMultiplier = complianceState === 'exhausted' ? 1.3 : complianceState === 'impaired' ? 1.1 : 1.0;
    const tonsillarHerniationRisk = clamp(
      complianceMultiplier * (0.5 * icpRiskTerm + 0.3 * cppRiskTerm + 0.2 * rateRiskTerm),
      0,
      1
    );

    // More severe ICP/CPP combination than CerebralEngine.ts's existing Cushing's-reflex trigger
    // (icp>20/cpp<50) -- deliberately distinct, not a duplicate.
    const herniationImminent = icp > 35 && cpp < 40;
    const prevHerniationImminent = prevIcp > 35 && prevCpp < 40;

    if (herniationImminent && !prevHerniationImminent) {
      events.push(
        "🚨 EMERGENCY: Signs of impending tonsillar (cerebellar) herniation -- critically elevated ICP with collapsing cerebral perfusion pressure. Immediate ICP-directed therapy (hyperventilation, mannitol/hypertonic saline, neurosurgical decompression) is indicated."
      );
    } else if (!herniationImminent && prevHerniationImminent) {
      events.push("✅ CLINICAL UPDATE: Tonsillar herniation risk has resolved below the critical threshold.");
    }

    return {
      nystagmusPresent,
      nystagmusSeverity: parseFloat(nystagmusSeverity.toFixed(4)),
      ataxiaIndex: parseFloat(ataxiaIndex.toFixed(4)),
      tonsillarHerniationRisk: parseFloat(tonsillarHerniationRisk.toFixed(4)),
      herniationImminent,
      events
    };
  }
}
