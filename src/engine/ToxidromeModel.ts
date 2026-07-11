/**
 * Toxidrome Model: Anticholinergic and Cholinergic Syndromes
 *
 * Toxidromes are clinical syndromes caused by toxic doses of drugs that act
 * through a specific receptor pathway. Two of the most perioperatively relevant
 * are the anticholinergic and cholinergic toxidromes — anesthesiologists routinely
 * encounter both, and the treatments are exact opposites of each other.
 *
 * =========================================================================
 * ANTICHOLINERGIC TOXIDROME
 * =========================================================================
 * Caused by: muscarinic receptor BLOCKADE — atropine, scopolamine, glycopyrrolate
 *   (all at excessive doses), diphenhydramine, promethazine, some antidepressants
 *   (TCAs), some antipsychotics, some plants (Belladonna, Jimson weed).
 *
 * Classic mnemonic: "Mad as a hatter, hot as a hare, red as a beet,
 *                    dry as a bone, blind as a bat, bowel and bladder lost their tone"
 *
 * SIGNS AND MECHANISMS:
 * - Tachycardia: loss of vagal tone (M2 receptor blockade in SA node) → HR ↑↑
 * - Hyperthermia: anhidrosis (no sweating → cannot dissipate heat)
 * - Flushing/vasodilatation: cutaneous vasodilation (mechanism unclear, possibly
 *   direct effect on vascular smooth muscle or central thermoregulatory disruption)
 * - Dry skin and mucous membranes: loss of salivary (M3), lacrimal, bronchial, and
 *   eccrine sweat gland secretions (all M3-mediated)
 * - Mydriasis (dilated pupils): M3 blockade → pupillary sphincter paralysis →
 *   sympathetic dominance → dilation
 * - Urinary retention: M3 blockade in detrusor → loss of bladder contraction
 *   (ALREADY modeled in BladderModel.ts via opioid/anticholinergic urinary retention)
 * - Delirium/confusion: central muscarinic blockade (tertiary amines only —
 *   scopolamine, atropine cross BBB; glycopyrrolate does NOT due to quaternary charge)
 * - Decreased bowel sounds: GI motility inhibited (M3 blockade in enteric neurons)
 * - Tachypnea (reflex from tachycardia and hyperthermia)
 *
 * TREATMENT:
 * - Physostigmine: tertiary carbamate acetylcholinesterase inhibitor (crosses BBB)
 *   → ↑ACh concentration → overcomes anticholinergic blockade. Dose: 0.5-2 mg IV.
 *   Used specifically for CENTRAL anticholinergic syndrome (delirium). Risk: cholinergic
 *   excess if overdosed → treat with atropine.
 * - Cooling for hyperthermia
 * - Benzodiazepines for agitation (safer than physostigmine in mild cases)
 *
 * Note: Glycopyrrolate is a quaternary ammonium compound → does NOT cross BBB →
 *   NO central anticholinergic effects (no delirium). Atropine and scopolamine
 *   are tertiary → DO cross BBB.
 *
 * Sources: Goldfrank LR, Emergency Toxicology 10th ed; Minns AB, J Emerg Med 2010;
 * Burns MJ, Ann Emerg Med 2000.
 *
 * =========================================================================
 * CHOLINERGIC TOXIDROME (SLUDGE / DUMBELS)
 * =========================================================================
 * Caused by: acetylcholinesterase INHIBITION → excess ACh accumulation at all
 *   cholinergic synapses:
 *   - Organophosphate insecticides (parathion, malathion) and nerve agents (sarin, VX)
 *   - Carbamate insecticides (carbaryl, aldicarb)
 *   - Iatrogenic: neostigmine overdose (relative excess), pyridostigmine (myasthenia)
 *
 * MUSCARINIC EXCESS SIGNS (SLUDGE):
 * - Salivation (hypersalivation — M3)
 * - Lacrimation (excessive tearing — M3)
 * - Urination (incontinence — M2/M3 detrusor contraction)
 * - Defecation/Diarrhea (GI motility ↑↑ — M3)
 * - GI distress (cramping, vomiting)
 * - Emesis (M3 and direct GI effects)
 *
 * Additional muscarinic signs:
 * - Bradycardia: M2 activation in SA/AV nodes (can be severe/asystolic)
 * - Bronchospasm + hypersecretion: M3 in airways (can be LETHAL — the
 *   "killed by SLUD" phrase refers to bronchospasm + secretions filling airway)
 * - Miosis (pupillary constriction — M3, opposite of anticholinergic)
 * - Diaphoresis (excessive sweating — M3 eccrine glands)
 *
 * NICOTINIC EXCESS SIGNS (DUMBELS additional "N" = Neuromuscular):
 * - Muscle fasciculations (NMJ ACh excess)
 * - Weakness/paralysis (depolarizing blockade at NMJ — all receptors occupied)
 * - Seizures (CNS nicotinic and GABA disinhibition)
 *
 * TREATMENT — "atropine is the antidote, lots of it":
 * - Atropine 2-4 mg IV every 5-10 min (titrate to dry secretions, not to HR!)
 *   Endpoint: dry airways, not specific HR/BP target.
 *   Severe poisoning may require 10-100+ mg over hours.
 * - Pralidoxime (2-PAM): reactivates acetylcholinesterase IF given within 24-48h
 *   (before "aging" — irreversible covalent bond to enzyme).
 * - Benzodiazepines for seizures.
 * - Intubation for respiratory failure (bronchospasm + secretions).
 *
 * Sources: Eddleston M, Lancet 2008; Senanayake N, Br J Anaesth 1992;
 * Fleisher GF, Textbook of Pediatric Emergency Medicine 7th ed.
 */

