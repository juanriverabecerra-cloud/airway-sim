/**
 * Pediatric-Specific Clinical Model
 *
 * Extends PediatricPhysiologyEngine.ts (which handles MAC correction, PFO, metabolic rate)
 * with pediatric-specific CLINICAL MANAGEMENT scenarios:
 *
 * 1. LARYNGOMALACIA / SUBGLOTTIC STENOSIS
 * 2. PYLORIC STENOSIS (classical "teach thyself" metabolic alkalosis)
 * 3. APNEA OF PREMATURITY (ex-premature infants)
 * 4. CONGENITAL HEART DISEASE (simplified)
 * 5. PEDIATRIC PHARMACOKINETICS (weight-based specific dosing)
 *
 * =========================================================================
 * LARYNGOMALACIA
 * =========================================================================
 * Most common congenital cause of stridor in infants (60% of infant stridor).
 * Mechanism: supraglottic soft tissue (epiglottis, arytenoids) collapses on inspiration.
 * Symptoms: inspiratory stridor worse when supine or crying, improves when prone.
 * Usually self-limited (resolves by age 12-18 months).
 * ANESTHESIA: Beware of airway obstruction under sedation → prone positioning can help.
 * Severe cases need supraglottoplasty.
 *
 * =========================================================================
 * PYLORIC STENOSIS (Classic "Teach Thyself" Scenario)
 * =========================================================================
 * Hypertrophic pyloric stenosis: infant (2-8 weeks) with projectile non-bilious vomiting.
 * METABOLIC CONSEQUENCE: Loss of HCl → Hypochloremic Hypokalemic METABOLIC ALKALOSIS
 * + paradoxical aciduria (kidney retains H+ to excrete K+ — K+ deficit → acid secreted).
 *
 * KEY TEACHING: THIS IS NOT A SURGICAL EMERGENCY (despite what it looks like).
 * Correct metabolic derangement BEFORE surgery:
 * - Target: Cl > 100 mEq/L, K > 3.5 mEq/L, pH 7.30-7.45
 * - Typical correction: 24-48h of IV NS + KCl
 * INDUCTION: RSI or careful inhalation (full stomach despite prolonged NPO — stomach
 * remains full because outlet is obstructed regardless of fasting).
 * Analgesia: Post-op wound infiltration + acetaminophen (minimal opioids — respiratory sensitivity)
 *
 * =========================================================================
 * APNEA OF PREMATURITY (EX-PREMATURE INFANTS)
 * =========================================================================
 * Risk: Premature infants (< 37 weeks gestational age at birth) who have subsequent surgery.
 * Risk persists until 60 weeks post-conceptual age (PCA = gestational age + postnatal age).
 * Mechanism: immature brainstem respiratory control → apnea events, especially postoperative.
 *
 * Thresholds for INPATIENT monitoring vs outpatient:
 * - < 37 weeks GA + < 60 weeks PCA → mandatory hospital overnight monitoring after ANY GA.
 * - > 60 weeks PCA: lower risk; can consider outpatient if healthy and > 46 weeks PCA.
 *
 * Risk factors for apnea: prematurity, low gestational age, hematocrit < 30%.
 * Treatment: caffeine (stimulates respiratory center — already added to drug database).
 *
 * =========================================================================
 * CONGENITAL HEART DISEASE (CHD) SIMPLIFIED
 * =========================================================================
 * Two broad categories for anesthetic purposes:
 *
 * CYANOTIC (right-to-left shunt, SpO2 < 95% on room air):
 *   Tetralogy of Fallot (most common cyanotic CHD), Transposition of Great Arteries,
 *   Truncus Arteriosus, Total Anomalous Pulmonary Venous Return.
 *   Danger: "TET spells" (hypercyanotic episodes) — infundibular spasm reduces RV outflow,
 *   shunts more blood R→L. Treatment: propranolol, O2, knee-chest position, phenylephrine
 *   (increases SVR → reduces R→L shunting). Avoid: drugs that decrease SVR, tachycardia.
 *
 * ACYANOTIC (left-to-right shunt, volume overload):
 *   ASD, VSD, PDA — volume overload to pulmonary circulation.
 *   Risk: pulmonary HTN, eventual Eisenmenger physiology (R→L shunt reversal).
 *
 * AIR BUBBLES: ALL CHD patients with any shunt have risk of paradoxical air embolism.
 * Filter ALL IV lines meticulously; avoid air bubbles in ALL injections.
 *
 * Sources: Davis PJ, Smith's Anesthesia for Infants and Children 9th ed;
 * Flick RP, BJA 2011 (apnea of prematurity); Miller's 9th Ed Ch 77-80.
 */

export interface PediatricClinicalInputs {
  // Laryngomalacia
  hasLaryngomalacia?: boolean;
  positionSupine?: boolean;            // worse in supine

  // Pyloric stenosis
  hasPyloricStenosis?: boolean;
  currentCl?: number;                  // mEq/L chloride
  currentK?: number;                   // mEq/L potassium
  currentPH?: number;

