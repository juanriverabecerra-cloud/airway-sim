/**
 * Clinical-Grade EtCO2 Capnography Waveform Synthesizer
 * Models the partial pressure of carbon dioxide in exhaled breath cycles,
 * dynamically responding to airway obstruction (bronchospasm/anaphylaxis),
 * neuromuscular blockade recovery (curare clefts), mechanical circuit leaks (cuff leaks),
 * cardiac oscillations (HR-synchronized), patient bucking/coughing,
 * esophageal intubation (transient gastric washout), and absolute apnea.
 */

export function synthesizeEtCo2(
  tBeat,
  beatDuration,
  canvasHeight,
  timeSecs,
  patient,
  vitals,
  activeMeds,
  ieRatio = 2,
  ampScale = 1.0,
  baseScale = 0.0
) {
  const h = typeof canvasHeight === 'number' && Number.isFinite(canvasHeight) ? canvasHeight : 100;
  const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
  const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;

  // 1. Apnea / Disconnection / Zero Respiratory Rate flatline
  const rr = vitals && typeof vitals.rr === 'number' ? vitals.rr : 12;
  const etco2Val = vitals && typeof vitals.etco2 === 'number' ? vitals.etco2 : 40;
  
  // Rebreathing baseline elevation (soda lime exhaustion or incompetent valve)
  let rebreathingOffset = 0;
  if (baseScale > 0) {
    rebreathingOffset = h * 0.25 * baseScale; // rise up to 25% of height
  }
  const baseline = h * 0.95 - rebreathingOffset;

  if (rr === 0 || etco2Val <= 1 || !beatDuration || beatDuration > 50) {
    // Flatline: baseline with minor sensor noise
    const noise = (Math.random() - 0.5) * 0.2;
    return baseline + noise;
  }

  // 2. Esophageal Intubation handling (gastric washout decay)
  const isEsophageal = patient?.tubePosition === 'esophagus';
  if (isEsophageal) {
    // Calculate elapsed time in seconds since the ETT was placed
    const manipTime = patient?.lastAirwayManipulationTime || 0;
    const elapsed = timeSecs - (manipTime / 1000);
    
    // Gastric washout lasts 15 seconds (approx 2-3 mechanical breaths)
    if (elapsed > 0 && elapsed < 15) {
      const decayFactor = Math.max(0, 1 - (elapsed / 15));
      ampScale = ampScale * decayFactor * 0.35; // tiny amplitude decay
    } else {
      // Complete esophageal flatline
      const noise = (Math.random() - 0.5) * 0.2;
      return baseline + noise;
    }
  }

  // Calculate breathing phase timing
  const safeIe = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
  const inspTime = Math.max(0.001, duration * (1 / (1 + safeIe)));
  const expTime = Math.max(0.001, duration - inspTime);

  const peak = baseline - (h * 0.7 * ampScale);

  // 3. INSPIRATION PHASE (Phase IV / Phase 0 to Phase I)
  if (t < inspTime) {
    // Rapid CO2 washout at the beginning of inspiration (normally takes ~0.2 seconds)
    const tWashout = Math.min(0.25, inspTime * 0.4);
    if (t < tWashout) {
      const progress = t / tWashout;
      return peak + progress * (baseline - peak);
    }
    // Stable inspiratory baseline (should be 0 mmHg / baseline)
    return baseline;
  }

  // 4. EXPIRATION PHASE (Phase II to Phase III)
  const tExp = t - inspTime;
  
  // Obstruction factor (bronchospasm, anaphylaxis)
  let obstruction = 0.0;
  if (patient?.bronchospasm) {
    obstruction = 0.75;
  } else if (patient?.anaphylaxisTriggered && !patient?.anaphylaxisTreated) {
    obstruction = 0.95;
  }

  // Normal Expiratory curve function
  const getNormalExpiratoryY = () => {
    // Phase II Upstroke (takes ~0.3 seconds)
    const tUpstroke = Math.min(0.35, expTime * 0.25);
    
    if (tExp < tUpstroke) {
      const progress = tExp / tUpstroke;
      const s = Math.sin(progress * (Math.PI / 2));
      return baseline - s * (baseline - peak);
    } else {
      // Phase III Alveolar Plateau
      const tPlateau = tExp - tUpstroke;
      const plateauDuration = expTime - tUpstroke;
      const progress = plateauDuration > 0.001 ? Math.min(1.0, tPlateau / plateauDuration) : 1.0;
      
      // Normal alveolar plateau has a slight upward slope due to V/Q mismatch
      let plateauY = peak - (progress * h * 0.035);

      // A. Cardiogenic Oscillations
      // Occur under mechanical ventilation, paralytics, and thin/sedated states
      const hasTof = typeof vitals?.tofCount === 'number';
      const isParalyzed = patient?.isParalyzed || (hasTof && vitals.tofCount === 0);
      const isVentilated = patient?.ventilationStatus === 'mechanical';
      const hr = vitals?.hr || 72;
      
      if (isVentilated && isParalyzed && hr > 0) {
        // Frequency is heart rate. Amplitude scales with low chest volume / relaxation
        const hrHz = hr / 60;
        const oscAmp = h * 0.015;
        plateauY += Math.sin(timeSecs * Math.PI * 2 * hrHz) * oscAmp;
      }

      // B. Curare Cleft (Neuromuscular blockade recovery effort)
      // Dip in the latter half of the plateau (~65% through expiration)
      if (isVentilated && hasTof && vitals.tofCount > 0 && vitals.tofCount <= 4) {
        const cleftTime = expTime * 0.65;
        const cleftWidth = expTime * 0.10;
        const cleftDepth = h * 0.12; // deep dip representing diaphragm contraction
        const dist = Math.abs(tExp - cleftTime);
        
        if (dist < cleftWidth * 2) {
          const cleftFactor = Math.exp(-Math.pow(dist / cleftWidth, 2));
          plateauY += cleftFactor * cleftDepth;
        }
      }

      // C. Cuff Leak / Dilution
      // Dilutes peak alveolar gas at the end of exhalation as positive pressure drops
      if (patient?.isCuffDeflated) {
        const leakStart = expTime * 0.35;
        if (tExp > leakStart) {
          const leakProgress = (tExp - leakStart) / (expTime - leakStart);
          const dilution = Math.exp(-3.0 * leakProgress);
          plateauY = baseline - (baseline - plateauY) * dilution;
        }
      }

      // D. Patient Bucking / Coughing
      // Sharp, violent, erratic pressure oscillations
      if (patient?.isBucking) {
        const buckNoise = Math.sin(tExp * 60) * Math.cos(tExp * 25) * (h * 0.08);
        plateauY += buckNoise;
      }

      return plateauY;
    }
  };

  // 5. Final Waveform blending
  if (obstruction > 0) {
    // Obstructive Upstroke (Shark-fin curve)
    // Entire expiration rises as a power curve, removing the clear alpha angle break
    const ratio = Math.max(0.0, Math.min(1.0, tExp / expTime));
    const power = 0.75 - 0.45 * obstruction; // very slow, convex rise
    const sharkFinY = baseline - Math.pow(ratio, power) * (baseline - peak);
    
    const normalY = getNormalExpiratoryY();
    return normalY + obstruction * (sharkFinY - normalY);
  } else {
    return getNormalExpiratoryY();
  }
}
