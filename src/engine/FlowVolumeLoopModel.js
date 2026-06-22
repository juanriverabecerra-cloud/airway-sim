/**
 * Flow-Volume Loop Synthesizer
 *
 * Models the classic pulmonary-function-test display: airflow rate (L/s) plotted
 * against lung volume (L) as a closed loop traced once per breath. Shape knowledge
 * (normal contour, and how obstructive/restrictive/variable-extrathoracic disease
 * distort it) is general pulmonary physiology, not sourced from a specific Miller's
 * chapter — see docs/engines/physiology.md for the disclosed rationale.
 *
 * Deliberately mirrors the existing synthesizer pattern (EtCo2Model.js, VentModel.js):
 * take the physiology engine's already-computed per-tick scalars (resistance,
 * compliance, lung volumes, comorbidity flags) and synthesize a clinically-shaped
 * curve, rather than running a first-principles flow ODE.
 *
 * Clinical convention: volume increases left-to-right (RV at the origin, TLC at the
 * far right). Expiratory flow is positive (plotted above the zero-flow axis),
 * inspiratory flow is negative (below it). The loop is traced
 * TLC -> (expiration) -> RV -> (inspiration) -> TLC.
 */

const DEFAULT_R = 5;     // cmH2O/L/s, matches VentModel.js/EtCo2Model.js's own baseline
const DEFAULT_C = 60;    // mL/cmH2O, matches VentModel.js/EtCo2Model.js's own baseline
const DEFAULT_TLC_L = 6.0;
const DEFAULT_RV_L = 1.5;
const DEFAULT_FVC_L = 4.5;

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * @param {object} patient - live patient state (flags + lungVolumes from RespiratoryEngine)
 * @param {object} vitals - live vitals (expects res, compl, rr)
 * @param {number} numPoints - resolution of the traced loop (per limb)
 * @returns {{points: Array<{volume:number, flow:number}>, tlc:number, rv:number, fvc:number, pef:number, pif:number, pattern:string, interpretation:string}}
 */
