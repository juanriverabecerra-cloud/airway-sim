/**
 * Chronic Disease Management — Perioperative Considerations
 *
 * Several common chronic diseases with important, specific perioperative implications
 * that aren't covered by existing disease-specific engines:
 *
 * A. MYASTHENIA GRAVIS (MG)
 * B. MYOTONIC DYSTROPHY
 * C. PARKINSON'S DISEASE
 * D. RHEUMATOID ARTHRITIS (RA)
 * E. EPILEPSY / SEIZURE DISORDERS
 *
 * =========================================================================
 * A. MYASTHENIA GRAVIS (MG)
 * =========================================================================
 * Autoimmune destruction of NMJ AChR (nicotinic, post-synaptic).
 * PERIOPERATIVE IMPORTANCE:
 * - EXTREMELY sensitive to NDMRs (non-depolarizing muscle relaxants)
 * - May need 10-20% of normal NDMR dose (avoid if possible)
 * - SUCCINYLCHOLINE: RESISTANT (reduced AChRs → need 2× normal dose)
 * - Anticholinesterase reversal (neostigmine): MAY trigger cholinergic crisis
 *   (already near AChE saturation from treatment) → prefer SUGAMMADEX
 * - Post-op ventilation common if severe MG (MG-specific scoring: Osserman grade)
 * - MANAGEMENT: continue pyridostigmine perioperatively (not IV equivalent available
 *   easily; consider bridging with IV neostigmine if NPO)
 * - THYMOMA: 15% of MG patients; thymectomy may improve MG
 *
 * MYASTHENIC CRISIS vs CHOLINERGIC CRISIS:
 * - Myasthenic crisis: too LITTLE ACh effect → weakness → respiratory failure
 *   (NOT enough pyridostigmine or disease exacerbation)
 * - Cholinergic crisis: too MUCH ACh effect → SLUDGE + weakness
 *   (too much pyridostigmine/neostigmine)
 * - Distinguish with edrophonium TEST (brief acting AChEI):
 *   Myasthenic crisis IMPROVES with edrophonium
 *   Cholinergic crisis WORSENS with edrophonium
 *
 * =========================================================================
 * B. MYOTONIC DYSTROPHY
 * =========================================================================
 * Most common adult muscular dystrophy. Myotonia = prolonged muscle contraction
 * after stimulation (grip myotonia — can't release handshake).
 * CRITICAL PERIOPERATIVE ISSUES:
 * - SUCCINYLCHOLINE: ABSOLUTE CONTRAINDICATION
 *   → massive sustained myotonia → jaw spasm, laryngospasm, difficulty with mask
 *   → generalized myotonia → rigidity, hyperthermia (mimic MH but NOT MH)
 * - COLD triggers myotonia → WARM OR WARMLY
 * - CARDIAC conduction defects (heart block, AF, DCM) → ECG, pacemaker consideration
 * - Neostigmine: AVOID (triggers myotonia) → use sugammadex
 * - Regional preferred over GA when possible
 * - Respiratory: diaphragmatic weakness → prolonged ventilation, hypoventilation
 *
 * =========================================================================
 * C. PARKINSON'S DISEASE
 * =========================================================================
 * Dopaminergic neuron loss in substantia nigra.
 * PERIOPERATIVE IMPORTANCE:
 * - CONTINUE LEVODOPA/CARBIDOPA PERIOPERATIVELY — even a few hours of missed doses
 *   → acute akinesia, rigidity, dysphagia, respiratory compromise
 *   → "Parkinson's disease emergency" — often misdiagnosed as NMS
 * - NPO: give levodopa with small sip of water right until induction
 *   and resume immediately upon awakening
 * - AVOID: haloperidol, droperidol, metoclopramide (D2 blockers → worsen PD)
 * - Deep brain stimulation (DBS): MRI precautions; electrocautery interference
 *   (turn off DBS before electrocautery), check device compatibility
 *
 * =========================================================================
 * D. RHEUMATOID ARTHRITIS (RA)
 * =========================================================================
 * Systemic autoimmune disease — NOT just joint disease.
 * AIRWAY: C1-C2 (atlantoaxial) instability → subluxation risk with extension
 *   → cervical spine disease in 30-40% of RA patients
 *   → Pre-op lateral C-spine X-rays in flexion/extension
 *   → Avoid hyperextension during laryngoscopy → video laryngoscopy safer
 *   → Potential C-spine injury with direct laryngoscopy
 * OTHER: Cricoarytenoid arthritis → post-extubation stridor + hoarseness
 *        Temporo-mandibular joint → limited mouth opening
 *        Lung disease: interstitial fibrosis, pleural effusions
 * MEDICATIONS: methotrexate (continue perioperatively), biologics (may need to hold)
 *
 * =========================================================================
 * E. EPILEPSY
 * =========================================================================
 * PERIOPERATIVE MANAGEMENT:
 * - Continue antiepileptic drugs (AEDs) perioperatively without interruption
 * - Most AEDs cause enzyme induction → need higher drug doses for other medications
 * - Induction: avoid ketamine (may cause cortical excitation in some patients);
 *   propofol is safe (actually anticonvulsant at doses > 1-2 mg/kg)
 * - Sevoflurane: at high concentrations (>1.5 MAC) can cause epileptiform activity
 *   in EEG (especially in children) — use with caution in seizure patients
 * - Analgesics: meperidine/tramadol can lower seizure threshold → avoid
 * - Post-op: resume AEDs immediately; if NPO, IV equivalents available for most
 *
 * Sources: Drachman DB, NEJM 1994 (MG); Day JW, NEJM 2003 (myotonic dystrophy);
 * Bhatt DL, NEJM 2014 (antiplatelet therapy); Miller's 9th Ed Ch 22, 28, 73.
 */