export interface ToxidromeInputs {
  // Anticholinergic toxidrome
  atropineCe?: number;           // mg/L — tertiary, crosses BBB
  scopolamineCe?: number;        // mg/L — tertiary, strongest central effect
  diphenhydramineCe?: number;    // H1 antagonist with anticholinergic side effects
  promethazineCe?: number;       // phenothiazine antihistamine, anticholinergic
  glycopyrrolateCe?: number;     // quaternary — peripheral only, NO CNS effect

  // Cholinergic toxidrome
  neostigmineCe?: number;        // iatrogenic (anticholinesterase reversal agent)
  physostigmineCe?: number;      // antidote for anticholinergic; also causes cholinergic if overdosed
  edrophoniumCe?: number;        // short-acting anticholinesterase
  // Organophosphate poisoning flag (dramatic cholinergic crisis)
  organophosphatePoisoning?: boolean;
  organophosphateConcentration?: number; // 0-1 (proxy for severity)

  // Current vitals for effect amplification
  currentHR?: number;
  currentTemp?: number;
  currentSpO2?: number;

  // Event guards
  prevAnticholinLogged?: boolean;
  prevCholinergicLogged?: boolean;
  prevCholinergicSevereLogged?: boolean;
}

export interface ToxidromeOutput {
  // Anticholinergic
  anticholinergicIndex: number;         // 0-1 severity
  anticholinergicActive: boolean;
  centralAnticholinergicActive: boolean; // glycopyrrolate excluded
  anticholinergicHREffect: number;       // bpm (tachycardia)
  anticholinergicTempEffect: number;     // °C (hyperthermia from anhidrosis)
  anticholinergicSVREffect: number;      // fractional change (vasodilation/flush)
  deliriumRisk: number;                  // 0-1 (central anticholinergic)
  physostigmineEfficacy: number;         // 0-0.9 (reversal of central anticholinergic)

  // Cholinergic
  cholinergicIndex: number;             // 0-1 severity
  cholinergicActive: boolean;
  cholinergicHREffect: number;           // bpm (bradycardia, negative)
  cholinergicBronchospasmContribution: number; // 0-1 (added to bronchialSmoothMuscleCa)
  cholinergicSecretionIndex: number;     // 0-1 (airway secretions, feeds resistance)
  cholinergicResistancePenalty: number;  // cmH2O/L/s (bronchospasm + secretions)
  cholinergicSVREffect: number;          // fractional (vasodilation from M2/M3)
  nmjDepolarizingBlock: number;          // 0-1 (nicotinic excess → depolarizing block)
  atropineEfficacy: number;              // 0-1 (muscarinic coverage from atropine)

