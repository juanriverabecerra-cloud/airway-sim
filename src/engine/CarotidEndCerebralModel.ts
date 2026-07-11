/**
 * Carotid Endarterectomy + Cerebral Perfusion + Reperfusion Syndrome Model
 *
 * Combines two interrelated physiologic domains:
 * (A) Carotid endarterectomy (CEA) — the most common vascular surgery,
 *     with unique anesthetic challenges around cerebral perfusion during carotid
 *     cross-clamping and neuromonitoring.
 * (B) Reperfusion syndrome — occurs after restoration of flow in ischemic territories
 *     (carotid, hepatic, limb revascularization, liver transplant). The unifying
 *     physiology is ischemia-reperfusion injury (IRI).
 *
 * =========================================================================
 * PART A: CAROTID ENDARTERECTOMY (CEA)
 * =========================================================================
 *
 * === INDICATION ===
 * Symptomatic carotid stenosis ≥ 50% (NASCET criteria): reduces 5-year stroke risk
 * from ~26% to ~9% (NNT ~6). Asymptomatic ≥ 60%: smaller benefit (NNT ~17).
 *
 * === CRITICAL ANESTHETIC MOMENTS ===
 * 1. CAROTID CROSS-CLAMPING:
 *    The ipsilateral cerebral hemisphere is perfused by collateral flow from:
 *    - Contralateral carotid via anterior communicating artery (ACoA)
 *    - Vertebrobasilar circulation via posterior communicating artery (PCoA)
 *    - Carotid shunt placed by surgeon (bypasses clamped segment)
 *    Failure of collateral perfusion → cerebral ischemia → stroke.
 *
 * 2. CEREBRAL PERFUSION MONITORING:
 *    - Awake craniotomy / regional anesthesia (cervical plexus block): gold standard.
 *      Patient responds to commands → immediate ischemia detection.
 *    - EEG (processed): frequency changes indicate ischemia
 *    - Somatosensory evoked potentials (SSEPs): amplitude loss
 *    - Cerebral oximetry (NIRS/rSO2): ipsilateral rSO2 drops during clamping
 *    - Stump pressure: measured in the ICA distal to clamp; > 50 mmHg = adequate
 *      collateral flow; < 40 mmHg = usually shunt placed
 *
 * 3. CAROTID BODY MANIPULATION:
 *    Carotid body (chemoreceptor) and carotid sinus (baroreceptor) at carotid bifurcation.
 *    Surgical manipulation → hemodynamic instability:
 *    - Carotid sinus stimulation → vagal bradycardia, hypotension (baroreceptor reflex)
 *    - Local lidocaine infiltration by surgeon can prevent this
 *
 * 4. REPERFUSION AFTER CLAMP RELEASE:
 *    - Hypertension from restoration of ICA pressure
 *    - Cerebral hyperperfusion syndrome (rare, 0.5%): ipsilateral headache, seizures,
 *      intracerebral hemorrhage from loss of autoregulation in chronically hypoperfused
 *      hemisphere
 *    - Embolism from atheromatous debris dislodged during clamp application/release
 *
 * === SHUNTING CRITERIA (common, not universal):
 *   Shunt placed when: stump pressure < 40-50 mmHg, rSO2 drop > 20%, EEG changes,
 *   neurological deterioration in awake patient.
 *
 * =========================================================================
 * PART B: ISCHEMIA-REPERFUSION INJURY (IRI)
 * =========================================================================
 *
 * Occurs in any organ after restored perfusion following ischemia:
 * - Liver (hepatic transplant, trauma resection): MOST extensively modeled
 * - Limb (tourniquet release, revascularization): muscle compartment syndrome
 * - Heart (CPB reperfusion, coronary reperfusion): myocardial stunning
 * - Intestine (acute mesenteric ischemia)
 *
 * === MECHANISM ===
 * During ischemia: ATP depletion → calcium accumulation, ROS production, mitochondrial
 *   damage, XOR accumulation.
 * On reperfusion: oxygen burst → massive ROS generation from XOR and complex I
 *   → lipid peroxidation, DNA damage, mtPTP opening → cell necrosis and apoptosis.
 * Inflammatory cascade: NF-κB → TNF-α, IL-6 → neutrophil influx → late injury.
 *
 * SYSTEMIC MANIFESTATIONS (especially hepatic IRI in liver transplant):
 * - "Reperfusion syndrome": sudden hypotension (↑40% MAP from baseline) within 5 min
 *   of reperfusion — from: hyperkalemia from ischemic liver, acidosis, vasoactive
 *   amines from ischemic hepatocytes, cold preservation fluid entering circulation
 * - Arrhythmias: bradycardia, AV block, VT/VF from K⁺ and acidosis pulse
 * - DIC: from release of tissue factor from ischemic tissue
 * - SIRS/ALI: downstream inflammatory mediator release
 *
 * TOURNIQUET-SPECIFIC REPERFUSION (limb):
 * - After tourniquet release: acidotic, hyperkalemic, hypothermic venous blood from
 *   the limb enters systemic circulation → transient systemic effects
 * - Duration matters: > 2h tourniquet → significant IRI
 * - No specific reversal; supportive (vasopressors, sodium bicarbonate if severe acidosis)
 *
 * Sources: Michenfelder JD, Mayo Clin Proc 1999 (CEA); Ackerstaff RGA, J Vasc Surg 2000;
 * Clavien PA, Gastroenterology 2007 (hepatic IRI); Ploeg RJ, NEJM 1993 (liver transplant).
 */

