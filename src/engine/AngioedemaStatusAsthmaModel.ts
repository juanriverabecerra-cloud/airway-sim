/**
 * Angioedema + Status Asthmaticus Model
 *
 * Two distinct, important clinical scenarios with specific anesthesia implications:
 *
 * =========================================================================
 * A. ANGIOEDEMA (particularly ACE inhibitor-induced)
 * =========================================================================
 * Angioedema is the sudden, severe, potentially life-threatening swelling of deep
 * dermal, subcutaneous, or submucosal tissues. CRITICALLY DIFFERENT FROM ANAPHYLAXIS:
 *
 * HISTAMINE-MEDIATED ANGIOEDEMA (IgE-mediated, type I allergy):
 *   - Part of anaphylaxis reaction (already modeled)
 *   - Responds to EPINEPHRINE, antihistamines, steroids
 *   - Upper airway: laryngeal edema, uvular swelling
 *
 * BRADYKININ-MEDIATED ANGIOEDEMA (the dangerous one):
 *   - ACE inhibitor-induced (most common) — affects 0.1-0.5% of ACE-I patients
 *     Mechanism: ACE normally degrades bradykinin. ACE-I → bradykinin accumulates →
 *     B2 receptor activation → vasodilation and edema in skin/mucosa (face, tongue,
 *     lips, larynx, intestinal wall)
 *   - Hereditary angioedema (HAE) — C1-esterase inhibitor deficiency (C1-INH)
 *     Mechanism: low C1-INH → uncontrolled complement activation → bradykinin generation
 *     Triggers: trauma, surgery, estrogen, ACE inhibitors, anxiety
 *   - Acquired C1-INH deficiency (B-cell lymphomas)
 *
 * KEY TEACHING POINT: BRADYKININ-MEDIATED ANGIOEDEMA DOES NOT RESPOND TO EPINEPHRINE,
 * ANTIHISTAMINES, OR STEROIDS. This is a life-threatening trap.
 *
 * SPECIFIC TREATMENTS:
 * - ACE-I angioedema: C1-INH concentrate, icatibant (B2 receptor antagonist), or
 *   fresh frozen plasma (contains complement factors including kinin-degrading enzymes)
 * - HAE: C1-INH concentrate (Berinert, Cinryze), icatibant (Firazyr),
 *   ecallantide (plasma kallikrein inhibitor), or FFP
 *
 * ANESTHESIA IMPLICATIONS:
 * - HAE: perioperative attacks in 30% even with prophylaxis. MANDATORY prophylaxis
 *   with C1-INH or icatibant. ALL intubations with C1-INH ready.
 * - ACE-I induced: 50% progress to airway compromise. EARLY intubation before edema
 *   closes airway. Expect progressive difficulty over hours.
 * - Both types: NO role for epinephrine/steroids/antihistamines (may delay appropriate Tx)
 *
 * =========================================================================
 * B. STATUS ASTHMATICUS
 * =========================================================================
 * Severe, life-threatening asthma attack that does not respond to initial bronchodilators.
 * Key failure modes: severe obstruction → dynamic hyperinflation → air-trapping →
 * auto-PEEP → decreased venous return → hypotension → PEA arrest.
 *
 * PATHOPHYSIOLOGY SPECIFIC TO ANESTHESIA:
 * 1. DYNAMIC HYPERINFLATION:
 *    Severe bronchospasm → prolonged expiration → incomplete exhalation before next breath
 *    → air-trapping → rising intrinsic PEEP (auto-PEEP)
 *    Auto-PEEP effect: functionally like high PEEP → ↓ venous return → ↓ CO → ↓ MAP
 *    In MECHANICALLY VENTILATED patients: LIFE-THREATENING (cannot see auto-PEEP without
 *    specific measurement)
 *    Signs: rising PIP/Pplat, declining TV despite same RR/TV settings, hypotension
 *    Emergency management: DISCONNECT patient from ventilator → allow exhalation
 *
 * 2. TREATMENT ESCALATION:
 *    Level 1: Inhaled albuterol (already in DB) + ipratropium (already in DB)
 *    Level 2: Systemic magnesium sulfate (bronchial smooth muscle relaxation)
 *    Level 3: IV ketamine (bronchodilator + sedative for intubation)
 *    Level 4: Heliox (helium/oxygen mixture, reduces turbulence in narrow airways)
 *    Level 5: Isoflurane/halothane by inhalation (potent bronchodilators)
 *    Level 6: ECMO (only if respiratory arrest + refractory)
 *
 * Sources: McFadden ER, NEJM 1994; Brenner BE, Curr Opin Crit Care 2009 (status asthmaticus);
 * Cicardi M, NEJM 2018; Farkas J, MedCritical review 2020 (angioedema).
 */

