/**
 * Shared Nonlinear Lung Pressure-Volume (Elastic Recoil) Curve
 *
 * A real lung's static compliance is not one linear value across its whole range — it is
 * highest near FRC (the normal resting/tidal operating point) and falls off toward both
 * TLC ("upper inflection point" — stiffer near full inflation) and RV ("lower inflection
 * point" — alveolar derecruitment/airway-closure stiffening near full deflation). This is
 * the same upper/lower-inflection-point concept used in real ARDSnet-style ventilator
 * PV-curve teaching, generalized here across the full RV-TLC range.
 * `RespiratoryEngine.ts`'s `currentCompliance` is a single linear scalar (mL/cmH2O)
 * representing this curve's *peak value, at FRC* — sufficient for the small-tidal-
 * excursion physiology already modeled there, but insufficient on its own to drive a
 * maneuver spanning the full TLC-to-RV range (the forced-exhalation flow-volume loop) or
 * to keep that shape consistent with the ventilator pressure-volume loop — hence one
 * shared model here rather than separate hand-tuned curves per consumer.
 *
 * Model: C(V) = C_FRC * exp(-ln(4) * u(V)^2), where u(V) is the signed distance from FRC
 * normalized by the distance to whichever boundary (RV or TLC) is on that side. This
 * guarantees, by construction, compliance = C_FRC exactly at FRC (matching the existing
 * engine scalar exactly, with no infeasible-equation risk regardless of how close FRC
 * sits to RV or TLC for a given patient) and compliance = 25% of that peak at both V=RV
 * and V=TLC (ln(4) is the constant making exp(-ln(4)*1^2) = 0.25). The 25%-at-the-
 * boundaries figure is a disclosed, reasoned simplification of the real (more complex)
 * sigmoidal compliance curve described in respiratory physiology texts — not a literal
 * citation; see docs/engines/physiology.md.
 *
 * An earlier single-power-law design (P(V) = P_TLC*((V-RV)/(TLC-RV))^n) was tried and
 * found mathematically infeasible: for realistic adult volumes (FRC sitting only ~20% of
 * the way from RV to TLC) there is no exponent n for which that family can simultaneously
 * match a realistic peak recoil pressure (~30 cmH2O) and the engine's actual compliance-
 * at-FRC value — confirmed numerically (max attainable n*f^(n-1) over n>0 is ~1.14, the
 * required value at typical inputs is ~2.5). The compliance-first model above has no such
 * infeasibility because matching C_FRC at FRC is satisfied by construction, not solved.
 *
 * On absolute magnitude: integrating this curve from RV to TLC at a typical
 * `currentCompliance` of 60 mL/cmH2O yields a peak recoil pressure around 100-130 cmH2O —
 * higher than the ~25-35 cmH2O often cited for static LUNG recoil at TLC. This is not an
 * error: that citation is for lung-only compliance (~200 mL/cmH2O at FRC, since lung and
 * chest-wall compliances combine in series), while `currentCompliance` here is the
 * engine's existing TOTAL RESPIRATORY SYSTEM compliance — the same convention already
 * used everywhere else in this codebase (e.g. ventilator Pplat = PEEP + Vt/currentCompliance
 * in `RespiratoryEngine.ts`). A system with roughly 1/3 the compliance needs roughly 3x
 * the pressure to span the same volume range — consistent with the ratio observed here.
 * Internal consistency with the engine's own convention was prioritized over matching a
 * lung-only literature figure this model was never trying to represent.
 *
 * P_el(V) is then the actual elastic recoil pressure, obtained as the genuine integral
 * P_el(V) = integral from RV to V of (1/C(V')) dV' — i.e. real calculus, not a closed-form
 * shortcut — evaluated numerically (Simpson's rule) once per calibration and cached as a
 * lookup table, since RV/TLC/FRC/currentCompliance only change a few times per session
 * (case load, comorbidity change), not every animation frame.
 */

const BOUNDARY_LN = Math.LN2 * 2; // ln(4): exp(-ln(4)) = 0.25, the compliance fraction at RV/TLC
const TABLE_POINTS = 161; // odd count so the FRC grid point is exact when FRC bisects a sub-interval evenly

function safeNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function complianceShapeAt(volumeMl, rv, frc, tlc, cFrc) {
  let u;
  if (volumeMl >= frc) {
    u = (volumeMl - frc) / Math.max(1, tlc - frc);
  } else {
    u = (volumeMl - frc) / Math.max(1, frc - rv);
  }
  return cFrc * Math.exp(-BOUNDARY_LN * u * u);
}

/**
 * @param {{tlc_mL:number, rv_mL:number, frc_mL:number}} lungVolumes
 * @param {number} currentComplianceMlPerCmH2O - the live currentCompliance scalar (= peak, at FRC)
 * @returns {{rv:number, frc:number, tlc:number, cFrc:number, volumeGrid:number[], pressureGrid:number[]}}
 */
