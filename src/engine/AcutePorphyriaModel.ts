/**
 * Acute Porphyria Model
 *
 * The acute porphyrias (AIP, HCP, VP, ADP) are rare but life-threatening if triggered
 * by unsafe anesthetic drugs. The key teaching: SOME DRUGS ARE CONTRAINDICATED and
 * can precipitate an acute neurovisceral attack with paralysis, respiratory failure,
 * and death.
 *
 * === THE FOUR ACUTE PORPHYRIAS ===
 * AIP (Acute Intermittent Porphyria) — most common; no skin involvement.
 * HCP (Hereditary Coproporphyria) — similar to AIP.
 * VP (Variegate Porphyria) — skin photosensitivity + acute attacks.
 * ADP (ALA-Dehydratase Porphyria) — very rare.
 *
 * === BIOCHEMISTRY ===
 * All encode defects in the heme synthesis pathway → porphyrin precursor accumulation
 * (ALA and PBG are the neurotoxic molecules).
 * Heme is the end product; it also feeds back to inhibit ALA-synthase (ALAS1), the
 * rate-limiting enzyme. When drugs INDUCE ALAS1 → porphyrin precursor overproduction.
 *
 * === TRIGGERING DRUGS (unsafe — induce ALAS1 or deplete heme) ===
 * HIGH RISK (absolutely avoid):
 *   - Barbiturates (thiopental, methohexital, phenobarbital) — classic trigger
 *   - Carbamazepine, phenytoin (AEDs that are potent CYP inducers)
 *   - Rifampicin, griseofulvin
 *   - Metronidazole, trimethoprim
 *   - Ergotamine, progesterone
 *   - Alcohol (acute exposure, not chronic)
 *   - Diclofenac (and some other NSAIDs)
 *
 * SAFE (extensively used without triggering):
 *   - Propofol — SAFE (evidence-based, widely used)
 *   - Ketamine — SAFE
 *   - Fentanyl, morphine, alfentanil, remifentanil — SAFE
 *   - Midazolam — SAFE
 *   - Bupivacaine, lidocaine (local anesthetics) — SAFE
 *   - Vecuronium, rocuronium, succinylcholine — SAFE
 *   - Volatile agents (isoflurane, sevoflurane, desflurane) — SAFE
 *   - Nitrous oxide — SAFE
 *   - Acetaminophen, aspirin, codeine, pethidine — SAFE
 *
 * UNCERTAIN/AVOID IF POSSIBLE:
 *   - Droperidol, haloperidol
 *   - Pentazocine
 *
 * === ACUTE ATTACK CLINICAL FEATURES ===
 * The "Five P's":
 *   - Pain (abdominal — colicky, non-localizing, can mimic acute abdomen)
 *   - Psychiatric symptoms (anxiety, confusion, psychosis)
 *   - Peripheral neuropathy (motor > sensory; can be SEVERE → Guillain-Barré-like)
 *   - Paralysis (ascending motor weakness → respiratory failure in severe attacks)
 *   - Pee color (dark red/brown urine from porphyrin precursors)
 *
 * Autonomic dysfunction: tachycardia, hypertension, diaphoresis, urinary retention.
 *
 * === TREATMENT ===
 * 1. STOP the offending drug
 * 2. HEMIN (Panhematin) 3-4 mg/kg IV × 4 days — replenishes heme pool → inhibits ALAS1
 * 3. HIGH-DOSE GLUCOSE (glucose loading blocks ALAS1): 300-500 g/day IV
 * 4. Supportive: fluid resuscitation, pain management (opioids safe), beta-blockers for HTN
 * 5. Seizures: benzodiazepines (NOT phenytoin — UNSAFE in porphyria)
 * 6. AVOID further porphyrinogenic drugs
 *
 * === SAFE ANESTHESIA FOR PORPHYRIA ===
 * TIVA with propofol + fentanyl/remifentanil + neuromuscular block with rocuronium.
 * Regional anesthesia with bupivacaine/lidocaine — excellent choice.
 * NEVER use barbiturates, even in an emergency "can't intubate" situation.
 *
 * Sources: Puy H, Lancet 2010; Kauppinen R, Ann Med 2004;
 * Jensen NF, Anesthesiology 1995; Miller's 9th Ed Ch 37 (Hematologic Disorders).
 */

export interface PorphyriaInputs {
  hasAcutePorphyria?: boolean;
  currentlyActive?: boolean;    // active attack vs quiescent/in remission

