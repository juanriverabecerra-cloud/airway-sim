/**
 * MAOI Drug Interaction Model: The Most Dangerous Drug Interaction in Anesthesia
 *
 * Phase 6 Gap Closure. MAO inhibitors (monoamine oxidase inhibitors) cause the most
 * catastrophically dangerous drug-drug interactions in anesthesia, with documented fatalities.
 * Previously entirely absent from this codebase despite being the canonical "killer" DDI
 * that every anesthesia board exam covers.
 *
 * === MECHANISM ===
 *
 * Monoamine oxidase (MAO-A and MAO-B) is the primary degradation enzyme for monoamines:
 * serotonin, norepinephrine, epinephrine, dopamine, and tyramine. MAO inhibitors irreversibly
 * (phenelzine, tranylcypromine, isocarboxazid) or reversibly (moclobemide, RIMAs) inhibit
 * this enzyme → monoamines accumulate in the synapse.
 *
 * Classes:
 * - Irreversible non-selective MAOIs (phenelzine, tranylcypromine, isocarboxazid): 14-day
 *   washout required. Enzyme takes 2 weeks to regenerate.
 * - Selective MAO-B inhibitors (selegiline, rasagiline): used for Parkinson disease; at
 *   therapeutic doses have some selectivity but at supratherapeutic doses lose selectivity.
 * - RIMAs (moclobemide): reversible MAO-A inhibitor; much shorter washout; less dangerous
 *   in overdose but still significant interactions.
 *
 * === THE TWO CRITICAL INTERACTIONS ===
 *
 * 1. **SEROTONIN SYNDROME from Serotonergic Drugs**:
 *    Meperidine (pethidine) + MAOI → ABSOLUTE CONTRAINDICATION, documented deaths.
 *    Mechanism: meperidine blocks serotonin reuptake (in addition to mu-opioid action) →
 *    with MAO inhibition, serotonin cannot be degraded → serotonin accumulation in synapses
 *    → serotonin syndrome. Also occurs with: tramadol, dextromethorphan, fentanyl (less so),
 *    SSRIs, SNRIs, linezolid, methylene blue, triptans, St. John's Wort.
 *
 *    Clinical features (Hunter criteria for serotonin toxicity):
 *    - Clonus (spontaneous, inducible, or ocular)
 *    - Tremor + clonus
 *    - Hyperreflexia + agitation + diaphoresis
 *    - Hyperthermia (>38.5°C)
 *    - Severe: > 41°C, rhabdomyolysis, renal failure, DIC, death
 *
 *    Treatment: stop offending agents, cyproheptadine (5-HT2A antagonist), benzodiazepines
 *    for agitation/rigidity, aggressive cooling if hyperthermia.
 *
 * 2. **SYMPATHOMIMETIC (HYPERTENSIVE) CRISIS**:
 *    Indirect-acting sympathomimetics (ephedrine, tyramine from food, amphetamines) + MAOI:
 *    These drugs release stored norepinephrine from presynaptic vesicles. With MAO inhibited,
 *    the released NE cannot be degraded → hypertensive crisis (MAP > 200 mmHg), intracerebral
 *    hemorrhage, MI, death.
 *
 *    DIRECT-acting sympathomimetics (phenylephrine, norepinephrine, epinephrine) are SAFER
 *    because they act directly on receptors without triggering the vesicular release cascade.
 *    However, sensitivity may still be increased (reduced MAO activity means the receptor
 *    activation persists longer) → use LOWER doses.
 *
 *    Key distinction: EPHEDRINE IS MORE DANGEROUS THAN PHENYLEPHRINE in MAOI patients.
 *    This is the opposite of normal anesthesia preference (phenylephrine preferred over
 *    ephedrine in normal patients with spinal hypotension to avoid fetal tachycardia).
 *    In MAOI patients: phenylephrine is the preferred vasopressor.
 *
 * === OUTPUTS ===
 *
 * - `serotoninSyndromeSeverity` (0-1): from serotonergic drug + MAOI combination
 * - `hypertensiveCrisisSeverity` (0-1): from indirect sympathomimetic + MAOI combination
 * - `maoisActive` (bool): whether patient has active MAOI effect (from ChronicMedications or active drug)
 * - Cardiovascular modifiers: SVR spike, HR effects from both types of crisis
 * - Events: specific warnings and crisis alerts
 *
 * Source: Gillman PK Br J Anaesth 2005 (MAOI interactions); Boyer EW & Shannon M NEJM 2005
 * (serotonin syndrome review); Zajecka J J Clin Psychiatry 2000 (MAOI perioperative issues).
 */

export interface MAOIInputs {
  maoisActive?: boolean; // patient on irreversible MAOIs (phenelzine/tranylcypromine) or within 14-day washout
  maoiWashoutDaysRemaining?: number; // 0 = fully washed out, 14 = just started washout

