/**
 * Clinical-Grade Arterial Line Waveform Synthesizer
 * Models the mechanical projection of intra-arterial blood pressure waves
 * influenced by vascular tone (SVR), contractility (dP/dt), respiratory cycles (PPV),
 * dysrhythmias (AFib), catheter placement site (radial, brachial, axillary, femoral),
 * and physical transducer damping.
 */

/**
 * Fast-flush (square-wave) dynamic-response test: derives the natural frequency and
 * damping coefficient an examiner would read off a fast-flush tracing, from the
 * discrete damping state this engine already drives the live waveform with
 * (`patient.alineDamping`, or inferred from a 22G catheter gauge).
 *
 * Source: Ch36 (Cardiovascular Monitoring), Figs 36.22-36.25 — the worked fast-flush
 * example: a 1.7 mm oscillation-cycle period at 25 mm/s paper speed -> natural
 * frequency 14.7 Hz; consecutive oscillation-peak heights 17 mm and 24 mm -> amplitude
 * ratio/damping coefficient 0.71. Reading these two numbers directly off a fast-flush
 * tracing is the chapter's own worked methodology, not a closed-form formula; mapping
 * this engine's existing discrete damping states onto representative natural-
 * frequency/damping-coefficient pairs is this function's own disclosed, reasoned
 * generalization — see docs/engines/physiology.md.
 */
export function calculateDynamicResponse(patient) {
  let damping = patient?.alineDamping || 'normal';
  if (!patient?.alineDamping) {
    const aLine = patient?.accessLines?.find(l => l.category === 'Arterial' || l.category === 'Arterial Line');
    if (aLine?.name?.includes('22G')) damping = 'overdamped';
  }

  if (damping === 'underdamped') {
    return {
      naturalFrequencyHz: 24.0,
      dampingCoefficient: 0.15,
      classification: 'underdamped',
      interpretation: 'Low damping coefficient with a high natural frequency: oscillations after a fast-flush ring for several cycles before settling, producing systolic overshoot and a falsely widened pulse pressure on the displayed waveform.'
    };
  } else if (damping === 'overdamped') {
    return {
      naturalFrequencyHz: 7.0,
      dampingCoefficient: 0.85,
      classification: 'overdamped',
      interpretation: 'Low natural frequency with high damping: the fast-flush trace returns to baseline with little or no ringing, but the live waveform loses its dicrotic notch and shows a falsely narrowed pulse pressure. Mean arterial pressure remains reasonably accurate despite the distorted waveform shape.'
    };
  }
  return {
    naturalFrequencyHz: 16.0,
    dampingCoefficient: 0.45,
    classification: 'adequate',
    interpretation: 'Natural frequency and damping coefficient fall in the clinically adequate range (oscillation cycles settle in well under 30 ms after a fast-flush) — the displayed waveform is a faithful reproduction of the true intra-arterial pressure.'
  };
}

