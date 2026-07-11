/**
 * Preeclampsia / Eclampsia / HELLP Model
 *
 * Preeclampsia complicates 5-8% of pregnancies and is a leading cause of maternal
 * morbidity and mortality worldwide. The anesthesiologist manages the most dangerous
 * hemodynamic and neurologic manifestations intraoperatively.
 *
 * === DEFINITION & DIAGNOSIS ===
 * Preeclampsia: new-onset HTN (sBP ≥ 140 or dBP ≥ 90) AFTER 20 weeks gestation
 * with proteinuria ≥ 300 mg/24h OR one of the severe features below.
 * ACOG 2019 criteria for SEVERE FEATURES (any one = severe preeclampsia):
 *   - sBP ≥ 160 or dBP ≥ 110 on two occasions 4h apart
 *   - Platelets < 100,000/μL
 *   - Creatinine > 1.1 mg/dL or doubling from baseline
 *   - AST or ALT > 2× upper limit of normal
 *   - Pulmonary edema
 *   - New-onset headache unresponsive to analgesics (cerebral symptoms)
 *   - Visual disturbances (scotomata, blurred vision)
 *
 * === PATHOPHYSIOLOGY ===
 * Abnormal placentation → insufficient spiral artery remodeling → placental ischemia →
 * release of anti-angiogenic factors (sFlt-1, sEng) → systemic endothelial dysfunction:
 *   - Vasospasm → severe HTN
 *   - Capillary leak → edema (airway edema! difficult intubation), pulmonary edema
 *   - Platelet consumption → thrombocytopenia
 *   - Hepatic ischemia → elevated transaminases (HELLP)
 *   - Cerebral vasospasm/edema → seizures (eclampsia), stroke
 *
 * === ECLAMPSIA ===
 * Seizure complicating preeclampsia. Mortality from intracranial hemorrhage is the
 * primary cause of preeclampsia-associated maternal death.
 * Magnesium sulfate reduces eclampsia risk by 50% (Magpie Trial, Lancet 2002).
 * Mechanism: Mg²⁺ blocks NMDA receptors → raises seizure threshold + cerebral vasodilation.
 * THERAPEUTIC Mg LEVELS: 4-7 mEq/L (serum) = 2-3.5 mmol/L
 * TOXIC Mg LEVELS:
 *   - Loss of patellar reflex: > 7 mEq/L → check DTRs before each dose
 *   - Respiratory paralysis: > 10 mEq/L → STOP Mg, give calcium gluconate 1g IV
 *   - Cardiac arrest: > 15 mEq/L
 *
 * === HELLP SYNDROME ===
 * Hemolysis, Elevated Liver enzymes, Low Platelets. Present in 0.5-0.9% of pregnancies,
 * 10-20% of severe preeclampsia. The most dangerous PEC variant.
 * Management: delivery, careful fluid balance, possible steroid for fetal lung maturity.
 *
 * === ANESTHESIA MANAGEMENT ===
 * 1. Antihypertensive therapy for sBP ≥ 160: labetalol IV, hydralazine IV, nifedipine PO
 *    (target sBP 140-155, dBP 90-105 — don't drop too fast → uteroplacental insufficiency)
 * 2. Magnesium seizure prophylaxis: 4-6g IV over 15-20 min, then 1-2g/hr infusion
 * 3. Neuraxial: PREFERRED for c-section in PEC (epidural preferred; avoid spinal in severe
 *    thrombocytopenia PLT < 70-80k; check count before epidural placement)
 * 4. General anesthesia hazards: exaggerated HTN response to intubation (lethal in PEC);
 *    require opioid/beta-blocker pre-treatment; difficult airway from edema
 * 5. Fluid restriction: capillary leak → pulmonary edema with IV fluids; target UO 0.5 mL/kg/hr
 *
 * Sources: ACOG Practice Bulletin 222 (2020); Magpie Trial Lancet 2002;
 * Clark SL, Hankins GDV, Anesthesiology 2010; Miller's 9th Ed Ch 56 (OB Anesthesia).
 */