export function generateFlowVolumeLoop(patient, vitals, numPoints = 80) {
  const lv = patient?.lungVolumes;
  const tlc = safeNumber(lv?.tlc_mL, DEFAULT_TLC_L * 1000) / 1000;
  const rvVal = safeNumber(lv?.rv_mL, DEFAULT_RV_L * 1000) / 1000;
  const fvc = Math.max(0.3, safeNumber(lv?.fvc_mL, DEFAULT_FVC_L * 1000) / 1000);
  const fev1FvcRatio = safeNumber(lv?.fev1FvcRatio, 80);

  const R = Math.max(0.1, safeNumber(vitals?.res, DEFAULT_R));
  const C = Math.max(1, safeNumber(vitals?.compl, DEFAULT_C));
  const rr = safeNumber(vitals?.rr, 12);

  // Resistance ratio is the single continuous driver shared with the other
  // waveform synthesizers (VentModel.js, EtCo2Model.js already inflate `res`
  // for bronchospasm/COPD/GOLD-stage) — reusing it here keeps this model
  // consistent with what those waveforms are already showing, rather than
  // re-deriving obstruction severity from the flags a second time.
  const resistanceRatio = R / DEFAULT_R;
  const isObstructiveByRatio = fev1FvcRatio < 75 || patient?.copd || patient?.bronchospasm ||
    (typeof patient?.pulmonaryComorbidity === 'string' && patient.pulmonaryComorbidity.toLowerCase().includes('copd'));
  const obstructionSeverity = isObstructiveByRatio ? Math.max(0, Math.min(1, (resistanceRatio - 1) / 6)) : 0;

  // Peak expiratory flow scales inversely with resistance (a stiffer/narrower
  // airway limits the achievable peak flow for the same effort) and with
  // compliance (very low compliance — e.g. ARDS/restrictive — also blunts PEF).
  const complianceFactor = Math.max(0.4, Math.min(1.2, C / DEFAULT_C));
  const pef = Math.max(0.8, 8.0 * (DEFAULT_R / R) * Math.sqrt(complianceFactor));
  const pif = Math.max(0.6, pef * 0.78);

  // Expiratory descent concavity: 1 = normal (near-linear), higher = more
  // "scooped"/coved (obstructive). Bounded so it never inverts or degenerates.
  const concavityK = 1 + obstructionSeverity * 5;

  // Upper-airway collapsibility index (0 = fully patent, 1 = fully collapsed).
  // Mirrors the *direction* of RespiratoryEngine.ts's dilatorMuscleTone/pcrit
  // upper-airway-resistance model (low tone / high pcrit => more collapsible)
  // without needing live airway pressure, which isn't available outside the
  // engine's own tick loop — adequate for a stylized display feature.
  const dilatorTone = Math.max(0.05, Math.min(1.2, safeNumber(patient?.dilatorMuscleTone, 1.0)));
  const pcrit = safeNumber(patient?.pcrit, patient?.osa ? 1.0 : -5.0);
  let collapseIndex = Math.max(0, Math.min(1, (1 - dilatorTone) * 0.7 + Math.max(0, pcrit + 5) / 10));
  if (patient?.laryngospasm) collapseIndex = Math.max(collapseIndex, 0.85);

  // Apnea / disconnected / zero respiratory rate: the loop collapses to a
  // single point at end-expiratory volume, matching the flatline convention
  // already used by EtCo2Model.js/VentModel.js for the same state.
  if (rr === 0 || !Number.isFinite(rr)) {
    const flatVolume = rvVal + fvc * 0.4;
    return {
      points: Array.from({ length: numPoints * 2 + 1 }, () => ({ volume: flatVolume, flow: 0 })),
      tlc, rv: rvVal, fvc, pef: 0, pif: 0,
      pattern: 'apneic',
      interpretation: 'No respiratory effort — no flow-volume loop to trace.'
    };
  }

  const points = [];
  const riseFraction = 0.06;

  // Expiratory limb: TLC -> RV, flow positive.
  for (let i = 0; i <= numPoints; i++) {
    const e = i / numPoints;
    const volume = tlc - e * fvc;
    let flow;
    if (e < riseFraction) {
      flow = pef * Math.sin((e / riseFraction) * (Math.PI / 2));
    } else {
      const e2 = (e - riseFraction) / (1 - riseFraction);
      flow = pef * Math.pow(Math.max(0, 1 - e2), concavityK);
    }
    points.push({ volume, flow });
  }

  // Inspiratory limb: RV -> TLC, flow negative, smooth semi-ellipse, with a
  // flattened plateau substituted in when the upper airway is collapsible —
  // the classic "variable extrathoracic obstruction" signature (negative
  // intraluminal pressure on inspiration collapses an already-narrowed
  // extrathoracic airway further; expiration is comparatively spared, which
  // is why only this limb is capped).
  const plateauCap = pif * (1 - collapseIndex * 0.85);
  for (let i = 1; i <= numPoints; i++) {
    const ins = i / numPoints;
    const volume = rvVal + ins * fvc;
    const smoothFlow = pif * Math.sin(Math.PI * ins);
    const flow = -Math.min(smoothFlow, Math.max(0.3, plateauCap));
    points.push({ volume, flow });
  }

  let pattern = 'normal';
  let interpretation = 'Normal contour: brisk rise to peak expiratory flow, near-linear descent to RV.';
  if (collapseIndex > 0.4) {
    pattern = 'variable_extrathoracic';
    interpretation = 'Flattened inspiratory limb: variable extrathoracic obstruction pattern (e.g. laryngospasm/upper-airway collapse) — expiration relatively spared.';
  } else if (obstructionSeverity > 0.5) {
    pattern = 'obstructive';
    interpretation = 'Reduced peak flow with a scooped/coved expiratory descent: obstructive pattern (COPD/bronchospasm).';
  } else if (obstructionSeverity > 0.1) {
    pattern = 'mild_obstructive';
    interpretation = 'Mildly reduced peak flow with early scooping of the expiratory limb.';
  } else if (patient?.restrictive) {
    pattern = 'restrictive';
    interpretation = 'Normally-shaped but narrowed loop (reduced TLC and RV): restrictive pattern.';
  }

  return { points, tlc, rv: rvVal, fvc, pef, pif, pattern, interpretation };
}
