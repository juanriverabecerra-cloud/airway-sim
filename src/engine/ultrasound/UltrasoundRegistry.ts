/**
 * UltrasoundRegistry.ts
 * Ground-truth database of ultrasound-guided procedures, anatomical landmarks,
 * target coordinates on 2D body maps, probe standards, and machine settings.
 */

export interface UltrasoundProcedureDefinition {
  id: string;
  category: 'vascular' | 'regional_upper' | 'regional_lower' | 'regional_trunk' | 'pocus' | 'tte' | 'tee';
  name: string;
  shortName: string;
  recommendedProbe: 'linear' | 'curvilinear' | 'phased_array' | 'tee_multiplane';
  defaultDepthCm: number;
  defaultFrequencyMHz: number;
  bodyRegion: 'neck' | 'chest' | 'abdomen' | 'arm' | 'groin' | 'leg';
  targetMapPos: { xPercent: number; yPercent: number }; // Target window position on 2D body diagram
  landmarks: string[];
  techniqueSummary: string;
  hydrodissectionTarget?: string;
  complications: string[];
  anestheticChoices?: string[];
  structureOverlays: {
    id: string;
    label: string;
    type: 'artery' | 'vein' | 'nerve' | 'muscle' | 'bone' | 'pleura' | 'fascia' | 'organ';
    xPercent: number; // 0 to 100 on canvas
    yPercent: number; // 0 to 100 on canvas
    radiusPercent: number;
    // Sonographic appearance of nerve tissue. Proximal roots (interscalene) are
    // round HYPOechoic "traffic light" monofascicular circles; more distal
    // plexus/peripheral nerves are HYPERechoic "honeycomb / cluster of grapes".
    echoPattern?: 'hypoechoic_roots' | 'fascicular';
    subStructures?: { label: string; xRel: number; yRel: number }[]; // e.g. C5/C6/C7 roots
  }[];
}

