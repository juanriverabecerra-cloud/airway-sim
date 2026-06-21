/**
 * Chapter 34: Patient Positioning and Associated Risks
 * Data and evaluation routines sourced from Miller's Anesthesia, 9th Edition.
 */

export interface PositionPhysiology {
  id: string;
  name: string;
  preloadChange: string;
  hydrostaticPressureGradient: string;
  complianceImpact: string;
  frcImpact: string;
  cardiovascularSummary: string;
  respiratorySummary: string;
}

export interface NerveInjury {
  id: string;
  nerveName: string;
  closedClaimsPct: string;
  mechanisms: string[];
  riskFactors: string[];
  prevention: string[];
}

export interface PovlOddsRatio {
  factor: string;
  oddsRatio: string;
  pValue: string;
  rationale: string;
}

export interface PositioningManeuver {
  name: string;
  landmarks: string[];
  steps: string[];
  complications: { name: string; rateOrRisk: string }[];
}

export const POSITIONS_DATA: PositionPhysiology[] = [
  {
    id: 'supine',
    name: 'Supine (Dorsal Decubitus)',
    preloadChange: 'Neutral / Well maintained',
    hydrostaticPressureGradient: '0 mmHg (torso and head level)',
    complianceImpact: 'FRC decreases due to cephalad shift of diaphragm',
    frcImpact: 'FRC is 80% of upright baseline',
    cardiovascularSummary: 'Hemodynamic reserve well maintained as body is close to the level of the heart.',
    respiratorySummary: 'Reduced FRC due to diaphragmatic displacement and chest wall contribution decrease.'
  },
  {
    id: 'trendelenburg',
    name: 'Trendelenburg (Head-Down Tilt)',
    preloadChange: 'Transiently increased preload (+9% cardiac output initially, returns to baseline in 10 min)',
    hydrostaticPressureGradient: '+14.8 mmHg at head level (hydrostatic autotransfusion)',
    complianceImpact: 'Decreased compliance (higher airway pressures under positive pressure ventilation)',
    frcImpact: 'FRC is 70% of upright baseline',
    cardiovascularSummary: 'Increases venous return from lower extremities, raising CO transiently. Elevates ICP and IOP.',
    respiratorySummary: 'Cephalad push of abdominal contents reduces FRC and lung compliance. Spontaneous breathing work increases.'
  },
  {
    id: 'rev_trendelenburg',
    name: 'Reverse Trendelenburg (Head-Up Tilt)',
    preloadChange: 'Decreased preload (pooling of blood in lower extremities)',
    hydrostaticPressureGradient: '-14.8 mmHg at Circle of Willis (head level)',
    complianceImpact: 'Increased FRC relative to supine',
    frcImpact: 'FRC is 90% of upright baseline',
    cardiovascularSummary: 'Decreases cerebral perfusion pressure (CPP) and risks systemic hypotension. Requires transducer zeroing at Circle of Willis.',
    respiratorySummary: 'Abdominal contents shift caudad, improving compliance and FRC compared to flat supine.'
  },
  {
    id: 'prone',
    name: 'Prone (Ventral Decubitus)',
    preloadChange: 'Slightly decreased preload (pooling in legs/abdomen)',
    hydrostaticPressureGradient: '0 mmHg (head at heart level)',
    complianceImpact: 'Maintained or improved compliance if abdomen hangs free',
    frcImpact: 'FRC is 85% of upright baseline',
    cardiovascularSummary: 'If abdomen is compressed (e.g. Wilson frame without proper support), IVC compression reduces CO and elevates epidural venous pressure.',
    respiratorySummary: 'Better V/Q matching in posterior/dependent lung segments than supine, provided abdominal excursion is free.'
  },
  {
    id: 'lateral',
    name: 'Lateral Decubitus',
    preloadChange: 'Well maintained unless kidney rest compresses IVC',
    hydrostaticPressureGradient: '0 mmHg',
    complianceImpact: 'Decreased compliance in dependent lung due to weight of mediastinum and abdomen',
    frcImpact: 'FRC is 82% of upright baseline',
    cardiovascularSummary: 'Dependent axilla neurovascular structures are at risk of compression (requires rolls, monitor pulse/pulse oximeter).',
    respiratorySummary: 'Dependent lung is overperfused but underventilated, worsening V/Q mismatch. One-lung ventilation (OLV) accentuates shunt.'
  },
  {
    id: 'lithotomy',
    name: 'Lithotomy',
    preloadChange: 'Increased preload (venous return increases transiently)',
    hydrostaticPressureGradient: 'Local leg MAP decreases 0.78 mmHg per cm elevation above right atrium',
    complianceImpact: 'Decreased compliance (viscera shift cephalad)',
    frcImpact: 'FRC is 72% of upright baseline',
    cardiovascularSummary: 'Leg elevation transiently increases venous return, CO, and ICP/IOP. Severe hip flexion (>90 degrees) can obstruct venous outflow.',
    respiratorySummary: 'Cephalad diaphragmatic shift reduces compliance. Obese or large abdominal masses can obstruct venous return.'
  },
  {
    id: 'sitting',
    name: 'Sitting (Beach Chair)',
    preloadChange: 'Profoundly decreased preload (gravity-driven pooling in lower extremities)',
    hydrostaticPressureGradient: '-29.6 mmHg at Circle of Willis (head level)',
    complianceImpact: 'Improved compliance and FRC compared to supine',
    frcImpact: 'FRC is 100% of upright baseline',
    cardiovascularSummary: 'Significant risk of cerebral ischemia (CPP drops) and Venous Air Embolism (VAE) due to negative pressure in valveless dural veins.',
    respiratorySummary: 'Optimal access to airway, facial edema minimized, and pulmonary mechanics well preserved.'
  }
];

