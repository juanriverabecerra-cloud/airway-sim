/**
 * WAVEFORM SYNTHESIS DATABASE
 * Translates clinical physiology into canvas rendering mathematics.
 */

export const WAVEFORMS = {
  ecg: {
    // Normal Sinus Rhythm (P, Q, R, S, T waves)
    normal: (tBeat, beatDuration, h, base) => {
      let y = base;
      if (tBeat < 100) y = base - Math.sin((tBeat/100)*Math.PI) * (h*0.15); // P wave
      else if (tBeat > 150 && tBeat < 170) y = base + ((tBeat-150)/20)*(h*0.1); // Q wave
      else if (tBeat > 170 && tBeat < 185) y = (base+h*0.1) - ((tBeat-170)/15)*(h*0.7); // R wave
      else if (tBeat > 185 && tBeat < 200) y = (base-h*0.6) + ((tBeat-185)/15)*(h*0.7); // S wave
      else if (tBeat > 230 && tBeat < 380) y = base - Math.sin(((tBeat-230)/150)*Math.PI) * (h*0.25); // T wave
      return y;
    },
    // Ventricular Fibrillation (Chaotic, uncoordinated baseline)
    vfib: (tBeat, beatDuration, h, base, time) => {
      const noise = (Math.random() * 0.4) + 0.6;
      return base - Math.sin(time / 80) * (h * 0.3) * noise - Math.cos(time / 30) * (h * 0.2) * noise;
    },
    // Monomorphic Ventricular Tachycardia (Wide, continuous sawtooth)
    vtach: (tBeat, beatDuration, h, base) => {
      return base - Math.sin((tBeat / beatDuration) * Math.PI * 2) * (h * 0.45);
    },
    // Atrial Fibrillation (No P-waves, fibrillatory baseline, narrow QRS)
    afib: (tBeat, beatDuration, h, base, time) => {
      let y = base + (Math.sin(time/40) * h * 0.05); // Fibrillatory baseline
      if (tBeat > 150 && tBeat < 170) y = base + ((tBeat-150)/20)*(h*0.1); // Q
      else if (tBeat > 170 && tBeat < 185) y = (base+h*0.1) - ((tBeat-170)/15)*(h*0.7); // R
      else if (tBeat > 185 && tBeat < 200) y = (base-h*0.6) + ((tBeat-185)/15)*(h*0.7); // S
      else if (tBeat > 230 && tBeat < 380) y = base - Math.sin(((tBeat-230)/150)*Math.PI) * (h*0.20); // T
      return y;
    }
  },
  
  aline: {
    // Normal A-Line (Steep upstroke, dicrotic notch, diastolic decay)
    normal: (tBeat, beatDuration, h, base) => {
      if (tBeat < beatDuration * 0.15) return base - ((tBeat)/(beatDuration*0.15)) * (h*0.6); // Systolic upstroke
      else if (tBeat < beatDuration * 0.4) return (base - h*0.6) + ((tBeat - beatDuration*0.15)/(beatDuration*0.25)) * (h*0.4); // Decline to notch
      else if (tBeat < beatDuration * 0.45) return (base - h*0.2) - ((tBeat - beatDuration*0.4)/(beatDuration*0.05)) * (h*0.05); // Dicrotic notch
      else return (base - h*0.25) + ((tBeat - beatDuration*0.45)/(beatDuration*0.55)) * (h*0.25); // Diastolic runoff
    },
    // Underdamped A-Line (Overshooting peak, "ringing" artifacts)
    underdamped: (tBeat, beatDuration, h, base) => {
      if (tBeat < beatDuration * 0.1) return base - ((tBeat)/(beatDuration*0.1)) * (h*0.8); // Overshoot peak
      else if (tBeat < beatDuration * 0.3) return (base - h*0.8) + ((tBeat - beatDuration*0.1)/(beatDuration*0.2)) * (h*0.6) - Math.sin(tBeat)*5; // Ringing
      else return (base - h*0.2) + ((tBeat - beatDuration*0.3)/(beatDuration*0.7)) * (h*0.2);
    },
    // Overdamped A-Line (Sluggish rise, no notch, falsely narrow pulse pressure)
    overdamped: (tBeat, beatDuration, h, base) => {
      if (tBeat < beatDuration * 0.3) return base - Math.sin((tBeat/(beatDuration*0.3))*Math.PI/2) * (h*0.4); // Slow, rounded peak
      else return (base - h*0.4) + ((tBeat - beatDuration*0.3)/(beatDuration*0.7)) * (h*0.4); // Smooth decay, no notch
    }
  },

  pleth: {
    normal: (tBeat, beatDuration, h, base) => {
      if (tBeat < beatDuration * 0.3) return base - Math.sin((tBeat/(beatDuration*0.3))*Math.PI/2) * (h*0.5);
      else return (base - h*0.5) + ((tBeat - beatDuration*0.3) / (beatDuration*0.7)) * (h*0.5);
    }
  },

  etco2: {
    // Normal 4-Phase Capnogram
    normal: (phase, baseline, peak, h) => {
      if (phase < 0.1) return baseline; // Phase I: Dead space
      else if (phase < 0.2) return baseline - ((phase - 0.1) / 0.1) * (baseline - peak); // Phase II: Rapid upstroke
      else if (phase < 0.5) return peak + (0.1 - (phase - 0.2) / 0.3 * 0.1) * h; // Phase III: Alveolar plateau
      else if (phase < 0.55) return peak + ((phase - 0.5) / 0.05) * (baseline - peak); // Phase IV: Inspiration
      else return baseline;
    },
    // Bronchospasm / Asthma (Shark Fin)
    bronchospasm: (phase, baseline, peak, h) => {
      if (phase < 0.1) return baseline;
      else if (phase < 0.3) return baseline - ((phase - 0.1) / 0.2) * (baseline - (peak + h*0.2)); // Prolonged, sloped Phase II
      else if (phase < 0.5) return (peak + h*0.2) - ((phase - 0.3) / 0.2) * (h*0.2); // Highly slanted Phase III (Shark fin)
      else if (phase < 0.55) return peak + ((phase - 0.5) / 0.05) * (baseline - peak);
      else return baseline;
    },
    // Curare Cleft (Patient taking spontaneous breaths against the vent)
    curareCleft: (phase, baseline, peak, h) => {
      if (phase < 0.1) return baseline;
      else if (phase < 0.2) return baseline - ((phase - 0.1) / 0.1) * (baseline - peak);
      else if (phase > 0.3 && phase < 0.4) return peak + Math.sin((phase-0.3)/0.1 * Math.PI) * (h*0.2); // THE CLEFT (dip in plateau)
      else if (phase < 0.5) return peak + (0.1 - (phase - 0.2) / 0.3 * 0.1) * h;
      else if (phase < 0.55) return peak + ((phase - 0.5) / 0.05) * (baseline - peak);
      else return baseline;
    }
  }
};