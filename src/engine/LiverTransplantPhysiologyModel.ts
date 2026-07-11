/**
 * Liver Transplant (OLT) and End-Stage Liver Disease Perioperative Physiology Model
 *
 * Orthotopic liver transplantation (OLT) has among the most complex hemodynamics of
 * any surgical procedure. Three distinct phases each with unique physiology:
 *
 * === PHASE 1: PRE-ANHEPATIC (native liver in place) ===
 * End-stage liver disease (ESLD/cirrhosis) creates a unique hemodynamic state:
 * - Hyperdynamic circulation: ↑CO (7-12 L/min), ↓SVR (from splanchnic vasodilation
 *   due to portal hypertension releasing NO/prostacyclins into systemic circulation)
 * - Portal hypertension: hepatic venous pressure gradient (HVPG) > 12 mmHg → varices
 * - Renal dysfunction: hepatorenal syndrome (Type 1 = acute, Type 2 = chronic)
 * - Severe coagulopathy: reduced synthesis of ALL clotting factors (except FVIII, VWF)
 * - Thrombocytopenia: hypersplenism from portal hypertension
 * - Hypoalbuminemia: reduced oncotic pressure → ascites, edema, anasarca
 * - Encephalopathy: ammonia accumulates without hepatic metabolism → cerebral edema in
 *   acute liver failure (ALF) → ICP elevation → herniation (most lethal complication in ALF)
 * - Pulmonary complications: hepatopulmonary syndrome (HPsyn: V/Q mismatch from intrapulmonary
 *   shunts via dilated capillaries), portopulmonary hypertension (already in HepaticEngine.ts)
 *
 * === PHASE 2: ANHEPATIC (liver removed, before new liver) ===
 * Most hemodynamically challenging phase:
 * - Portal vein and IVC clamped → sudden 60-70% decrease in venous return → severe hypotension
 * - Venous bypass (VVB) via portal vein + IVC → axillary vein may be used to maintain CO
 * - No hepatic function: NO clotting factor synthesis, NO glucose production (hypoglycemia),
 *   NO lactate clearance (metabolic acidosis), NO drug metabolism (especially citrate from FFP
 *   → ionized hypocalcemia), no ammonia clearance
 * - Progressive coagulopathy, acidosis, hypothermia (the "lethal triad" applies)
 * - Active fibrinolysis: plasminogen activator released from donor liver
 *
 * === PHASE 3: REPERFUSION (new liver reperfused) ===
 * Reperfusion syndrome (already in CarotidEndCerebralModel):
 * - Sudden release of cold (0-4°C), K+-rich, acidotic preservation solution (Wisconsin
 *   solution: K+ 115-130 mEq/L) from donor liver into circulation
 * - Acute: profound hypotension, hyperkalemia, acidosis, bradycardia, VF risk
 * - New liver begins functioning: clotting factors synthesized (hours), glucose regulated,
 *   lactate cleared, drugs metabolized
 *
 * === KEY CLINICAL CONCERNS ===
 * 1. MELD score: predicts 90-day transplant wait-list mortality
 *    MELD = 3.78×ln(bilirubin) + 11.2×ln(INR) + 9.57×ln(creatinine) + 6.43
 *    Higher MELD → sicker patient → more complex anesthesia
 * 2. Acute kidney injury: present in 40-60% of ESLD; improves with new liver (hepatorenal)
 *    or may be independent (must transplant kidney too)
 * 3. Hepatopulmonary syndrome: PaO2 < 60 mmHg on room air + portal hypertension + intrapulmonary
 *    shunts → resolves slowly after OLT (may take 6-12 months)
 * 4. Portopulmonary hypertension: mPAP > 25 mmHg in portal hypertension context → high
 *    perioperative risk; if mPAP > 45 mmHg → OLT contraindicated
 *
 * Sources: Steadman RH, Anesthesiology 1992; Findlay JY, Liver Transplantation 2010;
 * Feltracco P, Transplant Proc 2011; Miller's 9th Ed Ch 67 (Hepatic Transplantation).
 */

export interface LTPhysiologyInputs {
  // Liver disease severity
  meldScore?: number;           // 6-40 (6 = healthy, 40 = expected 90-day mortality > 70%)
  isALF?: boolean;              // acute liver failure (different pathophysiology from cirrhosis)
  hasHepPulmonarySyndrome?: boolean; // HPS: SpO2 often < 90% on room air
  hasPortoPulmonaryHTN?: boolean;   // PoPH: separate from standard PH

  // OLT phase
  oltPhase?: 'pre_anhepatic' | 'anhepatic' | 'reperfusion' | 'post_reperfusion';
  anhepticDurationMinutes?: number;  // minutes elapsed in anhepatic phase
  reperfusionMinutesSince?: number;  // minutes since reperfusion started

  // Current labs
  currentINR?: number;
  currentCreatinine?: number;   // mg/dL
  currentBilirubin?: number;    // mg/dL
  currentIonizedCa?: number;    // mmol/L (citrate from FFP chelates Ca)
  currentLactate?: number;      // mmol/L (no hepatic clearance in anhepatic)

