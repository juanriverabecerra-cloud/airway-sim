/**
 * HIGH-FIDELITY WAVEFORM SYNTHESIS DATABASE (V3.3 - CLINICAL GRADE)
 * Logic:
 * - Uses Normalized Phase Calculus (0.0 - 1.0) for HR/RR scalability.
 * - Implements VCV/PCV discrete scalar integration.
 * - EtCO2 and Ventilator waveforms perfectly phase-locked via `inspTime`.
 */

export const WAVEFORMS = {
  ecg: {
    normal: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration; 
      let y = base;
      if (p < 0.1) y = base - Math.sin((p / 0.1) * Math.PI) * (h * 0.12);
      else if (p > 0.12 && p < 0.14) y = base + ((p - 0.12) / 0.02) * (h * 0.1); 
      else if (p >= 0.14 && p < 0.17) y = (base + h * 0.1) - ((p - 0.14) / 0.03) * (h * 0.7); 
      else if (p >= 0.17 && p < 0.2) y = (base - h * 0.6) + ((p - 0.17) / 0.03) * (h * 0.6); 
      else if (p > 0.35 && p < 0.6) y = base - Math.sin(((p - 0.35) / 0.25) * Math.PI) * (h * 0.22);
      return y;
    },
    vfib: (tBeat, beatDuration, h, base, time) => {
      const noise = (Math.random() * 0.5) + 0.5;
      return base - 
             Math.sin(time / 70) * (h * 0.25) * noise - 
             Math.cos(time / 25) * (h * 0.2) * noise + 
             Math.sin(time / 110) * (h * 0.15);
    },
    vtach: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      return base - Math.sin(p * Math.PI * 2) * (h * 0.45);
    },
    st_elevation: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      let y = base;
      if (p < 0.1) y = base - Math.sin((p / 0.1) * Math.PI) * (h * 0.12);
      else if (p > 0.12 && p < 0.14) y = base + ((p - 0.12) / 0.02) * (h * 0.1);
      else if (p >= 0.14 && p < 0.17) y = (base + h * 0.1) - ((p - 0.14) / 0.03) * (h * 0.7);
      else if (p >= 0.17 && p < 0.2) y = (base - h * 0.6) + ((p - 0.17) / 0.03) * (h * 0.3); 
      else if (p >= 0.2 && p < 0.6) y = (base - h * 0.3) - Math.sin(((p - 0.2) / 0.4) * Math.PI) * (h * 0.2); 
      return y;
    }
  },
  
  aline: {
    normal: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      const A = h * 0.50; 
      const sysPeak = base - A;
      const notchLevel = base - A * 0.55;

      if (p < 0.15) {
        return base - A * Math.sin((p / 0.15) * (Math.PI / 2));
      } else if (p < 0.35) {
        const pPhase = (p - 0.15) / 0.20;
        return sysPeak + pPhase * (notchLevel - sysPeak);
      } else if (p < 0.45) {
        return notchLevel - Math.sin(((p - 0.35) / 0.10) * Math.PI) * (A * 0.12);
      } else {
        const pPhase = p - 0.45;
        return base - (base - notchLevel) * Math.exp(-pPhase * 4);
      }
    },
    underdamped: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      const A = h * 0.60; 
      const sysPeak = base - A;
      const notchLevel = base - A * 0.50;

      if (p < 0.10) {
        return base - A * Math.sin((p / 0.10) * (Math.PI / 2));
      } else if (p < 0.30) {
        const pPhase = (p - 0.10) / 0.20;
        const baselineDecline = sysPeak + pPhase * (notchLevel - sysPeak);
        const ringing = Math.sin((p - 0.10) * 80) * (A * 0.15) * Math.exp(-(p - 0.10) * 8);
        return baselineDecline - ringing;
      } else if (p < 0.40) {
        return notchLevel - Math.sin(((p - 0.30) / 0.10) * Math.PI) * (A * 0.20);
      } else {
        const pPhase = p - 0.40;
        const runoff = base - (base - notchLevel) * Math.exp(-pPhase * 4);
        const ringing = Math.sin(pPhase * 60) * (A * 0.05) * Math.exp(-pPhase * 6);
        return runoff - ringing;
      }
    },
    overdamped: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      const A = h * 0.35; 
      const sysPeak = base - A;

      if (p < 0.25) {
        return base - A * Math.sin((p / 0.25) * (Math.PI / 2));
      } else {
        const pPhase = p - 0.25;
        return base - (base - sysPeak) * Math.exp(-pPhase * 2.5);
      }
    }
  },

  pleth: {
    normal: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      if (p < 0.2) return base;
      else if (p < 0.5) return base - Math.sin(((p - 0.2) / 0.3) * (Math.PI / 2)) * (h * 0.45);
      else if (p < 0.6) return (base - h * 0.45) + ((p - 0.5) / 0.1) * (h * 0.15); 
      else if (p < 0.65) return (base - h * 0.30) - Math.sin(((p - 0.6) / 0.05) * Math.PI) * (h * 0.03); 
      else return base - (h * 0.30) * Math.exp(-((p - 0.65) / 0.35) * 3); 
    }
  },

  etco2: {
    normal: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      // Synchronized directly with ventilator logic
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const expTime = beatDuration - inspTime;
      const tExp = tBeat - inspTime;
      
      const baseline = h * 0.9;
      const peak = baseline - (h * 0.7 * ampScale); 
      
      if (tBeat < inspTime) {
          // Inspiration: Fresh gas drops CO2 to baseline
          if (tBeat < 0.2) return peak + (tBeat / 0.2) * (baseline - peak); 
          return baseline;
      } else {
          // Expiration: Alveolar gas reaches sensor
          if (tExp < 0.3) {
              return baseline - (tExp / 0.3) * (baseline - peak);
          } else {
              const plateauProgress = (tExp - 0.3) / (expTime - 0.3);
              const plateauY = peak - (plateauProgress * h * 0.05); // Slight upward slope
              const cardioOsc = Math.sin(tBeat * Math.PI * 30) * (h * 0.015);
              return plateauY + cardioOsc;
          }
      }
    },
    bronchospasm: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const expTime = beatDuration - inspTime;
      const tExp = tBeat - inspTime;
      
      const baseline = h * 0.9;
      const peak = baseline - (h * 0.7 * ampScale);
      
      if (tBeat < inspTime) {
          if (tBeat < 0.2) return peak + (tBeat / 0.2) * (baseline - peak); 
          return baseline;
      } else {
          // Shark fin morphology (obstructive slow rise)
          const riseProgress = Math.pow(tExp / expTime, 0.6); 
          return baseline - (riseProgress * (baseline - peak));
      }
    }
  },

  ventPressure: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1, baseScale = 0) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const peep = base - (h * 0.3 * baseScale);
      const peak = peep - (h * 0.6 * ampScale);
      if (tBeat < inspTime) return peep - (tBeat / inspTime) * (peep - peak);
      else return peep + (peak - peep) * Math.exp(-(tBeat - inspTime) / 0.3);
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1, baseScale = 0) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const peep = base - (h * 0.3 * baseScale);
      const peak = peep - (h * 0.6 * ampScale);
      if (tBeat < inspTime * 0.1) return peep - (tBeat / (inspTime * 0.1)) * (peep - peak);
      else if (tBeat < inspTime) return peak;
      else return peep + (peak - peep) * Math.exp(-(tBeat - inspTime) / 0.3);
    }
  },

  ventFlow: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const mid = h * 0.5;
      const flowAmp = h * 0.4 * ampScale;
      // Square constant flow
      if (tBeat < inspTime) return mid - flowAmp; 
      else return mid + flowAmp * 2 * Math.exp(-(tBeat - inspTime) / 0.2); 
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const mid = h * 0.5;
      const flowAmp = h * 0.4 * ampScale;
      // Decelerating exponential flow
      if (tBeat < inspTime) return mid - (flowAmp * Math.exp(-tBeat / (inspTime * 0.4)));
      else return mid + flowAmp * 2 * Math.exp(-(tBeat - inspTime) / 0.2);
    }
  },

  ventVolume: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const bottom = h * 0.9;
      const top = bottom - (h * 0.8 * ampScale);
      if (tBeat < inspTime) return bottom - (tBeat / inspTime) * (bottom - top);
      else return top + (bottom - top) * Math.exp(-(tBeat - inspTime) / 0.5);
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const bottom = h * 0.9;
      const top = bottom - (h * 0.8 * ampScale);
      if (tBeat < inspTime) return bottom - (1 - Math.exp(-tBeat / (inspTime * 0.3))) * (bottom - top);
      else return top + (bottom - top) * Math.exp(-(tBeat - inspTime) / 0.5);
    }
  }
};