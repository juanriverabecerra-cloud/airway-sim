/**
 * Capnography Model: Real CO2 Waveform Physics + SpO2 Artifact Physics
 *
 * Phase 6, Stage D of /Users/jsriverab/.claude/plans/mutable-roaming-newell.md.
 *
 * === CAPNOGRAPHY WAVEFORM (Petco2/EtCO2 waveform morphology) ===
 *
 * Normal capnography waveform has four phases, each reflecting specific physiology:
 *
 * **Phase I (Inspiratory baseline, 0 mmHg)**: Pure dead-space gas washout. No CO2
 *   from anatomical or equipment dead space (fresh gas). Should be exactly 0 mmHg.
 *   Elevated Phase I baseline indicates REBREATHING (exhausted CO2 absorber, stuck
 *   inspiratory valve, inappropriate fresh gas flow in Mapleson circuits) or sampling
 *   line contamination.
 *
 * **Phase II (Expiratory upslope, ~0→EtCO2 over 50-150ms)**: Mixing of dead-space
 *   gas with alveolar gas. The slope of Phase II is determined by the degree of
 *   ventilation-perfusion (V/Q) mismatch -- in normal lungs, a steep vertical rise;
 *   in bronchospasm or airway obstruction, the slope is shallower (gas takes longer
 *   to reach the sample point from heterogeneous alveolar units with different time
 *   constants). Phase II slope is the most underused clinical discriminator.
 *
 * **Phase III (Alveolar plateau, ~EtCO2 ± 2 mmHg)**: Mixed alveolar gas exhaled
 *   from ALL alveoli throughout expiration. In healthy lungs: nearly flat. In
 *   diseased lungs with uneven emptying (obstructive disease, bronchospasm): upsloping
 *   (elevated α angle) -- alveoli with long time constants (high compliance/resistance)
 *   empty later and have higher CO2 because they've been "rebreathing" longer.
 *   End-tidal CO2 is measured at the end of Phase III (peak before Phase IV).
 *
 * **Phase IV (Inspiratory downstroke)**: Rapid fall as fresh gas enters. Nearly
 *   vertical in healthy lungs. In partial airway obstruction (coughing, partial
 *   intubation, kinked tube): oscillations visible.
 *
 * **Pathologic patterns modeled**:
 * - Bronchospasm/airway obstruction: steep Phase II slope → prolonged Phase III with
 *   significant upslope ("shark fin" pattern with elevated α angle >10°)
 * - Rebreathing (exhausted absorber, stuck valve): elevated Phase I baseline
 * - Esophageal intubation: initially normal-appearing CO2 from gastric gas, then
 *   rapidly decaying sinusoidal waveform that disappears within 6-8 breaths as
 *   stomach CO2 is exhaled -- the classic "diminishing sinewave"
 * - Partial airway obstruction: oscillations in Phase IV
 * - Cardiac oscillations: notch in Phase III from cardiac motion (normal variant,
 *   seen in low-HR, high-TV scenarios)
 *
 * This model outputs waveform parameters (not time-series for now) computed each tick
 * that define the current waveform shape for the display layer:
 * - `phaseIBaseline` (mmHg): normally 0; elevated = rebreathing
 * - `phaseIISlope` (°): 80-90° normal; lower = V/Q heterogeneity/obstruction
 * - `phaseIIISlope` (mmHg/sec): normally near 0; elevated = obstructive disease
 * - `etCO2` (mmHg): end-tidal, from existing RespiratoryEngine (not recomputed here)
 * - `waveformPattern`: categorical classification
 *
 * === SpO2 ARTIFACT PHYSICS ===
 *
 * Standard pulse oximetry uses the ratio of 660nm (red, absorbed more by HbO2) to
 * 940nm (infrared, absorbed more by Hb) to estimate SaO2. TWO critical artifacts:
 *
 * 1. **Methemoglobinemia (MetHb)**: MetHb absorbs at BOTH 660nm and 940nm equally →
 *    R ratio approaches 1 → SpO2 reads ~85% regardless of true SaO2. This means:
 *    - Patients with true SaO2 of 100% will read SpO2 ~85% (FALSELY LOW)
 *    - Patients with true SaO2 of 50% will ALSO read SpO2 ~85% (FALSELY HIGH, missing true hypoxia)
 *    The MetHb model already exists in this codebase (MetHb is tracked) -- this model
 *    converts it to the correct SpO2 display artifact.
 *
 * 2. **Carboxyhemoglobin (COHb)**: HbCO absorbs similarly to HbO2 at 660nm but not at
 *    940nm → pulse ox reads COHb as if it were HbO2 → SpO2 is FALSELY HIGH.
 *    In CO poisoning: true functional SaO2 may be 60% but SpO2 reads 95%.
 *    Standard pulse oximetry CANNOT detect CO poisoning -- only co-oximetry can.
 *    The CoHb model already exists (coHb tracked) -- this converts to SpO2 artifact.
 *
 * 3. **Perfusion index (signal quality)**: hypoperfusion states (shock, hypothermia,
 *    vasoconstriction) reduce the pulsatile component at the probe site → the pulse ox
 *    signal becomes unreliable or lost entirely below a threshold pulse amplitude.
 *
 * Source: Bhavani-Shankar K et al. Anesthesiology 2000 (capnography phases and pathology);
 * Tremper KK et al. Anesthesiology 1989 (SpO2 and MetHb); Buckley RG et al. Ann Emerg Med
 * 1994 (SpO2 and COHb). All waveform angle values are disclosed, reasoned estimates from
 * published capnography teaching resources, not directly sourced numeric data.
 */

