/**
 * Digoxin Toxicity Model
 *
 * Digoxin has the narrowest therapeutic window of any drug in common clinical use.
 * Therapeutic serum level: 0.5-2.0 ng/mL; toxic: >2.0 ng/mL (but toxicity can occur
 * at "therapeutic" levels if hypokalemia or hypomagnesemia is present).
 *
 * === MECHANISM ===
 * Digoxin inhibits Na+/K+-ATPase → intracellular Na+ ↑ → Na+/Ca2+ exchanger reverses
 * → intracellular Ca2+ ↑ → increased cardiac contractility (inotropy).
 * Conduction effects: vagotonic → slows SA and AV nodal conduction (rate control in AF).
 * Toxicity: excess Na+/K+-ATPase inhibition → severe electrolyte derangements +
 * triggered automaticity (DADs = delayed afterdepolarizations → arrhythmias).
 *
 * === SENSITIZING FACTORS (toxicity at "therapeutic" levels) ===
 * HYPOKALEMIA is the #1 sensitizer: K+ normally competes with digoxin for
 * Na+/K+-ATPase binding sites. Low K+ → more binding sites available → higher
 * pharmacodynamic effect at same serum concentration.
 * Clinical rule: digoxin toxicity occurs at LOWER serum levels when K+ is low.
 * Target K+ 4.0-5.0 mEq/L in digoxin-treated patients (narrow therapeutic window).
 *
 * Other sensitizers: hypomagnesemia, hypercalcemia, hypothyroidism, renal insufficiency
 * (digoxin is 70-80% renally excreted unchanged; dose reduce in renal failure).
 *
 * === CLINICAL MANIFESTATIONS ===
 * GI (earliest): nausea, vomiting, anorexia, abdominal pain
 * CNS: visual disturbances (xanthopsia = yellow vision, green halos around lights),
 *      fatigue, confusion, delirium
 * CARDIAC (most dangerous): nearly ANY arrhythmia (the "arrhythmia box")
 *   - Most pathognomonic: PAT with block (paroxysmal atrial tachycardia with 2:1 AV block)
 *   - Bidirectional ventricular tachycardia (alternating QRS axis — very specific for digoxin)
 *   - AV nodal blocks (1st, 2nd, 3rd degree)
 *   - Multiple PVCs / bigeminy / trigeminy (triggered automaticity)
 *   - VF/cardiac arrest at very high levels
 *
 * === DIGOXIN TOXICITY LEVELS (rough correlation) ===
 * Ce proxy 0-1.5: therapeutic (rate control, mild inotropy)
 * Ce 1.5-2.5: mild toxicity (GI symptoms, bradycardia, 1st degree AVB)
 * Ce 2.5-4.0: moderate toxicity (PVCs, bigeminy, junctional rhythms, AV block)
 * Ce >4.0: severe toxicity (VT, VF risk, hyperkalemia from Na/K-ATPase failure)
 *
 * === TREATMENT ===
 * 1. HOLD DIGOXIN
 * 2. CORRECT HYPOKALEMIA aggressively (K+ target 4.0-5.5 in toxicity)
 * 3. CORRECT HYPOMAGNESEMIA (Mg2+ stabilizes Na+/K+-ATPase)
 * 4. DIGOXIN IMMUNE FAB (Digibind/DigiFab): specific antibody fragments bind digoxin
 *    → immediate reversal of toxicity. Dose: 1 vial per 0.5 mg digoxin ingested,
 *    or empirically 10-20 vials for severe toxicity.
 *    CAUTION: Causes rapid K+ shift → can cause HYPOKALEMIA post-reversal.
 * 5. Arrhythmia management: lidocaine for VT; atropine/pacing for severe bradycardia.
 *    AVOID: class IA/IC antiarrhythmics (worsen toxicity), calcium (IV Ca2+ may precipitate
 *    VF in digoxin toxicity — controversial, generally avoided).
 *
 * Sources: Williamson KM, Clin Pharmacol Ther 1998; Hauptman PJ, J Am Coll Cardiol 1999;
 * Miller's 9th Ed Ch 41 (Cardiac Pharmacology).
 */

