/**
 * Hypertensive Emergency + Aortic Dissection Model
 *
 * HYPERTENSIVE EMERGENCY: severe HTN (usually diastolic > 120 mmHg) WITH acute
 * end-organ damage. Distinct from hypertensive urgency (elevated BP without end-organ damage).
 *
 * === HYPERTENSIVE EMERGENCY — TARGET ORGANS ===
 *
 * NEUROLOGIC (hypertensive encephalopathy / intracranial hemorrhage):
 *   MAP > 130-150 → breakthrough of cerebral autoregulation → hyperperfusion, vasogenic
 *   edema, BBB disruption → altered consciousness, seizures, posterior reversible
 *   encephalopathy syndrome (PRES), stroke.
 *   Management: Nicardipine or labetalol infusion; target MAP reduction 25% in first hour
 *   (NOT to normal — abrupt normalization causes cerebral ischemia in adapted cerebral beds).
 *
 * CARDIAC (hypertensive emergency with ACS / acute CHF):
 *   Severe HTN → massive afterload increase → acute LV decompensation.
 *   Management: nitroglycerin (reduces preload AND afterload, reduces ischemia).
 *
 * AORTIC DISSECTION:
 *   HTN → shear stress on aortic wall → intimal tear → propagating dissection.
 *   STANFORD TYPE A (ascending aorta ± arch): Surgical emergency. Involves coronary
 *   ostia (acute MI), aortic valve (AR), carotid arteries (stroke), pericardium (tamponade).
 *   STANFORD TYPE B (descending aorta, NOT involving ascending): Medical management.
 *   HR AND BP control: TARGET HR < 60 bpm AND SBP < 110-120 mmHg.
 *   Drug of choice: Esmolol (HR control first, then BP). Nicardipine/nitroprusside
 *   if BP still elevated AFTER adequate HR control.
 *   CRITICAL: beta-blockers BEFORE vasodilators (vasodilators alone → reflex tachycardia
 *   → increased dP/dt → propagates dissection).
 *
 * RENAL (hypertensive nephrosclerosis / thrombotic microangiopathy):
 *   Severe HTN → afferent arteriole damage → glomerular ischemia → AKI.
 *   Microangiopathic hemolytic anemia (MAHA) in malignant HTN.
 *
 * === TREATMENT TARGETS ===
 * General emergency: reduce MAP by ≤ 25% in first hour; then 160/100 over next hours.
 * Aortic dissection: target SBP 100-110, HR < 60 (most aggressive)
 * Hypertensive encephalopathy: MAP 25% reduction → reassess
 * Ischemic stroke with thrombolysis: keep SBP < 180
 * ICH: SBP < 140 (debated; 160 may be safer to avoid cerebral ischemia)
 *
 * Sources: Varon J, Crit Care 2008; ESH/ESC 2018 HTN Guidelines;
 * Miller's 9th Ed Ch 42 (Anesthetic Management of Hypertension).
 */

export interface HypertensiveEmergencyInputs {
  currentSBP?: number;
  currentDBP?: number;
  currentMAP?: number;
  currentHR?: number;
  hasKnownHTN?: boolean;

  // Aortic dissection
  aorticDissectionPresent?: boolean;
  dissectionType?: 'A' | 'B'; // Stanford classification
  coronaryInvolved?: boolean; // Type A: ostia involvement → MI
  pericardalTamponade?: boolean; // Type A: hemopericardium

  // Treatment drugs (Ce values)
  esmololCe?: number;
  labetalolCe?: number;
  nicardipineCe?: number;
  nitroglyceriCe?: number;   // Note: typo-friendly key
  nitroprussideCe?: number;
  hydralazineCe?: number;

  // End-organ damage flags
  hasEncephalopathy?: boolean;
  hasAKI?: boolean;
  hasACS?: boolean;

  prevHyperEmergencyLogged?: boolean;
  prevDissectionLogged?: boolean;
  prevEncephalopathyLogged?: boolean;
}