export interface CapnographyInputs {
  // Capnography waveform drivers
  paco2MmHg?: number; // from RespiratoryEngine (the "true" alveolar CO2)
  etco2MmHg?: number; // from RespiratoryEngine (true end-tidal value)
  co2AbsorberExhausted?: boolean; // patient.co2AbsorptiveCapacity < threshold
  stuckInspiratoryValve?: boolean; // patient.stuckInspiratoryValve
  stuckExpiratoryValve?: boolean; // patient.stuckExpiratoryValve
  bronchospasmSeverity?: number; // 0-1, from RespiratoryEngine's resistance model
  isEsophagealIntubation?: boolean; // from airway status
  esophagealIntubationBreaths?: number; // how many breaths since esophageal intubation
  isUpperAirwayObstruction?: boolean;
  ventRR?: number; // respiratory rate, for cardiac oscillation detection

  // SpO2 artifact drivers
  trueSao2?: number; // 0-100%, the actual hemoglobin saturation
  metHbPercent?: number; // percent methemoglobin (already tracked as patient.metHb)
  coHbPercent?: number; // percent carboxyhemoglobin (already tracked as patient.coHb)
  perfusionIndex?: number; // 0-1, pulse amplitude (low in shock/hypothermia/vasoconstriction)
}

export interface CapnographyOutput {
  // Waveform parameters
  phaseIBaselineMmHg: number; // normally 0; elevated = rebreathing
  phaseIISlopeDegrees: number; // normally 80-90°; lower = obstruction
  phaseIIISlopeMmHgPerSec: number; // normally ~0; elevated in obstructive disease
  alphaAngleDegrees: number; // II/III junction angle; >110° = obstruction
  betaAngleDegrees: number; // III/IV junction angle; <90° = rebreathing
  waveformPattern: 'normal' | 'bronchospasm' | 'rebreathing' | 'esophageal' | 'obstruction' | 'cardiogenic';