  // FFP/blood products given in anhepatic phase
  ffpVolumeMlThisPhase?: number; // feeds citrate-induced hypocalcemia

  // Event guards
  prevAnhepacticLogged?: boolean;
  prevReperfusionLogged?: boolean;
  prevHPSLogged?: boolean;
}

export interface LTPhysiologyOutput {
  // Phase-specific hemodynamic effects
  currentPhase: string;
  anhepaticVRReduction: number;    // fraction reduction in venous return (0-0.65)
  hyperdynamicCOMult: number;      // CO multiplier from portal hypertension (1.0-2.0)
  svrReductionFromCirrhosis: number; // fraction SVR reduced (splanchnic vasodilation)

  // Metabolic effects
  glucoseDepletion: number;        // mg/dL/min in anhepatic
  lactateAccumulation: number;     // mmol/L/min in anhepatic
  citrateCaDropRate: number;       // mmol/L/min from FFP (ionized Ca²⁺ chelation)
  fibrinolysisIndex: number;       // 0-1 (active fibrinolysis in reperfusion)

  // Hepatopulmonary syndrome
  hpsShuntContribution: number;    // additive to RespiratoryEngine shunt (0-0.30)
  hpsCompliancePenalty: number;

  // MELD-derived risk
  meldScore: number;
  esldInotropyPenalty: number;     // fraction cardiomyopathy from ESLD (0-0.30)