export interface HypertensiveEmergencyOutput {
  isHypertensiveEmergency: boolean;
  isDissection: boolean;
  mapReductionTarget: number;       // target MAP (mmHg) for first hour
  hrTarget: number;                  // target HR (bpm)
  dPdtRisk: number;                  // 0-1: aortic shear stress risk
  aorticShearStressIndex: number;   // HR × SBP/1000 (rate-pressure product normalized)
  encephalopathyRisk: number;       // 0-1: cerebral autoregulation breach
  strokeRisk: number;                // 0-1
  renalInjuryRisk: number;          // 0-1
  overallTreatmentEfficacy: number; // 0-1 (how well current drugs are controlling BP+HR)
  currentDPdtScore: number;         // dp/dt proxy (higher = more dangerous in dissection)
  prevHyperEmergencyLogged: boolean;
  prevDissectionLogged: boolean;
  prevEncephalopathyLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class HypertensiveEmergencyModel {
  static tick(inputs: HypertensiveEmergencyInputs = {}): HypertensiveEmergencyOutput {
    const events: string[] = [];
    let prevHyperEmergencyLogged = !!inputs.prevHyperEmergencyLogged;
    let prevDissectionLogged = !!inputs.prevDissectionLogged;
    let prevEncephalopathyLogged = !!inputs.prevEncephalopathyLogged;

    const sbp = clamp(safeNumber(inputs.currentSBP, 120), 50, 280);
    const dbp = clamp(safeNumber(inputs.currentDBP, 75), 30, 160);
    const map = clamp(safeNumber(inputs.currentMAP, (sbp + 2 * dbp) / 3), 40, 200);
    const hr = clamp(safeNumber(inputs.currentHR, 75), 20, 220);
    const dissection = !!inputs.aorticDissectionPresent;
    const dissectionType = inputs.dissectionType || 'B';
    const coronaryInvolved = !!inputs.coronaryInvolved;
    const pericardTamponade = !!inputs.pericardalTamponade;

    // Treatment drugs
    const esmololCe = clamp(safeNumber(inputs.esmololCe, 0), 0, 20);
    const labetalolCe = clamp(safeNumber(inputs.labetalolCe, 0), 0, 20);
    const nicardipineCe = clamp(safeNumber(inputs.nicardipineCe, 0), 0, 10);
    const nitroglycerinCe = clamp(safeNumber(inputs.nitroglyceriCe, 0), 0, 10);
    const nitroprussideCe = clamp(safeNumber(inputs.nitroprussideCe, 0), 0, 10);
    const hydralazineCe = clamp(safeNumber(inputs.hydralazineCe, 0), 0, 10);

    // ===========================
    // END-ORGAN DAMAGE ASSESSMENT
    // ===========================
    const isHypertensiveEmergency = sbp > 180 || dbp > 120 || map > 130;
    const mapExcess = Math.max(0, map - 90); // excess above normal

    // Encephalopathy risk: cerebral autoregulation fails at MAP > ~130 in chronic HTN
    // (In acute/naive HTN, autoregulation fails at lower MAP)
    const autoregUpperLimit = inputs.hasKnownHTN ? 150 : 120; // chronic HTN shifts curve right
    const encephalopathyRisk = map > autoregUpperLimit
      ? clamp((map - autoregUpperLimit) / 50, 0, 1.0) : 0;

    // Stroke risk: hemorrhagic or ischemic embolic
    const strokeRisk = clamp(mapExcess / 80, 0, 0.8);

    // Renal injury risk
    const renalInjuryRisk = clamp((mapExcess - 20) / 60, 0, 0.8);

    // ===========================
    // TREATMENT TARGETS
    // ===========================
    let mapReductionTarget: number;
    let hrTarget: number;

    if (dissection) {
      mapReductionTarget = 70; // aggressive: SBP 100-110 → MAP ~83 → target 70-75
      hrTarget = 60;
    } else if (inputs.hasEncephalopathy) {
      mapReductionTarget = map * 0.75; // 25% reduction
      hrTarget = 75;
    } else {
      mapReductionTarget = map * 0.75;
      hrTarget = 75;
    }

    // ===========================
    // AORTIC SHEAR STRESS (dP/dt proxy)
    // ===========================
    // Aortic wall shear stress proportional to HR × SBP (not MAP)
    // In dissection: BOTH HR and SBP must be controlled
    const aorticShearStressIndex = hr * sbp / 1000; // range: ~4.5 normal, >12 dangerous
    const dPdtRisk = dissection
      ? clamp((aorticShearStressIndex - 6) / 8, 0, 1.0) // at risk above HR×SBP/1000 = 6
      : 0;
    const currentDPdtScore = aorticShearStressIndex;

    // ===========================
    // TREATMENT EFFICACY
    // ===========================
    const hrControl = Math.min(1.0,
      esmololCe / (esmololCe + 0.5) * 0.7 +
      labetalolCe / (labetalolCe + 0.8) * 0.5);
    const bpControl = Math.min(1.0,
      nicardipineCe / (nicardipineCe + 0.5) * 0.7 +
      labetalolCe / (labetalolCe + 0.8) * 0.4 +
      nitroprussideCe / (nitroprussideCe + 0.2) * 0.7 +
      nitroglycerinCe / (nitroglycerinCe + 0.3) * 0.5 +
      hydralazineCe / (hydralazineCe + 0.5) * 0.4);
    const overallTreatmentEfficacy = clamp((hrControl + bpControl) / 2, 0, 1.0);

    // ===========================
    // EVENTS
    // ===========================
    if (isHypertensiveEmergency && !prevHyperEmergencyLogged) {
      events.push(
        `🚨 HYPERTENSIVE EMERGENCY: MAP ${map.toFixed(0)} mmHg (SBP ${sbp.toFixed(0)}/DBP ${dbp.toFixed(0)}). END-ORGAN DAMAGE assessment: ${encephalopathyRisk > 0.3 ? '⚠️ Encephalopathy risk elevated; ' : ''}${strokeRisk > 0.4 ? '⚠️ Stroke risk; ' : ''}${renalInjuryRisk > 0.3 ? '⚠️ AKI risk; ' : ''}. TREATMENT PROTOCOL: Target 25% MAP reduction in first hour (to ${mapReductionTarget.toFixed(0)} mmHg — do NOT normalize acutely). Preferred agents: NICARDIPINE 5-15 mg/hr IV (smooth onset/offset) or LABETALOL 20 mg IV q10min (dual alpha/beta). Avoid hydralazine (unpredictable, reflex tachycardia). Avoid nitroprusside > 10 mcg/kg/min × 10 min (cyanide toxicity). Hourly BP checks.`,
      );
      prevHyperEmergencyLogged = true;
    }
    if (map < 120) prevHyperEmergencyLogged = false;

    if (dissection && !prevDissectionLogged) {
      const typeMsg = dissectionType === 'A'
        ? `TYPE A (ASCENDING) — SURGICAL EMERGENCY. Involves aortic root, valve, coronary ostia${coronaryInvolved ? ' (STEMI risk)' : ''}${pericardTamponade ? ', PERICARDIAL TAMPONADE' : ''}. Emergency CT surgery required. While awaiting OR:`
        : 'TYPE B (DESCENDING) — Medical management. Target HR < 60, SBP 100-120 mmHg:';
      events.push(
        `🚨 AORTIC DISSECTION ${typeMsg} CRITICAL DRUG SEQUENCE: (1) ESMOLOL FIRST — HR control BEFORE vasodilators (HR < 60 bpm reduces dP/dt and propagation risk); (2) ADD nicardipine or nitroprusside ONLY after adequate HR control (vasodilators alone → reflex tachycardia → worsens dissection). TARGET: HR < 60 bpm AND SBP 100-110 mmHg (MAP ≈ 70-80). AVOID: positive inotropes, direct vasodilators alone, anything increasing dP/dt. Current shear stress index: ${currentDPdtScore.toFixed(1)} (target < 6.0). CT angio to define extent.`,
      );
      prevDissectionLogged = true;
    }

    if (encephalopathyRisk > 0.5 && !prevEncephalopathyLogged) {
      events.push(
        `⚠️ HYPERTENSIVE ENCEPHALOPATHY / PRES RISK: MAP ${map.toFixed(0)} mmHg exceeds cerebral autoregulation ceiling. Hyperperfusion → vasogenic edema → PRES (posterior reversible encephalopathy syndrome). Symptoms: headache, altered consciousness, seizures, visual disturbances. MRI: posterior white matter T2 hyperintensities. TREATMENT: reduce MAP 25% over first hour; nicardipine or labetalol infusion. SEIZURE MANAGEMENT: benzodiazepines first-line (NOT phenytoin — only modestly effective in hypertensive seizures). Usually reversible with BP control.`,
      );
      prevEncephalopathyLogged = true;
    }
    if (encephalopathyRisk < 0.2) prevEncephalopathyLogged = false;

    return {
      isHypertensiveEmergency,
      isDissection: dissection,
      mapReductionTarget: parseFloat(mapReductionTarget.toFixed(1)),
      hrTarget,
      dPdtRisk: parseFloat(dPdtRisk.toFixed(4)),
      aorticShearStressIndex: parseFloat(aorticShearStressIndex.toFixed(3)),
      encephalopathyRisk: parseFloat(encephalopathyRisk.toFixed(4)),
      strokeRisk: parseFloat(strokeRisk.toFixed(4)),
      renalInjuryRisk: parseFloat(renalInjuryRisk.toFixed(4)),
      overallTreatmentEfficacy: parseFloat(overallTreatmentEfficacy.toFixed(4)),
      currentDPdtScore: parseFloat(currentDPdtScore.toFixed(3)),
      prevHyperEmergencyLogged,
      prevDissectionLogged,
      prevEncephalopathyLogged,
      events,
    };
  }
}
