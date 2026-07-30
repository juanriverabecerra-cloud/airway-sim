/**
 * UltrasoundPhysicsEngine.ts
 * Medical-grade physics engine for synthetic ultrasound simulation.
 * Calculates acoustic impedance Z = rho * c, reflection coefficients R,
 * attenuation alpha * f * z, acoustic shadowing, posterior enhancement,
 * and Rayleigh tissue speckle.
 */

export interface TissueProperties {
  id: string;
  name: string;
  density: number; // kg/m^3
  speedOfSound: number; // m/s
  impedance: number; // MRayl = 10^6 kg/(m^2 s)
  attenuation: number; // dB/(cm MHz)
  echogenicity: 'anechoic' | 'hypoechoic' | 'iso-echoic' | 'hyperechoic' | 'calcified';
  baseBrightness: number; // 0.0 (black) to 1.0 (white)
  speckleDensity: number; // 0.0 to 1.0
}

export const TISSUE_CATALOG: Record<string, TissueProperties> = {
  blood: {
    id: 'blood',
    name: 'Blood / Lumen',
    density: 1060,
    speedOfSound: 1570,
    impedance: 1.66,
    attenuation: 0.15,
    echogenicity: 'anechoic',
    baseBrightness: 0.05,
    speckleDensity: 0.02
  },
  fluid: {
    id: 'fluid',
    name: 'Simple Fluid / Local Anesthetic',
    density: 1000,
    speedOfSound: 1480,
    impedance: 1.48,
    attenuation: 0.05,
    echogenicity: 'anechoic',
    baseBrightness: 0.02,
    speckleDensity: 0.01
  },
  fat: {
    id: 'fat',
    name: 'Subcutaneous Fat',
    density: 920,
    speedOfSound: 1450,
    impedance: 1.33,
    attenuation: 0.63,
    echogenicity: 'hypoechoic',
    baseBrightness: 0.25,
    speckleDensity: 0.3
  },
  muscle: {
    id: 'muscle',
    name: 'Skeletal Muscle',
    density: 1040,
    speedOfSound: 1580,
    impedance: 1.64,
    attenuation: 1.09,
    echogenicity: 'iso-echoic',
    baseBrightness: 0.40,
    speckleDensity: 0.5
  },
  fascia: {
    id: 'fascia',
    name: 'Fascial Plane / Sheath',
    density: 1120,
    speedOfSound: 1620,
    impedance: 1.81,
    attenuation: 1.5,
    echogenicity: 'hyperechoic',
    baseBrightness: 0.85,
    speckleDensity: 0.8
  },
  nerve: {
    id: 'nerve',
    name: 'Peripheral Nerve Bundle',
    density: 1070,
    speedOfSound: 1600,
    impedance: 1.71,
    attenuation: 1.2,
    echogenicity: 'hyperechoic',
    baseBrightness: 0.70,
    speckleDensity: 0.75
  },
  artery_wall: {
    id: 'artery_wall',
    name: 'Arterial Intima-Media Wall',
    density: 1090,
    speedOfSound: 1610,
    impedance: 1.75,
    attenuation: 1.4,
    echogenicity: 'hyperechoic',
    baseBrightness: 0.80,
    speckleDensity: 0.6
  },
  bone: {
    id: 'bone',
    name: 'Cortical Bone / Rib',
    density: 1990,
    speedOfSound: 4080,
    impedance: 8.12,
    attenuation: 12.0,
    echogenicity: 'calcified',
    baseBrightness: 1.0,
    speckleDensity: 0.95
  },
  pleura: {
    id: 'pleura',
    name: 'Visceral/Parietal Pleura',
    density: 1050,
    speedOfSound: 1560,
    impedance: 1.64,
    attenuation: 1.1,
    echogenicity: 'hyperechoic',
    baseBrightness: 0.90,
    speckleDensity: 0.85
  },
  lung_air: {
    id: 'lung_air',
    name: 'Aerated Lung',
    density: 1.2,
    speedOfSound: 343,
    impedance: 0.0004,
    attenuation: 40.0,
    echogenicity: 'calcified',
    baseBrightness: 0.95,
    speckleDensity: 0.9
  }
};