export interface CEAReperfusionInputs {
  // CEA-specific
  ceaActive?: boolean;                // CEA procedure in progress
  carotidClamped?: boolean;           // ipsilateral ICA cross-clamped
  carotidShuntInPlace?: boolean;      // surgical shunt bypassing clamp
  carotidStumpPressureMmHg?: number;  // distal ICA pressure during clamp
  ipsilateralRSO2Baseline?: number;   // cerebral oximetry baseline (%)
  ipsilateralRSO2Current?: number;    // cerebral oximetry current (%)
  currentMAP?: number;                // mmHg — important for collateral adequacy
  carotidBodyManipulation?: boolean;  // surgeon at carotid bifurcation

  // Reperfusion scenario
  reperfusionActive?: boolean;        // blood flow restored after ischemia
  reperfusionType?: 'hepatic' | 'limb' | 'carotid' | 'cardiac';
  ischemicDurationMinutes?: number;   // how long was the organ ischemic
  reperfusionTimeSec?: number;        // seconds since reperfusion began

  // Preservation solution / cold ischemia (hepatic/cardiac transplant)
  coldPreservationSolution?: boolean; // cold K+-rich preservation sol in circuit
  preservationKMEqL?: number;         // K+ concentration in preserved organ (mEq/L)

  // Event guards
  prevClampLogged?: boolean;
  prevIschEmiaLogged?: boolean;
  prevReperfusionLogged?: boolean;
  prevHyperperfusionLogged?: boolean;
  prevCarotidBodyLogged?: boolean;
}

export interface CEAReperfusionOutput {
  // CEA
  cerebralPerfusionAdequate: boolean;
  collateralFlowIndex: number;        // 0-1 (0 = no collateral, 1 = full)
  ischemicRiskIndex: number;          // 0-1 stroke risk during clamping
  recommendShunt: boolean;            // based on stump pressure / rSO2 criteria
  carotidBodyVagalEffect: number;     // HR delta (bpm, negative = bradycardia)

  // Reperfusion
  reperfusionSyndromeSeverity: number; // 0-1
  reperfusionHypotensionFraction: number; // 0-0.6 fractional MAP drop
  reperfusionKPulse: number;           // mEq/L added to serum K+ (acute)
  reperfusionAcidosisContribution: number; // pH decrease contribution
  reperfusionArrhythmiaRisk: number;   // 0-1
  hyperperfusionRisk: number;          // 0-1 (ipsilateral hypertension/hemorrhage risk post-clamp)