  // Triggering drug exposures (Ce values; checked for unsafe agents)
  thiopentalCe?: number;
  phenobarbitalCe?: number;
  carbamazepineCe?: number;
  phenytoinCe?: number;
  metronidazoleCe?: number;
  // Other porphyrinogenic: checked by name in medication list separately

  // Attack progression
  attackMinutesSince?: number;   // how long since attack started

  // Treatment
  heminGiven?: boolean;          // Panhematin administration
  glucoseInfusionRate?: number;  // g/hr IV glucose
  offendingDrugStopped?: boolean;

  // Event guards
  prevPorphyriaLogged?: boolean;
  prevParalysisLogged?: boolean;
}

export interface PorphyriaOutput {
  porphyriaActive: boolean;
  attackSeverity: number;         // 0-1
  triggerDrugPresent: boolean;    // unsafe drug currently administered
  neuropathyIndex: number;        // 0-1 (0=none, 1=severe paralysis)
  autonomicDysfunction: number;   // 0-1 (HTN, tachycardia, diaphoresis)
  respiratoryParalysisRisk: number; // 0-1
  svrContribution: number;        // fractional SVR increase (autonomic HTN)
  hrContribution: number;         // bpm (tachycardia)
  treatmentEfficacy: number;      // 0-1 (hemin + glucose)
  prevPorphyriaLogged: boolean;
  prevParalysisLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AcutePorphyriaModel {
  static tick(inputs: PorphyriaInputs = {}): PorphyriaOutput {
    const events: string[] = [];
    let prevPorphyriaLogged = !!inputs.prevPorphyriaLogged;
    let prevParalysisLogged = !!inputs.prevParalysisLogged;

    const hasPorphyria = !!inputs.hasAcutePorphyria;

    if (!hasPorphyria) {
      return {
        porphyriaActive: false, attackSeverity: 0, triggerDrugPresent: false,
        neuropathyIndex: 0, autonomicDysfunction: 0, respiratoryParalysisRisk: 0,
        svrContribution: 0, hrContribution: 0, treatmentEfficacy: 0,
        prevPorphyriaLogged, prevParalysisLogged, events,
      };
    }

    // ===========================
    // UNSAFE DRUG DETECTION
    // ===========================
    const thiopentalCe = safeNumber(inputs.thiopentalCe, 0);
    const phenobarbCe = safeNumber(inputs.phenobarbitalCe, 0);
    const cbzCe = safeNumber(inputs.carbamazepineCe, 0);
    const phenytoinCe = safeNumber(inputs.phenytoinCe, 0);
    const metronidazoleCe = safeNumber(inputs.metronidazoleCe, 0);

    const unsafeDrugBurden = thiopentalCe / 2.0 + phenobarbCe / 1.0 + cbzCe / 1.0
      + phenytoinCe / 1.0 + metronidazoleCe / 2.0;
    const triggerDrugPresent = unsafeDrugBurden > 0.05;

    // Fire event immediately when unsafe drug given
    if (triggerDrugPresent && !prevPorphyriaLogged && !inputs.currentlyActive) {
      const triggers = [];
      if (thiopentalCe > 0.01) triggers.push('Thiopental (barbiturate — HIGHLY PORPHYRINOGENIC)');
      if (phenobarbCe > 0.01) triggers.push('Phenobarbital (barbiturate — UNSAFE)');
      if (cbzCe > 0.01) triggers.push('Carbamazepine (CYP inducer — UNSAFE)');
      if (phenytoinCe > 0.01) triggers.push('Phenytoin (CYP inducer — UNSAFE)');
      if (metronidazoleCe > 0.01) triggers.push('Metronidazole (UNSAFE in porphyria)');
      events.push(
        `🚨 PORPHYRIA TRIGGER: UNSAFE drug(s) administered to a patient with ACUTE PORPHYRIA: ${triggers.join(', ')}. STOP IMMEDIATELY. SWITCH TO SAFE ALTERNATIVES: Propofol (SAFE), Fentanyl/Remifentanil (SAFE), Midazolam (SAFE), Rocuronium (SAFE), Volatile agents (SAFE), Local anesthetics bupivacaine/lidocaine (SAFE). Acute porphyric attack may develop within hours. NOTIFY: hematology/metabolic medicine. Start HEMIN (Panhematin) 3-4 mg/kg IV × 4 days + IV glucose 300-500 g/day. Monitor for abdominal pain, psychiatric symptoms, motor neuropathy, urine discoloration.`,
      );
      prevPorphyriaLogged = true;
    }

    // ===========================
    // ATTACK PROGRESSION
    // ===========================
    const currentlyActive = !!inputs.currentlyActive || (triggerDrugPresent && !inputs.offendingDrugStopped);
    const attackMinutes = clamp(safeNumber(inputs.attackMinutesSince, 0), 0, 10000);

    // Attack severity progresses over hours; peaks at 24-72h
    const timeProgressionFactor = currentlyActive
      ? Math.min(1.0, attackMinutes / 2880) // full severity by 48h
      : 0;

    const triggerIntensity = triggerDrugPresent ? clamp(unsafeDrugBurden, 0, 1) : 0;
    const attackSeverity = clamp(triggerIntensity * 0.5 + timeProgressionFactor * 0.5, 0, 1.0);

    // Neuropathy: starts as pain + sensory, progresses to ascending motor paralysis
    const neuropathyIndex = clamp(attackSeverity * 0.9, 0, 0.9);

    // Autonomic dysfunction: HTN, tachycardia (ALA/PBG toxic to autonomic neurons)
    const autonomicDysfunction = clamp(attackSeverity * 0.7, 0, 0.7);

    // Respiratory paralysis: phrenic nerve involvement in severe attack
    const respiratoryParalysisRisk = neuropathyIndex > 0.6
      ? clamp((neuropathyIndex - 0.6) / 0.3, 0, 0.8) : 0;

    const svrContribution = autonomicDysfunction * 0.30; // HTN from sympathetic storm
    const hrContribution = autonomicDysfunction * 30; // tachycardia (bpm)

    // Treatment efficacy
    const heminGiven = !!inputs.heminGiven;
    const glucoseRate = clamp(safeNumber(inputs.glucoseInfusionRate, 0), 0, 500); // g/hr
    const treatmentEfficacy = heminGiven
      ? clamp(0.7 + glucoseRate / 500 * 0.2, 0, 0.9)
      : clamp(glucoseRate / 500 * 0.4, 0, 0.4);

    // Declare porphyriaActive BEFORE the events that use it
    const porphyriaActive = currentlyActive || attackSeverity > 0.1;

    // Motor paralysis warning
    if (respiratoryParalysisRisk > 0.3 && !prevParalysisLogged) {
      events.push(
        `🚨 PORPHYRIA MOTOR NEUROPATHY: Ascending motor paralysis in acute porphyric attack. RESPIRATORY FAILURE RISK from phrenic nerve involvement. Signs: bilateral limb weakness, absent deep tendon reflexes, respiratory muscle weakness. MANAGEMENT: (1) Elective INTUBATION before respiratory failure (do NOT wait until SpO2 drops — this can be abrupt); (2) HEMIN (Panhematin) 4 mg/kg IV q24h × 4 days is most effective treatment; (3) High-dose glucose infusion (300-500 g/day) to suppress ALAS1; (4) Supportive ventilation until neuropathy resolves (weeks to months in severe cases). PROGNOSIS: with treatment, most recover fully; severe attacks can cause permanent motor deficits.`,
      );
      prevParalysisLogged = true;
    }

    if (porphyriaActive && neuropathyIndex > 0.3 && !prevPorphyriaLogged) {
      events.push(
        `⚠️ ACTIVE PORPHYRIC ATTACK: Abdominal pain (colicky, severe), autonomic instability (BP ${autonomicDysfunction > 0.5 ? 'severely' : 'mildly'} elevated, tachycardia), motor neuropathy developing (${neuropathyIndex > 0.5 ? 'significant — monitor respiratory function closely' : 'early — monitor progression'}). Dark/port-wine urine from urinary porphyrin excretion. TREATMENT: Hemin 3-4 mg/kg IV × 4 days; IV glucose 300-500 g/day; pain management with SAFE opioids (morphine/fentanyl); IV fluids; beta-blockers for HTN; benzodiazepines if seizures (NOT phenytoin).`,
      );
      prevPorphyriaLogged = true;
    }

    return {
      porphyriaActive,
      attackSeverity: parseFloat(attackSeverity.toFixed(4)),
      triggerDrugPresent,
      neuropathyIndex: parseFloat(neuropathyIndex.toFixed(4)),
      autonomicDysfunction: parseFloat(autonomicDysfunction.toFixed(4)),
      respiratoryParalysisRisk: parseFloat(respiratoryParalysisRisk.toFixed(4)),
      svrContribution: parseFloat(svrContribution.toFixed(4)),
      hrContribution: parseFloat(hrContribution.toFixed(1)),
      treatmentEfficacy: parseFloat(treatmentEfficacy.toFixed(4)),
      prevPorphyriaLogged,
      prevParalysisLogged,
      events,
    };
  }
}
