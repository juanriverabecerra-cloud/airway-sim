/**
 * Clinical-Grade Ventilator Flow and Pressure Waveform Synthesizers
 * Models physical respiratory mechanics dynamically linked to compliance,
 * airway resistance, PEEP, PIP, plateau pressure, and patient states.
 */

/**
 * Synthesizes the Ventilator Flow Waveform (L/min)
 * - VCV: Constant square inspiratory flow
 * - PCV: Exponentially decaying inspiratory flow
 * - Expiratory phase: Exponential decay governed by time constant tau = R * C
 * - Obstruction (laryngospasm): Zero flow flatline
 * - Bucking/coughing: High-frequency chaotic spikes
 * - Cardiac oscillations: Heart rate synchronized ripples on expiration when paralyzed
 */
export function synthesizeVentFlow(
  tBeat,
  beatDuration,
  canvasHeight,
  timeSecs,
  patient,
  vitals,
  activeMeds,
  ieRatio = 2,
  ampScale = 1.0,
  mode = 'vcv'
) {
  const h = typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) ? canvasHeight : 100;
  const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
  const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;

  const mid = h * 0.5;
  const rr = vitals && typeof vitals.rr === 'number' ? vitals.rr : 12;

  // 1. Apnea / Arrest / Zero flow flatline
  if (rr === 0 || !beatDuration || beatDuration > 50) {
    const noise = (Math.random() - 0.5) * 0.2;
    return mid + noise;
  }

  // Calculate breathing phase timing
  const safeIe = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
  const inspTime = Math.max(0.001, duration * (1 / (1 + safeIe)));

  // Retrieve physiological parameters
  const R = vitals && typeof vitals.res === 'number' ? vitals.res : 5;
  const C = vitals && typeof vitals.compl === 'number' ? vitals.compl : 60;

  // Complete airway occlusion (laryngospasm) results in a flatline
  if (patient?.laryngospasm || R >= 900) {
    const noise = (Math.random() - 0.5) * 0.1;
    return mid + noise;
  }

  // Time constant tau = R * C (in seconds, converting C from mL to L)
  const tau = Math.max(0.12, Math.min(4.0, R * (C / 1000)));

  // Peak inspiratory flow amplitude scales with ventilation parameters
  const flowAmp = h * 0.35 * ampScale;

  // 2. INSPIRATION PHASE (Gas flow into lung: upward deflection on canvas)
  if (t < inspTime) {
    let yVal;
    if (mode === 'vcv') {
      // VCV: Constant flow rate
      yVal = mid - flowAmp;
    } else {
      // PCV: Decelerating flow rate
      yVal = mid - flowAmp * Math.exp(-t / tau);
    }

    // Spontaneous bucking artifact
    if (patient?.isBucking) {
      const buckNoise = Math.sin(t * 60) * Math.cos(timeSecs * 25) * (h * 0.08);
      yVal += buckNoise;
    }

    return yVal;
  }

  // 3. EXPIRATION PHASE (Passive gas exhalation: downward deflection)
  const tExp = t - inspTime;

  // Peak Expiratory Flow Rate (PEFR) restricted by increased resistance R
  const flowRestriction = 10 / (R + 5);
  const peakExh = flowAmp * 1.8 * flowRestriction;

  // Passive recoil decay governed by tau = R * C
  let yVal = mid + peakExh * Math.exp(-tExp / tau);

  // Spontaneous bucking artifact
  if (patient?.isBucking) {
    const buckNoise = Math.sin(tExp * 60) * Math.cos(timeSecs * 25) * (h * 0.08);
    yVal += buckNoise;
  }

  // Cardiogenic oscillations: thin/paralyzed/ventilated heart-lung interactions
  const hasTof = typeof vitals?.tofCount === 'number';
  const isParalyzed = patient?.isParalyzed || (hasTof && vitals.tofCount === 0);
  const hr = vitals?.hr || 72;
  if (isParalyzed && hr > 0) {
    const hrHz = hr / 60;
    const oscAmp = h * 0.012 * Math.exp(-tExp / tau); // decays as exhalation volume empties
    yVal += Math.sin(timeSecs * Math.PI * 2 * hrHz) * oscAmp;
  }

  return yVal;
}