export function synthesizeArterialLine(tBeat, beatDuration, canvasHeight, timeSecs, patient, vitals, activeMeds) {
  const h = typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) ? canvasHeight : 100;
  
  const sys = (vitals && typeof vitals.sys === 'number') ? vitals.sys : 120;
  const dia = (vitals && typeof vitals.dia === 'number') ? vitals.dia : 80;
  
  const isArrest = patient?.isArrest || false;
  const rhythm = patient?.cardiacRhythm || 'normal';
  
  // 1. Arrest rhythms
  if (isArrest) {
    if (patient?.cprActive) {
      // CPR chest compressions: generate pressure spikes synchronized with the compression rate (100 bpm)
      // SBP ~90, DBP ~30
      const cprSys = 85 + Math.sin(timeSecs * 10) * 4;
      const cprDia = 25 + Math.cos(timeSecs * 10) * 2;
      // CPR is central compressions, so render with central axillary/femoral type settings
      const p = Math.max(0.0, Math.min(1.0, tBeat / beatDuration));
      return drawArterialWave(p, cprSys, cprDia, 1.2, 1200, 'normal', h, 0.34, 0.5);
    } else {
      // Flatline: 0 mmHg with slight transducer/noise movement
      const noise = (Math.random() - 0.5) * 0.3;
      return h * 0.95 + noise;
    }
  }

  // 2. Identify the active arterial line placement site
  let site = 'radial'; // Default fallback
  const aLine = patient?.accessLines?.find(l => l.category === 'Arterial' || l.category === 'Arterial Line');
  if (aLine?.name) {
    const nameLower = aLine.name.toLowerCase();
    if (nameLower.includes('femoral')) {
      site = 'femoral';
    } else if (nameLower.includes('axillary')) {
      site = 'axillary';
    } else if (nameLower.includes('brachial')) {
      site = 'brachial';
    } else if (nameLower.includes('radial')) {
      site = 'radial';
    }
  }

  // 3. Determine site-specific physiological parameters:
  // SBP amp, DBP drop, phase delay (lag relative to EKG QRS), notch position, and notch sharpness.
  let sbpAmp = 0.12;       // +12% radial SBP overshoot
  let dbpDrop = -0.06;     // -6% radial DBP drop
  let phaseLag = 0.09;     // radial pulse lag of 9% of cardiac cycle
  let pNotch = 0.38;       // radial notch occurs late
  let notchSharpness = 0.4; // radial notch is smooth

  if (site === 'axillary') {
    sbpAmp = 0.0;
    dbpDrop = 0.0;
    phaseLag = 0.02;
    pNotch = 0.32;
    notchSharpness = 0.8;
  } else if (site === 'femoral') {
    sbpAmp = 0.02;
    dbpDrop = -0.01;
    phaseLag = 0.04;
    pNotch = 0.34;
    notchSharpness = 0.7;
  } else if (site === 'brachial') {
    sbpAmp = 0.06;
    dbpDrop = -0.03;
    phaseLag = 0.06;
    pNotch = 0.36;
    notchSharpness = 0.5;
  }

  // 4. Vasodilatory Shock Central-to-Peripheral Gradient Reversal ("Radial Squeeze")
  // In vasodilatory states (sepsis/anaphylaxis/severe vasodilation where SVR < 700),
  // peripheral arterial lines (radial/brachial) experience a severe drop in pressure underestimating central pressure.
  const svr = (vitals && typeof vitals.svr === 'number') ? vitals.svr : 1200;
  if (svr < 700) {
    if (site === 'radial') {
      sbpAmp = -0.15; // SBP drops 15% below central
      dbpDrop = -0.10; // DBP also drops
    } else if (site === 'brachial') {
      sbpAmp = -0.08; // SBP drops 8%
      dbpDrop = -0.05;
    }
    // Axillary and femoral lines do not suffer from the "radial squeeze" and accurately reflect central pressure.
  }

  // 5. Apply phase lag relative to the EKG beat duration
  let p = tBeat / beatDuration;
  p = (p - phaseLag) % 1.0;
  if (p < 0) p += 1.0;

  // 6. Left Ventricular Contractility (dP/dt)
  // Stunning slows down upstroke; epinephrine / calcium speeds it up; beta-blockers blunt it
  let contractility = 1.0;
  if (patient?.myocardialStunning) {
    contractility -= (patient.myocardialStunning / 100) * 0.65;
  }
  if (activeMeds) {
    const hasEpi = activeMeds.some(m => m.name === 'Epinephrine');
    const hasCalcium = activeMeds.some(m => m.name === 'Calcium Chloride' || m.name === 'Calcium Gluconate');
    const hasBeta = activeMeds.some(m => m.name === 'Esmolol' || m.name === 'Metoprolol');
    if (hasEpi) contractility += 0.45;
    if (hasCalcium) contractility += 0.25;
    if (hasBeta) contractility -= 0.30;
  }
  contractility = Math.max(0.35, Math.min(2.0, contractility));

  // 7. Catheter Damping Override (e.g. clot or air bubble)
  let damping = 'normal';
  if (patient?.alineDamping) {
    damping = patient.alineDamping;
  } else {
    // Check if the A-line catheter gauge causes overdamping
    if (aLine?.name?.includes('22G')) {
      damping = 'overdamped';
    }
  }

  // 8. Pulse Pressure Variation (PPV)
  let ppvAmount = 0;
  const hasSinus = rhythm === 'normal';
  const isMechVent = patient?.ventilationStatus === 'mechanical';
  
  if (hasSinus && isMechVent) {
    const eblRatio = (patient?.ebl || 0) / (patient?.ebv || 5000);
    ppvAmount = Math.max(3, Math.min(45, Math.round(8 + eblRatio * 50)));
  }

  // Apply SBP/DBP amplification & shock mods
  let sbpFinal = sys * (1.0 + sbpAmp);
  let dbpFinal = dia * (1.0 + dbpDrop);
  if (dbpFinal >= sbpFinal - 10) dbpFinal = sbpFinal - 10;
  const mapFinal = dbpFinal + (sbpFinal - dbpFinal) / 3;

  // Apply PPV modulation
  const rrVal = typeof vitals?.rr === 'number' && Number.isFinite(vitals.rr) ? Math.max(4, vitals.rr) : 12;
  if (ppvAmount > 0 && rrVal > 0) {
    const rrFreq = rrVal / 60;
    const respPhase = timeSecs * 2 * Math.PI * rrFreq;
    const ppRatio = 1.0 - (ppvAmount / 200) * Math.sin(respPhase);
    const pp = Math.max(10, sbpFinal - dbpFinal);
    const modulatedPP = pp * ppRatio;
    
    sbpFinal = mapFinal + (2 / 3) * modulatedPP;
    dbpFinal = mapFinal - (1 / 3) * modulatedPP;
  }

  return drawArterialWave(p, sbpFinal, dbpFinal, contractility, svr, damping, h, pNotch, notchSharpness);
}

