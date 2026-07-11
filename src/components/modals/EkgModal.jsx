import { useState } from 'react';
import { CanvasWaveform } from '../CanvasWaveform';
import { Activity, X, Heart, ShieldAlert, Zap, BookOpen } from 'lucide-react';

// ─── EKG Teaching Guide ──────────────────────────────────────────────────────
// Pre-built SVG path for a labeled normal ECG beat (not time-series, just anatomical)

const EKG_PATTERNS = [
  {
    id: 'normal',
    label: 'Normal Sinus Rhythm',
    color: '#22c55e',
    svgPath: 'M 0,50 L 30,50 L 35,45 L 40,50 L 45,48 L 52,20 L 58,85 L 65,50 L 72,50 L 78,42 L 84,42 L 90,50 L 110,50 L 118,40 L 126,40 L 132,50 L 160,50',
    description: 'Regular P waves before each QRS. Normal PR 120-200ms. QRS < 120ms. Normal ST segment. Upright T waves in I, II, V4-V6.',
    components: ['P wave: atrial depolarization, 80-100ms', 'PR interval: AV node conduction, 120-200ms', 'QRS: ventricular depolarization, <120ms', 'ST segment: isoelectric, ventricular repolarization begins', 'T wave: ventricular repolarization, upright in I, II, V3-V6', 'QT interval: total ventricular cycle, <440ms (men), <460ms (women)'],
  },
  {
    id: 'hyperK',
    label: 'Hyperkalemia',
    color: '#ef4444',
    svgPath: 'M 0,50 L 30,50 L 31,48 L 33,50 L 38,50 L 44,22 L 50,82 L 56,50 L 60,50 L 63,15 L 70,15 L 75,50 L 160,50',
    description: 'Tall peaked ("tented") T waves earliest change. Progressive: P wave flattening, PR prolongation, QRS widening, sine wave pattern → VFib.',
    components: ['K+ 5.5-6.5: Peaked narrow T waves', 'K+ 6.5-7.0: Flat P waves, prolonged PR', 'K+ 7.0-8.5: Wide QRS complex', 'K+ > 8.5: Sine wave pattern (pre-terminal)', 'Treatment: Calcium stabilizes membrane; insulin+dextrose, albuterol shift K+'],
  },
  {
    id: 'hypoK',
    label: 'Hypokalemia',
    color: '#f97316',
    svgPath: 'M 0,50 L 28,50 L 32,44 L 37,50 L 42,48 L 49,20 L 55,82 L 62,50 L 68,48 L 74,48 L 80,50 L 88,45 L 95,45 L 102,50 L 112,42 L 120,50 L 160,50',
    description: 'ST depression, T wave flattening/inversion, prominent U waves (bump after T wave). Prolonged QU interval mimics prolonged QT.',
    components: ['U wave > T wave height = hypokalemia until proven otherwise', 'Flat/inverted T waves with ST depression', 'True QT normal; apparent prolongation from U wave', 'Risk: VT/TdP, especially with digoxin or QT-prolonging drugs', 'Treatment: IV/PO K+ replacement; add Mg2+ if severe'],
  },
  {
    id: 'stemi',
    label: 'ST-Elevation MI (STEMI)',
    color: '#ef4444',
    svgPath: 'M 0,50 L 28,50 L 32,45 L 37,50 L 41,47 L 47,20 L 53,80 L 60,38 L 80,32 L 95,42 L 112,50 L 160,50',
    description: 'Convex ("tombstone") ST elevation ≥1mm in 2 contiguous leads. Reciprocal ST depression in opposite territory. Hyperacute T waves earliest sign.',
    components: ['Anterior STEMI: V1-V4 elevation → LAD occlusion', 'Inferior STEMI: II, III, aVF elevation → RCA occlusion', 'Lateral STEMI: I, aVL, V5-V6 → LCX occlusion', 'Reciprocal changes confirm ischemic etiology', 'Treatment: PCI within 90min door-to-balloon (primary PCI)'],
  },
  {
    id: 'afib',
    label: 'Atrial Fibrillation',
    color: '#f97316',
    svgPath: 'M 0,47 L 8,50 L 14,44 L 18,53 L 22,48 L 27,50 L 33,22 L 38,80 L 44,50 L 51,46 L 56,48 L 63,50 L 70,44 L 76,53 L 83,46 L 90,25 L 95,78 L 101,50 L 108,48 L 116,51 L 124,45 L 132,52 L 137,24 L 143,79 L 149,50 L 160,48',
    description: 'No organized P waves — replaced by irregular fine fibrillatory baseline (f-waves, 350-600/min). Irregularly irregular R-R intervals. Variable QRS rate depends on AV node conduction.',
    components: ['No P waves = hallmark of AF', 'Irregular R-R intervals ("irregularly irregular")', '15-25% reduction in cardiac output from loss of atrial kick', 'CHA₂DS₂-VASc score determines anticoagulation need', 'Rate control (target HR < 110): BB, CCB, Digoxin', 'Rhythm control: Amiodarone, Flecainide, DC cardioversion'],
  },
  {
    id: 'vt',
    label: 'Ventricular Tachycardia',
    color: '#ef4444',
    svgPath: 'M 0,50 L 10,50 L 18,24 L 26,70 L 34,50 L 42,50 L 50,26 L 58,72 L 66,50 L 74,50 L 82,25 L 90,71 L 98,50 L 106,50 L 114,24 L 122,70 L 130,50 L 160,50',
    description: 'Wide complex (QRS > 120ms), regular tachycardia originating in ventricle. Rate typically 100-250 bpm. AV dissociation, fusion beats, capture beats are pathognomonic.',
    components: ['Monomorphic VT: uniform QRS morphology, same circuit', 'Polymorphic VT: varying QRS = often Torsades de Pointes (long QT)', 'Pulseless VT: immediate defibrillation', 'Stable VT with pulse: Amiodarone 150mg IV, synchronized cardioversion', 'AV dissociation: P waves march through at different rate than QRS'],
  },
  {
    id: 'chb',
    label: 'Complete Heart Block (3° AV Block)',
    color: '#a78bfa',
    svgPath: 'M 0,50 L 18,50 L 21,45 L 24,50 L 34,50 L 40,45 L 44,50 L 50,22 L 55,78 L 60,50 L 76,50 L 80,45 L 84,50 L 94,50 L 98,45 L 102,50 L 118,50 L 126,24 L 131,76 L 137,50 L 160,50',
    description: 'Complete failure of AV conduction. P waves and QRS complexes march independently (AV dissociation). Ventricular rate driven by junctional (40-60) or ventricular (20-40) escape rhythm.',
    components: ['P-P interval regular, R-R interval regular, but unrelated (dissociated)', 'Atrial rate > ventricular rate', 'Junctional escape: narrow QRS at 40-60 bpm (His bundle))', 'Ventricular escape: wide QRS at 20-40 bpm (Purkinje))', 'Cannon A waves on CVP (atrial contraction against closed tricuspid)', 'Treatment: Atropine (temporizing), transcutaneous then transvenous pacing'],
  },
  {
    id: 'lbbb',
    label: 'Left Bundle Branch Block',
    color: '#60a5fa',
    svgPath: 'M 0,50 L 28,50 L 31,46 L 34,50 L 40,48 L 46,52 L 55,28 L 64,55 L 72,40 L 80,38 L 88,42 L 96,50 L 105,36 L 113,36 L 120,50 L 160,50',
    description: 'Wide QRS (>120ms) with broad notched R in I, aVL, V5-V6 and QS pattern in V1-V2. Discordant ST-T changes (ST and T in opposite direction to QRS). Concordant STEMI criteria apply.',
    components: ['New LBBB + chest pain = STEMI equivalent until proven otherwise (Sgarbossa criteria)', 'Broad notched "M-shaped" R in lateral leads', 'Deep QS in V1-V2 (no R wave in right precordial leads)', 'Delayed intrinsicoid deflection > 60ms in V5-V6', 'Secondary ST-T changes: ST depresses when QRS goes up (discordant)'],
  },
  {
    id: 'pe',
    label: 'Pulmonary Embolism Pattern',
    color: '#f97316',
    svgPath: 'M 0,50 L 28,50 L 32,45 L 37,50 L 41,47 L 47,22 L 53,80 L 58,50 L 68,50 L 74,54 L 82,55 L 90,50 L 98,48 L 106,48 L 114,58 L 124,50 L 160,50',
    description: 'S1Q3T3: deep S wave in lead I, Q wave in lead III, inverted T wave in III. Sinus tachycardia most common finding. Right heart strain: T inversions V1-V4, RBBB, right axis deviation.',
    components: ['S1Q3T3 specific but not sensitive (present in ~20% of PE)', 'Sinus tachycardia: most common EKG finding in PE', 'RV strain pattern: T inversions V1-V4 + RBBB', 'New right axis deviation + right bundle branch block', 'Massive PE: severe hypotension + RV failure on echo confirms diagnosis', 'Treatment: anticoagulation; thrombolytics for massive PE with hemodynamic collapse'],
  },
];