export interface PreeclampsiaInputs {
  hasPreeclampsia?: boolean;
  gestationalAgeWeeks?: number;
  currentMAP?: number;        // mmHg
  currentSBP?: number;        // mmHg
  currentDBP?: number;        // mmHg
  magnesiumCe?: number;       // plasma Mg (mg/L proxy; therapeutic = 2-4)
  plateletCount?: number;     // cells/μL (normal 150,000-400,000)
  currentAST?: number;        // U/L (normal < 40)
  currentALT?: number;        // U/L (normal < 40)
  currentCreatinine?: number; // mg/dL (normal 0.5-0.9 in pregnancy)
  neuraxialBlockLevel?: number; // for airway edema risk consideration
  hasLabetalolActive?: boolean;
  hasHydralazineActive?: boolean;
  labetalolCe?: number;
  hydralazineCe?: number;
  nifedipineCe?: number;
  // Event guards
  prevPECHypertensiveLogged?: boolean;
  prevEclampsiaLogged?: boolean;
  prevHELLPLogged?: boolean;
  prevMgToxicLogged?: boolean;
  prevAirwayEdemaLogged?: boolean;
}

export interface PreeclampsiaOutput {
  hasSevereFeatures: boolean;
  hasHELLP: boolean;
  eclampsiaRisk: number;        // 0-1: probability of seizure this tick
  eclampsiaActive: boolean;     // active seizure
  svrContributionFromPEC: number; // additive SVR fraction (0-0.5)
  mapExcessFromPEC: number;     // excess MAP above what drugs/physiology produce (mmHg)
  airwayEdemaScore: number;     // 0-1: endotracheal intubation difficulty from laryngeal edema
  mgToxicityActive: boolean;    // Mg level in toxic range
  mgRespDepression: number;     // RR penalty from toxic Mg (-0 to -12)
  mgSeizureProtection: number;  // 0-1: fraction of eclampsia risk eliminated by Mg
  plateletCompromised: boolean; // PLT < 80k → neuraxial contraindicated
  prevPECHypertensiveLogged: boolean;
  prevEclampsiaLogged: boolean;
  prevHELLPLogged: boolean;
  prevMgToxicLogged: boolean;
  prevAirwayEdemaLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class PreeclampsiaModel {
  static tick(inputs: PreeclampsiaInputs = {}): PreeclampsiaOutput {
    const events: string[] = [];
    let prevPECHypertensiveLogged = !!inputs.prevPECHypertensiveLogged;
    let prevEclampsiaLogged = !!inputs.prevEclampsiaLogged;
    let prevHELLPLogged = !!inputs.prevHELLPLogged;
    let prevMgToxicLogged = !!inputs.prevMgToxicLogged;
    let prevAirwayEdemaLogged = !!inputs.prevAirwayEdemaLogged;

    const hasPEC = !!inputs.hasPreeclampsia;

    if (!hasPEC) {
      return {
        hasSevereFeatures: false, hasHELLP: false, eclampsiaRisk: 0, eclampsiaActive: false,
        svrContributionFromPEC: 0, mapExcessFromPEC: 0, airwayEdemaScore: 0,
        mgToxicityActive: false, mgRespDepression: 0, mgSeizureProtection: 0,
        plateletCompromised: false,
        prevPECHypertensiveLogged, prevEclampsiaLogged, prevHELLPLogged, prevMgToxicLogged, prevAirwayEdemaLogged,
        events,
      };
    }

    const sbp = clamp(safeNumber(inputs.currentSBP, 145), 60, 250);
    const dbp = clamp(safeNumber(inputs.currentDBP, 92), 40, 160);
    const map = clamp(safeNumber(inputs.currentMAP, (sbp + 2 * dbp) / 3), 40, 200);
    const mgCe = clamp(safeNumber(inputs.magnesiumCe, 0), 0, 20);
    const platelets = clamp(safeNumber(inputs.plateletCount, 200000), 0, 500000);
    const ast = clamp(safeNumber(inputs.currentAST, 30), 5, 5000);
    const alt = clamp(safeNumber(inputs.currentALT, 25), 5, 5000);
    const creat = clamp(safeNumber(inputs.currentCreatinine, 0.7), 0.3, 15);
    const labetalolCe = clamp(safeNumber(inputs.labetalolCe, 0), 0, 10);
    const hydralazineCe = clamp(safeNumber(inputs.hydralazineCe, 0), 0, 10);
    const nifedipineCe = clamp(safeNumber(inputs.nifedipineCe, 0), 0, 10);

    // ===========================
    // SEVERE FEATURES ASSESSMENT
    // ===========================
    const severeHTN = sbp >= 160 || dbp >= 110;
    const severePlatelets = platelets < 100000;
    const severeRenal = creat > 1.1;
    const severeLiver = ast > 80 || alt > 80; // 2× ULN
    const hasSevereFeatures = severeHTN || severePlatelets || severeRenal || severeLiver;

    // ===========================
    // HELLP SYNDROME
    // ===========================
    const hasHELLP = platelets < 100000 && (ast > 70 || alt > 70); // microangiopathic hemolysis implied

    if (hasHELLP && !prevHELLPLogged) {
      events.push(
        `🚨 HELLP SYNDROME: PLT ${(platelets / 1000).toFixed(0)}k, AST ${ast.toFixed(0)} U/L, ALT ${alt.toFixed(0)} U/L. Hemolysis, Elevated Liver Enzymes, Low Platelets — the most dangerous preeclampsia variant. Management: DELIVERY is definitive. Careful fluid balance (capillary leak → pulmonary edema). Neuraxial CONTRAINDICATED if PLT < 70-80k (epidural hematoma risk). Packed RBCs and FFP if bleeding. Dexamethasone may temporarily improve counts. Abruption risk elevated.`,
      );
      prevHELLPLogged = true;
    }

    // ===========================
    // PEC-DRIVEN HYPERTENSION (SVR contribution)
    // ===========================
    // Preeclampsia causes pathologic vasoconstriction (SVR elevation) beyond what
    // the normal cardiovascular model produces. Model as additive SVR contribution
    // that antihypertensives (labetalol, hydralazine, nifedipine) partially offset.
    const antihypertensiveEffect = clamp(
      labetalolCe / (labetalolCe + 0.5) * 0.50 +
      hydralazineCe / (hydralazineCe + 0.3) * 0.45 +
      nifedipineCe / (nifedipineCe + 0.2) * 0.40,
      0, 0.85,
    );

    // Base SVR contribution from PEC (severe: up to +40% SVR)
    const rawPECSVR = hasSevereFeatures ? 0.40 : 0.20;
    const svrContributionFromPEC = rawPECSVR * (1 - antihypertensiveEffect);
    // MAP excess: how much MAP is elevated beyond what drugs already produce
    const mapExcessFromPEC = svrContributionFromPEC * 40; // mmHg above baseline

    if (sbp >= 160 && !prevPECHypertensiveLogged) {
      events.push(
        `🚨 SEVERE PREECLAMPTIC HYPERTENSION: sBP ${sbp} mmHg ≥ 160. EMERGENT ANTIHYPERTENSIVE THERAPY REQUIRED (acute target sBP 140-155 to prevent intracranial hemorrhage). Options: Labetalol 20 mg IV q10min (max 300 mg); Hydralazine 5-10 mg IV q20min; Nifedipine 10 mg PO q20min. AVOID precipitous drop in BP (uteroplacental insufficiency). Continue fetal heart rate monitoring. Magnesium must be running for seizure prophylaxis.`,
      );
      prevPECHypertensiveLogged = true;
    }
    if (sbp < 155) prevPECHypertensiveLogged = false;

    // ===========================
    // MAGNESIUM THERAPEUTIC EFFECTS
    // ===========================
    // Mg serum therapeutic range 4-7 mEq/L corresponds to Ce ~1.5-3.5 in this PK model
    // Seizure protection: Hill equation
    const mgSeizureProtection = mgCe > 0.5 ? clamp(Math.pow(mgCe, 2) / (Math.pow(mgCe, 2) + Math.pow(1.5, 2)) * 0.85, 0, 0.85) : 0;

    // Mg toxic range (Ce > 4-5 in this model → loss of DTRs; Ce > 7 → respiratory paralysis)
    const mgToxicityActive = mgCe > 4.0;
    const mgRespDepression = mgToxicityActive ? clamp((mgCe - 4.0) * 3.0, 0, 12) : 0;

    if (mgToxicityActive && !prevMgToxicLogged) {
      events.push(
        `🚨 MAGNESIUM TOXICITY: Mg at toxic concentration. Loss of patellar reflexes (check DTRs). Respiratory paralysis risk. STOP Mg infusion. Give CALCIUM GLUCONATE 1g IV (antidote — competes directly with Mg at calcium channels). Prepare to intubate if respiratory failure develops. Have 10% calcium gluconate at bedside during all Mg infusions.`,
      );
      prevMgToxicLogged = true;
    }
    if (!mgToxicityActive) prevMgToxicLogged = false;

    // ===========================
    // ECLAMPSIA SEIZURE RISK
    // ===========================
    // Seizure risk driven by: uncontrolled severe HTN (MAP > 120), no Mg protection, cerebral edema
    const cerebralRisk = clamp((map - 90) / 40, 0, 1); // 0 at MAP 90, 1 at MAP 130+
    const rawEclampsiaRisk = cerebralRisk * (1 - mgSeizureProtection) * 0.002; // per-second risk
    const eclampsiaActive = Math.random() < rawEclampsiaRisk && hasPEC && map > 105;

    if (eclampsiaActive && !prevEclampsiaLogged) {
      events.push(
        `🚨 ECLAMPSIA: TONIC-CLONIC SEIZURE. Immediate actions: (1) MAGNESIUM SULFATE 4-6g IV over 5-10 min (seizure breaks in 2-3 min); (2) Protect airway (lateral decubitus, suction); (3) Supplemental O2; (4) Benzodiazepine (lorazepam 2-4 mg) if Mg fails; (5) Aggressive antihypertensive therapy; (6) Fetal assessment + delivery planning. If convulsing despite Mg: consider general anesthesia for delivery. Maternal mortality is driven by intracranial hemorrhage and aspiration.`,
      );
      prevEclampsiaLogged = true;
    }
    if (!eclampsiaActive) prevEclampsiaLogged = false;

    // ===========================
    // AIRWAY EDEMA SCORE
    // ===========================
    // PEC causes laryngeal/glottic edema from capillary leak.
    // Difficult intubation rate is 8× higher in PEC than general obstetric population.
    // Edema worsens with: IV fluid loading, duration of PEC, upper body position changes
    const airwayEdemaScore = hasSevereFeatures ? clamp(0.3 + (svrContributionFromPEC * 0.5), 0, 0.9) : 0.15;
    if (airwayEdemaScore > 0.5 && !prevAirwayEdemaLogged) {
      events.push(
        `⚠️ PREECLAMPSIA AIRWAY EDEMA: Laryngeal and glottic edema from capillary leak in severe preeclampsia. Difficult intubation rate 8× higher than general OB population. If general anesthesia required: smaller ETT (6.0 or 6.5 ID instead of 7.0), experienced intubator, video laryngoscope at bedside, surgical airway kit. Position head-up (30°). Avoid excessive fluid administration (worsens edema). Airway exam immediately before induction — may change rapidly.`,
      );
      prevAirwayEdemaLogged = true;
    }

    const plateletCompromised = platelets < 80000;

    return {
      hasSevereFeatures,
      hasHELLP,
      eclampsiaRisk: parseFloat(rawEclampsiaRisk.toFixed(6)),
      eclampsiaActive,
      svrContributionFromPEC: parseFloat(svrContributionFromPEC.toFixed(4)),
      mapExcessFromPEC: parseFloat(mapExcessFromPEC.toFixed(1)),
      airwayEdemaScore: parseFloat(airwayEdemaScore.toFixed(4)),
      mgToxicityActive,
      mgRespDepression: parseFloat(mgRespDepression.toFixed(2)),
      mgSeizureProtection: parseFloat(mgSeizureProtection.toFixed(4)),
      plateletCompromised,
      prevPECHypertensiveLogged,
      prevEclampsiaLogged,
      prevHELLPLogged,
      prevMgToxicLogged,
      prevAirwayEdemaLogged,
      events,
    };
  }
}