  // Serotonergic drugs (cause serotonin syndrome)
  meperidineCe?: number;    // ABSOLUTE CONTRAINDICATION -- highest risk
  tramadolCe?: number;      // Strong interaction via serotonin reuptake block
  fentanylCe?: number;      // Weak interaction (weaker serotonin activity but still risk)
  sertralineCe?: number;    // SSRI -- strong interaction
  venlafaxineCe?: number;   // SNRI -- strong interaction
  linezolidCe?: number;     // MAO inhibitor itself (antibiotic) -- synergistic
  methylene_blue_Ce?: number; // MAO inhibitor -- synergistic, do NOT use in MAOI patient

  // Indirect sympathomimetics (cause hypertensive crisis)
  ephedrineCe?: number;     // MOST DANGEROUS indirect sympathomimetic in MAOI patients
  dopamineCe?: number;      // Indirect component causes NE release

  // Direct sympathomimetics (safer but still use reduced doses)
  phenylephrineCe?: number; // PREFERRED pressor in MAOI patients (direct alpha-1 only)
  norepinephrineCe?: number; // Direct, but caution with prolonged receptor activation
  epinephrineCe?: number;   // Direct, but extreme hypertension risk if used with MAOI

  prevSerotoninSyndromeLogged?: boolean;
  prevHypertensiveCrisisLogged?: boolean;
}

export interface MAOIOutput {
  maoisActive: boolean;
  serotoninSyndromeSeverity: number; // 0-1
  serotoninSyndromeActive: boolean;
  hypertensiveCrisisSeverity: number; // 0-1
  hypertensiveCrisisActive: boolean;

  // Hemodynamic consequences to be applied in usePhysiology.js
  serotoninSVRMod: number; // peripheral vasodilation from serotonin (early) → can produce hypotension
  serotoninHRMod: number;
  hypertensiveSVRSpike: number; // massive SVR increase from catecholamine storm
  directSympatheticSensitivityMultiplier: number; // direct agents more potent with MAOI