  prevAnhepaticLogged: boolean;
  prevReperfusionLogged: boolean;
  prevHPSLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class LiverTransplantPhysiologyModel {
  static tick(inputs: LTPhysiologyInputs = {}): LTPhysiologyOutput {
    const events: string[] = [];
    let prevAnhepaticLogged = !!inputs.prevAnhepacticLogged;
    let prevReperfusionLogged = !!inputs.prevReperfusionLogged;
    let prevHPSLogged = !!inputs.prevHPSLogged;

    const meldScore = clamp(safeNumber(inputs.meldScore, 10), 6, 40);
    const isALF = !!inputs.isALF;
    const hasHPS = !!inputs.hasHepPulmonarySyndrome;
    const hasPoPH = !!inputs.hasPortoPulmonaryHTN;
    const oltPhase = inputs.oltPhase || 'pre_anhepatic';
    const inr = clamp(safeNumber(inputs.currentINR, 1.0), 0.8, 10);
    const creatinine = clamp(safeNumber(inputs.currentCreatinine, 1.0), 0.5, 15);
    const bilirubin = clamp(safeNumber(inputs.currentBilirubin, 1.0), 0.3, 60);
    const ionizedCa = clamp(safeNumber(inputs.currentIonizedCa, 1.2), 0.5, 1.6);
    const lactate = clamp(safeNumber(inputs.currentLactate, 1.0), 0.5, 20);
    const ffpMl = clamp(safeNumber(inputs.ffpVolumeMlThisPhase, 0), 0, 20000);

    // ===========================
    // MELD SCORE SEVERITY
    // ===========================
    const meldSeverity = clamp((meldScore - 6) / 34, 0, 1.0); // 0=MELD6, 1=MELD40

    // ===========================
    // PRE-ANHEPATIC: ESLD HYPERDYNAMIC CIRCULATION
    // ===========================
    // Splanchnic vasodilation (NO, prostacyclin) → ↓SVR, ↑CO
    const svrReductionFromCirrhosis = oltPhase === 'pre_anhepatic'
      ? clamp(meldSeverity * 0.45, 0, 0.50) : 0;
    const hyperdynamicCOMult = oltPhase === 'pre_anhepatic'
      ? 1.0 + meldSeverity * 0.8 : 1.0; // up to 1.8× normal CO

    // ===========================
    // ANHEPATIC PHASE
    // ===========================
    const anhepaticDurationMin = oltPhase === 'anhepatic' ? clamp(safeNumber(inputs.anhepticDurationMinutes, 0), 0, 600) : 0;

    // IVC/portal vein clamping → ↓venous return
    const anhepaticVRReduction = oltPhase === 'anhepatic' ? 0.55 : 0;

    // No hepatic function: glucose depletion (hypoglycemia develops over 60+ min)
    const glucoseDepletion = oltPhase === 'anhepatic' ? 2.0 : 0; // mg/dL per min

    // No lactate clearance → accumulation
    const lactateAccumulation = oltPhase === 'anhepatic' ? 0.05 : 0; // mmol/L per min

    // Citrate from FFP chelates ionized Ca²⁺ (liver normally metabolizes citrate)
    const citrateCaDropRate = oltPhase === 'anhepatic' && ffpMl > 0
      ? clamp(ffpMl / 1000 * 0.02, 0, 0.05) : 0; // mmol/L per min

    if (oltPhase === 'anhepatic' && !prevAnhepaticLogged) {
      events.push(
        `🔴 ANHEPATIC PHASE ACTIVE: Liver explanted, awaiting donor organ. CRITICAL MONITORING: (1) Glucose q15 min (no hepatic gluconeogenesis → hypoglycemia in 60-90 min — give 50% dextrose); (2) Ionized Ca²⁺ q15 min (citrate in FFP not metabolized → chelates Ca → hypocalcemia — give CaCl 0.5-1g per 2-4 units FFP); (3) Lactate (no clearance → metabolic acidosis); (4) Temperature (hypothermia accelerates); (5) K⁺ (acidosis + cold preservation from donor). HEMODYNAMICS: IVC/portal clamping → 40-60% reduction in venous return → vasopressors (NE preferred). NO CLOTTING FACTOR SYNTHESIS — TEG/ROTEM guides product administration; avoid factor dilution. Venovenous bypass if severe hypotension.`,
      );
      prevAnhepaticLogged = true;
    }

    // ===========================
    // REPERFUSION PHASE
    // ===========================
    const reperfMinutes = oltPhase === 'reperfusion' ? clamp(safeNumber(inputs.reperfusionMinutesSince, 0), 0, 120) : 0;

    // Active fibrinolysis: plasminogen activator released from donor liver
    const fibrinolysisIndex = oltPhase === 'reperfusion'
      ? clamp(1.0 - reperfMinutes / 30, 0, 1.0) // peaks immediately, resolves 30 min
      : 0;

    if (oltPhase === 'reperfusion' && !prevReperfusionLogged) {
      events.push(
        `🚨 OLT REPERFUSION — DONOR LIVER REPERFUSED: Wisconsin preservation solution (K⁺ ~115-130 mEq/L) entering systemic circulation. Expect within 1-5 min: (1) K⁺ SPIKE → bradycardia, VF risk (have calcium chloride, sodium bicarbonate, glucose/insulin ready); (2) PROFOUND HYPOTENSION (vasopressin + norepinephrine); (3) ACIDOSIS (cold ischemic metabolic waste); (4) HYPOTHERMIA (cold organ); (5) ACTIVE FIBRINOLYSIS (tPA from donor liver → give TXA 1g, verify with TEG); (6) BRADYCARDIA (may need pacing). Cardiac arrest occurs in 1-5% at reperfusion. Calculate ahead and pre-treat with CaCl 1g IV BEFORE unclamping.`,
      );
      prevReperfusionLogged = true;
    }

    // ===========================
    // HEPATOPULMONARY SYNDROME (HPS)
    // ===========================
    const hpsShuntContribution = hasHPS ? clamp(meldSeverity * 0.25, 0, 0.30) : 0;
    const hpsCompliancePenalty = hasHPS ? clamp(meldSeverity * 0.10, 0, 0.15) : 0;

    if (hasHPS && !prevHPSLogged) {
      events.push(
        `⚠️ HEPATOPULMONARY SYNDROME (HPS): SpO2 often < 90% on room air from INTRAPULMONARY VASCULAR DILATIONS (NOT classic shunt — dilated capillaries allow diffusion-impaired O2 transfer). Characteristically WORSE in UPRIGHT position (orthodeoxia) — more blood flow to lung bases where dilations are most dense. Pre-OLT: supplemental O2 (often requires 4-6 L/min). Post-OLT: HPS RESOLVES in 6-12 months as new liver corrects vasodilator excess. Intraoperatively: accept lower SpO2 targets (90-92% may be best achievable); avoid N₂O (worsens V/Q mismatch). HPS is a MELD exception — these patients get priority listing.`,
      );
      prevHPSLogged = true;
    }

    // ESLD cardiomyopathy (cirrhotic cardiomyopathy)
    // Blunted chronotropic and inotropic response to stress
    const esldInotropyPenalty = clamp(meldSeverity * 0.25, 0, 0.30);

    return {
      currentPhase: oltPhase,
      anhepaticVRReduction: parseFloat(anhepaticVRReduction.toFixed(4)),
      hyperdynamicCOMult: parseFloat(hyperdynamicCOMult.toFixed(3)),
      svrReductionFromCirrhosis: parseFloat(svrReductionFromCirrhosis.toFixed(4)),
      glucoseDepletion: parseFloat(glucoseDepletion.toFixed(2)),
      lactateAccumulation: parseFloat(lactateAccumulation.toFixed(4)),
      citrateCaDropRate: parseFloat(citrateCaDropRate.toFixed(5)),
      fibrinolysisIndex: parseFloat(fibrinolysisIndex.toFixed(4)),
      hpsShuntContribution: parseFloat(hpsShuntContribution.toFixed(4)),
      hpsCompliancePenalty: parseFloat(hpsCompliancePenalty.toFixed(4)),
      meldScore,
      esldInotropyPenalty: parseFloat(esldInotropyPenalty.toFixed(4)),
      prevAnhepaticLogged,
      prevReperfusionLogged,
      prevHPSLogged,
      events,
    };
  }
}
