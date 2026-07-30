import { useCallback, useEffect, useRef, useState } from 'react';
import { X, GripVertical, Activity } from 'lucide-react';
import { generateVentilatorFlowVolumeLoop } from '../engine/FlowVolumeLoopModel';
import { generatePressureVolumeLoopFromMechanics } from '../engine/PressureVolumeLoopModel';

// ─── SVG path generator ───────────────────────────────────────────────────────
// fn(t) returns y_normalized [0=top/high, 1=bottom/low].
// Clinical convention: larger clinical values → smaller y (higher on screen).
function makeP(fn, { w = 280, h = 65, dur = 3, steps = 500 } = {}) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * dur;
    const y = Math.max(2, Math.min(h - 2, fn(t) * h));
    pts.push(`${i === 0 ? 'M' : 'L'}${((i / steps) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

// Loop generator for FV / PV loops (closed parametric curves)
// pts: array of [x_norm, y_norm] (both 0-1, y: 0=top=positive flow/pressure)
function makeLoop(pts, { w = 160, h = 120 } = {}) {
  return pts.map(([xn, yn], i) =>
    `${i === 0 ? 'M' : 'L'}${(xn * w).toFixed(1)},${(yn * h).toFixed(1)}`
  ).join(' ') + ' Z';
}

const TAU = 2 * Math.PI;

// ─── Pleth signals ─────────────────────────────────────────────────────────────
// y_norm: 0=top (large signal/peak), 1=bottom (baseline/diastole)
// Normal pleth: baseline near bottom, systolic peak near top, dicrotic notch at ~35%
function pleth(t, { amp = 1, period = 0.85, vasoMod = 0, respMod = 0 } = {}) {
  const ph = (t % period) / period;
  // base=diastolic baseline (near bottom), peak=systolic (near top), notch=dicrotic notch
  const base = 0.83;
  const peak = 0.11 + vasoMod * 0.28;        // vasoconstriction raises peak toward baseline
  const notch = peak + 0.28 + vasoMod * 0.12; // notch is ~30% of amplitude above peak
  // Respiratory modulation for PPV: amplitude swings with breathing
  const respScale = amp * (1 - respMod * 0.42 * Math.sin(t * TAU / 3.8));
  let y;
  if (ph < 0.26) {
    // Rapid systolic upstroke: convex, fast near baseline, approaching peak
    const p = ph / 0.26;
    y = base + (peak - base) * Math.sin(p * Math.PI * 0.5) ** 1.2;
  } else if (ph < 0.34) {
    // Systolic peak → dicrotic notch: linear fall
    const p = (ph - 0.26) / 0.08;
    y = peak + (notch - peak) * p;
  } else if (ph < 0.42) {
    // Dicrotic notch → small secondary wave then continues decay
    const p = (ph - 0.34) / 0.08;
    // Small bump after notch (dicrotic wave), then resumes decay
    y = notch + (notch - peak) * 0.10 * Math.sin(p * Math.PI) - (base - notch) * p * 0.15;
  } else {
    // Diastolic exponential decay back to baseline
    const p = (ph - 0.42) / 0.58;
    y = notch + (base - notch) * (1 - Math.exp(-p * 4.0));
  }
  // Apply amplitude modulation around the baseline
  const range = base - peak;
  return base - (base - y) * respScale;
}

const PLETH_PATHS = {
  normal:   makeP(t => pleth(t, {}), { dur: 3.4 }),
  poorPerf: makeP(t => pleth(t, { amp: 0.20, vasoMod: 0.65 }), { dur: 3.4 }),
  hyperdyn: makeP(t => pleth(t, { amp: 1.25, period: 0.68, vasoMod: -0.05 }), { dur: 3.0 }),
  ppv:      makeP(t => pleth(t, { amp: 1.0, respMod: 1.0 }), { dur: 5.5 }),
  irregular: makeP(t => {
    // Simulate AF: varying RR intervals, inconsistent amplitude
    const shortP = 0.52, longP = 1.1, medP = 0.72;
    const tMod = t % (shortP + longP + medP);
    const localPeriod = tMod < shortP ? shortP : tMod < shortP + longP ? longP : medP;
    const localAmp = tMod < shortP ? 0.55 : tMod < shortP + longP ? 1.1 : 0.8;
    return pleth(t, { amp: localAmp, period: localPeriod });
  }, { dur: 3.4 }),
};

// ─── A-line signals ────────────────────────────────────────────────────────────
// Clinical scale: maps 40–185 mmHg across the 65px canvas height
// toY(p): higher mmHg → smaller y (higher on screen)
function aline(t, { sys = 120, dia = 80, hr = 70, notchFrac = 0.58, hasNotch = true } = {}) {
  const period = 60 / hr;
  const ph = (t % period) / period;
  // Scale: 40 mmHg → y=0.93 (near bottom), 185 mmHg → y=0.05 (near top)
  function toY(mmhg) { return 0.93 - Math.max(0, (mmhg - 40)) / 145 * 0.87; }
  const sysY  = toY(sys);
  const diaY  = toY(dia);
  const notchPressure = dia + (sys - dia) * notchFrac;
  const notchY = toY(notchPressure);
  const notchRecoverY = toY(notchPressure + (sys - dia) * 0.08); // small bump after notch

  if (ph < 0.18) {
    // Very rapid systolic upstroke (near-vertical) — hallmark of A-line vs pleth
    const p = ph / 0.18;
    return diaY + (sysY - diaY) * Math.sin(p * Math.PI * 0.5) ** 2.0;
  } else if (ph < 0.28) {
    // Post-peak fall to dicrotic notch
    const p = (ph - 0.18) / 0.10;
    return sysY + (notchY - sysY) * p;
  } else if (ph < 0.34) {
    // Dicrotic notch: V-shape with small recovery bump
    const p = (ph - 0.28) / 0.06;
    if (!hasNotch) {
      // AR: no notch, smooth continuation
      return notchY + (diaY - notchY) * Math.sin(p * Math.PI * 0.5) ** 0.6;
    }
    // First half: fall into notch, second half: recovery bump
    if (p < 0.5) {
      return notchY + (notchY - notchRecoverY) * 0.5 * Math.sin(p * TAU);
    }
    return notchRecoverY + (notchY - notchRecoverY) * (1 - (p - 0.5) / 0.5);
  } else {
    // Diastolic exponential runoff
    const p = (ph - 0.34) / 0.66;
    const fromN = hasNotch ? notchY + 0.01 : notchY;
    return fromN + (diaY - fromN) * (1 - Math.exp(-p * 2.8));
  }
}

const ALINE_PATHS = {
  normal:    makeP(t => aline(t, { sys: 120, dia: 80, hr: 70 }), { dur: 3.5 }),
  hyperdyn:  makeP(t => aline(t, { sys: 158, dia: 48, hr: 102, notchFrac: 0.42 }), { dur: 3.0 }),
  hypovol:   makeP(t => aline(t, { sys: 88, dia: 58, hr: 115 }), { dur: 2.8 }),
  highSvr:   makeP(t => aline(t, { sys: 168, dia: 102, hr: 58, notchFrac: 0.72 }), { dur: 4.2 }),
  aorticReg: makeP(t => aline(t, { sys: 168, dia: 36, hr: 74, hasNotch: false }), { dur: 3.5 }),
  paradoxus: makeP(t => {
    const respCycle = 4.0;
    const respPhase = (t % respCycle) / respCycle;
    // Amplitude oscillates: big during expiration, small during inspiration
    const sysMod = 118 + 28 * Math.sin(respPhase * TAU);
    const diaMod = 62 + 10 * Math.sin(respPhase * TAU);
    return aline(t, { sys: sysMod, dia: diaMod, hr: 92 });
  }, { dur: 5.5 }),
};

// ─── CVP signals ──────────────────────────────────────────────────────────────
// CVP convention: baseline near lower-center of canvas; a/v waves go UP, x/y descents go DOWN.
// Scale: maps 0–28 mmHg across the canvas. Tight range shows wave morphology clearly.
function cvp(t, {
  baseline = 8, aAmp = 1, vAmp = 1, xDepth = 1,
  tamponade = false, constrictive = false, af = false,
} = {}) {
  const period = 0.85;
  const ph = (t % period) / period;
  // Scale: 0 mmHg → y=0.93, 28 mmHg → y=0.05. Tight range to show components clearly.
  function toY(mmhg) { return 0.93 - Math.max(0, mmhg) / 28 * 0.87; }
  // Wave amplitudes in mmHg
  const aH = 4.5 * aAmp;  // a wave height
  const vH = 3.5 * vAmp;  // v wave height
  const xD = 3.0 * xDepth; // x descent depth
  const yD = tamponade ? 0.4 : 2.2; // y descent depth (absent in tamponade)
  let val = baseline;

  if (ph < 0.13 && !af) {
    // a wave: atrial contraction, before QRS
    val += aH * Math.sin((ph / 0.13) * Math.PI);
  } else if (ph < 0.15 && !af) {
    // Brief c wave (tricuspid closure) - small bump
    val += aH * 0.12 * Math.sin(((ph - 0.13) / 0.02) * Math.PI);
  } else if (ph < 0.38) {
    // x descent: atrial relaxation + ventricular descent
    const p = (ph - (af ? 0.0 : 0.15)) / (0.38 - (af ? 0.0 : 0.15));
    val -= xD * Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5) ** 1.3;
    if (constrictive) val -= 1.2 * Math.sin(Math.min(1, p * 2) * Math.PI);
  } else if (ph < 0.60) {
    // v wave: passive atrial filling with tricuspid closed
    const p = (ph - 0.38) / 0.22;
    val += vH * Math.sin(p * Math.PI);
  } else if (ph < 0.82) {
    // y descent: tricuspid opens → RA empties
    const p = (ph - 0.60) / 0.22;
    val -= yD * Math.sin(Math.min(1, p * 1.5) * Math.PI * 0.5) ** 1.2;
    if (constrictive) val -= 1.0 * Math.sin(Math.min(1, p * 2) * Math.PI);
  }
  return toY(val);
}

const CVP_PATHS = {
  normal:       makeP(t => cvp(t, {}), { dur: 4.25 }),
  afib:         makeP(t => cvp(t, { af: true, aAmp: 0, xDepth: 0.5, baseline: 9 }), { dur: 4.25 }),
  trReg:        makeP(t => cvp(t, { vAmp: 3.8, aAmp: 0.3, xDepth: 0.2, baseline: 14 }), { dur: 4.25 }),
  tamponade:    makeP(t => cvp(t, { tamponade: true, baseline: 18, aAmp: 1.2, vAmp: 1.4, xDepth: 1.6 }), { dur: 4.25 }),
  constrictive: makeP(t => cvp(t, { constrictive: true, baseline: 16, aAmp: 1.1, vAmp: 1.1, xDepth: 1.3 }), { dur: 4.25 }),
};

// ─── EtCO2 / Capnography signals ───────────────────────────────────────────────
// CLINICAL CONVENTION: CO₂=0 at BOTTOM of display (y_norm≈0.88), EtCO₂ at TOP (y_norm≈0.10)
// The waveform is a rectangle: flat baseline → steep Phase II rise → flat plateau → steep fall
function etco2(t, { rr = 14, etMax = 1.0, slope3 = 0.0, baseline = 0.0, esoph = false } = {}) {
  const period = 60 / rr;
  const ph = (t % period) / period;
  const inspFrac = 0.35;   // 35% of cycle is inspiration
  const deadFrac = 0.05;   // dead-space phase (still zero CO₂ at start of expiration)
  const bot = 0.88;        // y_norm for CO₂=0 (displayed at BOTTOM — standard capnograph convention)
  const topY = 0.10;       // y_norm for full EtCO₂ (displayed at TOP)

  // toY: high CO₂ (norm→1) → small y (near top); zero CO₂ → large y (near bottom)
  function toY(norm) { return bot - Math.max(0, norm) * (bot - topY); }

  if (esoph) {
    // Esophageal intubation: 4 diminishing sinusoidal pseudo-breaths then flat zero
    const breath = Math.floor(t / period);
    const decay = Math.max(0, 1 - breath * 0.30);
    if (decay > 0.01 && ph > inspFrac && ph < 0.96) {
      const p = (ph - inspFrac) / (0.96 - inspFrac);
      return toY(Math.sin(p * Math.PI) * decay * etMax * 0.55);
    }
    return toY(0);
  }

  let co2Norm;
  if (ph < inspFrac) {
    // Inspiration: CO₂ at baseline (normally 0, elevated if rebreathing)
    co2Norm = baseline;
  } else if (ph < inspFrac + deadFrac) {
    // Phase I: dead space, still near zero (anatomic dead space clearing)
    co2Norm = baseline;
  } else if (ph < inspFrac + deadFrac + 0.08) {
    // Phase II: rapid sigmoid rise from baseline to plateau
    const p = (ph - inspFrac - deadFrac) / 0.08;
    co2Norm = baseline + etMax * Math.sin(p * Math.PI * 0.5) ** 0.7;
  } else if (ph < 0.88) {
    // Phase III: alveolar plateau, slightly upsloping (0 in normal, large in obstruction)
    const p = (ph - inspFrac - deadFrac - 0.08) / (0.88 - inspFrac - deadFrac - 0.08);
    co2Norm = baseline + etMax + slope3 * p * 0.45;
  } else {
    // Phase 0: rapid inspiratory downstroke (sharp fall to baseline)
    const p = (ph - 0.88) / 0.12;
    co2Norm = (baseline + etMax + slope3 * 0.45) * (1 - Math.sin(p * Math.PI * 0.5) ** 0.7);
  }
  return toY(Math.max(0, co2Norm));
}

const ETCO2_PATHS = {
  normal:     makeP(t => etco2(t, {}), { dur: 6.0 }),
  // Bronchospasm: "shark fin" — no flat plateau, rising slope throughout Phase III
  broncho:    makeP(t => etco2(t, { slope3: 1.2, etMax: 0.95 }), { dur: 6.0 }),
  // Rebreathing: baseline CO₂ elevated above zero (exhausted absorber)
  rebreathe:  makeP(t => etco2(t, { baseline: 0.28, etMax: 0.72 }), { dur: 6.0 }),
  // Esophageal: 3–4 diminishing pseudo-breaths then flat zero
  esophageal: makeP(t => etco2(t, { esoph: true }), { dur: 10.0 }),
  // Low CO: waveform shape normal but EtCO₂ much lower (≈20 mmHg vs 38)
  lowCO:      makeP(t => etco2(t, { etMax: 0.40, rr: 12 }), { dur: 7.0 }),
  // MH: EtCO₂ rising rapidly over time despite unchanged ventilation
  mhRising:   makeP(t => {
    const progress = Math.min(1, t / 8);
    return etco2(t, { etMax: 0.38 + progress * 0.62, rr: 14 + Math.round(progress * 4) });
  }, { dur: 8.0 }),
};

// ─── Ventilator pressure-time ──────────────────────────────────────────────────
// Scale: 0–32 cmH₂O spans the canvas. PEEP=5 near bottom, PIP=22 in upper third.
function ventP(t, { rr = 14, pip = 22, peep = 5, pplat = 18, mode = 'vcv', intrinsicPeep = 0 } = {}) {
  const period = 60 / rr;
  const ph = (t % period) / period;
  const insFrac = 0.33;
  const effectivePeep = peep + intrinsicPeep;
  // Scale: cmH₂O → y_norm. 0→0.93, 32→0.06. Higher pressure = smaller y (higher on screen).
  function toY(p) { return Math.max(0.03, 0.93 - Math.max(0, p) / 32 * 0.88); }

  if (ph < insFrac) {
    const p = ph / insFrac;
    if (mode === 'pcv') {
      // PCV: near-instantaneous rise to set pressure, flat plateau
      const rise = Math.min(1, p * 15);
      return toY(effectivePeep + (pip - effectivePeep) * rise);
    } else {
      // VCV: linear ramp (constant flow = linear pressure rise) to PIP, then Pplat plateau
      const rampEnd = 0.65; // PIP reached at 65% of inspiration; plateau for remaining 35%
      if (p < rampEnd) {
        return toY(effectivePeep + (pip - effectivePeep) * (p / rampEnd));
      }
      return toY(pplat); // Plateau pressure (always ≤ PIP due to resistance dropping at zero flow)
    }
  } else {
    // Expiration: passive fall from Pplat/pip toward PEEP (exponential with R*C time constant)
    const p = (ph - insFrac) / (1 - insFrac);
    const startP = mode === 'pcv' ? pip : pplat;
    return toY(effectivePeep + intrinsicPeep * Math.exp(-p * 5) + (startP - effectivePeep) * Math.exp(-p * 7));
  }
}

const VENTP_PATHS = {
  vcvNormal: makeP(t => ventP(t, { mode: 'vcv', pip: 22, peep: 5, pplat: 18 }), { dur: 8 }),
  pcvNormal: makeP(t => ventP(t, { mode: 'pcv', pip: 22, peep: 5 }), { dur: 8 }),
  // High resistance: PIP very high (42) but Pplat normal (20) → large PIP-Pplat gap
  highRes:   makeP(t => ventP(t, { mode: 'vcv', pip: 42, peep: 5, pplat: 20 }), { dur: 8 }),
  // ARDS / low compliance: both PIP and Pplat elevated, small PIP-Pplat gap
  lowComp:   makeP(t => ventP(t, { mode: 'vcv', pip: 31, peep: 8, pplat: 29 }), { dur: 8 }),
  // Auto-PEEP: PEEP baseline does not return to set PEEP before next breath
  autoPeep:  makeP(t => ventP(t, { mode: 'vcv', pip: 28, peep: 5, pplat: 22, intrinsicPeep: 9, rr: 22 }), { dur: 6 }),
};

// ─── Ventilator flow-time ─────────────────────────────────────────────────────
// Zero-flow line at midY (y_norm=0.50). Inspiratory flow: above (y<midY). Expiratory: below.
function ventF(t, { rr = 14, mode = 'vcv', hasAutoPeep = false } = {}) {
  const period = 60 / rr;
  const ph = (t % period) / period;
  const insFrac = 0.33;
  const mid = 0.50, amp = 0.37;

  if (ph < insFrac) {
    const p = ph / insFrac;
    if (mode === 'vcv') {
      // VCV: constant inspiratory flow — perfectly flat rectangle ABOVE zero line
      return mid - amp * 0.92;
    } else {
      // PCV: decelerating inspiratory flow — starts high, drops as lungs fill
      return mid - amp * 0.92 * Math.exp(-p * 2.2);
    }
  } else {
    // Expiration: passive, exponentially decelerating negative flow BELOW zero line
    const p = (ph - insFrac) / (1 - insFrac);
    // Expiratory flow peaks immediately then decays back toward zero
    const expFlow = Math.sin(Math.min(1, p * 2.5) * Math.PI * 0.5);
    if (hasAutoPeep) {
      // Auto-PEEP: expiratory curve gets "cut off" before returning to zero
      // by the next breath. Show elevated residual flow at end of expiration.
      const residual = Math.max(0, 0.30 - p * 0.25); // flow still negative at end
      return mid + amp * (expFlow + residual) * 0.88;
    }
    return mid + amp * expFlow * 0.88;
  }
}

const VENTF_PATHS = {
  vcvSquare: makeP(t => ventF(t, { mode: 'vcv' }), { dur: 8 }),
  pcvDecel:  makeP(t => ventF(t, { mode: 'pcv' }), { dur: 8 }),
  autoPeep:  makeP(t => ventF(t, { mode: 'vcv', hasAutoPeep: true, rr: 22 }), { dur: 5 }),
};

// ─── Flow-Volume Loop reference tracings (ventilator tidal loops) ─────────────
// These teaching references are generated from the SAME engine that draws the patient's
// live ventilator flow-volume loop (generateVentilatorFlowVolumeLoop), so a reference and
// the live loop are one source of truth rather than two separately-drawn shapes. Convention
// matches the live FlowVolumeLoopCanvas exactly:
//   • Y = flow. EXPIRATION is the UPPER limb (above the zero-flow line), INSPIRATION lower.
//   • X = tidal volume. A fully-exhaled lung (volume 0) sits at the RIGHT edge; higher tidal
//     volume runs LEFT. A breath that fails to return to the right edge is gas trapping.
//
// Rendered into the loop viewBox (0 0 160 110) with the zero-flow line at y=48. All four
// loops share ONE fixed volume/flow scale, so a reduced peak flow (high resistance) or a
// reduced tidal volume (low compliance) reads as a genuinely smaller loop against the
// greyed normal reference drawn behind it — the comparison would break under per-loop
// autoscaling.
const FV_ZERO_Y = 48;        // zero-flow baseline (px), matches the rendered reference line
const FV_X_RIGHT = 145;      // volume 0 (fully exhaled) anchored at the right edge
const FV_VOL_SCALE = 195;    // px per litre of tidal volume (higher volume → further left);
                             // calibrated so the widest loop (normal, ~0.65 L) fits the viewBox
const FV_FLOW_SCALE = 20.5;  // px per L/s (expiration positive → up, inspiration → down)

const clampFvY = (y) => Math.max(4, Math.min(106, y));

// Maps a live-model tidal loop ({volume L, flow L/s}) into viewBox SVG path coordinates.
function ventLoopToPath(points) {
  const pts = points.map((p) => [
    FV_X_RIGHT - p.volume * FV_VOL_SCALE,
    clampFvY(FV_ZERO_Y - p.flow * FV_FLOW_SCALE),
  ]);
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
}

const FV_LUNG = { tlc_mL: 6000, rv_mL: 1500, frc_mL: 2400 };
const FV_PATIENT = { airwaySecured: true, lungVolumes: FV_LUNG, ibw: 70 };
// Representative decelerating-flow (PCV) breaths — the full, rounded loop a bedside
// ventilator shows — with each pathology's driver dialed so it is unmistakable against
// the normal: high resistance (bronchospasm), low compliance (ARDS), gas trapping (severe
// resistance + fast rate + short expiratory time).
const FV_SCENARIOS = {
  normal:   { patient: FV_PATIENT,                            vitals: { res: 5,  compl: 60, rr: 12 }, vent: { mode: 'PCV', pinsp: 11, rr: 12, peep: 5,  ieRatio: 2 } },
  highRes:  { patient: { ...FV_PATIENT, bronchospasm: true }, vitals: { res: 26, compl: 55, rr: 12 }, vent: { mode: 'PCV', pinsp: 13, rr: 12, peep: 5,  ieRatio: 2 } },
  lowComp:  { patient: FV_PATIENT,                            vitals: { res: 6,  compl: 22, rr: 16 }, vent: { mode: 'PCV', pinsp: 15, rr: 16, peep: 10, ieRatio: 2 } },
  autoPeep: { patient: { ...FV_PATIENT, bronchospasm: true }, vitals: { res: 34, compl: 55, rr: 26 }, vent: { mode: 'PCV', pinsp: 16, rr: 26, peep: 5,  ieRatio: 1 } },
};

const FV_PATHS = Object.fromEntries(
  Object.entries(FV_SCENARIOS).map(([key, s]) => [
    key,
    ventLoopToPath(generateVentilatorFlowVolumeLoop(s.patient, s.vitals, s.vent).points),
  ])
);

function makeFVPath(type = 'normal') {
  return FV_PATHS[type] || FV_PATHS.normal;
}

// ─── Pressure-Volume Loop reference tracings (ventilator tidal loops) ─────────
// Generated from the SAME engine that draws the patient's live P-V loop
// (generatePressureVolumeLoopFromMechanics), so a reference and the live loop are one
// source of truth. Convention matches the live PressureVolumeLoopCanvas:
//   • X = airway pressure (cmH2O), increasing rightward from the PEEP origin to PIP.
//   • Y = tidal volume above PEEP (SVG y inverted, so higher volume = smaller y). The loop
//     begins at (PEEP, 0); an origin lifted off that baseline is gas trapping.
// The loop is traced up the RIGHT-bowing inspiratory limb (at any volume, inspiration needs
// MORE pressure — the resistive driving pressure) and down the LEFT-bowing expiratory limb;
// the enclosed area is the resistive work of the breath.
//
// Rendered into the loop viewBox (0 0 160 110) with the volume=0 baseline at y=88 (the line
// the renderer draws for the P-V loop). All four share ONE fixed pressure/volume scale, so a
// flatter slope (low compliance) or a wider loop (high resistance) reads as a genuine
// deviation against the greyed normal drawn behind it. Volume-control (VCV) breaths are used:
// the canonical P-V loop, where the slope reads directly as compliance and the PIP−Pplat gap
// (loop width) reads as resistance — PCV's rectangular loop hides both.
const PV_Y0 = 88;         // volume=0 (PEEP) baseline, matches the panel's P-V reference line
const PV_X0 = 12;         // pressure 0 anchor (left)
const PV_PSCALE = 4.25;   // px per cmH2O (pressure increases rightward)
const PV_VSCALE = 115;    // px per litre of tidal volume (higher volume → up)

const clampPvY = (y) => Math.max(6, Math.min(104, y));

// Maps a live-model P-V loop ({pressure cmH2O, volume L}) into viewBox SVG path coordinates.
function pvLoopToPath(points) {
  const pts = points.map((p) => [
    PV_X0 + p.pressure * PV_PSCALE,
    clampPvY(PV_Y0 - p.volume * PV_VSCALE),
  ]);
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
}

const PV_LUNG = { tlc_mL: 6000, rv_mL: 1500, frc_mL: 2400 };
const PV_PATIENT = { airwaySecured: true, lungVolumes: PV_LUNG, ibw: 70 };
const PV_SCENARIOS = {
  normal:   { patient: PV_PATIENT,                            vitals: { res: 5,  compl: 60, rr: 12 }, vent: { mode: 'VCV', vt: 500, rr: 12, peep: 5,  ieRatio: 2 } },
  highRes:  { patient: { ...PV_PATIENT, bronchospasm: true }, vitals: { res: 26, compl: 55, rr: 12 }, vent: { mode: 'VCV', vt: 500, rr: 12, peep: 5,  ieRatio: 2 } },
  lowComp:  { patient: PV_PATIENT,                            vitals: { res: 6,  compl: 22, rr: 16 }, vent: { mode: 'VCV', vt: 380, rr: 16, peep: 10, ieRatio: 2 } },
  autoPeep: { patient: { ...PV_PATIENT, bronchospasm: true }, vitals: { res: 28, compl: 55, rr: 20 }, vent: { mode: 'VCV', vt: 450, rr: 20, peep: 5,  ieRatio: 1.5 } },
};

const PV_PATHS = Object.fromEntries(
  Object.entries(PV_SCENARIOS).map(([key, s]) => [
    key,
    pvLoopToPath(generatePressureVolumeLoopFromMechanics(s.patient, s.vitals, s.vent).points),
  ])
);

// ─── Waveform configuration ───────────────────────────────────────────────────
const WAVEFORM_CONFIGS = {
  pleth: {
    name: 'Plethysmography (SpO₂ Waveform)',
    abbrev: 'PLETH',
    color: '#06b6d4',
    isLoop: false,
    anatomy: [
      { label: 'Systolic Upstroke', desc: 'Rapid arterial inflow distends tissue — fast rise' },
      { label: 'Dicrotic Notch', desc: 'Aortic valve closure causes brief pause in flow' },
      { label: 'Diastolic Decay', desc: 'Passive runoff into peripheral resistance beds' },
    ],
    states: [
      {
        id: 'normal',
        label: 'Normal',
        subtitle: 'Good peripheral perfusion',
        path: PLETH_PATHS.normal,
        mechanism: 'Infrared light absorption by pulsatile arterial blood volume. Healthy waveform has clear upstroke, dicrotic notch, and smooth decay.',
        clinical: 'Confirms adequate cardiac output and peripheral perfusion. Amplitude proportional to pulse pressure and local vasoconstriction state.',
        pearls: ['Dicrotic notch = aortic valve closure — its position reflects SVR (higher SVR = later notch)', 'Amplitude directly mirrors peripheral vasomotor tone', 'Perfusion index (PI) = AC/DC ratio — a quantitative measure'],
        drugs: ['Vasopressors: reduce amplitude (vasoconstriction)', 'Vasodilators / volatile agents: increase amplitude'],
      },
      {
        id: 'poorPerf',
        label: 'Poor Perfusion',
        subtitle: 'Small, damped signal',
        path: PLETH_PATHS.poorPerf,
        mechanism: 'Vasoconstriction or low cardiac output reduces pulsatile blood flow to the digit. Signal amplitude falls proportionally to tissue perfusion.',
        clinical: 'Common in hypothermia, hypovolemia, high-dose vasopressors, aortic stenosis. SpO₂ readings may be unreliable when signal is this small.',
        pearls: ['Move the probe to ear/forehead — better perfused in vasoconstriction', 'Loss of dicrotic notch often precedes loss of the waveform entirely', 'Consider A-line if SpO₂ reliability is critical'],
        drugs: ['Phenylephrine, Norepinephrine: worsen signal', 'Warming, vasodilators: improve signal'],
      },
      {
        id: 'hyperdyn',
        label: 'Hyperdynamic',
        subtitle: 'High amplitude, wide pulse',
        path: PLETH_PATHS.hyperdyn,
        mechanism: 'Vasodilation + high cardiac output increases stroke volume and reduces peripheral resistance, producing wide pulse pressure and large pulsatile volume.',
        clinical: 'Septic shock (early distributive), fever, aortic regurgitation, high CO states. The "bounding pulse" felt clinically.',
        pearls: ['Wide pleth = wide pulse pressure (SBP - DBP)', 'Early sepsis may look like this before cardiac depression sets in', 'Early dicrotic notch with high initial amplitude reflects low SVR'],
        drugs: ['Volatile anesthetics: vasodilate, may increase', 'Epinephrine: increases CO → larger amplitude'],
      },
      {
        id: 'ppv',
        label: 'PPV / Respiratory Variation',
        subtitle: 'Amplitude cycles with ventilation',
        path: PLETH_PATHS.ppv,
        mechanism: 'Mechanical ventilation reduces RV preload on inspiration (high intrathoracic pressure). This propagates to LV ~2 beats later, creating cyclical stroke volume variation.',
        clinical: 'PPV >13% predicts fluid responsiveness in sedated, mechanically ventilated patients. Direct bedside indicator of volume responsiveness.',
        pearls: ['Only valid if patient is fully sedated (no spontaneous breathing)', 'Only valid if TV ≥ 8 mL/kg (some studies say 7 mL/kg)', 'Invalid in AF, frequent ectopy, or very high RR'],
        drugs: ['Fluid resuscitation: should reduce PPV if patient is responsive'],
      },
    ],
    getCurrent(patient, vitals) {
      if (!vitals) return null;
      const spo2 = vitals.spo2 || 99;
      const perfusion = vitals.perfusion ?? 1;
      if (spo2 < 90 || perfusion < 0.2) return { label: 'Poor signal', detail: 'Low SpO₂ or perfusion — waveform may be unreliable. Consider probe repositioning.', color: '#ef4444' };
      const ppv = vitals.ppv || 0;
      if (ppv > 13) return { label: 'PPV variation present', detail: `PPV ${ppv.toFixed(0)}% — fluid responsiveness likely. Consider volume bolus if hemodynamically unstable.`, color: '#f97316' };
      if (patient?.septic || patient?.sepsisScore > 1) return { label: 'Hyperdynamic pattern', detail: 'Wide amplitude suggests vasodilatory state. Monitor for impending cardiac depression.', color: '#facc15' };
      return { label: 'Normal waveform', detail: `SpO₂ ${spo2}%. Good perfusion signal. Dicrotic notch visible.`, color: '#22c55e' };
    },
  },

  aline: {
    name: 'Arterial Line Waveform',
    abbrev: 'ART',
    color: '#ef4444',
    isLoop: false,
    anatomy: [
      { label: 'Anacrotic Limb', desc: 'Rapid systolic upstroke — reflects dP/dt and ventricular contractility' },
      { label: 'Systolic Peak', desc: 'Peak arterial pressure = SBP' },
      { label: 'Dicrotic Notch', desc: 'Aortic valve closure. Position and depth reflect SVR and aortic compliance' },
      { label: 'Diastolic Runoff', desc: 'Exponential pressure decay as blood flows into peripheral beds' },
    ],
    states: [
      {
        id: 'normal',
        label: 'Normal',
        subtitle: '120/80 mmHg, normal SVR',
        path: ALINE_PATHS.normal,
        mechanism: 'LV ejects blood into aorta. Rapid pressure rise, systolic peak, dicrotic notch at aortic valve closure, exponential diastolic decay.',
        clinical: 'Dicrotic notch normally at ~60% of pulse pressure above diastole. Upstroke steep = good contractility.',
        pearls: ['Upstroke steepness = dP/dt = contractility surrogate', 'Area under systolic portion ∝ stroke volume', 'Notch position: higher with high SVR (late), lower with low SVR (early)'],
        drugs: [],
      },
      {
        id: 'hyperdyn',
        label: 'Hyperdynamic',
        subtitle: 'Wide pulse pressure, low SVR',
        path: ALINE_PATHS.hyperdyn,
        mechanism: 'High CO with low SVR produces wide pulse pressure (high SBP, low DBP). Dicrotic notch early and at lower relative position.',
        clinical: 'Early septic shock, vasodilatory anesthetics, AV fistula, chronic anemia, aortic regurgitation. Bounding pulse quality.',
        pearls: ['Wide PP (>60 mmHg) = high stroke volume + low SVR', 'Low diastolic from rapid runoff into dilated beds', 'May need vasopressors to restore SVR'],
        drugs: ['Vasodilators (volatile agents, nitroglycerin): produce this pattern', 'Vasopressors: narrow and elevate diastolic'],
      },
      {
        id: 'hypovol',
        label: 'Hypovolemic',
        subtitle: 'Narrow pulse pressure, low SBP/DBP',
        path: ALINE_PATHS.hypovol,
        mechanism: 'Reduced preload → reduced stroke volume → narrow pulse pressure. Compensatory tachycardia and vasoconstriction maintain DBP partially.',
        clinical: 'Hemorrhage, dehydration, distributive shock in early phase. Often accompanied by PPV > 13%.',
        pearls: ['Narrow PP with high HR = classic hypovolemia pattern', 'Check for respiratory variation (PPV) alongside this', 'Vasopressin/Norepinephrine may maintain BP but mask volume deficit'],
        drugs: ['Fluid bolus: should widen pulse pressure if responsive'],
      },
      {
        id: 'highSvr',
        label: 'High SVR',
        subtitle: 'Elevated diastolic, late notch',
        path: ALINE_PATHS.highSvr,
        mechanism: 'Peripheral vasoconstriction raises diastolic pressure. Dicrotic notch is high and late, reflecting slow runoff against high resistance.',
        clinical: 'Hypertension, vasopressor administration, hypothermia, high sympathetic tone. MAP may be high despite normal or low CO.',
        pearls: ['High DBP = high afterload — may worsen LV failure', 'Narrow peak-to-notch ratio with high DBP = high SVR', 'Consider afterload reduction if LV failing'],
        drugs: ['Phenylephrine, Vasopressin, Norepinephrine: elevate SVR → this pattern'],
      },
      {
        id: 'aorticReg',
        label: 'Aortic Regurgitation',
        subtitle: 'Wide PP, absent dicrotic notch',
        path: ALINE_PATHS.aorticReg,
        mechanism: 'Incompetent aortic valve allows regurgitation into LV during diastole. Large SV (high SBP) but diastolic pressure rapidly drains (very low DBP). No notch — valve never fully closes.',
        clinical: 'AR from endocarditis, bicuspid aortic valve, aortic dissection. "Waterhammer" or "Corrigan\'s" pulse. PP often > 80 mmHg.',
        pearls: ['Absent dicrotic notch is pathognomonic for severe AR or excessive vasodilation', 'Very wide PP = chronic AR or aortic dissection', 'Examine with TEE if suspected intraoperatively'],
        drugs: ['Vasodilators: preferred (reduce regurgitant fraction)', 'Vasopressors: raise DBP but worsen regurgitation severity'],
      },
      {
        id: 'paradoxus',
        label: 'Pulsus Paradoxus',
        subtitle: '>10 mmHg respiratory variation',
        path: ALINE_PATHS.paradoxus,
        mechanism: 'Cardiac tamponade or severe asthma creates exaggerated respiratory variation. During inspiration: decreased pulmonary venous return + RV-LV interdependence reduces LV stroke volume.',
        clinical: 'Pericardial tamponade, severe asthma/COPD, tension pneumothorax. Normally <10 mmHg; >25 mmHg indicates impending cardiovascular collapse.',
        pearls: ['Measure from peak of inspiration to peak of expiration on waveform', '>10 mmHg variation is abnormal, >25 mmHg is severe', 'Tamponade: also expect elevated CVP, narrow PP, sinus tachycardia'],
        drugs: ['Pericardiocentesis for tamponade', 'Bronchodilators for severe asthma'],
      },
    ],
    getCurrent(patient, vitals) {
      if (!vitals || !patient?.hasALine) return null;
      const pp = (vitals.sys || 120) - (vitals.dia || 80);
      const map = vitals.map || 90;
      if (pp > 70) return { label: 'Widened pulse pressure', detail: `PP ${pp} mmHg — consider AR or hyperdynamic state. DBP ${vitals.dia} mmHg.`, color: '#f97316' };
      if (pp < 30) return { label: 'Narrow pulse pressure', detail: `PP ${pp} mmHg — hypovolemia or tamponade? Check PPV and CVP.`, color: '#ef4444' };
      if (map < 65) return { label: 'Hypotension', detail: `MAP ${map} mmHg — below cerebral autoregulation floor. Treat urgently.`, color: '#ef4444' };
      return { label: 'Normal waveform', detail: `SBP/DBP ${vitals.sys}/${vitals.dia}, PP ${pp} mmHg, MAP ${map} mmHg.`, color: '#22c55e' };
    },
  },

  cvp: {
    name: 'Central Venous Pressure Waveform',
    abbrev: 'CVP',
    color: '#60a5fa',
    isLoop: false,
    anatomy: [
      { label: 'a wave', desc: 'Atrial contraction. Absent in AF. Giant in tricuspid stenosis, CHB.' },
      { label: 'c wave', desc: 'Tricuspid valve closure + bulge into RA. Often merged with a.' },
      { label: 'x descent', desc: 'Atrial relaxation + tricuspid descent. Prominent in tamponade.' },
      { label: 'v wave', desc: 'Passive ventricular filling with tricuspid closed. Giant in TR.' },
      { label: 'y descent', desc: 'Tricuspid valve opens → rapid RA emptying. Absent in tamponade.' },
    ],
    states: [
      {
        id: 'normal',
        label: 'Normal Sinus Rhythm',
        subtitle: 'a, x, v, y components visible',
        path: CVP_PATHS.normal,
        mechanism: 'Atrial contraction (a) → x descent → passive venous filling (v wave) → y descent on tricuspid opening. Reflects right heart filling pressure (normal 2-8 mmHg).',
        clinical: 'Normal CVP reflects adequate preload but does not predict fluid responsiveness reliably as a standalone measurement.',
        pearls: ['CVP is NOT a reliable indicator of fluid responsiveness', 'Trend CVP: rising CVP during fluid challenge without BP improvement = STOP fluids', 'Best used with other monitors (PPV, echo, PLR)'],
        drugs: [],
      },
      {
        id: 'afib',
        label: 'Atrial Fibrillation',
        subtitle: 'Absent a wave',
        path: CVP_PATHS.afib,
        mechanism: 'No organized atrial contraction → no a wave. Only x (passive atrial relaxation), v, and y components remain. Irregular RR interval makes all waves irregular.',
        clinical: 'Loss of atrial kick = 15-25% reduction in CO. Patient may be symptomatic at rest if ventricular function is poor.',
        pearls: ['Absent a wave on CVP immediately suggests AF or junctional rhythm', 'Cannon a waves (periodic huge a) = AV dissociation / complete heart block', 'Look for irregularity in the RR interval pattern'],
        drugs: ['Rate control: Metoprolol, Diltiazem, Amiodarone', 'Cardioversion: Synchronized shock if hemodynamically unstable'],
      },
      {
        id: 'trReg',
        label: 'Tricuspid Regurgitation',
        subtitle: 'Giant v waves (cv fusion)',
        path: CVP_PATHS.trReg,
        mechanism: 'Systolic regurgitation through tricuspid fills RA simultaneously with v-wave filling → a giant "cv fusion" wave dominates the waveform. x descent shallow or absent.',
        clinical: 'Severe TR produces massively elevated and pulsatile neck veins. Right heart failure, pulmonary hypertension, annular dilation.',
        pearls: ['The jugular venous pulse in TR is visible as a prominent systolic pulsation', 'RV failure → TR → further RA dilation → more TR (vicious cycle)', 'Inotropes may worsen TR if they increase pulmonary pressure'],
        drugs: ['Treat underlying cause (PH, RV failure)'],
      },
      {
        id: 'tamponade',
        label: 'Cardiac Tamponade',
        subtitle: 'Prominent x, absent y descent',
        path: CVP_PATHS.tamponade,
        mechanism: 'Pericardial fluid compresses all chambers equally. x descent preserved (atrial relaxation still occurs), but y descent abolished because pericardial pressure prevents RV filling when tricuspid opens.',
        clinical: 'Beck\'s triad: hypotension, elevated JVP, muffled heart sounds. Sinus tachycardia, pulsus paradoxus > 10 mmHg. Emergent pericardiocentesis if hemodynamically unstable.',
        pearls: ['x but no y = tamponade (x only)', 'x + prominent y = constrictive pericarditis', 'x + y absent = right ventricular failure', 'Rising CVP + falling BP = classic tamponade progression'],
        drugs: ['Fluid challenge: temporizing measure only', 'Vasopressors: temporary until pericardiocentesis'],
      },
      {
        id: 'constrictive',
        label: 'Constrictive Pericarditis',
        subtitle: 'M/W pattern — steep x AND y',
        path: CVP_PATHS.constrictive,
        mechanism: 'Rigid pericardium transmits, not dampens, filling pressures. Both x and y descents are exaggerated because the ventricle fills rapidly then hits the pericardial constraint abruptly.',
        clinical: 'Kussmaul\'s sign (JVP rises on inspiration rather than falls). Equalization of diastolic pressures across all 4 chambers. Pericardial knock heard on auscultation.',
        pearls: ['Equal RVEDP/LVEDP/PAOP/CVP = key echo/cath finding', 'Constrictive pericarditis may follow cardiac surgery, radiation, TB', 'Pericardiectomy is definitive treatment'],
        drugs: [],
      },
    ],
    getCurrent(patient, vitals) {
      if (!patient?.hasCVC && !patient?.hasPAC) return null;
      const cvp = vitals?.cvp || 8;
      if (patient?.tamponadeActive || patient?.pericardialTamponade) return { label: 'Tamponade pattern', detail: 'Absent y descent expected. x descent prominent. Pericardiocentesis indicated.', color: '#ef4444' };
      if (patient?.afib || patient?.hasAFib) return { label: 'AF: absent a wave', detail: `CVP ${cvp} mmHg. No a wave present — loss of atrial kick.`, color: '#f97316' };
      if (cvp > 18) return { label: 'Elevated CVP', detail: `CVP ${cvp} mmHg — RV failure? Tamponade? Over-resuscitation? Volume restriction indicated.`, color: '#f97316' };
      if (cvp < 3) return { label: 'Low CVP', detail: `CVP ${cvp} mmHg — preload depleted. Consider fluid challenge with response assessment.`, color: '#facc15' };
      return { label: 'Normal CVP waveform', detail: `CVP ${cvp} mmHg. Normal a/x/v/y morphology expected.`, color: '#22c55e' };
    },
  },

  etco2: {
    name: 'Capnography (End-Tidal CO₂)',
    abbrev: 'EtCO₂',
    color: '#facc15',
    isLoop: false,
    anatomy: [
      { label: 'Phase I', desc: 'Anatomic dead space washout — no CO₂ (near zero)' },
      { label: 'Phase II', desc: 'Ascending slope — mixing of dead space and alveolar gas' },
      { label: 'Phase III', desc: 'Alveolar plateau — slightly rising (V/Q inequality) to end-tidal point' },
      { label: 'Phase 0', desc: 'Inspiratory downstroke — rapid fall to zero on inspiration' },
    ],
    states: [
      {
        id: 'normal',
        label: 'Normal',
        subtitle: 'EtCO₂ 35-45 mmHg',
        path: ETCO2_PATHS.normal,
        mechanism: 'Rectangular waveform reflects efficient dead-space clearance, uniform alveolar emptying, and complete inspiration. Phase III plateau slightly slopes up (<2 mmHg/L) in normal lungs.',
        clinical: 'Confirms tracheal intubation. EtCO₂ tracks PaCO₂ with a 2-5 mmHg gradient (EtCO₂ < PaCO₂). Guides ventilator adjustments.',
        pearls: ['EtCO₂ drops immediately in cardiac arrest — first sign of ROSC is EtCO₂ rise', 'Sudden EtCO₂ drop = disconnection, esophageal, or circuit problem', 'Gradual EtCO₂ rise = hypoventilation, MH, metabolic alkalosis treatment'],
        drugs: ['Opioids: reduce RR → raise EtCO₂', 'NMBDs: apnea → EtCO₂ falls to zero', 'MH triggers (volatile agents, suxamethonium): cause rapid EtCO₂ rise'],
      },
      {
        id: 'broncho',
        label: 'Bronchospasm / COPD',
        subtitle: '"Shark fin" — steep Phase III slope',
        path: ETCO2_PATHS.broncho,
        mechanism: 'Obstructed airways cause non-uniform alveolar emptying. Slower alveoli with higher CO₂ empty last, raising Phase III slope. No flat plateau — waveform looks like a shark fin or oblique line.',
        clinical: 'Active bronchospasm, COPD, asthma, endobronchial secretions. The steeper the Phase III slope, the more heterogeneous the lung disease.',
        pearls: ['Shark fin = obstructive disease until proven otherwise', 'Treat bronchospasm aggressively — albuterol, deepening anesthesia, IV MgSO₄', 'Bilateral wheezing on auscultation confirms etiology', 'One-sided obstruction = endobronchial intubation'],
        drugs: ['Albuterol (nebulized or MDI): first-line', 'IV Ketamine: bronchodilator at induction doses', 'Volatile anesthetics: bronchodilatory — increase depth'],
      },
      {
        id: 'rebreathe',
        label: 'Rebreathing',
        subtitle: 'Elevated Phase I baseline',
        path: ETCO2_PATHS.rebreathe,
        mechanism: 'CO₂-containing exhaled gas re-enters the breathing circuit on inspiration, raising the Phase I baseline above zero. Entire waveform is shifted upward.',
        clinical: 'Exhausted CO₂ absorber, insufficient fresh gas flow in circle systems, circuit malfunction, or very long parallel tubing. Fatal if undetected.',
        pearls: ['Phase I baseline > 0 mmHg = rebreathing until proven otherwise', 'Check CO₂ absorber: change it if color changed (or just change it anyway)', 'Increase fresh gas flow temporarily to wash out CO₂', 'Capnography is MANDATORY during general anesthesia for this reason'],
        drugs: [],
      },
      {
        id: 'esophageal',
        label: 'Esophageal Intubation',
        subtitle: 'Rapidly diminishing waveforms then zero',
        path: ETCO2_PATHS.esophageal,
        mechanism: 'CO₂ dissolved in stomach from recent belching or gastric CO₂ produces initial diminishing capnogram trace. Unlike tracheal intubation, the trace disappears within 3-6 breaths.',
        clinical: 'If capnogram persists for ≥6 breaths, tube is tracheal. Esophageal: rapid disappearance. IMMEDIATELY reintubate if this pattern is seen.',
        pearls: ['Persistent capnogram (>6 breaths) = tracheal placement', 'Vanishing capnogram = esophageal until proven otherwise', 'Colorimetric CO₂ detectors: turn yellow in trachea, stay purple in esophagus', 'NEVER rely on chest rise alone — use CO₂ confirmation'],
        drugs: [],
      },
      {
        id: 'lowCO',
        label: 'Low Cardiac Output',
        subtitle: 'Low EtCO₂ despite normal ventilation',
        path: ETCO2_PATHS.lowCO,
        mechanism: 'Low pulmonary blood flow delivers less CO₂ to alveoli. EtCO₂ falls despite unchanged ventilation. The PaCO₂-EtCO₂ gradient widens (normally 2-5 mmHg, may become >20 mmHg).',
        clinical: 'Cardiac arrest (sudden drop to near-zero), severe pulmonary embolism, massive hemorrhage with cardiovascular collapse, tension pneumothorax.',
        pearls: ['Sudden EtCO₂ drop = emergency until proven otherwise', 'CPR quality tracked by EtCO₂: target >20 mmHg during CPR', 'EtCO₂ rise during CPR = sign of ROSC', 'After ROSC: EtCO₂ rises sharply as CO resumes'],
        drugs: ['Vasopressors + fluid: target MAP >65 to restore pulmonary perfusion', 'tPA: for massive PE-related CO drop'],
      },
    ],
    getCurrent(patient, vitals) {
      const etco2Val = vitals?.etco2;
      if (etco2Val === undefined) return null;
      const res = vitals?.res || 5;
      if (patient?.isArrest) return { label: 'Cardiac arrest — EtCO₂ critical', detail: `EtCO₂ ${etco2Val} mmHg. During CPR, target >20 mmHg. Rise signals ROSC.`, color: '#ef4444' };
      if (patient?.mhActive) return { label: 'Malignant Hyperthermia — EtCO₂ rising rapidly', detail: 'CO₂ production massively elevated. Increase ventilation and administer Dantrolene.', color: '#ef4444' };
      if (res > 18 && patient?.airwaySecured) return { label: 'Shark fin suspected', detail: `Airway resistance ${res} cmH₂O/L/s — bronchospasm pattern expected. Check waveform shape.`, color: '#f97316' };
      if (etco2Val < 20 && patient?.airwaySecured) return { label: 'Low EtCO₂', detail: `${etco2Val} mmHg — hyperventilation, low CO, or PE? Widen PaCO₂-EtCO₂ gap check.`, color: '#f97316' };
      if (etco2Val > 55) return { label: 'Hypercapnia', detail: `EtCO₂ ${etco2Val} mmHg — increase MV. Check for rebreathing, MH, and obstruction.`, color: '#f97316' };
      return { label: 'Normal capnogram', detail: `EtCO₂ ${etco2Val} mmHg. Rectangular waveform expected. Normal-normal PaCO₂ gradient 2-5 mmHg.`, color: '#22c55e' };
    },
  },

  ventPressure: {
    name: 'Ventilator Pressure-Time Waveform',
    abbrev: 'Paw',
    color: '#ca8a04',
    isLoop: false,
    anatomy: [
      { label: 'PIP', desc: 'Peak Inspiratory Pressure — highest pressure during VCV breath; reflects resistance + compliance' },
      { label: 'Plateau (Pplat)', desc: 'Pressure after end-inspiratory pause — reflects lung compliance (static)' },
      { label: 'Driving Pressure', desc: 'Pplat - PEEP = stress applied to respiratory system per breath' },
      { label: 'PEEP', desc: 'End-expiratory pressure — prevents alveolar collapse, improves oxygenation' },
    ],
    states: [
      {
        id: 'vcvNormal',
        label: 'VCV Normal',
        subtitle: 'Volume Control — constant flow delivery',
        path: VENTP_PATHS.vcvNormal,
        mechanism: 'Constant inspiratory flow produces triangular/trapezoidal pressure rise to PIP. Brief end-inspiratory pause reveals Pplat. Passive expiration returns to PEEP.',
        clinical: 'Normal PIP-Pplat gradient < 10 cmH₂O. Normal Pplat < 30 cmH₂O. Driving pressure < 15 cmH₂O associated with reduced ARDS mortality.',
        pearls: ['PIP - Pplat = flow resistance (PIP↑ with bronchospasm, Pplat normal)', 'Pplat alone ↑ = compliance problem (ARDS, pneumothorax, obesity)', 'Keep driving pressure (Pplat-PEEP) ≤ 15 cmH₂O in ARDS'],
        drugs: ['Bronchodilators: reduce PIP-Pplat gradient', 'Neuromuscular blockade: may reduce PIP by eliminating patient-ventilator asynchrony'],
      },
      {
        id: 'pcvNormal',
        label: 'PCV Normal',
        subtitle: 'Pressure Control — decelerating flow',
        path: VENTP_PATHS.pcvNormal,
        mechanism: 'Constant pressure applied during inspiration. Flow decelerates as alveoli fill. Provides more homogeneous gas distribution. Tidal volume varies with compliance and resistance.',
        clinical: 'Lower peak pressures than VCV for same tidal volume. Volume is not guaranteed — monitor VTe carefully if compliance changes (ARDS, secretions).',
        pearls: ['PCV: watch VTe — may drop if compliance falls or resistance rises', 'Decelerating flow = more physiological than square wave', 'Peak pressure set by clinician = lung-protective strategy easier to implement'],
        drugs: [],
      },
      {
        id: 'highRes',
        label: 'High Airway Resistance',
        subtitle: 'High PIP, normal Pplat',
        path: VENTP_PATHS.highRes,
        mechanism: 'Increased resistance (bronchospasm, secretions, ETT kinking, patient biting) requires higher pressure to push same flow through. Pplat unaffected — lung compliance is normal.',
        clinical: 'PIP-Pplat gap > 10-15 cmH₂O indicates resistance problem. PIP alarms trigger first.',
        pearls: ['Suction first (most common cause intraoperatively)', 'Listenfor bilateral wheeze — bronchospasm vs. secretions', 'Check tube: kink, patient biting, position (endobronchial?)', 'Bronchospasm: volatile anesthetic depth, IV ketamine, bronchodilators'],
        drugs: ['Albuterol, Ipratropium: inhaled bronchodilators', 'IV Ketamine, Volatile agents: systemic bronchodilation'],
      },
      {
        id: 'lowComp',
        label: 'Low Compliance (ARDS)',
        subtitle: 'High Pplat, PIP-Pplat gap narrow',
        path: VENTP_PATHS.lowComp,
        mechanism: 'Stiff, consolidated lung requires high pressure to achieve given volume. PIP and Pplat both elevated, with narrow PIP-Pplat gap (compliance problem, not resistance).',
        clinical: 'ARDS, pulmonary edema, pneumothorax, obesity, abdominal compartment syndrome. Lung-protective ventilation: low TV (6 mL/kg IBW), Pplat ≤ 30, driving pressure ≤ 15.',
        pearls: ['Recruitment maneuvers may improve compliance temporarily', 'Prone positioning: improves V/Q matching in ARDS', 'Permissive hypercapnia accepted to limit driving pressure', 'Neuromuscular blockade: reduces patient-ventilator dyssynchrony in severe ARDS'],
        drugs: ['Cisatracurium: 48h NMBD infusion in severe ARDS (P/F < 150)'],
      },
      {
        id: 'autoPeep',
        label: 'Auto-PEEP / Air Trapping',
        subtitle: 'PEEP baseline elevated above set PEEP',
        path: VENTP_PATHS.autoPeep,
        mechanism: 'Expiration cannot complete before the next breath. Trapped gas adds to intrathoracic pressure above the set PEEP level. Effective PEEP = set PEEP + intrinsic PEEP.',
        clinical: 'Obstructive disease, high respiratory rates, short I:E ratio. Can cause hemodynamic instability (reduced venous return), barotrauma, and patient-ventilator dyssynchrony.',
        pearls: ['Measure auto-PEEP: end-expiratory pause maneuver (pause expiratory valve)', 'Treatment: reduce RR, increase expiratory time (widen I:E ratio)', 'In asthma: disconnect circuit briefly to allow full exhalation', 'Intrinsic PEEP mimics tension pneumothorax hemodynamically'],
        drugs: ['Bronchodilators: reduce air trapping', 'Consider controlled apnea briefly if hemodynamically compromised'],
      },
    ],
    getCurrent(patient, vitals) {
      const pip = vitals?.pip;
      const pplat = vitals?.pplat;
      if (!pip) return null;
      const dp = (pplat || pip) - (vitals?.peep || 5);
      if (dp > 18) return { label: 'High driving pressure', detail: `Driving pressure ${dp.toFixed(0)} cmH₂O — above 15 cmH₂O threshold. Reduce TV or optimize PEEP.`, color: '#ef4444' };
      const pipPlatGap = pip - (pplat || pip * 0.8);
      if (pipPlatGap > 15) return { label: 'High resistance', detail: `PIP-Pplat gap ${pipPlatGap.toFixed(0)} cmH₂O. Check for bronchospasm, secretions, ETT kink.`, color: '#f97316' };
      if ((pplat || pip) > 30) return { label: 'High plateau pressure', detail: `Pplat ${pplat} cmH₂O — lung compliance reduced. Target ≤ 30 cmH₂O.`, color: '#f97316' };
      return { label: 'Normal pressures', detail: `PIP ${pip}, Pplat ${pplat || '--'}, Driving pressure ${dp.toFixed(0)} cmH₂O.`, color: '#22c55e' };
    },
  },

  ventFlow: {
    name: 'Ventilator Flow-Time Waveform',
    abbrev: 'Flow',
    color: '#22c55e',
    isLoop: false,
    anatomy: [
      { label: 'Inspiratory Flow', desc: 'Gas delivery to lungs — positive (above midline). Shape depends on mode: square (VCV), decelerating (PCV)' },
      { label: 'End-Inspiratory Pause', desc: 'Zero flow during breath-hold for plateau pressure measurement' },
      { label: 'Expiratory Flow', desc: 'Passive exhalation — negative (below midline). Should return to zero before next breath' },
      { label: 'Expiratory Return', desc: 'Flow returning to zero = lungs fully emptied. Non-return = auto-PEEP' },
    ],
    states: [
      {
        id: 'vcvSquare',
        label: 'VCV — Constant Flow',
        subtitle: 'Square inspiratory wave',
        path: VENTF_PATHS.vcvSquare,
        mechanism: 'Constant-flow delivery fills lungs at a fixed rate. Square inspiratory wave, passive decelerating expiratory flow that returns to zero.',
        clinical: 'Standard VCV. Ensures guaranteed tidal volume delivery. Expiratory flow should reach zero before next breath (>0 = auto-PEEP).',
        pearls: ['Monitor expiratory flow return: must reach 0 L/min', 'If expiratory limb does not return to zero: increase expiratory time', 'Peak flow rate determines inspiratory time in VCV'],
        drugs: [],
      },
      {
        id: 'pcvDecel',
        label: 'PCV — Decelerating Flow',
        subtitle: 'Decelerating inspiratory wave',
        path: VENTF_PATHS.pcvDecel,
        mechanism: 'Initial high flow rapidly fills lungs, then decelerates as alveolar pressure rises toward set pressure. More physiological distribution of gas.',
        clinical: 'Lower mean airway pressure for same PIP. Tidal volume not guaranteed. If patient compliance changes, VTe changes.',
        pearls: ['Higher mean Paw than VCV = better oxygenation but more hemodynamic impact', 'Always set a VTe alarm when using PCV', 'Useful in patients where lower peak pressures are needed'],
        drugs: [],
      },
      {
        id: 'autoPeep',
        label: 'Auto-PEEP (Incomplete Exhalation)',
        subtitle: 'Expiratory flow never returns to zero',
        path: VENTF_PATHS.autoPeep,
        mechanism: 'Insufficient expiratory time or high airway resistance prevents complete exhalation. Flow is still above zero when the next breath begins, indicating residual trapped gas.',
        clinical: 'Obstructive disease (COPD, asthma), high respiratory rates, long I:E ratio. Creates dynamic hyperinflation with hemodynamic consequences.',
        pearls: ['Recognize by flow waveform: expiratory limb cut off before reaching zero', 'Quantify by end-expiratory hold maneuver', 'Treat by reducing RR, widening I:E (allow more expiratory time)', 'In arrest: temporarily disconnect circuit to allow complete exhalation'],
        drugs: ['Bronchodilators: improve expiratory flow, reduce air trapping'],
      },
    ],
    getCurrent(patient, vitals) {
      const res = vitals?.res;
      if (!res) return null;
      if (res > 20) return { label: 'Incomplete exhalation likely', detail: `Airway resistance ${res} cmH₂O/L/s — check flow waveform for expiratory return to zero.`, color: '#f97316' };
      return { label: 'Normal flow waveform', detail: `Resistance ${res} cmH₂O/L/s. Expiratory flow should return to zero.`, color: '#22c55e' };
    },
  },

  flowVolume: {
    name: 'Flow-Volume Loop',
    abbrev: 'F-V Loop',
    color: '#10b981',
    isLoop: true,
    anatomy: [
      { label: 'Inspiratory Limb (lower)', desc: 'Machine-delivered flow into the patient — tidal volume rises from 0 (right) toward Vt (left), below the zero-flow line. VCV is a flat step; PCV/PSV is a decelerating curve.' },
      { label: 'Expiratory Limb (upper)', desc: 'Passive elastic recoil against airway resistance — peaks at PEF, then decays exponentially (time constant τ = R·C) back toward zero as the lungs empty.' },
      { label: 'PEF (peak expiratory flow)', desc: 'The top of the expiratory limb. Falls, and the limb flattens/scoops, when airway resistance is high (bronchospasm, COPD, secretions, a kinked tube).' },
      { label: 'Closure at zero volume', desc: 'A complete breath returns to the right edge (0 volume, 0 flow). An expiratory limb that stops short of it is gas trapping / auto-PEEP.' },
    ],
    states: [
      {
        id: 'normal',
        label: 'Normal',
        subtitle: 'Full loop, closes at zero volume',
        get path() { return makeFVPath('normal'); },
        mechanism: 'A passive mechanical breath: the ventilator drives gas in (inspiratory limb, below the zero line), then elastic recoil pushes it back out against airway resistance (expiratory limb, above the line), decaying exponentially to zero. The loop is smooth and closes cleanly at zero volume.',
        clinical: 'Baseline for comparison. Peak expiratory flow, loop width (tidal volume) and closure at zero volume are all preserved. The enclosed area is the resistive work of the breath.',
        pearls: ['Expiratory limb shape is set by the time constant τ = R·C', 'A complete breath returns to (0 volume, 0 flow) — the right edge', 'Compare loop-to-loop: a shrinking loop means falling Vt or worsening mechanics'],
        drugs: [],
      },
      {
        id: 'highRes',
        label: 'High Airway Resistance',
        subtitle: 'Bronchospasm / COPD — scooped, low expiratory flow',
        get path() { return makeFVPath('highRes'); },
        mechanism: 'Elevated airway resistance slows expiratory flow at every lung volume, so peak expiratory flow falls and the expiratory limb flattens and "scoops". The time constant lengthens, prolonging exhalation.',
        clinical: 'Bronchospasm, COPD, a kinked or secretion-filled ETT, an obstructed HME. On the pressure waveform this is a wide PIP–Pplat gap (resistive, not compliance). A long τ risks incomplete emptying and auto-PEEP.',
        pearls: ['Scooped, low expiratory limb = high resistance', 'PIP rises but Pplat stays normal (PIP–Pplat gap widens)', 'Rule out a mechanical cause first: kinked tube, bitten tube, mucus plug, bronchial cuff'],
        drugs: ['Albuterol / ipratropium — first-line for bronchospasm', 'Volatile anesthetics, IV ketamine — bronchodilators'],
      },
      {
        id: 'lowComp',
        label: 'Low Compliance',
        subtitle: 'ARDS / restriction — narrow loop, small Vt',
        get path() { return makeFVPath('lowComp'); },
        mechanism: 'Stiff lungs deliver a smaller tidal volume for the same driving pressure, so the loop is narrow (reduced volume span). Elastic recoil is brisk, so peak expiratory flow is preserved or even increased.',
        clinical: 'ARDS, pulmonary edema, fibrosis, chest-wall/abdominal restriction, pneumothorax, mainstem intubation. Pplat is elevated — keep driving pressure (Pplat − PEEP) ≤ 15 cmH₂O and Vt ≈ 6 mL/kg IBW.',
        pearls: ['Narrow loop with a normal-shaped (non-scooped) expiratory limb = restriction', 'PIP and Pplat both rise together (small PIP–Pplat gap)', 'A sudden intra-op narrowing = pneumothorax or mainstem intubation until proven otherwise'],
        drugs: [],
      },
      {
        id: 'autoPeep',
        label: 'Auto-PEEP / Gas Trapping',
        subtitle: 'Expiratory limb fails to reach zero volume',
        get path() { return makeFVPath('autoPeep'); },
        mechanism: 'Exhalation is cut off by the next breath before the lungs fully empty, so the expiratory limb stops short of zero volume — trapped gas. Driven by high resistance, a fast rate, or inverse I:E (too little expiratory time).',
        clinical: 'Severe bronchospasm/COPD with a high RR. Trapped gas raises intrathoracic pressure → hypotension and barotrauma. Fix: lengthen expiratory time (↓ RR, ↓ I:E), treat the resistance, or briefly disconnect the circuit to let the lungs empty.',
        pearls: ['Expiratory limb not returning to zero volume = gas trapping', 'Quantify with an expiratory-hold (measures total PEEP)', 'Hypotension + rising airway pressures on a fast, obstructive patient = auto-PEEP until proven otherwise', 'Permissive hypercapnia is the usual trade-off'],
        drugs: ['Bronchodilators — reduce resistance and speed emptying', 'Deepen anesthesia / paralysis if the patient is breath-stacking'],
      },
    ],
    getCurrent(patient, vitals) {
      const res = vitals?.res || 5;
      const compl = vitals?.compl || 60;
      if (patient?.autoPeep || patient?.gasTrapping) return { label: 'Auto-PEEP / gas trapping', detail: 'Expiratory limb not returning to zero volume. Lengthen expiratory time (↓ RR / ↓ I:E) and treat resistance.', color: '#ef4444' };
      if (patient?.hasCopd || patient?.asthma || patient?.bronchospasm || res > 15) return { label: 'High airway resistance', detail: `Resistance ${res} cmH₂O/L/s — scooped, low-flow expiratory limb expected; watch for gas trapping (long τ).`, color: '#f97316' };
      if (compl < 30 || patient?.atelectasis > 0.15) return { label: 'Low compliance', detail: `Cdyn ${compl} mL/cmH₂O — narrow tidal loop (small Vt for the driving pressure). Keep driving pressure ≤ 15.`, color: '#f97316' };
      return { label: 'Normal tidal loop', detail: `Resistance ${res}, compliance ${compl} mL/cmH₂O. Full loop that closes at zero volume.`, color: '#22c55e' };
    },
  },

  pvLoop: {
    name: 'Pressure-Volume Loop',
    abbrev: 'P-V Loop',
    color: '#eab308',
    isLoop: true,
    anatomy: [
      { label: 'Inspiratory limb (right-bowing)', desc: 'Volume rises with pressure from the PEEP origin to PIP. At any volume it needs MORE pressure than expiration — the extra is the resistive driving pressure (flow × R).' },
      { label: 'Slope = compliance', desc: 'The overall steepness is dynamic compliance, Vt / (PIP − PEEP). A flatter slope means stiffer lungs.' },
      { label: 'Loop width = resistance', desc: 'The horizontal gap between the limbs is the resistive work per breath (the PIP − Pplat difference). Wider = more resistance.' },
      { label: 'Origin at PEEP', desc: 'A normal breath starts and ends at (PEEP, zero volume). An origin lifted off that baseline is gas trapping / auto-PEEP.' },
    ],
    states: [
      {
        id: 'normal',
        label: 'Normal Compliance',
        subtitle: 'Steep slope, narrow loop',
        path: PV_PATHS.normal,
        mechanism: 'A passive VCV breath: pressure rises with volume from PEEP to PIP (inspiratory limb, bowing right against airway resistance), then recoil returns it to PEEP (expiratory limb). The slope is compliance; the enclosed area is the resistive work of the breath.',
        clinical: 'Cdyn = Vt / (PIP − PEEP), normally ≥ 60 mL/cmH₂O. The loop starts and closes at the PEEP origin. PIP − Pplat (loop width) is small when resistance is low.',
        pearls: ['Steeper slope = higher compliance', 'Loop width tracks resistive work (PIP − Pplat)', 'A clean return to the PEEP origin means no gas trapping'],
        drugs: [],
      },
      {
        id: 'highRes',
        label: 'High Airway Resistance',
        subtitle: 'Wide loop — large PIP − Pplat gap',
        path: PV_PATHS.highRes,
        mechanism: 'Elevated airway resistance needs a large resistive pressure (flow × R) to drive gas in, so PIP climbs well above Pplat and the loop fattens horizontally — the enclosed (resistive-work) area grows. The underlying compliance slope is preserved.',
        clinical: 'Bronchospasm, secretions, a kinked or bitten ETT, an obstructed HME. The widened PIP − Pplat gap is the tell; Pplat (compliance) stays near normal.',
        pearls: ['Wide loop with a preserved slope = resistance, not compliance', 'PIP rises, Pplat stays normal', 'Rule out a mechanical cause first: kink, mucus plug, bronchial cuff'],
        drugs: ['Albuterol / ipratropium — first-line', 'Volatile anesthetics, IV ketamine — bronchodilators'],
      },
      {
        id: 'lowComp',
        label: 'Low Compliance (ARDS)',
        subtitle: 'Flat slope — high pressure for a small volume',
        path: PV_PATHS.lowComp,
        mechanism: 'Stiff lungs need a much larger pressure change for the same volume, so the loop flattens and shifts right on the pressure axis. Both PIP and Pplat rise together (the gap stays small — this is elastic, not resistive).',
        clinical: 'ARDS, pulmonary edema, fibrosis, chest-wall/abdominal restriction, pneumothorax, mainstem intubation. Keep driving pressure (Pplat − PEEP) ≤ 15 cmH₂O and Vt ≈ 6 mL/kg IBW; "baby lung" — recruit before pushing pressure.',
        pearls: ['Flat slope = low compliance', 'PIP and Pplat both rise together (small gap)', 'A sudden intra-op flattening = pneumothorax / mainstem until proven otherwise'],
        drugs: ['Cisatracurium — early severe ARDS (ACURASYS)', 'Prone positioning — improves V/Q'],
      },
      {
        id: 'autoPeep',
        label: 'Auto-PEEP / Gas Trapping',
        subtitle: 'Origin lifts off the PEEP baseline',
        path: PV_PATHS.autoPeep,
        mechanism: 'Incomplete exhalation leaves trapped gas, so the next breath begins at a volume and pressure above the set PEEP — the whole loop lifts off the baseline origin (dynamic hyperinflation) rather than starting at (PEEP, 0).',
        clinical: 'Severe bronchospasm/COPD with a high rate or too little expiratory time. Trapping raises intrathoracic pressure → hypotension and barotrauma. Lengthen expiratory time (↓ RR, ↓ I:E), treat resistance, or briefly disconnect the circuit.',
        pearls: ['Loop not starting at the set PEEP = auto-PEEP', 'Quantify with an expiratory-hold (total PEEP)', 'Hypotension + rising airway pressures on a fast obstructive patient = auto-PEEP until proven otherwise'],
        drugs: ['Bronchodilators — speed lung emptying', 'Deepen anesthesia / paralysis if the patient is breath-stacking'],
      },
    ],
    getCurrent(patient, vitals) {
      const compl = vitals?.compl || 60;
      const res = vitals?.res || 5;
      if (patient?.autoPeep || patient?.gasTrapping) return { label: 'Auto-PEEP / gas trapping', detail: 'Loop origin lifted off the PEEP baseline. Lengthen expiratory time (↓ RR / ↓ I:E) and treat resistance.', color: '#ef4444' };
      if (patient?.bronchospasm || patient?.hasCopd || patient?.asthma || res > 15) return { label: 'High airway resistance', detail: `Resistance ${res} cmH₂O/L/s — wide loop, large PIP − Pplat gap.`, color: '#f97316' };
      if (compl < 30 || patient?.atelectasis > 0.15) return { label: 'Low compliance', detail: `Cdyn ${compl} mL/cmH₂O — flat slope, high pressure for a small volume. Keep driving pressure ≤ 15.`, color: '#f97316' };
      return { label: 'Normal P-V loop', detail: `Cdyn ${compl} mL/cmH₂O, resistance ${res} cmH₂O/L/s. Steep slope, narrow loop, closes at PEEP.`, color: '#22c55e' };
    },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function WaveformContextPanel({ waveformId, anchorRect, onClose, patient, vitals }) {
  const config = WAVEFORM_CONFIGS[waveformId];
  const [tab, setTab] = useState('guide');
  const [selectedState, setSelectedState] = useState(null);
  const [pos, setPos] = useState(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const panelRef = useRef(null);

  // Initial position: near anchor, clamped to viewport
  useEffect(() => {
    const W_panel = 420, H_panel = 520;
    let x = anchorRect ? anchorRect.left + anchorRect.width + 8 : window.innerWidth - W_panel - 16;
    let y = anchorRect ? anchorRect.top : 80;
    x = Math.min(x, window.innerWidth - W_panel - 8);
    y = Math.min(y, window.innerHeight - H_panel - 8);
    x = Math.max(8, x); y = Math.max(8, y);
    setPos({ x, y });
    setSelectedState(null);
  }, [anchorRect, waveformId]);

  // Drag
  const onDragStart = useCallback(e => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: pos?.x || 0, oy: pos?.y || 0 };
  }, [pos]);

  useEffect(() => {
    const onMove = e => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const nx = Math.max(0, Math.min(window.innerWidth - 420, dragRef.current.ox + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.oy + dy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => { dragRef.current.active = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  if (!config || !pos) return null;

  const currentInterp = config.getCurrent ? config.getCurrent(patient, vitals) : null;
  const selState = selectedState ? config.states.find(s => s.id === selectedState) : null;

  // For loop guides (F-V, P-V), draw a faint grey outline of the NORMAL loop behind a
  // pathology so the deviation (scooping, plateau, narrowing, flattened slope) reads at a
  // glance against the reference. Returns null for the normal state itself and for the
  // non-loop time-series guides (pleth, A-line, capnography, ventilator strips).
  const ghostNormal = (currentId) => {
    if (!config.isLoop) return null;
    const normal = config.states[0];
    if (!normal || currentId === normal.id) return null;
    return <path d={normal.path} fill="none" stroke="#94a3b8" strokeWidth="1.3" strokeOpacity="0.45" />;
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-[300] flex flex-col rounded-xl border border-slate-700/80 bg-slate-950/97 shadow-2xl backdrop-blur-xl overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: 420, maxHeight: '88vh', userSelect: dragRef.current?.active ? 'none' : 'auto' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ borderColor: config.color + '30', background: config.color + '10' }}
        onMouseDown={onDragStart}
      >
        <GripVertical size={14} style={{ color: config.color + '70' }} />
        <Activity size={15} style={{ color: config.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black uppercase tracking-wider text-slate-100 leading-tight">{config.name}</div>
          <div className="text-[10px] text-slate-500 leading-none">{config.abbrev} — waveform morphology guide</div>
        </div>
        <button onMouseDown={e => e.stopPropagation()} onClick={onClose}
          className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 shrink-0">
        {['guide', 'anatomy', 'current'].map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
              tab === t ? 'border-current text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
            style={{ color: tab === t ? config.color : undefined, borderColor: tab === t ? config.color : 'transparent' }}
          >
            {t === 'guide' ? 'Waveform Guide' : t === 'anatomy' ? 'Components' : 'Current Pattern'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3" style={{ scrollbarWidth: 'thin' }}>

        {/* GUIDE TAB */}
        {tab === 'guide' && (
          <div className="space-y-2">
            {!selState ? (
              <>
                <p className="text-[10px] text-slate-500 mb-2">Tap a pattern card to expand the full waveform view and clinical explanation.</p>
                <div className="grid grid-cols-2 gap-2">
                  {config.states.map(st => (
                    <button key={st.id}
                      onClick={() => setSelectedState(st.id)}
                      className="text-left rounded-lg border p-2 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                      style={{ borderColor: config.color + '30', background: config.color + '08' }}
                    >
                      <div className="text-[10px] font-black text-slate-200 leading-tight">{st.label}</div>
                      <div className="text-[9px] text-slate-500 mb-1.5 leading-tight">{st.subtitle}</div>
                      <svg
                        viewBox={config.isLoop ? '0 0 160 110' : '0 0 280 65'}
                        className="w-full"
                        style={{ height: config.isLoop ? 60 : 38, display: 'block' }}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {config.isLoop
                          ? <>{ghostNormal(st.id)}<path d={st.path} fill={config.color + '15'} stroke={config.color} strokeWidth="1.5" /></>
                          : <path d={st.path} fill="none" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" />
                        }
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => setSelectedState(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 mb-3 flex items-center gap-1 transition-colors">
                  ← Back to all patterns
                </button>

                {/* Large waveform preview */}
                <div className="rounded-lg border p-2 mb-3" style={{ borderColor: config.color + '30', background: config.color + '08' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-xs font-black text-slate-100">{selState.label}</div>
                      <div className="text-[10px] text-slate-400">{selState.subtitle}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: config.color + '20', color: config.color }}>
                      {config.abbrev}
                    </span>
                  </div>
                  <svg
                    viewBox={config.isLoop ? '0 0 160 110' : '0 0 280 65'}
                    className="w-full"
                    style={{ height: config.isLoop ? 90 : 60, display: 'block' }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {config.isLoop ? (
                      <>
                        <line x1="80" y1="0" x2="80" y2="110" stroke="#334155" strokeWidth="0.5" strokeDasharray="2,3" />
                        <line x1="0" y1={waveformId === 'flowVolume' ? '48' : '88'} x2="160" y2={waveformId === 'flowVolume' ? '48' : '88'} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,3" />
                        {ghostNormal(selState.id)}
                        <path d={selState.path} fill={config.color + '18'} stroke={config.color} strokeWidth="2" />
                      </>
                    ) : (
                      <>
                        <line x1="0" y1="32.5" x2="280" y2="32.5" stroke="#1e293b" strokeWidth="0.5" />
                        <path d={selState.path} fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </div>

                {/* Clinical content */}
                <div className="space-y-2">
                  <div className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/40">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Mechanism</div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{selState.mechanism}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/40">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Clinical Significance</div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{selState.clinical}</p>
                  </div>
                  {selState.pearls?.length > 0 && (
                    <div className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/40">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Key Pearls</div>
                      <ul className="space-y-1">
                        {selState.pearls.map((p, i) => (
                          <li key={i} className="flex gap-1.5 items-start">
                            <span style={{ color: config.color }} className="text-[11px] leading-none mt-0.5 shrink-0">▸</span>
                            <span className="text-[10px] text-slate-300 leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selState.drugs?.length > 0 && (
                    <div className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/40">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Pharmacology</div>
                      {selState.drugs.map((d, i) => (
                        <p key={i} className="text-[10px] text-slate-300 leading-relaxed">{d}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANATOMY TAB */}
        {tab === 'anatomy' && (
          <div className="space-y-2">
            <div className="rounded-lg border p-2 mb-3" style={{ borderColor: config.color + '25', background: config.color + '06' }}>
              <svg
                viewBox={config.isLoop ? '0 0 160 110' : '0 0 280 65'}
                className="w-full"
                style={{ height: config.isLoop ? 80 : 55, display: 'block' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {config.isLoop ? (
                  <path d={config.states[0].path} fill={config.color + '15'} stroke={config.color} strokeWidth="2" />
                ) : (
                  <path d={config.states[0].path} fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
              <div className="text-[9px] text-center text-slate-500 mt-1">{config.abbrev} — reference waveform (normal)</div>
            </div>
            <div className="space-y-1.5">
              {config.anatomy.map((a, i) => (
                <div key={i} className="flex gap-2 items-start rounded p-2 border border-slate-800/60 bg-slate-900/30">
                  <div className="text-[10px] font-black w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: config.color + '20', color: config.color }}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-200">{a.label}</div>
                    <div className="text-[10px] text-slate-400 leading-relaxed">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CURRENT PATTERN TAB */}
        {tab === 'current' && (
          <div className="space-y-2">
            {!currentInterp ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📡</div>
                <div className="text-xs text-slate-500">
                  {!patient ? 'No active patient' : 'Monitor not active or data unavailable'}
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-lg border p-3" style={{ borderColor: currentInterp.color + '40', background: currentInterp.color + '08' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: currentInterp.color }} />
                    <div className="text-xs font-black text-slate-100">{currentInterp.label}</div>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">{currentInterp.detail}</p>
                </div>

                {/* Live waveform preview */}
                <div className="rounded-lg border border-slate-800 p-2" style={{ background: config.color + '05' }}>
                  <div className="text-[9px] text-slate-500 mb-1.5 font-bold uppercase tracking-wider">Current waveform pattern match</div>
                  {(() => {
                    const matchState = config.states.find(s => {
                      if (!currentInterp.label) return false;
                      const l = currentInterp.label.toLowerCase();
                      if (s.id === 'normal' && (l.includes('normal') || l.includes('good'))) return true;
                      if (s.id === 'broncho' && l.includes('shark')) return true;
                      if (s.id === 'lowCO' && l.includes('low co')) return true;
                      if (s.id === 'poorPerf' && l.includes('poor')) return true;
                      if (s.id === 'ppv' && l.includes('ppv')) return true;
                      if (s.id === 'hyperdyn' && (l.includes('hyper') || l.includes('sepsis'))) return true;
                      if (s.id === 'highRes' && l.includes('resist')) return true;
                      if (s.id === 'lowComp' && (l.includes('compli') || l.includes('ards'))) return true;
                      if (s.id === 'autoPeep' && (l.includes('auto') || l.includes('trap'))) return true;
                      if (s.id === 'tamponade' && l.includes('tampona')) return true;
                      if (s.id === 'afib' && l.includes('af')) return true;
                      return false;
                    }) || config.states[0];
                    return (
                      <svg viewBox={config.isLoop ? '0 0 160 110' : '0 0 280 65'} className="w-full"
                        style={{ height: config.isLoop ? 70 : 50, display: 'block' }}
                        preserveAspectRatio="xMidYMid meet">
                        {config.isLoop
                          ? <>{ghostNormal(matchState.id)}<path d={matchState.path} fill={config.color + '15'} stroke={config.color} strokeWidth="1.8" /></>
                          : <path d={matchState.path} fill="none" stroke={config.color} strokeWidth="1.8" strokeLinecap="round" />
                        }
                      </svg>
                    );
                  })()}
                </div>

                {/* Clinical parameters */}
                <div className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/30">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Current Parameters</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {waveformId === 'pleth' && [
                      ['SpO₂', `${vitals?.spo2 ?? '--'}%`],
                      ['HR', `${vitals?.hr ?? '--'} bpm`],
                      ['PPV', `${vitals?.ppv?.toFixed(0) ?? '--'}%`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-1 text-center">
                        <div className="text-[8px] text-slate-500 uppercase">{k}</div>
                        <div className="text-[11px] font-black text-slate-200">{v}</div>
                      </div>
                    ))}
                    {waveformId === 'aline' && [
                      ['SBP', `${vitals?.sys ?? '--'}`],
                      ['DBP', `${vitals?.dia ?? '--'}`],
                      ['MAP', `${vitals?.map ?? '--'}`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-1 text-center">
                        <div className="text-[8px] text-slate-500 uppercase">{k}</div>
                        <div className="text-[11px] font-black text-slate-200">{v}</div>
                      </div>
                    ))}
                    {waveformId === 'cvp' && [
                      ['CVP', `${vitals?.cvp ?? '--'} mmHg`],
                      ['HR', `${vitals?.hr ?? '--'}`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-1 text-center">
                        <div className="text-[8px] text-slate-500 uppercase">{k}</div>
                        <div className="text-[11px] font-black text-slate-200">{v}</div>
                      </div>
                    ))}
                    {waveformId === 'etco2' && [
                      ['EtCO₂', `${vitals?.etco2 ?? '--'} mmHg`],
                      ['RR', `${vitals?.rr ?? '--'}`],
                      ['Raw', `${vitals?.res ?? '--'}`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-1 text-center">
                        <div className="text-[8px] text-slate-500 uppercase">{k}</div>
                        <div className="text-[11px] font-black text-slate-200">{v}</div>
                      </div>
                    ))}
                    {(waveformId === 'ventPressure' || waveformId === 'ventFlow') && [
                      ['PIP', `${vitals?.pip ?? '--'}`],
                      ['Pplat', `${vitals?.pplat ?? '--'}`],
                      ['Raw', `${vitals?.res ?? '--'}`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-1 text-center">
                        <div className="text-[8px] text-slate-500 uppercase">{k}</div>
                        <div className="text-[11px] font-black text-slate-200">{v}</div>
                      </div>
                    ))}
                    {(waveformId === 'flowVolume' || waveformId === 'pvLoop') && [
                      ['Cdyn', `${vitals?.compl ?? '--'} mL/cmH₂O`],
                      ['Raw', `${vitals?.res ?? '--'} cmH₂O/L/s`],
                      ['VTe', `${vitals?.vte ?? '--'} mL`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-1 text-center">
                        <div className="text-[8px] text-slate-500 uppercase">{k}</div>
                        <div className="text-[11px] font-black text-slate-200">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