  // Apnea of prematurity
  gestationalAgeAtBirth?: number;      // weeks
  postConceptualAge?: number;          // gestational age + postnatal age (weeks)
  prematurityHematocrit?: number;      // % (risk factor if < 30)
  caffeineActive?: boolean;

  // CHD
  hasCHD?: boolean;
  chdType?: 'cyanotic' | 'acyanotic' | 'corrected';
  currentSpO2?: number;
  svr_phenylephrineCe?: number;       // phenylephrine to increase SVR in TET spell

  // Event guards
  prevPyloricStenosisLogged?: boolean;
  prevApneaRiskLogged?: boolean;
  prevTETSpellLogged?: boolean;
  prevAirBubbleLogged?: boolean;
}

export interface PediatricClinicalOutput {
  // Laryngomalacia
  laryngomalaciaObstructionRisk: number;  // 0-1 in supine/sedated

  // Pyloric stenosis readiness
  metabolicReadyForSurgery: boolean;       // Cl > 100, K > 3.5, pH normal
  pyloric_cl_deficit: number;             // mEq/L below target
  pyloric_k_deficit: number;             // mEq/L below target
  pyloric_metabolic_alkalosis_severity: number; // 0-1

  // Apnea risk
  apneaRiskHigh: boolean;                 // < 60 weeks PCA → overnight monitoring
  caffeineRecommended: boolean;

  // CHD
  tetSpellRisk: number;                   // 0-1
  paradoxicalEmbolismRisk: number;        // 0-1 (any shunt)
  phenylephrineBenefit: number;           // 0-1 (increases SVR → reduces TET)