export interface ChronicDiseaseInputs {
  // Myasthenia Gravis
  hasMG?: boolean;
  ossermannGrade?: 1 | 2 | 3 | 4;   // 1=eye only, 4=severe generalized
  pyridostigmineCe?: number;          // normal MG treatment
  succinylcholineGivenMG?: boolean;

  // Myotonic Dystrophy
  hasMyotonicDystrophy?: boolean;
  succinylcholineGivenMD?: boolean;  // ABSOLUTE CONTRAINDICATION
  isPatientCold?: boolean;           // cold triggers myotonia
  neostigminedGivenMD?: boolean;    // triggers myotonia → avoid

  // Parkinson's Disease
  hasParkinsonDisease?: boolean;
  levodopaMissedHours?: number;      // hours since last levodopa dose
  haloperidolGivenPD?: boolean;      // AVOID in PD
  metoclopramideGivenPD?: boolean;   // AVOID in PD

  // Rheumatoid Arthritis
  hasRheumatoidArthritis?: boolean;
  hasAtlantcoaxialInstability?: boolean;
  directLaryngoscopyRisk?: boolean;

  // Epilepsy
  hasEpilepsy?: boolean;
  aedsMissed?: boolean;              // AEDs not given perioperatively
  meperidineCeEpil?: number;        // should be avoided in seizure patients
  sevofluraneMacHigh?: number;      // > 1.5 MAC risk for seizure activity

  // Event guards
  prevMGLogged?: boolean;
  prevMDSuxLogged?: boolean;
  prevPDLogged?: boolean;
  prevRALogged?: boolean;
  prevEpilepsyLogged?: boolean;
}

export interface ChronicDiseaseOutput {
  // MG
  mgCrisisRisk: number;             // 0-1 (myasthenic crisis risk)
  ndmrSensitivityMultiplier: number; // multiply NDMR doses by this (0.1-0.2 for MG)
  suxResistanceMG: boolean;         // need 2× dose

  // MD
  myotoniaRisk: number;             // 0-1
  suxContraindicatedMD: boolean;
  neostigmineContraindicatedMD: boolean;

  // PD
  pdAkinesiasRisk: number;          // 0-1 (missed dose → crisis)
  avoidDrugsInPD: string[];

  // RA
  cervicalSpineRisk: boolean;        // C1-C2 instability
  videoLaryngoscopyRecommended: boolean;

  // Epilepsy
  seizureRisk: number;              // 0-1 (missed AED + triggers)
  avoidDrugsInEpilepsy: string[];

