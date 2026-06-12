/**
 * Clinical-Grade 12-Lead EKG Waveform Synthesizer
 * Models the electrical projection of the heart onto standard leads:
 * I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6
 */

export function synthesizeEkgLead(lead, tBeat, beatDuration, canvasHeight, baseLineY, timeSecs, patient, electrolytes, activeMeds) {
  // 1. Sanitize inputs
  const p = Math.max(0.0, Math.min(1.0, tBeat / beatDuration));
  const h = typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) ? canvasHeight : 100;
  const base = typeof baseLineY === 'number' && Number.isFinite(baseLineY) ? baseLineY : h / 2;
  const k = (electrolytes && typeof electrolytes.k === 'number' && Number.isFinite(electrolytes.k)) ? electrolytes.k : 4.0;
  const ca = (electrolytes && typeof electrolytes.ca === 'number' && Number.isFinite(electrolytes.ca)) ? electrolytes.ca : 9.0;
  const isArrest = patient?.isArrest || false;
  const rhythm = patient?.cardiacRhythm || 'normal';
  
  // Ischemia calculations
  let isIschemic = patient?.ischemicDamage > 400;
  // If the patient has active CAD and is stunning, default to ischemia
  if (patient?.myocardialStunning > 10 && (patient?.cad || patient?.hasCAD)) {
    isIschemic = true;
  }
  const ischemiaTerritory = (patient?.cad || patient?.hasCAD) ? 'inferior' : 'anterior';

  // 2. Check for arrest rhythms
  if (isArrest) {
    if (rhythm === 'vfib') {
      // VFib: chaotic irregular wave (independent of lead, but slightly scaled by lead amplitude)
      const leadScale = getLeadScale(lead);
      const noise = (Math.sin(timeSecs * 35) * 0.35 + Math.cos(timeSecs * 87) * 0.2 + Math.sin(timeSecs * 15) * 0.1) * leadScale;
      return base - noise * h;
    }
    if (rhythm === 'vtach') {
      // VTach: rapid wide-complex monomorphic wave
      const leadScale = getLeadScale(lead);
      const vt = Math.sin(p * 2 * Math.PI) * 0.4 * (lead === 'aVR' ? -1 : 1) * leadScale;
      return base - vt * h;
    }
    if (rhythm === 'asystole') {
      // Asystole: flat line, with mechanical CPR compression artifacts if active
      let val;
      if (patient?.cprActive) {
        const cprFreq = 100 / 60;
        val = Math.sin(timeSecs * 2 * Math.PI * cprFreq) * 0.15 + (Math.random() - 0.5) * 0.02;
      } else {
        val = (Math.random() - 0.5) * 0.008;
      }
      return base - val * h;
    }
    // PEA renders as a normal or bradycardic EKG but with flat pleth/aline
    // So if it's PEA, let it fall through to regular waveform synthesis!
  }

  // 3. Systemic Hyperkalemia check: Severe sine-wave
  if (k > 8.5 && !patient?.calciumStabilized) {
    const leadScale = getLeadScale(lead);
    const sineVal = Math.sin(p * 2 * Math.PI) * 0.35 * (lead === 'aVR' ? -1 : 1) * leadScale;
    let finalVal = sineVal;
    if (patient?.cprActive) {
      finalVal += Math.sin(timeSecs * 2 * Math.PI * (100 / 60)) * 0.08;
    }
    return base - finalVal * h;
  }

  // 4. Base Lead Profiles
  const profile = getLeadProfile(lead, patient);

  // 5. Conductance & Timing adjustments (PR, QRS, QT)
  let prDuration = 0.12; // normal phase fraction
  let qrsDuration = 0.08; // normal phase fraction
  let qtDuration = 0.35; // normal phase fraction

  // Med adjustments: Beta-Blockers prolong PR
  const hasBetaBlocker = patient?.onBetaBlocker || patient?.hasBetaBlocker || patient?.betaBlocker || (activeMeds && activeMeds.some(m => m.name === 'Esmolol' || m.name === 'Metoprolol'));
  if (hasBetaBlocker) {
    prDuration += 0.05; // prolonged PR
  }

  // Hyperkalemia prolongs PR and widens QRS
  if (k > 5.5) {
    prDuration += (k - 5.5) * 0.02;
  }
  if (k > 7.0) {
    qrsDuration += (k - 7.0) * 0.035;
  }

  // Amiodarone / QT prolonging drugs stretch QT
  const hasAmiodarone = activeMeds && activeMeds.some(m => m.name === 'Amiodarone');
  if (hasAmiodarone) {
    qtDuration += 0.10;
  }
  // Hypocalcemia prolongs QT, hypercalcemia shortens QT
  if (ca < 8.0) {
    qtDuration += (8.0 - ca) * 0.05;
  } else if (ca > 10.5) {
    qtDuration -= (ca - 10.5) * 0.03;
  }

  // Define segment phase boundaries
  const pStart = 0.02;
  const pEnd = pStart + 0.08; // P-wave: 0.02 to 0.10
  
  const prStart = pEnd;
  const prEnd = prStart + prDuration; // PR interval: 0.10 to 0.22 (variable)
  
  const qrsStart = prEnd;
  const qrsEnd = qrsStart + qrsDuration; // QRS: 0.22 to 0.30 (variable)
  
  const stStart = qrsEnd;
  const stEnd = stStart + 0.08; // ST segment: 0.30 to 0.38
  
  const tStart = stEnd;
  const tEnd = tStart + qtDuration; // T-wave: 0.38 to 0.73 (variable)

  // 6. Synthesize waves
  let val = 0;

  // A. P-Wave (absent in AFib or hyperkalemia > 7.0)
  const isAFib = rhythm === 'afib' || patient?.afib || patient?.hasAFib;
  if (!isAFib && k < 7.0) {
    if (p >= pStart && p < pEnd) {
      const pPhase = (p - pStart) / (pEnd - pStart);
      val += Math.sin(pPhase * Math.PI) * 0.08 * profile.p;
    }
  } else if (isAFib) {
    // AFib: high-frequency f-waves (fibrillatory)
    if (p < qrsStart || p > qrsEnd) {
      val += (Math.sin(timeSecs * 45) * 0.025 + Math.cos(timeSecs * 75) * 0.015) * getLeadScale(lead);
    }
  }

  // B. QRS Complex
  if (p >= qrsStart && p < qrsEnd) {
    const qrsPhase = (p - qrsStart) / (qrsEnd - qrsStart);
    
    // Check if right ventricular strain (PE) causes RBBB rabbit ears in V1/V2
    const hasPE = patient?.peActive || patient?.pulmonaryEmbolism || (patient?.procedure === 'PE' || patient?.currentPresetId === 'pe');
    const isRbbbLead = (lead === 'V1' || lead === 'V2');
    
    if (hasPE && isRbbbLead) {
      // RSR' morphology
      if (qrsPhase < 0.3) {
        val += Math.sin((qrsPhase / 0.3) * Math.PI) * 0.15 * profile.r; // small r
      } else if (qrsPhase >= 0.3 && qrsPhase < 0.6) {
        val -= Math.sin(((qrsPhase - 0.3) / 0.3) * Math.PI) * 0.25; // S
      } else {
        val += Math.sin(((qrsPhase - 0.6) / 0.4) * Math.PI) * 0.45; // tall R'
      }
    } else {
      // Normal QRS components: Q, R, S
      if (qrsPhase < 0.2) {
        // Q-wave (downward)
        const qVal = Math.sin((qrsPhase / 0.2) * Math.PI) * 0.12 * profile.q;
        val -= qVal;
      } else if (qrsPhase >= 0.2 && qrsPhase < 0.65) {
        // R-wave (upward)
        const rVal = Math.sin(((qrsPhase - 0.2) / 0.45) * Math.PI) * 0.70 * profile.r;
        val += rVal;
      } else {
        // S-wave (downward)
        const sVal = Math.sin(((qrsPhase - 0.65) / 0.35) * Math.PI) * 0.35 * profile.s;
        val -= sVal;
      }
    }
  }

  // C. ST-Segment / Ischemia elevation/depression
  let stShift = 0;
  if (isIschemic) {
    if (ischemiaTerritory === 'inferior') {
      if (lead === 'II' || lead === 'III' || lead === 'aVF') {
        stShift = 0.22; // ST elevation
      } else if (lead === 'I' || lead === 'aVL') {
        stShift = -0.15; // Reciprocal ST depression
      }
    } else if (ischemiaTerritory === 'anterior') {
      if (lead === 'V1' || lead === 'V2' || lead === 'V3' || lead === 'V4') {
        stShift = 0.28;
      } else if (lead === 'II' || lead === 'III' || lead === 'aVF') {
        stShift = -0.10;
      }
    }
  }
  
  // Digoxin scooped ST depression
  const hasDigoxin = activeMeds && activeMeds.some(m => m.name === 'Digoxin' || m.name === 'Lanoxin');
  if (hasDigoxin && (lead === 'I' || lead === 'aVL' || lead === 'V5' || lead === 'V6')) {
    stShift -= 0.12;
  }

  // Apply ST shift during ST-segment and early T-wave phase
  if (p >= qrsEnd && p < tEnd) {
    const stTPhase = (p - qrsEnd) / (tEnd - qrsEnd);
    const stWindow = Math.sin(stTPhase * Math.PI);
    
    if (hasDigoxin && !isIschemic) {
      const scoopedWindow = Math.pow(1.0 - Math.sin(stTPhase * Math.PI / 2), 2.0);
      val += stShift * scoopedWindow;
    } else {
      val += stShift * stWindow;
    }
  }

  // D. T-Wave
  if (p >= tStart && p < tEnd) {
    const tPhase = (p - tStart) / (tEnd - tStart);
    
    // Hyperkalemia peaked T wave: tall, symmetric, tented (narrow)
    if (k > 5.5) {
      const tentedCurve = Math.pow(Math.sin(tPhase * Math.PI), 4.0);
      const peakScale = 1.0 + (k - 5.5) * 0.45;
      val += tentedCurve * 0.22 * profile.t * peakScale;
    } else if (k < 3.0) {
      // Hypokalemia: flat T wave
      const flatCurve = Math.sin(tPhase * Math.PI) * 0.05 * profile.t;
      val += flatCurve;
    } else {
      // Normal T wave
      const normalCurve = Math.sin(tPhase * Math.PI) * 0.20 * profile.t;
      val += normalCurve;
    }
  }

  // E. Hypokalemia U-Wave
  if (k < 3.5 && p >= tEnd && p < tEnd + 0.12) {
    const uPhase = (p - tEnd) / 0.12;
    const uCurve = Math.sin(uPhase * Math.PI) * 0.06 * (lead === 'aVR' ? -1 : 1);
    val += uCurve;
  }

  // 7. CPR chest compressions artifact
  if (patient?.cprActive) {
    const cprFreq = 100 / 60;
    val += Math.sin(timeSecs * 2 * Math.PI * cprFreq) * 0.12 + (Math.random() - 0.5) * 0.02;
  }
  
  // High-frequency baseline noise
  val += (Math.random() - 0.5) * 0.005;

  // 8. Convert to screen height y-coordinate (invert value because y=0 is top)
  const finalScale = 0.55; 
  return base - val * h * finalScale;
}