  prevPyloricStenosisLogged: boolean;
  prevApneaRiskLogged: boolean;
  prevTETSpellLogged: boolean;
  prevAirBubbleLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class PediatricSpecificClinicalModel {
  static tick(inputs: PediatricClinicalInputs = {}): PediatricClinicalOutput {
    const events: string[] = [];
    let prevPyloricStenosisLogged = !!inputs.prevPyloricStenosisLogged;
    let prevApneaRiskLogged = !!inputs.prevApneaRiskLogged;
    let prevTETSpellLogged = !!inputs.prevTETSpellLogged;
    let prevAirBubbleLogged = !!inputs.prevAirBubbleLogged;

    // ===========================
    // LARYNGOMALACIA
    // ===========================
    const hasLM = !!inputs.hasLaryngomalacia;
    const isSupine = inputs.positionSupine !== false;
    const laryngomalaciaObstructionRisk = hasLM ? (isSupine ? 0.6 : 0.2) : 0;

    // ===========================
    // PYLORIC STENOSIS
    // ===========================
    const hasPyloric = !!inputs.hasPyloricStenosis;
    const currentCl = clamp(safeNumber(inputs.currentCl, 105), 70, 120);
    const currentK = clamp(safeNumber(inputs.currentK, 4.0), 1.5, 7.0);
    const currentPH = clamp(safeNumber(inputs.currentPH, 7.4), 6.8, 7.8);

    const pyloric_cl_deficit = Math.max(0, 100 - currentCl);
    const pyloric_k_deficit = Math.max(0, 3.5 - currentK);
    const metabolicReadyForSurgery = hasPyloric
      ? (currentCl >= 100 && currentK >= 3.5 && currentPH <= 7.45)
      : true;

    const pyloric_metabolic_alkalosis_severity = hasPyloric
      ? clamp((currentPH - 7.4) / 0.2 + (100 - currentCl) / 30 + (3.5 - currentK) / 1.5, 0, 1)
      : 0;

    if (hasPyloric && !prevPyloricStenosisLogged) {
      const readyNote = metabolicReadyForSurgery
        ? '✅ Metabolic correction adequate — safe to proceed with surgery.'
        : `⚠️ NOT READY FOR SURGERY: Cl ${currentCl.toFixed(0)} (target ≥ 100), K ${currentK.toFixed(1)} (target ≥ 3.5), pH ${currentPH.toFixed(2)} (target 7.30-7.45). Continue IV NS + KCl repletion. Re-check electrolytes in 6-12h.`;
      events.push(
        `👶 PYLORIC STENOSIS: ${readyNote} CRITICAL TEACHING: (1) This is NOT a surgical emergency despite the baby's appearance; correct metabolic derangement first (24-48h); (2) Hypochloremic hypokalemic METABOLIC ALKALOSIS from H+/Cl loss in vomitus; (3) Full stomach despite NPO (pylorus is OBSTRUCTED — stomach never truly empties); (4) RSI mandatory; (5) Postoperative apnea risk → minimize opioids (wound infiltration + acetaminophen). Caffeine may be given if ex-preemie.`,
      );
      prevPyloricStenosisLogged = true;
    }

    // ===========================
    // APNEA OF PREMATURITY
    // ===========================
    const ga = safeNumber(inputs.gestationalAgeAtBirth, 40);
    const pca = safeNumber(inputs.postConceptualAge, 60); // GA + postnatal age in weeks
    const hct = clamp(safeNumber(inputs.prematurityHematocrit, 40), 10, 70);
    const caffeineActive = !!inputs.caffeineActive;

    const apneaRiskHigh = ga < 37 && pca < 60;
    const caffeineRecommended = apneaRiskHigh && !caffeineActive;

    if (apneaRiskHigh && !prevApneaRiskLogged) {
      events.push(
        `⚠️ APNEA OF PREMATURITY RISK: Ex-premature infant (GA ${ga.toFixed(0)} wks, current PCA ${pca.toFixed(0)} wks). Risk of postoperative apnea persists until 60 weeks PCA. MANDATORY: (1) Hospital admission overnight after ANY general anesthesia (even minor procedures); (2) Cardiorespiratory monitoring × 12-24h; (3) CAFFEINE ${hct < 30 ? '(especially this infant — Hct < 30% is additional risk factor)' : ''} 10 mg/kg IV/PO pre-operatively (stimulates respiratory center). OUTPATIENT only safe if PCA > 60 weeks AND otherwise healthy AND NOT premature infant.`,
      );
      prevApneaRiskLogged = true;
    }

    // ===========================
    // CHD
    // ===========================
    const hasCHD = !!inputs.hasCHD;
    const chdType = inputs.chdType || 'acyanotic';
    const spo2 = clamp(safeNumber(inputs.currentSpO2, 95), 50, 100);
    const phenylephrineCe = clamp(safeNumber(inputs.svr_phenylephrineCe, 0), 0, 5);

    // TET spell risk: drops in SVR (vasodilation) or infundibular spasm (crying, pain)
    const tetSpellRisk = (hasCHD && chdType === 'cyanotic' && spo2 < 85) ? 0.7 : 0;
    const paradoxicalEmbolismRisk = hasCHD && chdType !== 'corrected' ? 0.3 : 0;

    // Phenylephrine treatment for TET spells (increases SVR → reduces R→L shunting)
    const phenylephrineBenefit = phenylephrineCe > 0
      ? clamp(phenylephrineCe / (phenylephrineCe + 0.5) * 0.8, 0, 0.8) : 0;

    if (hasCHD && chdType === 'cyanotic' && spo2 < 80 && !prevTETSpellLogged) {
      events.push(
        `🚨 HYPERCYANOTIC (TET) SPELL: SpO2 ${spo2}% in cyanotic CHD. Mechanism: infundibular spasm or ↓SVR → more R→L shunting → worsening cyanosis → vicious cycle. TREATMENT: (1) Knee-chest position (↑SVR, ↓VR); (2) 100% O2; (3) PHENYLEPHRINE 5-10 mcg/kg IV (↑SVR → ↓R→L shunt) — PREFERRED PRESSOR in TET; (4) Morphine 0.1 mg/kg (↓hyperpnea, calms infant); (5) AVOID epinephrine/isoproterenol (↓SVR, worsen cyanosis); (6) Beta-blocker (propranolol 0.1 mg/kg) if refractory (relaxes infundibular spasm). TET spell is a cardiac emergency.`,
      );
      prevTETSpellLogged = true;
    }

    if (hasCHD && !prevAirBubbleLogged) {
      events.push(
        `⚠️ CHD AIR EMBOLISM RISK: Any intracardiac or intrapulmonary shunt creates risk of PARADOXICAL AIR EMBOLISM (air crossing to systemic circulation → stroke, MI, coronary air embolism). MANDATORY: (1) Filter ALL IV lines rigorously; (2) Zero air bubbles in all syringes; (3) Continuous IV line monitoring; (4) Avoid any air in contrast injections. This applies to ASD, VSD, PDA, and ALL unrepaired or palliatively repaired CHD.`,
      );
      prevAirBubbleLogged = true;
    }

    return {
      laryngomalaciaObstructionRisk: parseFloat(laryngomalaciaObstructionRisk.toFixed(4)),
      metabolicReadyForSurgery,
      pyloric_cl_deficit: parseFloat(pyloric_cl_deficit.toFixed(1)),
      pyloric_k_deficit: parseFloat(pyloric_k_deficit.toFixed(2)),
      pyloric_metabolic_alkalosis_severity: parseFloat(pyloric_metabolic_alkalosis_severity.toFixed(4)),
      apneaRiskHigh,
      caffeineRecommended,
      tetSpellRisk: parseFloat(tetSpellRisk.toFixed(4)),
      paradoxicalEmbolismRisk: parseFloat(paradoxicalEmbolismRisk.toFixed(4)),
      phenylephrineBenefit: parseFloat(phenylephrineBenefit.toFixed(4)),
      prevPyloricStenosisLogged,
      prevApneaRiskLogged,
      prevTETSpellLogged,
      prevAirBubbleLogged,
      events,
    };
  }
}