  prevClampLogged: boolean;
  prevIschEmiaLogged: boolean;
  prevReperfusionLogged: boolean;
  prevHyperperfusionLogged: boolean;
  prevCarotidBodyLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class CarotidEndCerebralModel {
  static tick(inputs: CEAReperfusionInputs = {}): CEAReperfusionOutput {
    const events: string[] = [];
    let prevClampLogged = !!inputs.prevClampLogged;
    let prevIschEmiaLogged = !!inputs.prevIschEmiaLogged;
    let prevReperfusionLogged = !!inputs.prevReperfusionLogged;
    let prevHyperperfusionLogged = !!inputs.prevHyperperfusionLogged;
    let prevCarotidBodyLogged = !!inputs.prevCarotidBodyLogged;

    const ceaActive = !!inputs.ceaActive;
    const clamped = !!inputs.carotidClamped;
    const shuntIn = !!inputs.carotidShuntInPlace;
    const stumpP = clamp(safeNumber(inputs.carotidStumpPressureMmHg, 60), 0, 200);
    const rso2Baseline = clamp(safeNumber(inputs.ipsilateralRSO2Baseline, 68), 40, 90);
    const rso2Current = clamp(safeNumber(inputs.ipsilateralRSO2Current, 68), 20, 90);
    const currentMAP = clamp(safeNumber(inputs.currentMAP, 85), 30, 200);
    const carotidBodyManip = !!inputs.carotidBodyManipulation;

    // ===========================
    // CEA CEREBRAL PERFUSION
    // ===========================
    let collateralFlowIndex = 1.0;
    let recommendShunt = false;
    let cerebralPerfusionAdequate = true;

    if (ceaActive && clamped && !shuntIn) {
      // Stump pressure < 40 mmHg → inadequate collateral
      const stumpPressureIndex = clamp(stumpP / 60, 0, 1.0);
      // rSO2 drop: significant if > 20% relative drop
      const rso2Drop = rso2Baseline > 0 ? (rso2Baseline - rso2Current) / rso2Baseline : 0;
      const rso2Index = clamp(1.0 - rso2Drop / 0.25, 0, 1.0); // 0 if 25% drop or more
      // MAP adequacy: CBF depends on CPP; MAP < 60 reduces collateral adequacy
      const mapIndex = clamp((currentMAP - 40) / 60, 0, 1.0);

      collateralFlowIndex = clamp((stumpPressureIndex * 0.5 + rso2Index * 0.3 + mapIndex * 0.2), 0, 1.0);
      cerebralPerfusionAdequate = collateralFlowIndex > 0.6;
      // Shunt indicated: stump < 40 mmHg, rSO2 drop > 20%, or MAP < 50
      recommendShunt = stumpP < 45 || rso2Drop > 0.20 || currentMAP < 55;

      if (!prevClampLogged) {
        events.push(
          `🔬 CAROTID CROSS-CLAMP APPLIED: ICA cross-clamped. Cerebral perfusion now via collaterals. Stump pressure ${stumpP.toFixed(0)} mmHg (target > 50 mmHg). Ipsilateral rSO2: ${rso2Current.toFixed(0)}% (baseline ${rso2Baseline.toFixed(0)}%, drop: ${(rso2Drop * 100).toFixed(0)}%). Collateral adequacy index: ${(collateralFlowIndex * 100).toFixed(0)}%. ${recommendShunt ? '⚠️ SHUNT RECOMMENDED — collateral flow inadequate. Discuss with surgeon immediately.' : '✅ Collateral flow adequate — shunting not immediately required but monitor continuously.'} Maintain MAP > 80 mmHg during clamp (higher than usual to maximize collateral perfusion). Monitor EEG/SSEP/rSO2. Have vasopressor ready.`,
        );
        prevClampLogged = true;
      }

      if (!cerebralPerfusionAdequate && !prevIschEmiaLogged) {
        events.push(
          `🚨 CEREBRAL ISCHEMIA DURING CEA CLAMPING: Collateral perfusion inadequate (stump ${stumpP.toFixed(0)} mmHg, rSO2 drop ${(rso2Drop * 100).toFixed(0)}%). IMMEDIATE ACTIONS: (1) NOTIFY SURGEON — shunt must be placed NOW; (2) Raise MAP aggressively (phenylephrine/norepinephrine to MAP 90-100 mmHg — maximize collateral flow via cerebral autoregulation); (3) Consider mild hyperventilation cessation (PaCO2 40-45 preserves cerebral vasodilation); (4) CPB-like perfusion if available. Stroke risk HIGH if uncorrected within 2-4 min.`,
        );
        prevIschEmiaLogged = true;
      }
      if (cerebralPerfusionAdequate) prevIschEmiaLogged = false;
    }

    // Post-clamp hyperperfusion risk (after release)
    const hyperperfusionRisk = ceaActive && !clamped && prevClampLogged
      ? 0.05 : 0; // Low but real risk (~0.5% incidence); not easily modeled without known stenosis grade

    // ===========================
    // CAROTID BODY/SINUS MANIPULATION
    // ===========================
    let carotidBodyVagalEffect = 0;
    if (ceaActive && carotidBodyManip) {
      // Carotid sinus compression → baroreceptor activation → vagal bradycardia
      carotidBodyVagalEffect = -25; // bpm (substantial bradycardia)
      if (!prevCarotidBodyLogged) {
        events.push(
          '⚠️ CAROTID SINUS MANIPULATION: Surgical manipulation at carotid bifurcation → carotid sinus baroreceptor stimulation → vagal bradycardia and hypotension. Ask surgeon to inject local anesthetic (1% lidocaine 2mL) around carotid sinus (carotid sinus nerve block) to prevent repeated episodes. Atropine 0.4 mg IV readily available. This is distinct from the carotid cross-clamp hemodynamic changes.',
        );
        prevCarotidBodyLogged = true;
      }
    } else {
      prevCarotidBodyLogged = false;
    }

    // ===========================
    // ISCHEMIA-REPERFUSION SYNDROME
    // ===========================
    const reperfActive = !!inputs.reperfusionActive;
    const reperfType = inputs.reperfusionType || 'hepatic';
    const ischemicMinutes = clamp(safeNumber(inputs.ischemicDurationMinutes, 30), 0, 480);
    const reperfSecSince = clamp(safeNumber(inputs.reperfusionTimeSec, 0), 0, 3600);
    const coldSolution = !!inputs.coldPreservationSolution;
    const preservK = clamp(safeNumber(inputs.preservationKMEqL, 10), 0, 160); // Wisconsin solution K ~115-135 mEq/L!

    let reperfusionSyndromeSeverity = 0;
    let reperfusionHypotensionFraction = 0;
    let reperfusionKPulse = 0;
    let reperfusionAcidosisContribution = 0;
    let reperfusionArrhythmiaRisk = 0;

    if (reperfActive) {
      // Severity proportional to ischemic duration and organ type
      const ischemicSeverity = clamp(ischemicMinutes / 120, 0, 1.0);
      const typeFactor = reperfType === 'hepatic' ? 1.5 : reperfType === 'cardiac' ? 1.2 : reperfType === 'limb' ? 0.8 : 0.6;

      // Temporal profile: peaks at 1-3 min post-reperfusion, resolves over 15-30 min
      const timingFactor = reperfSecSince < 300
        ? Math.min(1.0, reperfSecSince / 30) * Math.max(0, 1.0 - reperfSecSince / 600)
        : 0;

      reperfusionSyndromeSeverity = clamp(ischemicSeverity * typeFactor * timingFactor, 0, 1.0);

      // Hemodynamic effects
      reperfusionHypotensionFraction = reperfusionSyndromeSeverity * 0.45; // up to 45% MAP drop
      reperfusionKPulse = coldSolution
        ? clamp(preservK / 10 * reperfusionSyndromeSeverity, 0, 5.0) // mEq/L K+ spike
        : ischemicSeverity * 1.5;
      reperfusionAcidosisContribution = ischemicSeverity * 0.08; // pH drop
      reperfusionArrhythmiaRisk = clamp(reperfusionKPulse / 5 + reperfusionSyndromeSeverity * 0.3, 0, 0.8);

      if (!prevReperfusionLogged) {
        const typeLabel = {
          hepatic: 'HEPATIC/LIVER TRANSPLANT',
          limb: 'LIMB REVASCULARIZATION/TOURNIQUET',
          carotid: 'CAROTID CLAMP RELEASE',
          cardiac: 'CARDIAC/CPB REPERFUSION',
        }[reperfType] || 'REPERFUSION';
        events.push(
          `🚨 REPERFUSION SYNDROME — ${typeLabel}: Flow restored after ${ischemicMinutes.toFixed(0)} min ischemia. Expect within next 1-5 min: (1) Sudden HYPOTENSION (vasoactive mediators + cold preservation fluid flush — up to 40% MAP drop); (2) Hyperkalemia spike from K⁺-rich preservation fluid${coldSolution ? ` (K⁺ ${preservK.toFixed(0)} mEq/L in solution)` : ' and ischemic cell leak'}; (3) Acidosis (lactate + H⁺ from ischemic tissue); (4) ARRHYTHMIA risk (bradycardia, VT/VF from K⁺ and acidosis). MANAGEMENT: Calcium gluconate 1g IV BEFORE unclamping; vasopressors ready (NE/vasopressin); NaHCO3 for severe acidosis; CPR protocol if cardiac arrest.`,
        );
        prevReperfusionLogged = true;
      }
    }

    // ===========================
    // ISCHEMIC RISK INDEX (combined CEA cerebral + reperfusion)
    // ===========================
    const ceaIschemicRisk = ceaActive && clamped && !shuntIn
      ? clamp(1 - collateralFlowIndex, 0, 1.0) : 0;
    const reperfRisk = reperfusionArrhythmiaRisk;
    const ischemicRiskIndex = clamp(Math.max(ceaIschemicRisk, reperfRisk), 0, 1.0);

    return {
      cerebralPerfusionAdequate,
      collateralFlowIndex: parseFloat(collateralFlowIndex.toFixed(4)),
      ischemicRiskIndex: parseFloat(ischemicRiskIndex.toFixed(4)),
      recommendShunt,
      carotidBodyVagalEffect,
      reperfusionSyndromeSeverity: parseFloat(reperfusionSyndromeSeverity.toFixed(4)),
      reperfusionHypotensionFraction: parseFloat(reperfusionHypotensionFraction.toFixed(4)),
      reperfusionKPulse: parseFloat(reperfusionKPulse.toFixed(3)),
      reperfusionAcidosisContribution: parseFloat(reperfusionAcidosisContribution.toFixed(4)),
      reperfusionArrhythmiaRisk: parseFloat(reperfusionArrhythmiaRisk.toFixed(4)),
      hyperperfusionRisk: parseFloat(hyperperfusionRisk.toFixed(4)),
      prevClampLogged,
      prevIschEmiaLogged,
      prevReperfusionLogged,
      prevHyperperfusionLogged,
      prevCarotidBodyLogged,
      events,
    };
  }
}