export interface DigoxinToxicityInputs {
  digoxinCe?: number;          // plasma concentration proxy (therapeutic Ce ≈ 0.5-1.5 ng/mL)
  currentK?: number;           // mEq/L (hypokalemia sensitizes to toxicity)
  currentMg?: number;          // mEq/L (hypomagnesemia sensitizes)
  currentCa?: number;          // mg/dL (hypercalcemia sensitizes)
  hasRenalInsufficiency?: boolean; // GFR < 30 → much higher digoxin levels
  digoxinFabCe?: number;       // Digibind/DigiFab reversal (sequesters digoxin)
  prevDigoxinToxLogged?: boolean;
  prevDigoxinSevereLogged?: boolean;
}

export interface DigoxinToxicityOutput {
  toxicityIndex: number;       // 0-1 (composite, accounting for sensitizers)
  toxicityActive: boolean;
  toxicitySeverity: 'none' | 'mild' | 'moderate' | 'severe';
  avBlockContribution: number; // PR interval increase (ms, positive)
  bradycardiaContribution: number; // HR delta (bpm, negative)
  pvcs_risk: number;           // 0-1 risk of PVCs/bigeminy
  bidirectional_vt_risk: number; // 0-1 (pathognomonic of severe digoxin toxicity)
  hyperkalemiaContribution: number; // mEq/L K+ elevation from Na/K-ATPase failure
  fabEfficacy: number;         // 0-1 (reversal from immune Fab)
  prevDigoxinToxLogged: boolean;
  prevDigoxinSevereLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class DigoxinToxicityModel {
  static tick(inputs: DigoxinToxicityInputs = {}): DigoxinToxicityOutput {
    const events: string[] = [];
    let prevDigoxinToxLogged = !!inputs.prevDigoxinToxLogged;
    let prevDigoxinSevereLogged = !!inputs.prevDigoxinSevereLogged;

    const digCe = clamp(safeNumber(inputs.digoxinCe, 0), 0, 20);
    const k = clamp(safeNumber(inputs.currentK, 4.0), 1.5, 8.0);
    const mg = clamp(safeNumber(inputs.currentMg, 1.8), 0, 4.0);
    const ca = clamp(safeNumber(inputs.currentCa, 9.5), 5, 16);
    const renalInsuff = !!inputs.hasRenalInsufficiency;
    const fabCe = clamp(safeNumber(inputs.digoxinFabCe, 0), 0, 20);

    // Hypokalemia multiplier: K+ < 3.5 progressively amplifies digoxin effect
    const hypokalemiaMult = k < 3.5
      ? 1.0 + (3.5 - k) * 0.8  // +0.8 per mEq/L below 3.5 (up to 2.6× at K=2.5)
      : k > 5.0 ? 0.7 : 1.0;   // Hyperkalemia is partially protective

    const hypomagMult = mg < 1.5 ? 1.0 + (1.5 - mg) * 0.4 : 1.0;
    const hypercalcMult = ca > 11.0 ? 1.0 + (ca - 11.0) * 0.1 : 1.0;
    const renalMult = renalInsuff ? 1.5 : 1.0; // renally excreted → accumulates

    // Effective digoxin activity
    const effectiveDig = digCe * hypokalemiaMult * hypomagMult * hypercalcMult * renalMult;

    // Digoxin immune Fab reversal (sequesters free digoxin rapidly)
    const fabEfficacy = fabCe > 0 ? clamp(fabCe / (fabCe + 0.5) * 0.98, 0, 0.98) : 0;
    const netEffectiveDig = effectiveDig * (1 - fabEfficacy);

    // Toxicity classification
    let toxicityIndex: number;
    let toxicitySeverity: 'none' | 'mild' | 'moderate' | 'severe';

    if (netEffectiveDig < 1.5) {
      toxicityIndex = 0;
      toxicitySeverity = 'none';
    } else if (netEffectiveDig < 2.5) {
      toxicityIndex = clamp((netEffectiveDig - 1.5) / 1.0, 0, 1);
      toxicitySeverity = 'mild';
    } else if (netEffectiveDig < 4.0) {
      toxicityIndex = clamp(0.5 + (netEffectiveDig - 2.5) / 3.0, 0, 1);
      toxicitySeverity = 'moderate';
    } else {
      toxicityIndex = clamp(0.75 + (netEffectiveDig - 4.0) / 8.0, 0.75, 1.0);
      toxicitySeverity = 'severe';
    }

    const toxicityActive = toxicityIndex > 0.1;

    // Cardiac effects
    const avBlockContribution = toxicityActive ? clamp(toxicityIndex * 120, 0, 150) : 0; // ms PR increase
    const bradycardiaContribution = toxicityActive ? -clamp(toxicityIndex * 40, 0, 50) : 0; // bpm
    const pvcs_risk = toxicityIndex > 0.3 ? clamp((toxicityIndex - 0.3) / 0.7, 0, 1) : 0;
    const bidirectional_vt_risk = toxicityIndex > 0.75 ? clamp((toxicityIndex - 0.75) / 0.25 * 0.5, 0, 0.5) : 0;

    // Severe toxicity: Na+/K+-ATPase failure → K+ cannot enter cells → hyperkalemia
    const hyperkalemiaContribution = toxicityIndex > 0.6
      ? clamp((toxicityIndex - 0.6) * 3.0, 0, 2.5) // up to +2.5 mEq/L
      : 0;

    // Events
    if (toxicityActive && toxicitySeverity !== 'none' && !prevDigoxinToxLogged) {
      const sensitizers = [];
      if (k < 3.5) sensitizers.push(`K⁺ ${k.toFixed(1)} mEq/L (HYPOKALEMIA — major sensitizer)`);
      if (mg < 1.5) sensitizers.push(`Mg²⁺ ${mg.toFixed(1)} mEq/L (hypomagnesemia)`);
      if (renalInsuff) sensitizers.push('renal insufficiency (↓ digoxin clearance)');
      events.push(
        `⚠️ DIGOXIN TOXICITY (${toxicitySeverity.toUpperCase()}): Effective digoxin activity ${netEffectiveDig.toFixed(1)}× threshold. ${sensitizers.length > 0 ? `Sensitizing factors: ${sensitizers.join(', ')}. ` : ''}Manifestations: GI (nausea, vomiting, anorexia), visual (xanthopsia, green/yellow halos), cardiac (bradycardia, AV block, PVCs, bigeminy). MANAGEMENT: (1) HOLD DIGOXIN; (2) Correct K⁺ to 4.0-5.5 mEq/L (aggressive KCl replacement); (3) Correct Mg²⁺; (4) ECG monitoring for arrhythmias; (5) DIGOXIN IMMUNE FAB (Digibind): 1 vial per 0.5 mg digoxin × 10 vials empirically for moderate/severe toxicity — immediate reversal within minutes. CAUTION: Digibind causes rapid K⁺ shift → post-reversal hypokalemia; monitor K⁺ closely after treatment.`,
      );
      prevDigoxinToxLogged = true;
    }

    if (toxicityIndex > 0.75 && !prevDigoxinSevereLogged) {
      events.push(
        `🚨 SEVERE DIGOXIN TOXICITY: Bidirectional VT risk, ventricular fibrillation risk. DIGOXIN IMMUNE FAB 10-20 vials IV STAT. AVOID: Class IA/IC antiarrhythmics (worsen), IV calcium (may precipitate VF — controversial, generally avoid). For bradyarrhythmia: atropine, temporary pacing. For VT: lidocaine 1.5 mg/kg IV. Hyperkalemia from Na+/K+-ATPase failure — treat with glucose/insulin (NOT sodium bicarbonate alone). CAUTION: After Digibind, K⁺ may drop precipitously as Na+/K+-ATPase recovers.`,
      );
      prevDigoxinSevereLogged = true;
    }

    if (!toxicityActive) {
      prevDigoxinToxLogged = false;
      prevDigoxinSevereLogged = false;
    }

    return {
      toxicityIndex: parseFloat(toxicityIndex.toFixed(4)),
      toxicityActive,
      toxicitySeverity,
      avBlockContribution: parseFloat(avBlockContribution.toFixed(1)),
      bradycardiaContribution: parseFloat(bradycardiaContribution.toFixed(1)),
      pvcs_risk: parseFloat(pvcs_risk.toFixed(4)),
      bidirectional_vt_risk: parseFloat(bidirectional_vt_risk.toFixed(4)),
      hyperkalemiaContribution: parseFloat(hyperkalemiaContribution.toFixed(3)),
      fabEfficacy: parseFloat(fabEfficacy.toFixed(4)),
      prevDigoxinToxLogged,
      prevDigoxinSevereLogged,
      events,
    };
  }
}