export class UltrasoundPhysicsEngine {
  /**
   * Calculates the reflection coefficient (R) between two tissue interfaces.
   * R = ((Z2 - Z1) / (Z2 + Z1))^2
   */
  static calculateReflectionCoefficient(z1: number, z2: number): number {
    if (isNaN(z1) || !Number.isFinite(z1) || isNaN(z2) || !Number.isFinite(z2)) return 0;
    if (z1 <= 0 || z2 <= 0) return 0;
    const numerator = z2 - z1;
    const denominator = z2 + z1;
    if (denominator === 0) return 0;
    const r = numerator / denominator;
    return Math.pow(r, 2);
  }

  /**
   * Calculates the intensity attenuation over depth z (cm) at frequency f (MHz).
   * Attenuation (dB) = alpha * f * z
   * Intensity ratio = 10^(-Attenuation / 20)
   */
  static calculateAttenuationFactor(alpha: number, frequencyMHz: number, depthCm: number): number {
    if (isNaN(alpha) || isNaN(frequencyMHz) || isNaN(depthCm)) return 1.0;
    const safeDepth = Math.max(0, depthCm);
    const safeFreq = Math.max(0.1, frequencyMHz);
    const safeAlpha = Math.max(0, alpha);

    const attenuationDb = safeAlpha * safeFreq * safeDepth;
    return Math.pow(10, -attenuationDb / 20.0);
  }

  /**
   * Computes master gain and Time Gain Compensation (TGC) adjustment.
   * depthFraction: 0.0 (near field) to 1.0 (far field).
   *
   * The three TGC controls anchor the near (0.0), mid (0.5) and far (1.0)
   * depths; the applied gain is a continuous piecewise-linear interpolation
   * between those anchors. This is deliberately monotonic in structure — it
   * must NOT reintroduce the old discontinuity where the deep field snapped
   * back to the mid value at 0.66 (see ultrasound_engine.test regression).
   */
  static calculateGainFactor(
    masterGainDb: number,
    nearTgcDb: number,
    midTgcDb: number,
    farTgcDb: number,
    depthFraction: number
  ): number {
    const safeFraction = Math.max(0.0, Math.min(1.0, isNaN(depthFraction) ? 0.5 : depthFraction));
    const safeGain = isNaN(masterGainDb) ? 0 : masterGainDb;
    const near = isNaN(nearTgcDb) ? 0 : nearTgcDb;
    const mid = isNaN(midTgcDb) ? 0 : midTgcDb;
    const far = isNaN(farTgcDb) ? 0 : farTgcDb;

    // Near half [0.0, 0.5] interpolates near -> mid; far half [0.5, 1.0] mid -> far.
    let tgcDb;
    if (safeFraction <= 0.5) {
      const t = safeFraction / 0.5;
      tgcDb = near * (1 - t) + mid * t;
    } else {
      const t = (safeFraction - 0.5) / 0.5;
      tgcDb = mid * (1 - t) + far * t;
    }

    const totalGainDb = safeGain + tgcDb;
    return Math.pow(10, totalGainDb / 20.0);
  }

  /**
   * Procedural Rayleigh tissue speckle simulator using deterministic pseudo-random hashing.
   */
  static generateSpeckleNoise(x: number, y: number, seed: number = 42): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 137.1) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Calculates acoustic shadow intensity multiplier distal to dense structures.
   */
  static calculateAcousticShadow(
    rayIntersectsBone: boolean,
    rayIntersectsAir: boolean,
    rayIntersectsNeedle: boolean
  ): number {
    if (rayIntersectsBone) return 0.05;
    if (rayIntersectsAir) return 0.02;
    if (rayIntersectsNeedle) return 0.70;
    return 1.0;
  }

  /**
   * Calculates posterior acoustic enhancement multiplier distal to simple fluid structures.
   */
  static calculatePosteriorEnhancement(fluidPathLengthCm: number): number {
    if (isNaN(fluidPathLengthCm) || fluidPathLengthCm <= 0) return 1.0;
    return Math.min(1.4, 1.0 + (fluidPathLengthCm * 0.15));
  }
}