function drawArterialWave(p, sbp, dbp, contractility, svr, damping, h, pNotch, notchSharpness) {
  const pp = sbp - dbp;
  let s; // Normalized shape factor [0, 1]

  if (damping === 'overdamped') {
    // Overdamped: smooth upstroke, rounded peak, no notch, slow decay
    const pSys = 0.24 / contractility;
    if (p < pSys) {
      s = Math.sin((p / pSys) * (Math.PI / 2));
    } else {
      const pDecay = p - pSys;
      const tau = 2.8;
      const rawDecay = Math.exp(-tau * pDecay);
      const minDecay = Math.exp(-tau * (1 - pSys));
      s = (rawDecay - minDecay) / (1 - minDecay);
    }
  } else {
    // Normal or Underdamped morphology
    const pSys = Math.max(0.06, Math.min(0.24, 0.14 / contractility));
    
    // Notch height is higher in vasoconstriction (high SVR), lower in vasodilation (low SVR)
    const sNotch = Math.max(0.32, Math.min(0.72, 0.48 + 0.20 * ((svr - 600) / 1800)));
    
    if (p < pSys) {
      s = Math.sin((p / pSys) * (Math.PI / 2));
    } else if (p < pNotch) {
      const pPhase = (p - pSys) / (pNotch - pSys);
      s = 1.0 - (1.0 - sNotch) * pPhase;
    } else if (p < pNotch + 0.08) {
      // Dicrotic wave rebound
      const pPhase = (p - pNotch) / 0.08;
      // Dicrotic notch bounce is scaled by notchSharpness (central is sharper, peripheral is smoother)
      s = sNotch + 0.08 * notchSharpness * Math.sin(pPhase * Math.PI);
    } else {
      // Diastolic runoff decay
      const pStart = pNotch + 0.08;
      const sStart = sNotch;
      const pDecay = p - pStart;
      
      // Decay rate is slower in vasoconstriction (high SVR), faster in vasodilation (low SVR)
      const tau = Math.max(2.2, Math.min(7.5, 5.8 - 3.8 * ((svr - 600) / 1800)));
      const rawDecay = Math.exp(-tau * pDecay);
      const minDecay = Math.exp(-tau * (1 - pStart));
      s = sStart * (rawDecay - minDecay) / (1 - minDecay);
    }

    if (damping === 'underdamped') {
      // Superimpose high-frequency ringing (resonant artifact)
      const ringing = 0.12 * Math.sin(65 * p) * Math.exp(-6.5 * p);
      s += ringing;
    }
  }

  // Safe clamping
  s = Math.max(0.0, s);

  // Map back to pressure in mmHg
  const pressure = dbp + s * pp;

  // Auto-scale pressure axis based on SBP
  const ceiling = sbp > 190 ? (sbp > 240 ? 300 : 240) : 200;

  // Map pressure to y-coordinate on canvas
  let y = h * (1.0 - (pressure / ceiling));
  
  // Padding clamp
  y = Math.max(2, Math.min(h - 2, y));
  
  return y;
}