export function calibrateComplianceCurve(lungVolumes, currentComplianceMlPerCmH2O) {
  const tlc = Math.max(1000, safeNumber(lungVolumes?.tlc_mL, 6000));
  const rv = Math.max(100, Math.min(tlc - 500, safeNumber(lungVolumes?.rv_mL, 1500)));
  const frc = Math.max(rv + 50, Math.min(tlc - 50, safeNumber(lungVolumes?.frc_mL, 2400)));
  const cFrc = Math.max(2, safeNumber(currentComplianceMlPerCmH2O, 60));

  // Numerically integrate P_el(V) = integral_{RV}^{V} 1/C(V') dV' via cumulative Simpson's
  // rule on a fixed grid from RV to TLC, evaluated once per calibration.
  const n = TABLE_POINTS - 1;
  const h = (tlc - rv) / n;
  const volumeGrid = new Array(TABLE_POINTS);
  const reciprocalC = new Array(TABLE_POINTS);
  for (let i = 0; i < TABLE_POINTS; i++) {
    const v = rv + i * h;
    volumeGrid[i] = v;
    reciprocalC[i] = 1 / Math.max(0.01, complianceShapeAt(v, rv, frc, tlc, cFrc));
  }

  const pressureGrid = new Array(TABLE_POINTS);
  pressureGrid[0] = 0;
  // Composite Simpson's rule applied cumulatively over each adjacent pair of intervals.
  for (let i = 1; i < TABLE_POINTS; i++) {
    if (i === 1 || i % 2 === 1) {
      // Trapezoid for the first/odd-boundary step to keep the cumulative table well-defined
      // at every grid index, not just even ones.
      pressureGrid[i] = pressureGrid[i - 1] + (h / 2) * (reciprocalC[i - 1] + reciprocalC[i]);
    } else {
      pressureGrid[i] = pressureGrid[i - 2] + (h / 3) * (reciprocalC[i - 2] + 4 * reciprocalC[i - 1] + reciprocalC[i]);
    }
  }

  return { rv, frc, tlc, cFrc, volumeGrid, pressureGrid };
}

/**
 * Elastic recoil pressure (cmH2O) at a given lung volume (mL), via linear interpolation
 * into the calibrated curve's precomputed integral table.
 */
export function elasticRecoilPressure(volumeMl, curve) {
  const { rv, tlc, volumeGrid, pressureGrid } = curve || {};
  if (!Array.isArray(volumeGrid) || !Array.isArray(pressureGrid) || volumeGrid.length < 2) {
    return 0;
  }
  const safeVolume = Math.max(safeNumber(rv, 0), Math.min(safeNumber(tlc, 6000), safeNumber(volumeMl, rv)));
  const n = volumeGrid.length;
  const h = volumeGrid[1] - volumeGrid[0];
  const idx = Math.max(0, Math.min(n - 2, Math.floor((safeVolume - volumeGrid[0]) / h)));
  const frac = h > 0 ? (safeVolume - volumeGrid[idx]) / h : 0;
  return pressureGrid[idx] + frac * (pressureGrid[idx + 1] - pressureGrid[idx]);
}

/**
 * Instantaneous compliance dV/dP (mL/cmH2O) at a given lung volume (mL).
 */
export function complianceAt(volumeMl, curve) {
  const { rv, frc, tlc, cFrc } = curve || {};
  const safeRv = safeNumber(rv, 1500);
  const safeFrc = safeNumber(frc, 2400);
  const safeTlc = safeNumber(tlc, 6000);
  const safeCFrc = Math.max(2, safeNumber(cFrc, 60));
  const safeVolume = Math.max(safeRv, Math.min(safeTlc, safeNumber(volumeMl, safeFrc)));
  return complianceShapeAt(safeVolume, safeRv, safeFrc, safeTlc, safeCFrc);
}

/**
 * Inverse of elasticRecoilPressure: the lung volume (mL) at which the curve produces a
 * given recoil pressure. Used by the equation-of-motion solver (Stage 1) to convert a
 * driving pressure back into a volume.
 */
export function volumeAtRecoilPressure(pressureCmH2O, curve) {
  const { volumeGrid, pressureGrid } = curve || {};
  if (!Array.isArray(volumeGrid) || !Array.isArray(pressureGrid) || pressureGrid.length < 2) {
    return safeNumber(curve?.rv, 1500);
  }
  const safePressure = Math.max(0, safeNumber(pressureCmH2O, 0));
  const n = pressureGrid.length;
  if (safePressure <= pressureGrid[0]) return volumeGrid[0];
  if (safePressure >= pressureGrid[n - 1]) return volumeGrid[n - 1];

  // Binary search (pressureGrid is monotonically nondecreasing by construction).
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pressureGrid[mid] <= safePressure) lo = mid; else hi = mid;
  }
  const span = pressureGrid[hi] - pressureGrid[lo];
  const frac = span > 0 ? (safePressure - pressureGrid[lo]) / span : 0;
  return volumeGrid[lo] + frac * (volumeGrid[hi] - volumeGrid[lo]);
}
