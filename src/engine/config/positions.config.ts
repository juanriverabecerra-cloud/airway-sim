export interface PositionProfile {
  name: string;
  frcFactor: number;
  frcMod: number; // baseline additive or multiplicative modifier
  preloadMod: number; // intravascular volume equivalent offset in mL
  hydrostaticMod: number; // cerebral MAP pressure drop in mmHg due to height above heart
  complianceFactor: number; // lung compliance multiplier
  rationale: string;
  workspaceMod?: number; // baseline workspace accessibility modifier
}

export const POSITIONS_CONFIG: Record<string, PositionProfile> = {
  'Sitting': {
    name: 'Sitting / Beach Chair',
    frcFactor: 1.00,
    frcMod: 0.5,
    preloadMod: -400,
    hydrostaticMod: -29.6,
    complianceFactor: 1.0,
    rationale: 'Maximal diaphragmatic excursion, optimized baseline FRC. Venous pooling in lower extremities reduces preload.'
  },
  'Ramped': {
    name: 'Ramped',
    frcFactor: 0.90,
    frcMod: 0.3,
    preloadMod: -200,
    hydrostaticMod: -14.8,
    complianceFactor: 1.0,
    rationale: 'Improved chest wall compliance in obese subjects by unloading thoracic weight.'
  },
  'Rev Trendelenburg': {
    name: 'Reverse Trendelenburg',
    frcFactor: 0.90,
    frcMod: 0.3,
    preloadMod: -200,
    hydrostaticMod: -14.8,
    complianceFactor: 1.0,
    rationale: 'Diaphragmatic displacement shifted caudally, relieving compression from abdominal organs.'
  },
  'Supine': {
    name: 'Supine / Sniffing',
    frcFactor: 0.80,
    frcMod: 0,
    preloadMod: 0,
    hydrostaticMod: 0,
    complianceFactor: 1.0,
    rationale: 'Abdominal contents push cephalad, reducing FRC by 20% compared to upright.'
  },
  'Sniffing': {
    name: 'Sniffing',
    frcFactor: 0.80,
    frcMod: 0,
    preloadMod: 0,
    workspaceMod: 0, // baseline placeholder
    hydrostaticMod: 0,
    complianceFactor: 1.0,
    rationale: 'Standard pre-induction position. Aligns oral, pharyngeal, and laryngeal axes.'
  },
  'Prone': {
    name: 'Prone',
    frcFactor: 0.85,
    frcMod: 0.2,
    preloadMod: -100,
    hydrostaticMod: 0,
    complianceFactor: 1.0,
    rationale: 'Relieves cardiac compression on posterior lung segments, but restricts abdominal excursion if chest rolls are suboptimal.'
  },
  'Lateral': {
    name: 'Lateral Decubitus',
    frcFactor: 0.82,
    frcMod: -0.1,
    preloadMod: 0,
    hydrostaticMod: 0,
    complianceFactor: 1.0,
    rationale: 'Unilateral dependency compression of lower lung, creating ventilation-perfusion mismatch.'
  },
  'Lithotomy': {
    name: 'Lithotomy',
    frcFactor: 0.72,
    frcMod: -0.4,
    preloadMod: 400,
    hydrostaticMod: 0,
    complianceFactor: 1.0,
    rationale: 'Extreme thigh flexion compresses abdominal wall, pushing diaphragm cephalad.'
  },
  'Trendelenburg': {
    name: 'Trendelenburg',
    frcFactor: 0.70,
    frcMod: -0.5,
    preloadMod: 300,
    hydrostaticMod: 14.8,
    complianceFactor: 0.80, // Apply 20% compliance reduction per clinical guidelines
    rationale: 'Cephalad displacement of abdominal viscera restricts FRC by 30% and compresses lungs, spiking peak inspiratory pressures.'
  }
};
