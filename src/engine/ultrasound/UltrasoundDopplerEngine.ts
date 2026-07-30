/**
 * UltrasoundDopplerEngine.ts
 * Computes Color Doppler velocity flow (BART: Blue Away, Red Towards)
 * and Doppler shift frequencies.
 */

const SPEED_OF_SOUND_CM_S = 154000; // 1540 m/s in soft tissue

export interface ColorDopplerResult {
  hasFlow: boolean;
  colorRgb: { r: number; g: number; b: number; a: number };
  velocityCmS: number;
  direction: 'towards' | 'away' | 'none';
}

export class UltrasoundDopplerEngine {
  /**
   * Calculates Doppler velocity shift and BART color mapping.
   * BART rule: Blue Away from transducer, Red Towards transducer.
   * f_d = (2 * f_0 * v * cos(theta)) / c
   */
  static calculateColorDoppler(
    flowVelocityCmS: number, // positive = towards, negative = away
    dopplerAngleDeg: number,
    pulseRepetitionFreqHz: number = 4000,
    transducerFreqMHz: number = 5.0
  ): ColorDopplerResult {
    const angleRad = (dopplerAngleDeg * Math.PI) / 180.0;
    const cosAngle = Math.cos(angleRad);

    // Effective velocity along beam axis
    const axialVelocity = flowVelocityCmS * cosAngle;

    if (Math.abs(axialVelocity) < 1.0) {
      return {
        hasFlow: false,
        colorRgb: { r: 0, g: 0, b: 0, a: 0 },
        velocityCmS: 0,
        direction: 'none'
      };
    }

    // Determine direction and BART color.
    // Nyquist velocity limit: v_max = (PRF * c) / (4 * f0). With the defaults
    // (PRF 4 kHz, f0 5 MHz) this is ~30.8 cm/s; lower probe frequencies raise
    // the aliasing limit, which is why deep cardiac probes tolerate faster flow.
    const isTowards = axialVelocity > 0;
    const absVelocity = Math.abs(axialVelocity);
    const safeFreqHz = Math.max(0.1, transducerFreqMHz) * 1_000_000;
    const maxVelocity = (pulseRepetitionFreqHz * SPEED_OF_SOUND_CM_S) / (4 * safeFreqHz);
    const intensity = Math.min(1.0, absVelocity / maxVelocity);

    let colorRgb = { r: 0, g: 0, b: 0, a: 0.7 };
    if (isTowards) {
      // Red / Yellow (Towards transducer)
      colorRgb.r = 220 + Math.floor(35 * intensity);
      colorRgb.g = Math.floor(180 * intensity);
      colorRgb.b = 20;
    } else {
      // Blue / Cyan (Away from transducer)
      colorRgb.r = 20;
      colorRgb.g = Math.floor(160 * intensity);
      colorRgb.b = 220 + Math.floor(35 * intensity);
    }

    return {
      hasFlow: true,
      colorRgb,
      velocityCmS: Math.round(axialVelocity),
      direction: isTowards ? 'towards' : 'away'
    };
  }
}