export const NERVES_DATA: NerveInjury[] = [
  {
    id: 'ulnar',
    nerveName: 'Ulnar Nerve',
    closedClaimsPct: '14%',
    mechanisms: ['Compression in the cubital tunnel/postcondylar groove', 'Ischemia', 'Excessive elbow flexion'],
    riskFactors: ['Male sex (thicker retinaculum, less adipose)', 'Elbow flexion', 'Forearm pronation or neutral pressure', 'Prolonged bed rest', 'Very thin or obese body habitus'],
    prevention: [
      'Avoid pressure on Humeral Postcondylar Groove.',
      'Keep hand and forearm supinated or in neutral position (palm facing body).',
      'Avoid elbow flexion beyond 90 degrees.',
      'Use padded armboards.'
    ]
  },
  {
    id: 'brachial_plexus',
    nerveName: 'Brachial Plexus',
    closedClaimsPct: '19%',
    mechanisms: ['Stretch due to long superficial course', 'Compression between clavicle and first rib'],
    riskFactors: ['Arm abduction > 90 degrees', 'Lateral rotation/extension of head', 'Use of shoulder braces or beanbags in Trendelenburg', 'Median sternotomy (asymmetric retraction)'],
    prevention: [
      'Limit arm abduction in supine/prone patients to < 90 degrees.',
      'Keep the head in a neutral midline position.',
      'Avoid shoulder braces and beanbags in steep Trendelenburg (use non-slip mattresses instead).',
      'Axillary roll in lateral decubitus must be placed caudal to the axilla (never inside the axilla).'
    ]
  },
  {
    id: 'common_peroneal',
    nerveName: 'Common Peroneal Nerve',
    closedClaimsPct: '7% (Sciatic and Peroneal combined)',
    mechanisms: ['Compression against metal stirrups or leg supports at the fibular head'],
    riskFactors: ['Candy cane stirrup compression', 'Thin body habitus', 'Prolonged lithotomy duration'],
    prevention: [
      'Avoid pressure on the peroneal nerve at the fibular head.',
      'Pad leg supports and keep candy canes well away from the lateral knee.',
      'Minimize lithotomy time (< 2-3 hours).'
    ]
  },
  {
    id: 'sciatic',
    nerveName: 'Sciatic Nerve',
    closedClaimsPct: '7% (Sciatic and Peroneal combined)',
    mechanisms: ['Stretch by excessive hip flexion and knee extension'],
    riskFactors: ['Steep lithotomy', 'Hamstring stretching beyond comfortable range'],
    prevention: [
      'Avoid excessive hip flexion and knee extension.',
      'Raise and lower both legs simultaneously using two assistants.'
    ]
  },
  {
    id: 'spinal_cord',
    nerveName: 'Spinal Cord & Lumbosacral Roots',
    closedClaimsPct: '25% Spinal Cord / 18% Lumbosacral',
    mechanisms: ['Direct needle trauma', 'Ischemia (hypotension, hematoma)', 'Excessive cervical flexion/extension'],
    riskFactors: ['Regional anesthesia complications', 'Anticoagulant therapy (epidural hematoma)', 'Severe cervical arthritis/kyphosis during positioning'],
    prevention: [
      'Avoid severe cervical spine flexion or extension.',
      'Adhere strictly to anticoagulation guidelines for regional/neuraxial anesthesia.',
      'Maintain adequate perfusion pressures.'
    ]
  }
];