export interface AngioedemaAsthmaInputs {
  // Angioedema
  aceInhibitorActive?: boolean;        // taking ACE inhibitor (lisinopril, enalapril, etc.)
  hasHAE?: boolean;                    // hereditary angioedema (C1-INH deficiency)
  angioedemaPresent?: boolean;         // active angioedema episode
  angioedemaMinutesSince?: number;     // progression timing
  c1InhConcentrateCe?: number;         // C1-INH concentrate (treatment)
  icatibantCe?: number;                // bradykinin B2 receptor antagonist
  epinephrineCeForAngioedema?: number; // WILL NOT HELP (but patient may receive it)

  // Status Asthmaticus
  statusAsthmaticusActive?: boolean;
  statusAsthmaticusMinutesSince?: number;
  ventilatedDuringAsthma?: boolean;    // on mechanical ventilation
  currentRawPIP?: number;             // peak inspiratory pressure
  currentPeep?: number;

  // Drugs for asthma
  albuterolCe?: number;
  ipratropiumCe?: number;
  magnesiumCeForAsthma?: number;      // IV Mg for status asthmaticus
  ketamineCeForAsthma?: number;
  helioxActive?: boolean;             // helium/O2 mixture

  // Event guards
  prevAngioedemaLogged?: boolean;
  prevAngioedemaAirwayLogged?: boolean;
  prevStatusAsthmaLogged?: boolean;
  prevAutoPEEPLogged?: boolean;
}

export interface AngioedemaAsthmaOutput {
  // Angioedema
  angioedemaActive: boolean;
  angioedemaAirwayScore: number;      // 0-1 (upper airway obstruction from edema)
  uppperAirwayResistancePenalty: number; // cmH2O/L/s
  bradykininMediated: boolean;        // epinephrine WILL NOT WORK
  epinephrineFutile: boolean;         // patient receiving epi but it won't help bradykinin type
  c1InhEfficacy: number;              // 0-1 treatment response
  icatibantEfficacy: number;

  // Status Asthmaticus
  statusAsthmaActive: boolean;
  bronchospasmSeverity: number;       // 0-1
  autoPEEPEstimate: number;           // cmH2O (intrinsic PEEP from air trapping)
  autoPEEPCOImpact: number;           // fractional CO reduction from auto-PEEP
  bronchodilatorEfficacy: number;     // 0-1 combined drug effect
  recommendHeliumMixture: boolean;