function getLeadScale(lead) {
  const scales = {
    'I': 0.8, 'II': 1.0, 'III': 0.6, 'aVR': 0.9, 'aVL': 0.5, 'aVF': 0.8,
    'V1': 0.7, 'V2': 0.9, 'V3': 1.1, 'V4': 1.2, 'V5': 1.0, 'V6': 0.8
  };
  return scales[lead] || 1.0;
}

function getLeadProfile(lead, patient) {
  const LEAD_PROFILES = {
    'I':   { p: 0.8,  q: 0.1,  r: 0.7,  s: 0.1,  t: 0.8 },
    'II':  { p: 1.0,  q: 0.05, r: 1.0,  s: 0.15, t: 1.0 },
    'III': { p: 0.4,  q: 0.0,  r: 0.5,  s: 0.3,  t: 0.3 },
    'aVR': { p: -0.9, q: 0.2,  r: -0.2, s: 0.9,  t: -0.9 },
    'aVL': { p: 0.3,  q: 0.1,  r: 0.4,  s: 0.2,  t: 0.4 },
    'aVF': { p: 0.8,  q: 0.05, r: 0.8,  s: 0.2,  t: 0.8 },
    'V1':  { p: -0.2, q: 0.0,  r: 0.15, s: 0.95, t: -0.3 },
    'V2':  { p: 0.2,  q: 0.0,  r: 0.3,  s: 1.0,  t: 0.5 },
    'V3':  { p: 0.5,  q: 0.0,  r: 0.6,  s: 0.7,  t: 0.8 },
    'V4':  { p: 0.7,  q: 0.0,  r: 0.9,  s: 0.4,  t: 0.9 },
    'V5':  { p: 0.8,  q: 0.05, r: 1.0,  s: 0.1,  t: 0.9 },
    'V6':  { p: 0.8,  q: 0.05, r: 0.9,  s: 0.05, t: 0.8 }
  };

  const prof = LEAD_PROFILES[lead] ? { ...LEAD_PROFILES[lead] } : { p: 1.0, q: 0.0, r: 1.0, s: 0.0, t: 1.0 };
  
  // Right Ventricular Strain (S1Q3T3) modifies profiles of I and III
  const hasPE = patient?.peActive || patient?.pulmonaryEmbolism || (patient?.procedure === 'PE' || patient?.currentPresetId === 'pe');
  if (hasPE) {
    if (lead === 'I') {
      prof.s = 0.85; // deep S wave in Lead I
    } else if (lead === 'III') {
      prof.q = 0.50; // pathological Q in Lead III
      prof.t = -0.50; // T-wave inversion in Lead III
    } else if (lead === 'V1' || lead === 'V2' || lead === 'V3') {
      prof.t = -0.40; // T-wave inversion in right precordial leads
    }
  }

  return prof;
}