  prevAnticholinLogged: boolean;
  prevCholinergicLogged: boolean;
  prevCholinergicSevereLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ToxidromeModel {
  static tick(inputs: ToxidromeInputs = {}): ToxidromeOutput {
    const events: string[] = [];
    let prevAnticholinLogged = !!inputs.prevAnticholinLogged;
    let prevCholinergicLogged = !!inputs.prevCholinergicLogged;
    let prevCholinergicSevereLogged = !!inputs.prevCholinergicSevereLogged;

    const atropCe = clamp(safeNumber(inputs.atropineCe, 0), 0, 20);
    const scopCe = clamp(safeNumber(inputs.scopolamineCe, 0), 0, 10);
    const diphCe = clamp(safeNumber(inputs.diphenhydramineCe, 0), 0, 20);
    const promCe = clamp(safeNumber(inputs.promethazineCe, 0), 0, 10);
    const glycCe = clamp(safeNumber(inputs.glycopyrrolateCe, 0), 0, 10);
    const neostCe = clamp(safeNumber(inputs.neostigmineCe, 0), 0, 10);
    const physCe = clamp(safeNumber(inputs.physostigmineCe, 0), 0, 10);
    const edrosCe = clamp(safeNumber(inputs.edrophoniumCe, 0), 0, 10);
    const opPoisoning = !!inputs.organophosphatePoisoning;
    const opConc = clamp(safeNumber(inputs.organophosphateConcentration, 0), 0, 1);
    const currentHR = clamp(safeNumber(inputs.currentHR, 80), 20, 220);
    const currentTemp = clamp(safeNumber(inputs.currentTemp, 37), 32, 43);

    // ===========================
    // ANTICHOLINERGIC TOXIDROME
    // ===========================
    // Weighted sum of anticholinergic activity:
    // Atropine therapeutic: 0.4-0.6 mg; toxic: > 2 mg; these are plasma Ce proxies
    const anticholinergicBurden =
      clamp(atropCe / 2.0, 0, 1) * 1.0    // Atropine: moderate potency, crosses BBB
      + clamp(scopCe / 0.5, 0, 1) * 1.5   // Scopolamine: highest CNS penetration
      + clamp(diphCe / 3.0, 0, 1) * 0.5   // Diphenhydramine: moderate anticholinergic
      + clamp(promCe / 2.0, 0, 1) * 0.4   // Promethazine: phenothiazine
      + clamp(glycCe / 2.0, 0, 1) * 0.7;  // Glycopyrrolate: peripheral only

    const anticholinergicIndex = clamp(anticholinergicBurden / 3.0, 0, 1.0);
    const anticholinergicActive = anticholinergicIndex > 0.2;

    // Central anticholinergic (BBB-crossing agents only — no glycopyrrolate)
    const centralAnticholinBurden =
      clamp(atropCe / 2.0, 0, 1) * 1.0
      + clamp(scopCe / 0.5, 0, 1) * 1.5
      + clamp(diphCe / 3.0, 0, 1) * 0.4
      + clamp(promCe / 2.0, 0, 1) * 0.3;
    const centralAnticholinergicActive = centralAnticholinBurden > 0.3;

    // Hemodynamic effects
    const anticholinergicHREffect = anticholinergicActive
      ? clamp(anticholinergicIndex * 60, 0, 80) // Up to +80 bpm tachycardia
      : 0;
    const anticholinergicTempEffect = anticholinergicActive
      ? clamp(anticholinergicIndex * 3.5, 0, 4.0) // Hyperthermia from anhidrosis
      : 0;
    const anticholinergicSVREffect = anticholinergicActive
      ? -clamp(anticholinergicIndex * 0.20, 0, 0.20) // Mild vasodilation/flushing
      : 0;
    const deliriumRisk = centralAnticholinergicActive
      ? clamp(centralAnticholinBurden / 2.0, 0, 1.0)
      : 0;

    // Physostigmine reversal of central anticholinergic
    const physostigmineEfficacy = physCe > 0
      ? clamp(physCe / (physCe + 0.3) * 0.9, 0, 0.9)
      : 0;

    if (anticholinergicActive && anticholinergicIndex > 0.4 && !prevAnticholinLogged) {
      const bbCrossers = [];
      if (atropCe > 0.5) bbCrossers.push(`Atropine (Ce ${atropCe.toFixed(2)})`);
      if (scopCe > 0.1) bbCrossers.push(`Scopolamine (Ce ${scopCe.toFixed(2)})`);
      if (diphCe > 1.0) bbCrossers.push(`Diphenhydramine (Ce ${diphCe.toFixed(2)})`);
      if (promCe > 0.5) bbCrossers.push(`Promethazine (Ce ${promCe.toFixed(2)})`);
      const centralNote = centralAnticholinergicActive && bbCrossers.length > 0
        ? `Central anticholinergic delirium risk from BBB-crossing agents: ${bbCrossers.join(', ')}. `
        : 'Glycopyrrolate: peripheral anticholinergic only — no delirium risk. ';
      events.push(
        `⚠️ ANTICHOLINERGIC TOXIDROME (index ${(anticholinergicIndex * 100).toFixed(0)}%): "Mad as a hatter, hot as a hare, red as a beet, dry as a bone" — tachycardia (vagal block), hyperthermia (anhidrosis), flushing (vasodilation), dry mucous membranes (M3 block), mydriasis, urinary retention, ↓bowel sounds. ${centralNote}TREATMENT: Central anticholinergic syndrome (delirium) → PHYSOSTIGMINE 0.5-2 mg IV (overcomes blockade; titrate; tertiary amine crosses BBB). Cooling for hyperthermia. Benzodiazepines for agitation. Foley if urinary retention. MONITOR for anticholinergic → physostigmine-induced cholinergic excess (have atropine ready).`,
      );
      prevAnticholinLogged = true;
    }
    if (anticholinergicIndex < 0.15) prevAnticholinLogged = false;

    // ===========================
    // CHOLINERGIC TOXIDROME
    // ===========================
    // Cholinesterase inhibitor burden
    const anticholinesteraseBurden = neostCe / 2.0 + physCe / 1.5 + edrosCe / 1.5;
    const opBurden = opPoisoning ? opConc * 4.0 : 0;
    const totalCholinBurden = clamp(anticholinesteraseBurden + opBurden, 0, 5.0);

    const cholinergicIndex = clamp(totalCholinBurden / 4.0, 0, 1.0);
    const cholinergicActive = cholinergicIndex > 0.1;

    // Muscarinic effects: bradycardia, bronchospasm, secretions, vasodilation
    const atropineEfficacy = atropCe > 0
      ? clamp(atropCe / (atropCe + 0.4) * 0.95, 0, 0.95)  // Atropine reverses muscarinic effects
      : glycCe > 0
        ? clamp(glycCe / (glycCe + 0.4) * 0.85, 0, 0.85)  // Glycopyrrolate: peripheral M block
        : 0;

    const netCholinMuscarinic = cholinergicIndex * (1 - atropineEfficacy);

    const cholinergicHREffect = cholinergicActive
      ? -clamp(netCholinMuscarinic * 70, 0, 80) // Bradycardia, potentially asystole
      : 0;
    const cholinergicBronchospasmContribution = cholinergicActive
      ? clamp(netCholinMuscarinic * 0.9, 0, 1.0) // Severe bronchospasm (bronchialSmoothMuscleCa proxy)
      : 0;
    const cholinergicSecretionIndex = cholinergicActive
      ? clamp(netCholinMuscarinic * 0.8, 0, 0.8) // Airway flooding with secretions
      : 0;
    // Secretions + bronchospasm → resistance increases dramatically
    const cholinergicResistancePenalty = clamp(
      cholinergicBronchospasmContribution * 30 + cholinergicSecretionIndex * 15,
      0, 60,
    );
    const cholinergicSVREffect = cholinergicActive
      ? -clamp(netCholinMuscarinic * 0.25, 0, 0.30) // Vasodilation
      : 0;

    // Nicotinic effects: NMJ depolarizing block (fasciculations → weakness → paralysis)
    const nmjDepolarizingBlock = opPoisoning
      ? clamp(opConc * (1 - atropineEfficacy * 0.3), 0, 1.0)
      : 0; // Atropine doesn't help much with nicotinic effects — pralidoxime needed

    if (cholinergicActive && cholinergicIndex > 0.3 && !prevCholinergicLogged) {
      const source = opPoisoning ? 'ORGANOPHOSPHATE POISONING' : 'Cholinesterase Inhibitor Excess';
      events.push(
        `⚠️ CHOLINERGIC TOXIDROME — ${source}: SLUDGE = Salivation, Lacrimation, Urination, Defecation, GI distress, Emesis. PLUS: bradycardia (M2), bronchospasm+secretions (M3) = "KILLED BY SECRETIONS", miosis, diaphoresis, urination/defecation. Nicotinic effects (N): fasciculations → NMJ paralysis, seizures. TREATMENT: ATROPINE 2-4 mg IV every 5-10 min — titrate to DRY SECRETIONS (not to heart rate!). Severe poisoning may need 10-100+ mg. Secure airway (secretions + bronchospasm). ${opPoisoning ? 'Pralidoxime (2-PAM) 1-2g IV over 15-30 min — reactivates AChE ONLY within 24-48h (before aging). Give EARLY.' : 'If iatrogenic (neostigmine excess): atropine as above; usually self-limited.'}`,
      );
      prevCholinergicLogged = true;
    }

    if (cholinergicActive && cholinergicIndex > 0.7 && !prevCholinergicSevereLogged) {
      events.push(
        `🚨 SEVERE CHOLINERGIC CRISIS — RESPIRATORY FAILURE IMMINENT: Airway flooding from bronchial hypersecretion + bronchospasm = lethal without immediate intervention. IMMEDIATE: (1) INTUBATE NOW (suction to clear secretions before laryngoscopy); (2) Atropine 4 mg IV STAT — repeat every 5 min until airways dry; (3) Avoid succinylcholine if organophosphate (NMJ depolarizing block already present → sux prolongs paralysis, causes hyperkalemia); use rocuronium; (4) Pralidoxime if OP poisoning; (5) Diazepam for seizures; (6) Avoid beta-blockers (worsen bronchospasm) and phenothiazines.`,
      );
      prevCholinergicSevereLogged = true;
    }
    if (cholinergicIndex < 0.15) {
      prevCholinergicLogged = false;
      prevCholinergicSevereLogged = false;
    }

    return {
      anticholinergicIndex: parseFloat(anticholinergicIndex.toFixed(4)),
      anticholinergicActive,
      centralAnticholinergicActive,
      anticholinergicHREffect: parseFloat(anticholinergicHREffect.toFixed(1)),
      anticholinergicTempEffect: parseFloat(anticholinergicTempEffect.toFixed(3)),
      anticholinergicSVREffect: parseFloat(anticholinergicSVREffect.toFixed(4)),
      deliriumRisk: parseFloat(deliriumRisk.toFixed(4)),
      physostigmineEfficacy: parseFloat(physostigmineEfficacy.toFixed(4)),
      cholinergicIndex: parseFloat(cholinergicIndex.toFixed(4)),
      cholinergicActive,
      cholinergicHREffect: parseFloat(cholinergicHREffect.toFixed(1)),
      cholinergicBronchospasmContribution: parseFloat(cholinergicBronchospasmContribution.toFixed(4)),
      cholinergicSecretionIndex: parseFloat(cholinergicSecretionIndex.toFixed(4)),
      cholinergicResistancePenalty: parseFloat(cholinergicResistancePenalty.toFixed(2)),
      cholinergicSVREffect: parseFloat(cholinergicSVREffect.toFixed(4)),
      nmjDepolarizingBlock: parseFloat(nmjDepolarizingBlock.toFixed(4)),
      atropineEfficacy: parseFloat(atropineEfficacy.toFixed(4)),
      prevAnticholinLogged,
      prevCholinergicLogged,
      prevCholinergicSevereLogged,
      events,
    };
  }
}
