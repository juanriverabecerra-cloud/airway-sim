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
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      let y = safeBase;
      if (p < 0.1) y = safeBase - Math.sin((p / 0.1) * Math.PI) * (safeH * 0.12);
      else if (p > 0.12 && p < 0.14) y = safeBase + ((p - 0.12) / 0.02) * (safeH * 0.1); 
      else if (p >= 0.14 && p < 0.17) y = (safeBase + safeH * 0.1) - ((p - 0.14) / 0.03) * (safeH * 0.7); 
      else if (p >= 0.17 && p < 0.2) y = (safeBase - safeH * 0.6) + ((p - 0.17) / 0.03) * (safeH * 0.6); 
      else if (p > 0.35 && p < 0.6) y = safeBase - Math.sin(((p - 0.35) / 0.25) * Math.PI) * (safeH * 0.22);
      return y;
    },
    vfib: (tBeat, beatDuration, h, base, time) => {
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;
      const safeTime = typeof time === 'number' && Number.isFinite(time) ? time : 0.0;

      const noise = (Math.random() * 0.5) + 0.5;
      return safeBase - 
             Math.sin(safeTime / 70) * (safeH * 0.25) * noise - 
             Math.cos(safeTime / 25) * (safeH * 0.2) * noise + 
             Math.sin(safeTime / 110) * (safeH * 0.15);
    },
    vtach: (tBeat, beatDuration, h, base) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      return safeBase - Math.sin(p * Math.PI * 2) * (safeH * 0.45);
    },
    st_elevation: (tBeat, beatDuration, h, base) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      let y = safeBase;
      if (p < 0.1) y = safeBase - Math.sin((p / 0.1) * Math.PI) * (safeH * 0.12);
      else if (p > 0.12 && p < 0.14) y = safeBase + ((p - 0.12) / 0.02) * (safeH * 0.1);
      else if (p >= 0.14 && p < 0.17) y = (safeBase + safeH * 0.1) - ((p - 0.14) / 0.03) * (safeH * 0.7);
      else if (p >= 0.17 && p < 0.2) y = (safeBase - safeH * 0.6) + ((p - 0.17) / 0.03) * (safeH * 0.3); 
      else if (p >= 0.2 && p < 0.6) y = (safeBase - safeH * 0.3) - Math.sin(((p - 0.2) / 0.4) * Math.PI) * (safeH * 0.2); 
      return y;
    }
  },
  
  aline: {
    normal: (tBeat, beatDuration, h, base) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      const A = safeH * 0.50; 
      const sysPeak = safeBase - A;
      const notchLevel = safeBase - A * 0.55;

      if (p < 0.15) {
        return safeBase - A * Math.sin((p / 0.15) * (Math.PI / 2));
      } else if (p < 0.35) {
        const pPhase = (p - 0.15) / 0.20;
        return sysPeak + pPhase * (notchLevel - sysPeak);
      } else if (p < 0.45) {
        return notchLevel - Math.sin(((p - 0.35) / 0.10) * Math.PI) * (A * 0.12);
      } else {
        const pPhase = p - 0.45;
        return safeBase - (safeBase - notchLevel) * Math.exp(-pPhase * 4);
      }
    },
    underdamped: (tBeat, beatDuration, h, base) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      const A = safeH * 0.60; 
      const sysPeak = safeBase - A;
      const notchLevel = safeBase - A * 0.50;

      if (p < 0.10) {
        return safeBase - A * Math.sin((p / 0.10) * (Math.PI / 2));
      } else if (p < 0.30) {
        const pPhase = (p - 0.10) / 0.20;
        const baselineDecline = sysPeak + pPhase * (notchLevel - sysPeak);
        const ringing = Math.sin((p - 0.10) * 80) * (A * 0.15) * Math.exp(-(p - 0.10) * 8);
        return baselineDecline - ringing;
      } else if (p < 0.40) {
        return notchLevel - Math.sin(((p - 0.30) / 0.10) * Math.PI) * (A * 0.20);
      } else {
        const pPhase = p - 0.40;
        const runoff = safeBase - (safeBase - notchLevel) * Math.exp(-pPhase * 4);
        const ringing = Math.sin(pPhase * 60) * (A * 0.05) * Math.exp(-pPhase * 6);
        return runoff - ringing;
      }
    },
    overdamped: (tBeat, beatDuration, h, base) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      const A = safeH * 0.35; 
      const sysPeak = safeBase - A;

      if (p < 0.25) {
        return safeBase - A * Math.sin((p / 0.25) * (Math.PI / 2));
      } else {
        const pPhase = p - 0.25;
        return safeBase - (safeBase - sysPeak) * Math.exp(-pPhase * 2.5);
      }
    }
  },

  pleth: {
    normal: (tBeat, beatDuration, h, base) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 1.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const p = Math.max(0.0, Math.min(1.0, t / duration));
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 1.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;

      if (p < 0.2) return safeBase;
      else if (p < 0.5) return safeBase - Math.sin(((p - 0.2) / 0.3) * (Math.PI / 2)) * (safeH * 0.45);
      else if (p < 0.6) return (safeBase - safeH * 0.45) + ((p - 0.5) / 0.1) * (safeH * 0.15); 
      else if (p < 0.65) return (safeBase - safeH * 0.30) - Math.sin(((p - 0.6) / 0.05) * Math.PI) * (safeH * 0.03); 
      else return safeBase - (safeH * 0.30) * Math.exp(-((p - 0.65) / 0.35) * 3); 
    }
  },

  etco2: {
    normal: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 40.0;

      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const expTime = Math.max(0.001, duration - inspTime);
      const tExp = Math.max(0.0, t - inspTime);
      
      const baseline = safeH * 0.9;
      const peak = baseline - (safeH * 0.7 * safeAmpScale); 
      
      if (t < inspTime) {
          if (t < 0.2) return peak + (t / 0.2) * (baseline - peak); 
          return baseline;
      } else {
          if (tExp < 0.3) {
              return baseline - (tExp / 0.3) * (baseline - peak);
          } else {
              const safeExpDenom = Math.max(0.001, expTime - 0.3);
              const plateauProgress = Math.max(0.0, Math.min(1.0, (tExp - 0.3) / safeExpDenom));
              const plateauY = peak - (plateauProgress * safeH * 0.05); 
              const cardioOsc = Math.sin(t * Math.PI * 30) * (safeH * 0.015);
              return plateauY + cardioOsc;
          }
      }
    },
    bronchospasm: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 40.0;

      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const expTime = Math.max(0.001, duration - inspTime);
      const tExp = Math.max(0.0, t - inspTime);
      
      const baseline = safeH * 0.9;
      const peak = baseline - (safeH * 0.7 * safeAmpScale);
      
      if (t < inspTime) {
          if (t < 0.2) return peak + (t / 0.2) * (baseline - peak); 
          return baseline;
      } else {
          const ratio = Math.max(0.0, Math.min(1.0, tExp / expTime));
          const riseProgress = Math.pow(ratio, 0.6); 
          return baseline - (riseProgress * (baseline - peak));
      }
    }
  },

  ventPressure: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1, baseScale = 0) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 20.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;
      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;
      const safeBaseScale = typeof baseScale === 'number' && Number.isFinite(baseScale) ? baseScale : 0.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const peep = safeBase - (safeH * 0.3 * safeBaseScale);
      const peak = peep - (safeH * 0.6 * safeAmpScale);
      if (t < inspTime) return peep - (t / inspTime) * (peep - peak);
      else return peep + (peak - peep) * Math.exp(-(t - inspTime) / 0.3);
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1, baseScale = 0) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 20.0;
      const safeBase = typeof base === 'number' && Number.isFinite(base) ? base : 0.0;
      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;
      const safeBaseScale = typeof baseScale === 'number' && Number.isFinite(baseScale) ? baseScale : 0.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const peep = safeBase - (safeH * 0.3 * safeBaseScale);
      const peak = peep - (safeH * 0.6 * safeAmpScale);
      if (t < inspTime * 0.1) return peep - (t / (inspTime * 0.1)) * (peep - peak);
      else if (t < inspTime) return peak;
      else return peep + (peak - peep) * Math.exp(-(t - inspTime) / 0.3);
    }
  },

  ventFlow: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 30.0;
      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const mid = safeH * 0.5;
      const flowAmp = safeH * 0.4 * safeAmpScale;
      if (t < inspTime) return mid - flowAmp; 
      else return mid + flowAmp * 2 * Math.exp(-(t - inspTime) / 0.2); 
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 30.0;
      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const mid = safeH * 0.5;
      const flowAmp = safeH * 0.4 * safeAmpScale;
      if (t < inspTime) return mid - (flowAmp * Math.exp(-t / (inspTime * 0.4)));
      else return mid + flowAmp * 2 * Math.exp(-(t - inspTime) / 0.2);
    }
  },

  ventVolume: {
    vcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 500.0;
      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const bottom = safeH * 0.9;
      const top = bottom - (safeH * 0.8 * safeAmpScale);
      if (t < inspTime) return bottom - (t / inspTime) * (bottom - top);
      else return top + (bottom - top) * Math.exp(-(t - inspTime) / 0.5);
    },
    pcv: (tBeat, beatDuration, h, base, time, ieRatio = 2, ampScale = 1) => {
      const duration = typeof beatDuration === 'number' && Number.isFinite(beatDuration) && beatDuration > 0.001 ? beatDuration : 5.0;
      const t = typeof tBeat === 'number' && Number.isFinite(tBeat) && tBeat >= 0 ? tBeat : 0;
      const safeH = typeof h === 'number' && Number.isFinite(h) ? h : 500.0;
      const safeIeRatio = typeof ieRatio === 'number' && Number.isFinite(ieRatio) && ieRatio > 0.01 ? ieRatio : 2.0;
      const safeAmpScale = typeof ampScale === 'number' && Number.isFinite(ampScale) ? ampScale : 1.0;

      const inspTime = Math.max(0.001, duration * (1 / (1 + safeIeRatio)));
      const bottom = safeH * 0.9;
      const top = bottom - (safeH * 0.8 * safeAmpScale);
      if (t < inspTime) return bottom - (1 - Math.exp(-t / (inspTime * 0.3))) * (bottom - top);
      else return top + (bottom - top) * Math.exp(-(t - inspTime) / 0.5);
    }
  }
};