export const ULTRASOUND_PROCEDURES: Record<string, UltrasoundProcedureDefinition> = {
  // === VASCULAR ACCESS ===
  ij_cvc: {
    id: 'ij_cvc',
    category: 'vascular',
    name: 'Internal Jugular Vein Central Line',
    shortName: 'IJ Central Line',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.0,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'neck',
    targetMapPos: { xPercent: 48, yPercent: 35 },
    landmarks: ['Internal Jugular Vein (compressible, non-pulsatile)', 'Common Carotid Artery (medial, thick wall, pulsatile)', 'Sternocleidomastoid Muscle (anterior triangular ceiling)'],
    techniqueSummary: 'Center the IJ vein in transverse view. Advance needle in-plane or out-of-plane under direct visualization. Confirm anterior wall puncture, aspiration of dark venous blood, and guidewire artifact.',
    complications: ['Carotid Artery Puncture', 'Pneumothorax', 'Air Embolism', 'Hematoma'],
    structureOverlays: [
      { id: 'scm', label: 'Sternocleidomastoid M.', type: 'muscle', xPercent: 50, yPercent: 22, radiusPercent: 22 },
      { id: 'ijv', label: 'Internal Jugular Vein', type: 'vein', xPercent: 54, yPercent: 46, radiusPercent: 14 },
      { id: 'carotid', label: 'Carotid Artery', type: 'artery', xPercent: 34, yPercent: 50, radiusPercent: 10 },
      { id: 'vagus', label: 'Vagus Nerve', type: 'nerve', xPercent: 44, yPercent: 54, radiusPercent: 4 }
    ]
  },
  radial_aline: {
    id: 'radial_aline',
    category: 'vascular',
    name: 'Radial Arterial Line',
    shortName: 'Radial A-Line',
    recommendedProbe: 'linear',
    defaultDepthCm: 2.5,
    defaultFrequencyMHz: 12.0,
    bodyRegion: 'arm',
    targetMapPos: { xPercent: 70, yPercent: 65 },
    landmarks: ['Radial Artery (pulsatile, non-compressible lumen)', 'Flexor Carpi Radialis Tendon (medial)', 'Radius Bone (posterior hyperechoic acoustic shadow)'],
    techniqueSummary: 'Place high-frequency linear probe transversely at wrist crease. Identify superficial pulsatile radial artery. Insert 20G catheter-over-needle at 30-45 degree angle in-plane or out-of-plane.',
    complications: ['Arterial Spasm', 'Hematoma', 'Thrombosis', 'Ischemia'],
    structureOverlays: [
      { id: 'radial_art', label: 'Radial Artery', type: 'artery', xPercent: 50, yPercent: 42, radiusPercent: 8 },
      { id: 'radial_vein1', label: 'Paired Vein Superior', type: 'vein', xPercent: 42, yPercent: 38, radiusPercent: 4 },
      { id: 'radial_vein2', label: 'Paired Vein Inferior', type: 'vein', xPercent: 58, yPercent: 38, radiusPercent: 4 },
      { id: 'radius_bone', label: 'Radius Bone (Cortical Shadow)', type: 'bone', xPercent: 25, yPercent: 75, radiusPercent: 20 }
    ]
  },

  // === REGIONAL ANESTHESIA (UPPER EXTREMITY) ===
  interscalene_block: {
    id: 'interscalene_block',
    category: 'regional_upper',
    name: 'Interscalene Brachial Plexus Block',
    shortName: 'Interscalene Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 3.5,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'neck',
    targetMapPos: { xPercent: 60, yPercent: 40 },
    landmarks: ['C5, C6, C7 Nerve Roots (hypoechoic "traffic lights")', 'Anterior Scalene Muscle (medial)', 'Middle Scalene Muscle (lateral)'],
    techniqueSummary: 'Position probe at lateral neck at level of cricoid cartilage (C6). Trace brachial plexus between anterior and middle scalene. Insert needle lateral-to-medial in-plane into interscalene groove.',
    hydrodissectionTarget: 'Subscalene fascial space between C5-C7 nerve roots',
    complications: ['Ipsilateral Phrenic Nerve Palsy (100%)', 'Vertebral Artery Puncture', 'Epidural/Intrathecal Injection', 'Horner Syndrome'],
    anestheticChoices: ['Ropivacaine 0.5% (10-15 mL)', 'Bupivacaine 0.25% (10-15 mL)'],
    structureOverlays: [
      { id: 'ant_scalene', label: 'Anterior Scalene M.', type: 'muscle', xPercent: 30, yPercent: 48, radiusPercent: 18 },
      { id: 'mid_scalene', label: 'Middle Scalene M.', type: 'muscle', xPercent: 70, yPercent: 48, radiusPercent: 20 },
      { id: 'interscalene_plexus', label: 'C5-C7 Nerve Roots (Traffic Light)', type: 'nerve', xPercent: 50, yPercent: 48, radiusPercent: 12, echoPattern: 'hypoechoic_roots', subStructures: [
        { label: 'C5 Root', xRel: -4, yRel: -10 },
        { label: 'C6 Root', xRel: 0, yRel: 0 },
        { label: 'C7 Root', xRel: 4, yRel: 10 }
      ]}
    ]
  },
  supraclavicular_block: {
    id: 'supraclavicular_block',
    category: 'regional_upper',
    name: 'Supraclavicular Brachial Plexus Block',
    shortName: 'Supraclavicular Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 3.0,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'neck',
    targetMapPos: { xPercent: 55, yPercent: 55 },
    landmarks: ['Subclavian Artery (pulsatile, round hypoechoic)', 'First Rib (hyperechoic line with acoustic shadow)', 'Pleura (hyperechoic line lateral/inferior to rib)', 'Brachial Plexus ("bundle of grapes" lateral to artery)'],
    techniqueSummary: 'Place probe in supraclavicular fossa parallel to clavicle. Visualize Subclavian Artery resting on First Rib. Target "corner pocket" lateral to artery and superior to rib.',
    hydrodissectionTarget: 'Corner pocket lateral to Subclavian Artery and deep to plexus sheath',
    complications: ['Pneumothorax', 'Subclavian Artery Puncture', 'Phrenic Nerve Block'],
    anestheticChoices: ['Ropivacaine 0.5% (15-20 mL)', 'Mepivacaine 1.5% (20 mL)'],
    structureOverlays: [
      { id: 'subclavian_art', label: 'Subclavian Artery', type: 'artery', xPercent: 34, yPercent: 52, radiusPercent: 13 },
      { id: 'grapes_plexus', label: 'Brachial Plexus (Grapes)', type: 'nerve', xPercent: 54, yPercent: 44, radiusPercent: 13 },
      { id: 'first_rib', label: 'First Rib (Cortical Shadow)', type: 'bone', xPercent: 45, yPercent: 74, radiusPercent: 22 },
      { id: 'pleura', label: 'Pleural Line', type: 'pleura', xPercent: 78, yPercent: 76, radiusPercent: 16 }
    ]
  },

  // === REGIONAL ANESTHESIA (TRUNK & LOWER EXTREMITY) ===
  tap_block: {
    id: 'tap_block',
    category: 'regional_trunk',
    name: 'Transversus Abdominis Plane (TAP) Block',
    shortName: 'TAP Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.5,
    defaultFrequencyMHz: 8.0,
    bodyRegion: 'abdomen',
    targetMapPos: { xPercent: 30, yPercent: 50 },
    landmarks: ['External Oblique Muscle (superficial layer)', 'Internal Oblique Muscle (middle layer)', 'Transversus Abdominis Muscle (deep layer)', 'Peritoneal Cavity (deep hypoechoic border)'],
    techniqueSummary: 'Place linear probe transversely in mid-axillary line between costal margin and iliac crest. Identify the 3 abdominal muscle layers. Advance needle in-plane into fascia between Internal Oblique and Transversus Abdominis.',
    hydrodissectionTarget: 'Fascial plane between Internal Oblique and Transversus Abdominis',
    complications: ['Intraperitoneal Puncture / Bowel Injury', 'Liver Laceration (Right side)', 'Systemic Local Anesthetic Toxicity'],
    anestheticChoices: ['Bupivacaine 0.25% with Epinephrine (20 mL per side)', 'Exparel / Liposomal Bupivacaine'],
    structureOverlays: [
      { id: 'eo', label: 'External Oblique M.', type: 'muscle', xPercent: 50, yPercent: 22, radiusPercent: 12 },
      { id: 'io', label: 'Internal Oblique M.', type: 'muscle', xPercent: 50, yPercent: 40, radiusPercent: 14 },
      { id: 'tap_fascia', label: 'TAP Fascial Target Plane', type: 'fascia', xPercent: 50, yPercent: 52, radiusPercent: 18 },
      { id: 'ta', label: 'Transversus Abdominis M.', type: 'muscle', xPercent: 50, yPercent: 64, radiusPercent: 12 },
      { id: 'peritoneum', label: 'Peritoneum / Bowel Cavity', type: 'organ', xPercent: 50, yPercent: 82, radiusPercent: 15 }
    ]
  },
  esp_block: {
    id: 'esp_block',
    category: 'regional_trunk',
    name: 'Erector Spinae Plane (ESP) Block',
    shortName: 'ESP Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 5.0,
    defaultFrequencyMHz: 7.0,
    bodyRegion: 'chest',
    targetMapPos: { xPercent: 40, yPercent: 45 },
    landmarks: ['Transverse Process (flat hyperechoic step with acoustic shadow)', 'Erector Spinae Muscle (overlying muscle belly)', 'Trapezius & Rhomboid Muscles (superficial)'],
    techniqueSummary: 'Place probe in sagittal orientation 3 cm lateral to spinous processes at T5 level. Identify square-shaped transverse process. Contact bone with needle tip deep to Erector Spinae muscle and inject to lift muscle off bone.',
    hydrodissectionTarget: 'Deep fascia beneath Erector Spinae muscle and on top of Transverse Process',
    complications: ['Pneumothorax (rare)', 'Local Anesthetic Systemic Toxicity'],
    anestheticChoices: ['Ropivacaine 0.375% (20-30 mL)'],
    structureOverlays: [
      { id: 'esm', label: 'Erector Spinae Muscle', type: 'muscle', xPercent: 50, yPercent: 42, radiusPercent: 20 },
      { id: 'tp', label: 'Transverse Process (Bone Shadow)', type: 'bone', xPercent: 50, yPercent: 72, radiusPercent: 18 }
    ]
  },
  femoral_block: {
    id: 'femoral_block',
    category: 'regional_lower',
    name: 'Femoral Nerve Block / Fascia Iliaca Block',
    shortName: 'Femoral Nerve Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.0,
    defaultFrequencyMHz: 9.0,
    bodyRegion: 'groin',
    targetMapPos: { xPercent: 45, yPercent: 40 },
    landmarks: ['Femoral Artery (round pulsatile structure)', 'Femoral Nerve (hyperechoic triangular structure lateral to artery)', 'Fascia Lata & Fascia Iliaca (double hyperechoic ceiling)'],
    techniqueSummary: 'Identify Femoral Artery in femoral crease. Locate triangular hyperechoic Femoral Nerve lateral to artery beneath Fascia Iliaca. Direct needle lateral-to-medial in-plane under Fascia Iliaca.',
    hydrodissectionTarget: 'Space beneath Fascia Iliaca surrounding Femoral Nerve',
    complications: ['Intravascular Injection into Femoral Artery', 'Nerve Trauma', 'Quadriceps Weakness / Fall Risk'],
    anestheticChoices: ['Ropivacaine 0.5% (15 mL)', 'Bupivacaine 0.25% (20 mL)'],
    structureOverlays: [
      { id: 'fn_art', label: 'Femoral Artery', type: 'artery', xPercent: 38, yPercent: 48, radiusPercent: 12 },
      { id: 'fn_vein', label: 'Femoral Vein', type: 'vein', xPercent: 22, yPercent: 50, radiusPercent: 11 },
      { id: 'fn_nerve', label: 'Femoral Nerve (Hyperechoic Triangle)', type: 'nerve', xPercent: 62, yPercent: 44, radiusPercent: 10 },
      { id: 'fascia_iliaca', label: 'Fascia Iliaca Ceiling', type: 'fascia', xPercent: 52, yPercent: 32, radiusPercent: 22 }
    ]
  },

  // === POCUS & DIAGNOSTIC ULTRASOUND ===
  gastric_pocus: {
    id: 'gastric_pocus',
    category: 'pocus',
    name: 'Gastric Ultrasound (Aspiration Risk Assessment)',
    shortName: 'Gastric US',
    recommendedProbe: 'curvilinear',
    defaultDepthCm: 10.0,
    defaultFrequencyMHz: 3.5,
    bodyRegion: 'abdomen',
    targetMapPos: { xPercent: 50, yPercent: 30 },
    landmarks: ['Gastric Antrum (anterior to pancreas, posterior to left liver lobe)', 'Left Lobe of Liver (superior hypoechoic border)', 'Superior Mesenteric Artery / Aorta (deep vascular landmarks)'],
    techniqueSummary: 'Scan epigastrium in sagittal/parasagittal plane in Supine and Right Lateral Decubitus (RLD) positions. Evaluate antral cross-sectional area (CSA), content (empty target sign vs liquid anechoic vs solid hyperechoic particulate).',
    complications: ['Misinterpretation of Antral Fluid Volume', 'Aspiration Risk Under-estimation'],
    structureOverlays: [
      { id: 'liver_left', label: 'Left Liver Lobe', type: 'organ', xPercent: 50, yPercent: 26, radiusPercent: 20 },
      { id: 'gastric_antrum', label: 'Gastric Antrum (Antrum Target Sign)', type: 'organ', xPercent: 50, yPercent: 56, radiusPercent: 16 },
      { id: 'aorta', label: 'Aorta (Pulsatile)', type: 'artery', xPercent: 50, yPercent: 84, radiusPercent: 11 }
    ]
  },
  lung_pocus: {
    id: 'lung_pocus',
    category: 'pocus',
    name: 'Lung & Pleural Ultrasound',
    shortName: 'Lung US',
    recommendedProbe: 'linear',
    defaultDepthCm: 6.0,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'chest',
    targetMapPos: { xPercent: 35, yPercent: 35 },
    landmarks: ['Rib Shadows (bat sign)', 'Pleural Line (bright hyperechoic horizontal line)', 'A-lines (repetitive horizontal reverberation artifacts)', 'B-lines (vertical laser-like comet tails)'],
    techniqueSummary: 'Scan anterior and lateral chest zones in longitudinal orientation across rib spaces. Look for sliding pleura ("ants marching"), presence of A-lines (normal aeration), B-lines (pulmonary edema), or Lung Point (pathognomonic for Pneumothorax).',
    complications: ['False Positive Pneumothorax in Apnea or Mainstem Intubation'],
    structureOverlays: [
      { id: 'rib1', label: 'Superior Rib (Shadow)', type: 'bone', xPercent: 22, yPercent: 30, radiusPercent: 16 },
      { id: 'rib2', label: 'Inferior Rib (Shadow)', type: 'bone', xPercent: 78, yPercent: 30, radiusPercent: 16 },
      { id: 'pleura_line', label: 'Sliding Pleural Line', type: 'pleura', xPercent: 50, yPercent: 44, radiusPercent: 32 }
    ]
  },
  efast_pocus: {
    id: 'efast_pocus',
    category: 'pocus',
    name: 'eFAST (Focused Assessment with Sonography for Trauma)',
    shortName: 'eFAST Exam',
    recommendedProbe: 'curvilinear',
    defaultDepthCm: 16.0,
    defaultFrequencyMHz: 3.5,
    bodyRegion: 'abdomen',
    targetMapPos: { xPercent: 65, yPercent: 45 },
    landmarks: ['RUQ / Morison\'s Pouch (Hepatorenal recess)', 'LUQ / Splenorenal recess', 'Pelvis / Retrovesical pouch', 'Subxiphoid Cardiac Window'],
    techniqueSummary: 'Perform 4-point abdominal ultrasound search for anechoic free fluid (blood) in dependent anatomical spaces following blunt or penetrating trauma.',
    complications: ['False negative in retroperitoneal bleeding'],
    structureOverlays: [
      { id: 'liver', label: 'Liver', type: 'organ', xPercent: 38, yPercent: 36, radiusPercent: 22 },
      { id: 'kidney', label: 'Right Kidney', type: 'organ', xPercent: 66, yPercent: 56, radiusPercent: 18 },
      { id: 'morisons', label: 'Morison\'s Pouch (Recess)', type: 'fascia', xPercent: 52, yPercent: 46, radiusPercent: 10 }
    ]
  },

  // === ECHOCARDIOGRAPHY (TTE & TEE) ===
  tte_plax: {
    id: 'tte_plax',
    category: 'tte',
    name: 'Transthoracic Echo: Parasternal Long Axis (PLAX)',
    shortName: 'TTE PLAX',
    recommendedProbe: 'phased_array',
    defaultDepthCm: 16.0,
    defaultFrequencyMHz: 2.5,
    bodyRegion: 'chest',
    targetMapPos: { xPercent: 45, yPercent: 40 },
    landmarks: ['Left Ventricle (LV)', 'Right Ventricle (RV anteriorly)', 'Left Atrium (LA)', 'Aortic Valve & Root', 'Mitral Valve (anterior & posterior leaflets)'],
    techniqueSummary: 'Place phased array probe in 3rd-4th intercostal space left parasternal border with index marker pointing to right shoulder. Assess LV size, contractility, mitral/aortic valve motion.',
    complications: ['Poor acoustic window in COPD / Obesity'],
    structureOverlays: [
      { id: 'rv', label: 'Right Ventricle', type: 'organ', xPercent: 45, yPercent: 30, radiusPercent: 15 },
      { id: 'lv', label: 'Left Ventricle', type: 'organ', xPercent: 62, yPercent: 56, radiusPercent: 20 },
      { id: 'la', label: 'Left Atrium', type: 'organ', xPercent: 34, yPercent: 68, radiusPercent: 14 },
      { id: 'ao', label: 'Aortic Root', type: 'artery', xPercent: 38, yPercent: 45, radiusPercent: 11 }
    ]
  },
  tee_me_4ch: {
    id: 'tee_me_4ch',
    category: 'tee',
    name: 'Transesophageal Echo: Mid-Esophageal 4-Chamber (0°)',
    shortName: 'TEE ME 4-Chamber',
    recommendedProbe: 'tee_multiplane',
    defaultDepthCm: 14.0,
    defaultFrequencyMHz: 5.0,
    bodyRegion: 'chest',
    targetMapPos: { xPercent: 50, yPercent: 30 },
    landmarks: ['Left Atrium (top of sector view nearest probe)', 'Right Atrium', 'Left Ventricle (apex facing down)', 'Right Ventricle & Tricuspid Valve', 'Interatrial and Interventricular Septum'],
    techniqueSummary: 'Advance TEE probe to mid-esophageal depth (30-35 cm from incisors) at 0 degree multiplane angle. Comprehensive evaluation of biventricular function, valvular regurgitation, and intracardiac volume.',
    complications: ['Esophageal Perforation (rare)', 'Oropharyngeal Trauma'],
    structureOverlays: [
      { id: 'la_tee', label: 'Left Atrium', type: 'organ', xPercent: 42, yPercent: 28, radiusPercent: 16 },
      { id: 'ra_tee', label: 'Right Atrium', type: 'organ', xPercent: 65, yPercent: 30, radiusPercent: 14 },
      { id: 'lv_tee', label: 'Left Ventricle', type: 'organ', xPercent: 38, yPercent: 65, radiusPercent: 20 },
      { id: 'rv_tee', label: 'Right Ventricle', type: 'organ', xPercent: 68, yPercent: 62, radiusPercent: 15 }
    ]
  },

  // === VASCULAR ACCESS (added coverage) ===
  femoral_cvc: {
    id: 'femoral_cvc',
    category: 'vascular',
    name: 'Femoral Vein Central Line',
    shortName: 'Femoral Central Line',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.0,
    defaultFrequencyMHz: 9.0,
    bodyRegion: 'groin',
    targetMapPos: { xPercent: 42, yPercent: 45 },
    landmarks: ['Common Femoral Vein (medial, compressible, non-pulsatile)', 'Common Femoral Artery (lateral, pulsatile)', 'Below inguinal ligament, above femoral bifurcation', 'NAVEL mnemonic: Nerve-Artery-Vein lateral-to-medial'],
    techniqueSummary: 'Scan common femoral vessels 1-2 cm below the inguinal ligament, proximal to the saphenous junction and arterial bifurcation. Center the compressible medial femoral vein. Puncture with real-time needle visualization; confirm venous (non-pulsatile, dark) return and guidewire in vein.',
    complications: ['Femoral Artery Puncture', 'Retroperitoneal Hemorrhage', 'Catheter-Related Infection (higher at femoral site)', 'Deep Vein Thrombosis'],
    structureOverlays: [
      { id: 'cfv', label: 'Common Femoral Vein', type: 'vein', xPercent: 40, yPercent: 46, radiusPercent: 14 },
      { id: 'cfa', label: 'Common Femoral Artery', type: 'artery', xPercent: 62, yPercent: 48, radiusPercent: 11 }
    ]
  },
  subclavian_cvc: {
    id: 'subclavian_cvc',
    category: 'vascular',
    name: 'Axillary / Subclavian Vein Central Line',
    shortName: 'Subclavian/Axillary Line',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.5,
    defaultFrequencyMHz: 8.0,
    bodyRegion: 'chest',
    targetMapPos: { xPercent: 40, yPercent: 42 },
    landmarks: ['Axillary Vein (compressible, inferomedial)', 'Axillary Artery (pulsatile, superolateral)', 'Pleura (deep hyperechoic line — pneumothorax risk)', 'Second Rib (acoustic shadow)'],
    techniqueSummary: 'Use the infraclavicular axillary vein window (safer than a landmark subclavian stick). Identify the compressible axillary vein lateral to the pleura, with the axillary artery deep/superior. Keep the needle tip in view at all times to avoid the underlying pleura.',
    complications: ['Pneumothorax', 'Axillary/Subclavian Artery Puncture', 'Hemothorax', 'Catheter Malposition'],
    structureOverlays: [
      { id: 'axv', label: 'Axillary Vein', type: 'vein', xPercent: 42, yPercent: 44, radiusPercent: 13 },
      { id: 'axa', label: 'Axillary Artery', type: 'artery', xPercent: 60, yPercent: 38, radiusPercent: 10 },
      { id: 'sc_pleura', label: 'Pleural Line', type: 'pleura', xPercent: 50, yPercent: 78, radiusPercent: 24 }
    ]
  },
  piv_us: {
    id: 'piv_us',
    category: 'vascular',
    name: 'Ultrasound-Guided Peripheral IV',
    shortName: 'US-Guided PIV',
    recommendedProbe: 'linear',
    defaultDepthCm: 2.5,
    defaultFrequencyMHz: 13.0,
    bodyRegion: 'arm',
    targetMapPos: { xPercent: 60, yPercent: 55 },
    landmarks: ['Target deep vein (basilic / cephalic / brachial — compressible)', 'Brachial Artery (pulsatile — avoid)', 'Median Nerve (honeycomb — avoid)', 'Deep fascia'],
    techniqueSummary: 'For difficult access, scan the upper arm in short axis to find a compressible vein 0.3-1.5 cm deep. Distinguish it from the pulsatile brachial artery and adjacent median nerve. Use a long catheter and walk the needle tip to the vein under direct vision.',
    complications: ['Inadvertent Brachial Artery Cannulation', 'Median Nerve Injury', 'Infiltration (catheter too short for depth)', 'Hematoma'],
    structureOverlays: [
      { id: 'piv_vein', label: 'Target Vein (Compressible)', type: 'vein', xPercent: 55, yPercent: 40, radiusPercent: 10 },
      { id: 'piv_art', label: 'Brachial Artery', type: 'artery', xPercent: 40, yPercent: 55, radiusPercent: 8 },
      { id: 'piv_nerve', label: 'Median Nerve', type: 'nerve', xPercent: 62, yPercent: 60, radiusPercent: 7, echoPattern: 'fascicular' }
    ]
  },

  // === REGIONAL ANESTHESIA (UPPER EXTREMITY — added coverage) ===
  infraclavicular_block: {
    id: 'infraclavicular_block',
    category: 'regional_upper',
    name: 'Infraclavicular Brachial Plexus Block',
    shortName: 'Infraclavicular Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 5.0,
    defaultFrequencyMHz: 8.0,
    bodyRegion: 'chest',
    targetMapPos: { xPercent: 45, yPercent: 45 },
    landmarks: ['Axillary Artery (round pulsatile, center)', 'Lateral / Posterior / Medial Cords (around the artery, clock-face)', 'Pectoralis Major & Minor Muscles (superficial)', 'Pleura (deep and medial — pneumothorax risk)'],
    techniqueSummary: 'Place probe parasagittally medial to the coracoid, below the clavicle. Identify the axillary artery deep to pec major/minor with the three cords arranged around it. Advance the needle steeply in-plane to deposit LA posterior to the artery (U-shaped "double-bubble" spread).',
    hydrodissectionTarget: 'Posterior to the axillary artery, encircling all three cords',
    complications: ['Pneumothorax', 'Axillary Vessel Puncture', 'Deep block — steep needle angle reduces tip visibility'],
    anestheticChoices: ['Ropivacaine 0.5% (20-30 mL)', 'Mepivacaine 1.5% (25 mL)'],
    structureOverlays: [
      { id: 'ic_pec_maj', label: 'Pectoralis Major M.', type: 'muscle', xPercent: 50, yPercent: 20, radiusPercent: 22 },
      { id: 'ic_pec_min', label: 'Pectoralis Minor M.', type: 'muscle', xPercent: 50, yPercent: 34, radiusPercent: 16 },
      { id: 'ic_axa', label: 'Axillary Artery', type: 'artery', xPercent: 50, yPercent: 54, radiusPercent: 11 },
      { id: 'ic_lat_cord', label: 'Lateral Cord', type: 'nerve', xPercent: 40, yPercent: 46, radiusPercent: 5, echoPattern: 'fascicular' },
      { id: 'ic_post_cord', label: 'Posterior Cord', type: 'nerve', xPercent: 52, yPercent: 66, radiusPercent: 5, echoPattern: 'fascicular' },
      { id: 'ic_med_cord', label: 'Medial Cord', type: 'nerve', xPercent: 62, yPercent: 56, radiusPercent: 5, echoPattern: 'fascicular' }
    ]
  },
  axillary_block: {
    id: 'axillary_block',
    category: 'regional_upper',
    name: 'Axillary Brachial Plexus Block',
    shortName: 'Axillary Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 3.0,
    defaultFrequencyMHz: 12.0,
    bodyRegion: 'arm',
    targetMapPos: { xPercent: 62, yPercent: 45 },
    landmarks: ['Axillary Artery (central pulsatile)', 'Median (superficial), Ulnar (medial), Radial (deep/posterior) Nerves around artery', 'Musculocutaneous Nerve (separate, in Coracobrachialis)', 'Conjoint tendon of Latissimus/Teres'],
    techniqueSummary: 'Abduct the arm and scan high in the axilla. Identify the axillary artery with the median, ulnar, and radial nerves clustered around it, and the musculocutaneous nerve lying separately in the coracobrachialis. Block each nerve individually — the MCN must be targeted separately.',
    hydrodissectionTarget: 'Perivascular spread around the axillary artery plus separate musculocutaneous nerve deposit',
    complications: ['Intravascular Injection / LAST', 'Missed Musculocutaneous Nerve', 'Nerve Injury', 'Hematoma'],
    anestheticChoices: ['Ropivacaine 0.5% (20 mL total)', 'Mepivacaine 1.5% (20-25 mL)'],
    structureOverlays: [
      { id: 'ax_art', label: 'Axillary Artery', type: 'artery', xPercent: 48, yPercent: 50, radiusPercent: 11 },
      { id: 'ax_median', label: 'Median Nerve', type: 'nerve', xPercent: 42, yPercent: 36, radiusPercent: 5, echoPattern: 'fascicular' },
      { id: 'ax_ulnar', label: 'Ulnar Nerve', type: 'nerve', xPercent: 62, yPercent: 44, radiusPercent: 5, echoPattern: 'fascicular' },
      { id: 'ax_radial', label: 'Radial Nerve', type: 'nerve', xPercent: 52, yPercent: 64, radiusPercent: 5, echoPattern: 'fascicular' },
      { id: 'ax_mcn', label: 'Musculocutaneous N. (Coracobrachialis)', type: 'nerve', xPercent: 26, yPercent: 40, radiusPercent: 6, echoPattern: 'fascicular' }
    ]
  },

  // === REGIONAL ANESTHESIA (TRUNK — added coverage) ===
  rectus_sheath_block: {
    id: 'rectus_sheath_block',
    category: 'regional_trunk',
    name: 'Rectus Sheath Block',
    shortName: 'Rectus Sheath Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 3.5,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'abdomen',
    targetMapPos: { xPercent: 50, yPercent: 45 },
    landmarks: ['Rectus Abdominis Muscle belly', 'Posterior Rectus Sheath (hyperechoic deep border)', 'Peritoneum / bowel (deep, avoid)', 'Inferior Epigastric Vessels (within sheath)'],
    techniqueSummary: 'Scan transversely lateral to the umbilicus over the rectus muscle. Advance the needle in-plane to the plane between the rectus abdominis muscle and the posterior rectus sheath, and hydrodissect that space. Bilateral injections cover the midline (T9-T11) for umbilical/midline incisions.',
    hydrodissectionTarget: 'Plane between rectus abdominis muscle and posterior rectus sheath',
    complications: ['Peritoneal Puncture / Bowel Injury', 'Inferior Epigastric Vessel Injury / Hematoma', 'Local Anesthetic Systemic Toxicity'],
    anestheticChoices: ['Ropivacaine 0.25% (10-15 mL per side)', 'Bupivacaine 0.25% (0.1 mL/kg per side)'],
    structureOverlays: [
      { id: 'rs_rectus', label: 'Rectus Abdominis M.', type: 'muscle', xPercent: 50, yPercent: 38, radiusPercent: 22 },
      { id: 'rs_fascia', label: 'Posterior Rectus Sheath (Target)', type: 'fascia', xPercent: 50, yPercent: 58, radiusPercent: 22 },
      { id: 'rs_peritoneum', label: 'Peritoneum / Bowel', type: 'organ', xPercent: 50, yPercent: 80, radiusPercent: 16 }
    ]
  },
  ql_block: {
    id: 'ql_block',
    category: 'regional_trunk',
    name: 'Quadratus Lumborum (QL) Block',
    shortName: 'QL Block',
    recommendedProbe: 'curvilinear',
    defaultDepthCm: 7.0,
    defaultFrequencyMHz: 5.0,
    bodyRegion: 'abdomen',
    targetMapPos: { xPercent: 30, yPercent: 55 },
    landmarks: ['Quadratus Lumborum Muscle', 'L4 Transverse Process ("Shamrock sign": QL, Psoas, Erector Spinae around the TP)', 'Latissimus Dorsi & Transversus Abdominis aponeurosis', 'Peritoneum / Kidney (avoid)'],
    techniqueSummary: 'Scan the posterolateral flank at L3-L4 to obtain the "shamrock sign" around the transverse process. Deposit LA at the anterolateral border of the QL (QL1), posterior (QL2), or transmuscular (QL3). Provides wider visceral + somatic coverage than a TAP block.',
    hydrodissectionTarget: 'Anterolateral border of the Quadratus Lumborum muscle',
    complications: ['Peritoneal / Renal Puncture', 'Lower Limb Weakness (spread to lumbar plexus)', 'Local Anesthetic Systemic Toxicity', 'Hypotension (paravertebral spread)'],
    anestheticChoices: ['Ropivacaine 0.375% (20-30 mL per side)', 'Bupivacaine 0.25% (20 mL per side)'],
    structureOverlays: [
      { id: 'ql_ta', label: 'Transversus Abdominis Aponeurosis', type: 'fascia', xPercent: 30, yPercent: 40, radiusPercent: 16 },
      { id: 'ql_muscle', label: 'Quadratus Lumborum M.', type: 'muscle', xPercent: 45, yPercent: 55, radiusPercent: 18 },
      { id: 'ql_tp', label: 'L4 Transverse Process (Shamrock)', type: 'bone', xPercent: 62, yPercent: 66, radiusPercent: 16 },
      { id: 'ql_psoas', label: 'Psoas Major M.', type: 'muscle', xPercent: 74, yPercent: 54, radiusPercent: 15 }
    ]
  },

  // === REGIONAL ANESTHESIA (LOWER EXTREMITY — added coverage) ===
  adductor_canal_block: {
    id: 'adductor_canal_block',
    category: 'regional_lower',
    name: 'Adductor Canal Block',
    shortName: 'Adductor Canal Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.0,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'leg',
    targetMapPos: { xPercent: 45, yPercent: 55 },
    landmarks: ['Superficial Femoral Artery (in the canal)', 'Saphenous Nerve (hyperechoic, anterolateral to artery)', 'Sartorius Muscle (roof of canal)', 'Vastus Medialis (lateral) & Adductor Longus/Magnus (medial)'],
    techniqueSummary: 'Scan the mid-medial thigh to find the superficial femoral artery deep to the sartorius muscle. Identify the saphenous nerve anterolateral to the artery. Deposit LA around the artery within the canal — a motor-sparing block that preserves quadriceps strength for knee surgery.',
    hydrodissectionTarget: 'Perivascular space around the superficial femoral artery, deep to Sartorius',
    complications: ['Superficial Femoral Artery Puncture / Intravascular Injection', 'Saphenous Nerve Injury', 'Local Anesthetic Systemic Toxicity'],
    anestheticChoices: ['Ropivacaine 0.5% (10-15 mL)', 'Bupivacaine 0.25% (15 mL)'],
    structureOverlays: [
      { id: 'ac_sartorius', label: 'Sartorius M. (Canal Roof)', type: 'muscle', xPercent: 50, yPercent: 30, radiusPercent: 22 },
      { id: 'ac_sfa', label: 'Superficial Femoral Artery', type: 'artery', xPercent: 48, yPercent: 54, radiusPercent: 10 },
      { id: 'ac_saphenous', label: 'Saphenous Nerve', type: 'nerve', xPercent: 40, yPercent: 46, radiusPercent: 5, echoPattern: 'fascicular' },
      { id: 'ac_sfv', label: 'Femoral Vein (deep)', type: 'vein', xPercent: 56, yPercent: 64, radiusPercent: 9 }
    ]
  },
  sciatic_popliteal_block: {
    id: 'sciatic_popliteal_block',
    category: 'regional_lower',
    name: 'Popliteal Sciatic Nerve Block',
    shortName: 'Popliteal Sciatic Block',
    recommendedProbe: 'linear',
    defaultDepthCm: 4.5,
    defaultFrequencyMHz: 10.0,
    bodyRegion: 'leg',
    targetMapPos: { xPercent: 50, yPercent: 60 },
    landmarks: ['Sciatic Nerve bifurcation into Tibial + Common Peroneal (superficial to vessels)', 'Popliteal Artery (deep, pulsatile)', 'Popliteal Vein (between nerve and artery)', 'Biceps Femoris (lateral) & Semimembranosus/Semitendinosus (medial)'],
    techniqueSummary: 'Scan the popliteal fossa and trace the sciatic nerve proximally to just above where it splits into the tibial and common peroneal nerves. Deposit LA within the common paraneural (Vloka) sheath so it surrounds both divisions before they diverge.',
    hydrodissectionTarget: 'Common paraneural sheath surrounding the tibial + common peroneal divisions',
    complications: ['Nerve Injury / Intraneural Injection', 'Popliteal Vessel Puncture', 'Incomplete Block (injection distal to bifurcation)'],
    anestheticChoices: ['Ropivacaine 0.5% (20-30 mL)', 'Bupivacaine 0.5% (20 mL)'],
    structureOverlays: [
      { id: 'pop_tibial', label: 'Tibial Nerve', type: 'nerve', xPercent: 44, yPercent: 40, radiusPercent: 7, echoPattern: 'fascicular' },
      { id: 'pop_peroneal', label: 'Common Peroneal Nerve', type: 'nerve', xPercent: 60, yPercent: 42, radiusPercent: 6, echoPattern: 'fascicular' },
      { id: 'pop_vein', label: 'Popliteal Vein', type: 'vein', xPercent: 50, yPercent: 60, radiusPercent: 9 },
      { id: 'pop_artery', label: 'Popliteal Artery', type: 'artery', xPercent: 50, yPercent: 76, radiusPercent: 9 }
    ]
  }
};