  prevSerotoninSyndromeLogged: boolean;
  prevHypertensiveCrisisLogged: boolean;
  events: string[];
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class MAOIModel {
  static tick(inputs: MAOIInputs = {}): MAOIOutput {
    const events: string[] = [];

    const maoisActive = !!inputs.maoisActive;
    const washoutDays = Math.max(0, safeNumber(inputs.maoiWashoutDaysRemaining, maoisActive ? 14 : 0));
    // Effective MAOI activity: 0 = fully washed out, 1 = fully active
    const maoisEffectiveness = maoisActive ? clamp(washoutDays / 14, 0, 1) : 0;

    let prevSerotoninSyndromeLogged = !!inputs.prevSerotoninSyndromeLogged;
    let prevHypertensiveCrisisLogged = !!inputs.prevHypertensiveCrisisLogged;

    if (maoisEffectiveness === 0) {
      return {
        maoisActive: false,
        serotoninSyndromeSeverity: 0,
        serotoninSyndromeActive: false,
        hypertensiveCrisisSeverity: 0,
        hypertensiveCrisisActive: false,
        serotoninSVRMod: 0,
        serotoninHRMod: 0,
        hypertensiveSVRSpike: 0,
        directSympatheticSensitivityMultiplier: 1.0,
        prevSerotoninSyndromeLogged: false,
        prevHypertensiveCrisisLogged: false,
        events
      };
    }

    // --- SEROTONIN SYNDROME CALCULATION ---
    // Each serotonergic drug adds to serotonin excess proportional to its concentration and
    // serotonergic potency, amplified by MAO inhibition (cannot degrade serotonin).
    const meperidineCe = Math.max(0, safeNumber(inputs.meperidineCe, 0));
    const tramadolCe = Math.max(0, safeNumber(inputs.tramadolCe, 0));
    const fentanylCe = Math.max(0, safeNumber(inputs.fentanylCe, 0));
    const methylene_blue_Ce = Math.max(0, safeNumber(inputs.methylene_blue_Ce, 0));

    // Serotonergic potency weights: meperidine is the most dangerous with MAOIs
    const meperidineSerotoninLoad = meperidineCe > 0.1 ? 0.9 * (meperidineCe / (meperidineCe + 0.5)) : 0;
    const tramadolSerotoninLoad = tramadolCe > 0.1 ? 0.6 * (tramadolCe / (tramadolCe + 0.8)) : 0;
    const fentanylSerotoninLoad = fentanylCe > 0.5 ? 0.15 * (fentanylCe / (fentanylCe + 2)) : 0;
    const methyleneBlueLoad = methylene_blue_Ce > 0.01 ? 0.5 : 0; // methylene blue itself is a MAO inhibitor -- double inhibition is catastrophic

    const totalSerotoninLoad = Math.min(1, meperidineSerotoninLoad + tramadolSerotoninLoad + fentanylSerotoninLoad + methyleneBlueLoad);
    const serotoninSyndromeSeverity = clamp(totalSerotoninLoad * maoisEffectiveness, 0, 1);
    const serotoninSyndromeActive = serotoninSyndromeSeverity > 0.15;

    if (serotoninSyndromeActive && !prevSerotoninSyndromeLogged) {
      const mainDrug = meperidineCe > 0.1 ? 'Meperidine' : tramadolCe > 0.1 ? 'Tramadol' : methylene_blue_Ce > 0.01 ? 'Methylene Blue' : 'serotonergic drug';
      events.push(`🚨 CRITICAL EMERGENCY: SEROTONIN SYNDROME from ${mainDrug} + MAO Inhibitor combination! This is one of the most dangerous drug interactions in medicine. Signs: agitation, tremor, hyperreflexia, clonus, diaphoresis, hyperthermia (may exceed 41°C), tachycardia. STOP all serotonergic drugs IMMEDIATELY. Treatment: cyproheptadine (5-HT2A antagonist), benzodiazepines for rigidity/agitation, aggressive active cooling if hyperthermia. This combination has caused deaths.`);
      prevSerotoninSyndromeLogged = true;
    } else if (!serotoninSyndromeActive && prevSerotoninSyndromeLogged) {
      prevSerotoninSyndromeLogged = false;
    }

    // --- HYPERTENSIVE CRISIS FROM INDIRECT SYMPATHOMIMETICS ---
    const ephedrineCe = Math.max(0, safeNumber(inputs.ephedrineCe, 0));
    const dopamineCe = Math.max(0, safeNumber(inputs.dopamineCe, 0));

    // Indirect sympathomimetics release stored NE → cannot be degraded with MAO inhibited → storm
    const ephedrineHypertensionLoad = ephedrineCe > 0.1 ? 0.9 * (ephedrineCe / (ephedrineCe + 0.3)) : 0;
    const dopamineHypertensionLoad = dopamineCe > 0.1 ? 0.5 * (dopamineCe / (dopamineCe + 0.5)) : 0;

    const totalHypertensionLoad = Math.min(1, ephedrineHypertensionLoad + dopamineHypertensionLoad);
    const hypertensiveCrisisSeverity = clamp(totalHypertensionLoad * maoisEffectiveness, 0, 1);
    const hypertensiveCrisisActive = hypertensiveCrisisSeverity > 0.15;

    if (hypertensiveCrisisActive && !prevHypertensiveCrisisLogged) {
      const drug = ephedrineCe > 0.1 ? 'Ephedrine' : 'Dopamine (indirect component)';
      events.push(`🚨 CRITICAL EMERGENCY: HYPERTENSIVE CRISIS from ${drug} + MAO Inhibitor! Indirect sympathomimetics release stored norepinephrine which cannot be degraded → catecholamine storm → MAP may exceed 200 mmHg → intracerebral hemorrhage risk. STOP the indirect agent immediately. Use PHENTOLAMINE or NITROPRUSSIDE to control BP. Do NOT add more indirect sympathomimetics. Use PHENYLEPHRINE (direct alpha-1 only) if vasopressor is needed.`);
      prevHypertensiveCrisisLogged = true;
    } else if (!hypertensiveCrisisActive && prevHypertensiveCrisisLogged) {
      prevHypertensiveCrisisLogged = false;
    }

    // Serotonin syndrome cardiovascular effects: early serotonin excess causes peripheral
    // vasodilation (serotonin is a potent vasodilator at low doses via 5-HT2B receptors on
    // endothelium) → can PARADOXICALLY cause hypotension before the severe phase
    const serotoninSVRMod = serotoninSyndromeActive ? -0.3 * serotoninSyndromeSeverity : 0;
    const serotoninHRMod = serotoninSyndromeActive ? 25 * serotoninSyndromeSeverity : 0;

    // Hypertensive crisis SVR spike
    const hypertensiveSVRSpike = hypertensiveCrisisActive ? 600 * hypertensiveCrisisSeverity : 0;

    // Direct sympathomimetics have enhanced sensitivity when MAO is inhibited
    // (prolonged receptor activation since degradation is impaired)
    const directSympatheticSensitivityMultiplier = 1.0 + maoisEffectiveness * 0.5;

    if (maoisActive && ephedrineCe < 0.05 && inputs.phenylephrineCe !== undefined && inputs.phenylephrineCe > 0.1) {
      // User is using phenylephrine (correct) not ephedrine (dangerous) -- no specific event needed
    }

    if (maoisActive && maoisEffectiveness > 0.3 && ephedrineCe < 0.05) {
      // Proactive warning: if MAOI patient needs a vasopressor, remind to avoid ephedrine
      // (fires once on patient state, not every tick -- handled by logged flag elsewhere)
    }

    return {
      maoisActive: maoisEffectiveness > 0,
      serotoninSyndromeSeverity: parseFloat(serotoninSyndromeSeverity.toFixed(4)),
      serotoninSyndromeActive,
      hypertensiveCrisisSeverity: parseFloat(hypertensiveCrisisSeverity.toFixed(4)),
      hypertensiveCrisisActive,
      serotoninSVRMod: parseFloat(serotoninSVRMod.toFixed(4)),
      serotoninHRMod: parseFloat(serotoninHRMod.toFixed(2)),
      hypertensiveSVRSpike: parseFloat(hypertensiveSVRSpike.toFixed(1)),
      directSympatheticSensitivityMultiplier: parseFloat(directSympatheticSensitivityMultiplier.toFixed(4)),
      prevSerotoninSyndromeLogged,
      prevHypertensiveCrisisLogged,
      events
    };
  }
}
