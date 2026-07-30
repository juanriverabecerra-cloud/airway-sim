import React, { useState } from 'react';

/**
 * Open-access reference source libraries where real, properly-licensed clinical
 * ultrasound clips can be obtained. `commercialSafe` matters because AirwaySim is
 * heading toward commercial release: CC-BY-4.0 material is reusable with
 * attribution, but CC-BY-NC / NC-SA and research-use-only datasets are NOT and
 * must never be embedded into the shipping product without a separate license.
 *   'yes'   — attribution-only (e.g. CC BY 4.0), commercial reuse permitted
 *   'no'    — non-commercial or research-use-only, NOT shippable commercially
 *   'mixed' — aggregator; license varies per dataset, filter before reuse
 */
export const ULTRASOUND_MEDIA_SOURCES = [
  {
    id: 'pocus_atlas',
    name: 'The POCUS Atlas',
    description: 'Large peer-reviewed, open-access library of clinical ultrasound clips: regional blocks, eFAST, lung, cardiac, and vascular access.',
    license: 'CC BY-NC-SA 4.0',
    commercialSafe: 'no',
    url: 'https://www.thepocusatlas.com/'
  },
  {
    id: 'nidus',
    name: 'NIDUS Lab — Ultrasound Open Access Datasets',
    description: 'Curated directory of annotated open-access ultrasound datasets, filterable by modality and license.',
    license: 'Directory (per-dataset)',
    commercialSafe: 'mixed',
    url: 'https://ultrasound-open-access.nidusai.ca/'
  },
  {
    id: 'radoss',
    name: 'RadOSS (Radiology Open Source)',
    description: 'Open, annotated imaging datasets (e.g. Open Hip Dysplasia) released under attribution licenses suitable for reuse.',
    license: 'CC BY 4.0',
    commercialSafe: 'yes',
    url: 'https://github.com/radoss-org'
  },
  {
    id: 'zenodo',
    name: 'Zenodo',
    description: 'Open research repository hosting peripheral-nerve-block, vascular, and gastric ultrasound datasets; many under CC BY 4.0.',
    license: 'Per-dataset (CC BY 4.0 subset)',
    commercialSafe: 'mixed',
    url: 'https://zenodo.org/'
  },
  {
    id: 'mendeley',
    name: 'Mendeley Data',
    description: 'Open-access data repository with annotated ultrasound datasets; many peripheral-nerve and vascular sets under CC BY 4.0.',
    license: 'Per-dataset (CC BY 4.0 subset)',
    commercialSafe: 'mixed',
    url: 'https://data.mendeley.com/'
  },
  {
    id: 'monai',
    name: 'MONAI Clinical Ultrasound Repository (AWS Open Data)',
    description: '~2,000 clinical studies spanning abdominal, cardiac, and OB/GYN exams for AI development.',
    license: 'CC BY-NC 4.0',
    commercialSafe: 'no',
    url: 'https://registry.opendata.aws/clinical-ultrasound-image-data/'
  }
];

const SOURCE_BY_ID = Object.fromEntries(ULTRASOUND_MEDIA_SOURCES.map((s) => [s.id, s]));

/**
 * Annotated reference entries. The in-app viewport shows a SCHEMATIC teaching
 * illustration (not a captured clinical scan); `sourceId` points to the
 * open-access library where the corresponding real, licensed clip can be found.
 */