export const POVL_DATA: PovlOddsRatio[] = [
  {
    factor: 'Male Sex',
    oddsRatio: '2.53 (1.35-4.91)',
    pValue: '0.005',
    rationale: 'Male sex exhibits significantly higher risk for ION, potentially due to differences in vascular autoregulation or anatomy.'
  },
  {
    factor: 'Obesity',
    oddsRatio: '2.83 (1.52-5.39)',
    pValue: '0.001',
    rationale: 'Obesity increases venous congestion, intraabdominal pressure, and ocular venous pressures in the prone position.'
  },
  {
    factor: 'Wilson Frame positioning',
    oddsRatio: '4.30 (2.13-8.75)',
    pValue: '<0.001',
    rationale: 'The Wilson frame positions the head lower than the heart and increases abdominal compression, elevating orbital venous pressure.'
  },
  {
    factor: 'Anesthesia duration (per hour)',
    oddsRatio: '1.39 (1.22-1.58)',
    pValue: '<0.001',
    rationale: 'Prolonged duration leads to progressive orbital venous congestion, interstitial edema, and perfusion failure of the optic nerve.'
  },
  {
    factor: 'Estimated blood loss (per 1 L)',
    oddsRatio: '1.34 (1.13-1.61)',
    pValue: '0.001',
    rationale: 'Anemia compromises oxygen delivery to the watershed zones of the optic nerve head, leading to ischemic neuropathy.'
  },
  {
    factor: 'Colloid percentage of non-blood fluid (per 5%)',
    oddsRatio: '0.67 (0.52-0.82)',
    pValue: '<0.001',
    rationale: 'Higher colloid percentages prevent interstitial edema in the optic nerve sheath, acting as a protective factor (OR < 1.0).'
  }
];

export const PROCEDURAL_GROUNDWORK: PositioningManeuver[] = [
  {
    name: 'Supine-to-Prone Logroll',
    landmarks: ['Cervical spine inline alignment', 'Axillary vascular bundle', 'Forehead/malar bones', 'Iliac crests'],
    steps: [
      'Induce anesthesia and secure the endotracheal tube in the supine position.',
      'Disconnect ETT circuit transiently to prevent accidental extubation during roll.',
      'Coordinate surgical team (minimum 4 members, anesthesiologist at head holding inline cervical spine).',
      'Roll patient onto side, then onto stomach on the prone bolsters or spine table (Jackson/Wilson).',
      'Reconnect ETT circuit, verify chest rise, and check bilateral breath sounds.',
      'Place head in neutral support (horseshoe adapter, mirror, or pins), checking that eyes are free of pressure and ears are not folded.',
      'Abduct arms <90 degrees and support on padded armboards with mild elbow flexion.'
    ],
    complications: [
      { name: 'Accidental Extubation', rateOrRisk: 'High morbidity, life-threatening airway loss' },
      { name: 'Direct Eye Compression / CRAO', rateOrRisk: 'Irreversible blindness from external pressure' },
      { name: 'Scalp Laceration / C-Spine injury', rateOrRisk: 'Associated with Mayfield pin slippage or head drop' }
    ]
  },
  {
    name: 'Lithotomy Positioning',
    landmarks: ['Fibular head / Common peroneal nerve', 'Sacroiliac joint', 'Lumbar lordotic curve'],
    steps: [
      'Move patient caudad so hips lie at the break of the table.',
      'Simultaneously raise both legs with two assistants, flexing hips and knees.',
      'Place legs in padded boots or stirrups (e.g. candy canes).',
      'Ensure the leg supports do not press against the lateral aspect of the knee (fibular head).',
      'Lower and remove the foot section of the table, verifying hands are tucked safely away from the hinge point.'
    ],
    complications: [
      { name: 'Common Peroneal Neuropathy', rateOrRisk: 'Foot drop due to compression against stirrup poles' },
      { name: 'Lower Extremity Compartment Syndrome', rateOrRisk: 'Associated with duration > 2-3 hours, raising tissue pressure' },
      { name: 'SI Joint Strain / Back Pain', rateOrRisk: 'Due to asymmetric leg raising or loss of lumbar curvature' }
    ]
  }
];

export function checkPovlRisk(
  patient: { sex: string; bmi: number },
  durationHrs: number,
  eblL: number,
  colloidPct: number,
  useWilsonFrame: boolean
) {
  let score = 0;
  const factors: string[] = [];

  if (patient.sex === 'male') {
    score += 1;
    factors.push('Male Sex');
  }
  if (patient.bmi >= 30) {
    score += 1;
    factors.push('Obesity (BMI >= 30)');
  }
  if (useWilsonFrame) {
    score += 2;
    factors.push('Wilson Frame positioning');
  }
  if (durationHrs > 6) {
    score += 2;
    factors.push(`Prolonged Surgery (${durationHrs.toFixed(1)} hours)`);
  }
  if (eblL >= 1.0) {
    score += 2;
    factors.push(`High Blood Loss (${eblL.toFixed(1)} L)`);
  }
  if (colloidPct < 15) {
    score += 1;
    factors.push(`Low Colloid Ratio (${colloidPct.toFixed(1)}% of nonblood replacement)`);
  }

  let riskLevel: 'low' | 'moderate' | 'high' = 'low';
  if (score >= 6) riskLevel = 'high';
  else if (score >= 3) riskLevel = 'moderate';

  return {
    score,
    factors,
    riskLevel,
    calculatedOddsRatio: Math.exp(0.92 * (patient.sex === 'male' ? 1 : 0) + 1.04 * (patient.bmi >= 30 ? 1 : 0) + 1.45 * (useWilsonFrame ? 1 : 0) + 0.33 * durationHrs)
  };
}
