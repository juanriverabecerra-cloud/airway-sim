/**
 * Clinical-Grade SpO2 Plethysmography Waveform Synthesizer
 * Models the peripheral photoplethysmography (PPG) pulse wave at the extremities,
 * dynamically responding to vascular tone (SVR), contractility (dP/dt), blood pressure (MAP),
 * intravascular volume (EBL), respiratory variations (PPV / Pulsus Paradoxus / Baseline Wander),
 * dysrhythmias (AFib), CPR chest compressions, hyperkalemic arrest, and hypoxic sensor noise.
 */

export function synthesizePleth(tBeat, beatDuration, canvasHeight, timeSecs, patient, vitals, activeMeds) {
  const h = typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) ? canvasHeight : 100;
  const isArrest = patient?.isArrest || false;
  const rhythm = patient?.cardiacRhythm || 'normal';
  
  const rr = vitals && typeof vitals.rr === 'number' && Number.isFinite(vitals.rr) ? Math.max(4, vitals.rr) : 12;
  const svr = vitals && typeof vitals.svr === 'number' && Number.isFinite(vitals.svr) ? Math.max(50, vitals.svr) : 1200;
  const map = vitals && typeof vitals.map === 'number' && Number.isFinite(vitals.map) ? Math.max(15, vitals.map) : 90;
  const spo2 = vitals && typeof vitals.spo2 === 'number' && Number.isFinite(vitals.spo2) ? Math.max(0, Math.min(100, vitals.spo2)) : 98;

  // 1. Arrest and CPR compression artifact handling
  if (isArrest) {
    if (patient?.cprActive) {
      // CPR chest compressions generate regular sinusoidal arterial flow pulses
      const cprFreq = 100 / 60; // ~1.67 Hz (100 bpm)
      const cprPhase = timeSecs * Math.PI * 2 * cprFreq;
      const cprWave = Math.sin(cprPhase) * 0.15;
      const noise = (Math.random() - 0.5) * 0.02;
      return h * 0.95 - (cprWave + noise) * h;
    } else {
      // Flatline: zero mechanical output with minor high-frequency electrical/sensor noise
      const noise = (Math.random() - 0.5) * 0.3;
      return h * 0.95 + noise;
    }
  }

  // 2. Left Ventricular Contractility (dP/dt) & Vasoactive drug modulations
  let contractility = 1.0;
  if (patient?.myocardialStunning) {
    contractility -= (patient.myocardialStunning / 100) * 0.65;
  }

  let drugVasoMod = 1.0; // Local vaso-activity in the finger vascular bed
  let inotropyMod = 1.0;
  
  if (activeMeds) {
    const hasEpi = activeMeds.some(m => m.name === 'Epinephrine');
    const hasNorepi = activeMeds.some(m => m.name === 'Norepinephrine');
    const hasPhenylephrine = activeMeds.some(m => m.name === 'Phenylephrine');
    const hasNitro = activeMeds.some(m => m.name === 'Nitroglycerin');
    const hasPropofol = activeMeds.some(m => m.name === 'Propofol');
    const hasBeta = activeMeds.some(m => m.name === 'Esmolol' || m.name === 'Metoprolol');

    // Epinephrine & Norepinephrine cause extreme peripheral vasoconstriction at the finger
    if (hasEpi) { drugVasoMod *= 0.30; inotropyMod += 0.45; }
    if (hasNorepi) { drugVasoMod *= 0.45; inotropyMod += 0.25; }
    if (hasPhenylephrine) { drugVasoMod *= 0.50; }
    if (hasNitro) { drugVasoMod *= 1.30; } // Nitroglycerin is a potent vasodilator
    if (hasPropofol) { drugVasoMod *= 1.15; inotropyMod -= 0.15; }
    if (hasBeta) { inotropyMod -= 0.30; }
  }
  contractility = Math.max(0.35, Math.min(2.0, contractility * inotropyMod));

  // 3. Pulse Transit Time (PTT) Delay & Upstroke Duration
  // Stiffer vessels (high SVR) = faster pulse wave velocity = shorter delay (PTT)
  const pStart = Math.max(0.12, Math.min(0.28, 0.20 - 0.05 * ((svr - 1200) / 1200)));
  const durUpstroke = Math.max(0.08, Math.min(0.32, 0.18 / contractility));

  const p = Math.max(0.0, Math.min(1.0, tBeat / beatDuration));
  const pRel = p - pStart;

  // 4. Waveform Shape Synthesis
  let s = 0;
  if (pRel > 0) {
    if (pRel < durUpstroke) {
      // Systolic upstroke (ventricular ejection phase)
      const upPhase = pRel / durUpstroke;
      s = Math.sin(upPhase * (Math.PI / 2));
    } else {
      // Diastolic runoff & reflective wave (dicrotic notch)
      const pDecay = pRel - durUpstroke;
      // High SVR delays venous runoff; low SVR drains rapidly
      const tau = Math.max(1.8, Math.min(6.0, 3.5 + 1.5 * ((svr - 1200) / 1200)));
      const sBase = Math.exp(-tau * pDecay);

      // Notch delay (tNotch) is shorter in vasoconstriction (faster wave reflection velocity)
      const tNotch = Math.max(0.08, Math.min(0.24, 0.15 - 0.05 * ((svr - 1200) / 1200)));
      // Notch/rebound height (ampNotch) is higher in vasoconstriction (stronger reflections)
      const ampNotch = Math.max(0.01, Math.min(0.25, 0.12 + 0.10 * ((svr - 1200) / 1200)));
      
      let sHump = 0;
      if (pDecay >= tNotch && pDecay < tNotch + 0.15) {
        sHump = ampNotch * Math.sin(((pDecay - tNotch) / 0.15) * Math.PI);
      }
      s = sBase + sHump;
    }
  }
  s = Math.max(0.0, Math.min(1.2, s));

  // 5. Pulsatile Amplitude (Perfusion Index / PI proxy)
  const mapFactor = Math.max(0.15, Math.min(1.2, map / 90));
  const eblRatio = (patient?.ebl || 0) / (patient?.ebv || 5000);
  const volumeFactor = Math.max(0.15, 1.0 - eblRatio * 1.5);
  
  let baseAmp = 0.35; // base percentage of canvas height
  let pulseAmp = baseAmp * Math.pow(1200 / svr, 0.6) * mapFactor * volumeFactor * drugVasoMod;
  
  // Depressed amplitude in hyperkalemic arrhythmias (myocardial depression) or PEA
  if (rhythm === 'widened QRS' || rhythm === 'sine wave') {
    pulseAmp *= 0.35;
  } else if (rhythm === 'pea') {
    pulseAmp *= 0.02; // PEA is pulseless, showing almost flatline (tiny electrical artifact coupling)
  }

  // 6. Respiratory Modulations (Wander & Squeeze)
  const rrFreq = rr / 60;
  const respPhase = timeSecs * Math.PI * 2 * rrFreq;

  // A. Baseline Wander (respiratory venous pooling shift)
  let wanderScale = 1.0;
  if (patient?.ventilationStatus === 'mechanical') wanderScale = 1.4;
  else if (rr > 22) wanderScale = 1.8;
  if (patient?.copd || patient?.restrictive) wanderScale *= 1.3;
  const wander = Math.sin(respPhase) * (h * 0.025) * wanderScale;

  // B. Amplitude Squeeze (PPV / Pulsus Paradoxus)
  let respAmpMod = 1.0;
  if (patient?.ventilationStatus === 'mechanical') {
    // Mechanical positive-pressure ventilation reduces stroke volume during inspiration (PPV)
    const ppv = Math.max(0.04, Math.min(0.48, 0.08 + eblRatio * 0.7));
    respAmpMod = 1.0 - ppv * Math.sin(respPhase);
  } else {
    // Spontaneous breathing distress (Pulsus Paradoxus) decreases stroke volume on deep inhalation
    const isDistressed = rr > 22 || patient?.copd || patient?.restrictive || patient?.bronchospasm || patient?.laryngospasm;
    if (isDistressed) {
      const paradoxus = Math.max(0.0, Math.min(0.35, 0.05 + (rr - 12) * 0.015));
      // Spontaneous inspiration has negative pleural pressure, opposite phase to positive pressure
      respAmpMod = 1.0 - paradoxus * Math.sin(respPhase + Math.PI);
    }
  }

  // 7. Combine & apply high-frequency tracking noise under severe hypoxia
  let finalPulse = s * pulseAmp * h * Math.max(0.1, respAmpMod);
  let y = (h * 0.5 + wander) - finalPulse;

  if (spo2 < 85) {
    const noiseFactor = (85 - spo2) / 85; // up to 1.0 at 0%
    const trackingNoise = (Math.random() - 0.5) * (h * 0.15) * noiseFactor;
    y += trackingNoise;
  }

  return Math.max(2, Math.min(h - 2, y));
}