export const ULTRASOUND_MEDIA_CLIPS = [
  {
    id: 'clip_interscalene',
    title: 'Interscalene Brachial Plexus (C5-C7)',
    category: 'regional_upper',
    procedureId: 'interscalene_block',
    description: 'Interscalene groove with hypoechoic C5, C6, C7 nerve roots stacked like a "traffic light / stoplight" between the hyperechoic Anterior Scalene (medial) and Middle Scalene (lateral) muscles.',
    landmarks: ['C5, C6, C7 Roots', 'Anterior Scalene M.', 'Middle Scalene M.', 'Carotid Artery (medial)'],
    probeType: 'Linear (10-12 MHz)',
    sourceId: 'nidus',
    sourceNote: 'See also the Kaggle Ultrasound Nerve Segmentation set (11k+ brachial plexus scans) — verify its competition license before any reuse.'
  },
  {
    id: 'clip_supraclavicular',
    title: 'Supraclavicular "Corner Pocket"',
    category: 'regional_upper',
    procedureId: 'supraclavicular_block',
    description: 'Subclavian Artery resting on the hyperechoic 1st Rib shadow, with the brachial plexus "cluster of grapes" positioned posterolateral to the artery (the "corner pocket").',
    landmarks: ['Subclavian Artery', '1st Rib (Shadow)', 'Brachial Plexus Grapes', 'Pleural Line'],
    probeType: 'Linear (10 MHz)',
    sourceId: 'pocus_atlas'
  },
  {
    id: 'clip_ij_cvc',
    title: 'Internal Jugular Vein & Carotid Artery',
    category: 'vascular',
    procedureId: 'ij_cvc',
    description: 'Transverse neck: large, thin-walled, easily compressible Internal Jugular Vein anterolateral to the round, thick-walled, pulsatile Common Carotid Artery beneath the Sternocleidomastoid.',
    landmarks: ['Internal Jugular Vein', 'Common Carotid Artery', 'Sternocleidomastoid M.', 'Vagus Nerve'],
    probeType: 'Linear (10 MHz)',
    sourceId: 'nidus'
  },
  {
    id: 'clip_radial_aline',
    title: 'Radial Artery & Paired Veins',
    category: 'vascular',
    procedureId: 'radial_aline',
    description: 'Superficial pulsatile Radial Artery flanked by paired venae comitantes, directly anterior to the radius bone cortical acoustic shadow at the wrist.',
    landmarks: ['Radial Artery', 'Paired Veins', 'Radius Bone Shadow', 'Flexor Carpi Radialis'],
    probeType: 'Linear (12-15 MHz)',
    sourceId: 'radoss'
  },
  {
    id: 'clip_adductor_canal',
    title: 'Adductor Canal (Saphenous Nerve)',
    category: 'regional_lower',
    procedureId: 'adductor_canal_block',
    description: 'Mid-thigh: superficial femoral artery within the adductor canal deep to the Sartorius, with the hyperechoic saphenous nerve anterolateral to the artery. Motor-sparing knee analgesia.',
    landmarks: ['Superficial Femoral Artery', 'Saphenous Nerve', 'Sartorius M.', 'Femoral Vein'],
    probeType: 'Linear (10-12 MHz)',
    sourceId: 'pocus_atlas'
  },
  {
    id: 'clip_popliteal_sciatic',
    title: 'Popliteal Sciatic Bifurcation',
    category: 'regional_lower',
    procedureId: 'sciatic_popliteal_block',
    description: 'Popliteal fossa at the point where the sciatic nerve splits into the tibial and common peroneal divisions, superficial to the popliteal vein and artery, within the common paraneural sheath.',
    landmarks: ['Tibial Nerve', 'Common Peroneal Nerve', 'Popliteal Vein', 'Popliteal Artery'],
    probeType: 'Linear (10 MHz)',
    sourceId: 'nidus'
  },
  {
    id: 'clip_tap_block',
    title: 'Transversus Abdominis Plane (TAP)',
    category: 'regional_trunk',
    procedureId: 'tap_block',
    description: 'Lateral abdominal wall with the three muscle layers — External Oblique, Internal Oblique, Transversus Abdominis — and the target hyperechoic fascial plane separating IO and TA.',
    landmarks: ['External Oblique M.', 'Internal Oblique M.', 'Transversus Abdominis M.', 'Peritoneum'],
    probeType: 'Linear (8-10 MHz)',
    sourceId: 'pocus_atlas'
  },
  {
    id: 'clip_esp_block',
    title: 'Erector Spinae Plane (ESP)',
    category: 'regional_trunk',
    procedureId: 'esp_block',
    description: 'Sagittal scan 3 cm lateral to the T5 spinous process with the square-shaped Transverse Process step, overlying Erector Spinae muscle belly, and deep fascial injection target.',
    landmarks: ['Transverse Process Step', 'Erector Spinae M.', 'Trapezius M.', 'Pleural Shadow'],
    probeType: 'Linear (7 MHz)',
    sourceId: 'pocus_atlas'
  },
  {
    id: 'clip_femoral_block',
    title: 'Femoral Nerve & Fascia Iliaca',
    category: 'regional_lower',
    procedureId: 'femoral_block',
    description: 'Femoral crease: pulsatile Femoral Artery, compressible Femoral Vein (medial), and triangular hyperechoic Femoral Nerve (lateral) beneath the bright double line of Fascia Iliaca.',
    landmarks: ['Femoral Artery', 'Femoral Vein', 'Femoral Nerve Triangle', 'Fascia Iliaca'],
    probeType: 'Linear (9-12 MHz)',
    sourceId: 'nidus'
  },
  {
    id: 'clip_gastric_full',
    title: 'Gastric Antrum - Full Stomach',
    category: 'pocus',
    procedureId: 'gastric_pocus',
    description: 'Sagittal epigastric scan: distended Gastric Antrum filled with hyperechoic particulate solid matter posterior to the left liver lobe — high aspiration risk under anesthesia.',
    landmarks: ['Gastric Antrum', 'Left Liver Lobe', 'Pancreas', 'Aorta / SMA'],
    probeType: 'Curvilinear (3.5 MHz)',
    sourceId: 'zenodo'
  },
  {
    id: 'clip_lung_sliding',
    title: 'Normal Lung Sliding vs Pneumothorax',
    category: 'pocus',
    procedureId: 'lung_pocus',
    description: 'Longitudinal anterior chest: hyperechoic pleural line between two rib acoustic shadows ("bat sign"). Normal lung shows shimmering sliding pleura ("ants marching") and horizontal A-lines.',
    landmarks: ['Pleural Line', 'Rib Shadows (Bat Sign)', 'A-lines', 'Lung Sliding'],
    probeType: 'Linear (10 MHz)',
    sourceId: 'pocus_atlas',
    sourceNote: 'COVIDx-US is an additional open-access lung-ultrasound dataset for B-line / pathology examples.'
  },
  {
    id: 'clip_efast_morisons',
    title: 'eFAST RUQ - Morison\'s Pouch Free Fluid',
    category: 'pocus',
    procedureId: 'efast_pocus',
    description: 'Right Upper Quadrant: dark anechoic fluid (hemoperitoneum) in the hepatorenal recess (Morison\'s pouch) between liver and right kidney after blunt abdominal trauma.',
    landmarks: ['Liver', 'Right Kidney', 'Morison\'s Pouch', 'Anechoic Hemoperitoneum'],
    probeType: 'Curvilinear (3.5 MHz)',
    sourceId: 'pocus_atlas'
  },
  {
    id: 'clip_tte_plax',
    title: 'Transthoracic Echo: PLAX View',
    category: 'tte',
    procedureId: 'tte_plax',
    description: 'Parasternal Long Axis: Right Ventricle (anterior), Left Ventricular cavity, Mitral Valve leaflets, Left Atrium, and Aortic Root through the cardiac cycle.',
    landmarks: ['Right Ventricle', 'Left Ventricle', 'Left Atrium', 'Aortic Root', 'Mitral Valve'],
    probeType: 'Phased Array (2.5 MHz)',
    sourceId: 'monai',
    sourceNote: 'EchoNet-Dynamic (Stanford) is a large echo dataset but is research-use-only — not commercially shippable.'
  },
  {
    id: 'clip_tee_me_4ch',
    title: 'Transesophageal Echo: ME 4-Chamber (0°)',
    category: 'tee',
    procedureId: 'tee_me_4ch',
    description: 'Mid-Esophageal 4-chamber at 0° multiplane: Left and Right Atria nearest the transducer at the top of the sector, with biventricular inflow and the AV valves.',
    landmarks: ['Left Atrium', 'Right Atrium', 'Left Ventricle', 'Right Ventricle', 'Mitral/Tricuspid Valves'],
    probeType: 'Multiplane TEE (5 MHz)',
    sourceId: 'monai'
  }
];