function EkgGuide({ onClose, color = '#22c55e' }) {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const selPat = EKG_PATTERNS.find(p => p.id === selectedPattern);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Normal EKG anatomy diagram */}
      {!selPat && (
        <div className="shrink-0 p-3 border-b border-slate-800">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Normal EKG Components</div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <svg viewBox="0 0 400 100" className="w-full" style={{ height: 72 }}>
              {/* Grid lines */}
              {[0,1,2,3,4,5,6,7,8].map(i => <line key={i} x1={i*50} y1="0" x2={i*50} y2="100" stroke="#1e293b" strokeWidth="0.5"/>)}
              {[0,25,50,75,100].map(i => <line key={i} x1="0" y1={i} x2="400" y2={i} stroke="#1e293b" strokeWidth="0.5"/>)}
              {/* Isoelectric line */}
              <line x1="0" y1="50" x2="400" y2="50" stroke="#334155" strokeWidth="0.8" strokeDasharray="4,4"/>
              {/* Normal ECG beat */}
              <path d="M 0,50 L 55,50 L 62,44 L 68,50 L 74,49 L 82,15 L 90,88 L 97,50 L 104,50 L 112,38 L 120,38 L 127,50 L 220,50 L 228,43 L 236,43 L 242,50 L 400,50"
                fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
              {/* Labels */}
              <text x="62" y="36" fill="#94a3b8" fontSize="7" fontWeight="bold">P</text>
              <text x="82" y="10" fill="#94a3b8" fontSize="7" fontWeight="bold">QRS</text>
              <text x="108" y="33" fill="#94a3b8" fontSize="7" fontWeight="bold">ST</text>
              <text x="228" y="36" fill="#94a3b8" fontSize="7" fontWeight="bold">T</text>
              {/* Interval brackets */}
              <line x1="62" y1="90" x2="97" y2="90" stroke="#475569" strokeWidth="0.8"/>
              <text x="72" y="98" fill="#64748b" fontSize="6">PR</text>
              <line x1="74" y1="94" x2="127" y2="94" stroke="#475569" strokeWidth="0.8"/>
              <text x="93" y="100" fill="#64748b" fontSize="6">QRS</text>
              <line x1="74" y1="85" x2="242" y2="85" stroke="#475569" strokeWidth="0.8"/>
              <text x="145" y="93" fill="#64748b" fontSize="6">QT interval</text>
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-2">
            {[
              ['P wave', '80-100 ms', 'Atrial depolarization'],
              ['PR interval', '120-200 ms', 'AV conduction time'],
              ['QRS', '< 120 ms', 'Ventricular activation'],
              ['ST segment', 'Isoelectric', 'Early repolarization'],
              ['T wave', 'Upright I,II,V3-V6', 'Ventricular repolarization'],
              ['QTc', '< 440 ms ♂ / 460 ♀', 'Total ventricular cycle'],
            ].map(([name, value, desc]) => (
              <div key={name} className="bg-slate-900/40 rounded p-1.5 border border-slate-800/60">
                <div className="text-[9px] font-black text-slate-200 leading-none">{name}</div>
                <div className="text-[9px] font-mono text-emerald-400 leading-tight mt-0.5">{value}</div>
                <div className="text-[8px] text-slate-500 leading-tight">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern cards */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
        {!selPat ? (
          <>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Pathological Patterns — click to expand</div>
            <div className="grid grid-cols-3 gap-1.5">
              {EKG_PATTERNS.map(pat => (
                <button key={pat.id}
                  onClick={() => setSelectedPattern(pat.id)}
                  className="text-left rounded border p-1.5 transition-all hover:brightness-110 cursor-pointer"
                  style={{ borderColor: pat.color + '30', background: pat.color + '08' }}
                >
                  <div className="text-[9px] font-black leading-tight" style={{ color: pat.color }}>{pat.label}</div>
                  <svg viewBox="0 0 160 60" className="w-full mt-1" style={{ height: 30 }}>
                    <path d={pat.svgPath} fill="none" stroke={pat.color} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <button onClick={() => setSelectedPattern(null)}
              className="text-[10px] text-slate-400 hover:text-slate-200 mb-3 flex items-center gap-1 transition-colors">
              ← Back to all patterns
            </button>
            <div className="rounded-lg border p-3 mb-3" style={{ borderColor: selPat.color + '30', background: selPat.color + '08' }}>
              <div className="text-xs font-black mb-1" style={{ color: selPat.color }}>{selPat.label}</div>
              <svg viewBox="0 0 160 60" className="w-full mb-2" style={{ height: 55 }}>
                <line x1="0" y1="50" x2="160" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3"/>
                <path d={selPat.svgPath} fill="none" stroke={selPat.color} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-[10px] text-slate-300 leading-relaxed">{selPat.description}</p>
            </div>
            <div className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/40">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Key Points</div>
              <ul className="space-y-1">
                {selPat.components.map((c, i) => (
                  <li key={i} className="flex gap-1.5 items-start">
                    <span style={{ color: selPat.color }} className="text-[11px] leading-none mt-0.5 shrink-0">▸</span>
                    <span className="text-[10px] text-slate-300 leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const EkgModal = ({ 
  show, 
  close, 
  patient, 
  vitals, 
  electrolytes, 
  activeMeds, 
  hrSpeed, 
  rrSpeed 
}) => {
  const [viewMode, setViewMode] = useState('12lead'); // '3lead', '5lead', '12lead', 'guide'
  const gridTheme = 'green'; // 'green', 'pink'

  if (!show) return null;

  const k = electrolytes?.k ?? 4.0;
  const ca = electrolytes?.ca ?? 9.0;
  const isArrest = patient?.isArrest ?? false;
  const rhythm = patient?.cardiacRhythm ?? 'normal';
  const hasDigoxin = activeMeds && activeMeds.some(m => m.name === 'Digoxin' || m.name === 'Lanoxin');
  const hasAmiodarone = activeMeds && activeMeds.some(m => m.name === 'Amiodarone');
  const hasPE = patient?.peActive || patient?.pulmonaryEmbolism || (patient?.procedure === 'PE' || patient?.currentPresetId === 'pe');

  let isIschemic = patient?.ischemicDamage > 400;
  if (patient?.myocardialStunning > 10 && (patient?.cad || patient?.hasCAD)) {
    isIschemic = true;
  }
  const ischemiaTerritory = (patient?.cad || patient?.hasCAD) ? 'inferior' : 'anterior';

  // Clinical Diagnostics Interpreter
  let diagnosisTitle = "Normal Sinus Rhythm";
  let diagnosisDesc = "Perfect hemodynamic baseline. No acute ischemia, conduction blocks, or electrolyte disturbances.";
  let alertType = "info"; // "info", "warning", "critical"

  if (isArrest) {
    alertType = "critical";
    if (rhythm === 'vfib') {
      diagnosisTitle = "Ventricular Fibrillation (VFib)";
      diagnosisDesc = "Chaotic, disorganized electrical activity. Defibrillate immediately (Joules shock) and perform high-quality CPR.";
    } else if (rhythm === 'vtach') {
      diagnosisTitle = "Ventricular Tachycardia (VTach)";
      diagnosisDesc = "Monomorphic wide-complex tachydysrhythmia. Pulseless VT indicates immediate shock; stable VT requires synchronized cardioversion.";
    } else if (rhythm === 'asystole') {
      diagnosisTitle = "Asystole / Cardiac Standstill";
      diagnosisDesc = "Complete cessation of electrical and mechanical cardiac activity. Perform continuous CPR, administer Epinephrine. Non-shockable.";
    } else if (rhythm === 'pea') {
      diagnosisTitle = "Pulseless Electrical Activity (PEA)";
      diagnosisDesc = "Organized electrical rhythm on EKG but zero mechanical stroke output (flat Pleth/Art line). Focus on treating H's & T's (Hypovolemia, Hypoxia, Acidosis).";
    }
  } else if (k > 8.5 && !patient?.calciumStabilized) {
    alertType = "critical";
    diagnosisTitle = "Severe Hyperkalemia (Sine Wave Pattern)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Ventricles are depolarized near threshold. Sine-wave formation is a pre-terminal rhythm. Administer Calcium Chloride immediately!`;
  } else if (k > 7.0 && !patient?.calciumStabilized) {
    alertType = "critical";
    diagnosisTitle = "Moderate Hyperkalemia (Wide QRS Complex)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Wide QRS complexes and flat/absent P-waves. Administer Calcium, Insulin/Dextrose, and Albuterol to shift potassium.`;
  } else if (k > 5.5) {
    alertType = "warning";
    diagnosisTitle = "Mild Hyperkalemia (Peaked T-Waves)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Symmetric, narrow, tented T-waves visible across precordial leads V2-V4. Conduction velocities currently stable.`;
  } else if (k < 3.0) {
    alertType = "warning";
    diagnosisTitle = "Severe Hypokalemia (ST Depression & U-Waves)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Flat T-waves, down-sloping ST segment depression, and prominent U-waves emerging in diastolic phases.`;
  } else if (isIschemic) {
    alertType = "critical";
    if (ischemiaTerritory === 'inferior') {
      diagnosisTitle = "Acute Inferior STEMI (Myocardial Infarction)";
      diagnosisDesc = "ST-segment elevation in inferior leads II, III, aVF. Reciprocal ST-segment depression in lateral leads I, aVL. RCA perfusion failure.";
    } else {
      diagnosisTitle = "Acute Anterior STEMI (Myocardial Infarction)";
      diagnosisDesc = "ST-segment elevation in precordial leads V1-V4. LAD occlusion. Severe risk of heart failure, ventricular septal rupture, or cardiogenic shock.";
    }
  } else if (hasPE) {
    alertType = "warning";
    diagnosisTitle = "Right Ventricular Strain (S1Q3T3 Pattern)";
    diagnosisDesc = "Sinus tachycardia, deep S-wave in I, pathological Q-wave in III, inverted T-wave in III, and precordial T-wave inversions (V1-V3) consistent with acute pulmonary embolism.";
  } else if (rhythm === 'afib' || patient?.afib || patient?.hasAFib) {
    alertType = "warning";
    diagnosisTitle = "Atrial Fibrillation (AFib)";
    diagnosisDesc = "Absent P-waves replaced by low-amplitude f-waves. Irregularly irregular R-R interval. 15% reduction in SV due to loss of atrial kick.";
  } else if (hasDigoxin) {
    alertType = "info";
    diagnosisTitle = "Digitalis Effect (Digoxin)";
    diagnosisDesc = "Scooped ST-segment depression ('digitalis sagging') in lateral leads I, aVL, V5, V6. Shortened QT interval. Conduction system slowed.";
  } else if (hasAmiodarone) {
    alertType = "info";
    diagnosisTitle = "QT Prolongation (Amiodarone Active)";
    diagnosisDesc = "Stretched repolarization (ST-T) segments resulting in prolonged QT/QTc interval. Monitor closely for early-afterdepolarizations and Torsades.";
  }

  // CSS Grid Background Styles
  const gridStyle = gridTheme === 'green' ? {
    backgroundImage: `
      linear-gradient(rgba(34, 197, 94, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 197, 94, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(34, 197, 94, 0.22) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 197, 94, 0.22) 1px, transparent 1px)
    `,
    backgroundSize: '6px 6px, 6px 6px, 30px 30px, 30px 30px',
    backgroundColor: '#030712'
  } : {
    backgroundImage: `
      linear-gradient(rgba(244, 63, 94, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(244, 63, 94, 0.09) 1px, transparent 1px),
      linear-gradient(rgba(244, 63, 94, 0.26) 1px, transparent 1px),
      linear-gradient(90deg, rgba(244, 63, 94, 0.26) 1px, transparent 1px)
    `,
    backgroundSize: '6px 6px, 6px 6px, 30px 30px, 30px 30px',
    backgroundColor: '#0c0205'
  };

  const activeColor = gridTheme === 'green' ? '#22c55e' : '#f43f5e';
  const labelColor = gridTheme === 'green' ? 'text-green-400' : 'text-rose-400';

  // Leads configurations for different views
  const leads3 = ['I', 'II', 'III'];
  const leads5 = ['I', 'II', 'III', 'aVF', 'V5'];
  
  // 12-lead standard clinical display grid layout (3 rows x 4 columns)
  // Ordered by:
  // Col 1: I, II, III
  // Col 2: aVR, aVL, aVF
  // Col 3: V1, V2, V3
  // Col 4: V4, V5, V6
  const grid12 = [
    'I', 'aVR', 'V1', 'V4',
    'II', 'aVL', 'V2', 'V5',
    'III', 'aVF', 'V3', 'V6'
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header Block */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Activity size={24} className="animate-pulse" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100 uppercase leading-none">Diagnostic Electrocardiogram</h2>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Real-time physiological vector telemetry</span>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-black/40 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-green-500 shrink-0 animate-pulse" />
              <span className="text-slate-400 font-bold">HR:</span>
              <span className="text-green-400 font-mono font-black text-sm">{vitals?.hr ?? '--'} <span className="text-[9px]">BPM</span></span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">K+:</span>
              <span className="text-blue-400 font-mono font-black text-sm">{k.toFixed(1)} <span className="text-[9px]">mEq/L</span></span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Ca2+:</span>
              <span className="text-cyan-400 font-mono font-black text-sm">{ca.toFixed(1)} <span className="text-[9px]">mg/dL</span></span>
            </div>
          </div>

          {/* Toggles and Close */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode */}
            <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button 
                onClick={() => setViewMode('3lead')} 
                className={`px-2 py-1 rounded-md transition ${viewMode === '3lead' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                3-Lead
              </button>
              <button 
                onClick={() => setViewMode('5lead')} 
                className={`px-2 py-1 rounded-md transition ${viewMode === '5lead' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                5-Lead
              </button>
              <button 
                onClick={() => setViewMode('12lead')} 
                className={`px-2.5 py-1 rounded-md transition ${viewMode === '12lead' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                12-Lead
              </button>
            </div>

            {/* EKG Guide Toggle */}
            <button
              onClick={() => setViewMode(prev => prev === 'guide' ? '12lead' : 'guide')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === 'guide'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title="EKG Waveform Guide — morphology teaching"
            >
              <BookOpen size={13} />
              <span>EKG Guide</span>
            </button>

            <button
              onClick={close}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Diagnosis Banner — hidden in guide mode */}
        {viewMode !== 'guide' && <div className={`px-4 py-3 border-b border-slate-850 flex items-start gap-3 shrink-0 ${
          alertType === 'critical' ? 'bg-red-950/25 border-l-4 border-l-red-500' :
          alertType === 'warning' ? 'bg-amber-950/25 border-l-4 border-l-amber-500' :
          'bg-blue-950/20 border-l-4 border-l-blue-500'
        }`}>
          <div className="mt-0.5 shrink-0">
            {alertType === 'critical' ? <ShieldAlert size={18} className="text-red-500 animate-bounce" /> :
             alertType === 'warning' ? <ShieldAlert size={18} className="text-amber-500 animate-pulse" /> :
             <ShieldAlert size={18} className="text-blue-400" />}
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-black uppercase tracking-wider leading-none mb-1 ${
              alertType === 'critical' ? 'text-red-400' :
              alertType === 'warning' ? 'text-amber-400' :
              'text-blue-400'
            }`}>{diagnosisTitle}</h3>
            <p className="text-xs text-slate-400 leading-normal">{diagnosisDesc}</p>
          </div>
        </div>}

        {/* Waves Rendering Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0 bg-slate-950">

          {/* EKG Morphology Guide Mode */}
          {viewMode === 'guide' && (
            <EkgGuide color={activeColor} />
          )}

          {/* 3-Lead Stacked Mode */}
          {viewMode === '3lead' && (
            <div className="flex-1 flex flex-col gap-2 min-h-[400px]">
              {leads3.map(leadName => (
                <div key={leadName} style={gridStyle} className="flex-1 border border-slate-800/80 rounded-xl relative overflow-hidden shadow-inner flex items-center min-h-[120px]">
                  <span className={`absolute top-2 left-3 z-20 font-black font-mono text-sm uppercase px-1.5 py-0.5 bg-black/60 rounded border border-slate-800/40 ${labelColor}`}>{leadName}</span>
                  <CanvasWaveform 
                    color={activeColor}
                    speed={hrSpeed}
                    rrSpeed={rrSpeed}
                    active={true}
                    type="ecg"
                    lead={leadName}
                    patientState={patient}
                    electrolytes={electrolytes}
                    activeMeds={activeMeds}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 5-Lead Stacked Mode */}
          {viewMode === '5lead' && (
            <div className="flex-1 flex flex-col gap-2 min-h-[500px]">
              {leads5.map(leadName => (
                <div key={leadName} style={gridStyle} className="flex-1 border border-slate-800/80 rounded-xl relative overflow-hidden shadow-inner flex items-center min-h-[90px]">
                  <span className={`absolute top-2 left-3 z-20 font-black font-mono text-sm uppercase px-1.5 py-0.5 bg-black/60 rounded border border-slate-800/40 ${labelColor}`}>{leadName}</span>
                  <CanvasWaveform 
                    color={activeColor}
                    speed={hrSpeed}
                    rrSpeed={rrSpeed}
                    active={true}
                    type="ecg"
                    lead={leadName}
                    patientState={patient}
                    electrolytes={electrolytes}
                    activeMeds={activeMeds}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 12-Lead Clinical Grid Mode */}
          {viewMode === '12lead' && (
            <div className="flex-1 flex flex-col gap-3 min-h-[500px]">
              {/* 3x4 Grid of diagnostic leads */}
              <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-2 min-h-[360px]">
                {grid12.map(leadName => (
                  <div key={leadName} style={gridStyle} className="border border-slate-800/80 rounded-lg relative overflow-hidden shadow-inner flex items-center">
                    <span className={`absolute top-2 left-2 z-20 font-black font-mono text-xs uppercase px-1 bg-black/60 rounded border border-slate-800/40 ${labelColor}`}>{leadName}</span>
                    <CanvasWaveform 
                      color={activeColor}
                      speed={hrSpeed}
                      rrSpeed={rrSpeed}
                      active={true}
                      type="ecg"
                      lead={leadName}
                      patientState={patient}
                      electrolytes={electrolytes}
                      activeMeds={activeMeds}
                    />
                  </div>
                ))}
              </div>

              {/* Rhythm strip at the bottom (Lead II) */}
              <div className="h-[90px] sm:h-[120px] shrink-0 border border-slate-800 rounded-lg relative overflow-hidden shadow-inner flex items-center" style={gridStyle}>
                <span className={`absolute top-2 left-3 z-20 font-black font-mono text-xs uppercase px-2 py-0.5 bg-black/60 rounded border border-slate-800/40 ${labelColor} flex items-center gap-1.5`}>
                  <Zap size={10} className="text-yellow-400" /> Lead II (Rhythm Strip - 25mm/s)
                </span>
                <CanvasWaveform 
                  color={activeColor}
                  speed={hrSpeed}
                  rrSpeed={rrSpeed}
                  active={true}
                  type="ecg"
                  lead="II"
                  patientState={patient}
                  electrolytes={electrolytes}
                  activeMeds={activeMeds}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer info strip */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex justify-between items-center text-[10px] sm:text-xs text-slate-500 font-mono shrink-0">
          <span>calibration: 10mm/mV • speed: 25mm/sec • filter: 0.05-150Hz</span>
          <span className="hidden sm:block">device: AirwaySim Cardiotransceiver v4.1</span>
        </div>
      </div>
    </div>
  );
};