  prevMGLogged: boolean;
  prevMDSuxLogged: boolean;
  prevPDLogged: boolean;
  prevRALogged: boolean;
  prevEpilepsyLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ChronicDiseaseManagementModel {
  static tick(inputs: ChronicDiseaseInputs = {}): ChronicDiseaseOutput {
    const events: string[] = [];
    let prevMGLogged = !!inputs.prevMGLogged;
    let prevMDSuxLogged = !!inputs.prevMDSuxLogged;
    let prevPDLogged = !!inputs.prevPDLogged;
    let prevRALogged = !!inputs.prevRALogged;
    let prevEpilepsyLogged = !!inputs.prevEpilepsyLogged;

    // ===========================
    // MYASTHENIA GRAVIS
    // ===========================
    const hasMG = !!inputs.hasMG;
    const ossermannGrade = inputs.ossermannGrade || 2;
    const pyridostigmineCe = clamp(safeNumber(inputs.pyridostigmineCe, 0), 0, 5);
    const suxGivenMG = !!inputs.succinylcholineGivenMG;

    const mgCrisisRisk = hasMG ? clamp((ossermannGrade / 4) * 0.6 - pyridostigmineCe * 0.1, 0, 0.8) : 0;
    // NDMR dose: 10-20% of normal (Osserman grade-dependent)
    const ndmrSensitivityMultiplier = hasMG ? clamp(0.1 + (4 - ossermannGrade) * 0.05, 0.1, 0.25) : 1.0;
    const suxResistanceMG = hasMG; // resistant — need 2× dose

    if (hasMG && !prevMGLogged) {
      events.push(
        `⚠️ MYASTHENIA GRAVIS (Osserman Grade ${ossermannGrade}): NMB MANAGEMENT: (1) NON-DEPOLARIZING NMBs: EXTREME SENSITIVITY — use only ${(ndmrSensitivityMultiplier * 100).toFixed(0)}% of normal dose; AVOID if possible; use sugammadex for reversal (NOT neostigmine — may trigger cholinergic crisis); (2) SUCCINYLCHOLINE: RESISTANT — need 2× normal dose (reduced AChRs = less depolarization); (3) CONTINUE PYRIDOSTIGMINE perioperatively (even day of surgery with small sip); (4) POST-OP: expect prolonged weakness + ventilation may be needed; MG grade III-IV → plan for ICU ventilatory support. REGIONAL preferred when possible.`,
      );
      prevMGLogged = true;
    }

    // ===========================
    // MYOTONIC DYSTROPHY
    // ===========================
    const hasMD = !!inputs.hasMyotonicDystrophy;
    const suxGivenMD = !!inputs.succinylcholineGivenMD;
    const isCold = !!inputs.isPatientCold;
    const neostigmineMD = !!inputs.neostigminedGivenMD;

    const myotoniaRisk = hasMD ? (suxGivenMD ? 0.95 : isCold ? 0.6 : neostigmineMD ? 0.7 : 0.1) : 0;
    const suxContraindicatedMD = hasMD;
    const neostigmineContraindicatedMD = hasMD;

    if (hasMD && suxGivenMD && !prevMDSuxLogged) {
      events.push(
        `🚨 SUCCINYLCHOLINE IN MYOTONIC DYSTROPHY — CONTRAINDICATED: Succinylcholine triggers GENERALIZED MYOTONIA (not MH, but clinically similar): jaw spasm, laryngospasm, trunk rigidity, hyperthermia, elevated CK. TREATMENT: DANTROLENE may partially help (same mechanism as MH treatment); cooling; benzodiazepines for spasm. Prevention: NEVER use succinylcholine or neostigmine in MD. Use rocuronium 0.6 mg/kg + sugammadex reversal. WARM patient (cold triggers myotonia). Regional preferred.`,
      );
      prevMDSuxLogged = true;
    }

    // ===========================
    // PARKINSON'S DISEASE
    // ===========================
    const hasPD = !!inputs.hasParkinsonDisease;
    const missedHours = clamp(safeNumber(inputs.levodopaMissedHours, 0), 0, 48);
    const haloperidolGiven = !!inputs.haloperidolGivenPD;
    const metoclopramideGiven = !!inputs.metoclopramideGivenPD;

    const pdAkinesiasRisk = hasPD ? clamp(missedHours / 8, 0, 1.0) : 0;
    const avoidDrugsInPD: string[] = [];
    if (haloperidolGiven) avoidDrugsInPD.push('Haloperidol (D2 blocker worsens PD)');
    if (metoclopramideGiven) avoidDrugsInPD.push('Metoclopramide (D2 blocker worsens PD)');

    if (hasPD && (missedHours > 6 || avoidDrugsInPD.length > 0) && !prevPDLogged) {
      const missedNote = missedHours > 6 ? `Levodopa MISSED for ${missedHours.toFixed(0)} hours — AKJINETIC CRISIS RISK. ` : '';
      const drugNote = avoidDrugsInPD.length > 0 ? `DANGEROUS DRUGS GIVEN: ${avoidDrugsInPD.join(', ')}. ` : '';
      events.push(
        `⚠️ PARKINSON'S DISEASE CONCERN: ${missedNote}${drugNote}CRITICAL RULE: Levodopa/Carbidopa CANNOT be missed perioperatively — even 4-6h delay can cause acute akinesia, rigidity, dysphagia, respiratory compromise. Give levodopa WITH SIPS OF WATER right until induction. Resume immediately post-op. ALTERNATIVES for PONV: ondansetron (5-HT3, safe); avoid droperidol, metoclopramide, prochlorperazine (D2 blockers). For anti-emesis in PD: ondansetron + domperidone (peripheral D2 blocker, minimal CNS penetration).`,
      );
      prevPDLogged = true;
    }

    // ===========================
    // RHEUMATOID ARTHRITIS
    // ===========================
    const hasRA = !!inputs.hasRheumatoidArthritis;
    const aaiRisk = !!inputs.hasAtlantcoaxialInstability;
    const dlRisk = !!inputs.directLaryngoscopyRisk;

    const cervicalSpineRisk = hasRA && aaiRisk;
    const videoLaryngoscopyRecommended = hasRA && (aaiRisk || dlRisk);

    if (hasRA && !prevRALogged) {
      events.push(
        `⚠️ RHEUMATOID ARTHRITIS AIRWAY PRECAUTIONS: (1) C1-C2 (atlantoaxial) instability in 30-40% of RA patients → AVOID NECK HYPEREXTENSION during laryngoscopy (risk of cord compression/ischemia); use VIDEO LARYNGOSCOPY as first-line; pre-op lateral C-spine X-rays (flexion/extension) if C-spine symptoms; (2) CRICOARYTENOID ARTHRITIS: post-extubation stridor and hoarseness possible; (3) TMJ arthritis: limited mouth opening; (4) Lung: interstitial fibrosis, Caplan syndrome; (5) Cardiac: pericarditis, cardiac nodules. MEDICATIONS: methotrexate (continue), DMARDs (continue), biologics (hold for major surgery per rheumatology guidance).`,
      );
      prevRALogged = true;
    }

    // ===========================
    // EPILEPSY
    // ===========================
    const hasEpilepsy = !!inputs.hasEpilepsy;
    const aedsMissed = !!inputs.aedsMissed;
    const meperidineCeEpil = clamp(safeNumber(inputs.meperidineCeEpil, 0), 0, 5);
    const sevofluraneMacHigh = clamp(safeNumber(inputs.sevofluraneMacHigh, 0), 0, 3);

    const avoidDrugsInEpilepsy: string[] = [];
    if (meperidineCeEpil > 0) avoidDrugsInEpilepsy.push('Meperidine/Pethidine (normeperidine lowers seizure threshold)');
    if (sevofluraneMacHigh > 1.5) avoidDrugsInEpilepsy.push(`Sevoflurane ${sevofluraneMacHigh.toFixed(1)} MAC (epileptiform EEG risk > 1.5 MAC)`);

    const seizureRisk = hasEpilepsy
      ? clamp((aedsMissed ? 0.6 : 0) + avoidDrugsInEpilepsy.length * 0.2, 0, 0.9)
      : 0;

    if (hasEpilepsy && (aedsMissed || avoidDrugsInEpilepsy.length > 0) && !prevEpilepsyLogged) {
      events.push(
        `⚠️ EPILEPSY MANAGEMENT CONCERN: ${aedsMissed ? 'AEDs MISSED perioperatively — RESUME IMMEDIATELY (seizure risk high). Most AEDs have IV equivalents (levetiracetam, phenytoin/fosphenytoin, valproate). ' : ''}${avoidDrugsInEpilepsy.length > 0 ? `DRUGS TO AVOID: ${avoidDrugsInEpilepsy.join(', ')}. ` : ''}INDUCTION: Propofol is anticonvulsant (safe and preferred); AVOID ketamine in uncontrolled epilepsy (mild proconvulsant at subanesthetic doses, anticonvulsant at anesthetic doses — unpredictable). MAINTENANCE: Isoflurane/sevoflurane generally safe at ≤ 1.5 MAC. Sevoflurane > 1.5 MAC → epileptiform EEG (especially pediatric) → reduce dose or switch agent.`,
      );
      prevEpilepsyLogged = true;
    }

    return {
      mgCrisisRisk: parseFloat(mgCrisisRisk.toFixed(4)),
      ndmrSensitivityMultiplier: parseFloat(ndmrSensitivityMultiplier.toFixed(3)),
      suxResistanceMG,
      myotoniaRisk: parseFloat(myotoniaRisk.toFixed(4)),
      suxContraindicatedMD,
      neostigmineContraindicatedMD,
      pdAkinesiasRisk: parseFloat(pdAkinesiasRisk.toFixed(4)),
      avoidDrugsInPD,
      cervicalSpineRisk,
      videoLaryngoscopyRecommended,
      seizureRisk: parseFloat(seizureRisk.toFixed(4)),
      avoidDrugsInEpilepsy,
      prevMGLogged,
      prevMDSuxLogged,
      prevPDLogged,
      prevRALogged,
      prevEpilepsyLogged,
      events,
    };
  }
}