const COMMERCIAL_BADGE = {
  yes: { label: 'Commercial OK', cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60' },
  no: { label: 'Non-commercial', cls: 'bg-rose-950/80 text-rose-300 border-rose-600/60' },
  mixed: { label: 'Per-dataset', cls: 'bg-amber-950/80 text-amber-300 border-amber-600/60' }
};

const CommercialBadge = ({ safe }) => {
  const b = COMMERCIAL_BADGE[safe] || COMMERCIAL_BADGE.mixed;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${b.cls}`}>
      {b.label}
    </span>
  );
};

export const UltrasoundMediaBank = ({ onSelectProcedure }) => {
  const [selectedClip, setSelectedClip] = useState(ULTRASOUND_MEDIA_CLIPS[0]);
  const selectedSource = selectedClip ? SOURCE_BY_ID[selectedClip.sourceId] : null;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-xl flex flex-col space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
            📚 REFERENCE ATLAS & OPEN-ACCESS SOURCES
          </h3>
          <p className="text-[11px] text-slate-400">Annotated schematic illustrations linked to open-access libraries of real clinical scans</p>
        </div>
        <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded font-mono border border-cyan-800">
          {ULTRASOUND_MEDIA_CLIPS.length} ANNOTATED REFERENCES
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Clip Selector Directory List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-2 overflow-y-auto max-h-[460px] pr-1">
          {ULTRASOUND_MEDIA_CLIPS.map((clip) => (
            <button
              key={clip.id}
              onClick={() => setSelectedClip(clip)}
              className={`p-3 rounded-lg text-left transition border font-mono ${
                selectedClip?.id === clip.id
                  ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs text-white">{clip.title}</div>
              <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                <span className="uppercase text-cyan-400 font-bold">{clip.category.replace('_', ' ')}</span>
                <span>{clip.probeType}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Clip Detailed Viewer (7 cols) */}
        {selectedClip && (
          <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col space-y-3 font-sans">
            {/* Schematic Illustration Viewport (explicitly NOT a captured scan) */}
            <div className="w-full h-56 bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden p-3 shadow-inner">
              <div className="absolute top-2 left-3 text-[10px] font-mono text-cyan-400 font-bold">
                {selectedClip.title.toUpperCase()}
              </div>
              <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-400">
                {selectedClip.probeType}
              </div>

              <div className="w-full max-w-sm h-36 bg-black rounded border border-slate-800 flex items-center justify-center relative shadow-2xl">
                <div className="text-center p-3">
                  <span className="text-3xl block mb-1">📡</span>
                  <span className="text-cyan-300 font-bold font-mono text-xs block">{selectedClip.title}</span>
                  <span className="text-[10px] text-amber-400/90 font-mono block mt-1">Schematic teaching illustration — not a captured scan</span>
                </div>
              </div>

              {/* Landmark Tag Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                {selectedClip.landmarks.map((lm, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-800 text-cyan-300 text-[9px] font-mono rounded border border-slate-700">
                    🏷️ {lm}
                  </span>
                ))}
              </div>
            </div>

            {/* Description & Clinical Teaching Points */}
            <div className="flex flex-col space-y-1.5 text-xs">
              <span className="font-bold text-cyan-400 font-mono text-[11px]">SONOGRAPHIC DESCRIPTION:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{selectedClip.description}</p>
            </div>

            {/* Action to Practice Procedure in Simulator */}
            {onSelectProcedure && (
              <button
                onClick={() => onSelectProcedure(selectedClip.procedureId)}
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-mono font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-2"
              >
                🎮 PRACTICE THIS PROCEDURE IN LIVE SIMULATOR
              </button>
            )}

            {/* Real open-access source for this reference */}
            {selectedSource && (
              <div className="border-t border-slate-800 pt-2.5 flex flex-col space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">REAL SCANS AVAILABLE FROM:</span>
                  <CommercialBadge safe={selectedSource.commercialSafe} />
                </div>
                <a
                  href={selectedSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold underline underline-offset-2 break-all"
                >
                  {selectedSource.name} — {selectedSource.license} ↗
                </a>
                {selectedClip.sourceNote && (
                  <p className="text-[10px] text-slate-500 font-sans leading-relaxed">ℹ️ {selectedClip.sourceNote}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Open-Access Source Directory */}
      <div className="border-t border-slate-800 pt-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-cyan-400 font-mono">🌐 Open-Access Source Libraries</span>
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
            <CommercialBadge safe="yes" /> <CommercialBadge safe="mixed" /> <CommercialBadge safe="no" />
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ULTRASOUND_MEDIA_SOURCES.map((src) => (
            <a
              key={src.id}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-950 border border-slate-800 hover:border-cyan-700 rounded-lg p-2.5 transition flex flex-col space-y-1 group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-cyan-300 group-hover:text-cyan-200">{src.name} ↗</span>
                <CommercialBadge safe={src.commercialSafe} />
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed">{src.description}</p>
              <span className="text-[9px] text-slate-500 font-mono">License: {src.license}</span>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
          ⚠️ Commercial-safety flags indicate reuse rights for the shipping product. Non-commercial (CC-BY-NC / NC-SA) and research-use-only
          datasets are for study reference only and must not be embedded without a separate license.
        </p>
      </div>
    </div>
  );
};