export type UltrasoundCategory = UltrasoundProcedureDefinition['category'];

/** Human-readable labels + display order for procedure categories (drives the UI dropdown). */
export const ULTRASOUND_CATEGORY_LABELS: { key: UltrasoundCategory; label: string }[] = [
  { key: 'vascular', label: 'Vascular Access' },
  { key: 'regional_upper', label: 'Regional — Upper Extremity' },
  { key: 'regional_trunk', label: 'Regional — Trunk' },
  { key: 'regional_lower', label: 'Regional — Lower Extremity' },
  { key: 'pocus', label: 'POCUS & Diagnostics' },
  { key: 'tte', label: 'Echocardiography (TTE)' },
  { key: 'tee', label: 'Echocardiography (TEE)' }
];

/**
 * Groups every registered procedure by category, in the display order above.
 * The procedure dropdown is rendered from this so a menu entry can never
 * reference an id that is missing from ULTRASOUND_PROCEDURES (the old
 * `femoral_cvc` dead-option class of bug is now impossible by construction).
 */
export function getProceduresGroupedByCategory(): {
  key: UltrasoundCategory;
  label: string;
  procedures: UltrasoundProcedureDefinition[];
}[] {
  return ULTRASOUND_CATEGORY_LABELS.map(({ key, label }) => ({
    key,
    label,
    procedures: Object.values(ULTRASOUND_PROCEDURES).filter((p) => p.category === key)
  })).filter((group) => group.procedures.length > 0);
}
