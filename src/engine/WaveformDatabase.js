/**
 * HIGH-FIDELITY WAVEFORM SYNTHESIS DATABASE (V2.1)
 * Logic:
 * - Uses Normalized Phase Calculus (0.0 - 1.0) for HR/RR scalability.
 * - Implements VCV/PCV scalar morphology.
 * - Dual-exponential decay for arterial runoff physics.
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
      if (p < 0.15) return base - (Math.sin((p / 0.15) * (Math.PI / 2)) * (h * 0.6));
      else if (p < 0.4) {
        const pPhase = (p - 0.15) / 0.25;
        return (base - h * 0.6) + (pPhase * (h * 0.35));
      }
      else if (p < 0.45) return (base - h * 0.25) - Math.sin(((p - 0.4) / 0.05) * Math.PI) * (h * 0.05);
      else {
        const pPhase = (p - 0.45) / 0.55;
        return (base - h * 0.25) + (pPhase * (h * 0.25));
      }
    },
    underdamped: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      if (p < 0.1) return base - (p / 0.1) * (h * 0.85); 
      else if (p < 0.3) {
        const ring = Math.sin((p - 0.1) * 100) * (h * 0.1 * Math.exp(-(p - 0.1) * 5));
        return (base - h * 0.85) + ((p - 0.1) / 0.2) * (h * 0.6) + ring;
      }
      else return (base - h * 0.25) + ((p - 0.3) / 0.7) * (h * 0.25);
    }
  },

  pleth: {
    normal: (tBeat, beatDuration, h, base) => {
      const p = tBeat / beatDuration;
      // Pleth lagged slightly behind ECG/ART to simulate peripheral transit time
      if (p < 0.2) return base;
      else if (p < 0.5) return base - Math.sin(((p - 0.2) / 0.3) * (Math.PI / 2)) * (h * 0.45);
      else return (base - h * 0.45) + ((p - 0.5) / 0.5) * (h * 0.45);
    }
  },

  etco2: {
    normal: (phase, baseline, peak, h) => {
      if (phase < 0.15) return baseline;
      else if (phase < 0.25) return baseline - ((phase - 0.15) / 0.1) * (baseline - peak);
      else if (phase < 0.85) return peak + (phase - 0.25) * (h * 0.05);
      else if (phase < 0.9) return peak + ((phase - 0.85) / 0.05) * (baseline - peak);
      else return baseline;
    },
    bronchospasm: (phase, baseline, peak, h) => {
      if (phase < 0.15) return baseline;
      else if (phase < 0.6) return baseline - Math.pow((phase - 0.15) / 0.45, 2.5) * (baseline - peak);
      else if (phase < 0.85) return peak + (phase - 0.6) * (h * 0.1);
      else if (phase < 0.9) return peak + ((phase - 0.85) / 0.05) * (baseline - peak);
      else return baseline;
    }
  },

  ventPressure: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1, baseScale = 0) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const peep = base - (h * 0.3 * baseScale);
      const peak = peep - (h * 0.6 * ampScale);
      if (tBeat < inspTime) return peep - (tBeat / inspTime) * (peep - peak);
      else return peep + (peak - peep) * Math.exp(-(tBeat - inspTime) / 100);
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1, baseScale = 0) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const peep = base - (h * 0.3 * baseScale);
      const peak = peep - (h * 0.6 * ampScale);
      if (tBeat < inspTime * 0.1) return peep - (tBeat / (inspTime * 0.1)) * (peep - peak);
      else if (tBeat < inspTime) return peak;
      else return peep + (peak - peep) * Math.exp(-(tBeat - inspTime) / 100);
    }
  },

  ventFlow: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const mid = h * 0.5;
      const flowAmp = h * 0.4 * ampScale;
      if (tBeat < inspTime) return mid - flowAmp;
      else return mid + flowAmp * 2 * Math.exp(-(tBeat - inspTime) / 80);
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const mid = h * 0.5;
      const flowAmp = h * 0.4 * ampScale;
      if (tBeat < inspTime) return mid - (flowAmp * Math.exp(-tBeat / (inspTime * 0.5)));
      else return mid + flowAmp * 2 * Math.exp(-(tBeat - inspTime) / 80);
    }
  },

  ventVolume: {
    normal: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const inspTime = beatDuration * (1 / (1 + ieRatio));
      const bottom = h * 0.9;
      const top = bottom - (h * 0.8 * ampScale);
      if (tBeat < inspTime) return bottom - (tBeat / inspTime) * (bottom - top);
      else return top + (bottom - top) * (1 - Math.exp(-(tBeat - inspTime) / 150));
    }
  }
};