  prevAngioedemaLogged: boolean;
  prevAngioedemaAirwayLogged: boolean;
  prevStatusAsthmaLogged: boolean;
  prevAutoPEEPLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AngioedemaStatusAsthmaModel {
  static tick(inputs: AngioedemaAsthmaInputs = {}): AngioedemaAsthmaOutput {
    const events: string[] = [];
    let prevAngioedemaLogged = !!inputs.prevAngioedemaLogged;
    let prevAngioedemaAirwayLogged = !!inputs.prevAngioedemaAirwayLogged;
    let prevStatusAsthmaLogged = !!inputs.prevStatusAsthmaLogged;
    let prevAutoPEEPLogged = !!inputs.prevAutoPEEPLogged;

    // ===========================
    // ANGIOEDEMA
    // ===========================
    const aceActive = !!inputs.aceInhibitorActive;
    const hasHAE = !!inputs.hasHAE;
    const angioActive = !!inputs.angioedemaPresent;
    const angioMinutes = clamp(safeNumber(inputs.angioedemaMinutesSince, 0), 0, 1440);
    const c1InhCe = clamp(safeNumber(inputs.c1InhConcentrateCe, 0), 0, 10);
    const icatibantCe = clamp(safeNumber(inputs.icatibantCe, 0), 0, 10);
    const epiForAngioedema = clamp(safeNumber(inputs.epinephrineCeForAngioedema, 0), 0, 5);

    const bradykininMediated = aceActive || hasHAE;
    const epinephrineFutile = bradykininMediated && epiForAngioedema > 0;

    // Edema progression (bradykinin type peaks 12-24h; HAE unpredictable)
    const progressionFactor = angioActive
      ? Math.min(1.0, angioMinutes / (hasHAE ? 120 : 180)) // faster in HAE
      : 0;

    // Treatment efficacy
    const c1InhEfficacy = c1InhCe > 0 ? clamp(c1InhCe / (c1InhCe + 0.5) * 0.90, 0, 0.90) : 0;
    const icatibantEfficacy = icatibantCe > 0 ? clamp(icatibantCe / (icatibantCe + 0.3) * 0.80, 0, 0.80) : 0;
    const combinedEfficacy = clamp(c1InhEfficacy + icatibantEfficacy, 0, 0.95);

    const angioedemaAirwayScore = angioActive
      ? clamp(progressionFactor * (1 - combinedEfficacy), 0, 1.0) : 0;
    const uppperAirwayResistancePenalty = angioedemaAirwayScore * 60; // cmH2O/L/s (massive if severe)

    if (angioActive && angioedemaAirwayScore > 0.2 && !prevAngioedemaLogged) {
      events.push(
        `🚨 ANGIOEDEMA${bradykininMediated ? ` (${aceActive ? 'ACE INHIBITOR' : 'HEREDITARY'} — BRADYKININ-MEDIATED)` : ''}: Progressive swelling of tongue, lips, uvula, and larynx. ${bradykininMediated ? '⚠️ CRITICAL: This is BRADYKININ-MEDIATED — EPINEPHRINE, ANTIHISTAMINES, AND STEROIDS WILL NOT WORK (they target histamine, not bradykinin). SPECIFIC TREATMENTS: C1-INH concentrate (Berinert/Cinryze) OR Icatibant (Firazyr) OR Fresh Frozen Plasma. AIRWAY IS THE PRIORITY.' : 'Histamine-mediated: epinephrine, steroids, and antihistamines effective.'} AIRWAY MANAGEMENT: EARLY intubation before edema progresses — delay = impossible intubation. Video laryngoscopy; fiberoptic bronchoscope; surgical airway ready. Once laryngeal edema closes airway, CICO management required.`,
      );
      prevAngioedemaLogged = true;
    }

    if (angioedemaAirwayScore > 0.6 && !prevAngioedemaAirwayLogged) {
      events.push(
        `🚨 CRITICAL ANGIOEDEMA — IMPENDING AIRWAY LOSS: ${(angioedemaAirwayScore * 100).toFixed(0)}% airway obstruction from progressive edema. AIRWAY IS CLOSING. INTUBATE NOW if not already done: video laryngoscopy, have fiberoptic ready, HAVE SURGICAL AIRWAY KIT at bedside. If patient can still cooperate: AWAKE INTUBATION preferred (edema may worsen with sedation). Tracheostomy may be needed if endotracheal intubation impossible.`,
      );
      prevAngioedemaAirwayLogged = true;
    }

    // ===========================
    // STATUS ASTHMATICUS
    // ===========================
    const statusActive = !!inputs.statusAsthmaticusActive;
    const statusMinutes = clamp(safeNumber(inputs.statusAsthmaticusMinutesSince, 0), 0, 10000);
    const isVentilated = !!inputs.ventilatedDuringAsthma;
    const albuCe = clamp(safeNumber(inputs.albuterolCe, 0), 0, 5);
    const ipraCe = clamp(safeNumber(inputs.ipratropiumCe, 0), 0, 5);
    const magCe = clamp(safeNumber(inputs.magnesiumCeForAsthma, 0), 0, 10);
    const ketCe = clamp(safeNumber(inputs.ketamineCeForAsthma, 0), 0, 5);
    const helioxActive = !!inputs.helioxActive;

    // Severity increases without treatment; maximum at untreated 2h
    const untreatedSeverity = statusActive ? Math.min(1.0, statusMinutes / 120) : 0;

    // Bronchodilator efficacy (multiple drug classes — additive up to ceiling)
    const albuEffect = albuCe > 0 ? clamp(albuCe / (albuCe + 0.3) * 0.60, 0, 0.60) : 0;
    const iprEffect = ipraCe > 0 ? clamp(ipraCe / (ipraCe + 0.4) * 0.35, 0, 0.35) : 0;
    const magEffect = magCe > 0 ? clamp(magCe / (magCe + 1.0) * 0.40, 0, 0.40) : 0;
    const ketEffect = ketCe > 0 ? clamp(ketCe / (ketCe + 0.5) * 0.30, 0, 0.30) : 0;
    const helixEffect = helioxActive ? 0.20 : 0;
    const bronchodilatorEfficacy = clamp(albuEffect + iprEffect + magEffect + ketEffect + helixEffect, 0, 0.90);

    const bronchospasmSeverity = clamp(untreatedSeverity * (1 - bronchodilatorEfficacy), 0, 1.0);
    const statusAsthmaActive = statusActive && bronchospasmSeverity > 0.1;

    // Auto-PEEP from air trapping (depends on severity and ventilation)
    const autoPEEPEstimate = isVentilated && statusAsthmaActive
      ? clamp(bronchospasmSeverity * 20, 0, 25) // up to 25 cmH2O auto-PEEP
      : 0;

    // Auto-PEEP reduces venous return → CO falls
    const autoPEEPCOImpact = clamp(autoPEEPEstimate / 25 * 0.5, 0, 0.50);

    const recommendHeliumMixture = statusAsthmaActive && bronchospasmSeverity > 0.5 && !helioxActive;

    if (statusAsthmaActive && !prevStatusAsthmaLogged) {
      events.push(
        `🚨 STATUS ASTHMATICUS: Severe bronchospasm unresponsive to initial treatment. Bronchospasm severity: ${(bronchospasmSeverity * 100).toFixed(0)}%. ESCALATION PROTOCOL: (1) Continuous albuterol neb (20mg/hr) + ipratropium; (2) MgSO4 2g IV over 20 min (smooth muscle relaxation via Ca2+ antagonism); (3) Ketamine 1-2 mg/kg IV (bronchodilator + allows safe intubation — BEST induction agent for bronchospasm); (4) Heliox (70% He/30% O2): turbulent → laminar flow in narrowed airways → reduces work of breathing; (5) Isoflurane/sevoflurane (volatile bronchodilators if on ventilator); (6) ECMO if respiratory arrest. IF VENTILATING: allow prolonged expiration (I:E 1:3 to 1:5), avoid overinflation — dynamic hyperinflation → auto-PEEP → hypotension (disconnect from vent and allow exhalation if BP drops acutely on vent).`,
      );
      prevStatusAsthmaLogged = true;
    }

    if (autoPEEPEstimate > 10 && isVentilated && !prevAutoPEEPLogged) {
      events.push(
        `⚠️ AUTO-PEEP (DYNAMIC HYPERINFLATION): Estimated intrinsic PEEP ${autoPEEPEstimate.toFixed(0)} cmH2O from severe air-trapping in status asthmaticus. Reduces venous return → CO drops ${(autoPEEPCOImpact * 100).toFixed(0)}%. Signs: rising PIP/Pplat despite stable settings, hypotension worsening with each ventilator breath. EMERGENCY: DISCONNECT PATIENT FROM VENTILATOR → allow passive complete exhalation (30-60 sec) → CO and BP will dramatically improve. Then reduce RR (8-10/min) and allow longer expiratory time (I:E 1:3 to 1:5). Consider paralysis to eliminate patient's respiratory drive (if agitation worsening hyperinflation).`,
      );
      prevAutoPEEPLogged = true;
    }
    if (autoPEEPEstimate < 5) prevAutoPEEPLogged = false;

    return {
      angioedemaActive: angioActive,
      angioedemaAirwayScore: parseFloat(angioedemaAirwayScore.toFixed(4)),
      uppperAirwayResistancePenalty: parseFloat(uppperAirwayResistancePenalty.toFixed(1)),
      bradykininMediated,
      epinephrineFutile,
      c1InhEfficacy: parseFloat(c1InhEfficacy.toFixed(4)),
      icatibantEfficacy: parseFloat(icatibantEfficacy.toFixed(4)),
      statusAsthmaActive,
      bronchospasmSeverity: parseFloat(bronchospasmSeverity.toFixed(4)),
      autoPEEPEstimate: parseFloat(autoPEEPEstimate.toFixed(1)),
      autoPEEPCOImpact: parseFloat(autoPEEPCOImpact.toFixed(4)),
      bronchodilatorEfficacy: parseFloat(bronchodilatorEfficacy.toFixed(4)),
      recommendHeliumMixture,
      prevAngioedemaLogged,
      prevAngioedemaAirwayLogged,
      prevStatusAsthmaLogged,
      prevAutoPEEPLogged,
      events,
    };
  }
}