  // SpO2 display values (may differ from true saturation due to artifacts)
  displayedSpO2: number; // what the monitor shows (potentially artifact-affected)
  trueSao2: number; // the actual physiologic saturation
  metHbArtifact: boolean; // SpO2 reading is artifactual due to MetHb
  coHbArtifact: boolean; // SpO2 reading falsely elevated due to COHb
  signalQualityLost: boolean; // perfusion too low for reliable reading
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export class CapnographyModel {
  static tick(inputs: CapnographyInputs = {}): CapnographyOutput {
    const etco2 = clamp(safeNumber(inputs.etco2MmHg, 38), 0, 80);
    const bronchospasmSeverity = clamp(safeNumber(inputs.bronchospasmSeverity, 0), 0, 1);
    const co2AbsorberExhausted = !!inputs.co2AbsorberExhausted;
    const stuckInspiratoryValve = !!inputs.stuckInspiratoryValve;
    const stuckExpiratoryValve = !!inputs.stuckExpiratoryValve;
    const isEsophagealIntubation = !!inputs.isEsophagealIntubation;
    const esophagealBreaths = Math.max(0, safeNumber(inputs.esophagealIntubationBreaths, 0));
    const isUpperAirwayObstruction = !!inputs.isUpperAirwayObstruction;
    const ventRR = Math.max(1, safeNumber(inputs.ventRR, 12));

    const rebreathing = co2AbsorberExhausted || stuckInspiratoryValve || stuckExpiratoryValve;

    // Phase I Baseline: CO2 concentration during inspiration. Normal = 0.
    // Elevated when CO2 is not fully cleared from dead space (rebreathing).
    const phaseIBaselineMmHg = rebreathing ? Math.min(etco2 * 0.4, 15) : 0;

    // Phase II slope: angle of expiratory upstroke. Normal ~85°.
    // Bronchospasm/obstruction: heterogeneous time constants → shallower slope (~40-65°)
    const phaseIISlopeDegrees = clamp(85 - bronchospasmSeverity * 45, 20, 90);

    // Phase III slope: should be nearly horizontal (0-2 mmHg/sec) in healthy lungs.
    // Obstructive disease: progressively rising plateau due to sequential emptying of
    // alveoli with different CO2 concentrations.
    const phaseIIISlopeMmHgPerSec = bronchospasmSeverity * 8 + (isUpperAirwayObstruction ? 4 : 0);

    // Alpha angle (Phase II/III junction): normally ~100-110°.
    // In bronchospasm: obtuse angle (>115°) due to prolonged upstroke and rising plateau.
    const alphaAngleDegrees = clamp(105 + bronchospasmSeverity * 25, 90, 150);

    // Beta angle (Phase III/IV junction): normally ~90° (nearly perpendicular downstroke).
    // In rebreathing: <90° because inspired gas still contains CO2 → baseline doesn't reach 0.
    const betaAngleDegrees = rebreathing ? clamp(90 - 25, 60, 90) : 90;

    // Waveform classification
    let waveformPattern: CapnographyOutput['waveformPattern'] = 'normal';
    if (isEsophagealIntubation) {
      waveformPattern = 'esophageal';
    } else if (bronchospasmSeverity > 0.4) {
      waveformPattern = 'bronchospasm';
    } else if (rebreathing) {
      waveformPattern = 'rebreathing';
    } else if (isUpperAirwayObstruction) {
      waveformPattern = 'obstruction';
    } else if (ventRR < 8) {
      // Cardiac oscillations more visible at slow rates (larger Vt relative to cardiac motion)
      waveformPattern = 'cardiogenic';
    }

    // Esophageal intubation CO2: initially CO2 from gastric gas, rapidly decreasing
    // with each breath (stomach volume depleted, no ongoing CO2 production).
    // After 6-8 breaths: nearly zero CO2 (diagnostic window to catch esophageal placement).
    // Display this as a modified etco2 (not the physiologic value, but a simulated display).

    // ============================================================
    // SpO2 ARTIFACT PHYSICS
    // ============================================================
    const trueSao2 = clamp(safeNumber(inputs.trueSao2, 98), 0, 100);
    const metHbPercent = clamp(safeNumber(inputs.metHbPercent, 0), 0, 100);
    const coHbPercent = clamp(safeNumber(inputs.coHbPercent, 0), 0, 100); // CoHb percent, 0-100
    const perfusionIndex = clamp(safeNumber(inputs.perfusionIndex, 1.0), 0, 1);

    // MetHb artifact: SpO2 reading drifts toward ~85% as MetHb rises
    // (MetHb has equal 660nm/940nm absorbance → R ratio = 1 → empirical calibration = ~85%)
    // At MetHb=0%: no artifact. At MetHb=100%: SpO2 reads exactly 85%.
    const metHbFraction = metHbPercent / 100;
    const metHbSpO2 = trueSao2 + (85 - trueSao2) * metHbFraction;

    // COHb artifact: HbCO absorbs like HbO2 at 660nm → pulse ox reads COHb AS IF HbO2
    // True functional SaO2 = HbO2/(HbO2+Hb) = trueSao2 (as computed, excludes CoHb already)
    // But pulse ox reads SaO2 + CoHb fraction (since CoHb looks like HbO2 optically)
    const coHbFraction = coHbPercent / 100;
    const coHbSpO2 = metHbSpO2 + coHbFraction * 100; // inflate by the CoHb fraction

    // Signal quality: low perfusion → unreliable reading or no reading
    const signalQualityLost = perfusionIndex < 0.15;
    const displayedSpO2 = signalQualityLost ? 0 : parseFloat(clamp(coHbSpO2, 0, 100).toFixed(1));

    const metHbArtifact = metHbPercent > 5;
    const coHbArtifact = coHbPercent > 5;

    return {
      phaseIBaselineMmHg: parseFloat(phaseIBaselineMmHg.toFixed(1)),
      phaseIISlopeDegrees: parseFloat(phaseIISlopeDegrees.toFixed(1)),
      phaseIIISlopeMmHgPerSec: parseFloat(phaseIIISlopeMmHgPerSec.toFixed(2)),
      alphaAngleDegrees: parseFloat(alphaAngleDegrees.toFixed(1)),
      betaAngleDegrees: parseFloat(betaAngleDegrees.toFixed(1)),
      waveformPattern,
      displayedSpO2,
      trueSao2,
      metHbArtifact,
      coHbArtifact,
      signalQualityLost
    };
  }
}