/**
 * Synthesizes the Ventilator Pressure Waveform (Paw cmH2O)
 * - VCV: Linear pressure rise with resistive step-up, dropping to Plateau pressure, then exponential decay to PEEP
 * - PCV: Exponential pressure rise to PIP, holding, then decay to PEEP
 * - Laryngospasm: Pressure hits peak safety limits
 * - Bucking/coughing: High-amplitude pressure spikes
 */
export function synthesizeVentPressure(
  tBeat,
  beatDuration,
  canvasHeight,
  timeSecs,
  patient,
  vitals,
  activeMeds,
  ieRatio = 2,
  ampScale = 1.0,
  baseScale = 0.0,
  mode = 'vcv'
) {
  const h = typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) ? canvasHeight : 100;
  const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
  const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;

  const rr = vitals && typeof vitals.rr === 'number' ? vitals.rr : 12;

  // Retrive clinical pressure targets
  const pipVal = vitals && typeof vitals.pip === 'number' ? vitals.pip : 20;
  const pplatVal = vitals && typeof vitals.pplat === 'number' ? vitals.pplat : 15;

  // Pressure baseline (PEEP) and peak (PIP) scales
  const peepY = h * 0.9 - (h * 0.35 * baseScale);
  const pipY = peepY - (h * 0.55 * ampScale);

  // Apnea / Disconnected state flatline
  if (rr === 0 || !beatDuration || beatDuration > 50) {
    const noise = (Math.random() - 0.5) * 0.2;
    return peepY + noise;
  }

  // Calculate breathing phase timing
  const safeIe = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
  const inspTime = Math.max(0.001, duration * (1 / (1 + safeIe)));

  // Retrieve physiological parameters
  const R = vitals && typeof vitals.res === 'number' ? vitals.res : 5;
  const C = vitals && typeof vitals.compl === 'number' ? vitals.compl : 60;
  const tau = Math.max(0.12, Math.min(4.0, R * (C / 1000)));

  // Airway occlusion (laryngospasm): pressure maxes out at safety limit
  if (patient?.laryngospasm || R >= 900) {
    const noise = (Math.random() - 0.5) * 0.2;
    if (t < inspTime) {
      return pipY + noise;
    } else {
      // Pressure decays very slowly since expiration gas pathways are blocked
      return pipY + (peepY - pipY) * Math.exp(-(t - inspTime) / 1.5) + noise;
    }
  }

  // 1. INSPIRATION PHASE
  if (t < inspTime) {
    let yVal;
    if (mode === 'vcv') {
      // VCV: Resistive step + linear rise to PIP
      const stepFraction = Math.min(0.5, 0.15 + (R / 60) * 0.35); 
      const stepY = peepY - (peepY - pipY) * stepFraction;

      const progress = t / inspTime;
      yVal = stepY + progress * (pipY - stepY);
    } else {
      // PCV: Rapid exponential rise to constant PIP pressure
      const riseTau = 0.08;
      yVal = pipY + (peepY - pipY) * Math.exp(-t / riseTau);
    }

    // Bucking artifact
    if (patient?.isBucking) {
      const buckNoise = Math.sin(t * 45) * Math.cos(timeSecs * 25) * (h * 0.08);
      yVal += buckNoise;
    }

    return yVal;
  }

  // 2. EXPIRATION PHASE
  const tExp = t - inspTime;
  let yVal;

  if (mode === 'vcv') {
    // VCV: Drop instantly to Plateau pressure (elastic recoil only), then decay to PEEP
    const platY = peepY - (peepY - pipY) * (pplatVal / (pipVal || 1));
    yVal = peepY + (platY - peepY) * Math.exp(-tExp / tau);
  } else {
    // PCV: Decay exponentially from PIP to PEEP
    yVal = peepY + (pipY - peepY) * Math.exp(-tExp / tau);
  }

  // Bucking artifact
  if (patient?.isBucking) {
    const buckNoise = Math.sin(tExp * 45) * Math.cos(timeSecs * 25) * (h * 0.08);
    yVal += buckNoise;
  }

  return yVal;
}
